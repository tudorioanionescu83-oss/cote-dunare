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

const HABITAT_OPTIONS = [
  {
    id: "sturgeonSpawning",
    label: "Reproducere potențială",
    swatch: "spawning",
    countKey: "spawning_potential",
  },
  {
    id: "sturgeonConfirmedSpawning",
    label: "Reproducere confirmată",
    swatch: "confirmed",
    countKey: "confirmed_spawning",
  },
  {
    id: "sturgeonFeeding",
    label: "Hrănire / juvenili / nursery",
    swatch: "feeding",
    countKey: "feeding_yoy",
  },
  {
    id: "sturgeonWintering",
    label: "Iernare / refugiu",
    swatch: "wintering",
    countKey: "wintering_refuge",
  },
  {
    id: "sturgeonProtection",
    label: "Zone sensibile / protecție",
    swatch: "protection",
    countKey: "sensitive_protection",
  },
];

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
  onEnableAllHabitats,
  onToggleLayer,
  onToggleAllHabitats,
}) {
  const [isMapControlOpen, setIsMapControlOpen] = useState(false);
  const [isHabitatControlOpen, setIsHabitatControlOpen] = useState(false);
  const mapTimerRef = useRef(null);
  const habitatTimerRef = useRef(null);
  const mapControlRef = useRef(null);
  const habitatControlRef = useRef(null);

  const selectableHabitatIds = HABITAT_OPTIONS.map((option) => option.id).filter(
    (id) => availability[id]
  );
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

  useEffect(() => {
    if (isHabitatControlOpen && habitatsAvailable && !anyHabitatsActive) {
      onEnableAllHabitats?.();
    }
  }, [anyHabitatsActive, habitatsAvailable, isHabitatControlOpen, onEnableAllHabitats]);

  function handleMapInteraction(callback) {
    callback?.();
    setIsHabitatControlOpen(false);
    setIsMapControlOpen(true);
    scheduleMapClose();
  }

  function openHabitatControl() {
    if (!anyHabitatsActive) {
      onEnableAllHabitats?.();
    }
    setIsMapControlOpen(false);
    setIsHabitatControlOpen(true);
    onHabitatControlOpen?.();
    scheduleHabitatClose();
  }

  function handleHabitatInteraction(callback) {
    callback?.();
    setIsMapControlOpen(false);
    setIsHabitatControlOpen(true);
    onHabitatControlOpen?.();
    scheduleHabitatClose();
  }

  function getCountLabel(countKey) {
    const generated = habitatCounts.generatedByType?.[countKey] || 0;
    const dataset = habitatCounts.datasetByType?.[countKey] || generated;
    return dataset > generated ? `${generated}/${dataset}` : generated;
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
          onClick={() => {
            if (isHabitatControlOpen) {
              setIsHabitatControlOpen(false);
              return;
            }
            openHabitatControl();
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

            <div className="fast-habitat-control__summary">
              <strong>{habitatCounts.generatedTotal}</strong>
              <span>zone afișabile pe hartă</span>
              {habitatCounts.skippedTotal > 0 && (
                <em>{habitatCounts.skippedTotal} în dataset fără geometrie de braț</em>
              )}
            </div>

            <label className={allHabitatsActive ? "is-active" : ""}>
              <input
                type="checkbox"
                checked={allHabitatsActive}
                disabled={!habitatsAvailable}
                onChange={() => handleHabitatInteraction(onToggleAllHabitats)}
              />
              <span>
                Toate habitatele afișabile
                <em>{habitatCounts.generatedTotal}</em>
              </span>
            </label>

            <div className="fast-habitat-control__options">
              {HABITAT_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={activeLayers[option.id] ? "is-active" : ""}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(activeLayers[option.id])}
                    disabled={!availability[option.id]}
                    onChange={() => handleHabitatInteraction(() => onToggleLayer(option.id))}
                  />
                  <span>
                    <i className={`fast-habitat-swatch is-${option.swatch}`} />
                    {option.label}
                    <em>{getCountLabel(option.countKey)}</em>
                  </span>
                </label>
              ))}
            </div>

            {habitatCounts.skippedTotal > 0 && (
              <p className="fast-habitat-control__note">
                Unele intrări nu sunt desenate fiindcă lipsesc repere AFDJ suficiente pentru o
                geometrie corectă.
              </p>
            )}

            <button
              type="button"
              className="fast-habitat-control__fit"
              disabled={!anyHabitatsActive}
              onClick={() => handleHabitatInteraction(onFitToHabitats)}
            >
              Zoom la habitate
            </button>
          </section>
        )}
      </div>
    </>
  );
}
