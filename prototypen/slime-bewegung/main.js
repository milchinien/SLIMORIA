'use strict';

/* ---------------------------------------------------------------------------
 * Prototyp-Rahmen: Welt, Kamera, Eingabe, Schleife und Tuning-Panel.
 * ------------------------------------------------------------------------- */

const PARAMS = {
  // Körper
  radius: 1,
  mass: 1,
  skin: 500,          // Spannung der Haut
  skinDamp: 10,
  bend: 140,          // Biegesteifigkeit gegen Knicke
  bendDamp: 2,
  shape: 130,         // Formgedächtnis (Rückstellung zur Ruheform)
  shapeDamp: 10,
  maxDeform: 0.5,     // ab dieser Auslenkung wird der Koerper hart
  stiffen: 6,         // wie stark er dann versteift
  pressure: 4000,     // Innendruck / Volumenerhalt
  jiggleDamp: 0.9,    // Nachschwingen: klein = wabbelt lange
  viscosity: 10,      // Zähigkeit: Verformungen fließen statt zu federn
  adhesion: 5,        // Haftung am Boden — er klebt und muss sich ablösen
  crawl: 0.45,        // Kriechwelle im Antrieb
  slumpTime: 1.5,     // Sekunden bis er im Stand zusammengesackt ist
  stretch: 0.35,      // Streckung bei Höchsttempo
  wobble: 0.05,       // wandernde Oberflächenwelle
  sag: 0.32,          // unten breiter — Schleimkuppel statt Kugel
  squat: 0.82,        // Grundhöhe des Körpers

  // Bewegung
  maxSpeed: 7,
  response: 6,
  maxAccel: 45,
  rollIn: 0.35,       // Anrollzeit in Sekunden
  turnRate: 7,
  rearBias: 0.9,      // Antrieb schiebt von hinten → Front läuft voraus
  friction: 1.6,      // Bodenreibung des Schwerpunkts
  airDrag: 0.15,

  // Welt
  gravity: 18,
  hopPower: 8.5,
  bounce: 0.05,
  groundK: 10000,     // Steifigkeit der Bodenfeder
  groundDamp: 40,
  groundGrip: 3,      // Haftung der Kontaktpunkte (1/s)
  wallFriction: 8,    // Reibung an Hindernissen (1/s)

  // Steuerung
  arriveRadius: 2.5,
  stopRadius: 0.35,
};

const PRESETS = {
  standard: {},
  traege: { mass: 1.5, shape: 170, skin: 650, jiggleDamp: 1.3, maxSpeed: 5,
            response: 4, maxAccel: 26, rollIn: 0.6, friction: 1.2, stretch: 0.28,
            rearBias: 1.3, turnRate: 4.5, sag: 0.38 },
  flutschig: { shape: 380, skin: 1400, jiggleDamp: 3.2, maxSpeed: 11, response: 9,
               maxAccel: 70, rollIn: 0.16, friction: 2.6, stretch: 0.5, turnRate: 10 },
  gallerte: { shape: 120, skin: 420, pressure: 640, jiggleDamp: 0.9, shapeDamp: 3,
              skinDamp: 3, stretch: 0.5, wobble: 0.11, maxSpeed: 6, rollIn: 0.5,
              sag: 0.45, squat: 0.72 },
};

