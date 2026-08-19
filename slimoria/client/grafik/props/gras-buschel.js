'use strict';
/* ===========================================================================
 * grafik/props/gras-buschel.js — Grasbueschel als einzelne Horste.
 *
 * Besitzer: Lane KARTE. Vertrag: GRAFIK-MODULE.md §3 und der Registerteil von
 * grafik/karte.js. Angemeldet unter dem Namen, unter dem karte.js seine
 * Stuecke fuehrt: 'bueschel'. Der Auftragsname 'gras-buschel' ist zusaetzlich
 * angemeldet, damit die Datei auch dann traegt, wenn karte.js jemals unter
 * diesem Namen setzt — dieselbe Geometrie, nur eine andere Liste.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESER TYP IST — UND WAS NICHT
 *
 * NICHT der flaechige Rasen. Den baut Lane GRAFIK in grafik/gras.js: 26.000
 * Halme von 0,30 Hoehe, gleichmaessig ueber die begehbare Flaeche, die den
 * Boden schliessen. Dieser Typ sind die markanten EINZELSTUECKE dazwischen:
 * 749 Horste von 0,35 bis 1,10 Hoehe, jeder ein Faecher aus 7 bis 13 Halmen
 * aus einem Fuss. In Genshins Wiesen ist genau das die zweite Lage —
 * gras_halme_nahaufnahme_tag_1366 zeigt unten den geschlossenen Teppich und
 * darueber einzelne, deutlich groessere Buendel, die die Silhouette machen.
 * Ohne sie ist eine Wiese eine gruene Flaeche; mit ihnen bekommt sie Kanten.
 *
 * ---------------------------------------------------------------------------
 * DIE ABSPRACHE MIT grafik/gras.js — gelesen, nicht vermutet
 *
 * Beide Module zeichnen Gras. Laufen sie in irgendeiner Formel auseinander,
 * sieht man auf denselben Quadratmetern ZWEI Grassorten, und das ist auffaellig
 * schlechter als gar keine Horste. Deshalb uebernimmt diese Datei von gras.js
 * WORTGLEICH:
 *
 *   Windwelle      dot(p.xz, vec2(0.12,0.09)) + t*1.6 · Boee mit
 *                  vec2(0.013,0.011) und -t*0.35 · 0.65+0.35*sin(...) ·
 *                  sin(ph)*0.7 + sin(ph*2.3+1.1)*0.3 · Basis steht still (t*t)
 *                  — alles aus PHASE-GRAFIK-PLAN G12. Windstaerke 0,16 und
 *                  Windrichtung (0,82/0,57) sind die Reglervorgaben von gras.js.
 *   Beleuchtung    ndl01() aus dem Baustein `halblambert`, eine Rampenstufe
 *                  bei kante 0,55 mit Flanke 0,05, Schatten MULTIPLIKATIV und
 *                  warm (0,88/0,84/0,79), Lichtfarbe nur zur Haelfte
 *                  eingemischt.
 *   Durchleuchtung rueck * (0,30 + 0,70*gegen^2) * 0,55
 *   Saum           pow(dot(V,-L),2.5) * (1-|dot(N,V)|), Farbe (158,141,54)/255,
 *                  ueber max() eingemischt, damit er NIE abdunkelt.
 *   Fernduns       smoothstep(bounds*0.7, bounds*1.6, |p.xz|) auf li.dunst —
 *                  dieselbe Zeile wie in FS_GROUND, sonst reisst zwischen
 *                  Gras, Horst und Boden eine Naht auf.
 *   Halmnetz       9 Punkte, 7 Dreiecke, TRIANGLE_STRIP, echte verjuengte
 *                  Geometrie ohne Alphatest.
 *
 * Vier Dinge sind bewusst ANDERS, und alle vier sind der Sinn dieses Typs:
 *   1. Der Fuss ist dunkler (0,30/0,50/0,21 gegen 0,44/0,72/0,31 im Teppich),
 *      und der Hoehengang ist haerter (Exponent 1,15 gegen 0,75). Ein Horst
 *      aus 7 bis 13 Halmen verschattet sich innen selbst, ein einzelner
 *      Teppichhalm nicht. Die SPITZE ist identisch — es ist dieselbe
 *      Pflanze, nur dichter.
 *   2. Die halmweise Tonspanne ist weiter (0,83…1,18 gegen 0,88…1,12). Im
 *      Teppich liegen die Halme einzeln, im Horst stehen sie ineinander;
 *      ohne den groesseren Unterschied wird die Rosette eine gruene Flaeche.
 *   3. Die Halme faechern aus EINEM Fuss auf, mit richtungsabhaengiger
 *      Biegung — der Teppich streut Einzelhalme.
 *   4. Die Windauslenkung waechst mit sqrt(Laenge/0,30): der Teppich ist
 *      0,30 hoch, ein Horst bis 1,10, und derselbe absolute Ausschlag saehe
 *      an einem dreimal so langen Halm steif aus.
 *
 * Hoehen ueberschneiden sich absichtlich nur wenig: Teppich 0,30, Horste ab
 * 0,35. Der Horst waechst sichtbar aus dem Rasen heraus, statt in ihm zu
 * verschwinden.
 *
 * ---------------------------------------------------------------------------
 * GEMESSEN, NICHT GERATEN — eigene Pixelsonde ueber ref/genshin/
 *
 *   gras_halme_nahaufnahme_tag_1366.png, Zeile 560 (60 Stuetzstellen):
 *     Halmkoerper       (155,207, 86)  L 183
 *     Halmspitze hell   (202,248,113)  L 227
 *     dunklerer Halm    (149,199, 88)  L 176
 *     Boden dazwischen  (177,220,108)  L 205  -> HELLER als der Halm.
 *     Keine Wurzelverdunklung, kein Kontaktschatten am Fuss. Das ist die
 *     Eigenheit, die man beim Nachbauen zuerst falsch macht.
 *     Farbverhaeltnis des Halms: G/R 1,34 · B/R 0,55.
 *
 *   gras_nahaufnahme_daemmerung_2560.png, Zeile 1120, Halme gegen das helle
 *     Wasser (91,126,171): sieben messbare Halme mit Breiten 12/16/18/22/22/
 *     24/32 px bei Halmlaengen um 250 px, also Breite 10…13 % der Laenge.
 *     Hier gebaut: 2*(0,045…0,070) = 9…14 %.
 *     Am rechten Rand derselben Zeile der Gegenlichtsaum: (198,190,101)
 *     unmittelbar neben Halm (72,85,24).
 *
 *   landschaft_wiese_mittag_figur_2560.png und
 *   landschaft_sumeru_wiese_see_tag_2560.png: die Figur ist 240 px hoch, das
 *     Gras an ihrem Standort reicht 45…85 px, also 0,18…0,35 der Figurenhoehe.
 *     Der Schleim ist 2,0 hoch -> 0,36…0,70. Genau die Spanne, die karte.js
 *     innerhalb der Arena vergibt (0,35…0,80).
 *
 *   gras_nahaufnahme_nacht_2560.png: an der Kammlinie stehen die Halme als
 *     einzelne, leicht S-foermige Lanzen, gespreizt um rund ±25° — daher der
 *     Faecher unten und die staerkere Biegung der kurzen Aussenhalme.
 *
 * ---------------------------------------------------------------------------
 * DREI GRENZEN
 *
 * 1. DER SCHLEIM IST DIE FIGUR (GDD 10 §69/§98). Kein Halm wird hoeher als
 *    s.groesse — die Bezierkurve setzt ihre Spitze auf exakt diese Hoehe, und
 *    der Wind lenkt nur seitlich aus und senkt die Spitze dabei zusaetzlich.
 *    Innerhalb der Arena vergibt karte.js hoechstens 0,80: weniger als die
 *    halbe Koerperhoehe des Schleims. Farbe und Wind sind zurueckhaltend
 *    eingestellt; im Zweifel weniger.
 * 2. KEINE KOLLISION. Diese Datei liest nur die fertige Stueckliste aus
 *    karte.js. Sie fasst world.js nicht an und kommt in keinem istFrei() vor.
 * 3. KOSTEN. Ein Halm = 9 Punkte, 7 Dreiecke. 749 Horste x im Mittel 9,7
 *    Halme = 7.287 Halme = 51.009 Dreiecke in EINEM drawArraysInstanced.
 *    Der Instanzpuffer wird einmal gebaut und danach nie angefasst; der Wind
 *    sitzt vollstaendig im Vertex-Shader. Gemessen im kopflosen SwiftShader
 *    bei 1600x900 kostet der ganze Typ rund 1,4 ms je Bild; tragbar sind dort
 *    etwa 1.800 Horste. Zahlen und Verfahren stehen im Bericht.
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4): kein Math.random, kein Date, kein
 * performance.now. Jede Zahl faellt aus der gerundeten Weltposition des
 * Horstes und dem Halmindex. Zeit ausschliesslich ueber ctx.time.
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || !KARTE || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[gras-buschel] KARTE fehlt — Typ nicht angemeldet.');
    }
    return;
  }

  /* =======================================================================
   * 1. Deterministische Zahlen
   *
   * Derselbe ganzzahlige Mischer wie in karte.js. Gefuettert wird er mit der
   * gerundeten WELTPOSITION des Horstes und dem Halmindex — nie mit einem
   * laufenden Zaehler. Damit haengt kein Halm davon ab, wie viele Horste vor
   * ihm in der Liste stehen, und ein zusaetzlicher Streubereich in karte.js
   * verschiebt keinen einzigen bestehenden Halm.
   * ===================================================================== */

  function h32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d);
    h ^= Math.imul(b | 0, 0x165667b1);
    h ^= Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 13;
    h = Math.imul(h, 0x297a2d39);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const zahl = (a, b, c) => h32(a, b, c) * 2.3283064365386963e-10;

  /* =======================================================================
   * 2. Aussehen — alle Stellschrauben an einer Stelle
   *
   * Was hier mit "= gras.js" markiert ist, MUSS gleich bleiben. Wer es
   * aendert, aendert es dort mit, sonst stehen zwei Grassorten im Bild.
   * ===================================================================== */

  const A = {
    OBEN:   [0.62, 0.94, 0.53],       // = gras.js: dieselbe Spitze
    UNTEN:  [0.30, 0.50, 0.21],       // deutlich dunkler als gras.js
                                      // (0.44/0.72/0.31): ein Horst aus 7 bis
                                      // 13 Halmen verschattet sich innen
                                      // selbst, ein einzelner Teppichhalm
                                      // nicht. Das dunkle Herz ist das, was
                                      // den Horst ueberhaupt erst als KOERPER
                                      // lesbar macht statt als Halmhaufen.
    FUSS_HAERTE: 1.15,                // Exponent des Hoehengangs; gras.js
                                      // nimmt 0.75. Groesser heisst: das
                                      // Dunkel reicht hoeher hinauf.
    SCHATTEN: [0.88, 0.84, 0.79],     // = gras.js: warm, nicht grau
    SAUM_FARBE: [0.620, 0.553, 0.212],// = gras.js: gemessene (158,141,54)/255

    KANTE: 0.55,                      // = gras.js: Lage der Rampenstufe
    FLANKE: 0.05,                     // = gras.js
    SAUM: 0.80,                       // = gras.js
    DURCH: 0.55,                      // = gras.js: Durchleuchtung
    RUNDUNG: 0.45,                    // = gras.js: Woelbung des Halmquerschnitts

    WIND_STAERKE: 0.16,               // = gras.js
    WIND_RICHTUNG: [0.82, 0.57],      // = gras.js, unten normiert

    /* Halmweise Tonabstufung. Vier feste Werte in denselben Multiplikator
     * eingesetzt: 0,80 + 0,40*ton, also 0,83…1,18. Die Spanne ist bewusst
     * weiter als die 0,88 + 0,24*ton des Teppichs — im Teppich liegen die
     * Halme einzeln, im Horst stehen sie ineinander, und ohne den groesseren
     * Tonunterschied wird die Rosette eine einzige gruene Flaeche. Vier
     * feste Stufen statt stufenlos, weil in der Referenz einzelne Halme
     * deutlich dunkler sind als ihre Nachbarn, es aber kein Farbrauschen
     * gibt. */
    TOENE: [0.08, 0.34, 0.66, 0.94],

    /* Mindestbreite eines Halms auf dem Bildschirm. Ohne sie flimmern die
     * Horste des Waldsaums in g-fernsicht: ein 0,04 breiter Halm auf 45 m
     * faellt unter ein halbes Pixel und blitzt dann von Bild zu Bild.
     * Der Deckel darueber ist genauso wichtig: ohne ihn werden dieselben
     * fernen Horste zu fetten Zacken am Horizont — das war beim ersten
     * Versuch der auffaelligste Fehler im Bild. */
    MIND_PIXEL: 0.85,
    MIND_DECKEL: 2.2,               // hoechstens das 2,2-fache der Eigenbreite

    /* Halme je Horst. Deutlich mehr als die 9 eines Teppichbuschels: der
     * Unterschied zwischen Teppich und Horst ist bei uns NICHT die Hoehe —
     * karte.js gibt innerhalb der Arena hoechstens 0,80 gegen 0,30 des
     * Teppichs, das sind kaum drei Viertel mehr —, sondern die MASSE. Ein
     * Horst ist eine dichte Rosette mit eigener Silhouette, und genau so
     * steht er in gras_halme_nahaufnahme_tag_1366 ueber dem Teppich. */
    HALME_MIN: 7,
    HALME_MAX: 13,
  };

  /* =======================================================================
   * 3. Der Halm — Streifen aus 9 Punkten, 7 Dreiecken
   *
   * Gleiche Aufloesung wie gras.js, und aus demselben Grund: bei fovY 50° und
   * H = 900 sind das 965 px je Radiant; ein 0,6er Horst auf 10 m ist 58 px
   * hoch, das siebte Segment eines 7-Segment-Halms traegt davon 8 px Bogen.
   *
   * Das Breitenprofil ist gegenueber gras.js explizit als Tabelle gefuehrt
   * statt als pow(): unten fast parallel, Verjuengung erst im oberen Drittel.
   * Das ist die Lanzenform aus gras_halme_nahaufnahme_tag_1366 — ein linear
   * zulaufendes Dreieck sieht dagegen nach Wimpel aus.
   * ===================================================================== */

  const HALM_ZEILEN = [
    [0.00, 1.00],
    [0.32, 0.78],
    [0.60, 0.50],
    [0.84, 0.22],
  ];
  const HALM_PUNKTE = HALM_ZEILEN.length * 2 + 1;   // 9

  function halmPunkte() {
    const p = [];
    for (const z of HALM_ZEILEN) { p.push(z[0], -1, z[1], z[0], 1, z[1]); }
    p.push(1.0, 0.0, 0.0);                          // Spitze
    return new Float32Array(p);
  }

  /* =======================================================================
   * 4. Shader
   * ===================================================================== */

  const VS = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aHalm;   // t, Seite(-1|0|+1), Breitenprofil
