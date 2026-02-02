"use client";

import React from "react";
import StationChart from "./StationChart";

export default function StationPanel({
  station,
  latest,
  chartData,
  period,
  onPeriodChange,
  loading = false,
}) {
  const name = station?.name || "Stație";

  return (
    <div
      style={{
        background: "white",
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* Header */}
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 20 }}>{name}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
          Nivel: <b>{latest?.nivel_cm ?? "—"} cm</b> ·
          Δ: <b>{latest?.variatie_cm ?? "—"} cm</b> ·
          T: <b>{latest?.temperatura_c ?? "—"} °C</b>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {[1, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => onPeriodChange?.(d)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: period === d ? "#111827" : "#fff",
                color: period === d ? "#fff" : "#111827",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {d === 1 ? "1 zi" : d === 30 ? "1 lună" : d === 90 ? "3 luni" : "1 an"}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "0 16px 16px 16px" }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Se încarcă graficul…
          </div>
        ) : (
          <StationChart rows={chartData} />
        )}
      </div>
    </div>
  );
}
