"use client";

import React, { useMemo, useState } from "react";

// ===== DATE SPECII PEȘTI =====
const FISH_SPECIES = [
  { 
    id: "crap", 
    name: "Crap", 
    emoji: "🐟",
    color: "#f59e0b",
    tempOptim: { min: 18, max: 26 },
    presiuneOptim: { min: 1010, max: 1025 },
    preferaLuna: true,
    activeHours: [5, 6, 7, 8, 9, 18, 19, 20, 21],
    description: "Activ dimineața devreme și seara"
  },
  { 
    id: "salau", 
    name: "Șalău", 
    emoji: "🐠",
    color: "#3b82f6",
    tempOptim: { min: 12, max: 22 },
    presiuneOptim: { min: 1005, max: 1020 },
    preferaLuna: false,
    activeHours: [4, 5, 6, 19, 20, 21, 22, 23],
    description: "Prădător de amurg și noapte"
  },
  { 
    id: "somn", 
    name: "Somn", 
    emoji: "🐋",
    color: "#6366f1",
    tempOptim: { min: 20, max: 28 },
    presiuneOptim: { min: 1000, max: 1015 },
    preferaLuna: false,
    activeHours: [21, 22, 23, 0, 1, 2, 3, 4],
    description: "Activ noaptea, preferă ape calde"
  },
  { 
    id: "caras", 
    name: "Caras", 
    emoji: "🐡",
    color: "#10b981",
    tempOptim: { min: 15, max: 25 },
    presiuneOptim: { min: 1008, max: 1022 },
    preferaLuna: true,
    activeHours: [6, 7, 8, 9, 10, 16, 17, 18, 19],
    description: "Activ ziua, tolerant la condiții"
  },
  { 
    id: "biban", 
    name: "Biban", 
    emoji: "🎣",
    color: "#ef4444",
    tempOptim: { min: 14, max: 22 },
    presiuneOptim: { min: 1010, max: 1025 },
    preferaLuna: true,
    activeHours: [6, 7, 8, 9, 17, 18, 19],
    description: "Prădător activ dimineața"
  },
  { 
    id: "stiuca", 
    name: "Știucă", 
    emoji: "🦈",
    color: "#84cc16",
    tempOptim: { min: 10, max: 20 },
    presiuneOptim: { min: 1005, max: 1020 },
    preferaLuna: false,
    activeHours: [7, 8, 9, 10, 11, 15, 16, 17, 18],
    description: "Prădător de zi, preferă ape reci"
  },
];

