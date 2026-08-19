'use strict';

/* ---------------------------------------------------------------------------
 * Charaktererstellung — "Schleim erstellen", Punkt 1 der Abnahmeliste
 * GDD 01 §70. Quellen: GDD 01 §7 (Gesicht), §8 (Fraktionsfarbe), §57
 * (was anpassbar ist) und GDD 10 §127–130 (Ablauf, Fraktionswahl, Klarheit).
 *
 * BESITZER: Lane CHARAKTER — nur charakter.js und charakter.css.
 *
 * Drei Entscheidungen liegen dem Aufbau zugrunde:
 *
 * 1. Vorschau ist der echte Schleim, kein Bild davon. Das Fenster legt sich
 *    als Spalte über die laufende Szene und stellt die Kamera dicht vor das
 *    Gesicht. Wer hier "Ravok" wählt, sieht denselben Körper rot werden, den
 *    er gleich spielt — nichts wird zweimal gebaut und kann auseinanderlaufen.
 *
 * 2. Die Farbe ist keine Auswahl (GDD 01 §8). Sie steht als Folge neben der
 *    Fraktion, nicht als eigener Regler. Deshalb zeigt die Fraktionskarte den
 *    Farbfleck als Merkmal an, und es gibt keinen Farbwähler.
 *
 * 3. Das Gesicht wird als Zustand geschrieben, nicht als Grafik. Gespeichert
 *    werden nur Kennungen (`G.spieler.gesicht`); wie daraus Augen, Mund und
 *    Nase werden, entscheidet allein die Zeichenseite. Solange renderer.js
 *    diesen Zustand nicht liest, zeichnet der Erweiterungspunkt R.extras die
 *    unterscheidenden Merkmale nach (ARCHITEKTUR.md §5) — siehe unten.
 *
 * Im Aufnahmemodus (?capture=1) erscheint das Fenster nie und localStorage
 * wird nicht gelesen: eine Aufnahme darf nicht davon abhängen, was auf der
 * aufnehmenden Maschine gespeichert ist.
 * ------------------------------------------------------------------------- */

