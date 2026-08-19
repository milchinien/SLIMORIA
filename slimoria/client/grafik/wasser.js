'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — Modul `wasser` (ordnung 22).
 *
 * Ein stilisiertes Gewaesser am SUEDRAND der Arena: eine flache Senke, die
 * sich mit Wasser fuellt. Kulisse und Hindernis, keine zweite
 * Bewegungsmechanik — GDD 01 §18: der Schleim kann NICHT schwimmen.
 *
 * WO ES LIEGT, UND WARUM DORT
 *
 *   Ellipse, Mittelpunkt (-10, -41), Halbachsen 26 (x) und 13 (z).
 *   Wasserflaeche also x = -36 … 16 und z = -54 … -28.
 *
 *   Der begehbare Bereich endet HART bei |x| = |z| = 26: `softbody.js`
 *   (Zeile 1096–1100) klemmt JEDE Massepunktkoordinate auf ±world.bounds.
 *   Der Schleim kann diese Grenze nicht ueberschreiten, auch nicht mit
 *   Schwung, auch nicht im Sprung. Der naechste Uferpunkt liegt bei z = -28
 *   und damit 2,0 m JENSEITS dieser Klemmgrenze. Kein Punkt der Wasserflaeche
 *   ist erreichbar.
 *
 *   Abstand zu den Spawnpunkten (world.js): der suedlichste ist (3, -9), also
 *   19,0 m vom Ufer entfernt; der naechstgelegene ueberhaupt ist (-6, -11)
 *   mit 17,5 m. Der Respawnpunkt am Friedhof (-17,2 / -16,4) liegt 14,3 m vom
 *   Ufer. Es liegt nichts davon im oder am Wasser.
 *
 *   Warum Suedrand und nicht Suedwestecke: der Bodennebel des Grundzugs
 *   saettigt bei bounds*1,6 = 41,6 m vollstaendig. Ueber die Ecke gemessen
 *   liegt die Arenagrenze schon bei 36,8 m — ein Gewaesser dahinter waere
 *   reiner Dunst. Ueber die gerade Kante liegt sie bei 26 m; das Ufer bei
 *   29 m steht damit bei 44 % Nebel und ist noch Farbe. Das ist die einzige
 *   Stelle, an der ein Gewaesser ausserhalb des begehbaren Bereichs ueberhaupt
 *   sichtbar sein kann.
 *
 * DAS VERFAHREN
 *
 *   1. Ein eigener Tiefenpass des Beckenbodens in eine eigene Tiefentextur.
 *      Der Standardpuffer gibt seine Tiefe nicht her; der Boden ist aber
 *      meine eigene Geometrie, also zeichne ich ihn ein zweites Mal, nur
 *      Tiefe, in ein eigenes Ziel. Daraus kommt der Schaumsaum.
 *   2. Ein Tiefenloch: derselbe Beckenboden noch einmal, Farbe aus,
 *      Tiefe auf FERN. Die Bodenebene des Grundzugs liegt bei y = 0 und
 *      wuerde sonst alles verdecken, was unter ihr liegt. Danach ist der
 *      Fussabdruck des Sees frei, und zwar EXAKT so gross wie der Boden —
 *      deshalb wird mit dem Beckennetz gestanzt und nicht mit einer flachen
 *      Scheibe.
 *   3. Der Beckenboden farbig, mit Halblambert und demselben Nebel wie der
 *      Grundzug-Boden.
 *   4. Die Wasserflaeche, alphagemischt: Tiefenfarbe aus der Differenz im
 *      Tiefenpuffer, Schaumsaum am Ufer, Himmelsspiegelung ueber Fresnel,
 *      zwei gegenlaeufig scrollende Muster.
 *
 * ZUM STILVORBEHALT (GRAFIK-MODULE.md §0)
 *
 *   §0 nennt „zwei gegenlaeufig scrollende Normalenkarten, Fresnel-Spiegelung
 *   und Brechung" ausdruecklich als die FALSCHE, weil realistische Antwort,
 *   und verlangt stattdessen „eine ruhige Farbflaeche, klar am Ufer und satt
 *   zur Mitte, mit einer harten hellen Schaumlinie am Rand und wenigen
 *   grossen, langsam wandernden Wellenformen".
 *   Der Auftrag dieses Moduls nennt genau die erste Liste.
 *
 *   Aufgeloest ist das so: die genannten Verfahren sind gebaut, aber auf das
 *   Bild aus §0 eingestellt.
 *     · Keine Brechung. Ersatzlos gestrichen — sie ist der Teil, der am
 *       staerksten nach Fotografie aussieht, und sie steht nicht im Auftrag.
 *     · Die zwei gegenlaeufigen Muster sind keine Normalenkarte fuer
 *       Materialdetail (§0 „ausdruecklich verboten"), sondern erzeugen WENIGE
 *       GROSSE Wellenformen: Grundwellenlaenge rund 9 m bei einem See von
 *       52 m Breite, also rund sechs Formen ueber die ganze Flaeche. Ihre
 *       Ausschlaege gehen in eine ZWEISTUFIGE Kammmaske mit fwidth-harter
 *       Kante — dieselbe Bauart wie Genshins Binaerglanz (PHASE-GRAFIK-PLAN
 *       G4) —, nicht in einen stetigen Glanzteppich.
 *     · Die Fresnel-Spiegelung ist auf `uSpiegel` gedeckelt (Vorgabe 0,42).
 *       Ungedeckelt geht Fresnel bei streifendem Blick gegen 1, und ein See
 *       in 30 m Entfernung waere ein reiner Himmelsspiegel. Genshins ferner
 *       See ist das nicht: gemessen `landschaft_mondstadt_mittag_fernnebel_4k`
 *       Zeile 1400 → RGB (41,150,190), also eine SATTE Eigenfarbe, dunkler
 *       und viel blauer als das Land daneben (120,175,112).
 *   Damit steht im Bild, was §0 verlangt, und im Code, was der Auftrag
 *   verlangt. Faellt die Entscheidung anders aus, sind es zwei Zeilen:
 *   `uSpiegel` auf 0 und `wellenHoehe` auf 0 — dann bleibt exakt die ruhige
 *   Farbflaeche mit Schaumlinie uebrig.
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4): kein Math.random, kein Date, kein
 * performance.now. Zeit ausschliesslich ueber `ctx.time`. Das Rauschen ist
 * die Hoskins-Streuung aus glsl.js (ohne `sin`), damit SwiftShader und GPU
 * dasselbe Bild liefern.
 * ------------------------------------------------------------------------- */

