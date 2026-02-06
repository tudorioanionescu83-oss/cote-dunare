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

export default function StationChart({ rows, showTemperature = true }) {
  const data = useMemo(() => {
    const processed = (rows || []).map((r) => ({
      data: r.data || r.date || r.time || r.ts,
      nivel_cm: r.nivel_cm == null ? null : Number(r.nivel_cm),
      temperatura_c: r.temperatura_c == null ? null : Number(r.temperatura_c),
    }));
    
    return processed;
  }, [rows]);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 14, color: "#6b7280", fontSize: 14 }}>
        Nu exista date in intervalul ales pentru statia selectata.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: showTemperature ? 20 : 10, left: 12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="data"
            tickFormatter={fmtDate}
            minTickGap={20}
            tick={{ fontSize: 14, fill: "#374151", fontWeight: 500 }}
            axisLine={{ stroke: "#d1d5db" }}
          />

          <YAxis
            yAxisId="nivel"
            label={{ 
              value: "Nivel (cm)", 
              angle: -90, 
              position: "insideLeft",
              style: { fontSize: 14, fill: "#1e40af", fontWeight: 700 }
            }}
            tick={{ fontSize: 14, fill: "#374151", fontWeight: 500 }}
            width={60}
            axisLine={{ stroke: "#d1d5db" }}
          />

          {showTemperature && (
            <YAxis
              yAxisId="temp"
              orientation="right"
              label={{ 
                value: "Temperatura (C)", 
                angle: 90, 
                position: "insideRight",
                style: { fontSize: 14, fill: "#dc2626", fontWeight: 700 }
              }}
              tick={{ fontSize: 14, fill: "#374151", fontWeight: 500 }}
              width={70}
              axisLine={{ stroke: "#d1d5db" }}
            />
          )}

          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              padding: "10px 14px",
            }}
            formatter={(value, name) => {
              if (name === "nivel_cm") return [`${value ?? "-"} cm`, "Nivel"];
              if (name === "temperatura_c") return [`${value ?? "-"} C`, "Temperatura"];
              return [value, name];
            }}
            labelFormatter={(label) => `Data: ${label}`}
            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
          />

          <Legend 
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>}
          />

          <Area
            yAxisId="nivel"
            type="monotone"
            dataKey="nivel_cm"
            name="Nivel (cm)"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
          />

          {showTemperature && (
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperatura_c"
              name="Temperatura (C)"
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
