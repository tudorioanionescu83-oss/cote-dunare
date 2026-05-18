"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  ScaleControl,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import FastLayerControl from "./FastLayerControl";
import {
  buildKmPopup,
  buildPcPolygonPopup,
  buildPcPopup,
  buildSturgeonHabitatPopup,
} from "./fastPopup";

const LAYER_URLS = {
  afdjKm: "/fast/afdj-km.geojson",
  pcKmSegments: "/fast/pc-km-segments.geojson",
  pcPlanningPolygons: "/fast/pc-planning-polygons.geojson",
  pcPolygons: "/fast/pc-zones.geojson",
  sturgeonHabitats: "/fast/sturgeon-habitats.geojson",
  sturgeonHabitatReport: "/fast/sturgeon-habitats.report.json",
  fairway: "/layers/danube_fairway.geojson",
  works: "/fast/works.geojson",
  disposalZones: "/fast/disposal-zones.geojson",
};

const HABITAT_SELECTIONS = {
  sturgeonSpawning: "spawning_potential",
  sturgeonConfirmedSpawning: "confirmed_spawning",
  sturgeonFeeding: "feeding_yoy",
  sturgeonWintering: "wintering_refuge",
  sturgeonProtection: "sensitive_protection",
};

const INITIAL_LAYERS = {
  pcPlanningPolygons: true,
  pcKmSegments: true,
  pcPolygons: false,
  afdjKm: true,
  works: false,
  disposalZones: false,
  monitoringOverview: true,
  monitoringSturgeons: true,
  sturgeonSpawning: false,
  sturgeonConfirmedSpawning: false,
  sturgeonFeeding: false,
  sturgeonWintering: false,
  sturgeonProtection: false,
};

const INITIAL_AVAILABILITY = {
  pcPlanningPolygons: false,
  pcKmSegments: false,
  pcPolygons: false,
  afdjKm: false,
  works: false,
  disposalZones: false,
  monitoringOverview: false,
  monitoringSturgeons: false,
  sturgeonSpawning: false,
  sturgeonConfirmedSpawning: false,
  sturgeonFeeding: false,
  sturgeonWintering: false,
  sturgeonProtection: false,
};

const FAST_RKM_MIN = 0;
const FAST_RKM_MAX = 863;

function isFeatureCollection(payload) {
  return payload?.type === "FeatureCollection" && Array.isArray(payload.features);
}

function toFeatureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features,
  };
}

async function fetchGeoJson(url, layerName, optional = false) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      console.warn(`[FAST] Layer indisponibil: ${layerName} (${response.status})`);
      return null;
    }
    const payload = await response.json();
    if (!isFeatureCollection(payload)) {
      console.warn(`[FAST] Layer invalid: ${layerName}`);
      return null;
    }
    return payload;
  } catch (error) {
    console.warn(
      `[FAST] Nu am putut încărca layerul ${layerName}${optional ? " opțional" : ""}.`,
      error
    );
    return null;
  }
}

function getPointCoordinates(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates)) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function getPointLatLng(feature) {
  const coordinates = getPointCoordinates(feature);
  return coordinates ? L.latLng(coordinates.lat, coordinates.lng) : null;
}

function isFeatureInBounds(feature, bounds) {
  const latLng = getPointLatLng(feature);
  return Boolean(latLng && bounds?.contains(latLng));
}

function getKmLabelInterval(zoom) {
  if (zoom >= 15.5) return 1;
  if (zoom >= 14.5) return 2;
  if (zoom >= 13.5) return 5;
  if (zoom >= 12.5) return 10;
  if (zoom >= 11.5) return 20;
  if (zoom >= 10) return 50;
  if (zoom >= 8) return 100;
  return null;
}

function isWholeKmValue(value) {
  return Number.isInteger(value);
}

function isSubKmValue(value) {
  return Number.isFinite(value) && !Number.isInteger(value);
}

async function fetchJson(url, layerName, optional = false) {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) {
      console.warn(`[FAST] Resursă indisponibilă: ${layerName} (${response.status})`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(
      `[FAST] Nu am putut încărca resursa ${layerName}${optional ? " opțională" : ""}.`,
      error
    );
    return null;
  }
}

function isFastRelevantKmFeature(feature) {
  const km = Number(feature?.properties?.wtwdis);
  return (
    feature?.geometry?.type === "Point" &&
    Number.isFinite(km) &&
    km >= FAST_RKM_MIN &&
    km <= FAST_RKM_MAX
  );
}

function isMaritimeDanubeCoordinate(feature) {
  const coordinates = getPointCoordinates(feature);
  if (!coordinates) return false;
  return coordinates.lat >= 45.15 && (coordinates.lng >= 28.15 || coordinates.lat >= 45.4);
}

function getDistanceLabel(feature, value) {
  if (isMaritimeDanubeCoordinate(feature) && value >= 0 && value <= 80) {
    return `Mm ${value}`;
  }
  return `Km ${value}`;
}

