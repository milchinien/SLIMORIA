'use strict';
/* ===========================================================================
 * grafik/schleim/farbe.js — die Farbfuehrung des Gels.  Lane SCHLEIM.
 *
 * Nur im zweiten Renderpfad (?renderer=2).  `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche.
 *
 * Die Fraktionsfarbe steht fest (GDD 01 §8: Eldoran blau, Ravok rot).  Offen
 * war, WIE diese Farbe ueber den Koerper laeuft.  Genau das entscheidet diese
 * Datei, und zwar in zwei Schritten:
 *
 *   Ordnung 57  `farbe`        — die FARBTAFEL.  Sie legt die drei Stufen je
 *                                Fraktion fest (klar / kern / tief) und den
 *                                Absorptionsvektor.  Zeichnet nichts.
 *   Ordnung 62  `farbe-zonen`  — die ZONENKANTE.  Sie legt die Leiter auf den
 *                                Koerper: aus dem stufenlosen Verlauf, den
 *                                gel.js rechnet, werden drei klar getrennte
 *                                Baender mit harter Kante dazwischen.
 *
 * ===========================================================================
 * 1. WAS AM REFERENZMATERIAL GEMESSEN WURDE
 * ===========================================================================
 *
 * Alle Zahlen sind sRGB-Codewerte aus den Originaldateien, Zeilen- und
 * Spaltenschnitte, keine Schaetzung.  L ist Rec.709-Luma, S ist
 * (max-min)/max.
 *
 * ---------------------------------------------------------------------------
 * (a) BLAU — `ref/slime/sr1-rest-blue-rock-face-closeup.jpg` (1834x1032)
 *
 * Waagerechter Schnitt, Zeile 620, quer durch die breiteste Stelle.  Das ist
 * die DICKENACHSE: am Rand ist die Weglaenge durch das Gel null, in der Mitte
 * maximal.
 *
 *   x    Farbe      RGB              S     L    Weglaenge (dRel, gerechnet)
 *   638  #6bb1e2   (107,177,226)   0.53   166   0.00
 *   650  #3c9edb   ( 60,158,219)   0.73   142   0.72
 *   662  #1f84cc   ( 31,132,204)   0.85   116   1.00
 *   686  #0c63b0   ( 12, 99,176)   0.93    86   1.36
 *   698  #0456a0   (  4, 86,160)   0.97    74   1.49
 *   746  #04498e   (  4, 73,142)   0.97    63   1.83
 *   746…990  #04488d PLATEAU ueber 250 px, Streuung <= 4 Stufen je Kanal
 *
 *   Das ist der Befund, auf den es ankommt: rund 70 % der Koerperbreite
 *   liegen auf EINEM Wert.  Der ganze Farbweg von hell nach tief passiert im
 *   aeusseren Drittel.  Das ist „grosse ruhige Farbflaeche" (GRAFIK-MODULE §0),
 *   nicht „Verlaufsteppich".
 *
 *   Verhaeltnis Rand zu Plateau: 166 / 62 = 2.68 : 1.
 *   Saettigung steigt mit der Dicke: 0.53 -> 0.85 -> 0.97.
 *
 * Senkrechter Schnitt, Spalte 700 (an der Glanzstelle vorbei), Krone:
 *   y 420…450  #78c6f4 (120,198,244) L 185 — die duenne, voll beleuchtete Zone
 *   y 550…620  #0559a1 (  5, 89,161) L  76
 *   y 780…800  #04326d (  4, 50,109) L  44
 *
 * ---------------------------------------------------------------------------
 * (b) ROT — zwei Quellen, weil rotes Gel der schwierige Fall ist
 *
 * `ref/slime/sr1-rest-single-pink-silhouette.jpg`, Spalte 1320 (Koerper-bbox
 * 1284,718,221,225 — dieselbe wie ref/slime/DOSSIER.md §7):
 *
 *   y 762…778  #ff709c (255,112,156)  S 0.56  L 146   Licht-PLATEAU, ~20 px flach
 *   y 786…818  Uebergang, 40 px = 19 % der Koerperhoehe
 *   y 866…890  #88143b (136, 20, 59)  S 0.85  L  47   Schatten-PLATEAU, ~35 px flach
 *   y 898      #ad2644 (173, 38, 68)          L  69   Bodenreflex
 *
 *   Kontrast 146 / 47 = 3.11 : 1 (Dossier §7: 2.9 : 1, Pruefkriterium 12:
 *   2.5 : 1 bis 3.3 : 1).  Wieder: zwei Plateaus, ein schmaler Uebergang.
 *
 * `ref/slime-rancher/sr1-lava-slimes-airborne-and-squash.jpg`, Spalte 940:
 *
 *   y 360  #ff9854 (255,152, 84)  S 0.67  L 169   duenne Krone
 *   y 432  #ff0806 (255,  8,  6)  S 0.98  L  60   Mitte
 *   y 560  #890302 (137,  3,  2)  S 0.99  L  31   tiefste Zone
 *
 * ---------------------------------------------------------------------------
 * (c) WARUM ROT MATSCHIG WIRD, IN ZAHLEN
 *
 * Beide roten Quellen halten in der TIEFEN Zone dreierlei ein:
 *
 *   1. Die Saettigung STEIGT mit der Tiefe (0.56 -> 0.85 bzw. 0.67 -> 0.99).
 *      Sie faellt nie.  Eine tiefe Zone mit S unter 0.80 liest sich als Dreck.
 *   2. Der Rotkanal bleibt oben: 136 bzw. 137 von 255 (0.53).  Rot, das in
 *      der Tiefe unter etwa 0.40 faellt, wird zu schwarzem Schlamm.
 *   3. Gruen faellt VIEL staerker als Blau.  Beim Pinkschleim faellt
 *      G um Faktor 5.6 (112 -> 20), B nur um 2.6 (156 -> 59); im Schatten
 *      steht B/G = 2.95.  Genau das haelt den Ton auf Karmin statt auf Braun,
 *      denn Braun ist definiert durch G >= B bei mittlerem R.
 *
 * Die Palette, die diese Datei ersetzt, verletzte 2 und 3:
 *      alt  ravok.tief   = [0.36, 0.03, 0.06]  -> (92, 8, 15), B/G = 1.9, L 27
 *      alt  ravok.absorb = [0.33, 1.19, 1.48]  -> B wird STAERKER geschluckt
 *                                                 als G, also laesst dickes
 *                                                 rotes Gel Orange durch.
 * Beides zieht in Richtung Braun.  Blau hatte das Problem nie: dort ist
 * absorb = [1.81, 0.84, 0.35], also wird Blau am wenigsten geschluckt, und
 * die tiefe Zone bleibt blau.  Rot brauchte dieselbe Konsequenz mit
 * vertauschten Rollen.
 *
 * ===========================================================================
 * 2. WAS DIESE DATEI DARAUS MACHT
 * ===========================================================================
 *
 * ---------------------------------------------------------------------------
 * (a) Die Farbtafel (Ordnung 57)
 *
 * gel.js loest die Fraktion, den Todeszustand und die Toenung anderer Module
 * bereits vollstaendig auf und veroeffentlicht das Ergebnis als `R.gel.farbe`.
 * Diese Aufloesung ist richtig und bleibt, wo sie ist.  Was hier passiert, ist
 * ausschliesslich, dass die EINGANGSWERTE dieser Aufloesung — `R.gel.palette`
 * — auf die gemessenen Zahlen gesetzt werden.  Einmal, beim ersten Bild.
 *
 * Das ist eine Fremdaenderung zur Laufzeit und wird deshalb hier so laut
 * hingeschrieben: wer in gel.js nachliest, findet dort andere Zahlen als im
 * Bild.  Die Alternative waere `BRAUCHT_FREMDAENDERUNG: gel.js` gewesen — aber
 * die Fraktionspalette ist genau die Sache, die dieses Modul verantwortet, und
 * gel.js gibt sie unter `api.palette` ausdruecklich heraus.  Faellt dieses
 * Modul beim Aufbau aus, stehen die Zahlen aus gel.js unveraendert da; nichts
 * bricht.
 *
 * ---------------------------------------------------------------------------
 * (b) Die Zonenkante (Ordnung 62)
 *
 * gel.js rechnet die Farbe als STETIGE Rampe auf der Dickenachse:
 *
 *     tiefe = 1 - exp(-dRel * uSaettigung)
 *     streu = mix(mix(klar, kern, 2*tiefe), tief, 2*tiefe - 1)
 *
 * Diese Rampe ist inhaltlich richtig (die Farbe folgt der Weglaenge, nicht
 * N·L) und bleibt genau so stehen.  Falsch ist nur ihre VERTEILUNG: sie ist
 * ueber den ganzen Koerper stetig, und ein stetiger Verlauf ueber die ganze
 * Flaeche ist das, was GRAFIK-MODULE §0 in der rechten Spalte verbietet.  Am
 * eigenen Bild nachgemessen (`wabbeln`, Bild 10, zweiter Pfad, Spalte 790):
 *
 *     y 380  L 153 · 430  L 110 · 480  L 81 · 530  L 64 · 590  L 70
 *     Jeder 10-px-Schritt aendert L um 3 bis 6.  Kein einziges Plateau.
 *     Waagerecht (Dickenachse, Zeile 500): Rand L 117 -> Mitte L 72,
 *     also 1.63 : 1 statt der gemessenen 2.68 : 1.
 *
 * Dieses Modul zeichnet deshalb einen zweiten Durchgang ueber dieselbe
 * Frontflaeche und MULTIPLIZIERT das Ergebnis mit
 *
 *     m = leiterStufe(tiefe) / leiterStetig(tiefe)
 *
 * Beides wird aus denselben Uniforms gerechnet, die gel.js benutzt hat
 * (`R.gel.binden` liefert uKlar/uKern/uTief/uRadius/uWeit/uTiefeTex), also aus
 * exakt derselben Weglaenge — inklusive der Sehnen der Einschluesse und der
 * Frontschicht davor.  Weil das Gelpixel proportional zu `leiterStetig` ist,
 * ist das Produkt proportional zu `leiterStufe`.  Das Band wird damit
 * rechnerisch flach, nicht ungefaehr flach.
 *
 * Drei Baender, die Stuetzstellen aus (a):
 *
 *     Band A   tiefe < z1          UNVERAENDERT (m = 1)
 *              Der schmale Ring an der Silhouette.  Er traegt die Lesbarkeit
 *              (§0) und ist am Referenzmaterial die hellste Stelle des
 *              Koerpers — er darf nicht angefasst werden.
 *     Band B   z1 <= tiefe < z2    flach auf leiterStetig(z2)
 *     Band C   tiefe >= z2         flach auf leiterStetig(z3)
 *
 * Weil `leiterStetig` monoton dunkler wird, ist der Faktor immer <= 1: dieser
 * Durchgang kann nur abdunkeln und saettigen, nie aufhellen.  Das ist Absicht,
 * nicht Verzicht — das Renderziel ist RGBA8 (`R.bildschirm.hdr === false`), ein
 * multiplikativer Durchgang klemmt seine Quelle dort ohnehin auf 1.  Ein
 * Durchgang, der nicht ueberstrahlen KANN, kann auch keine Silhouette
 * auffressen.
 *
 * Die Kante zwischen zwei Baendern wird ueber `fwidth(tiefe)` auf
 * Bildschirmbreite begrenzt: `uFlanke = 0.75` ergibt 1.5 px Uebergang, also
 * genau die „harte Schattenkante, Flanke etwa 2 px" aus §0 — und zwar
 * unabhaengig von Kameradistanz und Kruemmung.  Ein fester Schwellwert ohne
 * fwidth flimmert an der Stelle, wo die Weglaenge am schnellsten waechst,
 * also ausgerechnet am Rand.
 *
 * Zielwerte, gegen die dieses Modul geprueft wird (Dickenachse, quer durch
 * den Koerper): Rand zu tiefstem Plateau 2.5 : 1 bis 3.3 : 1, Plateau ueber
 * mindestens 40 % der Koerperbreite mit Streuung <= 4 Stufen, Saettigung im
 * tiefen Band >= 0.80, zwei erkennbare Stufen zwischen Rand und Mitte.
 *
 * ---------------------------------------------------------------------------
 * (bb) WAS ERREICHT IST
 *
 * Gemessen an einem Standbild aus derselben Sitzung, Modul einmal aus und
 * einmal an (Regler `farbe.tafel` und `farbe-zonen.staerke`), damit der
 * Unterschied nicht den Nachbarmodulen zufaellt.  Zeile 490 quer durch den
 * Koerper (Breite 285 px), Spalte 790 laengs.
 *
 *                              AUS              AN            Referenz
 *   Eldoran  Rand              L 122            L 156         L 166
 *            tiefstes Plateau  L 75             L 60          L 62
 *            Verhaeltnis quer  1.63 : 1         2.60 : 1      2.68 : 1
 *            Plateaubreite     keines           63 %          70 %
 *            Verhaeltnis laengs 2.79 : 1        3.3 : 1       2.5…3.3 gefordert
 *            Farbe tief        #1f4db9          #183b85
 *            Saettigung tief   0.83             0.82…0.84     0.97
 *
 *   Ravok    Rand              L 129            L 115         L 146
 *            tiefstes Plateau  L 66             L 50          L 47
 *            Verhaeltnis quer  1.95 : 1         2.30 : 1      3.11 : 1
 *            Verhaeltnis laengs 2.26 : 1        2.60 : 1      2.5…3.3 gefordert
 *            Farbe tief        #ad2123          #8e172a       #88143b
 *            B/G in der Tiefe  1.06  (BRAUN)    1.83          2.95
 *            Saettigung tief   0.81             0.84          0.85
 *
 * Der wichtigste Wert in dieser Tabelle ist `B/G in der Tiefe` bei Ravok.
 * 1.06 heisst Gruen und Blau gleich stark — das ist die Definition eines
 * unbunten Dunkelrots, also Braun.  Das war der Matsch.
 *
 * Zwei Zahlen bleiben hinter der Referenz: die Saettigung der tiefen Zone
 * (0.83 gegen 0.97) und Ravoks Querverhaeltnis (2.30 gegen 3.11).  Beides hat
 * dieselbe Ursache und ist kein Versaeumnis: die Referenzkoerper sind
 * DECKEND (ref/slime/DOSSIER.md §7, erste Zeile), unserer ist es nicht und
 * darf es nicht sein (GDD 01 §28).  Durch ein durchscheinendes tiefes Band
 * kommt immer noch Hintergrund, und Hintergrund ist unbunt.  Wer diese zwei
 * Zahlen erzwingen will, muss die Dichte hochdrehen — und dann verschwindet
 * der gefressene Gegner.
 *
 * ---------------------------------------------------------------------------
 * (c) Was diese Datei ABSICHTLICH NICHT tut
 *
 * Sie legt KEINE Stufe auf die Lichtachse (N·L).  PHASE-GRAFIK-PLAN §2 und der
 * Kopf von gel.js begruenden ausfuehrlich, warum eine harte Cel-Kante auf
 * einem durchscheinenden Koerper ihn in eine lackierte Schale verwandelt und
 * damit GDD 01 §28 bricht.  Die Schulter auf der Lichtachse gehoert gel.js
 * (`termA`/`termB`), und die Messung an (b) stuetzt sie sogar: der Uebergang
 * zwischen den beiden Helligkeitsplateaus des Pinkschleims ist 19 % der
 * Koerperhoehe breit, also weich — nur die Plateaus davor und dahinter sind
 * flach.  Die Zonen dieser Datei liegen ausschliesslich auf der DICKENACHSE.
 *
 * ===========================================================================
 * 3. EINORDNUNG
 * ===========================================================================
 *
 *   54  innen    Blasen im Koerper
 *   55  glanz-anmeldung
 *   57  farbe          <- Farbtafel, zeichnet nicht
 *   58  gelschale      Grundzug: Rueckwand
 *   60  gel            Materialkern
 *   62  farbe-zonen    <- multiplikativ, direkt auf dem Gel
 *   70  glanz          additiv, danach — der Glanzfleck wird NICHT eingefaerbt
 *   72  rand           additiv, danach
 *
 * Ordnung 62 und nicht 57 fuer den Durchgang: bei 57 laege er VOR der
 * Gelschale (58) und dem Gel (60) und wuerde von beiden restlos ueberdeckt.
 * gel.js verlangt fuer alles, was AUF der Oberflaeche sitzt, ausdruecklich
 * Ordnung > 60.  ABWEICHUNG VOM AUFTRAG (dort stand nur 57) — der Eintrag 57
 * existiert und macht die inhaltliche Arbeit, gezeichnet wird bei 62.  Dasselbe
 * Muster wie glanz.js (55 + 70) und rand.js (72).
 *
 * Determinismus (GRAFIK-MODULE §4): keine Zufallszahl, keine Uhr, kein
 * `uZeit`.  Die Zonen haengen allein an der Weglaenge durch die verformte
 * Huelle — sie wandern, weil der Koerper sich verformt, und aus keinem
 * anderen Grund.
 * ========================================================================= */

