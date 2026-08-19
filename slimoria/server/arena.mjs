/* ---------------------------------------------------------------------------
 * Die Arena, wie der Client sie kennt.
 *
 * client/world.js und client/tuning.js sind gesperrt und laden als klassische
 * Browser-Skripte (kein module.exports). Statt die Koordinaten hier ein
 * zweites Mal hinzuschreiben — was frueher oder spaeter auseinanderlaeuft —
 * wird die Quelle gelesen und in einem Funktionsrahmen ausgewertet. Der
 * `typeof window`-Zweig am Dateiende laeuft dabei ins Leere, alles andere ist
 * identisch.
 *
 * Damit haben Server und Client garantiert dieselben Hindernisse, dieselben
 * Spawnpunkte und dasselbe Hoechsttempo.
 * ------------------------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const WURZEL = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

function quelle(datei) {
  return fs.readFileSync(path.join(WURZEL, 'client', datei), 'utf8');
}

const laden = new Function(
  quelle('world.js') + '\n' + quelle('tuning.js') + '\n' +
  'return { WELT, bodenHoehe, istFrei, PARAMS, radiusFuerLevel };'
);

export const { WELT, bodenHoehe, istFrei, PARAMS, radiusFuerLevel } = laden();
export { WURZEL };