const CONTROLS = [
  { group: 'Bewegung' },
  { key: 'maxSpeed', label: 'Max-Tempo', min: 2, max: 18, step: 0.5 },
  { key: 'response', label: 'Antriebshärte', min: 1, max: 16, step: 0.5 },
  { key: 'maxAccel', label: 'Max-Beschleunigung', min: 8, max: 120, step: 1 },
  { key: 'rollIn', label: 'Anrollzeit (s)', min: 0.02, max: 1.2, step: 0.02 },
  { key: 'friction', label: 'Bodenreibung', min: 0.2, max: 6, step: 0.1 },
  { key: 'groundGrip', label: 'Haftung', min: 0, max: 30, step: 0.5 },
  { key: 'rearBias', label: 'Nachziehen', min: 0, max: 2.5, step: 0.05 },
  { key: 'turnRate', label: 'Drehtempo Gesicht', min: 1, max: 16, step: 0.5 },

  { group: 'Körper' },
  { key: 'radius', label: 'Größe', min: 0.4, max: 2.5, step: 0.05 },
  { key: 'mass', label: 'Masse', min: 0.4, max: 3, step: 0.05 },
  { key: 'skin', label: 'Hautspannung', min: 200, max: 2500, step: 20 },
  { key: 'bend', label: 'Biegesteifigkeit', min: 0, max: 600, step: 10 },
  { key: 'shape', label: 'Formgedächtnis', min: 40, max: 700, step: 10 },
  { key: 'pressure', label: 'Innendruck', min: 500, max: 12000, step: 100 },
  { key: 'stiffen', label: 'Verformungsgrenze', min: 0, max: 20, step: 0.5 },
  { key: 'jiggleDamp', label: 'Nachschwingen dämpfen', min: 0.3, max: 8, step: 0.1 },
  { key: 'viscosity', label: 'Zähigkeit', min: 0, max: 40, step: 0.5 },
  { key: 'adhesion', label: 'Bodenhaftung', min: 0, max: 20, step: 0.5 },
  { key: 'crawl', label: 'Kriechwelle', min: 0, max: 1.5, step: 0.05 },
  { key: 'slumpTime', label: 'Zusammensacken (s)', min: 0.2, max: 5, step: 0.1 },
  { key: 'stretch', label: 'Streckung bei Tempo', min: 0, max: 1, step: 0.02 },
  { key: 'wobble', label: 'Oberflächenwelle', min: 0, max: 0.22, step: 0.005 },
  { key: 'sag', label: 'Breite Basis', min: 0, max: 0.8, step: 0.02 },
  { key: 'squat', label: 'Höhe', min: 0.5, max: 1.2, step: 0.02 },

  { group: 'Sprung & Aufprall' },
  { key: 'hopPower', label: 'Sprungkraft', min: 3, max: 20, step: 0.5 },
  { key: 'gravity', label: 'Schwerkraft', min: 8, max: 60, step: 1 },
  { key: 'bounce', label: 'Abprall', min: 0, max: 0.5, step: 0.01 },
];

const world = {
  bounds: 22,
  obstacles: [
    { type: 'rock', x: -7, y: 0.5, z: -4, r: 1.8 },
    { type: 'rock', x: 6, y: 0.4, z: -8, r: 1.4 },
    { type: 'rock', x: 10, y: 0.7, z: 3, r: 2.4 },
    { type: 'rock', x: -3, y: 0.3, z: 9, r: 1.1 },
    { type: 'rock', x: 1.5, y: 0.25, z: -2.5, r: 0.9 },
    // Enge Passage: schmaler als der Schleim — er muss sich durchquetschen.
    { type: 'wall', x: -4.9, y: 0.8, z: 6, w: 8, h: 1.6, d: 0.9 },
    { type: 'wall', x: 4.9, y: 0.8, z: 6, w: 8, h: 1.6, d: 0.9 },
    // Plateau zum Runterspringen
    { type: 'wall', x: -11, y: 0.6, z: -10, w: 6, h: 1.2, d: 6 },
  ],
};

const canvas = document.getElementById('view');
const view = { w: 0, h: 0, pw: 0, ph: 0 };
const R = createRenderer(canvas);

/* Physik rechnet grob, gezeichnet wird fein: zwei Loop-Schritte machen aus
 * 162 Massepunkten 2562 Hüllpunkte. Erst dadurch ist die Silhouette auch aus
 * der Nähe rund. */
const mesh = createIcosphere(2);
const topo = buildTopology(mesh);
mesh.bend = topo.bend;

