/* ---------------------------------------------------------------------------
 * Persistente Charaktere (GDD 11 §9, GDD 08 §3).
 *
 * Fuer den Prototyp genuegt eine JSON-Datei je Charakter. Kein Datenbank-
 * schema, keine Migration — aber dieselbe Zusage: was der Server ueber einen
 * Charakter fuehrt, ueberlebt seinen Neustart.
 *
 * Geschrieben wird ueber eine Nebendatei und `rename`. Sonst steht bei einem
 * Absturz mitten im Schreiben eine halbe Datei auf der Platte und der
 * Charakter ist beim naechsten Start kaputt.
 * ------------------------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';

/* Nur harmlose Zeichen im Dateinamen — der Name kommt vom Client. */
export function dateiName(name) {
  const sauber = String(name).normalize('NFKD').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  return (sauber || 'namenlos') + '.json';
}

export function ordnerSichern(ordner) {
  fs.mkdirSync(ordner, { recursive: true });
}

export function laden(ordner, name) {
  const datei = path.join(ordner, dateiName(name));
  try {
    return JSON.parse(fs.readFileSync(datei, 'utf8'));
  } catch {
    return null;                 // neuer Charakter
  }
}

export function sichern(ordner, name, daten) {
  ordnerSichern(ordner);
  const datei = path.join(ordner, dateiName(name));
  const temp = datei + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(daten, null, 1), 'utf8');
  fs.renameSync(temp, datei);
  return datei;
}

export function loeschen(ordner, name) {
  try { fs.unlinkSync(path.join(ordner, dateiName(name))); return true; }
  catch { return false; }
}
