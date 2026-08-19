'use strict';
/* ===========================================================================
 * grafik/props/fern.js — DIE FERNE.
 *
 * Besitzer: Lane KARTE (Ausstattungstyp). Vertrag: GRAFIK-MODULE.md §3 und
 * das Register in grafik/karte.js. Angemeldet als Typ `fernberg`.
 *
 * WAS DIESE DATEI TUT
 *   Sie zeichnet die Huegel-, Tafelberg- und Gipfelsilhouetten, die karte.js
 *   auf den Ringen 44…88 und als drei Handsetzungen im Suedwesten gesetzt
 *   hat. Das ist der Unterschied zwischen "Testflaeche mit schwarzem Rand"
 *   und "Ausschnitt aus einer Welt" — mehr will sie nicht sein.
 *
 * WAS SIE AUSDRUECKLICH NICHT TUT
 *   - Sie fasst world.js nicht an. Jedes Stueck steht bei Radius >= 44, also
 *     weit ausserhalb der Weltgrenze von 26. Kein Hindernis kommt dazu,
 *     keines faellt weg, keines wandert. Kollision: null.
 *   - Sie verdeckt den Schleim nicht. Der Schleim kommt hoechstens bis 25,4
 *     an den Rand; alles hier steht mindestens 18 Einheiten weiter draussen
 *     und liegt damit in JEDER Kameralage HINTER ihm.
 *   - Sie benutzt weder Math.random noch Date noch ctx.time. Jede Form faellt
 *     aus `stueck.zufall` und `stueck.variante`, und die hat karte.js aus der
 *     Weltposition gehasht. Zwei Laeufe sind bitgleich; die Berge stehen in
 *     jeder Aufnahme an derselben Stelle und haben dieselbe Silhouette.
 *
 * ---------------------------------------------------------------------------
 * WAS AN ref/genshin/ GEMESSEN WURDE (nicht vermutet — Zahlen, keine Adjektive)
 *
 * 1) DER RESTKONTRAST IST WINZIG. Das ist der wichtigste Befund und der, den
 *    ein Nachbau am haeufigsten verfehlt: eine ferne Bergsilhouette ist
 *    KEINE dunkle Form vor hellem Himmel.
 *
 *    landschaft_mondstadt_mittag_fernnebel_4k.png
 *      Himmel neben dem Hauptgipfel  (864,768)  rgb(110,193,242) L=174
 *      Hauptgipfel, Koerper         (1152,768)  rgb( 95,168,213) L=151   dL = -23
 *      zweite Lage dahinter         (2112,922)  rgb(120,201,248) L=182
 *      Himmel unmittelbar darueber  (2112,860)  rgb(124,201,249) L=183   dL =  -1
 *
 *    goldene_stunde_grasland_2560.png (Dunst hier warm: rgb(140,104,86) L=113,
 *    exakt der Wert, den PHASE-GRAFIK-PLAN G10 fuer die goldene Stunde fuehrt)
 *      naechste Mesa, Koerper       (2048,794)  rgb( 85, 82,107) L= 86   dL = -27
 *      zweite Lage                  (1152,717)  rgb(113,103,120) L=108   dL =  -5
 *      dritte Lage                  (1400,780)  rgb(121,101, 99) L=107   dL =  -6
 *
 *    Also: die VORDERSTE Fernlage liegt 23…27 Helligkeitsstufen unter der
 *    Horizontfarbe, jede weitere nur noch 1…6. Mehr Kontrast waere eine
 *    Kulisse aus Pappe, weniger waere gar nichts.
 *
 * 2) DER KOERPER IST BLAEUER ALS DER DUNST, NICHT NUR DUNKLER.
 *    Bei goldener Stunde hat der Dunst R>B (140 gegen 86), die Mesa davor
 *    aber B>R (107 gegen 85). Am Mittag ist der Gipfel gegenueber dem Himmel
 *    kanalweise (0,86 · 0,87 · 0,88) — Blau haelt sich am besten.
 *    Daraus der Grundton dieser Datei: FELS_TON, MULTIPLIKATIV auf die
 *    Horizontfarbe. Damit folgt die Ferne jeder Tageszeit von selbst, sobald
 *    licht.js und himmel.js `ctx.licht.dunst` fuehren — und es kann keine
 *    Naht am Horizont aufreissen, weil es dieselbe Farbe ist.
 *
 * 3) DER FUSS HAT KONTRAST NULL.
 *    Mondstadt, Fuss desselben Gipfels (1250,880): rgb(166,173,199) L=174 —
 *    derselbe Wert wie der Himmel daneben (L=174). Die unteren Meter jeder
 *    Silhouette laufen vollstaendig in die Horizontfarbe. Deshalb FUSS_HOEHE
 *    weiter unten. Das ist zugleich die Loesung fuer ein technisches Problem:
 *    die Bodenebene reicht nur bis bounds*3 = 78, der `massiv`-Ring aber bis
 *    88. Ein Fuss, der ohnehin exakt Horizontfarbe hat, faellt an der
 *    Bodenkante nicht auf.
 *
 * 4) DIE KRONE IST HELLER ALS DER HIMMEL, NICHT DUNKLER.
 *    Mondstadt, Gipfelspitze (1190,620): rgb(154,200,232) L=190 gegen einen
 *    Himmel von L=174 — also +16. So traegt der Hauptgipfel das Bild, ohne
 *    die Luftperspektive zu verletzen. Genau das macht KAPPE_TON.
 *
 * 5) VERHAELTNISSE, nicht Adjektive:
 *      Hauptgipfel Mondstadt: Bildhoehe 190 von 1125 px = 17 % → bei fovY 50°
 *        rund 8,5° Winkelhoehe. karte.js setzt den Hauptgipfel auf 10,4°.
 *      Grundbreite zu Hoehe: Hauptgipfel rund 2,0 : 1;
 *        die fernen Tafelberge in goldene_stunde_grasland rund 3,5…4 : 1.
 *        Ferne Landformen sind BREIT UND FLACH, nicht spitz. Nur einer ist
 *        spitz, und der traegt das Bild.
 *      landschaft_dragonspine_schnee_tiefstand_4k: ein Massiv besteht aus
 *        4…6 erkennbaren Teilgipfeln, nicht aus einem Kegel.
 *      Oberflaeche: grosse ebene Facetten, hoechstens zwei Tonstufen, KEINE
 *        Kontur. Ferne Silhouetten haben in Genshin keine dunkle Umrisslinie
 *        (nachgesehen in allen drei Landschaftsbildern) — kontur.js hat hier
 *        also nichts zu tun.
 *
 * ---------------------------------------------------------------------------
 * ZUSAMMENSPIEL MIT grafik/nebel.js — gelesen, nicht vermutet
 *
 * nebel.js ist KEIN Bildschirmdurchgang geworden (es begruendet in seinem §5
 * ausfuehrlich, warum das in diesem Aufbau nicht baubar ist). Es tauscht die
 * Grundprogramme und stellt allen anderen zwei Dinge bereit:
 *   GRAFIK.baustein('fernnebel')  — `vec3 fernnebel(vec3 col, float abstand)`
 *   R.nebel.setzen(gl, programm)  — schreibt uNebelDunst/Beta/Start/Entsaett
 * Genau diesen Weg geht diese Datei. Farbe, Kanalverhaeltnis, Entsaettigung
 * und Formel sind damit dieselben wie beim Boden, den Felsen und dem Gras.
 * Am Horizont kann keine Naht aufreissen, und der Tagesgang aus G10 zieht die
 * Ferne von selbst mit.
 *
 * EINE EINZIGE ABWEICHUNG, und sie ist gerechnet:
 * nebel.js fuehrt beta_G = 0,038 je Einheit bei Startabstand 9. Das ist fuer
 * die Arena richtig (bei 35 Einheiten trifft es Genshins gemessenes Tripel
 * 0,41/0,65/0,77 auf 0,03 genau) und fuer die Ferne toedlich: bei 100
 * Einheiten ergibt dieselbe Kurve f_G = 0,97 und f_B = 0,99. Restkontrast
 * unter 4 Stufen — der Horizont waere wieder leer.
 *
 * Der Grund ist keine Meinungsverschiedenheit, sondern Arithmetik: eine
 * einzelne Exponentialfunktion kann nicht gleichzeitig bei 35 Einheiten
 * Genshins Mitteldistanz und bei 100 Einheiten Genshins Fernlage treffen.
 * nebel.js macht denselben Punkt fuer den Startabstand (seine §2).
 *
 * Diese Datei loest es, ohne eine zweite Nebelfarbe oder eine zweite Formel
 * einzufuehren: sie ruft `fernnebel()` mit einem GERAFFTEN Abstand auf.
 *     dEff = uNebelStart + (d - uNebelStart) * RAFFUNG * lagenFaktor
 * RAFFUNG = 0,22 bildet die Fernlagen wieder auf den Abschnitt der Kurve ab,
 * in dem sie etwas tut. Ergebnis (mit den heutigen Werten von nebel.js):
 *
 *   Lage          Abstand   dEff    f_G    Restkontrast   Genshin gemessen
 *   Huegelring      ~55     19,1    0,32     ~24 Stufen     23…27
 *   Hauptgipfel    ~101     26,2    0,48     ~18
 *   Tafelberge      ~90     33,1    0,60     ~12
 *   Massive        ~105     37,5    0,66      ~8            1…6
 *
 * Aendert nebel.js seine Dichte, wandert diese Tabelle mit — RAFFUNG ist ein
 * Anteil, keine zweite Konstante.
 * ========================================================================= */
