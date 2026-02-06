"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import StationChart from "./StationChart";
import DebitChart from "./DebitChart";
import WeatherWidget from "./WeatherWidget";
import ForecastChart from "./ForecastChart";
import SolunarWidget from "./SolunarWidget";
import FishActivityWidget from "./FishActivityWidget";
import FishingComfortWidget from "./FishingComfortWidget";
import FishingCalendarWidget from "./FishingCalendarWidget";
import { stationSlug } from "../lib/stations";

const PERIODS = [
  { days: 7, label: "7 zile" },
  { days: 30, label: "1 lună" },
  { days: 365, label: "1 an" },
];

const CARD_ALPHA = 0.5;
const rgba = (r, g, b, a = CARD_ALPHA) => `rgba(${r}, ${g}, ${b}, ${a})`;

function deltaCardBg(deltaNum) {
  const d = typeof deltaNum === "number" && Number.isFinite(deltaNum) ? deltaNum : null;
  if (d === null) return "linear-gradient(180deg, #ffffff, #fafafa)";
  if (d > 0) return rgba(34, 197, 94);
  if (d < 0) return rgba(239, 68, 68);
  return rgba(229, 231, 235);
}

function tempCardBg(tempNum) {
  const t = typeof tempNum === "number" && Number.isFinite(tempNum) ? tempNum : null;
  if (t === null) return "linear-gradient(180deg, #ffffff, #fafafa)";
  if (t < 0) return rgba(30, 58, 138);
  if (t < 5) return rgba(56, 189, 248);
  if (t < 10) return rgba(253, 224, 71);
  if (t < 15) return rgba(234, 179, 8);
  if (t < 20) return rgba(249, 115, 22);
  if (t < 25) return rgba(248, 113, 113);
  return rgba(185, 28, 28);
}