function isFastHectometricFeature(feature) {
  const value = Number(feature?.properties?.wtwdis);
  return (
    feature?.geometry?.type === "Point" &&
    Number(feature?.properties?.catdis) === 3 &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  );
}

function getFeaturePriority(feature) {
  const catdis = Number(feature?.properties?.catdis);
  if (catdis === 1) return 0;
  if (catdis === 2) return 1;
  if (catdis === 3) return 2;
  return 3;
}

function buildRepresentativeKmFeatures(features = [], zoom) {
  const interval = getKmLabelInterval(zoom);
  if (!interval) return [];

  const bestByKm = new Map();
  for (const feature of features) {
    const km = Number(feature?.properties?.wtwdis);
    if (!isWholeKmValue(km) || km % interval !== 0) continue;

    const existing = bestByKm.get(km);
    if (!existing || getFeaturePriority(feature) < getFeaturePriority(existing)) {
      bestByKm.set(km, feature);
    }
  }

  return [...bestByKm.entries()]
    .sort(([firstKm], [secondKm]) => secondKm - firstKm)
    .map(([km, feature]) => ({
      ...feature,
      properties: {
        ...feature.properties,
        __fastKmLabel: getDistanceLabel(feature, km),
      },
    }));
}

function buildRepresentativeWholeKmPointFeatures(features = [], zoom) {
  if (zoom < 12) return [];

  const bestByKm = new Map();
  for (const feature of features) {
    const km = Number(feature?.properties?.wtwdis);
    if (!isWholeKmValue(km)) continue;

    const existing = bestByKm.get(km);
    if (!existing || getFeaturePriority(feature) < getFeaturePriority(existing)) {
      bestByKm.set(km, feature);
    }
  }

  return [...bestByKm.values()];
}

function buildRepresentativeSubKmPointFeatures(features = [], zoom) {
  if (zoom < 15) return [];

  const bestByValue = new Map();
  for (const feature of features) {
    const km = Number(feature?.properties?.wtwdis);
    if (!isSubKmValue(km) && !isFastHectometricFeature(feature)) continue;

    const coordinates = feature?.geometry?.coordinates || [];
    const key = `${km}:${coordinates[0]?.toFixed?.(6)}:${coordinates[1]?.toFixed?.(6)}`;
    const existing = bestByValue.get(key);
    if (!existing || getFeaturePriority(feature) < getFeaturePriority(existing)) {
      bestByValue.set(key, feature);
    }
  }

  return [...bestByValue.values()];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildKmLabelIcon(label) {
  return L.divIcon({
    className: "fast-km-label-anchor",
    html: `<div class="fast-km-label">${escapeHtml(label)}</div>`,
  });
}

function buildPcLabelIcon(label, isSelected, isDimmed, showMonitoringBadge, showSturgeonBadge) {
  return L.divIcon({
    className: "fast-pc-label-anchor",
    html: `
      <div class="fast-pc-label${isSelected ? " is-selected" : ""}${
        isDimmed ? " is-dimmed" : ""
      }">
        <span>${escapeHtml(label)}</span>
        ${showMonitoringBadge ? '<em>MON</em>' : ""}
        ${showSturgeonBadge ? '<em>STUR</em>' : ""}
      </div>
    `,
  });
}

function buildHabitatLabelIcon(shortLabel, extendedLabel, zoom) {
  const label = zoom >= 15 ? extendedLabel : shortLabel;
  return L.divIcon({
    className: "fast-habitat-label-anchor",
    html: `<div class="fast-habitat-label">${escapeHtml(label)}</div>`,
  });
}

function getLineMidpointCoordinate(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "LineString" || !Array.isArray(coordinates)) {
    return null;
  }

  return coordinates[Math.floor(coordinates.length / 2)] || null;
}

function buildPcLabelFeatures(
  pcKmSegments,
  zoom,
  selectedPcCode,
  showMonitoringBadge,
  showSturgeonBadge
) {
  if (!pcKmSegments || zoom < 8) return [];
  const hasSelection = Boolean(selectedPcCode);

  return pcKmSegments.features
    .filter((feature) => feature?.properties?.geometry_role === "segment")
    .map((feature) => {
      const midpoint = getLineMidpointCoordinate(feature);
      if (!midpoint) return null;

      const pcCode = feature.properties.pc_code;
      const label = zoom >= 10 ? `${pcCode} ${feature.properties.name}` : pcCode;
      return {
        type: "Feature",
        properties: {
          ...feature.properties,
          __fastPcLabel: label,
          __fastIsSelected: pcCode === selectedPcCode,
          __fastIsDimmed: hasSelection && pcCode !== selectedPcCode,
          __fastShowMonitoringBadge: showMonitoringBadge,
          __fastShowSturgeonBadge: showSturgeonBadge,
        },
        geometry: {
          type: "Point",
          coordinates: midpoint,
        },
      };
    })
    .filter(Boolean);
}

