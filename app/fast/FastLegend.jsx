export default function FastLegend() {
  return (
    <section className="fast-sidebar-block">
      <h2>Legendă</h2>
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
            <strong>PC planning polygons</strong> — poligoane de orientare generate din
            puncte AFDJ detaliate de pe maluri/șenal; nu sunt poligoane tehnice finale.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-segment" />
          <span>
            <strong>PC km segments</strong> — reprezentare pe interval kilometric generată din
            km AFDJ; nu este poligon tehnic de execuție.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-polygon" />
          <span>
            <strong>PC polygons</strong> — geometrii sursă KMZ disponibile; nu acoperă
            neapărat toate cele 12 puncte critice.
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
            <strong>100 m</strong> — marcaje intermediare din datele AFDJ existente, vizibile doar la zoom mare.
          </span>
        </div>
        <div className="fast-legend-group">
          <span className="fast-legend-chip is-metadata">Metadata / thematic info</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-monitoring" />
          <span>
            <strong>Monitorizare ihtiofaună overview</strong> — informație tematică în cardul tehnic, fără geometrii inventate.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-sturgeon" />
          <span>
            <strong>Monitorizare sturioni</strong> — cerințe MON21, MON22, MON25–MON27
            afișate ca metadata tehnică, fără geometrii GIS false.
          </span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-works" />
          <span>Lucrări principale — metadata tehnică; indisponibil ca layer GIS fără sursă clară.</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-disposal" />
          <span>Zone depozitare material dragat — metadata tehnică; indisponibil ca layer GIS fără sursă clară.</span>
        </div>
        <div className="fast-legend-group">
          <span className="fast-legend-chip is-phases">Faze monitorizare</span>
        </div>
        <div className="fast-legend-phases">
          <span><strong>PIM</strong> monitorizare înainte de intervenție / baseline</span>
          <span><strong>SM</strong> monitorizare în timpul execuției</span>
          <span><strong>STCM</strong> monitorizare post-intervenție pe termen scurt</span>
          <span><strong>LTCM</strong> monitorizare post-intervenție pe termen lung</span>
        </div>
      </div>
    </section>
  );
}