const coarse = createSubdivider(mesh, topo);                  // 162 → 642
coarse.relaxLambda = 0;                                       // erst am Ende glätten
coarse.computeNormals = false;

const midMesh = meshFromSurface(coarse);
const surface = createSubdivider(midMesh, buildTopology(midMesh));   // 642 → 2562
const applySurface = (src) => { coarse.apply(src); surface.apply(coarse.positions); };

R.slimeMesh = makeMesh(R.gl, surface.positions, surface.normals, surface.indices);
let slime = createSlime(mesh, PARAMS);

const camera = {
  yaw: Math.PI * 0.5, pitch: 0.62, dist: 13,
  tx: 0, ty: 1, tz: 0,
  eye: new Float32Array(3),
  viewProj: M4.identity(),
  invViewProj: M4.identity(),
};

let faction = 'valoria';
let debug = false;
let paused = false;
let time = 0;

const input = { axis: { x: 0, z: 0 }, hop: false, cannon: false };
const keys = new Set();
const pointer = { x: 0, y: 0, orbit: false, move: false, lastX: 0, lastY: 0 };

/* --- Canvas -------------------------------------------------------------- */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = canvas.clientWidth;
  view.h = canvas.clientHeight;
  view.pw = Math.round(view.w * dpr);
  view.ph = Math.round(view.h * dpr);
  canvas.width = view.pw;
  canvas.height = view.ph;
}

/* --- Kamera --------------------------------------------------------------- */
function updateCamera(dt) {
  const b = slime.body;
  const k = 1 - Math.exp(-6 * dt);
  camera.tx += (b.cx - camera.tx) * k;
  camera.ty += (b.cy + PARAMS.radius * 0.4 - camera.ty) * k;
  camera.tz += (b.cz - camera.tz) * k;

  camera.pitch = Math.max(0.06, Math.min(1.45, camera.pitch));
  camera.dist = Math.max(3.5, Math.min(45, camera.dist));

  const cp = Math.cos(camera.pitch);
  camera.eye[0] = camera.tx + Math.cos(camera.yaw) * cp * camera.dist;
  camera.eye[1] = camera.ty + Math.sin(camera.pitch) * camera.dist;
  camera.eye[2] = camera.tz + Math.sin(camera.yaw) * cp * camera.dist;
  if (camera.eye[1] < 0.4) camera.eye[1] = 0.4;

  const proj = M4.perspective(Math.PI / 3.6, view.w / Math.max(view.h, 1), 0.1, 300);
  const viewM = M4.lookAt(camera.eye, [camera.tx, camera.ty, camera.tz], [0, 1, 0]);
  camera.viewProj = M4.multiply(proj, viewM, camera.viewProj);
  camera.invViewProj = M4.invert(camera.viewProj);
}

/* Strahl durch das Pixel unter der Maus. */
function screenRay(sx, sy) {
  const ndcX = (sx / view.w) * 2 - 1;
  const ndcY = 1 - (sy / view.h) * 2;
  const m = camera.invViewProj;
  const un = (z) => {
    const x = m[0]*ndcX + m[4]*ndcY + m[8]*z + m[12];
    const y = m[1]*ndcX + m[5]*ndcY + m[9]*z + m[13];
    const w = m[3]*ndcX + m[7]*ndcY + m[11]*z + m[15];
    const zz = m[2]*ndcX + m[6]*ndcY + m[10]*z + m[14];
    return [x / w, y / w, zz / w];
  };
  const a = un(-1), b = un(1);
  const dir = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  return { o: a, d: [dir[0]/l, dir[1]/l, dir[2]/l] };
}

function rayToGround(ray) {
  if (Math.abs(ray.d[1]) < 1e-5) return null;
  const t = -ray.o[1] / ray.d[1];
  if (t < 0) return null;
  return { x: ray.o[0] + ray.d[0] * t, z: ray.o[2] + ray.d[2] * t };
}

