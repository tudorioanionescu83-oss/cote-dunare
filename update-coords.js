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

const stationCoords = {
  "Hoghiz": { lat: 45.8833, lng: 25.3167 },
  "Isaccea": { lat: 45.2703, lng: 28.4653 },
  "Mihalt": { lat: 46.1500, lng: 23.9167 },
  "Lugoj": { lat: 45.6833, lng: 21.9000 },
  "Radauti-Prut": { lat: 47.8489, lng: 26.8250 },
  "Podari": { lat: 44.2500, lng: 23.8667 },
  "Salard": { lat: 47.0167, lng: 22.1833 },
  "Satu Mare": { lat: 47.7833, lng: 22.8833 },
  "Tupilati": { lat: 46.9167, lng: 26.4500 },
  "Vranceni": { lat: 46.3333, lng: 27.1500 },
  "Tisita": { lat: 45.9833, lng: 26.9833 },
  "Lungoci": { lat: 45.5667, lng: 27.5500 },
  "Budesti": { lat: 44.4833, lng: 26.4833 },
  "Mircesti": { lat: 47.0833, lng: 26.9500 },
  "Costeiu": { lat: 45.7667, lng: 22.1500 },
  "Turnu Magurele": { lat: 43.7500, lng: 24.8833 },
  "Stanca": { lat: 47.7833, lng: 27.2500 }
};

async function updateCoordinates() {
  console.log("=== ACTUALIZARE COORDONATE ===\n");
  let updated = 0;
  
  for (const [name, coords] of Object.entries(stationCoords)) {
    const { data, error } = await supabase
      .from("statii_rauri")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("name", name)
      .select();
    
    if (error) {
      console.log("X " + name + ": " + error.message);
    } else if (data && data.length > 0) {
      console.log("OK " + name + ": " + coords.lat + ", " + coords.lng);
      updated++;
    } else {
      console.log("? " + name + ": nu exista");
    }
  }
  
  console.log("\nActualizate: " + updated);
}

updateCoordinates().catch(console.error);
