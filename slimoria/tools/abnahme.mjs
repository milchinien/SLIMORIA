/* ---------------------------------------------------------------------------
 * Abnahme-Werkzeug — beweist die beiden Abnahmelisten, statt sie zu behaupten.
 *
 * Faehrt den Prototyp in einem kopflosen Chrome durch EINEN zusammenhaengenden
 * Spieldurchlauf: erschaffen, klicken, laufen, Kreatur finden, kaempfen,
 * schwaechen, fressen (Fehlschlag und Erfolg), aufsteigen, wachsen, sterben,
 * am Friedhof aufwachen. Waehrend der Fahrt wird gemessen, nicht geraten:
 * jeder Punkt bekommt ein maschinell pruefbares Kriterium und ein Belegbild.
 *
 * Derselbe Chrome-Start, derselbe Server und dieselbe Schnittstelle wie
 * tools/capture.mjs (ARCHITEKTUR.md §3). Die Simulation laeuft in festen
 * Schritten von 1/240 s, die Uhr stellt dieses Werkzeug von aussen vor —
 * derselbe Lauf ergibt damit dieselben Zahlen und dieselben Bilder.
 *
 *   node tools/abnahme.mjs [--seed N] [--behalten]
 *
 * Ergebnis:
 *   gauntlet/abnahme/<nr>-<kurzname>.png   Belegbilder, 1600x900
 *   gauntlet/abnahme.json                  Messwerte und Urteil je Punkt
 *   gauntlet/ABNAHME.md                    Tabelle zum Lesen
 *
 * Die drei Netzpunkte der Liste B (zwei Spieler, Serverautoritaet,
 * persistenter Charakter) kann ein einzelner Client nicht beweisen. Sie werden
 * aus gauntlet/zweispieler.json gelesen, das die Lane NETZ erzeugt:
 *
 *   { "zweiSpieler":      { "erfuellt": true, "gemessen": "...", "beleg": "gauntlet/..." },
 *     "serverautoritaet": { "erfuellt": true, "gemessen": "...", "beleg": "..." },
 *     "persistenz":       { "erfuellt": true, "gemessen": "...", "beleg": "..." } }
 *
 * Fehlt die Datei oder ein Eintrag, gilt der Punkt als "offen" — niemals als
 * erfuellt.
 *
 * Exit-Code 0 nur, wenn ALLE Punkte erfuellt sind.
 * ------------------------------------------------------------------------- */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import zlib from 'node:zlib';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BILDER = path.join(ROOT, 'gauntlet', 'abnahme');
const ZWEISPIELER = path.join(ROOT, 'gauntlet', 'zweispieler.json');

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const W = 1600, H = 900;

const argv = process.argv.slice(2);
const flag = (name, def = null) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv[i + 1] ?? true) : def;
};
const has = (name) => argv.includes('--' + name);
const SEED = Number(flag('seed', 1234));

/* --------------------------------------------------------------------------
 * Die beiden Listen im Wortlaut (SPEC-BRIEF.md §1 und §2)
 * ------------------------------------------------------------------------ */

const LISTE_A = [
  [1, 'schleim-erstellen', 'Schleim erstellen'],
  [2, 'dritte-person', 'Schleim aus der dritten Person sehen'],
  [3, 'klickpunkt', 'Auf einen Punkt klicken'],
  [4, 'hinbewegen', 'Schleim dorthin bewegen'],
  [5, 'beschleunigen', 'Beschleunigung und Abbremsen sehen'],
  [6, 'richtungswechsel', 'Richtungswechsel spüren'],
  [7, 'wabbeln', 'Schleim wabbeln sehen'],
  [8, 'tempoform', 'Geschwindigkeit an der Körperform erkennen'],
  [9, 'kreatur-finden', 'Kreatur finden'],
  [10, 'zum-gegner', 'Zum Gegner bewegen'],
  [11, 'kampf', 'Gegner bekämpfen'],
  [12, 'schwaechen', 'Gegner schwächen'],
  [13, 'fressversuch', 'Fressversuch auslösen'],
  [14, 'umschlingen', 'Schleim umschlingt den Gegner'],
  [15, 'ausgang', 'Fressversuch gelingt oder scheitert'],
  [16, 'erfolg-fehlschlag', 'Erfolg/Fehlschlag visuell eindeutig erkennen'],
  [17, 'veraenderung', 'Nach erfolgreichem Fressen die Veränderung wahrnehmen'],
  [18, 'mehrere-fressen', 'Mehrere Kreaturen fressen'],
  [19, 'levelaufstieg', 'Level aufsteigen'],
  [20, 'wachstum', 'Wachstum des Schleims erkennen'],
  [21, 'todesanimation', 'Bei Tod die charakteristische Todesanimation sehen'],
  [22, 'friedhof', 'Am Friedhof respawnen'],
];

const LISTE_B = [
  [1, '3d-welt', '3D-Welt'],
  [2, 'kamera', 'Third-Person-Kamera'],
  [3, 'klickbewegung', 'Klickbewegung'],
  [4, 'fluessig', 'flüssige Schleimbewegung'],
  [5, 'verformung', 'dynamische Schleimverformung'],
  [6, 'kreatur', 'Kreatur'],
  [7, 'zielauswahl', 'Zielauswahl'],
  [8, 'angriff', 'grundlegender Angriff'],
  [9, 'fressversuch', 'Fressversuch'],
  [10, 'fresserfolg', 'Fresserfolg'],
  [11, 'fressfehlschlag', 'Fressfehlschlag'],
  [12, 'hp', 'HP'],
  [13, 'level', 'Level'],
  [14, 'faehigkeit', 'einfache Fähigkeit'],
  [15, 'zwei-spieler', 'zwei gleichzeitig verbundene Spieler'],
  [16, 'serverautoritaet', 'serverautoritatives Gameplay'],
  [17, 'persistenz', 'persistenter Charakter'],
];

/* --------------------------------------------------------------------------
 * Ergebnisspeicher
 * ------------------------------------------------------------------------ */

const ERG = { A: new Map(), B: new Map() };

function urteil(liste, nr, kriterium, gemessen, erfuellt, belegDatei = null) {
  ERG[liste].set(nr, { kriterium, gemessen, erfuellt, beleg: belegDatei });
}

/* --------------------------------------------------------------------------
 * PNG lesen — ohne Fremdbibliothek, zlib reicht.
 * Damit werden Belege zu Messwerten: ist ueberhaupt etwas gezeichnet, und
 * unterscheiden sich zwei Momente sichtbar voneinander.
 * ------------------------------------------------------------------------ */

function pngLesen(datei) {
  const buf = fs.readFileSync(datei);
  let p = 8, w = 0, h = 0, bit = 0, typ = 0, inter = 0;
  const teile = [];
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const art = buf.toString('ascii', p + 4, p + 8);
    const d = buf.subarray(p + 8, p + 8 + len);
    if (art === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      bit = d[8]; typ = d[9]; inter = d[12];
    } else if (art === 'IDAT') teile.push(d);
    else if (art === 'IEND') break;
    p += 12 + len;
  }
  if (bit !== 8 || (typ !== 2 && typ !== 6) || inter !== 0) {
    throw new Error(`PNG-Form nicht unterstuetzt: bit=${bit} typ=${typ} inter=${inter}`);
  }
  const kanal = typ === 6 ? 4 : 3;
  const roh = zlib.inflateSync(Buffer.concat(teile));
  const stride = w * kanal;
  const out = Buffer.alloc(w * h * 4);
  let vor = Buffer.alloc(stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = roh[q++];
    const zeile = Buffer.from(roh.subarray(q, q + stride));
    q += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= kanal ? zeile[i - kanal] : 0;
      const b = vor[i];
      const c = i >= kanal ? vor[i - kanal] : 0;
      let v = zeile[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      zeile[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * kanal, t = (y * w + x) * 4;
      out[t] = zeile[s]; out[t + 1] = zeile[s + 1]; out[t + 2] = zeile[s + 2];
      out[t + 3] = kanal === 4 ? zeile[s + 3] : 255;
    }
    vor = zeile;
  }
  return { w, h, data: out };
}

const pix = (bild, x, y) => {
  const t = (y * bild.w + x) * 4;
  return [bild.data[t], bild.data[t + 1], bild.data[t + 2]];
};

/* Medianfarbe eines Rahmens um ein Rechteck — der oertliche Hintergrund. */
function rahmenMedian(bild, box, rand = 24) {
  const r = [], g = [], b = [];
  const x0 = Math.max(0, Math.round(box.x0 - rand)), x1 = Math.min(bild.w - 1, Math.round(box.x1 + rand));
  const y0 = Math.max(0, Math.round(box.y0 - rand)), y1 = Math.min(bild.h - 1, Math.round(box.y1 + rand));
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const drin = x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1;
      if (drin) continue;
      const c = pix(bild, x, y);
      r.push(c[0]); g.push(c[1]); b.push(c[2]);
    }
  }
  const med = (a) => { a.sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
  return [med(r), med(g), med(b)];
}

/* Anteil der Bildpunkte im Rechteck, die deutlich von einer Farbe abweichen. */
function anteilAnders(bild, box, farbe, schwelle = 26) {
  let n = 0, anders = 0;
  const x0 = Math.max(0, Math.round(box.x0)), x1 = Math.min(bild.w - 1, Math.round(box.x1));
  const y0 = Math.max(0, Math.round(box.y0)), y1 = Math.min(bild.h - 1, Math.round(box.y1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = pix(bild, x, y);
      const d = Math.max(Math.abs(c[0] - farbe[0]), Math.abs(c[1] - farbe[1]), Math.abs(c[2] - farbe[2]));
      n++;
      if (d > schwelle) anders++;
    }
  }
  return n ? anders / n : 0;
}

/* Anteil der Bildpunkte, in denen sich zwei gleich grosse Bilder unterscheiden. */
function bildUnterschied(a, b, schwelle = 24) {
  if (a.w !== b.w || a.h !== b.h) return 1;
  let anders = 0;
  const n = a.w * a.h;
  for (let i = 0; i < n; i++) {
    const t = i * 4;
    const d = Math.max(
      Math.abs(a.data[t] - b.data[t]),
      Math.abs(a.data[t + 1] - b.data[t + 1]),
      Math.abs(a.data[t + 2] - b.data[t + 2]));
    if (d > schwelle) anders++;
  }
  return anders / n;
}

/* --------------------------------------------------------------------------
 * Kleine Statistik
 * ------------------------------------------------------------------------ */

const z2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(2));
const z3 = (v) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(3));
const pz = (v) => (v === null || v === undefined || Number.isNaN(v) ? '—' : (v * 100).toFixed(1) + ' %');

const min = (a) => a.reduce((m, v) => (v < m ? v : m), Infinity);
const max = (a) => a.reduce((m, v) => (v > m ? v : m), -Infinity);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };

/* Schwankung ohne den Trend: erst Gerade abziehen, dann Spanne und
 * Richtungswechsel zaehlen. Ein bloss langsam absackender Koerper wabbelt
 * nicht — das trennt diese Rechnung sauber. */
function schwankung(werte) {
  const n = werte.length;
  if (n < 4) return { spanne: 0, wechsel: 0, mittel: NaN };
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += werte[i]; sxx += i * i; sxy += i * werte[i]; }
  const m = (n * sxy - sx * sy) / Math.max(n * sxx - sx * sx, 1e-9);
  const b = (sy - m * sx) / n;
  const res = werte.map((v, i) => v - (m * i + b));
  let vorz = 0, wechsel = 0;
  for (let i = 1; i < n; i++) {
    const s = Math.sign(res[i] - res[i - 1]);
    if (s && vorz && s !== vorz) wechsel++;
    if (s) vorz = s;
  }
  return { spanne: max(res) - min(res), wechsel, mittel: sy / n };
}

/* --------------------------------------------------------------------------
 * Der Fahrer, der in der Seite laeuft.
 * Er kennt nur window.SLIMORIA / window.G — er veraendert keine Spieldatei.
 * ------------------------------------------------------------------------ */

