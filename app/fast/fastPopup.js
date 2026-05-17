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
      <button type="button" class="fast-popup-detail-button" data-fast-pc-code="${displayValue(
        pcCode
      )}">Vezi detalii</button>
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
  const kmValue = properties.wtwdis ?? properties.WTWDIS ?? "—";
  const catdis = properties.catdis ?? properties.CATDIS ?? "—";

  return `
    <div class="fast-popup-content">
      <strong>Km AFDJ ${escapeHtml(kmValue)}</strong><br />
      <span>catdis: ${escapeHtml(catdis)}</span><br />
      <span>Sursă: AFDJ</span>
    </div>
  `;
}
