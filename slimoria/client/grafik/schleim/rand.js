'use strict';
/* ---------------------------------------------------------------------------
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * Der helle Saum an der Silhouette des Schleimkoerpers.
 *
 * Nur aktiv im zweiten Renderpfad (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche.
 *
 * ===========================================================================
 * 0. Das Problem, um das es geht
 * ===========================================================================
 *
 * Der Koerper steht auf heller Wiese. Sein Inneres ist dunkler als der Grund
 * (gemessen an `wabbeln`, Bild 10, Zeile 470: Koerper L 86, Boden L 200), also
 * liest man ihn als Loch statt als Wesen. Was fehlt, ist die eine Sache, die
 * jedes Referenzbild hat und dieses Bild nicht: ein SATTER, HELLER SAUM an der
 * Silhouette.
 *
 * Was hier ausdruecklich NICHT gebaut wird: die umgedrehte Huelle aus
 * `grafik/kontur.js`. Ein durchscheinender Koerper mit dunkler Aussenlinie
 * sieht nach Aufkleber aus, und die Huelle laege ausserdem HINTER dem Gel und
 * schiene hindurch. PHASE-GRAFIK-PLAN §2 und §4 verwerfen sie fuer den Schleim
 * aus genau diesen zwei Gruenden; `ref/slime/DOSSIER.md` §7 misst am Material
 * nach: „Kein Outline, kein Cel-Rand."
 *
 * Der Weg ist Fresnel: zum Rand hin laeuft der Blick durch mehr Material, dort
 * sammelt sich das meiste gestreute Licht. Das ist die eine Anleihe, die
 * `ref/tof/UNTERSCHIEDE.md` §8 fuer ein Streumedium ausdruecklich empfiehlt.
 *
 * ===========================================================================
 * 1. Eigene Messungen am Referenzmaterial
 * ===========================================================================
 *
 * Vier Zeilen- und Spaltenschnitte, roh aus den Bilddateien gelesen (Kanal-
 * werte in sRGB 0..255, L = Rec.709-Luma, S = HSV-Saettigung). Nicht aus dem
 * Dossier abgeschrieben — das Dossier nennt nur Breite und Verhaeltnis, hier
 * wird zusaetzlich die FORM des Profils gebraucht.
 *
 * ---------------------------------------------------------------------------
 * (A) `ref/slime/sr1-rest-green-cave-dome.jpg`, Koerper x 774..1056,
 *     y 400..666 (282 x 266 px). Der klarste Fall: gruener Koerper gegen
 *     dunkle Hoehle, Saum rundherum.
 *
 *     Zeile 520 (45 % der Koerperhoehe)
 *       Hintergrund      (10, 35, 50)  L  32   S 80 %
 *       Innenplateau     (18, 92, 13)  L  68   S 84 %
 *       Randspitze       (86,255,155)  L 212   S 66 %   — links wie rechts
 *       ---------------------------------------------------------------
 *       UEBERHOEHUNG     212 / 68 = 3.12 x gegen das Koerperinnere
 *       HALBWERTSBREITE  15 px = 5.3 % der Koerperbreite, links == rechts
 *       FUSS bei 20 %    24..25 px = 8.7 % der Koerperbreite
 *
 *     Profil des linken Randes, auf (Spitze − Innen) normiert:
 *       Abstand vom Rand   0     8    12   16   20   24   28  px
 *       Anteil            1.00 0.94 0.55 0.38 0.28 0.19 0.13
 *
 *     FARBE: der schwaechste Kanal steigt am staerksten —
 *       R 18 -> 86 (4.8x)   G 92 -> 255 (2.8x)   B 13 -> 155 (11.9x)
 *     Die HSV-Saettigung faellt dabei von 84 % auf 66 %; der absolute
 *     Buntabstand (max − min) steigt aber von 79 auf 169, also **+114 %**.
 *     Der Saum ist demnach nicht „weisser", sondern die duenne, klare
 *     Materialfarbe: genau das, was `R.gel.farbe.klar` haelt.
 *
 *     Spalte 960, Unterkante: L faellt von 66 direkt auf den Hintergrund 26.
 *     **Am Bodenkontakt gibt es keinen Saum.** Er sitzt nur an der freien
 *     Silhouette. Ein Saum rundherum hebt den Koerper vom Boden ab.
 *
 * ---------------------------------------------------------------------------
 * (B) `ref/slime/sr1-rest-single-pink-silhouette.jpg`, Koerper 1284,718,
 *     221,225 — dieselbe Datei, aus der DOSSIER §7 und `glanz.js` rechnen.
 *     Zeile 880 (72 % Hoehe, also Schattenhaelfte). Licht von links oben.
 *
 *       Innen            (128, 17, 59) L  44   S 87 %
 *       Lichtseite links (233, 77,124) L 114 = 2.6 x, Halbwert  6 px = 2.9 %
 *       Schattenseite    (251,100,151) L 136 = 3.1 x, Halbwert 10 px = 4.8 %
 *                        Fuss der Schattenseite 35 px = 16 %
 *
 *     Die vom Licht ABGEWANDTE Seite ist 1.19 x heller und 1.7 x breiter.
 *     Der Saum ist also nicht richtungsblind — aber er ist auch nicht auf die
 *     Schattenhaelfte beschraenkt, wie (A) zeigt. Beides muss ins Gewicht.
 *
 * ---------------------------------------------------------------------------
 * (C) `ref/blob-jelly/slime-rancher-2-presskit-slimes-resting-and-squashed.png`
 *     (3840x2160), Zeile 1250, Koerper x 1505..1852 = 347 px. Nachtszene.
 *       Hintergrund L 159 S  7 %   Innen L 127 S 61 %
 *       Saum links  L 186 = 1.46 x, Halbwert 15 px = 4.3 %
 *       Saum rechts L 206 = 1.62 x, Halbwert 26 px = 7.5 %
 *
 * ---------------------------------------------------------------------------
 * (D) `ref/blob-jelly/slime-heroes-screenshot-3.jpg`, Zeile 690,
 *     Koerper x 429..651 = 222 px. Blauer Koerper auf oliver Wiese — der
 *     Fall, der unserem am naechsten kommt.
 *       Hintergrund (122,126,111) L 124 S  8 %
 *       Innen       ( 69,167,216) L 150 S 68 %
 *       Rand        ( 62,109,197) L 105 S 69..76 %
 *     Hier gibt es KEINEN Helligkeitssaum — der Rand ist sogar dunkler als
 *     die Mitte. Getrennt wird ueber die SAETTIGUNG: 8 % -> 68 % auf 8 px
 *     = 3.6 % der Koerperbreite, und die Randsaettigung (74..76 %) liegt
 *     nochmals 7 Punkte ueber der Mitte.
 *     Lehre daraus: der Saum darf nicht entsaettigen. Ein additives Weiss
 *     haette diesen Koerper vom Grund nicht getrennt.
 *
 * ---------------------------------------------------------------------------
 * ZUSAMMENFASSUNG DER ZIELZAHLEN
 *
 *   Halbwertsbreite   5 % der Koerperbreite   (gemessene Spanne 2.9 .. 7.5 %)
 *   Fuss bei 20 %     9 % der Koerperbreite
 *   Ueberhoehung      1.5 .. 3.1 x gegen das Koerperinnere
 *   Richtung          abgewandte Seite rund 1.2 x staerker als die Lichtseite
 *   Bodenkontakt      kein Saum
 *   Farbe             die duenne Materialfarbe, nicht Weiss
 *
 * ===========================================================================
 * 2. Was heute im Bild steht, und warum es zu schmal ist
 * ===========================================================================
 *
 * `gel.js` hat bereits einen Fresnel-Rand: `pow(1.0 - ndv, uRandBreite)` mit
 * `randBreite = 6.0`, dazu `spiegel = pow(1.0 - ndv, 5.0)`. Rechnet man diese
 * Potenz in eine Bildbreite um, wird klar, warum davon nichts zu sehen ist.
 *
 * Auf einer Kugel vom Radius R gilt fuer einen Punkt im Abstand x von der
 * Achse: `ndv = sqrt(1 − (x/R)^2)`. Der Saum reicht bis dorthin, wo der Term
 * auf die Haelfte gefallen ist:
 *
 *   pow(1−ndv, k) = 0.5   ->   ndv = 1 − 0.5^(1/k)
 *   Eindringtiefe in Anteilen der KOERPERBREITE:  (1 − sqrt(1−ndv^2)) / 2
 *
 *   k = 6 (gel.js)  ->  ndv = 0.109  ->  0.30 % der Koerperbreite
 *   k = 5 (spiegel) ->  ndv = 0.129  ->  0.42 %
 *   k = 3 (Plan G7) ->  ndv = 0.206  ->  1.07 %
 *   gemessen                              5.0 %
 *
 * Bei einem Koerper von 270 px Breite sind 0.30 % genau 0.8 px. Nachgemessen
 * an `wabbeln`, Bild 10, Zeile 470 (Koerper x 683..952 = 270 px), mit diesem
 * Modul auf `staerke = 0`:
 *   Innen L 71, Randspitze L 137 (links) / 119 (rechts) = 1.93 x / 1.68 x,
 *   Halbwertsbreite 3.8 px / 9.7 px = 1.4 % / 3.6 %,
 *   FUSS bei 20 % der Ueberhoehung 5.2 px = **1.9 %** gegen gemessene 8.7 %.
 * Der Saum ist also da, aber **vier- bis fuenffach zu schmal**. Das ist kein Fehler in
 * `gel.js` — eine Potenzfunktion KANN keinen breiten Saum mit einem Ende
 * liefern: erhoeht man die Staerke, statt den Exponenten zu senken, waechst
 * die Spitze und nicht die Breite; senkt man den Exponenten, legt sich der
 * Schleier ueber den ganzen Koerper. Deshalb ein eigenes Modul mit einer
 * anderen Funktionsklasse, statt an `randStaerke` zu drehen.
 *
 * ===========================================================================
 * 3. Die Form: eine BEGRENZTE Schulter im Streifwinkel
 * ===========================================================================
 *
 * GRAFIK-MODULE.md §0 verlangt „klar begrenzte Form" statt „weich auslaufender
 * Schimmer" — und das gemessene Profil in (A) ist genau das: flach am Rand,
 * steil dazwischen, bei rund 19 % der Koerperbreite auf Null. Dieselbe
 * Beobachtung hat `schleim/glanz.js` fuer das Glanzlicht gemacht; dort steht
 * aus demselben Grund eine Smoothstep-Schulter statt einer Blinn-Keule.
 *
 * Gerechnet wird im WINKEL, nicht im Kosinus:
 *
 *   float psi  = asin(ndv);                        // 0 an der Silhouette
 *   float saum = 1.0 - smoothstep(0.0, uWeite, psi);
 *
 * `psi` ist der Winkel zwischen Oberflaeche und Blickstrahl (90 Grad minus
 * dem Winkel zur Blickachse). Auf einer Kugel gilt `x/R = cos(psi)`, damit
 * laesst sich `uWeite` unmittelbar in eine Bildbreite uebersetzen:
 *
 *   Anteil der Koerperbreite  =  (1 − cos(psi)) / 2
 *
 *   uWeite = 0.90 rad
 *     Halbwert   psi = 0.450  ->  4.98 %   (Ziel 5 %)
 *     20 %-Fuss  psi = 0.612  ->  9.07 %   (gemessen 8.7 %)
 *     Ende       psi = 0.900  -> 18.9 %    — hier ist der Saum ZU ENDE
 *
 * Drei Eigenschaften, auf die es ankommt:
 *
 *  - Er hat ein Ende. Ab 19 % Eindringtiefe ist der Term exakt Null, nicht
 *    „fast Null". Das Koerperinnere bleibt eine ruhige Flaeche (§0).
 *  - Er ist eine Winkelgroesse, kein Bildschirmmass. Die Saumbreite haengt
 *    damit am Koerper und nicht an der Kameradistanz — genau so verhaelt sich
 *    das Referenzmaterial ueber alle gemessenen Entfernungen.
 *  - Er verstaerkt das Normalenrauschen nicht. Die Huellennormalen werden
 *    jeden Tick neu gemittelt und sind an gestauchten Stellen unruhig;
 *    PHASE-GRAFIK-PLAN §2 warnt deshalb vor hohen Exponenten. `asin` ist
 *    monoton mit Steigung 1 nahe Null, und eine Schulter ueber 0.9 rad ist
 *    rund sechsmal flacher als `pow(1−ndv, 6)` an derselben Stelle.
 *
 * ===========================================================================
 * 4. Die Gewichtung: Richtung, Bodenkontakt, Farbe
 * ===========================================================================
 *
 * (a) GEGENLICHT. Aus (B): die abgewandte Seite ist 1.19 x heller. Aus (A):
 *     der Saum ist trotzdem RUNDHERUM da. Beides zusammen ergibt einen Sockel
 *     plus eine Richtungszugabe, nicht ein Tor:
 *
 *       gegen   = 0.5 + 0.5 * dot(L, -V)          // 1 = Sonne hinter dem Koerper
 *       schatten= 1.0 - smoothstep(-0.10, 0.35, dot(N, L))
 *       gewicht = (uGrund + (1−uGrund)*gegen) * (1.0 + uSchattenPlus*schatten)
 *
 *     `uGrund = 0.55` haelt den Saum auch bei Licht von vorn deutlich
 *     sichtbar — in (A) steht die Lichtquelle ueber dem Koerper, und der Saum
 *     ist dort mit 3.1 x am staerksten von allen vier Messungen.
 *     `uSchattenPlus = 0.19` ist unmittelbar die 1.19 aus (B).
 *
 * (b) BODENKONTAKT. Aus (A), Spalte 960: an der Unterkante kein Saum. Ohne
 *     diese Ausnahme bekommt der Koerper einen Lichtrand zwischen sich und
 *     seinem eigenen Schatten und schwebt. Ausgeblendet wird ueber die
 *     untersten `uFussAnteil` der Koerperhoehe; `R.gel.unten` ist die
 *     Weltkoordinate der tiefsten Stelle und folgt jeder Stauchung.
 *
 * (c) FARBE. Aus (A): die schwachen Kanaele steigen am staerksten, die
 *     Saettigung bleibt hoch. Das ist die duenne Materialfarbe, und die
 *     liegt fertig aufgeloest (Fraktion UND Todeszustand) unter
 *     `R.gel.farbe.klar`. Wer sie hier neu herleitet, baut die
 *     Fraktionstabelle aus GDD 01 §8 ein zweites Mal — und die Todespfuetze
 *     bekaeme einen Saum, den sie nicht haben darf.
 *     Multipliziert wird mit dem Licht (Sonne im Gegenlicht, sonst Himmel),
 *     NICHT mit Weiss. (D) zeigt, was ein weisser Saum kostet: er haette
 *     genau den Koerper entsaettigt, der sich nur ueber Saettigung vom Grund
 *     trennt.
 *
 * ===========================================================================
 * 5. Anmeldung — Ordnung 72, nicht 53
 * ===========================================================================
 *
 * ABWEICHUNG VOM AUFTRAG (dort stand `ordnung: 53`), und zwar eine
 * zwingende. Seit der Reparatur der Zeichenreihenfolge liegt auf Ordnung 58
 * der Grundzug `gelschale`: die abgewandte Seite der Huelle, UNDURCHSICHTIG
 * und mit Tiefenschreiben (renderer2.js, Abschnitt „DIE TIEFENORDNUNG").
 * Alles, was vor 58 in die Koerperflaeche gezeichnet wird, wird davon
 * vollstaendig uebermalt — ein Saum auf Ordnung 53 waere schlicht unsichtbar.
 * Danach multipliziert D2b des Gels (`blendFuncSeparate(ZERO, SRC_COLOR)`)
 * das Ziel mit der Transmission; auch das haette den Saum noch gedaempft.
 *
 * `gel.js` §6 schreibt fuer alles, was AUF der Oberflaeche sitzt, Ordnung
 * > 60 vor, dazu `depthFunc(LEQUAL)`, `depthMask(false)` und additives
 * Mischen auf der Frontflaeche, die der Tiefenvorlauf D2a hinterlassen hat.
 * Genau das wird hier gemacht. 72 statt 70, damit der Saum nach dem
 * Glanzlicht liegt und die Reihenfolge der beiden Aufsaetze festgeschrieben
 * ist, statt an der Anmeldereihenfolge zu haengen.
 *
 * Der vorhandene Rand in `gel.js` bleibt stehen. Er ist mit 0.30 % der
 * Koerperbreite eine Kernlinie am aeussersten Pixel und stoert den breiten
 * Saum nicht — im Gegenteil, er haelt die Kante scharf. Ein Wunschzettel-
 * eintrag zum Abschalten (`randMul`) existiert nicht; er waere hier auch
 * nicht noetig.
 *
 * ===========================================================================
 * 6. Was am fertigen Bild herauskommt
 * ===========================================================================
 *
 * Paarlauf `wabbeln`, Bild 10, Zeile 470, Koerper x 683..952 = 270 px —
 * derselbe Lauf, nur dieses Modul einmal mit `staerke = 0.00` und einmal mit
 * `0.72`. Massstab und Kriterium sind identisch mit den Referenzmessungen
 * oben (Spitze gegen Innenplateau, Halbwert und 20 %-Fuss in Anteilen der
 * Koerperbreite).
 *
 *                          ohne      mit      Referenz (gemessen)
 *   Innenplateau L          71        62       —
 *   Randspitze L links     137       180       —
 *   Randspitze L rechts    119       157       —
 *   UEBERHOEHUNG links    1.93 x    2.90 x    1.5 .. 3.1 x
 *   UEBERHOEHUNG rechts   1.68 x    2.53 x
 *   Halbwert links         1.4 %     1.8 %    2.9 .. 7.5 %
 *   Halbwert rechts        3.6 %     3.6 %
 *   FUSS bei 20 % links    1.9 %     9.6 %    8.7 % (Bild A)
 *   FUSS bei 20 % rechts   —        16.7 %    16 % (Bild B, Schattenseite)
 *
 * Spalte 800, Oberkante gegen den hellen Grund (L 98) — die Stelle, an der
 * der Koerper vorher im Gras verschwand:
 *   ohne  Randspitze L 138, Ueberschuss ueber den Grund **+40 Stufen**
 *   mit   Randspitze L 172, Ueberschuss ueber den Grund **+74 Stufen**
 * PHASE-GRAFIK-PLAN G7 verlangt fuer den hellen Rand +60..+100 Stufen.
 *
 * Der Halbwert bleibt unter dem Referenzmedian, weil die Tonwertkurve aus
 * `post.js` die Spitze staucht (Schulter ab 0.55, Deckel 0.96) und der
 * Blaukanal des Eldoran-Gels dort schon bei 228 von 255 steht. In LINEAREN
 * Szenenwerten, also vor `post.js` zurueckgerechnet, liegt der Halbwert bei
 * 8.8 % — die Form stimmt, die Ausgabe klemmt. Deshalb ist der 20 %-Fuss
 * hier die belastbarere Zahl, und der trifft die Referenz.
 *
 * Gegenproben:
 *   `umschlingung` Bild 5..11 — der gefressene Wolf bleibt sichtbar im Gel
 *     (GDD 01 §28). Der Saum sitzt auf der Oberflaeche und legt sich nicht
 *     ueber ihn: er haengt an `ndv`, und ueber dem Einschluss steht die
 *     Flaeche der Kamera zugewandt.
 *   `tod` Bild 12..16 — die Pfuetze bekommt KEINEN Saum. `farbe.klar` traegt
 *     dort den Faktor 0.30 aus `TOT.klar`, und der Saum faellt mit.
 *
 * ===========================================================================
 * Determinismus (ARCHITEKTUR §2 / GRAFIK-MODULE §4): kein Math.random, kein
 * Date, kein performance.now. Der Saum bewegt sich ausschliesslich, weil die
 * Huelle sich bewegt — er haengt an keiner Zeitachse.
 * ------------------------------------------------------------------------- */

