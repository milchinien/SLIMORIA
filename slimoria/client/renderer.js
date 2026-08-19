'use strict';

/* ---------------------------------------------------------------------------
 * WebGL2-Renderer — ohne Fremdbibliotheken.
 *
 * Leitlinie: der Schleim ist der visuelle Mittelpunkt (GDD 10 §69). Alles
 * andere — Himmel, Boden, Requisiten, Kreaturen — ist Kulisse und muss ihn
 * lesbar machen, nicht mit ihm konkurrieren. Deshalb ist die Szene mitteltonig
 * statt schwarz: eine Silhouette liest man gegen einen Hintergrund, nicht gegen
 * ein Loch. Lesbarkeit schlaegt Effektdichte (GDD 10 §98, GDD 02 §64).
 *
 * Reihenfolge pro Bild:
 *   1. Himmel           (Verlauf, am gemessenen Horizont ausgerichtet)
 *   2. Boden            (undurchsichtig, Platten und Raster im Shader)
 *   3. Felsen und Mauern
 *   4. Kreaturen        — bewusst VOR dem Schleim (siehe unten)
 *   5. Augen und Mund   — ebenfalls VOR dem Schleim, damit sie im Gel liegen
 *   6. Bodendekale      — Schatten, Schleimspur, Zielring
 *   7. Schleim          — zwei durchscheinende Durchgaenge (hinten, dann vorn)
 * ------------------------------------------------------------------------- */

const FACTIONS = {
  eldoran: {
    name: 'Eldoran',
    deep:  [0.02, 0.17, 0.50],
    mid:   [0.13, 0.58, 0.97],
    light: [0.66, 0.93, 1.00],
    trail: [0.24, 0.60, 0.92],
  },
  ravok: {
    name: 'Ravok',
    deep:  [0.32, 0.03, 0.07],
    mid:   [0.94, 0.17, 0.20],
    light: [1.00, 0.68, 0.58],
    trail: [0.80, 0.18, 0.20],
  },
};

/* Eine Lichtstimmung fuer alle Shader. Liegt zentral, weil Boden, Fels,
 * Kreatur und Gel sonst auseinanderlaufen und die Szene flickenhaft wirkt. */
const LICHT = `
const vec3 HIMMELLICHT = vec3(0.34, 0.38, 0.47);   // Umgebungslicht von oben
const vec3 BODENLICHT  = vec3(0.27, 0.26, 0.23);   // Reflex vom Boden zurueck
const vec3 SONNE       = vec3(0.88, 0.85, 0.78);   // gerichtete Quelle
const vec3 HORIZONT    = vec3(0.405, 0.415, 0.425);// Dunst, wo Boden endet
const vec3 ZENIT       = vec3(0.135, 0.165, 0.225);// Himmel oben
`;

