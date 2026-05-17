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
import { buildKmPopup, buildPcPolygonPopup, buildPcPopup } from "./fastPopup";

const LAYER_URLS = {
  afdjKm: "/fast/afdj-km.geojson",
  pcKmSegments: "/fast/pc-km-segments.geojson",
  pcPolygons: "/fast/pc-zones.geojson",
  fairway: "/layers/danube_fairway.geojson",
  works: "/fast/works.geojson",
  disposalZones: "/fast/disposal-zones.geojson",
};

const INITIAL_LAYERS = {
  pcKmSegments: true,
  pcPolygons: false,
  afdjKm: true,
  works: false,
  disposalZones: false,
  monitoringOverview: true,
};

const INITIAL_AVAILABILITY = {
  pcKmSegments: false,
  pcPolygons: false,
  afdjKm: false,
  works: false,
  disposalZones: false,
  monitoringOverview: false,
};

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
        __fastKmLabel: `Km ${km}`,
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
    if (!isSubKmValue(km)) continue;

    const key = km.toFixed(1);
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

function buildPcLabelIcon(label, isSelected, showMonitoringBadge) {
  return L.divIcon({
    className: "fast-pc-label-anchor",
    html: `
      <div class="fast-pc-label${isSelected ? " is-selected" : ""}">
        <span>${escapeHtml(label)}</span>
        ${showMonitoringBadge ? '<em>MON</em>' : ""}
      </div>
    `,
  });
}

function getLineMidpointCoordinate(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "LineString" || !Array.isArray(coordinates)) {
    return null;
  }

  return coordinates[Math.floor(coordinates.length / 2)] || null;
}

