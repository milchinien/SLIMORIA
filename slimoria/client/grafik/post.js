'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — Bildnachbearbeitung.  Ordnung 95, also zuletzt.
 *
 * Was hier passiert, ist der letzte Griff, der über das ganze Bild geht:
 * Tonwertkurve mit weichem Knie, kanalweise geführt, ein Sättigungsboden in
 * den Lichtern, ein HARTER Schwarzhub und ein Dither gegen Streifen. Optional,
 * und nur mit HDR-Ziel, ein sehr schmaler Bloom.
 *
 * ---------------------------------------------------------------------------
 * DIE ENTSCHEIDUNG, DIE DIESE DATEI TRÄGT: KEIN ZWISCHENZIEL
 *
 * Schwarzhub, kanalweise Schulter und Dither sind reine Pro-Pixel-Rechnungen.
 * Sie brauchen keinen Nachbarpixel, also auch keinen Framebuffer, in dem die
 * Szene erst gesammelt wird. Der zweite Renderpfad zeichnet direkt in den
 * Standardpuffer; dieses Modul holt sich die fertigen Pixel mit
 * `copyTexSubImage2D` von dort in eine Textur und zeichnet ein Vollbilddreieck
 * zurück. Das kostet eine Kopie und einen Durchgang und lässt drei Dinge in
 * Ruhe, die ein umgeleitetes Ziel sofort kaputt macht:
 *
 *   1. Die Kantenglättung. `{antialias:true}` gilt NUR für den Standardpuffer
 *      (renderer2.js §Sondierung). Wer die Szene nach einem eigenen FBO
 *      umleitet und das Auflösen vergisst, verliert sie stillschweigend — und
 *      sieht es erst, wenn die 1,3-px-Kontur aus G5 ausfranst.
 *   2. Die Reihenfolge der übrigen Module. Niemand muss wissen, dass es post
 *      gibt; `ctx.ziel` bleibt unverändert der Bildschirm.
 *   3. Das Verhalten, wenn dieses Modul ausfällt. Ohne Umleitung steht das
 *      volle Bild schon im Puffer, bevor post überhaupt drankommt. Wirft post,
 *      sieht man das Bild ohne Griff — nicht ein schwarzes Fenster.
 *
 * `copyTexSubImage2D` löst den Mehrfachabtastpuffer dabei selbst auf. Das ist
 * genau der Grund, warum die Kopie und nicht das Umleiten die billigere
 * Antwort ist.
 *
 * Das HDR-Ziel gibt es trotzdem, hinter dem Regler `hdr` (Vorgabe 0, also
 * aus). Es wird gebraucht, sobald jemand Werte über 1,0 schreibt — vorher
 * verschenkt es nur Bandbreite, denn eine Schulter kann nichts komprimieren,
 * was der RGBA8-Puffer schon abgeschnitten hat. Und nur mit HDR gibt es Bloom;
 * ohne Kopfraum hat ein Schwellwert nichts zu schwellen. Begründung mit
 * Messzahlen weiter unten unter BLOOM.
 *
 * ---------------------------------------------------------------------------
 * DIE KURVE, UND WARUM SIE SO LIEGT
 *
 * Eingang der Kurve ist der AUSGABERAUM: 1,0 bedeutet „weiße Diffusfläche in
 * voller Sonne". PHASE-GRAFIK-PLAN §G3 kalibriert dieselbe Fläche in HDR auf
 * c ≈ 2,1; deshalb normiert `uBelichtung` im HDR-Betrieb mit 1/2,1 und die
 * Kurve bleibt in beiden Betriebsarten dieselbe Funktion. Eine zweite Kurve
 * hätte zwei Sätze Konstanten, und die laufen auseinander.
 *
 *   schulter(c) = c                                        für c <= knie
 *   schulter(c) = knie + s * (1 - exp(-(c-knie)/s))        für c >  knie
 *   mit s = weiss - knie
 *
 * Wert und Steigung sind am Knie stetig (Steigung genau 1), die Ableitung
 * darüber liegt immer in (0,1], die Funktion ist streng monoton und läuft
 * asymptotisch gegen `weiss`. Sie kann also nicht überschwingen und nicht
 * kippen — beides Fehler, die man bei einer stückweise angepassten Filmkurve
 * erst im Histogramm findet.
 *
 * Zahlen, gegen die kalibriert ist (alle gemessen, Quellen unten):
 *   knie   = 0,72   weiches Knie; darunter passiert außer dem Hub nichts.
 *   weiss  = 0,96   Asymptote.
 *     schulter(0,72) = 0,72    -> nach Hub 0,7424 -> L = 184  Schulteranfang
 *     schulter(1,00) = 0,8853  -> nach Hub 0,8945 -> L = 228  weiß in Sonne
 *     schulter(inf)  = 0,96    -> nach Hub 0,9632 -> L = 246  Deckel
 *   Die Schulter belegt damit das Band L 184…246, „weiß in voller Sonne"
 *   landet auf L 228 und damit mitten in Genshins gemessenem Dichtestau
 *   L 216…232. Der Deckel 246 entspricht Genshins hellstem gemessenen
 *   Lichtquellenkern (254,253,219), L 249; ToFs Neonkern ist (255,255,255).
 *
 *   Warum das Knie so weit oben liegt (der erste Versuch stand bei 0,55, und
 *   das war messbar falsch): mit knie 0,55 fällt der hellste Boden der Szene
 *   von L 208 auf L 194 — die Kurve zieht also genau die Lichter herunter, die
 *   sie eigentlich stauen soll. Mit 0,72 bleibt L 208 auf L 208 und der Stau
 *   entsteht erst über dem, was die Beleuchtung heute liefert.
 *   [gemessen an g-bodenlicht, Vergleich mit/ohne im selben Browserlauf]
 *
 * SCHWARZHUB 0,08 — HARTER BODEN, KEINE WEICHE ZEHE.
 * `c = hub + c*(1-hub)`, also eine reine Affinität. Genau das ist ein harter
 * Boden: unter 0,08 (= 20,4 von 255) kann nichts mehr liegen, und die Dichte
 * darunter ist nicht klein, sondern null. Eine weiche Zehe (`smoothstep`,
 * `pow`) wäre hier ausdrücklich falsch: in allen sieben geprüften
 * Genshin-Bildern ist der Anteil der Pixel unter L=8 exakt 0,000 %, das
 * niedrigste 1.-Perzentil ist 17 (ref/tof/UNTERSCHIEDE.md §3.1). Eine Zehe
 * erzeugt genau die Pixel, die dort fehlen.
 *
 * KANALWEISE, NICHT AUF DER LEUCHTDICHTE.
 * Der Unterschied, an dem man Genshin und ToF im Standbild am sichersten
 * trennt: Genshins Sättigung fällt in den Lichtern nur auf 22–38 %, ToFs auf
 * rund 6 %. Kanalweise erhält davon schon einen guten Teil; den Rest holt der
 * Sättigungsboden (`satBoden` unten), der die Sättigung in den Lichtern auf
 * `satBoden` anhebt — aber NIE über die des Eingangs hinaus. Ein Verstärker
 * würde aus einem grauen Fels einen bunten machen; hier wird nur zurückgeholt,
 * was die Kurve selbst weggedrückt hat.
 *
 * DITHER IST NICHT OPTIONAL.
 * Mit angehobenem Schwarz und flacher Kurve bleiben für eine Nachtszene rund
 * 113 der 256 Stufen. Ein Himmelsverlauf bandet dann sichtbar. Der Dither hier
 * ist eine Dreiecksverteilung über ±1 Stufe (Differenz zweier unabhängiger
 * geordneter Störungen) statt der einfachen Gleichverteilung über ±0,5 Stufen:
 * eine Dreiecksverteilung entkoppelt den Quantisierungsfehler vollständig vom
 * Signal, eine Gleichverteilung nur zur Hälfte. Kosten: dieselben, nämlich
 * keine. Beide Störungen hängen ausschließlich an `gl_FragCoord` — kein
 * `Math.random`, keine Uhr, dieselbe Aufnahme ergibt dieselben Pixel.
 *
 * ---------------------------------------------------------------------------
 * BLOOM — eigene Messung am Referenzmaterial, und was daraus folgt
 *
 * Gemessen an `ref/genshin/nacht_liyue_laternen_1600x900.png` (1600x900, also
 * ohne Umrechnung), radiale Mittelung um vier isolierte Himmelslaternen vor
 * dunklem Nachthimmel:
 *
 *   Laterne (613,164):  Kern L 249, Himmel L 34.  Spitzenwerte über den Radius:
 *                       r=8 -> 186, r=9 -> 148, r=10 -> 55, r=11 -> 53, ab
 *                       r=12 Grundwert 41–44.
 *   Laterne (474,168):  Kern 247, Himmel 35, r=9 -> 146, r=10 -> 99, r=11 -> 52.
 *   Laterne (542,176):  Kern 247, Himmel 36, r=8 -> 136, r=9 ->  97, r=10 -> 47.
 *   Laterne (1176,120): Kern 241, Himmel 42, r=3 -> 189, r=4 -> 162, r=5 -> 77,
 *                       r=6 -> 49.
 *
 * Der leuchtende Körper ist jeweils 8–10 px im Radius; JENSEITS seiner Kante
 * ist der Grundwert nach 1–2 px wieder erreicht. Der Schein reicht also
 *
 *      2 px bei 1600 px Bildbreite  =  0,13 % der Bildbreite.
 *
 * Zweite Messung an einer BREITEN, gesättigten Quelle, weil Genshins Bloom
 * flächenabhängig ist: `ref/genshin/nacht_login_mond_4k.png` (4096 breit),
 * Zeile 340, der beleuchtete Schlitz zwischen zwei Säulenstäben, x 1084…1120
 * (37 px breit, L 207…223). Rechts davon: 223 222 220 192 156 90 83 88 79 82
 * 76 76 75 74 72 69 69 69 67 66 66 — der Ferngrund liegt bei 64–66, erreicht
 * nach rund 15 px. Das sind
 *
 *      15 px bei 4096 px Bildbreite  =  0,37 % der Bildbreite
 *      (bei 1600x900 also rund 6 px).
 *
 * Zum Vergleich, dieselbe Messung an ToF (`ref/tof/nacht-neon-figuren-buehne.jpg`,
 * 1920 breit, Zeile 110): neben dem Kern liegt beidseitig über je rund 22 px
 * ein Sockel bei L 77–87, während der Ferngrund bei 14–20 liegt. Das sind
 * 1,15 % der Bildbreite bei einer Anhebung von +60 Stufen.
 *
 * DAMIT IST DIE ZAHL FÜR UNS: Reichweite 0,13 % der Bildbreite für eine
 * Punktquelle, höchstens 0,37 % für einen breiten Lichtschlitz — also 2 bis 6
 * Pixel bei 1600x900. PHASE-GRAFIK-PLAN §G11 nennt „Reichweite 37 px bei
 * 1600x900"; das sind 2,3 % der Bildbreite und liegt damit doppelt über dem,
 * was ich an ToF messe, und zwanzigfach über Genshin. Ich halte die Zahl im
 * Plan für einen Übertragungsfehler und richte mich nach der eigenen Messung.
 *
 * Praktische Folge: die Pyramide bleibt bei ZWEI Verkleinerungsstufen. Die
 * Impulsantwort dieser Pyramide habe ich nachgerechnet — derselbe 13-Punkt-
 * Abstieg und dasselbe 9-Punkt-Zelt wie unten im Shader, mit bilinearer
 * Abtastung, ein einzelner heller Punkt als Eingang, Profil in Vollbildpixeln
 * bei 1600 px Breite (Abbruch bei 2 % der Spitze):
 *
 *   Stufen 1:  Halbwertsbreite 3 px, Reichweite  4 px = 0,25 % der Breite
 *   Stufen 2:  Halbwertsbreite 3 px, Reichweite  8 px = 0,50 %
 *   Stufen 3:  Halbwertsbreite 3 px, Reichweite 11 px = 0,69 %
 *   Stufen 6:  Halbwertsbreite 3 px, Reichweite 13 px = 0,81 % — und dazu ein
 *              Schwanz, der bei 40 px noch nicht abgerissen ist. Genau der
 *              breite Sockel, an dem man ToF erkennt.
 *
 * Die Streuung verschiebt daran fast nichts (0,35 bis 0,80 ergeben alle 8 px);
 * der Hebel ist allein die Stufenzahl. Zwei Stufen liegen mit 0,50 % dicht an
 * der oberen gemessenen Genshin-Grenze von 0,37 %, eine Stufe mit 0,25 % dicht
 * an der unteren von 0,13 %. Beides ist vertretbar, sechs Stufen sind es
 * nicht.
 *
 * SCHWELLE 1,0, UND WARUM SIE NICHT TIEFER DARF. Mit `bloomSchwelle` 0,55
 * gemessen an g-bodenlicht: die Anhebung erfasst 99,97 % des Bildes und hebt
 * es um gleichmäßig +31 Stufen. Das ist kein Lichthof, das ist ein Schleier —
 * weil in dieser Szene fast alles über der Schwelle liegt. Genshins Bloom ist
 * flächen- UND schwellenabhängig; er greift erst über „weiß in voller Sonne".
 * Deshalb steht die Vorgabe bei genau 1,0.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein `Math.random`, kein `Date`, kein `performance.now` in dieser Datei.
 * Diese Nachbearbeitung liest überhaupt keine Zeit — sie ist eine reine
 * Funktion des Bildes, das schon im Puffer steht.
 * ------------------------------------------------------------------------- */

