'use strict';

/* ===========================================================================
 * grafik/gel.js — der Materialkern des Schleims.  Lane SCHLEIM, Ordnung 60.
 *
 * Der Schleim ist die Figur (GDD 10 §69).  Diese Datei entscheidet, ob man ihn
 * als Wesen ansieht oder als Objekt mit Schleim-Textur (GDD 01 §66).  Sie
 * liefert nur das Material.  Die Form gehoert softbody.js/slime.js, das
 * Gesicht gehoert gesicht.js, jede weitere Eigenschaft je einem eigenen Modul.
 *
 * ---------------------------------------------------------------------------
 * 1. WARUM HIER KEINE CEL-RAMPE STEHT
 * ---------------------------------------------------------------------------
 * Das Zielbild der Phase ist das Genshin-VERFAHREN.  Dessen Kern ist eine
 * Schattenrampe: N·L wird auf zwei, drei Stufen quantisiert, der Terminator
 * wird hart, und die Figur liest sich als Zeichnung.  Das funktioniert, weil
 * Haut, Stoff und Metall UNDURCHSICHTIG sind — die Farbe eines Pixels haengt
 * dort ausschliesslich von der Oberflaeche ab, die man sieht.
 *
 * Gel ist kein solcher Fall.  Die Farbe eines Pixels ist ein Integral entlang
 * des Weges, den das Licht durch den Koerper nimmt: Ein- und Austrittspunkt
 * spannen eine Strecke auf, und erst deren LAENGE bestimmt, wie satt, wie
 * dunkel und wie deckend die Stelle wird.  Legt man darauf eine N·L-Rampe,
 * passiert genau das Falsche: der harte Terminator behauptet eine
 * undurchsichtige Oberflaeche, das Volumen verschwindet, und man bekommt den
 * Ballon zurueck, den renderer.js heute zeigt.
 *
 * Die Uebersetzung des Verfahrens lautet deshalb:
 *
 *   Die Rampe wandert von der Einfallsachse auf die DICKENACHSE.
 *
 *   * Auf der Lichtachse bleibt nur EINE weiche Schulter mit Plateau: oben
 *     gleichmaessig voll beleuchtet ohne Verlauf, dazwischen ein Uebergang,
 *     unten die farbige Schattenhaelfte.  Genau das ist am Material gemessen
 *     (ref/slime/DOSSIER.md §7: „die oberen 25 % sind gleichmaessig voll
 *     beleuchtet, ohne Verlauf", Terminator bei 45–70 % der Koerperhoehe,
 *     Kontrast 2.9 : 1, Schatten bleibt FARBIG).  Das ist die stilisierende
 *     Haelfte des Genshin-Verfahrens — nur eben eine Stufe statt drei.
 *   * Auf der Dickenachse steht eine dreistufige Farbrampe klar → kern → tief,
 *     angetrieben von der echten, pro Pixel gemessenen Weglaenge.  Das ist
 *     die Haelfte, die Genshin gar nicht hat, weil Genshin kein Gel hat.
 *
 * Dazu kommen die drei Dinge, die das Dossier als das ganze Materialbudget
 * ausweist: EIN weiches, ENTSAETTIGENDES Glanzlicht auf 8–10 % der
 * Koerperbreite, ein Fresnel-Rand auf 5–7 % der Breite, der AUSSCHLIESSLICH
 * in der Schattenhaelfte erscheint, und sonst nichts — keine Textur, kein
 * Rauschen, keine Poren.
 *
 * ---------------------------------------------------------------------------
 * 2. WIE DIE DICKE GEMESSEN WIRD (und was daran besser ist als bisher)
 * ---------------------------------------------------------------------------
 * renderer.js zeichnet zweimal mit fester Deckkraft (0.36 hinten, 0.56 vorn)
 * und leitet die „Dicke" aus dem Fresnel-Term ab:  `float dicke = 1.0 - fres;`
 * Das ist eine Behauptung ueber die Silhouette, keine Messung des Koerpers.
 * Folge: die Verformung aendert die Farbe nicht.  Ein flachgedrueckter Blob
 * sieht aus wie ein runder, nur mit anderem Umriss — die Masse ist weg.
 *
 * Hier wird stattdessen wirklich gemessen, in drei Durchgaengen:
 *
 *   D1  Rueckseiten (cullFace FRONT) in ein eigenes Ziel.  Geschrieben wird
 *       die Kameradistanz des AUSTRITTSPUNKTS, 24 bit in RGB gepackt.
 *   D2a Vorderseiten, Tiefenvorlauf ohne Farbe.  Legt die Frontflaeche in den
 *       Tiefenpuffer.  Ohne das wuerde jede Falte des Weichkoerpers doppelt
 *       multipliziert.
 *   D2b Vorderseiten, `blendFunc(ZERO, SRC_COLOR)` — der Hintergrund wird mit
 *       der Transmission T multipliziert.  PRO KANAL.  Das ist der Grund fuer
 *       den zweiten Durchgang: Alphablending kann nur einen Skalar, echte
 *       Absorption ist aber farbig (blaues Gel schluckt Rot stark, Blau kaum).
 *   D2c Vorderseiten, `blendFunc(ONE, ONE)` — das im Koerper gestreute Licht
 *       kommt dazu.
 *
 *   Ergebnis = Hintergrund · T(dicke) + Streuung(dicke)
 *
 * Die Weglaenge ist damit eine echte Groesse in Weltmetern.  Sie faellt beim
 * Aufprall zusammen, sie zieht sich bei Vollgas in die Laenge, sie wird in der
 * Todespfuetze duenn — ohne dass irgendjemand dafuer etwas umschalten muesste.
 * Das Material traegt jede Verformung, weil es aus der Verformung kommt.
 *
 * ---------------------------------------------------------------------------
 * 3. DER GEFRESSENE GEGNER (GDD 01 §28) — Kernanforderung, nicht Detail
 * ---------------------------------------------------------------------------
 * Der Gegner wird vor dem Gel gezeichnet und steht damit im Ziel.  Wuerde man
 * ihn mit der vollen Saeule multiplizieren, waere er weg.  Deshalb bekommt das
 * Material eine EINSCHLUSSLISTE: Kugeln im Koerperinneren, deren Sehnenlaenge
 * analytisch aus der Weglaenge herausgerechnet wird (Strahl-Kugel-Schnitt im
 * Fragmentshader, exakt, ohne Puffer, ohne Zufall).
 *
 * Vor dem Gegner bleibt dann genau die duenne Frontschicht stehen — er ist
 * sichtbar, blaustichig verschleiert, und er steckt erkennbar DRIN statt davor
 * zu kleben.  Das ist dasselbe Bild wie in ref/slime-rancher/
 * sr1-slime-eating-face-closeup.jpg, wo die Ruebe im blauen Koerper haengt.
 * Zusaetzlich legt der Streifschnitt einen schwachen Lichtsaum um ihn: das Gel,
 * das er beiseite draengt.
 *
 * Die Liste ist offen — jedes Modul mit Ordnung < 60 darf in `vorbereiten`
 * eigene Kugeln eintragen (Mundhoehle, verschluckte Beute, Blase).
 *
 * ---------------------------------------------------------------------------
 * 4. FARBE
 * ---------------------------------------------------------------------------
 * Die Farbe ist nicht frei (GDD 01 §8): Eldoran blau, Ravok rot.  Jede Fraktion
 * bringt vier Werte mit — klar (duenne Zone), kern (Streualbedo), tief (satte
 * dunkle Zone) und einen Absorptionsvektor.  Tiefe Zonen werden satter und
 * dunkler, duenne heller und klarer, weil beides aus derselben gemessenen
 * Weglaenge folgt.
 *
 * ---------------------------------------------------------------------------
 * 5. WOHER DER HELL-DUNKEL-VERLAUF KOMMT
 * ---------------------------------------------------------------------------
 * Nicht aus N·L.  Ein reines Oberflaechenmodell zeigt gar keinen Terminator,
 * sobald die Sonne hinter der Kamera steht — und dann ist der Koerper flach,
 * egal wie gut der Rest stimmt.  Der Verlauf entsteht hier aus DEMSELBEN
 * Beer-Lambert-Term wie die Dicke, nur auf dem LICHTWEG: Licht faellt von oben
 * ein (Sonne plus Himmelskuppel) und wird auf dem Weg nach unten durch die
 * Masse geschluckt.  Deshalb ist die Unterseite dunkel, deshalb bleibt sie
 * farbig statt grau, und deshalb folgt der Verlauf jeder Verformung: `uHoch`
 * ist die halbe Hoehe der TATSAECHLICHEN Huelle, jedes Bild neu gemessen.
 *
 * ---------------------------------------------------------------------------
 * 6. VERTRAG FUER DIE MODULE, DIE DARAUF AUFSETZEN
 * ---------------------------------------------------------------------------
 * Nach `vorbereiten` steht die Schnittstelle unter `R.gel` (== `GRAFIK.gel`):
 *
 *   farbe        { klar, kern, tief, absorb, glanz } — bereits nach Fraktion
 *                UND Todeszustand aufgeloest.  Wer die Farbe des Schleims
 *                braucht, nimmt diese, nicht die Fraktionstabelle.
 *   dichte       Extinktion pro Radiuslaenge, nach Wuenschen aufgeloest
 *   radius       PARAMS.radius (Groesse kommt ausschliesslich vom Level)
 *   mitte, hoch  Schwerpunkt und halbe Hoehe der Huelle, dieses Bild gemessen
 *   unten        Weltkoordinate der tiefsten Stelle — der Bodenkontakt
 *   tiefeTex     RGBA8-Textur, RGB = 24-bit-Kameradistanz des AUSTRITTS-
 *                punkts, A = 1 wo Gel liegt.  Bildschirmdeckend, gleiche
 *                Groesse wie ctx.ziel.
 *   texGroesse   [breite, hoehe] dieser Textur
 *   weit         Normierung der gepackten Distanz (Meter)
 *   einschluss   [{ pos:[x,y,z], r, kraft }] — was gerade im Koerper steckt
 *   glsl.packen  der GLSL-Baustein mit `packe()` / `entpacke()`
 *   binden(gl, prog, einheit)  bindet tiefeTex und setzt uTiefeTex, uHatTiefe,
 *                uWeit, uRadius, uDichte, uAbsorb, uKlar, uKern, uTief
 *
 * WER WANN ZEICHNET (Ordnungen aus renderer2.js):
 *
 *   < 60  alles, was IM Koerper stecken soll — Gesicht (45), Beute, Blasen.
 *         Solche Module zeichnen normal und undurchsichtig; das Gel legt sich
 *         danach darueber und verschleiert sie um genau die Dicke, die davor
 *         steht.  Wer nicht verschleiert werden will, traegt sich in
 *         `R.gel.wunsch.einschluss` ein und bekommt nur die Frontschicht.
 *   = 60  dieses Modul.
 *   > 60  alles, was AUF der Oberflaeche sitzt — Glanz, Randlicht, Nass-
 *         schimmer, Treffermarkierungen.  Die Frontflaeche des Gels steht
 *         nach diesem Modul im Tiefenpuffer, also:
 *             gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
 *             gl.blendFunc(gl.ONE, gl.ONE);      // additiv aufsetzen
 *         Damit landet der Aufsatz punktgenau auf der Oberflaeche und nicht
 *         auf der Kontur dahinter.
 *
 * DER WUNSCHZETTEL — `R.gel.wunsch`, gueltig fuer GENAU EIN BILD.
 * Module mit Ordnung < 60 duerfen in ihrem `vorbereiten` setzen:
 *
 *   dichteMul   Faktor auf die Dichte   (Blase duenner, Gift dicker)
 *   glanzMul    Faktor auf den Glanz
 *   truebung    0..1 Richtung Todespfuetze (dunkler, truebe, matt)
 *   tonung      [r,g,b] Faktor auf die ganze Palette (Schadensblitz, Buff)
 *   einschluss  weitere Kugeln { pos, r, kraft } — kraft 1 = kein Gel davor
 *               ausser der Frontschicht
 *
 * Danach wird der Zettel geleert.  Ein Wert, der bleiben soll, muss jedes
 * Bild neu gesetzt werden — sonst haengt eine Faerbung fuer den Rest der
 * Sitzung im Bild und niemand findet, woher sie kommt.
 *
 * ---------------------------------------------------------------------------
 * Determinismus (ARCHITEKTUR §2 / GRAFIK-MODULE §4): kein Math.random, kein
 * Date, kein performance.now.  Zeit ausschliesslich ueber ctx.time.
 * ======================================================================== */

