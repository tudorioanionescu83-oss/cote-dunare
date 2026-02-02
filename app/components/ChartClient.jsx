"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtDateLabel(iso) {
  // iso: YYYY-MM-DD
  if (!iso) return "";
  const s = String(iso);
  if (s.length >= 10) return s.slice(5, 10).replace("-", "."); // MM.DD
  return s;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const p = Object.fromEntries(
    payload.map((x) => [x.dataKey, x.value])
  );

  const lvl = p.level;
  const tmp = p.temp;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        border: "1px solid #e6e6e6",
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        fontSize: 12,
        lineHeight: 1.35,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div>Nivel: <b>{lvl ?? "—"}</b> cm</div>
      <div>Temperatură: <b>{tmp ?? "—"}</b> °C</div>
    </div>
  );
}

export default function ChartClient({
  rows = [],
  days = 30,
  onDaysChange,
  height = 260,
}) {
  const data = useMemo(() => {
    // normalize + sort
    const arr = (rows || [])
      .map((r) => ({
        date: String(r.date ?? ""),
        level: toNum(r.level),
        temp: toNum(r.temp),
      }))
      .filter((r) => r.date)
      .sort((a, b) => a.date.localeCompare(b.date));

    return arr;
  }, [rows]);

  const stats = useMemo(() => {
    let maxLevel = null;
    let maxTemp = null;
    for (const r of data) {
      if (r.level != null) maxLevel = maxLevel == null ? r.level : Math.max(maxLevel, r.level);
      if (r.temp != null) maxTemp = maxTemp == null ? r.temp : Math.max(maxTemp, r.temp);
    }
    return { maxLevel, maxTemp };
  }, [data]);

  const canDraw = data && data.length >= 2 && (stats.maxLevel != null || stats.maxTemp != null);

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 16,
        padding: 14,
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* header + range buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 14 }}>Evoluție nivel & temperatură</div>

        <div style={{ display: "flex", gap: 8 }}>
          {[
            { d: 7, label: "1s" },
            { d: 30, label: "1l" },
            { d: 90, label: "3l" },
            { d: 365, label: "1a" },
          ].map((b) => (
            <button
              key={b.d}
              onClick={() => onDaysChange && onDaysChange(b.d)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)",
                background: b.d === days ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.9)",
                fontWeight: 800,
                fontSize: 12,
                cursor: onDaysChange ? "pointer" : "default",
              }}
              title={`${b.d} zile`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {!canDraw ? (
          <div style={{ padding: 12, opacity: 0.75, fontSize: 13 }}>
            Nu există suficiente date pentru grafic (ai nevoie de minim 2 puncte).
          </div>
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 22, left: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDateLabel}
                  minTickGap={18}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  width={44}
                  label={{ value: "Nivel (cm)", angle: -90, position: "insideLeft", offset: 4 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  width={44}
                  label={{ value: "Temp (°C)", angle: 90, position: "insideRight", offset: 6 }}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Nivel: area (albastru) */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="level"
                  name="Nivel (cm)"
                  strokeWidth={2}
                  stroke="#2b67ff"
                  fill="rgba(43,103,255,0.18)"
                  dot={false}
                  connectNulls
                />

                {/* Temp: linie roșie punctată */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temp"
                  name="Temperatură (°C)"
                  strokeWidth={2}
                  stroke="#ff4b4b"
                  dot={false}
                  strokeDasharray="6 4"
                  connectNulls
                />

                {/* Linii de max (ca “la 9”) */}
                {stats.maxLevel != null && (
                  <ReferenceLine
                    yAxisId="left"
                    y={stats.maxLevel}
                    stroke="#2b67ff"
                    strokeDasharray="2 6"
                    label={{
                      value: `max: ${stats.maxLevel}`,
                      position: "insideTopLeft",
                      fontSize: 11,
                      fontWeight: 800,
                      fill: "#2b67ff",
                    }}
                  />
                )}
                {stats.maxTemp != null && (
                  <ReferenceLine
                    yAxisId="right"
                    y={stats.maxTemp}
                    stroke="#ff4b4b"
                    strokeDasharray="2 6"
                    label={{
                      value: `max: ${stats.maxTemp}`,
                      position: "insideTopRight",
                      fontSize: 11,
                      fontWeight: 800,
                      fill: "#ff4b4b",
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* sursa sub grafic */}
        <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
          Sursă date: <b>AFDJ.RO</b>
        </div>
      </div>
    </div>
  );
}
