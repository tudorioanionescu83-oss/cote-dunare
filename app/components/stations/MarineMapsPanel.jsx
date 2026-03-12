"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Pane, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TAB_CONFIG = [
  { id: "temperature", label: "Temperatura", unit: "°C" },
  { id: "salinity", label: "Salinitate", unit: "PSU" },
  { id: "currents", label: "Curenti", unit: "m/s" },
  { id: "waves", label: "Valuri", unit: "m" },
  { id: "bathymetry", label: "Batimetrie", unit: "m" },
  { id: "forecast", label: "Prognoza", unit: "m" },
];

const SPEED_PRESETS = [
  { id: "slow", label: "0.5x", intervalMs: 1800 },
  { id: "normal", label: "1x", intervalMs: 1100 },
  { id: "fast", label: "2x", intervalMs: 650 },
];

const ROMANIA_TZ = "Europe/Bucharest";

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

function defaultPalette() {
  return [
    [30, 64, 175],
    [14, 165, 233],
    [16, 185, 129],
    [250, 204, 21],
    [249, 115, 22],
    [220, 38, 38],
  ];
}

function bathymetryPalette() {
  return [
    [191, 219, 254],
    [125, 211, 252],
    [56, 189, 248],
    [14, 116, 144],
    [15, 23, 42],
  ];
}

function colorForValue(value, range, palette) {
  if (!Number.isFinite(Number(value))) return "#94a3b8";
  const t = (Number(value) - range.min) / Math.max(1e-6, range.max - range.min);
  return interpolateColor(palette || defaultPalette(), t);
}

