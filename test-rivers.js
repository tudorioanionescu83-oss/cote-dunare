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
  // Verifică toate stațiile din statii_rauri
  const { data: stations, error } = await supabase
    .from("statii_rauri")
    .select("station_id,name,river,latitude,longitude")
    .limit(10);

  console.log("=== STATII RAURI (primele 10) ===");
  if (error) {
    console.log("EROARE:", error.message);
  } else {
    console.log("Total gasite:", stations?.length);
    stations?.forEach(s => {
      console.log(`  ${s.name}: lat=${s.latitude}, lng=${s.longitude}`);
    });
  }

  // Verifică câte au coordonate
  const { data: withCoords } = await supabase
    .from("statii_rauri")
    .select("station_id")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  console.log("\nStatii cu coordonate valide:", withCoords?.length || 0);
}

check().catch(console.error);
