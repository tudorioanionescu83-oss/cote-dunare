import fs from "node:fs";
import path from "node:path";
import { STURGEON_HABITATS } from "./sturgeon-habitats-data.mjs";

const ROOT = process.cwd();
const FAST_DIR = path.join(ROOT, "public", "fast");
const AFDJ_KM_PATH = path.join(FAST_DIR, "afdj-km.geojson");
const METADATA_PATH = path.join(FAST_DIR, "metadata.json");
const OUTPUT_PATH = path.join(FAST_DIR, "sturgeon-habitats.geojson");
const REPORT_PATH = path.join(FAST_DIR, "sturgeon-habitats.report.json");

const FAST2_GROUP = "fast2_ddni_863_375";
const LOWER_DANUBE_GROUP = "lower_danube_below_375";
const MAX_REFERENCE_GAP_KM = 5;
const MAX_HECTOMETRIC_DISTANCE_SQUARED = 0.0002;
const BRANCH_CONFIGS = {
  Borcea: {
    coordinateFilter: ([lng, lat], feature) =>
      lng >= 27.7 &&
      lng <= 28.0 &&
      lat >= 44.2 &&
      lat <= 44.45 &&
      Number(feature?.properties?.wtwdis) <= 60,
    geometry_method: "bank_and_fairway_corridor",
  },
  Bala: {
    coordinateFilter: ([lng, lat]) =>
      lng >= 28.58 && lng <= 28.61 && lat >= 44.27 && lat <= 44.29,
    geometry_method: "manual_review_needed",
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function distanceSquared(first, second) {
  const dx = first[0] - second[0];
  const dy = first[1] - second[1];
  return dx * dx + dy * dy;
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

function chooseFarthestPair(coordinates) {
  let selected = null;

  for (let firstIndex = 0; firstIndex < coordinates.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < coordinates.length; secondIndex += 1) {
      const first = coordinates[firstIndex];
      const second = coordinates[secondIndex];
      const score = distanceSquared(first, second);
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
    distanceSquared(previousFirst, currentFirst) +
    distanceSquared(previousSecond, currentSecond);
  const swappedOrientationScore =
    distanceSquared(previousFirst, currentSecond) +
    distanceSquared(previousSecond, currentFirst);

  return sameOrientationScore <= swappedOrientationScore
    ? pair
    : [currentSecond, currentFirst];
}

function pickMedoidCoordinate(coordinates) {
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

function getCoordinatesForValue(features, value, predicate = () => true) {
  return features
    .filter(
      (feature) =>
        feature?.geometry?.type === "Point" &&
        Number(feature?.properties?.wtwdis) === value &&
        predicate(feature.geometry.coordinates, feature)
    )
    .map((feature) => feature.geometry.coordinates);
}

function isMaritimeCoordinate(coordinate) {
  const [lng, lat] = coordinate;
  return lat >= 45.15 && (lng >= 28.15 || lat >= 45.4);
}

function buildRkmReferenceIndex(features, predicate = () => true) {
  const byKm = new Map();

  for (const feature of features) {
    if (feature?.geometry?.type !== "Point") continue;
    if (!predicate(feature.geometry.coordinates, feature)) continue;
    const km = Number(feature?.properties?.wtwdis);
    if (!Number.isInteger(km) || km < 0 || km > 900) continue;

    const bucket = byKm.get(km) || { center: [], banks: [] };
    if (Number(feature?.properties?.catdis) === 1) {
      bucket.center.push(feature.geometry.coordinates);
    }
    if (Number(feature?.properties?.catdis) === 3) {
      bucket.banks.push(feature.geometry.coordinates);
    }
    byKm.set(km, bucket);
  }

  const rawReferences = [];
  for (const [km, bucket] of byKm) {
    const center = pickMedoidCoordinate(bucket.center);
    const bankPair = chooseFarthestPair(bucket.banks);
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

function buildBranchReferenceIndex(features, predicate) {
  const byKm = new Map();

  for (const feature of features) {
    if (feature?.geometry?.type !== "Point") continue;
    if (!predicate(feature.geometry.coordinates, feature)) continue;
    const km = Number(feature?.properties?.wtwdis);
    if (!Number.isFinite(km) || km < 0 || km > 900) continue;

    const bucket = byKm.get(km) || { center: [], banks: [] };
    if (Number(feature?.properties?.catdis) === 1) {
      bucket.center.push(feature.geometry.coordinates);
    }
    if (Number(feature?.properties?.catdis) === 3) {
      bucket.banks.push(feature.geometry.coordinates);
    }
    byKm.set(km, bucket);
  }

  const references = [];
  const halfWidths = [];

  for (const [km, bucket] of byKm) {
    const center = pickMedoidCoordinate(bucket.center);
    if (!center) continue;

    const bankPair = chooseFarthestPair(bucket.banks);
    const singleBank = !bankPair ? pickMedoidCoordinate(bucket.banks) : null;
    if (bankPair) {
      halfWidths.push(Math.sqrt(distanceSquared(bankPair[0], bankPair[1])) / 2);
    } else if (singleBank) {
      halfWidths.push(Math.sqrt(distanceSquared(center, singleBank)));
    }

    references.push({
      km,
      center,
      bankPair,
      singleBank,
    });
  }

  references.sort((first, second) => second.km - first.km);

  return {
    references,
    byKm: new Map(references.map((reference) => [reference.km, reference])),
    averageHalfWidth: halfWidths.length
      ? halfWidths.reduce((sum, value) => sum + value, 0) / halfWidths.length
      : null,
    bankReferenceCount: references.filter(
      (reference) => reference.bankPair || reference.singleBank
    ).length,
    fullBankPairCount: references.filter((reference) => reference.bankPair).length,
  };
}

function buildMaritimeReferenceIndex(features) {
  const byMile = new Map();

  for (const feature of features) {
    if (feature?.geometry?.type !== "Point") continue;
    const mile = Number(feature?.properties?.wtwdis);
    if (!Number.isFinite(mile) || mile < 0 || mile > 80) continue;
    if (!isMaritimeCoordinate(feature.geometry.coordinates)) continue;

    const bucket = byMile.get(mile) || [];
    bucket.push(feature.geometry.coordinates);
    byMile.set(mile, bucket);
  }

  const rawReferences = [];
  for (const [mile, coordinates] of byMile) {
    const pair = chooseFarthestPair(coordinates);
    if (!pair) continue;
    rawReferences.push({
      km: mile,
      center: averageCoordinates(pair),
      bankPair: pair,
    });
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

function buildScaledCenterlineIndex(features) {
  const references = features
    .filter(
      (feature) =>
        feature?.geometry?.type === "Point" &&
        Number(feature?.properties?.catdis) === 1 &&
        Number(feature?.properties?.wtwdis) > 1000
    )
    .map((feature) => ({
      km: Number(feature.properties.wtwdis) / 10,
      center: feature.geometry.coordinates,
    }))
    .sort((first, second) => second.km - first.km);

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
    bankPair:
      upstream.bankPair && downstream.bankPair
        ? [
            interpolateCoordinate(upstream.bankPair[0], downstream.bankPair[0], ratio),
            interpolateCoordinate(upstream.bankPair[1], downstream.bankPair[1], ratio),
          ]
        : null,
    source_km_values: [upstream.km, downstream.km],
    interpolated: true,
  };
}

function crossProduct(first, second) {
  return first[0] * second[1] - first[1] * second[0];
}

function getHydrographicBanks(referenceIndex, value) {
  const reference = interpolateReference(referenceIndex, value);
  if (!reference?.bankPair) return null;

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
    km: value,
    center: reference.center,
    leftBank: ranked[0].coordinate,
    rightBank: ranked[1].coordinate,
    source_km_values: reference.source_km_values,
    interpolated: reference.interpolated,
  };
}

function buildSampleValues(start, end) {
  const startTenths = Math.round(start * 10);
  const endTenths = Math.round(end * 10);
  const step = startTenths >= endTenths ? -1 : 1;
  const values = [];

  for (let value = startTenths; step < 0 ? value >= endTenths : value <= endTenths; value += step) {
    values.push(value / 10);
  }

  return values;
}

function getHectometricDigit(value) {
  const tenths = Math.round((value - Math.floor(value)) * 10);
  return tenths >= 1 && tenths <= 9 ? tenths : null;
}

function pickNearestCoordinate(coordinates, target) {
  let selected = null;
  for (const coordinate of coordinates) {
    const score = distanceSquared(coordinate, target);
    if (!selected || score < selected.score) {
      selected = { coordinate, score };
    }
  }
  return selected && selected.score <= MAX_HECTOMETRIC_DISTANCE_SQUARED
    ? selected.coordinate
    : null;
}

function buildHectometricIndex(features, predicate = () => true) {
  const byDigit = new Map();

  for (const feature of features) {
    if (feature?.geometry?.type !== "Point") continue;
    if (!predicate(feature)) continue;
    const value = Number(feature?.properties?.wtwdis);
    if (!Number.isFinite(value) || value < 1 || value > 9) continue;

    const bucket = byDigit.get(value) || [];
    bucket.push(feature.geometry.coordinates);
    byDigit.set(value, bucket);
  }

  return byDigit;
}

function enrichWithHectometricPoint(hectometricIndex, value, target) {
  const digit = getHectometricDigit(value);
  if (!digit) return { coordinate: target, hectometric_used: false };

  const nearest = pickNearestCoordinate(hectometricIndex.get(digit) || [], target);
  return {
    coordinate: nearest || target,
    hectometric_used: Boolean(nearest),
  };
}

function assignHectometricCoordinates(hectometricIndex, value, reference) {
  const digit = getHectometricDigit(value);
  if (!digit) return null;

  const targets = [reference.leftBank, reference.center, reference.rightBank];
  const candidates = (hectometricIndex.get(digit) || []).filter((coordinate) =>
    targets.some(
      (target) => distanceSquared(coordinate, target) <= MAX_HECTOMETRIC_DISTANCE_SQUARED
    )
  );
  if (candidates.length < 3) return null;

  let selected = null;
  for (let first = 0; first < candidates.length; first += 1) {
    for (let second = 0; second < candidates.length; second += 1) {
      if (second === first) continue;
      for (let third = 0; third < candidates.length; third += 1) {
        if (third === first || third === second) continue;
        const coordinates = [candidates[first], candidates[second], candidates[third]];
        const scores = coordinates.map((coordinate, index) =>
          distanceSquared(coordinate, targets[index])
        );
        if (scores.some((score) => score > MAX_HECTOMETRIC_DISTANCE_SQUARED)) continue;
        const total = scores.reduce((sum, score) => sum + score, 0);
        if (!selected || total < selected.score) {
          selected = { coordinates, score: total };
        }
      }
    }
  }

  if (!selected) return null;
  return {
    leftBank: selected.coordinates[0],
    center: selected.coordinates[1],
    rightBank: selected.coordinates[2],
  };
}

function buildDenseBankReferenceChain(
  referenceIndex,
  hectometricIndex,
  start,
  end,
  { useHectometric = true, preferredBankSide = null } = {}
) {
  return buildSampleValues(start, end)
    .map((value) => {
      const reference = getHydrographicBanks(referenceIndex, value);
      if (!reference) return null;

      const center = useHectometric
        ? enrichWithHectometricPoint(hectometricIndex, value, reference.center)
        : { coordinate: reference.center, hectometric_used: false };
      const preferredBank =
        useHectometric && preferredBankSide
          ? enrichWithHectometricPoint(
              hectometricIndex,
              value,
              preferredBankSide === "left" ? reference.leftBank : reference.rightBank
            )
          : null;

      return {
        ...reference,
        center: center.coordinate || reference.center,
        leftBank:
          preferredBankSide === "left"
            ? preferredBank?.coordinate || reference.leftBank
            : reference.leftBank,
        rightBank:
          preferredBankSide === "right"
            ? preferredBank?.coordinate || reference.rightBank
            : reference.rightBank,
        hectometric_used:
          Boolean(preferredBank?.hectometric_used) || center.hectometric_used,
      };
    })
    .filter(Boolean);
}

function corridorAroundCenter(chain, ratio = 0.32) {
  const left = chain.map((reference) =>
    interpolateCoordinate(reference.center, reference.leftBank, ratio)
  );
  const right = chain
    .map((reference) => interpolateCoordinate(reference.center, reference.rightBank, ratio))
    .reverse();
  return [...left, ...right, left[0]];
}

function corridorToBank(chain, bankSide) {
  const bankBoundary = chain.map((reference) =>
    bankSide === "left" ? reference.leftBank : reference.rightBank
  );
  const waterwardBoundary = chain
    .map((reference) =>
      interpolateCoordinate(
        bankSide === "left" ? reference.leftBank : reference.rightBank,
        reference.center,
        0.42
      )
    )
    .reverse();
  return [...bankBoundary, ...waterwardBoundary, bankBoundary[0]];
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

function ringSelfIntersects(coordinates) {
  for (let firstIndex = 0; firstIndex < coordinates.length - 1; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < coordinates.length - 1; secondIndex += 1) {
      if (Math.abs(firstIndex - secondIndex) <= 1) continue;
      if (firstIndex === 0 && secondIndex === coordinates.length - 2) continue;
      if (
        segmentsIntersect(
          coordinates[firstIndex],
          coordinates[firstIndex + 1],
          coordinates[secondIndex],
          coordinates[secondIndex + 1]
        )
      ) {
        return true;
      }
    }
  }
  return false;
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

function normalizeHabitat(habitat) {
  return {
    dataset_group: FAST2_GROUP,
    needs_manual_review: false,
    ...habitat,
  };
}

function buildPolygonFeature(metadata, habitat, chain, options = {}) {
  if (chain.length < 2) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_reference_chain",
      },
    };
  }

  const isFixedBank = habitat.bank_side === "left" || habitat.bank_side === "right";
  const coordinates = isFixedBank
    ? corridorToBank(chain, habitat.bank_side)
    : corridorAroundCenter(chain, options.center_ratio ?? 0.32);

  if (coordinates.length < 5 || ringSelfIntersects(coordinates)) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "invalid_generated_polygon",
      },
    };
  }

  const needsManualReview =
    habitat.needs_manual_review ||
    Boolean(options.needs_manual_review) ||
    (!isFixedBank && habitat.dataset_group === LOWER_DANUBE_GROUP);

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        related_fast_pc:
          habitat.dataset_group === FAST2_GROUP
            ? getRelatedPcCodes(metadata, habitat.rkm_start, habitat.rkm_end)
            : [],
        source:
          habitat.dataset_group === FAST2_GROUP
            ? "Honț et al. 2022 / DDNI + puncte AFDJ"
            : "Set intern Lower Danube + puncte AFDJ",
        geometry_method:
          options.geometry_method ||
          (isFixedBank ? "bank_and_fairway_corridor" : "bank_points_corridor"),
        needs_manual_review: needsManualReview,
        positioning_method: options.positioning_method,
        interpolation_used: chain.some((reference) => reference.interpolated),
        hectometric_points_used: chain.some((reference) => reference.hectometric_used),
        source_km_values: [
          ...new Set(chain.flatMap((reference) => reference.source_km_values || [])),
        ],
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    },
    error: null,
  };
}

