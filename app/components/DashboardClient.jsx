"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { subDays, subMonths, subYears, format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

function markerIconForVariation(variatie_cm) {
  let color = "#6b7280"; // gri
  if (variatie_cm > 0) color = "#dc2626"; // rosu
  if (variatie_cm < 0) color = "#2563eb"; // albastru

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:14px;height:14px;border-radius:999px;
        background:${color};
        border:2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,.25);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function normalizeStationKey(name) {
  return (name || "").trim().toLowerCase();
}

export default function DashboardClient() {
  const [stations, setStations] = useState([]); // din tabela stations
  const [latestRows, setLatestRows] = useState([]); // cote_dunare_zi pentru ultima zi
  const [selectedStation, setSelectedStation] = useState(null); // { name, lat, lng, km, ... }
  const [rangePreset, setRangePreset] = useState("1m"); // 1d | 1m | 3m | 1y | custom
  const [customStart, setCustomStart] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [series, setSeries] = useState([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [search, setSearch] = useState("");

  // === Load stations + latest readings (once) ===
  useEffect(() => {
    (async () => {
      // 1) stations
      const { data: stData, error: stErr } = await supabase
        .from("stations")
        .select("id,name,code,latitude,longitude,river_sector,alert_level,flood_level,km")
        .order("name", { ascending: true });

      if (stErr) {
        console.error("stations error:", stErr);
      } else {
        setStations(stData || []);
      }

      // 2) ultima zi din cote_dunare_zi
      const { data: maxDateData, error: maxDateErr } = await supabase
        .from("cote_dunare_zi")
        .select("data")
        .order("data", { ascending: false })
        .limit(1);

      if (maxDateErr) {
        console.error("max date error:", maxDateErr);
        return;
      }

      const latestDate = maxDateData?.[0]?.data;
      if (!latestDate) return;

      const { data: rows, error: rowsErr } = await supabase
        .from("cote_dunare_zi")
        .select("data,localitatea,km,nivel_cm,variatie_cm,temperatura_c")
        .eq("data", latestDate);

      if (rowsErr) {
        console.error("latest rows error:", rowsErr);
      } else {
        setLatestRows(rows || []);
      }
    })();
  }, []);

  // Map latest rows by station name
  const latestByName = useMemo(() => {
    const m = new Map();
    for (const r of latestRows) {
      m.set(normalizeStationKey(r.localitatea), r);
    }
    return m;
  }, [latestRows]);

  // pick default selected station when stations loaded
  useEffect(() => {
    if (!selectedStation && stations.length) {
      setSelectedStation(stations[0]);
    }
  }, [stations, selectedStation]);

  // === Compute range start/end based on preset ===
  const { startDate, endDate } = useMemo(() => {
    const end = new Date(customEnd);
    if (rangePreset === "custom") {
      return { startDate: new Date(customStart), endDate: end };
    }
    if (rangePreset === "1d") return { startDate: subDays(end, 1), endDate: end };
    if (rangePreset === "1m") return { startDate: subMonths(end, 1), endDate: end };
    if (rangePreset === "3m") return { startDate: subMonths(end, 3), endDate: end };
    if (rangePreset === "1y") return { startDate: subYears(end, 1), endDate: end };
    return { startDate: subMonths(end, 1), endDate: end };
  }, [rangePreset, customStart, customEnd]);

  // === Load timeseries when station or range changes ===
  useEffect(() => {
    if (!selectedStation?.name) return;

    (async () => {
      setLoadingSeries(true);

      const stationName = selectedStation.name;

      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("cote_dunare_zi")
        .select("data,nivel_cm,temperatura_c,variatie_cm")
        .eq("localitatea", stationName)
        .gte("data", startStr)
        .lte("data", endStr)
        .order("data", { ascending: true });

      if (error) {
        console.error("series error:", error);
        setSeries([]);
      } else {
        // Recharts preferă date strings; păstrăm formatul YYYY-MM-DD
        setSeries((data || []).map((d) => ({
          data: d.data,
          nivel_cm: d.nivel_cm,
          temperatura_c: d.temperatura_c,
          variatie_cm: d.variatie_cm,
        })));
      }

      setLoadingSeries(false);
    })();
  }, [selectedStation, startDate, endDate]);

  const filteredStations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [stations, search]);

  const selectedLatest = useMemo(() => {
    if (!selectedStation?.name) return null;
    return latestByName.get(normalizeStationKey(selectedStation.name)) || null;
  }, [selectedStation, latestByName]);

  const mapCenter = useMemo(() => {
    // centrare pe România / Dunăre
    return [44.3, 27.8];
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{ borderRight: "1px solid #e5e7eb", padding: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Cotele Dunării</div>
        <div style={{ color: "#6b7280", marginBottom: 14 }}>
          Stații + hartă + grafice
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută stație…"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            marginBottom: 12,
            outline: "none",
          }}
        />

        <div style={{ maxHeight: "62vh", overflow: "auto" }}>
          {filteredStations.map((s) => {
            const latest = latestByName.get(normalizeStationKey(s.name));
            const variatie = latest?.variatie_cm ?? 0;
            const isActive = selectedStation?.id === s.id;

            const badgeColor =
              variatie > 0 ? "#dc2626" : variatie < 0 ? "#2563eb" : "#6b7280";

            return (
              <button
                key={s.id}
                onClick={() => setSelectedStation(s)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 12,
                  border: isActive ? "2px solid #111827" : "1px solid #e5e7eb",
                  background: "white",
                  marginBottom: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      km {s.km ?? "—"} • {s.river_sector ?? "—"}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>
                      {latest?.nivel_cm ?? "—"} cm
                    </div>
                    <div style={{ fontSize: 12, color: badgeColor }}>
                      {variatie > 0 ? "+" : ""}
                      {variatie ?? "—"} cm
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Range controls */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Perioadă</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              ["1d", "1 zi"],
              ["1m", "1 lună"],
              ["3m", "3 luni"],
              ["1y", "1 an"],
              ["custom", "Alege…"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRangePreset(key)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: rangePreset === key ? "2px solid #111827" : "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {rangePreset === "custom" && (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#6b7280" }}>
                De la
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    marginTop: 4,
                  }}
                />
              </label>
              <label style={{ fontSize: 12, color: "#6b7280" }}>
                Până la
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    marginTop: 4,
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ padding: 16, display: "grid", gridTemplateRows: "420px 1fr", gap: 16 }}>
        {/* Map */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
          <MapContainer
            center={mapCenter}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {stations.map((s) => {
              const latest = latestByName.get(normalizeStationKey(s.name));
              const variatie = latest?.variatie_cm ?? 0;

              const lat = Number(s.latitude);
              const lng = Number(s.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              return (
                <Marker
                  key={s.id}
                  position={[lat, lng]}
                  icon={markerIconForVariation(variatie)}
                  eventHandlers={{
                    click: () => setSelectedStation(s),
                  }}
                >
                  <Popup>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>{s.name}</div>
                    <div>km: {s.km ?? "—"}</div>
                    <div>
                      Nivel: <b>{latest?.nivel_cm ?? "—"} cm</b>
                    </div>
                    <div>
                      Variație:{" "}
                      <b>
                        {variatie > 0 ? "+" : ""}
                        {variatie ?? "—"} cm
                      </b>
                    </div>
                    <div>Temp: {latest?.temperatura_c ?? "—"} °C</div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Charts */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {selectedStation?.name ?? "—"}
              </div>
              <div style={{ color: "#6b7280" }}>
                {selectedLatest
                  ? `Ultima zi: ${selectedLatest.data} • Nivel ${selectedLatest.nivel_cm} cm • (${selectedLatest.variatie_cm > 0 ? "+" : ""}${selectedLatest.variatie_cm} cm) • Temp ${selectedLatest.temperatura_c} °C`
                  : "—"}
              </div>
            </div>

            <div style={{ color: "#6b7280", fontSize: 12, textAlign: "right" }}>
              Interval: {format(startDate, "yyyy-MM-dd")} → {format(endDate, "yyyy-MM-dd")}
            </div>
          </div>

          <div style={{ height: 320, marginTop: 14 }}>
            {loadingSeries ? (
              <div style={{ color: "#6b7280" }}>Se încarcă graficul…</div>
            ) : series.length === 0 ? (
              <div style={{ color: "#6b7280" }}>
                Nu există date în intervalul ales pentru stația selectată.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Nivel (cm)", angle: -90, position: "insideLeft" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: "Temp (°C)", angle: 90, position: "insideRight" }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="nivel_cm"
                    name="Nivel (cm)"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temperatura_c"
                    name="Temperatură (°C)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
