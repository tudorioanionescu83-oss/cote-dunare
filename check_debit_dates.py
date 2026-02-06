import requests

SUPABASE_URL = "https://apnvxfaelgjthxuztqln.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnZ4ZmFlbGdqdGh4dXp0cWxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMyNTI3NiwiZXhwIjoyMDg0OTAxMjc2fQ.uNDu_tdn79KELzNtiRrnsx-e9HFbXSnC9WLZoC_5dYY"

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

# Verifică date debit pentru fiecare stație
for station in ['Bazias', 'Calafat', 'Giurgiu', 'Isaccea']:
    url = f"{SUPABASE_URL}/rest/v1/cote_dunare_zi?localitatea=eq.{station}&debit_mc_s=not.is.null&select=data,debit_mc_s&order=data.asc&limit=5"
    r = requests.get(url, headers=HEADERS)
    print(f"\n{station}:")
    for row in r.json():
        print(f"  {row['data']}: {row['debit_mc_s']} m3/s")
