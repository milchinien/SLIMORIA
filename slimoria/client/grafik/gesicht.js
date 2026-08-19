'use strict';
/* ===========================================================================
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * Augen und Mund. BESTANDTEIL des Koerpers (GDD 01 §7), nie aufgesetzt.
 *
 * Nur aktiv im zweiten Renderpfad (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche des Gauntlets.
 *
 * ===========================================================================
 * 1. WAS AM REFERENZMATERIAL GEMESSEN WURDE
 * ===========================================================================
 *
 * Gemessen mit einem Zusammenhangs-Segmentierer (Koerpermaske nach Farbton,
 * Gesichtszuege als dunkle Loecher darin). Das Werkzeug ist geeicht: auf
 * `ref/slime/sr1-rest-single-pink-silhouette.jpg` liefert es die Augen-
 * Rechtecke (1334,794,17,17) und (1466,826,15,19) — `ref/slime/DOSSIER.md` §6
 * notiert dort (1335,794,15,16) und (1467,827,13,18). Auf ein bis zwei Pixel
 * dasselbe, die Zahlen unten stehen also nicht auf Augenmass.
 *
 *   Bild                                   Koerper   Augenbreite  Augenmitte  Augenabstand
 *                                          (px)      / Koerper-   von oben    / Koerper-
 *                                                    breite       / Koerper-  breite
 *                                                                 hoehe
 *   ------------------------------------------------------------------------
 *   slime-rancher/sr1-rock-slime-rest-     550 x 539   16.4 %      0.253      58.7 %
 *     dome-face-closeup.jpg  (Ich-Kamera               12.7 %      0.275
 *     auf Augenhoehe)
 *   slime/sr1-rest-single-pink-             245 x 250    6.9 %      0.378      53.5 %
 *     silhouette.jpg  (mittlere Distanz,                6.1 %      0.509
 *     leicht von oben)
 *   blob-jelly/slime-heroes-screenshot-3    219 x 211   11.0 %      0.718      34.2 %
 *     .jpg  (Verfolgerkamera von schraeg               12.8 %      0.799
 *     oben — UNSER Kamerafall)
 *   slime-rancher/sr1-face-macro-           760 breit   ~10 %       —          —
 *     closeup.jpg  (Fischaugen-Makro,      (angeschnitten)
 *     nur qualitativ brauchbar)
 *   slime/sr2-rest-pink-subsurface-         338 breit    ~6 %       —          —
 *     face.jpg
 *
 * Die Streuung der Augenhoehe (0.25 bis 0.80) ist KEIN Widerspruch, sondern
 * genau der Punkt, vor dem DOSSIER §6 warnt: das Gesicht sitzt auf der
 * VORDEREN Koerperflaeche, und wo es im Bild landet, entscheidet der
 * Nickwinkel der Kamera. Auf Augenhoehe (Ich-Perspektive) erscheint dieselbe
 * Stelle bei 0.25 von oben, aus einer Verfolgerkamera von schraeg oben bei
 * 0.75. Wer die Augen fuer eine Verfolgerkamera auf halbe Hoehe legt, bekommt
 * einen Schleim, dem das Gesicht auf der Stirn klebt — und genau das war der
 * Zustand vor diesem Modul (gemessen: Augenmitte 0.47 von oben).
 *
 * Massgeblich ist deshalb die Abnahmezahl aus DOSSIER §10, Zeile 12 — sie ist
 * bereits fuer 1600x900 und unsere Spielkamera gerechnet:
 *
 *     Augenbreite   7 – 9 %  der Koerperbreite
 *     Augenmitte    0.65 – 0.78  der Koerperhoehe von oben
 *
 * Herleitung fuer eine Kugel vom Radius r, Kamera-Nickwinkel phi,
 * Gesichtspunkt auf der Hoehenlage theta: der Punkt liegt im Bild bei
 * (1 - sin(theta - phi)) / 2 von oben. Die Spielkamera steht auf phi = 0.40
 * (game.js Zeile 80), die Aufnahmeszenarien nicken zwischen 0.12 und 0.45.
 * Fuer 0.65…0.78 bei phi = 0.40 folgt theta zwischen -0.19 und +0.10;
 * gebaut ist **theta = -0.02**, weil der Koerper keine Kugel ist, sondern in
 * Ruhe 1 : 0.90 gestaucht — und Stauchung schiebt jedes Merkmal in der
 * Projektion nach unten. Nachgemessen statt gerechnet, im eigenen Bild:
 *
 *   Szenario aufprall (phi = 0.12), 18 Bilder, Koerper 210–311 px breit
 *     Augenbreite (zugewandtes Auge)   8.7 – 11.2 %  der Koerperbreite
 *     Augenform (Breite : Hoehe)       0.74 – 0.78   also hochoval
 *     Augenmitte von oben              0.55 – 0.67
 *     Augenabstand                     36 – 40 %     der Koerperbreite
 *     Mundbreite                       20 – 26 %     der Koerperbreite
 *     Mundmitte von oben               0.64 – 0.80
 *   Umgerechnet auf die Spielkamera (phi = 0.40, +0.134 nach unten):
 *     Augenmitte von oben              0.68 – 0.80   — Zielband 0.65…0.78
 *
 * Vorher, mit den Ellipsoiden des Grundzugs, im selben Szenario gemessen:
 * Augenbreite 27.7 %, Augenmitte 0.47 von oben, kein Lichtpunkt.
 *
 * VIERTE FRAGE: liegen die Augen IM Gel oder darauf?
 * DOSSIER §6 unterscheidet sauber: bei deckenden Slimes liegen sie „in der
 * Oberflaeche" — flache Farbflaechen, die der Woelbung folgen, ohne eigene
 * Silhouette und ohne Lidkante. Bei DURCHSCHEINENDEN Typen dagegen sind sie
 * „innen sichtbar und werden vom Koerpervolumen leicht verschleiert"
 * (sr1-rest-domes-cave-contrast.jpg, sr1-rest-grey-plus-honey-translucent.jpg).
 * Unser Schleim ist durchscheinend, also gilt der zweite Fall: das Gesicht
 * wird VOR dem Gel gezeichnet (Ordnung 52 < 58/60) und liegt um `tiefe`
 * unter der Haut. Das Gel legt sich danach darueber und truebt es um genau
 * die Dicke, die davor steht. Aufgesetzt waere es, wenn es NACH dem Gel
 * kaeme — dann klebte es auf der Oberflaeche wie ein Aufkleber.
 *
 * ===========================================================================
 * 2. WARUM DAS GESICHT KEINE KOERPER MEHR SIND, SONDERN EIN AUFDRUCK
 * ===========================================================================
 *
 * Der Grundzug in renderer2.js (uebernommen aus renderer.js) zeichnet 21
 * abgeflachte Ellipsoide: je Auge drei gestapelte Linsen, dazu fuenfzehn
 * ueberlappende Glieder fuer den Mund. Das Verfahren, die Ankerpunkte aus der
 * TATSAECHLICHEN Huelle abzuleiten (`faceDir` + `surfaceSample` aus slime.js),
 * ist richtig und wird hier unveraendert uebernommen. Die Ellipsoide selbst
 * sind es nicht:
 *
 *  - Sie werden vom Fest-Shader beleuchtet. Auf einer gekruemmten Linse
 *    ergibt das einen stetigen Verlauf ueber die ganze Flaeche — im Bild ist
 *    das Auge ein weich auslaufender Fleck. GRAFIK-MODULE.md §0 verbietet
 *    genau das („Stufenloser Helligkeitsverlauf", „weich auslaufender
 *    Schimmer"), und ein Anime-Gesicht empfaengt ueberhaupt kein Licht.
 *  - Sie ragen aus der Haut heraus, sobald der Koerper sich staucht: eine
 *    Kugel auf dem Koerper statt einer Flaeche darin.
 *  - Der Mund aus 15 Gliedern ist teuer und wird trotzdem eine Perlenkette,
 *    sobald der Koerper sich verzieht.
 *
 * Stattdessen: EIN Zeichenaufruf auf die um `tiefe` nach innen versetzte
 * Huelle. Der Fragment-Shader prueft fuer jedes Fragment, ob es in einer der
 * drei Formen liegt, und verwirft es sonst. Damit
 *
 *  - liegt das Gesicht per Konstruktion IN der Oberflaeche, nicht darauf,
 *  - folgt es jeder Verformung, weil es auf der verformten Huelle ausgewertet
 *    wird und nicht auf einem Hilfskoerper,
 *  - hat es eine harte Kante von genau einer Pixelbreite (`fwidth`), also
 *    „Glanzlicht als klar begrenzte Form" statt Halo,
 *  - kostet es einen Zeichenaufruf statt einundzwanzig.
 *
 * Die Formen sind bewusst arm: eine Ellipse je Auge, ein Lichtpunkt darin,
 * ein Bogen als Mund. Bei der Zielgroesse aus DOSSIER §10 (Koerperhoehe
 * 72–108 px bei 1600x900) ist ein Auge 6–11 px breit und der Lichtpunkt 2 px.
 * Alles, was feiner ist als das, ist bei dieser Groesse nicht darstellbar —
 * „im Zweifel simpler" ist hier keine Haltung, sondern Arithmetik.
 *
 * ===========================================================================
 * 3. FARBE
 * ===========================================================================
 * Gemessen sind die Gesichtszuege nie schwarz und nie grau, sondern ein sehr
 * dunkler, gesaettigter Verwandter der Koerperfarbe: Auge (91,22,11) bzw.
 * (33,18,23), Mund (137,18,51) bzw. (145,29,59) — der Mund ist stets HELLER
 * und gesaettigter als das Auge. Beides folgt hier aus `R.gel.farbe.tief`,
 * das schon nach Fraktion UND Todeszustand aufgeloest ist (GDD 01 §8: Eldoran
 * blau, Ravok rot). Wer die Fraktionstabelle hier ein zweites Mal aufmacht,
 * hat sie beim naechsten Balancing an zwei Stellen zu pflegen.
 *
 * ===========================================================================
 * 4. LIDSCHLAG
 * ===========================================================================
 * Deterministisch (GRAFIK-MODULE.md §4). Erste Quelle ist `slime.blink` aus
 * slime.js — das ist ein Abwaertszaehler ueber dt, also selbst deterministisch,
 * und es haengt am Tempo des Koerpers, was ein Zeitgeber hier nicht koennte.
 * Fehlt es, faellt das Modul auf einen festen Takt aus `ctx.time` zurueck.
 * KEINE Lidsimulation: das geschlossene Auge ist dieselbe Ellipse, nur flach
 * gedrueckt und leicht gewoelbt — DOSSIER §6, „geschlossene Augen werden zu
 * Boegen". Zwei Zeilen statt eines Lidmodells.
 *
 * Determinismus: kein Math.random, kein Date, kein performance.now.
 * ========================================================================= */

