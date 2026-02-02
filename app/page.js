// app/page.js
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import StationPanel from "./components/StationPanel";
import { STATIONS } from "./lib/stations";

// IMPORTANT: evită "window is not defined" pentru leaflet
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
        if (!cancelled) {
          setLatestByName(j.byName || {});
        }
      } catch (e) {
        // silent fail
      }
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
      {/* Sidebar */}
      <aside className="page-sidebar">
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>Cotele Dunării</div>
        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>Stații + hartă + grafice</div>

        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
          Caută stația
        </label>

        <select
          value={selectedStation}
          onChange={(e) => setSelectedStation(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            outline: "none",
            fontWeight: 700,
          }}
        >
          {stations.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 12, fontSize: 12, color: "#374151", lineHeight: 1.4 }}>
          <div>
            <span style={{ color: "#dc2626", fontWeight: 800 }}>●</span> roșu = variație negativă
          </div>
          <div>
            <span style={{ color: "#16a34a", fontWeight: 800 }}>●</span> verde = variație pozitivă
          </div>
          <div>
            <span style={{ color: "#111827", fontWeight: 800 }}>●</span> negru = variație 0
          </div>
          <div>
            <span style={{ color: "#9ca3af", fontWeight: 800 }}>●</span> gri = fără date
          </div>
        </div>
      </aside>

      {/* Main */}
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
