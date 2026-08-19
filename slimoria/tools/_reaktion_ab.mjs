/* Wegwerfwerkzeug: A/B im selben Browserlauf.
 * Nimmt ein Szenario zweimal auf — einmal mit, einmal ohne die Module
 * 'reaktion' und 'reaktion-blitz' — und zaehlt die abweichenden Pixel.
 * Nur so ist die Gegenprobe von den Aenderungen anderer Lanes getrennt,
 * die waehrend der Arbeit laufend dazukommen.
 *
 *   node tools/_reaktion_ab.mjs wabbeln
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
].find(p => fs.existsSync(p));
const szen = process.argv[2] || 'wabbeln';
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
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`,
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });

  async function lauf(an) {
    await page.evaluate((flag) => {
      for (const m of window.GRAFIK.module()) {
        if (m.name === 'reaktion' || m.name === 'reaktion-blitz') m.aus = !flag;
      }
    }, an);
    const info = await page.evaluate((n) => window.__cap.start(n, { seed: 1234, renderer: 2 }), szen);
    const bilder = [];
    for (const t of info.zeiten) {
      await page.evaluate((tt) => window.__cap.advanceTo(tt), t);
      bilder.push(await page.screenshot({ encoding: 'base64' }));
    }
    return bilder;
  }

  const mit = await lauf(true);
  const ohne = await lauf(process.argv.includes("--selbsttest") ? true : false);

  if (process.env.SPEICHERN) { const d = "gauntlet/shots/_ab"; fs.mkdirSync(d,{recursive:true}); fs.writeFileSync(d+"/lauf1.png", Buffer.from(mit[0],"base64")); fs.writeFileSync(d+"/lauf2.png", Buffer.from(ohne[0],"base64")); }
  const raus = await page.evaluate(async (a, b) => {
    const lade = (s) => new Promise(r => {
      const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s;
    });
    const cv = document.createElement('canvas');
    cv.width = 1600; cv.height = 900;
    const c = cv.getContext('2d', { willReadFrequently: true });
    const daten = [];
    for (let k = 0; k < a.length; k++) {
      const ia = await lade(a[k]), ib = await lade(b[k]);
      c.drawImage(ia, 0, 0); const da = c.getImageData(0, 0, 1600, 900).data;
      c.drawImage(ib, 0, 0); const db = c.getImageData(0, 0, 1600, 900).data;
      let n = 0, max = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]),
                           Math.abs(da[i + 2] - db[i + 2]));
        if (d > 2) n++;
        if (d > max) max = d;
      }
      daten.push({ bild: k, abweichend: n, maxDelta: max });
    }
    return daten;
  }, mit, ohne);

  let summe = 0, maxD = 0;
  for (const r of raus) { summe += r.abweichend; if (r.maxDelta > maxD) maxD = r.maxDelta; }
  console.log(szen + ': ' + raus.length + ' Bilder, abweichende Pixel gesamt = ' + summe
    + ', groesste Kanalabweichung = ' + maxD);
  for (const r of raus) console.log('  #' + r.bild + '  ' + r.abweichend + ' px, max ' + r.maxDelta);
  await page.close();
} finally { await browser.close(); server.close(); }
