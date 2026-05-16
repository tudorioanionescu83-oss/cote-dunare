"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GeoJSON, LayerGroup, useMap } from "react-leaflet";
import L from "leaflet";

const DISTANCE_MARKS_URL = "/layers/danube_km_fairway.geojson";
const FAIRWAY_URL = "/layers/danube_fairway.geojson";

const LABEL_TOOLTIP_OPTIONS = {
  permanent: true,
  direction: "top",
  offset: [0, -4],
  opacity: 1,
  className: "enc-navigation-label",
};

function getPointCoordinates(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates)) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function getCanonicalDistanceMark(feature) {
  const properties = feature?.properties || {};
  const unit = properties.distance_unit === "km" || properties.distance_unit === "mn" ? properties.distance_unit : null;
  const value = Number.isFinite(properties.distance_value) ? properties.distance_value : null;
  const rawCatdis = Number.isFinite(properties.raw_catdis)
    ? properties.raw_catdis
    : Number.isFinite(properties.catdis)
      ? properties.catdis
      : null;

  return {
    unit,
    value,
    label: typeof properties.distance_label === "string" ? properties.distance_label : null,
    canLabel: Boolean(unit && value !== null && rawCatdis === 1 && properties.distance_label),
    reason: properties.reason || null,
    confidence: properties.confidence || null,
    rawValue: properties.raw_wtwdis ?? properties.wtwdis ?? null,
    rawCatdis,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildDistancePopup(feature) {
  const properties = feature?.properties || {};
  const normalized = getCanonicalDistanceMark(feature);
  const title = normalized.label || "Marcaj ENC";
  const rawWtwdis = normalized.rawValue ?? "-";
  const rawCatdis = normalized.rawCatdis ?? "-";

  return `
    <div class="enc-navigation-popup__content">
      <strong>${escapeHtml(title)}</strong><br />
      raw wtwdis: ${escapeHtml(rawWtwdis)}<br />
      raw catdis: ${escapeHtml(rawCatdis)}<br />
      source_folder: ${escapeHtml(properties.source_folder || "-")}<br />
      source_cell: ${escapeHtml(properties.source_cell || "-")}<br />
      distance_unit: ${escapeHtml(properties.distance_unit || "-")}<br />
      distance_value: ${escapeHtml(properties.distance_value ?? "-")}<br />
      label final: ${escapeHtml(normalized.label || "-")}<br />
      confidence: ${escapeHtml(normalized.confidence || "-")}<br />
      reason: ${escapeHtml(normalized.reason || "-")}<br />
      Sursă: ENC<br />
      Valoare informativă
    </div>
  `;
}

function buildFairwayPopup() {
  return `
    <div class="enc-navigation-popup__content">
      <strong>Șenal navigabil</strong><br />
      Sursă: ENC<br />
      Valoare informativă. Nu înlocuiește hărțile oficiale de navigație.
    </div>
  `;
}

function isFeatureCollection(payload) {
  return payload?.type === "FeatureCollection" && Array.isArray(payload.features);
}

function toFeatureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function getPointLatLng(feature) {
  const coordinates = getPointCoordinates(feature);
  return coordinates ? L.latLng(coordinates.lat, coordinates.lng) : null;
}

function isFeatureInBounds(feature, bounds) {
  const latlng = getPointLatLng(feature);
  return Boolean(latlng && bounds?.contains(latlng));
}

function getFairwayStyle(zoom) {
  const isVeryLowZoom = zoom < 8;
  const isLowZoom = zoom < 10;
  const isHighZoom = zoom >= 14;

  return {
    fillColor: "#35D399",
    color: "#A7FFE6",
    fillOpacity: isVeryLowZoom ? 0.1 : isLowZoom ? 0.12 : isHighZoom ? 0.22 : 0.18,
    opacity: isVeryLowZoom ? 0.45 : isLowZoom ? 0.5 : 0.65,
    weight: isLowZoom ? 0.8 : isHighZoom ? 1.2 : 1,
  };
}

function isMultipleOf(value, interval) {
  if (!Number.isFinite(value) || !Number.isFinite(interval) || interval <= 0) return false;
  const quotient = value / interval;
  return Math.abs(quotient - Math.round(quotient)) < 1e-9;
}

function getLabelInterval(unit, zoom) {
  if (unit === "km") {
    if (zoom < 8) return null;
    if (zoom < 9) return 100;
    if (zoom < 10) return 50;
    if (zoom < 11.5) return 20;
    if (zoom < 13) return 10;
    if (zoom <= 14) return 5;
    return "all";
  }

  if (unit === "mn") {
    if (zoom < 8) return null;
    if (zoom < 10) return 20;
    if (zoom < 12) return 10;
    if (zoom <= 14) return 5;
    return "all";
  }

  return null;
}

function getPermanentLabel(normalized, zoom) {
  if (!normalized.canLabel || !normalized.label) return null;
  if (!Number.isInteger(normalized.value) && zoom < 16) {
    return null;
  }
  return normalized.label;
}

function buildRepresentativeLabelFeatures(features = [], zoom) {
  const seenByNormalizedLabel = new Set();
  const representativeFeatures = [];

  for (const feature of features) {
    const properties = feature?.properties || {};
    const normalized = getCanonicalDistanceMark(feature);
    const permanentLabel = getPermanentLabel(normalized, zoom);
    if (!permanentLabel) continue;

    const key = `${normalized.unit}:${normalized.value}`;
    if (seenByNormalizedLabel.has(key)) continue;

    seenByNormalizedLabel.add(key);
    representativeFeatures.push({
      ...feature,
      properties: {
        ...properties,
        __encUnit: normalized.unit,
        __encValue: normalized.value,
        __encLabel: permanentLabel,
        __encReason: normalized.reason,
      },
    });
  }

  return representativeFeatures;
}

export default function EncNavigationOverlay() {
  const map = useMap();
  const [distanceMarks, setDistanceMarks] = useState(null);
  const [fairway, setFairway] = useState(null);
  const pointRenderer = useMemo(() => L.canvas({ padding: 0.2 }), []);
  const [viewState, setViewState] = useState(() => ({
    zoom: map.getZoom(),
    bounds: map.getBounds().pad(0.15),
  }));

  useEffect(() => {
    let cancelled = false;

    async function loadGeoJson(url, setter) {
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && isFeatureCollection(payload)) {
          setter(payload);
        }
      } catch {
        // Overlay-ul ramane pur si simplu gol daca sursa lipseste.
      }
    }

    loadGeoJson(DISTANCE_MARKS_URL, setDistanceMarks);
    loadGeoJson(FAIRWAY_URL, setFairway);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const updateViewState = () => {
      setViewState({
        zoom: map.getZoom(),
        bounds: map.getBounds().pad(0.15),
      });
    };

    updateViewState();
    map.on("zoomend", updateViewState);
    map.on("moveend", updateViewState);

    return () => {
      map.off("zoomend", updateViewState);
      map.off("moveend", updateViewState);
    };
  }, [map]);

  const featureSets = useMemo(() => {
    const allFeatures = distanceMarks?.features || [];
    const visibleAllPointFeatures = allFeatures.filter((feature) =>
      isFeatureInBounds(feature, viewState.bounds)
    );
    const visibleRepresentativeLabelFeatures = buildRepresentativeLabelFeatures(
      visibleAllPointFeatures,
      viewState.zoom
    );
    const labelFeatures = visibleRepresentativeLabelFeatures.filter((feature) => {
      const interval = getLabelInterval(feature.properties.__encUnit, viewState.zoom);
      if (interval === "all") return true;
      if (interval === null) return false;
      return isMultipleOf(feature.properties.__encValue, interval);
    });

    return {
      allVisiblePoints: toFeatureCollection(visibleAllPointFeatures),
      visibleLabels: toFeatureCollection(labelFeatures),
    };
  }, [distanceMarks, viewState.bounds, viewState.zoom]);

  const { zoom } = viewState;
  const showFairway = zoom >= 7;
  const showLabels = zoom >= 8;
  const showAllPoints = zoom > 14;

  return (
    <LayerGroup>
      {showFairway && fairway && (
        <GeoJSON
          key={`enc-fairway-${zoom < 8 ? "very-low" : zoom < 10 ? "low" : zoom <= 14 ? "mid" : "high"}`}
          data={fairway}
          style={() => getFairwayStyle(zoom)}
          onEachFeature={(_, layer) => {
            layer.on("click", () => {
              layer.bindPopup(buildFairwayPopup(), { className: "enc-navigation-popup" }).openPopup();
            });
          }}
        />
      )}

      {showAllPoints && (
        <GeoJSON
          key={`enc-all-points-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.allVisiblePoints}
          pointToLayer={(feature, latlng) => {
            const isMajorMark = Number(feature?.properties?.raw_catdis ?? feature?.properties?.catdis) === 1;
            return L.circleMarker(latlng, {
              radius: isMajorMark ? 4 : 3,
              fillColor: "#00E5FF",
              color: "#FFFFFF",
              weight: 1.15,
              opacity: 1,
              fillOpacity: 0.95,
              renderer: pointRenderer,
            });
          }}
          onEachFeature={(feature, layer) => {
            layer.on("click", () => {
              layer.bindPopup(buildDistancePopup(feature), {
                className: "enc-navigation-popup",
              }).openPopup();
            });
          }}
        />
      )}

      {showLabels && (
        <GeoJSON
          key={`enc-labels-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.visibleLabels}
          pointToLayer={(_, latlng) =>
            L.circleMarker(latlng, {
              radius: 0,
              opacity: 0,
              fillOpacity: 0,
              interactive: false,
              renderer: pointRenderer,
            })
          }
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(feature.properties.__encLabel, LABEL_TOOLTIP_OPTIONS);
          }}
        />
      )}
    </LayerGroup>
  );
}



