'use strict';

/* ---------------------------------------------------------------------------
 * Weichkörper in 3D
 *
 * Eine Icosphere aus Massepunkten:
 *   - Kantenfedern     halten die Haut zusammen
 *   - Formfedern       ziehen jeden Punkt auf seine Ruheform (Kuppel/Ellipsoid)
 *   - Volumendruck     bläht den Körper auf und erhält das Volumen
 *   - Schwerkraft      drückt ihn auf den Boden, wo er sich breitmacht
 *
 * Das Wabbeln, das Nachschwingen und der Aufprall-Klatscher entstehen daraus
 * von selbst — nichts davon ist animiert.
 * ------------------------------------------------------------------------- */

function createSoftBody(mesh, x, y, z, radius) {
  const n = mesh.vertexCount;
  const body = {
    mesh, n, radius,
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    frc: new Float32Array(n * 3),
    rest: new Float32Array(n * 3),
    base: new Float32Array(mesh.positions),   // Richtungen auf der Einheitskugel
    normals: new Float32Array(n * 3),
    weight: new Float32Array(n),
    cx: x, cy: y, cz: z,
    vx: 0, vy: 0, vz: 0,
    volume: 0, restVolume: 0,
    grounded: true, contacts: 0,
  };
  for (let i = 0; i < n; i++) {
    body.pos[i * 3]     = x + body.base[i * 3] * radius;
    body.pos[i * 3 + 1] = y + body.base[i * 3 + 1] * radius;
    body.pos[i * 3 + 2] = z + body.base[i * 3 + 2] * radius;
  }
  return body;
}

function bodyCentroid(b) {
  let cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0;
  const p = b.pos, v = b.vel;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    cx += p[k]; cy += p[k + 1]; cz += p[k + 2];
    vx += v[k]; vy += v[k + 1]; vz += v[k + 2];
  }
  b.cx = cx / b.n; b.cy = cy / b.n; b.cz = cz / b.n;
  b.vx = vx / b.n; b.vy = vy / b.n; b.vz = vz / b.n;
}

/* Ruheform: Kuppel statt Kugel (unten breiter), in Bewegungsrichtung
 * gestreckt, überlagert von einer wandernden Welle. */
function updateRestShape(b, P, t, fx, fz, speedRatio, slump) {
  const R = P.radius;
  const stretch = 1 + P.stretch * speedRatio;
  const shrink = 1 / Math.sqrt(stretch);          // Volumen bleibt ~gleich
  const sx = -fz, sz = fx;                        // Seitenachse
  const waveAmp = P.wobble * (0.35 + 0.65 * speedRatio);

  /* Stehender Schleim sackt zusammen: flacher und breiter, fast eine
   * Pfütze. Setzt er sich in Bewegung, richtet er sich wieder auf. */
  const squat = P.squat * (1 - 0.42 * slump);
  const sag = P.sag + 0.75 * slump;

  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const bx = b.base[k], by = b.base[k + 1], bz = b.base[k + 2];

    const af = bx * fx + bz * fz;                 // Anteil nach vorn
    const as = bx * sx + bz * sz;                 // Anteil zur Seite

    const low = Math.max(0, -by);                 // unten breiter: Schleimkuppel
    const spread = 1 + sag * low;
    const wave = 1 + waveAmp * Math.sin(3 * Math.atan2(bz, bx) - t * 6.5 + by * 2.5);

    const rf = R * stretch * spread * wave;
    const rs = R * shrink * spread * wave;
    const ry = R * squat * shrink * wave;

    b.rest[k]     = fx * af * rf + sx * as * rs;
    b.rest[k + 1] = by * ry;
    b.rest[k + 2] = fz * af * rf + sz * as * rs;
  }
}