const VS_LIT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vPos = world.xyz;
  vNormal = uNormalMat * aNormal;
  gl_Position = uViewProj * world;
}`;

/* Der Schleim: durchscheinendes Gel mit Fresnel-Rand, Glanzlicht und
 * Durchleuchtung von hinten. Zwei Regeln bestimmen alles hier:
 *
 *  - Die Deckkraft waechst zum Silhouettenrand hin. In der Mitte schaut man
 *    durch das Gel hindurch (der umschlungene Gegner muss sichtbar IN der Masse
 *    stecken, GDD 01 §28), am Rand ist es fast dicht — genau dort entscheidet
 *    sich, ob man die Verformung ablesen kann.
 *  - Zwei kleine Glanzlichter statt eines grossen. Ein einziger starker Reflex
 *    brennt die halbe Kuppel weiss und macht aus dem Gel poliertes Glas. */
const FS_SLIME = `#version 300 es
precision highp float;
${LICHT}
in vec3 vPos;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLightCol;
uniform float uAlpha;
uniform float uTime;
uniform float uBottom;
uniform float uRadius;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);
  vec3 H = normalize(L + V);

  float ndl = max(dot(N, L), 0.0);
  float ndv = max(dot(N, V), 0.0);
  float ndh = max(dot(N, H), 0.0);
  float fres = pow(1.0 - ndv, 2.4);

  float tropfen  = pow(ndh, 300.0);          // kleiner harter Reflex
  float schimmer = pow(ndh, 26.0);           // breiter weicher Schimmer

  // Was von hinten einfaellt, traegt die Farbe des Inneren nach vorn.
  float back = pow(max(dot(V, -L), 0.0), 2.0);
  float hoehe = clamp((vPos.y - uBottom) / (uRadius * 2.2), 0.0, 1.0);

  // Dicke: mitten in der Silhouette schaut man durch viel Gel, am Rand durch
  // wenig. Daher kommt die Tiefe — nicht aus einer Textur.
  float dicke = 1.0 - fres;

  // Leises Schlieren im Inneren, nur dort wo das Gel dick ist.
  float schlieren = 0.5 + 0.5 * sin(vPos.y * 5.0 + uTime * 1.4
                                  + vPos.x * 2.3 + vPos.z * 1.7);

  vec3 kern = mix(uDeep, uMid, hoehe * 0.62 + ndl * 0.40);
  kern = mix(kern, uMid * 1.18, schlieren * 0.10 * dicke);
  kern = mix(uMid, kern, dicke * 0.55 + 0.45);

  vec3 col = kern;
  col += uLightCol * back * 0.36;                 // durchleuchtet
  col += uLightCol * fres * 0.50;                 // Fresnel-Rand
  col += BODENLICHT * max(-N.y, 0.0) * 0.35;      // Bodenreflex im Bauch
  col += uLightCol * schimmer * 0.22;
  col += vec3(1.0) * tropfen * 0.55;

  // Weiche Schulter statt harter Beschnitt: das Glanzlicht bleibt ein
  // Glanzlicht und wird kein weisser Fleck.
  col = col / (1.0 + col * 0.28);

  // Der Schleim ist der Farbanker des Bildes (GDD 10 §69): die Kulisse ist
  // bewusst neutral, also darf das Gel seine Saettigung behalten.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.22);

  float alpha = clamp(uAlpha + fres * 0.80, 0.0, 1.0);
  outColor = vec4(col, alpha);
}`;

/* Requisiten, Kreaturen, Augen, Mund. Halbraumlicht statt konstantem
 * Umgebungsterm: ohne das saufen runde Koerper auf der Schattenseite zu
 * schwarzen Loechern ab und man verliert ihre Form. */
const FS_SOLID = `#version 300 es
precision highp float;
${LICHT}
in vec3 vPos;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uColor;
uniform float uGloss;
uniform float uEmissive;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);
  float ndl = max(dot(N, L), 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 40.0) * uGloss;

  vec3 amb = mix(BODENLICHT, HIMMELLICHT, N.y * 0.5 + 0.5);
  vec3 col = uColor * (amb + SONNE * ndl)
           + HIMMELLICHT * rim * 0.30
           + vec3(spec) * 0.75;
  // uEmissive zieht die Flaeche zur reinen Grundfarbe: so bleiben Augen und
  // Mund dunkel, egal wo das Licht gerade steht.
  col = mix(col, uColor, uEmissive);
  outColor = vec4(col, 1.0);
}`;

/* Himmel: nur ein Verlauf, aber am tatsaechlichen Horizont ausgerichtet.
 * uHorizont ist die Bildhoehe (NDC) der Horizontlinie — dadurch trifft die
 * Dunstfarbe des Himmels immer genau die Dunstfarbe des Bodens und die Ebene
 * endet nicht an einer harten schwarzen Kante. */
const VS_HIMMEL = `#version 300 es
layout(location = 0) in vec3 aPos;
out float vHoehe;
void main() {
  vHoehe = aPos.z;
  gl_Position = vec4(aPos.x, aPos.z, 0.0, 1.0);
}`;

const FS_HIMMEL = `#version 300 es
precision highp float;
${LICHT}
in float vHoehe;
uniform float uHorizont;
out vec4 outColor;
void main() {
  float ueber = max(vHoehe - uHorizont, 0.0);
  outColor = vec4(mix(HORIZONT, ZENIT, smoothstep(0.0, 0.62, ueber)), 1.0);
}`;

const VS_GROUND = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform float uSize;
out vec3 vWorld;
void main() {
  vWorld = vec3(aPos.x * uSize, 0.0, aPos.z * uSize);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

/* Boden: eine schlichte Testflaeche (GDD 12 §4), kein Kunstwerk. Er hat genau
 * drei Aufgaben — hell genug sein, dass die Silhouette des Schleims und sein
 * Schatten darauf liegen; genug Struktur tragen, dass Tempo und Entfernung
 * ablesbar sind; und sagen, wo die Arena endet. */
const FS_GROUND = `#version 300 es
precision highp float;
${LICHT}
in vec3 vWorld;
uniform float uBound;
out vec4 outColor;

void main() {
  vec2 p = vWorld.xz;

  // Plattenraster: 2 m fein, 10 m grob. Als Naht, nicht als Neonlinie.
  vec2 uv = p * 0.5;
  vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
  float naht = 1.0 - min(min(g.x, g.y), 1.0);

  vec2 uv2 = p * 0.1;
  vec2 g2 = abs(fract(uv2 - 0.5) - 0.5) / fwidth(uv2);
  float haupt = 1.0 - min(min(g2.x, g2.y), 1.0);

  // Schachbrett auf den Platten. Ohne diese Struktur laesst sich am stehenden
  // Bild nicht sehen, wie schnell sich der Schleim bewegt.
  vec2 zelle = floor(p * 0.5);
  float schach = mod(zelle.x + zelle.y, 2.0);

  // Grossflaechige Fleckigkeit, damit die Ebene nicht wie Millimeterpapier wirkt.
  float fleck = sin(p.x * 0.31 + 1.7) * sin(p.y * 0.27 - 0.9)
              + 0.5 * sin(p.x * 0.13 - 2.4) * sin(p.y * 0.11 + 1.1);

  float innen = 1.0 - smoothstep(uBound - 0.5, uBound + 0.1,
                                 max(abs(p.x), abs(p.y)));

  vec3 col = mix(vec3(0.250, 0.252, 0.260), vec3(0.330, 0.320, 0.286), innen);
  col *= 1.0 + schach * 0.062 + fleck * 0.040;
  col -= vec3(0.048, 0.046, 0.042) * naht * 0.8;
  col += vec3(0.070, 0.064, 0.050) * haupt;

  // Arenakante: ein warmer Streifen sagt, wo die Testflaeche aufhoert.
  float kante = smoothstep(0.75, 0.0, abs(max(abs(p.x), abs(p.y)) - uBound));
  col = mix(col, vec3(0.44, 0.38, 0.25), kante * 0.50);

  // Ferne loest sich in denselben Dunst auf wie der Himmel. Frueh genug, dass
  // zwischen Arenakante und Horizont kein dunkler Ring stehenbleibt.
  float dunst = smoothstep(uBound * 0.7, uBound * 1.6, length(p));
  col = mix(col, HORIZONT, dunst);

  outColor = vec4(col, 1.0);
}`;

const VS_DECAL = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec2 vUv;
void main() {
  vUv = aPos.xz;
  gl_Position = uViewProj * uModel * vec4(aPos, 1.0);
}`;