(function () {

  /* Register anlegen, falls glsl.js einmal fehlt. Wortgleich mit dem Kopf von
   * renderer2.js; damit hängt diese Datei an keiner Ladereihenfolge. */
  const GRAFIK = window.GRAFIK || (window.GRAFIK = {
    _module: [], _bausteine: Object.create(null), _klagen: Object.create(null),
    modul(m) {
      if (!m || typeof m !== 'object') throw new Error('GRAFIK.modul: kein Objekt');
      if (!m.name) throw new Error('GRAFIK.modul: Modul ohne name');
      if (m.ordnung === undefined || m.ordnung === null) m.ordnung = 50;
      m.aufgebaut = false; m.aus = false; m.wert = Object.create(null);
      this._module.push(m);
      return m;
    },
    module() { return this._module.slice().sort((a, b) => (a.ordnung || 0) - (b.ordnung || 0)); },
    baustein() { return ''; },
    bausteinSetzen(n, t) { this._bausteine[n] = t; return t; },
    bausteine() { return Object.keys(this._bausteine).sort(); },
  });

  /* ==========================================================================
   * 1. Shader
   * ======================================================================== */

  /* Der Griff. Ein Textbaustein, damit ein späteres Modul (etwa ein
   * Farbstich für Trefferzustände) dieselbe Kurve benutzen kann, statt eine
   * zweite danebenzustellen — genau der Fehler, den glsl.js für Nebel und
   * Dunst verhindert. */
  const GRIFF = `
#ifndef GRAFIK_GRIFF
#define GRAFIK_GRIFF

/* Rec.601-Helligkeit auf sRGB-Codewerten. Absichtlich NICHT die
 * Leuchtdichte auf linearen Werten: das Messwerkzeug tools/grafikmass.mjs
 * misst so, und alle Zielzahlen im Dossier sind sRGB-Ausgabewerte. Wer hier
 * linearisiert, verfehlt jede Zielzahl um denselben Betrag. */
float griffHelligkeit(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

/* Schulter, kanalweise. Stetig in Wert UND Steigung am Knie, streng monoton,
 * Asymptote bei weiss. Kein Überschwinger möglich. */
float schulter1(float c, float knie, float weiss) {
  if (c <= knie) return c;
  float s = max(weiss - knie, 1e-4);
  return knie + s * (1.0 - exp(-(c - knie) / s));
}
vec3 schulter(vec3 c, float knie, float weiss) {
  return vec3(schulter1(c.r, knie, weiss),
              schulter1(c.g, knie, weiss),
              schulter1(c.b, knie, weiss));
}

/* Sättigungsboden in den Lichtern.
 *
 * Die Sättigung des Ergebnisses wird auf "boden" angehoben, aber niemals über
 * die des Eingangs hinaus: "min(sEin, boden)". Damit bleibt ein grauer Fels
 * grau und nur das, was die Kurve entfärbt hat, kommt zurück.
 *
 * Die Anhebung hält zunächst das Kanalmaximum fest und skaliert nur den
 * Abstand der beiden anderen Kanäle dazu. Damit bleibt der Farbton in der
 * HSV-Definition EXAKT erhalten — (mitte-min)/(max-min) ist gegen eine
 * gemeinsame Skalierung invariant.
 *
 * DANACH wird die Helligkeit zurückgeholt. Das ist der Schritt, ohne den der
 * Boden Unsinn macht: Sättigung bei festem Maximum anzuheben heißt, die beiden
 * kleineren Kanäle nach unten zu drücken, und das nimmt dem Pixel Helligkeit.
 * Gemessen am Himmel von g-bodenlicht ohne diese Rückholung: (182,212,243)
 * wurde zu (168,203,225), also 11 Stufen dunkler — die Sättigung stimmte, das
 * Bild war falsch. Mit der Rückholung: (183,213,244), Helligkeit unverändert,
 * Sättigung wie gewünscht. Ein Farbgriff darf die Tonwerte nicht verschieben,
 * die die Kurve gerade gesetzt hat. */
vec3 satBoden(vec3 ein, vec3 aus, float boden, float von, float bis) {
  float mxE = max(max(ein.r, ein.g), ein.b);
  float mnE = min(min(ein.r, ein.g), ein.b);
  float sEin = mxE > 1e-5 ? (mxE - mnE) / mxE : 0.0;

  float mxA = max(max(aus.r, aus.g), aus.b);
  float mnA = min(min(aus.r, aus.g), aus.b);
  float sAus = mxA > 1e-5 ? (mxA - mnA) / mxA : 0.0;

  float sZiel = max(sAus, min(sEin, boden));
  float spanne = max(mxA - mnA, 1e-5);
  vec3 gehoben = vec3(mxA) - (vec3(mxA) - aus) * (mxA * sZiel / spanne);

  /* Helligkeit zurück auf den Wert vor der Anhebung. */
  float hAlt = griffHelligkeit(aus);
  float hNeu = griffHelligkeit(gehoben);
  gehoben *= (hNeu > 1e-5) ? (hAlt / hNeu) : 1.0;

  float w = smoothstep(von, bis, hAlt);
  return mix(aus, gehoben, w);
}

/* Geordnete Störung nach Jimenez (Interleaved Gradient Noise). Reine Funktion
 * der Bildkoordinate: dieselbe Aufnahme ergibt dieselben Pixel. */
float griffStoerung(vec2 p, vec2 richtung) {
  return fract(52.9829189 * fract(dot(p, richtung)));
}

/* Dither mit Dreiecksverteilung über ±staerke Stufen. Die Differenz zweier
 * unabhängiger gleichverteilter Störungen ist dreiecksverteilt; erst damit ist
 * der Quantisierungsfehler vollständig vom Signal entkoppelt. */
vec3 dithernTpdf(vec3 c, vec2 fragCoord, float staerke) {
  float a = griffStoerung(fragCoord, vec2(0.06711056, 0.00583715));
  float b = griffStoerung(fragCoord + vec2(41.0, 23.0), vec2(0.00583715, 0.06711056));
  return c + vec3((a - b) * staerke / 255.0);
}
#endif
`;

  const FS_GRIFF = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSzene;
uniform sampler2D uBloom;
uniform vec2  uGroesse;
uniform float uBelichtung;
uniform float uKnie;
uniform float uWeiss;
uniform float uSchwarzhub;
uniform float uSatBoden;
uniform float uSatVon;
uniform float uSatBis;
uniform float uDither;
uniform float uBloomMischung;   /* 0 = kein Bloom, dann wird uBloom nie gelesen */

${GRIFF}

void main() {
  vec3 c = texture(uSzene, vUv).rgb;

  /* Bloom vor der Kurve. Er ist Licht, das im Objektiv des Auges streut, und
   * gehört damit auf die Szenenseite — hinter die Kurve gelegt hellt er
   * ausgerechnet die Lichter auf, die die Schulter gerade zusammengezogen hat,
   * und die Schulterlage wäre wieder unbestimmt. */
  if (uBloomMischung > 0.0) {
    c += texture(uBloom, vUv).rgb * uBloomMischung;
  }

  c = max(c, vec3(0.0)) * uBelichtung;

  /* 1. Tonwertkurve, kanalweise, weiches Knie, feste Schulterlage. */
  vec3 g = schulter(c, uKnie, uWeiss);

  /* 2. Schwarzhub. Affin, also ein HARTER Boden ohne Zehe. */
  g = vec3(uSchwarzhub) + g * (1.0 - uSchwarzhub);

  /* 3. Sättigungsboden — nach dem Hub, nicht davor. Der Hub addiert auf alle
   *    drei Kanäle denselben Betrag und senkt damit selbst schon (max-min)/max
   *    um rund ein Zehntel. Vor dem Hub angewandt würde der Boden also genau
   *    das wieder verlieren, was er gerade gesetzt hat — und gemessen wird am
   *    fertigen Bild. Bezugsgröße bleibt der EINGANG c, nicht der halbfertige
   *    Zwischenwert. */
  g = satBoden(c, g, uSatBoden, uSatVon, uSatBis);

  /* 4. Dither. Immer zuletzt: er soll den Quantisierungsschritt der Ausgabe
   *    aufbrechen, nicht einen Zwischenwert. */
  if (uDither > 0.0) g = dithernTpdf(g, gl_FragCoord.xy, uDither);

  fragColor = vec4(clamp(g, 0.0, 1.0), 1.0);
}`;

  /* Schwellwert mit weichem Knie plus Karis-Gewichtung, in einem Durchgang mit
   * der ersten Halbierung. Die Karis-Gewichtung "1/(1+L)" ist gegen das
   * Flimmern einzelner sehr heller Pixel — ohne sie zieht ein einzelner
   * Glanzpunkt bei jeder Kamerabewegung eine blinkende Fahne. */
  const FS_HELL = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uQuelle;
uniform vec2  uTexel;
uniform float uSchwelle;
uniform float uKnieB;

vec3 probe(vec2 o) { return max(texture(uQuelle, vUv + o * uTexel).rgb, vec3(0.0)); }

void main() {
  /* 4 Proben im Karo, jede mit 1/(1+L) gewichtet und danach normiert. */
  vec3 s[4];
  s[0] = probe(vec2(-1.0, -1.0));
  s[1] = probe(vec2( 1.0, -1.0));
  s[2] = probe(vec2(-1.0,  1.0));
  s[3] = probe(vec2( 1.0,  1.0));

  vec3 summe = vec3(0.0);
  float gew = 0.0;
  for (int i = 0; i < 4; i++) {
    float w = 1.0 / (1.0 + dot(s[i], vec3(0.2126, 0.7152, 0.0722)));
    summe += s[i] * w;
    gew += w;
  }
  vec3 c = summe / max(gew, 1e-5);

  /* Weiches Knie: unterhalb der Schwelle steigt der Anteil quadratisch an,
   * oberhalb linear. Eine harte Schwelle liefert an bewegten Kanten ein
   * Aufblitzen, sobald ein Pixel die Grenze überschreitet. */
  float hell = max(c.r, max(c.g, c.b));
  float weich = clamp(hell - uSchwelle + uKnieB, 0.0, 2.0 * uKnieB);
  weich = weich * weich / (4.0 * uKnieB + 1e-4);
  float anteil = max(weich, hell - uSchwelle) / max(hell, 1e-5);

  fragColor = vec4(c * anteil, 1.0);
}`;

  /* Halbierung, 13 Proben (Jimenez/CoD). Ein reiner Boxfilter erzeugt sichtbare
   * Kastenkanten — deshalb auch KEIN generateMipmap für die Pyramide. */
  const FS_AB = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uQuelle;
uniform vec2 uTexel;

vec3 p(vec2 o) { return texture(uQuelle, vUv + o * uTexel).rgb; }

void main() {
  vec3 a = p(vec2(-2.0,  2.0)); vec3 b = p(vec2( 0.0,  2.0)); vec3 c = p(vec2( 2.0,  2.0));
  vec3 d = p(vec2(-2.0,  0.0)); vec3 e = p(vec2( 0.0,  0.0)); vec3 f = p(vec2( 2.0,  0.0));
  vec3 g = p(vec2(-2.0, -2.0)); vec3 h = p(vec2( 0.0, -2.0)); vec3 i = p(vec2( 2.0, -2.0));
  vec3 j = p(vec2(-1.0,  1.0)); vec3 k = p(vec2( 1.0,  1.0));
  vec3 l = p(vec2(-1.0, -1.0)); vec3 m = p(vec2( 1.0, -1.0));

  vec3 r = e * 0.125;
  r += (a + c + g + i) * 0.03125;
  r += (b + d + f + h) * 0.0625;
  r += (j + k + l + m) * 0.125;
  fragColor = vec4(r, 1.0);
}`;

  /* Aufwärts, 9-Punkt-Zelt mit Radius uStreuung, additiv über die nächstgrößere
   * Stufe gemischt. */
  const FS_AUF = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uQuelle;
uniform vec2 uTexel;
uniform float uStreuung;

vec3 p(vec2 o) { return texture(uQuelle, vUv + o * uTexel * uStreuung).rgb; }

void main() {
  vec3 r = p(vec2( 0.0,  0.0)) * 4.0;
  r += (p(vec2(-1.0, 0.0)) + p(vec2(1.0, 0.0)) + p(vec2(0.0, -1.0)) + p(vec2(0.0, 1.0))) * 2.0;
  r += p(vec2(-1.0, -1.0)) + p(vec2(1.0, -1.0)) + p(vec2(-1.0, 1.0)) + p(vec2(1.0, 1.0));
  fragColor = vec4(r / 16.0, 1.0);
}`;

  /* ==========================================================================
   * 2. Zustand
   * ======================================================================== */

  let progGriff = null, progHell = null, progAb = null, progAuf = null;
  let kopie = null;              // Szenenkopie (Standardpuffer -> Textur)
  let breite = 0, hoehe = 0;
  let stufen = [];               // Bloompyramide, [0] ist halbe Auflösung
  let hdrZiel = null;            // Mehrfachabtast-FBO, in das die Szene läuft
  let hdrLoesen = null;          // aufgelöste Einzelabtast-Textur davon
  let hdrAn = false;             // ist der HDR-Betrieb in diesem Bild aktiv?
  let hdrGewollt = false;        // was beim letzten Anlegen gewuenscht war
  let geklagt = Object.create(null);

  const klagen = (schluessel, text) => {
    if (geklagt[schluessel]) return;
    geklagt[schluessel] = 1;
    console.warn('GRAFIK post: ' + text);
  };

  function freigeben(gl) {
    if (kopie) { kopie.loeschen(); kopie = null; }
    for (const s of stufen) s.loeschen();
    stufen = [];
    if (hdrLoesen) { hdrLoesen.loeschen(); hdrLoesen = null; }
    if (hdrZiel) {
      gl.deleteFramebuffer(hdrZiel.fbo);
      gl.deleteRenderbuffer(hdrZiel.farbe);
      gl.deleteRenderbuffer(hdrZiel.tiefe);
      hdrZiel = null;
    }
    breite = 0; hoehe = 0; hdrGewollt = false;
  }

  /* Alle Ziele für eine Bildgröße anlegen. Wird bei jeder Größenänderung
   * wiederholt — 1600x900 ist zwar fest verdrahtet, aber der Prototyp läuft
   * auch im Fenster. */
  function groesseSetzen(gl, R, w, h, willHdr) {
    if (w === breite && h === hoehe && hdrGewollt === !!willHdr) return;
    freigeben(gl);
    breite = w; hoehe = h; hdrGewollt = !!willHdr;

    const hdrTauglich = willHdr && R.faehigkeiten
                     && R.faehigkeiten.colorBufferFloat && R.faehigkeiten.zielRgba16f;
    if (willHdr && !hdrTauglich) {
      klagen('hdr', 'HDR-Ziel angefordert, aber RGBA16F ist hier kein vollständiges '
                  + 'Renderziel. Bleibe beim Standardpuffer, Bloom entfällt.');
    }

    if (!hdrTauglich) {
      /* Die Szenenkopie wird mit `copyTexImage2D` und dem UNBENANNTEN Format
       * `RGB` angelegt, nicht mit `texImage2D(..., RGBA8, ...)`.
       *
       * Der Grund ist eine Falle, in die man genau einmal tritt: der
       * Standardpuffer wird in renderer2.js mit `{alpha:false}` geholt und hat
       * damit gar keinen Alphakanal. Ein Kopierziel mit Alpha aus einer Quelle
       * ohne Alpha ist nach GLES 3.0 §3.8.5 eine ungültige Operation — WebGL
       * meldet sie auf der Konsole, und tools/capture.mjs zählt jede solche
       * Meldung als „Seitenfehler". Mit dem unbenannten Format übernimmt die
       * Textur die Komponenten des Lesepuffers und die Kopie passt immer.
       *
       * Das Bild steht zu diesem Zeitpunkt noch nicht im Puffer; hier wird nur
       * die Größe belegt, gefüllt wird in zeichnen(). */
      const tex = gl.createTexture();
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, w, h, 0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      kopie = { tex, breite: w, hoehe: h, loeschen() { gl.deleteTexture(tex); } };
      return;
    }

    /* Im HDR-Betrieb wird nicht kopiert, sondern aufgelöst — `kopie` bleibt
     * trotzdem belegt, damit zeichnen() einen einheitlichen Bereitschaftstest
     * hat. */
    kopie = GRAFIK.textur(gl, {
      breite: 1, hoehe: 1, format: 'rgba8', filter: 'linear',
    });

    /* Mehrfachabtastung: `{antialias:true}` deckt nur den Standardpuffer ab.
     * Wer die Szene umleitet und das hier vergisst, verliert die vorhandene
     * Kantenglättung, ohne dass eine Meldung kommt. */
    const proben = Math.min(4, (R.faehigkeiten && R.faehigkeiten.maxSamples) || 0);
    const fbo = gl.createFramebuffer();
    const farbe = gl.createRenderbuffer();
    const tiefe = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, farbe);
    if (proben > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, proben, gl.RGBA16F, w, h);
    else gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA16F, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, tiefe);
    if (proben > 1) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, proben, gl.DEPTH_COMPONENT24, w, h);
    else gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, farbe);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, tiefe);
    const stand = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (stand !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fbo); gl.deleteRenderbuffer(farbe); gl.deleteRenderbuffer(tiefe);
      klagen('hdrfbo', 'HDR-Renderziel unvollständig (0x' + stand.toString(16)
                     + '). Bleibe beim Standardpuffer.');
      return;
    }
    hdrZiel = { fbo, farbe, tiefe, proben, breite: w, hoehe: h, hdr: true };
    hdrLoesen = GRAFIK.textur(gl, {
      breite: w, hoehe: h, format: 'rgba16f', filter: 'linear', ziel: true,
    });
  }

  function pyramideBauen(gl, anzahl) {
    for (const s of stufen) s.loeschen();
    stufen = [];
    let w = breite, h = hoehe;
    for (let i = 0; i < anzahl; i++) {
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
      stufen.push(GRAFIK.textur(gl, {
        breite: w, hoehe: h, format: 'rgba16f', filter: 'linear', ziel: true,
      }));
      if (w === 1 && h === 1) break;
    }
  }

  /* ==========================================================================
   * 3. Das Modul
   * ======================================================================== */

  const MOD = GRAFIK.modul({
    name: 'post',
    ordnung: 95,

    /* `post` ersetzt keinen Grundzug — es liegt über allen. Ausdrücklich
     * gesetzt, damit die Namensregel aus renderer2.js §5 nie zufällig greift,
     * falls dort einmal ein Grundzug „post" dazukommt. */
    ersetzt: false,

    regler: [
      /* Belichtung. 1,0 = neutral. Der Eingang der Kurve ist der Ausgaberaum;
       * eine weiße Diffusfläche in voller Sonne soll bei 1,0 ankommen. Im
       * HDR-Betrieb liegt dieselbe Fläche nach PHASE-GRAFIK-PLAN §G3 bei 2,1 —
       * dort ist 1/2,1 = 0,476 der neutrale Wert, und `hdr` setzt ihn selbst,
       * solange hier 1,0 steht. Dieses Modul hellt die Szene NICHT eigenmächtig
       * auf: dass der Median heute bei 85 statt bei 130…170 liegt, ist eine
       * Albedofrage (G3/G6) und keine Kurvenfrage. Eine Verstärkung hier würde
       * genau in dem Moment ausbrennen, in dem boden.js seine Arbeit tut. */
      { key: 'belichtung', min: 0.2, max: 4.0, step: 0.01, wert: 1.0 },

      /* Schulterlage. knie: ab wo die Kurve zusammenzieht. weiss: Asymptote.
       * 0,72/0,96 — hergeleitet im Kopf dieser Datei unter DIE KURVE:
       *   schulter(0,72) = 0,72  -> nach Hub L = 184   Beginn der Schulter
       *   schulter(1,00) = 0,885 -> nach Hub L = 228   „weiss in voller Sonne"
       *   schulter(inf)  = 0,96  -> nach Hub L = 246   Deckel
       * L 228 liegt im gemessenen Genshin-Dichtestau 216…232, und der Deckel
       * 246 entspricht Genshins hellstem gemessenen Kern (254,253,219), L 249.
       * Ein früheres Knie (0,55) zieht die Lichter der heutigen Szene von
       * L 208 auf L 194 herunter — gemessen, und in die falsche Richtung. */
      { key: 'knie', min: 0.2, max: 0.95, step: 0.01, wert: 0.72 },
      { key: 'weiss', min: 0.6, max: 1.0, step: 0.01, wert: 0.96 },

      /* Schwarzhub, harter Boden. 0,08 -> 20,4 von 255. Genshin: p0,1 in
       * 17…26, Anteil unter L=8 exakt 0,000 % in sieben von sieben Bildern. */
      { key: 'schwarzhub', min: 0.0, max: 0.2, step: 0.005, wert: 0.08 },

      /* Sättigungsboden in den Lichtern. Genshin 22…38 %, Mitte 30 %.
       * satVon/satBis sind die Helligkeit (sRGB), über der er einsetzt bzw.
       * voll wirkt: 0,60 = L 153, 0,78 = L 199. Die Messung zählt „Lichter"
       * ab L 170, also 0,667 — der Übergang liegt darum um diesen Wert. */
      { key: 'satBoden', min: 0.0, max: 0.6, step: 0.01, wert: 0.30 },
      { key: 'satVon', min: 0.0, max: 1.0, step: 0.01, wert: 0.60 },
      { key: 'satBis', min: 0.0, max: 1.0, step: 0.01, wert: 0.78 },

      /* Dither, Dreiecksverteilung über ±dither Stufen. 0 schaltet ihn ab —
       * nur zum Vorführen, wie stark ein Verlauf ohne ihn bandet. */
      { key: 'dither', min: 0.0, max: 2.0, step: 0.05, wert: 1.0 },

      /* HDR-Ziel. 0 = aus (Vorgabe): die Szene läuft in den Standardpuffer und
       * post kopiert sie sich. 1 = an: die Szene läuft nach RGBA16F mit
       * 4x Mehrfachabtastung, und erst dann gibt es Bloom. Solange kein Modul
       * Werte über 1,0 schreibt, bringt das nichts außer Bandbreite.
       *
       * Gemessen an g-bodenlicht im Aufnahme-Rasterisierer (SwiftShader,
       * 1600x900, gepaarte Messung im selben Browserlauf):
       *   ohne post                     371 ms je Bild
       *   post ohne Zwischenziel        420 ms   ->  +49 ms
       *   post mit HDR-Ziel, kein Bloom 777 ms   -> +352 ms
       *   post mit HDR-Ziel und Bloom   884 ms   -> +428 ms
       * Der Umweg über RGBA16F mit 4x Mehrfachabtastung kostet also das
       * SIEBENFACHE des Griffs selbst — und er kostet es an der Szene, nicht
       * an der Nachbearbeitung, weil jedes Dreieck in einen vierfach
       * abgetasteten Halbgleitkommapuffer läuft. Das ist die Zahl hinter der
       * Vorgabe 0. */
      { key: 'hdr', min: 0, max: 1, step: 1, wert: 0 },

      /* Bloom. Nur mit hdr=1 wirksam. schwelle/knieB in Szenenwerten,
       * stufen = Verkleinerungen (zwei, siehe Kopf: gemessene Reichweite
       * 0,13…0,37 % der Bildbreite), streuung = Zeltradius in Texeln,
       * mischung = Rückmischanteil. */
      { key: 'bloomSchwelle', min: 0.0, max: 4.0, step: 0.05, wert: 1.0 },
      { key: 'bloomKnie', min: 0.01, max: 1.0, step: 0.01, wert: 0.5 },
      { key: 'bloomStufen', min: 1, max: 6, step: 1, wert: 2 },
      { key: 'bloomStreuung', min: 0.2, max: 2.0, step: 0.05, wert: 0.65 },
      { key: 'bloomMischung', min: 0.0, max: 0.6, step: 0.01, wert: 0.10 },
    ],

    aufbau(gl, R) {
      progGriff = GRAFIK.programm(gl, GRAFIK.vollbildVs, FS_GRIFF, 'post: griff');
      progHell = GRAFIK.programm(gl, GRAFIK.vollbildVs, FS_HELL, 'post: bloom hell');
      progAb = GRAFIK.programm(gl, GRAFIK.vollbildVs, FS_AB, 'post: bloom ab');
      progAuf = GRAFIK.programm(gl, GRAFIK.vollbildVs, FS_AUF, 'post: bloom auf');

      /* Der Griff als Baustein, damit ihn ein späteres Modul wortgleich
       * mitbenutzen kann statt eine zweite Kurve danebenzustellen. */
      GRAFIK.bausteinSetzen('griff', GRIFF);
    },

    /* Nur wenn das HDR-Ziel gewollt UND vorhanden ist, wird ctx.ziel umgebogen.
     * Das passiert vor dem Leeren des Bildes (renderer2.js §8), die Szene läuft
     * dann komplett dort hinein. */
    vorbereiten(gl, R, ctx) {
      const w = ctx.breite | 0, h = ctx.hoehe | 0;
      if (w < 1 || h < 1) return;
      const willHdr = (MOD.wert.hdr | 0) === 1;
      groesseSetzen(gl, R, w, h, willHdr);
      hdrAn = !!(willHdr && hdrZiel);
      if (hdrAn) ctx.ziel = { fbo: hdrZiel.fbo, breite: w, hoehe: h, hdr: true };
    },

    zeichnen(gl, R, ctx) {
      if (!progGriff || !kopie) return;
      const w = ctx.breite | 0, h = ctx.hoehe | 0;
      if (w !== breite || h !== hoehe) return;   // Größe wechselte mitten im Bild

      const wert = (k, vorgabe) => {
        const v = MOD.wert[k];
        return (typeof v === 'number' && isFinite(v)) ? v : vorgabe;
      };

      /* --- Die Szene in eine Textur holen ------------------------------- */
      let quelle = kopie.tex;
      if (hdrAn) {
        /* Mehrfachabtastung auflösen. `copyTexSubImage2D` ginge hier NICHT —
         * aus einem Mehrfachabtastpuffer zu kopieren ist eine ungültige
         * Operation, dafür gibt es blitFramebuffer. */
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, hdrZiel.fbo);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, hdrLoesen.fbo);
        gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        quelle = hdrLoesen.tex;
      } else {
        /* Vom aktuellen Leseziel (in aller Regel der Standardpuffer) in die
         * Kopie. Das löst eine vorhandene Mehrfachabtastung mit auf — genau
         * deshalb bleibt die Kantenglättung des Standardpuffers erhalten. */
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, (ctx.ziel && ctx.ziel.fbo) || null);
        gl.bindTexture(gl.TEXTURE_2D, kopie.tex);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, w, h);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      }

      /* --- Zustand für Bildschirmdurchgänge ----------------------------- */
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);

      /* --- Bloom, nur mit HDR-Ziel -------------------------------------- */
      let bloomAn = 0;
      const mischung = wert('bloomMischung', 0.10);
      if (hdrAn && mischung > 0.0) {
        const anzahl = Math.max(1, Math.min(6, wert('bloomStufen', 2) | 0));
        if (stufen.length !== anzahl) pyramideBauen(gl, anzahl);

        const voll = R.vollbild || GRAFIK.vollbild(gl);

        /* Schwellwert und erste Halbierung in einem Zug. */
        gl.useProgram(progHell);
        gl.bindFramebuffer(gl.FRAMEBUFFER, stufen[0].fbo);
        gl.viewport(0, 0, stufen[0].breite, stufen[0].hoehe);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, quelle);
        gl.uniform1i(progHell.u.uQuelle, 0);
        gl.uniform2f(progHell.u.uTexel, 1 / w, 1 / h);
        gl.uniform1f(progHell.u.uSchwelle, wert('bloomSchwelle', 1.0));
        gl.uniform1f(progHell.u.uKnieB, Math.max(0.01, wert('bloomKnie', 0.5)));
        voll.zeichnen(gl);

        /* Weiter hinunter. */
        gl.useProgram(progAb);
        for (let i = 1; i < stufen.length; i++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, stufen[i].fbo);
          gl.viewport(0, 0, stufen[i].breite, stufen[i].hoehe);
          gl.bindTexture(gl.TEXTURE_2D, stufen[i - 1].tex);
          gl.uniform1i(progAb.u.uQuelle, 0);
          gl.uniform2f(progAb.u.uTexel, 1 / stufen[i - 1].breite, 1 / stufen[i - 1].hoehe);
          voll.zeichnen(gl);
        }

        /* Und additiv wieder hinauf. */
        gl.useProgram(progAuf);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        for (let i = stufen.length - 1; i > 0; i--) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, stufen[i - 1].fbo);
          gl.viewport(0, 0, stufen[i - 1].breite, stufen[i - 1].hoehe);
          gl.bindTexture(gl.TEXTURE_2D, stufen[i].tex);
          gl.uniform1i(progAuf.u.uQuelle, 0);
          gl.uniform2f(progAuf.u.uTexel, 1 / stufen[i].breite, 1 / stufen[i].hoehe);
          gl.uniform1f(progAuf.u.uStreuung, wert('bloomStreuung', 0.65));
          voll.zeichnen(gl);
        }
        gl.disable(gl.BLEND);
        bloomAn = 1;
      }

      /* --- Der Griff, auf den Bildschirm -------------------------------- */
      const ziel = R.bildschirm || { fbo: null, breite: w, hoehe: h };
      gl.bindFramebuffer(gl.FRAMEBUFFER, ziel.fbo || null);
      gl.viewport(0, 0, ziel.breite || w, ziel.hoehe || h);

      gl.useProgram(progGriff);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, quelle);
      gl.uniform1i(progGriff.u.uSzene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomAn ? stufen[0].tex : quelle);
      gl.uniform1i(progGriff.u.uBloom, 1);
      gl.activeTexture(gl.TEXTURE0);

      /* Im HDR-Betrieb liegt „weiß in voller Sonne" bei 2,1 statt bei 1,0
       * (PHASE-GRAFIK-PLAN §G3). Die Kurve bleibt dieselbe Funktion; nur der
       * Eingang wird auf ihren Definitionsbereich normiert. */
      const belichtung = wert('belichtung', 1.0) * (hdrAn ? (1.0 / 2.1) : 1.0);

      gl.uniform2f(progGriff.u.uGroesse, w, h);
      gl.uniform1f(progGriff.u.uBelichtung, belichtung);
      gl.uniform1f(progGriff.u.uKnie, wert('knie', 0.55));
      gl.uniform1f(progGriff.u.uWeiss, Math.max(wert('weiss', 0.92), wert('knie', 0.55) + 0.01));
      gl.uniform1f(progGriff.u.uSchwarzhub, wert('schwarzhub', 0.08));
      gl.uniform1f(progGriff.u.uSatBoden, wert('satBoden', 0.30));
      gl.uniform1f(progGriff.u.uSatVon, wert('satVon', 0.60));
      gl.uniform1f(progGriff.u.uSatBis, Math.max(wert('satBis', 0.78), wert('satVon', 0.60) + 0.01));
      gl.uniform1f(progGriff.u.uDither, wert('dither', 1.0));
      gl.uniform1f(progGriff.u.uBloomMischung, bloomAn ? mischung : 0.0);

      (R.vollbild || GRAFIK.vollbild(gl)).zeichnen(gl);

      /* Aufräumen: der nächste Grundzug erwartet den undurchsichtigen
       * Grundzustand, und `ctx.ziel` muss wieder der Bildschirm sein — sonst
       * bindet renderScene2 gleich danach das HDR-Ziel zurück und das fertige
       * Bild bliebe unsichtbar. */
      gl.bindTexture(gl.TEXTURE_2D, null);
      ctx.ziel = ziel;
      if (R.grundzustand) R.grundzustand();
      else { gl.enable(gl.DEPTH_TEST); gl.depthMask(true); }
    },
  });

})();
