"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import MapView from "./MapView";
import StationPanel from "./StationPanel";

async function fetchJSON(url) {
  const u = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
  const r = await fetch(u, { cache: "no-store", headers: { "Cache-Control": "no-store" } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// UTC-safe diff days
function diffDaysUTC(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return NaN;
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return (toUTC - fromUTC) / (1000 * 60 * 60 * 24);
}

export default function DashboardClient() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(""); // STRING
  const [latestByStation, setLatestByStation] = useState({});
  const [series, setSeries] = useState([]);

  // preset
  const [days, setDays] = useState(30);

  // custom range
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState(""); // YYYY-MM-DD
  const [customTo, setCustomTo] = useState(""); // YYYY-MM-DD

  // wiki (optional, îl ții dacă vrei)
  const [wiki, setWiki] = useState(null);

  const stationObj = useMemo(
    () => stations.find((s) => s.name === selectedStation) || null,
    [stations, selectedStation]
  );

  const latest = latestByStation?.[selectedStation] || null;

  const fetchMeasurements = useCallback(
    async ({ days: d, from, to } = {}) => {
      if (!selectedStation) return;

      let url = `/api/measurements?station=${encodeURIComponent(selectedStation)}`;

      if (from && to) {
        url += `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      } else {
        const dd = Number.isFinite(d) ? d : days;
        url += `&days=${encodeURIComponent(dd)}`;
      }

      const j = await fetchJSON(url);
      setSeries(j.series || []);
    },
    [selectedStation, days]
  );

  // load stations + latest
  useEffect(() => {
    (async () => {
      const s = await fetchJSON("/api/stations");
      setStations(s.stations || []);

      const first = (s.stations || [])[0]?.name || "";
      setSelectedStation((prev) => prev || first);

      const l = await fetchJSON("/api/latest");
      setLatestByStation(l.latestByStation || {});
    })().catch(console.error);
  }, []);

  // refresh latest periodic
  useEffect(() => {
    const id = setInterval(() => {
      fetchJSON("/api/latest")
        .then((l) => setLatestByStation(l.latestByStation || {}))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // load measurements when station/days/range changes
  useEffect(() => {
    if (!selectedStation) return;

    if (useCustomRange && customFrom && customTo) {
      fetchMeasurements({ from: customFrom, to: customTo }).catch((e) => {
        console.error(e);
        setSeries([]);
      });
      return;
    }

    fetchMeasurements({ days }).catch((e) => {
      console.error(e);
      setSeries([]);
    });
  }, [selectedStation, days, useCustomRange, customFrom, customTo, fetchMeasurements]);

  // load wiki for selected station (dacă ai wikiTitle în stations.json)
  useEffect(() => {
    if (!stationObj?.wikiTitle) {
      setWiki(null);
      return;
    }
    fetchJSON(`/api/wiki?title=${encodeURIComponent(stationObj.wikiTitle)}`)
      .then(setWiki)
      .catch(() => setWiki(null));
  }, [stationObj?.wikiTitle]);

  // preset helper (7/30/365)
  const setPresetDays = useCallback((d) => {
    setUseCustomRange(false);
    setCustomFrom("");
    setCustomTo("");
    setDays(d);
  }, []);

  // ✅ callback-ul necesar pentru "Altă perioadă"
  const onPeriodRangeChange = useCallback((from, to) => {
    const dd = diffDaysUTC(from, to);
    if (!(dd >= 1)) return false; // minim 2 zile consecutive

    setCustomFrom(from);
    setCustomTo(to);
    setUseCustomRange(true);
    setDays(null); // resetează perioada preset
    return true;
  }, []);

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
              station={stationObj}
              latest={latest}
              series={series}
              days={days}
              setDays={setPresetDays}
              wiki={wiki}
              onPeriodRangeChange={onPeriodRangeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
