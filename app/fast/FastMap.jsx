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

function FastFitBounds({ datasets, fitRequestId }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    const featureCollections = datasets.filter(isFeatureCollection);
    if (!featureCollections.length) return;
    if (fitRequestId === 0 && fittedRef.current) return;

    const group = L.featureGroup(
      featureCollections.map((dataset) => L.geoJSON(dataset))
    );
    const bounds = group.getBounds();
    if (!bounds.isValid()) return;

    map.fitBounds(bounds.pad(0.14), { maxZoom: 12 });
    fittedRef.current = true;
  }, [datasets, fitRequestId, map]);

  return null;
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

function getPcKmSegmentStyle(feature) {
  if (feature?.geometry?.type !== "LineString") return {};

  return {
    color: "#0369a1",
    weight: 4,
    opacity: 0.92,
    dashArray: "9 6",
  };
}

function getMonitoringStyle() {
  return {
    color: "#f59e0b",
    weight: 2,
    opacity: 0.88,
    dashArray: "5 5",
    fillOpacity: 0,
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

export default function FastMap() {
  const [basemap, setBasemap] = useState("map");
  const [fitRequestId, setFitRequestId] = useState(0);
  const [layersLoaded, setLayersLoaded] = useState(false);
  const [activeLayers, setActiveLayers] = useState(INITIAL_LAYERS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);
  const [datasets, setDatasets] = useState({
    afdjKm: null,
    pcKmSegments: null,
    pcPolygons: null,
    works: null,
    disposalZones: null,
  });
  const pointRenderer = useMemo(() => L.canvas({ padding: 0.25 }), []);

  useEffect(() => {
    let cancelled = false;

    async function loadLayers() {
      const [afdjKm, pcKmSegments, pcPolygons, works, disposalZones] = await Promise.all([
        fetchGeoJson(LAYER_URLS.afdjKm, "Km AFDJ"),
        fetchGeoJson(LAYER_URLS.pcKmSegments, "PC km segments"),
        fetchGeoJson(LAYER_URLS.pcPolygons, "PC polygons"),
        fetchGeoJson(LAYER_URLS.works, "Lucrări principale", true),
        fetchGeoJson(LAYER_URLS.disposalZones, "Zone depozitare material dragat", true),
      ]);

      if (cancelled) return;

      setDatasets({ afdjKm, pcKmSegments, pcPolygons, works, disposalZones });
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

  const monitoringFeatures = useMemo(() => {
    if (!datasets.pcKmSegments) return null;
    return {
      type: "FeatureCollection",
      features: datasets.pcKmSegments.features.filter(
        (feature) =>
          feature?.properties?.geometry_role === "segment" &&
          feature?.properties?.fish_monitoring_overview
      ),
    };
  }, [datasets.pcKmSegments]);

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
        <ScaleControl position="bottomleft" imperial={false} />

        {activeLayers.pcKmSegments && datasets.pcKmSegments && (
          <GeoJSON
            data={datasets.pcKmSegments}
            style={getPcKmSegmentStyle}
            pointToLayer={(feature, latlng) => {
              const role = feature?.properties?.geometry_role;
              return L.circleMarker(latlng, {
                radius: 5.2,
                color: "#ffffff",
                weight: 1.4,
                opacity: 1,
                fillColor: role === "upstream_marker" ? "#0369a1" : "#0ea5e9",
                fillOpacity: 0.98,
              });
            }}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(buildPcPopup(feature), { className: "fast-popup" });
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

        {activeLayers.afdjKm && datasets.afdjKm && (
          <GeoJSON
            data={datasets.afdjKm}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, {
                radius: Number(feature?.properties?.catdis) === 1 ? 3.2 : 2.2,
                color: "#ffffff",
                weight: 0.8,
                opacity: 1,
                fillColor: "#0284c7",
                fillOpacity: 0.95,
                renderer: pointRenderer,
              })
            }
            onEachFeature={(feature, layer) => {
              layer.bindPopup(buildKmPopup(feature), { className: "fast-popup" });
            }}
          />
        )}

        {activeLayers.works && datasets.works && (
          <GeoJSON data={datasets.works} style={getWorksStyle} />
        )}

        {activeLayers.disposalZones && datasets.disposalZones && (
          <GeoJSON data={datasets.disposalZones} style={getDisposalStyle} />
        )}

        {activeLayers.monitoringOverview &&
          monitoringFeatures &&
          monitoringFeatures.features.length > 0 && (
            <GeoJSON data={monitoringFeatures} style={getMonitoringStyle} interactive={false} />
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