const FAHRER = () => {
  const STEP = 1 / 240;
  const G = window.G;
  const A = window.SLIMORIA.api;
  let uhr = 0;

  const r3 = (v) => Math.round(v * 1000) / 1000;

  function probe() {
    const b = G.slime.body;
    const m = A.metrics();
    const zk = G.kreaturen.find(k => k.id === G.zielId && k.lebt) || null;
    const cds = {};
    for (const id in G.cooldowns) if (G.cooldowns[id] > 0) cds[id] = r3(G.cooldowns[id]);
    return {
      t: r3(uhr),
      squash: m.squash, breite: m.breite, streckung: m.streckung,
      bbox: m.bbox, achsen: m.achsen, volumen: m.volumen,
      speed: m.speed, speedRatio: m.speedRatio, grounded: m.grounded,
      phase: m.phase, unterphase: m.unterphase,
      // Direkt bei den Lanes abgefragt: metrics().unterphase blendet die
      // Todesphasen aus, solange Fressen noch eine Phase stehen hat.
      fressPhase: (window.Fressen && window.Fressen.phase) || '',
      fressAktiv: !!(window.Fressen && window.Fressen.aktiv),
      todPhase: (window.Tod && window.Tod.phase) || '',
      hp: m.playerHp, maxHp: m.playerMaxHp, level: m.level, radius: m.radius,
      lebende: m.kreaturen,
      cx: r3(b.cx), cy: r3(b.cy), cz: r3(b.cz), vx: r3(b.vx), vz: r3(b.vz),
      mana: r3(G.spieler.mana), xp: G.spieler.xp, xpNaechstes: G.spieler.xpNaechstes,
      gold: G.spieler.gold,
      mund: r3(G.slime.mouth),
      marke: G.slime.target ? { x: r3(G.slime.target.x), z: r3(G.slime.target.z) } : null,
      ziel: zk ? {
        id: zk.id, name: zk.name, level: zk.level, groesse: r3(zk.groesse),
        x: r3(zk.x), y: r3(zk.y), z: r3(zk.z),
        hp: Math.round(zk.hp), maxHp: zk.maxHp,
      } : null,
      biss: (window.Combat && window.Combat.biss) ? r3(window.Combat.biss.t) : null,
      pfuetze: window.Tod ? r3(window.Tod.pfuetze) : 0,
      cooldowns: cds,
    };
  }

  function vor(dauer, probeAlle, zeichnen) {
    probeAlle = probeAlle || 1 / 60;
    const ende = uhr + dauer;
    const proben = [];
    let bis = 0, schutz = 0;
    while (uhr < ende - 1e-9 && schutz++ < 400000) {
      if (bis <= 1e-9) { proben.push(probe()); bis = probeAlle; }
      const dt = Math.min(STEP, ende - uhr);
      window.SLIMORIA.step(dt);
      uhr += dt; bis -= dt;
    }
    proben.push(probe());
    if (zeichnen !== false) window.SLIMORIA.render();
    return { proben, ereignisse: G.ereignisse.slice(), uhr: r3(uhr) };
  }

  function vorBis(code, maxDauer, probeAlle) {
    probeAlle = probeAlle || 1 / 60;
    const test = new Function('p', 'G', 'return (' + code + ');');
    const ende = uhr + maxDauer;
    const proben = [];
    let bis = 0, schutz = 0, treffer = false;
    while (uhr < ende - 1e-9 && schutz++ < 400000) {
      if (bis <= 1e-9) {
        const p = probe();
        proben.push(p); bis = probeAlle;
        if (test(p, G)) { treffer = true; break; }
      }
      const dt = Math.min(STEP, ende - uhr);
      window.SLIMORIA.step(dt);
      uhr += dt; bis -= dt;
    }
    const letzte = probe();
    proben.push(letzte);
    if (!treffer) treffer = test(letzte, G);
    window.SLIMORIA.render();
    return { proben, ereignisse: G.ereignisse.slice(), uhr: r3(uhr), treffer };
  }

  /* Weltpunkt -> Bildschirmpunkt, exakt wie die HUD-Projektion. */
  function schirm(x, y, z) {
    const m = G.kamera.viewProj;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (w <= 0.001) return null;
    const An = window.ANSICHT;
    return { x: (cx / w * 0.5 + 0.5) * An.w, y: (1 - (cy / w * 0.5 + 0.5)) * An.h, w };
  }

  /* Bildschirmrechteck der Schleimhuelle — aus allen Massepunkten. */
  function huelle() {
    const b = G.slime.body;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const s = schirm(b.pos[k], b.pos[k + 1], b.pos[k + 2]);
      if (!s) continue;
      n++;
      if (s.x < x0) x0 = s.x; if (s.x > x1) x1 = s.x;
      if (s.y < y0) y0 = s.y; if (s.y > y1) y1 = s.y;
    }
    if (!n) return null;
    const An = window.ANSICHT;
    return {
      x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1),
      mx: Math.round((x0 + x1) / 2), my: Math.round((y0 + y1) / 2),
      ganzDrin: x0 > 0 && y0 > 0 && x1 < An.w && y1 < An.h,
      flaeche: ((x1 - x0) * (y1 - y0)) / (An.w * An.h),
    };
  }

  function kamera() {
    const c = G.kamera, b = G.slime.body;
    return {
      yaw: r3(c.yaw), pitch: r3(c.pitch), dist: r3(c.dist), follow: !!c.follow,
      eye: [r3(c.eye[0]), r3(c.eye[1]), r3(c.eye[2])],
      ziel: [r3(c.tx), r3(c.ty), r3(c.tz)],
      abstand: r3(Math.hypot(c.eye[0] - b.cx, c.eye[1] - b.cy, c.eye[2] - b.cz)),
      ueber: r3(c.eye[1] - b.cy),
    };
  }

  function hud() {
    const q = (s) => document.querySelector(s);
    const txt = (s) => { const e = q(s); return e ? e.textContent.trim() : null; };
    const slots = Array.from(document.querySelectorAll('#ui-hotbar .hb-slot')).map(s => ({
      klassen: s.className,
      taste: (s.querySelector('.hb-taste') || {}).textContent || '',
      rest: (s.querySelector('.hb-cd b') || {}).textContent || '',
      icon: (s.querySelector('.hb-icon') || {}).className || '',
    }));
    return {
      zielAus: q('#ui-ziel') ? q('#ui-ziel').classList.contains('aus') : null,
      zielName: txt('#ui-z-name'), zielLevel: txt('#ui-z-level'),
      zielHpText: txt('#ui-z-hptext'), zielFress: txt('#ui-z-fress'),
      zielBalken: q('#ui-z-hp') ? q('#ui-z-hp').style.width : null,
      spLevel: txt('#ui-sp-level'), spName: txt('#ui-sp-name'), spHpText: txt('#ui-sp-hptext'),
      spBalken: q('#ui-sp-hp') ? q('#ui-sp-hp').style.width : null,
      xpText: txt('#ui-xp-text'), xpBalken: q('#ui-xp-fuell') ? q('#ui-xp-fuell').style.width : null,
      questFressen: txt('#ui-q-fressen'), questBesiegt: txt('#ui-q-besiegt'),
      hinweise: Array.from(document.querySelectorAll('#ui-hinweise .hw')).map(e => e.textContent),
      schweber: Array.from(document.querySelectorAll('#ui-welt .st')).map(e => e.textContent),
      slots,
    };
  }

  /* Ein klickbarer Bodenpunkt in einer Richtung: so weit weg wie moeglich,
   * aber noch sicher im Bild und mit freier Bahn. */
  function bodenZiel(dx, dz, maxD, minD, sichtbar) {
    const b = G.slime.body;
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l;
    const An = window.ANSICHT;
    const r = G.params.radius;
    for (let d = maxD; d >= (minD || 4); d -= 0.5) {
      const x = b.cx + ux * d, zz = b.cz + uz * d;
      let frei = true;
      for (let s = 1.0; s <= d + 0.01; s += 1.0) {
        if (!window.istFrei(b.cx + ux * s, b.cz + uz * s, r + 0.7)) { frei = false; break; }
      }
      if (!frei || !window.istFrei(x, zz, r + 0.7)) continue;
      const s = schirm(x, 0, zz);
      if (sichtbar !== false) {
        if (!s) continue;
        if (s.x < 140 || s.x > An.w - 140 || s.y < 140 || s.y > An.h - 190) continue;
      }
      return {
        x: r3(x), z: r3(zz), d: r3(d),
        sx: s ? Math.round(s.x) : null, sy: s ? Math.round(s.y) : null,
      };
    }
    return null;
  }

  /* Perspektivprobe: zwei gleich lange Messlatten auf der Blickachse, eine
   * nah, eine weit. Sie liegen quer zur Blickrichtung, damit beide Enden
   * exakt dieselbe Tiefe haben. Bei echter Perspektive verhaelt sich ihre
   * Bildlaenge streng umgekehrt proportional zur Tiefe. */
  function perspektive(laenge) {
    const L = laenge || 2;
    const c = G.kamera;
    const dx = c.tx - c.eye[0], dz = c.tz - c.eye[2];
    const l = Math.hypot(dx, dz) || 1;
    const ux = dx / l, uz = dz / l;
    const qx = -uz, qz = ux;                       // quer zur Blickrichtung
    const orte = [[c.tx - ux * 3, c.tz - uz * 3], [c.tx + ux * 15, c.tz + uz * 15]];
    return orte.map(([x, zz]) => {
      const a = schirm(x - qx * L / 2, 0, zz - qz * L / 2);
      const b = schirm(x + qx * L / 2, 0, zz + qz * L / 2);
      return {
        x: r3(x), z: r3(zz), laenge: L,
        bild: (a && b) ? r3(Math.hypot(a.x - b.x, a.y - b.y)) : null,
        tiefe: a ? r3((a.w + b.w) / 2) : null,
      };
    });
  }

  function aufLevel(ziel) {
    let schutz = 0;
    while (G.spieler.level < ziel && schutz++ < 200) {
      A.grantXp(Math.max(1, G.spieler.xpNaechstes - G.spieler.xp));
    }
    return G.spieler.level;
  }

  window.__abn = {
    get uhr() { return uhr; },
    probe, vor, vorBis, schirm, huelle, kamera, hud, bodenZiel, perspektive, aufLevel,
    info: () => ({
      massepunkte: G.slime.body.n,
      dreiecke: G.slime.body.mesh.indices.length / 3,
      maxSpeed: G.params.maxSpeed,
      radius: r3(G.params.radius),
      reichweite: G.reichweite,
      friedhof: { x: window.WELT.friedhof.x, z: window.WELT.friedhof.z },
      bodenEbene: window.bodenHoehe(0, 0),
      bodenPlateau: window.bodenHoehe(-13, -12),
      hindernisse: window.WELT.obstacles.length,
      faehigkeiten: window.Regeln.FAEHIGKEITEN.map(f => ({ id: f.id, taste: f.taste, cd: f.cd, kosten: f.kosten })),
      netz: { verbunden: !!(window.Netz && window.Netz.verbunden) },
    }),
    zustand: () => ({
      ...window.SLIMORIA.api.state(),
      spieler: { ...G.spieler },
      kreaturen: G.kreaturen.map(k => ({ id: k.id, art: k.art, level: k.level, x: r3(k.x), z: r3(k.z), hp: Math.round(k.hp), maxHp: k.maxHp, lebt: k.lebt, groesse: r3(k.groesse) })),
    }),
  };
  return true;
};

/* --------------------------------------------------------------------------
 * Browser starten — identisch zu tools/capture.mjs
 * ------------------------------------------------------------------------ */

async function starten() {
  return puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    args: [
      '--headless=new',
      '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--disable-lcd-text',
      '--force-color-profile=srgb', '--font-render-hinting=none',
      `--window-size=${W},${H}`,
    ],
  });
}

async function spielOeffnen(browser, port) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const fehler = [];
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  try {
    await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  } catch (e) {
    throw new Error('Spiel wurde nicht bereit.\n' + fehler.join('\n'));
  }
  return { page, fehler };
}

/* --------------------------------------------------------------------------
 * Hauptlauf
 * ------------------------------------------------------------------------ */

fs.mkdirSync(BILDER, { recursive: true });
if (!has('behalten')) {
  for (const f of fs.readdirSync(BILDER)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(BILDER, f));
  }
}

const server = createServer();
const port = await listen(server, 0);
const browser = await starten();

let seite = null;
let seitenfehler = [];
let abbruch = null;
const proben = [];            // alle Messproben des ganzen Laufs
const ereignisse = [];        // alle Spielereignisse, dedupliziert
const gesehen = new Map();
const bilderCache = new Map();

function sammeln(r) {
  for (const p of r.proben) proben.push(p);
  const proT = new Map();
  for (const e of r.ereignisse) {
    const n = (proT.get(e.t) || 0) + 1;
    proT.set(e.t, n);
    if (n > (gesehen.get(e.t) || 0)) { ereignisse.push(e); gesehen.set(e.t, n); }
  }
}
function sammlungLeeren() { proben.length = 0; ereignisse.length = 0; gesehen.clear(); }

const fahre = async (dauer, probeAlle = 1 / 60) => {
  const r = await seite.evaluate((d, pa) => window.__abn.vor(d, pa), dauer, probeAlle);
  sammeln(r);
  return r.proben;
};
const fahreBis = async (code, maxDauer, probeAlle = 1 / 60) => {
  const r = await seite.evaluate((c, d, pa) => window.__abn.vorBis(c, d, pa), code, maxDauer, probeAlle);
  sammeln(r);
  return r;
};
const jetzt = () => seite.evaluate(() => window.__abn.probe());
const hud = () => seite.evaluate(() => window.__abn.hud());
const kamera = () => seite.evaluate(() => window.__abn.kamera());
const huelle = () => seite.evaluate(() => window.__abn.huelle());
const zustand = () => seite.evaluate(() => window.__abn.zustand());