(function () {

  /* --- Anmeldung ----------------------------------------------------------
   * glsl.js legt GRAFIK an und laeuft laut laden.js vor dieser Datei.  Falls
   * die Lane GRAFIK-0 noch nicht so weit ist, wird hier ein Minimalregister
   * erzeugt, damit diese Datei die Seite nicht beim Laden zerlegt.  Existiert
   * GRAFIK bereits, wird nichts ueberschrieben. */
  const G = (typeof GRAFIK !== 'undefined' && GRAFIK) ? GRAFIK : (window.GRAFIK = {});
  if (!G.module) G.module = [];
  if (!G.modul) G.modul = function (m) { G.module.push(m); return m; };

  /* ======================================================================
   * Fraktionspalette
   *
   * absorb ist der Extinktionsvektor pro Radiuslaenge, auf Mittelwert 1
   * normiert.  Blaues Gel schluckt Rot am staerksten, Blau am wenigsten —
   * daher sieht man durch einen dicken blauen Koerper blaustichig hindurch
   * und nicht grau.  Genau das trennt Gel von getoentem Glas.
   * ==================================================================== */
  const PALETTE = {
    eldoran: {
      klar:   [0.52, 0.86, 1.00],   // duenne Zone: hell und klar, aber blau
      kern:   [0.16, 0.62, 0.98],   // Streualbedo, die Fraktionsfarbe
      tief:   [0.04, 0.22, 0.58],   // dicke Zone: satt und dunkel
      absorb: [1.81, 0.84, 0.35],
      glanz:  [0.90, 0.97, 1.00],
    },
    ravok: {
      klar:   [1.00, 0.66, 0.54],
      kern:   [0.95, 0.20, 0.20],
      tief:   [0.36, 0.03, 0.06],
      absorb: [0.33, 1.19, 1.48],
      glanz:  [1.00, 0.92, 0.86],
    },
  };

  /* Todespfuetze (GDD 01 §50): dunkler und „tot".  Kein eigener Pfad im
   * Shader — nur eine Verschiebung derselben vier Werte, damit die Pfuetze
   * erkennbar derselbe Koerper bleibt. */
  /* Die Pfuetze ist duenn, und duenn heisst nach dem Materialgesetz hell und
   * klar — genau das Gegenteil von „tot".  Also wird nicht die Regel gebeugt,
   * sondern der Stoff geaendert: die tote Masse ist truebe (dreifache Dichte),
   * damit selbst zwei Zentimeter Pfuetze noch decken, und die ganze Palette
   * rutscht nach unten.  Der Glanz geht fast weg — nichts an einer Leiche
   * glaenzt (GDD 01 §50). */
  const TOT = { klar: 0.30, kern: 0.30, tief: 0.46, dichte: 3.20, glanz: 0.18 };

  /* ======================================================================
   * Shader
   * ==================================================================== */

  /* Gemeinsam fuer alle Durchgaenge.  `invariant gl_Position` ist Pflicht:
   * D2b/D2c testen mit depthFunc(EQUAL) gegen die Tiefe, die D2a geschrieben
   * hat.  Ohne die Zusicherung darf der Treiber die Position zwischen zwei
   * Programmen minimal anders rechnen, und der Schleim flackert. */
  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
invariant gl_Position;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vPos = aPos;
  vNormal = aNormal;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  /* 24-bit-Packung in RGB8.  Kein Float-Ziel, keine Erweiterung, laeuft auch
   * unter SwiftShader in der Aufnahme. */
  const PACKEN = `
const vec3 BIT = vec3(1.0, 255.0, 65025.0);
vec3 packe(float v) {
  vec3 e = fract(BIT * clamp(v, 0.0, 1.0));
  e.xy -= e.yz * (1.0 / 255.0);
  return e;
}
float entpacke(vec3 p) {
  return dot(p, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}`;

  /* D1: Austrittspunkt. */
  const FS_TIEFE = `#version 300 es
precision highp float;
${PACKEN}
in vec3 vPos;
uniform vec3 uCam;
uniform float uWeit;
out vec4 outColor;
void main() {
  // a = 1 markiert „hier gibt es eine Rueckseite".  Der Vordurchgang liest
  // das; wo nichts steht, faellt er auf eine Schaetzung aus der Normalen
  // zurueck statt einen Koerper ohne Tiefe zu zeichnen.
  outColor = vec4(packe(length(vPos - uCam) / uWeit), 1.0);
}`;

  const MAX_EINSCHLUSS = 8;

  const FS_GEL = `#version 300 es
precision highp float;
${PACKEN}
in vec3 vPos;
in vec3 vNormal;

uniform vec3  uCam;
uniform vec3  uLicht;         // Richtung ZUR Quelle
uniform vec3  uSonne;         // Farbe und Staerke der gerichteten Quelle
uniform vec3  uHimmel;        // Umgebungslicht von oben
uniform vec3  uBodenLicht;    // Reflex vom Boden zurueck in den Bauch

uniform vec3  uKlar;
uniform vec3  uKern;
uniform vec3  uTief;
uniform vec3  uAbsorb;
uniform vec3  uGlanzFarbe;

uniform float uRadius;        // Ruheradius, Level-abhaengig
uniform vec3  uMitte;         // Schwerpunkt des Koerpers
uniform float uHoch;          // halbe Koerperhoehe, folgt der Verformung
uniform float uWeit;
uniform float uZeit;

uniform float uDichte;        // Extinktion pro Radiuslaenge
uniform float uSaettigung;    // wie schnell die Dickenrampe nach tief laeuft
uniform float uTermA;         // Beginn der Lichtschulter
uniform float uTermB;         // Ende der Lichtschulter — darueber Plateau
uniform float uSchattenTiefe; // Pegel des Umgebungslichts
uniform float uSelbstschatten;// Extinktion des einfallenden Lichts im Koerper
uniform float uRandStaerke;
uniform float uRandBreite;
uniform float uSpiegel;       // Himmelsspiegelung am streifenden Rand
uniform float uGlanzHaerte;
uniform float uGlanzStaerke;
uniform float uDurchleucht;
uniform float uStroemung;
uniform float uFrontschicht;  // Restdicke vor einem Einschluss, in Radiuslaengen

uniform sampler2D uTiefeTex;
uniform float uHatTiefe;

uniform vec4  uEinschluss[${MAX_EINSCHLUSS}];   // xyz Mittelpunkt, w Radius
uniform float uEinschlussKraft[${MAX_EINSCHLUSS}];
uniform int   uEinschlussZahl;

uniform int   uModus;         // 0 = Absorption (multiplizieren), 1 = Streuung

out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

void main() {
  // Modus 2 ist der Tiefenvorlauf: nur gl_Position zaehlt, die Farbmaske ist
  // ohnehin zu.  Frueh aussteigen spart eine volle Materialrechnung pro Pixel.
  if (uModus == 2) { outColor = vec4(0.0); return; }

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  if (dot(N, V) < 0.0) N = -N;          // Falten des Weichkoerpers
  vec3 D = -V;                          // Blickrichtung in den Koerper hinein
  vec3 L = normalize(uLicht);
  vec3 H = normalize(L + V);

  float ndl = dot(N, L);
  float ndv = max(dot(N, V), 0.0);
  float ndh = max(dot(N, H), 0.0);

  float vorne = length(vPos - uCam);

  /* --- Weglaenge durch das Gel ------------------------------------------
   * Erst die gemessene Strecke Eintritt→Austritt, dann die Sehnen aller
   * Einschluesse abgezogen.  Was uebrig bleibt, ist das Gel, das wirklich
   * zwischen Kamera und dem naechsten festen Ding steht. */
  vec4 tp = texelFetch(uTiefeTex, ivec2(gl_FragCoord.xy), 0);
  float hinten = entpacke(tp.rgb) * uWeit;
  float dicke = (uHatTiefe > 0.5 && tp.a > 0.5)
      ? max(hinten - vorne, 0.0)
      // Notlage: keine Rueckseitenkarte.  Kugelnaeherung, damit das Material
      // nie in einen flachen Anstrich zurueckfaellt.
      : uRadius * 2.0 * pow(ndv, 0.85);

  float saum = 0.0;
  float trifft = 0.0;
  for (int i = 0; i < ${MAX_EINSCHLUSS}; i++) {
    if (i >= uEinschlussZahl) break;
    vec3  C = uEinschluss[i].xyz;
    float r = uEinschluss[i].w;
    if (r <= 0.0) continue;
    vec3  m = vPos - C;
    float b = dot(m, D);
    float c = dot(m, m) - r * r;
    float disc = b * b - c;
    if (disc <= 0.0) continue;
    float w = sqrt(disc);
    float t0 = clamp(-b - w, 0.0, dicke);
    float t1 = clamp(-b + w, 0.0, dicke);
    dicke -= (t1 - t0) * uEinschlussKraft[i];
    trifft = max(trifft, (t1 > t0 ? 1.0 : 0.0) * uEinschlussKraft[i]);
    // Streifschnitt: dort, wo der Strahl die Kugel gerade noch trifft, staut
    // sich das verdraengte Gel.  Ein schmaler Saum, der den Einschluss im
    // Koerper verankert statt ihn wie eine Ebene davorzukleben.
    saum = max(saum, exp(-disc / max(0.055 * r * r, 1e-5)) * uEinschlussKraft[i]);
  }
  /* Vor einem Einschluss bleibt IMMER eine Frontschicht stehen.  Genau die
   * legt den Gegner nach INNEN: ohne sie klebt er unverhuellt im Bild und die
   * Umschlingung liest sich als Ueberlagerung statt als Verschlucken
   * (GDD 01 §28).  Mit ihr sieht er aus wie die Ruebe im blauen Koerper in
   * ref/slime-rancher/sr1-slime-eating-face-closeup.jpg. */
  dicke = max(dicke, uFrontschicht * uRadius * trifft);
  dicke = max(dicke, 0.0);
  float dRel = dicke / max(uRadius, 1e-3);

  /* --- Transmission, pro Kanal ------------------------------------------
   * Beer-Lambert auf der gemessenen Weglaenge.  Farbig, weil Absorption
   * farbig ist: durch einen dicken blauen Koerper sieht man blaustichig
   * hindurch, nicht grau. */
  vec3 T = exp(-dRel * uDichte * uAbsorb);

  /* Wie DECKEND die Stelle ist, ist eine skalare Groesse — wie FARBIG sie
   * durchlaesst, eine vektorielle.  Die beiden zu vermischen war der Fehler
   * des ersten Versuchs: nimmt man 1-T kanalweise als Menge des gestreuten
   * Lichts, dann streut ausgerechnet der Kanal am wenigsten, der am wenigsten
   * geschluckt wird.  Aus Eldoran-Blau wird Graugruen.  Die Farbe kommt
   * deshalb allein aus der Dickenrampe, die Menge aus der Deckung. */
  float deckung = 1.0 - dot(T, LUMA);

  /* Am streifenden Rand reflektiert jede Grenzflaeche fast vollstaendig.
   * Das ist der Grund, warum die Silhouette eines Gelkoerpers steht, obwohl
   * das Gel dort duenn und eigentlich klar ist.  Ohne diesen Term loest sich
   * die Kontur auf und man kann die Verformung nicht mehr ablesen — und die
   * Verformung ist die Figur (GDD 01 §66).  Gespiegelt wird eine EINGEFAERBTE
   * Umgebung: eine neutrale ergibt einen kreidigen Umriss, und einen Outline
   * hat das Material laut Dossier §7 gerade nicht. */
  float f0 = 0.04;
  float spiegel = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);
  vec3  umgebung = uKlar * (uHimmel * 0.55 + uSonne * 0.40);
  T *= (1.0 - spiegel * uSpiegel);

  /* --- Dickenrampe: klar -> kern -> tief --------------------------------
   * Das ist die Rampe des Verfahrens, nur auf der richtigen Achse.  Drei
   * Stuetzstellen, weiche Uebergaenge: mehr Stufen sieht man bei 72–108 px
   * Koerperhoehe ohnehin nicht (DOSSIER §8.3). */
  float tiefe = 1.0 - exp(-dRel * uSaettigung);
  vec3 streu = mix(mix(uKlar, uKern, clamp(tiefe * 2.0, 0.0, 1.0)),
                   uTief,
                   clamp(tiefe * 2.0 - 1.0, 0.0, 1.0));

  /* Sehr langsame innere Stroemung, nur in der dicken Zone.  Ausschliesslich
   * ueber uZeit — dieselbe Aufnahme ergibt immer dasselbe Bild. */
  float zug = sin(vPos.y * 3.1 - uZeit * 0.55 + vPos.x * 1.7 + vPos.z * 1.3)
            * 0.5 + 0.5;
  streu = mix(streu, streu * 1.16, zug * uStroemung * tiefe);

  /* --- Licht: EINE Schulter, oben Plateau -------------------------------
   * Kein Lambert (der schmiert das Volumen weg), keine harte Cel-Kante (die
   * behauptet eine undurchsichtige Oberflaeche).  Der Schatten behaelt den
   * Farbton — er wird nicht grau (DOSSIER §7). */
  float lit = smoothstep(uTermA, uTermB, ndl);

  /* Das Umgebungslicht ist NICHT konstant.  Ein Blob sitzt auf dem Boden: sein
   * Scheitel sieht den ganzen Himmel, sein Bauch fast keinen.  Genau daher
   * kommt der Hell-Dunkel-Verlauf von OBEN NACH UNTEN, den das Dossier misst
   * (§7, 2.9 : 1) — und zwar unabhaengig davon, wo die Sonne gerade steht.
   * Mit einem konstanten Umgebungsterm bleibt der Koerper flach, sobald die
   * Sonne hinter der Kamera steht; das war der Fehler des ersten Versuchs.
   * Der Bodenreflex fuellt die Unterkante wieder auf (gemessen 1.33x). */
  float himmelSicht = smoothstep(-0.55, 0.80, N.y);
  vec3 umlicht = uHimmel * (0.16 + 0.84 * himmelSicht)
               + uBodenLicht * (1.0 - himmelSicht) * 0.18;
  vec3 licht = umlicht * (uSchattenTiefe * 3.1) + uSonne * lit;

  /* Und hier kommt der Verlauf her, den das Dossier als 2.9 : 1 von oben nach
   * unten misst.  Er ist KEINE Schattierung der Oberflaeche, sondern derselbe
   * Beer-Lambert-Term wie oben, nur auf dem LICHTWEG statt auf dem Blickweg:
   * Licht faellt von oben ein und wird auf dem Weg nach unten durch den
   * Koerper geschluckt.  Deshalb ist die Unterseite eines Gelkoerpers dunkel,
   * auch wenn die Sonne hinter der Kamera steht und rein geometrisch gar kein
   * Terminator im Bild waere.  Ein N·L-Modell allein kann das nicht liefern —
   * und genau daran bleibt der bestehende Pfad flach.
   *
   * Die Einfallsachse ist Sonne plus Himmelskuppel, also immer nach oben
   * gekippt.  uHoch folgt der Verformung: gestaucht wird der Verlauf kuerzer
   * und steiler, gestreckt laenger. */
  vec3  Lein = normalize(L + vec3(0.0, 1.2, 0.0));
  float durchdrungen = clamp((uHoch - dot(vPos - uMitte, Lein)) / max(2.0 * uHoch, 1e-3),
                             0.0, 1.0);
  licht *= exp(-durchdrungen * uSelbstschatten);

  vec3 col = streu * licht * deckung;

  /* --- Durchleuchtung ----------------------------------------------------
   * Was von hinten einfaellt, traegt die Farbe des Inneren nach vorn — aber
   * nur dort, wo wenig Gel im Weg steht.  Deshalb an der duennen Flanke
   * sichtbar und im Kern nicht. */
  float durch = pow(max(dot(V, -L), 0.0), 3.0) * exp(-dRel * uDichte * 0.75);
  col += uKlar * uSonne * durch * uDurchleucht;

  /* --- Fresnel-Rand, NUR in der Schattenhaelfte --------------------------
   * Gemessen: in der voll beleuchteten oberen Haelfte ist die Helligkeit
   * ueber die gesamte Breite konstant, es gibt dort keinen Randeffekt.  In
   * der Schattenhaelfte hellt der Rand auf 1.6–1.9x auf, auf 5–7 % der
   * Koerperbreite.  Der Rand traegt hier die Silhouette — ohne ihn liest man
   * die Verformung im Gegenlicht nicht mehr. */
  float rand = pow(1.0 - ndv, uRandBreite);
  col += uKlar * rand * (1.0 - lit) * uRandStaerke;
  col += umgebung * spiegel * uSpiegel;   // Gegenstueck zum Abzug bei T

  /* Saum um einen Einschluss. */
  col += uKlar * saum * 0.30 * (0.35 + 0.65 * lit);

  /* --- Glanzlicht: ENTSAETTIGEN statt aufhellen --------------------------
   * Am Material gemessen: Helligkeit nur +18 %, aber die Saettigung faellt
   * von 0.56 auf 0.30.  Ein additives Weiss macht daraus poliertes Glas und
   * verbrennt die halbe Kuppel.  Weiche Schulter, keine harte Kante. */
  float kernR = pow(ndh, uGlanzHaerte);
  float glanz = smoothstep(0.06, 0.80, kernR) * uGlanzStaerke * lit;
  float hoch  = max(max(col.r, col.g), col.b);
  col = mix(col, mix(col, vec3(hoch) * uGlanzFarbe, 0.62) * 1.18, glanz);

  /* Zweiter, sehr flauer Schimmer auf der gegenueberliegenden oberen Flanke
   * (DOSSIER §7).  Breit, schwach, ohne eigene Kante. */
  vec3 gegen = normalize(vec3(-L.x, 0.85, -L.z));
  col += uGlanzFarbe * pow(max(dot(N, gegen), 0.0), 5.0) * 0.055 * uGlanzStaerke;

  if (uModus == 0) {
    // Absorption: der Hintergrund — und damit alles, was VOR dem Gel
    // gezeichnet wurde, also auch der verschluckte Gegner — wird pro Kanal
    // gedaempft.  a = 1, damit blendFuncSeparate das Alpha unberuehrt laesst.
    outColor = vec4(T, 1.0);
  } else {
    outColor = vec4(max(col, vec3(0.0)), 0.0);
  }
}`;

  /* ======================================================================
   * Hilfen — benutzen GRAFIK, wo es sie schon gibt
   * ==================================================================== */

  function programm(gl, vs, fs) {
    if (typeof G.programm === 'function') return G.programm(gl, vs, fs);
    const bau = (typ, src) => {
      const s = gl.createShader(typ);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s);
        const zeilen = src.split('\n').map((z, i) => (i + 1) + ': ' + z).join('\n');
        throw new Error('gel: Shader fehlerhaft\n' + log + '\n' + zeilen);
      }
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, bau(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, bau(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('gel: Programm nicht verlinkt: ' + gl.getProgramInfoLog(p));
    }
    return p;
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

  function orte(gl, p, namen) {
    const u = {};
    for (const n of namen) u[n] = gl.getUniformLocation(p, n);
    return u;
  }

  /* ======================================================================
   * Modulzustand
   * ==================================================================== */

  const S = {
    progTiefe: null, uT: null,
    progGel: null, uG: null,
    fbo: null, tex: null, breite: 0, hoehe: 0,
    mesh: null,               // eigenes VAO, falls R.slimeMesh fehlt
    zuletzt: -1,              // damit die Huelle pro Bild nur einmal hochlaedt
    bereit: false,
  };

  /* Stellschrauben.  Die Vorgaben sind die Zahlen aus ref/slime/DOSSIER.md §7,
   * nicht Geschmack: Kontrast 2.9 : 1, Glanz 9 % der Breite und entsaettigend,
   * Fresnel-Rand 5–7 % der Breite und nur im Schatten. */
  const P = {
    dichte:        1.62,
    saettigung:    0.88,
    termA:         0.16,
    termB:         0.54,
    schattenTiefe: 0.30,   // Pegel des Umgebungslichts
    selbstschatten:2.05,   // Zielkontrast 2.5 : 1 bis 3.3 : 1 von oben nach unten
    randStaerke:   0.34,
    randBreite:    6.00,
    spiegel:       0.22,
    glanzHaerte:   95.0,
    glanzStaerke:  1.00,
    durchleucht:   0.55,
    stroemung:     0.08,
    frontschicht:  0.26,   // Restdicke vor einem Einschluss, in Radiuslaengen
  };

  const uNamen = [
    'uViewProj', 'uCam', 'uLicht', 'uSonne', 'uHimmel', 'uBodenLicht',
    'uKlar', 'uKern', 'uTief', 'uAbsorb', 'uGlanzFarbe',
    'uRadius', 'uMitte', 'uHoch', 'uWeit', 'uZeit',
    'uDichte', 'uSaettigung', 'uTermA', 'uTermB', 'uSchattenTiefe', 'uSelbstschatten',
    'uRandStaerke', 'uRandBreite', 'uSpiegel', 'uGlanzHaerte', 'uGlanzStaerke',
    'uDurchleucht', 'uStroemung', 'uFrontschicht',
    'uTiefeTex', 'uHatTiefe', 'uEinschlussZahl', 'uModus',
  ];

  /* ======================================================================
   * Ziel fuer die Rueckseitenkarte
   * ==================================================================== */

  function zielAnlegen(gl, w, h) {
    if (S.fbo && S.breite === w && S.hoehe === h) return true;
    if (S.tex) gl.deleteTexture(S.tex);
    if (S.fbo) gl.deleteFramebuffer(S.fbo);
    S.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, S.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    S.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, S.tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    S.breite = w; S.hoehe = h;
    if (!ok) { S.fbo = null; S.tex = null; S.breite = 0; S.hoehe = 0; }
    return ok;
  }

  /* ======================================================================
   * Zustand pro Bild
   * ==================================================================== */

  function paletteFuer(ctx) {
    const f = ctx.faction
           || (ctx.game && ctx.game.spieler && ctx.game.spieler.faction)
           || 'eldoran';
    return PALETTE[f] || PALETTE.eldoran;
  }

  function mische(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  const skaliere = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  /* Kugeln, die aus der Weglaenge herausgerechnet werden.
   *
   * Zwei Quellen:
   *  - die Wuensche der Module mit kleinerer Ordnung (Mund, Blase, Beute),
   *  - als Vorgabe der gerade verschluckte Gegner, damit die Kernanforderung
   *    GDD 01 §28 auch dann steht, wenn noch kein Modul dafuer existiert. */
  function einschluesseSammeln(ctx, wunsch) {
    const liste = [];
    for (const e of wunsch.einschluss) liste.push(e);

    const b = ctx.slime && ctx.slime.body;
    const fressen = window.Fressen;
    if (b && fressen && fressen.aktiv && fressen.ziel) {
      const k = fressen.ziel;
      const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1);
      if (f > 0.02) {
        // Der Gegner liegt in der Masse; sein Mittelpunkt sitzt eine halbe
        // Koerperhoehe ueber dem Boden, so wie eat.js den Bolus fuehrt.
        const r = k.groesse * 0.95 * f;
        // Erst wenn er wirklich umschlungen ist, wird das Gel vor ihm duenn.
        // Vorher steht er noch davor und braucht keine Aussparung.
        const kraft = Math.max(k.umschlungen || 0, k.absorbiert ? 1 : 0);
        if (kraft > 0.01) {
          liste.push({ pos: [k.x, k.y + k.groesse * 0.55, k.z], r, kraft: Math.min(1, kraft) });
        }
      }
    }

    return liste.slice(0, MAX_EINSCHLUSS);
  }

  /* ======================================================================
   * Das Modul
   * ==================================================================== */

  const modul = {
    name: 'gel',
    ordnung: 60,   // Grundzug 'gel' aus renderer2.js — wird per Namensregel verdraengt

    regler: [
      { key: 'dichte', min: 0.4, max: 3.0, step: 0.02, wert: P.dichte },
      { key: 'saettigung', min: 0.1, max: 2.0, step: 0.02, wert: P.saettigung },
      { key: 'schattenTiefe', min: 0.15, max: 0.70, step: 0.01, wert: P.schattenTiefe },
      { key: 'selbstschatten', min: 0.0, max: 2.5, step: 0.02, wert: P.selbstschatten },
      { key: 'termA', min: -0.2, max: 0.6, step: 0.01, wert: P.termA },
      { key: 'termB', min: 0.1, max: 0.95, step: 0.01, wert: P.termB },
      { key: 'randStaerke', min: 0.0, max: 1.6, step: 0.02, wert: P.randStaerke },
      { key: 'randBreite', min: 1.5, max: 9.0, step: 0.1, wert: P.randBreite },
      { key: 'spiegel', min: 0.0, max: 1.0, step: 0.02, wert: P.spiegel },
      { key: 'glanzHaerte', min: 20, max: 400, step: 2, wert: P.glanzHaerte },
      { key: 'glanzStaerke', min: 0.0, max: 2.0, step: 0.02, wert: P.glanzStaerke },
      { key: 'durchleucht', min: 0.0, max: 1.5, step: 0.02, wert: P.durchleucht },
      { key: 'stroemung', min: 0.0, max: 0.5, step: 0.01, wert: P.stroemung },
      { key: 'frontschicht', min: 0.05, max: 0.9, step: 0.01, wert: P.frontschicht },
    ],

    /* ----------------------------------------------------------------- */
    aufbau(gl, R) {
      S.progTiefe = programm(gl, VS, FS_TIEFE);
      S.uT = orte(gl, S.progTiefe, ['uViewProj', 'uCam', 'uWeit']);

      S.progGel = programm(gl, VS, FS_GEL);
      S.uG = orte(gl, S.progGel, uNamen);
      for (let i = 0; i < MAX_EINSCHLUSS; i++) {
        S.uG['e' + i] = gl.getUniformLocation(S.progGel, 'uEinschluss[' + i + ']');
        S.uG['k' + i] = gl.getUniformLocation(S.progGel, 'uEinschlussKraft[' + i + ']');
      }
      S.bereit = true;

      /* Oeffentliche Schnittstelle.  Steht ab hier, damit Module, die im
       * aufbau schon Programme uebersetzen wollen, die GLSL-Bausteine
       * bekommen, bevor das erste Bild laeuft. */
      const api = {
        MAX_EINSCHLUSS,
        palette: PALETTE,
        regler: P,
        /* wird pro Bild von `vorbereiten` gefuellt */
        farbe: null, dichte: 0, glanzStaerke: P.glanzStaerke,
        radius: 1, unten: 0, weit: 300, mitte: [0, 1, 0], hoch: 1,
        tiefeTex: null, texGroesse: [0, 0], einschluss: [],
        frontschicht: P.frontschicht,
        /* Wunschzettel fuer Module mit kleinerer Ordnung */
        wunsch: { dichteMul: 1, glanzMul: 1, truebung: 0, tonung: null, einschluss: [] },
        glsl: { packen: PACKEN, gel: FS_GEL },
        binden: null,   // in vorbereiten gesetzt
      };
      G.gel = api;
      R.gel = api;
    },

    /* ----------------------------------------------------------------- */
    vorbereiten(gl, R, ctx) {
      if (!S.bereit) return;
      const api = R.gel || G.gel;
      const w = api.wunsch;

      const pal = paletteFuer(ctx);
      const params = ctx.params || { radius: 1 };
      const radius = Math.max(params.radius || 1, 1e-3);

      /* Todespfuetze (GDD 01 §50).  Vorgabe aus dem Spielzustand, damit die
       * Pfuetze auch ohne eigenes Modul „tot" aussieht; death-Grafikmodule
       * duerfen ueber `wunsch.truebung` uebersteuern. */
      const tot = Math.max(
        w.truebung,
        (window.Tod && window.Tod.aktiv && window.Tod.pfuetze) || 0
      );

      let klar = pal.klar, kern = pal.kern, tief = pal.tief;
      if (tot > 0) {
        klar = mische(pal.klar, skaliere(pal.klar, TOT.klar), tot);
        kern = mische(pal.kern, skaliere(pal.kern, TOT.kern), tot);
        tief = mische(pal.tief, skaliere(pal.tief, TOT.tief), tot);
      }
      if (w.tonung) {
        klar = [klar[0] * w.tonung[0], klar[1] * w.tonung[1], klar[2] * w.tonung[2]];
        kern = [kern[0] * w.tonung[0], kern[1] * w.tonung[1], kern[2] * w.tonung[2]];
        tief = [tief[0] * w.tonung[0], tief[1] * w.tonung[1], tief[2] * w.tonung[2]];
      }

      api.farbe = { klar, kern, tief, absorb: pal.absorb, glanz: pal.glanz };
      api.dichte = P.dichte * w.dichteMul * (1 + tot * (TOT.dichte - 1));
      api.glanzStaerke = P.glanzStaerke * w.glanzMul * (1 - tot * (1 - TOT.glanz));
      api.radius = radius;

      /* Mittelpunkt und halbe Hoehe der tatsaechlichen Huelle.  Nicht aus
       * PARAMS abgeleitet, sondern jedes Bild aus den Punkten gemessen: nur so
       * folgt der Lichtverlauf der Verformung, statt an einer Ruhegroesse zu
       * kleben.  Beim Aufprall wird der Verlauf kurz und steil, bei Vollgas
       * lang und flach, in der Todespfuetze fast waagerecht. */
      const b = ctx.slime && ctx.slime.body;
      const pos = ctx.surface && ctx.surface.positions;
      if (pos && pos.length >= 3) {
        let yMin = Infinity, yMax = -Infinity;
        for (let i = 1; i < pos.length; i += 3) {
          const y = pos[i];
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
        api.hoch = Math.max((yMax - yMin) * 0.5, 1e-3);
        api.mitte = [b ? b.cx : 0, (yMin + yMax) * 0.5, b ? b.cz : 0];
        api.unten = yMin;
      } else if (b) {
        api.hoch = radius;
        api.mitte = [b.cx, b.cy, b.cz];
        api.unten = b.cy - radius;
      }
      api.frontschicht = P.frontschicht;
      api.einschluss = einschluesseSammeln(ctx, w);

      /* Der Wunschzettel gilt genau ein Bild.  Sonst haelt ein einmal
       * gesetzter Wert bis zum Neustart und niemand findet, woher er kommt. */
      w.dichteMul = 1; w.glanzMul = 1; w.truebung = 0; w.tonung = null;
      w.einschluss = [];

      const ziel = ctx.ziel || {};
      const bw = ziel.breite || gl.drawingBufferWidth;
      const bh = ziel.hoehe || gl.drawingBufferHeight;
      api.texGroesse = [bw, bh];
      api.tiefeTex = zielAnlegen(gl, bw, bh) ? S.tex : null;

      /* Damit jedes folgende Modul dieselbe Weglaenge lesen kann, ohne sie
       * neu herzuleiten. */
      api.binden = function (gl2, prog, einheit) {
        const e = einheit === undefined ? 7 : einheit;
        const u = (n) => gl2.getUniformLocation(prog, n);
        gl2.activeTexture(gl2.TEXTURE0 + e);
        gl2.bindTexture(gl2.TEXTURE_2D, api.tiefeTex);
        gl2.uniform1i(u('uTiefeTex'), e);
        gl2.uniform1f(u('uHatTiefe'), api.tiefeTex ? 1 : 0);
        gl2.uniform1f(u('uWeit'), api.weit);
        gl2.uniform1f(u('uRadius'), api.radius);
        gl2.uniform1f(u('uDichte'), api.dichte);
        gl2.uniform3fv(u('uAbsorb'), api.farbe.absorb);
        gl2.uniform3fv(u('uKlar'), api.farbe.klar);
        gl2.uniform3fv(u('uKern'), api.farbe.kern);
        gl2.uniform3fv(u('uTief'), api.farbe.tief);
        gl2.activeTexture(gl2.TEXTURE0);
      };
    },

    /* ----------------------------------------------------------------- */
    zeichnen(gl, R, ctx) {
      if (!S.bereit) return;
      const api = R.gel || G.gel;
      if (!api || !api.farbe) return;

      /* Bevorzugt die Huelle, die die Pipeline schon haelt.  Fehlt sie, legt
       * das Modul eine eigene an — es soll nicht davon abhaengen, in welcher
       * Reihenfolge die Lanes fertig werden. */
      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) {
        mesh = S.mesh = eigenesNetz(gl, ctx.surface);
      }
      if (!mesh || !mesh.vao) return;

      /* Huelle hochladen.  Einmal pro Bild — wenn renderer2 das schon getan
       * hat, kostet der zweite Aufruf nichts Sichtbares, aber ein
       * ausgelassener kostet ein Bild Verzug in der Verformung. */
      if (ctx.surface && S.zuletzt !== ctx.time) {
        S.zuletzt = ctx.time;
        gl.bindVertexArray(mesh.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
        if (mesh.nb) {
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.normals);
        }
      }

      const ziel = ctx.ziel || {};
      const zielFbo = ziel.fbo !== undefined ? ziel.fbo : null;
      const bw = ziel.breite || gl.drawingBufferWidth;
      const bh = ziel.hoehe || gl.drawingBufferHeight;
      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      /* renderer2.js legt ctx.licht mit Nullvektoren an und ueberlaesst das
       * Fuellen licht.js.  Solange dieses Modul fehlt, waere ein blindes
       * Uebernehmen ein schwarzer Schleim — also wird ein Nullvektor wie ein
       * fehlender Wert behandelt. */
      const licht = ctx.licht || {};
      const nimm = (v, vorgabe) =>
        (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;
      const richtung = nimm(licht.richtung, nimm(R.light, [0.55, 0.78, 0.32]));
      const sonne = nimm(licht.farbe, [0.88, 0.85, 0.78]);
      const himmel = nimm(licht.himmel, nimm(licht.ambient, [0.34, 0.38, 0.47]));
      const boden = nimm(licht.boden, [0.27, 0.26, 0.23]);

      gl.bindVertexArray(mesh.vao);

      /* --- D1: Austrittspunkt in die Rueckseitenkarte -------------------- */
      if (api.tiefeTex) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, S.fbo);
        gl.viewport(0, 0, S.breite, S.hoehe);
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(false);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(S.progTiefe);
        gl.uniformMatrix4fv(S.uT.uViewProj, false, viewProj);
        gl.uniform3fv(S.uT.uCam, cam);
        gl.uniform1f(S.uT.uWeit, api.weit);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, zielFbo);
        gl.viewport(0, 0, bw, bh);
      }

      /* --- Uniforms fuer die drei Vorderseiten-Durchgaenge ---------------- */
      const u = S.uG;
      gl.useProgram(S.progGel);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform3fv(u.uLicht, richtung);
      gl.uniform3fv(u.uSonne, sonne);
      gl.uniform3fv(u.uHimmel, himmel);
      gl.uniform3fv(u.uBodenLicht, boden);
      gl.uniform3fv(u.uKlar, api.farbe.klar);
      gl.uniform3fv(u.uKern, api.farbe.kern);
      gl.uniform3fv(u.uTief, api.farbe.tief);
      gl.uniform3fv(u.uAbsorb, api.farbe.absorb);
      gl.uniform3fv(u.uGlanzFarbe, api.farbe.glanz);
      gl.uniform1f(u.uRadius, api.radius);
      gl.uniform1f(u.uWeit, api.weit);
      gl.uniform1f(u.uZeit, ctx.time || 0);
      gl.uniform1f(u.uDichte, api.dichte);
      gl.uniform1f(u.uSaettigung, P.saettigung);
      gl.uniform1f(u.uTermA, P.termA);
      gl.uniform1f(u.uTermB, P.termB);
      gl.uniform1f(u.uSchattenTiefe, P.schattenTiefe);
      gl.uniform1f(u.uSelbstschatten, P.selbstschatten);
      gl.uniform3fv(u.uMitte, api.mitte);
      gl.uniform1f(u.uHoch, api.hoch);
      gl.uniform1f(u.uRandStaerke, P.randStaerke);
      gl.uniform1f(u.uRandBreite, P.randBreite);
      gl.uniform1f(u.uSpiegel, P.spiegel);
      gl.uniform1f(u.uGlanzHaerte, P.glanzHaerte);
      gl.uniform1f(u.uGlanzStaerke, api.glanzStaerke);
      gl.uniform1f(u.uDurchleucht, P.durchleucht);
      gl.uniform1f(u.uStroemung, P.stroemung);
      gl.uniform1f(u.uFrontschicht, P.frontschicht);

      const ein = api.einschluss;
      gl.uniform1i(u.uEinschlussZahl, ein.length);
      for (let i = 0; i < MAX_EINSCHLUSS; i++) {
        const e = ein[i];
        if (e) {
          gl.uniform4f(u['e' + i], e.pos[0], e.pos[1], e.pos[2], e.r);
          gl.uniform1f(u['k' + i], e.kraft === undefined ? 0.8 : e.kraft);
        } else {
          gl.uniform4f(u['e' + i], 0, 0, 0, 0);
          gl.uniform1f(u['k' + i], 0);
        }
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, api.tiefeTex);
      gl.uniform1i(u.uTiefeTex, 0);
      gl.uniform1f(u.uHatTiefe, api.tiefeTex ? 1 : 0);

      /* --- D2a: Tiefenvorlauf ------------------------------------------
       * Legt die vorderste Gelflaeche in den Tiefenpuffer.  Danach zeichnen
       * D2b und D2c mit depthFunc(EQUAL) exakt EINE Schicht — bei einem
       * Weichkoerper mit Falten ist das der Unterschied zwischen „Volumen"
       * und „stellenweise doppelt so dunkel". */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.colorMask(false, false, false, false);
      gl.uniform1i(u.uModus, 2);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      gl.colorMask(true, true, true, true);

      gl.depthMask(false);
      gl.depthFunc(gl.EQUAL);
      gl.enable(gl.BLEND);

      /* --- D2b: Absorption, pro Kanal ----------------------------------- */
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ZERO, gl.SRC_COLOR, gl.ZERO, gl.ONE);
      gl.uniform1i(u.uModus, 0);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

      /* --- D2c: Streuung ------------------------------------------------ */
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE);
      gl.uniform1i(u.uModus, 1);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

      /* --- Zustand zurueckgeben ----------------------------------------
       * Die Tiefe der Frontflaeche BLEIBT stehen.  Module mit Ordnung > 50
       * zeichnen mit depthFunc(LEQUAL) genau auf der Oberflaeche — daran
       * haengen Gesicht, Glanz und alles, was auf dem Koerper sitzt. */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
  };

  G.modul(modul);

})();
