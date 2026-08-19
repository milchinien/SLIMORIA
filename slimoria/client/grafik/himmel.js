'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — G1: der Himmel.
 *
 * Modul des ZWEITEN Renderpfads (nur mit ?renderer=2 aktiv). Es meldet sich
 * unter dem Namen 'himmel' an und verdraengt damit den eingebauten Grundzug
 * gleichen Namens (renderer2.js, Ordnung 10).
 *
 * ---------------------------------------------------------------------------
 * WARUM SO WENIG UND WARUM TROTZDEM
 *
 * Der Himmel ist je nach Nickwinkel nur 4,6 bis 37 Prozent des Bildes
 * (PHASE-GRAFIK-PLAN §0). Hier wird also NICHT die meiste Wirkung geholt.
 * Er ist aber die Grundfarbe, gegen die alles andere steht, und seine
 * Horizontfarbe ist zugleich die Farbe, in die der Fernnebel (G2) alles
 * Ferne aufloest. Laufen die beiden auseinander, reisst am Horizont eine
 * Naht auf — genau dort, wo das Auge am empfindlichsten ist. Deshalb gibt
 * dieses Modul seine drei Farben nach aussen weiter (siehe §5 unten).
 *
 * ---------------------------------------------------------------------------
 * DIE DREI FARBEN — eigene Messung, nicht uebernommen
 *
 * Gemessen an ref/genshin/landschaft_mondstadt_mittag_fernnebel_4k.png
 * (3840x2160, Mittag, wolkenfreie Spalte x = 300, 9x9-Mittel je Probe):
 *
 *   Zenit     y =   0   rgb( 33,114,188)   #2172bc
 *   Horizont  y = 760   rgb(120,198,246)   #78c6f6
 *   Dunstband y = 840   rgb(184,219,251)   #b8dbfb
 *
 * Gegenprobe an Spalte 3500 (andere Bildhaelfte, andere Sonnenlage):
 * dieselbe Rampe, das Dunstband dort schwaecher (135,208,252) — das ist der
 * azimutale Anteil, der weiter unten als eigener Term steht.
 *
 * Die drei Werte decken sich mit den Dossierzahlen aus PHASE-GRAFIK-PLAN
 * §G1/§G10 auf 1 bis 2 Stufen: Zenit (34,114,188), Horizont (121,198,246),
 * Dunst (183,217,249). Eingetragen sind unten die Dossierwerte, weil der
 * Tagesgang in G10 auf derselben Tabelle aufsetzt und zwei um eine Stufe
 * verschiedene Mittagswerte im Projekt nur Verwirrung stiften.
 *
 * Das Dunstband ist die dritte, ENTSAETTIGTE Farbe: Saettigung (HSV) des
 * Horizonthimmels 51 %, des Dunstbands 27 %. Es ist kein aufgehelltes Blau,
 * sondern eine eigene Farbe — genau das macht in den Referenzbildern den
 * Eindruck von Luft statt von Verlauf.
 *
 * ---------------------------------------------------------------------------
 * DIE RAMPE — Blickrichtung, nicht Bildhoehe
 *
 * Der alte Shader nimmt die Bildhoehe in NDC. Das ist bei fester Kamera
 * billig und richtig, aber unsere Kamera nickt (pitch 0,06…1,45). Sobald sie
 * nickt, wandert der Verlauf mit dem BILD statt mit der WELT und der Himmel
 * klebt am Bildrand. Hier wird deshalb je Pixel die Blickrichtung aus
 * invViewProj rekonstruiert (GRAFIK-Baustein `bildschirm`, Funktion
 * blickStrahl) und `blick.y` — der Sinus der Elevation — traegt die Rampe.
 *
 * Die Form, an der Genshin-Messung angepasst:
 *
 *   oben = clamp((blick.y - BAND) / (SPANNE - BAND), 0, 1)
 *   t    = pow(1 - oben, EXPONENT)          // 1 am Horizont, 0 im Zenit
 *   col  = mix(ZENIT, HORIZONT, t)
 *
 * Zwei Dinge daran sind nicht beliebig:
 *
 * 1. Die Rampe beginnt OBEN AM DUNSTBAND, nicht am Horizont. Am Referenz-
 *    bild liegt zwischen Horizont und rund 3 Grad Elevation ein Plateau
 *    konstanter Farbe; wer die Rampe bei 0 beginnen laesst, bekommt den
 *    Exponenten nicht stabil (die Anpassung streut dann zwischen 0,6 und
 *    1,4 statt auf ±0,05).
 *
 * 2. Der Exponent sitzt auf dem HORIZONTGEWICHT, nicht auf dem Zenitgewicht.
 *    Andersherum gerechnet bliebe der obere Bildrand blass, und die
 *    Referenzbilder zeigen dort die volle Zenitfarbe.
 *
 * Anpassung an fuenf Stuetzstellen derselben Spalte (Elevation aus
 * Bildzeile bei fovY 45 Grad und Horizontzeile 890 zurueckgerechnet;
 * f = Anteil Zenitfarbe, Gruenkanal):
 *
 *   blick.y   f gemessen   f mit EXPONENT 1,6
 *   0,109       0,267        0,312
 *   0,181       0,629        0,644
 *   0,250       0,853        0,876
 *   0,289       0,964        0,963
 *   0,314       1,000        0,999
 *
 * Groesste Abweichung 0,045, kein Vorzeichenwechsel. EXPONENT = 1,6,
 * SPANNE = 0,32 (die Zenitfarbe ist bei rund 18,7 Grad erreicht),
 * BAND = 0,055 (rund 3,2 Grad; gemessene Bandhoehe 114 px bei 2160,
 * also 5,3 % der Bildhoehe, was bei fovY 45 Grad 0,044 in blick.y ergibt —
 * der Wert liegt bewusst knapp darueber, weil unser fovY 50 Grad ist).
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 *
 * Kein Math.random, kein Date, kein performance.now. Dieses Modul benutzt
 * ueberhaupt keine Zeit: der Himmel steht still. Damit ist jede Aufnahme
 * Bit fuer Bit wiederholbar, und ein Unterschied zwischen zwei Laeufen kann
 * nie von hier kommen.
 * ------------------------------------------------------------------------- */

