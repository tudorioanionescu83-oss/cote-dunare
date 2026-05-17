export default function FastLegend() {
  return (
    <section className="fast-sidebar-block">
      <details className="fast-legend-details" open>
        <summary>Legendă</summary>
        <div className="fast-legend">
        <div className="fast-legend-group">
          <span className="fast-legend-chip">GIS layers</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-fairway" />
          <span>
            <strong>Șenal navigabil</strong> — orientare vizuală, reutilizat din layerul platformei.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-planning" />
          <span>
            <strong>PC planning polygons</strong> — poligoane de orientare generate din puncte
            AFDJ detaliate de pe maluri/șenal; nu sunt poligoane tehnice finale.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-segment" />
          <span>
            <strong>PC km segments</strong> — reprezentare pe interval kilometric generată din km
            AFDJ; nu este poligon tehnic de execuție.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-polygon" />
          <span>
            <strong>PC polygons</strong> — geometrii sursă KMZ disponibile; nu acoperă neapărat
            toate cele 12 puncte critice.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-km" />
          <span>
            <strong>Km AFDJ</strong> — kilometraj fluvial folosit pentru orientare.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-subkm" />
          <span>
            <strong>100 m</strong> — marcaje intermediare din datele AFDJ existente, vizibile doar
            la zoom mare.
          </span>
        </div>

        <div className="fast-legend-group">
          <span className="fast-legend-chip is-habitats">Habitate sturioni</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon-spawning" />
          <span>portocaliu = reproducere potențială</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon-confirmed" />
          <span>roșu = reproducere confirmată</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon-feeding" />
          <span>verde = hrănire / juvenili</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon-wintering" />
          <span>albastru = iernare / refugiu</span>
        </div>

        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon-protection" />
          <span>galben = protecție sensibilă</span>
        </div>

        <div className="fast-legend-group">
          <span className="fast-legend-chip is-metadata">Metadata / thematic info</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-monitoring" />
          <span>
            <strong>Monitorizare ihtiofaună overview</strong> — informație tematică în cardul
            tehnic, fără geometrii inventate.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon" />
          <span>
            <strong>Monitorizare sturioni</strong> — cerințe MON21, MON22, MON25–MON27 afișate ca
            metadata tehnică, fără geometrii GIS false.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-works" />
          <span>Lucrări principale — metadata tehnică; indisponibil ca layer GIS fără sursă clară.</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-disposal" />
          <span>
            Zone depozitare material dragat — metadata tehnică; indisponibil ca layer GIS fără sursă
            clară.
          </span>
        </div>

        <div className="fast-legend-group">
          <span className="fast-legend-chip is-phases">Faze monitorizare</span>
        </div>
        <div className="fast-legend-phases">
          <span>
            <strong>PIM</strong> monitorizare înainte de intervenție / baseline
          </span>
          <span>
            <strong>SM</strong> monitorizare în timpul execuției
          </span>
          <span>
            <strong>STCM</strong> monitorizare post-intervenție pe termen scurt
          </span>
          <span>
            <strong>LTCM</strong> monitorizare post-intervenție pe termen lung
          </span>
        </div>

        <details className="fast-legend-sources">
          <summary>Surse</summary>
          <span>AFDJ — kilometraj, șenal și referințe sector FAST Danube 2</span>
          <span>
            Honț et al. 2022 / DDNI — Preliminary migratory fish habitats assessment along the
            Danube River sector km 863–375
          </span>
          <span>Caiet de sarcini FAST Danube 2 — lucrări și monitorizare impact asupra mediului</span>
          <span>
            Lower Danube extins: Rasova, Isaccea, Borcea și Chilia; ramurile fără geometrie
            dedicată rămân raportate separat.
          </span>
          <strong>Powered by Tudor</strong>
          <em>tudor.ionescu@sturgeons.eu</em>
        </details>
        </div>
      </details>
    </section>
  );
}
