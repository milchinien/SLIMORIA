'use strict';
/* ---------------------------------------------------------------------------
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * grafik/schleim/kontakt.js — die Kontaktzone am Boden.
 *
 * Nur im zweiten Renderpfad aktiv (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt.
 *
 * ===========================================================================
 * 0. Das Problem in einem Satz
 * ===========================================================================
 *
 * Der Schleim SCHWEBT. Nicht weil die Physik ihn falsch stellt — sie stellt
 * ihn richtig —, sondern weil an der Stelle, wo er den Boden beruehrt, nichts
 * passiert. Ein Koerper ohne Kontaktzone ist ein Aufkleber. Der Schlagschatten
 * aus `schatten.js` hilft dagegen nicht: er liegt versetzt zur Lichtrichtung,
 * er ist weich, und er sagt nur „hier steht etwas im Weg", nicht „hier liegt
 * etwas AUF".
 *
 * Was fehlt, ist der Saum: die schmale Zone, in der eine weiche klebrige Masse
 * den Boden beruehrt. Sie besteht aus drei Dingen, in dieser Reihenfolge von
 * innen nach aussen — und genau diese Reihenfolge ist im Referenzmaterial
 * messbar:
 *
 *     Koerper | duenner heller Meniskus | dunkler Kern | Auslauf | freier Boden
 *
 * ===========================================================================
 * 1. Die Messung — woher jede Zahl in diesem Modul stammt
 * ===========================================================================
 *
 * Drei senkrechte Schnitte durch die Kontaktstelle dreier ruhender Slimes,
 * jeweils Rohpixel, Helligkeit L = 0.2126 R + 0.7152 G + 0.0722 B.
 *
 * ---------------------------------------------------------------------------
 * (A) `ref/slime/sr1-rest-single-pink-silhouette.jpg` — rosa Slime auf glattem
 *     orangem Boden, volles Tageslicht. Koerper-Bounding-Box 1284,718,221,225
 *     (dieselbe Box, aus der DOSSIER §7 und `schleim/glanz.js` ihre Zahlen
 *     ziehen). Spalte x = 1430, von oben nach unten:
 *
 *       y 900..940   Koerperunterseite        L  38 -> 79
 *       y 941..942   MENISKUS                 L  97 -> 117   <- 2 px, hell
 *       y 943        Uebergang                L  92
 *       y 944        dunkelster Punkt         L  53   RGB  91, 44, 24
 *       y 950                                 L 102
 *       y 960                                 L 129
 *       y 978..1000  freier Boden             L 147..153   RGB 255,128,53
 *
 *       Saumtiefe am Kontakt   53 / 150 = 0.35   (65 % Abdunklung)
 *       Kanalweise             R 0.357  G 0.344  B 0.453  -> B faellt am wenigsten
 *       Saumbreite bis 95 %    944 -> 978 = 34 px = 15.4 % der Koerperbreite
 *       Meniskus               2 px = 0.9 % der Koerperbreite, x1.48 gegen die
 *                              Koerperunterseite, x2.2 gegen den Kern darunter
 *
 * ---------------------------------------------------------------------------
 * (B) `ref/slime/sr1-flat-white-slimes-grass.jpg` — flachgedrueckter weisser
 *     Slime auf Gras, Koerper rund 205 px breit. Spalte x = 450:
 *
 *       y 707..725   Koerperunterseite        L 155..178
 *       y 726..729   MENISKUS                 L 187 -> 253   <- 3..4 px
 *       y 733..740   Absturz                  L 143 -> 76
 *       y 744..752   dunkelster Kern          L  70   RGB 26, 84, 62
 *       y 755..800   freies Gras              L 113..127  RGB 67,139,73
 *
 *       Saumtiefe              70 / 118 = 0.59   (41 % Abdunklung)
 *       Kanalweise             R 0.39  G 0.60  B 0.85  -> R faellt am staerksten
 *       Meniskus               3.5 px = 1.7 % der Koerperbreite, x1.45 gegen
 *                              die Unterseite, x3.3 gegen den Kern
 *
 * ---------------------------------------------------------------------------
 * (C) `ref/slime/sr2-rest-domes-reef-flattened.jpg` — blauer Slime auf hellem
 *     Sand, Spalte x = 275:
 *
 *       y 1008..1010 MENISKUS/Absturz         L 116 -> 98 -> 83
 *       y 1021..1030 dunkelster Kern          L  70   RGB 58, 68, 119
 *       y 1070..1075 freier Boden             L  91..98
 *
 *       Saumtiefe              70 / 117 = 0.60
 *     Und derselbe Bildinhalt am kleinen rosa Slime rechts (Spalte 1820):
 *       Meniskus L 129..146 gegen Koerper 118 und Kern 114 — 3 px, x1.24.
 *
 * ---------------------------------------------------------------------------
 * (D) Seitliche Ausdehnung, ohne perspektivische Stauchung gemessen: die
 *     halbe Breite der Dunkelzone gegen die halbe Breite des Koerpers.
 *       (A) rosa   70 px gegen 110 px  = 0.64
 *       (B) weiss  68 px gegen  86 px  = 0.79
 *     Und DOSSIER §1: die Koerperbreite faellt zum Boden hin auf 0.78 (bei
 *     85 % Hoehe), 0.64 (90 %), 0.48 (95 %), 0.12 (100 %).
 *
 * ---------------------------------------------------------------------------
 * DARAUS DIE VIER ZAHLEN DIESES MODULS
 *
 *   Auflageradius   = groesster Radius im UNTERSTEN Hoehenband der Huelle.
 *                     Bandhoehe 7 % der Koerperhoehe. Nach DOSSIER §1 liegt
 *                     die Breite bei 93 % Hoehe um 0.55 der vollen Breite;
 *                     zusammen mit der Saumbreite ergibt das eine Dunkelzone
 *                     von rund 0.80 der halben Koerperbreite und trifft damit
 *                     den gemessenen Bereich 0.64..0.79 aus (D).
 *                     (Erste Fassung: 14 %. Das ergab 0.77 allein fuer die
 *                     Auflage, und mit dem Saum darum einen Teller, der
 *                     seitlich weiter reichte als der Koerper.)
 *   Saumbreite      = 0.34 x RUHERADIUS (PARAMS.radius), nicht x Auflage-
 *                     radius. Aus (A): 15.4 % der Koerperbreite = 0.31 x
 *                     halbe Koerperbreite, und die halbe Koerperbreite in
 *                     Ruhe IST der Ruheradius. Warum nicht am Auflageradius:
 *                     siehe die Begruendung am Regler `breite`.
 *   Saumtiefe       = 0.42 Abdunklung, also 0.58 Resthelligkeit. Gemessen
 *                     0.35 (A, Erde) / 0.59 (B, Gras) / 0.60 (C, Sand);
 *                     massgeblich ist (B), weil unsere Arena eine besonnte
 *                     Wiese ist. Siehe den Regler "tiefe" — der Saum liegt
 *                     nicht allein auf dem Boden.
 *   Meniskusbreite  = 3.5 Bildschirmpixel. Gemessen 0.9 / 1.7 / 2.0 % der
 *                     Koerperbreite; bei unserer Zielgroesse (DOSSIER §12:
 *                     Koerperhoehe 72..108 px, Breite rund 250 px) sind das
 *                     2.3..5 px.
 *
 * ===========================================================================
 * 2. Warum der Saum aus der HUELLE kommt und nicht aus einem Radius
 * ===========================================================================
 *
 * Der Auftrag verlangt: „Er muss mitwachsen und mitschrumpfen: beim Aufprall
 * breit, beim Abheben weg."
 *
 * Ein Kreis mit `PARAMS.radius` kann das nicht — er ist immer gleich gross.
 * Ein Kreis mit einem aus der Aufprallzeit abgeleiteten Radius koennte es,
 * aber dann haengt die Grafik an einem Ereignis, und jede Ungenauigkeit im
 * Zeitpunkt wird als Ruckeln sichtbar.
 *
 * Hier wird statt dessen jedes Bild die tatsaechliche Huelle vermessen:
 *
 *   1. Tiefster Punkt yMin und Gesamthoehe der Huelle.
 *   2. Alle Punkte im untersten Band (14 % der Hoehe) werden in 32
 *      Winkelfaecher sortiert; je Faecher der groesste waagerechte Abstand
 *      zum Schwerpunkt dieser Punkte. Das ergibt den Umriss der Auflage —
 *      keinen Kreis, sondern die echte, verformte Form.
 *   3. Der Umriss wird zirkulaer geglaettet (3-Punkt), sonst zappelt die
 *      Faechergrenze bei drehendem Koerper.
 *
 * Was daraus von selbst folgt, ohne eine einzige Fallunterscheidung:
 *
 *   Aufprall     Der Koerper wird zur Scheibe. Das unterste Band ist dann
 *                fast so breit wie der ganze Koerper, und der ist breiter als
 *                in Ruhe. Der Saum waechst doppelt.
 *   Ruhe         Kuppel. Das unterste Band ist rund 0.72 der vollen Breite.
 *   Strecken     Tropfenform nach oben. Das unterste Band ist schmal, der
 *                Saum zieht sich zusammen.
 *   Abheben      yMin steigt ueber die Bodenebene. `naehe` faellt ueber eine
 *                halbe Koerperhoehe auf 0 — Saum und Meniskus verschwinden,
 *                der Schlagschatten aus `schatten.js` bleibt und traegt
 *                allein die Hoehenlesbarkeit (DOSSIER §7: „Fliegende Slimes
 *                werfen einen GETRENNTEN Schatten am Boden").
 *   Schieflage   Der Umriss ist nicht kreisrund, sondern folgt der Huelle.
 *
 * Kein `Math.random`, kein `Date`, kein `ctx.time` — der Saum bewegt sich
 * ausschliesslich, weil der Koerper sich bewegt (GRAFIK-MODULE.md §4).
 *
 * ===========================================================================
 * 3. Warum zwei Tonstufen und eine Pixelkante — und nicht ein weicher Verlauf
 * ===========================================================================
 *
 * GRAFIK-MODULE.md §0 ist eindeutig: „Zwei bis drei Tonstufen je Oberflaeche",
 * „harte Schattenkante, Flanke etwa 2 px", verboten ist der „weiche
 * Halbschatten". Ein physikalisch korrekter Kontaktschatten ist aber ein
 * stetiger Verlauf — und sieht genau deshalb nach Kamera aus.
 *
 * Die Aufloesung: die GEMESSENE Kurve wird auf zwei Plateaus quantisiert.
 *
 *     t = Abstand zur Auflagekante / Saumbreite
 *
 *     t < 0.40   voller Saum          (Messung A: t=0.18 -> 0.35 der Helligkeit)
 *     t < 1.00   45 % davon           (Messung A: t=0.60 -> 0.72 der Helligkeit)
 *     t > 1.00   nichts
 *
 * Die Uebergaenge sind ueber `fwidth` genau EINE Bildschirmpixelbreite breit —
 * derselbe Kunstgriff wie bei der Glanzstufe in PHASE-GRAFIK-PLAN G4. Damit
 * ist die Kante optisch hart, flimmert aber nicht, und sie bleibt in jeder
 * Entfernung gleich schmal, statt aus der Naehe zu verwaschen.
 *
 * Das „leicht ausgelaufen" aus dem Auftrag steckt in der ZWEITEN Stufe: der
 * Saum endet nicht an seiner harten Kante, sondern hat einen halb so tiefen
 * Hof um sich. Zwei Stufen, nicht eine — das ist der Unterschied zwischen
 * einer Masse, die auf dem Boden liegt, und einer aufgeklebten Scheibe.
 *
 * ===========================================================================
 * 4. Die Farbe des Saums
 * ===========================================================================
 *
 * Abgedunkelt wird MULTIPLIKATIV und KANALWEISE, nicht mit Grau ueberblendet.
 * Ein Kontaktschatten wird vom Himmel beleuchtet, und der ist blaeulich:
 *
 *   Messung (B), Gras:     R 0.39  G 0.60  B 0.85   -> Abfall (1.00, 0.66, 0.25)
 *   Messung (A), Erde:     R 0.36  G 0.34  B 0.45   -> Abfall (0.98, 1.00, 0.83)
 *
 * Beide sagen dasselbe: BLAU faellt am wenigsten. Rot und Gruen liegen je nach
 * Untergrund verschieden, weil der jeweils gesaettigte Kanal weniger Spielraum
 * hat. Gemittelt und auf das Maximum normiert: (1.00, 0.94, 0.76).
 *
 * Das ist derselbe Befund und fast derselbe Vektor wie in `grafik/boden.js`
 * fuer das ortsfeste Kontaktband der Felsen — `vec3(1.00, 0.92, 0.78)`. Das
 * ist Absicht: der Saum unter dem Schleim und der Saum unter einem Stein
 * duerfen nicht aus zwei verschiedenen Welten stammen.
 *
 * Der Meniskus dagegen wird ADDIERT und traegt die Farbe des Koerpers mit:
 * gemessen ist er beim rosa Slime rosa (246,79,109), beim weissen weiss
 * (246,255,255), beim Riff-Slime warm (251,118,119). Er ist kein Glanzlicht
 * auf dem Boden, sondern das duenne Gel, das an der Kante hochkriecht und
 * von unten durchleuchtet wird. Deshalb `mix(Sonnenfarbe, Gelfarbe klar,
 * 0.45)`.
 *
 * ===========================================================================
 * 5. Wo das Modul in der Reihenfolge steht — und warum genau dort
 * ===========================================================================
 *
 * Ordnung 55. Davor liegt alles Undurchsichtige, das der Saum verdunkeln
 * soll: Boden (20), Bodenschatten (26), Gras (25), Hindernisse (30),
 * Kreaturen (40), Dekale (50). Danach kommen Gelrueckwand (58) und Gel (60).
 *
 * Vor 58 ist zwingend. Der Saum liegt teilweise UNTER dem Koerper, und der
 * Koerper ist durchscheinend — man sieht die dunkle Zone durch das Gel
 * hindurch, und genau das ist es, was die Masse auf den Boden setzt. Laege
 * das Modul hinter dem Gel, malte es seinen Saum ueber den Koerper.
 *
 * Nach 50 ist ebenso zwingend: die Schleimspur (Dekale) gehoert unter den
 * Saum, nicht darueber.
 *
 * Gezeichnet wird in zwei Durchgaengen auf demselben Quad:
 *   K1  `blendFunc(ZERO, SRC_COLOR)`  — der Boden wird kanalweise gedimmt.
 *   K2  `blendFunc(ONE, ONE)`         — der Meniskus kommt als Licht dazu.
 * Zwei Durchgaenge, weil eine Mischfunktion nicht gleichzeitig kanalweise
 * multiplizieren und addieren kann. Beide zeichnen dasselbe kleine Quad,
 * beide ohne Tiefenschreiben.
 *
 * ===========================================================================
 * 6. Was der Meniskus hier leisten kann — und was nicht
 * ===========================================================================
 *
 * Ehrlich, weil es sonst der naechste noch einmal falsch baut.
 *
 * Die helle Linie im Referenzmaterial gehoert nicht dem Boden, sondern der
 * UNTERKANTE DES KOERPERS: duennes Gel, von unten durchleuchtet. DOSSIER §7
 * misst dasselbe als „Bodenaufhellung 1.33 x an der Unterkante".
 *
 * Auf dem Boden gezeichnet sitzt sie am Auflagerand — und der liegt aus der
 * Spielkamera (Nickwinkel 0.12..0.40) bei einem ruhenden Koerper HINTER dem
 * Koerper. Nachgemessen an `wabbeln` Bild #10, Spalte 800: der sichtbare
 * Boden faengt bei y = 621 an, der Auflagerand liegt darueber. Die Linie ist
 * dort also verdeckt.
 *
 * Was statt dessen im Bild steht, und zwar genau in der gemessenen Ordnung:
 *
 *   y 620   L 151   helle Unterkante — die faellt gel.js zu (Fresnel-Rand)
 *   y 628   L  96   dunkelster Kern  — dieses Modul
 *   Verhaeltnis 1.57 : 1. Referenz: 2.2 (A) / 3.3 (B) / 1.24 (C).
 *
 * Der Meniskus entsteht also aus ZWEI Modulen: gel.js liefert die helle
 * Kante, dieses Modul den dunklen Kern darunter. Ohne den Kern ist die helle
 * Kante nur ein Rand; mit ihm wird sie zum Meniskus. Der eigene additive
 * Durchgang K2 traegt dort bei, wo der Auflagerand tatsaechlich frei liegt:
 * beim flachgedrueckten Koerper und bei steilerer Kamera.
 *
 * Ein Modul, das die Linie IMMER zeigen will, muss sie am Koerper zeichnen,
 * nicht am Boden — also in gel.js oder in einem Aufsatz mit Ordnung > 60.
 * Das ist eine andere Datei und ein anderer Auftrag.
 *
 * ===========================================================================
 * 7. Drei Fehler, die im Bild standen, bevor die Zahlen oben da waren
 * ===========================================================================
 *
 * Damit sie niemand wieder einbaut:
 *
 *  1. SAUM ALS TELLER. Saumbreite als Vielfaches des Auflageradius plus
 *     harte Aussenkante: beim Aufprall (Auflage fast so breit wie der
 *     Koerper) wuchs daraus eine graue Scheibe mit gezeichnetem Rand, rund
 *     1.5 x so breit wie der Koerper. Behoben durch Bezug auf den Ruheradius
 *     und eine 3 px breite Aussenflanke.
 *  2. QUADKANTE DURCH DEN KOERPER. Ein konstanter Dunkelwert unter der
 *     ganzen Auflage (statt eines Rings) faerbt das Quad flaechig ein. Der
 *     Koerper ist durchscheinend — man sah die gerade Kante des Quads quer
 *     durch ihn laufen, und er sackte um rund 40 % ab. Behoben, indem der
 *     Saum nach innen auf null auslaeuft und das Fragment dort verworfen wird.
 *  3. REIFEN IN DER LUFT. Ausblenden allein ueber yMin gegen y = 0 und ueber
 *     eine halbe Koerperhoehe: bei `aufprall` Bild #12 stand noch ein halber
 *     Ring am Boden, waehrend der Koerper 1.7 Radien darueber flog. Behoben
 *     ueber `b.grounded` plus Abstand zur letzten Kontakthoehe.
 * ------------------------------------------------------------------------- */

