"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TABS = [
  { id: "works", label: "Lucrări" },
  { id: "fish", label: "Ihtiofaună" },
  { id: "sturgeon", label: "Sturioni" },
  { id: "notes", label: "Note" },
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

function renderList(items = []) {
  const values = items.filter(Boolean);
  if (!values.length) return <p>Nedisponibil în sinteza curentă.</p>;

  return (
    <ul>
      {values.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function MonitoringRequirement({ requirement }) {
  return (
    <article className="fast-monitoring-requirement">
      <header>
        <strong>{requirement.code}</strong>
        <span>{requirement.title}</span>
      </header>
      <p>{requirement.object}</p>
      {requirement.target ? <small>Țintă: {requirement.target}</small> : null}
      {requirement.method ? <small>Metodă: {requirement.method}</small> : null}
      {requirement.parameters ? <small>Parametri: {requirement.parameters}</small> : null}
      {requirement.result ? <small>Rezultat: {requirement.result}</small> : null}
      {requirement.note ? <small>{requirement.note}</small> : null}
      <em>{requirement.phases.join(" · ")}</em>
    </article>
  );
}

export default function FastDetailCard({ interval, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("works");
  const [detailSheetState, setDetailSheetState] = useState("expanded");
  const dragStartYRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setActiveTab("works");
    if (isOpen) {
      setDetailSheetState(isMobile ? "half" : "expanded");
    }
  }, [interval?.pc_code, isMobile, isOpen]);

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
        <button
          type="button"
          className="fast-detail-card__handle"
          aria-label="Extinde sau minimizează"
          onClick={cycleSheetState}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />
      ) : null}

      <button
        type="button"
        className="fast-detail-card__close"
        onClick={onClose}
        aria-label="Închide"
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
            <em key={badge}>{badge}</em>
          ))}
        </div>
      </header>

      <div className="fast-detail-card__expanded">
        <div className="fast-detail-card__tabs" role="tablist" aria-label="Detalii PC">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="fast-detail-card__body">
          {activeTab === "works" ? (
            <dl className="fast-detail-grid">
              <div>
                <dt>Lucrări de dragare</dt>
                <dd>
                  <strong>{interval.dredging_type}</strong>
                  <span>{interval.dredging_length}</span>
                  <span>{interval.dredging_km_interval}</span>
                  {interval.dredging_depth ? <span>adâncime: {interval.dredging_depth}</span> : null}
                  {interval.fairway_width ? (
                    <span>lățime bază șenal: {interval.fairway_width}</span>
                  ) : null}
                  {interval.slope ? <span>pantă profil: {interval.slope}</span> : null}
                  <span>volum estimat: {interval.estimated_dredging_volume}</span>
                </dd>
              </div>
              <div>
                <dt>Structuri / regularizare</dt>
                <dd>{renderList(interval.engineering_structures)}</dd>
              </div>
              <div>
                <dt>Stabilizare mal / insulă artificială</dt>
                <dd>
                  {interval.bank_stabilization ? (
                    <span>stabilizare mal: {interval.bank_stabilization}</span>
                  ) : null}
                  {interval.artificial_island ? (
                    <span>insulă artificială: {interval.artificial_island}</span>
                  ) : null}
                  {!interval.bank_stabilization && !interval.artificial_island ? (
                    <span>Nedisponibil în sinteza curentă.</span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Depozitare material dragat</dt>
                <dd>{renderList(interval.disposal_zones)}</dd>
              </div>
            </dl>
          ) : null}

          {activeTab === "fish" ? (
            <div className="fast-detail-stack">
              <section>
                <h3>Monitorizare ihtiofaună</h3>
                <p>{interval.monitoring_overview}</p>
              </section>
              <div className="fast-monitoring-grid">
                {fishRequirements.map((requirement) => (
                  <MonitoringRequirement key={requirement.code} requirement={requirement} />
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "sturgeon" ? (
            <div className="fast-detail-stack">
              <section>
                <h3>Monitorizare sturioni</h3>
                <p>{interval.monitoring_note}</p>
                <p>Acoperire: {interval.monitoring_scope}.</p>
              </section>
              <div className="fast-monitoring-grid">
                {sturgeonRequirements.map((requirement) => (
                  <MonitoringRequirement key={requirement.code} requirement={requirement} />
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div className="fast-detail-stack">
              <section>
                <h3>Perioade / faze</h3>
                <div className="fast-monitoring-phases">
                  {interval.monitoring_phases.map((phase) => (
                    <article key={phase.code}>
                      <strong>{phase.code}</strong>
                      <span>{phase.label}</span>
                      <small>{phase.description}</small>
                    </article>
                  ))}
                </div>
              </section>
              <section>
                <h3>Observații tehnice</h3>
                {renderList([interval.observations, ...interval.technical_notes])}
              </section>
              <section>
                <h3>Sursă / disclaimer</h3>
                <p>{interval.source_note}</p>
                <p>{interval.observations}</p>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
