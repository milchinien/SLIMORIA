import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { createServer, listen } from './serve.mjs';
const BROWSER = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const srv = createServer(); const port = await listen(srv, 0);
const b = await puppeteer.launch({ executablePath: BROWSER, headless: true,
  args:['--headless=new','--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader',
        '--no-sandbox','--disable-gpu-sandbox','--hide-scrollbars','--force-device-scale-factor=1',
        '--force-color-profile=srgb','--window-size=1600,900'] });
const p = await b.newPage();
await p.setViewport({width:1600,height:900,deviceScaleFactor:1});
const fehler=[]; p.on('pageerror',e=>fehler.push('pageerror: '+e.message));
await p.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`, {waitUntil:'domcontentloaded'});
await p.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', {timeout:30000});
await p.evaluate(()=>window.__cap.start('g-bodenlicht',{seed:1234}));
await p.evaluate(()=>window.__cap.advanceTo(1.2));
const sichten = [
  ['tor',      { yaw: 1.5708, pitch: 0.34, dist: 13, follow:false, tx: 0, ty: 0.6, tz: 11 }],
  ['friedhof', { yaw: 0.55,   pitch: 0.36, dist: 15, follow:false, tx: -15, ty: 0.6, tz: -12 }],
  ['start',    { yaw: 1.20,   pitch: 0.55, dist: 14, follow:false, tx: -3, ty: 0.6, tz: -1 }],
];
fs.mkdirSync('gauntlet/shots/weg-sichten', {recursive:true});
for (const [name, kam] of sichten) {
  await p.evaluate((k)=>{ const A = window.SLIMORIA.api; A.setCamera(k);
    const c = window.G.kamera; if (k.tx!==undefined){c.tx=k.tx;c.ty=k.ty;c.tz=k.tz;c.follow=false;}
    window.SLIMORIA.render(); }, kam);
  await p.screenshot({ path: 'gauntlet/shots/weg-sichten/'+name+'.png' });
}
console.log('fehler:', fehler.length ? fehler : 'keine');
await b.close(); srv.close();
