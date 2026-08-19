'use strict';

/* ---------------------------------------------------------------------------
 * Netzschicht des Clients.
 *
 * BESITZER: Lane NETZ. Sie haengt sich an den gesperrten Kern an, statt ihn
 * umzubauen (ARCHITEKTUR.md §1/§7): solange keine Verbindung steht, passiert
 * hier nichts und der Prototyp verhaelt sich exakt wie vorher. Das ist
 * Bedingung, weil alle Aufnahmen offline und deterministisch laufen muessen.
 *
 * Steht eine Verbindung, gilt die Rollenverteilung aus GDD 11 §120:
 *
 *   Der Server fuehrt  HP, XP, Level, Kreaturen, Tod, Respawn und den
 *                      Fresswuerfel.
 *   Der Client zeigt   Bewegung (vorhergesagt, weich korrigiert, GDD 11 §22–25)
 *                      und spielt Animationen zu dem, was der Server meldet
 *                      (GDD 11 §39: uebertragen wird Zustand, kein Mesh).
 *
 * Der Fressversuch ist der Punkt, an dem das zaehlt (GDD 11 §33–35): der
 * Client schickt "ich will Ziel X fressen" und sonst nichts. Chance und Wurf
 * entstehen im Server. Wer hier im Client die Chance manipuliert, aendert
 * nichts am Ergebnis — genau das weist tools/zweispieler.mjs nach.
 *
 * Verbunden wird von selbst, sobald die Seite geladen ist. Frueher brauchte
 * es dafuer `?server=auto` an der Adresse — wer den Prototyp einfach oeffnete,
 * spielte gegen die Client-Logik, obwohl ein Server lief. Antwortet niemand,
 * faellt der Client still in den Einzelspielerbetrieb zurueck; in welchem der
 * beiden Zustaende man spielt, steht oben links in der Ecke.
 *
 * Im Aufnahmemodus (?capture=1) wird NIEMALS verbunden. Aufnahmen laufen
 * offline und muessen bildgleich wiederholbar bleiben (ARCHITEKTUR §2).
 * ------------------------------------------------------------------------- */

