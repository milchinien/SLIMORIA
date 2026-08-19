'use strict';
/* ---------------------------------------------------------------------------
 * Phase Grafik — Modul `gras`: instanzierte Vegetation.
 *
 * Ordnung 25: nach dem Boden (20), vor den Hindernissen (30). Es verdraengt
 * keinen Grundzug — es zeichnet ZUSAETZLICH auf die Bodenebene.
 *
 * WARUM ES DIESES MODUL GIBT
 * PHASE-GRAFIK-PLAN.md, "Entscheidungen", Punkt 3: der Vollbildvergleich gegen
 * ein Genshin-Landschaftsbild ist gegen eine graue Ebene nicht zu gewinnen —
 * der Richter sieht Wiese gegen Millimeterpapier. Damit ist G12 nicht optional,
 * sondern Pflicht. Die Arena behaelt dabei ihre GEOMETRIE: kein Hindernis kommt
 * dazu, keines faellt weg, die Halme stehen nur dort, wo `istFrei()` aus
 * world.js ohnehin freie Flaeche meldet.
 *
 * ---------------------------------------------------------------------------
 * DIE ZAHLEN — gemessen, nicht gefuehlt
 *
 * Eigene Messungen an `ref/genshin/` (Werkzeug: Pixelproben ueber getImageData,
 * sRGB-Codewerte 0..255, dieselbe Rechnung wie tools/grafikmass.mjs):
 *
 *   landschaft_sumeru_wiese_see_tag_2560.png, Spalte 300, y 1109..1439
 *     Vordergrundwiese  R 117..131 · G 186..204 · B 70..108
 *     Mittelwert        (126, 196, 94)   L = 163
 *   landschaft_wiese_mittag_figur_2560.png, vier Proben im Rasen
 *     (144,194,102) · (132,183,96) · (125,186,92) · (153,178,115)
 *   PHASE-GRAFIK-PLAN §1.4 nennt [BELEGT] (134,188,91) — dasselbe Feld.
 *
 *   gras_halme_nahaufnahme_tag_1366.png, Zeile 560, 60 Stuetzstellen
 *     dunkelster Halm   (137,192,65)  L = 178
 *     hellster Halm     (169,220,89)  L = 198   -> Spitze rund +11 % heller
 *     Boden zwischen den Halmen (178,210,120) L = 199
 *     => der Boden ist HELLER als die Halme. Keine Wurzelverdunklung, kein
 *        Kontaktschatten am Halmfuss. Das ist die Eigenheit, die man beim
 *        Nachbauen zuerst falsch macht.
 *
 *   goldene_stunde_grasland_2560.png, drei Proben Spitze/Mitte/Fuss
 *     (73,50,10) L=52 · (70,48,6) L=50 · (70,47,5) L=49
 *     => im Gegenlicht ist der Helligkeitsgang ueber die Halmlaenge fast weg;
 *        was das Bild dort traegt, ist die gelbe Silhouettenlinie gegen den
 *        Himmel, gemessen (158,141,54) ueber 1,5–2 px bei 900 p
 *        (PHASE-GRAFIK-PLAN G12, [BELEGT]).
 *
 * Daraus die Vorgabewerte weiter unten:
 *   uUnten (0.44,0.72,0.31) · uOben (0.62,0.94,0.53)
 *   ergeben nach Lichtfarbe und Rampe im Mittel (0.49,0.77,0.37)
 *   = (126,196,94) — genau die gemessene Wiese.
 *
 * ---------------------------------------------------------------------------
 * ZWEI ABWEICHUNGEN VOM PLAN, BEIDE BEGRUENDET
 *
 * 1. **Vier Segmente je Halm statt sieben.** Der Plan nennt 7 Segmente /
 *    14 Dreiecke. Gerechnet fuer unsere Kamera: fovY 50°, H = 900, also
 *    965 px je Radiant. Ein Halm von 0,28 m in 8 m Entfernung ist
 *    0,28/8·965 ≈ 34 px hoch und rund 7 px breit. Bei 34 px Bildhoehe traegt
 *    das siebte Segment 5 px Bogen — unsichtbar. Vier Reihen plus Spitze
 *    (9 Punkte, 7 Dreiecke) halbieren die Vertexlast bei gleichem Bild.
 *
 * 2. **Echte verjuengte Geometrie statt Alphatest.** Der Plan nennt
 *    `discard` bei alpha < 0.5. Das setzt eine Halmtextur voraus; wir haben
 *    keine und brauchen keine, weil die Verjuengung schon in der Geometrie
 *    steht. Ohne `discard` bleibt die fruehe Tiefenpruefung erhalten — in
 *    SwiftShader ist das der groessere Posten als ein paar Dreiecke mehr.
 *    Die Kanten bekommen ihre Glaettung vom MSAA des Standardpuffers
 *    (`{antialias:true}`), also 1–2 px weiche Kante ohne dunkle Kontur —
 *    genau die Messvorgabe aus G12.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein Math.random, kein Date, kein performance.now. Die Verteilung kommt aus
 * einer ganzzahligen Streufunktion ueber den Gitterindex, die Zeit
 * ausschliesslich aus `ctx.time`. Zwei Aufnahmen desselben Szenarios sind
 * damit Bit fuer Bit vergleichbar.
 * ------------------------------------------------------------------------- */