function buildMainstemHabitatFeature(
  referenceIndex,
  hectometricIndex,
  metadata,
  habitat
) {
  const preferredBankSide =
    habitat.dataset_group === FAST2_GROUP &&
    (habitat.bank_side === "left" || habitat.bank_side === "right")
      ? habitat.bank_side
      : null;
  const chain = buildDenseBankReferenceChain(
    referenceIndex,
    hectometricIndex,
    habitat.rkm_start,
    habitat.rkm_end,
    { preferredBankSide }
  );
  if (!chain.length) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_afdj_bank_references",
      },
    };
  }

  const primaryResult = buildPolygonFeature(metadata, habitat, chain, {
    geometry_method:
      habitat.bank_side === "left" || habitat.bank_side === "right"
        ? "bank_and_fairway_corridor"
        : "bank_points_corridor",
  });
  if (!primaryResult.error || primaryResult.error.reason !== "invalid_generated_polygon") {
    return primaryResult;
  }

  const fallbackChain = buildDenseBankReferenceChain(
    referenceIndex,
    hectometricIndex,
    habitat.rkm_start,
    habitat.rkm_end,
    { useHectometric: false }
  );
  return buildPolygonFeature(metadata, habitat, fallbackChain, {
    geometry_method:
      habitat.bank_side === "left" || habitat.bank_side === "right"
        ? "bank_and_fairway_corridor"
        : "bank_points_corridor",
  });
}

