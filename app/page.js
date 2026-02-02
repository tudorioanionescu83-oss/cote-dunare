"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import StationPanel from "./components/StationPanel";
import { STATIONS } from "./lib/stations";

const MapView = dynamic(() => import("./components/MapView"), { ssr: false });

export default function Page() {
  const [selectedStation, setSelectedStation] = useState("Tulcea");
  const [latestByName, setLatestByName] = useState({});
  const [chartRows, setChartRows] = useState([]);
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const stations = useMemo(() => STATIONS, []);

  const selectedStationObj = useMemo(
    () => stations.find((s) => s.name === selectedStation) || stations[0],
    [stations, selectedStation]
  );

  // load latest
  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      try {
        const res = await fetch("/api/latest");
        const j = await res.json();
        if (!cancelled) setLatestByName(j.byName || {});
      } catch (e) {}
    }

    loadLatest();
    const t = setInterval(loadLatest, 60_000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // load chart data
  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      if (!selectedStation) return;
      setLoading(true);

      try {
        const res = await fetch(
          `/api/measurements?station=${encodeURIComponent(selectedStation)}&days=${periodDays}`
        );
        const j = await res.json();
        if (!cancelled) setChartRows(j.rows || []);
      } catch (e) {
        if (!cancelled) setChartRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChart();
    return () => {
      cancelled = true;
    };
  }, [selectedStation, periodDays]);

  return (
    <div className="page-layout">
      {/* Slide 1: Sidebar */}
      <aside className="page-sidebar">
        <div className="brand-title">COTELE DUNĂRII</div>
        <div className="brand-subtitle">Stații · Hartă · Grafice</div>

        <label className="sidebar-label">Caută stația</label>

        <select
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
          className="sidebar-select"
        >
          {stations.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="legend">
          <div><span className="dot dot-red">●</span> roșu = variație negativă</div>
          <div><span className="dot dot-green">●</span> verde = variație pozitivă</div>
          <div><span className="dot dot-black">●</span> negru = variație 0</div>
          <div><span className="dot dot-gray">●</span> gri = fără date</div>
        </div>

        <div className="mobile-hint">
          ← glisează pentru hartă & grafic →
        </div>
      </aside>

      {/* Slide 2: Main */}
      <main className="page-main">
        <MapView
          latestByName={latestByName}
          selectedStation={selectedStation}
          onPickStation={(name) => setSelectedStation(name)}
        />

        <StationPanel
          station={selectedStationObj}
          latest={latestByName[selectedStation]}
          chartData={chartRows}
          period={periodDays}
          onPeriodChange={setPeriodDays}
          loading={loading}
        />
      </main>
    </div>
  );
}
