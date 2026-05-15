"use client";

import React, { useEffect, useMemo, useState } from "react";
import { GeoJSON, LayerGroup } from "react-leaflet";
import L from "leaflet";

const DISTANCE_MARKS_URL = "/layers/danube_km_clean.geojson";
const FAIRWAY_URL = "/layers/danube_fairway.geojson";

const FAIRWAY_STYLE = {
  fillColor: "#35D399",
  color: "#A7FFE6",
  fillOpacity: 0.22,
  opacity: 0.65,
  weight: 1.2,
};

const LABEL_ICON = L.divIcon({
  className: "enc-navigation-label-anchor",
  html: "",
  iconSize: [0, 0],
});

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
  if (rawValue === null) return null;

  if (hasMarineMilesHint(properties)) {
    return `Mm ${formatDistanceValue(rawValue)}`;
  }

  if (Number(properties.catdis) === 1 && rawValue <= 1075) {
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

export default function EncNavigationOverlay() {
  const [distanceMarks, setDistanceMarks] = useState(null);
  const [fairway, setFairway] = useState(null);

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

  const labelFeatures = useMemo(() => {
    if (!distanceMarks?.features) return null;

    const seenByWtwdis = new Set();
    const features = [];

    for (const feature of distanceMarks.features) {
      const properties = feature?.properties || {};
      const rawWtwdis = properties.wtwdis;
      if (Number(properties.catdis) !== 1) continue;
      if (rawWtwdis === null || rawWtwdis === undefined || rawWtwdis === "") continue;
      if (seenByWtwdis.has(String(rawWtwdis))) continue;

      const label = getSafeDistanceLabel(properties);
      if (!label) continue;

      seenByWtwdis.add(String(rawWtwdis));
      features.push({
        ...feature,
        properties: {
          ...properties,
          __encLabel: label,
        },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }, [distanceMarks]);

  return (
    <LayerGroup>
      {fairway && (
        <GeoJSON
          data={fairway}
          style={() => FAIRWAY_STYLE}
          onEachFeature={(_, layer) => {
            layer.bindPopup(buildFairwayPopup(), { className: "enc-navigation-popup" });
          }}
        />
      )}

      {distanceMarks && (
        <GeoJSON
          data={distanceMarks}
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

      {labelFeatures && (
        <GeoJSON
          data={labelFeatures}
          pointToLayer={(_, latlng) =>
            L.marker(latlng, {
              icon: LABEL_ICON,
              interactive: false,
              keyboard: false,
            })
          }
          onEachFeature={(feature, layer) => {
            const label = feature?.properties?.__encLabel;
            if (!label) return;
            layer.bindTooltip(label, LABEL_TOOLTIP_OPTIONS);
          }}
        />
      )}
    </LayerGroup>
  );
}
