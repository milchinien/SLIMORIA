'use strict';

/* ---------------------------------------------------------------------------
 * Gemeinsame Verformungs-Werkzeuge.
 *
 * GESPERRTE DATEI. Alle Lanes benutzen diese Grundoperationen, damit Fressen,
 * Kampf und Tod denselben Körper auf dieselbe Art anfassen. Wer hier
 * herumschraubt, verändert alle Animationen gleichzeitig.
 *
 * Grundregel für alles hier drin (GDD 01 §66/§67): wir setzen keine Position,
 * wir üben Kräfte und Geschwindigkeiten aus. Der Körper darf immer selbst
 * entscheiden, wie er darauf reagiert — sonst sieht es nach Animation aus,
 * nicht nach Masse.
 * ------------------------------------------------------------------------- */

const Deform = (() => {

  /* Impuls auf den ganzen Körper — Sprung, Rückstoß, Wegschleudern. */
  function impuls(b, dx, dy, dz, staerke) {
    const l = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / l * staerke, uy = dy / l * staerke, uz = dz / l * staerke;
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      b.vel[k] += ux; b.vel[k + 1] += uy; b.vel[k + 2] += uz;
    }
  }

  /* Nur die Punkte, die in eine Richtung zeigen, bekommen den Impuls.
   * Damit schnellt die Masse nach vorn, während der Rest zurückbleibt —
   * das ist der Kern des Fress-Anlaufs (GDD 01 §27). */
  function impulsGerichtet(b, dx, dy, dz, staerke, schaerfe = 2) {
    const l = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / l, uy = dy / l, uz = dz / l;
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const d = b.base[k] * ux + b.base[k + 1] * uy + b.base[k + 2] * uz;
      if (d <= 0) continue;
      const w = Math.pow(d, schaerfe) * staerke;
      b.vel[k] += ux * w; b.vel[k + 1] += uy * w; b.vel[k + 2] += uz * w;
    }
  }

  /* Zieht Punkte zu einem Weltpunkt. `radius` begrenzt die Wirkung, `staerke`
   * ist eine Rate pro Sekunde (mit dt multiplizieren). */
  function ziehenZu(b, x, y, z, staerke, dt, radius = Infinity) {
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const dx = x - b.pos[k], dy = y - b.pos[k + 1], dz = z - b.pos[k + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      if (d > radius) continue;
      const w = staerke * dt;
      b.vel[k] += dx / d * w; b.vel[k + 1] += dy / d * w; b.vel[k + 2] += dz / d * w;
    }
  }

  /* Legt den Körper als Hülle um einen Punkt: jeder Punkt wird auf eine
   * Kugelschale mit `schale` Radius um (x,y,z) gezogen. Das ist das
   * Umschlingen aus GDD 01 §28 — der Gegner steckt danach sichtbar drin. */
  function huelleUm(b, x, y, z, schale, staerke, dt, mischung = 1) {
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const dx = b.pos[k] - x, dy = b.pos[k + 1] - y, dz = b.pos[k + 2] - z;
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const ziel = schale;
      const fehl = (ziel - d) * mischung;
      const w = staerke * dt;
      b.vel[k] += dx / d * fehl * w;
      b.vel[k + 1] += dy / d * fehl * w;
      b.vel[k + 2] += dz / d * fehl * w;
    }
  }

  /* Staucht entlang einer Achse und breitet quer dazu aus — Volumen bleibt
   * grob erhalten. Für Aufprall-Betonung und den Biss-Rückschlag. */
  function stauchen(b, ax, ay, az, faktor, staerke, dt) {
    const l = Math.hypot(ax, ay, az) || 1;
    const ux = ax / l, uy = ay / l, uz = az / l;
    const quer = 1 / Math.sqrt(Math.max(faktor, 0.05));
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const ox = b.pos[k] - b.cx, oy = b.pos[k + 1] - b.cy, oz = b.pos[k + 2] - b.cz;
      const entlang = ox * ux + oy * uy + oz * uz;
      const qx = ox - entlang * ux, qy = oy - entlang * uy, qz = oz - entlang * uz;
      const zx = entlang * faktor * ux + qx * quer;
      const zy = entlang * faktor * uy + qy * quer;
      const zz = entlang * faktor * uz + qz * quer;
      const w = staerke * dt;
      b.vel[k] += (zx - ox) * w; b.vel[k + 1] += (zy - oy) * w; b.vel[k + 2] += (zz - oz) * w;
    }
  }

  /* Unruhe auf der Oberfläche. Für das Zittern vor dem Platzen (GDD 01 §50)
   * und für die Anspannung kurz vor dem Zuschnappen. */
  function zittern(b, amplitude, frequenz, time, dt) {
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      // Aus der Grundrichtung abgeleitet: kein Zufall, damit Aufnahmen
      // wiederholbar bleiben.
      const ph = (b.base[k] * 12.9898 + b.base[k + 1] * 78.233 + b.base[k + 2] * 37.719);
      const s = Math.sin(ph * 43758.5453 % 6.28318 + time * frequenz);
      const w = amplitude * s * dt;
      b.vel[k] += b.base[k] * w;
      b.vel[k + 1] += b.base[k + 1] * w;
      b.vel[k + 2] += b.base[k + 2] * w;
    }
  }

  /* Radial nach außen sprengen — das Platzen. Danach hält nichts mehr die
   * Form zusammen; der Aufrufer muss die Formfedern weich stellen. */
  function platzen(b, staerke, aufwaerts = 0.45) {
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const seit = Math.hypot(b.base[k], b.base[k + 2]) || 1e-6;
      const w = staerke * (0.55 + 0.45 * seit);
      b.vel[k] += b.base[k] * w;
      b.vel[k + 1] += (b.base[k + 1] * 0.3 + aufwaerts) * w;
      b.vel[k + 2] += b.base[k + 2] * w;
    }
  }

  /* Achsmaße der aktuellen Hülle relativ zum Schwerpunkt. Grundlage aller
   * Messwerte, mit denen der Kritiker Squash-Verhältnisse nachprüft. */
  function masse(b, fx = 1, fz = 0) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, minz = 1e9, maxz = -1e9;
    let vorne = 0, hinten = 0, links = 0, rechts = 0;
    const sx = -fz, sz = fx;
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const x = b.pos[k], y = b.pos[k + 1], z = b.pos[k + 2];
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (z < minz) minz = z; if (z > maxz) maxz = z;
      const ox = x - b.cx, oz = z - b.cz;
      const af = ox * fx + oz * fz, as = ox * sx + oz * sz;
      if (af > vorne) vorne = af;
      if (-af > hinten) hinten = -af;
      if (as > rechts) rechts = as;
      if (-as > links) links = -as;
    }
    const laengs = vorne + hinten, quer = links + rechts;
    return {
      w: maxx - minx, h: maxy - miny, d: maxz - minz,
      oben: maxy - b.cy, unten: b.cy - miny,
      vorne, hinten, links, rechts,
      laengs, quer,
      streckung: quer > 1e-6 ? laengs / quer : 1,
    };
  }

  return { impuls, impulsGerichtet, ziehenZu, huelleUm, stauchen, zittern, platzen, masse };
})();

if (typeof window !== 'undefined') window.Deform = Deform;
