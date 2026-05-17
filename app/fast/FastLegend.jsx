export default function FastLegend() {
  return (
    <section className="fast-sidebar-block">
      <h2>Legendă</h2>
      <div className="fast-legend">
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-segment" />
          <span>PC km segments — km interval representation</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-pc-polygon" />
          <span>PC polygons — source polygons</span>
        </div>
        <div className="fast-legend-row">
          <span className="fast-swatch fast-swatch-km" />
          <span>Km AFDJ</span>
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
