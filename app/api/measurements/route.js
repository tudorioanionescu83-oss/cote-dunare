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
  const days = searchParams.get("days");
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");     // YYYY-MM-DD

  if (!station) {
    return NextResponse.json({ error: "Missing station" }, { status: 400 });
  }

  let query = supabase
    .from("cote_dunare_zi")
    .select("data,nivel_cm,temperatura_c,variatie_cm,km,localitatea")
    .eq("localitatea", station)
    .order("data", { ascending: true }); // sortăm crescător direct în query

  // ✅ FILTRARE: custom range (from/to) SAU ultimele N zile
  if (from && to) {
    // Custom range: filtrare între from și to
    console.log(`📅 API: Filtering custom range from ${from} to ${to}`);
    query = query.gte("data", from).lte("data", to);
  } else {
    // Preset: ultimele N zile
    const numDays = Number(days || "30");
    console.log(`📅 API: Filtering last ${numDays} days`);
    
    // Calculăm data de acum N zile
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD
    
    query = query.gte("data", cutoffStr);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`✅ API: Returning ${data?.length || 0} rows`);
  
  return NextResponse.json({ 
    rows: data || [],
    // debug info (optional, poți să le scoți în producție)
    _debug: {
      station,
      from,
      to,
      days,
      count: data?.length || 0
    }
  });
}