function stepSoftBody(b, dt, P, world, ctx) {
  const n = b.n, p = b.pos, v = b.vel, f = b.frc;
  const inv = 1 / P.mass;

  bodyCentroid(b);
  updateRestShape(b, P, ctx.time, ctx.fx, ctx.fz, ctx.speedRatio, ctx.slump);
  f.fill(0);

  /* --- Kantenfedern (Haut) ---------------------------------------------- */
  for (const e of b.mesh.edges) {
    const i = e[0] * 3, j = e[1] * 3;
    const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], dz = p[j + 2] - p[i + 2];
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const rx = b.rest[j] - b.rest[i];
    const ry = b.rest[j + 1] - b.rest[i + 1];
    const rz = b.rest[j + 2] - b.rest[i + 2];
    const rest = Math.hypot(rx, ry, rz);
    const nx = dx / d, ny = dy / d, nz = dz / d;
    const dv = (v[j] - v[i]) * nx + (v[j + 1] - v[i + 1]) * ny + (v[j + 2] - v[i + 2]) * nz;
    const force = (d - rest) * P.skin + dv * P.skinDamp;
    f[i] += nx * force; f[i + 1] += ny * force; f[i + 2] += nz * force;
    f[j] -= nx * force; f[j + 1] -= ny * force; f[j + 2] -= nz * force;
  }

  /* --- Biegefedern -------------------------------------------------------
   * Verbinden die gegenüberliegenden Ecken benachbarter Dreiecke. Sie
   * wirken gegen scharfe Knicke, ohne die Haut insgesamt steifer zu machen
   * — deshalb bleibt der Schleim beim Aufprall rund. */
  if (P.bend > 0) {
    for (const e of b.mesh.bend) {
      const i = e[0] * 3, j = e[1] * 3;
      const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], dz = p[j + 2] - p[i + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const rest = Math.hypot(b.rest[j] - b.rest[i],
                              b.rest[j + 1] - b.rest[i + 1],
                              b.rest[j + 2] - b.rest[i + 2]);
      const nx = dx / d, ny = dy / d, nz = dz / d;
      const dv = (v[j] - v[i]) * nx + (v[j + 1] - v[i + 1]) * ny + (v[j + 2] - v[i + 2]) * nz;
      const force = (d - rest) * P.bend + dv * P.bendDamp;
      f[i] += nx * force; f[i + 1] += ny * force; f[i + 2] += nz * force;
      f[j] -= nx * force; f[j + 1] -= ny * force; f[j + 2] -= nz * force;
    }
  }

  /* --- Formfedern -------------------------------------------------------
   * Zieht jeden Punkt auf seine Sollposition relativ zum Schwerpunkt.
   * Die Summe der Kräfte wird abgezogen, sonst schiebt sich der Körper
   * selbst durch die Welt. */
  let sfx = 0, sfy = 0, sfz = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    const ex = (b.cx + b.rest[k]) - p[k];
    const ey = (b.cy + b.rest[k + 1]) - p[k + 1];
    const ez = (b.cz + b.rest[k + 2]) - p[k + 2];

    /* Progressiv steifer: kleine Auslenkungen bleiben weich (das Wabbeln),
     * große werden hart abgefangen. Sonst klatscht der Körper beim Aufprall
     * zum Pfannkuchen und die Oberfläche faltet sich in sich selbst — der
     * GDD verlangt ausdrücklich, dass er nie völlig flach wird. */
    const dev = Math.hypot(ex, ey, ez) / (P.radius * P.maxDeform);
    const stiff = P.shape * (1 + P.stiffen * dev * dev);

    const fxv = ex * stiff - (v[k] - b.vx) * P.shapeDamp;
    const fyv = ey * stiff - (v[k + 1] - b.vy) * P.shapeDamp;
    const fzv = ez * stiff - (v[k + 2] - b.vz) * P.shapeDamp;
    f[k] += fxv; f[k + 1] += fyv; f[k + 2] += fzv;
    sfx += fxv; sfy += fyv; sfz += fzv;
  }
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    f[k] -= sfx / n; f[k + 1] -= sfy / n; f[k + 2] -= sfz / n;
  }

  /* --- Volumendruck ------------------------------------------------------ */
  const idx = b.mesh.indices;
  let vol = 0, restVol = 0;
  for (let t3 = 0; t3 < idx.length; t3 += 3) {
    const a = idx[t3] * 3, c = idx[t3 + 1] * 3, e = idx[t3 + 2] * 3;
    vol += signedTetra(p, a, c, e, b.cx, b.cy, b.cz);
    restVol += signedTetraRest(b.rest, a, c, e);
  }
  b.volume = vol; b.restVolume = restVol;

  const press = P.pressure * (restVol / Math.max(vol, 1e-4) - 1);
  for (let t3 = 0; t3 < idx.length; t3 += 3) {
    const a = idx[t3] * 3, c = idx[t3 + 1] * 3, e = idx[t3 + 2] * 3;
    const ux = p[c] - p[a], uy = p[c + 1] - p[a + 1], uz = p[c + 2] - p[a + 2];
    const wx = p[e] - p[a], wy = p[e + 1] - p[a + 1], wz = p[e + 2] - p[a + 2];
    // Kreuzprodukt = Normale, Länge = doppelte Dreiecksfläche
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    const s = press / 6;                    // (Fläche/2) / 3 Ecken
    f[a] += nx * s; f[a + 1] += ny * s; f[a + 2] += nz * s;
    f[c] += nx * s; f[c + 1] += ny * s; f[c + 2] += nz * s;
    f[e] += nx * s; f[e + 1] += ny * s; f[e + 2] += nz * s;
  }

  /* --- Schwerkraft + Antrieb ---------------------------------------------
   * Der Antrieb schiebt von hinten an: die Front läuft voraus, der Rest
   * wird nachgezogen. */
  const dax = ctx.drive.x, daz = ctx.drive.z;
  const driveLen = Math.hypot(dax, daz);
  let norm = 1;
  if (driveLen > 1e-5) {
    const dhx = dax / driveLen, dhz = daz / driveLen;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const ox = p[k] - b.cx, oz = p[k + 2] - b.cz;
      const d = Math.hypot(ox, oz) || 1e-6;
      const back = Math.max(0, -((ox / d) * dhx + (oz / d) * dhz));
      /* Kriechwelle: der Schub läuft als Welle von hinten nach vorn durch
       * die Masse. Der Schleim schiebt sich dadurch voran, statt als
       * Ganzes zu gleiten. */
      const along = (ox * dhx + oz * dhz) / P.radius;
      const wave = 1 + P.crawl * Math.sin(along * 2.2 - ctx.time * 7.0);
      const w = (1 + P.rearBias * back) * Math.max(0.1, wave);
      b.weight[i] = w;
      total += w;
    }
    norm = n / total;
  }
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    f[k + 1] -= P.gravity * P.mass;
    if (driveLen > 1e-5) {
      const w = b.weight[i] * norm * P.mass;
      f[k] += dax * w;
      f[k + 2] += daz * w;
    }
    /* Weicher Boden: eine Feder statt einer harten Klemmung. Ein starrer
     * Boden würde die Kontaktfläche scharf abschneiden — genau daraus
     * entstehen die Knickkanten beim Aufprall. */
    const pen = -p[k + 1];
    if (pen > 0) {
      f[k + 1] += pen * P.groundK;
      if (v[k + 1] < 0) f[k + 1] -= v[k + 1] * P.groundDamp;
    } else if (p[k + 1] < P.radius * 0.35) {
      /* Haftung: dicht über dem Boden zieht es den Schleim an. Er klebt,
       * breitet sich aus und muss sich beim Abheben regelrecht ablösen. */
      f[k + 1] -= P.adhesion * (1 - p[k + 1] / (P.radius * 0.35));
    }
  }

  /* --- Integration ------------------------------------------------------- */
  for (let i = 0; i < n * 3; i++) v[i] += f[i] * inv * dt;

  /* --- Viskosität --------------------------------------------------------
   * Benachbarte Punkte gleichen ihre Geschwindigkeit an. Genau das
   * unterscheidet zähen Schleim von einem Gummiball: Verformungen fließen
   * träge durch die Masse, statt federnd zurückzuschnellen. Impulserhaltend,
   * weil jeder Austausch symmetrisch ist. */
  if (P.viscosity > 0) {
    const k = Math.min(0.5, P.viscosity * dt);
    for (const e of b.mesh.edges) {
      const i = e[0] * 3, j = e[1] * 3;
      const dx = (v[j] - v[i]) * k * 0.5;
      const dy = (v[j + 1] - v[i + 1]) * k * 0.5;
      const dz = (v[j + 2] - v[i + 2]) * k * 0.5;
      v[i] += dx; v[i + 1] += dy; v[i + 2] += dz;
      v[j] -= dx; v[j + 1] -= dy; v[j + 2] -= dz;
    }
  }

  /* --- Dämpfung: Schwerpunkt und Nachschwingen getrennt ------------------ */
  bodyCentroid(b);
  const jig = Math.exp(-P.jiggleDamp * dt);
  const fri = b.grounded ? Math.exp(-P.friction * dt) : Math.exp(-P.airDrag * dt);
  const ddx = b.vx * (fri - 1), ddz = b.vz * (fri - 1);
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    v[k]     = b.vx + (v[k] - b.vx) * jig + ddx;
    v[k + 1] = b.vy + (v[k + 1] - b.vy) * jig;
    v[k + 2] = b.vz + (v[k + 2] - b.vz) * jig + ddz;
  }

  /* --- Position + Kollision ---------------------------------------------- */
  b.contacts = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    const sp = Math.hypot(v[k], v[k + 1], v[k + 2]);
    if (sp > 120) { const s = 120 / sp; v[k] *= s; v[k + 1] *= s; v[k + 2] *= s; }
    p[k] += v[k] * dt;
    p[k + 1] += v[k + 1] * dt;
    p[k + 2] += v[k + 2] * dt;
    collide(b, k, world, P, dt);
  }
  b.grounded = b.contacts > 0;
  bodyCentroid(b);
  smoothNormals(b.pos, b.mesh.indices, b.normals);
}

