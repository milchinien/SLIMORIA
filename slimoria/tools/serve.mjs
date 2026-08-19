import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};

export function createServer(root = ROOT) {
  return http.createServer((req, res) => {
    const parsed = new URL(req.url, 'http://x');
    let p = decodeURIComponent(parsed.pathname);
    if (p === '/') p = '/client/index.html';
    if (p === '/favicon.ico') { res.writeHead(204).end(); return; }
    const file = path.join(root, p);

    // Kein Ausbruch aus dem Projektordner.
    if (!file.startsWith(root)) { res.writeHead(403).end('nope'); return; }

    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('not found: ' + p); return; }
      res.writeHead(200, {
        'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      });
      res.end(buf);
    });
  });
}

export function listen(server, port = 0) {
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
  });
}

// Direkt gestartet: dauerhaft auf 8099 lauschen (zum Selberspielen).
if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) {
  const s = createServer();
  const port = await listen(s, Number(process.env.PORT) || 8099);
  console.log(`SLIMORIA laeuft auf http://127.0.0.1:${port}/client/index.html`);
}
