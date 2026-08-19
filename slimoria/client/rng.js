'use strict';

/* ---------------------------------------------------------------------------
 * Gesäter Zufall.
 *
 * Math.random() ist in der Spiel-Logik verboten: eine Aufnahme muss sich
 * beliebig oft identisch wiederholen lassen, sonst vergleicht der Kritiker
 * zwei verschiedene Läufe miteinander und misst Rauschen statt Fortschritt.
 * ------------------------------------------------------------------------- */

const RNG = (() => {
  let s = 0x9e3779b9;

  function seed(v) {
    s = (v >>> 0) || 0x9e3779b9;
    // ein paar Leerläufe, sonst korrelieren benachbarte Startwerte sichtbar
    for (let i = 0; i < 8; i++) next();
  }

  // mulberry32 — klein, schnell, gut genug für Spiellogik
  function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const range = (a, b) => a + next() * (b - a);
  const int = (a, b) => Math.floor(range(a, b + 1));
  const chance = (p) => next() < p;
  const pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];

  return { seed, next, range, int, chance, pick, get state() { return s; } };
})();

if (typeof window !== 'undefined') window.RNG = RNG;
