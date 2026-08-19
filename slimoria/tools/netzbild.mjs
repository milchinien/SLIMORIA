/* ---------------------------------------------------------------------------
 * Belegbilder fuer die drei Netzpunkte der Abnahmeliste B (GDD 11 §121):
 * zwei gleichzeitig verbundene Spieler, serverautoritatives Gameplay,
 * persistenter Charakter.
 *
 * tools/zweispieler.mjs prueft dieselben Punkte und schreibt JSON. Ein Haken
 * in einer Datei ist aber kein Nachweis, den man jemandem hinlegen kann.
 * Dieses Werkzeug erzeugt die Bilder dazu: zwei kopflose Chrome-Clients bei
 * 1600x900, beide am selben Server, und aus ihren Bildschirmen je einen
 * beschrifteten Beleg.
 *
 *   1. bewegung.png    Spieler 1 laeuft quer durch die Arena. Beide Clients
 *                      werden im selben Augenblick fotografiert; im Bild von
 *                      Client 2 hat sich der fremde Schleim mitbewegt.
 *   2. fressen.png     Spieler 1 frisst. Beide Clients, drei Augenblicke.
 *   3. persistenz.png  Level und XP im HUD, vor und nach einem harten
 *                      Serverneustart, dazwischen ein frisch geladener
 *                      Client ohne Verbindung.
 *
 * Die Beschriftung wird nicht geraten: die Sprechblasen sitzen auf den
 * Bildpunkten, die sich aus der Kameramatrix des jeweiligen Clients ergeben
 * (dieselbe Rechnung wie in ui.js projizieren). Steht die Blase falsch, war
 * die Aufnahme falsch — nicht die Beschriftung.
 *
 *   node tools/netzbild.mjs [--nur bewegung,fressen,persistenz] [--seed N] [--kopf]
 *
 * Ergebnis in gauntlet/netz/. Rueckgabewert 0 nur, wenn alle angeforderten
 * Belege entstanden sind und jeder das zeigt, was seine Beschriftung behauptet
 * (die Pruefungen dazu stehen bei jedem Beleg im JSON).
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
const AUS = path.join(ROOT, 'gauntlet', 'netz');
const ROH = path.join(AUS, 'roh');
const SEITEN = path.join(AUS, 'seite');

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const argv = process.argv.slice(2);
const flagge = (n, s = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] ?? true) : s; };

const STARTWERT = Number(flagge('seed', 4242));
const W = 1600, H = 900;
const NUR = String(flagge('nur', 'bewegung,fressen,persistenz')).split(',').map(s => s.trim());

/* Zwei unterscheidbare Charaktere: verschiedene Namen UND verschiedene
 * Fraktionen. Die Farbe ist der eigentliche Unterschied im Bild — Eldoran
 * blau, Ravok rot (GDD 01 §8) —, der Name steht im HUD und in den Blasen. */
const EINS = { name: 'NetzBlau', faction: 'eldoran' };
const ZWEI = { name: 'NetzRot', faction: 'ravok' };
const DAUER_NAME = 'NetzDauer';

/* Wegpunkte der Vorfuehrung. Der Gang von (0,0) nach (-12,12) ist frei von
 * Felsen und bleibt ueberall weiter als der Aggro-Radius (7) von jedem
 * Kreaturen-Ruhepunkt entfernt — sonst haette ein zufaellig anrueckender Wolf
 * das Bild bestimmt statt der Bewegung. */
const ZIEL = { x: -12, z: 12 };
/* Wo Spieler 2 zusieht: auf derselben Geraden, sechs Einheiten hinter dem
 * Startpunkt von Spieler 1. Beide stehen damit gleich weit von der Kamera
 * weg — gleich gross im Bild —, ueberdecken sich aber nie. */
const PARK = { x: 4.2, z: -4.2 };
/* Die Laufrichtung (-1,+1) liegt genau auf der Rechtsachse dieser Kamera.
 * Der Schleim wandert dadurch quer durchs Bild, statt nur kleiner zu werden. */
const SCHAU = { tx: -4, ty: 0, tz: 4, yaw: -Math.PI * 0.75, pitch: 0.5, dist: 26, follow: false };

const warte = (ms) => new Promise(r => setTimeout(r, ms));
const seitenfehler = [];
const pruefungen = [];
const belege = [];
const luecken = [];              // was die Bilder sichtbar NICHT hergeben

/* --- Kleinkram ------------------------------------------------------------ */

function freierPort() {
  return new Promise((fertig, schief) => {
    const s = net.createServer();
    s.on('error', schief);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => fertig(p)); });
  });
}

function zeitstempel(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const charakterLoeschen = (n) => { try { fs.unlinkSync(path.join(DATEN, n + '.json')); } catch {} };
const charakterLesen = (n) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATEN, n + '.json'), 'utf8')); } catch { return null; }
};

function ordnerLeeren(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  for (const f of fs.readdirSync(ordner)) {
    try { fs.rmSync(path.join(ordner, f), { recursive: true, force: true }); } catch {}
  }
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
    kind.kill();                    // unter Windows hart — genau das gehoert geprueft
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
      '--force-color-profile=srgb', '--font-render-hinting=none',
      `--window-size=${W},${H}`,
    ],
  });
}

/* Das Reglerfenster gehoert zum Entwicklungsbetrieb, nicht auf einen Beleg.
 * Es wird ueber eine eingehaengte Regel versteckt statt ueber setHudVisible —
 * das HUD ist bei zwei der drei Belege der eigentliche Beweis. */
const PANEL_AUS = '#panel, #panel-open { display: none !important; }';

/* Beim ersten Aufruf steht die Charaktererstellung offen (charakter.js). Sie
 * verdeckt das linke Drittel, blendet das HUD ab und fuehrt eine eigene,
 * langsam kreisende Vorschaukamera — auf einem Beleg waere davon nichts zu
 * gebrauchen. Der Charakter wird deshalb gesetzt und weggespeichert, damit
 * auch ein Neuladen mitten im Lauf nicht wieder dort landet. */
async function erstellungBeenden(seite, wer) {
  await seite.waitForFunction('window.Charakter !== undefined', { timeout: 20000 });
  await seite.evaluate((n, f) => {
    const C = window.Charakter;
    C.speichern(C.anwenden({ ...C.STANDARD, name: n, faction: f }));
    C.schliessen();
  }, wer.name, wer.faction);
}

async function seiteVorbereiten(seite, wer) {
  await seite.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  await seite.addStyleTag({ content: PANEL_AUS });
  await erstellungBeenden(seite, wer);
}

async function seiteOeffnen(browser, statikPort, marke, wer) {
  const seite = await browser.newPage();
  await seite.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  /* Der Fehlschlag des Startversuchs auf den Standardport ist erwartet: der
   * Spielserver dieses Laufs lauscht auf einem freien Port, damit parallel
   * laufende Werkzeuge sich nicht ins Gehege kommen. */
  const erwartet = (t) => /:8790/.test(t) && /WebSocket|ERR_CONNECTION_REFUSED/i.test(t);
  seite.on('pageerror', e => { if (!erwartet(e.message)) seitenfehler.push(`${marke}: ${e.message}`); });
  seite.on('console', m => {
    if (m.type() === 'error' && !erwartet(m.text())) seitenfehler.push(`${marke}: ${m.text()}`);
  });
  await seite.goto(`http://127.0.0.1:${statikPort}/client/index.html`,
                   { waitUntil: 'domcontentloaded', timeout: 30000 });
  await seiteVorbereiten(seite, wer);
  return seite;
}

