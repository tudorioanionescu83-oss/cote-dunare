"use client";

import MarineSummaryCards from "./MarineSummaryCards";
import MarineMapsPanel from "./MarineMapsPanel";
import MarineMeteoSection from "./MarineMeteoSection";

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace(".000Z", "Z");
}

export default function MarineStationPanel({
  station,
  current,
  timeseries,
  forecast,
  layers = [],
  loading = false,
  error = "",
}) {
  return (
    <section
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 20,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 16px 14px 16px",
          background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 60%, #0284c7 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 950, lineHeight: 1.1 }}>{station?.displayName || station?.name || "Constanta"}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 800,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            Tip statie: Marina
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            Sursa: {current?.source || "Copernicus Marine"}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            Ultima actualizare: {formatTimestamp(current?.timestamp)}
          </span>
        </div>
      </div>

      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        {loading && <div style={{ fontSize: 13, color: "#64748b" }}>Se incarca datele marine...</div>}
        {!!error && !loading && (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Eroare date marine: {error}
          </div>
        )}

        <div id="marine-summary-section">
          <MarineSummaryCards current={current || {}} />
        </div>

        <div id="marine-maps-section">
          <MarineMapsPanel station={station || { lat: 44.17, lng: 28.65 }} current={current} timeseries={timeseries} forecast={forecast} layers={layers} />
        </div>

        <MarineMeteoSection station={station} />
      </div>
    </section>
  );
}
