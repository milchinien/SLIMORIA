'use strict';

/* ---------------------------------------------------------------------------
 * Der Schleim als Spielfigur
 *
 * Alles, was über den reinen Weichkörper hinausgeht: indirekter Antrieb per
 * Klick (wie im GDD), Blickrichtung, Sprung, Gesicht und Schleimspur.
 * ------------------------------------------------------------------------- */

function createSlime(mesh, P) {
  return {
    body: createSoftBody(mesh, 0, P.radius, 0, P.radius),
    facing: 0,                   // Blickrichtung als Winkel um die Y-Achse
    fx: 1, fz: 0,
    speed: 0,
    speedRatio: 0,
    roll: 0,                     // Fortschritt des Anrollens: 0 → 1
    traction: 0,                 // freigegebener Vortriebsanteil: 0 → 1
    heckAnker: 0,                // wie fest die hintere Aufstandsfläche klebt
    nachzug: 0,                  // Stärke des nachgezogenen Heckzipfels
    vollgas: 0,                  // Stufe "sehr schnell" (GDD 01 §14): 0 → 1
    bremsen: 0,                  // Tempoüberschuss über den Zielwunsch: 0 → 1
    wende: 0,                    // laufende Kehrtwende (GDD 01 §15): 0 → 1
    drehRate: 0,                 // geglättete Winkelgeschwindigkeit des Kopfes
    schwingA: 0,                 // Amplitude des Nachschwingens (GDD 01 §13)
    schwingT: 0,                 // Zeit seit dem Anriss, treibt die Phase
    schwing: 0,                  // aktueller Ausschlag, negativ = längs gestaucht
    slump: 0,                    // Zusammensacken im Stand: 0 → 1
    target: null,                // Klickziel { x, z }
    look: { x: 0, y: 0, z: 1 },  // Pupillen mit Nachlauf
    lookV: { x: 0, y: 0, z: 0 },
    blink: 0,
    blinkTimer: 2.5,
    mouth: 0,
    airborne: 0,
    wasGrounded: true,
    fallSpeed: 0,
    impact: 0,
    klatsch: 0,                  // Aufprallfeder (GDD 01 §20): >0 platt, <0 lang
    klatschV: 0,                 // ihre Geschwindigkeit — hier greift der Anriss an
    flugStreck: 0,               // Längsstreckung im Flug, geglättet
    klatschGes: 0,               // was die Ruheform am Ende sieht
    grab: null,
    trail: [],
    trailAcc: 0,
    drive: { x: 0, z: 0 },
  };
}