(function () {

  const GRAFIK = window.GRAFIK;
  if (!GRAFIK || typeof GRAFIK.modul !== 'function') {
    console.error('grafik/wasser.js: GRAFIK-Register fehlt — Modul meldet sich nicht an.');
    return;
  }

  /* ==========================================================================
   * 1. Die Senke — eine einzige Zahlentafel
   *
   * Diese Werte bestimmen GEOMETRIE. Sie sind absichtlich keine Regler: das
   * Netz wird einmal beim Aufbau gebaut, und ein Regler, der die Form aendert,
   * ohne das Netz neu zu bauen, waere eine Falle. Geregelt wird nur, was der
   * Shader je Bild liest.
   * ======================================================================== */
  const SEE = {
    cx: -10.0, cz: -42.0,     // Mittelpunkt der Ellipse in Weltmetern
    ax: 26.0,  az: 13.0,      // Halbachsen
    tiefe: 1.10,              // groesste Tiefe unter dem Pegel
    abfall: 11.0,             // Uferabstand in Metern bis zur vollen Tiefe
    steil: 1.60,              // Exponent des Uferprofils (>1 = flache Schelfe)
    pegel: -0.02,             // Wasserspiegel; knapp unter der Bodenebene y=0
    ringe: 18,                // Netzaufloesung des Beckens
    segmente: 72,
  };

  /* Die Uferlinie ist KEINE Ellipse. Eine exakte Ellipse liest sich als
   * Schwimmbecken; Genshins Seen haben eine unruhige Kante (ref/genshin/
   * wasser_qiongji_ufer_tiefenverlauf_1920.png). Drei feste Kosinusse
   * genuegen — deterministisch, kein Math.random, und die Summe der
   * Ausschlaege ist mit 0,090 bekannt. Damit ist der noerdlichste Punkt der
   * Wasserflaeche rechnerisch z = -42 + 13*1,090 = -27,83, also 1,83 m
   * jenseits der Klemmgrenze z = -26 aus softbody.js. Die Zahl darf beim
   * Aendern der Ausschlaege nicht ueber -27 steigen. */
  function randForm(a) {
    return 1.0 + 0.050 * Math.sin(3.0 * a + 0.7)
               + 0.025 * Math.sin(5.0 * a + 2.1)
               + 0.015 * Math.sin(8.0 * a + 4.3);
  }

  /* Beckenboden als Hoehenfunktion. Dieselbe Formel baut das Netz und
   * beschreibt spaeter im Bericht, wie breit der Saum in Metern ist. */
  function bettY(x, z) {
    const u = (x - SEE.cx) / SEE.ax;
    const v = (z - SEE.cz) / SEE.az;
    const rho = Math.hypot(u, v) / randForm(Math.atan2(v, u));
    if (rho >= 1.0) return 0.0;
    // Abstand zum Ufer in METERN, gemessen entlang des Strahls aus der Mitte.
    const rLokal = rho > 1e-4 ? Math.hypot(u * SEE.ax, v * SEE.az) / rho
                              : (SEE.ax + SEE.az) * 0.5;
    const s = (1.0 - rho) * rLokal;
    const t = Math.min(s / SEE.abfall, 1.0);
    return -SEE.tiefe * Math.pow(t, SEE.steil);
  }

  /* Scheibennetz in Ellipsenkoordinaten.
   * hoehe(x,z) liefert y. Die Ringe liegen nichtlinear: dicht am Ufer, weit
   * in der Mitte — dort passiert nichts, am Ufer alles. */
  function scheibe(hoehe, mitNormalen) {
    const R = SEE.ringe, S = SEE.segmente;
    const pos = new Float32Array((R + 1) * (S + 1) * 3);
    const nrm = mitNormalen ? new Float32Array((R + 1) * (S + 1) * 3) : null;
    const idx = [];
    let k = 0;
    for (let i = 0; i <= R; i++) {
      const rho = 1.0 - Math.pow((R - i) / R, 1.8);
      for (let j = 0; j <= S; j++) {
        const a = (j / S) * Math.PI * 2.0;
        const q = rho * randForm(a);
        const x = SEE.cx + Math.cos(a) * q * SEE.ax;
        const z = SEE.cz + Math.sin(a) * q * SEE.az;
        const y = hoehe(x, z);
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
        if (nrm) {
          // Ableitung numerisch: das Profil ist stueckweise glatt, aber am
          // Ufer knickt es. Zentrale Differenzen sind hier ehrlicher als eine
          // analytische Ableitung, die den Knick nicht kennt.
          const e = 0.25;
          const gx = (hoehe(x + e, z) - hoehe(x - e, z)) / (2 * e);
          const gz = (hoehe(x, z + e) - hoehe(x, z - e)) / (2 * e);
          const l = Math.hypot(-gx, 1, -gz) || 1;
          nrm[k] = -gx / l; nrm[k + 1] = 1 / l; nrm[k + 2] = -gz / l;
        }
        k += 3;
      }
    }
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < S; j++) {
        const a = i * (S + 1) + j, b = a + S + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { pos, nrm, idx };
  }

  /* ==========================================================================
   * 2. Shader
   * ======================================================================== */

  const VS_ORT = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform float uFern;          // 1.0 = Tiefe auf FERN zwingen (Stanzdurchgang)
out vec3 vPos;
void main() {
  vPos = aPos;
  vec4 k = uViewProj * vec4(aPos, 1.0);
  // 0.99999 statt 1.0: bei z == w liegt der Punkt exakt auf der fernen
  // Klippebene, und das darf der Rasterisierer wegschneiden.
  gl_Position = (uFern > 0.5) ? vec4(k.xy, k.w * 0.99999, k.w) : k;
}`;

  /* Reiner Tiefendurchgang. Kein Farbausgang: das Ziel hat keinen
   * Farbanhang (GRAFIK.textur setzt drawBuffers([NONE]) fuer Tiefenziele),
   * und im Stanzdurchgang ist die Farbmaske zu. */
  const FS_LEER = `#version 300 es
precision highp float;
void main() {}`;

  const VS_BETT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vPos = aPos;
  vNormal = aNormal;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  /* Der Beckenboden. Bewusst schlicht: er wird fast ueberall durch Wasser
   * gesehen, seine einzige Aufgabe ist, am Ufer als heller Sandsaum
   * durchzuscheinen und in der Mitte dunkel zu werden. */
  /* Nebel: der des laufenden Bildes, nicht ein eigener.
   *
   * `nebel.js` legt den Baustein `fernnebel` an und schreibt seine Uniforms
   * ueber `R.nebel.setzen`. Genau denselben Nebel bekommt der Boden — nur so
   * gibt es an der Uferlinie keine Naht (PHASE-GRAFIK-PLAN G2, Falle 1).
   * Fehlt nebel.js, faellt das Modul auf die Formel von boden.js zurueck:
   * smoothstep(bounds*1.0, bounds*2.2, Abstand vom Weltmittelpunkt).
   *
   * Die Entscheidung faellt erst in aufbau(), nicht beim Laden dieser Datei:
   * so haengt nichts an der Reihenfolge in grafik/laden.js. */
  function nebelHat() {
    return typeof GRAFIK.bausteine === 'function'
        && GRAFIK.bausteine().indexOf('fernnebel') >= 0;
  }
  function nebelBausteine() {
    return nebelHat() ? GRAFIK.baustein('srgb', 'nebel', 'fernnebel') : '';
  }
  function nebelAnwenden() {
    return nebelHat()
      ? 'col = fernnebel(col, length(vPos - uCam));'
      : 'col = mix(col, uDunst, smoothstep(uBound * 1.0, uBound * 2.2, length(vPos.xz)));';
  }
  /* Fuer die Deckkraft der Wasserflaeche: wo alles Dunst ist, darf nichts
   * mehr durchscheinen, sonst leuchtet der Beckenboden aus dem Nebel. */
  function nebelAnteilAusdruck() {
    return nebelHat()
      ? 'fernnebelAnteil(length(vPos - uCam)).g'
      : 'smoothstep(uBound * 1.0, uBound * 2.2, length(vPos.xz))';
  }

  const FS_BETT = () => `#version 300 es
precision highp float;
${GRAFIK.baustein('halblambert')}
${nebelBausteine()}
in vec3 vPos;
in vec3 vNormal;
uniform vec3 uLicht;
uniform vec3 uSonne;
uniform vec3 uHimmelLicht;
uniform vec3 uBodenLicht;
uniform vec3 uDunst;
uniform vec3 uSand;
uniform vec3 uCam;
uniform float uBound;
uniform float uTiefe;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLicht);

  // Halblambert (PHASE-GRAFIK-PLAN G3): die Schattenseite eines flachen
  // Beckens soll nicht absaufen, sie ist ohnehin unter Wasser.
  float d = halblambert(N, L);
  vec3 amb = halbraumLicht(N, uHimmelLicht, uBodenLicht);

  // Nach unten hin schlickiger: eine zweite, ruhige Tonstufe statt eines
  // Verlaufsteppichs (GRAFIK-MODULE.md §0).
  float tief = clamp(-vPos.y / max(uTiefe, 0.001), 0.0, 1.0);
  vec3 albedo = mix(uSand, uSand * vec3(0.62, 0.66, 0.68), smoothstep(0.10, 0.55, tief));

  vec3 col = albedo * (amb + uSonne * d);

  // Derselbe Nebel wie der Boden. Nicht aehnlich — derselbe.
  ${nebelAnwenden()}

  outColor = vec4(col, 1.0);
}`;

  const VS_WASSER = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
out vec3 vPos;
void main() {
  vPos = aPos;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  const FS_WASSER = () => `#version 300 es
