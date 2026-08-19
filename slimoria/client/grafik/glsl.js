'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — gemeinsame Shader-Textbausteine.
 *
 * Diese Datei laedt als ERSTE des zweiten Renderpfads (siehe grafik/laden.js).
 * Sie legt deshalb das globale Register `GRAFIK` an, in das sich alle Module
 * eintragen. `grafik/renderer2.js` haengt spaeter die WebGL-Helfer
 * (programm, mesh, vollbild, textur) an dasselbe Objekt.
 *
 * WARUM ES DIE BAUSTEINE GIBT
 * Zehn Module schreiben Shader. Schreibt jedes seine eigene sRGB-Umrechnung,
 * seinen eigenen Fresnel und sein eigenes Rauschen, dann laufen die Formeln
 * auseinander und am Horizont reisst eine Naht auf (PHASE-GRAFIK-PLAN §1.1:
 * `uNebel` und `uDunst` muessen dieselbe Rechnung sein). Ein Baustein ist ein
 * Stueck GLSL-Text, das mehrere Module WORTGLEICH benutzen.
 *
 * BENUTZUNG
 *   const fs = `#version 300 es
 *   precision highp float;
 *   ${GRAFIK.baustein('srgb')}
 *   ${GRAFIK.baustein('fresnel')}
 *   ...`;
 * Mehrere auf einmal:  GRAFIK.baustein('srgb', 'fresnel')  bzw.
 *                      GRAFIK.baustein(['srgb', 'fresnel'])
 * Eigenen hinterlegen: GRAFIK.bausteinSetzen('rampe', '...GLSL...')
 *
 * Jeder Baustein traegt einen Einschlusswaechter (`#ifndef`), doppeltes
 * Einfuegen ist also harmlos. `#version` und `precision` gehoeren NICHT in den
 * Baustein — sie muessen die ersten Zeilen der Datei bleiben.
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein Baustein zieht eine Zufallszahl und keiner liest eine Uhr. Das Rauschen
 * ist eine reine Funktion seiner Argumente: derselbe Ort ergibt in jeder
 * Aufnahme denselben Wert. Zeit kommt ausschliesslich als Uniform aus
 * `ctx.time` herein — ein Wind, der pro Bild anders weht, macht jede Aufnahme
 * unvergleichbar.
 * ------------------------------------------------------------------------- */

