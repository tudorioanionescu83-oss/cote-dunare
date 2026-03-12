"use client";

import React, { useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TAB_CONFIG = [
  { id: "temperature", label: "Temperatura", unit: "°C" },
  { id: "salinity", label: "Salinitate", unit: "PSU" },
  { id: "currents", label: "Curenti", unit: "m/s" },
  { id: "waves", label: "Valuri", unit: "m" },
  { id: "forecast", label: "Prognoza", unit: "m" },
];

function valueByLayer(point, layerId) {
  if (!point) return null;
  if (layerId === "temperature") return point.waterTemperature;
  if (layerId === "salinity") return point.salinity;
  if (layerId === "currents") return point.currentSpeed;
  if (layerId === "waves" || layerId === "forecast") return point.waveHeight;
  return null;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace(".000Z", "Z");
}

function MapClickCapture({ onMapClick }) {
  useMapEvents({
    click: (event) => onMapClick(event.latlng),
  });
  return null;
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

export default function MarineMapsPanel({ station, current, timeseries, forecast, layers = [] }) {
  const [activeLayer, setActiveLayer] = useState("temperature");
  const [clickedPoint, setClickedPoint] = useState(null);
  const points = timeseries?.points || [];
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(points.length - 1, 0));

  const selectedPoint = useMemo(() => {
    if (!points.length) return null;
    const safeIndex = Math.max(0, Math.min(selectedIndex, points.length - 1));
    return points[safeIndex];
  }, [points, selectedIndex]);

  const activeTab = TAB_CONFIG.find((item) => item.id === activeLayer) || TAB_CONFIG[0];
  const activeValue = valueByLayer(selectedPoint || current, activeLayer);
  const layerMeta = layers.find((layer) => layer.id === activeLayer);

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
          Layer activ: <b>{layerMeta?.label || activeTab.label}</b> | Valoare punctuala:{" "}
          <b>
            {formatNumber(activeValue, 2)} {activeTab.unit}
          </b>
        </div>
      </div>

      <div style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TAB_CONFIG.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveLayer(tab.id)} style={layerButtonStyle(tab.id === activeLayer)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #cbd5e1" }}>
          <MapContainer center={[station.lat, station.lng]} zoom={9} style={{ height: 320, width: "100%" }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickCapture onMapClick={setClickedPoint} />
            <Marker position={[station.lat, station.lng]} icon={markerIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{station.displayName || station.name}</div>
                  <div>
                    {activeTab.label}:{" "}
                    <b>
                      {formatNumber(activeValue, 2)} {activeTab.unit}
                    </b>
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
            <div>Click pe harta: afiseaza coordonata selectata</div>
            <div>Slider timp: navigare in seria temporala</div>
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
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Time selector</div>
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
                Timestep: {Math.min(selectedIndex + 1, points.length)} / {points.length} |{" "}
                <b>{formatTimestamp(selectedPoint?.timestamp)}</b>
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
                    <th style={{ padding: "6px 4px" }}>Timp (UTC)</th>
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
