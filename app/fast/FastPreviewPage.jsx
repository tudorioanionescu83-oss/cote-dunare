"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import FastLegend from "./FastLegend";

const FastMap = dynamic(() => import("./FastMap"), {
  ssr: false,
  loading: () => (
    <div className="fast-map-loading">
      Se încarcă harta FAST...
    </div>
  ),
});

export default function FastPreviewPage() {
  return (
    <main className="fast-page">
      <header className="fast-header">
        <div>
          <p className="fast-kicker">FAST Danube</p>
          <h1>Preview / Planning Map</h1>
          <p>
            Hartă de orientare pentru zone FAST, kilometraj AFDJ și straturi de planificare.
          </p>
        </div>
        <Link href="/" className="fast-back-link">
          Înapoi la cote
        </Link>
      </header>

      <section className="fast-workspace">
        <aside className="fast-sidebar">
          <div className="fast-sidebar-block">
            <h2>Conținut</h2>
            <p>
              Pagina FAST este izolată de harta hidrologică. Segmentele PC sunt reprezentări
              de interval km bazate pe punctele AFDJ existente, nu poligoane exacte.
            </p>
          </div>
          <FastLegend />
        </aside>

        <div className="fast-map-panel">
          <FastMap />
        </div>
      </section>
    </main>
  );
}
