/* ---------------------------------------------------------------------------
 * Nachweis: serverautoritatives Gameplay, zwei gleichzeitige Spieler,
 * persistenter Charakter (GDD 11 §121).
 *
 * Das Werkzeug startet den Spielserver, verbindet zwei kopflose Chrome-Clients
 * und prueft vier Aussagen, die man sonst nur behaupten koennte:
 *
 *   1. Zwei Clients sind gleichzeitig verbunden und sehen einander.
 *   2. Client 2 sieht die Bewegung von Client 1.
 *   3. Der Fressversuch wird vom Server entschieden. Die Chance wird IM
 *      CLIENT manipuliert — das Ergebnis aendert sich nicht. Gegenprobe:
 *      dieselbe Manipulation ohne Server kippt das Ergebnis sofort.
 *   4. Der Charakter ueberlebt einen harten Serverneustart.
 *
 * Ergebnis: gauntlet/zweispieler.json. Rueckgabewert 0 nur, wenn alle vier
 * Punkte bestanden sind und keine Seite einen Fehler geworfen hat.
 *
 *   node tools/zweispieler.mjs [--port N] [--seed N] [--kopf]
 * ------------------------------------------------------------------------- */

import puppeteer from 'puppeteer-core';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawn } from 'node:child_process';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATEN = path.join(ROOT, 'server', 'daten');
const AUSGABE = path.join(ROOT, 'gauntlet', 'zweispieler.json');
const BILDER = path.join(ROOT, 'gauntlet', 'zweispieler');

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const argv = process.argv.slice(2);
const flagge = (n, s = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] ?? true) : s; };

const STARTWERT = Number(flagge('seed', 4242));
const W = 1600, H = 900;

/* Namen der Pruefcharaktere. Sie sind Teil des Nachweises: der Wurfstrom des
 * Servers haengt am Namen, deshalb ist die Fressfolge reproduzierbar. */
const A_NAME = 'PruefEins';
const B_NAME = 'PruefZwei';
const F_NAME = 'PruefFress';
const D_NAME = 'PruefDauer';

const VERSUCHE = 6;              // Fressversuche je Durchgang

const warte = (ms) => new Promise(r => setTimeout(r, ms));
const seitenfehler = [];

/* --- Kleinkram ------------------------------------------------------------ */

function freierPort() {
  return new Promise((fertig, schief) => {
    const s = net.createServer();
    s.on('error', schief);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => fertig(p));
    });
  });
}

function charakterLoeschen(name) {
  try { fs.unlinkSync(path.join(DATEN, name + '.json')); return true; } catch { return false; }
}

function charakterLesen(name) {
  try { return JSON.parse(fs.readFileSync(path.join(DATEN, name + '.json'), 'utf8')); } catch { return null; }
}

function spielserverStarten(port) {
  return new Promise((fertig, schief) => {
    const kind = spawn(process.execPath, [
      path.join(ROOT, 'server', 'server.mjs'),
      '--port', String(port), '--seed', String(STARTWERT),
      '--daten', DATEN, '--test', '--still',
    ], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });

    let gemeldet = false;
    kind.stdout.on('data', (b) => {
      if (!gemeldet && b.toString().includes('bereit')) { gemeldet = true; fertig(kind); }
    });
    kind.stderr.on('data', (b) => process.stderr.write('[server] ' + b.toString()));
    kind.on('exit', (code) => { if (!gemeldet) schief(new Error('Server startete nicht (Code ' + code + ')')); });
  });
}

function spielserverStoppen(kind) {
  return new Promise((fertig) => {
    if (!kind || kind.exitCode !== null) return fertig();
    kind.once('exit', () => fertig());
    kind.kill();                 // unter Windows hart — genau das soll geprueft werden
    setTimeout(fertig, 2500);
  });
}

async function browserStarten() {
  return puppeteer.launch({
    executablePath: BROWSER,
    headless: !argv.includes('--kopf'),
    args: [
      '--headless=new',
      '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1', '--disable-lcd-text',
      '--force-color-profile=srgb', `--window-size=${W},${H}`,
    ],
  });
}

