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

export default function FastLayerControl({
  basemap,
  activeLayers,
  availability,
  onBasemapChange,
  onFitToFastSector,
  onToggleLayer,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);

  function clearCloseTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    const delay =
      typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches
        ? 2000
        : 3200;
    timerRef.current = setTimeout(() => setIsOpen(false), delay);
  }

  useEffect(() => () => clearCloseTimer(), []);

  function handleInteraction(callback) {
    callback?.();
    setIsOpen(true);
    scheduleClose();
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
      </div>
    </div>
  );
}