function buildMaritimeHabitatFeature(referenceIndex, metadata, habitat) {
  const chain = buildSampleValues(habitat.mm_start, habitat.mm_end)
    .map((value) => getHydrographicBanks(referenceIndex, value))
    .filter(Boolean);
  if (!chain.length) return null;

  return buildPolygonFeature(metadata, habitat, chain, {
    geometry_method: "bank_points_corridor",
    positioning_method: "marine_mile_geometry",
  });
}

function getAverageChannelHalfWidth(referenceIndex, targetKm) {
  const nearest = [...referenceIndex.references]
    .sort((first, second) => Math.abs(first.km - targetKm) - Math.abs(second.km - targetKm))
    .find((reference) => reference.bankPair);
  if (!nearest) return null;
  return Math.sqrt(distanceSquared(nearest.bankPair[0], nearest.bankPair[1])) / 4;
}

function buildScaledCenterlineChain(referenceIndex, start, end) {
  return buildSampleValues(start, end)
    .map((value) => interpolateReference(referenceIndex, value))
    .filter(Boolean);
}

function buildManualCenterlineCorridorFeature(
  scaledReferenceIndex,
  maritimeReferenceIndex,
  metadata,
  habitat
) {
  const chain = buildScaledCenterlineChain(
    scaledReferenceIndex,
    habitat.rkm_start,
    habitat.rkm_end
  );
  if (chain.length < 2) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_scaled_rkm_references",
      },
    };
  }

  const averageWidth = getAverageChannelHalfWidth(maritimeReferenceIndex, habitat.rkm_start);
  if (!averageWidth) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_channel_width_reference",
      },
    };
  }

  const left = [];
  const right = [];
  for (let index = 0; index < chain.length; index += 1) {
    const previous = chain[Math.max(index - 1, 0)].center;
    const next = chain[Math.min(index + 1, chain.length - 1)].center;
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const magnitude = Math.hypot(dx, dy) || 1;
    const perpendicular = [-dy / magnitude, dx / magnitude];
    left.push([
      chain[index].center[0] + perpendicular[0] * averageWidth,
      chain[index].center[1] + perpendicular[1] * averageWidth,
    ]);
    right.push([
      chain[index].center[0] - perpendicular[0] * averageWidth,
      chain[index].center[1] - perpendicular[1] * averageWidth,
    ]);
  }

  const coordinates = [...left, ...right.reverse(), left[0]];
  if (ringSelfIntersects(coordinates)) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "invalid_manual_review_polygon",
      },
    };
  }

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        related_fast_pc: [],
        source: "Set intern Lower Danube + puncte AFDJ",
        geometry_method: "manual_review_needed",
        needs_manual_review: true,
        positioning_method: "scaled_rkm_reference_centerline",
        interpolation_used: true,
        hectometric_points_used: false,
        source_km_values: [
          ...new Set(chain.flatMap((reference) => reference.source_km_values || [])),
        ],
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    },
    error: null,
  };
}

