"use client";

import { useEffect, useRef, useState } from "react";

const BASEMAP_OPTIONS = [
  { id: "map", label: "Hartă" },
  { id: "satellite", label: "Satelit" },
];

const OVERLAY_OPTIONS = [
  { id: "pcPlanningPolygons", label: "PC planning polygons", kind: "GIS" },
  { id: "pcKmSegments", label: "PC km segments", kind: "GIS" },
  { id: "pcPolygons", label: "PC polygons", kind: "GIS" },
  { id: "afdjKm", label: "Km AFDJ", kind: "GIS" },
  { id: "works", label: "Lucrări principale", kind: "metadata" },
  { id: "disposalZones", label: "Zone depozitare material dragat", kind: "metadata" },
  { id: "monitoringOverview", label: "Monitorizare ihtiofaună overview", kind: "metadata" },
  { id: "monitoringSturgeons", label: "Monitorizare sturioni", kind: "metadata" },
];

const HABITAT_GROUPS = [
  {
    id: "fast2",
    title: "FAST 2 / DDNI km 863–375",
    countGroup: "fast2",
    options: [
      {
        id: "fast2Spawning",
        label: "Reproducere potențială",
        swatch: "spawning",
        countKey: "spawning_potential",
      },
      {
        id: "fast2Feeding",
        label: "Hrănire / juvenili",
        swatch: "feeding",
        countKey: "feeding_yoy",
      },
      {
        id: "fast2Wintering",
        label: "Iernare / refugiu",
        swatch: "wintering",
        countKey: "wintering_refuge",
      },
    ],
  },
  {
    id: "lower",
    title: "Dunărea Inferioară sub km 375",
    countGroup: "lowerDanube",
    options: [
      {
        id: "lowerConfirmedSpawning",
        label: "Reproducere confirmată",
        swatch: "confirmed",
        countKey: "confirmed_spawning",
      },
      {
        id: "lowerProtection",
        label: "Zone sensibile / protecție",
        swatch: "protection",
        countKey: "sensitive_protection",
      },
      {
        id: "lowerFeeding",
        label: "Hrănire / nursery",
        swatch: "feeding",
        countKey: "feeding_yoy",
      },
      {
        id: "lowerWintering",
        label: "Iernare / refugiu",
        swatch: "wintering",
        countKey: "wintering_refuge",
      },
    ],
  },
];

const HABITAT_OPTION_IDS = HABITAT_GROUPS.flatMap((group) =>
  group.options.map((option) => option.id)
);

