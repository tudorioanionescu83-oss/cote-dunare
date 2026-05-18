"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import FastDetailCard from "./FastDetailCard";
import { t } from "./fastI18n";
import FastPcSlider from "./FastPcSlider";
import FastSidebar from "./FastSidebar";

const FastMap = dynamic(() => import("./FastMap"), {
  ssr: false,
  loading: () => <div className="fast-map-loading">Loading FAST map...</div>,
});

export default function FastPreviewPage() {
  const [metadata, setMetadata] = useState(null);
  const [language, setLanguage] = useState("en");
  const [languageReady, setLanguageReady] = useState(false);
  const [selectedPcCode, setSelectedPcCode] = useState(null);
  const [selectionRequestId, setSelectionRequestId] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCollapseRequestId, setDetailCollapseRequestId] = useState(0);

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

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("fastLanguage");
    if (storedLanguage === "ro" || storedLanguage === "en") {
      setLanguage(storedLanguage);
    }
    setLanguageReady(true);
  }, []);

  useEffect(() => {
    if (!languageReady) return;
    window.localStorage.setItem("fastLanguage", language);
  }, [language, languageReady]);

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
          <p>{t("impactMonitoring", language)}</p>
        </div>
        <div className="fast-header-actions">
          <Link href="/" className="fast-back-link">
            {t("backToCote", language)}
          </Link>
          <div className="fast-language-switch" role="group" aria-label="Language">
            <button
              type="button"
              className={language === "ro" ? "is-active" : ""}
              onClick={() => setLanguage("ro")}
              aria-pressed={language === "ro"}
            >
              <span aria-hidden="true">🇷🇴</span> RO
            </button>
            <button
              type="button"
              className={language === "en" ? "is-active" : ""}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              <span aria-hidden="true">🇬🇧</span> EN
            </button>
          </div>
        </div>
      </header>

      <FastPcSlider
        pcIntervals={pcIntervals}
        selectedPcCode={selectedPcCode}
        onSelectPc={handleSelectPc}
        language={language}
      />

      <section className="fast-workspace">
        <FastSidebar
          pcIntervals={pcIntervals}
          selectedPcCode={selectedPcCode}
          onSelectPc={handleSelectPc}
          isOpen={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((value) => !value)}
          language={language}
        />

        <div className="fast-map-panel">
          <FastMap
            selectedPcCode={selectedPcCode}
            selectionRequestId={selectionRequestId}
            onSelectPc={handleSelectPc}
            isPcDetailOpen={detailOpen}
            onHabitatControlOpen={() =>
              setDetailCollapseRequestId((value) => value + 1)
            }
            language={language}
          />
          <FastDetailCard
            interval={selectedInterval}
            isOpen={detailOpen}
            onClose={() => setDetailOpen(false)}
            collapseRequestId={detailCollapseRequestId}
            language={language}
          />
        </div>
      </section>
    </main>
  );
}
