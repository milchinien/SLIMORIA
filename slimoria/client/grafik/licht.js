'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — das Lichtmodell (Schritt G3 aus PHASE-GRAFIK-PLAN.md).
 *
 * Besitzer: Lane GRAFIK. Vertrag: GRAFIK-MODULE.md §3.
 * Diese Datei aendert KEINE fremde Datei. `client/renderer.js` bleibt
 * unberuehrt — der alte Pfad traegt die laufenden Blindvergleiche.
 *
 * ===========================================================================
 * WAS HIER FALSCH WAR UND JETZT ANDERS IST
 * ===========================================================================
 *
 * Der Bestand (LICHT-Block in renderer2.js, wortgleich mit renderer.js):
 *
 *     HIMMELLICHT = (0.34, 0.38, 0.47)      <- blaues Umgebungslicht
 *     BODENLICHT  = (0.27, 0.26, 0.23)
 *     SONNE       = (0.88, 0.85, 0.78)
 *     col = uColor * (mix(BODENLICHT, HIMMELLICHT, N.y*0.5+0.5) + SONNE * max(dot(N,L),0))
 *
 * Drei Fehler, alle drei am Referenzmaterial nachgemessen:
 *
 * 1. HARTES N·L. `max(dot(N,L), 0.0)` laesst die ganze abgewandte Halbkugel
 *    auf den blossen Umgebungswert fallen. Gemessen an unserem eigenen Bild
 *    (`g-bodenlicht`, Zeile 420): Fels besonnt L=118, Schattenseite L=26 —
 *    Verhaeltnis 0,24. Genshin, dieselbe Messung an einem Fels in
 *    `landschaft_wiese_mittag_figur_2560.png`, Zeile 1035: besonnt
 *    RGB(215,218,217) L=217, Schattenseite RGB(184,190,188) L=189 —
 *    Verhaeltnis 0,868. Unsere Schattenseiten saufen ab, Genshins nicht.
 *    Ersatz: Halblambert-Umschlingung `dot(N,L)*0.5+0.5`. Das ist zugleich die
 *    Nachschlaggroesse, die rampe.js in G4 in die Rampentextur schickt —
 *    beide Module rechnen dieselbe Zahl, sonst springt das Bild beim Umbau.
 *
 * 2. BLAUES UMGEBUNGSLICHT. `HIMMELLICHT = (0.34,0.38,0.47)` hat B/R = 1,38.
 *    Das ist die Signatur von Tower of Fantasy, nicht die von Genshin:
 *    ToFs unbunte Tagesflaechen liegen bei x = 0,286…0,290 (8300–8900 K),
 *    Genshins bei x = 0,3217 / y = 0,3487 (rund 5970 K) — praktisch neutral.
 *    Nachgesehen, nicht vermutet: in `ref/tof/figur-nah-tageslicht-gras.jpg`
 *    ist der beschattete Asphalt deutlich blau; in
 *    `ref/genshin/landschaft_sumeru_dorf_tag_2560.png` bleibt das beschattete
 *    Pflaster warmgrau. Der Nachbau, der hier blau einfaerbt, sieht auf einen
 *    Blick nach dem falschen Spiel aus.
 *    Ersatz: der Himmelston geht nur noch als MILDE Toenung ein (B/R = 1,05
 *    statt 1,38). Die Gegenprobe steht unten in ZAHLEN.
 *    Ausnahme, und die ist gemessen: NACHTS ist das Umgebungslicht blau —
 *    `ref/genshin/nacht_liyue_laternen_1600x900.png` zeigt eine durchgehend
 *    blaugruene Szene. Das Verbot gilt dem TAG, nicht dem Mond.
 *
 * 3. ALBEDO EINE BLENDENSTUFE ZU TIEF. Fels (0.335,0.330,0.310) gegen
 *    Genshins gemessene 0,85. Keine Rampe und keine Kontur rettet ein Bild,
 *    dessen groesste Flaechen mittelgrau sind. Deshalb gibt dieses Modul
 *    Albedo-Faktoren als Uniforms heraus (siehe UNIFORMS) und hebt die Farben
 *    im uebernommenen Fest-Programm selbst an.
 *
 * ===========================================================================
 * WAS DIESES MODUL TUT — UND WAS NICHT
 * ===========================================================================
 *
 * TUT:
 *  - fuellt `ctx.licht` jedes Bild aus einem Tagesgang mit acht
 *    Stuetzstellen, in sRGB interpoliert (siehe TAGESGANG),
 *  - legt den Shader-Baustein `licht` an: Uniforms + Rechenfunktionen, damit
 *    boden.js, rampe.js, gras.js, karte.js und die Requisiten alle DIESELBE
 *    Formel schreiben (dieselbe Begruendung wie bei `uNebel`/`uDunst`),
 *  - laedt diese Uniforms auf ein beliebiges Programm:
 *    `GRAFIK.licht.uniformsSetzen(gl, prog)`,
 *  - uebernimmt das eingebaute Fest-Programm `R.solid`, damit Felsen, Mauern
 *    und Kreaturen das neue Licht SOFORT bekommen. Ohne das aendert sich am
 *    Bild nichts und die ganze Arbeit waere unmessbar.
 *
 * TUT NICHT:
 *  - den Boden. `FS_GROUND` hat heute ueberhaupt keine Lichtrechnung, seine
 *    Farben sind fertig gemalt. Terrain und Bodenalbedo gehoeren boden.js
 *    (GRAFIK-MODULE.md §2). Die Zielfarbe liegt als `uAlbedoBoden` bereit.
 *  - den Himmel, den Nebel, die Rampe, die Kontur. Alles vorbereitet, nichts
 *    davon gezeichnet.
 *
 * WARUM `R.solid` UEBERNOMMEN WIRD, obwohl der Vertrag nur von Grundzuegen
 * spricht: PHASE-GRAFIK-PLAN G3 schreibt die Aenderung ausdruecklich in
 * `FS_SOLID`. `renderer2.js` gehoert mir nicht, `FS_SOLID` steht darin — die
 * einzige Uebersetzung, die in MEINER Datei bleibt, ist ein formgleiches
 * Ersatzprogramm. Es traegt exakt dieselben Uniformnamen wie das Original
 * (uViewProj, uModel, uNormalMat, uCam, uLight, uColor, uGloss, uEmissive),
 * `drawProp` merkt davon nichts. Das Original bleibt als `R.solidVorgabe`
 * stehen, und der Regler `festLicht = 0` schaltet die Uebernahme ab.
 * Kommt spaeter rampe.js und ersetzt `R.solid` seinerseits, gewinnt rampe.js
 * (ordnung 30 baut nach ordnung 0 auf) — das ist die richtige Reihenfolge.
 *
 * ===========================================================================
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * ===========================================================================
 * Kein Math.random, kein Date, kein performance.now. Die Tageszeit kommt
 * entweder aus dem Sonnenstand (`R.light`, den capture.js stellt) oder aus
 * dem Regler — nie aus einer Uhr. Zwei Laeufe desselben Szenarios ergeben
 * bitgleiche Bilder.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof GRAFIK === 'undefined' || typeof GRAFIK.modul !== 'function') {
    console.error('grafik/licht.js: GRAFIK fehlt — laedt glsl.js davor?');
    return;
  }

  /* ==========================================================================
   * 1. TAGESGANG — acht Stuetzstellen, in sRGB interpoliert
   *
   * Warum in sRGB und nicht in Linearlicht: die Stuetzfarben sind gemalte
   * Gammawerte. In Linearlicht gemischt werden die Zwischentoene sichtbar zu
   * dunkel — zwischen Mittag (183,217,249) und goldener Stunde (140,104,85)
   * liegt in sRGB gemischt bei t=0,5 der Wert (162,161,167), in Linearlicht
   * (155,153,160). Der Unterschied ist am Horizontband, wo der Uebergang ueber
   * eine halbe Bildhoehe laeuft, deutlich zu sehen. PHASE-GRAFIK-PLAN G10
   * nennt das als ersten der drei Fehler, die man dabei macht.
   *
   * `hoehe` ist der nominelle Sonnenstand (y der normierten Lichtrichtung).
   * Er dient der Umkehrrechnung: capture.js stellt in den Grafik-Szenarien
   * den Sonnenstand ueber `R.light`, und daraus wird die Tageszeit abgeleitet
   * — sonst zeigte `g-nacht` (Sonne bei 11 Grad) die Mittagsfarben.
   * Die Reihe 0..4 ist in `hoehe` streng steigend, die Umkehrung damit
   * eindeutig.
   *
   * Herkunft der Zahlen:
   *   zenit/horizont/dunst  Mittag, goldene Stunde, Daemmerung, Nacht sind
   *                         gemessen [BELEGT, PHASE-GRAFIK-PLAN G10];
   *                         Vormittag/Nachmittag sind dazwischen gelegt
   *                         [GERECHNET].
   *   sonne/staerke/ambient [GERECHNET] aus zwei Randbedingungen:
   *                         (a) die besonnte unbunte Flaeche muss bei
   *                             x = 0,31…0,33 landen (nicht bei ToFs 0,286),
   *                         (b) Licht/Schatten am Terminator 0,82…0,88.
   *                         Die Gegenrechnung steht unten in ZAHLEN.
   * ======================================================================== */

  const f255 = (r, g, b) => [r / 255, g / 255, b / 255];

  const STUETZSTELLEN = [
    {
      name: 'Mitternacht', t: 0.00, hoehe: -0.60,
      zenit: f255(18, 32, 67), horizont: f255(148, 166, 181), dunst: f255(105, 134, 158),
      sonne: [0.62, 0.72, 1.00], staerke: 0.10,
      /* Nachts DARF das Umgebungslicht blau sein — gemessen, siehe Kopf. */
      oben: [0.085, 0.105, 0.140], unten: [0.053, 0.061, 0.073],
    },
    {
      name: 'Daemmerung frueh', t: 0.23, hoehe: 0.02,
      zenit: f255(42, 61, 107), horizont: f255(127, 154, 182), dunst: f255(71, 102, 146),
      sonne: [1.00, 0.72, 0.52], staerke: 0.22,
      oben: [0.240, 0.270, 0.340], unten: [0.200, 0.188, 0.188],
    },
    {
      name: 'goldene Stunde Morgen', t: 0.29, hoehe: 0.18,
      /* Zenit ist hier NICHT blau, sondern dunkles Petrol (22,38,45). Wer den
       * Tagesgang als Blau->Orange baut, verfehlt genau den Moment, den alle
       * Screenshots zeigen — nachgesehen in goldene_stunde_grasland_2560.png:
       * oben Petrol, Dunstband warm und HELLER als der Vordergrund. */
      zenit: f255(22, 38, 45), horizont: f255(120, 136, 147), dunst: f255(140, 104, 85),
      sonne: [1.00, 0.60, 0.32], staerke: 0.30,
      oben: [0.155, 0.150, 0.165], unten: [0.136, 0.116, 0.100],
    },
    {
      name: 'Vormittag', t: 0.38, hoehe: 0.55,
      zenit: f255(33, 105, 172), horizont: f255(124, 192, 240), dunst: f255(178, 206, 236),
      sonne: [1.00, 0.93, 0.83], staerke: 0.46,
      oben: [0.415, 0.440, 0.455], unten: [0.354, 0.321, 0.262],
    },
    {
      name: 'Mittag', t: 0.50, hoehe: 0.98,
      zenit: f255(34, 114, 188), horizont: f255(121, 198, 246), dunst: f255(183, 217, 249),
      sonne: [1.00, 0.96, 0.89], staerke: 0.52,
      oben: [0.470, 0.490, 0.495], unten: [0.400, 0.362, 0.292],
    },
    {
      name: 'Nachmittag', t: 0.62, hoehe: 0.55,
      zenit: f255(33, 103, 168), horizont: f255(126, 190, 236), dunst: f255(182, 203, 229),
      sonne: [1.00, 0.91, 0.79], staerke: 0.46,
      oben: [0.415, 0.435, 0.448], unten: [0.360, 0.322, 0.258],
    },
    {
      name: 'goldene Stunde Abend', t: 0.71, hoehe: 0.18,
      zenit: f255(22, 38, 45), horizont: f255(120, 136, 147), dunst: f255(140, 104, 85),
      sonne: [1.00, 0.58, 0.30], staerke: 0.30,
      oben: [0.155, 0.150, 0.165], unten: [0.136, 0.116, 0.100],
    },
    {
      name: 'Daemmerung spaet', t: 0.77, hoehe: 0.02,
      zenit: f255(42, 61, 107), horizont: f255(127, 154, 182), dunst: f255(71, 102, 146),
      sonne: [1.00, 0.70, 0.50], staerke: 0.22,
      oben: [0.240, 0.270, 0.340], unten: [0.200, 0.188, 0.188],
    },
  ];

  /* Albedo-Zielwerte. Beide Spalten werden gebraucht:
   *  - `hub` ist der Faktor auf UNSERE heutigen Farben. 2,0 ist genau eine
   *    Blendenstufe; Fels (0.335,0.330,0.310) wird damit (0.670,0.660,0.620).
   *  - die benannten Farben sind die GEMESSENEN Genshin-Werte. boden.js und
   *    die Requisiten koennen sie direkt nehmen, statt den Hub zu benutzen.
   *    Fels/Boden aus landschaft_sumeru_dorf_tag_2560.png (217,221,203)
   *    bzw. dem gemessenen Felsplateau (215,218,217) [BELEGT];
   *    Gras (134,188,91) [BELEGT]. */
  const ALBEDO = {
    hub: 2.00,
    fels:  [0.845, 0.855, 0.851],
    mauer: [0.851, 0.867, 0.796],
    boden: [0.851, 0.867, 0.796],
    gras:  [0.525, 0.737, 0.357],
  };

  /* ==========================================================================
   * 2. Interpolation
   * ======================================================================== */

  const klemm = (x, a, b) => (x < a ? a : x > b ? b : x);

  function mischen(a, b, k, aus) {
    aus[0] = a[0] + (b[0] - a[0]) * k;
    aus[1] = a[1] + (b[1] - a[1]) * k;
    aus[2] = a[2] + (b[2] - a[2]) * k;
    return aus;
  }

  /* Zyklisch: nach der letzten Stuetzstelle (t = 0,77) geht es ueber t = 1,0
   * zurueck auf die erste. */
  function stuetzstellenPaar(t) {
    t = t - Math.floor(t);
    const n = STUETZSTELLEN.length;
    let i = n - 1;
    for (let k = 0; k < n; k++) {
      if (STUETZSTELLEN[k].t > t) { i = k - 1; break; }
    }
    if (i < 0) i = n - 1;                      // vor der ersten Stuetzstelle
    const a = STUETZSTELLEN[i];
    const b = STUETZSTELLEN[(i + 1) % n];
    let t0 = a.t, t1 = b.t;
    if (t1 <= t0) t1 += 1;                     // Umlauf ueber Mitternacht
    let tt = t;
    if (tt < t0) tt += 1;
    const k = (t1 > t0) ? klemm((tt - t0) / (t1 - t0), 0, 1) : 0;
    return { a, b, k };
  }

  /* Umkehrung: aus der Sonnenhoehe die Tageszeit. Nur die aufsteigende Haelfte
   * (Mitternacht -> Mittag) wird benutzt; sie ist in `hoehe` streng steigend.
   * Das reicht, weil die Farben symmetrisch sind und niemand aus einer
   * Lichtrichtung ablesen kann, ob es Vor- oder Nachmittag ist. */
  function zeitAusHoehe(h) {
    const A = STUETZSTELLEN;
    if (h <= A[0].hoehe) return A[0].t;
    for (let i = 0; i < 4; i++) {
      const a = A[i], b = A[i + 1];
      if (h <= b.hoehe) {
        const k = (h - a.hoehe) / (b.hoehe - a.hoehe);
        return a.t + (b.t - a.t) * k;
      }
    }
    return A[4].t;
  }

  /* ==========================================================================
   * 3. Der Shader-Baustein `licht`
   *
   * Erster Baustein im Projekt, der UNIFORMS mitbringt. Das ist Absicht: die
   * Formel ohne ihre Uniforms weiterzugeben hiesse, jedes Modul schriebe die
   * Deklarationen selbst ab — und beim ersten Tippfehler laufen zwei Module
   * mit verschiedenen Lichtwerten und niemand findet, warum. Wer den Baustein
   * einbindet, ruft danach einmal GRAFIK.licht.uniformsSetzen(gl, prog) und
   * hat garantiert dieselben Werte wie alle anderen.
   * Nicht benutzte Uniforms wirft der Uebersetzer weg; die Ladefunktion
   * ueberspringt fehlende Orte still.
   * ======================================================================== */

  const BAUSTEIN = GRAFIK.baustein('halblambert') + `
#ifndef GRAFIK_LICHT
#define GRAFIK_LICHT

uniform vec3  uLichtRichtung;   /* normiert, ZUR Sonne zeigend             */
uniform vec3  uSonneFarbe;      /* Farbe MAL Staerke MAL Belichtung        */
uniform vec3  uAmbientOben;     /* Umgebungslicht der oberen Halbkugel     */
uniform vec3  uAmbientUnten;    /* Umgebungslicht der unteren Halbkugel    */
uniform vec3  uZenit;           /* Himmelsfarben, fuer himmel.js/nebel.js  */
uniform vec3  uHimmelHorizont;
uniform vec3  uDunst;
uniform float uTageszeit;       /* 0 Mitternacht, 0.5 Mittag               */
uniform float uAlbedoHub;       /* Blendenstufe auf unsere alten Farben    */
uniform vec3  uAlbedoFels;
uniform vec3  uAlbedoMauer;
uniform vec3  uAlbedoBoden;
uniform vec3  uAlbedoGras;

/* Umgebungslicht: von oben Himmelsfarbe, von unten Bodenfarbe.
 * Genau der Ausdruck, der heute schon in FS_SOLID steht — hier benannt,
 * damit ihn jedes Modul gleich schreibt. Der Unterschied zum Bestand liegt
 * nicht in der Formel, sondern in den WERTEN (siehe Dateikopf, Punkt 2). */
vec3 umgebungslicht(vec3 N) {
  return halbraumLicht(N, uAmbientOben, uAmbientUnten);
}

/* Hauptlicht: EIN Richtungslicht, Halblambert statt hartem N·L.
 * ndl01() kommt aus dem Baustein 'halblambert' und ist dieselbe Zahl, die
 * rampe.js (G4) in die Rampentextur schickt. */
vec3 hauptlicht(vec3 N, vec3 L) {
  return uSonneFarbe * ndl01(N, L);
}

vec3 lichtGesamt(vec3 N, vec3 L) {
  return hauptlicht(N, L) + umgebungslicht(N);
}

vec3 beleuchtet(vec3 albedo, vec3 N, vec3 L) {
  return albedo * lichtGesamt(N, L);
}

/* Albedo um bis zu uAlbedoHub anheben, OHNE zu klemmen: geklemmt wuerde ein
 * satter Kreaturenton entsaettigt, und das ist genau der Fehler, den GDD 01
 * §6 („satt und hell") verbietet. Stattdessen wird der Faktor so weit
 * zurueckgenommen, dass der groesste Kanal 1,0 gerade erreicht — Farbton und
 * Saettigung bleiben exakt erhalten.
 *   Fels (0.335,0.330,0.310) * 2.00 -> (0.670,0.660,0.620)
 *   ein gesaettigter Ton (0.75,0.35,0.30) -> (1.00,0.467,0.400), Ton gleich */
vec3 albedoAnheben(vec3 c) {
  float m = max(max(c.r, c.g), c.b);
  float f = (m > 0.0) ? min(uAlbedoHub, 1.0 / m) : uAlbedoHub;
  return c * f;
}
#endif
`;

  GRAFIK.bausteinSetzen('licht', BAUSTEIN);

  /* ==========================================================================
   * 4. Ersatz fuer FS_SOLID — dasselbe Programm, neues Licht
   *
   * Uniformnamen und Attributorte wortgleich mit dem Original in
   * renderer2.js, damit drawProp() nichts merkt.
   *
   * Zwei Dinge sind absichtlich WEG:
   *  - `HIMMELLICHT * rim * 0.30`. Eine Randaufhellung auf undurchsichtigen
   *    Koerpern ist nicht Genshins Verfahren; die Silhouette traegt dort die
   *    Kontur (G5), und der Rand des Gels ist Sache von gel.js. Ausserdem war
   *    der Term blau — dieselbe Falle wie Punkt 2 im Kopf. „Im Zweifel
   *    simpler" (GRAFIK-MODULE.md §0).
   *  - die alten Konstanten HIMMELLICHT/BODENLICHT/SONNE. Alles kommt jetzt
   *    aus Uniforms, damit der Tagesgang ueberhaupt etwas bewegen kann.
   *
   * Der weiche Blinn-Phong bleibt vorerst, nur schwaecher und in Sonnenfarbe
   * statt Weiss. Er wird in G4 (rampe.js) durch eine harte Stufe ersetzt —
   * ihn hier schon zu entfernen hiesse, zwei Schritte in einer Aufnahme zu
   * vermischen und den Blindvergleich nicht mehr zuordnen zu koennen.
   * ======================================================================== */

  const VS_FEST = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vPos = world.xyz;
  vNormal = uNormalMat * aNormal;
  gl_Position = uViewProj * world;
}`;

  const FS_FEST = `#version 300 es
