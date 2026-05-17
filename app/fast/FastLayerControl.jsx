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
  { id: "sturgeonSpawning", label: "Reproducere potențială", swatch: "spawning" },
  { id: "sturgeonFeeding", label: "Hrănire / juvenili", swatch: "feeding" },
  { id: "sturgeonWintering", label: "Iernare / refugiu", swatch: "wintering" },
];

export default function FastLayerControl({
  basemap,
  activeLayers,
  availability,
  isPcDetailOpen,
  onBasemapChange,
  onFitToFastSector,
  onToggleLayer,
  onToggleAllHabitats,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHabitatPanelOpen, setIsHabitatPanelOpen] = useState(false);
  const timerRef = useRef(null);
  const habitatTimerRef = useRef(null);
  const habitatPanelRef = useRef(null);

  const allHabitatsActive =
    activeLayers.sturgeonSpawning &&
    activeLayers.sturgeonFeeding &&
    activeLayers.sturgeonWintering;
  const anyHabitatsActive =
    activeLayers.sturgeonSpawning ||
    activeLayers.sturgeonFeeding ||
    activeLayers.sturgeonWintering;
  const habitatsAvailable =
    availability.sturgeonSpawning ||
    availability.sturgeonFeeding ||
    availability.sturgeonWintering;

  function clearCloseTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearHabitatTimer() {
    if (habitatTimerRef.current) {
      clearTimeout(habitatTimerRef.current);
      habitatTimerRef.current = null;
    }
  }

  function getAutoCloseDelay() {
    return typeof window !== "undefined" &&
      window.matchMedia("(max-width: 900px)").matches
      ? 2000
      : 3200;
  }

  function scheduleClose() {
    clearCloseTimer();
    timerRef.current = setTimeout(() => setIsOpen(false), getAutoCloseDelay());
  }

  function scheduleHabitatClose() {
    clearHabitatTimer();
    habitatTimerRef.current = setTimeout(
      () => setIsHabitatPanelOpen(false),
      getAutoCloseDelay()
    );
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        isHabitatPanelOpen &&
        habitatPanelRef.current &&
        !habitatPanelRef.current.contains(event.target)
      ) {
        setIsHabitatPanelOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      clearCloseTimer();
      clearHabitatTimer();
    };
  }, [isHabitatPanelOpen]);

  useEffect(() => {
    if (isPcDetailOpen) {
      setIsHabitatPanelOpen(false);
    }
  }, [isPcDetailOpen]);

  function handleInteraction(callback) {
    callback?.();
    setIsOpen(true);
    scheduleClose();
  }

  function handleHabitatInteraction(callback) {
    callback?.();
    setIsHabitatPanelOpen(true);
    scheduleHabitatClose();
  }

  return (
    <div
      className={`fast-layer-control${isOpen ? " is-open" : ""}`}
      onMouseEnter={() => {
        clearCloseTimer();
        setIsOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onTouchStart={() => handleInteraction()}
    >
      <div className="fast-layer-control__toolbar">
        <div className="fast-layer-control__basemaps">
          {BASEMAP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={basemap === option.id ? "is-active" : ""}
              onClick={() => handleInteraction(() => onBasemapChange(option.id))}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="fast-habitat-control" ref={habitatPanelRef}>
          <button
            type="button"
            className={`fast-habitat-control__button${
              anyHabitatsActive ? " is-active" : ""
            }`}
            disabled={!habitatsAvailable}
            onClick={() => {
              setIsHabitatPanelOpen((value) => {
                const next = !value;
                if (next) scheduleHabitatClose();
                return next;
              });
            }}
          >
            Habitate sturioni
          </button>

          {isHabitatPanelOpen && (
            <section
              className="fast-habitat-control__panel"
              onMouseEnter={clearHabitatTimer}
              onMouseLeave={scheduleHabitatClose}
            >
              <button
                type="button"
                className="fast-habitat-control__close"
                onClick={() => setIsHabitatPanelOpen(false)}
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
                <span>Toate habitatele sturionilor</span>
              </label>
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
                  </span>
                </label>
              ))}
            </section>
          )}
        </div>

        <button
          type="button"
          className="fast-layer-control__toggle"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Ascunde controalele" : "Arată controalele"}
          onClick={() => {
            clearCloseTimer();
            setIsOpen((value) => {
              const next = !value;
              if (next) scheduleClose();
              return next;
            });
          }}
        >
          {isOpen ? "⌃" : "⌄"}
        </button>
      </div>

      <div className="fast-layer-control__drawer">
        <button
          type="button"
          className="fast-layer-control__fit"
          onClick={() => handleInteraction(onFitToFastSector)}
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
                    onChange={() => handleInteraction(() => onToggleLayer(option.id))}
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

        <div className="fast-layer-control__section">
          <div className="fast-layer-control__title">Habitate sturioni</div>
          <div className="fast-layer-control__toggles">
            <label className={allHabitatsActive ? "is-active" : ""}>
              <input
                type="checkbox"
                checked={allHabitatsActive}
                disabled={!habitatsAvailable}
                onChange={() => handleInteraction(onToggleAllHabitats)}
              />
              <span>
                Toate habitatele sturionilor
                <em>GIS</em>
              </span>
            </label>
            {HABITAT_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`${availability[option.id] ? "" : "is-unavailable"}${
                  activeLayers[option.id] ? " is-active" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(activeLayers[option.id])}
                  disabled={!availability[option.id]}
                  onChange={() => handleInteraction(() => onToggleLayer(option.id))}
                />
                <span>
                  {option.label}
                  <em>GIS</em>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
