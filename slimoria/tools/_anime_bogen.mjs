/* Temporaeres Werkzeug: Kontaktbogen aus einer Dateiliste.
 * node tools/_anime_bogen.mjs <ordner> <liste.txt> <ausgabe-praefix> [--spalten 5] [--proBogen 40] [--breite 1800] */
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
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const dir = path.resolve(argv[0]);
const liste = fs.readFileSync(path.resolve(argv[1]), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const praefix = path.resolve(argv[2]);
const spalten = Number(flag('spalten', 5));
const proBogen = Number(flag('proBogen', 40));
const breite = Number(flag('breite', 1800));

const server = createServer(dir);
const port = await listen(server, 0);
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();

for (let s = 0, nr = 1; s < liste.length; s += proBogen, nr++) {
  const teil = liste.slice(s, s + proBogen);
  const html = `<html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#101216;color:#e8ecf4;font:12px/1.3 "Segoe UI",sans-serif}
    .r{display:grid;grid-template-columns:repeat(${spalten},1fr);gap:6px;padding:6px}
    figure{margin:0;background:#000;border:1px solid #333}
    img{display:block;width:100%;height:auto}
    figcaption{padding:3px 5px;font-size:13px;color:#ffd;font-weight:700}
  </style></head><body><div class="r">${
    teil.map(f => `<figure><img src="http://127.0.0.1:${port}/${encodeURIComponent(f)}"><figcaption>${f}</figcaption></figure>`).join('')
  }</div></body></html>`;
  await page.setViewport({ width: breite, height: 800 });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => Promise.all(Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))));
  const out = `${praefix}-${String(nr).padStart(2, '0')}.jpg`;
  await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 88 });
  console.log(out + '  ' + teil.length + ' Bilder');
}
await browser.close();
server.close();
