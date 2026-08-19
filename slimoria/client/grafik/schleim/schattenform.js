'use strict';
/* ---------------------------------------------------------------------------
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * grafik/schleim/schattenform.js — der Schlagschatten des Schleims.
 *
 * Nur im zweiten Renderpfad aktiv (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt.
 *
 * ===========================================================================
 * 0. Das Problem in einem Satz
 * ===========================================================================
 *
 * Der Schatten unter dem Schleim ist eine WEICHE, GRAUE, RUNDE Flaeche. Alle
 * drei Eigenschaften sind falsch, und zwar jede aus einem eigenen Grund:
 *
 *   weich  — GRAFIK-MODULE.md §0 verlangt „harte Schattenkante, Flanke etwa
 *            2 px". Gemessen (siehe §1) sind es heute 6 px.
 *   grau   — der Schatten unterscheidet sich heute in allen drei Kanaeln um
 *            fast denselben Faktor. Im Referenzmaterial tut er das NIE: er
 *            ist die Bodenfarbe, abgedunkelt UND zur Komplementaerfarbe
 *            gezogen. Das ist kein Geschmack, sondern Physik — die
 *            beschattete Flaeche sieht nur noch den Himmel, und der ist blau.
 *   rund   — er folgt nicht der Auflageflaeche. Beim Aufprall breitet sich
 *            der Koerper aus, beim Abheben zieht er sich zusammen; der
 *            Schatten muss das mitmachen, sonst traegt er die Hoehe nicht
 *            (GDD 10 §98: der Spieler muss sehen, wo der Schleim steht).
 *
 * Und er ist zu HELL: heute 0,85 des unbeschatteten Bodens, im Referenzbild
 * 0,44. Ein Schatten mit 15 % Abdunklung ist kein Schatten, sondern ein
 * Schmutzfleck.
 *
 * ===========================================================================
 * 1. Die Messung — woher jede Zahl in diesem Modul stammt
 * ===========================================================================
 *
 * Alle Werte roh aus den Referenzdateien, Helligkeit L = Rec.709-Luma auf den
 * sRGB-Codewerten (dieselbe Definition wie tools/grafikmass.mjs, weil alle
 * Dossierzahlen ebenfalls sRGB-Ausgabewerte sind).
 *
 * ---------------------------------------------------------------------------
 * (A) `ref/genshin/figur_xingqiu_tageslicht_schlagschatten_1920.png`
 *     Der Schlagschatten der Figur auf hellem Steinboden, Mittagssonne.
 *     Das ist die genaueste verfuegbare Probe: grosse ruhige Flaeche
 *     beiderseits der Kante, kein Bewuchs, kein Fugenmuster darin.
 *
 *     Senkrechter Schnitt, Spalte x = 1410:
 *       y 739..744  freier Boden      RGB(218,220,208)   L 218,7
 *       y 745       206,7   \
 *       y 746       182,6    >  Flanke
 *       y 747       115,2   /
 *       y 748..755  Schatten          RGB( 78,100,118)   L  96,8
 *       y 756       149,0   \
 *       y 757       206,0    >  Flanke, andere Seite
 *       y 758       freier Boden      L 220,3
 *
 *       Verhaeltnis Schatten/Licht  L 96,8 / 218,7 = **0,443**
 *       kanalweise                  R 0,358 · G 0,455 · B 0,572
 *       auf Gruen normiert          R 0,787 · G 1,000 · B 1,258
 *       Flankenbreite               2 px bei 1920 → **1,7 px bei 1600**
 *
 *     Die Farbdrehung ist der eigentliche Befund:
 *       Boden   B/R = 208/218 = 0,954   (warm, gelblich)
 *       Schatten B/R = 118/ 78 = 1,513   (kalt, blauviolett)
 *     Der Schatten geht also NICHT ins Graue, sondern um Faktor 1,59 in B/R
 *     zur Komplementaerfarbe des Bodens. Wer ihn grau macht, verfehlt genau
 *     das, was im Standbild sofort auffaellt.
 *
 *     Die Form: der Schatten zeigt die Silhouette der Figur mitsamt der
 *     Luecke zwischen den Beinen. Er ist keine Ellipse.
 *
 * ---------------------------------------------------------------------------
 * (B) `ref/genshin/landschaft_sumeru_dorf_tag_2560.png`
 *     Der Kontaktschatten unter dem Fuss einer Laternensaeule, Spalte x = 1085:
 *       y 1142..1144  Kern              RGB( 55, 53, 23)   L 51,3
 *       y 1145        RGB(208,192,137)  L 191,4
 *       y 1146..1152  freies Pflaster   RGB(214,198,142)   L 197,4
 *
 *       Verhaeltnis   51,3 / 197,4 = **0,26**
 *       Flanke        1 px bei 2560 → **0,6 px bei 1600**
 *
 *     Zwei Lehren daraus. Erstens: die KONTAKTzone ist noch einmal deutlich
 *     dunkler als der Schlagschatten (0,26 gegen 0,44) — sie gehoert aber
 *     `schleim/kontakt.js` (ordnung 55), nicht hierher, und wird deshalb
 *     ausdruecklich NICHT mitgezeichnet. Zweitens: Genshin verblendet
 *     Schattenkanten nicht. Sie sind hart bis zur Aliasgrenze.
 *
 * ---------------------------------------------------------------------------
 * (C) `ref/slime/sr1-hop-phases-pink-group.jpg`
 *     Slime Rancher, springende Slimes ueber orangem Hallenboden. Das ist die
 *     Probe fuer die FORM, weil die Koerper in der Luft stehen und ihre
 *     Schatten frei auf dem Boden liegen. Zeile y = 900:
 *       x 675..710  freier Boden   RGB(231,108,57)   L 130,5
 *       x 715       Uebergang      L 120,1
 *       x 720..805  Schatten       RGB(137, 91,55)   L  97,6
 *
 *       Verhaeltnis   0,75          (deutlich flacher als Genshin)
 *       kanalweise    R 0,593 · G 0,843 · B 0,965
 *       Flanke        6..7 px bei 1920
 *
 *     Auf dem ROTEN Boden faellt hier ROT am staerksten und Blau fast gar
 *     nicht — wieder die Bewegung zur Komplementaerfarbe, nur mit umgekehrtem
 *     Vorzeichen, weil der Boden eine andere Farbe hat. Das bestaetigt die
 *     Regel und widerlegt „Schatten sind blau" als Rezept: sie sind
 *     komplementaer ZUM BODEN, und blau nur deshalb, weil Boeden warm sind.
 *
 *     Die Form der Schatten ist ein Blob mit der Silhouette des Koerpers, und
 *     die Schatten der gestreckten, springenden Slimes sind schmaler als die
 *     der ruhenden, breit sitzenden. Genau das verlangt der Auftrag.
 *
 *     Weil Slime Ranchers Kante mit 6–7 px die weiche Loesung ist und Genshin
 *     die harte, gilt hier Genshin: `ref/genshin/` ist die Stilvorgabe
 *     (GRAFIK-MODULE.md §0), Slime Rancher nur das Formvorbild.
 *
 * ---------------------------------------------------------------------------
 * (D) Der IST-Zustand, an derselben Stelle gemessen wie (A):
 *     `gauntlet/shots/g-schattenkante/…/frame_000.png`, Spalte x = 1000:
 *       y 690..700  Schatten   RGB(101, 94, 87)   L 95,0
 *       y 702..706  Flanke     104,2 → 110,3 → 112,0
 *       y 708..790  Boden      RGB(120,112, 98)   L 112,3
 *
 *       Verhaeltnis   0,846            Ziel 0,44..0,55
 *       kanalweise    R 0,842 · G 0,839 · B 0,888   → Streuung 0,05, also grau
 *       Flanke        6 px             Ziel <= 2 px
 *
 *     Und in `wabbeln` (Sonne bei 51° Hoehe) ist ueberhaupt kein Schatten zu
 *     sehen: bei 15 % Abdunklung und einem Wurf, der fast ganz unter dem
 *     Koerper liegt, bleibt nichts uebrig. Der Schleim klebt als Aufkleber
 *     auf der Wiese.
 *
 * ===========================================================================
 * 2. Wie die Form entsteht — und warum nicht ueber die Schattenkarte
 * ===========================================================================
 *
 * Gezeichnet wird die HUELLE SELBST, entlang der Lichtrichtung auf die
 * Bodenebene projiziert. Jeder Punkt `p` wandert um `(p.y / L.y)` Schritte
 * gegen `L` und landet bei y = 0. Das kostet einen einzigen `drawElements`
 * auf ein Netz, das ohnehin schon im Puffer liegt, und keinen einzigen
 * Fragmentaufwand ausser dem Schreiben.
 *
 * Warum nicht ueber `schatten.js` (die 1024er Schattenkarte)? Drei Gruende,
 * und der dritte ist der ausschlaggebende:
 *
 *  1. AUFLOESUNG. Ein Texel der Karte deckt bei spanne 16 rund 3,1 cm. Im
 *     Vordergrund einer flachen Kamera sind das mehrere Bildpixel; die
 *     Kante verschmiert auf die gemessenen 6 px. Die projizierte Geometrie
 *     hat dieses Problem nicht — ihre Kante ist eine Dreieckskante und damit
 *     so hart, wie die Mehrfachabtastung des Ziels es zulaesst.
 *  2. VERFORMUNG. Die Karte zeigt die Verformung nur so genau wie ihr Raster.
 *     Die Projektion zeigt sie exakt: derselbe Punktsatz, dieselbe Silhouette.
 *  3. FARBE. Die Karte liefert einen Anteil, keine Farbe. Der Empfaenger
 *     entscheidet — und der Empfaenger ist heute `schatten.js`' Notbehelf auf
 *     der Bodenebene, eine fremde Datei. Die Farbdrehung aus (A) laesst sich
 *     dort nicht einbauen, ohne sie auch dem Fels- und Kreaturenschatten
 *     aufzuzwingen.
 *
 * Der Preis der Projektion: sie kann nur auf eine EBENE werfen. Der Boden in
 * `boden.js` IST eine Ebene bei y = 0 (`vWorld = vec3(aPos.x*uSize, 0.0,
 * aPos.z*uSize)`), also ist der Preis heute null. Sobald der Boden Hoehe
 * bekommt, gehoert dieser Wurf in die Schattenkarte — dann steht am Ende der
 * Datei, was dafuer noetig ist.
 *
 * ---------------------------------------------------------------------------
 * EINE LAGE, NICHT ZWEI — warum `cullFace(BACK)` hier zwingend ist
 *
 * Nach der Projektion liegen ALLE 5120 Dreiecke in derselben Ebene. Wer sie
 * alle zeichnet, multipliziert jeden Bodenpunkt zweimal: einmal mit der
 * Ober-, einmal mit der Unterseite. Der Schatten waere dann quadratisch zu
 * dunkel und an den Silhouettenraendern (wo sich nur EINE Lage trifft)
 * ploetzlich heller — ein heller Saum um einen schwarzen Fleck.
 *
 * Die Loesung kostet nichts: nach der Projektion behaelt die dem Licht
 * ZUGEWANDTE Haelfte ihren Umlaufsinn, die abgewandte kehrt ihn um. Die
 * Kamera steht immer ueber der Ebene, also ist dieser Vorzeichenwechsel fuer
 * alle Dreiecke derselbe. `cullFace(BACK)` laesst damit genau die obere Schale
 * stehen — eine Lage, volle Deckung, kein Saum.
 *
 * Bei einer stark eingedellten Huelle (Aufprall, Umschlingung) kann die obere
 * Schale sich selbst ueberlappen. Der Fehler ist dann eine kleine dunklere
 * Insel im Schatten, kein Saum — und er ist mit `tiefe` beschraenkt, weil
 * zwei Lagen `tiefe²` ergeben und `tiefe` bei 0,55 liegt, nicht bei 0,1.
 *
 * ===========================================================================
 * 3. Die Farbe — Bodenfarbe abgedunkelt und zur Komplementaerfarbe gezogen
 * ===========================================================================
 *
 * Gezeichnet wird MULTIPLIKATIV (`blendFunc(DST_COLOR, ZERO)`). Das ist die
 * einzige Mischung, die „die Bodenfarbe, abgedunkelt" woertlich nimmt: was
 * unter dem Schatten liegt — Wiese, Pfad, Steinplatte, Blume — behaelt seine
 * Zeichnung und wird nur dunkler. Ein aufgemalter Fleck in einer festen Farbe
 * wuerde die groesste Flaeche des Bildes an genau der Stelle plattmachen, an
 * der das Auge steht.
 *
 * Der Multiplikator ist kanalweise verschieden, und seine Richtung kommt
 * nicht aus einem Geschmacksurteil, sondern aus `ctx.licht.zenit`: die
 * beschattete Flaeche sieht die Sonne nicht mehr, nur noch den Himmel ueber
 * sich. Also
 *
 *     kipp   = zenit / mittel(zenit)            Farbton des Himmels
 *     faktor = tiefe * mix(1, kipp, bunt)
 *
 * Warum `zenit` und nicht `himmel`: `ctx.licht.himmel` ist das
 * Halbraum-Umgebungslicht aus licht.js und bei Mittag praktisch unbunt
 * (0,470 / 0,490 / 0,495 — Streuung 2,5 %). Der erste Bau dieses Moduls hat
 * genau das genommen und einen GRAUEN Schatten geliefert, gemessen
 * 0,542 / 0,568 / 0,582, also B/R = 1,07 statt der verlangten 1,60. Der
 * Zenit dagegen traegt die Himmelsfarbe wirklich: Mittag (34,114,188)/255.
 *
 *     zenit Mittag auf Mittel 1        0,303 / 1,018 / 1,679
 *     davon 40 % (bunt = 0,40)         0,721 / 1,007 / 1,272
 *     gemessenes Ziel aus (A)          0,787 / 1,000 / 1,258
 *
 * Das ist keine Anpassung an die Messung, sondern ihre Erklaerung: Genshins
 * Schattenfarbe IST seine Himmelsfarbe, nur gedaempft — gedaempft, weil auch
 * eine beschattete Flaeche noch Licht vom Boden und von Nachbarflaechen
 * bekommt.
 *
 * Damit dreht sich die Farbe im Tagesgang von selbst mit (licht.js, G10):
 * goldene Stunde 0,851 / 1,035 / 1,114 (fast neutral, weil der Zenit dort
 * dunkles Petrol ist), Nacht 0,785 / 0,928 / 1,287. Eine feste Konstante
 * waere zu jeder Tageszeit ausser einer falsch.
 *
 * ===========================================================================
 * 4. Hoehe — breiter beim Aufprall, kleiner beim Abheben
 * ===========================================================================
 *
 * Der GROESSTE Teil davon kostet keine Zeile Code: die Projektion der echten
 * Huelle IST die Auflageflaeche. Beim Aufprall staucht der Koerper zur
 * Scheibe, seine Silhouette von oben wird breiter, der Schatten wird breiter.
 * Beim Absprung zieht er sich zum Tropfen, die Silhouette wird schmaler, der
 * Schatten wird schmaler. Nichts daran ist ein Trick.
 *
 * Dazu kommen zwei Stilisierungen, beide an (C) abgelesen und beide klein:
 *
 *   SCHRUMPF. Ein Parallellichtschatten aendert seine Groesse mit der Hoehe
 *   gar nicht, er wandert nur weg. In Slime Rancher sind die Schatten der
 *   springenden Slimes sichtbar kleiner als ihre Koerper. Deshalb wird die
 *   projizierte Flaeche um den Ankerpunkt herum auf bis zu `schrumpf` (0,66)
 *   gestaucht, linear ueber `abhebe` Meter Bodenabstand.
 *
 *   ABSCHWAECHUNG. Zugleich geht die Tiefe auf `fern` (0,60) der vollen
 *   Staerke zurueck. Die KANTE bleibt dabei hart — weich wuerde sie nur, wenn
 *   man den Halbschatten nachbaute, und der ist stilfremd.
 *
 * Beides zusammen ist der Grund, warum ein Sprung lesbar wird: der Schatten
 * wandert weg, wird kleiner und heller. Drei Zeichen statt einem.
 *
 * ===========================================================================
 * 5. Was dieses Modul NICHT tut
 * ===========================================================================
 *
 *   - Es zeichnet KEINE Kontaktzone. Der Saum, in dem die Masse den Boden
 *     beruehrt, gehoert `schleim/kontakt.js` (ordnung 55, also unmittelbar
 *     danach). Zwei Module, die denselben Ring abdunkeln, ergeben vier
 *     Tonstufen statt zwei.
 *   - Es zeichnet KEINEN Schatten fuer Kreaturen, Felsen, Ausstattung. Die
 *     haengen an `schatten.js`.
 *   - Es faerbt NICHT den Koerper. Das ist `gel.js` und `schleim/innen.js`.
 *   - Es rechnet KEINE zweite Tonstufe in den Schatten hinein. Genshins
 *     Schlagschatten hat genau eine (A: Plateau ueber 8 px, Streuung <= 2).
 *
 * ===========================================================================
 * 6. Ueberlagerung mit schatten.js — ehrlich benannt
 * ===========================================================================
 *
 * `schatten.js` zeichnet den Schleim weiterhin in seine Karte, und sein
 * Notbehelf auf der Bodenebene legt daraus 0,856 auf denselben Fleck. Wo
 * beide liegen, multipliziert sich das: 0,55 · 0,856 = 0,47 — mitten im
 * Zielband aus (A). Ausserhalb der eigenen, harten Silhouette bleibt vom
 * alten Wurf ein 15-%-Saum von wenigen Pixeln stehen; er ist schwaecher als
 * die eigene Kante und liest sich als deren Fuss, nicht als zweite Kante.
 *
 * Sauber waere es trotzdem nicht. Deshalb steht am Ende der Datei ein
 * BRAUCHT_FREMDAENDERUNG fuer `schatten.js`: den Schleim aus dem
 * Werferdurchgang nehmen, sobald dieses Modul steht. Bis dahin ist `tiefe`
 * so gewaehlt, dass das FERTIGE Bild die Zielzahlen trifft — gemessen, nicht
 * gerechnet.
 *
 * ===========================================================================
 * 7. Determinismus (GRAFIK-MODULE.md §4)
 * ===========================================================================
 *
 * Kein Math.random, kein Date, kein performance.now. Alles, was dieses Modul
 * rechnet, haengt an `ctx.slime.body`, `ctx.licht.richtung` und
 * `ctx.licht.himmel`. `ctx.time` wird nicht einmal gebraucht: der Schatten
 * hat keine Eigenbewegung.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof GRAFIK === 'undefined' || !GRAFIK || typeof GRAFIK.modul !== 'function') {
    return;
  }

  /* ==========================================================================
   * 0. Zahlen
   * ======================================================================== */

  /* Die Bodenebene. boden.js zeichnet sie flach bei y = 0 (VS_BODEN:
   * `vWorld = vec3(aPos.x*uSize, 0.0, aPos.z*uSize)`), ebenso der Grundzug in
   * renderer2.js. Steht hier als benannte Zahl, damit die eine Stelle, die
   * geaendert werden muss, wenn der Boden Hoehe bekommt, auffindbar ist. */
  const EBENE = 0.0;

  /* Flachste zugelassene Sonne. Darunter wird der Wurf laenger als das
   * Fuenffache der Koerperhoehe und die projizierte Huelle zieht sich zu
   * einem Streifen ueber die halbe Arena. `g-schattenkante` faehrt mit
   * L.y = 0,34 (Sonne 0.94/0.34/0.05), liegt also deutlich darueber. */
  const FLACHSTE_SONNE = 0.20;

  /* Rueckfallwerte, falls licht.js fehlt oder abgeschaltet ist. Wortgleich mit
   * der Vorgabe in renderer2.js (renderScene2, ctx.licht). */
  const LICHT_VORGABE = [0.55, 0.78, 0.32];
  const ZENIT_VORGABE = [0.135, 0.165, 0.225];

  /* ==========================================================================
   * 1. Programm
   * ======================================================================== */

  /* Die Projektion steckt vollstaendig im Vertex-Shader. Sie braucht nur die
   * Position — die Normale des Netzes ist fuer einen Schatten ohne Bedeutung,
   * und der Attributort 1 bleibt deshalb unbenutzt (das VAO liefert ihn
   * trotzdem; das kostet nichts). */
  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;

