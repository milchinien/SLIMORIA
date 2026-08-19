'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik G4 — Schattenrampe statt Lambert, harte Glanzstufe statt
 * weichem Blinn-Phong. Fuer alles Undurchsichtige.
 *
 * WARUM DIESER SCHRITT DER KERN IST
 * Genshin und Tower of Fantasy unterscheiden sich an genau einer Stelle als
 * verschiedene FUNKTIONSKLASSEN: Genshins Beleuchtung ist stueckweise
 * konstant (Plateau, 2 px Stufe, Plateau), ToFs ist stetig. Nachgemessen an
 * `ref/genshin/figur_fischl_oberkoerper_cel_crop.png`, Zeile 470:
 *   Lichtplateau   RGB(247,238,227)  ueber 30 px, Streuung ±1
 *   Flanke         2 px
 *   Schattenplateau RGB(243,195,178)
 *   Verhaeltnis Schatten/Licht  0,854   (kanalweise 0,984 / 0,819 / 0,784)
 * Dieselbe Zeile durch `tools/grafikmass.mjs` gibt Flanke 2 px und 0,853 —
 * das Werkzeug und das Dossier sind sich einig, die Zahlen sind belastbar.
 *
 * Zum Vergleich derselbe Schnitt bei ToF (`ref/tof/figur-nah-tageslicht-
 * herbst.jpg`): der Oberschenkel laeuft ueber rund 70 px stetig aus, groesster
 * Einzelschritt 8 Stufen. Faktor 12 in der Flankensteilheit. Wer die Rampe
 * weglaesst, baut ToF — egal was er sonst tut.
 *
 * WAS DIESES MODUL TUT
 * Es ersetzt KEINEN Grundzug (es heisst 'rampe', und so heisst kein
 * Grundzug — es zeichnet auch nichts). Es tauscht im Aufbau das
 * Grundprogramm `R.solid` gegen ein formgleiches aus:
 *   - dieselben Uniformnamen (uViewProj, uModel, uNormalMat, uCam, uLight,
 *     uColor, uGloss, uEmissive) und dieselben Attributorte,
 *   - `drawProp` in renderer2.js liest `R.solid` bei JEDEM Aufruf neu
 *     (`const s = R.solid;`), der Tausch wirkt also sofort und ohne dass eine
 *     fremde Datei angefasst werden muesste.
 * Damit trifft die Rampe in einem Zug alles Undurchsichtige: Hindernisse,
 * drei Kreaturen mit je bis zu 13 Teilen, Augen, Mund, die Requisiten aus
 * `karte.js` und die Alt-Erweiterungen aus combat.js/death.js/eat.js.
 *
 * DIE VIER ENTSCHEIDUNGEN, DIE HIER GEFALLEN SIND
 *
 * 1. DER LICHTTERM WIRD NICHT MIT DER LICHTFARBE MULTIPLIZIERT.
 *    Alt: `uColor * (amb + SONNE * ndl)` — die Sonne addiert sich auf ein
 *    Umgebungslicht. Neu: `uColor * rampe * uUmgebung`, MULTIPLIKATIV, das
 *    Umgebungslicht ein einziger milder Faktor ganz am Ende. Bliebe es
 *    additiv, hoebe jede Aufhellung die Stufe wieder auf und der ganze
 *    Schritt waere umsonst (PHASE-GRAFIK-PLAN G4, "Falle").
 *
 * 2. DER WEICHE RANDSAUM FAELLT (Vorgabe 0).
 *    Alt stand `HIMMELLICHT * pow(1-ndv,3) * 0.30` im Shader. Der Term
 *    aendert sich ueber die ganze Flaeche stetig und macht damit genau das
 *    kaputt, was hier gemessen werden soll: ein Plateau mit Streuung <= 1.
 *    Genshin hat ihn nicht. Er bleibt als Regler `randlicht` erhalten, damit
 *    ihn jemand zurueckdrehen kann, steht aber auf 0 — die Silhouette
 *    uebernimmt `kontur.js` (G5), und zwar mit einer harten Linie statt
 *    einem Schimmer.
 *
 * 3. DIE FORMEL LIEGT ALS SHADER-BAUSTEIN IM REGISTER.
 *    boden.js zeichnet die Felsen, karte.js die Requisiten, gras.js die
 *    Halme — alle mit eigenen Programmen. Stuende die Rampe nur in meinem
 *    Programm, traefe sie im fertigen Bild nur noch Kreaturen und Gesicht.
 *    Deshalb: `GRAFIK.baustein('rampe')` liefert die Funktionen,
 *    `GRAFIK.rampe.uniformsSetzen(gl, prog)` laedt Textur und Kennzahlen auf
 *    ein beliebiges fremdes Programm. Siehe Abschnitt 3a.
 *
 * 4. EINE ZEILE FUER ALLE, ACHT ZEILEN VORRAETIG.
 *    Die Rampe hat acht Zeilen mit verschiedenen Schattenmultiplikatoren
 *    (Fels, Mauer, Kreatur, Knochen, Gel, Boden). Ausgewaehlt wird ueber das
 *    Uniform `uRampZeile`. Die eingebauten Grundzuege rufen jedoch die
 *    INTERNE `drawProp` von renderer2.js, nicht `R.drawProp` — ich kann ihnen
 *    ohne Fremdaenderung keine Zeile je Zeichenaufruf mitgeben. Vorgabe ist
 *    deshalb die gemessene Kreaturenzeile; wer eine andere will, ruft vor
 *    seinem Zeichenaufruf `R.rampZeile('fels')`. Das ist ehrlicher als eine
 *    Ratefunktion, die aus der Albedofarbe auf das Material schliesst.
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein Math.random, kein Date, kein performance.now, und dieses Modul liest
 * nicht einmal ctx.time — die Rampe steht still. Die Textur wird aus den
 * Reglerwerten erzeugt und nur dann neu gerechnet, wenn sich einer geaendert
 * hat; zwei Laeufe mit denselben Reglern ergeben dieselben Bytes.
 *
 * ===========================================================================
 * NACHGEMESSEN (tools/grafikmass.mjs, 1600x900, Zeilenscan quer ueber einen
 * Fels bei streifendem Licht, Sonne (0.94, 0.34, 0.05))
 * ===========================================================================
 *                          gemessen              Ziel (ref/genshin, Fischl 470)
 *   Lichtplateau           109 px, Streuung 0    >= 30 px, Streuung <= 1
 *   Flanke                 2 px (3 Schritte)     2 px
 *   Schattenplateau        107 px, Streuung 0.9  >= 12 px
 *   Schatten / Licht       0,864                 0,854   (Band 0,82..0,88)
 *   kanalweise R/G/B       0,990 / 0,827 / 0,787 0,984 / 0,819 / 0,784
 *   80 % des Abfalls ueber 2 px                  Genshin 2 px, ToF rund 70 px
 *
 * Die 0,864 gegen 0,854 sind NICHT die Rampe, sondern die 8-Bit-Ausgabe: das
 * Lichtplateau liegt bei RGB(101, 98, 89), der Schattenwert 101,4*0,98431 =
 * 99,8 rundet auf 100 statt auf 99. Ungerundet ergibt dieselbe Rechnung
 * 0,8531. Auf einer helleren Flaeche (G3/G6 heben die Albedo um eine
 * Blendenstufe an) verschwindet der Rest von selbst.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof GRAFIK === 'undefined' || typeof GRAFIK.modul !== 'function') return;

  /* ==========================================================================
   * 1. Die Zeilenbelegung der Rampentextur
   *
   * Jeder Eintrag ist der MULTIPLIKATOR auf die Albedo im Schatten, kanalweise
   * und in sRGB — wir rechnen ohne Gammakorrektur, und saemtliche Zahlen des
   * Dossiers sind ebenfalls sRGB-Ausgabewerte. Wer sie linearisiert, verfehlt
   * jedes Verhaeltnis um denselben Betrag (aus 0,854 wuerde 0,80).
   *
   * Die Leuchtdichteverhaeltnisse in der letzten Spalte sind mit Rec.709
   * gerechnet (dieselbe Gewichtung wie tools/grafikmass.mjs) und gelten fuer
   * eine unbunte Albedo.
   * ======================================================================== */

  const ZEILEN = [
    // name              R      G      B      Herkunft                                   L-Verhaeltnis
    ['fels',          [0.880, 0.830, 0.800], 'GESCHAETZT — Plan G4'],                  // 0.834
    ['mauer',         [0.780, 0.790, 0.810], 'BELEGT — neutrale Flaeche, Plan G4'],    // 0.791
    ['kreatur',       [0.984, 0.819, 0.784], 'BELEGT — Fischl Zeile 470, kanalweise'], // 0.852
    ['kreaturDunkel', [0.940, 0.800, 0.760], 'GERECHNET — Kreatur, 4 % tiefer'],       // 0.822
    ['knochen',       [0.950, 0.860, 0.800], 'GESCHAETZT — Plan G4'],                  // 0.873
    ['gel',           [0.960, 0.880, 0.860], 'Plan §2 — weiche Baender, kein Lack'],   // 0.892
    ['boden',         [0.900, 0.850, 0.790], 'GERECHNET — zwischen Fels und Mauer'],   // 0.855
    ['frei',          [0.984, 0.819, 0.784], 'Reserve — wie kreatur'],                 // 0.852
  ];

  const ZEILE_NR = Object.create(null);
  ZEILEN.forEach((z, i) => { ZEILE_NR[z[0]] = i; });

  /* Textur 256 x 32: acht Zeilen zu je vier Texeln.
   * Vier Texel Zeilenhoehe sind das Minimum, damit die bilineare Filterung in
   * v innerhalb der Zeile bleibt und nicht in die Nachbarzeile blutet. Kein
   * generateMipmap, aus demselben Grund. */
  const BREITE = 256, ZEILENHOEHE = 4;
  const HOEHE = ZEILEN.length * ZEILENHOEHE;

  /* Zeilenmitte in v — das ist der Wert, der ins Uniform uRampZeile geht. */
  const vMitte = (i) => (i * ZEILENHOEHE + ZEILENHOEHE * 0.5) / HOEHE;

  /* ==========================================================================
   * 2. Die Textur erzeugen
   *
   * Profil je Zeile, entlang u von 0 (tiefster Schatten) bis 1 (Licht):
   *
   *   1.0 |                              ______________
   *       |                             /
   *   S   |____________________________/
   *       0                        kante                 1
   *                                 <->  breite (in Texeln)
   *
   * Die Flanke ist LINEAR, nicht smoothstep: eine Gerade laesst sich
   * nachrechnen, eine S-Kurve verbreitert die gemessene Flanke um rund die
   * Haelfte, ohne dass man ihr das ansieht.
   * ======================================================================== */

  function rampeBauen(kante, breiteTexel, gelBreiteTexel) {
    const d = new Uint8Array(BREITE * HOEHE * 4);
    for (let z = 0; z < ZEILEN.length; z++) {
      const S = ZEILEN[z][1];
      const bt = (ZEILEN[z][0] === 'gel') ? gelBreiteTexel : breiteTexel;
      const halb = Math.max(bt, 0.001) * 0.5 / BREITE;   // halbe Flankenbreite in u
      const u0 = kante - halb, u1 = kante + halb;
      for (let y = 0; y < ZEILENHOEHE; y++) {
        const zeile = z * ZEILENHOEHE + y;
        for (let x = 0; x < BREITE; x++) {
          // Texelmitte, damit die Kante dort sitzt, wo sie angesagt ist.
          const u = (x + 0.5) / BREITE;
          let t = (u - u0) / Math.max(u1 - u0, 1e-6);
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const o = (zeile * BREITE + x) * 4;
          d[o]     = Math.round(255 * (S[0] + (1 - S[0]) * t));
          d[o + 1] = Math.round(255 * (S[1] + (1 - S[1]) * t));
          d[o + 2] = Math.round(255 * (S[2] + (1 - S[2]) * t));
          d[o + 3] = 255;
        }
      }
    }
    return d;
  }

  /* ==========================================================================
   * 3a. Der Shader-Baustein
   *
   * boden.js zeichnet die Felsen, karte.js die Requisiten, gras.js die Halme —
   * jedes mit einem EIGENEN Programm. Wuerde die Rampe nur in meinem Programm
   * stehen, bekaeme sie im fertigen Bild nur noch die Kreaturen zu sehen, und
   * jedes andere Modul schriebe seine eigene, leicht abweichende Kurve. Genau
   * dagegen gibt es glsl.js (siehe dessen Kopf: `uNebel` und `uDunst` muessen
   * dieselbe Rechnung sein).
   *
   * Deshalb liegt die Formel als Baustein `rampe` im Register. Wer sie will:
   *
   *     const fs = `#version 300 es
   *     precision highp float;
   *     ${GRAFIK.baustein('rampe')}
   *     ...
   *     vec3 stufe = rampeStufe(N, L, uMeineZeile);`
   *
   * und im Zeichnen einmal je Programm:
   *
   *     gl.useProgram(prog);
   *     GRAFIK.rampe.uniformsSetzen(gl, prog);          // Textur + Kennzahlen
   *     gl.uniform1f(uMeineZeile, GRAFIK.rampe.v('fels'));
   *
   * Der Baustein bringt seine drei Uniforms selbst mit; sie tragen absichtlich
   * einen `uRamp`-Vorsatz, damit sie in keinem fremden Shader kollidieren.
   * ======================================================================== */

  const BAUSTEIN = `
#ifndef GRAFIK_RAMPE
#define GRAFIK_RAMPE

uniform sampler2D uRampe;          // 256 x 32, acht Materialzeilen
uniform float uRampLichtFlaeche;   // ab diesem ndl01 ist voll Licht (0.55)
uniform float uRampSpanne;         // Stauchung des Rampenraums (1.0)

/* Nachschlagestelle in u. Genshins Formel wortgetreu — nur so bleiben die am
 * Referenzbild gemessenen Zahlen uebertragbar. */
float rampeStelle(float n01) {
  return 1.0 - (((uRampLichtFlaeche - n01) / uRampLichtFlaeche) / uRampSpanne);
}

/* Der Schattenmultiplikator zu einem halben Lambert. zeileV ist die
 * Zeilenmitte in v, die GRAFIK.rampe.v('fels') liefert. */
vec3 rampeStufe(float n01, float zeileV) {
  /* Der Griff in die Textur steht AUSSERHALB der Fallunterscheidung:
   * texture() braucht die Ableitungen der Nachbarfragmente, und die sind in
   * ungleichfoermigem Kontrollfluss laut GLSL ES 3.00 undefiniert. */
  vec3 gelesen = texture(uRampe, vec2(clamp(rampeStelle(n01), 0.0, 1.0), zeileV)).rgb;
  return (n01 >= uRampLichtFlaeche) ? vec3(1.0) : gelesen;
}

vec3 rampeStufe(vec3 N, vec3 L, float zeileV) {
  return rampeStufe(dot(N, L) * 0.5 + 0.5, zeileV);
}

/* Harte Glanzstufe statt weichem Blinn-Phong. Ergebnis ist 0 oder 1, bis auf
 * eine einzige Pixelbreite Kante.
 *
 * Genshins Glanz ist binaer:  (1.03 - maske.b) < pow(ndh, shininess) . Wir
 * haben keine handgemalte Maske, also traegt der Aufrufer die Schwelle (bei
 * uns das je Zeichenaufruf gesetzte uGloss).
 * smoothstep mit fwidth statt step: glaettet auf genau eine Pixelbreite,
 * bleibt optisch hart und flimmert nicht — wir haben keine zeitliche
 * Kantenglaettung, mit der wir das sonst zudecken koennten. */
float glanzStufe(vec3 N, vec3 L, vec3 V, float schwelle, float haerte) {
  float s = pow(max(dot(N, normalize(L + V)), 0.0), haerte);
  float w = max(fwidth(s), 1e-5);
  float t = 1.03 - clamp(schwelle, 0.0, 1.0);
  return smoothstep(t - w, t + w, s);
}
#endif
`;

  if (typeof GRAFIK.bausteinSetzen === 'function') GRAFIK.bausteinSetzen('rampe', BAUSTEIN);

  /* ==========================================================================
   * 3b. Die Shader dieses Moduls
   *
   * Der Vertexshader ist wortgleich mit VS_LIT aus renderer2.js — er MUSS es
   * sein, weil dieselben Netze (Ort 0 Position, Ort 1 Normale) hineinlaufen.
   * ======================================================================== */

  const VS = `#version 300 es
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

  function fsBauen() {
    return `#version 300 es