async function neuLaden(seite, wer) {
  await seite.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await seiteVorbereiten(seite, wer);
}

/* Der Client baut beim Laden von selbst eine Verbindung auf (net.js). Dieses
 * Werkzeug braucht aber einen bestimmten Namen und eine bestimmte Fraktion,
 * und der Spielserver laeuft auf einem freien Port statt auf dem Standardport.
 * Deshalb wird der eigene Versuch erst weggeraeumt — `verbinden` steigt sonst
 * sofort wieder aus, solange noch ein Steckdraht offen ist — und danach
 * mehrfach angeklopft, bis es steht. */
async function abklemmen(seite, ms = 2500) {
  await warte(ms);
  await seite.evaluate(() => window.Netz.trennen());
  await warte(600);
}

async function verbinde(seite, wsUrl, wer, versuche = 12) {
  for (let i = 0; i < versuche; i++) {
    const stand = await seite.evaluate(() => ({
      verbunden: window.Netz.verbunden, name: window.G.spieler.name,
    }));
    if (stand.verbunden) {
      if (stand.name === wer.name) return true;
      await seite.evaluate(() => window.Netz.trennen());
      await warte(700);
    }
    const ok = await seite.evaluate(
      (u, n, f) => window.Netz.verbinden(u, n, { faction: f }), wsUrl, wer.name, wer.faction);
    if (ok) return true;
    await warte(700);
  }
  throw new Error(`Client "${wer.name}" bekam keine Verbindung zu ${wsUrl}`);
}

const kamera = (seite, o) => seite.evaluate((k) => window.SLIMORIA.api.setCamera(k), o);

async function warteBis(pruef, msMax = 20000, takt = 150) {
  const ende = Date.now() + msMax;
  while (Date.now() < ende) {
    if (await pruef()) return true;
    await warte(takt);
  }
  return false;
}

/* --- Lage eines Clients ---------------------------------------------------
 * Alles, was fuer die Beschriftung gebraucht wird, aus der Sicht GENAU DIESES
 * Clients: eigene und fremde Schleime, Kreaturen, HUD-Text, und zu jedem
 * Weltpunkt der Bildpunkt aus der aktuellen Kameramatrix. */

function lage(seite) {
  return seite.evaluate(() => {
    const G = window.G, N = window.Netz;
    const A = window.ANSICHT || { w: 1600, h: 900 };
    const rfl = window.radiusFuerLevel || (() => 1);

    const proj = (x, y, z) => {
      const m = G.kamera.viewProj;
      const px = m[0] * x + m[4] * y + m[8] * z + m[12];
      const py = m[1] * x + m[5] * y + m[9] * z + m[13];
      const pw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (pw <= 0.001) return null;
      const bx = (px / pw * 0.5 + 0.5) * A.w, by = (1 - (py / pw * 0.5 + 0.5)) * A.h;
      if (bx < -200 || bx > A.w + 200 || by < -200 || by > A.h + 200) return null;
      return { x: +bx.toFixed(1), y: +by.toFixed(1) };
    };

    const rechteck = (id) => {
      const e = document.getElementById(id);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    // Ein paar Bildpunkte Luft, sonst schneidet die Lupe den Rahmen an.
    const luft = (r, p) => r && { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p };

    /* Der Kasten um die Schrift selbst, nicht um ihr Element: die XP-Zahl
     * sitzt in einer ueber tausend Bildpunkte breiten Leiste und waere in
     * einer Lupe auf das Element winzig. */
    const spanne = (id) => {
      const e = document.getElementById(id);
      if (!e || !e.firstChild) return null;
      const b = document.createRange();
      b.selectNodeContents(e);
      const r = b.getBoundingClientRect();
      return r.width ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
    };
    const text = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : ''; };

    const b = G.slime.body;
    const r = (window.PARAMS && window.PARAMS.radius) || 1;

    return {
      verbunden: !!(N && N.verbunden),
      phase: G.phase,
      unterphase: (window.Fressen && window.Fressen.phase) || '',
      eigen: {
        name: G.spieler.name, faction: G.spieler.faction, level: G.spieler.level,
        hp: Math.round(G.spieler.hp), xp: G.spieler.xp, xpNaechstes: G.spieler.xpNaechstes,
        x: +b.cx.toFixed(2), z: +b.cz.toFixed(2),
        bild: proj(b.cx, b.cy + r * 1.35, b.cz),
      },
      fremde: (N && N.andere ? N.andere : []).map(a => ({
        name: a.name, faction: a.faction, level: a.level,
        x: +a.x.toFixed(2), z: +a.z.toFixed(2),
        bild: proj(a.x, rfl(a.level || 1) * 1.35, a.z),
      })),
      kreaturen: G.kreaturen.map(k => ({
        id: k.id, art: k.art, name: k.name, level: k.level, lebt: !!k.lebt,
        hp: Math.round(k.hp), maxHp: k.maxHp,
        x: +k.x.toFixed(2), z: +k.z.toFixed(2),
        bild: proj(k.x, k.y + k.groesse * 2.0, k.z),
      })),
      hud: {
        level: text('ui-sp-level'), name: text('ui-sp-name'),
        xp: text('ui-xp-text'), hp: text('ui-sp-hptext'),
        rahmen: luft(rechteck('ui-spieler'), 4),
        // Nicht die ganze, ueber tausend Bildpunkte breite Leiste, sondern das
        // Stueck um die Zahl herum — nur die ist der Nachweis.
        xpLeiste: (() => {
          const t = spanne('ui-xp-text'), b = rechteck('ui-xp');
          if (!t || !b) return luft(b, 4);
          const x = Math.max(b.x, t.x - 120);
          return { x, y: b.y - 5, w: Math.min(b.x + b.w, t.x + t.w + 120) - x, h: b.h + 10 };
        })(),
      },
      fressProtokoll: (N && N.fressProtokoll ? N.fressProtokoll : []).slice(-1),
    };
  });
}

/* Beide Clients im selben Augenblick. Erst die Lage (schnell, ohne Bild),
 * dann beide Bildschirme parallel — die Spanne dazwischen steht im Beleg. */
async function paar(a, b, marke) {
  const t0 = Date.now();
  const [la, lb] = await Promise.all([lage(a.seite), lage(b.seite)]);
  const na = `${marke}-client1.png`, nb = `${marke}-client2.png`;
  await Promise.all([
    a.seite.screenshot({ path: path.join(ROH, na), captureBeyondViewport: false }),
    b.seite.screenshot({ path: path.join(ROH, nb), captureBeyondViewport: false }),
  ]);
  return { spanneMs: Date.now() - t0, a: { bild: na, lage: la }, b: { bild: nb, lage: lb } };
}

async function einzeln(seite, name) {
  const l = await lage(seite);
  await seite.screenshot({ path: path.join(ROH, name + '.png'), captureBeyondViewport: false });
  return { bild: name + '.png', lage: l };
}

/* --- Beschriftung ---------------------------------------------------------- */

const klasseFuer = (faction) => (faction === 'ravok' ? 'rot' : 'blau');

