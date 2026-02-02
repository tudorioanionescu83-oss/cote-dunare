"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitBoundsOnce({ bounds }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!fitted.current && bounds && bounds.length) {
      map.fitBounds(bounds, { padding: [24, 24] });
      fitted.current = true;
    }
  }, [bounds, map]);

  return null;
}

export default function MapView({ latestByName = {}, selectedStation, onPickStation }) {
  // extrage coordonatele disponibile
  const points = Object.entries(latestByName)
    .map(([name, v]) => ({
      name,
      lat: Number(v?.lat),
      lng: Number(v?.lng),
      nivel: v?.nivel_cm,
      temp: v?.temperatura_c,
    }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const bounds = points.map(p => [p.lat, p.lng]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        height: 420,
        overflow: "hidden",      // CRUCIAL pt. mobil
        borderRadius: 16,
      }}
    >
      <MapContainer
        style={{ width: "100%", height: "100%" }}  // NU folosi vw aici
        center={[45.2, 28.8]}
        zoom={7}
        scrollWheelZoom={false}
        tap={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map(p => (
          <CircleMarker
            key={p.name}
            center={[p.lat, p.lng]}
            radius={p.name === selectedStation ? 8 : 6}
            pathOptions={{
              color: p.name === selectedStation ? "#111827" : "#0077b6",
              weight: 2,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: () => onPickStation?.(p.name),
            }}
          >
            <Popup>
              <div style={{ fontWeight: 800 }}>{p.name}</div>
              <div>Nivel: {p.nivel ?? "—"} cm</div>
              <div>Temp: {p.temp ?? "—"} °C</div>
            </Popup>
          </CircleMarker>
        ))}

        <FitBoundsOnce bounds={bounds} />
      </MapContainer>
    </div>
  );
}
