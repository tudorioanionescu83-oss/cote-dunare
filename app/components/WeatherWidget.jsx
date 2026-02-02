"use client";

import React from "react";

function fmtDayShort(iso) {
  try {
    const [y, m, d] = String(iso).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("ro-RO", { weekday: "short" });
  } catch {
    return iso;
  }
}

export default function WeatherWidget({ weather }) {
  if (!weather?.ok) {
    return (
      <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
        Meteo: indisponibil momentan.
      </div>
    );
  }

  const cur = weather.current;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "linear-gradient(180deg, rgba(240,251,255,0.95), rgba(255,255,255,0.95))",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{cur?.icon ?? "🌡️"}</span>
            Meteo (azi)
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {cur?.label ?? "—"} · sursă: {weather.source}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>
            {cur?.temp_c ?? "—"}°C
          </div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            vânt {cur?.wind_kmh ?? "—"} km/h
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 10 }}>
        {(weather.daily || []).slice(1, 4).map((d) => (
          <div
            key={d.date}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 10,
              background: "rgba(255,255,255,0.9)",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 12, textTransform: "capitalize" }}>
                {fmtDayShort(d.date)}
              </div>
              <div style={{ fontSize: 18 }}>{d.icon}</div>
            </div>

            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, lineHeight: 1.25 }}>
              {d.label}
            </div>

            <div style={{ marginTop: 8, fontWeight: 950, fontSize: 13 }}>
              {d.tmin ?? "—"}° / {d.tmax ?? "—"}°
            </div>

            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
              {d.precip_mm ?? "—"} mm · vânt max {d.windmax_kmh ?? "—"} km/h
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
