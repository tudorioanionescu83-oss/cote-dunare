"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  ScaleControl,
  LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ===== UTILITY FUNCTIONS =====
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
  const s = String(v).replace(",", ".").replace(/[^0-9.\-+]/g, "");
  if (!s) return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

function fmtAt(value) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== ICON CREATION =====
function createTriangleIcon(delta, isSelected = false, isRiver = false) {
  const size = isSelected ? 32 : 26;
  const riverColor = "#0284c7";
  const riverStroke = "#0369a1";
  
  let color, strokeColor;
  
  if (delta === null) {
    if (isRiver) {
      color = riverColor;
      strokeColor = riverStroke;
    } else {
      color = "#94a3b8";
      strokeColor = "#64748b";
    }
    return L.divIcon({
      html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${color}" stroke="${strokeColor}" stroke-width="2"/></svg>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  } else if (delta > 0) {
    color = "#22c55e";
    strokeColor = "#166534";
    return L.divIcon({
      html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 4L20 18H4L12 4Z" fill="${color}" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round"/></svg>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  } else if (delta < 0) {
    color = "#ef4444";
    strokeColor = "#991b1b";
    return L.divIcon({
      html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform: rotate(180deg);"><path d="M12 4L20 18H4L12 4Z" fill="${color}" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round"/></svg>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  } else {
    color = "#374151";
    strokeColor = "#111827";
    return L.divIcon({
      html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" fill="${color}" stroke="${strokeColor}" stroke-width="2" transform="rotate(45 12 12)"/></svg>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }
}

function trendArrow(trend) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "";
}

function tempStyle(temp) {
  if (temp === null) return {};
  if (temp < 5) return { color: "#0284c7" };
  if (temp < 15) return { color: "#059669" };
  if (temp < 25) return { color: "#ea580c" };
  return { color: "#dc2626" };
}

// ===== CUSTOM MAP CONTROLS =====
function MapControls({ defaultCenter, defaultZoom, onLockToggle, isLocked }) {
  const map = useMap();
  
  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleHome = () => map.setView(defaultCenter, defaultZoom);
  const handleLock = () => {
    if (isLocked) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      if (map.touchZoom) map.touchZoom.enable();
    } else {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      if (map.touchZoom) map.touchZoom.disable();
    }
    onLockToggle(!isLocked);
  };

  const btnStyle = {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    border: "2px solid rgba(0,0,0,0.2)",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
    transition: "all 0.2s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  };

  const activeBtnStyle = {
    ...btnStyle,
    background: "#0284c7",
    color: "white",
    borderColor: "#0284c7",
  };

  return (
    <div style={{
      position: "absolute",
      top: 10,
      right: 10,
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <button 
        onClick={handleZoomIn} 
        style={btnStyle}
        title="Zoom In"
      >
        +
      </button>
      <button 
        onClick={handleZoomOut} 
        style={btnStyle}
        title="Zoom Out"
      >
        −
      </button>
      <button 
        onClick={handleHome} 
        style={btnStyle}
        title="Revenire la zona principală"
      >
        🏠
      </button>
      <button 
        onClick={handleLock} 
        style={isLocked ? activeBtnStyle : btnStyle}
        title={isLocked ? "Deblocare hartă" : "Blocare hartă"}
      >
        {isLocked ? "🔒" : "🔓"}
      </button>
    </div>
  );
}

// ===== STATION MARKER WITH AUTO-CLOSE =====
function StationMarker({ position, icon, name, children, onSelect, autoCloseDelay = 5000 }) {
  const markerRef = useRef(null);
  const timeoutRef = useRef(null);

  const handlePopupOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (markerRef.current) markerRef.current.closePopup();
    }, autoCloseDelay);
  };

  const handlePopupClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Fix pentru Safari/iOS - adăugăm tap event
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    
    const element = marker.getElement?.();
    if (!element) return;
    
    const handleTouchEnd = (e) => {
      e.preventDefault();
      e.stopPropagation();
      marker.openPopup();
      onSelect?.();
    };
    
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSelect]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => {
          onSelect?.();
        },
        popupopen: handlePopupOpen,
        popupclose: handlePopupClose,
      }}
    >
      <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{name}</div>
      </Tooltip>
      {children}
    </Marker>
  );
}

// ===== MAIN COMPONENT =====
export default function LeafletMapInner({
  stations = [],
  latestByName = {},
  riverStations = [],
  selectedStation,
  onSelectStation,
  fullscreen = false,
}) {
  const [isLocked, setIsLocked] = useState(false);
  
  const DEFAULT_CENTER = [45.5, 25.5];
  const DEFAULT_ZOOM = 6;

  const pts = useMemo(() => {
    return (stations || [])
      .map((s) => {
        const name = pick(s, ["name", "localitatea", "station"], null);
        const lat = toNum(pick(s, ["lat", "latitude", "Latitude"], null));
        const lng = toNum(pick(s, ["lng", "lon", "longitude", "Longitudine"], null));
        if (!name || lat === null || lng === null) return null;
        return { name, lat, lng, type: "dunare" };
      })
      .filter(Boolean);
  }, [stations]);

  const riverPts = useMemo(() => {
    return (riverStations || [])
      .map((s) => {
        const name = s.name;
        const lat = toNum(s.lat || s.latitude);
        const lng = toNum(s.lng || s.longitude);
        const river = s.river;
        const latest = s.latest;
        if (!name || lat === null || lng === null) return null;
        return { name, lat, lng, river, latest, type: "river" };
      })
      .filter(Boolean);
  }, [riverStations]);

  const center = useMemo(() => {
    const allPts = [...pts, ...riverPts];
    const sel = allPts.find((p) => p.name === selectedStation);
    if (sel) return [sel.lat, sel.lng];
    return DEFAULT_CENTER;
  }, [pts, riverPts, selectedStation]);

  return (
    <div style={{ width: "100%", borderRadius: fullscreen ? 0 : 16, overflow: "hidden", position: "relative" }}>
      {/* CSS pentru Safari/iOS touch fix */}
      <style>{`
        .leaflet-marker-icon {
          cursor: pointer !important;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .leaflet-popup-content-wrapper {
          touch-action: auto;
        }
        .leaflet-container {
          touch-action: pan-x pan-y;
          -webkit-user-select: none;
          user-select: none;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={!isLocked}
        dragging={!isLocked}
        doubleClickZoom={!isLocked}
        touchZoom={!isLocked}
        zoomControl={false}
        style={{ height: fullscreen ? "100vh" : 450, width: "100%" }}
      >
        {/* Layer Control - Satelit / Hartă / Râuri */}
        <LayersControl position="topleft">
          <LayersControl.BaseLayer checked name="Hartă Standard">
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satelit">
            <TileLayer
              attribution="&copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Teren">
            <TileLayer
              attribution="&copy; OpenTopoMap"
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Râuri și Ape">
            <TileLayer
              url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
              opacity={0.7}
            />
          </LayersControl.Overlay>
        </LayersControl>

        {/* Scara */}
        <ScaleControl position="bottomleft" imperial={false} />

        {/* Controale custom */}
        <MapControls 
          defaultCenter={DEFAULT_CENTER} 
          defaultZoom={DEFAULT_ZOOM}
          isLocked={isLocked}
          onLockToggle={setIsLocked}
        />

        {/* Stații Dunăre */}
        {pts.map((s) => {
          const latest = latestByName?.[s.name] || null;
          const nivel = toNum(pick(latest, ["nivel_cm", "level_cm", "nivel"], null));
          const delta = toNum(pick(latest, ["variatie_cm", "delta_cm", "delta"], null));
          const temp = toNum(pick(latest, ["temperatura_c", "temp_c", "temp"], null));
          const at = pick(latest, ["data", "created_at", "at", "time"], null);
          const debit = toNum(pick(latest, ["debit_mc_s"], null));
          const debitTrend = pick(latest, ["debit_trend"], null);
          const isSel = selectedStation === s.name;
          const icon = createTriangleIcon(delta, isSel, false);

          return (
            <StationMarker
              key={s.name}
              position={[s.lat, s.lng]}
              icon={icon}
              name={s.name}
              onSelect={() => onSelectStation?.(s.name)}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#0369a1", marginBottom: 4 }}>
                    Dunărea
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    {s.name}
                  </div>
                  
                  {nivel !== null && (
                    <div style={{ fontSize: 13, marginBottom: 3 }}>
                      <strong>Nivel:</strong> {nivel} cm
                      {delta !== null && (
                        <span style={{ marginLeft: 6, color: delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#6b7280" }}>
                          ({delta > 0 ? "+" : ""}{delta})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {debit !== null && (
                    <div style={{ fontSize: 13, marginBottom: 3 }}>
                      <strong>Debit:</strong>{" "}
                      <span style={{ color: "#0284c7", fontWeight: 700 }}>{debit.toLocaleString()}</span> m³/s
                    </div>
                  )}
                  
                  {temp !== null && (
                    <div style={{ fontSize: 13, marginBottom: 3 }}>
                      <strong>Temp:</strong> <span style={tempStyle(temp)}>{temp} °C</span>
                    </div>
                  )}
                  
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    Citire: {fmtAt(at)}
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Sursa: AFDJ.ro</div>
                  
                  <button
                    onClick={() => onSelectStation?.(s.name)}
                    style={{
                      marginTop: 10,
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #0369a1, #0284c7)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Selectează stația
                  </button>
                </div>
              </Popup>
            </StationMarker>
          );
        })}

        {/* Stații Râuri */}
        {riverPts.map((s) => {
          const latest = s.latest || {};
          const nivel = toNum(latest.nivel_cm);
          const debit = toNum(latest.debit_mc_s);
          const temp = toNum(latest.temperatura_c);
          const at = latest.data;
          const nivelTrend = latest.nivel_trend;

          let delta = null;
          if (nivelTrend === "up") delta = 1;
          else if (nivelTrend === "down") delta = -1;
          else if (nivelTrend === "stable") delta = 0;

          const isSel = selectedStation === s.name;
          const icon = createTriangleIcon(delta, isSel, true);

          return (
            <StationMarker
              key={s.name}
              position={[s.lat, s.lng]}
              icon={icon}
              name={s.name}
              onSelect={() => onSelectStation?.(s.name)}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#0369a1", marginBottom: 4 }}>
                    {s.river}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                    {s.name}
                  </div>
                  
                  {debit !== null && (
                    <div style={{ fontSize: 13, marginBottom: 3 }}>
                      <strong>Debit:</strong>{" "}
                      <span style={{ color: "#0284c7", fontWeight: 700 }}>{debit}</span> m³/s
                    </div>
                  )}
                  
                  {nivel !== null && (
                    <div style={{ fontSize: 13, marginBottom: 3 }}>
                      <strong>Nivel:</strong> {nivel} cm
                      {nivelTrend && <span style={{ marginLeft: 4 }}>{trendArrow(nivelTrend)}</span>}
                    </div>
                  )}
                  
                  {temp !== null && (
                    <div style={{ fontSize: 13, marginBottom: 3 }}>
                      <strong>Temp:</strong> <span style={tempStyle(temp)}>{temp} °C</span>
                    </div>
                  )}
                  
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                    Citire: {fmtAt(at)}
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Sursa: DanubeHIS</div>
                  
                  <button
                    onClick={() => onSelectStation?.(s.name)}
                    style={{
                      marginTop: 10,
                      padding: "8px 16px",
                      background: "linear-gradient(135deg, #0369a1, #0284c7)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Selectează stația
                  </button>
                </div>
              </Popup>
            </StationMarker>
          );
        })}
      </MapContainer>

      {/* Indicator blocare - STÂNGA JOS (lângă scală) */}
      {isLocked && (
        <div style={{
          position: "absolute",
          bottom: 35,
          left: 50,
          background: "rgba(2, 132, 199, 0.9)",
          color: "white",
          padding: "6px 12px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          🔒 Hartă blocată
        </div>
      )}
    </div>
  );
}
