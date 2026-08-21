'use strict';

/* ---------------------------------------------------------------------------
 * Optik-Prototyp: ein einzelner Schleim, so schön wie es ohne Fremdbibliothek
 * geht. Keine Spielmechanik, keine Physik-Simulation — nur Licht und Material.
 *
 * Reihenfolge pro Bild:
 *   1. Szene   — Himmel, Boden, Säulen, Augen, Kern, Blasen, Staub  (HDR)
 *   2. Dicke   — wie weit ein Blick durch die Masse läuft           (halbe Auflösung)
 *   3. Kopie   — die Szene, damit der Schleim sie lesen darf
 *   4. Schleim — Brechung, Absorption, Streuung, Glanz              (in die Szene)
 *   5. Bloom   — Hellpass und zwei Unschärfestufen
 *   6. Final   — Belichtung, ACES, Vignette, Korn                   (auf den Schirm)
 * ------------------------------------------------------------------------- */

const canvas = document.getElementById('view');
const gl = canvas.getContext('webgl2', {
  alpha: false, antialias: false, depth: false, powerPreference: 'high-performance',
});
if (!gl) {
  document.body.innerHTML = '<p style="padding:2rem">Dieser Prototyp braucht WebGL2.</p>';
  throw new Error('kein WebGL2');
}
const HDR = !!gl.getExtension('EXT_color_buffer_float');

/* --- Regler ---------------------------------------------------------------- */

const PARAMS = {
  // Material
  dichte: 1.30,       // Faktor auf die Absorption — wie satt die Farbe wird
  trueb: 0.55,        // Trübung: wie schnell die Brechung mit der Dicke unscharf wird
  brechung: 1.25,     // wie stark der Hintergrund verbogen wird
  streuung: 0.80,      // Durchleuchtung von hinten (SSS)
  innen: 0.38,        // Sichtbarkeit der Schlieren im Volumen
  schlieren: 1.15,    // Größe der Schlieren (klein = feinmaschig)
  rauheit: 0.055,     // Glanzlicht: klein = harter Punkt, groß = matte Keule
  reflex: 0.45,       // Stärke der Himmelsspiegelung
  rand: 0.35,         // heller Saum an dünn auslaufenden Stellen
  detail: 0.22,       // fließende Feinwellen auf der Haut

  // Körper
  radius: 1.6,
  tempo: 3.4,         // Laufgeschwindigkeit in m/s
  wabbel: 1.0,
  blasen: 14,
  kern: 0.55,

  // Licht und Bild
  sonneAz: 203,
  sonneEl: 27,
  bloom: 0.65,
  belichtung: 1.0,
  korn: 0.012,
};

/* Farbwelten. `absorb` ist der Beer-Lambert-Koeffizient pro Kanal: was hier
 * hoch steht, wird auf dem Weg durch die Masse geschluckt. Ein blauer Schleim
 * ist also einer, der Rot frisst. */
const PRESETS = {
  valoria: {
    name: 'Valoria',
    absorb: [0.95, 0.34, 0.14], streu: [0.30, 0.70, 1.00],
    kernCol: [0.35, 0.85, 1.00], blase: [0.65, 0.92, 1.00],
    sky: { top: [0.010, 0.028, 0.075], hor: [0.115, 0.145, 0.225], gnd: [0.006, 0.010, 0.018],
           sun: [1.70, 1.60, 1.45] },
  },
  drakhar: {
    name: 'Drakhar',
    absorb: [0.12, 0.62, 0.95], streu: [1.00, 0.34, 0.22],
    kernCol: [1.00, 0.45, 0.20], blase: [1.00, 0.72, 0.55],
    sky: { top: [0.030, 0.016, 0.030], hor: [0.190, 0.075, 0.045], gnd: [0.014, 0.007, 0.007],
           sun: [2.20, 1.15, 0.65] },
  },
  smaragd: {
    name: 'Smaragd',
    absorb: [0.88, 0.18, 0.62], streu: [0.38, 1.00, 0.52],
    kernCol: [0.50, 1.00, 0.60], blase: [0.75, 1.00, 0.80],
    sky: { top: [0.014, 0.038, 0.062], hor: [0.135, 0.150, 0.110], gnd: [0.008, 0.014, 0.010],
           sun: [1.80, 1.65, 1.25] },
  },
  amethyst: {
    name: 'Amethyst',
    absorb: [0.42, 0.86, 0.20], streu: [0.78, 0.45, 1.00],
    kernCol: [0.80, 0.50, 1.00], blase: [0.88, 0.78, 1.00],
    sky: { top: [0.022, 0.018, 0.060], hor: [0.105, 0.085, 0.165], gnd: [0.010, 0.008, 0.018],
           sun: [1.60, 1.35, 1.75] },
  },
  honig: {
    name: 'Honig',
    absorb: [0.14, 0.40, 1.15], streu: [1.00, 0.74, 0.32],
    kernCol: [1.00, 0.80, 0.40], blase: [1.00, 0.90, 0.65],
    sky: { top: [0.028, 0.032, 0.060], hor: [0.210, 0.140, 0.070], gnd: [0.014, 0.011, 0.008],
           sun: [2.10, 1.55, 0.95] },
    params: { innen: 0.55, brechung: 1.6, dichte: 1.0 },
  },
  milchglas: {
    name: 'Milchglas',
    absorb: [0.30, 0.30, 0.32], streu: [0.95, 0.97, 1.00],
    kernCol: [0.85, 0.92, 1.00], blase: [1.00, 1.00, 1.00],
    sky: { top: [0.030, 0.045, 0.080], hor: [0.155, 0.165, 0.190], gnd: [0.014, 0.017, 0.020],
           sun: [1.75, 1.70, 1.65] },
    params: { innen: 0.95, brechung: 0.55, rauheit: 0.13, dichte: 0.7, schlieren: 1.3 },
  },
};

let presetName = 'valoria';
let preset = PRESETS[presetName];
let sky = preset.sky;

/* --- Programme ------------------------------------------------------------- */

