"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import FastSidebar from "./FastSidebar";

const FastMap = dynamic(() => import("./FastMap"), {
  ssr: false,
  loading: () => <div className="fast-map-loading">Se încarcă harta FAST...</div>,
});

export default function FastPreviewPage() {
  const [metadata, setMetadata] = useState(null);
  const [selectedPcCode, setSelectedPcCode] = useState(null);
  const [selectionRequestId, setSelectionRequestId] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      try {
        const response = await fetch("/fast/metadata.json", { cache: "force-cache" });
        if (!response.ok) {
          console.warn(`[FAST] Metadata indisponibilă (${response.status})`);
          return;
        }

        const payload = await response.json();
        if (!cancelled) {
          setMetadata(payload);
        }
      } catch (error) {
        console.warn("[FAST] Nu am putut încărca metadata.", error);
      }
    }

    loadMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  const pcIntervals = metadata?.pc_intervals || [];
  const monitoringOverview = metadata?.monitoring_overview || null;

  function handleSelectPc(pcCode) {
    setSelectedPcCode(pcCode);
    setSelectionRequestId((value) => value + 1);
    setSidebarOpen(true);
  }

  return (
    <main className="fast-page">
      <header className="fast-header">
        <div>
          <p className="fast-kicker">FAST Danube</p>
          <h1>FAST Danube 2 – Planning Map</h1>
          <p>
            Critical points, Danube km references and ichthyofauna/sturgeon monitoring overview
          </p>
        </div>
        <Link href="/" className="fast-back-link">
          Back to Cote
        </Link>
      </header>

      <section className="fast-workspace">
        <FastSidebar
          pcIntervals={pcIntervals}
          monitoringOverview={monitoringOverview}
          selectedPcCode={selectedPcCode}
          onSelectPc={handleSelectPc}
          isOpen={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((value) => !value)}
        />

        <div className="fast-map-panel">
          <FastMap
            selectedPcCode={selectedPcCode}
            selectionRequestId={selectionRequestId}
            onSelectPc={handleSelectPc}
          />
        </div>
      </section>
    </main>
  );
}
