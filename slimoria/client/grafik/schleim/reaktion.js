'use strict';
/* ===========================================================================
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * reaktion.js — der Koerper als Rueckmeldung (GDD 01 §66).
 *
 * Nur im zweiten Renderpfad (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt: dort laufen die Blindvergleiche.
 *
 * Fuenf Zustaende werden sichtbar, und zwar am Koerper selbst statt nur an
 * schwebenden Zahlen:  Treffer · Heilung · prall nach dem Fressen ·
 * Erschoepfung bei wenig Leben · Erloeschen im Tod.
 *
 * ===========================================================================
 * 1. Was am Referenzmaterial gemessen wurde
 * ===========================================================================
 *
 * Die Frage war nicht „welche Farbe", sondern „welche FORM hat eine
 * Zustandsfaerbung, die nach Zeichnung aussieht und nicht nach Kamera".
 * GRAFIK-MODULE.md §0 verlangt harte Kanten, zwei bis drei Tonstufen und
 * grosse ruhige Flaechen; eine weiche Aura ist ausdruecklich verboten. Also
 * wurde an drei Bildern nachgemessen, wie die Vorlagen es machen. Alle
 * Zahlen sind rohe sRGB-Codewerte, Helligkeit als Rec.709-Luma.
 *
 * ---------------------------------------------------------------------------
 * (a) `ref/slime-rancher/sr2-glow-slimes-squash-dome.jpg`, Zeile 690 —
 *     der grosse Glueh-Schleim mit gelbem Randband auf rotem Koerper.
 *
 *   Koerperbreite in dieser Zeile   x 1202 .. 1514  =  312 px
 *   Hintergrund links / rechts      L 83 / L 107
 *   Koerperton (Mitte)              (179, 29, 66)   L 63
 *   Randband, Plateau               (255,252,109)   L 243
 *   -----------------------------------------------------------------------
 *   AUSSENKANTE des Bandes          L 49 -> L 244 ueber 3 px (x 1202..1205)
 *                                   L 243 -> L 106 ueber 2 px (x 1512..1514)
 *   UEBERHOEHUNG ueber den Koerper   +180 Stufen, Faktor 3.86
 *   SAETTIGUNG Band / Koerper        0.57 gegen 0.84
 *   STUFENLEITER nach innen          Abstand von der Silhouette:
 *                                     28 px -> L 243  -> Anteil 1.00
 *                                     32 px -> L 204  -> Anteil 0.78
 *                                     40 px -> L 152  -> Anteil 0.49
 *                                     44 px -> Koerperton
 *                                   auf die Koerperbreite bezogen:
 *                                     9.0 % / 11.5 % / 14.1 %
 *
 * Das ist der Kernbefund: das Band ist KEIN Verlauf. Es hat eine 2–3 px
 * harte Aussenkante und faellt nach innen in drei flachen Stufen ab. Genau
 * das ist §0 („zwei bis drei Tonstufen je Oberflaeche, harte Kante"), und
 * genau diese drei Anteile — 1.00 / 0.78 / 0.49 — sind unten die Konstante
 * `STUFE`, die Prozentwerte sind `RAND`.
 *
 * ---------------------------------------------------------------------------
 * (b) `ref/slime-rancher/sr1-lava-slimes-airborne-and-squash.jpg`, Zeile 520 —
 *     die Lavaadern, also eine Faerbung MITTEN im Koerper.
 *
 *   Koerperton                      (155, 6, 5)     L 38
 *   Ader                            (255,248,80)    L 237
 *   KANTE der Ader                  L 85 -> L 237 ueber 1 px (x 846..847)
 *                                   L 197 -> L 36 ueber 1 px (x 850..851)
 *   Aderbreite                      4–5 px
 *   UEBERHOEHUNG                    +199 Stufen
 *
 * Bestaetigt (a) an einer zweiten Bandart: auch im Koerperinneren ist die
 * Kante hart bis zur Pixelgrenze. Nichts an diesen Vorlagen laeuft weich aus.
 *
 * ---------------------------------------------------------------------------
 * (c) `ref/slime-rancher/sr1-slime-eating-face-closeup.jpg`, Zeile 620 —
 *     der Fressbogen auf einem BLAUEN Koerper. Das ist die sauberste
 *     Messung des additiven Lichts, weil hier kein Kanal am Anschlag steht.
 *
 *   Koerperton                      (  6, 67, 134)  L 58
 *   Bogen, Spitze                   (110,146, 194)  L 142
 *   -----------------------------------------------------------------------
 *   ADDITIVES LICHT                 (104, 79, 60) -> normiert (1.00,0.76,0.58)
 *                                   also ein WARMES WEISS, kein Neonton
 *   UEBERHOEHUNG                    +84 Stufen, Faktor 2.45
 *   KANTE                           3 px beiderseits
 *   Bogenbreite                     18 und 22 px
 *
 * Daher die Farbe fuer „prall nach dem Fressen": (1.00, 0.76, 0.58), direkt
 * uebernommen. Es ist die gemessene Farbe genau dieses Ereignisses.
 *
 * ---------------------------------------------------------------------------
 * (d) `ref/blob-jelly/slime-heroes-screenshot-2.jpg`, Zeile 640 —
 *     Gegenprobe, wie satt eine gesunde Gruenflaeche in diesem Genre ist:
 *     (195,241,63), L 219, Schattenseite (109,158,40) L 140.
 *
 * ---------------------------------------------------------------------------
 * (e) Die HUE-Werte kommen NICHT aus den Vorlagen, sondern aus dem eigenen
 *     HUD (`client/ui.css` Zeile 525–527, GDD 10 §73–78):
 *
 *       erlitten  #ff2f22    Heilung  #2fe563    ausgeteilt  #ffbe23
 *
 *     Das ist Absicht und wichtiger als eine fremde Farbe: die schwebende
 *     Zahl und der Koerperblitz muessen DIESELBE Farbe haben, sonst liest
 *     man zwei Ereignisse statt einem. Uebernommen werden sie unveraendert,
 *     weil hier UEBERMALT und nicht addiert wird (siehe unten):
 *
 *       Treffer   #ff2f22  ->  (1.00, 0.18, 0.13)
 *       Heilung   #2fe563  ->  (0.18, 0.90, 0.39)
 *
 * ===========================================================================
 * 2. Wie daraus fuenf unterscheidbare Zustaende werden
 * ===========================================================================
 *
 * Farbe allein reicht nicht — bei 1600x900 und einem Koerper von rund 120 px
 * Breite sind zwei warme Toene aus zehn Metern dasselbe. Getrennt werden die
 * Zustaende deshalb ueber die FORM des Bandes. Vier Bandarten, alle mit der
 * gemessenen Stufenleiter und harter Kante:
 *
 *   1 Randband     Stufen von der Silhouette nach innen (Messung a). Seine
 *                  Weite ist einstellbar; bei Faktor 12 bedeckt es den
 *                  ganzen Koerper, bei Faktor 0.05 ist es ein Faden.
 *   2 Hoehenwelle  ein schmales Band, das den Koerper von unten nach oben
 *                  durchlaeuft.
 *   3 Vollkoerper  flaechig, ohne Binnenzeichnung — der eine Moment, in dem
 *                  der ganze Koerper umschlaegt.
 *   4 Fuellstand   harte waagerechte Kante; darunter ist der Koerper gefuellt.
 *
 *   Treffer        3 (0.09 s) danach 1 (bis 0.40 s)  Rot #ff2f22
 *                  — schlaegt ueberall ein und bleibt als Umriss stehen
 *   Heilung        2, laeuft in 0.55 s von unten durch  Gruen #2fe563
 *   Prall          4, steigt in 0.40 s und sinkt in 0.50 s wieder ab
 *                  Warmweiss (1.00, 0.76, 0.58), gemessen
 *   Erschoepfung   2, schwach, ein Schlag je 1.4 s, Aschton der eigenen
 *                  Palette; dazu eine milde Abdunklung ueber den
 *                  Wunschzettel
 *   Erloeschen     1, das von „ganzer Koerper" auf „nichts" zusammenlaeuft
 *
 * Die zeitliche Huellkurve ist ebenfalls STUFIG, nicht stetig: sie springt
 * ueber dieselbe Leiter 1.00 / 0.78 / 0.49 und dann auf null. Eine weiche
 * Ausblendung waere genau der „weich auslaufende Schimmer" aus §0, nur in
 * der Zeitachse statt in der Flaeche.
 *
 * ---------------------------------------------------------------------------
 * GEMALT, NICHT ADDIERT — der eine Befund, der aus dem ersten Versuch kam
 *
 * Der erste Bau addierte Licht (`blendFunc(ONE, ONE)`), so wie glanz.js und
 * rand.js es tun, und so wie es der Vertrag in gel.js §6 fuer Aufsaetze
 * empfiehlt. Die Aufnahme hat das widerlegt: der Koerper ist blau und hell
 * (Palette `kern` = 0.16, 0.62, 0.98). Addiert man Rot darauf, laufen alle
 * drei Kanaele an den Anschlag, und aus dem Trefferblitz wird ein weisser
 * Fliederball — nachzusehen in `gauntlet/shots/r-treffer/v1/frame_002.png`.
 * Eine Addition kann auf einem hellen Koerper nur nach Weiss, nie nach Rot.
 *
 * Deshalb wird hier UEBERMALT: `blendFunc(ONE, ONE_MINUS_SRC_ALPHA)` mit
 * vormultipliziertem Alpha. Das ist auch die stilistisch richtige Antwort.
 * Ein Zeichner, der eine getroffene Figur rot aufblitzen laesst, mischt kein
 * Licht dazu — er faerbt die Flaeche um. Messung (a) sagt dasselbe: das
 * Randband des Gluehschleims steht ueber seiner ganzen Laenge auf demselben
 * Wert (255,252,109), egal wie hell der Koerper darunter ist. Das ist Farbe,
 * kein Licht. Nur der Fressbogen aus Messung (c) verhaelt sich additiv — und
 * genau der ist hier auch der einzige Zustand, dessen Farbe direkt aus der
 * Messung stammt statt aus dem HUD.
 *
 * Zwei Dinge folgen daraus, die eine Addition gar nicht koennte:
 *  - Der Erschoepfungspuls kann den Koerper DUNKLER machen (er malt die
 *    tiefe Zone der eigenen Palette).
 *  - Die Farben bleiben genau die des HUD, statt sich mit dem Koerper zu
 *    einer dritten Farbe zu mischen. Schwebende Zahl und Koerper melden
 *    damit sichtbar dasselbe Ereignis.
 *
 * GDD 10 §98 (Lesbarkeit schlaegt Effektdichte) steht ueber allem: es ist
 * immer nur EIN Ereignisband aktiv, hoechstens begleitet vom
 * Erschoepfungspuls. Im Tod schweigt alles andere.
 *
 * ===========================================================================
 * 3. Warum zwei Eintraege aus einer Datei
 * ===========================================================================
 *
 * `reaktion`, Ordnung 59 — zeichnet nichts. Sie liest den Zustand und legt
 *   ihn ab; ausserdem bedient sie den Wunschzettel des Materialkerns
 *   (`R.gel.wunsch`, gel.js §6), den nur Module mit Ordnung < 60 setzen
 *   duerfen: `dichteMul` fuer die pralle Masse, `tonung` und `glanzMul` fuer
 *   den muede gewordenen Koerper. Ordnung 59 ist die letzte Zahl vor dem
 *   Materialkern, also die spaeteste Stelle, an der der Wunsch noch im
 *   selben Bild ankommt.
 *
 * `reaktion-blitz`, Ordnung 74 — zeichnet. Ein Band UNTER dem Materialkern
 *   wuerde von dessen Absorptionsdurchgang D2b
 *   (`blendFuncSeparate(ZERO, SRC_COLOR)`) mit der Gel-Dicke multipliziert
 *   und damit weitgehend ausgeloescht; gel.js §6 schreibt fuer alles, was
 *   AUF der Oberflaeche sitzt, ausdruecklich Ordnung > 60 vor. 74 und nicht
 *   70, weil ein Treffer das Glanzlicht (glanz.js, 70) und den Randsaum
 *   (rand.js, 72) ueberdecken soll und nicht umgekehrt — und weil eine
 *   eigene Zahl besser ist als eine geteilte: bei gleicher Ordnung
 *   entscheidet die Anmeldereihenfolge, und die haengt an laden.js.
 *   ABWEICHUNG VOM AUFTRAG (dort stand nur Ordnung 59) — siehe Bericht.
 *
 * Beide Eintraege sind einzeln entbehrlich: faellt der Shader beim Aufbau
 * aus, bleiben Dichte, Tonung und Glanz trotzdem richtig, und umgekehrt.
 *
 * ===========================================================================
 * 4. Determinismus
 * ===========================================================================
 *
 * Kein `Math.random`, kein `Date`, kein `performance.now`. Das Modul haelt
 * ueberhaupt KEINEN Zustand ueber Bilder hinweg: es liest jedes Bild das
 * Ereignisprotokoll `ctx.game.ereignisse` neu, in dem jeder Eintrag seinen
 * Zeitstempel `t` in Millisekunden von `G.zeit` traegt — und `ctx.time` IST
 * `G.zeit` (game.js Zeile 460). Das Alter eines Ereignisses ist damit exakt
 * und wiederholbar, unabhaengig davon, wann und wie oft gezeichnet wird.
 * Ein Zaehler, der zwischen zwei Bildern hochlaeuft, waere bei der
 * angehaltenen Uhr der Aufnahme falsch.
 * ======================================================================== */

