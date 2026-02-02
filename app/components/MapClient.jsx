"use client";

export default function MapClient({ stations, latestByName, selectedName, onSelect }) {
  const W = 820;
  const H = 320;
  const pad = 16;

  if (!stations?.length) {
    return (
      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        Nu există stații.
      </div>
    );
  }

  const lats = stations.map((s) => s.lat);
  const lngs = stations.map((s) => s.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const sx = (lng) => {
    if (maxLng === minLng) return W / 2;
    return pad + ((lng - minLng) * (W - 2 * pad)) / (maxLng - minLng);
  };
  const sy = (lat) => {
    if (maxLat === minLat) return H / 2;
    return pad + ((maxLat - lat) * (H - 2 * pad)) / (maxLat - minLat);
  };

  const colorFor = (name) => {
    const r = latestByName?.get(name.toLowerCase());
    if (!r) return "#999"; // gri: fără date
    if (typeof r.dLevel !== "number" || !Number.isFinite(r.dLevel)) return "black";
    if (r.dLevel > 0) return "green";
    if (r.dLevel < 0) return "red";
    return "black";
  };

  const borderFor = (name) => (name === selectedName ? "blue" : "white");

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Hartă (simplificată)</div>

      <svg
        width={W}
        height={H}
        style={{ width: "100%", height: "auto", background: "#f7fbff", borderRadius: 10 }}
      >
        {stations.map((s) => {
          const x = sx(s.lng);
          const y = sy(s.lat);
          const c = colorFor(s.name);
          const b = borderFor(s.name);
          return (
            <g key={s.name} onClick={() => onSelect(s.name)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r="9" fill={c} stroke={b} strokeWidth="3" />
              <text x={x + 12} y={y + 4} fontSize="12">
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, opacity: 0.85 }}>
        <span>● roșu = variație negativă</span>
        <span>● verde = variație pozitivă</span>
        <span>● negru = variație 0 / necunoscut</span>
        <span>● gri = fără date</span>
      </div>
    </div>
  );
}
