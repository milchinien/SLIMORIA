/* _aufprall_profil.mjs ORDNER [frameNr...] — Zeilenprofil der Schleimsilhouette.
 * Misst genau das, was das Urteil misst: Grundflaechenbreite gegen
 * Schulterbreite, Lage der breitesten Stelle, Knicke in der Kontur,
 * Flaechenfuellung. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const ordner = process.argv[2];
const nur = process.argv.slice(3).map(Number);
let dateien = fs.readdirSync(ordner).filter(f => /^frame_\d+\.png$/.test(f)).sort();
if (nur.length) dateien = dateien.filter((_, i) => nur.includes(i));

const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

for (const d of dateien) {
  const b64 = fs.readFileSync(path.join(ordner, d)).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height;
    const ist = (i) => {
      const R = D[i], G = D[i + 1], B = D[i + 2];
      return B > R + 70 && B > G + 32 && B > 90;
    };
    // groesste zusammenhaengende Flaeche
    const lab = new Int32Array(W * H).fill(-1);
    let best = -1, bestN = 0;
    const stack = [];
    for (let s = 0; s < W * H; s++) {
      if (lab[s] !== -1 || !ist(s * 4)) continue;
      const id = s; let n = 0; lab[s] = id; stack.push(s);
      while (stack.length) {
        const p = stack.pop(); n++;
        const x = p % W, y = (p / W) | 0;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (lab[q] === -1 && ist(q * 4)) { lab[q] = id; stack.push(q); }
        }
      }
      if (n > bestN) { bestN = n; best = id; }
    }
    if (best < 0) return null;
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (lab[y * W + x] !== best) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    // Zeilenbreite (mit Loechern gefuellt: erstes bis letztes Pixel)
    const zeile = [];
    for (let y = y0; y <= y1; y++) {
      let a = -1, b = -1;
      for (let x = x0; x <= x1; x++) if (lab[y * W + x] === best) { if (a < 0) a = x; b = x; }
      zeile.push(a < 0 ? { w: 0, m: 0 } : { w: b - a + 1, m: (a + b) / 2 });
    }
    let flaeche = 0;
    for (const z of zeile) flaeche += z.w;
    const maxW = Math.max(...zeile.map(z => z.w));
    const iMax = zeile.findIndex(z => z.w === maxW);
    // 20 Baender
    const baender = [];
    for (let i = 0; i < 20; i++) {
      const yA = Math.floor(i * bh / 20), yB = Math.max(yA + 1, Math.floor((i + 1) * bh / 20));
      let s = 0, n = 0;
      for (let y = yA; y < yB && y < zeile.length; y++) { s += zeile[y].w; n++; }
      baender.push(n ? s / n / maxW : 0);
    }
    // groesster Breitensprung zwischen benachbarten Zeilen, in % der Maximalbreite
    let sprung = 0, sprungY = 0;
    for (let y = 1; y < zeile.length - 1; y++) {
      const dw = Math.abs(zeile[y].w - zeile[y - 1].w) / maxW;
      if (dw > sprung) { sprung = dw; sprungY = y / bh; }
    }
    // Zweite Ableitung der Kontur (Knickmass) auf der linken Haelfte
    return {
      bbox: [x0, y0, bw, bh],
      verh: +(bh / bw).toFixed(3),
      fuellung: +(flaeche / (bw * bh)).toFixed(3),
      breitestBei: +(iMax / bh).toFixed(3),
      // Breite bei 20/50/80/90/97 % Hoehe, Anteil der Maximalbreite
      w20: +(zeile[Math.floor(bh * 0.20)].w / maxW).toFixed(3),
      w50: +(zeile[Math.floor(bh * 0.50)].w / maxW).toFixed(3),
      w80: +(zeile[Math.floor(bh * 0.80)].w / maxW).toFixed(3),
      w90: +(zeile[Math.floor(bh * 0.90)].w / maxW).toFixed(3),
      w97: +(zeile[Math.min(bh - 1, Math.floor(bh * 0.97))].w / maxW).toFixed(3),
      wEnd: +(zeile[bh - 1].w / maxW).toFixed(3),
      sprung: +sprung.toFixed(3), sprungBei: +sprungY.toFixed(2),
      baender: baender.map(v => +v.toFixed(2)),
    };
  }, b64);
  console.log(d, JSON.stringify(r));
}
await browser.close();