function buildApproxMaritimeHabitatFeature(
  mainstemReferenceIndex,
  hectometricIndex,
  metadata,
  habitat
) {
  const chain = buildDenseBankReferenceChain(
    mainstemReferenceIndex,
    hectometricIndex,
    habitat.approx_rkm_start,
    habitat.approx_rkm_end
  );
  if (!chain.length) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_approx_rkm_references",
      },
    };
  }

  return buildPolygonFeature(metadata, habitat, chain, {
    geometry_method: "approx_rkm_from_marine_mile",
    positioning_method: "approx_rkm_from_marine_mile",
    needs_manual_review: true,
  });
}

function clampIntervalToReferences(referenceIndex, start, end) {
  if (!referenceIndex.references.length) return [start, end];
  const kmValues = referenceIndex.references.map((reference) => reference.km);
  const maxKm = Math.max(...kmValues);
  const minKm = Math.min(...kmValues);
  const clampedStart = Math.min(Math.max(start, minKm), maxKm);
  const clampedEnd = Math.min(Math.max(end, minKm), maxKm);
  return [clampedStart, clampedEnd];
}

function buildBranchCenterlineChain(referenceIndex, start, end) {
  const [supportedStart, supportedEnd] = clampIntervalToReferences(referenceIndex, start, end);
  return buildSampleValues(supportedStart, supportedEnd)
    .map((value) => interpolateReference(referenceIndex, value))
    .filter(Boolean);
}

