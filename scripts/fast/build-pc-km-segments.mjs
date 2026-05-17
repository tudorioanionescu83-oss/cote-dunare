import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FAST_DIR = path.join(ROOT, "public", "fast");
const AFDJ_KM_PATH = path.join(FAST_DIR, "afdj-km.geojson");
const METADATA_PATH = path.join(FAST_DIR, "metadata.json");
const OUTPUT_PATH = path.join(FAST_DIR, "pc-km-segments.geojson");

const MONITORING_OVERVIEW =
  "Pești Natura 2000, abundență pești, telemetrie sturioni, habitate de reproducere/hrănire/iernare și scrumbie de Dunăre.";
const MONITORING_NOTE =
  "Monitorizarea sturionilor se referă la întreg sectorul comun și la toate cele 12 puncte critice. Detalierea MON12–MON27 și fazele PIM/SM/STCM/LTCM vor fi adăugate ulterior.";
const MONITORING_SCOPE =
  "întreg sectorul comun și toate cele 12 puncte critice";
const MONITORING_PHASES = [
  {
    code: "PIM",
    label: "Pre-Intervention Monitoring",
    description: "monitorizare înainte de lucrări / baseline",
  },
  {
    code: "SM",
    label: "Surveillance Monitoring",
    description: "monitorizare în timpul execuției",
  },
  {
    code: "STCM",
    label: "Short-Term Compliance Monitoring",
    description: "monitorizare post-intervenție pe termen scurt",
  },
  {
    code: "LTCM",
    label: "Long-Term Compliance Monitoring",
    description: "monitorizare post-intervenție pe termen lung",
  },
];
const MONITORING_REQUIREMENTS = [
  {
    code: "MON12",
    title: "Habitate pești Natura 2000",
    object: "pierdere / afectare habitat",
    target: "sub 1% pierdere habitat",
    phases: ["PIM", "SM", "STCM"],
    category: "fish",
  },
  {
    code: "MON13",
    title: "Abundența peștilor",
    object: "listă specii, număr indivizi, abundență, clase de vârstă",
    note: "include zonele cu structuri noi: epiuri, chevroane, insule",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "fish",
  },
  {
    code: "MON21",
    title: "Structura habitatelor de reproducere și hrănire a sturionilor",
    object: "substrat, viteză apă, lățime canal, vegetație, bentos",
    result: "hartă anuală pe baza observațiilor",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "sturgeon",
  },
  {
    code: "MON22",
    title: "Sturioni în habitate de hrănire și iernare",
    object: "telemetrie pentru utilizarea habitatelor",
    method:
      "etichetare martie–mai pentru primăvară și septembrie–decembrie pentru iarnă; minimum 30 sturioni/an; urmărire activă sau staționară",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "sturgeon",
  },
  {
    code: "MON23",
    title: "Alte specii de pești prin telemetrie",
    object: "marcare prin telemetrie",
    method:
      "martie–aprilie pentru migrația de primăvară, septembrie–noiembrie pentru iernare; minimum 20 pești/specie/an",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "fish",
  },
  {
    code: "MON24",
    title: "Scrumbia de Dunăre / Alosa immaculata",
    object: "deplasare, migrație, dimensiune, greutate, vârstă, diversitate genetică",
    method: "prelevare în sezonul de migrație; probe de solzi pentru 50–100 indivizi",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "fish",
  },
  {
    code: "MON25",
    title: "Habitat reproducere sturioni",
    object: "utilizarea habitatului de depunere a pontei",
    method:
      "colectare ponte / puiet aval de zonele de depunere; conservare probe în etanol 99% pentru ADN",
    parameters: "specii de sturioni, abundență ponte / puiet",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "sturgeon",
  },
  {
    code: "MON26",
    title: "Habitat hrănire sturioni",
    object: "utilizarea habitatelor de hrănire",
    method:
      "capturare puiet de un an, măsurare, cântărire, etichetare, eliberare, probe ADN",
    parameters: "specii, lungime, greutate, diversitate genetică, hibrizi",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "sturgeon",
  },
  {
    code: "MON27",
    title: "Habitat iernare sturioni",
    object: "comportamentul sturionilor în habitatul de iernare",
    method: "receptor acustic mobil cu GPS, deplasare amonte–aval",
    phases: ["PIM", "SM", "STCM", "LTCM"],
    category: "sturgeon",
  },
];
const GENERAL_NOTE =
  "Soluții orientative din Caietul de sarcini / Studiul de fezabilitate; reprezentarea PC km segments și PC planning polygons este pentru orientare și nu reprezintă poligon tehnic final de execuție.";
