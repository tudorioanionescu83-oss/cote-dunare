// app/api/measurements/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const station = searchParams.get("station");
  const days = Number(searchParams.get("days") || "30");

  if (!station) {
    return NextResponse.json({ error: "Missing station" }, { status: 400 });
  }

  // luam ultimele N zile (după data)
  const { data, error } = await supabase
    .from("cote_dunare_zi")
    .select("data,nivel_cm,temperatura_c,variatie_cm,km,localitatea")
    .eq("localitatea", station)
    .order("data", { ascending: false })
    .limit(Math.max(10, days + 5)); // buffer

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ordonează crescător pt chart
  const sorted = (data || []).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  return NextResponse.json({ rows: sorted });
}