async function beleg(datei) {
  const ziel = path.join(BILDER, datei);
  await seite.screenshot({ path: ziel, captureBeyondViewport: false });
  return 'gauntlet/abnahme/' + datei;
}
function bildVon(datei) {
  if (!bilderCache.has(datei)) bilderCache.set(datei, pngLesen(path.join(BILDER, datei)));
  return bilderCache.get(datei);
}

/* Echter Mausklick auf einen Weltpunkt. #view liegt fix auf (0,0), also ist
 * der Bildschirmpunkt zugleich der offsetX/offsetY der Seite. */
async function klickWelt(x, y, z, taste = 'left') {
  const s = await seite.evaluate((a, b, c) => window.__abn.schirm(a, b, c), x, y, z);
  if (!s || s.x < 6 || s.x > W - 6 || s.y < 6 || s.y > H - 6) {
    throw new Error(`Klickpunkt (${x}, ${z}) liegt nicht im Bild.`);
  }
  await seite.mouse.click(Math.round(s.x), Math.round(s.y), { button: taste });
  return { sx: Math.round(s.x), sy: Math.round(s.y) };
}
const taste = (k) => seite.keyboard.press(k);

const ereignisseAb = (t) => ereignisse.filter(e => e.t >= t);
const letzterEreignis = (art) => [...ereignisse].reverse().find(e => e.art === art) || null;
/* Achtung: game.js meldet 'besiegt', 'fressErfolg' und 'fressFehlschlag' mit
 * einem Feld `art` in den Daten, das den Ereignisnamen ueberschreibt. Diese
 * drei Ereignisse sind im Protokoll deshalb nicht identifizierbar. Alles, was
 * hier davon abhaengt, wird stattdessen am Spielzustand gemessen (Bestiarium,
 * XP, lebende Kreaturen) — das ist ohnehin der haertere Beleg. */
const summeBest = (st, feld) =>
  Object.values(st.bestiarium || {}).reduce((s, e) => s + (e[feld] || 0), 0);

