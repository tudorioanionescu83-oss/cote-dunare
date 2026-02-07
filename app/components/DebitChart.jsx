"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const PERIODS = [
  { days: 1, label: "1 zi" },
  { days: 3, label: "3 zile" },
  { days: 7, label: "7 zile" },
  { days: 30, label: "1 luna" },
];

const DEBIT_COLOR = "#0284c7";
const TEMP_COLOR = "#dc2626";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function CustomTooltip({ active, payload, label, showTemperature }) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6, fontWeight: 700 }}>
        {data?.data || label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: DEBIT_COLOR }}>
        Debit: {data?.debit_mc_s?.toLocaleString() || "-"} m3/s
      </div>
      {showTemperature && data?.temperatura_c != null && (
        <div style={{ fontSize: 14, fontWeight: 600, color: TEMP_COLOR, marginTop: 4 }}>
          Temp: {data.temperatura_c} C
        </div>
      )}
    </div>
  );
}

function TrendArrow({ trend }) {
  if (trend === "up") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}>
        <path d="M12 4L20 16H4L12 4Z" fill="#22c55e" stroke="#16a34a" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}>
        <path d="M12 20L4 8H20L12 20Z" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}>
      <circle cx="12" cy="12" r="5" fill="#9ca3af" stroke="#6b7280" strokeWidth="1.5"/>
    </svg>
  );
}

export default function DebitChart({ 
  stationName, 
  debit_mc_s, 
  debit_trend,
  showTemperature = false,
  chartData = null 
}) {
  const [period, setPeriod] = useState(7);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isCustomActive, setIsCustomActive] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (days, from, to) => {
    setLoading(true);
    try {
      let url = `/api/measurements?station=${encodeURIComponent(stationName)}`;
      if (from && to) {
        url += `&from=${from}&to=${to}`;
      } else {
        url += `&days=${days}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setRows(json.rows || []);
    } catch (e) {
      console.error("DebitChart fetch error:", e);
      setRows([]);
    }
    setLoading(false);
  }, [stationName]);

  useEffect(() => {
    // Verificăm dacă chartData are date de debit
    const hasDebitData = chartData && chartData.some(r => r.debit_mc_s !== null && r.debit_mc_s !== undefined);
    
    if (hasDebitData) {
      // Folosim datele primite direct
      setRows(chartData);
      setLoading(false);
    } else if (stationName) {
      // Facem fetch separat pentru date de debit
      if (isCustomActive && customFrom && customTo) {
        fetchData(null, customFrom, customTo);
      } else {
        fetchData(period, null, null);
      }
    }
  }, [stationName, period, isCustomActive, customFrom, customTo, fetchData, chartData]);

  const handlePreset = (days) => {
    setPeriod(days);
    setIsCustomActive(false);
    setCustomOpen(false);
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      setIsCustomActive(true);
      setCustomOpen(false);
    }
  };

  // Filtram datele - doar cele cu debit valid (> 1 pentru rauri, > 100 pentru Dunare)
  const minDebit = showTemperature ? 1 : 100;
  const processedData = useMemo(() => {
    return rows
      .filter(r => r.debit_mc_s !== null && r.debit_mc_s !== undefined && r.debit_mc_s > minDebit)
      .map(r => ({
        ...r,
        debit_mc_s: Number(r.debit_mc_s),
        temperatura_c: r.temperatura_c != null ? Number(r.temperatura_c) : null,
      }));
  }, [rows, minDebit]);

  if (!debit_mc_s && processedData.length === 0) {
    return null;
  }

  const dataSource = showTemperature ? "DanubeHIS" : "DanubeHIS";

  return (
    <div id="debit-section" style={{
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        background: "linear-gradient(135deg, #0369a1 0%, #0284c7 100%)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>
              {showTemperature ? "Debit si Temperatura" : "Debit"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
              Sursa: {dataSource}
            </div>
          </div>
          
          {!chartData && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => handlePreset(p.days)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: !isCustomActive && period === p.days ? "white" : "transparent",
                    color: !isCustomActive && period === p.days ? "#0284c7" : "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setCustomOpen(!customOpen)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: isCustomActive || customOpen ? "white" : "transparent",
                  color: isCustomActive || customOpen ? "#0284c7" : "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Alta
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 14px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.3)",
        }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "white" }}>
            {debit_mc_s?.toLocaleString() || "-"}
          </span>
          <span style={{ fontSize: 13, color: "white", marginLeft: 4, fontWeight: 600 }}>m3/s</span>
          <TrendArrow trend={debit_trend} />
        </div>
      </div>

      {/* Custom range picker */}
      {customOpen && !chartData && (
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "flex-end",
          background: "#f9fafb",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>De la</div>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Pana la</div>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            />
          </div>
          <button
            onClick={applyCustom}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "#0284c7",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Aplica
          </button>
        </div>
      )}

      {/* Grafic */}
      <div style={{ padding: "16px" }}>
        {loading ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
            Se incarca...
          </div>
        ) : processedData.length === 0 ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
            Nu exista date de debit pentru aceasta perioada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={processedData} margin={{ top: 10, right: showTemperature ? 20 : 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="debitGradientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DEBIT_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={DEBIT_COLOR} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="data"
                tickFormatter={formatDate}
                tick={{ fontSize: 14, fill: "#374151", fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#d1d5db" }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="debit"
                tick={{ fontSize: 14, fill: "#374151", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toLocaleString()}
                width={60}
                label={{ 
                  value: "Debit (m3/s)", 
                  angle: -90, 
                  position: "insideLeft",
                  style: { fontSize: 14, fill: DEBIT_COLOR, fontWeight: 700 }
                }}
              />
              {showTemperature && (
                <YAxis
                  yAxisId="temp"
                  orientation="right"
                  tick={{ fontSize: 14, fill: "#374151", fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  label={{ 
                    value: "Temp (C)", 
                    angle: 90, 
                    position: "insideRight",
                    style: { fontSize: 14, fill: TEMP_COLOR, fontWeight: 700 }
                  }}
                />
              )}
              <Tooltip content={<CustomTooltip showTemperature={showTemperature} />} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>}
              />
              <Area
                yAxisId="debit"
                type="monotone"
                dataKey="debit_mc_s"
                name="Debit (m3/s)"
                stroke={DEBIT_COLOR}
                strokeWidth={2.5}
                fill="url(#debitGradientBlue)"
                dot={false}
                activeDot={{ r: 5, fill: DEBIT_COLOR, stroke: "#fff", strokeWidth: 2 }}
              />
              {showTemperature && (
                <Line
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temperatura_c"
                  name="Temperatura (C)"
                  stroke={TEMP_COLOR}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4, fill: TEMP_COLOR, stroke: "#fff", strokeWidth: 2 }}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
