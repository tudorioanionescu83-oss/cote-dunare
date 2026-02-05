// app/api/forecast/route.js
// API pentru prognoza nivelului apei

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const station = searchParams.get("station");

    if (!station) {
      return NextResponse.json(
        { error: "Parametrul 'station' este obligatoriu" },
        { status: 400 }
      );
    }

    // Ia cea mai recentă prognoză pentru stație
    const { data, error } = await supabase
      .from("prognoze_nivel")
      .select("*")
      .eq("localitatea", station)
      .order("data", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Eroare la citirea prognozei", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        ok: false,
        station,
        message: "Nu există prognoză pentru această stație",
        forecast: null,
      });
    }

    // Formatează datele pentru grafic
    const forecast = {
      station,
      data: data.data,
      nivel_actual: data.nivel_actual,
      points: [
        { label: "Acum", hours: 0, value: data.nivel_actual },
        { label: "24H", hours: 24, value: data.h24 },
        { label: "48H", hours: 48, value: data.h48 },
        { label: "72H", hours: 72, value: data.h72 },
        { label: "96H", hours: 96, value: data.h96 },
        { label: "120H", hours: 120, value: data.h120 },
      ].filter((p) => p.value !== null), // Exclude valorile null
    };

    return NextResponse.json({
      ok: true,
      station,
      forecast,
    });
  } catch (err) {
    console.error("Forecast API error:", err);
    return NextResponse.json(
      { error: "Eroare internă", details: err.message },
      { status: 500 }
    );
  }
}
