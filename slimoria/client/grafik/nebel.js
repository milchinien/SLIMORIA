'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — G2: Fernnebel und Luftperspektive.
 *
 * Besitzer: Lane GRAFIK. Vertrag: GRAFIK-MODULE.md §3.
 * Modul des ZWEITEN Renderpfads (nur mit ?renderer=2 aktiv).
 *
 * Diese Datei meldet ZWEI Module an und legt EINEN Shader-Baustein hin:
 *
 *   Baustein `fernnebel`   das GLSL, das jedes fremde Programm einbindet
 *   R.nebel.setzen(gl, p)  schreibt die vier Uniforms in ein fremdes Programm
 *   Modul `nebel`      ordnung 70   fuehrt die Zahlen, zeichnet selbst nichts
 *   Modul `nebelboden` ordnung 27   der Nebel auf der Bodenebene
 *
 * ---------------------------------------------------------------------------
 * §0  WARUM DAS DER WICHTIGSTE EINZELNE BAUSTEIN IST
 *
 * Der Boden ist in jedem Bild die groesste Flaeche (PHASE-GRAFIK-PLAN §0), und
 * der Nebel ist das, was mit dem Boden ueber die Entfernung passiert. Zusammen
 * mit der Himmelsrampe entscheidet er die Farbstimmung von rund 95 % der
 * Pixel. Kosten: drei exp() je Fragment, kein Puffer, keine Textur.
 *
 * Anime-Nebel ist NICHT graues Ueberblenden und keine Streuungssimulation. Er
 * ist kanalweise verschieden stark und er entsaettigt: die Ferne zieht auf die
 * Horizontfarbe zu und verliert dabei ihre eigene Buntheit. Genau das erzeugt
 * den Eindruck von LUFT statt von Schleier.
 *
 * ---------------------------------------------------------------------------
 * §1  EIGENE MESSUNG AN ref/genshin/ — nicht uebernommen
 *
 * Alle Zahlen unten sind an `landschaft_mondstadt_mittag_fernnebel_4k.png`
 * (3840x2160) selbst nachgemessen; Gegenprobe an
 * `landschaft_liyue_luftperspektive_4k.png` und
 * `landschaft_sumeru_wiese_see_tag_2560.png`.
 *
 * (a) DIE NEBELFARBE ist die Dunstfarbe des Himmels, nicht eine zweite.
 *     Spaltenprobe x = 200…400 knapp ueber der Horizontlinie (y = 850…875):
 *     rgb(172,218,252), Saettigung (HSV) 31,6 %. Zweite Probe x = 1800…2000,
 *     y = 890…910: rgb(154,213,253). himmel.js fuehrt (183,217,249).
 *     Die drei Messungen decken sich auf 11 Stufen im Rot und auf 3 im Blau —
 *     dieselbe Farbe. Deshalb wird sie hier NICHT noch einmal gemessen,
 *     sondern von himmel.js UEBERNOMMEN (§3).
 *
 * (b) DAS KANALVERHAELTNIS, an einer Nadelbaumreihe derselben Art in vier
 *     Tiefenlagen. Kronenproben 6x6 bis 10x10 px, Dunst D = (172,218,252):
 *
 *       Lage       rgb            f_R    f_G    f_B     beta R : G : B
 *       nah      ( 43, 100,112)   —      —      —       (Bezug C0)
 *       mitte    ( 72, 142,188)   0,224  0,359  0,540   0,571 : 1 : 1,746
 *       fern     ( 79, 150,191)   0,275  0,430  0,568   0,573 : 1 : 1,493
 *       ferner   ( 77, 147,197)   0,260  0,401  0,610   0,587 : 1 : 1,834
 *       fernst   ( 90, 166,209)   0,363  0,561  0,697   0,548 : 1 : 1,451
 *
 *     f = (C - C0)/(D - C0), beta-Verhaeltnis = ln(1-f) je Kanal, auf Gruen
 *     normiert. Mittel ueber die vier Lagen: 0,57 : 1 : 1,63 — auf Rot
 *     normiert also 1 : 1,75 : 2,86.
 *     Das Dossier (PHASE-GRAFIK-PLAN §1.1) hat 1 : 1,99 : 2,78. Meine Messung
 *     liegt im Rot und im Blau darauf, im Gruen 12 % darunter; die Abweichung
 *     erklaert sich vollstaendig daraus, dass mein C0 selbst schon leicht
 *     benebelt ist (es gibt in diesem Bild keinen unbenebelten Nadelbaum
 *     derselben Art). Der belegte Wert bleibt also stehen, und er steht
 *     ohnehin schon als `NEBEL_VERHAELTNIS` in glsl.js — wo er hingehoert,
 *     damit niemand ihn abschreibt und dabei verrutscht.
 *
 * (c) WIE STARK AM HORIZONT. Streifenscan (p95 - p05 je Kanal ueber
 *     x = 100…900, Streifenhoehe 10 px) von der Bildunterkante bis zur
 *     Horizontlinie, Restkontrast bezogen auf den vordersten Streifen:
 *
 *       Bildzeile   Restkontrast R / G / B
 *        1390 (vorn)   1,00 / 1,00 / 1,00
 *        1260          0,99 / 0,99 / 0,99
 *        1200          0,79 / 0,72 / 0,85
 *        1150          0,52 / 0,54 / 0,33
 *        1000          0,53 / 0,38 / 0,23
 *         950          0,33 / 0,29 / 0,21
 *         920 (fern)   0,33 / 0,30 / 0,25
 *
 *     Zwei Befunde daraus, und beide bestimmen den Bau:
 *     1. Das vorderste Drittel der Bildtiefe ist NICHT benebelt (1,00 → 0,99).
 *        Der Nebel braucht einen STARTABSTAND, sonst frisst er den Nahbereich.
 *     2. Blau faellt zuerst und am weitesten (0,21 gegen 0,33 im Rot). Genau
 *        das ist das kanalweise Verhalten aus (b), nur an einem zweiten,
 *        unabhaengigen Mass gesehen.
 *
 * (d) GEGENPROBE AUF AUGENHOEHE. `landschaft_sumeru_wiese_see_tag_2560.png`
 *     ist eine BODENNAHE Ansicht wie unsere. Dort ist der Nebel im ganzen
 *     Mittelgrund kaum zu sehen; erst das Felsmassiv im Hintergrund liegt
 *     sichtbar im Dunst. Wer Genshins Dichte je Meter uebernimmt, faerbt in
 *     einer 78-Einheiten-Welt NICHTS. Die Dichte unten ist deshalb auf UNSERE
 *     Welt gerechnet, nicht abgeschrieben — siehe §2. Das Verhaeltnis der
 *     Kanaele, die Farbe und die Form der Kurve sind gemessen, die Dichte ist
 *     gerechnet.
 *
 * ---------------------------------------------------------------------------
 * §2  DIE ZWEI GERECHNETEN ZAHLEN: STARTABSTAND = bounds, DICHTE 0,055
 *
 * Genshins Saettigungsdistanz liegt bei 400–800 m; unsere Welt hat
 * `bounds = 26`, die Bodenebene reicht bis 78, ihre Ecken bis 110. Uebertragen
 * wird deshalb die FORM, nicht die Dichte je Meter.
 *
 * (i) DER STARTABSTAND IST DIE ARENA. Befund §1(c1) sagt, dass das vorderste
 *     Drittel der Bildtiefe unbenebelt bleibt, und §1(d) zeigt dasselbe an
 *     einer Kamera auf Augenhoehe. Bei fovY 50 Grad und einer Kamera 24
 *     Einheiten hinter dem Schleim fuellt unsere Arena denselben Anteil des
 *     Bildes wie Genshins Vordergrund. Also ist die ARENA unser Vordergrund,
 *     und der Nebel beginnt an ihrem Rand: `start = welt.bounds` = 26.
 *
 *     Das ist keine Kosmetik, sondern eine Bedingung aus dem GDD: in der
 *     Spielkamera steht der Schleim 6,5 bis 10 Einheiten vor dem Auge, das
 *     ganze Spielfeld liegt damit innerhalb des Startabstands, und der Nebel
 *     fasst weder die Figur noch das Ziel an (GDD 01 §63, GDD 10 §98).
 *     Der erste Bau dieses Moduls hatte `start = 9`, und genau daran ist er
 *     gescheitert: der Arenaboden lag bei 15 bis 25 Einheiten schon bei
 *     f_G = 0,2…0,48 und wurde weiss, waehrend Grashalme, Wege und Steine
 *     darauf ungenebelt gruen blieben (die tragen den Baustein nicht, §4).
 *     Aufgenommen, angesehen, verworfen.
 *
 * (ii) DIE DICHTE HAENGT AM GEMESSENEN TRIPEL. Mit start = 26 wird beta so
 *     gewaehlt, dass Genshins gemessener Nebelanteil an der fernen Baumreihe
 *     — 0,41 / 0,65 / 0,77 (Dossier; eigene Nachmessung §1(b): 0,36/0,56/0,70)
 *     — genau dort erreicht wird, wo in `g-fernsicht` die Baumreihe steht,
 *     rund 45 Einheiten vor der Kamera. Das ergibt beta_G = 0,055:
 *
 *       gemessen (Genshin)   0,41  / 0,65  / 0,77
 *       erreicht bei d = 45  0,409 / 0,648 / 0,768     Abweichung <= 0,002
 *
 *     Der Startabstand ist dabei eine Stilisierung, keine Physik, und er ist
 *     unsichtbar: 1 - exp(-beta*d) beginnt bei d = 0 mit der Steigung beta,
 *     nicht mit einem Sprung.
 *
 * Die Kurve in Zahlen (f je Kanal, Abstand zur KAMERA in Welteinheiten;
 * beta = 0,055 * (0,503 / 1 / 1,397) = 0,0277 / 0,0550 / 0,0768):
 *
 *   Abstand   <=26    30     35     45     60     78    110
 *   f_R       0,00  0,106  0,220  0,409  0,610  0,763  0,902
 *   f_G       0,00  0,198  0,390  0,648  0,846  0,943  0,990
 *   f_B       0,00  0,264  0,499  0,768  0,927  0,982  0,999
 *
 *   26   Arena: nichts. Schleim, Gegner, Spielfeld unberuehrt.
 *   35   erster Ring dahinter: Restkontrast 0,78 / 0,61 / 0,50 — die
 *        Ausstattung tritt zurueck und bleibt lesbar. Die Referenz liefert an
 *        der entsprechenden Tiefenlage 0,52…0,79 / 0,54…0,72 / 0,33…0,85.
 *   45   die Baumreihe: der gemessene Genshin-Anteil, siehe (ii).
 *   78   Rand der Bodenebene: Restkontrast 0,24 / 0,06 / 0,02. Die Kante der
 *        Ebene loest sich auf, statt als Linie im Bild zu stehen. Das ist der
 *        eine Punkt, an dem wir ABSICHTLICH weiter gehen als die Referenz
 *        (dort bleiben am fernsten Grat noch 0,33 / 0,30 / 0,25 stehen):
 *        Genshins Welt hat dort keinen Rand, unsere hat einen.
 *
 * ---------------------------------------------------------------------------
 * §3  DIESELBE FARBE WIE DER HIMMEL — nicht dieselbe Uniform
 *
 * PHASE-GRAFIK-PLAN §1.1: „`uNebel` im Objekt-Shader und `uDunst` im
 * Himmels-Shader MUESSEN dieselbe Uniform sein." Woertlich geht das in WebGL2
 * nicht: eine Uniform gehoert einem Programm, geteilt wuerde sie nur ueber
 * einen Uniformblock, den dann alle zwanzig Module gemeinsam vereinbaren
 * muessten. himmel.js hat den Ausweg schon gebaut und in seinem §5
 * beschrieben: es gibt den WERT heraus, und zwar als dieselbe
 * Float32Array-Instanz, die es selbst hochlaedt — `R.himmelFarben.dunst`.
 *
 * Genau daraus liest dieses Modul. Faellt himmel.js aus, wird
 * `ctx.licht.dunst` genommen (dieselbe Zahl, von licht.js gefuehrt), und wenn
 * auch das fehlt, die Mittagsmessung. Auseinanderlaufen kann am Horizont damit
 * nichts.
 *
 * ---------------------------------------------------------------------------
 * §4  WER DEN NEBEL BEKOMMT — und wie
 *
 * Ein Modul kann keine fremde Shaderquelle aendern. Der Nebel wird deshalb
 * ANGEBOTEN, nicht aufgezwungen. Zwei Teile:
 *
 *   1. GRAFIK.baustein('fernnebel') — der GLSL-Text. Fremde Programme binden
 *      ihn mit `GRAFIK.baustein('srgb', 'nebel', 'fernnebel')` ein (der
 *      Baustein braucht `saettigen` aus `srgb` und `nebelAnteil` aus `nebel`)
 *      und rufen dann `col = fernnebel(col, length(vPos - uCam));`.
 *   2. R.nebel.setzen(gl, programm) — schreibt uNebelDunst, uNebelBeta,
 *      uNebelStart und uNebelEntsaett hinein. Muss im ZEICHNEN des fremden
 *      Moduls stehen, nicht im vorbereiten(): dieses Modul hat ordnung 70,
 *      sein vorbereiten() laeuft nach dem der frueheren Module.
 *
 * Diese Module binden GRAFIK.baustein('fernnebel') selbst ein: boden.js
 * (Fels und Mauer), wasser.js, props/baumstumpf.js, props/fern.js.
 *
 * Zwei Stellen bekommen ihn NICHT, und das ist hier ausdruecklich vermerkt,
 * damit es niemand fuer ein Versehen haelt (Meldung unten als
 * BRAUCHT_FREMDAENDERUNG):
 *
 *   - `R.solid`. rampe.js beansprucht dieses Programm (G4) und sein Shader
 *     kennt `fernnebel` nicht. Kreaturen und die eingebauten Hindernisse
 *     laufen darueber. Dieses Modul haengt sich zwar an `R.drawProp` und
 *     schiebt die Uniforms nach — sobald rampe.js den Baustein einbindet,
 *     wirkt das ohne eine weitere Zeile hier. Vorher wirkt es nicht.
 *   - props/weg.js schaltet seinen eigenen Ferndunst ab, sobald ein Modul
 *     namens `nebel` laeuft, bindet den Baustein aber nicht ein. Die Wege
 *     verlieren dadurch ihren Dunst. Innerhalb der Arena faellt das nicht auf
 *     (dort nebelt auch dieses Modul nicht); von einer weit aussen stehenden
 *     Kamera aus schon — der Wegstreifen am fernen Arenarand steht dann
 *     ungenebelt vor benebeltem Boden.
 *   - Gras, Baeume, Buesche, Steine, Pilze und Blumen fuehren ihren eigenen
 *     schlichten Ferndunst (smoothstep auf den Abstand vom WELTURSPRUNG) oder
 *     gar keinen. Sie sind hier nicht angefasst. Wo sie in der Ferne sichtbar
 *     von diesem Modul abweichen, ist das der Grund.
 *
 * ---------------------------------------------------------------------------
 * §5  WARUM DAS KEIN BILDSCHIRMDURCHGANG IST
 *
 * Der naheliegende Bau waere ein Vollbilddurchgang ueber die fertige Szene:
 * Tiefe lesen, Abstand zurueckrechnen, einmal fuer ALLES nebeln. Er ist hier
 * nicht baubar, und zwar aus einem einzigen, harten Grund:
 *
 *   Das Renderziel ist der STANDARDPUFFER (`R.bildschirm`, renderer2.js
 *   Zeile 1510). Dessen Tiefenpuffer laesst sich in WebGL2 nicht als Textur
 *   binden. `copyTexImage2D` kopiert keine Tiefe; `blitFramebuffer` koennte
 *   sie umkopieren, aber nur bei uebereinstimmenden Formaten und ohne MSAA —
 *   und der Kontext laeuft mit `{antialias:true}`, also mit MSAA. Schaltet
 *   post.js (ordnung 95) sein HDR-Ziel dazwischen, haengt dort eine
 *   Tiefen-RENDERBUFFER, auch keine Textur.
 *
 * Ein eigenes Tiefenziel anzulegen hiesse, die ganze Szene ein zweites Mal zu
 * zeichnen — das kann ein Modul von aussen nicht, und es waere der teuerste
 * Posten der ganzen Liste fuer den geringsten Zugewinn (PHASE-GRAFIK-PLAN §4
 * argumentiert beim Randlicht genauso).
 *
 * Also: der Nebel sitzt IN den Objektshadern. Die einzige Ausnahme ist die
 * Bodenebene, und die hat einen eigenen Grund — §6.
 *
 * ---------------------------------------------------------------------------
 * §6  DIE BODENEBENE: EIN EIGENER DURCHGANG, ZWEI MISCHSCHRITTE
 *
 * boden.js traegt den Nebel ABSICHTLICH nicht selbst (sein §1 sagt das
 * ausdruecklich und schaltet seinen Ersatzdunst ab, sobald dieses Modul
 * laeuft). Der Nebel der Ebene liegt deshalb hier, als Modul `nebelboden`,
 * ordnung 27 — nach Boden (20), Wasser (22), Gras (25) und Bodenschatten (26),
 * vor allem Aufrechten (30 aufwaerts).
 *
 * Gezeichnet wird DASSELBE Quad mit DEMSELBEN `uSize = bounds*3` und demselben
 * Vertexshader-Ausdruck wie in boden.js. Damit sind die Tiefenwerte Bit fuer
 * Bit dieselben, `depthFunc(LEQUAL)` besteht auf der Ebene und faellt ueberall
 * durch, wo etwas davorsteht: Grashalme, Wasserflaeche, Felsfuesse. Nichts
 * wird doppelt benebelt.
 *
 * DIE MISCHUNG. Gesucht ist `dst*(1-f) + dunst*f` mit f als VEKTOR. Alphablenden
 * kann das nicht: `alpha` ist ein Skalar, und `CONSTANT_COLOR` ist je
 * Zeichenaufruf konstant, unser f aber je Fragment verschieden. Den
 * Hintergrund erst in eine Textur zu kopieren waere die andere Loesung — sie
 * scheitert daran, dass das Ziel je nach post.js RGBA8 ODER RGBA16F ist und
 * `copyTexSubImage2D` zwischen den beiden nicht kopiert.
 *
 * Zwei Zeichenaufruf loesen es exakt und ohne jeden Puffer:
 *   Durchgang 1  Quelle f          , blendFunc(ZERO, ONE_MINUS_SRC_COLOR)
 *                -> dst = dst * (1 - f)
 *   Durchgang 2  Quelle dunst * f  , blendFunc(ONE, ONE)
 *                -> dst = dst + dunst * f
 * Summe: dst*(1-f) + dunst*f. Kanalweise, exakt, formatunabhaengig.
 *
 * WAS DABEI WEGFAELLT, ehrlich benannt: die Entsaettigung (`uNebelEntsaett`)
 * braucht die Leuchtdichte des Untergrunds, und die kann kein Mischwerk
 * ausrechnen. Der Boden bekommt sie also nicht. Der Fehler an der Naht
 * Boden/Fels ist gerechnet klein: unser Bodenton liegt bei rund 19 %
 * Saettigung, der Fels bei rund 5 %. Bei f_G = 0,5 verschiebt der fehlende
 * Term den Boden um 0,5 * 0,5 * 0,19 * (1-0,5) ~ 2,4 % seiner Buntheit, also
 * unter 3 Stufen von 255 — und der Fels, an dem die Naht liegt, hat den Term
 * seinerseits fast nicht. Zwei Nebelmodelle uebereinander waeren ein Fehler
 * von 80 Stufen (die Naht, die G2 Falle 4 beschreibt); dieser hier ist einer
 * von 2 bis 3. Der Tausch lohnt.
 *
 * ---------------------------------------------------------------------------
 * §7  DETERMINISMUS (GRAFIK-MODULE.md §4)
 *
 * Kein Math.random, kein Date, kein performance.now. Dieses Modul benutzt
 * ueberhaupt keine Zeit — der Nebel steht still und haengt nur an der
 * Kameraposition. Zwei Laeufe desselben Szenarios ergeben Bit fuer Bit
 * dasselbe Bild.
 * ------------------------------------------------------------------------- */