(function () {

  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/reaktion.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* =====================================================================
   * Die gemessenen Konstanten (siehe Kopfkommentar 1a)
   * =================================================================== */

  /* Stufenleiter: L 243 / 204 / 152 ueber einem Koerperton von 63, normiert
   * auf die Ueberhoehung 180. Gilt raeumlich (nach innen) UND zeitlich
   * (Abklingen) — beides sind Tonstufen, keine Verlaeufe. */
  const STUFE = [1.00, 0.78, 0.49];

  /* Lage der drei Kanten des Randbandes, als Anteil der Koerperbreite auf
   * dem Schirm.
   *
   * Die VERHAELTNISSE kommen aus Messung (a): 28 : 36 : 44 px = 1 : 1.29 :
   * 1.57. Die GROESSE kommt aus Messung (c), weil dort ein voruebergehendes
   * Band gemessen ist und hier nicht das Dauermaterial eines Gluehschleims
   * nachgebaut wird: 22 px auf einer Koerperbreite von 485 px = 4.5 %.
   * Der erste Versuch mit den 9 % aus (a) war im Bild nachweislich zu fett —
   * er hat die Silhouette gefressen statt sie zu zeichnen. */
  const RAND = [0.045, 0.058, 0.071];

  /* Farben. Farbton aus dem eigenen HUD (ui.css 525–527); „prall" ist das
   * direkt gemessene Fresslicht aus Messung (c).
   *
   * Sie werden GEMALT, nicht addiert (siehe Kopfkommentar 2). Deshalb steht
   * hier die volle HUD-Saettigung und nicht die 0.57 aus Messung (a): jene
   * 0.57 sind die Saettigung eines LICHTS, das sich mit der Koerperfarbe
   * mischt. Eine Farbe, die den Koerper ueberdeckt, muss so satt sein wie
   * die Zahl, zu der sie gehoert. */
  const FARBE = {
    treffer:   [1.00, 0.18, 0.13],   // #ff2f22  st-erlitten
    heilung:   [0.18, 0.90, 0.39],   // #2fe563  st-heilung
    prall:     [1.00, 0.76, 0.58],   // gemessen, Messung (c)
    erloeschen:[0.90, 0.96, 1.00],
  };

  /* =====================================================================
   * Stellschrauben
   * =================================================================== */
  const P = {
    /* Treffer. 0.40 s: kuerzer als drei Bilder einer 30-Hz-Anzeige waere
     * unsichtbar, laenger als eine halbe Sekunde waere kein Blitz mehr. */
    trefferDauer:    0.40,
    trefferStaerke:  0.92,
    trefferVoll:     0.09,   // wie lange der GANZE Koerper aufblitzt
    /* Heilung. Die Welle braucht laenger als der Blitz, weil sie eine
     * Strecke zuruecklegt und dabei lesbar bleiben soll. */
    heilDauer:       0.55,
    heilStaerke:     0.82,
    heilBreite:      0.22,   // Anteil der Koerperhoehe
    /* Prall. Fuellt in 45 % der Zeit auf, danach steht der Fuellstand und
     * das Leuchten geht in Stufen aus. */
    prallDauer:      0.90,
    prallStaerke:    0.80,
    prallDichte:     0.22,   // Zuschlag auf R.gel.wunsch.dichteMul
    /* Erschoepfung. Kein Blitz, ein Herzschlag. */
    muedeSchwelle:   0.35,   // ab diesem Lebensanteil abwaerts
    muedeStaerke:    0.55,
    muedeTakt:       1.40,   // Sekunden je Schlag
    muedeTonung:     0.22,   // maximale Abdunklung der Gelpalette
    /* Erloeschen. */
    erloeschDauer:   1.10,
    erloeschStaerke: 0.80,
    erloeschVoll:    0.07,
  };

  const MAX = 3;   // gleichzeitige Baender

  const S = {
    bereit: false,
    prog: null,
    u: null,
    mesh: null,
    /* jedes Bild neu gefuellt */
    baender: [],
    unten: 0,
    hoch: 1,
    breitePx: 200,
  };

  /* =====================================================================
   * Shader
   * =================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
out vec3 vPos;
out vec3 vNormal;
/* invariant, damit dieser Durchgang auf exakt derselben Tiefe landet wie der
 * Tiefenvorlauf D2a des Materialkerns und depthFunc(LEQUAL) greift. */
invariant gl_Position;
void main() {
  vPos = aPos;
  vNormal = aNormal;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNormal;

uniform vec3  uCam;
uniform float uUnten;      // Weltkoordinate der tiefsten Stelle der Huelle
uniform float uHoch;       // halbe Hoehe der Huelle
uniform float uBreitePx;   // Koerperbreite auf dem Schirm, in Pixeln

uniform int   uZahl;
uniform int   uArt[3];
uniform vec3  uFarbe[3];
uniform float uStaerke[3];
uniform float uLage[3];
uniform float uWeite[3];

out vec4 outColor;

/* Die gemessene Stufenleiter aus sr2-glow-slimes-squash-dome.jpg:
 * 1.00 bis k1, 0.78 bis k2, 0.49 bis k3, danach nichts.
 *
 * Die Kanten werden mit fwidth genau eine Pixelbreite geglaettet — das ist
 * dieselbe Loesung wie in PHASE-GRAFIK-PLAN G4: optisch hart (gemessen sind
 * 2–3 px), aber ohne das Flimmern, das ein blankes step() ohne zeitliche
 * Kantenglaettung erzeugen wuerde. */
float stufen(float d, float k1, float k2, float k3) {
  float f = max(fwidth(d), 1e-6);
  float a = smoothstep(k1 - f, k1 + f, d);
  float b = smoothstep(k2 - f, k2 + f, d);
  float c = smoothstep(k3 - f, k3 + f, d);
  return mix(1.00, mix(0.78, mix(0.49, 0.0, c), b), a);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  if (dot(N, V) < 0.0) N = -N;
  float ndv = max(dot(N, V), 0.0);

  /* Abstand zur Silhouette in BILDSCHIRMPIXELN (PHASE-GRAFIK-PLAN G7).
   * Nur so ist das Randband an einer stark und an einer schwach gekruemmten
   * Stelle gleich breit — ein Fresnel-Term waere es nicht, und dann waere
   * die gemessene Bandbreite von 9 % der Koerperbreite nicht uebertragbar. */
  float randPx = ndv / max(fwidth(ndv), 1e-5);

  /* Hoehe im Koerper, 0 unten, 1 oben. Folgt der Verformung, weil uUnten
   * und uHoch jedes Bild aus der Huelle gemessen werden. */
  float hoehe = (vPos.y - uUnten) / max(2.0 * uHoch, 1e-4);

  /* Vorne nach hinten zusammengesetzt, mit vormultipliziertem Alpha.
   * Eintrag 0 liegt oben — die Liste kommt in der Reihenfolge ihrer
   * Wichtigkeit an. */
  vec3 cp = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < 3; i++) {
    if (i >= uZahl) break;
    int a = uArt[i];
    float w = max(uWeite[i], 1e-4);
    float m = 0.0;

    if (a == 1) {
      /* Randband: drei Stufen von der Silhouette nach innen. */
      m = stufen(randPx, uBreitePx * ` + RAND[0].toFixed(4) + ` * w,
                         uBreitePx * ` + RAND[1].toFixed(4) + ` * w,
                         uBreitePx * ` + RAND[2].toFixed(4) + ` * w);
    } else if (a == 2) {
      /* Hoehenwelle: dasselbe Profil, gespiegelt um uLage. */
      m = stufen(abs(hoehe - uLage[i]), w * 0.34, w * 0.62, w);
    } else if (a == 3) {
      /* Vollkoerper: eine ruhige Flaeche, ohne Binnenzeichnung. */
      m = 1.0;
    } else if (a == 4) {
      /* Fuellstand: harte waagerechte Kante bei uLage, darunter eine ruhige
       * Flaeche, an der Kante selbst die helle Stufenleiter. */
      float d = hoehe - uLage[i];
      float f = max(fwidth(d), 1e-6);
      float unten = 1.0 - smoothstep(-f, f, d);
      float linie = stufen(abs(d), 0.030, 0.058, 0.090);
      m = 0.28 * unten + 0.72 * linie;
    }

    float ab = clamp(uStaerke[i] * m, 0.0, 1.0) * (1.0 - alpha);
    cp += uFarbe[i] * ab;
    alpha += ab;
  }

  outColor = vec4(cp, alpha);
}`;

  /* =====================================================================
   * Zustand lesen — ohne einen einzigen gemerkten Wert
   * =================================================================== */

  /* Das juengste Ereignis der Art `art`, das noch nicht aelter als
   * `maxAlter` Sekunden ist. `x.t` sind Millisekunden von G.zeit, `ctx.time`
   * ist dieselbe Uhr — die Differenz ist damit exakt und wiederholbar. */
  function juengstes(spiel, art, maxAlter, t) {
    const e = spiel.ereignisse;
    if (!Array.isArray(e)) return null;
    for (let i = e.length - 1; i >= 0; i--) {
      const x = e[i];
      const alter = t - x.t / 1000;
      if (alter > maxAlter + 1.0) break;      // aelter als alles, was zaehlt
      if (x.art === art && alter >= -0.002 && alter < maxAlter) {
        return { alter: Math.max(alter, 0), d: x };
      }
    }
    return null;
  }

  /* Die zeitliche Huellkurve. Stufig, nicht stetig — siehe Kopfkommentar 2. */
  function zeitStufe(u) {
    if (u < 0.25) return STUFE[0];
    if (u < 0.55) return STUFE[1];
    if (u < 1.00) return STUFE[2];
    return 0;
  }

  const klemm = (x, a, b) => (x < a ? a : (x > b ? b : x));

  /* =====================================================================
   * Huelle vermessen: Boden, halbe Hoehe, Breite auf dem Schirm
   *
   * Die Bildschirmbreite braucht das Randband: gemessen sind 4.5 % der
   * KOERPERBREITE, nicht eine feste Pixelzahl. Waere die Breite fest, waere
   * das Band aus drei Metern zu duenn und aus zwanzig zu dick.
   * =================================================================== */
  function huelleMessen(ctx) {
    const pos = ctx.surface && ctx.surface.positions;
    const vp = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
    const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
    if (!pos || pos.length < 9 || !vp || !cam) return false;

    let yMin = Infinity, yMax = -Infinity;
    let xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
    for (let i = 0; i + 2 < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
      if (z < zMin) zMin = z; if (z > zMax) zMax = z;
    }
    S.unten = yMin;
    S.hoch = Math.max((yMax - yMin) * 0.5, 1e-3);

    const mx = (xMin + xMax) * 0.5, my = (yMin + yMax) * 0.5, mz = (zMin + zMax) * 0.5;

    /* Rechts-Richtung der Kamera: kreuz(Blick, oben). */
    let bx = mx - cam[0], bz = mz - cam[2];
    let rx = -bz, rz = bx;
    const lr = Math.hypot(rx, rz);
    if (lr < 1e-6) { rx = 1; rz = 0; } else { rx /= lr; rz /= lr; }

    /* Halbe Ausdehnung quer zur Blickachse, aus den Punkten selbst. */
    let halb = 0;
    for (let i = 0; i + 2 < pos.length; i += 3) {
      const d = Math.abs((pos[i] - mx) * rx + (pos[i + 2] - mz) * rz);
      if (d > halb) halb = d;
    }
    halb = Math.max(halb, 1e-3);

    /* Beide Punkte durch dieselbe Matrix, Differenz in NDC mal halbe
     * Bildbreite ergibt die halbe Koerperbreite in Pixeln. */
    const ndcX = (x, y, z) => {
      const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (Math.abs(cw) < 1e-6) return 0;
      return (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw;
    };
    const a = ndcX(mx, my, mz);
    const b = ndcX(mx + rx * halb, my, mz + rz * halb);
    const bild = ctx.breite || 1600;
    S.breitePx = klemm(Math.abs(b - a) * bild, 12, 4000);
    return true;
  }

  /* =====================================================================
   * Die Baender dieses Bildes zusammenstellen
   * =================================================================== */
  function baenderSammeln(ctx, muedeFarbe) {
    const aus = [];
    const spiel = ctx.game;
    if (!spiel) return aus;
    const t = ctx.time;
    const sp = spiel.spieler || {};
    const nimm = (b) => { if (aus.length < MAX) aus.push(b); };

    /* --- Erloeschen im Tod. Schliesst alles andere aus: ein sterbender
     * Koerper meldet keine Treffer mehr, und zwei Ereignisse gleichzeitig
     * waeren genau die Effektdichte, die GDD 10 §98 verbietet. -------- */
    if (spiel.phase === 'tot' || sp.tot) {
      const e = juengstes(spiel, 'tod', P.erloeschDauer, t);
      if (e) {
        const u = e.alter / P.erloeschDauer;
        /* EIN Band, kein zweites: es beginnt so breit wie moeglich und zieht
         * sich auf einen Faden zusammen. Das Bild ist damit erst ein heller
         * Saum um den ganzen Koerper, dann ein heller Umriss, dann nichts —
         * „Erloeschen" als FORM statt als Transparenz, und die Kante bleibt
         * bis zum letzten Bild hart. Quadratisch, damit der breite Anfang
         * kurz ist und der Umriss lange steht: er ist das, was man liest.
         *
         * Faktor 12 statt 7, weil 7 im Bild nur einen dicken weissen Rand
         * ergab. Die Mitte erreicht das Band auch bei 12 nicht, und das ist
         * kein Fehler: `randPx` im Shader ist die LINEARISIERTE Naeherung
         * des Silhouettenabstands (Plan G7), die zur Koerpermitte hin gegen
         * unendlich laeuft. Wer die Mitte auch faerben will, braucht das
         * Vollkoerperband (art 3) — das aber blendete hier die Form aus. */
        const weite = 12.0 * (1 - u) * (1 - u) + 0.05;
        nimm({ art: 1, farbe: FARBE.erloeschen,
               staerke: P.erloeschStaerke * zeitStufe(u), lage: 0, weite });
      }
      return aus;
    }

    /* --- Treffer ------------------------------------------------------ */
    const tr = juengstes(spiel, 'spielerSchaden', P.trefferDauer, t);
    if (tr) {
      const u = tr.alter / P.trefferDauer;
      /* Ein Viertel des Lebens ist der volle Ausschlag. Darunter wird der
       * Blitz schwaecher, aber nie unsichtbar — ein Kratzer soll man auch
       * sehen, nur eben nicht wie einen Beinahetod. */
      const anteil = sp.maxHp ? klemm((tr.d.betrag || 0) / (sp.maxHp * 0.25), 0, 1) : 0.5;
      const s = P.trefferStaerke * (0.55 + 0.45 * anteil) * zeitStufe(u);
      if (tr.alter < P.trefferVoll) {
        nimm({ art: 3, farbe: FARBE.treffer, staerke: s * 0.80, lage: 0, weite: 1 });
      }
      nimm({ art: 1, farbe: FARBE.treffer, staerke: s, lage: 0, weite: 1 });
    }

    /* --- Heilung ------------------------------------------------------ */
    const he = juengstes(spiel, 'heilung', P.heilDauer, t);
    if (he && (he.d.betrag || 0) > 0) {
      const u = he.alter / P.heilDauer;
      /* Die Welle laeuft von unterhalb des Koerpers bis darueber hinaus,
       * damit sie an keinem Ende abgeschnitten erscheint. Die Staerke
       * bleibt dabei konstant: das Ereignis ist die BEWEGUNG, nicht das
       * Verloeschen. */
      const lage = -P.heilBreite + u * (1 + 2 * P.heilBreite);
      nimm({ art: 2, farbe: FARBE.heilung, staerke: P.heilStaerke, lage, weite: P.heilBreite });
    }

    /* --- Prall nach dem Fressen -------------------------------------- */
    const pr = juengstes(spiel, 'fressErfolg', P.prallDauer, t);
    if (pr) {
      const u = pr.alter / P.prallDauer;
      /* Der Fuellstand steigt in 45 % der Zeit bis oben und sinkt dann
       * wieder ab. Das ist der Unterschied zu einem Blitz: der Koerper
       * fuellt sich sichtbar und setzt sich wieder — und er endet bei null
       * Flaeche, statt am Ende noch halb cremefarben dazustehen. */
      const fuell = u < 0.45 ? u / 0.45 : 1 - (u - 0.45) / 0.55;
      nimm({ art: 4, farbe: FARBE.prall, staerke: P.prallStaerke,
             lage: klemm(fuell, 0, 1), weite: 1 });
    }

    /* --- Erschoepfung ------------------------------------------------- */
    const muede = muedigkeit(sp);
    if (muede > 0.01) {
      /* Ein Schlag je muedeTakt, und er dauert nur die halbe Taktzeit —
       * dazwischen ist der Koerper ruhig. Ein Dauerleuchten waere die
       * verbotene Aura, nur langsamer. */
      const ph = (ctx.time / P.muedeTakt) % 1;
      if (ph < 0.55) {
        const u = ph / 0.55;
        const lage = -0.18 + u * 1.36;
        nimm({ art: 2, farbe: muedeFarbe, staerke: P.muedeStaerke * muede,
               lage, weite: 0.22 });
      }
    }

    return aus;
  }

  function muedigkeit(sp) {
    if (!sp || !sp.maxHp) return 0;
    const f = sp.hp / sp.maxHp;
    if (f >= P.muedeSchwelle) return 0;
    if (f <= 0.10) return 1;
    return (P.muedeSchwelle - f) / (P.muedeSchwelle - 0.10);
  }

  /* =====================================================================
   * Netz — dasselbe wie Gel und Glanz, damit die Tiefe exakt passt
   * =================================================================== */
  function eigenesNetz(gl, surface) {
    if (typeof G.mesh === 'function') {
      return G.mesh(gl, surface.positions, surface.normals, surface.indices);
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, surface.positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, surface.normals, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, surface.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, pb, nb, ib, count: surface.indices.length };
  }

  /* =====================================================================
   * Eintrag 1 — Ordnung 59: Zustand lesen, Wunschzettel bedienen
   * =================================================================== */
  G.modul({
    name: 'reaktion',
    ordnung: 59,

    regler: [
      { key: 'trefferStaerke', min: 0.0, max: 2.0, step: 0.02, wert: P.trefferStaerke },
      { key: 'trefferDauer', min: 0.10, max: 1.20, step: 0.01, wert: P.trefferDauer },
      { key: 'heilStaerke', min: 0.0, max: 1.6, step: 0.02, wert: P.heilStaerke },
      { key: 'heilDauer', min: 0.20, max: 1.50, step: 0.01, wert: P.heilDauer },
      { key: 'heilBreite', min: 0.08, max: 0.60, step: 0.01, wert: P.heilBreite },
      { key: 'prallStaerke', min: 0.0, max: 1.6, step: 0.02, wert: P.prallStaerke },
      { key: 'prallDauer', min: 0.30, max: 2.50, step: 0.05, wert: P.prallDauer },
      { key: 'prallDichte', min: 0.0, max: 0.80, step: 0.01, wert: P.prallDichte },
      { key: 'muedeSchwelle', min: 0.05, max: 0.70, step: 0.01, wert: P.muedeSchwelle },
      { key: 'muedeStaerke', min: 0.0, max: 0.80, step: 0.01, wert: P.muedeStaerke },
      { key: 'muedeTakt', min: 0.60, max: 3.00, step: 0.05, wert: P.muedeTakt },
      { key: 'muedeTonung', min: 0.0, max: 0.40, step: 0.01, wert: P.muedeTonung },
      { key: 'erloeschStaerke', min: 0.0, max: 2.0, step: 0.02, wert: P.erloeschStaerke },
      { key: 'erloeschDauer', min: 0.30, max: 3.00, step: 0.05, wert: P.erloeschDauer },
    ],

    vorbereiten(gl, R, ctx) {
      S.baender = [];
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];

      const gel = R.gel || G.gel;
      /* Der Erschoepfungspuls malt keine neue Farbe, sondern die EIGENE,
       * der die Farbe ausgegangen ist: Kernfarbe zu 82 % entsaettigt und
       * auf 62 % abgedunkelt. Fuer Eldoran-Blau (0.16, 0.62, 0.98) sind das
       * (0.31, 0.35, 0.39), ein aschiges Graublau.
       *
       * Ein aufgehellter Ton waere hier falsch: ein erschoepfter Koerper
       * leuchtet nicht, ihm geht das Licht aus. Dass das ueberhaupt geht,
       * ist der Grund fuer die Uebermalung — eine Addition kann nichts
       * dunkler und nichts unbunter machen. Die bewusste Entsaettigung ist
       * die eine Stelle, an der dieses Modul §0 („Schatten farbig statt
       * grau") gegen den Strich buerstet, und sie tut es mit Absicht: das
       * Grauwerden IST hier die Aussage. */
      const kern = (gel && gel.farbe && gel.farbe.kern)
        || (ctx.pal && ctx.pal.mid) || [0.16, 0.62, 0.98];
      const lum = 0.2126 * kern[0] + 0.7152 * kern[1] + 0.0722 * kern[2];
      const asche = [
        (kern[0] + (lum - kern[0]) * 0.82) * 0.62,
        (kern[1] + (lum - kern[1]) * 0.82) * 0.62,
        (kern[2] + (lum - kern[2]) * 0.82) * 0.62,
      ];

      huelleMessen(ctx);
      S.baender = baenderSammeln(ctx, asche);

      /* --- Wunschzettel des Materialkerns (gel.js §6) ------------------
       * Nur Module mit Ordnung < 60 duerfen ihn setzen, und er gilt genau
       * ein Bild. Multipliziert statt zugewiesen: ein anderes Modul darf
       * denselben Zettel schon beschrieben haben. */
      if (!gel || !gel.wunsch || !ctx.game) return;
      const wz = gel.wunsch;
      const sp = ctx.game.spieler || {};
      const tot = ctx.game.phase === 'tot' || sp.tot;

      if (!tot) {
        /* Prall heisst prall: die Masse wird kurz dichter und damit satter.
         * Das ist der Teil der Rueckmeldung, den ein additives Band gar
         * nicht leisten kann, weil er den Koerper DUNKLER macht. */
        const pr = juengstes(ctx.game, 'fressErfolg', P.prallDauer, ctx.time);
        if (pr) {
          const u = pr.alter / P.prallDauer;
          wz.dichteMul *= 1 + P.prallDichte * (1 - u);
        }

        /* Erschoepfung: der Koerper wird matter und stumpfer. Das ist der
         * einzige Zustand hier, der laenger als eine Sekunde anhaelt — und
         * er verschwindet in dem Augenblick, in dem Leben zurueckkommt.
         * Deshalb bleibt er bewusst mild: bei 14 % Abdunklung sieht man
         * ihn, ohne dass er die Fraktionsfarbe (GDD 01 §8) verfaelscht. */
        const muede = muedigkeit(sp);
        if (muede > 0.01) {
          const k = 1 - P.muedeTonung * muede;
          const t0 = wz.tonung || [1, 1, 1];
          wz.tonung = [t0[0] * k, t0[1] * k, t0[2] * k];
          wz.glanzMul *= 1 - 0.35 * muede;
        }
      }
    },
  });

  /* =====================================================================
   * Eintrag 2 — Ordnung 74: die Baender zeichnen
   * =================================================================== */
  G.modul({
    name: 'reaktion-blitz',
    ordnung: 74,

    aufbau(gl, R) {
      S.prog = G.programm(gl, VS, FS, 'schleim/reaktion');
      const u = {};
      for (const n of ['uViewProj', 'uCam', 'uUnten', 'uHoch', 'uBreitePx', 'uZahl']) {
        u[n] = gl.getUniformLocation(S.prog, n);
      }
      for (let i = 0; i < MAX; i++) {
        u['art' + i] = gl.getUniformLocation(S.prog, 'uArt[' + i + ']');
        u['farbe' + i] = gl.getUniformLocation(S.prog, 'uFarbe[' + i + ']');
        u['staerke' + i] = gl.getUniformLocation(S.prog, 'uStaerke[' + i + ']');
        u['lage' + i] = gl.getUniformLocation(S.prog, 'uLage[' + i + ']');
        u['weite' + i] = gl.getUniformLocation(S.prog, 'uWeite[' + i + ']');
      }
      S.u = u;
      S.bereit = true;
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit) return;
      const liste = S.baender;
      if (!liste || liste.length === 0) return;      // der Normalfall: nichts

      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) mesh = S.mesh = eigenesNetz(gl, ctx.surface);
      if (!mesh || !mesh.vao) return;

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      gl.bindVertexArray(mesh.vao);

      /* Die Huelle liegt schon im Puffer — Ordnung 58 und 60 haben sie
       * hochgeladen und dabei R._huelleBild auf die laufende Bildnummer
       * gesetzt. Nur falls beide fehlen, wird hier nachgeholt; sonst sitzt
       * das Band auf der Form von gestern. */
      if (ctx.surface && R._huelleBild !== R._bildNr && mesh.pb) {
        R._huelleBild = R._bildNr;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
        if (mesh.nb) {
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.normals);
        }
      }

      const u = S.u;
      gl.useProgram(S.prog);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform1f(u.uUnten, S.unten);
      gl.uniform1f(u.uHoch, S.hoch);
      gl.uniform1f(u.uBreitePx, S.breitePx);
      gl.uniform1i(u.uZahl, Math.min(liste.length, MAX));
      for (let i = 0; i < Math.min(liste.length, MAX); i++) {
        const b = liste[i];
        gl.uniform1i(u['art' + i], b.art);
        gl.uniform3fv(u['farbe' + i], b.farbe);
        gl.uniform1f(u['staerke' + i], b.staerke);
        gl.uniform1f(u['lage' + i], b.lage);
        gl.uniform1f(u['weite' + i], b.weite);
      }

      /* Tiefe wie in gel.js §6 fuer Ordnung > 60 vorgeschrieben: die
       * Frontflaeche steht nach D2a im Tiefenpuffer, also LEQUAL ohne
       * Schreiben.
       *
       * Die Mischung weicht dort ab, wo der Vertrag „additiv aufsetzen"
       * empfiehlt: gemalt wird ueber, nicht addiert, mit vormultipliziertem
       * Alpha. Der Grund steht im Kopfkommentar 2 — auf einem hellen blauen
       * Koerper kann eine Addition nur nach Weiss laufen, ein roter Blitz
       * wird darauf zu Flieder. Der Vertrag verlangt ONE/ONE fuer LICHT
       * (Glanz, Randlicht); dies hier ist FARBE. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
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
