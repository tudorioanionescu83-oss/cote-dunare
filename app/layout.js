import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Cotele Dunării",
  description: "Platformă Interactivă - Date în timp real",

  metadataBase: new URL("https://cote.sturgeons.eu"),

  openGraph: {
    title: "COTELE DUNĂRII",
    description: "Informații hidrologice pe Dunăre: stații, hartă, grafice și variații.",
    url: "https://cote.sturgeons.eu",
    siteName: "Cotele Dunării",
    images: [
      {
        url: "/og-dunare.jpg",
        width: 1200,
        height: 630,
        alt: "Cotele Dunării – informații hidrologice",
      },
    ],
    locale: "ro_RO",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "COTELE DUNĂRII",
    description: "Informații hidrologice pe Dunăre: stații, hartă, grafice și variații.",
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
