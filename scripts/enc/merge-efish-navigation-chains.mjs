import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CANONICAL_PATH = "public/layers/danube_km_fairway.geojson";
const EFISH_CANDIDATES = [
  "../app/public/layers/danube_km_clean.geojson",
  "C:/Users/tudor/Downloads/app/public/layers/danube_km_clean.geojson",
];
const SOURCE_FOLDER = "efish-danube_km_clean-selected-chain";
const REASON = "MigratedExactIntegerKmFromSelectedEfishChain";
const MAX_CHAIN_STEP_METERS = 3500;
const GALATI_BRAILA_VALUES = Array.from({ length: 17 }, (_, index) => index + 150);
const GALATI_BRAILA_VALUES_TO_ADD = new Set([154, 155, 156, 159, 160, 161, 162, 163, 166]);
const GALATI_BRAILA_BBOX = { minLng: 27.9, maxLng: 28.1, minLat: 45.18, maxLat: 45.45 };
const KM_298_303_VALUES = Array.from({ length: 6 }, (_, index) => index + 298);
const KM_298_303_BBOX = { minLng: 27.95, maxLng: 28.08, minLat: 44.3, maxLat: 44.38 };
const MACIN_VALUES = Array.from({ length: 45 }, (_, index) => index + 1);
const MACIN_BBOX = { minLng: 27.7, maxLng: 28.35, minLat: 45.05, maxLat: 45.45 };
const EXACT_DUPLICATE_DISTANCE_METERS = 5;

