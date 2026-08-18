'use strict';

/* ---------------------------------------------------------------------------
 * Der Schleim als Spielfigur
 *
 * Alles, was über den reinen Weichkörper hinausgeht: indirekter Antrieb per
 * Klick (wie im GDD), Blickrichtung, Sprung, Gesicht und Schleimspur.
 * ------------------------------------------------------------------------- */

function createSlime(mesh, P) {
  return {
    body: createSoftBody(mesh, 0, P.radius, 0, P.radius),
    facing: 0,                   // Blickrichtung als Winkel um die Y-Achse
    fx: 1, fz: 0,
    speed: 0,
    speedRatio: 0,
    traction: 0,                 // Anrollen: 0 → 1
    slump: 0,                    // Zusammensacken im Stand: 0 → 1
    target: null,                // Klickziel { x, z }
    look: { x: 0, y: 0, z: 1 },  // Pupillen mit Nachlauf
    lookV: { x: 0, y: 0, z: 0 },
    blink: 0,
    blinkTimer: 2.5,
    mouth: 0,
    airborne: 0,
    wasGrounded: true,
    fallSpeed: 0,
    impact: 0,
    grab: null,
    trail: [],
    trailAcc: 0,
    drive: { x: 0, z: 0 },
  };
}

function angleLerp(a, b, t) {
  const twoPi = Math.PI * 2;
  const d = ((b - a + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return a + d * t;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function updateSlime(s, dt, P, world, input, time) {
  const b = s.body;

  s.speed = Math.hypot(b.vx, b.vz);
  s.speedRatio = clamp(s.speed / P.maxSpeed, 0, 1);

  /* --- Wohin will die Masse? --------------------------------------------- */
  let wantX = 0, wantZ = 0, want = false, arrive = 1;

  if (input.axis.x || input.axis.z) {           // Direktsteuerung (Debug)
    s.target = null;
    const l = Math.hypot(input.axis.x, input.axis.z);
    wantX = input.axis.x / l; wantZ = input.axis.z / l;
    want = true;
  } else if (s.target) {                        // Klicksteuerung (GDD)
    const dx = s.target.x - b.cx, dz = s.target.z - b.cz;
    const dist = Math.hypot(dx, dz);
    if (dist < P.stopRadius) {
      s.target = null;
    } else {
      wantX = dx / dist; wantZ = dz / dist;
      want = true;
      arrive = clamp(dist / P.arriveRadius, 0, 1);
    }
  }

  /* --- Anrollen ----------------------------------------------------------
   * Der Schleim springt nie sofort auf Tempo: erst Traktion aufbauen. */
  if (want) s.traction = Math.min(1, s.traction + dt / Math.max(P.rollIn, 0.01));
  else      s.traction = Math.max(0, s.traction - dt * 5);

  s.drive.x = 0; s.drive.z = 0;
  if (want) {
    const desX = wantX * P.maxSpeed * arrive;
    const desZ = wantZ * P.maxSpeed * arrive;
    // Reibung wird vorgehalten, sonst bleibt das eingestellte Max-Tempo
    // reine Theorie und der Regler lügt.
    const ff = P.friction + P.groundGrip * 0.25;
    let ax = (desX - b.vx) * P.response + desX * ff;
    let az = (desZ - b.vz) * P.response + desZ * ff;

    // Ein Richtungswechsel kostet Grip — die Masse muss erst umkehren.
    if (s.speed > 0.8) {
      const dot = (wantX * b.vx + wantZ * b.vz) / s.speed;
      const grip = 1 - 0.4 * clamp((1 - dot) * 0.5, 0, 1);
      ax *= grip; az *= grip;
    }

    const mag = Math.hypot(ax, az);
    if (mag > P.maxAccel) { ax = ax / mag * P.maxAccel; az = az / mag * P.maxAccel; }

    const air = b.grounded ? 1 : 0.3;
    s.drive.x = ax * s.traction * air;
    s.drive.z = az * s.traction * air;
  }

  /* --- Blickrichtung -----------------------------------------------------
   * Folgt der tatsächlichen Bewegung, nicht dem Eingabewunsch — deshalb
   * dreht das Gesicht bei einer Kehrtwende sichtbar verzögert mit. */
  let faceTo = s.facing;
  if (s.speed > 0.6) faceTo = Math.atan2(b.vz, b.vx);
  else if (want) faceTo = Math.atan2(wantZ, wantX);
  s.facing = angleLerp(s.facing, faceTo, 1 - Math.exp(-P.turnRate * dt));
  s.fx = Math.cos(s.facing); s.fz = Math.sin(s.facing);

  /* --- Sprung und Kanone -------------------------------------------------- */
  if (input.hop && b.grounded) {
    input.hop = false;
    for (let i = 0; i < b.n; i++) b.vel[i * 3 + 1] += P.hopPower;
    s.mouth = 1;
  }
  if (input.cannon && b.grounded) {
    input.cannon = false;
    for (let i = 0; i < b.n; i++) {
      b.vel[i * 3] += s.fx * P.maxSpeed * 1.4;
      b.vel[i * 3 + 1] += P.hopPower * 1.4;
      b.vel[i * 3 + 2] += s.fz * P.maxSpeed * 1.4;
    }
    s.mouth = 1;
  }

  /* --- Ziehen mit der Maus ------------------------------------------------ */
  if (s.grab) {
    const k = s.grab.i * 3;
    const t = Math.min(1, 20 * dt);
    const nx = b.pos[k] + (s.grab.x - b.pos[k]) * t;
    const ny = b.pos[k + 1] + (s.grab.y - b.pos[k + 1]) * t;
    const nz = b.pos[k + 2] + (s.grab.z - b.pos[k + 2]) * t;
    b.vel[k] = (nx - b.pos[k]) / Math.max(dt, 1e-5);
    b.vel[k + 1] = (ny - b.pos[k + 1]) / Math.max(dt, 1e-5);
    b.vel[k + 2] = (nz - b.pos[k + 2]) / Math.max(dt, 1e-5);
    b.pos[k] = nx; b.pos[k + 1] = ny; b.pos[k + 2] = nz;
  }

  /* --- Zusammensacken -----------------------------------------------------
   * Ein stehender Schleim hält seine Form nicht: er sackt langsam zu einer
   * flachen Kuppel zusammen und richtet sich erst beim Losfahren wieder auf. */
  if (b.grounded && !want && s.speed < 0.6) {
    s.slump = Math.min(1, s.slump + dt / Math.max(P.slumpTime, 0.05));
  } else {
    s.slump = Math.max(0, s.slump - dt / Math.max(P.slumpTime * 0.3, 0.02));
  }

  /* --- Weichkörper rechnen ------------------------------------------------ */
  const fallBefore = b.vy;
  const groundedBefore = b.grounded;

  stepSoftBody(b, dt, P, world, {
    time,
    fx: s.fx, fz: s.fz,
    speedRatio: s.speedRatio,
    slump: s.slump,
    drive: s.drive,
  });

  if (!groundedBefore && b.grounded) {           // Aufprall
    s.impact = clamp(-fallBefore / 12, 0, 1.5);
    s.mouth = Math.max(s.mouth, Math.min(1, 0.35 + s.impact));
  }
  if (!b.grounded) s.airborne += dt; else s.airborne = 0;
  s.impact = Math.max(0, s.impact - dt * 2.2);
  s.mouth = Math.max(0, s.mouth - dt * 1.5);

  /* --- Gesicht ------------------------------------------------------------ */
  const stiff = 90, damp = 13;
  s.lookV.x += ((s.fx - s.look.x) * stiff - s.lookV.x * damp) * dt;
  s.lookV.z += ((s.fz - s.look.z) * stiff - s.lookV.z * damp) * dt;
  s.look.x += s.lookV.x * dt;
  s.look.z += s.lookV.z * dt;

  s.blinkTimer -= dt;
  if (s.blinkTimer <= 0) { s.blink = 0.14; s.blinkTimer = 2.6 + s.speedRatio * 2; }
  s.blink = Math.max(0, s.blink - dt);

  /* --- Schleimspur --------------------------------------------------------- */
  s.trailAcc += dt;
  if (b.grounded && s.speed > 0.6 && s.trailAcc > 0.05) {
    s.trailAcc = 0;
    s.trail.push({ x: b.cx, z: b.cz, r: P.radius * (0.7 + 0.25 * s.speedRatio), life: 1 });
    if (s.trail.length > 80) s.trail.shift();
  }
  for (const t of s.trail) t.life -= dt * 0.5;
  while (s.trail.length && s.trail[0].life <= 0) s.trail.shift();
}

/* --- Oberflächenpunkte für das Gesicht --------------------------------------
 * Gewichteter Mittelwert aller Punkte, deren Grundrichtung in die gesuchte
 * Richtung zeigt. Dadurch klebt das Gesicht nicht auf dem Körper, sondern
 * verformt sich mit ihm — genau das fordert der GDD. */
function surfaceSample(b, dx, dy, dz, out) {
  let wsum = 0;
  let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const d = b.base[k] * dx + b.base[k + 1] * dy + b.base[k + 2] * dz;
    if (d <= 0) continue;
    const d2 = d * d, d4 = d2 * d2;
    const w = d4 * d4 * d2;                      // scharf, aber stetig
    wsum += w;
    px += b.pos[k] * w; py += b.pos[k + 1] * w; pz += b.pos[k + 2] * w;
    nx += b.normals[k] * w; ny += b.normals[k + 1] * w; nz += b.normals[k + 2] * w;
  }
  const inv = 1 / (wsum || 1);
  out.x = px * inv; out.y = py * inv; out.z = pz * inv;
  const l = Math.hypot(nx, ny, nz) || 1;
  out.nx = nx / l; out.ny = ny / l; out.nz = nz / l;
  return out;
}

/* Richtung im Kopf-Koordinatensystem: yaw nach links/rechts, pitch nach oben. */
function faceDir(s, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const fx = s.fx * cy - s.fz * sy;
  const fz = s.fz * cy + s.fx * sy;
  const cp = Math.cos(pitch);
  return { x: fx * cp, y: Math.sin(pitch), z: fz * cp };
}

function nearestVertex(b, x, y, z) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const d = (b.pos[k] - x) ** 2 + (b.pos[k + 1] - y) ** 2 + (b.pos[k + 2] - z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return { i: best, d: Math.sqrt(bestD) };
}