function buildCenterlineCorridorCoordinates(chain, halfWidth) {
  const left = [];
  const right = [];
  for (let index = 0; index < chain.length; index += 1) {
    const previous = chain[Math.max(index - 1, 0)].center;
    const next = chain[Math.min(index + 1, chain.length - 1)].center;
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const magnitude = Math.hypot(dx, dy) || 1;
    const perpendicular = [-dy / magnitude, dx / magnitude];
    left.push([
      chain[index].center[0] + perpendicular[0] * halfWidth,
      chain[index].center[1] + perpendicular[1] * halfWidth,
    ]);
    right.push([
      chain[index].center[0] - perpendicular[0] * halfWidth,
      chain[index].center[1] - perpendicular[1] * halfWidth,
    ]);
  }

  return [...left, ...right.reverse(), left[0]];
}

function buildBranchHabitatFeature(referenceIndex, metadata, habitat, geometryMethod) {
  const chain = buildBranchCenterlineChain(
    referenceIndex,
    habitat.rkm_start,
    habitat.rkm_end
  );
  if (chain.length < 2) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_branch_km_references",
      },
    };
  }

  if (!referenceIndex.averageHalfWidth) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "insufficient_branch_width_reference",
      },
    };
  }

  const widthScales = [0.82, 0.64, 0.48, 0.34, 0.22];
  const coordinates = widthScales
    .map((scale) =>
      buildCenterlineCorridorCoordinates(chain, referenceIndex.averageHalfWidth * scale)
    )
    .find((candidate) => candidate.length >= 5 && !ringSelfIntersects(candidate));
  if (!coordinates) {
    return {
      feature: null,
      error: {
        id: habitat.id,
        reason: "invalid_branch_polygon",
      },
    };
  }

  return {
    feature: {
      type: "Feature",
      properties: {
        ...habitat,
        related_fast_pc: [],
        source: "Set intern Lower Danube + puncte AFDJ",
        geometry_method: geometryMethod,
        needs_manual_review:
          geometryMethod === "manual_review_needed" ||
          chain.some((reference) => !reference.bankPair),
        positioning_method: "branch_km_geometry",
        interpolation_used: chain.some((reference) => reference.interpolated),
        hectometric_points_used: chain.some((reference) => !Number.isInteger(reference.km)),
        source_km_values: [
          ...new Set(chain.flatMap((reference) => reference.source_km_values || [])),
        ],
      },
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    },
    error: null,
  };
}

