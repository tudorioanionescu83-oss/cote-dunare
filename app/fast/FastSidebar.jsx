"use client";

import FastLegend from "./FastLegend";

function getKmRange(interval) {
  return `km ${interval.km_upstream}–${interval.km_downstream}`;
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