(function () {

  /* ==========================================================================
   * 0. Streuung ohne Zufallszahlen
   *
   * Ganzzahlige Bitmischung (Wang/Jenkins-Art) statt Math.random: gleicher
   * Index -> gleicher Wert, auf jeder Maschine, in jedem Lauf. `Math.imul`
   * haelt die Multiplikation in 32 Bit, sonst wandert das Ergebnis in die
   * Ungenauigkeit von double.
   * ======================================================================== */
  function streu(a, b, c) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)
           + Math.imul(c | 0, 1274126177)) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  }

  /* ==========================================================================
   * 1. Shader
   * ======================================================================== */

  const VS = `#version 300 es
precision highp float;

/* Halmform, nicht instanziert: 9 Punkte, x = Seite (-1|0|+1), y = t (0..1) */
layout(location = 0) in vec2 aHalm;
/* je Instanz */
layout(location = 2) in vec4 aOrt;    // x, y(Boden), z, Hoehenfaktor
layout(location = 3) in vec4 aForm;   // sin(gier), cos(gier), Breitenfaktor, Neigungsfaktor
layout(location = 4) in float aTon;   // 0..1 Farbabweichung des Halms

uniform mat4  uViewProj;
uniform float uZeit;
uniform vec2  uWindRichtung;
uniform float uWindStaerke;
uniform float uRundung;
/* Groesse als Uniform, Streuung als Faktor im Puffer: dadurch stellen die
 * Regler hoehe/breite/neigung das Bild sofort, ohne den Instanzpuffer neu
 * aufzubauen. */
uniform float uHoehe;
uniform float uBreite;
uniform float uNeigung;

out vec3  vPos;
out vec3  vNormal;
out float vT;
out float vTon;

void main() {
  float t     = aHalm.y;
  float seite = aHalm.x;
  float hoehe = uHoehe * aOrt.w;
  float si = aForm.x, co = aForm.y;

  /* Neigung KAEMMEN, nicht wuerfeln.
   * Die Gierrichtung ist frei gestreut — sonst stuenden alle Halme mit
   * derselben Blattflaeche zur Kamera und die Haelfte verschwaende hochkant.
   * Die NEIGUNG darf das nicht mitmachen: neigt jeder Halm eines Buschels in
   * seine eigene Richtung, entsteht eine Rosette statt eines Grasbuschels.
   * Deshalb bekommt die Neigung ein Vorzeichen aus der Windrichtung: jeder
   * Halm legt sich in die Halbebene der vorherrschenden Richtung, und das
   * Feld ist gekaemmt wie in gras_halme_nahaufnahme_tag. */
  float neig = uNeigung * aForm.w
             * (dot(vec2(si, co), uWindRichtung) < 0.0 ? -1.0 : 1.0);

  /* Verjuengung: unten voll, erst im oberen Drittel auf einen Punkt.
   * Exponent 3.0 statt 2.0 — bei 2.0 wird der Halm eine Nadel, und die
   * Nahaufnahme zeigt eindeutig ein BLATT mit Flaeche. */
  float breite = uBreite * 0.5 * aForm.z * (1.0 - pow(t, 3.0));

  /* Halmbogen im Eigenraum: +z ist die Neigungsrichtung.
   * ky ist die Hoehe, kz der Vorhalt. Die Verkuerzung in ky haelt die
   * Bogenlaenge annaehernd konstant — ohne sie wuerde ein stark geneigter
   * Halm laenger statt schraeger. abs(), damit das Vorzeichen der Neigung
   * nur die Richtung dreht und nicht die Laenge aendert. */
  float ky = t - 0.35 * abs(neig) * t * t;
  float kz = neig * t * t;

  /* Tangente entlang des Bogens, daraus die Flaechennormale.
   * cross((1,0,0), (0,Ty,Tz)) = (0,-Tz,Ty) */
  float Ty = 1.0 - 0.7 * abs(neig) * t;
  float Tz = 2.0 * neig * t;
  vec3 n0 = vec3(seite * uRundung, -Tz, Ty);

  vec3 lokal = vec3(seite * breite, hoehe * ky, hoehe * kz);

  vec3 welt;
  welt.x = aOrt.x + lokal.x * co + lokal.z * si;
  welt.z = aOrt.z - lokal.x * si + lokal.z * co;
  welt.y = aOrt.y + lokal.y;

  vec3 nw;
  nw.x = n0.x * co + n0.z * si;
  nw.z = -n0.x * si + n0.z * co;
  nw.y = n0.y;

  /* --- Windwelle (PHASE-GRAFIK-PLAN G12, wortgetreu) --------------------
   * Drei Bestandteile, auf die es ankommt:
   *   t*t          die Basis steht still, sonst schwimmt das Gras ueber dem
   *                Boden statt darauf zu wachsen;
   *   Phase aus der WELTPOSITION des Halms, sonst schwingt die ganze Wiese
   *                im Gleichtakt statt als Welle;
   *   Boenwelle mit rund 1/50 der Ortsfrequenz, ohne sie wirkt es wie ein
   *                Ventilator statt wie Wind.
   * uZeit ist ctx.time — deterministisch, sonst waere keine Aufnahme mit
   * einer anderen vergleichbar. */
  vec2  wp  = aOrt.xz;
  float ph  = dot(wp, vec2(0.12, 0.09)) + uZeit * 1.6;
  float boe = 0.65 + 0.35 * sin(dot(wp, vec2(0.013, 0.011)) - uZeit * 0.35);
  float amp = t * t * uWindStaerke * boe;
  welt.xz += uWindRichtung * (sin(ph) * 0.7 + sin(ph * 2.3 + 1.1) * 0.3) * amp;
  welt.y  -= amp * amp * 0.4 * hoehe;

  vPos    = welt;
  vNormal = nw;
  vT      = t;
  vTon    = aTon;
  gl_Position = uViewProj * vec4(welt, 1.0);
}`;

  /* Der gemeinsame Baustein wird erst im Aufbau geholt, nicht beim Laden:
   * wirft `baustein()` hier, faellt die ganze Datei aus und das Modul meldet
   * sich nie an — dann greift die Schutzregel aus GRAFIK-MODULE.md §3 gar
   * nicht mehr. Im Aufbau geworfen wird es sauber uebersprungen. */
  const fsQuelle = () => `#version 300 es
precision highp float;

${GRAFIK.baustein('halblambert')}

in vec3  vPos;
in vec3  vNormal;
in float vT;
in float vTon;

uniform vec3  uCam;
uniform vec3  uLicht;        // Richtung ZUR Sonne
uniform vec3  uSonneFarbe;
uniform vec3  uUnten;        // Halmfuss
uniform vec3  uOben;         // Halmspitze
uniform vec3  uSchattenTon;  // multiplikativ, warm — nicht grau
uniform vec3  uSaumFarbe;    // gelbe Silhouettenlinie im Gegenlicht
uniform vec3  uDunst;
uniform float uKante;        // Lage der Rampenstufe in ndl01
uniform float uFlanke;
uniform float uSaum;
uniform float uDurch;        // Durchleuchtung (Zweiseitenbeleuchtung)
uniform float uDunstAn;
uniform float uBound;

out vec4 outColor;

void main() {
  /* Zweiseitenbeleuchtung: der Halm ist ein flaches Blatt ohne Rueckseite.
   * Die Normale wird immer zur Kamera gedreht; damit bedeutet dot(N,L) < 0
   * genau "die Sonne steht hinter dem Blatt" — die Bedingung, unter der ein
   * Grashalm durchleuchtet. */
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLicht);

  /* Aufhellung zur Spitze. pow(t,0.75) statt t: der Gang sitzt im unteren
   * Drittel, wie an gras_halme_nahaufnahme_tag gemessen. */
  vec3 albedo = mix(uUnten, uOben, pow(vT, 0.75));
  albedo *= 0.88 + 0.24 * vTon;

  /* Zwei Tonstufen mit harter Kante — die Rampe aus G4, nur mit einer
   * Flanke, die auf einem 7 px breiten Halm nicht flimmert.
   * MULTIPLIKATIV und warm: im Schatten faellt Rot weniger als Blau
   * (PHASE-GRAFIK-PLAN G3, [BELEGT]). */
  float d = ndl01(N, L);
  float stufe = smoothstep(uKante - uFlanke, uKante + uFlanke, d);
  vec3 col = albedo * mix(uSchattenTon, vec3(1.0), stufe);

  /* Lichtfarbe nur zur Haelfte eingemischt: Genshins Figuren und Bewuchs
   * bleiben in jeder Beleuchtung hell und lesbar, weil der Lichtterm NICHT
   * voll mit der Lichtfarbe multipliziert wird (G4). */
  col *= mix(vec3(1.0), uSonneFarbe, 0.5);

  /* Durchleuchtung: Sonne hinter dem Blatt, Blick gegen die Sonne.
   * Das ist der Grund, warum eine Wiese im Gegenlicht LEUCHTET statt
   * abzusaufen — und der einzige Ort, an dem Gras Licht addiert. */
  float rueck = max(-dot(N, L), 0.0);
  float gegen = max(dot(V, -L), 0.0);
  col += uOben * uSonneFarbe * rueck * (0.30 + 0.70 * gegen * gegen) * uDurch;

  /* Gelbe Silhouettenlinie gegen den Himmel, gemessen (158,141,54) ueber
   * 1,5–2 px. Derselbe Ausdruck, der in FS_SLIME als "back" steht:
   * pow(dot(V,-L),2.5) * (1 - abs(dot(N,V))).
   * Mit max() gebaut, damit sie NIE abdunkelt — eine dunkle Linie am Halm
   * ist genau das, was G12 als Fehler benennt. */
  float saum = pow(gegen, 2.5) * (1.0 - abs(dot(N, V)));
  col = mix(col, max(col, uSaumFarbe), clamp(saum * uSaum, 0.0, 1.0));

  /* Derselbe Dunst wie in FS_GROUND (Zeile 252 dort), sonst reisst zwischen
   * Gras und Boden eine Naht auf. Faellt weg, sobald nebel.js den Fernnebel
   * als eigenen Durchgang uebernimmt — deshalb ein Regler und keine
   * Konstante. */
  float dunst = smoothstep(uBound * 0.7, uBound * 1.6, length(vPos.xz));
  col = mix(col, uDunst, dunst * uDunstAn);

  outColor = vec4(col, 1.0);
}`;

  /* ==========================================================================
   * 2. Halmnetz — 9 Punkte, 7 Dreiecke, als TRIANGLE_STRIP
   * ======================================================================== */
  const REIHEN = 3;                       // Querreihen, danach die Spitze
  const PUNKTE = REIHEN * 2 + 1;          // 7 Punkte, 5 Dreiecke

  function halmPunkte() {
    const p = new Float32Array(PUNKTE * 2);
    let k = 0;
    for (let r = 0; r < REIHEN; r++) {
      const t = r / REIHEN;               // 0, 0.25, 0.5, 0.75
      p[k++] = -1; p[k++] = t;
      p[k++] = 1; p[k++] = t;
    }
    p[k++] = 0; p[k++] = 1;               // Spitze
    return p;
  }

  /* ==========================================================================
   * 3. Verteilung
   *
   * Buschelweise, nicht als gleichmaessiger Rasen: der Plan nennt
   * "Buschel zu 8–15 Halmen", und ein Gitter aus Einzelhalmen liest sich
   * sofort als Gitter. Die Buschel liegen auf einem gestoerten Gitter, ihre
   * Reihenfolge wird deterministisch durchmischt — dadurch ist JEDER Anfang
   * der Liste eine raeumlich gleichmaessige Stichprobe, und der Regler
   * `halme` kann die Dichte stellen, ohne dass ein halbes Feld leer bleibt.
   * ======================================================================== */
  function verteilen(welt, opt) {
    const bounds = welt.bounds;
    const schritt = opt.abstand;
    const n = Math.max(1, Math.floor((bounds * 2) / schritt));
    const frei = (typeof window.istFrei === 'function')
      ? window.istFrei : () => true;
    const boden = (typeof window.bodenHoehe === 'function')
      ? window.bodenHoehe : () => 0;
    const fh = welt.friedhof;

    const buschel = [];
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const gx = -bounds + (ix + 0.5) * schritt;
        const gz = -bounds + (iz + 0.5) * schritt;
        const x = gx + (streu(ix, iz, 1) - 0.5) * schritt * 0.9;
        const z = gz + (streu(ix, iz, 2) - 0.5) * schritt * 0.9;

        /* Halme stehen nie in einem Hindernis. istFrei() ist dieselbe
         * Abfrage, mit der sich der Schleim durch die Welt bewegt — damit
         * kann kein Halm dort wachsen, wo man laufen wuerde. Der Zuschlag
         * 0.30 haelt die Buschel eine Halmlaenge von der Felskante weg,
         * sonst stecken Halme halb im Stein. */
        if (!frei(x, z, 0.30)) continue;

        /* Um den Friedhof herum duenner (GDD 01 §51: der Ort soll als Ort
         * lesbar sein). Volle Dichte erst ab dem 2,4-fachen Radius; im Kern
         * bleiben 12 %. Weich ausgeblendet, damit keine Kreiskante steht. */
        let dichte = 1.0;
        if (fh) {
          const d = Math.hypot(x - fh.x, z - fh.z);
          const a = fh.r * 0.8, b = fh.r * 2.4;
          const u = Math.min(1, Math.max(0, (d - a) / (b - a)));
          dichte = 0.12 + 0.88 * (u * u * (3 - 2 * u));
        }
        if (streu(ix, iz, 3) > dichte) continue;

        buschel.push({
          x, z, y: boden(x, z),
          schluessel: streu(ix, iz, 7),
          ix, iz,
        });
      }
    }

    /* Deterministische Durchmischung: nach Streuwert sortieren. Bei
     * Gleichstand entscheidet der Gitterindex, damit die Reihenfolge auf
     * jeder Maschine dieselbe ist. */
    buschel.sort((a, b) => (a.schluessel - b.schluessel)
                        || (a.iz - b.iz) || (a.ix - b.ix));

    /* --- Halme je Buschel ------------------------------------------------ */
    const proB = opt.proBuschel;
    const daten = new Float32Array(buschel.length * proB * 9);
    let k = 0, anzahl = 0;
    for (let b = 0; b < buschel.length; b++) {
      const B = buschel[b];
      const zahl = proB - 2 + Math.floor(streu(B.ix, B.iz, 11) * 5); // proB-2 .. proB+2
      for (let i = 0; i < zahl; i++) {
        const r1 = streu(B.ix, B.iz, 20 + i * 3);
        const r2 = streu(B.ix, B.iz, 21 + i * 3);
        const r3 = streu(B.ix, B.iz, 22 + i * 3);
        const winkel = r1 * 6.283185307;
        const rad = Math.sqrt(r2) * opt.buschelRadius;
        const x = B.x + Math.cos(winkel) * rad;
        const z = B.z + Math.sin(winkel) * rad;
        if (!frei(x, z, 0.12)) continue;

        const gier = r3 * 6.283185307;

        /* Nur Faktoren, keine Absolutmasse: die Groesse kommt als Uniform
         * dazu (siehe VS), damit die Regler ohne Neuaufbau greifen. */
        daten[k++] = x;
        daten[k++] = B.y;
        daten[k++] = z;
        daten[k++] = 0.70 + 0.62 * streu(B.ix, B.iz, 40 + i);   // Hoehenfaktor
        daten[k++] = Math.sin(gier);
        daten[k++] = Math.cos(gier);
        daten[k++] = 0.80 + 0.40 * streu(B.ix, B.iz, 80 + i);   // Breitenfaktor
        daten[k++] = 0.55 + 0.90 * streu(B.ix, B.iz, 60 + i);   // Neigungsfaktor
        daten[k++] = streu(B.ix, B.iz, 100 + i);                // Farbton
        anzahl++;
      }
    }
    return { daten: daten.subarray(0, k), anzahl, buschel: buschel.length };
  }

  /* ==========================================================================
   * 4. Das Modul
   * ======================================================================== */

  const M = {
    name: 'gras',
    ordnung: 25,
    /* Kein `ersetzt`: es gibt keinen Grundzug namens 'gras', also zeichnet
     * dieses Modul zusaetzlich auf den Boden — genau so gemeint. */

    regler: [
      /* Der eine Regler, der ueber die Bildrate entscheidet. Vorgabe aus der
       * Messung (siehe Kopf der Datei bzw. den Bericht). */
      { key: 'halme', min: 0, max: 130000, step: 1000, wert: 26000 },
      { key: 'hoehe', min: 0.05, max: 0.9, step: 0.01, wert: 0.30 },
      { key: 'breite', min: 0.01, max: 0.2, step: 0.005, wert: 0.055 },
      { key: 'neigung', min: 0, max: 1.2, step: 0.02, wert: 0.34 },
      { key: 'wind', min: 0, max: 0.6, step: 0.01, wert: 0.16 },
      { key: 'windX', min: -1, max: 1, step: 0.05, wert: 0.82 },
      { key: 'windZ', min: -1, max: 1, step: 0.05, wert: 0.57 },
      { key: 'rundung', min: 0, max: 1.5, step: 0.05, wert: 0.45 },
      { key: 'kante', min: 0.2, max: 0.9, step: 0.01, wert: 0.55 },
      { key: 'flanke', min: 0.005, max: 0.3, step: 0.005, wert: 0.05 },
      { key: 'saum', min: 0, max: 2, step: 0.05, wert: 0.80 },
      { key: 'durch', min: 0, max: 1.5, step: 0.05, wert: 0.55 },
      { key: 'dunst', min: 0, max: 1, step: 0.05, wert: 1.0 },
    ],

    /* --- Aufbau: Programm und Halmnetz. Der Instanzpuffer entsteht erst im
     * ersten vorbereiten(), weil WELT dort sicher steht. ------------------ */
    aufbau(gl, R) {
      this.prog = GRAFIK.programm(gl, VS, fsQuelle(), 'gras');

      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      this.halmPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.halmPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, halmPunkte(), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.instPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instPuffer);
      const S = 9 * 4;                       // 9 floats je Instanz
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 0);
      gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, 16);
      gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 32);
      gl.vertexAttribDivisor(4, 1);

      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.gebaut = 0;
      this.buschel = 0;
    },

    vorbereiten(gl, R, ctx) {
      if (this.gebaut) return;
      const welt = ctx.welt || window.WELT;
      if (!welt) return;

      const w = this.wert;
      /* Feines Buschelgitter mit Vorrat: gebaut wird EINMAL fuer den
       * Hoechstwert, gezeichnet wird der Anfang der Liste. Dadurch stellt
       * der Regler `halme` die Dichte ohne Neuaufbau — und weil die Liste
       * durchmischt ist, duennt er gleichmaessig aus statt ein Feld zu
       * leeren. */
      const erg = verteilen(welt, {
        abstand: 0.45,
        buschelRadius: 0.20,
        proBuschel: 9,
      });

      gl.bindBuffer(gl.ARRAY_BUFFER, this.instPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, erg.daten, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      this.gebaut = erg.anzahl;
      this.buschel = erg.buschel;
      console.info('GRAFIK/gras: ' + erg.anzahl + ' Halme in ' + erg.buschel
        + ' Buscheln vorgehalten, gezeichnet werden '
        + Math.min(this.wert.halme | 0, erg.anzahl) + '.');
    },

    zeichnen(gl, R, ctx) {
      const n = Math.min(this.wert.halme | 0, this.gebaut);
      if (n <= 0) return;

      const w = this.wert;
      const p = this.prog;
      const li = ctx.licht;

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      /* Zweiseitig: ein flaches Blatt hat keine Rueckseite, die man wegwerfen
       * duerfte. Die Normale dreht der Fragment-Shader ueber gl_FrontFacing. */
      gl.disable(gl.CULL_FACE);

      gl.useProgram(p);
      gl.bindVertexArray(this.vao);

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(p.u.uCam, ctx.cam);
      gl.uniform3fv(p.u.uLicht, li.richtung);
      gl.uniform3fv(p.u.uSonneFarbe, li.farbe);
      gl.uniform3fv(p.u.uDunst, li.dunst);
      gl.uniform1f(p.u.uZeit, ctx.time);

      /* Windrichtung normiert, damit `wind` wirklich die Staerke stellt und
       * nicht heimlich noch die Laenge des Richtungsvektors. */
      const wl = Math.hypot(w.windX, w.windZ) || 1;
      gl.uniform2f(p.u.uWindRichtung, w.windX / wl, w.windZ / wl);
      gl.uniform1f(p.u.uWindStaerke, w.wind);
      gl.uniform1f(p.u.uRundung, w.rundung);
      gl.uniform1f(p.u.uHoehe, w.hoehe);
      gl.uniform1f(p.u.uBreite, w.breite);
      gl.uniform1f(p.u.uNeigung, w.neigung);

      /* Gemessene Wiesenfarbe, aufgeteilt in Fuss und Spitze — siehe Kopf. */
      gl.uniform3f(p.u.uUnten, 0.47, 0.78, 0.33);
      gl.uniform3f(p.u.uOben, 0.66, 0.98, 0.55);
      /* Schattenstufe: Leuchtdichteverhaeltnis 0.846 (Zielband 0.82…0.88 aus
       * G4), dabei faellt Rot um 12 %, Blau um 21 % — der Schatten geht
       * waermer, nicht kuehler (G3, [BELEGT]). */
      gl.uniform3f(p.u.uSchattenTon, 0.88, 0.84, 0.79);
      gl.uniform3f(p.u.uSaumFarbe, 0.620, 0.553, 0.212);   // (158,141,54)/255

      gl.uniform1f(p.u.uKante, w.kante);
      gl.uniform1f(p.u.uFlanke, w.flanke);
      gl.uniform1f(p.u.uSaum, w.saum);
      gl.uniform1f(p.u.uDurch, w.durch);
      gl.uniform1f(p.u.uDunstAn, w.dunst);
      gl.uniform1f(p.u.uBound, (ctx.welt && ctx.welt.bounds) || 26);

      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, PUNKTE, n);

      gl.bindVertexArray(null);
    },
  };

  GRAFIK.modul(M);

})();
