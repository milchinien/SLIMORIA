/* ---------------------------------------------------------------------------
 * SLIMORIA — autoritativer Spielserver.
 *
 *   node server/server.mjs [--port 8790] [--seed 4242] [--daten ORDNER] [--test]
 *
 * Der Server fuehrt die Welt (server/welt.mjs) und schickt den Clients in
 * festem Takt den Zustand. Er nimmt Absichten entgegen ("ich will dorthin",
 * "ich will das fressen") und entscheidet, was daraus wird (GDD 11 §120).
 *
 * Zeit: die Simulation bekommt IMMER denselben festen Schritt. Der Taktgeber
 * unten ist nur die Herzschlagmaschine des Prozesses — er reicht keine
 * gemessene Wanduhrzeit in die Spiellogik. Dieselbe Folge von Nachrichten
 * ergibt deshalb denselben Verlauf, unabhaengig von der Maschine.
 * ------------------------------------------------------------------------- */

import path from 'node:path';
import url from 'node:url';
import { WebSocketServer } from 'ws';
import { erzeugeWelt } from './welt.mjs';
import * as Speicher from './persistenz.mjs';

const HIER = path.dirname(url.fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flagge = (name, standard = null) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? (argv[i + 1] ?? true) : standard;
};
const hat = (name) => argv.includes('--' + name);

const PORT = Number(flagge('port', 8790));
const STARTWERT = Number(flagge('seed', 4242));
const DATEN = path.resolve(String(flagge('daten', path.join(HIER, 'daten'))));
const TESTMODUS = hat('test');

const TAKT = 20;                 // Ticks je Sekunde
const DT = 1 / TAKT;             // fester Simulationsschritt
const SICHERN_ALLE = TAKT * 2;   // alle zwei Sekunden den Stand sichern

Speicher.ordnerSichern(DATEN);
const spiel = erzeugeWelt({ startwert: STARTWERT });

const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });
const sitzungen = new Map();     // ws -> { spielerId, name }

const schicken = (ws, obj) => {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
};

function rundruf(obj) {
  const text = JSON.stringify(obj);
  for (const ws of sitzungen.keys()) if (ws.readyState === 1) ws.send(text);
}

/* --- Verbindungen --------------------------------------------------------- */

wss.on('connection', (ws) => {
  sitzungen.set(ws, { spielerId: null, name: null });

  ws.on('message', (roh) => {
    let nachricht;
    try { nachricht = JSON.parse(roh.toString()); } catch { return; }
    if (!nachricht || typeof nachricht.typ !== 'string') return;
    behandeln(ws, nachricht);
  });

  ws.on('close', () => {
    const s = sitzungen.get(ws);
    sitzungen.delete(ws);
    if (!s || !s.spielerId) return;
    const p = spiel.welt.spieler.get(s.spielerId);
    if (p) Speicher.sichern(DATEN, p.name, spiel.speicherstand(p));
    spiel.spielerEntfernen(s.spielerId);
    protokoll(`- ${s.name} getrennt (${sitzungen.size} verbunden)`);
  });

  ws.on('error', () => { /* Verbindungsabbruch ist kein Serverfehler */ });
});