(function () {

  /* glsl.js legt GRAFIK an und wird laut grafik/laden.js vor uns geladen.
   * Fehlt es, halten wir still: ein Wurf im Dateirumpf zaehlt als Seitenfehler
   * und faellt dann nicht dem zur Last, der ihn verursacht hat. */
  if (!window.GRAFIK || !window.GRAFIK.modul || !window.GRAFIK.bausteinSetzen) {
    console.error('grafik/nebel.js: GRAFIK fehlt — laedt glsl.js davor?');
    return;
  }
  const GRAFIK = window.GRAFIK;

  /* ==========================================================================
   * 1. Zahlen  (Begruendung in §1 und §2 oben)
   * ======================================================================== */

  const DICHTE       = 0.055;   // beta im Gruenkanal, je Welteinheit
  const START_BOUNDS = 1.00;    // Startabstand als Vielfaches von welt.bounds
  const BOUNDS_ERSATZ = 26;     // falls ctx.welt fehlt: die heutige Arena
  const START        = START_BOUNDS * BOUNDS_ERSATZ;   // = 26 Einheiten
  const ENTSAETTIGEN = 0.50;    // wieviel Buntheit die volle Ferne verliert

  /* Auf Gruen normiertes Kanalverhaeltnis. Kommt aus glsl.js — dort steht es
   * auch fuer den Shader als `NEBEL_VERHAELTNIS`, und zwei Kopien derselben
   * Zahl in zwei Dateien laufen frueher oder spaeter auseinander. */
  const VERHAELTNIS = [0.503, 1.0, 1.397];

  /* Rueckfall, falls weder himmel.js noch licht.js eine Dunstfarbe liefern.
   * Mittag, in sRGB — dieselbe Messung, die himmel.js fuehrt. */
  const DUNST_MITTAG = [183 / 255, 217 / 255, 249 / 255];

  /* Die Vorgabe, die renderer2.js vor jedem vorbereiten() in ctx.licht
   * zurueckschreibt. Steht dort noch genau das, hat weder licht.js noch
   * himmel.js etwas gesetzt und wir nehmen unsere Messung. */
  const RENDERER_VORGABE_DUNST = [0.405, 0.415, 0.425];

  const gleich = (a, b) =>
    !!a && a.length === 3
        && Math.abs(a[0] - b[0]) < 1e-4
        && Math.abs(a[1] - b[1]) < 1e-4
        && Math.abs(a[2] - b[2]) < 1e-4;

  /* ==========================================================================
   * 2. Der Baustein — das GLSL, das alle anderen einbinden
   *
   * Wird SOFORT beim Laden hinterlegt, nicht erst im aufbau(). Grund: boden.js,
   * wasser.js, props/fern.js und props/baumstumpf.js fragen mit
   * `GRAFIK.bausteine().indexOf('fernnebel')` beim EINLESEN ihrer Datei, ob es
   * ihn gibt, und bauen ihre Shaderquelle danach. tools/grafikmanifest.mjs
   * laedt nebel.js deshalb vor boden.js.
   *
   * Zwei Schritte, in dieser Reihenfolge:
   *   1. Chroma verlieren  (saettigen, gefuehrt vom Gruenkanal des Anteils)
   *   2. kanalweise auf die Horizontfarbe zu
   * Andersherum gerechnet entsaettigt man am Ende die Nebelfarbe selbst und
   * bekommt am Horizont ein Grau statt des gemessenen (183,217,249).
   * ======================================================================== */

  GRAFIK.bausteinSetzen('fernnebel', `
#ifndef GRAFIK_FERNNEBEL
#define GRAFIK_FERNNEBEL

/* Von R.nebel.setzen(gl, programm) beschrieben. Wer den Baustein einbindet,
 * ohne setzen() zu rufen, bekommt Nullen — also gar keinen Nebel, nicht etwa
 * einen falschen. */
uniform vec3  uNebelDunst;     // Horizontfarbe, dieselbe wie im Himmel
uniform vec3  uNebelBeta;      // Extinktion je Kanal und Welteinheit
uniform float uNebelStart;     // Einheiten ohne Wirkung
uniform float uNebelEntsaett;  // 0 = nur mischen, 1 = die Ferne wird unbunt

/* Nebelanteil je Kanal, 0 bis 1. Braucht nebelAnteil() aus dem Baustein
 * mit dem Namen nebel. */
vec3 fernnebelAnteil(float abstand) {
  return clamp(nebelAnteil(abstand, uNebelBeta, uNebelStart), 0.0, 1.0);
}

/* Die Luftperspektive. Braucht zusaetzlich saettigen() aus dem Baustein srgb. */
vec3 fernnebel(vec3 col, float abstand) {
  vec3 f = fernnebelAnteil(abstand);
  col = saettigen(col, 1.0 - uNebelEntsaett * f.g);
  return mix(col, uNebelDunst, f);
}

/* Bequemere Fassung fuer Programme, die Weltpunkt und Auge zur Hand haben. */
vec3 fernnebel(vec3 col, vec3 pos, vec3 auge) {
  return fernnebel(col, length(pos - auge));
}
#endif
`);

  /* ==========================================================================
   * 3. Der geteilte Zustand
   *
   * Eine Instanz, von beiden Modulen benutzt. `dunst` und `beta` sind
   * Float32Array, damit sie ohne Umkopieren an gl.uniform3fv gehen.
   * ======================================================================== */

  const S = {
    dunst: new Float32Array(DUNST_MITTAG),
    beta:  new Float32Array([DICHTE * VERHAELTNIS[0],
                             DICHTE * VERHAELTNIS[1],
                             DICHTE * VERHAELTNIS[2]]),
    start: START,
    entsaettigen: ENTSAETTIGEN,
    bodenProg: null,
    geklagt: false,
  };

  /* Schreibt die vier Uniforms in ein fremdes Programm. Bindet das Programm
   * selbst — der Aufrufer muss danach sein eigenes wieder setzen, was jedes
   * Modul ohnehin tut (jeder Durchgang setzt seinen Zustand selbst).
   *
   * Der Ort wird geprueft, bevor gesetzt wird: ein Programm, das den Baustein
   * gar nicht eingebunden hat (boden.js ruft setzen() auch fuer FS_BODEN),
   * soll hier still bleiben und keine WebGL-Warnung erzeugen. */
  function setzen(gl, p) {
    if (!gl || !p || !p.u) return;
    const u = p.u;
    if (!u.uNebelDunst && !u.uNebelBeta) return;
    gl.useProgram(p.p || p);
    if (u.uNebelDunst)    gl.uniform3fv(u.uNebelDunst, S.dunst);
    if (u.uNebelBeta)     gl.uniform3fv(u.uNebelBeta, S.beta);
    if (u.uNebelStart)    gl.uniform1f(u.uNebelStart, S.start);
    if (u.uNebelEntsaett) gl.uniform1f(u.uNebelEntsaett, S.entsaettigen);
  }

  /* ==========================================================================
   * 4. Modul `nebel` — fuehrt die Zahlen, zeichnet nichts
   * ======================================================================== */

  GRAFIK.modul({
    name: 'nebel',
    ordnung: 70,
    ersetzt: false,          // verdraengt keinen Grundzug, zeichnet gar nicht

    regler: [
      /* beta im Gruenkanal je Welteinheit. 0,055 ist am gemessenen
       * Genshin-Tripel angepasst (§2 ii). */
      { key: 'dichte',       min: 0.000, max: 0.150, step: 0.001, wert: DICHTE },
      /* Startabstand als Vielfaches von welt.bounds. 1,0 heisst: die Arena
       * ist der Vordergrund und bleibt unberuehrt (§2 i). Wer ihn unter rund
       * 0,4 dreht, faerbt den Schleim mit — das ist die harte Grenze. */
      { key: 'startBounds',  min: 0.0,   max: 3.0,   step: 0.05,  wert: START_BOUNDS },
      /* Wieviel Buntheit die vollstaendig benebelte Ferne verliert. */
      { key: 'entsaettigen', min: 0.0,   max: 1.0,   step: 0.01,  wert: ENTSAETTIGEN },
      /* Gesamtstaerke, wirkt auf beta. 0 schaltet den Nebel ab — dafuer da,
       * um Vorher/Nachher aus EINEM Lauf aufzunehmen. */
      { key: 'staerke',      min: 0.0,   max: 3.0,   step: 0.05,  wert: 1.0 },
    ],

    aufbau(gl, R) {
      /* Nach aussen geben. Beide Namen, weil props/fern.js
       * `(ctx && ctx.nebel) || (R && R.nebel)` fragt. */
      R.nebel = {
        setzen,
        dunst: S.dunst,
        beta: S.beta,
        get start() { return S.start; },
        get entsaettigen() { return S.entsaettigen; },
        /* Nebelanteil im Gruenkanal, fuer Module, die auf der JS-Seite
         * rechnen wollen (Ausduennung ferner Ausstattung zum Beispiel). */
        anteil(abstand) {
          return 1 - Math.exp(-S.beta[1] * Math.max(abstand - S.start, 0));
        },
      };

      /* An R.drawProp mithoeren. Die eingebauten Grundzuege rufen ihre
       * dateiinterne drawProp() und sind von aussen nicht erreichbar (kontur.js
       * §; dasselbe Problem, dieselbe Grenze) — aber alles, was von aussen
       * ueber R.drawProp zeichnet, bekommt die Uniforms hiermit gesetzt,
       * sobald `R.solid` den Baustein eingebunden hat. Kostet vorher nichts:
       * setzen() steigt bei fehlendem Uniformort sofort wieder aus. */
      const drawPropAlt = R.drawProp;
      if (typeof drawPropAlt === 'function') {
        R.drawProp = function (mesh, model, nmat, color, gloss, emissive, cam, vp) {
          setzen(gl, R.solid);
          return drawPropAlt(mesh, model, nmat, color, gloss, emissive, cam, vp);
        };
      }

      console.info('GRAFIK nebel.js: Fernnebel aktiv — beta_G ' + DICHTE
        + ' je Einheit, Start ' + START_BOUNDS + ' x bounds, '
        + 'Entsaettigung ' + ENTSAETTIGEN
        + '. Diese Module binden GRAFIK.baustein(\'fernnebel\') selbst ein: '
        + 'boden.js, wasser.js, props/baumstumpf.js, props/fern.js. '
        + 'Fremde Programme rufen zusaetzlich R.nebel.setzen(gl, programm) '
        + 'in ihrem zeichnen().');
    },

    vorbereiten(gl, R, ctx) {
      const w = this.wert;
      const li = ctx.licht;

      /* --- Farbe: himmel.js hat Vorrang ---------------------------------
       * R.himmelFarben.dunst IST die Float32Array, die himmel.js selbst
       * hochlaedt (dessen §5). Naeher kann man an „dieselbe Uniform" in
       * WebGL2 nicht herankommen. */
      const hf = R.himmelFarben;
      let quelle = (hf && hf.dunst && hf.dunst.length === 3) ? hf.dunst : null;
      if (!quelle && li && li.dunst && !gleich(li.dunst, RENDERER_VORGABE_DUNST)) {
        quelle = li.dunst;
      }
      for (let i = 0; i < 3; i++) {
        S.dunst[i] = quelle ? quelle[i] : DUNST_MITTAG[i];
      }

      /* Zurueckschreiben, damit ein Modul, das nur ctx.licht.dunst kennt
       * (props/fern.js toent seine Berge relativ dazu), dieselbe Farbe sieht.
       * Steht dort schon derselbe Wert, ist das schadlos. */
      if (li && li.dunst && li.dunst.length === 3) {
        li.dunst[0] = S.dunst[0]; li.dunst[1] = S.dunst[1]; li.dunst[2] = S.dunst[2];
      }

      /* --- Dichte, Startabstand, Entsaettigung --------------------------- */
      const beta0 = Math.max(0, w.dichte) * Math.max(0, w.staerke);
      S.beta[0] = beta0 * VERHAELTNIS[0];
      S.beta[1] = beta0 * VERHAELTNIS[1];
      S.beta[2] = beta0 * VERHAELTNIS[2];
      /* Der Startabstand haengt an der Arena, nicht an einer festen Zahl:
       * waechst `bounds`, waechst der unberuehrte Vordergrund mit (§2 i). */
      const bounds = (ctx.welt && ctx.welt.bounds) || BOUNDS_ERSATZ;
      S.start = Math.max(0, bounds * w.startBounds);
      S.entsaettigen = Math.min(1, Math.max(0, w.entsaettigen));

      ctx.nebel = R.nebel;
    },

    /* Kein zeichnen(). Dieses Modul traegt nur Zahlen. Der einzige Nebel, der
     * einen eigenen Zeichenaufruf braucht, ist der der Bodenebene — und der
     * gehoert nach ordnung 27, nicht nach 70. */
  });

  /* ==========================================================================
   * 5. Modul `nebelboden` — die Bodenebene, zwei Mischschritte  (§6)
   * ======================================================================== */

  /* Wortgleich mit VS_BODEN aus boden.js und VS_GROUND aus renderer2.js.
   * Nicht „aehnlich": nur bei identischer Rechnung sind die Tiefenwerte
   * identisch, und nur dann besteht LEQUAL ueberall auf der Ebene. */
  const VS_NEBELBODEN = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform float uSize;
out vec3 vWorld;
void main() {
  vWorld = vec3(aPos.x * uSize, 0.0, aPos.z * uSize);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

  const FS_NEBELBODEN = `#version 300 es
precision highp float;
${GRAFIK.baustein('srgb', 'nebel', 'fernnebel')}

in vec3 vWorld;
uniform vec3  uCam;
uniform float uSchritt;   // 0 = Abzug, 1 = Zuschlag

out vec4 outColor;

void main() {
  /* Abstand zur KAMERA, nicht zum Weltursprung. Sonst waere der Boden direkt
   * unter einer weit aussen stehenden Kamera zugenebelt und der Boden am
   * anderen Ende der Arena klar — genau verkehrt herum. */
  vec3 f = fernnebelAnteil(length(vWorld - uCam));

  /* Schritt 0:  Quelle f          , blendFunc(ZERO, ONE_MINUS_SRC_COLOR)
   *             -> Ziel = Ziel * (1 - f)
   * Schritt 1:  Quelle dunst * f  , blendFunc(ONE, ONE)
   *             -> Ziel = Ziel + dunst * f
   * Zusammen die kanalweise Mischung mix(Ziel, dunst, f). Das Alpha bleibt in
   * beiden Schritten unberuehrt (blendFuncSeparate, siehe zeichnen()). */
  outColor = vec4(uSchritt < 0.5 ? f : uNebelDunst * f, 0.0);
}`;

  GRAFIK.modul({
    name: 'nebelboden',
    ordnung: 27,             // nach Boden 20, Wasser 22, Gras 25, Schatten 26
    ersetzt: false,

    aufbau(gl, R) {
      S.bodenProg = GRAFIK.programm(gl, VS_NEBELBODEN, FS_NEBELBODEN, 'nebel.js/boden');
    },

    zeichnen(gl, R, ctx) {
      const p = S.bodenProg;
      if (!p || !R.quadMesh) return;

      /* Ist der Nebel abgedreht, gar nicht erst zeichnen — zwei
       * Vollbildmischungen fuer f = 0 waeren reine Kosten. */
      if (S.beta[1] <= 0) return;

      const bounds = (ctx.welt && ctx.welt.bounds) || 26;

      /* Zustand vollstaendig selbst setzen: zwischen zwei Durchgaengen kann
       * ein fremdes Modul stehen (GRAFIK-MODULE.md §3). */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);   // dieselbe Ebene, dieselben Tiefenwerte
      gl.depthMask(false);       // die Ebene steht schon im Tiefenpuffer
      gl.disable(gl.CULL_FACE);  // das Bodenquad liegt je nach Blick falschherum
      gl.enable(gl.BLEND);

      gl.useProgram(p);
      gl.bindVertexArray(R.quadMesh.vao);
      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform1f(p.u.uSize, bounds * 3);
      gl.uniform3fv(p.u.uCam, ctx.cam);
      setzen(gl, p);
      gl.useProgram(p);          // setzen() bindet selbst; hier wieder unseres

      /* --- Schritt 1: Ziel = Ziel * (1 - f) ------------------------------- */
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
      gl.uniform1f(p.u.uSchritt, 0);
      gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);

      /* --- Schritt 2: Ziel = Ziel + dunst * f ----------------------------- */
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      gl.uniform1f(p.u.uSchritt, 1);
      gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);

      /* Aufgeraeumt zuruecklassen: der naechste Durchgang zeichnet
       * undurchsichtige Geometrie und verlaesst sich auf LESS. */
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
    },
  });

})();
