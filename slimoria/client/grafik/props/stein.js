'use strict';
/* ===========================================================================
 * grafik/props/stein.js — Geroell und Lesesteine.
 *
 * Besitzer: Lane KARTE. Meldet sich per KARTE.typ('stein', {...}) an.
 * Diese Datei setzt KEIN Stueck: wo Steine liegen, entscheidet grafik/karte.js
 * (6.4 Lesesteine, 6.5 Felsfuesse, 6.6 Plateausaum, 6.8 Friedhof). Hier wird
 * nur beantwortet, WIE ein Stein aussieht.
 *
 * DIE AUFGABE
 *   Die Felsen aus world.js stehen heute mit einer harten Kante auf einer
 *   flachen Ebene — wie auf einem Teppich abgestellt. Geroell schliesst diese
 *   Luecke: es macht aus einer Kante einen Fuss. Deshalb liegt um jeden Fels
 *   mehr davon als im freien Feld, und deshalb steckt jeder Stein zum Teil IM
 *   Boden statt auf ihm.
 *
 * DIE GRENZEN, in dieser Reihenfolge
 *   1. Der Schleim ist die Figur (GDD 10 §69/§98). Der hoechste Stein misst
 *      0,36 Einheiten ueber Grund — ein Sechstel der Schleimhoehe. Nichts
 *      hiervon kann ihn verdecken, nichts leuchtet, nichts glaenzt, nichts
 *      bewegt sich.
 *   2. Keine Kollision. Kein Stein taucht in istFrei() oder bodenHoehe() auf.
 *      Die Arena behaelt ihre Geometrie.
 *   3. Kein Math.random, kein Date. Jede Zahl kommt aus s.zufall / s.variante
 *      (die karte.js ortsgehasht liefert) oder aus einer geschlossenen Formel
 *      ueber der Weltposition. Zwei Laeufe ergeben dasselbe Bild.
 *
 * ---------------------------------------------------------------------------
 * WAS AUS DEN REFERENZBILDERN KOMMT (ref/genshin/, gemessen, nicht vermutet)
 *
 * landschaft_wiese_mittag_figur_2560 — die Figur misst 245 px bei rund 1,8 m
 *   Koerperhoehe, also 7,4 px/m. Die losen Steine auf dem Weg vor dem Tor
 *   messen rund 40 px hoch und 105 px breit: 0,54 m hoch, 1,4 m breit.
 *   **Breite zu sichtbarer Hoehe 2,6 : 1.** Keiner ist eine Kugel; alle sind
 *   flache Platten. Ihre Unterkante ist nirgends zu sehen.
 *
 * wasser_nazuchi_strand_schaumrand_1920 — die Steine am Strandrand liegen in
 *   **Gruppen zu zwei bis vier**, die einander beruehren, nie einzeln und nie
 *   gleichmaessig verteilt. Jeder zeigt 5 bis 9 ebene Facetten mit geraden
 *   Kanten; die Silhouette ist ein Vieleck, kein Kreis.
 *
 * landschaft_dragonspine_schnee_tiefstand_4k — am Fuss des Massivs sitzt das
 *   Geroell dicht und duennt nach aussen aus. Es traegt dieselbe Farbfamilie
 *   wie der grosse Fels und ist nur eine Spur heller. Das ist der Grund, warum
 *   diese Datei ihre Albedo nicht selbst erfindet, sondern aus
 *   ctx.licht.albedo.fels nimmt: Geroell ist Bruch DIESES Felsens.
 *
 * landschaft_sumeru_wiese_see_tag_2560 — der Findling rechts im Gras zeigt nur
 *   seine obere Haelfte; die Kante Stein/Boden ist nirgends sichtbar.
 *
 * figur_xingqiu_tageslicht_schlagschatten_1920 — Steinflaechen im Licht liegen
 *   bei rund 0,80, im vollen Schlagschatten bei 0,55 (Verhaeltnis 0,68). Die
 *   blosse abgewandte Seite faellt weit weniger ab. Deckt sich mit
 *   PHASE-GRAFIK-PLAN G3/G4: Halblambert, Schatten zu Licht 0,82…0,88,
 *   Schatten waermer statt kuehler.
 *
 * ---------------------------------------------------------------------------
 * DARAUS DIE ZAHLEN
 *   sichtbare Hoehe   0,36 * groesse   (groesse laeuft in karte.js bis 0,99)
 *   Breite            1,10 * groesse   → rund 3 : 1, flache Platte
 *   im Boden          rund ein Sechstel der Gesamthoehe, plus Neigungsreserve
 *   Facetten          20 Dreiecke je Stein, eben, mit geraden Kanten
 *   Material          identisch mit dem Fels aus boden.js — dieselbe Albedo,
 *                     dieselbe Rampe, derselbe Umgebungsfaktor
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || !KARTE || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[stein] grafik/karte.js ist nicht geladen — Typ "stein" bleibt aus.');
    }
    return;
  }

  /* =======================================================================
   * 1. Gestalt
   *
   * Grundkoerper ist ein Ikosaeder: 12 Ecken, 20 ebene Dreiecke. Das ist
   * genau die Facettenzahl, die in wasser_nazuchi_strand am Einzelstein
   * abzuzaehlen ist (5 bis 9 sichtbar, also rund die Haelfte von 20), und es
   * ist die billigste Form mit ECKIGER Silhouette. Eine Icosphere hoeherer
   * Stufe waere ein Kiesel — rund, glatt, fotografisch. Genau das verbietet
   * GRAFIK-MODULE.md §0: die Silhouette traegt die Lesbarkeit.
   *
   * Die zwoelf Ecken werden je Variante verschieden weit nach aussen
   * gerueckt. Aus einem einzigen Netz entstehen so acht verschieden
   * gebrochene Bloecke; welche Variante ein Stueck bekommt, sagt s.variante.
   * ===================================================================== */

  const VARIANTEN = 8;
  const R_MIN = 0.78, R_MAX = 1.22;          // Spanne der Eckradien
  const EINSINK = 0.30;                      // Mitte liegt EINSINK*halbHoch ueber Grund

  function ikosaeder() {
    if (typeof createIcosphere === 'function') {
      const m = createIcosphere(0);
      return { pos: m.positions, idx: m.indices };
    }
    const t = (1 + Math.sqrt(5)) / 2;
    const roh = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    const pos = new Float32Array(36);
    for (let i = 0; i < 12; i++) {
      const v = roh[i], l = Math.hypot(v[0], v[1], v[2]);
      pos[i * 3] = v[0] / l; pos[i * 3 + 1] = v[1] / l; pos[i * 3 + 2] = v[2] / l;
    }
    const idx = new Uint16Array([
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    ]);
    return { pos, idx };
  }

  /* Die acht Bruchformen. Kein Zufallsgenerator, sondern eine geschlossene
   * Formel ueber Eckposition und Variantennummer: drei Sinusglieder mit
   * teilerfremden Frequenzen. Dasselbe Ergebnis in jedem Lauf, auf jeder
   * Maschine, und im Quelltext nachrechenbar. */
  function formtabelle(pos) {
    const f = new Float32Array(VARIANTEN * 3 * 4);
    for (let v = 0; v < VARIANTEN; v++) {
      const r = new Float64Array(12);
      for (let e = 0; e < 12; e++) {
        const x = pos[e * 3], y = pos[e * 3 + 1], z = pos[e * 3 + 2];
        const a = x * 4.1 + y * 2.3 + z * 5.7 + v * 2.399963;
        const b = x * 2.7 - y * 5.1 + z * 3.3 - v * 1.117021;
        const q = 1 + 0.155 * Math.sin(a) + 0.105 * Math.sin(b)
                    + 0.062 * Math.sin(a * 1.9 + b * 0.7);
        r[e] = q < R_MIN ? R_MIN : (q > R_MAX ? R_MAX : q);
      }
      /* Jede zweite Variante bekommt oben eine waagerechte Bruchkante: die
       * beiden hoechsten Ecken auf dieselbe Hoehe. Nach dem Flachdruecken
       * liest sich das als abgeschlagene Platte statt als Klumpen — die
       * haeufigste Form in wasser_nazuchi_strand. */
      if ((v & 1) === 0) {
        let e0 = 0, e1 = 1;
        for (let e = 0; e < 12; e++) {
          const h = pos[e * 3 + 1] * r[e];
          if (h > pos[e0 * 3 + 1] * r[e0]) { e1 = e0; e0 = e; }
          else if (e !== e0 && h > pos[e1 * 3 + 1] * r[e1]) { e1 = e; }
        }
        const m = (r[e0] + r[e1]) * 0.5;
        r[e0] = m; r[e1] = m;
      }
      for (let e = 0; e < 12; e++) f[(v * 3 + (e >> 2)) * 4 + (e & 3)] = r[e];
    }
    return f;
  }

  /* =======================================================================
   * 2. Material — dasselbe wie der Fels, nicht ein eigenes
   *
   * Der Lichtteil ist absichtlich Zeile fuer Zeile derselbe wie in
   * grafik/boden.js (FS_FELS). Das ist kein Abschreiben aus Bequemlichkeit,
   * sondern die eigentliche Aufgabe: Geroell soll als BRUCH DES FELSENS
   * lesbar sein, nicht als zweites Material daneben. Weichen Rampe,
   * Hoehenverlauf oder Umgebungsfaktor auch nur leicht ab, liegen am Fuss
   * jedes Findlings zwei verschiedene Steinsorten.
   *
   * Uebernommen:
   *   G3  Halblambert (Baustein 'halblambert' aus glsl.js).
   *   G3  Albedo aus ctx.licht.albedo.fels — nicht selbst erfunden.
   *   G4  Schattenrampe aus rampe.js, Zeile 'fels', ueber R.rampe.
   *       Faellt rampe.js aus, rechnet der Shader Halblambert weiter.
   *   G4  Umgebungslicht MULTIPLIKATIV ganz am Ende (uUmgebung), berechnet
   *       wortgleich mit rampe.js/vorbereiten und boden.js/rampeLeihen.
   *   G6  Senkrechte Rampe unten * (0.64, 0.70, 0.77): R faellt staerker als
   *       B, die untere Partie wird also relativ blauer.
   *   G6  Kontaktband: unterste Spanne 13 % unter dem Eigenwert.
   *
   * ABWEICHUNG, und zwar bewusst: KEIN Glanzlicht. boden.js gibt Fels und
   * Mauer die harte Glanzstufe aus G4. Auf 493 handtellergrossen Steinen
   * waeren das 493 flimmernde Punkte im Bild — genau das, was GDD 10 §98
   * verbietet. Ein Fels traegt eine Glanzstufe, ein Kiesel traegt keine.
   * ===================================================================== */

  function vsQuelle() {
    return `#version 300 es
layout(location = 0) in vec3 aPos;      // Ikosaederecke auf der Einheitskugel
layout(location = 1) in float aEcke;    // Eckennummer 0..11, Schluessel in uForm
layout(location = 2) in vec3 iPos;      // Weltmittelpunkt des Steins
layout(location = 3) in vec3 iM0;       // Spalten von Neigung * Drehung * Groesse
layout(location = 4) in vec3 iM1;
layout(location = 5) in vec3 iM2;
layout(location = 6) in float iVar;     // Formvariante 0..${VARIANTEN - 1}
layout(location = 7) in vec3 iTon;      // Tonstreuung, Faktor um 1,0

uniform mat4 uViewProj;
uniform vec4 uForm[${VARIANTEN * 3}];

out vec3 vWelt;
out vec3 vAussen;    // Mitte -> Ecke; dient als glatte Normale und als Vorzeichen
out vec3 vTon;
out float vHoch;     // 0 an der Bodenlinie, 1 an der Oberkante

void main() {
  int e = int(aEcke + 0.5);
  int v = int(iVar + 0.5);
  vec4 blk = uForm[v * 3 + (e >> 2)];
  int c = e & 3;
  float r = c == 0 ? blk.x : (c == 1 ? blk.y : (c == 2 ? blk.z : blk.w));

  vec3 lok = aPos * r;
  vec3 p = iM0 * lok.x + iM1 * lok.y + iM2 * lok.z;

  vWelt = iPos + p;
  vAussen = p;
  vTon = iTon;
  /* Die Mitte liegt ${EINSINK} halbe Hoehen ueber Grund, der Stein steckt also
   * unten im Boden. Gemessen wird der Hoehenverlauf ueber die SICHTBARE
   * Spanne — sonst laege das Kontaktband unter der Erde. */
  vHoch = clamp((lok.y + ${EINSINK.toFixed(2)}) / (${R_MAX.toFixed(2)} + ${EINSINK.toFixed(2)}), 0.0, 1.0);
  gl_Position = uViewProj * vec4(vWelt, 1.0);
}`;
  }

  function fsQuelle(baustein) {
    return `#version 300 es
precision highp float;
${baustein}

in vec3 vWelt;
in vec3 vAussen;
in vec3 vTon;
in float vHoch;

uniform vec3  uLichtRichtung;
uniform vec3  uSonne;
uniform vec3  uHimmelLicht;
uniform vec3  uBodenLicht;
uniform vec3  uOben;          // Albedo an der Oberkante (Fels)
uniform vec3  uUnten;         // Albedo an der Bodenlinie
uniform float uExponent;
uniform float uKontaktObj;
uniform float uGlatt;         // Anteil glatter Normale, siehe unten

uniform sampler2D uRampe;
uniform float uRampeAn;       // 1 = rampe.js liefert die Textur
uniform float uRampZeile;
uniform float uLichtFlaeche;
uniform float uRampBreite;
uniform vec3  uUmgebung;

out vec4 outColor;

void main() {
  /* Die Flaechennormale kommt aus den Ableitungen der Weltposition. Damit ist
   * jede der 20 Facetten wirklich eben, ohne dass dafuer 60 statt 12 Ecken im
   * Puffer liegen muessten. vAussen zeigt von der Steinmitte nach aussen und
   * legt das Vorzeichen fest — so haengt nichts an der Wickelrichtung. */
  vec3 flach = normalize(cross(dFdx(vWelt), dFdy(vWelt)));
  vec3 glatt = normalize(vAussen);
  if (dot(flach, glatt) < 0.0) flach = -flach;

  /* Rein ebene Facetten legen die Schattenkante exakt auf eine Dreieckskante.
   * Das ist eine Treppe, die keine Kantenglaettung mehr erwischt: beide
   * Dreiecke decken voll, MSAA sieht dort gar keine Kante. Ein Drittel glatte
   * Normale gibt der Kante die Flanke von ein bis zwei Pixeln, die Plan G4
   * verlangt, und kostet die Facettenwirkung nicht. */
  vec3 N = normalize(mix(flach, glatt, uGlatt));
  vec3 L = normalize(uLichtRichtung);

  /* G6: senkrechte Rampe. Unten faellt Rot staerker als Blau, die untere
   * Partie wird also relativ blauer — als reine Abdunklung waere der Effekt
   * wertlos. Waagerechte Flaechen bekommen den oberen Ton: sie sehen den
   * Himmel. */
  float hp = clamp(vHoch, 0.0, 1.0);
  vec3 albedo = mix(uUnten, uOben, pow(hp, uExponent));
  albedo = mix(albedo, uOben, max(N.y, 0.0) * 0.25);

  /* Facettenton. Ein Fels ist gross genug, dass ihn allein der Hoehenverlauf
   * gliedert; ein handtellergrosser Stein misst zwanzig Bildpunkte und faellt
   * ohne diesen Schritt zu EINER Flaeche zusammen — der Haufen am Felsfuss
   * wird dann ein einziger heller Fleck statt vieler Steine. Es ist bewusst
   * eine Modulation der OBJEKTFARBE, kein zweites Licht: die Zweistufigkeit
   * aus G4 bleibt unangetastet, die Facetten bekommen nur je einen eigenen
   * Grundton. Spanne 14 Prozent — an Genshin gemessen liegen die Steine EINES
   * Haufens gut zehn Prozent auseinander. */
  albedo *= mix(0.91, 1.05, N.y * 0.5 + 0.5);

  /* G6: Kontaktband am Objekt selbst. Ohne dieses Band schwimmt jeder Stein
   * auf der Ebene, auch wenn er geometrisch darin steckt. */
  albedo *= 1.0 - uKontaktObj * (1.0 - smoothstep(0.0, 0.16, hp));
  albedo *= vTon;

  /* G4: der Griff in die Rampentextur steht AUSSERHALB jeder
   * Fallunterscheidung — texture() braucht die Ableitungen der
   * Nachbarfragmente, und die sind in ungleichfoermigem Kontrollfluss laut
   * GLSL ES 3.00 undefiniert. */
  float n01 = ndl01(N, L);
  float u = 1.0 - (((uLichtFlaeche - n01) / uLichtFlaeche) / uRampBreite);
  vec3 gelesen = texture(uRampe, vec2(clamp(u, 0.0, 1.0), uRampZeile)).rgb;
  vec3 stufe = (n01 >= uLichtFlaeche) ? vec3(1.0) : gelesen;

  vec3 mitRampe  = albedo * stufe * uUmgebung;
  vec3 ohneRampe = albedo * (halbraumLicht(N, uHimmelLicht, uBodenLicht) + uSonne * n01);
  outColor = vec4(mix(ohneRampe, mitRampe, uRampeAn), 1.0);
}`;
  }

  /* =======================================================================
   * 3. Aufbau
   * ===================================================================== */

  const FLOATS = 16;                     // pro Instanz: 3 Ort + 9 Matrix + 1 Variante + 3 Ton
  const RAMPE_EINHEIT_NOT = 5;

  const Z = {
    prog: null, vao: null, count: 0, form: null,
    puffer: null, instanz: null, anzahl: 0, gebaut: false,
  };

  function netzAufbauen(gl) {
    const iko = ikosaeder();
    Z.form = formtabelle(iko.pos);

    const baustein = (typeof GRAFIK !== 'undefined' && typeof GRAFIK.baustein === 'function')
      ? GRAFIK.baustein('halblambert')
      /* Notnagel, falls glsl.js fehlt: dieselben zwei Funktionen, wortgleich. */
      : 'float ndl01(vec3 N, vec3 L) { return dot(N, L) * 0.5 + 0.5; }\n'
      + 'vec3 halbraumLicht(vec3 N, vec3 h, vec3 b) { return mix(b, h, N.y * 0.5 + 0.5); }';

    Z.prog = GRAFIK.programm(gl, vsQuelle(), fsQuelle(baustein), 'stein');

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, iko.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const ecken = new Float32Array(12);
    for (let i = 0; i < 12; i++) ecken[i] = i;
    const eb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, eb);
    gl.bufferData(gl.ARRAY_BUFFER, ecken, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

    Z.puffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Z.puffer);
    const schritt = FLOATS * 4;
    for (const [ort, breite, versatz] of
         [[2, 3, 0], [3, 3, 12], [4, 3, 24], [5, 3, 36], [6, 1, 48], [7, 3, 52]]) {
      gl.enableVertexAttribArray(ort);
      gl.vertexAttribPointer(ort, breite, gl.FLOAT, false, schritt, versatz);
      gl.vertexAttribDivisor(ort, 1);
    }

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, iko.idx, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    Z.vao = vao;
    Z.count = iko.idx.length;
  }

  /* =======================================================================
   * 4. Die Instanzen
   *
   * Ein Stueck aus karte.js wird zu einem HAUFEN aus einem Hauptstein und
   * null bis zwei Trabanten. Grund steht im Referenzblock oben: in Genshin
   * liegen Steine in Gruppen zu zwei bis vier, nie einzeln und nie
   * gleichmaessig gestreut.
   *
   * Der Haufen ist ausserdem der einzige Weg, "um die grossen Felsen herum
   * dichter" zu erfuellen, ohne die Platzierung aus karte.js anzufassen: am
   * Fels bekommt ein Stueck bis zu zwei Trabanten, im freien Feld hoechstens
   * einen. 172 der 206 Stuecke liegen an einem Hindernisfuss — dort verdoppelt
   * sich die Dichte, im Feld bleibt sie duenn.
   *
   * Die Trabanten weichen VOM naechsten Hindernis weg; sonst wandert einer in
   * den Fels und steht mit halbem Leib in der Wand.
   * ===================================================================== */

  function nahesHindernis(welt, x, z) {
    let d = Infinity, hx = 0, hz = 0;
    const hind = (welt && welt.obstacles) || [];
    for (let i = 0; i < hind.length; i++) {
      const o = hind[i];
      let e;
      if (o.type === 'rock') {
        e = Math.hypot(x - o.x, z - o.z) - o.r;
      } else {
        const dx = Math.max(Math.abs(x - o.x) - o.w * 0.5, 0);
        const dz = Math.max(Math.abs(z - o.z) - o.d * 0.5, 0);
        e = Math.hypot(dx, dz);
      }
      if (e < d) { d = e; hx = o.x; hz = o.z; }
    }
    return { d, x: hx, z: hz };
  }

  /* Niederfrequente Schwankung ueber der Weltposition. s.zufall ist
   * ortsgehasht und damit von Stueck zu Stueck unkorreliert — daraus wird ein
   * gleichmaessig gepudertes Band um den Fels, eine Perlenkette. Am echten
   * Felsfuss liegt das Geroell in Nestern mit Luecken dazwischen
   * (landschaft_dragonspine, der Saum unter dem Massiv). Diese Funktion
   * liefert genau diese Nester: eine Wellenlaenge von rund 3 Metern, also
   * zwei bis drei Stuecke breit. */
  function nest(x, z) {
    return 0.5 + 0.5 * (0.62 * Math.sin(x * 2.11 + z * 0.83)
                      + 0.38 * Math.sin(x * 0.97 - z * 2.41 + 1.7));
  }

  function bauen(gl, ctx, stuecke) {
    const welt = (ctx && ctx.welt) || (typeof WELT !== 'undefined' ? WELT : { obstacles: [] });
    const boden = (typeof bodenHoehe === 'function') ? bodenHoehe : null;

    const daten = [];

    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const g = s.groesse || 1;
      const zf = s.zufall || [0.5, 0.5, 0.5, 0.5];
      const nah = nahesHindernis(welt, s.x, s.z);
      const amFels = nah.d < 1.2;

      /* Nest mal Wuerfel: am Fels null bis zwei Trabanten, im Feld null oder
       * einer — und beides in Gruppen statt gleichverteilt. */
      const dichte = nest(s.x, s.z) * (amFels ? 1.35 : 0.72);
      const trab = zf[0] < dichte - 0.55 ? 2 : (zf[0] < dichte ? 1 : 0);

      /* Fluchtrichtung: vom Hindernis weg. Ohne Hindernis in Reichweite
       * genuegt die Drehung des Stuecks als Richtung. */
      let fx = s.x - nah.x, fz = s.z - nah.z;
      const fl = Math.hypot(fx, fz);
      if (!(fl > 1e-3)) { fx = Math.cos(s.drehung); fz = Math.sin(s.drehung); }
      else { fx /= fl; fz /= fl; }

      /* Tonstreuung. In landschaft_wiese_mittag_figur_2560 misst der besonnte
       * Findling neben dem Tor (171,180,179), der Haufen am Klippenfuss
       * (130,142,128), die Felswand darueber (109,125,138) — innerhalb EINES
       * Haufens liegen also gut zehn Prozent zwischen hellstem und dunkelstem
       * Stein. Ohne diese Streuung wird der Saum am Fels eine einzige
       * geschlossene Flaeche statt vieler Steine.
       * Geroell am Fels bleibt naeher beisammen (es ist Bruch DIESES Blocks),
       * Lesesteine im freien Feld duerfen weiter auseinanderliegen. Unbunt
       * bleibt beides: Genshins Steine sind es auch. */
      const spanne = amFels ? 0.090 : 0.125;
      const ton = [
        1 + (zf[2] - 0.5) * 2 * spanne + (zf[1] - 0.5) * 0.035,
        1 + (zf[2] - 0.5) * 2 * spanne,
        1 + (zf[2] - 0.5) * 2 * spanne - (zf[1] - 0.5) * 0.030,
      ];

      hinzu(daten, s.x, s.z, s.y, g, s.drehung, s.variante, zf, ton);

      for (let t = 0; t < trab; t++) {
        const u0 = ((s.variante >> (t * 3)) & 7) / 8 + zf[(t + 1) & 3] * 0.125;
        const u1 = zf[(t + 2) & 3];
        const u2 = zf[(t + 3) & 3];
        /* Hoechstens 62 Grad zur Seite der Fluchtrichtung: der Trabant bleibt
         * auf der dem Fels abgewandten Haelfte. */
        const w = (u0 - 0.5) * 2.16 + (t === 1 ? 1.05 : -0.35);
        const cw = Math.cos(w), sw = Math.sin(w);
        const rx = fx * cw - fz * sw, rz = fx * sw + fz * cw;
        const ab = (0.50 + 0.42 * u1) * g;
        const tx = s.x + rx * ab, tz = s.z + rz * ab;
        const tg = g * (0.40 + 0.30 * u2);
        const ty = boden ? boden(tx, tz) : s.y;
        const tton = [ton[0] * (0.98 + 0.04 * u2), ton[1] * (0.98 + 0.04 * u2),
                      ton[2] * (0.98 + 0.04 * u2)];
        hinzu(daten, tx, tz, ty, tg, s.drehung + 1.7 + w,
              (s.variante + 37 * (t + 1)) & 255, [u1, u2, u0, zf[3]], tton);
      }
    }

    const feld = new Float32Array(daten.length * FLOATS);
    for (let i = 0; i < daten.length; i++) feld.set(daten[i], i * FLOATS);

    gl.bindBuffer(gl.ARRAY_BUFFER, Z.puffer);
    gl.bufferData(gl.ARRAY_BUFFER, feld, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    Z.anzahl = daten.length;
    Z.instanz = feld;
  }

  /* Ein Stein: Groesse, Drehung, Neigung, Einsinktiefe, Ton.
   *
   * MASSE — hier haengt die Lesbarkeitsregel dran:
   *   halbHoch  = 0,25 * groesse
   *   halbBreit = 0,45 * groesse, dazu flaechentreue Streckung 0,80…1,25
   *   Die Mitte liegt bei boden + ${EINSINK} * halbHoch.
   *
   *   Oberkante ueber Grund = 0,25 * (0,30 + 1,22) = 0,380 * groesse. Bei der
   *   groessten Groesse aus karte.js (0,991) sind das 0,377 Einheiten — ein
   *   Sechstel der Schleimhoehe und weit unter der Schranke 2,0 aus
   *   karte.js §0. Die Registerzusage "stein hoechstens 0,4" ist gehalten.
   *
   *   Breite = 2 * 0,45 * 1,22 = 1,10 * groesse. Zur sichtbaren Hoehe also
   *   2,9 : 1; an Genshin gemessen waren es 2,6 : 1.
   *
   * NEIGUNG hoechstens 0,18 rad, und das ist gerechnet, nicht geschaetzt:
   *   Im Boden stecken halbHoch * (R_MIN − EINSINK) = 0,25 * 0,48
   *                  = 0,120 * groesse.
   *   Die hochstehende Kante hebt sich um sin(0,18) * halbBreit_max
   *                  = 0,179 * 0,45 * 1,25 = 0,101 * groesse.
   *   0,101 < 0,120 — der Stein bleibt unten geschlossen. Bei 0,25 rad
   *   schwebt er.
   */
  function hinzu(aus, x, z, y, g, drehung, variante, zf, ton) {
    const halbHoch = 0.25 * g;
    const streck = 0.80 + 0.45 * zf[0];
    const bx = 0.45 * g * streck;
    const bz = 0.45 * g / streck;

    const c = Math.cos(drehung), sn = Math.sin(drehung);

    // A = Ry * S  (erst Groesse, dann Drehung um Y)
    const a00 = c * bx, a02 = sn * bz;
    const a11 = halbHoch;
    const a20 = -sn * bx, a22 = c * bz;

    // T = Neigung um eine waagerechte Achse (ux, 0, uz), Rodrigues
    const kipp = 0.05 + 0.13 * zf[3];
    const achse = zf[2] * Math.PI * 2;
    const ux = Math.cos(achse), uz = Math.sin(achse);
    const ck = Math.cos(kipp), sk = Math.sin(kipp), vk = 1 - ck;
    const t00 = ck + vk * ux * ux, t01 = -sk * uz, t02 = vk * ux * uz;
    const t10 = sk * uz, t11 = ck, t12 = -sk * ux;
    const t20 = vk * ux * uz, t21 = sk * ux, t22 = ck + vk * uz * uz;

    // M = T * A, spaltenweise abgelegt (iM0 ist die erste Spalte von M)
    aus.push([
      x, y + halbHoch * EINSINK, z,
      t00 * a00 + t02 * a20, t10 * a00 + t12 * a20, t20 * a00 + t22 * a20,
      t01 * a11, t11 * a11, t21 * a11,
      t00 * a02 + t02 * a22, t10 * a02 + t12 * a22, t20 * a02 + t22 * a22,
      variante % VARIANTEN,
      ton[0], ton[1], ton[2],
    ]);
  }

  /* =======================================================================
   * 5. Das Material je Bild besorgen
   *
   * Wortgleich mit boden.js/rampeLeihen — mit Absicht. Liefe der
   * Umgebungsfaktor auseinander, staenden Fels und Geroell nebeneinander bei
   * verschiedener Belichtung, und das faellt sofort auf.
   * ===================================================================== */

  const NOT_FELS = [0.845, 0.855, 0.851];      // licht.js ALBEDO.fels
  const RAMPE_U = [0.64, 0.70, 0.77];          // boden.js VORGABE.rampeR/G/B
  const _umg = new Float32Array(3);
  const _oben = new Float32Array(3);
  const _unten = new Float32Array(3);

  function material(gl, R, ctx) {
    const li = ctx.licht || {};
    const alb = (li.albedo && li.albedo.fels) || NOT_FELS;

    /* KEIN eigener Grundton. Gemessen an landschaft_wiese_mittag_figur_2560
     * liegen Felswand (109,125,138), Geroellhaufen am Fuss (130,142,128) und
     * besonnter Findling (171,180,179) im selben Band — der Unterschied kommt
     * dort aus der Lage zum Licht, nicht aus einer anderen Farbe. Geroell
     * bekommt deshalb exakt die Albedo des Felsens; auseinander gehen die
     * Steine ueber vTon, ueber den Hoehenverlauf und ueber die Neigung. */
    for (let i = 0; i < 3; i++) {
      _oben[i] = alb[i];
      _unten[i] = _oben[i] * RAMPE_U[i];
    }

    const erg = {
      einheit: RAMPE_EINHEIT_NOT, an: 0,
      lichtFlaeche: 0.55, rampBreite: 1.0, zeile: 0,
    };
    _umg[0] = 1; _umg[1] = 1; _umg[2] = 1;

    const rp = R.rampe;
    if (!rp || !rp.tex || typeof rp.v !== 'function') return erg;

    const w = (ctx.regler && ctx.regler.rampe) || null;
    const hole = (k, vor) => (w && w[k] !== undefined && w[k] !== null) ? w[k] : vor;

    erg.einheit = (rp.einheit === undefined) ? RAMPE_EINHEIT_NOT : rp.einheit;
    gl.activeTexture(gl.TEXTURE0 + erg.einheit);
    gl.bindTexture(gl.TEXTURE_2D, rp.tex.tex || rp.tex);

    erg.lichtFlaeche = Math.max(hole('lichtFlaeche', 0.55), 0.01);
    erg.rampBreite = Math.max(hole('rampBreite', 1.0), 0.01);
    erg.zeile = rp.v('fels');

    const st = (li.staerke === undefined ? 1 : li.staerke) * hole('sonne', 1.0);
    const a = hole('umgebung', 1.0) * 0.5;
    _umg[0] = li.farbe[0] * st + (li.himmel[0] + li.boden[0]) * a;
    _umg[1] = li.farbe[1] * st + (li.himmel[1] + li.boden[1]) * a;
    _umg[2] = li.farbe[2] * st + (li.himmel[2] + li.boden[2]) * a;

    erg.an = 1;
    return erg;
  }

  /* =======================================================================
   * 6. Anmeldung
   * ===================================================================== */

  KARTE.typ('stein', {
    /* Frueh: Geroell liegt am Boden, Bueschel und Farn wachsen darueber.
     * Bei undurchsichtigen Flaechen mit Tiefentest entscheidet die
     * Reihenfolge nichts — sie sagt nur, was gemeint ist. */
    schicht: 10,

    aufbau(gl) {
      netzAufbauen(gl);
    },

    vorbereiten(gl, R, ctx, stuecke) {
      if (Z.gebaut) return;
      bauen(gl, ctx, stuecke);
      Z.gebaut = true;
    },

    zeichnen(gl, R, ctx) {
      if (!Z.anzahl || !Z.prog) return;

      const m = material(gl, R, ctx);
      const li = ctx.licht || {};

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const p = Z.prog;
      gl.useProgram(p);
      gl.bindVertexArray(Z.vao);

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform4fv(p.u.uForm, Z.form);
      gl.uniform3fv(p.u.uLichtRichtung, li.richtung || R.light || [0.55, 0.78, 0.32]);
      gl.uniform3fv(p.u.uSonne, li.farbe || [0.88, 0.85, 0.78]);
      gl.uniform3fv(p.u.uHimmelLicht, li.ambientOben || li.himmel || [0.34, 0.38, 0.47]);
      gl.uniform3fv(p.u.uBodenLicht, li.ambientUnten || li.boden || [0.27, 0.26, 0.23]);
      gl.uniform3fv(p.u.uOben, _oben);
      gl.uniform3fv(p.u.uUnten, _unten);
      gl.uniform1f(p.u.uExponent, 0.80);
      gl.uniform1f(p.u.uKontaktObj, 0.13);
      gl.uniform1f(p.u.uGlatt, 0.34);
      gl.uniform1i(p.u.uRampe, m.einheit);
      gl.uniform1f(p.u.uRampeAn, m.an);
      gl.uniform1f(p.u.uRampZeile, m.zeile);
      gl.uniform1f(p.u.uLichtFlaeche, m.lichtFlaeche);
      gl.uniform1f(p.u.uRampBreite, m.rampBreite);
      gl.uniform3fv(p.u.uUmgebung, _umg);

      gl.drawElementsInstanced(gl.TRIANGLES, Z.count, gl.UNSIGNED_SHORT, 0, Z.anzahl);

      gl.bindVertexArray(null);
    },
  });

  /* Diagnose fuer die Aufnahmewerkzeuge. */
  if (typeof window !== 'undefined') {
    window.STEIN_STAND = () => {
      let hoch = 0;
      for (let i = 0; i < Z.anzahl; i++) {
        // iM1.y (Feld 7) ist halbHoch mal cos(Neigung); die Oberkante ueber
        // Grund ist halbHoch * (EINSINK + groesster Eckradius).
        const h = Math.abs(Z.instanz[i * FLOATS + 7]) * (EINSINK + R_MAX);
        if (h > hoch) hoch = h;
      }
      return {
        instanzen: Z.anzahl,
        dreiecke: Z.anzahl * 20,
        varianten: VARIANTEN,
        hoechsterUeberGrund: Math.round(hoch * 1000) / 1000,
      };
    };
  }

})();