function FastFitBounds({ datasets, fitRequestId }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    const featureCollections = datasets.filter(isFeatureCollection);
    if (!featureCollections.length) return;
    if (fitRequestId === 0 && fittedRef.current) return;

    const group = L.featureGroup(featureCollections.map((dataset) => L.geoJSON(dataset)));
    const bounds = group.getBounds();
    if (!bounds.isValid()) return;

    map.fitBounds(bounds.pad(0.14), { maxZoom: 12 });
    fittedRef.current = true;
  }, [datasets, fitRequestId, map]);

  return null;
}

function FastViewState({ onChange }) {
  const map = useMap();

  useEffect(() => {
    const updateViewState = () => {
      onChange({
        zoom: map.getZoom(),
        bounds: map.getBounds().pad(0.12),
      });
    };

    updateViewState();
    map.on("zoomend", updateViewState);
    map.on("moveend", updateViewState);

    return () => {
      map.off("zoomend", updateViewState);
      map.off("moveend", updateViewState);
    };
  }, [map, onChange]);

  return null;
}

function FastPcFocus({ selectedFeature, selectionRequestId }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedFeature || selectionRequestId === 0) return;

    const bounds = L.geoJSON(selectedFeature).getBounds();
    if (!bounds.isValid()) return;

    map.flyToBounds(bounds.pad(0.38), {
      maxZoom: 13,
      duration: 0.8,
    });
  }, [map, selectedFeature, selectionRequestId]);

  return null;
}

function getFairwayStyle(zoom) {
  const isVeryLowZoom = zoom < 8;
  const isLowZoom = zoom < 10;
  const isHighZoom = zoom >= 14;

  return {
    fillColor: "#35D399",
    color: "#A7FFE6",
    fillOpacity: isVeryLowZoom ? 0.11 : isLowZoom ? 0.14 : isHighZoom ? 0.22 : 0.18,
    opacity: isVeryLowZoom ? 0.42 : isLowZoom ? 0.52 : 0.62,
    weight: isLowZoom ? 0.8 : isHighZoom ? 1.18 : 1,
  };
}

function getFairwayBoundaryStyle(zoom) {
  const isVeryLowZoom = zoom < 8;
  const isLowZoom = zoom < 10;
  const isHighZoom = zoom >= 14;

  return {
    fill: false,
    color: "#F59E0B",
    opacity: isVeryLowZoom ? 0.24 : isLowZoom ? 0.32 : isHighZoom ? 0.48 : 0.4,
    weight: isLowZoom ? 0.8 : isHighZoom ? 1.15 : 0.95,
    dashArray: isLowZoom ? "3 6" : "4 6",
  };
}

function getPcPolygonStyle() {
  return {
    color: "#0f766e",
    weight: 2,
    opacity: 0.9,
    fillColor: "#2dd4bf",
    fillOpacity: 0.22,
  };
}

function getPcPlanningPolygonStyle(feature, selectedPcCode) {
  const isSelected = feature?.properties?.pc_code === selectedPcCode;
  const isDimmed = Boolean(selectedPcCode) && !isSelected;
  return {
    className: `fast-pc-shape${isSelected ? " is-selected" : ""}${
      isDimmed ? " is-dimmed" : ""
    }`,
    color: isSelected ? "#22d3ee" : "#7c3aed",
    weight: isSelected ? 4 : isDimmed ? 1.6 : 2,
    opacity: isSelected ? 1 : isDimmed ? 0.36 : 0.86,
    fillColor: isSelected ? "#06b6d4" : "#c084fc",
    fillOpacity: isSelected ? 0.3 : isDimmed ? 0.08 : 0.18,
  };
}

function getPcKmSegmentStyle(feature, selectedPcCode) {
  if (feature?.geometry?.type !== "LineString") return {};

  const isSelected = feature?.properties?.pc_code === selectedPcCode;
  const isDimmed = Boolean(selectedPcCode) && !isSelected;
  return {
    className: `fast-pc-segment${isSelected ? " is-selected" : ""}${
      isDimmed ? " is-dimmed" : ""
    }`,
    color: isSelected ? "#22d3ee" : "#e11d48",
    weight: isSelected ? 7 : isDimmed ? 3 : 4.8,
    opacity: isSelected ? 1 : isDimmed ? 0.34 : 0.95,
    dashArray: isSelected ? "10 5" : "8 6",
  };
}

function getWorksStyle() {
  return {
    color: "#f97316",
    weight: 2.4,
    opacity: 0.92,
    fillColor: "#fb923c",
    fillOpacity: 0.18,
  };
}

function getDisposalStyle() {
  return {
    color: "#7c3aed",
    weight: 1.8,
    opacity: 0.9,
    fillColor: "#a78bfa",
    fillOpacity: 0.2,
  };
}