const Netz = (() => {

  const SENDE_HZ = 20;             // Positionsmeldungen je Sekunde
  const KORREKTUR_K = 4.0;         // Haerte der Korrektur (1/s)
  const KORREKTUR_MAX = 4.0;       // hoechstens so viele Einheiten je Sekunde
  const KORREKTUR_ENDE = 0.004;    // darunter gilt der Fehler als erledigt
  const SPRUNG_AB = 7.0;           // darueber ist es kein Nachziehen mehr
  const VERLAUF_MAX = 240;         // Positionsmeldungen im Gedaechtnis
  const FRESS_GEDULD = 3.0;        // Sekunden auf die Serverantwort
  const STANDARD_PORT = 8790;
  const START_FRIST = 1800;        // ms, die der Startversuch auf den Server wartet

  const AUFNAHME = new URLSearchParams(location.search).has('capture');

  let ws = null;
  let aufbau = null;               // laufender Verbindungsaufbau
  let aktuell = null;              // {url, name} der stehenden Verbindung
  let verbunden = false;
  let selbstId = null;
  let charakter = null;
  let testModus = false;
  let letzterZustand = null;
  let ersterZustand = true;

  const andere = new Map();        // id -> Darstellung eines fremden Schleims
  const horcher = [];              // Rueckrufe aus beiZustand()
  const fressProtokoll = [];       // alle Serverurteile dieser Sitzung
  let letztesFressErgebnis = null;

  /* Die urspruenglichen Funktionen des gesperrten Kerns. Beim Trennen wird
   * alles zurueckgehaengt, damit der Offline-Betrieb unveraendert weiterlaeuft. */
  const echt = {};

  let sendeAkku = 0;
  let serverPos = null;
  let folgeNr = 0;                 // laufende Nummer der Positionsmeldungen
  const verlauf = [];              // {n, x, z} — was der Client damals glaubte
  const restfehler = { x: 0, z: 0 };
  let letzterZwang = 0;
  let fressOffen = null;
  let laufendeAnimation = null;    // Kreatur, deren Fressanimation gerade laeuft

  /* Der gesperrte Kern rechnet den Ausgang eines Fressversuchs am Ende der
   * Animation selbst ab (game.js fressenAbgeschlossen) und zeigt dabei XP
   * bzw. Schaden an. Der Server meldet dasselbe Ergebnis noch einmal — die
   * Zahlen sind identisch, angezeigt gehoert die Meldung aber nur einmal.
   * Diese Marken schlucken genau die eine doppelte Anzeige. */
  const doppelt = { xp: false, schaden: false };
  let zielLokal = null, zielQuittung = 0;
  let angriffLokal = false, angriffQuittung = 0;
  let extraDrin = false;
  let testMarke = 1;
  const testOffen = new Map();

  const statistik = { zustaende: 0, gesendet: 0, schritte: 0, korrekturen: 0, korrekturWeg: 0, fressversuche: 0 };

  /* --- Verbindung ---------------------------------------------------------
   *
   * Ein ausdruecklicher `verbinden` schlaegt immer den laufenden Startversuch:
   * der Aufrufer kennt die Adresse, der Startversuch hat nur geraten. Ohne das
   * bekaeme tools/zweispieler.mjs ein `false` zurueck, nur weil der stille
   * Versuch auf den Standardport noch offen ist. */

  function stillLegen(s) {
    if (!s) return;
    try { s.onopen = s.onmessage = s.onerror = s.onclose = null; s.close(); } catch {}
  }

  function verbinden(url, name = 'Glibb', opts = {}) {
    if (aufbau) aufbau.abbrechen();
    if (verbunden) {
      if (aktuell && aktuell.url === url && aktuell.name === name) return Promise.resolve(true);
      trennen();
    }

    return new Promise((fertig) => {
      let s;
      try { s = new WebSocket(url); }
      catch (e) { lageZeigen('einzel'); return fertig(false); }

      ws = s;
      lageZeigen('warten');
      let entschieden = false;

      const antworten = (v) => {
        if (entschieden) return;
        entschieden = true;
        clearTimeout(frist);
        if (aufbau && aufbau.sock === s) aufbau = null;
        fertig(v);
      };

      const abbrechen = () => {
        if (entschieden) return;
        stillLegen(s);
        if (ws === s) { ws = null; lageZeigen('einzel'); }
        antworten(false);
      };

      /* Zeitgrenze nur fuer den Verbindungsaufbau. Das ist Transport, keine
       * Spiel-Logik — in der Simulation gibt es weiterhin keinen Timer. */
      const frist = setTimeout(abbrechen, opts.frist || 4000);
      aufbau = { sock: s, abbrechen };

      s.onerror = () => { if (ws === s && !verbunden) abbrechen(); };

      s.onclose = () => {
        if (ws !== s) { antworten(false); return; }   // schon abgeloest
        if (verbunden) ausklinken();
        ws = null;
        lageZeigen('einzel');
        antworten(false);
      };

      s.onopen = () => {
        s.send(JSON.stringify({
          typ: 'beitreten',
          name,
          faction: opts.faction || G.spieler.faction,
        }));
      };

      s.onmessage = (ev) => {
        let m;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.typ === 'willkommen') {
          selbstId = m.selbst;
          charakter = m.charakter;
          testModus = !!m.testModus;
          einklinken();
          verbunden = true;
          aktuell = { url, name };
          lageZeigen('server');
          antworten(true);
          return;
        }
        nachricht(m);
      };
    });
  }

  function trennen() {
    if (aufbau) aufbau.abbrechen();
    const s = ws;
    ws = null;
    stillLegen(s);
    if (verbunden) ausklinken();
    lageZeigen('einzel');
  }

  /* --- Anzeige: gegen wen spiele ich gerade? ------------------------------
   *
   * Serverautoritativ oder Einzelspieler sieht im Bild identisch aus, und der
   * Unterschied entscheidet, ob ein Fressversuch vom Server kommt. Deshalb
   * eine kleine, feste Marke statt einer Meldung, die nach zwei Sekunden weg
   * ist. Sie baut sich selbst: ui.css gehoert einer anderen Lane. */

  const LAGEN = {
    warten: { text: 'Suche Server …', punkt: '#8fa3bd', rand: 'rgba(140,160,190,.35)' },
    server: { text: 'Server',         punkt: '#6ee7a0', rand: 'rgba(110,231,160,.40)' },
    einzel: { text: 'Einzelspieler',  punkt: '#e8b25a', rand: 'rgba(232,178,90,.40)' },
  };
  let lageEl = null;

  function lageZeigen(welche) {
    if (AUFNAHME || !document.body) return;         // Aufnahmen bleiben unberuehrt
    const l = LAGEN[welche];
    if (!l) return;
    if (!lageEl) {
      lageEl = document.createElement('div');
      lageEl.id = 'netz-lage';
      lageEl.style.cssText =
        'position:fixed;left:16px;top:14px;z-index:40;pointer-events:none;' +
        'display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:3px;' +
        'background:rgba(8,12,20,.62);font:600 11px/1 system-ui,sans-serif;' +
        'letter-spacing:.6px;text-transform:uppercase;color:#d8e2f0;' +
        'text-shadow:0 1px 2px rgba(0,0,0,.8)';
      const punkt = document.createElement('span');
      punkt.style.cssText = 'width:7px;height:7px;border-radius:50%;flex:none';
      const wort = document.createElement('span');
      lageEl.append(punkt, wort);
      document.body.appendChild(lageEl);
    }
    lageEl.style.border = '1px solid ' + l.rand;
    lageEl.firstChild.style.background = l.punkt;
    lageEl.lastChild.textContent = l.text;
  }

  function senden(typ, daten) {
    if (!ws || ws.readyState !== 1) return false;
    ws.send(JSON.stringify({ typ, ...(daten || {}) }));
    statistik.gesendet++;
    return true;
  }

  /* --- Ein- und Aushaengen ------------------------------------------------ */

  function einklinken() {
    echt.step = window.SLIMORIA.step;
    echt.fressversuch = SPIEL.fressversuch;
    echt.faehigkeitBenutzen = SPIEL.faehigkeitBenutzen;
    echt.kreaturSchaden = SPIEL.kreaturSchaden;
    echt.spielerSchaden = SPIEL.spielerSchaden;
    echt.xpGeben = SPIEL.xpGeben;
    echt.tryEat = window.SLIMORIA.api.tryEat;
    echt.useAbility = window.SLIMORIA.api.useAbility;

    window.SLIMORIA.step = netzSchritt;
    SPIEL.fressversuch = netzFressversuch;
    SPIEL.faehigkeitBenutzen = netzFaehigkeit;
    window.SLIMORIA.api.tryEat = (o) => netzFressversuch(o || {});
    window.SLIMORIA.api.useAbility = (slot) => netzFaehigkeit(slot);

    /* Wirkung gehoert dem Server. Die lokalen Rechenwege bleiben als
     * Animation bestehen, richten aber keinen Schaden mehr an und vergeben
     * keine Erfahrung — sonst wuerde der Client mitrechnen und der Zustand
     * flackerte zwischen Vermutung und Wahrheit. */
    SPIEL.kreaturSchaden = () => {};
    SPIEL.spielerSchaden = () => {};
    SPIEL.xpGeben = () => {};

    // Die Arena kommt jetzt vom Server — lokale Aufstellung raeumen.
    G.kreaturen.length = 0;
    G.zielId = null;
    G.autoAngriff = false;
    zielLokal = null; angriffLokal = false;
    zielQuittung = 0; angriffQuittung = 0;
    ersterZustand = true;
    serverPos = null;
    sendeAkku = 0;
    folgeNr = 0;
    verlauf.length = 0;
    restfehler.x = 0; restfehler.z = 0;
    letzterZwang = 0;
    doppelt.xp = false; doppelt.schaden = false;
    laufendeAnimation = null;

    extraEinbauen();
  }

  function ausklinken() {
    verbunden = false;
    aktuell = null;
    selbstId = null;
    serverPos = null;
    fressOffen = null;
    laufendeAnimation = null;
    andere.clear();

    if (echt.step) window.SLIMORIA.step = echt.step;
    if (echt.fressversuch) SPIEL.fressversuch = echt.fressversuch;
    if (echt.faehigkeitBenutzen) SPIEL.faehigkeitBenutzen = echt.faehigkeitBenutzen;
    if (echt.kreaturSchaden) SPIEL.kreaturSchaden = echt.kreaturSchaden;
    if (echt.spielerSchaden) SPIEL.spielerSchaden = echt.spielerSchaden;
    if (echt.xpGeben) SPIEL.xpGeben = echt.xpGeben;
    if (echt.tryEat) window.SLIMORIA.api.tryEat = echt.tryEat;
    if (echt.useAbility) window.SLIMORIA.api.useAbility = echt.useAbility;
    for (const k in echt) delete echt[k];

    if (window.UI && UI.hinweis) UI.hinweis('Verbindung getrennt — Einzelspieler');
  }

  /* --- Schritt ------------------------------------------------------------
   * Laeuft NACH dem gesperrten Schritt: erst sagt der Client, was er glaubt,
   * dann zieht ihn der Server zurecht. */

  function netzSchritt(dt) {
    echt.step(dt);
    if (!verbunden) return;
    statistik.schritte++;

    korrekturAnwenden(dt);
    fremdeGlaetten(dt);
    kreaturenGlaetten(dt);
    absichtenMelden();

    if (fressOffen) {
      fressOffen.wartet += dt;
      if (fressOffen.wartet > FRESS_GEDULD) fressOffen = null;
    }

    sendeAkku += dt;
    if (sendeAkku >= 1 / SENDE_HZ) {
      sendeAkku = 0;
      const b = G.slime.body;
      const x = +b.cx.toFixed(3), z = +b.cz.toFixed(3);
      folgeNr++;
      verlauf.push({ n: folgeNr, x, z });
      if (verlauf.length > VERLAUF_MAX) verlauf.shift();
      senden('pos', { x, z, n: folgeNr });
    }
  }

  /* Weiche Korrektur (GDD 11 §24–25): der Koerper wird nachgezogen, nie
   * versetzt. Verschoben wird die ganze Punktwolke — dieselbe Bewegung, die
   * game.js beim Respawn macht —, damit die Verformung erhalten bleibt.
   *
   * Korrigiert wird nur der Rest, den der Server bei der bestaetigten
   * Meldung tatsaechlich abgezwackt hat. Gegen die zuletzt EMPFANGENE
   * Position zu ziehen waere falsch: die ist immer eine halbe Laufzeit alt,
   * und der Schleim wuerde sich beim Laufen dauernd selbst zurueckhalten. */
  function korrekturAnwenden(dt) {
    const laenge = Math.hypot(restfehler.x, restfehler.z);
    if (laenge < KORREKTUR_ENDE) { restfehler.x = 0; restfehler.z = 0; return; }
    if (G.phase === 'tot') return;

    let sx, sz;
    if (laenge > SPRUNG_AB) {
      sx = restfehler.x; sz = restfehler.z;
    } else {
      const k = 1 - Math.exp(-KORREKTUR_K * dt);
      sx = restfehler.x * k; sz = restfehler.z * k;
      const weg = Math.hypot(sx, sz), grenze = KORREKTUR_MAX * dt;
      if (weg > grenze) { sx *= grenze / weg; sz *= grenze / weg; }
    }
    restfehler.x -= sx; restfehler.z -= sz;

    const b = G.slime.body, p = b.pos;
    for (let i = 0; i < b.n; i++) { p[i * 3] += sx; p[i * 3 + 2] += sz; }
    b.cx += sx; b.cz += sz;
    statistik.korrekturen++;
    statistik.korrekturWeg += Math.hypot(sx, sz);
  }

  /* Der Server bestaetigt eine Meldung mit ihrer Nummer. Was er daraus
   * gemacht hat, wird gegen den damaligen eigenen Stand verglichen — die
   * Differenz ist genau das, was er beschnitten hat. */
  function bestaetigungVerrechnen(s) {
    if (!s.folge) return;
    const i = verlauf.findIndex(h => h.n === s.folge);
    if (i < 0) return;
    const dx = s.x - verlauf[i].x, dz = s.z - verlauf[i].z;
    verlauf.splice(0, i + 1);
    if (!dx && !dz) return;
    restfehler.x += dx; restfehler.z += dz;
    // Der Verlauf gehoert mitgezogen, sonst wird derselbe Fehler nochmal
    // verrechnet, sobald die naechste Bestaetigung eintrifft.
    for (const h of verlauf) { h.x += dx; h.z += dz; }
  }

  function fremdeGlaetten(dt) {
    const k = 1 - Math.exp(-12 * dt);
    for (const s of andere.values()) {
      if (Math.hypot(s.zx - s.x, s.zz - s.z) > SPRUNG_AB) { s.x = s.zx; s.z = s.zz; continue; }
      s.x += (s.zx - s.x) * k;
      s.z += (s.zz - s.z) * k;
    }
  }

  function kreaturenGlaetten(dt) {
    const f = 1 - Math.exp(-10 * dt);
    for (const k of G.kreaturen) {
      if (k.netX === undefined) continue;
      if (Math.hypot(k.netX - k.x, k.netZ - k.z) > SPRUNG_AB) { k.x = k.netX; k.z = k.netZ; }
      else { k.x += (k.netX - k.x) * f; k.z += (k.netZ - k.z) * f; }
      k.y = bodenHoehe(k.x, k.z);
    }
  }

  /* Zielauswahl und Angriffsschalter sind Absichten: lokal sofort sichtbar,
   * bestaetigt vom Server.
   *
   * Die Quittung haengt an der Nummer der Positionsmeldungen. Weil die
   * Verbindung die Reihenfolge haelt, hat der Server die Absicht sicher
   * gesehen, sobald er eine spaetere Positionsmeldung bestaetigt. Vorher wird
   * sein Zielwert ignoriert — sonst ueberschreibt sein (aelterer) Stand die
   * frische Absicht und der Spieler verliert sein Ziel wieder. */
  function absichtenMelden() {
    if (G.zielId !== zielLokal) {
      zielLokal = G.zielId;
      zielQuittung = folgeNr + 1;
      senden('ziel', { id: G.zielId });
    }
    if (G.autoAngriff !== angriffLokal) {
      angriffLokal = G.autoAngriff;
      angriffQuittung = folgeNr + 1;
      senden('angriff', { an: G.autoAngriff });
    }
  }

  /* --- Nachrichten --------------------------------------------------------- */

  function nachricht(m) {
    if (m.typ === 'zustand') { zustandAnwenden(m); return; }
    if (m.typ === 'fressAbgelehnt') {
      fressOffen = null;
      if (window.UI && UI.hinweis) UI.hinweis('Fressen nicht möglich: ' + m.grund);
      return;
    }
    if (m.typ === 'abgelehnt') { fressOffen = m.was === 'fressen' ? null : fressOffen; return; }
    if (m.typ === 'testAntwort') {
      const auf = testOffen.get(m.marke);
      if (auf) { testOffen.delete(m.marke); auf(m); }
      return;
    }
  }

  function zustandAnwenden(z) {
    letzterZustand = z;
    statistik.zustaende++;
    const ereignisse = z.ereignisse || [];

    /* Erst die eigenen Absichten abschicken: zwischen zwei Simulations-
     * schritten kann der Spieler ein Ziel gewaehlt haben, und der gerade
     * eingetroffene Zustand weiss davon noch nichts. */
    absichtenMelden();

    spielerAnwenden(z.spieler);

    /* Fressmeldungen VOR der Kreaturenliste: der gefressene Gegner ist im
     * Ergebnispaket schon aus der Welt genommen, die Animation braucht ihn
     * aber noch (GDD 01 §28 — er steckt sichtbar in der Masse). */
    for (const e of ereignisse) {
      if (e.art === 'fressBeginn') fressBeginn(e);
      else if (e.art === 'fressErgebnis') fressErgebnis(e);
    }

    kreaturenAnwenden(z.kreaturen);

    for (const e of ereignisse) if (e.art !== 'fressBeginn' && e.art !== 'fressErgebnis') ereignis(e);

    ersterZustand = false;
    for (const cb of horcher) { try { cb(z); } catch (e) { console.error('beiZustand:', e); } }
  }

  function spielerAnwenden(liste) {
    const gesehen = new Set();
    for (const s of liste) {
      gesehen.add(s.id);
      if (s.id === selbstId) eigenerSpieler(s);
      else fremderSpieler(s);
    }
    for (const id of [...andere.keys()]) if (!gesehen.has(id)) andere.delete(id);
  }

  function eigenerSpieler(s) {
    const p = G.spieler;

    if (s.level !== p.level) {
      p.level = s.level;
      // Sichtbare Groesse kommt ausschliesslich vom Level (GDD 01 §45).
      PARAMS.radius = radiusFuerLevel(p.level);
      if (window.UI && UI.levelUp) UI.levelUp(G);
    }
    p.hp = s.hp; p.maxHp = s.maxHp;
    p.mana = s.mana; p.maxMana = s.maxMana;
    p.xp = s.xp; p.xpNaechstes = s.xpNaechstes;
    p.gold = s.gold;
    p.faction = s.faction;
    p.name = s.name;

    // Zielauswahl und Auto-Angriff: quittierte Absichten gehoeren dem Server.
    if (s.folge >= zielQuittung) { G.zielId = s.zielId; zielLokal = s.zielId; }
    if (s.folge >= angriffQuittung) { G.autoAngriff = s.autoAngriff; angriffLokal = s.autoAngriff; }

    /* Der lokale Angriffstakt wird stillgelegt: den Rhythmus gibt der Server
     * vor. Der Biss wird beim Schadensereignis ausgeloest — Zustand rein,
     * Animation raus (GDD 11 §39). */
    G.schwungZeit = 5;

    serverPos = { x: s.x, z: s.z };

    /* Versetzung (Beitritt, Respawn) ist kein Nachziehen: dort gehoert der
     * Sprung hin, weil es keine Bewegung darstellt, die man glaetten koennte. */
    if (ersterZustand || s.zwang !== letzterZwang) {
      letzterZwang = s.zwang;
      versetzenAuf(s.x, s.z);
      verlauf.length = 0;
      restfehler.x = 0; restfehler.z = 0;
    } else {
      bestaetigungVerrechnen(s);
    }

    if (s.tot && G.phase !== 'tot') window.SLIMORIA.api.killPlayer();
  }

  function versetzenAuf(x, z) {
    const b = G.slime.body;
    const dx = x - b.cx, dz = z - b.cz;
    const p = b.pos;
    for (let i = 0; i < b.n; i++) { p[i * 3] += dx; p[i * 3 + 2] += dz; }
    b.cx = x; b.cz = z;
    G.kamera.tx = x; G.kamera.tz = z;
  }

  function fremderSpieler(s) {
    let a = andere.get(s.id);
    if (!a) {
      a = { id: s.id, x: s.x, z: s.z, phase: (s.id * 1.7) % 6.28 };
      andere.set(s.id, a);
    }
    a.name = s.name; a.faction = s.faction; a.level = s.level;
    a.hp = s.hp; a.maxHp = s.maxHp; a.tot = s.tot;
    a.frisst = s.frisst === undefined ? null : s.frisst;
    a.zx = s.x; a.zz = s.z;
  }

  function kreaturenAnwenden(liste) {
    const gesehen = new Set();
    let hoechste = G.naechsteId;

    for (const s of liste) {
      gesehen.add(s.id);
      hoechste = Math.max(hoechste, s.id + 1);
      let k = G.kreaturen.find(k => k.id === s.id);
      if (!k) {
        /* Ueber den Kern anlegen, damit die Kreatur exakt so aussieht wie
         * eine lokale — nur mit der Id des Servers. */
        G.naechsteId = s.id;
        window.SLIMORIA.api.spawnCreature({ art: s.art, level: s.level, x: s.x, z: s.z });
        k = G.kreaturen[G.kreaturen.length - 1];
        k.netX = s.x; k.netZ = s.z;
      }
      k.hp = s.hp; k.maxHp = s.maxHp;
      if (!s.lebt && k.lebt) k.lebt = false;
      k.netX = s.x; k.netZ = s.z;
      // Kreaturenangriffe fuehrt der Server: den lokalen Takt nie fällig werden lassen.
      k.schwung = 3;
    }
    G.naechsteId = hoechste;

    for (let i = G.kreaturen.length - 1; i >= 0; i--) {
      const k = G.kreaturen[i];
      if (gesehen.has(k.id)) continue;
      // Wer gerade umschlungen wird, bleibt bis zum Ende der Animation stehen.
      if (window.Fressen && Fressen.aktiv && Fressen.ziel === k) continue;
      G.kreaturen.splice(i, 1);
      if (G.zielId === k.id) { G.zielId = null; zielLokal = null; }
    }
  }

  /* --- Ereignisse ---------------------------------------------------------- */

  function ereignis(e) {
    switch (e.art) {
      case 'schaden': {
        if (e.von !== selbstId) return;
        const k = G.kreaturen.find(k => k.id === e.ziel);
        if (!k) return;
        // Der Server hat zugeschlagen — jetzt zeigt der Client den Biss.
        if (e.quelle === 'auto' && window.Combat && Combat.bissStarten && G.phase === 'frei') {
          Combat.bissStarten(G, k);
        }
        if (window.UI && UI.schwebetext) {
          UI.schwebetext({ text: String(e.betrag), art: 'schaden', welt: SPIEL.kopfPunkt(k) });
        }
        return;
      }
      case 'spielerSchaden':
        if (e.spieler !== selbstId) return;
        if (doppelt.schaden) { doppelt.schaden = false; return; }
        if (window.UI && UI.schwebetext) {
          UI.schwebetext({ text: String(e.betrag), art: 'erlitten', welt: SPIEL.spielerKopf() });
        }
        return;
      case 'heilung':
        if (e.spieler !== selbstId || !e.betrag) return;
        if (window.UI && UI.schwebetext) {
          UI.schwebetext({ text: '+' + e.betrag, art: 'heilung', welt: SPIEL.spielerKopf() });
        }
        return;
      case 'xp':
        if (e.spieler !== selbstId) return;
        if (doppelt.xp) { doppelt.xp = false; return; }
        if (window.UI && UI.schwebetext) {
          UI.schwebetext({ text: '+' + e.betrag + ' XP', art: 'xp', welt: SPIEL.spielerKopf(), hoch: 1.6 });
        }
        return;
      case 'beitritt':
        if (e.spieler !== selbstId && window.UI && UI.hinweis) UI.hinweis(e.name + ' betritt die Arena');
        return;
      case 'verlassen':
        if (window.UI && UI.hinweis) UI.hinweis(e.name + ' hat die Arena verlassen');
        return;
    }
  }

  /* --- Fressen: fragen, nicht entscheiden ---------------------------------- */

  function netzFressversuch(opts = {}) {
    if (!verbunden) return echt.fressversuch ? echt.fressversuch(opts) : { ok: false, grund: 'offline' };

    /* `erzwinge` wird im Netzbetrieb bewusst ignoriert. Es ist die Schraube
     * der Aufnahme-Steuerung und darf im Spiel nicht ueber Erfolg oder
     * Fehlschlag entscheiden (GDD 11 §35). */
    if (G.phase !== 'frei') return { ok: false, grund: 'beschaeftigt' };
    if (fressOffen) return { ok: false, grund: 'wartet' };
    const k = SPIEL.zielKreatur();
    if (!k) return { ok: false, grund: 'kein ziel' };

    fressOffen = { ziel: k.id, wartet: 0 };
    statistik.fressversuche++;
    senden('fressen', { ziel: k.id });
    return { ok: true, wartet: true };
  }

  /* Zustand "Fressversuch gestartet" (GDD 11 §38). Hier — und nicht erst beim
   * Ergebnis — laeuft die Animation an: der Gegner steht noch, wird umschlungen
   * und verschwindet erst, wenn der Server sein Urteil nachschiebt. */
  function fressBeginn(e) {
    if (e.spieler !== selbstId) return;
    fressOffen = null;
    laufendeAnimation = e.ziel;

    const k = G.kreaturen.find(k => k.id === e.ziel);
    if (!k) return;

    // Der Kern zeigt die Abrechnung am Ende der Animation selbst an.
    if (e.erfolg) doppelt.xp = true; else doppelt.schaden = true;

    /* Nur noch abspielen: der Ausgang steht fest, der Client erzeugt daraus
     * die Animation (GDD 11 §39). Die Abklingzeit fuehrt der Server, deshalb
     * blockiert die lokale hier nicht. */
    G.zielId = k.id; zielLokal = k.id;
    G.cooldowns.fressen = 0;
    echt.fressversuch({ erzwinge: e.erfolg ? 'erfolg' : 'fehlschlag' });
  }

  function fressErgebnis(e) {
    if (e.spieler !== selbstId) return;
    fressOffen = null;
    letztesFressErgebnis = e;
    fressProtokoll.push(e);

    /* Notnagel: ging der Beginn verloren, spielt die Animation wenigstens
     * verspaetet. Im Normalfall laeuft sie hier schon seit 1,6 Sekunden. */
    if (laufendeAnimation === e.ziel) { laufendeAnimation = null; return; }
    laufendeAnimation = null;
    const k = G.kreaturen.find(k => k.id === e.ziel);
    if (!k || G.phase !== 'frei') return;
    if (e.erfolg) doppelt.xp = true; else doppelt.schaden = true;
    G.zielId = k.id; zielLokal = k.id;
    G.cooldowns.fressen = 0;
    echt.fressversuch({ erzwinge: e.erfolg ? 'erfolg' : 'fehlschlag' });
  }

  function netzFaehigkeit(slot) {
    if (!verbunden) return echt.faehigkeitBenutzen ? echt.faehigkeitBenutzen(slot) : { ok: false, grund: 'offline' };
    const f = Regeln.FAEHIGKEITEN[slot];
    if (!f) return { ok: false, grund: 'leer' };
    if (f.typ === 'fressen') return netzFressversuch({});
    if ((G.cooldowns[f.id] || 0) > 0) return { ok: false, grund: 'abklingzeit' };
    if (f.kosten > G.spieler.mana) return { ok: false, grund: 'ressource' };

    senden('faehigkeit', { slot });
    // Vorhersage nur fuer die Anzeige: Wirkung und Mana kommen vom Server.
    G.cooldowns[f.id] = f.cd;
    G.spieler.mana = Math.max(0, G.spieler.mana - f.kosten);
    if (window.Combat && Combat.faehigkeit) Combat.faehigkeit(G, f, SPIEL.zielKreatur());
    return { ok: true, wartet: true };
  }

  /* --- Fremde Schleime zeichnen (ARCHITEKTUR.md §5) ------------------------ */

  function extraEinbauen() {
    const R = window.SLIMORIA && window.SLIMORIA.R;
    if (!R || extraDrin) return;
    extraDrin = true;

    R.extras.push({
      name: 'fremde-schleime',
      order: 6,
      draw(gl, ctx) {
        if (!andere.size) return;
        const cam = ctx.cam, vp = ctx.viewProj, t = ctx.time;

        for (const s of andere.values()) {
          const farbe = s.faction === 'ravok' ? [0.62, 0.16, 0.15] : [0.16, 0.38, 0.72];
          const r = radiusFuerLevel(s.level || 1) * (s.tot ? 0.55 : 1);
          // Kein starrer Ball: leichtes Atmen, damit ein fremder Spieler wie
          // Masse wirkt und nicht wie ein Fels (GDD 01 §66).
          const puls = 1 + Math.sin(t * 2.2 + s.phase) * 0.035;
          const h = r * 0.82 * puls, br = r * (1 + (1 - puls) * 0.5);
          R.drawProp(R.propMesh, M4.trs(s.x, h, s.z, br, h, br),
                     normalMat(br, h, br), farbe, 0.55, 0.04, cam, vp);

          /* Fressversuch eines Mitspielers (GDD 11 §38, GDD 01 §28): solange
           * der Server ihn meldet, liegt sein Opfer sichtbar IN der Masse.
           * Ohne diese Blase saehe man beim Zusehen nur, wie eine Kreatur
           * irgendwann verschwindet — genau das verbietet §26. */
          const opfer = s.frisst == null ? null
                      : G.kreaturen.find(k => k.id === s.frisst);
          if (opfer) {
            const gr = (opfer.groesse || 0.7) * 1.45;
            R.drawProp(R.propMesh,
              M4.trs(opfer.x, opfer.y + gr * 0.55, opfer.z, gr, gr * 0.9, gr),
              normalMat(gr, gr * 0.9, gr), farbe, 0.45, 0.04, cam, vp);
            // Der Hals dazwischen: die Masse ist nach vorn gezogen (§27).
            const mx = (s.x + opfer.x) * 0.5, mz = (s.z + opfer.z) * 0.5;
            const hr = Math.min(br, gr) * 0.72;
            R.drawProp(R.propMesh, M4.trs(mx, hr * 0.9, mz, hr, hr * 0.8, hr),
                       normalMat(hr, hr * 0.8, hr), farbe, 0.45, 0.04, cam, vp);
          }

          // Augen zum eigenen Schleim: erst damit liest sich der Klecks als
          // Mitspieler und nicht als Hindernis.
          const b = G.slime.body;
          let dx = b.cx - s.x, dz = b.cz - s.z;
          const d = Math.hypot(dx, dz) || 1;
          dx /= d; dz /= d;
          const ax = -dz, az = dx, ra = r * 0.17;
          for (const seite of [-1, 1]) {
            R.drawProp(R.propMesh,
              M4.trs(s.x + dx * br * 0.82 + ax * seite * br * 0.34,
                     h * 1.35,
                     s.z + dz * br * 0.82 + az * seite * br * 0.34,
                     ra, ra, ra),
              normalMat(ra, ra, ra), [0.05, 0.05, 0.07], 0.9, 0, cam, vp);
          }
        }

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        for (const s of andere.values()) {
          const r = radiusFuerLevel(s.level || 1);
          const farbe = s.faction === 'ravok' ? [0.85, 0.35, 0.30] : [0.45, 0.70, 1.0];
          R.drawDecal(s.x, s.z, r * 1.35, [0.01, 0.02, 0.03], 0.5, false, vp);
          R.drawDecal(s.x, s.z, r * 1.75, farbe, 0.55, true, vp);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
      },
    });
  }

  /* --- Pruefaufbau (nur wenn der Server mit --test laeuft) ------------------ */

  function testAufbau(aufbau) {
    return new Promise((fertig) => {
      if (!verbunden || !testModus) return fertig(null);
      const marke = testMarke++;
      testOffen.set(marke, fertig);
      senden('test', { aufbau, marke });
    });
  }

  /* --- Nach aussen --------------------------------------------------------- */

  const API = {
    verbinden, trennen, senden,
    beiZustand(cb) { horcher.push(cb); return () => horcher.splice(horcher.indexOf(cb), 1); },
    testAufbau,

    get verbunden() { return verbunden; },
    get selbst() { return selbstId; },
    get zustand() { return letzterZustand; },
    get charakter() { return charakter; },
    get testModus() { return testModus; },
    get andere() { return [...andere.values()].map(a => ({ ...a })); },
    get fressProtokoll() { return fressProtokoll.slice(); },
    get letztesFressErgebnis() { return letztesFressErgebnis; },
    get statistik() { return { ...statistik }; },
    // Fremden Spieler nach Name finden — fuer tools/zweispieler.mjs.
    fremder(name) { return [...andere.values()].find(a => a.name === name) || null; },
  };

  // Bis das Gegenteil bewiesen ist, spielt man allein.
  lageZeigen('einzel');

  return API;
})();

