'use strict';
/* ---------------------------------------------------------------------------
 * SLIMORIA — Phase Grafik, Lane SCHLEIM
 * wachstum.js — damit Wachstum wie Wachstum aussieht und nicht wie ein Zoom.
 *
 * Nur aktiv im zweiten Renderpfad (?renderer=2). `client/renderer.js` bleibt
 * unberuehrt — dort laufen die Blindvergleiche.
 *
 * ===========================================================================
 * 0. Was dieses Modul NICHT tut
 * ===========================================================================
 * Es aendert die Groesse nicht. Die sichtbare Groesse kommt ausschliesslich vom
 * Level (GDD 01 §29, §45–48), gerechnet in `tuning.js:radiusFuerLevel()` und
 * abgelegt in `PARAMS.radius`. Dieses Modul LIEST diesen Wert und sonst nichts.
 *
 * ===========================================================================
 * 1. Der Befund — warum Wachstum heute wie eine Skalierung aussieht
 * ===========================================================================
 * Aufnahme `wachstum` mit `--renderer 2`, Level 1 bis 27 bei fester Kamera.
 * Waagerechter Schnitt durch die Koerpermitte, Rohwerte:
 *
 *   Level  1 (Bild #0, Zeile 480, Koerperbreite 158 px)
 *     Kernplateau  RGB(28, 67,166)  Luma 65.5  Saettigung 0.833
 *   Level 27 (Bild #9, Zeile 430, Koerperbreite 274 px)
 *     Kernplateau  RGB(29, 67,165)  Luma 66.5  Saettigung 0.827
 *
 * Das Material ist bei 1.73-facher Bildbreite auf einen Digit genau dasselbe.
 * Der Grund steht in `gel.js` und ist kein Versehen, sondern eine Normierung:
 *
 *     dRel = dicke / uRadius;   T = exp(-dRel * uDichte * uAbsorb);
 *
 * `dicke` ist die gemessene Weglaenge in Metern, aber sie wird durch den
 * Radius geteilt. Damit ist die optische Tiefe eine reine FORMgroesse und
 * haengt nicht mehr an der GROESSE. Ein doppelt so grosser Koerper hat doppelt
 * so viel Masse im Strahl und sieht trotzdem identisch aus. Genau das liest
 * das Auge als „dasselbe Bild, nur groesser".
 *
 * ===========================================================================
 * 2. Was am Referenzmaterial gemessen wurde
 * ===========================================================================
 * Gesucht war ein Paar gleichen Materials bei stark verschiedener Bildgroesse
 * in derselben Beleuchtung. Gemessen mit einem Zeilenschnitt (Rohpixel), nicht
 * geschaetzt.
 *
 * (a) `ref/blob-jelly/slime-rancher-2-presskit-01.png`, zwei blaue Koerper
 *     derselben Art, Zeile 1780 bzw. 1440:
 *
 *              Bildbreite   Kern-RGB        Kernluma  Kernsaett.  hellste Stelle
 *      klein      244 px    (104, 99,255)     111.3      0.61        213.9
 *      gross      456 px    ( 59, 54,241)      68.4      0.775       200.2
 *      Faktor     1.87 x                       0.61      +0.165      0.94
 *
 *     Innenkontrast (hellste Stelle / Kernplateau): 1.92 klein, 2.93 gross.
 *     Die 2.9 : 1 des grossen Koerpers sind genau die Zahl, die
 *     `ref/slime/DOSSIER.md` §7 als „Kontrast hell zu dunkel 2.9 : 1" fuehrt —
 *     gemessen dort ebenfalls an einem bildfuellenden, also GROSSEN Koerper.
 *
 * (b) `ref/slime/sr1-rest-cone-vs-flattened.jpg`, zwei gruene Koerper,
 *     Zeile 686 bzw. 583:
 *
 *              Bildbreite   Kern-RGB      Kernluma  Kernsaett.
 *      klein      123 px    (19,166, 23)    126.0      0.886
 *      gross      282 px    (21,111, 11)     84.6      0.905
 *      Faktor     2.29 x                     0.67      +0.019
 *
 * Beide Paare sagen dasselbe: MIT DER BILDGROESSE FAELLT DER KERN UND STEIGT
 * DIE SAETTIGUNG. Das ist keine Stilentscheidung, sondern Beer-Lambert auf
 * einer laengeren Strecke — und es ist genau der Term, den die Normierung
 * oben wegkuerzt.
 *
 * Vorsicht bei der Uebernahme, ehrlich benannt: beide Paare stehen im selben
 * Bild, aber in verschiedener ENTFERNUNG, nicht in verschiedener echter
 * Groesse (Slime Rancher hat nur eine Koerpergroesse je Art). Belastbar ist
 * daraus die RICHTUNG und die Groessenordnung, nicht die dritte Stelle.
 * Deshalb wird der Exponent unten bewusst milder gefahren als die Messung
 * hergibt — dazu §4.
 *
 * (c) Kanalweise, und das ist der eigentliche Befund:
 *     gross/klein je Kanal (a) = R 0.57 · G 0.55 · B 0.95.
 *     Der Kanal, den das Material am staerksten SCHLUCKT, faellt am
 *     staerksten; der am wenigsten geschluckte bleibt praktisch stehen.
 *     Damit wird der Kern nicht einfach dunkler, sondern TIEFER — die Farbe
 *     bleibt satt (GRAFIK-MODULE §0: „satt und hell, Schatten farbig statt
 *     grau"). Ein neutraler Abdunkler traefe die Messung nicht.
 *
 * (d) Glanzfleck, Anteil an der Koerperbreite, vier Messungen:
 *     0.075 · 0.081 · 0.090 · 0.090 (DOSSIER §7: 8–10 %).
 *     Der Fleck bleibt ANTEILIG gleich gross. „Traeger" heisst also
 *     ausdruecklich NICHT „kleiner", sondern stumpfer: die Saettigung des
 *     grossen Koerpers steigt (0.61 -> 0.775), das heisst, es liegt WENIGER
 *     Weiss auf ihm. Ein grosser Koerper glaenzt matter, nicht schmaler.
 *
 * ===========================================================================
 * 3. Wie das gebaut ist — drei Griffe, kein einziger Shader
 * ===========================================================================
 * Das Material gehoert `gel.js`. Dieses Modul fasst es nicht an, es benutzt
 * den dort veroeffentlichten Wunschzettel (`R.gel.wunsch`, gueltig genau ein
 * Bild, laut gel.js von Modulen mit Ordnung < 60 zu setzen). Ordnung 51:
 * frueh genug fuer den Wunschzettel, spaet genug, um nach den Bodendekalen
 * (Grundzug 50) und vor der Gelrueckwand (58) zu zeichnen.
 *
 * (I) TIEFERE FARBE IM KERN — `wunsch.tonung`, kanalweise
 *
 *       tonung[c] = exp( -tiefe * ln(g) * (absorb[c] - min(absorb)) )
 *
 *     `g` ist die Groesse gegen Level 1, `absorb` der Extinktionsvektor der
 *     Fraktion aus `R.gel.farbe.absorb`. Der am wenigsten geschluckte Kanal
 *     steht per Konstruktion EXAKT still (Differenz null) — damit kann der
 *     Koerper nicht ins Graue kippen, egal wie gross er wird. Bei Eldoran
 *     (absorb 1.81/0.84/0.35) faellt Rot am staerksten und Blau gar nicht,
 *     bei Ravok (0.33/1.19/1.48) spiegelbildlich Blau am staerksten und Rot
 *     gar nicht. Die Fraktionsfarbe wird also tiefer, nie fremd.
 *
 *     Warum ueber `ln(g)` und nicht linear: der Term ersetzt eine Exponential-
 *     schwaechung ueber eine Strecke, die proportional zu g waechst. exp(-k·g)
 *     waere bei g=2.35 (Level 80) am Anschlag. exp(-k·ln g) = g^-k faellt
 *     langsamer und bleibt bis Level 80 im Bild.
 *
 * (II) MEHR MASSE IM STRAHL — `wunsch.dichteMul = g`
 *
 *     Das ist die Umkehrung der Normierung aus §1: `uDichte` traegt die
 *     Extinktion PRO RADIUSLAENGE, `dRel` ist in Radiuslaengen. Multipliziert
 *     man `uDichte` mit g, steht in `exp(-dRel · uDichte · uAbsorb)` wieder
 *     die absolute Weglaenge in Metern. Das ist kein Effekt, das ist das
 *     Materialgesetz, das `gel.js` selbst in seinem Kopfkommentar §2 nennt
 *     („Die Weglaenge ist damit eine echte Groesse in Weltmetern").
 *
 *     Der Griff wirkt UNGLEICH ueber die Dicke, und das ist genau erwuenscht:
 *     `deckung = 1 - dot(T, LUMA)` steht im Kern schon bei 0.93 und kann kaum
 *     noch steigen (+5 % bei g=1.6), an der duennen Flanke steht sie bei 0.27
 *     und steigt um 45 %. Also: der Kern wird von (I) tief, die Flanke wird
 *     von (II) wieder aufgefangen. Zusammen ergibt das die gemessene Signatur
 *     aus §2 — Kern faellt deutlich, hellste Stelle bleibt fast stehen —,
 *     die eine blosse Abdunklung nicht liefern kann.
 *
 *     Und die Silhouette bleibt damit stehen. Das ist keine Nebensache:
 *     GRAFIK-MODULE §0 sagt, die Silhouette traegt die Lesbarkeit, und der
 *     Fresnel-Rand in `gel.js` haengt an `uKlar`, also an der Tonung. Ohne
 *     (II) wuerde (I) den Rand mit abdunkeln und den grossen Koerper
 *     schlechter lesbar machen als den kleinen — das Gegenteil des Auftrags.
 *
 * (III) BREITERE AUFLAGE — ein einziges Bodenzeichen, Ordnung 51
 *
 *     Zwei fremde Dateien zeichnen am Boden bereits mit, und beide tun es
 *     STRENG PROPORTIONAL zur Koerpergroesse — also wieder „dasselbe Bild,
 *     nur groesser":
 *       - Grundzug `dekale` (50): drei gestapelte Schattendekale, Radien
 *         1.75 / 1.05 / 0.60 mal `bodySpread`.
 *       - `schleim/kontakt.js` (55): der Kontaktsaum mit Meniskus, Breite
 *         `P.breite = 0.45` mal dem gemessenen Auflageradius.
 *     Beide gehoeren nicht dieser Lane, und der Kontaktsaum ist dort mit
 *     eigenen Messungen sauber gebaut. Er wird hier NICHT nachgebaut.
 *
 *     Was fehlt, ist nicht die Kontaktzone, sondern das GEWICHT darauf: der
 *     Boden gibt unter mehr Masse ueber eine groessere Flaeche nach als die
 *     blosse Skalierung hergibt. Dafuer genau EIN weiches Dekal, dessen
 *     Radius ueberproportional waechst:
 *
 *       Radius = spread · (1 + lastWeite · s),   s = min(g - 1, deckel)
 *
 *     Es liegt bei Ordnung 51 unter dem Kontaktsaum (55), der multiplikativ
 *     darueber laeuft — der Saum bleibt also die scharfe Kante, dieses Dekal
 *     nur der breitere Grund darunter.
 *
 *     ERSTER VERSUCH, VERWORFEN: zusaetzlich ein Ringdekal
 *     (`drawDecal(..., ring = true)`) als Drucksaum, hergeleitet aus
 *     PHASE-GRAFIK-PLAN G6 (Genshin kaschiert Materialkanten mit einem
 *     schmalen dunklen Band). Auf dem Kontaktbogen `wachstum-v1` sah das
 *     nicht nach Kontaktband aus, sondern nach einer Unterlegscheibe: eine
 *     geschlossene graue Ellipse mit zwei eigenen Kanten rings um den
 *     Koerper, die als eigener Gegenstand las. Zwei Gruende, beide
 *     nachtraeglich offensichtlich — das Band lag zum Teil FREI neben dem
 *     Koerper statt unter seiner Kante, und `kontakt.js` zeichnet an
 *     derselben Stelle bereits ein zweistufiges Band. Rausgeworfen statt
 *     nachgeregelt (§0: wenige grosse Elemente).
 *
 * ===========================================================================
 * 4. Warum die Exponenten milder sind als die Messung
 * ===========================================================================
 * §2 (a) gibt fuer 1.87-fache Bildbreite Kernluma x0.61, also einen Exponenten
 * von ln(0.61)/ln(1.87) = -0.79. Unser Kern liegt bei Level 1 aber schon auf
 * Luma 65.5 — das ist bereits das NIEDRIGE Ende des Referenzpaars (klein 111,
 * gross 68). Wer den vollen Referenzfaktor auf einen Ausgangswert anwendet,
 * der schon am Zielwert steht, landet bei Luma 45 und damit ausserhalb des
 * gesamten gemessenen Bereichs — ein Loch statt eines Koerpers, und §0 will
 * satt und hell. `tiefe` ist deshalb so gewaehlt, dass Level 27 den Kern auf
 * rund drei Viertel bringt statt auf zwei Drittel. Die Richtung ist die
 * gemessene, der Betrag ist bewusst darunter. Erreicht sind 0.76 — die Zahlen
 * stehen in §7.
 *
 * ===========================================================================
 * 5. Die Sicherheitseigenschaft: bei Level 1 passiert NICHTS
 * ===========================================================================
 * Alle vier Groessen haengen an `g` bzw. `s = g - 1` und sind bei g = 1
 * identitaetsgleich: tonung (1,1,1), dichteMul 1, glanzFaktor 1, das
 * Bodenzeichen Alpha 0. Damit sind `wabbeln`, `umschlingung`, `aufprall`,
 * `tod`, `absorption` und alle Grafik-Szenarien — die alle auf Level 1 laufen
 * — Pixel fuer Pixel unveraendert. Ein Modul, das die Groessenabhaengigkeit
 * baut, darf die Groessenunabhaengigkeit nicht nebenbei mitnehmen.
 *
 * ===========================================================================
 * 6. Was hier NICHT geht, und warum — der Glanz
 * ===========================================================================
 * Zum Auftrag gehoert ein „traegeres Glanzlicht". Der Glanzfleck ist heute
 * NICHT IM BILD, und zwar in keiner Groesse. Nachweis, Rohdaten aus der
 * Aufnahme `wachstum-vorher`, Bild #9: drei Zeilenschnitte (y = 350, 380, 410)
 * quer durch den Koerper laufen vom Rand zur Mitte streng monoton, ohne ein
 * einziges lokales Maximum, und die Saettigung bleibt ueber die ganze Flaeche
 * bei 0.82–0.84. Ein Fleck nach DOSSIER §7 muesste dort auf 0.29 einbrechen.
 *
 * Ursache, gelesen in fremdem Code, nicht vermutet: `schleim/glanz.js` meldet
 * bei Ordnung 55 `gel.wunsch.glanzMul = 0` an, damit der Behelfsglanz des
 * Materialkerns zur Seite geht — richtig so. Beim Zeichnen (Ordnung 70) leitet
 * dieselbe Datei ihre eigene Staerke aber aus genau diesem Wert ab:
 *
 *     const totFaktor = ... Math.min(gel.glanzStaerke / gel.regler.glanzStaerke, 1)
 *     ... gl.uniform1f(u.uStaerke, P.staerke * totFaktor);
 *
 * `gel.glanzStaerke` ist nach dem eigenen Wunsch 0, also ist `totFaktor` 0 und
 * damit `uStaerke` 0. Das Modul schaltet sein eigenes Glanzlicht ab. Gemeint
 * war ersichtlich der Todeszustand (`TOT.glanz`), nicht der eigene Wunsch.
 * Gemeldet als BRAUCHT_FREMDAENDERUNG; `glanz.js` gehoert nicht dieser Lane.
 *
 * Was dieses Modul dafuer trotzdem bereitstellt:
 *   - `wunsch.glanzMul` wird mit `glanzFaktor = g^-glanzExp` MULTIPLIZIERT
 *     (nicht gesetzt). Solange `glanz.js` bei Ordnung 55 auf 0 stellt, ist das
 *     folgenlos; faellt `glanz.js` aus, greift der Faktor sofort auf den
 *     Behelfsglanz des Materialkerns.
 *   - `R.wachstum.glanzFaktor` steht als Zahl bereit. Wer den Fleck zeichnet,
 *     multipliziert seine Staerke damit und hat die Groessenabhaengigkeit,
 *     ohne sie ein zweites Mal herzuleiten.
 * Sichtbar wird davon heute nur, was ueber `uKlar` laeuft: der Fresnel-Rand
 * und die streifende Himmelsspiegelung werden mit (I) tiefer und mit (II)
 * wieder aufgefangen — der grosse Koerper wirkt matter statt glasiger. Das
 * ist die halbe Miete, nicht die ganze, und im Bericht steht es genauso.
 *
 * ===========================================================================
 * 7. Was damit erreicht ist — gemessen, nicht behauptet
 * ===========================================================================
 * Aufnahme `wachstum-v4`, `--renderer 2`, jeweils Bild #0 (Level 1) gegen
 * Bild #9 (Level 27) DERSELBEN Aufnahme. Nur so ist der Vergleich sauber:
 * an den Nachbarmodulen dieser Lane wird parallel gearbeitet, ein Vergleich
 * ueber zwei Aufnahmen hinweg misst deren Arbeit mit.
 *
 *                                    Level 1     Level 27    Faktor
 *   Koerperbreite im Bild             163 px      271 px      1.66
 *   Kernplateau, Luma                  49.5        37.6       0.76
 *   Kernplateau, RGB              (23,50,118)  (21,37,95)
 *     kanalweise, ohne Schwarzhub                             R 0.50
 *                                                             G 0.57
 *                                                             B 0.77
 *   Saettigung Kern (ohne Hub)         0.977       0.986      steigt
 *   Randspitze, Luma                  160.1       122.2       0.76
 *   Randflanke, Anteil Breite         18.4 %      17.3 %      0.94
 *   Bodenzone, Anteil Breite          0.687       0.904       1.32
 *   dunkelster Bodenwert /
 *     freier Boden                     0.566       0.446      0.79
 *
 * Vorher (Aufnahme `wachstum-vorher`, gleiche Messung): Kernplateau Luma
 * 65.5 gegen 66.5, RGB (28,67,166) gegen (29,67,165) — Faktor 1.02 und
 * damit auf einen Digit dasselbe Material. Genau das ist behoben.
 *
 * EHRLICH DAZU, WAS NICHT ERREICHT IST: das Referenzpaar aus §2 (a) hat
 * neben dem fallenden Kern auch eine steigende INNENSPREIZUNG (hellste
 * Stelle durch Kernplateau: 1.92 klein gegen 2.93 gross). Hier steht sie bei
 * 3.23 gegen 3.24, also unveraendert — Rand und Kern fallen um denselben
 * Faktor 0.76. Der Grund ist benennbar: `wunsch.tonung` ist EIN Vektor auf
 * `klar`, `kern` und `tief` zugleich (gel.js), es gibt von aussen keinen
 * Griff, der nur die duenne Zone anhebt; `dichteMul` haette das leisten
 * sollen (+45 % `deckung` an der Flanke gegen +5 % im Kern), aber nach der
 * Schulter und dem Schwarzhub aus `post.js` bleibt davon zu wenig uebrig.
 * Wer die Spreizung wirklich will, braucht in `gel.js` getrennte Faktoren
 * fuer `klar` und `tief` — das ist eine Aenderung dort, keine hier.
 *
 * ===========================================================================
 * Determinismus (ARCHITEKTUR §2 / GRAFIK-MODULE §4): kein Math.random, kein
 * Date, kein performance.now, kein Zustand ueber Bildgrenzen. Alles ist eine
 * reine Funktion von `ctx.params.radius` und der Huelle dieses Bildes.
 * ------------------------------------------------------------------------- */

