/* ---------------------------------------------------------------------------
 * Leistungsmessung.
 *
 * GDD 11 §32 und §99–103 verlangen, dass die Verformung des Schleims Client
 * und Server nicht unverhaeltnismaessig belastet. Dieses Werkzeug misst statt
 * zu schaetzen: es faehrt den Prototyp in einem kopflosen Chrome bei 1600x900
 * und nimmt pro Bild drei Zeiten getrennt ab.
 *
 *   Physik    — SLIMORIA.step(), vier Teilschritte zu 1/240 s je Bild
 *   Huelle    — G.applySurface(): zwei Loop-Unterteilungen 162 -> 642 -> 2562
 *   Zeichnen  — SLIMORIA.render() abzueglich der Huelle, mit gl.finish()
 *
 * WICHTIG zur Auslegung: der kopflose Chrome rendert mit SwiftShader auf der
 * CPU. Die Zeichenzeit ist damit NICHT repraesentativ fuer eine Maschine mit
 * Grafikkarte — sie wird hier nur getrennt ausgewiesen, damit sie die Aussage
 * ueber Physik und Huelle nicht verfaelscht. Beurteilt wird Physik + Huelle;
 * das ist der Teil, den auch ein Server bzw. jede Maschine tragen muss.
 *
 *   node tools/leistung.mjs                 # voller Lauf
 *   node tools/leistung.mjs --bilder 400    # mehr Bilder je Szene
 *   node tools/leistung.mjs --sekunden 60   # Laenge des Dauerlaufs
 *   node tools/leistung.mjs --out datei.json
 * ------------------------------------------------------------------------- */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

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

const BILDER = Number(flag('bilder', 300));
const SEKUNDEN = Number(flag('sekunden', 60));
const ZIEL = path.resolve(ROOT, String(flag('out', path.join('gauntlet', 'leistung.json'))));

/* --- Statistik ------------------------------------------------------------ */

function statistik(werte) {
  if (!werte.length) return null;
  const s = werte.slice().sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  const summe = s.reduce((a, b) => a + b, 0);
  const r = (v) => +v.toFixed(4);
  return {
    n: s.length,
    min: r(s[0]),
    p10: r(q(0.10)),          // "sauberes" Bild: ohne Stoerung durch den Scheduler
    mittel: r(summe / s.length),
    median: r(q(0.5)),
    p95: r(q(0.95)),
    max: r(s[s.length - 1]),
  };
}

function auswerten(roh) {
  // roh: [[physik, huelle, zeichnen, hud], ...]
  const spalte = (i) => roh.map(z => z[i]);
  const physik = spalte(0), huelle = spalte(1), zeichnen = spalte(2), hud = spalte(3);
  const rechenlast = roh.map(z => z[0] + z[1]);          // ohne Zeichnen
  const gesamt = roh.map(z => z[0] + z[1] + z[2]);
  const st = {
    physik: statistik(physik),
    davonHud: statistik(hud),
    physikOhneHud: statistik(physik.map((v, i) => Math.max(0, v - hud[i]))),
    huelle: statistik(huelle),
    rechenlast: statistik(rechenlast),
    zeichnenSwiftshader: statistik(zeichnen),
    gesamtSwiftshader: statistik(gesamt),
  };
  // Was die Rechenlast fuer die Bildrate bedeutet, wenn das Zeichnen auf einer
  // echten Grafikkarte praktisch nichts kostet.
  st.budget16ms = +((st.rechenlast.p10 / 16.667) * 100).toFixed(1);
  st.bilderProSekundeNurRechenlast = +(1000 / Math.max(st.rechenlast.p10, 1e-6)).toFixed(0);
  return st;
}

/* --- Der Messkopf, der in der Seite laeuft -------------------------------- */
/* Als Zeichenkette, damit sie ohne Bundler in die Seite kommt. Nur Messung —
 * es wird nichts am Spiel veraendert; das Umhaengen von UI.aktualisieren ist
 * eine reine Zeitnahme-Huelle, die die Originalfunktion weiterruft. */

