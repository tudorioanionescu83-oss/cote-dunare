import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// aceeași listă ca în /api/stations (minim: name, lat, lng, icao optional)
const STATIONS = [
  { name: "Bazias", lat: 44.8166, lng: 21.3899 },
  { name: "Moldova Veche", lat: 44.7342, lng: 21.6201 },
  { name: "Drencova", lat: 44.6383, lng: 21.9739 },
  { name: "Orsova", lat: 44.7253, lng: 22.3961, icao: "LROM" },
  { name: "Drobeta Turnu Severin", lat: 44.6319, lng: 22.6561, icao: "LROM" },
  { name: "Gruia", lat: 44.2675, lng: 22.7047 },
  { name: "Cetate", lat: 44.1053, lng: 23.0512 },
  { name: "Calafat", lat: 43.9907, lng: 22.9333 },
  { name: "Rast", lat: 43.8830, lng: 23.2830 },
  { name: "Bechet", lat: 43.7843, lng: 23.9597 },
  { name: "Corabia", lat: 43.7736, lng: 24.5033 },
  { name: "Turnu Magurele", lat: 43.7469, lng: 24.8685 },
  { name: "Zimnicea", lat: 43.6566, lng: 25.3660 },
  { name: "Giurgiu", lat: 43.8833, lng: 25.9667, icao: "LROP" },
  { name: "Oltenita", lat: 44.0833, lng: 26.6333 },
  { name: "Calarasi", lat: 44.2051, lng: 27.3136 },
  { name: "Cernavoda", lat: 44.3396, lng: 28.0327, icao: "LRCK" },
  { name: "Harsova", lat: 44.6831, lng: 27.9482 },
  { name: "Braila", lat: 45.2715, lng: 27.9743 },
  { name: "Galati", lat: 45.4500, lng: 28.0500 },
  { name: "Isaccea", lat: 45.2697, lng: 28.4597 },
  { name: "Tulcea", lat: 45.1787, lng: 28.8050, icao: "LRTC" },
  { name: "Sulina", lat: 45.1567, lng: 29.6596 }
];

// ---------- helpers ----------
function codeToLabel(code) {
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
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toYYYYMMDDHHmmUTC(date) {
  return (
    date.getUTCFullYear() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes())
  );
}
function knotsToKmh(knots) {
  const k = Number(knots);
  if (!Number.isFinite(k)) return null;
  return Math.round(k * 1.852);
}
function parseMetarTempC(metar) {
  const m = String(metar).match(/\b(M?\d{2})\/(M?\d{2})\b/);
  if (!m) return null;
  const t = m[1].startsWith("M") ? -Number(m[1].slice(1)) : Number(m[1]);
  return Number.isFinite(t) ? t : null;
}
function parseMetarWindKmh(metar) {
  const m = String(metar).match(/\b(?:\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT\b/);
  if (!m) return null;
  return knotsToKmh(m[1]);
}
function metarIcon(tempC) {
  if (!Number.isFinite(tempC)) return "🌡️";
  if (tempC <= -10) return "🥶";
  if (tempC <= 0) return "❄️";
  if (tempC >= 25) return "🥵";
  return "🌡️";
}

function dist2(aLat, aLng, bLat, bLng) {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return dLat * dLat + dLng * dLng;
}

function nearestStation(lat, lon) {
  let best = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    const d = dist2(lat, lon, s.lat, s.lng);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// ---------- upstream ----------
async function fetchOpenMeteo(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&timezone=Europe%2FBucharest` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&forecast_days=4`;

  const r = await fetch(url, { headers: { "User-Agent": "cote-dunare/1.0" } });
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
  return await r.json();
}

async function fetchOgimetLatestMetar(icao) {
  const end = new Date();
  const begin = new Date(end.getTime() - 6 * 60 * 60 * 1000);

  const url =
    `https://www.ogimet.com/cgi-bin/getmetar?` +
    `icao=${encodeURIComponent(icao)}` +
    `&begin=${toYYYYMMDDHHmmUTC(begin)}` +
    `&end=${toYYYYMMDDHHmmUTC(end)}` +
    `&lang=eng`;

  const r = await fetch(url, { headers: { "User-Agent": "cote-dunare/1.0" } });
  if (!r.ok) throw new Error(`OGIMET HTTP ${r.status}`);

  const text = await r.text();
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

  let last = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const parts = lines[i].split(",");
    if (parts.length >= 7 && parts[0] && parts[6]) { last = parts; break; }
  }
  if (!last) throw new Error("No METAR found");

  const [icaoInd, Y, Mo, D, H, Mi, ...rest] = last;
  const metarRaw = rest.join(",");
  const observedAtUTC = new Date(
    Date.UTC(Number(Y), Number(Mo) - 1, Number(D), Number(H), Number(Mi), 0)
  ).toISOString();

  const tempC = parseMetarTempC(metarRaw);
  const windKmh = parseMetarWindKmh(metarRaw);

  return { icao: icaoInd, observedAtUTC, tempC, windKmh };
}

// ---------- API ----------
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon")); // exact cum trimiți tu

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, error: "Missing lat/lon" }, { status: 400 });
  }

  try {
    const near = nearestStation(lat, lon);
    const icao = (near?.icao || "").trim().toUpperCase();

    const j = await fetchOpenMeteo(lat, lon);

    // daily din model
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
        windmax_kmh: wmax[i] ?? null
      });
    }

    // current: OGIMET dacă avem icao, altfel model
    let current = null;
    let source = "open-meteo.com (model)";

    if (icao) {
      try {
        const metar = await fetchOgimetLatestMetar(icao);
        current = {
          temp_c: metar.tempC ?? null,
          wind_kmh: metar.windKmh ?? null,
          code: null,
          icon: metarIcon(metar.tempC),
          label:
            `Observat (METAR ${metar.icao}) · ` +
            new Date(metar.observedAtUTC).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })
        };
        source = `ogimet.com (observed) + open-meteo.com (prognoză) · match: ${near?.name || "?"}`;
      } catch {
        const cur = j?.current;
        current = cur
          ? {
              temp_c: cur.temperature_2m ?? null,
              wind_kmh: cur.wind_speed_10m ?? null,
              code: cur.weather_code ?? null,
              label: `${codeToLabel(cur.weather_code)} (model)`,
              icon: codeToIcon(cur.weather_code)
            }
          : null;
        source = `open-meteo.com (model) — OGIMET indisponibil · match: ${near?.name || "?"}`;
      }
    } else {
      const cur = j?.current;
      current = cur
        ? {
            temp_c: cur.temperature_2m ?? null,
            wind_kmh: cur.wind_speed_10m ?? null,
            code: cur.weather_code ?? null,
            label: `${codeToLabel(cur.weather_code)} (model)`,
            icon: codeToIcon(cur.weather_code)
          }
        : null;
      source = `open-meteo.com (model) — fără ICAO · match: ${near?.name || "?"}`;
    }

    return NextResponse.json({
      ok: true,
      current,
      daily,
      source
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Weather error" }, { status: 502 });
  }
}
