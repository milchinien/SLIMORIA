import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const exe = CANDIDATES.find(p => fs.existsSync(p));
console.log('browser:', exe);

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  args: [
    '--headless=new',
    '--use-angle=swiftshader',
    '--use-gl=angle',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1600,900',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

const info = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const gl = c.getContext('webgl2');
  if (!gl) return { ok: false, reason: 'no webgl2 context' };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  gl.clearColor(0.2, 0.6, 0.9, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const px = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return {
    ok: true,
    version: gl.getParameter(gl.VERSION),
    glsl: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    pixel: Array.from(px),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
process.exit(info.ok && info.pixel[2] > 200 ? 0 : 1);