const FS_DECAL = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uRing;
out vec4 outColor;
void main() {
  float d = length(vUv);
  float a;
  if (uRing > 0.5) {
    // Schmaler Reif. Ein breiter Ring ueberstrahlt die Kreatur, die er meint.
    a = smoothstep(1.0, 0.90, d) * smoothstep(0.74, 0.84, d);
  } else {
    a = pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
  }
  if (a <= 0.001) discard;
  outColor = vec4(uColor, a * uAlpha);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('Shader: ' + gl.getShaderInfoLog(sh) + '\n' + src);
  }
  return sh;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('Programm: ' + gl.getProgramInfoLog(p));
  }
  const u = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(p, i).name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) throw new Error('WebGL2 wird von diesem Browser nicht unterstützt.');

  const R = {
    gl,
    slime: program(gl, VS_LIT, FS_SLIME),
    solid: program(gl, VS_LIT, FS_SOLID),
    ground: program(gl, VS_GROUND, FS_GROUND),
    himmel: program(gl, VS_HIMMEL, FS_HIMMEL),
    decal: program(gl, VS_DECAL, FS_DECAL),
    light: [0.55, 0.78, 0.32],
    /* Erweiterungspunkt fuer die Lanes: { name, order, draw(gl, ctx) }.
     * Siehe ARCHITEKTUR.md §5 — renderer.js selbst bleibt gesperrt. */
    extras: [],
  };
  R.drawProp = (mesh, model, nmat, color, gloss, emissive, cam, vp) =>
    drawProp(R, mesh, model, nmat, color, gloss, emissive, cam, vp);
  R.drawDecal = (x, z, radius, color, alpha, ring, vp) =>
    drawDecal(R, x, z, radius, color, alpha, ring, vp);

  /* --- Puffer ----------------------------------------------------------- */
  const sphere = createIcosphere(2);
  const sphereNormals = new Float32Array(sphere.positions);   // Kugel: Pos == Normale
  R.propMesh = makeMesh(gl, sphere.positions, sphereNormals, sphere.indices);

  const box = createBox();
  R.boxMesh = makeMesh(gl, box.positions, box.normals, box.indices);

  const quad = new Float32Array([-1,0,-1,  1,0,-1,  1,0,1,  -1,0,1]);
  R.quadMesh = makeMesh(gl, quad, null, new Uint16Array([0,1,2, 0,2,3]));

  return R;
}

function makeMesh(gl, positions, normals, indices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const pb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pb);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  let nb = null;
  if (normals) {
    nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  }

  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  return { vao, pb, nb, count: indices.length };
}

/* Normalenmatrix für reine Skalierung/Verschiebung: 1/s je Achse. */
function normalMat(sx, sy, sz) {
  return new Float32Array([1/sx,0,0, 0,1/sy,0, 0,0,1/sz]);
}

const IDENTITY_N = new Float32Array([1,0,0, 0,1,0, 0,0,1]);

/* --------------------------------------------------------------------------
 * Ausgerichtete Teile
 *
 * M4.trs kann nur achsparallel skalieren. Fuer alles, was sich an eine
 * Richtung anschmiegen soll — ein Auge auf der gewoelbten Oberflaeche, ein
 * Ohr, ein Hauer — braucht es eine gedrehte Modellmatrix. Beide Helfer
 * schreiben in dieselben Kratzpuffer und werden deshalb immer unmittelbar
 * vor dem zugehoerigen drawProp benutzt.
 *
 * Normalenmatrix ist (M⁻¹)ᵀ; fuer Drehung R mal Skalierung S ergibt das R·S⁻¹.
 * ------------------------------------------------------------------------ */

const _mm = new Float32Array(16);
const _nm = new Float32Array(9);
const _B = { ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 };

/* Tangentialbasis zu einer Normalen: u waagerecht auf der Flaeche, v quer dazu. */
function tangentBasis(nx, ny, nz, out) {
  // Bezugsrichtung ist die Welt-Senkrechte; zeigt die Normale selbst nach oben,
  // weicht sie auf die Tiefenachse aus — sonst waere das Kreuzprodukt null.
  const steil = Math.abs(ny) > 0.92;
  const ay = steil ? 0 : 1, az = steil ? 1 : 0;
  let ux = ay * nz - az * ny;
  let uy = az * nx;
  let uz = -ay * nx;
  const l = Math.hypot(ux, uy, uz) || 1;
  ux /= l; uy /= l; uz /= l;
  out.ux = ux; out.uy = uy; out.uz = uz;
  out.vx = ny * uz - nz * uy;
  out.vy = nz * ux - nx * uz;
  out.vz = nx * uy - ny * ux;
}

