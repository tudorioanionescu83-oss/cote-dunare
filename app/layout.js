import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Cotele Dunării",
  description: "Platformă Interactivă - Date în timp real",
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
