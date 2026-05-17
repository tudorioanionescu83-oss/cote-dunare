const BASEMAP_OPTIONS = [
  { id: "map", label: "Hartă" },
  { id: "satellite", label: "Satelit" },
];

const OVERLAY_OPTIONS = [
  { id: "pcPlanningPolygons", label: "PC planning polygons" },
  { id: "pcKmSegments", label: "PC km segments" },
  { id: "pcPolygons", label: "PC polygons" },
  { id: "afdjKm", label: "Km AFDJ" },
  { id: "works", label: "Lucrări principale" },
  { id: "disposalZones", label: "Zone depozitare material dragat" },
  { id: "monitoringOverview", label: "Monitorizare ihtiofaună overview" },
];

export default function FastLayerControl({
  basemap,
  activeLayers,
  availability,
  onBasemapChange,
  onFitToFastSector,
  onToggleLayer,
}) {
  return (
    <div className="fast-layer-control">
      <div className="fast-layer-control__section">
        <div className="fast-layer-control__title">Fundal</div>
        <div className="fast-layer-control__basemaps">
          {BASEMAP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={basemap === option.id ? "is-active" : ""}
              onClick={() => onBasemapChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="fast-layer-control__fit" onClick={onFitToFastSector}>
        Fit to FAST sector
      </button>

      <div className="fast-layer-control__section">
        <div className="fast-layer-control__title">Layere</div>
        <div className="fast-layer-control__toggles">
          {OVERLAY_OPTIONS.map((option) => {
            const isAvailable = availability[option.id];
            const isActive = Boolean(activeLayers[option.id]);
            return (
              <label
                key={option.id}
                className={`${isAvailable ? "" : "is-unavailable"}${
                  isActive ? " is-active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => onToggleLayer(option.id)}
                  disabled={!isAvailable}
                />
                <span>
                  {option.label}
                  {!isAvailable ? " — not available as GIS layer" : ""}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
