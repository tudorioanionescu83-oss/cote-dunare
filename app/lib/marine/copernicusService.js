import {
  CONSTANTA_MARINE_STATION,
  COPERNICUS_DATASETS,
  COPERNICUS_VARIABLES,
} from "./marineStationConfig";
import { readLatestMarineLayerSnapshot, readMarineRows } from "./marineCacheService";
import {
  currentDirectionFromUV,
  currentSpeedFromUV,
  fillWithLastValid,
  toFiniteNumber,
} from "./marineMath";

const SOURCE_LABEL = "Copernicus Marine";
const MAX_TIMESERIES_HOURS = 24 * 14;
const MAX_FORECAST_DAYS = 10;
const FRESHNESS_HOURS = 12;
const BATHYMETRY_POINTS_URL = "/marine/constanta-bathymetry.json";

function inferFreshness(timestamp) {
  const ts = Date.parse(timestamp || "");
  if (!Number.isFinite(ts)) return "last_available";
  const ageMs = Date.now() - ts;
  return ageMs <= FRESHNESS_HOURS * 60 * 60 * 1000 ? "fresh" : "last_available";
}

function rowToCurrent(row) {
  const currentU = toFiniteNumber(row.current_u);
  const currentV = toFiniteNumber(row.current_v);
  return {
    stationId: CONSTANTA_MARINE_STATION.id,
    name: CONSTANTA_MARINE_STATION.name,
    kind: CONSTANTA_MARINE_STATION.kind,
    timestamp: row.timestamp,
    waterTemperature: toFiniteNumber(row.water_temperature),
    currentU,
    currentV,
    currentSpeed: toFiniteNumber(row.current_speed) ?? currentSpeedFromUV(currentU, currentV),
    currentDirection: toFiniteNumber(row.current_direction) ?? currentDirectionFromUV(currentU, currentV),
    waveHeight: toFiniteNumber(row.wave_height),
    waveDirection: toFiniteNumber(row.wave_direction),
    wavePeriod: toFiniteNumber(row.wave_period),
    salinity: toFiniteNumber(row.salinity),
    source: row.source || SOURCE_LABEL,
    freshness: inferFreshness(row.timestamp),
  };
}

function rowToPoint(row) {
  const currentU = toFiniteNumber(row.current_u);
  const currentV = toFiniteNumber(row.current_v);
  return {
    timestamp: row.timestamp,
    waterTemperature: toFiniteNumber(row.water_temperature),
    currentSpeed: toFiniteNumber(row.current_speed) ?? currentSpeedFromUV(currentU, currentV),
    currentDirection: toFiniteNumber(row.current_direction) ?? currentDirectionFromUV(currentU, currentV),
    waveHeight: toFiniteNumber(row.wave_height),
    waveDirection: toFiniteNumber(row.wave_direction),
    wavePeriod: toFiniteNumber(row.wave_period),
    salinity: toFiniteNumber(row.salinity),
  };
}

export async function getConstantaMarineCurrent() {
  const rows = await readMarineRows({
    stationId: CONSTANTA_MARINE_STATION.id,
    ascending: false,
    limit: 1,
  });
  if (!rows.length) {
    throw new Error("No marine data in cache for constanta_marine.");
  }
  return rowToCurrent(rows[0]);
}

export async function getConstantaMarineTimeseries(hours = 168) {
  const safeHours = Math.max(1, Math.min(MAX_TIMESERIES_HOURS, Number(hours) || 168));
  const to = new Date().toISOString();
  const from = new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();

  const rows = await readMarineRows({
    stationId: CONSTANTA_MARINE_STATION.id,
    from,
    to,
    ascending: true,
    limit: Math.max(200, safeHours * 4),
  });

  return {
    stationId: CONSTANTA_MARINE_STATION.id,
    name: CONSTANTA_MARINE_STATION.name,
    kind: CONSTANTA_MARINE_STATION.kind,
    source: SOURCE_LABEL,
    timezone: "UTC",
    hours: safeHours,
    points: fillWithLastValid(rows.map(rowToPoint)),
  };
}

