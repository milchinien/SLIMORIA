'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — G8: eine echte Schattenkarte statt der drei Bodendekale.
 *
 * Datei gehoert Lane GRAFIK (GRAFIK-MODULE.md §2). Sie aendert nichts ausser
 * sich selbst; `client/renderer.js` bleibt unberuehrt.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER PASSIERT — in der Reihenfolge, in der es geschieht
 *
 * Diese eine Datei meldet DREI Module an. Das ist Absicht und kein Versehen:
 * eine Schattenkarte sind drei getrennte Dinge, die zu verschiedenen Zeiten im
 * Bild passieren, und der Vertrag aus §3 kennt je Modul genau ein `zeichnen`.
 *
 *   'schatten'      ordnung  5   Erzeugt die Karte. Zeichnet die Werfer aus
 *                                Sicht des Hauptlichts in ein eigenes
 *                                Tiefenziel, 1024 x 1024, legt `ctx.schatten`
 *                                ab.
 *   'bodenschatten' ordnung 26   Legt den Schatten auf die Bodenebene, hinter
 *                                Boden (20) und Gras (25), VOR Hindernissen,
 *                                Kreaturen und Gesicht. Notbehelf, solange
 *                                kein Empfaenger den Schatten selbst in seine
 *                                Beleuchtung rechnet — siehe Vertrag unten.
 *   'dekale'        ordnung 50   Verdraengt den eingebauten Dekaldurchgang. Er
 *                                zeichnet dasselbe wie vorher — Schleimspur,
 *                                Zielring, Friedhof, Zielmarke — MINUS der
 *                                drei gestapelten Schattenflecken unter dem
 *                                Schleim und minus des Flecks unter jeder
 *                                Kreatur. Die sind jetzt echter Schattenwurf.
 *
 * Warum der Dekaldurchgang mit uebernommen werden muss: die drei Flecken
 * stehen in `renderer2.js` (Zeilen 1151–1158, mit dem Vermerk „Faellt weg,
 * sobald schatten.js eine echte Schattenkarte liefert, G8"). Diese Datei ist
 * gesperrt. Der einzige Weg, die Flecken loszuwerden, ist den Grundzug zu
 * verdraengen und ihn ohne sie neu zu zeichnen. Alles andere am Durchgang ist
 * wortgleich uebernommen, damit die Lesbarkeit des Ziels (GDD 10 §98) nicht
 * an dieser Stelle verlorengeht.
 *
 * ---------------------------------------------------------------------------
 * DER SCHATTEN GEHT VOR DIE RAMPE, NICHT DANACH
 *
 * Das ist die eine Entscheidung, an der dieser Schritt haengt
 * (PHASE-GRAFIK-PLAN G8). Wer den fertigen Farbwert mit einem Schattenfaktor
 * multipliziert, bekommt DREI Helligkeiten im Bild: Licht, Rampenschatten und
 * Rampenschatten-mal-Schlagschatten — und damit eine zweite Kante, die der
 * ersten widerspricht. Richtig ist, den Schatten in die NACHSCHLAGGROESSE der
 * Rampe zu rechnen:
 *
 *     ndl01 = schattenVorRampe(ndl01, s, uLichtFlaeche);
 *     vec3 schattenFarbe = texture(uRampe, vec2(u, zeile)).rgb;
 *
 * Dann liefert die Rampe im Schlagschatten GENAU ihr Schattenplateau — dasselbe
 * wie auf der lichtabgewandten Seite. Zwei Werte im Bild, nicht drei.
 *
 * Ein schoener Nebeneffekt, der die 2x2-Filterung rettet: der Bruchteil, den
 * die Hardware an der Schattenkante zurueckgibt, geht durch eine STUECKWEISE
 * KONSTANTE Rampe. Alles unterhalb der Lichtflaeche faellt auf denselben Wert.
 * Die Rampe HAERTET die Kante also nach — man bekommt die Glaettung der
 * Filterung, ohne den weichen Halbschatten, den der Stil verbietet
 * (GRAFIK-MODULE.md §0: „Harte Schattenkante, Flanke etwa 2 px").
 *
 * ---------------------------------------------------------------------------
 * DER VERTRAG MIT rampe.js / boden.js / gel.js
 *
 * `grafik/rampe.js` gab es beim Bau dieser Datei noch nicht. Deshalb steht der
 * Vertrag hier, und zwar so, dass er von beiden Seiten einhaltbar ist:
 *
 *  1. Baustein `GRAFIK.baustein('schatten')` bringt drei Funktionen mit:
 *
 *       float schattenAnteil(sampler2DShadow karte, mat4 lichtVP,
 *                            vec3 weltPos, vec4 par);
 *           1.0 = voll besonnt, 0.0 = ganz im Schatten. Ausserhalb der Karte
 *           immer 1.0 — nie ein dunkler Kasten am Rand.
 *
 *       float schattenVorRampe(float ndl01, float s, float lichtFlaeche);
 *           Drueckt ndl01 unter die Lichtflaeche, wo Schatten liegt. GENAU
 *           dieser Aufruf gehoert zwischen die Halblambert-Rechnung und den
 *           Rampenzugriff.
 *
 *       float schattenOhneGesicht(float s, float emissive);
 *           Nimmt das Gesicht aus. Siehe naechster Abschnitt.
 *
 *  2. Die drei Uniforms heissen bei ALLEN Empfaengern gleich:
 *
 *       uniform highp sampler2DShadow uSchattenKarte;
 *       uniform mat4  uSchattenVP;
 *       uniform vec4  uSchattenPar;
 *
 *     Wer sie so nennt, setzt sie mit einem Aufruf:
 *       if (ctx.schatten) ctx.schatten.setzen(prog, 4);   // Textureinheit 4
 *
 *  3. Wer den BODEN mit eigenem Schatten zeichnet — also boden.js, sobald es
 *     `schattenVorRampe` in seinen Bodenshader nimmt —, setzt in seinem
 *     `vorbereiten`:
 *       if (ctx.schatten) ctx.schatten.bodenVerbraucht = true;
 *     Dann schaltet der Notbehelf aus Punkt 4 ab. Ohne dieses Zeichen liegt
 *     der Schatten zweimal auf dem Boden. (`ctx.schatten.verbraucht` gilt als
 *     dasselbe Zeichen — beide Namen werden geprueft.)
 *
 *     Fuer Requisiten, Kreaturen und Gesicht ist NICHTS zu melden: der
 *     Notbehelf ruehrt sie nicht an, dort ist der Weg ueber rampe.js der
 *     einzige.
 *
 *  4. Notbehelf, solange der Boden den Schatten nicht selbst rechnet: dieses
 *     Modul legt ihn auf die Bodenebene, als multiplikativen Durchgang mit
 *     dem gemessenen Genshin-Faktor. Auf einer EBENEN Flaeche mit konstanter
 *     Normale ist das rechnerisch dasselbe, was die Rampe liefern wuerde: die
 *     ganze Ebene liegt auf einem einzigen Beleuchtungswert, ein konstanter
 *     Multiplikator erzeugt darum genau zwei Helligkeiten und keine dritte.
 *     Was er NICHT leisten kann und auch nicht vorgibt: Schatten auf Felsen,
 *     Mauern und Kreaturen. Die haben gekruemmte Normalen und eine Rampe —
 *     dort gehoert der Schatten in den Beleuchtungsterm, nicht auf das
 *     Ergebnis. Siehe BRAUCHT_FREMDAENDERUNG am Ende der Datei.
 *
 * ---------------------------------------------------------------------------
 * DAS GESICHT BLEIBT AUSGENOMMEN
 *
 * Zwei Seiten, beide noetig:
 *
 *   WERFEN: Augen, Pupillen, Glanzpunkte und Mund werden NICHT in die Karte
 *   gezeichnet. Sie liegen als flache Linsen unmittelbar unter der
 *   Geloberflaeche; in der Karte wuerden sie eine Kante erzeugen, die dann als
 *   Schatten der Nase auf dem eigenen Gesicht zurueckkaeme. Dasselbe gilt fuer
 *   die Kreaturenaugen.
 *
 *   EMPFANGEN: `schattenOhneGesicht(s, uEmissive)` gibt fuer jedes Teil mit
 *   uEmissive > 0 den Wert 1.0 zurueck. Die Gesichtsteile tragen uEmissive
 *   0,40 bis 0,95 (renderer2.js, zeichneGesicht) und stehen damit ohnehin
 *   ausserhalb der Lichtrechnung — das ist im Bestand schon Genshins
 *   Entscheidung, nur ohne Textur (PHASE-GRAFIK-PLAN §2). Der Schattenwurf
 *   muss sie ausdruecklich mitnehmen, sonst faellt der Koerperschatten des
 *   Schleims auf sein eigenes Gesicht — genau der Fehler, den Genshin mit der
 *   Abstandskarte vermeidet.
 *
 * ---------------------------------------------------------------------------
 * ZAHLEN, UND WOHER SIE KOMMEN
 *
 * Alles Folgende ist an `ref/genshin/` nachgemessen, nicht uebernommen
 * (tools/grafikmass.mjs, 2026-08-19):
 *
 *   figur_xingqiu_tageslicht_schlagschatten_1920.png, Zeile 700, x 900..1300 —
 *   die Kante des Saeulenschattens auf dem Steinboden:
 *     Licht     RGB(222, 222, 210)   L = 221,1
 *     Schatten  RGB(190, 188, 164)   L = 186,7
 *     Flanke    1 px bei 1920 Breite  (=> 0,8 px bei 1600)
 *     Verhaeltnis  L 0,844 · je Kanal R 0,856 / G 0,847 / B 0,781
 *
 * Daraus SCHATTEN_FARBE = (0.856, 0.847, 0.781). Der Rotkanal faellt am
 * wenigsten — der Schatten geht WAERMER, nicht kuehler. Das deckt sich mit
 * ref/tof/UNTERSCHIEDE.md §2 („B/R faellt von 0,92 auf 0,73") und widerlegt
 * den verbreiteten Reflex, Anime-Schatten blau zu faerben.
 *
 * Die Flanke von 0,8 px bei 1600x900 ist der Grund fuer hoechstens 2x2-PCF:
 * mehr Filterung waere ein Halbschatten, und den hat Genshin nachweislich
 * nicht.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 *
 * Kein Math.random, kein Date, kein performance.now. Die Lichtmatrix haengt
 * ausschliesslich an `ctx.licht.richtung` und am Kamerablickpunkt; beide sind
 * fuer eine gegebene Aufnahmezeit festgelegt. Die Kartenmitte wird zusaetzlich
 * auf ein Texelraster gerastet, damit die Kante beim Kameraschwenk nicht
 * kriecht — dieselbe Szene ergibt in jedem Lauf dieselbe Karte.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof GRAFIK === 'undefined' || !GRAFIK || !GRAFIK.modul) return;

  /* ==========================================================================
   * 0. Zahlen
   * ======================================================================== */

  const GROESSE = 1024;                       // Kantenlaenge der Karte (Plan G8)
  const LICHT_ABSTAND = 60;                   // Auge der Lichtsicht, in Metern
  const TIEFE_NAH = 1.0;
  const TIEFE_FERN = 140.0;                   // deckt die 52x52-m-Arena voll ab

  /* Gemessen an figur_xingqiu_tageslicht_schlagschatten_1920.png, Zeile 700.
   * Siehe Kopf der Datei. */
  const SCHATTEN_FARBE = new Float32Array([0.856, 0.847, 0.781]);

  /* ==========================================================================
   * 1. Der Shader-Baustein — der Vertrag, in GLSL
   *
   * Wird sofort beim Laden hinterlegt, nicht erst im Aufbau: rampe.js und
   * boden.js stehen in grafik/laden.js VOR dieser Datei, ihre `aufbau`-Aufrufe
   * laufen aber erst nach createRenderer2 — also nachdem alle Skripte geladen
   * sind. Damit ist der Baustein rechtzeitig da.
   * ======================================================================== */

  GRAFIK.bausteinSetzen('schatten', `
#ifndef GRAFIK_SCHATTEN
#define GRAFIK_SCHATTEN

/* Erwartete Uniforms beim Empfaenger — Namen sind Teil des Vertrags:
 *   uniform highp sampler2DShadow uSchattenKarte;
 *   uniform mat4  uSchattenVP;    Welt -> Licht-Klippraum
 *   uniform vec4  uSchattenPar;   x Vorspann (Tiefe 0..1)
 *                                 y Texelweite (1/Kantenlaenge)
 *                                 z Randabfall (Anteil der Karte, 0..0.5)
 *                                 w Staerke (1 = voll, 0 = aus)
 */

/* 1.0 = voll besonnt, 0.0 = ganz im Schatten.
 *
 * Ausserhalb der Karte IMMER 1.0. Ohne diese Klemmung steht am Rand der
 * Lichtsicht ein dunkler Kasten im Bild, und niemand findet ihn, weil er
 * aussieht wie ein Bodenmuster. */
float schattenAnteil(highp sampler2DShadow karte, mat4 lichtVP, vec3 weltPos, vec4 par) {
  vec4 lk = lichtVP * vec4(weltPos, 1.0);
  if (lk.w <= 0.0) return 1.0;
  vec3 p = lk.xyz / lk.w * 0.5 + 0.5;
  if (p.z > 1.0 || p.z < 0.0) return 1.0;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 1.0;

  /* Weicher Ausklang an den vier Kartenraendern. Nicht Weichheit des
   * Schattens — Weichheit seines GELTUNGSBEREICHS. */
  float rand = max(par.z, 1e-4);
  vec2 d = min(p.xy, 1.0 - p.xy);
  float gilt = clamp(min(d.x, d.y) / rand, 0.0, 1.0);

  /* textureProj mit sampler2DShadow: die Hardware vergleicht selbst und
   * filtert dabei 2x2 (Plan G8: hoechstens 2x2 PCF, kein weicher Halbschatten). */
  float sicht = textureProj(karte, vec4(p.xy, p.z - par.x, 1.0));

  return 1.0 - (1.0 - sicht) * gilt * par.w;
}

/* DER entscheidende Aufruf. Gehoert zwischen Halblambert und Rampenzugriff,
 * nicht hinter die Rampe (PHASE-GRAFIK-PLAN G8):
 *
 *   float n = ndl01(N, L);
 *   n = schattenVorRampe(n, s, uLichtFlaeche);
 *   vec3 ton = texture(uRampe, vec2(rampenU(n), zeile)).rgb;
 *
 * Warum nicht "farbe *= s": dann gaebe es drei Helligkeiten im Bild statt
 * zwei, und die zweite Kante widerspraeche der ersten. */
float schattenVorRampe(float ndl01Wert, float s, float lichtFlaeche) {
  return mix(min(ndl01Wert, lichtFlaeche - 0.001), ndl01Wert, clamp(s, 0.0, 1.0));
}

/* Fuer den Fall, dass ein Empfaenger doch multiplikativ arbeiten muss (Gel,
 * Dekale — beides ohne Rampe). Mischt zur gemessenen Schattenfarbe statt zu
 * Schwarz. */
vec3 schattenMultiplikator(float s, vec3 schattenFarbe) {
  return mix(schattenFarbe, vec3(1.0), clamp(s, 0.0, 1.0));
}

/* Das Gesicht empfaengt nie einen Schatten. Augen, Pupille, Glanzpunkt und
 * Mund tragen uEmissive 0,40..0,95; alles darueber null ist Gesicht.
 * Ein Anime-Gesicht mit einem Nasenschatten wirkt sofort dreidimensional und
 * stilfremd — das ist Genshins eigentliche Pointe hinter der Abstandskarte. */
float schattenOhneGesicht(float s, float emissive) {
  return emissive > 0.0 ? 1.0 : s;
}
#endif
`);

  /* ==========================================================================
   * 2. Mathe, die diese Datei selbst braucht
   *
   * M4 aus core.js hat perspective/lookAt/multiply/trs — kein ortho, und die
   * beiden Modellmatrizen der Kreaturenteile liegen als private Funktionen in
   * renderer2.js. Beides steht hier noch einmal, weil fremde Dateien gelesen
   * und nicht geaendert werden (GRAFIK-MODULE.md §2).
   * ======================================================================== */

  /* Orthographische Projektion, Spaltenordnung wie M4.perspective.
   * Fenster frei verschiebbar (l/r/b/t), damit die Karte auf den Blickpunkt
   * gerastet werden kann, ohne die Blickmatrix anzufassen. */
  function ortho(l, r, b, t, n, f) {
    const out = new Float32Array(16);
    out[0] = 2 / (r - l);
    out[5] = 2 / (t - b);
    out[10] = -2 / (f - n);
    out[12] = -(r + l) / (r - l);
    out[13] = -(t + b) / (t - b);
    out[14] = -(f + n) / (f - n);
    out[15] = 1;
    return out;
  }

  const _mm = new Float32Array(16);
  const EINHEIT = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

  function trs(tx, ty, tz, sx, sy, sz) {
    _mm[0] = sx; _mm[1] = 0; _mm[2] = 0; _mm[3] = 0;
    _mm[4] = 0; _mm[5] = sy; _mm[6] = 0; _mm[7] = 0;
    _mm[8] = 0; _mm[9] = 0; _mm[10] = sz; _mm[11] = 0;
    _mm[12] = tx; _mm[13] = ty; _mm[14] = tz; _mm[15] = 1;
    return _mm;
  }

  /* Formgleich mit yawModel in renderer2.js — dieselbe Lage, damit der
   * Schatten die Silhouette trifft, die auch gezeichnet wird. */
  function yawModel(px, py, pz, sx, sy, sz, c, s) {
    _mm[0] = sx * c; _mm[1] = 0; _mm[2] = sx * s; _mm[3] = 0;
    _mm[4] = 0; _mm[5] = sy; _mm[6] = 0; _mm[7] = 0;
    _mm[8] = -sz * s; _mm[9] = 0; _mm[10] = sz * c; _mm[11] = 0;
    _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
    return _mm;
  }

  const _B = { ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 };

  function tangentBasis(nx, ny, nz, out) {
    const steil = Math.abs(ny) > 0.92;
    const ay = steil ? 0 : 1, az = steil ? 1 : 0;
    let ux = ay * nz - az * ny;
    let uy = az * nx;
    let uz = -ay * nx;
    const l = Math.hypot(ux, uy, uz) || 1;
    ux /= l; uy /= l; uz /= l;
    out.ux = ux; out.uy = uy; out.uz = uz;
    out.vx = ny * uz - nz * uy;
    out.vy = nz * ux - nx * uz;
    out.vz = nx * uy - ny * ux;
  }

  function patchModel(px, py, pz, B, nx, ny, nz, ru, rv, rn) {
    _mm[0] = B.ux * ru; _mm[1] = B.uy * ru; _mm[2] = B.uz * ru; _mm[3] = 0;
    _mm[4] = B.vx * rv; _mm[5] = B.vy * rv; _mm[6] = B.vz * rv; _mm[7] = 0;
    _mm[8] = nx * rn; _mm[9] = ny * rn; _mm[10] = nz * rn; _mm[11] = 0;
    _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
    return _mm;
  }

  /* ==========================================================================
   * 3. Programme
   * ======================================================================== */

  /* Werferdurchgang: nur Lage, keine Farbe. Der Fragment-Shader schreibt
   * nichts — das Ziel hat gar keinen Farbanhang (drawBuffers NONE). */
  const VS_WERFER = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uLichtVP;
uniform mat4 uModel;
void main() {
  gl_Position = uLichtVP * uModel * vec4(aPos, 1.0);
}`;

  const FS_WERFER = `#version 300 es
precision mediump float;
void main() {}`;

  /* Notbehelf-Empfaenger auf der Bodenebene.
   *
   * WORTGLEICH mit VS_GROUND aus renderer2.js: dieselbe Ebene, dieselbe
   * Ausdehnung, also deckungsgleich dieselben Bildpixel.
   *
   * Gezeichnet wird bei ordnung 21 — direkt nach dem Boden und VOR allem
   * anderen. Damit braucht dieser Durchgang GAR KEINEN Tiefentest: zu diesem
   * Zeitpunkt stehen im Bild nur Himmel und Boden, und die Bodenebene deckt
   * exakt die Bodenpixel. Hindernisse, Kreaturen und Gesicht werden danach
   * undurchsichtig darueber gezeichnet und ueberschreiben den Schatten dort,
   * wo sie stehen.
   *
   * Der Umweg ueber den Tiefentest waere die naheliegende Loesung und die
   * schlechtere: zwei getrennt uebersetzte Programme muessen fuer dieselbe
   * Formel nicht bitgleiche Tiefen liefern, und ein Streit um Z waere hier
   * ein Flimmern ueber die groesste Flaeche des Bildes. */
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
${GRAFIK.baustein('schatten')}
in vec3 vWorld;
uniform highp sampler2DShadow uSchattenKarte;
uniform mat4 uSchattenVP;
uniform vec4 uSchattenPar;
uniform vec3 uSchattenFarbe;
uniform float uBound;
out vec4 outColor;
void main() {
  float s = schattenAnteil(uSchattenKarte, uSchattenVP, vWorld, uSchattenPar);

  /* HAERTEN. Das ist der Ersatz fuer die Rampe, und ohne ihn ist der ganze
   * Durchgang falsch.
   *
   * Gemessen ohne diese Zeile: die Flanke ist 8 bis 15 px breit. Das liegt
   * nicht an der Filterung an sich, sondern am Massstab — ein Texel der Karte
   * ist bei spanne 14 rund 2,7 cm breit, und im Vordergrund einer flachen
   * Kamera deckt es ueber sechs Bildpixel. Die 2x2-Filterung verschmiert dann
   * ueber genau diese Strecke. Genshin misst 1 px bei 1920.
   *
   * Ein Empfaenger MIT Rampe hat das Problem nicht: dort faellt jeder Wert
   * unterhalb der Lichtflaeche auf dasselbe Plateau, die stueckweise konstante
   * Rampe haertet die Kante von selbst nach. Wo keine Rampe ist, muss dieselbe
   * Schwelle von Hand gezogen werden — mit fwidth, damit sie auf genau eine
   * Pixelbreite geglaettet wird und nicht saegt. Derselbe Griff wie bei der
   * Glanzstufe in rampe.js. */
  float br = max(fwidth(s), 1e-5);
  s = smoothstep(0.5 - br, 0.5 + br, s);

  /* In den Dunst hinein wird der Schatten zurueckgenommen — mit GENAU dem
   * Ausdruck, mit dem FS_GROUND den Boden in den Dunst legt. Liefe er anders,
   * risse dort eine zweite Kante auf, und zwar an der empfindlichsten Stelle
   * des Bildes (PHASE-GRAFIK-PLAN §1.1: uNebel und uDunst muessen dieselbe
   * Rechnung sein). */
  float dunst = smoothstep(uBound * 0.7, uBound * 1.6, length(vWorld.xz));
  s = mix(s, 1.0, dunst);

  /* Multiplikativ gemischt (Mischbetrieb DST_COLOR/ZERO). Der Multiplikator
   * ist KONSTANT — deshalb entstehen ueber der Ebene genau zwei Helligkeiten
   * und keine dritte, und die Kante bleibt die eine Kante der Karte. */
  outColor = vec4(schattenMultiplikator(s, uSchattenFarbe), 1.0);
}`;

  /* ==========================================================================
   * 4. Modul A — die Karte
   * ======================================================================== */

  const K = {
    ziel: null,          // GRAFIK.textur(...) mit Framebuffer
    werfer: null,        // Programm
    lichtVP: new Float32Array(16),
    view: new Float32Array(16),
    par: new Float32Array(4),
    ctx: null,           // von vorbereiten gefuellt
  };

  const modulSchatten = GRAFIK.modul({
    name: 'schatten',
    ordnung: 5,

    regler: [
      /* OBERgrenze der halben Kantenlaenge des abgedeckten Quadrats, in
       * Metern; darunter geht die Karte mit dem Kameraabstand mit (siehe
       * vorbereiten). 16 m ergeben bei 1024 Texeln 3,1 cm je Texel, im
       * Nahblick (dist 5, spanne 7) sind es 1,4 cm. Der Schleim mit Radius
       * 0,9 m ist damit 58 bis 128 Texel breit und seine Verformung in der
       * Silhouette ablesbar. Die ganze Arena (bounds 26) auf einmal waere
       * 5,1 cm je Texel und der Schleimschatten ein Klotz — dann saehe man das
       * Verfahren statt die Figur (GDD 01 §63: der Schleim ist die Figur). */
      { key: 'spanne', min: 6, max: 34, step: 0.5, wert: 16 },
      /* Vorspann in Metern. Gegen Selbstverschattung. Klein, weil die
       * Bodenebene gar nicht in die Karte gezeichnet wird und deshalb auf ihr
       * kein Streifenmuster entstehen KANN — der Vorspann arbeitet nur an
       * Werfern, die zugleich Empfaenger sind. */
      { key: 'vorspann', min: 0, max: 0.5, step: 0.005, wert: 0.03 },
      { key: 'staerke', min: 0, max: 1, step: 0.01, wert: 1.0 },
      /* Ausklang am Kartenrand, als Anteil der Kartenbreite. */
      { key: 'randabfall', min: 0.01, max: 0.4, step: 0.01, wert: 0.06 },
      /* Werfen Kreaturen mit? Zum Abschalten, falls die Kosten druecken. */
      { key: 'kreaturen', min: 0, max: 1, step: 1, wert: 1 },
    ],

    aufbau(gl, R) {
      /* Tiefe als TEXTUR, nicht als Renderpuffer — nur so ist sie lesbar.
       * `vergleich: true` schaltet COMPARE_REF_TO_TEXTURE ein; damit wird aus
       * dem Sampler ein sampler2DShadow und textureProj vergleicht selbst.
       * `filter: 'linear'` ergibt die 2x2-Filterung der Hardware. NEAREST
       * waere haerter, aber die Kante saegt dann entlang des Texelrasters —
       * eine Treppe ist keine harte Kante, sie ist eine falsche. */
      K.ziel = GRAFIK.textur(gl, {
        breite: GROESSE, hoehe: GROESSE,
        format: 'tiefe24',
        filter: 'linear',
        vergleich: true,
        ziel: true,
      });

      K.werfer = GRAFIK.programm(gl, VS_WERFER, FS_WERFER, 'schatten/werfer');
    },

    vorbereiten(gl, R, ctx) {
      const w = modulSchatten.wert;

      /* --- Wie gross ist das abgedeckte Quadrat? -------------------------
       * Eine feste Groesse ist an beiden Enden falsch. Bei dist 4 (Nahblick
       * auf den Schleim) verschenkt sie Aufloesung: ein Texel deckt dann
       * mehrere Bildpixel und die Kante verschmiert. Bei dist 24 (Fernsicht
       * ueber die Arena) reicht sie nicht bis zum Rand.
       *
       * Also mit dem Kameraabstand mitgehen. Das ist deterministisch — der
       * Abstand ist Teil des Szenarios, nicht des Zufalls — und es haelt die
       * Kantenschaerfe ueber den ganzen Abstandsbereich ungefaehr konstant:
       * das Sichtfeld waechst mit dem Abstand, die Karte waechst mit.
       * `spanne` ist die OBERgrenze, nicht der feste Wert. */
      const dist = (ctx.camera && ctx.camera.dist) ? ctx.camera.dist : 9.5;
      const spanne = Math.max(4, Math.min(w.spanne, dist * 1.4));

      /* --- Lichtrichtung. `ctx.licht.richtung` IST R.light; capture.js stellt
       * darueber den Sonnenstand der Grafik-Szenarien. ------------------- */
      const Lr = ctx.licht && ctx.licht.richtung ? ctx.licht.richtung : R.light;
      let lx = Lr[0], ly = Lr[1], lz = Lr[2];
      const ll = Math.hypot(lx, ly, lz) || 1;
      lx /= ll; ly /= ll; lz /= ll;
      /* Eine Sonne exakt am Horizont wirft einen unendlich langen Schatten und
       * macht die Blickmatrix entartet. 0,12 entspricht rund 7 Grad Hoehe. */
      if (ly < 0.12) {
        const s = Math.hypot(lx, lz) || 1;
        const rest = Math.sqrt(Math.max(1 - 0.12 * 0.12, 0));
        lx = lx / s * rest; lz = lz / s * rest; ly = 0.12;
      }

      /* --- Feste Blickmatrix. Auge im Weltursprung plus Lichtrichtung; das
       * Fenster wird spaeter verschoben. So haengt `view` NUR an der
       * Lichtrichtung, und die Rasterung auf Texel wird eine reine
       * Verschiebung des Fensters — der saubere Weg gegen kriechende
       * Schattenkanten beim Kameraschwenk. -------------------------------- */
      const steil = Math.abs(ly) > 0.99;
      const up = steil ? [0, 0, 1] : [0, 1, 0];
      const view = M4.lookAt(
        [lx * LICHT_ABSTAND, ly * LICHT_ABSTAND, lz * LICHT_ABSTAND],
        [0, 0, 0], up);
      K.view.set(view);

      /* --- Mitte der Karte: der Blickpunkt der Kamera. Er folgt dem Schleim,
       * wenn die Kamera folgt, und steht sonst fest. Damit liegt die Karte
       * immer dort, wo hingesehen wird. ---------------------------------- */
      const c = ctx.camera;
      const mx = c ? c.tx : 0, my = c ? c.ty : 0, mz = c ? c.tz : 0;

      /* Mitte in Lichtkoordinaten. */
      let cx = view[0] * mx + view[4] * my + view[8] * mz + view[12];
      let cy = view[1] * mx + view[5] * my + view[9] * mz + view[13];

      /* Auf ganze Texel rasten. Ohne das wandert das Texelraster unter der
       * Schattenkante durch, sobald sich die Kamera bewegt, und die Kante
       * flimmert — bei harten Kanten faellt das sofort auf. */
      const texel = (2 * spanne) / GROESSE;
      cx = Math.round(cx / texel) * texel;
      cy = Math.round(cy / texel) * texel;

      const proj = ortho(cx - spanne, cx + spanne, cy - spanne, cy + spanne,
                         TIEFE_NAH, TIEFE_FERN);
      M4.multiply(proj, view, K.lichtVP);

      /* Vorspann von Metern in Tiefenwerte 0..1 umrechnen. */
      K.par[0] = w.vorspann / (TIEFE_FERN - TIEFE_NAH);
      K.par[1] = 1 / GROESSE;
      K.par[2] = w.randabfall;
      K.par[3] = w.staerke;

      /* --- Veroeffentlichen (GRAFIK-MODULE.md §3, ctx.schatten) ---------- */
      const s = ctx.schatten || (ctx.schatten = {});
      s.tex = K.ziel.tex;
      s.groesse = GROESSE;
      s.vp = K.lichtVP;
      s.par = K.par;
      s.farbe = SCHATTEN_FARBE;
      s.spanne = spanne;
      s.gueltig = true;
      /* Zeitstempel der Karte. Wird das Modul im Tuning-Panel abgeschaltet,
       * bleibt `ctx.schatten` als Leiche stehen — der Empfaenger wuerde dann
       * eine Karte von vor zehn Sekunden ueber das Bild legen. Er vergleicht
       * deshalb gegen ctx.time und zeichnet nur, wenn die Karte AUS DIESEM
       * BILD stammt. */
      s.zeit = ctx.time;
      /* Muss JEDES Bild zurueckgesetzt werden: ein Empfaenger, der
       * abgeschaltet wurde, darf den Notbehelf nicht dauerhaft blockieren. */
      s.bodenVerbraucht = false;
      s.verbraucht = false;            // aelterer Name, gilt gleichbedeutend
      s.binden = (einheit) => {
        const e = einheit || 0;
        gl.activeTexture(gl.TEXTURE0 + e);
        gl.bindTexture(gl.TEXTURE_2D, K.ziel.tex);
        return e;
      };
      s.setzen = (prog, einheit) => {
        const e = s.binden(einheit === undefined ? 4 : einheit);
        const u = prog && (prog.u || prog);
        if (!u) return e;
        if (u.uSchattenKarte) gl.uniform1i(u.uSchattenKarte, e);
        if (u.uSchattenVP) gl.uniformMatrix4fv(u.uSchattenVP, false, K.lichtVP);
        if (u.uSchattenPar) gl.uniform4fv(u.uSchattenPar, K.par);
        if (u.uSchattenFarbe) gl.uniform3fv(u.uSchattenFarbe, SCHATTEN_FARBE);
        return e;
      };
      K.ctx = s;
    },

    zeichnen(gl, R, ctx) {
      const w = modulSchatten.wert;

      gl.bindFramebuffer(gl.FRAMEBUFFER, K.ziel.fbo);
      gl.viewport(0, 0, GROESSE, GROESSE);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.clearDepth(1.0);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      /* Vorderseiten wegwerfen. Gespeichert wird damit die RUECKseite des
       * Werfers. Der Empfaenger liegt immer noch weiter hinten, der Schatten
       * stimmt also — aber die Selbstverschattung eines Werfers beginnt erst
       * hinter seinem eigenen Volumen. Das ist der billigste wirksame Schutz
       * gegen Streifenmuster, und er kostet nichts. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);

      const p = K.werfer;
      gl.useProgram(p);
      gl.uniformMatrix4fv(p.u.uLichtVP, false, K.lichtVP);

      const zeichneNetz = (mesh, model) => {
        gl.bindVertexArray(mesh.vao);
        gl.uniformMatrix4fv(p.u.uModel, false, model);
        gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);
      };

      /* --- 1. Der Schleim. Die Figur, also der wichtigste Werfer. --------
       * Die Punkte muessen hier selbst hochgeladen werden: der Gel-Durchgang
       * tut das erst bei ordnung 60, im Puffer stuende sonst das VORIGE Bild.
       * Ein Schatten, der dem Koerper um ein Bild hinterherlaeuft, ist bei
       * einem Aufprall sofort zu sehen. */
      if (R.slimeMesh && ctx.surface) {
        gl.bindVertexArray(R.slimeMesh.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, R.slimeMesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
        gl.uniformMatrix4fv(p.u.uModel, false, EINHEIT);
        gl.drawElements(gl.TRIANGLES, R.slimeMesh.count,
                        R.slimeMesh.typ || gl.UNSIGNED_SHORT, 0);
      }

      /* --- 2. Hindernisse. Dieselben Koerper wie in zeichneHindernisse. --- */
      if (ctx.welt && ctx.welt.obstacles) {
        for (const o of ctx.welt.obstacles) {
          if (o.type === 'rock') {
            zeichneNetz(R.propMesh, trs(o.x, o.y, o.z, o.r, o.r * 0.8, o.r));
          } else {
            zeichneNetz(R.boxMesh,
              trs(o.x, o.y, o.z, o.w * 0.5, o.h * 0.5, o.d * 0.5));
          }
        }
      }

      /* --- 3. Kreaturen, OHNE Augen. ------------------------------------- */
      if (w.kreaturen > 0.5 && ctx.game) kreaturenWerfen(gl, R, ctx, zeichneNetz);

      gl.cullFace(gl.BACK);
      /* Das Ziel bindet renderScene2 nach jedem Modul selbst zurueck; der
       * Tiefenvergleich nicht — der wuerde sonst auf LESS stehenbleiben,
       * wenn ihn hier jemand aendert. Sicherheitshalber gesetzt. */
      gl.depthFunc(gl.LESS);
    },
  });

  /* Die Koerperteile der drei Kreaturenarten, lagegleich mit
   * renderer2.js/zeichneKreaturen — MINUS aller `auge()`-Aufrufe.
   *
   * Ein Auge ist eine flache Linse dicht unter der Oberflaeche. In der Karte
   * erzeugt es eine eigene Kante, die als Schatten auf demselben Gesicht
   * zurueckkommt. Genau das vermeidet Genshin mit seiner Abstandskarte, und
   * genau deshalb steht hier keine Zeile `auge(...)`. */
  function kreaturenWerfen(gl, R, ctx, zeichneNetz) {
    const b = ctx.slime.body;

    for (const k of ctx.game.kreaturen) {
      const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1)
              * (k.lebt ? 1 : Math.max(0, 1 - k.tot));
      if (f <= 0.01) continue;
      const g = k.groesse * f;

      let hx = b.cx - k.x, hz = b.cz - k.z;
      const hl = Math.hypot(hx, hz) || 1;
      hx /= hl; hz /= hl;

      const sack = k.lebt ? 1 : Math.max(0.2, 1 - 0.65 * k.tot);
      const wack = Math.sin(k.wackeln) * 0.05;

      const teil = (vor, hoch, quer, lx, ly, lz) => {
        zeichneNetz(R.propMesh,
          yawModel(k.x + hx * vor * g - hz * quer * g,
                   k.y + hoch * g * sack,
                   k.z + hz * vor * g + hx * quer * g,
                   lx * g, ly * g * sack, lz * g, hx, hz));
      };

      const spitze = (vor, hoch, quer, dv, dh, dq, laenge, dick) => {
        let dx = hx * dv - hz * dq, dy = dh, dz = hz * dv + hx * dq;
        const l = Math.hypot(dx, dy, dz) || 1;
        dx /= l; dy /= l; dz /= l;
        const px = k.x + hx * vor * g - hz * quer * g;
        const py = k.y + hoch * g * sack;
        const pz = k.z + hz * vor * g + hx * quer * g;
        const halb = laenge * g * 0.5;
        tangentBasis(dx, dy, dz, _B);
        zeichneNetz(R.propMesh,
          patchModel(px + dx * halb, py + dy * halb, pz + dz * halb,
                     _B, dx, dy, dz, dick * g, dick * g, halb));
      };

      if (k.art === 'eber') {
        teil( 0.42, 0.24,  0.34, 0.17, 0.24, 0.17);
        teil( 0.42, 0.24, -0.34, 0.17, 0.24, 0.17);
        teil(-0.40, 0.24,  0.32, 0.17, 0.24, 0.17);
        teil(-0.40, 0.24, -0.32, 0.17, 0.24, 0.17);
        teil(-0.05, 0.78,  0.00, 0.78, 0.56, 0.58);
        teil( 0.34, 1.04,  0.00, 0.42, 0.44, 0.44);
        spitze( 0.30, 1.34, 0.0, -0.35, 1.0, 0.0, 0.36, 0.06);
        spitze( 0.02, 1.26, 0.0, -0.40, 1.0, 0.0, 0.32, 0.06);
        teil( 0.92, 0.68,  0.00, 0.36, 0.34, 0.34);
        teil( 1.26, 0.56,  0.00, 0.24, 0.20, 0.22);
        spitze( 1.28, 0.60,  0.16, 0.45, 0.85,  0.12, 0.42, 0.055);
        spitze( 1.28, 0.60, -0.16, 0.45, 0.85, -0.12, 0.42, 0.055);
        /* auge(1.06, 0.86, ±0.18) — bewusst weggelassen. */

      } else if (k.art === 'schleimling') {
        teil( 0.00, 0.62,  0.00, 0.85, 0.62, 0.80);
        teil(-0.05, 1.16 + wack * 2.0, 0.0, 0.24, 0.30, 0.24);
        teil( 0.76, 0.44,  0.00, 0.14, 0.06, 0.09);
        /* auge(0.62, 0.74, ±0.26) — bewusst weggelassen. */

      } else {
        teil( 0.45, 0.42,  0.30, 0.145, 0.42, 0.145);
        teil( 0.45, 0.42, -0.30, 0.145, 0.42, 0.145);
        teil(-0.42, 0.42,  0.28, 0.145, 0.42, 0.145);
        teil(-0.42, 0.42, -0.28, 0.145, 0.42, 0.145);
        teil( 0.00, 0.95,  0.00, 0.72, 0.40, 0.36);
        teil( 0.45, 1.00,  0.00, 0.36, 0.38, 0.34);
        teil( 1.05, 1.30 + wack, 0.0, 0.32, 0.28, 0.26);
        teil( 1.42, 1.20 + wack, 0.0, 0.26, 0.14, 0.15);
        spitze( 0.98, 1.46 + wack,  0.14, 0.10, 1.0,  0.35, 0.44, 0.07);
        spitze( 0.98, 1.46 + wack, -0.14, 0.10, 1.0, -0.35, 0.44, 0.07);
        spitze(-0.72, 1.05, 0.0, -0.70, 0.90, 0.0, 0.85, 0.125);
        /* auge(1.22, 1.36 + wack, ±0.13) — bewusst weggelassen. */
      }
    }
  }

  /* ==========================================================================
   * 5. Modul B — der Schatten auf der Bodenebene
   *
   * Notbehelf, solange kein Empfaenger den Schatten selbst in seine
   * Beleuchtung rechnet (Kopf der Datei, Vertrag Punkt 3 und 4).
   *
   * ordnung 26: hinter Boden (20) und Gras (25), vor Hindernissen (30),
   * Kreaturen (40) und Gesicht (45). Zu diesem Zeitpunkt stehen im Bild nur
   * Himmel, Boden und Gras — der Durchgang braucht darum keinen Tiefentest:
   * die Bodenebene deckt genau die Flaeche, die verdunkelt werden soll, und
   * alles Undurchsichtige danach ueberschreibt ihn von selbst.
   * ======================================================================== */

  const B2 = { prog: null };

  GRAFIK.modul({
    name: 'bodenschatten',
    ordnung: 26,

    aufbau(gl, R) {
      B2.prog = GRAFIK.programm(gl, VS_BODEN, FS_BODEN, 'schatten/bodenempfaenger');
    },

    zeichnen(gl, R, ctx) {
      const s = ctx.schatten;
      if (!s || !s.gueltig || !B2.prog) return;
      if (s.bodenVerbraucht || s.verbraucht) return;   // boden.js macht es selbst
      if (s.zeit !== ctx.time) return;                 // Karte nicht aus diesem Bild

      gl.useProgram(B2.prog);
      gl.bindVertexArray(R.quadMesh.vao);

      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);

      /* Multiplikativ. Dort gehoert ein Schattenfaktor hin, solange die
       * Zielflaeche keine eigene Rampe hat. */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.DST_COLOR, gl.ZERO);

      gl.uniformMatrix4fv(B2.prog.u.uViewProj, false, ctx.viewProj);
      gl.uniform1f(B2.prog.u.uSize, ctx.welt.bounds * 3);
      gl.uniform1f(B2.prog.u.uBound, ctx.welt.bounds);
      s.setzen(B2.prog, 4);
      gl.activeTexture(gl.TEXTURE0);

      gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);

      /* Grundzustand wiederherstellen — der naechste Durchgang darf sich auf
       * nichts von hier verlassen (renderer2.js §5). */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
    },
  });

  /* ==========================================================================
   * 6. Modul C — der Dekaldurchgang ohne die drei Schattenflecken
   *
   * Verdraengt den Grundzug 'dekale' ueber die Namensregel (renderer2.js §6).
   * Alles, was der Bestand hier zeichnet, wird weiter gezeichnet — bis auf die
   * Schattenflecken, die dieser Schritt gerade ersetzt.
   * ======================================================================== */

  GRAFIK.modul({
    name: 'dekale',
    ordnung: 50,

    zeichnen(gl, R, ctx) {
      /* Uebernommen aus renderer2.js/zeichneDekale. Weggefallen sind:
       *   - die drei gestapelten Schattenflecken unter dem Schleim
       *   - der Schattenfleck unter jeder Kreatur
       * Beide sind jetzt echter Schattenwurf. Alles andere ist Spielinhalt:
       * die Schleimspur, der Zielring, der Friedhofsring und die Zielmarke
       * tragen Lesbarkeit (GDD 10 §98) und bleiben. */
      const viewProj = ctx.viewProj, pal = ctx.pal;
      const slime = ctx.slime;

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);

      for (const t of slime.trail) {
        R.drawDecal(t.x, t.z, t.r, pal.trail, Math.max(0, t.life) * 0.26, false, viewProj);
      }

      if (ctx.game) {
        for (const k of ctx.game.kreaturen) {
          const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1);
          if (f <= 0.01) continue;
          if (ctx.game.zielId === k.id) {
            const pz = 1 + Math.sin(ctx.time * 5) * 0.04;
            R.drawDecal(k.x, k.z, (k.groesse * 1.8 + 0.35) * pz,
                        [1.0, 0.80, 0.32], 0.70, true, viewProj);
          }
        }
        if (ctx.welt.friedhof) {
          R.drawDecal(ctx.welt.friedhof.x, ctx.welt.friedhof.z, 2.2,
                      [0.62, 0.80, 0.98], 0.34, true, viewProj);
        }
      }

      if (slime.target) {
        const pulse = 1 + Math.sin(ctx.time * 6) * 0.08;
        R.drawDecal(slime.target.x, slime.target.z, 0.7 * pulse,
                    [0.45, 1.0, 0.75], 0.8, true, viewProj);
      }

      gl.depthMask(true);
      gl.disable(gl.BLEND);
    },
  });

  /* Damit man in der Konsole nachsehen kann, was gerade gilt. */
  GRAFIK.schatten = K;

})();
