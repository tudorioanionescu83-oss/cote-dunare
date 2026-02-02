// app/components/StationChart.jsx
"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
  Legend,
} from "recharts";

function fmtDate(d) {
  try {
    const [y, m, day] = String(d).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, day || 1);
    return dt.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
  } catch {
    return String(d);
  }
}

export default function StationChart({ rows }) {
  const data = useMemo(() => {
    return (rows || []).map((r) => ({
      data: r.data,
      nivel_cm: r.nivel_cm == null ? null : Number(r.nivel_cm),
      temperatura_c: r.temperatura_c == null ? null : Number(r.temperatura_c),
    }));
  }, [rows]);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>
        Nu există date în intervalul ales pentru stația selectată.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="data"
            tickFormatter={fmtDate}
            minTickGap={20}
            tick={{ fontSize: 12 }}
          />

          <YAxis
            yAxisId="nivel"
            label={{ value: "Nivel (cm)", angle: -90, position: "insideLeft" }}
            tick={{ fontSize: 12 }}
            width={52}
          />

          <YAxis
            yAxisId="temp"
            orientation="right"
            label={{ value: "Temperatura (°C)", angle: 90, position: "insideRight" }}
            tick={{ fontSize: 12 }}
            width={60}
          />

          <Tooltip
            formatter={(value, name) => {
              if (name === "nivel_cm") return [`${value ?? "—"} cm`, "Nivel"];
              if (name === "temperatura_c") return [`${value ?? "—"} °C`, "Temperatura"];
              return [value, name];
            }}
            labelFormatter={(label) => `Data: ${label}`}
          />

          <Legend />

          <Area
            yAxisId="nivel"
            type="monotone"
            dataKey="nivel_cm"
            name="Nivel (cm)"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={false}
          />

          {/* 🔴 Temperatura: roșu + linie întreruptă */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperatura_c"
            name="Temperatura (°C)"
            stroke="#dc2626"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