(function () {

  /* glsl.js legt GRAFIK an und laeuft laut laden.js vor dieser Datei. Falls
   * nicht, wird hier ein Minimalregister erzeugt, damit diese Datei die Seite
   * nicht beim Laden zerlegt. */
  const G = (typeof GRAFIK !== 'undefined' && GRAFIK) ? GRAFIK : (window.GRAFIK = {});
  if (!G.module) G.module = [];
  if (!G.modul) G.modul = function (m) { G.module.push(m); return m; };

  /* ======================================================================
   * Stellschrauben. Alle Laengen sind Vielfache von PARAMS.radius, damit ein
   * Levelaufstieg (radiusFuerLevel) das Gesicht mitwachsen laesst, ohne dass
   * hier etwas nachgezogen werden muss.
   * ==================================================================== */
  const P = {
    /* Lage auf dem Koerper, in Radiant. Siehe Herleitung im Kopf. */
    augenGier: 0.40,        // halber Winkelabstand der Augen
    augenHoehe: -0.02,      // Hoehenlage der Augen, negativ = unter dem Aequator
    mundHoehe: -0.24,       // Hoehenlage des Mundes

    /* Groessen, Vielfache von PARAMS.radius (Koerperbreite = 2 * radius). */
    augeBreite: 0.085,      // halbe Augenbreite -> 8.5 % der Koerperbreite,
                            // im Bild gemessen 8.7 – 11.2 % (Zielband 7 – 9 %)
    augeSchlank: 1.35,      // Hoehe / Breite. DOSSIER §6: hochoval, nicht rund
    mundBreite: 0.22,       // halbe Mundbreite -> 44 % der Ruhebreite; durch
                            // Schraeglage und Stauchung im Bild 20 – 26 %
    mundDicke: 0.048,       // halbe Hoehe des geschlossenen Mundes
    mundOeffnung: 0.17,     // wieviel davon beim Fressen dazukommt
    mundLaecheln: 0.22,     // Durchhang des Bogens, Anteil der halben Breite

    glanzGroesse: 0.24,     // Radius des Lichtpunkts, Anteil der halben Augenbreite
    glanzVersatz: 0.42,     // wie weit er aus der Augenmitte ruecht

    blickfolge: 0.16,       // wie weit die Augen dem Blick nachgeben
    tiefe: 0.055,           // wie tief unter der Haut, Vielfaches von radius
    seite: 0.30,            // Mindest-Uebereinstimmung von Flaechen- und Ankernormale
  };

  const S = {
    prog: null, bereit: false, mesh: null, bild: -1,
    /* je Auge: Punkt, Tangenten, Normale, Versatz von Auge und Lichtpunkt */
    auge: [neuAnker(), neuAnker()],
    mund: neuAnker(),
    augeR: new Float32Array(4),      // ru0, rv0, ru1, rv1
    augeKruemm: new Float32Array(2),
    augeVersatz: new Float32Array(4),
    glanzVersatz: new Float32Array(4),
    glanzR: 0,
    mundR: [0, 0], mundKruemm: 0,
    farbeAuge: new Float32Array(3),
    farbeGlanz: new Float32Array(3),
    farbeMund: new Float32Array(3),
    deckung: 1, glanzAn: 1, grenze: 1,
    sichtbar: false,
  };

  function neuAnker() {
    return {
      p: new Float32Array(3), u: new Float32Array(3),
      v: new Float32Array(3), n: new Float32Array(3),
    };
  }

  /* ======================================================================
   * Shader
   * ==================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;

uniform mat4 uViewProj;
uniform float uTiefe;

out vec3 vPos;
out vec3 vNormal;

void main() {
  /* Die ganze Huelle wandert um uTiefe nach innen. Damit liegt das Gesicht
   * UNTER der Haut statt darauf — und der Tiefenpuffer stimmt: das Gel
   * (Ordnung 60, depthFunc LESS) ist naeher und legt sich darueber, die
   * Gelrueckwand (58) ist ferner und bleibt hinter dem Gesicht. */
  vec3 n = normalize(aNor);
  vec3 p = aPos - n * uTiefe;
  vPos = p;
  vNormal = n;
  gl_Position = uViewProj * vec4(p, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNormal;

uniform vec3 uAugeP0, uAugeU0, uAugeV0, uAugeN0;
uniform vec3 uAugeP1, uAugeU1, uAugeV1, uAugeN1;
uniform vec4 uAugeR;          // ru0, rv0, ru1, rv1  (Weltmass)
uniform vec2 uAugeKruemm;     // Kruemmung des Bogens beim Lidschlag, 1/Laenge
uniform vec4 uAugeVersatz;    // Blickversatz je Auge (u,v) in Weltmass
uniform vec4 uGlanzVersatz;   // Lichtpunkt je Auge (u,v) in Weltmass
uniform float uGlanzR;
uniform float uGlanzAn;

uniform vec3 uMundP, uMundU, uMundV, uMundN;
uniform vec2 uMundR;
uniform float uMundKruemm;

uniform vec3 uFarbeAuge, uFarbeGlanz, uFarbeMund;
uniform float uSeite;         // Mindestwert von dot(Flaechennormale, Ankernormale)
uniform float uGrenze;        // wie weit ein Fragment laengs der Ankernormale abliegen darf
uniform float uDeckung;

out vec4 outColor;

/* Eine Ellipse in der Tangentialebene eines Ankers, mit einer Parabel als
 * Mittellinie. kruemm = 0 gibt die Ellipse, ein grosses kruemm bei kleinem rv
 * gibt den Bogen. Eine Form, zwei Zustaende — kein Lidmodell.
 *
 * Rueckgabe ist die Deckung mit einer Flanke von genau einer Pixelbreite:
 * hart genug fuer §0, glatt genug, dass die Kante bei 8 px Augenbreite nicht
 * treppt. Es gibt in diesem Shader keine Lichtrechnung — ein Anime-Gesicht
 * empfaengt nie einen Schatten (PHASE-GRAFIK-PLAN §2). */
float zug(vec3 P, vec3 U, vec3 V, vec3 An, vec2 R, float kruemm, vec2 versatz) {
  vec3 N = normalize(vNormal);
  if (dot(N, An) < uSeite) return 0.0;
  vec3 d = vPos - P;
  if (abs(dot(d, An)) > uGrenze) return 0.0;

  float a = dot(d, U) - versatz.x;
  float b = dot(d, V) - versatz.y;
  b -= kruemm * a * a;

  float q = length(vec2(a / R.x, b / max(R.y, 1e-6)));
  float w = max(fwidth(q), 1e-5);
  return 1.0 - smoothstep(1.0 - w, 1.0 + w, q);
}

/* Vormultipliziertes „over". Gezeichnet wird mit ONE / ONE_MINUS_SRC_ALPHA. */
vec4 ueber(vec4 unten, vec3 farbe, float a) {
  return vec4(farbe * a, a) + unten * (1.0 - a);
}

void main() {
  vec4 acc = vec4(0.0);

  acc = ueber(acc, uFarbeMund,
              zug(uMundP, uMundU, uMundV, uMundN, uMundR, uMundKruemm, vec2(0.0)));

  acc = ueber(acc, uFarbeAuge,
              zug(uAugeP0, uAugeU0, uAugeV0, uAugeN0, uAugeR.xy,
                  uAugeKruemm.x, uAugeVersatz.xy));
  acc = ueber(acc, uFarbeAuge,
              zug(uAugeP1, uAugeU1, uAugeV1, uAugeN1, uAugeR.zw,
                  uAugeKruemm.y, uAugeVersatz.zw));

  /* Ein einziger Lichtpunkt je Auge, DOSSIER §6: rund 25 % des Augen-
   * durchmessers, immer auf der Seite des Koerper-Glanzlichts. */
  if (uGlanzAn > 0.5) {
    vec2 gr = vec2(uGlanzR, uGlanzR);
    acc = ueber(acc, uFarbeGlanz,
                zug(uAugeP0, uAugeU0, uAugeV0, uAugeN0, gr, 0.0, uGlanzVersatz.xy));
    acc = ueber(acc, uFarbeGlanz,
                zug(uAugeP1, uAugeU1, uAugeV1, uAugeN1, gr, 0.0, uGlanzVersatz.zw));
  }

  if (acc.a < 0.004) discard;
  outColor = acc * uDeckung;
}`;

  /* ======================================================================
   * Kleinkram
   * ==================================================================== */

  const klemm = (x, a, b) => (x < a ? a : (x > b ? b : x));

  /* Tangentialbasis: u waagerecht auf der Flaeche, v darauf senkrecht und
   * nach oben. Bezugsrichtung ist die Welt-Senkrechte; zeigt die Normale
   * selbst nach oben, weicht sie auf die Tiefenachse aus, sonst waere das
   * Kreuzprodukt null. (Gleiche Konstruktion wie tangentBasis in
   * renderer.js — nur ist die dort modulprivat.) */
  function basis(nx, ny, nz, A) {
    const steil = Math.abs(ny) > 0.92;
    const ay = steil ? 0 : 1, az = steil ? 1 : 0;
    let ux = ay * nz - az * ny;
    let uy = az * nx;
    let uz = -ay * nx;
    const l = Math.hypot(ux, uy, uz) || 1;
    ux /= l; uy /= l; uz /= l;
    A.u[0] = ux; A.u[1] = uy; A.u[2] = uz;
    A.v[0] = ny * uz - nz * uy;
    A.v[1] = nz * ux - nx * uz;
    A.v[2] = nx * uy - ny * ux;
    A.n[0] = nx; A.n[1] = ny; A.n[2] = nz;
  }

  const _pkt = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };

  /* Einen Ankerpunkt aus der TATSAECHLICHEN Huelle holen. Genau das Verfahren
   * aus drawFace (renderer.js): `surfaceSample` mittelt die Massepunkte, deren
   * Grundrichtung in die gesuchte Richtung zeigt, scharf gewichtet. Dadurch
   * klebt das Gesicht nicht auf dem Koerper, sondern verformt sich mit ihm —
   * GDD 01 §7. */
  function anker(s, gier, hoehe, A) {
    const d = faceDir(s, gier, hoehe);
    surfaceSample(s.body, d.x, d.y, d.z, _pkt);
    A.p[0] = _pkt.x; A.p[1] = _pkt.y; A.p[2] = _pkt.z;
    basis(_pkt.nx, _pkt.ny, _pkt.nz, A);
    return A;
  }

  /* renderer2.js legt ctx.licht mit Nullvektoren an und ueberlaesst das
   * Fuellen licht.js. Ein Nullvektor gilt deshalb als fehlender Wert. */
  const nimm = (v, vorgabe) =>
    (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;

  function eigenesNetz(gl, surface) {
    if (typeof G.mesh === 'function') {
      return G.mesh(gl, surface.positions, surface.normals, surface.indices);
    }
    return null;
  }

  /* ======================================================================
   * Anmeldung
   *
   * Der Name 'gesicht' verdraengt den gleichnamigen Grundzug aus renderer2.js
   * ueber die Namensregel — es waere absurd, beide Gesichter uebereinander zu
   * zeichnen.
   *
   * Ordnung 52 statt der 45 des Grundzugs: dort lag das Gesicht vor den
   * Bodendekalen (50). Die Dekale zeichnen mit depthMask(false), das war also
   * folgenlos — aber 52 sagt deutlicher, wo das Gesicht hingehoert: nach
   * allem Undurchsichtigen, vor der Gelrueckwand (58) und vor dem Gel (60).
   * Genau in diesem Fenster ist es „im Gel" statt darauf.
   * ==================================================================== */
  G.modul({
    name: 'gesicht',
    ordnung: 52,

    regler: [
      { key: 'augenGier', min: 0.20, max: 1.00, step: 0.01, wert: P.augenGier },
      { key: 'augenHoehe', min: -0.80, max: 0.40, step: 0.01, wert: P.augenHoehe },
      { key: 'mundHoehe', min: -1.20, max: 0.10, step: 0.01, wert: P.mundHoehe },
      { key: 'augeBreite', min: 0.03, max: 0.30, step: 0.005, wert: P.augeBreite },
      { key: 'augeSchlank', min: 0.60, max: 2.20, step: 0.05, wert: P.augeSchlank },
      { key: 'mundBreite', min: 0.05, max: 0.45, step: 0.005, wert: P.mundBreite },
      { key: 'mundDicke', min: 0.01, max: 0.20, step: 0.002, wert: P.mundDicke },
      { key: 'mundOeffnung', min: 0.0, max: 0.60, step: 0.01, wert: P.mundOeffnung },
      { key: 'mundLaecheln', min: -0.60, max: 0.60, step: 0.02, wert: P.mundLaecheln },
      { key: 'glanzGroesse', min: 0.0, max: 0.50, step: 0.01, wert: P.glanzGroesse },
      { key: 'glanzVersatz', min: 0.0, max: 0.70, step: 0.01, wert: P.glanzVersatz },
      { key: 'blickfolge', min: 0.0, max: 0.50, step: 0.01, wert: P.blickfolge },
      { key: 'tiefe', min: 0.0, max: 0.25, step: 0.005, wert: P.tiefe },
    ],

    aufbau(gl) {
      S.prog = G.programm(gl, VS, FS, 'gesicht');
      S.bereit = true;
    },

    vorbereiten(gl, R, ctx) {
      S.sichtbar = false;
      if (!S.bereit) return;

      const s = ctx.slime;
      if (!s || !s.body) return;
      if (typeof faceDir !== 'function' || typeof surfaceSample !== 'function') return;

      /* Regler uebernehmen, falls das Tuning-Panel sie verstellt hat. */
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];

      const radius = Math.max((ctx.params && ctx.params.radius) || 1, 1e-3);

      /* --- Lidschlag ----------------------------------------------------
       * `s.blink` ist ein Abwaertszaehler ueber dt (slime.js) und damit
       * deterministisch; er haengt zusaetzlich am Tempo, was ein reiner
       * Zeitgeber nicht koennte. Fehlt er, uebernimmt ein fester Takt aus
       * ctx.time — auch der ohne Math.random und ohne Date. */
      let zu;
      if (typeof s.blink === 'number') {
        zu = klemm(s.blink / 0.07, 0, 1);
      } else {
        const t = ((ctx.time || 0) / 3.1) % 1;
        zu = klemm((0.045 - Math.abs(t - 0.0225)) / 0.0225, 0, 1);
      }

      const offen = klemm(s.mouth || 0, 0, 1);

      /* --- Ankerpunkte --------------------------------------------------- */
      for (let i = 0; i < 2; i++) {
        const seite = i === 0 ? -1 : 1;
        anker(s, seite * P.augenGier, P.augenHoehe, S.auge[i]);
      }
      anker(s, 0, P.mundHoehe, S.mund);

      /* --- Augengroesse -------------------------------------------------- */
      const ru = P.augeBreite * radius;
      /* Beim Lidschlag wird dieselbe Ellipse flach gedrueckt und leicht
       * gewoelbt: aus dem Auge wird ein Bogen (DOSSIER §6). Der Rest bleibt
       * stehen — keine Lidkante, kein zweiter Koerper. */
      const rvOffen = ru * P.augeSchlank;
      const rvZu = ru * 0.10;
      const rv = rvOffen + (rvZu - rvOffen) * zu;

      for (let i = 0; i < 2; i++) {
        S.augeR[i * 2] = ru;
        S.augeR[i * 2 + 1] = rv;
        /* Kruemmung: Durchhang an der Ecke = 0.30 * ru, nur beim Zufallen. */
        S.augeKruemm[i] = -(0.30 * zu) / Math.max(ru, 1e-6);
      }

      /* --- Blickversatz --------------------------------------------------
       * Ein deckend dunkles Auge hat keine Pupille, die man verschieben
       * koennte. Verschoben wird deshalb das Auge selbst, und nur wenig:
       * lesbar wird der Blick durch die Richtung des ganzen Koerpers
       * (`faceDir` dreht mit s.fx/s.fz), nicht durch die Augenstellung. */
      const look = s.look || { x: 0, y: 0, z: 1 };
      for (let i = 0; i < 2; i++) {
        const A = S.auge[i];
        const du = klemm(look.x * A.u[0] + look.y * A.u[1] + look.z * A.u[2], -1, 1);
        const dv = klemm(look.x * A.v[0] + look.y * A.v[1] + look.z * A.v[2], -1, 1);
        S.augeVersatz[i * 2] = du * ru * P.blickfolge;
        S.augeVersatz[i * 2 + 1] = dv * rv * P.blickfolge * 0.7;
      }

      /* --- Lichtpunkt ----------------------------------------------------
       * DOSSIER §6: „immer auf derselben Seite wie das Koerper-Glanzlicht."
       * Also nicht fest oben links, sondern in die Lichtrichtung projiziert. */
      const L = nimm(ctx.licht && ctx.licht.richtung, nimm(R.light, [0.55, 0.78, 0.32]));
      const ll = Math.hypot(L[0], L[1], L[2]) || 1;
      for (let i = 0; i < 2; i++) {
        const A = S.auge[i];
        let gu = (L[0] * A.u[0] + L[1] * A.u[1] + L[2] * A.u[2]) / ll;
        let gv = (L[0] * A.v[0] + L[1] * A.v[1] + L[2] * A.v[2]) / ll;
        const gl2 = Math.hypot(gu, gv) || 1;
        gu /= gl2; gv /= gl2;
        S.glanzVersatz[i * 2] = S.augeVersatz[i * 2] + gu * ru * P.glanzVersatz;
        S.glanzVersatz[i * 2 + 1] = S.augeVersatz[i * 2 + 1] + gv * rv * P.glanzVersatz;
      }
      S.glanzR = ru * P.glanzGroesse;
      S.glanzAn = zu < 0.45 ? 1 : 0;

      /* --- Mund ----------------------------------------------------------
       * Eine einzige Form statt fuenfzehn Gliedern. Geschlossen ein flacher
       * Bogen, beim Fressen waechst die Hoehe zur dunklen Hoehlung
       * (DOSSIER §6: „rund 30 % der Koerperbreite"). */
      const mu = P.mundBreite * radius;
      S.mundR[0] = mu;
      S.mundR[1] = (P.mundDicke + P.mundOeffnung * offen) * radius;
      /* Laecheln: die Mundwinkel liegen um mundLaecheln * mu hoeher als die
       * Mitte. Beim Oeffnen faellt der Bogen flacher, sonst wuerde die
       * Hoehlung sichelfoermig statt oval. */
      S.mundKruemm = (P.mundLaecheln * (1 - 0.7 * offen)) / Math.max(mu, 1e-6);

      /* --- Farbe ---------------------------------------------------------
       * Quelle ist R.gel.farbe (Fraktion und Todeszustand schon eingerechnet).
       * Der Mund ist der hellere, gesaettigtere Ton, das Auge der dunklere —
       * so gemessen an beiden Serien. Ein warmer Sockel verhindert, dass das
       * Auge zu neutralem Schwarz absackt; im Referenzmaterial ist selbst auf
       * blauen Koerpern das Auge warm dunkel (33,18,23). */
      const gelF = R.gel && R.gel.farbe;
      const tief = (gelF && gelF.tief) || (ctx.pal && ctx.pal.deep) || [0.04, 0.22, 0.58];
      const glanzF = (gelF && gelF.glanz) || [0.95, 0.97, 1.0];

      for (let i = 0; i < 3; i++) {
        S.farbeMund[i] = tief[i] * 0.58;
        S.farbeAuge[i] = tief[i] * 0.16 + [0.026, 0.016, 0.018][i];
        S.farbeGlanz[i] = klemm(glanzF[i] * 0.98, 0, 1);
      }

      /* --- Todespfuetze (GDD 01 §50) --------------------------------------
       * Dieselbe Quelle, die gel.js benutzt. Die Pfuetze bekommt kein
       * leuchtendes Auge: der Lichtpunkt geht zuerst, dann verblasst das
       * ganze Gesicht in der truebe werdenden Masse. */
      const tot = klemm((window.Tod && window.Tod.aktiv && window.Tod.pfuetze) || 0, 0, 1);
      if (tot > 0.02) S.glanzAn = 0;
      S.deckung = 1 - 0.75 * tot;

      /* Wie weit ein Fragment laengs der Ankernormale abliegen darf. Auf
       * einer Kugel liegt der Rand einer so kleinen Form nur Bruchteile
       * davon ab; die Grenze faengt nur den Fall, dass eine starke Stauchung
       * die Flaeche unter dem Anker durchklappt. */
      S.grenze = Math.max(ru, rv, mu) * 1.6 + 0.10 * radius;
      S.tiefe = P.tiefe * radius;
      S.sichtbar = S.deckung > 0.02;
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit || !S.sichtbar) return;

      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) mesh = S.mesh = eigenesNetz(gl, ctx.surface);
      if (!mesh || !mesh.vao) return;

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      if (!viewProj) return;

      gl.bindVertexArray(mesh.vao);

      /* Huelle hochladen, falls in diesem Bild noch niemand sonst es getan
       * hat. Zaehler ist die Bildnummer und nicht ctx.time: bei angehaltener
       * Zeit waere die Huelle sonst eingefroren, obwohl die Verformung
       * weiterlaeuft. Der Grundzug (Ordnung 58) laedt danach dasselbe noch
       * einmal — das ist ein Puffer-Schreibvorgang, kein Bild Verzug. */
      const bildNr = (R._bildNr !== undefined) ? R._bildNr : (ctx.time || 0);
      if (ctx.surface && S.bild !== bildNr) {
        S.bild = bildNr;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
        if (mesh.nb) {
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.normals);
        }
      }

      const p = S.prog, u = p.u || {};
      gl.useProgram(p);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform1f(u.uTiefe, S.tiefe);

      gl.uniform3fv(u.uAugeP0, S.auge[0].p);
      gl.uniform3fv(u.uAugeU0, S.auge[0].u);
      gl.uniform3fv(u.uAugeV0, S.auge[0].v);
      gl.uniform3fv(u.uAugeN0, S.auge[0].n);
      gl.uniform3fv(u.uAugeP1, S.auge[1].p);
      gl.uniform3fv(u.uAugeU1, S.auge[1].u);
      gl.uniform3fv(u.uAugeV1, S.auge[1].v);
      gl.uniform3fv(u.uAugeN1, S.auge[1].n);
      gl.uniform4fv(u.uAugeR, S.augeR);
      gl.uniform2fv(u.uAugeKruemm, S.augeKruemm);
      gl.uniform4fv(u.uAugeVersatz, S.augeVersatz);
      gl.uniform4fv(u.uGlanzVersatz, S.glanzVersatz);
      gl.uniform1f(u.uGlanzR, S.glanzR);
      gl.uniform1f(u.uGlanzAn, S.glanzAn);

      gl.uniform3fv(u.uMundP, S.mund.p);
      gl.uniform3fv(u.uMundU, S.mund.u);
      gl.uniform3fv(u.uMundV, S.mund.v);
      gl.uniform3fv(u.uMundN, S.mund.n);
      gl.uniform2f(u.uMundR, S.mundR[0], S.mundR[1]);
      gl.uniform1f(u.uMundKruemm, S.mundKruemm);

      gl.uniform3fv(u.uFarbeAuge, S.farbeAuge);
      gl.uniform3fv(u.uFarbeGlanz, S.farbeGlanz);
      gl.uniform3fv(u.uFarbeMund, S.farbeMund);
      gl.uniform1f(u.uSeite, P.seite);
      gl.uniform1f(u.uGrenze, S.grenze);
      gl.uniform1f(u.uDeckung, S.deckung);

      /* Undurchsichtiger Durchgang mit Tiefenschreiben: das Gesicht muss die
       * Gelrueckwand (58) verdraengen, sonst waere es hinter ihr. Gemischt
       * wird nur, damit die eine Pixelbreite Flanke nicht treppt — die Farbe
       * kommt vormultipliziert aus dem Shader. */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

      /* Zustand zuruecklassen, wie ihn die Pipeline erwartet. */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
  });

})();