const REPRESENTATION_OBSERVATION =
  "Reprezentare pe interval kilometric, nu poligon tehnic de execuție.";
const SOURCE_REFERENCE = "Caietul de sarcini / clarificări";

const COMMON_DREDGING_PROFILE = {
  dredging_depth: "3,5 m față de ENR",
  fairway_width: "180 m",
  slope: "1:5",
};

const PC_INTERVALS = [
  {
    pc_code: "PC1",
    name: "Gârla Mare",
    km_upstream: 839,
    km_downstream: 837,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 5,4 km",
    dredging_km_interval: "km 842 – km 835,5",
    estimated_dredging_volume: "aprox. 67.000 m³",
    disposal_zones: [
      "între km 840 – km 838,1",
      "aprox. 240 m de malul românesc",
      "amonte de insula Gârla Mare",
    ],
    works_summary: "dragaj șenal existent; depozitare material dragat.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC2",
    name: "Salcia",
    km_upstream: 824,
    km_downstream: 820,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 7,1 km",
    dredging_km_interval: "km 825,5 – km 818,8",
    estimated_dredging_volume: "aprox. 20.000 m³",
    disposal_zones: ["pe lângă malul bulgăresc", "între km 823,4 – km 822,0"],
    works_summary: "dragaj șenal existent; depozitare pe malul bulgăresc.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC3",
    name: "Bogdan Secian",
    km_upstream: 786,
    km_downstream: 782,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 5,2 km",
    dredging_km_interval: "km 786,1 – km 781",
    estimated_dredging_volume: "aprox. 73.000 m³",
    disposal_zones: ["imediat amonte de insula Bogdan Secian", "zona km 784,6"],
    works_summary: "dragaj șenal existent; depozitare amonte de insula Bogdan Secian.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC4",
    name: "Dobrina",
    km_upstream: 762,
    km_downstream: 756,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 8,7 km",
    dredging_km_interval: "km 764 – km 755,7",
    estimated_dredging_volume: "aprox. 177.000 m³",
    disposal_zones: [
      "zona 1: amonte de ostrovul Dobrina, între km 759,3 – km 758,5",
      "zona 2: nord de ostrovul Pietrosul, între km 762,2 – km 760,5",
    ],
    works_summary: "dragaj șenal existent; două zone de depozitare.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC5",
    name: "Bechet",
    km_upstream: 678,
    km_downstream: 673,
    dredging_type: "dragaj / realiniere șenal",
    dredging_length: "aprox. 7,4 km",
    dredging_km_interval: "km 678,8 – km 671,2",
    dredging_depth: null,
    fairway_width: null,
    slope: null,
    estimated_dredging_volume: "aprox. 472.000 m³",
    engineering_structures: [
      "1 chevron / dig în U în amonte de km 677",
      "3 epiuri pe malul românesc, între km 678 – km 677,4",
      "7 baterii × 5 epiuri scurte/pinteni pentru depunere de sedimente și golfuri/habitate de ape puțin adânci",
      "dig în U la capătul amonte al insulei",
    ],
    bank_stabilization: "aprox. 4,3 km, între km 678,2 – km 674",
    artificial_island: "insulă artificială cu capăt amonte aprox. km 673,6",
    disposal_zones: [
      "în spatele chevronului, între km 677 – km 675,6",
      "în șenalul inițial, între km 674,8 – km 673,9",
    ],
    technical_notes: [
      "punct critic cu intervenții hidrotehnice complexe",
      "materialul dragat poate contribui la formarea insulei artificiale",
    ],
    works_summary:
      "dragaj / realiniere șenal; chevron; epiuri; stabilizare mal; insulă artificială; depozitare material dragat.",
    work_badges: ["Dragaj", "Regularizare", "Structuri", "Stabilizare", "Insulă", "Depozitare"],
    monitoring_overview:
      "Pești Natura 2000, abundență pești, telemetrie sturioni, habitate de reproducere/hrănire/iernare și scrumbie de Dunăre; accent pe habitate, sturioni și efectul structurilor asupra ihtiofaunei.",
  },
  {
    pc_code: "PC6",
    name: "Corabia",
    km_upstream: 632,
    km_downstream: 626,
    dredging_type: "șenal existent și canal acces port Corabia",
    dredging_length: "șenal existent aprox. 8,2 km; canal acces port aprox. 2,2 km",
    dredging_km_interval: "km 633,5 – km 625",
    estimated_dredging_volume: "aprox. 565.000 m³ total; din care canal acces aprox. 265.000 m³",
    disposal_zones: [
      "amonte de insula/ostrovul Baloiu",
      "zona km 630 – km 629",
      "materialul poate fi transportat la Bechet pentru insula artificială",
    ],
    works_summary:
      "dragaj șenal existent și canal acces port Corabia; depozitare amonte de insula Baloiu.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC7",
    name: "Belene",
    km_upstream: 577,
    km_downstream: 560,
    dredging_type: "dragaj / realiniere șenal",
    dredging_length: "aprox. 21 km",
    dredging_km_interval: "realinieri principale km 569 – km 564 și km 561,5 – km 556,7",
    dredging_depth: null,
    fairway_width: null,
    slope: null,
    estimated_dredging_volume: "aprox. 1.460.000 m³",
    engineering_structures: [
      "2 chevroane / diguri în U între aprox. km 567,5 – km 565,8",
      "3 epiuri între km 568,5 – km 568",
    ],
    bank_stabilization: "aprox. 1.153 m, între km 569,9 – km 568,5",
    disposal_zones: [
      "paralel cu șenalul realiniat, pe traseul șenalului existent",
      "între km 561,2 – km 560",
      "parte din material poate fi folosită pentru insula Bechet",
    ],
    works_summary:
      "dragaj / realiniere șenal; două chevroane; trei epiuri; stabilizare mal; depozitare material dragat.",
    work_badges: ["Dragaj", "Regularizare", "Structuri", "Stabilizare", "Depozitare"],
  },
  {
    pc_code: "PC8",
    name: "Vardim",
    km_upstream: 542,
    km_downstream: 539,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 10,5 km",
    dredging_km_interval: "km 546,7 – km 538",
    estimated_dredging_volume: "aprox. 382.000 m³",
    disposal_zones: [
      "zone asociate ostroavelor Stariat Dab și Gasca",
      "extindere ostrov Gasca spre amonte până la km 541",
    ],
    technical_notes: ["formularea exactă pentru zonele de depozitare trebuie confirmată în textul sursă"],
    works_summary: "dragaj șenal existent; două zone de depozitare.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC9",
    name: "Iantra",
    km_upstream: 537,
    km_downstream: 534,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 4,5 km",
    dredging_km_interval: "km 538 – km 533,8",
    estimated_dredging_volume: "aprox. 35.000 m³",
    disposal_zones: ["lângă malul românesc", "între km 537,8 – km 536,9"],
    works_summary: "dragaj șenal existent; depozitare lângă malul românesc.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC10",
    name: "Batin",
    km_upstream: 530,
    km_downstream: 520,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 13 km",
    dredging_km_interval: "km 533,8 – km 520,8",
    estimated_dredging_volume: "aprox. 162.000 m³",
    disposal_zones: [
      "de-a lungul malului nordic/stâng al ostrovului Batin",
      "aprox. între km 530,4 – km 529,4",
    ],
    works_summary: "dragaj șenal existent; depozitare lângă insula Batin.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC11",
    name: "Kosui",
    km_upstream: 428,
    km_downstream: 423,
    dredging_type: "șenal existent",
    dredging_length: "aprox. 9,1 km",
    dredging_km_interval: "km 428,5 – km 419,8",
    estimated_dredging_volume: "aprox. 85.000 m³",
    disposal_zones: [
      "extindere ostrov Kosui la capătul amonte, între km 428,3 – km 426,9",
      "extindere ostrov Malyk Kosui, între km 425 – km 422,3",
    ],
    works_summary: "dragaj șenal existent; depozitare/extindere insulele Kosui și Malyk Kosui.",
    work_badges: ["Dragaj", "Depozitare"],
  },
  {
    pc_code: "PC12",
    name: "Popina",
    km_upstream: 408,
    km_downstream: 401,
    dredging_type: "șenal existent + șenal realiniat",
    dredging_length: "aprox. 7,6 km",
    dredging_km_interval: "șenal existent km 409 – km 407,5; șenal realiniat km 407,5 – km 401",
    dredging_depth: null,
    fairway_width: null,
    slope: null,
    estimated_dredging_volume: "aprox. 752.000 m³",
    engineering_structures: [
      "3 epiuri pe malul românesc, între km 407,6 – km 406,5",
      "1 chevron / dig în U în amonte de km 405",
      "coronament structuri: ENR + 1 m",
      "lățime coronament: 3 m",
    ],
    disposal_zones: [
      "zona 1 la nord/sud de insula Popina: km 406,2 – km 402,6",
      "zona 2 la nord/sud de insula Popina: km 404,5 – km 403,5",
    ],
    works_summary:
      "dragaj / realiniere șenal; trei epiuri; chevron; două zone de depozitare.",
    work_badges: ["Dragaj", "Regularizare", "Structuri", "Depozitare"],
  },
].map((item) => ({
  dredging_depth: COMMON_DREDGING_PROFILE.dredging_depth,
  fairway_width: COMMON_DREDGING_PROFILE.fairway_width,
  slope: COMMON_DREDGING_PROFILE.slope,
  engineering_structures: [],
  bank_stabilization: null,
  artificial_island: null,
  disposal_zones: [],
  technical_notes: [],
  representation_type: "km interval representation",
  monitoring_overview: MONITORING_OVERVIEW,
  monitoring_note: MONITORING_NOTE,
  monitoring_scope: MONITORING_SCOPE,
  monitoring_phases: MONITORING_PHASES,
  monitoring_requirements: MONITORING_REQUIREMENTS,
  observations: REPRESENTATION_OBSERVATION,
  source_note: SOURCE_REFERENCE,
  ...item,
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

function toFeatureProperties(interval) {
  return {
    pc_code: interval.pc_code,
    name: interval.name,
    km_upstream: interval.km_upstream,
    km_downstream: interval.km_downstream,
    km_interval: `km ${interval.km_upstream} – ${interval.km_downstream}`,
    works_summary: interval.works_summary,
    monitoring_overview: interval.monitoring_overview,
    representation_type: interval.representation_type,
    source: interval.source_note,
    source_layer: "afdj-km.geojson",
    observations: interval.observations,
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
        ...toFeatureProperties(interval),
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
        ...toFeatureProperties(interval),
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
        ...toFeatureProperties(interval),
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
      pc_zones: {
        ...metadata.layers?.pc_zones,
        note:
          "Sursele KMZ conțin geometrii exacte, dar nu conțin atribute descriptive FAST suficiente pentru cod, denumire sau lucrări.",
      },
      pc_km_segments: {
        file: "pc-km-segments.geojson",
        feature_count: featureCount,
        status: "generated_from_afdj_km_markers",
        geometry_note:
          "Km interval representation construită din puncte AFDJ existente; nu este poligon exact.",
      },
    },
    monitoring_overview: {
      summary: MONITORING_OVERVIEW,
      scope: MONITORING_SCOPE,
      note: MONITORING_NOTE,
      phases: MONITORING_PHASES,
      requirements: MONITORING_REQUIREMENTS,
    },
    general_note: GENERAL_NOTE,
    source_reference: SOURCE_REFERENCE,
    pc_intervals: PC_INTERVALS,
    unclassified_sources: (metadata.unclassified_sources || []).map((item) =>
      item.file === "source/waterskmz_v1_10.kmz"
        ? {
            ...item,
            reason:
              "Conține NetworkLink-uri și imagini externe, nu geometrii vectoriale FAST utilizabile direct în preview.",
          }
        : item
    ),
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
