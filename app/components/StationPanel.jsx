"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import StationChart from "./StationChart";
import WeatherWidget from "./WeatherWidget";
import { stationSlug } from "../lib/stations";

const PERIODS = [
  { days: 7, label: "Ultimele 7 zile" },
  { days: 30, label: "Ultima lună" },
  { days: 365, label: "Ultimul an" },
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

/* =========================
   FUNDAL CARDURI (ajustat)
   - Nivel: NU se colorează
   - Δ: verde/roșu + (0 => gri deschis)
   - Temp: pe intervale
   - transparență +5% (0.50)
   ========================= */
const CARD_ALPHA = 0.5; // +5% față de 0.45
const rgba = (r, g, b, a = CARD_ALPHA) => `rgba(${r}, ${g}, ${b}, ${a})`;

function deltaCardBg(deltaNum) {
  const d = typeof deltaNum === "number" && Number.isFinite(deltaNum) ? deltaNum : null;
  if (d === null) return "linear-gradient(180deg, #ffffff, #fafafa)";

  if (d > 0) return rgba(34, 197, 94); // verde
  if (d < 0) return rgba(239, 68, 68); // roșu

  // Δ = 0 => gri deschis
  return rgba(229, 231, 235); // #e5e7eb cu transparență
}

function tempCardBg(tempNum) {
  const t = typeof tempNum === "number" && Number.isFinite(tempNum) ? tempNum : null;
  if (t === null) return "linear-gradient(180deg, #ffffff, #fafafa)";

  if (t < 0) return rgba(30, 58, 138); // albastru inchis
  if (t < 5) return rgba(56, 189, 248); // albastru deschis
  if (t < 10) return rgba(253, 224, 71); // galben deschis
  if (t < 15) return rgba(234, 179, 8); // galben mai inchis
  if (t < 20) return rgba(249, 115, 22); // portocaliu
  if (t < 25) return rgba(248, 113, 113); // rosu deschis
  return rgba(185, 28, 28); // rosu mai inchis
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
  // vechi
  station,
  latest,
  chartData,
  period,
  onPeriodChange,
  loading = false,

  // nou (din DashboardClient-ul tău)
  series,
  days,
  setDays,
  onPeriodRangeChange,
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

  // ✅ custom range UI
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customErr, setCustomErr] = useState("");

  // ✅ NOU: tracking dacă suntem în custom mode
  const [isCustomActive, setIsCustomActive] = useState(false);

  // datele pentru chart (merge și cu vechiul și cu noul)
  const rows = chartData ?? series ?? [];

  // starea perioadei (vechi: period, nou: days)
  const activePeriod = isCustomActive ? null : (period ?? days ?? 30);

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

  // auto-fill date inputs din datele existente (UX)
  useEffect(() => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const dates = rows
      .map((p) => toYMD(p.date || p.time || p.ts || p.data))
      .filter(Boolean)
      .sort();
    if (!dates.length) return;

    setCustomTo((prev) => prev || dates[dates.length - 1]);
    setCustomFrom((prev) => prev || dates[Math.max(0, dates.length - 2)]);
  }, [rows]);

  const delta = latest?.variatie_cm;
  const deltaNum = delta === null || delta === undefined ? null : Number(delta);
  const badgeKind = deltaNum === null ? "na" : deltaNum > 0 ? "pos" : deltaNum < 0 ? "neg" : "zero";

  const tempRaw = latest?.temperatura_c;
  const tempNum =
    tempRaw === null || tempRaw === undefined || tempRaw === "—" ? null : Number(tempRaw);

  // ✅ click preset: folosește vechiul handler dacă există, altfel setDays
  const handlePreset = useCallback(
    (d) => {
      setCustomOpen(false);
      setCustomErr("");
      setIsCustomActive(false); // dezactivează custom mode

      if (typeof onPeriodChange === "function") onPeriodChange(d);
      else if (typeof setDays === "function") setDays(d);
    },
    [onPeriodChange, setDays]
  );

  const applyDisabled = typeof onPeriodRangeChange !== "function";

  const applyCustom = useCallback(() => {
    setCustomErr("");

    if (!customFrom || !customTo) {
      setCustomErr("Alege ambele date.");
      return;
    }

    const dd = diffDaysUTC(customFrom, customTo);
    if (!(dd >= 1)) {
      setCustomErr("Selectează minim 2 zile consecutive.");
      return;
    }

    const success = onPeriodRangeChange(customFrom, customTo);
    if (!success) {
      setCustomErr("Intervalul selectat nu este valid.");
      return;
    }

    setIsCustomActive(true); // activează custom mode
    setCustomOpen(false);
  }, [customFrom, customTo, onPeriodRangeChange]);

  return (
    <>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          background: "#ffffff",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Desktop: imagine + descriere side by side */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 16,
            padding: 16,
            minWidth: 0,
          }}
          className="desktop-layout"
        >
          {/* coloana stânga = imagine + nume */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                position: "relative",
                minWidth: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={name}
                onError={() => setImgOk(false)}
                onClick={openLightbox}
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  cursor: imgOk ? "pointer" : "default",
                  objectFit: "cover",
                }}
              />
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: 20,
                fontWeight: 950,
                color: "#111827",
                marginTop: 2,
              }}
            >
              {name}
            </div>

            {latest?.data && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: "#6b7280",
                  fontWeight: 900,
                  marginTop: 0,
                }}
              >
                Ultima măsurătoare: {latest.data}
              </div>
            )}
          </div>

          {/* coloana dreapta = carduri + wiki + perioade */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            {/* carduri 1-line */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Nivel", value: latest?.nivel_cm ?? "—", unit: "cm" },
                { label: "Δ", value: latest?.variatie_cm ?? "—", unit: "cm" },
                { label: "Temp", value: latest?.temperatura_c ?? "—", unit: "°C" },
                { label: "Km", value: latest?.km ?? "—", unit: "" },
              ].map((c) => {
                let bg = "linear-gradient(180deg, #ffffff, #fafafa)";
                if (c.label === "Δ") bg = deltaCardBg(deltaNum);
                if (c.label === "Temp") bg = tempCardBg(tempNum);

                return (
                  <div
                    key={c.label}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 12,
                      background: bg,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 950,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.value}{" "}
                      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                        {c.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* wiki */}
            <div style={{ marginTop: 4, fontSize: 15, color: "#374151", lineHeight: 1.45, minWidth: 0 }}>
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
                      <a
                        href={wiki.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#111827", fontWeight: 900 }}
                      >
                        Deschide Wikipedia →
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: "#9ca3af" }}>Nu am găsit rezumat Wikipedia pentru „{name}".</div>
              )}
            </div>

            {/* perioade */}
            <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => handlePreset(p.days)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: activePeriod === p.days ? "#111827" : "#ffffff",
                    color: activePeriod === p.days ? "white" : "#111827",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </button>
              ))}

              <button
                onClick={() => {
                  setCustomOpen((v) => !v);
                  setCustomErr("");
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: customOpen ? "#111827" : "#ffffff",
                  color: customOpen ? "white" : "#111827",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                Altă perioadă
              </button>
            </div>

            {customOpen && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 10,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>De la</div>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>Până la</div>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  />
                </div>

                <button
                  onClick={applyCustom}
                  disabled={applyDisabled}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: applyDisabled ? "#9ca3af" : "#111827",
                    color: "white",
                    fontWeight: 900,
                    cursor: applyDisabled ? "not-allowed" : "pointer",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    opacity: applyDisabled ? 0.85 : 1,
                  }}
                  title={applyDisabled ? "Lipsește onPeriodRangeChange în părinte" : "Aplică intervalul"}
                >
                  Aplică
                </button>

                {customErr && (
                  <div style={{ width: "100%", color: "#991b1b", fontSize: 12, fontWeight: 800 }}>
                    {customErr}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: "0 16px 16px 16px", minWidth: 0 }}>
          {loading ? (
            <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>Se încarcă graficul…</div>
          ) : (
            <StationChart rows={rows} />
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
