'use strict';

/* ---------------------------------------------------------------------------
 * grafik/boden.js — Terrain, Albedo, Kontaktband, senkrechte Felsrampe.
 *
 * Besitzer: Lane GRAFIK. Vertrag: GRAFIK-MODULE.md §3, ordnung 20.
 * Schritt G6 aus PHASE-GRAFIK-PLAN.md.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIESE DATEI ZUERST ETWAS BRINGT
 *
 * Der Boden ist in JEDEM Bild die groesste Flaeche. Bei fovY 50 Grad und der
 * Standardkamera (pitch 0,40) sind 4,6 % des Bildes Himmel — der Rest ist
 * Boden, Hindernisse und Schleim (PHASE-GRAFIK-PLAN §0). Wer am Himmel
 * anfaengt, arbeitet an einem Zwanzigstel des Bildes.
 *
 * Der Bestand ist ein dunkles Raster: `FS_GROUND` in renderer2.js mischt
 * (0.250,0.252,0.260) nach (0.330,0.320,0.286) und legt Schachbrett (±6,2 %),
 * Naht (0,048) und Hauptraster (0,070) darueber. Gemessen an der eigenen
 * Aufnahme (g-bodenlicht, zweiter Pfad, Zeile 700): Bodenflaeche
 * RGB(90,88,79), L = 87,5; Median des ganzen Bildes 85. Das ist ein
 * mittelgraues Millimeterpapier, und keine Rampe und keine Kontur rettet ein
 * Bild, dessen groesste Flaeche so aussieht.
 *
 * ---------------------------------------------------------------------------
 * GEMESSEN AM REFERENZMATERIAL (eigene Pixelscans, nicht uebernommen)
 *
 * 1. WIE HELL der Boden ist.
 *    `ref/genshin/landschaft_sumeru_dorf_tag_2560.png`, Platz im Vordergrund,
 *    vier Proben zu je 200x80 px:
 *      [1200,1250]  RGB 224,1 / 229,8 / 210,2   L = 225,8
 *      [1700,1200]  RGB 219,0 / 223,5 / 205,0   L = 220,0
 *      [ 700,1300]  RGB 220,0 / 224,0 / 202,0   L = 220,3
 *      [1500,1350]  RGB 214,6 / 218,8 / 202,4   L = 215,7
 *    Also rund RGB(220,224,205), L = 220 — und leicht GELBGRUEN, nicht grau:
 *    B liegt 15 bis 20 Stufen unter R und G.
 *    Vordergrundwiese, `landschaft_sumeru_wiese_see_tag_2560.png` [100,1150]:
 *    RGB(130,200,94), L = 167.
 *
 * 2. WIE WENIG Zeichnung er hat. Genau das ist der Befund, den man beim
 *    blossen Ansehen unterschaetzt. Die Streuung innerhalb der vier
 *    Platzproben oben betraegt sd = 6 bis 8 Stufen ueber 200 px Breite —
 *    inklusive der Plattenfugen. Die Fugen des Genshin-Plattenbodens sind
 *    also rund ±3 %, nicht ±6 % wie unser Schachbrett und schon gar nicht
 *    die 0,070 unseres Hauptrasters (auf einem Boden von 0,25 sind das 28 %).
 *    Der Boden besteht aus grossen ruhigen Farbflaechen mit einer sehr
 *    langwelligen Abweichung — nicht aus einem Verlaufsteppich und nicht aus
 *    einem Raster.
 *
 * 3. DIE SENKRECHTE FELSRAMPE (Gradient Tint Rock).
 *    `landschaft_wiese_mittag_figur_2560.png`, Findling bei x = 1792,
 *    Spaltenscan von der Oberkante nach unten:
 *      y = 1036  RGB 214 / 216 / 212      (oben)
 *      y = 1090  RGB 166 / 177 / 177
 *      y = 1140  RGB 131 / 144 / 149      (unten)
 *    Abfall oben nach unten: R −39 %, G −33 %, B −30 %.
 *    Verhaeltnis R/B faellt dabei von 1,009 auf 0,879 — die untere Partie
 *    wird also RELATIV BLAUER. Dieselbe Richtung an der grossen Felswand
 *    derselben Datei (Spalte 120): (136,149,156) oben, (80,102,124) auf
 *    halber Hoehe — R −41 %, B −21 %.
 *    Das Dossier nennt am Tafelberg R −33 % gegen B −24 %. Gleiche Richtung,
 *    gleiche Groessenordnung. Als blosse Helligkeitsmultiplikation gebaut
 *    waere der Effekt wertlos; es ist eine FARBverschiebung.
 *
 * 4. DAS KONTAKTBAND.
 *    `landschaft_sumeru_wiese_see_tag_2560.png`, Spalte 420: Grasflaeche auf
 *    dem Felsvorsprung L = 171, direkt unter der Kante ein dunkles Band
 *    (52,109,107) L = 97, danach wieder Gras L = 171.
 *    `landschaft_wiese_mittag_figur_2560.png`, Spalte 1792: heller Stein
 *    L = 196, darunter Band (64,99,126) L = 97, darunter Gras L = 84.
 *    Genshin verblendet Materialgrenzen NICHT — es setzt einen schmalen
 *    dunklen Saum darunter. Genau der fehlt uns: in `g-bodenlicht` schweben
 *    die Felsen ueber dem Raster wie aufgeklebt.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESE DATEI TUT
 *
 *   - ersetzt den Grundzug `boden` (Namensregel, automatisch)
 *   - ersetzt den Grundzug `hindernisse`, SOLANGE ES NIEMAND SONST TUT.
 *     Das ist die Haelfte von G6 ("Boden und Fels"), und karte.js sagt in
 *     ihrem eigenen Kommentar ausdruecklich, wo sie hingehoert: "Wenn spaeter
 *     jemand den Hindernis-Durchgang wirklich uebernimmt, gehoert das in ein
 *     eigenes Modul mit eigenem Namen." Meldet ein anderes Modul den Durchgang
 *     an, tritt diese Datei jeden Frame neu zurueck (siehe `fremdeUebernahme`)
 *     und zeichnet nur noch den Boden — kein Doppelbild, keine Absprache
 *     noetig.
 *
 * ---------------------------------------------------------------------------
 * WARUM EINE GEBACKENE KARTE UND KEIN RAUSCHEN IM SHADER
 *
 * Sowohl das Kontaktband als auch die Farbabweichung sind ORTSFEST und
 * LANGWELLIG. Im Fragment-Shader gerechnet kosten sie: 16 Abstandsfunktionen
 * (12 Felsen, 4 Mauern) plus fbm2 mit drei Lagen (12 Streuaufrufe) — auf
 * 1,4 Mio. Fragmenten, jedes Bild neu, fuer ein Ergebnis, das sich nie
 * aendert. `tools/capture.mjs` rastert in SwiftShader auf der CPU; das waere
 * der teuerste Posten des ganzen Plans fuer den geringsten Zugewinn.
 *
 * Stattdessen wird beim ersten Bild EINE Textur 512x512 RGBA8 gebacken
 * (0,127 m je Texel bei bounds 26):
 *   R  Kontaktband      0 = frei, 1 = voller Saum
 *   G  Flaechenmaske    welche der zwei ruhigen Bodenfarben hier gilt
 *   B  feine Abweichung 0,5 = neutral
 *   A  frei
 * Im Shader bleibt EIN texture()-Aufruf. Gebacken wird mit einer eigenen
 * ganzzahligen Streufunktion (Math.imul, kein Math.random, keine Uhr) —
 * dieselbe Welt ergibt Bit fuer Bit dieselbe Karte, auf jeder Maschine.
 *
 * Neu gebacken wird nur, wenn sich Hindernisanzahl oder bounds aendern.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein Math.random, kein Date, kein performance.now. Diese Datei liest nicht
 * einmal ctx.time — der Boden bewegt sich nicht, und was sich nicht bewegt,
 * kann zwischen zwei Aufnahmen auch nicht auseinanderlaufen.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof GRAFIK === 'undefined' || typeof GRAFIK.modul !== 'function') return;

  /* ==========================================================================
   * 0. Die Zahlen
   *
   * Alle Albedowerte sind so gewaehlt, dass sie MIT DEM HEUTIGEN ctx.licht
   * (der Uebersetzung des LICHT-Blocks aus renderer.js) die oben gemessenen
   * Ausgabewerte treffen. Sobald licht.js die Werte aus G3 setzt, wandert das
   * Ergebnis mit — deshalb steht hier kein einziger Lichtwert als Konstante,
   * sondern alles kommt aus ctx.licht.
   *
   * Rechnung fuer den Arenaboden, N = (0,1,0):
   *   ndl01 = dot(N,L)*0.5+0.5 = 0,89   (Tagessonne 0.55,0.78,0.32)
   *   amb   = mix(boden, himmel, 1.0)   = himmel = (0.34,0.38,0.47)
   *   licht = amb + sonne*ndl01         = (1.123, 1.137, 1.164)
   *   Ziel  = (220,224,205)/255         = (0.863, 0.878, 0.804)
   *   ==> albedo = Ziel / licht         = (0.768, 0.772, 0.691)
   * ======================================================================== */

  /* Notnagel, falls licht.js fehlt oder ausgefallen ist. Das sind meine
   * eigenen Messwerte von oben: Platz (220,224,205)/255, Wiese
   * (130,200,94)/255, Findlingsoberkante (214,216,212)/255.
   * Laeuft licht.js, kommen die Albedowerte aus ctx.licht.albedo — das ist
   * genau die Tabelle, die licht.js fuer diesen Zweck veroeffentlicht
   * ("boden.js und die Requisiten koennen sie direkt nehmen"). */
  const NOT_ALBEDO = {
    boden: [0.863, 0.878, 0.804],
    gras:  [0.510, 0.784, 0.369],
    fels:  [0.839, 0.847, 0.831],
    mauer: [0.851, 0.867, 0.796],
  };

  const VORGABE = {
    /* Wieviel der zweiten Flaechenfarbe (Richtung Gras) in den Arenaboden
     * bzw. in das Umland gemischt wird. Zwei bis drei Tonstufen je
     * Oberflaeche, nicht ein stufenloser Verlauf. */
    zweitAnteil: 0.30,
    aussenAnteil: 0.52,

    /* Felsrampe: unten = oben * (0.64, 0.70, 0.77).
     * R faellt am staerksten, B am wenigsten — die untere Partie wird also
     * RELATIV BLAUER. Das ist die gemessene Richtung aus Befund 3
     * (Findling R −39 % / B −30 %, Felswand R −41 % / B −21 %,
     *  Dossier-Tafelberg R −33 % / B −24 %). */
    rampeR: 0.64, rampeG: 0.70, rampeB: 0.77,
    /* Exponent der Rampe. 0,8 heisst: die obere Haelfte ist flacher, der
     * Abfall sitzt unten. Genau so laeuft der gemessene Scan. */
    rampeExponent: 0.80,

    raster: 0.018,     // Grundkontrast des Rasters (Schachbrett = ±dieser Wert)
    fleck: 0.045,      // Amplitude der feinen Farbabweichung
    kontakt: 0.26,     // Tiefe des Kontaktbands am Boden
    kontaktBreite: 0.55, // Breite des Kontaktbands in Metern
    kontaktObjekt: 0.13, // Abdunklung am Objektfuss selbst (Dossier: 13 %)
    dunstStart: 1.00,  // ab bounds*diesem Wert beginnt der eigene Ferndunst
  };

  /* ==========================================================================
   * 1. Shader
   *
   * ANSCHLUSS AN nebel.js (G2)
   *
   * nebel.js tauscht die vier EINGEBAUTEN Programme (ground, solid, slime,
   * decal) gegen benebelte Fassungen. Dieses Modul verdraengt den Grundzug
   * `boden` — R.ground wird also gar nicht mehr gezeichnet. Fuer diesen Fall
   * hat nebel.js zwei getrennte Antworten, und die Arbeitsteilung ist
   * unterschiedlich:
   *
   *  - BODENEBENE: nebel.js legt einen EIGENEN Durchgang darueber (Modul
   *    nebelboden, ordnung 27, dasselbe Quad, dieselbe Rechnung). Der Boden
   *    darf den Nebel deshalb NICHT selbst tragen — sonst steht er doppelt
   *    im Bild. FS_BODEN bleibt hier also ohne fernnebel().
   *  - FELS UND MAUER: die zeichnet dieses Modul mit einem eigenen Programm,
   *    also weder ueber R.solid (das nebel.js in Ruhe laesst, weil rampe.js
   *    es beansprucht) noch ueber R.drawProp (an dem nebel.js mithoert).
   *    Fuer genau diesen Fall schreibt nebel.js in seiner Konsolenmeldung:
   *    "diese Module binden GRAFIK.baustein('fernnebel') selbst ein."
   *    FS_FELS tut das, und zeichnen() zieht die Uniforms ueber
   *    R.nebel.setzen() nach.
   *
   * Fehlt nebel.js, faellt der Baustein weg und der eigene, schlichte
   * Ferndunst auf ctx.licht.dunst springt ein — sonst risse am Horizont eine
   * Naht auf, weil der Himmel dort in dieselbe Farbe laeuft.
   * ======================================================================== */

  const NEBEL_DA = (() => {
    try { return GRAFIK.bausteine().indexOf('fernnebel') >= 0; }
    catch (e) { return false; }
  })();

  const NEBELKOPF = NEBEL_DA ? GRAFIK.baustein('srgb', 'nebel', 'fernnebel') : '';

  const VS_BODEN = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform float uSize;
