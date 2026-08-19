import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
import { createServer, listen } from './serve.mjs';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BROWSER = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
const server = createServer(ROOT); const port = await listen(server, 0);
const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true,
  args:['--headless=new','--use-angle=swiftshader','--use-gl=angle','--enable-unsafe-swiftshader','--no-sandbox']});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/client/index.html?capture=1&renderer=2`, { waitUntil:'domcontentloaded' });
await page.waitForFunction('window.SLIMORIA && window.SLIMORIA.bereit === true');
const s = await page.evaluate(() => window.KARTE.stuecke('blume').map(o => [ +o.x.toFixed(2), +o.z.toFixed(2), +o.y.toFixed(2), +o.groesse.toFixed(2) ]));
console.log(JSON.stringify(s));
await browser.close(); server.close();
