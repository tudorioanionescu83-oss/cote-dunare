// app/api/weather/route.js
import { NextResponse } from "next/server";

export const revalidate = 3600; // cache 1h (Vercel/Next)

function codeToLabel(code) {
  // Open-Meteo weather codes (simplificat)
  if (code === 0) return "Senin";
  if ([1, 2, 3].includes(code)) return "Parțial noros";
  if ([45, 48].includes(code)) return "Ceață";
  if ([51, 53, 55, 56, 57].includes(code)) return "Burniță";
  if ([61, 63, 65, 66, 67].includes(code)) return "Ploaie";
  if ([71, 73, 75, 77].includes(code)) return "Ninsoare";
  if ([80, 81, 82].includes(code)) return "Averse";
  if ([95, 96, 99].includes(code)) return "Furtună";
  return "Meteo";
}

function codeToIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([66, 67].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "Missing lat/lng" }, { status: 400 });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&timezone=Europe%2FBucharest` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&forecast_days=4`;

  const r = await fetch(url, {
    // cache ok pe edge
    headers: { "User-Agent": "cote-dunare/1.0" },
    next: { revalidate: 3600 },
  });

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: "Upstream error" }, { status: 502 });
  }

  const j = await r.json();

  const current = j?.current
    ? {
        temp_c: j.current.temperature_2m ?? null,
        wind_kmh: j.current.wind_speed_10m ?? null,
        code: j.current.weather_code ?? null,
        label: codeToLabel(j.current.weather_code),
        icon: codeToIcon(j.current.weather_code),
      }
    : null;

  const daily = [];
  const t = j?.daily?.time || [];
  const c = j?.daily?.weather_code || [];
  const tmax = j?.daily?.temperature_2m_max || [];
  const tmin = j?.daily?.temperature_2m_min || [];
  const pr = j?.daily?.precipitation_sum || [];
  const wmax = j?.daily?.wind_speed_10m_max || [];

  for (let i = 0; i < Math.min(4, t.length); i++) {
    daily.push({
      date: t[i],
      code: c[i] ?? null,
      icon: codeToIcon(c[i]),
      label: codeToLabel(c[i]),
      tmax: tmax[i] ?? null,
      tmin: tmin[i] ?? null,
      precip_mm: pr[i] ?? null,
      windmax_kmh: wmax[i] ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    current,
    daily,
    source: "open-meteo.com",
  });
}