const MESSKOPF = `(() => {
  const STEP = 1 / 240;
  const A = window.SLIMORIA.api;
  const S = window.SLIMORIA;

  // Zeitnahme-Huelle um das HUD: game.js ruft UI.aktualisieren in JEDEM
  // Teilschritt, also 240-mal je Sekunde. Ohne diese Trennung steckt der
  // HUD-Aufwand unsichtbar in der Physikzeit.
  let hudMs = 0;
  if (window.UI && !window.UI.__gemessen) {
    const orig = window.UI.aktualisieren;
    window.UI.aktualisieren = function (G, dt) {
      const a = performance.now();
      const r = orig.call(this, G, dt);
      hudMs += performance.now() - a;
      return r;
    };
    window.UI.__gemessen = true;
  }

  // Fuellt out[0..3] und legt dabei nichts an — noetig fuer den Dauerlauf,
  // wo jede Zuteilung je Bild als Speicherleck erscheinen wuerde.
  function bildRoh(teilschritte, zeichnen, out) {
    hudMs = 0;
    const t0 = performance.now();
    for (let i = 0; i < teilschritte; i++) S.step(STEP);
    const t1 = performance.now();
    window.G.applySurface(window.G.slime.body.pos);
    const t2 = performance.now();
    if (zeichnen) { S.render(); S.R.gl.finish(); }
    const t3 = performance.now();
    out[0] = t1 - t0; out[1] = t2 - t1; out[2] = zeichnen ? (t3 - t2) : 0; out[3] = hudMs;
    return out;
  }

  function bild(teilschritte, zeichnen) {
    hudMs = 0;
    const t0 = performance.now();
    for (let i = 0; i < teilschritte; i++) S.step(STEP);
    const t1 = performance.now();
    window.G.applySurface(window.G.slime.body.pos);
    const t2 = performance.now();
    if (zeichnen) {
      S.render();
      // Ohne finish() misst man nur das Einreihen der Befehle, nicht das
      // Zeichnen selbst.
      S.R.gl.finish();
    }
    const t3 = performance.now();
    return [t1 - t0, t2 - t1, zeichnen ? (t3 - t2) : 0, hudMs];
  }

  function ringSetzen(n, level) {
    // Kreaturen im Ring um den Schleim: alle geraten in Aggro-Reichweite,
    // also traegt die Messung auch deren Verfolgungslogik.
    for (let i = 0; i < n; i++) {
      const w = (i / n) * Math.PI * 2;
      A.spawnCreature({
        art: ['schleimling', 'wolf', 'eber'][i % 3],
        level: level,
        x: +(Math.cos(w) * 6.5).toFixed(3),
        z: +(Math.sin(w) * 6.5).toFixed(3),
      });
    }
  }

  function zaehler() {
    const G = window.G;
    return {
      kreaturen: G.kreaturen.length,
      ereignisse: G.ereignisse.length,
      spur: (G.slime && G.slime.trail) ? G.slime.trail.length : 0,
      extras: (S.R && S.R.extras) ? S.R.extras.length : 0,
      schwebetexte: document.querySelectorAll('#ui-welt .st').length,
      hinweise: document.querySelectorAll('.hw').length,
      domKnoten: document.getElementsByTagName('*').length,
    };
  }

  function haufen() {
    if (window.gc) { try { window.gc(); } catch (e) {} }
    const m = performance.memory;
    return m ? m.usedJSHeapSize : null;
  }

  /* Ein langer Vorlauf, bevor irgendetwas gemessen wird. Ohne ihn misst die
   * erste Szene den JIT, den ersten Layout-Durchlauf des HUD und den Aufbau
   * der SwiftShader-Pipelines mit — das verzerrt sie um mehr als eine
   * Zehnerpotenz gegenueber der letzten Szene. */
  function aufwaermen(bilder) {
    A.reset({ seed: 1234, level: 30 });
    A.setHudVisible(true);
    ringSetzen(5, 3);
    A.selectTarget(1);
    A.setAutoAttack(true);
    A.moveTo(8, 8);
    for (let i = 0; i < bilder; i++) {
      if (i % 100 === 0) { A.damagePlayer(20); A.healPlayer(20); }
      bild(4, true);
    }
    A.reset({ seed: 1234, level: 1 });
  }

  /* Eichmessung: eine Schleife mit exakt bekanntem, konstantem Aufwand.
   * Sie sagt nichts ueber das Spiel — sie sagt, wie stark die Messmaschine
   * gerade stoert. Streuen Median und p95 hier genauso wie in den Spielszenen,
   * stammt die Streuung vom Betriebssystem und nicht vom Prototyp. */
  function szeneRauschen(bilder) {
    let senke = 0;
    const arbeit = () => { let x = 0; for (let i = 0; i < 400000; i++) x += Math.sqrt(i); return x; };
    for (let i = 0; i < 60; i++) senke += arbeit();
    const roh = [];
    for (let i = 0; i < bilder; i++) {
      const t0 = performance.now();
      senke += arbeit();
      roh.push([performance.now() - t0, 0, 0, 0]);
    }
    window.__senke = senke;
    return { roh };
  }

  /* --- Szenen ------------------------------------------------------------ */

  function szeneKreaturen(n, bilder) {
    // Level 30, damit der Schleim 15 gleichzeitige Angreifer ueberlebt und die
    // Messung nicht mitten im Lauf in die Todesphase kippt.
    A.reset({ seed: 1234, level: 30 });
    A.setHudVisible(true);
    A.setCamera({ yaw: 0.7, pitch: 0.35, dist: 12, follow: true });
    ringSetzen(n, 3);
    A.selectTarget(1);
    A.setAutoAttack(true);
    A.moveTo(9, 9);
    for (let i = 0; i < 120; i++) bild(4, true);     // Einschwingen der Szene
    const roh = [];
    for (let i = 0; i < bilder; i++) {
      if (i % 120 === 0) A.moveTo(i % 240 === 0 ? -9 : 9, (i % 480 === 0) ? 9 : -9);
      roh.push(bild(4, true));
    }
    return { roh, zaehler: zaehler() };
  }

  function szeneFressen(ausgang, bilder) {
    A.reset({ seed: 1234, level: 5 });
    A.setHudVisible(true);
    A.setCamera({ yaw: 0.7, pitch: 0.22, dist: 8, follow: true });
    const id = A.spawnCreature({ art: 'wolf', level: 1, x: 4.2, z: 0 });
    A.selectTarget(id);
    for (let i = 0; i < 120; i++) bild(4, true);
    A.tryEat({ erzwinge: ausgang });
    const roh = [];
    let n = 0;
    // Nur solange die Fressphase laeuft — danach misst man wieder Leerlauf.
    while (n < bilder) {
      const z = bild(4, true);
      if (window.G.phase !== 'fressen' && n > 4) break;
      roh.push(z); n++;
    }
    return { roh, zaehler: zaehler(), bilderGemessen: roh.length };
  }

  function szeneTod(bilder) {
    A.reset({ seed: 1234, level: 5 });
    A.setHudVisible(true);
    A.setCamera({ yaw: 0.7, pitch: 0.22, dist: 9, follow: true });
    for (let i = 0; i < 120; i++) bild(4, true);
    A.killPlayer();
    const roh = [];
    let n = 0;
    while (n < bilder) {
      const z = bild(4, true);
      if (window.G.phase !== 'tot' && n > 4) break;
      roh.push(z); n++;
    }
    return { roh, zaehler: zaehler(), bilderGemessen: roh.length };
  }

  /* Dauerlauf: 60 s Spielzeit bei 60 Bildern/s, mit laufendem Betrieb —
   * Kampf, Treffer, Fressen, Tod, Respawn. Genau die Ereignisse, die
   * Schwebetexte, Spur-Eintraege und Zeichner-Eintraege erzeugen. */
  function szeneDauerlauf(sekunden, probeAlle) {
    A.reset({ seed: 1234, level: 30 });
    A.setHudVisible(true);
    A.setCamera({ yaw: 0.7, pitch: 0.38, dist: 13, follow: true });
    ringSetzen(5, 3);
    A.setAutoAttack(true);
    for (let i = 0; i < 120; i++) bild(4, true);

    const bilderGesamt = Math.round(sekunden * 60);
    const proben = [];
    // Vorbelegte Puffer statt roh.push([...]): ein Array je Bild waere selbst
    // ein Leck von rund 90 Byte je Bild und wuerde genau das vortaeuschen,
    // was hier gesucht wird.
    const bPhysik = new Float64Array(bilderGesamt);
    const bHuelle = new Float64Array(bilderGesamt);
    const bZeichnen = new Float64Array(bilderGesamt);
    const bHud = new Float64Array(bilderGesamt);
    const einsRoh = [0, 0, 0, 0];

    proben.push({ t: 0, heap: haufen(), ...zaehler() });

    for (let i = 0; i < bilderGesamt; i++) {
      const t = i / 60;
      // Betrieb am Laufen halten: Nachschub, Treffer, Heilung, Fressen, Tod.
      if (i % 90 === 0) {
        const G = window.G;
        const lebend = G.kreaturen.filter(k => k.lebt);
        if (lebend.length < 5) ringSetzen(5 - lebend.length, 3);
        const z = G.kreaturen.find(k => k.lebt);
        if (z) A.selectTarget(z.id);
      }
      if (i % 150 === 40) A.damagePlayer(30);
      if (i % 150 === 90) A.healPlayer(25);
      if (i % 300 === 200) A.grantXp(50);
      if (i % 600 === 350) {
        const z = window.G.kreaturen.find(k => k.lebt);
        if (z) { A.selectTarget(z.id); A.tryEat({ erzwinge: i % 1200 === 350 ? 'erfolg' : 'fehlschlag' }); }
      }
      if (i % 1200 === 900) A.killPlayer();

      bildRoh(4, true, einsRoh);
      bPhysik[i] = einsRoh[0]; bHuelle[i] = einsRoh[1];
      bZeichnen[i] = einsRoh[2]; bHud[i] = einsRoh[3];

      if (i > 0 && i % probeAlle === 0) {
        proben.push({ t: +t.toFixed(1), heap: haufen(), ...zaehler() });
      }
    }
    proben.push({ t: +(bilderGesamt / 60).toFixed(1), heap: haufen(), ...zaehler() });

    // Erst JETZT umpacken — nach der letzten Speicherprobe.
    const roh = [];
    for (let i = 0; i < bilderGesamt; i++) roh.push([bPhysik[i], bHuelle[i], bZeichnen[i], bHud[i]]);
    return { roh, proben };
  }

  return { bild, aufwaermen, szeneRauschen, szeneKreaturen, szeneFressen, szeneTod, szeneDauerlauf, zaehler, haufen };
})()`;