/* Sprechblasen aus der Lage. `mitte` ist der Punkt, um den herum Kreaturen
 * beschriftet werden — sonst haengt bei sechs Ruhepunkten das halbe Bild
 * voller Zettel und der eigentliche Vorgang geht unter. */
function marken(l, { kreaturen = null, mitte = null, radius = 7 } = {}) {
  const aus = [];
  // Kreaturen zuerst: spaeter Eingehaengtes liegt oben, und oben gehoeren die
  // beiden Schleime hin — um sie geht es auf jedem dieser Belege.
  if (kreaturen) {
    for (const k of l.kreaturen) {
      if (!k.bild || !k.lebt) continue;
      if (kreaturen !== 'alle' && k.id !== kreaturen) continue;
      if (mitte && Math.hypot(k.x - mitte.x, k.z - mitte.z) > radius) continue;
      aus.push({ ...k.bild, klasse: 'kreatur unten', rolle: 'kreatur',
                 text: `${k.name} · Lv ${k.level}`, unter: `${k.hp}/${k.maxHp} HP` });
    }
  }
  if (l.eigen.bild) {
    aus.push({ ...l.eigen.bild, klasse: klasseFuer(l.eigen.faction), rolle: 'eigen',
               text: `${l.eigen.name} · Lv ${l.eigen.level}`, unter: 'eigener Schleim' });
  }
  for (const f of l.fremde) {
    if (!f.bild) continue;
    aus.push({ ...f.bild, klasse: klasseFuer(f.faction), rolle: 'fremd',
               text: `${f.name} · Lv ${f.level}`, unter: 'fremder Schleim (vom Server)' });
  }
  return aus;
}

/* --- Belegseite ------------------------------------------------------------
 * Aufbau wie tools/kontakt.html: eine HTML-Seite wird vom Statikserver
 * geladen und abfotografiert. Sie wird hier erzeugt statt als feste Datei,
 * weil jeder Beleg eigene Blasen, Lupen und Beschriftungen braucht. */

const HTML_ESC = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STIL = `
  html, body { margin: 0; background: #12141a; color: #e8ecf4;
    font: 13px/1.4 "Segoe UI", system-ui, sans-serif; }
  header { padding: 18px 20px 10px; border-bottom: 1px solid #262b36; }
  h1 { margin: 0 0 4px; font-size: 20px; font-weight: 650; letter-spacing: .2px; }
  .unter { color: #9fabc2; font-size: 13px; max-width: 1500px; }
  .kopfzeile { margin-top: 8px; color: #6f7a8d; font-size: 12px;
    font-variant-numeric: tabular-nums; }
  .kopfzeile b { color: #aab4c8; font-weight: 600; }
  .raster { display: grid; gap: 12px; padding: 14px 20px 6px; align-items: start; }
  figure { margin: 0; background: #0c0e13; border: 1px solid #262b36; border-radius: 6px;
    overflow: hidden; }
  .gruppe { display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
    padding: 6px 10px; background: #1a1e27; border-bottom: 1px solid #262b36; }
  .gruppe .wer { font-size: 14px; font-weight: 700; letter-spacing: .3px; }
  .gruppe .wann { font-size: 12px; color: #9fabc2; }
  .wer.c1 { color: #7fb4ff; }
  .wer.c2 { color: #ff9a8f; }
  .wer.c0 { color: #d7dde8; }
  .rahmen { position: relative; line-height: 0; }
  .rahmen img { display: block; width: 100%; height: auto; }
  .marke { position: absolute; transform: translate(-50%, -50%); pointer-events: none; }
  .marke .ring { width: 46px; height: 46px; margin: -23px 0 0 -23px; position: absolute;
    border-radius: 50%; border: 2px solid currentColor; opacity: .95; }
  .marke .zettel { position: absolute; transform: translate(-50%, -100%);
    top: -28px; white-space: nowrap; padding: 3px 7px; border-radius: 4px;
    background: rgba(8,10,14,.88); border: 1px solid currentColor;
    font-size: 12px; font-weight: 650; line-height: 1.25; }
  .marke .zettel small { display: block; font-weight: 400; font-size: 10.5px;
    color: #b9c3d4; letter-spacing: .1px; }
  .marke .stiel { position: absolute; left: -1px; top: -28px; width: 2px; height: 28px;
    background: currentColor; opacity: .8; }
  /* Kreaturen bekommen ihren Zettel nach unten. Sie stehen fast immer dicht
   * neben einem Schleim, und zwei Zettel uebereinander liest niemand. */
  .marke.unten .zettel { top: 28px; transform: translate(-50%, 0); }
  .marke.unten .stiel { top: 0; }
  .marke.blau { color: #6fa8ff; }
  .marke.rot { color: #ff7d6d; }
  .marke.kreatur { color: #ffd166; }
  .lupen { display: flex; flex-direction: column; gap: 8px; margin: 8px 10px 2px; }
  .lupe .titel { font-size: 11.5px; color: #8b96aa; margin-bottom: 4px;
    text-transform: uppercase; letter-spacing: .6px; }
  .lupe .glas { border: 1px solid #3a4152; border-radius: 4px; background-repeat: no-repeat;
    background-color: #05070a; max-width: 100%; }
  figcaption { padding: 7px 10px 9px; font-size: 12px; color: #aab4c8;
    border-top: 1px solid #21262f; font-variant-numeric: tabular-nums; }
  figcaption b { color: #eef2f8; font-weight: 650; }
  figcaption .zeile { display: block; }
  figcaption .gut { color: #7fd4a8; }
  figcaption .warn { color: #ffb066; }
  pre { margin: 0; padding: 10px 12px; font: 12px/1.5 Consolas, monospace;
    color: #cfd8e6; white-space: pre-wrap; word-break: break-word; }
  footer { padding: 10px 20px 20px; color: #7c8697; font-size: 12px; max-width: 1500px; }
  footer .titel { color: #aab4c8; font-weight: 650; }
`;

function karteHtml(k) {
  const teile = [];
  teile.push(`<figure>`);
  teile.push(`<div class="gruppe"><span class="wer ${k.spur || 'c0'}">${HTML_ESC(k.gruppe)}</span>`
           + `<span class="wann">${HTML_ESC(k.wann || '')}</span></div>`);

  if (k.text !== undefined) {
    teile.push(`<pre>${HTML_ESC(k.text)}</pre>`);
  } else {
    teile.push(`<div class="rahmen"><img src="../roh/${k.bild}" alt="">`);
    for (const m of (k.marken || [])) {
      const l = (m.x / W * 100).toFixed(3), t = (m.y / H * 100).toFixed(3);
      teile.push(`<div class="marke ${m.klasse}" style="left:${l}%;top:${t}%">`
        + `<i class="ring"></i><i class="stiel"></i>`
        + `<span class="zettel">${HTML_ESC(m.text)}`
        + (m.unter ? `<small>${HTML_ESC(m.unter)}</small>` : '') + `</span></div>`);
    }
    teile.push(`</div>`);
  }

  const lupen = (k.lupen || []).filter(l => l && l.rechteck);
  if (lupen.length) {
    teile.push(`<div class="lupen">` + lupen.map(l => {
      const r = l.rechteck;
      // Nie breiter als die Spalte: sonst schneidet der Kasten den Ausschnitt
      // ab, statt ihn zu zeigen.
      const z = Math.min(l.zoom || 2, (l.maxBreite || 620) / Math.max(r.w, 1));
      return `<div class="lupe"><div class="titel">${HTML_ESC(l.titel || 'Ausschnitt')}</div>`
        + `<div class="glas" style="width:${Math.round(r.w * z)}px;height:${Math.round(r.h * z)}px;`
        + `background-image:url(../roh/${k.bild});`
        + `background-size:${Math.round(W * z)}px ${Math.round(H * z)}px;`
        + `background-position:${-Math.round(r.x * z)}px ${-Math.round(r.y * z)}px"></div></div>`;
    }).join('') + `</div>`);
  }

  if (k.zeilen && k.zeilen.length) {
    teile.push(`<figcaption>` + k.zeilen.map(z => {
      if (typeof z === 'string') return `<span class="zeile">${HTML_ESC(z)}</span>`;
      return `<span class="zeile ${z.klasse || ''}">${HTML_ESC(z.text)}</span>`;
    }).join('') + `</figcaption>`);
  }
  teile.push(`</figure>`);
  return teile.join('');
}