function FastRequestedFitBounds({ datasets, fitRequestId }) {
  const map = useMap();

  useEffect(() => {
    if (fitRequestId === 0) return;
    const featureCollections = datasets.filter(isFeatureCollection);
    if (!featureCollections.length) return;

    const group = L.featureGroup(featureCollections.map((dataset) => L.geoJSON(dataset)));
    const bounds = group.getBounds();
    if (!bounds.isValid()) return;

    map.fitBounds(bounds.pad(0.14), { maxZoom: 12 });
  }, [datasets, fitRequestId, map]);

  return null;
}

function getDatasetsBounds(datasets = []) {
  const featureCollections = datasets.filter(isFeatureCollection);
  if (!featureCollections.length) return null;
  const group = L.featureGroup(featureCollections.map((dataset) => L.geoJSON(dataset)));
  const bounds = group.getBounds();
  return bounds.isValid() ? bounds : null;
}

function getSturgeonHabitatStyle(feature, selectedHabitatId) {
  const habitatType = feature?.properties?.habitat_type;
  const isSelected = feature?.properties?.id === selectedHabitatId;
  if (habitatType === "spawning_potential") {
    return {
      color: "#C94F00",
      weight: isSelected ? 3.4 : 2,
      opacity: 0.9,
      fillColor: "#FF7A00",
      fillOpacity: isSelected ? 0.42 : 0.32,
    };
  }
  if (habitatType === "confirmed_spawning") {
    return {
      color: "#7A0015",
      weight: isSelected ? 3.8 : 2.4,
      opacity: 0.96,
      fillColor: "#B00020",
      fillOpacity: isSelected ? 0.55 : 0.45,
    };
  }
  if (habitatType === "feeding_yoy") {
    return {
      color: "#1E874B",
      weight: isSelected ? 3.4 : 2,
      opacity: 0.9,
      fillColor: "#2ECC71",
      fillOpacity: isSelected ? 0.42 : 0.32,
    };
  }
  if (habitatType === "sensitive_protection") {
    return {
      color: "#5B2C6F",
      weight: isSelected ? 3.8 : 2.4,
      opacity: 0.96,
      fillColor: "#8E44AD",
      fillOpacity: isSelected ? 0.38 : 0.3,
      dashArray: "7 5",
    };
  }
  return {
    color: "#0B3D91",
    weight: isSelected ? 3.4 : 2,
    opacity: 0.92,
    fillColor: "#2478FF",
    fillOpacity: isSelected ? 0.48 : 0.38,
  };
}

function hasMonitoringOverview(featureCollection) {
  return Boolean(
    featureCollection?.features?.some(
      (feature) =>
        feature?.properties?.monitoring_overview ||
        feature?.properties?.fish_monitoring_overview
    )
  );
}

function bindPcPopupInteractions(layer, feature, onSelectPc) {
  layer.bindPopup(buildPcPopup(feature), { className: "fast-popup" });
  layer.on("click", () => onSelectPc(feature?.properties?.pc_code));
  layer.on("popupopen", (event) => {
    const detailButton = event.popup
      .getElement()
      ?.querySelector("[data-fast-pc-code]");
    detailButton?.addEventListener("click", () => {
      onSelectPc(feature?.properties?.pc_code);
    });
  });
}