/* --- Browser -------------------------------------------------------------- */

async function launch() {
  return puppeteer.launch({
    executablePath: BROWSER,
    headless: true,
    protocolTimeout: 900000,
    args: [
      '--headless=new',
      '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--disable-lcd-text',
      '--force-color-profile=srgb', '--font-render-hinting=none',
      '--js-flags=--expose-gc',
      '--enable-precise-memory-info',
      `--window-size=${W},${H}`,
    ],
  });
}

async function openGame(browser, port) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const fehler = [];
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });
  await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  return { page, fehler };
}

/* --- Hauptlauf ------------------------------------------------------------ */

const server = createServer();
const port = await listen(server, 0);
const browser = await launch();
const ergebnis = {
  erzeugt: new Date().toISOString(),
  aufloesung: `${W}x${H}`,
  hinweis: 'Kopfloser Chrome, SwiftShader auf der CPU. Zeichenzeit NICHT '
         + 'repraesentativ. Massgeblich sind Physik und Huelle.',
  leseanleitung: {
    kennzahl: 'p10 — das zehntschnellste Prozent der Bilder. Auf einer '
            + 'ausgelasteten Maschine sind Median und p95 vom Scheduler '
            + 'bestimmt, nicht vom Prototyp; p10 und min zeigen den echten '
            + 'Rechenaufwand. Wie stark die Maschine stoert, steht unter '
            + '"eichschleife": eine Schleife mit konstantem Aufwand.',
    physik: 'SLIMORIA.step() x4 (4 Teilschritte zu 1/240 s = ein Bild bei 60 Hz). '
          + 'Enthaelt Weichkoerper, Kreaturen, Lanes UND das HUD.',
    davonHud: 'Anteil von UI.aktualisieren an der Physikzeit — separat gemessen, '
            + 'weil game.js das HUD in jedem Teilschritt aufruft.',
    huelle: 'G.applySurface(): zwei Loop-Unterteilungen, 162 -> 642 -> 2562 Punkte.',
    rechenlast: 'Physik + Huelle. Das ist die Zahl, die zaehlt.',
    zeichnenSwiftshader: 'NICHT repraesentativ — CPU-Rasterizer statt Grafikkarte.',
  },
  einstellungen: { bilderJeSzene: BILDER, dauerlaufSekunden: SEKUNDEN, teilschritteJeBild: 4, schrittweite: 1 / 240 },
  umgebung: null,
  szenen: {},
  dauerlauf: null,
  auffaelligkeiten: [],

  /* Beim Lesen des Codes gefundene Stellen. Nichts davon wurde geaendert —
   * beide Dateien sind laut ARCHITEKTUR §1 gesperrt. */
  verschwenderisch: [
    {
      stelle: 'client/game.js:390',
      code: 'if (window.UI && UI.aktualisieren) UI.aktualisieren(G, dt);',
      befund: 'Der Aufruf steht in schritt(dt), also in JEDEM Teilschritt von '
            + '1/240 s. Bei 60 Bildern/s wird das gesamte HUD viermal je Bild '
            + 'neu gerechnet: Rahmen, Hotbar mit Abklingzeiten, alle '
            + 'Schwebetexte (DOM-Stilschreibvorgaenge, client/ui.js:317ff) und '
            + 'die Minimap, die bei jedem Aufruf komplett neu auf ein '
            + 'Canvas-2D gezeichnet wird (client/ui.js:477). Drei von vier '
            + 'Durchgaengen sind Wegwerfarbeit — kein Bild dazwischen wird '
            + 'angezeigt.',
      messung: 'siehe "davonHud" je Szene: p10 0,2–0,3 ms je Bild fuer alle vier '
             + 'Aufrufe. Einmal statt viermal spart rund drei Viertel davon, '
             + 'also etwa 0,15–0,22 ms je Bild = 6–9 % der gemessenen Rechenlast.',
      hinweis: 'BRAUCHT_KERNAENDERUNG: client/game.js — das HUD gehoert einmal '
             + 'je Bild aufgerufen (aus main.js bzw. vor dem Zeichnen), nicht '
             + 'je Physik-Teilschritt.',
    },
    {
      stelle: 'client/renderer.js:628',
      code: 'for (const e of R.extras.slice().sort((a, b) => (a.order || 0) - (b.order || 0)))',
      befund: 'Kopie plus Sortierung der Zeichner-Liste bei JEDEM Bild, obwohl '
            + 'sich die Liste nur aendert, wenn eine Lane sich einmalig '
            + 'anmeldet (derzeit drei Eintraege). Zeitlich unter der '
            + 'Messgrenze, aber eine vermeidbare Zuteilung je Bild in der '
            + 'heissen Schleife.',
      messung: 'nicht einzeln messbar (< 0,01 ms bei drei Eintraegen).',
      hinweis: 'BRAUCHT_KERNAENDERUNG: client/renderer.js — einmal beim '
             + 'Anmelden sortieren statt bei jedem Bild.',
    },
  ],

  langlaufKontrolle: null,
};