function belegSchreiben(datei, { titel, unter, kopf, spalten, karten, fuss }) {
  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${HTML_ESC(titel)}</title>
<style>${STIL}</style></head><body>
<header>
  <h1>${HTML_ESC(titel)}</h1>
  <div class="unter">${HTML_ESC(unter)}</div>
  <div class="kopfzeile">${(kopf || []).map(z => `<b>${HTML_ESC(z.k)}</b> ${HTML_ESC(z.v)}`).join(' &nbsp;·&nbsp; ')}</div>
</header>
<div class="raster" style="grid-template-columns:repeat(${spalten}, 1fr)">
${karten.map(karteHtml).join('\n')}
</div>
${(fuss || []).map(f => `<footer><span class="titel">${HTML_ESC(f.titel)}</span> ${HTML_ESC(f.text)}</footer>`).join('')}
<script>
(function () {
  const bilder = [...document.images];
  let offen = bilder.length;
  if (!offen) { window.__fertig = true; return; }
  for (const b of bilder) {
    if (b.complete) { if (--offen === 0) window.__fertig = true; continue; }
    b.onload = b.onerror = () => { if (--offen === 0) window.__fertig = true; };
  }
})();
</script>
</body></html>`;
  fs.writeFileSync(datei, html);
  return datei;
}

async function belegSchiessen(browser, statikPort, seitenDatei, zielPng, breite = 1900) {
  const seite = await browser.newPage();
  await seite.setViewport({ width: breite, height: 1200, deviceScaleFactor: 1 });
  const rel = path.relative(ROOT, seitenDatei).replace(/\\/g, '/');
  await seite.goto(`http://127.0.0.1:${statikPort}/${rel}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await seite.waitForFunction('window.__fertig === true', { timeout: 30000 });
  const h = await seite.evaluate(() => document.body.scrollHeight);
  await seite.setViewport({ width: breite, height: Math.min(h + 20, 14000), deviceScaleFactor: 1 });
  await seite.screenshot({ path: zielPng, fullPage: true });
  await seite.close();
  return zielPng;
}

function pruefung(beleg, titel, bestanden, belege_) {
  pruefungen.push({ beleg, titel, bestanden: !!bestanden, ...belege_ });
  console.log(`  ${bestanden ? 'zeigt es' : 'ZEIGT ES NICHT'}  ${titel}`);
  return !!bestanden;
}

/* --- Hauptlauf ------------------------------------------------------------- */

const beginn = Date.now();
let statik = null, spielserver = null, browserA = null, browserB = null, spielPort = 0;

