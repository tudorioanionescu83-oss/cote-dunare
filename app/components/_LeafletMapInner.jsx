// app/components/LeafletMapInner.jsx
"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

function colorForDelta(delta) {
  if (delta === null || delta === undefined) return "#9CA3AF"; // gri
  const v = Number(delta);
  if (Number.isNaN(v)) return "#9CA3AF";
  if (v > 0) return "#16A34A"; // verde
  if (v < 0) return "#DC2626"; // rosu
  return "#111827"; // negru
}

export default function LeafletMapInner({ stations = [], latestByStation = {}, onSelectStation }) {
  const safeSelect = typeof onSelectStation === "function" ? onSelectStation : () => {};

  const center = [45.2, 28.7];
  const zoom = 5;

  return (
    <div className="w-full h-[420px] rounded-xl overflow-hidden shadow-sm">
      <MapContainer center={center} zoom={zoom} style={{ height: "420px", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stations.map((s) => {
          const name = s.name || s.statie || s.station;
          const lat = Number(s.lat);
          const lng = Number(s.lng);

          if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return null;

          const latest = latestByStation?.[name] || null;

          const nivel = latest?.nivel_cm ?? null;
          const delta = latest?.variatie_cm ?? null;
          const temp = latest?.temperatura_c ?? null;
          const km = latest?.km ?? s.km ?? null;
          const dateStr = latest?.data ?? null;

          const col = colorForDelta(delta);

          return (
            <CircleMarker
              key={name}
              center={[lat, lng]}
              radius={7}
              pathOptions={{ color: col, fillColor: col, fillOpacity: 0.85 }}
              eventHandlers={{
                click: () => safeSelect(name),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{name}</div>
                  <div>Km: {km ?? "—"}</div>
                  <div>Nivel: {nivel ?? "—"} cm</div>
                  <div>Δ: {delta ?? "—"} cm</div>
                  <div>Temp: {temp ?? "—"} °C</div>
                  <div>Data: {dateStr ?? "—"}</div>
                  <button
                    className="mt-2 px-3 py-1 rounded bg-slate-900 text-white text-xs"
                    onClick={() => safeSelect(name)}
                    type="button"
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
