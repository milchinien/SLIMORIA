/* _aufprall_soll.mjs — vergleicht SOLLFORM (b.rest) und IST (b.pos) beim
 * Aufprall, Hoehenband fuer Hoehenband. Zeigt, ob die Vorgabe den Teller
 * ueberhaupt bildet und wo die Bodenebene ihn abschneidet. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createServer, listen } from './serve.mjs';

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle',
         '--window-size=800,450'],
});
const fehler = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 450 });
  page.on('pageerror', e => fehler.push('pageerror: ' + e.message));
  await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1`,
    { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', { timeout: 30000 });

  const out = await page.evaluate(async () => {
    const S = window.SLIMORIA, api = S.api;
    api.reset({ seed: 1, level: 1 }); api.setHudVisible(false);
    api.setCamera({ yaw: 0.5, pitch: 0.12, dist: 7, follow: true });
    api.dropFrom(6.5);
    const zeiten = [0.90, 0.95, 1.00, 1.06, 1.09, 1.12];
    const raus = { params: {}, bilder: [] };
    for (const k of ['klatschTeller','klatschDeckel','klatschRand','klatschRandOrt',
                     'klatschMin','klatschMax','flanke','flankeMax','fuss','sag',
                     'bauchHoch','klatschBreit','klatschWulst'])
      raus.params[k] = window.PARAMS[k];
    let t = 0, iz = 0; const dt = 1/240;
    const prof = (arr, cx, cz, rel) => {
      const b = window.G.slime.body;
      let yLo = 1e9, yHi = -1e9;
      for (let i = 0; i < b.n; i++) { const y = arr[i*3+1] + (rel ? 0 : 0); if (y<yLo) yLo=y; if (y>yHi) yHi=y; }
      const NB = 14, p = new Array(NB).fill(0);
      for (let i = 0; i < b.n; i++) {
        let k = Math.floor((arr[i*3+1] - yLo) / Math.max(yHi-yLo,1e-6) * NB);
        if (k>=NB) k=NB-1; if (k<0) k=0;
        const r = Math.hypot(arr[i*3]-cx, arr[i*3+2]-cz);
        if (r > p[k]) p[k] = r;
      }
      const m = Math.max(...p);
      return { yLo:+yLo.toFixed(3), yHi:+yHi.toFixed(3), rMax:+m.toFixed(3),
               // von OBEN nach unten
               p: p.slice().reverse().map(v => +(v/m).toFixed(2)) };
    };
    while (t < 1.3 && iz < zeiten.length) {
      S.step(dt); t += dt;
      if (t < zeiten[iz]) continue;
      const b = window.G.slime.body, s = window.G.slime;
      raus.bilder.push({
        t: +zeiten[iz].toFixed(2),
        klatschGes: +s.klatschGes.toFixed(3),
        plattNach: +b.plattNach.toFixed(3),
        cy: +b.cy.toFixed(3),
        soll: prof(b.rest, 0, 0, true),
        ist: prof(b.pos, b.cx, b.cz, false),
      });
      iz++;
    }
    return raus;
  });
  console.log(JSON.stringify(out.params));
  for (const b of out.bilder) {
    console.log(`t=${b.t} klGes=${b.klatschGes} plattNach=${b.plattNach} cy=${b.cy}`);
    console.log(`   SOLL yLo=${b.soll.yLo} yHi=${b.soll.yHi} rMax=${b.soll.rMax} ${JSON.stringify(b.soll.p)}`);
    console.log(`   IST  yLo=${b.ist.yLo} yHi=${b.ist.yHi} rMax=${b.ist.rMax} ${JSON.stringify(b.ist.p)}`);
  }
} finally { await browser.close(); server.close(); }
if (fehler.length) { console.error('Seitenfehler:', fehler.join(' | ')); process.exit(1); }