(function () {

  /* glsl.js legt GRAFIK an und wird laut grafik/laden.js vor uns geladen.
   * Fehlt es trotzdem, melden wir das und halten still — ein Wurf im
   * Dateirumpf wuerde als Seitenfehler gezaehlt und faellt dann nicht dem
   * zur Last, der ihn verursacht hat. */
  if (!window.GRAFIK || !window.GRAFIK.modul) {
    console.error('grafik/himmel.js: GRAFIK fehlt — laedt glsl.js davor?');
    return;
  }

  /* ==========================================================================
   * 1. Zahlen
   * ======================================================================== */

  /* Mittag, in sRGB. Wir rechnen ohne Gammakorrektur — alle Dossierzahlen
   * sind sRGB-Ausgabewerte, also gehen sie unveraendert hinein. */
  const ZENIT    = [ 34 / 255, 114 / 255, 188 / 255];   // #2272bc
  const HORIZONT = [121 / 255, 198 / 255, 246 / 255];   // #79c6f6
  const DUNST    = [183 / 255, 217 / 255, 249 / 255];   // #b7d9f9

  /* Sonnenkern. Gemessen: Genshins hellster Pixel ist NIE weiss — der
   * Sonnenkern liegt bei (254,253,219). Ein weisser Kern ist die Signatur
   * von Tower of Fantasy (dort exakt 255,255,255 ueber 105 px), und genau
   * daran trennt ein Blindrichter die beiden im Standbild. */
  const SONNENKERN = [254 / 255, 253 / 255, 219 / 255]; // #fefddb

  /* Warmer, blasser Hof rund um die Sonnenrichtung. Gemessen wurde am
   * Referenzbild sonnenseitig L=190 gegen gegensonnenseitig L=77 auf
   * derselben Bildzeile. Der volle Faktor 2,5 gehoert zur goldenen Stunde;
   * am Mittagshimmel bleibt der Zuschlag klein, sonst wird aus dem Dunst
   * ein Scheinwerfer.
   *
   * WICHTIG, einmal falsch gebaut und gemessen: der Hof wird EINGEMISCHT,
   * nicht ADDIERT. Das Dunstband liegt bei (183,217,249) — der Blaukanal
   * steht schon bei 249. Ein additiver Zuschlag von 0,07 klemmt ihn auf
   * 255, und dann ist ueber die halbe Bildbreite exakt derselbe Wert im
   * Blau: der Verlauf ist weg, das Band sieht ausgewaschen aus, und die
   * Saettigung faellt unter die 22..38 % des Dossiers. Als Mischung bleibt
   * alles im Farbraum und der Himmel wird sonnenseitig WAERMER statt nur
   * heller — was die Referenzbilder auch zeigen. */
  const SONNENHOF = [1.00, 0.96, 0.84];   // #fff5d6

  /* Sonnenfarbe am Mittag, gegen die Scheibe und Hof getoent werden.
   * `licht.js` fuehrt den Tagesgang und legt die reine Sonnenfarbe in
   * ctx.licht.sonneFarbe ab; am Mittag steht dort (1,00 · 0,96 · 0,89), zur
   * goldenen Stunde (1,00 · 0,60 · 0,32). Wir toenen RELATIV zum Mittag —
   * damit bleibt der gemessene Mittagskern (254,253,219) auf die Stufe
   * genau erhalten und die Abendsonne wird trotzdem orange statt weiss.
   * Eine weisse Sonne ueber einem orangen Horizont ist der Fehler, den man
   * in jedem Standbild sofort sieht. */
  const MITTAGS_SONNE = [1.00, 0.96, 0.89];

  /* Die Vorgabewerte, die renderer2.js VOR jedem vorbereiten() in ctx.licht
   * zurueckschreibt. Stehen dort noch genau diese Zahlen, hat licht.js
   * nichts gesetzt (oder es fehlt) und wir tragen unsere Messung ein.
   * Steht etwas anderes darin, fuehrt licht.js den Tagesgang und wir folgen.
   * So braucht keines der beiden Module vom anderen zu wissen. */
  const RENDERER_VORGABE_DUNST = [0.405, 0.415, 0.425];
  const RENDERER_VORGABE_ZENIT = [0.135, 0.165, 0.225];

  const gleich = (a, b) =>
    !!a && Math.abs(a[0] - b[0]) < 1e-4
        && Math.abs(a[1] - b[1]) < 1e-4
        && Math.abs(a[2] - b[2]) < 1e-4;

  const klemm = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  /* ==========================================================================
   * 2. Shader
   * ======================================================================== */

  const FS = `#version 300 es
precision highp float;

${window.GRAFIK.baustein('bildschirm', 'dither')}

in vec2 vUv;

uniform mat4  uInvViewProj;
uniform vec3  uAuge;

uniform vec3  uZenit;        // Farbe hoch oben
uniform vec3  uHorizont;     // Farbe am oberen Rand des Dunstbands
uniform vec3  uDunst;        // dritte, entsaettigte Farbe DIREKT am Horizont
uniform vec3  uSonneKern;
uniform vec3  uSonnenHof;    // warme Farbe des azimutalen Hofs
uniform vec3  uSonne;        // normierte Richtung ZUR Sonne

uniform float uHofStaerke;   // wie weit der Himmel zur Hoffarbe wandert

uniform float uSpanne;       // blick.y, bei dem die Zenitfarbe erreicht ist
uniform float uExponent;     // Potenz auf dem Horizontgewicht
uniform float uBandHoehe;    // blick.y, bei dem das Dunstband endet
uniform float uSonneRadius;  // Winkelradius der Scheibe, Bogenmass
uniform float uSonneSaum;    // Breite des weichen Saums, Bogenmass
uniform float uSonneAuf;     // 0 = Sonne unter dem Horizont, 1 = darueber

out vec4 outColor;

void main() {
  /* Blickrichtung statt Bildhoehe: der Verlauf haengt damit an der WELT.
     Nickt die Kamera, wandert der Himmel richtig mit. */
  vec3 blick = blickStrahl(vUv, uInvViewProj, uAuge);
  float h = blick.y;                       // Sinus der Elevation

  /* --- Zweifarbrampe, Potenz auf dem Horizontgewicht ---------------------
     Die Rampe beginnt oben am Dunstband, nicht am Horizont. */
  float oben = clamp((h - uBandHoehe) / max(uSpanne - uBandHoehe, 1e-3), 0.0, 1.0);
  float t    = pow(1.0 - oben, uExponent);
  vec3  col  = mix(uZenit, uHorizont, t);

  /* --- Eigenes Horizontband in der dritten Farbe -------------------------
     Unterhalb des Horizonts steht reiner Dunst. Das ist keine Kosmetik: der
     Fernnebel loest dort alles in dieselbe Farbe auf, und nur so bleibt die
     Horizontlinie eine Kante der Geometrie statt einer Naht des Himmels. */
  float band = 1.0 - smoothstep(0.0, uBandHoehe, max(h, 0.0));
  col = mix(col, uDunst, band);

  /* --- Azimutaler Sonnenhof, eine Zeile ---------------------------------- */
  float cd = max(dot(blick, uSonne), 0.0);
  float c2 = cd * cd;
  float hof = clamp(uHofStaerke * c2 * c2 * uSonneAuf, 0.0, 1.0);
  col = mix(col, uSonnenHof, hof);

  /* --- Sonnenscheibe mit weichem Saum ------------------------------------
     Winkelabstand statt Skalarprodukt: so ist der Radius unmittelbar ein
     Winkel und die Scheibe bleibt rund, egal wo im Bild sie steht. */
  float winkel  = acos(clamp(dot(blick, uSonne), -1.0, 1.0));
  float scheibe = 1.0 - smoothstep(uSonneRadius, uSonneRadius + uSonneSaum, winkel);
  col = mix(col, uSonneKern, scheibe * uSonneAuf);

  /* Ein halber Schritt geordnete Stoerung. Ein Himmelsverlauf ueber 400 px
     bandet sonst sichtbar, und zwar genau in der grossen ruhigen Flaeche,
     in der man es am ehesten sieht. Kostet nichts, ist deterministisch. */
  outColor = vec4(dithern(min(col, vec3(1.0)), gl_FragCoord.xy), 1.0);
}`;

  /* ==========================================================================
   * 3. Modul
   * ======================================================================== */

  window.GRAFIK.modul({
    name: 'himmel',      // gleicher Name -> verdraengt den eingebauten Grundzug
    ordnung: 10,

    regler: [
      { key: 'exponent',    min: 0.8,   max: 3.0,  step: 0.01,  wert: 1.60  },
      { key: 'spanne',      min: 0.10,  max: 1.00, step: 0.01,  wert: 0.32  },
      { key: 'bandHoehe',   min: 0.00,  max: 0.30, step: 0.005, wert: 0.055 },
      { key: 'sonneRadius', min: 0.000, max: 0.15, step: 0.002, wert: 0.028 },
      { key: 'sonneSaum',   min: 0.000, max: 0.15, step: 0.002, wert: 0.016 },
      { key: 'sonnenHof',   min: 0.0,   max: 1.0,  step: 0.01,  wert: 0.30  },
      { key: 'sonneTon',    min: 0.0,   max: 1.0,  step: 0.01,  wert: 0.60  },
    ],

    aufbau(gl, R) {
      this.prog = window.GRAFIK.programm(gl, window.GRAFIK.vollbildVs, FS, 'himmel.js');
      this.flaeche = R.vollbild || window.GRAFIK.vollbild(gl);

      /* Die Farben liegen in Float32Array, damit sie ohne Umkopieren an
       * gl.uniform3fv gehen UND ein anderes Modul (nebel.js) dieselbe
       * Speicherstelle als seine eigene Uniform binden kann. */
      this.zenit    = new Float32Array(ZENIT);
      this.horizont = new Float32Array(HORIZONT);
      this.dunst    = new Float32Array(DUNST);
      this.sonne    = new Float32Array([0, 1, 0]);
      this.hof      = new Float32Array(SONNENHOF);
      this.kern     = new Float32Array(SONNENKERN);
      this.sonneAuf = 1;

      /* --- §5: die Farben nach aussen geben -----------------------------
       * "Die Horizontfarbe muss als Uniform herausgegeben werden, weil der
       * Fernnebel dieselbe Farbe braucht."
       *
       * Eine Uniform laesst sich in WebGL2 nicht ueber Programmgrenzen
       * teilen (dafuer braeuchte es einen Uniformblock, und den muessten
       * alle Module gemeinsam vereinbaren). Herausgegeben wird deshalb der
       * WERT — und zwar als dieselbe Float32Array-Instanz, die auch dieser
       * Shader bekommt. Wer sie mit gl.uniform3fv bindet, kann per Bauart
       * nicht auseinanderlaufen.
       *
       * Zu finden ueber R.himmelFarben und ueber ctx.himmel. */
      R.himmelFarben = {
        zenit: this.zenit,
        horizont: this.horizont,
        dunst: this.dunst,          // <- die Farbe, die der Fernnebel braucht
        sonne: this.sonne,
        sonnenkern: this.kern,
        sonnenhof: this.hof,
      };
    },

    vorbereiten(gl, R, ctx) {
      const w = this.wert;
      const li = ctx.licht;

      /* --- Farben: licht.js hat Vorrang, sonst unsere Messung ------------
       * renderer2.js setzt ctx.licht vor jedem vorbereiten() auf seine
       * Vorgabe zurueck. Steht dort noch die Vorgabe, fuehrt niemand den
       * Tagesgang und wir tragen die Mittagsmessung ein. */
      const eigenerDunst = gleich(li.dunst, RENDERER_VORGABE_DUNST);
      const eigenerZenit = gleich(li.zenit, RENDERER_VORGABE_ZENIT);

      for (let i = 0; i < 3; i++) {
        this.dunst[i] = eigenerDunst ? DUNST[i] : li.dunst[i];
        this.zenit[i] = eigenerZenit ? ZENIT[i] : li.zenit[i];
        /* Fuer den Horizont gibt es kein Vorgabefeld — licht.js legt es an,
         * wenn es den Tagesgang fuehrt. Fehlt es, ist es unseres. */
        this.horizont[i] = (li.horizont && li.horizont.length === 3)
          ? li.horizont[i] : HORIZONT[i];
      }

      /* Zurueckschreiben, damit der Fernnebel und alles Weitere die Farbe
       * an der im Vertrag genannten Stelle findet. Wenn licht.js sie
       * gesetzt hat, schreiben wir denselben Wert zurueck — schadlos. */
      li.dunst[0] = this.dunst[0]; li.dunst[1] = this.dunst[1]; li.dunst[2] = this.dunst[2];
      li.zenit[0] = this.zenit[0]; li.zenit[1] = this.zenit[1]; li.zenit[2] = this.zenit[2];
      if (!li.horizont || li.horizont.length !== 3) li.horizont = [0, 0, 0];
      li.horizont[0] = this.horizont[0];
      li.horizont[1] = this.horizont[1];
      li.horizont[2] = this.horizont[2];
      ctx.himmel = R.himmelFarben;

      /* --- Sonnenrichtung ------------------------------------------------
       * ctx.licht.richtung IST R.light, und capture.js ersetzt das Array bei
       * jedem sonneSetzen() durch ein neues. Also jedes Bild frisch lesen
       * und normieren, nie merken. */
      const L = li.richtung || [0, 1, 0];
      const len = Math.hypot(L[0], L[1], L[2]) || 1;
      this.sonne[0] = L[0] / len;
      this.sonne[1] = L[1] / len;
      this.sonne[2] = L[2] / len;

      /* Sonne unter dem Horizont: Scheibe und Dunst ausblenden, statt sie
       * unter der Horizontlinie durchscheinen zu lassen. */
      const y = this.sonne[1];
      const s = klemm((y + 0.05) / 0.11, 0, 1);
      this.sonneAuf = s * s * (3 - 2 * s);

      /* --- Scheibe und Hof auf die Tagesfarbe toenen ---------------------
       * Relativ zum Mittag gerechnet, damit der gemessene Mittagskern
       * (254,253,219) exakt stehen bleibt (rel = 1 in allen Kanaelen). */
      const f = li.sonneFarbe;
      const mx = f ? Math.max(f[0], f[1], f[2]) : 0;
      const ton = w.sonneTon;
      for (let i = 0; i < 3; i++) {
        const rel = (f && mx > 1e-6) ? (f[i] / mx) / MITTAGS_SONNE[i] : 1;
        const k = 1 + ton * (rel - 1);
        this.kern[i] = klemm(SONNENKERN[i] * k, 0, 1);
        this.hof[i]  = klemm(SONNENHOF[i] * k, 0, 1);
      }
    },

    zeichnen(gl, R, ctx) {
      const p = this.prog, u = p.u, w = this.wert;

      /* Der Himmel ist der Hintergrund: keine Tiefe lesen, keine schreiben,
       * nicht mischen, nicht wegschneiden. Jeder Durchgang setzt seinen
       * Zustand selbst — zwischen zwei Grundzuegen kann ein fremdes Modul
       * stehen, also darf sich keiner auf den Vorgaenger verlassen. */
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);

      gl.useProgram(p);
      gl.uniformMatrix4fv(u.uInvViewProj, false, ctx.invViewProj);
      gl.uniform3fv(u.uAuge, ctx.cam);

      gl.uniform3fv(u.uZenit, this.zenit);
      gl.uniform3fv(u.uHorizont, this.horizont);
      gl.uniform3fv(u.uDunst, this.dunst);
      gl.uniform3fv(u.uSonneKern, this.kern);
      gl.uniform3fv(u.uSonnenHof, this.hof);
      gl.uniform3fv(u.uSonne, this.sonne);

      gl.uniform1f(u.uHofStaerke, w.sonnenHof);
      gl.uniform1f(u.uSpanne, w.spanne);
      gl.uniform1f(u.uExponent, w.exponent);
      gl.uniform1f(u.uBandHoehe, w.bandHoehe);
      gl.uniform1f(u.uSonneRadius, w.sonneRadius);
      gl.uniform1f(u.uSonneSaum, w.sonneSaum);
      gl.uniform1f(u.uSonneAuf, this.sonneAuf);

      this.flaeche.zeichnen(gl);

      /* Aufgeraeumt zuruecklassen: der naechste Durchgang zeichnet Geometrie. */
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
    },
  });

})();
