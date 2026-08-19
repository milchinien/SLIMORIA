/* ---------------------------------------------------------------------------
 * Erzeugt client/grafik/manifest.js aus dem, was tatsaechlich im Verzeichnis
 * liegt — in einer festen, sinnvollen Ladereihenfolge.
 *
 * Warum erzeugt statt von Hand gepflegt: an client/grafik/ arbeiten zwanzig
 * Agenten gleichzeitig. Eine handgepflegte Liste geht auseinander, und jede
 * Datei, die darin steht aber fehlt, ergibt einen 404 — den tools/capture.mjs
 * als Seitenfehler wertet, woraufhin die Pruefer des Gauntlets ihre
 * Blindvergleiche abbrechen. Genau das ist einmal passiert.
 *
 *   node tools/grafikmanifest.mjs
 * ------------------------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'client', 'grafik');

/* Ladereihenfolge. Was hier nicht steht, kommt hinten dran — alphabetisch, aber
 * immer vor renderer2.js, das zuletzt kommen MUSS, weil es alles zusammensetzt. */
const REIHENFOLGE = [
  'glsl.js',
  'licht.js',
  'himmel.js',
  'nebel.js',
  'boden.js',
  'schatten.js',
  'rampe.js',
  'kontur.js',
  'wasser.js',
  'gras.js',
  'karte.js',
  'gel.js',
  'post.js',
];

function sammeln(unter = '') {
  const abs = path.join(DIR, unter);
  if (!fs.existsSync(abs)) return [];
  const raus = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = unter ? unter + '/' + e.name : e.name;
    if (e.isDirectory()) raus.push(...sammeln(rel));
    else if (e.name.endsWith('.js') && e.name !== 'laden.js' && e.name !== 'manifest.js') {
      raus.push(rel);
    }
  }
  return raus;
}

const alle = sammeln();
const rang = (f) => {
  if (f === 'renderer2.js') return 10000;
  const i = REIHENFOLGE.indexOf(f);
  if (i >= 0) return i;
  // Untermodule nach ihrem Kern: schleim/* nach gel.js, props/* nach karte.js
  if (f.startsWith('schleim/')) return REIHENFOLGE.indexOf('gel.js') + 0.5;
  if (f.startsWith('props/')) return REIHENFOLGE.indexOf('karte.js') + 0.5;
  return 5000;
};
alle.sort((a, b) => rang(a) - rang(b) || a.localeCompare(b));

const liste = alle.map(f => 'grafik/' + f);
const inhalt =
  "'use strict';\n" +
  '/* ERZEUGT von tools/grafikmanifest.mjs — nicht von Hand aendern.\n' +
  ' * Nach dem Anlegen eines neuen Moduls einmal laufen lassen. */\n' +
  'window.GRAFIK_MODULE = ' + JSON.stringify(liste, null, 1) + ';\n';

fs.writeFileSync(path.join(DIR, 'manifest.js'), inhalt);
console.log(`manifest.js: ${liste.length} Module`);
for (const m of liste) console.log('  ' + m);