precision highp float;
${GRAFIK.baustein('halblambert', 'rampe')}
in vec3 vPos;
in vec3 vNormal;

/* --- was drawProp() aus renderer2.js setzt, unveraendert --------------- */
uniform vec3  uCam;
uniform vec3  uLight;
uniform vec3  uColor;
uniform float uGloss;
uniform float uEmissive;

/* --- was rampe.js einmal je Bild setzt ---------------------------------
 * uRampe, uRampLichtFlaeche und uRampSpanne bringt der Baustein mit. */
uniform float uRampZeile;      // Zeilenmitte in v
uniform vec3  uUmgebung;       // milder MULTIPLIKATIVER Faktor, siehe Kopf
uniform float uGlanzHaerte;    // Exponent der Glanzstufe
uniform float uGlanzMulti;     // Hoehe der Stufe
uniform float uRandLicht;      // Vorgabe 0 — siehe Entscheidung 2 im Kopf
uniform vec3  uRandFarbe;

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);

  /* Die Nachschlaggroesse ist der HALBE Lambert (0 hinten, 0.5 am Terminator,
   * 1 vorn), nicht max(dot(N,L),0). */
  float n01 = ndl01(N, L);
  vec3 col = uColor * rampeStufe(n01, uRampZeile) * uUmgebung;

  /* Kein Glanz auf der Schattenseite: sonst entstuende dort ein dritter
   * Helligkeitswert und die Zweistufigkeit braeche. */
  col += vec3(glanzStufe(N, L, V, uGloss, uGlanzHaerte) * uGlanzMulti)
       * step(uRampLichtFlaeche, n01);

  /* Weicher Saum — Vorgabe 0. Steht nur da, damit er ohne Neubau des Shaders
   * zurueckgedreht werden kann. */
  col += uRandFarbe * pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRandLicht;

  /* Gesichtsteile und markierte Ziele tragen uEmissive und stehen damit
   * ausserhalb jeder Lichtrechnung — genau Genshins Entscheidung: ein
   * Anime-Gesicht empfaengt nie einen Schatten. */
  col = mix(col, uColor, uEmissive);

  outColor = vec4(col, 1.0);
}`;
  }

  /* ==========================================================================
   * 4. Modulzustand
   * ======================================================================== */

  const S = {
    prog: null,
    tex: null,
    alt: null,          // das verdraengte Grundprogramm, fuer den Rueckweg
    signatur: '',       // Reglerwerte, aus denen die Textur gebaut wurde
    einheit: 5,         // Texturplatz. 0 und 7 sind von gel.js belegt.
    zeile: ZEILE_NR.kreatur,
    R: null,
  };

  const modul = GRAFIK.modul({
    name: 'rampe',
    ordnung: 30,

    /* Die Zahlen stehen alle hier, nicht im Shader — dann laesst sich die
     * Flanke im laufenden Bild verschieben, ohne neu zu uebersetzen. */
    regler: [
      /* Lage: ab welchem ndl01 voll Licht herrscht. Genshins Standardwert. */
      { key: 'lichtFlaeche', min: 0.20, max: 0.95, step: 0.01, wert: 0.55 },
      /* Stauchung des Rampenraums. 1.0 = Genshins Standardwert. */
      { key: 'rampBreite', min: 0.20, max: 2.00, step: 0.01, wert: 1.00 },
      /* Lage der Kante INNERHALB der Textur. 0.88 ist der Dossierwert;
       * zusammen mit lichtFlaeche 0.55 sitzt die Kante bei ndl01 = 0.484,
       * also knapp hinter dem echten Terminator. */
      { key: 'kante', min: 0.50, max: 0.99, step: 0.005, wert: 0.88 },
      /* Flankenbreite in Texeln von 256. Praxisregel des Dossiers: hoechstens
       * 4. Umrechnung: n Texel sind n*lichtFlaeche/256 in ndl01, und auf einer
       * Kugel mit Bildradius r wird daraus n*lichtFlaeche*r/128 Pixel.
       * 4 Texel * 0,55 * 120 px / 128 = 2,1 px — genau die am Genshin-Bild
       * gemessene Flankenbreite. Mit 3 Texeln kamen 1 px heraus: haerter als
       * die Vorlage, und auf einer gekruemmten Kante sichtbar treppig. */
      { key: 'flanke', min: 1, max: 24, step: 1, wert: 4 },
      /* Dieselbe Groesse fuer die Gel-Zeile: rund 10 % des Rampenraums statt
       * 1,2 %. Eine harte Stufe auf einem durchscheinenden Koerper liest sich
       * als lackierte Schale (Plan §2). */
      { key: 'flankeGel', min: 4, max: 64, step: 1, wert: 26 },
      /* Umgebungslicht, multiplikativ. sonne skaliert ctx.licht.farbe,
       * umgebung skaliert den Mittelwert aus Himmel- und Bodenlicht. */
      { key: 'sonne', min: 0, max: 2, step: 0.01, wert: 1.00 },
      { key: 'umgebung', min: 0, max: 2, step: 0.01, wert: 1.00 },
      /* Glanzstufe. haerte ist der Exponent, multi die Hoehe der Stufe. */
      { key: 'glanzHaerte', min: 2, max: 80, step: 1, wert: 10 },
      { key: 'glanzMulti', min: 0, max: 1, step: 0.01, wert: 0.14 },
      /* Weicher Saum. Absichtlich 0, siehe Entscheidung 2 im Dateikopf. */
      { key: 'randlicht', min: 0, max: 1, step: 0.01, wert: 0.00 },
    ],

    /* ---------------------------------------------------------------------
     * Aufbau. Wirft hier etwas, wird das Modul uebersprungen und der Rest des
     * Bildes laeuft weiter (GRAFIK-MODULE.md §3) — R.solid bleibt dann das
     * eingebaute Programm, das Bild faellt sauber auf Lambert zurueck.
     * Deshalb wird R.solid erst GANZ ZULETZT getauscht.
     * ------------------------------------------------------------------- */
    aufbau(gl, R) {
      const prog = GRAFIK.programm(gl, VS, fsBauen(), 'rampe (fest, G4)');

      const w = modul.wert;
      const daten = rampeBauen(w.kante, w.flanke, w.flankeGel);
      const tex = GRAFIK.textur(gl, {
        breite: BREITE, hoehe: HOEHE, format: 'rgba8',
        filter: 'linear',   // LINEAR in u glaettet die Flanke auf Texelmass
        daten,              // wrap bleibt CLAMP_TO_EDGE, die Vorgabe von GRAFIK.textur
      });

      S.prog = prog;
      S.tex = tex;
      S.signatur = w.kante + '|' + w.flanke + '|' + w.flankeGel;
      S.R = R;

      /* Erst jetzt verdraengen — bis hierher konnte noch etwas werfen. */
      S.alt = R.solid;
      R.solid = prog;

      /* Der Schleim hat kein Wort im Bild, aber ein Modul, das ihn zeichnet,
       * soll dieselbe Rampe benutzen koennen. */
      const api = {
        tex, programm: prog, zeilen: ZEILEN.map(z => z[0]),
        einheit: S.einheit,
        /* Zeile in v — das Argument fuer `zeileV` im Baustein. */
        v: (n) => vMitte(typeof n === 'string'
          ? (ZEILE_NR[n] === undefined ? ZEILE_NR.kreatur : ZEILE_NR[n]) : (n | 0)),
        /* Textur binden und die drei Baustein-Uniforms auf ein FREMDES
         * Programm laden. Der Aufrufer hat es vorher gebunden.
         * Ueber getUniformLocation statt ueber prog.u, damit auch ein von
         * Hand gebautes Programm ohne Beschriftung funktioniert. */
        uniformsSetzen(gl2, fremd) {
          const p2 = (fremd && fremd.p) || fremd;
          texBinden(gl2);
          const w2 = modul.wert;
          const o = (n) => gl2.getUniformLocation(p2, n);
          gl2.uniform1i(o('uRampe'), S.einheit);
          gl2.uniform1f(o('uRampLichtFlaeche'), w2.lichtFlaeche);
          gl2.uniform1f(o('uRampSpanne'), Math.max(w2.rampBreite, 0.01));
        },
        /* Notausgang: das eingebaute Fest-Programm zurueckholen. */
        zurueck: () => { R.solid = S.alt; },
      };
      R.rampe = api;
      GRAFIK.rampe = api;

      R.rampZeile = function rampZeile(n) {
        const i = typeof n === 'string' ? (ZEILE_NR[n] === undefined ? S.zeile : ZEILE_NR[n])
                                        : (n | 0);
        S.zeile = i;
        gl.useProgram(prog);
        gl.uniform1f(prog.u.uRampZeile, vMitte(i));
      };

      /* Der Texturplatz muss beim Zeichnen noch belegt sein. Die eingebauten
       * Grundzuege zeichnen zwischen ordnung 30 und 50, also VOR gel.js — die
       * Bindung aus vorbereiten() haelt dort. Die Alt-Erweiterungen aus
       * combat.js/death.js liegen dagegen auf ordnung 90, also NACH gel.js,
       * und gel.js bindet Texturen. Deshalb bindet R.drawProp selbst nach. */
      const drawPropAlt = R.drawProp;
      R.drawProp = function (mesh, model, nmat, color, gloss, emissive, cam, vp) {
        if (R.solid === S.prog) texBinden(gl);
        return drawPropAlt(mesh, model, nmat, color, gloss, emissive, cam, vp);
      };
    },

    /* ---------------------------------------------------------------------
     * Je Bild: Uniforms setzen. Alles, was sich innerhalb eines Bildes nicht
     * aendert, steht genau einmal hier statt bei jedem der rund 90
     * Zeichenaufrufe.
     * ------------------------------------------------------------------- */
    vorbereiten(gl, R, ctx) {
      const w = modul.wert;

      /* Textur nur neu rechnen, wenn ein Regler sie betrifft. */
      const sig = w.kante + '|' + w.flanke + '|' + w.flankeGel;
      if (sig !== S.signatur) {
        gl.bindTexture(gl.TEXTURE_2D, S.tex.tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, BREITE, HOEHE,
                         gl.RGBA, gl.UNSIGNED_BYTE,
                         rampeBauen(w.kante, w.flanke, w.flankeGel));
        gl.bindTexture(gl.TEXTURE_2D, null);
        S.signatur = sig;
      }

      /* Das Umgebungslicht als EIN milder multiplikativer Faktor.
       * Der Wert ist so gewaehlt, dass die Lichtseite ungefaehr dort bleibt,
       * wo sie vorher lag (alt: amb + SONNE ~ 1,22) — damit ist der sichtbare
       * Unterschied die RAMPE und nicht eine geaenderte Belichtung. */
      const li = ctx.licht;
      const st = (li.staerke === undefined ? 1 : li.staerke) * w.sonne;
      const a = w.umgebung * 0.5;
      const umg = [
        li.farbe[0] * st + (li.himmel[0] + li.boden[0]) * a,
        li.farbe[1] * st + (li.himmel[1] + li.boden[1]) * a,
        li.farbe[2] * st + (li.himmel[2] + li.boden[2]) * a,
      ];

      const p = S.prog, u = p.u;
      gl.useProgram(p);
      texBinden(gl);
      gl.uniform1i(u.uRampe, S.einheit);
      gl.uniform1f(u.uRampZeile, vMitte(S.zeile));
      gl.uniform1f(u.uRampLichtFlaeche, w.lichtFlaeche);
      gl.uniform1f(u.uRampSpanne, Math.max(w.rampBreite, 0.01));
      gl.uniform3fv(u.uUmgebung, umg);
      gl.uniform1f(u.uGlanzHaerte, Math.max(w.glanzHaerte, 1));
      gl.uniform1f(u.uGlanzMulti, w.glanzMulti);
      gl.uniform1f(u.uRandLicht, w.randlicht);
      gl.uniform3fv(u.uRandFarbe, li.himmel);
    },

    /* zeichnen() gibt es absichtlich nicht: dieses Modul aendert, WIE
     * gezeichnet wird, nicht WAS. Damit taucht es in der Zeichenfolge gar
     * nicht auf und kann dort auch nichts doppelt malen. */
  });

  /* Texturplatz belegen. Steht getrennt, weil R.drawProp es nachziehen muss —
   * und es setzt KEIN Uniform, damit es auch dann richtig ist, wenn gerade ein
   * fremdes Programm gebunden ist. Das Samplerziel selbst ist Programmzustand
   * und wird einmal je Bild in vorbereiten() gesetzt. */
  function texBinden(gl) {
    gl.activeTexture(gl.TEXTURE0 + S.einheit);
    gl.bindTexture(gl.TEXTURE_2D, S.tex.tex);
    /* Zurueck auf 0: fast alles andere im Projekt arbeitet auf Platz 0 und
     * wuerde sonst auf unserem Platz landen. */
    gl.activeTexture(gl.TEXTURE0);
  }

})();
