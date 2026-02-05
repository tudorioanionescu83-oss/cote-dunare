"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import StationPanel from "./components/StationPanel";
import TulceaFlowWidget from "./components/TulceaFlowWidget";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

// UTC-safe diff days (pentru validare minim 2 zile consecutive)
function diffDaysUTC(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return NaN;
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return (toUTC - fromUTC) / (1000 * 60 * 60 * 24);
}

export default function Page() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("Tulcea");

  const [latestByName, setLatestByName] = useState({});
  const [chartByStation, setChartByStation] = useState({});
  const [chartLoading, setChartLoading] = useState(false);

  const [periodDays, setPeriodDays] = useState(30);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // 1) Stații (cu coordonate) din /api/stations
  useEffect(() => {
    let cancelled = false;

    async function loadStations() {
      try {
        const res = await fetch("/api/stations", { cache: "no-store" });
        const j = await res.json();
        const list = j?.stations || [];
        if (!cancelled) {
          setStations(list);
          if (list.length && !list.some((s) => s.name === selectedStation)) {
            setSelectedStation(list[0].name);
          }
        }
      } catch (e) {
        // silent
      }
    }

    loadStations();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Latest (pt culori + carduri)
  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      try {
        const res = await fetch("/api/latest", { cache: "no-store" });
        const j = await res.json();
        if (!cancelled) setLatestByName(j.byName || {});
      } catch (e) {
        // silent
      }
    }

    loadLatest();
    const t = setInterval(loadLatest, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const onPeriodChange = useCallback((days) => {
    setUseCustomRange(false);
    setCustomFrom("");
    setCustomTo("");
    setPeriodDays(days);
  }, []);

  const onPeriodRangeChange = useCallback((from, to) => {
    const dd = diffDaysUTC(from, to);
    if (!(dd >= 1)) return false;
    setCustomFrom(from);
    setCustomTo(to);
    setUseCustomRange(true);
    setPeriodDays(null);
    return true;
  }, []);

  // 3) Chart
  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      if (!selectedStation) return;
      setChartLoading(true);

      try {
        let url = `/api/measurements?station=${encodeURIComponent(selectedStation)}`;

        if (useCustomRange && customFrom && customTo) {
          url += `&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
        } else {
          url += `&days=${encodeURIComponent(periodDays)}`;
        }

        url += `&_t=${Date.now()}`;

        const res = await fetch(url, { 
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const j = await res.json();

        if (!cancelled) {
          setChartByStation((prev) => ({
            ...prev,
            [selectedStation]: j.rows || j.series || [],
          }));
        }
      } catch (e) {
        console.error('Error loading chart:', e);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    loadChart();
    return () => { cancelled = true; };
  }, [selectedStation, periodDays, useCustomRange, customFrom, customTo]);

  const selectedStationObj = useMemo(
    () => stations.find((s) => s.name === selectedStation) || null,
    [stations, selectedStation]
  );

  return (
    <div className="page-layout">
      {/* ⭐ CSS GLOBAL - Layout mobil nou + ANIMAȚII SPECTACULOASE */}
      <style jsx global>{`
        /* ===== KEYFRAMES ANIMATIONS ===== */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px rgba(255,255,255,0.3), 0 0 10px rgba(14,165,233,0.2); }
          50% { box-shadow: 0 0 15px rgba(255,255,255,0.5), 0 0 25px rgba(14,165,233,0.4); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes wave {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-2px) translateY(-2px); }
          50% { transform: translateX(0) translateY(-3px); }
          75% { transform: translateX(2px) translateY(-2px); }
          100% { transform: translateX(0) translateY(0); }
        }
        
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes icon-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes water-flow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        /* ===== DESKTOP - rămâne la fel ===== */
        .tulcea-widget-desktop {
          display: block;
        }
        
        .mobile-header {
          display: none;
        }
        
        .mobile-search {
          display: none;
        }
        
        .map-container-mobile {
          position: relative;
        }
        
        .legend-overlay-mobile {
          display: none;
        }

        /* ⭐ HEADER HERO - DESIGN NOU CU ANIMAȚII */
        .hero-header {
          background: linear-gradient(135deg, #0c4a6e 0%, #0369a1 30%, #0284c7 60%, #0ea5e9 100%);
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(12, 74, 110, 0.4),
                      0 0 60px rgba(14, 165, 233, 0.15);
        }
        
        .hero-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
          border-radius: 50%;
          animation: float 6s ease-in-out infinite;
        }
        
        .hero-header::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
          animation: float 8s ease-in-out infinite reverse;
        }
        
        /* Water wave effect overlay */
        .hero-header .water-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255,255,255,0.03) 50%,
            transparent 70%
          );
          background-size: 200% 200%;
          animation: water-flow 3s linear infinite;
          pointer-events: none;
        }
        
        .hero-content {
          position: relative;
          z-index: 1;
        }
        
        /* ⭐ TITLU CENTRAT + UPPERCASE */
        .hero-title-main {
          font-size: 24px;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin: 0;
          text-align: center;
          text-shadow: 0 2px 15px rgba(0,0,0,0.3),
                       0 0 30px rgba(255,255,255,0.2);
          background: linear-gradient(90deg, #fff, #e0f2fe, #fff);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        
        .hero-title-sub {
          font-size: 18px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin: 6px 0 0 0;
          letter-spacing: 2px;
          text-align: center;
          text-transform: uppercase;
          text-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        /* ⭐ FEATURES GRID - ALINIATE FRUMOS */
        .hero-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 20px;
        }
        
        .hero-feature {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(10px);
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: default;
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.5s ease forwards;
          opacity: 0;
        }
        
        .hero-feature:nth-child(1) { animation-delay: 0.1s; }
        .hero-feature:nth-child(2) { animation-delay: 0.2s; }
        .hero-feature:nth-child(3) { animation-delay: 0.3s; }
        .hero-feature:nth-child(4) { animation-delay: 0.4s; }
        .hero-feature:nth-child(5) { animation-delay: 0.5s; }
        .hero-feature:nth-child(6) { animation-delay: 0.6s; }
        
        .hero-feature::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.4s ease, height 0.4s ease;
        }
        
        .hero-feature:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .hero-feature:hover::before {
          width: 200px;
          height: 200px;
        }
        
        .hero-feature:hover .hero-feature-icon {
          animation: icon-bounce 0.5s ease;
        }
        
        .hero-feature-icon {
          font-size: 16px;
          transition: transform 0.3s ease;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        
        .hero-feature-text {
          position: relative;
          z-index: 1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===== MOBILE STYLES ===== */
        @media (max-width: 768px) {
          /* Ascunde sidebar-ul complet pe mobil */
          .page-sidebar {
            display: none !important;
          }
          
          /* Afișează header-ul mobil */
          .mobile-header {
            display: block;
            padding: 12px;
            background: #fff;
          }
          
          .hero-header {
            padding: 20px;
            border-radius: 16px;
            margin: 0;
          }
          
          .hero-title-main {
            font-size: 16px;
            letter-spacing: 1.5px;
          }
          
          .hero-title-sub {
            font-size: 14px;
            letter-spacing: 1px;
          }
          
          .hero-features {
            gap: 8px;
            margin-top: 14px;
          }
          
          .hero-feature {
            padding: 8px 10px;
            font-size: 10px;
            border-radius: 12px;
          }
          
          .hero-feature-icon {
            font-size: 14px;
          }
          
          /* Container hartă cu legendă suprapusă */
          .map-container-mobile {
            position: relative;
          }
          
          /* Legenda suprapusă pe hartă - colț dreapta */
          .legend-overlay-mobile {
            display: block;
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: rgba(224, 242, 254, 0.85);
            backdrop-filter: blur(4px);
            border-radius: 12px;
            padding: 10px 12px;
            border: 1px solid rgba(14, 165, 233, 0.2);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .legend-overlay-mobile .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 700;
            color: #1e3a5f;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          
          .legend-overlay-mobile .legend-item:last-child {
            margin-bottom: 0;
          }
          
          .legend-overlay-mobile .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          
          .legend-overlay-mobile .dot-red { background: #ef4444; }
          .legend-overlay-mobile .dot-green { background: #22c55e; }
          .legend-overlay-mobile .dot-black { background: #111827; }
          .legend-overlay-mobile .dot-gray { background: #9ca3af; }
          
          /* Search sub hartă */
          .mobile-search {
            display: block;
            padding: 12px 16px;
            background: #fff;
          }
          
          .mobile-search label {
            display: block;
            font-size: 13px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 6px;
          }
          
          .mobile-search select {
            width: 100%;
            padding: 12px 14px;
            font-size: 15px;
            font-weight: 600;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
            color: #111827;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 20px;
          }
          
          /* Widget Tulcea ascuns din sidebar pe mobil */
          .tulcea-widget-desktop {
            display: none !important;
          }
        }
      `}</style>

      {/* ⭐ HEADER MOBIL NOU - Design modern cu gradient și animații */}
      <div className="mobile-header">
        <div className="hero-header">
          <div className="water-overlay"></div>
          <div className="hero-content">
            <h1 className="hero-title-main">INFORMAȚII HIDROGRAFICE</h1>
            <h2 className="hero-title-sub">DUNĂRE</h2>
            
            <div className="hero-features">
              <span className="hero-feature">
                <span className="hero-feature-icon">💧</span>
                <span className="hero-feature-text">Nivel</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">🌊</span>
                <span className="hero-feature-text">Debit</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">🌡️</span>
                <span className="hero-feature-text">Temperatura Apei</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">📊</span>
                <span className="hero-feature-text">Statistică</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">☁️</span>
                <span className="hero-feature-text">Meteo</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">🗺️</span>
                <span className="hero-feature-text">Hartă</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR DESKTOP - Cu header nou */}
      <aside className="page-sidebar">
        {/* ⭐ HEADER DESKTOP NOU */}
        <div className="hero-header" style={{ marginBottom: 16 }}>
          <div className="water-overlay"></div>
          <div className="hero-content">
            <h1 className="hero-title-main" style={{ fontSize: 18 }}>INFORMAȚII HIDROGRAFICE</h1>
            <h2 className="hero-title-sub" style={{ fontSize: 14 }}>DUNĂRE</h2>
            
            <div className="hero-features" style={{ marginTop: 14 }}>
              <span className="hero-feature">
                <span className="hero-feature-icon">💧</span>
                <span className="hero-feature-text">Nivel</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">🌊</span>
                <span className="hero-feature-text">Debit</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">🌡️</span>
                <span className="hero-feature-text">Temperatura Apei</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">📊</span>
                <span className="hero-feature-text">Statistică</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">☁️</span>
                <span className="hero-feature-text">Meteo</span>
              </span>
              <span className="hero-feature">
                <span className="hero-feature-icon">🗺️</span>
                <span className="hero-feature-text">Hartă</span>
              </span>
            </div>
          </div>
        </div>

        <label className="sidebar-label" style={{ fontSize: 14 }}>
          Caută stația
        </label>

        <select
          className="sidebar-select"
          style={{ fontSize: 14 }}
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
        >
          {stations.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {/* LEGENDA DESKTOP */}
        <div
          className="legend"
          style={{
            marginTop: 12,
            fontSize: 14,
            textTransform: "uppercase",
            display: "grid",
            rowGap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
            <span className="dot dot-red" style={{ width: 11, height: 11 }} />
            <span>VARIAȚIE NEGATIVĂ</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
            <span className="dot dot-green" style={{ width: 11, height: 11 }} />
            <span>VARIAȚIE POZITIVĂ</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
            <span className="dot dot-black" style={{ width: 11, height: 11 }} />
            <span>VARIAȚIE 0</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900 }}>
            <span className="dot dot-gray" style={{ width: 11, height: 11 }} />
            <span>FĂRĂ DATE</span>
          </div>
        </div>

        {/* WIDGET TULCEA - DOAR DESKTOP */}
        <div className="tulcea-widget-desktop" style={{ marginTop: 16 }}>
          <TulceaFlowWidgetSidebar latestData={latestByName["Tulcea"]} />
        </div>
      </aside>

      <main className="page-main">
        {/* Container hartă cu legendă suprapusă pe mobil */}
        <div className="map-container-mobile">
          <MapView
            stations={stations}
            latestByName={latestByName}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
          />
          
          {/* ⭐ LEGENDA MOBIL - Suprapusă pe hartă, colț dreapta, fundal bleu transparent */}
          <div className="legend-overlay-mobile">
            <div className="legend-item">
              <span className="legend-dot dot-red"></span>
              <span>VARIAȚIE NEGATIVĂ</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-green"></span>
              <span>VARIAȚIE POZITIVĂ</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-black"></span>
              <span>VARIAȚIE 0</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-gray"></span>
              <span>FĂRĂ DATE</span>
            </div>
          </div>
        </div>

        {/* ⭐ SEARCH MOBIL - Sub hartă (vizibil doar pe mobil) */}
        <div className="mobile-search">
          <label>Caută stația</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
          >
            {stations.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <StationPanel
          stationName={selectedStation}
          station={selectedStationObj}
          latest={latestByName?.[selectedStation]}
          chartData={chartByStation?.[selectedStation] || []}
          period={periodDays}
          onPeriodChange={onPeriodChange}
          onPeriodRangeChange={onPeriodRangeChange}
          loading={chartLoading}
          tulceaLatest={latestByName["Tulcea"]}
        />
      </main>
    </div>
  );
}

// ⭐ Component widget optimizat pentru sidebar
function TulceaFlowWidgetSidebar({ latestData }) {
  const flowInfo = useMemo(() => {
    if (!latestData?.nivel_cm) return null;

    const { getFlowInfo } = require("./lib/flowCalculator");
    return getFlowInfo(latestData.nivel_cm);
  }, [latestData]);

  if (!flowInfo) return null;

  const barHeight = Math.min(100, (flowInfo.nivel_cm / 400) * 100);

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: 16,
        border: "1px solid rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${flowInfo.color}22, ${flowInfo.color}44)`,
          padding: "15px 16px",
          borderBottom: `2px solid ${flowInfo.color}`,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 900, color: "#111827" }}>🌊 TULCEA</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Debit Dunăre</div>
      </div>

      <div style={{ padding: "15px 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, marginBottom: 3 }}>
              Nivel
            </div>
            <div style={{ fontSize: 19, fontWeight: 950, color: "#111827" }}>
              {flowInfo.nivel_cm} cm
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, marginBottom: 3 }}>
              Debit
            </div>
            <div style={{ fontSize: 17, fontWeight: 950, color: "#111827" }}>
              {flowInfo.debit_m3s?.toLocaleString()} <span style={{ fontSize: 13 }}>m³/s</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "5px 12px",
            borderRadius: 999,
            background: `${flowInfo.color}22`,
            border: `1.5px solid ${flowInfo.color}`,
            fontSize: 13,
            fontWeight: 900,
            color: flowInfo.color,
          }}
        >
          {flowInfo.emoji} {flowInfo.label}
        </div>

        <div
          style={{
            marginTop: 12,
            height: 7,
            background: "#f3f4f6",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barHeight}%`,
              background: `linear-gradient(90deg, ${flowInfo.color}, ${flowInfo.color}dd)`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, lineHeight: 1.3 }}>
          ⚠️ Debit estimat. Date oficiale:{" "}
          <a
            href="https://www.hidro.ro/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 700 }}
          >
            INHGA
          </a>
        </div>
      </div>
    </div>
  );
}
