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
  const [stations, setStations] = useState([]); // din /api/stations
  const [selectedStation, setSelectedStation] = useState("Tulcea");

  const [latestByName, setLatestByName] = useState({});
  const [chartByStation, setChartByStation] = useState({});
  const [chartLoading, setChartLoading] = useState(false);

  // ✅ NOU: perioadă preset (default 1 lună)
  const [periodDays, setPeriodDays] = useState(30);

  // ✅ NOU: custom range
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState(""); // YYYY-MM-DD
  const [customTo, setCustomTo] = useState(""); // YYYY-MM-DD

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
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // ✅ NOU: handler preset (7/30/365 etc)
  const onPeriodChange = useCallback((days) => {
    // când alegi preset, dezactivezi custom
    setUseCustomRange(false);
    setCustomFrom("");
    setCustomTo("");
    setPeriodDays(days);
  }, []);

  // ✅ NOU: handler pentru "Altă perioadă" (buton Aplică)
  // StationPanel va apela cu (from,to) în format YYYY-MM-DD
  const onPeriodRangeChange = useCallback((from, to) => {
    const dd = diffDaysUTC(from, to);
    if (!(dd >= 1)) {
      // minim 2 zile consecutive (diferență >= 1 zi)
      return false;
    }
    setCustomFrom(from);
    setCustomTo(to);
    setUseCustomRange(true);
    setPeriodDays(null); // resetează perioada preset pentru a nu interfera
    return true;
  }, []);

  // 3) Chart (pentru stația selectată) — ✅ acum ia în calcul days SAU from/to
  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      if (!selectedStation) return;

      setChartLoading(true);

      try {
        let url = `/api/measurements?station=${encodeURIComponent(selectedStation)}`;

        if (useCustomRange && customFrom && customTo) {
          url += `&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
          console.log('🔍 Loading custom range:', customFrom, 'to', customTo);
        } else {
          url += `&days=${encodeURIComponent(periodDays)}`;
          console.log('🔍 Loading preset days:', periodDays);
        }

        // Cache busting mai agresiv
        url += `&_t=${Date.now()}`;
        console.log('📡 Fetching URL:', url);

        const res = await fetch(url, { 
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const j = await res.json();

        console.log('📊 Received data points:', (j.rows || j.series || []).length);
        console.log('📊 First date:', (j.rows || j.series || [])[0]?.data || (j.rows || j.series || [])[0]?.date);
        console.log('📊 Last date:', (j.rows || j.series || [])[(j.rows || j.series || []).length - 1]?.data || (j.rows || j.series || [])[(j.rows || j.series || []).length - 1]?.date);

        if (!cancelled) {
          setChartByStation((prev) => ({
            ...prev,
            [selectedStation]: j.rows || j.series || [],
          }));
        }
      } catch (e) {
        console.error('❌ Error loading chart:', e);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }

    loadChart();
    return () => {
      cancelled = true;
    };
  }, [selectedStation, periodDays, useCustomRange, customFrom, customTo]);

  const selectedStationObj = useMemo(
    () => stations.find((s) => s.name === selectedStation) || null,
    [stations, selectedStation]
  );

  return (
    <div className="page-layout">
      <aside className="page-sidebar">
        {/* TITLU UPPERCASE (fără să schimb restul) */}
        <div className="brand-title" style={{ textTransform: "uppercase" }}>
          Cotele Dunării
        </div>

        {/* +3 unități */}
        <div className="brand-subtitle" style={{ fontSize: 15 }}>
          Stații • hartă • grafice
        </div>

        {/* +2 unități */}
        <label className="sidebar-label" style={{ fontSize: 14 }}>
          Caută stația
        </label>

        {/* +2 unități */}
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

        {/* LEGENDA: scos "—", text bold */}
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

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,45,70,0.65)" }}>
          Range: 1 m • ok
        </div>

        {/* ⭐ WIDGET TULCEA - SUB LEGENDĂ (DOAR DESKTOP - ascuns pe mobil) */}
        <div className="tulcea-widget-desktop" style={{ marginTop: 16 }}>
          <TulceaFlowWidgetSidebar latestData={latestByName["Tulcea"]} />
        </div>
      </aside>

      <main className="page-main">
        <MapView
          stations={stations}
          latestByName={latestByName}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
        />

        <StationPanel
          stationName={selectedStation}
          station={selectedStationObj}
          latest={latestByName?.[selectedStation]}
          chartData={chartByStation?.[selectedStation] || []}
          // ✅ NOU: leagă butoanele din StationPanel
          period={periodDays}
          onPeriodChange={onPeriodChange}
          // ✅ NOU: "Altă perioadă / Aplică"
          onPeriodRangeChange={onPeriodRangeChange}
          // ✅ optional: dacă StationPanel știe să arate loader
          loading={chartLoading}
          // ⭐ NOU: transmitem datele Tulcea pentru widget-ul mobil
          tulceaLatest={latestByName["Tulcea"]}
        />
      </main>

      {/* ⭐ CSS pentru a ascunde widget-ul Tulcea din sidebar pe mobil */}
      <style jsx global>{`
        /* Pe desktop: widget-ul din sidebar e vizibil */
        .tulcea-widget-desktop {
          display: block;
        }
        
        /* Pe mobil: ascundem widget-ul din sidebar */
        @media (max-width: 768px) {
          .tulcea-widget-desktop {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ⭐ Component widget optimizat pentru sidebar (texte +3)
function TulceaFlowWidgetSidebar({ latestData }) {
  const flowInfo = useMemo(() => {
    if (!latestData?.nivel_cm) return null;

    // Import funcție de calcul
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
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${flowInfo.color}22, ${flowInfo.color}44)`,
          padding: "15px 16px", // puțin mai mare ca să încapă textul +3
          borderBottom: `2px solid ${flowInfo.color}`,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 900, color: "#111827" }}>🌊 TULCEA</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Debit Dunăre</div>
      </div>

      {/* Content */}
      <div style={{ padding: "15px 16px" }}>
        {/* Nivel + Debit în 2 coloane */}
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

        {/* Status badge */}
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

        {/* Bară mini progres */}
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

        {/* Note + link INHGA */}
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
