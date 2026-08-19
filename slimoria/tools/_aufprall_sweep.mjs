/* _aufprall_sweep.mjs — probiert Parametersaetze fuer den Aufprall durch und
 * misst an jedem das Zeilenprofil der SILHOUETTE im Bild (nicht am Netz).
 * Nur ein Wegwerfwerkzeug fuer die Einstellung.
 *
 *   node tools/_aufprall_sweep.mjs saetze.json
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import url from 'node:url';
import path from 'node:path';
import { createServer, listen } from './serve.mjs';

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const saetze = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ZEITEN = [0.90, 0.95, 1.00, 1.06];
const W = 1600, H = 900;

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
         '--use-angle=swiftshader', '--use-gl=angle',
         '--force-device-scale-factor=1', `--window-size=${W},${H}`],
});
const fehler = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1`,
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });

  for (const satz of saetze) {
    const r = await page.evaluate(async (satz, ZEITEN) => {
      const S = window.SLIMORIA, api = S.api;
      const alt = {};
      for (const k in satz.p) { alt[k] = window.PARAMS[k]; window.PARAMS[k] = satz.p[k]; }
      api.reset({ seed: 1, level: 1 }); api.setHudVisible(false);
      api.setCamera({ yaw: 0.5, pitch: 0.12, dist: 7, follow: true });
      api.dropFrom(6.5);
      const cv = S.canvas || document.querySelector('canvas');
      const mess = document.createElement('canvas');
      mess.width = 1600; mess.height = 900;
      const mg = mess.getContext('2d', { willReadFrequently: true });
      const raus = [];
      let t = 0, iz = 0; const dt = 1 / 240;
      while (t < 1.3 && iz < ZEITEN.length) {
        S.step(dt); t += dt;
        if (t < ZEITEN[iz]) continue;
        S.render();
        mg.clearRect(0, 0, 1600, 900);
        mg.drawImage(cv, 0, 0, 1600, 900);
        const D = mg.getImageData(0, 0, 1600, 900).data;
        let x0 = 1600, x1 = -1, y0 = 900, y1 = -1;
        const treffer = [];
        for (let y = 0; y < 900; y++) {
          let a = -1, b = -1;
          for (let x = 0; x < 1600; x++) {
            const i = (y * 1600 + x) * 4, R = D[i], G = D[i+1], B = D[i+2];
            if (!(B > R + 70 && B > G + 32 && B > 90)) continue;
            if (a < 0) a = x; b = x;
          }
          treffer.push(a < 0 ? 0 : b - a + 1);
          if (a >= 0) { if (a < x0) x0 = a; if (b > x1) x1 = b; if (y < y0) y0 = y; if (y1 < y) y1 = y; }
        }
        const bh = y1 - y0 + 1, bw = x1 - x0 + 1;
        const z = treffer.slice(y0, y1 + 1);
        const maxW = Math.max(...z);
        let fl = 0; for (const v of z) fl += v;
        const bd = [];
        for (let i = 0; i < 20; i++) {
          const yA = Math.floor(i * bh / 20), yB = Math.max(yA + 1, Math.floor((i + 1) * bh / 20));
          let s = 0, n = 0; for (let y = yA; y < yB && y < z.length; y++) { s += z[y]; n++; }
          bd.push(n ? +(s / n / maxW).toFixed(2) : 0);
        }
        const m = api.metrics();
        raus.push({
          t: +ZEITEN[iz].toFixed(2), sq: m.squash, br: m.breite, vol: m.volumen,
          verh: +(bh / bw).toFixed(3), full: +(fl / (bw * bh)).toFixed(3),
          bMax: +(z.indexOf(maxW) / bh).toFixed(2),
          w85: +(z[Math.floor(bh * 0.85)] / maxW).toFixed(2),
          w92: +(z[Math.min(bh - 1, Math.floor(bh * 0.92))] / maxW).toFixed(2),
          bd,
        });
        iz++;
      }
      for (const k in alt) window.PARAMS[k] = alt[k];
      return raus;
    }, satz, ZEITEN);
    console.log('### ' + satz.name + ' ' + JSON.stringify(satz.p));
    for (const d of r) console.log('   ' + JSON.stringify(d));
  }
} finally { await browser.close(); server.close(); }
if (fehler.length) { console.error('Seitenfehler:', fehler.join(' | ')); process.exit(1); }
