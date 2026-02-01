"use client";

import React, { useEffect, useMemo, useState } from "react";
import StationChart from "./StationChart";
import { stationSlug } from "../lib/stations";

const PERIODS = [
  { days: 1, label: "1 zi" },
  { days: 30, label: "1 lună" },
  { days: 90, label: "3 luni" },
  { days: 365, label: "1 an" },
];

function badgeStyle(kind) {
  if (kind === "pos") return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (kind === "neg") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (kind === "zero") return { background: "#e5e7eb", color: "#111827", border: "1px solid #d1d5db" };
  return { background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" };
}

export default function StationPanel({
  station,
  latest,
  chartData,
  period,
  onPeriodChange,
  loading = false,
}) {
  const name = station?.name || station?.localitatea || "Stație";
  const slug = useMemo(() => stationSlug(name), [name]);
  const imgUrl = `/stations/${slug}.jpg`;

  const [wiki, setWiki] = useState({ loading: true, found: false, extract: "", url: null });

  useEffect(() => {
    let cancelled = false;
    async function loadWiki() {
      setWiki({ loading: true, found: false, extract: "", url: null });
      try {
        const r = await fetch(`/api/wiki?title=${encodeURIComponent(name)}`);
        const j = await r.json();
        if (!cancelled) setWiki({ loading: false, ...j });
      } catch {
        if (!cancelled) setWiki({ loading: false, found: false, extract: "", url: null });
      }
    }
    if (name) loadWiki();
    return () => {
      cancelled = true;
    };
  }, [name]);

  const delta = latest?.variatie_cm;
  const deltaNum = delta === null || delta === undefined ? null : Number(delta);
  const badgeKind = deltaNum === null ? "na" : deltaNum > 0 ? "pos" : deltaNum < 0 ? "neg" : "zero";

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
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* imagine mare */}
        <div
          style={{
            width: "100%",
            height: 160,
            borderRadius: 16,
            overflow: "hidden",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        {/* titlu + mini stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.1 }}>{name}</div>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                Ultima citire: <b>{latest?.data ?? "—"}</b> · Nivel: <b>{latest?.nivel_cm ?? "—"} cm</b> · Δ:{" "}
                <b>{latest?.variatie_cm ?? "—"} cm</b> · T: <b>{latest?.temperatura_c ?? "—"} °C</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ padding: "6px 10px", borderRadius: 999, fontWeight: 900, fontSize: 12, ...badgeStyle(badgeKind) }}>
                Δ {deltaNum === null ? "—" : deltaNum > 0 ? `+${deltaNum}` : `${deltaNum}`} cm
              </span>
              <select
                value={name}
                onChange={() => {}}
                disabled
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  fontWeight: 800,
                  color: "#111827",
                }}
              >
                <option>{name}</option>
              </select>
            </div>
          </div>

          {/* cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {[
              { label: "Nivel", value: latest?.nivel_cm ?? "—", unit: "cm" },
              { label: "Δ", value: latest?.variatie_cm ?? "—", unit: "cm" },
              { label: "Temp", value: latest?.temperatura_c ?? "—", unit: "°C" },
              { label: "Km", value: latest?.km ?? "—", unit: "" },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 12,
                  background: "linear-gradient(180deg, #ffffff, #fafafa)",
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 950, marginTop: 4 }}>
                  {c.value} <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{c.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* text wiki (max 4 rânduri vizual) */}
          <div style={{ marginTop: 4, fontSize: 13, color: "#374151", lineHeight: 1.45 }}>
            {wiki.loading ? (
              <div style={{ color: "#9ca3af" }}>Se încarcă rezumatul Wikipedia…</div>
            ) : wiki.found ? (
              <>
                <div
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {wiki.extract}
                </div>
                {wiki.url && (
                  <div style={{ marginTop: 6 }}>
                    <a href={wiki.url} target="_blank" rel="noreferrer" style={{ color: "#111827", fontWeight: 900 }}>
                      Deschide Wikipedia →
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "#9ca3af" }}>Nu am găsit rezumat Wikipedia pentru „{name}”.</div>
            )}
          </div>

          {/* perioade */}
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => onPeriodChange?.(p.days)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: period === p.days ? "#111827" : "#ffffff",
                  color: period === p.days ? "white" : "#111827",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "0 16px 16px 16px" }}>
        {loading ? (
          <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>Se încarcă graficul…</div>
        ) : (
          <StationChart rows={chartData} />
        )}
      </div>
    </div>
  );
}
