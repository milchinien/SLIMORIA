/* _aufprall_probe.mjs — misst die 3D-Form beim Aufprall in Hoehenbaendern.
 *
 * Nicht die Silhouette (die haengt an der Kamera), sondern der Koerper selbst:
 * fuer jedes Hoehenband der groesste waagerechte Abstand vom Schwerpunkt.
 * Damit ist nachmessbar, was das Urteil verlangt: "die Grundflaeche um
 * denselben Faktor verbreitern".
 *
 *   node tools/_aufprall_probe.mjs
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

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
         '--use-angle=swiftshader', '--use-gl=angle', '--window-size=800,450'],
});
const fehler = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450, deviceScaleFactor: 1 });
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1`,
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });

  const zeiten = [0.9, 0.95, 1.0, 1.03, 1.06, 1.09, 1.12, 1.2, 1.36, 1.7, 2.2, 2.6];
  const daten = await page.evaluate(async (zeiten) => {
    const S = window.SLIMORIA, api = S.api;
    api.reset({ seed: 1, level: 1 });
    api.setHudVisible(false);
    api.setCamera({ yaw: 0.5, pitch: 0.12, dist: 7, follow: true });
    api.dropFrom(6.5);
    const raus = [];
    let t = 0; const dt = 1 / 240; let iz = 0;
    while (t < 3.2 && iz < zeiten.length) {
      S.step(dt); t += dt;
      if (t >= zeiten[iz]) {
        const b = window.G.slime.body;
        const P = window.PARAMS;
        // Hoehenbaender ueber die tatsaechliche Koerperhoehe
        let yLo = 1e9, yHi = -1e9;
        for (let i = 0; i < b.n; i++) { const y = b.pos[i*3+1]; if (y<yLo) yLo=y; if (y>yHi) yHi=y; }
        const NB = 12, prof = new Array(NB).fill(0);
        for (let i = 0; i < b.n; i++) {
          const y = b.pos[i*3+1];
          let k = Math.floor((y - yLo) / Math.max(yHi - yLo, 1e-6) * NB);
          if (k >= NB) k = NB - 1; if (k < 0) k = 0;
          const r = Math.hypot(b.pos[i*3] - b.cx, b.pos[i*3+2] - b.cz);
          if (r > prof[k]) prof[k] = r;
        }
        const rMax = Math.max(...prof);
        // Aufstandsflaeche: groesster waagerechter Abstand aller Punkte unter
        // 8 % der Koerperhoehe ueber dem Boden.
        let rFuss = 0, nFuss = 0;
        for (let i = 0; i < b.n; i++) {
          if (b.pos[i*3+1] > yLo + 0.08 * (yHi - yLo)) continue;
          nFuss++;
          const r = Math.hypot(b.pos[i*3] - b.cx, b.pos[i*3+2] - b.cz);
          if (r > rFuss) rFuss = r;
        }
        const m = api.metrics();
        raus.push({
          t: +zeiten[iz].toFixed(2),
          sq: m.squash, br: m.breite, vol: m.volumen,
          hoehe: +(yHi - yLo).toFixed(3), rMax: +rMax.toFixed(3),
          // Der entscheidende Wert: Aufstandsradius / groesster Radius
          fussAnteil: +(rFuss / Math.max(rMax, 1e-6)).toFixed(3),
          // Profil von unten nach oben, Anteil des groessten Radius
          prof: prof.map(v => +(v / Math.max(rMax, 1e-6)).toFixed(2)),
          breitestBei: +(1 - (prof.indexOf(rMax) + 0.5) / NB).toFixed(2),
        });
        iz++;
      }
    }
    return raus;
  }, zeiten);
  for (const d of daten) console.log(JSON.stringify(d));
} finally {
  await browser.close(); server.close();
}
if (fehler.length) { console.error('Seitenfehler:', fehler.join(' | ')); process.exit(1); }