layout(location = 1) in vec4 aOrt;    // x, y(Boden), z, Halmlaenge
layout(location = 2) in vec4 aForm;   // Drehung, Biegung, Halbbreite, Ton

uniform mat4  uViewProj;
uniform vec3  uCam;
uniform float uZeit;
uniform vec2  uWindRichtung;
uniform float uWindStaerke;
uniform float uRundung;
uniform float uPxSkala;               // Bildhoehe/2 * 1/tan(fovY/2)
uniform float uMindPixel;
uniform float uMindDeckel;

out vec3  vPos;
out vec3  vNormal;
out float vT;
out float vTon;

void main() {
  float t     = aHalm.x;
  float seite = aHalm.y;
  float wRel  = aHalm.z;

  float laenge = aOrt.w;
  float yaw    = aForm.x;
  float bieg   = aForm.y;

  /* Mittellinie als quadratische Bezierkurve, P0 im Ursprung.
   * P1 steht SENKRECHT darueber — deshalb waechst jeder Halm am Fuss lotrecht
   * aus dem Boden und knickt nicht ab. P2 traegt die Biegung; seine Hoehe ist
   * exakt 1, damit die Spitze genau auf der zugesagten Halmlaenge sitzt.
   * B.y(t) = 1.24t - 0.24t^2 ist streng steigend: der hoechste Punkt des
   * Halms IST die Spitze. Damit ist die Hoehenzusage dieses Moduls
   * nachrechenbar und nicht bloss behauptet. */
  vec2 P1 = vec2(0.0, 0.62);
  vec2 P2 = vec2(bieg, 1.0);
  vec2 m  = 2.0 * (1.0 - t) * t * P1 + t * t * P2;
  vec2 d  = 2.0 * (1.0 - 2.0 * t) * P1 + 2.0 * t * P2;

  vec3 lehn = vec3(cos(yaw), 0.0, sin(yaw));   // Biegerichtung, waagerecht
  vec3 quer = vec3(-sin(yaw), 0.0, cos(yaw));  // Breitenrichtung, waagerecht

  /* Halbbreite in Weltmass, nach unten begrenzt durch eine Mindestbreite in
   * Bildschirmpixeln. */
  float eigen = aForm.z * laenge;
  float abstand = max(distance(uCam, aOrt.xyz), 0.001);
  float halb = clamp(uMindPixel * abstand / max(uPxSkala, 1.0),
                     eigen, eigen * uMindDeckel);

  vec3 mitte = lehn * (m.x * laenge) + vec3(0.0, m.y * laenge, 0.0);
  vec3 tang  = normalize(lehn * d.x + vec3(0.0, d.y, 0.0));
  vec3 flach = normalize(cross(quer, tang));

  vec3 p = aOrt.xyz + mitte + quer * (seite * wRel * halb);

  /* --- Windwelle: wortgleich mit grafik/gras.js und PHASE-GRAFIK-PLAN G12 --
   *   t*t     die Basis steht still, sonst schwimmt das Gras ueber dem Boden;
   *   Phase aus der WELTPOSITION, sonst schwingt alles im Gleichtakt statt
   *           als Welle;
   *   Boee mit rund 1/50 der Ortsfrequenz, ohne sie wirkt es wie ein
   *           Ventilator.
   * Einziger Zusatz: sqrt(laenge/0.30). Der Teppich ist 0,30 hoch und
   * schwingt mit 0,16; ein 1,1er Horst mit demselben absoluten Ausschlag
   * saehe steif aus. Die Wurzel haelt die Auslenkung IM VERHAELTNIS zur
   * Halmlaenge kleiner, je laenger der Halm — hoher Bewuchs ist steifer. */
  vec2  wp  = aOrt.xz;
  float ph  = dot(wp, vec2(0.12, 0.09)) + uZeit * 1.6;
  float boe = 0.65 + 0.35 * sin(dot(wp, vec2(0.013, 0.011)) - uZeit * 0.35);
  float amp = t * t * uWindStaerke * boe * sqrt(laenge / 0.30);
  p.xz += uWindRichtung * ((sin(ph) * 0.7 + sin(ph * 2.3 + 1.1) * 0.3) * amp);
  p.y  -= amp * amp * 0.4 * laenge;

  /* Querwoelbung wie in gras.js: ohne sie ist der Halm ein Blech und alle
   * Halme derselben Drehung bekommen exakt dieselbe Helligkeit. */
  vPos    = p;
  vNormal = flach + quer * (seite * uRundung);
  vT      = t;
  vTon    = aForm.w;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

  /* Der gemeinsame Baustein wird erst im Aufbau geholt, nicht beim Laden:
   * wirft baustein() hier, faellt die ganze Datei aus und der Typ meldet sich
   * nie an — dann greift die Schutzregel von karte.js gar nicht mehr. Im
   * Aufbau geworfen wird er sauber stillgelegt. Derselbe Kniff wie gras.js. */
  const fsQuelle = () => `#version 300 es
precision highp float;

${GRAFIK.baustein('halblambert')}

in vec3  vPos;
in vec3  vNormal;
in float vT;
in float vTon;

uniform vec3  uCam;
uniform vec3  uLicht;         // Richtung ZUR Sonne
uniform vec3  uSonneFarbe;
uniform vec3  uUnten;
uniform vec3  uOben;
uniform vec3  uSchattenTon;
uniform vec3  uSaumFarbe;
uniform vec3  uDunst;
uniform float uKante;
uniform float uFlanke;
uniform float uSaum;
uniform float uDurch;
uniform float uDunstAn;
uniform float uFussHaerte;
uniform float uBound;

out vec4 outColor;

void main() {
  /* Zweiseitenbeleuchtung: der Halm ist ein flaches Blatt ohne Rueckseite.
   * Die Normale wird immer zur Kamera gedreht; dot(N,L) < 0 heisst damit
   * genau "die Sonne steht hinter dem Blatt" — die Bedingung, unter der ein
   * Grashalm durchleuchtet. */
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLicht);

  /* Aufhellung zur Spitze, pow(t,0.75) wie im Teppich: der Gang sitzt im
   * gras_halme_nahaufnahme_tag; der Exponent ist hier haerter als im Teppich,
   * siehe uFussHaerte oben. */
  vec3 albedo = mix(uUnten, uOben, pow(vT, uFussHaerte));
  albedo *= 0.80 + 0.40 * vTon;

  /* Zwei Tonstufen mit harter Kante — dieselbe Rampe wie im Teppich.
   * Multiplikativ und warm: im Schatten faellt Rot weniger als Blau. */
  float dd = ndl01(N, L);
  float stufe = smoothstep(uKante - uFlanke, uKante + uFlanke, dd);
  vec3 col = albedo * mix(uSchattenTon, vec3(1.0), stufe);

  /* Lichtfarbe nur zur Haelfte eingemischt — Genshins Bewuchs bleibt in jeder
   * Beleuchtung hell und lesbar. */
  col *= mix(vec3(1.0), uSonneFarbe, 0.5);

  /* Durchleuchtung: Sonne hinter dem Blatt, Blick gegen die Sonne. Der
   * einzige Ort, an dem Gras Licht addiert — und der Grund, warum eine Wiese
   * im Gegenlicht leuchtet statt abzusaufen. */
  float rueck = max(-dot(N, L), 0.0);
  float gegen = max(dot(V, -L), 0.0);
  col += uOben * uSonneFarbe * rueck * (0.30 + 0.70 * gegen * gegen) * uDurch;

  /* Gelbe Silhouettenlinie gegen den Himmel, gemessen (158,141,54).
   * Ueber max() eingemischt, damit sie NIE abdunkelt: eine dunkle Linie am
   * Halm ist genau der Fehler, den G12 benennt. */
  float saum = pow(gegen, 2.5) * (1.0 - abs(dot(N, V)));
  col = mix(col, max(col, uSaumFarbe), clamp(saum * uSaum, 0.0, 1.0));

  /* Derselbe Fernduns wie in FS_GROUND und in gras.js, sonst reisst zwischen
   * Boden, Teppich und Horst eine Naht auf.
   *
   * Mit EINEM Unterschied, und der ist bezahlt worden: der Abstand wird bei
   * uBound abgeschnitten. Der Teppich hoert an der Arenagrenze auf, dieser Typ
   * nicht — 240 seiner 749 Horste stehen als Waldsaum bis 33 Einheiten
   * draussen. Ohne das min() bekommen genau die den staerksten Dunst und
   * stehen als bleiche Zacken ueber dem gruenen Boden dahinter; im ersten
   * Aufnahmedurchgang war das der auffaelligste Fehler im ganzen Bild.
   * So bekommen sie denselben Wert wie der aeusserste Halm des Teppichs, die
   * Naht bleibt zu, und die echte Luftperspektive macht ohnehin nebel.js
   * als eigener Durchgang darueber. */
  float dunst = smoothstep(uBound * 0.7, uBound * 1.6, min(length(vPos.xz), uBound));
  col = mix(col, uDunst, dunst * uDunstAn);

  outColor = vec4(col, 1.0);
}`;

  /* =======================================================================
   * 5. Der Instanzpuffer — ein Halm je Instanz
   *
   * Ein Horst ist KEINE Instanz. Waere er eine, haetten alle 749 Horste
   * dieselbe Halmanordnung und man saehe die Wiederholung sofort. Instanziert
   * wird der einzelne Halm; die Faecherung entsteht einmalig beim Fuellen des
   * Puffers und kostet zur Laufzeit nichts.
   *
   * 8 Gleitkommazahlen je Halm = 32 Byte, bei rund 5.000 Halmen 160 KB.
   * Einmal hochgeladen, danach nie wieder angefasst — der Wind sitzt im
   * Vertex-Shader.
   * ===================================================================== */

  function instanzen(stuecke) {
    const feld = [];
    const T = A.TOENE;

    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const hoehe = +s.groesse || 0;
      if (!(hoehe > 0.02)) continue;

      // Schluessel aus der WELTPOSITION, nicht aus dem Listenindex.
      const kx = Math.round(s.x * 64) | 0;
      const kz = Math.round(s.z * 64) | 0;

      /* Halmzahl waechst mit der Horstgroesse: ein 0,35er Bueschel mit neun
       * Halmen waere ein Igel, ein 1,1er mit fuenf ein Besen. */
      const anteil = Math.max(0, Math.min(1, (hoehe - 0.35) / 0.75));
      let n = A.HALME_MIN + Math.round(anteil * (A.HALME_MAX - A.HALME_MIN));
      if (n < A.HALME_MAX && zahl(kx, kz, 9101) > 0.62) n++;

      const grund = +s.drehung || 0;
      const schritt = (Math.PI * 2) / n;

      for (let j = 0; j < n; j++) {
        const u1 = zahl(kx + j, kz, 9110);
        const u2 = zahl(kx, kz + j, 9111);
        const u3 = zahl(kx + j, kz + j, 9112);
        const u4 = zahl(kx - j, kz + j, 9113);

        /* Faecher: gleichmaessig aufgeteilte Richtungen mit einer halben
         * Zelle Streuung. Gleichmaessig, weil ein Horst aus rein zufaelligen
         * Winkeln zur einseitigen Buerste zusammenklumpt — in der Referenz
         * strahlt er nach allen Seiten. */
        const yaw = grund + (j + (u1 - 0.5) * 0.55) * schritt;

        /* Ein Halm traegt die volle Hoehe: er ist der, der die zugesagte
         * Groesse des Horstes ausmacht. Alle anderen bleiben darunter, und
         * die Staffelung ist das, was einen Horst von einem Buendel
         * unterscheidet. */
        const laenge = (j === 0) ? hoehe : hoehe * (0.50 + 0.42 * u2);

        /* Kurze Halme biegen sich staerker nach aussen. Damit wird aus dem
         * Buendel eine Rosette statt eines Besens — die Silhouette in
         * gras_nahaufnahme_nacht_2560 ist genau das. */
        const kurz = 1 - laenge / hoehe;
        const bieg = 0.14 + 0.34 * u3 + 0.22 * kurz;

        /* Breite 12…18 % der Laenge. Die Referenz misst am EINZELNEN Halm
         * 10…13 %; ein Horst steht bei uns aber selten groesser als 60 px im
         * Bild, und bei 10 % waeren seine Halme dort unter einem Pixel.
         * Die zwei Prozentpunkte Zuschlag kaufen die Silhouette, ohne dass
         * der Halm zum Blatt wird. */
        const halb = 0.045 + 0.025 * u4;

        /* Fussversatz nach aussen, hoechstens 9 % der Horsthoehe: die Halme
         * kommen aus einem Bueschel, nicht aus einem mathematischen Punkt —
         * aber sie muessen als EIN Koerper lesbar bleiben. */
        const r = 0.09 * hoehe * u4;

        feld.push(
          s.x + Math.cos(yaw) * r,
          (+s.y || 0) - 0.02,               // minimal eingesenkt, kein Spalt
          s.z + Math.sin(yaw) * r,
          laenge,
          yaw, bieg, halb, T[(j + (s.variante | 0)) & 3],
        );
      }
    }
    return new Float32Array(feld);
  }

  /* =======================================================================
   * 6. Zustand — beide Namen teilen sich Programm und Halmpuffer
   * ===================================================================== */

  const S = { prog: null, halmPuffer: null, netze: new Map() };

  function netzFuer(gl, stuecke) {
    let n = S.netze.get(stuecke);
    if (n) return n;

    const daten = instanzen(stuecke);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, S.halmPuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(0, 0);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    n = { vao, vbo, halme: daten.length / 8 };
    S.netze.set(stuecke, n);
    console.info('KARTE/gras-buschel: ' + stuecke.length + ' Horste, '
      + n.halme + ' Halme, ' + (n.halme * 7) + ' Dreiecke in einem Aufruf.');
    return n;
  }

  /* =======================================================================
   * 7. Anmeldung
   * ===================================================================== */

  const beschreibung = {
    /* Zwischen Geroell (flach, soll vom Gras beruehrt werden) und Buesche.
     * Alles undurchsichtig mit Tiefenschreiben — die Reihenfolge entscheidet
     * hier nichts, die Zahl steht nur der Ordnung halber. */
    schicht: 20,

    aufbau(gl, R) {
      if (S.prog) return;
      S.prog = GRAFIK.programm(gl, VS, fsQuelle(), 'gras-buschel');
      S.halmPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, S.halmPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, halmPunkte(), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },

    zeichnen(gl, R, ctx, stuecke) {
      if (!S.prog || !stuecke.length) return;
      const netz = netzFuer(gl, stuecke);
      if (!netz.halme) return;

      const p = S.prog;
      const li = ctx.licht || {};

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      /* Zweiseitig: ein flaches Blatt hat keine Rueckseite, die man wegwerfen
       * duerfte. Die Normale dreht der Fragment-Shader ueber gl_FrontFacing. */
      gl.disable(gl.CULL_FACE);

      gl.useProgram(p);
      gl.bindVertexArray(netz.vao);

      /* Massstab, mit dem eine Weltbreite zu Pixeln wird: Bildhoehe halbe mal
       * 1/tan(fovY/2) — und das steht als Element 5 in jeder
       * Projektionsmatrix. Aus der Matrix gelesen statt als Konstante
       * abgeschrieben, damit eine spaetere Brennweitenaenderung nichts
       * kaputtmacht. */
      const pxSkala = (ctx.hoehe || 900) * 0.5 * Math.abs(ctx.viewProj[5] || 2.14);
      const wl = Math.hypot(A.WIND_RICHTUNG[0], A.WIND_RICHTUNG[1]) || 1;

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(p.u.uCam, ctx.cam);
      gl.uniform3fv(p.u.uLicht, li.richtung || R.light);
      gl.uniform3fv(p.u.uSonneFarbe, li.farbe || [0.88, 0.85, 0.78]);
      gl.uniform3fv(p.u.uDunst, li.dunst || [0.405, 0.415, 0.425]);
      gl.uniform1f(p.u.uZeit, ctx.time || 0);

      gl.uniform2f(p.u.uWindRichtung, A.WIND_RICHTUNG[0] / wl, A.WIND_RICHTUNG[1] / wl);
      gl.uniform1f(p.u.uWindStaerke, A.WIND_STAERKE);
      gl.uniform1f(p.u.uRundung, A.RUNDUNG);
      gl.uniform1f(p.u.uPxSkala, pxSkala);
      gl.uniform1f(p.u.uMindPixel, A.MIND_PIXEL);
      gl.uniform1f(p.u.uMindDeckel, A.MIND_DECKEL);

      gl.uniform3fv(p.u.uUnten, A.UNTEN);
      gl.uniform3fv(p.u.uOben, A.OBEN);
      gl.uniform3fv(p.u.uSchattenTon, A.SCHATTEN);
      gl.uniform3fv(p.u.uSaumFarbe, A.SAUM_FARBE);
      gl.uniform1f(p.u.uKante, A.KANTE);
      gl.uniform1f(p.u.uFlanke, A.FLANKE);
      gl.uniform1f(p.u.uSaum, A.SAUM);
      gl.uniform1f(p.u.uDurch, A.DURCH);
      gl.uniform1f(p.u.uDunstAn, 1.0);
      gl.uniform1f(p.u.uFussHaerte, A.FUSS_HAERTE);
      gl.uniform1f(p.u.uBound, (ctx.welt && ctx.welt.bounds) || 26);

      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, HALM_PUNKTE, netz.halme);

      gl.bindVertexArray(null);
      gl.enable(gl.CULL_FACE);          // Grundzustand wiederherstellen
    },
  };

  /* karte.js fuehrt die Stuecke unter 'bueschel'. Der Auftragsname
   * 'gras-buschel' ist zusaetzlich angemeldet: er hat heute keine Stuecke und
   * wird deshalb uebersprungen, traegt aber sofort, falls karte.js jemals
   * unter diesem Namen setzt. */
  KARTE.typ('bueschel', beschreibung);
  KARTE.typ('gras-buschel', beschreibung);

})();
