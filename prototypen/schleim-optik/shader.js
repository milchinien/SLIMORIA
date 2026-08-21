'use strict';

/* ---------------------------------------------------------------------------
 * Alle GLSL-Quellen. Reihenfolge pro Bild siehe main.js.
 *
 * Der Schleim wird NICHT alpha-gemischt. Er liest den bereits gezeichneten
 * Hintergrund selbst aus einer Textur, verbiegt ihn (Brechung), schluckt Licht
 * auf dem Weg durch die Masse (Beer-Lambert) und legt Streuung, Reflexion und
 * Glanz darauf. Deshalb ist er am Ende ein undurchsichtiges Pixel — und
 * trotzdem durchsichtig anzusehen.
 * ------------------------------------------------------------------------- */

/* --- Rauschen: dieselbe Funktion in Vertex- und Fragmentstufe -------------- */
const GLSL_NOISE = `
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
                 mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                 mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise3(p); p *= 2.07; a *= 0.5; }
  return s;
}
`;

/* --- Himmel: eine Funktion, kein Cubemap. Wird als Umgebungslicht, als
 * Spiegelbild und als Hintergrund benutzt — deshalb passt alles zusammen. */
const GLSL_HIMMEL = `
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSun;
uniform vec3 uSunCol;

vec3 himmel(vec3 d) {
  float h = d.y;
  vec3 c = h > 0.0 ? mix(uSkyHorizon, uSkyTop, pow(h, 0.55))
                   : mix(uSkyHorizon, uSkyGround, pow(-h, 0.45));
  float s = max(dot(d, normalize(uSun)), 0.0);
  c += uSunCol * (pow(s, 2500.0) * 45.0 + pow(s, 60.0) * 0.10 + pow(s, 8.0) * 0.025);
  return c;
}
`;

const GLSL_TONEMAP = `
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
`;

