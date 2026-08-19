/* Temporaeres Werkzeug: Massenvermessung von Referenzbildern.
 * node tools/_anime_sichten.mjs <ordner> [--json datei] [--glob .jpg]
 * Gibt je Bild eine Zeile mit Kennzahlen zur Vorauswahl aus. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createServer, listen } from './serve.mjs';

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const argv = process.argv.slice(2);
const dir = path.resolve(argv[0]);
const jsonOut = (() => { const i = argv.indexOf('--json'); return i >= 0 ? argv[i + 1] : null; })();

const dateien = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
if (!dateien.length) { console.error('keine Bilder in ' + dir); process.exit(2); }

const server = createServer(dir);
const port = await listen(server, 0);
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/__leer`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.setContent('<html><body></body></html>');

const ergebnis = [];
const BATCH = 25;
for (let s = 0; s < dateien.length; s += BATCH) {
  const teil = dateien.slice(s, s + BATCH).map(f => `http://127.0.0.1:${port}/${encodeURIComponent(f)}`);
  const r = await page.evaluate(async (urls) => {
    const rgb2hsv = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      let h = 0;
      if (d) {
        if (mx === r) h = ((g - b) / d) % 6;
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
      }
      return [h, mx ? d / mx : 0, mx];
    };
    const out = [];
    for (const u of urls) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const ok = await new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = u; });
      if (!ok) { out.push({ url: u, fehler: true }); continue; }
      const W = 200, H = Math.max(1, Math.round(200 * img.naturalHeight / img.naturalWidth));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, W, H);
      const d = cx.getImageData(0, 0, W, H).data;
      let n = 0, sumS = 0, sumV = 0;
      let himmel = 0, gruen = 0, weiss = 0, warm = 0, dunkel = 0, hell = 0;
      let obenR = 0, obenG = 0, obenB = 0, obenN = 0;
      let untenR = 0, untenG = 0, untenB = 0, untenN = 0;
      const lumas = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const [h, sv, v] = rgb2hsv(R, G, B);
          const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          lumas.push(L); n++; sumS += sv; sumV += v;
          if (h >= 185 && h <= 250 && sv > 0.15 && v > 0.45) himmel++;
          if (h >= 55 && h <= 165 && sv > 0.18) gruen++;
          if (v > 0.85 && sv < 0.16) weiss++;
          if ((h < 55 || h > 330) && sv > 0.25 && v > 0.4) warm++;
          if (L < 40) dunkel++;
          if (L > 200) hell++;
          if (y < H * 0.25) { obenR += R; obenG += G; obenB += B; obenN++; }
          if (y > H * 0.62) { untenR += R; untenG += G; untenB += B; untenN++; }
        }
      }
      lumas.sort((a, b) => a - b);
      const q = p => lumas[Math.min(lumas.length - 1, Math.floor(p * lumas.length))];
      const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
      out.push({
        url: u, w: img.naturalWidth, h: img.naturalHeight,
        sat: +(sumS / n).toFixed(3), val: +(sumV / n).toFixed(3),
        himmel: +(himmel / n).toFixed(3), gruen: +(gruen / n).toFixed(3),
        weiss: +(weiss / n).toFixed(3), warm: +(warm / n).toFixed(3),
        dunkel: +(dunkel / n).toFixed(3), hell: +(hell / n).toFixed(3),
        p1: Math.round(q(0.01)), p50: Math.round(q(0.5)), p99: Math.round(q(0.99)), min: Math.round(lumas[0]),
        oben: hex(obenR / obenN, obenG / obenN, obenB / obenN),
        unten: hex(untenR / untenN, untenG / untenN, untenB / untenN),
      });
    }
    return out;
  }, teil);
  for (const e of r) ergebnis.push({ ...e, datei: decodeURIComponent(e.url.split('/').pop()) });
  process.stderr.write(`\r${Math.min(s + BATCH, dateien.length)}/${dateien.length}`);
}
process.stderr.write('\n');

await browser.close();
server.close();

if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(ergebnis, null, 1));
for (const e of ergebnis) {
  if (e.fehler) { console.log(`${e.datei}\tFEHLER`); continue; }
  console.log([e.datei, `${e.w}x${e.h}`, `sat=${e.sat}`, `val=${e.val}`, `himmel=${e.himmel}`,
    `gruen=${e.gruen}`, `weiss=${e.weiss}`, `warm=${e.warm}`, `dunkel=${e.dunkel}`,
    `p1=${e.p1}`, `p50=${e.p50}`, `p99=${e.p99}`, `min=${e.min}`, `oben=${e.oben}`, `unten=${e.unten}`].join('\t'));
}
