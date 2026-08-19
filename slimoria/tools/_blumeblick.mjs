/* TEMPORAER — freie Standbilder unter ?renderer=2 fuer die Sichtpruefung. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
import { createServer, listen } from './serve.mjs';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const W=1600,H=900;
const BROWSER=['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p=>fs.existsSync(p));
const BLICKE = [
  { n:'friedhof',  tx:-18, ty:0.8, tz:-18, yaw:0.79, pitch:0.30, dist:11 },
  { n:'friedhof-ankunft', tx:-18.6, ty:0.8, tz:-18.6, yaw:0.79, pitch:0.22, dist:8 },
  { n:'passage',   tx:0,   ty:0.8, tz:14,  yaw:-1.571, pitch:0.26, dist:13 },
  { n:'plateau',   tx:-13, ty:1.4, tz:-12, yaw:0.6,  pitch:0.34, dist:12 },
  { n:'ruhefeld',  tx:1.5, ty:0.8, tz:-2,  yaw:2.10, pitch:0.40, dist:9.5 },
  { n:'nah',       tx:4.6, ty:0.3, tz:-3.2,yaw:2.10, pitch:0.30, dist:4.0 },
];
const server=createServer(ROOT); const port=await listen(server,0);
const browser=await puppeteer.launch({executablePath:BROWSER,headless:true,
 args:['--headless=new','--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader',
 '--disable-gpu-sandbox','--no-sandbox','--hide-scrollbars','--force-device-scale-factor=1',
 '--force-color-profile=srgb',`--window-size=${W},${H}`]});
const page=await browser.newPage();
await page.setViewport({width:W,height:H,deviceScaleFactor:1});
const fehler=[];
page.on('pageerror',e=>fehler.push('pageerror: '+e.message));
await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`,{waitUntil:'domcontentloaded'});
await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true');
await page.addScriptTag({path:path.join(ROOT,'client','grafik/props/blume.js')});
await page.evaluate(()=>window.__cap.start('g-bodenlicht',{seed:1234}));
await page.evaluate(()=>window.__cap.advanceTo(1.6));
const dir=path.join(ROOT,'gauntlet','shots','blume-blick');
fs.mkdirSync(dir,{recursive:true});
for(const b of BLICKE){
  await page.evaluate(v=>{ window.SLIMORIA.api.setCamera({follow:false,...v}); window.SLIMORIA.render(); },
    {tx:b.tx,ty:b.ty,tz:b.tz,yaw:b.yaw,pitch:b.pitch,dist:b.dist});
  await page.screenshot({path:path.join(dir,b.n+'.png')});
  console.log(b.n);
}
console.log(JSON.stringify(await page.evaluate(()=>window.BLUME_DIAGNOSE)));
console.log(fehler.length?fehler.join('\n'):'keine Seitenfehler');
await browser.close(); server.close();
