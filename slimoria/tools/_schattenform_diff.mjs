/* Differenzbild zweier Aufnahmen: zeigt, was ein Modul hinzugefuegt hat.
 *   node tools/_schattenform_diff.mjs A.png B.png ZIEL.png [verstaerkung]
 * Ausgabe: |A-B| * verstaerkung, invertiert nicht.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'node:fs';
const [a, b, ziel, verst = '3'] = process.argv.slice(2);
const ba = readFileSync(a).toString('base64');
const bb = readFileSync(b).toString('base64');
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'],
});
const page = await browser.newPage();
const out = await page.evaluate(async (ba, bb, v) => {
  const load = async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); return i; };
  const A = await load(ba), B = await load(bb);
  const w = A.naturalWidth, h = A.naturalHeight;
  const mk = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    return g.getImageData(0, 0, w, h).data; };
  const da = mk(A), db = mk(B);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const out = g.createImageData(w, h);
  for (let i = 0; i < da.length; i += 4) {
    for (let k = 0; k < 3; k++) out.data[i + k] = Math.min(255, Math.abs(da[i + k] - db[i + k]) * v);
    out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return c.toDataURL('image/png');
}, ba, bb, Number(verst));
writeFileSync(ziel, Buffer.from(out.split(',')[1], 'base64'));
console.log('ok', ziel);
await browser.close();