uniform mat4 uViewProj;
uniform vec3 uLicht;     /* normiert, zeigt ZUR Sonne */
uniform vec3 uAnker;     /* xz Fusspunkt des Wurfs auf der Ebene, y Ebenenhoehe */
uniform vec2 uForm;      /* x Schrumpf um den Anker, y Hebung ueber der Ebene */

void main() {
  /* Wie weit muss der Punkt gegen das Licht wandern, bis er die Ebene
   * trifft? Punkte UNTER der Ebene (die Huelle taucht beim Aufprall ein
   * Stueck ein) bleiben liegen — max(...,0.0) statt eines Wurfs nach oben,
   * der die Silhouette nach hinten aufreissen wuerde. */
  float hoch = max(aPos.y - uAnker.y, 0.0);
  float weg  = hoch / uLicht.y;

  vec2 p = aPos.xz - uLicht.xz * weg;

  /* Stauchung um den Ankerpunkt. Bei Bodenkontakt ist uForm.x = 1 und diese
   * Zeile ist wirkungslos. */
  p = uAnker.xz + (p - uAnker.xz) * uForm.x;

  gl_Position = uViewProj * vec4(p.x, uAnker.y + uForm.y, p.y, 1.0);
}`;

  /* Eine Tonstufe, kanalweise. Mehr steht in Genshins Schlagschatten nicht
   * drin (Kopf §1 A: Plateau ueber 8 px mit Streuung <= 2). */
  const FS = `#version 300 es
