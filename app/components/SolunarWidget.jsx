"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";

// ===== SOLUNAR CALCULATIONS =====
function getMoonPhase(date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (month < 3) {
    year--;
    month += 12;
  }
  
  const c = Math.floor(year / 100);
  const e = Math.floor(c / 4);
  const b = 2 - c + e;
  const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
  
  const daysSinceNew = (jd - 2451549.5) % 29.53059;
  return daysSinceNew < 0 ? daysSinceNew + 29.53059 : daysSinceNew;
}

function getMoonPhaseName(phase) {
  if (phase < 1.85) return { name: "Lună Nouă", emoji: "🌑", quality: 5 };
  if (phase < 7.38) return { name: "Primul Pătrar", emoji: "🌒", quality: 3 };
  if (phase < 11.07) return { name: "Semilună Cresc.", emoji: "🌓", quality: 4 };
  if (phase < 14.77) return { name: "Lună Plină", emoji: "🌕", quality: 5 };
  if (phase < 18.46) return { name: "Semilună Desc.", emoji: "🌖", quality: 4 };
  if (phase < 22.15) return { name: "Ultimul Pătrar", emoji: "🌗", quality: 3 };
  if (phase < 25.84) return { name: "Lună Îmbătrânită", emoji: "🌘", quality: 2 };
  return { name: "Lună Nouă", emoji: "🌑", quality: 5 };
}

function getMoonIllumination(phase) {
  const normalized = phase / 29.53059;
  return normalized <= 0.5 
    ? Math.round(normalized * 2 * 100) 
    : Math.round((1 - (normalized - 0.5) * 2) * 100);
}

function getSunTimes(date, lat, lng) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const B = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const decl = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  
  const latRad = lat * Math.PI / 180;
  const declRad = decl * Math.PI / 180;
  const cosH = -Math.tan(latRad) * Math.tan(declRad);
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * 180 / Math.PI;
  
  const lngCorrection = (lng - 30) / 15; // UTC+2
  
  return {
    sunrise: Math.max(0, Math.min(24, 12 - H / 15 - EoT / 60 - lngCorrection)),
    sunset: Math.max(0, Math.min(24, 12 + H / 15 - EoT / 60 - lngCorrection)),
  };
}

function getMoonTimes(phase) {
  const phaseRatio = phase / 29.53059;
  const baseRise = 6 + phaseRatio * 12;
  return { moonrise: baseRise % 24, moonset: (baseRise + 12) % 24 };
}

function calculateSolunarPeriods(date, lat, lng) {
  const phase = getMoonPhase(date);
  const phaseInfo = getMoonPhaseName(phase);
  const illumination = getMoonIllumination(phase);
  const sunTimes = getSunTimes(date, lat, lng);
  const moonTimes = getMoonTimes(phase);
  
  const majorPeriod1Start = (moonTimes.moonrise + 6) % 24;
  const majorPeriod2Start = (majorPeriod1Start + 12) % 24;
  
  let dayRating = phaseInfo.quality;
  if (Math.abs(majorPeriod1Start - sunTimes.sunrise) < 2 || Math.abs(majorPeriod1Start - sunTimes.sunset) < 2) {
    dayRating = Math.min(5, dayRating + 1);
  }
  
  return {
    date, phase, phaseInfo, illumination, sunTimes, moonTimes,
    majorPeriods: [
      { start: majorPeriod1Start, duration: 2 },
      { start: majorPeriod2Start, duration: 2 },
    ],
    minorPeriods: [
      { start: moonTimes.moonrise, duration: 1 },
      { start: moonTimes.moonset, duration: 1 },
    ],
    dayRating,
  };
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatFullDate(date) {
  return date.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ===== COMPONENTS =====
function StarRating({ rating, size = 12 }) {
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ color: star <= rating ? "#fbbf24" : "#4b5563", fontSize: size }}>★</span>
      ))}
    </div>
  );
}

