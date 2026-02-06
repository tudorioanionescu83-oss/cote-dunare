"use client";
import React, { useMemo } from "react";

/**
 * RiverCrossSectionWidget - Secțiune transversală râu (profil albie)
 * Afișează nivelul apei în albie cu animație valuri
 * Culoarea apei în funcție de debit
 */

// Culoare bazată pe debit (m³/s) - pentru Dunăre
function getDebitColor(debit, isRiver = false) {
  if (debit === null || debit === undefined) return { color: "#60a5fa", label: "N/A", emoji: "❓" };
  
  if (isRiver) {
    // Pentru râuri mai mici
    if (debit < 20) return { color: "#93c5fd", label: "Foarte scăzut", emoji: "💧" };
    if (debit < 50) return { color: "#60a5fa", label: "Scăzut", emoji: "🌊" };
    if (debit < 150) return { color: "#3b82f6", label: "Normal", emoji: "🌊" };
    if (debit < 300) return { color: "#f59e0b", label: "Ridicat", emoji: "⚠️" };
    if (debit < 500) return { color: "#f97316", label: "Foarte ridicat", emoji: "🚨" };
    return { color: "#dc2626", label: "Extrem", emoji: "🆘" };
  }
  
  // Pentru Dunăre
  if (debit < 3000) return { color: "#93c5fd", label: "Foarte scăzut", emoji: "💧" };
  if (debit < 4000) return { color: "#60a5fa", label: "Scăzut", emoji: "🌊" };
  if (debit < 5500) return { color: "#3b82f6", label: "Normal", emoji: "🌊" };
  if (debit < 7000) return { color: "#f59e0b", label: "Ridicat", emoji: "⚠️" };
  if (debit < 9000) return { color: "#f97316", label: "Foarte ridicat", emoji: "🚨" };
  return { color: "#dc2626", label: "Extrem / Viitură", emoji: "🆘" };
}

// Calculează procentul de umplere a albiei
function calcFillPercent(nivel, cotaPericol) {
  if (!nivel || !cotaPericol) return 50;
  // Presupunem că fundul albiei e la 0 și cotaPericol e 100%
  const percent = (nivel / cotaPericol) * 100;
  return Math.min(100, Math.max(5, percent));
}