(function () {

  const G = (typeof GRAFIK !== 'undefined' && GRAFIK) ? GRAFIK : (window.GRAFIK = {});
  if (!G.module) G.module = [];
  if (!G.modul) G.modul = function (m) { G.module.push(m); return m; };

  /* =====================================================================
   * Stellschrauben
   *
   * Die Zahlen sind aus §2 und §4 hergeleitet, nicht gewaehlt: `tiefe`
   * setzt den Kernabfall, `dichteExp` 1.0 ist das Materialgesetz selbst
   * (Weglaenge in Metern), `glanzExp` folgt der gemessenen Saettigungs-
   * zunahme des grossen Koerpers.
   * =================================================================== */
  const P = {
    /* Kanalweise Vertiefung. Exponent auf ln(g); siehe §3 (I) und §4. */
    tiefe: 1.60,
    /* Extinktion pro Meter statt pro Radiuslaenge. 1.0 = exakt Beer-Lambert;
     * darunter waere die Normierung nur halb aufgehoben. */
    dichteExp: 1.00,
    /* Matterer Glanz auf grosser Masse. Siehe §2 (d) und §6. */
    glanzExp: 0.50,
    /* Auflage: Ueberbreite und Deckkraft des weichen Lastschattens.
     *
     * Beide Zahlen sind zweimal nachgezogen worden, und beide Male sagte die
     * Messung, warum. `drawDecal` faellt mit `pow(1 - d, 1.6)` ab, hat sein
     * Gewicht also in der MITTE — und die Mitte liegt unter dem Koerper und
     * ist unsichtbar. Sichtbar ist nur die Sichel davor, und die sitzt bei
     * d = 0.7 .. 1.0, wo dieselbe Funktion nur noch 15 % bis 0 % liefert.
     *   lastAlpha 0.22 -> Bogen v2: die Bodenzone wuchs von 14.1 % auf
     *     15.0 % der Koerperbreite. Nicht ablesbar.
     *   lastAlpha 0.34 -> Bogen v3: die Sichel dunkelte um rund 5 Stufen
     *     gegen freien Boden. Immer noch an der Wahrnehmungsschwelle.
     * Gerechnet fuer 10 Stufen an der Sichelinnenkante: A · 0.3^1.6 = 0.056,
     * also A = 0.38 — bei s = 0.606 (Level 27) heisst das lastAlpha 0.60.
     * Der Deckel darauf verhindert, dass Level 80 (s = 1.35) daraus einen
     * schwarzen Teller macht. */
    lastWeite: 0.70,
    lastAlpha: 0.60,
    lastDeckel: 0.45,
    /* Deckel auf den Ueberschuss s = g - 1. Level 80 liegt bei g = 2.35,
     * also s = 1.35; der Deckel greift erst darueber. */
    deckel: 1.50,
  };

  /* Farbe des Lastschattens. Warm und dunkel, nicht neutral —
   * GRAFIK-MODULE §0: „Schatten farbig statt grau". Der Schattenstapel im
   * Grundzug `dekale` liegt bei (0.06,0.07,0.09), also kuehl; hier steht ein
   * waermerer Ton, damit die zusaetzliche Flaeche sich als Boden liest und
   * nicht als vierter Schatten. */
  const LAST = [0.090, 0.075, 0.062];

  /* Ruheradius auf Level 1. `tuning.js` legt `radiusFuerLevel` ans Fenster;
   * fehlt es, ist BASIS_RADIUS dort 1.0 und hier ebenso. */
  function basisRadius() {
    const f = (typeof window !== 'undefined') && window.radiusFuerLevel;
    const r = (typeof f === 'function') ? f(1) : 1;
    return (r > 1e-6) ? r : 1;
  }

  const klemm = (v, a, b) => (v < a ? a : (v > b ? b : v));

  /* Fussabdruck und tiefster Punkt der TATSAECHLICHEN Huelle — nicht aus
   * PARAMS abgeleitet. Nur so folgt die Auflage der Verformung: beim
   * Aufprall wird sie breit, im Sprung loest sie sich. */
  function auflageMessen(ctx) {
    const b = ctx.slime && ctx.slime.body;
    if (!b) return null;
    const pos = ctx.surface && ctx.surface.positions;
    if (!pos || pos.length < 9) {
      const r = (ctx.params && ctx.params.radius) || 1;
      return { spread: r, unten: b.cy - r };
    }
    let spread = 0, unten = Infinity;
    for (let i = 0; i + 2 < pos.length; i += 3) {
      const dx = pos[i] - b.cx, dz = pos[i + 2] - b.cz;
      const d = dx * dx + dz * dz;
      if (d > spread) spread = d;
      if (pos[i + 1] < unten) unten = pos[i + 1];
    }
    return { spread: Math.sqrt(spread), unten: unten };
  }

  /* =====================================================================
   * Das Modul
   * =================================================================== */
  G.modul({
    name: 'wachstum',
    ordnung: 51,

    regler: [
      { key: 'tiefe', min: 0.0, max: 3.5, step: 0.05, wert: P.tiefe },
      { key: 'dichteExp', min: 0.0, max: 1.5, step: 0.05, wert: P.dichteExp },
      { key: 'glanzExp', min: 0.0, max: 1.5, step: 0.05, wert: P.glanzExp },
      { key: 'lastWeite', min: 0.0, max: 1.5, step: 0.02, wert: P.lastWeite },
      { key: 'lastAlpha', min: 0.0, max: 1.2, step: 0.01, wert: P.lastAlpha },
      { key: 'lastDeckel', min: 0.0, max: 0.9, step: 0.01, wert: P.lastDeckel },
      { key: 'deckel', min: 0.2, max: 3.0, step: 0.05, wert: P.deckel },
    ],

    /* Kein `aufbau`: dieses Modul uebersetzt kein Programm und legt keinen
     * Puffer an. Es rechnet drei Zahlen und benutzt `R.drawDecal`. Damit
     * kann es im Aufbau auch nicht scheitern. */

    /* ----------------------------------------------------------------- */
    vorbereiten(gl, R, ctx) {
      /* Reglervorgaben uebernehmen, falls das Tuning-Panel sie verstellt
       * hat — gleiche Handhabung wie in glanz.js. */
      const w = this.wert;
      if (w) for (const k in P) if (w[k] !== undefined) P[k] = w[k];

      const radius = (ctx.params && ctx.params.radius) || 0;
      const g = Math.max(radius / basisRadius(), 1);
      const s = klemm(g - 1, 0, P.deckel);
      const lg = Math.log(g);

      const glanzFaktor = Math.exp(-P.glanzExp * lg);   // = g^-glanzExp
      const dichteMul = Math.exp(P.dichteExp * lg);     // = g^ dichteExp

      /* Kanalweise Vertiefung aus dem Extinktionsvektor der Fraktion.
       * Fehlt `gel.js`, gibt es nichts zu tonen — dann bleibt nur die
       * Auflage, und das ist richtig so: dieses Modul ist kein Ersatz. */
      const gel = R.gel || G.gel;
      let tonung = null;
      if (gel && gel.farbe && gel.farbe.absorb && lg > 1e-6) {
        const a = gel.farbe.absorb;
        const aMin = Math.min(a[0], a[1], a[2]);
        const k = P.tiefe * lg;
        tonung = [
          Math.exp(-k * (a[0] - aMin)),
          Math.exp(-k * (a[1] - aMin)),
          Math.exp(-k * (a[2] - aMin)),
        ];
      }

      /* In den Wunschzettel MULTIPLIZIEREN, nicht setzen. Der Zettel gehoert
       * allen Modulen mit Ordnung < 60 gemeinsam; wer ihn ueberschreibt,
       * loescht den Wunsch eines anderen (bei Ordnung 51 waere das jedes
       * Modul unter 51). */
      /* Bei Level 1 wird der Zettel GAR NICHT angefasst. Rechnerisch waere
       * `*= 1` ohnehin die Identitaet, aber so steht die Zusage aus §5 als
       * Programmzeile da und nicht nur als Rechnung, die jemand nachpruefen
       * muesste. */
      if (gel && gel.wunsch && lg > 1e-9) {
        const wu = gel.wunsch;
        wu.dichteMul *= dichteMul;
        wu.glanzMul *= glanzFaktor;
        if (tonung) {
          if (wu.tonung) {
            wu.tonung = [wu.tonung[0] * tonung[0],
                         wu.tonung[1] * tonung[1],
                         wu.tonung[2] * tonung[2]];
          } else {
            wu.tonung = tonung;
          }
        }
      }

      /* Auflage vermessen. `kontakt` loest die Bodenzeichen, sobald der
       * Koerper abhebt — ein Drucksaum unter einem springenden Schleim
       * behauptet ein Gewicht, das gerade nicht auf dem Boden steht. */
      const mass = auflageMessen(ctx);
      const kontakt = mass
        ? klemm(1 - mass.unten / Math.max(0.45 * (radius || 1), 1e-3), 0, 1)
        : 0;

      /* Oeffentliche Schnittstelle. Wer die Groesse fuer eine eigene
       * Eigenschaft braucht (Schrittstaub, Stimmhoehe, Trefferwucht),
       * nimmt diese Zahlen, statt die Kurve ein zweites Mal zu bauen. */
      const api = R.wachstum || (R.wachstum = {});
      api.groesse = g;             // 1.00 auf Level 1, 1.61 auf 27, 2.35 auf 80
      api.ueberschuss = s;         // g - 1, gedeckelt
      api.tonung = tonung;         // kanalweise Vertiefung, oder null
      api.dichteMul = dichteMul;   // Extinktion pro Meter statt pro Radius
      api.glanzFaktor = glanzFaktor;
      api.spread = mass ? mass.spread : 0;
      api.kontakt = kontakt;
      G.wachstum = api;
    },

    /* ----------------------------------------------------------------- */
    zeichnen(gl, R, ctx) {
      const api = R.wachstum;
      if (!api || !api.ueberschuss || !api.kontakt) return;   // Level 1: nichts
      if (typeof R.drawDecal !== 'function' || !api.spread) return;

      const b = ctx.slime && ctx.slime.body;
      const viewProj = ctx.viewProj || (ctx.camera && ctx.camera.viewProj);
      if (!b || !viewProj) return;

      const s = api.ueberschuss;
      const f = s * api.kontakt;

      /* Zustand selbst setzen — zwischen zwei Grundzuegen darf ein fremdes
       * Modul stehen, also verlaesst sich hier keiner auf den Vorgaenger.
       * Wie der Grundzug `dekale`: Tiefe pruefen, aber nicht schreiben,
       * sonst schneidet das Dekal spaeter die Gelrueckwand an. */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);

      /* Lastschatten: weich, ueberproportional breit, ohne eigene Kante.
       * Die Kante am Kontakt gehoert `kontakt.js` (Ordnung 55), das
       * multiplikativ darueber laeuft. */
      R.drawDecal(b.cx, b.cz,
                  api.spread * (1 + P.lastWeite * s),
                  LAST, Math.min(P.lastAlpha * f, P.lastDeckel), false, viewProj);

      /* Zustand zuruecklassen, wie ihn die Pipeline erwartet. */
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    },
  });

})();