try {
  ordnerLeeren(ROH);
  ordnerLeeren(SEITEN);
  fs.mkdirSync(DATEN, { recursive: true });
  for (const n of [EINS.name, ZWEI.name, DAUER_NAME]) charakterLoeschen(n);

  statik = createServer();
  const statikPort = await listen(statik, 0);
  spielPort = await freierPort();
  const wsUrl = `ws://127.0.0.1:${spielPort}`;

  console.log(`Statik ${statikPort} · Spiel ${spielPort} · Startwert ${STARTWERT}\n`);
  spielserver = await spielserverStarten(spielPort);

  // Zwei eigene Browser: ein Hintergrundtab wuerde gedrosselt und liefe damit
  // langsamer als der andere Client — die Bilder waeren nicht mehr vergleichbar.
  browserA = await browserStarten();
  browserB = await browserStarten();
  const c1 = { seite: await seiteOeffnen(browserA, statikPort, 'C1', EINS), wer: EINS };
  const c2 = { seite: await seiteOeffnen(browserB, statikPort, 'C2', ZWEI), wer: ZWEI };

  await Promise.all([abklemmen(c1.seite), abklemmen(c2.seite)]);
  await verbinde(c1.seite, wsUrl, EINS);
  await verbinde(c2.seite, wsUrl, ZWEI);
  await warte(1200);

  /* Beide auf Level 10. Nicht Kosmetik, drei Gruende: mit 278 HP kann kein
   * zufaellig anrueckender Wolf die Vorfuehrung abbrechen; der groessere
   * Koerper (Groesse kommt ausschliesslich vom Level, GDD 01 §45) ist auf 26
   * Einheiten Kameradistanz noch als Schleim zu erkennen; und der Fressbeleg
   * braucht spaeter genau diese Stufe, ohne dass unterwegs noch einmal ein
   * "Stufe erreicht" ueber dem Bild haengt. */
  for (const c of [c1, c2]) {
    await c.seite.evaluate(() => window.Netz.testAufbau({ level: 10, xp: 0 }));
  }
  await warte(600);

  /* ================================================================== 1 */
  if (NUR.includes('bewegung')) {
    console.log('Beleg 1: zwei Spieler, Bewegung');

    // Spieler 2 auf seinen Zuschauerplatz. Erst danach die Kamera festsetzen.
    await c2.seite.evaluate((p) => window.SLIMORIA.api.moveTo(p.x, p.z), PARK);
    await warteBis(async () => {
      const l = await lage(c2.seite);
      return Math.hypot(l.eigen.x - PARK.x, l.eigen.z - PARK.z) < 0.9;
    }, 30000);
    await c2.seite.evaluate(() => window.SLIMORIA.api.stop());

    await kamera(c1.seite, SCHAU);
    await kamera(c2.seite, SCHAU);
    // Lange genug, damit die Einblendung "Stufe 8 erreicht" ausgelaufen ist.
    await warte(4500);

    const vorher = await paar(c1, c2, 'bewegung-vorher');

    await c1.seite.evaluate((z) => window.SLIMORIA.api.moveTo(z.x, z.z), ZIEL);
    // Kopfloses Chrome rechnet rund ein halbes Simulationssekunde je Wanduhr-
    // sekunde. Statt blind zu warten wird auf das Ankommen gewartet.
    const angekommen = await warteBis(async () => {
      const l = await lage(c1.seite);
      return Math.hypot(l.eigen.x - ZIEL.x, l.eigen.z - ZIEL.z) < 1.4;
    }, 45000);
    await c1.seite.evaluate(() => window.SLIMORIA.api.stop());
    await warte(2600);            // Glaettung bei Client 2 nachziehen lassen

    const nachher = await paar(c1, c2, 'bewegung-nachher');

    const sichtVor = vorher.b.lage.fremde.find(f => f.name === EINS.name) || null;
    const sichtNach = nachher.b.lage.fremde.find(f => f.name === EINS.name) || null;
    const weg2 = sichtVor && sichtNach ? Math.hypot(sichtNach.x - sichtVor.x, sichtNach.z - sichtVor.z) : 0;
    const weg1 = Math.hypot(nachher.a.lage.eigen.x - vorher.a.lage.eigen.x,
                            nachher.a.lage.eigen.z - vorher.a.lage.eigen.z);
    const abweichung = sichtNach
      ? Math.hypot(sichtNach.x - nachher.a.lage.eigen.x, sichtNach.z - nachher.a.lage.eigen.z) : 99;
    /* Der Weg IM BILD von Client 2 ist der eigentliche Punkt: er sagt, dass
     * man den Unterschied ansieht und nicht nur ausrechnet. */
    const bildWeg = sichtVor && sichtVor.bild && sichtNach && sichtNach.bild
      ? Math.hypot(sichtNach.bild.x - sichtVor.bild.x, sichtNach.bild.y - sichtVor.bild.y) : 0;

    const ok = pruefung('bewegung', 'Client 2 zeigt die Bewegung von Client 1',
      angekommen && weg1 > 10 && weg2 > 10 && abweichung < 2.0 && bildWeg > 150,
      { angekommen, wegBeiClient1: +weg1.toFixed(2), wegBeiClient2: +weg2.toFixed(2),
        abweichungWelt: +abweichung.toFixed(2), wegImBildVonClient2: Math.round(bildWeg),
        positionen: { vorher: sichtVor, nachher: sichtNach } });

    const bau = (spur, gruppe, wann, l, bildname) => ({
      gruppe, spur, wann,
      bild: bildname,
      // Nur die beiden Schleime beschriften: die Kreaturen der Arena haben mit
      // der Aussage dieses Belegs nichts zu tun und verdecken sie nur.
      marken: marken(l),
      zeilen: [
        `eigener Schleim ${l.eigen.name}: x ${l.eigen.x.toFixed(1)} · z ${l.eigen.z.toFixed(1)}`,
        ...l.fremde.map(f => `fremder Schleim ${f.name}: x ${f.x.toFixed(1)} · z ${f.z.toFixed(1)}`),
        { text: `Verbindung: ${l.verbunden ? 'steht' : 'GETRENNT'}`, klasse: l.verbunden ? 'gut' : 'warn' },
      ],
    });

    const seitenDatei = belegSchreiben(path.join(SEITEN, 'bewegung.html'), {
      titel: 'Zwei gleichzeitig verbundene Spieler — Bewegung',
      unter: 'Beide Clients laufen in getrennten Browsern am selben Server und blicken mit '
           + 'identisch gesetzter, fest stehender Kamera auf dieselbe Stelle der Arena. '
           + `${EINS.name} (blau) laeuft von (0,0) nach (${ZIEL.x},${ZIEL.z}); ${ZWEI.name} (rot) steht `
           + `bei (${PARK.x},${PARK.z}) still und sieht zu. `
           + 'Die linke Spalte ist der Zustand vorher, die rechte derselbe Augenblick nach dem Lauf. '
           + 'Die Sprechblasen sitzen auf den Bildpunkten, die die Kameramatrix des jeweiligen Clients liefert.',
      kopf: [
        { k: 'Aufgenommen', v: zeitstempel() },
        { k: 'Aufloesung', v: '1600 × 900 je Client' },
        { k: 'Server', v: `ws://127.0.0.1:${spielPort} (Startwert ${STARTWERT})` },
        { k: 'Bildpaare', v: `beide Clients innerhalb von ${vorher.spanneMs} bzw. ${nachher.spanneMs} ms` },
      ],
      spalten: 2,
      karten: [
        bau('c1', `Client 1 — ${EINS.name}`, 'vorher', vorher.a.lage, vorher.a.bild),
        bau('c1', `Client 1 — ${EINS.name}`, 'nachher', nachher.a.lage, nachher.a.bild),
        bau('c2', `Client 2 — ${ZWEI.name}`, 'vorher', vorher.b.lage, vorher.b.bild),
        bau('c2', `Client 2 — ${ZWEI.name}`, 'nachher', nachher.b.lage, nachher.b.bild),
      ],
      fuss: [{
        titel: 'Was das belegt:',
        text: `Client 1 hat sich um ${weg1.toFixed(1)} Einheiten bewegt. Client 2 hat den fremden `
            + `Schleim um ${weg2.toFixed(1)} Einheiten mitgezogen — im Bild sind das `
            + `${Math.round(bildWeg)} Bildpunkte — und weicht am Ende um ${abweichung.toFixed(2)} `
            + `Einheiten von der Position ab, die Client 1 fuer sich selbst fuehrt. `
            + `Client 2 hat nie eine Taste gedrueckt; alles, was er zeigt, kam ueber den Server.`,
      }],
    });
    const png = await belegSchiessen(browserA, statikPort, seitenDatei, path.join(AUS, 'bewegung.png'));
    belege.push({ name: 'bewegung', bild: path.relative(ROOT, png), seite: path.relative(ROOT, seitenDatei), bestanden: ok });
    console.log('  -> ' + path.relative(ROOT, png) + '\n');
  }

  /* ================================================================== 2 */
  if (NUR.includes('fressen')) {
    console.log('Beleg 2: Fressversuch, von beiden Clients gesehen');

    /* Der Zuschauer stellt sich zuerst dazu. Ohne das steht er zwanzig
     * Einheiten weit weg, und seine drei Bilder zeigen zwar den Vorgang, aber
     * nicht ihn selbst — man saehe dem Beleg nicht an, dass da wirklich ein
     * zweiter Spieler steht. Bei dieser Kamera ist -x die Bildrechte, der
     * Zuschauer landet also rechts neben Spieler 1. */
    const vorPos = (await lage(c1.seite)).eigen;
    const zuschauerPlatz = { x: vorPos.x - 4.2, z: vorPos.z - 0.6 };
    await c2.seite.evaluate((p) => window.SLIMORIA.api.moveTo(p.x, p.z), zuschauerPlatz);
    await warteBis(async () => {
      const l = await lage(c2.seite);
      return Math.hypot(l.eigen.x - zuschauerPlatz.x, l.eigen.z - zuschauerPlatz.z) < 1.1;
    }, 45000);
    await c2.seite.evaluate(() => window.SLIMORIA.api.stop());

    /* Level 10 gegen einen Gegner auf Level 1: nach GDD 01 §25 ist das der
     * Fall mit 100 % Chance. Der Ausgang steht damit fest, ohne dass irgendwo
     * am Wuerfel gedreht wird — der Server rechnet ihn wie immer selbst aus.
     * Die Stufe ist dieselbe wie vorher, sonst haengt ein "Stufe erreicht"
     * ueber dem ersten Bild. */
    const aufbau = await c1.seite.evaluate(() => window.Netz.testAufbau({
      level: 10, xp: 0, abstand: 2.4,
      kreatur: { art: 'wolf', level: 1, hpAnteil: 0.35 },
    }));
    await warteBis(async () => (await lage(c1.seite)).kreaturen.some(k => k.id === aufbau.ziel), 12000);
    await c1.seite.evaluate((id) => { window.G.zielId = id; }, aufbau.ziel);
    await warte(900);

    const l0 = await lage(c1.seite), l0b = await lage(c2.seite);
    const beute = l0.kreaturen.find(k => k.id === aufbau.ziel) || { x: l0.eigen.x + 2.4, z: l0.eigen.z };
    // Kameraziel in die Mitte aller drei Beteiligten, damit keiner am Rand steht.
    const xs = [l0.eigen.x, beute.x, l0b.eigen.x], zs = [l0.eigen.z, beute.z, l0b.eigen.z];
    const nah = {
      tx: (Math.min(...xs) + Math.max(...xs)) / 2, ty: 0,
      tz: (Math.min(...zs) + Math.max(...zs)) / 2,
      yaw: -Math.PI / 2, pitch: 0.38, dist: 14, follow: false,
    };
    await kamera(c1.seite, nah);
    await kamera(c2.seite, nah);
    await warte(2500);

    const vorher = await paar(c1, c2, 'fressen-vorher');

    await c1.seite.evaluate(() => window.SLIMORIA.api.tryEat({}));
    // Auf die Umschlingung warten (GDD 01 §28) — das ist der Augenblick, in
    // dem der Gegner sichtbar IN der Masse steckt.
    const umschlungen = await warteBis(async () => {
      const p = await c1.seite.evaluate(() => (window.Fressen && window.Fressen.phase) || '');
      return p === 'umschlingen' || p === 'absorbieren';
    }, 12000, 60);
    const waehrend = await paar(c1, c2, 'fressen-waehrend');

    await warteBis(async () => (await lage(c1.seite)).phase === 'frei', 25000);
    await warte(1200);
    const nachher = await paar(c1, c2, 'fressen-nachher');

    const urteil = (nachher.a.lage.fressProtokoll[0] || waehrend.a.lage.fressProtokoll[0] || null);
    const drin = (l) => l.kreaturen.some(k => k.id === aufbau.ziel && k.lebt);
    const c1Erfolg = !!(urteil && urteil.erfolg);
    const c2Vorher = drin(vorher.b.lage), c2Waehrend = drin(waehrend.b.lage), c2Nachher = drin(nachher.b.lage);

    const okC1 = pruefung('fressen', 'Client 1 spielt Umschlingung und Erfolg',
      umschlungen && c1Erfolg && !drin(nachher.a.lage),
      { umschlingungErreicht: umschlungen, serverurteil: urteil,
        unterphaseImBild: waehrend.a.lage.unterphase });

    const okC2 = pruefung('fressen', 'Client 2 sieht denselben Vorgang',
      c2Vorher && !c2Nachher,
      { zielBeiClient2: { vorher: c2Vorher, waehrend: c2Waehrend, nachher: c2Nachher },
        hinweis: c2Vorher && !c2Waehrend
          ? 'Der Gegner verschwindet bei Client 2 bereits im Augenblick des Urteils — '
            + 'die Umschlingung ist beim Zuschauer nicht zu sehen.'
          : 'Der Gegner steht bei Client 2 noch, waehrend Client 1 umschlingt.' });

    luecken.push('**Fressanimation beim Zuschauer.** In `fressen.png` zeigt die mittlere Spalte von '
      + 'Client 2 den fremden Schleim als ruhenden Koerper — kein Anlauf, kein Umschlingen, kein '
      + 'Rueckschnapp. ' + (c2Waehrend
        ? 'Der Gegner steht dort waehrend des Versuchs immerhin noch, der Vorgang hat also eine Dauer; '
          + 'was fehlt, ist die Phase des fremden Spielers im Zustand.'
        : 'Der Gegner faellt dort schon im Augenblick des Urteils aus der Welt; beim Zuschauer hat der '
          + 'Vorgang gar keine Dauer.'));

    const bau = (spur, gruppe, wann, l, bildname, extra = []) => ({
      gruppe, spur, wann, bild: bildname,
      marken: marken(l, { kreaturen: aufbau.ziel }),
      zeilen: [
        `Phase: ${l.phase}${l.unterphase ? ' / ' + l.unterphase : ''}`,
        (() => {
          const k = l.kreaturen.find(k => k.id === aufbau.ziel);
          return k && k.lebt
            ? `Ziel Nr. ${aufbau.ziel} in der Welt dieses Clients: ja (${k.hp}/${k.maxHp} HP)`
            : `Ziel Nr. ${aufbau.ziel} in der Welt dieses Clients: nein`;
        })(),
        `${l.eigen.name}: Level ${l.eigen.level} · ${l.eigen.xp}/${l.eigen.xpNaechstes} XP`,
        ...extra,
      ],
    });

    const urteilText = urteil
      ? `Serverurteil: Chance ${(urteil.chance * 100).toFixed(1)} %, Wurf ${urteil.augen}, `
        + `Wurf-Nr. ${urteil.wurfNr} — ${urteil.erfolg ? 'Erfolg' : 'Fehlschlag'}`
      : 'Kein Serverurteil eingetroffen';

    const seitenDatei = belegSchreiben(path.join(SEITEN, 'fressen.html'), {
      titel: 'Fressversuch — vom Server entschieden, von beiden Clients gesehen',
      unter: `${EINS.name} (Level 10) frisst einen Wolf auf Level 1 — nach GDD 01 §25 der Fall mit `
           + '100 % Chance, gewuerfelt hat trotzdem der Server. Beide Clients blicken mit identisch '
           + 'gesetzter, fest stehender Kamera auf dieselbe Stelle; die drei Spalten sind dieselben '
           + 'drei Augenblicke, jeweils in einem Zug von beiden Bildschirmen genommen.',
      kopf: [
        { k: 'Aufgenommen', v: zeitstempel() },
        { k: 'Aufloesung', v: '1600 × 900 je Client' },
        { k: 'Server', v: `ws://127.0.0.1:${spielPort} (Startwert ${STARTWERT})` },
        { k: 'Bildpaare', v: `${vorher.spanneMs} / ${waehrend.spanneMs} / ${nachher.spanneMs} ms Spanne` },
      ],
      spalten: 3,
      karten: [
        bau('c1', `Client 1 — ${EINS.name}`, 'vorher: Ziel gewaehlt', vorher.a.lage, vorher.a.bild),
        bau('c1', `Client 1 — ${EINS.name}`, 'waehrend: Umschlingen', waehrend.a.lage, waehrend.a.bild),
        bau('c1', `Client 1 — ${EINS.name}`, 'nachher: Gegner weg', nachher.a.lage, nachher.a.bild,
            [{ text: urteilText, klasse: urteil && urteil.erfolg ? 'gut' : 'warn' }]),
        bau('c2', `Client 2 — ${ZWEI.name}`, 'vorher (Zuschauer)', vorher.b.lage, vorher.b.bild),
        bau('c2', `Client 2 — ${ZWEI.name}`, 'waehrend (Zuschauer)', waehrend.b.lage, waehrend.b.bild),
        bau('c2', `Client 2 — ${ZWEI.name}`, 'nachher (Zuschauer)', nachher.b.lage, nachher.b.bild),
      ],
      fuss: [
        { titel: 'Was das belegt:',
          text: `Client 1 hat nur "ich will Nr. ${aufbau.ziel} fressen" geschickt. ${urteilText}. `
              + `Bei Client 2 stand der Gegner vorher ${c2Vorher ? 'in der Welt' : 'NICHT in der Welt'} `
              + `und ist nachher ${c2Nachher ? 'immer noch da' : 'daraus verschwunden'} — ohne dass `
              + `Client 2 etwas getan haette.` },
        { titel: 'Was es nicht belegt:',
          text: 'Die Fressanimation beim Zuschauer. '
              + (c2Waehrend
                 ? 'Der Gegner steht bei Client 2 waehrend des Versuchs noch, so weit stimmt die Welt. '
                 : 'Der Gegner faellt bei Client 2 schon im Augenblick des Urteils aus der Welt, der '
                   + 'Vorgang hat dort also gar keine Dauer. ')
              + 'Aber der fremde Schleim wird bei ihm als ruhender Koerper gezeichnet: kein Anlauf, '
              + 'kein Umschlingen, kein Rueckschnapp. Der Zustand eines fremden Spielers kommt ohne '
              + 'seine Phase beim Zuschauer an, deshalb kann dessen Client sie nicht abspielen.' },
      ],
    });
    const png = await belegSchiessen(browserA, statikPort, seitenDatei, path.join(AUS, 'fressen.png'), 2300);
    belege.push({ name: 'fressen', bild: path.relative(ROOT, png), seite: path.relative(ROOT, seitenDatei),
                  bestanden: okC1 && okC2 });
    console.log('  -> ' + path.relative(ROOT, png) + '\n');
  }

  /* ================================================================== 3 */
  if (NUR.includes('persistenz')) {
    console.log('Beleg 3: Charakter ueberlebt den Serverneustart');

    charakterLoeschen(DAUER_NAME);
    const dauerWer = { name: DAUER_NAME, faction: 'eldoran' };
    const cd = { seite: await seiteOeffnen(browserB, statikPort, 'CD', dauerWer), wer: dauerWer };
    await abklemmen(cd.seite);
    await verbinde(cd.seite, wsUrl, cd.wer);
    await warte(900);
    await kamera(cd.seite, { yaw: 0.75, pitch: 0.36, dist: 9.5, follow: true });

    /* Level und XP muessen VERDIENT sein, sonst belegt das Bild nur, dass man
     * Zahlen setzen kann. Der Wolf auf Level 5 wird mit dem Auto-Angriff
     * erschlagen — den Takt und den Schaden fuehrt der Server. */
    const aufbau = await cd.seite.evaluate(() => window.Netz.testAufbau({
      level: 1, xp: 0, abstand: 2.2,
      kreatur: { art: 'wolf', level: 5, hpAnteil: 0.05 },
    }));
    await warteBis(async () => (await lage(cd.seite)).kreaturen.some(k => k.id === aufbau.ziel), 12000);
    await cd.seite.evaluate((id) => { window.G.zielId = id; window.G.autoAngriff = true; }, aufbau.ziel);
    const gestiegen = await warteBis(async () => (await lage(cd.seite)).eigen.level >= 2, 40000);
    await cd.seite.evaluate(() => { window.G.autoAngriff = false; window.G.zielId = null; });
    await warte(5500);            // "Stufe 2 erreicht" auslaufen lassen

    const vorNeustart = await einzeln(cd.seite, 'persistenz-1-vorher');

    // Trennen zuerst: der Server sichert beim Schliessen der Verbindung.
    await cd.seite.evaluate(() => window.Netz.trennen());
    await warte(900);
    const aufPlatte = charakterLesen(DAUER_NAME);

    /* Frisch geladener Client, noch ohne Verbindung: er bringt Level 1 mit.
     * `abklemmen` raeumt den Verbindungsversuch weg, den net.js beim Laden von
     * selbst unternimmt — sonst haenge das Bild davon ab, ob zufaellig ein
     * anderer Server auf dem Standardport lauscht. */
    await neuLaden(cd.seite, dauerWer);
    await abklemmen(cd.seite);
    await kamera(cd.seite, { yaw: 0.75, pitch: 0.36, dist: 9.5, follow: true });
    await warte(900);
    const ohneServer = await einzeln(cd.seite, 'persistenz-2-frisch');

    const pidAlt = spielserver.pid;
    await spielserverStoppen(spielserver);
    spielserver = null;
    await warte(900);
    spielserver = await spielserverStarten(spielPort);
    const pidNeu = spielserver.pid;
    await warte(500);

    await verbinde(cd.seite, wsUrl, cd.wer);
    await kamera(cd.seite, { yaw: 0.75, pitch: 0.36, dist: 9.5, follow: true });
    /* Beim Verbinden lernt der Client vom Server, dass er Level 2 ist, und
     * blendet dafuer "Stufe 2 erreicht" ein — richtig so, aber es gehoert
     * nicht ueber den Beleg. */
    await warte(6500);
    const nachNeustart = await einzeln(cd.seite, 'persistenz-3-nachher');
    await cd.seite.close();

    const v = vorNeustart.lage.eigen, o = ohneServer.lage.eigen, n = nachNeustart.lage.eigen;
    const ok = pruefung('persistenz', 'Level und XP stehen nach dem Neustart wieder im HUD',
      gestiegen && v.level >= 2 && n.level === v.level && n.xp === v.xp
      && o.level === 1 && o.xp === 0 && !ohneServer.lage.verbunden
      && nachNeustart.lage.verbunden && !!aufPlatte && pidAlt !== pidNeu,
      { vorNeustart: { level: v.level, xp: v.xp, hud: vorNeustart.lage.hud.xp },
        frischOhneServer: { level: o.level, xp: o.xp, hud: ohneServer.lage.hud.xp },
        nachNeustart: { level: n.level, xp: n.xp, hud: nachNeustart.lage.hud.xp },
        aufPlatte, prozesse: { vorher: pidAlt, nachher: pidNeu } });

    /* Zwei getrennte Lupen statt einer grossen: zwischen Spielerrahmen und
     * XP-Leiste liegt der halbe Bildschirm, ein gemeinsamer Ausschnitt waere
     * zu neun Zehnteln Boden — und genau die beiden Zahlen, um die es geht,
     * waeren darin briefmarkengross. */
    const lupen = (l) => [
      { rechteck: l.hud.rahmen || { x: 14, y: 736, w: 330, h: 74 }, zoom: 2.2,
        titel: 'HUD links unten: Level und Name' },
      { rechteck: l.hud.xpLeiste || { x: 640, y: 872, w: 320, h: 20 }, zoom: 3.0,
        titel: 'HUD unten: XP-Leiste' },
    ];
    const bau = (gruppe, wann, s, spur, extra = []) => ({
      gruppe, wann, spur, bild: s.bild,
      marken: marken(s.lage),
      lupen: lupen(s.lage),
      zeilen: [
        `HUD: Level ${s.lage.hud.level} · ${s.lage.hud.xp}`,
        `Zustand im Client: Level ${s.lage.eigen.level} · ${s.lage.eigen.xp}/${s.lage.eigen.xpNaechstes} XP`,
        { text: `Verbindung: ${s.lage.verbunden ? 'steht' : 'keine'}`,
          klasse: s.lage.verbunden ? 'gut' : 'warn' },
        ...extra,
      ],
    });

    const seitenDatei = belegSchreiben(path.join(SEITEN, 'persistenz.html'), {
      titel: 'Persistenter Charakter — Level und XP ueberleben den Serverneustart',
      unter: `${DAUER_NAME} erschlaegt mit dem Auto-Angriff einen Wolf auf Level 5 und steigt dabei auf. `
           + 'Danach wird der Serverprozess hart beendet und neu gestartet. In der Mitte steht der '
           + 'entscheidende Gegenbeweis: derselbe, frisch geladene Client OHNE Verbindung zeigt Level 1 '
           + 'und 0 XP — die Zahlen rechts kommen also nicht aus dem Browser, sondern vom Server.',
      kopf: [
        { k: 'Aufgenommen', v: zeitstempel() },
        { k: 'Aufloesung', v: '1600 × 900' },
        { k: 'Serverprozess', v: `${pidAlt} beendet → ${pidNeu} neu gestartet, Port ${spielPort}` },
        { k: 'Datei', v: path.relative(ROOT, path.join(DATEN, DAUER_NAME + '.json')).replace(/\\/g, '/') },
      ],
      spalten: 3,
      karten: [
        bau(`1 — vor dem Neustart`, 'verbunden mit Prozess ' + pidAlt, vorNeustart, 'c1',
            [{ text: 'Level und XP stammen aus einer erschlagenen Kreatur, nicht aus dem Client.', klasse: 'gut' }]),
        bau(`2 — Gegenprobe`, 'Seite neu geladen, keine Verbindung', ohneServer, 'c0',
            [{ text: 'Der Client allein weiss nichts: Level 1, 0 XP.', klasse: 'warn' }]),
        bau(`3 — nach dem Neustart`, 'verbunden mit Prozess ' + pidNeu, nachNeustart, 'c2',
            [{ text: 'Derselbe Stand wie in Spalte 1 — vom neuen Serverprozess geliefert.', klasse: 'gut' }]),
        { gruppe: 'Was auf der Platte steht', spur: 'c0',
          wann: path.relative(ROOT, path.join(DATEN, DAUER_NAME + '.json')).replace(/\\/g, '/'),
          text: JSON.stringify(aufPlatte, null, 2) },
      ],
      fuss: [{
        titel: 'Was das belegt:',
        text: `Vor dem Neustart Level ${v.level} mit ${v.xp} XP, nach dem Neustart Level ${n.level} `
            + `mit ${n.xp} XP — dazwischen ein anderer Serverprozess (${pidAlt} → ${pidNeu}) und ein `
            + `Client, der beim Neuladen nur Level ${o.level} und ${o.xp} XP mitbrachte.`,
      }],
    });
    const png = await belegSchiessen(browserA, statikPort, seitenDatei, path.join(AUS, 'persistenz.png'), 2300);
    belege.push({ name: 'persistenz', bild: path.relative(ROOT, png), seite: path.relative(ROOT, seitenDatei), bestanden: ok });
    console.log('  -> ' + path.relative(ROOT, png) + '\n');
  }

  /* --- BELEG.md und JSON --------------------------------------------------- */

  const alleGut = belege.length > 0 && belege.every(b => b.bestanden);
  const satz = {
    bewegung: 'Vier Bildschirme aus zwei getrennten Browsern, je Spalte derselbe Augenblick: der blaue '
            + 'Schleim steht links im Bild und nach dem Lauf bei BEIDEN Clients rechts im Bild — Client 2 '
            + 'hat dabei nichts getan ausser zuzusehen.',
    fressen: 'Sechs Bildschirme: Client 1 waehlt den Wolf, umschlingt ihn und steht danach ohne Gegner da; '
           + 'Client 2 sieht denselben Wolf in seiner Welt und danach dieselbe Luecke. Das Urteil des '
           + 'Servers (Chance, Wurf, Wurf-Nummer) steht unter der rechten Spalte.',
    persistenz: 'Drei Bildschirme mit vergroessertem HUD: Level und XP vor dem Neustart, Level 1 und 0 XP '
              + 'im frisch geladenen Client ohne Verbindung, und nach dem Neustart wieder derselbe Stand. '
              + 'Darunter die Charakterdatei, die der Server auf die Platte geschrieben hat.',
  };

  const md = [
    '# Netzbelege — Abnahmeliste B (GDD 11 §121)',
    '',
    `Erzeugt von \`tools/netzbild.mjs\` am ${zeitstempel()}. Zwei kopflose Chrome-Clients bei`,
    `1600 × 900 an einem Serverprozess. Rohbilder in \`roh/\`, die Belegseiten in \`seite/\`.`,
    '',
    ...belege.map(b => [
      `## ${b.name} — ${b.bestanden ? 'belegt' : 'UNVOLLSTAENDIG'}`,
      '',
      `![${b.name}](${path.basename(b.bild)})`,
      '',
      satz[b.name] || '',
      '',
    ].join('\n')),
    '## Pruefungen',
    '',
    '| Beleg | Aussage | Ergebnis |',
    '|---|---|---|',
    ...pruefungen.map(p => `| ${p.beleg} | ${p.titel} | ${p.bestanden ? 'zeigt es' : 'zeigt es nicht'} |`),
    '',
    `Messwerte zu jeder Zeile: \`netzbild.json\`.`,
    '',
    ...(luecken.length ? ['## Was die Bilder nicht hergeben', '', ...luecken.map(l => '* ' + l), ''] : []),
  ].join('\n');
  fs.writeFileSync(path.join(AUS, 'BELEG.md'), md);

  fs.writeFileSync(path.join(AUS, 'netzbild.json'), JSON.stringify({
    werkzeug: 'tools/netzbild.mjs',
    zeitpunkt: zeitstempel(),
    startwert: STARTWERT, spielPort,
    aufloesung: `${W}x${H}`,
    charaktere: { client1: EINS, client2: ZWEI, dauer: DAUER_NAME },
    belege, pruefungen, luecken, seitenfehler,
    alleBelegt: alleGut,
    dauerSekunden: +((Date.now() - beginn) / 1000).toFixed(1),
  }, null, 1));

  console.log(`${belege.filter(b => b.bestanden).length}/${belege.length} Belege zeigen, was sie behaupten`);
  console.log('-> ' + path.relative(ROOT, path.join(AUS, 'BELEG.md')));
  if (seitenfehler.length) {
    console.log('\nSeitenfehler:');
    for (const f of seitenfehler.slice(0, 20)) console.log('  ' + f);
  }
  process.exitCode = alleGut ? 0 : 1;

} catch (e) {
  console.error('Abbruch:', e && e.stack ? e.stack : e);
  try {
    fs.mkdirSync(AUS, { recursive: true });
    fs.writeFileSync(path.join(AUS, 'netzbild.json'), JSON.stringify({
      werkzeug: 'tools/netzbild.mjs', abbruch: String((e && e.message) || e),
      belege, pruefungen, seitenfehler, alleBelegt: false,
    }, null, 1));
  } catch {}
  process.exitCode = 1;
} finally {
  if (browserA) await browserA.close().catch(() => {});
  if (browserB) await browserB.close().catch(() => {});
  await spielserverStoppen(spielserver);
  if (statik) statik.close();
}