precision highp float;
${GRAFIK.baustein('rauschen', 'bildschirm', 'fresnel')}
${nebelBausteine()}

in vec3 vPos;

uniform sampler2D uBettTiefe;
uniform vec2  uGroesse;
uniform mat4  uInvViewProj;
uniform vec3  uCam;
uniform vec3  uLicht;
uniform vec3  uSonne;
uniform vec3  uDunst;
uniform vec3  uZenit;
uniform vec3  uTiefFarbe;
uniform vec3  uFlachFarbe;
uniform vec3  uSchaumFarbe;
uniform float uZeit;
uniform float uPegel;
uniform float uBound;
uniform float uSaumPx;
uniform float uSaumTiefe;
uniform float uKlarTiefe;
uniform float uSpiegel;
uniform float uWellenSkala;
uniform float uWellenTempo;
uniform float uWellenHoehe;
uniform float uKammSchwelle;
uniform float uKammStaerke;
uniform float uGlanz;
out vec4 outColor;

/* Die zwei gegenlaeufigen Muster. Ein Feld allein wandert sichtbar als
 * Ganzes; zwei mit verschiedenem Massstab und entgegengesetzter Drift
 * ergeben Formen, die entstehen und vergehen, ohne dass etwas „faehrt".
 * Zwei Lagen je Feld, nicht vier: mehr Lagen sind Oberflaechenrauheit, und
 * die ist in GRAFIK-MODULE.md §0 ausdruecklich verboten. */