export default function FastMap({
  selectedPcCode,
  selectionRequestId,
  onSelectPc,
  isPcDetailOpen,
  onHabitatControlOpen,
}) {
  const [basemap, setBasemap] = useState("map");
  const [fitRequestId, setFitRequestId] = useState(0);
  const [habitatFitRequestId, setHabitatFitRequestId] = useState(0);
  const [activeLayers, setActiveLayers] = useState(INITIAL_LAYERS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [selectedHabitatId, setSelectedHabitatId] = useState(null);
  const [viewState, setViewState] = useState({
    zoom: 9,
    bounds: null,
  });
  const [datasets, setDatasets] = useState({
    afdjKm: null,
    pcKmSegments: null,
    pcPlanningPolygons: null,
    pcPolygons: null,
    sturgeonHabitats: null,
    sturgeonHabitatReport: null,
    fairway: null,
    works: null,
    disposalZones: null,
  });
  const pointRenderer = useMemo(() => L.canvas({ padding: 0.25 }), []);

  useEffect(() => {
    let cancelled = false;

    async function loadLayers() {
      const [
        afdjKm,
        pcKmSegments,
        pcPlanningPolygons,
        pcPolygons,
        sturgeonHabitats,
        sturgeonHabitatReport,
        fairway,
        works,
        disposalZones,
      ] =
        await Promise.all([
          fetchGeoJson(LAYER_URLS.afdjKm, "Km AFDJ"),
          fetchGeoJson(LAYER_URLS.pcKmSegments, "PC km segments"),
          fetchGeoJson(LAYER_URLS.pcPlanningPolygons, "PC planning polygons", true),
          fetchGeoJson(LAYER_URLS.pcPolygons, "PC polygons"),
          fetchGeoJson(LAYER_URLS.sturgeonHabitats, "Habitate sturioni", true),
          fetchJson(LAYER_URLS.sturgeonHabitatReport, "Raport habitate sturioni", true),
          fetchGeoJson(LAYER_URLS.fairway, "Șenal navigabil"),
          fetchGeoJson(LAYER_URLS.works, "Lucrări principale", true),
          fetchGeoJson(LAYER_URLS.disposalZones, "Zone depozitare material dragat", true),
        ]);

      if (cancelled) return;

      setDatasets({
        afdjKm,
        pcKmSegments,
        pcPlanningPolygons,
        pcPolygons,
        sturgeonHabitats,
        sturgeonHabitatReport,
        fairway,
        works,
        disposalZones,
      });
      setAvailability({
        afdjKm: Boolean(afdjKm),
        pcPlanningPolygons: Boolean(pcPlanningPolygons),
        pcKmSegments: Boolean(pcKmSegments),
        pcPolygons: Boolean(pcPolygons),
        ...Object.fromEntries(
          Object.entries(HABITAT_SELECTIONS).map(([id, habitatType]) => [
            id,
            Boolean(
              sturgeonHabitats?.features?.some(
                (feature) => feature?.properties?.habitat_type === habitatType
              )
            ),
          ])
        ),
        works: Boolean(works),
        disposalZones: Boolean(disposalZones),
        monitoringOverview: hasMonitoringOverview(pcKmSegments),
        monitoringSturgeons: hasMonitoringOverview(pcKmSegments),
      });
    }

    loadLayers();
    return () => {
      cancelled = true;
    };
  }, []);

  const fitDatasets = useMemo(
    () =>
      [
        datasets.pcPlanningPolygons,
        datasets.pcKmSegments,
        datasets.sturgeonHabitats,
      ].filter(Boolean),
    [datasets.pcKmSegments, datasets.pcPlanningPolygons, datasets.sturgeonHabitats]
  );

  const fastReferenceBounds = useMemo(
    () => getDatasetsBounds(fitDatasets)?.pad(0.18) || null,
    [fitDatasets]
  );

  const visibleKmFeatures = useMemo(() => {
    const features = datasets.afdjKm?.features || [];
    if (!viewState.bounds) return [];
    return features.filter(
      (feature) =>
        isFastRelevantKmFeature(feature) && isFeatureInBounds(feature, viewState.bounds)
    );
  }, [datasets.afdjKm, viewState.bounds]);

  const visibleSubKmMarkerFeatures = useMemo(() => {
    const features = datasets.afdjKm?.features || [];
    if (!viewState.bounds || !fastReferenceBounds) return [];
    return features.filter((feature) => {
      const point = getPointLatLng(feature);
      return (
        point &&
        isFastHectometricFeature(feature) &&
        viewState.bounds.contains(point) &&
        fastReferenceBounds.contains(point)
      );
    });
  }, [datasets.afdjKm, fastReferenceBounds, viewState.bounds]);

  const featureSets = useMemo(
    () => ({
      kmLabels: toFeatureCollection(
        buildRepresentativeKmFeatures(visibleKmFeatures, viewState.zoom)
      ),
      wholeKmPoints: toFeatureCollection(
        buildRepresentativeWholeKmPointFeatures(visibleKmFeatures, viewState.zoom)
      ),
      subKmPoints: toFeatureCollection(
        buildRepresentativeSubKmPointFeatures(
          [...visibleKmFeatures, ...visibleSubKmMarkerFeatures],
          viewState.zoom
        )
      ),
      pcLabels: toFeatureCollection(
        buildPcLabelFeatures(
          datasets.pcKmSegments,
          viewState.zoom,
          selectedPcCode,
          activeLayers.monitoringOverview,
          activeLayers.monitoringSturgeons
        )
      ),
      habitatLabels: toFeatureCollection(
        buildHabitatLabelFeatures(
          datasets.sturgeonHabitats?.features?.filter((feature) =>
            isHabitatVisible(feature, activeLayers)
          ) || [],
          viewState.zoom
        )
      ),
    }),
    [
      activeLayers.monitoringOverview,
      activeLayers.monitoringSturgeons,
      activeLayers.sturgeonConfirmedSpawning,
      activeLayers.sturgeonFeeding,
      activeLayers.sturgeonProtection,
      activeLayers.sturgeonSpawning,
      activeLayers.sturgeonWintering,
      datasets.pcKmSegments,
      datasets.sturgeonHabitats,
      selectedPcCode,
      viewState.zoom,
      visibleKmFeatures,
      visibleSubKmMarkerFeatures,
    ]
  );

  const visibleSturgeonHabitats = useMemo(
    () =>
      toFeatureCollection(
        datasets.sturgeonHabitats?.features?.filter((feature) =>
          isHabitatVisible(feature, activeLayers)
        ) || []
      ),
    [
      activeLayers.sturgeonConfirmedSpawning,
      activeLayers.sturgeonFeeding,
      activeLayers.sturgeonProtection,
      activeLayers.sturgeonSpawning,
      activeLayers.sturgeonWintering,
      datasets.sturgeonHabitats,
    ]
  );

  const habitatCounts = useMemo(() => {
    const report = datasets.sturgeonHabitatReport || {};
    return {
      datasetTotal: report.dataset_total || 0,
      generatedTotal: report.generated_features || datasets.sturgeonHabitats?.features?.length || 0,
      skippedTotal: report.skipped_features || 0,
      manualReviewTotal: report.needs_manual_review?.length || 0,
      skipped: report.skipped || [],
      datasetByType: report.dataset_counts_by_habitat_type || {},
      generatedByType: report.generated_counts_by_habitat_type || {},
    };
  }, [datasets.sturgeonHabitatReport, datasets.sturgeonHabitats]);

  const selectedFeature = useMemo(
    () =>
      datasets.pcPlanningPolygons?.features?.find(
        (feature) => feature?.properties?.pc_code === selectedPcCode
      ) ||
      datasets.pcKmSegments?.features?.find(
        (feature) =>
          feature?.properties?.geometry_role === "segment" &&
          feature?.properties?.pc_code === selectedPcCode
      ) || null,
    [datasets.pcKmSegments, datasets.pcPlanningPolygons, selectedPcCode]
  );

  return (
    <div className="fast-map-root">
      <MapContainer
        center={[45.15, 29.1]}
        zoom={9}
        zoomControl
        scrollWheelZoom
        className="fast-map"
      >
        {basemap === "map" ? (
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution="&copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        <FastFitBounds datasets={fitDatasets} fitRequestId={fitRequestId} />
        <FastRequestedFitBounds
          datasets={[visibleSturgeonHabitats]}
          fitRequestId={habitatFitRequestId}
        />
        <FastViewState onChange={setViewState} />
        <FastPcFocus
          selectedFeature={selectedFeature}
          selectionRequestId={selectionRequestId}
        />
        <ScaleControl position="bottomleft" imperial={false} />

        {datasets.fairway && viewState.zoom >= 7 && (
          <>
            <GeoJSON
              key={`fast-fairway-${viewState.zoom < 8 ? "very-low" : viewState.zoom < 10 ? "low" : viewState.zoom < 14 ? "mid" : "high"}`}
              data={datasets.fairway}
              style={() => getFairwayStyle(viewState.zoom)}
              interactive={false}
            />
            <GeoJSON
              key={`fast-fairway-boundary-${viewState.zoom < 8 ? "very-low" : viewState.zoom < 10 ? "low" : viewState.zoom < 14 ? "mid" : "high"}`}
              data={datasets.fairway}
              style={() => getFairwayBoundaryStyle(viewState.zoom)}
              interactive={false}
            />
          </>
        )}

        {activeLayers.pcPlanningPolygons && datasets.pcPlanningPolygons && (
          <GeoJSON
            key={`pc-planning-polygons-${selectedPcCode || "none"}`}
            data={datasets.pcPlanningPolygons}
            style={(feature) => getPcPlanningPolygonStyle(feature, selectedPcCode)}
            onEachFeature={(feature, layer) => {
              bindPcPopupInteractions(layer, feature, onSelectPc);
              layer.on("mouseover", () => {
                layer.setStyle({
                  color: "#22d3ee",
                  weight: 4.2,
                  fillColor: "#06b6d4",
                  fillOpacity: 0.32,
                  opacity: 1,
                });
              });
              layer.on("mouseout", () => {
                layer.setStyle(getPcPlanningPolygonStyle(feature, selectedPcCode));
              });
            }}
          />
        )}

        {visibleSturgeonHabitats.features.length > 0 && (
          <GeoJSON
            key={`sturgeon-habitats-${getHabitatLayerStateKey(activeLayers)}-${selectedHabitatId || "none"}`}
            data={visibleSturgeonHabitats}
            style={(feature) => getSturgeonHabitatStyle(feature, selectedHabitatId)}
            pointToLayer={(feature, latlng) => {
              const style = getSturgeonHabitatStyle(feature, selectedHabitatId);
              return L.circleMarker(latlng, {
                radius: feature?.properties?.habitat_type === "confirmed_spawning" ? 7.5 : 6.5,
                ...style,
              });
            }}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(buildSturgeonHabitatPopup(feature), {
                className: "fast-popup fast-habitat-popup",
              });
              layer.on("click", () => {
                setSelectedHabitatId(feature?.properties?.id || null);
                layer.bringToFront?.();
              });
            }}
          />
        )}

        {activeLayers.pcKmSegments && datasets.pcKmSegments && (
          <GeoJSON
            key={`pc-segments-${selectedPcCode || "none"}`}
            data={datasets.pcKmSegments}
            style={(feature) => getPcKmSegmentStyle(feature, selectedPcCode)}
            pointToLayer={(feature, latlng) => {
              const role = feature?.properties?.geometry_role;
              const isSelected = feature?.properties?.pc_code === selectedPcCode;
              const isDimmed = Boolean(selectedPcCode) && !isSelected;
              return L.circleMarker(latlng, {
                className: `fast-pc-marker${isSelected ? " is-selected" : ""}${
                  isDimmed ? " is-dimmed" : ""
                }`,
                radius: isSelected ? 7.5 : isDimmed ? 4.8 : 5.8,
                color: "#ffffff",
                weight: 1.5,
                opacity: isDimmed ? 0.45 : 1,
                fillColor: isSelected
                  ? "#22d3ee"
                  : role === "upstream_marker"
                    ? "#be123c"
                    : "#f97316",
                fillOpacity: isDimmed ? 0.45 : 0.98,
              });
            }}
            onEachFeature={(feature, layer) => {
              const isSegment = feature?.properties?.geometry_role === "segment";
              bindPcPopupInteractions(layer, feature, onSelectPc);

              if (isSegment) {
                layer.on("mouseover", () => {
                  layer.setStyle({
                    color: "#22d3ee",
                    weight: 7.2,
                    opacity: 1,
                  });
                });
                layer.on("mouseout", () => {
                  layer.setStyle(getPcKmSegmentStyle(feature, selectedPcCode));
                });
              }
            }}
          />
        )}

        {(activeLayers.pcKmSegments || activeLayers.pcPlanningPolygons) &&
          featureSets.pcLabels.features.length > 0 && (
          <GeoJSON
            key={`pc-labels-${viewState.zoom}-${selectedPcCode || "none"}-${activeLayers.monitoringOverview}`}
            data={featureSets.pcLabels}
            pointToLayer={(feature, latlng) =>
              L.marker(latlng, {
                icon: buildPcLabelIcon(
                  feature?.properties?.__fastPcLabel || "",
                  feature?.properties?.__fastIsSelected,
                  feature?.properties?.__fastIsDimmed,
                  feature?.properties?.__fastShowMonitoringBadge,
                  feature?.properties?.__fastShowSturgeonBadge
                ),
                keyboard: false,
                zIndexOffset: 1200,
              })
            }
            onEachFeature={(feature, layer) => {
              layer.on("click", () => onSelectPc(feature?.properties?.pc_code));
            }}
          />
        )}

        {featureSets.habitatLabels.features.length > 0 && (
          <GeoJSON
            key={`habitat-labels-${viewState.zoom}-${getHabitatLayerStateKey(activeLayers)}`}
            data={featureSets.habitatLabels}
            pointToLayer={(feature, latlng) =>
              L.marker(latlng, {
                icon: buildHabitatLabelIcon(
                  feature?.properties?.__fastHabitatShortLabel || "",
                  feature?.properties?.__fastHabitatExtendedLabel || "",
                  viewState.zoom
                ),
                interactive: false,
                keyboard: false,
                zIndexOffset: 1180,
              })
            }
          />
        )}

        {activeLayers.pcPolygons && datasets.pcPolygons && (
          <GeoJSON
            data={datasets.pcPolygons}
            style={getPcPolygonStyle}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(buildPcPolygonPopup(feature), { className: "fast-popup" });
            }}
          />
        )}

        {activeLayers.afdjKm && featureSets.wholeKmPoints.features.length > 0 && (
          <GeoJSON
            key={`whole-km-points-${viewState.zoom}-${viewState.bounds?.toBBoxString() || "no-bounds"}`}
            data={featureSets.wholeKmPoints}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 2.7,
                color: "#ffffff",
                weight: 0.8,
                opacity: 1,
                fillColor: "#0284c7",
                fillOpacity: 0.92,
                renderer: pointRenderer,
              })
            }
            onEachFeature={(feature, layer) => {
              layer.bindPopup(buildKmPopup(feature), { className: "fast-popup" });
            }}
          />
        )}

        {activeLayers.afdjKm && featureSets.subKmPoints.features.length > 0 && (
          <GeoJSON
            key={`sub-km-points-${viewState.zoom}-${viewState.bounds?.toBBoxString() || "no-bounds"}`}
            data={featureSets.subKmPoints}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 1.7,
                color: "#ffffff",
                weight: 0.55,
                opacity: 0.95,
                fillColor: "#38bdf8",
                fillOpacity: 0.82,
                renderer: pointRenderer,
              })
            }
            onEachFeature={(feature, layer) => {
              layer.bindPopup(buildKmPopup(feature), { className: "fast-popup" });
            }}
          />
        )}

        {activeLayers.afdjKm && featureSets.kmLabels.features.length > 0 && (
          <GeoJSON
            key={`km-labels-${viewState.zoom}-${viewState.bounds?.toBBoxString() || "no-bounds"}`}
            data={featureSets.kmLabels}
            pointToLayer={(feature, latlng) =>
              L.marker(latlng, {
                icon: buildKmLabelIcon(feature?.properties?.__fastKmLabel || ""),
                interactive: false,
                keyboard: false,
                zIndexOffset: 900,
              })
            }
          />
        )}

        {activeLayers.works && datasets.works && (
          <GeoJSON data={datasets.works} style={getWorksStyle} />
        )}

        {activeLayers.disposalZones && datasets.disposalZones && (
          <GeoJSON data={datasets.disposalZones} style={getDisposalStyle} />
        )}
      </MapContainer>

      <FastLayerControl
        basemap={basemap}
        activeLayers={activeLayers}
        availability={availability}
        habitatCounts={habitatCounts}
        isPcDetailOpen={isPcDetailOpen}
        onBasemapChange={setBasemap}
        onFitToFastSector={() => setFitRequestId((value) => value + 1)}
        onFitToHabitats={() => setHabitatFitRequestId((value) => value + 1)}
        onHabitatControlOpen={onHabitatControlOpen}
        onEnableAllHabitats={() =>
          setActiveLayers((current) => ({
            ...current,
            ...Object.fromEntries(
              Object.keys(HABITAT_SELECTIONS).map((id) => [id, availability[id]])
            ),
          }))
        }
        onToggleLayer={(layerId) =>
          setActiveLayers((current) => ({
            ...current,
            [layerId]: !current[layerId],
          }))
        }
        onToggleAllHabitats={() =>
          setActiveLayers((current) => {
            const habitatIds = Object.keys(HABITAT_SELECTIONS).filter(
              (id) => availability[id]
            );
            const shouldEnable = habitatIds.some((id) => !current[id]);
            return habitatIds.reduce(
              (next, id) => ({
                ...next,
                [id]: shouldEnable,
              }),
              current
            );
          })
        }
      />

    </div>
  );
}