function signedTetra(p, a, c, e, cx, cy, cz) {
  const ax = p[a] - cx, ay = p[a + 1] - cy, az = p[a + 2] - cz;
  const bx = p[c] - cx, by = p[c + 1] - cy, bz = p[c + 2] - cz;
  const dx = p[e] - cx, dy = p[e + 1] - cy, dz = p[e + 2] - cz;
  return (ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx)) / 6;
}

function signedTetraRest(r, a, c, e) {
  const ax = r[a], ay = r[a + 1], az = r[a + 2];
  const bx = r[c], by = r[c + 1], bz = r[c + 2];
  const dx = r[e], dy = r[e + 1], dz = r[e + 2];
  return (ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx)) / 6;
}

/* Ein Punkt gegen Boden, Hindernisse und Weltgrenze. Weil der Körper aus
 * vielen Punkten besteht, quetscht er sich dadurch von selbst durch enge
 * Spalten und legt sich über Kanten. */
function collide(b, k, world, P, dt) {
  const p = b.pos, v = b.vel;

  if (p[k + 1] < P.radius * 0.04) {
    b.contacts++;
    // Haftung als Rate pro Sekunde, nicht pro Schritt — sonst hängt das
    // Bremsverhalten an der Anzahl der Substeps.
    const g = Math.exp(-P.groundGrip * dt);
    v[k] *= g;
    v[k + 2] *= g;
    // Notbremse gegen Durchsacken; die Bodenfeder macht die eigentliche Arbeit.
    if (p[k + 1] < -P.radius * 0.30) {
      p[k + 1] = -P.radius * 0.30;
      if (v[k + 1] < 0) v[k + 1] = -v[k + 1] * P.bounce;
    }
  }

  for (const o of world.obstacles) {
    if (o.type === 'rock') {
      const dx = p[k] - o.x, dy = p[k + 1] - o.y, dz = p[k + 2] - o.z;
      const d = Math.hypot(dx, dy, dz);
      if (d >= o.r || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, nz = dz / d;
      const pen = o.r - d;
      p[k] += nx * pen; p[k + 1] += ny * pen; p[k + 2] += nz * pen;
      pushOut(v, k, nx, ny, nz, P, dt);
      b.contacts++;
    } else {
      const hx = o.w * 0.5, hy = o.h * 0.5, hz = o.d * 0.5;
      const dx = p[k] - o.x, dy = p[k + 1] - o.y, dz = p[k + 2] - o.z;
      if (Math.abs(dx) > hx || Math.abs(dy) > hy || Math.abs(dz) > hz) continue;
      const ox = hx - Math.abs(dx), oy = hy - Math.abs(dy), oz = hz - Math.abs(dz);
      let nx = 0, ny = 0, nz = 0, pen;
      if (ox <= oy && ox <= oz)      { nx = Math.sign(dx) || 1; pen = ox; }
      else if (oy <= ox && oy <= oz) { ny = Math.sign(dy) || 1; pen = oy; }
      else                           { nz = Math.sign(dz) || 1; pen = oz; }
      p[k] += nx * pen; p[k + 1] += ny * pen; p[k + 2] += nz * pen;
      pushOut(v, k, nx, ny, nz, P, dt);
      b.contacts++;
    }
  }

  const w = world.bounds;
  if (p[k] < -w) { p[k] = -w; v[k] = Math.abs(v[k]) * P.bounce; }
  if (p[k] > w)  { p[k] = w;  v[k] = -Math.abs(v[k]) * P.bounce; }
  if (p[k + 2] < -w) { p[k + 2] = -w; v[k + 2] = Math.abs(v[k + 2]) * P.bounce; }
  if (p[k + 2] > w)  { p[k + 2] = w;  v[k + 2] = -Math.abs(v[k + 2]) * P.bounce; }
}

function pushOut(v, k, nx, ny, nz, P, dt) {
  const vn = v[k] * nx + v[k + 1] * ny + v[k + 2] * nz;
  if (vn >= 0) return;
  v[k] -= vn * nx * (1 + P.bounce);
  v[k + 1] -= vn * ny * (1 + P.bounce);
  v[k + 2] -= vn * nz * (1 + P.bounce);
  const dot = v[k] * nx + v[k + 1] * ny + v[k + 2] * nz;
  const damp = 1 - Math.exp(-P.wallFriction * dt);
  v[k] -= (v[k] - dot * nx) * damp;
  v[k + 1] -= (v[k + 1] - dot * ny) * damp;
  v[k + 2] -= (v[k + 2] - dot * nz) * damp;
}