const P = {
  himmel: program(gl, VS_QUAD, FS_HIMMEL),
  boden: program(gl, VS_BODEN, FS_BODEN),
  fest: program(gl, VS_FEST, FS_FEST),
  dicke: program(gl, VS_SCHLEIM, FS_DICKE),
  schleim: program(gl, VS_SCHLEIM, FS_SCHLEIM),
  blase: program(gl, VS_KUGEL, FS_BLASE),
  kern: program(gl, VS_KUGEL, FS_KERN),
  auge: program(gl, VS_KUGEL, FS_AUGE),
  staub: program(gl, VS_STAUB, FS_STAUB),
  hell: program(gl, VS_QUAD, FS_HELL),
  blur: program(gl, VS_QUAD, FS_BLUR),
  kopie: program(gl, VS_QUAD, FS_KOPIE),
  final: program(gl, VS_QUAD, FS_FINAL),
  debugDicke: program(gl, VS_QUAD, FS_DEBUG_DICKE),
};

/* --- Geometrie ------------------------------------------------------------- */

const meshQuad = new Mesh(gl, { pos: new Float32Array(9) });   // nur als leeres VAO
const meshSchleim = new Mesh(gl, icosphere(4));                // 2562 Punkte
const meshKugel = new Mesh(gl, icosphere(2));
const meshFels = new Mesh(gl, icosphere(3));
const meshBoden = new Mesh(gl, {
  pos: new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1]),
});

const STAUB_N = 320;
const staubPos = new Float32Array(STAUB_N * 3);
for (let i = 0; i < STAUB_N; i++) {
  const r = 3 + Math.random() * 16, a = Math.random() * Math.PI * 2;
  staubPos[i * 3] = Math.cos(a) * r;
  staubPos[i * 3 + 1] = Math.random() * 7;
  staubPos[i * 3 + 2] = Math.sin(a) * r;
}
const meshStaub = new Mesh(gl, { pos: staubPos }, gl.POINTS);

/* Felsen ringsum: sie geben der Brechung etwas zum Verbiegen und dem Bild
 * einen Rahmen. Bewusst niedrig — nichts soll dem Schleim die Silhouette
 * zerschneiden. Die Werte sind fest, nicht zufällig, damit jeder Start
 * dasselbe Bild ergibt. */
const FELSEN = [];
{
  const ring = [
    [ 5.4, 0.55, 1.05, 0.62], [ 7.9, 1.85, 0.72, 0.42], [ 6.6, 3.05, 1.35, 0.78],
    [ 9.2, 4.15, 0.95, 0.55], [ 6.1, 5.05, 1.55, 0.90], [ 8.4, 5.95, 0.80, 0.48],
    [ 5.9, 0.05, 1.15, 0.70], [10.5, 2.55, 1.70, 1.00], [11.8, 3.65, 1.25, 0.72],
    [12.6, 5.45, 1.95, 1.15], [14.2, 1.15, 1.60, 0.95], [ 4.9, 2.15, 0.55, 0.30],
  ];
  for (let i = 0; i < ring.length; i++) {
    const [r, a, w, h] = ring[i];
    FELSEN.push({
      pos: [Math.cos(a) * r, h * 0.35, Math.sin(a) * r],
      skala: [w, h, w * (0.85 + (i % 3) * 0.12)],
      farbe: [0.13 + (i % 3) * 0.012, 0.135, 0.145],
    });
  }
}

/* --- Renderziele ----------------------------------------------------------- */

const T = {
  szene: new Target(gl, { float: HDR, depth: true }),
  kopie: new Target(gl, { float: HDR }),
  weichA: new Target(gl, { float: HDR, scale: 0.5 }),
  weichB: new Target(gl, { float: HDR, scale: 0.5 }),
  dicke: new Target(gl, { float: HDR, scale: 0.5 }),
  bloomA: new Target(gl, { float: HDR, scale: 0.5 }),
  bloomB: new Target(gl, { float: HDR, scale: 0.5 }),
  bloomC: new Target(gl, { float: HDR, scale: 0.25 }),
  bloomD: new Target(gl, { float: HDR, scale: 0.25 }),
};

/* Die Dicke wird als Entfernung in Weltmetern geschrieben. Ohne HDR-Ziel muss
 * sie in 0..1 passen — daher der Maßstab. */
const DICKE_SKALA = 1 / 32;

/* Etwas über der Bildschirmauflösung rendern und vom Browser herunterskalieren
 * lassen — das ist die billigste Kantenglättung, die es gibt. */
let renderScale = Math.min((window.devicePixelRatio || 1) * 1.35, 2.2);
let W = 1, H = 1;

function resize() {
  const w = Math.floor(canvas.clientWidth * renderScale);
  const h = Math.floor(canvas.clientHeight * renderScale);
  if (w === W && h === H) return;
  W = w; H = h;
  canvas.width = w; canvas.height = h;
  for (const k in T) T[k].resize(w, h);
}

/* --- Kamera ---------------------------------------------------------------- */

/* Kamera nach WoW-Art: sie sitzt hinter dem Schleim und bleibt dort.
 * `versatz` ist der Winkel, den der Nutzer mit der linken Maustaste
 * weggedreht hat — beim Laufen federt er auf null zurück. */
const cam = {
  yaw: Math.PI, pitch: 0.30,
  dist: 7.4, distZiel: 7.4,
  auto: false,       // Schaukasten: dreht langsam um den Körper
  folgen: true,      // bleibt hinter dem Schleim
  versatz: 0,
};

