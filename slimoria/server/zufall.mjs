/* ---------------------------------------------------------------------------
 * Gesaeter Zufall des Servers.
 *
 * Math.random() ist auch hier verboten (ARCHITEKTUR.md §2). Der Server
 * wuerfelt den Fressversuch (GDD 11 §34–35) — und genau dieser Wurf muss
 * nachpruefbar sein: derselbe Charakter, derselbe Startwert, derselbe
 * Wurfzaehler ergeben immer dasselbe Ergebnis.
 *
 * Wichtig ist die Trennung der Straenge: jeder Charakter hat seinen eigenen
 * Wurfstrom. Sonst haengt das Ergebnis eines Spielers davon ab, was ein
 * zweiter Spieler im selben Moment tut — der Nachweis waere dann nicht
 * wiederholbar und die Reihenfolge im Netz wuerde mitwuerfeln.
 * ------------------------------------------------------------------------- */

/* mulberry32 — derselbe Generator wie in client/rng.js, damit Server und
 * Client bei gleichem Startwert dieselbe Zahlenfolge sehen. */
export function mulberry32(startwert) {
  let s = startwert >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* FNV-1a: klein und stabil ueber Neustarts hinweg. Ein Hash aus der
 * Standardbibliothek waere hier egal — er muss nur immer gleich sein. */
export function textHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* Ein einzelner, reproduzierbarer Wurf. Kein Zustand, keine Reihenfolge —
 * nur die drei Eingaben zaehlen. */
export function wurf(startwert, name, zaehler) {
  const s = (textHash(name) ^ (startwert >>> 0) ^ Math.imul(zaehler + 1, 0x9e3779b1)) >>> 0;
  const next = mulberry32(s);
  next(); next();          // zwei Leerlaeufe: benachbarte Zaehler korrelieren sonst
  return next();
}
