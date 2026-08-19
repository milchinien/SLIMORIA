'use strict';

/* ---------------------------------------------------------------------------
 * Weichkörper in 3D
 *
 * Eine Icosphere aus Massepunkten:
 *   - Kantenfedern     halten die Haut zusammen
 *   - Formfedern       ziehen jeden Punkt auf seine Ruheform (Kuppel/Ellipsoid)
 *   - Volumendruck     bläht den Körper auf und erhält das Volumen
 *   - Schwerkraft      drückt ihn auf den Boden, wo er sich breitmacht
 *
 * Das Wabbeln, das Nachschwingen und der Aufprall-Klatscher entstehen daraus
 * von selbst — nichts davon ist animiert.
 * ------------------------------------------------------------------------- */

function createSoftBody(mesh, x, y, z, radius) {
  const n = mesh.vertexCount;
  const body = {
    mesh, n, radius,
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    frc: new Float32Array(n * 3),
    rest: new Float32Array(n * 3),
    base: new Float32Array(mesh.positions),   // Richtungen auf der Einheitskugel
    normals: new Float32Array(n * 3),
    weight: new Float32Array(n),
    cx: x, cy: y, cz: z,
    vx: 0, vy: 0, vz: 0,
    volume: 0, restVolume: 0,
    grounded: true, contacts: 0,
    /* Die Scherung der Ruheform lebt zwischen zwei Bildern weiter: sie folgt
     * der Beschleunigung mit Nachlauf, sonst schnappt die Silhouette um,
     * sobald der Antrieb umschaltet (GDD 01 §66 — die Verformung eilt der
     * Bewegung NACH). `vxPrev/vzPrev` liefern die Beschleunigung dafür. */
    scherL: 0, scherQ: 0,
    /* Die SCHLEPPACHSE: der Winkel, in den die Masse noch zeigt, während der
     * Kopf sich schon weitergedreht hat (GDD 01 §15). Sie folgt der
     * Blickrichtung mit Nachlauf und ist die einzige Quelle der Komma-Form —
     * siehe Abschnitt 9 in updateRestShape. Startwert 0, weil `createSlime`
     * die Blickrichtung ebenfalls auf 0 setzt: im ersten Bild steht die
     * Schleppe also exakt auf dem Kopf und es gibt keine Kehre. */
    schleppW: 0,
    /* Und wieviel Schwung überhaupt umzulenken ist. Ein nachlaufendes Tempo,
     * kein aktuelles: im Umkehrpunkt einer Kehrtwende steht der Körper für
     * zwei Zehntel fast still, seine Masse ist aber genau dort am weitesten
     * aus der Achse. Das aktuelle Tempo würde die Kehre ausgerechnet in ihrem
     * wichtigsten Bild abschalten; das nachlaufende hält sie. Umgekehrt
     * bleibt sie beim ersten Losfahren aus, wo der Kopf zwar dreht, aber noch
     * keine Masse unterwegs ist. */
    kehreMasse: 0,
    /* Die Längsscherung ist kein nachlaufender Wert, sondern eine MASSE auf
     * einer Feder — siehe updateRestShape. `scherLV` ist ihre
     * Geschwindigkeit; ohne sie könnte die Silhouette nur zum Ziel kriechen
     * und niemals darüber hinaus (GDD 01 §13). */
    scherLV: 0,
    /* Wie flach der Körper GERADE IST, gemessen an seiner eigenen Ruhehöhe:
     * 0 = Ruheform, 0.35 = harter Aufprall laut Dossier §3. Am Ende von
     * updateRestShape abgelesen; sie treibt den Aufprallteller. */
    stauchIst: 0,
    vxPrev: 0, vzPrev: 0,
    laengsZug: 0,               // wie weit der Körper über seine Sollform hinausgezogen ist
    /* Wie sehr der Körper gerade auf dem Boden steht (0…1, geglättet).
     * Der Gelfuß und der Bauch sind eine Antwort auf das eigene GEWICHT —
     * im freien Flug liegt keines mehr auf dem Körper, und dort verlangt das
     * Dossier ausdrücklich die sauberste Ellipse des ganzen Materials (§4).
     * `b.grounded` allein flackert von Schritt zu Schritt; geglättet wird es
     * zu einer Größe, der die Silhouette folgen darf. */
    bodenNah: 1,
    /* Die Erinnerung an die Walze (GDD 01 §20). `platt` fällt mit der
     * Aufprallfeder in wenigen Bildern auf null zurück, die Masse, die dabei
     * nach außen gedrückt wurde, liegt aber noch dort. Ohne diese Erinnerung
     * schnappte der Fußeinzug wieder an, WÄHREND die breitgewalzte Schicht
     * noch am Boden klebte — was übrigblieb, war eine dünne Platte mit
     * gerader Kante unter dem abhebenden Körper. `plattNach` steigt sofort
     * und fällt langsam; sie hält den Wulst so lange, wie die Masse braucht,
     * um wieder hereinzukommen. */
    plattNach: 0,
  };
  /* Der Startkörper ist keine Kugel, sondern schon die Ruheform: gleiches
   * Sollvolumen, gleiches Höhen-Breiten-Verhältnis. Als Kugel gestartet
   * meldete metrics().volumen im allerersten Bild einer Aufnahme 1.27 — ein
   * Bild, in dem noch kein Schritt gerechnet wurde und der Körper trotzdem
   * ein Viertel zu groß war. Halbe Achsen a, a·prall, a mit
   * a³·prall = radius³·squat. */
  const par = (typeof window !== 'undefined' && window.PARAMS) || null;
  const prall = par ? Math.max(0.25, par.prall) : 1;
  const a = radius * Math.cbrt((par ? par.squat : 1) / prall);
  for (let i = 0; i < n; i++) {
    body.pos[i * 3]     = x + body.base[i * 3] * a;
    body.pos[i * 3 + 1] = y + body.base[i * 3 + 1] * a * prall;
    body.pos[i * 3 + 2] = z + body.base[i * 3 + 2] * a;
  }
  return body;
}

function begrenze(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function bodyCentroid(b) {
  let cx = 0, cy = 0, cz = 0, vx = 0, vy = 0, vz = 0;
  const p = b.pos, v = b.vel;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    cx += p[k]; cy += p[k + 1]; cz += p[k + 2];
    vx += v[k]; vy += v[k + 1]; vz += v[k + 2];
  }
  b.cx = cx / b.n; b.cy = cy / b.n; b.cz = cz / b.n;
  b.vx = vx / b.n; b.vy = vy / b.n; b.vz = vz / b.n;
}

/* Angehobener Kosinus: eine weiche Beule um `mitte` mit halber Breite
 * `breite`, Maximum 1, an den Rändern samt Steigung sauber auf null.
 *
 * Beide Formmerkmale, die der Ruheform gefehlt haben, sind derselbe Bogen —
 * einmal über die Höhe gelegt (der Bauch), einmal über die Längsachse (die
 * Taille). Und beide brauchen dieselbe Eigenschaft: stetig differenzierbar.
 * Ein Profil mit Knick in der Vorgabe erzeugt eine Knickkante in der
 * Silhouette, und die Referenz kennt über die gesamte Oberkante keinen
 * einzigen Breitensprung über 4 % (DOSSIER §2). */
