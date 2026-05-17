import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FAST_DIR = path.join(ROOT, "public", "fast");
const AFDJ_KM_PATH = path.join(FAST_DIR, "afdj-km.geojson");
const METADATA_PATH = path.join(FAST_DIR, "metadata.json");
const OUTPUT_PATH = path.join(FAST_DIR, "pc-km-segments.geojson");

const MONITORING_OVERVIEW =
  "Ihtiofaună, sturioni, habitate, migrație, hrănire, reproducere, iernare. Detalierea MON12–MON27 va fi adăugată ulterior.";

const PC_INTERVALS = [
  {
    pc_code: "PC1",
    name: "Gârla Mare",
    km_upstream: 839,
    km_downstream: 837,
    main_works: "dragaj șenal existent; depozitare material dragat.",
  },
  {
    pc_code: "PC2",
    name: "Salcia",
    km_upstream: 824,
    km_downstream: 820,
    main_works: "dragaj șenal existent; depozitare pe malul bulgăresc.",
  },
  {
    pc_code: "PC3",
    name: "Bogdan Secian",
    km_upstream: 786,
    km_downstream: 782,
    main_works: "dragaj șenal existent; depozitare amonte de insula Bogdan Secian.",
  },
  {
    pc_code: "PC4",
    name: "Dobrina",
    km_upstream: 762,
    km_downstream: 756,
    main_works: "dragaj șenal existent; două zone de depozitare.",
  },
  {
    pc_code: "PC5",
    name: "Bechet",
    km_upstream: 678,
    km_downstream: 673,
    main_works:
      "dragaj/realiniere șenal, chevron, epiuri, stabilizare mal, insulă artificială, depozitare material dragat.",
  },
  {
    pc_code: "PC6",
    name: "Corabia",
    km_upstream: 632,
    km_downstream: 626,
    main_works: "dragaj șenal existent și canal acces port Corabia; depozitare amonte de insula Baloiu.",
  },
  {
    pc_code: "PC7",
    name: "Belene",
    km_upstream: 577,
    km_downstream: 560,
    main_works:
      "dragaj/realiniere șenal, două chevroane, trei epiuri, stabilizare mal, depozitare material dragat.",
  },
  {
    pc_code: "PC8",
    name: "Vardim",
    km_upstream: 542,
    km_downstream: 539,
    main_works: "dragaj șenal existent; două zone de depozitare.",
  },
  {
    pc_code: "PC9",
    name: "Iantra",
    km_upstream: 537,
    km_downstream: 534,
    main_works: "dragaj șenal existent; depozitare lângă malul românesc.",
  },
  {
    pc_code: "PC10",
    name: "Batin",
    km_upstream: 530,
    km_downstream: 520,
    main_works: "dragaj șenal existent; depozitare lângă insula Batin.",
  },
  {
    pc_code: "PC11",
    name: "Kosui",
    km_upstream: 428,
    km_downstream: 423,
    main_works: "dragaj șenal existent; depozitare/extindere insulele Kosui și Malyk Kosui.",
  },
  {
    pc_code: "PC12",
    name: "Popina",
    km_upstream: 408,
    km_downstream: 401,
    main_works: "dragaj/realiniere șenal, trei epiuri, chevron, două zone de depozitare.",
  },
].map((item) => ({
  ...item,
  fish_monitoring_overview: MONITORING_OVERVIEW,
}));

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

function baseProperties(interval) {
  return {
    pc_code: interval.pc_code,
    name: interval.name,
    km_upstream: interval.km_upstream,
    km_downstream: interval.km_downstream,
    main_works: interval.main_works,
    fish_monitoring_overview: interval.fish_monitoring_overview,
    representation_type: "km interval representation",
    source_layer: "afdj-km.geojson",
    observations:
      "Reprezentare de interval km construită din puncte AFDJ existente; nu este poligon exact al punctului critic.",
  };
}

function buildPcKmSegments(afdjKm) {
  const byKm = new Map();

  for (const feature of afdjKm.features || []) {
    const km = feature?.properties?.wtwdis;
    const coordinates = feature?.geometry?.coordinates;
    if (
      !Number.isInteger(km) ||
      feature?.geometry?.type !== "Point" ||
      !Array.isArray(coordinates)
    ) {
      continue;
    }

    const group = byKm.get(km) || [];
    group.push(feature);
    byKm.set(km, group);
  }

  const features = [];
  const report = [];

  for (const interval of PC_INTERVALS) {
    const kmValues = [];
    for (let km = interval.km_upstream; km >= interval.km_downstream; km -= 1) {
      kmValues.push(km);
    }

    const missingKm = kmValues.filter((km) => !byKm.has(km));
    if (missingKm.length) {
      throw new Error(`${interval.pc_code} missing AFDJ km markers: ${missingKm.join(", ")}`);
    }

    const selectedKmCoordinates = kmValues.map((km) => ({
      km,
      coordinate: pickMedoidCoordinate(byKm.get(km)),
      candidate_count: byKm.get(km).length,
    }));
    const upstream = selectedKmCoordinates[0];
    const downstream = selectedKmCoordinates[selectedKmCoordinates.length - 1];

    features.push({
      type: "Feature",
      properties: {
        ...baseProperties(interval),
        geometry_role: "segment",
        source_km_values: kmValues,
      },
      geometry: {
        type: "LineString",
        coordinates: selectedKmCoordinates.map((item) => item.coordinate),
      },
    });

    features.push({
      type: "Feature",
      properties: {
        ...baseProperties(interval),
        geometry_role: "upstream_marker",
        km_value: upstream.km,
      },
      geometry: {
        type: "Point",
        coordinates: upstream.coordinate,
      },
    });

    features.push({
      type: "Feature",
      properties: {
        ...baseProperties(interval),
        geometry_role: "downstream_marker",
        km_value: downstream.km,
      },
      geometry: {
        type: "Point",
        coordinates: downstream.coordinate,
      },
    });

    report.push({
      pc_code: interval.pc_code,
      name: interval.name,
      km_upstream: interval.km_upstream,
      km_downstream: interval.km_downstream,
      selected_coordinates: selectedKmCoordinates,
    });
  }

  return {
    featureCollection: {
      type: "FeatureCollection",
      features,
    },
    report,
  };
}

function updateMetadata(metadata, featureCount) {
  return {
    ...metadata,
    layers: {
      ...metadata.layers,
      pc_km_segments: {
        file: "pc-km-segments.geojson",
        feature_count: featureCount,
        status: "generated_from_afdj_km_markers",
        geometry_note:
          "Km interval representation construită din puncte AFDJ existente; nu este poligon exact.",
      },
    },
    pc_intervals: PC_INTERVALS,
  };
}

const afdjKm = readJson(AFDJ_KM_PATH);
const metadata = readJson(METADATA_PATH);
const { featureCollection, report } = buildPcKmSegments(afdjKm);

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(featureCollection, null, 2)}\n`, "utf8");
fs.writeFileSync(
  METADATA_PATH,
  `${JSON.stringify(updateMetadata(metadata, featureCollection.features.length), null, 2)}\n`,
  "utf8"
);

console.log(`Wrote ${featureCollection.features.length} PC km segment features to ${OUTPUT_PATH}`);
for (const item of report) {
  console.log(
    `${item.pc_code} ${item.name}: km ${item.km_upstream}-${item.km_downstream} (${item.selected_coordinates.length} km anchors)`
  );
}
