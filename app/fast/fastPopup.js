import { getLocalizedValue, t, translateFastValue } from "./fastI18n";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(value, language) {
  if (value === null || value === undefined || value === "") {
    return t("popupMissingValue", language);
  }
  return escapeHtml(translateFastValue(value, language));
}

const PC_NAMES_BY_CODE = {
  PC1: "Gârla Mare",
  PC2: "Salcia",
  PC3: "Bogdan Secian",
  PC4: "Dobrina",
  PC5: "Bechet",
  PC6: "Corabia",
  PC7: "Belene",
  PC8: "Vardim",
  PC9: "Iantra",
  PC10: "Batin",
  PC11: "Kosui",
  PC12: "Popina",
};

const ECOLOGICAL_INDICATIONS = {
  "zonă adâncă / habitat de iernare": {
    ro: "zonă adâncă, favorabilă pentru iernare",
    en: "deep area, suitable for wintering",
  },
};

function formatPopupNumber(value, language) {
  if (!Number.isFinite(Number(value))) return displayValue(value, language);
  return new Intl.NumberFormat(language === "ro" ? "ro-RO" : "en-US", {
    maximumFractionDigits: 1,
  }).format(Number(value));
}

function formatHabitatSector(properties, language) {
  if (properties.mm_start !== undefined) {
    return `Mm ${formatPopupNumber(properties.mm_start, language)}–${formatPopupNumber(
      properties.mm_end,
      language
    )}`;
  }

  return `km ${formatPopupNumber(properties.rkm_start, language)}–${formatPopupNumber(
    properties.rkm_end,
    language
  )}`;
}

function formatHabitatType(properties, language) {
  if (
    properties.habitat_type === "feeding_yoy" &&
    String(properties.label_ro || "").toLowerCase().includes("nursery")
  ) {
    return t("feedingNursery", language);
  }

  const habitatTypeByCode = {
    spawning_potential: "potentialSpawning",
    confirmed_spawning: "confirmedSpawning",
    feeding_yoy: "feedingJuveniles",
    wintering_refuge: "winteringRefuge",
    sensitive_protection: "sensitiveProtectionArea",
  };

  return t(habitatTypeByCode[properties.habitat_type] || "sensitiveHabitat", language);
}

function formatHabitatName(properties, language, sector) {
  const localizedName = getLocalizedValue(properties, "name", language);
  if (localizedName) {
    if (language === "en") {
      return localizedName
        .replace(/^Brațul ([^–]+?) km /, "$1 Branch km ")
        .replace(/^Brațul ([^–]+?) – /, "$1 Branch – ")
        .replace(/^Dunăre\b/, "Danube");
    }
    return localizedName;
  }

  return `${language === "en" ? "Danube" : "Dunăre"} ${sector}`;
}

function formatBranchOrBank(properties, language) {
  if (properties.branch) return properties.branch;
  if (properties.bank_side_ro) return getLocalizedValue(properties, "bank_side", language);
  return t("unavailableCurrentSource", language);
}

function formatEcologicalIndication(properties, language) {
  const mappedValue = ECOLOGICAL_INDICATIONS[properties.substrate_ro]?.[language];
  return (
    mappedValue ||
    getLocalizedValue(properties, "substrate", language) ||
    t("unavailableCurrentSource", language)
  );
}

function formatScientificBasis(properties, language) {
  const source = String(properties.source || "");
  const evidence = String(properties.evidence_ro || "");

  if (source.includes("Honț")) return t("hontDdniBasis", language);
  if (evidence.includes("DDNI") || evidence.includes("batimetrie 3D")) {
    return t("ddniHabitatAssessment", language);
  }
  if (properties.dataset_group === "lower_danube_below_375") {
    return t("internalSturgeonDataset", language);
  }
  return t("supportingDataPreliminaryAssessment", language);
}

function formatConfidence(properties, language) {
  const confidence = String(properties.confidence_ro || "").toLowerCase();

  if (confidence.includes("foarte ridic")) return t("veryHighConfidence", language);
  if (confidence.includes("ridicat")) return t("highConfidence", language);
  if (confidence.includes("scăzut")) return t("lowConfidence", language);
  if (confidence.includes("mediu")) return t("mediumConfidence", language);
  if (confidence.includes("evaluare preliminar")) return t("mediumConfidence", language);

  return t("popupMissingValue", language);
}

function formatFastRelation(properties, language) {
  const relatedFastPc = Array.isArray(properties.related_fast_pc)
    ? properties.related_fast_pc
    : properties.related_fast_pc
      ? [properties.related_fast_pc]
      : [];

  if (!relatedFastPc.length) return t("unavailableCurrentSource", language);

  return relatedFastPc
    .map((pcCode) => `${pcCode}${PC_NAMES_BY_CODE[pcCode] ? ` ${PC_NAMES_BY_CODE[pcCode]}` : ""}`)
    .join(", ");
}

