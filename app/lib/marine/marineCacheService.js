import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars for marine cache. Required: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function readMarineRows({
  stationId = "constanta_marine",
  from = null,
  to = null,
  ascending = false,
  limit = 240,
} = {}) {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("marine_station_data")
    .select(
      "station_id,timestamp,water_temperature,current_u,current_v,current_speed,current_direction,salinity,wave_height,wave_direction,wave_period,source"
    )
    .eq("station_id", stationId)
    .order("timestamp", { ascending })
    .limit(limit);

  if (from) query = query.gte("timestamp", from);
  if (to) query = query.lte("timestamp", to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertMarineRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("marine_station_data").upsert(rows, {
    onConflict: "station_id,timestamp",
    ignoreDuplicates: false,
  });
  if (error) throw new Error(error.message);
}
