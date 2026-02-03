"use client";

import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function pick(obj, keys, fallback = null) {
  if (!obj) return fallback;
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function toNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  // prinde si stringuri gen "+12 cm", "0", "-3", "2.5 °C"
  const s = String(v)
    .replace(",", ".")
    .replace(/[^0-9.\-+]/g, "");
  if (!s) return null;

  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

function fmtAt(value) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

// legenda: verde >0, rosu <0, negru =0, gri = fara date
function colorByDelta(delta) {
  if (delta === null) return { fill: "#94a3b8", stroke: "#64748b" }; // gri
  if (delta > 0) return { fill: "#22c55e", stroke: "#166534" };      // verde
  if (delta < 0) return { fill: "#ef4444", stroke: "#7f1d1d" };      // rosu
  return { fill: "#111827", stroke: "#111827" };                     // negru
}

/* =========================
   Popup text colors (Solicitarea 4)
   DOAR pentru Δ si Temp
   ========================= */
function popupDeltaTextStyle(delta) {
  if (delta === null) return {}; // nu coloram daca nu avem date
  if (delta > 0) return { color: "#166534" }; // verde inchis
  if (delta < 0) return { color: "#7f1d1d" }; // rosu inchis
  return { color: "#374151" }; // 0 => gri inchis (text)
}

function popupTempTextStyle(temp) {
  if (temp === null) return {}; // nu coloram daca nu avem date

  if (temp < 0) return { color: "#1e3a8a" };  // albastru inchis
  if (temp < 5) return { color: "#0284c7" };  // albastru deschis (mai lizibil decat sky foarte pal)
  if (temp < 10) return { color: "#a16207" }; // galben deschis (text) -> ocru pt lizibilitate
  if (temp < 15) return { color: "#854d0e" }; // galben mai inchis (text)
  if (temp < 20) return { color: "#c2410c" }; // portocaliu
  if (temp < 25) return { color: "#dc2626" }; // rosu deschis (text)
  return { color: "#991b1b" };                // rosu inchis (text)
}

export default function LeafletMapInner({
  stations = [],
  latestByName = {},
  selectedStation,
  onSelectStation,
}) {
  // normalizeaza statia: API stations are lat/lng + name
  const pts = useMemo(() => {
    return (stations || [])
      .map((s) => {
        const name = pick(s, ["name", "localitatea", "station"], null);
        const lat = toNum(pick(s, ["lat", "latitude", "Latitude"], null));
        const lng = toNum(pick(s, ["lng", "lon", "longitude", "Longitudine"], null));
        const km = toNum(pick(s, ["km"], null));
        const wikiTitle = pick(s, ["wikiTitle", "wiki"], null);

        if (!name || lat === null || lng === null) return null;
        return { name, lat, lng, km, wikiTitle };
      })
      .filter(Boolean);
  }, [stations]);

  // centru: pe statia selectata daca exista
  const center = useMemo(() => {
    const sel = pts.find((p) => p.name === selectedStation);
    if (sel) return [sel.lat, sel.lng];

    if (pts.length) {
      const latAvg = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
      const lngAvg = pts.reduce((a, p) => a + p.lng, 0) / pts.length;
      return [latAvg, lngAvg];
    }
    return [45.9, 27.9];
  }, [pts, selectedStation]);

  return (
    <div style={{ width: "100%" }}>
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        style={{ height: 420, width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pts.map((s) => {
          // IMPORTANT: latest object keys in your DB/API are:
          // nivel_cm, variatie_cm, temperatura_c, data, created_at, km
          const latest = latestByName?.[s.name] || null;

          const nivel = toNum(
            pick(latest, ["nivel_cm", "level_cm", "levelCm", "nivel", "level"], null)
          );
          const delta = toNum(
            pick(latest, ["variatie_cm", "delta_cm", "deltaCm", "delta", "diff_cm", "diffCm"], null)
          );
          const temp = toNum(
            pick(latest, ["temperatura_c", "temp_c", "tempC", "temp", "temperatura"], null)
          );
          const at = pick(latest, ["data", "created_at", "at", "time", "timestamp", "updatedAt"], null);
          const kmLatest = toNum(pick(latest, ["km"], null));

          const { fill, stroke } = colorByDelta(delta);
          const isSel = selectedStation === s.name;

          return (
            <CircleMarker
              key={s.name}
              center={[s.lat, s.lng]}
              radius={isSel ? 10 : 7}
              pathOptions={{
                color: stroke,
                weight: isSel ? 3 : 2,
                fillColor: fill,
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => onSelectStation?.(s.name),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ fontWeight: 900 }}>{s.name}</div>
              </Tooltip>

              <Popup>
                <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 6 }}>
                  {s.name}
                </div>

                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <div><b>Nivel:</b> {nivel === null ? "—" : nivel} cm</div>

                  {/* Δ: text color + font +1 (doar aici) */}
                  <div style={{ fontSize: 13 }}>
                    <b>Δ:</b>{" "}
                    <span style={popupDeltaTextStyle(delta)}>
                      {delta === null ? "—" : delta}
                    </span>{" "}
                    cm
                  </div>

                  {/* Temp: text color + font +1 (doar aici) */}
                  <div style={{ fontSize: 13 }}>
                    <b>Temp:</b>{" "}
                    <span style={popupTempTextStyle(temp)}>
                      {temp === null ? "—" : temp}
                    </span>{" "}
                    °C
                  </div>

                  <div style={{ marginTop: 6, opacity: 0.75 }}>
                    <b>Ultima citire:</b> {fmtAt(at)}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.75 }}>
                    <b>Km:</b>{" "}
                    {kmLatest !== null ? kmLatest : (s.km !== null ? s.km : "—")}
                  </div>
                </div>

                <button
                  onClick={() => onSelectStation?.(s.name)}
                  style={{
                    marginTop: 10,
                    borderRadius: 10,
                    border: "1px solid rgba(0,119,182,0.18)",
                    padding: "8px 10px",
                    fontWeight: 900,
                    cursor: "pointer",
                    background: "rgba(0,119,182,0.10)",
                  }}
                >
                  Selectează stația
                </button>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