try {
  const auf = await spielOeffnen(browser, port);
  seite = auf.page;
  seitenfehler = auf.fehler;
  await seite.evaluate(FAHRER);
  const INFO = await seite.evaluate(() => window.__abn.info());

  /* ======================================================================
   * Station 1 — Der Schleim entsteht (A1, A2, B1, B2)
   * ==================================================================== */
  process.stdout.write('Station 1: Erschaffung und Sicht ... ');
  await seite.evaluate((seed) => {
    const A = window.SLIMORIA.api;
    A.reset({ seed, level: 1, faction: 'eldoran' });
    A.setHudVisible(true);
    A.setCamera({ yaw: 0.7, pitch: 0.38, dist: 11, follow: true });
  }, SEED);
  sammlungLeeren();

  await fahre(0.9);
  const pStart = await jetzt();
  const hStart = await huelle();
  const kStart = await kamera();
  const bl01 = await beleg('01-schleim-erstellen.png');

  const bild01 = bildVon('01-schleim-erstellen.png');
  const grund01 = rahmenMedian(bild01, hStart, 26);
  const gezeichnet = anteilAnders(bild01, hStart, grund01, 26);

  const volOk = pStart.volumen > 0.85 && pStart.volumen < 1.15;
  const achsenOk = pStart.bbox.w > 0.5 * pStart.radius && pStart.bbox.h > 0.5 * pStart.radius && pStart.bbox.d > 0.5 * pStart.radius;
  urteil('A', 1,
    'Nach reset() existiert ein Weichkoerper aus ≥ 100 Massepunkten, sein Volumen liegt bei 1.00 ± 0.15 des Ruhevolumens, alle drei Hüllachsen sind > 0.5·Radius, und ≥ 25 % der Bildpunkte innerhalb der projizierten Hülle weichen vom umgebenden Hintergrund ab (er ist wirklich gezeichnet).',
    `${INFO.massepunkte} Massepunkte / ${INFO.dreiecke} Dreiecke · Volumen ${z3(pStart.volumen)} · bbox ${z2(pStart.bbox.w)}×${z2(pStart.bbox.h)}×${z2(pStart.bbox.d)} bei Radius ${z2(pStart.radius)} · ${pz(gezeichnet)} der Hüllfläche vom Hintergrund unterscheidbar`,
    INFO.massepunkte >= 100 && volOk && achsenOk && gezeichnet >= 0.25,
    bl01);

  // A2/B2: dritte Person. Erst der ruhende Blick, dann eine Kameradrehung.
  const zentrumAbw = Math.hypot(hStart.mx - W / 2, hStart.my - H / 2) / Math.hypot(W / 2, H / 2);
  // Weiche Drehung in Stufen, damit die Kamera nicht springt. Die Uhr laeuft
  // dabei ueber denselben Fahrer weiter — sonst driften Messzeit und G.zeit.
  for (let i = 1; i <= 8; i++) {
    await seite.evaluate((y) => window.SLIMORIA.api.setCamera({ yaw: y }), 0.7 + i * 0.2);
    await fahre(0.05);
  }
  const hGedreht = await huelle();
  const kGedreht = await kamera();
  const blB02 = await beleg('b02-kamera.png');
  const bildB02 = bildVon('b02-kamera.png');
  const hintergrundWechsel = bildUnterschied(bild01, bildB02, 24);
  const zentrumAbw2 = Math.hypot(hGedreht.mx - W / 2, hGedreht.my - H / 2) / Math.hypot(W / 2, H / 2);

  const augeWeg = Math.hypot(kGedreht.eye[0] - kStart.eye[0], kGedreht.eye[2] - kStart.eye[2]);
  const abstandStabil = Math.abs(kGedreht.abstand / kStart.abstand - 1);
  urteil('B', 2,
    'Die Kamera kreist um den Schleim, statt starr zu stehen: bei Δyaw ≥ 1.5 rad wandert das Auge ≥ 8 Welteinheiten, der Abstand zum Schleim bleibt dabei auf 10 % konstant (Orbit, kein Zoom), der Schleim bleibt in beiden Bildern innerhalb von 25 % der Bilddiagonale um die Bildmitte, und das Bild ändert sich messbar (≥ 4 % der Bildpunkte).',
    `Δyaw ${z2(kGedreht.yaw - kStart.yaw)} rad · Auge (${kStart.eye.map(z2).join(', ')}) → (${kGedreht.eye.map(z2).join(', ')}) = ${z2(augeWeg)} Einheiten · Abstand ${z2(kStart.abstand)} → ${z2(kGedreht.abstand)} (Δ ${pz(abstandStabil)}) · Mittenabstand ${pz(zentrumAbw)} → ${pz(zentrumAbw2)} · Bildwechsel ${pz(hintergrundWechsel)}`,
    (kGedreht.yaw - kStart.yaw) >= 1.5 && augeWeg >= 8 && abstandStabil < 0.10
      && zentrumAbw < 0.25 && zentrumAbw2 < 0.25 && hintergrundWechsel >= 0.04,
    blB02);

  // B1: 3D-Welt — Perspektive und Hoehenunterschiede nachrechnen.
  const persp = await seite.evaluate(() => window.__abn.perspektive(2));
  const verhSchirm = persp[0].bild / persp[1].bild;
  const verhTiefe = persp[1].tiefe / persp[0].tiefe;
  const perspFehler = Math.abs(verhSchirm / verhTiefe - 1);
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.9, pitch: 0.85, dist: 30 }));
  await fahre(0.05);
  const blB01 = await beleg('b01-3d-welt.png');
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.7, pitch: 0.38, dist: 11 }));
  await fahre(0.05);

  urteil('B', 1,
    'Echte 3D-Projektion: zwei gleich lange Messlatten auf der Blickachse erscheinen umgekehrt proportional zu ihrer Tiefe (Abweichung < 5 %, Tiefenverhältnis ≥ 1.8); der Boden hat unterschiedliche Höhen (Ebene gegen Plateau); der Körper hat Ausdehnung in allen drei Achsen.',
    `2 m Messlatte: ${z2(persp[0].bild)} px bei Tiefe ${z2(persp[0].tiefe)} gegen ${z2(persp[1].bild)} px bei Tiefe ${z2(persp[1].tiefe)} → Verhältnis ${z2(verhSchirm)} gegen ${z2(verhTiefe)}, Fehler ${pz(perspFehler)} · Bodenhöhe Ebene ${z2(INFO.bodenEbene)} / Plateau ${z2(INFO.bodenPlateau)} · ${INFO.hindernisse} Hindernisse · Hülle ${z2(pStart.bbox.w)}×${z2(pStart.bbox.h)}×${z2(pStart.bbox.d)}`,
    perspFehler < 0.05 && verhTiefe >= 1.8 && INFO.bodenPlateau > INFO.bodenEbene && achsenOk,
    blB01);
  console.log('ok');

  /* ======================================================================
   * Station 2 — Wabbeln im Stand (A7)
   * ==================================================================== */
  process.stdout.write('Station 2: Wabbeln im Stand ... ');
  // Erst drei Sekunden stehen lassen: das Zusammensacken (slump, 1.5 s) ist
  // dann durch und das Nachschwingen aus dem Aufsetzen ebenfalls. Was danach
  // noch schwankt, ist Eigenleben und kein abklingender Anstoss.
  await fahre(3.0);
  const wabbelStart = proben.length;
  await fahre(2.0, 1 / 60);
  const blA07 = await beleg('07-wabbeln.png');
  const fenster = proben.slice(wabbelStart);
  const sq = schwankung(fenster.map(p => p.squash));
  const wanderX = max(fenster.map(p => p.cx)) - min(fenster.map(p => p.cx));
  const wanderZ = max(fenster.map(p => p.cz)) - min(fenster.map(p => p.cz));
  const wanderung = Math.hypot(wanderX, wanderZ);
  const wabbelAnteil = sq.spanne / sq.mittel;

  urteil('A', 7,
    'Nach drei Sekunden Stillstand schwankt metrics().squash über weitere 2 s um ≥ 1.5 % (Spanne nach Abzug des Trends, ≥ 2 Richtungswechsel), während der Schwerpunkt sich um < 0.15 Welteinheiten bewegt — der Körper lebt also, ohne sich zu bewegen.',
    `Schwankung ${pz(wabbelAnteil)} um Mittel ${z3(sq.mittel)} · ${sq.wechsel} Richtungswechsel · Schwerpunkt wandert ${z3(wanderung)}`,
    wabbelAnteil >= 0.015 && sq.wechsel >= 2 && wanderung < 0.15,
    blA07);
  const standStreckung = median(fenster.map(p => p.streckung));
  const standSquash = median(fenster.map(p => p.squash));
  console.log('ok');

  /* ======================================================================
   * Station 3 — Klicken und hinlaufen (A3, A4, A5, A8, B3)
   * ==================================================================== */
  process.stdout.write('Station 3: Klicken, anrollen, Vollgas, Ankommen ... ');
  // Steiler Blick: sonst liegt ein 17 Einheiten entferntes Bodenziel am
  // Horizont und die Zielmarkierung waere im Beleg nicht zu erkennen.
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: -0.785, pitch: 0.62, dist: 14 }));
  await fahre(0.3);
  const ziel1 = await seite.evaluate(() => window.__abn.bodenZiel(-0.707, 0.707, 17, 9));
  if (!ziel1) throw new Error('Kein klickbarer Bodenpunkt fuer die Laufstrecke gefunden.');
  const klick1 = await klickWelt(ziel1.x, 0, ziel1.z);
  const nachKlick = await jetzt();

  // Rueckprojektion vor dem ersten Schritt: liegt die gesetzte Marke wirklich
  // unter dem Mauszeiger?
  const rueck = nachKlick.marke
    ? await seite.evaluate((x, zz) => window.__abn.schirm(x, 0, zz), nachKlick.marke.x, nachKlick.marke.z)
    : null;
  // Die Messfahrt beginnt beim Klick, nicht erst beim Belegbild — sonst
  // faengt sie den Stillstand vor dem Anrollen nicht mehr ein.
  const laufStart = proben.length;
  await fahre(0.2);     // ein Bild zeichnen lassen, sonst fehlt der Zielring
  const blA03 = await beleg('03-klickpunkt.png');
  const klickFehler = rueck ? Math.hypot(rueck.x - klick1.sx, rueck.y - klick1.sy) : Infinity;
  const startAbstand = nachKlick.marke ? Math.hypot(nachKlick.cx - nachKlick.marke.x, nachKlick.cz - nachKlick.marke.z) : 0;

  urteil('A', 3,
    'Ein echter Linksklick (CDP-Mausereignis) auf einen Bodenpunkt setzt eine Bewegungsmarke; die Rückprojektion dieser Marke trifft den geklickten Bildschirmpunkt auf < 12 px genau.',
    `Klick auf (${klick1.sx}, ${klick1.sy}) px → Marke (${z2(nachKlick.marke && nachKlick.marke.x)}, ${z2(nachKlick.marke && nachKlick.marke.z)}) · Rückprojektionsfehler ${z2(klickFehler)} px · Entfernung ${z2(startAbstand)} Einheiten`,
    !!nachKlick.marke && klickFehler < 12,
    blA03);

  // Drei Momente aus derselben Fahrt: Vollgas, Bremsen, Ankunft.
  const vollgas = await fahreBis('p.speedRatio > 0.9', 5, 1 / 120);
  const blA08 = await beleg('08-tempoform.png');
  await fahreBis(`p.speed < ${0.45 * INFO.maxSpeed} && p.t > ${vollgas.uhr + 0.2}`, 8, 1 / 120);
  const blA05 = await beleg('05-beschleunigen.png');
  await fahreBis(
    `p.marke === null || Math.hypot(p.cx-(${ziel1.x}), p.cz-(${ziel1.z})) < 0.6`, 12, 1 / 60);
  const blA04 = await beleg('04-hinbewegen.png');
  // Auslaufen lassen: erst wenn der Koerper wirklich steht, ist "Abbremsen"
  // belegt und nicht bloss "langsamer geworden".
  await fahreBis('p.speed < 0.25', 4, 1 / 60);
  const lauf = proben.slice(laufStart);
  const endAbstand = Math.hypot(lauf[lauf.length - 1].cx - ziel1.x, lauf[lauf.length - 1].cz - ziel1.z);

  urteil('A', 4,
    'Nach dem Klick verringert sich der Abstand zum geklickten Punkt von > 8 auf < 0.6 Welteinheiten, ohne dass eine Position gesetzt wurde (nur Antrieb).',
    `Abstand ${z2(startAbstand)} → ${z2(endAbstand)} Einheiten in ${z2(lauf[lauf.length - 1].t - lauf[0].t)} s`,
    startAbstand > 8 && endAbstand < 0.6,
    blA04);
  urteil('B', 3,
    'Klickbewegung: derselbe Nachweis wie Punkt A3/A4 — echter Mausklick setzt das Ziel, der Körper läuft von selbst hin und hält an.',
    `Rückprojektionsfehler ${z2(klickFehler)} px · Abstand ${z2(startAbstand)} → ${z2(endAbstand)} · Endgeschwindigkeit ${z2(lauf[lauf.length - 1].speed)}`,
    !!nachKlick.marke && klickFehler < 12 && endAbstand < 0.6 && lauf[lauf.length - 1].speed < 0.5,
    blA04);

  // A5: Beschleunigen und Abbremsen
  const vSpitze = max(lauf.map(p => p.speed));
  const iSpitze = lauf.findIndex(p => p.speed === vSpitze);
  const vStart = lauf[0].speed;
  const vEnde = lauf[lauf.length - 1].speed;
  const streckLauf = lauf.map(p => p.streckung);
  const streckWechsel = max(streckLauf) / min(streckLauf) - 1;
  urteil('A', 5,
    'metrics().speed steigt von < 0.3 auf > 80 % von maxSpeed und fällt wieder unter 0.3; dabei ändert sich metrics().streckung um ≥ 8 %.',
    `Tempo ${z2(vStart)} → ${z2(vSpitze)} (${pz(vSpitze / INFO.maxSpeed)} von maxSpeed ${z2(INFO.maxSpeed)}) → ${z2(vEnde)} · Streckung ${z3(min(streckLauf))} … ${z3(max(streckLauf))} = ${pz(streckWechsel)}`,
    vStart < 0.3 && vSpitze > 0.8 * INFO.maxSpeed && vEnde < 0.3 && streckWechsel >= 0.08,
    blA05);

  // A8: Geschwindigkeit an der Form
  const schnell = lauf.filter(p => p.speedRatio > 0.85);
  const streckSchnell = schnell.length ? median(schnell.map(p => p.streckung)) : NaN;
  const streckVerh = streckSchnell / standStreckung;
  urteil('A', 8,
    'metrics().streckung bei vollem Tempo ist ≥ 12 % größer als im Stand (Mediane beider Fenster).',
    `Stand ${z3(standStreckung)} → Vollgas ${z3(streckSchnell)} = ${pz(streckVerh - 1)} mehr (${schnell.length} Proben über 85 % maxSpeed)`,
    schnell.length >= 5 && streckVerh >= 1.12,
    blA08);
  console.log('ok');

  /* ======================================================================
   * Station 4 — Richtungswechsel (A6)
   * ==================================================================== */
  process.stdout.write('Station 4: Richtungswechsel ... ');
  // Kamera quer zur Laufachse: so laeuft die Kehrtwende quer durchs Bild und
  // ist im Beleg als Wende zu erkennen, nicht als Punkt, der kleiner wird.
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.785, pitch: 0.34, dist: 13 }));
  await fahre(0.2);
  const ziel2 = await seite.evaluate(() => window.__abn.bodenZiel(0.707, -0.707, 17, 9, false));
  if (!ziel2) throw new Error('Kein Bodenpunkt fuer den Rueckweg gefunden.');
  await seite.evaluate((x, zz) => window.SLIMORIA.api.moveTo(x, zz), ziel2.x, ziel2.z);
  await fahre(1.6);
  const vorWende = await jetzt();
  const wendeStart = proben.length;
  await seite.evaluate((x, zz) => window.SLIMORIA.api.moveTo(x, zz), ziel1.x, ziel1.z);
  const wendeLauf = await fahre(2.2, 1 / 120);
  const wende = proben.slice(wendeStart);
  const blA06 = await beleg('06-richtungswechsel.png');

  const richtung = (p) => Math.atan2(p.vz, p.vx);
  const winkel = (a, b) => {
    let d = Math.abs(a - b) % (Math.PI * 2);
    return d > Math.PI ? Math.PI * 2 - d : d;
  };
  const rVor = richtung(vorWende);
  const spaet = wende.filter(p => p.speed > 0.6 * INFO.maxSpeed && p.t > wende[0].t + 0.8);
  const rNach = spaet.length ? richtung(spaet[spaet.length - 1]) : rVor;
  const drehung = winkel(rVor, rNach) * 180 / Math.PI;
  const tiefstesTempo = min(wende.map(p => p.speed));
  const streckTief = min(wende.map(p => p.streckung));
  const streckSpaet = spaet.length ? max(spaet.map(p => p.streckung)) : NaN;

  urteil('A', 6,
    'Kehrtwende bei vollem Tempo: die Bewegungsrichtung dreht sich um ≥ 150°, das Tempo bricht dabei unter 55 % von maxSpeed ein (die Masse muss erst umkehren) und die Streckung fällt im Wendepunkt unter den Wert danach.',
    `Drehung ${z2(drehung)}° · Tempo bricht auf ${z2(tiefstesTempo)} ein (${pz(tiefstesTempo / INFO.maxSpeed)} von maxSpeed) · Streckung Wendepunkt ${z3(streckTief)} → danach ${z3(streckSpaet)}`,
    drehung >= 150 && tiefstesTempo < 0.55 * INFO.maxSpeed && streckTief < streckSpaet,
    blA06);
  console.log('ok');

  /* ======================================================================
   * Station 5 — Kreatur finden und ansteuern (A9, A10, B6, B7)
   * ==================================================================== */
  process.stdout.write('Station 5: Kreatur finden, anvisieren, hinlaufen ... ');
  const K1 = await seite.evaluate(() => window.SLIMORIA.api.spawnCreature({ art: 'wolf', level: 2, x: 8, z: 2 }));
  await seite.evaluate(() => window.SLIMORIA.api.spawnCreature({ art: 'schleimling', level: 2, x: -6, z: -11 }));
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.7, pitch: 0.38, dist: 12 }));
  // Bis auf Sichtweite heran, aber ausserhalb des Aggro-Radius von 7 stehen
  // bleiben: sonst kommt die Kreatur von selbst und "zum Gegner bewegen"
  // waere nie zu zeigen.
  const halt = await seite.evaluate((id) => {
    const k = window.G.kreaturen.find(c => c.id === id);
    const b = window.G.slime.body;
    const dx = b.cx - k.x, dz = b.cz - k.z;
    const d = Math.hypot(dx, dz) || 1;
    return { x: +(k.x + dx / d * 9.2).toFixed(2), z: +(k.z + dz / d * 9.2).toFixed(2) };
  }, K1);
  await seite.evaluate((x, zz) => window.SLIMORIA.api.moveTo(x, zz), halt.x, halt.z);
  await fahreBis(`Math.hypot(p.cx-(${halt.x}), p.cz-(${halt.z})) < 1.2`, 14);
  await fahreBis('p.speed < 0.3', 2);
  // Blick ueber die Schulter auf die Kreatur — sonst steht sie neben dem Bild.
  await seite.evaluate((id) => {
    const k = window.G.kreaturen.find(c => c.id === id);
    const b = window.G.slime.body;
    window.SLIMORIA.api.setCamera({ yaw: Math.atan2(b.cz - k.z, b.cx - k.x), pitch: 0.32, dist: 12 });
  }, K1);
  await fahre(0.2);

  const sichtK1 = await seite.evaluate((id) => {
    const k = window.G.kreaturen.find(c => c.id === id);
    const b = window.G.slime.body;
    const s = window.__abn.schirm(k.x, k.y + k.groesse, k.z);
    const An = window.ANSICHT;
    return {
      name: k.name, level: k.level, hp: Math.round(k.hp), maxHp: k.maxHp, lebt: k.lebt,
      abstand: Math.round(Math.hypot(b.cx - k.x, b.cz - k.z) * 100) / 100,
      sx: s ? Math.round(s.x) : null, sy: s ? Math.round(s.y) : null,
      imBild: !!s && s.x > 40 && s.x < An.w - 40 && s.y > 40 && s.y < An.h - 40,
      groesse: k.groesse,
    };
  }, K1);
  const blA09 = await beleg('09-kreatur-finden.png');
  const bild09 = bildVon('09-kreatur-finden.png');
  const kBox = {
    x0: sichtK1.sx - 34, x1: sichtK1.sx + 34,
    y0: sichtK1.sy - 20, y1: sichtK1.sy + 46,
  };
  const kGezeichnet = anteilAnders(bild09, kBox, rahmenMedian(bild09, kBox, 26), 26);

  urteil('A', 9,
    'Eine lebende Kreatur mit Name, Level und HP steht in der Welt, ist auf < 12 Einheiten herangekommen, projiziert mit ≥ 40 px Rand ins Bild und hebt sich dort in ≥ 20 % der Bildpunkte vom Hintergrund ab.',
    `${sichtK1.name} — Level ${sichtK1.level} · ${sichtK1.hp}/${sichtK1.maxHp} HP · Abstand ${z2(sichtK1.abstand)} · Bildposition (${sichtK1.sx}, ${sichtK1.sy}) · ${pz(kGezeichnet)} vom Hintergrund unterscheidbar`,
    sichtK1.lebt && sichtK1.abstand < 12 && sichtK1.imBild && kGezeichnet >= 0.2,
    blA09);
  urteil('B', 6,
    'Kreatur: eigenes Wesen mit Art, Level, eigenen HP und eigener Bewegung — sie nähert sich dem Schleim selbstständig (Aggro), ihre HP sind vom Spieler getrennt.',
    `${sichtK1.name} (Art wolf, Level ${sichtK1.level}) mit ${sichtK1.hp}/${sichtK1.maxHp} eigenen HP, Größe ${z2(sichtK1.groesse)}`,
    sichtK1.lebt && sichtK1.maxHp > 0,
    blA09);

  // Echter Linksklick auf die Kreatur = Zielauswahl (GDD 02 §3)
  await seite.mouse.click(sichtK1.sx, sichtK1.sy, { button: 'left' });
  await fahre(0.1);
  const nachAuswahl = await jetzt();
  const hudAuswahl = await hud();
  const blB07 = await beleg('b07-zielauswahl.png');
  urteil('B', 7,
    'Ein echter Linksklick auf die Kreatur setzt sie als Ziel; die Zielanzeige im HUD zeigt danach Name, Level und HP (GDD 10 §21).',
    `zielId = ${nachAuswahl.ziel && nachAuswahl.ziel.id} · HUD: „${hudAuswahl.zielName} — Level ${hudAuswahl.zielLevel} · ${hudAuswahl.zielHpText}“ · ${hudAuswahl.zielFress}`,
    !!nachAuswahl.ziel && nachAuswahl.ziel.id === K1 && hudAuswahl.zielAus === false
      && !!hudAuswahl.zielName && !!hudAuswahl.zielLevel && !!hudAuswahl.zielHpText,
    blB07);

  // Echter Rechtsklick = zielorientierte Aktion: hinbewegen und angreifen
  const vorAnmarsch = await jetzt();
  const abstandVorher = Math.hypot(vorAnmarsch.cx - vorAnmarsch.ziel.x, vorAnmarsch.cz - vorAnmarsch.ziel.z);
  await seite.mouse.click(sichtK1.sx, sichtK1.sy, { button: 'right' });
  const anmarsch = await fahreBis(
    'p.ziel && Math.hypot(p.cx-p.ziel.x, p.cz-p.ziel.z) <= 2.6 + p.radius + p.ziel.groesse', 12);
  const blA10 = await beleg('10-zum-gegner.png');
  const nachAnmarsch = anmarsch.proben[anmarsch.proben.length - 1];
  const abstandNachher = nachAnmarsch.ziel
    ? Math.hypot(nachAnmarsch.cx - nachAnmarsch.ziel.x, nachAnmarsch.cz - nachAnmarsch.ziel.z) : NaN;
  const reichweite = 2.6 + nachAnmarsch.radius + (nachAnmarsch.ziel ? nachAnmarsch.ziel.groesse : 0);

  urteil('A', 10,
    'Ein echter Rechtsklick auf die Kreatur setzt Ziel und Auto-Angriff; der Schleim rückt selbstständig nach, bis der Abstand unter die Angriffsreichweite fällt — ohne weitere Eingabe.',
    `Abstand ${z2(abstandVorher)} → ${z2(abstandNachher)} (Reichweite ${z2(reichweite)}) in ${z2(anmarsch.uhr - vorAnmarsch.t)} s`,
    anmarsch.treffer && abstandVorher > 5 && abstandNachher <= reichweite,
    blA10);
  console.log('ok');

  /* ======================================================================
   * Station 6 — Kampf, Fähigkeit, HP (A11, A12, B8, B12, B14)
   * ==================================================================== */
  process.stdout.write('Station 6: Auto-Angriff, Fähigkeit, HP ... ');
  const kampfStart = proben.length;
  const tKampf = (await jetzt()).t * 1000;

  // Ein Biss-Moment als Beleg: genau im Zuschnappen anhalten.
  await fahreBis('p.biss !== null && p.biss > 0.16 && p.biss < 0.26', 6, 1 / 240);
  const blA11 = await beleg('11-kampf.png');
  const bissProbe = await jetzt();

  // Echte Tastatur: Taste 2 = Hotbar-Slot 2 = Körperstoß (GDD 10 §17)
  const vorStoss = await jetzt();
  await taste('2');
  await fahre(0.2);
  const nachStoss = await jetzt();
  const hudStoss = await hud();
  const blB14 = await beleg('b14-faehigkeit.png');
  const stossSlot = hudStoss.slots[1];
  const manaWeg = vorStoss.mana - nachStoss.mana;
  const schadenStoss = (vorStoss.ziel && nachStoss.ziel) ? vorStoss.ziel.hp - nachStoss.ziel.hp : NaN;

  urteil('B', 14,
    'Fähigkeit über die echte Taste „2“ (Körperstoß): Ressource wird verbraucht, das Ziel verliert HP, und der Hotbar-Slot geht sichtbar in die Abklingzeit (Klasse „kuehlt“ mit Restzeit).',
    `Mana −${z2(manaWeg)} · Ziel −${z2(schadenStoss)} HP · Slot 2 Klassen „${stossSlot.klassen}“, Restzeit „${stossSlot.rest}“`,
    manaWeg > 5 && schadenStoss > 0 && /kuehlt/.test(stossSlot.klassen) && stossSlot.rest !== '',
    blB14);

  // Weiter kämpfen, bis der Gegner deutlich geschwächt ist.
  const geschwaecht = await fahreBis('p.ziel && p.ziel.hp / p.ziel.maxHp <= 0.32', 25);
  const kampf = proben.slice(kampfStart);
  const autoTreffer = ereignisseAb(tKampf).filter(e => e.art === 'schaden' && e.quelle === 'auto');
  const alleTreffer = ereignisseAb(tKampf).filter(e => e.art === 'schaden');
  const abstaende = [];
  for (let i = 1; i < autoTreffer.length; i++) abstaende.push((autoTreffer[i].t - autoTreffer[i - 1].t) / 1000);
  const hpVerlauf = kampf.filter(p => p.ziel).map(p => p.ziel.hp);
  const zielSank = hpVerlauf.length > 1 && hpVerlauf[hpVerlauf.length - 1] < hpVerlauf[0];
  const mundOffen = max(kampf.map(p => p.mund));

  urteil('A', 11,
    'Auto-Angriff läuft ohne weitere Eingabe: ≥ 3 Treffer der Quelle „auto“ im festen Takt (2.0 s ± 0.3), die HP des Gegners sinken dabei monoton, und der Körper führt den Biss sichtbar aus (Mund öffnet sich auf ≥ 0.8).',
    `${autoTreffer.length} Auto-Treffer, Taktabstände ${abstaende.map(a => z2(a)).join(' / ')} s · Ziel-HP ${hpVerlauf[0]} → ${hpVerlauf[hpVerlauf.length - 1]} · Mund max ${z2(mundOffen)} · Bissphase im Beleg t=${z3(bissProbe.biss)} s`,
    autoTreffer.length >= 3 && zielSank && mundOffen >= 0.8
      && abstaende.every(a => Math.abs(a - 2.0) < 0.35),
    blA11);
  urteil('B', 8,
    'Grundlegender Angriff: Treffer werden ausgeführt, richten bezifferten Schaden an und werden im HUD als Schadenszahl über dem Ziel angezeigt.',
    `${alleTreffer.length} Treffer gesamt, Einzelschaden ${alleTreffer.slice(0, 4).map(e => Math.round(e.betrag)).join(' / ')} …`,
    alleTreffer.length >= 3 && alleTreffer.every(e => e.betrag > 0),
    blA11);

  const nachSchwaechen = geschwaecht.proben[geschwaecht.proben.length - 1];
  const hudSchwach = await hud();
  const blA12 = await beleg('12-schwaechen.png');
  const anteilHp = nachSchwaechen.ziel ? nachSchwaechen.ziel.hp / nachSchwaechen.ziel.maxHp : NaN;
  const balken = parseFloat(String(hudSchwach.zielBalken).replace('%', ''));
  const balkenFehler = Math.abs(balken - anteilHp * 100);

  urteil('A', 12,
    'Der Gegner ist messbar geschwächt: HP-Anteil ≤ 35 %, der HUD-Balken zeigt denselben Anteil (Abweichung < 2 Prozentpunkte), und die angezeigte Fresschance ist gestiegen.',
    `Ziel ${nachSchwaechen.ziel && nachSchwaechen.ziel.hp}/${nachSchwaechen.ziel && nachSchwaechen.ziel.maxHp} = ${pz(anteilHp)} · HUD-Balken ${hudSchwach.zielBalken} (Δ ${z2(balkenFehler)} Punkte) · „${hudSchwach.zielFress}“ (vorher „${hudAuswahl.zielFress}“)`,
    anteilHp <= 0.35 && balkenFehler < 2 && hudSchwach.zielFress !== hudAuswahl.zielFress,
    blA12);

  // B12 HP: erlittener Schaden und Heilung über die echte Taste 4
  const hpMin = min(kampf.map(p => p.hp));
  const hpMax = max(kampf.map(p => p.hp));
  const vorHeil = await jetzt();
  await taste('4');
  await fahre(0.3);
  const nachHeil = await jetzt();
  const hudHp = await hud();
  const blB12 = await beleg('b12-hp.png');
  const spBalken = parseFloat(String(hudHp.spBalken).replace('%', ''));
  const spFehler = Math.abs(spBalken - (nachHeil.hp / nachHeil.maxHp) * 100);
  const geheilt = nachHeil.hp - vorHeil.hp;
  const erlitten = hpMax - hpMin;

  urteil('B', 12,
    'HP sind ein geführter Wert: der Spieler verliert im Kampf HP, die Heilung („Straffen“, Taste 4) gibt HP zurück, und der HUD-Balken bildet den Stand auf < 2 Prozentpunkte genau ab.',
    `Erlittener Schaden ${erlitten} HP (${hpMax} → ${hpMin}) · Heilung +${geheilt} HP · HUD „${hudHp.spHpText}“, Balken ${hudHp.spBalken} (Δ ${z2(spFehler)} Punkte)`,
    erlitten >= 5 && geheilt >= 5 && spFehler < 2,
    blB12);
  console.log('ok');

  /* ======================================================================
   * Station 7 — Fressversuch am geschwächten Gegner (A13, A14, B9)
   * ==================================================================== */
  process.stdout.write('Station 7: Fressversuch, Umschlingen ... ');
  await seite.evaluate(() => window.SLIMORIA.api.setAutoAttack(false));
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.7, pitch: 0.30, dist: 8 }));
  await fahre(0.3);
  const vorFressen = await jetzt();

  await taste('e');                       // GDD 10 §18: E ist ausschliesslich Fressen
  await fahre(0.12, 1 / 240);
  const imAnlauf = await jetzt();
  const blA13 = await beleg('13-fressversuch.png');
  const versuchEreignis = letzterEreignis('fressversuch');

  urteil('A', 13,
    'Die Taste „E“ (echtes Tastaturereignis, laut GDD 10 §18 ausschließlich fürs Fressen reserviert) löst den Fressversuch aus: die Spielphase wechselt auf „fressen“, die Unterphase beginnt mit „anlauf“, und der Server-/Regelwürfel wird protokolliert.',
    `Phase „${imAnlauf.phase}“ / Fressphase „${imAnlauf.fressPhase}“ · Ereignis: Chance ${pz(versuchEreignis && versuchEreignis.chance)}, Ausgang ${versuchEreignis && versuchEreignis.erfolg ? 'Erfolg' : 'Fehlschlag'}`,
    imAnlauf.phase === 'fressen' && imAnlauf.fressPhase === 'anlauf' && !!versuchEreignis,
    blA13);
  urteil('B', 9,
    'Fressversuch als eigener Spielzustand: er ist an ein Ziel und eine berechnete Chance gebunden, sperrt die Steuerung für die Dauer der Animation und endet in genau einem der beiden Ausgänge.',
    `Ziel ${versuchEreignis && versuchEreignis.ziel} · Chance ${pz(versuchEreignis && versuchEreignis.chance)} · Phase „${imAnlauf.phase}“`,
    !!versuchEreignis && imAnlauf.phase === 'fressen',
    blA13);

  // A14: Umschlingen — steckt der Gegner in der Huelle?
  await fahreBis(`p.fressPhase === 'umschlingen'`, 1.5, 1 / 240);
  const umStart = proben.length - 1;
  await fahre(0.5, 1 / 240);
  const blA14 = await beleg('14-umschlingen.png');
  const um = proben.slice(umStart).filter(p => p.fressPhase === 'umschlingen');
  const zielFest = vorFressen.ziel;
  let tiefe = -Infinity, hoehenOk = false, abstandUm = NaN;
  for (const p of um) {
    const d = Math.hypot(p.cx - zielFest.x, p.cz - zielFest.z);
    const t = p.achsen.vorne - d;
    if (t > tiefe) { tiefe = t; abstandUm = d; }
    const zy = zielFest.y + zielFest.groesse * 0.75;
    if (zy < p.cy + p.achsen.oben && zy > p.cy - p.achsen.unten) hoehenOk = true;
  }

  urteil('A', 14,
    'Während der Unterphase „umschlingen“ liegt die Gegnerposition innerhalb der Schleimhülle: der Abstand der Mittelpunkte ist kleiner als die Hüllachse in Richtung des Gegners (metrics().achsen.vorne), und die Gegnerhöhe liegt zwischen achsen.unten und achsen.oben.',
    `${um.length} Proben in „umschlingen“ · geringster Abstand ${z2(abstandUm)} bei Hüllachse vorne ${z2(abstandUm + tiefe)} → Gegner ${z2(tiefe)} Einheiten innerhalb der Hülle · Höhenlage ${hoehenOk ? 'innerhalb' : 'außerhalb'}`,
    um.length >= 5 && tiefe > 0 && hoehenOk,
    blA14);
  console.log('ok');

  /* ======================================================================
   * Station 8 — Kampf zu Ende, Levelaufstieg aus eigener Kraft (A19, B13)
   * ==================================================================== */
  process.stdout.write('Station 8: Kampf beenden, Level aufsteigen ... ');
  await fahreBis(`p.phase === 'frei'`, 4);
  const ersterAusgang = letzterEreignis('fressversuch');
  await fahre(0.4);

  // Gegner erlegen (falls er den Fressversuch überstanden hat), dann den
  // zweiten Gegner — bis der erste Levelaufstieg aus Kampf-XP eintritt.
  const vorLevelXp = ereignisse.filter(e => e.art === 'xp').reduce((s, e) => s + e.betrag, 0);
  let st = await zustand();
  if (st.kreaturen.some(k => k.id === K1 && k.lebt)) {
    await seite.evaluate((id) => { window.SLIMORIA.api.selectTarget(id); window.SLIMORIA.api.setAutoAttack(true); }, K1);
    await fahreBis(`p.lebende < ${st.kreaturen.filter(k => k.lebt).length}`, 30);
  }
  await fahre(0.3);
  st = await zustand();
  const zweiter = st.kreaturen.find(k => k.lebt);
  if (zweiter && !ereignisse.some(e => e.art === 'levelUp')) {
    await seite.evaluate((id, x, zz) => {
      window.SLIMORIA.api.selectTarget(id);
      window.SLIMORIA.api.moveTo(x, zz);
      window.SLIMORIA.api.setAutoAttack(true);
    }, zweiter.id, zweiter.x, zweiter.z);
    await fahreBis(`G.ereignisse.some(e => e.art === 'levelUp')`, 45);
  }
  await fahre(0.6);
  const blA19 = await beleg('19-levelaufstieg.png');
  const hudLevel = await hud();
  const nachLevel = await jetzt();
  const stLevel = await zustand();
  const levelEreignis = ereignisse.find(e => e.art === 'levelUp');
  const xpQuellen = ereignisse.filter(e => e.art === 'xp' && (!levelEreignis || e.t <= levelEreignis.t));
  const xpSumme = xpQuellen.reduce((s, e) => s + e.betrag, 0);
  const erlegt = summeBest(stLevel, 'besiegt');
  const verspeist = summeBest(stLevel, 'gefressen');

  urteil('A', 19,
    'Der Levelaufstieg wird erkämpft, nicht geschenkt: bis hierher hat das Werkzeug kein grantXp aufgerufen (der Zeitraffer folgt erst danach), das Bestiarium zählt die dafür besiegten bzw. gefressenen Kreaturen, die protokollierten XP-Ereignisse übersteigen die Levelschwelle von 85, ein „levelUp“ ist protokolliert und das HUD zeigt das neue Level.',
    `Level ${nachLevel.level} nach ${xpSumme} XP aus ${xpQuellen.length} XP-Ereignissen (Schwelle 85) · Bestiarium: ${erlegt} besiegt, ${verspeist} gefressen · levelUp bei t=${z2((levelEreignis ? levelEreignis.t : 0) / 1000)} s · HUD Level „${hudLevel.spLevel}“, XP „${hudLevel.xpText}“`,
    !!levelEreignis && nachLevel.level >= 2 && (erlegt + verspeist) >= 1
      && xpSumme >= 85 && String(hudLevel.spLevel) === String(nachLevel.level),
    blA19);
  urteil('B', 13,
    'Level als geführter Fortschritt: XP sammeln sich, überschreiten die Schwelle, das Level steigt, MaxHP steigen mit, und die XP-Leiste im HUD zeigt den neuen Stand.',
    `Level ${nachLevel.level} · MaxHP ${nachLevel.maxHp} · XP-Leiste „${hudLevel.xpText}“ (${hudLevel.xpBalken})`,
    nachLevel.level >= 2 && nachLevel.maxHp > 80 && !!hudLevel.xpText,
    blA19);
  console.log('ok');

  /* ======================================================================
   * Station 9 — Wachstum durch Level (A20)
   * ==================================================================== */
  process.stdout.write('Station 9: Wachstum, Zeitraffer auf Level 9 ... ');
  const radiusVor = nachLevel.radius;
  // GDD 01 §25 verlangt fuer den garantierten Fressversuch massive
  // Ueberlegenheit (8 Level Abstand). Der Rest der Levelkurve wird hier per
  // api.grantXp im Zeitraffer genommen — das ist ausdruecklich als solches
  // ausgewiesen und traegt Punkt 19 nicht.
  const levelZiel = await seite.evaluate(() => window.__abn.aufLevel(9));
  await fahre(0.8);
  const blA20 = await beleg('20-wachstum.png');
  const nachWachstum = await jetzt();

  const radiusFormel = await seite.evaluate((l) => window.radiusFuerLevel(l), nachWachstum.level);
  console.log(`ok (Level ${levelZiel})`);

  /* ======================================================================
   * Station 10 — Drei erfolgreiche Fressvorgänge (A15/A17/A18, B10)
   * ==================================================================== */
  process.stdout.write('Station 10: Drei Kreaturen fressen ... ');
  await seite.evaluate(() => window.SLIMORIA.api.setAutoAttack(false));
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.7, pitch: 0.30, dist: 8 }));
  const erfolge = [];
  let blA16 = null, blA17 = null, blA18 = null;

  for (let i = 0; i < 3; i++) {
    const p0 = await jetzt();
    const winkelI = 0.9 + i * 2.1;
    const kx = +(p0.cx + Math.cos(winkelI) * 4.0).toFixed(2);
    const kz = +(p0.cz + Math.sin(winkelI) * 4.0).toFixed(2);
    const id = await seite.evaluate((x, zz) =>
      window.SLIMORIA.api.spawnCreature({ art: 'schleimling', level: 1, x, z: zz }), kx, kz);
    await seite.evaluate((i2) => window.SLIMORIA.api.selectTarget(i2), id);
    await fahre(0.4);
    const vor = await jetzt();
    const gefVor = summeBest(await zustand(), 'gefressen');

    await taste('e');
    await fahre(0.1, 1 / 240);
    const evVersuch = letzterEreignis('fressversuch');
    // Der Ort des Gegners zaehlt in dem Moment, in dem die Huelle sich um ihn
    // legt — Kreaturen laufen vorher noch auf den Schleim zu.
    const umschl = await fahreBis(`p.fressPhase === 'umschlingen'`, 2.0, 1 / 240);
    const beimUm = umschl.proben[umschl.proben.length - 1];
    const zielOrt = beimUm.ziel ? { x: beimUm.ziel.x, z: beimUm.ziel.z } : { x: vor.ziel.x, z: vor.ziel.z };

    await fahreBis(`p.fressPhase === 'absorbieren' || p.fressPhase === 'rueckschnapp'`, 2.5, 1 / 240);
    const nachAbsorb = await fahre(1.0, 1 / 240);
    if (i === 2) blA16 = await beleg('16-erfolg-fehlschlag.png');
    if (i === 0) blA17 = await beleg('17-veraenderung.png');
    const nach = await jetzt();
    const hudErfolg = await hud();
    const gefNach = summeBest(await zustand(), 'gefressen');
    const prallSpitze = max(nachAbsorb.map(p => p.squash));
    const landung = Math.hypot(nach.cx - zielOrt.x, nach.cz - zielOrt.z);
    // Ausschwingen lassen und den Ruhewert messen: "kurz praller" ist ein
    // Vergleich mit dem eigenen Ruhezustand, kein absoluter Wert.
    const ruhe = await fahre(1.8, 1 / 60);
    const ruheSquash = median(ruhe.slice(-40).map(p => p.squash));
    erfolge.push({
      chance: evVersuch ? evVersuch.chance : null,
      erfolg: gefNach > gefVor,
      xpVor: vor.xp, xpNach: nach.xp, level: nach.level,
      prallSpitze, ruheSquash, prall: prallSpitze / ruheSquash,
      landung, zielOrt, endPhase: nach.fressPhase, endAktiv: nach.fressAktiv,
      ruhePhase: ruhe[ruhe.length - 1].fressPhase,
      hinweise: hudErfolg.hinweise.slice(), schweber: hudErfolg.schweber.slice(),
      quest: hudErfolg.questFressen,
      lebendeVor: vor.lebende, lebendeNach: nach.lebende,
    });
  }
  blA18 = await beleg('18-mehrere-fressen.png');
  const stEnde = await zustand();
  const gefressen = summeBest(stEnde, 'gefressen');
  const hudMehr = await hud();
  const e0 = erfolge[0];

  urteil('A', 17,
    'Nach dem Erfolg ist die Veränderung messbar und sichtbar: XP steigen, der Körper ist kurz spürbar praller als in seiner eigenen Ruhelage (squash-Spitze ≥ 8 % über dem Ruhewert danach), der Schleim landet am Ort des Gegners (< 1.5 Einheiten), und das HUD meldet den Erfolg im Klartext.',
    `XP ${e0.xpVor} → ${e0.xpNach} · squash-Spitze ${z3(e0.prallSpitze)} gegen Ruhewert ${z3(e0.ruheSquash)} = ${pz(e0.prall - 1)} praller · Landung ${z2(e0.landung)} Einheiten vom Gegnerort · Fressphase danach „${e0.endPhase}“, nach dem Ausschwingen „${e0.ruhePhase}“ (aktiv: ${e0.endAktiv}) · HUD „${[...e0.hinweise, ...e0.schweber].join(' | ') || '—'}“ · Quest-Zähler ${e0.quest}`,
    e0.erfolg && e0.xpNach > e0.xpVor && e0.prall >= 1.08 && e0.landung < 1.5
      && [...e0.hinweise, ...e0.schweber].some(t => /gefressen/i.test(t)),
    blA17);

  urteil('A', 18,
    'Mehrere Kreaturen nacheinander fressen: ≥ 3 protokollierte Fresserfolge in einem Lauf, das Bestiarium zählt sie, der Quest-Zähler im HUD zeigt den Fortschritt, und die Welt hat entsprechend weniger lebende Kreaturen.',
    `${erfolge.filter(e => e.erfolg).length} von 3 Versuchen erfolgreich · Bestiarium „gefressen“ = ${gefressen} · HUD-Zähler ${hudMehr.questFressen}`,
    erfolge.filter(e => e.erfolg).length >= 3 && gefressen >= 3,
    blA18);

  urteil('B', 10,
    'Fresserfolg: die Kreatur verschwindet aus der Welt, XP fließen (Fressen gibt mehr als Töten), und der Erfolg wird eigens gemeldet.',
    `Chance ${pz(e0.chance)} (Level ${e0.level} gegen Level 1 → GDD 01 §25) · lebende Kreaturen ${e0.lebendeVor} → ${e0.lebendeNach} · XP +${e0.xpNach - e0.xpVor}`,
    e0.erfolg && e0.lebendeNach < e0.lebendeVor,
    blA17);
  console.log(`ok (${erfolge.filter(e => e.erfolg).length}/3)`);

  /* ======================================================================
   * Station 11 — Der Fehlschlag am übermächtigen Gegner (A15, A16, B11)
   * ==================================================================== */
  process.stdout.write('Station 11: Fressfehlschlag am uebermaechtigen Gegner ... ');
  const p0 = await jetzt();
  const bossX = +(p0.cx + 4.2).toFixed(2), bossZ = +(p0.cz + 0.6).toFixed(2);
  const boss = await seite.evaluate((x, zz) =>
    window.SLIMORIA.api.spawnCreature({ art: 'wolf', level: 15, x, z: zz }), bossX, bossZ);
  await seite.evaluate((id) => window.SLIMORIA.api.selectTarget(id), boss);
  await fahre(0.4);
  const vorFehl = await jetzt();
  const startOrt = { x: vorFehl.cx, z: vorFehl.cz };
  const tFehl = vorFehl.t * 1000;
  const hudVorFehl = await hud();

  await taste('e');
  await fahre(0.1, 1 / 240);
  // Die Anlaufstrecke ist der Massstab fuer den Rueckweg: der Gegner laeuft
  // vorher noch, deshalb wird sie im Moment der Umschlingung genommen.
  const umFehl = await fahreBis(`p.fressPhase === 'umschlingen'`, 2.0, 1 / 240);
  const beimUmFehl = umFehl.proben[umFehl.proben.length - 1];
  const anlaufStrecke = beimUmFehl.ziel
    ? Math.hypot(startOrt.x - beimUmFehl.ziel.x, startOrt.z - beimUmFehl.ziel.z)
    : Math.hypot(startOrt.x - bossX, startOrt.z - bossZ);
  await fahreBis(`p.fressPhase === 'rueckschnapp'`, 2.5, 1 / 240);
  const rueckLauf = await fahre(0.6, 1 / 240);
  const blA15 = await beleg('15-ausgang.png');
  const hudFehl = await hud();
  // "Landet ungefaehr an der Ausgangsposition" (GDD 01 §31) ist erst nach dem
  // Ausschwingen messbar — vorher fliegt der Koerper noch.
  await fahreBis(`p.phase === 'frei' && p.speed < 0.6`, 5, 1 / 60);
  const nachFehl = await jetzt();
  const bossJetzt = await seite.evaluate((id) => {
    const k = window.G.kreaturen.find(c => c.id === id);
    return k ? { x: k.x, z: k.z, lebt: k.lebt, hp: Math.round(k.hp), maxHp: k.maxHp } : null;
  }, boss);
  const zurueck = Math.hypot(nachFehl.cx - startOrt.x, nachFehl.cz - startOrt.z);
  const zumGegner = bossJetzt ? Math.hypot(nachFehl.cx - bossJetzt.x, nachFehl.cz - bossJetzt.z) : NaN;
  // Der Fehlschlagschaden ist eine Regelgroesse — genau dieser Betrag muss als
  // erlittener Schaden auftauchen (der Gegner schlaegt daneben auch zu).
  const sollSchaden = await seite.evaluate((l) => window.Regeln.fehlschlagSchaden(l, 15), vorFehl.level);
  const schadensEreignisse = ereignisseAb(tFehl).filter(e => e.art === 'spielerSchaden');
  const trefferFehl = schadensEreignisse.find(e => Math.round(e.betrag) === Math.round(sollSchaden));

  const alleVersuche = ereignisse.filter(e => e.art === 'fressversuch');
  const gelungen = alleVersuche.filter(e => e.erfolg);
  const gescheitert = alleVersuche.filter(e => !e.erfolg);

  urteil('A', 15,
    'Beide Ausgänge treten in einem Lauf auf und folgen der Regel, nicht dem Zufall: gegen einen Gegner 6 Level über dem Spieler ist die Chance 0 % (GDD 01 §23) und der Versuch scheitert; gegen einen Gegner 8 Level unter dem Spieler ist sie 100 % (§25) und er gelingt.',
    `${alleVersuche.length} Versuche gesamt · gelungen ${gelungen.length} (Chancen ${gelungen.map(e => pz(e.chance)).join(', ') || '—'}) · gescheitert ${gescheitert.length} (Chancen ${gescheitert.map(e => pz(e.chance)).join(', ') || '—'}) · Fehlschlag kostet ${Math.round(sollSchaden)} HP`,
    gelungen.length >= 1 && gescheitert.length >= 1
      && gescheitert.some(e => e.chance === 0) && gelungen.every(e => e.chance > 0),
    blA15);

  const rueckwegAnteil = zurueck / Math.max(anlaufStrecke, 1e-6);
  urteil('B', 11,
    'Fressfehlschlag: der Gegner widersteht und bleibt am Leben, die Unterphase „rueckschnapp“ wird durchlaufen, der Schleim kommt nach dem Ausschwingen den Rückweg zu mindestens zwei Dritteln zurück (Restabstand ≤ ⅓ der Anlaufstrecke, GDD 01 §31 „landet ungefähr an der Ausgangsposition“) und steht danach näher an der Ausgangsstelle als am Gegner, und der Fehlversuch kostet genau den Regelbetrag an HP.',
    `${rueckLauf.filter(p => p.fressPhase === 'rueckschnapp').length} Proben in „rueckschnapp“ · Anlaufstrecke ${z2(anlaufStrecke)} · Restabstand zur Ausgangsstelle ${z2(zurueck)} = ${pz(rueckwegAnteil)} der Anlaufstrecke, ${z2(zumGegner)} vom Gegner · Fressphase nach dem Ausschwingen „${nachFehl.fressPhase}“ (aktiv: ${nachFehl.fressAktiv}) · Regelschaden ${Math.round(sollSchaden)} HP ${trefferFehl ? 'als Ereignis belegt' : 'NICHT im Protokoll'} · Gegner lebt: ${bossJetzt && bossJetzt.lebt} (${bossJetzt && bossJetzt.hp}/${bossJetzt && bossJetzt.maxHp} HP)`,
    !!trefferFehl && !!(bossJetzt && bossJetzt.lebt) && rueckwegAnteil <= 0.34 && zurueck < zumGegner,
    blA15);

  // A16: der visuelle Unterschied zwischen Erfolg und Fehlschlag
  const bildErfolg = bildVon('16-erfolg-fehlschlag.png');
  const bildFehl = bildVon('15-ausgang.png');
  const unterschied = bildUnterschied(bildErfolg, bildFehl, 24);
  const textErfolg = [...erfolge[2].hinweise, ...erfolge[2].schweber].join(' | ');
  const textFehl = [...hudFehl.hinweise, ...hudFehl.schweber].join(' | ');
  const textKlar = /gefressen/i.test(textErfolg) && /(fehlgeschlagen|widerstanden)/i.test(textFehl);
  const bahnKlar = e0.landung < 1.5 && zurueck < zumGegner;

  urteil('A', 16,
    'Der Unterschied ist auf einen Blick zu sehen: die beiden Belegbilder unterscheiden sich in ≥ 8 % aller Bildpunkte, die Klartextmeldungen sind gegensätzlich, und die Bahn des Körpers ist gegensätzlich (Erfolg: landet auf dem Gegnerort; Fehlschlag: steht danach näher an der Ausgangsstelle als am Gegner).',
    `Bildunterschied ${pz(unterschied)} · Erfolg meldet „${textErfolg || '—'}“, Fehlschlag meldet „${textFehl || '—'}“ · Landung Erfolg ${z2(e0.landung)} vom Gegnerort gegen Fehlschlag ${z2(zurueck)} von der Ausgangsstelle bei ${z2(zumGegner)} vom Gegner`,
    unterschied >= 0.08 && textKlar && bahnKlar,
    blA16);
  console.log('ok');

  /* ======================================================================
   * Station 12 — Tod und Friedhof (A21, A22)
   * ==================================================================== */
  process.stdout.write('Station 12: Todesanimation und Respawn ... ');
  await seite.evaluate(() => window.SLIMORIA.api.setCamera({ yaw: 0.6, pitch: 0.22, dist: 7.5 }));
  // Erst muss die Fressanimation vollstaendig abgelaufen sein: sonst
  // ueberdeckt ihre Unterphase die Phasen der Todesanimation.
  await fahreBis(`p.phase === 'frei'`, 4);
  await fahre(0.3);
  const vorTod = await jetzt();
  const tTod = vorTod.t * 1000;
  const todStart = proben.length;
  // Der Tod kommt ueber den HP-Pfad: Schaden bis 0, nicht ueber einen
  // Sonderaufruf. Was danach passiert, macht die Lane DEATH von selbst.
  await seite.evaluate(() => window.SLIMORIA.api.damagePlayer(window.G.spieler.hp));
  await fahreBis(`p.todPhase === 'zerlaufen' && p.pfuetze > 0.5`, 4, 1 / 240);
  const blA21 = await beleg('21-todesanimation.png');
  await fahreBis(`p.phase === 'frei'`, 8, 1 / 240);
  const tod = proben.slice(todStart);

  const folge = [];
  for (const p of tod) {
    if (p.phase !== 'tot') continue;
    if (!folge.length || folge[folge.length - 1] !== p.todPhase) folge.push(p.todPhase);
  }
  const erwartet = ['zittern', 'platzen', 'zerlaufen', 'liegen'];
  const reihenfolgeOk = erwartet.every((n, i) => folge[i] === n);
  const pfuetzenProben = tod.filter(p => p.todPhase === 'liegen' || p.pfuetze > 0.9);
  const squashTief = min(tod.filter(p => p.phase === 'tot').map(p => p.squash));
  const flachVor = vorTod.bbox.w / vorTod.bbox.h;
  const flachNach = pfuetzenProben.length ? max(pfuetzenProben.map(p => p.bbox.w / p.bbox.h)) : NaN;
  const hoeheVor = vorTod.bbox.h;
  const hoeheNach = pfuetzenProben.length ? min(pfuetzenProben.map(p => p.bbox.h)) : NaN;
  const platzSpitze = max(tod.filter(p => p.todPhase === 'platzen' || p.todPhase === 'zittern').map(p => p.bbox.w));
  const evTod = ereignisseAb(tTod).find(e => e.art === 'tod');

  const breitVor = vorTod.bbox.w;
  const breitNach = pfuetzenProben.length ? max(pfuetzenProben.map(p => p.bbox.w)) : NaN;
  urteil('A', 21,
    'Die Todesanimation läuft in der vorgeschriebenen Folge zittern → platzen → zerlaufen → liegen ab (GDD 01 §50) und endet in einer Pfütze: die Hülle liegt am Ende mindestens dreimal so breit wie hoch da und ist dabei breiter und niedriger als im Leben — und sie bleibt messbar vorhanden, verschwindet also nicht (Blob-Identität, GDD 01 §5).',
    `Phasenfolge ${folge.join(' → ') || '—'} · Breite ${z2(breitVor)} → ${z2(breitNach)} · Höhe ${z2(hoeheVor)} → ${z2(hoeheNach)} (${pz(hoeheNach / hoeheVor)}) · Breite/Höhe ${z2(flachVor)} → ${z2(flachNach)} = Faktor ${z2(flachNach / flachVor)} · squash min ${z3(squashTief)} · größte Breite beim Platzen ${z2(platzSpitze)} · ausgelöst über HP = 0 (Ereignis „${evTod ? 'tod' : 'fehlt'}“)`,
    !!evTod && reihenfolgeOk && flachNach >= 3 && flachNach > flachVor
      && breitNach > breitVor && hoeheNach < hoeheVor && hoeheNach > 0.05,
    blA21);

  const evResp = ereignisseAb(tTod).find(e => e.art === 'respawn');
  await fahre(0.6);
  const nachResp = await jetzt();
  const blA22 = await beleg('22-friedhof.png');
  const hudResp = await hud();
  const amFriedhof = Math.hypot(nachResp.cx - INFO.friedhof.x, nachResp.cz - INFO.friedhof.z);
  const hpAnteilResp = nachResp.hp / nachResp.maxHp;

  urteil('A', 22,
    'Nach der Todesanimation wird der Charakter am Friedhof wieder aufgebaut: Schwerpunkt < 2.5 Einheiten von WELT.friedhof, Phase wieder „frei“, HP auf rund 50 % gesetzt, und das HUD meldet es.',
    `Friedhof (${INFO.friedhof.x}, ${INFO.friedhof.z}) · Schleim bei (${z2(nachResp.cx)}, ${z2(nachResp.cz)}) = ${z2(amFriedhof)} entfernt · Phase „${nachResp.phase}“ · HP ${nachResp.hp}/${nachResp.maxHp} = ${pz(hpAnteilResp)} · HUD „${hudResp.hinweise.join(' | ') || '—'}“`,
    !!evResp && amFriedhof < 2.5 && nachResp.phase === 'frei'
      && hpAnteilResp > 0.4 && hpAnteilResp < 0.6,
    blA22);
  console.log('ok');

  /* ======================================================================
   * Nachbereitung — Punkte über den ganzen Lauf (A2, B4, B5)
   * ==================================================================== */
  const kamNachher = await kamera();
  const folgt = Math.hypot(kStart.eye[0] - kStart.ziel[0], kStart.eye[2] - kStart.ziel[2]) > 3;
  urteil('A', 2,
    'Third-Person-Sicht: die Kamera steht ≥ 5 Einheiten hinter und über dem Schleim, blickt auf ihn, die ganze Silhouette liegt im Bild und nimmt zwischen 0.3 % und 25 % der Bildfläche ein — und sie folgt ihm über den gesamten Lauf (follow = true), statt starr zu stehen.',
    `Kameraabstand ${z2(kStart.abstand)} Einheiten, ${z2(kStart.ueber)} darüber · Hülle ${pz(hStart.flaeche)} der Bildfläche, ganz im Bild: ${hStart.ganzDrin} · Mittenabstand ${pz(zentrumAbw)} · follow ${kStart.follow} und am Laufende noch ${kamNachher.follow}`,
    kStart.abstand >= 5 && kStart.ueber > 0 && hStart.ganzDrin
      && hStart.flaeche > 0.003 && hStart.flaeche < 0.25 && kStart.follow && folgt,
    bl01);

  /* B4: fluessige Bewegung. Gemessen an den beiden reinen Laufstrecken
   * (Anrollen bis Stillstand, dann die Kehrtwende) — dort und nur dort geht
   * es um Fortbewegung. Waehrend Fressen, Biss und Tod greifen die Lanes
   * absichtlich hart in den Koerper ein, das ist keine Fortbewegung. */
  const bewegt = [...lauf, ...wende];
  let maxOrt = 0, maxTempo = 0;
  for (let i = 1; i < bewegt.length; i++) {
    const dt = bewegt[i].t - bewegt[i - 1].t;
    if (dt <= 0 || dt > 0.05) continue;
    const dOrt = Math.hypot(bewegt[i].cx - bewegt[i - 1].cx, bewegt[i].cz - bewegt[i - 1].cz) / dt;
    const dV = Math.abs(bewegt[i].speed - bewegt[i - 1].speed) / dt;
    if (dOrt > maxOrt) maxOrt = dOrt;
    if (dV > maxTempo) maxTempo = dV;
  }
  const volMin = min(bewegt.map(p => p.volumen));
  const volMax = max(bewegt.map(p => p.volumen));
  const volMitte = median(bewegt.map(p => p.volumen));
  const volAbw = Math.max(volMax / volMitte - 1, 1 - volMin / volMitte);
  const hoeheMin = min(bewegt.map(p => p.bbox.h / p.radius));
  const grenzeTempo = 3 * 45;
  urteil('B', 4,
    'Flüssige Schleimbewegung: auf den beiden Laufstrecken springt der Schwerpunkt nie schneller als 1.5·maxSpeed und die Geschwindigkeit nie stärker als 3·maxAccel pro Sekunde (es werden Kräfte ausgeübt, keine Positionen gesetzt); die Masse bleibt dabei erhalten (Volumen weicht um < 25 % vom eigenen Median ab) und der Körper wird nie flach (Höhe > 0.6·Radius, GDD 01 §5).',
    `größte Ortsrate ${z2(maxOrt)} (Grenze ${z2(1.5 * INFO.maxSpeed)}) · größte Temporate ${z2(maxTempo)} (Grenze ${grenzeTempo}) · Volumen ${z3(volMin)} … ${z3(volMax)} um Median ${z3(volMitte)} = ${pz(volAbw)} Abweichung · geringste Höhe ${z2(hoeheMin)}·Radius · ${bewegt.length} Proben`,
    maxOrt < 1.5 * INFO.maxSpeed && maxTempo < grenzeTempo && volAbw < 0.25 && hoeheMin > 0.6,
    bl01);

  /* A20 erst hier: "ausschliesslich wegen des Levels" laesst sich nur ueber
   * den GANZEN Lauf pruefen — die drei Fressvorgaenge kommen erst nach dem
   * Wachstum, und genau die duerfen den Radius nicht angefasst haben. */
  const levelZeiten = ereignisse.filter(e => e.art === 'levelUp').map(e => e.t);
  let fremdeAenderung = null;
  let radiusStufen = 0;
  for (let i = 1; i < proben.length; i++) {
    if (proben[i].radius === proben[i - 1].radius) continue;
    radiusStufen++;
    const t = proben[i].t * 1000;
    if (!levelZeiten.some(lt => Math.abs(lt - t) < 150)) {
      fremdeAenderung = { t: proben[i].t, von: proben[i - 1].radius, auf: proben[i].radius };
    }
  }
  const stSchluss = await zustand();
  urteil('A', 20,
    'metrics().radius nach dem Levelaufstieg ist größer als davor — und ausschließlich wegen des Levels: der Radius entspricht exakt radiusFuerLevel(level), und über den ganzen Lauf ändert er sich in keiner einzigen Probe an einer Stelle, an der kein Levelaufstieg protokolliert ist. Insbesondere lassen ihn die Fressvorgänge unverändert (Fressen macht nur kurz prall, GDD 01 §29/§45).',
    `Radius ${z3(radiusVor)} (Level ${nachLevel.level}) → ${z3(nachWachstum.radius)} (Level ${nachWachstum.level}) = +${pz(nachWachstum.radius / radiusVor - 1)} · Formelwert radiusFuerLevel(${nachWachstum.level}) = ${z3(radiusFormel)} · ${radiusStufen} Radiusänderungen im Lauf, alle an einem der ${levelZeiten.length} Levelaufstiege · levelfremde Änderung: ${fremdeAenderung ? `bei t=${z2(fremdeAenderung.t)} s von ${z3(fremdeAenderung.von)} auf ${z3(fremdeAenderung.auf)}` : 'keine'} · ${summeBest(stSchluss, 'gefressen')} Fressvorgänge im Lauf ohne Radiuswirkung`,
    nachWachstum.radius > radiusVor && Math.abs(nachWachstum.radius - radiusFormel) < 0.01
      && !fremdeAenderung && radiusStufen >= 1,
    blA20);

  const streckAlle = proben.map(p => p.streckung);
  const squashAlle = proben.map(p => p.squash);
  const streckSpanne = max(streckAlle) / min(streckAlle) - 1;
  const squashSpanne = max(squashAlle) - min(squashAlle);
  urteil('B', 5,
    'Dynamische Verformung: über den Lauf ändert sich die Streckung um ≥ 20 % und squash um ≥ 0.15 — und zwar in mehreren Anlässen (Tempo, Biss, Fressen, Tod), nicht nur einmal.',
    `Streckung ${z3(min(streckAlle))} … ${z3(max(streckAlle))} = ${pz(streckSpanne)} · squash ${z3(min(squashAlle))} … ${z3(max(squashAlle))} = ${z3(squashSpanne)} · Stand-squash ${z3(standSquash)}`,
    streckSpanne >= 0.2 && squashSpanne >= 0.15,
    blA14);

} catch (e) {
  abbruch = e && e.stack ? e.stack : String(e);
  console.log('\nLAUF ABGEBROCHEN: ' + (e && e.message ? e.message : e));
} finally {
  try { if (browser) await browser.close(); } catch { /* egal */ }
  server.close();
}