out vec3 vWorld;
void main() {
  vWorld = vec3(aPos.x * uSize, 0.0, aPos.z * uSize);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

  const FS_BODEN = `#version 300 es
precision highp float;
${GRAFIK.baustein('halblambert')}
in vec3 vWorld;

uniform sampler2D uKarte;     // R Kontaktband, G Flaechenmaske, B Abweichung
uniform float uKarteHalb;     // die Karte deckt +-uKarteHalb Meter ab
uniform vec3  uCam;
uniform vec3  uLichtRichtung;
uniform vec3  uSonne;
uniform vec3  uHimmelLicht;
uniform vec3  uBodenLicht;
uniform vec3  uDunst;
uniform float uBound;
uniform vec3  uInnen;
uniform vec3  uZweit;
uniform vec3  uAussen;
uniform float uRaster;
uniform float uFleck;
uniform float uKontakt;
uniform float uDunstStart;    // 0 schaltet den eigenen Ferndunst ab (nebel.js)

out vec4 outColor;

void main() {
  vec2 p = vWorld.xz;

  /* --- die gebackene Karte ------------------------------------------------
   * Ein Texturzugriff statt sechzehn Abstandsfunktionen und drei Lagen
   * Rauschen. CLAMP_TO_EDGE: ausserhalb der Karte gilt der Randtexel, und der
   * ist beim Backen auf "kein Band, neutrale Abweichung" gesetzt. */
  vec2 kuv = p / (2.0 * uKarteHalb) + 0.5;
  vec3 karte = texture(uKarte, kuv).rgb;
  float band = karte.r;
  float feld = karte.g;
  float fein = karte.b * 2.0 - 1.0;

  /* --- grosse ruhige Farbflaechen ---------------------------------------- */
  float innen = 1.0 - smoothstep(uBound - 0.5, uBound + 0.1,
                                 max(abs(p.x), abs(p.y)));
  vec3 albedo = mix(uInnen, uZweit, feld);
  albedo = mix(uAussen, albedo, innen);

  /* Sanfte Farbabweichung ueber die Flaeche. Deterministisch aus der
   * Weltposition gebacken, kein Zufall. Der Kanalgewichtung nach kippt die
   * Abweichung warm/kuehl statt bloss hell/dunkel — ein reiner
   * Helligkeitsteppich sieht nach Schmutz aus, eine Farbabweichung nach
   * Gelaende. */
  albedo *= 1.0 + fein * uFleck * vec3(1.15, 1.00, 0.78);

  /* --- Raster: ablesbar, aber nicht mehr das Motiv ------------------------
   * GDD 12 §4 will ablesbares Tempo, Genshin will grosse ruhige Flaechen.
   * Der Kompromiss ist derselbe wie im Plan: Kontrast runter auf das, was
   * zum Ablesen noetig ist — und warm statt neutral, damit die Linien wie
   * Bodenfugen aussehen und nicht wie Millimeterpapier.
   * Gemessene Zielgroesse: Genshins Plattenfugen liegen bei rund ±3 %. */
  vec2 uv = p * 0.5;
  vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
  float naht = 1.0 - min(min(g.x, g.y), 1.0);

  vec2 uv2 = p * 0.1;
  vec2 g2 = abs(fract(uv2 - 0.5) - 0.5) / fwidth(uv2);
  float haupt = 1.0 - min(min(g2.x, g2.y), 1.0);

  vec2 zelle = floor(p * 0.5);
  float schach = mod(zelle.x + zelle.y, 2.0) - 0.5;

  albedo *= 1.0 + schach * 2.0 * uRaster * vec3(1.10, 1.00, 0.80);
  albedo *= 1.0 - naht  * uRaster * 1.4  * vec3(0.90, 1.00, 1.15);
  albedo *= 1.0 + haupt * uRaster * 1.8  * vec3(1.12, 1.00, 0.76);

  /* --- Arenakante -------------------------------------------------------- */
  float kante = smoothstep(0.75, 0.0, abs(max(abs(p.x), abs(p.y)) - uBound));
  albedo = mix(albedo, vec3(0.80, 0.70, 0.46), kante * 0.42);

  /* --- Kontaktband -------------------------------------------------------
   * Der schmale dunkle Saum dort, wo etwas den Boden beruehrt. Ohne ihn
   * schwebt jedes Objekt. Die Abdunklung faellt in R staerker als in B: ein
   * Kontaktschatten wird vom Himmel beleuchtet, und der ist blaeulich —
   * derselbe Befund wie an Genshins Figurenschatten (B/R faellt von 0,92 auf
   * 0,73), nur mit umgekehrtem Vorzeichen der Betrachtung. */
  albedo *= 1.0 - band * uKontakt * vec3(1.00, 0.92, 0.78);

  /* --- Licht --------------------------------------------------------------
   * Der Boden hatte bisher UEBERHAUPT KEINE Lichtrechnung — deshalb sah
   * g-nacht genauso aus wie g-bodenlicht. Halblambert (ndl01) statt Lambert:
   * Genshins Schattenseiten fallen kaum ab. */
  vec3 N = vec3(0.0, 1.0, 0.0);
  vec3 L = normalize(uLichtRichtung);
  vec3 licht = halbraumLicht(N, uHimmelLicht, uBodenLicht) + uSonne * ndl01(N, L);
  vec3 col = albedo * licht;

  /* --- Ferndunst ---------------------------------------------------------
   * ABSICHTLICH KEIN fernnebel() HIER. nebel.js legt fuer die Bodenebene
   * einen eigenen Durchgang darueber (Modul nebelboden, ordnung 27,
   * dasselbe Quad, dieselbe Rechnung) und schreibt in seinem Kopf
   * ausdruecklich, dass der Boden ihn deshalb NICHT selbst tragen soll.
   * Zwei Nebelmodelle uebereinander ergeben eine sichtbare Doppelkante
   * (Plan G2, Falle 4).
   *
   * Was hier bleibt, ist der Rueckfall fuer den Fall, dass nebel.js fehlt
   * oder ausfaellt: ein schlichter Uebergang auf ctx.licht.dunst — dieselbe
   * Farbe, in die der Himmel am Horizont laeuft. Ohne ihn risse dort eine
   * Naht von rund 80 Stufen auf. vorbereiten() setzt uDunstStart auf 0,
   * sobald nebel.js oder nebelboden aktiv ist.
   *
   * Abstand zur KAMERA, nicht zum Weltursprung: sonst waere der Boden direkt
   * unter einer weit aussen stehenden Kamera zugenebelt. */
  if (uDunstStart > 0.0) {
    float d = smoothstep(uBound * uDunstStart, uBound * 2.2, length(vWorld - uCam));
    col = mix(col, uDunst, d);
  }

  outColor = vec4(col, 1.0);
}`;

  const VS_FELS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vec4 welt = uModel * vec4(aPos, 1.0);
  vPos = welt.xyz;
  vNormal = uNormalMat * aNormal;
  gl_Position = uViewProj * welt;
}`;

  const FS_FELS = `#version 300 es