function buildHabitatFeature(indexes, metadata, rawHabitat) {
  const habitat = normalizeHabitat(rawHabitat);

  if (habitat.branch) {
    const branchIndex = indexes.branches[habitat.branch];
    if (!branchIndex) {
      return {
        feature: null,
        error: {
          id: habitat.id,
          reason: "skipped_due_to_missing_branch_geometry",
        },
      };
    }
    return buildBranchHabitatFeature(
      branchIndex,
      metadata,
      habitat,
      BRANCH_CONFIGS[habitat.branch].geometry_method
    );
  }

  if (habitat.river_unit === "marine_mile" || habitat.mm_start !== undefined) {
    const maritimeFeature = buildMaritimeHabitatFeature(
      indexes.maritime,
      metadata,
      habitat
    );
    if (maritimeFeature) return maritimeFeature;
    if (habitat.approx_rkm_start !== undefined && habitat.approx_rkm_end !== undefined) {
      return buildApproxMaritimeHabitatFeature(
        indexes.mainstem,
        indexes.hectometric,
        metadata,
        habitat
      );
    }
  }

  if (
    habitat.dataset_group === LOWER_DANUBE_GROUP &&
    habitat.rkm_start >= 120 &&
    habitat.rkm_end <= 124 &&
    habitat.id === "STU-FEED-NURSERY-123"
  ) {
    return buildManualCenterlineCorridorFeature(
      indexes.scaled,
      indexes.maritime,
      metadata,
      habitat
    );
  }

  return buildMainstemHabitatFeature(
    indexes.mainstem,
    indexes.hectometric,
    metadata,
    habitat
  );
}

