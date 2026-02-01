"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function StationChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        Nu există date pentru intervalul selectat.
      </div>
    );
  }

  return (
    <div className="w-full h-[360px] rounded-xl bg-gradient-to-b from-sky-50 to-white border border-sky-100 shadow-sm p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          {/* Grid – discret, “apă” */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e0f2fe"
          />

          {/* AXA X */}
          <XAxis
            dataKey="data"
            tick={{ fontSize: 12, fill: "#475569" }}
          />

          {/* AXA Y – Nivel */}
          <YAxis
            yAxisId="nivel"
            tick={{ fontSize: 12, fill: "#1e3a8a" }}
            label={{
              value: "Nivel (cm)",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#1e3a8a", fontSize: 12 },
            }}
          />

          {/* AXA Y – Temperatură */}
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fontSize: 12, fill: "#991b1b" }}
            label={{
              value: "Temperatură (°C)",
              angle: -90,
              position: "insideRight",
              style: { fill: "#991b1b", fontSize: 12 },
            }}
          />

          <Tooltip
            contentStyle={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
              fontSize: "13px",
            }}
          />

          <Legend />

          {/* NIVEL – ALBASTRU CONTINUU */}
          <Line
            yAxisId="nivel"
            type="monotone"
            dataKey="nivel_cm"
            name="Nivel (cm)"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />

          {/* TEMPERATURĂ – ROȘU ÎNTRERUPT */}
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperatura_c"
            name="Temperatură (°C)"
            stroke="#dc2626"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
