import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_INPUT = "public/layers/danube_km_fairway.geojson";

function parseArgs(argv) {
  const inputArg = argv.find((arg) => arg.startsWith("--input="));
  return {
    input: inputArg ? inputArg.slice("--input=".length) : DEFAULT_INPUT,
  };
}

function increment(map, key) {
  const normalizedKey = key ?? "(missing)";
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function sortCounts(map) {
  return [...map.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
}

function summarizeFeature(feature) {
  return {
    wtwdis: feature.properties?.wtwdis ?? null,
    catdis: feature.properties?.catdis ?? null,
    SRC_FOLDER: feature.properties?.SRC_FOLDER ?? null,
    SRC_CELL: feature.properties?.SRC_CELL ?? null,
    SRC_UNIT_HINT: feature.properties?.SRC_UNIT_HINT ?? null,
    coordinates: feature.geometry?.coordinates ?? null,
  };
}

function sample(features, predicate, limit = 20) {
  return features.filter(predicate).slice(0, limit).map(summarizeFeature);
}

function buildReport(collection) {
  const folderCounts = new Map();
  const cellCounts = new Map();
  const unitCounts = new Map();
  const folderRanges = new Map();

  for (const feature of collection.features) {
    const properties = feature.properties || {};
    const folder = properties.SRC_FOLDER ?? "(missing)";
    const cell = properties.SRC_CELL ?? "(missing)";
    const unit = properties.SRC_UNIT_HINT ?? "(missing)";
    const value = Number(properties.wtwdis);

    increment(folderCounts, folder);
    increment(cellCounts, cell);
    increment(unitCounts, unit);

    const range = folderRanges.get(folder) || { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
    if (Number.isFinite(value)) {
      range.min = Math.min(range.min, value);
      range.max = Math.max(range.max, value);
    }
    folderRanges.set(folder, range);
  }

  const mixedFeatures = collection.features.filter(
    (feature) => feature.properties?.SRC_FOLDER === "u_20260326-mm47-km175"
  );
  const mixedByCellAndHint = new Map();
  for (const feature of mixedFeatures) {
    increment(mixedByCellAndHint, `${feature.properties?.SRC_CELL}:${feature.properties?.SRC_UNIT_HINT}`);
  }

  return {
    featureCount: collection.features.length,
    countsBySrcFolder: sortCounts(folderCounts),
    countsBySrcCell: sortCounts(cellCounts),
    countsBySrcUnitHint: sortCounts(unitCounts),
    minMaxWtwdisBySrcFolder: [...folderRanges.entries()]
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
      .map(([folder, range]) => [folder, range.min, range.max]),
    mixedFolderBreakdown: sortCounts(mixedByCellAndHint),
    mm76to80: sample(
      collection.features,
      (feature) =>
        feature.properties?.SRC_UNIT_HINT === "Mm" &&
        Number(feature.properties?.wtwdis) >= 76 &&
        Number(feature.properties?.wtwdis) <= 80
    ),
    mm0to47: sample(
      collection.features,
      (feature) =>
        feature.properties?.SRC_UNIT_HINT === "Mm" &&
        Number(feature.properties?.wtwdis) >= 0 &&
        Number(feature.properties?.wtwdis) <= 47
    ),
    km150to180: sample(
      collection.features,
      (feature) =>
        feature.properties?.SRC_UNIT_HINT === "Km" &&
        Number(feature.properties?.wtwdis) >= 150 &&
        Number(feature.properties?.wtwdis) <= 180
    ),
    raw1000Plus: sample(
      collection.features,
      (feature) => Number(feature.properties?.wtwdis) >= 1000
    ),
  };
}

const { input } = parseArgs(process.argv.slice(2));
const absoluteInput = resolve(input);
const collection = JSON.parse(readFileSync(absoluteInput, "utf8"));
console.log(JSON.stringify(buildReport(collection), null, 2));
