"use client";

import React, { useMemo } from "react";

// ===== CALCUL CONFORT =====
function calculateComfortScore({ waterTemp, airTemp, wind, humidity, pressure, precipitation, solunarRating, moonPhase }) {
  let score = 0;
  let factors = [];
  
  // Temperatura apei (max 20 puncte)
  if (waterTemp !== null && waterTemp !== undefined && !isNaN(waterTemp)) {
    if (waterTemp >= 15 && waterTemp <= 24) {
      score += 20;
      factors.push({ name: "Temp. apă", value: `${waterTemp}°C`, score: 20, max: 20, good: true });
    } else if (waterTemp >= 10 && waterTemp <= 28) {
      score += 12;
      factors.push({ name: "Temp. apă", value: `${waterTemp}°C`, score: 12, max: 20, good: false });
    } else {
      score += 5;
      factors.push({ name: "Temp. apă", value: `${waterTemp}°C`, score: 5, max: 20, good: false });
    }
  } else {
    factors.push({ name: "Temp. apă", value: "N/A", score: 10, max: 20, good: false });
    score += 10;
  }
  
  // Temperatura aerului (max 15 puncte)
  if (airTemp !== null && airTemp !== undefined && !isNaN(airTemp)) {
    if (airTemp >= 12 && airTemp <= 25) {
      score += 15;
      factors.push({ name: "Temp. aer", value: `${Math.round(airTemp)}°C`, score: 15, max: 15, good: true });
    } else if (airTemp >= 5 && airTemp <= 30) {
      score += 10;
      factors.push({ name: "Temp. aer", value: `${Math.round(airTemp)}°C`, score: 10, max: 15, good: false });
    } else {
      score += 3;
      factors.push({ name: "Temp. aer", value: `${Math.round(airTemp)}°C`, score: 3, max: 15, good: false });
    }
  } else {
    factors.push({ name: "Temp. aer", value: "N/A", score: 7, max: 15, good: false });
    score += 7;
  }
  
  // Vânt (max 15 puncte)
  if (wind !== null && wind !== undefined && !isNaN(wind)) {
    if (wind <= 10) {
      score += 15;
      factors.push({ name: "Vânt", value: `${Math.round(wind)} km/h`, score: 15, max: 15, good: true });
    } else if (wind <= 20) {
      score += 10;
      factors.push({ name: "Vânt", value: `${Math.round(wind)} km/h`, score: 10, max: 15, good: false });
    } else if (wind <= 35) {
      score += 5;
      factors.push({ name: "Vânt", value: `${Math.round(wind)} km/h`, score: 5, max: 15, good: false });
    } else {
      factors.push({ name: "Vânt", value: `${Math.round(wind)} km/h`, score: 0, max: 15, good: false });
    }
  } else {
    factors.push({ name: "Vânt", value: "N/A", score: 7, max: 15, good: false });
    score += 7;
  }
  
  // Precipitații (max 15 puncte)
  const precip = precipitation ?? 0;
  if (precip === 0) {
    score += 15;
    factors.push({ name: "Ploaie", value: "Fără", score: 15, max: 15, good: true });
  } else if (precip <= 2) {
    score += 10;
    factors.push({ name: "Ploaie", value: `${precip}mm`, score: 10, max: 15, good: false });
  } else if (precip <= 5) {
    score += 5;
    factors.push({ name: "Ploaie", value: `${precip}mm`, score: 5, max: 15, good: false });
  } else {
    factors.push({ name: "Ploaie", value: `${precip}mm`, score: 0, max: 15, good: false });
  }
  
  // Presiune atmosferică (max 15 puncte)
  if (pressure !== null && pressure !== undefined && !isNaN(pressure)) {
    if (pressure >= 1013 && pressure <= 1025) {
      score += 15;
      factors.push({ name: "Presiune", value: `${Math.round(pressure)} hPa`, score: 15, max: 15, good: true });
    } else if (pressure >= 1005 && pressure <= 1030) {
      score += 10;
      factors.push({ name: "Presiune", value: `${Math.round(pressure)} hPa`, score: 10, max: 15, good: false });
    } else {
      score += 5;
      factors.push({ name: "Presiune", value: `${Math.round(pressure)} hPa`, score: 5, max: 15, good: false });
    }
  } else {
    factors.push({ name: "Presiune", value: "N/A", score: 7, max: 15, good: false });
    score += 7;
  }
  
  // Solunar (max 20 puncte)
  const solRating = solunarRating ?? 3;
  const solunarScore = solRating * 4; // 1-5 stars -> 4-20 points
  score += solunarScore;
  factors.push({ 
    name: "Solunar", 
    value: "⭐".repeat(solRating), 
    score: solunarScore, 
    max: 20, 
    good: solRating >= 4 
  });
  
  return { score: Math.min(100, score), factors };
}

function getComfortLevel(score) {
  if (score >= 85) return { 
    level: "Excepțional", 
    color: "#10b981", 
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    emoji: "🏆",
    message: "Condiții perfecte! Nu rata această zi!",
    recommendation: "Îmbracă-te confortabil, ia tot echipamentul"
  };
  if (score >= 70) return { 
    level: "Foarte Bun", 
    color: "#22c55e", 
    gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
    emoji: "🎯",
    message: "Zi excelentă pentru pescuit",
    recommendation: "Condiții optime, merită drumul"
  };
  if (score >= 55) return { 
    level: "Bun", 
    color: "#84cc16", 
    gradient: "linear-gradient(135deg, #84cc16, #65a30d)",
    emoji: "👍",
    message: "Condiții favorabile",
    recommendation: "Ia o jachetă ușoară pentru orice eventualitate"
  };
  if (score >= 40) return { 
    level: "Acceptabil", 
    color: "#f59e0b", 
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    emoji: "😐",
    message: "Condiții moderate",
    recommendation: "Verifică prognoza înainte de plecare"
  };
  if (score >= 25) return { 
    level: "Dificil", 
    color: "#f97316", 
    gradient: "linear-gradient(135deg, #f97316, #ea580c)",
    emoji: "⚠️",
    message: "Condiții nefavorabile",
    recommendation: "Îmbracă-te gros, ia echipament de ploaie"
  };
  return { 
    level: "Nerecomand", 
    color: "#ef4444", 
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    emoji: "❌",
    message: "Mai bine stai acasă",
    recommendation: "Așteaptă o zi mai bună"
  };
}