/* Ellipsoid, dessen dritte Achse auf n liegt: mit ru/rv breit und rn flach
 * wird daraus eine Linse, die auf der Oberflaeche aufliegt statt davorzukleben. */
function patchModel(px, py, pz, B, nx, ny, nz, ru, rv, rn) {
  _mm[0] = B.ux * ru; _mm[1] = B.uy * ru; _mm[2] = B.uz * ru; _mm[3] = 0;
  _mm[4] = B.vx * rv; _mm[5] = B.vy * rv; _mm[6] = B.vz * rv; _mm[7] = 0;
  _mm[8] = nx * rn;   _mm[9] = ny * rn;   _mm[10] = nz * rn;  _mm[11] = 0;
  _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
  _nm[0] = B.ux / ru; _nm[1] = B.uy / ru; _nm[2] = B.uz / ru;
  _nm[3] = B.vx / rv; _nm[4] = B.vy / rv; _nm[5] = B.vz / rv;
  _nm[6] = nx / rn;   _nm[7] = ny / rn;   _nm[8] = nz / rn;
  return _mm;
}

/* Skalierung plus Drehung um die Senkrechte. c/s sind Cosinus und Sinus des
 * Gierwinkels: die lokale x-Achse zeigt dann nach (c, 0, s). */
function yawModel(px, py, pz, sx, sy, sz, c, s) {
  _mm[0] = sx * c; _mm[1] = 0;  _mm[2] = sx * s;  _mm[3] = 0;
  _mm[4] = 0;      _mm[5] = sy; _mm[6] = 0;       _mm[7] = 0;
  _mm[8] = -sz * s; _mm[9] = 0; _mm[10] = sz * c; _mm[11] = 0;
  _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
  _nm[0] = c / sx; _nm[1] = 0;      _nm[2] = s / sx;
  _nm[3] = 0;      _nm[4] = 1 / sy; _nm[5] = 0;
  _nm[6] = -s / sz; _nm[7] = 0;     _nm[8] = c / sz;
  return _mm;
}

function drawProp(R, mesh, model, nmat, color, gloss, emissive, cam, viewProj) {
  const gl = R.gl, s = R.solid;
  gl.useProgram(s.p);
  gl.bindVertexArray(mesh.vao);
  gl.uniformMatrix4fv(s.u.uViewProj, false, viewProj);
  gl.uniformMatrix4fv(s.u.uModel, false, model);
  gl.uniformMatrix3fv(s.u.uNormalMat, false, nmat);
  gl.uniform3fv(s.u.uCam, cam);
  gl.uniform3fv(s.u.uLight, R.light);
  gl.uniform3fv(s.u.uColor, color);
  gl.uniform1f(s.u.uGloss, gloss);
  gl.uniform1f(s.u.uEmissive, emissive || 0);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
}

function drawDecal(R, x, z, radius, color, alpha, ring, viewProj) {
  const gl = R.gl, d = R.decal;
  gl.useProgram(d.p);
  gl.bindVertexArray(R.quadMesh.vao);
  gl.uniformMatrix4fv(d.u.uViewProj, false, viewProj);
  gl.uniformMatrix4fv(d.u.uModel, false, M4.trs(x, 0.012, z, radius, 1, radius));
  gl.uniform3fv(d.u.uColor, color);
  gl.uniform1f(d.u.uAlpha, alpha);
  gl.uniform1f(d.u.uRing, ring ? 1 : 0);
  gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);
}

/* Bildhoehe der Horizontlinie in NDC. Ein Punkt weit vorn auf Augenhoehe liegt
 * per Definition auf dem Horizont — projizieren genuegt. */
function horizontNdc(camera, cam) {
  let fx = camera.tx - cam[0], fz = camera.tz - cam[2];
  const l = Math.hypot(fx, fz) || 1;
  fx /= l; fz /= l;
  const px = cam[0] + fx * 400, py = cam[1], pz = cam[2] + fz * 400;
  const m = camera.viewProj;
  const y = m[1] * px + m[5] * py + m[9] * pz + m[13];
  const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
  if (!w) return 0;
  return clamp(y / w, -4, 4);
}

const _s = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };

