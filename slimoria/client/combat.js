'use strict';

/* ---------------------------------------------------------------------------
 * Kampf — Auto-Angriff und Biss (GDD 02 §2–7).
 *
 * BESITZER: Lane COMBAT. Vier Teile:
 *   anmarsch     Ziel erreichen und in Reichweite bleiben (§4)
 *   kampfhaltung was zwischen den Schlaegen zu sehen ist (§5, GDD 01 §66)
 *   biss         Sammeln, Langen, Zuschnappen, Kontakt, Rueckfedern (§7)
 *   abstand      der Gegner bleibt AUSSERHALB der Masse (§8, GDD 01 §28)
 *
 * Keine menschliche Waffenanimation (GDD 01 §62). Der Angriff ist eine
 * Bewegung der Masse selbst.
 *
 * WICHTIG zur Kraftdosierung: die Simulation laeuft in 240 Schritten pro
 * Sekunde. `Deform.impuls*` addiert Geschwindigkeit SOFORT — einmal gerufen
 * ist einmal, pro Schritt gerufen ist 240-mal. Alles, was ueber eine Dauer
 * wirkt, wird deshalb hier mit `dt` multipliziert; nur der Schlagmoment selbst
 * ist ein echter Einzelimpuls. Ohne diese Trennung wird aus dem Biss ein
 * Kanonenschuss, der den Schleim aus der eigenen Reichweite schleudert.
 *
 * WICHTIG zur Silhouette: der Gutachter hat den Koerper im Schlag als
 * "nahezu perfekte Kuppel, linke und rechte Flanke spiegeln sich" und das
 * Heck als "glatte Kappe mit derselben Kruemmung wie die vordere Haelfte"
 * beschrieben. Beides ist dieselbe Ursache — die alte Fassung hat den Koerper
 * ausschliesslich ueber `stauchen` verformt, und eine Achsenskalierung ist
 * zwangslaeufig spiegelgleich zur Mitte. Deshalb arbeitet hier jetzt jede
 * Phase mit einem VORNE-HINTEN-Gefaelle: vorn ein voller Ballen, hinten ein
 * auslaufender Zipfel (`frontBallen`, `heckSpitzen`) — und der Mund ist eine
 * echte Hoehle im Material mit Lippenwulst (`mundhoehle`) statt eines
 * ausgestanzten Lochs.
 * ------------------------------------------------------------------------- */