function bogen(x, mitte, breite) {
  const t = (x - mitte) / (breite > 1e-3 ? breite : 1e-3);
  if (t <= -1 || t >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/* Mittelwert eines solchen Bogens über die Längsachse der Kugel.
 *
 * Er wird gebraucht, weil jeder Querversatz, den die Ruheform aufprägt,
 * MITTELWERTFREI sein muss. Ein Versatz mit Mittelwert schiebt den Schwerpunkt
 * der Sollform zur Seite; die Formfedern ziehen den Körper dann dauerhaft
 * gegen eine Vorgabe, die neben ihm liegt. Die Summe der Federkräfte ist zwar
 * abgezogen (der Körper wandert also nicht davon), aber er stünde unter
 * ständiger Spannung, und Treffsicherheit geht vor Physik (GDD 01 §67).
 *
 * Auf einer gleichmäßig belegten Kugel ist der Vorwärtsanteil `af` gleich
 * verteilt über [-1, 1] — deshalb genügt eine Quadratur über diese Strecke.
 * 24 Stützstellen, weil der Bogen glatt ist und der Restfehler damit unter
 * einem Promille der Körperbreite bleibt. */
function bogenMittelwert(mitte, breite) {
  let s = 0;
  for (let i = 0; i < 24; i++) s += bogen(-1 + (i + 0.5) / 12, mitte, breite);
  return s / 24;
}

/* Weiche Sättigung: gibt für kleine `x` fast genau `x` zurück und nähert sich
 * für große asymptotisch `grenze`, ohne sie je zu erreichen. Ein harter
 * `Math.min` erzeugt statt dessen ein Plateau — und ein Plateau in einer
 * Bewegungsgröße steht auf dem Kontaktbogen als mehrere identische Bilder. */
function saettige(x, grenze) {
  return grenze * Math.tanh(x / grenze);
}

/* Kürzester Winkelabstand von `a` nach `b`, immer in (-π, π]. */
function winkelDiff(b, a) {
  const zwei = Math.PI * 2;
  return ((b - a + Math.PI) % zwei + zwei) % zwei - Math.PI;
}

/* Volumen der fertigen Ruheform, exakt am Netz gemessen und auf den Sollwert
 * zurückskaliert.
 *
 * Vorher stand hier für jeden Formregler eine eigene analytische Näherung
 * (mittelwertfreie Exponenten, ein Scheibenintegral für den Zipfel, ein
 * Kubikwurzelfaktor für das Sacken). Jede war für sich richtig und alle
 * zusammen trotzdem nicht: Volumen ist ein Produkt, die Restfehler
 * multiplizieren sich, und mit fünf neuen Reglern wären es fünf weitere
 * Näherungen geworden. Gemessen lag das Ruhevolumen dadurch je nach Zustand
 * zwischen 1.05 und 1.21 — sichtbare Größe kommt aber ausschließlich vom
 * Level (GDD 01 §29).
 *
 * Die Ruheform steht als Netz bereits da, also wird ihr Volumen einfach
 * gemessen und die Form auf den Sollwert zurückgeskaliert. Das ist exakt,
 * gilt für JEDE Kombination von Reglern und macht alle Einzelkorrekturen
 * überflüssig. Kosten: ein Durchlauf über die Dreiecke, dieselbe Ordnung wie
 * der Volumendruck weiter unten.
 *
 * Scherungen ändern das Volumen nicht (Determinante 1), der Faktor ist dort
 * also von selbst 1 — die neuen Scherregler können den Körper gar nicht
 * aufblähen. */
function ruheformNormieren(b, zielVolumen) {
  const idx = b.mesh.indices, r = b.rest;
  let vol = 0;
  for (let t3 = 0; t3 < idx.length; t3 += 3) {
    vol += signedTetraRest(r, idx[t3] * 3, idx[t3 + 1] * 3, idx[t3 + 2] * 3);
  }
  const k = Math.cbrt(zielVolumen / Math.max(vol, 1e-6));
  if (k > 0.999 && k < 1.001) return;
  for (let i = 0, m = b.n * 3; i < m; i++) r[i] *= k;
}

/* ---------------------------------------------------------------------------
 * Die Ruheform — die Sollform, der die Formfedern folgen.
 *
 * Bis hierher konnte diese Form fünf Dinge nicht, und alle neun Einzelurteile
 * aus der ersten Runde sind Folgen davon:
 *
 *   Der Vorwärtsanteil `af` ging nur QUADRIERT ein (`heck²`, `front²`), die
 *   Form war deshalb zwangsläufig spiegelgleich zur Basismitte. Ein
 *   bremsender Körper konnte seine Silhouette nicht SCHEREN, ein anrollender
 *   sie nicht nach hinten kippen, ein fressender keine überhängende
 *   Frontbeule bilden. Und die Verbreiterung hing an `max(0,-by)`, die
 *   breiteste Stelle lag damit immer am Bodenrand.
 *
 * Fünf Fähigkeiten kommen deshalb dazu; sie sind unten einzeln kommentiert:
 *
 *   1. SCHERUNG LÄNGS   `scherLaengs` — oben gegen die Aufstandsfläche versetzt
 *   2. TROPFEN          `tropfen`, `tropfenSenke` — vorn voll, hinten dünn
 *   3. BAUCHHÖHE        `bauchHoch` — wo die breiteste Stelle sitzt
 *   4. TAILLE           `taille`, `taillePos` — Einschnürung mit Kehle
 *   5. SCHERUNG QUER    `scherQuer` — Komma-Form in der Kehre
 *
 * Zwei weitere kamen danach dazu, weil dem RUHENDEN Körper etwas anderes
 * fehlte als dem fahrenden. Der Gutachter zum Stand: "keiner der beiden
 * Körper zeigt an der Bodenlinie eine echte Quetschung … A endet mit einer
 * erstaunlich sauberen, fast gestanzten Unterkante, und die Oberfläche
 * beider wirkt als harte, geschlossene Hülle statt als träge Masse."
 *
 *   6. GELFUSS          `fuss`, `fussHoch` — schmale Aufstandsfläche, der
 *                       Bauch hängt sichtbar darüber
 *   7. FLANKE           `flanke` — senkrechte Flanken statt Ellipsenrundung,
 *                       gemessen am Referenz-Zeilenprofil
 *
 * Und eine neunte, weil auch die acht davor eine Eigenschaft teilten: sie
 * alle skalieren oder scheren Achsen, und dabei bleibt die Längsachse in der
 * DRAUFSICHT immer gerade. Ein Richtungswechsel braucht eine krumme.
 *
 *   9. KEHRE            `kehreZug`, `kehreBogen` — das Heck steht auf der
 *                       alten Achse, die Mittellinie krümmt sich, zwischen
 *                       beiden liegt ein Hals: die Komma-Form aus §15
 *
 * Alles darüber (Zipfel, Keil, Linse, Aufprallkanal, Nachschwingen) bleibt
 * unverändert; die neuen Regler legen sich darüber.
 * ------------------------------------------------------------------------- */
function updateRestShape(b, P, t, fx, fz, speedRatio, slump, nachzug, vollgas,
                        schwing, klatsch, ax, az, anrollAnker, bremsAnteil, dt) {
  const R = P.radius;
  const sx = -fz, sz = fx;                        // Seitenachse

  /* Wieviel Bremsung liegt an (slime.js: `s.bremsen`, Tempoüberschuss über
   * den Zielwunsch). Alle anderen Lanes reichen den Wert nicht durch und
   * bekommen damit 0 — für sie ändert sich nichts. */
  const brems = begrenze(bremsAnteil || 0, 0, 1);

  /* --- 8. Anrollen: das Heck klebt, die Masse wälzt sich darüber ----------
   * `anroll` ist die Haftung der hinteren Aufstandsfläche (slime.js:
   * `heckAnker`): 1 in der Haltephase, 0 sobald der Körper wirklich fährt.
   * Solange sie steht, ist der Körper KEIN frei beschleunigender Klotz — er
   * ist an einer Kante festgehalten und wälzt sich über sie. Genau daran
   * hängen die beiden Merkmale, die dem Anrollen zuletzt gefehlt haben
   * (GDD 01 §13, §12): der Scheitel steht vor der Aufstandsfläche, und was
   * zurückbleibt, ist die hintere BASISkante — tief, nicht die Schulter. */
  const anroll = begrenze(anrollAnker || 0, 0, 1);

  /* --- 1./5. Die beiden Scherungen ---------------------------------------
   * Eine Scherung versetzt den oberen Teil gegen die Aufstandsfläche, ohne
   * irgendetwas anzuhängen: die Abbildung hat Determinante 1, das Volumen
   * steht exakt still, und weil der Versatz linear in `by` ist und die Kugel
   * punktsymmetrisch, bleibt auch der Schwerpunkt stehen — sie kann die
   * Zielgenauigkeit nicht verfälschen (GDD 01 §67).
   *
   * Getrieben wird sie von der BESCHLEUNIGUNG des Schwerpunkts, nicht vom
   * Tempo und nicht vom Antriebswunsch. Das ist die einzige ehrliche Quelle:
   * bei gleichförmiger Fahrt lehnt ein Körper nicht, beim Anfahren lehnt er
   * zurück, beim Bremsen nach vorn. Genau diese drei Fälle verlangt §13, und
   * genau diesen Unterschied hat der Gutachter an "bremsen" vermisst — dort
   * stand eine gespiegelte Glocke, wo eine geschorene Form hingehört.
   *
   * Vorzeichen: `aLang > 0` heißt beschleunigen, die Masse bleibt zurück,
   * der Scheitel wandert nach HINTEN (negativ). Bremsen kehrt das um.
   *
   * `scherRuhe` ist die ständige Schieflage. Das Dossier misst sie am
   * ruhenden Schleim: die Basis liegt rund 9 % der Körperbreite neben dem
   * Scheitel (§2, sr1-rest-single-pink-silhouette) — die Ruheform ist im
   * Referenzmaterial NICHT senkrecht.
   *
   * Dass die Scherung der Bewegung NACHhinkt, ist keine Glättung aus
   * Bequemlichkeit: eine Verformung, die ihr ohne Verzug folgt, liest sich
   * als gesetzte Pose (§66). Die Querscherung erledigt das mit `scherFolge`
   * als Nachlauf; die Längsscherung mit einer Feder, siehe weiter unten. */
  const bez = Math.max(P.scherBezug, 1e-3);
  const aLang = (ax * fx + az * fz) / bez;
  const aQuer = (ax * sx + az * sz) / bez;
  /* Das Anrollen kehrt die Scherung um, und das ist kein Sonderfall, sondern
   * ein anderer Lastfall. Ein frei beschleunigender Körper lehnt zurück, weil
   * seine Masse dem Antrieb nachhängt — das ist `scherLaengs`. Ein Körper,
   * dessen hintere Kante am Boden KLEBT, kann das nicht: er hat einen
   * Drehpunkt am Heck und wälzt sich darüber nach vorn. Das ist derselbe
   * Vorgang, den slime.js mit `anrollWalken` als Kraft ausübt; ohne diesen
   * Term arbeitete die Sollform dagegen und zog den Scheitel nach hinten,
   * während die Kraft ihn nach vorn schob. Übrig blieb eine Kegelspitze
   * schräg hinten-oben statt einer nach vorn gekippten Masse.
   *
   * Deshalb wird der Beschleunigungsanteil mit `1 - anroll` ausgeblendet
   * statt überlagert: beides gleichzeitig hieße, den Körper an zwei Enden
   * gegeneinander zu ziehen, und sichtbar bliebe keines von beiden. */
  /* Die Dauervollgas-Schleppe (§14, vierte Stufe) liegt bewusst NEBEN dem
   * Beschleunigungsterm und nicht in ihm: bei konstantem Höchsttempo ist die
   * Beschleunigung null, der Körper lehnt also aus Trägheit nicht mehr — und
   * genau dort verlangt §14 trotzdem ein nachgezogenes Heck. Getragen wird es
   * von einem anderen Lastfall: die Aufstandsfläche schleift, die Masse
   * darüber trägt ihren Schwung weiter. Der Körper kippt also über seine
   * VORDERKANTE, und was am Boden hängenbleibt, ist die hintere Kante —
   * dieselbe Vorzeichenlage wie beim Anrollen, nur ohne Anker.
   *
   * Die Richtung ist am Material abgelesen, nicht hergeleitet: in der
   * RUN-Zeile von craftpix-slime-blue-idle-walk-run-attack-jump-8frames liegt
   * der Scheitel über der vorderen Hälfte und nach hinten läuft eine lange,
   * flache Schleppe am Boden aus. Der umgekehrte Aufbau (Scheitel hinten,
   * Lippe vorn) wurde gebaut und gemessen — er las sich auf dem Kontaktbogen
   * als Keil, der in die falsche Richtung zeigt.
   *
   * Wie der Beschleunigungsterm blendet `1 - anroll` ihn aus, solange das
   * Heck noch klebt: dort macht `anrollScher` dieselbe Arbeit mit eigenem,
   * viel größerem Wert. */
  /* Die Dauervollgas-Schleppe fällt beim Bremsen weg, und das ist kein
   * Feinschliff, sondern derselbe Lastfall rückwärts gelesen: sie entsteht,
   * weil die Aufstandsfläche schleift, während die Masse darüber ihren
   * Schwung weiterträgt. Genau das hört auf, sobald gebremst wird — dort
   * hält der Fuß, und die Masse läuft auf ihn auf.
   *
   * Gemessen war das der Grund, warum sich Fahrt und Halt in der Silhouette
   * kaum unterschieden: die Schieflage stand bei Dauerfahrt schon auf 0.79
   * Radien, die Bremsung setzte nur 0.16 obendrauf, und der Kontaktbogen
   * zeigte in beiden Zuständen dieselbe Neigung. Erst wenn die Fahrtlast
   * weicht, wird die Bremslast als eigene lesbar. */
  const zielL = P.scherRuhe
              - P.scherLaengs * begrenze(aLang, -1, 1) * (1 - anroll)
              + P.vollgasScher * vollgas * (1 - anroll) * (1 - brems)
              + P.anrollScher * anroll;
  const zielQ =            -  P.scherQuer   * begrenze(aQuer, -1, 1);
  const folge = begrenze(dt * P.scherFolge, 0, 1);
  b.scherQ += (zielQ - b.scherQ) * folge;
  /* --- Die Längsscherung als PENDEL, nicht als Nachlauf -------------------
   * Das ist die eine Änderung, an der das Bremsen hing (GDD 01 §13:
   * "der Körper darf kurz über die Zielbewegung HINAUSSCHWINGEN").
   *
   * Als Tiefpass geschrieben — `scherL += (ziel - scherL) * dt * folge` —
   * kann dieser Wert sein Ziel grundsätzlich nicht überschreiten. Er kriecht
   * monoton darauf zu, egal wie hart gebremst wurde. Gemessen war das
   * genau der Befund: die Schieflage stieg beim Bremsen auf 0.88 Radien und
   * ging danach monoton auf die Ruhelage 0.09 zurück, ohne ein einziges Mal
   * durch sie hindurchzugehen. Auf dem Kontaktbogen standen deshalb sieben
   * Bilder nach dem Halt, die alle gleich aussahen — "es ist eine Flugbahn,
   * kein Halt", "keine abklingende Amplitude".
   *
   * Ein lehnender Körper IST aber ein Pendel: die Bremskraft hält ihn
   * schräg, und wenn sie wegfällt, trägt ihn seine eigene Trägheit über die
   * Senkrechte hinaus nach hinten, bevor er zurückkommt. Also steht hier
   * eine gedämpfte Feder zweiter Ordnung. Der Gegenausschlag entsteht daraus
   * von selbst und ist nirgends gesetzt (GDD 01 §66); seine Hüllkurve ist
   * dieselbe geometrische Reihe, die bounce-energy-decay-law für jeden
   * Aufprall zeigt (e² je Halbschwingung).
   *
   * Die Scherung ändert weder Volumen (Determinante 1) noch Schwerpunkt
   * (linear in `by`, Kugel punktsymmetrisch) — das Pendel kann die
   * Zielgenauigkeit nicht verfälschen (GDD 01 §67). */
  /* Solange die Bremskraft ANLIEGT, coastet das Pendel nicht — es wird
   * gehalten. Das ist der Unterschied zwischen einem Körper, den etwas
   * schräg DRÜCKT, und einem, der frei schwingt, und ohne ihn stimmte die
   * Reihenfolge aus §13 nicht mehr: gemessen stand die Schieflage beim
   * Anbremsen noch auf dem Wert, den sie aus dem Anfahrtransienten geerbt
   * hatte (0.74 Radien bei einem Bremsziel von 0.39), und dieser Erbwert
   * überlebte die ganze Bremsung. Der Körper lag dabei schon längs gestaucht
   * und hoch — und in dieser kurzen Silhouette wurde aus derselben Schieflage
   * ein umgefallener Keil: gemessen 57 % Versatz gegen die Aufstandsfläche
   * bei einer Flächenfüllung von 0.55, wo das Dossier 0.70…0.80 verlangt.
   * Der Scheitel stand nicht mehr über der Masse, er stand daneben.
   *
   * Mit der Zusatzdämpfung folgt die Schieflage der Bremskraft in rund
   * hundert Millisekunden und steht damit auf dem Wert, den die Verzögerung
   * hergibt — nicht mehr und nicht weniger. Fällt die Bremse weg, steht die
   * Dämpfung wieder auf `scherDaempf` und das Pendel schwingt frei über die
   * Ruhelage hinaus: erst DANN darf es das (§13, §15 sortieren das
   * Nachschwingen ausdrücklich HINTER das Abbremsen). */
  const zeta = P.scherDaempf + Math.max(P.bremsScherHalt, 0) * brems;
  const w = Math.max(P.scherHz, 0.05) * Math.PI * 2;
  b.scherLV += (w * w * (zielL - b.scherL) - 2 * zeta * w * b.scherLV) * dt;
  b.scherL += b.scherLV * dt;
  const scherL = b.scherL * R;
  const scherQ = b.scherQ * R;

  /* --- 9. Die KEHRE: Komma statt Spindel (GDD 01 §15) ---------------------
   * Der Befund, an dem dieses Teil zuletzt gescheitert ist, lautete wörtlich:
   * "A dagegen ist ein einziger Tropfen mit einer einzigen Achse … Damit
   * liest A als reine Streckung in eine Richtung, nicht als Richtungswechsel:
   * es fehlt jede Querablage der Masse." Verlangt war statt dessen, "das
   * hintere Ende weiter in die alte Richtung stehen zu lassen und die
   * Vorderpartie seitlich davon wegzuschwenken".
   *
   * Keiner der vorhandenen Regler kann das. `scherQuer` versetzt den OBEREN
   * Teil gegen die Aufstandsfläche — eine Schräglage über die Höhe, in der
   * Draufsicht unsichtbar. Alles andere skaliert Achsen, und eine
   * Achsenskalierung hat immer genau eine gerade Längsachse. Eine Kehre
   * braucht eine KRUMME.
   *
   * Die Quelle ist keine Verdrahtung und kein Kanal, sondern eine zweite
   * Achse im Körper: `b.schleppW` folgt der Blickrichtung mit Nachlauf. Dreht
   * der Kopf, bleibt sie zurück — genau um den Winkel, den die Masse braucht,
   * um nachzukommen. Steht der Kopf still, holt sie ihn in rund einer Zehntel
   * Sekunde ein und die Kehre verschwindet von selbst; bei geradeaus
   * gemessenen 0.25 rad/s Restdrehung bleibt sie unter 3 % ihres Vollwerts.
   * Kein Sonderfall, keine Zustandsmaschine, kein Szenariowissen.
   *
   * Gemessen wird die Zielform an cuphead-goopy-lunge-mass-trailing-behind.
   * Die blaue Silhouette dort, in zwanzig Bändern längs ihrer Hauptachse
   * ausgemessen (Dicken als Anteil der größten Dicke, vom Schleppende zum
   * Kopf):
   *
   *   Dicke  0.19 0.22 0.19 0.15 0.11 0.11 0.36 0.68 0.85 0.95 0.99 0.98
   *          1.00 0.95 0.63 0.19
   *   Mitte  0.16 0.07 -.03 -.10 -.14 -.15 -.14 0.02 0.02 0.03 0.04 0.04
   *          0.06 0.07 0.01 -.02
   *
   * Zwei Zahlen stehen darin, und beide fehlten uns:
   *
   *   Die Mittellinie ist NICHT gerade. Sie wandert über 0.31 der größten
   *   Dicke quer — bei einer Gesamtlänge von 2.47 Dicken also 12.5 % der
   *   Körperlänge. Und ihr Ausschlag sitzt nicht in der Mitte, sondern bei
   *   0.22…0.41 der Länge vom Schleppende: im HALS. Das ist der Bogen unten.
   *
   *   Zwischen Kopf und Schleppe steht eine Kehle von 0.11…0.19 der
   *   Kopfdicke. Ohne sie wäre auch eine krumme Achse nur ein gebogener
   *   Keil; erst die Kehle macht daraus zwei Teile in zwei Bewegungsphasen.
   *   Sie kommt bei `taille` dazu.
   *
   * Beide Anteile sind mittelwertfrei (siehe `bogenMittelwert`), verschieben
   * den Schwerpunkt der Sollform also nicht — die Kehre kann die
   * Zielgenauigkeit nicht verfälschen (GDD 01 §67). Und weil `heck` und der
   * Bogen nur Querschnitt VERSETZEN und keinen erzeugen, bleibt auch das
   * Volumen unberührt; die Normierung am Ende zieht den Rest gerade. */
  const kopfW = Math.atan2(fz, fx);
  b.schleppW += winkelDiff(kopfW, b.schleppW) * begrenze(dt * P.kehreFolge, 0, 1);
  /* Gedeckelt bei knapp einem rechten Winkel. Darüber hinaus fällt der Sinus
   * wieder ab und kehrt jenseits von 180° sogar sein Vorzeichen um — die
   * Kehre würde mitten in der schnellsten Drehung zurückschnappen und bei
   * einer vollen Kehrtwende auf die falsche Seite kippen. */
  /* Der Schwung, den es umzulenken gibt — nachlaufend gemessen, siehe
   * `kehreMasse` in createSoftBody. Gesättigt, weil schon ein Drittel des
   * Höchsttempos genug Masse ist, um eine volle Kehre zu tragen. */
  b.kehreMasse += (speedRatio - b.kehreMasse) * begrenze(dt * P.kehreMasseFolge, 0, 1);
  const kehrMasse = begrenze(b.kehreMasse * 3, 0, 1);
  const kehre = kehrMasse
    * Math.sin(begrenze(winkelDiff(b.schleppW, kopfW), -1.35, 1.35));
  // Vorzeichen: liegt die Schleppachse auf der +s-Seite (kehre > 0), gehört
  // das Heck auf die Gegenseite — es zeigt dorthin, wo der Körper HERKAM.
  const kehrS = -kehre * R;
  const kehrOrt = begrenze(P.kehreOrt, -0.9, 0.9);
  const kehrBreite = Math.max(0.2, P.kehreBreite);
  const kehrMittel = bogenMittelwert(kehrOrt, kehrBreite);
  /* Und die Schleppe sackt ab. Ohne diesen Anteil stand sie als waagerechter
   * Dorn auf halber Körperhöhe in der Luft — im Bild ein Schnabel, keine
   * Masse. Die Referenz zeigt das Gegenteil: bei
   * cuphead-goopy-lunge-mass-trailing-behind liegt die Spitze des
   * nachgeschleppten Fortsatzes auf derselben Bildzeile wie der tiefste
   * Punkt des vorderen Ballens. Was nicht mehr getragen wird, fällt.
   * Mittelwertfrei über `heck² - 1/6`, damit der Schwerpunkt stehen bleibt. */
  const kehrSenke = P.kehreSenke * Math.abs(kehre) * R;
  /* Der Knoten am Schleppende — siehe die Herleitung bei `keule` unten im
   * Punktdurchlauf. Er hängt am selben Kehrmaß wie die Schleppe selbst. */
  /* Die drei Kanäle, die die Kehre neu bekommen hat — Knoten, Bodenschleppe
   * und Andruck —, hängen nicht am rohen `kehre`, sondern an einem Wert mit
   * TOTGANG. Der Grund ist gemessen: auch das Ausrichten beim Losfahren
   * dreht den Kopf, und die Schleppachse hinkt dabei genauso nach wie in
   * einer Kehrtwende, obwohl es nichts umzulenken gibt. Ohne Totgang drückte
   * dieser Anfahrtransient den geradeaus beschleunigenden Körper mit
   * (`vollgas`-Lauf, 600 ms: squash 1.106 statt 0.990) — eine Szene, die mit
   * der Kehre nichts zu tun hat. Die drei alten Kanäle sind davon nicht
   * betroffen; sie sind seit Runde 2 gegen ihre Szenen eingestellt. */
  const kehrStark = begrenze((Math.abs(kehre) - begrenze(P.kehreTotgang, 0, 0.9))
                             / (1 - begrenze(P.kehreTotgang, 0, 0.9)), 0, 1);
  const keuleStark = P.kehreKeule * kehrStark;
  const keuleBreite = Math.max(0.1, P.kehreKeuleBreite);

  /* Und die Kehre DRÜCKT (GDD 01 §15 "muss sichtbar Masse besitzen").
   *
   * Gemessen war der Umkehrpunkt der Kehrtwende das höchste Bild des ganzen
   * Laufs: Silhouettenhöhe 2.4…2.7 Radien gegen 1.72 im Stand, Schwerpunkt
   * auf 1.0…1.4 statt 0.57, Aufstandsfläche ein Zapfen. Ein Körper, der
   * seine eigene Masse umlenken muss, richtet sich aber nicht auf — er wird
   * gegen den Boden geschmiert. Genau daran erkennt man in jeder Referenz
   * die Kurve: die Masse liegt außen unten, nicht oben.
   *
   * Als Kraft ist das nicht zu haben. Gegen Formfeder (shape 130) und
   * Innendruck kommt ein gerichteter Impuls dieser Größe nicht an —
   * gemessen war der Unterschied zwischen `wendeFlieh` 22 und 0 über den
   * ganzen Lauf kleiner als 0.05 Radien in jeder Achse. Was die Silhouette
   * bewegt, ist die VORGABE; die Kräfte daneben sorgen dafür, dass die
   * Masse in sie hineinfällt statt hineingezogen zu werden (§66).
   *
   * Volumenexakt nach demselben Muster wie der Aufprallkanal: Höhe · k,
   * beide Waagerechten · 1/√k. */
  const kehrFlach = Math.max(0.55, 1 - P.kehreFlach * kehrStark);
  const kehrQuer = Math.pow(kehrFlach, -0.5);

  /* Der Aufprallkanal (GDD 01 §20). Positiv = platt gedrückt, negativ = im
   * Flug längs gezogen. Er greift aus demselben Grund an der Ruheform an wie
   * das Nachschwingen weiter unten: eine Kraft von außen kämpft gegen die
   * Formfeder, eine geänderte Vorgabe nimmt sie mit.
   *
   * Beim Einschlag ist das nicht nur eine Frage der Stärke, sondern der
   * Richtung: gegen eine runde Ruheform halten Haut und Innendruck die
   * Breite FEST, während die Bodenfeder die Höhe wegnimmt. Gemessen fiel das
   * Volumen dabei auf 0.67 — ein Drittel der Masse war für zwei Bilder weg,
   * und die Kontur lief gegen die Bodenebene statt zur Seite.
   *
   * Zwei Dinge waren daran falsch. Erstens war die Vorgabe mit `klatschMin`
   * 0.78 viel weniger flach als das, was die Bodenfeder tatsächlich erzwungen
   * hat (gemessener Squash 0.52): der Körper wurde gequetscht, statt zu
   * weichen. Das Referenzdossier nennt für den harten Aufprall 62–68 % der
   * Ruhehöhe — dort steht die Vorgabe jetzt, und die Bodenfeder findet eine
   * Form vor, die schon da ist, wo sie hinwill.
   *
   * Zweitens war die Verbreiterung exakt volumenneutral (Höhe · k, Querachsen
   * · 1/√k). Volumenneutral ist aber nur die Buchhaltung; was man sehen soll,
   * ist Verdrängung. `klatschBreit` > 1 treibt die Querachsen weiter nach
   * außen, als die Höhe hergibt — die Gesamtnormierung unten holt das Volumen
   * zurück, indem sie den Körper insgesamt etwas kleiner macht. Netto bleibt:
   * flacher UND breiter, bei exakt stehendem Volumen. */
  const kl = klatsch || 0;
  /* Der Deckel nach oben ist WEICH, und das ist keine Kosmetik. Als harter
   * `Math.min` geschrieben stand die Rückfederung gemessen über vier
   * aufeinanderfolgende Bilder auf exakt derselben Höhe (squash 1.27, 1.29,
   * 1.28, 1.28) — auf dem Kontaktbogen ein Standbild mitten in der Bewegung,
   * und §20 verlangt dort ausdrücklich, dass der Körper sich STABILISIERT.
   * Die Sättigung nähert sich der Grenze an, erreicht sie aber nie: die Kurve
   * bleibt streng monoton und jedes Bild unterscheidet sich vom vorigen.
   *
   * Der Grenzwert selbst steht am Dossier: freier Flug 112–120 % der
   * Ruhehöhe (§4, Kriterium 9). Vorher lief die Rückfederung auf 131 % —
   * höher als jeder gemessene Flugzustand im gesamten Referenzmaterial. */
  const roh = 1 - kl;
  const klHoch = roh >= 1
    ? 1 + saettige(roh - 1, Math.max(P.klatschMax - 1, 1e-3))
    : 1 - saettige(1 - roh, Math.max(1 - P.klatschMin, 1e-3));
  /* Die Übertreibung gilt nur für das FLACHWERDEN. Im Flug ist der Körper
   * gestreckt, und dort verlangt das Dossier ausdrücklich die sauberste
   * Ellipse des ganzen Materials (§4) — eine zusätzlich eingeschnürte
   * Querachse wäre dort eine Nadel, kein Schleim. */
  const klQuer = Math.pow(klHoch, -0.5 * (klHoch < 1 ? P.klatschBreit : 1));
  // 0 = unverformt, 1 = so flach wie erlaubt. Treibt Wulst und Schürze.
  const platt = begrenze((1 - klHoch) / Math.max(1 - P.klatschMin, 1e-3), 0, 1);

  /* Das Nachschwingen nach dem Bremsen (GDD 01 §13) greift hier an und nicht
   * als Kraft von außen — und das ist keine Geschmacksfrage.
   *
   * Ein Impuls gegen die Ruheform kämpft gegen die Formfeder, und die zieht
   * bei nennenswerter Auslenkung mit rund 490 gegen eine Anregung von 15:
   * gemessen kam ein Ausschlag von 5 % heraus, wo 30 % nötig sind. Der Körper
   * schwingt nur dann wirklich, wenn das ZIEL schwingt, dem er folgt.
   *
   * `schwing` ist bereits vorzeichenbehaftet: negativ = längs gestaucht.
   *
   * Der Ausgleich wandert bewusst fast vollständig in die WAAGERECHTE
   * Querachse und nur zu einem Viertel in die Höhe. Der erste Versuch hat den
   * Ausgleich gleichmäßig auf beide Querachsen gelegt — rechnerisch ebenso
   * volumenerhaltend, gemessen aber ein Pulsieren des Körpervolumens um 25 %.
   * Der Grund steht nicht in der Formel, sondern am Boden: die senkrechte
   * Achse ist durch Bodenfeder, Schwerkraft und Haftung gefesselt und kann
   * einer schnellen Vorgabe nicht folgen, während die waagerechte frei ist. */
  const sw = Math.max(0.5, 1 + (schwing || 0));
  const swQuer = Math.pow(sw, -0.75);
  const swHoch = Math.pow(sw, -0.25);
  /* Die Tempostreckung hängt am aktuellen Tempo — beim Bremsen ist noch
   * Tempo da, der Körper wurde also weiter gezogen, während er auflaufen
   * sollte. Was ihn streckt, ist aber nicht das Tempo, sondern der Schub
   * gegen die Trägheit, und der zeigt beim Bremsen in die Gegenrichtung.
   * `bremsKurz` nimmt sie deshalb zurück (siehe tuning.js). */
  const streckTempo = speedRatio * (1 - begrenze(P.bremsKurz, 0, 1) * brems);
  const stretch = 1 + (P.stretch + P.vollgasStreck * vollgas) * streckTempo;
  /* Wohin geht die Masse, die vorn und hinten dazukommt? Bisher gleichmäßig
   * in beide Querachsen (`1/√stretch`), und gemessen war das der Grund, warum
   * der fahrende Körper zum Rochen wurde: bei Höchsttempo stand die
   * Silhouette bei Länge:Höhe = 1 : 0.47. Im gesamten Referenzmaterial gibt
   * es diesen Wert nur bei der EXTREMSTEN Stauchung (1 : 0.45,
   * sr2-stretch-vortex-three-states) — und dort ist es ein Aufprall, kein
   * Fahren. Der Lunge-Referenz (cuphead-goopy-lunge-mass-trailing-behind)
   * misst am vorderen Ballen 1 : 1.02: der Ball behält seine volle Höhe, und
   * ALLES, was nach Tempo aussieht, hängt als Schleppe hinten dran.
   *
   * `streckSchmal` verschiebt den Ausgleich deshalb von der Höhe in die
   * waagerechte Querachse: ein schneller Schleim wird länger und SCHMALER,
   * nicht flacher. Exakt volumenneutral, weil die Exponenten sich zu −1
   * summieren (stretch · stretch^-(1+k)/2 · stretch^-(1-k)/2 = 1). */
  const kSchmal = begrenze(P.streckSchmal, 0, 0.9);
  const shrinkQuer = Math.pow(stretch, -0.5 * (1 + kSchmal));
  const shrinkHoch = Math.pow(stretch, -0.5 * (1 - kSchmal));

  /* --- Die Bremsstauchung (GDD 01 §13, §15 "abbremsen → verformen") -------
   * Die Front steht, das Heck läuft auf: der gebremste Körper wird LÄNGS
   * kürzer und stellt sich dabei auf. Das ist der Lastfall, der dem Bremsen
   * zuletzt gefehlt hat — ohne ihn blieb der Körper genau in dem Bild, in
   * dem er am kürzesten sein soll, in voller Fahrtstreckung stehen.
   *
   * Bewusst als VORGABE und nicht als Kraft: gegen die Formfeder kommt eine
   * Kraft dieser Größe nicht an (dieselbe Rechnung wie beim Nachschwingen
   * weiter oben). Der Bremsschub in slime.js greift daneben an und sorgt
   * dafür, dass die Masse in die kürzere Sollform hineinFÄLLT, statt in sie
   * hineingezogen zu werden (§66).
   *
   * Exakt volumenneutral: die Exponenten summieren sich zu null. Der
   * Ausgleich geht nur zu `bremsHoch` in die Senkrechte, weil die durch
   * Bodenfeder, Schwerkraft und Haftung gefesselt ist; der Rest geht in die
   * freie waagerechte Querachse. */
  const bremsHoch = begrenze(P.bremsHoch, 0, 1);
  const bs = Math.max(0.55, 1 - Math.max(P.bremsStauch, 0) * brems);
  const bsHoch = Math.pow(bs, -bremsHoch);
  const bsQuer = Math.pow(bs, -(1 - bremsHoch));

  /* Tropfen statt Ellipsoid (GDD 01 §12, Cuphead-Referenz).
   * Ein symmetrisch gestrecktes Ellipsoid liest sich als "Kugel mit
   * Bewegungsunschärfe" — im Referenzbild bleibt die vordere Masse dagegen
   * ein kompakter Ball und ALLES, was nach Tempo aussieht, hängt hinten dran.
   * Deshalb wirkt die Streckung hier ausschließlich auf die hintere
   * Halbkugel, bei Vollgas zusätzlich eingerundet statt zugespitzt (sonst
   * steht dort ein Wurfpfeil und die Blob-Identität ist weg, GDD 01 §5). */
  /* Beim Anrollen tritt die spitze Heckverlängerung zurück. Sie hängt an
   * `h2` und damit am größten Umfang, also an der halben Höhe — bei einem
   * Körper, der noch steht, ragt dort ein Dorn quer in die Luft, und im
   * Kontaktbogen liest sich das als Kegel, nicht als Masse. Was das Anrollen
   * erzählt, ist statt dessen die Scherung: Scheitel nach vorn, Basiskante
   * zurück. Der Dorn kommt von selbst wieder, sobald der Anker reißt und
   * echtes Tempo da ist. */
  /* In der Kehre trägt den Zipfel nicht mehr das Tempo, sondern die Kehre
   * selbst — und das ist der Kern des Befunds. `nachzug` hängt am aktuellen
   * Tempo, und im Umkehrpunkt einer Kehrtwende steht der Körper gemessen bei
   * 0.4 von 7 m/s: der Zipfel war dort auf null, obwohl genau dort das Heck
   * "weiter in die alte Richtung stehen bleiben" soll. Ohne diesen Anteil
   * legt die Kehre die Schleppe zwar quer, aber es gibt keine Schleppe, die
   * sie querlegen könnte. */
  const kehrNachzug = Math.min(1.35,
    nachzug + P.kehreZipfel * Math.abs(kehre));
  const zipfel = P.zipfel * kehrNachzug * (1 - P.vollgasKurz * vollgas)
               * (1 - begrenze(P.anrollRund, 0, 1) * anroll);
  /* Die VERJÜNGUNG bleibt beim Tempo. Läuft sie mit, wird aus der Schleppe
   * in der Kehre eine Nadel: der Zipfel wird gleichzeitig länger und dünner,
   * und was auf dem Kontaktbogen steht, ist ein Schnabel, keine Masse. Lang
   * ohne extra dünn ist die Referenz — dort läuft die Schleppe über ein
   * Drittel der Länge auf gleichbleibend rund 0.15 der Kopfdicke aus. */
  const schlank = P.zipfelSchlank * nachzug * (1 - P.vollgasRund * vollgas);
  // Zusätzliche Heckverlängerung, die ausschließlich unten sitzt — siehe die
  // Erklärung bei `laenger` weiter unten. `heckSenke` zieht dieselbe Partie
  // zusätzlich nach UNTEN: der Schleppzipfel schleift, er steht nicht ab.
  const schleppTief = P.zipfelTief * anroll * Math.min(1.2, nachzug);
  const heckSenke = P.zipfelSenke * schleppTief * R;
  /* Und in der Kehre dasselbe, aus demselben Grund (GDD 01 §15).
   *
   * Die Kehrschleppe hing über `kehreZipfel` auf JEDER Höhe gleich weit
   * hinaus. Ihr Maximum landete damit am größten Umfang, also auf halber
   * Körperhöhe, und im Bild stand ein waagerechter Dorn in der Luft — bei
   * cuphead-goopy-lunge-mass-trailing-behind liegt die Spitze des
   * nachgeschleppten Fortsatzes dagegen auf derselben Bildzeile wie der
   * TIEFSTE Punkt des vorderen Ballens.
   *
   * Der naheliegende Weg — die Schleppe über `kehreSenke` einfach tiefer
   * hängen — ist der falsche: er schiebt Sollform unter die Bodenebene, und
   * die Bodenfeder (groundK 10000) drückt sie mitsamt dem Körper wieder
   * heraus. Gemessen hob der Schleim bei `kehreSenke` 0.62 in der Kehre ab
   * (`grounded` false, Schwerpunkt 0.92 statt 0.57).
   *
   * Diese Verlängerung sitzt statt dessen ausschließlich auf der UNTEREN
   * Halbkugel (`heckTief`) — dieselbe Bauart wie die Anrollschleppe eine
   * Zeile darüber. Was am Boden schleift, kommt von unten; was oben ist,
   * bleibt kurz. Die Bodenfeder walzt daraus eine flache, nachgezogene
   * Schürze, statt einen Körper hochzuwerfen. */
  const kehrTief = P.kehreTief * kehrStark;
  const MITTEL_H2 = 1 / 6;
  const vorlang = P.frontLang * vollgas;

  /* Der Keil: die Ruheform wird längs geschert — die Front sinkt, das Heck
   * steigt. Sichtbar wird daraus erst durch den Boden das, was §14 verlangt:
   * die Nase wird in die Aufstandsfläche gedrückt, das Heck bleibt oben. */
  const keil = P.keilAb * vollgas * R;

  /* --- 2. Tropfen: vorne und hinten sind NICHT dasselbe -------------------
   * `zipfel` und `linse` unten arbeiten mit `heck²` bzw. `front²` und sind
   * damit beide GERADE Funktionen der Fahrtachse — sie können die Front
   * verdicken oder das Heck verlängern, aber die Grundform bleibt eine um
   * die Basismitte gespiegelte Spindel. Das ist genau das, was an
   * "richtungswechsel" als rotationssymmetrische Spindel und an
   * "fressanlauf" als konstante Breite ohne überhängende Frontbeule
   * aufgefallen ist.
   *
   * `tropfen` ist deshalb UNGERADE in `af`: der Querschnitt wächst linear
   * nach vorn und schrumpft nach hinten. Aus dem Ei wird ein Tropfen — vorn
   * ein praller Ballen, hinten ein auslaufender Schwanz. Das Referenzbild
   * dazu ist cuphead-goopy-lunge-mass-trailing-behind: die Masse hängt
   * sichtbar hinterher, sie ist nicht symmetrisch verteilt.
   *
   * `tropfenSenke` kippt zusätzlich die Mittellinie: die Front steigt, das
   * Heck läuft flach aus. Auch das ist eine Scherung, also volumenexakt. */
  const tropfen = P.tropfen + P.tropfenTempo * Math.min(1.2, nachzug);
  const senke = P.tropfenSenke * R;

  /* --- 4. Die Taille -----------------------------------------------------
   * Am Rückschnapp (§30/§31) stand "ein durchgehend konvexer Klumpen ohne
   * jede Taille". Eine Einschnürung kann aus keinem der vorhandenen Regler
   * entstehen: alle skalieren Achsen, und eine Achsenskalierung bleibt
   * konvex. Es braucht ein Profil, das auf einem STÜCK der Längsachse
   * Querschnitt wegnimmt und daneben nicht — dann entstehen die konkaven
   * Kehlen, die einen überdehnten Körper von einem gestreckten unterscheiden.
   *
   * `taille` ist der ständige Anteil, `tailleZug` der Anteil, der sich
   * öffnet, wenn der Körper ÜBER SEINE EIGENE SOLLFORM HINAUS längs gezogen
   * wird — gemessen am Ende dieser Funktion, nicht aus einem Kanal abgelesen.
   *
   * Das ist Absicht: die Überdehnung ist genau der Zustand, den §30 mit "wie
   * überdehnt" beschreibt, und sie entsteht in jeder Lane anders. Beim
   * Rückschnapp zieht `eat.js` den Körper zum Gegner, beim Biss `combat.js`,
   * beim Bremsen die eigene Trägheit. Ein Kanal pro Lane hätte drei
   * Verdrahtungen gebraucht und wäre bei der vierten wieder vergessen worden;
   * die Messung am eigenen Körper gilt für alle.
   *
   * Nach oben gedeckelt, damit die Kehle nie durchtrennt: die Blob-Identität
   * geht niemals verloren (GDD 01 §5). */
  /* Beim Anrollen kommt eine dritte Quelle dazu, und sie ist der Grund, warum
   * die Referenz als "Kopf plus Schleppe" liest und nicht als Flosse: bei
   * cuphead-goopy-lunge-mass-trailing-behind sitzt zwischen dem vorderen
   * Ballen und dem nachgezogenen Fortsatz eine Kehle von nur rund einem
   * Fünftel des Vorderdurchmessers. Ohne sie ist der Körper ein einziger
   * durchgehender Keil — die Masse ist dann zwar hinten, aber man sieht ihr
   * nicht an, dass sie NACHGEZOGEN wird. */
  /* Und in der Kehre aus demselben Grund: der Hals ist das, was Kopf und
   * Schleppe überhaupt erst als ZWEI Teile lesbar macht. Ohne ihn bleibt die
   * krumme Achse ein gebogener Keil, und das Urteil zu diesem Teil hat genau
   * die fehlende Trennung benannt. Die Referenz misst dort 0.11…0.19 der
   * Kopfdicke; so tief geht dieser Anteil bewusst nicht — mit dem Tropfen
   * zusammen landet der Hals bei rund einem Drittel, und darunter wäre die
   * Blob-Identität die Frage eines einzigen Bildes (GDD 01 §5). */
  const taille = Math.min(0.85, P.taille + P.tailleZug * b.laengsZug
                              + P.anrollTaille * anroll
                              + P.kehreTaille * Math.abs(kehre));

  /* Die Oberflächenwelle darf im Stand nicht einschlafen — sonst steht da
   * ein Objekt mit Schleim-Textur (GDD 01 §66). */
  const waveAmp = P.wobble * (0.62 + 0.38 * speedRatio);

  /* Prallheit: der Hebel zwischen Höhe und Breite, bei exakt stehendem
   * Volumen (Höhe · p, beide Querachsen · 1/√p).
   *
   * Er ist von `squat` getrennt, weil die beiden verschiedene Fragen
   * beantworten. `squat` zieht die Sollform hoch UND ihr Sollvolumen mit —
   * die Normierung unten geht auf (4/3)πR³·squat, die Breite bleibt dabei
   * stehen. Wer damit die Silhouette höher machen will, macht den Schleim
   * also größer, und sichtbare Größe kommt ausschließlich vom Level
   * (GDD 01 §29). `prall` verschiebt statt dessen nur die Aufteilung
   * zwischen Höhe und Breite; das Volumen rührt er nicht an.
   *
   * Gemessen stand der Ruhekörper bei Breite:Höhe = 1.000 : 0.60…0.73, das
   * Dossier nennt 1.000 : 0.90 ± 12 % (§1). Die Vorgabe muss dafür deutlich
   * höher stehen als das Ziel: Schwerkraft, Bodenfeder und Haftung nehmen
   * dem Körper rund ein Fünftel der Sollhöhe wieder ab und treiben ihn
   * gleichzeitig in die Breite.
   *
   * Das Zusammensacken im Stand greift hier an und nicht mehr an `squat` —
   * ein sackender Schleim wird flacher und breiter, er verliert keine Masse. */
  const prall = Math.max(0.25, P.prall * (1 - P.slumpFlach * slump));
  const prallQuer = 1 / Math.sqrt(prall);
  const squat = P.squat * prall;

  /* --- 3. Wo sitzt die breiteste Stelle? ---------------------------------
   * Vorher: `max(0, -by)`, Maximum fest kurz über dem Bodenpol. Die
   * Silhouette hatte ihre größte Breite damit zwangsläufig an der Bodenlinie
   * — das steht wörtlich in drei der neun Urteile.
   *
   * Das Dossier misst die breiteste Stelle bei 0.53–0.60 der Höhe von oben,
   * Median 0.55: deutlich unter der Mitte, aber weit über dem Rand. Der
   * Bauchbogen sitzt deshalb auf einer einstellbaren Höhe `bauchHoch`
   * (0 = Bodenpol, 1 = Äquator, 2 = Scheitel). Der Grundwert steht über 1,
   * weil der Bodenkontakt die breiteste Stelle der fertigen Silhouette
   * wieder nach unten zieht — die Vorgabe muss also höher zielen als das
   * Ergebnis.
   *
   * Beim Klatschen rutscht er nach unten und wird schmaler: aus dem Bauch
   * wird ein Wulst am Bodenrand. Das ist die Schürze aus
   * sr1-extreme-flatten-disc-skirt und sr1-rock-slimes-squash-wide — ein
   * dünner, RUNDER Rand, der weiter ausladet als die Kuppe darüber. Ohne ihn
   * sieht ein flacher Schleim aus wie eine skalierte Kugel; mit ihm sieht
   * man, dass Masse zur Seite ausgewichen ist (§66). */
  const wulst = P.klatschWulst * platt;
  const bauchMitte = -1 + P.bauchHoch * (1 - wulst);
  const bauchBreite = Math.max(0.3, P.bauchBreite * (1 - 0.5 * wulst));
  const sag = P.sag + P.slumpBreit * slump + P.klatschSchuerze * Math.max(0, kl);

  /* --- 10. Der AUFPRALLTELLER (GDD 01 §20) -------------------------------
   * Das ist die Lücke, die das Urteil zu diesem Teil beim Namen genannt hat:
   * "Statt die Form unten von der Bodenebene abschneiden zu lassen … muss B
   * beim Flachwerden die Grundfläche um denselben Faktor verbreitern und die
   * verdrängte Masse in einen gerundeten, am Boden anliegenden Wulst
   * schieben — dann verschwinden zugleich die Knickkanten an der Flanke, weil
   * die Kontur nicht mehr gegen die Schnittebene läuft."
   *
   * Gemessen war die Diagnose exakt richtig. Der Bodenpol der Sollform lag
   * beim Einschlag rund 0.39 Radien UNTER der Bodenebene, und alles darunter
   * drückte die Bodenfeder auf y = 0. Was daraus wurde, hing an der Breite,
   * die die Sollform dort noch hatte — und die brach zum Pol hin zusammen:
   * am Zeilenprofil des Einschlagbildes stand bei 90 % der Höhe noch 0.68 der
   * Maximalbreite, bei 97 % nur noch 0.40. Die Kontur lief also nach unten
   * ZUSAMMEN und traf die Schnittebene in einer Ecke. Die breiteste Stelle
   * lag bei 0.64 der Höhe und schwebte damit über dem Boden, während die
   * Referenz sie genau dort hat, wo der Aufprall stattfindet.
   *
   * Zwei Dinge kommen deshalb hinzu, und beide greifen nur beim Flachwerden
   * (`platt` = 0 im Stand und in der Fahrt — außerhalb des Einschlags ändert
   * sich nichts):
   *
   *   TELLER — der Superellipsen-Exponent der unteren Flanke (`flanke`, siehe
   *   Punkt 7) wird hochgefahren. Bei n = 2 ist die untere Halbkugel eine
   *   Kugel und läuft zum Pol hin auf null; bei n = 8.5 bleibt sie bis 97 %
   *   der Tiefe auf über 0.83 ihrer Äquatorbreite und rollt erst auf den
   *   letzten Prozenten ein. Das ist rechnerisch dieselbe Kurve, die die
   *   Referenz zeigt: eine Scheibe mit gerolltem Rand, keine abgeschnittene
   *   Kugel. Der Deckel `flankeMax` muss mit, sonst greift er genau dort, wo
   *   die Verbreiterung gebraucht wird.
   *
   *   RAND — ein eigener Bogen legt zusätzlich Querschnitt in ein schmales
   *   Band dicht über dem Bodenpol. Das ist der Wulst: die verdrängte Masse
   *   sitzt AUF der Kontaktebene, nicht auf halber Höhe. Am Material
   *   gemessen (sr1-extreme-flatten-disc-skirt: Kerndurchmesser 155 px,
   *   Schürzendurchmesser 240 px; sr1-quantum-slime-squashed-disc: 380 gegen
   *   580 px) lädt die Schürze rund das 1.5-fache der Kuppe aus.
   *
   * Getrieben werden beide von `plattNach` und nicht von `platt`. Die
   * Aufprallfeder ist nach gut hundert Millisekunden durch null, die
   * breitgewalzte Masse liegt dann aber noch am Boden — mit `platt` schnappte
   * der Wulst weg, während sie noch da war, und übrig blieb eine dünne Platte
   * mit gerader Kante unter dem abhebenden Körper (Bilder 6–9 des alten
   * Kontaktbogens). Die Erinnerung steigt sofort und fällt langsam; sie
   * beschreibt nicht die Feder, sondern wo die Masse ist. */
  /* Und getrieben werden sie nicht nur von der Aufprallfeder, sondern vor
   * allem von der GEMESSENEN Flachheit `b.stauchIst` (am Ende dieser Funktion
   * am eigenen Körper abgelesen).
   *
   * Das war der zweite Teil des Befunds und der überraschendere. Gemessen
   * stand die Feder im Bild der tiefsten Stauchung schon fast wieder auf null
   * (`klatschGes` 0.04 bei einem Squash von 0.68): der Körper war zu diesem
   * Zeitpunkt flach, weil die BODENFEDER ihn hielt, nicht weil die Vorgabe es
   * verlangte. Ein Wulst, der an der Vorgabe hängt, ist dann längst wieder
   * weg, wenn die Masse tatsächlich zur Seite muss.
   *
   * Die gemessene Flachheit hat dieses Problem nicht — sie ist per
   * Konstruktion mit dem Zustand synchron, den man sieht. Sie ist außerdem
   * lane-sicher, weil sie gegen die AKTUELLE Ruhehöhe misst: fährt `death.js`
   * `squat` herunter, sinkt die Ruhehöhe mit und die Pfütze gilt nicht als
   * gestaucht. */
  const stauch = begrenze(b.stauchIst / Math.max(P.klatschStauchVoll, 0.05), 0, 1);
  b.plattNach = Math.max(Math.max(platt, stauch),
                         b.plattNach - dt * Math.max(P.klatschNachhall, 0.1));
  const teller = begrenze(b.plattNach, 0, 1);
  const flankeN = P.flanke + P.klatschTeller * teller;
  const flankeDeckel = P.flankeMax + P.klatschDeckel * teller;
  const randAmp = P.klatschRand * teller;
  const randMitte = -begrenze(P.klatschRandOrt, 0, 1);
  const randZone = Math.max(0.15, P.klatschRandZone);
  /* SITZ — und ohne ihn arbeiten Teller und Wulst ins Leere.
   *
   * Gemessen reichte die Sollform beim Einschlag 0.67 Radien unter den
   * Schwerpunkt, der Schwerpunkt stand aber nur 0.21 über dem Boden: zwei
   * Drittel der unteren Halbkugel lagen UNTER der Bodenebene. Alles davon
   * drückt die Bodenfeder auf dieselbe Zeile, und damit landet jeder
   * Formregler, der auf `by` zielt, irgendwo in derselben Aufstandsfläche —
   * der Wulst bei by = -0.8 war von der Flanke bei by = -0.4 nicht mehr zu
   * unterscheiden. Am Zeilenprofil sah man genau das: eine gerade Flanke von
   * 0.55 bis 0.85 der Höhe auf konstant 0.95…1.00 Breite, kein Wulst.
   *
   * Der Sitz staucht deshalb die untere Halbhöhe der VORGABE, sobald der
   * Körper flach ist: die Sollform legt sich auf die Kontaktebene, statt
   * durch sie hindurchzureichen. Danach bildet sie die Höhe wieder ab, und
   * der Wulst sitzt da, wo er hingehört.
   *
   * Als `1 - s·by²` geschrieben und nicht als Schalter bei by = 0: Wert und
   * Steigung gehen am Äquator stetig ineinander über, sonst stünde dort eine
   * Knickkante — und die Kontur soll gerade keine mehr haben. Der Faktor
   * bleibt streng monoton, solange s < 1/3 ist. */
  const sitz = begrenze(P.klatschSitz, 0, 0.32) * teller;
  /* KEHLE — der zweite Halbteil des Wulsts, und der billigere von beiden.
   *
   * Das Urteil der ersten Runde beschreibt die Zielkontur wörtlich: "der
   * Übergang von Körperkuppe in den ausgeworfenen Randwulst ist eine
   * durchgehende S-KURVE". Eine S-Kurve hat einen Wendepunkt — von oben nach
   * unten wächst die Breite erst mit abnehmender Steigung (die Kuppe) und
   * dann wieder mit zunehmender (die Flare in die Schürze). Unsere Kontur war
   * über die ganze Höhe rein konkav: eine Kuppel, kein Wulst.
   *
   * Den Wendepunkt allein über mehr Wulst zu holen, geht nicht — gemessen
   * riss bei einer Amplitude über 0.7 das Volumen auf 0.65 ein, weil die
   * Masse einer so scharfen Torusvorgabe nicht folgen kann, und die
   * Gesamtbreite lief auf das 1.67-fache statt der 1.23…1.30, die das Dossier
   * für den harten Aufprall nennt (§3).
   *
   * Die Kehle nimmt statt dessen Querschnitt aus der FLANKE über dem Wulst.
   * Der Wendepunkt entsteht damit aus der Differenz zweier flacher Bögen
   * statt aus einem steilen — das Volumen bleibt stehen, die größte Breite
   * auch, und die Kuppe wird als eigener Körper über der Schürze lesbar.
   * Bewusst flach gehalten: eine tiefe Einschnürung würde die
   * Blob-Identität zur Frage eines einzigen Bildes machen (GDD 01 §5). */
  const kehleAmp = begrenze(P.klatschKehle, 0, 0.4) * teller;
  const kehleMitte = -begrenze(P.klatschKehleOrt, 0, 1);
  const kehleZone = Math.max(0.15, P.klatschKehleZone);

  /* --- 6. Der Gelfuß: der Körper läuft nach unten rund AUS ----------------
   * Das ist die Fähigkeit, die dem Ruhezustand zuletzt gefehlt hat, und der
   * Gutachter hat sie beim Namen genannt: "keiner der beiden Körper zeigt an
   * der Bodenlinie eine echte Quetschung … A endet mit einer erstaunlich
   * sauberen, fast gestanzten Unterkante."
   *
   * Gemessen war das kein Einstellungsfehler. Die Sollform reichte mit ihrem
   * Bodenpol rund 0.45 Radien UNTER die Bodenebene, und zwar in voller
   * Breite. Alles, was dort unten liegt, drückt die Bodenfeder auf y = 0
   * zurück — daraus entsteht eine breite ebene Scheibe, deren Rand in der
   * Silhouette als gerade Kante erscheint. Gemessen endeten 15.6 % aller
   * Körperspalten auf derselben Bildzeile; am Referenzbild
   * (sr1-green-slime-rest-dome-face, mit demselben Werkzeug gemessen) sind
   * es 2.8 %.
   *
   * Der Ausweg ist NICHT, den Körper vom Boden zu heben — dann steht er da
   * wie eine Kugel auf einem Tisch. Er ist, die Masse dorthin zu verlagern,
   * wo sie beim Quetschen hingehört: der Bauch lädt kurz über dem Boden aus
   * und ÜBERHÄNGT eine schmale Aufstandsfläche. Genau diese zwei Merkmale
   * beschreibt das Dossier §2 als "breiter, weich auslaufender Fuß ohne
   * harte Kante", und genau so misst sich die Referenz: bei 88 % der Höhe
   * noch 83 % der Maximalbreite, bei 94 % nur noch 9 %.
   *
   * `fuss` schnürt deshalb den Querschnitt in einer schmalen Zone um den
   * Bodenpol ein — nur die beiden Waagerechten, die Höhe bleibt unberührt,
   * und die Normierung am Ende holt das Volumen ohnehin zurück. Was unter
   * der Bodenebene liegt, ist danach ein schlanker Zapfen statt einer
   * Scheibe: die Aufstandsfläche wird klein, der Bauch darüber bleibt breit,
   * und zwischen beiden entsteht der überhängende Wulst.
   *
   * Er hängt an `bodenNah`, weil er eine Antwort auf das Gewicht ist. Ein
   * Körper in der Luft trägt nichts und ist eine saubere Ellipse (§4). */
  const zielBoden = b.grounded ? 1 : 0;
  b.bodenNah += (zielBoden - b.bodenNah) * begrenze(dt * P.fussFolge, 0, 1);
  /* Beim Klatschen tritt der Einzug zurück: dort SOLL die Aufstandsfläche
   * breit werden, das ist der Sinn von `klatschBreit`. */
  /* Beim Anrollen tritt der Fußeinzug ebenfalls zurück, und aus demselben
   * Grund wie beim Klatschen: er ist eine Antwort auf GEWICHT. Wälzt sich der
   * Körper über seine hintere Kante, hebt die Bodenlast von der Mitte ab —
   * die Kehle stand dann als schmaler Zapfen unter einem freischwebenden
   * Bauch, und im Bild las sich das als angesetzter Stiel statt als
   * aufsitzende Masse. */
  /* Und in der Kehre aus demselben Grund noch einmal: dort wird das Gewicht
   * nach AUSSEN geworfen, die Aufstandsfläche wird breit und schleift. Der
   * Einzug ließ statt dessen einen Zapfen unter einem überhängenden Bauch
   * stehen — im Bild ein Körper auf einem Stiel, keine Masse, die durch die
   * Kurve schmiert. Dieselbe Bauart wie `anrollFuss` eine Zeile darüber. */
  /* Der Einzug weicht dem Aufprallteller — und zwar so lange, wie die
   * breitgewalzte Masse am Boden liegt (`teller` statt `platt`, siehe Punkt
   * 10). Beides gleichzeitig hieße, dieselbe Partie in derselben Zeile nach
   * außen und nach innen zu ziehen.
   *
   * Und er weicht auch dem ZUG. Der Gelfuß ist eine Antwort auf Gewicht —
   * das steht seit Runde 2 in seiner eigenen Herleitung —, ein Körper, der
   * sich gerade vom Boden abhebt, trägt aber keines. Ohne diesen Anteil
   * schnürte der Einzug die Masse genau in dem Moment ein, in dem die
   * Aufstandsfläche noch klebte und der Körper schon stieg: auf dem
   * Kontaktbogen stand ein Pilz — eine Kuppe auf einem Stiel über einer
   * flachen Scheibe (Bilder 9 und 10). Mit dem Zugterm bleibt daraus ein
   * durchgehend rundes Abziehen. */
  const zug = begrenze((klHoch - 1) / Math.max(P.klatschMax - 1, 1e-3), 0, 1);
  const fuss = P.fuss * b.bodenNah * (1 - teller) * (1 - zug)
             * (1 - begrenze(P.anrollFuss, 0, 1) * anroll)
             * (1 - begrenze(P.kehreFuss, 0, 1) * kehrStark);
  const fussZone = Math.max(0.08, P.fussZone);
  /* Der Ort der Kehle ist der eigentliche Regler, nicht ihre Tiefe. Sitzt sie
   * exakt am Pol, liegt sie komplett unter der Bodenebene und wird von der
   * Bodenfeder wieder breitgewalzt — gemessen blieb die Silhouette dann
   * unverändert. Sitzt sie ein Stück darüber, schnürt sie GENAU DA, wo die
   * Silhouette den Boden trifft: darüber der ausladende Bauch, darunter ein
   * schmaler Fuß, dazwischen die Kante, die man als Quetschung liest. */
  const fussMitte = -1 + P.fussHoch;

  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const bx = b.base[k], by = b.base[k + 1], bz = b.base[k + 2];

    const af = bx * fx + bz * fz;                 // Anteil nach vorn
    const as = bx * sx + bz * sz;                 // Anteil zur Seite

    /* --- 7. Senkrechte Flanken statt Ellipsenrundung -----------------------
     * Am Referenzbild Zeile für Zeile ausgemessen (sr1-green-slime-rest-dome-
     * face, 25 Höhenbänder, Breite in Anteilen der Maximalbreite):
     *
     *   Referenz  0.24 0.43 0.55 0.67 0.76 0.81 0.86 0.89 0.91 0.92 0.93 0.93
     *             0.93 0.93 0.94 0.95 0.97 0.99 0.95 0.91 0.89 0.85 | 0.13 0.09
     *   Ellipse   0.28 0.47 0.60 0.69 0.77 0.83 0.88 0.92 0.95 0.97 0.99 1.00
     *             1.00 1.00 0.99 0.97 0.95 0.92 0.88 0.83 0.77 0.69 | 0.60 0.47
     *
     * Der ruhende Schleim ist also KEIN Ei. Oben folgt er bis etwa einem
     * Drittel der Höhe einer Ellipse, danach steht er auf einer über 60 % der
     * Höhe fast konstanten Breite — senkrechten Flanken — und bricht erst in
     * den letzten drei Bändern schlagartig weg. Genau dieser Knick unten ist
     * das, was man als aufsitzende Masse liest; unser Körper lief statt
     * dessen als Birne gleichmäßig aus, und der Gutachter hat das als "harte,
     * geschlossene Hülle statt träge Masse" beschrieben.
     *
     * Eine Kugelgrundform kann das nicht: `sqrt(1-by²)` hat nirgends ein
     * Plateau, und jeder Bogen, den man darüberlegt, wölbt sich in der Mitte
     * genauso wie an den Rändern. Was ein Plateau hat, ist die SUPERELLIPSE
     * `r = (1-|by|^n)^(1/n)`: bei n = 2 die Kugel, bei n > 2 zunehmend
     * senkrechte Flanken mit gerundeten Ecken.
     *
     * Der Exponent wächst mit `by²` von 2 am Äquator auf `flanke` am
     * Bodenpol. Damit bleibt die obere Hälfte exakt die Ellipse, die die
     * Referenz dort zeigt, der Übergang ist stetig differenzierbar (kein
     * Breitensprung, DOSSIER §2), und nur die untere Hälfte wird zum Fass.
     *
     * Nach oben begrenzt, weil der Quotient am Bodenpol selbst gegen
     * unendlich geht — dort steht ohnehin der Fußeinzug. */
    let flanke = 1;
    if (by < 0 && flankeN > 2.01) {
      const a = -by;                              // 0 = Äquator, 1 = Bodenpol
      const nn = 2 + (flankeN - 2) * a * a;
      const kreis = Math.sqrt(Math.max(1e-6, 1 - by * by));
      const kasten = Math.pow(Math.max(0, 1 - Math.pow(a, nn)), 1 / nn);
      flanke = Math.min(flankeDeckel, kasten / kreis);
    }

    /* Bauch, Flanke, Rand und Fuß greifen ineinander: die Flanke stellt den
     * Körper senkrecht, der Bauch lädt darüber aus, der Rand legt beim
     * Aufprall den Wulst auf die Kontaktebene, der Fuß schneidet unten die
     * Kante. Zusammen ergeben sie das Profil, das eine ruhende Masse von
     * einer skalierten Kugel unterscheidet. */
    const spread = flanke
                 * (1 + sag * bogen(by, bauchMitte, bauchBreite))
                 * (1 + randAmp * bogen(by, randMitte, randZone))
                 * (1 - kehleAmp * bogen(by, kehleMitte, kehleZone))
                 * (1 - fuss * bogen(by, fussMitte, fussZone));

    const ang = Math.atan2(bz, bx);
    const wave = 1
      + waveAmp * Math.sin(3 * ang - t * 4.3 + by * 2.5)
      + waveAmp * 0.7 * Math.sin(2 * ang + t * 2.9 - by * 1.7);

    /* Leicht asymmetrisch (GDD 01 §5): in jedem Referenzbild sitzt eine
     * Schulter höher als die andere. Fest am Körper, nicht flackernd. */
    const asym = 1 + P.asymm * (0.75 * bx + 0.55 * bz * by - 0.45 * bx * bz);

    /* Heckanteil: 0 an der Front, 1 ganz hinten. Quadriert, damit die
     * Verjüngung erst hinter dem Äquator einsetzt. */
    const heck = Math.max(0, -af);
    const h2 = heck * heck - MITTEL_H2;
    const front = Math.max(0, af);
    const f2 = front * front - MITTEL_H2;
    /* Der Schleppzipfel beim Anrollen liegt TIEF (GDD 01 §12).
     *
     * `zipfel` verlängert das Heck auf jeder Höhe gleich viel. Am Äquator ist
     * das der breiteste Umfang, also wird dort auch am meisten Länge
     * angehängt — heraus kam eine Kegelspitze auf halber Höhe, die mit der
     * Scherung nach schräg hinten-oben zeigte. Das Urteil zum Anrollen
     * benennt genau das Gegenteil als das Fehlende: "die hintere Basiskante
     * bleibt als gestreckter, TIEFLIEGENDER Schleppzipfel zurück".
     *
     * Und das ist auch die ehrlichere Beschreibung. Was am Boden klebt, ist
     * die Aufstandsfläche, nicht die Schulter — also muss auch das, was
     * hängenbleibt, von unten kommen. `schleppTief` legt die zusätzliche
     * Heckverlängerung deshalb auf die untere Halbkugel; sie landet unter der
     * Bodenebene, wo die Bodenfeder sie zu einer flachen, nachgezogenen
     * Schürze auswalzt — die Form entsteht am Boden, nicht in der Vorgabe. */
    const heckTief = Math.max(0, -by);
    const laenger = Math.max(0.25, 1 + zipfel * h2 + vorlang * f2
                                     + (schleppTief + kehrTief) * heck * heck * heckTief);
    const duenner = Math.max(0.25, 1 - schlank * h2);

    /* Die Linse (GDD 01 §14 "vorne flacher"): die Front verliert Höhe und
     * bekommt sie als Breite zurück. Greift nur nach vorn; hinten und quer
     * bleibt sie exakt 1, sonst wird aus der Kuppel ein Zeltdach. */
    const linse = Math.max(0.35, 1 - P.frontFlach * vollgas * front * front);

    /* Querschnittsfaktor: Tropfen (ungerade in af) mal Taille (Kehle an
     * einer Stelle der Längsachse). Beide wirken auf Breite UND Höhe, denn
     * eine Einschnürung nimmt Querschnitt weg, keine Länge. Nach unten
     * begrenzt — die Masse darf dünn werden, nie null (§5). */
    /* Und mal der KEULE: dem runden Ende der Schleppe (GDD 01 §5, §15).
     *
     * Alle drei Faktoren, die das Heck bilden — `tropfen`, `duenner` und die
     * Grundkugel selbst — fallen zum Heckpol hin monoton auf null. Was
     * dabei entsteht, ist ein Kegel, und ein Kegel liest sich als Schnabel
     * oder Dorn, nicht als nachgeschleppte Masse. Genau das stand im Bild:
     * eine Nadel, die waagerecht in der Luft endet.
     *
     * Die Referenz endet anders. In cuphead-goopy-lunge-mass-trailing-behind
     * lauten die Dicken der sechs hintersten Bänder (Anteil der größten
     * Dicke, vom Schleppende nach vorn):
     *
     *   0.19  0.22  0.19  0.15  0.11  0.11
     *
     * Das ist kein Kegel. Das Ende ist DICKER als der Hals davor: ein
     * gerundeter Knoten von rund einem Fünftel der Kopfdicke sitzt an einem
     * Stiel von rund einem Achtel. Erst dieser Knoten macht aus dem Fortsatz
     * Masse, die hinterherkommt — ein Tropfen, der noch nicht abgerissen
     * ist. Er entsteht nirgends von selbst, weil jede Achsenskalierung zum
     * Pol hin ausläuft; er braucht einen eigenen Bogen genau dort.
     *
     * Getragen wird er von derselben Kehre wie die Schleppe: wo keine
     * Querablage ist, gibt es auch nichts, was nachgeschleppt wird. */
    const keule = 1 + keuleStark * bogen(af, -1, keuleBreite);
    const querschnitt = Math.max(0.15, keule
      * (1 + tropfen * af) * (1 - taille * bogen(af, P.taillePos, P.tailleBreite)));

    const g = spread * wave * asym * prallQuer;
    const rf = R * stretch * g * laenger * sw * klQuer * bs * kehrQuer;
    const rs = R * shrinkQuer * g * duenner / linse * swQuer * klQuer * querschnitt * bsQuer * kehrQuer;
    const ry = R * squat * shrinkHoch * wave * asym * duenner * linse * swHoch
             * klHoch * querschnitt * bsHoch * kehrFlach;

    /* Längs- und Querkoordinate samt ihrer Scherung über die Höhe — und samt
     * der Kehre (Abschnitt 9), die als einzige die Längsachse KRÜMMT.
     *
     * `heck - 0.25` legt das Heck auf die Schleppachse: `heck` ist im Mittel
     * über die Kugel genau 1/4, der Term ist damit mittelwertfrei. Was er
     * hinten wegnimmt, gibt er vorn zurück — deshalb schwenkt die
     * Vorderpartie von selbst zur Gegenseite, ohne dass es irgendwo
     * gesondert steht.
     *
     * Der Bogen setzt den Querversatz dort, wo die Referenz ihn misst: im
     * Hals, ein knappes Drittel von hinten. */
    const laengs = af * rf + scherL * by;
    const quer   = as * rs + scherQ * by
                 + kehrS * (P.kehreZug * (heck - 0.25)
                          + P.kehreBogen * (bogen(af, kehrOrt, kehrBreite) - kehrMittel));

    b.rest[k]     = fx * laengs + sx * quer;
    /* Der Schleppzipfel hängt nach unten, nicht waagerecht ab. Ohne diesen
     * Term endete er als Flügel auf gut zwei Dritteln der Körperhöhe — die
     * Referenz zeigt ihn dagegen auf der Bodenlinie: bei
     * cuphead-goopy-lunge-mass-trailing-behind liegt die Spitze des
     * nachgeschleppten Fortsatzes auf derselben Bildzeile wie der tiefste
     * Punkt des vorderen Ballens. Was daraus wird, entscheidet der Boden. */
    /* Die Kehrschleppe sackt EINSEITIG ab, sie kippt nicht.
     *
     * Mittelwertfrei geschrieben (`heck² − 1/6`) senkt derselbe Term das
     * Heck um 0.83 Radien und hebt die Front um 0.17 — aus dem Absacken
     * wurde damit eine Kippbewegung um den Schwerpunkt, und die hat die
     * Silhouette in der Kehre auf 156 % der Ruhehöhe aufgerichtet. Was
     * §15 verlangt, ist aber kein aufgerichteter Körper, sondern ein
     * schleifendes Heck.
     *
     * Der fehlende Mittelwert ist unschädlich: er verschiebt die Sollform
     * um `kehrSenke/6` nach unten, also um wenige Zentimeter, und der
     * Bodenkontakt fängt genau das ab — dieselbe Bauart wie `heckSenke`
     * eine Zeile darüber, die aus demselben Grund ebenfalls nicht
     * mittelwertfrei ist. */
    const sitzF = by < 0 ? 1 - sitz * by * by : 1;   // siehe SITZ oben
    b.rest[k + 1] = by * ry * sitzF - keil * af + senke * af - heckSenke * heck * heck
                  - kehrSenke * heck * heck;
    b.rest[k + 2] = fz * laengs + sz * quer;
  }

  /* Zum Schluss das Volumen exakt geradeziehen. Erst dadurch dürfen alle
   * Regler oben frei kombiniert werden, ohne dass der Schleim wächst — und
   * sichtbare Größe kommt ausschließlich vom Level (GDD 01 §29). */
  ruheformNormieren(b, (4 / 3) * Math.PI * R * R * R * P.squat);

  /* Und zuletzt messen, wie weit der Körper seiner eigenen Sollform auf der
   * Fahrtachse davongelaufen ist. Der Wert treibt im nächsten Schritt die
   * Taille (siehe oben). Ein Bild Verzug bei 240 Hz ist nicht nur unschädlich,
   * sondern richtig: die Einschnürung soll dem Ziehen NACHlaufen (§66). */
  let ist = 0, soll = 0, yLo = Infinity, yHi = -Infinity;
  for (let i = 0; i < b.n; i++) {
    const k = i * 3;
    const a = Math.abs((b.pos[k] - b.cx) * fx + (b.pos[k + 2] - b.cz) * fz);
    if (a > ist) ist = a;
    const s = Math.abs(b.rest[k] * fx + b.rest[k + 2] * fz);
    if (s > soll) soll = s;
    const y = b.pos[k + 1];
    if (y < yLo) yLo = y;
    if (y > yHi) yHi = y;
  }
  b.laengsZug = begrenze(ist / Math.max(soll, 1e-5) - 1, 0, 1.6);

  /* Die gemessene Flachheit, in derselben Währung wie `metrics().squash`:
   * Silhouettenhöhe geteilt durch die Ruhehöhe 2R·squat. Im Stand ist sie
   * per Auslegung 0, beim harten Aufprall nennt das Dossier 0.62–0.68 der
   * Ruhehöhe, also 0.32–0.38 hier. Sie hinkt der Bewegung um ein Bild bei
   * 240 Hz nach — und das ist richtig so: die Masse weicht aus, NACHDEM sie
   * gedrückt wurde (GDD 01 §66). */
  const ruheHoch = 2 * R * Math.max(P.squat, 0.05);
  b.stauchIst = begrenze(1 - (yHi - yLo) / ruheHoch, 0, 1);
}

function stepSoftBody(b, dt, P, world, ctx) {
  const n = b.n, p = b.pos, v = b.vel, f = b.frc;
  const inv = 1 / P.mass;

  bodyCentroid(b);

  /* Die waagerechte Beschleunigung des Schwerpunkts — die Quelle, aus der
   * die Ruheform ihre Scherung zieht. Bewusst gemessen und nicht aus dem
   * Antriebswunsch abgelesen: bei gleichförmiger Fahrt heben Antrieb und
   * Reibung einander auf, und genau dann darf der Körper auch nicht lehnen.
   * Reibung, Wende und Aufprall fallen damit ohne Zutun mit hinein. */
  const beschlX = (b.vx - b.vxPrev) / Math.max(dt, 1e-5);
  const beschlZ = (b.vz - b.vzPrev) / Math.max(dt, 1e-5);
  b.vxPrev = b.vx; b.vzPrev = b.vz;

  updateRestShape(b, P, ctx.time, ctx.fx, ctx.fz, ctx.speedRatio, ctx.slump,
                  ctx.nachzug !== undefined ? ctx.nachzug : ctx.speedRatio,
                  ctx.vollgas !== undefined ? ctx.vollgas : 0,
                  ctx.schwing !== undefined ? ctx.schwing : 0,
                  ctx.klatsch !== undefined ? ctx.klatsch : 0,
                  beschlX, beschlZ,
                  ctx.heckAnker !== undefined ? ctx.heckAnker : 0,
                  ctx.bremsen !== undefined ? ctx.bremsen : 0, dt);
  f.fill(0);

  /* --- Kantenfedern (Haut) ---------------------------------------------- */
  for (const e of b.mesh.edges) {
    const i = e[0] * 3, j = e[1] * 3;
    const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], dz = p[j + 2] - p[i + 2];
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const rx = b.rest[j] - b.rest[i];
    const ry = b.rest[j + 1] - b.rest[i + 1];
    const rz = b.rest[j + 2] - b.rest[i + 2];
    const rest = Math.hypot(rx, ry, rz);
    const nx = dx / d, ny = dy / d, nz = dz / d;
    const dv = (v[j] - v[i]) * nx + (v[j + 1] - v[i + 1]) * ny + (v[j + 2] - v[i + 2]) * nz;
    const force = (d - rest) * P.skin + dv * P.skinDamp;
    f[i] += nx * force; f[i + 1] += ny * force; f[i + 2] += nz * force;
    f[j] -= nx * force; f[j + 1] -= ny * force; f[j + 2] -= nz * force;
  }

  /* --- Biegefedern -------------------------------------------------------
   * Verbinden die gegenüberliegenden Ecken benachbarter Dreiecke. Sie
   * wirken gegen scharfe Knicke, ohne die Haut insgesamt steifer zu machen
   * — deshalb bleibt der Schleim beim Aufprall rund. */
  if (P.bend > 0) {
    for (const e of b.mesh.bend) {
      const i = e[0] * 3, j = e[1] * 3;
      const dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], dz = p[j + 2] - p[i + 2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const rest = Math.hypot(b.rest[j] - b.rest[i],
                              b.rest[j + 1] - b.rest[i + 1],
                              b.rest[j + 2] - b.rest[i + 2]);
      const nx = dx / d, ny = dy / d, nz = dz / d;
      const dv = (v[j] - v[i]) * nx + (v[j + 1] - v[i + 1]) * ny + (v[j + 2] - v[i + 2]) * nz;
      const force = (d - rest) * P.bend + dv * P.bendDamp;
      f[i] += nx * force; f[i + 1] += ny * force; f[i + 2] += nz * force;
      f[j] -= nx * force; f[j + 1] -= ny * force; f[j + 2] -= nz * force;
    }
  }

  /* --- Formfedern -------------------------------------------------------
   * Zieht jeden Punkt auf seine Sollposition relativ zum Schwerpunkt.
   * Die Summe der Kräfte wird abgezogen, sonst schiebt sich der Körper
   * selbst durch die Welt. */
  let sfx = 0, sfy = 0, sfz = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    const ex = (b.cx + b.rest[k]) - p[k];
    const ey = (b.cy + b.rest[k + 1]) - p[k + 1];
    const ez = (b.cz + b.rest[k + 2]) - p[k + 2];

    /* Progressiv steifer: kleine Auslenkungen bleiben weich (das Wabbeln),
     * große werden hart abgefangen. Sonst klatscht der Körper beim Aufprall
     * zum Pfannkuchen und die Oberfläche faltet sich in sich selbst — der
     * GDD verlangt ausdrücklich, dass er nie völlig flach wird. */
    const dev = Math.hypot(ex, ey, ez) / (P.radius * P.maxDeform);
    const stiff = P.shape * (1 + P.stiffen * dev * dev);

    const fxv = ex * stiff - (v[k] - b.vx) * P.shapeDamp;
    const fyv = ey * stiff - (v[k + 1] - b.vy) * P.shapeDamp;
    const fzv = ez * stiff - (v[k + 2] - b.vz) * P.shapeDamp;
    f[k] += fxv; f[k + 1] += fyv; f[k + 2] += fzv;
    sfx += fxv; sfy += fyv; sfz += fzv;
  }
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    f[k] -= sfx / n; f[k + 1] -= sfy / n; f[k + 2] -= sfz / n;
  }

  /* --- Volumendruck ------------------------------------------------------ */
  const idx = b.mesh.indices;
  let vol = 0, restVol = 0;
  for (let t3 = 0; t3 < idx.length; t3 += 3) {
    const a = idx[t3] * 3, c = idx[t3 + 1] * 3, e = idx[t3 + 2] * 3;
    vol += signedTetra(p, a, c, e, b.cx, b.cy, b.cz);
    restVol += signedTetraRest(b.rest, a, c, e);
  }
  b.volume = vol; b.restVolume = restVol;

  /* Innendruck steigt, solange der Körper gegen den Boden gedrückt wird
   * (GDD 01 §20). Ohne das gewinnt die Bodenfeder: sie ist mit 10000
   * mehr als doppelt so steif wie der Ruhedruck von 4000, und gemessen
   * brach das Volumen im Einschlag auf 0.67 ein — knapp ein Drittel der
   * Masse war für zwei Bilder schlicht weg. Sichtbare Größe kommt aber
   * ausschließlich vom Level (GDD 01 §29), und eine Masse, die beim
   * Aufprall kleiner wird, ist keine Masse (§66).
   *
   * Genau dieser Gegendruck ist auch der Grund, warum ein Wasserball beim
   * Aufschlag seitlich ausbeult statt zu schrumpfen — er macht aus dem
   * Zusammendrücken eine Verdrängung. Er hängt nur am Aufprallkanal und
   * fällt mit ihm auf null zurück; im Stand, in der Fahrt und bei allen
   * anderen Lanes bleibt der Körper exakt so weich wie vorher. */
  const klDruck = 1 + P.klatschDruck * Math.max(0, ctx.klatsch || 0);
  const press = P.pressure * klDruck * (restVol / Math.max(vol, 1e-4) - 1);
  for (let t3 = 0; t3 < idx.length; t3 += 3) {
    const a = idx[t3] * 3, c = idx[t3 + 1] * 3, e = idx[t3 + 2] * 3;
    const ux = p[c] - p[a], uy = p[c + 1] - p[a + 1], uz = p[c + 2] - p[a + 2];
    const wx = p[e] - p[a], wy = p[e + 1] - p[a + 1], wz = p[e + 2] - p[a + 2];
    // Kreuzprodukt = Normale, Länge = doppelte Dreiecksfläche
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    const s = press / 6;                    // (Fläche/2) / 3 Ecken
    f[a] += nx * s; f[a + 1] += ny * s; f[a + 2] += nz * s;
    f[c] += nx * s; f[c + 1] += ny * s; f[c + 2] += nz * s;
    f[e] += nx * s; f[e + 1] += ny * s; f[e + 2] += nz * s;
  }

  /* --- Schwerkraft + Antrieb ---------------------------------------------
   * Der Antrieb schiebt von hinten an: die Front läuft voraus, der Rest
   * wird nachgezogen. */
  const dax = ctx.drive.x, daz = ctx.drive.z;
  const driveLen = Math.hypot(dax, daz);
  let norm = 1;
  if (driveLen > 1e-5) {
    const dhx = dax / driveLen, dhz = daz / driveLen;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const ox = p[k] - b.cx, oz = p[k + 2] - b.cz;
      const d = Math.hypot(ox, oz) || 1e-6;
      const back = Math.max(0, -((ox / d) * dhx + (oz / d) * dhz));
      /* Kriechwelle: der Schub läuft als Welle von hinten nach vorn durch
       * die Masse. Der Schleim schiebt sich dadurch voran, statt als
       * Ganzes zu gleiten. */
      const along = (ox * dhx + oz * dhz) / P.radius;
      const wave = 1 + P.crawl * Math.sin(along * 2.2 - ctx.time * 7.0);
      const w = (1 + P.rearBias * back) * Math.max(0.1, wave);
      b.weight[i] = w;
      total += w;
    }
    norm = n / total;
  }
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    f[k + 1] -= P.gravity * P.mass;
    if (driveLen > 1e-5) {
      const w = b.weight[i] * norm * P.mass;
      f[k] += dax * w;
      f[k + 2] += daz * w;
    }
    /* Weicher Boden: eine Feder statt einer harten Klemmung. Ein starrer
     * Boden würde die Kontaktfläche scharf abschneiden — genau daraus
     * entstehen die Knickkanten beim Aufprall. */
    const pen = -p[k + 1];
    if (pen > 0) {
      f[k + 1] += pen * P.groundK;
      if (v[k + 1] < 0) f[k + 1] -= v[k + 1] * P.groundDamp;
    } else if (p[k + 1] < P.radius * 0.35) {
      /* Haftung: dicht über dem Boden zieht es den Schleim an. Er klebt,
       * breitet sich aus und muss sich beim Abheben regelrecht ablösen. */
      f[k + 1] -= P.adhesion * (1 - p[k + 1] / (P.radius * 0.35));
    }
  }

  /* --- Integration ------------------------------------------------------- */
  for (let i = 0; i < n * 3; i++) v[i] += f[i] * inv * dt;

  /* --- Viskosität --------------------------------------------------------
   * Benachbarte Punkte gleichen ihre Geschwindigkeit an. Genau das
   * unterscheidet zähen Schleim von einem Gummiball: Verformungen fließen
   * träge durch die Masse, statt federnd zurückzuschnellen. Impulserhaltend,
   * weil jeder Austausch symmetrisch ist. */
  if (P.viscosity > 0) {
    const k = Math.min(0.5, P.viscosity * dt);
    for (const e of b.mesh.edges) {
      const i = e[0] * 3, j = e[1] * 3;
      const dx = (v[j] - v[i]) * k * 0.5;
      const dy = (v[j + 1] - v[i + 1]) * k * 0.5;
      const dz = (v[j + 2] - v[i + 2]) * k * 0.5;
      v[i] += dx; v[i + 1] += dy; v[i + 2] += dz;
      v[j] -= dx; v[j + 1] -= dy; v[j + 2] -= dz;
    }
  }

  /* --- Heckanker beim Anrollen (GDD 01 §13, §12) -------------------------
   * Der Grund, warum ein Schleim nicht sofort auf Tempo ist, sitzt am Boden:
   * die Aufstandsfläche haftet. Vorn löst sie sich zuerst, hinten zuletzt.
   * Also wird genau dort die Haftung erhöht, wo der Körper hinten aufliegt —
   * eine Reibung, keine gesetzte Position. Die Front zieht davon, das Heck
   * wird ausgezogen und schnappt nach, sobald der Anker fällt. */
  if (ctx.heckAnker > 0.001) {
    const dhx = ctx.fx, dhz = ctx.fz;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const hoch = p[k + 1] / (P.radius * 0.6);
      if (hoch > 1) continue;                     // nur die Bodenzone klebt
      const ox = p[k] - b.cx, oz = p[k + 2] - b.cz;
      const d = Math.hypot(ox, oz) || 1e-6;
      const heck = Math.max(0, -((ox / d) * dhx + (oz / d) * dhz));
      const w = heck * heck * (1 - Math.max(0, hoch)) * ctx.heckAnker;
      if (w <= 0) continue;
      const g = Math.exp(-P.heckKleben * w * dt);
      v[k] *= g; v[k + 2] *= g;
    }
  }

  /* --- Dämpfung: Schwerpunkt und Nachschwingen getrennt ------------------ */
  bodyCentroid(b);
  const jig = Math.exp(-P.jiggleDamp * dt);
  const fri = b.grounded ? Math.exp(-P.friction * dt) : Math.exp(-P.airDrag * dt);
  const ddx = b.vx * (fri - 1), ddz = b.vz * (fri - 1);
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    v[k]     = b.vx + (v[k] - b.vx) * jig + ddx;
    v[k + 1] = b.vy + (v[k + 1] - b.vy) * jig;
    v[k + 2] = b.vz + (v[k + 2] - b.vz) * jig + ddz;
  }

  /* --- Position + Kollision ---------------------------------------------- */
  b.contacts = 0;
  for (let i = 0; i < n; i++) {
    const k = i * 3;
    const sp = Math.hypot(v[k], v[k + 1], v[k + 2]);
    if (sp > 120) { const s = 120 / sp; v[k] *= s; v[k + 1] *= s; v[k + 2] *= s; }
    p[k] += v[k] * dt;
    p[k + 1] += v[k + 1] * dt;
    p[k + 2] += v[k + 2] * dt;
    collide(b, k, world, P, dt);
  }
  b.grounded = b.contacts > 0;
  bodyCentroid(b);
  smoothNormals(b.pos, b.mesh.indices, b.normals);
}

