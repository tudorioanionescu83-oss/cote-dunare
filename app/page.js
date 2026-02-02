"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import StationPanel from "./components/StationPanel";

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
