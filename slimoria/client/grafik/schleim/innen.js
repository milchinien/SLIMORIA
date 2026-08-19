'use strict';
/* ===========================================================================
 * grafik/schleim/innen.js — was man IM Koerper sieht.  Lane SCHLEIM, Ordnung 54.
 *
 * Nur im zweiten Renderpfad (?renderer=2).  `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche des Gauntlets.
 *
 * ---------------------------------------------------------------------------
 * 0. DIE AUFGABE IN EINEM SATZ
 * ---------------------------------------------------------------------------
 * `gel.js` macht den Koerper DURCHSCHEINEND.  Durchscheinend allein heisst
 * aber nur „Huelle aus getoentem Glas": man sieht hindurch und findet nichts.
 * Der Unterschied zwischen einer Huelle und einem GEFUELLTEN Koerper ist, dass
 * im Inneren etwas STEHT, das beim Kippen der Kamera an seinem Ort bleibt und
 * beim Anfahren traege hinterherzieht.  Genau das liefert diese Datei: wenige,
 * grosse, klar begrenzte Blasen.
 *
 * ---------------------------------------------------------------------------
 * 1. WAS AM REFERENZMATERIAL GEMESSEN WURDE
 * ---------------------------------------------------------------------------
 * Angesehen: ref/slime/sr2-material-quality-closeup.jpg,
 * ref/slime/sr1-rest-grey-plus-honey-translucent.jpg,
 * ref/slime/sr2-rest-pink-subsurface-face.jpg,
 * ref/slime/sr1-rest-domes-cave-contrast.jpg,
 * ref/blob-jelly/slime-heroes-screenshot-2.jpg,
 * ref/blob-jelly/gelly-break-screenshot-2.jpg und -3.jpg,
 * ref/blob-jelly/slime-rancher-2-presskit-13.png.
 *
 * (a) Der einzige Fall im ganzen Material, in dem eine INNENSTRUKTUR wirklich
 *     gezeichnet ist, ist der Honigslime in
 *     `sr1-rest-grey-plus-honey-translucent.jpg`.  Waagerechter Schnitt durch
 *     den vorderen Koerper (Bildzeile y = 520, Koerper x 1615..1920, also
 *     305 px breit), Rohwerte:
 *
 *       Zellinneres        L 176 .. 209   S 0.40 .. 0.55   (satt, warm)
 *       Zellnaht           L 242 .. 254   S 0.01 .. 0.17   (fast weiss)
 *       tiefe Zone (Mund)  L 125 .. 160   S 0.20 .. 0.35
 *
 *     Daraus die drei Zahlen, an denen dieses Modul haengt:
 *
 *       NAHT ZU FUELLUNG, Helligkeit   250 / 190 = 1.32 : 1
 *       NAHT ZU FUELLUNG, Saettigung   0.05 / 0.45 = 0.11  (die Naht ist der
 *                                      ENTSAETTIGTE Teil, nicht der hellere
 *                                      Farbton — dieselbe Regel wie beim
 *                                      Glanzlicht, ref/slime/DOSSIER.md §7)
 *       ZELLWEITE                      Nahtabstaende 90 / 50 / 45 px auf
 *                                      305 px Koerperbreite
 *                                      = 15 .. 30 % der Koerperbreite,
 *                                      4 bis 6 Zellen quer ueber den Koerper
 *       NAHTBREITE                     6 .. 10 px auf 50 .. 90 px Zellweite
 *                                      = rund 10 % des Durchmessers, also die
 *                                      AEUSSEREN 20 % des Radius
 *
 * (b) Freistehende Blasen, `slime-rancher-2-presskit-13.png`, Schnitt durch
 *     eine Eisblase (y = 384, x 2770..3000, Durchmesser 173 px):
 *
 *       Hintergrund        L 181
 *       Blasenfuellung     L 181 .. 186   (+ 1 .. 3 %  — praktisch NICHTS)
 *       Blasenrand         L 199          (+ 10 %)
 *       Zeichnung darin    L 216          (+ 19 %)
 *
 *     Die Lehre daraus ist die wichtigste des ganzen Moduls: eine Blase ist
 *     fast nur RAND.  Wer die Fuellung deutlich aufhellt, malt eine Kugel in
 *     den Koerper, keine Blase — und eine Kugel im Bauch zieht den Blick vom
 *     Gesicht weg.
 *
 * (c) `slime-heroes-screenshot-2.jpg`, blauer Slime, 48x24-Raster ueber den
 *     Koerper: oben L 197, unten L 113, also 1.74 : 1 ueber die Koerperhoehe,
 *     und der Verlauf ist EINE grosse Flaeche, keine Wolke.  Diesen Verlauf
 *     macht `gel.js` bereits (Dickenachse).  Dieses Modul legt NICHTS darueber,
 *     was den Verlauf zerreisst — deshalb keine Partikel, keine Schlieren,
 *     keine Textur.
 *
 * (d) `gelly-break-screenshot-2.jpg` (Gelee-Tabletts) und
 *     `sr1-rest-domes-cave-contrast.jpg` (Phosphorslimes im Blasenzelt):
 *     dieselbe Aussage von der anderen Seite — die Innenzeichnung ist immer
 *     eine HANDVOLL grosser Formen mit harter Kante, nie ein Nebel.
 *     GRAFIK-MODULE.md §0: „Wenige grosse Elemente" gegen „Viele kleine".
 *
 * ---------------------------------------------------------------------------
 * 2. WORAUS DIE BEWEGUNG KOMMT (GDD 01 §66) — und woraus NICHT
 * ---------------------------------------------------------------------------
 * Es gibt in dieser Datei keine Zeitachse.  `ctx.time` wird nicht gelesen,
 * kein Sinus, kein Zaehler, keine ueber Bilder fortgeschriebene Groesse.  Eine
 * Blase, die von selbst kreist, ist eine Animation auf einem Objekt — und
 * damit genau das „bemalte Objekt", das GDD 01 §66 verbietet.  Die Blasen
 * bewegen sich, WEIL DER KOERPER SICH BEWEGT, und sonst gar nicht.  Steht der
 * Schleim vollkommen still, stehen sie still.
 *
 * Drei Ableitungen, alle reine Funktionen des JETZIGEN Koerperzustands:
 *
 *   1. VERFORMUNG.  Die Orte stehen in Einheiten der halben Huellenausdehnung,
 *      und die wird jedes Bild aus `ctx.surface.positions` gemessen — und zwar
 *      im KOERPEREIGENEN Dreibein (Blickrichtung `s.fx/s.fz`, Querachse, Hoch-
 *      achse), nicht in Weltachsen.  Wird der Koerper flachgedrueckt, laufen
 *      die Blasen mit ihm auseinander; zieht er sich im Sprung in die Laenge,
 *      ruecken sie zusammen.  Kein Sonderfall dafuer, kein Ereignis, keine
 *      Aufprallzeit — es faellt aus der Messung heraus.
 *
 *   2. NACHLAUF.  Die Masse im Inneren bleibt zurueck, wenn der Koerper
 *      anfaehrt.  Verschiebung ENTGEGEN `b.vx/b.vz`, Betrag aus der Geschwin-
 *      digkeit gegen `params.maxSpeed`, je Blase mit eigenem Traegheitsgewicht
 *      (0.60 .. 1.45), damit sie nicht im Gleichschritt marschieren.  Das ist
 *      „traege mitschwimmen" aus dem Auftrag: kein Federmodell, keine
 *      Integration — der Versatz IST die Geschwindigkeit.
 *
 *   3. AUFTRIEB.  Faellt der Koerper (`b.vy < 0`), steigen die Blasen relativ
 *      dazu; beim Absprung sacken sie zurueck.  Dieselbe Formel, andere Achse.
 *
 * Weil alle drei aus dem Zustand kommen und nicht aus der Uhr, ergibt dieselbe
 * Aufnahme immer dieselben Bilder (GRAFIK-MODULE.md §4).
 *
 * ---------------------------------------------------------------------------
 * 3. WARUM ORDNUNG 54 — UND WIE DAS GESICHT GESCHUETZT WIRD
 * ---------------------------------------------------------------------------
 * 54 liegt im undurchsichtigen Block (bis 50 Boden/Kreaturen/Gesicht, 58 die
 * Gelrueckwand, 60 das Gel).  Eine Blase wird also normal und undurchsichtig
 * gezeichnet, schreibt Tiefe, und danach legt `gel.js` genau die Gelsaeule
 * darueber, die vor ihr steht.  Damit ist sie DRIN statt DAVOR — dieselbe
 * Mechanik, die den gefressenen Gegner in den Koerper legt (gel.js §3).
 * Die Gelrueckwand bei 58 ist ferner als jede Blase und verdeckt sie nicht.
 *
 * Die Auflage aus dem Auftrag lautet: „es darf nie vom Gesicht ablenken."
 * Das ist hier kein Regler, sondern eine BAUEIGENSCHAFT — zwei Schranken, die
 * `orteRechnen` NACH dem Nachlauf durchsetzt, damit sie nicht an der
 * Geschwindigkeit haengen:
 *
 *   TIEFE.  Der vorderste Punkt jeder Blase bleibt bei hoechstens 0.62 der
 *     halben Koerpertiefe.  Ordnung 45 setzt die Augen bei rund 0.86 und den
 *     Mund bei rund 0.93 ab, beide undurchsichtig und mit Tiefenschreiben.
 *     Zeigt das Gesicht zur Kamera, ist es damit IMMER naeher als jede Blase,
 *     gewinnt den Tiefentest, und die Blase kann es nicht ueberdecken.
 *   KEGEL.  Die Richtung vom Koerpermittelpunkt zur Blase bildet mit der
 *     Blickrichtung hoechstens 0.55 im Skalarprodukt (rund 57 Grad).  Die
 *     Augen liegen bei 0.79, der Mund bei 0.90 — die Blasen halten sich also
 *     auch seitlich aus dem Gesichtsfeld heraus, statt sich nur dahinter zu
 *     verstecken.
 *
 * Der ERSTE Entwurf ging weiter und verlangte `w < 0` fuer alle Blasen, also
 * strikt die rueckwaertige Halbkugel.  Das war beweisbar sicher und im Bild
 * wertlos: bei `dichte 1.62` und dem Absorptionsvektor von Eldoran-Blau steht
 * vor einer Blase auf der Gegenseite rund eine ganze Koerpertiefe Gel, und die
 * laesst nach Beer-Lambert im Rotkanal 0.3 % und im Blaukanal 32 % stehen.
 * Die Aufnahme `innen-v1` zeigte deshalb dasselbe Bild wie ohne Modul — pixel-
 * genau kein Unterschied am Koerper.  Die jetzige Fassung laesst die zwei
 * groessten Blasen in die vordere Haelfte (0.14 und 0.20 der halben Tiefe),
 * wo rund 0.4 Radiuslaengen Gel davor stehen und die Transmission bei
 * [0.28, 0.55, 0.78] liegt.  Die drei kleineren bleiben hinten und sind
 * schwach — das ist die Staffelung, die im Referenzmaterial die Tiefe traegt
 * (ref/slime/sr1-rest-yellow-depth-staggered.jpg).
 *
 * Dreht sich der Schleim, tauschen die Rollen: die hinteren Blasen kommen nach
 * vorn und werden lesbar, die vorderen versinken.  Es sind immer zwei bis drei
 * sichtbar, nie fuenf.
 *
 * Dritte Schranke, aus derselben Ueberlegung eine Stufe weiter: steckt gerade
 * ein Gegner im Koerper, treten die Blasen zurueck (`umschlungen(ctx)`).  In
 * diesem Moment IST der Gegner das, was man im Koerper sehen soll (GDD 01
 * §28), und fuenf Blasenraender, die durch ihn hindurchlaufen, zerschneiden
 * seine Form.  Bei voller Umschlingung bleiben die zwei groessten.
 *
 * ---------------------------------------------------------------------------
 * 4. WIE EINE BLASE AUSSIEHT
 * ---------------------------------------------------------------------------
 * Drei Tonstufen, keine vierte, alle drei aus `R.gel.farbe` abgeleitet (dort
 * ist die Fraktion — Eldoran blau, Ravok rot, GDD 01 §8 — und der Todeszustand
 * bereits eingerechnet; wer die Palette hier neu herleitet, baut die
 * Fraktionstabelle ein zweites Mal):
 *
 *   FUELLUNG  fast der Ton der duennen Zone (`farbe.klar`), also das, was das
 *             Gel an einer duennen Stelle ohnehin zeigt.  Nach Messung (b)
 *             absichtlich NUR knapp heller als die Umgebung — Zielwert der
 *             Ueberhoehung im fertigen Bild rund 1.1 : 1.
 *   OBERSEITE eine einzige harte Stufe auf der Lichtseite, Flanke 0.05 in
 *             N·L (rund 2 px auf einer Blase unserer Groesse).  §0: „Zwei bis
 *             drei Tonstufen je Oberflaeche, harte Schattenkante".
 *   RAND      die aeusseren 20 % des Radius, hell und ENTSAETTIGT.  Das ist
 *             die gemessene Zellnaht: 1.32 : 1 in der Helligkeit bei rund
 *             einem Zehntel der Saettigung.  Der Rand traegt die Form, nicht
 *             die Fuellung — dieselbe Aussage wie §0 „Silhouette traegt die
 *             Lesbarkeit", eine Ebene tiefer.
 *
 * Dazu die Aussparung im Gel: jede Blase wird ueber `R.gel.wunsch.einschluss`
 * angemeldet (gel.js nennt „Blase" ausdruecklich als vorgesehenen Fall).  Mit
 * kleiner `kraft` wird nur ein Teil der Gelsaeule vor ihr herausgerechnet —
 * sie bleibt verschleiert, aber sie ertrinkt nicht.  Als Zugabe legt der
 * Streifschnitt in gel.js von selbst einen schmalen Saum um sie: das
 * verdraengte Gel.  Genau der Saum, den die Messung als Zellnaht ausweist.
 *
 * ---------------------------------------------------------------------------
 * 5. WAS HIER ABSICHTLICH FEHLT
 * ---------------------------------------------------------------------------
 * Keine Partikelwolke, keine Schlierensimulation, kein Rauschen, keine Textur,
 * kein zweiter Blasenring, keine Brechung, keine Spiegelung.  Kostet ein
 * Baustein die Lesbarkeit der Verformung oder die Erkennbarkeit des Gesichts,
 * faellt der Baustein (GRAFIK-MODULE.md §6).  Fuenf Blasen sind die Obergrenze,
 * und `zahl` darf jederzeit auf 0 — dann ist dieses Modul rueckstandsfrei weg.
 * ======================================================================== */

