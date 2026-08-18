'use strict';

/* ---------------------------------------------------------------------------
 * Kleine Mathe- und Geometrie-Werkzeuge.
 * Bewusst minimal: der Prototyp soll ohne Fremdbibliotheken laufen.
 * ------------------------------------------------------------------------- */

const M4 = {
  identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  },

  perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY * 0.5);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  },

  lookAt(eye, target, up) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let l = Math.hypot(zx, zy, zz) || 1;
    zx /= l; zy /= l; zz /= l;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1;
    xx /= l; xy /= l; xz /= l;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1,
    ]);
  },

  multiply(a, b, out) {
    out = out || new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  },

  /* Verschiebung + (auch ungleichmäßige) Skalierung — mehr brauchen die
   * Requisiten im Prototyp nicht. */
  trs(tx, ty, tz, sx, sy, sz) {
    return new Float32Array([
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      tx, ty, tz, 1,
    ]);
  },

  invert(m) {
    const o = new Float32Array(16);
    const a00=m[0],a01=m[1],a02=m[2],a03=m[3];
    const a10=m[4],a11=m[5],a12=m[6],a13=m[7];
    const a20=m[8],a21=m[9],a22=m[10],a23=m[11];
    const a30=m[12],a31=m[13],a32=m[14],a33=m[15];

    const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10;
    const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
    const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30;
    const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;

    let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
    if (!det) return M4.identity();
    det = 1 / det;

    o[0]=(a11*b11-a12*b10+a13*b09)*det;
    o[1]=(a02*b10-a01*b11-a03*b09)*det;
    o[2]=(a31*b05-a32*b04+a33*b03)*det;
    o[3]=(a22*b04-a21*b05-a23*b03)*det;
    o[4]=(a12*b08-a10*b11-a13*b07)*det;
    o[5]=(a00*b11-a02*b08+a03*b07)*det;
    o[6]=(a32*b02-a30*b05-a33*b01)*det;
    o[7]=(a20*b05-a22*b02+a23*b01)*det;
    o[8]=(a10*b10-a11*b08+a13*b06)*det;
    o[9]=(a01*b08-a00*b10-a03*b06)*det;
    o[10]=(a30*b04-a31*b02+a33*b00)*det;
    o[11]=(a21*b02-a20*b04-a23*b00)*det;
    o[12]=(a11*b07-a10*b09-a12*b06)*det;
    o[13]=(a00*b09-a01*b07+a02*b06)*det;
    o[14]=(a31*b01-a30*b03-a32*b00)*det;
    o[15]=(a20*b03-a21*b01+a22*b00)*det;
    return o;
  },
};

/* --- Icosphere ------------------------------------------------------------
 * Gleichmäßig verteilte Punkte auf der Kugel — die Grundlage für den
 * Weichkörper. Level 2 ergibt 162 Punkte / 320 Dreiecke: fein genug für
 * weiche Silhouetten, grob genug für 240 Hz Physik. */
function createIcosphere(level) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(v => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  });

  let faces = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
  ];

  for (let s = 0; s < level; s++) {
    const cache = new Map();
    const next = [];
    const mid = (a, b) => {
      const key = a < b ? a + ',' + b : b + ',' + a;
      if (cache.has(key)) return cache.get(key);
      const va = verts[a], vb = verts[b];
      const m = [va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]];
      const l = Math.hypot(m[0], m[1], m[2]);
      verts.push([m[0] / l, m[1] / l, m[2] / l]);
      const idx = verts.length - 1;
      cache.set(key, idx);
      return idx;
    };
    for (const [a, b, c] of faces) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }

  // Eindeutige Kanten für die Federn
  const seen = new Set();
  const edges = [];
  for (const [a, b, c] of faces) {
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = i < j ? i + ',' + j : j + ',' + i;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }

  return {
    positions: new Float32Array(verts.flat()),
    indices: new Uint16Array(faces.flat()),
    edges,
    vertexCount: verts.length,
    faceCount: faces.length,
  };
}

