"use client";

import React, { useState, useMemo } from "react";

// ===== CALCUL RATING ZI =====
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

function getMoonEmoji(phase) {
  if (phase < 1.85) return "🌑";
  if (phase < 7.38) return "🌒";
  if (phase < 11.07) return "🌓";
  if (phase < 14.77) return "🌕";
  if (phase < 18.46) return "🌖";
  if (phase < 22.15) return "🌗";
  if (phase < 25.84) return "🌘";
  return "🌑";
}

function calculateDayRating(date) {
  const phase = getMoonPhase(date);
  const dayOfWeek = date.getDay();
  
  // Rating bazat pe faza lunii (1-5)
  let rating = 3;
  
  // Lună nouă și lună plină = rating maxim
  if (phase < 2 || (phase > 13 && phase < 16)) {
    rating = 5;
  } else if (phase < 4 || phase > 25 || (phase > 11 && phase < 18)) {
    rating = 4;
  } else if (phase > 5 && phase < 10) {
    rating = 2;
  }
  
  // Weekend bonus
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    rating = Math.min(5, rating + 0.5);
  }
  
  return {
    rating: Math.round(rating),
    moonPhase: phase,
    moonEmoji: getMoonEmoji(phase),
  };
}

function getRatingColor(rating) {
  if (rating >= 5) return { bg: "#10b981", text: "white" };
  if (rating >= 4) return { bg: "#22c55e", text: "white" };
  if (rating >= 3) return { bg: "#84cc16", text: "white" };
  if (rating >= 2) return { bg: "#f59e0b", text: "white" };
  return { bg: "#ef4444", text: "white" };
}