float wellenfeld(vec2 p, float t) {
  float a = fbm2(p               + vec2( 0.71, 0.31) * t, 2);
  float b = fbm2(p * 1.63        + vec2(-0.43, 0.62) * t, 2);
  return (a + b) * 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uGroesse;

  /* --- Die Differenz im Tiefenpuffer -----------------------------------
   * Der Fensterwert aus der Beckentiefenkarte wird ueber invViewProj in
   * einen Weltpunkt zurueckgerechnet; die Differenz zum Pegel ist die
   * SENKRECHTE Wassertiefe in Metern.
   *
   * Absichtlich senkrecht und nicht entlang des Sehstrahls: bei einer
   * Kamera, die den See unter 3 Grad sieht, entspraeche ein Saum von 4 px
   * rund 13 m Strahlweg — dieselbe Zahl waere in einer Aufsicht ein
   * Ringwall. Die senkrechte Tiefe ist blickunabhaengig, und nur so ist
   * uSaumTiefe eine Zahl, die man ueber Szenarien hinweg vergleichen kann. */
  float dBett = texture(uBettTiefe, uv).r;
  float tiefe;
  if (dBett >= 0.99999) {
    tiefe = 99.0;                       // kein Becken getroffen
  } else {
    vec3 bett = weltAusTiefe(uv, dBett, uInvViewProj);
    tiefe = max(uPegel - bett.y, 0.0);
  }

  /* --- Wellen ---------------------------------------------------------- */
  vec2 p = vPos.xz * uWellenSkala;
  float t = uZeit * uWellenTempo;
  float h = wellenfeld(p, t);
  float e = 0.36;
  float hx = wellenfeld(p + vec2(e, 0.0), t) - wellenfeld(p - vec2(e, 0.0), t);
  float hz = wellenfeld(p + vec2(0.0, e), t) - wellenfeld(p - vec2(0.0, e), t);
  vec3 N = normalize(vec3(-hx * uWellenHoehe, 1.0, -hz * uWellenHoehe));

  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLicht);

  /* --- Tiefenfarbe: klar am Ufer, satt zur Mitte -----------------------
   * Gemessen an ref/genshin/wasser_qiongji_ufer_tiefenverlauf_1920.png,
   * Spalte 520: flach (216,233,210) -> tief (85,190,190). Rot faellt um
   * 61 %, Gruen um 18 %, Blau um 10 % — die Tiefe frisst vor allem Rot.
   * Genau dieses Verhaeltnis steckt in uFlachFarbe/uTiefFarbe. */
  float kt = clamp(tiefe / max(uKlarTiefe, 0.001), 0.0, 1.0);
  kt = kt * kt * (3.0 - 2.0 * kt);
  vec3 koerper = mix(uFlachFarbe, uTiefFarbe, kt);

  /* --- Himmelsspiegelung ueber Fresnel, gedeckelt -----------------------
   * Der gespiegelte Strahl liest dieselbe Rampe wie der Himmel, damit die
   * Spiegelung nicht neben dem steht, was ueber ihr zu sehen ist. */
  vec3 Rv = reflect(-V, N);
  float hoch = clamp(Rv.y / 0.62, 0.0, 1.0);
  vec3 himmel = mix(uDunst, uZenit, pow(hoch, 1.6));
  float f = schlick(0.02, max(dot(N, V), 0.0)) * uSpiegel;
  vec3 col = mix(koerper, himmel, f);

  /* --- Wenige grosse Wellenformen, ZWEISTUFIG --------------------------
   * smoothstep mit fwidth: exakt auf Pixelbreite geglaettet, optisch hart,
   * und es flimmert nicht — wir haben keine zeitliche Kantenglaettung.
   * Dieselbe Bauart wie der Binaerglanz in PHASE-GRAFIK-PLAN G4. */
  float w = max(fwidth(h), 1e-4);
  float kamm = smoothstep(uKammSchwelle - w, uKammSchwelle + w, h);
  col = mix(col, uSchaumFarbe, kamm * uKammStaerke * (0.35 + 0.65 * kt));

  /* --- Sonnenfunkeln als Binaerstufe ----------------------------------- */
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(N, H), 0.0), 90.0);
  float sw = max(fwidth(sp), 1e-4);
  sp = smoothstep(0.28 - sw, 0.28 + sw, sp);
  col += uSonne * sp * uGlanz;

  /* --- Der Schaumsaum am Ufer ------------------------------------------
   * Gemessen an ref/genshin/wasser_nazuchi_strand_schaumrand_1920.png,
   * Spalten 800/900/1000: der Saum ist 3, 5 und 8 px breit bei 1920 px
   * Bildbreite, also 0,16 / 0,26 / 0,42 % der Bildbreite. Gipfel (226,233,218),
   * L=230 gegen Wasser L=169 und Sand L=195. Der Uebergang ist 2 px.
   *
   * ENTSCHEIDEND ist die EINHEIT. Ein Saum, der in METERN Wassertiefe
   * festgelegt ist, waere aus 14 m Entfernung ein Ringwall und aus 50 m
   * unsichtbar — nachgemessen: derselbe 4,5-m-Streifen ist im Nahbild rund
   * 160 px und in g-fernsicht 4 px breit. Genshins Saum ist aber ueber alle
   * Entfernungen dieselbe Handbreit Bildschirm.
   *
   * Deshalb wird die Tiefendifferenz durch ihre eigene Bildschirmableitung
   * geteilt: tiefe / fwidth(tiefe) ist der Abstand zur Uferlinie IN PIXELN,
   * unabhaengig von Entfernung und Blickwinkel. Dieselbe Bauart benutzt der
   * Plan in G7 fuer die Silhouette des Schleims (silhouettenAbstandPx).
   *
   * Die Wellen verschieben die Schwelle, damit die Linie nicht wie mit dem
   * Zirkel gezogen aussieht. uSaumMaxTiefe deckelt sie zusaetzlich in Metern:
   * in einer steilen Aufsicht wird fwidth(tiefe) sehr klein, und ohne Deckel
   * liefe der Saum ueber das halbe Becken. */
  float px = tiefe / max(fwidth(tiefe), 1e-6);
  float schwellePx = uSaumPx * (0.45 + 1.10 * h);
  float saum = 1.0 - smoothstep(schwellePx - 1.0, schwellePx, px);
  saum *= 1.0 - smoothstep(uSaumTiefe * 0.75, uSaumTiefe, tiefe);
  col = mix(col, uSchaumFarbe, saum);

  /* --- Deckkraft: flach durchsichtig, tief deckend ---------------------- */
  float alpha = mix(0.22, 0.94, kt);
  alpha = max(alpha, saum);
  alpha = max(alpha, kamm * uKammStaerke);

  /* --- Nebel: exakt der des Bodens --------------------------------------- */
  float dunst = ${nebelAnteilAusdruck()};
  ${nebelAnwenden()}
  alpha = mix(alpha, 1.0, dunst);

  outColor = vec4(col, alpha);
}`;

  /* ==========================================================================
   * 3. Anmeldung
   * ======================================================================== */

  GRAFIK.modul({
    name: 'wasser',
    ordnung: 22,          // nach dem Boden (20), vor Gras (25) und Karte (30/40)

    regler: [
      { key: 'saumPx',       min: 0.00, max: 16.0, step: 0.10, wert: 4.20 },
      { key: 'saumTiefe',    min: 0.02, max: 1.20, step: 0.01, wert: 0.32 },
      { key: 'klarTiefe',    min: 0.10, max: 3.00, step: 0.05, wert: 0.45 },
      { key: 'spiegel',      min: 0.00, max: 1.00, step: 0.01, wert: 0.22 },
      { key: 'wellenSkala',  min: 0.02, max: 1.00, step: 0.01, wert: 0.11 },
      { key: 'wellenTempo',  min: 0.00, max: 2.00, step: 0.01, wert: 0.35 },
      { key: 'wellenHoehe',  min: 0.00, max: 2.00, step: 0.01, wert: 0.55 },
      { key: 'kammSchwelle', min: 0.10, max: 0.90, step: 0.01, wert: 0.52 },
      { key: 'kammStaerke',  min: 0.00, max: 1.00, step: 0.01, wert: 0.30 },
      { key: 'glanz',        min: 0.00, max: 1.00, step: 0.01, wert: 0.18 },
    ],

    aufbau(gl, R) {
      const w = this.w = {};

      // Die Fragmentquellen entstehen ERST HIER: dann steht fest, ob nebel.js
      // geladen ist, und die Ladereihenfolge in laden.js spielt keine Rolle.
      w.mitNebel   = nebelHat();
      w.tiefeProg  = GRAFIK.programm(gl, VS_ORT,    FS_LEER,      'wasser: Tiefe');
      w.bettProg   = GRAFIK.programm(gl, VS_BETT,   FS_BETT(),    'wasser: Becken');
      w.wasserProg = GRAFIK.programm(gl, VS_WASSER, FS_WASSER(),  'wasser: Flaeche');

      const bett = scheibe(bettY, true);
      w.bett = GRAFIK.mesh(gl, bett.pos, bett.nrm, bett.idx);

      // Die Wasserflaeche ist eben. Sie braucht keine Unterteilung fuer die
      // Form — vPos interpoliert auf einer Ebene exakt —, wohl aber genug
      // Ringe, damit der Rand der Ellipse rund bleibt.
      const flaeche = scheibe(() => SEE.pegel, false);
      w.wasser = GRAFIK.mesh(gl, flaeche.pos, null, flaeche.idx);

      w.ziel = null;                  // Tiefenziel, wird bei Bedarf angelegt
      w.zielB = 0; w.zielH = 0;
    },

    vorbereiten(gl, R, ctx) {
      const w = this.w;
      const b = Math.max(1, ctx.breite | 0), h = Math.max(1, ctx.hoehe | 0);
      if (!w.ziel || w.zielB !== b || w.zielH !== h) {
        if (w.ziel) w.ziel.loeschen();
        w.ziel = GRAFIK.textur(gl, { breite: b, hoehe: h, format: 'tiefe24',
                                     filter: 'nearest', wrap: 'klemmen', ziel: true });
        w.zielB = b; w.zielH = h;
      }
    },

    zeichnen(gl, R, ctx) {
      const w = this.w;
      if (!w || !w.ziel) return;
      const wert = this.wert;
      const li = ctx.licht || {};
      const richtung = li.richtung || R.light;
      const sonne  = li.farbe  || [0.88, 0.85, 0.78];
      const himmel = li.himmel || [0.34, 0.38, 0.47];
      const boden  = li.boden  || [0.27, 0.26, 0.23];
      const dunst  = li.dunst  || [0.405, 0.415, 0.425];
      const zenit  = li.zenit  || [0.135, 0.165, 0.225];
      const bound  = (ctx.welt && ctx.welt.bounds) || 26;

      /* --- 1. Tiefenpass des Beckens in die eigene Karte ------------------ */
      gl.bindFramebuffer(gl.FRAMEBUFFER, w.ziel.fbo);
      gl.viewport(0, 0, w.zielB, w.zielH);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(w.tiefeProg);
      gl.uniformMatrix4fv(w.tiefeProg.u.uViewProj, false, ctx.viewProj);
      gl.uniform1f(w.tiefeProg.u.uFern, 0.0);
      w.bett.zeichnen(gl);

      /* --- 2. Zurueck ins Bild, Tiefenloch stanzen ------------------------
       * Die Bodenebene des Grundzugs liegt bei y = 0 und wuerde alles unter
       * ihr verdecken. Gestanzt wird mit dem BECKENNETZ, nicht mit einer
       * flachen Scheibe: nur so ist der freigeraeumte Fussabdruck exakt so
       * gross wie das, was danach hineingezeichnet wird. Alles, was NACH
       * diesem Modul zeichnet (Karte, Kreaturen, Gel), verdeckt den See
       * weiterhin richtig — die Tiefe wird ja neu geschrieben. */
      R.zielBinden(ctx.ziel);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.ALWAYS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.colorMask(false, false, false, false);
      gl.uniform1f(w.tiefeProg.u.uFern, 1.0);
      w.bett.zeichnen(gl);
      gl.colorMask(true, true, true, true);
      gl.depthFunc(gl.LESS);

      /* --- 3. Der Beckenboden farbig -------------------------------------- */
      const bp = w.bettProg;
      gl.useProgram(bp);
      if (R.nebel && R.nebel.setzen) R.nebel.setzen(gl, bp);
      gl.uniformMatrix4fv(bp.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(bp.u.uCam, ctx.cam);
      gl.uniform3fv(bp.u.uLicht, richtung);
      gl.uniform3fv(bp.u.uSonne, sonne);
      gl.uniform3fv(bp.u.uHimmelLicht, himmel);
      gl.uniform3fv(bp.u.uBodenLicht, boden);
      gl.uniform3fv(bp.u.uDunst, dunst);
      gl.uniform3fv(bp.u.uSand, [0.78, 0.74, 0.62]);
      gl.uniform1f(bp.u.uBound, bound);
      gl.uniform1f(bp.u.uTiefe, SEE.tiefe);
      w.bett.zeichnen(gl);

      /* --- 4. Die Wasserflaeche ------------------------------------------- */
      const wp = w.wasserProg;
      gl.useProgram(wp);
      if (R.nebel && R.nebel.setzen) R.nebel.setzen(gl, wp);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, w.ziel.tex);
      gl.uniform1i(wp.u.uBettTiefe, 0);
      gl.uniform2f(wp.u.uGroesse, w.zielB, w.zielH);
      gl.uniformMatrix4fv(wp.u.uViewProj, false, ctx.viewProj);
      gl.uniformMatrix4fv(wp.u.uInvViewProj, false, ctx.invViewProj);
      gl.uniform3fv(wp.u.uCam, ctx.cam);
      gl.uniform3fv(wp.u.uLicht, richtung);
      gl.uniform3fv(wp.u.uSonne, sonne);
      gl.uniform3fv(wp.u.uDunst, dunst);
      gl.uniform3fv(wp.u.uZenit, zenit);
      /* Farbwerte: Verhaeltnis flach/tief = 2,54 : 1,23 : 1,11, gemessen an
       * wasser_qiongji_ufer_tiefenverlauf_1920 (216,233,210)/(85,190,190).
       * Der Grundton folgt der Fernwassermessung aus
       * landschaft_mondstadt_mittag_fernnebel_4k Zeile 1400: (41,150,190),
       * Verhaeltnis 1 : 3,66 : 4,63 — im Ausgabewert unserer dunkleren
       * Szene ist das (0.11, 0.40, 0.51). */
      gl.uniform3fv(wp.u.uTiefFarbe,   [0.110, 0.400, 0.510]);
      gl.uniform3fv(wp.u.uFlachFarbe,  [0.279, 0.492, 0.566]);
      gl.uniform3fv(wp.u.uSchaumFarbe, [0.886, 0.914, 0.855]);
      gl.uniform1f(wp.u.uZeit, ctx.time);
      gl.uniform1f(wp.u.uPegel, SEE.pegel);
      gl.uniform1f(wp.u.uBound, bound);
      gl.uniform1f(wp.u.uSaumPx,       wert.saumPx);
      gl.uniform1f(wp.u.uSaumTiefe,    wert.saumTiefe);
      gl.uniform1f(wp.u.uKlarTiefe,    wert.klarTiefe);
      gl.uniform1f(wp.u.uSpiegel,      wert.spiegel);
      gl.uniform1f(wp.u.uWellenSkala,  wert.wellenSkala);
      gl.uniform1f(wp.u.uWellenTempo,  wert.wellenTempo);
      gl.uniform1f(wp.u.uWellenHoehe,  wert.wellenHoehe);
      gl.uniform1f(wp.u.uKammSchwelle, wert.kammSchwelle);
      gl.uniform1f(wp.u.uKammStaerke,  wert.kammStaerke);
      gl.uniform1f(wp.u.uGlanz,        wert.glanz);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);            // die Tiefe des Beckens bleibt stehen
      w.wasser.zeichnen(gl);

      /* --- Aufraeumen: der naechste Durchgang darf nichts erben ----------- */
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.depthFunc(gl.LESS);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },
  });

  // Fuer Berichte und fuer jeden, der wissen will, wo das Wasser liegt.
  window.WASSER_SENKE = SEE;

})();