/* Achsenparalleler Würfel mit harten Normalen (für Felsen und Mauern). */
function createBox() {
  const p = [], n = [], idx = [];
  const sides = [
    [[ 1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[-1, 0, 0], [0, 1, 0], [0, 0,  1]],
    [[0,  1, 0], [0, 0, 1], [1, 0,  0]],
    [[0, -1, 0], [0, 0,-1], [1, 0,  0]],
    [[0, 0,  1], [0, 1, 0], [1, 0,  0]],
    [[0, 0, -1], [0, 1, 0], [-1,0,  0]],
  ];
  for (const [nrm, u, v] of sides) {
    const base = p.length / 3;
    for (const [su, sv] of [[-1,-1], [1,-1], [1,1], [-1,1]]) {
      p.push(nrm[0] + u[0]*sv + v[0]*su,
             nrm[1] + u[1]*sv + v[1]*su,
             nrm[2] + u[2]*sv + v[2]*su);
      n.push(nrm[0], nrm[1], nrm[2]);
    }
    idx.push(base, base+1, base+2, base, base+2, base+3);
  }
  return {
    positions: new Float32Array(p),
    normals: new Float32Array(n),
    indices: new Uint16Array(idx),
  };
}

/* Eindeutige Kanten aus einer Dreiecksliste. */
function buildEdges(indices) {
  const seen = new Set();
  const edges = [];
  for (let f = 0; f < indices.length; f += 3) {
    const a = indices[f], b = indices[f + 1], c = indices[f + 2];
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = i < j ? i * 65536 + j : j * 65536 + i;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, j]);
    }
  }
  return edges;
}

/* --- Topologie ------------------------------------------------------------
 * Zu jeder Kante die beiden gegenüberliegenden Ecken der angrenzenden
 * Dreiecke. Daraus entstehen zwei Dinge: Biegefedern gegen Knicke und die
 * Regeln für die Loop-Unterteilung. */
function buildTopology(mesh) {
  const key = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
  const map = new Map();
  for (let i = 0; i < mesh.edges.length; i++) {
    const [a, b] = mesh.edges[i];
    map.set(key(a, b), { index: i, a, b, opp: [] });
  }
  const idx = mesh.indices;
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f], b = idx[f + 1], c = idx[f + 2];
    map.get(key(a, b)).opp.push(c);
    map.get(key(b, c)).opp.push(a);
    map.get(key(c, a)).opp.push(b);
  }

  const E = mesh.edges.length;
  const edgeQuad = new Int32Array(E * 4);      // a, b, gegenüber1, gegenüber2
  const bend = [];
  for (const rec of map.values()) {
    const k = rec.index * 4;
    const c = rec.opp[0], d = rec.opp.length > 1 ? rec.opp[1] : rec.opp[0];
    edgeQuad[k] = rec.a; edgeQuad[k + 1] = rec.b;
    edgeQuad[k + 2] = c; edgeQuad[k + 3] = d;
    if (c !== d) bend.push([c, d]);
  }

  // Nachbarn je Ecke (CSR-Layout)
  const counts = new Int32Array(mesh.vertexCount);
  for (const [a, b] of mesh.edges) { counts[a]++; counts[b]++; }
  const offsets = new Int32Array(mesh.vertexCount + 1);
  for (let i = 0; i < mesh.vertexCount; i++) offsets[i + 1] = offsets[i] + counts[i];
  const cursor = offsets.slice(0, mesh.vertexCount);
  const neighbors = new Int32Array(offsets[mesh.vertexCount]);
  for (const [a, b] of mesh.edges) {
    neighbors[cursor[a]++] = b;
    neighbors[cursor[b]++] = a;
  }

  return { edgeQuad, bend, offsets, neighbors, keyOf: key, map };
}

/* --- Loop-Unterteilung -----------------------------------------------------
 * Die Physik rechnet grob, gezeichnet wird fein. Ein Loop-Schritt macht aus
 * 162 Massepunkten 642 Oberflächenpunkte und glättet dabei — genau deshalb
 * bleibt der Schleim rund, auch wenn er beim Aufprall stark verformt wird. */
