import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_INPUT = "public/layers/danube_km_fairway.geojson";
const DEFAULT_OUTPUT = "public/layers/danube_km_fairway.geojson";
const MIXED_FOLDER = "u_20260326-mm47-km175";
const MIXED_MM_CELLS = new Set([
  "3R7D0047",
  "3R7D0052",
  "3R7D0059",
  "3R7D0063",
  "3R7D0069",
  "3R7D0072",
  "3R7D0078",
]);

function parseArgs(argv) {
  const inputArg = argv.find((arg) => arg.startsWith("--input="));
  const outputArg = argv.find((arg) => arg.startsWith("--output="));
  return {
    input: inputArg ? inputArg.slice("--input=".length) : DEFAULT_INPUT,
    output: outputArg ? outputArg.slice("--output=".length) : DEFAULT_OUTPUT,
  };
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDistanceValue(value) {
  if (!Number.isFinite(value)) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function parseKmBounds(folder) {
  if (folder === MIXED_FOLDER) {
    return { min: 47, max: 175 };
  }

  const matches = [...String(folder || "").matchAll(/km(\d+)/gi)].map((match) => Number(match[1]));
  if (matches.length < 2) return null;
  return {
    min: Math.min(...matches),
    max: Math.max(...matches),
  };
}

function classifyUnit(properties) {
  const folder = properties.SRC_FOLDER || "";
  const cell = properties.SRC_CELL || "";
  const rawValue = toNumber(properties.wtwdis);
  const lowerFolder = folder.toLowerCase();

  if (lowerFolder.includes("mm0-mm47")) {
    return { unit: "mn", confidence: "high", reason: "folder:mm0-mm47" };
  }

  if (folder === MIXED_FOLDER) {
    if (MIXED_MM_CELLS.has(cell) && rawValue !== null && rawValue <= 100) {
      return { unit: "mn", confidence: "high", reason: "mixed-folder:mm-cell-direct-value" };
    }
    return { unit: "km", confidence: "high", reason: "mixed-folder:km-cell-or-value" };
  }

  if (lowerFolder.includes("km")) {
    return { unit: "km", confidence: "high", reason: "folder:km-range" };
  }

  if (properties.SRC_UNIT_HINT === "Mm") {
    return { unit: "mn", confidence: "medium", reason: "source-hint:mm-fallback" };
  }

  return { unit: "km", confidence: "medium", reason: "fallback:fluvial-source" };
}

function normalizeDistanceValue(rawValue, unit, folder) {
  if (rawValue === null) return null;
  if (unit === "mn") return rawValue;

  const bounds = parseKmBounds(folder);
  if (!bounds) return rawValue;

  const divided = rawValue / 10;
  const fitsTenthsRange = divided >= bounds.min - 1 && divided <= bounds.max + 1;
  const exceedsDeclaredRange = rawValue > bounds.max + 1;

  return exceedsDeclaredRange && fitsTenthsRange ? Number(divided.toFixed(1)) : rawValue;
}

function normalizeFeature(feature) {
  const properties = feature.properties || {};
  const rawWtwdis = toNumber(properties.wtwdis);
  const rawCatdis = toNumber(properties.catdis);
  const { unit, confidence, reason } = classifyUnit(properties);
  const distanceValue = normalizeDistanceValue(rawWtwdis, unit, properties.SRC_FOLDER);
  const distanceLabel =
    distanceValue === null ? null : `${unit === "mn" ? "Mm" : "Km"} ${formatDistanceValue(distanceValue)}`;

  return {
    ...feature,
    properties: {
      ...properties,
      source_folder: properties.SRC_FOLDER || null,
      source_cell: properties.SRC_CELL || null,
      raw_wtwdis: rawWtwdis,
      raw_catdis: rawCatdis,
      distance_unit: unit,
      distance_value: distanceValue,
      distance_label: distanceLabel,
      confidence,
      reason,
    },
  };
}

function serializeFeatureCollection(collection) {
  const header = [
    "{",
    `"type": ${JSON.stringify(collection.type)},`,
  ];

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

const { input, output } = parseArgs(process.argv.slice(2));
const absoluteInput = resolve(input);
const absoluteOutput = resolve(output);
const collection = JSON.parse(readFileSync(absoluteInput, "utf8"));
const normalized = {
  ...collection,
  features: collection.features.map(normalizeFeature),
};

writeFileSync(absoluteOutput, serializeFeatureCollection(normalized), "utf8");

const summary = normalized.features.reduce(
  (accumulator, feature) => {
    const { distance_unit: unit, reason } = feature.properties;
    accumulator.units[unit] = (accumulator.units[unit] || 0) + 1;
    accumulator.reasons[reason] = (accumulator.reasons[reason] || 0) + 1;
    return accumulator;
  },
  { units: {}, reasons: {} }
);

console.log(
  JSON.stringify(
    {
      input: absoluteInput,
      output: absoluteOutput,
      featureCount: normalized.features.length,
      ...summary,
    },
    null,
    2
  )
);