const Charakter = (() => {

  const SCHLUESSEL = 'slimoria.charakter.v1';
  const AUFNAHME = new URLSearchParams(location.search).has('capture');

  /* --- Auswahltabellen ---------------------------------------------------- */

  /* Fraktionen. Zahlen und Namen stammen aus der kanonischen Kurzreferenz
   * (Doc/gdd/README.md §3): Valoria und Drakhar sind Städte, nicht Fraktionen. */
  const FRAKTIONEN = [
    {
      id: 'eldoran', name: 'Eldoran', farbwort: 'Blau',
      farbe: '#3aa0f5', farbe2: '#9fe4ff',
      hauptstadt: 'Valoria', anfuehrer: 'König Aldric',
      werte: 'Ordnung · Glaube · Schutz',
      start: 'Wald, Wiesen, Flüsse',
    },
    {
      id: 'ravok', name: 'Ravok', farbwort: 'Rot',
      farbe: '#ef4038', farbe2: '#ffab98',
      hauptstadt: 'Drakhar', anfuehrer: 'Häuptling Ragor',
      werte: 'Stärke · Freiheit · Ehre',
      start: 'Brachland, Küste',
    },
  ];

  /* Gesichtsvarianten (GDD 01 §57: Augen, Mund, Nase).
   *
   * Jede Variante ist eine Zahlentabelle, keine Zeichenanweisung. Die Werte
   * sind Vielfache des Augen- bzw. Körperradius, damit das Gesicht beim
   * Levelwachstum mitwächst statt sich zu verschieben. Genau diese Tabellen
   * braucht auch renderer.js, sobald es den Zustand selbst liest — deshalb
   * stehen sie hier und nicht im Zeichencode. */
  const AUGEN = [
    { id: 'rund',    name: 'Rund',
      beschreibung: 'Der Standardblick — groß, offen, freundlich.',
      groesse: 1.00, glanz: 1.00, braue: 0, brauenWinkel: 0, brauenHoehe: 0 },
    { id: 'gross',   name: 'Groß',
      beschreibung: 'Deutlich größere Augen. Wirkt jung und neugierig.',
      groesse: 1.34, glanz: 1.30, braue: 0, brauenWinkel: 0, brauenHoehe: 0 },
    { id: 'wach',    name: 'Wach',
      beschreibung: 'Hoch gezogene Brauen über runden Augen.',
      groesse: 1.00, glanz: 1.15, braue: 1, brauenWinkel: -0.13, brauenHoehe: 1.25 },
    { id: 'grimmig', name: 'Grimmig',
      beschreibung: 'Schräg nach innen fallende Brauen.',
      groesse: 1.00, glanz: 0.90, braue: 1, brauenWinkel: 0.42, brauenHoehe: 0.95 },
  ];

  const MUND = [
    { id: 'laecheln', name: 'Lächeln',
      beschreibung: 'Ein schlichter, breiter Bogen.',
      breite: 0.40, dicke: 1.00, zaehne: 0, schief: 0 },
    { id: 'breit',    name: 'Breit',
      beschreibung: 'Zieht sich fast über das halbe Gesicht.',
      breite: 0.68, dicke: 1.25, zaehne: 0, schief: 0 },
    { id: 'zaehne',   name: 'Zähne',
      beschreibung: 'Zwei helle Eckzähne sitzen im Bogen.',
      breite: 0.46, dicke: 1.10, zaehne: 1, schief: 0 },
    { id: 'schief',   name: 'Schief',
      beschreibung: 'Ein Mundwinkel steht höher als der andere.',
      breite: 0.44, dicke: 1.05, zaehne: 0, schief: 1 },
  ];

  const NASE = [
    { id: 'keine', name: 'Keine',
      beschreibung: 'Nur Augen und Mund.',
      breit: 0, hoch: 0, sitz: 0, glanz: 0 },
    { id: 'knopf', name: 'Knopf',
      beschreibung: 'Kleine runde Wölbung zwischen den Augen.',
      breit: 0.140, hoch: 0.135, sitz: 0.11, glanz: 1 },
    { id: 'stups', name: 'Stups',
      beschreibung: 'Sitzt höher und zeigt nach oben.',
      breit: 0.155, hoch: 0.115, sitz: 0.15, glanz: 1 },
    { id: 'breit', name: 'Breit',
      beschreibung: 'Flach und breit über dem Mund.',
      breit: 0.210, hoch: 0.090, sitz: 0.08, glanz: 0 },
  ];

  const TABELLEN = { augen: AUGEN, mund: MUND, nase: NASE };
  const STANDARD = { name: 'Glibb', faction: 'eldoran',
                     gesicht: { augen: 'rund', mund: 'laecheln', nase: 'knopf' } };

  const finde = (art, id) => TABELLEN[art].find(v => v.id === id) || TABELLEN[art][0];

  /* Aufgelöste Zahlen zu einer Auswahl. Das ist die Schnittstelle für jeden,
   * der das Gesicht zeichnet — inklusive renderer.js. */
  function werte(g) {
    const q = g || STANDARD.gesicht;
    return { augen: finde('augen', q.augen), mund: finde('mund', q.mund), nase: finde('nase', q.nase) };
  }

  /* --- Zustand schreiben --------------------------------------------------- */

  let entwurf = null;                 // Auswahl, solange das Fenster offen ist
  let offen = false;
  let kameraVorher = null;
  let schleife = 0;
  let wuerfelZustand = 0x9e3779b9;    // eigener Zähler: RNG.next() gehört der Simulation

  function saeubern(c) {
    const q = (c && c.gesicht) || {};
    return {
      name: String((c && c.name) || STANDARD.name).slice(0, 14).trim() || STANDARD.name,
      faction: FRAKTIONEN.some(f => f.id === (c && c.faction)) ? c.faction : STANDARD.faction,
      gesicht: {
        augen: finde('augen', q.augen).id,
        mund: finde('mund', q.mund).id,
        nase: finde('nase', q.nase).id,
      },
    };
  }

  /* Einzige Stelle, die den Spielzustand anfasst. */
  function anwenden(c) {
    const rein = saeubern(c);
    G.spieler.name = rein.name;
    G.spieler.faction = rein.faction;
    G.spieler.gesicht = rein.gesicht;

    // Die HUD-Fraktionsfarbe hängt an diesem Attribut (ui.css §134).
    document.body.dataset.faction = rein.faction;

    // Der Umschalter im Tuning-Panel würde sonst eine falsche Fraktion melden.
    const knopf = document.getElementById('btn-faction');
    if (knopf) knopf.textContent = fraktion(rein.faction).name;

    return rein;
  }

  const fraktion = (id) => FRAKTIONEN.find(f => f.id === id) || FRAKTIONEN[0];

  function speichern(c) {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(c)); } catch (e) { /* privater Modus */ }
  }

  function laden() {
    if (AUFNAHME) return null;
    try {
      const roh = localStorage.getItem(SCHLUESSEL);
      return roh ? saeubern(JSON.parse(roh)) : null;
    } catch (e) { return null; }
  }

  function verwerfen() {
    try { localStorage.removeItem(SCHLUESSEL); } catch (e) { /* egal */ }
  }

  /* --- Fenster ------------------------------------------------------------- */

  let wurzel = null;
  const el = {};

  function bauen() {
    if (wurzel) return;
    wurzel = document.createElement('div');
    wurzel.id = 'charakter';
    wurzel.className = 'zu';
    wurzel.innerHTML = `
      <div class="ch-spalte">
        <div class="ch-kopf">
          <div class="ch-marke">SLIMORIA</div>
          <h1>Schleim erstellen</h1>
          <p class="ch-unter">Name, Fraktion und Gesicht. Alles andere wächst im Spiel.</p>
        </div>

        <div class="ch-block">
          <div class="ch-titel">Name</div>
          <input id="ch-name" type="text" maxlength="14" autocomplete="off" spellcheck="false"
                 placeholder="Wie heißt dein Schleim?">
          <div class="ch-fehler" id="ch-namefehler"></div>
        </div>

        <div class="ch-block">
          <div class="ch-titel">Fraktion</div>
          <div class="ch-karten" id="ch-fraktionen"></div>
          <div class="ch-notiz">
            Die Fraktion bestimmt deine Ausgangswelt <b>und deine Farbe</b>.
            Die Farbe ist nicht frei wählbar (GDD 01 §8).
          </div>
        </div>

        <div class="ch-block">
          <div class="ch-titel">Gesicht</div>
          <div id="ch-gesicht"></div>
        </div>

        <div class="ch-fuss">
          <div class="ch-zusammen" id="ch-zusammen"></div>
          <div class="ch-knoepfe">
            <button type="button" id="ch-wuerfeln" class="ch-neben">Würfeln</button>
            <button type="button" id="ch-start" class="ch-haupt">In die Welt</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wurzel);

    el.name = wurzel.querySelector('#ch-name');
    el.namefehler = wurzel.querySelector('#ch-namefehler');
    el.fraktionen = wurzel.querySelector('#ch-fraktionen');
    el.gesicht = wurzel.querySelector('#ch-gesicht');
    el.zusammen = wurzel.querySelector('#ch-zusammen');

    for (const f of FRAKTIONEN) {
      const k = document.createElement('button');
      k.type = 'button';
      k.className = 'ch-karte';
      k.dataset.id = f.id;
      k.style.setProperty('--akzent', f.farbe);
      k.innerHTML = `
        <span class="ch-klecks"></span>
        <span class="ch-kname">${f.name}</span>
        <span class="ch-kfarbe">${f.farbwort}er Schleim</span>
        <span class="ch-kzeile"><b>Hauptstadt</b>${f.hauptstadt}</span>
        <span class="ch-kzeile"><b>Anführer</b>${f.anfuehrer}</span>
        <span class="ch-kzeile"><b>Werte</b>${f.werte}</span>
        <span class="ch-kzeile"><b>Start</b>${f.start}</span>
      `;
      k.addEventListener('click', () => { entwurf.faction = f.id; auffrischen(); });
      el.fraktionen.appendChild(k);
    }

    for (const art of ['augen', 'mund', 'nase']) {
      const beschriftung = { augen: 'Augen', mund: 'Mund', nase: 'Nase' }[art];
      const reihe = document.createElement('div');
      reihe.className = 'ch-reihe';
      reihe.dataset.art = art;
      reihe.innerHTML = `
        <div class="ch-rname">${beschriftung}</div>
        <div class="ch-waehler">
          <button type="button" class="ch-pfeil" data-schritt="-1" aria-label="vorherige ${beschriftung}">‹</button>
          <div class="ch-wert">
            <span class="ch-vname"></span>
            <span class="ch-punkte"></span>
          </div>
          <button type="button" class="ch-pfeil" data-schritt="1" aria-label="nächste ${beschriftung}">›</button>
        </div>
        <div class="ch-rtext"></div>
      `;
      reihe.querySelectorAll('.ch-pfeil').forEach(b =>
        b.addEventListener('click', () => blaettern(art, parseInt(b.dataset.schritt, 10))));
      el.gesicht.appendChild(reihe);
    }

    el.name.addEventListener('input', () => { entwurf.name = el.name.value; auffrischen(); });
    el.name.addEventListener('keydown', (e) => { if (e.key === 'Enter') fertig(); });
    wurzel.querySelector('#ch-wuerfeln').addEventListener('click', wuerfeln);
    wurzel.querySelector('#ch-start').addEventListener('click', fertig);

    /* Tastatur abfangen, solange das Fenster offen ist. main.js hängt seine
     * Hörer in der Blasenphase am Fenster auf — eine "1" im Namensfeld würde
     * sonst eine Fähigkeit auslösen, ein "r" die Welt zurücksetzen. Die
     * Erfassungsphase läuft davor, unabhängig von der Ladereihenfolge. */
    for (const art of ['keydown', 'keyup', 'keypress']) {
      window.addEventListener(art, (e) => {
        if (!offen) return;
        if (e.key === 'Escape') e.preventDefault();     // kein Weg an der Erstellung vorbei
        e.stopImmediatePropagation();
      }, true);
    }
  }

  /* "C" öffnet die Erstellung erneut. Die Taste ist in main.js frei, und ohne
   * sie käme man nach dem ersten Speichern nie wieder an das Fenster. */
  window.addEventListener('keydown', (e) => {
    if (!AUFNAHME && !offen && e.key.toLowerCase() === 'c') oeffnen(saeubern(G.spieler));
  });

  function blaettern(art, schritt) {
    const liste = TABELLEN[art];
    const i = liste.findIndex(v => v.id === entwurf.gesicht[art]);
    entwurf.gesicht[art] = liste[(i + schritt + liste.length) % liste.length].id;
    auffrischen();
  }

  /* Eigener Zähler statt RNG.next(): der gesäte Generator gehört der
   * Simulation, und ein Klick im Menü darf ihre Abfolge nicht verschieben. */
  function wuerfelZahl(n) {
    let x = wuerfelZustand;
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    wuerfelZustand = x;
    return x % n;
  }

  function wuerfeln() {
    for (const art of ['augen', 'mund', 'nase']) {
      entwurf.gesicht[art] = TABELLEN[art][wuerfelZahl(TABELLEN[art].length)].id;
    }
    auffrischen();
  }

  const NAME_ERLAUBT = /^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u;

  function namePruefen(roh) {
    const n = String(roh || '').trim();
    if (n.length < 2) return { ok: false, text: 'Mindestens zwei Zeichen.' };
    if (n.length > 14) return { ok: false, text: 'Höchstens vierzehn Zeichen.' };
    if (!NAME_ERLAUBT.test(n)) return { ok: false, text: 'Nur Buchstaben, Ziffern, Leer- und Bindestrich.' };
    return { ok: true, name: n };
  }

  /* Anzeige und Vorschau auf den Stand des Entwurfs bringen. Ein Weg für
   * beides: was im Fenster steht, ist immer das, was der Schleim gerade zeigt
   * (GDD 10 §130 — vor dem Abschluss muss alles sichtbar sein). */
  function auffrischen() {
    const f = fraktion(entwurf.faction);
    wurzel.style.setProperty('--akzent', f.farbe);
    wurzel.style.setProperty('--akzent-hell', f.farbe2);

    if (el.name.value !== entwurf.name) el.name.value = entwurf.name;
    const pruef = namePruefen(entwurf.name);
    el.namefehler.textContent = entwurf.name.trim().length ? (pruef.ok ? '' : pruef.text) : '';
    el.name.classList.toggle('falsch', entwurf.name.trim().length > 0 && !pruef.ok);

    el.fraktionen.querySelectorAll('.ch-karte').forEach(k =>
      k.classList.toggle('gewaehlt', k.dataset.id === entwurf.faction));

    for (const reihe of el.gesicht.children) {
      const art = reihe.dataset.art;
      const liste = TABELLEN[art];
      const i = liste.findIndex(v => v.id === entwurf.gesicht[art]);
      reihe.querySelector('.ch-vname').textContent = liste[i].name;
      reihe.querySelector('.ch-rtext').textContent = liste[i].beschreibung;
      reihe.querySelector('.ch-punkte').innerHTML =
        liste.map((_, j) => `<i class="${j === i ? 'an' : ''}"></i>`).join('');
    }

    // Zusammenfassung über textContent: der Name kommt vom Spieler und hat in
    // keiner Vorlage etwas verloren.
    const w = werte(entwurf.gesicht);
    if (!el.zusammen.firstElementChild) {
      el.zusammen.append(document.createElement('b'),
                         document.createElement('span'), document.createElement('span'));
    }
    const [zName, zFraktion, zGesicht] = el.zusammen.children;
    zName.textContent = pruef.ok ? pruef.name : '—';
    zFraktion.textContent = f.name + ' · ' + f.farbwort;
    zGesicht.textContent = w.augen.name + ' · ' + w.mund.name + ' · '
                         + (w.nase.name === 'Keine' ? 'ohne Nase' : w.nase.name);
    wurzel.querySelector('#ch-start').disabled = !pruef.ok;

    // Vorschau: die Auswahl wirkt sofort auf den echten Schleim. Ein noch
    // unfertiger Name geht dabei NICHT in den Spielzustand — sonst stünde
    // während des Tippens ein halber Name im HUD und ginge bei einem Absturz
    // auch noch so in die Speicherung.
    anwenden({ ...entwurf, name: pruef.ok ? pruef.name : (G.spieler.name || STANDARD.name) });
  }

  /* --- Vorschau-Kamera ----------------------------------------------------- */

  /* Der Schleim steht im rechten Bildteil, die Spalte links davon. Der
   * Blickpunkt wandert dafür entlang der Bildschirm-Querachse: der Körper
   * bleibt dann in der Lücke, egal wie weit die Kamera gerade gedreht ist. */
  function kameraSetzen(gier) {
    const b = G.slime.body;
    const rechtsX = Math.sin(gier), rechtsZ = -Math.cos(gier);
    const versatz = PARAMS.radius * 1.55;
    SLIMORIA.api.setCamera({
      follow: false,
      yaw: gier, pitch: 0.19, dist: 3.3 + PARAMS.radius * 2.3,
      tx: b.cx - rechtsX * versatz,
      ty: b.cy + PARAMS.radius * 0.16,
      tz: b.cz - rechtsZ * versatz,
    });
  }

  let gier = 0, letzteZeit = 0;

  function bild(jetzt) {
    if (!offen) return;
    const dt = letzteZeit ? Math.min((jetzt - letzteZeit) / 1000, 0.1) : 0;
    letzteZeit = jetzt;
    // Langsame Drehung: das Gesicht bleibt im Blick, aber man sieht, dass der
    // Körper eine Masse ist und keine Scheibe.
    gier += dt * 0.22;
    kameraSetzen(Math.sin(gier) * 0.55);
    schleife = requestAnimationFrame(bild);
  }

  /* --- Öffnen und Schließen ------------------------------------------------ */

  function oeffnen(vorgabe) {
    if (AUFNAHME || offen) return;
    bauen();
    entwurf = saeubern(vorgabe || laden() || STANDARD);
    offen = true;
    kameraVorher = { yaw: G.kamera.yaw, pitch: G.kamera.pitch, dist: G.kamera.dist, follow: true };
    document.body.classList.add('erstellung');
    wurzel.classList.remove('zu');
    auffrischen();
    letzteZeit = 0;
    schleife = requestAnimationFrame(bild);
    el.name.focus();
    el.name.select();
  }

  function schliessen() {
    if (!offen) return;
    offen = false;
    cancelAnimationFrame(schleife);
    document.body.classList.remove('erstellung');
    if (wurzel) wurzel.classList.add('zu');
    if (kameraVorher) SLIMORIA.api.setCamera(kameraVorher);
    kameraVorher = null;
  }

  function fertig() {
    const pruef = namePruefen(entwurf.name);
    if (!pruef.ok) { el.name.focus(); auffrischen(); return; }
    entwurf.name = pruef.name;
    const fertigC = anwenden(entwurf);
    speichern(fertigC);
    schliessen();
    // Der Körper soll frisch starten, auch wenn während der Erstellung eine
    // Kreatur an ihm genagt hat.
    G.spieler.hp = G.spieler.maxHp;
    if (window.UI && UI.hinweis) UI.hinweis(fertigC.name + ' betritt die Testarena', 'gross');
  }

  /* -------------------------------------------------------------------------
   * Gesicht zeichnen — Übergangslösung
   *
   * renderer.js zeichnet Augen und Mund fest verdrahtet und liest die Auswahl
   * nicht (drawFace, dort gemeldet als BRAUCHT_KERNAENDERUNG). Bis das
   * geschieht, ergänzt dieser Zeichner die unterscheidenden Merkmale über
   * R.extras (ARCHITEKTUR.md §5): die Nase vollständig — renderer.js zeichnet
   * gar keine —, bei Augen und Mund die Teile, die sich zusätzlich auflegen
   * lassen.
   *
   * Zwei Dinge macht er dabei genauso wie renderer.js, weil es sonst wie
   * aufgeklebt aussähe (GDD 01 §7):
   *   - Jedes Teil sitzt auf einem Punkt der TATSÄCHLICH verformten Oberfläche
   *     (surfaceSample) und ist eine flache Linse in deren Tangentialebene.
   *     Verformt sich der Körper, wandert und kippt das Teil mit.
   *   - Gezeichnet wird durchscheinend. Die Erweiterungen laufen nach dem Gel,
   *     also fehlt ihnen dessen Schleier; die konstante Mischung ersetzt ihn,
   *     sodass die Teile im Körper liegen statt darauf.
   * ---------------------------------------------------------------------- */

  const AUGE_HELL   = [0.78, 0.85, 0.92];   // Werte wie in renderer.js drawFace
  const AUGE_DUNKEL = [0.020, 0.035, 0.070];
  const MUND_FARBE  = [0.200, 0.045, 0.060];
  const ZAHN        = [0.93, 0.94, 0.90];

  const _pkt = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };
  const _mm = new Float32Array(16);
  const _nm = new Float32Array(9);
  const _b = { ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 };

  /* Tangentialbasis: u waagerecht auf der Fläche, v quer dazu. Frontal
   * gesehen zeigt u nach rechts und v nach oben. */
  function basis(nx, ny, nz, out) {
    const steil = Math.abs(ny) > 0.92;
    const ay = steil ? 0 : 1, az = steil ? 1 : 0;
    let ux = ay * nz - az * ny, uy = az * nx, uz = -ay * nx;
    const l = Math.hypot(ux, uy, uz) || 1;
    ux /= l; uy /= l; uz /= l;
    out.ux = ux; out.uy = uy; out.uz = uz;
    out.vx = ny * uz - nz * uy;
    out.vy = nz * ux - nx * uz;
    out.vz = nx * uy - ny * ux;
  }

  /* Dieselbe Basis um `winkel` in ihrer eigenen Ebene gedreht — für schräge
   * Brauen. */
  function gedreht(B, winkel, out) {
    const c = Math.cos(winkel), s = Math.sin(winkel);
    out.ux = B.ux * c + B.vx * s; out.uy = B.uy * c + B.vy * s; out.uz = B.uz * c + B.vz * s;
    out.vx = -B.ux * s + B.vx * c; out.vy = -B.uy * s + B.vy * c; out.vz = -B.uz * s + B.vz * c;
    return out;
  }

  /* Ellipsoid mit ru/rv in der Fläche und rn quer dazu: eine Linse, die auf
   * der Oberfläche aufliegt, statt als Kugel davor zu schweben. */
  function linse(px, py, pz, B, nx, ny, nz, ru, rv, rn) {
    _mm[0] = B.ux * ru; _mm[1] = B.uy * ru; _mm[2] = B.uz * ru; _mm[3] = 0;
    _mm[4] = B.vx * rv; _mm[5] = B.vy * rv; _mm[6] = B.vz * rv; _mm[7] = 0;
    _mm[8] = nx * rn;   _mm[9] = ny * rn;   _mm[10] = nz * rn;  _mm[11] = 0;
    _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
    _nm[0] = B.ux / ru; _nm[1] = B.uy / ru; _nm[2] = B.uz / ru;
    _nm[3] = B.vx / rv; _nm[4] = B.vy / rv; _nm[5] = B.vz / rv;
    _nm[6] = nx / rn;   _nm[7] = ny / rn;   _nm[8] = nz / rn;
    return _mm;
  }

  const _b2 = { ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 };

  /* Höhe der Mundlinie an der Stelle t (-1 links, +1 rechts). Dieselbe Kurve
   * wie in renderer.js drawFace, damit beide Bögen deckungsgleich liegen. */
  function mundNeigung(t, offen, M) {
    return -0.13 - (1 - t * t) * 0.14 + offen * 0.05 + (M.schief ? t * 0.075 : 0);
  }

  function zeichnen(gl, ctx) {
    const R = window.SLIMORIA && window.SLIMORIA.R;
    const spiel = ctx.game;
    if (!R || !spiel || !spiel.slime || typeof surfaceSample !== 'function') return;

    // Die Fraktionsfarbe des HUD hängt an diesem Attribut (GDD 10 §134). Sie
    // kann sich auch ohne die Erstellung ändern — etwa über den Umschalter im
    // Tuning-Panel —, deshalb wird sie hier gegen den Zustand abgeglichen.
    if (document.body.dataset.faction !== spiel.spieler.faction) {
      document.body.dataset.faction = spiel.spieler.faction;
    }

    const w = werte(spiel.spieler && spiel.spieler.gesicht);
    const s = spiel.slime, b = s.body, P = ctx.params;
    const cam = ctx.cam, vp = ctx.viewProj;
    const rE = P.radius * 0.30;
    const rK = P.radius;
    const blinzeln = Math.min(Math.max((s.blink || 0) / 0.07, 0), 1);

    /* Konstante Mischung statt Quellalpha: der Volltonshader liefert kein
     * Alpha. Der Wert ist je Gruppe verschieden — ein Auge, das eines des
     * Renderers ersetzt, muss es DECKEN, eine Nase dagegen nur andeuten. */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
    gl.depthMask(false);
    const schleier = (a) => gl.blendColor(0, 0, 0, a);

    const teil = (d, ab, quer, hoch, B, ru, rv, rn, farbe, glanz, leuchten) => {
      surfaceSample(b, d.x, d.y, d.z, _pkt);
      const nx = _pkt.nx, ny = _pkt.ny, nz = _pkt.nz;
      basis(nx, ny, nz, _b);
      const BB = B === undefined ? _b : B(_b);
      const px = _pkt.x - nx * ab + BB.ux * quer + BB.vx * hoch;
      const py = _pkt.y - ny * ab + BB.uy * quer + BB.vy * hoch;
      const pz = _pkt.z - nz * ab + BB.uz * quer + BB.vz * hoch;
      R.drawProp(R.propMesh, linse(px, py, pz, BB, nx, ny, nz, ru, rv, rn),
                 _nm, farbe, glanz, leuchten, cam, vp);
    };

    /* --- Augen ------------------------------------------------------------ */
    const A = w.augen;
    for (const seite of [-1, 1]) {
      const d = faceDir(s, seite * 0.60, 0.30);

      if (A.groesse > 1.02) {
        /* Ein größeres Auge muss das des Renderers vollständig verdecken,
         * sonst schimmern zwei Lichtpunkte durch und aus dem Blick wird
         * Schmuck. Deshalb hier fast deckend — der Gel-Schleier steckt in dem,
         * was darunter schon liegt. */
        schleier(0.86);
        const r = rE * A.groesse;
        const rn = rE * 0.28;
        teil(d, rE * 0.36, 0, 0, undefined, r, r * (1 - 0.9 * blinzeln), rn,
             AUGE_HELL, 0.3, 0.40);
        teil(d, rE * 0.18, 0, 0, undefined, r * 0.88,
             Math.max(r * 0.88 * (1 - 0.92 * blinzeln), rE * 0.03), rn * 0.85,
             AUGE_DUNKEL, 0.6, 0.78);
        if (blinzeln < 0.55) {
          const gr = rE * 0.19 * A.glanz;
          teil(d, rE * 0.02, -r * 0.37, r * 0.37, undefined, gr, gr, rn * 0.5,
               [1, 1, 1], 1.0, 0.95);
        }
      }

      if (A.braue) {
        /* Die Braue sitzt auf einem EIGENEN Blickpunkt über dem Auge, nicht auf
         * einem Versatz in dessen Tangentialebene: auf der gewölbten Stirn läuft
         * ein tangentialer Versatz von der Kugel weg und die Braue rutscht auf
         * den Scheitel. Innen fällt sie tiefer als außen — das ist die ganze
         * Aussage einer Braue, und die Richtung ist je Auge gespiegelt. */
        schleier(0.70);
        const dB = faceDir(s, seite * 0.58, 0.30 + A.brauenHoehe * 0.30);
        const dreh = (B) => gedreht(B, -A.brauenWinkel * seite, _b2);
        teil(dB, rE * 0.02, 0, 0, dreh,
             rE * 0.92, rE * 0.15, rE * 0.20, AUGE_DUNKEL, 0.35, 0.55);
      }
    }

    /* --- Mund ------------------------------------------------------------- */
    const M = w.mund;
    const offenM = s.mouth || 0;
    if (M.breite > 0.42 || M.dicke > 1.02) {
      // Ein Bogen aus überlappenden Linsen, wie in renderer.js — einzeln
      // erkennbare Glieder ergäben eine Perlenkette statt einer Form.
      schleier(0.82);
      // Mehr Glieder, je breiter der Bogen: bei gleicher Zahl klaffen sie
      // auseinander und aus der Form wird eine Perlenkette.
      const n = Math.round(15 * (M.breite / 0.40)) + 2;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1;
        const gierM = t * M.breite;
        const neigung = mundNeigung(t, offenM, M);
        const d = faceDir(s, gierM, neigung);
        const ru = rK * 0.115;
        const rv = rK * (0.055 * M.dicke + offenM * 0.24 * (1 - t * t * 0.55));
        teil(d, rK * 0.045, 0, 0, undefined, ru, rv, rK * 0.055, MUND_FARBE, 0.4, 0.72);
      }
    }
    if (M.zaehne) {
      /* Die Zähne müssen den Bogen BERÜHREN. Frei darüber schwebend liest man
       * sie als zwei Tropfen, nicht als Gebiss — deshalb sitzen sie auf der
       * Bogenlinie und ragen nur nach oben heraus. */
      schleier(0.78);
      const tz = 0.17 / M.breite;
      for (const seite of [-1, 1]) {
        const d = faceDir(s, seite * 0.17, mundNeigung(seite * tz, offenM, M));
        teil(d, rK * 0.030, 0, rK * 0.030, undefined,
             rK * 0.036, rK * 0.050, rK * 0.030, ZAHN, 0.7, 0.55);
      }
    }

    /* --- Nase ------------------------------------------------------------- */
    const N = w.nase;
    if (N.breit > 0) {
      /* Eine Nase ist eine Wölbung des Körpers, kein Fleck darauf (GDD 01 §7).
       * Deshalb: Farbe aus der Fraktionspalette statt einer eigenen, flach in
       * die Haut gelegt statt davor, und nur halb gedeckt — sie soll den Blick
       * nicht vom Augenpaar wegziehen. */
      schleier(0.52);
      const p = ctx.pal.mid, q = ctx.pal.deep;
      const nasenfarbe = [p[0] * 0.35 + q[0] * 0.65, p[1] * 0.35 + q[1] * 0.65,
                          p[2] * 0.35 + q[2] * 0.65];
      // Der offene Mund waechst nach oben und wuerde die Nase verschlucken.
      // Sie weicht ihm aus — so, wie sich beim Aufreissen des Mauls das halbe
      // Gesicht mitzieht.
      const d = faceDir(s, 0, N.sitz + offenM * 0.16);
      teil(d, rK * 0.030, 0, 0, undefined, rK * N.breit, rK * N.hoch, rK * 0.030,
           nasenfarbe, 0.55, 0.22);
      if (N.glanz > 0) {
        schleier(0.42);
        const gr = rK * N.hoch * 0.30;
        teil(d, rK * 0.005, -rK * N.breit * 0.26, rK * N.hoch * 0.30, undefined,
             gr, gr * 0.80, rK * 0.014, [1, 1, 1], 1.0, 0.9);
      }
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  function zeichnerAnmelden() {
    const R = window.SLIMORIA && window.SLIMORIA.R;
    if (!R || !R.extras || R.extras.some(e => e.name === 'charakter-gesicht')) return;
    R.extras.push({ name: 'charakter-gesicht', order: 5, draw: zeichnen });
  }

  /* --- Start ---------------------------------------------------------------- */

  function starten() {
    zeichnerAnmelden();
    const gespeichert = laden();
    if (AUFNAHME) { anwenden(STANDARD); return; }
    if (gespeichert) { anwenden(gespeichert); return; }   // Neustart überstanden
    oeffnen(STANDARD);
  }

  // Bis main.js gelaufen ist, gibt es weder Renderer noch Kamera.
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', starten);
  } else {
    starten();
  }

  return {
    get offen() { return offen; },
    oeffnen, schliessen,
    anwenden, werte, laden, speichern, verwerfen,
    FRAKTIONEN, AUGEN, MUND, NASE, STANDARD,
    // Für die Konsole: Charakter.neu() startet die Erstellung noch einmal.
    neu() { verwerfen(); oeffnen(saeubern({ ...STANDARD, ...G.spieler })); },
  };
})();

window.Charakter = Charakter;