function toYMD(d) {
  if (!d) return "";
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function diffDaysUTC(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return NaN;
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYMD(toYmd).split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return (toUTC - fromUTC) / (1000 * 60 * 60 * 24);
}

export default function StationPanel({
  station,
  latest,
  chartData,
  period,
  onPeriodChange,
  loading = false,
  series,
  days,
  setDays,
  onPeriodRangeChange,
  tulceaLatest,
  isRiverStation = false,
  stations = [],
  riverStations = [],
  onStationChange,
}) {
  const name = station?.name || station?.localitatea || "Stație";
  const riverName = station?.river || null;
  const slug = useMemo(() => stationSlug(name), [name]);
  const imgUrl = `/stations/${slug}.jpg`;

  const [wiki, setWiki] = useState({ loading: true, found: false, extract: "", url: null });
  const [weather, setWeather] = useState({ loading: true, ok: false });
  const [imgOk, setImgOk] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customErr, setCustomErr] = useState("");
  const [isCustomActive, setIsCustomActive] = useState(false);

  const rows = chartData ?? series ?? [];
  const activePeriod = isCustomActive ? null : (period ?? days ?? 30);

  const openLightbox = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches) {
      if (imgOk) setLightboxOpen(true);
    }
  }, [imgOk]);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setLightboxOpen(false);
    }
    if (lightboxOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  useEffect(() => {
    let cancelled = false;
    async function loadWiki() {
      setWiki({ loading: true, found: false, extract: "", url: null });
      try {
        const r = await fetch(`/api/wiki?title=${encodeURIComponent(name)}`);
        const j = await r.json();
        if (!cancelled) setWiki({ loading: false, ...j });
      } catch {
        if (!cancelled) setWiki({ loading: false, found: false, extract: "", url: null });
      }
    }
    if (name) loadWiki();
    return () => { cancelled = true; };
  }, [name]);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      const lat = station?.lat ?? station?.latitude ?? station?.Latitude;
      const lon = station?.lon ?? station?.lng ?? station?.longitudine ?? station?.Longitudine;
      if (lat == null || lon == null) {
        setWeather({ loading: false, ok: false, reason: "missing_coords" });
        return;
      }
      setWeather({ loading: true, ok: false });
      try {
        const r = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
        const j = await r.json();
        if (!cancelled) setWeather({ loading: false, ...j });
      } catch {
        if (!cancelled) setWeather({ loading: false, ok: false });
      }
    }
    loadWeather();
    const t = setInterval(loadWeather, 6 * 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, [station?.lat, station?.latitude, station?.Latitude, station?.lon, station?.lng, station?.longitudine, station?.Longitudine]);

  useEffect(() => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const dates = rows.map((p) => toYMD(p.date || p.time || p.ts || p.data)).filter(Boolean).sort();
    if (!dates.length) return;
    setCustomTo((prev) => prev || dates[dates.length - 1]);
    setCustomFrom((prev) => prev || dates[Math.max(0, dates.length - 2)]);
  }, [rows]);

  useEffect(() => {
    setIsCustomActive(false);
    setCustomOpen(false);
  }, [name]);

  const delta = latest?.variatie_cm ?? latest?.nivel_trend;
  const deltaNum = delta === null || delta === undefined ? null : 
    (delta === "up" ? 1 : delta === "down" ? -1 : delta === "stable" ? 0 : Number(delta));
  
  const tempRaw = latest?.temperatura_c;
  const tempNum = tempRaw === null || tempRaw === undefined || tempRaw === "—" ? null : Number(tempRaw);

  // Funcții helper pentru widgeturi
  const getMoonPhaseForToday = () => {
    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();
    
    if (month < 3) { year--; month += 12; }
    
    const c = Math.floor(year / 100);
    const e = Math.floor(c / 4);
    const b = 2 - c + e;
    const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
    const daysSinceNew = (jd - 2451549.5) % 29.53059;
    return daysSinceNew < 0 ? daysSinceNew + 29.53059 : daysSinceNew;
  };

  const todaySolunarData = useMemo(() => {
    const lat = station?.lat ?? station?.latitude ?? station?.Latitude;
    const lng = station?.lon ?? station?.lng ?? station?.longitudine ?? station?.Longitudine;
    if (!lat || !lng) return null;
    
    const phase = getMoonPhaseForToday();
    const phaseRatio = phase / 29.53059;
    const moonrise = (6 + phaseRatio * 12) % 24;
    const majorStart = (moonrise + 6) % 24;
    
    return {
      majorPeriods: [
        { start: majorStart, duration: 2 },
        { start: (majorStart + 12) % 24, duration: 2 },
      ],
      minorPeriods: [
        { start: moonrise, duration: 1 },
        { start: (moonrise + 12) % 24, duration: 1 },
      ],
    };
  }, [station]);

  const todaySolunarRating = useMemo(() => {
    const phase = getMoonPhaseForToday();
    if (phase < 2 || (phase > 13 && phase < 16)) return 5;
    if (phase < 4 || phase > 25 || (phase > 11 && phase < 18)) return 4;
    if (phase > 5 && phase < 10) return 2;
    return 3;
  }, []);

  const handlePreset = useCallback((d) => {
    setCustomOpen(false);
    setCustomErr("");
    setIsCustomActive(false);
    if (typeof onPeriodChange === "function") onPeriodChange(d);
    else if (typeof setDays === "function") setDays(d);
  }, [onPeriodChange, setDays]);

  const applyDisabled = typeof onPeriodRangeChange !== "function";

  const applyCustom = useCallback(() => {
    setCustomErr("");
    if (!customFrom || !customTo) {
      setCustomErr("Alege ambele date.");
      return;
    }
    const dd = diffDaysUTC(customFrom, customTo);
    if (!(dd >= 1)) {
      setCustomErr("Minim 2 zile consecutive.");
      return;
    }
    const success = onPeriodRangeChange(customFrom, customTo);
    if (!success) {
      setCustomErr("Interval invalid.");
      return;
    }
    setIsCustomActive(true);
    setCustomOpen(false);
  }, [customFrom, customTo, onPeriodRangeChange]);

  const dataSource = isRiverStation ? "DanubeHIS" : "AFDJ.ro";

  // Widget Tulcea doar pentru statia Tulcea
  const showTulceaWidget = name === "Tulcea";

  return (
    <>
      <style jsx>{`
        .station-panel-container {
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: #ffffff;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          overflow-x: hidden;
        }

        /* FIX: keep children from forcing wider layouts */
        .station-panel-container, .station-panel-container * { box-sizing: border-box; }


        .station-name-header {
          text-align: center;
          padding: 20px 16px 12px 16px;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-bottom: 1px solid #e0f2fe;
        }

        .station-name {
          font-size: 28px;
          font-weight: 950;
          color: #0c4a6e;
          margin: 0;
        }

        .station-river-name {
          font-size: 14px;
          color: #0284c7;
          font-weight: 700;
          margin-top: 4px;
        }

        .station-last-update {
          display: inline-block;
          margin-top: 10px;
          padding: 8px 20px;
          background: linear-gradient(135deg, #0369a1 0%, #0284c7 100%);
          color: white;
          font-size: 13px;
          font-weight: 700;
          border-radius: 25px;
          box-shadow: 0 4px 12px rgba(3, 105, 161, 0.3);
        }

        .station-content {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 16px;
          padding: 16px;
        }
        .station-content > * { min-width: 0; }


        .station-image-wrapper {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          background-color: #f9fafb;
          position: relative;
          width: 100%;
          height: 180px;
        }

        .station-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          background: #f9fafb;
          cursor: pointer;
        }

        .station-image.error {
          cursor: default;
        }

        .wiki-container {
          font-size: 14px;
          color: #374151;
          line-height: 1.55;
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 0 16px 16px 16px;
        }

        .stat-card {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          min-height: 90px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .stat-card-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .stat-card-value {
          font-size: 26px;
          font-weight: 950;
          color: #111827;
        }

        .stat-card-unit {
          font-size: 14px;
          color: #6b7280;
          font-weight: 600;
        }

        .chart-section {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin: 0 16px 16px 16px;
        }

        .chart-header {
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chart-header-nivel {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        }

        .chart-title {
          font-size: 18px;
          font-weight: 800;
          color: white;
        }

        .chart-source {
          font-size: 11px;
          color: rgba(255,255,255,0.8);
        }

        .chart-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .chart-btn {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.3);
          background: transparent;
          color: white;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .chart-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .chart-btn.active {
          background: white;
          color: #1e40af;
        }

        .chart-body {
          padding: 16px;
        }

        .section-spacing {
          padding: 0 16px 16px 16px;
        }

        .img-lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .img-lightbox__panel {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }

        .img-lightbox__close {
          position: absolute;
          top: -40px;
          right: 0;
          background: transparent;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }

        .img-lightbox__img {
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 12px;
        }

        .img-lightbox__caption {
          text-align: center;
          color: white;
          font-size: 18px;
          font-weight: 700;
          margin-top: 12px;
        }

        @media (max-width: 768px) {
          .station-content {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px;
          }

          .station-image-wrapper {
            height: 160px;
          }

          .station-image {
            /* MOBILE: show the full image (no crop) and keep it centered */
            object-fit: contain;
            object-position: center;
            background: #f9fafb;
          }

          .cards-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            padding: 0 12px 12px 12px;
          }

          .stat-card {
            padding: 12px;
            min-height: 75px;
          }

          .stat-card-value {
            font-size: 20px;
          }

          .chart-section {
            margin: 0 12px 12px 12px;
          }

          .section-spacing {
            padding: 0 12px 12px 12px;
          }

          .station-name {
            font-size: 22px;
          }
        }
      `}</style>

      <section className="station-panel-container">
        {/* HEADER - Nume stație centrat + ultima măsurătoare */}
        <div className="station-name-header">
          <h1 className="station-name">{name}</h1>
          {isRiverStation && riverName && (
            <div className="station-river-name">Râul {riverName}</div>
          )}
          {latest?.data && (
            <div className="station-last-update">
              Ultima măsurătoare: {latest.data}
            </div>
          )}
        </div>

        {/* CONȚINUT - Poză stânga, Wiki dreapta */}
        <div className="station-content">
          <div>
            <div className="station-image-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={name}
                onError={() => setImgOk(false)}
                onClick={openLightbox}
                className={`station-image${!imgOk ? ' error' : ''}`}
              />
            </div>
          </div>

          <div id="wiki-section" className="wiki-container">
            {wiki.loading ? (
              <div style={{ color: "#9ca3af" }}>Se încarcă informațiile...</div>
            ) : wiki.found ? (
              <>
                <div style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {wiki.extract}
                </div>
                {wiki.url && (
                  <div style={{ marginTop: 10 }}>
                    <a href={wiki.url} target="_blank" rel="noreferrer" style={{ 
                      color: "#0284c7", 
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6 
                    }}>
                      <span style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        width: 20, 
                        height: 20, 
                        background: "#0284c7", 
                        color: "white", 
                        borderRadius: "50%", 
                        fontSize: 12,
                        fontWeight: 900 
                      }}>i</span>
                      Deschide Wikipedia →
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "#9ca3af" }}>Nu există informații Wikipedia pentru {name}.</div>
            )}
          </div>
        </div>

        {/* CARDURI - Nivel, Variație, Temperatură */}
        <div className="cards-grid">
          <div className="stat-card" style={{ background: "linear-gradient(180deg, #ffffff, #f8fafc)" }}>
            <div className="stat-card-label">Nivel</div>
            <div className="stat-card-value">
              {latest?.nivel_cm ?? "—"} <span className="stat-card-unit">cm</span>
            </div>
          </div>

          <div className="stat-card" style={{ background: deltaCardBg(deltaNum) }}>
            <div className="stat-card-label">Variație</div>
            <div className="stat-card-value">
              {deltaNum === null ? "—" : (deltaNum > 0 ? `+${latest?.variatie_cm || deltaNum}` : (latest?.variatie_cm ?? deltaNum))} 
              <span className="stat-card-unit">cm</span>
            </div>
          </div>

          <div className="stat-card" style={{ background: tempCardBg(tempNum) }}>
            <div className="stat-card-label">Temperatură</div>
            <div className="stat-card-value">
              {tempNum ?? "—"} <span className="stat-card-unit">°C</span>
            </div>
          </div>
        </div>

        {/* GRAFIC NIVEL */}
        <div id="nivel-section" className="chart-section">
          <div className="chart-header chart-header-nivel">
            <div>
              <div className="chart-title">
                {isRiverStation ? "Nivel" : "Nivel și Temperatură"}
              </div>
              <div className="chart-source">Sursa: {dataSource}</div>
            </div>
            <div className="chart-buttons">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => handlePreset(p.days)}
                  className={`chart-btn ${activePeriod === p.days ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => { setCustomOpen((v) => !v); setCustomErr(""); }}
                className={`chart-btn ${isCustomActive || customOpen ? 'active' : ''}`}
              >
                Altă perioadă
              </button>
            </div>
          </div>

          {customOpen && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>De la</div>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Până la</div>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={applyDisabled}
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#1e40af",
                  color: "white",
                  fontWeight: 700,
                  cursor: applyDisabled ? "not-allowed" : "pointer",
                  fontSize: 13,
                }}
              >
                Aplică
              </button>
              {customErr && <div style={{ color: "#991b1b", fontSize: 12 }}>{customErr}</div>}
            </div>
          )}

          <div className="chart-body">
            {loading ? (
              <div style={{ padding: 20, color: "#6b7280", textAlign: "center" }}>Se încarcă graficul...</div>
            ) : (
              <StationChart rows={rows} showTemperature={!isRiverStation} />
            )}
          </div>
        </div>

        {/* GRAFIC DEBIT */}
        {(latest?.debit_mc_s || isRiverStation) && (
          <div className="section-spacing">
            <DebitChart
              debit_mc_s={latest?.debit_mc_s}
              debit_trend={latest?.debit_trend}
              stationName={name}
              showTemperature={isRiverStation}
              chartData={isRiverStation ? rows : null}
            />
          </div>
        )}

        {/* PROGNOZĂ */}
        <div id="forecast-section" className="section-spacing">
          <ForecastChart stationName={name} nivelActual={latest?.nivel_cm} />
        </div>

        {/* WIDGET TULCEA - doar pentru Tulcea */}
        {showTulceaWidget && (
          <div className="section-spacing">
            <TulceaFlowWidget latestData={tulceaLatest} />
          </div>
        )}

        {/* METEO */}
        <div id="meteo-section" className="section-spacing">
          {weather.loading ? (
            <div style={{ padding: 12, color: "#9ca3af" }}>Se încarcă meteo...</div>
          ) : (
            <WeatherWidget weather={weather} />
          )}
        </div>

        {/* SOLUNAR */}
        <div id="solunar-section" className="section-spacing">
          <SolunarWidget 
            lat={station?.lat ?? station?.latitude ?? station?.Latitude}
            lng={station?.lon ?? station?.lng ?? station?.longitudine ?? station?.Longitudine}
            stationName={name}
            stations={stations}
            riverStations={riverStations}
            onStationChange={onStationChange}
          />
        </div>

        {/* ACTIVITATE PEȘTI */}
        <div id="fish-section" className="section-spacing">
          <FishActivityWidget 
            waterTemp={tempNum}
            pressure={weather?.current?.pressure_hpa}
            moonPhase={getMoonPhaseForToday()}
            solunarData={todaySolunarData}
          />
        </div>

        {/* CONFORT PESCUIT */}
        <div id="comfort-section" className="section-spacing">
          <FishingComfortWidget 
            waterTemp={tempNum}
            weather={{
              temp: weather?.current?.temp_c,
              wind: weather?.current?.wind_kmh,
              humidity: weather?.current?.humidity,
              pressure: weather?.current?.pressure_hpa,
              precipitation: weather?.daily?.[0]?.precip_mm ?? weather?.current?.precipitation_mm ?? 0,
            }}
            solunarRating={todaySolunarRating}
          />
        </div>

        {/* CALENDAR PESCUIT */}
        <div id="calendar-section" className="section-spacing">
          <FishingCalendarWidget />
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div className="img-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          <div className="img-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button className="img-lightbox__close" onClick={closeLightbox} aria-label="Închide">×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="img-lightbox__img" src={imgUrl} alt={name} />
            <div className="img-lightbox__caption">{name}</div>
          </div>
        </div>
      )}
    </>
  );
}

// Widget Tulcea
function TulceaFlowWidget({ latestData }) {
  const flowInfo = useMemo(() => {
    if (!latestData?.nivel_cm) return null;
    const { getFlowInfo } = require("../lib/flowCalculator");
    return getFlowInfo(latestData.nivel_cm);
  }, [latestData]);

  if (!flowInfo) return null;

  const barHeight = Math.min(100, (flowInfo.nivel_cm / 400) * 100);

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.95)",
      borderRadius: 16,
      border: "1px solid rgba(0, 0, 0, 0.08)",
      overflow: "hidden",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.1)",
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${flowInfo.color}22, ${flowInfo.color}44)`,
        padding: "15px 16px",
        borderBottom: `2px solid ${flowInfo.color}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>🌊 Debit Dunăre - Tulcea</div>
      </div>
      <div style={{ padding: "15px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, marginBottom: 4 }}>Nivel</div>
            <div style={{ fontSize: 22, fontWeight: 950, color: "#111827" }}>{flowInfo.nivel_cm} cm</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, marginBottom: 4 }}>Debit</div>
            <div style={{ fontSize: 20, fontWeight: 950, color: "#111827" }}>
              {flowInfo.debit_m3s?.toLocaleString()} <span style={{ fontSize: 14 }}>m³/s</span>
            </div>
          </div>
        </div>
        <div style={{
          display: "inline-block",
          padding: "6px 14px",
          borderRadius: 999,
          background: `${flowInfo.color}22`,
          border: `2px solid ${flowInfo.color}`,
          fontSize: 14,
          fontWeight: 900,
          color: flowInfo.color,
        }}>
          {flowInfo.emoji} {flowInfo.label}
        </div>
        <div style={{ marginTop: 14, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${barHeight}%`,
            background: `linear-gradient(90deg, ${flowInfo.color}, ${flowInfo.color}dd)`,
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, lineHeight: 1.4 }}>
          Debit estimat pe baza corelației nivel-debit. Date oficiale:{" "}
          <a href="https://www.hidro.ro/" target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 700 }}>
            INHGA
          </a>
        </div>
      </div>
    </div>
  );
}
