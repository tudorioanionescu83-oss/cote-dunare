"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import FastDetailCard from "./FastDetailCard";
import FastPcSlider from "./FastPcSlider";
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
  const [detailOpen, setDetailOpen] = useState(false);

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
  const selectedInterval =
    pcIntervals.find((interval) => interval.pc_code === selectedPcCode) || null;

  function handleSelectPc(pcCode) {
    setSelectedPcCode(pcCode);
    setSelectionRequestId((value) => value + 1);
    setDetailOpen(true);
    setSidebarOpen(false);
  }

  return (
    <main className="fast-page">
      <header className="fast-header">
        <div>
          <p className="fast-kicker">FAST Danube</p>
          <h1>FAST Danube 2</h1>
          <p>Monitorizarea impactului asupra mediului</p>
        </div>
        <Link href="/" className="fast-back-link">
          Back to Cote
        </Link>
      </header>

      <FastPcSlider
        pcIntervals={pcIntervals}
        selectedPcCode={selectedPcCode}
        onSelectPc={handleSelectPc}
      />

      <section className="fast-workspace">
        <FastSidebar
          pcIntervals={pcIntervals}
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
            isPcDetailOpen={detailOpen}
          />
          <FastDetailCard
            interval={selectedInterval}
            isOpen={detailOpen}
            onClose={() => setDetailOpen(false)}
          />
        </div>
      </section>
    </main>
  );
}
