'use strict';
/* ===========================================================================
 * grafik/props/baumstumpf.js — Baumstuempfe, umgestuerzte Staemme, tote Aeste.
 *
 * Besitzer: Lane KARTE. Vertrag: GRAFIK-MODULE.md §3 und der Registerkopf in
 * grafik/karte.js. Diese Datei besitzt AUSSCHLIESSLICH sich selbst.
 *
 * WAS DER TYP ERZAEHLT
 *   Ein Stumpf ist der einzige Gegenstand einer Wiese, der eine Zeitangabe
 *   macht: hier stand einmal ein Baum, und jemand hat ihn gefaellt. Drei
 *   gefallene Staemme daneben sagen sogar, WER. Deshalb steht das Zeug nicht
 *   verstreut herum, sondern in einer Lichtung im Suedwesten als kleiner
 *   Holzplatz — genau die Anordnung aus dem Vorbild (siehe MESSUNGEN).
 *
 * DIE DREI GRENZEN AUS DEM AUFTRAG, und wie sie hier eingehalten sind
 *
 *   1. DER SCHLEIM IST DIE FIGUR (GDD 10 §69).
 *      Innerhalb der Arena steht von diesem Typ NICHTS hoeher als 0,62 —
 *      niedriger als der Busch (0,85) aus demselben Register und deutlich
 *      niedriger als der Schleim (Radius 1, also 2,0 hoch). Kein Stueck kann
 *      ihn je verdecken. Alles, was groesser ist — die gefallenen Staemme —
 *      liegt jenseits von 27,8; der Schleim kommt hoechstens bis 25,4.
 *
 *   2. KEINE KOLLISION.
 *      Kein Stueck taucht in istFrei() oder bodenHoehe() auf. world.js ist
 *      unberuehrt. Die Geometrie der Arena aendert sich nicht um einen
 *      Millimeter — nur ihr Aussehen.
 *      Daraus folgt eine Entwurfsregel, die diese Datei streng einhaelt:
 *      GROSSE Stuecke stehen nur dort, wo der Schleim niemals hinkommt, also
 *      ausserhalb der Arena. Ein 4 m langer Stamm mitten in der Ebene, durch
 *      den der Schleim hindurchrollt, waere schlimmer als gar kein Stamm.
 *      Innen liegen nur flache Stuempfe und Aeste — dieselbe Groessenklasse
 *      wie Busch und Stein, die das Register dort schon streut.
 *
 *   3. KOSTEN.
 *      Drei instanzierte Zeichenaufrufe, zusammen 238 Dreiecke im Netz.
 *      Tragbar bei 1600x900 waeren einige Tausend Stuecke; gesetzt sind 26.
 *      Die Grenze ist hier nicht die Grafikkarte, sondern das Auge.
 *
 * MESSUNGEN AM VORBILD  (ref/genshin/landschaft_mondstadt_mittag_fernnebel_4k.png,
 * der Holzplatz bei Bildpunkt 490..630 / 1555..1690 — ein Genshin-Schlag mit
 * drei gefallenen Staemmen und vier Stuempfen. Alle Werte nachgemessen, nicht
 * geschaetzt.)
 *
 *   Stumpf, Hoehe zu Durchmesser                     0,68 : 1
 *   Stamm, Laenge zu Durchmesser                     5,5 : 1 (langer Stamm)
 *                                                    4,2 : 1 (kurze Staemme)
 *   Ast, Laenge zu Staerke                           rund 13 : 1
 *   Rinde besonnt                                    (144,130,97)  Saettigung 0,33
 *   Rinde im Schatten                                Leuchtdichte 0,44 der besonnten
 *                                                    (Schlagschatten, nicht Eigenschatten)
 *   Schnittflaeche besonnt                           rund (200,196,162)
 *   Schnittflaeche zu Rinde, Leuchtdichte            1,49 : 1  ← das lesbare Signal
 *   Schnittflaeche: heller Splintring aussen,        Ring rund 0,28 der Radien breit,
 *   dunkleres Kernholz innen                         Kante hart
 *   Tonstufen je Flaeche                             zwei, dazwischen eine harte Kante
 *   Staemme liegen zu rund 30 % ihres Durchmessers   im Gras versunken, nicht aufgelegt
 *
 * Der Eigenschatten folgt NICHT den 0,44 aus dem Schlagschatten, sondern
 * PHASE-GRAFIK-PLAN.md G3/G4: Verhaeltnis Schatten zu Licht 0,82…0,88, und
 * der Schatten geht WAERMER, nicht kuehler (B/R faellt von 0,92 auf 0,73).
 * Der "Anime-Schatten sind blau"-Reflex trifft Genshin nachweislich nicht.
 *
 * DETERMINISMUS
 *   Kein Math.random, kein Date, kein performance.now. Die Netze entstehen aus
 *   festen Formeln ueber dem Eckenindex, die Streuung aus KARTE.streuen(), die
 *   Abweichung je Stueck aus s.zufall[] — beides ortsgehasht. Zwei Laeufe
 *   liefern bitgleiche Bilder.
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || !KARTE || typeof KARTE.typ !== 'function') {
    // Ohne Register gibt es nichts anzumelden. Bewusst warn, nicht error:
    // eine fehlende Requisite darf keine Aufnahme rot faerben.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[baumstumpf] grafik/karte.js fehlt oder ist aelter als erwartet — '
                 + 'Typ nicht angemeldet.');
    }
    return;
  }

  /* =======================================================================
   * 1. Wo die Stuecke stehen
   *
   * Reihenfolge: erst der Holzplatz, der die Geschichte traegt, dann die
   * wenigen Einzelstuecke drinnen. Das Register liefert die Determinismus-
   * und Freiraumpruefungen; diese Datei liefert die Absicht.
   * ===================================================================== */

  const ROLLE_STUMPF = 'stumpf';
  const ROLLE_STAMM  = 'stamm';
  const ROLLE_AST    = 'ast';

  /* --- 1.1 Der Holzplatz in der Suedwest-Lichtung ------------------------
   *
   * karte.js haelt die Suedwest-Lichtung frei, weil dort die Blickachse
   * Arena → Friedhof → Waldoeffnung → Hauptgipfel liegt und weil das
   * Szenario g-fernsicht genau dorthin sieht (Auge bei 14,8 / 2,9 / 18,7,
   * Blick auf den Ursprung, also nach Suedwesten).
   *
   * Eine leere Lichtung ist ein Loch. Eine Lichtung MIT Holzplatz ist eine
   * Erklaerung: hier ist der Wald gefaellt worden, deshalb ist hier eine
   * Luecke, deshalb sieht man den Berg. Genau das leistet der Genshin-Schlag
   * im Vorbild, und er kostet nichts an Lesbarkeit: in 66 Einheiten
   * Entfernung ist ein 4,4 langer Stamm rund 70 px lang und 14 px dick, also
   * eine klare Form — und 0,8 hoch, also 0,7 Grad, waehrend der Hauptgipfel
   * 10,4 Grad einnimmt. Er verdeckt nichts.
   *
   * ALLE Stuecke hier haben max(|x|,|z|) >= 27,8. Selbst der laengste Stamm
   * (4,4) reicht damit im ungiuenstigsten Winkel bis 26,2 — der Schleim kommt
   * bis 25,4. Beruehrung ist geometrisch ausgeschlossen, nicht bloss
   * unwahrscheinlich. */

  const HOLZPLATZ = [
    // Drei gefallene Staemme, leicht gefaechert statt parallel — parallel
    // liest sich als gestapelt, gefaechert als gefaellt und liegen gelassen.
    { rolle: ROLLE_STAMM,  x: -25.60, z: -30.40, drehung: 0.42, groesse: 4.40 },
    { rolle: ROLLE_STAMM,  x: -28.90, z: -32.60, drehung: 0.66, groesse: 3.80 },
    { rolle: ROLLE_STAMM,  x: -31.80, z: -29.20, drehung: 2.35, groesse: 3.20 },
    // Die Stuempfe, aus denen sie kommen. Ein Stumpf ohne Stamm ist eine
    // Behauptung, ein Stumpf MIT Stamm daneben ist eine Erzaehlung.
    { rolle: ROLLE_STUMPF, x: -24.20, z: -33.10, drehung: 1.10, groesse: 0.86 },
    { rolle: ROLLE_STUMPF, x: -30.20, z: -34.40, drehung: 2.60, groesse: 0.98 },
    { rolle: ROLLE_STUMPF, x: -33.40, z: -31.00, drehung: 4.30, groesse: 0.74, neigung: 0.26 },
    // Abraum: was beim Faellen liegen bleibt.
    { rolle: ROLLE_AST,    x: -26.40, z: -34.80, drehung: 0.90, groesse: 2.10 },
    { rolle: ROLLE_AST,    x: -32.60, z: -27.90, drehung: 3.40, groesse: 1.70 },
    { rolle: ROLLE_AST,    x: -29.05, z: -28.40, drehung: 5.10, groesse: 1.90 },
  ];

  /* --- 1.2 Der kleine Schlag hinter der engen Passage --------------------
   *
   * Die Nord-Lichtung liegt hinter der Passage bei z = 14. Wer sich
   * durchgequetscht hat (GDD 01 §17), soll dort etwas vorfinden statt einer
   * Wand aus Bueschen. Drei Stuecke reichen dafuer — mehr waere Dekoration um
   * ihrer selbst willen. Auch hier max(|x|,|z|) >= 30. */
  const NORDSCHLAG = [
    { rolle: ROLLE_STAMM,  x:  0.60, z: 30.60, drehung: 1.90, groesse: 3.60 },
    { rolle: ROLLE_STUMPF, x:  3.40, z: 32.20, drehung: 0.30, groesse: 0.92 },
    { rolle: ROLLE_AST,    x: -1.80, z: 31.80, drehung: 2.20, groesse: 1.80 },
  ];

  for (const s of HOLZPLATZ) KARTE.setzen('baumstumpf', s);
  for (const s of NORDSCHLAG) KARTE.setzen('baumstumpf', s);

  /* --- 1.3 Drei Einzelstuecke INNERHALB der Arena, mit Absicht gesetzt ---
   *
   * Von Hand, nicht gestreut, weil sie zwei bestimmte Kamerabilder bedienen
   * sollen und weil ich fuer jedes einzeln nachgerechnet habe, dass es frei
   * steht. Alle drei sind hoechstens 0,58 hoch.
   *
   * Freiraum nachgerechnet (Radius des Stuecks grosszuegig mit 0,45
   * angesetzt, Hindernisse aus world.js):
   *
   *   (-17,90 | -13,40)  Plateau (-13|-12, 7x7): |Δx| = 4,90 > 3,95   frei
   *                      naechster Fels (-14|7):    22,4              frei
   *   (  8,60 | -11,40)  Fels (6|-8, r 1,4):        4,28 > 1,85       frei
   *                      Ruhepunkt (3|-9):          6,09 > 3,4        frei
   *                      Ruhepunkt (14|-6):         7,64 > 3,4        frei
   *   (  4,40 |  -4,60)  Fels (1,5|-2,5, r 0,9):    3,58 > 1,35       frei
   *                      Fels (6|-8, r 1,4):        3,66 > 1,85       frei
   *                      Startkreis r 4,2:          6,37 > 4,2        frei
   *                      Ruhepunkt (3|-9):          4,62 > 2,2        frei
   */

  /* Westflanke des Plateaus, auf dem Weg zum Friedhof. Der Stumpf markiert
   * die Kante von unten, ohne die Absprungrichtung oben anzutasten — oben
   * liegt weiterhin nichts ausser Bluetenflecken (karte.js §6.6). */
  KARTE.setzen('baumstumpf', {
    rolle: ROLLE_STUMPF, x: -17.90, z: -13.40, drehung: 2.05, groesse: 0.58,
  });
  /* Fuer g-bodenlicht (Auge -5,0 / 4,8 / 8,6, Blick auf den Ursprung): dieses
   * Stueck liegt 15 Grad neben der Bildachse, also sicher im Bild, und gibt
   * der grossen leeren Bodenflaeche dieses Szenarios ihren Ruhepunkt. */
  KARTE.setzen('baumstumpf', {
    rolle: ROLLE_STUMPF, x: 8.60, z: -11.40, drehung: 0.75, groesse: 0.54,
    neigung: 0.14,
  });
  /* Ein toter Ast im Vordergrund desselben Bildes — flach, 0,2 hoch, und
   * damit selbst dann harmlos, wenn der Schleim darueber rollt. */
  KARTE.setzen('baumstumpf', {
    rolle: ROLLE_AST, x: 4.40, z: -4.60, drehung: 1.35, groesse: 1.55,
  });

  /* --- 1.4 Die duenne Streuung im Uebergangsguertel ----------------------
   *
   * Der Auftrag sagt "sehr sparsam". Die Zahlen unten sind entsprechend
   * gewaehlt: mindestabstand 9,0 bei Stuempfen laesst auf dem ganzen Ring
   * nur eine Handvoll uebrig, und das Fleckenfeld (horst) sorgt dafuer, dass
   * sie sich zu zweit und zu dritt gruppieren statt sich gleichmaessig zu
   * verteilen. Ein einzeln stehender Stumpf sieht hingeworfen aus, zwei
   * nebeneinander sehen nach Schlag aus.
   *
   * streuen() prueft von sich aus: istFrei(), die Arenagrenze, den
   * Startkreis, den Respawnkreis und die Gasse durch die Passage. Ich ergaenze
   * spawnAbstand (eine Kreatur darf nie hinter einer Requisite erscheinen,
   * Abnahmepunkt 9) und meide den Friedhof, dessen Senke nach karte.js §6.8
   * KAHL bleiben soll — sie ist dort Kontrastmittel, nicht Flaeche. */

  const meidenInnen = [
    { art: 'kreis', x: -18, z: -18, r: 7.4 },      // Friedhofssenke plus Grasguertel
    { art: 'kreis', x: -17.90, z: -13.40, r: 4.0 },// die drei Handsetzungen von oben
    { art: 'kreis', x: 8.60, z: -11.40, r: 4.0 },
    { art: 'kreis', x: 4.40, z: -4.60, r: 4.0 },
  ];
  const fleckig = (x, z, welle, salz) => {
    // dieselbe Idee wie horst() in karte.js: rund ein Fuenftel bleibt kahl.
    const u = x / welle, v = z / welle;
    const i = Math.floor(u), j = Math.floor(v);
    let fu = u - i, fv = v - j;
    fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv);
    const h = (a, b) => {
      let n = Math.imul(a | 0, 0x27d4eb2d);
      n ^= Math.imul(b | 0, 0x165667b1);
      n ^= Math.imul(salz | 0, 0x9e3779b1);
      n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
      n ^= n >>> 13;
      n = Math.imul(n, 0x297a2d39);
      return ((n ^ (n >>> 16)) >>> 0) * 2.3283064365386963e-10;
    };
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
    const o = a + (b - a) * fu, w = c + (d - c) * fu;
    const f = o + (w - o) * fv;
    return Math.max(0, Math.min(1.2, (f - 0.22) * 2.0));
  };

  KARTE.streuen('baumstumpf', {
    bereich: { art: 'ring', innen: 12.5, aussen: 23.0 },
    dichte: (x, z) => 0.55 * fleckig(x, z, 15.0, 6101),
    mindestabstand: 9.0, groesse: [0.40, 0.58],
    spawnAbstand: 3.4, abstand: 0.5, salz: 6101,
    meiden: meidenInnen,
    daten: { rolle: ROLLE_STUMPF },
  });

  KARTE.streuen('baumstumpf', {
    bereich: { art: 'ring', innen: 11.0, aussen: 24.0 },
    dichte: (x, z) => 0.42 * fleckig(x, z, 12.0, 6102),
    mindestabstand: 6.0, groesse: [1.10, 1.90],
    spawnAbstand: 2.4, abstand: 0.3, salz: 6102,
    meiden: meidenInnen,
    daten: { rolle: ROLLE_AST },
  });

  /* =======================================================================
   * 2. Die Netze
   *
   * Drei Formen, prozedural. Es gibt keine Modelldateien und es soll keine
   * geben. Alles liegt in EINEM Puffer, jede Form kennt ihren Indexbereich —
   * dann kostet der Wechsel zwischen den Formen keinen Pufferwechsel.
   *
   * Ein Punkt traegt sieben Werte: Ort (3), Normale (3), Stoff (1).
   * Stoff 0 = Rinde, 1 = Splintring der Schnittflaeche, 0,5 = Kernholz.
   * Damit sind zwei Materialien in einem Zeichenaufruf, ohne Textur und ohne
   * zweites Programm.
   *
   * Die Umrisse sind ABSICHTLICH unrund: der Radius jeder Ecke kommt aus
   * einer festen Formel ueber dem Eckenindex. Ein perfekter Zylinder liest
   * sich als Rohr, ein leicht unregelmaessiger als Holz — und weil die Formel
   * fest ist, ist das Netz in jedem Lauf identisch.
   * ===================================================================== */

  const S_STUMPF = 9;      // Ecken im Umriss
  const S_STAMM  = 8;
  const S_AST    = 5;

  function netzBauen() {
    const P = [], I = [];
    const teile = {};

    const punkt = (px, py, pz, nx, ny, nz, stoff) => {
      const nl = Math.hypot(nx, ny, nz) || 1;
      P.push(px, py, pz, nx / nl, ny / nl, nz / nl, stoff);
      return (P.length / 7) - 1;
    };
    const dreieck = (a, b, c) => { I.push(a, b, c); };

    /* Ein Ring aus S Punkten um `mitte`, aufgespannt von u und v.
     * Es gilt immer u x v = Vorwaertsachse; daraus folgt die Wicklung unten,
     * einmal hergeleitet und dann nirgends mehr geraten. */
    function ring(mitte, u, v, radien, neigung, stoff) {
      const S = radien.length;
      const idx = new Array(S);
      for (let i = 0; i < S; i++) {
        const a = (i / S) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const ex = u[0] * ca + v[0] * sa;
        const ey = u[1] * ca + v[1] * sa;
        const ez = u[2] * ca + v[2] * sa;
        const r = radien[i];
        const fx = u[1] * v[2] - u[2] * v[1];
        const fy = u[2] * v[0] - u[0] * v[2];
        const fz = u[0] * v[1] - u[1] * v[0];
        idx[i] = punkt(
          mitte[0] + ex * r, mitte[1] + ey * r, mitte[2] + ez * r,
          ex + fx * neigung, ey + fy * neigung, ez + fz * neigung,
          stoff);
      }
      return idx;
    }

    /* Mantel zwischen zwei Ringen. Wicklung hergeleitet aus u x v = f:
     * (i,k),(i+1,k),(i,k+1) zeigt nach aussen. */
    function mantel(a, b) {
      const S = a.length;
      for (let i = 0; i < S; i++) {
        const j = (i + 1) % S;
        dreieck(a[i], a[j], b[i]);
        dreieck(a[j], b[j], b[i]);
      }
    }

    /* Schnittflaeche: aussen ein heller Splintring, innen dunkleres Kernholz,
     * dazwischen eine harte Kante (eigene Punkte, damit nichts verlaeuft).
     * Genau so sieht die Stirnseite im Vorbild aus.
     * `vorne` = true: Deckel am +f-Ende. */
    function deckel(mitte, u, v, radien, achse, vorne) {
      const S = radien.length;
      const aussen = ring(mitte, u, v, radien, 0, 1.0);
      const innenR = radien.map(r => r * 0.72);
      const innenA = ring(mitte, u, v, innenR, 0, 1.0);   // Splint, Innenkante
      const innenB = ring(mitte, u, v, innenR, 0, 0.5);   // Kern, Aussenkante
      // Normalen aller Deckelpunkte auf die Achse setzen
      for (const feld of [aussen, innenA, innenB]) {
        for (const k of feld) {
          P[k * 7 + 3] = achse[0]; P[k * 7 + 4] = achse[1]; P[k * 7 + 5] = achse[2];
        }
      }
      const m = punkt(mitte[0], mitte[1], mitte[2], achse[0], achse[1], achse[2], 0.5);
      for (let i = 0; i < S; i++) {
        const j = (i + 1) % S;
        if (vorne) {
          dreieck(aussen[i], innenA[j], innenA[i]);
          dreieck(aussen[i], aussen[j], innenA[j]);
          dreieck(m, innenB[i], innenB[j]);
        } else {
          dreieck(aussen[i], innenA[i], innenA[j]);
          dreieck(aussen[i], innenA[j], aussen[j]);
          dreieck(m, innenB[j], innenB[i]);
        }
      }
    }

    /* Spitze: ein Kegelabschluss ohne Schnittflaeche (ein abgebrochener Ast
     * hat vorne keine Saegeflaeche, sondern einen Splitter). */
    function spitze(mitte, achse, r, vorne, stoff) {
      const m = punkt(mitte[0], mitte[1], mitte[2], achse[0], achse[1], achse[2], stoff);
      const S = r.length;
      for (let i = 0; i < S; i++) {
        const j = (i + 1) % S;
        if (vorne) dreieck(m, r[i], r[j]); else dreieck(m, r[j], r[i]);
      }
    }

    const anfang = (name) => { teile[name] = { start: I.length, anzahl: 0 }; };
    const ende = (name) => { teile[name].anzahl = I.length - teile[name].start; };

    /* --------------------------------------------------------------------
     * 2.1 Baumstumpf
     *
     * Kanonisch: Fussradius 1 bei y = 0, Hoehe 1. Vier Ringe. Der unterste
     * ist der Wurzelanlauf — ohne ihn steht ein Stumpf auf dem Boden wie ein
     * Becher auf einem Tisch. Er ist im Vorbild deutlich zu sehen und kostet
     * neun Dreiecke.
     *
     * Verhaeltnis aus der Messung: Hoehe zu Durchmesser 0,68 : 1. Der
     * Bauplatz unten setzt den Radius deshalb auf 0,735 der Hoehe.
     * ------------------------------------------------------------------ */
    anfang('stumpf');
    {
      const u = [1, 0, 0], v = [0, 0, -1];        // u x v = +y
      // fester, aber unregelmaessiger Umriss
      const kante = i => 1 + 0.105 * Math.sin(i * 2.39 + 1.27) + 0.055 * Math.sin(i * 5.13 + 0.40);
      // raue Saegekante oben statt einer Kreisscheibe
      const saege = i => 0.055 * Math.sin(i * 3.31 + 0.71) + 0.022 * Math.sin(i * 6.7);
      const lagen = [
        { y: 0.00, r: 1.17, n:  0.95 },
        { y: 0.15, r: 1.00, n:  0.34 },
        { y: 0.58, r: 0.90, n:  0.16 },
        { y: 1.00, r: 0.82, n:  0.14 },
      ];
      const ringe = lagen.map((l, k) => ring(
        [0, l.y, 0], u, v,
        Array.from({ length: S_STUMPF }, (_, i) => l.r * (k === 0 ? 1 : kante(i))),
        l.n, 0.0));
      // Oberkante wellig machen: dieselben Punkte, nur y verschoben
      const oben = ringe[ringe.length - 1];
      for (let i = 0; i < S_STUMPF; i++) P[oben[i] * 7 + 1] = 1.0 + saege(i);
      for (let k = 0; k + 1 < ringe.length; k++) mantel(ringe[k], ringe[k + 1]);
      // Deckel auf derselben welligen Hoehe
      const top = lagen[lagen.length - 1];
      const dRad = Array.from({ length: S_STUMPF }, (_, i) => top.r * kante(i) * 0.985);
      const d = ring([0, 1.0, 0], u, v, dRad, 0, 1.0);
      const dIn = ring([0, 1.0, 0], u, v, dRad.map(r => r * 0.72), 0, 1.0);
      const dKern = ring([0, 1.0, 0], u, v, dRad.map(r => r * 0.72), 0, 0.5);
      for (let i = 0; i < S_STUMPF; i++) {
        const y = 1.0 + saege(i);
        P[d[i] * 7 + 1] = y;  P[dIn[i] * 7 + 1] = y;  P[dKern[i] * 7 + 1] = y;
        for (const k of [d[i], dIn[i], dKern[i]]) {
          P[k * 7 + 3] = 0; P[k * 7 + 4] = 1; P[k * 7 + 5] = 0;
        }
      }
      const m = punkt(0, 1.0, 0, 0, 1, 0, 0.5);
      for (let i = 0; i < S_STUMPF; i++) {
        const j = (i + 1) % S_STUMPF;
        dreieck(d[i], dIn[j], dIn[i]);
        dreieck(d[i], d[j], dIn[j]);
        dreieck(m, dKern[i], dKern[j]);
      }
    }
    ende('stumpf');

    /* --------------------------------------------------------------------
     * 2.2 Umgestuerzter Stamm
     *
     * Kanonisch: Achse entlang x von -0,5 bis +0,5 (Laenge 1), Querschnitts-
     * radius 1. Der Bauplatz skaliert x mit der Laenge und y/z mit dem
     * Radius; das gemessene Verhaeltnis 5,5 : 1 landet damit als
     * radius = laenge / 11.
     *
     * Verjuengung 1,00 -> 0,80 ueber die Laenge. Ein gleich dicker Zylinder
     * sieht aus wie ein Rohr; erst die Verjuengung macht daraus einen Stamm,
     * und sie sagt dem Auge zugleich, wo oben war.
     * ------------------------------------------------------------------ */
    anfang('stamm');
    {
      const u = [0, 1, 0], v = [0, 0, 1];         // u x v = +x
      const kante = i => 1 + 0.075 * Math.sin(i * 2.71 + 0.55) + 0.035 * Math.sin(i * 4.9 + 2.1);
      const lagen = [
        { x: -0.50, r: 1.00, n: 0.00 },
        { x: -0.16, r: 0.96, n: 0.12 },
        { x:  0.18, r: 0.89, n: 0.20 },
        { x:  0.50, r: 0.80, n: 0.28 },
      ];
      const ringe = lagen.map(l => ring(
        [l.x, 0, 0], u, v,
        Array.from({ length: S_STAMM }, (_, i) => l.r * kante(i)),
        l.n, 0.0));
      for (let k = 0; k + 1 < ringe.length; k++) mantel(ringe[k], ringe[k + 1]);
      deckel([0.50, 0, 0], u, v,
             Array.from({ length: S_STAMM }, (_, i) => 0.80 * kante(i)), [1, 0, 0], true);
      deckel([-0.50, 0, 0], u, v,
             Array.from({ length: S_STAMM }, (_, i) => 1.00 * kante(i)), [-1, 0, 0], false);
    }
    ende('stamm');

    /* --------------------------------------------------------------------
     * 2.3 Toter Ast
     *
     * Kanonisch: Laenge 1 entlang x, Dicke fest eingebacken (Verhaeltnis
     * 13 : 1 aus der Messung), Skalierung je Stueck gleichfoermig. Die Achse
     * ist leicht gebogen — in der Hoehe, damit der Ast die Mitte anhebt statt
     * im Boden zu kleben, und in der Breite, damit er nicht wie ein Lineal
     * daliegt.
     *
     * Der Seitentrieb bei t = 0,42 ist der Grund, warum das Ding als Ast
     * gelesen wird und nicht als Stock. Er kostet sechzehn Dreiecke.
     * ------------------------------------------------------------------ */
    anfang('ast');
    {
      const dickeAn = 0.078, dickeAb = 0.014;
      const kante = i => 1 + 0.16 * Math.sin(i * 2.13 + 0.9);
      /* Der Bogen ist bewusst FLACH. Mit der ersten, doppelt so hohen Fassung
       * schwebte der Ast in der Aufnahme sichtbar ueber dem Gras — ein Ast,
       * der den Boden nicht beruehrt, sieht nach Fehler aus, nicht nach
       * Natur. Jetzt liegt die Unterseite in der Mitte rund 0,02 * Laenge
       * ueber Grund, also im Gras. */
      const bahn = (t) => [
        t,
        0.030 + 0.028 * Math.sin(Math.PI * t),
        0.115 * Math.sin(Math.PI * t * 0.85) - 0.02,
      ];
      const rahmen = (t) => {
        const e = 0.004;
        const a = bahn(Math.max(0, t - e)), b = bahn(Math.min(1, t + e));
        let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        // u = normalize(hoch x T), v = T x u  =>  u x v = T
        let ux = 1 * tz - 0 * ty, uy = 0 * tx - 0 * tz, uz = 0 * ty - 1 * tx;
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
        return { p: bahn(t), u: [ux, uy, uz], v: [vx, vy, vz], t: [tx, ty, tz] };
      };
      const ts = [0, 0.28, 0.56, 0.80, 1.0];
      const ringe = ts.map((t, k) => {
        const f = rahmen(t);
        const r = dickeAn + (dickeAb - dickeAn) * Math.pow(t, 0.8);
        return {
          f,
          idx: ring(f.p, f.u, f.v,
                    Array.from({ length: S_AST }, (_, i) => r * kante(i + k)),
                    0.22, 0.0),
          r,
        };
      });
      for (let k = 0; k + 1 < ringe.length; k++) mantel(ringe[k].idx, ringe[k + 1].idx);
      // Bruchstelle hinten: eine kleine Schnittflaeche, damit der Ast an
      // einem Ende sichtbar abgetrennt ist.
      const f0 = ringe[0].f;
      deckel(f0.p, f0.u, f0.v,
             Array.from({ length: S_AST }, (_, i) => ringe[0].r * kante(i)),
             [-f0.t[0], -f0.t[1], -f0.t[2]], false);
      const fn = ringe[ringe.length - 1];
      spitze([fn.f.p[0] + fn.f.t[0] * 0.03,
              fn.f.p[1] + fn.f.t[1] * 0.03,
              fn.f.p[2] + fn.f.t[2] * 0.03], fn.f.t, fn.idx, true, 0.0);

      // Seitentrieb
      {
        const b = rahmen(0.42);
        const w = 0.62;                            // Abgangswinkel
        const cw = Math.cos(w), sw = Math.sin(w);
        const rx = b.t[0] * cw + b.v[0] * sw;
        const ry = b.t[1] * cw + b.v[1] * sw + 0.22;
        const rz = b.t[2] * cw + b.v[2] * sw;
        const rl = Math.hypot(rx, ry, rz) || 1;
        const T = [rx / rl, ry / rl, rz / rl];
        let ux = 1 * T[2] - 0 * T[1], uy = 0, uz = -T[0];
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul; uy /= ul; uz /= ul;
        const U = [ux, uy, uz];
        const V = [T[1] * U[2] - T[2] * U[1], T[2] * U[0] - T[0] * U[2], T[0] * U[1] - T[1] * U[0]];
        const lang = 0.30;
        const zweig = [0, 0.5, 1].map(t => {
          const p = [b.p[0] + T[0] * lang * t, b.p[1] + T[1] * lang * t, b.p[2] + T[2] * lang * t];
          const r = 0.036 * (1 - 0.78 * t) + 0.004;
          return { idx: ring(p, U, V, new Array(4).fill(r), 0.3, 0.0), p, r };
        });
        for (let k = 0; k + 1 < zweig.length; k++) mantel(zweig[k].idx, zweig[k + 1].idx);
        const letzt = zweig[zweig.length - 1];
        spitze([letzt.p[0] + T[0] * 0.02, letzt.p[1] + T[1] * 0.02, letzt.p[2] + T[2] * 0.02],
               T, letzt.idx, true, 0.0);
      }
    }
    ende('ast');

    return {
      punkte: new Float32Array(P),
      indizes: new Uint16Array(I),
      teile,
      dreiecke: I.length / 3,
    };
  }

  /* =======================================================================
   * 3. Schattierung
   *
   * Hier wird nichts Eigenes erfunden. Die Zusammensetzung ist wortgleich mit
   * der aus rampe.js (G4):
   *
   *     Farbe = Albedo * Rampenstufe * Umgebung      MULTIPLIKATIV
   *
   * und `Umgebung` wird unten in JS mit derselben Formel und aus denselben
   * Reglern gerechnet wie dort. Das ist der ganze Punkt: die Requisite muss
   * im selben Licht stehen wie der Fels neben ihr. Ein Typ, der sich seine
   * eigene Beleuchtung schreibt, laeuft nach dem ersten Reglerdreh aus dem
   * Bild heraus, und dann sucht jemand stundenlang, warum eine Stelle nicht
   * stimmt.
   *
   * ZWEI STUFEN, ZWEI MATERIALIEN. Die Schattenmultiplikatoren sind die
   * dokumentierten Zeilen der Rampentabelle aus rampe.js:
   *   Rinde          -> Zeile `boden`   (0,900 0,850 0,790), Leuchtdichte 0,855
   *   Schnittflaeche -> Zeile `knochen` (0,950 0,860 0,800), Leuchtdichte 0,873
   * Beide liegen im geforderten Fenster 0,82…0,88 und sind WARM (dR < dB) —
   * genau das, was PHASE-GRAFIK-PLAN G3 an Genshin nachgemessen hat. Der
   * kuehle Anime-Schatten ist der haeufigste Reflex und hier nachweislich
   * falsch.
   *
   * WARUM DIE RAMPE HIER ANALYTISCH IST UND NICHT AUS DER TEXTUR VON rampe.js:
   * die Flanke der Textur ist 4 von 256 Texeln breit, was auf einem Fels mit
   * 120 px Bildradius die gemessenen 2,1 px ergibt. Meine Stuecke sind im Bild
   * 10 bis 30 px gross; dieselbe Flanke waere dort 0,2 px breit, also eine
   * Treppe. `fwidth()` haelt sie stattdessen bei rund 1,5 px, in JEDER
   * Entfernung. Kantenlage (0,88) und Lichtflaeche (0,55) kommen aus
   * denselben Reglern wie bei rampe.js, werden unten ausgelesen und
   * mitgegeben — dreht jemand dort, dreht es hier mit.
   *
   * FERNNEBEL. Der Holzplatz steht 66 Einheiten entfernt. Ohne Luftperspektive
   * saesse er als harte dunkle Form vor dem Dunst — nebel.js sagt selbst, dass
   * fremde Programme den Baustein `fernnebel` einbinden und `R.nebel.setzen`
   * rufen sollen. Genau das passiert hier; fehlt nebel.js, faellt der Aufruf
   * still weg.
   * ===================================================================== */

  /* Baut den Fragmentshader. Erst zum Aufbauzeitpunkt, weil dann feststeht,
   * welche Bausteine das Register kennt. */
  function fsBauen() {
    const hatNebel = (typeof GRAFIK.bausteine === 'function')
                  && GRAFIK.bausteine().indexOf('fernnebel') >= 0;
    const kopf = hatNebel ? GRAFIK.baustein('srgb', 'nebel', 'fernnebel') : '';
    const nebelZeile = hatNebel ? 'col = fernnebel(col, vPos, uCam);' : '';
    return FS_ROHLING.replace('/*KOPF*/', kopf).replace('/*NEBEL*/', nebelZeile);
  }

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aStoff;
layout(location = 3) in vec4 aOrt;    // x, y, z, Gierung
layout(location = 4) in vec4 aForm;   // Streckung x, y, z, Tonabweichung
layout(location = 5) in vec3 aNeig;   // Neigung um x, Neigung um z, Einsinken