(function () {
  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('grafik/schleim/rand.js: GRAFIK-Register fehlt — Ladeliste pruefen.');
    return;
  }

  /* =====================================================================
   * Regler. Vorgaben sind die gemessenen Werte aus dem Kopfkommentar.
   * =================================================================== */
  const P = {
    /* Breite der Schulter als Streifwinkel in Bogenmass.
     * 0.90 rad  ->  Halbwert 4.98 %, Fuss 9.07 %, Ende 18.9 % der
     * Koerperbreite. Gemessen: 5.3 % / 8.7 % (Bild A). */
    weite: 0.90,
    /* Hoehe der Schulter. Wird gegen die gemessene Ueberhoehung von
     * 1.5..3.1 x gegen das Koerperinnere abgeglichen. */
    staerke: 0.72,
    /* Sockel bei Licht von vorn. 1.0 = richtungsblind, 0.0 = nur im
     * Gegenlicht. Bild A hat die Sonne ueber dem Koerper und trotzdem den
     * staerksten Saum aller vier Messungen — ein Tor waere falsch. */
    grund: 0.55,
    /* Zugabe auf der vom Licht abgewandten Seite. Unmittelbar die 1.19 aus
     * Bild B (Schattenseite 3.1 x gegen Lichtseite 2.6 x). */
    schattenPlus: 0.19,
    /* Ueber welchen Anteil der Koerperhoehe der Saum zum Bodenkontakt hin
     * ausblendet (quadrierte Schulter, siehe Shader). Bild A, Spalte 960:
     * die untersten rund 10 % tragen keinen Saum, ab rund 20 % ist er voll
     * da. 0.25 mit Quadrat trifft beide Stuetzstellen (0.12 bzw. 0.80). */
    fussAnteil: 0.25,
    /* Anteil Sonne gegen Himmel in der Saumfarbe. Der Saum ist Licht, das
     * durch das Material gelaufen ist — im Gegenlicht ueberwiegt die Sonne. */
    sonneAnteil: 0.60,
  };

  const S = {
    bereit: false,
    prog: null,
    mesh: null,
    hochgeladen: -1,
    /* jedes Bild aus der Huelle gemessen, falls R.gel fehlt */
    unten: 0,
    hoch: 1,
  };

  /* =====================================================================
   * Shader
   * =================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
out vec3 vPos;
out vec3 vNormal;
/* invariant, damit dieser Durchgang auf exakt derselben Tiefe landet wie der
 * Tiefenvorlauf D2a des Materialkerns und depthFunc(LEQUAL) greift. Ohne das
 * darf der Uebersetzer die Rechnung anders anordnen, und der Saum faellt
 * stellenweise durch den Tiefentest. */
invariant gl_Position;
void main() {
  vPos = aPos;
  vNormal = aNormal;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vNormal;

uniform vec3  uCam;
uniform vec3  uLicht;        // Richtung ZUR Sonne
uniform vec3  uSonne;        // Farbe der gerichteten Quelle
uniform vec3  uHimmel;       // Farbe der Himmelskuppel
uniform vec3  uKlar;         // duenne Materialfarbe, aus R.gel.farbe.klar

uniform float uWeite;        // Breite der Schulter im Streifwinkel, Bogenmass
uniform float uStaerke;
uniform float uGrund;        // Sockel bei Licht von vorn
uniform float uSchattenPlus; // Zugabe auf der abgewandten Seite
uniform float uSonneAnteil;

uniform float uUnten;        // Welt-Y der tiefsten Huellenstelle
uniform float uFussHoehe;    // ueber wie viel Hoehe der Saum am Boden ausblendet

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  /* Falten des Weichkoerpers: an einer eingedrueckten Stelle kann die
   * gemittelte Normale von der Kamera weg zeigen, obwohl die Flaeche zu ihr
   * hin steht. Dieselbe Behandlung wie in gel.js und glanz.js. */
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(uLicht);

  float ndv = clamp(dot(N, V), 0.0, 1.0);

  /* --- Die Schulter -----------------------------------------------------
   * psi ist der Winkel zwischen Oberflaeche und Blickstrahl: 0 an der
   * Silhouette, PI/2 in der Mitte einer der Kamera zugewandten Kugel.
   * Auf einer Kugel gilt x/R = cos(psi), damit ist uWeite unmittelbar eine
   * Breite in Anteilen der Koerperbreite (Kopfkommentar §3). */
  float psi  = asin(ndv);
  float saum = 1.0 - smoothstep(0.0, uWeite, psi);
  if (saum <= 0.0) { outColor = vec4(0.0); return; }

  /* --- Richtung ---------------------------------------------------------
   * Sockel plus Gegenlichtzugabe, kein Tor: gemessen ist der Saum auch bei
   * Licht von vorn da, nur schwaecher. */
  float gegen    = 0.5 + 0.5 * dot(L, -V);
  float schatten = 1.0 - smoothstep(-0.10, 0.35, dot(N, L));
  float gewicht  = (uGrund + (1.0 - uGrund) * gegen)
                 * (1.0 + uSchattenPlus * schatten);

  /* --- Bodenkontakt -----------------------------------------------------
   * Am Aufsetzpunkt hat das Referenzmaterial keinen Saum. Ohne diese
   * Ausnahme laeuft eine helle Linie zwischen Koerper und Eigenschatten und
   * der Koerper schwebt.
   *
   * QUADRIERT, und das ist keine Kosmetik: gemessen (Bild A, Spalte 960) ist
   * der Saum ueber die untersten rund 10 % der Koerperhoehe GANZ weg und ab
   * rund 20 % voll da. Eine einfache Schulter ueber 25 % Hoehe steht bei
   * 10 % noch auf 0.35 — sichtbar zu hell. Quadriert steht sie dort auf
   * 0.12 und bei 20 % auf 0.80. Das trifft beide Stuetzstellen; eine
   * schmalere Schulter statt des Quadrats waere bei 20 % schon fertig und
   * ergaebe eine harte Ringkante ueber dem Bodenkontakt. */
  float fuss = smoothstep(uUnten, uUnten + uFussHoehe, vPos.y);
  gewicht *= fuss * fuss;

  /* --- Farbe ------------------------------------------------------------
   * Die duenne Materialfarbe, mit dem Licht multipliziert — nicht mit
   * Weiss. Ein weisser Saum entsaettigt genau den Rand, der die Trennung
   * gegen den Hintergrund traegt (Messung D im Kopfkommentar). */
  vec3 licht = uSonne * uSonneAnteil + uHimmel * (1.0 - uSonneAnteil);
  outColor = vec4(uKlar * licht * (saum * uStaerke * gewicht), 1.0);
}`;

  /* =====================================================================
   * Rueckfall, falls gel.js fehlt: Unterkante und Hoehe selbst messen.
   * =================================================================== */
  function huelleMessen(ctx) {
    const pos = ctx.surface && ctx.surface.positions;
    if (!pos || pos.length < 9) return;
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 1; i < pos.length; i += 3) {
      const y = pos[i];
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    S.unten = yMin;
    S.hoch = Math.max((yMax - yMin) * 0.5, 1e-3);
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

  /* renderer2.js legt ctx.licht mit Nullvektoren an und ueberlaesst das
   * Fuellen licht.js. Ein Nullvektor wird deshalb wie ein fehlender Wert
   * behandelt — sonst ist der Saum schwarz, solange licht.js fehlt. */
  const nimm = (v, vorgabe) =>
    (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;

  /* =====================================================================
   * Anmeldung
   * =================================================================== */
  G.modul({
    name: 'rand',
    ordnung: 72,

    regler: [
      { key: 'weite', min: 0.20, max: 1.60, step: 0.01, wert: P.weite },
      { key: 'staerke', min: 0.0, max: 2.0, step: 0.01, wert: P.staerke },
      { key: 'grund', min: 0.0, max: 1.0, step: 0.01, wert: P.grund },
      { key: 'schattenPlus', min: 0.0, max: 1.0, step: 0.01, wert: P.schattenPlus },
      { key: 'fussAnteil', min: 0.0, max: 0.5, step: 0.01, wert: P.fussAnteil },
      { key: 'sonneAnteil', min: 0.0, max: 1.0, step: 0.05, wert: P.sonneAnteil },
    ],

    aufbau(gl, R) {
      S.prog = G.programm(gl, VS, FS, 'schleim/rand');
      S.bereit = true;
    },

    vorbereiten(gl, R, ctx) {
      if (!S.bereit) return;
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];
      huelleMessen(ctx);
    },

    zeichnen(gl, R, ctx) {
      if (!S.bereit) return;

      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) mesh = S.mesh = eigenesNetz(gl, ctx.surface);
      if (!mesh || !mesh.vao) return;

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      const cam = ctx.cam || (ctx.camera && ctx.camera.eye);
      if (!viewProj || !cam) return;

      gl.bindVertexArray(mesh.vao);

      /* Huelle hochladen, falls in diesem Bild noch niemand sonst es getan
       * hat. Ein ausgelassener Upload kostet ein Bild Verzug — dann sitzt
       * der Saum auf der Form von gestern. */
      if (ctx.surface && S.hochgeladen !== ctx.time) {
        S.hochgeladen = ctx.time;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
        if (mesh.nb) {
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.normals);
        }
      }

      const licht = ctx.licht || {};
      const richtung = nimm(licht.richtung, nimm(R.light, [0.55, 0.78, 0.32]));
      const sonne = nimm(licht.farbe, [0.88, 0.85, 0.78]);
      const himmel = nimm(licht.himmel, nimm(licht.ambient, [0.34, 0.38, 0.47]));

      /* Die duenne Materialfarbe kommt aus dem Materialkern — dort schon nach
       * Fraktion UND Todeszustand aufgeloest (Eldoran blau, Ravok rot,
       * GDD 01 §8). Ebenso Unterkante und halbe Hoehe der Huelle; nur wenn
       * gel.js fehlt, wird selbst gemessen. */
      const gel = R.gel || G.gel;
      const klar = (gel && gel.farbe && gel.farbe.klar) || ctx.pal.light || [0.6, 0.8, 1.0];
      const unten = (gel && typeof gel.unten === 'number') ? gel.unten : S.unten;
      const hoch = (gel && typeof gel.hoch === 'number') ? gel.hoch : S.hoch;

      /* Todespfuetze (GDD 01 §50): KEIN eigener Faktor noetig. `farbe.klar`
       * traegt den Todeszustand bereits — gel.js skaliert die klare Farbe in
       * der Pfuetze auf 30 % (`TOT.klar`), und da der Saum genau diese Farbe
       * benutzt, faellt er im selben Verhaeltnis mit. Eine Leiche leuchtet
       * damit nicht am Rand, ohne dass hier eine zweite Todesregel steht.
       *
       * Ausdruecklich NICHT ueber `gel.glanzStaerke` gerechnet, obwohl das
       * naheliegt: dort steckt auch der Wunschzettel anderer Module, und
       * `schleim/glanz.js` setzt jedes Bild `wunsch.glanzMul = 0`. Der Wert
       * ist deshalb dauerhaft 0 und als Todesanzeiger unbrauchbar. */

      const p = S.prog;
      const u = p.u || {};
      gl.useProgram(p);
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uCam, cam);
      gl.uniform3fv(u.uLicht, richtung);
      gl.uniform3fv(u.uSonne, sonne);
      gl.uniform3fv(u.uHimmel, himmel);
      gl.uniform3fv(u.uKlar, klar);
      gl.uniform1f(u.uWeite, Math.max(P.weite, 1e-3));
      gl.uniform1f(u.uStaerke, P.staerke);
      gl.uniform1f(u.uGrund, P.grund);
      gl.uniform1f(u.uSchattenPlus, P.schattenPlus);
      gl.uniform1f(u.uSonneAnteil, P.sonneAnteil);
      gl.uniform1f(u.uUnten, unten);
      gl.uniform1f(u.uFussHoehe, Math.max(2.0 * hoch * P.fussAnteil, 1e-4));

      /* Genau der Zustand, den gel.js §6 fuer Ordnung > 60 vorschreibt: die
       * Frontflaeche steht nach D2a im Tiefenpuffer, also LEQUAL ohne
       * Schreiben, und addiert wird Licht. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);

      gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

      /* Zustand zuruecklassen, wie ihn die Pipeline erwartet. */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
  });

})();
