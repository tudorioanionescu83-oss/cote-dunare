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

function fmtDayLong(iso) {
  try {
    const [y, m, d] = String(iso).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("ro-RO", { day: "numeric", month: "long" });
  } catch {
    return iso;
  }
}

export default function WeatherWidget({ weather }) {
  if (weather?.loading) {
    return (
      <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>
        Se încarcă meteo…
      </div>
    );
  }

  if (!weather?.ok) {
    return (
      <div style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
        Meteo: indisponibil momentan.
      </div>
    );
  }

  const cur = weather.current;
  const today = weather.daily?.[0];

  return (
    <div
      style={{
        border: "1px solid #e0e7ef",
        borderRadius: 20,
        background: "linear-gradient(135deg, #f8faff 0%, #ffffff 100%)",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* HEADER MODERN CU GRADIENT */}
      <div
        style={{
          background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
          padding: "20px 20px 24px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Efect de fundal decorativ */}
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Conținut header */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            {/* Stânga - Temperatură mare + detalii */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 64, fontWeight: 950, color: "#ffffff", lineHeight: 1 }}>
                  {cur?.temp_c ?? "—"}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                  °C
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                <span style={{ fontSize: 28 }}>{cur?.icon ?? "🌡️"}</span>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {cur?.label?.split("(")[0]?.trim() ?? "—"}
                </div>
              </div>

              {today && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {fmtDayLong(today.date)} • Min {today.tmin ?? "—"}° / Max {today.tmax ?? "—"}°
                </div>
              )}
            </div>

            {/* Dreapta - Iconiță mare decorativă */}
            <div
              style={{
                fontSize: 80,
                opacity: 0.2,
                filter: "drop-shadow(0 4px 12px rgba(255,255,255,0.3))",
              }}
            >
              {cur?.icon ?? "🌡️"}
            </div>
          </div>
        </div>
      </div>

      {/* DETALII METEO CURENTE - Grid modern */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 1,
          background: "#e5e7eb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {/* Vânt */}
        <div
          style={{
            background: "#ffffff",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            💨 Vânt
          </div>
          <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
            {cur?.wind_kmh ?? "—"} km/h
          </div>
          {cur?.wind_dir && (
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
              din {cur.wind_dir}
            </div>
          )}
        </div>

        {/* Umiditate */}
        {cur?.humidity != null && (
          <div
            style={{
              background: "#ffffff",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              💧 Umiditate
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
              {cur.humidity}%
            </div>
          </div>
        )}

        {/* Presiune */}
        {cur?.pressure_hpa != null && (
          <div
            style={{
              background: "#ffffff",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🌡️ Presiune
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
              {cur.pressure_hpa} hPa
            </div>
          </div>
        )}

        {/* Vizibilitate */}
        {cur?.visibility && (
          <div
            style={{
              background: "#ffffff",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              👁️ Vizibilitate
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
              {cur.visibility}
            </div>
          </div>
        )}

        {/* Precipitații */}
        {cur?.precipitation_mm != null && (
          <div
            style={{
              background: "#ffffff",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🌧️ Precipitații
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
              {cur.precipitation_mm} mm
            </div>
          </div>
        )}
      </div>

      {/* PROGNOZĂ 7 ZILE - Cards moderne */}
      {Array.isArray(weather.daily) && weather.daily.length > 1 && (
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: "#111827",
              marginBottom: 14,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            📅 Prognoză 7 zile
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {weather.daily.slice(1, 8).map((d, idx) => (
              <div
                key={d.date}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: "14px 12px",
                  background: idx === 0 
                    ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)" 
                    : "#ffffff",
                  minWidth: 0,
                  boxShadow: idx === 0 ? "0 2px 8px rgba(14, 165, 233, 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.05)",
                  transition: "all 0.2s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = idx === 0 ? "0 2px 8px rgba(14, 165, 233, 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.05)";
                }}
              >
                {/* Header zi */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 13,
                      textTransform: "capitalize",
                      color: idx === 0 ? "#0284c7" : "#111827",
                    }}
                  >
                    {idx === 0 ? "Mâine" : fmtDayShort(d.date)}
                  </div>
                  <div style={{ fontSize: 26 }}>{d.icon ?? "🌡️"}</div>
                </div>

                {/* Temperaturi */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 18, color: "#111827" }}>
                    {d.tmax ?? "—"}°
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                    min {d.tmin ?? "—"}°
                  </div>
                </div>

                {/* Label meteo */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    marginBottom: 8,
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {d.label ?? "—"}
                </div>

                {/* Detalii suplimentare */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                  {d.precip_mm != null && d.precip_mm > 0 && (
                    <div style={{ color: "#0284c7", fontWeight: 700 }}>
                      💧 {d.precip_mm} mm
                      {d.precip_prob != null && ` (${d.precip_prob}%)`}
                    </div>
                  )}
                  {d.windmax_kmh != null && (
                    <div style={{ color: "#6b7280", fontWeight: 600 }}>
                      💨 {d.windmax_kmh} km/h {d.wind_dir ? `(${d.wind_dir})` : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer cu sursa */}
      <div
        style={{
          padding: "12px 20px",
          background: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 600,
        }}
      >
        📡 Sursa: {weather.source ?? "—"}
      </div>
    </div>
  );
}
