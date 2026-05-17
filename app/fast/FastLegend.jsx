export default function FastLegend() {
  return (
    <section className="fast-sidebar-block">
      <h2>Legendă</h2>
      <div className="fast-legend">
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
          <span className="fast-swatch fast-swatch-works" />
          <span>Lucrări principale</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-disposal" />
          <span>Zone depozitare material dragat</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-monitoring" />
          <span>Monitorizare ihtiofaună overview</span>
        </div>
      </div>
    </section>
  );
}
