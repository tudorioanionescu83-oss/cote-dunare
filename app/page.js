'use client';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #f9fafb, #e0f2fe)',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header
          style={{
            textAlign: 'center',
            marginBottom: '60px',
          }}
        >
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '16px',
            }}
          >
            Cotele Dunării
          </h1>
          <p
            style={{
              fontSize: '20px',
              color: '#64748b',
            }}
          >
            Platformă Interactivă - Date în Timp Real
          </p>
        </header>

        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            marginBottom: '40px',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1e293b',
              marginBottom: '20px',
            }}
          >
            🚧 Site în Construcție
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#64748b',
              lineHeight: '1.6',
            }}
          >
            Platforma pentru monitorizarea cotelor Dunării este în curs de dezvoltare.
            <br />
            <br />
            <strong>Funcționalități viitoare:</strong>
          </p>
          <ul
            style={{
              marginTop: '20px',
              marginLeft: '20px',
              color: '#64748b',
              lineHeight: '1.8',
            }}
          >
            <li>📊 Date în timp real de la toate stațiile AFDJ</li>
            <li>🗺️ Hartă interactivă a Dunării</li>
            <li>📈 Grafice istorice personalizabile</li>
            <li>🌡️ Date meteo integrate</li>
            <li>📱 Design responsive pentru mobil</li>
          </ul>
        </div>

        <div
          style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '14px',
            marginTop: '40px',
          }}
        >
          <p>© 2025 Aquatic Biodiversity Center | sturgeons.eu</p>
        </div>
      </div>
    </div>
  );
}
