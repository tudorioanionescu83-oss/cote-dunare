import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FAST_DIR = path.join(ROOT, "public", "fast");
const AFDJ_KM_PATH = path.join(FAST_DIR, "afdj-km.geojson");
const METADATA_PATH = path.join(FAST_DIR, "metadata.json");
const OUTPUT_PATH = path.join(FAST_DIR, "pc-planning-polygons.geojson");

const PLANNING_POLYGON_SOURCE =
  "generated from detailed AFDJ km/bank reference points";
const PLANNING_POLYGON_DISCLAIMER =
  "Poligon de orientare generat din puncte km AFDJ de pe maluri/șenal; nu reprezintă poligon tehnic final de execuție.";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function distanceSquared(first, second) {
  const dx = first[0] - second[0];
  const dy = first[1] - second[1];
  return dx * dx + dy * dy;
}

function chooseFarthestPair(features) {
  let selected = null;

  for (let firstIndex = 0; firstIndex < features.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < features.length; secondIndex += 1) {
      const first = features[firstIndex];
      const second = features[secondIndex];
      const score = distanceSquared(first.geometry.coordinates, second.geometry.coordinates);
      if (!selected || score > selected.score) {
        selected = { first, second, score };
      }
    }
  }

  return selected ? [selected.first, selected.second] : null;
}

function orientPair(pair, previousPair) {
  if (!previousPair) return pair;

  const [currentFirst, currentSecond] = pair;
  const [previousFirst, previousSecond] = previousPair;
  const sameOrientationScore =
    distanceSquared(previousFirst.geometry.coordinates, currentFirst.geometry.coordinates) +
    distanceSquared(previousSecond.geometry.coordinates, currentSecond.geometry.coordinates);
  const swappedOrientationScore =
    distanceSquared(previousFirst.geometry.coordinates, currentSecond.geometry.coordinates) +
    distanceSquared(previousSecond.geometry.coordinates, currentFirst.geometry.coordinates);

  return sameOrientationScore <= swappedOrientationScore
    ? pair
    : [currentSecond, currentFirst];
}

function buildPlanningPolygonForInterval(afdjKm, interval) {
  const leftBank = [];
  const rightBank = [];
  const sourceKmValues = [];
  let previousPair = null;

  for (let km = interval.km_upstream; km >= interval.km_downstream; km -= 1) {
    const bankReferencePoints = afdjKm.features.filter(
      (feature) =>
        feature?.geometry?.type === "Point" &&
        Number(feature?.properties?.wtwdis) === km &&
        Number(feature?.properties?.catdis) === 3
    );

    if (bankReferencePoints.length < 2) {
      return {
        feature: null,
        limitation: `${interval.pc_code}: km ${km} are mai puțin de două puncte catdis=3`,
      };
    }

    const pair = chooseFarthestPair(bankReferencePoints);
    if (!pair) {
      return {
        feature: null,
        limitation: `${interval.pc_code}: km ${km} nu permite selectarea unei perechi de maluri`,
      };
    }

    const orientedPair = orientPair(pair, previousPair);
    previousPair = orientedPair;
    sourceKmValues.push(km);
    leftBank.push(orientedPair[0].geometry.coordinates);
    rightBank.push(orientedPair[1].geometry.coordinates);
  }

  const coordinates = [...leftBank, ...rightBank.reverse(), leftBank[0]];
  return {
    feature: {
      type: "Feature",
      properties: {
        pc_code: interval.pc_code,
        name: interval.name,
        km_interval: `km ${interval.km_upstream} – ${interval.km_downstream}`,
        km_upstream: interval.km_upstream,
        km_downstream: interval.km_downstream,
        representation_type: "derived planning polygon",
        source: PLANNING_POLYGON_SOURCE,
        disclaimer: PLANNING_POLYGON_DISCLAIMER,
        works_summary: interval.works_summary,
        monitoring_overview: interval.monitoring_overview,
        source_km_values: sourceKmValues,
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    },
    limitation: null,
  };
}

function updateMetadata(metadata, featureCount, limitations) {
  return {
    ...metadata,
    layers: {
      ...metadata.layers,
      pc_planning_polygons: {
        file: "pc-planning-polygons.geojson",
        feature_count: featureCount,
        status: featureCount ? "generated_from_afdj_bank_reference_points" : "not_generated",
        geometry_note: PLANNING_POLYGON_DISCLAIMER,
        limitations,
      },
    },
  };
}

const afdjKm = readJson(AFDJ_KM_PATH);
const metadata = readJson(METADATA_PATH);
const features = [];
const limitations = [];

for (const interval of metadata.pc_intervals || []) {
  const { feature, limitation } = buildPlanningPolygonForInterval(afdjKm, interval);
  if (feature) features.push(feature);
  if (limitation) limitations.push(limitation);
}

const featureCollection = {
  type: "FeatureCollection",
  features,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(featureCollection, null, 2)}\n`, "utf8");
fs.writeFileSync(
  METADATA_PATH,
  `${JSON.stringify(updateMetadata(metadata, features.length, limitations), null, 2)}\n`,
  "utf8"
);

console.log(`Wrote ${features.length} PC planning polygons to ${OUTPUT_PATH}`);
if (limitations.length) {
  console.log("Limitări:");
  for (const limitation of limitations) console.log(`- ${limitation}`);
}
