 applibstations.js

 transformă numele stației în slug pt. poze Drobeta Turnu Severin - drobeta-turnu-severin
export function stationSlug(name = ) {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize(NFD)
    .replace([u0300-u036f]g, )  diacritice
    .replace([^a-z0-9]+g, -)      spațiisimboluri - -
    .replace((^--$)g, );         fără - la capete
}

 Lista completă (23) - IMPORTANT name să fie exact ca în DB (cote_dunare_zi.localitatea)
export const STATIONS = [
  { name Sulina, lat 45.1560, lng 29.6530 },
  { name Tulcea, lat 45.1716, lng 28.7914 },
  { name Isaccea, lat 45.2690, lng 28.4580 },
  { name Galati, lat 45.4350, lng 28.0490 },
  { name Braila, lat 45.2692, lng 27.9575 },
  { name Harsova, lat 44.6850, lng 27.9480 },
  { name Cernavoda, lat 44.3390, lng 28.0360 },
  { name Calarasi, lat 44.2053, lng 27.3263 },
  { name Oltenita, lat 44.0850, lng 26.6380 },
  { name Giurgiu, lat 43.9037, lng 25.9699 },
  { name Zimnicea, lat 43.6560, lng 25.3690 },
  { name Turnu Magurele, lat 43.7460, lng 24.8720 },
  { name Corabia, lat 43.7750, lng 24.5030 },
  { name Bechet, lat 43.7830, lng 23.9580 },
  { name Rast, lat 43.8880, lng 23.2700 },
  { name Calafat, lat 43.9910, lng 22.9320 },
  { name Cetate, lat 44.1710, lng 22.8600 },
  { name Gruia, lat 44.2630, lng 22.7050 },
  { name Drobeta Turnu Severin, lat 44.6369, lng 22.6597 },
  { name Orsova, lat 44.7250, lng 22.3960 },
  { name Drencova, lat 44.63535, lng 21.97545 },  coordonata ta
  { name Moldova Veche, lat 44.7360, lng 21.6660 },
  { name Bazias, lat 44.8160, lng 21.3900 },
];

 fallback explicit (ca să nu crape dacă importă cineva asta)
export const FALLBACK_STATIONS = STATIONS;

 normalizează variația (poate veni stringnull)
export function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n)  n  null;
}

 culoare marker din variație
 0 roșu, 0 verde, =0 gri
export function colorFromDelta(delta) {
  const d = toNumberOrNull(delta);
  if (d === null) return #6b7280;         gri
  if (d  0) return #16a34a;              verde
  if (d  0) return #dc2626;              roșu
  return #6b7280;                          0 - gri
}
