"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import StationPanel from "./components/StationPanel";
import DonationWidget from "./components/DonationWidget";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

function diffDaysUTC(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return NaN;
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return (toUTC - fromUTC) / (1000 * 60 * 60 * 24);
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function Page() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("Galați");

  const [latestByName, setLatestByName] = useState({});
  const [riverStations, setRiverStations] = useState([]);
  const [chartByStation, setChartByStation] = useState({});
  const [chartLoading, setChartLoading] = useState(false);

  const [periodDays, setPeriodDays] = useState(30);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isRiverStation = useMemo(() => {
    return riverStations.some(s => s.name === selectedStation);
  }, [riverStations, selectedStation]);

  const selectedStationObj = useMemo(() => {
    const fromDunare = stations.find((s) => s.name === selectedStation);
    if (fromDunare) return fromDunare;
    
    const fromRiver = riverStations.find((s) => s.name === selectedStation);
    if (fromRiver) return { ...fromRiver, lat: fromRiver.lat || fromRiver.latitude, lng: fromRiver.lng || fromRiver.longitude };
    
    return null;
  }, [stations, riverStations, selectedStation]);

  const selectedLatest = useMemo(() => {
    if (!isRiverStation) {
      return latestByName?.[selectedStation];
    }
    const riverStation = riverStations.find(s => s.name === selectedStation);
    return riverStation?.latest || null;
  }, [isRiverStation, latestByName, riverStations, selectedStation]);

  useEffect(() => {
    let cancelled = false;
    async function loadStations() {
      try {
        const res = await fetch("/api/stations", { cache: "no-store" });
        const j = await res.json();
        const list = j?.stations || [];
        if (!cancelled && list.length) {
          setStations(list);
          // Caută Galați (cu sau fără diacritice) și setează-l
          const galatiStation = list.find(s => 
            s.name.toLowerCase().includes("gala")
          );
          if (galatiStation) {
            setSelectedStation(galatiStation.name);
          }
        }
      } catch (e) {}
    }
    loadStations();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      try {
        const res = await fetch("/api/latest", { cache: "no-store" });
        const j = await res.json();
        if (!cancelled) setLatestByName(j.byName || {});
      } catch (e) {}
    }
    loadLatest();
    const t = setInterval(loadLatest, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRivers() {
      try {
        const res = await fetch("/api/rivers", { cache: "no-store" });
        const j = await res.json();
        if (!cancelled) setRiverStations(j?.stations || []);
      } catch (e) {}
    }
    loadRivers();
    return () => { cancelled = true; };
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

  useEffect(() => {
    let cancelled = false;
    async function loadChart() {
      if (!selectedStation) return;
      setChartLoading(true);
      try {
        const apiEndpoint = isRiverStation ? "/api/river-measurements" : "/api/measurements";
        let url = `${apiEndpoint}?station=${encodeURIComponent(selectedStation)}`;
        
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
  }, [selectedStation, periodDays, useCustomRange, customFrom, customTo, isRiverStation]);

  return (
    <div className="page-layout">
      {/* Widget Donație */}
      <DonationWidget />
      
      <style jsx global>{`
        /* PREVINE OVERFLOW ORIZONTAL */
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }
        * {
          box-sizing: border-box;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes wave {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-2px) translateY(-2px); }
          50% { transform: translateX(0) translateY(-3px); }
          75% { transform: translateX(2px) translateY(-2px); }
          100% { transform: translateX(0) translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(14, 165, 233, 0.4), 0 0 40px rgba(14, 165, 233, 0.2); }
          50% { box-shadow: 0 0 30px rgba(14, 165, 233, 0.6), 0 0 60px rgba(14, 165, 233, 0.3); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes text-glow {
          0%, 100% { 
            text-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(14, 165, 233, 0.5), 0 2px 10px rgba(0,0,0,0.3);
          }
          50% { 
            text-shadow: 0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(14, 165, 233, 0.8), 0 2px 10px rgba(0,0,0,0.3);
          }
        }
        @keyframes water-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .mobile-header { display: none; }
        .mobile-search { display: none; }
        .map-container-mobile { position: relative; }
        .legend-overlay-mobile { display: none; }

        /* TITLU CASETA CU EFECTE */
        .hero-title-box {
          background: linear-gradient(135deg, #082f49 0%, #0c4a6e 25%, #0369a1 50%, #0284c7 75%, #0c4a6e 100%);
          background-size: 300% 300%;
          animation: water-flow 8s ease infinite, pulse-glow 3s ease-in-out infinite;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 16px;
          text-align: center;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(14, 165, 233, 0.3);
        }
        .hero-title-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmer 4s infinite;
        }
        .hero-title-box::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.8), transparent);
          animation: shimmer 2s infinite;
        }
        .hero-title-icon {
          font-size: 28px;
          animation: wave 3s ease-in-out infinite;
          display: inline-block;
          margin-bottom: 4px;
        }
        .hero-title-text {
          font-size: 15px;
          font-weight: 900;
          color: white;
          animation: text-glow 3s ease-in-out infinite;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
        }
        .hero-subtitle-text {
          font-size: 11px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
          margin-top: 4px;
          position: relative;
          z-index: 1;
        }

        /* BUTOANE FEATURES - 2 randuri de 3 */
        .hero-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 12px;
        }
        .hero-feature {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 8px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .hero-feature:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
        .hero-feature-icon {
          font-size: 14px;
        }

        .sidebar-label { font-weight: 800; color: #374151; }
        .sidebar-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-weight: 600;
          background: white;
        }

        /* LEGENDA */
        .legend { margin-top: 12px; font-size: 12px; display: grid; row-gap: 5px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-weight: 600; }

        .page-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 20px;
          padding: 20px;
          min-height: 100vh;
          background: #f8fafc;
        }
        .page-aside {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .page-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* MOBILE */
        @media (max-width: 900px) {
          .page-layout {
            grid-template-columns: 1fr;
            padding: 12px;
            gap: 12px;
          }
          .page-aside { display: none; }
          .page-main { padding: 0; }
          
          .mobile-header {
            display: block;
            background: linear-gradient(135deg, #082f49 0%, #0c4a6e 25%, #0369a1 50%, #0284c7 75%, #0c4a6e 100%);
            background-size: 300% 300%;
            animation: water-flow 8s ease infinite, pulse-glow 3s ease-in-out infinite;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 12px;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid rgba(14, 165, 233, 0.3);
            position: relative;
            overflow: hidden;
          }
          .mobile-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 200%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: shimmer 4s infinite;
          }
          .mobile-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.8), transparent);
            animation: shimmer 2s infinite;
          }
          .mobile-header-icon {
            font-size: 28px;
            animation: wave 3s ease-in-out infinite;
            display: block;
            margin-bottom: 6px;
            position: relative;
            z-index: 1;
          }
          .mobile-header-text h1 {
            font-size: 14px;
            font-weight: 900;
            color: white;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            animation: text-glow 3s ease-in-out infinite;
            position: relative;
            z-index: 1;
          }
          .mobile-header-text p {
            font-size: 10px;
            color: rgba(255,255,255,0.85);
            margin: 4px 0 0 0;
            position: relative;
            z-index: 1;
          }
          
          /* BUTOANE MOBIL - 3 randuri de 3, fix */
          .mobile-features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
            width: 100%;
            position: relative;
            z-index: 1;
          }
          .mobile-feature {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.25);
            padding: 10px 4px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
            color: white;
            cursor: pointer;
            white-space: nowrap;
            min-width: 0;
            transition: all 0.2s ease;
          }
          .mobile-feature:active {
            background: rgba(255,255,255,0.25);
            transform: scale(0.98);
          }
          .mobile-feature-icon { font-size: 14px; flex-shrink: 0; }
          
          .mobile-search {
            display: block;
            margin: 12px 0;
          }
          .mobile-search label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #374151;
            margin-bottom: 6px;
          }
          .mobile-search select {
            width: 100%;
            padding: 12px 14px;
            font-size: 14px;
            font-weight: 600;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            background: white;
          }
          
          .legend-overlay-mobile {
            display: flex;
            flex-direction: column;
            gap: 3px;
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(240, 249, 255, 0.95);
            border: 1px solid rgba(14, 165, 233, 0.2);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 8px;
            font-weight: 700;
            color: #0c4a6e;
            z-index: 1000;
          }
          .legend-mob-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }
      `}</style>

      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <span className="mobile-header-icon">🌊</span>
        <div className="mobile-header-text">
          <h1>Platformă Hidrologică Interactivă</h1>
          <p>Monitorizare în timp real</p>
        </div>
        <div className="mobile-features">
          <button className="mobile-feature" onClick={() => scrollToSection('map-section')}>
            <span className="mobile-feature-icon">🗺️</span>
            <span>Hartă</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('nivel-section')}>
            <span className="mobile-feature-icon">📈</span>
            <span>Nivel</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('debit-section')}>
            <span className="mobile-feature-icon">🌊</span>
            <span>Debit</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('meteo-section')}>
            <span className="mobile-feature-icon">☁️</span>
            <span>Meteo</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('solunar-section')}>
            <span className="mobile-feature-icon">🌙</span>
            <span>Solunar</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('fish-section')}>
            <span className="mobile-feature-icon">🐟</span>
            <span>Pești</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('comfort-section')}>
            <span className="mobile-feature-icon">🎯</span>
            <span>Confort</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('calendar-section')}>
            <span className="mobile-feature-icon">📅</span>
            <span>Calendar</span>
          </button>
          <button className="mobile-feature" onClick={() => scrollToSection('wiki-section')}>
            <span className="mobile-feature-icon">ℹ️</span>
            <span>Info</span>
          </button>
        </div>
      </div>

      <aside className="page-aside">
        {/* TITLU IN CASETA CU EFECTE */}
        <div className="hero-title-box">
          <div className="hero-title-icon">🌊</div>
          <div className="hero-title-text">Platformă Hidrologică Interactivă</div>
          <div className="hero-subtitle-text">Monitorizare în timp real</div>
          <div className="hero-features">
            <button className="hero-feature" onClick={() => scrollToSection('map-section')}>
              <span className="hero-feature-icon">🗺️</span>
              <span>Hartă</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('nivel-section')}>
              <span className="hero-feature-icon">📈</span>
              <span>Nivel</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('debit-section')}>
              <span className="hero-feature-icon">🌊</span>
              <span>Debit</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('meteo-section')}>
              <span className="hero-feature-icon">☁️</span>
              <span>Meteo</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('solunar-section')}>
              <span className="hero-feature-icon">🌙</span>
              <span>Solunar</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('fish-section')}>
              <span className="hero-feature-icon">🐟</span>
              <span>Pești</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('comfort-section')}>
              <span className="hero-feature-icon">🎯</span>
              <span>Confort</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('calendar-section')}>
              <span className="hero-feature-icon">📅</span>
              <span>Calendar</span>
            </button>
            <button className="hero-feature" onClick={() => scrollToSection('wiki-section')}>
              <span className="hero-feature-icon">ℹ️</span>
              <span>Info</span>
            </button>
          </div>
        </div>

        <label className="sidebar-label" style={{ fontSize: 13 }}>
          Caută stația
        </label>

        <select
          className="sidebar-select"
          style={{ fontSize: 13 }}
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
        >
          <optgroup label="Dunăre">
            {stations.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </optgroup>
          {riverStations.length > 0 && (
            <optgroup label="Râuri interioare">
              {riverStations.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.river})
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <div className="legend">
          <div className="legend-item">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M12 3L21 19H3L12 3Z" fill="#22c55e" stroke="#166534" strokeWidth="2"/>
            </svg>
            <span>Nivel în creștere</span>
          </div>
          <div className="legend-item">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M12 21L3 5H21L12 21Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2"/>
            </svg>
            <span>Nivel în scădere</span>
          </div>
          <div className="legend-item">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" fill="#374151" stroke="#111827" strokeWidth="2" transform="rotate(45 12 12)"/>
            </svg>
            <span>Stabil</span>
          </div>
          <div className="legend-item">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="7" fill="#94a3b8" stroke="#64748b" strokeWidth="2"/>
            </svg>
            <span>Fără date</span>
          </div>
          <div className="legend-item" style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid #e5e7eb" }}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="7" fill="#0284c7" stroke="#0369a1" strokeWidth="2"/>
            </svg>
            <span style={{ color: "#0284c7" }}>Râuri interioare</span>
          </div>
        </div>
      </aside>

      <main className="page-main">
        <div id="map-section" className="map-container-mobile">
          <MapView
            stations={stations}
            latestByName={latestByName}
            riverStations={riverStations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
          />
          <div className="legend-overlay-mobile">
            <div className="legend-mob-item">
              <svg width="10" height="10" viewBox="0 0 24 24">
                <path d="M12 3L21 19H3L12 3Z" fill="#22c55e" stroke="#166534" strokeWidth="2"/>
              </svg>
              <span>Creștere</span>
            </div>
            <div className="legend-mob-item">
              <svg width="10" height="10" viewBox="0 0 24 24">
                <path d="M12 21L3 5H21L12 21Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2"/>
              </svg>
              <span>Scădere</span>
            </div>
            <div className="legend-mob-item">
              <svg width="10" height="10" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" fill="#374151" stroke="#111827" strokeWidth="2" transform="rotate(45 12 12)"/>
              </svg>
              <span>Stabil</span>
            </div>
            <div className="legend-mob-item">
              <svg width="10" height="10" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="7" fill="#0284c7" stroke="#0369a1" strokeWidth="2"/>
              </svg>
              <span>Râuri</span>
            </div>
          </div>
        </div>

        <div className="mobile-search">
          <label>Caută stația</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
          >
            <optgroup label="Dunăre">
              {stations.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </optgroup>
            {riverStations.length > 0 && (
              <optgroup label="Râuri interioare">
                {riverStations.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.river})
                </option>
              ))}
            </optgroup>
          )}
          </select>
        </div>

        <div id="station-panel">
          <StationPanel
            stationName={selectedStation}
            station={selectedStationObj}
            latest={selectedLatest}
            chartData={chartByStation?.[selectedStation] || []}
            period={periodDays}
            onPeriodChange={onPeriodChange}
            onPeriodRangeChange={onPeriodRangeChange}
            loading={chartLoading}
            tulceaLatest={latestByName["Tulcea"]}
            isRiverStation={isRiverStation}
            stations={stations}
            riverStations={riverStations}
            onStationChange={setSelectedStation}
          />
        </div>
      </main>
    </div>
  );
}