/* Punkt des Schleims, der dem Mausstrahl am nächsten liegt. */
function rayPickVertex(ray) {
  const b = slime.body;
  let best = -1, bestD = Infinity, bestT = 0;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const ox = b.pos[k] - ray.o[0], oy = b.pos[k+1] - ray.o[1], oz = b.pos[k+2] - ray.o[2];
    const t = ox * ray.d[0] + oy * ray.d[1] + oz * ray.d[2];
    if (t < 0) continue;
    const px = ox - ray.d[0] * t, py = oy - ray.d[1] * t, pz = oz - ray.d[2] * t;
    const d = Math.hypot(px, py, pz);
    if (d < bestD) { bestD = d; best = i; bestT = t; }
  }
  return { i: best, d: bestD, t: bestT };
}

/* --- Eingabe --------------------------------------------------------------- */
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointer.lastX = e.offsetX; pointer.lastY = e.offsetY;
  const ray = screenRay(e.offsetX, e.offsetY);

  if (e.button === 2 || e.button === 1) {
    pointer.orbit = true;
  } else if (e.button === 0 && e.shiftKey) {
    const hit = rayPickVertex(ray);
    if (hit.d < PARAMS.radius * 0.6) {
      slime.grab = {
        i: hit.i, t: hit.t,
        x: ray.o[0] + ray.d[0] * hit.t,
        y: ray.o[1] + ray.d[1] * hit.t,
        z: ray.o[2] + ray.d[2] * hit.t,
      };
    }
  } else if (e.button === 0) {
    const g = rayToGround(ray);
    if (g) { slime.target = g; pointer.move = true; }
  }
});

canvas.addEventListener('pointermove', e => {
  const dx = e.offsetX - pointer.lastX, dy = e.offsetY - pointer.lastY;
  pointer.lastX = e.offsetX; pointer.lastY = e.offsetY;

  if (pointer.orbit) {
    camera.yaw += dx * 0.006;
    camera.pitch += dy * 0.005;
    return;
  }
  const ray = screenRay(e.offsetX, e.offsetY);
  if (slime.grab) {
    const t = slime.grab.t;
    slime.grab.x = ray.o[0] + ray.d[0] * t;
    slime.grab.y = Math.max(0.05, ray.o[1] + ray.d[1] * t);
    slime.grab.z = ray.o[2] + ray.d[2] * t;
  } else if (pointer.move) {
    const g = rayToGround(ray);
    if (g) slime.target = g;
  }
});

window.addEventListener('pointerup', () => {
  pointer.orbit = false;
  pointer.move = false;
  slime.grab = null;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.dist *= Math.exp(e.deltaY * 0.0012);
}, { passive: false });

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === ' ') { input.hop = true; e.preventDefault(); }
  if (k === 'k') input.cannon = true;
  if (k === 'x') debug = !debug;
  if (k === 'p') paused = !paused;
  if (k === 'r') reset();
  if (k === 'f') { faction = faction === 'valoria' ? 'drakhar' : 'valoria'; syncFaction(); }
  if (k === 'h') document.body.classList.toggle('panel-hidden');
  if (k === '1') applyPreset('standard');
  if (k === '2') applyPreset('traege');
  if (k === '3') applyPreset('flutschig');
  if (k === '4') applyPreset('gallerte');
  keys.add(k);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

/* WASD ist kameraabhängig — sonst fühlt es sich nach jeder Drehung falsch an. */
function updateAxis() {
  let f = 0, s = 0;
  if (keys.has('w') || keys.has('arrowup')) f += 1;
  if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('d') || keys.has('arrowright')) s += 1;
  if (keys.has('a') || keys.has('arrowleft')) s -= 1;
  if (keys.has('q')) camera.yaw -= 0.03;
  if (keys.has('e')) camera.yaw += 0.03;

  if (!f && !s) { input.axis.x = 0; input.axis.z = 0; return; }
  const fx = -Math.cos(camera.yaw), fz = -Math.sin(camera.yaw);
  const sx = -fz, sz = fx;
  input.axis.x = fx * f + sx * s;
  input.axis.z = fz * f + sz * s;
}