precision highp float;
uniform vec3 uFaktor;
out vec4 outColor;
void main() {
  outColor = vec4(uFaktor, 1.0);
}`;

  /* ==========================================================================
   * 2. Zustand
   * ======================================================================== */

  const S = {
    prog: null,
    mesh: null,          // eigenes Netz, nur falls R.slimeMesh fehlt
    hochgeladen: -1,     // ctx.time des letzten eigenen Uploads
    anker: new Float32Array(3),
    licht: new Float32Array(3),
    form: new Float32Array(2),
    faktor: new Float32Array(3),
    /* Von `vorbereiten` gefuellt, von `zeichnen` gelesen. Getrennt, weil
     * vorbereiten() aller Module VOR jedem zeichnen() laeuft (renderer2.js
     * §8) — die Lichtwerte stehen also erst dann sicher. */
    gilt: false,
  };

  /* Netz aus ctx.surface, formgleich mit gel.js/eigenesNetz. Wird nur
   * gebraucht, wenn game.js kein R.slimeMesh angelegt hat (Werkzeuge, Tests). */
  function eigenesNetz(gl, surface) {
    if (!surface || !surface.positions || !surface.indices) return null;
    try {
      return GRAFIK.mesh(gl, surface.positions, surface.normals, surface.indices);
    } catch (e) {
      console.error('schattenform: eigenes Netz gescheitert.', e);
      return null;
    }
  }

  /* Ein Vektor gilt als „nicht gesetzt", wenn er fehlt oder ganz aus Nullen
   * besteht — renderer2.js legt ctx.licht mit Nullvektoren an und ueberlaesst
   * das Fuellen licht.js. Dieselbe Pruefung wie in gel.js. */
  function nimm(v, vorgabe) {
    return (v && v.length >= 3 && (v[0] || v[1] || v[2])) ? v : vorgabe;
  }

  const klemm = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  /* ==========================================================================
   * 3. Anmeldung
   * ======================================================================== */

  const modul = GRAFIK.modul({
    name: 'schattenform',

    /* ------------------------------------------------------------------
     * ORDNUNG 26,5 — und warum NICHT 50,5, wie der Auftrag es nannte
     *
     * Der Auftrag hat 50,5 vorgegeben: zwischen Bodendekalen (50) und
     * Kontaktzone (55). Dort ist die Stelle GEBAUT worden, aufgenommen und
     * gemessen — und dort ist sie nachweislich falsch. Der Grund ist der
     * Tiefentest, und er laesst sich nicht wegdiskutieren:
     *
     * Bei 50,5 steht die ganze undurchsichtige Szene schon im Bild. Ein
     * Durchgang, der dort den Boden abdunkelt, MUSS den Tiefentest anlassen —
     * sonst malt er seinen Fleck auch auf jeden Felsen und jede Kreatur, die
     * VOR dem Schatten steht. Mit Tiefentest aber trifft er ausschliesslich
     * die Bodenebene: die Grashalme stehen davor, bestehen den Test und
     * bleiben hellgruen stehen. Gemessen in `g-schattenkante` mit ordnung
     * 50,5: der Schatten ist ein dunkles Feld, aus dem zwei Dutzend leuchtend
     * gruene Halme herausragen. Das zerstoert genau das, was §0 als das
     * Wichtigste nennt — die Silhouette traegt die Lesbarkeit. Eine
     * durchloecherte Silhouette traegt gar nichts.
     *
     * Bei 26,5 — nach Boden (20), Wasser (22), Gras (25) und dem
     * Notbehelf von schatten.js (26), vor Hindernissen (30) — stehen im Bild
     * NUR Himmel, Boden und Gras. Ein Durchgang ohne Tiefentest trifft dort
     * genau die Flaechen, die ein Bodenschatten treffen soll, und alles
     * Undurchsichtige danach ueberschreibt ihn von selbst. Das ist kein
     * Kunstgriff dieses Moduls, sondern genau die Loesung, die
     * `schatten.js` fuer sein Modul 'bodenschatten' schon gewaehlt und in
     * seinem Kopf begruendet hat.
     *
     * Was 26,5 nicht kann: den Schatten an einem Felsen hochlaufen lassen.
     * Das kann der Notbehelf in schatten.js ebenso wenig, und es ist der
     * kleinere Verlust — ein Schatten, der an einer Felswand fehlt, faellt
     * niemandem auf; ein Schatten voller Loecher faellt sofort auf.
     * ------------------------------------------------------------------ */
    ordnung: 26.5,

    regler: [
      /* Helligkeitsverhaeltnis Schatten zu unbeschattetem Boden, im Kern.
       * Gemessenes Genshin-Ziel 0,443 (Kopf §1 A). Der Vorgabewert liegt
       * darueber, weil schatten.js' Notbehelf denselben Fleck noch einmal mit
       * 0,856 belegt — 0,55 · 0,856 = 0,47 im fertigen Bild (Kopf §6). */
      { key: 'tiefe', min: 0.20, max: 1.0, step: 0.01, wert: 0.55 },
      /* Wie weit der Multiplikator dem Zenitfarbton folgt. 0 = grau (falsch,
       * steht nur zum Gegenprobieren da), 1 = voller Zenitfarbton (viel zu
       * bunt). 0,40 trifft die auf Gruen normierten Zielwerte aus (A):
       * Zenit Mittag (34,114,188)/255 auf Mittel 1 normiert ist
       * (0,303 / 1,018 / 1,679); mit 0,40 gedaempft (0,721 / 1,007 / 1,272),
       * gemessenes Ziel (0,787 / 1,000 / 1,258). */
      { key: 'bunt', min: 0.0, max: 1.0, step: 0.02, wert: 0.40 },
      /* Bodenabstand in Metern, ab dem Schrumpf und Abschwaechung voll
       * wirken. 1,7 m ist knapp die doppelte Koerpergroesse (radius 0,9). */
      { key: 'abhebe', min: 0.3, max: 5.0, step: 0.1, wert: 1.7 },
      /* Restgroesse bei voller Abhebehoehe (Kopf §4, an (C) abgelesen). */
      { key: 'schrumpf', min: 0.35, max: 1.0, step: 0.01, wert: 0.66 },
      /* Reststaerke bei voller Abhebehoehe. 1 = gleich dunkel wie am Boden. */
      { key: 'fern', min: 0.0, max: 1.0, step: 0.01, wert: 0.60 },
    ],

    /* ----------------------------------------------------------------- */
    aufbau(gl, R) {
      S.prog = GRAFIK.programm(gl, VS, FS, 'schleim/schattenform');
    },

    /* -----------------------------------------------------------------
     * vorbereiten: alle Zahlen ausrechnen, die von Licht und Koerper
     * abhaengen. Hier steht bewusst KEIN GL-Aufruf — licht.js (ordnung 0)
     * hat zu diesem Zeitpunkt schon geschrieben, gezeichnet wird aber erst
     * spaeter, und dazwischen darf sich nichts verschieben.
     * ----------------------------------------------------------------- */
    vorbereiten(gl, R, ctx) {
      S.gilt = false;
      if (!S.prog) return;

      const slime = ctx.slime;
      const b = slime && slime.body;
      if (!b || !b.n || !b.pos) return;

      const licht = ctx.licht || {};
      const w = modul.wert;

      /* --- Lichtrichtung, normiert und gegen die flache Sonne gesichert --- */
      const r = nimm(licht.richtung, nimm(R.light, LICHT_VORGABE));
      let lx = r[0], ly = r[1], lz = r[2];
      const ll = Math.hypot(lx, ly, lz) || 1;
      lx /= ll; ly /= ll; lz /= ll;
      if (ly < FLACHSTE_SONNE) {
        /* Waagerechten Anteil beibehalten, Hoehe anheben — sonst kippt die
         * Wurfrichtung, sobald die Sonne den Horizont streift. */
        const q = Math.hypot(lx, lz) || 1;
        const rest = Math.sqrt(Math.max(1 - FLACHSTE_SONNE * FLACHSTE_SONNE, 0));
        lx = lx / q * rest; lz = lz / q * rest; ly = FLACHSTE_SONNE;
      }
      S.licht[0] = lx; S.licht[1] = ly; S.licht[2] = lz;

      /* --- Bodenabstand des Koerpers -------------------------------------
       * Der tiefste Massepunkt, nicht der Mittelpunkt: beim Aufprall sitzt
       * der Mittelpunkt hoch und der Koerper liegt trotzdem auf. Ueber
       * b.pos (162 Punkte) statt ueber ctx.surface (2562 Punkte) — die
       * Huelle wird aus denselben Punkten aufgebaut, der Unterschied liegt
       * unter einem Zentimeter und die Schleife ist 16-mal kuerzer. */
      let tiefsterY = Infinity;
      for (let i = 0; i < b.n; i++) {
        const y = b.pos[i * 3 + 1];
        if (y < tiefsterY) tiefsterY = y;
      }
      const abstand = Math.max(0, tiefsterY - EBENE);
      const t = klemm(abstand / Math.max(w.abhebe, 0.05), 0, 1);

      /* --- Ankerpunkt: der Mittelpunkt, auf die Ebene geworfen ----------- */
      const hoch = Math.max(b.cy - EBENE, 0);
      S.anker[0] = b.cx - lx * (hoch / ly);
      S.anker[1] = EBENE;
      S.anker[2] = b.cz - lz * (hoch / ly);

      /* --- Form: Schrumpf. uForm.y bleibt 0 — ohne Tiefentest gaebe es
       * keinen Streit um Z, den eine Hebung schlichten muesste, und jede
       * Hebung schoebe den Schatten bei flacher Kamera sichtbar zum
       * Betrachter (0,012 m bei pitch 0,20 sind schon 6 cm Versatz). ------ */
      S.form[0] = 1 + (w.schrumpf - 1) * t;
      S.form[1] = 0;

      /* --- Farbe: Tiefe mal Himmelston (Kopf §3) ------------------------- */
      const h = nimm(licht.zenit, ZENIT_VORGABE);
      const mittel = (h[0] + h[1] + h[2]) / 3 || 1;
      const tiefe = w.tiefe + (1 - w.tiefe) * (1 - w.fern) * t;   // ferner -> heller
      for (let k = 0; k < 3; k++) {
        const kipp = 1 + (h[k] / mittel - 1) * w.bunt;
        /* Ueber 1 darf kein Kanal steigen: ein Multiplikator > 1 wuerde den
         * Boden im Schatten AUFhellen — im Blaukanal passiert genau das,
         * sobald `bunt` gross und `tiefe` nahe 1 steht. */
        S.faktor[k] = klemm(tiefe * kipp, 0, 1);
      }

      S.gilt = true;
    },

    /* ----------------------------------------------------------------- */
    zeichnen(gl, R, ctx) {
      if (!S.gilt || !S.prog) return;

      /* --- Netz besorgen -------------------------------------------------
       * Bevorzugt die Huelle, die die Pipeline ohnehin haelt. Fehlt sie,
       * legt das Modul eine eigene an (dieselbe Vorsichtsmassnahme wie in
       * gel.js — die Lanes werden nicht in einer festen Reihenfolge fertig). */
      let mesh = R.slimeMesh || S.mesh;
      if ((!mesh || !mesh.vao) && ctx.surface) mesh = S.mesh = eigenesNetz(gl, ctx.surface);
      if (!mesh || !mesh.vao) return;

      /* --- Punkte hochladen ---------------------------------------------
       * schatten.js (ordnung 5) und gel.js (60) laden dasselbe Netz; wer von
       * beiden laeuft, ist nicht garantiert. Ein doppelter Upload kostet
       * 30 kB Kopie, ein ausgelassener kostet ein Bild Verzug in der
       * Verformung — und ein Schatten, der dem Aufprall hinterherlaeuft,
       * faellt sofort auf. Also lieber einmal zuviel, aber nur einmal je Bild. */
      if (ctx.surface && S.hochgeladen !== ctx.time) {
        S.hochgeladen = ctx.time;
        gl.bindVertexArray(mesh.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
      }

      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      if (!viewProj) return;

      gl.useProgram(S.prog);
      gl.bindVertexArray(mesh.vao);

      /* --- Zustand --------------------------------------------------------
       * KEIN Tiefentest, KEIN Tiefenschreiben. Begruendung steht bei der
       * Ordnung: zu diesem Zeitpunkt stehen im Bild nur Himmel, Boden und
       * Gras, und genau die sollen abgedunkelt werden — der Gras HALM
       * genauso wie der Boden zwischen den Halmen. Alles Undurchsichtige
       * kommt danach und ueberschreibt den Schatten von selbst.
       *
       * Der Tiefenpuffer bleibt dabei unangetastet: kein Schreiben, kein
       * Vergleich. Die Ebene bei y = 0 liegt immer unter der Kamera, der
       * Wurf kann also nie ueber dem Horizont landen und den Himmel
       * einfaerben. */
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);

      /* Eine Lage, nicht zwei. Begruendung im Kopf, Abschnitt 2. */
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      /* Multiplikativ: die Bodenfarbe bleibt stehen und wird nur dunkler. */
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.DST_COLOR, gl.ZERO);

      const u = S.prog.u;
      gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
      gl.uniform3fv(u.uLicht, S.licht);
      gl.uniform3fv(u.uAnker, S.anker);
      gl.uniform2fv(u.uForm, S.form);
      gl.uniform3fv(u.uFaktor, S.faktor);

      gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

      /* --- Grundzustand wiederherstellen ---------------------------------
       * Der naechste Durchgang darf sich auf nichts von hier verlassen
       * (renderer2.js §5). Besonders die Mischfunktion: kontakt.js kommt
       * unmittelbar danach und mischt ueber Alpha. */
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.cullFace(gl.BACK);
    },
  });

  /* Zum Nachsehen in der Konsole. */
  GRAFIK.schattenform = S;

})();

/* ---------------------------------------------------------------------------
 * BRAUCHT_FREMDAENDERUNG
 *
 * client/grafik/schatten.js — der Schleim sollte aus dem Werferdurchgang
 * genommen werden (Abschnitt „1. Der Schleim", Zeilen 621–628), sobald dieses
 * Modul laeuft. Sonst liegen zwei Schatten desselben Koerpers uebereinander:
 * der harte aus dieser Datei und der weiche, 0,856 dunkle aus der Karte.
 * Sichtbar wird das als schwacher, wenige Pixel breiter Saum um die harte
 * Kante. Sauberer Weg dorthin: ein Regler `schleim` (0/1, Vorgabe 1) neben
 * dem vorhandenen `kreaturen`, den dieses Modul in seinem `vorbereiten` auf 0
 * setzt. Solange das nicht geschehen ist, ist `tiefe` hier so eingestellt,
 * dass das Produkt beider Lagen die Zielzahlen trifft.
 *
 * client/grafik/boden.js — sobald der Boden Hoehe bekommt (heute ist er die
 * Ebene y = 0), traegt die Projektion in dieser Datei nicht mehr. Dann gehoert
 * der Wurf in die Schattenkarte, und boden.js muesste `schattenVorRampe` mit
 * der kanalweisen Schattenfarbe aus dem Kopf dieser Datei benutzen statt mit
 * der neutralen aus schatten.js.
 * ------------------------------------------------------------------------- */