/* Kürzester Weg zwischen zwei Winkeln, in (-pi, pi]. */
function winkelDiff(a) {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

/* --- Zustand des Schleims -------------------------------------------------- */

const schleim = {
  x: 0, z: 0, vx: 0, vz: 0,    // Standort und Tempo auf dem Boden
  kurs: 0,                     // wohin er zeigt (Radiant) — die Kamera hängt daran
  y: 0, vy: 0, luft: false,
  sq: 0, sqv: 0,               // Stauchfeder: Nachschwingen nach der Landung
  stups: [0, 1, 0, 0],         // Richtung + Stärke der Delle
  stupsV: 0,
  lehne: [0, 0], lehneV: [0, 0],   // Neigung der Masse, träge nachlaufend
  streck: 0,                   // Streckung in Laufrichtung
  blick: [0, 1],               // wohin das Gesicht schaut
  wandern: false,              // Testknopf: läuft von selbst
  ziel: [0, 0],
};

/* Tastatur nach WoW-Art: W/S vor und zurück, A/D drehen, Q/E seitwärts. */
const tasten = { w: false, a: false, s: false, d: false, q: false, e: false };
const maus = { links: false, rechts: false };

/* Kameraziel läuft dem Körper weich hinterher, statt an ihm zu kleben. */
const camZiel = [0, 1, 0];

const blasen = [];
function baueBlasen() {
  blasen.length = 0;
  for (let i = 0; i < 40; i++) {
    const u = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
    const l = Math.hypot(u[0], u[1], u[2]) || 1;
    const s = Math.cbrt(Math.random()) * 0.78 / l;
    blasen.push({
      x: u[0] * s, y: u[1] * s, z: u[2] * s,
      r: 0.016 + Math.random() * 0.034,
      tempo: 0.05 + Math.random() * 0.14,
      phase: Math.random() * 6.283,
    });
  }
}
baueBlasen();

let zeit = 0, pause = false, zeigeDicke = false, zeigeAugen = true;

/* --- Hilfen ---------------------------------------------------------------- */

function set3(loc, a) { gl.uniform3f(loc, a[0], a[1], a[2]); }

let sonne = [0, 1, 0];
function setzeHimmel(p) {
  set3(p.u.uSkyTop, sky.top);
  set3(p.u.uSkyHorizon, sky.hor);
  set3(p.u.uSkyGround, sky.gnd);
  set3(p.u.uSun, sonne);
  set3(p.u.uSunCol, sky.sun);
}

function blur(von, nach, dx, dy) {
  nach.bind([0, 0, 0, 1]);
  P.blur.use();
  gl.uniform2f(P.blur.u.uSchritt, dx / nach.w, dy / nach.h);
  bindTex(gl, 0, von.tex, P.blur.u.uTex);
  meshQuad.draw();
}

/* Der Körper wird im Vertexshader verformt — die Uniformdaten dafür sind für
 * die Dickenmessung und die Oberfläche dieselben. */
function setzeKoerper(p, vp) {
  gl.uniformMatrix4fv(p.u.uVP, false, vp);
  const M = mitte();
  set3(p.u.uMitte, M);
  gl.uniform1f(p.u.uRadius, PARAMS.radius);
  gl.uniform1f(p.u.uZeit, zeit);
  gl.uniform1f(p.u.uWabbel, PARAMS.wabbel);
  gl.uniform1f(p.u.uStauch, stauch());
  gl.uniform1f(p.u.uBreit, breite());
  gl.uniform4f(p.u.uStups, schleim.stups[0], schleim.stups[1], schleim.stups[2], schleim.stups[3]);
  gl.uniform1f(p.u.uKontakt, kontakt());
  gl.uniform2f(p.u.uLehne, schleim.lehne[0], schleim.lehne[1]);
  const v = tempoJetzt();
  const rx = v > 0.05 ? schleim.vx / v : 0, rz = v > 0.05 ? schleim.vz / v : 0;
  gl.uniform2f(p.u.uRichtung, rx, rz);
  gl.uniform1f(p.u.uStreck, schleim.streck);
}

/* Augpunkt und Blickziel der Kamera — eine Quelle für Bild und Mausklick. */
function kameraStand() {
  const ce = Math.cos(cam.pitch);
  const ziel = [camZiel[0], camZiel[1], camZiel[2]];
  return {
    ziel,
    auge: [
      ziel[0] + Math.cos(cam.yaw) * ce * cam.dist,
      ziel[1] + Math.sin(cam.pitch) * cam.dist,
      ziel[2] + Math.sin(cam.yaw) * ce * cam.dist,
    ],
  };
}

/* Bodenkontakt: 1 = liegt auf, 0 = fliegt frei. Steuert das Plattdrücken der
 * Unterseite und die Härte von Schatten und Lichtsee. */
function kontakt() {
  return clamp(1 - schleim.y / 0.7, 0, 1);
}

function stauch() {
  const flug = clamp(schleim.vy * 0.030, -0.22, 0.26);
  // Kriechpuls: beim Laufen schiebt er sich in Wellen vorwärts
  const t = Math.min(tempoJetzt() / Math.max(PARAMS.tempo, 0.1), 1);
  const puls = Math.sin(zeit * 7.0) * 0.035 * t;
  return clamp(0.88 * (1 + schleim.sq + flug + puls) + Math.sin(zeit * 1.1) * 0.018, 0.45, 1.35);
}
function tempoJetzt() {
  return Math.hypot(schleim.vx, schleim.vz);
}
function breite() {
  return 1 / Math.sqrt(Math.max(stauch() / 0.88, 0.2));
}
function mitte() {
  return [schleim.x, schleim.y + PARAMS.radius * stauch() * lerp(1.0, 0.78, kontakt()), schleim.z];
}

/* --- Bild ------------------------------------------------------------------ */

function zeichne(dt) {
  resize();

  const az = PARAMS.sonneAz * Math.PI / 180, el = PARAMS.sonneEl * Math.PI / 180;
  sonne = v3norm([Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)]);

  const M = mitte();
  const { auge, ziel } = kameraStand();
  const proj = matPerspective(0.85, W / H, 0.1, 260);
  const view = matLookAt(auge, ziel, [0, 1, 0]);
  const vp = matMul(proj, view);
  const invVP = matInvert(vp);
  const rechts = [view[0], view[4], view[8]];
  const hoch = [view[1], view[5], view[9]];

  const absorb = [
    preset.absorb[0] * PARAMS.dichte,
    preset.absorb[1] * PARAMS.dichte,
    preset.absorb[2] * PARAMS.dichte,
  ];

  /* 1. Szene ---------------------------------------------------------------- */
  // Wichtig: erst schreiben erlauben, dann löschen. Ein glClear räumt den
  // Tiefenpuffer NICHT, solange die Tiefenmaske zu ist — der Rest des Bildes
  // würde dann gegen die Tiefen des Vorbildes geprüft.
  gl.depthMask(true);
  T.szene.bind([0, 0, 0, 1]);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);

  P.himmel.use();
  gl.uniformMatrix4fv(P.himmel.u.uInvVP, false, invVP);
  set3(P.himmel.u.uCam, auge);
  setzeHimmel(P.himmel);
  meshQuad.draw();

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);

  P.boden.use();
  gl.uniformMatrix4fv(P.boden.u.uVP, false, vp);
  gl.uniform1f(P.boden.u.uSize, 120);
  set3(P.boden.u.uCam, auge);
  gl.uniform1f(P.boden.u.uZeit, zeit);
  set3(P.boden.u.uBlobPos, M);
  gl.uniform1f(P.boden.u.uBlobRadius, PARAMS.radius * breite() * (1.15 + schleim.y * 0.20));
  set3(P.boden.u.uBlobCol, preset.streu);
  gl.uniform1f(P.boden.u.uPfuetze, 1.0);
  gl.uniform1f(P.boden.u.uKontakt, kontakt());
  setzeHimmel(P.boden);
  meshBoden.draw();

  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  P.fest.use();
  gl.uniformMatrix4fv(P.fest.u.uVP, false, vp);
  set3(P.fest.u.uCam, auge);
  setzeHimmel(P.fest);
  for (const s of FELSEN) {
    set3(P.fest.u.uPos, s.pos);
    set3(P.fest.u.uSkala, s.skala);
    set3(P.fest.u.uFarbe, s.farbe);
    meshFels.draw();
  }

  // Additives Innenleben: Kern, Blasen, Staub
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);

  if (PARAMS.kern > 0.001) {
    P.kern.use();
    gl.uniformMatrix4fv(P.kern.u.uVP, false, vp);
    set3(P.kern.u.uCam, auge);
    set3(P.kern.u.uFarbe, preset.kernCol);
    gl.uniform1f(P.kern.u.uStaerke, PARAMS.kern * 0.55);
    set3(P.kern.u.uPos, [M[0], M[1] - PARAMS.radius * 0.08, M[2]]);
    const kr = PARAMS.radius * 0.42;
    set3(P.kern.u.uSkala, [kr * breite(), kr * stauch(), kr * breite()]);
    meshKugel.draw();
  }

  P.blase.use();
  gl.uniformMatrix4fv(P.blase.u.uVP, false, vp);
  set3(P.blase.u.uCam, auge);
  set3(P.blase.u.uFarbe, preset.blase);
  gl.uniform1f(P.blase.u.uStaerke, 0.26);
  setzeHimmel(P.blase);
  const nBlasen = Math.round(PARAMS.blasen);
  for (let i = 0; i < nBlasen; i++) {
    const b = blasen[i];
    b.y += b.tempo * dt;
    if (b.y > 0.80) { b.y = -0.80; b.x = Math.random() * 1.4 - 0.7; b.z = Math.random() * 1.4 - 0.7; }
    const wob = Math.sin(zeit * 0.9 + b.phase) * 0.05;
    const R = PARAMS.radius * 0.92;
    set3(P.blase.u.uPos, [
      M[0] + (b.x + wob) * R * breite(),
      M[1] + b.y * R * stauch(),
      M[2] + (b.z - wob) * R * breite(),
    ]);
    const br = b.r * PARAMS.radius;
    set3(P.blase.u.uSkala, [br, br, br]);
    meshKugel.draw();
  }

  P.staub.use();
  gl.uniformMatrix4fv(P.staub.u.uVP, false, vp);
  set3(P.staub.u.uCam, auge);
  gl.uniform1f(P.staub.u.uZeit, zeit);
  set3(P.staub.u.uFarbe, [sky.sun[0] * 0.5, sky.sun[1] * 0.5, sky.sun[2] * 0.5]);
  meshStaub.draw();

  gl.disable(gl.BLEND);
  gl.depthMask(true);

  /* 2. Dicke ---------------------------------------------------------------- */
  T.dicke.bind([0, 0, 0, 0]);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.enable(gl.CULL_FACE);

  P.dicke.use();
  setzeKoerper(P.dicke, vp);
  set3(P.dicke.u.uCam, auge);
  gl.uniform1f(P.dicke.u.uSkala, DICKE_SKALA);

  gl.blendEquation(gl.FUNC_ADD);
  gl.cullFace(gl.FRONT);          // Rückseiten addieren
  meshSchleim.draw();
  gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
  gl.cullFace(gl.BACK);           // Vorderseiten abziehen
  meshSchleim.draw();

  gl.blendEquation(gl.FUNC_ADD);
  gl.disable(gl.BLEND);

  /* 3. Kopie der Szene ------------------------------------------------------ */
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.szene.fbo);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.kopie.fbo);
  gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

  // ... und eine unscharfe Fassung davon für die raue Brechung
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.depthMask(false);
  T.weichA.bind([0, 0, 0, 1]);
  P.kopie.use();
  bindTex(gl, 0, T.kopie.tex, P.kopie.u.uTex);
  meshQuad.draw();
  blur(T.weichA, T.weichB, 1.6, 0);
  blur(T.weichB, T.weichA, 0, 1.6);

  /* 4. Schleim -------------------------------------------------------------- */
  T.szene.bind(null);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  P.schleim.use();
  setzeKoerper(P.schleim, vp);
  set3(P.schleim.u.uCam, auge);
  set3(P.schleim.u.uRechts, rechts);
  set3(P.schleim.u.uHoch, hoch);
  gl.uniform2f(P.schleim.u.uRes, W, H);
  gl.uniform1f(P.schleim.u.uDickeSkala, 1 / DICKE_SKALA);
  set3(P.schleim.u.uAbsorb, absorb);
  set3(P.schleim.u.uStreu, preset.streu);
  gl.uniform1f(P.schleim.u.uBrechung, PARAMS.brechung);
  gl.uniform1f(P.schleim.u.uRauheit, PARAMS.rauheit);
  gl.uniform1f(P.schleim.u.uSSS, PARAMS.streuung);
  gl.uniform1f(P.schleim.u.uInnen, PARAMS.innen);
  gl.uniform1f(P.schleim.u.uSchlieren, PARAMS.schlieren);
  gl.uniform1f(P.schleim.u.uRand, PARAMS.rand);
  gl.uniform1f(P.schleim.u.uDetail, PARAMS.detail);
  gl.uniform1f(P.schleim.u.uReflex, PARAMS.reflex);
  gl.uniform1f(P.schleim.u.uTrueb, PARAMS.trueb);
  setzeHimmel(P.schleim);
  bindTex(gl, 0, T.kopie.tex, P.schleim.u.uSzene);
  bindTex(gl, 1, T.dicke.tex, P.schleim.u.uDicke);
  bindTex(gl, 2, T.weichA.tex, P.schleim.u.uWeich);
  meshSchleim.draw();

  /* 4b. Augen --------------------------------------------------------------- *
   * Nach dem Schleim, mit weicher Kante darübergeblendet. Sie liegen damit
   * unter der Haut, aber über dem Eigenleuchten der Masse — sonst sind sie
   * nicht zu sehen. Ohne Tiefentest, weil der Schleim davor schon steht. */
  const zurCam = v3norm([auge[0] - M[0], 0, auge[2] - M[2]]);
  const sicht = clamp((schleim.blick[0] * zurCam[0] + schleim.blick[1] * zurCam[2] - 0.02) / 0.30, 0, 1);
  if (zeigeAugen && sicht > 0.01) {
    // Beim Laufen schaut er nach vorn, im Stand zur Kamera. Dreht sich das
    // Gesicht weg, blenden die Augen aus — sie werden ohne Tiefentest
    // gezeichnet und würden sonst durch den Körper scheinen.
    const f = [schleim.blick[0], 0, schleim.blick[1]];
    const r = v3norm(v3cross([0, 1, 0], f));
    const R = PARAMS.radius;
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // vormultipliziert
    P.auge.use();
    gl.uniformMatrix4fv(P.auge.u.uVP, false, vp);
    set3(P.auge.u.uCam, auge);
    gl.uniform1f(P.auge.u.uStaerke, 0.92 * sicht);
    setzeHimmel(P.auge);
    set3(P.auge.u.uFarbe, [0.010, 0.016, 0.030]);
    for (const s of [-1, 1]) {
      set3(P.auge.u.uPos, [
        M[0] + f[0] * R * 0.60 * breite() + r[0] * s * R * 0.30,
        M[1] + R * 0.15 * stauch(),
        M[2] + f[2] * R * 0.60 * breite() + r[2] * s * R * 0.30,
      ]);
      set3(P.auge.u.uSkala, [R * 0.20, R * 0.25, R * 0.20]);
      meshKugel.draw();
    }
    gl.disable(gl.BLEND);
  }

  /* 5. Bloom ---------------------------------------------------------------- */
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.depthMask(false);

  T.bloomA.bind([0, 0, 0, 1]);
  P.hell.use();
  gl.uniform1f(P.hell.u.uSchwelle, 1.0);
  bindTex(gl, 0, T.szene.tex, P.hell.u.uTex);
  meshQuad.draw();

  blur(T.bloomA, T.bloomB, 1, 0);
  blur(T.bloomB, T.bloomA, 0, 1);

  T.bloomC.bind([0, 0, 0, 1]);
  P.kopie.use();
  bindTex(gl, 0, T.bloomA.tex, P.kopie.u.uTex);
  meshQuad.draw();
  blur(T.bloomC, T.bloomD, 1, 0);
  blur(T.bloomD, T.bloomC, 0, 1);

  /* 6. Auf den Schirm ------------------------------------------------------- */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);

  if (zeigeDicke) {
    P.debugDicke.use();
    gl.uniform1f(P.debugDicke.u.uSkala, 1 / DICKE_SKALA);
    bindTex(gl, 0, T.dicke.tex, P.debugDicke.u.uTex);
    meshQuad.draw();
    return;
  }

  P.final.use();
  gl.uniform1f(P.final.u.uBloom, PARAMS.bloom);
  gl.uniform1f(P.final.u.uBelichtung, PARAMS.belichtung);
  gl.uniform1f(P.final.u.uKorn, PARAMS.korn);
  gl.uniform1f(P.final.u.uZeit, zeit);
  bindTex(gl, 0, T.szene.tex, P.final.u.uTex);
  bindTex(gl, 1, T.bloomA.tex, P.final.u.uBloomA);
  bindTex(gl, 2, T.bloomC.tex, P.final.u.uBloomB);
  meshQuad.draw();
}

