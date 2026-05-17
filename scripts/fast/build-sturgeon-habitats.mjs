import fs from "node:fs";
import path from "node:path";
import { STURGEON_HABITATS } from "./sturgeon-habitats-data.mjs";

const ROOT = process.cwd();
const FAST_DIR = path.join(ROOT, "public", "fast");
const AFDJ_KM_PATH = path.join(FAST_DIR, "afdj-km.geojson");
const METADATA_PATH = path.join(FAST_DIR, "metadata.json");
const OUTPUT_PATH = path.join(FAST_DIR, "sturgeon-habitats.geojson");
const REPORT_PATH = path.join(FAST_DIR, "sturgeon-habitats.report.json");
const MAX_REFERENCE_GAP_KM = 5;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function distanceSquared(first, second) {
  const dx = first[0] - second[0];
  const dy = first[1] - second[1];
  return dx * dx + dy * dy;
}

function pickMedoidCoordinate(features) {
  const coordinates = features.map((feature) => feature.geometry.coordinates);
  return coordinates.reduce((best, candidate) => {
    const score = coordinates.reduce(
      (total, coordinate) => total + distanceSquared(candidate, coordinate),
      0
    );
    if (!best || score < best.score) {
      return { coordinate: candidate, score };
    }
    return best;
  }, null)?.coordinate;
}

