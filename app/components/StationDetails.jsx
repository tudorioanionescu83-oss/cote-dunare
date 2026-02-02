"use client";

export default function StationDetails({ station, latestRow }) {
  if (!station) {
    return (
      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        Alege o stație.
      </div>
    );
  }

  const val = (x) => (x === null || x === undefined ? "—" : x);

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {station.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={station.photoUrl}
            alt={station.name}
            style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 10 }}
          />
        ) : (
          <div style={{ width: 180, height: 120, background: "#f2f2f2", borderRadius: 10 }} />
        )}

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{station.name}</div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            Lat: {station.lat} | Lng: {station.lng} | Km: {val(station.km)}
          </div>

          {station.wikiUrl ? (
            <div style={{ marginTop: 8 }}>
              <a href={station.wikiUrl} target="_blank" rel="noreferrer">
                Wikipedia
              </a>
            </div>
          ) : null}

          <hr style={{ margin: "10px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 6 }}>
            <div>Ultima citire</div>
            <div style={{ fontWeight: 600 }}>{val(latestRow?.date)}</div>

            <div>Nivel</div>
            <div>
              <b>{val(latestRow?.level)}</b>{" "}
              <span style={{ opacity: 0.75 }}>Δ {val(latestRow?.dLevel)}</span>
            </div>

            <div>Temp</div>
            <div>
              <b>{val(latestRow?.temp)}</b>{" "}
              <span style={{ opacity: 0.75 }}>Δ {val(latestRow?.dTemp)}</span>
            </div>

            <div>Km (din măsurare)</div>
            <div>{val(latestRow?.km)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