/* --- Bewegung des Körpers (nur so viel, dass er lebendig wirkt) ------------ */

/* Fahren über den Boden. Keine Simulation — ein Antrieb mit Trägheit, dazu
 * Neigung und Streckung, die der Geschwindigkeit hinterherlaufen. Genau
 * dieses Nachlaufen macht den Unterschied zwischen "Kugel rutscht" und
 * "Masse setzt sich in Bewegung". */
function schrittFahren(dt) {
  // Alles bewegt sich relativ zur Blickrichtung des Schleims, nicht zur
  // Kamera — das ist der Kern der WoW-Steuerung. Die Kamera hängt hinten dran.
  const handbetrieb = tasten.w || tasten.s || tasten.a || tasten.d ||
                      tasten.q || tasten.e || (maus.links && maus.rechts);
  if (handbetrieb && schleim.wandern) { schleim.wandern = false; zeigeLaufKnopf(); }

  let vor = 0, seit = 0;
  if (handbetrieb) {
    // A und D drehen auf der Stelle, wie in WoW — sie laufen nicht seitwärts
    const DREH = 2.4;
    if (tasten.a) schleim.kurs -= DREH * dt;
    if (tasten.d) schleim.kurs += DREH * dt;
    if (tasten.w || (maus.links && maus.rechts)) vor += 1;
    if (tasten.s) vor -= 1;
    if (tasten.e) seit += 1;
    if (tasten.q) seit -= 1;
  } else if (schleim.wandern) {
    // Beim Wandern dreht er sich zum Ziel und läuft dann los, statt
    // seitwärts dorthin zu rutschen
    const dx = schleim.ziel[0] - schleim.x, dz = schleim.ziel[1] - schleim.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.7) neuesZiel();
    else {
      const zielKurs = Math.atan2(dz, dx);
      const ab = winkelDiff(zielKurs - schleim.kurs);
      schleim.kurs += ab * Math.min(1, dt * 2.2);
      vor = Math.max(0, Math.cos(ab));   // in der Kurve wird er langsamer
    }
  }

  const f = [Math.cos(schleim.kurs), Math.sin(schleim.kurs)];
  const r = [-f[1], f[0]];
  let wx = f[0] * vor + r[0] * seit;
  let wz = f[1] * vor + r[1] * seit;
  const l = Math.hypot(wx, wz);
  if (l > 1) { wx /= l; wz /= l; }

  // Antrieb: die Masse braucht, bis sie auf Tempo ist
  const sollX = wx * PARAMS.tempo, sollZ = wz * PARAMS.tempo;
  const kraftX = sollX - schleim.vx, kraftZ = sollZ - schleim.vz;
  const an = 1 - Math.exp(-4.5 * dt);
  schleim.vx += kraftX * an;
  schleim.vz += kraftZ * an;
  schleim.x += schleim.vx * dt;
  schleim.z += schleim.vz * dt;

  // Felsen schieben ihn weg, und die Arena hat einen Rand
  const rad = PARAMS.radius * breite() * 0.95;
  for (const f of FELSEN) {
    const dx = schleim.x - f.pos[0], dz = schleim.z - f.pos[2];
    const min = Math.max(f.skala[0], f.skala[2]) + rad;
    const d = Math.hypot(dx, dz);
    if (d > 0.001 && d < min) {
      schleim.x = f.pos[0] + dx / d * min;
      schleim.z = f.pos[2] + dz / d * min;
      const rein = (schleim.vx * dx + schleim.vz * dz) / d;
      if (rein < 0) { schleim.vx -= dx / d * rein; schleim.vz -= dz / d * rein; }
      if (schleim.wandern) neuesZiel();
    }
  }
  const weg = Math.hypot(schleim.x, schleim.z);
  if (weg > 16) { schleim.x *= 16 / weg; schleim.z *= 16 / weg; }

  // Neigung: Ziel ist die Antriebskraft, die Feder läuft ihr träge nach
  for (let i = 0; i < 2; i++) {
    const zielL = -(i === 0 ? kraftX : kraftZ) * 0.055;
    schleim.lehneV[i] += ((zielL - schleim.lehne[i]) * 90 - schleim.lehneV[i] * 11) * dt;
    schleim.lehne[i] += schleim.lehneV[i] * dt;
    schleim.lehne[i] = clamp(schleim.lehne[i], -0.35, 0.35);
  }

  // Streckung in Laufrichtung
  const v = tempoJetzt();
  schleim.streck += (Math.min(v * 0.035, 0.22) - schleim.streck) * Math.min(1, dt * 5);

  // Blickrichtung des Gesichts: beim Laufen der eigene Kurs, im Stand die
  // Kamera — sonst sähe man ihn nur von hinten.
  const st = kameraStand();
  let bx, bz;
  if (v > 0.7) { bx = f[0]; bz = f[1]; }
  else {
    const M = mitte();
    const d = v3norm([st.auge[0] - M[0], 0, st.auge[2] - M[2]]);
    bx = d[0]; bz = d[2];
  }
  const dreh = Math.min(1, dt * 4.5);
  schleim.blick[0] += (bx - schleim.blick[0]) * dreh;
  schleim.blick[1] += (bz - schleim.blick[1]) * dreh;
  const bl = Math.hypot(schleim.blick[0], schleim.blick[1]) || 1;
  schleim.blick[0] /= bl; schleim.blick[1] /= bl;

  // Kamera läuft dem Körper weich hinterher
  const M = mitte();
  const folg = Math.min(1, dt * 3.0);
  camZiel[0] += (M[0] - camZiel[0]) * folg;
  camZiel[1] += (M[1] * 0.85 - camZiel[1]) * folg;
  camZiel[2] += (M[2] - camZiel[2]) * folg;

  // ... und bleibt hinter ihm. Wer mit der linken Maustaste zur Seite schaut,
  // darf das im Stand behalten; sobald er losläuft, federt der Blick zurück
  // hinter den Rücken — genau wie die mitlaufende Kamera in WoW.
  if (cam.folgen && !cam.auto) {
    if (v > 0.35) cam.versatz -= cam.versatz * Math.min(1, dt * 1.8);
    const soll = schleim.kurs + Math.PI + cam.versatz;
    cam.yaw += winkelDiff(soll - cam.yaw) * Math.min(1, dt * 8.0);
  }

  // Zoom läuft weich nach, nicht ruckartig
  cam.distZiel = clamp(cam.distZiel, PARAMS.radius * 1.7 + 1.0, 24);
  cam.dist += (cam.distZiel - cam.dist) * Math.min(1, dt * 9);
}

