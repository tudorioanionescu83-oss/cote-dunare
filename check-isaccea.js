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
  const { data } = await supabase
    .from("latest_station_readings")
    .select("*")
    .in("localitatea", ["Isaccea", "Tulcea"]);
  
  console.log("=== DATE ISACCEA SI TULCEA ===\n");
  data?.forEach(s => {
    console.log(s.localitatea + ":");
    console.log("  data: " + s.data);
    console.log("  nivel_cm: " + s.nivel_cm);
    console.log("  variatie_cm: " + s.variatie_cm);
    console.log("  temperatura_c: " + s.temperatura_c);
    console.log("  debit_mc_s: " + s.debit_mc_s);
    console.log("");
  });
}
check();