(function () {

  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/kontakt.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* Zahl der Winkelfaecher des Auflageumrisses. 32 ist der Punkt, an dem der
   * Umriss aufhoert, als Vieleck lesbar zu sein: bei einem Koerper von 250 px
   * Bildbreite ist eine Faechersehne rund 25 px lang und liegt hinter einer
   * Kante, die selbst nur 1 px breit ist. Mehr Faecher kosten Uniformplaetze,
   * weniger sieht man. */
  const FAECHER = 32;

  /* Bodenebene. renderer2.js zeichnet den Boden als Ebene y = 0 (boden.js
   * rechnet seine Fussabdruecke ausdruecklich gegen y = 0), die Bodendekale
   * liegen bei y = 0.012. Der Saum liegt einen Hauch darueber, damit er die
   * Schleimspur ueberdeckt statt mit ihr um dieselbe Tiefe zu streiten. */
  const BODEN_Y = 0.0;
  const HUB = 0.013;

  const P = {
    /* Hoehe des Bandes, aus dem der Auflageumriss gemessen wird, als Anteil
     * der Koerperhoehe. 0.07 trifft DOSSIER 1 (Breite bei 93 % Hoehe rund
     * 0.55 der vollen Breite); zusammen mit dem Saum darum liegt die ganze
     * Dunkelzone bei rund 0.80 der halben Koerperbreite und damit im
     * gemessenen Bereich 0.64..0.79. */
    band: 0.07,
    /* Breite des Saums als Vielfaches des RUHERADIUS (PARAMS.radius), nicht
     * des Auflageradius.
     *
     * Das ist eine bewusste Abweichung von der ersten Fassung, und der Grund
     * stand im Bild: beim Aufprall ist der Koerper eine Scheibe, das unterste
     * Hoehenband deckt dann fast den ganzen Umriss, und ein Saum von 60 % DES
     * AUFLAGERADIUS wuchs auf das Anderthalbfache der Koerperbreite an — ein
     * Kanaldeckel mit hartem Rand.
     *
     * Richtig ist: der RING waechst mit der Auflage (das verlangt der
     * Auftrag), seine DICKE nicht. Wie weit eine klebrige Masse den Boden
     * benetzt, haengt am Stoff, nicht daran, wie breit sie gerade liegt.
     *
     * 0.30 x Ruheradius trifft die Messung: Saumbreite (A) 15.4 % der
     * Koerperbreite = 0.31 x halbe Koerperbreite, und die halbe Koerperbreite
     * in Ruhe IST der Ruheradius. */
    breite: 0.34,
    /* Tiefe der Abdunklung am Kontakt.
     *
     * Gemessen sind drei Resthelligkeiten: 0.35 (A, rosa auf trockener
     * Erde, harte Sonne), 0.59 (B, weiss auf GRAS bei Tageslicht) und 0.60
     * (C, blau auf hellem Sand). Massgeblich fuer uns ist (B): unsere Arena
     * ist eine besonnte Wiese, und der Untergrund entscheidet, wieviel
     * Himmelslicht in die Kontaktzone zurueckfaellt. 0.42 Abdunklung heisst
     * 0.58 Resthelligkeit und trifft (B) und (C).
     *
     * Ausserdem liegt dieser Saum nicht allein: `schatten.js` legt seinen
     * Schlagschatten auf dieselbe Flaeche, und seit kurzem auch
     * `schleim/schattenform.js`. Die drei multiplizieren sich. Gemessen an
     * `wabbeln` Bild #10, Spalte 800: freier Boden L = 192, Schlagschatten
     * allein L = 160, mit diesem Saum L = 78. Wer den Wert hier anhebt,
     * hebt ihn auf einen bereits abgedunkelten Grund. */
    tiefe: 0.42,
    /* Ende der ersten Tonstufe, in Saumbreiten. */
    stufe: 0.40,
    /* Tiefe der zweiten Stufe als Anteil der ersten. */
    stufeAussen: 0.38,
    /* Wie weit der Saum nach INNEN reicht, in Saumbreiten. Er laeuft dort auf
     * null aus: unter der Auflage ist kein Saum mehr, sondern Verdeckung —
     * und die besorgt der Koerper selbst. Siehe Shader. */
    innen: 1.00,
    /* Breite des Meniskus in Bildschirmpixeln. Messung: 2..4 px. */
    meniskusPx: 3.5,
    /* Staerke des Meniskus, additiv. */
    meniskus: 0.45,
    /* Ueber welchen Anteil des RUHERADIUS der Saum nach dem Abloesen
     * ausgeht. Gemessen wird ab der Hoehe, auf der der Koerper zuletzt
     * Bodenkontakt hatte — siehe huelleMessen(). */
    abheben: 0.25,
  };

  const S = {
    bereit: false,
    prog: null,
    /* gemessener Auflageumriss, ein Radius je Faecher */
    rand: new Float32Array(FAECHER),
    mitte: [0, 0],          // xz-Schwerpunkt des Kontaktbandes
    rMax: 0,
    rMittel: 0,
    naehe: 0,               // 1 = liegt auf, 0 = abgehoben
    gueltig: false,
    /* Hoehe des tiefsten Huellpunktes beim letzten echten Bodenkontakt.
     * Bezugswert fuer das Ausblenden beim Abheben — siehe huelleMessen(). */
    bodenBezug: 0,
    /* Streubehaelter fuer die Messung, einmal angelegt statt je Bild */
    summe: new Float32Array(FAECHER),
    zahl: new Int32Array(FAECHER),
    glatt: new Float32Array(FAECHER),
  };

  /* =====================================================================
   * Shader
   * =================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;      // Einheitsquad in der xz-Ebene, -1..1

uniform mat4  uViewProj;
uniform vec2  uMitte;                   // Schwerpunkt der Auflage, Weltkoordinate
uniform float uGroesse;                 // halbe Kantenlaenge des Quads
uniform float uHub;                     // Hoehe ueber der Bodenebene

out vec2 vRel;                          // Lage relativ zum Auflagemittelpunkt

void main() {
  vec2 xz = uMitte + aPos.xz * uGroesse;
  vRel = xz - uMitte;
  gl_Position = uViewProj * vec4(xz.x, uHub, xz.y, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec2 vRel;

uniform float uRand[` + FAECHER + `];   // Auflageumriss, Radius je Winkelfaecher
uniform float uBreite;                  // Saumbreite in Metern
uniform float uTiefe;
uniform float uStufe;
uniform float uStufeAussen;
uniform float uInnen;
uniform vec3  uAbfall;                  // kanalweiser Anteil der Abdunklung
uniform float uMeniskusPx;              // Meniskusbreite in BILDSCHIRMPIXELN
uniform float uMeniskus;
uniform vec3  uMeniskusFarbe;
uniform float uNaehe;                   // 1 = liegt auf, 0 = abgehoben
uniform int   uModus;                   // 0 = abdunkeln, 1 = Meniskus

out vec4 outColor;

const float PI = 3.14159265359;
const float N  = ` + FAECHER + `.0;

/* Auflageradius in Blickrichtung w. Die Faecher stehen auf ihren MITTEN,
 * deshalb der Versatz um -0.5: sonst faellt die Naht zwischen zwei Faechern
 * mit dem Faecherrand zusammen und der Umriss bekommt Ecken, wo er glatt
 * sein sollte. */
float umriss(float w) {
  float f = (w + PI) / (2.0 * PI) * N - 0.5;
  float i = floor(f);
  float t = f - i;
  int a = int(mod(i, N));
  int b = int(mod(i + 1.0, N));
  return mix(uRand[a], uRand[b], t);
}

void main() {
  float l = length(vRel);
  float r = umriss(atan(vRel.y, vRel.x));

  /* Abstand zur Auflagekante, in Saumbreiten. 0 = auf der Kante,
   * 1 = am aeusseren Rand des Saums, negativ = unter dem Koerper. */
  float t = (l - r) / max(uBreite, 1e-4);

  /* Eine Bildschirmpixelbreite, in derselben Einheit ausgedrueckt. Geklemmt,
   * weil umriss() an den Faechernaehten einen Knick hat und fwidth dort
   * sonst einen Ausreisser liefert, der als heller Speichenstern sichtbar
   * waere. */
  float px = clamp(fwidth(t), 0.002, 0.20);

  /* Fuer den Meniskus wird dieselbe Groesse SCHAERFER geklemmt. Grund: die
   * Bodenebene steht zur Kamera streifend, und ein Bildschirmpixel deckt dort
   * ein Vielfaches der Saumbreite ab. Ohne die engere Klemme waechst die
   * 3-px-Linie am streifenden Rand auf ein breites Band und legt sich als
   * heller Schleier ueber die halbe Auflage — durch das Gel hindurch sichtbar,
   * weil der Koerper durchscheinend ist. Genau dieser Fehler war im ersten
   * Versuch im Bild. */
  float pxM = min(px, 0.045);

  if (uModus == 1) {
    /* --- Meniskus -------------------------------------------------------
     * Die duenne helle Linie SITZT AUF DER KANTE und liegt aussen daneben —
     * gemessen (A): Koerper, dann 2 px hell, dann der dunkelste Punkt. Also
     * innen mit einer Pixelkante anlaufen, aussen ueber uMeniskusPx ausgehen.
     * px IST eine Bildschirmpixelbreite in t-Einheiten — die Linie bleibt
     * damit in jeder Entfernung gleich schmal, statt aus der Naehe zu einem
     * Band aufzuquellen. Genau das ist an allen drei Belegen gemessen: 2..4 px
     * bei sehr verschiedenen Koerpergroessen im Bild. */
    float mw = max(uMeniskusPx, 0.5) * pxM;
    float m = smoothstep(-pxM, pxM, t) * (1.0 - smoothstep(0.0, mw, t));
    m *= uNaehe;
    if (m <= 0.002) discard;
    outColor = vec4(uMeniskusFarbe * (m * uMeniskus), 1.0);
    return;
  }

  /* --- Saum, zwei Tonstufen mit Pixelkante ------------------------------ */
  float kern   = 1.0 - smoothstep(uStufe - px, uStufe + px, t);
  /* Die AEUSSERE Kante bekommt eine breitere Flanke als die innere. Das ist
   * kein Widerspruch zu GRAFIK-MODULE.md 0 (harte Schattenkante), sondern
   * die Messung: das Profil (A) faellt am Kontakt steil und laeuft nach
   * aussen flach aus (Anteile 0.65 / 0.57 / 0.32 / 0.25 / 0.14 / 0.07 / 0).
   * Eine harte Aussenkante macht aus dem Saum einen aufgelegten Teller — im
   * Bild beim Aufprall genau so passiert. Die HARTE Kante, die der Stil
   * verlangt, ist die INNERE zwischen den beiden Tonstufen; die traegt die
   * Lesbarkeit. */
  float aussen = 1.0 - smoothstep(1.0 - 3.0 * px, 1.0 + 0.5 * px, t);
  float band = max(kern, aussen * uStufeAussen);

  /* Nach INNEN laeuft der Saum auf null aus. Das ist keine Feinheit, sondern
   * die Bedingung dafuer, dass das Modul ueberhaupt benutzbar ist: der Koerper
   * ist DURCHSCHEINEND, man sieht den Boden hinter ihm durch ihn hindurch.
   * Bliebe unter der Auflage ein konstanter Dunkelwert stehen, wuerde nicht
   * nur die Auflage dunkler — es wuerde die KANTE DES QUADS als waagerechte
   * Linie quer durch den Koerper sichtbar, und der ganze Schleim saeuft um
   * rund 40 % ab. Genau das stand im zweiten Versuch im Bild.
   * Der Saum ist ein RING um die Auflagekante, kein Teller darunter. */
  band *= smoothstep(-uInnen, -uInnen * 0.25, t);

  band *= uNaehe;
  if (band <= 0.002) discard;

  /* Kanalweise multiplikativ. Blau faellt am wenigsten — der Kontaktschatten
   * wird von der Himmelskuppel beleuchtet. */
  outColor = vec4(1.0 - band * uTiefe * uAbfall, 1.0);
}`;

  /* =====================================================================
   * Die Huelle vermessen
   *
   * Ergebnis in S: rand[] (Auflageumriss), mitte, rMax, naehe.
   * Keine Zeitachse, kein Ereignis — nur die Punkte, die softbody.js in
   * diesem Tick geliefert hat.
   * =================================================================== */
  function huelleMessen(ctx) {
    S.gueltig = false;
    const pos = ctx.surface && ctx.surface.positions;
    if (!pos || pos.length < 9) return false;

    let yMin = Infinity, yMax = -Infinity;
    for (let i = 1; i < pos.length; i += 3) {
      const y = pos[i];
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    const hoehe = Math.max(yMax - yMin, 1e-4);

    /* --- Abheben ---------------------------------------------------------
     * Der Saum muss weg, sobald der Koerper nicht mehr aufliegt. Die erste
     * Fassung mass dafuer nur yMin gegen die Bodenebene und liess ueber eine
     * halbe Koerperhoehe aus. Das war zu weich: im Szenario `aufprall` stand
     * beim Bild #12 (Schwerpunkt 1.67, laengst in der Luft) noch ein Ring mit
     * halber Staerke am Boden — ein Reifen, der mit nichts mehr verbunden war.
     *
     * Zwei Groessen zusammen loesen das:
     *   b.grounded  — softbody.js zaehlt die Massepunkte mit Bodenkontakt
     *                 (`b.grounded = b.contacts > 0`). Liegt der Koerper auf,
     *                 ist die Frage entschieden, unabhaengig von jeder Hoehe.
     *   yMin        — sobald der Kontakt abreisst, uebernimmt der Abstand zu
     *                 der Hoehe, auf der zuletzt Kontakt WAR. Nur so ist der
     *                 Bezug richtig: die Ruhelage des tiefsten Huellpunktes
     *                 liegt nicht exakt auf y = 0, sondern um die
     *                 Kontaktweite des Weichkoerpers darueber.
     *
     * Ergebnis: aufliegend voll, beim Abloesen weich ueber ein Viertel
     * Ruheradius aus, in der Luft nichts. Kein Blinken beim Wabbeln, weil
     * `grounded` dort durchgehend wahr ist.
     * Ohne Weichkoerper (kein ctx.slime) bleibt der reine Hoehentest. */
    const koerper = ctx.slime && ctx.slime.body;
    const rRuhe = (ctx.params && ctx.params.radius) || 1;
    if (!koerper || koerper.grounded) S.bodenBezug = yMin;
    const luft = Math.max(yMin - (koerper ? S.bodenBezug : BODEN_Y), 0);
    const spanne = Math.max(rRuhe * P.abheben, 1e-4);
    const x = Math.min(luft / spanne, 1);
    S.naehe = 1 - x * x * (3 - 2 * x);          // smoothstep
    if (S.naehe <= 0.002) return false;

    /* Das Kontaktband: die untersten P.band der Koerperhoehe. Bei einer
     * Kuppel liegt seine Breite bei rund 0.72 der vollen Breite (DOSSIER §1),
     * bei einer aufgeprallten Scheibe fast bei 1.0 — der Saum waechst also
     * mit, ohne dass irgendwo ein Aufprall abgefragt wird. */
    const grenze = yMin + hoehe * P.band;

    let sx = 0, sz = 0, n = 0;
    for (let i = 0; i + 2 < pos.length; i += 3) {
      if (pos[i + 1] > grenze) continue;
      sx += pos[i]; sz += pos[i + 2]; n++;
    }
    if (n < 3) return false;
    const cx = sx / n, cz = sz / n;

    const summe = S.summe, zahl = S.zahl;
    summe.fill(0); zahl.fill(0);

    /* Je Faecher der GROESSTE Abstand, nicht der mittlere: gesucht ist der
     * Umriss, nicht die Punktwolke. */
    for (let i = 0; i + 2 < pos.length; i += 3) {
      if (pos[i + 1] > grenze) continue;
      const dx = pos[i] - cx, dz = pos[i + 2] - cz;
      const r = Math.sqrt(dx * dx + dz * dz);
      let k = Math.floor((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI) * FAECHER);
      if (k < 0) k = 0; else if (k >= FAECHER) k = FAECHER - 1;
      if (r > summe[k]) summe[k] = r;
      zahl[k]++;
    }

    /* Leere Faecher: aus den Nachbarn fuellen. Bei einem stark gestreckten
     * Koerper kann ein Faecher leer bleiben, und ein Radius 0 risse die
     * Umrisslinie bis in den Mittelpunkt. */
    let mittel = 0, belegt = 0;
    for (let k = 0; k < FAECHER; k++) if (zahl[k]) { mittel += summe[k]; belegt++; }
    if (!belegt) return false;
    mittel /= belegt;
    for (let k = 0; k < FAECHER; k++) if (!zahl[k]) summe[k] = mittel;

    /* Zirkulare 3-Punkt-Glaettung. Ohne sie springt ein Faecherradius, sobald
     * ein einzelner Huellpunkt ueber eine Faechergrenze wandert — und der Saum
     * bekommt eine zappelnde Delle, die niemand einem Weichkoerper zuschreibt. */
    const glatt = S.glatt;
    for (let k = 0; k < FAECHER; k++) {
      const a = summe[(k + FAECHER - 1) % FAECHER];
      const b = summe[k];
      const c = summe[(k + 1) % FAECHER];
      glatt[k] = a * 0.25 + b * 0.50 + c * 0.25;
    }

    let rMax = 0, rSum = 0;
    for (let k = 0; k < FAECHER; k++) {
      S.rand[k] = glatt[k];
      rSum += glatt[k];
      if (glatt[k] > rMax) rMax = glatt[k];
    }
    if (rMax < 1e-3) return false;

    S.mitte[0] = cx; S.mitte[1] = cz;
    S.rMax = rMax;
    S.rMittel = rSum / FAECHER;
    S.gueltig = true;
    return true;
  }

  /* renderer2.js legt ctx.licht mit Nullvektoren an; licht.js fuellt sie.
   * Ein Nullvektor gilt deshalb als fehlender Wert. */
  const nimm = (v, vorgabe) =>
    (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;

  const _farbe = new Float32Array(3);

  /* =====================================================================
   * Anmeldung
   * =================================================================== */
  G.modul({
    name: 'kontakt',
    ordnung: 55,

    regler: [
      { key: 'band', min: 0.04, max: 0.40, step: 0.01, wert: P.band },
      { key: 'breite', min: 0.10, max: 1.20, step: 0.01, wert: P.breite },
      { key: 'tiefe', min: 0.0, max: 0.90, step: 0.01, wert: P.tiefe },
      { key: 'stufe', min: 0.05, max: 0.95, step: 0.01, wert: P.stufe },
      { key: 'stufeAussen', min: 0.0, max: 1.0, step: 0.01, wert: P.stufeAussen },
      { key: 'innen', min: 0.1, max: 3.0, step: 0.05, wert: P.innen },
      { key: 'meniskusPx', min: 0.0, max: 8.0, step: 0.1, wert: P.meniskusPx },
      { key: 'meniskus', min: 0.0, max: 1.5, step: 0.01, wert: P.meniskus },
      { key: 'abheben', min: 0.02, max: 1.5, step: 0.01, wert: P.abheben },
    ],

    aufbau(gl, R) {
      S.prog = G.programm(gl, VS, FS, 'schleim/kontakt');
      S.bereit = true;
    },

    vorbereiten(gl, R, ctx) {
      if (!S.bereit) return;
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];
      huelleMessen(ctx);
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit || !S.gueltig) return;

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const mesh = R.quadMesh;
      if (!viewProj || !mesh || !mesh.vao) return;

      /* Ruheradius als Bezug. PARAMS.radius traegt bereits das Wachstum
       * (GDD: Groesse kommt vom Level) — ein groesserer Schleim bekommt damit
       * einen proportional breiteren Saum, aber kein Aufprall macht ihn
       * breiter. */
      const rRuhe = (ctx.params && ctx.params.radius) || S.rMittel || 1;
      const saum = Math.max(rRuhe * P.breite, 1e-3);
      const groesse = S.rMax + saum * 1.15;

      /* Farben. Die Gelfarbe kommt aus dem Materialkern — dort ist sie nach
       * Fraktion UND Todeszustand schon aufgeloest (gel.js §6). Wer sie hier
       * neu herleitet, baut die Fraktionstabelle ein zweites Mal. */
      const gel = R.gel || G.gel;
      const klar = (gel && gel.farbe && gel.farbe.klar)
        || (ctx.pal && ctx.pal.light) || [0.6, 0.85, 1.0];
      const sonne = nimm(ctx.licht && ctx.licht.farbe, [0.88, 0.85, 0.78]);
      /* Gemessen traegt der Meniskus die Koerperfarbe mit: rosa Slime rosa,
       * weisser weiss. Er ist duennes durchleuchtetes Gel, kein Glanzlicht. */
      for (let i = 0; i < 3; i++) _farbe[i] = sonne[i] * 0.55 + klar[i] * 0.45;

      /* In der Todespfuetze faellt der Meniskus mit dem Glanz weg — nichts an
       * einer Leiche glaenzt (GDD 01 §50). gel.js traegt den Faktor bereits
       * in glanzStaerke; hier wird er nur uebernommen, nicht neu erfunden. */
      const tot = (gel && gel.regler && gel.regler.glanzStaerke)
        ? Math.min(gel.glanzStaerke / gel.regler.glanzStaerke, 1) : 1;

      const p = S.prog;
      const u = p.u || {};
      gl.useProgram(p);
      gl.bindVertexArray(mesh.vao);

      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform2fv(u.uMitte, S.mitte);
      gl.uniform1f(u.uGroesse, groesse);
      gl.uniform1f(u.uHub, BODEN_Y + HUB);
      gl.uniform1fv(u.uRand, S.rand);
      gl.uniform1f(u.uBreite, saum);
      gl.uniform1f(u.uTiefe, P.tiefe);
      gl.uniform1f(u.uStufe, P.stufe);
      gl.uniform1f(u.uStufeAussen, P.stufeAussen);
      gl.uniform1f(u.uInnen, P.innen);
      gl.uniform3f(u.uAbfall, 1.00, 0.94, 0.76);
      gl.uniform1f(u.uMeniskus, P.meniskus * tot);
      gl.uniform3fv(u.uMeniskusFarbe, _farbe);
      gl.uniform1f(u.uNaehe, S.naehe);

      /* Die Meniskusbreite steht in BILDSCHIRMPIXELN (Messung: 2..4 px). Der
       * Shader rechnet in Saumbreiten und macht die Umrechnung selbst — eine
       * Pixelbreite ist dort `fwidth(t)`. */
      gl.uniform1f(u.uMeniskusPx, P.meniskusPx);

      gl.disable(gl.CULL_FACE);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);

      /* K1 — abdunkeln, kanalweise multiplikativ. */
      gl.uniform1i(u.uModus, 0);
      gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
      gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

      /* K2 — der Meniskus als Licht obendrauf. */
      if (P.meniskus * tot > 0.001) {
        gl.uniform1i(u.uModus, 1);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);
      }

      /* Zustand zuruecklassen, wie die Pipeline ihn erwartet (renderer2.js
       * R.grundzustand). Die Gelrueckwand bei 58 kommt unmittelbar danach und
       * verliesse sich sonst auf einen Mischzustand, den sie nicht gesetzt hat. */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.bindVertexArray(null);
    },
  });

})();