/* Neues Wanderziel: weit genug weg, nicht in einem Felsen. */
function neuesZiel() {
  for (let versuch = 0; versuch < 30; versuch++) {
    const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 6.5;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - schleim.x, z - schleim.z) < 3) continue;
    let frei = true;
    for (const f of FELSEN) {
      const min = Math.max(f.skala[0], f.skala[2]) + PARAMS.radius * 1.4;
      if (Math.hypot(x - f.pos[0], z - f.pos[2]) < min) { frei = false; break; }
    }
    if (frei) { schleim.ziel[0] = x; schleim.ziel[1] = z; return; }
  }
  schleim.ziel[0] = 0; schleim.ziel[1] = 0;
}

function schritt(dt) {
  schrittFahren(dt);

  if (schleim.luft || schleim.y > 0) {
    schleim.vy -= 22 * dt;
    schleim.y += schleim.vy * dt;
    if (schleim.y <= 0) {
      schleim.y = 0;
      if (schleim.vy < -1) schleim.sqv -= Math.min(-schleim.vy, 9) * 0.10;
      schleim.vy = 0;
      schleim.luft = false;
    }
  }
  // Stauchfeder: schwingt nach der Landung aus
  schleim.sqv += (-70 * schleim.sq - 7.0 * schleim.sqv) * dt;
  schleim.sq += schleim.sqv * dt;
  schleim.sq = clamp(schleim.sq, -0.45, 0.45);

  // Delle vom Anstupsen federt zurück
  schleim.stupsV += (-55 * schleim.stups[3] - 8.5 * schleim.stupsV) * dt;
  schleim.stups[3] += schleim.stupsV * dt;

  if (cam.auto) cam.yaw += dt * 0.11;
}