/* --- Vollbild-Dreieck ------------------------------------------------------ */
const VS_QUAD = `#version 300 es
out vec2 vUV;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUV = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/* --- Hintergrundhimmel ----------------------------------------------------- */
const FS_HIMMEL = `#version 300 es
precision highp float;
in vec2 vUV;
uniform mat4 uInvVP;
uniform vec3 uCam;
out vec4 outColor;
${GLSL_HIMMEL}
void main() {
  vec4 p = uInvVP * vec4(vUV * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(p.xyz / p.w - uCam);
  outColor = vec4(himmel(dir), 1.0);
}`;

/* --- Boden ----------------------------------------------------------------- */
const VS_BODEN = `#version 300 es
in vec3 aPos;
uniform mat4 uVP;
uniform float uSize;
out vec3 vWorld;
void main() {
  vWorld = vec3(aPos.x * uSize, 0.0, aPos.z * uSize);
  gl_Position = uVP * vec4(vWorld, 1.0);
}`;

/* Nasser, polierter Stein. Die Fugen sind kantengeglättet (fwidth), damit sie
 * in der Ferne nicht flimmern. Darunter liegt der farbige Lichtsee, den der
 * Schleim durchlässt — das ist der halbe Grund, warum er saftig wirkt. */
const FS_BODEN = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCam;
uniform float uZeit;
uniform vec3 uBlobPos;
uniform float uBlobRadius;
uniform vec3 uBlobCol;
uniform float uPfuetze;
uniform float uKontakt;
out vec4 outColor;
${GLSL_NOISE}
${GLSL_HIMMEL}

void main() {
  vec3 P = vWorld;
  vec3 V = normalize(uCam - P);
  vec3 L = normalize(uSun);
  float dist = length(P.xz);

  // Stein: grobe Flecken plus feine Körnung
  float grob = fbm(P * 0.13);
  float fein = noise3(P * 3.7);
  vec3 stein = mix(vec3(0.026, 0.028, 0.034), vec3(0.062, 0.062, 0.066), grob);
  stein *= 0.85 + 0.30 * fein;

  // Plattenfugen
  vec2 g = P.xz * 0.35;
  vec2 f = abs(fract(g) - 0.5);
  float fw = max(fwidth(g.x), fwidth(g.y)) * 1.4 + 1e-4;
  float fuge = 1.0 - smoothstep(0.0, fw, min(f.x, f.y) - 0.005);
  stein = mix(stein, stein * 0.35, fuge * 0.8);

  // Normale: Fugen drücken die Oberfläche leicht ein, Wasserfilm wellt sie
  float e = 0.35;
  vec3 N = normalize(vec3(
    fbm(P * 0.9 + vec3(e, 0.0, uZeit * 0.05)) - fbm(P * 0.9 - vec3(e, 0.0, -uZeit * 0.05)),
    34.0,
    fbm(P * 0.9 + vec3(0.0, 0.0, e + uZeit * 0.05)) - fbm(P * 0.9 - vec3(0.0, 0.0, e - uZeit * 0.05))
  ));

  // Nass: Fresnel-Spiegelung des Himmels plus scharfes Sonnenlicht
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  vec3 R = reflect(-V, N);
  float nass = uPfuetze * (0.25 + 0.75 * smoothstep(9.0, 2.0, length(P.xz - uBlobPos.xz)));
  vec3 col = stein * (0.18 + 0.82 * clamp(dot(N, L), 0.0, 1.0));
  col += min(himmel(R), vec3(6.0)) * F * nass * 0.13;
  vec3 H = normalize(L + V);
  col += uSunCol * pow(max(dot(N, H), 0.0), 900.0) * nass * 0.7;

  // Schlagschatten des Körpers, entlang der Sonnenrichtung versetzt
  vec2 wurf = P.xz - uBlobPos.xz + L.xz / max(L.y, 0.25) * uBlobRadius * 0.55;
  float ds = length(wurf) / max(uBlobRadius, 0.01);
  col *= 1.0 - smoothstep(1.55, 0.25, ds) * 0.80 * (0.30 + 0.70 * uKontakt);

  // Kontaktschatten: der harte, dunkle Saum direkt unter der Auflagefläche
  float d = length(P.xz - uBlobPos.xz) / max(uBlobRadius, 0.01);
  col *= 1.0 - smoothstep(1.15, 0.55, d) * 0.55 * uKontakt;

  // Kaustik: das Licht, das durch die Masse fällt, sammelt sich in Adern
  float k = fbm(vec3(P.xz * 2.2, uZeit * 0.25) + 3.0);
  k = pow(smoothstep(0.42, 0.92, k), 1.3);
  float pool = smoothstep(1.9, 0.3, d);
  col += uBlobCol * pool * (0.16 + k * 0.75) * 0.55 * (0.35 + 0.65 * uKontakt);
  col += uBlobCol * smoothstep(1.10, 0.80, d) * 0.22 * uKontakt;

  // Horizont: der Boden verliert sich im Dunst
  float fog = smoothstep(38.0, 105.0, dist);
  col = mix(col, himmel(normalize(P - uCam)), fog);
  outColor = vec4(col, 1.0);
}`;

/* --- Undurchsichtige Requisiten (Säulen) ----------------------------------- */
const VS_FEST = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
uniform mat4 uVP;
uniform vec3 uPos;
uniform vec3 uSkala;
out vec3 vWorld;
out vec3 vNormal;
void main() {
  vWorld = aPos * uSkala + uPos;
  vNormal = normalize(aNormal / uSkala);
  gl_Position = uVP * vec4(vWorld, 1.0);
}`;

const FS_FEST = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uFarbe;
out vec4 outColor;
${GLSL_NOISE}
${GLSL_HIMMEL}
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(uSun);
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float F = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);

  // Steinoberfläche aufrauen, damit die Kugelform als Fels durchgeht
  float e2 = 0.25;
  float f0 = fbm(vWorld * 1.6);
  vec3 gr = vec3(fbm(vWorld * 1.6 + vec3(e2, 0.0, 0.0)) - f0,
                 fbm(vWorld * 1.6 + vec3(0.0, e2, 0.0)) - f0,
                 fbm(vWorld * 1.6 + vec3(0.0, 0.0, e2)) - f0) / e2;
  N = normalize(N + (gr - N * dot(gr, N)) * 0.55);
  ndl = clamp(dot(N, L), 0.0, 1.0);

  float mos = smoothstep(0.35, 0.9, fbm(vWorld * 0.8)) * smoothstep(1.6, 0.2, vWorld.y);
  vec3 basis = mix(uFarbe, vec3(0.12, 0.20, 0.11), mos * 0.7);
  basis *= 0.8 + 0.4 * fbm(vWorld * 2.3);

  vec3 col = basis * (0.18 + 0.82 * ndl);
  col += himmel(N) * 0.22 * basis;
  col += himmel(reflect(-V, N)) * F * 0.35;
  col = mix(col, himmel(normalize(vWorld - uCam)), smoothstep(30.0, 95.0, length(vWorld.xz)));
  outColor = vec4(col, 1.0);
}`;

/* --- Der Schleim: gemeinsame Vertexstufe ----------------------------------- *
 * Die Verformung passiert im Shader. Die Normale wird nicht mitgeliefert,
 * sondern aus zwei Nachbarpunkten derselben Verformung berechnet — deshalb
 * stimmt sie immer, egal wie stark er gerade wabbelt. */
const VS_SCHLEIM = `#version 300 es
in vec3 aPos;
uniform mat4 uVP;
uniform vec3 uMitte;
uniform float uRadius;
uniform float uZeit;
uniform float uWabbel;
uniform float uStauch;
uniform float uBreit;
uniform vec4 uStups;
uniform float uKontakt;
uniform vec2 uLehne;
uniform vec2 uRichtung;
uniform float uStreck;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vLokal;
${GLSL_NOISE}

/* Der Umriss ist keine Kugel, sondern ein Tropfen: unten breit und platt,
 * oben gewölbt. Das ist der halbe Unterschied zwischen "Ball" und "Schleim".
 * Die Unterkante liegt danach exakt bei uMitte.y - uRadius*uStauch*BODEN,
 * damit main.js den Körper genau auf den Boden setzen kann. */
vec3 formen(vec3 u) {
  float t = uZeit;
  float w = 0.0;
  w += sin(u.y * 3.3 + t * 1.7) * 0.030;
  w += sin(u.x * 2.7 - t * 1.3 + 1.7) * 0.026;
  w += sin(u.z * 3.9 + t * 2.1 + 3.1) * 0.020;
  w += (noise3(u * 2.1 + vec3(0.0, t * 0.35, 0.0)) - 0.5) * 0.12;
  w *= uWabbel;

  // Delle vom Anstupsen
  float d = max(dot(u, uStups.xyz), 0.0);
  w -= pow(d, 3.0) * uStups.w;

  vec3 p = u * (1.0 + w);
  p.y *= uStauch;
  p.xz *= uBreit;

  // Tropfenprofil: nach unten hin breiter, oben etwas eingezogen
  p.xz *= 1.0 + 0.30 * smoothstep(0.35, -0.95, u.y) - 0.08 * smoothstep(0.2, 1.0, u.y);
  p *= uRadius;

  float boden = -uRadius * uStauch * 0.78;

  // Bewegung: die Masse neigt sich (der Fuß bleibt stehen, der Kopf kippt)
  // und streckt sich in Laufrichtung. uLehne kommt träge nach — deshalb
  // bleibt sie beim Anfahren zurück und schwingt beim Bremsen nach vorn.
  float hoch = max(p.y - boden, 0.0);
  p.xz += uLehne * hoch;
  p.xz += uRichtung * dot(p.xz, uRichtung) * uStreck;

  // Bodenkontakt: die Unterseite wird gegen eine feste Ebene plattgedrückt.
  // In der Luft (uKontakt -> 0) rundet sie sich wieder zum Tropfen.
  float k = (1.0 - smoothstep(boden, boden * 0.42, p.y)) * uKontakt;
  p.y = mix(p.y, boden, k);
  p.xz *= 1.0 + k * 0.10;
  return p + uMitte;
}

void main() {
  vec3 u = normalize(aPos);
  vec3 t1 = normalize(cross(abs(u.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), u));
  vec3 t2 = cross(u, t1);
  float e = 0.02;
  vec3 p0 = formen(u);
  vec3 pa = formen(normalize(u + t1 * e));
  vec3 pb = formen(normalize(u + t2 * e));
  vNormal = normalize(cross(pa - p0, pb - p0));
  vWorld = p0;
  vLokal = u;
  gl_Position = uVP * vec4(p0, 1.0);
}`;

/* --- Dickenmessung ---------------------------------------------------------- *
 * Rückseiten addieren ihre Kameraentfernung, Vorderseiten ziehen sie ab.
 * Was übrig bleibt, ist die Strecke, die ein Blick durch die Masse zurücklegt.
 * Genau dieser Wert steuert Absorption, Streuung und Innenleben. */
const FS_DICKE = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCam;
uniform float uSkala;
out vec4 outColor;
void main() {
  outColor = vec4(distance(vWorld, uCam) * uSkala);
}`;

/* --- Der Schleim: Oberfläche ------------------------------------------------ */
const FS_SCHLEIM = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vLokal;
uniform vec3 uCam;
uniform vec3 uRechts;
uniform vec3 uHoch;
uniform vec3 uMitte;
uniform float uRadius;
uniform float uStauch;
uniform float uBreit;
uniform vec2 uRes;
uniform sampler2D uSzene;
uniform sampler2D uWeich;
uniform sampler2D uDicke;
uniform float uDickeSkala;
uniform vec3 uAbsorb;
uniform vec3 uStreu;
uniform float uZeit;
uniform float uBrechung;
uniform float uRauheit;
uniform float uSSS;
uniform float uInnen;
uniform float uSchlieren;
uniform float uRand;
uniform float uDetail;
uniform float uReflex;
uniform float uTrueb;
out vec4 outColor;
${GLSL_NOISE}
${GLSL_HIMMEL}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(uSun);

  // Feindetail: fließende Wellen auf der Haut, nur als Normalenstörung
  if (uDetail > 0.001) {
    vec3 q = vWorld * 3.4 + vec3(0.0, uZeit * 0.45, 0.0);
    float e = 0.16;
    float n0 = fbm(q);
    vec3 grad = vec3(fbm(q + vec3(e, 0.0, 0.0)) - n0,
                     fbm(q + vec3(0.0, e, 0.0)) - n0,
                     fbm(q + vec3(0.0, 0.0, e)) - n0) / e;
    grad -= N * dot(grad, N);
    N = normalize(N + grad * uDetail * 0.10);
  }

  float dicke = max(texture(uDicke, uv).r * uDickeSkala, 0.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float F = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);

  // Brechung: der Hintergrund wird entlang der Normalen verschoben, je dicker
  // die Masse, desto weiter. Die drei Kanäle leicht verschieden — Farbsaum.
  vec2 off = vec2(dot(N, uRechts), dot(N, uHoch));
  off *= uBrechung * min(dicke, 3.5) * 0.045 / max(distance(uCam, vWorld) * 0.12, 1.0);
  vec2 u1 = clamp(uv - off * 1.03, vec2(0.002), vec2(0.998));
  vec2 u2 = clamp(uv - off, vec2(0.002), vec2(0.998));
  vec2 u3 = clamp(uv - off * 0.97, vec2(0.002), vec2(0.998));
  vec3 scharf = vec3(texture(uSzene, u1).r, texture(uSzene, u2).g, texture(uSzene, u3).b);

  // Raue Brechung: dicke Masse streut das durchgelassene Licht, der
  // Hintergrund wird darin unscharf. Ohne das sieht Gel aus wie Fensterglas.
  vec3 weich = vec3(texture(uWeich, u1).r, texture(uWeich, u2).g, texture(uWeich, u3).b);
  vec3 bg = mix(scharf, weich, clamp(dicke * uTrueb, 0.0, 1.0));

  // Beer-Lambert: was tief durch die Masse muss, verliert Farbe
  bg *= exp(-uAbsorb * dicke);

  // Innenleben: acht Schritte durch den Körper, entlang desselben Blicks.
  // Die Schlieren liegen dadurch wirklich IM Volumen, nicht auf der Haut.
  vec3 innen = vec3(0.0);
  if (uInnen > 0.001) {
    float weite = min(dicke, 4.5);
    float dt = weite / 8.0;
    vec3 p = vWorld - V * dt * 0.5;
    float durch = 1.0;
    for (int i = 0; i < 8; i++) {
      vec3 q = p * uSchlieren * 1.6 + vec3(0.0, -uZeit * 0.13, uZeit * 0.05);
      float d = smoothstep(0.36, 0.94, fbm(q));
      // zur Haut hin ausblenden, damit die Schlieren im Volumen bleiben
      vec3 rel = (p - uMitte) / vec3(uBreit, uStauch, uBreit) / max(uRadius, 0.01);
      d *= smoothstep(1.05, 0.30, length(rel));
      float licht = 0.22 + 0.78 * exp(-float(i) * dt * 0.7);
      innen += mix(uStreu * uStreu, uStreu, licht) * d * durch * licht * dt;
      durch *= exp(-d * dt * 2.0);
      p -= V * dt;
    }
    innen *= uInnen * 1.35;
  }

  // Durchleuchtung: Gegenlicht kommt gefärbt auf der Vorderseite wieder heraus
  float gegen = pow(clamp(dot(V, -L) * 0.5 + 0.5, 0.0, 1.0), 4.0);
  vec3 sss = uStreu * uSunCol * gegen * exp(-dicke * 0.75) * 1.5;
  float wrap = clamp((dot(N, L) + 0.65) / 1.65, 0.0, 1.0);
  sss += uStreu * uStreu * uSunCol * wrap * wrap * 0.14;
  sss *= uSSS;

  // Spiegelung des Himmels und der Sonnenglanz auf der nassen Haut
  vec3 R = reflect(-V, N);
  vec3 refl = himmel(R) * uReflex;
  vec3 H = normalize(L + V);
  float a = max(uRauheit, 0.015); a *= a;
  float nh = clamp(dot(N, H), 0.0, 1.0);
  float den = nh * nh * (a * a - 1.0) + 1.0;
  float D = a * a / (3.14159265 * den * den);
  vec3 glanz = uSunCol * D * F * 1.6;
  glanz += uSunCol * pow(nh, 24.0) * 0.22;

  vec3 col = bg * (1.0 - F * 0.65);
  col += innen;
  col += sss;
  col = mix(col, refl, F * 0.9);
  col += glanz;

  // Randlicht: der typische helle Saum, wo die Masse dünn ausläuft
  col += (uStreu * 0.65 + uSunCol * 0.35) * pow(1.0 - ndv, 3.5) * uRand;

  outColor = vec4(col, 1.0);
}`;

/* --- Innenteile: Blasen, Kern, Augen --------------------------------------- *
 * Werden VOR dem Schleim gezeichnet. Dadurch liegen sie in der Szenentextur
 * und werden von der Brechung mitverzerrt — sie sitzen sichtbar IM Gel. */
const VS_KUGEL = `#version 300 es
in vec3 aPos;
uniform mat4 uVP;
uniform vec3 uPos;
uniform vec3 uSkala;
out vec3 vWorld;
out vec3 vNormal;
void main() {
  vec3 u = normalize(aPos);
  vWorld = u * uSkala + uPos;
  vNormal = normalize(u / uSkala);
  gl_Position = uVP * vec4(vWorld, 1.0);
}`;

const FS_BLASE = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uFarbe;
uniform float uStaerke;
out vec4 outColor;
${GLSL_HIMMEL}
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(uSun);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  // Luftblase: außen hell, in der Mitte fast nichts
  float ring = pow(1.0 - ndv, 3.2);
  float punkt = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 120.0);
  vec3 col = uFarbe * ring * 1.2 + uSunCol * punkt * 0.7;
  outColor = vec4(col * uStaerke, 1.0);
}`;

const FS_KERN = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uFarbe;
uniform float uStaerke;
out vec4 outColor;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  // weicher Leuchtkern: in der Mitte am hellsten, zum Rand hin aus
  float g = pow(ndv, 2.0);
  outColor = vec4(uFarbe * g * uStaerke, 1.0);
}`;

