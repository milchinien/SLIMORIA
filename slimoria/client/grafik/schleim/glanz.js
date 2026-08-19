'use strict';
/* ---------------------------------------------------------------------------
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * Das Glanzlicht des Schleimkoerpers.
 *
 * Nur aktiv im zweiten Renderpfad (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche.
 *
 * ===========================================================================
 * 1. Was am Material gemessen wurde, und warum es so und nicht anders gebaut
 *    ist
 * ===========================================================================
 *
 * Gemessen an `ref/slime/sr1-rest-single-pink-silhouette.jpg`, Koerper-Bounding-
 * Box 1284,718,221,225 — dieselbe Datei und derselbe Ausschnitt, aus dem
 * `ref/slime/DOSSIER.md` §7 seine Zahlen zieht. Zwei rohe Schnitte durch das
 * Bild, waagerecht durch die Glanzmitte (Zeile 794) und senkrecht (Spalte
 * 1377), Helligkeit als Summe R+G+B:
 *
 *   Ort des Flecks            0.425 von links, 0.342 von oben
 *                             (Dossier: 42 % / 35 % — bestaetigt)
 *   Spitze                    S 618 bei (1378, 795)
 *   Umgebung auf gleicher     S 470  (Mittel aus x 1398..1430 und x 1326..1358,
 *   Hoehe                            das Auge bei x 1342 ausgenommen)
 *   Voll beleuchtetes Plateau S 529  (Spalte 1377, y 720..764)
 *   ------------------------------------------------------------------------
 *   UEBERHOEHUNG              618 / 470 = 1.32 x gegen die Nachbarschaft
 *                             618 / 529 = 1.17 x gegen das Kuppelplateau
 *   HALBWERTSBREITE waagerecht 25 px = 11.3 % der Koerperbreite
 *   HALBWERTSBREITE senkrecht  18 px =  8.0 % der Koerperhoehe
 *   ACHSENVERHAELTNIS          1 : 0.72 — der Fleck ist BREITER als hoch
 *   FLANKE 90 % -> 20 %       12 px links, 14 px rechts = 5.4–6.3 % der Breite
 *   FUSSABDRUCK bei 20 %      34 px = 15.4 % der Breite
 *   SAETTIGUNG im Kern        0.29 gegen 0.56 auf der beleuchteten Flaeche
 *   FARBE im Kern             255,183,181 gegen 255,113,161 ringsum
 *
 * Und derselbe Fleck an einem FLACHGEDRUECKTEN Koerper, gemessen an
 * `ref/slime/sr2-squash-vs-airborne-stacked.jpg`, bbox 1375,683,404,318:
 *
 *   Ort                       0.42 von links (unveraendert),
 *                             0.17 von oben (statt 0.34 — der Fleck wandert
 *                             mit dem neuen Scheitel nach oben)
 *   ACHSENVERHAELTNIS          1 : 0.35 statt 1 : 0.72 — er zieht sich
 *                             mit dem Koerper in die Breite
 *
 * Daraus folgen drei Bauentscheidungen.
 *
 * ---------------------------------------------------------------------------
 * (a) Der Fleck ist eine BEGRENZTE Form, keine Potenzfunktion.
 *
 * Sowohl `renderer.js` (`pow(ndh, 300)` plus `pow(ndh, 26)`) als auch der
 * Materialkern (`pow(ndh, 95)`) beschreiben den Glanz als Blinn-Keule. Eine
 * Potenzfunktion hat kein Ende: sie faellt asymptotisch und legt deshalb ueber
 * die ganze beleuchtete Kuppel einen Schleier. Genau davor warnt
 * GRAFIK-MODULE.md §0: „Glanzlicht als klar begrenzte Form" gegen „weich
 * auslaufender Schimmer".
 *
 * Die Messung sagt, welche Form es statt dessen ist. Normiert man das
 * Profil des waagerechten Schnitts auf (Spitze − Umgebung), steht da:
 *
 *   Abstand vom Zentrum   0     4    8    12   16   20  px
 *   Anteil der Ueberhoehung 1.00 0.98 0.78 0.59 0.35 0.16
 *
 * Das ist keine Potenzkeule, das ist eine Smoothstep-Schulter: flach oben,
 * steil in der Mitte, und bei rund 17 px auf Null. `1 - smoothstep(0, B, w)`
 * liegt bei w = B/2 genau auf 0.5 und bei w = 0.7·B auf 0.216 — gemessen ist
 * an derselben Stelle 0.20. Der Fussabdruck kommt damit auf 2 · 0.7 · B, also
 * exakt die gemessenen 34 px, wenn B die Halbwertsbreite ist. Deshalb:
 *
 *   float fleck = 1.0 - smoothstep(0.0, uWeite, winkel);
 *
 * B ist ein WINKEL, kein Bildschirmmass — sonst haengt die Fleckgroesse an
 * der Kameradistanz statt am Koerper. Auf einer Kugel vom Radius R aendert
 * sich die Normale ueber die Bogenlaenge s um s/R, und der Halbvektorwinkel
 * mit ihr. Halbwertsbreite 11.3 % der Koerperbreite 2R heisst also
 * B = 2 · 0.113 = 0.226 rad ≈ 13°.
 *
 * ---------------------------------------------------------------------------
 * (b) Der Fleck ist ein OVAL, und das Oval folgt der Stauchung.
 *
 * 1 : 0.72 in Ruhe, 1 : 0.35 flachgedrueckt. Ein Halbvektor-Fleck auf einer
 * Kugel ist rund; das Oval kommt daher, dass der Koerper keine Kugel ist und
 * die Flaeche an dieser Stelle schraeg zur Kamera steht. Der Winkel wird
 * deshalb ANISOTROP gemessen: der Anteil entlang der Koerperachse zaehlt um
 * 1/uOval staerker als der waagerechte. Und uOval selbst wird jedes Bild aus
 * der Huelle gemessen (Hoehe durch Breite, bezogen auf die Ruheform 1 : 0.90
 * aus DOSSIER §1). Beim Aufprall geht die Huelle auf 1 : 0.60, uOval mit ihr
 * auf 0.72 · 0.60/0.90 = 0.48, und der Fleck zieht sich in die Breite — ohne
 * dass irgendwo eine Aufprallzeit oder ein Ereignis abgefragt wird.
 *
 * ---------------------------------------------------------------------------
 * (c) Der Fleck wird ADDIERT, in der Farbe des Lichts, und entsaettigt
 *     dadurch von selbst.
 *
 * Das Dossier notiert „Entsaettigung statt Aufhellung". Die Rohwerte zeigen,
 * wie das zustande kommt. Vom Rand zum Kern steigt
 *
 *   R 255 -> 255   (steht schon am Anschlag)
 *   G  91 -> 183   (+92)
 *   B 125 -> 181   (+56)
 *
 * Addiert wird also ein Wert mit MEHR Gruen als Blau — die warme Sonne jener
 * Szene, nicht neutrales Weiss. Ein additives Weiss haette B genauso stark
 * angehoben wie G und das Ergebnis nach Flieder gezogen. Die Saettigung
 * faellt trotzdem von 0.56 auf 0.29, weil der staerkste Kanal bereits klemmt
 * und nur die schwachen noch steigen koennen.
 *
 * Additiv ist ausserdem genau das, was der Vertrag von `grafik/gel.js` fuer
 * Module mit Ordnung > 60 vorschreibt: `depthFunc(LEQUAL)`, `depthMask(false)`,
 * `blendFunc(ONE, ONE)` auf der Frontflaeche, die der Tiefenvorlauf D2a
 * hinterlassen hat.
 *
 * ===========================================================================
 * 2. Warum der Fleck sich bewegen MUSS und woher die Bewegung kommt
 * ===========================================================================
 *
 * Ein Glanzlicht, das beim Aufprall stillsteht, verraet die Textur: es sagt
 * dem Auge „hier ist ein bemaltes Objekt", und damit ist GDD 01 §66 verloren.
 * Der Fleck haengt hier an DREI Groessen, die alle aus der verformten Huelle
 * kommen und an keiner Zeitachse und keinem Ereignis:
 *
 *   1. Die Normale N. Sie kommt aus `ctx.surface.normals`, also aus dem
 *      Weichkoerper. Kippt die Oberflaeche, wandert der Fleck.
 *   2. uOval, gemessen aus Hoehe durch Breite der Huelle (siehe (b)).
 *   3. uOben, die Achse, entlang der das Oval gedrueckt wird: die Richtung
 *      vom gemessenen Schwerpunkt zum hoechsten Punkt der Huelle. Legt sich
 *      der Koerper beim Richtungswechsel schief, kippt das Oval mit.
 *
 * ===========================================================================
 * 3. Anmeldung — zwei Eintraege aus einer Datei
 * ===========================================================================
 *
 * `glanz-anmeldung`, Ordnung 55: zeichnet nichts. Sie meldet dem Materialkern
 *   ueber dessen Wunschzettel (`R.gel.wunsch.glanzMul`, gueltig genau ein
 *   Bild, laut gel.js von Modulen mit Ordnung < 60 zu setzen), dass der
 *   eingebaute Behelfsglanz zur Seite geht. Zwei Glanzlichter an derselben
 *   Stelle addieren sich zu einem Schleier — die Eigenschaft hat genau einen
 *   Besitzer, und ab jetzt ist das diese Datei.
 *
 * `glanz`, Ordnung 70: zeichnet. Ordnung 70 und nicht 55, weil der
 *   Materialkern bei 60 liegt und ein Glanz UNTER ihm vom Absorptions-
 *   durchgang D2b (`blendFuncSeparate(ZERO, SRC_COLOR)`) mit der Gel-Dicke
 *   multipliziert und damit ausgeloescht wuerde. renderer2.js fuehrt fuer
 *   „glanz.js" ohnehin Ordnung 70 (Kopfkommentar, Zeile 104), gel.js
 *   verlangt fuer alles, was AUF der Oberflaeche sitzt, ausdruecklich > 60.
 *   ABWEICHUNG VOM AUFTRAG (dort stand 50..59) — siehe Bericht.
 *
 * Determinismus: keine Zufallszahl, keine Uhr, kein `uZeit`. Der Fleck
 * bewegt sich ausschliesslich, weil die Oberflaeche sich bewegt.
 * ------------------------------------------------------------------------- */