function chooseFarthestPair(features) {
  let selected = null;

  for (let firstIndex = 0; firstIndex < features.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < features.length; secondIndex += 1) {
      const first = features[firstIndex];
      const second = features[secondIndex];
      const score = distanceSquared(first.geometry.coordinates, second.geometry.coordinates);
      if (!selected || score > selected.score) {
        selected = {
          first: first.geometry.coordinates,
          second: second.geometry.coordinates,
          score,
        };
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
    distanceSquared(previousFirst, currentFirst) +
    distanceSquared(previousSecond, currentSecond);
  const swappedOrientationScore =
    distanceSquared(previousFirst, currentSecond) +
    distanceSquared(previousSecond, currentFirst);

  return sameOrientationScore <= swappedOrientationScore
    ? pair
    : [currentSecond, currentFirst];
}

function interpolateCoordinate(first, second, ratio) {
  return [
    first[0] + (second[0] - first[0]) * ratio,
    first[1] + (second[1] - first[1]) * ratio,
  ];
}

function averageCoordinates(coordinates) {
  const total = coordinates.reduce(
    (result, coordinate) => [result[0] + coordinate[0], result[1] + coordinate[1]],
    [0, 0]
  );
  return [total[0] / coordinates.length, total[1] / coordinates.length];
}

function isMaritimeCoordinate(coordinate) {
  const [lng, lat] = coordinate;
  return lat >= 45.15 && (lng >= 28.15 || lat >= 45.4);
}

function getRawPointCoordinates(afdjKm, value, predicate = () => true) {
  return (afdjKm.features || [])
    .filter(
      (feature) =>
        Number(feature?.properties?.wtwdis) === value &&
        feature?.geometry?.type === "Point" &&
        predicate(feature.geometry.coordinates)
    )
    .map((feature) => feature.geometry.coordinates);
}

function getRepresentativeRawPoint(afdjKm, value, predicate = () => true) {
  const coordinates = getRawPointCoordinates(afdjKm, value, predicate);
  return coordinates.length ? averageCoordinates(coordinates) : null;
}

function getScaledRkmPoint(afdjKm, value) {
  const target = value * 10;
  const scaledValues = [
    ...new Set(
      (afdjKm.features || [])
        .map((feature) => Number(feature?.properties?.wtwdis))
        .filter((distance) => Number.isFinite(distance) && distance > 1075)
    ),
  ].sort((first, second) => first - second);
  const lower = [...scaledValues].reverse().find((distance) => distance <= target);
  const upper = scaledValues.find((distance) => distance >= target);
  if (lower === undefined || upper === undefined) return null;

  const lowerPoint = getRepresentativeRawPoint(afdjKm, lower);
  const upperPoint = getRepresentativeRawPoint(afdjKm, upper);
  if (!lowerPoint || !upperPoint) return null;
  if (lower === upper) return lowerPoint;

  return interpolateCoordinate(lowerPoint, upperPoint, (target - lower) / (upper - lower));
}

function getMaritimeMilePoint(afdjKm, value) {
  const exact = getRepresentativeRawPoint(afdjKm, value, isMaritimeCoordinate);
  if (exact) return exact;

  const mileValues = [
    ...new Set(
      (afdjKm.features || [])
        .map((feature) => Number(feature?.properties?.wtwdis))
        .filter(
          (distance) =>
            Number.isFinite(distance) &&
            distance >= 0 &&
            distance <= 80 &&
            getRawPointCoordinates(afdjKm, distance, isMaritimeCoordinate).length > 0
        )
    ),
  ].sort((first, second) => first - second);
  const lower = [...mileValues].reverse().find((distance) => distance <= value);
  const upper = mileValues.find((distance) => distance >= value);
  if (lower === undefined || upper === undefined) return null;

  const lowerPoint = getRepresentativeRawPoint(afdjKm, lower, isMaritimeCoordinate);
  const upperPoint = getRepresentativeRawPoint(afdjKm, upper, isMaritimeCoordinate);
  if (!lowerPoint || !upperPoint) return null;
  if (lower === upper) return lowerPoint;

  return interpolateCoordinate(lowerPoint, upperPoint, (value - lower) / (upper - lower));
}

function buildReferenceIndex(afdjKm) {
  const featuresByKm = new Map();

  for (const feature of afdjKm.features || []) {
    const km = Number(feature?.properties?.wtwdis);
    if (!Number.isInteger(km) || feature?.geometry?.type !== "Point") continue;
    const group = featuresByKm.get(km) || [];
    group.push(feature);
    featuresByKm.set(km, group);
  }

  const rawReferences = [];
  for (const [km, features] of featuresByKm) {
    const center = pickMedoidCoordinate(
      features.filter((feature) => Number(feature?.properties?.catdis) === 1)
    );
    const bankPair = chooseFarthestPair(
      features.filter((feature) => Number(feature?.properties?.catdis) === 3)
    );

    if (center && bankPair) {
      rawReferences.push({ km, center, bankPair });
    }
  }

  rawReferences.sort((first, second) => second.km - first.km);

  let previousPair = null;
  const references = rawReferences.map((reference) => {
    const bankPair = orientPair(reference.bankPair, previousPair);
    previousPair = bankPair;
    return { ...reference, bankPair };
  });

  return {
    references,
    byKm: new Map(references.map((reference) => [reference.km, reference])),
  };
}

function interpolateReference(referenceIndex, value) {
  if (referenceIndex.byKm.has(value)) {
    return {
      ...referenceIndex.byKm.get(value),
      source_km_values: [value],
      interpolated: false,
    };
  }

  const upstream = referenceIndex.references
    .filter((reference) => reference.km > value)
    .sort((first, second) => first.km - second.km)[0];
  const downstream = referenceIndex.references
    .filter((reference) => reference.km < value)
    .sort((first, second) => second.km - first.km)[0];

  if (!upstream || !downstream) return null;
  if (upstream.km - downstream.km > MAX_REFERENCE_GAP_KM) return null;

  const ratio = (upstream.km - value) / (upstream.km - downstream.km);
  return {
    km: value,
    center: interpolateCoordinate(upstream.center, downstream.center, ratio),
    bankPair: [
      interpolateCoordinate(upstream.bankPair[0], downstream.bankPair[0], ratio),
      interpolateCoordinate(upstream.bankPair[1], downstream.bankPair[1], ratio),
    ],
    source_km_values: [upstream.km, downstream.km],
    interpolated: true,
  };
}

function crossProduct(first, second) {
  return first[0] * second[1] - first[1] * second[0];
}

function getHydrographicBankPoint(referenceIndex, value, bankSide) {
  const reference = interpolateReference(referenceIndex, value);
  if (!reference) return null;

  const upstream = interpolateReference(referenceIndex, value + 0.01);
  const downstream = interpolateReference(referenceIndex, value - 0.01);
  if (!upstream || !downstream) return null;

  const flow = [
    downstream.center[0] - upstream.center[0],
    downstream.center[1] - upstream.center[1],
  ];
  const ranked = reference.bankPair
    .map((coordinate) => ({
      coordinate,
      sideScore: crossProduct(flow, [
        coordinate[0] - reference.center[0],
        coordinate[1] - reference.center[1],
      ]),
    }))
    .sort((first, second) => second.sideScore - first.sideScore);

  return {
    center: reference.center,
    bank: bankSide === "left" ? ranked[0].coordinate : ranked[1].coordinate,
    source_km_values: reference.source_km_values,
    interpolated: reference.interpolated,
  };
}

function orientation(first, second, third) {
  return (
    (second[0] - first[0]) * (third[1] - first[1]) -
    (second[1] - first[1]) * (third[0] - first[0])
  );
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

  return firstOrientation * secondOrientation < 0 && thirdOrientation * fourthOrientation < 0;
}

function polygonSelfIntersects(coordinates) {
  return segmentsIntersect(coordinates[0], coordinates[1], coordinates[2], coordinates[3]);
}

function isValidHabitatGeometry(feature) {
  const geometry = feature?.geometry;
  if (!geometry || !["Point", "LineString", "Polygon", "MultiPolygon"].includes(geometry.type)) {
    return false;
  }
  if (geometry.type === "Point") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length === 2;
  }
  if (geometry.type === "LineString") {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
  }
  if (geometry.type === "Polygon") {
    return Array.isArray(geometry.coordinates?.[0]) && geometry.coordinates[0].length >= 5;
  }
  return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
}

function getRelatedPcCodes(metadata, start, end) {
  const upper = Math.max(start, end);
  const lower = Math.min(start, end);

  return (metadata.pc_intervals || [])
    .filter((interval) => {
      const pcUpper = Math.max(interval.km_upstream, interval.km_downstream);
      const pcLower = Math.min(interval.km_upstream, interval.km_downstream);
      return lower <= pcUpper && upper >= pcLower;
    })
    .map((interval) => interval.pc_code);
}

function buildCorridorHabitatFeature(referenceIndex, metadata, habitat) {
  const start = getHydrographicBankPoint(referenceIndex, habitat.rkm_start, habitat.bank_side);
  const end = getHydrographicBankPoint(referenceIndex, habitat.rkm_end, habitat.bank_side);
  if (!start || !end) {
    return {
      feature: null,
      error: `${habitat.id}: referințe AFDJ insuficiente pentru km ${habitat.rkm_start}-${habitat.rkm_end}`,
    };
  }

  const coordinates = [start.center, end.center, end.bank, start.bank, start.center];
  if (polygonSelfIntersects(coordinates)) {
    return {
      feature: null,
      error: `${habitat.id}: poligon auto-intersectat la km ${habitat.rkm_start}-${habitat.rkm_end}`,
    };
  }

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        related_fast_pc: getRelatedPcCodes(metadata, habitat.rkm_start, habitat.rkm_end),
        source: "Honț et al. 2022 / DDNI + puncte AFDJ",
        geometry_method: "corridor between interpolated fairway reference and hydrographic bank",
        interpolation_used: start.interpolated || end.interpolated,
        source_km_values: [...new Set([...start.source_km_values, ...end.source_km_values])],
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    },
    error: null,
  };
}

