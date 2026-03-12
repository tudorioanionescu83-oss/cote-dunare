"use client";

import { useEffect, useMemo, useState } from "react";
import WeatherWidget from "../WeatherWidget";

function extractCoords(station) {
  return {
    lat: station?.lat ?? station?.latitude ?? station?.Latitude ?? null,
    lon: station?.lon ?? station?.lng ?? station?.longitude ?? station?.Longitudine ?? null,
  };
}

export default function MarineMeteoSection({ station }) {
  const coords = useMemo(() => extractCoords(station), [station]);
  const [weather, setWeather] = useState({ loading: true, ok: false });

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      if (coords.lat == null || coords.lon == null) {
        if (!cancelled) setWeather({ loading: false, ok: false, reason: "missing_coords" });
        return;
      }

      if (!cancelled) setWeather({ loading: true, ok: false });
      try {
        const res = await fetch(
          `/api/weather?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}`,
          { cache: "no-store" }
        );
        const payload = await res.json();
        if (!cancelled) setWeather({ loading: false, ...payload });
      } catch {
        if (!cancelled) setWeather({ loading: false, ok: false, reason: "request_failed" });
      }
    }

    loadWeather();
    const timer = setInterval(loadWeather, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [coords.lat, coords.lon]);

  return (
    <section
      id="meteo-section"
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 16,
        background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "14px 14px 10px 14px", borderBottom: "1px solid #dbeafe" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Meteo Constanta</div>
        <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
          Sectiune separata de parametrii marini.
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {weather.loading ? <div style={{ color: "#64748b", fontSize: 13 }}>Se incarca meteo...</div> : <WeatherWidget weather={weather} />}
      </div>
    </section>
  );
}