/* Die Augen kommen NACH dem Schleim, sonst verschluckt ihn sein eigenes
 * Leuchten. Damit sie trotzdem im Gel liegen und nicht aufgeklebt wirken,
 * laufen sie am Rand weich aus und tragen dieselben Glanzlichter wie die
 * Haut darüber. Ausgabe ist vormultipliziert (Blend: ONE, 1-SrcAlpha). */
const FS_AUGE = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uFarbe;
uniform float uStaerke;
out vec4 outColor;
${GLSL_HIMMEL}
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vWorld);
  vec3 L = normalize(uSun);
  float ndv = clamp(dot(N, V), 0.0, 1.0);

  float glanz = pow(clamp(dot(N, normalize(L + V)), 0.0, 1.0), 200.0);
  float glanz2 = pow(clamp(dot(N, normalize(vec3(-0.45, 0.95, 0.35) + V)), 0.0, 1.0), 70.0);
  vec3 col = uFarbe * (0.55 + 0.45 * ndv);
  col += vec3(1.0, 0.99, 0.95) * glanz * 2.4;
  col += vec3(0.70, 0.85, 1.0) * glanz2 * 0.55;

  // weicher Rand: das Gel liegt über dem Auge, die Kante darf nicht schneiden
  float a = smoothstep(0.02, 0.42, ndv) * uStaerke;
  outColor = vec4(col * a, a);
}`;

/* --- Staub in der Luft ------------------------------------------------------ */
const VS_STAUB = `#version 300 es
in vec3 aPos;
uniform mat4 uVP;
uniform vec3 uCam;
uniform float uZeit;
out float vHell;
void main() {
  vec3 p = aPos;
  p.y = mod(p.y + uZeit * 0.22, 7.0);
  p.x += sin(uZeit * 0.4 + aPos.z * 3.0) * 0.35;
  p.z += cos(uZeit * 0.33 + aPos.x * 2.0) * 0.35;
  float d = distance(p, uCam);
  gl_Position = uVP * vec4(p, 1.0);
  gl_PointSize = clamp(70.0 / d, 1.0, 7.0);
  vHell = smoothstep(40.0, 6.0, d) * (0.35 + 0.65 * fract(aPos.x * 12.9898 + aPos.z * 78.233));
}`;

const FS_STAUB = `#version 300 es
precision highp float;
in float vHell;
uniform vec3 uFarbe;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float m = smoothstep(0.5, 0.0, length(c));
  outColor = vec4(uFarbe * m * m * vHell * 0.9, 1.0);
}`;

/* --- Nachbearbeitung -------------------------------------------------------- */
const FS_HELL = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform float uSchwelle;
out vec4 outColor;
void main() {
  vec3 c = texture(uTex, vUV).rgb;
  float l = max(max(c.r, c.g), c.b);
  float k = max(l - uSchwelle, 0.0) / max(l, 1e-4);
  outColor = vec4(c * k * k, 1.0);
}`;

const FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uSchritt;
out vec4 outColor;
void main() {
  vec3 s = texture(uTex, vUV).rgb * 0.227027;
  s += (texture(uTex, vUV + uSchritt * 1.3846).rgb +
        texture(uTex, vUV - uSchritt * 1.3846).rgb) * 0.316216;
  s += (texture(uTex, vUV + uSchritt * 3.2308).rgb +
        texture(uTex, vUV - uSchritt * 3.2308).rgb) * 0.070270;
  outColor = vec4(s, 1.0);
}`;

const FS_KOPIE = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
out vec4 outColor;
void main() { outColor = vec4(texture(uTex, vUV).rgb, 1.0); }`;

const FS_FINAL = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform float uBloom;
uniform float uBelichtung;
uniform float uKorn;
uniform float uZeit;
out vec4 outColor;
${GLSL_TONEMAP}

void main() {
  vec2 uv = vUV;
  // leichte Farbquerung zum Bildrand: die Linse ist nicht perfekt
  vec2 d = (uv - 0.5) * 0.0016;
  vec3 col = vec3(
    texture(uTex, uv + d).r,
    texture(uTex, uv).g,
    texture(uTex, uv - d).b
  );

  col += (texture(uBloomA, uv).rgb * 0.62 + texture(uBloomB, uv).rgb * 0.38) * uBloom;
  col *= uBelichtung;
  col = aces(col);

  // Vignette
  vec2 q = uv - 0.5;
  col *= 1.0 - dot(q, q) * 0.55;

  // Filmkorn gegen Banding in den weichen Verläufen
  float n = fract(sin(dot(uv * 1000.0 + uZeit, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * uKorn;

  outColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}`;

/* --- Debug: Dicke als Falschfarbe ------------------------------------------ */
const FS_DEBUG_DICKE = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform float uSkala;
out vec4 outColor;
void main() {
  float d = texture(uTex, vUV).r * uSkala;
  vec3 c = mix(vec3(0.02, 0.03, 0.08), vec3(1.0, 0.85, 0.3), clamp(d / 4.0, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}`;