function computeRange(values, fallbackValue = null) {
  const numeric = (values || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (Number.isFinite(Number(fallbackValue))) numeric.push(Number(fallbackValue));
  if (!numeric.length) return { min: 0, max: 1 };

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  if (max - min < 1e-9) return { min: min - 0.5, max: max + 0.5 };
  const pad = (max - min) * 0.12;
  return { min: min - pad, max: max + pad };
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

function valueByTimePoint(point, layerId) {
  if (!point) return null;
  if (layerId === "temperature") return point.waterTemperature;
  if (layerId === "salinity") return point.salinity;
  if (layerId === "currents") return point.currentSpeed;
  if (layerId === "waves" || layerId === "forecast") return point.waveHeight;
  return null;
}

function nearestGridPointValue(latlng, points) {
  if (!latlng || !Array.isArray(points) || points.length === 0) return null;
  let best = null;
  let bestDist = Infinity;
  for (const point of points) {
    const dLat = Number(point.lat) - Number(latlng.lat);
    const dLon = Number(point.lon) - Number(latlng.lng);
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = point;
    }
  }
  return best?.value ?? null;
}

export default function MarineMapsPanel({ station, current, timeseries, forecast, layers = { layers: [] } }) {
  const [activeLayer, setActiveLayer] = useState("temperature");
  const [clickedPoint, setClickedPoint] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMode, setSpeedMode] = useState("normal");
  const [bathymetryData, setBathymetryData] = useState({ loading: false, points: [], minValue: null, maxValue: null });

  const layerPayload = useMemo(() => (Array.isArray(layers) ? { layers } : layers || { layers: [] }), [layers]);
  const layerList = layerPayload?.layers || [];
  const layerSnapshot = layerPayload?.snapshot || null;
  const bathymetryMeta = layerPayload?.bathymetry || null;

  useEffect(() => {
    let cancelled = false;
    const url = bathymetryMeta?.pointsUrl;
    if (!url) {
      setBathymetryData({ loading: false, points: [], minValue: null, maxValue: null });
      return undefined;
    }

    async function loadBathymetry() {
      setBathymetryData((prev) => ({ ...prev, loading: true }));
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Bathymetry HTTP ${response.status}`);
        const payload = await response.json();
        if (cancelled) return;
        const points = Array.isArray(payload?.points) ? payload.points : [];
        setBathymetryData({
          loading: false,
          points,
          minValue: Number.isFinite(Number(payload?.minValue)) ? Number(payload.minValue) : null,
          maxValue: Number.isFinite(Number(payload?.maxValue)) ? Number(payload.maxValue) : null,
        });
      } catch {
        if (cancelled) return;
        setBathymetryData({ loading: false, points: [], minValue: null, maxValue: null });
      }
    }

    loadBathymetry();
    return () => {
      cancelled = true;
    };
  }, [bathymetryMeta?.pointsUrl]);

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
    if (!isPlaying || points.length < 2 || activeLayer === "bathymetry") return undefined;
    const preset = SPEED_PRESETS.find((item) => item.id === speedMode) || SPEED_PRESETS[1];
    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev >= points.length - 1 ? 0 : prev + 1));
    }, preset.intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, points.length, speedMode, activeLayer]);

  const activeTab = TAB_CONFIG.find((item) => item.id === activeLayer) || TAB_CONFIG[0];
  const layerMeta = layerList.find((layer) => layer.id === activeLayer);

  const activeGridPoints = useMemo(() => {
    if (activeLayer === "temperature") return layerSnapshot?.temperaturePoints || [];
    if (activeLayer === "salinity") return layerSnapshot?.salinityPoints || [];
    if (activeLayer === "waves" || activeLayer === "forecast") return layerSnapshot?.wavePoints || [];
    if (activeLayer === "bathymetry") return bathymetryData.points || [];
    return [];
  }, [activeLayer, layerSnapshot, bathymetryData.points]);

  const currentVectors = useMemo(() => (activeLayer === "currents" ? layerSnapshot?.currentVectors || [] : []), [
    activeLayer,
    layerSnapshot,
  ]);

  const timelineValue = valueByTimePoint(selectedPoint || current, activeLayer);
  const clickedGridValue = useMemo(() => nearestGridPointValue(clickedPoint, activeGridPoints), [clickedPoint, activeGridPoints]);
  const activeValue = clickedGridValue ?? timelineValue;

  const scalarValues = activeGridPoints.map((point) => Number(point.value)).filter((v) => Number.isFinite(v));
  const vectorValues = currentVectors.map((point) => Number(point.speed)).filter((v) => Number.isFinite(v));
  const rangeValues = activeLayer === "currents" ? vectorValues : scalarValues;
  const layerRange = computeRange(rangeValues, activeValue);
  const palette = activeLayer === "bathymetry" ? bathymetryPalette() : defaultPalette();
  const activeColor = colorForValue(activeValue, layerRange, palette);

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
  const hasSingleCurrentVector = Number.isFinite(currentDirection) && Number.isFinite(currentSpeed);
  const vectorDistanceKm = Math.max(1.1, Math.min(12, (Number.isFinite(currentSpeed) ? currentSpeed : 0.2) * 20));
  const stationLat = Number(station?.lat ?? 44.17);
  const stationLng = Number(station?.lng ?? station?.lon ?? 28.65);
  const mapCenter = [stationLat, stationLng];
  const vectorTo = hasSingleCurrentVector ? destinationPoint(stationLat, stationLng, currentDirection, vectorDistanceKm) : mapCenter;

  const showScalarGrid = activeLayer !== "currents" && activeGridPoints.length > 0;
  const showVectorGrid = activeLayer === "currents" && currentVectors.length > 0;
  const showLegacyCircles = !showScalarGrid && !showVectorGrid;
  const hasPlayback = activeLayer !== "bathymetry";

  const gradientBar =
    activeLayer === "bathymetry"
      ? "linear-gradient(90deg,#bfdbfe 0%,#7dd3fc 22%,#38bdf8 44%,#0e7490 66%,#0f172a 100%)"
      : "linear-gradient(90deg,#1e40af 0%,#0ea5e9 22%,#10b981 44%,#facc15 66%,#f97316 83%,#dc2626 100%)";

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
            <span>
              Min: {formatNumber(activeLayer === "bathymetry" ? bathymetryData.minValue ?? layerRange.min : layerRange.min, 2)} {activeTab.unit}
            </span>
            <span>
              Max: {formatNumber(activeLayer === "bathymetry" ? bathymetryData.maxValue ?? layerRange.max : layerRange.max, 2)} {activeTab.unit}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #cbd5e1" }}>
          <MapContainer center={mapCenter} zoom={9} style={{ height: 360, width: "100%" }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickCapture onMapClick={setClickedPoint} />

            {showScalarGrid && (
              <Pane name="marine-grid-scalars" style={{ zIndex: 430 }}>
                {activeGridPoints.map((point, index) => {
                  const color = colorForValue(point.value, layerRange, palette);
                  return (
                    <CircleMarker
                      key={`${activeLayer}-pt-${index}`}
                      center={[point.lat, point.lon]}
                      radius={3.6}
                      pathOptions={{
                        color,
                        weight: 0.4,
                        fillColor: color,
                        fillOpacity: 0.68,
                      }}
                    />
                  );
                })}
              </Pane>
            )}

            {showVectorGrid && (
              <Pane name="marine-grid-vectors" style={{ zIndex: 450 }}>
                {currentVectors.map((vector, index) => {
                  const end = destinationPoint(vector.lat, vector.lon, vector.direction, Math.max(0.45, Math.min(3.8, vector.speed * 9)));
                  const color = colorForValue(vector.speed, layerRange, defaultPalette());
                  return (
                    <Polyline
                      key={`vec-${index}`}
                      positions={[[vector.lat, vector.lon], end]}
                      pathOptions={{ color, weight: 1.6, opacity: 0.85 }}
                    />
                  );
                })}
              </Pane>
            )}

            {showLegacyCircles && (
              <Pane name="marine-overlay" style={{ zIndex: 420 }}>
                <Circle center={mapCenter} radius={42000} pathOptions={{ color: activeColor, weight: 1.2, fillColor: activeColor, fillOpacity: 0.14 }} />
                <Circle center={mapCenter} radius={26000} pathOptions={{ color: activeColor, weight: 1.2, fillColor: activeColor, fillOpacity: 0.2 }} />
                <Circle center={mapCenter} radius={13000} pathOptions={{ color: activeColor, weight: 1.4, fillColor: activeColor, fillOpacity: 0.28 }} />
              </Pane>
            )}

            {!showVectorGrid && hasSingleCurrentVector && (
              <Pane name="marine-current-vector-single" style={{ zIndex: 500 }}>
                <Polyline positions={[mapCenter, vectorTo]} pathOptions={{ color: activeColor, weight: 3, opacity: 0.9 }} />
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
                    Timp: {formatTimestamp(selectedPoint?.timestamp || layerSnapshot?.timestamp || current?.timestamp)}
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
            <div>Puncte colorate: camp scalar Copernicus (temperatura / salinitate / valuri / batimetrie)</div>
            <div>Linii colorate: vectori curenti Copernicus (directie + viteza)</div>
            <div>Click pe harta: citire valoare din cel mai apropiat punct de grila</div>
            {bathymetryData.loading && activeLayer === "bathymetry" && <div>Se incarca batimetria...</div>}
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
                  cursor: hasPlayback && points.length > 1 ? "pointer" : "not-allowed",
                  opacity: hasPlayback && points.length > 1 ? 1 : 0.55,
                }}
                disabled={!hasPlayback || points.length < 2}
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

          {!hasPlayback ? (
            <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>Batimetria este statica (fara selector temporal).</div>
          ) : !points.length ? (
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
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.waterTemperature, 1)} °C</td>
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
