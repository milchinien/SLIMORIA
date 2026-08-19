/* ---------------------------------------------------------------------------
 * Fortschrittsseite.
 *
 * Baut aus dem Zustand auf der Platte eine einzelne HTML-Datei, die der
 * Auftraggeber jederzeit oeffnen kann, um zuzusehen. Alles steckt in der Datei
 * — auch die Kontaktboegen als data:-URI. Sie laesst sich dadurch weiterreichen
 * und funktioniert ohne Server, ohne Netz und ausserhalb des Projektordners.
 *
 * Gelesen wird, was da ist. Fehlende Dateien sind waehrend des Laufs der
 * Normalfall und duerfen die Erzeugung niemals abbrechen — der betroffene Teil
 * steht dann eben auf "noch nicht beurteilt". Deshalb geht jeder Lesezugriff
 * hier durch einen Fang, und jedes Feld wird nachsichtig gedeutet: die
 * Urteils- und Abnahmedateien schreiben spaeter andere Werkzeuge, und deren
 * genaue Feldnamen sollen diese Seite nicht zum Absturz bringen koennen.
 *
 *   node tools/fortschritt.mjs [--breite 900] [--ohne-bilder]
 * ------------------------------------------------------------------------- */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const G = path.join(ROOT, 'gauntlet');
const ZIEL = path.join(G, 'fortschritt.html');

const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const hat = (n) => argv.includes('--' + n);

const BILD_BREITE = Number(flag('breite', 900)) || 900;
const BILD_HOEHE = 4000;          // sehr hohe Kontaktboegen zusaetzlich deckeln
const BILD_GUETE = 0.82;          // JPEG-Guete: Text im Bogen bleibt lesbar
const ROH_GRENZE = 2 * 1024 * 1024; // ohne Verkleinerung nur kleine Bilder einbetten

const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => { try { return fs.existsSync(p); } catch { return false; } });

/* --- Abnahmelisten als Geruest ---------------------------------------------
 * Solange `abnahme.json` fehlt, zeigt die Seite trotzdem, WORAN gemessen wird.
 * Die Titel stammen aus SPEC-BRIEF §1/§2. Sobald die Datei existiert, gilt
 * ausschliesslich ihr Inhalt. */

const GERUEST_A = [
  'Schleim erstellen', 'Schleim aus der dritten Person sehen', 'Auf einen Punkt klicken',
  'Schleim dorthin bewegen', 'Beschleunigung und Abbremsen sehen', 'Richtungswechsel spueren',
  'Schleim wabbeln sehen', 'Geschwindigkeit an der Koerperform erkennen', 'Kreatur finden',
  'Zum Gegner bewegen', 'Gegner bekaempfen', 'Gegner schwaechen', 'Fressversuch ausloesen',
  'Schleim umschlingt den Gegner', 'Fressversuch gelingt oder scheitert',
  'Erfolg/Fehlschlag visuell eindeutig erkennen', 'Nach erfolgreichem Fressen die Veraenderung wahrnehmen',
  'Mehrere Kreaturen fressen', 'Level aufsteigen', 'Wachstum des Schleims erkennen',
  'Bei Tod die charakteristische Todesanimation sehen', 'Am Friedhof respawnen',
];

const GERUEST_B = [
  '3D-Welt', 'Third-Person-Kamera', 'Klickbewegung', 'fluessige Schleimbewegung',
  'dynamische Schleimverformung', 'Kreatur', 'Zielauswahl', 'grundlegender Angriff',
  'Fressversuch', 'Fresserfolg', 'Fressfehlschlag', 'HP', 'Level', 'einfache Faehigkeit',
  'zwei gleichzeitig verbundene Spieler', 'serverautoritatives Gameplay', 'persistenter Charakter',
];

const LANE_FOLGE = ['MOTION', 'EAT', 'DEATH', 'COMBAT', 'UI'];

/* --- Nachsichtiges Lesen --------------------------------------------------- */

const quellen = [];   // Protokoll fuer den Fuss der Seite: was lag vor, was fehlte

