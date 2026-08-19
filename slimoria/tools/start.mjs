/* ---------------------------------------------------------------------------
 * Startet SLIMORIA zum Spielen.
 *
 * Faehrt beides hoch — den Dateiserver fuer den Client und den Spielserver,
 * der die Autoritaet hat — und sagt, wo man klicken muss.
 *
 *   node tools/start.mjs            beides, Spielserver auf 8790
 *   node tools/start.mjs --allein   nur der Dateiserver (Einzelspieler)
 *   node tools/start.mjs --port 9000
 *
 * Beenden mit Strg+C; der Spielserver wird mit beendet.
 * ------------------------------------------------------------------------- */

import { spawn } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const allein = argv.includes('--allein') || argv.includes('--offline');

const webPort = Number(flag('port', 8099));
const spielPort = Number(flag('spielport', 8790));

let spiel = null;
if (!allein) {
  spiel = spawn(process.execPath, [path.join(ROOT, 'server', 'server.mjs'), '--port', String(spielPort)],
                { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  spiel.stdout.on('data', d => process.stdout.write('[Spielserver] ' + d));
  spiel.stderr.on('data', d => process.stderr.write('[Spielserver] ' + d));
  spiel.on('exit', c => {
    if (c !== 0 && c !== null) {
      console.log(`[Spielserver] beendet mit Code ${c} — der Client spielt dann allein weiter.`);
    }
  });
}

/* Ist der Wunschport belegt — etwa weil noch ein alter Lauf haengt —, weichen
 * wir aus, statt mit EADDRINUSE abzustuerzen. Die Adresse steht ohnehin unten. */
async function hoerZu(port) {
  for (const p of [port, port + 1, port + 2, port + 3, 0]) {
    const s = createServer();
    try {
      const echt = await new Promise((ja, nein) => {
        s.once('error', nein);
        listen(s, p).then(ja, nein);
      });
      if (p !== port) console.log('  Hinweis: Port ' + port + ' war belegt, es laeuft auf ' + echt + '.');
      return { server: s, port: echt };
    } catch (e) {
      s.close();
      if (e.code !== 'EADDRINUSE') throw e;
    }
  }
  throw new Error('kein freier Port gefunden');
}
const { server: web, port: echterPort } = await hoerZu(webPort);

const adresse = `http://127.0.0.1:${echterPort}/client/index.html`;
console.log('');
console.log('  SLIMORIA laeuft.');
console.log('');
console.log('  Spielen:          ' + adresse);
if (!allein) {
  console.log('  Zweiter Spieler:  dieselbe Adresse in einem zweiten Fenster');
  console.log('                    (der Client verbindet sich von selbst auf Port ' + spielPort + ')');
  console.log('  Ausdruecklich allein:  ' + adresse + '?server=aus');
}
console.log('  Anime-Renderpfad: ' + adresse + '?renderer=2');
console.log('');
console.log('  Steuerung:  Linksklick Boden = gehen · Linksklick Kreatur = anvisieren');
console.log('              Rechtsklick Kreatur = angreifen · E = fressen · F = interagieren');
console.log('              1-4 = Faehigkeiten · Rechts ziehen = Kamera · Rad = Zoom');
console.log('              Leertaste = huepfen · X = Massepunkte · H = Panel');
console.log('');
console.log('  Beenden mit Strg+C');
console.log('');

const aufraeumen = () => {
  if (spiel && !spiel.killed) spiel.kill();
  web.close();
  process.exit(0);
};
process.on('SIGINT', aufraeumen);
process.on('SIGTERM', aufraeumen);
