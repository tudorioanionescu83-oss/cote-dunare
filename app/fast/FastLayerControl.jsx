const BASEMAP_OPTIONS = [
  { id: "map", label: "Hartă" },
  { id: "satellite", label: "Satelit" },
];

const OVERLAY_OPTIONS = [
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

      <div className="fast-layer-control__section">
        <div className="fast-layer-control__title">Layere</div>
        <div className="fast-layer-control__toggles">
          {OVERLAY_OPTIONS.map((option) => {
            const isAvailable = availability[option.id];
            return (
              <label
                key={option.id}
                className={isAvailable ? "" : "is-unavailable"}
              >
                <input
                  type="checkbox"
                  checked={activeLayers[option.id]}
                  onChange={() => onToggleLayer(option.id)}
                  disabled={!isAvailable}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
