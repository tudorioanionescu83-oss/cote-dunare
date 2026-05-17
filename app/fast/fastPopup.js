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
  const kmRange =
    properties.km_upstream || properties.km_downstream
      ? `${displayValue(properties.km_upstream)} – ${displayValue(properties.km_downstream)}`
      : "Nedisponibil în sursa curentă";

  return `
    <div class="fast-popup-content">
      <strong>${displayValue(properties.pc_code || "Zonă PC")}</strong><br />
      <span>Denumire: ${displayValue(properties.name)}</span><br />
      <span>Km amonte–aval: ${kmRange}</span><br />
      <span>Lucrări principale: ${displayValue(properties.main_works)}</span><br />
      <span>Monitorizare overview: ${displayValue(properties.fish_monitoring_overview)}</span><br />
      <span>Tip reprezentare: ${displayValue(properties.representation_type)}</span><br />
      <span>Observație: ${displayValue(properties.observations)}</span><br />
      <span>Sursă: ${displayValue(properties.source)}</span>
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
