export const metadata = {
  title: 'Cotele Dunării - Date în Timp Real',
  description: 'Platformă interactivă cu cotele Dunării de la toate stațiile hidrometrice AFDJ. Date actualizate zilnic.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  )
}
