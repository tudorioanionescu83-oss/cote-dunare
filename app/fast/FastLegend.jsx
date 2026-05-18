import { t } from "./fastI18n";

export default function FastLegend({ language }) {
  return (
    <section className="fast-sidebar-block">
      <details className="fast-legend-details" open>
        <summary>{t("legend", language)}</summary>
        <div className="fast-legend">
          <div className="fast-legend-group">
            <span className="fast-legend-chip">{t("gisLayers", language)}</span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-fairway" />
            <span>
              <strong>{t("navigableFairway", language)}</strong> — {t("fairwayLegend", language)}
            </span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-pc-planning" />
            <span>
              <strong>PC planning polygons</strong> — {t("planningPolygonsLegend", language)}
            </span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-pc-segment" />
            <span>
              <strong>PC km segments</strong> — {t("kmSegmentsLegend", language)}
            </span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-pc-polygon" />
            <span>
              <strong>PC polygons</strong> — {t("pcPolygonsLegend", language)}
            </span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-km" />
            <span>
              <strong>{t("afdjKm", language)}</strong> — {t("afdjKmLegend", language)}
            </span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-subkm" />
            <span>
              <strong>100 m</strong> — {t("hundredMetersLegend", language)}
            </span>
          </div>

          <div className="fast-legend-group">
            <span className="fast-legend-chip is-habitats">
              {t("sturgeonHabitats", language)}
            </span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-sturgeon-spawning" />
            <span>{t("orangePotential", language)}</span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-sturgeon-confirmed" />
            <span>{t("darkRedConfirmed", language)}</span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-sturgeon-feeding" />
            <span>{t("greenFeeding", language)}</span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-sturgeon-wintering" />
            <span>{t("blueWintering", language)}</span>
          </div>
          <div className="fast-legend-row">
            <span className="fast-swatch fast-swatch-sturgeon-protection" />
            <span>{t("purpleProtection", language)}</span>
          </div>
          <p className="fast-legend-note">
            <span>{t("dataSourcesShort", language)}</span>
            <strong>{t("poweredBy", language)}</strong>
            <span>tudor.ionescu@sturgeons.eu</span>
          </p>

          <div className="fast-legend-group">
            <span className="fast-legend-chip is-phases">
              {t("monitoringPhases", language)}
            </span>
          </div>
          <div className="fast-legend-phases">
            <span>
              <strong>PIM</strong> {t("pimLegend", language)}
            </span>
            <span>
              <strong>SM</strong> {t("smLegend", language)}
            </span>
            <span>
              <strong>STCM</strong> {t("stcmLegend", language)}
            </span>
            <span>
              <strong>LTCM</strong> {t("ltcmLegend", language)}
            </span>
          </div>

          <details className="fast-legend-sources">
            <summary>{t("sources", language)}</summary>
            <span>{t("afdjSource", language)}</span>
            <span>
              Honț et al. 2022 / DDNI – Preliminary migratory fish habitats assessment along the
              Danube River sector km 863–375
            </span>
            <span>{t("termsOfReferenceSource", language)}</span>
            <span>{t("lowerDanubeSource", language)}</span>
            <span>{t("lowerDanubeDataset", language)}</span>
          </details>
        </div>
      </details>
    </section>
  );
}