export function buildPcPopup(feature, language = "en") {
  const properties = feature?.properties || {};
  const pcCode = properties.pc_code || "Zonă PC";
  const kmInterval =
    properties.km_interval ||
    `${displayValue(properties.km_upstream, language)} – ${displayValue(
      properties.km_downstream,
      language
    )}`;
  const representationNote = properties.disclaimer || properties.observations;

  return `
    <div class="fast-popup-content">
      <strong>${displayValue(pcCode, language)} · ${displayValue(
        properties.name,
        language
      )}</strong><br />
      <span>${t("kmInterval", language)}: ${displayValue(kmInterval, language)}</span><br />
      <span>${t("representationType", language)}: ${displayValue(
        getLocalizedValue(properties, "representation_type", language),
        language
      )}</span><br />
      <span>${t("mainWorks", language)}: ${displayValue(
        getLocalizedValue(properties, "works_summary", language),
        language
      )}</span><br />
      <span>${t("monitoringOverview", language)}: ${displayValue(
        getLocalizedValue(properties, "monitoring_overview", language),
        language
      )}</span><br />
      <span>${t("observation", language)}: ${displayValue(
        translateFastValue(representationNote, language),
        language
      )}</span><br />
      <span class="fast-popup-detail-note">${t("detailsBelow", language)}</span>
    </div>
  `;
}

export function buildPcPolygonPopup(feature, language = "en") {
  const properties = feature?.properties || {};
  const sourceFiles = Array.isArray(properties.source_files)
    ? properties.source_files.join(", ")
    : properties.source_files;
  const sourceNames = Array.isArray(properties.source_names)
    ? properties.source_names.join(", ")
    : properties.source_names;

  return `
    <div class="fast-popup-content">
      <strong>${t("sourcePolygon", language)}</strong><br />
      <span>${t("sourceName", language)}: ${displayValue(
        properties.name || sourceNames,
        language
      )}</span><br />
      <span>${t("sourceFiles", language)}: ${displayValue(sourceFiles, language)}</span><br />
      <span>${t("observation", language)}: ${t("sourcePolygonNote", language)}</span>
    </div>
  `;
}

export function buildKmPopup(feature, language = "en") {
  const properties = feature?.properties || {};
  const distanceValue = properties.wtwdis ?? properties.WTWDIS ?? "-";
  const catdis = properties.catdis ?? properties.CATDIS ?? "-";
  const isHectometric =
    Number(catdis) === 3 &&
    Number.isInteger(Number(distanceValue)) &&
    Number(distanceValue) >= 1 &&
    Number(distanceValue) <= 9;
  const coordinates = feature?.geometry?.coordinates || [];
  const isMaritime =
    Array.isArray(coordinates) &&
    Number(coordinates[1]) >= 45.15 &&
    (Number(coordinates[0]) >= 28.15 || Number(coordinates[1]) >= 45.4) &&
    Number(distanceValue) >= 0 &&
    Number(distanceValue) <= 80;
  const distancePrefix = isMaritime ? "Mm" : "Km AFDJ";

  return `
    <div class="fast-popup-content">
      <strong>${
        isHectometric
          ? `${t("hectometricMarker", language)} +${escapeHtml(distanceValue)}00 m`
          : `${distancePrefix} ${escapeHtml(distanceValue)}`
      }</strong><br />
      <span>catdis: ${escapeHtml(catdis)}</span><br />
      <span>${t("source", language)}: AFDJ</span>
    </div>
  `;
}

export function buildSturgeonHabitatPopup(feature, language = "en") {
  const properties = feature?.properties || {};
  const sector = formatHabitatSector(properties, language);
  const activeType = formatHabitatType(properties, language);
  const name = formatHabitatName(properties, language, sector);
  const bankOrBranch = formatBranchOrBank(properties, language);
  const ecologicalIndication = formatEcologicalIndication(properties, language);
  const scientificBasis = formatScientificBasis(properties, language);
  const confidence = formatConfidence(properties, language);
  const fastRelation = formatFastRelation(properties, language);

  return `
    <div class="fast-popup-content fast-habitat-popup-content">
      <strong>${displayValue(name, language)}</strong><br />
      <span>${t("habitatType", language)}: ${displayValue(activeType, language)}</span><br />
      <span>${t("sector", language)}: ${sector}</span><br />
      <span>${t("branchBank", language)}: ${displayValue(bankOrBranch, language)}</span><br />
      <span>${t("ecologicalIndication", language)}: ${displayValue(
        ecologicalIndication,
        language
      )}</span><br />
      <span>${t("scientificBasis", language)}: ${displayValue(scientificBasis, language)}</span><br />
      <span>${t("confidence", language)}: ${displayValue(confidence, language)}</span><br />
      <span>${t("fastRelation", language)}: ${displayValue(fastRelation, language)}</span>
      <div class="fast-habitat-popup-types">
        <strong>${t("possibleHabitats", language)}</strong>
        <span class="${properties.habitat_type === "spawning_potential" ? "is-active" : ""}">${t(
          "potentialSpawning",
          language
        )}</span>
        <span class="${properties.habitat_type === "confirmed_spawning" ? "is-active" : ""}">${t(
          "confirmedSpawning",
          language
        )}</span>
        <span class="${properties.habitat_type === "feeding_yoy" ? "is-active" : ""}">${t(
          "feedingJuveniles",
          language
        )}</span>
        <span class="${properties.habitat_type === "wintering_refuge" ? "is-active" : ""}">${t(
          "winteringRefuge",
          language
        )}</span>
        <span class="${properties.habitat_type === "sensitive_protection" ? "is-active" : ""}">${t(
          "sensitiveProtectionArea",
          language
        )}</span>
      </div>
    </div>
  `;
}
