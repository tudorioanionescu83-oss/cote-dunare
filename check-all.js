const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) envVars[key.trim()] = valueParts.join("=").trim();
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Verifica statiile Dunare
  const { data: dunare } = await supabase
    .from("latest_station_readings")
    .select("localitatea")
    .order("localitatea");
  
  console.log("=== STATII DUNARE (latest_station_readings) ===");
  console.log("Total:", dunare?.length);
  dunare?.forEach(s => console.log("  - " + s.localitatea));

  // Verifica statiile rauri
  const { data: rauri } = await supabase
    .from("statii_rauri")
    .select("name,river,latitude,longitude")
    .order("name");
  
  console.log("\n=== STATII RAURI ===");
  console.log("Total:", rauri?.length);
  rauri?.forEach(s => console.log("  - " + s.name + " | " + s.river + " | lat:" + s.latitude));
}
check();
