import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_CANONICAL_PATH = "public/layers/danube_km_fairway.geojson";
const DEFAULT_EFISH_CANDIDATES = [
  "../app/public/layers/danube_km_clean.geojson",
  "C:/Users/tudor/Downloads/app/public/layers/danube_km_clean.geojson",
];
const MIGRATION_SOURCE_FOLDER = "efish-danube_km_clean-migration";
const MIGRATION_REASON = "MigratedExactIntegerKmFromEfishCleanLayer";
const GALATI_BRAILA_MISSING_KM = new Set([154, 155, 156, 159, 160, 161, 162, 163, 166]);
const GALATI_BRAILA_BBOX = {
  minLng: 27.9,
  maxLng: 28.1,
  minLat: 45.18,
  maxLat: 45.45,
};
const MACIN_CORRIDOR_BBOX = {
  minLng: 27.88,
  maxLng: 28.21,
  minLat: 45.045,
  maxLat: 45.29,
};
const EXISTING_MARK_DISTANCE_METERS = 5;

function parseArgs(argv) {
  const canonicalArg = argv.find((arg) => arg.startsWith("--canonical="));
  const efishArg = argv.find((arg) => arg.startsWith("--efish="));
  return {
    write: argv.includes("--write"),
    canonicalPath: canonicalArg ? canonicalArg.slice("--canonical=".length) : DEFAULT_CANONICAL_PATH,
    efishPath: efishArg ? efishArg.slice("--efish=".length) : null,
  };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getCoordinates(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates)) return null;
  const [lng, lat] = coordinates;
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function isInsideBbox(coordinates, bbox) {
  if (!coordinates) return false;
  const [lng, lat] = coordinates;
  return lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat;
}