precision highp float;
${GRAFIK.baustein('halblambert')}
${NEBELKOPF}

in vec3 vPos;
in vec3 vNormal;

uniform vec3  uCam;
uniform vec3  uLichtRichtung;
uniform vec3  uSonne;
uniform vec3  uHimmelLicht;
uniform vec3  uBodenLicht;
uniform vec3  uOben;        // Albedo an der Oberkante
uniform vec3  uUnten;       // Albedo am Fuss
uniform float uBasis;       // Welt-y des Fusses
uniform float uSpanne;      // Hoehe des Objekts in Metern
uniform float uExponent;
uniform float uKontaktObj;

/* --- geliehen von rampe.js, wenn es laeuft ------------------------------
 * G4 (Schattenrampe) und G6 (Felsrampe) greifen beide in dieselbe Stelle:
 * G4 macht aus dem Lichtterm zwei Plateaus, G6 macht aus der Objektfarbe
 * einen senkrechten Verlauf. Der Plan schreibt beides in FS_SOLID, und die
 * richtige Reihenfolge steht dort ausdruecklich:
 *     col = albedo * schatten;   // MULTIPLIKATIV
 *     col *= uUmgebung;          // Umgebungslicht ganz am Ende
 * Genau das passiert hier — albedo traegt den Hoehenverlauf, stufe ist
 * rampe.js' Nachschlagetextur. Faellt rampe.js aus, schaltet uRampeAn auf 0
 * und es bleibt Halblambert: dasselbe Bild wie ohne dieses Modul, nur mit
 * Verlauf und Kontaktband. */
