/* ---------------------------------------------------------------------------
 * Traegt den aktuellen Stand in die Live-Fortschrittsseite ein.
 *
 * Liest gauntlet/urteile/*.json, gauntlet/abnahme.json und
 * gauntlet/zweispieler.json und ersetzt den STAND-Block in gauntlet/live.html.
 *
 * Ein Teil zaehlt nur dann als gewonnen, wenn der Richter unser Bild gewaehlt
 * hat UND nicht vermerkt hat, dass beide Bilder das Kriterium verfehlen. Ein
 * Sieg als kleineres Uebel ist kein Sieg — die Latte lautet "gewinnt", nicht
 * "verliert weniger".
 *
 *   node tools/livestand.mjs
 * ------------------------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const lies = (p, alt = null) => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return alt; }
};

const teile = {};
const dir = path.join(ROOT, 'gauntlet', 'urteile');
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    const j = lies(path.join('gauntlet', 'urteile', f));
    if (!j) continue;
    const key = j.key || f.replace(/\.json$/, '');
    const echterSieg = j.gewonnen === true && j.beideSchwach !== true;
    teile[key] = {
      gewonnen: echterSieg,
      knapp: j.gewonnen === true && j.beideSchwach === true,
      runden: j.runde || 1,
      urteil: String(j.urteil || '').replace(/\s+/g, ' ').slice(0, 460),
      luecke: echterSieg ? '' : String(j.luecke || '').replace(/\s+/g, ' ').slice(0, 460),
    };
  }
}

const abnahme = lies('gauntlet/abnahme.json');
const netz = lies('gauntlet/zweispieler.json');
const zaehl = (arr) => Array.isArray(arr)
  ? arr.filter(x => x.erfuellt === true || x.stand === 'erfuellt').length : null;

let refBilder = 0;
(function zaehleRef(p) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (e.isDirectory()) zaehleRef(path.join(p, e.name));
    else if (/\.(png|jpe?g)$/i.test(e.name)) refBilder++;
  }
})('ref');

const gewonnen = Object.values(teile).filter(t => t.gewonnen).length;
const runden = Math.max(0, ...Object.values(teile).map(t => t.runden));

const stand = {
  aktualisiert: runden
    ? `Runde ${runden} ausgewertet · ${gewonnen} von 17 blind gewonnen`
    : 'noch keine Runde ausgewertet',
  refBilder,
  abnahmeA: abnahme ? zaehl(abnahme.listeA || abnahme.A || abnahme.punkte) : null,
  abnahmeB: abnahme ? zaehl(abnahme.listeB || abnahme.B || abnahme.technisch) : null,
  netz: netz ? `${netz.bestanden}/${netz.gesamt}` : null,
  teile,
};

const seite = path.join(ROOT, 'gauntlet', 'live.html');
let h = fs.readFileSync(seite, 'utf8');
const neu = 'const STAND = ' + JSON.stringify(stand, null, 1) + ';';
const treffer = h.match(/const STAND = \{[\s\S]*?\n\};/);
if (!treffer) { console.error('STAND-Block in live.html nicht gefunden'); process.exit(1); }
h = h.replace(treffer[0], neu);

// Die Abnahmelisten in der Seite mitziehen, falls die Zahlen vorliegen.
if (stand.abnahmeA !== null) {
  h = h.replace(/const STAND_A = [^;]+;/,
    `const STAND_A = Array(22).fill('offen').map((_, i) => i < ${stand.abnahmeA} ? 'gebaut' : 'offen');`);
}
if (stand.abnahmeB !== null) {
  h = h.replace(/const STAND_B = [^;]+;/,
    `const STAND_B = Array(17).fill('offen').map((_, i) => i < ${stand.abnahmeB} ? 'gebaut' : 'offen');`);
}

fs.writeFileSync(seite, h);
console.log(`live.html aktualisiert: ${gewonnen}/17 gewonnen, Runde ${runden}, ` +
            `Abnahme ${stand.abnahmeA}/22 und ${stand.abnahmeB}/17, ${refBilder} Referenzbilder`);
const knapp = Object.entries(teile).filter(([, t]) => t.knapp).map(([k]) => k);
if (knapp.length) console.log('Als kleineres Uebel gewonnen, gilt als offen: ' + knapp.join(', '));
