import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { createServer, listen } from './serve.mjs';
const BROWSER = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
const srv = createServer();
const port = await listen(srv, 0);
const b = await puppeteer.launch({ executablePath: BROWSER, headless: true,
  args:['--headless=new','--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader',
        '--no-sandbox','--disable-gpu-sandbox','--window-size=1600,900'] });
const p = await b.newPage();
p.on('pageerror', e=>console.log('PAGEERROR:', e.message));
p.on('console', m=>console.log('CONSOLE['+m.type()+']:', m.text().slice(0,400)));
p.on('response', r=>{ if(r.status()>=400) console.log('HTTP',r.status(), r.url()); });
await p.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`, {waitUntil:'domcontentloaded', timeout:30000});
await p.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true', {timeout:30000}).catch(()=>console.log('NICHT BEREIT'));
await p.evaluate(()=>window.__cap.start('g-fernsicht',{seed:1234}));
await p.evaluate(()=>window.__cap.advanceTo(1.6));
const info = await p.evaluate(()=>({
   pfad: window.SLIMORIA.R ? window.SLIMORIA.R.pfad : null,
   typen: window.KARTE ? window.KARTE.typen() : null,
   anzahl: window.KARTE ? window.KARTE.zahlen() : null,
   pruef: window.KARTE ? window.KARTE.pruefen() : null,
   weg: window.WEG ? { auf00: window.WEG.auf(0,0), aufTor: window.WEG.auf(0,10), aufFried: window.WEG.auf(-18.4,-9), neben: window.WEG.auf(6,6) } : null,
   module: window.GRAFIK ? window.GRAFIK.module().map(m=>m.name+'@'+m.ordnung+(m.aus?' AUS':'')) : null,
}));
console.log(JSON.stringify(info, null, 1));
await b.close(); srv.close();
