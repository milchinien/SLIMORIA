'use strict';
/* ===========================================================================
 * grafik/props/blume.js — Blueten und Farbtupfer.
 *
 * Besitzer: Lane KARTE. Vertrag: GRAFIK-MODULE.md §3 und §2, Register in
 * grafik/karte.js (KARTE.typ). Diese Datei besitzt AUSSCHLIESSLICH sich
 * selbst; world.js, karte.js und renderer2.js werden gelesen, nie geaendert.
 *
 * WAS DIESER TYP IST
 *   Der einzige gesaettigte Farbakzent der Arena. Alles andere — Boden, Gras,
 *   Busch, Fels — liegt im Gruen-Grau-Band. Deshalb ist eine Bluete hier kein
 *   Fuellmaterial, sondern ein ZEIGEFINGER: sie steht dort, wo der Spieler
 *   hinsehen soll, und sonst nirgends.
 *
 * DIE VIER GRENZEN, an denen sich diese Datei messen laesst
 *   1. Der Schleim ist die Figur (GDD 10 §69/§98). Die hoechste Bluete misst
 *      0,103 Einheiten — ein Zehntel des Schleimradius. Sie kann ihn nicht
 *      verdecken. Der Wert wird beim Aufbau ueber ALLE Blueten und ALLE
 *      erlaubten Neigungen nachgerechnet (hoeheFaktor), nicht behauptet, und
 *      meldet sich mit console.warn, sobald jemand an Kopf, Stiel oder
 *      Neigung dreht und dabei ueber 0,15 kommt.
 *   2. Keine Kollision. Diese Datei ruft istFrei() und bodenHoehe() nie und
 *      aendert kein Hindernis. Sie zeichnet, was karte.js ihr hinlegt.
 *   3. Kein Math.random, kein Date, kein performance.now. Jede Zahl faellt
 *      aus der Weltposition oder aus s.zufall/s.variante, die karte.js
 *      bereits ortsgehasht mitliefert. Zeit nur ueber ctx.time.
 *   4. Der alte Renderpfad bleibt unberuehrt — diese Datei laeuft nur unter
 *      ?renderer=2.
 *
 * ---------------------------------------------------------------------------
 * WAS AM ECHTEN MATERIAL GEMESSEN WURDE (ref/genshin/, eigene Pixelmessung)
 *
 * Farbe der Bluete gegen das Gras darum:
 *   landschaft_sumeru_wiese_see_tag_2560, Wiese links vorn
 *     Bluetenblatt   (255, 245,  63)      Gras im selben Fenster (143, 204, 100)
 *     -> Luma 234 gegen 184, also +50 Stufen; Saettigung 0,75 gegen 0,51.
 *   landschaft_sumeru_dorf_tag_2560, Blueten auf den Buschbeeten
 *     Lichtseite     (255, 241,  91)      Schattenseite     (192, 166,  45)
 *     -> Verhaeltnis Schatten zu Licht 0,753 / 0,689 / 0,494.
 *        ZWEI Plateaus, kein Verlauf. Genau die Vorgabe aus GRAFIK-MODULE.md §0.
 *   landschaft_wiese_mittag_figur_2560, Wiese links unten
 *     Bluetenblatt   (235,  90, 197)      haeufigster Mischwert (240, 155, 220)
 *   gras_halme_nahaufnahme_tag_1366
 *     Bluetenblatt   (235, 237, 221) mit gelbem Auge, auf Gras (150, 203,  86)
 *
 * Groesse im Verhaeltnis zur Figur:
 *   landschaft_wiese_mittag_figur_2560: Figur 307 px hoch, Bluetenkopf 12–16 px
 *   -> Kopf rund 4,5 % der Figurenhoehe. Der Schleim misst 2,0 Einheiten quer,
 *      also Kopf rund 0,09–0,18 Einheiten. Genau dort liegt der Wert unten.
 *
 * Verteilung:
 *   Im Blutenfleck von landschaft_wiese_mittag_figur_2560 sind 5941 von 99200
 *   Pixeln Bluete, also 6,0 % der Bodenflaeche. Zwei Bildbreiten weiter: 0,0 %.
 *   In gras_nahaufnahme_daemmerung_2560 kommt auf dem ganzen Vordergrundhang
 *   KEINE einzige Bluete vor — der Farbakzent traegt dort ein einzelner roter
 *   Baum. Das ist der Befund, auf dem die Auswahl unten steht: Blueten sind
 *   entweder dicht beieinander oder gar nicht da. Gleichmaessig gestreut
 *   kommen sie in keinem einzigen der Referenzbilder vor.
 *
 * Bauform:
 *   Genshins Wiesenbluete ist ein bis zwei texturierte Vierecke. Texturen gibt
 *   es hier nicht, also muss die Form die Arbeit tun: fuenf Blaetter zu je vier
 *   Dreiecken plus zwei flach liegende Blaetter am Fuss = 24 Dreiecke je
 *   Bluete. Bei 15 px Bildgroesse ist das die Untergrenze, unter der ein
 *   Bluetenstern zum Klecks wird.
 *
 * ---------------------------------------------------------------------------
 * WOHIN SIE GESETZT WERDEN — und warum das hier steht und nicht in karte.js
 *
 * karte.js legt 150 Blumenorte an: Ruhefeld, Uebergangsguertel, Plateau. Diese
 * Datei setzt keinen einzigen Ort dazu und verschiebt keinen. Sie WAEHLT AUS.
 * Das ist die Freiheit, die dem Typ gehoert: wie viele seiner Stuecke er
 * wirklich zeigt und wie er sie zu Gruppen bindet.
 *
 * Ausgewaehlt wird ueber ein Inselfeld: ein grobes Ortsgitter, in dem nur ein
 * Teil der Zellen eine "Insel" traegt. Wer in keiner Insel liegt, wird nicht
 * gezeichnet. Damit entsteht genau der Befund von oben — Flecken mit kahlen
 * Zwischenraeumen statt Puder. Dazu kommen sieben von Hand gesetzte Inseln an
 * den Orten, an denen der Blick hin soll:
 *
 *   Plateau (-13,-12)    Der Absprungpunkt (GDD 01 §20). Koralle auf der
 *                        Oberkante und am Suedfuss, damit die Kante auch von
 *                        unten als Kante liest.
 *   Friedhof (-18,-18)   Ein RING, innen 3,4, aussen 7,0. Die Senke und der
 *                        Respawnpunkt bleiben KAHL — karte.js 6.8 will das
 *                        so, und die leere Mitte ist es, die den Farbkranz
 *                        ueberhaupt zu einem Kranz macht. Abnahmepunkt 22.
 *   Passage z=14         Zwei Inseln an den AUSSENflanken der beiden Mauern,
 *                        warmes Gelb neben den vier Torlaternen. In der Gasse
 *                        selbst liegt kein Stueck (SCHUTZ in karte.js), also
 *                        wachsen dort auch keine Blueten — der Weg bleibt der
 *                        einzige saubere Durchlass.
 *   Ruhefeld             ZWEI kleine Tupfer, beide ausserhalb des
 *                        Startkreises. Nicht mehr. Das Ruhefeld ist die
 *                        ruhige Flaeche, auf der jede Bewegungsaufnahme
 *                        laeuft; drei Tupfer waeren schon Teppich.
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[blume] grafik/karte.js ist nicht geladen — der Typ meldet sich nicht an.');
    }
    return;
  }

  /* =======================================================================
   * 1. Deterministische Zahlen
   *
   * Wortgleich mit dem Mischer in karte.js, damit beide Dateien dieselbe
   * Zahlenfamilie benutzen und ein Fleck sich nicht gegen den anderen
   * verschiebt. Gefuettert wird ausschliesslich mit gerundeten
   * WELTKOORDINATEN plus Salz — nie mit einem laufenden Zaehler.
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
   * 2. Die Sorten
   *
   * Vier, mehr nicht. Eine Wiese mit sechs Blumenfarben sieht nach
   * Farbkasten aus; in jedem Referenzbild traegt ein Fleck GENAU EINE Farbe.
   * Deshalb haengt die Sorte an der Insel, nicht an der einzelnen Bluete.
   *
   * Kein Blau, kein Violett, kein Tuerkis — der Schleim ist Eldoran-blau
   * (0,13 / 0,58 / 0,97). Eine blaue Bluete waere ein zweiter blauer Fleck im
   * Bild und wuerde genau die Verwechslung stiften, die GDD 10 §98 verbietet.
   *
   * Die Zahlen sind so gewaehlt, dass die Rechnung im Fragment-Shader
   *     hell = bluete * (ambient + sonne * 0.86)
   * mit der Lichtvorgabe aus renderer2.js (ambient 0,34/0,38/0,47,
   * sonne 0,88/0,85/0,78) die oben gemessenen Bildwerte trifft:
   *     gelb    -> (255, 255,  73)   gemessen (255, 245,  63)
   *     magenta -> (255,  88, 198)   gemessen (235,  90, 197)
   *     weiss   -> (240, 246, 232)   gemessen (235, 237, 221)
   * ===================================================================== */

  const SORTEN = [
    /* 0 weiss   — Wiesenmargerite, gelbes Auge. Die ruhige Sorte fuers
     *             offene Feld: hell genug, um als Tupfer zu lesen, ohne
     *             den Blick festzuhalten. */
    { bluete: [0.86, 0.87, 0.80], kern: [1.00, 0.78, 0.16] },
    /* 1 gelb    — Sumeru-Wiesenblume. Der warme Fuehrungston: Torlaternen
     *             und Passagemuendung. */
    { bluete: [1.00, 0.96, 0.24], kern: [0.94, 0.60, 0.08] },
    /* 2 magenta — Mondstadt-Wiesenblume. Die staerkste Farbe im ganzen
     *             Bild und deshalb nur an EINEM Ort: am Friedhof. */
    { bluete: [0.94, 0.31, 0.68], kern: [1.00, 0.88, 0.62] },
    /* 3 koralle — Seidenblume. Nur auf und an der Plateaukante. Kraeftiger
     *             als die gemessene Vorlage, weil die Plateauoberkante ein
     *             warmer Braunton ist: mit (0,97/0,40/0,32) sass Farbe auf
     *             Farbe, mit (0,98/0,34/0,25) trennt sie sich. */
    { bluete: [0.98, 0.34, 0.25], kern: [1.00, 0.84, 0.50] },
  ];

  /* Blattgruen am Fuss. Dunkler als jedes Gras, damit die Bluete darauf
   * abhebt — in landschaft_sumeru_dorf_tag_2560 sitzen die gelben Blueten
   * ebenfalls auf deutlich dunklerem Laub, nie auf hellem Gras. */
  const BLATT = [0.26, 0.45, 0.19];

  /* =======================================================================
   * 3. Das Inselfeld
   * ===================================================================== */

  const GITTER = 7.6;          // Kantenlaenge einer Inselzelle
  const INSEL_ANTEIL = 0.52;   // Anteil der Zellen, die ueberhaupt eine tragen
  const SALZ = 51001;

  /* Von Hand gesetzte Inseln. Sie stehen ueber dem Gitter und tragen ihre
   * Sorte selbst. Die ERSTE, in der ein Stueck liegt, gewinnt — deshalb
   * steht das Plateau vor dem Friedhofsring: die Plateauoberkante liegt
   * 5,1 vom Friedhofsmittelpunkt entfernt und wuerde sonst magenta.
   *
   * Die Radien sind nicht gegriffen, sondern an den 150 Orten geprueft, die
   * karte.js wirklich anlegt. Dass die Suedmuendung der Passage nur einen
   * einzigen Horst traegt und der Friedhof nur drei, ist kein Versehen:
   * mehr Orte gibt es dort nicht, und Orte dazuzusetzen ist nicht die
   * Aufgabe dieser Datei. */
  const ANKER = [
    /* --- Plateau (-13,-12): der Absprungpunkt, GDD 01 §20.
     * Fuenf Horste auf der Oberkante, zwei am Suedfuss. Koralle, damit die
     * Kante auch von unten als Kante liest. */
    { x: -13.20, z: -11.90, r: 3.6, sorte: 3, dichte: 0.95 },
    { x: -13.00, z: -7.35, r: 2.6, sorte: 3, dichte: 0.70 },

    /* --- Friedhof (-18,-18): ein RING, keine Scheibe.
     * Innen 3,6 haelt die Senke und den Respawnpunkt (-17,2/-16,4) frei —
     * karte.js 6.8 will die Senke kahl, und die leere Mitte ist es, die den
     * Farbkranz ueberhaupt zu einem Kranz macht. Aussen 6,8, weil alle
     * Blumenorte des Friedhofs auf der ARENASEITE liegen: der Ring, den
     * karte.js streut, endet bei 25,5 vom Ursprung, und der Friedhof liegt
     * bei 25,46. Die Farbe steht damit genau dort, wo der Spieler nach dem
     * Tod ankommt und hinsieht. Abnahmepunkt 22. */
    { art: 'ring', x: -18, z: -18, mitte: 5.2, halb: 1.8, sorte: 2, dichte: 1.00 },

    /* --- Enge Passage bei z=14.
     * Nicht IN der Gasse — dort liegt kein einziges Stueck, karte.js haelt
     * sie als SCHUTZ frei, und genau daraus besteht der Weg. Die Blueten
     * stehen an den AUSSENflanken beider Mauern, neben den vier
     * Torlaternen: bewachsene Barriere links und rechts, sauberer Durchlass
     * in der Mitte. Warmes Gelb, weil es zur Laternenfarbe gehoert. */
    { x: 4.60, z: 12.20, r: 6.0, sorte: 1, dichte: 0.85 },
    { x: -6.00, z: 16.60, r: 6.0, sorte: 1, dichte: 0.78 },

    /* --- Ruhefeld: GENAU ZWEI Tupfer, je einer fuer eine der beiden
     * Messkameras. g-bodenlicht (yaw 2,10) sieht nach Sued-Ost, g-fernsicht
     * (yaw 0,90) nach Sued-West; die beiden Flecken liegen so, dass in
     * jedem der beiden Bilder einer im Mittelgrund steht und keiner vor dem
     * Schleim. Beide ausserhalb des Startkreises r 4,2. Drei waeren schon
     * Teppich — das Ruhefeld ist die ruhige Flaeche, auf der jede
     * Bewegungsaufnahme laeuft. */
    { x: 4.60, z: -3.20, r: 3.0, sorte: 1, dichte: 0.80 },
    { x: -2.30, z: -7.60, r: 3.0, sorte: 0, dichte: 0.75 },
  ];

  /**
   * Sucht die Insel, in der (x,z) liegt.
   * Rueckgabe: null oder { sorte, gewicht } mit gewicht 0..1 (weiche Kante).
   */
  function insel(x, z) {
    // 1. Handgesetzte Inseln haben Vorrang, die erste Treffende gewinnt.
    for (let i = 0; i < ANKER.length; i++) {
      const a = ANKER[i];
      const d = Math.hypot(x - a.x, z - a.z);
      let t;
      if (a.art === 'ring') {
        t = Math.abs(d - a.mitte) / a.halb;
      } else {
        t = d / a.r;
      }
      if (t >= 1) continue;
      /* anker: true heisst "wird NICHT ausgewuerfelt".
       *
       * Der erste Versuch liess auch Ankerorte durch dieselbe
       * Wahrscheinlichkeitspruefung laufen wie das offene Feld. Ergebnis im
       * Bild: an der Suedmuendung der Passage lagen drei Blumenorte, alle
       * drei fielen weg, und der Torbogen stand ohne einen einzigen Farbtupfer
       * da. Ein Zeigefinger, der mit 20 % Wahrscheinlichkeit fehlt, ist kein
       * Zeigefinger. `dichte` steuert hier nur noch, WIE VIELE Blueten je
       * Horst wachsen — dass er da ist, steht fest. */
      return { sorte: a.sorte, gewicht: a.dichte * (1 - 0.55 * t * t), anker: true };
    }

    // 2. Das Gitter. Drei mal drei Zellen absuchen, damit eine Insel auch
    //    ueber ihre Zellgrenze hinausreichen kann.
    const ci = Math.floor(x / GITTER), cj = Math.floor(z / GITTER);
    let beste = null, bestesGewicht = 0;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const i = ci + di, j = cj + dj;
        if (zahl(i, j, SALZ) >= INSEL_ANTEIL) continue;
        const mx = (i + 0.20 + 0.60 * zahl(i, j, SALZ + 1)) * GITTER;
        const mz = (j + 0.20 + 0.60 * zahl(i, j, SALZ + 2)) * GITTER;
        const r = 2.3 + 2.1 * zahl(i, j, SALZ + 3);
        const d = Math.hypot(x - mx, z - mz);
        if (d >= r) continue;
        const t = d / r;
        const g = 1 - t * t;
        if (g <= bestesGewicht) continue;
        bestesGewicht = g;
        // Im offenen Feld nur die beiden ruhigen Sorten: weiss oder gelb.
        // Magenta und Koralle bleiben den Ankerorten vorbehalten, sonst
        // zeigt der Zeigefinger in fuenf Richtungen gleichzeitig.
        beste = { sorte: (zahl(i, j, SALZ + 4) < 0.58) ? 0 : 1, gewicht: g };
      }
    }
    return beste;
  }

  /* =======================================================================
   * 4. Das Netz einer einzelnen Bluete
   *
   * Gerechnet in KOPFRADIEN, der Kopf liegt in der XZ-Ebene, +Y ist oben.
   * Der Vertex-Shader neigt, dreht, skaliert und verschiebt.
   *
   * Ein Blatt hat sechs Punkte (Fuss, Mitte, Spitze — je links und rechts)
   * und damit vier Dreiecke. Die Mitte ist die breiteste Stelle: erst
   * dadurch wird aus dem Dreieck eine Bluetenblattform. Fuenf Blaetter,
   * dazu zwei flach liegende Blaetter am Fuss.
   *
   * Punktdaten je Ecke: Ort(3), Normale(3), Rolle(2) = Kernanteil, Blattmarke
   * ===================================================================== */

  const BLATT_ZAHL = 5;
  const STIEL = 0.58;          // Hoehe der Kopfmitte in Kopfradien
  /* Kopfneigung gegen die Senkrechte. Die Obergrenze stand zuerst bei 0,78
   * (45 Grad) und war im Bild nachweisbar zu hoch: bei Kameranickwinkeln von
   * 0,12 bis 0,45 rad standen die staerker geneigten Koepfe fast in der
   * Blickebene und wurden zu Strichen — welke Blaetter statt Blueten.
   * 0,16 bis 0,50 (9 bis 29 Grad) laesst die Bluete nicken, wie sie es in
   * gras_halme_nahaufnahme_tag_1366 tut, und haelt sie aus jeder Kameralage
   * als Stern lesbar. */
  const NEIGUNG_MIN = 0.16;
  const NEIGUNG_MAX = 0.50;

  function netzBauen() {
    const pos = [], nor = [], rol = [], idx = [];

    function ecke(x, y, z, nx, ny, nz, kern, blatt) {
      pos.push(x, y, z); nor.push(nx, ny, nz); rol.push(kern, blatt);
      return (pos.length / 3) - 1;
    }

    /* --- fuenf Bluetenblaetter ---------------------------------------- */
    // Ringe: Radius, halbe Breite, Hoehe. Die leichte Wanne (0,10 innen auf
    // -0,04 aussen) gibt dem Stern eine Rundung, ohne einen einzigen
    // zusaetzlichen Punkt zu kosten.
    const RING = [
      { r: 0.10, b: 0.13, y: 0.10, kern: 1.00 },
      { r: 0.62, b: 0.30, y: 0.03, kern: 0.34 },
      { r: 1.00, b: 0.10, y: -0.04, kern: 0.00 },
    ];
    for (let k = 0; k < BLATT_ZAHL; k++) {
      const a = (k * 2 * Math.PI) / BLATT_ZAHL;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Blattnormale: leicht nach aussen gekippt, weil das Blatt in der
      // Wanne liegt. Ergibt zwei Tonstufen auf demselben Stern statt einer.
      const nx = ca * 0.16, nz = sa * 0.16, ny = 0.987;
      const reihe = [];
      for (let i = 0; i < RING.length; i++) {
        const R = RING[i];
        const px = R.r * ca, pz = R.r * sa;
        const qx = -sa * R.b, qz = ca * R.b;   // quer zur Blattachse
        reihe.push([
          ecke(px + qx, R.y, pz + qz, nx, ny, nz, R.kern, 0),
          ecke(px - qx, R.y, pz - qz, nx, ny, nz, R.kern, 0),
        ]);
      }
      for (let i = 0; i < RING.length - 1; i++) {
        const A = reihe[i], B = reihe[i + 1];
        idx.push(A[0], A[1], B[1], A[0], B[1], B[0]);
      }
    }

    /* --- zwei flach liegende Blaetter am Fuss --------------------------
     * Sie neigen sich NICHT mit dem Kopf (Blattmarke 1) und bleiben damit
     * am Boden liegen. Ihre Aufgabe ist, dass die Bluete aus etwas
     * herauswaechst statt in der Luft zu schweben. */
    for (const dreh of [1.75, -1.35]) {
      const ca = Math.cos(dreh), sa = Math.sin(dreh);
      const reihe = [];
      const LB = [
        { r: 0.15, b: 0.06, y: 0.055 },
        { r: 0.70, b: 0.30, y: 0.045 },
        { r: 1.20, b: 0.05, y: 0.030 },
      ];
      for (let i = 0; i < LB.length; i++) {
        const R = LB[i];
        const px = R.r * ca, pz = R.r * sa;
        const qx = -sa * R.b, qz = ca * R.b;
        reihe.push([
          ecke(px + qx, R.y, pz + qz, 0, 1, 0, 0, 1),
          ecke(px - qx, R.y, pz - qz, 0, 1, 0, 0, 1),
        ]);
      }
      for (let i = 0; i < LB.length - 1; i++) {
        const A = reihe[i], B = reihe[i + 1];
        idx.push(A[0], A[1], B[1], A[0], B[1], B[0]);
      }
    }

    return {
      pos: new Float32Array(pos),
      nor: new Float32Array(nor),
      rol: new Float32Array(rol),
      idx: new Uint16Array(idx),
      ecken: pos.length / 3,
      dreiecke: idx.length / 3,
    };
  }

  /* Hoechster Punkt des Netzes in Kopfradien, ueber alle erlaubten
   * Neigungen. Kein geschaetzter Wert — er wird abgetastet, damit die
   * Zusicherung "nichts hoeher als 0,15" nachrechenbar bleibt und nicht bei
   * der naechsten Formaenderung stillschweigend kippt. */
  function hoeheFaktor(netz) {
    let max = 0;
    for (let s = 0; s <= 16; s++) {
      const n = NEIGUNG_MIN + (NEIGUNG_MAX - NEIGUNG_MIN) * (s / 16);
      const cn = Math.cos(n), sn = Math.sin(n);
      for (let i = 0; i < netz.ecken; i++) {
        const y = netz.pos[i * 3 + 1], z = netz.pos[i * 3 + 2];
        const blatt = netz.rol[i * 2 + 1] > 0.5;
        const h = blatt ? y : (y * cn - z * sn) + STIEL;
        if (h > max) max = h;
      }
    }
    return max;
  }

  /* =======================================================================
   * 5. Die Stuecke zu Bueschen binden
   *
   * Ein Stueck aus karte.js ist EIN Ort. Was dort steht, ist kein einzelner
   * Halm mit einer Bluete, sondern ein Horst aus vier bis sieben Blueten —
   * so, wie sie in gras_halme_nahaufnahme_tag_1366 zu mehreren beieinander
   * sitzen. Eine einzelne Bluete alle zwei Meter waere genau das gepuderte
   * Bild, das in keinem Referenzbild vorkommt.
   *
   * Alle Zahlen fallen aus dem Ort des Stuecks. s.zufall und s.variante
   * liefert karte.js bereits ortsgehasht mit; fuer die Blueten INNERHALB
   * eines Horstes wird derselbe Ort mit einem festen Versatz je Bluete
   * gehasht. Kein laufender Zaehler, keine eigene Zufallsquelle.
   * ===================================================================== */

  /* KOPF und SPREIZUNG haengen zusammen und stehen beide auf einer Messung.
   *
   * KOPF: in landschaft_wiese_mittag_figur_2560 ist die Figur 307 px hoch und
   * ein Bluetenkopf 12–16 px breit, also 4,5 % der Figurenhoehe. Der Schleim
   * misst 2,0 Einheiten quer -> Kopfdurchmesser rund 0,09 bis 0,18. Bei
   * groesse 1,2 und oberer Streuung landet der Wert unten bei 0,21.
   *
   * SPREIZUNG: im Bluetenfleck derselben Aufnahme sind 6,0 % der Bodenflaeche
   * Bluetenblatt. Eine Bluete ueberdeckt rund 0,015 Flaecheneinheiten; auf
   * einer Horstscheibe von r 0,88 (2,43 Flaecheneinheiten) sind das
   * 0,146 / 0,015 = rund ZEHN Blueten. Deshalb sitzen unten sieben bis
   * fuenfzehn beieinander und nicht die vier, mit denen der erste Versuch
   * lief — vier ergaben im Bild ein Rieseln, keinen Fleck. */
  const KOPF = 0.072;          // Kopfradius bei groesse 1 und mittlerer Streuung
  const SPREIZUNG = 0.88;      // Radius des Horstes in Welteinheiten

  function instanzenBauen(stuecke, netz) {
    const ort = [], dreh = [], bl = [], kn = [];
    const orte = [];
    let horste = 0, verworfen = 0;
    const proSorte = [0, 0, 0, 0];

    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const I = insel(s.x, s.z);
      if (!I) { verworfen++; continue; }

      // Weiche Inselkante: je weiter aussen, desto eher faellt der Horst weg.
      // Nur im offenen Feld — Ankerorte stehen fest (siehe insel()).
      const z0 = (s.zufall && s.zufall[0] !== undefined) ? s.zufall[0] : 0.5;
      if (!I.anker && z0 > I.gewicht) { verworfen++; continue; }

      const sorte = SORTEN[I.sorte] || SORTEN[0];
      proSorte[I.sorte]++;
      orte.push([+s.x.toFixed(1), +s.z.toFixed(1), I.sorte, +I.gewicht.toFixed(2)]);
      horste++;

      const g = (s.groesse === undefined) ? 1 : s.groesse;
      const hx = Math.round(s.x * 64), hz = Math.round(s.z * 64);
      const z1 = (s.zufall && s.zufall[1] !== undefined) ? s.zufall[1] : 0.5;

      // Sieben bis fuenfzehn Blueten. Am Rand einer Insel weniger als in der
      // Mitte — dadurch franst der Fleck aus, statt eine Scheibe zu sein.
      const n = 7 + Math.floor(z1 * 3.01 + I.gewicht * 4.99);

      for (let k = 0; k < n; k++) {
        const u1 = zahl(hx + k * 7919, hz - k * 104729, SALZ + 11);
        const u2 = zahl(hx + k * 7919, hz - k * 104729, SALZ + 12);
        const u3 = zahl(hx + k * 7919, hz - k * 104729, SALZ + 13);
        const u4 = zahl(hx + k * 7919, hz - k * 104729, SALZ + 14);

        const rr = SPREIZUNG * g * Math.sqrt(u1);   // gleichverteilt in der Scheibe
        const aa = u2 * Math.PI * 2;
        const kopf = KOPF * g * (0.78 + 0.44 * u3);

        ort.push(s.x + rr * Math.cos(aa), s.y || 0, s.z + rr * Math.sin(aa), kopf);
        dreh.push(
          (s.drehung || 0) + u2 * Math.PI * 2,                       // Gierwinkel
          NEIGUNG_MIN + (NEIGUNG_MAX - NEIGUNG_MIN) * u4,            // Kopfneigung
          STIEL,                                                     // Stielhoehe
          (s.x * 0.63 + s.z * 0.41) + u1 * 1.7                       // Windphase
        );
        bl.push(sorte.bluete[0], sorte.bluete[1], sorte.bluete[2]);
        kn.push(sorte.kern[0], sorte.kern[1], sorte.kern[2]);
      }
    }

    const anzahl = ort.length / 4;
    return {
      anzahl, horste, verworfen, proSorte, orte,
      ort: new Float32Array(ort),
      dreh: new Float32Array(dreh),
      bluete: new Float32Array(bl),
      kern: new Float32Array(kn),
      dreiecke: anzahl * netz.dreiecke,
    };
  }

  /* =======================================================================
   * 6. Shader
   *
   * Schattierung nach GRAFIK-MODULE.md §0: ZWEI Tonstufen mit harter Kante,
   * kein Verlauf. Die Kantenbreite kommt aus fwidth, damit sie in jeder
   * Entfernung rund zwei Pixel bleibt — dieselbe Zahl, die im Dossier an
   * figur_fischl_oberkoerper_cel_crop gemessen wurde.
   *
   * Die Schattenstufe ist nicht geraten: (0,76 / 0,70 / 0,56) ist das an
   * landschaft_sumeru_dorf_tag_2560 gemessene Verhaeltnis (0,753 / 0,689 /
   * 0,494), im Blaukanal leicht angehoben. Grund: der gemessene Blauwert
   * steht bei 45 von 255 und ist damit die unsicherste der drei Zahlen;
   * mit 0,49 kippt der Schatten einer weissen Bluete ins Braune. 0,56 haelt
   * ihn farbig, wie §0 es verlangt ("Schatten farbig statt grau").
   * ===================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;      // Kopfradien
layout(location = 1) in vec3 aNorm;
layout(location = 2) in vec2 aRolle;    // x = Kernanteil, y = 1 bei Fussblatt
layout(location = 3) in vec4 aOrt;      // xyz Weltort, w = Kopfradius
layout(location = 4) in vec4 aDreh;     // Gierwinkel, Neigung, Stiel, Windphase
layout(location = 5) in vec3 aBluete;
layout(location = 6) in vec3 aKern;
uniform mat4 uViewProj;
uniform float uZeit;
uniform float uWind;
uniform vec3 uBlatt;
out vec3 vN;
out vec3 vW;
out vec3 vFarbe;
void main() {
  bool blatt = aRolle.y > 0.5;

  /* Wind: EINE gemeinsame Welle, wie das Gras sie bekommt. Sehr klein
   * (Vorgabe 0,055 rad), weil eine nickende Bluete Leben zeigt, eine
   * schwingende aber den Blick vom Schleim wegzieht. Zeit kommt
   * ausschliesslich aus ctx.time, also ist jede Aufnahme bitgleich. */
  float neig = blatt ? 0.0
                     : aDreh.y + uWind * sin(uZeit * 1.15 + aDreh.w);

  vec3 p = aPos;
  vec3 n = aNorm;
  if (!blatt) {
    float cn = cos(neig), sn = sin(neig);
    p = vec3(p.x, p.y * cn - p.z * sn, p.y * sn + p.z * cn);
    n = vec3(n.x, n.y * cn - n.z * sn, n.y * sn + n.z * cn);
    p.y += aDreh.z;
  }

  float cy = cos(aDreh.x), sy = sin(aDreh.x);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  n = vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);

  vec3 welt = aOrt.xyz + p * aOrt.w;
  vW = welt;
  vN = n;                                  // gleichfoermig skaliert, keine Normalmatrix
  vFarbe = blatt ? uBlatt : mix(aBluete, aKern, aRolle.x);
  gl_Position = uViewProj * vec4(welt, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vW;
in vec3 vFarbe;
uniform vec3 uLicht;      // Richtung zur Sonne
uniform vec3 uSonne;      // Lichtfarbe
uniform vec3 uAmbient;
uniform vec3 uDunst;
uniform float uBound;
out vec4 outColor;
void main() {
  /* BEWUSST OHNE gl_FrontFacing-Umkehr.
   *
   * Der erste Versuch drehte die Normale auf Rueckseiten um, wie es sich fuer
   * einen Koerper gehoert. Das Ergebnis war im Bild nachweisbar falsch: die
   * Haelfte aller Bluetenblaetter zeigte dem Rasterer ihre Rueckseite, bekam
   * eine nach UNTEN gedrehte Normale und landete auf der Schattenstufe. Aus
   * (255,255,73) wurde gemessene (176,144,48) — ockerbraun, wie welk.
   * Ein Bluetenblatt ist keine Huelle, sondern eine Flaeche mit einer
   * Oberseite; die zeigt nach oben, aus welcher Richtung man auch schaut.
   * Genau so behandelt Genshin sein doppelseitiges Laub. */
  vec3 N = normalize(vN);
  vec3 L = normalize(uLicht);

  vec3 hell   = clamp(vFarbe * (uAmbient + uSonne * 0.86), 0.0, 1.0);
  /* Schattenstufe. Gemessen an landschaft_sumeru_dorf_tag_2560:
   * (0,753 / 0,689 / 0,494). Hier auf (0,78 / 0,72 / 0,58) angehoben, und das
   * ist eine Entscheidung mit Grund: die gemessene Zahl stammt von einem
   * Busch im Kernschatten unter Blattwerk. Eine Bodenbluete steht offen unter
   * dem Himmel; mit 0,49 im Blaukanal kippt ihr Schatten bei 12 px Bildgroesse
   * ins Braune, und dann liest der ganze Fleck als welk statt als Farbe. */
  vec3 dunkel = hell * vec3(0.78, 0.72, 0.58);

  float hl = dot(N, L) * 0.5 + 0.5;       // Halblambert
  float w = fwidth(hl) * 0.9 + 0.004;     // Flanke rund 2 px, entfernungsstabil
  vec3 col = mix(dunkel, hell, smoothstep(0.5 - w, 0.5 + w, hl));

  /* Derselbe Dunstverlauf wie im Bodenprogramm von renderer2.js
   * (smoothstep(bound*0.7, bound*1.6, Abstand)). Laufen die beiden
   * auseinander, schwimmen am Arenarand Farbpunkte ueber grauem Boden. */
  col = mix(col, uDunst, smoothstep(uBound * 0.7, uBound * 1.6, length(vW.xz)));

  outColor = vec4(col, 1.0);
}`;

  /* =======================================================================
   * 7. Anmeldung
   * ===================================================================== */

  const Z = {                  // alles, was zwischen den Bildern liegen bleibt
    prog: null, vao: null, netz: null, daten: null,
    puffer: [], gebaut: false, hoehe: 0,
  };

  function attribut(gl, ort, groesse, daten) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(ort);
    gl.vertexAttribPointer(ort, groesse, gl.FLOAT, false, 0, 0);
    Z.puffer.push(b);
    return b;
  }

  KARTE.typ('blume', {
    /* Nach Stein und Buschwerk, vor allem Hohen. Blueten sind undurchsichtig
     * und schreiben Tiefe, die Schicht entscheidet also nur ueber die
     * Reihenfolge der Zeichenaufrufe, nicht ueber das Bild. */
    schicht: 30,

    aufbau(gl, R) {
      Z.prog = GRAFIK.programm(gl, VS, FS, 'blume');
      Z.netz = netzBauen();
      Z.hoehe = hoeheFaktor(Z.netz);
    },

    vorbereiten(gl, R, ctx, stuecke) {
      if (Z.gebaut) return;
      Z.gebaut = true;

      Z.daten = instanzenBauen(stuecke, Z.netz);

      /* Die Zusicherung, an der dieser Typ haengt: nichts von ihm ragt
       * hoeher als 0,15 Einheiten. Nachgerechnet, nicht behauptet. */
      let hoechste = 0;
      for (let i = 0; i < Z.daten.anzahl; i++) {
        const h = Z.daten.ort[i * 4 + 3] * Z.hoehe;
        if (h > hoechste) hoechste = h;
      }
      if (hoechste > 0.15 && console && console.warn) {
        console.warn('[blume] hoechste Bluete ' + hoechste.toFixed(3)
          + ' > 0,15 — Kopfradius oder Stiel senken.');
      }

      Z.vao = gl.createVertexArray();
      gl.bindVertexArray(Z.vao);

      attribut(gl, 0, 3, Z.netz.pos);
      attribut(gl, 1, 3, Z.netz.nor);
      attribut(gl, 2, 2, Z.netz.rol);

      attribut(gl, 3, 4, Z.daten.ort);    gl.vertexAttribDivisor(3, 1);
      attribut(gl, 4, 4, Z.daten.dreh);   gl.vertexAttribDivisor(4, 1);
      attribut(gl, 5, 3, Z.daten.bluete); gl.vertexAttribDivisor(5, 1);
      attribut(gl, 6, 3, Z.daten.kern);   gl.vertexAttribDivisor(6, 1);

      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Z.netz.idx, gl.STATIC_DRAW);
      Z.puffer.push(ib);

      gl.bindVertexArray(null);

      if (typeof window !== 'undefined') {
        window.BLUME_DIAGNOSE = {
          stuecke: stuecke.length,
          horste: Z.daten.horste,
          orte: Z.daten.orte,
          verworfen: Z.daten.verworfen,
          blueten: Z.daten.anzahl,
          proSorte: Z.daten.proSorte,
          dreieckeJeBluete: Z.netz.dreiecke,
          dreieckeGesamt: Z.daten.dreiecke,
          hoechsteBluete: +hoechste.toFixed(4),
        };
      }
    },

    zeichnen(gl, R, ctx) {
      if (!Z.daten || !Z.daten.anzahl) return;
      const li = ctx.licht || {};
      const p = Z.prog;

      gl.useProgram(p);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      /* Blaetter sind Flaechen ohne Rueckseite — eine weggeschnittene
       * Rueckseite waere im Bild ein Loch, sobald die Kamera unter die
       * Bluete kommt. */
      gl.disable(gl.CULL_FACE);

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform1f(p.u.uZeit, ctx.time || 0);
      gl.uniform1f(p.u.uWind, 0.055);
      gl.uniform3fv(p.u.uBlatt, BLATT);
      gl.uniform3fv(p.u.uLicht, li.richtung || [0.4, 0.8, 0.45]);
      gl.uniform3fv(p.u.uSonne, li.farbe || [0.88, 0.85, 0.78]);
      gl.uniform3fv(p.u.uAmbient, li.ambient || [0.34, 0.38, 0.47]);
      gl.uniform3fv(p.u.uDunst, li.dunst || [0.405, 0.415, 0.425]);
      gl.uniform1f(p.u.uBound, (ctx.welt && ctx.welt.bounds) || 26);

      gl.bindVertexArray(Z.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, Z.netz.idx.length,
                               gl.UNSIGNED_SHORT, 0, Z.daten.anzahl);
      gl.bindVertexArray(null);

      // Grundzustand wiederherstellen, damit der naechste Durchgang nicht
      // ohne Rueckseitenschnitt zeichnet.
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    },
  });

})();
