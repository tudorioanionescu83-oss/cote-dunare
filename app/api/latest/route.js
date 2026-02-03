// app/api/latest/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// IMPORTANT: fără cache (mai ales pe Vercel)
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  // răspuns fără cache
  return NextResponse.json(
    { byName },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