// ===== COMPONENTE =====
function CalendarDay({ date, dayData, isToday, isSelected, isCurrentMonth, onClick }) {
  const colors = getRatingColor(dayData.rating);
  const dayNum = date.getDate();
  
  if (!isCurrentMonth) {
    return (
      <div style={{
        aspectRatio: "1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "#475569",
        background: "transparent",
      }}>
        {dayNum}
      </div>
    );
  }
  
  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.2s",
        background: isSelected 
          ? colors.bg 
          : isToday 
            ? `${colors.bg}33`
            : `${colors.bg}22`,
        border: isToday 
          ? `2px solid ${colors.bg}` 
          : isSelected 
            ? `2px solid white`
            : "1px solid transparent",
        position: "relative",
      }}
    >
      <div style={{ 
        fontSize: 14, 
        fontWeight: isToday || isSelected ? 900 : 600, 
        color: isSelected ? "white" : "#e2e8f0",
      }}>
        {dayNum}
      </div>
      <div style={{ fontSize: 10, marginTop: 1 }}>
        {dayData.moonEmoji}
      </div>
      
      {/* Rating dots */}
      <div style={{ 
        display: "flex", 
        gap: 2, 
        marginTop: 2,
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: star <= dayData.rating 
                ? (isSelected ? "white" : colors.bg)
                : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DayDetail({ date, dayData, onClose }) {
  const colors = getRatingColor(dayData.rating);
  
  const formatDate = (d) => {
    return d.toLocaleDateString("ro-RO", { 
      weekday: "long", 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });
  };
  
  const getMoonPhaseName = (phase) => {
    if (phase < 1.85) return "Lună Nouă";
    if (phase < 7.38) return "Primul Pătrar";
    if (phase < 11.07) return "Semilună Crescătoare";
    if (phase < 14.77) return "Lună Plină";
    if (phase < 18.46) return "Semilună Descrescătoare";
    if (phase < 22.15) return "Ultimul Pătrar";
    if (phase < 25.84) return "Lună Îmbătrânită";
    return "Lună Nouă";
  };
  
  const getRecommendation = (rating) => {
    if (rating >= 5) return "Zi excepțională! Nu rata pescuitul!";
    if (rating >= 4) return "Condiții foarte bune pentru pescuit";
    if (rating >= 3) return "Zi potrivită, rezultate moderate";
    if (rating >= 2) return "Condiții sub medie";
    return "Nu e cea mai bună zi pentru pescuit";
  };
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.bg}22, ${colors.bg}11)`,
      border: `2px solid ${colors.bg}`,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>
            Detalii zi
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "white", marginTop: 4 }}>
            {formatDate(date)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 8,
            width: 28,
            height: 28,
            cursor: "pointer",
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 16, 
        marginTop: 16,
        padding: 12,
        background: "rgba(0,0,0,0.2)",
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 40 }}>{dayData.moonEmoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
            {getMoonPhaseName(dayData.moonPhase)}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Iluminare: {Math.round(dayData.moonPhase < 14.77 
              ? (dayData.moonPhase / 14.77) * 100 
              : ((29.53 - dayData.moonPhase) / 14.77) * 100)}%
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: colors.bg }}>{dayData.rating}</div>
          <div style={{ fontSize: 10, color: colors.bg }}>din 5</div>
        </div>
      </div>
      
      <div style={{
        marginTop: 12,
        padding: 12,
        background: "rgba(0,0,0,0.2)",
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>💡 RECOMANDARE</div>
        <div style={{ fontSize: 13, color: "white", fontWeight: 600 }}>
          {getRecommendation(dayData.rating)}
        </div>
      </div>
      
      {/* Rating stars */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: 4, 
        marginTop: 12,
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              fontSize: 24,
              color: star <= dayData.rating ? "#fbbf24" : "#4b5563",
            }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== MAIN WIDGET =====
export default function FishingCalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday of the week containing first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    startDate.setDate(startDate.getDate() - diff);
    
    // Generate 6 weeks (42 days)
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(current);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date().toDateString(),
        dayData: calculateDayRating(date),
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);
  
  const monthName = currentMonth.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };
  
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(null);
  };
  
  // Calculăm cele mai bune zile din lună
  const bestDays = useMemo(() => {
    return calendarData
      .filter(d => d.isCurrentMonth && d.dayData.rating >= 4)
      .sort((a, b) => b.dayData.rating - a.dayData.rating)
      .slice(0, 5);
  }, [calendarData]);
  
  return (
    <div style={{
      background: "linear-gradient(180deg, #0f172a, #1e293b)",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.1)",
      maxWidth: "100%",
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, #7c3aed, #6366f1)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>📅</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "white" }}>Calendar Pescuit</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              Cele mai bune zile pentru pescuit
            </div>
          </div>
        </div>
      </div>
      
      {/* Month Navigation */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        background: "rgba(0,0,0,0.2)",
      }}>
        <button
          onClick={prevMonth}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ← Înapoi
        </button>
        
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "white", textTransform: "capitalize" }}>
            {monthName}
          </div>
          <button
            onClick={goToToday}
            style={{
              background: "transparent",
              border: "none",
              color: "#a855f7",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Azi
          </button>
        </div>
        
        <button
          onClick={nextMonth}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Înainte →
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div style={{ padding: "12px 16px" }}>
        {/* Day headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 8,
        }}>
          {["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map((day) => (
            <div
              key={day}
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#64748b",
                padding: 4,
              }}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Days grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}>
          {calendarData.map((day, i) => (
            <CalendarDay
              key={i}
              date={day.date}
              dayData={day.dayData}
              isToday={day.isToday}
              isCurrentMonth={day.isCurrentMonth}
              isSelected={selectedDate?.toDateString() === day.date.toDateString()}
              onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
            />
          ))}
        </div>
      </div>
      
      {/* Selected day detail */}
      {selectedDate && (
        <div style={{ padding: "0 16px 16px" }}>
          <DayDetail
            date={selectedDate}
            dayData={calculateDayRating(selectedDate)}
            onClose={() => setSelectedDate(null)}
          />
        </div>
      )}
      
      {/* Best days this month */}
      {!selectedDate && bestDays.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ 
            fontSize: 12, 
            color: "#64748b", 
            fontWeight: 700, 
            marginBottom: 10,
            textTransform: "uppercase",
          }}>
            ⭐ Cele mai bune zile în {currentMonth.toLocaleDateString("ro-RO", { month: "long" })}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bestDays.map((day, i) => {
              const colors = getRatingColor(day.dayData.rating);
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day.date)}
                  style={{
                    padding: "8px 12px",
                    background: `${colors.bg}22`,
                    border: `1px solid ${colors.bg}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{day.dayData.moonEmoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                    {day.date.getDate()}
                  </span>
                  <span style={{ fontSize: 11, color: colors.bg }}>
                    {"★".repeat(day.dayData.rating)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div style={{
        padding: "12px 20px",
        background: "rgba(0,0,0,0.3)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          {[
            { rating: 5, label: "Excepțional" },
            { rating: 4, label: "Foarte bun" },
            { rating: 3, label: "Bun" },
            { rating: 2, label: "Moderat" },
            { rating: 1, label: "Slab" },
          ].map((item) => {
            const colors = getRatingColor(item.rating);
            return (
              <div key={item.rating} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: colors.bg,
                }} />
                <span style={{ fontSize: 10, color: "#94a3b8" }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
