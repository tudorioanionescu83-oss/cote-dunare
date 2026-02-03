"use client";

import { useEffect, useState } from "react";
import stations from "../../data/stations.json";
import WeatherWidget from "./WeatherWidget";

export default function WeatherPanel() {
  const [station, setStation] = useState(stations[0]);
  const [weather, setWeather] = useState({ ok: false });

  useEffect(() => {
    if (!station) return;

    const url =
      `/api/weather?lat=${station.lat}` +
      `&lng=${station.lng}` +
      `&icao=${station.icao || ""}`;

    fetch(url)
      .then((r) => r.json())
      .then(setWeather)
      .catch(() => setWeather({ ok: false }));
  }, [station]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <select
        value={station.name}
        onChange={(e) =>
          setStation(stations.find((s) => s.name === e.target.value))
        }
      >
        {stations.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>

      <WeatherWidget weather={weather} />
    </div>
  );
}