async function seiteOeffnen(browser, statikPort, marke, aufnahme = false) {
  const seite = await browser.newPage();
  await seite.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  seite.on('pageerror', e => seitenfehler.push(`${marke}: ${e.message}`));
  seite.on('console', m => { if (m.type() === 'error') seitenfehler.push(`${marke}: ${m.text()}`); });
  await seite.goto(`http://127.0.0.1:${statikPort}/client/index.html${aufnahme ? '?capture=1' : ''}`,
                   { waitUntil: 'domcontentloaded', timeout: 30000 });
  await seite.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  return seite;
}

const verbinde = (seite, wsUrl, name) =>
  seite.evaluate((u, n) => window.Netz.verbinden(u, n), wsUrl, name);

const netzLage = (seite) => seite.evaluate(() => ({
  verbunden: window.Netz.verbunden,
  selbst: window.Netz.selbst,
  charakter: window.Netz.charakter,
  spieler: (window.Netz.zustand ? window.Netz.zustand.spieler : []).map(s => ({
    id: s.id, name: s.name, level: s.level, x: s.x, z: s.z, hp: s.hp, tot: s.tot,
  })),
  andere: window.Netz.andere.map(a => ({ id: a.id, name: a.name, x: +a.x.toFixed(2), z: +a.z.toFixed(2) })),
  eigen: { x: +window.G.slime.body.cx.toFixed(2), z: +window.G.slime.body.cz.toFixed(2),
           level: window.G.spieler.level, hp: Math.round(window.G.spieler.hp), xp: window.G.spieler.xp },
  statistik: window.Netz.statistik,
}));

/* --- Nachweis 3: Fressdurchgang mit manipuliertem Client ------------------- */

async function fressDurchgang(seite, clientGlaubt) {
  // Manipulation im Client: Chance und Wuerfel werden auf ein festes Ergebnis
  // gestellt. Offline entscheidet genau das ueber Erfolg und Fehlschlag.
  await seite.evaluate((immer) => {
    window.Regeln.fresschance = () => (immer ? 1 : 0);
    window.RNG.next = () => (immer ? 0 : 0.999999);
    window.__manipulation = immer ? 'chance=1, wuerfel=0.0 (immer Erfolg)'
                                  : 'chance=0, wuerfel=0.999999 (nie Erfolg)';
  }, clientGlaubt);

  return seite.evaluate(async (versuche) => {
    const warte = (ms) => new Promise(r => setTimeout(r, ms));
    const G = window.G, N = window.Netz;
    const aus = [];

    for (let i = 0; i < versuche; i++) {
      // Gleiche Ausgangslage fuer jeden Versuch — der Server stellt sie her.
      /* Die Ausgangslage MUSS eine Fresschance deutlich zwischen 0 und 100 %
       * ergeben — nur dann ist die Ergebnisfolge gemischt, und nur an einer
       * gemischten Folge laesst sich zeigen, dass der Server wuerfelt und nicht
       * der Client. Bei voller Gegner-HP ergibt Spieler 5 gegen Wolf 2 nach
       * shared/regeln.js 48,6 %. Frueher stand hier hpAnteil 0.05; seit der
       * Neukalibrierung der Fresschance auf die GDD-Stuetzwerte (§22: 3 gegen 1
       * bei vollem Leben = 40 %) ergibt das exakt 100 % — die Pruefung konnte
       * damit gar nicht mehr bestehen, obwohl am Server nichts falsch war. */
      const a = await N.testAufbau({
        level: 5, xp: 0,
        kreatur: { art: 'wolf', level: 2, hpAnteil: 1 },
      });
      if (!a || !a.ziel) { aus.push({ fehler: 'kein Pruefaufbau' }); break; }

      for (let w = 0; w < 60 && !G.kreaturen.some(k => k.id === a.ziel); w++) await warte(50);
      G.zielId = a.ziel;
      await warte(60);

      const vorher = N.fressProtokoll.length;
      const antwort = window.SPIEL.fressversuch({});
      for (let w = 0; w < 80 && N.fressProtokoll.length === vorher; w++) await warte(50);

      const e = N.fressProtokoll[N.fressProtokoll.length - 1];
      aus.push({
        versuch: i,
        clientAntwort: antwort,
        clientChance: window.Regeln.fresschance(5, 2, 0.04),
        clientWuerfel: window.RNG.next(),
        serverChance: e ? e.chance : null,
        serverAugen: e ? e.augen : null,
        wurfNr: e ? e.wurfNr : null,
        erfolg: e ? e.erfolg : null,
      });

      // Animation auslaufen lassen, sonst blockt der naechste Versuch.
      for (let w = 0; w < 120 && G.phase !== 'frei'; w++) await warte(50);
    }
    return { manipulation: window.__manipulation, versuche: aus };
  }, VERSUCHE);
}

