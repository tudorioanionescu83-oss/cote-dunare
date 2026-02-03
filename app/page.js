"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import StationPanel from "./components/StationPanel";
import TulceaFlowWidget from "./components/TulceaFlowWidget";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

export default function Page() {
  const [stations, setStations] = useState([]); // din /api/stations
  const [selectedStation, setSelectedStation] = useState("Tulcea");

  const [latestByName, setLatestByName] = useState({});
  const [chartByStation, setChartByStation] = useState({});

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

  // 3) Chart (pentru stația selectată)
  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      if (!selectedStation) return;
      try {
        const res = await fetch(
          `/api/measurements?station=${encodeURIComponent(selectedStation)}&days=30`,
          { cache: "no-store" }
        );
        const j = await res.json();
        if (!cancelled) {
          setChartByStation((prev) => ({
            ...prev,
            [selectedStation]: j.rows || [],
          }));
        }
      } catch (e) {
        // silent
      }
    }

    loadChart();
    return () => {
      cancelled = true;
    };
  }, [selectedStation]);

  const selectedStationObj = useMemo(
    () => stations.find((s) => s.name === selectedStation) || null,
    [stations, selectedStation]
  );

  return (
    <div className="page-layout">
      <aside className="page-sidebar">
        <div className="brand-title">Cotele Dunării</div>
        <div className="brand-subtitle">Stații • hartă • grafice</div>

        <label className="sidebar-label">Caută stația</label>
        <select
          className="sidebar-select"
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
        >
          {stations.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="legend" style={{ marginTop: 12 }}>
          <div>
            <span className="dot dot-red" /> roșu = variație negativă
          </div>
          <div>
            <span className="dot dot-green" /> verde = variație pozitivă
          </div>
          <div>
            <span className="dot dot-black" /> negru = variație 0
          </div>
          <div>
            <span className="dot dot-gray" /> gri = fără date
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,45,70,0.65)" }}>
          Range: 1 m • ok
        </div>

        {/* ⭐ WIDGET TULCEA - SUB LEGENDĂ */}
        <div style={{ marginTop: 16 }}>
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
        />
      </main>
    </div>
  );
}

// ⭐ Component widget optimizat pentru sidebar
function TulceaFlowWidgetSidebar({ latestData }) {
  const flowInfo = useMemo(() => {
    if (!latestData?.nivel_cm) return null;

    // Import funcție de calcul
    const { getFlowInfo } = require('./lib/flowCalculator');
    return getFlowInfo(latestData.nivel_cm);
  }, [latestData]);

  if (!flowInfo) return null;

  const barHeight = Math.min(100, (flowInfo.nivel_cm / 400) * 100);

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${flowInfo.color}22, ${flowInfo.color}44)`,
          padding: '12px 14px',
          borderBottom: `2px solid ${flowInfo.color}`,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color: '#111827' }}>
          🌊 TULCEA
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
          Debit Dunăre
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        {/* Nivel + Debit în 2 coloane */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, marginBottom: 3 }}>
              Nivel
            </div>
            <div style={{ fontSize: 16, fontWeight: 950, color: '#111827' }}>
              {flowInfo.nivel_cm} cm
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 700, marginBottom: 3 }}>
              Debit
            </div>
            <div style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>
              {flowInfo.debit_m3s?.toLocaleString()} <span style={{ fontSize: 10 }}>m³/s</span>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 999,
            background: `${flowInfo.color}22`,
            border: `1.5px solid ${flowInfo.color}`,
            fontSize: 10,
            fontWeight: 900,
            color: flowInfo.color,
          }}
        >
          {flowInfo.emoji} {flowInfo.label}
        </div>

        {/* Bară mini progres */}
        <div
          style={{
            marginTop: 10,
            height: 6,
            background: '#f3f4f6',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${barHeight}%`,
              background: `linear-gradient(90deg, ${flowInfo.color}, ${flowInfo.color}dd)`,
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        {/* Note + link INHGA */}
        <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 8, lineHeight: 1.3 }}>
          ⚠️ Debit estimat. Date oficiale:{' '}
          <a
            href="https://www.hidro.ro/"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}
          >
            INHGA
          </a>
        </div>
      </div>
    </div>
  );
}