window.Netz = Netz;

/* Beim Start von selbst verbinden. Abnahmeliste B verlangt serverautoritatives
 * Gameplay — wer index.html oeffnet, muss es bekommen, ohne einen Parameter an
 * die Adresse zu haengen. Antwortet niemand, bleibt es beim Einzelspieler; die
 * Marke oben links sagt jederzeit, welches von beidem gerade laeuft.
 *
 *   (nichts)                  Standardport, stiller Rueckfall
 *   ?server=ws://host:port    bestimmte Adresse
 *   ?server=aus               ausdruecklich allein spielen
 *   ?capture=1                niemals verbinden (ARCHITEKTUR §2)
 */
(function starten() {
  const q = new URLSearchParams(location.search);
  if (q.has('capture')) return;
  const wunsch = q.get('server');
  if (wunsch === 'aus' || wunsch === 'nein' || q.has('offline')) return;

  const url = (!wunsch || wunsch === 'auto')
    ? `ws://${location.hostname || '127.0.0.1'}:8790`
    : wunsch;

  const los = () => {
    // Hat sich inzwischen jemand ausdruecklich verbunden — ein Werkzeug, die
    // Konsole —, bleibt es dabei. Der Startversuch draengt sich nicht vor.
    if (Netz.verbunden) return;
    Netz.verbinden(url, q.get('name') || (window.G && G.spieler.name) || 'Glibb',
                   { frist: 1800 })
      .then(ok => { if (ok && window.UI && UI.hinweis) UI.hinweis('Mit dem Server verbunden'); });
  };

  /* Erst wenn die Charaktererstellung durch ist: der Server fuehrt den
   * persistenten Charakter unter seinem Namen (GDD 11 §106), und der steht
   * vorher noch nicht fest. */
  const wenn_bereit = () => {
    if (!(window.Charakter && Charakter.offen)) return los();
    const beobachter = new MutationObserver(() => {
      if (window.Charakter && Charakter.offen) return;
      beobachter.disconnect();
      los();
    });
    beobachter.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  };

  // `load` und nicht `DOMContentLoaded`: charakter.js haengt selbst an
  // DOMContentLoaded und laeuft erst danach — vorher gibt es keinen Namen.
  if (document.readyState === 'complete') wenn_bereit();
  else window.addEventListener('load', wenn_bereit);
})();
