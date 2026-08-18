'use strict';

/* ---------------------------------------------------------------------------
 * WebGL2-Renderer — ohne Fremdbibliotheken.
 *
 * Reihenfolge pro Bild:
 *   1. Boden (undurchsichtig, Gitter im Shader)
 *   2. Felsen und Mauern
 *   3. Augen und Mund  — bewusst VOR dem Schleim, damit sie im Gel liegen
 *   4. Bodendekale     — Schatten, Schleimspur, Zielring
 *   5. Schleim         — zwei durchscheinende Durchgänge (hinten, dann vorn)
 * ------------------------------------------------------------------------- */

const FACTIONS = {
  valoria: {
    name: 'Valoria',
    deep:  [0.04, 0.20, 0.42],
    mid:   [0.16, 0.55, 0.86],
    light: [0.62, 0.92, 1.00],
    trail: [0.25, 0.60, 0.85],
  },
  drakhar: {
    name: 'Drakhar',
    deep:  [0.30, 0.03, 0.08],
    mid:   [0.80, 0.16, 0.22],
    light: [1.00, 0.66, 0.60],
    trail: [0.70, 0.20, 0.22],
  },
};

const VS_LIT = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
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
 * Durchleuchtung von hinten. Der Farbverlauf folgt der Höhe im Körper,
 * damit die Masse unten satt und oben hell wirkt. */
const FS_SLIME = `#version 300 es
precision highp float;
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
uniform float uFacing;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);
  vec3 H = normalize(L + V);

  float ndl = max(dot(N, L), 0.0);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float spec = pow(max(dot(N, H), 0.0), 120.0);
  float spec2 = pow(max(dot(N, H), 0.0), 18.0) * 0.25;

  // Durchleuchtung: was von hinten kommt, trägt die Farbe des Inneren
  float back = pow(max(dot(V, -L), 0.0), 2.2);
  float height = clamp((vPos.y - uBottom) / (uRadius * 2.2), 0.0, 1.0);

  // leises Schlieren im Inneren, damit das Gel lebendig wirkt
  float swirl = 0.5 + 0.5 * sin(vPos.y * 6.0 + uTime * 1.6 + vPos.x * 2.0);

  vec3 body = mix(uDeep, uMid, height * 0.75 + ndl * 0.35);
  body = mix(body, uMid * 1.15, swirl * 0.12);
  vec3 col = body;
  col += uLightCol * back * 0.55;
  col += uLightCol * fres * 0.85;
  col += vec3(1.0) * spec * 0.9;
  col += uLightCol * spec2;

  float alpha = clamp(uAlpha + fres * 0.55 + spec, 0.0, 1.0);
  outColor = vec4(col, alpha);
}`;

const FS_SOLID = `#version 300 es
precision highp float;
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
  vec3 col = uColor * (0.22 + 0.78 * ndl) + vec3(0.35, 0.55, 0.60) * rim * 0.25 + vec3(spec);
  col = mix(col, uColor, uEmissive);
  outColor = vec4(col, 1.0);
}`;

const VS_GROUND = `#version 300 es
in vec3 aPos;
uniform mat4 uViewProj;
uniform float uSize;
out vec3 vWorld;
void main() {
  vWorld = vec3(aPos.x * uSize, 0.0, aPos.z * uSize);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

const FS_GROUND = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCam;
uniform float uBound;
out vec4 outColor;

void main() {
  vec2 uv = vWorld.xz * 0.5;
  vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
  float line = 1.0 - min(min(g.x, g.y), 1.0);

  vec2 uv2 = vWorld.xz * 0.1;
  vec2 g2 = abs(fract(uv2 - 0.5) - 0.5) / fwidth(uv2);
  float line2 = 1.0 - min(min(g2.x, g2.y), 1.0);

  float d = length(vWorld.xz);
  float fade = 1.0 - smoothstep(uBound * 0.55, uBound * 1.5, d);
  float inside = 1.0 - smoothstep(uBound - 0.4, uBound, max(abs(vWorld.x), abs(vWorld.z)));

  vec3 base = mix(vec3(0.05, 0.065, 0.075), vec3(0.10, 0.135, 0.14), inside);
  vec3 col = base + vec3(0.10, 0.22, 0.20) * line * 0.35 * fade
                  + vec3(0.16, 0.34, 0.30) * line2 * 0.5 * fade;
  outColor = vec4(col * fade, 1.0);
}`;