/* --- Eingabe --------------------------------------------------------------- */

/* Maus nach WoW-Art:
 *   links ziehen   — nur die Kamera schwenkt, der Schleim bleibt, wie er steht
 *   rechts ziehen  — der Schleim dreht sich mit; die Kamera bleibt hinter ihm
 *   beide Tasten   — vorwärts laufen
 *   Rad            — Zoom
 * In beide Richtungen gilt dasselbe Gefühl: nach rechts ziehen heißt nach
 * rechts schauen. */
let letzteX = 0, letzteY = 0, bewegt = 0;
const EMPF = 0.006;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  if (e.button === 0) maus.links = true;
  else if (e.button === 2) maus.rechts = true;
  else return;
  bewegt = 0;
  letzteX = e.clientX; letzteY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  if (cam.auto) { cam.auto = false; zeigeKamKnoepfe(); }
});

canvas.addEventListener('pointermove', (e) => {
  if (!maus.links && !maus.rechts) return;
  const dx = e.clientX - letzteX, dy = e.clientY - letzteY;
  letzteX = e.clientX; letzteY = e.clientY;
  bewegt += Math.abs(dx) + Math.abs(dy);

  if (maus.rechts) {
    // Der Körper dreht sich, die Kamera geht 1:1 mit — kein Nachlauf,
    // sonst fühlt sich Mausschauen zäh an.
    schleim.kurs += dx * EMPF;
    cam.yaw += dx * EMPF;
    cam.versatz = 0;
    if (schleim.wandern) { schleim.wandern = false; zeigeLaufKnopf(); }
  } else {
    cam.yaw += dx * EMPF;
    cam.versatz = winkelDiff(cam.versatz + dx * EMPF);
  }
  cam.pitch = clamp(cam.pitch + dy * 0.005, -0.15, 1.35);
});

