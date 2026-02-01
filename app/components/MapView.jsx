// app/components/MapView.jsx
"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { STATIONS, colorFromDelta, toNumberOrNull } from "../lib/stations";

export default function MapView({
  latestByName = {},      // { "Galati": { nivel_cm, variatie_cm, temperatura_c, km, data } ... }
  selectedStation = "",
  onPickStation = () => {},
}) {
  const center = [44.8, 26.2];

  // calculăm bounds/center “ok” fără să depindem de window
  const points = useMemo(
    () => STATIONS.map((s) => [s.lat, s.lng]),
    []
  );

  return (
    <div style={{ width: "100%", height: 360, borderRadius: 16, overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <MapContainer center={center} zoom={6} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {STATIONS.map((s) => {
          const latest = latestByName?.[s.name];
          const delta = toNumberOrNull(latest?.variatie_cm);
          const color = colorFromDelta(delta);

          const isSelected = selectedStation === s.name;

          // marker mai mare + ring când e selectat
          const radius = isSelected ? 10 : 8;

          return (
            <CircleMarker
              key={s.name}
              center={[s.lat, s.lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? "#111827" : "#0f172a",
                weight: isSelected ? 3 : 1,
                fillColor: color,
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => onPickStation(s.name),
              }}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{s.name}</div>

                  <div style={{ fontSize: 12, lineHeight: 1.35 }}>
                    <div><b>Km:</b> {latest?.km ?? "—"}</div>
                    <div><b>Nivel:</b> {latest?.nivel_cm ?? "—"} cm</div>
                    <div><b>Δ:</b> {latest?.variatie_cm ?? "—"} cm</div>
                    <div><b>Temp:</b> {latest?.temperatura_c ?? "—"} °C</div>
                    <div><b>Data:</b> {latest?.data ?? "—"}</div>
                  </div>

                  <button
                    onClick={() => onPickStation(s.name)}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      background: "#111827",
                      color: "white",
                      border: 0,
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Deschide grafic
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