(function () {

  /* --------------------------------------------------------------------------
   * Register. Identisch in renderer2.js, damit keine der beiden Dateien von der
   * Ladereihenfolge der anderen abhaengt.
   * ------------------------------------------------------------------------ */
  const GRAFIK = window.GRAFIK || (window.GRAFIK = (function () {
    const R = {
      _module: [],
      _bausteine: Object.create(null),
      _klagen: Object.create(null),

      /* Ein Modul meldet sich an. Siehe GRAFIK-MODULE.md §3. */
      modul(m) {
        if (!m || typeof m !== 'object') throw new Error('GRAFIK.modul: kein Objekt');
        if (!m.name) throw new Error('GRAFIK.modul: Modul ohne name');
        const alt = R._module.findIndex(x => x.name === m.name);
        if (alt >= 0) {
          console.warn('GRAFIK: Modul "' + m.name + '" war schon angemeldet — ersetzt.');
          R._module.splice(alt, 1);
        }
        if (m.ordnung === undefined || m.ordnung === null) m.ordnung = 50;
        m.aufgebaut = false;
        m.aus = false;                 // wird gesetzt, wenn der Aufbau wirft
        m.wert = Object.create(null);  // Reglerwerte, von renderer2.js gefuellt
        R._module.push(m);
        return m;
      },

      /* Alle angemeldeten Module in Zeichenreihenfolge. */
      module() {
        return R._module.slice().sort((a, b) => (a.ordnung || 0) - (b.ordnung || 0));
      },

      /* Baustein holen. Ein Name, mehrere Namen oder ein Feld von Namen —
       * mehrere werden aneinandergehaengt.
       *
       * NUR holen. Zum Hinterlegen gibt es bausteinSetzen(). Die beiden
       * duerfen nicht dieselbe Funktion sein: `baustein('rauschen','srgb')`
       * ist ein voellig normaler Aufruf, und eine Funktion, die bei zwei
       * String-Argumenten heimlich SETZT, wuerde damit den Baustein
       * 'rauschen' durch das Wort "srgb" ersetzen. Genau das ist beim ersten
       * Selbsttest passiert. */
      baustein(name) {
        if (Array.isArray(name)) return name.map(n => R.baustein(n)).join('\n');
        if (arguments.length > 1) {
          return Array.prototype.slice.call(arguments).map(n => R.baustein(n)).join('\n');
        }
        const s = R._bausteine[name];
        if (s === undefined) {
          if (!R._klagen['b:' + name]) {
            R._klagen['b:' + name] = 1;
            console.error('GRAFIK.baustein: unbekannter Baustein "' + name + '". '
              + 'Vorhanden: ' + Object.keys(R._bausteine).join(', '));
          }
          return '\n/* fehlender Baustein: ' + name + ' */\n';
        }
        return s;
      },

      /* Baustein hinterlegen. So kann z.B. grafik/rampe.js seine
       * Rampenfunktion fuer gel.js und boden.js ablegen, statt sie dreimal zu
       * schreiben. Der Text sollte einen #ifndef-Waechter tragen. */
      bausteinSetzen(name, text) {
        if (typeof name !== 'string' || typeof text !== 'string') {
          throw new Error('GRAFIK.bausteinSetzen(name, text): beides Zeichenketten');
        }
        R._bausteine[name] = text;
        return text;
      },

      /* Namen aller vorhandenen Bausteine — fuer Fehlersuche in der Konsole. */
      bausteine() { return Object.keys(R._bausteine).sort(); },
    };
    return R;
  })());

  /* Kurzform beim Eintragen. */
  const B = (name, text) => GRAFIK.bausteinSetzen(name, text);

  /* ==========================================================================
   * 1. RAUSCHEN — ohne Zufallszahlen
   *
   * Zwei Anforderungen zugleich: es darf sich nicht wiederholen (sonst sieht
   * man das Muster) und es MUSS bei gleichem Ort denselben Wert liefern (sonst
   * ist keine Aufnahme mit einer anderen vergleichbar).
   *
   * Deshalb kein `sin`-Hash: dessen Ergebnis haengt an der Genauigkeit der
   * Sinusimplementierung und weicht zwischen SwiftShader und einer echten GPU
   * ab. Verwendet wird stattdessen die ganzzahlfreie Streufunktion nach
   * Hoskins — nur Multiplikation und `fract`, auf jeder Hardware gleich.
   * ======================================================================== */
  B('rauschen', `
#ifndef GRAFIK_RAUSCHEN
#define GRAFIK_RAUSCHEN

/* Streuwerte 0..1. Rein deterministisch, keine Uhr, kein Zufall. */
float streu11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float streu21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float streu31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
vec3 streu33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}

/* Wertrauschen: stetig, glatte Ableitung an den Zellgrenzen (Hermite). */
float rauschen2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(streu21(i + vec2(0.0, 0.0)), streu21(i + vec2(1.0, 0.0)), u.x),
             mix(streu21(i + vec2(0.0, 1.0)), streu21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float rauschen3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(streu31(i + vec3(0,0,0)), streu31(i + vec3(1,0,0)), u.x);
  float b = mix(streu31(i + vec3(0,1,0)), streu31(i + vec3(1,1,0)), u.x);
  float c = mix(streu31(i + vec3(0,0,1)), streu31(i + vec3(1,0,1)), u.x);
  float d = mix(streu31(i + vec3(0,1,1)), streu31(i + vec3(1,1,1)), u.x);
  return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
}

/* Aufsummiertes Rauschen. lagen ist eine Konstante — GLSL ES 3.00 braucht
 * konstante Schleifengrenzen. Vier Lagen reichen fuer Boden und Fels. */
float fbm2(vec2 p, int lagen) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= lagen) break;
    s += a * rauschen2(p);
    p *= 2.03;                 // leicht irrational, sonst richten sich die Lagen aus
    a *= 0.5;
  }
  return s;
}
float fbm3(vec3 p, int lagen) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= lagen) break;
    s += a * rauschen3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return s;
}

/* Zellrauschen (Worley), Abstand zum naechsten Streupunkt. Fuer Platten,
 * Schuppen, Blasen im Gel. */
float zellen2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(streu21(i + g), streu21(i + g + 17.3));
      d = min(d, length(g + o - f));
    }
  }
  return d;
}
#endif
`);

  /* ==========================================================================
   * 2. sRGB — hin und zurueck
   *
   * Der bestehende Pfad rechnet vollstaendig in sRGB (PHASE-GRAFIK-PLAN §0:
   * "Gammabehandlung: keine"), und ALLE gemessenen Referenzzahlen sind
   * sRGB-Ausgabewerte. Wer zwischendurch linear rechnet — Lichtsummen, Bloom,
   * Nebel ueber grosse Strecken — muss hin und zurueck, und zwar mit derselben
   * Formel wie alle anderen.
   *
   * Die exakte stueckweise Definition, nicht die 2.2er Naeherung: der
   * Unterschied liegt genau im dunklen Bereich, in dem der Schwarzhub aus
   * Schritt G9 arbeitet.
   * ======================================================================== */
  B('srgb', `
#ifndef GRAFIK_SRGB
#define GRAFIK_SRGB

/* sRGB (Ausgaberaum, 0..1) -> Linearlicht */
float ausSrgb1(float c) {
  return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}
vec3 ausSrgb(vec3 c) {
  return vec3(ausSrgb1(c.r), ausSrgb1(c.g), ausSrgb1(c.b));
}

/* Linearlicht -> sRGB */
float nachSrgb1(float c) {
  c = max(c, 0.0);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}
vec3 nachSrgb(vec3 c) {
  return vec3(nachSrgb1(c.r), nachSrgb1(c.g), nachSrgb1(c.b));
}

/* Leuchtdichte. Rec.709-Gewichte auf LINEAREN Werten — auf sRGB-Werten
 * angewandt ist das keine Leuchtdichte, sondern eine Schaetzung; dafuer gibt
 * es die zweite Funktion, weil das Messwerkzeug genau so misst. */
float leuchtdichte(vec3 linear) { return dot(linear, vec3(0.2126, 0.7152, 0.0722)); }
float helligkeitSrgb(vec3 srgb)  { return dot(srgb,   vec3(0.299, 0.587, 0.114)); }

/* Saettigung um den eigenen Grauwert herum ziehen. f>1 saettigt. */
vec3 saettigen(vec3 c, float f) {
  return mix(vec3(helligkeitSrgb(c)), c, f);
}
#endif
`);

  /* ==========================================================================
   * 3. FRESNEL
   *
   * Beim Schleim traegt der Fresnel-Term die Silhouette (PHASE-GRAFIK-PLAN §2:
   * am Rand ist der Blickweg durch das Streumedium am laengsten, dort MUSS es
   * heller sein). Der Exponent gehoert deshalb an die 3,0 und nicht hoeher: die
   * Normalen des Schleims werden jeden Tick neu gemittelt und sind an
   * gestauchten Stellen unruhig; jedes `pow()` verstaerkt diesen Fehler, ein
   * hoher Exponent macht daraus eine flackernde Linie und laesst das Gel
   * ausserdem metallisch aussehen.
   * ======================================================================== */
  B('fresnel', `
#ifndef GRAFIK_FRESNEL
#define GRAFIK_FRESNEL

/* Randanteil aus Normale und Blickrichtung. exponent 3.0 fuer Streumedien,
 * 4..5 fuer harte Oberflaechen. V zeigt VOM Punkt ZUR Kamera. */
float fresnel(vec3 N, vec3 V, float exponent) {
  return pow(1.0 - clamp(dot(N, V), 0.0, 1.0), exponent);
}

/* Dieselbe Groesse, wenn dot(N,V) schon berechnet vorliegt. */
float fresnelNdv(float ndv, float exponent) {
  return pow(1.0 - clamp(ndv, 0.0, 1.0), exponent);
}

/* Schlick mit Grundreflexion — fuer alles, was wirklich spiegelt. */
float schlick(float f0, float ndv) {
  return f0 + (1.0 - f0) * pow(1.0 - clamp(ndv, 0.0, 1.0), 5.0);
}

/* Randlicht mit Gegenlichtgewichtung. Ohne den zweiten Faktor leuchtet der
 * Rand rundum gleichmaessig wie eine Neonroehre; mit ihm sitzt er dort, wo das
 * Licht tatsaechlich durch den Koerper kommt (PHASE-GRAFIK-PLAN G7). */
float randlicht(vec3 N, vec3 V, vec3 L, float exponent) {
  return fresnel(N, V, exponent) * (0.5 + 0.5 * dot(L, -V));
}

/* Silhouettenabstand in BILDSCHIRMPIXELN, aus der Ableitung.
 * Liefert einen Saum konstanter Breite unabhaengig von der Kruemmung — genau
 * die Eigenschaft, die ein reiner Fresnel-Saum nicht hat. Braucht keine
 * Erweiterung: fwidth ist in GLSL ES 3.00 Kern. */
float silhouettenAbstandPx(vec3 N, vec3 V) {
  float ndv = abs(dot(N, V));
  return ndv / max(fwidth(ndv), 1e-5);
}
#endif
`);

  /* ==========================================================================
   * 4. HALBLAMBERT
   *
   * `max(dot(N,L),0)` laesst runde Koerper auf der Schattenseite zu schwarzen
   * Loechern absaufen — dann ist ihre Form weg. Genshins Schattenseiten fallen
   * kaum ab (gemessen L 239 -> 202, also -15 %), ToFs deutlich mehr (-23 %).
   * Beides erreicht man ueber den halbierten und verschobenen Kosinus, nicht
   * ueber ein zusaetzliches Umgebungslicht.
   *
   * `ndl01` ist ausserdem genau die Groesse, mit der die Schattenrampe aus
   * Schritt G4 nachschlaegt — deshalb hat sie hier einen eigenen Namen.
   * ======================================================================== */
  B('halblambert', `
#ifndef GRAFIK_HALBLAMBERT
#define GRAFIK_HALBLAMBERT

/* 0 an der Ruecken-, 1 an der Sonnenseite, 0.5 am Terminator.
 * Das ist die Nachschlagegroesse der Schattenrampe. */
float ndl01(vec3 N, vec3 L) { return dot(N, L) * 0.5 + 0.5; }

/* Klassischer Halblambert (quadriert): weicherer Uebergang, dunklere
 * Rueckseite als ndl01. */
float halblambert(vec3 N, vec3 L) {
  float h = dot(N, L) * 0.5 + 0.5;
  return h * h;
}

/* Mit einstellbarer Umschlingung. wrap = 0 ist Lambert, wrap = 1 Halblambert. */
float lambertUmschlungen(vec3 N, vec3 L, float wrap) {
  return clamp((dot(N, L) + wrap) / (1.0 + wrap), 0.0, 1.0);
}

/* Halbraumlicht: Himmel von oben, Bodenreflex von unten. Der Ausdruck steht
 * heute schon in FS_SOLID und ist genau richtig — hier nur benannt, damit ihn
 * jedes Modul gleich schreibt. */
vec3 halbraumLicht(vec3 N, vec3 himmel, vec3 boden) {
  return mix(boden, himmel, N.y * 0.5 + 0.5);
}
#endif
`);

  /* ==========================================================================
   * 5. TIEFE — aus dem Tiefenpuffer zurueckrechnen
   *
   * Der Tiefenpuffer speichert nicht den Abstand, sondern einen hyperbolisch
   * verzerrten Wert. Wer ihn direkt als Entfernung benutzt, bekommt einen
   * Nebel, der die ersten zwei Meter komplett zumacht und danach nichts mehr
   * tut. Alles hier rechnet gegen `near`/`far` der Kamera zurueck
   * (game.js: near 0.1, far 300, fovY = PI/3.6).
   * ======================================================================== */
  B('tiefe', `
#ifndef GRAFIK_TIEFE
#define GRAFIK_TIEFE

/* Fenster-Tiefe [0,1] -> NDC-Tiefe [-1,1] */
float tiefeNdc(float d) { return d * 2.0 - 1.0; }

/* Fenster-Tiefe [0,1] -> Abstand zur Kameraebene in Metern. */
float tiefeLinear(float d, float nah, float fern) {
  float z = d * 2.0 - 1.0;
  return (2.0 * nah * fern) / (fern + nah - z * (fern - nah));
}

/* Dasselbe, auf 0..1 normiert — brauchbar zum Anschauen beim Fehlersuchen. */
float tiefeAnteil(float d, float nah, float fern) {
  return (tiefeLinear(d, nah, fern) - nah) / (fern - nah);
}

/* Direkt aus einer Tiefentextur. */
float tiefeLesen(sampler2D karte, vec2 uv, float nah, float fern) {
  return tiefeLinear(texture(karte, uv).r, nah, fern);
}

/* Abstand des bereits gezeichneten Hintergrunds am eigenen Fragment, in Metern.
 * Damit rechnet ein weiches Kontaktband (Boden gegen Gel) ohne zweiten
 * Geometriedurchgang. */
float tiefeHinter(sampler2D karte, vec2 uv, float nah, float fern) {
  return tiefeLinear(texture(karte, uv).r, nah, fern);
}

/* Weicher Uebergang gegen die Geometrie dahinter: 0 direkt an der Kante,
 * 1 ab spanne Metern Abstand. */
float weicheKante(sampler2D karte, vec2 uv, float eigeneTiefe,
                  float nah, float fern, float spanne) {
  float hinten = tiefeLinear(texture(karte, uv).r, nah, fern);
  return clamp((hinten - eigeneTiefe) / max(spanne, 1e-4), 0.0, 1.0);
}
#endif
`);

  /* ==========================================================================
   * 6. BILDSCHIRMKOORDINATEN
   *
   * Alles, was ein Bildschirmdurchgang braucht: die eigene Lage im Bild, der
   * Blickstrahl durch das eigene Pixel (fuer Himmel und Sonnendunst — der
   * heutige Himmel nimmt die BILDHOEHE, und sobald die Kamera nickt, klebt der
   * Verlauf am Bild statt an der Welt) und die Weltposition eines Pixels aus
   * seiner Tiefe.
   * ======================================================================== */
  B('bildschirm', `
#ifndef GRAFIK_BILDSCHIRM
#define GRAFIK_BILDSCHIRM

/* Bildkoordinate 0..1, Ursprung unten links (wie gl_FragCoord). */
vec2 bildschirmUv(vec2 fragCoord, vec2 groesse) { return fragCoord / groesse; }

/* Bildkoordinate -> NDC */
vec2 uvNachNdc(vec2 uv) { return uv * 2.0 - 1.0; }
vec2 ndcNachUv(vec2 ndc) { return ndc * 0.5 + 0.5; }

/* Weltposition eines Pixels aus Bildkoordinate und Fenster-Tiefe. */
vec3 weltAusTiefe(vec2 uv, float tiefe01, mat4 invViewProj) {
  vec4 klipp = vec4(uv * 2.0 - 1.0, tiefe01 * 2.0 - 1.0, 1.0);
  vec4 w = invViewProj * klipp;
  return w.xyz / w.w;
}

/* Blickrichtung durch ein Pixel, normiert. Ausgangspunkt fuer jeden
 * Himmelsverlauf, der an der WELT haengen soll und nicht am Bild. */
vec3 blickStrahl(vec2 uv, mat4 invViewProj, vec3 auge) {
  vec4 f = invViewProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  return normalize(f.xyz / f.w - auge);
}

/* Weltpunkt -> Bildkoordinate. Fuer Bildschirmsuchen (Spiegelung, Fangschuss). */
vec2 weltNachUv(vec3 welt, mat4 viewProj) {
  vec4 k = viewProj * vec4(welt, 1.0);
  return (k.xy / k.w) * 0.5 + 0.5;
}

/* Seitenverhaeltnis-korrigierte Bildmitte-Koordinate: -1..1 in Y, breiter in X.
 * Fuer Vignette und radiale Profile. */
vec2 bildMitte(vec2 fragCoord, vec2 groesse) {
  return (fragCoord - groesse * 0.5) / (groesse.y * 0.5);
}
#endif
`);

  /* ==========================================================================
   * 7. NEBEL — eine Formel fuer alle
   *
   * Nicht in der Pflichtliste, aber die Stelle, an der ein auseinanderlaufender
   * Nachbau am sichersten scheitert: `uNebel` im Objektshader und `uDunst` im
   * Himmelsshader MUESSEN dieselbe Rechnung und dieselbe Farbe sein
   * (PHASE-GRAFIK-PLAN §1.1). Deshalb steht die Rechnung genau einmal hier.
   *
   * Kanalweise verschiedene Extinktion, gemessenes Verhaeltnis 1 : 1,99 : 2,78.
   * Der Startabstand ist eine Stilisierung: eine Exponentialfunktion kann nicht
   * gleichzeitig bei 9 m sauber und bei 40 m gesaettigt sein.
   * ======================================================================== */
  B('nebel', `
#ifndef GRAFIK_NEBEL
#define GRAFIK_NEBEL

/* gemessenes Kanalverhaeltnis, auf Gruen normiert */
const vec3 NEBEL_VERHAELTNIS = vec3(0.503, 1.0, 1.397);

float nebelAnteilKanal(float abstand, float beta, float start) {
  return 1.0 - exp(-beta * max(abstand - start, 0.0));
}
vec3 nebelAnteil(float abstand, vec3 beta, float start) {
  return vec3(1.0) - exp(-beta * max(abstand - start, 0.0));
}
vec3 nebelMischen(vec3 col, vec3 dunst, float abstand, vec3 beta, float start) {
  return mix(col, dunst, nebelAnteil(abstand, beta, start));
}
#endif
`);

  /* ==========================================================================
   * 8. DITHER
   *
   * Mit angehobenem Schwarz und flacher Tonwertkurve bleiben fuer eine dunkle
   * Szene nur rund 113 der 256 Stufen; ein Himmelsverlauf bandet dann sichtbar.
   * Eine geordnete Stoerung von einer halben Stufe kostet nichts und macht die
   * Streifen weg. Rein aus gl_FragCoord, also deterministisch.
   * ======================================================================== */
  B('dither', `
#ifndef GRAFIK_DITHER
#define GRAFIK_DITHER
float ditherWert(vec2 fragCoord) {
  return fract(52.9829189 * fract(0.06711056 * fragCoord.x + 0.00583715 * fragCoord.y));
}
vec3 dithern(vec3 c, vec2 fragCoord) {
  return c + (ditherWert(fragCoord) - 0.5) / 255.0;
}
#endif
`);

  /* --------------------------------------------------------------------------
   * Der Vollstaendigkeit halber in der Konsole abrufbar.
   * ------------------------------------------------------------------------ */
  GRAFIK.glslVersion = '#version 300 es';

})();
