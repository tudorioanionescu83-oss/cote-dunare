# Cotele Dunării - Platformă Interactivă

Platformă web pentru monitorizarea în timp real a cotelor Dunării de la toate stațiile hidrometrice AFDJ.

## Features

- 📊 Date în timp real pentru 12 stații hidrometrice
- 📈 Grafice istorice personalizabile
- 🗺️ Hartă interactivă
- 🌡️ Date meteo integrate
- 📱 Design responsive

## Tech Stack

- Next.js 14
- React 18
- Supabase (PostgreSQL)
- Tailwind CSS
- Lucide Icons

## Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local` with Supabase credentials
4. Run: `npm run dev`

## Deploy

Deployed on Vercel at: cote.sturgeons.eu

## Marine station (Constanta)

New marine station support was added for `constanta_marine` using only Copernicus Marine data.

Internal endpoints:

- `GET /api/stations/constanta/current`
- `GET /api/stations/constanta/timeseries?hours=168`
- `GET /api/stations/constanta/forecast?days=5`
- `GET /api/stations/constanta/layers`

Automatic refresh:

- GitHub Actions workflow: `.github/workflows/update-constanta-marine.yml`
- Schedule: every 6 hours (`0 */6 * * *`)
- Updater script: `scripts/marine/update_constanta_marine.py`

Supabase:

- Migration: `supabase/migrations/20260312090000_create_marine_station_data.sql`
- Cache table: `marine_station_data`
