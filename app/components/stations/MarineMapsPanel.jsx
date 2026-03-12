"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, Pane, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TAB_CONFIG = [
  { id: "temperature", label: "Temperatura", unit: "\u00B0C" },
  { id: "salinity", label: "Salinitate", unit: "PSU" },
  { id: "currents", label: "Curenti", unit: "m/s" },
  { id: "waves", label: "Valuri", unit: "m" },
  { id: "forecast", label: "Prognoza", unit: "m" },
];

const SPEED_PRESETS = [
  { id: "slow", label: "0.5x", intervalMs: 1800 },
  { id: "normal", label: "1x", intervalMs: 1100 },
  { id: "fast", label: "2x", intervalMs: 650 },
];

const ROMANIA_TZ = "Europe/Bucharest";

function valueByLayer(point, layerId) {
  if (!point) return null;
  if (layerId === "temperature") return point.waterTemperature;
  if (layerId === "salinity") return point.salinity;
  if (layerId === "currents") return point.currentSpeed;
  if (layerId === "waves" || layerId === "forecast") return point.waveHeight;
  return null;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

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

function toHex(value) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function interpolateColor(stops, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.floor(scaled);
  const nextIdx = Math.min(stops.length - 1, idx + 1);
  const localT = scaled - idx;

  const [r1, g1, b1] = stops[idx];
  const [r2, g2, b2] = stops[nextIdx];
  const r = r1 + (r2 - r1) * localT;
  const g = g1 + (g2 - g1) * localT;
  const b = b1 + (b2 - b1) * localT;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function computeRange(points, layerId, fallbackValue) {
  const values = (points || [])
    .map((point) => valueByLayer(point, layerId))
    .map((v) => (v === null || v === undefined ? NaN : Number(v)))
    .filter((v) => Number.isFinite(v));

  if (Number.isFinite(Number(fallbackValue))) values.push(Number(fallbackValue));
  if (!values.length) return { min: 0, max: 1 };

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return { min: min - 0.5, max: max + 0.5 };

  const pad = (max - min) * 0.12;
  return { min: min - pad, max: max + pad };
}

function colorForValue(value, range) {
  if (!Number.isFinite(Number(value))) return "#94a3b8";
  const t = (Number(value) - range.min) / Math.max(1e-6, range.max - range.min);
  return interpolateColor(
    [
      [30, 64, 175],
      [14, 165, 233],
      [16, 185, 129],
      [250, 204, 21],
      [249, 115, 22],
      [220, 38, 38],
    ],
    t
  );
}

function destinationPoint(latDeg, lonDeg, bearingDeg, distanceKm) {
  const R = 6371;
  const lat1 = (latDeg * Math.PI) / 180;
  const lon1 = (lonDeg * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distanceKm / R;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 =
    lon1 +
    Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));

  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}

function layerButtonStyle(active) {
  return {
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    padding: "7px 12px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    background: active ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "white",
    color: active ? "white" : "#0f172a",
  };
}

function MapClickCapture({ onMapClick }) {
  useMapEvents({
    click: (event) => onMapClick(event.latlng),
  });
  return null;
}

export default function MarineMapsPanel({ station, current, timeseries, forecast, layers = [] }) {
  const [activeLayer, setActiveLayer] = useState("temperature");
  const [clickedPoint, setClickedPoint] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMode, setSpeedMode] = useState("normal");

  const points = useMemo(() => {
    if (activeLayer === "forecast") return forecast?.points || [];
    return timeseries?.points || [];
  }, [activeLayer, forecast?.points, timeseries?.points]);

  const selectedPoint = useMemo(() => {
    if (!points.length) return null;
    const safeIndex = Math.max(0, Math.min(selectedIndex, points.length - 1));
    return points[safeIndex];
  }, [points, selectedIndex]);

  useEffect(() => {
    if (!points.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, points.length - 1)));
  }, [points.length]);

  useEffect(() => {
    if (!isPlaying || points.length < 2) return undefined;
    const preset = SPEED_PRESETS.find((item) => item.id === speedMode) || SPEED_PRESETS[1];
    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev >= points.length - 1 ? 0 : prev + 1));
    }, preset.intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, points.length, speedMode]);

  const activeTab = TAB_CONFIG.find((item) => item.id === activeLayer) || TAB_CONFIG[0];
  const activeValue = valueByLayer(selectedPoint || current, activeLayer);
  const layerMeta = layers.find((layer) => layer.id === activeLayer);
  const layerRange = useMemo(() => computeRange(points, activeLayer, activeValue), [points, activeLayer, activeValue]);
  const activeColor = colorForValue(activeValue, layerRange);

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        html:
          '<div style="width:22px;height:22px;border-radius:50%;background:#0284c7;border:3px solid #fff;box-shadow:0 0 0 2px #0369a1;"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    []
  );

  const currentDirection = Number(selectedPoint?.currentDirection ?? current?.currentDirection);
  const currentSpeed = Number(selectedPoint?.currentSpeed ?? current?.currentSpeed);
  const hasCurrentVector = Number.isFinite(currentDirection) && Number.isFinite(currentSpeed);
  const vectorDistanceKm = Math.max(1.1, Math.min(12, (Number.isFinite(currentSpeed) ? currentSpeed : 0.2) * 20));
  const stationLat = Number(station?.lat ?? 44.17);
  const stationLng = Number(station?.lng ?? station?.lon ?? 28.65);
  const mapCenter = [stationLat, stationLng];
  const vectorTo = hasCurrentVector ? destinationPoint(stationLat, stationLng, currentDirection, vectorDistanceKm) : mapCenter;

  const arrowIcon = useMemo(() => {
    if (!hasCurrentVector) return null;
    const rotate = Number(currentDirection);
    return L.divIcon({
      html: `<div style="
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 16px solid ${activeColor};
        transform: rotate(${rotate}deg);
        transform-origin: 50% 65%;
        filter: drop-shadow(0 0 3px rgba(15,23,42,0.45));
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });
  }, [hasCurrentVector, currentDirection, activeColor]);

  const gradientBar = "linear-gradient(90deg,#1e40af 0%,#0ea5e9 22%,#10b981 44%,#facc15 66%,#f97316 83%,#dc2626 100%)";

  return (
    <section
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 16,
        background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 14, borderBottom: "1px solid #dbeafe" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Harti interactive si predictii marine</div>
        <div style={{ marginTop: 6, color: "#334155", fontSize: 13 }}>
          Layer activ: <b>{layerMeta?.label || activeTab.label}</b> | Valoare punctuala: <b>{formatNumber(activeValue, 2)} {activeTab.unit}</b>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TAB_CONFIG.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveLayer(tab.id)} style={layerButtonStyle(tab.id === activeLayer)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>Legenda dinamica layer</div>
          <div style={{ height: 10, borderRadius: 999, background: gradientBar, border: "1px solid #cbd5e1" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
            <span>Min: {formatNumber(layerRange.min, 2)} {activeTab.unit}</span>
            <span>Max: {formatNumber(layerRange.max, 2)} {activeTab.unit}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #cbd5e1" }}>
          <MapContainer center={mapCenter} zoom={9} style={{ height: 360, width: "100%" }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickCapture onMapClick={setClickedPoint} />

            <Pane name="marine-overlay" style={{ zIndex: 420 }}>
              <Circle center={mapCenter} radius={42000} pathOptions={{ color: activeColor, weight: 1.2, fillColor: activeColor, fillOpacity: 0.14 }} />
              <Circle center={mapCenter} radius={26000} pathOptions={{ color: activeColor, weight: 1.2, fillColor: activeColor, fillOpacity: 0.2 }} />
              <Circle center={mapCenter} radius={13000} pathOptions={{ color: activeColor, weight: 1.4, fillColor: activeColor, fillOpacity: 0.28 }} />
            </Pane>

            {hasCurrentVector && (
              <Pane name="marine-current-vector" style={{ zIndex: 500 }}>
                <Polyline positions={[mapCenter, vectorTo]} pathOptions={{ color: activeColor, weight: 3, opacity: 0.9 }} />
                {arrowIcon ? <Marker position={vectorTo} icon={arrowIcon} /> : null}
              </Pane>
            )}

            <Marker position={mapCenter} icon={markerIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{station?.displayName || station?.name || "Constanta"}</div>
                  <div>
                    {activeTab.label}: <b>{formatNumber(activeValue, 2)} {activeTab.unit}</b>
                  </div>
                  <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                    Timp: {formatTimestamp(selectedPoint?.timestamp || current?.timestamp)}
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, background: "white" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Legenda</div>
          <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#334155" }}>
            <div>Punct albastru: statia Constanta (marina)</div>
            <div>Overlay colorat: intensitatea layer-ului activ in jurul statiei</div>
            <div>Vector curent: directie si intensitate estimate din timestep</div>
            <div>Click pe harta: afiseaza coordonata selectata</div>
            {clickedPoint && (
              <div>
                Coordonata selectata: <b>{clickedPoint.lat.toFixed(4)}</b>, <b>{clickedPoint.lng.toFixed(4)}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, background: "white" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800 }}>Time selector + playback</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "6px 12px",
                  background: isPlaying ? "#0284c7" : "white",
                  color: isPlaying ? "white" : "#0f172a",
                  fontWeight: 800,
                  cursor: points.length > 1 ? "pointer" : "not-allowed",
                  opacity: points.length > 1 ? 1 : 0.55,
                }}
                disabled={points.length < 2}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              {SPEED_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSpeedMode(preset.id)}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: speedMode === preset.id ? "#0ea5e9" : "white",
                    color: speedMode === preset.id ? "white" : "#0f172a",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {!points.length ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>Nu exista timeseries marine in cache.</div>
          ) : (
            <>
              <input
                type="range"
                min={0}
                max={Math.max(0, points.length - 1)}
                value={Math.min(selectedIndex, Math.max(0, points.length - 1))}
                onChange={(event) => setSelectedIndex(Number(event.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
                Timestep: {Math.min(selectedIndex + 1, points.length)} / {points.length} | <b>{formatTimestamp(selectedPoint?.timestamp)}</b>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "0 12px 14px 12px" }}>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, background: "white" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Predictii marine (urmatoarele timesteps)</div>
          {!forecast?.points?.length ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>Nu exista forecast in cache.</div>
          ) : (
            <div style={{ maxHeight: 210, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "6px 4px" }}>Timp (RO)</th>
                    <th style={{ padding: "6px 4px" }}>Temp apa</th>
                    <th style={{ padding: "6px 4px" }}>Curent</th>
                    <th style={{ padding: "6px 4px" }}>Val</th>
                    <th style={{ padding: "6px 4px" }}>Salinitate</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.points.slice(0, 32).map((point) => (
                    <tr key={point.timestamp} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "6px 4px" }}>{formatTimestamp(point.timestamp)}</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.waterTemperature, 1)} \u00B0C</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.currentSpeed, 2)} m/s</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.waveHeight, 2)} m</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.salinity, 2)} PSU</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