(function () {
  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/glanz.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* =====================================================================
   * Regler. Vorgabewerte sind die gemessenen Werte aus dem Kopfkommentar,
   * nicht geschaetzte Startpunkte.
   * =================================================================== */
  const P = {
    /* Halbwertsbreite des Flecks als Winkel. 0.226 rad entspricht 11.3 %
     * der Koerperbreite (Messung sr1-rest-single-pink-silhouette.jpg). */
    weite: 0.226,
    /* Achsenverhaeltnis in Ruhe: senkrecht 0.72 mal so weit wie waagerecht. */
    oval: 0.72,
    /* Wie stark die Stauchung der Huelle auf das Oval durchschlaegt.
     * 1.0 = voll (Huelle auf 1:0.60 -> Oval 0.48, gemessen 0.35..0.48). */
    ovalFolgt: 1.00,
    /* Ueberhoehung im Zentrum. Wird gegen die gemessenen 1.32 x abgeglichen. */
    staerke: 0.55,
    /* Zweiter, flauer Schimmer auf der gegenueberliegenden oberen Flanke
     * (DOSSIER §7). Gemessen 1.11 x gegen 1.32 x -> 0.34 der Hauptstaerke,
     * und rund 1.6 mal so breit. */
    zweit: 0.34,
    zweitBreite: 1.6,
    /* Torschwellen: kein Glanz im Schatten, keiner am streifenden Rand.
     * Dort gehoert der Fresnel-Rand hin, und der sitzt im Materialkern. */
    torLicht: 0.14,
    torRand: 0.30,
  };

  const S = {
    bereit: false,
    prog: null,
    mesh: null,
    hochgeladen: -1,
    /* jedes Bild aus der Huelle gemessen */
    oval: P.oval,
    oben: [0, 1, 0],
    breite: 1,
    hoehe: 1,
  };

  /* Ruheform laut DOSSIER §1: Breite : Hoehe = 1.000 : 0.90. Bezugswert,
   * gegen den die Stauchung gemessen wird. */
  const RUHE_VERHAELTNIS = 0.90;

  /* =====================================================================
   * Shader
   * =================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
out vec3 vPos;
out vec3 vNormal;
/* invariant, damit dieser Durchgang auf derselben Tiefe landet wie der
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
uniform vec3  uLicht;        // Richtung ZUR Sonne
uniform vec3  uSonne;        // Farbe der gerichteten Quelle
uniform vec3  uHimmel;       // Farbe der Himmelskuppel
uniform vec3  uGlanzFarbe;   // Eigenfarbe des Glanzes, aus R.gel.farbe.glanz
uniform vec3  uOben;         // Koerperachse, jedes Bild aus der Huelle gemessen

uniform float uWeite;        // Halbwertsbreite des Flecks, Bogenmass
uniform float uOval;         // senkrechte Achse geteilt durch waagerechte
uniform float uStaerke;
uniform float uZweit;
uniform float uZweitBreite;
uniform float uTorLicht;
uniform float uTorRand;

out vec4 outColor;

/* Winkelabstand zur Spiegelrichtung, ANISOTROP gemessen.
 *
 * dot(N, H) allein ergaebe einen runden Fleck. Gemessen ist er 1 : 0.72 und
 * unter Stauchung bis 1 : 0.35. Also wird der Tangentialanteil von H, der
 * gerade sin(winkel) lang ist, in zwei Anteile zerlegt — laengs der
 * Koerperachse und quer dazu — und der Laengsanteil um 1/uOval gestreckt.
 * Ein Fleck, der senkrecht schneller ausklingt, wirkt breiter: genau das
 * misst das Achsenverhaeltnis. */
float winkelAnisotrop(vec3 N, vec3 Z) {
  float c = clamp(dot(N, Z), -1.0, 1.0);
  float w = acos(c);
  vec3 tang = Z - N * c;                       // Laenge = sin(w)
  float lt = length(tang);
  if (lt < 1e-5 || w < 1e-5) return w;
  vec3 richtung = tang / lt;

  vec3 achse = uOben - N * dot(N, uOben);      // Koerperachse auf die Flaeche
  float la = length(achse);
  if (la < 1e-5) return w;
  float laengs = dot(richtung, achse / la);

  /* Ellipse: quer bleibt 1, laengs wird um 1/uOval gedehnt. Zwischenwerte
   * ueber laengs^2, damit die Grenzen exakt getroffen werden. */
  float dehnung = mix(1.0, 1.0 / max(uOval, 0.06), laengs * laengs);
  return w * dehnung;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(uLicht);
  vec3 H = normalize(L + V);

  float ndl = dot(N, L);
  float ndv = max(dot(N, V), 0.0);

  /* --- Der Fleck ---------------------------------------------------------
   * Begrenzte Form statt Potenzkeule: bei uWeite ist er zu Ende, nicht
   * „fast zu Ende". Siehe Kopfkommentar (a). */
  float w = winkelAnisotrop(N, H);
  float fleck = 1.0 - smoothstep(0.0, uWeite, w);

  /* Zwei Tore, beide aus dem Dossier begruendet:
   *  - Kein Glanz auf der Schattenseite. Ein Reflex ohne Licht ist ein
   *    Fehler, kein Effekt.
   *  - Kein Glanz am streifenden Rand. Dossier §7: in der beleuchteten
   *    Haelfte ist die Helligkeit ueber die ganze Breite konstant, der
   *    Randeffekt sitzt in der Schattenhaelfte — und dort gehoert der
   *    Fresnel-Rand hin, den der Materialkern schon zeichnet. Ohne dieses
   *    Tor kriecht der Fleck auf die Silhouette und frisst die Kontur,
   *    an der man die Verformung abliest. */
  float tor = smoothstep(0.0, uTorLicht, ndl) * smoothstep(0.06, uTorRand, ndv);

  vec3 zugabe = uSonne * uGlanzFarbe * (fleck * uStaerke * tor);

  /* --- Der zweite, flaue Schimmer ---------------------------------------
   * DOSSIER §7: „Ein breiter, sehr flauer Schimmer auf der
   * gegenueberliegenden oberen Flanke." Im Schnitt gemessen: 1.11 x gegen
   * 1.32 x beim Hauptfleck, rund 1.6 mal so breit. Er kommt nicht von der
   * Sonne, sondern von der Himmelskuppel — also traegt er deren Farbe. */
  vec3 gegen = normalize(vec3(-L.x, 0.90, -L.z));
  float w2 = winkelAnisotrop(N, gegen);
  float fleck2 = 1.0 - smoothstep(0.0, uWeite * uZweitBreite, w2);
  zugabe += uHimmel * uGlanzFarbe
          * (fleck2 * uStaerke * uZweit * smoothstep(0.04, uTorRand, ndv));

  outColor = vec4(zugabe, 1.0);
}`;

  /* =====================================================================
   * Huelle vermessen — jedes Bild, aus den Punkten, nicht aus PARAMS
   * =================================================================== */
  function huelleMessen(ctx) {
    const pos = ctx.surface && ctx.surface.positions;
    if (!pos || pos.length < 9) return false;

    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;
    let hx = 0, hy = -Infinity, hz = 0;
    for (let i = 0; i + 2 < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
      if (z < zMin) zMin = z; if (z > zMax) zMax = z;
      if (y > hy) { hy = y; hx = x; hz = z; }
    }
    const breite = Math.max((xMax - xMin) * 0.5 + (zMax - zMin) * 0.5, 1e-4);
    const hoehe = Math.max(yMax - yMin, 1e-4);
    S.breite = breite;
    S.hoehe = hoehe;

    /* Stauchung gegen die Ruheform 1 : 0.90 (DOSSIER §1). Beim Aufprall
     * geht das Verhaeltnis laut §3 auf 1 : 0.60 bis 1 : 0.45 — das Oval
     * folgt im selben Verhaeltnis, gedeckelt bei 0.30, weil der flachste
     * gemessene Fleck 1 : 0.35 hat und ein noch schmalerer Strich waere. */
    const verhaeltnis = hoehe / breite;
    const folge = 1 + (verhaeltnis / RUHE_VERHAELTNIS - 1) * P.ovalFolgt;
    S.oval = Math.min(Math.max(P.oval * folge, 0.30), 1.20);

    /* Die Achse, entlang der das Oval gedrueckt wird: vom Mittelpunkt zum
     * hoechsten Punkt der Huelle. Bei einem senkrechten Koerper ist das
     * die Weltachse; bei einem schief liegenden kippt das Oval mit. */
    const mx = (xMin + xMax) * 0.5, mz = (zMin + zMax) * 0.5;
    let ax = hx - mx, ay = hy - (yMin + yMax) * 0.5, az = hz - mz;
    const la = Math.hypot(ax, ay, az);
    if (la > 1e-4 && ay > 0) {
      S.oben = [ax / la, ay / la, az / la];
    } else {
      S.oben = [0, 1, 0];
    }
    return true;
  }

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

  /* renderer2.js legt ctx.licht mit Nullvektoren an und ueberlaesst das
   * Fuellen licht.js. Ein Nullvektor wird deshalb wie ein fehlender Wert
   * behandelt — sonst ist der Glanz schwarz, solange licht.js fehlt. */
  const nimm = (v, vorgabe) =>
    (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;

  /* =====================================================================
   * Eintrag 1 — Ordnung 55: nur die Absprache mit dem Materialkern
   * =================================================================== */
  G.modul({
    name: 'glanz-anmeldung',
    ordnung: 55,

    vorbereiten(gl, R, ctx) {
      /* Nur wenn dieses Modul auch wirklich zeichnen kann. Faellt der
       * Shader beim Aufbau aus, behaelt der Materialkern seinen eigenen
       * Behelfsglanz — ein Koerper ganz ohne Glanz waere schlechter als
       * ein behelfsmaessiger. */
      if (!S.bereit) return;
      const gel = R.gel || G.gel;
      if (gel && gel.wunsch) gel.wunsch.glanzMul = 0;
    },
  });

  /* =====================================================================
   * Eintrag 2 — Ordnung 70: der Fleck selbst
   * =================================================================== */
  G.modul({
    name: 'glanz',
    ordnung: 70,

    regler: [
      { key: 'weite', min: 0.05, max: 0.60, step: 0.005, wert: P.weite },
      { key: 'oval', min: 0.20, max: 1.20, step: 0.01, wert: P.oval },
      { key: 'ovalFolgt', min: 0.0, max: 2.0, step: 0.02, wert: P.ovalFolgt },
      { key: 'staerke', min: 0.0, max: 2.0, step: 0.01, wert: P.staerke },
      { key: 'zweit', min: 0.0, max: 1.0, step: 0.01, wert: P.zweit },
      { key: 'zweitBreite', min: 1.0, max: 4.0, step: 0.05, wert: P.zweitBreite },
      { key: 'torLicht', min: 0.0, max: 0.6, step: 0.01, wert: P.torLicht },
      { key: 'torRand', min: 0.0, max: 0.8, step: 0.01, wert: P.torRand },
    ],

    aufbau(gl, R) {
      S.prog = G.programm(gl, VS, FS, 'schleim/glanz');
      S.bereit = true;
    },

    vorbereiten(gl, R, ctx) {
      if (!S.bereit) return;
      /* Regler uebernehmen, falls das Tuning-Panel sie verstellt hat. */
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];
      huelleMessen(ctx);
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit) return;

      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) mesh = S.mesh = eigenesNetz(gl, ctx.surface);
      if (!mesh || !mesh.vao) return;

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      gl.bindVertexArray(mesh.vao);

      /* Huelle hochladen, falls in diesem Bild noch niemand sonst es getan
       * hat. Ein ausgelassener Upload kostet ein Bild Verzug — und dann
       * sitzt der Fleck auf der Form von gestern. */
      if (ctx.surface && S.hochgeladen !== ctx.time) {
        S.hochgeladen = ctx.time;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
        if (mesh.nb) {
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.normals);
        }
      }

      const licht = ctx.licht || {};
      const richtung = nimm(licht.richtung, nimm(R.light, [0.55, 0.78, 0.32]));
      const sonne = nimm(licht.farbe, [0.88, 0.85, 0.78]);
      const himmel = nimm(licht.himmel, nimm(licht.ambient, [0.34, 0.38, 0.47]));

      /* Die Glanzfarbe kommt aus dem Materialkern — sie ist dort schon nach
       * Fraktion UND Todeszustand aufgeloest (Eldoran blau, Ravok rot,
       * GDD 01 §8; in der Todespfuetze faellt der Glanz fast weg). Wer sie
       * hier neu herleitet, baut die Fraktionstabelle ein zweites Mal. */
      const gel = R.gel || G.gel;
      const glanzFarbe = (gel && gel.farbe && gel.farbe.glanz) || [1.0, 1.0, 1.0];
      /* glanzStaerke traegt Todeszustand und den Wunschzettel anderer
       * Module (dichteMul/glanzMul) — wird uebernommen, damit die
       * Todespfuetze auch hier nicht glaenzt. Der eigene glanzMul = 0 aus
       * Ordnung 55 gilt fuer den Materialkern, nicht fuer uns. */
      const totFaktor = gel && gel.regler && gel.regler.glanzStaerke
        ? Math.min(gel.glanzStaerke / gel.regler.glanzStaerke, 1) : 1;

      const p = S.prog;
      const u = p.u || {};
      gl.useProgram(p);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform3fv(u.uLicht, richtung);
      gl.uniform3fv(u.uSonne, sonne);
      gl.uniform3fv(u.uHimmel, himmel);
      gl.uniform3fv(u.uGlanzFarbe, glanzFarbe);
      gl.uniform3fv(u.uOben, S.oben);
      gl.uniform1f(u.uWeite, P.weite);
      gl.uniform1f(u.uOval, S.oval);
      gl.uniform1f(u.uStaerke, P.staerke * totFaktor);
      gl.uniform1f(u.uZweit, P.zweit);
      gl.uniform1f(u.uZweitBreite, P.zweitBreite);
      gl.uniform1f(u.uTorLicht, P.torLicht);
      gl.uniform1f(u.uTorRand, P.torRand);

      /* Genau der Zustand, den gel.js fuer Ordnung > 60 vorschreibt: die
       * Frontflaeche steht nach D2a im Tiefenpuffer, also LEQUAL ohne
       * Schreiben, und addiert wird Licht. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);

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
