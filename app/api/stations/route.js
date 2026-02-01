import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FALLBACK_STATIONS, normalizeStationRow } from "@/app/lib/stations";

export const dynamic = "force-dynamic";

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const sb = supabase();

    // IMPORTANT: schimbă "stations" dacă la tine tabelul se numește altfel
    const { data, error } = await sb
      .from("stations")
      .select("*")
      .order("localitatea", { ascending: true });

    if (error) throw error;

    const rows = (data || []).map(normalizeStationRow);
    const ok = rows.filter(s => s.name && s.lat != null && s.lon != null);

    // dacă DB nu are coordonate/nu returnează, folosim fallback
    const finalStations = ok.length ? ok : FALLBACK_STATIONS;

    return NextResponse.json({ stations: finalStations });
  } catch (e) {
    return NextResponse.json({ stations: FALLBACK_STATIONS, warning: String(e?.message || e) });
  }
}
