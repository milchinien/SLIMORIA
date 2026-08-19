'use strict';

/* ---------------------------------------------------------------------------
 * Alle Stellschrauben des Spielgefühls an einem Ort.
 *
 * BESITZER: Lane MOTION. Andere Lanes lesen hier, ändern aber nichts.
 * ------------------------------------------------------------------------- */

const PARAMS = {
  // Körper
  radius: 1,
  mass: 1,
  skin: 500,          // Spannung der Haut
  skinDamp: 10,
  bend: 140,          // Biegesteifigkeit gegen Knicke
  bendDamp: 2,
  shape: 130,         // Formgedächtnis (Rückstellung zur Ruheform)
  shapeDamp: 26,
  maxDeform: 0.5,     // ab dieser Auslenkung wird der Körper hart
  stiffen: 6,         // wie stark er dann versteift
  pressure: 9000,     // Innendruck / Volumenerhalt
  jiggleDamp: 0.9,    // Nachschwingen: klein = wabbelt lange
  viscosity: 10,      // Zähigkeit: Verformungen fließen statt zu federn
  adhesion: 5,        // Haftung am Boden — er klebt und muss sich ablösen
  crawl: 0.45,        // Kriechwelle im Antrieb
  slumpTime: 1.5,     // Sekunden bis er im Stand zusammengesackt ist
  stretch: 0.35,      // Streckung bei Höchsttempo
  wobble: 0.09,       // wandernde Oberflächenwelle
  sag: 0.15,          // unten breiter — Schleimkuppel statt Kugel
  /* `squat` ist wie bisher der HÖHENFAKTOR der Ruheform und gleichzeitig ihr
   * Sollvolumen: die fertige Sollform wird in softbody.js exakt auf
   * (4/3)πR³·squat normiert, Höhe und Sollvolumen wachsen also gemeinsam und
   * die Breite bleibt dabei stehen. Genau so hat der Regler sich vorher auch
   * verhalten — `death.js` fährt ihn auf 0.36 herunter und bekommt dieselbe
   * flache Pfütze wie zuvor.
   *
   * Der Wert ist so gewählt, dass die GEMESSENE Silhouettenhöhe im Stand
   * genau 2R·squat trifft. Damit lesen sich beide Kennzahlen von selbst
   * richtig: metrics().squash steht im Stand auf 1.00 und metrics().volumen
   * ebenfalls — Abweichungen davon sind dann echte Verformung und kein
   * Bezugsfehler.
   *
   * Für das Verhältnis Breite zu Höhe ist NICHT dieser Regler zuständig,
   * sondern `prall` — der verschiebt bei stehendem Volumen. */
  squat: 0.86,        // Höhenfaktor und Sollvolumen der Ruheform
  /* Breite zu Höhe, volumenneutral. Das Dossier nennt als Median aus sieben
   * Motiven 1.000 : 0.90 mit ±12 % Bandbreite (§1); gemessen am fertigen
   * Bild steht der Ruhekörper jetzt bei 1.000 : 0.889.
   *
   * Die Vorgabe steht deutlich höher als das Ziel, weil Schwerkraft,
   * Bodenfeder und Haftung dem Körper rund ein Viertel der Sollhöhe wieder
   * abnehmen und ihn dabei breittreten. Wer `flanke`, `sag` oder `fuss`
   * anfasst, ändert damit auch die Breite und muss diesen Regler nachziehen —
   * die vier hängen zusammen. */
  prall: 1.33,        // Höhe zu Breite der Ruheform (1 = Kugel)
  /* Feste Schieflage der Ruheform (GDD 01 §5: "leicht asymmetrisch").
   * Zusammen mit `scherRuhe` sorgt sie dafür, dass die Zeilenmitte der
   * Silhouette zwischen 25 % und 85 % Höhe um 4.6 % der Körperbreite wandert
   * — das Dossier verlangt 4–12 % (§2, Kriterium 4). */
  asymm: 0.10,
  slumpFlach: 0.04,   // wie flach er im Stand wird
  slumpBreit: 0.09,   // wie breit er dabei ausladet
  wabbel: 0.95,       // Ruhe-Unruhe: Walken und Seitenbeule im Stand
  wippen: 4.5,        // Ruhe-Unruhe: Auf-und-Ab des ganzen Körpers

  /* Silhouette der Ruheform (GDD 01 §5, §12–15 · DOSSIER §1–§2) --------------
   * Zwölf Gutachter haben in Runde 1 unabhängig voneinander denselben Mangel
   * beschrieben: spiegelsymmetrische Glocke, gerade Grundlinie, breiteste
   * Stelle an der Bodenkante, keine Taille. Das war kein Einstellungsfehler,
   * sondern eine fehlende Fähigkeit — die Ruheform konnte ihre Masse nicht
   * längs der Fahrtachse verschieben. Diese Regler geben ihr das.
   *
   * Zwei sind seither dazugekommen (6 und 7), weil dem RUHENDEN Körper etwas
   * anderes fehlte: er lief nach unten als Birne aus und saß mit einer
   * gestanzten Kante auf dem Boden. Am Referenzbild gemessen steht ein
   * ruhender Schleim statt dessen auf senkrechten Flanken (`flanke`) und
   * quillt an der Bodenlinie über eine schmale Aufstandsfläche (`fuss`).
   *
   * Wer hier dreht, ändert die SILHOUETTE, nicht das Spielgefühl. Alle sind
   * volumenexakt: die Normierung in softbody.js zieht die Sollform am Ende
   * auf ihr Sollvolumen zurück, egal wie sie kombiniert werden. */

  // 1. Scherung längs: der obere Teil versetzt gegen die Aufstandsfläche.
  scherRuhe: 0.09,    // ständige Schieflage in Radien (Dossier: ~9 % der Breite)
  /* Die Schieflage ist ein LESEZEICHEN, kein Umkippen. Bei 0.55 stand der
   * Scheitel im Bild 53 % der Körperbreite vor der Mitte der Aufstandsfläche
   * — der Körper lag dann schräg wie ein umgefallener Kegel, und was man
   * las, war eine Flugbahn, kein Halt. Das Urteil zu diesem Teil nennt die
   * Zielgröße: "Scheitel und obere Hälfte um etwa 15 bis 20 Prozent der
   * Körperbreite über die Aufstandsfläche hinaus nach vorn". Am fertigen
   * Bild nachgemessen (1600×900, Silhouette segmentiert): die VORDERE
   * Oberkante steht bei 1.70 s um 24.5 %, bei 1.80 s um 34.1 % der
   * Körperbreite vor der Vorderkante der Aufstandsfläche; im Stand sind es
   * 10.6 %. Der Zuwachs durch das Bremsen liegt damit bei 14…24 Punkten. */
  scherLaengs: 0.26,  // Scherung aus der Beschleunigung, + = beim Bremsen nach vorn
  scherBezug: 11,     // Beschleunigung (m/s²), bei der die Scherung voll steht
  scherFolge: 10,     // Nachlauf der QUERscherung (1/s) — sie muss NACHhinken
  /* Die Längsscherung läuft nicht nach, sie SCHWINGT (siehe softbody.js).
   * Ein Tiefpass kann sein Ziel grundsätzlich nicht überschreiten; §13
   * verlangt aber ausdrücklich, dass der Körper "kurz über die Zielbewegung
   * hinausschwingt". Ein lehnender Körper ist ein Pendel: die Bremskraft
   * hält ihn schräg nach vorn, fällt sie weg, trägt ihn seine Trägheit über
   * die Senkrechte hinaus nach hinten.
   *
   * Die beiden Werte gehören zusammen. `scherDaempf` ist das Dämpfungsmaß ζ
   * der VORGABE; gedämpft wird danach ein zweites Mal, weil Formfeder,
   * Zähigkeit und Bodenhaftung dem Körper zusätzlich Energie nehmen. Wer die
   * Zahl anfasst, muss also nachmessen statt nachrechnen. Gemessen an der
   * fertigen Bewegung steht die Schieflage bei
   *
   *   1.70 s: +0.40   2.30 s: −0.01   2.65 s: +0.15   3.05 s: +0.05
   *
   * — um die Ruhelage 0.09 herum also +0.31 / −0.10 / +0.06 / −0.04. Der
   * Nulldurchgang bei 2.30 s ist das, was §13 mit "über die Zielbewegung
   * hinausschwingen" meint: der Körper steht dort kurz HINTER der Senkrechten,
   * die er beim Bremsen verlassen hat.
   *
   * Der Wert lag vorher bei 0.55 und die Schieflage damit im Scheitel bei
   * 1.13 Radien. Im Bild war das keine Schieflage mehr, sondern ein
   * umgefallener Körper: Flächenfüllung 0.49 gegen die 0.70…0.80, die das
   * Dossier über alle Zustände verlangt (§3, Kriterium 8).
   *
   * `scherHz` bestimmt, wie viele Bilder ein Ausschlag bekommt. Bei 1.7 Hz
   * liegen Scheitel und Gegenscheitel rund 450 ms auseinander — der
   * Kontaktbogen tastet mit 150…300 ms ab und trifft beide einzeln.
   * Deutlich schneller wird das Pendel zum Zittern, deutlich langsamer
   * überdauert es die Aufnahme. */
  scherHz: 1.7,       // Eigenfrequenz des Lehnpendels (Hz)
  scherDaempf: 0.14,  // Dämpfungsmaß ζ — klein = mehrere sichtbare Gegenschwünge
  /* Anrollen ist der umgekehrte Lastfall (GDD 01 §13). Ein frei
   * beschleunigender Körper lehnt zurück; einer, dessen hintere Kante am
   * Boden klebt, hat dort einen Drehpunkt und wälzt sich darüber nach VORN.
   * Solange `heckAnker` steht, ersetzt dieser Wert deshalb den
   * beschleunigungsgetriebenen Anteil, statt sich mit ihm zu überlagern —
   * sonst zieht die Sollform den Scheitel nach hinten, während
   * `anrollWalken` ihn nach vorn schiebt, und sichtbar bleibt keines von
   * beiden. Positiv = Scheitel vor der Aufstandsfläche. */
  anrollScher: 1.55,  // Vorwärts-Schieflage beim Anrollen, in Radien
  anrollRund: 0.55,   // wie weit der spitze Heckdorn dabei zurücktritt
  anrollTaille: 0.42, // Kehle zwischen Vorderballen und Schleppe beim Anrollen
  anrollFuss: 0.75,   // wie weit der Gelfuß beim Aufwälzen zurücktritt
  /* Wohin die Streckung bei Tempo ihren Volumenausgleich legt: 0 = zu
   * gleichen Teilen in Breite und Höhe (der alte Stand, gemessen ergab er
   * bei Höchsttempo Länge:Höhe = 1 : 0.47 — ein Rochen), 0.9 = fast
   * ausschließlich in die waagerechte Querachse. Das Referenzmaterial kennt
   * 1 : 0.47 nur beim härtesten Aufprall; der lungende Cuphead-Blob behält
   * am vorderen Ballen 1 : 1.02 und hängt alles Tempo als Schleppe hinten
   * an. Ein schneller Schleim wird also länger und SCHMALER, nicht flacher. */
  streckSchmal: 0.62,

  // 5. Scherung quer: der obere Teil seitlich gegen die Aufstandsfläche.
  scherQuer: 0.30,    // Versatz in Radien bei voller Querbeschleunigung

  /* 9. Die Kehre — Komma statt Spindel (GDD 01 §15) -------------------------
   * Der einzige Regelsatz, der die LÄNGSACHSE der Ruheform krümmt. Alles
   * andere hier skaliert Achsen oder schert über die Höhe; beides lässt die
   * Achse in der Draufsicht gerade, und genau das war der Befund: "ein
   * einziger Tropfen mit einer einzigen Achse … es fehlt jede Querablage der
   * Masse."
   *
   * Getrieben wird die Kehre von `b.schleppW` in softbody.js — einer zweiten
   * Achse, die der Blickrichtung mit Nachlauf folgt. Kein Kanal, keine
   * Verdrahtung: wo der Kopf dreht, entsteht sie, wo er stillsteht,
   * verschwindet sie. Bei den geradeaus gemessenen 0.25 rad/s Restdrehung
   * bleibt sie unter 3 % ihres Vollwerts, die vier anderen Bewegungsszenen
   * sehen sie also nicht.
   *
   * Die Zahlen stammen aus cuphead-goopy-lunge-mass-trailing-behind, in
   * zwanzig Bändern längs der Hauptachse ausgemessen: die Mittellinie wandert
   * dort über 0.31 der größten Dicke quer (= 12.5 % der Körperlänge), und ihr
   * Ausschlag sitzt bei 0.22…0.41 der Länge vom Schleppende — im Hals, nicht
   * in der Mitte. Dort steht auch `kehreOrt`. Und die Referenz zeigt zwischen
   * Kopf und Schleppe eine Kehle von 0.11…0.19 der Kopfdicke: das ist
   * `kehreTaille`, ohne die eine krumme Achse nur ein gebogener Keil bleibt.
   *
   * Zwei Regler sind keine Formregler, sondern Bedingungen. `kehreMasseFolge`
   * misst nachlaufend, wieviel Schwung überhaupt umzulenken ist — ohne ihn
   * baute schon der erste Klick eine Kehre auf, weil der Kopf sich dreht,
   * bevor Masse unterwegs ist (gemessen im `vollgas`-Lauf: bei 200 ms stand
   * dort eine Kommaform, die niemand ausgelöst hatte). Und `kehreZipfel`
   * hängt die Schleppe an die Kehre statt ans Tempo: im Umkehrpunkt steht
   * der Körper gemessen bei 0.4 von 7 m/s, `nachzug` ist dort null, und
   * genau dort soll das Heck "weiter in die alte Richtung stehen bleiben".
   *
   * Am fertigen Bild gemessen (Draufsicht im Fahrtsystem, sieben Längsbänder,
   * Restausschlag der Mittellinie gegen die beste Gerade als Anteil der
   * größten Dicke): 0.02…0.05 vorher, 0.09…0.16 über 500 ms nachher; der
   * Hals steht dabei bei 0.18…0.39 der Kopfdicke. Das Volumen bleibt über den
   * ganzen Lauf zwischen 0.976 und 1.008. */
  kehreMasseFolge: 3, // Nachlauf des Schwungmaßes (1/s)
  kehreFolge: 5.5,    // Rate (1/s), mit der die Schleppachse dem Kopf folgt
  kehreZug: 0.70,     // wie weit das Heck auf der alten Achse stehen bleibt
  kehreBogen: 1.05,   // Querausschlag der Mittellinie im Hals (Radien)
  kehreOrt: -0.32,    // Ort des Ausschlags: -1 = Heck, 0 = Mitte, +1 = Front
  kehreBreite: 0.72,  // wie weit er längs reicht
  kehreTaille: 0.40,  // Kehle zwischen Kopf und Schleppe während der Kehre
  kehreZipfel: 0.46,  // Heckzipfel, den die Kehre selbst trägt (statt Tempo)
  /* Und derselbe Zipfel noch einmal, aber ausschliesslich auf der unteren
   * Halbkugel: die Schleppe, die am Boden SCHLEIFT statt in der Luft
   * abzustehen. Siehe softbody.js, `kehrTief`. `kehreZipfel` steht dafuer
   * niedriger als vorher (0.55) — was oben hinausragte, liegt jetzt unten. */
  kehreTief: 0.75,
  /* Wie weit die Schleppe zu Boden sackt. Der Wert stand auf 1.00, und das
   * war kein Formregler mehr, sondern ein Katapult: der Term ist über
   * `heck² − 1/6` mittelwertfrei, senkt also das Heck um 0.83 Radien und
   * HEBT die Front um 0.17. Gemessen lag damit ein gutes Drittel der
   * Sollform unter der Bodenebene, die Bodenfeder (groundK 10000) hat es
   * herausgedrückt, und der Schleim hob in der Kehre ab: `grounded` false
   * bei 2150 und 2300 ms, Schwerpunkt auf 1.27 und 1.38 Radien statt 0.57,
   * Silhouettenhöhe 2.69 gegen 1.72 im Stand — 156 % der Ruhehöhe, wo das
   * Dossier für den Flug 112–120 % nennt (§4). Auf dem Kontaktbogen stand
   * dort ein aufgerichtetes Segel, kein Körper, der eine Kurve fährt.
   *
   * Bei 0.42 bleibt `grounded` über den ganzen Lauf stehen, der Schwerpunkt
   * kommt auf höchstens 0.93 Radien und die Schleppe liegt trotzdem
   * sichtbar tiefer als der Kopf. */
  kehreSenke: 0.50,   // wie weit die Schleppe dabei zu Boden sackt (Radien)
  /* Der Knoten am Ende der Schleppe. Gemessen an
   * cuphead-goopy-lunge-mass-trailing-behind: die sechs hintersten Bänder
   * stehen bei 0.19 / 0.22 / 0.19 / 0.15 / 0.11 / 0.11 der größten Dicke —
   * das Ende ist dicker als der Hals davor. Ohne diesen Bogen läuft jede
   * unserer Achsenskalierungen zum Heckpol hin auf null aus und die
   * Schleppe endet als Dorn. Siehe softbody.js, `keule`. */
  kehreKeule: 1.55,       // wie stark der Querschnitt am Heckpol wieder anwächst
  kehreKeuleBreite: 0.45, // wie weit der Knoten längs reicht (in af)
  /* Wie flach und breit die Kehre den Körper drückt. Siehe softbody.js,
   * `kehrFlach`: der Umkehrpunkt war das HÖCHSTE Bild des ganzen Laufs, und
   * ein Körper, der seine Masse umlenkt, gehört gegen den Boden geschmiert. */
  kehreFlach: 0.46,
  /* Totgang der drei neuen Kehr-Kanaele. Siehe softbody.js, `kehrStark`:
   * darunter ist es kein Umlenken von Masse, sondern das blosse Ausrichten
   * beim Losfahren. */
  kehreTotgang: 0.35,
  kehreFuss: 0.75,   // wie weit der Gelfuss in der Kehre zuruecktritt

  // 2. Tropfen: vorne voller und höher, hinten dünner und tiefer auslaufend.
  tropfen: 0.10,      // Querschnitt vorn größer, hinten kleiner (ungerade in af)
  tropfenTempo: 0.22, // wie stark das mit dem Nachzug wächst
  tropfenSenke: 0.07, // Front hoch, Heck tief — Mittellinie kippt (in Radien)

  /* 3. Höhe der breitesten Stelle. Gemeint ist die Höhe des Bauchbogens in der
   * SOLLFORM: 0 = Bodenpol, 1 = Äquator, 2 = Scheitel.
   *
   * Der Bogen steht jetzt breit und flach um den Äquator und macht aus dem
   * Körper ein Fass statt eines Eis; wo die breiteste Stelle der fertigen
   * Silhouette landet, entscheiden `flanke` und `fuss` weiter unten. Gemessen
   * liegt sie bei 0.557 der Silhouettenhöhe von oben — das Dossier nennt
   * 0.52–0.62 mit Median 0.55 (§1, Kriterium 3).
   *
   * Vorher stand hier 1.40 mit `bauchBreite` 1.20: eine schmale Beule
   * OBERHALB des Äquators. Gemessen lag die breiteste Stelle damit bei 0.45 —
   * in der oberen Hälfte, also genau der Fehler, den Kriterium 3 verbietet. */
  bauchHoch: 0.85,
  bauchBreite: 1.50,  // wie weit die Ausladung senkrecht reicht

  /* 6. Der Gelfuß: Einschnürung des Querschnitts kurz über dem Bodenpol.
   *
   * Der Befund, an dem dieses Teil zuletzt gescheitert ist, war: "keiner der
   * beiden Körper zeigt an der Bodenlinie eine echte Quetschung … A endet mit
   * einer erstaunlich sauberen, fast gestanzten Unterkante." Ohne diesen
   * Regler reicht die Sollform in voller Breite unter die Bodenebene, die
   * Bodenfeder walzt daraus eine ebene Scheibe, und deren Rand ist die
   * gestanzte Kante. Mit ihm liegt darunter nur ein schlanker Zapfen: die
   * Aufstandsfläche wird klein, der Bauch darüber lädt aus und hängt
   * sichtbar über. Siehe softbody.js Abschnitt 6.
   *
   * `fussHoch` ist der eigentliche Regler, nicht `fuss`. Sitzt die Kehle
   * exakt am Pol (0), liegt sie komplett unter dem Boden und wird wieder
   * breitgewalzt — gemessen blieb die Silhouette dann unverändert. Sitzt sie
   * zu hoch (> 0.35), frisst sie den Bauch weg und der Ellipsenquotient bei
   * 85 % Höhe fällt unter die geforderten 1.04. */
  fuss: 1.00,         // Tiefe der Kehle (0 = keine, 1 = bis auf null)
  fussZone: 0.18,     // wie weit sie nach oben und unten reicht (in by)
  fussHoch: 0.26,     // Ort der Kehle: 0 = Bodenpol, 1 = Äquator
  fussFolge: 9,       // wie schnell sie beim Abheben verschwindet (1/s)

  /* 7. Senkrechte Flanken statt Ellipsenrundung: Exponent der Superellipse
   * in der unteren Hälfte. 2 = Kugel, 4–5 = Fass mit gerundeten Ecken.
   *
   * Am Referenzbild Zeile für Zeile ausgemessen: der ruhende Schleim steht
   * über 60 % seiner Höhe auf einer fast konstanten Breite. Ein Ei kann das
   * nicht, eine Superellipse schon. Die Zahlenreihe steht in softbody.js
   * Abschnitt 7. */
  flanke: 4.5,        // Kastigkeit der unteren Flanke (2 = Ellipse)
  flankeMax: 2.4,     // Deckel: am Bodenpol geht der Quotient gegen unendlich

  // 4. Taille: Einschnürung mit konkaven Kehlen auf der Längsachse.
  taille: 0.0,        // ständiger Anteil — im Stand hat der Blob keine Taille
  tailleZug: 0.55,    // Anteil pro Einheit Überdehnung (gemessen, siehe softbody.js)
  taillePos: -0.30,   // Ort auf der Längsachse: -1 = Heck, 0 = Mitte, +1 = Front
  tailleBreite: 0.75, // Breite der Kehle

  // Bewegung
  maxSpeed: 7,
  response: 6,
  maxAccel: 45,
  rollIn: 0.42,       // Anrollzeit in Sekunden
  turnRate: 7,
  rearBias: 0.9,      // Antrieb schiebt von hinten → Front läuft voraus

  // Anrollen und Nachziehen (GDD 01 §13, §12)
  anrollHalt: 0.55,   // Anteil der Anrollzeit, in dem der Vortrieb gebremst bleibt
  anrollWalken: 58,   // Kraft, mit der sich die Masse vorab nach vorn wälzt
  heckKleben: 19,     // Extra-Haftung der hinteren Aufstandsfläche beim Anrollen
  zipfel: 1.0,        // wie weit die hintere Masse bei Vollgas nachgezogen wird
  zipfelSchlank: 0.6, // wie stark der Zipfel dabei quer verjüngt
  /* Der Schleppzipfel beim Anrollen sitzt UNTEN. `zipfel` verlängert das
   * Heck auf jeder Höhe gleich viel und setzt das Maximum damit an den
   * breitesten Umfang, also auf halbe Höhe — heraus kam eine Kegelspitze
   * schräg hinten-oben. Was am Boden klebt, ist aber die Aufstandsfläche;
   * also muss auch das Nachgezogene von dort kommen. Dieser Anteil liegt
   * ausschließlich auf der unteren Halbkugel und wird von der Bodenfeder zu
   * einer flachen, nachgeschleppten Schürze ausgewalzt. Nur während
   * `heckAnker` steht — bei Dauerfahrt gibt es keine klebende Kante mehr. */
  zipfelTief: 1.25,   // Länge der tiefliegenden Heckschleppe beim Anrollen
  zipfelSenke: 1.00,  // wie tief diese Schleppe dabei absackt (Radien)

  friction: 1.6,      // Bodenreibung des Schwerpunkts
  airDrag: 0.15,

  /* Bremsen und Nachschwingen (GDD 01 §13) -----------------------------------
   * Die prüfbare Größe ist laut Referenzdossier NICHT die Dauer, sondern das
   * Verhältnis: jeder Ausschlag ist rund zwei Drittel des vorherigen
   * (e² = 0.64, bounce-energy-decay-law.png). Wer linear ausblendet oder nach
   * einem Ausschlag abbricht, bekommt eine Feder ohne Gewicht.
   *
   * `schwingHz` und `schwingAbkling` gehören deshalb zusammen — wer eines
   * ändert, muss das andere nachziehen, sonst stimmt die Kurve nicht mehr.
   *
   * Die reine Rechnung wäre `schwingAbkling = schwingHz · ln(1/0.64)`, bei
   * 2.4 Hz also 1.07. Eingestellt ist 0.80, und der Unterschied ist kein
   * Schlamperei-Rest: gedämpft wird ZWEIMAL. Diese Rate bremst nur die
   * Vorgabe; der Körper dämpft mit Formfeder, Zähigkeit und Bodenhaftung
   * noch einmal selbst. Gemessen an der fertigen Bewegung stehen die
   * Extrema von `metrics().streckung` nach dem Halt bei
   *
   *   2.13 s: 0.856   2.32 s: 1.210   2.53 s: 0.802   2.73 s: 1.126
   *   2.95 s: 0.870   3.18 s: 1.083
   *
   * — Ausschläge von −0.14 / +0.21 / −0.20 / +0.13 / −0.13 / +0.08 um die
   * Ruhelage, also 0.62 und 0.65 je voller Periode. Das ist die
   * Zweidrittel-Kurve aus
   * bounce-energy-decay-law; mit dem Rechenwert wäre nach zwei Ausschlägen
   * Schluss gewesen. Wer die Zahl anfasst, muss nachmessen, nicht
   * nachrechnen.
   *
   * `schwingHz` liegt bewusst unter dem im Dossier geschätzten Band von
   * 6 Hz ± 1. Das Band ist dort ausdrücklich als nicht am Material messbar
   * gekennzeichnet, während das Verhältnis belegt ist. Der Wert steht auf
   * dem Doppelten von `scherHz`: die Längsstauchung erreicht damit jedes
   * Mal ein Extremum, wenn das Lehnpendel umkehrt, und beide Vorgänge
   * erzählen dasselbe statt gegeneinander zu laufen. Bei 3.4 Hz — dem
   * vorherigen Wert — lagen die Extrema so dicht am Bildabstand des
   * Kontaktbogens (150…300 ms), dass sieben aufeinanderfolgende Bilder
   * denselben Zustand zeigten; was man nicht sieht, ist nicht animiert
   * (§67). */
  bremsKraft: 7.5,     // aktive Bremsbeschleunigung — macht aus dem Ausrollen eine Phase
  /* Tempo, unter dem die Bremskraft ausgeblendet wird. Der Wert entscheidet
   * nicht über die Stärke der Bremsung, sondern über ihr ENDE: bei 0.9 lief
   * sie über eine halbe Sekunde weich aus, und eine Anregung, die so langsam
   * verschwindet wie das Lehnpendel schwingt, erzeugt keinen Gegenausschlag.
   * Tief gesetzt fällt sie in gut hundert Millisekunden weg — daraus wird
   * der Anriss, der §13 sein Nachschwingen gibt. */
  bremsAus: 0.30,      // Tempo (m/s), unter dem die Bremse ausblendet
  /* Wie weit sich der Fahrzipfel beim Bremsen einzieht. Er ist die Masse,
   * die dem Körper hinterherhängt, weil sie noch Schub braucht — beim
   * Bremsen läuft sie statt dessen auf. Bei 0 bleibt die Fahnenform der
   * Fahrt über die ganze Bremsung stehen. */
  bremsZipfel: 1.00,   // wie weit der Zipfel beim Bremsen einzieht (0…1)
  /* --- Der gebremste Körper ist KURZ (GDD 01 §13, §15) --------------------
   * Der Zipfel einzuziehen reicht nicht. Gemessen stand der Körper 200 ms
   * nach `stop()` immer noch bei Länge zu Höhe 1.62 zu 1 (im Bild sogar
   * 1.51 zu 1) — also länger als breit hoch, mitten in dem Bild, in dem er
   * am kürzesten sein soll. Der Grund steckt nicht im Zipfel, sondern in
   * `stretch`: die Tempostreckung hängt am aktuellen Tempo, und beim
   * Bremsen IST noch Tempo da. Der Körper wurde also weiter in die Länge
   * gezogen, während er auflaufen sollte. Zusammen mit der Schieflage wurde
   * daraus ein flach ausgewalzter Keil — keine Masse mehr (§66) und im
   * Grenzfall keine Blob-Identität (§5).
   *
   * Zwei Regler, weil zwei verschiedene Dinge gemeint sind. `bremsKurz`
   * nimmt die Tempostreckung zurück: was den Körper streckt, ist der Schub
   * gegen die Trägheit, und der zeigt beim Bremsen in die Gegenrichtung.
   * `bremsStauch` staucht darüber hinaus aktiv — das ist das "verformen"
   * aus §15: die Front steht, das Heck läuft auf, der Körper wird kürzer
   * und stellt sich auf.
   *
   * Der Ausgleich ist exakt volumenneutral (die drei Exponenten summieren
   * sich zu null) und geht zu 40 % in die Höhe, zu 60 % in die waagerechte
   * Querachse. Nicht hälftig: die Senkrechte ist durch Bodenfeder,
   * Schwerkraft und Haftung gefesselt und kann einer schnellen Vorgabe nicht
   * folgen, die Waagerechte ist frei — dieselbe Aufteilung wie beim
   * Nachschwingen in softbody.js, und aus demselben Grund. */
  /* Zusatzdämpfung des Lehnpendels, solange die Bremskraft anliegt (siehe
   * softbody.js). Bei 0 coastet die Schieflage mit dem Wert weiter, den sie
   * aus dem Anfahren geerbt hat, und die Bremsung hat auf sie praktisch
   * keinen Einfluss mehr. Bei rund 0.9 steht die Dämpfung während der
   * Bremsung nahe am aperiodischen Grenzfall: die Schieflage folgt der
   * Verzögerung, und das freie Schwingen beginnt erst, wenn die Bremse
   * weg ist — genau die Reihenfolge, die §13 und §15 verlangen. */
  bremsScherHalt: 0.50,
  bremsKurz: 0.70,     // wieviel der Tempostreckung das Bremsen zurücknimmt (0…1)
  bremsStauch: 0.14,   // zusätzliche Längsstauchung bei voller Bremsung
  bremsHoch: 0.25,     // Anteil des Ausgleichs, der in die HÖHE geht
  /* Wie stark die Reibung am Fuß die zusammenbrechende Schieflage in einen
   * Rückstoß des ganzen Körpers umsetzt (siehe slime.js). Über den ganzen
   * Bremsvorgang integriert ist die Summe null; der Regler bestimmt nur, wie
   * weit der Schwerpunkt dabei ausholt. Bei 0 gibt es keine Umkehr mehr,
   * über etwa 4 wippt der Schleim nach jedem Halt sichtbar hin und her.
   *
   * Von 3.4 auf 1.6 zurückgenommen, weil der Rückstoß eine RÜCKKOPPLUNG ist:
   * er beschleunigt den Schwerpunkt, die Beschleunigung treibt die
   * Schieflage, und die Schieflage wieder den Rückstoß. Gemessen hielt sich
   * die Schieflage dadurch während der ganzen Bremsung auf ihrem Erbwert
   * (0.70…0.79 Radien), statt der Verzögerung zu folgen — sie war keine
   * Antwort auf das Bremsen mehr, sondern ein eigener Kreis. */
  lehnRueck: 1.6,      // Rückstoß aus dem Lehnpendel (m/s je Radius/s)
  bremsAb: 0.06,       // ab diesem Tempoüberschuss (Anteil maxSpeed) gilt es als Bremsen
  /* Von 34 auf 20 zurückgenommen: die Ruheform schert seit dieser Runde
   * selbst nach vorn (`scherLaengs` plus `bremsScherHalt`), und beide
   * zusammen zogen die vordere Oberkante zu einem Schnabel aus. Vorgabe und
   * Kraft sollen dieselbe Bewegung erzählen, nicht dieselbe Bewegung zweimal
   * ausführen. */
  bremsNicken: 20,     // Kraft, mit der die Masse beim Bremsen nach vorn-oben schwappt
  bremsLaden: 4.0,     // wie schnell die Bremsung das Nachschwingen auflädt
  schwingMax: 0.24,    // größte Amplitude der Längsschwingung
  schwingHz: 2.4,      // Frequenz des Nachschwingens
  schwingAbkling: 0.80, // Abklingrate der VORGABE, siehe oben
  schwingKraft: 16,    // wie hart die Schwingung den Körper anfasst

  /* Kehrtwende (GDD 01 §15) -------------------------------------------------
   * §15 zählt fünf Schritte auf — abbremsen, verformen, kurz nachschwingen,
   * Richtung ändern, in die neue Richtung beschleunigen — und der Prototyp
   * hatte davon keinen einzigen. Der Grund steckt in einer einzigen Zeile:
   * `bremsen` misst den Überschuss über das ZIELTEMPO, und das bleibt bei
   * einer Kehrtwende unverändert das Maximum. Also war `bremsen` null, und
   * mit ihm Bremsantrieb, Bremsnicken und Nachschwingen. Gemessen fiel der
   * Schleim in 350 ms von 6.9 auf 2.5 und war 350 ms später wieder bei 5.8:
   * eine Delle im Tempoverlauf, kein Vorgang.
   *
   * `wende` füttert deshalb die vorhandene Bremsmaschinerie, statt einen
   * zweiten Satz Effekte danebenzustellen. Wer hier dreht, verschiebt die
   * Länge der Phasen, nicht ihre Anzahl. */
  wendeAb: 0.35,      // ab diesem Skalarprodukt Wunsch·Fahrt gilt es als Wende
  wendeMinTempo: 0.22, // darunter ist keine Masse mehr da, die umkehren müsste
  wendeDauer: 0.30,   // Sekunden, über die die Wende ausklingt
  wendeBrems: 0.95,   // wie weit das Zieltempo während der Wende einbricht
  wendeKraft: 17,     // eigene Bremsbeschleunigung gegen die alte Fahrt
  wendeSperre: 1.0,   // wie weit der Vortrieb in die neue Richtung gesperrt wird
  wendeRoll: 0.85,    // wie weit das Anrollen für die neue Richtung zurückfällt
  wendeHalten: 0.72,  // wie stark der Kopf während der Wende die alte Richtung hält
  /* Ausgelöst wird die Fliehkraft seit dieser Runde an der DREHRATE des
   * Kopfes, nicht mehr am Zähler `wende` (siehe slime.js). Gemessen war der
   * alte Auslöser um eine ganze Phase versetzt: `wende` steht im
   * Kehrtwende-Lauf schon bei 2.05 s auf null, während der Kopf erst von
   * 1.80 bis 2.30 s dreht. Die Kraft wirkte also, während der Körper noch
   * geradeaus bremste, und war vorbei, als er sich herumwarf. Der Wert steht
   * deshalb niedriger als vorher (34): das Zeitfenster ist rund dreimal so
   * lang geworden. */
  wendeFlieh: 22,     // Kraft, mit der die Masse in der Drehung nach außen quillt
  wendeSchwing: 0.3,  // wie weit die Wende über den Nachschwing-Deckel hinausdarf

  /* Vollgas: die eigene Stufe "sehr schnell" (GDD 01 §14) --------------------
   * §14 zählt vier Stufen auf, und die vierte ist keine stärkere dritte. Sie
   * lautet: "vorne flacher und länger, hinterer Teil wird nachgezogen" — zwei
   * verschiedene Enden mit zwei verschiedenen Aufgaben.
   *
   * Wie herum, ist am Material entschieden und nicht am Wortlaut. Die
   * RUN-Zeile von craftpix-slime-blue-idle-walk-run-attack-jump-8frames zeigt
   * über sieben Bilder dieselbe Anordnung: der Scheitel steht über der
   * VORDEREN Hälfte, die Vorderkante ist eine tiefe, flach vorgeschobene
   * Lippe, und nach hinten läuft eine lange, immer dünner werdende Schleppe
   * am Boden aus. Der umgekehrte Aufbau (Scheitel hinten, Lippe vorn) war
   * gebaut und gemessen — auf dem Kontaktbogen las er sich als Keil, der in
   * die falsche Richtung zeigt, weil das Auge dem dicken Ende folgt.
   *
   * Gemessen stand hier vorher etwas Drittes: `frontLang` 0.12 gegen `zipfel`
   * 0.85 (nach `vollgasKurz`) ergab achsen.vorne 1.33 zu achsen.hinten 2.23
   * bei einem hohen, runden Vorderballen — eine Kaulquappe. Der Scheitel saß
   * mit 0.28 zwar vorn, aber ohne Lippe darunter, und das Heck endete als
   * Nadel statt als Kante. Dazu hoben sich `keilAb` 0.06 und `tropfenSenke`
   * 0.07 gegenseitig fast exakt auf: der Keil, der die Nase in den Boden
   * legen sollte, stand netto auf −0.01, es gab ihn also gar nicht.
   *
   * Am fertigen Bild gemessen (10 Bilder, Silhouette in zehn Längsbändern):
   * Scheitel 0.26–0.36 von vorn, vorderstes Band 0.50–0.70 der Scheitelhöhe,
   * hinterstes 0.30–0.37, Seitenverhältnis 1.90–2.11.
   *
   * `vollgasAb` steht bewusst hoch. Bei 0.6 lief die vierte Stufe schon bei
   * 90 % Tempo fast voll aus, Stufe drei und vier sahen auf dem Kontaktbogen
   * gleich aus und §14 hatte sichtbar nur drei Stufen. Bei 0.78 steht das
   * Bild bei 90 % Tempo auf 1.41:1 mit einem 0.50 dicken Heck, bei 100 % auf
   * 2.05:1 mit 0.30 — der Sprung ist zu sehen. */
  vollgasAb: 0.78,    // ab diesem Tempoanteil beginnt "sehr schnell"
  vollgasRund: 0.55,  // wie stark die Verjüngung des Hecks zurückgenommen wird
  vollgasKurz: 0.20,  // wie stark das Heck dabei zusätzlich gekürzt wird
  vollgasStreck: 0.0, // Länge, die in die symmetrische Streckung wandert
  frontLang: 0.48,    // wie weit die Front dabei nach vorn ausgezogen wird
  frontFlach: 0.62,   // wie flach und breit die Front dabei ausläuft (Linse)
  keilAb: 0.17,       // Nase-tief-Scherung: vorne runter, Heck rauf (in Radien)
  /* Die Schräglage bei GLEICHFÖRMIGER Fahrt.
   *
   * `scherLaengs` hängt an der Beschleunigung und ist bei Höchsttempo
   * folgerichtig null — bei konstanter Fahrt lehnt aus Trägheit niemand.
   * Genau dort verlangt §14 aber trotzdem ein nachgezogenes Heck, und es
   * trägt ein anderer Lastfall: die Aufstandsfläche schleift am Boden,
   * während die Masse darüber ihren Schwung weiterträgt. Der Körper kippt
   * also über seine VORDERKANTE, und was hängenbleibt, ist die hintere
   * Bodenkante — dieselbe Vorzeichenlage wie `anrollScher`, nur ohne Anker
   * und viel schwächer.
   *
   * Zusammen mit `keilAb` ergibt das die Silhouette aus der RUN-Zeile: vorn
   * unten die flach aufgesetzte Lippe, darüber die überhängende Masse,
   * dahinter die auslaufende Schleppkante. */
  vollgasScher: 0.46, // Scherung bei Dauervollgas (Radien), + = Scheitel nach vorn
  keilKraft: 18,      // Kraft, die die Nase in den Boden und das Heck hoch walzt

  /* Aufprall (GDD 01 §20, §5) -----------------------------------------------
   * Gemessen am Bestand war der Aufprall keine Verformung, sondern ein
   * Massenverlust: die Höhe fiel um 45 %, die Breite wuchs um 13 %, und das
   * Volumen brach auf 0.75 ein. Der Körper wurde von der Bodenfeder gegen
   * eine noch RUNDE Ruheform gequetscht — Haut, Formfeder und Innendruck
   * hielten die Breite fest, und was die Höhe verlor, verschwand einfach.
   * Genau das verbietet §66: der Körper soll auf den Einschlag reagieren,
   * nicht von ihm zusammengedrückt werden.
   *
   * Deshalb bekommt der Aufprall einen eigenen Kanal in der Ruheform, genau
   * wie das Nachschwingen: die Vorgabe wird flach und breit, und die
   * Umverteilung ist volumenexakt (Höhe · k, beide Querachsen · 1/√k).
   * Erst dadurch treibt die Haut die Masse nach außen, statt sie zu halten.
   *
   * Der Kanal ist eine echte Feder mit Anriss über die GESCHWINDIGKEIT, kein
   * gesetzter Verlauf. Daraus fällt die Abfolge aus §20 von selbst heraus:
   * Anriss → Viertelperiode später die tiefste Stauchung → Nulldurchgang →
   * Überschwinger nach oben → kleinere zweite Stauchung → Stillstand. Bei
   * 3.6 Hz liegt die tiefste Stauchung 69 ms nach dem Kontakt; gemessen war
   * sie im Bestand nach 70 ms — die Feder trifft die vorhandene Masse also,
   * statt gegen sie zu arbeiten.
   *
   * `klatschMin` ist die harte Untergrenze und keine Geschmacksfrage: sie
   * ist der Ort, an dem "nie völlig flach" (§5) im Code steht. Auch die
   * Referenz bleibt dort — selbst die extremste Scheibe
   * (sr1-extreme-flatten-disc-skirt) behält eine deutliche Kuppe. */
  /* `flugStreck` steht deutlich niedriger als vorher, und der Grund ist die
   * angehobene Ruheform. Am Boden nehmen Schwerkraft, Bodenfeder und Haftung
   * dem Körper rund ein Fünftel seiner Sollhöhe ab; sobald er abhebt, fällt
   * das weg und er richtet sich von selbst um ein Drittel auf. Diese
   * Aufrichtung IST die Antizipation — eine zweite obendrauf ergab gemessen
   * 180 % der Standhöhe, während das Dossier für den Flug 112–120 % nennt
   * (§4, Kriterium 9). Mit 0.16 liegt der Sprungscheitel bei rund 158 %:
   * immer noch über der Referenz, aber deutlich näher als die 177 % des
   * Bestands. Wer hier weiter will, muss an der Bodenstauchung ansetzen und
   * nicht an diesem Regler — der Sprung von Boden zu Luft kommt zu zwei
   * Dritteln daher, dass am Boden Gewicht auf dem Körper liegt. */
  flugStreck: 0.16,     // wie weit sich der Körper im freien Fall längs zieht
  flugTempo: 9,         // Fallgeschwindigkeit, ab der die Streckung voll ist
  flugFolge: 14,        // wie schnell die Flugform kommt und wieder geht
  /* Frequenz und Anriss der Aufprallfeder sind gegen die GEMESSENE Zeitlage
   * gestellt und nicht mehr nur gegen die Rechnung. Gemessen lag die tiefste
   * Stauchung des Körpers 95 ms nach dem Kontakt, das Viertel einer 3.6-Hz-
   * Feder aber schon bei 69 ms: die Vorgabe war im entscheidenden Bild bereits
   * wieder auf null (`klatschGes` 0.04 bei einem Squash von 0.68). Der Körper
   * war dort flach, weil die Bodenfeder ihn hielt — genau der Zustand, den das
   * Urteil als "gequetscht statt ausgewichen" beschreibt. Bei 3.0 Hz liegt das
   * Viertel bei 83 ms und trifft die Masse.
   *
   * Der Anriss war zu klein, um die Vorgabe überhaupt in ihren Arbeitsbereich
   * zu bringen: aus 5.5 wurde ein Ausschlag von rund 0.25, die flachste
   * erlaubte Höhe liegt aber 0.38 tiefer als die Ruheform. Die Untergrenze
   * `klatschMin` war damit reine Theorie. */
  klatschHz: 3.0,       // Frequenz der Aufprallfeder
  klatschDaempf: 0.16,  // Dämpfungsmaß der VORGABE — der Körper dämpft selbst nach
  klatschAnriss: 9.5,   // Geschwindigkeitsanriss pro Einheit Aufprallwucht
  /* `klatschMin` stand auf 0.78, während die Bodenfeder den Körper gemessen
   * auf 0.52 gedrückt hat. Die Vorgabe war also HÖHER als die Wirklichkeit —
   * der Körper wurde gequetscht, statt auszuweichen, und verlor dabei ein
   * Drittel seines Volumens. Das Dossier nennt für den harten Aufprall 62–68 %
   * der Ruhehöhe (§3); dort steht die Vorgabe jetzt. Die harte Untergrenze
   * "nie völlig flach" (§5) liegt laut Dossier bei 55 % — 0.62 bleibt darüber. */
  /* Wie der Deckel nach oben ist auch die Untergrenze jetzt eine WEICHE
   * Sättigung: der Wert wird angenähert, aber nie erreicht. Ein harter
   * `Math.max` hätte bei dem nun ausreichend großen Anriss mehrere Bilder auf
   * exakt derselben Höhe stehen lassen. Der Grenzwert steht deshalb tiefer als
   * die Zielhöhe — gemessen landet der tiefste Aufprall damit im Dossierband
   * 62–68 % (§3), und die harte Schranke "nie völlig flach" (55 %, §5) liegt
   * mit 0.50 immer noch unter jedem erreichbaren Wert. */
  klatschMin: 0.56,     // Grenzwert der Stauchung (weich, wird nie erreicht)
  /* Der Deckel nach oben ist seit dem Aufprallteller eine WEICHE Sättigung
   * (softbody.js, `saettige`), kein `Math.min` mehr. Der Wert ist deshalb
   * kein Anschlag, den die Rückfederung erreicht, sondern der Grenzwert, dem
   * sie sich nähert — gemessen kommt sie auf rund 1.20 heraus und landet
   * damit im Dossierband für den freien Flug (112–120 %, §4). Vorher stand
   * hier 1.46, die Rückfederung lief auf 131 % und stand dabei über vier
   * Bilder auf demselben Wert. */
  klatschMax: 1.18,     // Grenzwert der Streckung (weich, wird nie erreicht)
  klatschKraft: 30,     // Kraft, mit der die Masse zusätzlich nach außen gewalzt wird
  klatschSchuerze: 0.12, // Schürze: wie weit der Rand beim Klatschen ausladet
  klatschBreit: 1.00,   // wie stark die Grundfläche mitgeht (1 = exakt volumentreu)
  klatschWulst: 0.35,   // wie weit der Bauch beim Klatschen zum Bodenrand rutscht
  klatschDruck: 25,     // wie stark der Innendruck im Einschlag gegenhält
  /* --- Der Aufprallteller (siehe softbody.js, Punkt 10) --------------------
   * `klatschTeller` fährt den Superellipsen-Exponenten der unteren Flanke
   * hoch: aus der unteren Halbkugel wird eine Scheibe mit gerolltem Rand.
   * `klatschDeckel` hebt dabei den Deckel `flankeMax` mit an, sonst greift
   * der genau dort, wo die Verbreiterung gebraucht wird.
   * `klatschRand` legt zusätzlich Querschnitt in ein Band dicht über dem
   * Bodenpol — das ist der Wulst, der AUF der Kontaktebene sitzt.
   * `klatschNachhall` ist die Rate, mit der die Erinnerung an die Walze
   * abklingt (1/s): sie hält Wulst und Teller so lange, wie die
   * breitgewalzte Masse tatsächlich noch am Boden liegt. */
  klatschTeller: 3.0,   // Zuschlag auf den Flanken-Exponenten beim Aufprall
  klatschDeckel: 1.6,   // Zuschlag auf den Flanken-Deckel
  klatschRand: 0.45,    // Amplitude des Bodenwulsts
  klatschRandOrt: 0.88, // Ort des Wulstkerns (0 = Äquator, 1 = Bodenpol)
  klatschRandZone: 0.40,// wie weit der Wulst nach oben und unten reicht (in by)
  klatschNachhall: 9.0, // wie schnell die Erinnerung an die Walze abklingt (1/s)
  klatschStauchVoll: 0.32, // gemessene Flachheit, bei der Teller und Wulst voll stehen
  klatschSitz: 0.20,    // wie stark sich die Sollform beim Aufprall auf die Kontaktebene legt
  klatschKehle: 0.22,   // Tiefe der Kehle zwischen Kuppe und Schuerze
  klatschKehleOrt: 0.42,// Ort der Kehle (0 = Aequator, 1 = Bodenpol)
  klatschKehleZone: 0.45,// wie weit die Kehle reicht (in by)

  // Welt
  gravity: 18,
  hopPower: 8.5,
  bounce: 0.05,
  groundK: 10000,     // Steifigkeit der Bodenfeder
  groundDamp: 40,
  groundGrip: 3,      // Haftung der Kontaktpunkte (1/s)
  wallFriction: 8,    // Reibung an Hindernissen (1/s)

  // Steuerung
  arriveRadius: 2.5,
  stopRadius: 0.35,
};

