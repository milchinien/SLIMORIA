/* ---------------------------------------------------------------------------
 * Grafikmass — Bildeigenschaften messen statt behaupten.
 *
 * Schritt G0 aus PHASE-GRAFIK-PLAN.md. Das Werkzeug liest ein PNG (oder JPG)
 * und gibt die Zahlen aus, gegen die das Referenzdossier vergleicht:
 *
 *   - Helligkeitshistogramm, Schwarzpunkt, Weisspunkt, Median
 *   - Breite der Schattenflanke entlang einer Bildzeile: staerkster
 *     Helligkeitssprung, Plateaubreiten links und rechts davon, Flankenbreite
 *     in Pixeln, Verhaeltnis Schatten zu Licht
 *   - mittlere Saettigung getrennt nach Schatten, Mitten und Lichtern
 *   - Anteil des Bildes ueber einer Helligkeitsschwelle (Bloom)
 *
 * Aufruf:
 *   node tools/grafikmass.mjs BILD.png [--zeile N] [--json]
 *
 * Weitere Schalter, alle optional:
 *   --spalte N          statt einer Zeile eine Spalte abtasten (Himmel, Nebel)
 *   --von N --bis N     Bereich entlang der Abtastrichtung einschraenken
 *   --toleranz N        erlaubte Streuung innerhalb eines Plateaus (Vorgabe 1)
 *   --schwelle N        Helligkeitsschwelle fuer den Bloomanteil (Vorgabe 230)
 *   --mindestPlateau N  wie breit die ruhigen Flaechen beiderseits einer Kante
 *                       mindestens sein muessen, damit sie als Schattenflanke
 *                       zaehlt und nicht als Kontur (Vorgabe 3)
 *
 * Warum kopfloser Chrome und kein eigener PNG-Dekoder: einen Dekoder zu
 * schreiben waere mehr Code als die ganze Messung. Chrome liegt als
 * puppeteer-core ohnehin in der Werkzeugkette (tools/blind.mjs, tools/capture.mjs),
 * dekodiert PNG und JPG korrekt und liefert die Pixel ueber getImageData.
 * Gerechnet wird komplett in der Seite — nur die fertigen Zahlen wandern
 * zurueck, nicht 5,8 MB Pixel.
 *
 * Alle Helligkeiten sind Rec.709-Luma auf den sRGB-Codewerten 0..255, also
 * ohne Gammalinearisierung. Das ist Absicht: saemtliche Zahlen im Dossier sind
 * ebenfalls sRGB-Ausgabewerte. Gegenprobe: die dort gemessene Genshin-Kante
 * (247,238,227) gegen (243,195,178) ergibt so genau das notierte Verhaeltnis
 * 0,854 — mit linearisierten Werten kaeme 0,80 heraus und jede Zielzahl waere
 * um denselben Betrag falsch.
 * ------------------------------------------------------------------------- */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createServer, listen } from './serve.mjs';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BROWSER = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(p => fs.existsSync(p));

const argv = process.argv.slice(2);
const flag = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);

const datei = argv.find(a => !a.startsWith('--') && !/^-?\d+$/.test(a));
if (!datei) {
  console.error('gebraucht: node tools/grafikmass.mjs BILD.png [--zeile N] [--json]');
  process.exit(2);
}
if (!fs.existsSync(datei)) { console.error('Datei fehlt: ' + datei); process.exit(2); }

const absDatei = path.resolve(datei);
if (!absDatei.startsWith(ROOT)) {
  console.error('Bild muss innerhalb des Projektordners liegen (der Server reicht nichts anderes heraus).');
  process.exit(2);
}

const opt = {
  zeile: flag('zeile') === null ? null : Number(flag('zeile')),
  spalte: flag('spalte') === null ? null : Number(flag('spalte')),
  von: flag('von') === null ? null : Number(flag('von')),
  bis: flag('bis') === null ? null : Number(flag('bis')),
  toleranz: Number(flag('toleranz', 1)),
  schwelle: Number(flag('schwelle', 230)),
  mindestPlateau: Number(flag('mindestPlateau', 3)),
};