const Combat = (() => {
  let biss = null;          // { t, ziel, ux, uz, getroffen }
  let stossFx = 0;
  let anmarsch = false;     // laeuft gerade auf das Ziel zu (Hysterese)
  let spritzer = [];        // Schleimtropfen, die der Treffer herausschlaegt
  let treffer = null;       // { t, x, y, z, r } — Nachglühen des Einschlags
  let extraGesetzt = false;
  let warKampf = false;     // Flanke: Kampf hat gerade erst begonnen
  let letztesDt = 1 / 240;  // fuer Faehigkeiten, die game.js ohne dt ruft
  let standVersatz = 0;     // Wiegen: zurueck beim Sammeln, vor beim Langen

  /* Der Schlag selbst. Kurz und hart — die Anspannung davor traegt die
   * Lesbarkeit, nicht die Kontaktdauer (GDD 01 §68). */
  const BISS = { schnappen: 0.12, kontakt: 0.11, zurueck: 0.42 };
  const BISS_GESAMT = BISS.schnappen + BISS.kontakt + BISS.zurueck;

  /* Letzte Sekunden vor dem Schlag: sichtbares Ausholen. Zusammen mit dem
   * Biss deckt das fast den ganzen Schwungtakt ab — damit ist der Rhythmus
   * aus GDD 02 §5 in JEDEM Einzelbild ablesbar und nicht nur in den zwei
   * Bildern, die zufaellig den Kontakt erwischen. */
  const VORSPANNUNG = 0.95;

  /* Womit der Zaehler startet, wenn der Kampf beginnt und das Ziel schon in
   * Reichweite steht. Ohne diesen Wert stand `schwungZeit` beim Einschalten
   * auf 0 und der allererste Biss feuerte im selben Schritt: ein Zuschnappen
   * aus dem Nichts, ohne Mundoeffnen und ohne Ausholen — also genau die
   * Reihenfolge aus GDD 02 §7 rueckwaerts. Der Wert liegt bewusst INNERHALB
   * der Vorspannung: wer einen Gegner angreift, der schon vor ihm steht,
   * wartet keinen vollen Schwungtakt, sondern spannt sofort sichtbar an. */
  const ANFANGSSCHWUNG = VORSPANNUNG * 0.66;

  /* --- Weltmarkierung am Gegner (GDD 02 §3/§63, GDD 10 §73) ----------------
   * Der Gutachter hat am fertigen Bild gemessen: "der angegriffene Wolf traegt
   * in der Welt ueberhaupt keine Markierung, kein Zielring, kein Kopfbalken,
   * kein Trefferblitz; der einzige Ring liegt gelb um die eigene Figur". Der
   * Kopfbalken haengt inzwischen an `ui.js`; hier steht der Weltanteil.
   *
   * Am Referenzmaterial gemessen (`ref/wow-hud`, Werte auf 1600x900):
   *   gameplay-target-frame-boss-nameplate-party.jpg — Bodenring unter dem
   *     Ziel: 153 x 37,5 px, Achsverhaeltnis 0,245 (also ein echter Kreis in
   *     der Bodenebene bei dieser Kameraneigung), Linie ~2 px, Farbe #FF2020,
   *     Durchmesser rund das 1,6-fache der Kreatursilhouette, dazu ein
   *     schwacher roter Flaechenschimmer im Inneren.
   *   gameplay-remix-damage-numbers-target-tooltip.png — Nameplate-Schrift
   *     feindlich #F70201; Feindseligkeit laeuft in WoW AUSSCHLIESSLICH ueber
   *     Rot. Gold ist dort reserviert fuer Name/Level/eigene Schadenszahl.
   *   gameplay-tww-dungeon-damage-numbers-castbar.png — im Treffermoment
   *     sitzt ein heller Ausbruch direkt AUF dem getroffenen Koerper, breiter
   *     als dessen Rumpf; das ist der Kanal, an dem man "hier hat es gerade
   *     getroffen" ablesen kann, nicht die Zahl allein.
   *
   * `renderer.js` legt den Zielreif gelb und ist gesperrt. Statt einen zweiten
   * Ring danebenzustellen — genau der Befund aus ARBEITSLISTE 27, "zwei gleich
   * aussehende Ringe fuer zwei verschiedene Bedeutungen" — zeichnet diese Lane
   * denselben Reif rot NACH. Extras laufen nach allen Bodendekalen, die Deckung
   * ist damit vollstaendig und es bleibt bei EINEM Ring im Bild.
   * BRAUCHT_KERNAENDERUNG steht dazu im Bericht. */
  const ZIELRING_ROT = [1.00, 0.13, 0.13];       // #FF2020 aus dem Dossier
  /* Radius exakt wie renderer.js: (groesse * 1.8 + 0.35), Puls sin(t*5)*0.04.
   * Aendert sich das dort, muss es hier mit. */
  const ZIELRING_WEIT = 1.8, ZIELRING_ZU = 0.35, ZIELRING_PULS = 0.04;

  /* Trefferblitz. Kurz und hart: der Blitz ist der Moment, das Nachgluehen
   * traegt die Lesbarkeit ueber die restlichen Einzelbilder. Ohne das
   * Nachgluehen faellt bei 2 s Schwungtakt nur jedes achte Bild in den
   * Treffer — der Kontaktbogen zeigte dann 16 von 18 Bildern ohne jedes
   * Kampfsignal am Gegner. */
  const BLITZ = 0.22;
  const NACHGLUEHEN = 1.30;

  /* Wo der Mund sitzt. Dieselben Winkel, mit denen `renderer.js` (und
   * `charakter.js`) den Mundbogen auf die Oberflaeche legen: Gier ±0.40,
   * Neigung −0.13 bis −0.27. Die Hoehle muss GENAU dort liegen, sonst
   * schwimmt die dunkle Flaeche neben der Delle statt darin. */
  const MUND_NEIG = -0.20;
  const MUND_GIER = 0.26;

  const NORMALE_EINS = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const _p = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };

  function zuruecksetzen() {
    biss = null; stossFx = 0; anmarsch = false;
    spritzer.length = 0; treffer = null; warKampf = false; standVersatz = 0;
  }

  function reichweiteVon(G, k) {
    return G.reichweite + G.params.radius + k.groesse;
  }

  /* Angehobener Kosinus: weiche Beule um `mitte`, halbe Breite `breite`.
   * Wird fuer die Phasengewichte gebraucht — ein Gewicht mit Knick erzeugt
   * einen Ruck in der Silhouette, und §68 verlangt Bewegungsphasen, keine
   * Sprungstellen. */
  function beule(x, mitte, breite) {
    const t = (x - mitte) / (breite > 1e-3 ? breite : 1e-3);
    if (t <= -1 || t >= 1) return 0;
    return 0.5 * (1 + Math.cos(Math.PI * t));
  }

  function glatt(x) {
    const t = x < 0 ? 0 : x > 1 ? 1 : x;
    return t * t * (3 - 2 * t);
  }

  /* --- Formwerkzeuge dieser Lane -------------------------------------------
   * Alle drei bauen ausschliesslich auf `Deform.ziehenZu` auf: ein Punkt im
   * Raum, ein Wirkradius, eine Rate. Positive Rate zieht die Haut zu ihm hin,
   * negative drueckt sie weg. Damit lassen sich oertliche Merkmale formen,
   * ohne eine einzige Position zu setzen — es bleiben Kraefte (GDD 01 §67).
   * Achsenskalierungen (`stauchen`) koennen das nicht: sie sind immer
   * spiegelgleich zur Koerpermitte, und genau das war der Befund. */

  /* Vorne ein Ballen. Der Druckpunkt liegt kurz VOR der Mitte, deshalb weicht
   * die vordere Haut nach vorn und zur Seite aus, waehrend das Heck ausserhalb
   * des Radius liegt und nichts abbekommt. `zeichen` −1 zieht die Front
   * statt dessen ein (Anspannung vor dem Schlag). */
  function frontBallen(b, ux, uz, R, staerke, dt, zeichen = 1) {
    Deform.ziehenZu(b, b.cx + ux * 0.30 * R, b.cy + 0.26 * R, b.cz + uz * 0.30 * R,
      -staerke * zeichen, dt, 1.04 * R);
  }

  /* Hinten ein Zipfel. Der Zugpunkt liegt WEIT hinter dem Koerper: die
   * Heckhaut wandert dadurch nach hinten UND zur Laengsachse hin — sie wird
   * laenger und duenner zugleich. Das ist der Unterschied zwischen einem
   * gestreckten Ei und einem Koerper, der sich nach vorn wirft. */
  function heckSpitzen(b, ux, uz, R, staerke, dt) {
    Deform.ziehenZu(b, b.cx - ux * 1.30 * R, b.cy + 0.16 * R, b.cz - uz * 1.30 * R,
      staerke, dt, 1.02 * R);
  }

  /* Der Mund als Hoehle im Material (GDD 02 §7, Referenz
   * sr1-slime-eating-face-closeup und sr1-face-macro-closeup).
   *
   * Gemessen am Referenzmaterial ist die Oeffnung dort 2,0- bis 2,4-mal so
   * breit wie hoch, ihre Breite betraegt 0,26–0,36 der Koerperbreite, und der
   * Rand hat SICHTBARE DICKE: unterhalb der Oeffnung sitzt ein voller Wulst,
   * oberhalb laeuft die Kante duenn aus. Genau das war der Befund am eigenen
   * Bild — "ein fast kreisrundes Loch mit symmetrischer Kante, ober- und
   * unterhalb identisch".
   *
   * Aufbau in drei Lagen, alle aus `Deform.ziehenZu` mit begrenztem Radius:
   *   Schlitz    fuenf Saugpunkte NEBENEINANDER unter der Haut — daher quer
   *              liegend statt rund
   *   Kiefer     ein Druckpunkt darueber, ein staerkerer darunter — die
   *              Oeffnung wird von INNEN aufgedrueckt statt ausgestanzt, und
   *              die Unterlippe wird dicker als die Oberlippe
   *   Backen     zwei Druckpunkte weit aussen, damit die Vorderpartie breit
   *              und flach steht und der Mundbogen nicht wegkippt
   *
   * Der Schlitz nimmt Volumen weg, die Kiefer und Backen geben es wieder
   * heraus; gemessen bleibt `volumen` dadurch bei ~1 (GDD 01 §29). Der
   * gezeichnete Mundbogen aus `renderer.js` folgt der Oberflaeche und landet
   * damit von selbst IN der Hoehle. */
  function mundhoehle(s, R, oeffnung, dt, wucht = 1) {
    if (oeffnung <= 0.06) return;
    if (typeof faceDir !== 'function' || typeof surfaceSample !== 'function') return;
    const b = s.body;
    /* Hilfsgriff: Punkt auf der Oberflaeche in Blickrichtung (gier, neigung)
     * suchen, dann `tief` unter die Haut versetzen und von dort ziehen oder
     * druecken. Weil der Punkt UNTER der Haut liegt, wirkt der Druck fast
     * genau in Richtung der Flaechennormalen — die Lippe waechst nach vorn
     * und nicht zur Seite. */
    function greifen(gier, neigung, tief, rate, radius) {
      const d = faceDir(s, gier, neigung);
      surfaceSample(b, d.x, d.y, d.z, _p);
      Deform.ziehenZu(b,
        _p.x - _p.nx * tief * R, _p.y - _p.ny * tief * R, _p.z - _p.nz * tief * R,
        rate * oeffnung * wucht, dt, radius * R);
    }

    /* Der Schlitz: fuenf Saugpunkte NEBENEINANDER, keiner uebereinander. Aus
     * runden Einzeldellen wird dadurch ein quer liegender Graben — im
     * Referenzmaterial ist die Oeffnung 2,0- bis 2,4-mal so breit wie hoch,
     * unser Bild hatte 1,05:1. */
    for (let i = -2; i <= 2; i++) {
      const g = i === 0 ? 1 : Math.abs(i) === 1 ? 0.94 : 0.72;
      greifen(i * MUND_GIER, MUND_NEIG, 0.34, 128 * g, 0.44);
    }

    /* Ober- und Unterkiefer. Das ist der Kern des Befundes: eine Oeffnung mit
     * "symmetrischer Kante, ober- und unterhalb identisch" ist ein Loch, kein
     * Maul. Im Referenzbild sitzt unter der Oeffnung ein voller Wulst, ueber
     * ihr laeuft die Kante duenner aus — also unten mehr Druck als oben, und
     * beide schieben die Haut nach VORN, sodass zwischen ihnen eine Kerbe
     * bleibt, die man auch im Umriss sieht. */
    greifen(0, MUND_NEIG + 0.36, 0.30, -58, 0.54);
    greifen(0, MUND_NEIG - 0.34, 0.26, -78, 0.50);

    /* Die Backen: zwei Druckpunkte weit aussen machen die Vorderpartie breit
     * und flach. Ohne sie kruemmt sich die Front so stark weg, dass der
     * gezeichnete Mundbogen perspektivisch auf einen Kreis zusammenschnurrt,
     * egal wie breit er auf der Oberflaeche liegt. */
    greifen(-0.80, MUND_NEIG + 0.04, 0.34, -34, 0.54);
    greifen(0.80, MUND_NEIG + 0.04, 0.34, -34, 0.54);
  }

  /* --- Der Gegner bleibt draussen (GDD 01 §28, GDD 02 §8) ------------------
   * Das Bild "Gegner sichtbar INNERHALB der Masse" gehoert dem Fressen. Im
   * Kampf muss es weg — sonst ist weder ablesbar, wer wen trifft, noch bleibt
   * der Fressmoment das, was er sein soll.
   *
   * Gemessen steckte der Wolf vorher waehrend des gesamten Auto-Angriffs im
   * Koerper (Luecke durchgehend negativ). Eine Koerperkollision gibt es in
   * `game.js` nicht und die Datei ist gesperrt — hier steht deshalb eine
   * eigene, weiche: eine Abstosskugel um den Gegner, die jede Schleimhaut
   * innerhalb ihres Radius nach aussen schiebt. Zwei geschachtelte Radien
   * ergeben eine Rampe statt einer Kante, sonst zittert die Haut am Rand.
   *
   * Das ist zugleich die Kontaktverformung: die Front wird an der Kugel platt
   * gedrueckt und weicht zur Seite aus — Verdraengung statt Durchdringung
   * (GDD 01 §66).
   *
   * `1.30 * groesse` statt `groesse`: `groesse` ist der Rumpfradius, die
   * Schnauze des Wolfs ragt deutlich weiter — im Bild verschwindet der Gegner
   * erst jenseits des rund 1,4-fachen.
   *
   * Die Staerke haengt an der GEMESSENEN Luecke, nicht an einem festen Wert.
   * Eine Abstosskugel mit konstanter Rate haelt den Schleim auf Abstand, auch
   * wenn er gar nicht andrueckt — gemessen stand er dann eine halbe Einheit
   * zu weit weg und der Biss traf ins Leere. So greift sie nur, wenn die
   * Luecke wirklich zugeht, und dann proportional zur Durchdringung. */
  function abstandHalten(G, b, k, ux, uz, dt) {
    const R = G.params.radius;
    const m = Deform.masse(b, ux, uz);
    const dist = Math.hypot(k.x - b.cx, k.z - b.cz);
    const soll = 0.30 * R;
    const luecke = dist - m.vorne - k.groesse * 1.30;
    if (luecke >= soll) return luecke;
    const wucht = Math.min(2.4, (soll - luecke) / soll);
    const rK = k.groesse * 1.30;
    const y = k.y + k.groesse * 0.80;
    // Die Haut weicht am Hindernis zur Seite aus: Verdraengung, nicht
    // Durchdringung (GDD 01 §66).
    Deform.ziehenZu(b, k.x, y, k.z, -40 * wucht, dt, rK + 0.34);
    Deform.ziehenZu(b, k.x, y, k.z, -62 * wucht, dt, rK);
    // und der ganze Koerper bekommt die Gegenkraft ab.
    Deform.impuls(b, -ux, 0.05, -uz, 5.5 * wucht * dt);
    return luecke;
  }

  /* Kampfabstand — eine Feder, kein gesetzter Ort.
   *
   * Ohne sie treibt der Schleim ueber die Schlaege hinweg davon: der
   * Rueckschlag traegt ihn jedesmal ein Stueck nach hinten, der Anmarsch
   * greift aber erst weit ausserhalb der Reichweite wieder ein. Gemessen
   * stand er nach drei Schlaegen 1.7 Einheiten zu weit weg und biss ins
   * Leere. Die Feder zieht ihn auf BERUEHRUNGSNAEHE — so nah, dass der Biss
   * die Abstosskugel des Gegners wirklich erreicht und die Front daran platt
   * gedrueckt wird, und keinen Schritt naeher (GDD 02 §8). */
  function abstandFedern(G, b, k, ux, uz, dist, dt, staerke) {
    const soll = k.groesse * 1.30 + G.params.radius * 1.16 + standVersatz;
    const fehl = Math.max(-0.9, Math.min(0.9, dist - soll));
    if (Math.abs(fehl) < 0.02) return;
    const vz = fehl > 0 ? 1 : -1;
    Deform.impuls(b, ux * vz, 0.02, uz * vz, Math.abs(fehl) * staerke * dt);
  }

  /* --- Takt ---------------------------------------------------------------- */

  function aktualisieren(G, dt) {
    extraSichern();
    letztesDt = dt;
    const k = SPIEL.zielKreatur();
    const b = G.slime.body;

    /* Ein laufender Biss ueberlebt den Phasenwechsel nicht. Ohne diesen
     * Abbruch lief er nach dem Fressen weiter, biss auf die alte Stelle eines
     * womoeglich verschwundenen Gegners und liess den Mund auf dem letzten
     * Wert stehen (ARBEITSLISTE 29). */
    if (G.phase !== 'frei') {
      if (biss) { biss = null; G.slime.mouth = 0; }
      warKampf = false;
    }

    const kaempft = !!(G.autoAngriff && k && k.lebt && G.phase === 'frei');
    let ux = 0, uz = 0, dist = 0, drin = false;

    /* Flanke in den Kampf: den Zaehler in die Vorspannung setzen, damit der
     * erste Schlag genauso ausholt wie jeder folgende. */
    if (kaempft && !warKampf) G.schwungZeit = Math.max(G.schwungZeit, ANFANGSSCHWUNG);
    if (!kaempft) standVersatz = 0;
    warKampf = kaempft;

    if (k) {
      const dx = k.x - b.cx, dz = k.z - b.cz;
      dist = Math.hypot(dx, dz) || 1e-6;
      ux = dx / dist; uz = dz / dist;
      drin = dist <= reichweiteVon(G, k);
    }

    /* --- Rechtsklick-Kampf: automatisch nachruecken (GDD 02 §4) -----------
     * Mit Hysterese. Ohne sie wird das Laufziel jeden Schritt neu gesetzt und
     * der Schleim zappelt an der Reichweitengrenze hin und her. */
    if (kaempft) {
      const reich = reichweiteVon(G, k);
      if (!anmarsch && dist > reich) anmarsch = true;
      if (anmarsch && dist <= reich * 0.88) { anmarsch = false; G.slime.target = null; }
      if (anmarsch) {
        const halt = reich * 0.82;
        G.slime.target = { x: k.x - ux * halt, z: k.z - uz * halt };
      }
    } else if (anmarsch) {
      anmarsch = false;
      G.slime.target = null;
    }

    /* --- Schwungtakt (GDD 02 §5) ------------------------------------------
     * Laeuft von selbst weiter, solange das Ziel lebt und in Reichweite ist.
     * Waehrend des Anmarsches parkt der Zaehler am Anfang der Vorspannung:
     * dann ist der erste Schlag nach dem Erreichen der Reichweite ein voll
     * ausgeholter Schlag und kein Zucken aus dem Nichts. */
    if (kaempft && drin) {
      // Der Zaehler laeuft auch waehrend des Schlages weiter: der Takt ist
      // damit exakt `schwungDauer` und nicht Schlagdauer plus Wartezeit.
      // Bei 2 s Takt teilt sich der Zyklus in 0.65 s Biss und 0.95 s Ausholen
      // — es gibt kein Fenster ohne ablesbaren Zustand.
      G.schwungZeit -= dt;
      if (G.schwungZeit <= 0) {
        G.schwungZeit += G.schwungDauer;
        if (!biss) bissStarten(G, k);
      }
    } else if (kaempft) {
      G.schwungZeit = Math.min(G.schwungDauer, Math.max(G.schwungZeit, VORSPANNUNG));
    } else {
      G.schwungZeit = Math.max(0, Math.min(G.schwungZeit, G.schwungDauer));
    }

    if (kaempft) kampfhaltung(G, dt, k, ux, uz, drin);

    bissAktualisieren(G, dt);

    /* Der Abstand wird ZULETZT durchgesetzt, nach allen Kraeften dieses
     * Schrittes: was der Biss nach vorn geschoben hat, korrigiert die
     * Abstosskugel im selben Schritt wieder. Nur so bleibt die Luecke in
     * JEDEM Einzelbild positiv und nicht nur im Mittel. */
    if (k && k.lebt && G.phase === 'frei'
        && dist < reichweiteVon(G, k) + G.params.radius) {
      if (kaempft && !anmarsch) {
        // Waehrend des Zuschnappens keine Feder: der Vorstoss soll fliegen.
        const imSchlag = biss && biss.t < BISS.schnappen;
        abstandFedern(G, b, k, ux, uz, dist, dt, imSchlag ? 0 : 16);
      }
      abstandHalten(G, b, k, ux, uz, dt);
    }

    spritzerAktualisieren(dt);
    if (treffer) { treffer.t += dt; if (treffer.t > NACHGLUEHEN) treffer = null; }
    if (stossFx > 0) stossFx = Math.max(0, stossFx - dt * 3);
  }

  /* --- Kampfhaltung ---------------------------------------------------------
   * GDD 01 §66: der Koerper reagiert IMMER. Ein Schleim, der zwischen zwei
   * Schlaegen zur Pfuetze zusammensackt, sieht aus wie ein Objekt mit
   * Schleim-Textur, das gerade nicht animiert wird.
   *
   * Der Takt zerfaellt in zwei benannte Bewegungsphasen, nicht in eine Rampe
   * (GDD 01 §68 — starke Bewegungsphasen):
   *
   *   SAMMELN  (Mitte des Ausholens): die Masse wandert nach HINTEN und oben,
   *            die Front wird eingezogen, der Mund oeffnet sich. Silhouette:
   *            hecklastig, vom Gegner weggelehnt.
   *   LANGEN   (letztes Drittel): der Koerper zieht sich zum Gegner — vorn
   *            ein voller Ballen, hinten ein duenner Zipfel. Genau die
   *            Reihenfolge aus GDD 02 §7, und zwar VOR dem Biss und nicht
   *            erst darin.
   *
   * In beiden Phasen liegt ein Vorne-Hinten-Gefaelle an. Die alte Fassung
   * hat nur die Hoehe bewegt; deren Silhouette war zwangslaeufig in jedem
   * Bild spiegelgleich. */
  function kampfhaltung(G, dt, k, ux, uz, drin) {
    const b = G.slime.body, s = G.slime, R = G.params.radius;

    // Blick zum Gegner. `updateSlime` uebernimmt den Winkel unveraendert,
    // solange der Koerper langsam ist — im Anmarsch zeigt die Bewegung
    // ohnehin dorthin.
    const soll = Math.atan2(k.z - b.cz, k.x - b.cx);
    s.facing = angleLerp(s.facing, soll, 1 - Math.exp(-8 * dt));

    if (!drin) return;

    // Aufrichten gegen das Zusammensacken. `stauchen` ist volumentreu, also
    // reine Haltung — die sichtbare Groesse bleibt Sache des Levels
    // (GDD 01 §29). Der Kampfstand muss sich schon im Standbild vom
    // Herumstehen unterscheiden (ARBEITSLISTE 28).
    const atem = 0.05 * Math.sin(G.zeit * 4.4);
    Deform.stauchen(b, 0, 1, 0, 1.20 + atem, 105, dt);

    if (biss) return;      // waehrend des Schlages fuehrt der Biss

    // 0 → 1 ueber die letzten VORSPANNUNG Sekunden.
    const v = 1 - Math.min(1, Math.max(0, G.schwungZeit) / VORSPANNUNG);

    // Der Mund geht frueh auf und bleibt offen: "Mund oeffnet sich" steht in
    // §7 VOR "Koerper zieht sich zum Gegner", nicht daneben.
    s.mouth = Math.max(s.mouth, 0.16 + 0.84 * glatt(v * 1.35));
    mundhoehle(s, R, s.mouth, dt);

    if (v <= 0.001) return;

    const sammeln = beule(v, 0.34, 0.42);
    /* Nicht geglaettet, sondern beschleunigend: eine Rampe mit S-Kurve
     * saettigt zu frueh, und gemessen an den Einzelbildern sahen die letzten
     * vier Bilder des Ausholens dadurch praktisch gleich aus. Mit dem
     * Exponenten waechst die Bewegung bis zum letzten Bild weiter. */
    const langen = Math.pow(Math.max(0, Math.min(1, (v - 0.38) / 0.62)), 1.5);
    // Und ganz zuletzt richtet sich die Masse noch einmal auf, bevor sie
    // flach nach vorn kippt. Der Gegensatz hoch → flach ist der Beat, den
    // GDD 01 §68 mit "starke Bewegungsphasen" meint.
    const heben = glatt((v - 0.70) / 0.30);

    /* Der Kampfstand WIEGT sich: beim Sammeln weicht der ganze Koerper ein
     * Stueck zurueck, beim Langen kommt er wieder heran. Das ist der Anlauf,
     * den man auch im Daumennagel des Kontaktbogens sieht — eine Verformung
     * allein reicht dafuer nicht, es muss sich der ABSTAND zum Gegner
     * aendern, sonst steht in §7 "Koerper zieht sich zum Gegner" und im Bild
     * bewegt sich nur die Haut. Ausgefuehrt wird das Wiegen von der
     * Abstandsfeder, also von einer Kraft und nicht von einer Zuweisung. */
    standVersatz = R * (0.34 * sammeln - 0.12 * langen);

    /* SAMMELN — die Masse geht nach hinten und oben, die Front wird hohl.
     * Der Koerper lehnt sichtbar VOM Gegner weg; ohne diese Gegenrichtung
     * fehlt dem Schlag der Anlauf und der Zuschauer sieht nur ein Wachsen. */
    if (sammeln > 0.001) {
      Deform.impulsGerichtet(b, -ux, 0.42, -uz, 48 * sammeln * dt, 1.3);
      frontBallen(b, ux, uz, R, 34 * sammeln, dt, -1);
      Deform.stauchen(b, 0, 1, 0, 1 + 0.34 * sammeln, 140, dt);
    }

    /* LANGEN — jetzt zieht sich der Koerper zum Gegner. Der Ballen vorn und
     * der Zipfel hinten sind das eigentliche Bild: eine Masse, die sich
     * ausstreckt, statt eines Eis, das kippt. */
    if (langen > 0.001) {
      frontBallen(b, ux, uz, R, 58 * langen, dt);
      heckSpitzen(b, ux, uz, R, 52 * langen, dt);
      Deform.impulsGerichtet(b, ux, -0.10, uz, 26 * langen * dt, 2.2);
      Deform.stauchen(b, ux, 0, uz, 1 + 0.26 * langen, 120, dt);
      // Je naeher der Schlag, desto unruhiger die Oberflaeche.
      Deform.zittern(b, 70 * langen * langen, 19, G.zeit, dt);
    }

    /* HEBEN — die letzten Zehntel: die Masse geht ueber die Front noch einmal
     * hoch. Damit hat das Bild unmittelbar vor dem Schlag eine andere
     * Silhouette als die drei davor, und der flache Vorstoss danach hat
     * etwas, wogegen er sich abhebt. */
    if (heben > 0.001) {
      Deform.stauchen(b, 0, 1, 0, 1 + 0.30 * heben, 150, dt);
      Deform.impulsGerichtet(b, ux * 0.45, 1, uz * 0.45, 30 * heben * dt, 1.5);
    }
  }

  /* --- Biss (GDD 02 §7) -----------------------------------------------------
   * Normaler Blob → Mund offen → Masse schnellt zum Gegner → Kontakt →
   * Schleim federt zurueck. Das Ausholen ist schon vorher passiert. */
  function bissStarten(G, k) {
    const b = G.slime.body;
    const dx = k.x - b.cx, dz = k.z - b.cz;
    const d = Math.hypot(dx, dz) || 1e-6;
    const ux = dx / d, uz = dz / d;

    // Den Ort haelt `abstandFedern` relativ zum GEGNER, nicht relativ zu
    // einem gemerkten Punkt: ein Anker im Raum wird falsch, sobald sich der
    // Gegner bewegt, und der Wolf bewegt sich.
    biss = { t: 0, ziel: k, ux, uz, getroffen: false, abgestossen: false };
    G.slime.mouth = 1;
    G.slime.facing = Math.atan2(dz, dx);

    /* Drei Einzelimpulse, kein Dauerschub — und der dritte ist der wichtige.
     *
     * 1. Der ganze Koerper setzt sich zum Gegner in Bewegung. Ohne diesen
     *    Anteil verformte sich der Schleim zwar, blieb aber stehen: der Biss
     *    ist eine Ortsveraenderung, keine Grimasse (GDD 02 §7).
     * 2. Die vordere Masse schnellt zusaetzlich los und nach unten.
     * 3. GEGENBEWEGUNG: das Heck geht im selben Moment nach HINTEN. Der
     *    Gutachter hat "keine Gegenbewegung, kein Volumenausgleich" notiert —
     *    das ist der Punkt. Eine Masse, deren Front losschiesst und deren Heck
     *    dabei stehen bleibt, hat kein Gewicht; erst wenn hinten etwas
     *    zurueckweicht, sieht man, dass vorn etwas geworfen wurde. Der
     *    Rueckstoss ist bewusst kleiner als der Vorstoss, sonst bewegt sich
     *    der Schwerpunkt nicht mehr.
     */
    Deform.impuls(b, ux, 0.05, uz, 1.05);
    Deform.impulsGerichtet(b, ux, -0.32, uz, 4.8, 1.5);
    Deform.impulsGerichtet(b, -ux, 0.30, -uz, 3.4, 2.4);
  }

  function bissAktualisieren(G, dt) {
    if (!biss) return;
    const b = G.slime.body, s = G.slime, R = G.params.radius;
    const k = biss.ziel;
    biss.t += dt;

    // Richtung vom Schlagbeginn beibehalten: ein Gegner, der im Kontakt
    // wegläuft, soll den Schlag nicht mitten in der Bewegung umlenken.
    const ux = biss.ux, uz = biss.uz;

    if (biss.t < BISS.schnappen) {
      // Zuschnappen: die gesammelte Masse kippt nach vorn — der Koerper wird
      // schlagartig flach und schiesst in die Angriffsrichtung. Der Gegensatz
      // zur hohen Vorspannung traegt den ganzen Moment.
      // Der Ballen vorn wird dabei staerker, der Zipfel hinten laenger: im
      // Schlag ist das Gefaelle am groessten.
      Deform.stauchen(b, 0, 1, 0, 0.68, 175, dt);
      Deform.stauchen(b, ux, 0, uz, 1.42, 115, dt);
      frontBallen(b, ux, uz, R, 88, dt);
      heckSpitzen(b, ux, uz, R, 96, dt);
      s.mouth = 1;
      mundhoehle(s, R, 1, dt, 1.55);

    } else if (biss.t < BISS.schnappen + BISS.kontakt) {
      // Kontakt: die Masse legt sich gegen den Gegner. Flachgedrueckt wird sie
      // dabei von der Abstosskugel in `abstandHalten` — das ist echte
      // Verdraengung an einem Hindernis, nicht eine Stauchung ins Leere.
      if (!biss.getroffen) {
        biss.getroffen = true;
        Deform.impuls(b, -ux * 0.4, 0.55, -uz * 0.4, 1.1);   // Rueckstoss
        einschlag(G, k, ux, uz);
        if (k.lebt) SPIEL.kreaturSchaden(k, Regeln.spielerSchaden(G.spieler.level), 'auto');
      }
      // Quer ausweichen statt nach vorn durchgreifen: die Front wird breit,
      // der Koerper niedrig. Das Heck bleibt schlank — sonst steht wieder eine
      // spiegelgleiche Kuppel da.
      Deform.stauchen(b, ux, 0, uz, 0.76, 155, dt);
      Deform.stauchen(b, 0, 1, 0, 0.86, 115, dt);
      heckSpitzen(b, ux, uz, R, 74, dt);
      s.mouth = 1;
      mundhoehle(s, R, 1, dt, 1.55);

    } else if (biss.t < BISS_GESAMT) {
      // Zurueckfedern: der Koerper zieht sich zurueck, schwingt ueber die
      // Ruheform hinaus und beruhigt sich (GDD 01 §13). Das Nachschwingen
      // laeuft ueber die Hoehe, damit es aus jeder Kamerarichtung zu sehen ist.
      const f = (biss.t - BISS.schnappen - BISS.kontakt) / BISS.zurueck;
      const ab = (1 - f) * (1 - f);
      if (!biss.abgestossen) {
        // Ein einziger harter Rueckstoss: der Schleim loest sich schlagartig
        // vom Gegner ab. Das ist der Impuls, den man als "Absetzen" liest.
        biss.abgestossen = true;
        Deform.impuls(b, -ux, 0.30, -uz, 1.5);
      }
      /* Das Heck zieht ZUERST ab und die Front bleibt haengen: die Masse
       * rollt sich vom Gegner weg, statt als Block zurueckzurutschen. Genau
       * dabei laeuft der Koerper ueber seine eigene Sollform hinaus — und die
       * Ruheform in `softbody.js` beantwortet das von selbst mit einer
       * Taille, weil sie die Ueberdehnung am Netz misst (`tailleZug`). Wir
       * muessen sie also nicht verdrahten, nur erzeugen.
       *
       * Der Betrag ist bewusst klein: den Ort besorgt die Abstandsfeder
       * oben. Ein starker Rueckstoss hier trug den Koerper ueber mehrere
       * Schlaege 1.7 Einheiten aus der Reichweite heraus. */
      const zieh = (1 - f);
      Deform.impulsGerichtet(b, -ux, 0.14, -uz, 20 * zieh * zieh * dt, 2.2);
      heckSpitzen(b, ux, uz, R, 46 * zieh, dt);
      frontBallen(b, ux, uz, R, 30 * zieh, dt, -1);
      Deform.stauchen(b, 0, 1, 0, 1 + 0.44 * ab * Math.cos(f * 8.5), 110, dt);
      Deform.stauchen(b, ux, 0, uz, 1 + 0.20 * ab * Math.cos(f * 8.5 + 0.9), 80, dt);
      s.mouth = Math.max(0, 1 - f * 1.35);
      mundhoehle(s, R, s.mouth, dt);

    } else {
      biss = null;
    }
  }

  /* --- Einschlag ------------------------------------------------------------
   * GDD 10 §73: Kampfaktionen brauchen unmittelbar verstaendliches Feedback.
   * Die Schadenszahl allein steht irgendwo im Bild; was den Treffer im Moment
   * selbst lesbar macht, ist der sichtbare Aufschlag am Gegner. */
  function einschlag(G, k, ux, uz) {
    /* Die Tropfen fliegen von der BERUEHRUNGSSTELLE weg, nicht ueber dem
     * Kopf des Gegners. Vorher sassen sie als blickdichte blaue Kappe auf
     * dem Wolf und man las "der Wolf ist jetzt blau" statt "der Wolf wurde
     * getroffen" (GDD 10 §98). Seit der Gegner nicht mehr im Koerper steckt,
     * ist die Stelle davor auch frei und sichtbar. */
    const x = k.x - ux * k.groesse * 1.05;
    const z = k.z - uz * k.groesse * 1.05;
    /* Auf Rumpfhoehe, nicht auf Beinhoehe. `renderer.js` setzt den Rumpf des
     * Wolfs auf 0.95 * groesse; bei den frueheren 0.70 sass der Aufschlag
     * zwischen den Vorderlaeufen und las sich als Bodeneffekt. */
    const y = k.y + k.groesse * 0.95;

    // `ziel` merken: der Blitz leuchtet den GETROFFENEN aus, und das ist die
    // Antwort auf GDD 02 §63 ("wer wird getroffen muss ablesbar sein").
    treffer = { t: 0, x, y, z, r: k.groesse, ziel: k };

    // Deterministisch verteilte Tropfen — kein Zufall, sonst waeren zwei
    // Aufnahmen desselben Standes nicht vergleichbar (ARCHITEKTUR §2).
    // Quer zur Schlagrichtung gefaechert: laengs der Achse stehen Schleim und
    // Gegner, quer dazu ist freies Bild.
    //
    // Kurz und flach geworfen. Vorher hingen acht Tropfen eine halbe Sekunde
    // lang als Bogen ueber dem Gegner und zogen genau in den Bildern die
    // Aufmerksamkeit auf sich, in denen der Schleim zurueckfedert — der
    // wichtigste Teil des Schlages. Der Spritzer gehoert zum Einschlag, nicht
    // zum Rueckzug (GDD 10 §98: Lesbarkeit schlaegt Effektdichte).
    const qx = -uz, qz = ux;
    const N = 6;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 6.28318 + 0.61;
      const m = 0.6 + 0.4 * (((i * 5) % 7) / 7);
      // Schneller weg vom Einschlag als frueher: in den ersten Hundertsteln
      // sassen alle sechs Tropfen noch aufeinander und bildeten genau die
      // blaue Kappe auf dem Gegner, die ARBEITSLISTE 27 ruegt.
      const seit = Math.cos(a) * 5.4 * m, hoch = Math.sin(a) * 2.6 * m;
      spritzer.push({
        x, y, z,
        // Quer und nach vorn-unten, nicht nach oben ueber den Gegner.
        vx: qx * seit + ux * (1.5 + 0.6 * m),
        vy: 0.5 + 0.9 * m + hoch,
        vz: qz * seit + uz * (1.5 + 0.6 * m),
        // Klein halten. Ein Tropfen, der so gross wird wie der Kopf des
        // Gegners, ist kein Spritzer mehr, sondern verdeckt den Treffer.
        r: k.groesse * (0.10 + 0.07 * m),
        leben: 1,
      });
      if (spritzer.length > 48) spritzer.shift();
    }
  }

  function spritzerAktualisieren(dt) {
    for (let i = spritzer.length - 1; i >= 0; i--) {
      const p = spritzer[i];
      p.vy -= 18 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.leben -= dt / 0.24;
      if (p.leben <= 0 || p.y < 0.02) spritzer.splice(i, 1);
    }
  }

  /* --- Zeichnen (ARCHITEKTUR §5, renderer.js bleibt gesperrt) -------------- */

  /* Eine weiche Leuchtscheibe, immer zur Kamera gedreht.
   *
   * Warum nicht einfach eine Kugel mit `drawProp`: `FS_SOLID` zieht die Flaeche
   * bei `uEmissive = 1` auf die reine Grundfarbe, eine leuchtende Kugel ist
   * damit eine FLACHE Scheibe konstanter Farbe. Im Bild sah der Trefferblitz
   * dadurch aus wie ein roter Nebelball neben dem Wolf. Das Dekal-Programm hat
   * dagegen einen radialen Abfall (`pow(1-d, 1.6)`) — genau das, was ein
   * Aufschlag braucht: heisser Kern, weicher Rand.
   *
   * `vorschub` schiebt die Scheibe auf die Kamera zu. Ohne ihn liegt sie in der
   * Tiefe des Gegners, ihre kameranahe Haelfte faellt am Tiefentest des
   * Gegnerkoerpers durch, und der Schein steht nur NEBEN dem Wolf statt AUF
   * ihm — dann beantwortet er die Frage "wer wurde getroffen" gerade nicht. */
  const _bb = new Float32Array(16);
  function leuchtScheibe(gl, R, ctx, x, y, z, radius, farbe, alpha, vorschub) {
    if (alpha <= 0.004 || radius <= 0) return;
    const cam = ctx.cam;
    let fx = cam[0] - x, fy = cam[1] - y, fz = cam[2] - z;
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    // rechts = hoch x vorn, dann hoch = vorn x rechts (Rechtssystem)
    let rx = fz, ry = 0, rz = -fx;
    const rl = Math.hypot(rx, rz) || 1;
    rx /= rl; rz /= rl;
    const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
    const s = radius, v = vorschub || 0;
    _bb[0] = rx * s; _bb[1] = ry * s; _bb[2] = rz * s; _bb[3] = 0;
    _bb[4] = fx * s; _bb[5] = fy * s; _bb[6] = fz * s; _bb[7] = 0;
    _bb[8] = ux * s; _bb[9] = uy * s; _bb[10] = uz * s; _bb[11] = 0;
    _bb[12] = x + fx * v; _bb[13] = y + fy * v; _bb[14] = z + fz * v; _bb[15] = 1;

    const d = R.decal;
    gl.useProgram(d.p);
    gl.bindVertexArray(R.quadMesh.vao);
    gl.uniformMatrix4fv(d.u.uViewProj, false, ctx.viewProj);
    gl.uniformMatrix4fv(d.u.uModel, false, _bb);
    gl.uniform3fv(d.u.uColor, farbe);
    gl.uniform1f(d.u.uAlpha, alpha);
    gl.uniform1f(d.u.uRing, 0);
    gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);
  }

  function extraSichern() {
    if (extraGesetzt) return;
    const R = window.SLIMORIA && window.SLIMORIA.R;
    if (!R || !R.extras) return;
    R.extras.push({ name: 'kampf-einschlag', order: 20, draw: zeichnen });
    extraGesetzt = true;
  }

  /* Ein Blick in die Welt muss drei Fragen beantworten, ohne dass man das HUD
   * am Bildrand liest (GDD 02 §3/§63, GDD 10 §73):
   *   WEN greife ich an   → roter Zielreif am Boden, dauerhaft
   *   WANN faellt der Schlag → derselbe Reif heizt sich ueber die Vorspannung auf
   *   HAT es getroffen    → Blitz auf dem Gegner, danach rotes Nachgluehen
   * Alle drei sitzen AM GEGNER. Am eigenen Koerper haengt nichts davon — genau
   * das war der Befund ("der einzige Ring im Bild liegt gelb um die eigene
   * Figur und verwischt die Zielrichtung"). */
  function zeichnen(gl, ctx) {
    const R = window.SLIMORIA.R;
    const pal = ctx.pal;
    const vp = ctx.viewProj;
    const G = ctx.game;
    const ziel = (typeof SPIEL !== 'undefined' && SPIEL.zielKreatur) ? SPIEL.zielKreatur() : null;
    if (!ziel && !treffer && !spritzer.length) return;

    gl.enable(gl.BLEND);
    gl.depthMask(false);

    /* --- 1. Zielreif, rot (Dossier §5: Bodenring #FF2020, ~2 px Linie) -----
     * Zwei versetzte Baender: zusammen sind sie breiter als der gelbe Reif
     * darunter und decken ihn restlos. Ein einzelnes Band liesse an der
     * Innenkante einen goldenen Saum stehen, und zwei Farben an einem Ring
     * lesen sich als Fehler, nicht als Absicht. */
    if (ziel) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);          // das Bodenquad liegt je nach Blick falschherum
      const rz = (ziel.groesse * ZIELRING_WEIT + ZIELRING_ZU)
               * (1 + Math.sin(ctx.time * 5) * ZIELRING_PULS);

      /* Wie weit der Schlag ist: 0 gleich nach dem Biss, 1 im Moment davor.
       * Damit traegt der Reif den Rhythmus aus GDD 02 §5 auch in den Bildern,
       * die keinen Kontakt erwischen — und das sind bei 2 s Takt die meisten. */
      const kaempft = !!(G && G.autoAngriff && ziel.lebt && G.phase === 'frei');
      const spann = kaempft
        ? 1 - Math.min(1, Math.max(0, G.schwungZeit) / VORSPANNUNG) : 0;

      // Aufheizen ueber die Helligkeit, nicht ueber den Radius: ein wandernder
      // Ring liest sich als Flaechentelegraph ("hier schlaegt gleich etwas
      // ein"), und das ist eine andere Aussage.
      const hitze = [ZIELRING_ROT[0],
                     ZIELRING_ROT[1] + 0.24 * spann,
                     ZIELRING_ROT[2] + 0.18 * spann];
      R.drawDecal(ziel.x, ziel.z, rz * 1.018, hitze, 1, true, vp);
      R.drawDecal(ziel.x, ziel.z, rz * 0.980, hitze, 1, true, vp);
      // Schwacher Flaechenschimmer im Inneren — im Referenzbild ist der Ring
      // nicht leer, sondern hat einen matten roten Boden.
      R.drawDecal(ziel.x, ziel.z, rz * 0.94, ZIELRING_ROT, 0.07 + 0.11 * spann, false, vp);
      gl.enable(gl.CULL_FACE);
    }

    /* --- 2. Trefferblitz (GDD 01 §68 sichtbarer Impact-Moment) -------------
     * Drei Lagen, in dieser Reihenfolge: Saum am Getroffenen, Kern und Hof an
     * der Beruehrungsstelle, zuletzt der kurze Farbumschlag am Gegner. Der
     * Saum und der Kern werden ADDIERT, damit sie nichts uebermalen; nur der
     * Umschlag mischt gedeckt, weil ein fast weisser Koerper sich nicht
     * aufhellen laesst. */
    if (treffer) {
      const f = Math.min(1, treffer.t / BLITZ);
      const ab = (1 - f) * (1 - f);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.CULL_FACE);

      /* Der GETROFFENE leuchtet — zuerst, damit Kern und Hof darueber liegen.
       * Ein Blitz im leeren Raum sagt "hier ist etwas passiert"; ein Blitz am
       * Koerper des Wolfs sagt "DER WOLF hat es abbekommen" (GDD 02 §63).
       * Danach glimmt er ueber eine Sekunde nach: bei 2 s Schwungtakt faellt
       * sonst nur jedes achte Einzelbild in den Treffer. */
      const k = treffer.ziel;
      const g = k ? k.groesse : treffer.r;
      const nach = Math.max(0, 1 - treffer.t / NACHGLUEHEN);
      if (k && k.lebt) {
        /* Kein Vorschub: die Scheibe steht in der Tiefe des Wolfs, sein
         * Koerper verdeckt ihre Mitte, und es bleibt ein roter Saum genau
         * entlang seiner Silhouette. Das ist der Teil, der auf sandfarbenem
         * Boden traegt — ein additiver Schein AUF einem fast weissen Wolf
         * waere unsichtbar, weil dort nichts mehr aufzuhellen ist. */
        leuchtScheibe(gl, R, ctx, k.x, k.y + g * 0.95, k.z, g * 1.80,
          [1.00, 0.19, 0.13], 0.95 * ab + 0.46 * Math.pow(nach, 1.35), 0);
      }

      /* Kern an der Beruehrungsstelle: klein und weissheiss, waechst kurz auf.
       * `spitz` ist ein Aufblitzen ueber nur drei Hundertstel des Schlages —
       * ohne diesen kurzen Ausschlag hat der Aufschlag denselben Verlauf wie
       * das Nachgluehen und liest sich als Aufblenden statt als Schlag
       * (GDD 01 §68, sichtbarer Impact-Moment). */
      const spitz = Math.max(0, 1 - treffer.t / 0.075) ** 2;
      leuchtScheibe(gl, R, ctx, treffer.x, treffer.y, treffer.z,
        treffer.r * (0.70 + 1.30 * f), [1.00, 0.95, 0.80],
        1.10 * ab + 0.85 * spitz, treffer.r * 1.2);
      // Hof darum: breiter, waermer, schwaecher — er gibt dem Kern eine Kante.
      leuchtScheibe(gl, R, ctx, treffer.x, treffer.y, treffer.z,
        treffer.r * (1.1 + 2.6 * f), [0.95, 0.42, 0.16], 0.62 * ab, treffer.r * 1.1);

      /* Und der Wolf selbst schlaegt kurz ins Rote um. Nur hier wird gedeckt
       * gemischt statt addiert — ein heller Koerper laesst sich nicht heller
       * machen, und ohne diesen Umschlag sieht man am Getroffenen nichts.
       * Kurz gehalten (unter einem Fuenftel des Schwungtaktes), damit aus dem
       * Treffer kein Umfaerben der Kreatur wird (ARBEITSLISTE 27). */
      if (k && k.lebt && ab > 0.01) {
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        leuchtScheibe(gl, R, ctx, k.x, k.y + g * 0.95, k.z, g * 1.55,
          [1.00, 0.16, 0.12], 0.80 * ab, g * 1.60);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      }

      gl.enable(gl.CULL_FACE);
    }

    /* --- 3. Spritzer -------------------------------------------------------
     * Zurueck auf normales Blenden. Hell statt mittelblau: auf sandfarbenem
     * Boden ging `pal.mid` bei 0.25 Eigenleuchten unter. */
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const p of spritzer) {
      const r = p.r * (0.55 + 0.45 * p.leben);
      R.drawProp(R.propMesh, M4.trs(p.x, p.y, p.z, r, r, r), NORMALE_EINS,
        pal.light, 0.8, 0.32 + 0.24 * p.leben, ctx.cam, vp);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /* --- Faehigkeiten ---------------------------------------------------------
   * Eine einfache, sehr gute Bewegung ist besser als zehn Effekte
   * (GDD 02 §64) — deshalb dieselbe Sprache wie beim Biss.
   *
   * `letztesDt` statt eines Zahlenliterals: `game.js` ruft diese Funktion
   * ohne Zeitschritt, und ARCHITEKTUR §2 verlangt Zeit ausschliesslich ueber
   * den durchgereichten Wert (ARBEITSLISTE 39). */
  function faehigkeit(G, f, k) {
    const b = G.slime.body, R = G.params.radius;
    if (f.id === 'stoss' && k) {
      const dx = k.x - b.cx, dz = k.z - b.cz;
      const d = Math.hypot(dx, dz) || 1;
      const ux = dx / d, uz = dz / d;
      Deform.impulsGerichtet(b, ux, 0.22, uz, 8.0, 1.3);
      Deform.impulsGerichtet(b, -ux, 0.24, -uz, 4.0, 2.4);
      frontBallen(b, ux, uz, R, 120, letztesDt);
      G.slime.mouth = 1;
      stossFx = 1;
      einschlag(G, k, ux, uz);
    } else if (f.id === 'saeure' && k) {
      Deform.stauchen(b, 0, 1, 0, 0.82, 30, letztesDt);
      Deform.impuls(b, 0, 1, 0, 1.6);
    } else if (f.id === 'straffen') {
      Deform.stauchen(b, 0, 1, 0, 1.18, 26, letztesDt);
    }
  }

  return {
    aktualisieren, faehigkeit, zuruecksetzen, bissStarten,
    get biss() { return biss; },
    get stossFx() { return stossFx; },
    get anmarsch() { return anmarsch; },
  };
})();

window.Combat = Combat;