(function () {

  const G = (typeof GRAFIK !== 'undefined' && GRAFIK) ? GRAFIK : (window.GRAFIK = {});
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/farbe.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* =====================================================================
   * Die Farbtafel.
   *
   * klar   duenne Zone: hell und klar, aber schon in der Fraktionsfarbe
   * kern   mittlere Dicke: die Fraktionsfarbe selbst, satt
   * tief   dicke Zone: satter und dunkler, Farbton unveraendert
   * absorb Extinktion je Kanal, auf Mittelwert 1 normiert.  Sie entscheidet,
   *        welche Farbe DURCH den Koerper kommt — beim Blauen Blau
   *        (absorb.b am kleinsten), beim Roten Rot mit Blaustich
   *        (absorb.g am groessten).  Das ist die zweite Haelfte der
   *        Matsch-Vermeidung: ein Kanalprofil, das in der Tiefe nach Karmin
   *        laeuft und nicht nach Orange.
   * glanz  Eigenfarbe des Glanzlichts; glanz.js liest sie ueber R.gel.farbe.
   * =================================================================== */
  const TAFEL = {
    /* Eldoran, gemessen an sr1-rest-blue-rock-face-closeup.jpg:
     *   klar  #78c6f4 (120,198,244)  Krone, Spalte 700, y 420…450
     *   kern  #1f84cc ( 31,132,204)  Zeile 620, x 662
     *   tief  #04488d (  4, 72,141)  Plateau, Zeile 620, x 746…990
     *
     * Die Zahlen hier sind KEINE Kopie dieser Pixel.  Ein Pixel ist
     * Albedo mal Licht mal Deckung; die Tafel traegt nur den Albedoanteil.
     * `klar` liegt deshalb ueber dem gemessenen Pixel (das Gel ist am Rand
     * kaum deckend, die Farbe kommt dort fast nur aus der Absorption des
     * Hintergrunds), `tief` darunter.  Massgeblich sind die VERHAELTNISSE:
     * Rand zu tiefstem Plateau 2.68 : 1 und Saettigung 0.53 -> 0.97. */
    eldoran: {
      klar:   [0.56, 0.88, 1.00],
      kern:   [0.12, 0.52, 0.80],
      tief:   [0.015, 0.21, 0.45],
      absorb: [1.81, 0.84, 0.35],
      glanz:  [0.90, 0.97, 1.00],
    },
    /* Ravok.  Hue aus sr1-rest-single-pink-silhouette.jpg (Karmin statt
     * Braun), Saettigungsdisziplin aus sr1-lava-slimes-airborne-and-squash.jpg.
     *   klar  ~ #ff9e85 — die Lava-Krone #ff9854 (255,152,84) mit
     *          angehobenem Blau, sonst kippt der duenne Ring nach Orange und
     *          Ravok sieht aus wie Feuer statt wie Blut
     *   kern  ~ #f21638 — B DEUTLICH ueber G (2.6 : 1).  Das ist die eine
     *          Zahl, an der Karmin und Braun sich trennen
     *   tief  ~ #61042b — gemessenes Vorbild #88143b (136,20,59) mit
     *          B/G 2.95; hier 11 : 1, weil in unserem Gel der Rotkanal des
     *          Hintergrunds fast ungehindert durchkommt (absorb.r = 0.30)
     *          und den Ton von sich aus zurueck Richtung Orange zieht */
    ravok: {
      klar:   [1.00, 0.62, 0.52],
      kern:   [0.95, 0.085, 0.22],
      tief:   [0.38, 0.015, 0.17],
      absorb: [0.30, 1.45, 1.25],
      glanz:  [1.00, 0.94, 0.90],
    },
  };

  /* Stellschrauben des Zonendurchgangs.  z1/z2/z3 sind Stellen auf der
   * `tiefe`-Achse von gel.js (0 = Silhouette, 1 = undurchdringlich dick).
   *
   * z1 = 0.34 entspricht bei uSaettigung 0.88 einer Weglaenge dRel = 0.47.
   * Das ist die Breite des hellen Rings.  Am Referenzmaterial liegt die
   * erste Kante bei dRel etwa 0.7; wir sitzen enger, weil unser Gel im
   * Gegensatz zum Slime-Rancher-Koerper durchscheinend ist und der Ring
   * sonst wie eine Glasschale um einen hohlen Koerper wirkt.
   * z2 = 0.68 entspricht dRel = 1.30; ab dort steht die Messung auf dem
   * Plateau (#04488d ab x 746, dRel 1.83).
   * z3 = 0.94 liegt ueber der groessten Weglaenge, die im Bild vorkommt
   * (voller Durchmesser: dRel 2 -> tiefe 0.83, stark gestauchte Huelle bis
   * etwa 0.90).  Der Abstand z3 zur tatsaechlichen Tiefe ist genau der
   * Betrag, um den das tiefe Band ZUSAETZLICH abgedunkelt und gesaettigt
   * wird — die Schraube fuer „tiefe Zonen satter und dunkler".
   * Warum nicht hoeher: bei z3 = 1.00 traf die Dickenachse ihre 2.68 : 1
   * genau, aber die Lichtachse (Krone zu Fuss) lief auf 3.95 : 1 und damit
   * aus dem Fenster 2.5…3.3 von ref/slime/DOSSIER.md, Pruefkriterium 12.
   * Mit 0.94 stehen beide Achsen drin: 2.60 : 1 quer, 3.3 : 1 laengs. */
  const P = {
    z1: 0.34,
    z2: 0.68,
    z3: 0.94,
    flanke: 0.75,   // halbe Kantenbreite in Pixeln -> 1.5 px Uebergang
    staerke: 1.00,
  };

  /* Stellschraube der Farbtafel.  `tafel: 0` stellt die Palette wieder her,
   * die gel.js selbst mitbringt — damit ist der Beitrag dieser Datei am
   * laufenden Bild ein- und ausschaltbar und nicht nur zwischen zwei
   * Aufnahmen vergleichbar.  Genau daran ist die erste Messreihe gescheitert:
   * zwischen zwei Aufnahmen hatten Nachbarmodule sich mitgeaendert, und der
   * Unterschied liess sich niemandem mehr zuordnen. */
  const T = { tafel: 1 };

  const S = {
    bereit: false,
    prog: null,
    mesh: null,
    urtafel: null,   // die Palette, die gel.js mitbringt
    MAX: 8,          // wird aus R.gel.MAX_EINSCHLUSS uebernommen
  };

  /* =====================================================================
   * Shader
   * =================================================================== */

  /* Wortgleich mit gel.js — der Durchgang muss auf derselben Tiefe landen wie
   * der Tiefenvorlauf D2a, sonst faellt er unter depthFunc(LEQUAL) durch. */
  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
invariant gl_Position;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vPos = aPos;
  vNormal = aNormal;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  /* Dieselbe 24-Bit-Packung wie gel.js.  Wird zur Laufzeit durch
   * R.gel.glsl.packen ersetzt, falls gel.js sie liefert — dann kann sie nie
   * auseinanderlaufen. */
  const PACKEN_NOT = `
const vec3 BIT = vec3(1.0, 255.0, 65025.0);
vec3 packe(float v) {
  vec3 e = fract(BIT * clamp(v, 0.0, 1.0));
  e.xy -= e.yz * (1.0 / 255.0);
  return e;
}
float entpacke(vec3 p) {
  return dot(p, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}`;

  function fsQuelle(packen, max) {
    return `#version 300 es
precision highp float;
${packen}

in vec3 vPos;
in vec3 vNormal;

uniform vec3  uCam;

/* Alles ab hier setzt R.gel.binden() — dieselben Werte, aus denen gel.js
 * seine Farbe gerechnet hat.  Wer sie hier neu herleitet, rechnet mit einer
 * anderen Weglaenge als der Materialkern, und die Kante sitzt daneben. */
uniform sampler2D uTiefeTex;
uniform float uHatTiefe;
uniform float uWeit;
uniform float uRadius;
uniform vec3  uKlar;
uniform vec3  uKern;
uniform vec3  uTief;

uniform float uSaettigung;    // aus R.gel.regler.saettigung
uniform float uFrontschicht;  // aus R.gel.frontschicht

uniform vec4  uEinschluss[${max}];
uniform float uEinschlussKraft[${max}];
uniform int   uEinschlussZahl;

uniform float uZ1;
uniform float uZ2;
uniform float uZ3;
uniform float uFlanke;
uniform float uStaerke;

out vec4 outColor;

/* Die stetige Rampe von gel.js, Zeichen fuer Zeichen. */
vec3 leiter(float t) {
  return mix(mix(uKlar, uKern, clamp(t * 2.0, 0.0, 1.0)),
             uTief,
             clamp(t * 2.0 - 1.0, 0.0, 1.0));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  if (dot(N, V) < 0.0) N = -N;      // Falten des Weichkoerpers
  vec3 D = -V;
  float ndv = max(dot(N, V), 0.0);

  /* --- Weglaenge, identisch zu gel.js ---------------------------------- */
  float vorne = length(vPos - uCam);
  vec4 tp = texelFetch(uTiefeTex, ivec2(gl_FragCoord.xy), 0);
  float hinten = entpacke(tp.rgb) * uWeit;
  float dicke = (uHatTiefe > 0.5 && tp.a > 0.5)
      ? max(hinten - vorne, 0.0)
      : uRadius * 2.0 * pow(ndv, 0.85);

  float trifft = 0.0;
  for (int i = 0; i < ${max}; i++) {
    if (i >= uEinschlussZahl) break;
    vec3  C = uEinschluss[i].xyz;
    float r = uEinschluss[i].w;
    if (r <= 0.0) continue;
    vec3  m = vPos - C;
    float b = dot(m, D);
    float c = dot(m, m) - r * r;
    float disc = b * b - c;
    if (disc <= 0.0) continue;
    float w = sqrt(disc);
    float t0 = clamp(-b - w, 0.0, dicke);
    float t1 = clamp(-b + w, 0.0, dicke);
    dicke -= (t1 - t0) * uEinschlussKraft[i];
    trifft = max(trifft, (t1 > t0 ? 1.0 : 0.0) * uEinschlussKraft[i]);
  }
  dicke = max(dicke, uFrontschicht * uRadius * trifft);
  dicke = max(dicke, 0.0);
  float dRel = dicke / max(uRadius, 1e-3);

  float t = 1.0 - exp(-dRel * uSaettigung);

  /* --- Die Leiter -------------------------------------------------------
   * Band A bleibt, wie es ist: der Ring an der Silhouette ist am Material
   * die hellste Stelle und traegt die Lesbarkeit.  Band B und C werden auf
   * einen festen Wert gelegt — und weil das Gelpixel proportional zu
   * leiter(t) ist, wird das Band dadurch RECHNERISCH flach. */
  vec3 bandA = leiter(t);
  vec3 bandB = leiter(uZ2);
  vec3 bandC = leiter(uZ3);

  /* Kantenbreite in Pixeln statt in Rampeneinheiten.  Ohne fwidth ist die
   * Kante dort, wo die Weglaenge schnell waechst, unendlich duenn und
   * flimmert; im Koerperinneren waere sie dagegen zentimeterbreit. */
  float w = max(fwidth(t), 1e-5) * uFlanke;
  float k1 = smoothstep(uZ1 - w, uZ1 + w, t);
  float k2 = smoothstep(uZ2 - w, uZ2 + w, t);

  vec3 stufe = mix(mix(bandA, bandB, k1), bandC, k2);
  vec3 weich = max(leiter(t), vec3(1e-4));

  vec3 m = clamp(stufe / weich, vec3(0.0), vec3(1.0));
  outColor = vec4(mix(vec3(1.0), m, uStaerke), 1.0);
}`;
  }

  /* =====================================================================
   * Eintrag 1 — Ordnung 57: die Farbtafel
   * =================================================================== */
  G.modul({
    name: 'farbe',
    ordnung: 57,

    regler: [
      { key: 'tafel', min: 0, max: 1, step: 1, wert: T.tafel },
    ],

    /* Laeuft vor dem `vorbereiten` von gel.js (60) — nur deshalb sieht der
     * Materialkern die neuen Zahlen noch im selben Bild. */
    vorbereiten(gl, R, ctx) {
      const w = this.wert;
      if (w && w.tafel !== undefined) T.tafel = w.tafel;

      const gel = R.gel || G.gel;
      if (!gel || !gel.palette) return;      // gel.js noch nicht aufgebaut

      /* Beim ersten Bild die Zahlen sichern, die gel.js mitbringt. */
      if (!S.urtafel) {
        S.urtafel = Object.create(null);
        for (const name in gel.palette) {
          const q = gel.palette[name];
          S.urtafel[name] = {
            klar: q.klar.slice(), kern: q.kern.slice(), tief: q.tief.slice(),
            absorb: q.absorb.slice(), glanz: q.glanz.slice(),
          };
        }
      }

      const quelle = T.tafel ? TAFEL : S.urtafel;
      for (const name in quelle) {
        const ziel = gel.palette[name];
        if (!ziel) continue;
        const q = quelle[name];
        ziel.klar = q.klar.slice();
        ziel.kern = q.kern.slice();
        ziel.tief = q.tief.slice();
        ziel.absorb = q.absorb.slice();
        ziel.glanz = q.glanz.slice();
      }

      /* Fuer jedes Modul, das die Leiter kennen will, ohne sie neu
       * herzuleiten. */
      R.farbe = G.farbe = { tafel: TAFEL, zonen: P, aktiv: !!T.tafel };
    },
  });

  /* =====================================================================
   * Eintrag 2 — Ordnung 62: die Zonenkante
   * =================================================================== */
  G.modul({
    name: 'farbe-zonen',
    ordnung: 62,

    regler: [
      { key: 'z1', min: 0.10, max: 0.70, step: 0.01, wert: P.z1 },
      { key: 'z2', min: 0.40, max: 0.92, step: 0.01, wert: P.z2 },
      { key: 'z3', min: 0.60, max: 1.00, step: 0.01, wert: P.z3 },
      { key: 'flanke', min: 0.20, max: 4.00, step: 0.05, wert: P.flanke },
      { key: 'staerke', min: 0.0, max: 1.0, step: 0.02, wert: P.staerke },
    ],

    aufbau(gl, R) {
      const gel = R.gel || G.gel;
      const packen = (gel && gel.glsl && gel.glsl.packen) || PACKEN_NOT;
      S.MAX = (gel && gel.MAX_EINSCHLUSS) || 8;
      S.prog = G.programm(gl, VS, fsQuelle(packen, S.MAX), 'schleim/farbe-zonen');
      S.bereit = true;
    },

    vorbereiten(gl, R, ctx) {
      if (!S.bereit) return;
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];
      /* z2 darf nie unter z1 rutschen — sonst kehrt sich die Leiter um und
       * der Faktor wird groesser als 1, also wirkungslos geklemmt. */
      if (P.z2 < P.z1 + 0.02) P.z2 = P.z1 + 0.02;
      if (P.z3 < P.z2 + 0.02) P.z3 = P.z2 + 0.02;
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit) return;
      const gel = R.gel || G.gel;
      /* Ohne den Materialkern gibt es keine Weglaenge und damit keine Zonen.
       * Dann macht dieses Modul nichts — ein Bild ohne Zonenkante ist besser
       * als eines mit einer erfundenen. */
      if (!gel || !gel.farbe || !gel.tiefeTex || typeof gel.binden !== 'function') return;

      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) {
        mesh = S.mesh = G.mesh(gl, ctx.surface.positions, ctx.surface.normals, ctx.surface.indices);
      }
      if (!mesh || !mesh.vao) return;

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      /* Die Huelle liegt bereits im Puffer: renderer2.js laedt sie einmal je
       * Bild hoch (huelleHochladen), gel.js ebenso.  Beide laufen vor 62 —
       * hier wird deshalb nichts hochgeladen, was sonst ein drittes Mal
       * dieselben 2562 Punkte ueber den Bus schoebe. */

      const p = S.prog;
      const u = p.u || {};
      gl.useProgram(p);
      gl.bindVertexArray(mesh.vao);

      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);

      /* uTiefeTex, uHatTiefe, uWeit, uRadius, uKlar, uKern, uTief — alles aus
       * einer Hand, damit die Kante auf derselben Weglaenge sitzt wie die
       * Farbe darunter. */
      gel.binden(gl, p, 7);

      const saettigung = (gel.regler && gel.regler.saettigung !== undefined)
        ? gel.regler.saettigung : 0.88;
      gl.uniform1f(u.uSaettigung, saettigung);
      gl.uniform1f(u.uFrontschicht, gel.frontschicht !== undefined ? gel.frontschicht : 0.26);

      const ein = gel.einschluss || [];
      gl.uniform1i(u.uEinschlussZahl, Math.min(ein.length, S.MAX));
      for (let i = 0; i < S.MAX; i++) {
        const e = ein[i];
        const lo = gl.getUniformLocation(p, 'uEinschluss[' + i + ']');
        const lk = gl.getUniformLocation(p, 'uEinschlussKraft[' + i + ']');
        if (e) {
          gl.uniform4f(lo, e.pos[0], e.pos[1], e.pos[2], e.r);
          gl.uniform1f(lk, e.kraft === undefined ? 0.8 : e.kraft);
        } else {
          gl.uniform4f(lo, 0, 0, 0, 0);
          gl.uniform1f(lk, 0);
        }
      }

      gl.uniform1f(u.uZ1, P.z1);
      gl.uniform1f(u.uZ2, P.z2);
      gl.uniform1f(u.uZ3, P.z3);
      gl.uniform1f(u.uFlanke, P.flanke);
      gl.uniform1f(u.uStaerke, P.staerke);

      /* Der Zustand, den gel.js fuer Ordnung > 60 vorschreibt: die
       * Frontflaeche steht nach D2a im Tiefenpuffer, also LEQUAL ohne
       * Schreiben.  Gemischt wird MULTIPLIKATIV — dieser Durchgang gibt kein
       * Licht dazu, er verteilt vorhandenes auf Baender.  Das Alpha des Ziels
       * bleibt unberuehrt, genau wie bei den Durchgaengen des Materialkerns. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.ONE);

      gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

      /* Zustand so zuruecklassen, wie die Pipeline ihn erwartet. */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
  });

})();
