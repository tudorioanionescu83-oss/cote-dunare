const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) envVars[key.trim()] = valueParts.join("=").trim();
});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const duplicates = ["Bazias", "Calafat", "Giurgiu", "Isaccea"];

async function remove() {
  console.log("=== STERGERE STATII DUNARE DIN TABEL RAURI ===\n");
  for (const name of duplicates) {
    const { error } = await supabase.from("statii_rauri").delete().eq("name", name);
    console.log(error ? "X " + name + ": " + error.message : "OK sters: " + name);
  }
  
  const { data } = await supabase.from("statii_rauri").select("name").order("name");
  console.log("\nStatii ramase: " + data?.length);
  data?.forEach(s => console.log("  - " + s.name));
}
remove();
