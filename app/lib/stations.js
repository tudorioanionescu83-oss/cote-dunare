// app/lib/stations.js

// transformă numele stației în slug pt. poze: "Drobeta Turnu Severin" -> "drobeta-turnu-severin"
export function stationSlug(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritice
    .replace(/[^a-z0-9]+/g, "-")     // spații/simboluri -> "-"
    .replace(/(^-|-$)/g, "");        // fără "-" la capete
}

// parse safe pentru numere (vine uneori string/null)
export function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// culoare marker în funcție de Δ (variatie_cm)
export function colorFromDelta(delta) {
  if (delta === null || delta === undefined) return "#9ca3af"; // gri
  if (delta > 0) return "#16a34a"; // verde
  if (delta < 0) return "#dc2626"; // roșu
  return "#111827"; // negru la 0
}

// === LISTA TA COMPLETĂ (23) ===
// Coordonatele sunt “city center” (suficient pentru hartă). Drencova e exact cum ai dat-o tu.
export const STATIONS = [
  { name: "Sulina", lat: 45.1567, lng: 29.6527 },
  { name: "Tulcea", lat: 45.1797, lng: 28.8050 },
  { name: "Isaccea", lat: 45.2686, lng: 28.4628 },
  { name: "Galati", lat: 45.4353, lng: 28.0080 },
  { name: "Braila", lat: 45.2692, lng: 27.9575 },
  { name: "Harsova", lat: 44.6833, lng: 27.9500 },
  { name: "Cernavoda", lat: 44.3393, lng: 28.0366 },
  { name: "Calarasi", lat: 44.2053, lng: 27.3263 },
  { name: "Oltenita", lat: 44.0860, lng: 26.6370 },
  { name: "Giurgiu", lat: 43.9037, lng: 25.9699 },
  { name: "Zimnicea", lat: 43.6560, lng: 25.3640 },
  { name: "Turnu Magurele", lat: 43.7517, lng: 24.8686 },
  { name: "Corabia", lat: 43.7765, lng: 24.5037 },
  { name: "Bechet", lat: 43.7816, lng: 23.9552 },
  { name: "Rast", lat: 43.8918, lng: 23.2836 },
  { name: "Calafat", lat: 43.9896, lng: 22.9341 },
  { name: "Cetate", lat: 44.1050, lng: 23.0500 },
  { name: "Gruia", lat: 44.2640, lng: 22.7020 },
  { name: "Drobeta Turnu Severin", lat: 44.6369, lng: 22.6597 },
  { name: "Orsova", lat: 44.7256, lng: 22.3961 },
  { name: "Drencova", lat: 44.63535, lng: 21.97545 }, // exact cum ai dat
  { name: "Moldova Veche", lat: 44.7259, lng: 21.6666 },
  { name: "Bazias", lat: 44.8155, lng: 21.3915 },
];

// fallback explicit (ca să nu mai crape dacă importă cineva asta)
export const FALLBACK_STATIONS = STATIONS;
