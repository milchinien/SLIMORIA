/* Wegwerfwerkzeug fuer Lane SCHLEIM / reaktion.js.
 * Liest eine Bildzeile oder -spalte roh aus und gibt R,G,B je Pixel aus.
 *   node tools/_reaktion_mess.mjs BILD --zeile N --von A --bis B [--schritt S]
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
const abs = path.resolve(datei);

const o = {
  zeile: flag('zeile') === null ? null : Number(flag('zeile')),
  spalte: flag('spalte') === null ? null : Number(flag('spalte')),
  von: Number(flag('von', 0)),
  bis: flag('bis') === null ? null : Number(flag('bis')),
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
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const raus = { w, h, werte: [] };
  if (o.zeile !== null) {
    const bis = o.bis === null ? w - 1 : Math.min(o.bis, w - 1);
    for (let x = o.von; x <= bis; x += o.schritt) raus.werte.push([x, ...px(x, o.zeile)]);
  } else if (o.spalte !== null) {
    const bis = o.bis === null ? h - 1 : Math.min(o.bis, h - 1);
    for (let y = o.von; y <= bis; y += o.schritt) raus.werte.push([y, ...px(o.spalte, y)]);
  }
  return raus;
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
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  await page.setContent(
    `<style>html,body{margin:0;background:#000}</style>` +
    `<img id="bild" crossorigin="anonymous" src="http://127.0.0.1:${port}/${rel}">`,
    { waitUntil: 'load' });
  await page.waitForFunction('document.getElementById("bild").naturalWidth > 0', { timeout: 25000 });
  erg = await page.evaluate(messen, o);
  await page.close();
} finally { await browser.close(); server.close(); }

console.log('# ' + datei + '  ' + erg.w + 'x' + erg.h);
const L = (r, g, b) => Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
for (const [i, r, g, b] of erg.werte) {
  console.log(String(i).padStart(5) + '  ' + String(r).padStart(3) + ' ' + String(g).padStart(3)
    + ' ' + String(b).padStart(3) + '   L=' + String(L(r, g, b)).padStart(3));
}
