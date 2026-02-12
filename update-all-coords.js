const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) envVars[key.trim()] = valueParts.join("=").trim();
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const stationData = {
  "Alba Iulia": { lat: 46.0677, lng: 23.5803, river: "Mureș" },
  "Alexandria": { lat: 43.9710, lng: 25.3316, river: "Vedea" },
  "Arad": { lat: 46.1667, lng: 21.3167, river: "Mureș" },
  "Bazias": { lat: 44.7833, lng: 21.4000, river: "Dunăre" },
  "Calafat": { lat: 43.9833, lng: 22.9333, river: "Dunăre" },
  "Chisineu Cris": { lat: 46.5333, lng: 21.5167, river: "Crișul Alb" },
  "Dragesti": { lat: 46.7500, lng: 26.6833, river: "Siret" },
  "Frumosu": { lat: 47.2833, lng: 25.8667, river: "Moldova" },
  "Giurgiu": { lat: 43.9037, lng: 25.9699, river: "Dunăre" },
  "Gurahont": { lat: 46.2667, lng: 22.3500, river: "Crișul Alb" },
  "Zerind": { lat: 46.6167, lng: 21.5167, river: "Crișul Negru" }
};

async function update() {
  console.log("=== ACTUALIZARE COORDONATE SI RAURI ===\n");
  let ok = 0;
  for (const [name, data] of Object.entries(stationData)) {
    const { error } = await supabase
      .from("statii_rauri")
      .update({ latitude: data.lat, longitude: data.lng, river: data.river })
      .eq("name", name);
    if (error) {
      console.log("X " + name + ": " + error.message);
    } else {
      console.log("OK " + name + " -> " + data.river + " (" + data.lat + ", " + data.lng + ")");
      ok++;
    }
  }
  console.log("\nActualizate: " + ok + "/11");
}
update();
