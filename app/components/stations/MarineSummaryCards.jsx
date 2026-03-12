"use client";

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits);
}

function MarineSummaryCard({ label, value, unit, accent }) {
  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 14,
        padding: 14,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 2px 8px rgba(2, 132, 199, 0.08)",
      }}
    >
      <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1.05 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 5 }}>{unit}</div>
    </div>
  );
}

export default function MarineSummaryCards({ current }) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
      <MarineSummaryCard
        label="Temperatura apei"
        value={formatNumber(current?.waterTemperature, 1)}
        unit="°C"
        accent="#ea580c"
      />
      <MarineSummaryCard
        label="Viteza curentilor"
        value={formatNumber(current?.currentSpeed, 2)}
        unit="m/s"
        accent="#0284c7"
      />
      <MarineSummaryCard
        label="Directia curentilor"
        value={formatNumber(current?.currentDirection, 0)}
        unit="°"
        accent="#0369a1"
      />
      <MarineSummaryCard
        label="Inaltime valuri"
        value={formatNumber(current?.waveHeight, 2)}
        unit="m"
        accent="#0891b2"
      />
      <MarineSummaryCard
        label="Directia valurilor"
        value={formatNumber(current?.waveDirection, 0)}
        unit="°"
        accent="#0e7490"
      />
      <MarineSummaryCard
        label="Perioada valurilor"
        value={formatNumber(current?.wavePeriod, 1)}
        unit="s"
        accent="#155e75"
      />
      <MarineSummaryCard
        label="Salinitate"
        value={formatNumber(current?.salinity, 2)}
        unit="PSU"
        accent="#0f766e"
      />
    </section>
  );
}