export default function FastLayerControl({
  basemap,
  activeLayers,
  availability,
  habitatCounts,
  isPcDetailOpen,
  onBasemapChange,
  onFitToFastSector,
  onFitToHabitats,
  onHabitatControlOpen,
  onToggleLayer,
  onToggleAllHabitats,
}) {
  const [isMapControlOpen, setIsMapControlOpen] = useState(false);
  const [isHabitatControlOpen, setIsHabitatControlOpen] = useState(false);
  const mapTimerRef = useRef(null);
  const habitatTimerRef = useRef(null);
  const mapControlRef = useRef(null);
  const habitatControlRef = useRef(null);

  const selectableHabitatIds = HABITAT_OPTION_IDS.filter((id) => availability[id]);
  const allHabitatsActive =
    selectableHabitatIds.length > 0 &&
    selectableHabitatIds.every((id) => activeLayers[id]);
  const anyHabitatsActive = selectableHabitatIds.some((id) => activeLayers[id]);
  const habitatsAvailable = selectableHabitatIds.length > 0;

  function getAutoCloseDelay() {
    return typeof window !== "undefined" &&
      window.matchMedia("(max-width: 900px)").matches
      ? 2000
      : 3000;
  }

  function clearMapTimer() {
    if (mapTimerRef.current) {
      clearTimeout(mapTimerRef.current);
      mapTimerRef.current = null;
    }
  }

  function clearHabitatTimer() {
    if (habitatTimerRef.current) {
      clearTimeout(habitatTimerRef.current);
      habitatTimerRef.current = null;
    }
  }

  function scheduleMapClose() {
    clearMapTimer();
    mapTimerRef.current = setTimeout(
      () => setIsMapControlOpen(false),
      getAutoCloseDelay()
    );
  }

  function scheduleHabitatClose() {
    clearHabitatTimer();
    habitatTimerRef.current = setTimeout(
      () => setIsHabitatControlOpen(false),
      getAutoCloseDelay()
    );
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        isMapControlOpen &&
        mapControlRef.current &&
        !mapControlRef.current.contains(event.target)
      ) {
        setIsMapControlOpen(false);
      }
      if (
        isHabitatControlOpen &&
        habitatControlRef.current &&
        !habitatControlRef.current.contains(event.target)
      ) {
        setIsHabitatControlOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      clearMapTimer();
      clearHabitatTimer();
    };
  }, [isHabitatControlOpen, isMapControlOpen]);

  useEffect(() => {
    if (isPcDetailOpen) {
      setIsHabitatControlOpen(false);
    }
  }, [isPcDetailOpen]);

  function handleMapInteraction(callback) {
    callback?.();
    setIsHabitatControlOpen(false);
    setIsMapControlOpen(true);
    scheduleMapClose();
  }

  function handleHabitatInteraction(callback) {
    callback?.();
    setIsMapControlOpen(false);
    setIsHabitatControlOpen(true);
    onHabitatControlOpen?.();
    scheduleHabitatClose();
  }

  return (
    <>
      <div
        ref={mapControlRef}
        className={`fast-layer-control${isMapControlOpen ? " is-open" : ""}`}
        onPointerDown={scheduleMapClose}
      >
        <div className="fast-layer-control__toolbar">
          <div className="fast-layer-control__basemaps">
            {BASEMAP_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={basemap === option.id ? "is-active" : ""}
                onClick={() => handleMapInteraction(() => onBasemapChange(option.id))}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fast-layer-control__toggle"
            aria-expanded={isMapControlOpen}
            aria-label={isMapControlOpen ? "Ascunde controalele" : "Arată controalele"}
            onClick={() => {
              setIsHabitatControlOpen(false);
              setIsMapControlOpen((value) => {
                const next = !value;
                if (next) scheduleMapClose();
                return next;
              });
            }}
          >
            {isMapControlOpen ? "▴" : "▾"}
          </button>
        </div>

        <div
          className="fast-layer-control__drawer"
          onPointerDown={scheduleMapClose}
          onMouseEnter={clearMapTimer}
          onMouseLeave={scheduleMapClose}
        >
          <button
            type="button"
            className="fast-layer-control__fit"
            onClick={() => handleMapInteraction(onFitToFastSector)}
          >
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
                      onChange={() => handleMapInteraction(() => onToggleLayer(option.id))}
                      disabled={!isAvailable}
                    />
                    <span>
                      {option.label}
                      <em>{option.kind}</em>
                      {!isAvailable ? " · unavailable as GIS" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={habitatControlRef}
        className={`fast-habitat-control-shell${isHabitatControlOpen ? " is-open" : ""}`}
        onPointerDown={scheduleHabitatClose}
      >
        <button
          type="button"
          className={`fast-habitat-control__button${anyHabitatsActive ? " is-active" : ""}`}
          disabled={!habitatsAvailable}
          onClick={() => {
            setIsMapControlOpen(false);
            setIsHabitatControlOpen((value) => {
              const next = !value;
              if (next) {
                onHabitatControlOpen?.();
                scheduleHabitatClose();
              }
              return next;
            });
          }}
        >
          Habitate sturioni
        </button>

        {isHabitatControlOpen && (
          <section
            className="fast-habitat-control__panel"
            onPointerDown={scheduleHabitatClose}
            onMouseEnter={clearHabitatTimer}
            onMouseLeave={scheduleHabitatClose}
          >
            <button
              type="button"
              className="fast-habitat-control__close"
              onClick={() => setIsHabitatControlOpen(false)}
              aria-label="Închide"
            >
              ×
            </button>

            <label className={allHabitatsActive ? "is-active" : ""}>
              <input
                type="checkbox"
                checked={allHabitatsActive}
                disabled={!habitatsAvailable}
                onChange={() => handleHabitatInteraction(onToggleAllHabitats)}
              />
              <span>
                Toate habitatele
                <em>{habitatCounts.datasetTotal}</em>
              </span>
            </label>

            <div className="fast-habitat-control__stats">
              <span>Generated on map <strong>{habitatCounts.generatedTotal}</strong></span>
              <span>Skipped <strong>{habitatCounts.skippedTotal}</strong></span>
              <span>Manual review <strong>{habitatCounts.manualReviewTotal}</strong></span>
            </div>

            {HABITAT_GROUPS.map((group) => {
              const counts = habitatCounts[group.countGroup] || {};
              return (
                <div key={group.id} className="fast-habitat-control__group">
                  <div className="fast-habitat-control__group-title">
                    <strong>{group.title}</strong>
                    <em>{counts.total || 0}</em>
                  </div>
                  {group.options.map((option) => (
                    <label
                      key={option.id}
                      className={activeLayers[option.id] ? "is-active" : ""}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(activeLayers[option.id])}
                        disabled={!availability[option.id]}
                        onChange={() =>
                          handleHabitatInteraction(() => onToggleLayer(option.id))
                        }
                      />
                      <span>
                        <i className={`fast-habitat-swatch is-${option.swatch}`} />
                        {option.label}
                        <em>{counts[option.countKey] || 0}</em>
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}

            {habitatCounts.skippedTotal > 0 && (
              <p className="fast-habitat-control__note">
                {habitatCounts.skippedTotal} intrări sunt păstrate în dataset, dar nu sunt desenate
                din lipsă de geometrie dedicată pentru brațe.
              </p>
            )}

            <button
              type="button"
              className="fast-habitat-control__fit"
              disabled={!anyHabitatsActive}
              onClick={() => handleHabitatInteraction(onFitToHabitats)}
            >
              Zoom to habitats
            </button>
          </section>
        )}
      </div>
    </>
  );
}