precision highp float;
${BAUSTEIN}
in vec3 vPos;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uColor;
uniform float uGloss;
uniform float uEmissive;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);

  vec3 albedo = albedoAnheben(uColor);
  vec3 col = beleuchtet(albedo, N, L);

  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 40.0) * uGloss;
  col += uSonneFarbe * spec * 0.45;

  /* Augen und Mund tragen uEmissive und stehen damit ausserhalb jeder
   * Lichtrechnung — ein Anime-Gesicht empfaengt nie einen Schatten
   * (PHASE-GRAFIK-PLAN §2). Wichtig: gemischt wird gegen uColor, NICHT gegen
   * das angehobene Albedo, sonst verschoebe der Blendenstufenhub die
   * Gesichtsfarben mit. */
  col = mix(col, uColor, uEmissive);
  outColor = vec4(col, 1.0);
}`;

  /* ==========================================================================
   * 5. Laufzeitwerte
   * ======================================================================== */

  const W = {
    richtung: [0.55, 0.78, 0.32],
    sonneFarbe: [1, 1, 1],       // reine Farbe
    sonneRadianz: [1, 1, 1],     // Farbe * Staerke * Belichtung
    sonneStaerke: 0.52,
    ambientOben: [0, 0, 0],
    ambientUnten: [0, 0, 0],
    zenit: [0, 0, 0],
    horizont: [0, 0, 0],
    dunst: [0, 0, 0],
    tageszeit: 0.5,
    belichtung: 1.0,
    albedoHub: ALBEDO.hub,
    stuetzstelle: 'Mittag',
  };

  /* Ein Uniform setzen, wenn es das Programm ueberhaupt kennt. Ein Programm,
   * das nur `umgebungslicht()` benutzt, hat kein uAlbedoGras — das ist kein
   * Fehler, sondern der Uebersetzer, der aufgeraeumt hat. */
  function u3(gl, u, name, wert) { if (u[name]) gl.uniform3fv(u[name], wert); }
  function u1(gl, u, name, wert) { if (u[name]) gl.uniform1f(u[name], wert); }

  /* Laedt alle Licht-Uniforms auf das GEBUNDENE Programm.
   * Aufrufer sorgt fuer gl.useProgram(prog). */
  function uniformsSetzen(gl, prog) {
    if (!prog) return;
    const u = prog.u || prog;
    u3(gl, u, 'uLichtRichtung', W.richtung);
    u3(gl, u, 'uSonneFarbe', W.sonneRadianz);
    u3(gl, u, 'uAmbientOben', W.ambientOben);
    u3(gl, u, 'uAmbientUnten', W.ambientUnten);
    u3(gl, u, 'uZenit', W.zenit);
    u3(gl, u, 'uHimmelHorizont', W.horizont);
    u3(gl, u, 'uDunst', W.dunst);
    u3(gl, u, 'uAlbedoFels', ALBEDO.fels);
    u3(gl, u, 'uAlbedoMauer', ALBEDO.mauer);
    u3(gl, u, 'uAlbedoBoden', ALBEDO.boden);
    u3(gl, u, 'uAlbedoGras', ALBEDO.gras);
    u1(gl, u, 'uTageszeit', W.tageszeit);
    u1(gl, u, 'uAlbedoHub', W.albedoHub);
  }

  /* ==========================================================================
   * 6. Das Modul
   *
   * ordnung 0, nicht 5. Begruendung: `vorbereiten()` laeuft fuer ALLE Module
   * vor dem ersten Zeichenaufruf, aber in Ordnungsreihenfolge — und
   * schatten.js liegt laut renderer2.js §ORDNUNGEN auf 5 und braucht die
   * Lichtrichtung, bevor es seine Lichtsicht aufspannt. Bei gleicher Ordnung
   * entscheidet die Anmeldereihenfolge, und darauf soll sich niemand
   * verlassen (renderer2.js sagt das ausdruecklich). 0 ist eindeutig.
   *
   * `ersetzt: false`: dieses Modul zeichnet nichts und darf keinen Grundzug
   * verdraengen. Es gibt heute keinen Grundzug namens 'licht' — aber falls je
   * einer dazukaeme, verschwaende sonst still ein ganzer Durchgang.
   * ======================================================================== */

  const modul = GRAFIK.modul({
    name: 'licht',
    ordnung: 0,
    ersetzt: false,

    regler: [
      /* 1 = Tageszeit aus dem Sonnenstand ableiten (capture.js stellt ihn),
       * 0 = den Regler `tageszeit` nehmen. */
      { key: 'ausSonnenstand', min: 0, max: 1, step: 1, wert: 1 },
      { key: 'tageszeit', min: 0, max: 1, step: 0.005, wert: 0.5 },
      /* Tageslaenge in Sekunden, damit der Gang ueber ctx.time laufen kann.
       * 0 = aus, und das ist die Vorgabe — mit Absicht: liefe die Uhr, haetten
       * zwei Bilder DESSELBEN Szenarios (bildZeiten 0,8 s und 1,6 s) schon
       * verschiedene Lichtfarben, und der Blindvergleich verglicht die Uhrzeit
       * statt das Rendering. Zeit kommt auch dann ausschliesslich aus
       * ctx.time, nie aus Date/performance.now (GRAFIK-MODULE.md §4) — der
       * Gang bleibt also reproduzierbar, er ist nur nicht vergleichbar. */
      { key: 'zeitlauf', min: 0, max: 600, step: 5, wert: 0 },
      /* Gesamtpegel. 1,0 ist die Kalibrierung, nicht eine Geschmacksfrage:
       * eine Diffusflaeche mit Albedo 1,0 in voller Sonne landet damit bei
       * (0.99,0.99,0.96). Gegenprobe an Genshin: dessen Fels hat Albedo 0,85
       * und misst RGB(215,218,217) = 0,845 — der Lichtfaktor ist dort also
       * ebenfalls rund 1,0. Wer hier hoeher geht, gleicht nur zu dunkle
       * Albedowerte aus und macht damit den Fehler, den G3 gerade behebt.
       * post.js (G9) rechnet mit LDR-Eingang (Knie 0,55, Weiss 0,92) und
       * bringt seinen eigenen Belichtungsregler mit — hier ist nichts
       * nachzuziehen. Falls doch je ein HDR-Ziel davorkommt, gibt es
       * GRAFIK.licht.belichtungSetzen(). */
      { key: 'belichtung', min: 0.1, max: 3, step: 0.05, wert: 1.0 },
      /* Blendenstufe auf die Bestandsfarben. 2,0 = genau eine Stufe. */
      { key: 'albedoHub', min: 1, max: 3, step: 0.05, wert: 2.00 },
      /* Anteil des Richtungslichts am besonnten Gesamtwert. 1 = Tabelle. */
      { key: 'sonnenanteil', min: 0, max: 2, step: 0.05, wert: 1.0 },
      /* Uebernahme des eingebauten Fest-Programms abschalten. */
      { key: 'festLicht', min: 0, max: 1, step: 1, wert: 1 },
    ],

    aufbau(gl, R) {
      /* Wirft die Uebersetzung, faengt renderer2.js das ab und ueberspringt
       * dieses Modul — dann bleibt das alte Fest-Programm stehen und das Bild
       * laeuft weiter. Genau deshalb wird R.solid erst NACH dem erfolgreichen
       * Uebersetzen ausgetauscht. */
      const prog = GRAFIK.programm(gl, VS_FEST, FS_FEST, 'licht: fest');
      modul.prog = prog;
      if (modul.wert.festLicht) {
        if (!R.solidVorgabe) R.solidVorgabe = R.solid;
        R.solid = prog;
      }
    },

    vorbereiten(gl, R, ctx) {
      const w = modul.wert;

      /* --- Lichtrichtung ------------------------------------------------- */
      /* `ctx.licht.richtung` IST `R.light` — capture.js schreibt dort den
       * Sonnenstand hinein. Auf Einheitslaenge bringen, damit die Hoehe
       * ablesbar ist und jeder Shader dieselbe Zahl bekommt. In dasselbe
       * Feld geschrieben, nicht neu angelegt (renderer2.js §ctx). */
      const r = ctx.licht.richtung;
      let len = Math.hypot(r[0], r[1], r[2]);
      if (!(len > 1e-6)) { r[0] = 0.55; r[1] = 0.78; r[2] = 0.32; len = Math.hypot(0.55, 0.78, 0.32); }
      r[0] /= len; r[1] /= len; r[2] /= len;
      W.richtung = r;

      /* --- Tageszeit ------------------------------------------------------
       * Drei Quellen, in dieser Reihenfolge:
       *   zeitlauf > 0   der Gang laeuft ueber ctx.time (deterministisch)
       *   ausSonnenstand die Umkehrung aus R.light — das ist die Vorgabe,
       *                  weil capture.js den Sonnenstand je Szenario stellt
       *   sonst          der Regler `tageszeit` */
      let t;
      if (w.zeitlauf > 0) {
        const roh = klemm(w.tageszeit, 0, 1) + (ctx.time || 0) / w.zeitlauf;
        t = roh - Math.floor(roh);
      } else if (w.ausSonnenstand) {
        t = zeitAusHoehe(r[1]);
      } else {
        t = klemm(w.tageszeit, 0, 1);
      }
      W.tageszeit = t;

      const { a, b, k } = stuetzstellenPaar(t);
      W.stuetzstelle = (k < 0.5 ? a.name : b.name);

      mischen(a.zenit, b.zenit, k, W.zenit);
      mischen(a.horizont, b.horizont, k, W.horizont);
      mischen(a.dunst, b.dunst, k, W.dunst);
      mischen(a.sonne, b.sonne, k, W.sonneFarbe);
      mischen(a.oben, b.oben, k, W.ambientOben);
      mischen(a.unten, b.unten, k, W.ambientUnten);
      W.sonneStaerke = a.staerke + (b.staerke - a.staerke) * k;

      /* --- Pegel ---------------------------------------------------------- */
      const bel = klemm(w.belichtung, 0.01, 8);
      const anteil = klemm(w.sonnenanteil, 0, 4);
      W.belichtung = bel;
      W.albedoHub = klemm(w.albedoHub, 1, 8);

      const s = W.sonneStaerke * anteil * bel;
      W.sonneRadianz[0] = W.sonneFarbe[0] * s;
      W.sonneRadianz[1] = W.sonneFarbe[1] * s;
      W.sonneRadianz[2] = W.sonneFarbe[2] * s;
      W.ambientOben[0] *= bel; W.ambientOben[1] *= bel; W.ambientOben[2] *= bel;
      W.ambientUnten[0] *= bel; W.ambientUnten[1] *= bel; W.ambientUnten[2] *= bel;

      /* --- ctx.licht fuellen ---------------------------------------------
       * In die vorhandenen Felder geschrieben, nie neu angelegt: sonst zeigt
       * eine Uniform, die sich jemand gemerkt hat, ins Leere (renderer2.js
       * sagt das im Kopf ausdruecklich).
       *
       * Belegung der Altnamen, damit gel.js unveraendert weiterlaeuft — es
       * liest licht.farbe, licht.ambient und licht.boden:
       *   farbe   = wirksame Sonnenradianz (Farbe MAL Staerke MAL Belichtung)
       *   ambient = ambientOben   (das alte HIMMELLICHT)
       *   himmel  = ambientOben
       *   boden   = ambientUnten  (das alte BODENLICHT)
       *   staerke = 1.0, weil sie in `farbe` schon steckt — wer farbe*staerke
       *             rechnet, bekommt so trotzdem das Richtige. */
      const li = ctx.licht;
      const setz = (z, q) => { if (z) { z[0] = q[0]; z[1] = q[1]; z[2] = q[2]; } };
      setz(li.farbe, W.sonneRadianz);
      setz(li.himmel, W.ambientOben);
      setz(li.boden, W.ambientUnten);
      setz(li.ambient, W.ambientOben);
      setz(li.dunst, W.dunst);
      setz(li.zenit, W.zenit);
      li.staerke = 1.0;
      li.tageszeit = t;

      /* Die vom Auftrag verlangten Namen. Eigene Felder, damit ein Modul, das
       * `ambient` fuer „ein Wert fuer alles" haelt, nicht versehentlich das
       * Halbraumlicht kaputtmacht. */
      li.ambientOben = (li.ambientOben || [0, 0, 0]);
      li.ambientUnten = (li.ambientUnten || [0, 0, 0]);
      setz(li.ambientOben, W.ambientOben);
      setz(li.ambientUnten, W.ambientUnten);

      /* Zusatzfelder fuer himmel.js, nebel.js, boden.js, rampe.js. */
      li.horizont = (li.horizont || [0, 0, 0]);
      setz(li.horizont, W.horizont);
      li.sonneFarbe = (li.sonneFarbe || [0, 0, 0]);
      setz(li.sonneFarbe, W.sonneFarbe);
      li.sonneStaerke = W.sonneStaerke * anteil * bel;
      li.belichtung = bel;
      li.stuetzstelle = W.stuetzstelle;
      li.albedo = ALBEDO;
      li.albedoHub = W.albedoHub;
      li.uniformsSetzen = uniformsSetzen;

      /* --- Uniforms auf das eigene Programm laden -------------------------
       * Uniformwerte haengen am PROGRAMM, nicht am GL-Zustand: einmal je Bild
       * gesetzt bleiben sie ueber alle ~90 drawProp-Aufrufe stehen. drawProp
       * setzt nur uViewProj/uModel/uNormalMat/uCam/uLight/uColor/uGloss/
       * uEmissive und fasst nichts davon an. */
      if (modul.prog) {
        gl.useProgram(modul.prog);
        uniformsSetzen(gl, modul.prog);
      }
    },
  });

  /* ==========================================================================
   * 7. Aussenseite fuer die anderen Module
   * ======================================================================== */

  GRAFIK.licht = {
    stuetzstellen: STUETZSTELLEN,
    albedo: ALBEDO,
    werte: W,
    uniformsSetzen,
    zeitAusHoehe,
    /* post.js ruft das in seinem aufbau(), sobald die Tonwertkurve steht. */
    belichtungSetzen(x) { modul.wert.belichtung = klemm(+x || 1, 0.1, 8); },
    tageszeitSetzen(t) { modul.wert.ausSonnenstand = 0; modul.wert.tageszeit = klemm(+t || 0, 0, 1); },
    ausSonnenstand(an) { modul.wert.ausSonnenstand = an ? 1 : 0; },
  };

  /* ==========================================================================
   * ZAHLEN — die Gegenrechnung zu den beiden Randbedingungen
   *
   * Alles in sRGB-Ausgabewerten (wir rechnen ohne Gammakorrektur, und
   * saemtliche Dossierzahlen sind ebenfalls sRGB — tools/grafikmass.mjs misst
   * genauso).
   *
   * MITTAG, weisse Diffusflaeche (Albedo 1), voll besonnt, nach oben:
   *   0.52*(1.00,0.96,0.89) + (0.470,0.490,0.495) = (0.990,0.989,0.958)
   *   -> RGB(252,252,244), Chromatizitaet x = 0,3175  y = 0,3367, CCT 6207 K
   *   Ziel Genshin: x = 0,3217  y = 0,3487, rund 5970 K   -> getroffen
   *   Gegenprobe ToF: x = 0,286…0,290, 8300–8900 K        -> klar verfehlt,
   *   und das ist der Sinn der Uebung.
   *
   * MITTAG, Verhaeltnis Licht/Schatten am Terminator (ndl01 0,62 gegen 0,45,
   * N.y = 0,2, also derselbe Ort auf einer Kugel):
   *   Leuchtdichte 0,886  ->  −11,4 %
   *   Ziel Plan G3: −12 bis −18 % (0,82…0,88)             -> knapp getroffen
   *   Gemessen an Genshin (Fels, Zeile 1035): 0,868.
   *
   * MITTAG, Fels mit Blendenstufenhub (0.335,0.330,0.310)*2 = (0.670,0.660,0.620):
   *   besonnt      RGB(169,166,151)  L = 166
   *   Schattenseite (ndl01 0,05, N.y −0,25) RGB(77,73,62) L = 73
   *   Verhaeltnis 0,44 — im Bestand 0,24 (an unserem eigenen Bild gemessen).
   *   Genshin liegt bei 0,868, aber das ist die RAMPE (G4), nicht das
   *   Grundlicht; ein stetiges Halblambert kann eine stueckweise konstante
   *   Rampe grundsaetzlich nicht nachbilden. Was hier zaehlt: die
   *   Schattenseite saeuft nicht mehr ab.
   *
   * MITTERNACHT, dieselbe Rechnung: x = 0,2568 — also ausdruecklich blau.
   * Das ist kein Rueckfall in den Fehler von Punkt 2, sondern die Messung:
   * Genshins Nachtszenen sind durchgehend blaugruen. Verboten ist blaues
   * TAGESlicht.
   *
   * NACHT: das Verhaeltnis Fernnebel zu Vordergrund dreht sich ueber den Tag
   * von 1,25:1 (Mittag) auf 3,9:1 (Nacht) [BELEGT, Plan G10]. Deshalb faellt
   * `dunst` nachts nur auf RGB(105,134,158) (L = 129), waehrend das
   * Umgebungslicht auf ein Fuenftel geht. Hinter dem Schleim ist damit nie
   * ein Loch (GDD 10 §98).
   * ======================================================================== */

})();
