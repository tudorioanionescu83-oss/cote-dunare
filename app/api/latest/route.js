// app/api/latest/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // în server route folosim cheia SERVICE dacă există, altfel anon (merge și cu RLS public read)
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from("latest_station_readings")
    .select("localitatea,data,km,nivel_cm,variatie_cm,temperatura_c");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // transformă în map: { "Galati": {...}, ... }
  const byName = {};
  for (const row of data || []) {
    byName[row.localitatea] = row;
  }

  return NextResponse.json({ byName });
}
