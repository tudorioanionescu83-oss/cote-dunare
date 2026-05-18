"use client";

import FastLegend from "./FastLegend";
import { t, translateFastValue } from "./fastI18n";

function getKmRange(interval) {
  return `km ${interval.km_upstream}–${interval.km_downstream}`;
}

export default function FastSidebar({
  pcIntervals,
  selectedPcCode,
  onSelectPc,
  isOpen,
  onToggleOpen,
  language,
}) {
  return (
    <aside className={`fast-sidebar${isOpen ? " is-open" : ""}`}>
      <button type="button" className="fast-sidebar-handle" onClick={onToggleOpen}>
        {isOpen ? t("minimizePanel", language) : t("fastDetails", language)}
      </button>

      <div className="fast-sidebar-scroll">
        <section className="fast-sidebar-block">
          <div className="fast-sidebar-heading">
            <h2>{t("criticalPoints", language)}</h2>
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
                      <em key={badge}>{translateFastValue(badge, language)}</em>
                    ))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <FastLegend language={language} />
      </div>
    </aside>
  );
}