function parseArgs(argv) {
  const efishArg = argv.find((arg) => arg.startsWith("--efish="));
  return {
    write: argv.includes("--write"),
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

function distanceMeters(firstCoordinates, secondCoordinates) {
  const [firstLng, firstLat] = firstCoordinates;
  const [secondLng, secondLat] = secondCoordinates;
  const toRadians = (value) => (value * Math.PI) / 180;
  const radiusMeters = 6371000;
  const deltaLat = toRadians(secondLat - firstLat);
  const deltaLng = toRadians(secondLng - firstLng);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(firstLat)) *
      Math.cos(toRadians(secondLat)) *
      Math.sin(deltaLng / 2) ** 2;
  return 2 * radiusMeters * Math.asin(Math.sqrt(haversine));
}

function findEfishPath(explicitPath) {
  if (explicitPath) {
    const absolutePath = resolve(explicitPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Layer eFish inexistent la path-ul explicit: ${absolutePath}`);
    }
    return absolutePath;
  }

  for (const candidate of EFISH_CANDIDATES) {
    const absoluteCandidate = resolve(candidate);
    if (existsSync(absoluteCandidate)) return absoluteCandidate;
  }

  throw new Error(
    `Nu am găsit layerul eFish. Folosește --efish=<path>. Am căutat:\n${EFISH_CANDIDATES.map((item) =>
      resolve(item)
    ).join("\n")}`
  );
}

function buildCandidates(features, value, bbox) {
  return features
    .filter((feature) => {
      const rawValue = toNumber(feature?.properties?.wtwdis);
      const coordinates = getCoordinates(feature);
      return rawValue === value && Number.isInteger(rawValue) && isInsideBbox(coordinates, bbox);
    })
    .map((feature) => ({
      value,
      coordinates: getCoordinates(feature),
      feature,
    }));
}

function chooseContinuousChain(features, values, bbox) {
  const candidatesByValue = values.map((value) => buildCandidates(features, value, bbox));
  if (candidatesByValue.some((candidates) => candidates.length === 0)) {
    const missingValues = values.filter((_, index) => candidatesByValue[index].length === 0);
    throw new Error(`Nu există candidați eFish pentru valorile: ${missingValues.join(", ")}`);
  }

  let states = candidatesByValue[0].map((candidate) => ({
    candidate,
    cost: 0,
    previous: null,
  }));

  for (let index = 1; index < candidatesByValue.length; index += 1) {
    const nextStates = [];
    for (const candidate of candidatesByValue[index]) {
      let bestPrevious = null;
      let bestCost = Number.POSITIVE_INFINITY;
      for (const previousState of states) {
        const stepDistance = distanceMeters(previousState.candidate.coordinates, candidate.coordinates);
        if (stepDistance > MAX_CHAIN_STEP_METERS) continue;
        const totalCost = previousState.cost + stepDistance;
        if (totalCost < bestCost) {
          bestCost = totalCost;
          bestPrevious = previousState;
        }
      }
      if (bestPrevious) {
        nextStates.push({
          candidate,
          cost: bestCost,
          previous: bestPrevious,
        });
      }
    }
    if (nextStates.length === 0) {
      throw new Error(`Lanț discontinuu la valoarea ${values[index]}`);
    }
    states = nextStates;
  }

  const lastState = states.reduce((best, state) => (state.cost < best.cost ? state : best), states[0]);
  const chain = [];
  let state = lastState;
  while (state) {
    chain.push(state.candidate);
    state = state.previous;
  }
  return chain.reverse();
}

function hasExactDuplicate(canonicalFeatures, value, coordinates) {
  return canonicalFeatures.some((feature) => {
    const properties = feature?.properties || {};
    const existingCoordinates = getCoordinates(feature);
    return (
      properties.distance_unit === "km" &&
      properties.distance_value === value &&
      existingCoordinates &&
      distanceMeters(existingCoordinates, coordinates) <= EXACT_DUPLICATE_DISTANCE_METERS
    );
  });
}

function toCanonicalFeature(candidate) {
  const sourceProperties = candidate.feature.properties || {};
  return {
    ...candidate.feature,
    properties: {
      wtwdis: candidate.value,
      catdis: null,
      OBJNAM: sourceProperties.OBJNAM ?? null,
      INFORM: sourceProperties.INFORM ?? null,
      SCAMIN: sourceProperties.SCAMIN ?? null,
      SRC_FOLDER: SOURCE_FOLDER,
      SRC_CELL: null,
      SRC_UNIT_HINT: "Km",
      source_folder: SOURCE_FOLDER,
      source_cell: null,
      raw_wtwdis: candidate.value,
      raw_catdis: null,
      distance_unit: "km",
      distance_value: candidate.value,
      distance_label: `Km ${candidate.value}`,
      confidence: "high",
      reason: REASON,
    },
  };
}

function serialize(collection) {
  const header = ["{", `"type": ${JSON.stringify(collection.type)},`];
  if (collection.name !== undefined) header.push(`"name": ${JSON.stringify(collection.name)},`);
  if (collection.crs !== undefined) header.push(`"crs": ${JSON.stringify(collection.crs)},`);
  header.push(`"features": [`);
  return `${header.join("\n")}\n${collection.features
    .map((feature) => JSON.stringify(feature))
    .join(",\n")}\n]\n}\n`;
}

function summarize(chain) {
  return chain.map((candidate) => ({
    value: candidate.value,
    coordinates: candidate.coordinates,
  }));
}

const { write, efishPath } = parseArgs(process.argv.slice(2));
const absoluteCanonicalPath = resolve(CANONICAL_PATH);
const absoluteEfishPath = findEfishPath(efishPath);
const canonicalCollection = JSON.parse(readFileSync(absoluteCanonicalPath, "utf8"));
const efishCollection = JSON.parse(readFileSync(absoluteEfishPath, "utf8"));

const galatiBrailaChain = chooseContinuousChain(
  efishCollection.features,
  GALATI_BRAILA_VALUES,
  GALATI_BRAILA_BBOX
);
const km298to303Chain = chooseContinuousChain(
  efishCollection.features,
  KM_298_303_VALUES,
  KM_298_303_BBOX
);
const macinChain = chooseContinuousChain(efishCollection.features, MACIN_VALUES, MACIN_BBOX);
const selectedCandidates = [
  ...galatiBrailaChain.filter((candidate) => GALATI_BRAILA_VALUES_TO_ADD.has(candidate.value)),
  ...km298to303Chain,
  ...macinChain,
];

const canonicalFeatures = [...canonicalCollection.features];
const addedFeatures = [];
for (const candidate of selectedCandidates) {
  if (hasExactDuplicate(canonicalFeatures, candidate.value, candidate.coordinates)) continue;
  const canonicalFeature = toCanonicalFeature(candidate);
  canonicalFeatures.push(canonicalFeature);
  addedFeatures.push(canonicalFeature);
}

if (write) {
  writeFileSync(
    absoluteCanonicalPath,
    serialize({
      ...canonicalCollection,
      features: canonicalFeatures,
    }),
    "utf8"
  );
}

console.log(
  JSON.stringify(
    {
      write,
      canonicalPath: absoluteCanonicalPath,
      efishPath: absoluteEfishPath,
      selectedChains: {
        galatiBraila: summarize(galatiBrailaChain),
        km298to303: summarize(km298to303Chain),
        macin: summarize(macinChain),
      },
      added: {
        total: addedFeatures.length,
        galatiBraila: addedFeatures.filter((feature) =>
          GALATI_BRAILA_VALUES_TO_ADD.has(feature.properties.distance_value)
        ).length,
        km298to303: addedFeatures.filter((feature) =>
          KM_298_303_VALUES.includes(feature.properties.distance_value)
        ).length,
        macin: addedFeatures.filter((feature) => MACIN_VALUES.includes(feature.properties.distance_value))
          .length,
      },
      addedFeatures: addedFeatures.map((feature) => ({
        label: feature.properties.distance_label,
        coordinates: feature.geometry.coordinates,
      })),
    },
    null,
    2
  )
);