function renderScene(R, scene) {
  const gl = R.gl;
  const { view, world, slime, camera, params, faction, time, debug } = scene;
  const pal = FACTIONS[faction];
  const b = slime.body;

  gl.viewport(0, 0, view.pw, view.ph);
  gl.clearColor(0.135, 0.165, 0.225, 1);
  gl.depthMask(true);                          // sonst raeumt clear die Tiefe nicht
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.BLEND);

  const viewProj = camera.viewProj;
  const cam = camera.eye;

  /* --- Himmel ------------------------------------------------------------ */
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.useProgram(R.himmel.p);
  gl.bindVertexArray(R.quadMesh.vao);
  gl.uniform1f(R.himmel.u.uHorizont, horizontNdc(camera, cam));
  gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);

  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);

  /* --- Boden ------------------------------------------------------------- */
  gl.useProgram(R.ground.p);
  gl.bindVertexArray(R.quadMesh.vao);
  gl.uniformMatrix4fv(R.ground.u.uViewProj, false, viewProj);
  gl.uniform1f(R.ground.u.uSize, world.bounds * 3);
  gl.uniform1f(R.ground.u.uBound, world.bounds);
  gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);

  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  /* --- Felsen und Mauern -------------------------------------------------- */
  for (const o of world.obstacles) {
    if (o.type === 'rock') {
      // Requisiten bleiben absichtlich stumpf und neutral: sie sollen die
      // Ebene gliedern, nicht mit dem Schleim um Aufmerksamkeit streiten.
      drawProp(R, R.propMesh, M4.trs(o.x, o.y, o.z, o.r, o.r * 0.8, o.r),
               normalMat(o.r, o.r * 0.8, o.r), [0.335, 0.330, 0.310], 0.12, 0, cam, viewProj);
    } else {
      drawProp(R, R.boxMesh, M4.trs(o.x, o.y, o.z, o.w * 0.5, o.h * 0.5, o.d * 0.5),
               normalMat(o.w * 0.5, o.h * 0.5, o.d * 0.5), [0.355, 0.360, 0.375], 0.08, 0, cam, viewProj);
    }
  }

  /* --- Kreaturen ---------------------------------------------------------- */
  if (scene.game) drawKreaturen(R, scene, cam, viewProj);

  /* --- Gesicht ------------------------------------------------------------ */
  drawFace(R, slime, params, cam, viewProj);

  /* --- Bodendekale --------------------------------------------------------- */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);        // das Boden-Quad liegt je nach Blick falschherum

  for (const t of slime.trail) {
    drawDecal(R, t.x, t.z, t.r, pal.trail, Math.max(0, t.life) * 0.26, false, viewProj);
  }

  /* Schatten entlang der Lichtrichtung auf den Boden projiziert — direkt
   * unter dem Körper wäre er vollständig verdeckt und damit wirkungslos.
   * Der Kernschatten sitzt zusaetzlich mittig: er ist es, der die Masse am
   * Boden festhaelt, sobald der Boden nicht mehr schwarz ist. */
  const spread = bodySpread(b);
  const L = R.light;
  const shX = b.cx - (L[0] / L[1]) * b.cy;
  const shZ = b.cz - (L[2] / L[1]) * b.cy;
  const lift = clamp(1 - (b.cy - params.radius * 0.5) / (params.radius * 6), 0.2, 1);
  drawDecal(R, shX, shZ, spread * 1.75, [0.06, 0.07, 0.09], 0.30 * lift, false, viewProj);
  drawDecal(R, b.cx, b.cz, spread * 1.05, [0.05, 0.06, 0.08], 0.38 * lift, false, viewProj);
  drawDecal(R, b.cx, b.cz, spread * 0.60, [0.04, 0.05, 0.07], 0.34 * lift, false, viewProj);

  if (scene.game) {
    for (const k of scene.game.kreaturen) {
      const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1);
      if (f <= 0.01) continue;
      drawDecal(R, k.x, k.z, k.groesse * 1.45 * f, [0.05, 0.06, 0.08], 0.48, false, viewProj);
      if (scene.game.zielId === k.id) {
        /* Zielmarkierung am Boden: ohne sie muss man das HUD lesen, um zu
         * wissen, wen man angreift (GDD 02 §3). Schmal und ruhig — der Ring
         * soll auf die Kreatur zeigen, nicht sie ueberstrahlen. */
        const pz = 1 + Math.sin(time * 5) * 0.04;
        drawDecal(R, k.x, k.z, (k.groesse * 1.8 + 0.35) * pz, [1.0, 0.80, 0.32], 0.70, true, viewProj);
      }
    }
    if (world.friedhof) {
      drawDecal(R, world.friedhof.x, world.friedhof.z, 2.2, [0.62, 0.80, 0.98], 0.34, true, viewProj);
    }
  }

  if (slime.target) {
    const pulse = 1 + Math.sin(time * 6) * 0.08;
    drawDecal(R, slime.target.x, slime.target.z, 0.7 * pulse, [0.45, 1.0, 0.75], 0.8, true, viewProj);
  }

  gl.enable(gl.CULL_FACE);

  /* --- Schleim ------------------------------------------------------------- */
  // Gezeichnet wird die feiner unterteilte Hülle, nicht das Physiknetz.
  gl.bindVertexArray(R.slimeMesh.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, R.slimeMesh.pb);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, scene.surface.positions);
  gl.bindBuffer(gl.ARRAY_BUFFER, R.slimeMesh.nb);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, scene.surface.normals);

  const s = R.slime;
  gl.useProgram(s.p);
  gl.uniformMatrix4fv(s.u.uViewProj, false, viewProj);
  gl.uniformMatrix4fv(s.u.uModel, false, M4.identity());
  gl.uniformMatrix3fv(s.u.uNormalMat, false, IDENTITY_N);
  gl.uniform3fv(s.u.uCam, cam);
  gl.uniform3fv(s.u.uLight, R.light);
  gl.uniform3fv(s.u.uDeep, pal.deep);
  gl.uniform3fv(s.u.uMid, pal.mid);
  gl.uniform3fv(s.u.uLightCol, pal.light);
  gl.uniform1f(s.u.uTime, time);
  gl.uniform1f(s.u.uBottom, 0);
  gl.uniform1f(s.u.uRadius, params.radius);

  gl.cullFace(gl.FRONT);                       // Rückseite zuerst: Tiefe im Gel
  gl.uniform1f(s.u.uAlpha, 0.36);
  gl.drawElements(gl.TRIANGLES, R.slimeMesh.count, gl.UNSIGNED_SHORT, 0);

  gl.cullFace(gl.BACK);
  // Der Fresnel-Term im Shader zieht die Deckkraft am Silhouettenrand auf 1:
  // dort wird die Kontur hart, in der Mitte bleibt das Gel durchsichtig.
  gl.uniform1f(s.u.uAlpha, 0.56);
  gl.drawElements(gl.TRIANGLES, R.slimeMesh.count, gl.UNSIGNED_SHORT, 0);

  gl.depthMask(true);
  gl.disable(gl.BLEND);

  /* --- Erweiterungen der Lanes -------------------------------------------- */
  if (R.extras && R.extras.length) {
    const ctx = { camera, cam, viewProj, time, params, game: scene.game, pal, world };
    for (const e of R.extras.slice().sort((a, b) => (a.order || 0) - (b.order || 0))) {
      try { e.draw(gl, ctx); } catch (err) { console.error('extra "' + e.name + '":', err); }
    }
  }

  if (debug) drawDebugPoints(R, slime, cam, viewProj);
}