function buildCenterlinePointFeature(afdjKm, habitat) {
  const coordinate = getRepresentativeRawPoint(afdjKm, habitat.rkm_start);
  if (!coordinate) {
    return {
      feature: null,
      error: `${habitat.id}: referinČ›Ä AFDJ insuficientÄ pentru km ${habitat.rkm_start}`,
    };
  }

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        source: "Lower Danube source registry + puncte AFDJ",
        geometry_method: "centerline point from AFDJ km reference",
        source_km_values: [habitat.rkm_start],
      },
      geometry: {
        type: "Point",
        coordinates: coordinate,
      },
    },
    error: null,
  };
}

function buildScaledRkmPointFeature(afdjKm, habitat) {
  const coordinate = getScaledRkmPoint(afdjKm, habitat.rkm_start);
  if (!coordinate) {
    return {
      feature: null,
      error: `${habitat.id}: referinČ›Ä AFDJ insuficientÄ pentru km scalat ${habitat.rkm_start}`,
    };
  }

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        source: "Lower Danube source registry + puncte AFDJ",
        geometry_method: "interpolated centerline point from scaled AFDJ km references",
        interpolation_used: true,
      },
      geometry: {
        type: "Point",
        coordinates: coordinate,
      },
    },
    error: null,
  };
}

