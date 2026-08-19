'use strict';
/* ---------------------------------------------------------------------------
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * Die Schleimspur: ein zusammenhaengendes feuchtes Band auf dem Boden.
 *
 * Nur aktiv im zweiten Renderpfad (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche.
 *
 * ===========================================================================
 * 0. Was ersetzt wird, und warum
 * ===========================================================================
 *
 * Der Bestand (renderer2.js/zeichneDekale, uebernommen von schatten.js/'dekale')
 * legt je Spurpunkt EIN rundes Bodendekal in der Fraktionsfarbe:
 *
 *     drawDecal(t.x, t.z, t.r, pal.trail, max(0, t.life) * 0.26, false, vp);
 *
 * Das sind alle 0.05 s (slime.js Zeile 707) ein Kreis vom Radius 0.70..0.95 m,
 * alphagemischt in HELLBLAU. Drei Dinge gehen dabei schief:
 *
 *   1. Man sieht die einzelnen Stempel. Bei 7 m/s stehen die Mittelpunkte
 *      0.35 m auseinander, die Kreise sind 1.4..1.9 m breit — der Rand jedes
 *      Kreises bleibt als Bogen sichtbar, weil `pow(1-d, 1.6)` zur Mitte hin
 *      staerker deckt. Eine Perlenschnur, kein Band.
 *   2. Die Spur ist HELLER als der Boden und traegt eine Fremdfarbe. Nasser
 *      Boden ist dunkler und gesaettigter als trockener, nie heller — das ist
 *      am Referenzmaterial nachgemessen (Abschnitt 1) und es ist auch die
 *      Alltagserfahrung. Ein hellblauer Fleck liest sich als Farbe AUF dem
 *      Boden, nicht als Zustand DES Bodens.
 *   3. Die Breite haengt am Tempo (`0.7 + 0.25*speedRatio`), nicht an der
 *      Auflageflaeche. Beim Aufprall, wo der Koerper auf 1:0.45 platt geht und
 *      doppelt so breit aufliegt, bleibt der Stempel gleich gross.
 *
 * Dieses Modul zeichnet statt dessen EIN Band aus einer einzigen Geometrie,
 * das den Boden dunkler und gesaettigter macht (multiplikativ) und ihm eine
 * harte helle Kante gibt (additiv). Es faerbt nicht, es macht nass.
 *
 * ABHAENGIGKEIT — bitte lesen, bevor das Ergebnis beurteilt wird.
 * Die alten Stempel schaltet dieses Modul NICHT ab; sie liegen in fremden
 * Dateien (`grafik/schatten.js`, Modul 'dekale', Ordnung 50, und als Rueckfall
 * `grafik/renderer2.js`/zeichneDekale). Deshalb meldet dieses Modul sich unter
 *
 *     GRAFIK.spur = { aktiv: true }
 *
 * an, und die beiden Besitzer brauchen je zwei Zeilen:
 *
 *     const eigen = window.GRAFIK && GRAFIK.spur && GRAFIK.spur.aktiv;
 *     if (!eigen) for (const t of slime.trail) { ... }   // wie bisher
 *
 * Solange das nicht geschehen ist, liegt die alte hellblaue Perlenschnur
 * zusaetzlich im Bild (siehe BRAUCHT_FREMDAENDERUNG im Bericht).
 *
 * ===========================================================================
 * 1. Was gemessen wurde
 * ===========================================================================
 *
 * (a) WIE VIEL DUNKLER IST NASSER BODEN?
 *
 * Gemessen an `ref/genshin/wasser_nazuchi_strand_schaumrand_1920.png`
 * (1920x1080), zwei Senkrechtschnitte durch die Wasserlinie, jeweils feuchter
 * Sand unmittelbar hinter dem Schaumsaum gegen trockenen Sand 70 px landeinwaerts:
 *
 *   Spalte x=900    nass  y= 978   RGB 208,200,166   L 199
 *                   trocken y=1050 RGB 216,210,178   L 209
 *   Spalte x=1150   nass  y=1008   RGB 200,190,154   L 190
 *                   trocken y=1065 RGB 212,206,175   L 205
 *   ------------------------------------------------------------------------
 *   VERHAELTNIS nass/trocken je Kanal, Mittel beider Schnitte
 *                   R 0.953   G 0.937   B 0.907      L 0.940
 *   ABFALL je Kanal 0.047     0.063     0.093
 *   ABFALL normiert auf Gruen      0.75 : 1.00 : 1.48
 *   SAETTIGUNG (max-min)/max  nass 0.202 / 0.230, trocken 0.176 / 0.175
 *                   -> +15 % und +31 %, Mittel +23 %
 *
 * Zwei Befunde, und der zweite ist der wichtigere:
 *
 *   - Nass ist nur rund 6 % dunkler. Sehr wenig. Genau das meint „sparsam".
 *   - Der Abfall ist NICHT gleichmaessig, und die Regel dahinter ist
 *     allgemein: der SCHWAECHSTE Kanal verliert am meisten. Auf dem Sand ist
 *     die Reihenfolge R (216) > G (210) > B (178), und die Abfaelle laufen
 *     genau gegenlaeufig 0.75 : 1.00 : 1.48. Nasser Boden wird also nicht
 *     grau, sondern SATTER. Wer statt dessen gleichmaessig abdunkelt
 *     (ein Grauschleier), bekommt einen Schatten und keine Naesse — das ist
 *     der haeufigste Fehler bei dieser Aufgabe.
 *
 * Uebernommen werden die BETRAEGE 0.75 : 1.00 : 1.48 unveraendert. Die
 * ZUORDNUNG zu den Kanaelen folgt der Regel, nicht der Kanalliste: unser
 * Boden ist eine Wiese, kein Sand. Gemessen im eigenen Bild
 * (`vollgas`, Bild 7, Kasten 950,585,60,16) liegt er bei RGB 152 / 178 / 129,
 * also G > R > B. Der schwaechste Kanal ist hier Blau, der staerkste Gruen:
 *
 *   uTiefe = (R 0.185, G 0.139, B 0.274)
 *
 * Wer statt dessen die Kanalliste der Sandmessung abschreibt, laesst auf einer
 * Wiese Rot am wenigsten fallen und zieht das Ergebnis nach Gelbbraun — das
 * Band sah beim ersten Versuch aus wie ausgetrocknete Erde, nicht wie nasses
 * Gras. Der Unterschied ist genau diese Vertauschung.
 *
 * Der BETRAG ist gegenueber der Messung um Faktor 2.9 verstaerkt, also rund
 * 15 % Leuchtdichteabfall im frischesten Teil statt 6 %. Begruendung, offen
 * benannt: eine zuruecklaufende Welle laesst einen Film auf Sand zurueck, ein
 * Schleimkoerper von 2 m Breite laesst eine Schicht zurueck; und unsere
 * Bodenflaeche ist die groesste ruhige Flaeche im Bild — 6 % gehen darin
 * unter. Und die Kamera folgt dem Schleim: was man von der Spur sieht, ist
 * fast immer eine halbe bis zwei Sekunden alt und damit schon halb
 * abgetrocknet. 15 % im frischen Teil ist der Wert, bei dem das Band im
 * Kontaktbogen ueber seine ganze Laenge lesbar wird,
 * ohne den Boden zuzumalen (Abschnitt 5).
 *
 * (b) WIE SIEHT DIE KANTE EINER NASSEN FLAECHE AUS?
 *
 * Dieselbe Datei, Spalte x=900, direkt ueber dem feuchten Sand:
 *
 *   Saumlinie  y=969..975   RGB 222,222,202 .. 224,224,204   L 221..223
 *   feuchter Sand daneben   L 199
 *   ------------------------------------------------------------------------
 *   UEBERHOEHUNG  +12 % gegen die Flaeche, die sie begrenzt
 *   BREITE        9 px bei 1080 = 0.83 % der Bildhoehe, HARTE Kanten
 *
 * Das ist genau die „harte helle Schaumlinie am Rand" aus GRAFIK-MODULE.md §0
 * — dort steht sie als das RICHTIGE Verfahren fuer Wasser, gegen Fresnel und
 * Spiegelung. Das Band bekommt sie deshalb: `uRand = 0.11` additiv in
 * Lichtfarbe, auf den aeussersten 20 % der halben Bandbreite, aber nie
 * schmaler als anderthalb Pixel — das Band liegt flach und wird streifend
 * gesehen, ein fester Anteil der Breite waere in der Ferne duenner als ein
 * Pixel und ersatzlos weg.
 *
 * Der Gegenverlauf ist ebenso gemessen: von nass nach trocken braucht der
 * Strand 72 px = 6.7 % der Bildhoehe, ein LANGER weicher Verlauf ohne Kante.
 * Quer zum Band harte Kante, laengs des Bandes langer Verlauf — daher der
 * Trocknungsexponent auf `life` (Abschnitt 3c).
 *
 * (c) WIE BREIT LIEGT DER KOERPER AUF?
 *
 * `ref/slime/DOSSIER.md` §2, gemessen an `sr1-rest-single-pink-silhouette.jpg`
 * (bbox 1284,718,221,225) durch Farbsegmentierung: die Koerperbreite faellt
 * von 0.78 (85 % Hoehe) ueber 0.64 (90 %) und 0.48 (95 %) auf 0.12 (100 %).
 * Die Flaeche, die den Boden wirklich beruehrt, liegt damit bei
 *
 *   AUFLAGEBREITE = 0.48 .. 0.64 der Koerperbreite, Mittel 0.56
 *
 * Und §3: unter Stauchung wird daraus „eine nahezu gerade Kante mit
 * auslaufendem Rand (Schuerze)", das gestauchte Volumen quillt seitlich ueber
 * die Auflageflaeche hinaus (`sr1-extreme-squash-disc-skirt.jpg`).
 *
 * Deshalb wird die Bandbreite NICHT aus dem Tempo gerechnet, sondern jedes
 * Bild an der verformten Huelle GEMESSEN: die groesste waagerechte Ausladung
 * der untersten 10 % der Huellenhoehe. Beim Aufprall waechst sie mit dem
 * Koerper, im Flug schrumpft sie — ohne dass irgendwo eine Aufprallzeit oder
 * ein Ereignis abgefragt wird. Zielwert in Ruhe: 0.56 der Koerperbreite.
 *
 * ===========================================================================
 * 2. Warum ein Band aus Geometrie und nicht eine Textur ueber die Arena
 * ===========================================================================
 *
 * Die naheliegende Alternative waere eine Nasskarte: ein R8-Renderziel ueber
 * die Arena, in das jedes Bild der Fussabdruck gestempelt wird und das pro
 * Bild ein wenig abtrocknet. Sie waere in einer Hinsicht besser — Ueberlappung
 * kann sich dort nicht aufaddieren.
 *
 * Sie ist es trotzdem nicht wert:
 *   - Ein zusaetzliches Renderziel, ein zusaetzlicher Vollbilddurchgang je
 *     Bild, und eine Zustandsgroesse, die ueber Bilder hinweg lebt. Damit
 *     haengt jede Aufnahme am Verlauf davor.
 *   - Bei `bounds = 26` deckt eine 512er Karte 10 cm je Texel ab. Die harte
 *     Kante aus (b) waere damit weg, und die Kante ist der halbe Effekt.
 *   - GRAFIK-MODULE.md §6: kostet ein Baustein Bildrate, faellt der Baustein.
 *
 * Das Band kostet 2 Zeichenaufrufe auf hoechstens 160 Punkten und 480 Indizes.
 * Die Aufaddierung bei Ueberlappung bleibt — und ist an der einen Stelle, an
 * der sie vorkommt (Kehrtwende), sogar erwuenscht: dort liegt wirklich mehr
 * Schleim.
 *
 * ===========================================================================
 * 3. Wie das Band gebaut wird
 * ===========================================================================
 *
 * Rueckgrat ist `ctx.slime.trail` — dieselbe Liste, die der Bestand
 * abstempelt, aber als Streckenzug gelesen statt als Punktwolke. Jeder Eintrag
 * traegt `{x, z, r, life}`; angelegt wird er in slime.js nur, wenn der Koerper
 * am Boden ist und schneller als 0.6 m/s laeuft.
 *
 * (a) BREITE — an der Huelle gemessen, nicht aus `r` gerechnet.
 *
 * `t.r = radius * (0.7 + 0.25 * speedRatio)` beschreibt das TEMPO, nicht die
 * Auflage. Die Auflage wird hier selbst gemessen (Abschnitt 1c) und je
 * Spurpunkt in einer WeakMap abgelegt — der Eintrag selbst ist der Schluessel.
 * Das ist der einzige Weg, historische Breiten zu behalten, ohne fremde
 * Spielobjekte zu veraendern: slime.js gehoert einer anderen Lane.
 * Wird die Liste vorn beschnitten, verschwindet der Eintrag und mit ihm der
 * Kartenplatz. Kein Aufraeumen noetig.
 *
 * (b) DECKKRAFT — aus `t.r` zurueckgerechnetes Tempo.
 *
 * `speedRatio = (r/radius - 0.7) / 0.25`. Bei Schleichtempo deckt das Band
 * `uTempoBoden` (0.45), bei Vollgas 1.0. Der Auftrag verlangt genau das:
 * Deckkraft folgt dem Tempo, Breite der Auflageflaeche. Zwei verschiedene
 * Groessen, zwei verschiedene Quellen.
 *
 * (c) TROCKNEN — `nass = life^1.25`.
 *
 * `life` faellt in slime.js linear mit 0.5/s, ein Punkt lebt also 2 s. Linear
 * abgetragen waere die Spur auf ihrer ganzen Laenge (bei Vollgas 14 m) etwa
 * gleich praesent — das malt den Boden zu. Ein Exponent groesser 1 verlegt
 * die Deckung nach vorn. 1.25 ist der Kompromiss aus zwei Anforderungen, die
 * gegeneinander stehen: "langsam abtrocknen" und "sparsam". Nach einer
 * halben Sekunde stehen noch 71 %, nach einer Sekunde 42 %, nach
 * anderthalb 21 %, nach zwei Sekunden nichts. Frisch und satt hinter dem Koerper, ein
 * langer blasser Auslauf dahinter — dieselbe Aufteilung wie der gemessene
 * Strandverlauf aus (b): kurze Kante, langer Auslauf.
 *
 * (d) RUTSCHEN — allein aus der Form des Streckenzugs.
 *
 * Verlangt ist: bei einer Kehrtwende muss man an der Spur sehen, dass er
 * gerutscht ist. Dafuer wird kein Ereignis abgefragt und keine Zeit gemessen,
 * sondern der Knick im Streckenzug:
 *
 *     rutsch = clamp((1 - dot(dEin, dAus)) * 0.5, 0, 1) * tempo
 *
 * geradeaus 0, 90 Grad 0.5, Kehrtwende 1.0 — und nur, wenn dabei Tempo im
 * Spiel war. Drei Folgen, alle drei aus der Sache selbst:
 *
 *     BREITER   halbe Breite * (1 + 0.75*rutsch)  — die Schuerze quillt seitlich
 *     SATTER    Deckung      * (1 + 0.60*rutsch)  — mehr Masse bleibt liegen
 *     VERSETZT  Mitte + normalize(dEin - dAus) * 0.75 * rutsch * halbeBreite
 *
 * Der Versatz ist der eigentliche Trick. `normalize(dEin - dAus)` zeigt bei
 * einer Kurve nach AUSSEN aus dem Knick heraus, und bei einer Kehrtwende
 * (dAus = -dEin) genau in die alte Fahrtrichtung WEITER. Das Band schiebt sich
 * dort also ueber den Wendepunkt hinaus, so wie der Koerper es tut, bevor er
 * zurueckkommt: eine Zunge nach vorn. Genau daran sieht man das Rutschen.
 *
 * (e) GEHRUNG UND LUECKEN.
 *
 * Die Querrichtung eines Knotens ist die Winkelhalbierende der beiden
 * Nachbarsegmente, die Breite durch `dot` darauf geteilt (Gehrung), begrenzt
 * auf Faktor 1.4 — sonst schiesst die Ecke bei einer Kehrtwende ins
 * Unendliche. Liegen zwei Punkte weiter als `uSprung` (1.4 m) auseinander, war
 * der Koerper dazwischen in der Luft: dort wird kein Streifen erzeugt, sonst
 * zoege eine Sprungweite einen Balken quer durch das Bild.
 *
 * ===========================================================================
 * 4. Zwei Durchgaenge, und warum es zwei sein muessen
 * ===========================================================================
 *
 * „Dunkler machen" und „glaenzender machen" sind zwei verschiedene
 * Rechenarten, und WebGL2 kann in einem Durchgang nur eine davon:
 *
 *   Durchgang A  blendFunc(ZERO, SRC_COLOR)  -> Ziel = Ziel * Quelle
 *   Durchgang B  blendFunc(ONE,  ONE)        -> Ziel = Ziel + Quelle
 *
 * Dieselbe Geometrie, dasselbe Programm, ein Uniform `uPass` entscheidet.
 * Multiplikativ ist bei A nicht Geschmack, sondern Bedingung: der Boden traegt
 * Schachbrett, Flecken, Gras und Ferndunst. Wer statt dessen eine Farbe
 * darueberblendet, loescht diese Zeichnung aus und legt eine Folie auf die
 * Wiese. Multipliziert bleibt jede Struktur des Bodens erhalten und wird nur
 * dunkler und satter — das ist der Unterschied zwischen „nasser Boden" und
 * „Fleck auf dem Boden".
 *
 * ORDNUNG 56. Nach allem Undurchsichtigen (bis 50), vor der Gelrueckwand (58).
 * Damit gilt: Gras, Felsen und Ausstattung, die VOR dem Band stehen, verdecken
 * es ueber den Tiefentest; der Schleimkoerper selbst deckt es zu, weil er
 * spaeter kommt. Das Band schreibt keine Tiefe — es ist eine Eigenschaft der
 * Bodenflaeche, kein Gegenstand darauf.
 *
 * ===========================================================================
 * 5. Sparsamkeit — die Grenze, an der das Modul sich selbst zurueckhaelt
 * ===========================================================================
 *
 * „Die Spur darf den Boden nicht zumalen." Vier Bremsen sind eingebaut:
 *
 *   1. Trocknungsexponent 1.25 (3c) — die zweite Haelfte der Spur traegt nur
 *      noch ein Fuenftel der Deckung.
 *   2. Tiefe 15 % statt der 6 % der Messung, aber eben auch nicht 30 %.
 *   3. Der helle Saum haengt an `nass^2`, ist also nach einer Sekunde weg.
 *      Ein Doppelstrich ueber 14 m waere genau das Zumalen.
 *   4. Ferndunst: das Band verschwindet ueber `bounds*1.0 .. bounds*2.2`,
 *      derselbe Bereich wie boden.js/uDunstStart. Ohne das wuerde eine
 *      Multiplikation den Dunst am Horizont abdunkeln — der Nebel ist laut
 *      PHASE-GRAFIK-PLAN §1.1 die Tonwertuntergrenze des Bildes und darf von
 *      niemandem unterlaufen werden.
 *
 * DETERMINISMUS: kein Math.random, kein Date, kein performance.now. Das Band
 * haengt ausschliesslich an `ctx.slime.trail` und an der verformten Huelle;
 * `ctx.time` wird nur benutzt, um einen Zeitrucklauf (Neustart einer Aufnahme)
 * zu erkennen und die eigene Messung zu verwerfen.
 * ------------------------------------------------------------------------- */