function getHabitatLabelCoordinate(feature) {
  if (feature?.geometry?.type === "Point") {
    return feature.geometry.coordinates || null;
  }
  if (feature?.geometry?.type === "LineString") {
    return getLineMidpointCoordinate(feature);
  }
  if (feature?.geometry?.type !== "Polygon") return null;
  const ring = feature.geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;

  const coordinates = ring.slice(0, -1);
  const total = coordinates.reduce(
    (result, coordinate) => ({
      lng: result.lng + coordinate[0],
      lat: result.lat + coordinate[1],
    }),
    { lng: 0, lat: 0 }
  );

  return [total.lng / coordinates.length, total.lat / coordinates.length];
}

function getHabitatLabelParts(feature) {
  const habitatType = feature?.properties?.habitat_type;
  if (habitatType === "spawning_potential") {
    return { shortLabel: "STU-R", extendedLabel: "Reproducere sturioni" };
  }
  if (habitatType === "confirmed_spawning") {
    return { shortLabel: "STU-RC", extendedLabel: "Reproducere confirmată" };
  }
  if (habitatType === "feeding_yoy") {
    return { shortLabel: "STU-H", extendedLabel: "Hrănire juvenili" };
  }
  if (habitatType === "sensitive_protection") {
    return { shortLabel: "STU-P", extendedLabel: "Protecție sensibilă" };
  }
  return { shortLabel: "STU-I", extendedLabel: "Iernare / refugiu" };
}

function isHabitatVisible(feature, activeLayers) {
  const habitatType = feature?.properties?.habitat_type;
  return Object.entries(HABITAT_SELECTIONS).some(
    ([id, selectedType]) => activeLayers[id] && habitatType === selectedType
  );
}

function getHabitatLayerStateKey(activeLayers) {
  return Object.keys(HABITAT_SELECTIONS)
    .map((id) => `${id}:${activeLayers[id] ? 1 : 0}`)
    .join("-");
}

function buildHabitatLabelFeatures(features = [], zoom) {
  if (zoom < 13) return [];

  return features
    .map((feature) => {
      const coordinate = getHabitatLabelCoordinate(feature);
      if (!coordinate) return null;
      const { shortLabel, extendedLabel } = getHabitatLabelParts(feature);
      return {
        type: "Feature",
        properties: {
          ...feature.properties,
          __fastHabitatShortLabel: shortLabel,
          __fastHabitatExtendedLabel: extendedLabel,
        },
        geometry: {
          type: "Point",
          coordinates: coordinate,
        },
      };
    })
    .filter(Boolean);
}