function reset() {
  slime = createSlime(mesh, PARAMS);
  camera.tx = 0; camera.ty = 1; camera.tz = 0;
}

/* --- Tuning-Panel ----------------------------------------------------------- */
const panel = document.getElementById('sliders');
const sliderEls = {};

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
  inp.type = 'range';
  inp.min = c.min; inp.max = c.max; inp.step = c.step;
  inp.value = PARAMS[c.key];
  const val = row.querySelector('.val');
  val.textContent = fmt(PARAMS[c.key]);
  inp.addEventListener('input', () => {
    PARAMS[c.key] = parseFloat(inp.value);
    val.textContent = fmt(PARAMS[c.key]);
  });
  row.appendChild(inp);
  panel.appendChild(row);
  sliderEls[c.key] = { inp, val };
}

function fmt(v) {
  return Math.abs(v) >= 100 ? v.toFixed(0) : String(parseFloat(v.toFixed(3)));
}

const defaults = { ...PARAMS };

function applyPreset(name) {
  Object.assign(PARAMS, defaults, PRESETS[name]);
  for (const key in sliderEls) {
    sliderEls[key].inp.value = PARAMS[key];
    sliderEls[key].val.textContent = fmt(PARAMS[key]);
  }
  document.querySelectorAll('[data-preset]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.preset === name));
}

document.querySelectorAll('[data-preset]').forEach(btn =>
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));
document.getElementById('btn-reset').addEventListener('click', reset);
document.getElementById('btn-debug').addEventListener('click', () => { debug = !debug; });
document.getElementById('btn-faction').addEventListener('click', () => {
  faction = faction === 'valoria' ? 'drakhar' : 'valoria';
  syncFaction();
});
document.getElementById('btn-panel').addEventListener('click', () =>
  document.body.classList.toggle('panel-hidden'));

function syncFaction() {
  document.getElementById('btn-faction').textContent = FACTIONS[faction].name;
}
syncFaction();

/* --- HUD -------------------------------------------------------------------- */
const hudSpeed = document.getElementById('hud-speed');
const hudBar = document.getElementById('hud-bar');
const hudState = document.getElementById('hud-state');
const hudFps = document.getElementById('hud-fps');
let fps = 60, fpsAcc = 0, fpsCount = 0;

/* --- Schleife -----------------------------------------------------------------
 * Feste Physikschritte mit 240 Hz, unabhängig von der Bildrate. Das hält das
 * Gefühl auf jedem Monitor gleich und die Federn stabil. */
const STEP = 1 / 240;
let acc = 0;
let last = performance.now();

function frame(now) {
  if (canvas.clientWidth !== view.w || canvas.clientHeight !== view.h) resize();

  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(raw, 0.1);

  fpsAcc += raw; fpsCount++;
  if (fpsAcc > 0.4) { fps = fpsCount / fpsAcc; fpsAcc = 0; fpsCount = 0; }

  updateAxis();

  if (!paused) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 12) {
      time += STEP;
      updateSlime(slime, STEP, PARAMS, world, input, time);
      acc -= STEP;
      steps++;
    }
    if (steps >= 12) acc = 0;
  }

  applySurface(slime.body.pos);
  updateCamera(dt);
  renderScene(R, { view, world, slime, surface, camera, params: PARAMS, faction, time, debug });

  hudSpeed.textContent = slime.speed.toFixed(1);
  hudBar.style.width = (slime.speedRatio * 100).toFixed(0) + '%';
  hudState.textContent = slime.body.grounded ? 'Boden' : 'Luft';
  hudFps.textContent = fps.toFixed(0);

  requestAnimationFrame(frame);
}

resize();
applyPreset('standard');
requestAnimationFrame(frame);
