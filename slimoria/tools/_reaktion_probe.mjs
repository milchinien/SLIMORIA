/* Wegwerfwerkzeug fuer Lane SCHLEIM / reaktion.js.
 *
 * Die vorhandenen Szenarien in client/capture.js (gesperrt) treffen zwei der
 * fuenf Zustaende nicht: „Erschoepfung bei wenig Leben" gibt es dort nirgends,
 * und ein Treffer wird nur aus zehn Metern gezeigt. Dieses Werkzeug haengt
 * eigene Szenarien zur Laufzeit in window.__cap.szenarien und nimmt sie mit
 * demselben Treiber auf.
 *
 *   node tools/_reaktion_probe.mjs --out reaktion-probe
 */
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

const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const OUT = flag('out', 'reaktion-probe');
const W = 1600, H = 900;

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
         '--use-angle=swiftshader', '--use-gl=angle',
         '--force-device-scale-factor=1', '--disable-lcd-text',
         '--force-color-profile=srgb', '--font-render-hinting=none',
         `--window-size=${W},${H}`],
});

const fehler = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`,
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });

  await page.evaluate(() => {
    const kam = { yaw: 1.10, pitch: 0.22, dist: 4.6, follow: true };
    window.__cap.szenarien['r-treffer'] = {
      teil: 'r-treffer', titel: 'Treffer nah', hud: false, kamera: kam,
      dauer: 2.0,
      bildZeiten: [0.30, 0.52, 0.56, 0.60, 0.66, 0.72, 0.80, 0.90, 1.00, 1.20, 1.50],
      skript: [{ t: 0.50, tu: a => a.damagePlayer(26) }],
    };
    window.__cap.szenarien['r-heilung'] = {
      teil: 'r-heilung', titel: 'Heilung nah', hud: false, kamera: kam,
      dauer: 2.0,
      bildZeiten: [0.30, 0.52, 0.58, 0.64, 0.70, 0.78, 0.86, 0.94, 1.02, 1.20, 1.50],
      skript: [
        { t: 0.10, tu: a => a.damagePlayer(40) },
        { t: 0.50, tu: a => a.healPlayer(35) },
      ],
    };
    window.__cap.szenarien['r-muede'] = {
      teil: 'r-muede', titel: 'Erschoepfung bei 15 Prozent Leben', hud: false, kamera: kam,
      dauer: 3.2,
      bildZeiten: [0.60, 0.80, 1.00, 1.20, 1.40, 1.60, 1.80, 2.00, 2.20, 2.60, 3.00],
      skript: [{ t: 0.20, tu: a => a.damagePlayer(68) }],
    };
    window.__cap.szenarien['r-prall'] = {
      teil: 'r-prall', titel: 'Prall nach dem Fressen', hud: false, kamera:
        { yaw: 1.32, pitch: 0.20, dist: 5.4, follow: true },
      dauer: 3.0,
      bildZeiten: [0.6, 0.9, 1.1, 1.25, 1.35, 1.45, 1.55, 1.7, 1.9, 2.2, 2.6],
      skript: [
        { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 1, x: 4.0, z: 0 }) },
        { t: 0.0, tu: a => a.selectTarget(1) },
        { t: 0.1, tu: a => a.tryEat({ erzwinge: 'erfolg' }) },
      ],
    };
    window.__cap.szenarien['r-tod'] = {
      teil: 'r-tod', titel: 'Erloeschen im Tod', hud: false, kamera: kam,
      dauer: 2.4,
      bildZeiten: [0.08, 0.14, 0.20, 0.30, 0.42, 0.55, 0.70, 0.90, 1.10, 1.40, 2.00],
      skript: [{ t: 0.05, tu: a => a.killPlayer() }],
    };
  });

  const namen = ['r-treffer', 'r-heilung', 'r-muede', 'r-prall', 'r-tod'];
  const zusammen = [];
  for (const n of namen) {
    const info = await page.evaluate((nn) => window.__cap.start(nn, { seed: 1234, renderer: 2 }), n);
    if (!info || info.fehler) throw new Error(n + ': ' + (info && info.fehler));
    const dir = path.join(ROOT, 'gauntlet', 'shots', n, OUT);
    fs.mkdirSync(dir, { recursive: true });
    const dateien = [], zeiten = [];
    for (let i = 0; i < info.zeiten.length; i++) {
      const m = await page.evaluate((tt) => window.__cap.advanceTo(tt), info.zeiten[i]);
      const name = `frame_${String(i).padStart(3, '0')}.png`;
      await page.screenshot({ path: path.join(dir, name) });
      dateien.push(name); zeiten.push(Math.round(info.zeiten[i] * 1000));
    }
    zusammen.push({ n, dir: path.relative(ROOT, dir), dateien, zeiten, titel: info.titel });
  }

  /* Kontaktboegen */
  for (const z of zusammen) {
    const p2 = await browser.newPage();
    const q = new URLSearchParams({
      dir: z.dir.replace(/\\/g, '/'), n: String(z.dateien.length),
      titel: z.titel, spalten: '6',
      zeiten: z.zeiten.join(','),
      squash: z.zeiten.map(() => '0').join(','),
    });
    await p2.setViewport({ width: 1800, height: 1200, deviceScaleFactor: 1 });
    await p2.goto(`http://127.0.0.1:${port}/tools/kontakt.html?${q}`,
      { waitUntil: 'networkidle0', timeout: 30000 });
    await p2.waitForFunction('window.__fertig === true', { timeout: 30000 });
    const h = await p2.evaluate(() => document.body.scrollHeight);
    await p2.setViewport({ width: 1800, height: Math.min(h + 20, 12000), deviceScaleFactor: 1 });
    await p2.screenshot({ path: path.join(ROOT, z.dir, 'kontakt.png'), fullPage: true });
    await p2.close();
    console.log(z.n + ' -> ' + path.join(z.dir, 'kontakt.png'));
  }
  await page.close();
} finally {
  await browser.close();
  server.close();
}
if (fehler.length) { console.error('SEITENFEHLER:\n' + fehler.join('\n')); process.exit(1); }
console.log('keine Seitenfehler.');