function isValidHabitatGeometry(feature) {
  const geometry = feature?.geometry;
  if (!geometry || geometry.type !== "Polygon") return false;
  const ring = geometry.coordinates?.[0];
  return Array.isArray(ring) && ring.length >= 5 && !ringSelfIntersects(ring);
}

function countBy(features, key) {
  return features.reduce((result, item) => {
    const value = item[key];
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function countByGroupAndType(items) {
  return items.reduce((result, item) => {
    const group = item.dataset_group || FAST2_GROUP;
    const type = item.habitat_type;
    result[group] ||= {};
    result[group][type] = (result[group][type] || 0) + 1;
    return result;
  }, {});
}

const afdjKm = readJson(AFDJ_KM_PATH);
const metadata = readJson(METADATA_PATH);
const normalizedDataset = STURGEON_HABITATS.map(normalizeHabitat);
const indexes = {
  mainstem: buildRkmReferenceIndex(afdjKm.features || []),
  maritime: buildMaritimeReferenceIndex(afdjKm.features || []),
  scaled: buildScaledCenterlineIndex(afdjKm.features || []),
  hectometric: buildHectometricIndex(afdjKm.features || []),
  branches: Object.fromEntries(
    Object.entries(BRANCH_CONFIGS).map(([branch, config]) => [
      branch,
      buildBranchReferenceIndex(afdjKm.features || [], config.coordinateFilter),
    ])
  ),
};
const features = [];
const skipped = [];

for (const habitat of STURGEON_HABITATS) {
  const { feature, error } = buildHabitatFeature(indexes, metadata, habitat);
  if (feature) features.push(feature);
  if (error) skipped.push(error);
}

const invalidGeometryIds = features
  .filter((feature) => !isValidHabitatGeometry(feature))
  .map((feature) => feature.properties.id);
const needsManualReviewIds = features
  .filter((feature) => feature.properties.needs_manual_review)
  .map((feature) => feature.properties.id);

const output = {
  type: "FeatureCollection",
  features,
};

const report = {
  dataset_total: normalizedDataset.length,
  generated_features: features.length,
  skipped_features: skipped.length,
  invalid_geometries: invalidGeometryIds.length,
  dataset_counts_by_habitat_type: countBy(normalizedDataset, "habitat_type"),
  generated_counts_by_habitat_type: countBy(
    features.map((feature) => feature.properties),
    "habitat_type"
  ),
  dataset_counts_by_group_and_type: countByGroupAndType(normalizedDataset),
  generated_counts_by_group_and_type: countByGroupAndType(
    features.map((feature) => feature.properties)
  ),
  needs_manual_review: needsManualReviewIds,
  invalid_geometry_ids: invalidGeometryIds,
  skipped,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Wrote ${features.length} sturgeon habitat polygons to ${OUTPUT_PATH}`);
console.log(
  `Counts: spawning=${report.generated_counts_by_habitat_type.spawning_potential || 0}, confirmed=${report.generated_counts_by_habitat_type.confirmed_spawning || 0}, feeding=${report.generated_counts_by_habitat_type.feeding_yoy || 0}, wintering=${report.generated_counts_by_habitat_type.wintering_refuge || 0}, protection=${report.generated_counts_by_habitat_type.sensitive_protection || 0}`
);
console.log(`Invalid geometries: ${invalidGeometryIds.length}`);
console.log(`Skipped habitats: ${skipped.length}`);
if (skipped.length) {
  console.log("Skipped habitats:");
  for (const item of skipped) {
    console.log(`- ${item.id}: ${item.reason}`);
  }
}
