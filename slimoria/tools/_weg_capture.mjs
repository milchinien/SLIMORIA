/* ---------------------------------------------------------------------------
 * Aufnahme-Werkzeug.
 *
 * Startet den Prototyp in einem kopflosen Chrome, spielt ein Szenario in festen
 * Zeitschritten ab und schreibt frame-genaue Einzelbilder plus einen
 * Kontaktbogen. Kein Bild haengt an der Bildrate der Maschine — dieselbe
 * Eingabe ergibt immer dieselben Bilder.
 *
 *   node tools/capture.mjs <szenario> [--out ORDNER] [--seed N]
 *   node tools/capture.mjs --alle
 *   node tools/capture.mjs --liste
 * ------------------------------------------------------------------------- */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'gauntlet', 'shots');

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

function stamp() {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function launch() {
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

async function openGame(browser, port) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const fehler = [];
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`, {
    waitUntil: 'domcontentloaded', timeout: 30000,
  });

  try {
    await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
  } catch (e) {
    throw new Error('Spiel wurde nicht bereit.\n' + fehler.join('\n'));
  }
  return { page, fehler };
}

async function aufnehmen(page, szenario, outDir, seed) {
  fs.mkdirSync(outDir, { recursive: true });

  const info = await page.evaluate((n, s) => window.__cap.start(n, { seed: s }), szenario, seed);
  if (!info || info.fehler) throw new Error(`Szenario "${szenario}": ${info?.fehler || 'unbekannt'}`);

  const messwerte = [];
  const dateien = [];

  for (let i = 0; i < info.zeiten.length; i++) {
    const t = info.zeiten[i];
    const m = await page.evaluate((tt) => window.__cap.advanceTo(tt), t);
    const name = `frame_${String(i).padStart(3, '0')}.png`;
    await page.screenshot({ path: path.join(outDir, name), captureBeyondViewport: false });
    messwerte.push({ index: i, t: Math.round(t * 1000), ...m });
    dateien.push(name);
  }

  fs.writeFileSync(path.join(outDir, 'messwerte.json'), JSON.stringify(messwerte, null, 1));
  fs.writeFileSync(path.join(outDir, 'szene.json'), JSON.stringify({ szenario, seed, ...info }, null, 1));
  return { info, messwerte, dateien };
}

async function kontaktbogen(browser, port, outDirRel, dateien, titel, messwerte) {
  const page = await browser.newPage();
  const spalten = dateien.length <= 8 ? 4 : dateien.length <= 15 ? 5 : 6;
  const q = new URLSearchParams({
    dir: outDirRel.replace(/\\/g, '/'),
    n: String(dateien.length),
    titel,
    spalten: String(spalten),
    zeiten: messwerte.map(m => m.t).join(','),
    squash: messwerte.map(m => (m.squash ?? 0).toFixed(2)).join(','),
  });
  await page.setViewport({ width: 1800, height: 1200, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/tools/kontakt.html?${q}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction('window.__fertig === true', { timeout: 30000 });
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1800, height: Math.min(h + 20, 12000), deviceScaleFactor: 1 });
  const ziel = path.join(ROOT, outDirRel, 'kontakt.png');
  await page.screenshot({ path: ziel, fullPage: true });
  await page.close();
  return ziel;
}

/* --- Hauptlauf ------------------------------------------------------------ */

const server = createServer();
const port = await listen(server, 0);
const browser = await launch();

try {
  const { page, fehler } = await openGame(browser, port);
  const alle = await page.evaluate(() => Object.keys(window.__cap.szenarien));

  if (has('liste')) {
    const details = await page.evaluate(() =>
      Object.entries(window.__cap.szenarien).map(([k, v]) => ({ key: k, titel: v.titel, teil: v.teil || '-' })));
    for (const d of details) console.log(`${d.key.padEnd(22)} ${String(d.teil).padEnd(14)} ${d.titel}`);
    process.exit(0);
  }

  const wunsch = has('alle') ? alle : argv.filter(a => !a.startsWith('--') && alle.includes(a));
  if (!wunsch.length) {
    console.error('Kein gueltiges Szenario. Verfuegbar:\n  ' + alle.join('\n  '));
    process.exit(2);
  }

  const seed = Number(flag('seed', 1234));
  const zeit = stamp();
  const ergebnis = [];

  for (const s of wunsch) {
    const rel = path.join('gauntlet', 'shots', s, flag('out', zeit));
    const abs = path.join(ROOT, rel);
    process.stdout.write(`aufnehmen: ${s} ... `);
    const r = await aufnehmen(page, s, abs, seed);
    const kb = await kontaktbogen(browser, port, rel, r.dateien, r.info.titel || s, r.messwerte);
    console.log(`${r.dateien.length} Bilder -> ${path.relative(ROOT, kb)}`);
    ergebnis.push({ szenario: s, ordner: rel, bilder: r.dateien.length, kontakt: path.relative(ROOT, kb) });
  }

  if (fehler.length) {
    console.log('\nSeitenfehler waehrend der Aufnahme:');
    for (const f of fehler.slice(0, 20)) console.log('  ' + f);
  }
  console.log('\n' + JSON.stringify(ergebnis, null, 1));
} finally {
  await browser.close();
  server.close();
}