export default function RiverCrossSectionWidget({
  nivel_cm,
  debit_mc_s,
  debit_trend,
  cota_atentie_cm,
  cota_inundatie_cm,
  cota_pericol_cm,
  stationName,
  isRiver = false,
  perioada = "1zi",
  onPerioadaChange,
}) {
  const debitInfo = useMemo(() => getDebitColor(debit_mc_s, isRiver), [debit_mc_s, isRiver]);
  const fillPercent = useMemo(() => calcFillPercent(nivel_cm, cota_pericol_cm), [nivel_cm, cota_pericol_cm]);
  
  // Calculează pozițiile liniilor de cotă (ca procent din înălțime)
  const cotaAtentiePercent = cota_atentie_cm && cota_pericol_cm ? (cota_atentie_cm / cota_pericol_cm) * 100 : 70;
  const cotaInundatiePercent = cota_inundatie_cm && cota_pericol_cm ? (cota_inundatie_cm / cota_pericol_cm) * 100 : 85;
  
  const PERIODS = [
    { key: "1zi", label: "1 zi" },
    { key: "3zile", label: "3 zile" },
    { key: "7zile", label: "7 zile" },
    { key: "30zile", label: "1 lună" },
    { key: "custom", label: "Altă perioadă" },
  ];

  const trendArrow = debit_trend === "up" ? "▲" : debit_trend === "down" ? "▼" : "●";
  const trendColor = debit_trend === "up" ? "#22c55e" : debit_trend === "down" ? "#ef4444" : "#9ca3af";

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
            📊 Secțiune Transversală
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
            {stationName || "Stație"}
          </div>
        </div>
        {debit_mc_s && (
          <div style={{
            background: "rgba(255,255,255,0.15)",
            padding: "6px 12px",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <span style={{ color: trendColor, fontWeight: 900 }}>{trendArrow}</span>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
              {debit_mc_s?.toLocaleString()} m³/s
            </span>
          </div>
        )}
      </div>

      {/* Selector perioadă */}
      <div style={{
        display: "flex",
        gap: 6,
        padding: "10px 16px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        flexWrap: "wrap",
      }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPerioadaChange?.(p.key)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: perioada === p.key ? "2px solid #2563eb" : "1px solid #d1d5db",
              background: perioada === p.key ? "#eff6ff" : "#fff",
              color: perioada === p.key ? "#2563eb" : "#374151",
              fontSize: 12,
              fontWeight: perioada === p.key ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* SVG Secțiune transversală */}
      <div style={{ padding: "16px", position: "relative" }}>
        <svg viewBox="0 0 400 200" style={{ width: "100%", height: "auto" }}>
          {/* Definire gradient pentru apă */}
          <defs>
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={debitInfo.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={debitInfo.color} stopOpacity="0.6" />
            </linearGradient>
            
            {/* Pattern pentru valuri animate */}
            <pattern id="wavePattern" x="0" y="0" width="50" height="10" patternUnits="userSpaceOnUse">
              <path 
                d="M0 5 Q12.5 0 25 5 T50 5" 
                fill="none" 
                stroke="rgba(255,255,255,0.4)" 
                strokeWidth="2"
              >
                <animate 
                  attributeName="d" 
                  values="M0 5 Q12.5 0 25 5 T50 5;M0 5 Q12.5 10 25 5 T50 5;M0 5 Q12.5 0 25 5 T50 5" 
                  dur="2s" 
                  repeatCount="indefinite" 
                />
              </path>
            </pattern>
          </defs>

          {/* Axa Y (stânga) - Nivel */}
          <line x1="50" y1="20" x2="50" y2="180" stroke="#9ca3af" strokeWidth="2" />
          <text x="25" y="100" fill="#6b7280" fontSize="10" textAnchor="middle" transform="rotate(-90 25 100)">
            Nivel (cm)
          </text>
          
          {/* Notații axa Y */}
          {[0, 25, 50, 75, 100].map((p, i) => {
            const y = 180 - (p / 100) * 160;
            const val = cota_pericol_cm ? Math.round((p / 100) * cota_pericol_cm) : p * 10;
            return (
              <g key={i}>
                <line x1="45" y1={y} x2="50" y2={y} stroke="#9ca3af" strokeWidth="1" />
                <text x="40" y={y + 4} fill="#6b7280" fontSize="9" textAnchor="end">{val}</text>
              </g>
            );
          })}

          {/* Fundul albiei (profil U) */}
          <path
            d="M50 180 Q50 180 80 170 Q120 185 200 190 Q280 185 320 170 Q350 180 350 180 L350 180 L50 180 Z"
            fill="#8b7355"
            stroke="#6b5a47"
            strokeWidth="2"
          />

          {/* Linia cotă atenție */}
          <line 
            x1="50" 
            y1={180 - (cotaAtentiePercent / 100) * 160} 
            x2="350" 
            y2={180 - (cotaAtentiePercent / 100) * 160} 
            stroke="#eab308" 
            strokeWidth="1.5" 
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <text 
            x="355" 
            y={180 - (cotaAtentiePercent / 100) * 160 + 4} 
            fill="#eab308" 
            fontSize="8"
          >
            Atenție
          </text>

          {/* Linia cotă inundație */}
          <line 
            x1="50" 
            y1={180 - (cotaInundatiePercent / 100) * 160} 
            x2="350" 
            y2={180 - (cotaInundatiePercent / 100) * 160} 
            stroke="#f97316" 
            strokeWidth="1.5" 
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <text 
            x="355" 
            y={180 - (cotaInundatiePercent / 100) * 160 + 4} 
            fill="#f97316" 
            fontSize="8"
          >
            Inundație
          </text>

          {/* Linia cotă pericol */}
          <line 
            x1="50" 
            y1="20" 
            x2="350" 
            y2="20" 
            stroke="#dc2626" 
            strokeWidth="2" 
            strokeDasharray="5,5"
            opacity="0.7"
          />
          <text x="355" y="24" fill="#dc2626" fontSize="8">Pericol</text>

          {/* Apa cu valuri */}
          <clipPath id="riverBed">
            <path d="M50 180 Q50 180 80 170 Q120 185 200 190 Q280 185 320 170 Q350 180 350 180 L350 20 L50 20 Z" />
          </clipPath>
          
          <g clipPath="url(#riverBed)">
            {/* Apa */}
            <rect
              x="50"
              y={180 - (fillPercent / 100) * 160}
              width="300"
              height={(fillPercent / 100) * 160}
              fill="url(#waterGradient)"
            />
            
            {/* Suprafața valurită */}
            <rect
              x="50"
              y={180 - (fillPercent / 100) * 160 - 5}
              width="300"
              height="10"
              fill="url(#wavePattern)"
            />
          </g>

          {/* Linia nivelului actual */}
          <line 
            x1="50" 
            y1={180 - (fillPercent / 100) * 160} 
            x2="350" 
            y2={180 - (fillPercent / 100) * 160} 
            stroke="#fff" 
            strokeWidth="2"
          />

          {/* Axa X (jos) - Lățime */}
          <line x1="50" y1="185" x2="350" y2="185" stroke="#9ca3af" strokeWidth="1" />
          <text x="200" y="198" fill="#6b7280" fontSize="10" textAnchor="middle">
            Lățime secțiune
          </text>
        </svg>

        {/* Legendă */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 12,
          padding: "10px 12px",
          background: "#f9fafb",
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: debitInfo.color,
            }} />
            <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
              {debitInfo.emoji} {debitInfo.label}
            </span>
          </div>
          
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Nivel: <strong style={{ color: "#111827" }}>{nivel_cm || "—"} cm</strong>
          </div>
        </div>

        {/* Info cote */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginTop: 10,
        }}>
          <div style={{ textAlign: "center", padding: "8px", background: "#fef9c3", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "#a16207", fontWeight: 600 }}>ATENȚIE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#854d0e" }}>{cota_atentie_cm || "—"} cm</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px", background: "#ffedd5", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "#c2410c", fontWeight: 600 }}>INUNDAȚIE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#9a3412" }}>{cota_inundatie_cm || "—"} cm</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px", background: "#fee2e2", borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>PERICOL</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>{cota_pericol_cm || "—"} cm</div>
          </div>
        </div>
      </div>
    </div>
  );
}
