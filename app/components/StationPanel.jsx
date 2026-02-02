"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import StationChart from "./StationChart";
import WeatherWidget from "./WeatherWidget";
import { stationSlug } from "../lib/stations";

const PERIODS = [
  { days: 1, label: "1 zi" },
  { days: 30, label: "1 lună" },
  { days: 90, label: "3 luni" },
  { days: 365, label: "1 an" },
];

function badgeStyle(kind) {
  if (kind === "pos")
    return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (kind === "neg")
    return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (kind === "zero")
    return { background: "#e5e7eb", color: "#111827", border: "1px solid #d1d5db" };
  return { background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" };
}

export default function StationPanel({
  station,
  latest,
  chartData,
  period,
  onPeriodChange,
  loading = false,
}) {
  const name = station?.name || station?.localitatea || "Stație";
  const slug = useMemo(() => stationSlug(name), [name]);
  const imgUrl = `/stations/${slug}.jpg`;

  const [wiki, setWiki] = useState({ loading: true, found: false, extract: "", url: null });

  // meteo
  const [weather, setWeather] = useState({ loading: true, ok: false });

  // lightbox (popup imagine) – doar desktop
  const [imgOk, setImgOk] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => {
    // doar desktop (nu pe mobil/tablet)
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
    return () => {
      cancelled = true;
    };
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
        const r = await fetch(
          `/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
        );
        const j = await r.json();
        if (!cancelled) setWeather({ loading: false, ...j });
      } catch {
        if (!cancelled) setWeather({ loading: false, ok: false });
      }
    }

    loadWeather();
    const t = setInterval(loadWeather, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [
    station?.lat,
    station?.latitude,
    station?.Latitude,
    station?.lon,
    station?.lng,
    station?.longitudine,
    station?.Longitudine,
  ]);

  const delta = latest?.variatie_cm;
  const deltaNum = delta === null || delta === undefined ? null : Number(delta);
  const badgeKind = deltaNum === null ? "na" : deltaNum > 0 ? "pos" : deltaNum < 0 ? "neg" : "zero";

  return (
    <>
      <section
        style={{
          background: "white",
          borderRadius: 18,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div className="panel-header" style={{ padding: 16, minWidth: 0 }}>
          {/* imagine mare */}
          <div
            className="panel-image"
            role="button"
            tabIndex={0}
            onClick={openLightbox}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openLightbox();
            }}
            style={{
              width: "100%",
              height: 160,
              borderRadius: 16,
              overflow: "hidden",
              background: "linear-gradient(180deg,#f3f4f6,#eef2f7)",
              border: "1px solid #e5e7eb",
              minWidth: 0,
              cursor: imgOk ? "zoom-in" : "default",
              outline: "none",
            }}
            title={imgOk ? "Click pentru a mări (desktop)" : ""}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imgOk && (
              <img
                src={imgUrl}
                alt={name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover", // rămâne cover (frumos pe desktop și mobil)
                  display: "block",
                }}
                onError={() => {
                  setImgOk(false);
                }}
              />
            )}
          </div>

          {/* titlu + mini stats */}
          <div className="panel-info" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                minWidth: 0,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.1,
                    wordBreak: "break-word",
                  }}
                >
                  {name}
                </div>

                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    marginTop: 6,
                    lineHeight: 1.35,
                    wordBreak: "break-word",
                  }}
                >
                  Ultima citire: <b>{latest?.data ?? "—"}</b> · Nivel:{" "}
                  <b>{latest?.nivel_cm ?? "—"} cm</b> · Δ: <b>{latest?.variatie_cm ?? "—"} cm</b> · T:{" "}
                  <b>{latest?.temperatura_c ?? "—"} °C</b>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontWeight: 900,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    ...badgeStyle(badgeKind),
                  }}
                >
                  Δ {deltaNum === null ? "—" : deltaNum > 0 ? `+${deltaNum}` : `${deltaNum}`} cm
                </span>

                <select
                  value={name}
                  onChange={() => {}}
                  disabled
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontWeight: 800,
                    color: "#111827",
                    maxWidth: "100%",
                  }}
                >
                  <option>{name}</option>
                </select>
              </div>
            </div>

            {/* cards */}
            <div
              className="panel-cards"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 10,
                minWidth: 0,
              }}
            >
              {[
                { label: "Nivel", value: latest?.nivel_cm ?? "—", unit: "cm" },
                { label: "Δ", value: latest?.variatie_cm ?? "—", unit: "cm" },
                { label: "Temp", value: latest?.temperatura_c ?? "—", unit: "°C" },
                { label: "Km", value: latest?.km ?? "—", unit: "" },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: "linear-gradient(180deg, #ffffff, #fafafa)",
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{c.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 950, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.value}{" "}
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{c.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* wiki */}
            <div style={{ marginTop: 4, fontSize: 13, color: "#374151", lineHeight: 1.45, minWidth: 0 }}>
              {wiki.loading ? (
                <div style={{ color: "#9ca3af" }}>Se încarcă rezumatul Wikipedia…</div>
              ) : wiki.found ? (
                <>
                  <div
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    {wiki.extract}
                  </div>
                  {wiki.url && (
                    <div style={{ marginTop: 6 }}>
                      <a href={wiki.url} target="_blank" rel="noreferrer" style={{ color: "#111827", fontWeight: 900 }}>
                        Deschide Wikipedia →
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: "#9ca3af" }}>Nu am găsit rezumat Wikipedia pentru „{name}”.</div>
              )}
            </div>

            {/* perioade */}
            <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => onPeriodChange?.(p.days)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: period === p.days ? "#111827" : "#ffffff",
                    color: period === p.days ? "white" : "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: "0 16px 16px 16px", minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>Se încarcă graficul…</div>
          ) : (
            <StationChart rows={chartData} />
          )}
        </div>

        {/* Meteo SUB grafice */}
        <div style={{ padding: "0 16px 16px 16px", minWidth: 0 }}>
          {weather.loading ? (
            <div style={{ padding: 12, color: "#9ca3af", fontSize: 13 }}>Se încarcă meteo…</div>
          ) : (
            <WeatherWidget weather={weather} />
          )}
        </div>
      </section>

      {/* LIGHTBOX (doar desktop, deschis la click pe poză) */}
      {lightboxOpen && (
        <div className="img-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true">
          <div className="img-lightbox__panel" onClick={(e) => e.stopPropagation()}>
            <button className="img-lightbox__close" onClick={closeLightbox} aria-label="Închide">
              ✕
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="img-lightbox__img" src={imgUrl} alt={name} />

            <div className="img-lightbox__caption">{name}</div>
          </div>
        </div>
      )}
    </>
  );
}
