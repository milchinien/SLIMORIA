/* _aufprall_crop.mjs ORDNER ZIEL.png nr,nr,... — schneidet den Schleim aus und
 * legt die Ausschnitte 3x vergroessert nebeneinander. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const ordner = process.argv[2], ziel = process.argv[3];
const nrs = (process.argv[4] || '').split(',').filter(s => s).map(Number);
const dateien = fs.readdirSync(ordner).filter(f => /^frame_\d+\.png$/.test(f)).sort()
  .filter((_, i) => !nrs.length || nrs.includes(i));

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1800, height: 700 });
const b64s = dateien.map(d => fs.readFileSync(path.join(ordner, d)).toString('base64'));
const out = await page.evaluate(async (b64s, namen) => {
  const ZOOM = 3, PADX = 30, PADY = 24;
  const stuecke = [];
  for (const b64 of b64s) {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height;
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, R = D[i], G = D[i+1], B = D[i+2];
      if (!(B > R + 70 && B > G + 32 && B > 90)) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    x0 = Math.max(0, x0 - PADX); y0 = Math.max(0, y0 - PADY);
    x1 = Math.min(W - 1, x1 + PADX); y1 = Math.min(H - 1, y1 + PADY);
    stuecke.push({ img, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  const gh = Math.max(...stuecke.map(s => s.h)) * ZOOM + 22;
  const gw = stuecke.reduce((a, s) => a + s.w * ZOOM + 8, 8);
  const o = document.createElement('canvas'); o.width = gw; o.height = gh;
  const og = o.getContext('2d'); og.imageSmoothingEnabled = false;
  og.fillStyle = '#101418'; og.fillRect(0, 0, gw, gh);
  let x = 8;
  for (let i = 0; i < stuecke.length; i++) {
    const s = stuecke[i];
    og.drawImage(s.img, s.x0, s.y0, s.w, s.h, x, 20, s.w * ZOOM, s.h * ZOOM);
    og.fillStyle = '#cfe'; og.font = '14px monospace';
    og.fillText(namen[i], x + 4, 14);
    x += s.w * ZOOM + 8;
  }
  return o.toDataURL('image/png');
}, b64s, dateien);
fs.writeFileSync(ziel, Buffer.from(out.split(',')[1], 'base64'));
await browser.close();
console.log(ziel);
