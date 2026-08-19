/* Scratch-Werkzeug fuer Lane SCHLEIM / schattenform.
 *
 *   node tools/_schattenform_probe.mjs BILD --zeile 700 --von 900 --bis 1300
 *   node tools/_schattenform_probe.mjs BILD --spalte 450 --von 700 --bis 800
 *   node tools/_schattenform_probe.mjs BILD --rect x,y,w,h        (Mittelwert)
 *
 * Gibt rohe RGB je Pixel entlang des Schnitts aus, plus L.
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
const datei = argv.find(a => !a.startsWith('--'));
const absDatei = path.resolve(datei);

const opt = {
  zeile: flag('zeile') === null ? null : Number(flag('zeile')),
  spalte: flag('spalte') === null ? null : Number(flag('spalte')),
  von: flag('von') === null ? null : Number(flag('von')),
  bis: flag('bis') === null ? null : Number(flag('bis')),
  rect: flag('rect'),
  schritt: Number(flag('schritt', 1)),
};

function messen(o) {
  const img = document.getElementById('bild');
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, w, h).data;
  const L = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (o.rect) {
    const [x, y, rw, rh] = o.rect.split(',').map(Number);
    let R = 0, G = 0, B = 0, n = 0;
    let minL = 1e9, maxL = -1e9;
    for (let yy = y; yy < y + rh; yy++) {
      for (let xx = x; xx < x + rw; xx++) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const i = (yy * w + xx) * 4;
        R += d[i]; G += d[i + 1]; B += d[i + 2]; n++;
        const l = L(d[i], d[i + 1], d[i + 2]);
        if (l < minL) minL = l; if (l > maxL) maxL = l;
      }
    }
    return { modus: 'rect', bild: [w, h], n,
      mittel: [R / n, G / n, B / n].map(v => Math.round(v * 10) / 10),
      L: Math.round(L(R / n, G / n, B / n) * 10) / 10,
      Lmin: Math.round(minL * 10) / 10, Lmax: Math.round(maxL * 10) / 10 };
  }

  const senkrecht = o.spalte !== null;
  const idx = senkrecht ? o.spalte : o.zeile;
  const laenge = senkrecht ? h : w;
  const von = Math.max(0, o.von === null ? 0 : o.von);
  const bis = Math.min(laenge - 1, o.bis === null ? laenge - 1 : o.bis);
  const reihe = [];
  for (let t = von; t <= bis; t += o.schritt) {
    const x = senkrecht ? idx : t;
    const y = senkrecht ? t : idx;
    const i = (y * w + x) * 4;
    reihe.push([t, d[i], d[i + 1], d[i + 2], Math.round(L(d[i], d[i + 1], d[i + 2]) * 10) / 10]);
  }
  return { modus: senkrecht ? 'spalte' : 'zeile', bild: [w, h], idx, reihe };
}

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
         '--force-device-scale-factor=1', '--force-color-profile=srgb'],
});
let erg;
try {
  const page = await browser.newPage();
  const rel = path.relative(ROOT, absDatei).replace(/\\/g, '/');
  await page.setContent(
    `<style>html,body{margin:0;background:#000}</style>` +
    `<img id="bild" crossorigin="anonymous" src="http://127.0.0.1:${port}/${rel}">`,
    { waitUntil: 'load' });
  await page.waitForFunction('document.getElementById("bild").naturalWidth > 0', { timeout: 25000 });
  erg = await page.evaluate(messen, opt);
  await page.close();
} finally { await browser.close(); server.close(); }

if (erg.modus === 'rect') { console.log(JSON.stringify(erg)); }
else {
  console.log('# ' + erg.modus + ' ' + erg.idx + '  Bild ' + erg.bild.join('x'));
  for (const r of erg.reihe) console.log(String(r[0]).padStart(5) + ' : ' +
    String(r[1]).padStart(4) + String(r[2]).padStart(4) + String(r[3]).padStart(4) +
    '   L ' + String(r[4]).padStart(6));
}
