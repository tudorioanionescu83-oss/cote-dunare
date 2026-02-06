// app/api/river-measurements/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const stationName = searchParams.get("station");
  const days = searchParams.get("days");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!stationName) {
    return NextResponse.json({ error: "Missing station" }, { status: 400 });
  }

  // Mai intai gasim station_id dupa nume
  const { data: stationData } = await supabase
    .from("statii_rauri")
    .select("station_id")
    .eq("name", stationName)
    .single();

  if (!stationData) {
    return NextResponse.json({ rows: [], error: "Station not found" });
  }

  let query = supabase
    .from("masuratori_rauri")
    .select("data,debit_mc_s,nivel_cm,temperatura_c,debit_trend,nivel_trend")
    .eq("station_id", stationData.station_id)
    .order("data", { ascending: true });

  if (from && to) {
    query = query.gte("data", from).lte("data", to);
  } else {
    const numDays = Number(days || "30");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    query = query.gte("data", cutoffStr);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: data || [],
    count: data?.length || 0
  });
}