function liesJson(abs, zweck) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  try {
    const roh = fs.readFileSync(abs, 'utf8');
    const wert = JSON.parse(roh);
    quellen.push({ rel, zweck, stand: 'gelesen' });
    return wert;
  } catch (e) {
    quellen.push({ rel, zweck, stand: e.code === 'ENOENT' ? 'fehlt' : 'unlesbar (' + e.message + ')' });
    return null;
  }
}

// Erstes Feld, das tatsaechlich etwas enthaelt. Deckt die Namensvarianten ab,
// die spaetere Werkzeuge schreiben koennten.
function feld(obj, ...namen) {
  if (!obj || typeof obj !== 'object') return null;
  for (const n of namen) {
    const v = obj[n];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

const text = (v) => (v === null || v === undefined ? null : String(v).trim() || null);
const zahl = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function zeitstempel() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} um ${p(d.getHours())}:${p(d.getMinutes())} Uhr`;
}

function kb(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return Math.round(bytes / 1024) + ' kB';
}

/* --- Deutung der Urteile --------------------------------------------------- */

// "Gewonnen" heisst genau eine Sache: im Blindvergleich wurde unser Bild
// gewaehlt. Alles andere ist kein Gewinn.
function unsHatGewonnen(q) {
  if (!q) return false;
  for (const k of ['gewonnen', 'bestanden', 'unserGewinnt']) {
    if (typeof q[k] === 'boolean') return q[k];
  }
  const g = text(feld(q, 'gewinner', 'sieger', 'gewaehlt', 'wahl', 'ergebnis'));
  if (!g) return false;
  return /unser|wir\b|prototyp|slimoria|eigen/i.test(g);
}

function standNormieren(e) {
  if (typeof e === 'string') e = { stand: e };
  for (const k of ['erfuellt', 'erf\u00fcllt', 'ok', 'bestanden', 'fertig', 'nachgewiesen']) {
    if (typeof e?.[k] === 'boolean') return e[k] ? 'erfuellt' : 'offen';
  }
  const s = text(feld(e, 'stand', 'status', 'zustand'));
  if (!s) return 'offen';
  if (/^(nicht|kein|un)|nicht erf|offen|fehlt|ausstehend/i.test(s)) return 'offen';
  if (/teil|halb|ansatz|in arbeit|wip/i.test(s)) return 'teilweise';
  if (/erf|ok\b|ja\b|bestand|gruen|gr\u00fcn|fertig|erledigt|nachgewiesen|abgenommen/i.test(s)) return 'erfuellt';
  return 'offen';
}

function listeNormieren(roh, geruest) {
  if (!Array.isArray(roh)) {
    // Kein Inhalt: das Geruest zeigt wenigstens, was noch aussteht.
    return { ausGeruest: true, punkte: geruest.map((p, i) => ({ nr: i + 1, punkt: p, stand: 'offen', nachweis: null })) };
  }
  return {
    ausGeruest: false,
    punkte: roh.map((e, i) => {
      if (typeof e === 'string') return { nr: i + 1, punkt: e, stand: 'offen', nachweis: null };
      return {
        nr: zahl(feld(e, 'nr', 'nummer', 'index'), i + 1),
        punkt: text(feld(e, 'punkt', 'titel', 'text', 'name', 'bezeichnung')) || 'Punkt ' + (i + 1),
        stand: standNormieren(e),
        nachweis: text(feld(e, 'nachweis', 'beleg', 'beweis', 'quelle', 'notiz')),
      };
    }),
  };
}

/* --- Kontaktboegen finden -------------------------------------------------- */

// Neuester Bogen eines Szenarios. Die Aufnahmeordner heissen nach Zeitstempel,
// verlassen wird sich hier aber auf die Dateizeit — der Ordnername kann auch
// ein Freitext aus `--out` sein.
function neuesterKontakt(szenario) {
  if (!szenario) return null;
  const basis = path.join(G, 'shots', szenario);
  let beste = null;
  try {
    for (const e of fs.readdirSync(basis, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(basis, e.name, 'kontakt.png');
      let st;
      try { st = fs.statSync(p); } catch { continue; }
      if (!beste || st.mtimeMs > beste.zeit) {
        let bilder = 0;
        try { bilder = fs.readdirSync(path.join(basis, e.name)).filter(f => /^frame_\d+\.png$/.test(f)).length; } catch { /* egal */ }
        beste = { pfad: p, ordner: e.name, zeit: st.mtimeMs, groesse: st.size, bilder };
      }
    }
  } catch { return null; }
  return beste;
}

function kontaktAus(pfadAngabe) {
  if (!pfadAngabe) return null;
  const abs = path.isAbsolute(pfadAngabe) ? pfadAngabe : path.join(ROOT, pfadAngabe);
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) return null;
    return { pfad: abs, ordner: path.basename(path.dirname(abs)), zeit: st.mtimeMs, groesse: st.size, bilder: 0 };
  } catch { return null; }
}

/* --- Zustand einsammeln ---------------------------------------------------- */

const stand = liesJson(path.join(G, 'stand.json'), 'Teileliste') || {};
const teileRoh = feld(stand, 'teile', 'parts') || {};

const teile = Object.entries(teileRoh).map(([schluessel, t]) => {
  const urteil = liesJson(path.join(G, 'urteile', schluessel + '.json'), 'Urteil ' + schluessel);
  const q = urteil || {};

  const runden = zahl(feld(q, 'runden', 'runde', 'versuche') ?? feld(t, 'runden', 'runde'), 0);
  const wortlaut = text(feld(q, 'urteil', 'wortlaut', 'begruendung', 'text', 'kommentar', 'fazit'))
    || text(feld(t, 'urteil'));
  const beurteilt = !!urteil || runden > 0;

  const luecke = text(feld(q, 'luecke', 'l\u00fccke', 'groessteLuecke', 'gr\u00f6\u00dfteL\u00fccke', 'schwaeche', 'mangel', 'maengel'))
    || text(feld(t, 'luecke'));

  const szenario = text(feld(t, 'szenario')) || schluessel;
  // Der beurteilte Bogen sagt mehr als irgendein Bogen; sonst der neueste.
  const benannt = kontaktAus(text(feld(q, 'kontakt', 'kontaktbogen', 'bild')) || text(feld(t, 'kontakt')));
  const neuester = neuesterKontakt(szenario);
  const bogen = benannt || neuester;

  return {
    schluessel,
    titel: text(feld(t, 'titel', 'name')) || schluessel,
    lane: text(feld(t, 'lane')) || '—',
    gdd: text(feld(t, 'gdd', 'fundstelle')) || '—',
    szenario,
    runden,
    beurteilt,
    // Ohne Urteilsdatei zaehlt der Eintrag aus stand.json — aber nur, wenn dort
    // ueberhaupt schon eine Runde gelaufen ist.
    zustand: !beurteilt ? 'offen' : (unsHatGewonnen(urteil || t) ? 'gewonnen' : 'verloren'),
    wortlaut: beurteilt ? wortlaut : null,
    luecke: luecke && luecke !== '—' ? luecke : null,
    bogen,
    bogenIstBeurteilt: !!benannt,
    bogenVeraltet: !!(benannt && neuester && neuester.pfad !== benannt.pfad),
  };
});

teile.sort((a, b) => {
  const la = LANE_FOLGE.indexOf(a.lane), lb = LANE_FOLGE.indexOf(b.lane);
  return (la < 0 ? 99 : la) - (lb < 0 ? 99 : lb);
});

const gewonnen = teile.filter(t => t.zustand === 'gewonnen').length;
const verloren = teile.filter(t => t.zustand === 'verloren').length;
const offen = teile.filter(t => t.zustand === 'offen').length;

const abnahmeRoh = liesJson(path.join(G, 'abnahme.json'), 'Abnahmelisten');
const abnahmeVorhanden = !!abnahmeRoh;
const listeA = listeNormieren(
  Array.isArray(abnahmeRoh) ? abnahmeRoh : feld(abnahmeRoh, 'A', 'a', 'listeA', 'liste_a', 'punkte', 'gdd01'), GERUEST_A);
const listeB = listeNormieren(
  feld(abnahmeRoh, 'B', 'b', 'listeB', 'liste_b', 'technisch', 'technischeListe', 'gdd11'), GERUEST_B);

const zwRoh = liesJson(path.join(G, 'zweispieler.json'), 'Netznachweis');

/* tools/zweispieler.mjs schreibt kein Feld "stand", sondern eine Liste
 * `pruefungen` mit je `{titel, bestanden}` plus die Zaehler `bestanden`/`gesamt`.
 * Ohne diesen Zweig zaehlt standNormieren die Zahl `bestanden: 4` nicht als
 * Urteil und die Seite meldet "noch offen", obwohl die Datei vier bestandene
 * Pruefungen ausweist — schlimmer als gar keine Datei, weil es nach Rueckschritt
 * aussieht. */
function netzAus(roh) {
  const pruefungen = feld(roh, 'pruefungen', 'checks', 'punkte');
  if (!Array.isArray(pruefungen) || !pruefungen.length) return null;
  const gut = pruefungen.filter(p => standNormieren(p) === 'erfuellt');
  const namen = pruefungen.map(p =>
    `${standNormieren(p) === 'erfuellt' ? '✓' : '✗'} ` +
    (text(feld(p, 'titel', 'punkt', 'name', 'text')) || 'unbenannte Pruefung'));
  return {
    stand: gut.length === pruefungen.length ? 'erfuellt' : gut.length ? 'teilweise' : 'offen',
    notiz: `${gut.length} von ${pruefungen.length} Pruefungen bestanden — ` + namen.join(' · '),
  };
}

const zwListe = netzAus(zwRoh);
const zweispieler = {
  vorhanden: !!zwRoh,
  stand: zwListe ? zwListe.stand : (zwRoh ? standNormieren(zwRoh) : 'offen'),
  notiz: text(feld(zwRoh, 'notiz', 'urteil', 'text', 'befund', 'kommentar')) || (zwListe ? zwListe.notiz : null),
  bild: kontaktAus(text(feld(zwRoh, 'bild', 'kontakt', 'nachweis'))),
};

/* --- Bilder einbetten ------------------------------------------------------
 * Kontaktboegen sind 1800 px breit und mehrere tausend Pixel hoch. Roh
 * eingebettet waere die Seite zweistellig megabyteschwer. Chrome verkleinert
 * sie deshalb auf hoechstens BILD_BREITE und speichert sie als JPEG.
 * Steht kein Chrome bereit, faellt die Seite auf rohe Einbettung zurueck —
 * lieber eine dicke Seite als gar keine. */

const bildJobs = [];
for (const t of teile) if (t.bogen) bildJobs.push(t.bogen);
if (zweispieler.bild) bildJobs.push(zweispieler.bild);

async function bilderEinbetten(jobs) {
  const einmalig = [...new Set(jobs.map(j => j.pfad))];
  if (!einmalig.length || hat('ohne-bilder')) return;

  let browser = null;
  try {
    if (!BROWSER) throw new Error('kein Chrome gefunden');
    const { default: puppeteer } = await import('puppeteer-core');
    browser = await puppeteer.launch({
      executablePath: BROWSER, headless: true,
      args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
             '--force-device-scale-factor=1', '--force-color-profile=srgb'],
    });
  } catch (e) {
    console.log('Hinweis: verkleinere nicht (' + e.message + '), bette roh ein.');
  }

  const page = browser ? await browser.newPage() : null;
  if (page) await page.setContent('<html><body></body></html>', { waitUntil: 'load' });

  for (const pfad of einmalig) {
    let roh;
    try { roh = fs.readFileSync(pfad); } catch { continue; }
    const rohUri = 'data:image/png;base64,' + roh.toString('base64');
    let ergebnis = null;

    if (page) {
      try {
        // data:-Quellen verunreinigen die Leinwand nicht, deshalb kein Server.
        ergebnis = await page.evaluate(async (quelle, maxB, maxH, guete) => {
          const img = new Image();
          img.src = quelle;
          await img.decode();
          const f = Math.min(1, maxB / img.naturalWidth, maxH / img.naturalHeight);
          const w = Math.max(1, Math.round(img.naturalWidth * f));
          const h = Math.max(1, Math.round(img.naturalHeight * f));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = 'high';
          g.fillStyle = '#14161c'; g.fillRect(0, 0, w, h);
          g.drawImage(img, 0, 0, w, h);
          return { uri: c.toDataURL('image/jpeg', guete), w, h };
        }, rohUri, BILD_BREITE, BILD_HOEHE, BILD_GUETE);
      } catch (e) {
        console.log('Hinweis: ' + path.basename(pfad) + ' liess sich nicht verkleinern (' + e.message + ').');
      }
    }

    if (!ergebnis && roh.length <= ROH_GRENZE) ergebnis = { uri: rohUri, w: 0, h: 0 };

    for (const j of jobs) {
      if (j.pfad !== pfad) continue;
      j.uri = ergebnis ? ergebnis.uri : null;
      j.zeigt = ergebnis ? (ergebnis.w ? ergebnis.w + '\u00d7' + ergebnis.h + ' px' : 'Originalgroesse') : null;
      j.eingebettet = ergebnis ? Math.round(ergebnis.uri.length * 0.75) : 0;
    }
  }

  if (browser) await browser.close();
}

await bilderEinbetten(bildJobs);

/* --- Seite bauen ----------------------------------------------------------- */

function balken(anteil, farbe) {
  const p = Math.max(0, Math.min(100, anteil * 100));
  return `<div class="balken"><i style="width:${p.toFixed(1)}%;background:${farbe}"></i></div>`;
}

function abzeichen(zustand) {
  if (zustand === 'gewonnen') return '<span class="ab gut">gewonnen</span>';
  if (zustand === 'verloren') return '<span class="ab schlecht">verloren</span>';
  return '<span class="ab neutral">noch nicht beurteilt</span>';
}

function listeHtml(liste, titel, unterzeile, soll) {
  const erf = liste.punkte.filter(p => p.stand === 'erfuellt').length;
  const teilw = liste.punkte.filter(p => p.stand === 'teilweise').length;
  const n = liste.punkte.length || 1;
  // Eine Abnahmedatei, die weniger Punkte fuehrt als die Sollliste, sieht sonst
  // besser aus als sie ist — der fehlende Rest waere schlicht unsichtbar.
  const luecke = !liste.ausGeruest && liste.punkte.length !== soll
    ? `Die Abnahmedatei fuehrt ${liste.punkte.length} Punkte, die Sollliste hat ${soll}.`
    : null;
  const zeilen = liste.punkte.map(p => `
      <li class="p-${esc(p.stand)}">
        <span class="nr">${esc(p.nr)}</span>
        <span class="txt">${esc(p.punkt)}</span>
        ${p.nachweis ? `<span class="nachweis">${esc(p.nachweis)}</span>` : ''}
      </li>`).join('');
  return `
  <section class="karte liste">
    <header>
      <h3>${esc(titel)}</h3>
      <span class="zaehler">${erf} / ${liste.punkte.length}${teilw ? ` <em>(+${teilw} teilweise)</em>` : ''}</span>
    </header>
    <p class="unter">${esc(unterzeile)}</p>
    ${balken(erf / n, 'var(--gut)')}
    ${liste.ausGeruest
      ? `<p class="warn">${abnahmeVorhanden
          ? 'Die Abnahmedatei fuehrt diese Liste noch nicht.'
          : 'Noch keine Abnahmedatei.'} Angezeigt ist die Sollliste aus SPEC-BRIEF — alle Punkte gelten als offen.</p>`
      : ''}
    ${luecke ? `<p class="warn">${esc(luecke)}</p>` : ''}
    <ol class="punkte">${zeilen}</ol>
  </section>`;
}

function teilHtml(t) {
  const bogen = t.bogen;
  const bild = bogen && bogen.uri
    ? `<figure class="bogen">
         <img src="${bogen.uri}" alt="Kontaktbogen ${esc(t.titel)}" loading="lazy">
         <figcaption>
           Kontaktbogen aus <b>gauntlet/shots/${esc(t.szenario)}/${esc(bogen.ordner)}</b>
           ${bogen.bilder ? ' · ' + bogen.bilder + ' Einzelbilder' : ''}
           ${bogen.zeigt ? ' · ' + esc(bogen.zeigt) : ''}
           ${t.bogenVeraltet ? ' · <span class="warnhinweis">es gibt eine neuere Aufnahme als die beurteilte</span>' : ''}
         </figcaption>
       </figure>`
    : bogen
      ? `<div class="kein-bild">Bogen vorhanden (<code>${esc(path.relative(ROOT, bogen.pfad).replace(/\\/g, '/'))}</code>), aber zu gross zum Einbetten.</div>`
      : `<div class="kein-bild">Noch keine Aufnahme unter <code>gauntlet/shots/${esc(t.szenario)}/</code>.</div>`;

  return `
  <article class="karte teil z-${esc(t.zustand)}">
    <div class="spalte-text">
      <header class="teilkopf">
        <h3>${esc(t.titel)}</h3>
        ${abzeichen(t.zustand)}
      </header>
      <p class="meta">
        <span class="lane">${esc(t.lane)}</span>
        <span>${esc(t.gdd)}</span>
        <span>Szenario <code>${esc(t.szenario)}</code></span>
        <span>${t.runden === 0 ? 'noch keine Runde' : t.runden === 1 ? '1 Runde' : t.runden + ' Runden'}</span>
      </p>
      <div class="feld">
        <h4>Letztes Urteil</h4>
        ${t.wortlaut
          ? `<blockquote>${esc(t.wortlaut)}</blockquote>`
          : `<p class="leer">Noch kein Urteil. Erwartet unter <code>gauntlet/urteile/${esc(t.schluessel)}.json</code>.</p>`}
      </div>
      <div class="feld">
        <h4>Groesste verbleibende Luecke</h4>
        ${t.luecke
          ? `<p class="luecke">${esc(t.luecke)}</p>`
          : `<p class="leer">${t.beurteilt ? 'Keine benannt.' : 'Wird mit dem ersten Urteil benannt.'}</p>`}
      </div>
    </div>
    <div class="spalte-bild">${bild}</div>
  </article>`;
}

const laneZaehler = LANE_FOLGE.map(l => {
  const drin = teile.filter(t => t.lane === l);
  return { lane: l, gesamt: drin.length, gewonnen: drin.filter(t => t.zustand === 'gewonnen').length };
}).filter(x => x.gesamt > 0);

const gesamt = teile.length || 1;

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SLIMORIA — Fortschritt</title>
<style>
:root{
  --grund:#0e1015; --flaeche:#161a22; --tiefer:#11141b; --rand:#242a36;
  --text:#e7ebf3; --leise:#96a1b6; --stumm:#6b7488;
  --gut:#79d3a4; --schlecht:#e8846b; --neutral:#4d5566; --akzent:#7aa7f0;
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--grund);color:var(--text);
  font:15px/1.55 "Segoe UI",system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased}
.huelle{max-width:1420px;margin:0 auto;padding:28px 22px 60px}
h1{font-size:26px;font-weight:600;letter-spacing:.2px;margin:0}
h2{font-size:15px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;
  color:var(--stumm);margin:38px 0 14px}
h3{font-size:17px;font-weight:600;margin:0}
h4{font-size:11.5px;font-weight:600;letter-spacing:1.1px;text-transform:uppercase;
  color:var(--stumm);margin:0 0 6px}
code{font:12.5px/1.4 "Cascadia Mono",Consolas,monospace;color:#b9c4d8;
  background:#0a0c11;border:1px solid var(--rand);border-radius:3px;padding:0 4px}
.kopf{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;
  border-bottom:1px solid var(--rand);padding-bottom:16px}
.kopf .sub{color:var(--stumm);font-size:13px}

.karte{background:var(--flaeche);border:1px solid var(--rand);border-radius:8px;padding:18px 20px}

/* --- Uebersicht --- */
.uebersicht{display:grid;grid-template-columns:minmax(280px,340px) 1fr;gap:16px;margin-top:22px}
@media (max-width:860px){.uebersicht{grid-template-columns:1fr}}
.uebersicht > .karte:first-child{display:flex;flex-direction:column}
.uebersicht > .karte:first-child .fussnote{margin-top:auto;padding-top:16px}
.gross{display:flex;align-items:baseline;gap:10px;margin:2px 0 4px}
.gross b{font-size:46px;font-weight:600;line-height:1;color:var(--gut);
  font-variant-numeric:tabular-nums}
.gross span{font-size:15px;color:var(--leise)}
.balken{height:7px;background:#0a0c11;border-radius:4px;overflow:hidden;
  border:1px solid var(--rand);margin:10px 0 4px}
.balken i{display:block;height:100%;border-radius:3px}
.aufteilung{display:flex;gap:16px;flex-wrap:wrap;color:var(--leise);font-size:13px;margin-top:10px}
.aufteilung b{color:var(--text);font-variant-numeric:tabular-nums}
.punkt{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;
  vertical-align:baseline}
.lanes{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.lanechip{background:var(--tiefer);border:1px solid var(--rand);border-radius:5px;
  padding:5px 9px;font-size:12px;color:var(--leise);font-variant-numeric:tabular-nums}
.lanechip b{color:var(--text)}

/* --- Abnahmelisten --- */
.listen{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media (max-width:860px){.listen{grid-template-columns:1fr}}
.liste header{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.liste .zaehler{font-size:15px;font-variant-numeric:tabular-nums;color:var(--leise)}
.liste .zaehler em{font-style:normal;font-size:12px;color:var(--stumm)}
.liste .unter{margin:4px 0 0;color:var(--stumm);font-size:12.5px}
.warn{margin:8px 0 0;color:#d8bf7d;font-size:12.5px;line-height:1.45}
ol.punkte{list-style:none;margin:12px 0 0;padding:0;
  max-height:290px;overflow:auto;border-top:1px solid var(--rand)}
ol.punkte li{display:flex;gap:9px;align-items:baseline;padding:5px 2px;
  border-bottom:1px solid #1b2029;font-size:13.5px;color:var(--leise)}
ol.punkte li:last-child{border-bottom:0}
ol.punkte .nr{color:var(--stumm);font-size:11.5px;min-width:20px;text-align:right;
  font-variant-numeric:tabular-nums}
ol.punkte .txt{flex:1}
ol.punkte .nachweis{color:var(--stumm);font-size:11.5px}
li.p-erfuellt .txt{color:var(--gut)}
li.p-teilweise .txt{color:#d8bf7d}

/* --- Netznachweis --- */
.netz{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-top:16px}
.netz .notiz{color:var(--leise);font-size:13.5px;flex:1;min-width:220px}

/* --- Teile --- */
.teile{display:flex;flex-direction:column;gap:14px}
.teil{display:grid;grid-template-columns:minmax(320px,1fr) minmax(0,${BILD_BREITE}px);
  gap:20px;align-items:start;border-left:3px solid var(--neutral)}
.teil.z-gewonnen{border-left-color:var(--gut)}
.teil.z-verloren{border-left-color:var(--schlecht)}
@media (max-width:1180px){.teil{grid-template-columns:1fr}}
.teilkopf{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ab{font-size:11px;font-weight:600;letter-spacing:.5px;padding:3px 8px;border-radius:11px;
  border:1px solid}
.ab.gut{color:var(--gut);border-color:#2f5a45;background:#132219}
.ab.schlecht{color:var(--schlecht);border-color:#5e3730;background:#221512}
.ab.neutral{color:var(--stumm);border-color:var(--rand);background:var(--tiefer)}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin:9px 0 14px;
  font-size:12.5px;color:var(--stumm)}
.meta .lane{color:var(--akzent);font-weight:600;letter-spacing:.6px}
.feld{margin-top:13px}
blockquote{margin:0;padding:10px 13px;background:var(--tiefer);border:1px solid var(--rand);
  border-radius:6px;white-space:pre-wrap;font-size:13.5px;line-height:1.6;color:#cfd7e6}
.luecke{margin:0;padding:10px 13px;background:#1d1712;border:1px solid #443428;
  border-radius:6px;font-size:13.5px;line-height:1.55;color:#e5c79a}
.leer{margin:0;color:var(--stumm);font-size:13px}
.spalte-bild{min-width:0}
figure.bogen{margin:0}
figure.bogen img{display:block;width:100%;height:auto;border-radius:6px;
  border:1px solid var(--rand);background:#14161c}
figcaption{margin-top:6px;font-size:11.5px;color:var(--stumm);line-height:1.5}
.warnhinweis{color:#d8bf7d}
.kein-bild{color:var(--stumm);font-size:12.5px;background:var(--tiefer);
  border:1px dashed var(--rand);border-radius:6px;padding:22px 16px;text-align:center;line-height:1.6}

/* --- Fuss --- */
.fuss{margin-top:44px;border-top:1px solid var(--rand);padding-top:16px;
  color:var(--stumm);font-size:12.5px;line-height:1.7}
.fuss table{border-collapse:collapse;margin-top:8px}
.fuss td{padding:2px 16px 2px 0;vertical-align:top}
.fuss .gelesen{color:var(--gut)}
.fuss .fehlt{color:var(--stumm)}
</style>
</head>
<body>
<div class="huelle">

  <div class="kopf">
    <h1>SLIMORIA — Fortschritt</h1>
    <div class="sub">Stand ${esc(zeitstempel())} · gebaut aus <code>gauntlet/</code></div>
  </div>

  <div class="uebersicht">
    <section class="karte">
      <h4>Blindvergleiche</h4>
      <div class="gross"><b>${gewonnen}</b><span>von ${teile.length} Teilen gewonnen</span></div>
      ${balken(gewonnen / gesamt, 'var(--gut)')}
      <div class="aufteilung">
        <span><i class="punkt" style="background:var(--gut)"></i><b>${gewonnen}</b> gewonnen</span>
        <span><i class="punkt" style="background:var(--schlecht)"></i><b>${verloren}</b> verloren</span>
        <span><i class="punkt" style="background:var(--neutral)"></i><b>${offen}</b> offen</span>
      </div>
      <div class="lanes">
        ${laneZaehler.map(l => `<span class="lanechip">${esc(l.lane)} <b>${l.gewonnen}/${l.gesamt}</b></span>`).join('')}
      </div>
      <p class="unter fussnote">
        Gewonnen heisst: unser Bild wurde im Blindvergleich gegen das
        Referenzmaterial gewaehlt — ohne dass der Richter wusste, welches unseres ist.
      </p>
    </section>

    <div class="listen">
      ${listeHtml(listeA, 'Abnahmeliste A — 22 Punkte', 'GDD 01 §70 · was der Spieler erleben koennen muss', GERUEST_A.length)}
      ${listeHtml(listeB, 'Abnahmeliste B — technische Liste', 'GDD 11 §121 · technische Basis', GERUEST_B.length)}
    </div>
  </div>

  <section class="karte netz" style="margin-top:16px">
    <h4 style="margin:0">Netznachweis</h4>
    ${zweispieler.stand === 'erfuellt'
      ? '<span class="ab gut">zwei Spieler nachgewiesen</span>'
      : zweispieler.stand === 'teilweise'
        ? '<span class="ab neutral">teilweise</span>'
        : '<span class="ab neutral">noch offen</span>'}
    <div class="notiz">${zweispieler.notiz
      ? esc(zweispieler.notiz)
      : 'Noch kein Nachweis. Erwartet unter <code>gauntlet/zweispieler.json</code>.'}</div>
  </section>

  <h2>Die ${teile.length} Teile</h2>
  <div class="teile">
    ${teile.map(teilHtml).join('\n')}
  </div>

  <div class="fuss">
    Diese Seite wird von <code>tools/fortschritt.mjs</code> aus den Dateien unter
    <code>gauntlet/</code> erzeugt. Fehlende Dateien sind erlaubt — der betroffene
    Teil steht dann auf „noch nicht beurteilt“. Alle Bilder sind eingebettet;
    die Seite laedt nichts nach.
    <table>
      ${quellen.map(q => `<tr><td><code>${esc(q.rel)}</code></td><td>${esc(q.zweck)}</td>
        <td class="${q.stand === 'gelesen' ? 'gelesen' : 'fehlt'}">${esc(q.stand)}</td></tr>`).join('')}
    </table>
  </div>

</div>
</body>
</html>
`;

fs.mkdirSync(G, { recursive: true });
fs.writeFileSync(ZIEL, html, 'utf8');

const groesse = fs.statSync(ZIEL).size;
console.log(`${gewonnen}/${teile.length} Teile gewonnen · ${bildJobs.filter(j => j.uri).length} Bogen eingebettet · ${kb(groesse)}`);
console.log(ZIEL);
