/* ---------------------------------------------------------------------------
 * Blindvergleich vorbereiten.
 *
 * Nimmt ein Bild aus unserer Aufnahme und ein Bild aus dem Referenzmaterial,
 * bringt beide auf dieselbe Breite, entfernt jeden Hinweis auf die Herkunft
 * (Dateiname, Aufloesung, Seitenverhaeltnis) und legt sie in zufaelliger
 * Reihenfolge als A.png und B.png ab.
 *
 * Der Schluessel landet AUSSERHALB des Vergleichsordners. Der Richter sieht nur
 * den Vergleichsordner und weiss dadurch weder, welches Bild unseres ist, noch
 * in welcher Runde er urteilt.
 *
 *   node tools/blind.mjs --teil aufprall --unser <bild.png> --referenz <bild.png>
 *        [--unserCrop x,y,w,h] [--referenzCrop x,y,w,h] [--breite 1240]
 *
 * Der Ausschnitt ist in Pixeln des jeweiligen Originalbildes anzugeben. Damit
 * vergleicht man HUD-Teil gegen HUD-Teil statt Vollbild gegen Vollbild.
 * ------------------------------------------------------------------------- */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };

const teil = flag('teil');
const unser = flag('unser');
const referenz = flag('referenz');
const breite = Number(flag('breite', 1240));

const cropVon = (s) => {
  if (!s) return null;
  const a = String(s).split(',').map(Number);
  return a.length === 4 && a.every(Number.isFinite) ? a : null;
};
const cropUnser = cropVon(flag('unserCrop'));
const cropReferenz = cropVon(flag('referenzCrop'));

if (!teil || !unser || !referenz) {
  console.error('gebraucht: --teil <name> --unser <bild.png> --referenz <bild.png>');
  process.exit(2);
}
for (const p of [unser, referenz]) {
  if (!fs.existsSync(p)) { console.error('Datei fehlt: ' + p); process.exit(2); }
}

// Kennung ohne Rundennummer: der Richter darf nicht ableiten koennen, wie oft
// schon iteriert wurde.
const id = crypto.randomBytes(4).toString('hex');
const ordnerRel = path.join('gauntlet', 'blind', teil, id);
const ordner = path.join(ROOT, ordnerRel);
fs.mkdirSync(ordner, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'gauntlet', 'schluessel'), { recursive: true });

const unserIstA = crypto.randomInt(2) === 0;      // Muenzwurf
const relToRoot = (p) => path.relative(ROOT, path.resolve(p)).replace(/\\/g, '/');

const seiten = [
  { name: 'A', datei: unserIstA ? unser : referenz, crop: unserIstA ? cropUnser : cropReferenz },
  { name: 'B', datei: unserIstA ? referenz : unser, crop: unserIstA ? cropReferenz : cropUnser },
];

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
         '--force-device-scale-factor=1', '--force-color-profile=srgb'],
});

try {
  for (const s of seiten) {
    const page = await browser.newPage();
    const src = `http://127.0.0.1:${port}/${relToRoot(s.datei)}`;
    await page.setViewport({ width: breite, height: 300, deviceScaleFactor: 1 });

    const html = [
      '<style>html,body{margin:0;background:#101216;overflow:hidden}',
      '#h{position:relative;width:' + breite + 'px;overflow:hidden}',
      '#h img{display:block;position:absolute;top:0;left:0}</style>',
      '<div id="h"><img id="i" src="' + src + '"></div>',
    ].join('');
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction('document.getElementById("i").naturalWidth > 0', { timeout: 25000 });

    const hoehe = await page.evaluate((c, ziel) => {
      const img = document.getElementById('i');
      const huelle = document.getElementById('h');
      const nw = img.naturalWidth, nh = img.naturalHeight;
      // Ohne Ausschnitt: ganzes Bild auf Zielbreite.
      const [cx, cy, cw, ch] = c || [0, 0, nw, nh];
      const f = ziel / cw;
      img.style.width = (nw * f) + 'px';
      img.style.height = (nh * f) + 'px';
      img.style.left = (-cx * f) + 'px';
      img.style.top = (-cy * f) + 'px';
      const h = Math.round(ch * f);
      huelle.style.height = h + 'px';
      return h;
    }, s.crop, breite);

    await page.setViewport({ width: breite, height: Math.max(60, hoehe), deviceScaleFactor: 1 });
    await page.screenshot({ path: path.join(ordner, s.name + '.png') });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(ROOT, 'gauntlet', 'schluessel', `${teil}__${id}.json`),
  JSON.stringify({
    teil, id,
    A: unserIstA ? 'unser' : 'referenz',
    B: unserIstA ? 'referenz' : 'unser',
    unserBuchstabe: unserIstA ? 'A' : 'B',
    quelleUnser: relToRoot(unser), quelleReferenz: relToRoot(referenz),
  }, null, 1));

fs.writeFileSync(path.join(ordner, 'AUFGABE.txt'),
  'In diesem Ordner liegen zwei Bilder: A.png und B.png.\n' +
  'Eines stammt aus einem veroeffentlichten Spiel, eines aus einem Prototyp.\n' +
  'Welches — steht hier absichtlich nicht.\n' +
  'Beurteile ausschliesslich nach dem genannten Kriterium.\n');

console.log(JSON.stringify({
  ordner: ordnerRel.replace(/\\/g, '/'), id, teil,
  unserBuchstabe: unserIstA ? 'A' : 'B',
}));