/* --------------------------------------------------------------------------
 * Die eigentliche Messung. Laeuft als Ganzes in der Seite.
 * ------------------------------------------------------------------------ */

function messen(o) {
  const img = document.getElementById('bild');
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const r1 = (x) => Math.round(x * 10) / 10;
  const r3 = (x) => Math.round(x * 1000) / 1000;

  /* --- Histogramm, Schwarz- und Weisspunkt, Median --------------------- */

  const hist = new Float64Array(256);
  let satSum = [0, 0, 0], satN = [0, 0, 0];
  let ueberSchwelle = 0;
  const stufen = [200, 220, 230, 240, 250];
  const ueber = stufen.map(() => 0);

  for (let i = 0; i < d.length; i += 4) {
    const R = d[i], G = d[i + 1], B = d[i + 2];
    const L = luma(R, G, B);
    hist[Math.min(255, Math.round(L))]++;

    // Saettigung nach HSV: (max-min)/max. Dieselbe Definition, aus der die
    // Dossierzahlen "Lichter 22-38 %" stammen.
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    const s = mx > 0 ? (mx - mn) / mx : 0;
    const band = L < 85 ? 0 : (L <= 170 ? 1 : 2);
    satSum[band] += s; satN[band]++;

    if (L >= o.schwelle) ueberSchwelle++;
    for (let k = 0; k < stufen.length; k++) if (L >= stufen[k]) ueber[k]++;
  }

  const gesamt = (d.length / 4);
  const kum = new Float64Array(256);
  let lauf = 0;
  for (let i = 0; i < 256; i++) { lauf += hist[i]; kum[i] = lauf; }
  const perzentil = (p) => {
    const ziel = gesamt * p / 100;
    for (let i = 0; i < 256; i++) if (kum[i] >= ziel) return i;
    return 255;
  };
  let schwarz = 0; while (schwarz < 255 && hist[schwarz] === 0) schwarz++;
  let weiss = 255; while (weiss > 0 && hist[weiss] === 0) weiss--;

  const mittel = (a, b) => {
    let s = 0; for (let i = a; i <= b; i++) s += hist[i];
    return s / (b - a + 1);
  };
  const dichteStau = mittel(216, 232);
  const dichteMitte = mittel(150, 200);

  /* --- Schattenflanke entlang einer Zeile (oder Spalte) ----------------- */

  // Waagerecht ist die Vorgabe: eine Schattenkante an einem stehenden Koerper
  // trifft man mit einer Bildzeile. Senkrecht braucht man fuer Himmelsrampe
  // und Fernnebel (Plan G1/G2), die ueber die Bildhoehe verlaufen.
  const senkrecht = o.spalte !== null && Number.isFinite(o.spalte);
  const laenge = senkrecht ? h : w;
  const quer = senkrecht ? w : h;
  const achse = senkrecht ? 'Spalte' : 'Zeile';
  const index = senkrecht
    ? Math.max(0, Math.min(quer - 1, o.spalte))
    : (o.zeile === null || !Number.isFinite(o.zeile)
        ? Math.floor(h / 2) : Math.max(0, Math.min(quer - 1, o.zeile)));
  const von = Math.max(0, o.von ?? 0);
  const bis = Math.min(laenge - 1, o.bis ?? (laenge - 1));

  const L = [];
  const RGB = [];
  for (let s = von; s <= bis; s++) {
    const i = (senkrecht ? (s * w + index) : (index * w + s)) * 4;
    RGB.push([d[i], d[i + 1], d[i + 2]]);
    L.push(luma(d[i], d[i + 1], d[i + 2]));
  }

  // Gefaelle zwischen benachbarten Pixeln. g[i] gehoert zum Schritt i -> i+1.
  const g = [];
  for (let i = 0; i + 1 < L.length; i++) g.push(L[i + 1] - L[i]);

  /* Ein Plateau ist der laengste Lauf ab einem Ankerpixel nach aussen, dessen
   * Spannweite die Toleranz nicht ueberschreitet — genau die Definition, mit
   * der im Dossier "30 px mit plus/minus 1" gemessen wurde. */
  function plateau(anker, richtung) {
    let lo = L[anker], hi = L[anker], n = 1, ende = anker;
    for (let x = anker + richtung; x >= 0 && x < L.length; x += richtung) {
      const nlo = Math.min(lo, L[x]), nhi = Math.max(hi, L[x]);
      if (nhi - nlo > o.toleranz) break;
      lo = nlo; hi = nhi; n++; ende = x;
    }
    const a = Math.min(anker, ende), b = Math.max(anker, ende);
    const sum = [0, 0, 0];
    for (let x = a; x <= b; x++) { sum[0] += RGB[x][0]; sum[1] += RGB[x][1]; sum[2] += RGB[x][2]; }
    return {
      breitePx: n, streuung: r1(hi - lo),
      vonX: von + a, bisX: von + b,
      rgb: [r1(sum[0] / n), r1(sum[1] / n), r1(sum[2] / n)],
      luma: r1((lo + hi) / 2),
    };
  }

  function kante(iStern) {
    const gmax = g[iStern];
    const vorz = Math.sign(gmax);
    // Die Flanke ist der zusammenhaengende Lauf gleichgerichteter Schritte um
    // den staerksten herum. Die Schranke haelt Rauschen draussen, ohne den
    // flachen Ausklang einer echten Flanke abzuschneiden.
    const schranke = Math.max(0.2 * Math.abs(gmax), 1.5);
    let a = iStern, b = iStern;
    while (a - 1 >= 0 && Math.sign(g[a - 1]) === vorz && Math.abs(g[a - 1]) >= schranke) a--;
    while (b + 1 < g.length && Math.sign(g[b + 1]) === vorz && Math.abs(g[b + 1]) >= schranke) b++;

    // Pixel a und b+1 sind die letzten Plateaupixel, alles dazwischen ist
    // Uebergang. Bei einer idealen harten Kante bleibt dazwischen nichts.
    const hellAnker = vorz > 0 ? b + 1 : a;
    const dunkelAnker = vorz > 0 ? a : b + 1;
    const hell = plateau(hellAnker, vorz > 0 ? +1 : -1);
    const dunkel = plateau(dunkelAnker, vorz > 0 ? -1 : +1);

    const verh = hell.luma > 0 ? dunkel.luma / hell.luma : 0;
    const kanal = [0, 1, 2].map(k => hell.rgb[k] > 0 ? r3(dunkel.rgb[k] / hell.rgb[k]) : 0);

    return {
      xKante: von + a + (b - a) / 2 + 0.5,
      sprung: r1(Math.abs(gmax)),
      richtung: vorz > 0 ? 'hell rechts' : 'hell links',
      flankePx: b - a,              // Pixel echt zwischen den Plateaus
      flankeStufen: b - a + 1,      // Anzahl der Helligkeitsschritte
      hell, dunkel,
      verhaeltnis: r3(verh),
      kanalfaktoren: kanal,
    };
  }

  // Mehrere Kandidaten in gebuehrendem Abstand, nach Sprunghoehe geordnet.
  // Nur einen zu melden waere in der Praxis unbrauchbar: die staerkste Stelle
  // einer Zeile ist meist die Silhouette oder die Kontur, nicht der gesuchte
  // Schattenrand.
  const reihung = g.map((v, i) => i).sort((p, q) => Math.abs(g[q]) - Math.abs(g[p]));
  const gewaehlt = [];
  for (const i of reihung) {
    if (gewaehlt.every(j => Math.abs(j - i) >= 8)) gewaehlt.push(i);
    if (gewaehlt.length >= 24) break;
  }
  const alle = gewaehlt.map(kante);

  /* Zusaetzlich das ganze Zeilenstueck als Profil. Bei einem stetigen Verlauf
   * — und genau das rechnet FS_SOLID heute — gibt es gar keine Flanke: der
   * groesste Einzelschritt ist dann 1 Stufe und die Flankenmessung meldet
   * korrekt "0 px", sagt aber nichts. Die Zahl, die den Unterschied zwischen
   * stueckweise konstant (Genshin) und stetig (ToF, wir) traegt, ist die
   * Strecke, ueber die 80 Prozent des Helligkeitsabfalls passieren. */
  let iMax = 0, iMin = 0;
  for (let i = 0; i < L.length; i++) {
    if (L[i] > L[iMax]) iMax = i;
    if (L[i] < L[iMin]) iMin = i;
  }
  const spanne = L[iMax] - L[iMin];
  let breite80 = null;
  if (spanne > 2 && iMax !== iMin) {
    const richtung = Math.sign(iMin - iMax);
    const obenL = L[iMax] - 0.1 * spanne, untenL = L[iMax] - 0.9 * spanne;
    let xOben = null, xUnten = null;
    for (let i = iMax; i !== iMin + richtung; i += richtung) {
      if (xOben === null && L[i] <= obenL) xOben = i;
      if (xOben !== null && L[i] <= untenL) { xUnten = i; break; }
    }
    if (xOben !== null && xUnten !== null) breite80 = Math.abs(xUnten - xOben);
  }
  let groessterSchritt = 0;
  for (const v of g) groessterSchritt = Math.max(groessterSchritt, Math.abs(v));

  const profil = {
    lMax: r1(L[iMax]), xMax: von + iMax,
    lMin: r1(L[iMin]), xMin: von + iMin,
    spanne: r1(spanne),
    groessterSchritt: r1(groessterSchritt),
    breite80Px: breite80,
  };
  // Eine Kontur ist ein Unterschwinger von ein bis zwei Pixeln: links und
  // rechts davon liegt kein Plateau. Wer eine Schattenflanke sucht, will die
  // staerkste Stelle, die auf beiden Seiten eine ruhige Flaeche hat.
  // Ein Sprung von ein, zwei Stufen ist Rauschen oder Bandenbildung, nie eine
  // Schattenflanke — sonst gewinnt auf einer ruhigen Flaeche ein Zufallspixel
  // gegen die echte Kante nebenan.
  const mind = o.mindestPlateau;
  const taugt = (k) => k.sprung >= 3
    && k.hell.breitePx >= mind && k.dunkel.breitePx >= mind;
  for (const k of alle) k.tauglich = taugt(k);
  const kanten = [...alle.filter(k => k.tauglich), ...alle.filter(k => !k.tauglich)].slice(0, 3);

  return {
    bild: { breite: w, hoehe: h, pixel: gesamt },
    achse, index, zeile: senkrecht ? null : index, spalte: senkrecht ? index : null,
    bereich: { von, bis },
    histogramm: {
      schwarzpunkt: schwarz,
      weisspunkt: weiss,
      p01: perzentil(0.1), p1: perzentil(1),
      median: perzentil(50),
      p99: perzentil(99), p999: perzentil(99.9),
      anteilUnter8: r3(100 * kum[7] / gesamt),
      dichteStau216_232: Math.round(dichteStau),
      dichteMitte150_200: Math.round(dichteMitte),
      stauFaktor: dichteMitte > 0 ? r1(dichteStau / dichteMitte) : null,
      // 32 Buender zu je 8 Stufen, fuer die Textausgabe
      buender: Array.from({ length: 32 }, (_, k) => {
        let s = 0; for (let i = k * 8; i < k * 8 + 8; i++) s += hist[i];
        return r3(100 * s / gesamt);
      }),
    },
    saettigung: {
      schatten: { anteilPixel: r3(100 * satN[0] / gesamt), mittel: r1(100 * (satN[0] ? satSum[0] / satN[0] : 0)) },
      mitten: { anteilPixel: r3(100 * satN[1] / gesamt), mittel: r1(100 * (satN[1] ? satSum[1] / satN[1] : 0)) },
      lichter: { anteilPixel: r3(100 * satN[2] / gesamt), mittel: r1(100 * (satN[2] ? satSum[2] / satN[2] : 0)) },
    },
    bloom: {
      schwelle: o.schwelle,
      anteilProzent: r3(100 * ueberSchwelle / gesamt),
      staffel: Object.fromEntries(stufen.map((s, k) => ['ueber' + s, r3(100 * ueber[k] / gesamt)])),
    },
    kanten, profil,
  };
}

