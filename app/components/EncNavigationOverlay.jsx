"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GeoJSON, LayerGroup, useMap } from "react-leaflet";
import L from "leaflet";

const DISTANCE_MARKS_URL = "/layers/danube_km_fairway.geojson?v=canonical-labels-20260517";
const FAIRWAY_URL = "/layers/danube_fairway.geojson";

function getPointCoordinates(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates)) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function normalizeDistanceMark(feature) {
  const properties = feature?.properties || {};
  const canonicalLabel =
    typeof properties.distance_label === "string" && properties.distance_label.trim()
      ? properties.distance_label
      : null;
  const canonicalUnit = properties.distance_unit ?? null;
  const canonicalValue = properties.distance_value ?? null;
  const rawCatdis = Number.isFinite(properties.raw_catdis)
    ? properties.raw_catdis
    : Number.isFinite(properties.catdis)
      ? properties.catdis
      : null;

  if (canonicalLabel) {
    return {
      unit: canonicalUnit,
      value: canonicalValue,
      label: canonicalLabel,
      canLabel: true,
      reason: properties.reason || "CanonicalDistanceLabel",
      confidence: properties.confidence || null,
      rawValue: properties.raw_wtwdis ?? properties.wtwdis ?? null,
      rawCatdis,
    };
  }

  return {
    unit: canonicalUnit,
    value: canonicalValue,
    label: null,
    canLabel: false,
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

function buildLabelIcon(label) {
  return L.divIcon({
    className: "",
    html: `<div style="display:inline-block;padding:2px 7px;border-radius:999px;background:rgba(15,76,92,0.94);color:#fff;font-weight:800;font-size:12px;line-height:1.15;white-space:nowrap;border:1px solid rgba(255,255,255,0.85);box-shadow:0 1px 5px rgba(0,0,0,0.35);text-shadow:0 1px 1px rgba(0,0,0,0.55);">${escapeHtml(label)}</div>`,
  });
}

function buildDistancePopup(feature) {
  const properties = feature?.properties || {};
  const normalized = normalizeDistanceMark(feature);
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
    fillOpacity: isVeryLowZoom ? 0.14 : isLowZoom ? 0.17 : isHighZoom ? 0.28 : 0.23,
    opacity: isVeryLowZoom ? 0.5 : isLowZoom ? 0.58 : 0.72,
    weight: isLowZoom ? 0.9 : isHighZoom ? 1.25 : 1.1,
  };
}

function getFairwayBoundaryStyle(zoom) {
  const isVeryLowZoom = zoom < 8;
  const isLowZoom = zoom < 10;
  const isHighZoom = zoom >= 14;

  return {
    fill: false,
    color: "#F59E0B",
    opacity: isVeryLowZoom ? 0.28 : isLowZoom ? 0.36 : isHighZoom ? 0.52 : 0.44,
    weight: isLowZoom ? 0.9 : isHighZoom ? 1.25 : 1.05,
    dashArray: isLowZoom ? "3 6" : "4 6",
  };
}

function getLabelInterval(unit, zoom) {
  if (unit === "km") {
    if (zoom >= 15.5) return 1;
    if (zoom >= 14.5) return 2;
    if (zoom >= 13.5) return 5;
    if (zoom >= 12.5) return 10;
    if (zoom >= 11.5) return 20;
    if (zoom >= 10) return 50;
    if (zoom >= 8) return 100;
    return null;
  }

  if (unit === "mn") {
    if (zoom >= 15.5) return 1;
    if (zoom >= 14) return 2;
    if (zoom >= 12.5) return 5;
    if (zoom >= 11) return 10;
    if (zoom >= 9) return 20;
    return null;
  }

  return null;
}

const LOCAL_KM_MN_CONFLICT_DISTANCE_METERS = 400;
const LOCAL_LABEL_DUPLICATE_DISTANCE_METERS = 700;

function isRenderablePermanentNavigationLabel(normalized) {
  return (
    normalized.canLabel &&
    normalized.label &&
    (normalized.unit === "km" || normalized.unit === "mn") &&
    Number.isInteger(normalized.value)
  );
}

function isMultipleOf(value, interval) {
  if (interval === null || !Number.isInteger(value)) return false;
  return value % interval === 0;
}

function shouldRenderOverviewNavigationAnchor(normalized, zoom) {
  if (zoom < 8 || zoom >= 10) return false;

  if (normalized.unit === "mn") {
    return normalized.value === 0 || normalized.value === 40 || normalized.value === 80;
  }

  if (normalized.unit === "km") {
    return normalized.value === 150 || (normalized.value >= 200 && normalized.value % 100 === 0);
  }

  return false;
}

function shouldRenderLabelAtZoom(normalized, zoom) {
  if (shouldRenderOverviewNavigationAnchor(normalized, zoom)) return true;
  const interval = getLabelInterval(normalized.unit, zoom);
  return isMultipleOf(normalized.value, interval);
}

function getFeatureDistanceMeters(firstFeature, secondFeature) {
  const firstLatLng = getPointLatLng(firstFeature);
  const secondLatLng = getPointLatLng(secondFeature);
  if (!firstLatLng || !secondLatLng) return Number.POSITIVE_INFINITY;
  return firstLatLng.distanceTo(secondLatLng);
}

function shouldSuppressKmNearVisibleMaritimeMile(feature, visibleMaritimeMiles) {
  if (feature?.properties?.__encUnit !== "km") return false;

  return visibleMaritimeMiles.some(
    (maritimeMileFeature) =>
      getFeatureDistanceMeters(feature, maritimeMileFeature) <= LOCAL_KM_MN_CONFLICT_DISTANCE_METERS
  );
}

function isNearbyDuplicateLabel(feature, selectedFeatures) {
  const properties = feature?.properties || {};

  return selectedFeatures.some((selectedFeature) => {
    const selectedProperties = selectedFeature?.properties || {};
    if (selectedProperties.__encKey !== properties.__encKey) return false;

    return getFeatureDistanceMeters(feature, selectedFeature) <= LOCAL_LABEL_DUPLICATE_DISTANCE_METERS;
  });
}

function buildRepresentativeLabelFeatures(features = [], zoom) {
  const candidateFeatures = [];

  for (const feature of features) {
    const properties = feature?.properties || {};
    if (!properties.distance_label) continue;

    const normalized = normalizeDistanceMark(feature);
    if (!isRenderablePermanentNavigationLabel(normalized)) continue;

    if (!shouldRenderLabelAtZoom(normalized, zoom)) continue;

    const permanentLabel = normalized.label;
    const key = `${normalized.unit}:${normalized.value}`;

    candidateFeatures.push({
      ...feature,
      properties: {
        ...properties,
        __encUnit: normalized.unit,
        __encValue: normalized.value,
        __encLabel: permanentLabel,
        __encReason: normalized.reason,
        __encKey: key,
      },
    });
  }

  const visibleMaritimeMiles = candidateFeatures.filter(
    (feature) => feature?.properties?.__encUnit === "mn"
  );
  const representativeFeatures = [];

  for (const feature of candidateFeatures) {
    if (shouldSuppressKmNearVisibleMaritimeMile(feature, visibleMaritimeMiles)) continue;
    if (isNearbyDuplicateLabel(feature, representativeFeatures)) continue;
    representativeFeatures.push(feature);
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

    return {
      allVisiblePoints: toFeatureCollection(visibleAllPointFeatures),
      visibleLabels: toFeatureCollection(visibleRepresentativeLabelFeatures),
    };
  }, [distanceMarks, viewState.bounds, viewState.zoom]);

  const { zoom } = viewState;
  const showFairway = zoom >= 7;
  const showLabels = zoom >= 8;
  const showAllPoints = zoom > 14;

  return (
    <LayerGroup>
      {showFairway && fairway && (
        <>
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
          <GeoJSON
            key={`enc-fairway-boundary-${zoom < 8 ? "very-low" : zoom < 10 ? "low" : zoom <= 14 ? "mid" : "high"}`}
            data={fairway}
            style={() => getFairwayBoundaryStyle(zoom)}
            interactive={false}
          />
        </>
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
          pointToLayer={(feature, latlng) =>
            L.marker(latlng, {
              icon: buildLabelIcon(feature?.properties?.__encLabel || ""),
              interactive: false,
              keyboard: false,
              zIndexOffset: 1000,
            })
          }
        />
      )}
    </LayerGroup>
  );
}




