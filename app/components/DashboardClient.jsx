"use client";

import { useEffect, useMemo, useState } from "react";
import MapView from "./MapView";
import StationPanel from "./StationPanel";

async function fetchJSON(url) {
  // cache buster + no-store
  const u = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
  const r = await fetch(u, { cache: "no-store", headers: { "Cache-Control": "no-store" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export default function DashboardClient() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(""); // STRING, NU obiect
  const [latestByStation, setLatestByStation] = useState({});
  const [series, setSeries] = useState([]);
  const [days, setDays] = useState(30);

  const [wiki, setWiki] = useState(null);
  const selectedMeta = useMemo(
    () => stations.find((s) => s.name === selectedStation) || null,
    [stations, selectedStation]
  );

  // load stations + latest
  useEffect(() => {
    (async () => {
      const s = await fetchJSON("/api/stations");
      setStations(s.stations || []);
      // default station
      const first = (s.stations || [])[0]?.name || "";
      setSelectedStation((prev) => prev || first);

      const l = await fetchJSON("/api/latest");
      setLatestByStation(l.latestByStation || {});
    })().catch(console.error);
  }, []);

  // refresh latest periodic (ca să se updateze și panoul + harta)
  useEffect(() => {
    const id = setInterval(() => {
      fetchJSON("/api/latest")
        .then((l) => setLatestByStation(l.latestByStation || {}))
        .catch(() => {});
    }, 60_000); // 1 minut
    return () => clearInterval(id);
  }, []);

  // load measurements when selected/days changes
  useEffect(() => {
    if (!selectedStation) return;
    fetchJSON(`/api/measurements?station=${encodeURIComponent(selectedStation)}&days=${days}`)
      .then((j) => setSeries(j.series || []))
      .catch((e) => {
        console.error(e);
        setSeries([]);
      });
  }, [selectedStation, days]);

  // load wiki for selected station
  useEffect(() => {
    if (!selectedMeta?.wikiTitle) {
      setWiki(null);
      return;
    }
    fetchJSON(`/api/wiki?title=${encodeURIComponent(selectedMeta.wikiTitle)}`)
      .then(setWiki)
      .catch(() => setWiki(null));
  }, [selectedMeta?.wikiTitle]);

  const latest = latestByStation?.[selectedStation] || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100 backdrop-blur">
              <div className="text-lg font-semibold text-slate-900">Cotele Dunării</div>
              <div className="text-xs text-slate-500">Stații • hartă • grafice</div>

              <div className="mt-4">
                <label className="text-xs font-medium text-slate-700">Caută stația</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                >
                  {stations.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <div className="mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                    roșu = variație negativă
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    verde = variație pozitivă
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-800" />
                    negru = variație 0
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                    gri = fără date
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <MapView
              stations={stations}
              latestByStation={latestByStation}
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
            />
          </div>

          <div className="lg:col-span-12">
            <StationPanel
              stations={stations}
              selectedStation={selectedStation}
              latestByStation={latestByStation}
              latest={latest}
              series={series}
              days={days}
              setDays={setDays}
              wiki={wiki}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