/* --------------------------------------------------------------------------
 * Die drei Netzpunkte kommen aus einem anderen Werkzeug.
 * ------------------------------------------------------------------------ */

let zwei = null;
let zweiFehler = null;
if (fs.existsSync(ZWEISPIELER)) {
  try { zwei = JSON.parse(fs.readFileSync(ZWEISPIELER, 'utf8')); }
  catch (e) { zweiFehler = 'nicht lesbar: ' + e.message; }
}

/* Erstes Bild, das irgendwo in den Belegen eines Nachweises steckt. */
function bildAus(obj) {
  let gefunden = null;
  const suche = (v) => {
    if (gefunden || v === null || v === undefined) return;
    if (typeof v === 'string') { if (/\.png$/i.test(v)) gefunden = v.replace(/\\/g, '/'); return; }
    if (typeof v === 'object') for (const k of Object.keys(v)) suche(v[k]);
  };
  suche(obj);
  return gefunden;
}

/* Zwei Schemata werden gelesen: die Pruefungsliste, die tools/zweispieler.mjs
 * erzeugt, und ersatzweise die einfache Form mit benannten Schluesseln. */
function netzNachweis(schluessel, nummern) {
  if (!zwei) return { erfuellt: 'offen', gemessen: zweiFehler || 'gauntlet/zweispieler.json fehlt — kein Nachweis vorhanden.', beleg: null };
  if (Array.isArray(zwei.pruefungen)) {
    const teile = nummern.map(n => zwei.pruefungen.find(p => p.nr === n)).filter(Boolean);
    if (!teile.length) {
      return { erfuellt: 'offen', gemessen: `gauntlet/zweispieler.json enthält keine Prüfung ${nummern.join('/')}.`, beleg: null };
    }
    const alleBestanden = teile.every(t => t.bestanden === true);
    const text = teile.map(t => `Prüfung ${t.nr} „${t.titel}“: ${t.bestanden ? 'bestanden' : 'NICHT bestanden'}`).join(' · ');
    return {
      erfuellt: alleBestanden,
      gemessen: `${text} (Quelle: ${zwei.werkzeug || 'gauntlet/zweispieler.json'})`,
      beleg: bildAus(teile.map(t => t.belege)),
    };
  }
  const e = zwei[schluessel];
  if (!e) return { erfuellt: 'offen', gemessen: `gauntlet/zweispieler.json enthält keinen Eintrag „${schluessel}“.`, beleg: null };
  return {
    erfuellt: e.erfuellt === true ? true : (e.erfuellt === false ? false : 'offen'),
    gemessen: String(e.gemessen ?? JSON.stringify(e)),
    beleg: e.beleg ?? null,
  };
}

