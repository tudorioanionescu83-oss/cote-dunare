// app/layout.js
// Server Component (no "use client") – sets correct mobile viewport & safe area.

export const metadata = {
  title: "Cote Dunare",
  description: "Platformă hidrologică interactivă",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body style={{
        margin: 0,
        padding: 0,
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        background: "#f8fafc",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "clip",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}>
          {children}
        </div>
      </body>
    </html>
  );
}
