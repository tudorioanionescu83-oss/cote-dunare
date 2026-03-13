"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Pane, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TAB_CONFIG = [
  { id: "temperature", label: "Temperatura", unit: "\u00B0C" },
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

const FORECAST_FAN_OPTIONS = [
  { id: "temperature", label: "Prognoza temperatura" },
  { id: "currents", label: "Prognoza curenti" },
  { id: "waves", label: "Prognoza valuri" },
  { id: "salinity", label: "Prognoza salinitate" },
];

const BASEMAP_OPTIONS = [
  { id: "normal", label: "Harta color" },
  { id: "semi", label: "Semi alb-negru" },
  { id: "mono", label: "Alb-negru" },
  { id: "satellite", label: "Satelitar" },
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

function computePercentileRange(
  values,
  { fallbackValue = null, lowerQuantile = 0.08, upperQuantile = 0.86, maxCap = null } = {}
) {
  const numeric = (values || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (Number.isFinite(Number(fallbackValue))) numeric.push(Number(fallbackValue));
  if (!numeric.length) return { min: 0, max: 1 };

  const pick = (quantile) => {
    const q = Math.max(0, Math.min(1, quantile));
    const idx = Math.round(q * (numeric.length - 1));
    return numeric[idx];
  };

  let min = pick(lowerQuantile);
  let max = pick(upperQuantile);
  if (Number.isFinite(Number(maxCap))) max = Math.min(max, Number(maxCap));

  if (Number.isFinite(Number(fallbackValue))) {
    const fv = Number(fallbackValue);
    min = Math.min(min, fv);
    max = Math.max(max, fv);
  }

  min = Math.max(0, min);
  if (max - min < 1e-9) return { min: min - 0.5, max: max + 0.5 };
  const pad = (max - min) * 0.08;
  return { min: Math.max(0, min - pad), max: max + pad };
}

const ROMANIAN_COAST_BBOX = {
  minLat: 43.7,
  maxLat: 45.25,
  minLon: 28.45,
  maxLon: 30.15,
};

function normalizeBbox(rawBbox) {
  const minLat = Number(rawBbox?.minLat);
  const maxLat = Number(rawBbox?.maxLat);
  const minLon = Number(rawBbox?.minLon);
  const maxLon = Number(rawBbox?.maxLon);
  if (![minLat, maxLat, minLon, maxLon].every((value) => Number.isFinite(value))) return null;
  if (minLat >= maxLat || minLon >= maxLon) return null;
  return { minLat, maxLat, minLon, maxLon };
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

function layerButtonStyle(active, compact = false) {
  return {
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    padding: compact ? "6px 10px" : "7px 12px",
    fontWeight: 800,
    fontSize: compact ? 11 : 12,
    cursor: "pointer",
    background: active ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "white",
    color: active ? "white" : "#0f172a",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  };
}

function forecastFanButtonStyle(active, index, compact = false) {
  return {
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    padding: compact ? "7px 9px" : "8px 10px",
    fontWeight: 800,
    fontSize: compact ? 11 : 12,
    cursor: "pointer",
    textAlign: "left",
    background: active ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "white",
    color: active ? "white" : "#0f172a",
    marginLeft: `${index * (compact ? 5 : 8)}px`,
    boxShadow: active ? "0 8px 18px rgba(14,165,233,.25)" : "none",
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

function nearestGridPoint(latlng, points) {
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
  return best;
}

function degreesToCardinal(degrees) {
  const value = Number(degrees);
  if (!Number.isFinite(value)) return "-";
  const normalized = ((value % 360) + 360) % 360;
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"];
  const idx = Math.round(normalized / 22.5) % 16;
  return points[idx];
}

function normalizeDegrees(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return ((numeric % 360) + 360) % 360;
}

function cardinalToDegrees(cardinal) {
  const value = String(cardinal || "").trim().toUpperCase();
  if (!value) return null;
  const map = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSV: 202.5,
    SV: 225,
    VSV: 247.5,
    V: 270,
    VNV: 292.5,
    NV: 315,
    NNV: 337.5,
    W: 270,
    SW: 225,
    NW: 315,
  };
  return map[value] ?? null;
}

function formatDirection(degrees) {
  const normalized = normalizeDegrees(degrees);
  if (normalized === null) return "-";
  const rounded = Math.round(normalized);
  return `${rounded}\u00B0 (${degreesToCardinal(rounded)})`;
}

export default function MarineMapsPanel({ station, current, timeseries, forecast, layers = { layers: [] } }) {
  const [activeLayer, setActiveLayer] = useState("temperature");
  const [forecastMetric, setForecastMetric] = useState("temperature");
  const [basemapMode, setBasemapMode] = useState("normal");
  const [showRiversLayer, setShowRiversLayer] = useState(true);
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMode, setSpeedMode] = useState("normal");
  const [bathymetryData, setBathymetryData] = useState({ loading: false, points: [], minValue: null, maxValue: null });
  const [weatherWind, setWeatherWind] = useState({
    loading: true,
    speedKmh: null,
    directionCardinal: null,
    directionDeg: null,
  });

  const layerPayload = useMemo(() => (Array.isArray(layers) ? { layers } : layers || { layers: [] }), [layers]);
  const layerList = layerPayload?.layers || [];
  const layerSnapshot = layerPayload?.snapshot || null;
  const bathymetryMeta = layerPayload?.bathymetry || null;
  const resolvedLayer = activeLayer === "forecast" ? forecastMetric : activeLayer;
  const stationLat = Number(station?.lat ?? 44.17);
  const stationLng = Number(station?.lng ?? station?.lon ?? 28.65);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(query.matches);
    apply();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", apply);
      return () => query.removeEventListener("change", apply);
    }

    query.addListener(apply);
    return () => query.removeListener(apply);
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      if (!Number.isFinite(stationLat) || !Number.isFinite(stationLng)) {
        if (!cancelled) {
          setWeatherWind({ loading: false, speedKmh: null, directionCardinal: null, directionDeg: null });
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/weather?lat=${encodeURIComponent(stationLat)}&lon=${encodeURIComponent(stationLng)}`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (cancelled) return;

        const dirCardinal = payload?.current?.wind_dir || null;
        const speed = Number(payload?.current?.wind_kmh);
        setWeatherWind({
          loading: false,
          speedKmh: Number.isFinite(speed) ? speed : null,
          directionCardinal: dirCardinal,
          directionDeg: cardinalToDegrees(dirCardinal),
        });
      } catch {
        if (!cancelled) {
          setWeatherWind({ loading: false, speedKmh: null, directionCardinal: null, directionDeg: null });
        }
      }
    }

    loadWeather();
    const timer = setInterval(loadWeather, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [stationLat, stationLng]);

  const points = useMemo(() => {
    if (activeLayer === "forecast") return forecast?.points || [];
    return timeseries?.points || [];
  }, [activeLayer, forecast?.points, timeseries?.points]);

  const selectedPoint = useMemo(() => {
    if (!points.length) return null;
    const safeIndex = Math.max(0, Math.min(selectedIndex, points.length - 1));
    return points[safeIndex];
  }, [points, selectedIndex]);

  const referencePoint = useMemo(() => {
    if (!points.length) return null;
    return points[points.length - 1];
  }, [points]);

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
  const resolvedTab = TAB_CONFIG.find((item) => item.id === resolvedLayer) || activeTab;
  const layerMeta = layerList.find((layer) => layer.id === activeLayer);
  const activeLayerLabel =
    activeLayer === "forecast" ? `Prognoza - ${resolvedTab.label}` : layerMeta?.label || activeTab.label;

  const sourceGridPoints = useMemo(() => {
    if (resolvedLayer === "temperature") return layerSnapshot?.temperaturePoints || [];
    if (resolvedLayer === "salinity") return layerSnapshot?.salinityPoints || [];
    if (resolvedLayer === "waves") return layerSnapshot?.wavePoints || [];
    if (resolvedLayer === "bathymetry") return bathymetryData.points || [];
    return [];
  }, [resolvedLayer, layerSnapshot, bathymetryData.points]);

  const sourceCurrentVectors = useMemo(() => (resolvedLayer === "currents" ? layerSnapshot?.currentVectors || [] : []), [
    resolvedLayer,
    layerSnapshot,
  ]);

  const playbackDelta = useMemo(() => {
    const temperatureDelta = Number(selectedPoint?.waterTemperature) - Number(referencePoint?.waterTemperature);
    const salinityDelta = Number(selectedPoint?.salinity) - Number(referencePoint?.salinity);
    const waveHeightDelta = Number(selectedPoint?.waveHeight) - Number(referencePoint?.waveHeight);
    const waveDirectionDelta = Number(selectedPoint?.waveDirection) - Number(referencePoint?.waveDirection);
    const currentDirectionDelta = Number(selectedPoint?.currentDirection) - Number(referencePoint?.currentDirection);
    const selectedCurrentSpeed = Number(selectedPoint?.currentSpeed);
    const referenceCurrentSpeed = Number(referencePoint?.currentSpeed);
    const currentSpeedRatio =
      Number.isFinite(selectedCurrentSpeed) && Number.isFinite(referenceCurrentSpeed) && Math.abs(referenceCurrentSpeed) > 1e-6
        ? selectedCurrentSpeed / referenceCurrentSpeed
        : 1;

    return {
      temperatureDelta: Number.isFinite(temperatureDelta) ? temperatureDelta : 0,
      salinityDelta: Number.isFinite(salinityDelta) ? salinityDelta : 0,
      waveHeightDelta: Number.isFinite(waveHeightDelta) ? waveHeightDelta : 0,
      waveDirectionDelta: Number.isFinite(waveDirectionDelta) ? waveDirectionDelta : 0,
      currentDirectionDelta: Number.isFinite(currentDirectionDelta) ? currentDirectionDelta : 0,
      currentSpeedRatio: Number.isFinite(currentSpeedRatio) ? Math.max(0.15, Math.min(3.5, currentSpeedRatio)) : 1,
    };
  }, [selectedPoint, referencePoint]);

  const shouldAnimateSpatial = Boolean(
    selectedPoint &&
      referencePoint &&
      points.length > 1 &&
      resolvedLayer !== "bathymetry" &&
      (activeLayer === "forecast" || activeLayer === "temperature" || activeLayer === "salinity" || activeLayer === "waves" || activeLayer === "currents")
  );

  const activeGridPoints = useMemo(() => {
    if (!shouldAnimateSpatial || resolvedLayer === "bathymetry") return sourceGridPoints;
    const isWaveLayer = resolvedLayer === "waves";
    const scalarDelta =
      resolvedLayer === "temperature"
        ? playbackDelta.temperatureDelta
        : resolvedLayer === "salinity"
        ? playbackDelta.salinityDelta
        : isWaveLayer
        ? playbackDelta.waveHeightDelta
        : 0;
    if (!Number.isFinite(scalarDelta) || Math.abs(scalarDelta) < 1e-9) return sourceGridPoints;

    return sourceGridPoints.map((point) => {
      const currentValue = Number(point?.value);
      const shifted = Number.isFinite(currentValue) ? currentValue + scalarDelta : currentValue;
      const nextValue = resolvedLayer === "salinity" || isWaveLayer ? Math.max(0, shifted) : shifted;
      const direction = Number(point?.direction);
      const nextDirection = isWaveLayer && Number.isFinite(direction) ? normalizeDegrees(direction + playbackDelta.waveDirectionDelta) : direction;
      return {
        ...point,
        value: nextValue,
        ...(Number.isFinite(nextDirection) ? { direction: nextDirection } : {}),
      };
    });
  }, [shouldAnimateSpatial, resolvedLayer, sourceGridPoints, playbackDelta]);

  const currentVectors = useMemo(() => {
    if (resolvedLayer !== "currents") return [];
    if (!shouldAnimateSpatial) return sourceCurrentVectors;

    return sourceCurrentVectors.map((vector) => {
      const speed = Number(vector?.speed);
      const direction = Number(vector?.direction);
      const nextSpeed = Number.isFinite(speed) ? Math.max(0, speed * playbackDelta.currentSpeedRatio) : speed;
      const nextDirection = Number.isFinite(direction) ? normalizeDegrees(direction + playbackDelta.currentDirectionDelta) : direction;
      const radians = ((nextDirection || 0) * Math.PI) / 180;
      const u = Number.isFinite(nextSpeed) ? Math.sin(radians) * nextSpeed : Number(vector?.u);
      const v = Number.isFinite(nextSpeed) ? Math.cos(radians) * nextSpeed : Number(vector?.v);
      return {
        ...vector,
        speed: nextSpeed,
        direction: Number.isFinite(nextDirection) ? nextDirection : direction,
        u: Number.isFinite(u) ? u : vector?.u,
        v: Number.isFinite(v) ? v : vector?.v,
      };
    });
  }, [resolvedLayer, shouldAnimateSpatial, sourceCurrentVectors, playbackDelta]);

  const waveVectors = useMemo(() => {
    if (resolvedLayer !== "waves") return [];
    const list = activeGridPoints || [];
    return list
      .map((point) => ({
        lat: Number(point?.lat),
        lon: Number(point?.lon),
        value: Number(point?.value),
        direction: Number(point?.direction),
        period: Number(point?.period),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lon) &&
          Number.isFinite(point.value) &&
          Number.isFinite(point.direction)
      );
  }, [resolvedLayer, activeGridPoints]);

  const timelineValue = valueByTimePoint(selectedPoint || current, resolvedLayer);
  const clickedScalarPoint = useMemo(() => nearestGridPoint(clickedPoint, activeGridPoints), [clickedPoint, activeGridPoints]);
  const clickedCurrentVector = useMemo(() => nearestGridPoint(clickedPoint, currentVectors), [clickedPoint, currentVectors]);

  const activeValue = useMemo(() => {
    if (resolvedLayer === "currents") return clickedCurrentVector?.speed ?? timelineValue;
    return clickedScalarPoint?.value ?? timelineValue;
  }, [resolvedLayer, clickedCurrentVector, clickedScalarPoint, timelineValue]);

  const activeDirectionText = useMemo(() => {
    if (resolvedLayer === "currents") {
      return formatDirection(clickedCurrentVector?.direction ?? selectedPoint?.currentDirection ?? current?.currentDirection);
    }
    if (resolvedLayer === "waves") {
      return formatDirection(clickedScalarPoint?.direction ?? selectedPoint?.waveDirection ?? current?.waveDirection);
    }
    return null;
  }, [resolvedLayer, clickedCurrentVector, clickedScalarPoint, selectedPoint, current]);

  const activePeriodText = useMemo(() => {
    if (resolvedLayer !== "waves") return null;
    const p = clickedScalarPoint?.period ?? selectedPoint?.wavePeriod ?? current?.wavePeriod;
    if (!Number.isFinite(Number(p))) return null;
    return `${formatNumber(p, 2)} s`;
  }, [resolvedLayer, clickedScalarPoint, selectedPoint, current]);

  const activeDirectionDegrees = useMemo(() => {
    if (resolvedLayer === "currents") {
      return normalizeDegrees(clickedCurrentVector?.direction ?? selectedPoint?.currentDirection ?? current?.currentDirection);
    }
    if (resolvedLayer === "waves") {
      return normalizeDegrees(clickedScalarPoint?.direction ?? selectedPoint?.waveDirection ?? current?.waveDirection);
    }
    return normalizeDegrees(selectedPoint?.currentDirection ?? current?.currentDirection);
  }, [resolvedLayer, clickedCurrentVector, clickedScalarPoint, selectedPoint, current]);

  const scalarValues = activeGridPoints.map((point) => Number(point.value)).filter((v) => Number.isFinite(v));
  const vectorValues = currentVectors.map((point) => Number(point.speed)).filter((v) => Number.isFinite(v));
  const rangeValues = resolvedLayer === "currents" ? vectorValues : scalarValues;
  const layerRange =
    resolvedLayer === "bathymetry"
      ? computePercentileRange(rangeValues, {
          fallbackValue: activeValue,
          lowerQuantile: 0.08,
          upperQuantile: 0.86,
          maxCap: 70,
        })
      : computeRange(rangeValues, activeValue);
  const palette = resolvedLayer === "bathymetry" ? bathymetryPalette() : defaultPalette();
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
  const mapCenter = [stationLat, stationLng];
  const vectorTo = hasSingleCurrentVector ? destinationPoint(stationLat, stationLng, currentDirection, vectorDistanceKm) : mapCenter;
  const mapBbox = normalizeBbox(layerSnapshot?.bbox) || normalizeBbox(station?.bbox) || ROMANIAN_COAST_BBOX;
  const mapBounds = [
    [mapBbox.minLat, mapBbox.minLon],
    [mapBbox.maxLat, mapBbox.maxLon],
  ];

  const showScalarGrid = resolvedLayer !== "currents" && activeGridPoints.length > 0;
  const showCurrentVectorGrid = resolvedLayer === "currents" && currentVectors.length > 0;
  const showWaveVectorGrid = resolvedLayer === "waves" && waveVectors.length > 0;
  const showLegacyCircles = !showScalarGrid && !showCurrentVectorGrid;
  const hasPlayback = resolvedLayer !== "bathymetry";
  const showLayerCompass = resolvedLayer === "currents" || resolvedLayer === "waves";
  const layerCompassLabel = resolvedLayer === "currents" ? "Curenti" : resolvedLayer === "waves" ? "Val" : "";
  const windDirectionDeg = normalizeDegrees(weatherWind.directionDeg);
  const windDirectionLabel =
    windDirectionDeg === null ? "-" : `${Math.round(windDirectionDeg)}\u00B0 ${degreesToCardinal(windDirectionDeg)}`;
  const windSpeedLabel = Number.isFinite(Number(weatherWind.speedKmh)) ? `${formatNumber(weatherWind.speedKmh, 1)} km/h` : "-";

  const gradientBar =
    resolvedLayer === "bathymetry"
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
        <div
          style={{
            display: "inline-flex",
            borderRadius: 10,
            padding: "7px 12px",
            fontSize: isMobile ? 16 : 18,
            fontWeight: 900,
            color: "#0f172a",
            background: "linear-gradient(135deg, rgba(14,165,233,.18), rgba(59,130,246,.12))",
            border: "1px solid #bae6fd",
            boxShadow: "0 4px 12px rgba(14,165,233,.12)",
          }}
        >
          Harti interactive si predictii marine
        </div>
        <div
          style={{
            marginTop: 8,
            color: "#1e293b",
            fontSize: isMobile ? 12 : 13,
            background: "linear-gradient(135deg, rgba(226,232,240,.7), rgba(219,234,254,.65))",
            border: "1px solid #bfdbfe",
            borderRadius: 10,
            padding: "8px 10px",
            fontWeight: 600,
          }}
        >
          Layer activ: <b>{activeLayerLabel}</b> | Valoare punctuala: <b>{formatNumber(activeValue, 2)} {resolvedTab.unit}</b>
          {activeDirectionText ? ` | Directie: ${activeDirectionText}` : ""}
          {activePeriodText ? ` | Perioada: ${activePeriodText}` : ""}
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        <div
          style={{
            display: "flex",
            gap: isMobile ? 6 : 8,
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 2 : 0,
          }}
        >
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLayer(tab.id)}
              style={layerButtonStyle(tab.id === activeLayer, isMobile)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeLayer === "forecast" && (
          <div
            style={{
              border: "1px dashed #bae6fd",
              borderRadius: 12,
              padding: 10,
              background: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Evantai prognoze (vertical)
            </div>
            <div style={{ display: "grid", gap: 8, maxWidth: isMobile ? 230 : 260 }}>
              {FORECAST_FAN_OPTIONS.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setForecastMetric(option.id)}
                  style={forecastFanButtonStyle(forecastMetric === option.id, index, isMobile)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>Legenda dinamica layer</div>
          <div style={{ height: 10, borderRadius: 999, background: gradientBar, border: "1px solid #cbd5e1" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
            <span>
              Min: {formatNumber(layerRange.min, 2)} {resolvedTab.unit}
            </span>
            <span>
              Max: {formatNumber(layerRange.max, 2)} {resolvedTab.unit}
            </span>
          </div>
          {resolvedLayer === "bathymetry" && (
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Scala batimetriei este calibrata pe litoralul Romaniei (Sulina-Vama Veche), nu pe intreaga Mare Neagra.
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #cbd5e1", position: "relative" }}>
          <MapContainer
            center={mapCenter}
            zoom={8}
            bounds={mapBounds}
            boundsOptions={{ padding: isMobile ? [52, 52] : [84, 84] }}
            zoomControl={false}
            style={{ height: isMobile ? 320 : 360, width: "100%" }}
          >
            {(basemapMode === "normal" || basemapMode === "semi") && (
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            )}
            {basemapMode === "satellite" && (
              <TileLayer
                attribution="&copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}
            {basemapMode === "mono" && (
              <TileLayer
                attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
            )}
            {basemapMode === "semi" && (
              <TileLayer
                attribution="&copy; CARTO"
                url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                opacity={0.58}
              />
            )}
            {showRiversLayer && (
              <TileLayer
                attribution="&copy; OpenSeaMap"
                url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                opacity={0.68}
              />
            )}
            <MapClickCapture
              onMapClick={(latlng) => {
                setClickedPoint(latlng);
                setShowBasemapMenu(false);
              }}
            />

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

            {showCurrentVectorGrid && (
              <Pane name="marine-grid-vectors-current" style={{ zIndex: 450 }}>
                {currentVectors.map((vector, index) => {
                  const segmentDistance = Math.max(0.55, Math.min(4.5, vector.speed * 9.5));
                  const end = destinationPoint(vector.lat, vector.lon, vector.direction, segmentDistance);
                  const arrowLeft = destinationPoint(end[0], end[1], vector.direction + 152, Math.max(0.08, segmentDistance * 0.16));
                  const arrowRight = destinationPoint(end[0], end[1], vector.direction - 152, Math.max(0.08, segmentDistance * 0.16));
                  const color = colorForValue(vector.speed, layerRange, defaultPalette());
                  return (
                    <React.Fragment key={`cur-vec-${index}`}>
                      <Polyline
                        positions={[[vector.lat, vector.lon], end]}
                        pathOptions={{ color, weight: 2.6, opacity: 0.92 }}
                      />
                      <Polyline positions={[end, arrowLeft]} pathOptions={{ color, weight: 2.2, opacity: 0.92 }} />
                      <Polyline positions={[end, arrowRight]} pathOptions={{ color, weight: 2.2, opacity: 0.92 }} />
                    </React.Fragment>
                  );
                })}
              </Pane>
            )}

            {showWaveVectorGrid && (
              <Pane name="marine-grid-vectors-wave" style={{ zIndex: 448 }}>
                {waveVectors.map((vector, index) => {
                  const dist = Math.max(0.25, Math.min(2.5, vector.value * 4));
                  const end = destinationPoint(vector.lat, vector.lon, vector.direction, dist);
                  const color = colorForValue(vector.value, layerRange, defaultPalette());
                  return (
                    <Polyline
                      key={`wav-vec-${index}`}
                      positions={[[vector.lat, vector.lon], end]}
                      pathOptions={{ color, weight: 1.2, opacity: 0.72 }}
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

            {!showCurrentVectorGrid && hasSingleCurrentVector && (
              <Pane name="marine-current-vector-single" style={{ zIndex: 500 }}>
                <Polyline positions={[mapCenter, vectorTo]} pathOptions={{ color: activeColor, weight: 3, opacity: 0.9 }} />
              </Pane>
            )}

            <Marker position={mapCenter} icon={markerIcon}>
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{station?.displayName || station?.name || "Constanta"}</div>
                  <div>
                    {activeLayerLabel}: <b>{formatNumber(activeValue, 2)} {resolvedTab.unit}</b>
                  </div>
                  {activeDirectionText && <div>Directie: <b>{activeDirectionText}</b></div>}
                  {activePeriodText && <div>Perioada: <b>{activePeriodText}</b></div>}
                  <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
                    Timp: {formatTimestamp(selectedPoint?.timestamp || layerSnapshot?.timestamp || current?.timestamp)}
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5000 }}>
            <button
              type="button"
              onClick={() => setShowBasemapMenu((prev) => !prev)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,.25)",
                background: "rgba(255,255,255,.92)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(15,23,42,.22)",
              }}
              title="Layere harta"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                <path d="M12 9l9 4.5-9 4.5-9-4.5L12 9z" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
                <path d="M12 15l9 4.5-9 4.5-9-4.5L12 15z" fill="#f1f5f9" stroke="#475569" strokeWidth="1" />
              </svg>
            </button>
            {showBasemapMenu && (
              <div
                style={{
                  marginTop: 8,
                  minWidth: 185,
                  borderRadius: 10,
                  border: "1px solid rgba(15,23,42,.2)",
                  background: "rgba(255,255,255,.95)",
                  boxShadow: "0 8px 20px rgba(15,23,42,.22)",
                  padding: 8,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: "#334155", padding: "2px 4px 0 4px" }}>Fundal harta</div>
                {BASEMAP_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setBasemapMode(option.id);
                      setShowBasemapMenu(false);
                    }}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "7px 10px",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: 12,
                      color: basemapMode === option.id ? "white" : "#0f172a",
                      background: basemapMode === option.id ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "white",
                      cursor: "pointer",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: 4, paddingTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setShowRiversLayer((prev) => !prev)}
                    style={{
                      width: "100%",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "7px 10px",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: 12,
                      color: showRiversLayer ? "white" : "#0f172a",
                      background: showRiversLayer ? "linear-gradient(135deg,#0ea5e9,#0284c7)" : "white",
                      cursor: "pointer",
                    }}
                  >
                    {showRiversLayer ? "Râuri: ON" : "Râuri: OFF"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: isMobile ? 8 : 10,
              left: 10,
              zIndex: 4900,
              background: "rgba(255,255,255,0.19)",
              border: "1px solid rgba(148,163,184,.55)",
              borderRadius: 10,
              padding: "8px 8px 6px 8px",
              minWidth: isMobile ? 86 : 102,
              backdropFilter: "blur(1.2px)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textAlign: "center" }}>Vant</div>
            <div
              style={{
                position: "relative",
                width: isMobile ? 58 : 70,
                height: isMobile ? 58 : 70,
                margin: "6px auto 4px auto",
                borderRadius: "50%",
                border: "2px solid rgba(100,116,139,.85)",
                background: "radial-gradient(circle at center, rgba(255,255,255,.65) 0%, rgba(255,255,255,.2) 70%, rgba(148,163,184,.15) 100%)",
              }}
            >
              <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800 }}>N</div>
              <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800 }}>S</div>
              <div style={{ position: "absolute", top: "50%", right: 3, transform: "translateY(-50%)", fontSize: 10, fontWeight: 800 }}>E</div>
              <div style={{ position: "absolute", top: "50%", left: 3, transform: "translateY(-50%)", fontSize: 10, fontWeight: 800 }}>V</div>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: isMobile ? 2 : 2.4,
                  height: isMobile ? 21 : 25,
                  background: "#ef4444",
                  transform: `translate(-50%, -100%) rotate(${windDirectionDeg || 0}deg)`,
                  transformOrigin: "50% 100%",
                  borderRadius: 999,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: isMobile ? -7 : -8,
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: `${isMobile ? 4 : 5}px solid transparent`,
                    borderRight: `${isMobile ? 4 : 5}px solid transparent`,
                    borderBottom: `${isMobile ? 7 : 9}px solid #ef4444`,
                  }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#0f172a",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
            <div style={{ fontSize: 11, textAlign: "center", color: "#0f172a", fontWeight: 700 }}>
              {weatherWind.loading ? "..." : windDirectionLabel}
            </div>
            <div style={{ fontSize: 11, textAlign: "center", color: "#0f172a", fontWeight: 700 }}>{windSpeedLabel}</div>
          </div>

          {showLayerCompass && (
            <div
            style={{
              position: "absolute",
              bottom: isMobile ? 8 : 10,
              right: 10,
              zIndex: 5000,
              background: "rgba(255,255,255,0.19)",
              border: "1px solid rgba(148,163,184,.55)",
              borderRadius: 10,
              padding: "8px 8px 6px 8px",
              minWidth: isMobile ? 80 : 92,
              backdropFilter: "blur(1.2px)",
              pointerEvents: "none",
            }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textAlign: "center" }}>{layerCompassLabel}</div>
              <div
                style={{
                  position: "relative",
                  width: isMobile ? 56 : 68,
                  height: isMobile ? 56 : 68,
                  margin: "6px auto 4px auto",
                  borderRadius: "50%",
                  border: "2px solid rgba(100,116,139,.85)",
                  background: "radial-gradient(circle at center, rgba(255,255,255,.62) 0%, rgba(255,255,255,.18) 70%, rgba(148,163,184,.12) 100%)",
                }}
              >
                <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800 }}>N</div>
                <div style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 800 }}>S</div>
                <div style={{ position: "absolute", top: "50%", right: 3, transform: "translateY(-50%)", fontSize: 10, fontWeight: 800 }}>E</div>
                <div style={{ position: "absolute", top: "50%", left: 3, transform: "translateY(-50%)", fontSize: 10, fontWeight: 800 }}>V</div>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: isMobile ? 2 : 2.2,
                    height: isMobile ? 20 : 24,
                    background: "#ef4444",
                    transform: `translate(-50%, -100%) rotate(${activeDirectionDegrees || 0}deg)`,
                    transformOrigin: "50% 100%",
                    borderRadius: 999,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: isMobile ? -7 : -8,
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: `${isMobile ? 4 : 5}px solid transparent`,
                      borderRight: `${isMobile ? 4 : 5}px solid transparent`,
                      borderBottom: `${isMobile ? 7 : 8}px solid #ef4444`,
                    }}
                  />
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#0f172a",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, textAlign: "center", color: "#0f172a", fontWeight: 700 }}>
                {activeDirectionDegrees === null ? "-" : `${Math.round(activeDirectionDegrees)}\u00B0 ${degreesToCardinal(activeDirectionDegrees)}`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 12px 12px 12px" }}>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, background: "white" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Legenda</div>
          <div style={{ display: "grid", gap: 4, fontSize: 13, color: "#334155" }}>
            <div>Punct albastru: statia Constanta (marina)</div>
            <div>Puncte colorate: camp scalar Copernicus (temperatura / salinitate / valuri / batimetrie)</div>
            <div>Linii colorate: vectori curenti si directia valurilor</div>
            <div>Buton stanga-sus (icon layere): fundal harta (color / semi alb-negru / alb-negru / satelitar) + layer râuri</div>
            <div>Roza vant stanga: directia + viteza vant (date meteo)</div>
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
                  {forecast.points.slice(0, 32).map((point) => {
                    const isSelected = point.timestamp === selectedPoint?.timestamp;
                    return (
                    <tr
                      key={point.timestamp}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isSelected ? "linear-gradient(90deg, rgba(14,165,233,.15), rgba(14,165,233,.05))" : "transparent",
                      }}
                    >
                      <td style={{ padding: "6px 4px" }}>{formatTimestamp(point.timestamp)}</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.waterTemperature, 1)} \u00B0C</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.currentSpeed, 2)} m/s</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.waveHeight, 2)} m</td>
                      <td style={{ padding: "6px 4px" }}>{formatNumber(point.salinity, 2)} PSU</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
