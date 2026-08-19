'use strict';

/* ---------------------------------------------------------------------------
 * Rahmen: Leinwand, Eingabe, Kamera-Steuerung, Bildschleife, Tuning-Panel.
 *
 * GESPERRTE DATEI. Der Spielzustand liegt in game.js, die Animationen in den
 * Lane-Dateien. Hier steht nur, wie Maus und Tastatur darauf wirken.
 *
 * Im Aufnahmemodus (?capture=1) laeuft KEINE Bildschleife: dann stellt
 * tools/capture.mjs die Uhr von aussen vor. Nur so sind Aufnahmen
 * wiederholbar.
 * ------------------------------------------------------------------------- */

const canvas = document.getElementById('view');
const ANSICHT = { w: 0, h: 0, pw: 0, ph: 0 };
window.ANSICHT = ANSICHT;

const AUFNAHME = new URLSearchParams(location.search).has('capture');

function groesseSetzen() {
  // Im Aufnahmemodus fest auf Geraetepixel = CSS-Pixel: sonst haengt die
  // Bildschaerfe am Monitor der Maschine, die gerade aufnimmt.
  const dpr = AUFNAHME ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  ANSICHT.w = canvas.clientWidth;
  ANSICHT.h = canvas.clientHeight;
  ANSICHT.pw = Math.round(ANSICHT.w * dpr);
  ANSICHT.ph = Math.round(ANSICHT.h * dpr);
  canvas.width = ANSICHT.pw;
  canvas.height = ANSICHT.ph;
}
groesseSetzen();

window.SLIMORIA.R = spielAufbauen(canvas);
UI.bauen();

/* --- Zeigerstrahlen -------------------------------------------------------- */

function strahl(sx, sy) {
  const m = G.kamera.invViewProj;
  const ndcX = (sx / ANSICHT.w) * 2 - 1;
  const ndcY = 1 - (sy / ANSICHT.h) * 2;
  const un = (z) => {
    const x = m[0]*ndcX + m[4]*ndcY + m[8]*z + m[12];
    const y = m[1]*ndcX + m[5]*ndcY + m[9]*z + m[13];
    const w = m[3]*ndcX + m[7]*ndcY + m[11]*z + m[15];
    const zz = m[2]*ndcX + m[6]*ndcY + m[10]*z + m[14];
    return [x / w, y / w, zz / w];
  };
  const a = un(-1), b = un(1);
  const d = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  return { o: a, d: [d[0]/l, d[1]/l, d[2]/l] };
}

function aufBoden(r) {
  if (Math.abs(r.d[1]) < 1e-5) return null;
  const t = -r.o[1] / r.d[1];
  if (t < 0) return null;
  return { x: r.o[0] + r.d[0] * t, z: r.o[2] + r.d[2] * t };
}

/* Naechste Kreatur unter dem Zeiger — grosszuegig, damit Anvisieren nicht
 * zur Praezisionsuebung wird (GDD 10 §71: Zielauswahl muss verlaesslich sein). */
function kreaturUnter(r) {
  let beste = null, bestT = Infinity;
  for (const k of G.kreaturen) {
    if (!k.lebt) continue;
    const cx = k.x, cy = k.y + k.groesse * 0.8, cz = k.z;
    const ox = cx - r.o[0], oy = cy - r.o[1], oz = cz - r.o[2];
    const t = ox * r.d[0] + oy * r.d[1] + oz * r.d[2];
    if (t < 0) continue;
    const px = ox - r.d[0] * t, py = oy - r.d[1] * t, pz = oz - r.d[2] * t;
    if (Math.hypot(px, py, pz) < k.groesse * 1.7 && t < bestT) { bestT = t; beste = k; }
  }
  return beste;
}

function punktAmKoerper(r) {
  const b = G.slime.body;
  let best = -1, bestD = Infinity, bestT = 0;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const ox = b.pos[k] - r.o[0], oy = b.pos[k+1] - r.o[1], oz = b.pos[k+2] - r.o[2];
    const t = ox * r.d[0] + oy * r.d[1] + oz * r.d[2];
    if (t < 0) continue;
    const d = Math.hypot(ox - r.d[0]*t, oy - r.d[1]*t, oz - r.d[2]*t);
    if (d < bestD) { bestD = d; best = i; bestT = t; }
  }
  return { i: best, d: bestD, t: bestT };
}

/* --- Eingabe --------------------------------------------------------------- */

