import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATIONS = [
  // COMPLETEAZĂ/VERIFICĂ coordonatele dacă ai altele – astea sunt exemple
  { name: "Bazias", km: 1072, lat: 44.8167, lng: 21.3833, wikiTitle: "Baziaș" },
  { name: "Moldova Veche", km: 1048, lat: 44.723, lng: 21.666, wikiTitle: "Moldova Veche" },
  { name: "Drencova", km: 1015, lat: 44.687, lng: 22.262, wikiTitle: "Drencova" },
  { name: "Orsova", km: 954, lat: 44.725, lng: 22.396, wikiTitle: "Orșova" },
  { name: "Drobeta Turnu Severin", km: 931, lat: 44.636, lng: 22.659, wikiTitle: "Drobeta-Turnu Severin" },
  { name: "Gruia", km: 851, lat: 44.267, lng: 22.708, wikiTitle: "Gruia, Mehedinți" },
  { name: "Cetate", km: 811, lat: 44.1, lng: 23.05, wikiTitle: "Cetate, Dolj" },
  { name: "Calafat", km: 795, lat: 43.99, lng: 22.93, wikiTitle: "Calafat" },
  { name: "Rast", km: 738, lat: 43.88, lng: 23.27, wikiTitle: "Rast" },
  { name: "Bechet", km: 679, lat: 43.78, lng: 23.96, wikiTitle: "Bechet" },
  { name: "Corabia", km: 630, lat: 43.78, lng: 24.5, wikiTitle: "Corabia" },
  { name: "Turnu Magurele", km: 597, lat: 43.75, lng: 24.87, wikiTitle: "Turnu Măgurele" },
  { name: "Zimnicea", km: 554, lat: 43.66, lng: 25.37, wikiTitle: "Zimnicea" },
  { name: "Giurgiu", km: 493, lat: 43.9, lng: 25.97, wikiTitle: "Giurgiu" },
  { name: "Oltenita", km: 430, lat: 44.08, lng: 26.63, wikiTitle: "Oltenița" },
  { name: "Calarasi", km: 370, lat: 44.2, lng: 27.33, wikiTitle: "Călărași" },
  { name: "Cernavoda", km: 300, lat: 44.34, lng: 28.03, wikiTitle: "Cernavodă" },
  { name: "Harsova", km: 253, lat: 44.68, lng: 27.95, wikiTitle: "Hârșova" },
  { name: "Braila", km: 170, lat: 45.27, lng: 27.97, wikiTitle: "Brăila" },
  { name: "Galati", km: 150, lat: 45.43, lng: 28.05, wikiTitle: "Galați" },
  { name: "Isaccea", km: 103, lat: 45.27, lng: 28.46, wikiTitle: "Isaccea" },
  { name: "Tulcea", km: 71, lat: 45.18, lng: 28.8, wikiTitle: "Tulcea" },
  { name: "Sulina", km: 0, lat: 45.16, lng: 29.65, wikiTitle: "Sulina" },
];

export async function GET() {
  return NextResponse.json(
    { stations: STATIONS },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