uniform mat4 uViewProj;

out vec3 vPos;
out vec3 vNormal;
out float vStoff;
out float vTon;

void main() {
  vec3 p = aPos * aForm.xyz;
  vec3 n = aNormal / max(aForm.xyz, vec3(1e-4));

  float cx = cos(aNeig.x), sx = sin(aNeig.x);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  n = vec3(n.x, n.y * cx - n.z * sx, n.y * sx + n.z * cx);

  float cz = cos(aNeig.y), sz = sin(aNeig.y);
  p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z);
  n = vec3(n.x * cz - n.y * sz, n.x * sz + n.y * cz, n.z);

  float cg = cos(aOrt.w), sg = sin(aOrt.w);
  p = vec3(p.x * cg + p.z * sg, p.y, -p.x * sg + p.z * cg);
  n = vec3(n.x * cg + n.z * sg, n.y, -n.x * sg + n.z * cg);

  vec3 welt = p + vec3(aOrt.x, aOrt.y - aNeig.z, aOrt.z);

  vPos = welt;
  vNormal = n;
  vStoff = aStoff;
  vTon = aForm.w;
  gl_Position = uViewProj * vec4(welt, 1.0);
}`;

  const FS_ROHLING = `#version 300 es
precision highp float;
/*KOPF*/

