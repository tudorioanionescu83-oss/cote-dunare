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
  const relatedFastPc = Array.isArray(properties.related_fast_pc)
    ? properties.related_fast_pc.join(", ")
    : properties.related_fast_pc;
  const activeType = getLocalizedValue(properties, "label", language) || t("sensitiveHabitat", language);
  const sector = properties.mm_start !== undefined
    ? `Mm ${displayValue(properties.mm_start, language)}–${displayValue(
        properties.mm_end,
        language
      )}`
    : `${language === "en" ? "Danube" : "Dunăre"} km ${displayValue(
        properties.rkm_start,
        language
      )}–${displayValue(
        properties.rkm_end,
        language
      )}`;
  const bankOrBranch =
    properties.branch ||
    getLocalizedValue(properties, "bank_side", language) ||
    t("popupMissingValue", language);
  const name =
    getLocalizedValue(properties, "name", language) ||
    properties.location_name ||
    properties.id ||
    t("popupMissingValue", language);

  return `
    <div class="fast-popup-content fast-habitat-popup-content">
      <strong>${displayValue(name, language)}</strong><br />
      <span>${t("type", language)}: ${displayValue(activeType, language)}</span><br />
      <span>${t("originalPosition", language)}: ${displayValue(
        properties.original_position,
        language
      )}</span><br />
      <span>Sector: ${sector}</span><br />
      <span>${t("bankBranch", language)}: ${displayValue(bankOrBranch, language)}</span><br />
      <span>${t("substrateEcology", language)}: ${displayValue(
        getLocalizedValue(properties, "substrate", language),
        language
      )}</span><br />
      <span>${t("evidence", language)}: ${displayValue(
        getLocalizedValue(properties, "evidence", language),
        language
      )}</span><br />
      <span>${t("confidence", language)}: ${displayValue(
        getLocalizedValue(properties, "confidence", language),
        language
      )}</span><br />
      <span>${t("fastRelation", language)}: ${displayValue(relatedFastPc, language)}</span><br />
      <span>${t("manualReviewRequired", language)}: ${displayValue(
        properties.needs_manual_review ? t("yes", language) : t("no", language),
        language
      )}</span><br />
      <span>${t("geometryMethod", language)}: ${displayValue(
        properties.geometry_method,
        language
      )}</span><br />
      <span>${t("popupPriority", language)}: ${displayValue(
        getLocalizedValue(properties, "popup_priority", language),
        language
      )}</span>
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