const netzPunkte = [
  [15, 'zweiSpieler', [1, 2],
   'Zwei Clients sind gleichzeitig mit demselben Server verbunden und sehen einander: beide Sitzungen führen beide Spieler, und die Bewegung des einen kommt beim anderen an. Nachgewiesen von tools/zweispieler.mjs, nicht von diesem Werkzeug.'],
  [16, 'serverautoritaet', [3],
   'Der Server entscheidet den Fressversuch, nicht der Client: ein Client, der einen Erfolg behauptet, wird vom Serverergebnis überstimmt (GDD 11 §34–35). Nachgewiesen von tools/zweispieler.mjs.'],
  [17, 'persistenz', [4],
   'Der Charakter überlebt die Verbindung: nach Trennung bzw. Serverneustart sind Level, XP und HP unverändert. Nachgewiesen von tools/zweispieler.mjs.'],
];
for (const [nr, schluessel, nummern, kriterium] of netzPunkte) {
  const r = netzNachweis(schluessel, nummern);
  urteil('B', nr, kriterium, r.gemessen, r.erfuellt, r.beleg);
}

/* --------------------------------------------------------------------------
 * Bericht schreiben
 * ------------------------------------------------------------------------ */

function zeilen(liste, def) {
  return def.map(([nr, kurz, punkt]) => {
    const e = ERG[liste].get(nr) || {
      kriterium: '—',
      gemessen: abbruch ? 'nicht erreicht — der Lauf wurde vorher abgebrochen' : 'nicht geprüft',
      erfuellt: false, beleg: null,
    };
    return { liste, nr, kurz, punkt, ...e };
  });
}

