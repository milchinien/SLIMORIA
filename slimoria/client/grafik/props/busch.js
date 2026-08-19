'use strict';
/* ---------------------------------------------------------------------------
 * Phase Grafik — Ausstattungstyp `busch`: Buesche und niedriges Gestruepp.
 *
 * Besitzer: Lane KARTE. Vertrag: GRAFIK-MODULE.md §3 und der Typvertrag aus
 * grafik/karte.js §4. Diese Datei meldet EINEN Typ an und zeichnet ihn; sie
 * setzt kein einziges Stueck und weiss nicht, wo Buesche stehen — das
 * entscheidet karte.js.
 *
 * Aufgabe laut Auftrag: die Fuesse von Felsen, Mauern und Baeumen fuellen,
 * damit nichts wie hingestellt wirkt. Halbkugelige Silhouette, unten dunkler,
 * leichte Windbewegung.
 *
 * ---------------------------------------------------------------------------
 * DIE DREI GRENZEN, an denen diese Datei gemessen wird
 *
 * 1. DER SCHLEIM IST DIE FIGUR (GDD 10 §69/§98). Ein Busch ist so hoch wie
 *    `groesse` und keinen Millimeter hoeher — auch nicht durch Lappen, auch
 *    nicht durch Wind. Der Beweis steht im Vertex-Shader: die Lappenskalierung
 *    wird fuer die Hoehe mit min(r, 1.0) geklemmt, der Wind verschiebt
 *    ausschliesslich in xz. karte.js gibt innerhalb der Arena hoechstens 0,85;
 *    der Schleim ist bei Level 1 zwei Einheiten hoch. Ein Busch reicht ihm
 *    also bis knapp unter die Mitte und kann ihn nie verdecken.
 * 2. KEINE KOLLISION. Diese Datei liest world.js nicht einmal. Sie zeichnet,
 *    wo karte.js Stuecke hingelegt hat, und nirgends sonst.
 * 3. KOSTEN. Ein Zeichenaufruf fuer alle Buesche (Instanzierung), 160 Dreiecke
 *    je Stueck, keine Textur, kein Alphatest, kein zweiter Durchgang.
 *    Tragbare Stueckzahl siehe Abschnitt 5 am Ende der Datei.
 *
 * ---------------------------------------------------------------------------
 * DIE ZAHLEN — an ref/genshin/ gemessen, nicht geschaetzt
 *
 * Werkzeug: Pixelproben ueber getImageData (5x5-Mittel), sRGB-Codewerte 0..255,
 * dieselbe Rechnung wie tools/grafikmass.mjs.
 *
 * FORM. `landschaft_wiese_mittag_figur_2560.png`, das Polster am Felsfuss
 * rechts (Bildbereich x 1930..2160, y 1185..1240):
 *     Breite 230 px, Hoehe 52 px  ->  Verhaeltnis Breite:Hoehe = 4,4 : 1
 * `landschaft_sumeru_dorf_tag_2560.png`, der bluehende Strauch hinter dem
 * Gelaender (x 410..720, y 830..963):
 *     Breite 310 px, Hoehe 133 px ->  2,3 : 1
 * `landschaft_sumeru_wiese_see_tag_2560.png`, die Kuppen am Hang:
 *     rund 2,0 : 1
 * => Genshins Buesche sind BREIT UND FLACH, nicht kugelig. Das ist kein
 *    Geschmack, das ist der Grund, warum sie eine Figur nie verdecken. Deshalb
 *    hier: Breite = 1,7 bis 3,1 mal Hoehe, kleine Buesche relativ breiter als
 *    grosse (BREIT_KLEIN / BREIT_GROSS weiter unten).
 *
 * ANZAHL DER FORMTEILE. Im Nahbild (`landschaft_sumeru_dorf`, 3fach vergroessert)
 * traegt die Silhouette rund fuenf grosse Ballen; die Blattzacken darauf sind
 * 5..8 % der Buschhoehe hoch. In 8 m Entfernung ist ein 0,85 hoher Busch bei
 * fovY 50° und H = 900 rund 0,85/8 * 965 = 103 px hoch, eine Zacke davon also
 * 5..8 px. Deshalb: drei grosse Lappen (tragen die Silhouette) plus eine
 * flache Randkerbung mit fuenf Perioden (traegt die Zacken). Kein einziges
 * Blatt als Geometrie — bei 5 px waere es Rauschen, kein Detail.
 *
 * FARBE. Dieselbe Datei, Sonnenlicht, sRGB/255:
 *     beleuchtete Oberseite  (102,192, 81) = (0.400, 0.753, 0.318)
 *     beschatteter Fuss      ( 50,112, 49) = (0.196, 0.439, 0.192)
 *     Wiese ringsum          (129,194, 93) = (0.506, 0.761, 0.365)
 * `landschaft_sumeru_dorf`, Strauch im Gebaeudeschatten:
 *     Oberseite ( 66,147, 81)   Fuss ( 27, 82, 42)
 * Zwei Befunde, beide gegen die naheliegende Vermutung:
 *   a) Der Busch ist DUNKLER und SATTER als das Gras daneben (Rot 0,79fach,
 *      Gruen 0,99fach, Blau 0,87fach). Wer ihn heller macht als die Wiese,
 *      bekommt Watte statt Gestruepp.
 *   b) Der Fuss ist rund die HAELFTE der Oberseite (0,49/0,58/0,60 bzw.
 *      0,41/0,56/0,52). Das ist ein starker Gang und der eigentliche Grund,
 *      warum ein Genshin-Busch auf dem Boden steht statt darauf zu schweben.
 *      Bei Gras ist es genau umgekehrt (siehe Kopf von grafik/gras.js:
 *      der Boden ist dort HELLER als die Halme) — Gras ist duenn und
 *      durchleuchtet, ein Buschballen verschattet sich selbst.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE BELEUCHTUNG WORTGLEICH AUS grafik/gras.js STAMMT
 *
 * Buesche und Grasbueschel stehen im selben Bild oft direkt uebereinander.
 * Zwei verschiedene Rampen, zwei verschiedene Schattentoene oder zwei
 * verschiedene Dunstformeln reissen dort eine Naht auf — dieselbe Falle, die
 * GRAFIK-MODULE.md fuer uNebel/uDunst beschreibt. Deshalb sind Rampe
 * (ndl01 + smoothstep, Kante 0,55, Flanke 0,05), Schattenton (0,88/0,84/0,79),
 * die halbe Einmischung der Lichtfarbe, der Gegenlichtsaum und der
 * Dunstabschluss Zeile fuer Zeile dieselben wie in gras.js. Nur die Farben und
 * die Saumstaerke sind andere — ein Buschballen leuchtet weniger durch als ein
 * Halm.
 *
 * Bewusst NICHT uebernommen: der Schattenempfang aus grafik/schatten.js. Gras
 * empfaengt heute keinen, und ein beschatteter Busch neben unbeschattetem Gras
 * faellt staerker auf als beide ohne Schatten. Kommt, wenn gras.js es tut.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein Math.random, kein Date, kein performance.now. Jede Abweichung zwischen
 * zwei Buescheln kommt aus `stueck.zufall` und `stueck.groesse`, die karte.js
 * aus der Weltposition gehasht hat; die Zeit kommt ausschliesslich aus
 * ctx.time. Zwei Aufnahmen desselben Szenarios sind damit bitgleich.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof KARTE === 'undefined' || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[busch] grafik/karte.js ist nicht geladen — Typ meldet sich nicht an.');
    }
    return;
  }

  /* ==========================================================================
   * 0. Stellschrauben
   *
   * KARTE.typ() kennt kein `regler`-Feld (siehe karte.js §4), deshalb stehen
   * die Werte hier als benannte Konstanten statt im Tuning-Panel. Jede traegt
   * ihre Herkunft.
   * ======================================================================== */
  const P = {
    /* Form ------------------------------------------------------------- */
    BREIT_KLEIN: 1.55,   // halbe Breite je Hoehe bei groesse 0,5  -> 3,1 : 1
    BREIT_GROSS: 0.95,   // dieselbe bei groesse 1,6               -> 1,9 : 1
    BREIT_STREU: 0.13,   // Streuung darauf, je Stueck
    LAPPEN: 0.80,        // Staerke der drei grossen Silhouettenlappen
    KERBE: 0.14,         // Hoehenspiel der einzelnen Ballen je Instanz
    FUSS_TIEF: 0.05,     // wie weit der Fussring unter den Boden reicht,
                         // damit keine Schnittkante auf dem Boden steht

    /* Licht — wortgleich mit grafik/gras.js -------------------------------- */
    KANTE: 0.55,
    FLANKE: 0.05,
    SCHATTEN: [0.88, 0.84, 0.79],
    SAUM_FARBE: [0.620, 0.553, 0.212],
    SAUM: 0.35,          // gras.js hat 0.80 — ein Ballen leuchtet weniger durch
    HOCH_NORMALE: 0.14,  // Anteil "nach oben" in der Normalen (Laubnormale)
    UNRUHE: 0.35,        // wie stark die Lappen die Tonstufen verbiegen
    BALLEN_TON: 0.22,    // Licht-/Schattenflecken auf den Ballen, +/- 22 %

    /* Farbe — gemessen, siehe Dateikopf.
     * Das Ausgabeziel ist albedo * mix(1, Sonnenfarbe, 0.5) = albedo * 0,93,
     * die Albedowerte sind deshalb die Messwerte geteilt durch 0,93. */
    OBEN_A: [0.460, 0.820, 0.330],   // gelbgruen, das Polster am Felsfuss
    UNTEN_A: [0.230, 0.430, 0.180],
    OBEN_B: [0.280, 0.600, 0.250],   // tiefgruen, der Strauch mit Holz
    UNTEN_B: [0.140, 0.300, 0.140],

    /* Wind — dieselbe Welle wie grafik/gras.js, nur steifer ---------------- */
    WIND: 0.045,         // Ausschlag der Spitze in Vielfachen der Buschhoehe
    WIND_X: 0.82,        // gras.js: windX
    WIND_Z: 0.57,        // gras.js: windZ

    DUNST_AN: 1.0,       // faellt weg, sobald nebel.js den Fernnebel uebernimmt
  };

  /* ==========================================================================
   * 1. Das Netz — fuenf ineinandergeschobene Ballen
   *
   * DER ERSTE VERSUCH WAR FALSCH, und das ist die Stelle, an der es sich
   * entscheidet. Eine einzelne Kuppel, radial ausgebeult, ergibt bei jeder
   * Beulenstaerke einen sternfoermig konvexen Umriss — also eine gewellte
   * Kartoffel. Die Probeaufnahme dazu sah aus wie ein gruener Stein neben der
   * Mauer, und keine Farbe und keine Kerbung hat das gerettet.
   *
   * Genshins Buesche sind sichtbar aus mehreren Ballen zusammengesetzt: im
   * Nahbild von landschaft_sumeru_dorf_tag zaehlt man rund fuenf Kuppen, deren
   * Umrisse einander ueberschneiden. Genau daher kommen die zwei Merkmale, die
   * ein Blob nie hat: EINSCHNUERUNGEN im Umriss (der Umriss ist nicht mehr von
   * einem Punkt aus sternfoermig) und INNENKANTEN, an denen ein Ballen vor dem
   * naechsten steht und die Tonstufe springt.
   *
   * Deshalb hier: fuenf Kugeln, eine grosse in der Mitte, vier kleinere darum
   * herum, alle so gesetzt, dass ihre Unterseiten unter dem Boden liegen (der
   * Boden schneidet sie ab, kein Deckel noetig) und ihre Oberseiten zusammen
   * genau die Hoehe 1 erreichen.
   *
   * Einheitsraum: xz in [-1,1], y von 0 (Boden) bis 1 (Scheitel). Die Instanz
   * streckt das auf (halbe Breite, Hoehe, halbe Breite).
   *
   * Je Kugel 9 Laengen- und 5 Breitenteilungen: 38 Punkte, 72 Dreiecke.
   * Zusammen 190 Punkte und 360 Dreiecke je Busch. Gerechnet fuer die
   * naeheste Kameralage: ein Busch von 2,2 Einheiten Breite in 4 m ist rund
   * 530 px breit, ein Ballen davon rund 200 px, ein Segment darauf 22 px
   * Bogen. Facettig — aber ein facettierter Laubballen liest sich als
   * Blattbueschel, eine facettierte Kartoffel als Fehler.
   * ======================================================================== */
  const KUGEL_SEG = 9;                  // Laengenteilung
  const KUGEL_RING = 5;                 // Breitenteilung (Ringe zwischen den Polen: 4)

  /* x, y, z, Radius im Einheitsraum.
   * Hoehenprobe: Mitte 0,42 + 0,48 = 0,90; mit der groesstmoeglichen
   * Instanzstreckung (Hoehe x1,08, Radius x1,15) 0,45 + 0,55 = 1,00. Die
   * Klemme im Vertex-Shader faengt den Rest.
   * Fussprobe: tiefster Punkt jedes Ballens liegt zwischen -0,04 und -0,14,
   * also immer unter dem Boden. */
  const BAELLE = [
    [0.00, 0.30, 0.00, 0.50],   // breite Mitte
    [0.58, 0.24, 0.16, 0.40],
    [-0.32, 0.22, 0.58, 0.38],
    [-0.58, 0.26, -0.34, 0.42],
    [0.26, 0.20, -0.62, 0.36],
    [0.06, 0.54, -0.06, 0.40],  // Krone — sie traegt die helle Oberseite
  ];

  /* Jeder Ballen ist in der Hoehe gestaucht. Eine Kugel liest sich als Blase,
   * ein gedruecktes Ellipsoid als Laubpolster — und die gemessene Breite von
   * 2 bis 4,4 zu 1 bekommt man sonst nur, indem man die Ballen weit
   * auseinanderzieht, was sie wieder als Einzelkugeln zeigt. */
  const STAUCH = 0.72;

  /* Knorren: eine niederfrequente Beule ueber der Kugelrichtung plus eine
   * kleine Streuung je Punkt. Beides EINMAL beim Netzbau eingerechnet, nicht
   * je Bild — es ist Form, keine Bewegung. Ohne die Knorren ist jeder Ballen
   * eine glatte Blase; mit ihnen bricht der Umriss auf und liest sich als
   * Laub. Die Normale bleibt trotzdem die glatte Ellipsoidnormale (siehe
   * Vertex-Shader): der Umriss darf zerklueftet sein, die Tonflaechen nicht. */
  function knorrHash(a, b) {
    let h = Math.imul((a | 0) * 73856093 ^ (b | 0) * 19349663, 0x27d4eb2d);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }
  function knorr(dx, dy, dz, bi, vi) {
    const glatt = Math.sin(dx * 5.3 + bi * 2.1)
                * Math.sin(dy * 6.1 - bi * 1.7)
                * Math.sin(dz * 4.7 + bi * 3.3);
    return 1 + 0.15 * glatt + 0.05 * (knorrHash(bi, vi) - 0.5) * 2;
  }

  function ballenNetz() {
    const punkte = [], zentren = [], idx = [];
    for (let bi = 0; bi < BAELLE.length; bi++) {
      const [cx, cy, cz, r] = BAELLE[bi];
      const basis = punkte.length / 3;
      let vi = 0;
      /* dx,dy,dz ist die Richtung auf der EinheitsKUGEL; die Stauchung und der
       * Knorren kommen erst beim Ablegen dazu. */
      const setz = (dx, dy, dz) => {
        const k = knorr(dx, dy, dz, bi, vi++);
        punkte.push(cx + dx * r * k, cy + dy * r * STAUCH * k, cz + dz * r * k);
        zentren.push(cx, cy, cz, r);
      };

      setz(0, 1, 0);                                            // Nordpol
      for (let i = 1; i < KUGEL_RING; i++) {
        const th = Math.PI * i / KUGEL_RING;
        const sy = Math.cos(th), sr = Math.sin(th);
        for (let s = 0; s < KUGEL_SEG; s++) {
          const a = 2 * Math.PI * s / KUGEL_SEG;
          setz(sr * Math.cos(a), sy, sr * Math.sin(a));
        }
      }
      setz(0, -1, 0);                                           // Suedpol

      const nord = basis;
      const sued = basis + 1 + (KUGEL_RING - 1) * KUGEL_SEG;
      const ring = (i, s) => basis + 1 + (i - 1) * KUGEL_SEG + (s % KUGEL_SEG);
      for (let s = 0; s < KUGEL_SEG; s++) idx.push(nord, ring(1, s + 1), ring(1, s));
      for (let i = 1; i < KUGEL_RING - 1; i++) {
        for (let s = 0; s < KUGEL_SEG; s++) {
          idx.push(ring(i, s), ring(i, s + 1), ring(i + 1, s + 1),
                   ring(i, s), ring(i + 1, s + 1), ring(i + 1, s));
        }
      }
      for (let s = 0; s < KUGEL_SEG; s++) idx.push(sued, ring(KUGEL_RING - 1, s), ring(KUGEL_RING - 1, s + 1));
    }
    return {
      punkte: new Float32Array(punkte),
      zentren: new Float32Array(zentren),
      idx: new Uint16Array(idx),
    };
  }

  /* ==========================================================================
   * 2. Shader
   * ======================================================================== */

  const VS = `#version 300 es
precision highp float;

/* Netz, nicht instanziert */
layout(location = 0) in vec3 aKuppel;   // Punkt auf der Kugeloberflaeche
layout(location = 1) in vec4 aBall;     // Mittelpunkt und Radius seines Ballens
/* je Instanz */
layout(location = 2) in vec4 aOrt;    // x, y(Boden), z, Hoehe
layout(location = 3) in vec4 aForm;   // halbe Breite, cos(gier), sin(gier), Ton
layout(location = 4) in vec4 aSaat;   // vier Streuwerte 0..1 aus stueck.zufall

uniform mat4  uViewProj;
uniform float uZeit;
uniform vec2  uWindRichtung;
uniform float uWind;
uniform float uLappen;
uniform float uKerbe;
uniform float uHochNormale;
uniform float uStauch;

out vec3  vPos;
out vec3  vNormal;
out float vH;
out float vTon;
out float vLappen;
out float vBallen;
out float vBallHoehe;

/* Eine Keule: 1 in Richtung der Achse, 0 auf der Gegenseite, quadratisch
 * abfallend. Drei davon ergeben einen unregelmaessigen Ballen, ohne dass
 * irgendwo eine Zufallszahl gezogen wird. */
float keule(vec3 d, float saat, float achsHoehe) {
  float a = saat * 6.2831853;
  vec3 ax = vec3(cos(a) * cos(achsHoehe), sin(achsHoehe), sin(a) * cos(achsHoehe));
  float t = max(dot(d, ax), 0.0);
  return t * t;
}

/* Ballenfeld: ein Produkt aus drei Sinus ueber der Kugelrichtung, Wertebereich
 * -1..1, stetig ueber die ganze Kuppel und ohne Naht, weil es keine
 * Winkelkoordinate benutzt. Es macht ZWEI Dinge zugleich, und das ist der
 * Grund, warum es dieses Feld gibt statt zweier getrennter:
 *   - es kerbt den Umriss (die Zacken, die einen Busch von einem Stein
 *     unterscheiden),
 *   - und es hellt/dunkelt dieselben Stellen ab, sodass Licht- und
 *     Schattenflecken GENAU auf den Ballen sitzen, die man im Umriss sieht.
 * Laufen die beiden auseinander, sieht die Oberflaeche gemustert aus statt
 * gewachsen. */
float ballen(vec3 d, float saat) {
  return sin(d.x * 7.3 + saat * 11.0)
       * sin(d.z * 6.1 - saat *  7.0)
       * sin(d.y * 5.2 + saat *  5.0);
}

void main() {
  float hoehe  = aOrt.w;
  float breite = aForm.x;

  /* --- Der Ballen wandert, der Punkt haengt an ihm ----------------------
   * Verschoben und skaliert wird der BALLEN, nicht der einzelne Punkt. Damit
   * bleibt jede Kugel eine Kugel — nur ihr Ort und ihre Groesse haengen an
   * der Saat der Instanz. So sieht kein Busch aus wie der naechste, obwohl
   * alle 128 dasselbe Netz benutzen und in einem Aufruf gezeichnet werden. */
  vec3 zentrum = aBall.xyz;
  float rad = aBall.w;
  vec3 richt = normalize(vec3(zentrum.x, max(zentrum.y, 0.20), zentrum.z));

  float f = (keule(richt, aSaat.x, 0.30)
           + keule(richt, aSaat.y, 0.62)
           + keule(richt, aSaat.z, 0.12)) * 0.5;
  float bz = ballen(richt, aSaat.w);

  float weit  = 1.0 + uLappen * (f - 0.32);        // 0,78 .. 1,26
  float hoch  = 1.0 + uKerbe * bz;                 // 0,86 .. 1,14
  float dick  = 0.86 + 0.28 * (f * 1.6 + 0.5 * bz); // rund 0,80 .. 1,15

  vec3 z2 = vec3(zentrum.x * weit, zentrum.y * hoch, zentrum.z * weit);
  vec3 q  = z2 + (aKuppel - zentrum) * dick;

  /* DIE Zeile, die die Hoehengrenze der Arena haelt. Alles darf breiter
   * werden, nichts hoeher als seine groesse — sonst waere die Zusage aus
   * karte.js ("innerhalb der Arena nichts ueber 2,0", Busch hoechstens 0,85)
   * eine Behauptung statt einer Eigenschaft. */
  q.y = min(q.y, 1.0);

  /* Ballenfeld ueber der Blickrichtung vom Buschmittelpunkt aus — es traegt
   * unten im Fragment-Shader die Licht- und Schattenflecken. */
  vec3 d = normalize(vec3(q.x, max(q.y, 0.25), q.z));
  float b = 0.62 * ballen(d, aSaat.w) + 0.38 * ballen(d * 1.9, aSaat.x);

  /* --- Laubnormale ------------------------------------------------------
   * Die GLATTE Ellipsoidnormale des eigenen Ballens — ausdruecklich ohne die
   * eingebackenen Knorren. Der Umriss ist zerklueftet, die Tonflaechen
   * bleiben ruhig; genau die Aufteilung, die GRAFIK-MODULE.md §0 verlangt
   * ("Silhouette traegt die Lesbarkeit, nicht das Oberflaechendetail").
   * Das Quadrat der Hoehenstauchung steht darin, weil die Ellipsoidnormale — Ellipsoidnormale ist
   * (x/a2, y/b2, z/c2). Danach der uebliche Weltanisotropieausgleich und ein
   * Stueck Mischung zur Senkrechten. */
  vec3 o = aKuppel - zentrum;
  vec3 nk = normalize(vec3(o.x, o.y / (uStauch * uStauch), o.z));
  vec3 n0 = normalize(vec3(nk.x / breite, nk.y / hoehe, nk.z / breite));
  n0 = normalize(mix(n0, vec3(0.0, 1.0, 0.0), uHochNormale));

  vec3 lokal = vec3(q.x * breite, q.y * hoehe, q.z * breite);

  float co = aForm.y, si = aForm.z;
  vec3 welt;
  welt.x = aOrt.x + lokal.x * co + lokal.z * si;
  welt.z = aOrt.z - lokal.x * si + lokal.z * co;
  welt.y = aOrt.y + lokal.y;

  vec3 nw;
  nw.x = n0.x * co + n0.z * si;
  nw.z = -n0.x * si + n0.z * co;
  nw.y = n0.y;

  /* --- Wind: DIESELBE Welle wie grafik/gras.js --------------------------
   * Ortsfrequenz (0.12, 0.09), Boenwelle (0.013, 0.011), Zeitfaktoren 1.6
   * und 0.35 sind wortgleich uebernommen. Nur so wandert eine Boe durch
   * Gras und Gestruepp als EIN Ereignis; zwei eigene Winde lesen sich als
   * zwei Wetterlagen im selben Bild.
   * Drei Unterschiede, alle begruendet:
   *   - Amplitude rund ein Viertel (0.045 gegen 0.16): ein Ballen ist steif.
   *   - h*h statt t*t auf der Kuppelhoehe: der Fuss steht still, sonst
   *     rutscht der ganze Busch ueber den Boden.
   *   - kleiner Phasenversatz je Stueck, sonst nicken alle Buesche im Takt.
   * Kein Absacken in y (gras.js zieht dort welt.y herunter): das wuerde die
   * Hoehengarantie oben wieder aufweichen und ist bei 4 cm Ausschlag
   * ohnehin nicht zu sehen. */
  vec2  wp  = aOrt.xz;
  float ph  = dot(wp, vec2(0.12, 0.09)) + uZeit * 1.6 + aSaat.w * 1.4;
  float boe = 0.65 + 0.35 * sin(dot(wp, vec2(0.013, 0.011)) - uZeit * 0.35);
  float h   = clamp(q.y, 0.0, 1.0);
  float amp = h * h * uWind * hoehe * boe;
  welt.xz += uWindRichtung * (sin(ph) * 0.7 + sin(ph * 2.3 + 1.1) * 0.3) * amp;

  vPos    = welt;
  vNormal = nw;
  vH      = h;
  vTon    = aForm.w;
  vLappen = f;
  vBallen = b;
  /* Wie hoch der SCHEITEL DIESES BALLENS liegt — je Ballen konstant. Damit
   * bekommt jeder Ballen seine eigene Tonstufe, und die Stufe springt genau
   * an seiner Kante. Ein stetiger Verlauf ueber den ganzen Busch ergibt statt
   * "mehrere Laubballen" ein einziges gewoelbtes Kissen; das war der zweite
   * Fehler der ersten Fassung. */
  vBallHoehe = clamp((zentrum.y * hoch + rad * dick * uStauch - 0.30) / 0.52, 0.0, 1.0);
  gl_Position = uViewProj * vec4(welt, 1.0);
}`;

  /* Der gemeinsame Baustein wird erst im Aufbau geholt, nicht beim Laden:
   * wirft baustein() beim Laden, faellt die ganze Datei aus und der Typ meldet
   * sich nie an — dann greift die Stilllegung aus karte.js §7 nicht mehr.
   * Im Aufbau geworfen wird er sauber uebersprungen. */
  const fsQuelle = () => `#version 300 es
precision highp float;

${GRAFIK.baustein('halblambert')}

in vec3  vPos;
in vec3  vNormal;
in float vH;
in float vTon;
in float vLappen;
in float vBallen;
in float vBallHoehe;

uniform vec3  uCam;
uniform vec3  uLicht;         // Richtung ZUR Sonne
uniform vec3  uSonneFarbe;
uniform vec3  uObenA;
uniform vec3  uUntenA;
uniform vec3  uObenB;
uniform vec3  uUntenB;
uniform vec3  uSchattenTon;
uniform vec3  uSaumFarbe;
uniform vec3  uDunst;
uniform float uKante;
uniform float uFlanke;
uniform float uSaum;
uniform float uUnruhe;
uniform float uBallenTon;
uniform float uDunstAn;
uniform float uBound;

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLicht);

  /* Der Hoehengang ist der wichtigste gemessene Wert dieses Typs: der Fuss
   * ist rund die Haelfte der Oberseite. Lappen- und Ballenfeld verbiegen die
   * Grenze, damit keine waagerechte Bahn ueber den Busch laeuft — im Vorbild
   * folgt die Grenze den Ballen, nicht der Wasserwaage. */
  float t = clamp(0.60 * vBallHoehe + 0.40 * vH
                + uUnruhe * (vLappen - 0.32) + 0.20 * vBallen, 0.0, 1.0);
  vec3 unten = mix(uUntenA, uUntenB, vTon);
  vec3 oben  = mix(uObenA,  uObenB,  vTon);
  vec3 albedo = mix(unten, oben, t);

  /* Licht- und Schattenflecken auf den Ballen. DAS ist der Unterschied
   * zwischen "gruener Stein" und "Laubmasse": im Vorbild
   * (landschaft_sumeru_dorf, 3fach) liegen ueber der Kuppel grosse ruhige
   * Flecken im Verhaeltnis von rund 1,0 zu 0,7, und sie folgen den Ballen des
   * Umrisses. Es ist bewusst die ALBEDO, die fleckt, nicht die Normale: eine
   * gestoerte Normale gibt ein unruhiges Relief statt zweier ruhiger
   * Tonflaechen (GRAFIK-MODULE.md §0). */
  albedo *= 1.0 + uBallenTon * vBallen;

  /* Zwei Tonstufen mit harter Kante, multiplikativ und warm — wortgleich mit
   * grafik/gras.js, damit Busch und Halm dieselbe Schattenkante zeigen. */
  float dd = ndl01(N, L);
  float stufe = smoothstep(uKante - uFlanke, uKante + uFlanke, dd);
  vec3 col = albedo * mix(uSchattenTon, vec3(1.0), stufe);
  col *= mix(vec3(1.0), uSonneFarbe, 0.5);

  /* Gegenlichtsaum, schwaecher als beim Gras. max() statt Addition: die Linie
   * darf nie abdunkeln. */
  float gegen = max(dot(V, -L), 0.0);
  float saum = pow(gegen, 2.5) * (1.0 - abs(dot(N, V)));
  col = mix(col, max(col, uSaumFarbe), clamp(saum * uSaum, 0.0, 1.0));

  /* Derselbe Dunst wie in FS_GROUND und in gras.js — sonst steht der aeussere
   * Bewuchsguertel scharf vor einem Boden, der schon im Dunst liegt. */
  float dunst = smoothstep(uBound * 0.7, uBound * 1.6, length(vPos.xz));
  col = mix(col, uDunst, dunst * uDunstAn);

  outColor = vec4(col, 1.0);
}`;

  /* ==========================================================================
   * 3. Instanzdaten
   *
   * Zwoelf Gleitkommazahlen je Stueck. Alles kommt aus dem Stueck, das
   * karte.js gesetzt hat: `groesse` ist die Hoehe, `drehung` die Gierung,
   * `zufall[0..3]` die vier Streuwerte. Dieser Typ zieht KEINE eigene
   * Zufallszahl — das ist die zweite Regel aus karte.js, und sie ist der
   * Grund, warum der Wald in jeder Aufnahme an derselben Stelle steht.
   * ======================================================================== */
  function instanzen(stuecke) {
    const d = new Float32Array(stuecke.length * 12);
    let k = 0;
    for (let i = 0; i < stuecke.length; i++) {
      const s = stuecke[i];
      const hoehe = Math.min(+s.groesse || 0.6, 2.0);
      const z = s.zufall || [0.5, 0.5, 0.5, 0.5];

      /* Breite je Hoehe: kleine Buesche sind relativ breiter als grosse
       * (gemessen 4,4:1 beim flachen Polster gegen 2,0:1 bei der hohen
       * Kuppe). u laeuft ueber die Groessenspanne, die karte.js vergibt
       * (0,5 innen bis 1,6 aussen). */
      const u = Math.min(1, Math.max(0, (hoehe - 0.5) / 1.1));
      const f = P.BREIT_KLEIN + (P.BREIT_GROSS - P.BREIT_KLEIN) * u
              + (z[1] - 0.5) * 2 * P.BREIT_STREU;
      const halb = hoehe * Math.max(0.6, f);

      const g = +s.drehung || 0;
      d[k++] = +s.x || 0;
      d[k++] = +s.y || 0;
      d[k++] = +s.z || 0;
      d[k++] = hoehe;
      d[k++] = halb;
      d[k++] = Math.cos(g);
      d[k++] = Math.sin(g);
      d[k++] = z[0];                 // Ton: gelbgruen (0) bis tiefgruen (1)
      d[k++] = z[0];
      d[k++] = z[1];
      d[k++] = z[2];
      d[k++] = z[3];
    }
    return d;
  }

  /* ==========================================================================
   * 4. Der Typ
   * ======================================================================== */

  const netz = ballenNetz();

  /* Zustand als Abschlussobjekt, NICHT als `this`.
   *
   * karte.js ruft die drei Haken ueber fn.apply(null, args) auf (§7, Funktion
   * `sicher`). In einer Datei mit 'use strict' ist `this` dort null — ein
   * `this.prog = ...` im Aufbau wirft, der Typ wird stillgelegt, und man sucht
   * den Fehler stundenlang im Shader. Diese Datei haelt ihren Zustand deshalb
   * hier. (grafik/gras.js darf `this` benutzen: dort ruft renderer2.js
   * m.aufbau(...) als Methode.) */
  const Z = { prog: null, vao: null, netzPuffer: null, ballPuffer: null, instPuffer: null, idxPuffer: null, gebaut: -1 };

  KARTE.typ('busch', {
    /* Schicht 20: undurchsichtig, mit Tiefenschreiben — die Reihenfolge
     * gegenueber den anderen Requisiten entscheidet der Tiefenpuffer, nicht
     * diese Zahl. Sie steht nur, damit die Reihenfolge zwischen zwei Laeufen
     * dieselbe ist. */
    schicht: 20,

    aufbau(gl, R) {
      Z.prog = GRAFIK.programm(gl, VS, fsQuelle(), 'props/busch.js');

      Z.vao = gl.createVertexArray();
      gl.bindVertexArray(Z.vao);

      Z.netzPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Z.netzPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, netz.punkte, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

      Z.ballPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Z.ballPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, netz.zentren, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);

      Z.instPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Z.instPuffer);
      const S = 12 * 4;
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 0);
      gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, 16);
      gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, S, 32);
      gl.vertexAttribDivisor(4, 1);

      Z.idxPuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Z.idxPuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, netz.idx, gl.STATIC_DRAW);

      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      Z.gebaut = -1;
    },

    /* Der Instanzpuffer entsteht einmal und wird nur neu geschrieben, wenn
     * sich die Stueckzahl aendert. karte.js setzt alle Stuecke beim Laden,
     * also faellt das genau einmal an. */
    vorbereiten(gl, R, ctx, stuecke) {
      if (Z.gebaut === stuecke.length) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, Z.instPuffer);
      gl.bufferData(gl.ARRAY_BUFFER, instanzen(stuecke), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      Z.gebaut = stuecke.length;
      if (typeof console !== 'undefined' && console.info) {
        console.info('GRAFIK/busch: ' + stuecke.length + ' Buesche, '
          + (netz.idx.length / 3) + ' Dreiecke je Stueck, ein Zeichenaufruf.');
      }
    },

    zeichnen(gl, R, ctx, stuecke) {
      const n = Z.gebaut;
      if (!n || n < 0) return;

      const p = Z.prog;
      const li = ctx.licht;

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      /* Geschlossener Koerper, also Rueckseiten weg. Das halbiert die
       * Fragmentlast und ist der Grund, warum der Bodendeckel oben nichts
       * kostet. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.useProgram(p);
      gl.bindVertexArray(Z.vao);

      gl.uniformMatrix4fv(p.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(p.u.uCam, ctx.cam);
      gl.uniform3fv(p.u.uLicht, li.richtung);
      gl.uniform3fv(p.u.uSonneFarbe, li.farbe);
      gl.uniform3fv(p.u.uDunst, li.dunst);
      gl.uniform1f(p.u.uZeit, ctx.time);

      const wl = Math.hypot(P.WIND_X, P.WIND_Z) || 1;
      gl.uniform2f(p.u.uWindRichtung, P.WIND_X / wl, P.WIND_Z / wl);
      gl.uniform1f(p.u.uWind, P.WIND);
      gl.uniform1f(p.u.uLappen, P.LAPPEN);
      gl.uniform1f(p.u.uKerbe, P.KERBE);
      gl.uniform1f(p.u.uHochNormale, P.HOCH_NORMALE);
      gl.uniform1f(p.u.uStauch, STAUCH);

      gl.uniform3fv(p.u.uObenA, P.OBEN_A);
      gl.uniform3fv(p.u.uUntenA, P.UNTEN_A);
      gl.uniform3fv(p.u.uObenB, P.OBEN_B);
      gl.uniform3fv(p.u.uUntenB, P.UNTEN_B);
      gl.uniform3fv(p.u.uSchattenTon, P.SCHATTEN);
      gl.uniform3fv(p.u.uSaumFarbe, P.SAUM_FARBE);

      gl.uniform1f(p.u.uKante, P.KANTE);
      gl.uniform1f(p.u.uFlanke, P.FLANKE);
      gl.uniform1f(p.u.uSaum, P.SAUM);
      gl.uniform1f(p.u.uUnruhe, P.UNRUHE);
      gl.uniform1f(p.u.uBallenTon, P.BALLEN_TON);
      gl.uniform1f(p.u.uDunstAn, P.DUNST_AN);
      gl.uniform1f(p.u.uBound, (ctx.welt && ctx.welt.bounds) || 26);

      gl.drawElementsInstanced(gl.TRIANGLES, netz.idx.length, gl.UNSIGNED_SHORT, 0, n);

      gl.bindVertexArray(null);
    },
  });

  /* ==========================================================================
   * 5. Was tragbar ist — bei 1600x900
   *
   * Je Stueck 82 Punkte und 160 Dreiecke, ein einziger Zeichenaufruf fuer
   * alle. Die 128 Stuecke aus karte.js sind damit 20 480 Dreiecke — zum
   * Vergleich: das Schleimnetz allein hat 5120 und wird jedes Bild neu
   * hochgeladen.
   *
   * Die Grenze ist nicht die Geometrie, sondern die Fuellrate im kopflosen
   * SwiftShader. Ein Busch bedeckt aus 8 m rund 100x40 px; 128 davon sind
   * bei ueberschneidungsfreier Lage rund 512 000 Fragmente, also 36 % eines
   * Bildes von 1 440 000. Tragbar sind nach dieser Rechnung rund 400 Stueck
   * (gut ein Bildinhalt an Fragmenten) — darueber faengt der Bewuchs an,
   * das Bild zuzustellen, lange bevor er Bildrate kostet.
   *
   * Die eigentliche Obergrenze ist deshalb keine technische: 128 Buesche auf
   * 2 700 m2 Arena plus Waldsaum sind bereits die Menge, bei der die Flaeche
   * "bewachsen" liest und der Schleim trotzdem die einzige grosse Form im
   * Bild bleibt. Mehr macht das Bild nicht reicher, sondern unruhiger.
   * ======================================================================== */

})();