// ===== COMPONENTE =====
function GaugeChart({ score, size = 200 }) {
  const comfort = getComfortLevel(score);
  const angle = (score / 100) * 180; // 0-180 degrees
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Calculăm coordonatele pentru arcuri
  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle - 180) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };
  
  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };
  
  // Needle endpoint
  const needleAngle = angle - 180;
  const needleRad = needleAngle * Math.PI / 180;
  const needleLength = radius - 10;
  const needleX = centerX + needleLength * Math.cos(needleRad);
  const needleY = centerY + needleLength * Math.sin(needleRad);
  
  return (
    <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
      {/* Background arc */}
      <path
        d={describeArc(centerX, centerY, radius, 0, 180)}
        fill="none"
        stroke="#334155"
        strokeWidth="20"
        strokeLinecap="round"
      />
      
      {/* Colored segments */}
      <path d={describeArc(centerX, centerY, radius, 0, 30)} fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
      <path d={describeArc(centerX, centerY, radius, 30, 60)} fill="none" stroke="#f97316" strokeWidth="20" />
      <path d={describeArc(centerX, centerY, radius, 60, 90)} fill="none" stroke="#f59e0b" strokeWidth="20" />
      <path d={describeArc(centerX, centerY, radius, 90, 120)} fill="none" stroke="#84cc16" strokeWidth="20" />
      <path d={describeArc(centerX, centerY, radius, 120, 150)} fill="none" stroke="#22c55e" strokeWidth="20" />
      <path d={describeArc(centerX, centerY, radius, 150, 180)} fill="none" stroke="#10b981" strokeWidth="20" strokeLinecap="round" />
      
      {/* Needle */}
      <line
        x1={centerX}
        y1={centerY}
        x2={needleX}
        y2={needleY}
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        style={{ 
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          transition: "all 0.5s ease-out",
        }}
      />
      
      {/* Center circle */}
      <circle cx={centerX} cy={centerY} r="12" fill={comfort.color} stroke="white" strokeWidth="3" />
      
      {/* Score text */}
      <text x={centerX} y={centerY + 45} textAnchor="middle" fill="white" fontSize="36" fontWeight="900">
        {score}
      </text>
      <text x={centerX} y={centerY + 62} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600">
        din 100
      </text>
    </svg>
  );
}

function FactorBar({ factor }) {
  const percentage = (factor.score / factor.max) * 100;
  
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{factor.name}</span>
        <span style={{ fontSize: 12, color: factor.good ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
          {factor.value}
        </span>
      </div>
      <div style={{
        height: 6,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 3,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${percentage}%`,
          background: factor.good 
            ? "linear-gradient(90deg, #10b981, #22c55e)" 
            : "linear-gradient(90deg, #f59e0b, #f97316)",
          borderRadius: 3,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

// ===== MAIN WIDGET =====
export default function FishingComfortWidget({ waterTemp, weather, solunarRating }) {
  const comfortData = useMemo(() => {
    return calculateComfortScore({
      waterTemp,
      airTemp: weather?.temp,
      wind: weather?.wind,
      humidity: weather?.humidity,
      pressure: weather?.pressure,
      precipitation: weather?.precipitation || 0,
      solunarRating,
      moonPhase: null,
    });
  }, [waterTemp, weather, solunarRating]);
  
  const comfort = getComfortLevel(comfortData.score);
  
  return (
    <div style={{
      background: "linear-gradient(180deg, #0f172a, #1e293b)",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.1)",
      maxWidth: "100%",
      boxSizing: "border-box",
    }}>
      {/* Header - ALBASTRU */}
      <div style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, #0c4a6e, #0369a1, #0284c7)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 32 }}>🎯</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>Confort Pescuit</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{comfort.message}</div>
            </div>
          </div>
          <div style={{
            padding: "8px 16px",
            background: comfort.color,
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 800,
            color: "white",
          }}>
            {comfort.level}
          </div>
        </div>
      </div>
      
      {/* Gauge */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        padding: "20px 20px 10px",
        background: "radial-gradient(circle at center, rgba(255,255,255,0.03), transparent)",
      }}>
        <GaugeChart score={comfortData.score} size={220} />
      </div>
      
      {/* Recommendation */}
      <div style={{
        margin: "0 20px 16px",
        padding: 14,
        background: `${comfort.color}15`,
        border: `1px solid ${comfort.color}33`,
        borderRadius: 12,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>💡 RECOMANDARE</div>
        <div style={{ fontSize: 14, color: "white", fontWeight: 600 }}>{comfort.recommendation}</div>
      </div>
      
      {/* Factors breakdown */}
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 12, textTransform: "uppercase" }}>
          📊 Detalii Factori
        </div>
        {comfortData.factors.map((factor, i) => (
          <FactorBar key={i} factor={factor} />
        ))}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: "12px 20px",
        background: "rgba(0,0,0,0.3)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 10,
        color: "#64748b",
        textAlign: "center",
      }}>
        🎣 Scorul combină vremea, temperatura apei și condițiile solunar
      </div>
    </div>
  );
}