const A = zeilen('A', LISTE_A);
const B = zeilen('B', LISTE_B);
const alle = [...A, ...B];
const offen = alle.filter(r => r.erfuellt !== true);
const gescheiterte = alle.filter(r => r.erfuellt === false);
const offeneNetz = alle.filter(r => r.erfuellt === 'offen');

const ergebnis = {
  erzeugt: new Date().toISOString(),
  seed: SEED,
  aufloesung: `${W}x${H}`,
  quelleNetz: fs.existsSync(ZWEISPIELER) ? 'gauntlet/zweispieler.json' : null,
  seitenfehler: seitenfehler.slice(0, 20),
  abbruch,
  zusammenfassung: {
    gesamt: alle.length,
    erfuellt: alle.length - offen.length,
    nichtErfuellt: gescheiterte.length,
    offen: offeneNetz.length,
    listeA: `${A.filter(r => r.erfuellt === true).length}/${A.length}`,
    listeB: `${B.filter(r => r.erfuellt === true).length}/${B.length}`,
  },
  listeA: A,
  listeB: B,
};
fs.writeFileSync(path.join(ROOT, 'gauntlet', 'abnahme.json'), JSON.stringify(ergebnis, null, 1));

const esc = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const zeichen = (v) => (v === true ? 'ja' : v === 'offen' ? '**offen**' : '**NEIN**');
const belegZelle = (b) => (b ? `[Bild](${b.replace(/^gauntlet\//, '')})` : '—');