/* --- Hauptlauf ------------------------------------------------------------- */

const beginn = Date.now();
const pruefungen = [];
let statik = null, spielserver = null, browserA = null, browserB = null;

function pruefung(nr, titel, bestanden, belege) {
  pruefungen.push({ nr, titel, bestanden: !!bestanden, belege });
  console.log(`${bestanden ? 'BESTANDEN' : 'GESCHEITERT'}  ${nr}. ${titel}`);
  return !!bestanden;
}

try {
  fs.mkdirSync(BILDER, { recursive: true });
  fs.mkdirSync(DATEN, { recursive: true });
  for (const n of [A_NAME, B_NAME, F_NAME, D_NAME]) charakterLoeschen(n);

  statik = createServer();
  const statikPort = await listen(statik, 0);
  const spielPort = Number(flagge('port', 0)) || await freierPort();
  const wsUrl = `ws://127.0.0.1:${spielPort}`;

  console.log(`Statikserver auf ${statikPort}, Spielserver auf ${spielPort}, Startwert ${STARTWERT}\n`);
  spielserver = await spielserverStarten(spielPort);

  browserA = await browserStarten();
  browserB = await browserStarten();      // eigener Browser: Hintergrundtabs
                                          // drosseln requestAnimationFrame
  const seiteA = await seiteOeffnen(browserA, statikPort, 'A');
  const seiteB = await seiteOeffnen(browserB, statikPort, 'B');

  /* ------------------------------------------------------------------ 1 */

  const okA = await verbinde(seiteA, wsUrl, A_NAME);
  const okB = await verbinde(seiteB, wsUrl, B_NAME);
  await warte(600);

  const lageA1 = await netzLage(seiteA);
  const lageB1 = await netzLage(seiteB);

  const namenA = lageA1.spieler.map(s => s.name).sort();
  const namenB = lageB1.spieler.map(s => s.name).sort();
  const beide = JSON.stringify(namenA) === JSON.stringify([A_NAME, B_NAME].sort());

  const p1 = pruefung(1, 'Zwei Spieler gleichzeitig verbunden',
    okA && okB && lageA1.verbunden && lageB1.verbunden && beide &&
    JSON.stringify(namenB) === JSON.stringify([A_NAME, B_NAME].sort()) &&
    lageA1.andere.length === 1 && lageB1.andere.length === 1,
    {
      verbindungA: okA, verbindungB: okB,
      spielerLautA: namenA, spielerLautB: namenB,
      fremdeBeiA: lageA1.andere, fremdeBeiB: lageB1.andere,
      eigeneIds: { A: lageA1.selbst, B: lageB1.selbst },
    });

  /* ------------------------------------------------------------------ 2 */

  const sichtAufA = (n) => seiteB.evaluate((name) => {
    const f = window.Netz.fremder(name);
    const s = ((window.Netz.zustand || {}).spieler || []).find(s => s.name === name);
    return {
      gezeichnet: f ? { x: +f.x.toFixed(2), z: +f.z.toFixed(2) } : null,
      gemeldet: s ? { x: s.x, z: s.z } : null,
    };
  }, n);

  const vorherSicht = await sichtAufA(A_NAME);
  const vorherB = vorherSicht.gezeichnet;

  /* Kopfloses Chrome rendert mit rund 10 Bildern je Sekunde, die Simulation
   * laeuft dadurch etwa halb so schnell wie die Wanduhr. Neun Einheiten
   * brauchen deshalb rund vier Sekunden, die Interpolation bei Client 2
   * noch einmal etwas. */
  await seiteA.evaluate(() => window.SLIMORIA.api.moveTo(0, 9));
  await warte(8000);

  const lageA2 = await netzLage(seiteA);
  const nachherSicht = await sichtAufA(A_NAME);
  const nachherB = nachherSicht.gezeichnet;

  const strecke = vorherB && nachherB ? Math.hypot(nachherB.x - vorherB.x, nachherB.z - vorherB.z) : 0;
  const abweichung = nachherB ? Math.hypot(nachherB.x - lageA2.eigen.x, nachherB.z - lageA2.eigen.z) : 99;

  /* Fuer den Beleg die Kamera beider Clients auf den jeweils anderen drehen —
   * sonst steht der Mitspieler hinter der Kamera und das Bild zeigt nichts. */
  const kameraAufFremden = (seite, name) => seite.evaluate((n) => {
    const f = window.Netz.fremder(n);
    if (!f) return false;
    const b = window.G.slime.body;
    window.SLIMORIA.api.setCamera({
      yaw: Math.atan2(b.cz - f.z, b.cx - f.x), pitch: 0.30, dist: 15,
    });
    return true;
  }, name);

  await kameraAufFremden(seiteB, A_NAME);
  await kameraAufFremden(seiteA, B_NAME);
  await warte(700);
  await seiteB.screenshot({ path: path.join(BILDER, 'client2-sieht-client1.png') });
  await seiteA.screenshot({ path: path.join(BILDER, 'client1-sieht-client2.png') });

  const p2 = pruefung(2, 'Client 2 sieht die Bewegung von Client 1',
    strecke > 3 && abweichung < 1.5,
    {
      vorherBeiB: vorherB, nachherBeiB: nachherB,
      vomServerBeiB: nachherSicht.gemeldet,
      eigenePositionA: { x: lageA2.eigen.x, z: lageA2.eigen.z },
      zurueckgelegt: +strecke.toFixed(2),
      abweichungZuA: +abweichung.toFixed(2),
      korrekturschritteA: lageA2.statistik.korrekturen,
      korrekturwegA: +lageA2.statistik.korrekturWeg.toFixed(3),
      bild: path.relative(ROOT, path.join(BILDER, 'client2-sieht-client1.png')),
    });

  /* ------------------------------------------------------------------ 3 */

  // Client B wird zum Fressprueflings-Client umgewidmet.
  await seiteB.evaluate(() => window.Netz.trennen());
  await warte(500);
  charakterLoeschen(F_NAME);

  await seiteB.reload({ waitUntil: 'domcontentloaded' });
  await seiteB.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  await verbinde(seiteB, wsUrl, F_NAME);
  await warte(400);
  const durchgang1 = await fressDurchgang(seiteB, true);       // Client: immer Erfolg

  // Zweiter Durchgang: derselbe Charakter, aber frisch — gleicher Wurfstrom.
  await seiteB.evaluate(() => window.Netz.trennen());
  await warte(600);
  charakterLoeschen(F_NAME);

  await seiteB.reload({ waitUntil: 'domcontentloaded' });
  await seiteB.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  await verbinde(seiteB, wsUrl, F_NAME);
  await warte(400);
  const durchgang2 = await fressDurchgang(seiteB, false);      // Client: nie Erfolg

  // Gegenprobe ohne Server: dort schlaegt dieselbe Manipulation voll durch.
  const seiteO = await seiteOeffnen(browserA, statikPort, 'O', true);
  const ohneServer = await seiteO.evaluate(() => {
    const A = window.SLIMORIA.api;
    const lauf = (immer) => {
      A.reset({ seed: 1234, level: 5 });
      window.Regeln.fresschance = () => (immer ? 1 : 0);
      window.RNG.next = () => (immer ? 0 : 0.999999);
      const id = A.spawnCreature({ art: 'wolf', level: 2, x: 2.6, z: 0 });
      A.selectTarget(id);
      const r = A.tryEat({});
      return { ok: r.ok, erfolg: r.erfolg, chance: r.chance };
    };
    return { verbunden: window.Netz.verbunden, immerErfolg: lauf(true), nieErfolg: lauf(false) };
  });
  await seiteO.close();

  const folge1 = durchgang1.versuche.map(v => (v.erfolg ? 1 : 0)).join('');
  const folge2 = durchgang2.versuche.map(v => (v.erfolg ? 1 : 0)).join('');
  const vollstaendig = durchgang1.versuche.length === VERSUCHE && durchgang2.versuche.length === VERSUCHE
    && durchgang1.versuche.every(v => v.erfolg !== null) && durchgang2.versuche.every(v => v.erfolg !== null);
  const gemischt = folge1.includes('1') && folge1.includes('0');
  const gleich = folge1 === folge2 && folge1.length === VERSUCHE;
  const chanceWeichtAb = durchgang1.versuche.every(v => Math.abs(v.serverChance - v.clientChance) > 0.2);
  const gegenprobe = ohneServer.immerErfolg.erfolg === true && ohneServer.nieErfolg.erfolg === false
                     && ohneServer.verbunden === false;

  const p3 = pruefung(3, 'Fressversuch entscheidet der Server, nicht der Client',
    vollstaendig && gemischt && gleich && chanceWeichtAb && gegenprobe,
    {
      durchgang1: { clientGlaubt: durchgang1.manipulation, folge: folge1, versuche: durchgang1.versuche },
      durchgang2: { clientGlaubt: durchgang2.manipulation, folge: folge2, versuche: durchgang2.versuche },
      folgenIdentisch: gleich,
      folgeGemischt: gemischt,
      clientChanceIrrelevant: chanceWeichtAb,
      gegenprobeOhneServer: ohneServer,
      lesart: 'Der Client behauptet einmal 100 % und einmal 0 % Fresschance und stellt den ' +
              'Wuerfel entsprechend. Die Folge der Ergebnisse bleibt identisch, weil sie ' +
              'aus Serverwerten entsteht. Ohne Server kippt dieselbe Manipulation das Ergebnis sofort.',
    });

  /* ------------------------------------------------------------------ 4 */

  charakterLoeschen(D_NAME);
  const seiteD = await seiteOeffnen(browserA, statikPort, 'D');
  await verbinde(seiteD, wsUrl, D_NAME);
  await warte(400);

  const vorNeustart = await seiteD.evaluate(async () => {
    const warte = (ms) => new Promise(r => setTimeout(r, ms));
    const G = window.G, N = window.Netz;
    const spur = [];

    // Bis zu drei Anlaeufe: stirbt der Schleim zwischendurch, wird neu
    // aufgebaut. Das Ergebnis (Level aus erschlagener Kreatur) bleibt gleich.
    for (let anlauf = 0; anlauf < 3 && G.spieler.level < 2; anlauf++) {
      const a = await N.testAufbau({ level: 1, xp: 0, kreatur: { art: 'wolf', level: 5, hpAnteil: 0.05 } });
      if (!a || !a.ziel) { spur.push({ anlauf, fehler: 'kein Pruefaufbau' }); break; }
      for (let w = 0; w < 60 && !G.kreaturen.some(k => k.id === a.ziel); w++) await warte(50);
      G.zielId = a.ziel;
      G.autoAngriff = true;                     // Auto-Angriff: der Server schlaegt zu
      for (let w = 0; w < 120 && G.spieler.level < 2; w++) await warte(50);
      const eigen = (N.zustand.spieler || []).find(s => s.id === N.selbst) || {};
      spur.push({ anlauf, ziel: a.ziel, level: G.spieler.level, hp: Math.round(G.spieler.hp),
                  serverZiel: eigen.zielId, serverAuto: eigen.autoAngriff, serverTot: eigen.tot });
    }
    G.autoAngriff = false;
    await warte(400);
    return {
      level: G.spieler.level, xp: G.spieler.xp,
      hp: Math.round(G.spieler.hp), gold: G.spieler.gold,
      bestiarium: JSON.parse(JSON.stringify(G.bestiarium || {})),
      charakter: N.charakter, spur,
    };
  });

  await seiteD.evaluate(() => window.Netz.trennen());
  await warte(700);
  const aufPlatte = charakterLesen(D_NAME);

  await spielserverStoppen(spielserver);
  spielserver = null;
  await warte(400);
  spielserver = await spielserverStarten(spielPort);
  await warte(300);

  await verbinde(seiteD, wsUrl, D_NAME);
  await warte(700);
  const nachNeustart = await netzLage(seiteD);
  await seiteD.close();

  const gleicherStand = !!aufPlatte
    && nachNeustart.charakter
    && nachNeustart.charakter.level === vorNeustart.level
    && nachNeustart.charakter.xp === vorNeustart.xp
    && vorNeustart.level >= 2;

  const p4 = pruefung(4, 'Charakter ueberlebt den Serverneustart',
    gleicherStand,
    {
      vorNeustart: { level: vorNeustart.level, xp: vorNeustart.xp, hp: vorNeustart.hp },
      verlauf: vorNeustart.spur,
      aufPlatte,
      nachNeustart: nachNeustart.charakter,
      datei: path.relative(ROOT, path.join(DATEN, D_NAME + '.json')),
      lesart: 'Level und XP stammen aus erschlagenen Kreaturen, nicht aus dem Client. ' +
              'Der Serverprozess wurde hart beendet und neu gestartet.',
    });

  /* --- Ergebnis ---------------------------------------------------------- */

  const bestanden = [p1, p2, p3, p4].filter(Boolean).length;
  const ergebnis = {
    werkzeug: 'tools/zweispieler.mjs',
    startwert: STARTWERT,
    spielPort, statikPort,
    datenOrdner: path.relative(ROOT, DATEN),
    pruefungen,
    bestanden, gesamt: 4,
    alleBestanden: bestanden === 4,
    seitenfehler,
    dauerSekunden: +((Date.now() - beginn) / 1000).toFixed(1),
  };
  fs.mkdirSync(path.dirname(AUSGABE), { recursive: true });
  fs.writeFileSync(AUSGABE, JSON.stringify(ergebnis, null, 1));

  console.log(`\n${bestanden}/4 bestanden -> ${path.relative(ROOT, AUSGABE)}`);
  if (seitenfehler.length) {
    console.log('Seitenfehler:');
    for (const f of seitenfehler.slice(0, 20)) console.log('  ' + f);
  }
  process.exitCode = (bestanden === 4 && seitenfehler.length === 0) ? 0 : 1;

} catch (e) {
  console.error('Abbruch:', e && e.stack ? e.stack : e);
  try {
    fs.mkdirSync(path.dirname(AUSGABE), { recursive: true });
    fs.writeFileSync(AUSGABE, JSON.stringify({
      werkzeug: 'tools/zweispieler.mjs', abbruch: String(e && e.message || e),
      pruefungen, bestanden: pruefungen.filter(p => p.bestanden).length, gesamt: 4,
      alleBestanden: false, seitenfehler,
    }, null, 1));
  } catch {}
  process.exitCode = 1;
} finally {
  if (browserA) await browserA.close().catch(() => {});
  if (browserB) await browserB.close().catch(() => {});
  await spielserverStoppen(spielserver);
  if (statik) statik.close();
}
