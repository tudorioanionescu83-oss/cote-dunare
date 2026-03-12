"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import MarineSummaryCards from "./MarineSummaryCards";
import MarineMeteoSection from "./MarineMeteoSection";

const MarineMapsPanel = dynamic(() => import("./MarineMapsPanel"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 12,
        background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
        padding: 14,
        color: "#64748b",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      Se incarca harta marina...
    </div>
  ),
});

const ROMANIA_TZ = "Europe/Bucharest";
const DEFAULT_STATION_IMAGE = "/stations/default.jpg";
const PLACEHOLDER_STATION_IMAGE = "/stations/placeholder.jpg";

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = new Intl.DateTimeFormat("ro-RO", {
    timeZone: ROMANIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("day")}.${part("month")}.${part("year")}, ora ${part("hour")}:${part("minute")}`;
}

export default function MarineStationPanel({
  station,
  current,
  timeseries,
  forecast,
  layers = [],
  loading = false,
  error = "",
}) {
  const wikiTitle = useMemo(() => station?.wikiTitle || station?.name || "Constanta", [station?.wikiTitle, station?.name]);

  const [wiki, setWiki] = useState({
    loading: true,
    found: false,
    title: wikiTitle,
    extract: "",
    url: null,
    image: null,
  });
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadWiki() {
      if (!wikiTitle) {
        setWiki({ loading: false, found: false, title: "Constanta", extract: "", url: null, image: null });
        return;
      }

      setWiki((prev) => ({
        ...prev,
        loading: true,
        found: false,
        title: wikiTitle,
        extract: "",
        url: null,
        image: null,
      }));

      try {
        const response = await fetch(`/api/wiki?title=${encodeURIComponent(wikiTitle)}`);
        const payload = await response.json();
        if (cancelled) return;

        setWiki({
          loading: false,
          found: !!payload?.found,
          title: payload?.title || wikiTitle,
          extract: payload?.extract || "",
          url: payload?.url || null,
          image: payload?.image || null,
        });
      } catch {
        if (cancelled) return;
        setWiki({
          loading: false,
          found: false,
          title: wikiTitle,
          extract: "",
          url: null,
          image: null,
        });
      }
    }

    loadWiki();

    return () => {
      cancelled = true;
    };
  }, [wikiTitle]);

  const imageCandidates = useMemo(() => {
    const list = [];

    const stationPhoto = typeof station?.photoUrl === "string" ? station.photoUrl.trim() : "";
    const wikiPhoto = typeof wiki?.image === "string" ? wiki.image.trim() : "";

    if (stationPhoto && stationPhoto !== PLACEHOLDER_STATION_IMAGE) list.push(stationPhoto);
    if (wikiPhoto) list.push(wikiPhoto);
    if (stationPhoto) list.push(stationPhoto);

    list.push(DEFAULT_STATION_IMAGE);

    return list.filter((value, index) => value && list.indexOf(value) === index);
  }, [station?.photoUrl, wiki?.image]);

  useEffect(() => {
    setImageIndex(0);
  }, [station?.id, station?.name, station?.photoUrl, wiki?.image]);

  const activeImage = imageCandidates[Math.min(imageIndex, Math.max(0, imageCandidates.length - 1))] || DEFAULT_STATION_IMAGE;
  const hasImageFallback = imageIndex < imageCandidates.length - 1;

  return (
    <section
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 20,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 16px 14px 16px",
          background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 60%, #0284c7 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 950, lineHeight: 1.1 }}>{station?.displayName || station?.name || "Constanta"}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 800,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            Tip statie: Marina
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            Sursa: {current?.source || "Copernicus Marine"}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            Ultima actualizare: {formatTimestamp(current?.timestamp)}
          </span>
        </div>
      </div>

      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        {loading && <div style={{ fontSize: 13, color: "#64748b" }}>Se incarca datele marine...</div>}
        {!!error && !loading && (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Eroare date marine: {error}
          </div>
        )}

        <div
          id="marine-context-section"
          style={{
            border: "1px solid #dbeafe",
            borderRadius: 14,
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            padding: 12,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>Constanta pe scurt</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                border: "1px solid #dbeafe",
                borderRadius: 12,
                overflow: "hidden",
                background: "#f8fafc",
                minHeight: 170,
                maxHeight: 190,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={station?.displayName || station?.name || "Constanta"}
                style={{
                  width: "100%",
                  height: "clamp(170px, 18vw, 190px)",
                  minHeight: 170,
                  maxHeight: 190,
                  objectFit: "cover",
                  display: "block",
                }}
                onError={() => {
                  if (hasImageFallback) setImageIndex((prev) => prev + 1);
                }}
              />
            </div>

            <div
              style={{
                border: "1px solid #dbeafe",
                borderRadius: 12,
                padding: 12,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                display: "grid",
                alignContent: "start",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>Wikipedia</div>

              {wiki.loading ? (
                <div style={{ color: "#64748b", fontSize: 13 }}>Se incarca informatiile...</div>
              ) : wiki.found ? (
                <>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>{wiki.title}</div>
                  <div
                    style={{
                      color: "#334155",
                      fontSize: 13,
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 6,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {wiki.extract}
                  </div>
                  {wiki.url && (
                    <a
                      href={wiki.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginTop: 2,
                        width: "fit-content",
                        color: "#0284c7",
                        fontWeight: 800,
                        fontSize: 13,
                        textDecoration: "none",
                      }}
                    >
                      Deschide Wikipedia
                    </a>
                  )}
                </>
              ) : (
                <div style={{ color: "#64748b", fontSize: 13 }}>Nu exista informatii Wikipedia disponibile.</div>
              )}
            </div>
          </div>
        </div>

        <div id="marine-summary-section">
          <MarineSummaryCards current={current || {}} />
        </div>

        <div id="marine-maps-section">
          <MarineMapsPanel station={station || { lat: 44.17, lng: 28.65 }} current={current} timeseries={timeseries} forecast={forecast} layers={layers} />
        </div>

        <MarineMeteoSection station={station} />
      </div>
    </section>
  );
}
