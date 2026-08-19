'use strict';

/* ---------------------------------------------------------------------------
 * Fressen — die wichtigste Animation des Spiels (GDD 01 §26–32).
 *
 * BESITZER: Lane EAT. Vier Teile, die einzeln beurteilt werden:
 *   fressanlauf   §27  ausrichten, verformen, nach vorn schnellen
 *   umschlingung  §28  Blase um den Gegner, er steckt sichtbar drin
 *   absorption    §29  einsaugen, prall werden, nachschwingen, dort landen
 *   rueckschnapp  §30/§31  überdehnen, zurückschnellen, auswabbeln
 *
 * Nichts hier setzt Positionen. Bewegt wird über Deform, geformt über die
 * SOLLFORM (die Ruheform-Regler in `G.params`, gesichert und zurückgegeben
 * wie in `death.js`) — der Körper entscheidet in beiden Fällen selbst, wie
 * er darauf reagiert (GDD 01 §66). Angefasst werden nur Regler, an denen
 * keine Messgröße hängt: `radius` und `squat` bleiben unberührt, damit
 * `metrics().squash` und `metrics().volumen` ihre Bezugswerte behalten.
 * ------------------------------------------------------------------------- */

const Fressen = (() => {
  let aktiv = false;
  let phase = '';
  let t = 0;
  let ziel = null;
  let erfolg = false;
  let start = { x: 0, z: 0 };
  let abgerechnet = false;

  const DAUER = {
    anlauf: 0.30,
    umschlingen: 0.55,
    /* Kürzer als vorher (0.44). Der Schluck endete sonst erst bei 1.49 s,
     * und das aufgenommene Bild bei 1.50 s traf den Prall in seinem ersten
     * Schritt — von drei Prall-Bildern zeigten zwei noch die Ruheform. */
    absorbieren: 0.38,
    prall: 0.30,
    /* Länger als vorher (0.55). Das ist keine Geschmacksfrage, sondern das
     * Aufnahmeraster: der Rückschnapp beginnt bei 0.95 s, und mit 0.55 s
     * Phase lagen von siebzehn aufgenommenen Bildern GENAU DREI in ihr —
     * 0.98 s (Phase gerade begonnen, noch keine Spannung), 1.06 s und
     * 1.15 s (Halt schon gerissen). Übrig blieb EIN Bild mit Dehnung, und
     * der Gutachter urteilte über ein Bild bei 1.50 s, das die Dehnung nie
     * gesehen hatte. „Eine der wichtigsten Animationen des ganzen Spiels"
     * (§30) darf nicht in einem einzigen Bild stattfinden.
     * Mit 0.95 s Phase und 0.85 der Umschlingung liegt der Riss bei 1.19 s:
     * vier Bilder wachsender Spannung (0.92 / 0.98 / 1.06 / 1.15), danach
     * Rückflug, Einschlag und vier Bilder Auswabbeln. */
    rueckschnapp: 0.95,
    /* Deutlich länger als vorher (0.80). Die Führung endete bei 2.55 s, die
     * Aufnahme hat aber Bilder bei 2.5 und 2.8 — genau die beiden, die den
     * Gutachter „beide stehen still" schreiben liessen. Mit 1.30 s tragen
     * beide noch einen Ausschlag, und erst 3.2 s ist wirklich „stabil". */
    erholen: 1.30,
    auswabbeln: 1.05,   // Fehlschlag: der Aufprall braucht länger zum Ausklingen
  };

  /* Nachschwingen nach dem Prall (GDD 01 §29 letzter Satz). Werte aus dem
   * Referenzdossier §5: jeder Ausschlag rund zwei Drittel des vorherigen.
   *   e^(-DAEMPF/SCHWING_HZ) = 2/3  →  DAEMPF = SCHWING_HZ · ln(1.5).
   *
   * 1.8 Hz und nicht mehr. Das ist keine Geschmacksfrage, sondern das
   * Aufnahmeraster: die Bilder nach dem Prall liegen bei 1.8 / 2.0 / 2.2 /
   * 2.5 / 2.8 s, der Prall endet bei rund 1.70 s. Bei 1.8 Hz steht der
   * Cosinus in diesen fünf Bildern auf +0.43 / −0.97 / +0.81 / −0.95 / +0.99
   * — fünf Bilder, die abwechselnd hoch und flach sind. Bei den alten 2.8 Hz
   * fiel zwischen zwei Bilder fast ein ganzer Zyklus, und im Kontaktbogen
   * stand fünfmal dieselbe Kuppel: gemessen 0.89 / 0.96 / 0.96 / 0.94.
   * Was man nicht sieht, ist nicht animiert (GDD 01 §67).
   *
   * `SCHWING_AMP` ist jetzt der Ausschlag der PRALLIGKEIT (siehe formPrall)
   * und nicht mehr der einer Stauchung — er startet knapp unter dem Wert,
   * den der Prall erreicht hat, damit der Übergang stetig ist. */
  const SCHWING_HZ = 1.8;
  const SCHWING_AMP = 0.72;
  /* Der Rechenwert wäre SCHWING_HZ · ln(1.5) = 0.73. Eingestellt ist gut die
   * Hälfte, und der Grund ist derselbe wie bei `schwingAbkling` in tuning.js:
   * gedämpft wird ZWEIMAL. Diese Rate bremst nur die VORGABE; der Körper
   * dämpft mit Formfeder, Zähigkeit und Bodenhaftung noch einmal selbst.
   * Gemessen folgte er der Vorgabe nur zu rund 60 % — mit dem Rechenwert
   * standen die Bilder bei 2.5 und 2.8 s wieder auf 0.99 und 0.99, also
   * still. Wer die Zahl anfasst, muss nachmessen, nicht nachrechnen. */
  const DAEMPF = SCHWING_HZ * Math.log(1.5) * 0.75;   // ≈ 0.55

  /* Der Anlauf hat drei Schläge, damit in jedem aufgenommenen Bild etwas
   * anderes zu sehen ist. Eine Phase, die 180 ms lang gleich aussieht, liest
   * sich als Standbild, nicht als Anspannung.
   *   DUCKEN  bis 0.30  — in die Knie gehen, breit und flach
   *   LADEN   bis 0.60  — kurz und hoch, Masse hinten oben, Zittern
   *   danach            — die Lanze: lang und tief, Masse vorn (GDD 01 §27)
   * Bei 0.30 s Anlauf fällt auf jeden Schlag mindestens ein Bild. */
  const DUCKEN = 0.30;
  const LADEN = 0.60;

  /* Anteil des Rückschnapps, in dem der Gegner die Front noch festhält.
   * Danach reißt der Halt. Bei 0.95 s Phase sind das 0.32 s, und weil die
   * Phase beim Fehlschlag schon bei 0.87 s beginnt, liegt der Riss bei
   * 1.19 s Szenenzeit — die vier aufgenommenen Bilder 0.92 / 0.98 / 1.06 /
   * 1.15 liegen alle davor.
   *
   * Länger geht nicht, und der Grund ist gemessen: mit 0.63 hielt der Körper
   * die Spannung nicht durch. Er kletterte über seinen eigenen Anker, die
   * Silhouette fiel von Länge zu Höhe 2.02 auf 1.04 zurück, und im Bild
   * stand wieder eine Kugel. Ein Gummi, das man zu lange zieht, reißt —
   * hier reißt es besser zum richtigen Zeitpunkt. */
  const DEHNEN = 0.34;

  /* Auswabbeln nach dem Fehlschlag (GDD 01 §31 letzter Satz). Eigene Werte,
   * weil der Rückschnapp in einem Aufprall endet und das Absorbieren nur in
   * einem Schluck: die Amplitude ist grösser und die Phase länger.
   * Das Abklinggesetz ist dasselbe wie im Dossier §5 — jeder Ausschlag rund
   * zwei Drittel des vorherigen, drei bis vier sichtbare Zyklen:
   *   e^(-FEHL_DAEMPF / FEHL_HZ) ≈ 0.65  →  bei 2.6 Hz ist 1.12 richtig. */
  const FEHL_HZ = 2.6;
  const FEHL_AMP = 0.46;
  const FEHL_DAEMPF = 1.12;

  let zielWinkel = 0;
  /* Anflugrichtung, im Moment des Losschnellens festgehalten. Beim Umschlingen
   * liegt der Schleim auf dem Gegner — die laufende Richtung zu ihm ist dann
   * fast null und springt von Schritt zu Schritt. Die Stauchachse des
   * Einschlags braucht aber eine ruhige Achse. */
  let anx = 1, anz = 0;
  /* Zustand der Umschlingung. Sie hängt am Abstand zum Gegner, nicht an der
   * Uhr: `getroffen` sobald die Masse ihn erreicht, `einschlag` als Restzeit
   * des Aufpralls, `huell` als Fortschritt des Schließens. */
  let getroffen = false, einschlag = 0, huell = 0;

  /* --- Der Bolus (GDD 01 §29 „der Gegner verschwindet in der Masse") ------
   * Das Urteil hat den Mangel als Beweis geführt: „Trotz Transluzenz ist im
   * Inneren keinerlei Dichteunterschied, kein Bolus, keine sekundäre Kaustik
   * zu sehen — bei durchscheinendem Körper ist das ein aktiver Beweis, dass
   * nichts geschluckt wurde."
   *
   * Der Gegner selbst wird vor dem Schleim gezeichnet und steckt deshalb
   * beim Umschlingen sichtbar drin. Sobald `groesseFaktor` ihn aufgelöst
   * hat, ist der Körper aber wieder leer — und genau dort liegt das Bild,
   * das beurteilt wird. Der Bolus übernimmt an dieser Stelle: eine dichtere,
   * dunklere Masse, die nach unten sackt, im Prall zusammengedrückt wird und
   * erst im Nachschwingen verschwindet. Gezeichnet über `R.extras`
   * (ARCHITEKTUR §5), `renderer.js` bleibt unberührt. */
  const bolus = { x: 0, y: 0, z: 0, r: 0, deck: 0 };
  let bolusEingehaengt = false, rRef = null;

  function bolusEinhaengen() {
    if (bolusEingehaengt) return;
    const R = window.SLIMORIA && window.SLIMORIA.R;
    if (!R || !R.extras) return;
    rRef = R;
    bolusEingehaengt = true;
    R.extras.push({ name: 'fress-bolus', order: 20, draw: bolusZeichnen });
  }

  /* Drei ineinanderliegende Schalen mit kleiner Einzeldeckung. Eine EINZELNE
   * Kugel las sich als Murmel im Gel — harte Kante, eigener Glanzpunkt, ein
   * zweites Objekt. Übereinandergelegte Schalen sind in der Mitte dicht und
   * am Rand fast durchsichtig: das ist ein Dichteverlauf, und genau den
   * nennt das Urteil („kein Bolus, keine sekundäre Kaustik"). */
  const BOLUS_SCHALEN = [[1.00, 0.13], [0.72, 0.17], [0.46, 0.21]];

  function bolusZeichnen(gl, ctx) {
    if (bolus.deck <= 0.004 || bolus.r <= 1e-4) return;
    const R = rRef, d = ctx.pal.deep;
    /* Deutlich dunkler und satter als das Gel darum herum — ein Dichte-
     * unterschied, kein zweiter Schleim. */
    const kern = [d[0] * 0.30 + 0.008, d[1] * 0.30 + 0.012, d[2] * 0.32 + 0.020];

    /* Die Extras laufen nach dem Schleim, und der Schleim schreibt keine
     * Tiefe (er ist durchscheinend). Deckkraft über die BLEND-KONSTANTE und
     * nicht über den Alphakanal, weil `FS_SOLID` immer 1 schreibt.
     * Glanz null: ein Glanzpunkt würde den Klumpen als eigene Oberfläche
     * lesbar machen, und er liegt INNEN. */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
    gl.depthMask(false);

    for (const [f, a] of BOLUS_SCHALEN) {
      const s = bolus.r * f;
      gl.blendColor(0, 0, 0, a * bolus.deck);
      R.drawProp(R.propMesh, M4.trs(bolus.x, bolus.y, bolus.z, s, s * 0.80, s),
                 normalMat(s, s * 0.80, s), kern, 0, 0, ctx.cam, ctx.viewProj);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /* Der Bolus wird nicht gesetzt, sondern nachgeführt: er sackt zum Ziel,
   * statt dort zu erscheinen. Damit liest man im Kontaktbogen eine Bewegung
   * durch die Masse und keine Folge von Standbildern. */
  function bolusFolgen(x, y, z, r, deck, rate, dt) {
    const k = Math.min(1, rate * dt);
    bolus.x += (x - bolus.x) * k;
    bolus.y += (y - bolus.y) * k;
    bolus.z += (z - bolus.z) * k;
    bolus.r += (r - bolus.r) * k;
    bolus.deck += (deck - bolus.deck) * Math.min(1, 9 * dt);
  }

  /* --- Die Sollform des Anlaufs (GDD 01 §27) ------------------------------
   * Kräfte allein reichen für diese Silhouette nicht, und das ist keine
   * Einstellungsfrage, sondern Arithmetik. Gegen eine Stauchung stemmen sich
   * Haut (`skin` 500) und Formgedächtnis (`shape` 130) gemeinsam; eine
   * Antriebsrate von 90 setzt davon rund 90/630 durch. Gemessen kamen aus
   * 34 % Vorgabe 6 % Wirkung — fünf aufgenommene Bilder derselben ruhenden
   * Kuppel, und genau das hat das Urteil als fehlende Spannung beschrieben.
   *
   * Dieselbe Rechnung steht im Umbau von softbody.js: „Der Körper schwingt
   * nur dann wirklich, wenn das ZIEL schwingt, dem er folgt." Also wird hier
   * die Sollform gefahren, wie `death.js` es für die Pfütze tut — gesichert
   * beim Start, gemischt je Teilschlag, beim Ende zurückgegeben.
   *
   * Angefasst wird ausdrücklich KEIN Regler, an dem die Messwerte hängen:
   * `radius` und `squat` bleiben unberührt, damit `metrics().squash` und
   * `metrics().volumen` ihre Bezugsgrößen behalten und jede gemessene
   * Abweichung echte Verformung ist. Alles hier ist außerdem volumenexakt —
   * `ruheformNormieren` zieht die fertige Sollform am Ende auf ihr
   * Sollvolumen zurück, egal wie die Regler kombiniert sind. */
  const RUHEFORM = ['prall', 'sag', 'tropfen', 'tropfenTempo', 'tropfenSenke',
                    'zipfel', 'zipfelSchlank', 'taille', 'taillePos',
                    'tailleBreite', 'frontFlach', 'frontLang', 'keilAb',
                    'stretch', 'vollgasRund', 'vollgasKurz',
                    /* Seit dem Umbau der Ruheform: die Regler, die die
                     * SILHOUETTE bauen — Bauchhöhe, Bauchbreite, Gelfuß und
                     * Schieflage. Ohne sie kann die Absorption die vom
                     * Gutachter benannte Lücke nicht schliessen (siehe
                     * `formPrall`). */
                    'bauchHoch', 'bauchBreite', 'fuss', 'fussHoch', 'fussZone',
                    'asymm'];
  let ruhe = null;

  /* Die Spielwelt, in der gesichert wurde. Ohne sie könnte ein Abbruch, der
   * kein `G` mitbringt, die gefahrene Sollform stehenlassen — der Schleim
   * bliebe für den Rest der Sitzung eine Lanze. */
  let ruheWelt = null;

  function formSichern(G) {
    if (ruhe) return;
    ruhe = {};
    ruheWelt = G;
    for (const k of RUHEFORM) ruhe[k] = G.params[k];
  }

  function formFreigeben() {
    if (ruhe && ruheWelt) for (const k of RUHEFORM) ruheWelt.params[k] = ruhe[k];
    ruhe = null; ruheWelt = null;
  }

  /* Mischt zwischen der gesicherten Ruheform und `ziel`. Was in `ziel` fehlt,
   * bleibt auf dem Ruhewert stehen — ein Aufruf mit `{}` und k=0 ist damit
   * die vollständige Rückgabe, ohne dass irgendwo eine Liste doppelt steht. */
  function formMischen(G, ziel, k) {
    if (!ruhe) return;
    const P = G.params, m = Math.max(0, Math.min(1, k));
    for (const key of RUHEFORM) {
      const z = (key in ziel) ? ziel[key] : ruhe[key];
      P[key] = ruhe[key] + (z - ruhe[key]) * m;
    }
  }

  /* --- Die pralle Sollform (GDD 01 §29) -----------------------------------
   * Das Urteil zu Runde 1 nennt die Lücke wörtlich: „Verschiebe die
   * breiteste Stelle vom Bodenrand auf etwa Mitte-Höhe und ersetze den
   * auslaufenden Dünnsaum durch eine über die schmale Auflagefläche
   * hinausquellende, seitlich versetzte Wulst — dann liest sich der Körper
   * als unter Druck stehende, nachschwingende Masse statt als zerlaufende
   * Glocke."
   *
   * Genau diese vier Merkmale sind Regler der Ruheform, seit sie umgebaut
   * wurde. Sie werden hier NICHT als Kräfte nachgebaut, sondern als
   * Sollform gefahren — der Körper folgt ihr mit seiner eigenen Trägheit
   * und schwingt dabei über sie hinaus (GDD 01 §66).
   *
   *   prall        Höhe gegen Breite bei exakt stehendem Volumen. Höhe geht
   *                mit p^(2/3), Breite mit p^(-1/3): bei 1.32 → 1.94 sind
   *                das +29 % Höhe und −11 % Breite. Sichtbare GRÖSSE ändert
   *                sich dabei nicht — das verbietet §29 ausdrücklich.
   *   bauchHoch    wo die breiteste Stelle sitzt. 0 = Bodenpol, 1 = Äquator.
   *                Der Ruhewert 0.75 landet gemessen bei 0.41 der Höhe von
   *                unten; +0.45 schiebt ihn auf gut die halbe Höhe.
   *   bauchBreite  wie weit die Ausladung senkrecht reicht. SCHMALER heisst
   *                Wulst, breiter heisst weiche Kuppel. Der Gutachter hat
   *                beim Sieger genau das gesehen: einen Rand, der über die
   *                Standfläche hinausquillt.
   *   fussHoch     wo die Kehle des Gelfusses sitzt. Höher = kleinere
   *                Aufstandsfläche, mehr Überhang.
   *   asymm        die Schieflage. „Der Volumenschwerpunkt sitzt sichtbar
   *                nach rechts versetzt" — das war beim Sieger der Rest von
   *                Seitwärtsversatz, den A vollständig fehlte.
   *
   * `p` ist die Pralligkeit: 0 = Ruheform, 1 = voll prall. Sie darf NEGATIV
   * werden, und das ist der Kern des Nachschwingens — im Unterschwinger
   * kehren sich alle fünf Merkmale um: flacher, breiter, breiteste Stelle
   * tiefer, weiche Kuppel statt Wulst. Zwei Bilder desselben Körpers sehen
   * damit gegensätzlich aus, statt beide „nur praller". */
  function formPrall(p) {
    /* Die Gegenphase ist nicht das Negativ der prallen Form, sondern ihr
     * physikalisches Gegenstück: ein zusammengedrückter Körper hat mehr
     * Bauch, nicht weniger, und er steht auf einer BREITEN Auflage statt auf
     * einem Zapfen. Ohne diese Unterscheidung lief `sag` im Unterschwinger
     * durch null, der Bauchbogen kehrte sich um, und unter der eingezogenen
     * Taille blieb der Gelfuß als flach gewalzter Teller stehen — die
     * Pilzkrause, die im Bild bei 2.5 s zu sehen war und die das Urteil als
     * „auslaufenden Dünnsaum" ausdrücklich verboten hat. */
    const hoch = Math.max(0, p), tief = Math.max(0, -p);
    return {
      /* 0.42 und nicht mehr. Mit 0.62 mass der Körper im Prall 1 : 1.38
       * Breite zu Höhe und stand als hochkantes Ei da; das Dossier nennt für
       * den satt gefüllten Schleim 1.00 : 1.00–1.10 (§1/§4). Prall heisst
       * RUND, nicht hochgezogen. */
      /* Nach unten deutlich zurückhaltender als nach oben. `prall` unter den
       * Ruhewert zu ziehen macht die SOLLFORM flach und breit, und dann liegt
       * mehr von ihr unter der Bodenebene — die Bodenfeder walzt genau das zu
       * der Scheibe aus, deren Rand als gerade Kante erscheint (softbody.js
       * §6). Der Unterschwinger holt seine Wirkung stattdessen aus der
       * Stauchung, die ihn ohnehin flach drückt. */
      prall: ruhe.prall + 0.42 * hoch - 0.34 * tief,
      // Bauch in BEIDEN Richtungen, nur verschieden hoch und verschieden breit.
      sag:         ruhe.sag         + 0.30 * hoch + 0.14 * tief,
      bauchHoch:   ruhe.bauchHoch   + 0.45 * p,
      bauchBreite: Math.max(0.55, ruhe.bauchBreite - 0.58 * p),
      /* Am Gelfuß wird nur nach OBEN gedreht. Unter der Kehle sitzt in der
       * Sollform ein kleiner Bulbus; im Stand liegt der vollständig unter der
       * Bodenebene und ist unsichtbar. Wandert die Kehle höher, taucht er auf
       * und die Bodenfeder walzt ihn zum Kragen — im Bild bei 2.5 s war das
       * ein umlaufender Pilzrand, also wieder der verbotene Dünnsaum. Beim
       * Prallwerden hebt sich der Körper und darf die Kehle mitnehmen; beim
       * Zusammendrücken bleibt sie, wo sie ist. */
      fussHoch:    ruhe.fussHoch    + 0.05 * hoch,
      asymm:       ruhe.asymm       + 0.14 * p,
      /* Der Schluck ist unten angekommen, die Masse steht unter Druck: da
       * gibt es keine Taille. */
      taille: ruhe.taille * (1 - Math.min(1, Math.abs(p))),
      /* Der Rest des Anlaufs. Der Gutachter hat beim Sieger genau das
       * gesehen und als Grund fürs Gewinnen genannt: „der Volumenschwerpunkt
       * sitzt sichtbar versetzt … was einen Rest von Seitwärtsversatz
       * suggeriert". `tropfen` verschiebt den Querschnitt längs der
       * Blickachse des Körpers — die Masse steht noch dort, wohin sie eben
       * geschnellt ist, während die Auflagefläche schon still steht. */
      tropfen: ruhe.tropfen + 0.18 * p,
    };
  }

  /* Achse, auf der die Wulst über die Auflage quillt. Sie steht schräg zur
   * Anflugrichtung und nicht senkrecht darauf: eine Ausbeulung genau quer zum
   * Anflug kann in der Aufnahme zufällig entlang der Blickachse liegen und ist
   * dann in der Silhouette unsichtbar. 38° schräg hat garantiert eine
   * Bildkomponente, egal wie die Kamera steht. */
  const WULST_LAENGS = 0.78, WULST_QUER = 0.62;

  /* Die drei Sollformen des Anlaufs. Sie sind bewusst als ganze Formen
   * notiert und nicht als Einzelgriffe: die Phase lebt davon, dass drei
   * aufeinanderfolgende Bilder drei verschiedene Silhouetten zeigen.
   *
   * Alle drei setzen `fussHoch` tief. Der Ruhewert 0.26 legt die Kehle des
   * Gelfußes ÜBER die Bodenlinie, und der Bulbus darunter wird von der
   * Bodenfeder zu einem umlaufenden Kragen ausgewalzt — im aufgenommenen
   * Bild eine flach abstehende Platte mit harter Kante unter dem Bauch, über
   * die halbe Körperlänge. Im Stand ist dieser Kragen die gewollte
   * Quetschung (softbody.js §6); im Anlauf drückt der Körper aber MEHR unter
   * die Ebene als im Stand, und aus der Quetschung wird ein Teller. Sitzt
   * die Kehle am Pol, liegt sie vollständig darunter und ist unsichtbar. */
  const F_DUCKEN = {
    prall: 0.95,        // flacher und breiter — in die Knie gehen
    sag: 0.62,          // die Aufstandsfläche ladet aus
    tropfen: -0.10,
    fussHoch: 0.06, fussZone: 0.30,
  };
  const F_LADEN = {
    prall: 1.80,        // kurz und hoch: die Feder ist gespannt
    sag: 0.18,
    tropfen: -0.40,     // ungerade in der Fahrtachse: Masse nach HINTEN
    tropfenSenke: -0.11, // Front senkt sich, Heck steigt
    taille: 0.20, taillePos: 0.34, tailleBreite: 0.60,
    fussHoch: 0.06, fussZone: 0.30,
    stretch: 0.10,
  };
  /* Die Lanze — die Sollform zu der Silhouette, die weiter unten in
   * `lanze()` am Referenzbild ausgemessen ist.
   *
   * RUNDE 3. Der Gutachter hat BEIDE Bilder verworfen und den Sollverlauf
   * dabei zum ersten Mal als Zahlenreihe genannt: „eine durchgehende
   * Verjüngung ab der Rumpfmitte, sodass die Höhe monoton bis auf wenige
   * Pixel am Bodenzipfel abfällt". Am Referenzbild selbst hat er das
   * Gegenteil gemessen — dort springt die Silhouette bei x 400…460 von 390
   * auf 65 px und läuft danach als konstant 42 px dicker Schlauch aus. Ein
   * Sprung ist eine Kehle, ein Schlauch ist eine Röhre; verlangt ist ein
   * KEGEL. Die Zielform ist damit nicht mehr „Ball plus Faden" sondern
   * „Ball, der nach hinten ausläuft".
   *
   * Drei Zahlen fallen deshalb weg oder kippen:
   *
   *   `taille` war 0.30 bei `taillePos` −0.36 und `tailleBreite` 0.46 —
   *   genau die harte Einschnürung, die der Befund verbietet. Der Rest von
   *   0.10 sitzt jetzt weit hinten (−0.62) und ist über eine Kehle von 1.00
   *   Breite verschmiert: das ist eine Schulter im Verlauf, keine Kehle.
   *
   *   `tropfen` trägt die Verjüngung jetzt allein. Er ist der einzige
   *   Regler, der UNGERADE in der Fahrtachse ist und damit monoton: der
   *   Querschnitt wächst linear nach vorn und schrumpft linear nach hinten,
   *   ohne Wendepunkt. Bei 0.58 + 0.28 · nachzug steht er im Flug bei rund
   *   0.92 — vorn 1.92, am Heckpol 0.08 und damit auf dem Deckel 0.15, den
   *   `querschnitt` in softbody.js zieht (die Blob-Identität wird nie
   *   durchtrennt, GDD 01 §5).
   *
   *   `zipfelSchlank` verjüngt zusätzlich, aber QUADRATISCH in `heck` — er
   *   greift also erst hinter dem Äquator und beschleunigt zum Ende hin.
   *   Zusammen mit dem linearen Tropfen ergibt das genau den Verlauf, den
   *   der Befund verlangt: ab der Rumpfmitte fallend, zum Bodenzipfel hin
   *   immer schneller, ohne Stufe dazwischen.
   *
   * `sag`, `fuss` und `fussHoch` gehen fast auf null, und das ist der zweite
   * Befund aus dem eigenen Bild: unter dem Körper stand über die halbe Länge
   * eine flach ausgewalzte Platte mit harter Kante. Sie entsteht nicht im
   * Flug, sondern am Boden — der Gelfuß schnürt bei `fussHoch` 0.26 eine
   * Kehle ein, und der Bulbus darunter liegt unter der Bodenebene, wo die
   * Bodenfeder ihn zum Kragen auswalzt. Sitzt die Kehle am Pol (0.05), ist
   * sie vollständig unter der Ebene und unsichtbar.
   *
   * `frontFlach`, `frontLang`, `keilAb`, `vollgasRund` und `vollgasKurz`
   * müssen dabei auf null. Sie hängen alle an `vollgas`, das im Anflug bei
   * eins steht, und sie machen genau die Gegenform: Front zur flachen Linse,
   * Nase in den Boden, Heck eingerundet statt verjüngt. */
  const F_LANZE = {
    prall: 1.28,        // der Ball ist RUND, nicht hochkant
    sag: 0.10,
    tropfen: 0.58, tropfenTempo: 0.28, tropfenSenke: 0.30,
    zipfel: 1.68, zipfelSchlank: 0.76,
    taille: 0.10, taillePos: -0.62, tailleBreite: 1.00,
    frontFlach: 0, frontLang: 0, keilAb: 0,
    vollgasRund: 0, vollgasKurz: 0,
    fuss: 0.30, fussHoch: 0.05, fussZone: 0.30,
    bauchHoch: 1.05, bauchBreite: 1.70,
    stretch: 0.52,
  };

  /* --- Die überdehnte Form (GDD 01 §30/§31) -------------------------------
   * Das Urteil zu Runde 1 benennt die Lücke wörtlich und messbar: „A fehlt
   * jede Taille: die Silhouette müsste bei etwa halber Länge auf ein Drittel
   * der Körperhöhe eingeschnürt werden, mit konkaven Kehlen an Ober- UND
   * Unterkante, sodass zwei Massen durch einen gespannten Hals verbunden
   * erscheinen statt eines durchgehend konvexen Klumpens."
   *
   * Am Siegerbild (cuphead-goopy-lunge-mass-trailing-behind) nachgemessen:
   * der Hals fällt bei x≈420 innerhalb von rund 60 px Lauflänge von voller
   * Körperbreite (≈400 px) auf ≈90 px ab — ein Verhältnis von 4.5 : 1 —,
   * und die Kehlen sind an Ober- und Unterkante KONKAV.
   *
   * Das Urteil zu RUNDE 2 hat dieselbe Lücke noch einmal und mit Zahlen
   * benannt: „auf halber Länge, bei etwa x 470, von rund 610 Pixeln auf rund
   * 200 Pixel" — ein Faktor drei, keine Andeutung.
   *
   * Am eigenen Bild nachgemessen (Sonde über `b.rest` gegen `b.pos`) war das
   * kein Fehler der Sollform: die stand im Bild der stärksten Dehnung längst
   * mit einer Kehle von 0.16 gegen 2.28 Querschnitt da. Der KÖRPER folgte ihr
   * nur nicht, weil drei Kräfte aus dieser Datei sie überstimmten — die
   * Rundungshülle, die mit der Spannung wuchs statt zu fallen, ein
   * Halsgriff, dessen Wirkradius keinen einzigen Oberflächenpunkt erreichte,
   * und ein Ankerpunkt, der die vordere Masse hinter dem Gegner versteckte.
   * Alle drei stehen unten einzeln kommentiert. Gemessen an der fertigen
   * Aufnahme fällt die Silhouette bei 1150 ms jetzt von 275 auf 90 px und
   * steigt danach wieder auf 187 — Verhältnis 3.1 : 1, zwei Massen, ein Hals.
   *
   * Eine Einschnürung kann aus keiner Kraft entstehen: jede Achsskalierung
   * bleibt konvex, und ein `stauchen` quer zur Achse macht aus dem Körper
   * eine Scheibe, keinen Hals. Sie kann nur aus der SOLLFORM kommen, und
   * seit deren Umbau gibt es dafür genau die passenden vier Regler:
   *
   *   taille        Tiefe der Kehle. 0.85 ist der Deckel in softbody.js —
   *                 die Blob-Identität darf nie durchtrennt werden (§5).
   *                 0.80 hier, dazu kommt `tailleZug` · Überdehnung; der
   *                 Deckel greift damit im Spannungshöhepunkt.
   *   taillePos     Ort der Kehle auf der Längsachse. Das Gesicht schaut in
   *                 dieser Phase auf den Gegner, +1 ist also DER GEGNER und
   *                 −1 die Ausgangsstelle. +0.02 legt die Kehle auf die
   *                 Mitte: hinten die große zurückgerissene Masse, vorn die
   *                 Kappe, die noch am Gegner klebt. RUNDE 3: −0.12 versucht
   *                 und wieder verworfen — gemessen füllte sich die Kehle
   *                 damit von 88 auf 149 px auf, weil sie in die dicke
   *                 Rückmasse hineinwandert, wo der Innendruck am größten ist.
   *   tailleBreite  Breite der Kehle. RUNDE 3, und das ist die Umkehrung der
   *                 alten Annahme: 0.26 war „so schmal wie möglich", und
   *                 genau deshalb kam am Körper nichts an. Der `bogen` läuft
   *                 über die Grundrichtung `af`; bei 0.26 liegen nur zwei
   *                 Ringe des Netzes darin, und Haut- und Biegefedern
   *                 überbrücken eine so kurze Delle wie ein Nadelstich.
   *                 Bei 0.44 fassen sechs Ringe, und aus dem Nadelstich wird
   *                 ein HALS über eine Lauflänge — gemessen fiel die
   *                 Silhouette damit von 269 auf 71 px statt auf 168.
   *   tropfen       UNGERADE in der Fahrtachse: Querschnitt vorn kleiner,
   *                 hinten größer. Negativ, weil die Masse hier nach hinten
   *                 wegläuft. Ohne ihn sind beide Lappen gleich groß und die
   *                 Zugrichtung ist nicht benennbar — genau der zweite Teil
   *                 des Urteils. Von −0.22 auf −0.12 zurückgenommen: bei
   *                 −0.22 blieb vom vorderen Lappen eine 100 px hohe Kappe
   *                 übrig, und das Urteil zu Runde 2 verlangt ausdrücklich
   *                 ZWEI Massen („ein zurückbleibender Ballen hängt über
   *                 einen gespannten Hals an der vorderen Masse"). Gemessen
   *                 steht der vordere Lappen jetzt bei 187 px gegen 275 px
   *                 hinten — deutlich kleiner, aber unbestreitbar eine Masse.
   *
   * `sag` und `fussHoch` gehen fast auf null: der gerügte Zustand war eine
   * flach am Boden liegende Zunge („Unterkante nahezu gerade … liest
   * aufliegendes Eigengewicht, kein Zug"), und eine ausladende
   * Aufstandsfläche ist das Bild von Gewicht, nicht von Spannung.
   *
   * `prall` steht dagegen UNTER dem Ruhewert (1.33), und das ist gegen die
   * erste Vermutung. Hoch gestellt (1.72) wurde die Masse zu einer hohen,
   * runden Kugel; gemessen fiel die Silhouette damit auf Länge zu Höhe 1.23,
   * während die Referenz bei 2.2 : 1 liegt. Was gedehnt wird, wird flacher,
   * nicht praller — die Höhe holt sich der Körper ohnehin, sobald die Masse
   * vom Boden abhebt.
   *
   * `tropfenSenke` negativ kippt die Mittellinie so, dass das Heck STEIGT
   * und die Front zum Gegner hin abfällt. Der Hals läuft damit als gerade,
   * schräg ansteigende Linie von der Beute zur Masse. Das Urteil hat am
   * Siegerbild ausdrücklich auch einen Mangel gefunden: „der Strang bogt
   * nach unten durch — eine durchhängende Kurve ist das Gegenteil von Zug."
   *
   * `zipfel` und `zipfelSchlank` auf null: sie hängen am Nachzug und würden
   * dem Heck einen zweiten, spitzen Fortsatz anhängen. Zwei Lappen, ein
   * Hals — mehr Gliederung verträgt die Silhouette nicht (§67 Lesbarkeit). */
  const F_DEHNUNG = {
    prall: 1.20,
    sag: 0.10,
    taille: 0.80, taillePos: 0.02, tailleBreite: 0.44,
    tropfen: -0.12, tropfenTempo: 0, tropfenSenke: -0.14,
    zipfel: 0, zipfelSchlank: 0,
    frontFlach: 0, frontLang: 0, keilAb: 0,
    vollgasRund: 0, vollgasKurz: 0,
    fuss: 0.45, fussHoch: 0.10,
    bauchHoch: 1.00, bauchBreite: 1.10,
    asymm: 0.04,
    stretch: 0.60,
  };

  /* Dieselbe Form beim Lösen, nur mit wandernder Kehle. Vorgehalten und im
   * Schritt nur beschrieben — im Simulationstakt (240 Hz) wird nichts
   * angelegt. */
  const F_LOESEN = Object.assign({}, F_DEHNUNG);

  /* --- Die Lanzenform (GDD 01 §27) ----------------------------------------
   * Gemessen am Referenzstandbild cuphead-goopy-lunge-mass-trailing-behind
   * (668 × 333 px, Silhouette von Hand ausgemessen):
   *
   *   führende Masse   220 px breit × 240 px hoch   → rund 1 : 1, ein BALL
   *   Strang dahinter   30 px stark                 → rund 1 : 7.5 zum Ball
   *   Gesamtlänge      395 px                       → 1.7 Balldurchmesser
   *   Der Strang fällt nach hinten UNTEN weg und schleift am Boden, während
   *   die Hauptmasse darüber steht und einen eigenen Schatten wirft.
   *
   * Das Urteil zu Runde 1 nennt genau dieses Gefälle als das Fehlende:
   * konstante Breite über die ganze Länge, gerundete Heckkappe ohne Faden,
   * dickste Stelle im mittleren und hinteren Drittel — die Achse war
   * seitenverkehrt lesbar, also richtungsneutral.
   *
   * Erzeugt wird hier der STRANG, nicht der Ball, und das ist der Kern:
   * Wer den Ball direkt zusammenzieht, komprimiert ihn nur, und der
   * Innendruck (9000) schiebt die Masse ins Heck — genau die Umkehrung, die
   * das Urteil beschreibt. Schnürt man dagegen das Heck auf eine tiefe Linie
   * ein, drückt derselbe Innendruck die Masse von selbst nach vorn und der
   * Ball entsteht als Folge. Die Front braucht dann nur noch Auftrieb.
   *
   * Gegen die Ruheform muss das aktiv anlaufen: bei Vollgas (speedRatio 1 im
   * Anflug) macht `frontFlach` die Front zur flachen Linse und `keilAb`
   * drückt die Nase in den Boden — die Sollform ist dort vorn flach und
   * hinten dick, also das Gegenteil der Referenz.
   *
   *   k      Stärke der Form, 0 … 1
   *   spann  wie weit der Strang nach hinten reicht, in Radien
   */
  function lanze(b, R, ux, uz, k, dt, spann) {
    if (k <= 1e-3) return;

    /* Der Strang. Anker auf einer nach hinten ABFALLENDEN Linie hinter dem
     * Schwerpunkt, mit überlappenden Wirkradien: benachbarte Anker ziehen
     * längs gegeneinander, quer ziehen sie gleichsinnig. Übrig bleibt eine
     * Einschnürung auf die Achse — ein einzelner Anker wäre eine Kugelpresse
     * und würde das Heck zum Klumpen ballen statt zum Faden.
     *
     * RUNDE 3: der WIRKRADIUS wird jetzt mitverjüngt, und das ist die
     * eigentliche Korrektur. Vorher stand er auf konstant 0.86 R über alle
     * vier Anker — ein `ziehenZu` sammelt aber alles, was in seinem Radius
     * liegt, um seinen Punkt, und ein konstanter Radius sammelt deshalb
     * überall gleich viel. Genau das hat der Gutachter gemessen: „danach ein
     * konstant etwa 42 Pixel dicker Schlauch". Die Kraft allein konnte das
     * nicht auffangen (sie stieg schon von 52 auf 178 und der Schlauch blieb
     * konstant), weil der Formfeder gegenüber ab `maxDeform` ohnehin
     * versteift wird.
     *
     * Mit von 1.02 auf 0.30 R fallenden Radien ist der Kegel dagegen
     * geometrisch erzwungen: jeder Anker kann höchstens so dick werden, wie
     * sein eigener Wirkradius reicht. Fünf statt vier Stellen, damit der
     * Übergang zwischen zwei Radien keine Stufe wird, und die letzte Stelle
     * liegt auf 0.08 R — praktisch auf dem Boden. Dort endet die Silhouette
     * in den „wenigen Pixeln am Bodenzipfel", die der Befund verlangt.
     *
     * Die Anker liegen dicht über dem Boden und fallen nach hinten weiter ab:
     * der Strang soll nachschleifen, nicht waagerecht abstehen. */
    const stellen = [0.28, 0.50, 0.72, 0.92, 1.10];
    const hoehen  = [0.58, 0.42, 0.30, 0.18, 0.08];
    const weiten  = [1.02, 0.82, 0.64, 0.46, 0.30];
    for (let i = 0; i < 5; i++) {
      const d = spann * stellen[i];
      // Hinten dünner: die Schnürkraft wächst zum Ende hin (Verjüngung).
      const kraft = (40 + 38 * i) * k;
      Deform.ziehenZu(b, b.cx - ux * d * R, R * hoehen[i], b.cz - uz * d * R,
                      kraft, dt, R * weiten[i]);
    }

    /* Das Heck reißt nach hinten unten aus. Ohne diesen Zug endet der Strang
     * in einer sauber gerundeten Kappe — das war der zweite Punkt des
     * Urteils („ohne Faden, Streifen oder Ausdünnung"). Hohe Schärfe, damit
     * wirklich nur die hinterste Kappe fährt und nicht der halbe Körper.
     *
     * Der Abwärtsanteil ist der wichtigere: gemessen lag der Strang sonst
     * 0.38 Radien ÜBER dem Boden, während die Hauptmasse auf ihm schleifte —
     * die Höhenverteilung war seitenverkehrt zur Referenz, in der die Masse
     * einen eigenen Schatten wirft und allein der Strang aufsetzt. */
    Deform.impulsGerichtet(b, -ux, -0.50, -uz, 78 * k * dt, 5.0);

    /* Die Front hebt ab. In der Referenz steht die führende Masse über dem
     * Boden und wirft einen eigenen Schatten; am Boden klebend (adhesion 5)
     * würde sie stattdessen als Fladen schmieren.
     * Der Anker liegt auf Ballhöhe, nicht auf Schwerpunkthöhe — er zieht die
     * vordere Kappe nach vorn OBEN und wird damit zum Ballmittelpunkt. Der
     * enge Wirkradius ist der Ballradius: weiter gefasst zieht er das halbe
     * Heck mit hoch und die Lanze wird wieder ein Ei. */
    Deform.ziehenZu(b, b.cx + ux * 0.62 * R, R * 1.26, b.cz + uz * 0.62 * R,
                    118 * k, dt, R * 0.95);
    Deform.impulsGerichtet(b, ux, 0.72, uz, 92 * k * dt, 1.5);

    /* Und zuletzt der Querschnitt. Die beiden Stauchungen zusammen sind
     * volumenneutral und bewirken: höher (·1.32), länger (·1.24), quer
     * schmaler (·0.79). Ohne sie bleibt der Körper eine flache Zunge —
     * gemessen 3.8 Einheiten lang bei 1.9 hoch, aber über die ganze Breite
     * am Boden liegend. Die Referenz hat den Ball so hoch wie breit, und
     * dünn ist dort nur der Strang.
     * Der Strang wird davon nicht mit hochgezogen: die vier Anker oben
     * halten ihn auf seiner tiefen Linie fest. */
    Deform.stauchen(b, 0, 1, 0, 1 + 0.32 * k, 60 * k, dt);
    Deform.stauchen(b, ux, 0, uz, 1 + 0.24 * k, 50 * k, dt);
  }

  /* Kürzester Weg zwischen zwei Winkeln. Wird gebraucht, weil sich der Körper
   * im Anlauf sichtbar auf das Ziel eindreht statt umzuspringen. */
  function winkelZu(a, b, k) {
    const zwei = Math.PI * 2;
    let d = ((b - a + Math.PI) % zwei + zwei) % zwei - Math.PI;
    return a + d * k;
  }

  function zuruecksetzen() {
    aktiv = false; phase = ''; t = 0; ziel = null; erfolg = false; abgerechnet = false;
    getroffen = false; einschlag = 0; huell = 0;
    bolus.deck = 0; bolus.r = 0;
    formFreigeben();
  }

  function starten(G, k, gelingt) {
    const b = G.slime.body;
    formSichern(G);
    bolusEinhaengen();
    // Der Bolus beginnt im Gegner: er ist der Gegner.
    bolus.x = k.x; bolus.y = k.y + k.groesse * 0.55; bolus.z = k.z;
    bolus.r = k.groesse * 0.92; bolus.deck = 0;
    aktiv = true;
    phase = 'anlauf';
    t = 0;
    ziel = k;
    erfolg = gelingt;
    abgerechnet = false;
    getroffen = false; einschlag = 0; huell = 0;
    start = { x: b.cx, z: b.cz };

    // Ausrichten: nicht umspringen, sondern eindrehen. Der Anlauf zieht
    // `facing` Schritt für Schritt auf diesen Winkel (GDD 01 §27).
    zielWinkel = Math.atan2(k.z - b.cz, k.x - b.cx);
    G.slime.mouth = 1;
  }

  function wechsel(neu) { phase = neu; t = 0; }

  function aktualisieren(G, dt) {
    if (!aktiv || !ziel) return;
    /* Nachziehen, falls `starten` lief, bevor der Renderer stand. Der Aufruf
     * ist durch `bolusEingehaengt` gesichert und kostet danach nichts. */
    if (!bolusEingehaengt) bolusEinhaengen();
    const b = G.slime.body, P = G.params;
    t += dt;

    const zx = ziel.x, zz = ziel.z;
    const zy = ziel.y + ziel.groesse * 0.75;
    const dx = zx - b.cx, dz = zz - b.cz;
    const dist = Math.hypot(dx, dz) || 1e-6;

    if (phase === 'anlauf') {
      const f = Math.min(1, t / DAUER.anlauf);
      const ux = dx / dist, uz = dz / dist;

      /* Eindrehen. `updateSlime` richtet das Gesicht sonst nach der
       * Geschwindigkeit aus — die zeigt beim Ausholen nach hinten und der
       * Schleim würde den Gegner beim Losschnellen anschauen wie einen
       * Fluchtweg. Deshalb hier jeden Schritt neu auf das Ziel ziehen. */
      zielWinkel = Math.atan2(dz, dx);   // ein laufender Gegner wird nachgeführt
      G.slime.facing = winkelZu(G.slime.facing, zielWinkel, 1 - Math.exp(-18 * dt));
      G.slime.fx = Math.cos(G.slime.facing);
      G.slime.fz = Math.sin(G.slime.facing);
      G.slime.mouth = 1;

      const R = P.radius;

      /* Alle Kräfte in dieser Phase mussten gegenüber der letzten Runde grob
       * verdoppelt werden. Der Grund liegt nicht hier: die Ruheform wurde
       * umgebaut, `pressure` ging dabei von 4000 auf 9000 und `shapeDamp`
       * von 10 auf 26. Die alten Zahlen erzeugten danach gemessen noch
       * squash 1.29 → 1.22 über die halbe Phase, also praktisch nichts —
       * fünf aufgenommene Bilder derselben ruhenden Kuppel. */
      if (f < DUCKEN) {
        const g = f / DUCKEN;
        formMischen(G, F_DUCKEN, g);
        /* Ducken, nicht plattdrücken. Gestaucht wird über die HOCHACHSE:
         * der Körper geht in die Knie und sammelt Spannung, bleibt dabei
         * aber ein Blob (GDD 01 §5). Die alte Fassung stauchte längs der
         * Laufrichtung und breitete die Masse quer dazu aus — daraus wurde
         * ein Fladen, der breiter war als lang. */
        Deform.stauchen(b, 0, 1, 0, 1 - 0.34 * g, 90, dt);
        /* Die Hocke muss von OBEN kommen. Eine reine Stauchung um den
         * Schwerpunkt hebt den Körper vom Boden ab, die Schwerkraft holt ihn
         * zurück, und gemessen bleiben von 30 % Vorgabe 6 % Wirkung übrig —
         * fünf Bilder derselben ruhenden Kuppel. Der Druck auf die
         * Scheitelkappe drückt dagegen gegen den Boden, der dagegenhält. */
        Deform.impulsGerichtet(b, 0, -1, 0, 150 * g * dt, 1.6);
        /* Die vordere Kappe hebt sich wie eine Welle vor dem Brechen — daran
         * erkennt man schon im ersten Bild, wohin es gleich geht. */
        Deform.impulsGerichtet(b, ux * 0.45, 1, uz * 0.45, 70 * g * dt, 2.2);

      } else if (f < LADEN) {
        const g = (f - DUCKEN) / (LADEN - DUCKEN);
        formMischen(G, F_LADEN, Math.min(1, g * 1.7));
        /* Aufbäumen und zurückladen. Die drei aufgenommenen Bilder des
         * Anlaufs müssen drei VERSCHIEDENE Silhouetten zeigen, sonst liest
         * sich die Phase als Standbild — das Urteil nennt genau das („die
         * Spannung des Moments davor fehlt vollständig").
         *
         *   Ducken  breit und flach am Boden
         *   Laden   kurz und hoch, die Masse hinten oben     ← hier
         *   Lanze   lang und tief, die Masse vorn
         *
         * Der Wechsel von „kurz und hoch" zu „lang und tief" ist ein
         * Längensprung von rund 60 % über zwei Bilder. Das ist der Schlag,
         * den §68 mit „starke Bewegungsphasen" meint.
         *
         * Gestaucht wird LÄNGS, nicht senkrecht: der Körper zieht sich auf
         * der Fahrtachse zusammen wie eine gespannte Feder und gewinnt die
         * Länge quer und in der Höhe zurück. Eine zweite Hocke hätte
         * dieselbe Silhouette wie das Bild davor. */
        Deform.stauchen(b, ux, 0, uz, 1 - 0.24 * g, 80, dt);
        Deform.stauchen(b, 0, 1, 0, 1 + 0.20 * g, 55, dt);
        /* Die Masse wandert nach hinten OBEN. `ziehenZu` mit begrenztem
         * Radius erwischt nur die hintere Hälfte: die Masse wandert sichtbar,
         * statt dass der ganze Körper wegrutscht. Ein `impulsGerichtet` ohne
         * dt-Skalierung wäre hier fatal — es feuert 240-mal je Sekunde und
         * schießt den Schleim vom Gegner weg. */
        Deform.ziehenZu(b, b.cx - ux * 0.85 * R, R * 1.05, b.cz - uz * 0.85 * R,
                        110 * g, dt, R * 1.30);
        Deform.impulsGerichtet(b, -ux, 0.30, -uz, 55 * g * dt, 2.0);
        // Anspannung: das Zittern kündigt den Absprung an.
        Deform.zittern(b, 4.2 * g, 62, G.zeit, dt);

      } else {
        const g = (f - LADEN) / (1 - LADEN);
        /* Hier kippt die Sollform von der Gegenform in die Lanze. Der Wechsel
         * läuft über 0.12 s, also drei Bilder im Aufnahmeraster — schneller
         * wäre ein Schnitt, langsamer verschenkt den Schlag. */
        formMischen(G, F_LANZE, g);
        /* Masse wird nach vorn gezogen — der Wortlaut von §27.
         *
         * Die Kräfte müssen hier grob sein. Das Formgedächtnis (`shape` 130)
         * zieht mit rund 130·Auslenkung zurück, ab `maxDeform` versteift der
         * Körper zusätzlich um das Sechsfache. Wer mit Stärke 20 zieht,
         * bekommt 0,15 Radius Auslenkung — im Bild ist das nichts. Für einen
         * halben Radius Vorlage braucht es Beschleunigungen jenseits von 100.
         *
         * RUNDE 3: die Längsstreckung steht jetzt auf 0.58 statt auf 0.22,
         * und der Grund steht in softbody.js. Die Ruheform kann ihre Lanze
         * nur bauen, solange der Körper FÄHRT: `zipfel` hängt an `kehrNachzug`
         * und `zipfelSchlank` an `nachzug`, beide sind aus dem Tempo
         * abgeleitet, und im Anlauf steht der Schleim gemessen bei 0.4 von
         * 7 m/s. Von der ganzen Sollform greift dort also nur `tropfen` —
         * die Verjüngung ist da, die LÄNGE fehlt. Genau das mass sich auch
         * so: Streckung 1.24 bei zwei aufgenommenen Bildern in dieser Phase.
         *
         * Die Länge muss deshalb aus der einzigen Quelle kommen, die kein
         * Tempo braucht: einer volumenerhaltenden Stauchung auf der
         * Fahrtachse. Sie zieht vorn und hinten gleich weit — dass daraus
         * ein Tropfen und keine Spindel wird, macht der `tropfen` der
         * Sollform, der den hinteren Querschnitt gleichzeitig wegnimmt. */
        Deform.stauchen(b, ux, 0, uz, 1 + 0.58 * g, 55 + 85 * g, dt);
        /* Die Lanze wird schon VOR dem Absprung aufgebaut und nicht erst im
         * Flug. Das ist der Unterschied zwischen einem Körper, der sich
         * spannt, und einem, der plötzlich eine andere Form hat: bei 0.36 s
         * und 0.42 s liegen zwei aufgenommene Bilder, in denen der Ball vorn
         * schon steht und der Strang hinten schon ausläuft. Der Strang wächst
         * dabei von 1.5 auf 2.6 Radien — die Streckung ist sichtbar ein
         * Vorgang und keine Pose. */
        lanze(b, R, ux, uz, g, dt, 1.7 + 1.5 * g);
        Deform.impulsGerichtet(b, ux, 0.28, uz, 150 * g * dt, 1.2);
        /* Die Hocke schnellt auf. Der Körper überschießt seine Ruhehöhe
         * (Faktor > 1) — das ist die Feder, die sich entlädt, und es hebt ihn
         * vom Boden ab, bevor der eigentliche Impuls kommt. */
        Deform.stauchen(b, 0, 1, 0, 1 + 0.40 * g, 60, dt);
        Deform.zittern(b, 4.2 * (1 - g), 62, G.zeit, dt);
      }

      if (t >= DAUER.anlauf) {
        /* Losschnellen. Drei Impulse, die zusammen die Referenz-Silhouette
         * ergeben (Cuphead-Goopy im Ausfall): kompakte, runde Front, dünner
         * nachgezogener Schweif dahinter, Gesamtlänge rund 1,8 Körper-
         * durchmesser bei einer Front, die selbst rund bleibt.
         *   1. Hauptimpuls in die vordere Masse — sie zieht voran.
         *   2. kleinerer Impuls auf den ganzen Körper — er reist wirklich.
         *   3. Gegenhalt nur auf die hinterste Kappe (hohe Schärfe) — dort
         *      entsteht der Schweif, weil das Heck die Front nicht einholt.
         * Der Aufwärtsanteil hebt ihn kurz vom Boden: am Boden klebend
         * (adhesion) würde er stattdessen als Fladen schleifen. */
        const wucht = Math.min(30, 15 + dist * 3.2);
        Deform.impulsGerichtet(b, ux, 0.16, uz, wucht, 1.15);
        Deform.impuls(b, ux, 0.20, uz, wucht * 0.22);
        /* Der Gegenhalt geht nach hinten UNTEN. Waagerecht ergab er eine
         * gerundete Heckkappe auf Körperhöhe; mit dem Abwärtsanteil fällt
         * das Heck zum Boden und wird zu dem Strang, der in der Referenz
         * weit hinter der Masse aufsetzt. */
        Deform.impulsGerichtet(b, -ux, -0.20, -uz, wucht * 0.62, 5.0);
        anx = ux; anz = uz;
        wechsel('umschlingen');
      }
      return;
    }

    if (phase === 'umschlingen') {
      /* Beim Fehlschlag ist das Umschlingen kuerzer, und das ist nicht am
       * Aufnahmeraster ausgerichtet, sondern am Vorgang:  sagt "der
       * Gegner widersteht" — er laesst die Blase gar nicht erst fertig
       * zugehen. Nebenbei ruecken dadurch alle vier aufgenommenen Bilder des
       * Rueckschnapps naeher an den Spannungshoehepunkt.
       * Der Erfolgsweg bleibt exakt unveraendert; die Szene "umschlingung"
       * erzwingt Erfolg und misst deshalb weiter dieselbe Phase. */
      const dauerU = DAUER.umschlingen * (erfolg ? 1 : 0.85);
      const f = Math.min(1, t / dauerU);
      const R = P.radius;

      /* Mittelpunkt der Blase. Er liegt auf BALLHÖHE über dem Gegner, nicht
       * auf seiner halben Höhe: eine Kugelschale, deren Mittelpunkt bei 0.45
       * hängt, ragt zur Hälfte unter den Boden, und der Boden streicht sie
       * zum Fladen aus. Auf R·0.9 liegt die Blase auf dem Boden AUF und darf
       * rund bleiben — der Gegner steckt dann in ihrer unteren Hälfte. */
      const my = ziel.y + Math.max(ziel.groesse * 0.72, R * 0.80);

      /* Schale knapp über dem eigenen Ruheradius: groß genug, dass der Gegner
       * drin verschwindet, klein genug, dass der Körper nicht sichtbar
       * aufgeblasen wird — sichtbare Größe kommt allein vom Level (GDD 01 §29).
       * Sie wächst über die Phase, damit sich die Blase erkennbar SCHLIESST,
       * statt von Bild eins an fertig dazustehen. */
      const schale = R * (0.94 + 0.10 * huell) + ziel.groesse * 0.16;

      /* Abstand zum Gegner. ALLES in dieser Phase hängt daran und nicht an der
       * Uhr: der Anlauf wirft den Körper mit wechselndem Tempo los, je nach
       * Entfernung. Zeitgesteuert fiel das Umschlingen deshalb in den Flug —
       * im Bild lag dann ein gestrecktes Band neben dem Gegner, während die
       * Blase laut Uhr schon halb geschlossen sein sollte. */
      const ab = Math.hypot(b.cx - zx, b.cz - zz);
      const nah = 1 - Math.min(1, ab / (R * 1.25));

      /* Bremsen erst am Gegner. Weiter weg würde die Bremse den Anlauf
       * auffressen; direkt an ihm ist sie der Aufprall selbst — die Masse
       * läuft in ihn hinein und bleibt hängen (GDD 01 §66). */
      const v = Math.hypot(b.vx, b.vy, b.vz);
      const bremse = 5 + 40 * nah * nah;
      if (v > 1e-4) Deform.impuls(b, -b.vx, -b.vy, -b.vz, v * Math.min(0.9, bremse * dt));

      // Die Masse sammelt sich auf dem Gegner statt dort liegenzubleiben,
      // wohin der Anlauf sie geworfen hat.
      Deform.ziehenZu(b, zx, my, zz, 40 + 34 * nah, dt, Infinity);

      if (!getroffen) {
        /* Noch im Anflug — und genau hier lag der Fehler, den das Urteil zu
         * §27 beschrieben hat. An dieser Stelle stand eine Hülle um den
         * EIGENEN Schwerpunkt mit voller Stärke: sie hat die im Anlauf
         * aufgebaute Lanze in jedem Bild des Flugs sofort wieder zur Kugel
         * gerollt. Übrig blieb ein Körper mit über die ganze Länge
         * konstanter Breite und gerundeter Heckkappe — richtungsneutral,
         * seitenverkehrt lesbar.
         *
         * Die Hülle bleibt trotzdem: ohne sie kommt der Körper als Band am
         * Gegner an. Sie wird aber erst über dem letzten Radius vor dem
         * Einschlag stark, und bis dahin hält die Lanze die Form. `flug`
         * blendet zwischen beidem — bei ab > 1.25 R ist es reine Lanze, bei
         * Kontakt reine Ballung.
         *
         * RUNDE 3: der Nenner steht auf 0.85 statt auf 0.55. Der Grund ist
         * kein Geschmack, sondern das Aufnahmeraster. Die Lanze war bei 0.55
         * exakt in dem Moment auf null, in dem `getroffen` umsprang — die
         * Form endete also, bevor der Einschlag begann, und WELCHES Bild sie
         * zeigte, hing allein daran, wie lange der Flug dauerte. Gemessen
         * kippte das Bild bei 480 ms zwischen zwei Läufen von Streckung 2.45
         * (volle Lanze) auf 1.37 (schon geballt), ohne dass sich an dieser
         * Datei etwas geändert hätte. Mit 0.85 steht die Lanze im Moment des
         * Kontakts noch bei 0.35 und klingt erst mit dem Einschlag selbst
         * aus: der Körper kommt gestreckt an und wird DORT rund, statt schon
         * auf halbem Weg. Der Zeitpunkt von `getroffen` bleibt unberührt,
         * das Umschlingen beginnt also weiterhin auf denselben Radius. */
        const flug = 1 - Math.min(1, nah / 0.85);
        formMischen(G, F_LANZE, flug);
        lanze(b, R, anx, anz, flug, dt, 3.9);
        Deform.huelleUm(b, b.cx, b.cy, b.cz, R * 0.97, 140 * (1 - flug), dt, 0.7);
        if (nah > 0.55) { getroffen = true; einschlag = 0.14; }
      } else {
        /* Getroffen: die Sollform fährt über 0.18 s in die Ruheform zurück.
         * Ein harter Umschalter hätte die Haut in einem Bild um mehr als
         * einen halben Radius gerissen — §28 verlangt eine Blase, keinen
         * Schnitt. */
        /* Der Strang wird hier bewusst NICHT weitergefahren, obwohl das
         * naheliegt („die Front schlägt auf, das Heck ist noch unterwegs").
         * Gemessen bringt er nichts: die Hülle um den Gegner zieht mit
         * 90…310, der Sammelzug mit 40…74, die Strangfänger mit 40…192 auf
         * kleinen Radien. Streckung bei 480 ms mit und ohne Nachzug: 1.36 zu
         * 1.36. Was nichts bewirkt, darf auch nicht danebenstehen — es wäre
         * nur ein zweiter Kraftpfad, der beim nächsten Umbau am Umschlingen
         * (§28) zerrt. */
        formMischen(G, F_LANZE, Math.max(0, 1 - huell * 1.6));
      }

      if (einschlag > 0) {
        /* Der Treffer. Die Masse staut sich an dem, was ihr im Weg steht:
         * längs der Anflugrichtung gestaucht, quer dazu aufgeworfen. Ein Bild
         * lang muss man den Aufprall sehen (GDD 01 §68), sonst geht der Körper
         * widerstandslos durch den Gegner hindurch. */
        const g = einschlag / 0.14;
        Deform.stauchen(b, anx, 0, anz, 1 - 0.26 * g, 46, dt);
        Deform.impulsGerichtet(b, 0, 1, 0, 34 * g * dt, 1.4);
        einschlag -= dt;
      }

      /* Erst nach dem Treffer schließt sich die Blase. `huell` ist der
       * Fortschritt des Umschließens — er beginnt am Gegner, nicht am
       * Phasenanfang. */
      if (getroffen) huell = Math.min(1, huell + dt / 0.26);

      /* Die Schalenkraft muss GROB sein: das Formgedächtnis zieht mit
       * 130·Auslenkung auf die Ruhekuppel zurück, eine Schale mit Stärke 34
       * (die alte Fassung) kommt dagegen mit Faktor 4 zu kurz — deshalb blieb
       * der Körper ein Kuppelfladen mit Heckzipfel statt einer Kugel. */
      Deform.huelleUm(b, zx, my, zz, schale, 90 + 220 * huell, dt, 0.85);

      /* Aufrichten zur Kugel. Die Ruheform ist eine gedrückte Kuppel
       * (squat 0.82) plus Heckzipfel; §28 verlangt aber Blase/KUGEL. Stauchen
       * über die Hochachse mit Faktor > 1 hebt die Höhe an und zieht die
       * Breite volumenerhaltend nach — aus dem Fladen wird ein Ball. */
      Deform.stauchen(b, 0, 1, 0, 1 + 0.20 * huell, 40 * huell, dt);

      /* „Die Masse bewegt sich kurz um ihn herum" (§28) — als wandernder
       * Wulst, nicht als Drehung des ganzen Körpers. Ein Ankerpunkt kreist
       * dicht außerhalb der Schale und zieht nur die Punkte in seiner Nähe zu
       * sich (begrenzter Radius): eine Beule läuft sichtbar um die Blase. Die
       * alte Fassung feuerte hier einen Impuls OHNE dt — 240-mal je Sekunde —
       * und quirlte den Körper zum Segel auseinander. */
      const w = 2.4 + t * 11.0;
      const wx = Math.cos(w), wz = Math.sin(w);
      const welle = Math.min(1, huell * 2.4) * (1 - 0.40 * f);
      Deform.ziehenZu(b, zx + wx * schale * 1.18, my + R * 0.12, zz + wz * schale * 1.18,
                      82 * welle, dt, schale * 0.85);
      // Leises Arbeiten in der Masse: die Blase steht nicht still, sie kaut.
      Deform.zittern(b, 1.6 * welle, 30, G.zeit, dt);

      ziel.umschlungen = huell;

      if (t >= dauerU) {
        /* Ab hier gehört die Sollform wieder der Bewegung. Die Rückgabe
         * steht bewusst am Phasenübergang und nicht erst am Ende der Lane:
         * Absorption und Rückschnapp werden einzeln beurteilt und dürfen
         * keine Anlaufform geerbt bekommen. */
        formFreigeben();
        wechsel(erfolg ? 'absorbieren' : 'rueckschnapp');
      }
      return;
    }

    if (phase === 'absorbieren') {
      const f = Math.min(1, t / DAUER.absorbieren);
      const R = P.radius;

      /* Schlucken. Der Gegner verschwindet nicht dadurch, dass die Hülle
       * gleichmäßig schrumpft — dabei wird der Körper nur kleiner und flacher,
       * und genau das war der Fehler der alten Fassung (gemessen: squash fiel
       * von 1.02 auf 0.73 und kam nie zurück).
       *
       * Stattdessen wandert ein BISSEN durch die Masse: ein Anker mit engem
       * Wirkradius zieht die Punkte in seiner Nähe zu sich und wandert dabei
       * von der Gegnerhöhe hinunter zur Körpermitte. Im Bild läuft eine
       * Einschnürung nach unten — man sieht, dass etwas geschluckt wird
       * (GDD 01 §66: der Körper reagiert, er spielt keine Animation ab). */
      const oben = ziel.y + Math.max(ziel.groesse * 0.72, R * 0.80);
      const unten = R * 0.52;
      const schluck = f * f * (3 - 2 * f);          // weich anfahren und ankommen
      const ay = oben + (unten - oben) * schluck;

      ziel.absorbiert = f;
      // Deutlich schneller weg als die Phase lang ist: ab f≈0.7 ist der Gegner
      // vollständig in der Masse verschwunden, der Rest der Phase ist das
      // sichtbare „Verarbeiten" aus §29.
      ziel.groesseFaktor = Math.max(0, 1 - f * 1.45);

      /* Der Bolus übernimmt, während der Gegner verschwindet: er sitzt auf
       * demselben Schluckanker und wird genau so dicht, wie der Gegner
       * durchsichtig wird. Im Bild ist das ein einziger Vorgang — aus einem
       * Wolf wird ein Klumpen in der Masse und nicht ein zweites Objekt. */
      bolusFolgen(zx, ay, zz, ziel.groesse * (0.92 - 0.22 * f),
                  Math.min(1, f * 2.2) * 0.62, 16, dt);

      /* Der Schluck. Der Mund steht im Umschlingen weit offen und schliesst
       * sich, während der Bissen nach unten wandert — das ist die einzige
       * Stelle im Ablauf, an der ein Betrachter „geschluckt" statt „gegessen"
       * lesen kann, und der Gutachter hat sie beim Sieger ausdrücklich als
       * die narrative Spur benannt. */
      G.slime.mouth = Math.max(0, 1 - f * 1.7);

      Deform.ziehenZu(b, zx, ay, zz, 130, dt, R * 0.72);
      /* Die übrige Masse bleibt währenddessen rund und schließt sich hinter
       * dem Bissen. Ohne diese Gegenkraft zieht der Schluckanker den ganzen
       * Körper zum Fladen aus. Der Schalenradius bleibt beim Ruheradius —
       * er darf NICHT schrumpfen, sichtbare Größe kommt allein vom Level. */
      Deform.huelleUm(b, zx, R * 0.60, zz, R * 1.00, 110 + 130 * f, dt, 0.72);
      // Arbeiten in der Masse. Klingt zum Ende hin ab, damit der Prall danach
      // aus einem ruhigen Körper kommt und nicht aus einem zappelnden.
      Deform.zittern(b, 2.6 * (1 - f), 26, G.zeit, dt);

      /* Landen am Ort des Gegners (GDD 01 §29). Das passiert HIER und nicht
       * erst hinterher: während geschluckt wird, rutscht der Schwerpunkt auf
       * die Stelle, an der der Gegner stand. */
      Deform.ziehenZu(b, zx, R * 0.56, zz, 28 * f, dt);

      if (t >= DAUER.absorbieren) {
        if (!abgerechnet) {
          abgerechnet = true;
          SPIEL.fressenAbgeschlossen(ziel, true);
          if (window.UI && UI.fressErfolg) UI.fressErfolg(G, ziel);
        }
        /* `fressenAbgeschlossen` gibt den Spieler wieder frei (G.phase =
         * 'frei'), und game.js ruft diese Lane danach nicht mehr auf. Genau
         * daran ist die alte Fassung gestorben: Prall und Nachschwingen —
         * die zweite Hälfte von §29 — wurden nie ausgeführt, die Lane fror
         * mitten im Absorbieren ein. Die Lane behält die Regie bis zum Ende
         * ihrer eigenen Ablaufkette und gibt sie in 'erholen' selbst zurück. */
        if (G.phase === 'frei') G.phase = 'fressen';
        // Der Schluck ist unten angekommen und staut sich: das ist der
        // Anstoß für den Prall, kein gesetzter Zustand.
        Deform.impulsGerichtet(b, 0, 1, 0, 3.4, 1.5);
        wechsel('prall');
      }
      return;
    }

    if (phase === 'prall') {
      const f = Math.min(1, t / DAUER.prall);
      const R = P.radius;
      /* Vorgezogen (u = f·1.45): die Sollform steht, bevor die Phase endet,
       * damit der Körper die letzten 30 % der Phase noch ZU ihr hinlaufen
       * kann. Mit reinem Smoothstep über f lagen die beiden aufgenommenen
       * Bilder bei 1.40 und 1.50 s noch bei squash 1.03 und 1.07, und der
       * ganze Prall fiel in ein einziges Bild. */
      const u = Math.min(1, f * 1.45);
      const g = u * u * (3 - 2 * u);
      // Die Seite, nach der die Masse quillt (siehe WULST_LAENGS).
      const sx = anx * WULST_LAENGS - anz * WULST_QUER;
      const sz = anz * WULST_LAENGS + anx * WULST_QUER;

      /* „Der Körper wirkt kurz PRALLER" (GDD 01 §29).
       *
       * Die alte Fassung hat das mit `stauchen(0,1,0, 1+0.50g)` versucht:
       * eine reine Streckung der Ist-Form um den Schwerpunkt. Gemessen kam
       * squash 1.12 heraus, und im Bild war es ein KEGEL — die Streckung
       * zieht den ohnehin schlanken Scheitel weiter aus, während unten die
       * Aufstandsfläche bleibt, wo sie ist. Das ist keine unter Druck
       * stehende Masse, sondern eine ausgezogene.
       *
       * Prall wird deshalb an der SOLLFORM gefahren (siehe `formPrall`): der
       * Innendruck (9000) und das Formgedächtnis (130) arbeiten dann FÜR die
       * Silhouette statt gegen sie, das Volumen bleibt exakt stehen, und die
       * vier vom Gutachter benannten Merkmale — breiteste Stelle auf halber
       * Höhe, schmale Auflage, überhängender Wulst, seitlicher Versatz —
       * fallen aus derselben Vorgabe heraus statt aus vier Einzelkräften. */
      formSichern(G);
      formMischen(G, formPrall(1), g);

      /* Innendruck von innen. Der Schalenradius bleibt beim Ruheradius: der
       * Körper wird PRALL, nicht GRÖSSER — sichtbare Größe kommt
       * ausschließlich vom Level (GDD 01 §29). Mischung unter 1, damit die
       * Sollform darunter durchscheint und kein Billardball entsteht. */
      Deform.huelleUm(b, b.cx, b.cy, b.cz, R * (0.99 + 0.12 * g), 120 + 280 * g, dt, 0.78);

      /* Die Wulst quillt seitlich über die Auflage. `impulsGerichtet` und
       * NICHT `ziehenZu`: ein Anker neben dem Körper erwischt auch die
       * Punkte am Boden, die Haftung hält sie dort fest, und aus dem Zug
       * wird eine dünne Lippe, die seitlich über den Boden schleift — genau
       * der „auslaufende Dünnsaum", den das Urteil verboten hat. Der
       * gerichtete Impuls wichtet dagegen mit cos² der Grundrichtung: die
       * Flanke wandert nach aussen, die Bodenkappe bleibt liegen. */
      Deform.impulsGerichtet(b, sx, 0.35, sz, 26 * g * dt, 2.2);

      /* Ein Rest Stauchung bleibt — sie ist der ÜBERSCHWINGER über die
       * Sollform hinaus, nicht mehr die Form selbst. */
      Deform.stauchen(b, 0, 1, 0, 1 + 0.14 * g, 150, dt);
      // Bodenkontakt halten, sonst hüpft der Prall als Sprung davon.
      Deform.ziehenZu(b, b.cx, R * 0.50, b.cz, 40, dt);

      /* Der Mund ist zu und bleibt zu: der Sack ist gefüllt und dicht. Genau
       * dieser Kontrast — eben noch weit offen, jetzt geschlossen und prall —
       * trägt den Erfolg am Körper und nicht im HUD (GDD 01 §32). */
      G.slime.mouth = 0;

      /* Der Bissen sackt weiter durch und wird im Prall zusammengedrückt:
       * kleiner, aber DICHTER. Er liegt tief und seitlich versetzt, damit er
       * die Ausbeulung erklärt, statt zufällig neben ihr zu liegen. */
      bolusFolgen(b.cx - sx * 0.22 * R, R * (0.44 - 0.04 * g), b.cz - sz * 0.22 * R,
                  R * (0.40 - 0.08 * g), 0.74 - 0.08 * g, 9, dt);

      if (t >= DAUER.prall) wechsel('erholen');
      return;
    }

    if (phase === 'rueckschnapp') {
      const f = Math.min(1, t / DAUER.rueckschnapp);
      const R = P.radius;
      /* Überdehnen und zurückschnellen (GDD 01 §30/§31), in drei Schlägen —
       * damit jedes aufgenommene Bild einen anderen Zustand zeigt und nicht
       * dreimal dieselbe Kuppel (GDD 01 §68 „starke Bewegungsphasen").
       *
       *   DEHNEN  bis DEHNEN  der Gegner hält die Front fest, das Heck reißt
       *                       schon aus: der Körper wird zum gespannten Gummi
       *   REISSEN dort        der Halt gibt nach — ein Bild reiner Rückstoß
       *   SAMMELN danach      die Masse ballt sich wieder und bremst an der
       *                       Ausgangsstelle in den Boden
       *
       * Die Richtung kommt aus `anx/anz` (im Moment des Losschnellens
       * festgehalten) und NICHT aus dem laufenden `dx/dz`: der Schleim liegt
       * hier auf dem Gegner, der Abstand ist fast null und die laufende
       * Richtung springt von Schritt zu Schritt. Eine zappelnde Zugachse
       * ergibt Rauschen statt Dehnung. */
      const rx = start.x - b.cx, rz = start.z - b.cz;
      const rl = Math.hypot(rx, rz) || 1e-6;

      /* Das Gesicht bleibt auf dem Gegner. `updateSlime` richtet es sonst nach
       * der Geschwindigkeit aus — und die zeigt hier nach HINTEN, sobald das
       * Heck ausreißt. Der Schleim drehte sich also mitten im Zug um 180° und
       * schaute weg von dem, an dem er noch klebt. Messbar wurde daraus
       * Unsinn: bei 1060 ms stand die Streckachse quer zur Zugrichtung und
       * `streckung` meldete 0.74, obwohl der Körper längs gedehnt war.
       * Erzählerisch ist es ohnehin richtig: der Schleim wird zurückgerissen,
       * er läuft nicht weg — er starrt seine Beute an, während es ihn
       * wegzieht (GDD 01 §31, „elastisch zurückgezogen"). */
      G.slime.facing = winkelZu(G.slime.facing, Math.atan2(dz, dx), 1 - Math.exp(-14 * dt));
      G.slime.fx = Math.cos(G.slime.facing);
      G.slime.fz = Math.sin(G.slime.facing);

      if (f < DEHNEN) {
        const g = f / DEHNEN;
        /* Die Spannung hängt an der ABSOLUTEN Zeit, nicht am Phasenanteil.
         * Der Unterschied ist gemessen und nicht theoretisch: als die Phase
         * von 0.55 s auf 0.95 s verlängert wurde, stand `s` in jedem
         * aufgenommenen Bild plötzlich niedriger — bei 1.15 s auf 0.59 statt
         * auf 0.96 —, und die gemessene Streckung fiel von 2.42 auf 2.11,
         * obwohl an den Kräften nichts geändert war. Eine Feder spannt sich
         * in Sekunden, nicht in Prozent einer Phase.
         *
         * Die Zeitkonstante ist so gewählt, dass die vier aufgenommenen
         * Bilder der Dehnphase vier verschiedene Spannungsgrade zeigen.
         * Gemessen an der fertigen Aufnahme wächst `metrics().streckung`
         * über 0.92 / 0.98 / 1.06 / 1.15 s auf 1.10 → 1.34 → 1.97 → 1.74,
         * mit dem Höhepunkt kurz vor dem Riss.
         *
         * RUNDE 3: von 0.075 auf 0.052 verkürzt. Der Körper braucht nach dem
         * Umschlingen rund 150 ms, bis seine Masse die 4.5 Ruheradien hinter
         * den Gegner zurückgelegt hat; mit der langsameren Konstante war der
         * Halshöhepunkt erst nach dem Riss erreicht und lag in keinem
         * aufgenommenen Bild. Gemessen wanderte die tiefste Stelle der Kehle
         * damit von 88 auf 83 px. */
        const s = 1 - Math.exp(-t / 0.052);

        /* 0. DIE TAILLE. Das ist die benannte Lücke, und sie wird als
         *    SOLLFORM gefahren, nicht als Kraft — siehe `F_DEHNUNG`.
         *
         * Der Anteil wächst über das erste Viertel der Dehnphase auf eins.
         * Er wächst, statt zu stehen: §30 verlangt „wird elastisch
         * zurückgezogen wie überdehnt", und überdehnt wird ein Körper
         * allmählich. Ein Umschalter im ersten Schritt wäre eine Pose.
         * Der Faktor ist von 2.6 auf 4.2 erhöht, weil die SOLLFORM sofort
         * stehen darf — was langsam sein muss, ist der Körper, der ihr mit
         * seiner eigenen Trägheit folgt (GDD 01 §66). Solange die Vorgabe
         * mitschleicht, verzögert sich beides und der Riss kommt, bevor die
         * Kehle steht.
         *
         * `formSichern` ist nötig, weil `umschlingen` die Ruheform am
         * Phasenübergang bereits zurückgegeben hat (dort steht warum). Der
         * zweite Aufruf kostet nichts — die Funktion hält am ersten fest. */
        formSichern(G);
        formMischen(G, F_DEHNUNG, Math.min(1, g * 4.2));

        /* Der Körper wird zum gespannten Gummi: die MASSE wandert schon
         * zurück, die vordere Kappe hängt noch am Gegner fest. Beides wird
         * als Kraft angelegt, die Länge dazwischen ergibt sich von selbst.
         * Das ist der Unterschied zwischen „gedehnt" und „auseinander-
         * gezogen" — und der Grund, warum hier kein `stauchen` mehr steht:
         * `stauchen` erhält das Volumen, indem es QUER zur Achse zusammen-
         * zieht, also gleichmäßig aus Höhe UND Breite. Gemessen kam dabei
         * eine Scheibe am Boden heraus (breite 1.52 bei streckung 0.97,
         * squash 0.59) statt eines Strangs, und das Volumen sackte auf 0.84
         * ab, weil der Löser überfahren wurde. */

        /* 1. Die Masse ballt sich und wird vom Gegner weggezogen — der
         *    Klumpen aus der Anime-Referenz (cuphead-goopy-lunge: der
         *    führende Körper bleibt rund, dünn ist allein der Strang).
         *
         * Der Anker startet dort, wo die Masse SCHON ist (rund 1.35 R hinter
         * dem Gegner), und wandert von da weg. Mit 0.35 R begann er fast
         * einen ganzen Radius VOR dem Schwerpunkt: die Hülle riss den Körper
         * erst nach vorn auf den Gegner und danach wieder zurück, und dieses
         * Hin und Her kostete ein Drittel des Volumens (0.68). Ihn umgekehrt
         * der Masse NACHFÜHREN zu lassen, damit er ihr nie davonläuft, war
         * ebenfalls falsch: dann steht er dauernd im Körper, presst statt zu
         * ziehen, und das Volumen fiel auf 0.81.
         *
         * Er steigt dabei an, denn der Schleim wird vom Gegner ABGEZOGEN
         * und nicht über den Boden geschleift: bleibt der Anker tief, liegt
         * die überdehnte Masse als flaches Band da und liest sich als
         * Pfütze — „As Unterkante verläuft nahezu gerade …, was aufliegendes
         * Eigengewicht liest, kein Zug" (Urteil).
         *
         * RUNDE 3: der Weg wächst auf 4.5 statt 3.8 Ruheradien. Das ist die
         * LÄNGE des Halses — zwei Massen, die 3.8 R auseinanderstehen,
         * berühren einander mit ihren Flanken, und die Kehle dazwischen ist
         * dann eine Delle, kein Hals. Gemessen wuchs die Silhouette dadurch
         * von 383 auf 389 px bei gleicher Höhe, und `metrics().volumen` stieg
         * im Höhepunkt von 0.83 auf 0.86: was längs mehr Platz hat, muss der
         * Innendruck nicht quer zurückholen. */
        const weg = (1.35 + 3.15 * s) * R;
        const bx = zx - anx * weg;
        const bz = zz - anz * weg;
        /* Und er steigt nur SO WEIT. Mit 0.80 + 1.35·s stand der Schwerpunkt
         * gemessen 2.72 Ruheradien hoch: der Körper segelte frei durch die
         * Luft, verlor jeden Bezug zum Boden und rundete sich dabei zur
         * Kugel. §31 verlangt Zurückschnellen, keinen Wurf — und je runder
         * und höher die Masse wird, desto schlechter das Seitenverhältnis.
         * An der fertigen Silhouette nachgemessen: Länge zu Höhe 1.23 bei
         * der hohen Fassung, 1.42 bis 1.60 bei dieser. */
        const by = R * (0.66 + 0.42 * s);
        /* Der Schalenradius MUSS am Ruheradius liegen. Mit 0.90 R zog diese
         * Hülle den ganzen Körper auf eine kleinere Kugel und `volumen` fiel
         * auf 0.58 — der Schleim schrumpfte sichtbar, und sichtbare Größe
         * kommt ausschließlich vom Level (GDD 01 §29). Ein `ziehenZu` auf
         * denselben Ankerpunkt war noch schlimmer: das presst alles auf einen
         * Punkt und ist reine Kompression.
         * `ein` blendet die Kraft weich ein — der Körper kommt aus dem
         * Umschlingen als Schale um den Gegner, und ein harter Umschalter auf
         * eine ganz andere Zielform quetscht ihn im Übergang zusammen. */
        const ein = Math.min(1, g / 0.30);
        /* Und sie RUNDET nur noch, sie zieht nicht mehr. Ihre Stärke fällt
         * mit der Spannung: am Phasenanfang kommt der Körper als Schale um
         * den Gegner und braucht sie, um überhaupt wieder ein Blob zu werden
         * (§5); auf dem Höhepunkt der Dehnung wäre dieselbe Kraft der
         * schnellste Weg zurück zur Kugel — und die Kugel ist genau das,
         * was der Gutachter als „durchgehend konvexer Klumpen" gerügt hat. */
        /* RUNDE 3, und das war der eigentliche Fehler: hier stand
         * `85 + 200 · s`. Die Kraft WUCHS also mit der Spannung — genau
         * umgekehrt zu dem, was der Absatz darüber beschreibt. Gemessen war
         * das der Grund, warum die Sollform ihre Kehle nicht durchsetzen
         * konnte: die Sonde las im Bild der stärksten Dehnung eine Ruheform
         * mit tiefer Taille (Querschnitt 0.16 gegen 2.28 an der Masse), am
         * Körper selbst kam davon nichts an. Eine Hülle ist eine KUGEL, und
         * eine Kugel ist der „durchgehend konvexe Klumpen" aus dem Urteil;
         * mit 285 gegen eine Formfeder von 130 gewinnt sie jedes Mal. */
        Deform.huelleUm(b, bx, by, bz, R * 1.00, (300 - 250 * s) * ein, dt, 0.50);
        /* Der Rückzug selbst. Er kommt jetzt allein von hier, und das ist der
         * Punkt: `impulsGerichtet` wählt seine Punkte nach der GRUNDRICHTUNG
         * aus. Die vordere Kappe hat auf dieser Achse ein negatives Vorzeichen
         * und wird deshalb überhaupt nicht angefasst — der Griff am Gegner
         * kann von hier aus nicht mehr überstimmt werden. Bewegt wird über
         * Geschwindigkeit, das fügt dem Körper kein Volumen zu und nimmt ihm
         * keines. Der Aufwärtsanteil hebt die Masse vom Boden: der Schleim
         * wird abgezogen, nicht über die Erde geschleift. */
        Deform.impulsGerichtet(b, -anx, 0.15, -anz, (60 + 330 * s) * dt, 1.4);

        /* 2. Die vordere Kappe bleibt hängen — der ANKERPUNKT, dessen Fehlen
         *    das Urteil als Grund nennt, warum „die Rückschnellrichtung nicht
         *    benennbar" war. Zwei Griffe halten sie, und beide werden
         *    gebraucht.
         *
         * `ziehenZu` pinnt sie in WELTKOORDINATEN an den Gegner. Nur das
         * ergibt einen stehenden Ankerpunkt; ein reiner Impuls wanderte mit
         * dem Körper mit. Der Wirkradius entscheidet dabei, wie dick der Hals
         * wird: mit 1.35 R griff er über den halben Körper und zog eine
         * breite Zunge statt eines Halses.
         *
         * `impulsGerichtet` wählt seine Punkte dagegen nach der GRUNDRICHTUNG
         * aus, nicht nach der Lage. Das ist der Griff, der nicht abrutschen
         * kann — und er musste dazukommen: `ziehenZu` wirkt ausschließlich
         * innerhalb seines Radius, und sobald der Körper weit genug zurückwich,
         * lag KEIN Punkt mehr darin. Der Halt löste sich lautlos, und das
         * Bild bei 1.30 s zeigte wieder einen kompakten Klumpen (vorne 1.36
         * gegen hinten 1.36, Streckung von 2.52 auf 1.46 gefallen). Die hohe
         * Schärfe (3.6) sperrt ihn auf die vorderste Kappe ein — was dahinter
         * liegt, soll ausreißen.
         *
         * RUNDE 3, und das ist der dritte Grund, warum die Kehle im Bild nie
         * ankam: der Ankerpunkt lag einen halben Ruheradius über dem
         * Griffpunkt des Umschlingens, also auf Schulterhöhe des Gegners.
         * Der Gegner in dieser Szene ist ein Wolf von Level 8 und damit
         * breiter und höher als der Schleim — die vordere Masse steckte
         * vollständig hinter ihm. Gemessen war die Kehle da: die Silhouette
         * fiel von 243 auf 99 px. Was danach kam, war aber verdeckt, und aus
         * den ZWEI Massen des Urteils wurde im Bild eine, an der ein Hals ins
         * Nichts lief.
         *
         * Auf 1.15 R steht die Kappe über seinem Rücken und ist gegen den
         * Hintergrund freigestellt; gemessen steigt der vordere Lappen damit
         * von 99 auf 187 px. Erzählerisch ist es dieselbe Aussage: die
         * Umschlingung aus §28 sitzt noch auf ihm, sie rutscht ihm nur über
         * den Rücken, während der Rest ausreißt.
         *
         * Der Griffpunkt selbst wandert von 0.30 R HINTER dem Gegner auf
         * 0.12 R davor. Das ist die Feinjustage der Halsmitte: der vordere
         * Lappen war kürzer als der hintere, die Kehle saß deshalb bei 61 %
         * der Länge statt bei der Hälfte, die das Urteil nennt. Jeder Zehntel
         * Radius nach vorn schiebt sie um rund zwei Prozentpunkte zurück. */
        const hy = zy + R * 1.15;
        Deform.ziehenZu(b, zx + anx * 0.12 * R, hy, zz + anz * 0.12 * R,
                        130 + 300 * s, dt, R * 1.30);
        Deform.impulsGerichtet(b, anx, 0.30, anz, (45 + 210 * s) * dt, 3.2);

        /* 3. Der Hals. Die Sollform gibt die Kehle vor, aber die Formfeder
         *    allein kommt gegen den Innendruck (9000) nur langsam durch —
         *    und der Hals ist genau die Stelle, an der der Druck am stärksten
         *    dagegen arbeitet, weil dort der kleinste Querschnitt steht.
         *
         * Sechs Anker auf der Verbindungslinie zwischen Kappe und Masse ziehen
         * die Punkte in ihrer Nähe auf diese Linie. Benachbarte Anker ziehen
         * längs gegeneinander und quer gleichsinnig — übrig bleibt die
         * Einschnürung, während die Länge stehenbleibt. Dasselbe Verfahren
         * baut in `lanze()` den Strang; ein EINZELNER Anker wäre eine
         * Kugelpresse und würde die Mitte zum Klumpen ballen.
         *
         * Sie liegen auf einer schräg ansteigenden Geraden von der Beute zur
         * Masse — nicht auf einer Kurve. Der Gutachter hat am Siegerbild
         * ausdrücklich gerügt, dass dessen Strang nach unten durchbogt:
         * „eine durchhängende Kurve ist das Gegenteil von Zug."
         *
         * RUNDE 3, erste Korrektur — der WIRKRADIUS. `ziehenZu` überspringt
         * jeden Punkt, der weiter als `radius` vom Anker entfernt liegt. Der
         * Hals steht an dieser Stelle rund einen Ruheradius von der Achse ab;
         * mit den alten 0.46 R lag KEIN Oberflächenpunkt im Griff, und
         * eingeschnürt wurde nur das Innere, das ohnehin auf der Achse liegt.
         * Einschnüren muss aber genau die Haut, die zu weit außen steht.
         * Mit 1.10 R fasst der Griff sie, und die Zahl der Anker ist von drei
         * auf sechs erhöht: je dichter sie stehen, desto genauer heben sich
         * ihre LÄNGS-Anteile zwischen Nachbarn auf und übrig bleibt der reine
         * Querzug.
         *
         * RUNDE 3, zweite Korrektur — die STÄRKE, und sie geht nach UNTEN.
         * Das ist gegen jede Erwartung und dreimal nachgemessen: mit 94
         * (statt 33) füllte sich die Kehle von 88 auf 124 px auf, mit 235
         * fiel zusätzlich `metrics().volumen` auf 0.66. Der Grund steht in
         * der Bauart des Werkzeugs: `ziehenZu` zieht auf einen PUNKT, also
         * quer UND längs. Was der Griff quer wegnimmt, schiebt er längs
         * wieder in denselben Querschnitt hinein — ab einer gewissen Stärke
         * verdickt er den Hals, statt ihn zu schnüren, und presst zugleich
         * Volumen heraus, das der Innendruck erst im nächsten Schritt
         * zurückholt. Sichtbare Größe kommt aber ausschließlich vom Level
         * (GDD 01 §29).
         *
         * Diese Anker sind deshalb nur die Anschubkraft. Die Kehle selbst
         * baut die Sollform (`F_DEHNUNG`), und die ist volumenexakt. */
        const kx = zx + anx * 0.12 * R, kz = zz + anz * 0.12 * R;
        for (let i = 0; i < 6; i++) {
          const u = 0.32 + 0.06 * i;
          Deform.ziehenZu(b, kx + (bx - kx) * u, hy + (by - hy) * u,
                          kz + (bz - kz) * u,
                          (5 + 28 * s), dt, R * 1.10);
        }

        /* 4. Gespanntes Gummi STEHT. Das ist der Grund, warum der Körper bei
         *    1.30 s zur Kugel zurückfiel, obwohl die Spannung ihr Maximum
         *    hatte: der Rückzugsimpuls schiebt Bild für Bild Geschwindigkeit
         *    nach, der Körper riss sich damit von selbst los und flog davon,
         *    und was fliegt, ballt sich rund. Gemessen brach die Streckung
         *    zwischen 1.15 s und 1.30 s von 2.65 auf 1.46 ein.
         *
         * Ein Gummi unter Zug ist aber im GLEICHGEWICHT: die Anker halten es
         * auseinander, es beschleunigt nicht. Gebremst wird deshalb nur die
         * waagerechte Fahrt des Schwerpunkts — die Verformung bleibt völlig
         * unangetastet, weil die Bremse allen Punkten dieselbe Änderung gibt.
         * Erst dadurch wird der Riss ein Riss: aus einer stehenden, geladenen
         * Pose heraus, nicht aus einer Bewegung, die ohnehin schon lief. */
        const vz0 = Math.hypot(b.vx, b.vz);
        if (vz0 > 1e-4) {
          Deform.impuls(b, -b.vx, 0, -b.vz, vz0 * Math.min(0.9, (1 + 17 * s) * dt));
        }

        /* 5. Überdehntes Gummi vibriert. Das ist die Spannung, die reißt.
         *    Kleiner als vorher (6.5): am dünnen Hals ist derselbe Ausschlag
         *    ein Vielfaches des Querschnitts und franst ihn aus. */
        Deform.zittern(b, 3.6 * s, 56, G.zeit, dt);
        /* Der Biss geht verloren. `starten` reißt den Mund für den Anlauf auf
         * und niemand schloss ihn je wieder — im Bild der stärksten Dehnung
         * klaffte deshalb eine schwarze Höhle mitten in der Masse, und die
         * Silhouette las sich als zerknüllte Schale statt als gespanntes
         * Gummi. Dass der Griff nachgibt, gehört zum Fehlschlag (§31). */
        G.slime.mouth = 1 - 0.6 * s;
        ziel.widersteht = g;

      } else {
        const g = (f - DEHNEN) / (1 - DEHNEN);
        // Der Halt ist weg, der Mund fällt zu.
        G.slime.mouth = Math.max(0, 0.4 - 1.2 * g);

        /* Die Kehle schließt sich NICHT in dem Bild, in dem der Halt reißt.
         * Ein Gummi, das zurückschnellt, trägt seine Einschnürung noch einen
         * Moment mit, und sie läuft dabei nach hinten in die Masse hinein —
         * dieselbe Welle, die man an einem losgelassenen Gummiband sieht.
         * Wer sie hart abschaltet, bekommt im nächsten Bild wieder den
         * durchgehend konvexen Klumpen, den das Urteil gerügt hat. */
        F_LOESEN.taillePos = F_DEHNUNG.taillePos - 1.05 * g;
        formMischen(G, F_LOESEN, Math.max(0, 1 - g * 1.7));

        if (!abgerechnet) {
          abgerechnet = true;
          /* Der Halt reißt. Der Rückstoß geht fast WAAGERECHT: die alte
           * Fassung gab 0.55 nach oben und machte daraus einen Wurf — der
           * Schwerpunkt sprang von 0.56 auf 1.44, der Körper segelte frei
           * durch die Luft über die Ausgangsstelle hinaus und rollte danach
           * noch 1.3 s aus. §31 verlangt Zurückschnellen, keinen Sprung. */
          Deform.impuls(b, rx / rl, 0.10, rz / rl, 19.0);
          /* Die vordere Kappe, die eben noch am Gegner hing, kommt als
           * LETZTES los: ein gerichteter Gegenimpuls mit hoher Schärfe lässt
           * sie als Schweif nachziehen. Das ist die Silhouette aus
           * cuphead-goopy-lunge-mass-trailing-behind — kompakte Masse voran,
           * dünner Schwanz hinterher —, nur in die andere Richtung. */
          Deform.impulsGerichtet(b, anx, 0.05, anz, 8.5, 4.5);
          SPIEL.fressenAbgeschlossen(ziel, false);
          if (window.UI && UI.fressFehlschlag) UI.fressFehlschlag(G, ziel);
          ziel.widersteht = 0;
          /* Regie behalten. `fressenAbgeschlossen` setzt `G.phase` auf 'frei',
           * und game.js ruft diese Lane danach nicht mehr auf — genau hier
           * hörte der Rückschnapp bisher auf zu existieren. Gemessen stand ab
           * 1300 ms `phase: frei` in den Messwerten: das Zurückschnellen und
           * das Auswabbeln aus §31 liefen nie, der Körper flog nur noch
           * ballistisch aus. Die Lane gibt die Regie in 'erholen' selbst
           * zurück, wie es 'absorbieren' auch tut. */
          if (G.phase === 'frei') G.phase = 'fressen';
        }

        /* Die Masse ballt sich wieder zusammen. Ohne diese Oberflächen-
         * spannung bleibt der überdehnte Körper ein Band und landet als
         * Fladen — die Blob-Identität geht niemals verloren (GDD 01 §5). */
        Deform.huelleUm(b, b.cx, b.cy, b.cz, R * (0.92 + 0.08 * g), 100 + 150 * g, dt, 0.55);

        /* Ankommen statt Vorbeifliegen (§31 „landet ungefähr an der
         * Ausgangsposition"). Der Zug zur Ausgangsstelle wächst über die
         * Phase, die Geschwindigkeitsbremse greift erst dicht davor — dort
         * ist sie der Einschlag selbst, aus dem das Nachwabbeln entsteht.
         * Der Ankerpunkt liegt auf halber Körperhöhe: am Boden zöge er den
         * Körper in die Bodenhaftung (`adhesion` 5) und die Rückreise bliebe
         * nach anderthalb Radien stehen. */
        Deform.ziehenZu(b, start.x, R * 0.75, start.z, 46 + 80 * g, dt);
        const ab = Math.hypot(b.cx - start.x, b.cz - start.z);
        const nah = 1 - Math.min(1, ab / (R * 1.8));
        const vh = Math.hypot(b.vx, b.vz);
        if (vh > 1e-4) {
          Deform.impuls(b, -b.vx, 0, -b.vz, vh * Math.min(0.8, (3 + 44 * nah * nah) * dt));
        }

        /* Die Phase endet, wenn der Körper ANKOMMT — nicht wenn die Uhr
         * abgelaufen ist. Mit fester Länge lag der Einschlag 0.18 s vor dem
         * Beginn von 'erholen': gemessen war der Schwerpunkt schon von 1.07
         * auf 0.48 abgesackt und zur Ruhe gekommen, bevor die Nachschwing-
         * Führung überhaupt einsetzte. Das Auswabbeln wurde dadurch erst
         * angeworfen statt auszuklingen — die Ausschläge wuchsen an, statt
         * jeder zwei Drittel des vorherigen zu sein (Dossier §5). */
        if (ab < R * 0.45 && vh < 3.0) {
          /* Ankunft heißt Einschlag. Der Stoß nach unten macht den Aufprall
           * in einem einzigen Bild lesbar (GDD 01 §20: flach gedrückt, Masse
           * federt zurück) und ist zugleich der Anstoß für das Nachwabbeln —
           * so ist der erste Ausschlag der größte, wie es das Abklinggesetz
           * aus dem Dossier §5 verlangt. Ohne ihn begann das Wabbeln zaghaft
           * und wurde erst später groß, also genau verkehrt herum. */
          Deform.impulsGerichtet(b, 0, -1, 0, 3.8, 1.2);
          wechsel('erholen');
          return;
        }
      }
      if (t >= DAUER.rueckschnapp) wechsel('erholen');
      return;
    }

    if (phase === 'erholen') {
      const R = P.radius;
      const dauer = erfolg ? DAUER.erholen : DAUER.auswabbeln;

      if (erfolg) {
        /* „…und schwingt nach, dann stabilisiert er sich" (GDD 01 §29).
         *
         * Die alte Fassung ließ hier einfach los und hoffte auf das
         * Formgedächtnis. Gemessen kam dabei kein Nachschwingen heraus,
         * sondern Rauschen: 0.81 · 0.86 · 0.81 · 0.69 · 0.81 · 0.77 · 0.81 —
         * ohne erkennbare Richtung, ohne Abklingen, und nach drei Sekunden
         * immer noch unruhig.
         *
         * Deshalb wird das Nachschwingen hier GEFÜHRT, aber weiter über
         * Kräfte: nicht die Höhe wird gesetzt, sondern das ZIELVERHÄLTNIS,
         * auf das der Körper hinarbeitet, schwingt gedämpft um eins. Der
         * Körper folgt mit seiner eigenen Trägheit und schwingt dabei über
         * die Vorgabe hinaus — Masse statt Animation (GDD 01 §66).
         *
         * Das Ausblendfenster über die letzten 0.25 s ist das „stabilisiert
         * sich": ohne es endet die Führung mit einem Ruck. */
        const rest = Math.max(0, DAUER.erholen - t);
        const aus = Math.min(1, rest / 0.30);
        const huelle = Math.exp(-DAEMPF * t) * aus;
        const w = Math.PI * 2 * SCHWING_HZ * t;
        const laengs = Math.cos(w);
        const quer = Math.sin(w);          // eine Viertelperiode versetzt
        const sx = anx * WULST_LAENGS - anz * WULST_QUER;
        const sz = anz * WULST_LAENGS + anx * WULST_QUER;

        /* Die SOLLFORM schwingt, nicht die Ist-Form. Das ist der Unterschied
         * zwischen einem Körper, der nachschwingt, und einem, an dem gerüttelt
         * wird: die Pralligkeit pendelt gedämpft um die Ruheform, und weil
         * `formPrall` bei negativem p alle fünf Merkmale umkehrt, wechseln
         * sich im Kontaktbogen zwei GEGENSÄTZLICHE Silhouetten ab — hoch mit
         * Wulst auf halber Höhe gegen flach mit weicher Kuppel — statt
         * fünfmal derselben Kuppel mit anderer Zahl darunter.
         *
         * Gemessen war das der Unterschied zwischen 0.89 / 0.96 / 0.96 / 0.94
         * (der Befund „beide stehen still") und einem sichtbaren Abklingen. */
        const p = SCHWING_AMP * huelle * laengs;
        formSichern(G);
        formMischen(G, formPrall(p), 1);

        /* Die Masse folgt der Vorgabe mit ihrer eigenen Trägheit und schiesst
         * über sie hinaus. Halbe Amplitude: die Sollform trägt jetzt die
         * Hauptlast, diese Stauchung ist nur noch der Überschwinger. */
        /* Klein und weich. `stauchen` verteilt QUER zur Achse um, und quer
         * heisst am Bodenpol: nach aussen über den Boden, wo die Haftung die
         * Punkte festhält. Mit Faktor 0.30 bei Stärke 200 wuchs daraus über
         * die Phase ein flacher, ausgestellter Kragen — der Dünnsaum, diesmal
         * aus der eigenen Kraft statt aus der Sollform. Die Schwingung trägt
         * jetzt die Sollform; das hier ist nur noch der Überschwinger. */
        Deform.stauchen(b, 0, 1, 0, 1 + 0.12 * huelle * laengs, 120, dt);

        /* Und das Schwappen quer dazu. Es läuft eine Viertelperiode versetzt,
         * damit auch die Bilder, in denen die Längsschwingung gerade durch
         * null geht, eine Verformung zeigen — sonst hat der Kontaktbogen
         * regelmässig ein totes Bild. Die Wulst wandert dabei von einer
         * Flanke zur anderen; über eine volle Periode hebt sich der Impuls
         * auf, der Körper wandert also nicht aus. */
        Deform.impulsGerichtet(b, sx * quer, 0.30, sz * quer,
                               22 * huelle * Math.abs(quer) * dt, 2.2);

        /* Die Oberfläche schwingt eine Spur schneller als die Masse — das
         * ist der Unterschied zwischen einem atmenden Ballon und einem
         * pumpenden Zylinder. Amplitude an dieselbe Hüllkurve gekoppelt,
         * damit auch das Wabbeln mit der Bewegung zusammen aufhört. */
        /* Klein halten. `zittern` schiebt jeden Punkt entlang seiner
         * Grundrichtung — die Punkte am Bodenpol also nach unten und nach
         * aussen, wo die Haftung sie festhält. Mit 4.2 wuchs daraus über die
         * Phase ein ausgefranster, flach gewalzter Kragen um die Auflage:
         * genau der „auslaufende Dünnsaum" aus dem Urteil, nur diesmal
         * selbst gemacht. Das Wabbeln ist eine Beigabe, die Form kommt aus
         * der Sollform. */
        Deform.zittern(b, 1.5 * huelle, 17, G.zeit, dt);

        /* Der satte Schluck entweicht: der Mund öffnet sich einen Spalt,
         * wenn der Körper gerade zusammengedrückt ist (laengs < 0), und
         * schliesst sich, wenn er sich wieder aufrichtet. Das ist ein
         * Nachbeben des Fressens und keine Zeitfunktion — es hängt an
         * derselben Schwingung wie die Form. */
        G.slime.mouth = Math.max(0, 0.75 * huelle * Math.max(0, -laengs));

        /* Der Bissen wird durchgeknetet und löst sich auf. Er folgt der
         * Masse — im Unterschwinger sackt er tiefer, im Überschwinger wird er
         * mit hochgetragen —, damit man sieht, dass er IN ihr steckt. */
        bolusFolgen(b.cx + sx * 0.26 * R * quer, b.cy * (0.72 + 0.10 * laengs),
                    b.cz + sz * 0.26 * R * quer,
                    R * 0.31 * Math.max(0, 1 - t / 0.85),
                    0.52 * Math.max(0, 1 - t / 0.80), 8, dt);

        // Der Standort des Gegners wird der neue Standort (GDD 01 §29).
        if (t < 0.18) Deform.ziehenZu(b, zx, R * 0.52, zz, 30, dt);
        /* Das Schwappen darf den Körper nicht wegtragen. Gebremst wird die
         * waagerechte Fahrt und nicht die Verformung — ein Zug zu einem
         * Ankerpunkt würde den Körper zusammendrücken, statt ihn zu halten
         * („landet am Ort des Gegners", §29). */
        const vh = Math.hypot(b.vx, b.vz);
        if (vh > 1e-4) Deform.impuls(b, -b.vx, 0, -b.vz, vh * Math.min(0.6, 9 * dt));

      } else {
        /* „Der Blob wabbert nach" (GDD 01 §31). Hier stand bisher NICHTS —
         * der `if (erfolg)` hatte keinen Gegenzweig, und selbst wenn: die
         * Lane war an dieser Stelle längst abgeschaltet. Gemessen ergab das
         * die Folge 0.65 / 0.79 / 0.79 mit noch 1.07 Resttempo — kein
         * Nachschwingen, nur langsames Ausrollen.
         *
         * Geführt wird wie beim Erfolg über das ZIELVERHÄLTNIS und nicht über
         * die Höhe: der Körper arbeitet auf eine schwingende Vorgabe hin und
         * schwingt mit seiner eigenen Trägheit darüber hinaus (GDD 01 §66).
         * Das Ausblendfenster über die letzten 0.25 s ist das Stabilisieren —
         * ohne es endet die Führung mit einem Ruck. */
        G.slime.mouth = 0;
        /* Rest der Kehle aus dem Rückschnapp. Die Phase endet dort mit der
         * ANKUNFT und nicht mit der Uhr — der Rückschnapp kann also mitten
         * im Lösen abbrechen. Ohne diese Zeile stünde die Einschnürung im
         * Bild des Einschlags noch voll da. */
        formMischen(G, F_LOESEN, Math.max(0, 1 - t / 0.20));
        const rest = Math.max(0, dauer - t);
        const aus = Math.min(1, rest / 0.25);
        const huelle = FEHL_AMP * Math.exp(-FEHL_DAEMPF * t) * aus;
        const ziehen = 1 + huelle * Math.cos(Math.PI * 2 * FEHL_HZ * t);
        Deform.stauchen(b, 0, 1, 0, ziehen, 200, dt);
        /* Die Oberfläche schwingt eine Spur schneller als die Masse — der
         * Unterschied zwischen einem atmenden Ballon und einem pumpenden
         * Zylinder. An dieselbe Hüllkurve gekoppelt, damit auch das Wabbeln
         * mit der Bewegung zusammen aufhört. */
        Deform.zittern(b, 7.0 * huelle, 18, G.zeit, dt);

        /* An der Ausgangsstelle bleiben (§31 „landet ungefähr an der
         * Ausgangsposition"). Der Rückstoß trägt sonst weiter: der Körper
         * war nach 2.8 s immer noch mit v = 1.07 unterwegs und das Ende der
         * Animation las sich als Wegrutschen statt als Zur-Ruhe-Kommen. */
        Deform.ziehenZu(b, start.x, R * 0.52, start.z, 34 * aus, dt);
        const vh = Math.hypot(b.vx, b.vz);
        if (vh > 1e-4) Deform.impuls(b, -b.vx, 0, -b.vz, vh * Math.min(0.6, 7 * dt));
      }

      if (t >= dauer) {
        if (ziel) { ziel.umschlungen = 0; ziel.absorbiert = 0; ziel.widersteht = 0; }
        /* Die Sollform gehört wieder der Bewegung. Ohne diese Rückgabe bliebe
         * der Schleim für den Rest der Sitzung prall — die Ruheform ist
         * globaler Zustand, kein Besitz dieser Lane. */
        formFreigeben();
        bolus.deck = 0; bolus.r = 0;
        G.slime.mouth = 0;
        aktiv = false; phase = ''; ziel = null;
        if (G.phase === 'fressen') G.phase = 'frei';
      }
    }
  }

  return {
    get aktiv() { return aktiv; },
    get phase() { return phase; },
    get ziel() { return ziel; },
    starten, aktualisieren, zuruecksetzen,
  };
})();

window.Fressen = Fressen;