function bodySpread(b) {
  let max = 0;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const d = Math.hypot(b.pos[k] - b.cx, b.pos[k + 2] - b.cz);
    if (d > max) max = d;
  }
  return max;
}

/* --------------------------------------------------------------------------
 * Kreaturen
 *
 * Vor dem Schleim gezeichnet. Weil das Gel durchscheinend ist, steckt ein
 * umschlungener Gegner danach sichtbar IN der Masse (GDD 01 §28) — er wird
 * nicht bloss verdeckt.
 *
 * Drei Arten, drei Silhouetten. Alles besteht weiterhin aus Kugeln, nur die
 * Anordnung entscheidet: Wolf hoch und schlank, mit Ohren, langer Schnauze und
 * aufgestellter Rute. Eber tief und breit, mit Nackenbuckel, Borstenkamm und
 * hellen Hauern. Schleimling eine kleine Kuppel ohne Beine. Mehr braucht es
 * nicht — man muss sie unterscheiden koennen, nicht bewundern.
 * ------------------------------------------------------------------------ */

const KNOCHEN = [0.88, 0.85, 0.72];
const PUPILLE = [0.04, 0.05, 0.07];

function drawKreaturen(R, scene, cam, viewProj) {
  const b = scene.slime.body;

  for (const k of scene.game.kreaturen) {
    const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1)
            * (k.lebt ? 1 : Math.max(0, 1 - k.tot));
    if (f <= 0.01) continue;
    const g = k.groesse * f;

    // Der Kopf zeigt zum Schleim — der Gegner beachtet einen.
    let hx = b.cx - k.x, hz = b.cz - k.z;
    const hl = Math.hypot(hx, hz) || 1;
    hx /= hl; hz /= hl;

    // Sterben heisst zusammensacken, nicht schrumpfen: die Beine geben nach.
    const sack = k.lebt ? 1 : Math.max(0.2, 1 - 0.65 * k.tot);
    const wack = Math.sin(k.wackeln) * 0.05;

    const ziel = scene.game.zielId === k.id;
    // Ziel wird gleichmaessig aufgehellt, nicht eingefaerbt: sonst aendert ein
    // grauer Wolf beim Anvisieren seine Art.
    const c = k.farbe;
    const hell = ziel ? [Math.min(1, c[0] * 1.5), Math.min(1, c[1] * 1.5), Math.min(1, c[2] * 1.5)]
                      : c;
    // Beine, Ohren und Rute nur leicht abgesetzt: zu dunkel und sie loesen
    // sich vom Rumpf, dann sieht die Kreatur aus wie lose Einzelteile.
    const dunkel = [hell[0] * 0.70, hell[1] * 0.70, hell[2] * 0.74];
    const em = ziel ? 0.14 : 0;

    /* Ein Koerperteil, in Kreaturkoordinaten: vor = nach vorn, hoch = nach
     * oben, quer = zur Seite. Alles in Vielfachen der Kreaturgroesse. */
    const teil = (vor, hoch, quer, lx, ly, lz, col, gloss) => {
      drawProp(R, R.propMesh,
        yawModel(k.x + hx * vor * g - hz * quer * g,
                 k.y + hoch * g * sack,
                 k.z + hz * vor * g + hx * quer * g,
                 lx * g, ly * g * sack, lz * g, hx, hz),
        _nm, col, gloss, em, cam, viewProj);
    };

    /* Eine Spitze — Ohr, Hauer, Borste, Rute: laenglicher Koerper entlang einer
     * frei gewaehlten Richtung. */
    const spitze = (vor, hoch, quer, dv, dh, dq, laenge, dick, col) => {
      let dx = hx * dv - hz * dq, dy = dh, dz = hz * dv + hx * dq;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      const px = k.x + hx * vor * g - hz * quer * g;
      const py = k.y + hoch * g * sack;
      const pz = k.z + hz * vor * g + hx * quer * g;
      const halb = laenge * g * 0.5;
      tangentBasis(dx, dy, dz, _B);
      drawProp(R, R.propMesh,
        patchModel(px + dx * halb, py + dy * halb, pz + dz * halb,
                   _B, dx, dy, dz, dick * g, dick * g, halb),
        _nm, col, 0.2, em, cam, viewProj);
    };

    const auge = (vor, hoch, quer, r) => teil(vor, hoch, quer, r, r, r, PUPILLE, 0.9);

    if (k.art === 'eber') {
      // Tief, breit, schwer. Der Buckel sitzt hoeher als der Kopf.
      teil( 0.42, 0.24,  0.34, 0.17, 0.24, 0.17, dunkel, 0.15);
      teil( 0.42, 0.24, -0.34, 0.17, 0.24, 0.17, dunkel, 0.15);
      teil(-0.40, 0.24,  0.32, 0.17, 0.24, 0.17, dunkel, 0.15);
      teil(-0.40, 0.24, -0.32, 0.17, 0.24, 0.17, dunkel, 0.15);
      teil(-0.05, 0.78,  0.00, 0.78, 0.56, 0.58, hell, 0.2);
      teil( 0.34, 1.04,  0.00, 0.42, 0.44, 0.44, hell, 0.2);
      spitze( 0.30, 1.34, 0.0, -0.35, 1.0, 0.0, 0.36, 0.06, dunkel);
      spitze( 0.02, 1.26, 0.0, -0.40, 1.0, 0.0, 0.32, 0.06, dunkel);
      teil( 0.92, 0.68,  0.00, 0.36, 0.34, 0.34, hell, 0.2);
      teil( 1.26, 0.56,  0.00, 0.24, 0.20, 0.22, dunkel, 0.35);
      spitze( 1.28, 0.60,  0.16, 0.45, 0.85,  0.12, 0.42, 0.055, KNOCHEN);
      spitze( 1.28, 0.60, -0.16, 0.45, 0.85, -0.12, 0.42, 0.055, KNOCHEN);
      auge( 1.06, 0.86,  0.18, 0.058);
      auge( 1.06, 0.86, -0.18, 0.058);

    } else if (k.art === 'schleimling') {
      // Kleine Kuppel ohne Beine, mit wippendem Tropfen obenauf.
      teil( 0.00, 0.62,  0.00, 0.85, 0.62, 0.80, hell, 0.65);
      teil(-0.05, 1.16 + wack * 2.0, 0.0, 0.24, 0.30, 0.24, hell, 0.65);
      auge( 0.62, 0.74,  0.26, 0.13);
      auge( 0.62, 0.74, -0.26, 0.13);
      teil( 0.76, 0.44,  0.00, 0.14, 0.06, 0.09, PUPILLE, 0.4);

    } else {
      // Wolf: hoch auf den Beinen, lange Schnauze, spitze Ohren, Rute hoch.
      teil( 0.45, 0.42,  0.30, 0.145, 0.42, 0.145, dunkel, 0.15);
      teil( 0.45, 0.42, -0.30, 0.145, 0.42, 0.145, dunkel, 0.15);
      teil(-0.42, 0.42,  0.28, 0.145, 0.42, 0.145, dunkel, 0.15);
      teil(-0.42, 0.42, -0.28, 0.145, 0.42, 0.145, dunkel, 0.15);
      teil( 0.00, 0.95,  0.00, 0.72, 0.40, 0.36, hell, 0.2);
      teil( 0.45, 1.00,  0.00, 0.36, 0.38, 0.34, hell, 0.2);
      teil( 1.05, 1.30 + wack, 0.0, 0.32, 0.28, 0.26, hell, 0.2);
      teil( 1.42, 1.20 + wack, 0.0, 0.26, 0.14, 0.15, dunkel, 0.3);
      spitze( 0.98, 1.46 + wack,  0.14, 0.10, 1.0,  0.35, 0.44, 0.07, dunkel);
      spitze( 0.98, 1.46 + wack, -0.14, 0.10, 1.0, -0.35, 0.44, 0.07, dunkel);
      spitze(-0.72, 1.05, 0.0, -0.70, 0.90, 0.0, 0.85, 0.125, dunkel);
      auge( 1.22, 1.36 + wack,  0.13, 0.062);
      auge( 1.22, 1.36 + wack, -0.13, 0.062);
    }
  }
}

