"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/**
 * ForecastChart - Grafic pentru prognoza nivelului apei
 * 
 * Props:
 * - stationName: string - numele stației
 * - nivelActual: number - nivelul curent (opțional, pentru referință)
 */
export default function ForecastChart({ stationName, nivelActual }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stationName) return;

    let cancelled = false;

    async function loadForecast() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/forecast?station=${encodeURIComponent(stationName)}`
        );
        const data = await res.json();

        if (!cancelled) {
          if (data.ok && data.forecast) {
            setForecast(data.forecast);
          } else {
            setForecast(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Nu am putut încărca prognoza");
          setLoading(false);
        }
      }
    }

    loadForecast();
    return () => {
      cancelled = true;
    };
  }, [stationName]);

  // Calculează min/max pentru axa Y
  const { yMin, yMax } = useMemo(() => {
    if (!forecast?.points?.length) return { yMin: 0, yMax: 300 };

    const values = forecast.points.map((p) => p.value).filter((v) => v !== null);
    if (!values.length) return { yMin: 0, yMax: 300 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(10, (max - min) * 0.1);

    return {
      yMin: Math.floor((min - padding) / 10) * 10,
      yMax: Math.ceil((max + padding) / 10) * 10,
    };
  }, [forecast]);

  // Trend: crește sau scade?
  const trend = useMemo(() => {
    if (!forecast?.points?.length || forecast.points.length < 2) return null;

    const first = forecast.points[0]?.value;
    const last = forecast.points[forecast.points.length - 1]?.value;

    if (first === null || last === null) return null;

    const diff = last - first;
    if (diff > 5) return { direction: "up", diff, color: "#22c55e", emoji: "📈" };
    if (diff < -5) return { direction: "down", diff, color: "#ef4444", emoji: "📉" };
    return { direction: "stable", diff, color: "#6b7280", emoji: "➡️" };
  }, [forecast]);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          padding: 16,
          background: "#f9fafb",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ color: "#9ca3af", fontSize: 13 }}>
          Se încarcă prognoza pentru {stationName}...
        </div>
      </div>
    );
  }

  // No forecast available
  if (!forecast || !forecast.points?.length) {
    return (
      <div
        style={{
          padding: 16,
          background: "#f9fafb",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
          📈 Prognoză nivel
        </div>
        <div style={{ color: "#9ca3af", fontSize: 13 }}>
          Nu există prognoză disponibilă pentru {stationName}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        background: "#ffffff",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
            📈 Prognoză nivel - {stationName}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Sursa: INHGA • Următoarele 120 ore
          </div>
        </div>

        {/* Trend badge */}
        {trend && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              background: `${trend.color}15`,
              border: `1px solid ${trend.color}40`,
            }}
          >
            <span style={{ fontSize: 14 }}>{trend.emoji}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: trend.color,
              }}
            >
              {trend.diff > 0 ? "+" : ""}
              {trend.diff} cm
            </span>
          </div>
        )}
      </div>

      {/* Grafic */}
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecast.points}
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 12, fill: "#6b7280", fontWeight: 600 }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(v) => `${v}`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
              formatter={(value) => [`${value} cm`, "Nivel"]}
              labelFormatter={(label) => `Prognoză ${label}`}
            />

            {/* Linia de referință pentru nivelul actual */}
            {nivelActual && (
              <ReferenceLine
                y={nivelActual}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                label={{
                  value: `Acum: ${nivelActual}`,
                  position: "right",
                  fontSize: 11,
                  fill: "#3b82f6",
                }}
              />
            )}

            {/* Linia de prognoză */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{
                fill: "#0ea5e9",
                strokeWidth: 2,
                stroke: "#fff",
                r: 5,
              }}
              activeDot={{
                r: 7,
                fill: "#0ea5e9",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer cu valorile */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid #f3f4f6",
        }}
      >
        {forecast.points.map((point, idx) => (
          <div key={idx} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
              {point.label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: idx === 0 ? "#3b82f6" : "#111827",
              }}
            >
              {point.value} cm
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