const PRESETS = {
  standard: {},
  traege: { mass: 1.5, shape: 170, skin: 650, jiggleDamp: 1.3, maxSpeed: 5,
            response: 4, maxAccel: 26, rollIn: 0.6, friction: 1.2, stretch: 0.28,
            rearBias: 1.3, turnRate: 4.5, sag: 0.38 },
  flutschig: { shape: 380, skin: 1400, jiggleDamp: 3.2, maxSpeed: 11, response: 9,
               maxAccel: 70, rollIn: 0.16, friction: 2.6, stretch: 0.5, turnRate: 10 },
  gallerte: { shape: 120, skin: 420, pressure: 640, jiggleDamp: 0.9, shapeDamp: 3,
              skinDamp: 3, stretch: 0.5, wobble: 0.11, maxSpeed: 6, rollIn: 0.5,
              sag: 0.45, prall: 1.25 },
};

const CONTROLS = [
  { group: 'Bewegung' },
  { key: 'maxSpeed', label: 'Max-Tempo', min: 2, max: 18, step: 0.5 },
  { key: 'response', label: 'Antriebshärte', min: 1, max: 16, step: 0.5 },
  { key: 'maxAccel', label: 'Max-Beschleunigung', min: 8, max: 120, step: 1 },
  { key: 'rollIn', label: 'Anrollzeit (s)', min: 0.02, max: 1.2, step: 0.02 },
  { key: 'friction', label: 'Bodenreibung', min: 0.2, max: 6, step: 0.1 },
  { key: 'groundGrip', label: 'Haftung', min: 0, max: 30, step: 0.5 },
  { key: 'rearBias', label: 'Nachziehen', min: 0, max: 2.5, step: 0.05 },
  { key: 'anrollHalt', label: 'Anrollen: Haltephase', min: 0, max: 0.9, step: 0.05 },
  { key: 'anrollWalken', label: 'Anrollen: Vorwälzen', min: 0, max: 60, step: 1 },
  { key: 'heckKleben', label: 'Anrollen: Heck klebt', min: 0, max: 30, step: 0.5 },
  { key: 'zipfel', label: 'Heckzipfel Länge', min: 0, max: 1.6, step: 0.05 },
  { key: 'zipfelSchlank', label: 'Heckzipfel Verjüngung', min: 0, max: 0.85, step: 0.05 },
  { key: 'zipfelTief', label: 'Anrollen: Schleppe am Boden', min: 0, max: 2.5, step: 0.05 },
  { key: 'zipfelSenke', label: 'Anrollen: Schleppe sackt ab', min: 0, max: 2, step: 0.05 },
  { key: 'anrollScher', label: 'Anrollen: Scheitel nach vorn', min: -0.3, max: 2.0, step: 0.05 },
  { key: 'anrollRund', label: 'Anrollen: Heckdorn zurueck', min: 0, max: 1, step: 0.05 },
  { key: 'anrollTaille', label: 'Anrollen: Kehle hinter dem Ballen', min: 0, max: 0.8, step: 0.02 },
  { key: 'anrollFuss', label: 'Anrollen: Gelfuss tritt zurueck', min: 0, max: 1, step: 0.05 },
  { key: 'streckSchmal', label: 'Streckung: schmal statt flach', min: 0, max: 0.9, step: 0.02 },
  { key: 'vollgasAb', label: 'Vollgas ab Tempoanteil', min: 0.2, max: 0.95, step: 0.05 },
  { key: 'vollgasRund', label: 'Vollgas: Heck einrunden', min: 0, max: 1, step: 0.05 },
  { key: 'vollgasKurz', label: 'Vollgas: Heck kürzen', min: 0, max: 0.9, step: 0.05 },
  { key: 'vollgasStreck', label: 'Vollgas: Extra-Streckung', min: 0, max: 0.8, step: 0.02 },
  { key: 'frontLang', label: 'Vollgas: Front ausgezogen', min: 0, max: 1.2, step: 0.05 },
  { key: 'frontFlach', label: 'Vollgas: Front flach/breit', min: 0, max: 0.9, step: 0.05 },
  { key: 'keilAb', label: 'Vollgas: Nase tief', min: 0, max: 0.7, step: 0.02 },
  { key: 'vollgasScher', label: 'Vollgas: Scheitel ueber die Vorderkante', min: 0, max: 1, step: 0.02 },
  { key: 'keilKraft', label: 'Vollgas: Kraft der Schräglage', min: 0, max: 80, step: 1 },
  { key: 'turnRate', label: 'Drehtempo Gesicht', min: 1, max: 16, step: 0.5 },

  { group: 'Kehrtwende' },
  { key: 'wendeAb', label: 'Wende ab Richtungsunterschied', min: -0.5, max: 0.9, step: 0.05 },
  { key: 'wendeMinTempo', label: 'Wende ab Tempoanteil', min: 0, max: 0.8, step: 0.02 },
  { key: 'wendeDauer', label: 'Wende: Ausklingzeit (s)', min: 0.05, max: 1.2, step: 0.05 },
  { key: 'wendeBrems', label: 'Wende: Zieltempo bricht ein', min: 0, max: 1, step: 0.05 },
  { key: 'wendeKraft', label: 'Wende: Bremskraft', min: 0, max: 50, step: 0.5 },
  { key: 'wendeSperre', label: 'Wende: Vortrieb gesperrt', min: 0, max: 1, step: 0.05 },
  { key: 'wendeRoll', label: 'Wende: Anrollen zurueckwerfen', min: 0, max: 1, step: 0.05 },
  { key: 'wendeHalten', label: 'Wende: Kopf haelt alte Richtung', min: 0, max: 0.95, step: 0.05 },
  { key: 'wendeFlieh', label: 'Wende: Masse quillt nach aussen', min: 0, max: 90, step: 1 },
  { key: 'wendeSchwing', label: 'Wende: Nachschwingen darueber', min: 0, max: 2, step: 0.05 },

  { group: 'Bremsen & Nachschwingen' },
  { key: 'bremsKraft', label: 'Bremskraft', min: 0, max: 40, step: 0.5 },
  { key: 'bremsAus', label: 'Bremse blendet aus unter (m/s)', min: 0.1, max: 2.5, step: 0.05 },
  { key: 'bremsZipfel', label: 'Bremsen: Zipfel zieht ein', min: 0, max: 1, step: 0.05 },
  { key: 'bremsKurz', label: 'Bremsen: Tempostreckung faellt weg', min: 0, max: 1, step: 0.05 },
  { key: 'bremsStauch', label: 'Bremsen: Laengsstauchung', min: 0, max: 0.5, step: 0.01 },
  { key: 'bremsHoch', label: 'Bremsen: Ausgleich in die Hoehe', min: 0, max: 1, step: 0.05 },
  { key: 'bremsScherHalt', label: 'Bremsen: haelt das Lehnpendel', min: 0, max: 2, step: 0.05 },
  { key: 'lehnRueck', label: 'Lehnpendel: Rueckstoss', min: 0, max: 6, step: 0.1 },
  { key: 'bremsNicken', label: 'Bremsen: Masse schwappt vor', min: 0, max: 80, step: 1 },
  { key: 'bremsLaden', label: 'Bremsen: laedt Nachschwingen', min: 0, max: 12, step: 0.2 },
  { key: 'schwingMax', label: 'Nachschwingen: Amplitude', min: 0, max: 0.7, step: 0.02 },
  { key: 'schwingHz', label: 'Nachschwingen: Frequenz (Hz)', min: 1.5, max: 9, step: 0.1 },
  { key: 'schwingAbkling', label: 'Nachschwingen: Abklingrate', min: 0.4, max: 6, step: 0.05 },
  { key: 'schwingKraft', label: 'Nachschwingen: Kraft', min: 0, max: 120, step: 2 },

  { group: 'Körper' },
  { key: 'mass', label: 'Masse', min: 0.4, max: 3, step: 0.05 },
  { key: 'skin', label: 'Hautspannung', min: 200, max: 2500, step: 20 },
  { key: 'bend', label: 'Biegesteifigkeit', min: 0, max: 600, step: 10 },
  { key: 'shape', label: 'Formgedächtnis', min: 40, max: 700, step: 10 },
  { key: 'pressure', label: 'Innendruck', min: 500, max: 20000, step: 100 },
  { key: 'stiffen', label: 'Verformungsgrenze', min: 0, max: 20, step: 0.5 },
  { key: 'jiggleDamp', label: 'Nachschwingen dämpfen', min: 0.3, max: 8, step: 0.1 },
  { key: 'viscosity', label: 'Zähigkeit', min: 0, max: 40, step: 0.5 },
  { key: 'adhesion', label: 'Bodenhaftung', min: 0, max: 20, step: 0.5 },
  { key: 'crawl', label: 'Kriechwelle', min: 0, max: 1.5, step: 0.05 },
  { key: 'slumpTime', label: 'Zusammensacken (s)', min: 0.2, max: 5, step: 0.1 },
  { key: 'stretch', label: 'Streckung bei Tempo', min: 0, max: 1, step: 0.02 },
  { key: 'wobble', label: 'Oberflächenwelle', min: 0, max: 0.22, step: 0.005 },
  { key: 'sag', label: 'Breite Basis', min: 0, max: 0.8, step: 0.02 },
  { key: 'squat', label: 'Sollvolumen', min: 0.4, max: 1.4, step: 0.02 },
  { key: 'prall', label: 'Prallheit (Höhe/Breite)', min: 0.6, max: 2.6, step: 0.02 },
  { key: 'asymm', label: 'Schieflage', min: 0, max: 0.2, step: 0.005 },
  { key: 'slumpFlach', label: 'Sacken: flacher', min: 0, max: 0.5, step: 0.01 },
  { key: 'slumpBreit', label: 'Sacken: breiter', min: 0, max: 0.9, step: 0.02 },
  { key: 'wabbel', label: 'Wabbeln im Stand', min: 0, max: 1.4, step: 0.01 },
  { key: 'wippen', label: 'Wippen im Stand', min: 0, max: 3, step: 0.05 },

  { group: 'Silhouette der Ruheform' },
  { key: 'scherRuhe', label: 'Scherung längs: Ruhe-Schieflage', min: -0.3, max: 0.4, step: 0.01 },
  { key: 'scherLaengs', label: 'Scherung längs: aus Beschleunigung', min: 0, max: 1.0, step: 0.02 },
  { key: 'scherBezug', label: 'Scherung: Bezugsbeschleunigung', min: 3, max: 40, step: 0.5 },
  { key: 'scherFolge', label: 'Scherung quer: Nachlauf (1/s)', min: 1, max: 30, step: 0.5 },
  { key: 'scherHz', label: 'Scherung längs: Pendelfrequenz (Hz)', min: 0.5, max: 6, step: 0.1 },
  { key: 'scherDaempf', label: 'Scherung längs: Dämpfungsmaß', min: 0.05, max: 1.2, step: 0.01 },
  { key: 'scherQuer', label: 'Scherung quer: Schraeglage in der Kehre', min: 0, max: 1.0, step: 0.02 },
  { key: 'kehreMasseFolge', label: 'Kehre: Nachlauf des Schwungs (1/s)', min: 0.5, max: 12, step: 0.25 },
  { key: 'kehreFolge', label: 'Kehre: Nachlauf der Schleppachse (1/s)', min: 2, max: 30, step: 0.5 },
  { key: 'kehreZug', label: 'Kehre: Heck bleibt auf alter Achse', min: 0, max: 1.2, step: 0.02 },
  { key: 'kehreBogen', label: 'Kehre: Mittellinie kruemmt sich', min: 0, max: 2.0, step: 0.02 },
  { key: 'kehreOrt', label: 'Kehre: Ort des Ausschlags', min: -0.9, max: 0.9, step: 0.02 },
  { key: 'kehreBreite', label: 'Kehre: Laenge des Ausschlags', min: 0.2, max: 1.5, step: 0.05 },
  { key: 'kehreTaille', label: 'Kehre: Hals zwischen Kopf und Schleppe', min: 0, max: 0.7, step: 0.02 },
  { key: 'kehreZipfel', label: 'Kehre: Schleppe ohne Tempo', min: 0, max: 1.4, step: 0.05 },
  { key: 'kehreTief', label: 'Kehre: Schleppe schleift am Boden', min: 0, max: 2.5, step: 0.05 },
  { key: 'kehreSenke', label: 'Kehre: Schleppe sackt zu Boden', min: 0, max: 1.2, step: 0.02 },
  { key: 'kehreKeule', label: 'Kehre: Knoten am Schleppende', min: 0, max: 2.5, step: 0.05 },
  { key: 'kehreKeuleBreite', label: 'Kehre: Laenge des Knotens', min: 0.15, max: 0.9, step: 0.05 },
  { key: 'kehreFlach', label: 'Kehre: drueckt flach und breit', min: 0, max: 0.6, step: 0.02 },
  { key: 'kehreTotgang', label: 'Kehre: Totgang der neuen Kanaele', min: 0, max: 0.8, step: 0.05 },
  { key: 'kehreFuss', label: 'Kehre: Gelfuss tritt zurueck', min: 0, max: 1, step: 0.05 },
  { key: 'tropfen', label: 'Tropfen: vorn voll, hinten dünn', min: -0.3, max: 0.6, step: 0.02 },
  { key: 'tropfenTempo', label: 'Tropfen: Zuwachs mit Nachzug', min: 0, max: 0.8, step: 0.02 },
  { key: 'tropfenSenke', label: 'Tropfen: Front hoch, Heck tief', min: -0.3, max: 0.5, step: 0.01 },
  { key: 'bauchHoch', label: 'Breiteste Stelle: Höhe', min: 0, max: 2, step: 0.02 },
  { key: 'bauchBreite', label: 'Breiteste Stelle: Zone', min: 0.3, max: 2.2, step: 0.05 },
  { key: 'flanke', label: 'Flanke: Kastigkeit unten', min: 2, max: 8, step: 0.1 },
  { key: 'flankeMax', label: 'Flanke: Deckel', min: 1, max: 4, step: 0.05 },
  { key: 'fuss', label: 'Gelfuß: Tiefe der Kehle', min: 0, max: 1, step: 0.02 },
  { key: 'fussHoch', label: 'Gelfuß: Ort der Kehle', min: 0, max: 0.6, step: 0.01 },
  { key: 'fussZone', label: 'Gelfuß: Breite der Kehle', min: 0.08, max: 0.6, step: 0.01 },
  { key: 'fussFolge', label: 'Gelfuß: Nachlauf (1/s)', min: 1, max: 30, step: 0.5 },
  { key: 'taille', label: 'Taille: ständig', min: 0, max: 0.7, step: 0.02 },
  { key: 'tailleZug', label: 'Taille: bei Überdehnung', min: 0, max: 1.2, step: 0.02 },
  { key: 'taillePos', label: 'Taille: Ort auf der Längsachse', min: -0.9, max: 0.9, step: 0.05 },
  { key: 'tailleBreite', label: 'Taille: Breite der Kehle', min: 0.2, max: 1.5, step: 0.05 },

  { group: 'Sprung & Aufprall' },
  { key: 'hopPower', label: 'Sprungkraft', min: 3, max: 20, step: 0.5 },
  { key: 'gravity', label: 'Schwerkraft', min: 8, max: 60, step: 1 },
  { key: 'bounce', label: 'Abprall', min: 0, max: 0.5, step: 0.01 },
  { key: 'flugStreck', label: 'Flug: Längsstreckung', min: 0, max: 0.8, step: 0.02 },
  { key: 'flugTempo', label: 'Flug: Tempo für volle Streckung', min: 2, max: 20, step: 0.5 },
  { key: 'flugFolge', label: 'Flug: Formwechsel-Tempo', min: 2, max: 40, step: 1 },
  { key: 'klatschHz', label: 'Aufprall: Federfrequenz (Hz)', min: 1.5, max: 9, step: 0.1 },
  { key: 'klatschDaempf', label: 'Aufprall: Dämpfungsmaß', min: 0.02, max: 0.8, step: 0.01 },
  { key: 'klatschAnriss', label: 'Aufprall: Anriss', min: 0, max: 20, step: 0.25 },
  { key: 'klatschMin', label: 'Aufprall: flachste Höhe', min: 0.35, max: 1, step: 0.01 },
  { key: 'klatschMax', label: 'Aufprall: höchste Streckung', min: 1, max: 2, step: 0.02 },
  { key: 'klatschKraft', label: 'Aufprall: Kraft nach außen', min: 0, max: 90, step: 1 },
  { key: 'klatschSchuerze', label: 'Aufprall: Schürze am Rand', min: 0, max: 1.2, step: 0.02 },
  { key: 'klatschBreit', label: 'Aufprall: Grundfläche geht mit', min: 0.5, max: 2.5, step: 0.05 },
  { key: 'klatschWulst', label: 'Aufprall: Wulst am Bodenrand', min: 0, max: 1, step: 0.05 },
  { key: 'klatschDruck', label: 'Aufprall: Innendruck-Zuschlag', min: 0, max: 60, step: 0.5 },
  { key: 'klatschTeller', label: 'Aufprall: Teller (Flanken-Exponent)', min: 0, max: 8, step: 0.1 },
  { key: 'klatschDeckel', label: 'Aufprall: Teller-Deckel', min: 0, max: 5, step: 0.1 },
  { key: 'klatschRand', label: 'Aufprall: Wulst am Boden', min: 0, max: 1.5, step: 0.05 },
  { key: 'klatschRandOrt', label: 'Aufprall: Ort des Wulsts', min: 0, max: 1, step: 0.02 },
  { key: 'klatschRandZone', label: 'Aufprall: Zone des Wulsts', min: 0.15, max: 1.2, step: 0.05 },
  { key: 'klatschNachhall', label: 'Aufprall: Nachhall der Walze (1/s)', min: 0.5, max: 20, step: 0.5 },
  { key: 'klatschStauchVoll', label: 'Aufprall: Flachheit fuer vollen Wulst', min: 0.1, max: 0.6, step: 0.01 },
  { key: 'klatschSitz', label: 'Aufprall: Sitz auf der Kontaktebene', min: 0, max: 0.32, step: 0.01 },
  { key: 'klatschKehle', label: 'Aufprall: Kehle ueber der Schuerze', min: 0, max: 0.4, step: 0.01 },
  { key: 'klatschKehleOrt', label: 'Aufprall: Ort der Kehle', min: 0, max: 1, step: 0.02 },
  { key: 'klatschKehleZone', label: 'Aufprall: Zone der Kehle', min: 0.15, max: 1.2, step: 0.05 },
];

/* Sichtbare Größe kommt ausschließlich vom Level (GDD 01 §29, §45–48).
 * Fressen macht kurz prall, ändert die Größe aber nie dauerhaft.
 *
 * Kurve absichtlich flach am Anfang und gedeckelt am Ende:
 *   L1 = 1.00 · L5 = 1.16 · L10 = 1.28 · L30 = 1.66 · L80 = 2.35
 * Das ist "auf Level 5 etwas größer, auf 30 deutlich, auf 80 sehr groß",
 * ohne dass die Welt von Riesenschleimen unspielbar wird (§46–48). */
const BASIS_RADIUS = 1.0;
function radiusFuerLevel(level) {
  const t = Math.max(0, Math.min(1, (level - 1) / 79));
  return BASIS_RADIUS * (1 + 1.35 * Math.pow(t, 0.72));
}

if (typeof window !== 'undefined') {
  window.PARAMS = PARAMS;
  window.PRESETS = PRESETS;
  window.CONTROLS = CONTROLS;
  window.radiusFuerLevel = radiusFuerLevel;
}
