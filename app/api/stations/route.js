import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATIONS = [
  { name: "Bazias", km: 1072, lat: 44.8166, lng: 21.3899, wikiTitle: "Baziaș", photoUrl: "/stations/placeholder.jpg" },
  { name: "Moldova Veche", km: 1048, lat: 44.7342, lng: 21.6201, wikiTitle: "Moldova Veche", photoUrl: "/stations/placeholder.jpg" },
  { name: "Drencova", km: 1015, lat: 44.6383, lng: 21.9739, wikiTitle: "Drencova", photoUrl: "/stations/placeholder.jpg" },
  { name: "Orsova", km: 954, lat: 44.7253, lng: 22.3961, wikiTitle: "Orșova", photoUrl: "/stations/placeholder.jpg", icao: "LROM" },
  { name: "Drobeta Turnu Severin", km: 931, lat: 44.6319, lng: 22.6561, wikiTitle: "Drobeta-Turnu Severin", photoUrl: "/stations/placeholder.jpg", icao: "LROM" },

  { name: "Gruia", km: 851, lat: 44.2675, lng: 22.7047, wikiTitle: "Gruia, Mehedinți", photoUrl: "/stations/placeholder.jpg" },
  { name: "Cetate", km: 811, lat: 44.1053, lng: 23.0512, wikiTitle: "Cetate, Dolj", photoUrl: "/stations/placeholder.jpg" },
  { name: "Calafat", km: 795, lat: 43.9907, lng: 22.9333, wikiTitle: "Calafat", photoUrl: "/stations/placeholder.jpg" },
  { name: "Rast", km: 738, lat: 43.8830, lng: 23.2830, wikiTitle: "Rast", photoUrl: "/stations/placeholder.jpg" },
  { name: "Bechet", km: 679, lat: 43.7843, lng: 23.9597, wikiTitle: "Bechet", photoUrl: "/stations/placeholder.jpg" },
  { name: "Corabia", km: 630, lat: 43.7736, lng: 24.5033, wikiTitle: "Corabia", photoUrl: "/stations/placeholder.jpg" },

  { name: "Turnu Magurele", km: 597, lat: 43.7469, lng: 24.8685, wikiTitle: "Turnu Măgurele", photoUrl: "/stations/placeholder.jpg" },
  { name: "Zimnicea", km: 554, lat: 43.6566, lng: 25.3660, wikiTitle: "Zimnicea", photoUrl: "/stations/placeholder.jpg" },
  { name: "Giurgiu", km: 493, lat: 43.8833, lng: 25.9667, wikiTitle: "Giurgiu", photoUrl: "/stations/placeholder.jpg", icao: "LROP" },

  { name: "Oltenita", km: 430, lat: 44.0833, lng: 26.6333, wikiTitle: "Oltenița", photoUrl: "/stations/placeholder.jpg" },
  { name: "Calarasi", km: 370, lat: 44.2051, lng: 27.3136, wikiTitle: "Călărași", photoUrl: "/stations/placeholder.jpg" },

  { name: "Cernavoda", km: 300, lat: 44.3396, lng: 28.0327, wikiTitle: "Cernavodă", photoUrl: "/stations/placeholder.jpg", icao: "LRCK" },
  { name: "Harsova", km: 253, lat: 44.6831, lng: 27.9482, wikiTitle: "Hârșova", photoUrl: "/stations/placeholder.jpg" },

  { name: "Braila", km: 170, lat: 45.2715, lng: 27.9743, wikiTitle: "Brăila", photoUrl: "/stations/placeholder.jpg" },
  { name: "Galati", km: 150, lat: 45.4500, lng: 28.0500, wikiTitle: "Galați", photoUrl: "/stations/placeholder.jpg" },

  { name: "Isaccea", km: 103, lat: 45.2697, lng: 28.4597, wikiTitle: "Isaccea", photoUrl: "/stations/placeholder.jpg" },
  { name: "Tulcea", km: 71, lat: 45.1787, lng: 28.8050, wikiTitle: "Tulcea", photoUrl: "/stations/placeholder.jpg", icao: "LRTC" },
  { name: "Sulina", km: 0, lat: 45.1567, lng: 29.6596, wikiTitle: "Sulina", photoUrl: "/stations/placeholder.jpg" }
];

export async function GET() {
  return NextResponse.json(
    { stations: STATIONS },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  );
}