export async function getConstantaMarineForecast(days = 5) {
  const safeDays = Math.max(1, Math.min(MAX_FORECAST_DAYS, Number(days) || 5));
  const from = new Date().toISOString();
  const to = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();

  const rows = await readMarineRows({
    stationId: CONSTANTA_MARINE_STATION.id,
    from,
    to,
    ascending: true,
    limit: Math.max(120, safeDays * 24 * 4),
  });

  return {
    stationId: CONSTANTA_MARINE_STATION.id,
    name: CONSTANTA_MARINE_STATION.name,
    kind: CONSTANTA_MARINE_STATION.kind,
    source: SOURCE_LABEL,
    timezone: "UTC",
    days: safeDays,
    points: fillWithLastValid(rows.map(rowToPoint)),
  };
}

function sanitizePointList(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => ({
      lat: toFiniteNumber(point?.lat),
      lon: toFiniteNumber(point?.lon),
      value: toFiniteNumber(point?.value),
    }))
    .filter((point) => point.lat !== null && point.lon !== null && point.value !== null);
}

function sanitizeVectorList(vectors) {
  if (!Array.isArray(vectors)) return [];
  return vectors
    .map((point) => ({
      lat: toFiniteNumber(point?.lat),
      lon: toFiniteNumber(point?.lon),
      u: toFiniteNumber(point?.u),
      v: toFiniteNumber(point?.v),
      speed: toFiniteNumber(point?.speed),
      direction: toFiniteNumber(point?.direction),
    }))
    .filter(
      (point) =>
        point.lat !== null &&
        point.lon !== null &&
        point.u !== null &&
        point.v !== null &&
        point.speed !== null &&
        point.direction !== null
    );
}

export async function getConstantaMarineLayers() {
  const payload = {
    stationId: CONSTANTA_MARINE_STATION.id,
    name: CONSTANTA_MARINE_STATION.name,
    kind: CONSTANTA_MARINE_STATION.kind,
    source: SOURCE_LABEL,
    bathymetry: {
      source: "Copernicus Marine BLK-MFC_007_003",
      pointsUrl: BATHYMETRY_POINTS_URL,
    },
    layers: [
      {
        id: "temperature",
        label: "Temperatura",
        datasetId: COPERNICUS_DATASETS.physical,
        variables: ["thetao"],
        provider: "copernicus",
        wmtsTemplateUrl: null,
      },
      {
        id: "salinity",
        label: "Salinitate",
        datasetId: COPERNICUS_DATASETS.physical,
        variables: ["so"],
        provider: "copernicus",
        wmtsTemplateUrl: null,
      },
      {
        id: "currents",
        label: "Curenti",
        datasetId: COPERNICUS_DATASETS.physical,
        variables: ["uo", "vo"],
        provider: "copernicus",
        wmtsTemplateUrl: null,
      },
      {
        id: "waves",
        label: "Valuri",
        datasetId: COPERNICUS_DATASETS.waves,
        variables: ["VHM0", "VMDR", "VTPK"],
        provider: "copernicus",
        wmtsTemplateUrl: null,
      },
      {
        id: "bathymetry",
        label: "Batimetrie",
        datasetId: "BLK-MFC_007_003_mask_bathy",
        variables: ["deptho"],
        provider: "copernicus",
        wmtsTemplateUrl: null,
      },
      {
        id: "forecast",
        label: "Prognoza",
        datasetId: `${COPERNICUS_DATASETS.physical} + ${COPERNICUS_DATASETS.waves}`,
        variables: [...COPERNICUS_VARIABLES.physical, ...COPERNICUS_VARIABLES.waves],
        provider: "copernicus",
        wmtsTemplateUrl: null,
      },
    ],
  };

  try {
    const snapshot = await readLatestMarineLayerSnapshot({ stationId: CONSTANTA_MARINE_STATION.id });
    if (snapshot) {
      payload.snapshot = {
        timestamp: snapshot.timestamp,
        source: snapshot.source || SOURCE_LABEL,
        bbox: snapshot.bbox || CONSTANTA_MARINE_STATION.bbox,
        temperaturePoints: sanitizePointList(snapshot.temperature_points),
        salinityPoints: sanitizePointList(snapshot.salinity_points),
        wavePoints: sanitizePointList(snapshot.wave_points),
        currentVectors: sanitizeVectorList(snapshot.current_vectors),
      };
    }
  } catch {
    // Optional enhancement: keep endpoint functional even if snapshot table is absent or unreadable.
  }

  return payload;
}