canvas.addEventListener('pointerup', (e) => {
  if (e.button === 0) {
    if (maus.links && !maus.rechts && bewegt < 5) stupsen(e.clientX, e.clientY);
    maus.links = false;
  } else if (e.button === 2) {
    maus.rechts = false;
  }
});
canvas.addEventListener('pointercancel', () => { maus.links = false; maus.rechts = false; });
addEventListener('blur', () => {
  maus.links = false; maus.rechts = false;
  for (const k in tasten) tasten[k] = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.distZiel *= 1 + Math.sign(e.deltaY) * 0.10;
}, { passive: false });

/* Klick auf den Körper: Strahl gegen die Kugel schneiden, Trefferpunkt wird
 * zur Richtung der Delle. */
function stupsen(px, py) {
  const rect = canvas.getBoundingClientRect();
  const ndc = [((px - rect.left) / rect.width) * 2 - 1, 1 - ((py - rect.top) / rect.height) * 2];

  const M = mitte();
  const { auge, ziel } = kameraStand();
  const proj = matPerspective(0.85, W / H, 0.1, 260);
  const inv = matInvert(matMul(proj, matLookAt(auge, ziel, [0, 1, 0])));
  const p = [
    inv[0] * ndc[0] + inv[4] * ndc[1] + inv[8] + inv[12],
    inv[1] * ndc[0] + inv[5] * ndc[1] + inv[9] + inv[13],
    inv[2] * ndc[0] + inv[6] * ndc[1] + inv[10] + inv[14],
  ];
  const w = inv[3] * ndc[0] + inv[7] * ndc[1] + inv[11] + inv[15];
  const dir = v3norm([p[0] / w - auge[0], p[1] / w - auge[1], p[2] / w - auge[2]]);

  // Kugel im Körpermaßstab: der Strahl wird gestaucht statt die Kugel
  const s = [1 / breite(), 1 / stauch(), 1 / breite()];
  const o = [(auge[0] - M[0]) * s[0] / PARAMS.radius, (auge[1] - M[1]) * s[1] / PARAMS.radius,
             (auge[2] - M[2]) * s[2] / PARAMS.radius];
  const d = v3norm([dir[0] * s[0], dir[1] * s[1], dir[2] * s[2]]);
  const b = v3dot(o, d), c = v3dot(o, o) - 1;
  const disk = b * b - c;
  if (disk < 0) return;
  const t = -b - Math.sqrt(disk);
  if (t < 0) return;
  const hit = v3norm([o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]);
  schleim.stups[0] = hit[0]; schleim.stups[1] = hit[1]; schleim.stups[2] = hit[2];
  schleim.stupsV += 3.4;
  schleim.sqv -= 0.25;
}

addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k in tasten) tasten[k] = false;
});

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'f2') e.preventDefault();
  if (k in tasten) { tasten[k] = true; if (cam.auto) { cam.auto = false; zeigeKamKnoepfe(); } return; }
  if (k === ' ') {
    e.preventDefault();
    if (!schleim.luft && schleim.y <= 0) { schleim.vy = 8.2; schleim.luft = true; schleim.sqv += 0.9; }
  } else if (k >= '1' && k <= '6') {
    setzePreset(Object.keys(PRESETS)[parseInt(k, 10) - 1]);
  } else if (k === 'b') { laufen(!schleim.wandern); }
  else if (k === 'c') { cam.auto = !cam.auto; if (cam.auto) cam.folgen = false; zeigeKamKnoepfe(); }
  else if (k === 'f') { cam.folgen = !cam.folgen; if (cam.folgen) cam.auto = false; zeigeKamKnoepfe(); }
  else if (k === 'p') { pause = !pause; }
  else if (k === 'x') { zeigeDicke = !zeigeDicke; }
  else if (k === 'g') { zeigeAugen = !zeigeAugen; }
  else if (k === 'h') { document.body.classList.toggle('panel-hidden'); }
  else if (k === 'r') {
    cam.yaw = Math.PI; cam.pitch = 0.30; cam.distZiel = 7.4; cam.versatz = 0;
    schleim.x = 0; schleim.z = 0; schleim.vx = 0; schleim.vz = 0; schleim.kurs = 0;
  }
  else if (k === 'f2') { schuss = true; }
});

