const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) envVars[key.trim()] = valueParts.join("=").trim();
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function listAll() {
  const { data, error } = await supabase
    .from("statii_rauri")
    .select("station_id, name, river, latitude, longitude")
    .order("name");
  
  console.log("=== TOATE STATIILE DIN BAZA ===\n");
  console.log("Total:", data?.length);
  console.log("\nStatii FARA coordonate:");
  data?.forEach(s => {
    if (!s.latitude || !s.longitude) {
      console.log("  - " + s.name + " (river: " + s.river + ")");
    }
  });
  console.log("\nStatii CU coordonate:");
  data?.forEach(s => {
    if (s.latitude && s.longitude) {
      console.log("  - " + s.name + ": " + s.latitude + ", " + s.longitude);
    }
  });
}
listAll();
