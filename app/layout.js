import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Platformă Hidrologică Interactivă",
  description: "Monitorizare în timp real: hartă interactivă, nivel, debit, temperatură apă, prognoză meteo, calendar solunar, activitate pești",

  metadataBase: new URL("https://cote.sturgeons.eu"),

  openGraph: {
    title: "PLATFORMĂ HIDROLOGICĂ INTERACTIVĂ",
    description: "Monitorizare în timp real: hartă GIS, niveluri, debite, temperatură apă, prognoză meteo, calendar solunar și activitate pești pe Dunăre și râurile interioare.",
    url: "https://cote.sturgeons.eu",
    siteName: "Platformă Hidrologică Interactivă",
    images: [
      {
        url: "/og-dunare.jpg",
        width: 1200,
        height: 630,
        alt: "Platformă Hidrologică Interactivă – Dunăre și râuri",
      },
    ],
    locale: "ro_RO",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "PLATFORMĂ HIDROLOGICĂ INTERACTIVĂ",
    description: "Monitorizare în timp real: hartă GIS, niveluri, debite, temperatură apă, prognoză meteo, calendar solunar și activitate pești.",
    images: ["/og-dunare.jpg"],
  },
};

// IMPORTANT: oprește pinch-zoom pe toată pagina (mobile)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