function buildMaritimeMileSegmentFeature(afdjKm, habitat) {
  const start = getMaritimeMilePoint(afdjKm, habitat.mm_start);
  const end = getMaritimeMilePoint(afdjKm, habitat.mm_end);
  if (!start || !end) {
    return {
      feature: null,
      error: `${habitat.id}: referinČ›e AFDJ insuficiente pentru Mm ${habitat.mm_start}-${habitat.mm_end}`,
    };
  }

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        source: "Lower Danube source registry + puncte AFDJ",
        geometry_method: "centerline segment from maritime-mile AFDJ references",
        source_km_values: [habitat.mm_start, habitat.mm_end],
      },
      geometry: {
        type: "LineString",
        coordinates: [start, end],
      },
    },
    error: null,
  };
}

function buildHabitatFeature(afdjKm, referenceIndex, metadata, habitat) {
  if (habitat.geometry_kind === "branch_missing") {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "skipped_due_to_missing_branch_geometry",
      },
    };
  }
  if (habitat.geometry_kind === "centerline_point") {
    return buildCenterlinePointFeature(afdjKm, habitat);
  }
  if (habitat.geometry_kind === "scaled_rkm_point") {
    return buildScaledRkmPointFeature(afdjKm, habitat);
  }
  if (habitat.geometry_kind === "maritime_mile_segment") {
    return buildMaritimeMileSegmentFeature(afdjKm, habitat);
  }
  return buildCorridorHabitatFeature(referenceIndex, metadata, habitat);
}

const afdjKm = readJson(AFDJ_KM_PATH);
const metadata = readJson(METADATA_PATH);
const referenceIndex = buildReferenceIndex(afdjKm);
const features = [];
const errors = [];

for (const habitat of STURGEON_HABITATS) {
  const { feature, error } = buildHabitatFeature(afdjKm, referenceIndex, metadata, habitat);
  if (feature) features.push(feature);
  if (error) errors.push(error);
}

const output = {
  type: "FeatureCollection",
  features,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const counts = features.reduce(
  (result, feature) => ({
    ...result,
    [feature.properties.habitat_type]:
      (result[feature.properties.habitat_type] || 0) + 1,
  }),
  {}
);
const invalidGeometryCount = features.filter((feature) => !isValidHabitatGeometry(feature)).length;
const datasetCounts = STURGEON_HABITATS.reduce(
  (result, habitat) => ({
    ...result,
    [habitat.habitat_type]: (result[habitat.habitat_type] || 0) + 1,
  }),
  {}
);
const skipped = errors.map((error) =>
  typeof error === "string"
    ? { id: error.split(":")[0], reason: error }
    : error
);
const report = {
  dataset_total: STURGEON_HABITATS.length,
  generated_features: features.length,
  skipped_features: skipped.length,
  dataset_counts_by_habitat_type: datasetCounts,
  generated_counts_by_habitat_type: counts,
  skipped,
};

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Wrote ${features.length} sturgeon habitat polygons to ${OUTPUT_PATH}`);
console.log(
  `Counts: spawning=${counts.spawning_potential || 0}, confirmed=${counts.confirmed_spawning || 0}, feeding=${counts.feeding_yoy || 0}, wintering=${counts.wintering_refuge || 0}, protection=${counts.sensitive_protection || 0}`
);
console.log(`Invalid geometries: ${invalidGeometryCount}`);
console.log(`Skipped habitats: ${errors.length}`);
if (errors.length) {
  console.log("Skipped habitats:");
  for (const error of errors) {
    console.log(`- ${typeof error === "string" ? error : `${error.id}: ${error.reason}`}`);
  }
}