(function () {

  /* -----------------------------------------------------------------------
   * 0. Ohne Register kein Typ. Kein Fehler, nur eine Zeile in der Konsole:
   *    eine fehlende Kulisse darf keine Aufnahme rot faerben.
   * --------------------------------------------------------------------- */
  if (typeof KARTE === 'undefined' || !KARTE || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[fern] grafik/karte.js ist nicht geladen — die Ferne bleibt leer.');
    }
    return;
  }

  const TAU = Math.PI * 2;
  const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* =======================================================================
   * 1. Die Stellschrauben, alle an einer Stelle und alle begruendet
   * ===================================================================== */

  /* Alle drei Toene sind MULTIPLIKATOREN auf `ctx.licht.dunst` — nie
   * absolute Farben. Begruendung oben unter (2): so folgt die Ferne dem
   * Tagesgang aus G10 ohne eine einzige weitere Zeile, und Himmel, Boden und
   * Ferne koennen am Horizont nicht auseinanderlaufen. */
  const FELS_TON  = [0.47, 0.53, 0.64];   // Bergkoerper: dunkler, Blau haelt sich
  const HAIN_TON  = [0.38, 0.46, 0.53];   // Baumgruppen auf den Kuppen: dunkler, gruener
  const KAPPE_TON = [1.03, 1.02, 1.00];   // besonnte Krone: eine Spur heller, leicht warm

  /* Abstandsraffung fuer die Luftperspektive — die einzige Abweichung von
   * nebel.js, ausfuehrlich begruendet im Kopf dieser Datei. */
  const RAFFUNG = 0.22;

  /* Nur benutzt, wenn nebel.js fehlt: dann traegt diese Datei einen eigenen,
   * formgleichen Ersatz und muss die vier Werte selbst kennen. Es sind die
   * Vorgaben aus nebel.js, damit ein Bild ohne nebel.js nicht anders
   * aussieht als eines mit. */
  const ERSATZ = { start: 9.0, dichte: 0.038, entsaettigen: 0.50,
                   dunst: [0.405, 0.415, 0.425], verhaeltnis: [0.503, 1.0, 1.397] };

  /* Die unteren FUSS_HOEHE Einheiten jeder Silhouette laufen vollstaendig in
   * die Horizontfarbe (Befund 3). Absolut, nicht relativ: der Dunst weiss
   * nichts davon, wie hoch ein Berg ist. */
  const FUSS_HOEHE = 3.2;

  /* Ab welchem Hoehenanteil die helle Krone einsetzt, und wie weich. */
  const KAPPE_AB   = 0.85;

  /* Der Fuss reicht etwas unter die Bodenebene. Zwei Gruende: kein
   * Z-Kampf mit dem Boden bei y = 0, und die Stuecke jenseits der
   * Bodenebene (die endet bei bounds*3 = 78) haben keine sichtbare
   * Schnittkante. Sichtbar ist davon nichts — der Fuss ist Horizontfarbe. */
  const FUSS_UNTEN = -0.7;

  /* -----------------------------------------------------------------------
   * Die fuenf Rollen, die karte.js vergibt.
   *
   *   ringe        Silhouettenprofil als [Hoehenanteil, Radiusanteil].
   *                Die Flanken sind konkav (der Radius waechst nach unten
   *                schneller als die Hoehe faellt) — so sieht ein Berg aus,
   *                ein gerader Kegel sieht aus wie ein Hut.
   *   basis        Grundradius = groesse * basis. Aus den gemessenen
   *                Grundbreite-zu-Hoehe-Verhaeltnissen (Befund 5).
   *   sektoren     Kanten des Umrisses. Mehr braucht es nicht: bei 8,5°
   *                Winkelhoehe traegt die Silhouette, nicht die Facette.
   *   nebelBias    Vielfaches von BETA_FERN. Staffelt die Tiefenlagen, auch
   *                wo sie sich im Abstand ueberlappen (der Hauptgipfel steht
   *                bei 78 m, der massiv-Ring bei 76…88 — ohne den Bias
   *                laegen beide auf derselben Tonstufe).
   *   nebengipfel  Zahl der ineinandergestellten Teilkegel (Befund 5,
   *                Dragonspine: 4…6 Teilgipfel je Massiv).
   *   haine        Zahl der Baumgruppen auf der Kuppe.
   *   kappe        1 = bekommt die helle Krone (Befund 4).
   * --------------------------------------------------------------------- */
  const ROLLE = {
    gipfel: {
      ringe: [[1.00, 0.00], [0.72, 0.34], [0.40, 0.66], [0.15, 0.88], [0.00, 1.00]],
      basis: 1.05, sektoren: 11, nebelBias: 0.85, nebengipfel: 3, haine: 0, kappe: 1,
    },
    schulter: {
      ringe: [[1.00, 0.12], [0.70, 0.40], [0.40, 0.70], [0.14, 0.90], [0.00, 1.00]],
      basis: 1.35, sektoren: 11, nebelBias: 0.95, nebengipfel: 3, haine: 0, kappe: 1,
    },
    huegel: {
      ringe: [[1.00, 0.12], [0.68, 0.44], [0.33, 0.77], [0.00, 1.00]],
      basis: 2.20, sektoren: 7, nebelBias: 1.00, nebengipfel: 1, haine: 3, kappe: 0,
    },
    tafelberg: {
      /* Flacher Tisch, dann steile Flanke — die Form aus
       * goldene_stunde_grasland_2560. Der Sprung von 0,58 auf 0,78 im
       * Radius bei nur 0,52 Hoehenverlust IST die Steilwand. */
      ringe: [[1.00, 0.54], [0.93, 0.58], [0.41, 0.78], [0.12, 0.95], [0.00, 1.00]],
      basis: 1.80, sektoren: 9, nebelBias: 1.35, nebengipfel: 0, haine: 2, kappe: 0,
    },
    massiv: {
      ringe: [[1.00, 0.20], [0.73, 0.44], [0.40, 0.72], [0.13, 0.93], [0.00, 1.00]],
      basis: 1.70, sektoren: 9, nebelBias: 1.75, nebengipfel: 4, haine: 1, kappe: 0,
    },
  };

  /* =======================================================================
   * 2. Geometrie — prozedural, deterministisch, ohne eigene Zufallsquelle
   *
   * Das Register stellt je Stueck vier Zahlen (`zufall`) und eine `variante`
   * bereit, beide aus der Weltposition gehasht. Mehr gibt es nicht, und mehr
   * darf es nicht geben: eine eigene Zufallsquelle waere genau die Sorte
   * Fehler, nach der der Wald in jeder Aufnahme woanders steht.
   *
   * Aus vier Zahlen werden trotzdem beliebig viele Formmerkmale — nicht
   * ueber einen Generator, sondern ueber drei Oberschwingungen mit den vier
   * Zahlen als PHASEN. Das ist kein Trick zur Not, sondern die bessere Form:
   * eine Summe aus drei Sinus liefert grosse, ruhige Ausbeulungen statt
   * gepixelter Zackigkeit — und "wenige grosse Elemente" ist die Stilvorgabe
   * (GRAFIK-MODULE.md §0).
   * ===================================================================== */

  /** Radiusfaktor eines Umrisses am Winkel a. Schwankt rund 1 ± 0,33. */
  function umriss(a, z) {
    return 1.0
      + 0.230 * Math.sin(3.0 * a + z[0] * TAU)
      + 0.130 * Math.sin(5.0 * a + z[1] * TAU)
      + 0.070 * Math.sin(8.0 * a + z[2] * TAU);
  }

  /* Ein kleiner ganzzahliger Mischer, damit aus (variante, laufende Nummer)
   * stabile Nebenwerte fallen. KEINE Zufallsquelle: die Eingabe ist die
   * ortsgehashte `variante` des Stuecks, die Ausgabe ist eine reine Funktion
   * davon. Derselbe Berg bekommt in jedem Lauf dieselben Teilgipfel. */
  function mix32(a, b) {
    let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 13;
    return ((h >>> 0) * 2.3283064365386963e-10);
  }

  /* -----------------------------------------------------------------------
   * Der Sammler: rohe Dreiecke mit FLACHEN Normalen.
   *
   * Flach, nicht geglaettet — Genshins ferne Massive zeigen grosse ebene
   * Facetten, und eine geglaettete Normale auf 60 Bildpixeln erzeugt einen
   * stetigen Verlauf, also genau das, was §0 verbietet.
   * Nicht indiziert: eine Facette braucht ihre eigenen drei Punkte.
   * --------------------------------------------------------------------- */
  function sammler() {
    return { pos: [], nor: [], inf: [], n: 0 };
  }

  /* A, B, C gegen den Uhrzeigersinn von aussen gesehen.
   * info = [hoehenAnteil-Bezugshoehe, hainAnteil, nebelBias, kappeStaerke] */
  function dreieck(s, A, B, C, bezug, hain, bias, kappe) {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) return;                       // entartet, faellt weg
    nx /= l; ny /= l; nz /= l;
    const P = [A, B, C];
    for (let i = 0; i < 3; i++) {
      const p = P[i];
      s.pos.push(p[0], p[1], p[2]);
      s.nor.push(nx, ny, nz);
      s.inf.push(klemm(p[1] / bezug, 0, 1), hain, bias, kappe);
      s.n++;
    }
  }

  /* -----------------------------------------------------------------------
   * Ein Kegelkoerper: Ringe von oben nach unten, letzter Ring auf FUSS_UNTEN.
   *
   *   mx, mz     Mittelpunkt in der Welt
   *   hoehe      Hoehe der Spitze ueber y = 0
   *   radius     Grundradius
   *   ringe      Profil (siehe ROLLE)
   *   sektoren   Umrisskanten
   *   dreh       Grunddrehung
   *   z          die vier Zahlen des Stuecks (Phasen des Umrisses)
   *   kippx/kippz  waagerechter Versatz der Spitze — davon lebt die
   *                Asymmetrie. Ein symmetrischer Kegel liest sich als Kegel,
   *                ein gekippter als Berg (mondstadt: die Spitze sitzt
   *                deutlich links der Mitte, die Schulter rechts).
   *   bezug      Hoehe, auf die der Hoehenanteil bezogen wird (fuer
   *              Teilgipfel und Haine die Hoehe des HAUPTkoerpers, sonst
   *              saehe jeder Nebenhuegel aus, als truege er eine Schneekappe)
   * --------------------------------------------------------------------- */
  function koerper(s, mx, mz, hoehe, radius, ringe, sektoren, dreh, z,
                   kippx, kippz, bezug, hain, bias, kappe) {
    const R = ringe.length;
    const punkt = [];                            // punkt[ring][sektor]

    for (let r = 0; r < R; r++) {
      const ha = ringe[r][0], ra = ringe[r][1];
      const y = (r === R - 1) ? FUSS_UNTEN : hoehe * ha;
      // Der Spitzenversatz laeuft nach unten aus, sonst kippt der ganze Berg.
      const ox = kippx * (1.0 - ra), oz = kippz * (1.0 - ra);
      const reihe = [];
      if (ra < 0.02) {
        reihe.push([mx + ox, y, mz + oz]);       // Spitze: ein einziger Punkt
      } else {
        for (let k = 0; k < sektoren; k++) {
          const a = dreh + (k / sektoren) * TAU;
          const rr = radius * ra * umriss(a, z);
          reihe.push([mx + ox + Math.cos(a) * rr, y, mz + oz + Math.sin(a) * rr]);
        }
      }
      punkt.push(reihe);
    }

    // Deckel oben, falls der oberste Ring eine Flaeche ist (Tafelberg).
    if (punkt[0].length > 1) {
      const o = punkt[0];
      let cx = 0, cz = 0;
      for (const p of o) { cx += p[0]; cz += p[2]; }
      const M = [cx / o.length, o[0][1], cz / o.length];
      for (let k = 0; k < o.length; k++) {
        dreieck(s, M, o[k], o[(k + 1) % o.length], bezug, hain, bias, kappe);
      }
    }

    // Mantel
    for (let r = 0; r < R - 1; r++) {
      const O = punkt[r], U = punkt[r + 1];
      const n = Math.max(O.length, U.length);
      for (let k = 0; k < n; k++) {
        const k1 = (k + 1) % n;
        const o0 = O[O.length === 1 ? 0 : k], o1 = O[O.length === 1 ? 0 : k1];
        const u0 = U[U.length === 1 ? 0 : k], u1 = U[U.length === 1 ? 0 : k1];
        if (O.length === 1) {
          dreieck(s, o0, u1, u0, bezug, hain, bias, kappe);
        } else if (U.length === 1) {
          dreieck(s, o0, o1, u0, bezug, hain, bias, kappe);
        } else {
          dreieck(s, o0, o1, u1, bezug, hain, bias, kappe);
          dreieck(s, o0, u1, u0, bezug, hain, bias, kappe);
        }
      }
    }

    // Boden. Kostet 9…13 Dreiecke und spart die Frage, ob man je in einen
    // Berg hineinsieht. Sichtbar wird er nie.
    const U = punkt[R - 1];
    if (U.length > 1) {
      let cx = 0, cz = 0;
      for (const p of U) { cx += p[0]; cz += p[2]; }
      const M = [cx / U.length, FUSS_UNTEN, cz / U.length];
      for (let k = 0; k < U.length; k++) {
        dreieck(s, M, U[(k + 1) % U.length], U[k], bezug, hain, bias, kappe);
      }
    }
  }

  /* -----------------------------------------------------------------------
   * Ein ganzes Stueck: Hauptkoerper, Teilgipfel, Baumgruppen.
   * --------------------------------------------------------------------- */
  const HAIN_RINGE = [[1.00, 0.22], [0.62, 0.72], [0.00, 1.00]];

  function stueckBauen(s, st) {
    const P = ROLLE[st.rolle] || ROLLE.huegel;
    const H = Math.max(0.6, +st.groesse || 1);
    const R = H * P.basis;
    const z = st.zufall || [0.2, 0.5, 0.8, 0.35];
    const dreh = +st.drehung || 0;
    const v = st.variante | 0;
    const bias = P.nebelBias;
    const kappe = P.kappe;

    // Hauptkoerper. Die Spitze sitzt um 12…30 % des Grundradius neben der
    // Mitte — daher kommt die Schulter, an der man einen Berg erkennt.
    const kw = z[3] * TAU;
    const ks = (0.16 + 0.26 * z[0]) * R;
    koerper(s, st.x, st.z, H, R, P.ringe, P.sektoren, dreh, z,
            Math.cos(kw) * ks, Math.sin(kw) * ks, H, 0, bias, kappe);

    // Teilgipfel: eigenstaendige Kegel, die sich mit dem Hauptkoerper
    // durchdringen. Kein Verschneiden noetig — alles ist undurchsichtig und
    // tiefengetestet, und genau so liest sich ein Massiv (Dragonspine).
    for (let i = 0; i < P.nebengipfel; i++) {
      const a = mix32(v, 11 + i) * TAU;
      const d = (0.30 + 0.32 * mix32(v, 31 + i)) * R;
      const h = H * (0.44 + 0.34 * mix32(v, 51 + i));
      const r = R * (0.42 + 0.26 * mix32(v, 71 + i));
      const zz = [mix32(v, 91 + i), mix32(v, 111 + i), mix32(v, 131 + i), z[1]];
      koerper(s, st.x + Math.cos(a) * d, st.z + Math.sin(a) * d,
              h, r, ROLLE.gipfel.ringe, Math.max(7, P.sektoren - 4),
              dreh + a, zz, 0, 0, H, 0, bias, kappe);
    }

    // Baumgruppen auf der Kuppe. Nur auf den beiden vordersten Lagen —
    // weiter hinten waeren sie kleiner als ein Pixel und wuerden nur
    // flimmern. Sie sitzen auf halber Hoehe der Kuppe, nicht auf der
    // Spitze: in mondstadt saeumen die Baumreihen die Schultern.
    for (let i = 0; i < P.haine; i++) {
      const a = mix32(v, 151 + i) * TAU;
      const d = (0.30 + 0.34 * mix32(v, 171 + i)) * R;
      const hh = H * (0.16 + 0.10 * mix32(v, 191 + i));
      const rr = R * (0.13 + 0.09 * mix32(v, 211 + i));
      // Sitzhoehe: grob die Mantelhoehe des Hauptkoerpers an diesem Radius.
      const t = klemm(d / R, 0, 1);
      const sitz = H * (1.0 - t) * 0.72;
      const zz = [mix32(v, 231 + i), mix32(v, 251 + i), mix32(v, 271 + i), z[2]];
      koerper(s, st.x + Math.cos(a) * d, st.z + Math.sin(a) * d,
              sitz + hh, rr, HAIN_RINGE, 7, dreh + a, zz, 0, 0, H, 1, bias, 0);
    }
  }

  /* =======================================================================
   * 3. Shader
   *
   * Ein Programm, ein Puffer, ein Zeichenaufruf fuer die ganze Ferne.
   * Instanzierung waere hier falsch: jedes Stueck hat eine EIGENE
   * Silhouette (das ist der halbe Punkt), und die Geometrie aendert sich
   * nie. Einmal backen ist billiger als jeden Frame Instanzdaten zu binden.
   * ===================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in vec4 aInfo;   // x Hoehenanteil, y Hain, z Nebelfaktor, w Kappe
uniform mat4 uViewProj;
out vec3 vPos;
out vec3 vNorm;
out vec4 vInfo;
void main() {
  vPos = aPos;
  vNorm = aNorm;
  vInfo = aInfo;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  /* Ist nebel.js da? Dann seinen Baustein nehmen — Farbe, Kanalverhaeltnis,
   * Entsaettigung und Formel kommen dann garantiert aus einer Hand.
   * GRAFIK.baustein() auf einen unbekannten Namen setzt einen console.error
   * ab; das waere in der Aufnahme ein "Seitenfehler". Also erst fragen. */
  function hatFernnebel() {
    return typeof GRAFIK !== 'undefined' && typeof GRAFIK.bausteine === 'function'
      && GRAFIK.bausteine().indexOf('fernnebel') >= 0;
  }

  /* Formgleicher Ersatz fuer den Fall, dass nebel.js fehlt oder ausgefallen
   * ist. Gleiche Uniformnamen, gleiche zwei Schritte (erst Chroma verlieren,
   * dann kanalweise auf die Horizontfarbe) — nur eben ohne den Rest der
   * Szene, die dann ebenfalls keinen Nebel hat. */
  const ERSATZ_BAUSTEIN = `
#ifndef GRAFIK_FERNNEBEL
#define GRAFIK_FERNNEBEL
uniform vec3  uNebelDunst;
uniform vec3  uNebelBeta;
uniform float uNebelStart;
uniform float uNebelEntsaett;
vec3 fernnebel(vec3 col, float abstand) {
  vec3 f = clamp(nebelAnteil(abstand, uNebelBeta, uNebelStart), 0.0, 1.0);
  col = saettigen(col, 1.0 - uNebelEntsaett * f.g);
  return mix(col, uNebelDunst, f);
}
#endif
`;

  function fsQuelle() {
    const B = GRAFIK.baustein('srgb', 'nebel', 'halblambert')
            + '\n' + (hatFernnebel() ? GRAFIK.baustein('fernnebel') : ERSATZ_BAUSTEIN);
    return `#version 300 es
precision highp float;
${B}
in vec3 vPos;
in vec3 vNorm;
in vec4 vInfo;

uniform vec3  uCam;
uniform vec3  uLicht;        // Richtung ZUR Sonne, wie uLight in FS_SOLID
uniform vec3  uFelsTon;
uniform vec3  uHainTon;
uniform vec3  uKappeTon;
uniform float uRaffung;
uniform float uFussHoehe;
uniform float uKappeAb;

out vec4 outColor;

void main() {
  vec3  N = normalize(vNorm);
  vec3  L = normalize(uLicht);
  float h = clamp(vInfo.x, 0.0, 1.0);

  /* Grundton, IMMER relativ zur Horizontfarbe. Absolute Farben wuerden im
   * Tagesgang (G10) neben Himmel und Boden laufen. */
  vec3 ton = mix(uFelsTon, uHainTon, clamp(vInfo.y, 0.0, 1.0));
  ton = mix(ton, uKappeTon, smoothstep(uKappeAb, uKappeAb + 0.14, h) * clamp(vInfo.w, 0.0, 1.0));

  /* Senkrechte Felsrampe (PHASE-GRAFIK-PLAN §1.4), milde Fassung: unten
   * faellt Rot staerker als Blau, die untere Partie wird also relativ
   * blauer. Als reine Helligkeitsmultiplikation waere der Effekt wertlos. */
  ton *= mix(vec3(0.86, 0.90, 0.955), vec3(1.06, 1.04, 1.01), h);

  /* Sehr flache Lichtmodulation: +/-10 %. In den Referenzbildern ist an
   * fernen Massiven kaum Licht-Schatten-Trennung zu sehen; mehr davon
   * saehe nach Vordergrund aus und zoege den Blick vom Schleim weg. */
  ton *= 0.86 + 0.28 * ndl01(N, L);

  vec3 col = uNebelDunst * ton;

  /* Luftperspektive: die Formel von nebel.js, mit geraffter Entfernung.
   * vInfo.z staffelt die Tiefenlagen auch dort, wo sie sich im tatsaechlichen
   * Abstand ueberlappen (Hauptgipfel 78, massiv-Ring 76…88). */
  float d = length(uCam - vPos);
  float dEff = uNebelStart + max(d - uNebelStart, 0.0) * uRaffung * max(vInfo.z, 0.0);

  /* Der Fuss laeuft vollstaendig in die Horizontfarbe (gemessener
   * Restkontrast am Gipfelfuss: 0 Stufen). Zweiter, technischer Zweck: die
   * Bodenebene endet bei bounds*3 = 78, der aeusserste Bergring steht bei
   * 88 — ein Fuss in Horizontfarbe zeigt dort keine Kante. Umgesetzt als
   * Mischung zwischen dem vollstaendig benebelten und dem gerafften
   * Ergebnis, damit dafuer keine zweite Nebelrechnung noetig ist. */
  float fuss = smoothstep(0.0, 1.0, clamp(vPos.y / uFussHoehe, 0.0, 1.0));
  outColor = vec4(mix(uNebelDunst, fernnebel(col, dEff), fuss), 1.0);
}`;
  }

  /* =======================================================================
   * 4. Aufbau und Zeichnen
   * ===================================================================== */

  let PROG = null;                    // ein Programm fuer alle Typnamen
  const NETZ = new Map();             // Typname -> { vao, n, stand }

  function programmBauen(gl) {
    if (PROG) return PROG;
    PROG = GRAFIK.programm(gl, VS, fsQuelle(), 'props/fern');
    return PROG;
  }

  function netzBauen(gl, name, stuecke) {
    const s = sammler();
    for (const st of stuecke) stueckBauen(s, st);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const bp = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bp);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.pos), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const bn = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bn);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.nor), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const bi = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bi);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(s.inf), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const netz = { vao, n: s.n, stand: stuecke.length };
    NETZ.set(name, netz);
    if (typeof console !== 'undefined' && console.info) {
      console.info('[fern] ' + name + ': ' + stuecke.length + ' Stueck, '
        + (s.n / 3) + ' Dreiecke, 1 Zeichenaufruf.');
    }
    return netz;
  }

  const zwischen = new Float32Array(3);
  function nachZiel(quelle, ziel, vorgabe) {
    for (let i = 0; i < 3; i++) {
      ziel[i] = (quelle && quelle.length > i) ? quelle[i] : vorgabe[i];
    }
    return ziel;
  }

  /* Die vier Nebel-Uniforms. Ist nebel.js da, schreibt es sie selbst — dann
   * sind sie garantiert dieselben wie beim Boden und beim Gras. Fehlt es,
   * schreibt diese Datei die Vorgaben aus nebel.js hinein, damit das Bild
   * nicht ploetzlich einen anderen Horizont hat. */
  function nebelSetzen(gl, R, ctx, p) {
    const n = (ctx && ctx.nebel) || (R && R.nebel);
    if (n && typeof n.setzen === 'function') { n.setzen(gl, p); return; }
    gl.useProgram(p);
    const q = (ctx.licht && ctx.licht.dunst) || ERSATZ.dunst;
    gl.uniform3fv(p.u.uNebelDunst, nachZiel(q, zwischen, ERSATZ.dunst));
    gl.uniform3f(p.u.uNebelBeta,
      ERSATZ.dichte * ERSATZ.verhaeltnis[0],
      ERSATZ.dichte * ERSATZ.verhaeltnis[1],
      ERSATZ.dichte * ERSATZ.verhaeltnis[2]);
    gl.uniform1f(p.u.uNebelStart, ERSATZ.start);
    gl.uniform1f(p.u.uNebelEntsaett, ERSATZ.entsaettigen);
  }

  function zeichnen(name) {
    return function (gl, R, ctx, stuecke) {
      if (!stuecke || !stuecke.length) return;
      const p = programmBauen(gl);
      let netz = NETZ.get(name);
      if (!netz || netz.stand !== stuecke.length) netz = netzBauen(gl, name, stuecke);
      if (!netz.n) return;

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      /* Erst die fremden Uniforms (bindet das Programm selbst), dann die
       * eigenen — sonst schreibt nebelSetzen() auf ein anderes Programm. */
      nebelSetzen(gl, R, ctx, p);

      gl.useProgram(p);
      gl.bindVertexArray(netz.vao);

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(p.u.uCam, ctx.cam);
      gl.uniform3fv(p.u.uLicht,
        nachZiel((ctx.licht && ctx.licht.richtung) || R.light, zwischen, [0.4, 0.8, 0.45]));

      gl.uniform3f(p.u.uFelsTon, FELS_TON[0], FELS_TON[1], FELS_TON[2]);
      gl.uniform3f(p.u.uHainTon, HAIN_TON[0], HAIN_TON[1], HAIN_TON[2]);
      gl.uniform3f(p.u.uKappeTon, KAPPE_TON[0], KAPPE_TON[1], KAPPE_TON[2]);
      gl.uniform1f(p.u.uRaffung, RAFFUNG);
      gl.uniform1f(p.u.uFussHoehe, FUSS_HOEHE);
      gl.uniform1f(p.u.uKappeAb, KAPPE_AB);

      gl.drawArrays(gl.TRIANGLES, 0, netz.n);
      gl.bindVertexArray(null);
    };
  }

  /* -----------------------------------------------------------------------
   * Anmeldung.
   *
   * `schicht: -100` — die Ferne wird vor allem anderen gezeichnet. Sie ist
   * ohnehin hinter allem; die Reihenfolge spart nur ein paar
   * Tiefentests an den Requisiten davor.
   *
   * Der Aufbau steht bewusst NICHT in `aufbau`, sondern faellt beim ersten
   * Zeichnen an: `aufbau` laeuft auch fuer Typen ohne ein einziges Stueck,
   * und ein Programm zu uebersetzen, das nie etwas zeichnet, ist verschenkte
   * Startzeit. Wirft es doch, legt karte.js den Typ still (console.warn) und
   * der Rest der Karte laeuft weiter.
   *
   * Zwei Namen, ein Bauplan: `fernberg` ist der Name, unter dem karte.js die
   * 43 Stuecke fuehrt, `fern` ist der im Auftrag genannte Name. Ohne Stuecke
   * kostet der zweite nichts — karte.js ueberspringt Typen mit leerer Liste.
   * --------------------------------------------------------------------- */
  for (const name of ['fernberg', 'fern']) {
    KARTE.typ(name, { schicht: -100, zeichnen: zeichnen(name) });
  }

})();
