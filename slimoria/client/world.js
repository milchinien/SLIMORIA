'use strict';

/* ---------------------------------------------------------------------------
 * Die Testarena.
 *
 * GESPERRT. Bewusst schlicht: eine Ebene, ein paar Felsen, eine enge Passage,
 * ein Plateau zum Runterspringen und ein Friedhof. GDD 12 §4 verlangt "einfache
 * Testfläche" — mehr Welt würde nur davon ablenken, ob sich der Schleim gut
 * anfühlt.
 * ------------------------------------------------------------------------- */

const WELT = {
  bounds: 26,
  // Der Friedhof ist der Ort, an dem man nach dem Tod aufwacht (GDD 01 §51).
  // Er war bisher nur eine Koordinate und ein Bodenring — man erkannte beim
  // Respawn nicht, dass man irgendwo angekommen ist. Jetzt steht er als Ort
  // in der Welt: eine Senke, von Steinen gefasst, mit einem Mal in der Mitte.
  friedhof: { x: -18, z: -18, r: 4.2, spawn: { x: -17.2, z: -16.4 } },
  obstacles: [
    { type: 'rock', x: -7, y: 0.5, z: -4, r: 1.8 },
    { type: 'rock', x: 6, y: 0.4, z: -8, r: 1.4 },
    { type: 'rock', x: 12, y: 0.7, z: 3, r: 2.4 },
    { type: 'rock', x: -3, y: 0.3, z: 11, r: 1.1 },
    { type: 'rock', x: 1.5, y: 0.25, z: -2.5, r: 0.9 },
    { type: 'rock', x: -14, y: 0.5, z: 7, r: 1.6 },
    // Enge Passage: schmaler als der Schleim — er muss sich durchquetschen
    // (GDD 01 §17). Wandklettern ist ausgeschlossen, die Wände sind massiv.
    { type: 'wall', x: -5.4, y: 0.8, z: 14, w: 9, h: 1.6, d: 0.9 },
    { type: 'wall', x: 5.4, y: 0.8, z: 14, w: 9, h: 1.6, d: 0.9 },
    // Plateau zum Runterspringen — Aufprall aus Höhe (GDD 01 §20).
    { type: 'wall', x: -13, y: 0.6, z: -12, w: 7, h: 1.2, d: 7 },

    // Friedhof: ein Kranz aus Findlingen um die Senke, dazu ein aufrechtes Mal.
    // Bewusst lueckenhaft — der Schleim muss hineinkommen, nicht eingesperrt
    // werden (GDD 01 §67: die Kontrolle geht nie verloren).
    { type: 'rock', x: -21.6, y: 0.35, z: -18.0, r: 1.05 },
    { type: 'rock', x: -19.8, y: 0.30, z: -21.3, r: 0.85 },
    { type: 'rock', x: -16.2, y: 0.32, z: -21.5, r: 0.95 },
    { type: 'rock', x: -14.5, y: 0.28, z: -18.6, r: 0.80 },
    { type: 'rock', x: -15.9, y: 0.34, z: -15.0, r: 0.90 },
    { type: 'rock', x: -20.4, y: 0.30, z: -14.8, r: 0.88 },
    { type: 'wall', x: -18, y: 0.95, z: -18, w: 0.55, h: 1.9, d: 0.55 },
  ],
  // Ruhepunkte, an denen Kreaturen erscheinen (GDD 01 §70 Punkt 9/18).
  spawns: [
    { x: 8, z: 2 }, { x: -9, z: 3 }, { x: 3, z: -9 },
    { x: 14, z: -6 }, { x: -6, z: -11 }, { x: 11, z: 10 },
  ],
};

/* Höhe des begehbaren Bodens an einer Stelle — im Prototyp die Ebene plus
 * Plateau-Oberkanten. Wird für Kreaturen und für die Zielmarkierung gebraucht. */
function bodenHoehe(x, z) {
  let h = 0;
  for (const o of WELT.obstacles) {
    if (o.type !== 'wall') continue;
    const hx = o.w * 0.5, hz = o.d * 0.5;
    if (Math.abs(x - o.x) <= hx && Math.abs(z - o.z) <= hz) {
      h = Math.max(h, o.y + o.h * 0.5);
    }
  }
  return h;
}

function istFrei(x, z, r) {
  for (const o of WELT.obstacles) {
    if (o.type === 'rock') {
      if (Math.hypot(x - o.x, z - o.z) < o.r + r) return false;
    } else {
      if (Math.abs(x - o.x) < o.w * 0.5 + r && Math.abs(z - o.z) < o.d * 0.5 + r) return false;
    }
  }
  return Math.abs(x) < WELT.bounds - r && Math.abs(z) < WELT.bounds - r;
}

if (typeof window !== 'undefined') {
  window.WELT = WELT;
  window.bodenHoehe = bodenHoehe;
  window.istFrei = istFrei;
}