/* --------------------------------------------------------------------------
 * Textausgabe mit Ziel-Ist-Gegenueberstellung
 * ------------------------------------------------------------------------ */

function balken(anteil) {
  const stufen = ' .:-=+*#%@';
  const k = Math.min(9, Math.floor(Math.sqrt(anteil / 25) * 9.99));
  return stufen[k];
}

function zeigen(m, name) {
  const H = m.histogramm, S = m.saettigung, K = m.kanten[0], P = m.profil;
  const pruef = (ok) => ok ? '[ok]' : '[..]';
  const zeilen = [];

  zeilen.push(`Bild        ${name}  ${m.bild.breite}x${m.bild.hoehe}`);
  zeilen.push('');
  zeilen.push('HELLIGKEIT                        Ist        Ziel (Dossier)');
  zeilen.push(`  Schwarzpunkt (kleinstes L)      ${String(H.schwarzpunkt).padStart(6)}     ${pruef(H.schwarzpunkt >= 14)} kein Pixel unter 17`);
  zeilen.push(`  p0,1                            ${String(H.p01).padStart(6)}     ${pruef(H.p01 >= 17 && H.p01 <= 26)} 17..26 (G9 Schwarzhub)`);
  zeilen.push(`  Anteil unter L=8                ${String(H.anteilUnter8).padStart(6)} %   ${pruef(H.anteilUnter8 === 0)} exakt 0,000 %`);
  zeilen.push(`  Median                          ${String(H.median).padStart(6)}     ${pruef(H.median >= 130 && H.median <= 170)} 130..170 (G6 Boden)`);
  zeilen.push(`  p99                             ${String(H.p99).padStart(6)}`);
  zeilen.push(`  Weisspunkt (groesstes L)        ${String(H.weisspunkt).padStart(6)}     ${pruef(H.weisspunkt >= 216)} Stau bei 216..232`);
  zeilen.push(`  Dichte 216..232 / Dichte 150..200 ${String(H.stauFaktor).padStart(4)}x      ${pruef(H.stauFaktor >= 3)} mindestens 3x`);
  zeilen.push('');
  zeilen.push('  Histogramm (32 Buender zu 8 Stufen, 0 links, 255 rechts)');
  zeilen.push('    ' + H.buender.map(balken).join(''));
  zeilen.push('    ' + '0'.padEnd(8) + '64'.padEnd(8) + '128'.padEnd(8) + '192'.padEnd(7) + '255');
  zeilen.push('');
  zeilen.push(`SCHATTENFLANKE  ${m.achse} ${m.index}, Bereich ${m.bereich.von}..${m.bereich.bis}`);
  if (!K) {
    zeilen.push('  keine Kante gefunden (der Schnitt ist voellig flach)');
  } else {
    zeilen.push(`  Kante bei x = ${K.xKante}   Sprung ${K.sprung} Stufen   ${K.richtung}`);
    zeilen.push(`  Lichtplateau    ${String(K.hell.breitePx).padStart(4)} px  Streuung ${K.hell.streuung}  RGB ${K.hell.rgb.join(', ')}  L=${K.hell.luma}`);
    zeilen.push(`                                   ${pruef(K.hell.breitePx >= 30)} >=30 px mit Streuung <=1`);
    zeilen.push(`  Flanke          ${String(K.flankePx).padStart(4)} px  (${K.flankeStufen} Helligkeitsschritte)`);
    zeilen.push(`                                   ${pruef(K.flankePx <= 2)} <=2 px`);
    zeilen.push(`  Schattenplateau ${String(K.dunkel.breitePx).padStart(4)} px  Streuung ${K.dunkel.streuung}  RGB ${K.dunkel.rgb.join(', ')}  L=${K.dunkel.luma}`);
    zeilen.push(`                                   ${pruef(K.dunkel.breitePx >= 12)} >=12 px`);
    zeilen.push(`  Schatten / Licht  ${String(K.verhaeltnis).padStart(6)}         ${pruef(K.verhaeltnis >= 0.82 && K.verhaeltnis <= 0.88)} 0,82..0,88 (gemessen 0,854)`);
    zeilen.push(`  je Kanal R/G/B    ${K.kanalfaktoren.join(' / ')}   ${pruef(K.kanalfaktoren[0] > K.kanalfaktoren[2])} R faellt weniger als B`);
    if (!K.tauglich) {
      zeilen.push('  Hinweis: beiderseits der Kante liegt kein Plateau. Das ist eine Silhouette');
      zeilen.push('           oder eine Kontur, keine Schattenflanke — Bereich mit --von/--bis');
      zeilen.push('           auf die Flaeche eingrenzen, auf der gemessen werden soll.');
    }
    if (m.kanten.length > 1) {
      zeilen.push('  weitere Sprungstellen desselben Schnitts:');
      for (const k of m.kanten.slice(1)) {
        zeilen.push(`    x = ${String(k.xKante).padStart(6)}  Sprung ${String(k.sprung).padStart(5)}  Flanke ${k.flankePx} px  Verhaeltnis ${k.verhaeltnis}`);
      }
    }
  }
  zeilen.push(`  Schnittprofil   L ${P.lMax} bei x=${P.xMax}  bis  L ${P.lMin} bei x=${P.xMin}   Spanne ${P.spanne}`);
  zeilen.push(`  groesster Einzelschritt ${P.groessterSchritt} Stufen`);
  zeilen.push(`  80 % des Abfalls ueber ${P.breite80Px === null ? '-' : P.breite80Px + ' px'}      ${pruef(P.breite80Px !== null && P.breite80Px <= 4)} Genshin: 2 px (stueckweise konstant)`);
  zeilen.push('                                                ToF: rund 70 px (stetig)');
  zeilen.push('');
  zeilen.push('SAETTIGUNG (HSV)                Anteil Bild   mittlere Saettigung');
  zeilen.push(`  Schatten  L < 85              ${String(S.schatten.anteilPixel).padStart(6)} %     ${String(S.schatten.mittel).padStart(6)} %`);
  zeilen.push(`  Mitten    L 85..170           ${String(S.mitten.anteilPixel).padStart(6)} %     ${String(S.mitten.mittel).padStart(6)} %`);
  zeilen.push(`  Lichter   L > 170             ${String(S.lichter.anteilPixel).padStart(6)} %     ${String(S.lichter.mittel).padStart(6)} %   ${pruef(S.lichter.mittel >= 22 && S.lichter.mittel <= 38)} 22..38 %`);
  zeilen.push('');
  zeilen.push(`BLOOM   Anteil ueber L=${m.bloom.schwelle}: ${m.bloom.anteilProzent} %`);
  zeilen.push('  Staffel  ' + Object.entries(m.bloom.staffel).map(([k, v]) => `${k.replace('ueber', '>')}: ${v} %`).join('   '));

  return zeilen.join('\n');
}