function signedTetra(p, a, c, e, cx, cy, cz) {
  const ax = p[a] - cx, ay = p[a + 1] - cy, az = p[a + 2] - cz;
  const bx = p[c] - cx, by = p[c + 1] - cy, bz = p[c + 2] - cz;
  const dx = p[e] - cx, dy = p[e + 1] - cy, dz = p[e + 2] - cz;
  return (ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx)) / 6;
}

function signedTetraRest(r, a, c, e) {
  const ax = r[a], ay = r[a + 1], az = r[a + 2];
  const bx = r[c], by = r[c + 1], bz = r[c + 2];
  const dx = r[e], dy = r[e + 1], dz = r[e + 2];
  return (ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx)) / 6;
}

/* Ein Punkt gegen Boden, Hindernisse und Weltgrenze. Weil der Körper aus
 * vielen Punkten besteht, quetscht er sich dadurch von selbst durch enge
 * Spalten und legt sich über Kanten. */
function collide(b, k, world, P, dt) {
  const p = b.pos, v = b.vel;

  if (p[k + 1] < P.radius * 0.04) {
    b.contacts++;
    // Haftung als Rate pro Sekunde, nicht pro Schritt — sonst hängt das
    // Bremsverhalten an der Anzahl der Substeps.
    const g = Math.exp(-P.groundGrip * dt);
    v[k] *= g;
    v[k + 2] *= g;
    // Notbremse gegen Durchsacken; die Bodenfeder macht die eigentliche Arbeit.
    if (p[k + 1] < -P.radius * 0.30) {
      p[k + 1] = -P.radius * 0.30;
      if (v[k + 1] < 0) v[k + 1] = -v[k + 1] * P.bounce;
    }
  }

  for (const o of world.obstacles) {
    if (o.type === 'rock') {
      const dx = p[k] - o.x, dy = p[k + 1] - o.y, dz = p[k + 2] - o.z;
      const d = Math.hypot(dx, dy, dz);
      if (d >= o.r || d < 1e-6) continue;
      const nx = dx / d, ny = dy / d, nz = dz / d;
      const pen = o.r - d;
      p[k] += nx * pen; p[k + 1] += ny * pen; p[k + 2] += nz * pen;
      pushOut(v, k, nx, ny, nz, P, dt);
      b.contacts++;
    } else {
      const hx = o.w * 0.5, hy = o.h * 0.5, hz = o.d * 0.5;
      const dx = p[k] - o.x, dy = p[k + 1] - o.y, dz = p[k + 2] - o.z;
      if (Math.abs(dx) > hx || Math.abs(dy) > hy || Math.abs(dz) > hz) continue;
      const ox = hx - Math.abs(dx), oy = hy - Math.abs(dy), oz = hz - Math.abs(dz);
      let nx = 0, ny = 0, nz = 0, pen;
      if (ox <= oy && ox <= oz)      { nx = Math.sign(dx) || 1; pen = ox; }
      else if (oy <= ox && oy <= oz) { ny = Math.sign(dy) || 1; pen = oy; }
      else                           { nz = Math.sign(dz) || 1; pen = oz; }
      p[k] += nx * pen; p[k + 1] += ny * pen; p[k + 2] += nz * pen;
      pushOut(v, k, nx, ny, nz, P, dt);
      b.contacts++;
    }
  }

  const w = world.bounds;
  if (p[k] < -w) { p[k] = -w; v[k] = Math.abs(v[k]) * P.bounce; }
  if (p[k] > w)  { p[k] = w;  v[k] = -Math.abs(v[k]) * P.bounce; }
  if (p[k + 2] < -w) { p[k + 2] = -w; v[k + 2] = Math.abs(v[k + 2]) * P.bounce; }
  if (p[k + 2] > w)  { p[k + 2] = w;  v[k + 2] = -Math.abs(v[k + 2]) * P.bounce; }
}

function pushOut(v, k, nx, ny, nz, P, dt) {
  const vn = v[k] * nx + v[k + 1] * ny + v[k + 2] * nz;
  if (vn >= 0) return;
  v[k] -= vn * nx * (1 + P.bounce);
  v[k + 1] -= vn * ny * (1 + P.bounce);
  v[k + 2] -= vn * nz * (1 + P.bounce);
  const dot = v[k] * nx + v[k + 1] * ny + v[k + 2] * nz;
  const damp = 1 - Math.exp(-P.wallFriction * dt);
  v[k] -= (v[k] - dot * nx) * damp;
  v[k + 1] -= (v[k + 1] - dot * ny) * damp;
  v[k + 2] -= (v[k + 2] - dot * nz) * damp;
}
