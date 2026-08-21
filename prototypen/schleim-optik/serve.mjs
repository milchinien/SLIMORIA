/* Winziger statischer Server fuer den Optik-Prototypen.
 * Noetig ist er nicht — index.html laesst sich auch direkt doppelklicken.
 * Bequemer ist er trotzdem: neu laden reicht, kein file://-Pfad im Weg.
 *
 *   node serve.mjs           -> http://127.0.0.1:8102
 *   PORT=9000 node serve.mjs -> anderer Port
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = normalize(import.meta.dirname);
const port = Number(process.env.PORT || 8102);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (path === '/') path = '/index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw new Error('forbidden');
    await stat(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end('Nicht gefunden');
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`SLIMORIA Optik-Prototyp: http://127.0.0.1:${port}`));