const VS_DECAL = `#version 300 es
in vec3 aPos;
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
    a = smoothstep(1.0, 0.86, d) * smoothstep(0.62, 0.78, d);
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
    decal: program(gl, VS_DECAL, FS_DECAL),
    light: [0.55, 0.78, 0.32],
  };

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

const _s = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };

function renderScene(R, scene) {
  const gl = R.gl;
  const { view, world, slime, camera, params, faction, time, debug } = scene;
  const pal = FACTIONS[faction];
  const b = slime.body;

  gl.viewport(0, 0, view.pw, view.ph);
  gl.clearColor(0.016, 0.023, 0.031, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  const viewProj = camera.viewProj;
  const cam = camera.eye;

  /* --- Boden ------------------------------------------------------------- */
  gl.disable(gl.CULL_FACE);
  gl.useProgram(R.ground.p);
  gl.bindVertexArray(R.quadMesh.vao);
  gl.uniformMatrix4fv(R.ground.u.uViewProj, false, viewProj);
  gl.uniform1f(R.ground.u.uSize, world.bounds * 3);
  gl.uniform1f(R.ground.u.uBound, world.bounds);
  gl.uniform3fv(R.ground.u.uCam, cam);
  gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);
  gl.enable(gl.CULL_FACE);

  /* --- Felsen und Mauern -------------------------------------------------- */
  for (const o of world.obstacles) {
    if (o.type === 'rock') {
      drawProp(R, R.propMesh, M4.trs(o.x, o.y, o.z, o.r, o.r * 0.8, o.r),
               normalMat(o.r, o.r * 0.8, o.r), [0.20, 0.24, 0.28], 0.35, 0, cam, viewProj);
    } else {
      drawProp(R, R.boxMesh, M4.trs(o.x, o.y, o.z, o.w * 0.5, o.h * 0.5, o.d * 0.5),
               normalMat(o.w * 0.5, o.h * 0.5, o.d * 0.5), [0.17, 0.21, 0.25], 0.2, 0, cam, viewProj);
    }
  }

  /* --- Gesicht ------------------------------------------------------------ */
  drawFace(R, slime, params, cam, viewProj);

  /* --- Bodendekale --------------------------------------------------------- */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);        // das Boden-Quad liegt je nach Blick falschherum

  for (const t of slime.trail) {
    drawDecal(R, t.x, t.z, t.r, pal.trail, Math.max(0, t.life) * 0.22, false, viewProj);
  }

  /* Schatten entlang der Lichtrichtung auf den Boden projiziert — direkt
   * unter dem Körper wäre er vollständig verdeckt und damit wirkungslos. */
  const spread = bodySpread(b);
  const L = R.light;
  const shX = b.cx - (L[0] / L[1]) * b.cy;
  const shZ = b.cz - (L[2] / L[1]) * b.cy;
  const lift = clamp(1 - (b.cy - params.radius * 0.5) / (params.radius * 6), 0.2, 1);
  drawDecal(R, shX, shZ, spread * 1.6, [0.01, 0.02, 0.03], 0.6 * lift, false, viewProj);
  drawDecal(R, b.cx, b.cz, spread * 0.95, [0.0, 0.01, 0.02], 0.45 * lift, false, viewProj);

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
  gl.uniform1f(s.u.uFacing, slime.facing);

  gl.cullFace(gl.FRONT);                       // Rückseite zuerst: Tiefe im Gel
  gl.uniform1f(s.u.uAlpha, 0.30);
  gl.drawElements(gl.TRIANGLES, R.slimeMesh.count, gl.UNSIGNED_SHORT, 0);

  gl.cullFace(gl.BACK);
  gl.uniform1f(s.u.uAlpha, 0.62);
  gl.drawElements(gl.TRIANGLES, R.slimeMesh.count, gl.UNSIGNED_SHORT, 0);

  gl.depthMask(true);
  gl.disable(gl.BLEND);

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

/* Augen und Mund sitzen auf der tatsächlichen Oberfläche: sie wandern und
 * verformen sich mit dem Körper, statt aufgeklebt zu wirken. */
function drawFace(R, s, P, cam, viewProj) {
  const b = s.body;
  const rEye = P.radius * 0.23;
  const blinkAmt = clamp(s.blink / 0.07, 0, 1);

  for (const side of [-1, 1]) {
    const d = faceDir(s, side * 0.62, 0.26);
    surfaceSample(b, d.x, d.y, d.z, _s);

    // Ganz nach innen versetzt: das Auge liegt im Gel und wird von der
    // durchscheinenden Hülle überlagert, statt als Blase davorzukleben.
    const ex = _s.x - _s.nx * rEye * 1.05;
    const ey = _s.y - _s.ny * rEye * 1.05;
    const ez = _s.z - _s.nz * rEye * 1.05;
    const sy = rEye * (1 - 0.88 * blinkAmt);

    drawProp(R, R.propMesh, M4.trs(ex, ey, ez, rEye, sy, rEye),
             normalMat(rEye, sy, rEye), [0.97, 0.99, 1.0], 0.8, 0.15, cam, viewProj);

    if (blinkAmt < 0.5) {
      const lx = _s.nx * 0.55 + s.look.x * 0.45;
      const ly = _s.ny * 0.55;
      const lz = _s.nz * 0.55 + s.look.z * 0.45;
      const l = Math.hypot(lx, ly, lz) || 1;
      const pr = rEye * 0.52;
      drawProp(R, R.propMesh,
               M4.trs(ex + lx / l * rEye * 0.6, ey + ly / l * rEye * 0.6, ez + lz / l * rEye * 0.6,
                      pr, pr * (1 - 0.5 * blinkAmt), pr),
               normalMat(pr, pr, pr), [0.05, 0.09, 0.14], 1.0, 0.2, cam, viewProj);
    }
  }

  // Mund: Bogen aus kleinen Kugeln, öffnet sich beim Sprung und Aufprall
  const open = s.mouth;
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = (i / (steps - 1)) * 2 - 1;
    const yaw = t * 0.36;
    const pitch = -0.16 - (1 - t * t) * 0.12 + open * 0.05;
    const d = faceDir(s, yaw, pitch);
    surfaceSample(b, d.x, d.y, d.z, _s);
    const r = P.radius * (0.075 + open * 0.03);
    const ry = r * (1 + open * 2.6 * (1 - t * t * 0.6));
    const depth = r * 0.55;
    drawProp(R, R.propMesh,
             M4.trs(_s.x - _s.nx * depth, _s.y - _s.ny * depth, _s.z - _s.nz * depth, r, ry, r),
             normalMat(r, ry, r), [0.05, 0.08, 0.12], 0.5, 0.45, cam, viewProj);
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
