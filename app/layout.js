import "./globals.css";
import "leaflet/dist/leaflet.css";

/* ===== Metadata existent ===== */
export const metadata = {
  title: "Cotele Dunării",
  description: "Platformă Interactivă - Date în timp real",
};

/* ===== Viewport: blochează zoom-ul paginii, NU al hărții ===== */
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