(function () {

  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/innen.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* =====================================================================
   * Stellschrauben.  Vorgabewerte sind die gemessenen Werte aus §1, nicht
   * geratene Startpunkte.
   * =================================================================== */
  const P = {
    /* Wie viele Blasen ueberhaupt.  0 schaltet das Modul ab. */
    zahl: 5,
    /* Gemeinsamer Faktor auf alle Radien des Tisches. */
    groesse: 0.92,
    /* Wie weit die Fuellung von der Kernfarbe zur Farbe der duennen Zone
     * geschoben wird.  1 = ganz `farbe.klar`. */
    fuellung: 0.34,
    /* Die eine harte Stufe auf der Lichtseite: Lage in N·L und Flankenbreite. */
    kante: 0.16,
    flanke: 0.05,
    /* Wie hell die Oberseite gegen die Fuellung wird (Anteil Richtung Weiss). */
    oben: 0.10,
    /* Der Rand.  `randSitz` ist der Radiusanteil, ab dem er beginnt (0.80 =
     * aeussere 20 %, gemessene Nahtbreite), `randFlanke` seine Haerte,
     * `randWeiss` die Entsaettigung.
     *
     * `randWeiss = 1` heisst: der Rand ist WEISS.  Das sieht nach zu viel aus
     * und ist die Messung: die Zellnaht im Honigslime hat Saettigung 0.05
     * gegen 0.45 in der Fuellung, sie ist also der entsaettigte Teil und nicht
     * der hellere Farbton.  Im fertigen Bild bleibt davon wenig uebrig — das
     * Gel legt seinen Streuanteil additiv darueber und drueckt jeden Kontrast
     * im Koerper um rund den Faktor 10 zusammen.  Gemessen an innen-v7:
     * gezeichnete Leuchtdichte 1.00 gegen 0.63, im Bild L 72 gegen L 66.
     *
     * Zwischenstufe: die Versuche v7/v8 haben den Rand zusaetzlich ueber Weiss
     * hinaus verstaerkt (Faktor 2.2 bzw. 3.2).  Beide Aufnahmen sind
     * pixelgleich — das Farbziel ist RGBA8, alles ueber 1.0 wird beim
     * Schreiben abgeschnitten, und der Absorptionsdurchgang D2b multipliziert
     * danach den bereits abgeschnittenen Wert.  Ein Rand jenseits von Weiss
     * ist in diesem Pfad also nicht zu haben; wer mehr will, muesste additiv
     * NACH dem Gel aufsetzen — und das waere ein Glanzlicht, kein Einschluss. */
    randSitz: 0.80,
    randFlanke: 0.05,
    randWeiss: 1.00,
    randStaerke: 0.92,
    /* Wie stark die Gelsaeule vor einer Blase herausgerechnet wird.
     * 0 = voll verschleiert, 1 = nur noch die Frontschicht. */
    aussparung: 0.20,
    /* Nachlauf: Versatz entgegen der Bewegung, in halben Huellenbreiten bei
     * voller Geschwindigkeit. */
    nachlauf: 0.16,
    /* Auftrieb: Versatz entgegen der senkrechten Bewegung, in halben Huellen-
     * hoehen bei voller Fallgeschwindigkeit. */
    auftrieb: 0.10,
  };

  /* =====================================================================
   * Der Blasentisch.
   *
   * u = quer zur Blickrichtung, v = hoch, w = in Blickrichtung.  Alle Werte
   * in Einheiten der halben Huellenausdehnung der jeweiligen Achse, also
   * dimensionslos — die Groesse kommt ausschliesslich aus dem gemessenen
   * Koerper und damit aus dem Level (GDD 01 §8).
   *
   * ALLE w SIND NEGATIV.  Das ist die Zusicherung aus §3 und keine
   * Geschmacksfrage: sie ist der Grund, warum keine Blase je vor einem Auge
   * stehen kann.  Wer hier einen positiven Wert eintraegt, hebt sie auf.
   *
   * `r` ist der Radius in halben Huellenbreiten; der Durchmesser einer Blase
   * ist damit r-mal die Koerperbreite.  Der Tisch faechert 26 % bis 13 %
   * auf — die gemessene Zellweite reicht von 15 % bis 30 % (§1a), die zwei
   * grossen Blasen liegen also am oberen Rand des Gemessenen und die kleinen
   * darunter, damit die Staffelung Tiefe erzeugt statt einer Reihe gleicher
   * Kreise.
   *
   * `traeg` ist das Traegheitsgewicht fuer den Nachlauf (§2.2).
   *
   * Feste Zahlen, kein Zufall — dieselbe Aufnahme muss dieselben Bilder
   * ergeben (GRAFIK-MODULE.md §4).
   * =================================================================== */
  const BLASEN = [
    { u: -0.24, v:  0.08, w:  0.16, r: 0.26, traeg: 1.00 },
    { u:  0.21, v: -0.18, w:  0.11, r: 0.22, traeg: 0.78 },
    { u: -0.08, v: -0.27, w: -0.14, r: 0.19, traeg: 1.25 },
    { u:  0.27, v:  0.16, w: -0.24, r: 0.16, traeg: 0.60 },
    { u: -0.19, v:  0.27, w: -0.08, r: 0.13, traeg: 1.45 },
  ];

  /* Wie weit der RAND einer Blase vom Koerpermittelpunkt weg darf, in
   * Einheiten der halben Ausdehnung.
   *
   * Der erste Wert war 0.86 — „gerade noch innen".  Die Aufnahme `innen-v4`
   * hat gezeigt, warum das zu weit ist: waagerechter Schnitt bei y = 545,
   * linke Silhouettenkante, Helligkeit 140 ohne Blasen gegen 102 mit ihnen.
   * Am Rand ist die Gelsaeule kurz, dort scheint der helle Hintergrund
   * durch — und eine undurchsichtige Blase, die bis dorthin reicht, schneidet
   * ein DUNKLES Stueck aus genau der Kante, die laut GRAFIK-MODULE.md §0 die
   * Lesbarkeit traegt.  Dazu kommt die Frontschicht aus gel.js: ein
   * Einschluss hebt die Dicke am Streifschnitt auf mindestens 0.26
   * Radiuslaengen an, was den Rand ein zweites Mal abdunkelt.
   *
   * 0.60 laesst zwischen der aeussersten Blase und der Huelle mindestens
   * 0.40 halbe Ausdehnung Gel stehen.  Das haelt beide Wirkungen von der
   * Kante fern und macht die Blasen nebenbei sparsamer — sie sitzen in der
   * Masse statt an ihrer Schale. */
  const MAX_ABSTAND = 0.60;

  /* Die zwei Schranken aus §3, in Zahlen.
   *
   * VORNE: der vorderste Punkt einer Blase darf nie weiter nach vorn als
   * 0.62 der halben Koerpertiefe.  Ordnung 45 setzt die Augen bei rund 0.86
   * und den Mund bei rund 0.93 der Koerpertiefe ab — beide stehen damit
   * IMMER naeher an der Kamera, sobald das Gesicht zu ihr zeigt, und
   * gewinnen den Tiefentest.  Keine Blase kann ein Auge ueberdecken.
   *
   * KEGEL: der Richtungsvektor vom Koerpermittelpunkt zur Blase darf mit der
   * Blickrichtung hoechstens 0.55 im Skalarprodukt bilden (rund 57 Grad).
   * Die Augen liegen bei cos(0.60)·cos(0.30) = 0.79, der Mund bei 0.90 —
   * die Blasen sitzen also ausserhalb des Gesichtsfeldes und stehen ihm
   * auch seitlich nicht im Weg. */
  const MAX_VORNE = 0.62;
  const MAX_KEGEL = 0.55;

  const S = {
    bereit: false,
    prog: null,
    /* jedes Bild neu gemessen */
    mitte: [0, 1, 0],
    halbQuer: 1, halbHoch: 1, halbLaengs: 1,
    fx: 1, fz: 0,
    /* die fertigen Weltorte dieses Bildes: [x, y, z, r] je Blase */
    orte: [],
  };

  /* =====================================================================
   * Shader
   *
   * Die Kugel kommt als Einheitskugel (R.propMesh, Icosphere 2) herein und
   * wird im Vertexshader an ihren Ort geschoben.  Keine Modellmatrix, keine
   * Normalenmatrix: bei einer achsenparallelen Skalierung reicht die Division
   * der Normale durch dieselbe Skalierung, und der Rest waere nur Rechnung
   * ohne Aussage.
   * =================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
uniform vec3 uMitte;
uniform vec3 uSkal;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vec3 w = uMitte + aPos * uSkal;
  vPos = w;
  vNormal = aNormal / max(uSkal, vec3(1e-4));
  gl_Position = uViewProj * vec4(w, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNormal;

uniform vec3  uCam;
uniform vec3  uLicht;        // Richtung ZUR Sonne
uniform vec3  uFuell;        // Grundton der Blase
uniform vec3  uOben;         // die eine hellere Stufe auf der Lichtseite
uniform vec3  uRandFarbe;    // heller, entsaettigter Rand

uniform float uKante;        // Lage der harten Stufe in N·L
uniform float uFlanke;       // ihre halbe Breite
uniform float uRandSitz;     // Radiusanteil, ab dem der Rand beginnt
uniform float uRandFlanke;
uniform float uRandStaerke;

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  float ndl = dot(N, normalize(uLicht));
  float ndv = max(dot(N, V), 0.0);

  /* Zwei Tonstufen mit HARTER Kante.  Kein Verlauf ueber die Kugel — das
   * waere die fotografische Loesung derselben Aufgabe (GRAFIK-MODULE.md §0). */
  vec3 c = mix(uFuell, uOben, smoothstep(uKante - uFlanke, uKante + uFlanke, ndl));

  /* Der Rand.  Gerechnet wird im RADIUSANTEIL, nicht im Winkel: sin des
   * Blickwinkels ist genau der Abstand vom Blasenmittelpunkt in der Bild-
   * ebene, geteilt durch den Blasenradius.  Damit ist „aeussere 20 % des
   * Radius" wirklich das, was gemessen wurde — und die Randbreite haengt
   * nicht an der Kameradistanz. */
  float s = sqrt(max(1.0 - ndv * ndv, 0.0));
  float rand = smoothstep(uRandSitz - uRandFlanke, uRandSitz + uRandFlanke, s);
  c = mix(c, uRandFarbe, rand * uRandStaerke);

  outColor = vec4(c, 1.0);
}`;

  /* =====================================================================
   * Die Huelle vermessen — im koerpereigenen Dreibein, jedes Bild neu
   *
   * Nicht aus PARAMS abgeleitet und nicht in Weltachsen: nur im eigenen
   * Dreibein bedeutet „quer" auch dann quer, wenn der Schleim sich gedreht
   * hat, und nur aus den Punkten gemessen folgen die Blasen der Verformung.
   * =================================================================== */
  function huelleMessen(ctx) {
    const pos = ctx.surface && ctx.surface.positions;
    if (!pos || pos.length < 9) return false;

    const s = ctx.slime || {};
    let fx = s.fx, fz = s.fz;
    const fl = Math.hypot(fx || 0, fz || 0);
    if (!(fl > 1e-4)) { fx = 1; fz = 0; } else { fx /= fl; fz /= fl; }
    S.fx = fx; S.fz = fz;
    const qx = -fz, qz = fx;            // Querachse, Rechtssystem mit (0,1,0)

    const b = ctx.slime && ctx.slime.body;
    const mx = b ? b.cx : 0, mz = b ? b.cz : 0;

    let yMin = Infinity, yMax = -Infinity;
    let lMin = Infinity, lMax = -Infinity;   // laengs (Blickrichtung)
    let qMin = Infinity, qMax = -Infinity;   // quer
    for (let i = 0; i + 2 < pos.length; i += 3) {
      const dx = pos[i] - mx, y = pos[i + 1], dz = pos[i + 2] - mz;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
      const l = dx * fx + dz * fz;
      if (l < lMin) lMin = l;
      if (l > lMax) lMax = l;
      const q = dx * qx + dz * qz;
      if (q < qMin) qMin = q;
      if (q > qMax) qMax = q;
    }

    S.halbHoch   = Math.max((yMax - yMin) * 0.5, 1e-3);
    S.halbLaengs = Math.max((lMax - lMin) * 0.5, 1e-3);
    S.halbQuer   = Math.max((qMax - qMin) * 0.5, 1e-3);
    S.mitte = [
      mx + (lMin + lMax) * 0.5 * fx + (qMin + qMax) * 0.5 * qx,
      (yMin + yMax) * 0.5,
      mz + (lMin + lMax) * 0.5 * fz + (qMin + qMax) * 0.5 * qz,
    ];
    return true;
  }

  /* Wie weit gerade ein Gegner umschlungen ist, 0 .. 1.  Dieselbe Quelle, aus
   * der auch gel.js seinen Einschluss zieht — nur ueber `ctx.game` statt ueber
   * das Fressen-Global, weil der Vertrag ctx nennt. */
  function umschlungen(ctx) {
    const g = ctx.game;
    if (!g || !g.kreaturen) return 0;
    let m = 0;
    for (const k of g.kreaturen) {
      const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1);
      if (f <= 0.02) continue;
      const u = Math.max(k.umschlungen || 0, k.absorbiert ? 1 : 0);
      if (u > m) m = u;
    }
    return Math.min(Math.max(m, 0), 1);
  }

  /* =====================================================================
   * Die Orte rechnen — reine Funktion des jetzigen Koerperzustands
   * =================================================================== */
  function orteRechnen(ctx) {
    /* Steckt gerade ein Gegner im Koerper, treten die Blasen zurueck.  Der
     * Gegner IST in diesem Moment das, was man im Koerper sehen soll
     * (GDD 01 §28); die Blasen sind dann nur noch Beiwerk, das seine Form
     * zerschneidet.  Bei voller Umschlingung bleiben die zwei groessten.
     * Die Aufnahme `innen-nachher` von `umschlingung` #7 hat das gezeigt:
     * mit fuenf Blasen laufen ihre Raender durch den Wolf hindurch. */
    const rueck = 1 - 0.6 * umschlungen(ctx);
    const zahl = Math.max(0, Math.min(BLASEN.length, Math.round(P.zahl * rueck)));
    S.orte.length = 0;
    if (!zahl) return;

    const b = ctx.slime && ctx.slime.body;
    const params = ctx.params || {};
    const vRef = Math.max(params.maxSpeed || 6, 1e-3);

    /* Nachlauf und Auftrieb: der Versatz IST die Geschwindigkeit, keine ueber
     * Bilder fortgeschriebene Groesse.  Beides auf +-1 begrenzt, damit ein
     * Ausreisser in der Physik die Blasen nicht aus dem Koerper wirft. */
    const klemm = (x) => (x < -1 ? -1 : (x > 1 ? 1 : x));
    const vx = b ? klemm(b.vx / vRef) : 0;
    const vz = b ? klemm(b.vz / vRef) : 0;
    const vy = b ? klemm(b.vy / (vRef * 1.6)) : 0;

    const fx = S.fx, fz = S.fz;
    const qx = -fz, qz = fx;
    /* Die Bewegung im koerpereigenen Dreibein — sonst zoege der Nachlauf in
     * Weltrichtungen und der Koerper koennte sich unter ihm wegdrehen. */
    const vLaengs = vx * fx + vz * fz;
    const vQuer   = vx * qx + vz * qz;

    for (let i = 0; i < zahl; i++) {
      const B = BLASEN[i];
      let u = B.u - vQuer   * P.nachlauf * B.traeg;
      let w = B.w - vLaengs * P.nachlauf * B.traeg;
      let v = B.v - vy      * P.auftrieb * B.traeg;

      const r = B.r * P.groesse;

      /* Die zwei Zusicherungen aus §3 gelten auch NACH dem Nachlauf.  Der
       * Nachlauf darf eine Blase verschieben, aber er darf sie nicht vor die
       * Augen tragen — sonst haengt die Zusage an der Geschwindigkeit. */
      if (w + r > MAX_VORNE) w = MAX_VORNE - r;
      const laenge = Math.hypot(u, v, w);
      if (laenge > 1e-4 && w / laenge > MAX_KEGEL) {
        /* Zu nah an der Gesichtsachse: quer und hoch aufweiten, bis der
         * Kegel wieder frei ist.  Aufweiten statt zurueckziehen, damit die
         * Blase nicht in den Koerpermittelpunkt kriecht. */
        const quer = Math.hypot(u, v);
        const soll = Math.abs(w) * Math.sqrt(1 - MAX_KEGEL * MAX_KEGEL) / MAX_KEGEL;
        if (quer > 1e-4) {
          const k = soll / quer;
          u *= k; v *= k;
        } else {
          u = soll;
        }
      }

      /* Zuletzt innen halten.  Die Blase darf die Huelle nie durchstossen —
       * eine Blase, die aus der Silhouette schaut, ist ein Loch im Koerper.
       * Diese Klemme steht NACH der Kegelaufweitung, sonst koennte die
       * Aufweitung die Blase wieder hinausschieben. */
      const grenze = Math.max(MAX_ABSTAND - r, 0.05);
      const len = Math.hypot(u, v, w);
      if (len > grenze) {
        const k = grenze / len;
        u *= k; v *= k; w *= k;
      }

      S.orte.push([
        S.mitte[0] + (u * S.halbQuer) * qx + (w * S.halbLaengs) * fx,
        S.mitte[1] + v * S.halbHoch,
        S.mitte[2] + (u * S.halbQuer) * qz + (w * S.halbLaengs) * fz,
        r * S.halbQuer,
      ]);
    }
  }

  /* renderer2.js legt ctx.licht mit Nullvektoren an und ueberlaesst das
   * Fuellen licht.js.  Ein Nullvektor ist deshalb ein fehlender Wert. */
  const nimm = (v, vorgabe) =>
    (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;

  const mische = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  const WEISS = [1, 1, 1];

  /* Lebendigkeit: 1 im Normalfall, 0 in der Todespfuetze (GDD 01 §50) — dort
   * soll nichts mehr im Koerper blubbern.
   *
   * ABGELESEN WIRD AN DER FARBE, nicht am Glanz.  Der naheliegende Weg —
   * `gel.glanzStaerke / gel.regler.glanzStaerke`, so macht es glanz.js — ist
   * hier eine Falle: `glanz-anmeldung` setzt bei Ordnung 55 `wunsch.glanzMul
   * = 0`, gel.js rechnet das bei Ordnung 60 ein, und damit ist
   * `gel.glanzStaerke` in JEDEM Bild 0, ob tot oder nicht.  Der erste Entwurf
   * hat sich daran aufgehaengt und gar keine Blase gezeichnet.
   *
   * Die Farbe traegt denselben Zustand ohne diese Nebenwirkung: gel.js
   * skaliert `klar` in der Pfuetze auf das 0.30-fache der Fraktionsfarbe
   * (TOT.klar), und beide Groessen sind ueber `gel.farbe` und `gel.palette`
   * veroeffentlicht. */
  const TOT_KLAR = 0.30;
  function lebendig(gel, ctx) {
    const f = gel && gel.farbe && gel.farbe.klar;
    const pal = gel && gel.palette;
    const name = (ctx && ctx.faction) || 'eldoran';
    const grund = pal && (pal[name] || pal.eldoran);
    if (!f || !grund || !grund.klar || !(grund.klar[1] > 1e-4)) return 1;
    const anteil = f[1] / grund.klar[1];          // 1 lebendig, 0.30 tot
    const tot = (1 - anteil) / (1 - TOT_KLAR);
    return Math.min(Math.max(1 - tot, 0), 1);
  }

  /* =====================================================================
   * Anmeldung
   * =================================================================== */
  G.modul({
    name: 'innen',
    ordnung: 54,

    regler: [
      { key: 'zahl', min: 0, max: 5, step: 1, wert: P.zahl },
      { key: 'groesse', min: 0.4, max: 2.0, step: 0.02, wert: P.groesse },
      { key: "fuellung", min: 0.0, max: 1.0, step: 0.02, wert: P.fuellung },
      { key: 'kante', min: -0.4, max: 0.8, step: 0.01, wert: P.kante },
      { key: 'flanke', min: 0.01, max: 0.30, step: 0.005, wert: P.flanke },
      { key: 'oben', min: 0.0, max: 0.6, step: 0.01, wert: P.oben },
      { key: 'randSitz', min: 0.40, max: 0.98, step: 0.01, wert: P.randSitz },
      { key: 'randFlanke', min: 0.01, max: 0.30, step: 0.005, wert: P.randFlanke },
      { key: 'randWeiss', min: 0.0, max: 1.0, step: 0.02, wert: P.randWeiss },
      { key: 'randStaerke', min: 0.0, max: 1.0, step: 0.02, wert: P.randStaerke },
      { key: 'aussparung', min: 0.0, max: 1.0, step: 0.02, wert: P.aussparung },
      { key: 'nachlauf', min: 0.0, max: 0.6, step: 0.01, wert: P.nachlauf },
      { key: 'auftrieb', min: 0.0, max: 0.6, step: 0.01, wert: P.auftrieb },
    ],

    aufbau(gl, R) {
      S.prog = G.programm(gl, VS, FS, 'schleim/innen');
      S.bereit = true;
    },

    /* Laeuft vor dem `vorbereiten` von gel.js (Ordnung 60) — nur deshalb kann
     * der Wunschzettel hier noch gefuellt werden (gel.js §6). */
    vorbereiten(gl, R, ctx) {
      if (!S.bereit) return;
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];

      S.orte.length = 0;
      if (!huelleMessen(ctx)) return;

      const gel = R.gel || G.gel;
      const leben = lebendig(gel, ctx);
      if (leben <= 0.02) return;        // Todespfuetze: gar keine Blasen

      orteRechnen(ctx);

      /* Aussparung anmelden.  Ohne sie multipliziert der Absorptionsdurchgang
       * D2b die volle Gelsaeule auf die Blase und sie verschwindet in der
       * Koerpermitte — dort, wo sie gebraucht wird.  Mit kleiner `kraft`
       * bleibt sie verschleiert, aber lesbar; den schmalen Saum ringsum legt
       * gel.js von selbst dazu (Streifschnitt). */
      if (gel && gel.wunsch && P.aussparung > 0) {
        const kraft = P.aussparung * leben;
        for (const o of S.orte) {
          gel.wunsch.einschluss.push({ pos: [o[0], o[1], o[2]], r: o[3], kraft });
        }
      }
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit || !S.orte.length) return;
      const mesh = R.propMesh;
      if (!mesh || !mesh.vao) return;
      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      /* Farben aus dem Materialkern — Fraktion und Todeszustand sind dort
       * schon aufgeloest (gel.js §6).  Fehlt gel.js, tut es die Fraktions-
       * palette aus ctx.pal, damit dieses Modul allein nicht schwarz wird. */
      const gel = R.gel || G.gel;
      const f = gel && gel.farbe;
      const klar = (f && f.klar) || (ctx.pal && ctx.pal.light) || [0.6, 0.85, 1.0];
      const kern = (f && f.kern) || (ctx.pal && ctx.pal.mid) || [0.2, 0.6, 1.0];

      const fuell = mische(kern, klar, P.fuellung);
      const oben = mische(fuell, WEISS, P.oben);
      const randFarbe = mische(klar, WEISS, P.randWeiss);

      const licht = ctx.licht || {};
      const richtung = nimm(licht.richtung, nimm(R.light, [0.55, 0.78, 0.32]));

      const p = S.prog;
      const u = p.u || {};
      gl.useProgram(p);
      gl.bindVertexArray(mesh.vao);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform3fv(u.uLicht, richtung);
      gl.uniform3fv(u.uFuell, fuell);
      gl.uniform3fv(u.uOben, oben);
      gl.uniform3fv(u.uRandFarbe, randFarbe);
      gl.uniform1f(u.uKante, P.kante);
      gl.uniform1f(u.uFlanke, P.flanke);
      gl.uniform1f(u.uRandSitz, P.randSitz);
      gl.uniform1f(u.uRandFlanke, P.randFlanke);
      gl.uniform1f(u.uRandStaerke, P.randStaerke);

      /* Undurchsichtig und mit Tiefenschreiben — genau wie alles im Block bis
       * 58.  Nur so legt sich das Gel danach darueber, statt sich mit der
       * Blase zu vermischen. */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      /* Die Blasen bleiben Kugeln.  Nur die Hoehe folgt der Stauchung des
       * Koerpers ein Stueck weit mit — eine flachgedrueckte Masse hat flachere
       * Einschluesse.  Voll mitzustauchen waere zu viel: dann werden aus
       * Blasen Striche, und Striche liest das Auge als Kratzer im Material. */
      const stauch = Math.max(Math.min(S.halbHoch / Math.max(S.halbQuer, 1e-4), 1.6), 0.35);
      const hoehe = 1 + (stauch - 1) * 0.5;

      for (const o of S.orte) {
        gl.uniform3f(u.uMitte, o[0], o[1], o[2]);
        gl.uniform3f(u.uSkal, o[3], o[3] * hoehe, o[3]);
        gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);
      }

      gl.bindVertexArray(null);
    },
  });

})();