// ===== CALCUL ACTIVITATE =====
function calculateFishActivity(fish, { waterTemp, pressure, moonPhase, hour, solunarMajor, solunarMinor }) {
  let score = 30; // Baza mai mică
  
  // Temperatura apei (max 35 puncte) - CEL MAI IMPORTANT FACTOR
  if (waterTemp !== null && waterTemp !== undefined && !isNaN(waterTemp)) {
    const tempMin = fish.tempOptim.min;
    const tempMax = fish.tempOptim.max;
    
    if (waterTemp >= tempMin && waterTemp <= tempMax) {
      // În intervalul optim - scor maxim
      score += 35;
    } else if (waterTemp >= tempMin - 5 && waterTemp <= tempMax + 5) {
      // Aproape de interval - scor parțial
      const distance = waterTemp < tempMin ? tempMin - waterTemp : waterTemp - tempMax;
      score += Math.max(0, 25 - distance * 5);
    } else {
      // Prea departe de interval - scor foarte mic
      const distance = waterTemp < tempMin ? tempMin - waterTemp : waterTemp - tempMax;
      score += Math.max(0, 10 - distance * 2);
    }
  } else {
    score += 15; // Default dacă nu avem temp
  }
  
  // Presiune atmosferică (max 15 puncte)
  if (pressure !== null && pressure !== undefined && !isNaN(pressure)) {
    const presMid = (fish.presiuneOptim.min + fish.presiuneOptim.max) / 2;
    const presRange = fish.presiuneOptim.max - fish.presiuneOptim.min;
    const presDiff = Math.abs(pressure - presMid);
    score += Math.max(0, 15 - (presDiff / presRange) * 15);
  } else {
    score += 7;
  }
  
  // Faza lunii (max 10 puncte)
  if (moonPhase !== null && moonPhase !== undefined) {
    const isFullOrNew = moonPhase < 2 || (moonPhase > 13 && moonPhase < 16);
    if (fish.preferaLuna && isFullOrNew) score += 10;
    else if (!fish.preferaLuna && !isFullOrNew) score += 8;
    else score += 4;
  } else {
    score += 5;
  }
  
  // Ora din zi (max 20 puncte)
  if (hour !== null && hour !== undefined) {
    if (fish.activeHours.includes(hour)) {
      score += 20;
    } else {
      // Verifică dacă e aproape de orele active
      const closest = fish.activeHours.reduce((a, b) => 
        Math.abs(b - hour) < Math.abs(a - hour) ? b : a
      );
      const diff = Math.abs(closest - hour);
      score += Math.max(0, 10 - diff * 2);
    }
  } else {
    score += 10;
  }
  
  // Solunar (max 10 puncte)
  if (solunarMajor) score += 10;
  else if (solunarMinor) score += 6;
  else score += 2;
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

function getActivityLevel(score) {
  if (score >= 80) return { level: "Excelent", color: "#10b981", emoji: "🔥" };
  if (score >= 65) return { level: "Foarte Bun", color: "#22c55e", emoji: "⭐" };
  if (score >= 50) return { level: "Bun", color: "#84cc16", emoji: "👍" };
  if (score >= 35) return { level: "Moderat", color: "#f59e0b", emoji: "😐" };
  if (score >= 20) return { level: "Slab", color: "#f97316", emoji: "👎" };
  return { level: "Foarte Slab", color: "#ef4444", emoji: "❌" };
}

// ===== COMPONENTE =====
function FishCard({ fish, score, isExpanded, onClick }) {
  const activity = getActivityLevel(score);
  
  return (
    <div
      onClick={onClick}
      style={{
        background: isExpanded 
          ? `linear-gradient(135deg, ${fish.color}22, ${fish.color}11)`
          : "rgba(255,255,255,0.03)",
        border: isExpanded ? `2px solid ${fish.color}` : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: isExpanded ? 16 : 12,
        cursor: "pointer",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${fish.color}33, ${fish.color}11)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}>
          {fish.emoji}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{fish.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{fish.description}</div>
        </div>
        
        <div style={{ textAlign: "right" }}>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 900, 
            color: activity.color,
            lineHeight: 1,
          }}>
            {score}%
          </div>
          <div style={{ 
            fontSize: 10, 
            color: activity.color, 
            fontWeight: 700,
            marginTop: 2,
          }}>
            {activity.emoji} {activity.level}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div style={{
        marginTop: 12,
        height: 8,
        background: "rgba(255,255,255,0.1)",
        borderRadius: 4,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${score}%`,
          background: `linear-gradient(90deg, ${fish.color}, ${activity.color})`,
          borderRadius: 4,
          transition: "width 0.5s ease",
        }} />
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ 
              background: "rgba(0,0,0,0.2)", 
              padding: 10, 
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>🌡️ TEMP. OPTIMĂ</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                {fish.tempOptim.min}° - {fish.tempOptim.max}°C
              </div>
            </div>
            <div style={{ 
              background: "rgba(0,0,0,0.2)", 
              padding: 10, 
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>⏰ ORE ACTIVE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                {fish.activeHours[0]}:00 - {fish.activeHours[fish.activeHours.length-1]}:00
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: 10,
            fontSize: 11, 
            color: "#94a3b8",
            background: "rgba(0,0,0,0.2)",
            padding: 10,
            borderRadius: 8,
          }}>
            <span style={{ color: fish.preferaLuna ? "#fbbf24" : "#64748b" }}>
              {fish.preferaLuna ? "🌕 Preferă lună plină/nouă" : "🌙 Preferă nopți fără lună"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TopFishBanner({ topFish, score }) {
  const activity = getActivityLevel(score);
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${topFish.color}33, ${topFish.color}11)`,
      border: `2px solid ${topFish.color}`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <div style={{
        width: 70,
        height: 70,
        borderRadius: 16,
        background: `linear-gradient(135deg, ${topFish.color}, ${topFish.color}88)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 40,
        boxShadow: `0 8px 24px ${topFish.color}44`,
      }}>
        {topFish.emoji}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, marginBottom: 4 }}>
          ⭐ CEA MAI BUNĂ ALEGERE AZI
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>
          {topFish.name}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
          {topFish.description}
        </div>
      </div>
      
      <div style={{
        textAlign: "center",
        padding: "12px 16px",
        background: "rgba(0,0,0,0.3)",
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: activity.color }}>
          {score}%
        </div>
        <div style={{ fontSize: 10, color: activity.color, fontWeight: 700 }}>
          {activity.level}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN WIDGET =====
export default function FishActivityWidget({ waterTemp, pressure, moonPhase, solunarData }) {
  const [expandedFish, setExpandedFish] = useState(null);
  
  const currentHour = new Date().getHours();
  
  // Calculăm dacă suntem în perioadă solunar
  const solunarStatus = useMemo(() => {
    if (!solunarData) return { major: false, minor: false };
    
    const isInPeriod = (hour, periods) => periods?.some(p => {
      const end = (p.start + p.duration) % 24;
      return p.start <= end ? (hour >= p.start && hour < end) : (hour >= p.start || hour < end);
    });
    
    return {
      major: isInPeriod(currentHour, solunarData.majorPeriods),
      minor: isInPeriod(currentHour, solunarData.minorPeriods),
    };
  }, [solunarData, currentHour]);
  
  // Calculăm scorul pentru fiecare specie
  const fishScores = useMemo(() => {
    return FISH_SPECIES.map(fish => ({
      fish,
      score: calculateFishActivity(fish, {
        waterTemp,
        pressure,
        moonPhase,
        hour: currentHour,
        solunarMajor: solunarStatus.major,
        solunarMinor: solunarStatus.minor,
      }),
    })).sort((a, b) => b.score - a.score);
  }, [waterTemp, pressure, moonPhase, currentHour, solunarStatus]);
  
  const topFish = fishScores[0];
  
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🐟</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>Activitate Pești</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              Bazat pe temperatură, presiune și solunar • {currentHour}:00
            </div>
          </div>
        </div>
        
        {/* Indicatori condiții */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {waterTemp !== null && (
            <div style={{
              padding: "4px 10px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 20,
              fontSize: 11,
              color: "#94a3b8",
            }}>
              🌡️ Apă: {waterTemp}°C
            </div>
          )}
          {pressure !== null && (
            <div style={{
              padding: "4px 10px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 20,
              fontSize: 11,
              color: "#94a3b8",
            }}>
              📊 {pressure} hPa
            </div>
          )}
          {solunarStatus.major && (
            <div style={{
              padding: "4px 10px",
              background: "rgba(16, 185, 129, 0.2)",
              borderRadius: 20,
              fontSize: 11,
              color: "#10b981",
              fontWeight: 700,
            }}>
              🎯 Perioadă MAJORĂ
            </div>
          )}
          {solunarStatus.minor && !solunarStatus.major && (
            <div style={{
              padding: "4px 10px",
              background: "rgba(245, 158, 11, 0.2)",
              borderRadius: 20,
              fontSize: 11,
              color: "#f59e0b",
              fontWeight: 700,
            }}>
              ⭐ Perioadă minoră
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: 16 }}>
        {/* Top Fish Banner */}
        <TopFishBanner topFish={topFish.fish} score={topFish.score} />
        
        {/* All Fish Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {fishScores.map(({ fish, score }) => (
            <FishCard
              key={fish.id}
              fish={fish}
              score={score}
              isExpanded={expandedFish === fish.id}
              onClick={() => setExpandedFish(expandedFish === fish.id ? null : fish.id)}
            />
          ))}
        </div>
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
        💡 Click pe o specie pentru detalii • Scorurile se actualizează în timp real
      </div>
    </div>
  );
}
