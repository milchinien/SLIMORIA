/* ---------------------------------------------------------------------------
 * Misst die beiden Ortsangaben, die das GDD zum Fressen macht:
 *
 *   GDD 01 §29 Punkt 5  Bei Erfolg wird der Standort des Gegners zum neuen
 *                       Standort des Schleims.
 *   GDD 01 §30 Punkt 5  Bei Fehlschlag landet er ungefaehr an seiner
 *                       urspruenglichen Position.
 *
 * Beides sind Ortsaussagen, keine Gefuehlsfragen — also werden sie gemessen und
 * nicht beurteilt.
 *
 *   node tools/fressweg.mjs
 * ------------------------------------------------------------------------- */

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

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--use-angle=swiftshader', '--use-gl=angle',
         '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1600,900'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const fehler = [];
page.on('pageerror', e => fehler.push(String(e.message)));
await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });

async function lauf(erzwinge, gegnerX) {
  return page.evaluate((erz, gx) => {
    const A = window.SLIMORIA.api;
    A.reset({ seed: 1234, level: 1 });
    A.setHudVisible(false);
    const b = window.G.slime.body;
    const start = { x: b.cx, z: b.cz };
    const id = A.spawnCreature({ art: 'wolf', level: erz === 'fehlschlag' ? 8 : 1, x: gx, z: 0 });
    A.selectTarget(id);
    const gegner = { x: gx, z: 0 };
    A.tryEat({ erzwinge: erz });

    const STEP = 1 / 240;
    const bahn = [];
    let ruheSeit = 0, letzte = { x: b.cx, z: b.cz };
    for (let i = 0; i < 240 * 8; i++) {
      window.SLIMORIA.step(STEP);
      if (i % 24 === 0) {
        bahn.push({ t: Math.round(i * STEP * 1000), x: +b.cx.toFixed(3), z: +b.cz.toFixed(3),
                    phase: window.G.phase, unter: window.Fressen.phase });
      }
      const d = Math.hypot(b.cx - letzte.x, b.cz - letzte.z);
      letzte = { x: b.cx, z: b.cz };
      ruheSeit = d < 0.0006 ? ruheSeit + STEP : 0;
      // Erst als Ruhe werten, wenn die Lane fertig ist — sonst zaehlt schon
      // der Stillstand im Umschlingen als Ende.
      if (ruheSeit > 0.6 && window.G.phase === 'frei' && i * STEP > 2.0) break;
    }
    const ende = { x: b.cx, z: b.cz };
    const anlauf = Math.hypot(gegner.x - start.x, gegner.z - start.z);
    return {
      start, gegner, ende, anlauf: +anlauf.toFixed(3),
      zumGegner: +Math.hypot(ende.x - gegner.x, ende.z - gegner.z).toFixed(3),
      zumStart: +Math.hypot(ende.x - start.x, ende.z - start.z).toFixed(3),
      phase: window.G.phase, bahn,
    };
  }, erzwinge, gegnerX);
}

const erfolg = await lauf('erfolg', 3.2);
const fehl = await lauf('fehlschlag', 3.2);

await browser.close();
server.close();

const zeile = (n, v, grenze, gut) =>
  `${n.padEnd(46)} ${String(v).padStart(7)}   ${gut ? 'ERFUELLT' : 'VERFEHLT'}  (Grenze ${grenze})`;

// "Der Standort des Gegners wird zum neuen Standort" — grosszuegig ausgelegt
// als: naeher am Gegner als an der Ausgangsstelle, und hoechstens ein Drittel
// der Anlaufstrecke daneben.
const g1 = erfolg.zumGegner <= erfolg.anlauf * 0.34 && erfolg.zumGegner < erfolg.zumStart;
// "ungefaehr an seiner urspruenglichen Position" — hoechstens ein Drittel der
// Anlaufstrecke daneben.
const g2 = fehl.zumStart <= fehl.anlauf * 0.34;

console.log('\nGDD 01 §29 Punkt 5 — Erfolg: Standort des Gegners wird neuer Standort');
console.log('  Start', erfolg.start, ' Gegner', erfolg.gegner, ' Ende', erfolg.ende);
console.log(zeile('  Abstand zum Gegnerort', erfolg.zumGegner, (erfolg.anlauf * 0.34).toFixed(2), g1));
console.log('  Abstand zur Ausgangsstelle:', erfolg.zumStart, '(soll groesser sein)');

console.log('\nGDD 01 §30 Punkt 5 — Fehlschlag: ungefaehr an der Ausgangsposition');
console.log('  Start', fehl.start, ' Gegner', fehl.gegner, ' Ende', fehl.ende);
console.log(zeile('  Abstand zur Ausgangsstelle', fehl.zumStart, (fehl.anlauf * 0.34).toFixed(2), g2));
console.log('  in Prozent der Anlaufstrecke:', Math.round(fehl.zumStart / fehl.anlauf * 100) + ' %');

if (fehler.length) console.log('\nSeitenfehler:', fehler.slice(0, 5));

fs.mkdirSync(path.join(ROOT, 'gauntlet'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'gauntlet', 'fressweg.json'),
  JSON.stringify({ erfolg, fehl, bestanden: { paragraph29: g1, paragraph30: g2 } }, null, 1));

console.log('\n' + (g1 && g2 ? 'BEIDE ERFUELLT' : 'NICHT ERFUELLT'));
process.exit(g1 && g2 ? 0 : 1);