function haversineMeters(firstCoordinates, secondCoordinates) {
  const [firstLng, firstLat] = firstCoordinates;
  const [secondLng, secondLat] = secondCoordinates;
  const toRadians = (value) => (value * Math.PI) / 180;
  const radiusMeters = 6371000;
  const deltaLat = toRadians(secondLat - firstLat);
  const deltaLng = toRadians(secondLng - firstLng);
  const firstLatRadians = toRadians(firstLat);
  const secondLatRadians = toRadians(secondLat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(firstLatRadians) * Math.cos(secondLatRadians) * Math.sin(deltaLng / 2) ** 2;
  return 2 * radiusMeters * Math.asin(Math.sqrt(haversine));
}

function findEfishPath(explicitPath) {
  if (explicitPath) {
    const absolutePath = resolve(explicitPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Nu am găsit layerul eFish la path-ul explicit: ${absolutePath}`);
    }
    return absolutePath;
  }

  for (const candidate of DEFAULT_EFISH_CANDIDATES) {
    const absoluteCandidate = resolve(candidate);
    if (existsSync(absoluteCandidate)) return absoluteCandidate;
  }

  throw new Error(
    [
      "Nu am găsit layerul eFish danube_km_clean.geojson.",
      "Folosește --efish=<path> sau pune fișierul la unul dintre path-urile așteptate:",
      ...DEFAULT_EFISH_CANDIDATES.map((candidate) => `- ${resolve(candidate)}`),
    ].join("\n")
  );
}

function isExactIntegerEfishKm(feature) {
  const rawValue = toNumber(feature?.properties?.wtwdis);
  return Number.isInteger(rawValue);
}

function getEfishRawValue(feature) {
  return toNumber(feature?.properties?.wtwdis);
}

function isGalatiBrailaCandidate(feature) {
  const rawValue = getEfishRawValue(feature);
  const coordinates = getCoordinates(feature);
  return (
    Number.isInteger(rawValue) &&
    GALATI_BRAILA_MISSING_KM.has(rawValue) &&
    isInsideBbox(coordinates, GALATI_BRAILA_BBOX)
  );
}

function isMacinCandidate(feature) {
  const rawValue = getEfishRawValue(feature);
  const coordinates = getCoordinates(feature);
  return (
    Number.isInteger(rawValue) &&
    rawValue >= 0 &&
    rawValue <= 47 &&
    isInsideBbox(coordinates, MACIN_CORRIDOR_BBOX)
  );
}

function hasEquivalentCanonicalMark(canonicalFeatures, rawValue, coordinates) {
  return canonicalFeatures.some((feature) => {
    const properties = feature?.properties || {};
    const canonicalCoordinates = getCoordinates(feature);
    return (
      properties.distance_unit === "km" &&
      properties.distance_value === rawValue &&
      canonicalCoordinates &&
      haversineMeters(coordinates, canonicalCoordinates) <= EXISTING_MARK_DISTANCE_METERS
    );
  });
}

function buildCanonicalFeature(feature) {
  const properties = feature?.properties || {};
  const rawValue = getEfishRawValue(feature);
  return {
    ...feature,
    properties: {
      wtwdis: rawValue,
      catdis: null,
      OBJNAM: properties.OBJNAM ?? null,
      INFORM: properties.INFORM ?? null,
      SCAMIN: properties.SCAMIN ?? null,
      SRC_FOLDER: MIGRATION_SOURCE_FOLDER,
      SRC_CELL: null,
      SRC_UNIT_HINT: "Km",
      source_folder: MIGRATION_SOURCE_FOLDER,
      source_cell: null,
      raw_wtwdis: rawValue,
      raw_catdis: null,
      distance_unit: "km",
      distance_value: rawValue,
      distance_label: `Km ${rawValue}`,
      confidence: "high",
      reason: MIGRATION_REASON,
    },
  };
}

function serializeFeatureCollection(collection) {
  const header = ["{", `"type": ${JSON.stringify(collection.type)},`];

  if (collection.name !== undefined) {
    header.push(`"name": ${JSON.stringify(collection.name)},`);
  }

  if (collection.crs !== undefined) {
    header.push(`"crs": ${JSON.stringify(collection.crs)},`);
  }

  header.push(`"features": [`);
  const body = collection.features.map((feature) => JSON.stringify(feature));
  const footer = ["]", "}"];
  return `${header.join("\n")}\n${body.join(",\n")}\n${footer.join("\n")}\n`;
}

function summarizeAddedFeature(sector, feature) {
  return {
    sector,
    distance_value: feature.properties.distance_value,
    distance_label: feature.properties.distance_label,
    coordinates: feature.geometry.coordinates,
  };
}

const { write, canonicalPath, efishPath } = parseArgs(process.argv.slice(2));
const absoluteCanonicalPath = resolve(canonicalPath);
const absoluteEfishPath = findEfishPath(efishPath);
const canonicalCollection = JSON.parse(readFileSync(absoluteCanonicalPath, "utf8"));
const efishCollection = JSON.parse(readFileSync(absoluteEfishPath, "utf8"));

const exactIntegerEfishPoints = efishCollection.features.filter(isExactIntegerEfishKm);
const galatiBrailaCandidates = exactIntegerEfishPoints.filter(isGalatiBrailaCandidate);
const macinCandidates = exactIntegerEfishPoints.filter(isMacinCandidate);
const canonicalFeatures = [...canonicalCollection.features];
const additions = [];
const report = {
  canonicalPath: absoluteCanonicalPath,
  efishPath: absoluteEfishPath,
  write,
  foundInEfish: {
    exactIntegerKmPoints: exactIntegerEfishPoints.length,
    galatiBrailaCandidates: galatiBrailaCandidates.length,
    macinCandidates: macinCandidates.length,
  },
  alreadyInCoteDunare: {
    galatiBraila: 0,
    macin: 0,
  },
  added: {
    galatiBraila: 0,
    macin: 0,
  },
  addedFeatures: [],
};

function migrateCandidates(sector, candidates) {
  for (const candidate of candidates) {
    const rawValue = getEfishRawValue(candidate);
    const coordinates = getCoordinates(candidate);
    if (!coordinates) continue;

    if (hasEquivalentCanonicalMark(canonicalFeatures, rawValue, coordinates)) {
      report.alreadyInCoteDunare[sector] += 1;
      continue;
    }

    const canonicalFeature = buildCanonicalFeature(candidate);
    canonicalFeatures.push(canonicalFeature);
    additions.push(canonicalFeature);
    report.added[sector] += 1;
    report.addedFeatures.push(summarizeAddedFeature(sector, canonicalFeature));
  }
}

migrateCandidates("galatiBraila", galatiBrailaCandidates);
migrateCandidates("macin", macinCandidates);

if (write) {
  writeFileSync(
    absoluteCanonicalPath,
    serializeFeatureCollection({
      ...canonicalCollection,
      features: canonicalFeatures,
    }),
    "utf8"
  );
}

console.log(JSON.stringify(report, null, 2));
