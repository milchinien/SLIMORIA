/* _kontakt_mess.mjs — temporaeres Messwerkzeug fuer die Kontaktzone.
 * node tools/_kontakt_mess.mjs BILD  x y w h   -> gibt Pixelblock als JSON aus
 * Liest einen Ausschnitt und gibt fuer jede Zeile/Spalte Helligkeiten aus. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const [datei, X, Y, W, H, aus] = process.argv.slice(2);
const b64 = fs.readFileSync(datei).toString('base64');
const mime = datei.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const out = await page.evaluate(async (b64, mime, x, y, w, h) => {
  const img = new Image();
  img.src = 'data:' + mime + ';base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, x, y, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const px = [];
  for (let j = 0; j < h; j++) {
    const row = [];
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      row.push([d[k], d[k + 1], d[k + 2]]);
    }
    px.push(row);
  }
  return { w, h, bild: [img.naturalWidth, img.naturalHeight], px };
}, b64, mime, +X, +Y, +W, +H);
fs.writeFileSync(aus, JSON.stringify(out));
await browser.close();
console.log('bild', out.bild, '-> ', aus);
