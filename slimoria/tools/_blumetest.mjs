/* TEMPORAER — Testtreiber fuer props/blume.js unter ?renderer=2.
 * capture.mjs kennt keinen Renderer-Schalter und wird nicht angefasst. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const W = 1600, H = 900;
const BROWSER = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));

const szenarien = process.argv.slice(2).filter(a => !a.startsWith('--'));
const outI = process.argv.indexOf('--out');
const out = outI >= 0 ? process.argv[outI + 1] : 'blume-test';
const props = ['grafik/props/blume.js'];

const server = createServer(ROOT);
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--use-angle=swiftshader', '--use-gl=angle',
    '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox',
    '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-lcd-text',
    '--force-color-profile=srgb', '--font-render-hinting=none', `--window-size=${W},${H}`],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') fehler.push('console: ' + m.text());
                          if (m.type() === 'warning') fehler.push('warn: ' + m.text()); });

await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`,
  { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });
for (const p of props) await page.addScriptTag({ path: path.join(ROOT, 'client', p) });

const zielRoot = path.join(ROOT, 'gauntlet', 'shots', out);
for (const s of szenarien) {
  const dir = path.join(zielRoot, s);
  fs.mkdirSync(dir, { recursive: true });
  const info = await page.evaluate(n => window.__cap.start(n, { seed: 1234 }), s);
  if (info.fehler) { console.error(s, info.fehler); continue; }
  let i = 0;
  for (const t of info.zeiten) {
    await page.evaluate(tt => window.__cap.advanceTo(tt), t);
    await page.screenshot({ path: path.join(dir, `frame_${String(i++).padStart(3, '0')}.png`) });
  }
  console.log(s, '->', path.relative(ROOT, dir), info.zeiten.length, 'Bilder');
}
const d = await page.evaluate(() => ({
  pfad: window.SLIMORIA?.renderer?.pfad,
  blume: window.BLUME_DIAGNOSE || null,
  zahlen: window.KARTE ? window.KARTE.zahlen() : null,
  typen: window.KARTE ? window.KARTE.typen() : null,
}));
console.log(JSON.stringify(d, null, 1));
console.log(fehler.length ? 'MELDUNGEN:\n' + fehler.join('\n') : 'keine Seitenfehler');
await browser.close(); server.close();
