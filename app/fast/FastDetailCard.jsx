"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalizedValue, t, translateFastValue } from "./fastI18n";

const TABS = [
  { id: "works", labelKey: "works" },
  { id: "fish", labelKey: "ichthyofauna" },
  { id: "sturgeon", labelKey: "sturgeons" },
  { id: "notes", labelKey: "notes" },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function getKmRange(interval) {
  return `km ${interval.km_upstream}–${interval.km_downstream}`;
}

function renderList(items = [], language) {
  const values = items.filter(Boolean);
  if (!values.length) return <p>{t("notAvailableSynthesis", language)}</p>;

  return (
    <ul>
      {values.map((item) => (
        <li key={item}>{translateFastValue(item, language)}</li>
      ))}
    </ul>
  );
}

function MonitoringRequirement({ requirement, language }) {
  return (
    <article className="fast-monitoring-requirement">
      <header>
        <strong>{requirement.code}</strong>
        <span>{translateFastValue(requirement.title, language)}</span>
      </header>
      <p>{translateFastValue(requirement.object, language)}</p>
      {requirement.target ? (
        <small>
          {t("target", language)}: {translateFastValue(requirement.target, language)}
        </small>
      ) : null}
      {requirement.method ? (
        <small>
          {t("method", language)}: {translateFastValue(requirement.method, language)}
        </small>
      ) : null}
      {requirement.parameters ? (
        <small>
          {t("parameters", language)}: {translateFastValue(requirement.parameters, language)}
        </small>
      ) : null}
      {requirement.result ? (
        <small>
          {t("result", language)}: {translateFastValue(requirement.result, language)}
        </small>
      ) : null}
      {requirement.note ? <small>{translateFastValue(requirement.note, language)}</small> : null}
      <em>{requirement.phases.join(" · ")}</em>
    </article>
  );
}

export default function FastDetailCard({
  interval,
  isOpen,
  onClose,
  collapseRequestId,
  language,
}) {
  const [activeTab, setActiveTab] = useState("works");
  const [detailSheetState, setDetailSheetState] = useState("expanded");
  const dragStartYRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setActiveTab("works");
    if (isOpen) {
      setDetailSheetState(isMobile ? "collapsed" : "expanded");
    }
  }, [interval?.pc_code, isMobile, isOpen]);

  useEffect(() => {
    if (isMobile && isOpen && collapseRequestId > 0) {
      setDetailSheetState("collapsed");
    }
  }, [collapseRequestId, isMobile, isOpen]);

  const fishRequirements = useMemo(
    () => interval?.monitoring_requirements?.filter((item) => item.category === "fish") || [],
    [interval]
  );
  const sturgeonRequirements = useMemo(
    () =>
      interval?.monitoring_requirements?.filter((item) => item.category === "sturgeon") || [],
    [interval]
  );

  function handlePointerDown(event) {
    if (!isMobile) return;
    dragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    if (!isMobile || dragStartYRef.current === null) return;
    const delta = event.clientY - dragStartYRef.current;
    dragStartYRef.current = null;

    if (delta > 70) {
      setDetailSheetState((current) =>
        current === "expanded" ? "half" : "collapsed"
      );
      return;
    }

    if (delta < -70) {
      setDetailSheetState((current) =>
        current === "collapsed" ? "half" : "expanded"
      );
    }
  }

  function cycleSheetState() {
    if (!isMobile) return;
    setDetailSheetState((current) => {
      if (current === "collapsed") return "half";
      if (current === "half") return "expanded";
      return "collapsed";
    });
  }

  if (!interval) return null;

  return (
    <section
      className={`fast-detail-card${isOpen ? " is-open" : ""}`}
      data-sheet-state={isMobile ? detailSheetState : "expanded"}
      aria-live="polite"
    >
      {isMobile ? (
        <>
          <button
            type="button"
            className="fast-detail-card__handle"
            aria-label={`${t("expandDetails", language)} / ${t("minimize", language)}`}
            onClick={cycleSheetState}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
          <button
            type="button"
            className="fast-detail-card__sheet-action"
            onClick={cycleSheetState}
          >
            {detailSheetState === "collapsed"
              ? t("expandDetails", language)
              : t("minimize", language)}
          </button>
        </>
      ) : null}

      <button
        type="button"
        className="fast-detail-card__close"
        onClick={onClose}
        aria-label={t("close", language)}
      >
        ×
      </button>

      <header className="fast-detail-card__header">
        <div>
          <p>{interval.pc_code}</p>
          <h2>{interval.name}</h2>
          <span>{getKmRange(interval)}</span>
        </div>
        <div className="fast-detail-card__badges">
          {interval.work_badges.slice(0, isMobile && detailSheetState === "collapsed" ? 3 : undefined).map((badge) => (
            <em key={badge}>{translateFastValue(badge, language)}</em>
          ))}
        </div>
      </header>

      <div className="fast-detail-card__expanded">
        <div className="fast-detail-card__tabs" role="tablist" aria-label={t("detailsPc", language)}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {t(tab.labelKey, language)}
            </button>
          ))}
        </div>

        <div className="fast-detail-card__body">
          {activeTab === "works" ? (
            <dl className="fast-detail-grid">
              <div>
                <dt>{t("dredgingWorks", language)}</dt>
                <dd>
                  <strong>{getLocalizedValue(interval, "dredging_type", language)}</strong>
                  <span>{getLocalizedValue(interval, "dredging_length", language)}</span>
                  <span>{getLocalizedValue(interval, "dredging_km_interval", language)}</span>
                  {interval.dredging_depth ? (
                    <span>
                      {t("depth", language)}: {getLocalizedValue(interval, "dredging_depth", language)}
                    </span>
                  ) : null}
                  {interval.fairway_width ? (
                    <span>
                      {t("fairwayBottomWidth", language)}:{" "}
                      {getLocalizedValue(interval, "fairway_width", language)}
                    </span>
                  ) : null}
                  {interval.slope ? (
                    <span>
                      {t("sideSlope", language)}: {getLocalizedValue(interval, "slope", language)}
                    </span>
                  ) : null}
                  <span>
                    {t("estimatedVolume", language)}:{" "}
                    {getLocalizedValue(interval, "estimated_dredging_volume", language)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>{t("structuresRiverTraining", language)}</dt>
                <dd>{renderList(getLocalizedValue(interval, "engineering_structures", language), language)}</dd>
              </div>
              <div>
                <dt>{t("bankStabilizationArtificialIsland", language)}</dt>
                <dd>
                  {interval.bank_stabilization ? (
                    <span>
                      {t("bankStabilization", language)}:{" "}
                      {getLocalizedValue(interval, "bank_stabilization", language)}
                    </span>
                  ) : null}
                  {interval.artificial_island ? (
                    <span>
                      {t("artificialIsland", language)}:{" "}
                      {getLocalizedValue(interval, "artificial_island", language)}
                    </span>
                  ) : null}
                  {!interval.bank_stabilization && !interval.artificial_island ? (
                    <span>{t("notAvailableSynthesis", language)}</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>{t("dredgedMaterialDisposal", language)}</dt>
                <dd>{renderList(getLocalizedValue(interval, "disposal_zones", language), language)}</dd>
              </div>
            </dl>
          ) : null}

          {activeTab === "fish" ? (
            <div className="fast-detail-stack">
              <section>
                <h3>{t("ichthyofaunaMonitoring", language)}</h3>
                <p>{getLocalizedValue(interval, "monitoring_overview", language)}</p>
              </section>
              <div className="fast-monitoring-grid">
                {fishRequirements.map((requirement) => (
                  <MonitoringRequirement
                    key={requirement.code}
                    requirement={requirement}
                    language={language}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "sturgeon" ? (
            <div className="fast-detail-stack">
              <section>
                <h3>{t("sturgeonMonitoring", language)}</h3>
                <p>{getLocalizedValue(interval, "monitoring_note", language)}</p>
                <p>
                  {t("coverage", language)}: {getLocalizedValue(interval, "monitoring_scope", language)}.
                </p>
              </section>
              <div className="fast-monitoring-grid">
                {sturgeonRequirements.map((requirement) => (
                  <MonitoringRequirement
                    key={requirement.code}
                    requirement={requirement}
                    language={language}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div className="fast-detail-stack">
              <section>
                <h3>{t("monitoringPhases", language)}</h3>
                <div className="fast-monitoring-phases">
                  {interval.monitoring_phases.map((phase) => (
                    <article key={phase.code}>
                      <strong>{phase.code}</strong>
                      <span>{translateFastValue(phase.label, language)}</span>
                      <small>{translateFastValue(phase.description, language)}</small>
                    </article>
                  ))}
                </div>
              </section>
              <section>
                <h3>{t("technicalNotes", language)}</h3>
                {renderList(
                  [
                    getLocalizedValue(interval, "observations", language),
                    ...(getLocalizedValue(interval, "technical_notes", language) || []),
                  ],
                  language
                )}
              </section>
              <section>
                <h3>{t("sourceDisclaimer", language)}</h3>
                <p>{getLocalizedValue(interval, "source_note", language)}</p>
                <p>{getLocalizedValue(interval, "observations", language)}</p>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
