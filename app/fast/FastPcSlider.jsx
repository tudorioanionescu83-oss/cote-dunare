"use client";

import { t } from "./fastI18n";

function getKmRange(interval) {
  return `km ${interval.km_upstream}–${interval.km_downstream}`;
}

export default function FastPcSlider({
  pcIntervals,
  selectedPcCode,
  onSelectPc,
  language,
}) {
  return (
    <nav className="fast-pc-slider" aria-label={t("pcSliderAria", language)}>
      {pcIntervals.map((interval) => (
        <button
          key={interval.pc_code}
          type="button"
          className={`fast-pc-slider__item${
            selectedPcCode === interval.pc_code ? " is-active" : ""
          }`}
          onClick={() => onSelectPc(interval.pc_code)}
        >
          <strong>{interval.pc_code}</strong>
          <span>{interval.name}</span>
          <small>{getKmRange(interval)}</small>
        </button>
      ))}
    </nav>
  );
}