function buildPcLabelFeatures(pcKmSegments, zoom, selectedPcCode, showMonitoringBadge) {
  if (!pcKmSegments || zoom < 8) return [];

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
          __fastShowMonitoringBadge: showMonitoringBadge,
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

function getPcKmSegmentStyle(feature, selectedPcCode) {
  if (feature?.geometry?.type !== "LineString") return {};

  const isSelected = feature?.properties?.pc_code === selectedPcCode;
  return {
    color: isSelected ? "#be123c" : "#e11d48",
    weight: isSelected ? 6 : 4.8,
    opacity: isSelected ? 1 : 0.95,
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

function hasMonitoringOverview(featureCollection) {
  return Boolean(
    featureCollection?.features?.some(
      (feature) => feature?.properties?.fish_monitoring_overview
    )
  );
}

export default function FastMap({ selectedPcCode, selectionRequestId, onSelectPc }) {
  const [basemap, setBasemap] = useState("map");
  const [fitRequestId, setFitRequestId] = useState(0);
  const [layersLoaded, setLayersLoaded] = useState(false);
  const [activeLayers, setActiveLayers] = useState(INITIAL_LAYERS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [viewState, setViewState] = useState({
    zoom: 9,
    bounds: null,
  });
  const [datasets, setDatasets] = useState({
    afdjKm: null,
    pcKmSegments: null,
    pcPolygons: null,
    fairway: null,
    works: null,
    disposalZones: null,
  });
  const pointRenderer = useMemo(() => L.canvas({ padding: 0.25 }), []);

  useEffect(() => {
    let cancelled = false;

    async function loadLayers() {
      const [afdjKm, pcKmSegments, pcPolygons, fairway, works, disposalZones] =
        await Promise.all([
          fetchGeoJson(LAYER_URLS.afdjKm, "Km AFDJ"),
          fetchGeoJson(LAYER_URLS.pcKmSegments, "PC km segments"),
          fetchGeoJson(LAYER_URLS.pcPolygons, "PC polygons"),
          fetchGeoJson(LAYER_URLS.fairway, "Șenal navigabil"),
          fetchGeoJson(LAYER_URLS.works, "Lucrări principale", true),
          fetchGeoJson(LAYER_URLS.disposalZones, "Zone depozitare material dragat", true),
        ]);

      if (cancelled) return;

      setDatasets({ afdjKm, pcKmSegments, pcPolygons, fairway, works, disposalZones });
      setAvailability({
        afdjKm: Boolean(afdjKm),
        pcKmSegments: Boolean(pcKmSegments),
        pcPolygons: Boolean(pcPolygons),
        works: Boolean(works),
        disposalZones: Boolean(disposalZones),
        monitoringOverview: hasMonitoringOverview(pcKmSegments),
      });
      setLayersLoaded(true);
    }

    loadLayers();
    return () => {
      cancelled = true;
    };
  }, []);

  const fitDatasets = useMemo(
    () => [datasets.pcKmSegments].filter(Boolean),
    [datasets.pcKmSegments]
  );

  const visibleKmFeatures = useMemo(() => {
    const features = datasets.afdjKm?.features || [];
    if (!viewState.bounds) return [];
    return features.filter((feature) => isFeatureInBounds(feature, viewState.bounds));
  }, [datasets.afdjKm, viewState.bounds]);

  const featureSets = useMemo(
    () => ({
      kmLabels: toFeatureCollection(
        buildRepresentativeKmFeatures(visibleKmFeatures, viewState.zoom)
      ),
      wholeKmPoints: toFeatureCollection(
        buildRepresentativeWholeKmPointFeatures(visibleKmFeatures, viewState.zoom)
      ),
      subKmPoints: toFeatureCollection(
        buildRepresentativeSubKmPointFeatures(visibleKmFeatures, viewState.zoom)
      ),
      pcLabels: toFeatureCollection(
        buildPcLabelFeatures(
          datasets.pcKmSegments,
          viewState.zoom,
          selectedPcCode,
          activeLayers.monitoringOverview
        )
      ),
    }),
    [
      activeLayers.monitoringOverview,
      datasets.pcKmSegments,
      selectedPcCode,
      viewState.zoom,
      visibleKmFeatures,
    ]
  );

  const selectedSegmentFeature = useMemo(
    () =>
      datasets.pcKmSegments?.features?.find(
        (feature) =>
          feature?.properties?.geometry_role === "segment" &&
          feature?.properties?.pc_code === selectedPcCode
      ) || null,
    [datasets.pcKmSegments, selectedPcCode]
  );

  const pcSegmentCount = useMemo(
    () =>
      datasets.pcKmSegments?.features?.filter(
        (feature) => feature?.properties?.geometry_role === "segment"
      ).length || 0,
    [datasets.pcKmSegments]
  );
  const optionalLayerUnavailable = !availability.works || !availability.disposalZones;

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
        <FastViewState onChange={setViewState} />
        <FastPcFocus
          selectedFeature={selectedSegmentFeature}
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

        {activeLayers.pcKmSegments && datasets.pcKmSegments && (
          <GeoJSON
            key={`pc-segments-${selectedPcCode || "none"}`}
            data={datasets.pcKmSegments}
            style={(feature) => getPcKmSegmentStyle(feature, selectedPcCode)}
            pointToLayer={(feature, latlng) => {
              const role = feature?.properties?.geometry_role;
              const isSelected = feature?.properties?.pc_code === selectedPcCode;
              return L.circleMarker(latlng, {
                radius: isSelected ? 7 : 5.8,
                color: "#ffffff",
                weight: 1.5,
                opacity: 1,
                fillColor: role === "upstream_marker" ? "#be123c" : "#f97316",
                fillOpacity: 0.98,
              });
            }}
            onEachFeature={(feature, layer) => {
              const isSegment = feature?.properties?.geometry_role === "segment";
              layer.bindPopup(buildPcPopup(feature), { className: "fast-popup" });
              layer.on("click", () => onSelectPc(feature?.properties?.pc_code));

              if (isSegment) {
                layer.on("mouseover", () => {
                  layer.setStyle({
                    color: "#be123c",
                    weight: 6.4,
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

        {activeLayers.pcKmSegments && featureSets.pcLabels.features.length > 0 && (
          <GeoJSON
            key={`pc-labels-${viewState.zoom}-${selectedPcCode || "none"}-${activeLayers.monitoringOverview}`}
            data={featureSets.pcLabels}
            pointToLayer={(feature, latlng) =>
              L.marker(latlng, {
                icon: buildPcLabelIcon(
                  feature?.properties?.__fastPcLabel || "",
                  feature?.properties?.__fastIsSelected,
                  feature?.properties?.__fastShowMonitoringBadge
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
        onBasemapChange={setBasemap}
        onFitToFastSector={() => setFitRequestId((value) => value + 1)}
        onToggleLayer={(layerId) =>
          setActiveLayers((current) => ({
            ...current,
            [layerId]: !current[layerId],
          }))
        }
      />

      <div className="fast-status-panel">
        <div>
          {layersLoaded
            ? `${pcSegmentCount} critical point intervals loaded`
            : "critical point intervals loading"}
        </div>
        <div>
          {availability.afdjKm
            ? "AFDJ km layer loaded"
            : layersLoaded
              ? "AFDJ km layer unavailable"
              : "AFDJ km layer loading"}
        </div>
        {layersLoaded && optionalLayerUnavailable ? <div>optional layer unavailable</div> : null}
      </div>
    </div>
  );
}