function MoonPhaseVisual({ phase, size = 60 }) {
  const illumination = getMoonIllumination(phase);
  const isWaxing = phase < 14.77;
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(90deg, 
        ${isWaxing ? '#1e293b' : '#fef3c7'} 0%, 
        ${isWaxing ? '#1e293b' : '#fef3c7'} ${50 - illumination/2}%, 
        ${isWaxing ? '#fef3c7' : '#1e293b'} ${50 + illumination/2}%, 
        ${isWaxing ? '#fef3c7' : '#1e293b'} 100%)`,
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      border: "2px solid #475569",
    }} />
  );
}

function ActivityTimeline({ solunar }) {
  const isInPeriod = (hour, periods) => periods.some(p => {
    const end = (p.start + p.duration) % 24;
    return p.start <= end ? (hour >= p.start && hour < end) : (hour >= p.start || hour < end);
  });
  
  const isMajor = (h) => isInPeriod(h, solunar.majorPeriods);
  const isMinor = (h) => isInPeriod(h, solunar.minorPeriods);
  const isDaylight = (h) => h >= solunar.sunTimes.sunrise && h <= solunar.sunTimes.sunset;
  
  return (
    <div style={{ marginTop: 16 }}>
      {/* Scală ore - sus */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        padding: "0 2px",
        marginBottom: 6,
      }}>
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <span key={h} style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{h}</span>
        ))}
      </div>
      
      {/* Bară grafic */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(24, 1fr)",
        height: 32,
        borderRadius: 8,
        overflow: "hidden",
        border: "2px solid #334155",
      }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            title={`${h}:00 - ${h+1}:00`}
            style={{
              background: isMajor(h) 
                ? "#10b981"  /* Verde smarald - MAJOR */
                : isMinor(h) 
                  ? "#f59e0b"  /* Portocaliu/Auriu - MINOR */
                  : isDaylight(h) 
                    ? "#7dd3fc"  /* Albastru deschis - ZI */
                    : "#1e293b", /* Albastru foarte închis - NOAPTE */
              borderRight: h < 23 ? "1px solid rgba(0,0,0,0.3)" : "none",
            }}
          />
        ))}
      </div>
      
      {/* Legendă cu culori distincte */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#10b981" }} />
          <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Major</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#f59e0b" }} />
          <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Minor</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#7dd3fc" }} />
          <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Zi</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#1e293b", border: "2px solid #475569" }} />
          <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Noapte</span>
        </div>
      </div>
    </div>
  );
}

function CompactTimeline({ solunar }) {
  const isInPeriod = (h, periods) => periods.some(p => {
    const end = (p.start + p.duration) % 24;
    return p.start <= end ? (h >= p.start && h < end) : (h >= p.start || h < end);
  });
  
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(24, 1fr)",
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      marginTop: 4,
    }}>
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} style={{
          background: isInPeriod(h, solunar.majorPeriods) ? "#10b981"  /* Verde - MAJOR */
            : isInPeriod(h, solunar.minorPeriods) ? "#f59e0b"  /* Portocaliu - MINOR */
            : h >= solunar.sunTimes.sunrise && h <= solunar.sunTimes.sunset ? "#7dd3fc"  /* Albastru deschis - ZI */
            : "#334155",  /* Închis - NOAPTE */
        }} />
      ))}
    </div>
  );
}

function DayCard({ solunar, isSelected, onClick, isToday }) {
  const dayName = solunar.date.toLocaleDateString("ro-RO", { weekday: "short" });
  const dayNum = solunar.date.getDate();
  
  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 4px",
        borderRadius: 10,
        background: isSelected 
          ? "linear-gradient(135deg, #7c3aed, #a855f7)" 
          : isToday ? "rgba(168, 85, 247, 0.15)" : "rgba(255,255,255,0.03)",
        border: isSelected ? "2px solid #c084fc" : isToday ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9, color: isSelected ? "white" : "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>
        {dayName}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: isSelected ? "white" : "#e2e8f0", margin: "2px 0" }}>
        {dayNum}
      </div>
      <div style={{ fontSize: 14 }}>{solunar.phaseInfo.emoji}</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
        <StarRating rating={solunar.dayRating} size={8} />
      </div>
      <CompactTimeline solunar={solunar} />
    </div>
  );
}

function DetailPopup({ solunar, onClose }) {
  // Auto-close după 5 secunde
  useEffect(() => {
    if (!solunar) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [solunar, onClose]);
  
  if (!solunar) return null;
  
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(8px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div 
        style={{
          background: "linear-gradient(180deg, #0f172a, #1e293b)",
          borderRadius: 20,
          padding: 20,
          maxWidth: 380,
          width: "100%",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header cu progres auto-close */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>
              {formatFullDate(solunar.date)}
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#9ca3af",
            }}>✕</button>
          </div>
          {/* Progress bar auto-close */}
          <div style={{ height: 3, background: "#334155", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "#a855f7",
              animation: "shrink 5s linear forwards",
            }} />
          </div>
          <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
        </div>
        
        {/* Luna */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: 14, background: "rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 14,
        }}>
          <MoonPhaseVisual phase={solunar.phase} size={65} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{solunar.phaseInfo.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Iluminare: {solunar.illumination}%</div>
            <div style={{ marginTop: 6 }}><StarRating rating={solunar.dayRating} size={14} /></div>
          </div>
        </div>
        
        {/* Soare & Lună */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ padding: 12, background: "rgba(251, 191, 36, 0.1)", borderRadius: 10, border: "1px solid rgba(251, 191, 36, 0.3)" }}>
            <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700, marginBottom: 6 }}>☀️ SOARE</div>
            <div style={{ fontSize: 12, color: "#e2e8f0", display: "flex", justifyContent: "space-between" }}>
              <span>Răsărit</span><span style={{ fontWeight: 700 }}>{formatTime(solunar.sunTimes.sunrise)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#e2e8f0", display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span>Apus</span><span style={{ fontWeight: 700 }}>{formatTime(solunar.sunTimes.sunset)}</span>
            </div>
          </div>
          <div style={{ padding: 12, background: "rgba(148, 163, 184, 0.1)", borderRadius: 10, border: "1px solid rgba(148, 163, 184, 0.3)" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>🌙 LUNĂ</div>
            <div style={{ fontSize: 12, color: "#e2e8f0", display: "flex", justifyContent: "space-between" }}>
              <span>Răsărit</span><span style={{ fontWeight: 700 }}>{formatTime(solunar.moonTimes.moonrise)}</span>
            </div>
            <div style={{ fontSize: 12, color: "#e2e8f0", display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span>Apus</span><span style={{ fontWeight: 700 }}>{formatTime(solunar.moonTimes.moonset)}</span>
            </div>
          </div>
        </div>
        
        {/* Perioade pescuit */}
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>🎣 PERIOADE OPTIME</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {solunar.majorPeriods.map((p, i) => (
            <div key={`maj-${i}`} style={{ 
              padding: 10, background: "rgba(34, 197, 94, 0.15)", borderRadius: 8, 
              border: "1px solid rgba(34, 197, 94, 0.4)" 
            }}>
              <div style={{ fontSize: 9, color: "#22c55e", fontWeight: 800 }}>MAJOR {i + 1}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>
                {formatTime(p.start)} - {formatTime((p.start + p.duration) % 24)}
              </div>
            </div>
          ))}
          {solunar.minorPeriods.map((p, i) => (
            <div key={`min-${i}`} style={{ 
              padding: 10, background: "rgba(132, 204, 22, 0.15)", borderRadius: 8, 
              border: "1px solid rgba(132, 204, 22, 0.4)" 
            }}>
              <div style={{ fontSize: 9, color: "#84cc16", fontWeight: 800 }}>MINOR {i + 1}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>
                {formatTime(p.start)} - {formatTime((p.start + p.duration) % 24)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN WIDGET =====
export default function SolunarWidget({ lat, lng, stationName, stations = [], riverStations = [], onStationChange }) {
  const [period, setPeriod] = useState(7);
  const [selectedDay, setSelectedDay] = useState(null);
  
  const solunarData = useMemo(() => {
    if (!lat || !lng) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: period }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      return calculateSolunarPeriods(date, lat, lng);
    });
  }, [lat, lng, period]);
  
  const todaySolunar = solunarData[0];
  const handleDayClick = useCallback((s) => setSelectedDay(s), []);
  
  // Combină stațiile pentru dropdown
  const allStations = useMemo(() => {
    const dunare = (stations || []).map(s => ({ name: s.name || s.localitatea, type: 'dunare' }));
    const rivers = (riverStations || []).map(s => ({ name: s.name, type: 'river', river: s.river }));
    return { dunare, rivers };
  }, [stations, riverStations]);
  
  if (!lat || !lng) {
    return (
      <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, color: "#94a3b8", textAlign: "center" }}>
        Coordonate lipsă pentru calculul solunar
      </div>
    );
  }
  
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
        padding: "14px 18px",
        background: "linear-gradient(135deg, #0c4a6e, #0369a1, #0284c7)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        {/* Rând 1: Titlu și Toggle-uri perioadă */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>🎣</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "white" }}>Solunar</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{lat?.toFixed(2)}°N, {lng?.toFixed(2)}°E</div>
            </div>
          </div>
          
          {/* Toggle-uri VIOLET */}
          <div style={{ display: "flex", gap: 6 }}>
            {[{ d: 3, l: "3 zile" }, { d: 7, l: "7 zile" }, { d: 30, l: "30 zile" }].map((p) => (
              <button
                key={p.d}
                onClick={() => setPeriod(p.d)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: period === p.d ? "2px solid #a855f7" : "1px solid rgba(255,255,255,0.2)",
                  background: period === p.d ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "transparent",
                  color: period === p.d ? "white" : "#94a3b8",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
        
        {/* Rând 2: Selector stație */}
        {onStationChange && (allStations.dunare.length > 0 || allStations.rivers.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>📍 Stație:</span>
            <select
              value={stationName}
              onChange={(e) => onStationChange(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              {allStations.dunare.length > 0 && (
                <optgroup label="🌊 Dunăre" style={{ background: "#1e293b" }}>
                  {allStations.dunare.map((s) => (
                    <option key={s.name} value={s.name} style={{ background: "#1e293b", color: "white" }}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {allStations.rivers.length > 0 && (
                <optgroup label="💧 Râuri interioare" style={{ background: "#1e293b" }}>
                  {allStations.rivers.map((s) => (
                    <option key={s.name} value={s.name} style={{ background: "#1e293b", color: "white" }}>
                      {s.name} ({s.river})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}
      </div>
      
      {/* Today's Overview */}
      {todaySolunar && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16, padding: 14,
            background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
            flexWrap: "wrap",
          }}>
            <MoonPhaseVisual phase={todaySolunar.phase} size={70} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                AZI • {todaySolunar.date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "white", marginTop: 2 }}>{todaySolunar.phaseInfo.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Iluminare {todaySolunar.illumination}%</div>
              <div style={{ marginTop: 6 }}><StarRating rating={todaySolunar.dayRating} size={14} /></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>MAJOR</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{formatTime(todaySolunar.majorPeriods[0].start)}</div>
              <div style={{ fontSize: 10, color: "#84cc16", fontWeight: 700, marginTop: 6 }}>MINOR</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{formatTime(todaySolunar.minorPeriods[0].start)}</div>
            </div>
          </div>
          <ActivityTimeline solunar={todaySolunar} />
        </div>
      )}
      
      {/* Grid zile - responsive */}
      <div style={{ padding: "0 18px 18px", overflow: "hidden" }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
          Următoarele {period} zile
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: period <= 7 
            ? `repeat(${period}, 1fr)` 
            : "repeat(auto-fill, minmax(55px, 1fr))",
          gap: 6,
          maxWidth: "100%",
        }}>
          {solunarData.map((s, i) => (
            <DayCard
              key={i}
              solunar={s}
              isSelected={selectedDay === s}
              isToday={i === 0}
              onClick={() => handleDayClick(s)}
            />
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        padding: "10px 18px",
        background: "rgba(0,0,0,0.3)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 10, color: "#64748b", textAlign: "center",
      }}>
        💡 Click pe o zi pentru detalii • Perioadele majore = activitate maximă pești
      </div>
      
      {/* Popup */}
      {selectedDay && <DetailPopup solunar={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
}
