'use strict';
/* ===========================================================================
 * grafik/props/ruine.js — Ausstattungstyp "ruine".
 *
 * Besitzer: Lane KARTE. Vertrag: GRAFIK-MODULE.md §3 und das Register in
 * grafik/karte.js (KARTE.typ / KARTE.setzen).
 *
 * WAS DAS IST
 *   Drei Stellen in der Arena, an denen jemand vor langer Zeit gebaut hat:
 *   ein stehengebliebener Pfeilerstumpf, eine umgefallene Saeule, ein
 *   Mauerrest, eine verwitterte Stufe, dazu ein paar Brocken. Zwoelf Stuecke,
 *   drei Gruppen — mehr nicht. Ein Blickfang wirkt, weil er selten ist.
 *
 * DIE DREI GRENZEN, die ueber allem stehen
 *
 *  1. DER SCHLEIM IST DIE FIGUR (GDD 10 §69/§98).
 *     Alle drei Stellen liegen zwischen 14 und 19 Einheiten vom Ursprung —
 *     weit ausserhalb des Ruhefelds r<9, in dem jede Bewegungsaufnahme des
 *     Gauntlets laeuft. In BEIDEN Messkameras liegt jede Stelle TIEFER im
 *     Bild als der Schleim, also hinter ihm; nachgerechnet in Abschnitt 2.
 *     Verdecken kann sie ihn damit nicht. Das hoechste Stueck misst 1,47 —
 *     niedriger als jede Laterne (2,0) und deutlich unter der Grenze 2,0
 *     aus karte.js.
 *
 *  2. KEINE KOLLISION.
 *     Diese Datei fasst world.js nicht an, meldet nichts bei istFrei() an und
 *     aendert keine Geometrie der Arena. Sie stellt Dekoration NEBEN die
 *     Hindernisse. Alle zwoelf Setzungen sind geprueft: KARTE.pruefen()
 *     meldet keine, und der kleinste Abstand zur naechsten
 *     Hindernisoberflaeche betraegt 1,94 Einheiten.
 *
 *  3. KOSTEN.
 *     Sieben Einheitsnetze im Aufbau, danach 40 Zeichenaufrufe je Bild fuer
 *     zwoelf Stuecke, zusammen 568 Dreiecke. Keine eigenen Puffer je Bild,
 *     kein eigenes Programm, keine Textur. Tragbar waeren bei 1600x900
 *     ungefaehr 40 Stueck (rund 130 Zeichenaufrufe) — und die Grenze ist
 *     ohnehin nicht die Rechenzeit, sondern das Auge: ab etwa acht Stellen
 *     ist eine Ruine keine Besonderheit mehr, sondern Bodenbelag.
 *
 * WARUM DIESE DATEI KEINEN EIGENEN SHADER MITBRINGT
 *   Sie zeichnet ueber R.drawProp und damit ueber R.solid — dasselbe
 *   Grundprogramm, das auch Felsen, Mauern und Kreaturen benutzen.
 *   licht.js (G3) und rampe.js (G4) tauschen R.solid im Aufbau gegen ihre
 *   eigene Fassung aus; rampe.js nennt "die Requisiten aus karte.js"
 *   ausdruecklich unter dem, was es damit mit trifft. Ein eigener Shader
 *   haette genau das unterlaufen: die Ruine haette ihr eigenes Licht gehabt,
 *   waere bei jedem Schritt der Lane GRAFIK zurueckgeblieben und im Bild als
 *   Fremdkoerper gestanden. Ein Modul weniger, das eine zweite Lichtwahrheit
 *   fuehrt, ist hier mehr wert als jeder Sondereffekt.
 *   Genutzt wird nur, was dafuer vorgesehen ist: R.rampZeile('mauer') stellt
 *   die Schattenzeile fuer behauenen Stein ein (rampe.js ZEILEN, Herkunft
 *   "BELEGT — neutrale Flaeche").
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 *   Kein Math.random, kein Date, kein performance.now. Jede Abweichung
 *   (Fugenton, Kippwinkel eines Brockens) faellt aus stueck.variante — die
 *   hat das Register aus der WELTPOSITION gehasht. Diese Datei fuehrt keine
 *   eigene Zufallsquelle ein; mix32() faechert nur auf, was von dort kommt.
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || !KARTE || typeof KARTE.typ !== 'function') {
    // Bewusst warn, nicht error: ein fehlendes Register ist kein Seitenfehler
    // und darf keine Aufnahme rot faerben (karte.js §4 begruendet das).
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[ruine] KARTE fehlt — props/ruine.js meldet sich nicht an.');
    }
    return;
  }

  /* =======================================================================
   * 1. Was in ref/genshin/ wirklich zu sehen ist
   *
   * Gemessen, nicht vermutet. Quelle ist vor allem
   * ref/genshin/landschaft_wiese_mittag_figur_2560.png — dort steht genau
   * dieses Motiv: ein Domaenentor mit abgebrochenem Pfeiler rechts,
   * Stufenpodest, Schuttbloecke am Fuss, eine Figur daneben als Massstab.
   * Die Bildmasse stammen aus zwei 2x-Ausschnitten dieser Datei.
   *
   * VERHAELTNISSE (in Vielfachen der jeweiligen Grundgroesse):
   *
   *   Der Pfeiler ist VIERECKIG im Grundriss, nicht rund, und besteht aus
   *   gestapelten Quadern mit wechselnder Breite — kein Zylinder:
   *     Kapitell-Breite : Schaftbreite = 1,67 : 1   (400 px : 240 px)
   *     Kapitell-Hoehe  : Schaftbreite = 0,87 : 1   (105 px : 120 px)
   *     Kapitell selbst : DREI duenne Platten uebereinander
   *     Zwischenband    : 1,20 x Schaftbreite, 0,35 x Schaftbreite hoch
   *   Also 5 bis 7 Quader je Pfeiler. Das ist der ganze Trick: die
   *   Silhouette bekommt Absaetze, und die Absaetze tragen die Lesbarkeit
   *   (GRAFIK-MODULE.md §0), nicht die Oberflaeche.
   *
   *   Stufen (zweiter Ausschnitt, Podest unter dem Tor):
   *     Steigung : Auftritt = 0,65 : 1  (33 px : 55 px, Quellaufloesung)
   *     Die Vorderkante ist NICHT gerade. Sie zerfaellt sichtbar in zwei bis
   *     drei Bloecke je Stufe, deren Enden um rund 6 % der Stufenlaenge
   *     gegeneinander versetzt sind. Genau das macht sie zur RUINE statt zur
   *     Treppe — und es kostet keinen einzigen Quader mehr, nur einen
   *     Versatz.
   *
   *   Schuttbrocken im Gras:
   *     Laenge : Hoehe = 2 : 1, oben deutlich schmaler als unten
   *     (Verjuengung rund 0,6), Kippwinkel 10..25 Grad, rund ein Drittel der
   *     Hoehe steckt IM Boden. Nichts steht auf.
   *
   * FARBE (Bildpunkte aus denselben Ausschnitten, sRGB):
   *     Stufe Oberseite      (170,176,180)   \ Verhaeltnis hell : dunkel
   *     Stufe Vorderseite    ( 95,108,124)   / rund 1,7 : 1
   *     Brocken Seite        (120,140,140)
   *     Brocken Oberseite    (150,170,160)     Oberseiten sind GRUENER
   *     Moos auf Brocken     (110,135,105)     als flaechiger, harter Fleck
   *   Zwei Befunde:
   *     - Behauener Stein ist HELLER und KUEHLER als der gewachsene Fels
   *       daneben. In der Vorlage sind Mauerwerk und Findling auf einen
   *       Blick zu unterscheiden — das traegt hier WERKSTEIN gegen die
   *       [0.335,0.330,0.310] der Felsen aus renderer2.js.
   *     - Bewachsen wird von UNTEN, in harten Flecken, nie als Verlauf.
   *       Deshalb bekommen die tief liegenden Bloecke einen eigenen,
   *       gruenlichen Ton statt eines weichen Uebergangs.
   * ===================================================================== */

  /* =======================================================================
   * 2. Die drei Stellen
   *
   * Kameras (client/capture.js, client/game.js Zeile 441):
   *   Auge = Ziel + (cos(gier)*cos(nick), sin(nick), sin(gier)*cos(nick)) * dist
   *   g-fernsicht   gier 0,90  nick 0,12  dist 24 -> Auge (14,8 | 2,9 | 18,7),
   *                 Blick nach Suedwesten, Schleim im Bildmittelpunkt.
   *   g-bodenlicht  gier 2,10  nick 0,45  dist 11 -> Auge (-5,0 | 4,8 | 8,6),
   *                 Blick nach Suedosten.
   * fovY 50 Grad bei 16:9 -> halbe Bildbreite 39,8 Grad.
   *
   * Tiefe entlang der Blickachse und seitlicher Winkel, gerechnet:
   *
   *   Stelle          g-fernsicht                 g-bodenlicht
   *   Schleim (0|0)   23,7 / 0 Grad                9,9 / 0 Grad
   *   A (-4,9|-17,1)  39,0 / 10 Grad rechts        —
   *   B (11,2| -9,9)  24,3 / 31 Grad rechts       23,9 / 10 Grad rechts
   *   C (-18,2|  3,2) 32,4 / 27 Grad links         —
   *
   * Jede Stelle liegt tiefer im Bild als der Schleim. Keine kann ihn
   * verdecken; sie stehen hinter ihm und geben dem Mittelgrund Halt. A
   * rechts und C links fassen die Fernsicht wie zwei Pfosten, ohne die Mitte
   * zu beruehren — die Anordnung aus
   * landschaft_mondstadt_mittag_fernnebel_4k, wo der Blick durch eine Luecke
   * laeuft und die Raender das Bild halten.
   *
   * Alle drei liegen ausserhalb des Ruhefelds r<9, ausserhalb von Start- und
   * Respawnkreis und mindestens 3,0 von jedem Kreaturen-Ruhepunkt entfernt
   * (sonst erscheint eine Kreatur hinter Stein — Abnahmepunkt 9).
   * ===================================================================== */

  /* Stelle A — "Der gestuerzte Torpfeiler", suedwestlich, auf der Achse
   * Arena -> Friedhof -> Hauptgipfel. Die Hauptgruppe: der Stumpf steht
   * noch, der Schaft liegt in Fallrichtung daneben, die Schwelle blieb.
   * Die Fassade zeigt mit 1,29 rad zur Arenamitte. */
  const A = [
    ['stumpf',  -6.10, -16.60,  0.42, 1.00],
    ['saeule',  -3.55, -17.35, -0.29, 1.05],
    ['stufe',   -4.95, -18.30,  1.29, 1.00],
    ['brocken', -6.75, -17.40,  1.90, 0.95],
    ['brocken', -2.85, -15.95,  0.60, 0.80],
  ];
  /* Stelle B — "Mauerrest im Ostfeld". Die einzige Gruppe, die BEIDE
   * Messkameras sehen. Bewusst ohne Stumpf: eine zweite senkrechte Form so
   * nah an der ersten haette den Blickfang halbiert. */
  const B = [
    ['mauer',   11.20,  -9.90, 1.15, 1.00],
    ['saeule',  12.45, -11.15, 1.15, 0.85],
    ['brocken', 10.25, -11.15, 2.60, 0.90],
    ['brocken', 12.30,  -8.60, 0.35, 0.75],
  ];
  /* Stelle C — "Verwitterte Stufe im Westfeld". Bewusst die aermste Gruppe:
   * sie haelt nur den linken Bildrand der Fernsicht und soll dort nicht mit
   * A um Aufmerksamkeit streiten. Die Stufe zeigt zur Arenamitte. */
  const C = [
    ['stufe',  -18.20,  3.20, -0.17, 0.90],
    ['mauer',  -19.35,  4.15,  1.40, 0.70],
    ['brocken', -17.30, 4.35,  1.10, 0.85],
  ];

  for (const gruppe of [A, B, C]) {
    for (const s of gruppe) {
      KARTE.setzen('ruine', { rolle: s[0], x: s[1], z: s[2], drehung: s[3], groesse: s[4] });
    }
  }

  /* =======================================================================
   * 3. Deterministische Aufaecherung
   *
   * mix32() ist KEINE zweite Zufallsquelle. Gefuettert wird er mit
   * stueck.variante — die hat das Register aus der gerundeten Weltposition
   * gehasht — plus der laufenden Nummer des Bauteils und einem Salz. Damit
   * traegt jeder Block seinen eigenen Wert, und zwar in jedem Lauf denselben.
   * ===================================================================== */

  function mix32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d);
    h ^= Math.imul(b | 0, 0x165667b1);
    h ^= Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 13;
    h = Math.imul(h, 0x297a2d39);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const eins = (a, b, c) => mix32(a, b, c) * 2.3283064365386963e-10;

  /* =======================================================================
   * 4. Farben
   *
   * Angegeben in DERSELBEN Groessenordnung wie die eingebauten Hindernisse
   * (Fels [0.335,0.330,0.310], Mauer [0.355,0.360,0.375] in renderer2.js).
   * Das ist Absicht und der Grund, warum diese Datei ueberhaupt richtig
   * aussieht, egal welche Ausbaustufe der Lane GRAFIK gerade laeuft: ob
   * FS_SOLID, licht.js oder rampe.js das Programm stellt, alle drei
   * behandeln uColor gleich. Was zaehlt, ist das VERHAELTNIS zum Fels
   * daneben — und das ist hier festgeschrieben:
   *
   *   Fels      0,325 mittlere Helligkeit
   *   Werkstein 0,404 mittlere Helligkeit   = +24 %, und kuehler im Ton
   *
   * Genau der Unterschied, der in der Vorlage Mauerwerk vom Findling trennt.
   * MOOSSTEIN traegt dieselbe Helligkeit, nur gruen — sonst spraenge der
   * bewachsene Block als Loch aus der Gruppe.
   * ===================================================================== */

  const WERKSTEIN = [0.395, 0.402, 0.415];
  const MOOSSTEIN = [0.300, 0.352, 0.250];

  /* =======================================================================
   * 5. Baukasten
   *
   * Jede Form ist eine Liste von Bauteilen. Ein Bauteil ist ein Quader oder
   * eine Trommel mit Ort, Groesse, Drehung, Verjuengung und einem Merker,
   * ob er bewachsen ist. Mehr braucht keine dieser Formen — und weniger
   * waere Geiz.
   *
   *   lx,ly,lz   Ort IM STUECK (x laeuft in Blickrichtung der Drehung)
   *   hx,hy,hz   halbe Kantenlaengen
   *   spitze     Verjuengung der Oberseite (1 = keine)
   *   gier/kipp/roll  zusaetzliche Drehungen ueber die des Stueckes hinaus
   *   moos       true -> MOOSSTEIN statt WERKSTEIN
   * ===================================================================== */

  const SPITZEN = [1.00, 0.96, 0.92, 0.86, 0.68, 0.60];   // Formen der Quadernetze
  function spitzeNr(s) {
    let best = 0, d = 1e9;
    for (let i = 0; i < SPITZEN.length; i++) {
      const e = Math.abs(SPITZEN[i] - s);
      if (e < d) { d = e; best = i; }
    }
    return best;
  }

  function quader(L, lx, ly, lz, hx, hy, hz, spitze, gier, kipp, moos) {
    L.push({ art: spitzeNr(spitze === undefined ? 1 : spitze),
             lx, ly, lz, hx, hy, hz, gier: gier || 0, kipp: kipp || 0, roll: 0, moos: !!moos });
  }
  /* Trommel: Achtkantprisma laengs der lokalen X-Achse. Die einzige Rundung
   * im ganzen Bausatz, und sie ist begruendet: eine liegende Saeule muss als
   * Zylinder lesbar sein, sonst ist sie ein Balken. Acht Seiten reichen —
   * bei dieser Bildgroesse sind auch Genshins Saeulen kantig. */
  function trommel(L, lx, ly, lz, hx, hy, hz, gier, roll) {
    L.push({ art: -1, lx, ly, lz, hx, hy, hz, gier: gier || 0, kipp: 0, roll: roll || 0, moos: false });
  }

  /* =======================================================================
   * 6. Die vier Formen
   *
   * Alle Masse in Einheiten bei groesse = 1, Verhaeltnisse aus Abschnitt 1.
   * ===================================================================== */

  /* Pfeilerstumpf — 5 Quader, Kapitell 1,55 x Schaftbreite. Hoechster Punkt
   * 1,47. Die hoechste Form dieser Datei, unter jeder Laterne. */
  function stumpf(L, g) {
    const w = 0.215 * g;                                   // halbe Schaftbreite
    quader(L, 0, 0.085 * g, 0, w * 1.55, 0.085 * g, w * 1.55, 0.92, 0, 0, true);
    quader(L, 0, 0.44 * g, 0, w, 0.28 * g, w, 0.96, 0, 0, false);
    quader(L, 0, 0.79 * g, 0, w * 1.20, 0.075 * g, w * 1.20, 0.92, 0, 0, false);
    quader(L, 0, 1.11 * g, 0, w * 0.95, 0.25 * g, w * 0.95, 0.96, 0, 0, false);
    // Der Bruch: eine schmale, gekippte Platte. Sie erzaehlt, dass oben etwas
    // fehlt — eine gerade Oberkante saehe aus wie ein Poller.
    quader(L, 0.03 * g, 1.40 * g, 0, w * 1.30, 0.055 * g, w * 0.88, 0.86, 0.12, 0.22, false);
  }

  /* Umgefallene Saeule — zwei Trommeln mit Bruchfuge, dazu das Kapitell am
   * +X-Ende. Hoechster Punkt 0,47: sie legt sich IN die Flaeche, statt sie
   * zu unterbrechen. Laenge 2,9 — lang ist die einzige Richtung, in der
   * Ausstattung hier wachsen darf. */
  function saeule(L, g) {
    const r = 0.225 * g, achse = 0.205 * g;
    trommel(L, -0.77 * g, achse, 0, 0.65 * g, r * 0.98, r, 0, 0);
    // Das zweite Stueck ist verrutscht und verdreht — es fiel nach dem ersten.
    trommel(L, 0.47 * g, achse, 0.05 * g, 0.49 * g, r * 0.95, r * 0.97, 0.10, 0.30);
    // Kapitell, auf der Seite liegend: breit in z, flach in y.
    quader(L, 1.20 * g, 0.19 * g, 0.10 * g, 0.20 * g, 0.19 * g, 0.34 * g, 0.86, 0.16, 0.09, true);
    quader(L, 1.44 * g, 0.13 * g, 0.14 * g, 0.09 * g, 0.13 * g, 0.24 * g, 0.68, 0.16, 0.09, true);
  }

  /* Mauerrest — vier Bloecke, deren Oberkante nach +X abfaellt (0,96 -> 0,37).
   * Eine gleich hohe Mauer waere eine Mauer; erst das Gefaelle macht sie zum
   * Rest. Dazu eine Fusschicht, die alles zusammenbindet, und ein Block, der
   * herausgefallen ist und daneben liegt. */
  function mauer(L, g) {
    quader(L, 0, 0.055 * g, 0, 1.02 * g, 0.055 * g, 0.235 * g, 0.96, 0, 0, true);
    quader(L, -0.66 * g, 0.52 * g, 0, 0.34 * g, 0.44 * g, 0.195 * g, 0.96, 0, 0, false);
    quader(L, 0.02 * g, 0.36 * g, 0.015 * g, 0.30 * g, 0.29 * g, 0.185 * g, 0.92, 0, 0, false);
    quader(L, 0.62 * g, 0.22 * g, -0.02 * g, 0.28 * g, 0.15 * g, 0.175 * g, 0.92, 0, 0, true);
    quader(L, 1.12 * g, 0.10 * g, 0.34 * g, 0.17 * g, 0.13 * g, 0.15 * g, 0.68, 0.70, 0.24, true);
  }

  /* Verwitterte Stufe — drei Lagen, Steigung zu Auftritt 0,65 : 1 wie
   * gemessen. Jede Lage zerfaellt in zwei Bloecke mit versetzten
   * Vorderkanten: daran erkennt man im Vorbild die Ruine statt der Treppe.
   * Hoechster Punkt 0,50. */
  function stufe(L, g, kern) {
    const lage = [
      [0.075, 0.00, 0.52],
      [0.245, -0.11, 0.40],
      [0.415, -0.22, 0.29],
    ];
    for (let k = 0; k < 3; k++) {
      const l = lage[k];
      const vor = 0.055 * (eins(kern, 90 + k, 4110) - 0.5);
      quader(L, (l[1] - 0.30) * g, l[0] * g, (0.26 + vor) * g,
             0.30 * g, 0.085 * g, l[2] * 0.5 * g, 0.96, 0, 0, k === 0);
      quader(L, (l[1] + 0.30) * g, l[0] * g, (0.26 - vor) * g,
             0.30 * g, 0.085 * g, l[2] * 0.5 * g, 0.96, 0, 0, k === 0);
    }
    // Die Ecke, die abgebrochen ist und vor der Stufe liegt.
    quader(L, 0.82 * g, 0.075 * g, 0.30 * g, 0.155 * g, 0.095 * g, 0.175 * g,
           0.60, 0.45, 0.17, true);
  }

  /* Brocken — ein einziger verjuengter, gekippter Quader, ein Drittel im
   * Boden. Nichts steht auf: die billigste und wirksamste Regel aus den
   * Vorlagen. Hoechster Punkt 0,26. */
  function brocken(L, g, kern) {
    quader(L, 0, 0.09 * g, 0, 0.30 * g, 0.185 * g, 0.235 * g, 0.60,
           0, 0.10 + 0.20 * eins(kern, 7, 4120), true);
  }

  const FORM = {
    stumpf: (L, g) => stumpf(L, g),
    saeule: (L, g) => saeule(L, g),
    mauer: (L, g) => mauer(L, g),
    stufe: (L, g, k) => stufe(L, g, k),
    brocken: (L, g, k) => brocken(L, g, k),
  };
  /* Wie tief ein Stueck im Boden steckt. Ohne das schwebt Ausstattung auf
   * einer Ebene ohne Unebenheit — und ein Spalt am Fuss ist das Erste, was
   * ein Betrachter als "eingesetzt" erkennt. */
  const EINSINKEN = { stumpf: 0.05, saeule: 0.045, mauer: 0.05, stufe: 0.035, brocken: 0.075 };

  /* =======================================================================
   * 7. Netze und Matrizen
   *
   * Sieben Einheitsnetze: sechs Quader mit verschiedenen Verjuengungen und
   * ein Achtkantprisma. Jedes Bauteil ist danach nur noch eine Matrix.
   * ===================================================================== */

  function quaderNetz(spitze) {
    const t = spitze;
    const ecken = [
      [-t, 1, -t], [t, 1, -t], [t, 1, t], [-t, 1, t],          // oben
      [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1],      // unten
    ];
    const seiten = [
      [0, 1, 2, 3],   // oben
      [7, 6, 5, 4],   // unten
      [4, 5, 1, 0],   // -z
      [6, 7, 3, 2],   // +z
      [5, 6, 2, 1],   // +x
      [7, 4, 0, 3],   // -x
    ];
    const p = [], n = [], i = [];
    let v = 0;
    for (const s of seiten) {
      const a = ecken[s[0]], b = ecken[s[1]], c = ecken[s[2]], d = ecken[s[3]];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      for (const q of [a, b, c, d]) { p.push(q[0], q[1], q[2]); n.push(nx, ny, nz); }
      i.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
    return { p, n, i };
  }

  function prismaNetz() {
    const N = 8, p = [], n = [], i = [], r0 = [], r1 = [];
    for (let k = 0; k < N; k++) {
      const a = (k + 0.5) * Math.PI * 2 / N;
      r0.push([-1, Math.cos(a), Math.sin(a)]);
      r1.push([1, Math.cos(a), Math.sin(a)]);
    }
    let v = 0;
    const vier = (a, b, c, d) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      for (const q of [a, b, c, d]) { p.push(q[0], q[1], q[2]); n.push(nx, ny, nz); }
      i.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    };
    for (let k = 0; k < N; k++) vier(r0[k], r0[(k + 1) % N], r1[(k + 1) % N], r1[k]);
    // Kappen: je drei Vierecke ueber das Achteck. Die +X-Kappe laeuft in
    // Ringrichtung, die -X-Kappe dagegen — sonst zeigte eine der beiden
    // Normalen nach innen und die Kappe waere weggeschnitten.
    for (let k = 1; k < N - 1; k += 2) {
      vier(r1[0], r1[k], r1[k + 1], r1[(k + 2) % N]);
      vier(r0[0], r0[(k + 2) % N], r0[k + 1], r0[k]);
    }
    return { p, n, i };
  }

  /* Modellmatrix = T(ort) * Ry(gier) * Rz(kipp) * Rx(roll) * S(halb).
   * Die Gier-Drehung ist wortgleich mit M4.trs() in renderer2.js: lokales
   * +X zeigt nach (cos g, 0, sin g).
   *
   * Die Normalenmatrix ist EXAKT, nicht genaehert: fuer M3 = R*S mit
   * orthonormalem R und diagonalem S ist (R*S)^-T = R*S^-1. Ohne das
   * stuenden bei den stark verjuengten Brocken (Skalierung 0,30 zu 0,185)
   * die Normalen schief und die Rampe braeche an der falschen Stelle um. */
  function matrizen(px, py, pz, hx, hy, hz, gier, kipp, roll, M, N) {
    const cy = Math.cos(gier), sy = Math.sin(gier);
    const cz = Math.cos(kipp), sz = Math.sin(kipp);
    const cx = Math.cos(roll), sx = Math.sin(roll);

    const c0 = [cy * cz, sz, sy * cz];
    const c1 = [-cy * sz * cx - sy * sx, cz * cx, -sy * sz * cx + cy * sx];
    const c2 = [cy * sz * sx - sy * cx, -cz * sx, sy * sz * sx + cy * cx];

    M[0] = c0[0] * hx; M[1] = c0[1] * hx; M[2] = c0[2] * hx; M[3] = 0;
    M[4] = c1[0] * hy; M[5] = c1[1] * hy; M[6] = c1[2] * hy; M[7] = 0;
    M[8] = c2[0] * hz; M[9] = c2[1] * hz; M[10] = c2[2] * hz; M[11] = 0;
    M[12] = px; M[13] = py; M[14] = pz; M[15] = 1;

    N[0] = c0[0] / hx; N[1] = c0[1] / hx; N[2] = c0[2] / hx;
    N[3] = c1[0] / hy; N[4] = c1[1] / hy; N[5] = c1[2] / hy;
    N[6] = c2[0] / hz; N[7] = c2[1] / hz; N[8] = c2[2] / hz;
  }

  /* =======================================================================
   * 8. Der Typ
   * ===================================================================== */

  let netze = null;          // [ 6 Quadernetze , Prismanetz ]
  let bauteile = null;       // fertige Matrizen, einmal gerechnet
  let gebaut = -1;

  function bauteileRechnen(stuecke) {
    const liste = [];
    let maxY = 0;
    for (const s of stuecke) {
      const f = FORM[s.rolle];
      if (!f) continue;
      const teile = [];
      f(teile, s.groesse, s.variante | 0);

      const d = s.drehung, cd = Math.cos(d), sd = Math.sin(d);
      const fuss = s.y - (EINSINKEN[s.rolle] || 0.04);

      for (let k = 0; k < teile.length; k++) {
        const t = teile[k];
        const px = s.x + t.lx * cd - t.lz * sd;
        const pz = s.z + t.lx * sd + t.lz * cd;
        const py = fuss + t.ly;

        const M = new Float32Array(16), N = new Float32Array(9);
        matrizen(px, py, pz, t.hx, t.hy, t.hz, d + t.gier, t.kipp, t.roll, M, N);

        // Fugenton: jeder Block liegt seit langem anders im Wetter. +-5 %,
        // hart je Block, nie als Verlauf (GRAFIK-MODULE.md §0).
        const basis = t.moos ? MOOSSTEIN : WERKSTEIN;
        const ton = 0.95 + 0.10 * eins(s.variante | 0, k, 4101);
        liste.push({
          netz: t.art, M, N,
          farbe: new Float32Array([basis[0] * ton, basis[1] * ton, basis[2] * ton]),
        });

        /* Hoechster Punkt des Bauteils: der Mittelpunkt plus die Summe der
         * y-Anteile der drei skalierten Achsen. Das ist die Ecke, die am
         * weitesten oben liegt — die Zahl, die gegen die Grenze 2,0 aus
         * karte.js gehalten wird. */
        const h = Math.abs(M[1]) + Math.abs(M[5]) + Math.abs(M[9]);
        if (py + h > maxY) maxY = py + h;
      }
    }
    bauteile = liste;
    gebaut = stuecke.length;

    /* Nachweis statt Behauptung: die tatsaechlich gebaute Hoehe steht zur
     * Laufzeit bereit und laesst sich gegen die Grenze 2,0 aus karte.js
     * halten. */
    if (typeof window !== 'undefined') {
      window.RUINE = {
        stuecke: stuecke.length,
        gruppen: 3,
        bauteile: liste.length,
        dreiecke: liste.reduce((n, b) => n + (b.netz < 0 ? 28 : 12), 0),
        maxHoehe: +maxY.toFixed(3),
      };
    }
  }

  KARTE.typ('ruine', {
    /* Frueh in der Karte: der Bewuchs an den Fuessen soll VOR dem Stein
     * liegen, nicht dahinter. */
    schicht: 10,

    aufbau(gl, R) {
      netze = [];
      for (const s of SPITZEN) {
        const q = quaderNetz(s);
        netze.push(GRAFIK.mesh(gl, q.p, q.n, q.i));
      }
      const pr = prismaNetz();
      netze.push(GRAFIK.mesh(gl, pr.p, pr.n, pr.i));
    },

    vorbereiten(gl, R, ctx, stuecke) {
      if (!bauteile || gebaut !== stuecke.length) bauteileRechnen(stuecke);
    },

    zeichnen(gl, R, ctx, stuecke) {
      if (!netze || !bauteile || !bauteile.length) return;

      /* Jeder Durchgang setzt seinen Zustand selbst — zwischen zwei
       * Durchgaengen kann ein fremdes Modul gestanden haben
       * (renderer2.js §5). */
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      /* Schattenzeile fuer behauenen Stein. rampe.js kann seinen Zeilenwert
       * nicht je Zeichenaufruf mitgeben und steht deshalb auf 'kreatur';
       * fuer Mauerwerk ist 'mauer' die gemessene Zeile. Danach wird auf die
       * Vorgabe zurueckgestellt, damit die Durchgaenge nach diesem hier
       * (Dekale, Gel, die Alt-Erweiterungen) unveraendert weiterlaufen.
       * Fehlt rampe.js, passiert schlicht nichts. */
      const zeile = (typeof R.rampZeile === 'function') ? R.rampZeile : null;
      if (zeile) zeile('mauer');

      const cam = ctx.cam, vp = ctx.viewProj;
      const letzte = netze.length - 1;
      for (const b of bauteile) {
        R.drawProp(netze[b.netz < 0 ? letzte : b.netz], b.M, b.N, b.farbe, 0, 0, cam, vp);
      }

      if (zeile) zeile('kreatur');
    },
  });

})();