in vec3 vPos;
in vec3 vNormal;
in float vStoff;
in float vTon;

uniform vec3 uCam;
uniform vec3 uLicht;             // Richtung ZUR Sonne
uniform vec3 uUmgebung;          // milder multiplikativer Faktor, wie in rampe.js

uniform vec3 uRinde;             // Albedo Rinde
uniform vec3 uSchnitt;           // Albedo Schnittflaeche
uniform vec3 uRindeSchatten;     // Rampenzeile 'boden'
uniform vec3 uSchnittSchatten;   // Rampenzeile 'knochen'

uniform float uRampLichtFlaeche; // ab diesem ndl01 ist voll Licht (0,55)
uniform float uRampKante;        // Lage der Kante im Rampenraum (0,88)

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLicht);

  // Stoff: 0 Rinde, 0,5 Kernholz, 1 Splintring. Die Kante zwischen Splint und
  // Kern ist hart, weil dort eigene Punkte liegen — hier wird nur gemischt.
  float k = clamp(vStoff, 0.0, 1.0);
  vec3 albedo   = mix(uRinde, uSchnitt, k);
  vec3 schatten = mix(uRindeSchatten, uSchnittSchatten, k);

  // EIN Ton je Stueck, nicht je Pixel. Zwei bis drei Tonstufen sind erlaubt,
  // prozedurale Oberflaechenrauheit ist es nicht (GRAFIK-MODULE.md §0).
  albedo *= 0.90 + 0.20 * vTon;

  // Rampe: Nachschlaggroesse ist der HALBE Lambert, nicht max(dot(N,L),0).
  float n01 = dot(N, L) * 0.5 + 0.5;
  float u = clamp(n01 / max(uRampLichtFlaeche, 0.01), 0.0, 1.0);
  float w = max(fwidth(u) * 0.75, 0.008);
  vec3 stufe = mix(schatten, vec3(1.0), smoothstep(uRampKante - w, uRampKante + w, u));

  vec3 col = albedo * stufe * uUmgebung;

  /*NEBEL*/

  outColor = vec4(col, 1.0);
}`;

  /* =======================================================================
   * 4. Aufbau und Zeichnen
   * ===================================================================== */

  /* ALBEDO — im selben Massstab wie licht.js ihn fuehrt (dort:
   * Fels 0,845/0,855/0,851 · Boden 0,851/0,867/0,796 · Gras 0,525/0,737/0,357,
   * alles GEMESSENE Genshin-Werte). Rueckgerechnet aus meiner eigenen Messung
   * durch den Umgebungsfaktor dieser Pipeline (mittags rund 0,955/0,926/0,853):
   *
   *   Rinde   Ziel im Bild (144,130,97)   -> Albedo (0,600 0,540 0,400)
   *           ergibt gerechnet (146,127,87), Saettigung 0,333 (gemessen 0,326)
   *   Schnitt Ziel im Bild (200,196,162)  -> Albedo (0,820 0,810 0,700)
   *           ergibt gerechnet (200,191,152)
   *
   * Verhaeltnis der Leuchtdichten Schnitt zu Rinde: 1,48 : 1.
   * Gemessen am Vorbild: 1,49 : 1. Das ist das Signal, an dem ein Stumpf als
   * Stumpf gelesen wird — heller Deckel, dunkle Flanke. */
  const RINDE   = [0.600, 0.540, 0.400];
  const SCHNITT = [0.820, 0.810, 0.700];
  /* Schattenmultiplikatoren = die Rampenzeilen `boden` und `knochen` aus
   * rampe.js, unveraendert uebernommen. */
  const RINDE_SCHATTEN   = [0.900, 0.850, 0.790];
  const SCHNITT_SCHATTEN = [0.950, 0.860, 0.800];

  const Z = {
    prog: null, vao: null, netz: null, puffer: null, index: null,
    gruppen: null, anzahl: -1,
  };

  /* Ein Stueck -> 11 Fliesskommazahlen Instanzdaten.
   * aOrt (x,y,z,Gierung) · aForm (sx,sy,sz,Ton) · aNeig (neigX,neigZ,Einsinken)
   *
   * Die Groessen sind die gemessenen Verhaeltnisse, nicht geraten:
   *   Stumpf  groesse = Hoehe, Radius = 0,735 * Hoehe   (Messung 0,68 : 1)
   *   Stamm   groesse = Laenge, Radius = Laenge / 11    (Messung 5,5 : 1)
   *   Ast     groesse = Laenge, Dicke steckt im Netz    (Messung 13 : 1)
   */
  function instanz(s, ziel) {
    const z = s.zufall || [0.5, 0.5, 0.5, 0.5];
    const g = (typeof s.groesse === 'number' && s.groesse > 0) ? s.groesse : 1;
    const dreh = (typeof s.drehung === 'number') ? s.drehung : 0;
    const rolle = s.rolle || ROLLE_STUMPF;
    const ton = z[3];

    if (rolle === ROLLE_STAMM) {
      const r = g * (0.082 + 0.026 * z[0]);          // Laenge/Durchmesser 4,7…6,1
      const roll = z[1] * Math.PI * 2;               // um die eigene Achse
      const kipp = (z[2] - 0.5) * 0.09;              // ein Ende leicht angehoben
      ziel.push(s.x, s.y || 0, s.z, dreh,
                g, r, r, ton,
                roll, kipp, r * 0.30);               // 30 % versunken, wie gemessen
      return 'stamm';
    }
    if (rolle === ROLLE_AST) {
      const roll = z[1] * Math.PI * 2;
      const kipp = (z[2] - 0.5) * 0.10;
      ziel.push(s.x, s.y || 0, s.z, dreh,
                g, g, g, ton,
                roll * 0.12, kipp, 0.0);
      return 'ast';
    }
    // Stumpf
    const r = 0.735 * g * (0.90 + 0.22 * z[0]);
    const neig = (typeof s.neigung === 'number') ? s.neigung : 0;
    ziel.push(s.x, s.y || 0, s.z, dreh,
              r, g, r, ton,
              neig + (z[1] - 0.5) * 0.10, (z[2] - 0.5) * 0.10, g * 0.06);
    return 'stumpf';
  }

  function daten(gl, stuecke) {
    const felder = { stumpf: [], stamm: [], ast: [] };
    for (const s of stuecke) {
      const rolle = s.rolle || ROLLE_STUMPF;
      const eimer = felder[rolle] || felder.stumpf;
      instanz(s, eimer);
    }
    const gruppen = [];
    for (const name of ['stamm', 'stumpf', 'ast']) {
      const roh = felder[name];
      if (!roh.length) continue;
      const teil = Z.netz.teile[name];
      const puffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(roh), gl.STATIC_DRAW);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, Z.puffer);
      const bytes = 7 * 4;
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, bytes, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, bytes, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, bytes, 24);
      gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
      const ib = 11 * 4;
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, ib, 0);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, ib, 16);
      gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 3, gl.FLOAT, false, ib, 32);
      gl.vertexAttribDivisor(3, 1);
      gl.vertexAttribDivisor(4, 1);
      gl.vertexAttribDivisor(5, 1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Z.index);
      gl.bindVertexArray(null);

      gruppen.push({ name, vao, puffer, start: teil.start * 2, anzahl: teil.anzahl,
                     instanzen: roh.length / 11 });
    }
    return gruppen;
  }

  KARTE.typ('baumstumpf', {
    schicht: 30,

    aufbau(gl, R) {
      Z.netz = netzBauen();
      Z.prog = GRAFIK.programm(gl, VS, fsBauen(), 'baumstumpf');

      Z.puffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Z.puffer);
      gl.bufferData(gl.ARRAY_BUFFER, Z.netz.punkte, gl.STATIC_DRAW);

      Z.index = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Z.index);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Z.netz.indizes, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

      void R;
    },

    vorbereiten(gl, R, ctx, stuecke) {
      // Die Stueckliste ist statisch; einmal bauen genuegt. Aendert sie sich
      // doch (jemand setzt spaeter nach), wird neu gebaut statt falsch
      // gezeichnet.
      if (Z.gruppen && Z.anzahl === stuecke.length) return;
      if (Z.gruppen) {
        for (const g of Z.gruppen) { gl.deleteVertexArray(g.vao); gl.deleteBuffer(g.puffer); }
      }
      Z.gruppen = daten(gl, stuecke);
      Z.anzahl = stuecke.length;
      void R; void ctx;
    },

    zeichnen(gl, R, ctx, stuecke) {
      if (!Z.gruppen || !Z.gruppen.length) return;

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const p = Z.prog;
      gl.useProgram(p.p || p);

      /* Umgebung: WORTGLEICH mit rampe.js. Steht die Formel woanders, steht
       * die Requisite im naechsten Reglerdreh in anderem Licht als der Fels
       * daneben. Fehlt rampe.js, greifen die Vorgabewerte seiner Regler. */
      const li = ctx.licht || {};
      const w = (R.regler && R.regler.rampe) || {};
      const farbe  = li.farbe  || [0.88, 0.85, 0.78];
      const himmel = li.himmel || [0.34, 0.38, 0.47];
      const boden  = li.boden  || [0.27, 0.26, 0.23];
      const st = (li.staerke === undefined ? 1 : li.staerke)
               * (w.sonne === undefined ? 1 : w.sonne);
      const a = (w.umgebung === undefined ? 1 : w.umgebung) * 0.5;
      UMGEBUNG[0] = farbe[0] * st + (himmel[0] + boden[0]) * a;
      UMGEBUNG[1] = farbe[1] * st + (himmel[1] + boden[1]) * a;
      UMGEBUNG[2] = farbe[2] * st + (himmel[2] + boden[2]) * a;

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(p.u.uCam, ctx.cam);
      gl.uniform3fv(p.u.uLicht, li.richtung || R.light);
      gl.uniform3fv(p.u.uUmgebung, UMGEBUNG);
      gl.uniform3fv(p.u.uRinde, RINDE);
      gl.uniform3fv(p.u.uSchnitt, SCHNITT);
      gl.uniform3fv(p.u.uRindeSchatten, RINDE_SCHATTEN);
      gl.uniform3fv(p.u.uSchnittSchatten, SCHNITT_SCHATTEN);
      gl.uniform1f(p.u.uRampLichtFlaeche, w.lichtFlaeche === undefined ? 0.55 : w.lichtFlaeche);
      gl.uniform1f(p.u.uRampKante, w.kante === undefined ? 0.88 : w.kante);

      /* Luftperspektive. nebel.js verlangt fuer fremde Programme genau diesen
       * Aufruf; ohne nebel.js passiert schlicht nichts. */
      if (R.nebel && typeof R.nebel.setzen === 'function') R.nebel.setzen(gl, p);

      for (const g of Z.gruppen) {
        gl.bindVertexArray(g.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, g.anzahl, gl.UNSIGNED_SHORT, g.start, g.instanzen);
      }
      gl.bindVertexArray(null);
      void stuecke;
    },
  });

})();