/* --------------------------------------------------------------------------
 * Gesicht
 *
 * GDD 01 §7: das Gesicht ist Bestandteil des Koerpers, nie aufgesetzt. Deshalb
 * besteht es aus flachen Linsen, die auf der tatsaechlich verformten
 * Oberflaeche liegen und mit ihr wandern und kippen — keine Kugeln, die davor
 * schweben. Gezeichnet wird alles vor dem Gel, also schaut man durch den
 * Schleim auf das Gesicht: es liegt IM Koerper.
 *
 * Kontrast ist dabei das Entscheidende. Ein heller Augapfel hinter blauem Gel
 * wird zu einer blassen Blase und verschwindet; die Referenz (Slime Rancher)
 * loest das mit sehr dunklen, grossen Augenformen und einem einzigen hellen
 * Lichtpunkt darin. Genau das macht das hier auch.
 * ------------------------------------------------------------------------ */

const AUGE_HELL   = [0.78, 0.85, 0.92];
const AUGE_DUNKEL = [0.020, 0.035, 0.070];
const MUND        = [0.200, 0.045, 0.060];

function drawFace(R, s, P, cam, viewProj) {
  const b = s.body;
  const rEye = P.radius * 0.30;
  const blinkAmt = clamp(s.blink / 0.07, 0, 1);
  const offen = s.mouth;

  for (const side of [-1, 1]) {
    const d = faceDir(s, side * 0.60, 0.30);
    surfaceSample(b, d.x, d.y, d.z, _s);
    const nx = _s.nx, ny = _s.ny, nz = _s.nz;
    tangentBasis(nx, ny, nz, _B);

    /* Die drei Lagen liegen gestaffelt unter der Haut: heller Grund am
     * tiefsten, Pupille darueber, Lichtpunkt zuoberst. Nichts ragt heraus —
     * sonst klebte eine Kugel auf dem Koerper statt darin zu liegen. */
    const rv = rEye * 0.94 * (1 - 0.9 * blinkAmt);
    drawProp(R, R.propMesh,
      patchModel(_s.x - nx * rEye * 0.46, _s.y - ny * rEye * 0.46, _s.z - nz * rEye * 0.46,
                 _B, nx, ny, nz, rEye, rv, rEye * 0.30),
      _nm, AUGE_HELL, 0.3, 0.40, cam, viewProj);

    // Die Pupille fuellt den Grund fast aus: uebrig bleibt nur ein schmaler
    // heller Saum. Ein breiter Ring machte aus dem Auge eine Zielscheibe.
    // Die Blickrichtung wird in die Tangentialebene gelegt, statt die Kugel
    // nach aussen zu schieben — so bleibt sie Teil der Oberflaeche; der Saum
    // wird dabei einseitig schmal und genau das liest man als Blick.
    const du = clamp(s.look.x * _B.ux + s.look.y * _B.uy + s.look.z * _B.uz, -1, 1);
    const dv = clamp(s.look.x * _B.vx + s.look.y * _B.vy + s.look.z * _B.vz, -1, 1);
    const pr = rEye * 0.88;
    const px = _s.x - nx * rEye * 0.28 + _B.ux * du * rEye * 0.08 + _B.vx * dv * rEye * 0.06;
    const py = _s.y - ny * rEye * 0.28 + _B.uy * du * rEye * 0.08 + _B.vy * dv * rEye * 0.06;
    const pz = _s.z - nz * rEye * 0.28 + _B.uz * du * rEye * 0.08 + _B.vz * dv * rEye * 0.06;
    drawProp(R, R.propMesh,
      patchModel(px, py, pz, _B, nx, ny, nz,
                 pr, Math.max(pr * (1 - 0.92 * blinkAmt), rEye * 0.03), rEye * 0.24),
      _nm, AUGE_DUNKEL, 0.6, 0.78, cam, viewProj);

    if (blinkAmt < 0.55) {
      // Ein einziger Lichtpunkt macht aus der dunklen Flaeche ein nasses Auge.
      const gr = rEye * 0.20;
      drawProp(R, R.propMesh,
        patchModel(px - _B.ux * pr * 0.42 + _B.vx * pr * 0.42 - nx * rEye * 0.10,
                   py - _B.uy * pr * 0.42 + _B.vy * pr * 0.42 - ny * rEye * 0.10,
                   pz - _B.uz * pr * 0.42 + _B.vz * pr * 0.42 - nz * rEye * 0.10,
                   _B, nx, ny, nz, gr, gr, rEye * 0.09),
        _nm, [1, 1, 1], 1.0, 0.95, cam, viewProj);
    }
  }

  /* Mund: ein durchgehender Bogen aus ueberlappenden Linsen, der beim Oeffnen
   * in der Mitte in die Hoehe waechst. Bewusst eine einzige dunkle Form —
   * eine gut gemachte einfache Form schlaegt zehn komplexe (GDD 02 §64). */
  const steps = 15;
  for (let i = 0; i < steps; i++) {
    const t = (i / (steps - 1)) * 2 - 1;
    const yaw = t * 0.40;
    const pitch = -0.13 - (1 - t * t) * 0.14 + offen * 0.05;
    const d = faceDir(s, yaw, pitch);
    surfaceSample(b, d.x, d.y, d.z, _s);
    const nx = _s.nx, ny = _s.ny, nz = _s.nz;
    tangentBasis(nx, ny, nz, _B);

    // Reichlich Ueberlappung: einzeln erkennbare Glieder machten aus dem Mund
    // eine Perlenkette statt einer Form.
    const ru = P.radius * 0.115;
    const rv = P.radius * (0.055 + offen * 0.24 * (1 - t * t * 0.55));
    drawProp(R, R.propMesh,
      patchModel(_s.x - nx * P.radius * 0.075, _s.y - ny * P.radius * 0.075,
                 _s.z - nz * P.radius * 0.075,
                 _B, nx, ny, nz, ru, rv, P.radius * 0.055),
      _nm, MUND, 0.4, 0.72, cam, viewProj);
  }
}

function drawDebugPoints(R, s, cam, viewProj) {
  const b = s.body;
  for (let i = 0; i < b.n; i += 1) {
    const k = i * 3;
    const r = 0.035;
    drawProp(R, R.propMesh, M4.trs(b.pos[k], b.pos[k + 1], b.pos[k + 2], r, r, r),
             normalMat(r, r, r), [1.0, 0.85, 0.3], 0, 0.9, cam, viewProj);
  }
}