function angleLerp(a, b, t) {
  const twoPi = Math.PI * 2;
  const d = ((b - a + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return a + d * t;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function updateSlime(s, dt, P, world, input, time) {
  const b = s.body;

  s.speed = Math.hypot(b.vx, b.vz);
  s.speedRatio = clamp(s.speed / P.maxSpeed, 0, 1);

  /* --- Die Stufe "sehr schnell" (GDD 01 §14) ------------------------------
   * §14 zählt vier Stufen auf, und die letzte ist ausdrücklich etwas anderes
   * als "noch mehr Streckung": vorne flacher und länger, hinterer Teil
   * nachgezogen. Als reine Funktion von speedRatio wäre der Übergang nicht
   * zu sehen — der Körper würde einfach immer länger. Also bekommt die
   * Stufe eine eigene, spät einsetzende Kurve mit weichen Enden, damit sie
   * beim Beschleunigen als eigener Moment kippt und beim Bremsen wieder
   * aufsteht. */
  const vg = clamp((s.speedRatio - P.vollgasAb) / Math.max(1 - P.vollgasAb, 1e-3), 0, 1);
  s.vollgas = vg * vg * (3 - 2 * vg);

  /* --- Wohin will die Masse? --------------------------------------------- */
  let wantX = 0, wantZ = 0, want = false, arrive = 1;

  if (input.axis.x || input.axis.z) {           // Direktsteuerung (Debug)
    s.target = null;
    const l = Math.hypot(input.axis.x, input.axis.z);
    wantX = input.axis.x / l; wantZ = input.axis.z / l;
    want = true;
  } else if (s.target) {                        // Klicksteuerung (GDD)
    const dx = s.target.x - b.cx, dz = s.target.z - b.cz;
    const dist = Math.hypot(dx, dz);
    if (dist < P.stopRadius) {
      s.target = null;
    } else {
      wantX = dx / dist; wantZ = dz / dist;
      want = true;
      arrive = clamp(dist / P.arriveRadius, 0, 1);
    }
  }

  /* --- Die Kehrtwende als eigener Vorgang (GDD 01 §15) --------------------
   * §15 verlangt fünf Schritte in dieser Reihenfolge: abbremsen → verformen
   * → kurz nachschwingen → Richtung ändern → in die neue Richtung
   * beschleunigen. Keiner davon war vorhanden, und der Grund war eine
   * einzige Zeile weiter unten: `bremsen` misst den Überschuss über das
   * Zieltempo, und das bleibt bei einer Kehrtwende unverändert das Maximum.
   * Also blieb `bremsen` null, und mit ihm alles, was daran hängt. Übrig
   * war der Grip-Faktor beim Antrieb — so dreht ein Fahrzeug mit rutschenden
   * Reifen, kein Körper, der seine eigene Masse umkehren muss (§66).
   *
   * `wende` ist deshalb kein zweiter Satz Effekte neben dem Bremsen, sondern
   * ein Schalter, der die vorhandene Maschinerie füttert: er senkt das
   * Zieltempo, sperrt den Vortrieb und wirft das Anrollen zurück. Die vier
   * anderen Phasen fallen daraus von selbst und in der richtigen Reihenfolge
   * heraus — Bremsantrieb, Bremsnicken, Nachschwingen und ein erneutes
   * Anrollen in die neue Richtung.
   *
   * Ausgelöst wird an der tatsächlichen Fahrt, nicht am Wunsch: solange die
   * Masse noch in die alte Richtung fliegt, ist die Wende nicht vorbei, egal
   * was der Spieler inzwischen will. Und unterhalb von `wendeMinTempo` gibt
   * es keine Masse, die umkehren müsste — dort wäre eine Wendephase nur eine
   * Verzögerung ohne Bild, und Kontrolle geht vor Physik (§67). */
  /* Die Tiefe der Wende ist das Produkt aus zwei Fragen: wie weit steht der
   * Wunsch gegen die Fahrt, und wie viel Masse ist überhaupt in Fahrt. Der
   * zweite Faktor ist keine Feinheit, sondern das, was den Vorgang von selbst
   * beendet. Als harte Schwelle geschrieben hängt er: kein Vortrieb heißt
   * niedriges Tempo mit Restdrift nach hinten, und die hält die Wende am
   * Leben, die den Vortrieb sperrt. Gemessen stand der Schleim damit 450 ms
   * bei 0.3 m/s — die Phase war da, aber es war nichts mehr zu sehen, und
   * Kontrolle geht vor Physik (§67). Als weicher Faktor läuft die Wende mit
   * der Masse aus, die sie ausgelöst hat. */
  let wendeAn = 0;
  if (want && s.speed > 0.05) {
    const dot = (wantX * b.vx + wantZ * b.vz) / s.speed;
    const tempo = clamp(s.speedRatio / Math.max(P.wendeMinTempo, 1e-3), 0, 1);
    wendeAn = clamp((P.wendeAb - dot) / (P.wendeAb + 1), 0, 1) * tempo;
  }
  s.wende = wendeAn > s.wende
    ? wendeAn
    : Math.max(0, s.wende - dt / Math.max(P.wendeDauer, 0.03));

  /* --- Anrollen (GDD 01 §13) ---------------------------------------------
   * "Stillstand → Anrollen → Beschleunigung → Maximum" verlangt vier Phasen,
   * nicht eine weiche Rampe. Ein linear hochgezogener Antriebsfaktor macht
   * nur die Beschleunigung sanfter — man sieht ihm nicht an, dass der Körper
   * erst losmuss. Also bekommt das Anrollen eine eigene Phase:
   *
   *   Haltephase (roll < anrollHalt): der Vortrieb bleibt fast gesperrt. Die
   *     Masse wälzt sich nach vorn-oben über die Aufstandsfläche, das Heck
   *     klebt (siehe heckAnker). Der Körper spannt sich, er fährt nicht.
   *   Freigabe (danach): der Anker reißt, der Vortrieb wird freigegeben —
   *     der Schleim fällt regelrecht in die Bewegung hinein.
   *
   * Erst danach übernimmt die normale Beschleunigung bis zum Maximum. */
  if (want) s.roll = Math.min(1, s.roll + dt / Math.max(P.rollIn, 0.01));
  else      s.roll = Math.max(0, s.roll - dt * 5);
  /* Anrollen kann nur, wessen Masse steht. Solange die Wende läuft, fliegt
   * der Körper noch in die alte Richtung — der Anrollzähler wird deshalb
   * niedergehalten und startet erst im Umkehrpunkt. Ohne das läuft er
   * während der ganzen Bremsphase mit, ist am Umkehrpunkt längst voll und
   * der Schleim springt in die neue Richtung, statt in sie hineinzurollen:
   * gemessen 2.8 auf 5.7 m/s in 150 ms, also dieselbe Delle wie vorher, nur
   * um eine Phase verschoben. */
  if (s.wende > 0.5) s.roll = Math.min(s.roll, 1 - clamp(P.wendeRoll, 0, 1));

  const halt = clamp(P.anrollHalt, 0, 0.9);
  const u = clamp((s.roll - halt) / (1 - halt), 0, 1);
  // 8 % Restvortrieb in der Haltephase: er steht nicht wie festgenagelt da,
  // er schiebt nur noch nichts weg.
  s.traction = (u * u * (3 - 2 * u)) * 0.92 + s.roll * 0.08;
  // Der Anker reißt kurz nachdem der Vortrieb einsetzt — die Überlappung
  // der beiden ist der Moment, in dem der Zipfel ausgezogen wird.
  /* Und er gilt nur, solange der Körper auch wirklich losWILL — dieselbe
   * Bedingung, die `vorspann` weiter unten schon hat, und aus demselben
   * Grund. Beim LOSLASSEN läuft `roll` rückwärts durch die Haltephase: der
   * Zähler fällt von 1 durch `anrollHalt` hindurch, `u` geht dabei auf null,
   * und `heckAnker` schießt mitten in der Bremsung auf über 0.5.
   *
   * Gemessen war das die eigentliche Ursache des Bremsbefunds. An `anroll`
   * hängt in updateRestShape der komplette Anroll-Lastfall: `anrollScher`
   * mit 1.55 Radien Vorwärts-Schieflage, die tiefliegende Schleppe
   * (`zipfelTief`), die Anroll-Taille und die Rücknahme des Fußeinzugs.
   * Alles das sind Antworten auf eine KLEBENDE Hinterkante — beim Bremsen
   * klebt aber nichts, dort läuft das Heck auf die stehende Front auf. Der
   * Anroll-Term überschrieb außerdem die Bremsscherung, weil er sie über
   * `1 - anroll` ausblendet: die Silhouette stand mitten im Bremsbild auf
   * dem Anrollwert 1.55 statt auf dem Bremswert 0.39, und was auf dem
   * Kontaktbogen stand, war ein umgefallener Keil mit tiefer Schleppfahne
   * statt eines auflaufenden Körpers (GDD 01 §5, §13, §66). */
  s.heckAnker = want ? clamp(1 - u * 1.35, 0, 1) * s.roll : 0;
  /* Nachzug: bei Dauerfahrt trägt ihn das Tempo (§14). Beim Anrollen kommt
   * eine Vorspannung dazu, und die gehört in die HALTEPHASE — dort steht der
   * Körper noch, will aber schon los: die Masse zieht nach vorn, das Heck
   * klebt, die Silhouette wird zum Tropfen. Genau daran erkennt man, dass er
   * anrollt und nicht einfach losfährt (§13, §12). Maximum im Moment der
   * Freigabe, danach löst es sich in die Fahrtstreckung auf. */
  /* Nur, solange er auch wirklich losWILL. Ohne diese Bedingung durchläuft
   * `roll` beim LOSLASSEN dieselbe Haltephase rückwärts: der Zähler fällt
   * von 1 durch `anrollHalt` hindurch, `vorspann` springt dabei von 0 auf
   * fast 1, und der Anroll-Zipfel schießt mitten im Bremsen auf sein
   * Maximum. Gemessen stand `nachzug` 100 ms nach `stop()` bei 1.35, also
   * höher als bei Höchsttempo — im Bild wurde daraus eine papierdünne
   * Schleppfahne, die dem gebremsten Körper die Masse nahm (GDD 01 §66,
   * §5: die Blob-Identität geht niemals verloren). Beim Bremsen gehört die
   * Vorspannung ohnehin nicht hin: dort zieht nichts nach vorn, dort läuft
   * das Heck auf. */
  const vorspann = !want ? 0
    : s.roll < halt
      ? s.roll / Math.max(halt, 1e-3)
      : clamp(1 - u * 1.15, 0, 1);
  // Bewusst nur leicht verzögert (Exponent 1.35 statt quadratisch): der
  // Körper muss schon in den ersten hundert Millisekunden erkennbar ziehen,
  // sonst steht er die halbe Anrollphase über unverändert da und die Phase
  // ist zwar gemessen vorhanden, aber nicht zu sehen.
  /* Die Vorspannung gehört zum Anrollen aus dem STAND: das Heck klebt, die
   * Front zieht, die Silhouette wird zum Tropfen. Während einer Kehrtwende
   * ist der Körper aber nicht im Stand, er fliegt noch — die richtige Form
   * ist dort die längs gestauchte Bremsform, nicht der Anroll-Tropfen. Ohne
   * diese Gewichtung schoss der Zipfel genau im Umkehrpunkt auf sein Maximum
   * und blähte den gemessenen Körper auf 1.23 Ruhevolumen auf; sichtbare
   * Größe kommt aber ausschließlich vom Level (GDD 01 §29). So wandert der
   * Tropfen dorthin, wo §15 ihn hinsortiert: hinter die Wende, in das
   * Anrollen in die neue Richtung. */
  /* Und beim Bremsen zieht sich der Zipfel EIN. Er ist die Masse, die dem
   * Körper hinterherhängt, weil sie noch beschleunigt werden muss — genau
   * das hört beim Bremsen auf. Dort läuft das Heck auf die stehende Front
   * auf, der Körper staucht sich längs (§13, §15: "abbremsen → verformen").
   *
   * Ohne diese Zeile blieb der ausgezogene Fahrzipfel während der ganzen
   * Bremsung stehen, und zusammen mit der Bremsschieflage wurde daraus eine
   * papierdünne, nach hinten ausgewalzte Fahne: gemessen Länge zu Höhe
   * 2.19 zu 1 im Bild, in dem der Körper eigentlich am kürzesten sein soll.
   * Das ist keine Masse mehr (§66) und im Grenzfall auch keine Blob-
   * Identität (§5).
   *
   * `s.bremsen` stammt aus dem vorigen Schritt — es wird weiter unten neu
   * gebildet. Vier Millisekunden Verzug sind hier kein Mangel, sondern
   * richtig: die Form soll der Bewegung nachhinken. */
  const zipfelEin = 1 - clamp(P.bremsZipfel, 0, 1) * s.bremsen;
  s.nachzug = clamp(s.speedRatio * zipfelEin
                    + 0.95 * Math.pow(vorspann, 1.35) * (1 - s.wende), 0, 1.35);

  s.drive.x = 0; s.drive.z = 0;
  if (want) {
    const desX = wantX * P.maxSpeed * arrive;
    const desZ = wantZ * P.maxSpeed * arrive;
    // Reibung wird vorgehalten, sonst bleibt das eingestellte Max-Tempo
    // reine Theorie und der Regler lügt.
    const ff = P.friction + P.groundGrip * 0.25;
    let ax = (desX - b.vx) * P.response + desX * ff;
    let az = (desZ - b.vz) * P.response + desZ * ff;

    // Ein Richtungswechsel kostet Grip — die Masse muss erst umkehren.
    if (s.speed > 0.8) {
      const dot = (wantX * b.vx + wantZ * b.vz) / s.speed;
      const grip = 1 - 0.4 * clamp((1 - dot) * 0.5, 0, 1);
      ax *= grip; az *= grip;
    }

    const mag = Math.hypot(ax, az);
    if (mag > P.maxAccel) { ax = ax / mag * P.maxAccel; az = az / mag * P.maxAccel; }

    const air = b.grounded ? 1 : 0.3;
    /* Während der Wende ist der Vortrieb gesperrt: erst abbremsen, dann die
     * Richtung ändern, dann beschleunigen (§15) — nicht alles gleichzeitig.
     * Ohne die Sperre läuft das zurückgeworfene Anrollen schneller wieder
     * hoch (rollIn 0.42 s), als die Wende ausklingt (wendeDauer 0.30 s), und
     * der Schleim zieht schon wieder an, während er noch rückwärts fliegt. */
    const frei = s.traction * (1 - clamp(P.wendeSperre, 0, 1) * s.wende);
    s.drive.x = ax * frei * air;
    s.drive.z = az * frei * air;

    /* Gebremst wird trotzdem, und zwar gegen die tatsächliche Fahrt statt in
     * die neue Richtung. Der Unterschied ist im Bild zu sehen: der Schub
     * läuft durch denselben Kanal wie der Vortrieb, und `rearBias` gewichtet
     * dort die Punkte, die dem Schub ENTGEGEN liegen. Zeigt er nach hinten,
     * greift er an der Front an — die Front wird festgehalten, das Heck
     * läuft auf, der Körper staucht sich längs zusammen. Genau das ist das
     * "verformen" aus §15, und es entsteht aus der Kraft, nicht aus einer
     * gesetzten Form (§66).
     *
     * Unter 0.4 m/s aus, damit die Wende den Schleim nicht rückwärts zuckt. */
    if (s.wende > 0.01 && b.grounded && s.speed > 0.4) {
      const k = P.wendeKraft * s.wende / s.speed;
      s.drive.x -= b.vx * k;
      s.drive.z -= b.vz * k;
    }
  } else if (b.grounded && s.speed > 0.05) {
    /* --- Abbremsen als eigene Phase (GDD 01 §13) --------------------------
     * §13 zählt vier Phasen auf — "Maximum → Abbremsen → Nachschwingen →
     * Stillstand" — und "Abbremsen" ist davon eine eigene. Ohne Bremsantrieb
     * gab es sie schlicht nicht: der Körper rollte über gut zwei Sekunden
     * exponentiell aus, mit einem einzigen weichen Übergang und danach
     * nichts mehr. Ein Auslauf hat kein Ende, also auch keinen Moment, an
     * dem etwas nachschwingen könnte.
     *
     * Der Bremsschub läuft absichtlich durch denselben Kanal wie der
     * Vortrieb: `rearBias` gewichtet dort die Punkte, die der Schubrichtung
     * ENTGEGEN liegen. Zeigt der Schub nach hinten, greift er damit von
     * selbst an der Front an — die Front wird festgehalten, das Heck läuft
     * auf, der Körper staucht sich längs. Genau das zeigt die Referenz für
     * den Moment, in dem die Geschwindigkeit null wird: die stärkste
     * Kompression sitzt dort, wo die Bewegung endet, nicht dort, wo sie am
     * schnellsten ist (ball-contact-compression-decompression.png).
     *
     * Wo die Bremse ausgeblendet wird, entscheidet, ob aus dem Halt ein
     * EREIGNIS wird. Bei 0.9 m/s lief die Verzögerung über eine halbe
     * Sekunde weich aus — und eine Anregung, die so langsam verschwindet wie
     * das Pendel schwingt, das sie treibt, erzeugt keinen Gegenausschlag:
     * die Sollform kroch monoton in die Ruhelage zurück. `bremsAus` steht
     * deshalb tief. Die Bremskraft steht damit bis kurz vor dem Stillstand
     * voll an und fällt dann in gut hundert Millisekunden weg — der Körper
     * findet sich schräg gestellt ohne die Kraft wieder, die ihn schräg
     * gehalten hat, und schwingt zurück (§13).
     *
     * Ganz ohne Ausblendung würde die Bremse den Schleim rückwärts zucken;
     * Kontrolle geht vor Physik (§67). */
    const blend = clamp(s.speed / Math.max(P.bremsAus, 0.05), 0, 1);
    const k = P.bremsKraft * blend / s.speed;
    s.drive.x = -b.vx * k;
    s.drive.z = -b.vz * k;
  }

  /* --- Nachschwingen aufladen (GDD 01 §13) --------------------------------
   * Der Körper darf "kurz über die Zielbewegung hinausschwingen". Was dabei
   * schwingt, ist die Masse, die beim Bremsen zu viel Tempo hatte — also
   * wird die Amplitude aus genau diesem Überschuss geladen und nicht aus
   * einem Ereignis. Dadurch schwingt ein sanft ausrollender Schleim kaum
   * nach und ein hart gestoppter deutlich, ohne dass es zwei Fälle gibt.
   *
   * Die Hüllkurve ist das eine, was die Referenz wirklich hergibt: jeder
   * Ausschlag rund zwei Drittel des vorherigen. Sie steckt in `schwingAbkling`,
   * das an `schwingHz` gekoppelt ist (siehe tuning.js). */
  /* Die eine Zeile, an der die ganze Wende hing: ein Schleim, der umkehren
   * soll, WILL währenddessen langsam sein. Ohne den Einbruch bleibt das
   * Zieltempo das Maximum, `bremsen` damit null, und Bremsnicken wie
   * Nachschwingen fallen bei jeder Kehrtwende aus. */
  const zielTempo = want
    ? P.maxSpeed * arrive * (1 - clamp(P.wendeBrems, 0, 1) * s.wende)
    : 0;
  s.bremsen = clamp((s.speed - zielTempo) / Math.max(P.maxSpeed, 1e-3), 0, 1);

  /* Eine Kehrtwende aus Vollgas ist der Vorgang mit der größten Verzögerung,
   * den der Schleim kennt: von +maxSpeed auf −maxSpeed, also der doppelte
   * Tempohub einer gewöhnlichen Bremsung. Sie darf entsprechend weiter
   * nachschwingen, als `schwingMax` für das Anhalten zulässt — dieselbe
   * Übertreibung, die das Referenzdossier für den Treffer belegt, wo der
   * Gegenausschlag sogar größer ausfällt als die auslösende Stauchung
   * (GDD 01 §68). Der Deckel sinkt mit der Wende; danach klingt die
   * Schwingung ganz normal ab. */
  const deckel = P.schwingMax * (1 + P.wendeSchwing * s.wende);
  if (b.grounded && s.bremsen > P.bremsAb) {
    // Anriss nur, wenn das vorige Nachschwingen praktisch aus ist. Sonst
    // würde jeder Schritt die Phase zurücksetzen und aus der Schwingung
    // würde ein stehendes Zittern.
    if (s.schwingA < 0.02) s.schwingT = 0;
    s.schwingA = Math.min(deckel,
                          s.schwingA + s.bremsen * P.bremsLaden * dt);
  }
  /* Während einer Kehrtwende wird die Energie nur GESPEICHERT, nicht schon
   * ausgespielt. Solange die Bremskraft anliegt, hält sie den Körper
   * statisch verformt; frei schwingen kann er erst, wenn sie wegfällt. Also
   * steht die Phase still und die Amplitude klingt kaum ab, bis die Wende
   * ausläuft — dann läuft beides los.
   *
   * §15 sortiert das Nachschwingen ausdrücklich HINTER das Abbremsen. Ohne
   * den Aufschub reißt es am Bremsbeginn an, hat seine großen Ausschläge
   * dort, wo der Körper noch mit vollem Tempo fliegt und die Bremsform ihn
   * ohnehin staucht, und ist am Umkehrpunkt schon abgeklungen: gemessen
   * lagen zwischen den beiden Bildern des Stillstands 1.5 % Formänderung —
   * zwei Bilder, auf denen nichts passiert. */
  const gehalten = s.wende > 0.5 ? 1 : 0;
  if (gehalten) s.schwingT = 0; else s.schwingT += dt;
  s.schwingA *= Math.exp(-P.schwingAbkling * dt * (1 - 0.92 * gehalten));
  if (s.schwingA < 1e-4) { s.schwingA = 0; s.schwingT = 0; }

  /* --- Blickrichtung -----------------------------------------------------
   * Folgt der tatsächlichen Bewegung, nicht dem Eingabewunsch — deshalb
   * dreht das Gesicht bei einer Kehrtwende sichtbar verzögert mit. */
  /* Aber nur, solange die Bewegung nach VORN geht. Zurückgeschoben zu werden
   * ist keine Richtungsentscheidung: das Nachschwingen aus §13 trägt den
   * Körper für zwei Zehntel rückwärts, und aus `atan2` wird dann eine
   * Blickrichtung, die um 180° gegen die eben gefahrene steht. Gemessen
   * drehte sich der Schleim nach jedem Halt einmal um die eigene Achse —
   * und mit ihm die Längsachse der Ruheform, so dass das Nachschwingen
   * genau in dem Moment aus der Kameraachse verschwand, in dem es zu sehen
   * sein sollte. Wer zurückgestoßen wird, schaut weiter dorthin, wo er
   * hinwollte. */
  let faceTo = s.facing;
  const vorwaerts = b.vx * s.fx + b.vz * s.fz;
  if (s.speed > 0.6 && vorwaerts > 0) faceTo = Math.atan2(b.vz, b.vx);
  else if (want) faceTo = Math.atan2(wantZ, wantX);
  /* Solange die Wende läuft, hält der Kopf die alte Richtung. §15 sortiert
   * "Richtung ändern" ausdrücklich HINTER das Abbremsen und das
   * Nachschwingen — dreht der Kopf sofort mit, sind alle fünf Schritte
   * gleichzeitig und keiner davon zu sehen.
   *
   * Nebenwirkung und Hauptsache zugleich: die Ruheform hängt an `facing`.
   * Der ausgezogene Zipfel zeigt deshalb während der ganzen Bremsung noch in
   * die alte Fahrtrichtung, während der Körper schon gegen sie arbeitet —
   * die Masse hängt sichtbar zurück, statt der Bewegung zu folgen. Das ist
   * die Cuphead-Silhouette: vorn ein kompakter Ball, alles Tempo hängt
   * hinten dran und trifft dort verspätet ein. */
  const drehTempo = P.turnRate * (1 - clamp(P.wendeHalten, 0, 0.95) * s.wende);
  const facingVor = s.facing;
  s.facing = angleLerp(s.facing, faceTo, 1 - Math.exp(-drehTempo * dt));
  s.fx = Math.cos(s.facing); s.fz = Math.sin(s.facing);

  /* Drehgeschwindigkeit für die Fliehkraft unten. Geglättet, weil `faceTo`
   * bei einer Kehrtwende aus einer Geschwindigkeit gebildet wird, die durch
   * null geht — der rohe Wert springt dort. */
  const twoPi = Math.PI * 2;
  const dAng = ((s.facing - facingVor + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  s.drehRate += (dAng / Math.max(dt, 1e-5) - s.drehRate) * Math.min(1, dt * 14);

  /* --- Sprung und Kanone -------------------------------------------------- */
  if (input.hop && b.grounded) {
    input.hop = false;
    for (let i = 0; i < b.n; i++) b.vel[i * 3 + 1] += P.hopPower;
    s.mouth = 1;
  }
  if (input.cannon && b.grounded) {
    input.cannon = false;
    for (let i = 0; i < b.n; i++) {
      b.vel[i * 3] += s.fx * P.maxSpeed * 1.4;
      b.vel[i * 3 + 1] += P.hopPower * 1.4;
      b.vel[i * 3 + 2] += s.fz * P.maxSpeed * 1.4;
    }
    s.mouth = 1;
  }

  /* --- Ziehen mit der Maus ------------------------------------------------ */
  if (s.grab) {
    const k = s.grab.i * 3;
    const t = Math.min(1, 20 * dt);
    const nx = b.pos[k] + (s.grab.x - b.pos[k]) * t;
    const ny = b.pos[k + 1] + (s.grab.y - b.pos[k + 1]) * t;
    const nz = b.pos[k + 2] + (s.grab.z - b.pos[k + 2]) * t;
    b.vel[k] = (nx - b.pos[k]) / Math.max(dt, 1e-5);
    b.vel[k + 1] = (ny - b.pos[k + 1]) / Math.max(dt, 1e-5);
    b.vel[k + 2] = (nz - b.pos[k + 2]) / Math.max(dt, 1e-5);
    b.pos[k] = nx; b.pos[k + 1] = ny; b.pos[k + 2] = nz;
  }

  /* --- Zusammensacken -----------------------------------------------------
   * Ein stehender Schleim hält seine Form nicht: er sackt langsam zu einer
   * flachen Kuppel zusammen und richtet sich erst beim Losfahren wieder auf. */
  if (b.grounded && !want && s.speed < 0.6) {
    s.slump = Math.min(1, s.slump + dt / Math.max(P.slumpTime, 0.05));
  } else {
    s.slump = Math.max(0, s.slump - dt / Math.max(P.slumpTime * 0.3, 0.02));
  }

  /* --- Ruhe-Unruhe --------------------------------------------------------
   * Das Formgedächtnis dämpft jede Restbewegung weg: nach gut zwei Sekunden
   * Stillstand stand hier ein perfekt regloser Körper — ein Objekt mit
   * Schleim-Textur, genau das, was GDD 01 §66 verbietet. Ein ruhender
   * Schleim hat aber inneren Druck, der die Hülle dauernd durchwalkt.
   *
   * Also wird angeregt, nicht animiert: drei schwache, volumenerhaltende
   * Kräfte über die Deform-Werkzeuge. Wie der Körper darauf antwortet,
   * entscheidet er selbst (§66/§67). Die Frequenzen sind absichtlich unrund
   * und teilerfremd, damit sich das Muster in vier Sekunden nie wiederholt
   * und nicht als getaktetes Pulsieren gelesen wird. */
  ruheWabbeln(s, dt, P, time);

  /* --- Vorwälzen beim Anrollen -------------------------------------------
   * Kein zusätzlicher Antrieb, sondern eine Massenverlagerung: die vordere
   * Hälfte bekommt einen Schub nach vorn-oben und stützt sich dabei auf dem
   * klebenden Heck ab. Der Körper richtet sich auf und lehnt sich in die
   * Richtung, statt beim Losfahren zur Pfütze zu zerlaufen. Der Zipfel
   * entsteht daraus von selbst — er wird nirgends hingesetzt (GDD 01 §66). */
  if (b.grounded && s.roll > 0.01 && u < 1) {
    const w = P.anrollWalken * (1 - u) * s.roll * clamp(1 - s.speedRatio, 0, 1);
    Deform.impulsGerichtet(b, s.fx, 0.55, s.fz, w * dt, 2.2);
  }

  /* --- Schräglage bei Höchsttempo (GDD 01 §14) ---------------------------
   * Die Ruheform gibt den Keil nur vor; damit er nach Masse aussieht und
   * nicht nach gesetzter Pose, wird der Körper auch wirklich dorthin
   * gewalzt — mit zwei gegengleichen gerichteten Impulsen:
   *
   *   vorn-unten  → die Frontmasse wird in die Aufstandsfläche gedrückt.
   *                 Was sie dort flach und breit macht, ist die Bodenfeder,
   *                 nicht wir (GDD 01 §66).
   *   hinten-oben → das Heck wird gleichzeitig angehoben und bleibt zurück.
   *
   * Die beiden Impulse sind exakt entgegengesetzt und die Kugel ist
   * punktsymmetrisch, ihre Summe ist also null: der Schleim bekommt daraus
   * keinen Extraschub, nur eine Schräglage. Sonst würde die Verformung das
   * Tempo mitbestimmen und §67 (Kontrolle geht vor) wäre verletzt.
   *
   * Das Vorwälzen beim Anrollen zeigt nach vorn-OBEN (er richtet sich auf),
   * das hier nach vorn-UNTEN (er legt sich hin) — die beiden Phasen sind
   * damit in der Silhouette gegenläufig und nicht zu verwechseln. */
  if (b.grounded && s.vollgas > 0.01) {
    const w = P.keilKraft * s.vollgas * dt;
    Deform.impulsGerichtet(b,  s.fx, -0.7,  s.fz, w, 2);
    Deform.impulsGerichtet(b, -s.fx,  0.7, -s.fz, w, 2);
  }

  /* --- Bremsnicken (GDD 01 §13) ------------------------------------------
   * Die Aufstandsfläche bremst, der Schwerpunkt liegt darüber — die Masse
   * schwappt also nach vorn-oben, während das Heck zurück und herunter geht.
   * Zwei exakt gegengleiche gerichtete Impulse, Summe null: der Schleim
   * bekommt daraus keinen Extraschub, nur eine Schräglage (§67).
   *
   * Bewusst spiegelbildlich zum Vollgas-Keil unten, der die Nase in den
   * Boden walzt und das Heck hebt. Beschleunigen und Bremsen sind damit in
   * der Silhouette gegenläufig und nicht zu verwechseln — ohne das sieht
   * beides nur nach "irgendwie verformt" aus. */
  if (b.grounded && s.bremsen > 0.02) {
    const w = P.bremsNicken * s.bremsen * dt;
    Deform.impulsGerichtet(b,  s.fx,  0.7,  s.fz, w, 2);
    Deform.impulsGerichtet(b, -s.fx, -0.7, -s.fz, w, 2);
  }

  /* --- Der Rückstoß des Lehnpendels (GDD 01 §13) --------------------------
   * §13 erlaubt dem Körper ausdrücklich, "kurz über die Zielbewegung
   * hinauszuschwingen" — und gemeint ist damit nicht nur die Form: der
   * Schwerpunkt selbst soll den Haltepunkt überlaufen und zurückkommen.
   * Gemessen tat er das nicht: nach dem Halt wanderte er noch 4 cm nach
   * vorn und blieb stehen. Ein Halt ohne Umkehr hat keinen Moment, an dem
   * etwas nachschwingt.
   *
   * Die Umkehr wird hier nicht gesetzt, sondern sie fällt aus der Scherung
   * heraus, die ohnehin läuft. Eine Scherung um den Schwerpunkt bewegt die
   * obere Hälfte nach vorn und die untere um genau so viel zurück. Die
   * untere Hälfte liegt aber auf dem Boden — sie kann nicht frei rutschen,
   * die Reibung hält dagegen und gibt die Gegenkraft an den ganzen Körper
   * weiter. Solange sich die Schieflage AUFBAUT, schleift der Fuß nach
   * hinten und der Boden schiebt nach vorn; bricht sie zusammen, ist es
   * umgekehrt. Genau so kippt ein Mensch beim Anhalten zuerst nach vorn und
   * wippt dann zurück. Das Vorzeichen ist deshalb `scherLV`, nichts weiter,
   * und die Umkehr des Schwerpunkts erbt die abklingende Hüllkurve des
   * Pendels darüber.
   *
   * Über den ganzen Vorgang integriert ist das exakt null — die Schieflage
   * endet dort, wo sie angefangen hat, also hebt sich der Vorwärtsanteil
   * gegen den Rückwärtsanteil auf. Der Schleim kann dadurch nirgendwo anders
   * landen, er kommt nur auf einem Umweg zur Ruhe (§67).
   *
   * Nur wenn nichts anderes antreibt. Dieselbe Kopplung gilt beim
   * Beschleunigen genauso, aber dort steht der Vortrieb daneben, und eine
   * Verformung, die das Tempo mitbestimmt, verletzt §67 (Kontrolle,
   * Lesbarkeit und Treffsicherheit gehen vor). Beim Ausrollen treibt
   * nichts — dort darf die Masse das letzte Wort haben. */
  if (b.grounded && !want && Math.abs(b.scherLV) > 1e-4) {
    Deform.impuls(b, s.fx, 0, s.fz, b.scherLV * P.lehnRueck * dt);
  }

  /* --- Fliehkraft in der Wende (GDD 01 §15, §68) --------------------------
   * Der Körper dreht, die Masse will geradeaus. Sie quillt zur Kurven-
   * AUSSENSEITE aus und wird dort in den Boden gedrückt, während die
   * Innenseite entlastet wird und hochgeht. Aus der Draufsicht schmiert der
   * Blob damit durch die Wende, statt sie zu fahren — und die Schräglage
   * quer zur Fahrt unterscheidet die Wende von einer reinen Bremsung, die
   * längs nickt.
   *
   * Zwei exakt gegengleiche gerichtete Impulse auf einer punktsymmetrischen
   * Kugel: ihre Summe ist null. Der Schleim bekommt daraus keinen Seitenschub
   * und kann sein Ziel nicht verfehlen (§67).
   *
   * `drehRate` liefert Betrag und Vorzeichen. Wächst `facing`, dreht die
   * Blickrichtung zur Seitenachse (sx, sz) hin — die träge Masse bleibt
   * also auf der Gegenseite zurück. */
  /* Gemessen war der Auslöser vorher falsch gewählt: `wende` ist im
   * Kehrtwende-Lauf schon bei 2.05 s auf null, während der Kopf erst von
   * 1.80 bis 2.30 s wirklich dreht (drehRate 3.3 → 8.7 → 2.0). Die
   * Fliehkraft lag damit vollständig VOR der Drehung — sie wirkte, während
   * der Körper noch geradeaus bremste, und war vorbei, als er sich
   * herumwarf. Ausgelöst wird deshalb an der Drehung selbst; sie ist
   * ohnehin das ehrlichere Maß, und sie gilt für jede Kurve, nicht nur für
   * die Kehrtwende (§12: "seitliche Bewegung").
   *
   * Der Totgang von 0.6 rad/s hält Geradeausfahrt heraus: dort steht die
   * geglättete Drehrate gemessen bei 0.01…0.25. */
  const drehBetrag = clamp((Math.abs(s.drehRate) - 0.6) / 3, 0, 1);
  if (b.grounded && drehBetrag > 0) {
    const sx = -s.fz, sz = s.fx;
    const aussen = s.drehRate >= 0 ? -1 : 1;
    const w = P.wendeFlieh * drehBetrag * dt;
    Deform.impulsGerichtet(b,  sx * aussen, -0.35,  sz * aussen, w, 2);
    Deform.impulsGerichtet(b, -sx * aussen,  0.35, -sz * aussen, w, 2);
  }

  /* --- Das Nachschwingen selbst (GDD 01 §13) ------------------------------
   * Eine abklingende Wechselstauchung auf der Fahrtachse: der Körper wird
   * abwechselnd längs zusammengeschoben und wieder auseinandergezogen.
   * `Deform.stauchen` weitet dabei quer aus, das Volumen bleibt also stehen,
   * und die Kräfte sind punktsymmetrisch — die Schwingung bewegt den
   * Schwerpunkt nicht und kann die Zielgenauigkeit nicht verfälschen (§67).
   *
   * Wir prägen dem Körper nur die Kraft auf, nicht die Form: wie weit er
   * tatsächlich ausschlägt, entscheiden seine Trägheit, Haut und Innendruck
   * (§66). Deshalb hinkt sein Ausschlag der Anregung sichtbar hinterher —
   * "die Verformung eilt der Bewegung nach, sie ist nicht deckungsgleich
   * mit ihr" (ball-contact-compression-decompression.png).
   *
   * Der Sinus startet bei null und geht zuerst ins Negative: das erste
   * Extremum ist eine Stauchung. Das ist die Richtung, in die das Heck beim
   * Bremsen ohnehin aufläuft — die Anregung arbeitet mit der Masse, nicht
   * gegen sie. */
  s.schwing = 0;
  if (b.grounded && s.schwingA > 0.002) {
    const ph = s.schwingT * P.schwingHz * Math.PI * 2;
    s.schwing = -s.schwingA * Math.sin(ph);
    // Die Ruheform (siehe updateRestShape) macht die Arbeit. Der Impuls hier
    // gibt der Masse zusätzlich den Anstoß, damit sie in die neue Sollform
    // hineinfällt statt hineingezogen zu werden — dasselbe Doppel aus
    // Vorgabe und Kraft, mit dem auch der Vollgas-Keil gebaut ist.
    Deform.stauchen(b, s.fx, 0, s.fz, 1 + s.schwing, P.schwingKraft, dt);
  }

  /* --- Aufprall: Anlauf, Klatscher, Rückfederung (GDD 01 §20) --------------
   * §20 nennt drei Schritte — beim Kontakt flach gedrückt, Masse federt
   * zurück, Körper stabilisiert sich —, und im Bestand gab es davon streng
   * genommen keinen: die Bodenfeder drückte den Körper zusammen, und danach
   * zog ihn die Formfeder wieder gerade. Was fehlte, war die MASSE. Gemessen
   * am freien Fall stand hier ein Körper mit Breite/Höhe 1.37 — exakt der
   * Wert, den er auch im Stand hat. Er fiel, ohne zu fallen.
   *
   * Zwei getrennte Größen, die sich am Ende addieren:
   *
   *   `flugStreck` — die Antizipation. Im Flug zieht sich die Masse längs
   *      der Bewegung, die Referenz zeigt airborne Schleime als Tropfen bei
   *      Breite/Höhe ≈ 0.80–0.87 (sr1-lava-slimes-airborne-and-squash,
   *      sr2-airborne-round-vs-ground-squash). Sie hängt am BETRAG von vy,
   *      nicht am Vorzeichen: auch der Rückschnapper nach oben ist ein Flug
   *      und muss sich strecken. Bewusst geglättet und nicht direkt an vy
   *      gehängt — ein hart mitgeführter Wert schnappt beim Ablösen um und
   *      liest sich als Bildfehler.
   *
   *   `klatsch` — die Feder danach. Angerissen wird über die
   *      GESCHWINDIGKEIT, nicht über die Auslenkung: eine gesetzte
   *      Auslenkung wäre eine Pose, ein Anriss ist ein Stoß. Der Körper
   *      läuft danach von selbst durch die Abfolge aus §20, und weil eine
   *      gedämpfte Feder mit rund zwei Dritteln je Ausschlag abklingt,
   *      kommt der zweite, kleinere Klatscher gratis mit — genau die
   *      Kurve aus bounce-energy-decay-law.
   *
   * In der Luft hält nichts gegen: der Ausschlag läuft dort zusätzlich aus,
   * sonst würde der Schleim beim Abheben weiterzucken. */
  const zielFlug = b.grounded ? 0
    : clamp(Math.abs(b.vy) / Math.max(P.flugTempo, 0.1), 0, 1) * P.flugStreck;
  /* Auf dem Boden verschwindet die Streckung um ein Vielfaches schneller,
   * als sie im Flug entsteht — und das ist der Unterschied zwischen einem
   * Aufprall und einer Überblendung. Mit derselben Rate in beide Richtungen
   * stand die Flugstreckung noch 70 ms nach dem Kontakt im Weg und hob den
   * Klatscher fast vollständig auf: gemessen kamen von 0.27 Stauchvorgabe
   * ganze 0.14 an, und der tiefste Squash blieb unverändert bei 0.56.
   * Es ist auch die ehrlichere Beschreibung: was die Streckung beendet, ist
   * nicht Abklingen, sondern der Boden. */
  const flugFolge = b.grounded ? P.flugFolge * 6 : P.flugFolge;
  s.flugStreck += (zielFlug - s.flugStreck) * clamp(dt * flugFolge, 0, 1);

  const kw = P.klatschHz * Math.PI * 2;
  s.klatschV += (-kw * kw * s.klatsch - 2 * P.klatschDaempf * kw * s.klatschV) * dt;
  s.klatsch += s.klatschV * dt;
  if (!b.grounded) s.klatsch -= s.klatsch * clamp(dt * 5, 0, 1);
  s.klatschGes = s.klatsch - s.flugStreck;

  /* Vorgabe UND Kraft, dasselbe Doppel wie beim Vollgas-Keil und beim
   * Nachschwingen: die Ruheform sagt, wohin, der Stoß sorgt dafür, dass die
   * Masse dort hineinfällt statt hineingezogen zu werden (§66).
   * `stauchen` weitet quer aus und ist punktsymmetrisch um den Schwerpunkt —
   * der Schleim bekommt daraus keinen Schub und landet nicht woanders (§67). */
  if (b.grounded && Math.abs(s.klatsch) > 0.01) {
    Deform.stauchen(b, 0, 1, 0, Math.max(0.4, 1 - s.klatsch), P.klatschKraft, dt);
  }

  /* --- Weichkörper rechnen ------------------------------------------------ */
  const fallBefore = b.vy;
  const groundedBefore = b.grounded;

  stepSoftBody(b, dt, P, world, {
    time,
    fx: s.fx, fz: s.fz,
    speedRatio: s.speedRatio,
    nachzug: s.nachzug,
    vollgas: s.vollgas,
    heckAnker: s.heckAnker,
    bremsen: s.bremsen,
    slump: s.slump,
    schwing: s.schwing,
    klatsch: s.klatschGes,
    drive: s.drive,
  });

  if (!groundedBefore && b.grounded) {           // Aufprall
    s.impact = clamp(-fallBefore / 12, 0, 1.5);
    s.mouth = Math.max(s.mouth, Math.min(1, 0.35 + s.impact));
    // Anriss über die Geschwindigkeit: die Wucht des Falls geht in die Feder.
    s.klatschV += P.klatschAnriss * Math.min(s.impact, 1.2);
  }
  if (!b.grounded) s.airborne += dt; else s.airborne = 0;
  s.impact = Math.max(0, s.impact - dt * 2.2);
  s.mouth = Math.max(0, s.mouth - dt * 1.5);

  /* --- Gesicht ------------------------------------------------------------ */
  const stiff = 90, damp = 13;
  s.lookV.x += ((s.fx - s.look.x) * stiff - s.lookV.x * damp) * dt;
  s.lookV.z += ((s.fz - s.look.z) * stiff - s.lookV.z * damp) * dt;
  s.look.x += s.lookV.x * dt;
  s.look.z += s.lookV.z * dt;

  s.blinkTimer -= dt;
  if (s.blinkTimer <= 0) { s.blink = 0.14; s.blinkTimer = 2.6 + s.speedRatio * 2; }
  s.blink = Math.max(0, s.blink - dt);

  /* --- Schleimspur --------------------------------------------------------- */
  s.trailAcc += dt;
  if (b.grounded && s.speed > 0.6 && s.trailAcc > 0.05) {
    s.trailAcc = 0;
    s.trail.push({ x: b.cx, z: b.cz, r: P.radius * (0.7 + 0.25 * s.speedRatio), life: 1 });
    if (s.trail.length > 80) s.trail.shift();
  }
  for (const t of s.trail) t.life -= dt * 0.5;
  while (s.trail.length && s.trail[0].life <= 0) s.trail.shift();
}

/* --- Ruhe-Unruhe: das Wabbeln im Stand (GDD 01 §12, §5) ----------------------
 * Drei überlagerte Anregungen, alle über Deform, alle volumenerhaltend:
 *
 *   1. Walken   — die Masse sackt und richtet sich auf, hoch/quer im Wechsel.
 *   2. Seitenbeule — dieselbe Stauchung auf einer waagerechten Achse, die
 *                  langsam um den Körper wandert. Daraus entstehen die
 *                  "kleinen seitlichen Verformungen" aus §12: eine Ausbuchtung
 *                  läuft um den Blob herum, statt dass er gleichmäßig atmet.
 *   3. Wippen   — schwacher Auf-und-Ab-Schub auf den ganzen Körper. Er federt
 *                  gegen Bodenfeder und Haftung, das ergibt das "leichte
 *                  Wippen" aus §12.
 *
 * Die Stärke hängt an `ruhe`: bei Fahrt übernimmt die Bewegung selbst die
 * Verformung, dann wäre zusätzliche Unruhe nur Matsch (§67 Lesbarkeit). */
function ruheWabbeln(s, dt, P, time) {
  const b = s.body;
  if (!b.grounded) return;

  /* Solange das Bremsen nachschwingt, tritt die Ruhe-Unruhe zurück. Die
   * beiden greifen denselben Körper mit derselben Art Kraft an, und das
   * Wabbeln ist mit rund ±0.05 Silhouettenänderung stark genug, um die
   * hinteren Ausschläge der Abklingkurve zuzudecken. Zwei Anregungen
   * gleichzeitig ergeben keinen reicheren Körper, nur Matsch — Lesbarkeit
   * geht vor Effektdichte (GDD 01 §67). Das Wabbeln kommt von selbst
   * zurück, sobald das Nachschwingen ausgelaufen ist. */
  // Divisor abgesichert: `schwingMax` ist ein Regler mit 0 am Anschlag, und
  // ohne den Schutz käme dort NaN heraus, das über die Kräfte den gesamten
  // Körper zerstört.
  const nachhall = clamp(1 - s.schwingA / Math.max(P.schwingMax * 0.25, 1e-4), 0, 1);
  const ruhe = clamp(1 - s.speedRatio * 3.2, 0, 1)
             * (1 - 0.35 * s.impact) * nachhall;
  if (ruhe <= 0.001) return;

  const t = time;

  // 1. Walken: hoch/quer. Auf die Senkrechte bezogen, damit die Silhouette
  //    zwischen "kompakt" und "breit sitzend" pendelt statt zu pumpen.
  const fWalk = 1 + P.wabbel * ruhe * Math.sin(t * 8.1);
  Deform.stauchen(b, 0, 1, 0, fWalk, 34 * ruhe, dt);

  // 2. Wandernde Seitenbeule auf einer langsam rotierenden waagerechten Achse.
  const a = t * 1.3;
  const fSeit = 1 + P.wabbel * 0.72 * ruhe * Math.sin(t * 5.9 + 1.1);
  Deform.stauchen(b, Math.cos(a), 0, Math.sin(a), fSeit, 30 * ruhe, dt);

  // 3. Wippen: der ganze Körper hebt und senkt sich schwach.
  const wipp = P.wippen * ruhe * Math.sin(t * 6.7 + 0.4);
  Deform.impuls(b, 0, wipp >= 0 ? 1 : -1, 0, Math.abs(wipp) * dt);

  // 4. Lokale Unruhe. Die drei Kräfte oben verformen den Körper als Ganzes —
  //    das allein liest sich noch als sauberes Atmen. Ein schwaches, langsames
  //    Zittern bricht die Regelmäßigkeit auf; die Zähigkeit verschleift das
  //    punktweise Rauschen zu weichen Beulen, die über die Haut wandern.
  Deform.zittern(b, P.wabbel * 5.5 * ruhe, 3.3, t, dt);
}

/* --- Oberflächenpunkte für das Gesicht --------------------------------------
 * Gewichteter Mittelwert aller Punkte, deren Grundrichtung in die gesuchte
 * Richtung zeigt. Dadurch klebt das Gesicht nicht auf dem Körper, sondern
 * verformt sich mit ihm — genau das fordert der GDD. */
function surfaceSample(b, dx, dy, dz, out) {
  let wsum = 0;
  let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const d = b.base[k] * dx + b.base[k + 1] * dy + b.base[k + 2] * dz;
    if (d <= 0) continue;
    const d2 = d * d, d4 = d2 * d2;
    const w = d4 * d4 * d2;                      // scharf, aber stetig
    wsum += w;
    px += b.pos[k] * w; py += b.pos[k + 1] * w; pz += b.pos[k + 2] * w;
    nx += b.normals[k] * w; ny += b.normals[k + 1] * w; nz += b.normals[k + 2] * w;
  }
  const inv = 1 / (wsum || 1);
  out.x = px * inv; out.y = py * inv; out.z = pz * inv;
  const l = Math.hypot(nx, ny, nz) || 1;
  out.nx = nx / l; out.ny = ny / l; out.nz = nz / l;
  return out;
}

/* Richtung im Kopf-Koordinatensystem: yaw nach links/rechts, pitch nach oben. */
function faceDir(s, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const fx = s.fx * cy - s.fz * sy;
  const fz = s.fz * cy + s.fx * sy;
  const cp = Math.cos(pitch);
  return { x: fx * cp, y: Math.sin(pitch), z: fz * cp };
}

function nearestVertex(b, x, y, z) {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const d = (b.pos[k] - x) ** 2 + (b.pos[k + 1] - y) ** 2 + (b.pos[k + 2] - z) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return { i: best, d: Math.sqrt(bestD) };
}