(function () {
  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/spur.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* =====================================================================
   * Regler. Vorgaben sind die Werte aus Abschnitt 1, nicht Startpunkte.
   * =================================================================== */
  const P = {
    /* Abdunklung im frischesten Teil, je Kanal. Betraege 0.75 : 1.00 : 1.48
     * sind gemessen (1a), die ZUORDNUNG zu den Kanaelen folgt der Regel, die
     * die Messung ergeben hat: der schwaechste Kanal verliert am meisten.
     * Auf unserem gruendominanten Boden (152,178,129) heisst das
     * G am wenigsten, R mittel, B am meisten. Herleitung in 1a. */
    tiefeR: 0.185,
    tiefeG: 0.139,
    tiefeB: 0.274,
    /* Breite der Auflage als Anteil der gemessenen Huellen-Fussbreite.
     * 1.0 heisst: so breit, wie die untersten 10 % der Huelle ausladen. */
    breite: 1.00,
    /* Harte helle Kante, additiv in Lichtfarbe. Gemessen +12 % (1b). */
    rand: 0.11,
    /* Wo die Kante anfaengt, als Anteil der halben Bandbreite.
     * 0.86 ergibt einen Saum von 14 % der Halbbreite — bei einem Band von
     * 90 px Bildbreite rund 6 px, gemessen sind 9 px bei 1080. */
    randAb: 0.80,
    /* Der Kern des Bandes deckt voll, der Leib ausserhalb nur uAussen.
     * Zwei Tonstufen statt eines Verlaufs (GRAFIK-MODULE.md §0). */
    kern: 0.62,
    aussen: 0.55,
    /* Spiegelnder Anteil: nasser Boden wirft die Sonne zurueck. Als klar
     * begrenzte Form mit fwidth-Kante, nicht als weicher Schimmer. */
    spiegel: 0.13,
    haerte: 7.0,
    schwelle: 0.42,
    /* Trocknen: nass = life^trocknen. */
    trocknen: 1.25,
    /* Deckkraft bei Schleichtempo; bei Vollgas immer 1.0. */
    tempoBoden: 0.45,
    /* Rutschen (3d). */
    rutschBreite: 0.75,
    rutschDeckung: 0.60,
    rutschVersatz: 0.75,
    /* Weiter als das auseinander heisst: war in der Luft, kein Streifen. */
    sprung: 1.40,
  };

  /* Hoehe ueber dem Boden. Die Bodenebene liegt bei y = 0, die Dekale des
   * Bestands bei y = 0.012. Knapp darueber, damit das Band im Tiefentest
   * gegen die Ebene gewinnt und trotzdem unter jedem Grashalm bleibt. */
  const HOEHE = 0.014;

  /* slime.js Zeile 709: r = radius * (0.7 + 0.25 * speedRatio). Diese beiden
   * Zahlen sind der Schluessel, mit dem das Tempo zurueckgerechnet wird. */
  const R_BASIS = 0.70;
  const R_SPANNE = 0.25;

  /* Hoechstzahl Knoten: slime.js deckelt trail bei 80, dazu ein Kopfknoten
   * unter dem Koerper. Aufgerundet, damit ein spaeterer Deckel nicht sofort
   * ueberlaeuft. */
  const MAX_KNOTEN = 128;

  const klemm = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const S = {
    bereit: false,
    prog: null,
    vao: null, pb: null, ib: null,
    punkte: new Float32Array(MAX_KNOTEN * 2 * 6),   // 2 Punkte je Knoten, 6 float
    indizes: new Uint16Array((MAX_KNOTEN - 1) * 6),
    anzahl: 0,          // gueltige Indizes in diesem Bild
    /* Auflagebreiten der Spurpunkte. Schluessel ist der Spureintrag selbst. */
    auflage: (typeof WeakMap === 'function') ? new WeakMap() : null,
    letzteZeit: -1,
    /* jedes Bild aus der Huelle gemessen */
    fussBreite: 0.56,
    fussX: 0, fussZ: 0,
    hatFuss: false,
  };

  /* Arbeitspuffer, damit je Bild nichts angelegt wird. */
  const kx = new Float64Array(MAX_KNOTEN);
  const kz = new Float64Array(MAX_KNOTEN);
  const kw = new Float64Array(MAX_KNOTEN);
  const kn = new Float64Array(MAX_KNOTEN);   // Nassheit 0..1
  const kr = new Float64Array(MAX_KNOTEN);   // Rutschen 0..1
  const kluecke = new Uint8Array(MAX_KNOTEN); // 1 = Sprung zum naechsten Knoten

  /* =====================================================================
   * Shader
   * =================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;    /* Weltkoordinate auf der Bodenebene   */
layout(location = 1) in vec3 aInfo;   /* x: quer -1..1, y: nass 0..1, z: rutsch */
uniform mat4 uViewProj;
out vec3 vInfo;
out vec3 vWelt;
void main() {
  vInfo = aInfo;
  vWelt = aPos;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec3 vInfo;
in vec3 vWelt;

uniform vec3  uCam;
uniform vec3  uLicht;      /* Richtung ZUR Sonne */
uniform vec3  uSonne;      /* Farbe der gerichteten Quelle */
uniform vec3  uTiefe;      /* Abdunklung je Kanal, Verhaeltnis 0.75:1.00:1.48 */
uniform float uKern;
uniform float uAussen;
uniform float uRand;
uniform float uRandAb;
uniform float uSpiegel;
uniform float uHaerte;
uniform float uSchwelle;
uniform float uRutschDeckung;
uniform float uBound;      /* welt.bounds, fuer die Dunstblende */
uniform float uPass;       /* 0 = abdunkeln (multiplikativ), 1 = Glanz (additiv) */

out vec4 outColor;

void main() {
  float q  = abs(vInfo.x);
  float fw = max(fwidth(q), 1e-4);

  /* Querschnitt in ZWEI Tonstufen mit harter Kante — kein Verlauf.
   * GRAFIK-MODULE.md §0: „Zwei bis drei Tonstufen je Oberflaeche",
   * „harte Schattenkante", nicht „stufenloser Helligkeitsverlauf". Die
   * Kanten sind mit fwidth auf genau eine Pixelbreite geglaettet: optisch
   * hart, aber ohne Treppen — wir haben keine zeitliche Kantenglaettung,
   * mit der wir Flimmern sonst zudecken koennten. */
  float leib  = 1.0 - smoothstep(1.0 - fw, 1.0, q);
  float kern  = 1.0 - smoothstep(uKern - fw, uKern + fw, q);
  float stufe = leib * mix(uAussen, 1.0, kern);

  /* Der Ferndunst ist die Tonwertuntergrenze des Bildes (PHASE-GRAFIK-PLAN
   * §1.1). Eine Multiplikation, die bis zum Horizont laeuft, wuerde ihn
   * unterlaufen. Also blendet das Band ueber denselben Bereich aus, in dem
   * boden.js seinen Dunst einblendet. */
  float sicht = 1.0 - smoothstep(uBound * 1.0, uBound * 2.2, distance(vWelt, uCam));

  float nass = vInfo.y * stufe * sicht * (1.0 + uRutschDeckung * vInfo.z);
  nass = clamp(nass, 0.0, 1.0);

  if (uPass < 0.5) {
    /* Durchgang A — multiplikativ. Der Boden behaelt seine ganze Zeichnung
     * und wird nur dunkler und satter. Blau faellt am staerksten: gemessen
     * 0.75 : 1.00 : 1.48 (Kopfkommentar 1a). */
    outColor = vec4(1.0 - nass * uTiefe, 1.0);
    return;
  }

  /* Durchgang B — additiv.
   *
   * (1) Die harte helle Kante. Gemessen am Schaumsaum: +12 % gegen die
   *     Flaeche, die sie begrenzt, ueber 0.8 % der Bildhoehe, harte Kanten.
   *     Sie haengt an nass^2 und ist damit nach rund einer Sekunde weg —
   *     ein Doppelstrich ueber die ganze Spurlaenge waere Zumalen.
   *
   *     Die Breite wird nach UNTEN durch die Pixelbreite begrenzt, nicht nach
   *     oben: das Band liegt flach und wird streifend gesehen, quer darueber
   *     aendert sich q bei einem Meter Abstand schon um mehr als 0.2 je
   *     Pixel. Ein fester Anteil der Halbbreite waere dort duenner als ein
   *     Pixel und verschwaende ersatzlos — beim ersten Versuch war der Saum
   *     genau deshalb nirgends zu sehen. max(..., 1.5*fw) haelt ihn auf
   *     mindestens anderthalb Pixel. */
  float randBreite = max(1.0 - uRandAb, 1.5 * fw);
  float saum = (1.0 - smoothstep(0.0, randBreite, 1.0 - q)) * leib;

  /* (2) Der spiegelnde Anteil. Auf der Bodenebene ist die Normale (0,1,0),
   *     also ist N.H schlicht H.y. Das ergibt von selbst einen begrenzten
   *     Bereich dort, wo die Sonne sich im Boden spiegelt — das Band
   *     glaenzt, wenn es durch diesen Bereich laeuft, und sonst nicht.
   *     Genau so gehoert sich ein Glanzlicht: eine klar begrenzte Form, die
   *     an der Blickrichtung haengt, kein gleichmaessiger Schleier ueber
   *     alles Nasse. Die Schwelle mit fwidth macht daraus eine harte Form
   *     (Genshins Binaerstufe, PHASE-GRAFIK-PLAN §1.2). */
  vec3 V = normalize(uCam - vWelt);
  vec3 H = normalize(normalize(uLicht) + V);
  float s = pow(max(H.y, 0.0), uHaerte);
  float sfw = max(fwidth(s), 1e-4);
  float spiegel = smoothstep(uSchwelle - sfw, uSchwelle + sfw, s) * stufe;

  float g = vInfo.y * vInfo.y * sicht * (saum * uRand + spiegel * uSpiegel);
  outColor = vec4(uSonne * g, 1.0);
}`;

  /* Fahrtrichtung in der Bodenebene. Erste Wahl ist die Geschwindigkeit des
   * Weichkoerpers (softbody.js mittelt sie ueber alle Massepunkte), Rueckfall
   * ist das letzte Stueck des Streckenzugs. */
  const _dir = { x: 1, z: 0 };
  function fahrtrichtung(ctx) {
    const b = ctx.slime && ctx.slime.body;
    if (b) {
      const l = Math.hypot(b.vx, b.vz);
      if (l > 0.25) { _dir.x = b.vx / l; _dir.z = b.vz / l; return true; }
    }
    const t = ctx.slime && ctx.slime.trail;
    if (t && t.length >= 2) {
      const a = t[t.length - 2], c = t[t.length - 1];
      const dx = c.x - a.x, dz = c.z - a.z;
      const l = Math.hypot(dx, dz);
      if (l > 1e-3) { _dir.x = dx / l; _dir.z = dz / l; return true; }
    }
    return false;
  }

  /* =====================================================================
   * Die Auflageflaeche an der verformten Huelle messen
   *
   * Abschnitt 1c: der Koerper beruehrt den Boden mit rund 0.56 seiner
   * Breite. Gemessen wird deshalb die unterste Scheibe der Huelle (10 % der
   * Huellenhoehe) — und von ihr die Ausladung QUER ZUR FAHRTRICHTUNG.
   *
   * Das Quer ist nicht Feinschliff, sondern der Kern der Sache. Bei Vollgas
   * ist der Koerper ein Tropfen von 2.5 m Laenge und knapp 1 m Breite
   * (DOSSIER §4, Streckung 1 : 1.4 bis 1 : 1.8). Die groesste Ausladung des
   * Fusses ist dann die LAENGE, nicht die Breite. Wer sie als Bandbreite
   * nimmt, zieht bei Hoechsttempo einen fuenf Meter breiten Teppich hinter
   * dem Schleim her — genau das ist beim ersten Versuch passiert.
   *
   * Reichen die Punkte in der untersten Scheibe nicht (grobes Netz, Koerper
   * in der Luft), wird die Scheibe schrittweise dicker gemacht: lieber etwas
   * zu breit gemessen als aus drei Punkten geraten.
   * =================================================================== */
  function fussMessen(ctx) {
    S.hatFuss = false;
    const pos = ctx.surface && ctx.surface.positions;
    if (!pos || pos.length < 9) return false;

    fahrtrichtung(ctx);
    const qx = _dir.z, qz = -_dir.x;          // quer zur Fahrt, in der Ebene

    let yMin = Infinity, yMax = -Infinity;
    for (let i = 1; i < pos.length; i += 3) {
      const y = pos[i];
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    const hoehe = Math.max(yMax - yMin, 1e-4);

    for (const anteil of [0.10, 0.18, 0.30, 1.00]) {
      const grenze = yMin + hoehe * anteil;
      let n = 0, sx = 0, sz = 0;
      for (let i = 0; i + 2 < pos.length; i += 3) {
        if (pos[i + 1] > grenze) continue;
        sx += pos[i]; sz += pos[i + 2]; n++;
      }
      if (n < 12 && anteil < 1.0) continue;
      if (n === 0) return false;
      const mx = sx / n, mz = sz / n;
      let max = 0;
      for (let i = 0; i + 2 < pos.length; i += 3) {
        if (pos[i + 1] > grenze) continue;
        const q = Math.abs((pos[i] - mx) * qx + (pos[i + 2] - mz) * qz);
        if (q > max) max = q;
      }
      /* Deckel: breiter als der Koerper kann die Auflage nicht sein. Faengt
       * eine entartete Huelle ab, ohne im Normalfall je zu greifen. */
      const deckel = ((ctx.params && ctx.params.radius) || 1) * 1.00;
      S.fussBreite = klemm(max, 1e-3, deckel);
      S.fussX = mx;
      S.fussZ = mz;
      S.hatFuss = true;
      return true;
    }
    return false;
  }

  /* =====================================================================
   * Das Rueckgrat einsammeln
   * =================================================================== */
  function knotenSammeln(ctx) {
    const slime = ctx.slime;
    const trail = slime && slime.trail;
    if (!trail || !trail.length) return 0;

    const radius = (ctx.params && ctx.params.radius) || 1;
    let n = 0;

    for (let i = 0; i < trail.length && n < MAX_KNOTEN - 1; i++) {
      const t = trail[i];
      const life = klemm(t.life, 0, 1);
      if (life <= 0.001) continue;

      /* Tempo aus dem abgelegten Radius zurueckrechnen (Abschnitt 3b). */
      const tempo = klemm((t.r / radius - R_BASIS) / R_SPANNE, 0, 1);

      /* Auflagebreite: die zum Zeitpunkt des Ablegens gemessene. Kennt die
       * Karte den Eintrag noch nicht, ist er in DIESEM Bild entstanden —
       * dann ist die eben gemessene Breite die richtige. */
      let w = 0;
      if (S.auflage) {
        const g = S.auflage.get(t);
        if (g === undefined) {
          w = S.hatFuss ? S.fussBreite : t.r * 0.62;
          S.auflage.set(t, w);
        } else {
          w = g;
        }
      } else {
        w = t.r * 0.62;
      }

      kx[n] = t.x;
      kz[n] = t.z;
      kw[n] = Math.max(w * P.breite, 0.02);
      kn[n] = Math.pow(life, P.trocknen) * (P.tempoBoden + (1 - P.tempoBoden) * tempo);
      kr[n] = 0;
      n++;
    }

    /* Kopfknoten unter dem Koerper: der juengste Spurpunkt ist bis zu 0.05 s
     * alt, bei Vollgas also 0.35 m hinter der Auflage. Ohne ihn endet das
     * Band sichtbar VOR dem Schleim. Nur anhaengen, wenn er wirklich an den
     * letzten anschliesst — steht der Koerper, waere es sonst ein Balken
     * vom letzten Bewegungspunkt bis hierher. */
    if (n > 0 && S.hatFuss && n < MAX_KNOTEN) {
      const dx = S.fussX - kx[n - 1], dz = S.fussZ - kz[n - 1];
      const d = Math.hypot(dx, dz);
      if (d > 0.02 && d < P.sprung) {
        kx[n] = S.fussX;
        kz[n] = S.fussZ;
        kw[n] = Math.max(S.fussBreite * P.breite, 0.02);
        kn[n] = kn[n - 1];
        kr[n] = 0;
        n++;
      }
    }
    return n;
  }

  /* Den Streckenzug glaetten.
   *
   * Zwei Gruende, und der zweite ist der zwingende:
   *
   *  1. Die Punkte kommen vom Schwerpunkt des Weichkoerpers, und der wabbelt.
   *     Alle 0.05 s abgetastet ergibt das einen leicht zittrigen Zug, und ein
   *     Band darauf hat gezackte Raender.
   *  2. Bei einer echten Kehrtwende faellt der Zug auf sich selbst zurueck.
   *     Ein Band braucht an jedem Knoten eine QUERRICHTUNG; wo Ein- und
   *     Ausgang genau entgegengesetzt sind, gibt es keine, und die
   *     Winkelhalbierende kippt zwischen zwei Nachbarknoten um 180 Grad —
   *     das Band verdreht sich und zerfaellt in Zacken. Genau so sah der
   *     zweite Versuch am Wendepunkt aus: ein Blitz statt einer Zunge.
   *     Zweimal 1-2-1 macht aus der Faltung eine enge Kehre mit endlichem
   *     Radius. Das ist keine Kosmetik — es ist auch naeher an der Sache:
   *     der Koerper wendet nicht auf der Stelle, er bremst, schiesst ueber
   *     und kommt zurueck (GDD 01 §15).
   *
   * Die Enden bleiben stehen: das juengste Ende sitzt unter dem Koerper und
   * darf nicht von ihm wegwandern. */
  function zugGlaetten(n, durchgaenge) {
    for (let d = 0; d < durchgaenge; d++) {
      let vx = kx[0], vz = kz[0], vw = kw[0];
      for (let i = 1; i < n - 1; i++) {
        const nx = (vx + 2 * kx[i] + kx[i + 1]) * 0.25;
        const nz = (vz + 2 * kz[i] + kz[i + 1]) * 0.25;
        const nw = (vw + 2 * kw[i] + kw[i + 1]) * 0.25;
        vx = kx[i]; vz = kz[i]; vw = kw[i];
        kx[i] = nx; kz[i] = nz; kw[i] = nw;
      }
    }
  }

  /* Rutschen aus dem Knick im Streckenzug (Abschnitt 3d). Liefert zugleich
   * die Richtung, in die der Versatz zeigt. */
  const _ver = { x: 0, z: 0 };
  function rutschRechnen(n) {
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1) { kr[i] = 0; continue; }
      let ax = kx[i] - kx[i - 1], az = kz[i] - kz[i - 1];
      let bx = kx[i + 1] - kx[i], bz = kz[i + 1] - kz[i];
      const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      if (la < 1e-4 || lb < 1e-4) { kr[i] = 0; continue; }
      ax /= la; az /= la; bx /= lb; bz /= lb;
      const knick = klemm((1 - (ax * bx + az * bz)) * 0.5, 0, 1);
      /* Nur was schnell war, ist gerutscht. kn traegt das Tempo schon. */
      kr[i] = knick;
    }
    /* Ein Knick ist selten genau einen Knoten breit — der Koerper rutscht
     * ueber mehrere Abtastungen hinweg. Zwei Glaettungen mit 1-2-1 verteilen
     * den Wert auf die Nachbarn, sonst steht dort eine einzelne dicke Beule
     * statt einer Zunge. */
    for (let d = 0; d < 2; d++) {
      let vor = kr[0];
      for (let i = 1; i < n - 1; i++) {
        const neu = (vor + 2 * kr[i] + kr[i + 1]) * 0.25;
        vor = kr[i];
        kr[i] = neu;
      }
    }
  }

  function versatzRichtung(i, n) {
    _ver.x = 0; _ver.z = 0;
    if (i <= 0 || i >= n - 1) return false;
    let ax = kx[i] - kx[i - 1], az = kz[i] - kz[i - 1];
    let bx = kx[i + 1] - kx[i], bz = kz[i + 1] - kz[i];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 1e-4 || lb < 1e-4) return false;
    ax /= la; az /= la; bx /= lb; bz /= lb;
    const vx = ax - bx, vz = az - bz;
    const lv = Math.hypot(vx, vz);
    if (lv < 1e-4) return false;
    _ver.x = vx / lv; _ver.z = vz / lv;
    return true;
  }

  /* =====================================================================
   * Aus dem Streckenzug ein Band machen
   * =================================================================== */
  function bandBauen(n) {
    const pkt = S.punkte, idx = S.indizes;
    let iz = 0;

    for (let i = 0; i < n; i++) {
      /* Querrichtung: Winkelhalbierende der Nachbarsegmente (Gehrung). */
      let ex = 0, ez = 0;   // eingehende Richtung
      let sx = 0, sz = 0;   // ausgehende Richtung
      if (i > 0) {
        ex = kx[i] - kx[i - 1]; ez = kz[i] - kz[i - 1];
        const l = Math.hypot(ex, ez); if (l > 1e-5) { ex /= l; ez /= l; } else { ex = 0; ez = 0; }
      }
      if (i < n - 1) {
        sx = kx[i + 1] - kx[i]; sz = kz[i + 1] - kz[i];
        const l = Math.hypot(sx, sz); if (l > 1e-5) { sx /= l; sz /= l; } else { sx = 0; sz = 0; }
      }
      let dx = ex + sx, dz = ez + sz;
      let l = Math.hypot(dx, dz);
      if (l < 1e-5) { dx = sx || ex; dz = sz || ez; l = Math.hypot(dx, dz); }
      if (l < 1e-5) { dx = 1; dz = 0; l = 1; }
      dx /= l; dz /= l;

      /* Quer dazu, in der Bodenebene. */
      let qx = dz, qz = -dx;

      /* Gehrungsausgleich: an einer Kurve muss der Querschnitt laenger
       * werden, damit die Bandbreite gleich bleibt. Begrenzt auf 1.4,
       * sonst schiesst die Ecke bei einer Kehrtwende ins Unendliche. */
      let gehrung = 1;
      if (i > 0 && i < n - 1) {
        const nex = ez, nez = -ex;                 // Querrichtung des Eingangs
        const k = Math.abs(qx * nex + qz * nez);
        gehrung = klemm(k > 1e-3 ? 1 / k : 1.4, 1, 1.4);
      }

      const rutsch = kr[i];
      let halb = kw[i] * gehrung * (1 + P.rutschBreite * rutsch);

      let cx = kx[i], cz = kz[i];
      if (rutsch > 0.001 && versatzRichtung(i, n)) {
        const v = P.rutschVersatz * rutsch * kw[i];
        cx += _ver.x * v;
        cz += _ver.z * v;
      }

      const b = i * 12;
      pkt[b + 0] = cx - qx * halb; pkt[b + 1] = HOEHE; pkt[b + 2] = cz - qz * halb;
      pkt[b + 3] = -1;             pkt[b + 4] = kn[i]; pkt[b + 5] = rutsch;
      pkt[b + 6] = cx + qx * halb; pkt[b + 7] = HOEHE; pkt[b + 8] = cz + qz * halb;
      pkt[b + 9] = 1;              pkt[b + 10] = kn[i]; pkt[b + 11] = rutsch;

      /* Luecke zum naechsten Knoten? Dann kein Streifen. */
      kluecke[i] = 0;
      if (i < n - 1) {
        const d = Math.hypot(kx[i + 1] - kx[i], kz[i + 1] - kz[i]);
        if (d > P.sprung) kluecke[i] = 1;
      }
    }

    for (let i = 0; i < n - 1; i++) {
      if (kluecke[i]) continue;
      if (kn[i] <= 0.002 && kn[i + 1] <= 0.002) continue;
      const a = i * 2, c = (i + 1) * 2;
      idx[iz++] = a; idx[iz++] = a + 1; idx[iz++] = c;
      idx[iz++] = c; idx[iz++] = a + 1; idx[iz++] = c + 1;
    }
    return iz;
  }

  /* renderer2.js legt ctx.licht mit Nullvektoren an; licht.js fuellt sie.
   * Ein Nullvektor gilt deshalb als fehlender Wert. (Gleiche Vorsicht wie in
   * schleim/glanz.js — sonst ist der Glanz schwarz, solange licht.js fehlt.) */
  const nimm = (v, vorgabe) =>
    (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;

  const _tiefe = new Float32Array(3);

  /* =====================================================================
   * Anmeldung
   * =================================================================== */
  G.modul({
    name: 'spur',
    ordnung: 56,
    /* Es gibt keinen Grundzug namens 'spur', also verdraengt dieses Modul
     * nichts und zeichnet zusaetzlich. Die alten Stempel liegen in
     * schatten.js/'dekale' — siehe Kopfkommentar Abschnitt 0. */

    regler: [
      { key: 'breite', min: 0.3, max: 2.0, step: 0.02, wert: P.breite },
      { key: 'tiefeR', min: 0.0, max: 0.5, step: 0.005, wert: P.tiefeR },
      { key: 'tiefeG', min: 0.0, max: 0.5, step: 0.005, wert: P.tiefeG },
      { key: 'tiefeB', min: 0.0, max: 0.5, step: 0.005, wert: P.tiefeB },
      { key: 'rand', min: 0.0, max: 0.5, step: 0.005, wert: P.rand },
      { key: 'randAb', min: 0.5, max: 0.99, step: 0.01, wert: P.randAb },
      { key: 'kern', min: 0.2, max: 0.95, step: 0.01, wert: P.kern },
      { key: 'aussen', min: 0.0, max: 1.0, step: 0.01, wert: P.aussen },
      { key: 'spiegel', min: 0.0, max: 0.6, step: 0.005, wert: P.spiegel },
      { key: 'haerte', min: 4.0, max: 80.0, step: 1.0, wert: P.haerte },
      { key: 'schwelle', min: 0.05, max: 0.95, step: 0.01, wert: P.schwelle },
      { key: 'trocknen', min: 0.5, max: 4.0, step: 0.05, wert: P.trocknen },
      { key: 'tempoBoden', min: 0.0, max: 1.0, step: 0.01, wert: P.tempoBoden },
      { key: 'rutschBreite', min: 0.0, max: 2.0, step: 0.05, wert: P.rutschBreite },
      { key: 'rutschDeckung', min: 0.0, max: 2.0, step: 0.05, wert: P.rutschDeckung },
      { key: 'rutschVersatz', min: 0.0, max: 2.5, step: 0.05, wert: P.rutschVersatz },
      { key: 'sprung', min: 0.4, max: 4.0, step: 0.05, wert: P.sprung },
    ],

    aufbau(gl, R) {
      S.prog = G.programm(gl, VS, FS, 'schleim/spur');

      S.vao = gl.createVertexArray();
      gl.bindVertexArray(S.vao);
      S.pb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, S.pb);
      gl.bufferData(gl.ARRAY_BUFFER, S.punkte.byteLength, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      S.ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, S.indizes.byteLength, gl.DYNAMIC_DRAW);
      gl.bindVertexArray(null);

      S.bereit = true;
      G.spur = { aktiv: true };   // Absprache mit den Besitzern der Dekale
    },

    vorbereiten(gl, R, ctx) {
      S.anzahl = 0;
      if (!S.bereit) return;

      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];

      /* Zeitrucklauf (neue Aufnahme im selben Kontext): die gemerkten
       * Auflagebreiten gehoeren zu einem anderen Lauf. Verwerfen. */
      if (ctx.time < S.letzteZeit - 1e-6 && S.auflage) S.auflage = new WeakMap();
      S.letzteZeit = ctx.time;

      fussMessen(ctx);
      const n = knotenSammeln(ctx);
      if (n < 2) return;
      /* Reihenfolge: erst das Rutschen am ROHEN Zug messen — der Knick ist
       * genau das, was die Glaettung wegnimmt —, dann glaetten, dann bauen. */
      rutschRechnen(n);
      zugGlaetten(n, 2);
      S.anzahl = bandBauen(n);

      if (S.anzahl > 0) {
        gl.bindVertexArray(S.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, S.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.punkte, 0, n * 12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.ib);
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, S.indizes, 0, S.anzahl);
        gl.bindVertexArray(null);
      }
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit || S.anzahl <= 0) return;
      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      const licht = ctx.licht || {};
      const richtung = nimm(licht.richtung, nimm(R.light, [0.55, 0.78, 0.32]));
      const sonne = nimm(licht.farbe, [1.0, 0.97, 0.90]);

      _tiefe[0] = P.tiefeR; _tiefe[1] = P.tiefeG; _tiefe[2] = P.tiefeB;

      const p = S.prog, u = p.u || {};
      gl.useProgram(p);
      gl.bindVertexArray(S.vao);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform3fv(u.uLicht, richtung);
      gl.uniform3fv(u.uSonne, sonne);
      gl.uniform3fv(u.uTiefe, _tiefe);
      gl.uniform1f(u.uKern, P.kern);
      gl.uniform1f(u.uAussen, P.aussen);
      gl.uniform1f(u.uRand, P.rand);
      gl.uniform1f(u.uRandAb, P.randAb);
      gl.uniform1f(u.uSpiegel, P.spiegel);
      gl.uniform1f(u.uHaerte, P.haerte);
      gl.uniform1f(u.uSchwelle, P.schwelle);
      gl.uniform1f(u.uRutschDeckung, P.rutschDeckung);
      gl.uniform1f(u.uBound, (ctx.welt && ctx.welt.bounds) || 26);

      /* Das Band ist eine Eigenschaft der Bodenflaeche, kein Gegenstand
       * darauf: Tiefentest ja (Gras und Felsen davor verdecken es),
       * Tiefenschreiben nein. Beide Seiten, weil das Band bei einer
       * Kehrtwende in sich zurueckklappt und dann teils von unten gesehen
       * wird — eine Rueckseitenverwerfung risse dort ein Loch. */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);

      /* A — abdunkeln: Ziel = Ziel * Quelle. */
      gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
      gl.uniform1f(u.uPass, 0);
      gl.drawElements(gl.TRIANGLES, S.anzahl, gl.UNSIGNED_SHORT, 0);

      /* B — Glanz: Ziel = Ziel + Quelle. */
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1f(u.uPass, 1);
      gl.drawElements(gl.TRIANGLES, S.anzahl, gl.UNSIGNED_SHORT, 0);

      /* Zustand zuruecklassen, wie die Pipeline ihn erwartet
       * (renderer2.js §5 — der naechste Durchgang darf sich auf nichts
       * von hier verlassen, aber er darf auch nichts Kaputtes vorfinden). */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
  });

})();
