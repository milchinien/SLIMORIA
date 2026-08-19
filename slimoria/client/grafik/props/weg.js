'use strict';
/* ===========================================================================
 * grafik/props/weg.js — der getretene Weg als BODENZEICHNUNG.
 *
 * Besitzer: Lane KARTE, Ausstattungstyp `weg`. Meldet sich mit
 * KARTE.typ('weg', ...) an, setzt seine eigenen Stuecke mit KARTE.setzen().
 *
 * WAS DAS HIER IST
 *   Zwei helle, unregelmaessige Baender ueber dem Boden. Eines fuehrt vom
 *   Startplatz nach Norden durch die enge Passage bei z = 14, das zweite nach
 *   Suedwesten um Fels und Plateau herum bis an die Schwelle des Friedhofs.
 *   Sie sind KEINE Geometrie im Sinne der Welt: sie liegen 2 cm ueber der
 *   Bodenebene, schreiben keine Tiefe, nehmen an keiner Kollision teil und
 *   veraendern world.js mit keinem Byte. Ein Weg ist hier eine Faerbung des
 *   Bodens, nichts weiter.
 *
 * DIE DREI GRENZEN, an denen dieser Typ gemessen werden darf
 *   1. Der Schleim ist die Figur (GDD 10 §69). Der Weg ist flach, kann also
 *      nichts verdecken — und er bleibt ausserdem aus dem Startkreis heraus:
 *      erst ab Radius 2,8 blendet er ueberhaupt ein, voll ist er ab 4,4.
 *      Unter dem Schleim und unter seinem Kontaktschatten liegt blanker Boden.
 *   2. Keine Kollision. Jeder Knoten und jede Bahnbreite unten ist gegen die
 *      Hindernisse aus world.js nachgerechnet; die Nachrechnung steht als
 *      Kommentar an der Stelle, wo es eng wird.
 *   3. Kosten. Ein einziger Zeichenaufruf fuer beide Bahnen, rund 420
 *      Dreiecke, keine Textur, kein Framebuffer. Zahlen unten unter KOSTEN.
 *
 * KEIN Math.random, KEIN Date. Die Unregelmaessigkeit der Raender faellt aus
 * einem ganzzahligen Ortshash ueber die Bogenlaenge. Zwei Laeufe liefern
 * dasselbe Netz, Byte fuer Byte.
 *
 * ---------------------------------------------------------------------------
 * WAS AN GENSHIN GEMESSEN WURDE (eigene Pixelmessung, keine Vermutung)
 *
 * `ref/genshin/landschaft_mondstadt_mittag_fernnebel_4k.png`, Zeile 1600:
 *   Weg  x 572…708  = RGB(216, 204, 152), Streuung ueber die Breite ±6
 *   Gras links/rechts            = RGB(137, 193, 104)
 *   -> Delta R +79, G +11, B +48. Der entscheidende Befund ist das G:
 *      ein Genshin-Weg ist NICHT einfach heller, er ist ENTSAETTIGT INS WARME.
 *      Leuchtdichte 175 -> 203, also nur +16 %.
 *   Randbreite: Gras (147,200,107) bei x=564 -> Weg (216,206,147) bei x=572,
 *      also 8 px bei 3840 Bildbreite = 3,3 px auf 1600x900.
 *   Direkt im Uebergang sitzt ein DUNKLERER Saum: x=568 (142,144,120),
 *      Leuchtdichte 142 gegen 175 im Gras und 203 im Weg. Rund 4 px bei 3840,
 *      also Saumbreite / Wegbreite = 4/136 = 0,03 je Seite.
 *   Wegbreite 136 px bei 3840 = 59 px auf 1600x900.
 *
 * `ref/genshin/landschaft_wiese_mittag_figur_2560.png`, Zeile 1390:
 *   getretene Flaeche x>1556 = RGB(175, 196, 160) gegen Gras (139, 195, 100).
 *   -> Delta R +36, G +1, B +60. Wieder: G bleibt stehen.
 *
 * Zwei Bilder, ein Gesetz: **der Weg nimmt dem Boden das Gruen, er gibt ihm
 * kaum Licht.** Wer stattdessen hell aufdreht, malt einen Scheinwerferkegel.
 *
 * Weitere angesehene Bilder: `landschaft_sumeru_wiese_see_tag_2560.png`
 * (der sandige Uferstreifen — dieselbe Farbrichtung, Rand ebenso schmal),
 * `landschaft_sumeru_dorf_tag_2560.png` (gepflasterter Platz: die Fugen sind
 * ±3 %, keine Zeichnung — Boeden tragen in Genshin sehr wenig Detail) und
 * `goldene_stunde_grasland_2560.png` (Gegenprobe: dort gibt es keinen Weg,
 * und die Wiese bleibt trotzdem lesbar — ein Weg ist ein Mittel, kein Muss).
 *
 * Aus dem Mondstadt-Bild ausserdem die FORM, und die ist wichtiger als die
 * Farbe: die Wege dort sind nirgends gleich breit. Sie schwellen an und ab,
 * sie duennen auf halber Strecke aus, sie verschwinden ueber ein paar Meter
 * fast ganz und kommen wieder. Ein Band konstanter Breite sieht sofort nach
 * Klebeband aus. Deshalb unten die Breitenschwankung (±22 %) und die
 * Deckungsschwankung (0,54…1,0).
 *
 * ---------------------------------------------------------------------------
 * UEBERSETZUNG AUF UNSERE ARENA
 *
 * Unser Boden ist nicht gruen. `grafik/boden.js` faehrt Albedo
 * (0.770, 0.775, 0.690) und liefert im Bild rund RGB(172, 173, 150) — schon
 * ein warmes Hellgrau. "Gruen wegnehmen" geht da nicht. Uebersetzt wird
 * deshalb die VERHAELTNISZAHL, nicht der Farbwert:
 *
 *   Genshin  Weg / Gras : Leuchtdichte x 1,16, R/G steigt um 6 %, B/G faellt um 16 %
 *   hier     Weg / Boden: Albedo x (1.20, 1.11, 0.92)
 *                       = (0.924, 0.860, 0.635)
 *            -> Leuchtdichte x 1,12, R/G +8 %, B/G −17 %
 *
 * Das ergibt im Bild rund RGB(206, 192, 138) gegen RGB(172, 173, 150) Boden.
 * Verglichen mit Genshins (216, 204, 152) gegen (137, 193, 104): dieselbe
 * Richtung, dieselbe Groessenordnung.
 *
 * Gerechnet wird mit demselben Lichtmodell wie der Boden
 * (`halbraumLicht` + `ndl01` aus dem Baustein `halblambert`) und mit denselben
 * Lichtfarben aus `ctx.licht`. Damit folgt der Weg dem Tagesgang von selbst:
 * in `g-nacht` wird er mit dem Boden zusammen dunkel, statt als gemalter
 * Fleck stehenzubleiben.
 *
 * ---------------------------------------------------------------------------
 * KOSTEN (1600x900)
 *
 *   2 Stuecke (= 2 Bahnen), 62 m Gesamtlaenge, Abtastung 0,30 m
 *   -> 210 Rippen, 420 Punkte, 416 Dreiecke, EIN drawElements.
 *   Netzbau einmalig beim ersten Bild, Rest des Laufs nichts.
 *   Der Preis ist nicht die Geometrie, sondern die Fuellrate: ein
 *   alphagemischter Durchgang ueber die Bodenflaeche, die der Weg im Bild
 *   belegt (bei `g-fernsicht` rund 6 % des Bildes, bei einer Nahkamera
 *   hoechstens rund 25 %).
 *   Tragbar sind daher rund **12 Bahnen / 400 m Weg** — das waeren immer noch
 *   ein Zeichenaufruf und ~2700 Dreiecke, aber schon ein voller
 *   Bildschirmdurchgang an Ueberzeichnung. Alles darueber kostet Fuellrate,
 *   nicht Geometrie. Zwei Bahnen sind es, und mehr braucht diese Arena nicht:
 *   ein Wegenetz macht aus einer Testarena einen Stadtplan.
 * ========================================================================= */