function tabelle(rows) {
  const out = ['| Nr | Punkt | Kriterium | gemessen | erfüllt | Beleg |',
               '|---:|---|---|---|:---:|---|'];
  for (const r of rows) {
    out.push(`| ${r.nr} | ${esc(r.punkt)} | ${esc(r.kriterium)} | ${esc(r.gemessen)} | ${zeichen(r.erfuellt)} | ${belegZelle(r.beleg)} |`);
  }
  return out.join('\n');
}

const md = [
  '# Abnahme — automatisch nachgewiesen',
  '',
  `Erzeugt: ${ergebnis.erzeugt} · Seed ${SEED} · Auflösung ${W}×${H} · erzeugt von \`tools/abnahme.mjs\``,
  '',
  'Ein einziger zusammenhängender Spieldurchlauf im kopflosen Chrome, feste Simulationsschritte von 1/240 s.',
  'Jede Zeile nennt ein maschinell geprüftes Kriterium, den dabei gemessenen Wert und ein Belegbild aus genau diesem Lauf.',
  '',
  `**Ergebnis: ${ergebnis.zusammenfassung.erfuellt} von ${alle.length} Punkten erfüllt** ` +
  `(Liste A ${ergebnis.zusammenfassung.listeA}, Liste B ${ergebnis.zusammenfassung.listeB}) · ` +
  `${gescheiterte.length} nicht erfüllt · ${offeneNetz.length} offen.`,
  '',
  abbruch ? `> **Der Lauf wurde abgebrochen.** Alle danach liegenden Punkte gelten als nicht erfüllt.\n>\n> \`${String(abbruch).split('\n')[0]}\`\n` : '',
  seitenfehler.length ? `> **Seitenfehler während des Laufs:** ${seitenfehler.slice(0, 5).map(f => '`' + f + '`').join(' · ')}\n` : '',
  '## A — GDD 01 §70 (die 22 Punkte)',
  '',
  tabelle(A),
  '',
  '## B — GDD 11 §121 (technische Basis)',
  '',
  tabelle(B),
  '',
  '## Arbeitsliste — was noch fehlt',
  '',
  offen.length
    ? offen.map(r => `* **${r.erfuellt === 'offen' ? 'offen' : 'nicht erfüllt'}** — ${r.liste}${r.nr} ${r.punkt}: ${esc(r.gemessen)}`).join('\n')
    : 'Nichts. Alle Punkte sind belegt.',
  '',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'gauntlet', 'ABNAHME.md'), md);

console.log('');
console.log(`Liste A: ${ergebnis.zusammenfassung.listeA} · Liste B: ${ergebnis.zusammenfassung.listeB}`);
for (const r of offen) {
  console.log(`  ${r.erfuellt === 'offen' ? 'offen         ' : 'nicht erfuellt'} ${r.liste}${r.nr} ${r.punkt}`);
}
console.log('');
console.log('geschrieben: gauntlet/abnahme.json, gauntlet/ABNAHME.md, gauntlet/abnahme/*.png');

process.exit(offen.length === 0 ? 0 : 1);
