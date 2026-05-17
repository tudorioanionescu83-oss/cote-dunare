"use client";

import FastLegend from "./FastLegend";

function getKmRange(interval) {
  return `km ${interval.km_upstream}–${interval.km_downstream}`;
}

function renderList(items = []) {
  if (!items.length) return <p>Nedisponibil în sinteza curentă.</p>;

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function FastSidebar({
  pcIntervals,
  monitoringOverview,
  generalNote,
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
          <p>{generalNote}</p>
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
                  <span className="fast-pc-item__badges">
                    {interval.work_badges.map((badge) => (
                      <em key={badge}>{badge}</em>
                    ))}
                  </span>
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
                <dt>Lucrări de dragare</dt>
                <dd>
                  <strong>{selectedInterval.dredging_type}</strong>
                  <span>{selectedInterval.dredging_length}</span>
                  <span>{selectedInterval.dredging_km_interval}</span>
                  {selectedInterval.dredging_depth ? (
                    <span>adâncime: {selectedInterval.dredging_depth}</span>
                  ) : null}
                  {selectedInterval.fairway_width ? (
                    <span>lățime bază șenal: {selectedInterval.fairway_width}</span>
                  ) : null}
                  {selectedInterval.slope ? <span>pantă profil: {selectedInterval.slope}</span> : null}
                  <span>volum estimat: {selectedInterval.estimated_dredging_volume}</span>
                </dd>
              </div>

              <div>
                <dt>Structuri / regularizare</dt>
                <dd>{renderList(selectedInterval.engineering_structures)}</dd>
              </div>

              <div>
                <dt>Stabilizare mal / insulă artificială</dt>
                <dd>
                  {selectedInterval.bank_stabilization ? (
                    <span>stabilizare mal: {selectedInterval.bank_stabilization}</span>
                  ) : null}
                  {selectedInterval.artificial_island ? (
                    <span>insulă artificială: {selectedInterval.artificial_island}</span>
                  ) : null}
                  {!selectedInterval.bank_stabilization && !selectedInterval.artificial_island ? (
                    <span>Nedisponibil în sinteza curentă.</span>
                  ) : null}
                </dd>
              </div>

              <div>
                <dt>Depozitare material dragat</dt>
                <dd>{renderList(selectedInterval.disposal_zones)}</dd>
              </div>

              <div>
                <dt>Monitorizare ihtiofaună / sturioni</dt>
                <dd>
                  <span>{selectedInterval.monitoring_overview}</span>
                  <span>{selectedInterval.monitoring_note}</span>
                </dd>
              </div>

              <div>
                <dt>Observații tehnice</dt>
                <dd>
                  {renderList([
                    selectedInterval.observations,
                    ...selectedInterval.technical_notes,
                  ])}
                </dd>
              </div>

              <div>
                <dt>Sursă</dt>
                <dd>{selectedInterval.source_note}</dd>
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
