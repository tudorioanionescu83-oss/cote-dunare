const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) envVars[key.trim()] = valueParts.join("=").trim();
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const rivers = {
  "Hoghiz": "Olt",
  "Mihalt": "Mureș",
  "Lugoj": "Timiș",
  "Radauti-Prut": "Prut",
  "Podari": "Jiu",
  "Salard": "Barcău",
  "Satu Mare": "Someș",
  "Tupilati": "Moldova",
  "Vranceni": "Siret"
};

async function update() {
  console.log("=== ACTUALIZARE NUME RAURI ===\n");
  for (const [name, river] of Object.entries(rivers)) {
    const { error } = await supabase.from("statii_rauri").update({ river }).eq("name", name);
    console.log(error ? "X " + name : "OK " + name + " -> " + river);
  }
  console.log("\nGata!");
}
update();
