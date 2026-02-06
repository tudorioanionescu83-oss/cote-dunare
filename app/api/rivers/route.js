// app/api/rivers/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  // Ia statiile de rauri cu coordonate
  const { data: stations, error: stErr } = await supabase
    .from("statii_rauri")
    .select("station_id,name,river,latitude,longitude,country");
    
  if (stErr) {
    return NextResponse.json({ error: stErr.message }, { status: 500 });
  }

  // Ia ultimele 2 masuratori pentru fiecare statie (pentru calcul trend)
  const { data: measurements, error: mErr } = await supabase
    .from("masuratori_rauri")
    .select("station_id,data,debit_mc_s,nivel_cm,temperatura_c")
    .order("data", { ascending: false });
    
  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  // Grupeaza - ia ultimele 2 masuratori per statie pentru calcul trend
  const measurementsByStation = {};
  for (const m of measurements || []) {
    if (!measurementsByStation[m.station_id]) {
      measurementsByStation[m.station_id] = [];
    }
    if (measurementsByStation[m.station_id].length < 2) {
      measurementsByStation[m.station_id].push(m);
    }
  }

  // Calculeaza trend si combina cu statii
  const result = (stations || [])
    .filter(s => s.latitude && s.longitude)
    .map(s => {
      const measures = measurementsByStation[s.station_id] || [];
      const latest = measures[0] || null;
      const previous = measures[1] || null;
      
      let nivel_trend = null;
      let debit_trend = null;
      
      if (latest && previous) {
        // Calcul trend nivel
        if (latest.nivel_cm !== null && previous.nivel_cm !== null) {
          const diff = latest.nivel_cm - previous.nivel_cm;
          if (diff > 0) nivel_trend = "up";
          else if (diff < 0) nivel_trend = "down";
          else nivel_trend = "stable";
        }
        
        // Calcul trend debit
        if (latest.debit_mc_s !== null && previous.debit_mc_s !== null) {
          const diff = latest.debit_mc_s - previous.debit_mc_s;
          if (diff > 0) debit_trend = "up";
          else if (diff < 0) debit_trend = "down";
          else debit_trend = "stable";
        }
      }
      
      return {
        ...s,
        lat: s.latitude,
        lng: s.longitude,
        latest: latest ? {
          ...latest,
          nivel_trend,
          debit_trend,
        } : null,
      };
    });

  return NextResponse.json({
    stations: result,
    count: result.length,
  });
}
