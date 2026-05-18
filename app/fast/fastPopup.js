function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Nedisponibil în sursa curentă";
  }
  return escapeHtml(value);
}

export function buildPcPopup(feature) {
  const properties = feature?.properties || {};
  const pcCode = properties.pc_code || "Zonă PC";
  const kmInterval =
    properties.km_interval ||
    `${displayValue(properties.km_upstream)} – ${displayValue(properties.km_downstream)}`;
  const representationNote = properties.disclaimer || properties.observations;

  return `
    <div class="fast-popup-content">
      <strong>${displayValue(pcCode)} · ${displayValue(properties.name)}</strong><br />
      <span>Km interval: ${displayValue(kmInterval)}</span><br />
      <span>Tip reprezentare: ${displayValue(properties.representation_type)}</span><br />
      <span>Lucrări principale: ${displayValue(properties.works_summary)}</span><br />
      <span>Monitorizare overview: ${displayValue(properties.monitoring_overview)}</span><br />
      <span>Observație: ${displayValue(representationNote)}</span><br />
      <span class="fast-popup-detail-note">Detalii mai jos</span>
    </div>
  `;
}

export function buildPcPolygonPopup(feature) {
  const properties = feature?.properties || {};
  const sourceFiles = Array.isArray(properties.source_files)
    ? properties.source_files.join(", ")
    : properties.source_files;
  const sourceNames = Array.isArray(properties.source_names)
    ? properties.source_names.join(", ")
    : properties.source_names;

  return `
    <div class="fast-popup-content">
      <strong>Source polygon</strong><br />
      <span>Nume sursă: ${displayValue(properties.name || sourceNames)}</span><br />
      <span>Fișiere sursă: ${displayValue(sourceFiles)}</span><br />
      <span>Observație: sursa disponibilă nu conține toate metadatele FAST pentru acest poligon.</span>
    </div>
  `;
}

export function buildKmPopup(feature) {
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
          ? `Marcaj 100 m AFDJ +${escapeHtml(distanceValue)}00 m`
          : `${distancePrefix} ${escapeHtml(distanceValue)}`
      }</strong><br />
      <span>catdis: ${escapeHtml(catdis)}</span><br />
      <span>Sursă: AFDJ</span>
    </div>
  `;
}

export function buildSturgeonHabitatPopup(feature) {
  const properties = feature?.properties || {};
  const relatedFastPc = Array.isArray(properties.related_fast_pc)
    ? properties.related_fast_pc.join(", ")
    : properties.related_fast_pc;
  const activeType = properties.label_ro || "Habitat sensibil";
  const sector = properties.mm_start !== undefined
    ? `Mm ${displayValue(properties.mm_start)}–${displayValue(properties.mm_end)}`
    : `Dunăre km ${displayValue(properties.rkm_start)}–${displayValue(properties.rkm_end)}`;
  const bankOrBranch =
    properties.branch ||
    properties.bank_side_ro ||
    properties.bank_side ||
    "Nedisponibil în sursa curentă";
  const name =
    properties.name_ro ||
    properties.location_name ||
    properties.id ||
    "Nedisponibil în sursa curentă";

  return `
    <div class="fast-popup-content fast-habitat-popup-content">
      <strong>${displayValue(name)}</strong><br />
      <span>Tip: ${displayValue(activeType)}</span><br />
      <span>Poziție originală: ${displayValue(properties.original_position)}</span><br />
      <span>Sector: ${sector}</span><br />
      <span>Mal / braț: ${displayValue(bankOrBranch)}</span><br />
      <span>Substrat / indiciu ecologic: ${displayValue(properties.substrate_ro)}</span><br />
      <span>Evidence: ${displayValue(properties.evidence_ro)}</span><br />
      <span>Confidence: ${displayValue(properties.confidence_ro)}</span><br />
      <span>Relație FAST 2: ${displayValue(relatedFastPc)}</span><br />
      <span>Needs manual review: ${displayValue(
        properties.needs_manual_review ? "da" : "nu"
      )}</span><br />
      <span>Metodă geometrie: ${displayValue(properties.geometry_method)}</span><br />
      <span>Prioritate popup: ${displayValue(properties.popup_priority)}</span>
      <div class="fast-habitat-popup-types">
        <strong>Posibile habitate</strong>
        <span class="${properties.habitat_type === "spawning_potential" ? "is-active" : ""}">Reproducere potențială</span>
        <span class="${properties.habitat_type === "confirmed_spawning" ? "is-active" : ""}">Reproducere confirmată</span>
        <span class="${properties.habitat_type === "feeding_yoy" ? "is-active" : ""}">Hrănire / juvenili</span>
        <span class="${properties.habitat_type === "wintering_refuge" ? "is-active" : ""}">Iernare / refugiu</span>
        <span class="${properties.habitat_type === "sensitive_protection" ? "is-active" : ""}">Zonă sensibilă / protecție</span>
      </div>
    </div>
  `;
}