function createSubdivider(mesh, topo) {
  const V = mesh.vertexCount, E = mesh.edges.length;
  const count = V + E;
  const idx = mesh.indices;
  const faces = [];
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f], b = idx[f + 1], c = idx[f + 2];
    const ab = V + topo.map.get(topo.keyOf(a, b)).index;
    const bc = V + topo.map.get(topo.keyOf(b, c)).index;
    const ca = V + topo.map.get(topo.keyOf(c, a)).index;
    faces.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
  }

  // Loop-Gewichte je Ecke vorberechnen
  const beta = new Float32Array(V);
  for (let i = 0; i < V; i++) {
    const n = topo.offsets[i + 1] - topo.offsets[i];
    beta[i] = n === 3 ? 3 / 16 : 3 / (8 * n);
  }

  // Nachbarschaft der feinen Hülle — für das Glätten nach der Unterteilung
  const hullSeen = new Set();
  const hullPairs = [];
  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f], b = faces[f + 1], c = faces[f + 2];
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const key = i < j ? i * 65536 + j : j * 65536 + i;
      if (hullSeen.has(key)) continue;
      hullSeen.add(key);
      hullPairs.push([i, j]);
    }
  }
  const hCounts = new Int32Array(count);
  for (const [a, b] of hullPairs) { hCounts[a]++; hCounts[b]++; }
  const hullOffsets = new Int32Array(count + 1);
  for (let i = 0; i < count; i++) hullOffsets[i + 1] = hullOffsets[i] + hCounts[i];
  const hCursor = hullOffsets.slice(0, count);
  const hullNeighbors = new Int32Array(hullOffsets[count]);
  for (const [a, b] of hullPairs) {
    hullNeighbors[hCursor[a]++] = b;
    hullNeighbors[hCursor[b]++] = a;
  }

  return {
    vertexCount: count,
    indices: new Uint16Array(faces),
    positions: new Float32Array(count * 3),
    normals: new Float32Array(count * 3),
    scratch: new Float32Array(count * 3),
    hullOffsets, hullNeighbors,
    V, E, beta, topo,
    relaxLambda: 0.42,       // 0 = nicht glätten (für Zwischenstufen)
    computeNormals: true,

    /* Taubin-Glättung: ein schrumpfender und ein aufblähender Durchgang.
     * Reines Laplace würde den Schleim mit der Zeit einfallen lassen. */
    relax(lambda) {
      const p = this.positions, tmp = this.scratch;
      for (let i = 0; i < count; i++) {
        const s = hullOffsets[i], e = hullOffsets[i + 1], n = e - s;
        let sx = 0, sy = 0, sz = 0;
        for (let j = s; j < e; j++) {
          const k = hullNeighbors[j] * 3;
          sx += p[k]; sy += p[k + 1]; sz += p[k + 2];
        }
        const k = i * 3, inv = 1 / n;
        tmp[k]     = p[k]     + lambda * (sx * inv - p[k]);
        tmp[k + 1] = p[k + 1] + lambda * (sy * inv - p[k + 1]);
        tmp[k + 2] = p[k + 2] + lambda * (sz * inv - p[k + 2]);
      }
      p.set(tmp);
    },

    apply(src) {
      const out = this.positions;
      for (let i = 0; i < V; i++) {
        const s = topo.offsets[i], e = topo.offsets[i + 1];
        const n = e - s, bt = beta[i];
        let sx = 0, sy = 0, sz = 0;
        for (let j = s; j < e; j++) {
          const k = topo.neighbors[j] * 3;
          sx += src[k]; sy += src[k + 1]; sz += src[k + 2];
        }
        const w = 1 - n * bt, k = i * 3;
        out[k]     = src[k] * w + sx * bt;
        out[k + 1] = src[k + 1] * w + sy * bt;
        out[k + 2] = src[k + 2] * w + sz * bt;
      }
      for (let e = 0; e < E; e++) {
        const q = e * 4;
        const a = topo.edgeQuad[q] * 3, b = topo.edgeQuad[q + 1] * 3;
        const c = topo.edgeQuad[q + 2] * 3, d = topo.edgeQuad[q + 3] * 3;
        const k = (V + e) * 3;
        out[k]     = 0.375 * (src[a] + src[b]) + 0.125 * (src[c] + src[d]);
        out[k + 1] = 0.375 * (src[a + 1] + src[b + 1]) + 0.125 * (src[c + 1] + src[d + 1]);
        out[k + 2] = 0.375 * (src[a + 2] + src[b + 2]) + 0.125 * (src[c + 2] + src[d + 2]);
      }
      if (this.relaxLambda > 0) {
        this.relax(this.relaxLambda);
        this.relax(-(this.relaxLambda + 0.02));
      }
      if (this.computeNormals) smoothNormals(out, this.indices, this.normals);
    },
  };
}

/* Mesh-Beschreibung aus einer bereits unterteilten Hülle — damit lässt sich
 * ein zweiter Unterteilungsschritt daraufsetzen. */
function meshFromSurface(sub) {
  return {
    vertexCount: sub.vertexCount,
    indices: sub.indices,
    positions: sub.positions,
    edges: buildEdges(sub.indices),
  };
}

function smoothNormals(positions, indices, out) {
  out.fill(0);
  for (let f = 0; f < indices.length; f += 3) {
    const a = indices[f] * 3, b = indices[f + 1] * 3, c = indices[f + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    out[a] += nx; out[a+1] += ny; out[a+2] += nz;
    out[b] += nx; out[b+1] += ny; out[b+2] += nz;
    out[c] += nx; out[c+1] += ny; out[c+2] += nz;
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i+1], out[i+2]) || 1;
    out[i] /= l; out[i+1] /= l; out[i+2] /= l;
  }
}
