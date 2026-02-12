const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Verifica pentru Mihalt - ultimele 30 zile
  const { data: stationData } = await supabase
    .from("statii_rauri")
    .select("station_id")
    .eq("name", "Mihalt")
    .single();
  
  console.log("Station ID Mihalt:", stationData?.station_id);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];
  
  console.log("Cutoff:", cutoffStr);

  const { data, error } = await supabase
    .from("masuratori_rauri")
    .select("data,debit_mc_s,nivel_cm,temperatura_c")
    .eq("station_id", stationData.station_id)
    .gte("data", cutoffStr)
    .order("data", { ascending: true });

  console.log("\n=== DATE MIHALT ULTIMELE 30 ZILE ===");
  console.log("Total rows:", data?.length);
  console.log("Prima data:", data?.[0]?.data);
  console.log("Ultima data:", data?.[data?.length - 1]?.data);
  
  // Arata ultimele 5 randuri
  console.log("\nUltimele 5 randuri:");
  data?.slice(-5).forEach(r => {
    console.log(`  ${r.data}: debit=${r.debit_mc_s}, nivel=${r.nivel_cm}, temp=${r.temperatura_c}`);
  });
}

check().catch(console.error);
