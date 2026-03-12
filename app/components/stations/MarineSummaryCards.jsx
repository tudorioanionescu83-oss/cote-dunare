"use client";

const CARDINAL_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"];

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

function clamp01(value) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}

function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function interpolateColor(stops, t) {
  const clamped = clamp01(t);
  const scaled = clamped * (stops.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(stops.length - 1, index + 1);
  const localT = scaled - index;

  const [r1, g1, b1] = stops[index];
  const [r2, g2, b2] = stops[nextIndex];

  return [mixChannel(r1, r2, localT), mixChannel(g1, g2, localT), mixChannel(b1, b2, localT)];
}

function colorForRange(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const span = Math.max(1e-6, max - min);
  const t = clamp01((numeric - min) / span);

  return interpolateColor(
    [
      [17, 24, 39],
      [30, 64, 175],
      [14, 165, 233],
      [34, 197, 94],
      [250, 204, 21],
      [249, 115, 22],
      [220, 38, 38],
    ],
    t
  );
}

function degreesToCardinal(degrees) {
  const value = Number(degrees);
  if (!Number.isFinite(value)) return "-";
  const normalized = ((value % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINAL_POINTS[index];
}

function formatDirection(degrees) {
  const value = Number(degrees);
  if (!Number.isFinite(value)) return "-";
  const normalized = Math.round(((value % 360) + 360) % 360);
  return `${normalized}\u00B0 (${degreesToCardinal(normalized)})`;
}

function getMetricVisual(metric, rawValue) {
  const numeric = Number(rawValue);
  const rgb = colorForRange(numeric, metric.min, metric.max);

  if (!rgb) {
    return {
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      borderColor: "#dbeafe",
      labelColor: "#475569",
      valueColor: "#0f172a",
      unitColor: "#64748b",
      shadow: "0 2px 8px rgba(2, 132, 199, 0.08)",
    };
  }

  const [r, g, b] = rgb;
  const valueColor = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;

  return {
    background: `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.38) 0%, rgba(${r}, ${g}, ${b}, 0.20) 100%)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.70)`,
    labelColor: "#0f172a",
    valueColor,
    unitColor: "#1e293b",
    shadow: `0 4px 12px rgba(${r}, ${g}, ${b}, 0.22)`,
  };
}

function MarineSummaryCard({ label, value, unit, visual }) {
  return (
    <div
      style={{
        border: `1px solid ${visual.borderColor}`,
        borderRadius: 14,
        padding: 14,
        background: visual.background,
        boxShadow: visual.shadow,
      }}
    >
      <div style={{ fontSize: 12, color: visual.labelColor, fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: visual.valueColor, lineHeight: 1.05 }}>{value}</div>
      <div style={{ fontSize: 12, color: visual.unitColor, fontWeight: 700, marginTop: 5 }}>{unit}</div>
    </div>
  );
}

const METRICS = [
  {
    key: "waterTemperature",
    label: "Temperatura apei",
    unit: "\u00B0C",
    min: 0,
    max: 30,
    display: (current) => formatNumber(current?.waterTemperature, 1),
    raw: (current) => current?.waterTemperature,
  },
  {
    key: "currentSpeed",
    label: "Viteza curentilor",
    unit: "m/s",
    min: 0,
    max: 2,
    display: (current) => formatNumber(current?.currentSpeed, 2),
    raw: (current) => current?.currentSpeed,
  },
  {
    key: "currentDirection",
    label: "Directia curentilor",
    unit: "grade + punct cardinal",
    min: 0,
    max: 360,
    display: (current) => formatDirection(current?.currentDirection),
    raw: (current) => current?.currentDirection,
  },
  {
    key: "waveHeight",
    label: "Inaltime valuri",
    unit: "m",
    min: 0,
    max: 5,
    display: (current) => formatNumber(current?.waveHeight, 2),
    raw: (current) => current?.waveHeight,
  },
  {
    key: "waveDirection",
    label: "Directia valurilor",
    unit: "grade + punct cardinal",
    min: 0,
    max: 360,
    display: (current) => formatDirection(current?.waveDirection),
    raw: (current) => current?.waveDirection,
  },
  {
    key: "wavePeriod",
    label: "Perioada valurilor",
    unit: "s",
    min: 0,
    max: 20,
    display: (current) => formatNumber(current?.wavePeriod, 1),
    raw: (current) => current?.wavePeriod,
  },
  {
    key: "salinity",
    label: "Salinitate",
    unit: "PSU",
    min: 0,
    max: 25,
    display: (current) => formatNumber(current?.salinity, 2),
    raw: (current) => current?.salinity,
  },
];

export default function MarineSummaryCards({ current }) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
      {METRICS.map((metric) => {
        const rawValue = metric.raw(current || {});
        const visual = getMetricVisual(metric, rawValue);

        return (
          <MarineSummaryCard
            key={metric.key}
            label={metric.label}
            value={metric.display(current || {})}
            unit={metric.unit}
            visual={visual}
          />
        );
      })}
    </section>
  );
}