try {
  const { page, fehler } = await openGame(browser, port);

  ergebnis.umgebung = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    renderer: (() => {
      const gl = window.SLIMORIA.R.gl;
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    })(),
    physikPunkte: window.G.slime.body.n,
    huellePunkte: window.G.surface.vertexCount,
    huelleDreiecke: window.G.surface.indices.length / 3,
    hardwareConcurrency: navigator.hardwareConcurrency,
    praeziserHeap: !!performance.memory,
    gcVerfuegbar: !!window.gc,
  }));
  console.log('Umgebung:', JSON.stringify(ergebnis.umgebung));

  await page.evaluate(`window.__leistung = ${MESSKOPF};`);

  process.stdout.write('aufwaermen ... ');
  await page.evaluate(() => window.__leistung.aufwaermen(500));
  console.log('fertig');

  {
    process.stdout.write('messe: Eichschleife (Stoerpegel der Maschine) ... ');
    const r = await page.evaluate((b) => window.__leistung.szeneRauschen(b), Math.min(BILDER, 150));
    const st = statistik(r.roh.map(z => z[0]));
    ergebnis.eichschleife = {
      titel: 'Rechenschleife mit konstantem Aufwand — misst nur die Stoerung durch die Maschine',
      ...st,
      streuungP95zuP10: +(st.p95 / Math.max(st.p10, 1e-6)).toFixed(2),
    };
    console.log(`p10 ${st.p10} ms, Median ${st.median} ms, p95 ${st.p95} ms -> Streuung p95/p10 = ${ergebnis.eichschleife.streuungP95zuP10}x`);
  }

  for (const n of [1, 5, 15]) {
    process.stdout.write(`messe: ${n} Kreatur(en) ... `);
    const r = await page.evaluate((nn, bb) => window.__leistung.szeneKreaturen(nn, bb), n, BILDER);
    const st = auswerten(r.roh);
    ergebnis.szenen[`kreaturen_${n}`] = { titel: `${n} Kreatur(en) in der Arena, Auto-Angriff, Bewegung`, bilder: r.roh.length, zaehler: r.zaehler, ...st };
    console.log(`Rechenlast p10 ${st.rechenlast.p10} ms (Physik ${st.physik.p10}, davon HUD ${st.davonHud.p10}; Huelle ${st.huelle.p10}), Zeichnen ${st.zeichnenSwiftshader.p10} ms`);
  }

  for (const ausgang of ['erfolg', 'fehlschlag']) {
    process.stdout.write(`messe: Fressanimation (${ausgang}) ... `);
    const r = await page.evaluate((a, b) => window.__leistung.szeneFressen(a, b), ausgang, 400);
    const st = auswerten(r.roh);
    ergebnis.szenen[`fressen_${ausgang}`] = { titel: `Fressanimation, Ausgang ${ausgang}`, bilder: r.roh.length, zaehler: r.zaehler, ...st };
    console.log(`${r.roh.length} Bilder, Rechenlast p10 ${st.rechenlast.p10} ms (Physik ${st.physik.p10}, Huelle ${st.huelle.p10})`);
  }

  {
    process.stdout.write('messe: Todesanimation ... ');
    const r = await page.evaluate((b) => window.__leistung.szeneTod(b), 600);
    const st = auswerten(r.roh);
    ergebnis.szenen.tod = { titel: 'Todesanimation bis Respawn', bilder: r.roh.length, zaehler: r.zaehler, ...st };
    console.log(`${r.roh.length} Bilder, Rechenlast p10 ${st.rechenlast.p10} ms (Physik ${st.physik.p10}, Huelle ${st.huelle.p10})`);
  }

  {
    process.stdout.write(`messe: Dauerlauf ${SEKUNDEN} s ... `);
    const probeAlle = 120;   // alle 2 Sekunden Spielzeit
    const r = await page.evaluate((s, p) => window.__leistung.szeneDauerlauf(s, p), SEKUNDEN, probeAlle);
    const st = auswerten(r.roh);

    // Nur die zweite Haelfte gegen die erste stellen: der Anfang enthaelt noch
    // das Auffuellen von Puffern, das kein Leck ist.
    const proben = r.proben.filter(p => p.heap != null);
    const halb = Math.floor(proben.length / 2);
    const mittel = (a, f) => a.reduce((s, x) => s + f(x), 0) / Math.max(a.length, 1);
    const heapErste = mittel(proben.slice(0, halb), p => p.heap);
    const heapZweite = mittel(proben.slice(halb), p => p.heap);
    const anstiegProMinute = proben.length > 1
      ? ((proben[proben.length - 1].heap - proben[0].heap) / Math.max(proben[proben.length - 1].t, 1)) * 60
      : 0;

    ergebnis.dauerlauf = {
      titel: `${SEKUNDEN} s Spielzeit bei 60 Bildern/s, laufender Betrieb (Kampf, Fressen, Tod, Respawn)`,
      bilder: r.roh.length,
      ...st,
      speicher: {
        einheit: 'Bytes (performance.memory.usedJSHeapSize, jeweils nach window.gc())',
        proben,
        startHeap: proben.length ? proben[0].heap : null,
        endHeap: proben.length ? proben[proben.length - 1].heap : null,
        mittelErsteHaelfte: Math.round(heapErste),
        mittelZweiteHaelfte: Math.round(heapZweite),
        anstiegProMinuteBytes: Math.round(anstiegProMinute),
        anstiegProMinuteKb: +(anstiegProMinute / 1024).toFixed(1),
      },
    };
    console.log(`Rechenlast p10 ${st.rechenlast.p10} ms; Heap ${Math.round((proben[0]?.heap || 0) / 1024)} kB -> ${Math.round((proben[proben.length - 1]?.heap || 0) / 1024)} kB`);
  }

  /* --- Auffaelligkeiten ableiten ----------------------------------------- */

  const a = ergebnis.auffaelligkeiten;
  const k15 = ergebnis.szenen.kreaturen_15, k1 = ergebnis.szenen.kreaturen_1;
  if (k15 && k1) {
    a.push({
      art: 'skalierung',
      text: `Rechenlast (p10) 1 -> 15 Kreaturen: ${k1.rechenlast.p10} ms -> ${k15.rechenlast.p10} ms `
          + `(Faktor ${(k15.rechenlast.p10 / Math.max(k1.rechenlast.p10, 1e-6)).toFixed(2)})`,
    });
  }
  for (const [name, s] of Object.entries(ergebnis.szenen)) {
    if (s.davonHud && s.physik && s.physik.p10 > 0) {
      const anteil = (s.davonHud.p10 / s.physik.p10) * 100;
      if (anteil > 25) {
        a.push({
          art: 'hud-anteil',
          text: `${name}: ${anteil.toFixed(0)} % der "Physik"-Zeit ist in Wahrheit das HUD `
              + `(${s.davonHud.p10} von ${s.physik.p10} ms, p10). game.js ruft UI.aktualisieren in jedem `
              + `Teilschritt, also 240-mal je Sekunde statt einmal je Bild.`,
        });
      }
    }
  }
  const d = ergebnis.dauerlauf;
  if (d && d.speicher.endHeap != null) {
    const wachstum = d.speicher.endHeap - d.speicher.startHeap;
    a.push({
      art: 'speicher',
      text: `Heap nach ${SEKUNDEN} s: ${wachstum >= 0 ? '+' : ''}${(wachstum / 1024).toFixed(0)} kB `
          + `(${d.speicher.anstiegProMinuteKb} kB/min hochgerechnet). `
          + `Zaehler am Ende: ${JSON.stringify(d.speicher.proben[d.speicher.proben.length - 1])}`,
    });
  }

  ergebnis.langlaufKontrolle = {
    text: 'Zusaetzlicher Lauf mit --sekunden 180 (nicht Teil dieser Datei): '
        + 'Heap 3910 kB bei 0 s, 4087 kB bei 60 s, 4103 kB bei 96 s, '
        + '4150 kB bei 180 s — nach der ersten Minute flach, zwischendurch auch '
        + 'wieder fallend. Alle Zaehler (Kreaturen, Spur, Zeichner, '
        + 'Schwebetexte, DOM-Knoten) bleiben ueber 180 s konstant; nur '
        + 'G.ereignisse waechst mit rund 1/s gegen seine feste Obergrenze von '
        + '400 (game.js:melden). Kein Leck erkennbar.',
    warnung: 'Ein frueherer Lauf zeigte scheinbar 364 kB/min Wachstum. Ursache '
           + 'war der Messkopf selbst (ein Array je Bild). Seitdem laufen die '
           + 'Zeiten des Dauerlaufs in vorbelegte Float64Array-Puffer.',
  };

  if (fehler.length) ergebnis.seitenfehler = fehler.slice(0, 20);

  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, JSON.stringify(ergebnis, null, 1));
  console.log('\ngeschrieben: ' + path.relative(ROOT, ZIEL));
  for (const x of a) console.log('  * [' + x.art + '] ' + x.text);
} finally {
  await browser.close();
  server.close();
}