/* --- Bedienfeld ------------------------------------------------------------ */

const CONTROLS = [
  { group: 'Material' },
  { key: 'dichte', label: 'Dichte (Absorption)', min: 0, max: 2.5, step: 0.01 },
  { key: 'brechung', label: 'Brechung', min: 0, max: 3, step: 0.01 },
  { key: 'trueb', label: 'Trübung', min: 0, max: 2, step: 0.01 },
  { key: 'streuung', label: 'Durchleuchtung', min: 0, max: 3, step: 0.01 },
  { key: 'innen', label: 'Innenleben', min: 0, max: 2, step: 0.01 },
  { key: 'schlieren', label: 'Schlierenfeinheit', min: 0.2, max: 2.5, step: 0.01 },
  { key: 'rauheit', label: 'Rauheit', min: 0.015, max: 0.4, step: 0.005 },
  { key: 'reflex', label: 'Spiegelung', min: 0, max: 2, step: 0.01 },
  { key: 'rand', label: 'Randlicht', min: 0, max: 1.5, step: 0.01 },
  { key: 'detail', label: 'Hautwellen', min: 0, max: 1, step: 0.01 },

  { group: 'Körper' },
  { key: 'radius', label: 'Größe', min: 0.8, max: 3, step: 0.01 },
  { key: 'tempo', label: 'Tempo', min: 0.5, max: 9, step: 0.1 },
  { key: 'wabbel', label: 'Wabbeln', min: 0, max: 3, step: 0.01 },
  { key: 'blasen', label: 'Blasen', min: 0, max: 40, step: 1 },
  { key: 'kern', label: 'Leuchtkern', min: 0, max: 2, step: 0.01 },

  { group: 'Licht und Bild' },
  { key: 'sonneAz', label: 'Sonne drehen', min: 0, max: 360, step: 1 },
  { key: 'sonneEl', label: 'Sonne Höhe', min: 3, max: 80, step: 1 },
  { key: 'bloom', label: 'Bloom', min: 0, max: 2, step: 0.01 },
  { key: 'belichtung', label: 'Belichtung', min: 0.3, max: 2.2, step: 0.01 },
  { key: 'korn', label: 'Filmkorn', min: 0, max: 0.06, step: 0.001 },
];

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

const defaults = Object.assign({}, PARAMS);

function setzePreset(name) {
  if (!PRESETS[name]) return;
  presetName = name;
  preset = PRESETS[name];
  sky = preset.sky;
  Object.assign(PARAMS, defaults, preset.params || {});
  for (const key in sliderEls) {
    sliderEls[key].inp.value = PARAMS[key];
    sliderEls[key].val.textContent = fmt(PARAMS[key]);
  }
  document.querySelectorAll('[data-preset]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.preset === name));
}

document.querySelectorAll('[data-preset]').forEach(btn =>
  btn.addEventListener('click', () => setzePreset(btn.dataset.preset)));
document.getElementById('btn-panel').addEventListener('click', () =>
  document.body.classList.toggle('panel-hidden'));
document.getElementById('btn-augen').addEventListener('click', () => { zeigeAugen = !zeigeAugen; });
const btnAuto = document.getElementById('btn-auto');
const btnFolgen = document.getElementById('btn-folgen');
function zeigeKamKnoepfe() {
  // Die Autodrehung hat Vorrang — solange sie läuft, ist Folgen nicht in
  // Betrieb, also darf der Knopf auch nicht leuchten.
  btnAuto.classList.toggle('active', cam.auto);
  btnFolgen.classList.toggle('active', cam.folgen && !cam.auto);
}
btnAuto.addEventListener('click', () => {
  cam.auto = !cam.auto;
  if (cam.auto) cam.folgen = false;
  zeigeKamKnoepfe();
});
btnFolgen.addEventListener('click', () => {
  cam.folgen = !cam.folgen;
  if (cam.folgen) cam.auto = false;
  zeigeKamKnoepfe();
});
zeigeKamKnoepfe();

/* Testknopf: der Schleim läuft von selbst durch die Arena. */
const btnLauf = document.getElementById('btn-lauf');
function laufen(an) {
  schleim.wandern = an;
  if (an) { neuesZiel(); cam.auto = false; zeigeKamKnoepfe(); }
  zeigeLaufKnopf();
}
function zeigeLaufKnopf() {
  btnLauf.classList.toggle('active', schleim.wandern);
  btnLauf.textContent = schleim.wandern ? 'Läuft' : 'Bewegen';
}
btnLauf.addEventListener('click', () => laufen(!schleim.wandern));
zeigeLaufKnopf();
document.getElementById('btn-schuss').addEventListener('click', () => { schuss = true; });
setzePreset('valoria');

/* --- Bildschirmfoto -------------------------------------------------------- */

let schuss = false;
function speichere() {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schleim-' + presetName + '.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
}

/* --- Schleife --------------------------------------------------------------- */

const hudFps = document.getElementById('hud-fps');
const hudMs = document.getElementById('hud-ms');
const hudPreset = document.getElementById('hud-preset');
let letzte = performance.now(), fpsAkku = 0, fpsZahl = 0;

function frame(now) {
  let dt = (now - letzte) / 1000;
  letzte = now;
  dt = Math.min(dt, 0.05);
  if (!pause) {
    zeit += dt;
    schritt(dt);
  }

  const t0 = performance.now();
  zeichne(pause ? 0 : dt);
  const t1 = performance.now();

  if (schuss) { schuss = false; speichere(); }

  fpsAkku += dt; fpsZahl++;
  if (fpsAkku > 0.4) {
    hudFps.textContent = Math.round(fpsZahl / fpsAkku);
    hudMs.textContent = (t1 - t0).toFixed(1);
    fpsAkku = 0; fpsZahl = 0;
  }
  hudPreset.textContent = preset.name;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
