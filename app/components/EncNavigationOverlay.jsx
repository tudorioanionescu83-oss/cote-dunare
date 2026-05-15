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

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDistanceValue(value) {
  if (value === null) return null;
  return Number.isInteger(value) ? String(value) : String(value);
}

function hasMarineMilesHint(properties = {}) {
  const text = `${properties.OBJNAM || ""} ${properties.INFORM || ""}`;
  return /mm|mile|mil[aă]/i.test(text);
}

function getSafeDistanceLabel(properties = {}) {
  const rawValue = toNumber(properties.wtwdis);
  if (rawValue === null || rawValue > 1075) return null;

  if (hasMarineMilesHint(properties)) {
    return `Mm ${formatDistanceValue(rawValue)}`;
  }

  if (Number(properties.catdis) === 1) {
    return `Km ${formatDistanceValue(rawValue)}`;
  }

  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildDistancePopup(properties = {}) {
  const safeLabel = getSafeDistanceLabel(properties);
  const title = safeLabel || "Marcaj ENC";
  const rawWtwdis =
    properties.wtwdis === null || properties.wtwdis === undefined || properties.wtwdis === ""
      ? "-"
      : properties.wtwdis;
  const catdis =
    properties.catdis === null || properties.catdis === undefined || properties.catdis === ""
      ? "-"
      : properties.catdis;

  return `
    <div class="enc-navigation-popup__content">
      <strong>${escapeHtml(title)}</strong><br />
      wtwdis: ${escapeHtml(rawWtwdis)}<br />
      catdis: ${escapeHtml(catdis)}<br />
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
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates)) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return L.latLng(lat, lng);
}

function isFeatureInBounds(feature, bounds) {
  const latlng = getPointLatLng(feature);
  return Boolean(latlng && bounds?.contains(latlng));
}

function getFairwayStyle(zoom) {
  const isLowZoom = zoom < 10;
  const isHighZoom = zoom >= 14;

  return {
    fillColor: "#35D399",
    color: "#A7FFE6",
    fillOpacity: isLowZoom ? 0.12 : isHighZoom ? 0.22 : 0.18,
    opacity: isLowZoom ? 0.5 : 0.65,
    weight: isLowZoom ? 0.8 : isHighZoom ? 1.2 : 1,
  };
}

function buildRepresentativeMajorFeatures(features = []) {
  const seenByWtwdis = new Set();
  const representativeFeatures = [];

  for (const feature of features) {
    const properties = feature?.properties || {};
    const rawWtwdis = properties.wtwdis;
    if (Number(properties.catdis) !== 1) continue;
    if (rawWtwdis === null || rawWtwdis === undefined || rawWtwdis === "") continue;

    const key = String(rawWtwdis);
    if (seenByWtwdis.has(key)) continue;

    seenByWtwdis.add(key);
    representativeFeatures.push(feature);
  }

  return representativeFeatures;
}

export default function EncNavigationOverlay() {
  const map = useMap();
  const [distanceMarks, setDistanceMarks] = useState(null);
  const [fairway, setFairway] = useState(null);
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
    const representativeMajorFeatures = buildRepresentativeMajorFeatures(allFeatures);

    const visibleRepresentativeMajorFeatures = representativeMajorFeatures.filter((feature) =>
      isFeatureInBounds(feature, viewState.bounds)
    );
    const visibleAllPointFeatures = allFeatures.filter((feature) =>
      isFeatureInBounds(feature, viewState.bounds)
    );

    const labelFeaturesEvery10 = visibleRepresentativeMajorFeatures
      .filter((feature) => {
        const rawValue = toNumber(feature?.properties?.wtwdis);
        return rawValue !== null && rawValue <= 1075 && rawValue % 10 === 0;
      })
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          __encLabel: getSafeDistanceLabel(feature.properties),
        },
      }))
      .filter((feature) => feature.properties.__encLabel);

    const labelFeaturesEvery5 = visibleRepresentativeMajorFeatures
      .filter((feature) => {
        const rawValue = toNumber(feature?.properties?.wtwdis);
        return rawValue !== null && rawValue <= 1075 && rawValue % 5 === 0;
      })
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          __encLabel: getSafeDistanceLabel(feature.properties),
        },
      }))
      .filter((feature) => feature.properties.__encLabel);

    const labelFeaturesAllMajor = visibleRepresentativeMajorFeatures
      .map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          __encLabel: getSafeDistanceLabel(feature.properties),
        },
      }))
      .filter((feature) => feature.properties.__encLabel);

    return {
      representativeMajorPoints: toFeatureCollection(visibleRepresentativeMajorFeatures),
      allVisiblePoints: toFeatureCollection(visibleAllPointFeatures),
      labelsEvery10: toFeatureCollection(labelFeaturesEvery10),
      labelsEvery5: toFeatureCollection(labelFeaturesEvery5),
      labelsAllMajor: toFeatureCollection(labelFeaturesAllMajor),
    };
  }, [distanceMarks, viewState.bounds]);

  const { zoom } = viewState;
  const showFairway = zoom >= 8;
  const showMajorLabelsEvery10 = zoom >= 10 && zoom < 12;
  const showMajorLabelsEvery5 = zoom >= 12 && zoom < 14;
  const showRepresentativeMajorPoints = zoom >= 12 && zoom < 14;
  const showAllPoints = zoom >= 14;
  const showAllMajorLabels = zoom >= 14;

  return (
    <LayerGroup>
      {showFairway && fairway && (
        <GeoJSON
          key={`enc-fairway-${zoom < 10 ? "low" : zoom < 14 ? "mid" : "high"}`}
          data={fairway}
          style={() => getFairwayStyle(zoom)}
          onEachFeature={(_, layer) => {
            layer.bindPopup(buildFairwayPopup(), { className: "enc-navigation-popup" });
          }}
        />
      )}

      {showRepresentativeMajorPoints && (
        <GeoJSON
          key={`enc-major-points-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.representativeMajorPoints}
          pointToLayer={(_, latlng) =>
            L.circleMarker(latlng, {
              radius: 2.4,
              fillColor: "#00E5FF",
              color: "#FFFFFF",
              weight: 0.9,
              opacity: 0.95,
              fillOpacity: 0.88,
            })
          }
          onEachFeature={(feature, layer) => {
            layer.bindPopup(buildDistancePopup(feature?.properties), {
              className: "enc-navigation-popup",
            });
          }}
        />
      )}

      {showAllPoints && (
        <GeoJSON
          key={`enc-all-points-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.allVisiblePoints}
          pointToLayer={(feature, latlng) => {
            const isMajorMark = Number(feature?.properties?.catdis) === 1;
            return L.circleMarker(latlng, {
              radius: isMajorMark ? 4 : 3,
              fillColor: "#00E5FF",
              color: "#FFFFFF",
              weight: 1.15,
              opacity: 1,
              fillOpacity: 0.95,
            });
          }}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(buildDistancePopup(feature?.properties), {
              className: "enc-navigation-popup",
            });
          }}
        />
      )}

      {showMajorLabelsEvery10 && (
        <GeoJSON
          key={`enc-labels-10-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.labelsEvery10}
          pointToLayer={(_, latlng) =>
            L.circleMarker(latlng, {
              radius: 0,
              opacity: 0,
              fillOpacity: 0,
              interactive: false,
            })
          }
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(feature.properties.__encLabel, LABEL_TOOLTIP_OPTIONS);
          }}
        />
      )}

      {showMajorLabelsEvery5 && (
        <GeoJSON
          key={`enc-labels-5-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.labelsEvery5}
          pointToLayer={(_, latlng) =>
            L.circleMarker(latlng, {
              radius: 0,
              opacity: 0,
              fillOpacity: 0,
              interactive: false,
            })
          }
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(feature.properties.__encLabel, LABEL_TOOLTIP_OPTIONS);
          }}
        />
      )}

      {showAllMajorLabels && (
        <GeoJSON
          key={`enc-labels-all-${viewState.zoom}-${viewState.bounds.toBBoxString()}`}
          data={featureSets.labelsAllMajor}
          pointToLayer={(_, latlng) =>
            L.circleMarker(latlng, {
              radius: 0,
              opacity: 0,
              fillOpacity: 0,
              interactive: false,
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
