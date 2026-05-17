"use client";

import FastLegend from "./FastLegend";

function getPrimaryWorkLabel(mainWorks = "") {
  const [firstWork] = String(mainWorks).split(";");
  return firstWork?.trim() || "Lucrări nedetaliate";
}

function getKmRange(interval) {
  return `km ${interval.km_upstream}–${interval.km_downstream}`;
}

export default function FastSidebar({
  pcIntervals,
  monitoringOverview,
  selectedPcCode,
  onSelectPc,
  isOpen,
  onToggleOpen,
}) {
  const selectedInterval =
    pcIntervals.find((interval) => interval.pc_code === selectedPcCode) || null;

  return (
    <aside className={`fast-sidebar${isOpen ? " is-open" : ""}`}>
      <button type="button" className="fast-sidebar-handle" onClick={onToggleOpen}>
        {isOpen ? "Minimizează panoul" : "Detalii FAST"}
      </button>

      <div className="fast-sidebar-scroll">
        <section className="fast-sidebar-block">
          <h2>Conținut</h2>
          <p>
            Pagina FAST este izolată de harta hidrologică. Segmentele PC sunt reprezentări
            de interval km bazate pe punctele AFDJ existente, nu poligoane tehnice de execuție.
          </p>
        </section>

        <section className="fast-sidebar-block">
          <div className="fast-sidebar-heading">
            <h2>Puncte critice</h2>
            <span>{pcIntervals.length || "–"}</span>
          </div>

          <div className="fast-pc-list">
            {pcIntervals.map((interval) => (
              <button
                key={interval.pc_code}
                type="button"
                className={`fast-pc-item${
                  selectedPcCode === interval.pc_code ? " is-active" : ""
                }`}
                onClick={() => onSelectPc(interval.pc_code)}
              >
                <span className="fast-pc-item__code">{interval.pc_code}</span>
                <span className="fast-pc-item__body">
                  <strong>{interval.name}</strong>
                  <small>{getKmRange(interval)}</small>
                  <em>{getPrimaryWorkLabel(interval.main_works)}</em>
                </span>
              </button>
            ))}
          </div>
        </section>

        {selectedInterval ? (
          <section className="fast-sidebar-block fast-pc-detail">
            <div className="fast-pc-detail__eyebrow">
              {selectedInterval.pc_code} · {getKmRange(selectedInterval)}
            </div>
            <h2>{selectedInterval.name}</h2>
            <dl>
              <div>
                <dt>Lucrări principale</dt>
                <dd>{selectedInterval.main_works}</dd>
              </div>
              <div>
                <dt>Monitorizare overview</dt>
                <dd>{selectedInterval.fish_monitoring_overview}</dd>
              </div>
              <div>
                <dt>Observație</dt>
                <dd>{selectedInterval.observations}</dd>
              </div>
              <div>
                <dt>Sursă</dt>
                <dd>{selectedInterval.source}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="fast-sidebar-block">
          <h2>Monitorizare overview</h2>
          <p>{monitoringOverview?.summary}</p>
          <p className="fast-sidebar-note">{monitoringOverview?.note}</p>
        </section>

        <FastLegend />
      </div>
    </aside>
  );
}
