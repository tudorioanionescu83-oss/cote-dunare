import os
import sys

import requests


STATIONS = ["Bazias", "Calafat", "Giurgiu", "Isaccea"]


def require_any_env(*names: str) -> tuple[str, str]:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return name, value
    joined = ", ".join(names)
    raise RuntimeError(f"Missing required environment variable. Provide one of: {joined}")


def build_supabase_config() -> tuple[str, str, str]:
    url_name, supabase_url = require_any_env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    key_name, supabase_key = require_any_env("SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")
    return url_name, supabase_url.rstrip("/"), key_name, supabase_key


def main() -> int:
    _, supabase_url, key_name, supabase_key = build_supabase_config()
    if key_name == "SUPABASE_SERVICE_ROLE_KEY":
        print(
            "Warning: using SUPABASE_SERVICE_ROLE_KEY for a read-only check. "
            "Prefer SUPABASE_ANON_KEY when RLS allows public SELECT.",
            file=sys.stderr,
        )

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }

    endpoint = f"{supabase_url}/rest/v1/cote_dunare_zi"
    for station in STATIONS:
        response = requests.get(
            endpoint,
            headers=headers,
            params={
                "localitatea": f"eq.{station}",
                "debit_mc_s": "not.is.null",
                "select": "data,debit_mc_s",
                "order": "data.asc",
                "limit": "5",
            },
            timeout=20,
        )
        response.raise_for_status()

        print(f"\n{station}:")
        for row in response.json():
            print(f"  {row.get('data')}: {row.get('debit_mc_s')} m3/s")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