function behandeln(ws, m) {
  const s = sitzungen.get(ws);
  if (!s) return;

  if (m.typ === 'beitreten') {
    if (s.spielerId) return;
    const name = String(m.name || 'Glibb').slice(0, 24);
    const gespeichert = Speicher.laden(DATEN, name);
    const p = spiel.spielerAufnehmen(name, m.faction, gespeichert);
    s.spielerId = p.id;
    s.name = name;
    schicken(ws, {
      typ: 'willkommen',
      selbst: p.id, tick: spiel.welt.tick, takt: TAKT,
      startwert: STARTWERT, testModus: TESTMODUS,
      neu: !gespeichert,
      charakter: spiel.speicherstand(p),
    });
    schicken(ws, { ...spiel.zustand(), ereignisse: [] });
    protokoll(`+ ${name} verbunden (Level ${p.level}, ${sitzungen.size} verbunden)`);
    return;
  }

  const p = s.spielerId ? spiel.welt.spieler.get(s.spielerId) : null;
  if (!p) return;

  switch (m.typ) {
    case 'pos':
      spiel.positionMelden(p, Number(m.x), Number(m.z), Number(m.n));
      break;

    case 'ziel': {
      const id = m.id === null || m.id === undefined ? null : Number(m.id);
      const k = id === null ? null : spiel.welt.kreaturen.get(id);
      p.zielId = k && k.lebt ? k.id : null;
      break;
    }

    case 'angriff':
      p.autoAngriff = !!m.an;
      if (p.autoAngriff) p.schwungZeit = Math.min(p.schwungZeit, 0.05);
      break;

    case 'fressen': {
      /* Der Client schickt NUR den Wunsch. Chance und Wurf entstehen im
       * Server (GDD 11 §34–35). */
      const r = spiel.fressversuch(p, m.ziel === undefined ? p.zielId : Number(m.ziel));
      if (!r.erlaubt) schicken(ws, { typ: 'fressAbgelehnt', grund: r.grund });
      break;
    }

    case 'faehigkeit': {
      const r = spiel.faehigkeit(p, Number(m.slot));
      if (!r.erlaubt) schicken(ws, { typ: 'abgelehnt', was: 'faehigkeit', grund: r.grund });
      break;
    }

    case 'test': {
      if (!TESTMODUS) { schicken(ws, { typ: 'abgelehnt', was: 'test', grund: 'aus' }); break; }
      const r = spiel.pruefAufbau(p, m.aufbau || {});
      schicken(ws, { typ: 'testAntwort', ...r, marke: m.marke ?? null });
      break;
    }

    case 'ping':
      schicken(ws, { typ: 'pong', marke: m.marke ?? null, tick: spiel.welt.tick });
      break;
  }
}

/* --- Taktgeber -------------------------------------------------------------
 * setInterval ist hier Infrastruktur, keine Spiellogik: die Simulation
 * bekommt immer DT, nie eine gemessene Zeitspanne. */

let seitSichern = 0;

const uhr = setInterval(() => {
  spiel.schritt(DT);

  const zustand = spiel.zustand();
  zustand.ereignisse = spiel.ereignisseHolen();
  rundruf(zustand);

  if (++seitSichern >= SICHERN_ALLE) {
    seitSichern = 0;
    for (const p of spiel.welt.spieler.values()) {
      if (!p.dreckig) continue;
      p.dreckig = false;
      Speicher.sichern(DATEN, p.name, spiel.speicherstand(p));
    }
  }
}, 1000 / TAKT);

/* --- Beenden -------------------------------------------------------------- */

function allesSichern() {
  for (const p of spiel.welt.spieler.values()) {
    Speicher.sichern(DATEN, p.name, spiel.speicherstand(p));
  }
}

let beendet = false;
function beenden(grund) {
  if (beendet) return;
  beendet = true;
  clearInterval(uhr);
  allesSichern();
  protokoll(`Server beendet (${grund}).`);
  wss.close(() => process.exit(0));
  // Falls noch Sockets haengen: nach kurzer Frist hart beenden.
  setTimeout(() => process.exit(0), 300).unref();
}

process.on('SIGTERM', () => beenden('SIGTERM'));
process.on('SIGINT', () => beenden('SIGINT'));

function protokoll(text) {
  if (!hat('still')) process.stdout.write(text + '\n');
}

wss.on('listening', () => {
  process.stdout.write(
    `SLIMORIA-Server bereit auf ws://127.0.0.1:${PORT} ` +
    `(Startwert ${STARTWERT}, Takt ${TAKT}/s, Daten ${DATEN}` +
    `${TESTMODUS ? ', TESTMODUS' : ''})\n`);
});