uniform sampler2D uRampe;
uniform float uRampeAn;        // 1 = rampe.js liefert die Textur
uniform float uRampZeile;
uniform float uLichtFlaeche;
uniform float uRampBreite;
uniform vec3  uUmgebung;
uniform float uGlanzHaerte;
uniform float uGlanzMulti;
uniform float uGloss;

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLichtRichtung);
  vec3 H = normalize(L + V);

  /* --- senkrechte Rampe (Gradient Tint Rock) ------------------------------
   * Oben heller und waermer, unten dunkler und relativ blauer. Gemessen am
   * Genshin-Findling: R faellt um 39 %, B nur um 30 %; an der Felswand
   * R −41 % gegen B −21 %. Als Helligkeitsmultiplikation gebaut waere der
   * Effekt wertlos — es ist eine Farbverschiebung.
   * Der eigentliche Gewinn: ein Fels sieht aus zehn wie aus zweihundert
   * Metern gleich gut aus, weil es keine Textur gibt, die auseinanderfaellt. */
  float hp = clamp((vPos.y - uBasis) / max(uSpanne, 1e-4), 0.0, 1.0);
  vec3 albedo = mix(uUnten, uOben, pow(hp, uExponent));

  /* Waagerechte Flaechen bekommen den oberen Ton, egal wo sie sitzen —
   * sie sehen den Himmel. */
  albedo = mix(albedo, uOben, max(N.y, 0.0) * 0.25);

  /* Kontaktband am Objekt selbst: die untersten 10 % der Spanne um
   * uKontaktObj abdunkeln. Genshin kaschiert Materialgrenzen nicht durch
   * Verblenden, sondern durch genau dieses Band (Dossier: 13 % unter dem
   * Eigenwert). Zusammen mit dem Band auf dem Boden schliesst sich der Saum
   * um den Fuss herum. */
  albedo *= 1.0 - uKontaktObj * (1.0 - smoothstep(0.0, 0.10, hp));

  /* --- Lichtterm: rampe.js, sonst Halblambert -----------------------------
   * Der Griff in die Textur steht AUSSERHALB jeder Fallunterscheidung:
   * texture() braucht die Ableitungen der Nachbarfragmente, und die sind in
   * ungleichfoermigem Kontrollfluss laut GLSL ES 3.00 undefiniert. */
  float n01 = ndl01(N, L);
  float u = 1.0 - (((uLichtFlaeche - n01) / uLichtFlaeche) / uRampBreite);
  vec3 gelesen = texture(uRampe, vec2(clamp(u, 0.0, 1.0), uRampZeile)).rgb;
  vec3 stufe = (n01 >= uLichtFlaeche) ? vec3(1.0) : gelesen;

  vec3 mitRampe  = albedo * stufe * uUmgebung;
  vec3 ohneRampe = albedo * (halbraumLicht(N, uHimmelLicht, uBodenLicht) + uSonne * n01);
  vec3 col = mix(ohneRampe, mitRampe, uRampeAn);

  /* Harte Glanzstufe, wortgleich mit rampe.js — damit Fels und Kreatur
   * denselben Glanz haben. Kein weicher pow(ndh,40)-Blinn-Phong: der ist im
   * Genshin-Bild das einzige Element mit stetigem Verlauf und faellt sofort
   * auf (Plan §1.2). Kein Glanz auf der Schattenseite, sonst entstuende ein
   * dritter Helligkeitswert und die Zweistufigkeit braeche. */
  float s = pow(max(dot(N, H), 0.0), uGlanzHaerte);
  float w = max(fwidth(s), 1e-5);
  float schwelle = 1.03 - clamp(uGloss, 0.0, 1.0);
  s = smoothstep(schwelle - w, schwelle + w, s);
  col += vec3(s * uGlanzMulti * uRampeAn) * step(uLichtFlaeche, n01);

  /* Ohne rampe.js ein schmaler Himmelssaum, damit die Silhouette nicht
   * verschwindet. Mit rampe.js uebernimmt kontur.js diese Aufgabe. */
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uHimmelLicht * rim * 0.18 * (1.0 - uRampeAn);
${NEBEL_DA ? `
  /* Derselbe Nebel wie auf dem Boden. Ohne ihn staende ein ferner Fels
   * ungenebelt vor einem benebelten Boden — genau die Naht, die G2
   * verhindern soll. */
  col = fernnebel(col, length(vPos - uCam));
` : ''}
  outColor = vec4(col, 1.0);
}`;

  /* ==========================================================================
   * 2. Die gebackene Bodenkarte
   *
   * Ganzzahlige Streufunktion nach dem Muster von Wang/xxHash: nur Math.imul
   * und Verschiebungen, kein Math.random, keine Uhr, kein Gleitkomma-Hash.
   * Dieselbe Welt ergibt auf jeder Maschine dieselbe Karte.
   * ======================================================================== */

  function streu(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function rausch(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = streu(ix, iy), b = streu(ix + 1, iy);
    const c = streu(ix, iy + 1), d = streu(ix + 1, iy + 1);
    const o = a + (b - a) * ux;
    const u = c + (d - c) * ux;
    return o + (u - o) * uy;
  }

  function fbm(x, y, lagen) {
    let s = 0, a = 0.5, n = 0;
    for (let i = 0; i < lagen; i++) {
      s += a * rausch(x, y);
      n += a;
      x *= 2.03; y *= 2.03;   // leicht irrational, sonst richten sich die Lagen aus
      a *= 0.5;
    }
    return s / n;
  }

  /* Vorzeichenbehafteter Abstand zum Fussabdruck eines Hindernisses.
   * Fels: Kugel mit den Halbachsen (r, 0.8r, r), gezeichnet als M4.trs in
   * renderer2.js Zeile ~950. Ihr Schnitt mit der Ebene y = 0 ist ein Kreis
   * mit Radius r * sqrt(1 - (y0 / (0.8 r))^2) — genau dort steht der Saum,
   * nicht bei r. */
  function fussRadius(o) {
    const halb = o.r * 0.8;
    const t = Math.abs(o.y) / halb;
    if (t >= 1) return 0;
    return o.r * Math.sqrt(1 - t * t);
  }

  function bandKarte(welt, groesse, halb, breite) {
    const daten = new Uint8Array(groesse * groesse * 4);
    const felsen = [], mauern = [];
    for (const o of (welt.obstacles || [])) {
      if (o.type === 'rock') {
        const r = fussRadius(o);
        if (r > 0.01) felsen.push([o.x, o.z, r]);
      } else {
        mauern.push([o.x, o.z, o.w * 0.5, o.d * 0.5]);
      }
    }

    for (let j = 0; j < groesse; j++) {
      const wz = ((j + 0.5) / groesse) * 2 * halb - halb;
      for (let i = 0; i < groesse; i++) {
        const wx = ((i + 0.5) / groesse) * 2 * halb - halb;

        /* kleinster vorzeichenbehafteter Abstand zu allen Fussabdruecken */
        let dmin = 1e9;
        for (let k = 0; k < felsen.length; k++) {
          const f = felsen[k];
          const d = Math.hypot(wx - f[0], wz - f[1]) - f[2];
          if (d < dmin) dmin = d;
        }
        for (let k = 0; k < mauern.length; k++) {
          const m = mauern[k];
          const qx = Math.abs(wx - m[0]) - m[2];
          const qz = Math.abs(wz - m[1]) - m[3];
          const aussen = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
          const d = aussen + Math.min(Math.max(qx, qz), 0);
          if (d < dmin) dmin = d;
        }

        /* Band: voll am Fuss, in `breite` Metern auf null. Innerhalb des
         * Fussabdrucks bleibt es voll — dort steht ohnehin das Objekt, aber
         * an einem angeschnittenen Rand waere ein Sprung sichtbar. */
        let band = 0;
        if (dmin <= 0) band = 1;
        else if (dmin < breite) {
          const t = dmin / breite;
          band = 1 - t * t * (3 - 2 * t);   // smoothstep
        }

        /* Flaechenmaske: zwei Tonstufen statt eines Verlaufs. Die schmale
         * smoothstep-Klammer macht aus dem Rauschen Plateaus mit Kanten,
         * nicht einen Verlaufsteppich (GRAFIK-MODULE.md §0). */
        const f = fbm(wx / 14.0, wz / 14.0, 2);
        let feld = (f - 0.42) / 0.16;
        feld = feld < 0 ? 0 : feld > 1 ? 1 : feld;
        feld = feld * feld * (3 - 2 * feld);

        /* Feine Abweichung: langwellig, +-1 um die Mitte 0,5. */
        const fein = fbm(wx / 5.5 + 31.7, wz / 5.5 - 12.3, 3);

        const p = (j * groesse + i) * 4;
        daten[p]     = Math.round(band * 255);
        daten[p + 1] = Math.round(feld * 255);
        daten[p + 2] = Math.round(Math.min(1, Math.max(0, fein)) * 255);
        daten[p + 3] = 255;
      }
    }

    /* Randtexel neutralisieren: die Textur wird mit CLAMP_TO_EDGE gelesen,
     * und was am Rand steht, zieht sich sonst bis zum Ende der Bodenebene
     * (bounds*3 = 78 m) als Streifen hinaus. */
    const neutral = (p) => { daten[p] = 0; daten[p + 2] = 128; };
    for (let i = 0; i < groesse; i++) {
      neutral(i * 4);
      neutral(((groesse - 1) * groesse + i) * 4);
      neutral((i * groesse) * 4);
      neutral((i * groesse + groesse - 1) * 4);
    }
    return daten;
  }

  /* ==========================================================================
   * 3. Kleine Helfer — Matrizen
   *
   * renderer2.js haelt M4 privat, also hier noch einmal, spaltenweise wie
   * WebGL sie erwartet. Nur die beiden Faelle, die vorkommen: Verschiebung
   * mit Skalierung, und die zugehoerige Normalenmatrix (bei achsenparalleler
   * Skalierung ist das schlicht der Kehrwert je Achse).
   * ======================================================================== */

  const _m = new Float32Array(16);
  const _n = new Float32Array(9);

  function trs(x, y, z, sx, sy, sz) {
    _m[0] = sx; _m[1] = 0;  _m[2] = 0;  _m[3] = 0;
    _m[4] = 0;  _m[5] = sy; _m[6] = 0;  _m[7] = 0;
    _m[8] = 0;  _m[9] = 0;  _m[10] = sz; _m[11] = 0;
    _m[12] = x; _m[13] = y; _m[14] = z; _m[15] = 1;
    _n[0] = 1 / sx; _n[1] = 0; _n[2] = 0;
    _n[3] = 0; _n[4] = 1 / sy; _n[5] = 0;
    _n[6] = 0; _n[7] = 0; _n[8] = 1 / sz;
    return _m;
  }

  /* ==========================================================================
   * 4. Uebernahme des Hindernis-Durchgangs — und der Rueckzug daraus
   *
   * Diese Datei zeichnet die Felsen nur, wenn KEIN anderes Modul den
   * Grundzug `hindernisse` beansprucht. Geprueft wird jedes Bild neu, in
   * vorbereiten() — also bevor renderScene2 die Verdraengungsliste bildet.
   * Damit braucht es keine Absprache: wer spaeter kommt und den Durchgang
   * wirklich uebernimmt (rampe.js, kontur.js), gewinnt automatisch, und diese
   * Datei faellt geraeuschlos auf "nur Boden" zurueck.
   * ======================================================================== */

  const ERSATZ_NAME = {
    karte: 'hindernisse', props: 'hindernisse',
    terrain: 'boden', schleim: 'gel', dekal: 'dekale',
  };

  function fremdeUebernahme(selbst, was) {
    let module;
    try { module = GRAFIK.module(); } catch (e) { return null; }
    for (const m of module) {
      if (m === selbst || m.aus) continue;
      if (m.ersetzt === false) continue;
      let liste;
      if (m.ersetzt) liste = Array.isArray(m.ersetzt) ? m.ersetzt : [m.ersetzt];
      else liste = [ERSATZ_NAME[m.name] || m.name];
      if (liste.indexOf(was) >= 0) return m.name;
    }
    return null;
  }

  /* ==========================================================================
   * 4b. Die Rampe von rampe.js leihen
   *
   * rampe.js (G4) tauscht R.solid gegen sein eigenes Programm aus und legt
   * Textur, Texturplatz und Zeilenlage unter `R.rampe` ab. Dieser Durchgang
   * laeuft an R.solid vorbei — er braucht die Zahlen also selbst.
   *
   * Zwei Dinge werden hier NACHGEBAUT statt geraten:
   *  - die Zeilenlage in v ueber R.rampe.v('fels') bzw. ('mauer'),
   *  - der Umgebungsfaktor, wortgleich mit rampe.js/vorbereiten. Liefe er
   *    auseinander, staenden Fels und Kreatur nebeneinander bei verschiedener
   *    Belichtung, und das faellt sofort auf.
   * Fehlt rampe.js oder eines seiner Felder, wird `an: false` zurueckgegeben
   * und der Fragment-Shader rechnet Halblambert. Kein Absturz, kein leeres
   * Bild — nur ein Bild ohne Schattenrampe, also genau das, was ohne rampe.js
   * ohnehin da waere.
   * ======================================================================== */

  const _umg = new Float32Array(3);

  function rampeLeihen(gl, R, ctx) {
    const erg = {
      an: false, einheit: KARTE_EINHEIT,
      lichtFlaeche: 0.55, rampBreite: 1.0,
      glanzHaerte: 10, glanzMulti: 0,
      zeileFels: 0, zeileMauer: 0, umgebung: _umg,
    };
    const li = ctx.licht;
    _umg[0] = 1; _umg[1] = 1; _umg[2] = 1;

    const rp = R.rampe;
    if (!rp || !rp.tex || typeof rp.v !== 'function') return erg;

    const w = (ctx.regler && ctx.regler.rampe) || null;
    const hole = (k, vor) => (w && w[k] !== undefined && w[k] !== null) ? w[k] : vor;

    erg.einheit = (rp.einheit === undefined) ? 5 : rp.einheit;
    gl.activeTexture(gl.TEXTURE0 + erg.einheit);
    gl.bindTexture(gl.TEXTURE_2D, rp.tex.tex || rp.tex);

    erg.lichtFlaeche = Math.max(hole('lichtFlaeche', 0.55), 0.01);
    erg.rampBreite = Math.max(hole('rampBreite', 1.0), 0.01);
    erg.glanzHaerte = Math.max(hole('glanzHaerte', 10), 1);
    erg.glanzMulti = hole('glanzMulti', 0.14);
    erg.zeileFels = rp.v('fels');
    erg.zeileMauer = rp.v('mauer');

    /* Wortgleich mit rampe.js/vorbereiten. */
    const st = (li.staerke === undefined ? 1 : li.staerke) * hole('sonne', 1.0);
    const a = hole('umgebung', 1.0) * 0.5;
    _umg[0] = li.farbe[0] * st + (li.himmel[0] + li.boden[0]) * a;
    _umg[1] = li.farbe[1] * st + (li.himmel[1] + li.boden[1]) * a;
    _umg[2] = li.farbe[2] * st + (li.himmel[2] + li.boden[2]) * a;

    erg.an = true;
    return erg;
  }

  /* ==========================================================================
   * 5. Das Modul
   * ======================================================================== */

  const S = {
    bodenProg: null,
    felsProg: null,
    karteTex: null,
    notTex: null,
    karteHalb: 0,
    karteZeichen: '',
    felsAn: true,
    dunstStart: VORGABE.dunstStart,
    geklagt: false,
  };

  const KARTE_GROESSE = 512;
  const KARTE_EINHEIT = 2;     // 0 und 7 gehoeren gel.js, 4 schatten.js, 5 rampe.js

  function reglerWert(modul, key) {
    const w = modul.wert && modul.wert[key];
    return (w === undefined || w === null) ? VORGABE[key] : w;
  }

  /* Albedo-Tabelle: die von licht.js veroeffentlichten Genshin-Messwerte,
   * sonst meine eigenen. Genau das meint "Albedo auf das Niveau aus licht.js
   * anheben" — licht.js schreibt selbst dazu, boden.js koenne sie direkt
   * nehmen. */
  function albedo(ctx) {
    const a = ctx.licht && ctx.licht.albedo;
    return {
      boden: (a && a.boden) || NOT_ALBEDO.boden,
      gras: (a && a.gras) || NOT_ALBEDO.gras,
      fels: (a && a.fels) || NOT_ALBEDO.fels,
      mauer: (a && a.mauer) || NOT_ALBEDO.mauer,
    };
  }

  const _drei = [0, 0, 0];
  function mischDrei(a, b, k) {
    _drei[0] = a[0] + (b[0] - a[0]) * k;
    _drei[1] = a[1] + (b[1] - a[1]) * k;
    _drei[2] = a[2] + (b[2] - a[2]) * k;
    return _drei;
  }

  function karteBauen(gl, ctx, modul) {
    const welt = ctx.welt || { bounds: 26, obstacles: [] };
    const bounds = welt.bounds || 26;
    const breite = reglerWert(modul, 'kontaktBreite');
    const zeichen = (welt.obstacles || []).length + '/' + bounds + '/' + breite.toFixed(3);
    if (S.karteTex && S.karteZeichen === zeichen) return;

    const halb = bounds * 1.25;
    const daten = bandKarte(welt, KARTE_GROESSE, halb, breite);
    if (S.karteTex) S.karteTex.loeschen();
    S.karteTex = GRAFIK.textur(gl, {
      breite: KARTE_GROESSE, hoehe: KARTE_GROESSE,
      format: 'rgba8', filter: 'linear', daten,      // wrap: Vorgabe CLAMP_TO_EDGE
    });
    S.karteHalb = halb;
    S.karteZeichen = zeichen;
  }

  const modul = GRAFIK.modul({
    name: 'boden',
    ordnung: 20,

    /* `boden` kaeme schon ueber die Namensregel; `hindernisse` braucht die
     * ausdrueckliche Nennung. vorbereiten() setzt das Feld jedes Bild neu. */
    ersetzt: ['boden', 'hindernisse'],

    regler: [
      { key: 'zweitAnteil', min: 0, max: 1, step: 0.01, wert: VORGABE.zweitAnteil },
      { key: 'aussenAnteil', min: 0, max: 1, step: 0.01, wert: VORGABE.aussenAnteil },
      { key: 'raster', min: 0, max: 0.12, step: 0.005, wert: VORGABE.raster },
      { key: 'fleck', min: 0, max: 0.20, step: 0.005, wert: VORGABE.fleck },
      { key: 'kontakt', min: 0, max: 0.50, step: 0.01, wert: VORGABE.kontakt },
      { key: 'kontaktBreite', min: 0.1, max: 1.5, step: 0.02, wert: VORGABE.kontaktBreite },
      { key: 'kontaktObjekt', min: 0, max: 0.40, step: 0.01, wert: VORGABE.kontaktObjekt },
      { key: 'rampeExponent', min: 0.3, max: 2.0, step: 0.05, wert: VORGABE.rampeExponent },
      { key: 'dunstStart', min: 0, max: 2.5, step: 0.05, wert: VORGABE.dunstStart },
    ],

    aufbau(gl, R) {
      S.bodenProg = GRAFIK.programm(gl, VS_BODEN, FS_BODEN, 'boden.js — Boden');
      S.felsProg = GRAFIK.programm(gl, VS_FELS, FS_FELS, 'boden.js — Fels');
      /* Notkarte: 1x1, kein Band, neutrale Abweichung. Damit haengt an der
       * Textureinheit IMMER etwas Definiertes — ein Sampler ohne gebundene
       * Textur liefert je nach Treiber Schwarz, und Schwarz hiesse hier
       * "voller Kontaktsaum ueberall". */
      S.notTex = GRAFIK.textur(gl, {
        breite: 1, hoehe: 1, format: 'rgba8', filter: 'linear',
        daten: new Uint8Array([0, 0, 128, 255]),
      });
    },

    vorbereiten(gl, R, ctx) {
      /* Wer nimmt den Hindernis-Durchgang? */
      const fremd = fremdeUebernahme(modul, 'hindernisse');
      S.felsAn = !fremd;
      modul.ersetzt = S.felsAn ? ['boden', 'hindernisse'] : ['boden'];
      if (fremd && !S.geklagt) {
        S.geklagt = true;
        console.info('GRAFIK boden.js: Modul "' + fremd + '" hat den Durchgang '
          + '"hindernisse" uebernommen — die Felsrampe tritt zurueck, der Boden bleibt.');
      }

      /* Laeuft nebel.js, gehoert der Ferndunst dorthin. Zwei Nebelmodelle
       * uebereinander ergeben eine sichtbare Doppelkante (Plan G2, Falle 4).
       * `nebel` ist kein Grundzug, also hilft die Verdraengungsliste nicht —
       * hier zaehlt schlicht, ob ein aktives Modul so heisst. */
      S.dunstStart = reglerWert(modul, 'dunstStart');
      for (const m of GRAFIK.module()) {
        if (m === modul || m.aus) continue;
        if (m.name === 'nebel' || m.name === 'nebelboden') S.dunstStart = 0;
      }

      /* Karte backen, falls noetig. Faellt das Backen aus, laeuft der Boden
       * ohne Kontaktband weiter statt gar nicht. */
      try {
        karteBauen(gl, ctx, modul);
      } catch (e) {
        if (!S.geklagt) {
          S.geklagt = true;
          console.error('GRAFIK boden.js: Bodenkarte nicht gebacken, '
            + 'Kontaktband und Farbabweichung entfallen.\n', e);
        }
      }
    },

    zeichnen(gl, R, ctx) {
      const li = ctx.licht;
      const bounds = (ctx.welt && ctx.welt.bounds) || 26;

      /* --- Boden ---------------------------------------------------------- */
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);       // das Bodenquad liegt je nach Blick falschherum

      /* Nebeluniformen von nebel.js nachziehen. Das muss HIER stehen und
       * nicht in vorbereiten(): nebel.js hat ordnung 70, sein vorbereiten()
       * laeuft also nach meinem — aber alle vorbereiten() laufen vor allen
       * zeichnen(). Wer es in vorbereiten() setzt, benutzt die Nebelfarbe des
       * VORIGEN Bildes und sieht das im Tagesgang als Nachlauf. */
      if (NEBEL_DA && R.nebel && typeof R.nebel.setzen === 'function') {
        R.nebel.setzen(gl, S.bodenProg);
        if (S.felsAn) R.nebel.setzen(gl, S.felsProg);
      }

      const b = S.bodenProg;
      gl.useProgram(b);
      gl.bindVertexArray(R.quadMesh.vao);
      gl.uniformMatrix4fv(b.u.uViewProj, false, ctx.viewProj);
      gl.uniform1f(b.u.uSize, bounds * 3);
      gl.uniform1f(b.u.uBound, bounds);
      gl.uniform3fv(b.u.uCam, ctx.cam);
      gl.uniform3fv(b.u.uLichtRichtung, li.richtung);
      gl.uniform3fv(b.u.uSonne, li.farbe);
      gl.uniform3fv(b.u.uHimmelLicht, li.himmel);
      gl.uniform3fv(b.u.uBodenLicht, li.boden);
      gl.uniform3fv(b.u.uDunst, li.dunst);

      const alb = albedo(ctx);
      gl.uniform3fv(b.u.uInnen, alb.boden);
      gl.uniform3fv(b.u.uZweit,
        mischDrei(alb.boden, alb.gras, reglerWert(modul, 'zweitAnteil')).slice());
      gl.uniform3fv(b.u.uAussen,
        mischDrei(alb.boden, alb.gras, reglerWert(modul, 'aussenAnteil')).slice());

      gl.uniform1f(b.u.uRaster, reglerWert(modul, 'raster'));
      gl.uniform1f(b.u.uFleck, reglerWert(modul, 'fleck'));
      gl.uniform1f(b.u.uKontakt, S.karteTex ? reglerWert(modul, 'kontakt') : 0);
      gl.uniform1f(b.u.uDunstStart, S.dunstStart);
      gl.uniform1f(b.u.uKarteHalb, S.karteHalb || bounds * 1.25);
      gl.uniform1i(b.u.uKarte, (S.karteTex || S.notTex).binden(KARTE_EINHEIT));
      gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);

      /* --- Fels und Mauer ------------------------------------------------- */
      if (!S.felsAn) return;
      const hinder = (ctx.welt && ctx.welt.obstacles) || [];
      if (!hinder.length) { gl.activeTexture(gl.TEXTURE0); return; }

      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const f = S.felsProg;
      gl.useProgram(f);
      gl.uniformMatrix4fv(f.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(f.u.uCam, ctx.cam);
      gl.uniform3fv(f.u.uLichtRichtung, li.richtung);
      gl.uniform3fv(f.u.uSonne, li.farbe);
      gl.uniform3fv(f.u.uHimmelLicht, li.himmel);
      gl.uniform3fv(f.u.uBodenLicht, li.boden);
      gl.uniform1f(f.u.uExponent, reglerWert(modul, 'rampeExponent'));
      gl.uniform1f(f.u.uKontaktObj, reglerWert(modul, 'kontaktObjekt'));

      /* Rampe von rampe.js leihen, wenn sie da ist. Sonst Halblambert. */
      const rmp = rampeLeihen(gl, R, ctx);
      gl.uniform1f(f.u.uRampeAn, rmp.an ? 1 : 0);
      gl.uniform1i(f.u.uRampe, rmp.einheit);
      gl.uniform1f(f.u.uLichtFlaeche, rmp.lichtFlaeche);
      gl.uniform1f(f.u.uRampBreite, rmp.rampBreite);
      gl.uniform3fv(f.u.uUmgebung, rmp.umgebung);
      gl.uniform1f(f.u.uGlanzHaerte, rmp.glanzHaerte);
      gl.uniform1f(f.u.uGlanzMulti, rmp.glanzMulti);

      const rr = VORGABE.rampeR, rg = VORGABE.rampeG, rb = VORGABE.rampeB;
      const oben3 = new Float32Array(3), unten3 = new Float32Array(3);

      for (const o of hinder) {
        let mesh, oben, gloss, zeile;
        if (o.type === 'rock') {
          mesh = R.propMesh; oben = alb.fels; gloss = 0.12; zeile = rmp.zeileFels;
          gl.uniformMatrix4fv(f.u.uModel, false,
            trs(o.x, o.y, o.z, o.r, o.r * 0.8, o.r));
          gl.uniform1f(f.u.uBasis, o.y - o.r * 0.8);
          gl.uniform1f(f.u.uSpanne, o.r * 1.6);
        } else {
          mesh = R.boxMesh; oben = alb.mauer; gloss = 0.08; zeile = rmp.zeileMauer;
          gl.uniformMatrix4fv(f.u.uModel, false,
            trs(o.x, o.y, o.z, o.w * 0.5, o.h * 0.5, o.d * 0.5));
          gl.uniform1f(f.u.uBasis, o.y - o.h * 0.5);
          gl.uniform1f(f.u.uSpanne, o.h);
        }
        oben3[0] = oben[0]; oben3[1] = oben[1]; oben3[2] = oben[2];
        unten3[0] = oben[0] * rr; unten3[1] = oben[1] * rg; unten3[2] = oben[2] * rb;

        gl.uniformMatrix3fv(f.u.uNormalMat, false, _n);
        gl.uniform3fv(f.u.uOben, oben3);
        gl.uniform3fv(f.u.uUnten, unten3);
        gl.uniform1f(f.u.uGloss, gloss);
        gl.uniform1f(f.u.uRampZeile, zeile);
        gl.bindVertexArray(mesh.vao);
        gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

        /* Die Kontur bestellen. kontur.js hoert normalerweise an R.drawProp
         * mit; dieser Durchgang laeuft aber an R.solid vorbei, und dafuer
         * haelt kontur.js ausdruecklich einen Notausgang bereit. Ohne diese
         * drei Zeilen verloeren genau die Felsen ihre Linie — und zwar so,
         * dass es erst im fertigen Bild auffaellt. Die MITTLERE Rampenfarbe
         * geht hinein, damit die Linie zum Objekt passt. */
        if (GRAFIK.kontur && GRAFIK.kontur.anmelden) {
          _drei[0] = (oben3[0] + unten3[0]) * 0.5;
          _drei[1] = (oben3[1] + unten3[1]) * 0.5;
          _drei[2] = (oben3[2] + unten3[2]) * 0.5;
          GRAFIK.kontur.anmelden(mesh, _m, _n, _drei, 0);
        }
      }

      /* Der naechste Durchgang faengt bei Einheit 0 an. */
      gl.activeTexture(gl.TEXTURE0);
    },
  });

})();