const tasten = new Set();
const zeiger = { orbit: false, gehen: false, lastX: 0, lastY: 0 };

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  zeiger.lastX = e.offsetX; zeiger.lastY = e.offsetY;
  const r = strahl(e.offsetX, e.offsetY);

  if (e.button === 1) { zeiger.orbit = true; return; }

  if (e.button === 2) {
    // Rechtsklick: zielorientierte Aktion (GDD 02 §4, GDD 10 §151).
    const k = kreaturUnter(r);
    if (k) { G.zielId = k.id; G.autoAngriff = true; }
    else zeiger.orbit = true;
    return;
  }

  if (e.button === 0) {
    if (e.shiftKey) {                       // Zupfen (nur zum Ausprobieren)
      const hit = punktAmKoerper(r);
      if (hit.d < PARAMS.radius * 0.6) {
        G.slime.grab = { i: hit.i, t: hit.t,
          x: r.o[0] + r.d[0]*hit.t, y: r.o[1] + r.d[1]*hit.t, z: r.o[2] + r.d[2]*hit.t };
      }
      return;
    }
    const k = kreaturUnter(r);
    if (k) { G.zielId = k.id; return; }     // Linksklick waehlt aus (§3)
    const g = aufBoden(r);
    if (g) { G.slime.target = g; G.autoAngriff = false; zeiger.gehen = true; }
  }
});

canvas.addEventListener('pointermove', e => {
  const dx = e.offsetX - zeiger.lastX, dy = e.offsetY - zeiger.lastY;
  zeiger.lastX = e.offsetX; zeiger.lastY = e.offsetY;

  if (zeiger.orbit) {
    G.kamera.yaw += dx * 0.006;
    G.kamera.pitch += dy * 0.005;
    return;
  }
  const r = strahl(e.offsetX, e.offsetY);
  if (G.slime.grab) {
    const t = G.slime.grab.t;
    G.slime.grab.x = r.o[0] + r.d[0] * t;
    G.slime.grab.y = Math.max(0.05, r.o[1] + r.d[1] * t);
    G.slime.grab.z = r.o[2] + r.d[2] * t;
  } else if (zeiger.gehen) {
    const g = aufBoden(r);
    if (g) G.slime.target = g;
  }
});

window.addEventListener('pointerup', () => {
  zeiger.orbit = false; zeiger.gehen = false; G.slime.grab = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  G.kamera.dist *= Math.exp(e.deltaY * 0.0012);
}, { passive: false });

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === ' ') { G.input.hop = true; e.preventDefault(); }
  if (k === 'e') { SPIEL.fressversuch({}); e.preventDefault(); }   // nur Fressen (§18)
  if (k === 'f') UI.hinweis('Nichts zum Interagieren in der Nähe.');
  if (k >= '1' && k <= '9') SPIEL.faehigkeitBenutzen(parseInt(k, 10) - 1);
  if (k === '0') SPIEL.faehigkeitBenutzen(9);
  if (k === 'k') G.input.cannon = true;
  if (k === 'x') G.debug = !G.debug;
  if (k === 'p') pause = !pause;
  if (k === 'r') SPIEL.zuruecksetzen({});
  if (k === 'h') document.body.classList.toggle('panel-hidden');
  if (k === 'escape') document.body.classList.toggle('panel-hidden');
  tasten.add(k);
});
window.addEventListener('keyup', e => tasten.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => tasten.clear());

/* WASD ist kameraabhaengig — sonst fuehlt es sich nach jeder Drehung falsch an. */
function achseSetzen() {
  let f = 0, s = 0;
  if (tasten.has('w') || tasten.has('arrowup')) f += 1;
  if (tasten.has('s') || tasten.has('arrowdown')) f -= 1;
  if (tasten.has('d') || tasten.has('arrowright')) s += 1;
  if (tasten.has('a') || tasten.has('arrowleft')) s -= 1;
  if (tasten.has('q')) G.kamera.yaw -= 0.03;
  if (tasten.has('y') || tasten.has('z')) G.kamera.yaw += 0.03;

  if (!f && !s) { G.input.axis.x = 0; G.input.axis.z = 0; return; }
  const fx = -Math.cos(G.kamera.yaw), fz = -Math.sin(G.kamera.yaw);
  G.input.axis.x = fx * f - fz * s;
  G.input.axis.z = fz * f + fx * s;
}

/* --- Tuning-Panel ---------------------------------------------------------- */

