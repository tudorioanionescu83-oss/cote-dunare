// app/lib/cardBackgrounds.js

const A = 0.45; // 40–50% transparență

const rgba = (r, g, b, a = A) => `rgba(${r},${g},${b},${a})`;

// Nivel & Δ
export function trendBg(delta) {
  if (delta > 0) return rgba(34, 197, 94);   // verde
  if (delta < 0) return rgba(239, 68, 68);   // roșu
  return "transparent";                     // neschimbat
}

// Temperatură
export function tempBg(t) {
  if (t < 0)  return rgba(30, 58, 138);   // albastru închis
  if (t < 5)  return rgba(56, 189, 248);  // albastru deschis
  if (t < 10) return rgba(253, 224, 71);  // galben deschis
  if (t < 15) return rgba(234, 179, 8);   // galben mai închis
  if (t < 20) return rgba(249, 115, 22);  // portocaliu
  if (t < 25) return rgba(248, 113, 113); // roșu deschis
  return rgba(185, 28, 28);               // roșu închis
}