/* --------------------------------------------------------------------------
 * Hauptlauf
 * ------------------------------------------------------------------------ */

const server = createServer();
const port = await listen(server, 0);
const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--headless=new', '--no-sandbox', '--hide-scrollbars',
         '--force-device-scale-factor=1', '--force-color-profile=srgb'],
});

let ergebnis;
try {
  const page = await browser.newPage();
  const rel = path.relative(ROOT, absDatei).replace(/\\/g, '/');
  await page.setContent(
    // crossorigin ist Pflicht: ohne den Kopf gilt die Leinwand als "tainted"
    // und getImageData verweigert die Auskunft. Der kleine Server schickt
    // access-control-allow-origin: *, damit geht es sauber auf.
    `<style>html,body{margin:0;background:#000}</style>` +
    `<img id="bild" crossorigin="anonymous" src="http://127.0.0.1:${port}/${rel}">`,
    { waitUntil: 'load' });
  await page.waitForFunction('document.getElementById("bild").naturalWidth > 0', { timeout: 25000 });
  ergebnis = await page.evaluate(messen, opt);
  await page.close();
} finally {
  await browser.close();
  server.close();
}

if (has('json')) {
  console.log(JSON.stringify({ datei: path.relative(ROOT, absDatei).replace(/\\/g, '/'), ...ergebnis }, null, 1));
} else {
  console.log(zeigen(ergebnis, path.relative(ROOT, absDatei).replace(/\\/g, '/')));
}