(function () {

  /* karte.js fehlt oder ist aelter als dieser Vertrag — dann passiert nichts,
   * und zwar leise. Ein fehlender Ausstattungstyp darf keine Aufnahme kosten. */
  if (typeof KARTE === 'undefined' || !KARTE || typeof KARTE.typ !== 'function'
      || typeof KARTE.setzen !== 'function') return;
  /* Nur `baustein` wird hier, beim Laden, schon gebraucht — glsl.js legt es an.
   * `GRAFIK.programm` kommt erst mit renderer2.js und wird deshalb erst in
   * aufbau() angefasst. Wer hier auf `programm` prueft, schaltet sich selbst ab:
   * die Props werden VOR renderer2.js geladen. */
  if (typeof GRAFIK === 'undefined' || typeof GRAFIK.baustein !== 'function') return;

  /* =======================================================================
   * 1. Stellschrauben
   * ===================================================================== */

  const S = {
    /* Albedo des ausgetretenen Kerns. Herleitung siehe Kopf:
     * Boden-Albedo (0.770,0.775,0.690) x (1.20, 1.11, 0.92). */
    kern:  [0.960, 0.898, 0.700],
    /* Zweite Tonstufe: die halb ausgetretene Randzone. Genau in der Mitte
     * zwischen Kern und Boden — zwei bis drei Tonstufen je Oberflaeche,
     * kein stufenloser Verlauf (GRAFIK-MODULE.md §0). */
    saum:  [0.892, 0.856, 0.716],
    /* Lage der harten Kante zwischen beiden Tonstufen, als Anteil der halben
     * Breite. Die Kante selbst ist 8 % breit, also im Bild scharf. */
    stufeVon: 0.50, stufeBis: 0.58,

    /* Der dunkle Saum am Rand. Genshin kaschiert den Materialwechsel NICHT
     * durch Verblenden, sondern durch ein schmales dunkles Band darunter
     * (dieselbe Beobachtung wie das Kontaktband in boden.js). Gemessen:
     * Saumbreite / Wegbreite = 0,03 je Seite; hier 0,185 m auf 2,6 m = 0,036. */
    nahtVon: 0.012, nahtSpitze: 0.050, nahtBis: 0.150,   // Meter vom Rand
    nahtTiefe: 0.22,
    /* R faellt am staerksten, B am wenigsten — ein Kontaktschatten wird vom
     * Himmel beleuchtet. Gleiche Richtung wie boden.js. */
    nahtFarbe: [1.00, 0.92, 0.78],

    /* Weichzeichnung des Randes in Metern. 0,09 m sind bei der Fernsicht
     * (24 m Abstand, 40 px/m) rund 3,6 px — die an Genshin gemessenen 3,3 px. */
    kante: 0.11,

    /* Der Startkreis bleibt frei: unter dem Schleim und unter seinem
     * Kontaktschatten (Radius rund 1,6) liegt blanker Boden. */
    startVon: 2.8, startBis: 4.4,

    /* Abtastung der Mittellinie in Metern. Feiner braucht es nicht: die
     * Randunruhe hat ihre kuerzeste Welle bei 1,15 m. */
    schritt: 0.30,
    /* Hoehe ueber dem Boden. Gross genug gegen Tiefenflimmern bei 40 m,
     * klein genug, dass der Rand nirgends aufsteht. */
    hub: 0.02,

    /* Randunruhe. Zwei Wellen, je Seite eigene Zahlen — dadurch schwankt
     * nicht nur die Breite, sondern maeandert auch die Mitte. Der Deckel bei
     * 0,22 ist keine Kosmetik: mit ihm sind die Abstaende zu Fels und
     * Plateau unten nachgerechnet. */
    unruheLang: 2.40, unruheLangAmp: 0.15,
    unruheKurz: 0.78, unruheKurzAmp: 0.07,
    unruheDeckel: 0.22,

    /* Deckungsschwankung entlang der Bahn: der Weg duennt aus und kommt
     * wieder. Ohne das ist es ein Band, kein Weg. */
    deckWelle: 5.50, deckGrund: 0.80, deckHub: 0.20,
    lueckeWelle: 9.00, lueckeVon: 0.16, lueckeBis: 0.44,
    lueckeGrund: 0.52, lueckeHub: 0.48,
  };

  /* =======================================================================
   * 2. Deterministische Zahlen
   *
   * Formgleich mit karte.js: Math.imul ueberall, gefuettert ausschliesslich
   * mit ganzzahligen Schluesseln. Hier ist der Schluessel die auf 1/256
   * gerundete Bogenlaenge — damit haengt die Randunruhe an der Bahn und
   * nicht an einem Zaehler.
   * ===================================================================== */

  function h32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d);
    h ^= Math.imul(b | 0, 0x165667b1);
    h ^= Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 13;
    h = Math.imul(h, 0x297a2d39);
    return (h ^ (h >>> 16)) >>> 0;
  }
  const zahl = (a, b, c) => h32(a, b, c) * 2.3283064365386963e-10;

  /** Weiches Wertrauschen ueber t, Wellenlaenge 1. Ergebnis in [0,1). */
  function rausch(t, salz) {
    const i = Math.floor(t);
    let f = t - i;
    f = f * f * (3 - 2 * f);
    const a = zahl(i, salz, 0), b = zahl(i + 1, salz, 0);
    return a + (b - a) * f;
  }
  const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);
  function rampe(t, a, b) {
    if (a === b) return t < a ? 0 : 1;
    const u = klemm((t - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  }

  /* Catmull-Rom, gleichmaessig parametrisiert. Ein Wert je Aufruf, damit
   * Ort UND Breite mit derselben Kurve laufen und die Breite nicht springt,
   * wo die Bahn glatt ist. */
  function crom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1)
      + (-p0 + p2) * t
      + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
      + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  /* =======================================================================
   * 3. Die zwei Bahnen
   *
   * Jeder Knoten ist [x, z, halbeBreite]. Die halbe Breite wird mitgeglaettet,
   * die Bahn verengt sich also weich statt in Stufen.
   *
   * ZUR NACHRECHNUNG: der Rand einer Bahn liegt hoechstens bei
   * halbeBreite x 1,22 (Deckel der Randunruhe, siehe S.unruheDeckel).
   * ===================================================================== */

  /* --- Bahn 1: Startplatz -> enge Passage bei z = 14 ---------------------
   *
   * Sie liegt vollstaendig in der Gasse, die karte.js ohnehin von Bewuchs
   * freihaelt (x 0, z 7,5…20,5, Breite 5,6). Am Tor verengt sie sich auf
   * 0,72 halb = 1,44 m Breite — die Luecke zwischen den beiden Mauern ist
   * 1,8 m breit (|x| < 0,9), der Rand liegt also mit 0,72 x 1,22 = 0,88
   * gerade noch innerhalb. Das ist Absicht und der beste Teil der Bahn:
   * ein getretener Weg wird an einem Engpass schmal, und man sieht dem
   * Bild von weitem an, dass es dort hindurchgeht.
   *
   * Am Fels (-3, 11, r 1,1) laeuft sie vorbei, nicht hindurch:
   * Abstand Mitte-Fels 2,85, noetig 1,1 + 1,05x1,22 = 2,38. */
  const BAHN_TOR = [
    [ 0.15,   2.20, 1.15],
    [ 0.05,   5.00, 1.30],
    [-0.25,   8.20, 1.30],
    [-0.15,  11.20, 1.05],
    [ 0.00,  14.00, 0.72],   // das Tor
    [ 0.10,  16.80, 1.05],
    [ 0.35,  19.40, 1.20],
    [ 0.50,  21.40, 1.05],
  ];

  /* --- Bahn 2: Startplatz -> Schwelle des Friedhofs ----------------------
   *
   * Die gerade Diagonale (0,0) -> (-18,-18) ist versperrt: das Plateau
   * (-13/-12, 7x7, also x -16,5…-9,5 und z -15,5…-8,5) liegt genau darauf.
   * Die Bahn geht deshalb NOERDLICH daran vorbei und faellt dann westlich
   * davon nach Sueden ab. Zwei Engstellen, beide nachgerechnet:
   *
   *  a) Zwischen Fels (-7, -4, r 1,8) und der Nordflanke des Plateaus.
   *     Bei x = -7 liegt die Bahn auf z = -7,2; Abstand zur Felsmitte 3,21,
   *     noetig 1,8 + 0,97x1,22 = 2,98. Bei x = -9,5 (Ostkante des Plateaus)
   *     liegt sie auf z = -6,9, die Plateaukante bei z = -8,5, noetig sind
   *     1,00x1,22 = 1,22 -> 1,60 vorhanden.
   *     Die Bahn verengt sich dort auf 0,95…1,00 halb. Zweiter Engpass,
   *     zweite Verengung: dieselbe Erzaehlung wie am Tor.
   *
   *  b) Die Luecke im Findlingskranz des Friedhofs. karte.js laesst die
   *     Nordostseite offen, weil man dort aufwacht; die Luecke zwischen
   *     (-15,9/-15,0, r 0,90) und (-20,4/-14,8, r 0,88) ist 2,72 m breit,
   *     ihre Mitte liegt bei x = -18,16. Die Bahn liegt dort auf x = -18,1
   *     mit 0,95…0,98 halb: Abstand zu beiden Findlingen 2,28 bzw. 2,30,
   *     noetig je 0,90 + 1,19 = 2,09.
   *
   * Sie endet nicht in der Senke, sondern an ihrem Rand: die letzten 1,8 m
   * blendet sie aus. Das ist kein Rueckzieher, sondern der Entwurf von
   * karte.js §6.8 — die Senke selbst bleibt KAHL, und genau daran erkennt
   * man sie als betretenen Ort. Ein Weg, der bis ans Mal heranmalt, nimmt
   * der Leere ihre Wirkung. */
  const BAHN_FRIEDHOF = [
    [ -1.70,  -1.60, 1.15],
    [ -3.60,  -3.90, 1.32],
    [ -4.90,  -6.90, 1.10],
    [ -7.60,  -7.30, 0.95],   // Engstelle a: Fels im Ruecken, Plateau vorn
    [ -9.80,  -6.90, 1.00],
    [-12.60,  -6.30, 1.20],
    [-15.60,  -5.90, 1.25],
    [-18.40,  -7.20, 1.25],
    [-18.90, -10.40, 1.20],
    [-18.25, -13.40, 0.98],
    [-17.95, -15.90, 0.95],   // Engstelle b: Luecke im Findlingskranz
    [-17.95, -17.30, 1.00],
  ];

  KARTE.setzen('weg', {
    x: BAHN_TOR[0][0], z: BAHN_TOR[0][1],
    rolle: 'tor', knoten: BAHN_TOR, salz: 3101, ausblenden: 2.4,
  });
  KARTE.setzen('weg', {
    x: BAHN_FRIEDHOF[0][0], z: BAHN_FRIEDHOF[0][1],
    rolle: 'friedhof', knoten: BAHN_FRIEDHOF, salz: 3202, ausblenden: 1.8,
  });

  /* =======================================================================
   * 4. Netzbau
   *
   * Zwei Punkte je Rippe, nicht mehr. Die Feinheit steckt im Fragment, nicht
   * in der Geometrie — quer ueber das Band braucht es keine Stuetzstellen,
   * weil `quer` linear interpoliert und alle Uebergaenge Funktionen davon
   * sind. Das ist der billige Weg, denselben Rand ueberall pixelgenau zu
   * bekommen.
   *
   * Attribut 1 (`aWeg`) traegt drei Zahlen:
   *   x  quer, -1 am linken Rand, +1 am rechten
   *   y  Deckung 0…1 (Randabblendung, Enden, Ausduennung)
   *   z  halbe Breite an dieser Stelle in Metern
   * Aus x und z rechnet der Shader den Abstand zum Rand in Metern zurueck —
   * nur so bleibt der dunkle Saum ueberall gleich breit, auch dort, wo die
   * Bahn sich auf die Haelfte verengt.
   * ===================================================================== */

  const bodenF = (typeof bodenHoehe === 'function') ? bodenHoehe : () => 0;

  /** Mittellinie einer Bahn in Schritten von etwa S.schritt abtasten. */
  function mittellinie(knoten) {
    const n = knoten.length;
    const punkte = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = knoten[Math.max(0, i - 1)], p1 = knoten[i];
      const p2 = knoten[i + 1], p3 = knoten[Math.min(n - 1, i + 2)];
      const laenge = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const teile = Math.max(2, Math.ceil(laenge / S.schritt));
      const bis = (i === n - 2) ? teile : teile - 1;
      for (let k = 0; k <= bis; k++) {
        const t = k / teile;
        punkte.push([
          crom(p0[0], p1[0], p2[0], p3[0], t),
          crom(p0[1], p1[1], p2[1], p3[1], t),
          crom(p0[2], p1[2], p2[2], p3[2], t),
        ]);
      }
    }
    return punkte;
  }

  /** Aus einem Stueck (einer Bahn) Punkte, Attribute und Indizes bauen. */
  function bahnNetz(stueck, basis, pos, weg, idx) {
    const punkte = mittellinie(stueck.knoten);
    const salz = stueck.salz | 0;
    const ausblenden = stueck.ausblenden || 2.0;

    // Bogenlaenge
    const s = new Float64Array(punkte.length);
    for (let i = 1; i < punkte.length; i++) {
      s[i] = s[i - 1] + Math.hypot(punkte[i][0] - punkte[i - 1][0],
                                   punkte[i][1] - punkte[i - 1][1]);
    }
    const gesamt = s[punkte.length - 1];

    for (let i = 0; i < punkte.length; i++) {
      const p = punkte[i];
      const vor = punkte[Math.min(punkte.length - 1, i + 1)];
      const zur = punkte[Math.max(0, i - 1)];
      let tx = vor[0] - zur[0], tz = vor[1] - zur[1];
      const l = Math.hypot(tx, tz) || 1;
      tx /= l; tz /= l;
      const nx = -tz, nz = tx;                 // Normale in der Bodenebene

      // Randunruhe, je Seite eigene Zahlen -> Breite schwankt UND Mitte maeandert
      const unruhe = (seite) => {
        const a = rausch(s[i] / S.unruheLang, salz + seite * 17) * 2 - 1;
        const b = rausch(s[i] / S.unruheKurz, salz + seite * 17 + 5) * 2 - 1;
        return klemm(a * S.unruheLangAmp + b * S.unruheKurzAmp,
                     -S.unruheDeckel, S.unruheDeckel);
      };
      const halbL = p[2] * (1 + unruhe(0));
      const halbR = p[2] * (1 + unruhe(1));

      // Deckung: Startkreis frei, Enden ausgeblendet, dazwischen ausgeduennt
      const r = Math.hypot(p[0], p[1]);
      const grund = S.deckGrund + S.deckHub * rausch(s[i] / S.deckWelle, salz + 41);
      const luecke = S.lueckeGrund + S.lueckeHub
        * rampe(rausch(s[i] / S.lueckeWelle, salz + 43), S.lueckeVon, S.lueckeBis);
      const deck = rampe(r, S.startVon, S.startBis)
                 * rampe(gesamt - s[i], 0, ausblenden)
                 * grund * luecke;

      const y = bodenF(p[0], p[1]) + S.hub;
      const lx = p[0] - nx * halbL, lz = p[1] - nz * halbL;
      const rx = p[0] + nx * halbR, rz = p[1] + nz * halbR;

      pos.push(lx, y, lz, rx, y, rz);
      // halbe Breite je Punkt: die eigene Seite, damit (1-|quer|)*halb in
      // Metern stimmt, auch wenn beide Seiten verschieden weit aussen liegen
      weg.push(-1, deck, halbL, 1, deck, halbR);

      if (i > 0) {
        const a = basis + (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, c, b, b, c, d);
      }
    }
    return punkte.length * 2;
  }

  /* =======================================================================
   * 5. Shader
   * ===================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aWeg;   // quer, Deckung, halbe Breite
uniform mat4 uViewProj;
out vec3 vWeg;
out vec2 vWelt;
void main() {
  vWeg  = aWeg;
  vWelt = aPos.xz;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
${GRAFIK.baustein('halblambert')}

in vec3 vWeg;
in vec2 vWelt;

uniform vec3  uLichtRichtung;
uniform vec3  uSonne;
uniform vec3  uHimmelLicht;
uniform vec3  uBodenLicht;
uniform vec3  uDunst;
uniform vec3  uKern;
uniform vec3  uSaum;
uniform vec3  uNahtFarbe;
uniform float uNahtTiefe;
uniform float uNahtVon;
uniform float uNahtSpitze;
uniform float uNahtBis;
uniform float uStufeVon;
uniform float uStufeBis;
uniform float uKante;
uniform float uBound;
uniform float uDunstStart;

out vec4 outColor;

void main() {
  float quer = abs(vWeg.x);
  float deck = vWeg.y;
  float halb = max(vWeg.z, 0.02);

  /* Abstand zum Rand in METERN. Ueber diese Groesse laufen Rand und Saum,
   * nicht ueber den Anteil — sonst waere der dunkle Saum an der Engstelle
   * halb so breit wie im Freien, und genau das faellt auf. */
  float rand = (1.0 - quer) * halb;

  /* Weicher Rand, aber nie schmaler als etwa ein Pixel: sonst flimmert die
   * Kante bei der Fernsicht, und wir haben keine zeitliche Kantenglaettung,
   * mit der sich das zudecken liesse.
   *
   * Der Faktor ist bewusst klein. fwidth ist die Summe beider
   * Bildschirmableitungen, und dort, wo die Bahn quer durchs Bild laeuft und
   * stark verkuerzt ist, wird sie gross. Mit dem urspruenglichen Faktor 1,5
   * verschmierte genau dort der ganze Rand samt dunklem Saum ueber ein
   * Zehntel der Bahnbreite — gemessen an g-bodenlicht, Zeile 470. */
  float weich = max(uKante, 0.75 * fwidth(rand));
  float a = smoothstep(0.0, weich, rand) * deck;
  if (a <= 0.004) discard;

  /* Zwei Tonstufen mit harter Kante dazwischen — kein stufenloser Verlauf. */
  vec3 albedo = mix(uKern, uSaum, smoothstep(uStufeVon, uStufeBis, quer));

  /* Der dunkle Saum unter der Kante. Gemessen an Genshin: der
   * Materialwechsel wird nicht verblendet, sondern von einem schmalen
   * dunklen Band getragen. */
  float naht = smoothstep(uNahtVon, uNahtSpitze, rand)
             * (1.0 - smoothstep(uNahtSpitze, uNahtBis, rand));
  albedo *= 1.0 - naht * uNahtTiefe * uNahtFarbe;

  /* Dasselbe Lichtmodell wie der Boden, dieselben Lichtfarben aus ctx.licht.
   * Der Weg ist eine Faerbung des Bodens und muss mit ihm hell und dunkel
   * werden — sonst steht er in g-nacht als gemalter Fleck da. */
  vec3 N = vec3(0.0, 1.0, 0.0);
  vec3 L = normalize(uLichtRichtung);
  vec3 col = albedo * (halbraumLicht(N, uHimmelLicht, uBodenLicht)
                       + uSonne * ndl01(N, L));

  /* Ferndunst nach demselben Gesetz wie boden.js. Ueber unsere Bahnen laeuft
   * er gegen null; er steht hier, damit keine Naht aufreisst, falls jemand
   * den Dunst spaeter naeher heranzieht. */
  if (uDunstStart > 0.0) {
    float d = smoothstep(uBound * uDunstStart, uBound * 2.2, length(vWelt));
    col = mix(col, uDunst, d);
  }

  outColor = vec4(col, a);
}`;

  /* =======================================================================
   * 6. Anmeldung
   * ===================================================================== */

  let P = null;        // Programm
  let netz = null;     // Mesh
  let gebaut = 0;      // Anzahl Stuecke, aus denen das Netz gebaut wurde
  let dreiecke = 0;

  KARTE.typ('weg', {
    /* Ganz unten in der Ausstattung: Buesche, Steine und Halme gehoeren
     * ueber den Weg, nicht darunter. */
    schicht: -100,

    aufbau(gl) {
      P = GRAFIK.programm(gl, VS, FS, 'weg (props)');
    },

    vorbereiten(gl, R, ctx, stuecke) {
      if (netz && gebaut === stuecke.length) return;

      const pos = [], weg = [], idx = [];
      let basis = 0;
      for (const st of stuecke) {
        if (!st.knoten || st.knoten.length < 2) continue;
        basis += bahnNetz(st, basis, pos, weg, idx);
      }
      if (!idx.length) return;

      netz = GRAFIK.mesh(gl, new Float32Array(pos), new Float32Array(weg),
                         new Uint16Array(idx));
      gebaut = stuecke.length;
      dreiecke = idx.length / 3;
      console.info('[weg] ' + gebaut + ' Bahn(en), ' + (pos.length / 3)
        + ' Punkte, ' + dreiecke + ' Dreiecke, 1 Zeichenaufruf.');
    },

    zeichnen(gl, R, ctx) {
      if (!P || !netz) return;
      const li = ctx.licht;
      const bound = (ctx.welt && ctx.welt.bounds) || 26;

      /* Laeuft irgendwann nebel.js, gehoert der Ferndunst dorthin — zwei
       * Nebelmodelle uebereinander ergaeben eine Doppelkante. Dieselbe
       * Abfrage macht boden.js. */
      let dunstStart = 1.0;
      if (typeof GRAFIK.module === 'function') {
        for (const m of GRAFIK.module()) if (!m.aus && m.name === 'nebel') dunstStart = 0;
      }

      gl.useProgram(P.p);
      gl.bindVertexArray(netz.vao);

      gl.uniformMatrix4fv(P.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(P.u.uLichtRichtung, li.richtung);
      gl.uniform3fv(P.u.uSonne, li.farbe);
      gl.uniform3fv(P.u.uHimmelLicht, li.himmel);
      gl.uniform3fv(P.u.uBodenLicht, li.boden);
      gl.uniform3fv(P.u.uDunst, li.dunst);
      gl.uniform3fv(P.u.uKern, S.kern);
      gl.uniform3fv(P.u.uSaum, S.saum);
      gl.uniform3fv(P.u.uNahtFarbe, S.nahtFarbe);
      gl.uniform1f(P.u.uNahtTiefe, S.nahtTiefe);
      gl.uniform1f(P.u.uNahtVon, S.nahtVon);
      gl.uniform1f(P.u.uNahtSpitze, S.nahtSpitze);
      gl.uniform1f(P.u.uNahtBis, S.nahtBis);
      gl.uniform1f(P.u.uStufeVon, S.stufeVon);
      gl.uniform1f(P.u.uStufeBis, S.stufeBis);
      gl.uniform1f(P.u.uKante, S.kante);
      gl.uniform1f(P.u.uBound, bound);
      gl.uniform1f(P.u.uDunstStart, dunstStart);

      /* Bodenzeichnung: Tiefe wird geprueft, aber nicht geschrieben. Damit
       * verdeckt jeder Halm und jeder Fels den Weg von selbst, und der Weg
       * verdeckt nichts. Rueckseiten sind erlaubt — das Band ist flach und
       * darf aus beiden Richtungen gesehen werden. */
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);

      gl.drawElements(gl.TRIANGLES, netz.count, netz.typ, 0);

      if (typeof R.grundzustand === 'function') R.grundzustand();
      gl.bindVertexArray(null);
    },
  });

  /* =======================================================================
   * 7. Auskunft fuer andere Module
   *
   * `WEG.auf(x, z)` liefert 0…1: wie stark liegt diese Stelle auf dem Weg.
   * Gedacht fuer `grafik/gras.js` und spaetere Ausstattungstypen — auf einem
   * getretenen Weg waechst kein Gras, und ein Buschel mitten auf der Bahn
   * macht aus dem Weg wieder eine Wiese. Die Funktion rechnet dieselbe
   * Mittellinie nach, die auch das Netz benutzt, und ist damit deckungsgleich
   * mit dem, was man sieht.
   *
   * Bewusst hier und nicht in karte.js: solange niemand fragt, kostet sie
   * nichts, und wer fragt, braucht keine Kenntnis von diesem Modul ausser
   * dem Namen.
   * ===================================================================== */

  const PROBEN = [];   // [x, z, halbeBreite] entlang beider Bahnen, grob
  (function probenBauen() {
    for (const knoten of [BAHN_TOR, BAHN_FRIEDHOF]) {
      const punkte = mittellinie(knoten);
      for (let i = 0; i < punkte.length; i += 2) PROBEN.push(punkte[i]);
    }
  })();

  const WEG = {
    /** 0 = neben dem Weg, 1 = mitten drauf. `saum` weitet die Abfrage. */
    auf(x, z, saum) {
      const extra = saum || 0;
      let best = 0;
      for (let i = 0; i < PROBEN.length; i++) {
        const p = PROBEN[i];
        const dx = x - p[0], dz = z - p[1];
        const halb = p[2] * (1 + S.unruheDeckel) + extra;
        const d2 = dx * dx + dz * dz;
        if (d2 >= halb * halb) continue;
        const v = 1 - rampe(Math.sqrt(d2), halb * 0.55, halb);
        if (v > best) { best = v; if (best >= 0.999) return 1; }
      }
      // Im Startkreis gibt es keinen Weg — dieselbe Rampe wie im Netz.
      return best * rampe(Math.hypot(x, z), S.startVon, S.startBis);
    },
    bahnen: [BAHN_TOR, BAHN_FRIEDHOF],
  };
  if (typeof window !== 'undefined') window.WEG = WEG;

})();