const zahl = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : String(parseFloat(v.toFixed(3))));
const panel = document.getElementById('sliders');
const regler = {};
for (const c of CONTROLS) {
  if (c.group) {
    const h = document.createElement('h3');
    h.textContent = c.group;
    panel.appendChild(h);
    continue;
  }
  const row = document.createElement('label');
  row.className = 'row';
  row.innerHTML = `<span class="name">${c.label}</span><span class="val"></span>`;
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = c.min; inp.max = c.max; inp.step = c.step;
  inp.value = PARAMS[c.key];
  const val = row.querySelector('.val');
  val.textContent = zahl(PARAMS[c.key]);
  inp.addEventListener('input', () => {
    PARAMS[c.key] = parseFloat(inp.value);
    val.textContent = zahl(PARAMS[c.key]);
  });
  row.appendChild(inp);
  panel.appendChild(row);
  regler[c.key] = { inp, val };
}
const grundwerte = { ...PARAMS };

function presetSetzen(name) {
  const r = PARAMS.radius;
  Object.assign(PARAMS, grundwerte, PRESETS[name]);
  PARAMS.radius = r;                       // Groesse kommt vom Level, nicht vom Preset
  for (const key in regler) {
    if (PARAMS[key] === undefined) continue;
    regler[key].inp.value = PARAMS[key];
    regler[key].val.textContent = zahl(PARAMS[key]);
  }
  document.querySelectorAll('[data-preset]').forEach(b =>
    b.classList.toggle('active', b.dataset.preset === name));
}
document.querySelectorAll('[data-preset]').forEach(b =>
  b.addEventListener('click', () => presetSetzen(b.dataset.preset)));
document.getElementById('btn-reset').addEventListener('click', () => SPIEL.zuruecksetzen({}));
document.getElementById('btn-debug').addEventListener('click', () => { G.debug = !G.debug; });
document.getElementById('btn-panel').addEventListener('click', () =>
  document.body.classList.toggle('panel-hidden'));
document.getElementById('btn-faction').addEventListener('click', (e) => {
  G.spieler.faction = G.spieler.faction === 'eldoran' ? 'ravok' : 'eldoran';
  e.target.textContent = G.spieler.faction === 'eldoran' ? 'Eldoran' : 'Ravok';
});
document.getElementById('btn-spawn').addEventListener('click', () => {
  const s = WELT.spawns[Math.floor(RNG.next() * WELT.spawns.length)];
  const art = RNG.pick(['schleimling', 'wolf', 'eber']);
  SLIMORIA.api.spawnCreature({ art, level: Math.max(1, G.spieler.level + RNG.int(-1, 2)),
                               x: s.x, z: s.z });
});

/* --- Startaufstellung ------------------------------------------------------ */

function arenaFuellen() {
  const arten = ['schleimling', 'wolf', 'eber', 'wolf', 'schleimling', 'eber'];
  WELT.spawns.forEach((s, i) => {
    SLIMORIA.api.spawnCreature({
      art: arten[i % arten.length],
      level: 1 + (i % 3),
      x: s.x, z: s.z,
    });
  });
}

/* --- Bildschleife ---------------------------------------------------------- */

const SCHRITT = 1 / 240;
let acc = 0, letzte = 0, pause = false;
let fps = 60, fpsAcc = 0, fpsZahl = 0;

function bild(now) {
  if (canvas.clientWidth !== ANSICHT.w || canvas.clientHeight !== ANSICHT.h) groesseSetzen();
  const roh = letzte ? (now - letzte) / 1000 : 1 / 60;
  letzte = now;
  const dt = Math.min(roh, 0.1);

  fpsAcc += roh; fpsZahl++;
  if (fpsAcc > 0.4) { fps = fpsZahl / fpsAcc; fpsAcc = 0; fpsZahl = 0; }

  achseSetzen();

  if (!pause) {
    acc += dt;
    let n = 0;
    while (acc >= SCHRITT && n < 12) { SLIMORIA.step(SCHRITT); acc -= SCHRITT; n++; }
    if (n >= 12) acc = 0;
  }
  SLIMORIA.render();
  requestAnimationFrame(bild);
}

if (!AUFNAHME) {
  arenaFuellen();
  presetSetzen('standard');
  requestAnimationFrame(bild);
} else {
  document.body.classList.add('aufnahme');
  presetSetzen('standard');
  SLIMORIA.render();
}

window.SLIMORIA.bereit = true;
window.SLIMORIA.fps = () => fps;
