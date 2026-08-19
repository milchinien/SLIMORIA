'use strict';

/* ---------------------------------------------------------------------------
 * HUD (GDD 10).
 *
 * BESITZER: Lane UI. Vier Teile werden einzeln beurteilt:
 *   hotbar         §12–17   10 Slots, Icons, Tasten, Verfügbarkeit
 *   zielanzeige    §21      Name, Level, HP
 *   trefferzahlen  §73–78   Schaden, Heilung, XP, Fressfeedback
 *   cooldowns      §15      Abdunkeln, Restzeit, Wiederverfügbarkeit
 *
 * Oberste Regel: Lesbarkeit schlägt Effektdichte (GDD 10 §98, GDD 02 §64).
 * Die UI darf den Schleim nicht ersetzen.
 * ------------------------------------------------------------------------- */

const UI = (() => {
  let wurzel = null;
  const el = {};
  let schwebende = [];
  let hinweise = [];
  let bereit = false;
  let spiel = null;            // letztes G, damit Anker jederzeit neu gerechnet werden

  // Bildschirmkasten der Namensplatte des Ziels (Mitte-x, Oberkante-y).
  // Schadenszahlen dürfen ihn niemals kreuzen (Arbeitsliste 33).
  let plattePx = null;
  // Wer mich zuletzt getroffen hat, und wie lange die Marke noch steht.
  let angreifer = { id: null, rest: 0 };
  const ANGRIFF_DAUER = 1.8;
  let letzteMana = null;
  let rahmenBlitz = { rest: 0, dauer: 0.55, art: '' };

  /* --- Aufbau ------------------------------------------------------------ */

  function bauen() {
    if (bereit) return;
    wurzel = document.getElementById('hud');
    if (!wurzel) return;

    wurzel.innerHTML = `
      <div id="ui-welt">
        <div id="ui-schild" class="aus">
          <div class="np-kopf"><span class="np-level" id="ui-np-level">1</span
            ><span class="np-name" id="ui-np-name">—</span></div>
          <div class="np-reihe">
            <div class="np-tier" id="ui-np-tier"></div>
            <div class="np-balken"><i id="ui-np-hp"></i></div>
          </div>
          <u class="np-pfeil"></u>
          <u class="np-angriff" id="ui-np-angriff"></u>
        </div>
        <div id="ui-angreifer" class="aus">ANGREIFT</div>
      </div>

      <div id="ui-minimap">
        <div class="mm-rand"><canvas id="ui-mm" width="150" height="150"></canvas></div>
        <div class="mm-titel">Testarena</div>
      </div>

      <div id="ui-quests">
        <div class="q-kopf">Prototyp</div>
        <div class="q-eintrag"><span class="q-name">Kreaturen fressen</span>
          <span class="q-fort" id="ui-q-fressen">0/3</span></div>
        <div class="q-eintrag"><span class="q-name">Kreaturen besiegen</span>
          <span class="q-fort" id="ui-q-besiegt">0/3</span></div>
      </div>

      <div id="ui-gruppe">
        <div class="gr-titel">Gruppe</div>
        <div class="gr-leer">— allein unterwegs —</div>
      </div>

      <div id="ui-ziel" class="aus">
        <div class="z-werte">
          <div class="z-kopf">
            <span class="z-level" id="ui-z-level">1</span>
            <span class="z-name" id="ui-z-name">—</span>
            <span class="z-prozent" id="ui-z-prozent"></span>
          </div>
          <div class="z-balken"><i id="ui-z-hp"></i><span id="ui-z-hptext">100 %</span></div>
          <div class="z-fress"><b>Fressen</b><span id="ui-z-fress"></span></div>
        </div>
        <div class="z-portrait"><div class="z-tier" id="ui-z-tier"></div></div>
      </div>

      <div id="ui-spieler">
        <div class="sp-portrait"><div class="sp-blob"></div><span id="ui-sp-level">1</span></div>
        <div class="sp-werte">
          <div class="sp-name" id="ui-sp-name">Glibb</div>
          <div class="sp-balken hp"><i id="ui-sp-hp"></i><span id="ui-sp-hptext"></span></div>
          <div class="sp-balken mana"><i id="ui-sp-mana"></i><span id="ui-sp-manatext"></span></div>
        </div>
        <u class="sp-blitz" id="ui-sp-blitz"></u>
      </div>

      <div id="ui-xp"><i id="ui-xp-fuell"></i><span id="ui-xp-text"></span></div>

      <div id="ui-hotbar"></div>

      <div id="ui-hinweise"></div>
    `;

    for (const id of ['ui-welt', 'ui-ziel', 'ui-z-name', 'ui-z-level', 'ui-z-hp',
      'ui-z-hptext', 'ui-z-fress', 'ui-z-prozent', 'ui-z-tier',
      'ui-schild', 'ui-np-level', 'ui-np-name', 'ui-np-hp', 'ui-np-tier',
      'ui-sp-hp', 'ui-sp-hptext', 'ui-sp-mana',
      'ui-sp-manatext', 'ui-sp-level', 'ui-sp-name', 'ui-hotbar', 'ui-hinweise',
      'ui-xp-fuell', 'ui-xp-text', 'ui-q-fressen', 'ui-q-besiegt', 'ui-mm',
      'ui-spieler', 'ui-sp-blitz', 'ui-angreifer', 'ui-np-angriff']) {
      el[id] = document.getElementById(id);
    }

    hotbarBauen();
    haken();
    bereit = true;
  }

  /* --- Haken auf die Aktionsaufrufe (GDD 10 §73, Arbeitsliste 20) ----------
   * game.js liefert bei jedem Fehlschlag einen Grund zurück — bisher hat ihn
   * niemand gelesen. game.js ist gesperrt, also legt die UI ihren Melder um
   * die Aufrufe, die sie selbst bedient: `SPIEL.*` bedient Tastatur und
   * Hotbar, `SLIMORIA.api.*` bedient die Aufnahme. Beide Wege sind derselbe
   * Spielerwunsch, also muss beiden dieselbe Antwort folgen. Der Rückgabewert
   * bleibt unangetastet — der Haken liest nur mit. */
  function haken() {
    const S = window.SPIEL;
    if (S && !S.__uiMelder) {
      const alt = S.faehigkeitBenutzen, altF = S.fressversuch;
      S.faehigkeitBenutzen = (slot) => quittieren(alt(slot), slot);
      S.fressversuch = (o) => quittieren(altF(o), fressSlot());
      S.__uiMelder = true;
    }
    const A = window.SLIMORIA && window.SLIMORIA.api;
    // api.useAbility ruft die modulinterne Funktion, nicht SPIEL — sonst
    // würde derselbe Fehlschlag zweimal quittiert.
    if (A && !A.__uiMelder) {
      const alt = A.useAbility, altT = A.tryEat;
      A.useAbility = (slot) => quittieren(alt(slot), slot);
      A.tryEat = (o) => quittieren(altT(o), fressSlot());
      A.__uiMelder = true;
    }
  }

  const fressSlot = () => Regeln.FAEHIGKEITEN.findIndex(f => f && f.typ === 'fressen');

  /* Klartext statt Schlüsselwort. „ressource" sagt dem Spieler nichts;
   * „Zu wenig Mana" beendet das Rätsel in einem Wort (GDD 10 §73). */
  const GRUND_TEXT = {
    'kein ziel':    'Kein Ziel gewählt',
    'zu weit':      'Ziel ist zu weit weg',
    'abklingzeit':  'Noch nicht bereit',
    'ressource':    'Zu wenig Mana',
    'tot':          'Du bist tot',
    'passiv':       'Wirkt von allein',
    'beschaeftigt': 'Gerade beschäftigt',
    'leer':         'Kein Zauber auf diesem Platz',
  };
  let letzteSperre = { grund: '', rest: 0 };

  function quittieren(erg, slot) {
    if (erg && erg.ok === false && erg.grund) sperre(erg.grund, slot);
    return erg;
  }

  /* Zwei Signale für denselben Fehlschlag, weil eines allein die Frage nur
   * halb beantwortet: der Text sagt WARUM, der rote Riegel am Slot sagt
   * WELCHER Knopf. In der Referenz (wow-hud) steht die Fehlermeldung rot
   * oben mittig und die Leiste blitzt am betroffenen Platz. */
  function sperre(grund, slot) {
    if (!bereit) return;
    if (letzteSperre.grund === grund && letzteSperre.rest > 0) return;
    letzteSperre = { grund, rest: 0.6 };
    hinweis(GRUND_TEXT[grund] || grund, 'sperre');
    if (el.slots && slot >= 0 && el.slots[slot]) el.slots[slot].neinRest = NEIN_DAUER;
  }

  /* --- Hotbar (GDD 10 §12–17) -------------------------------------------- */

  function hotbarBauen() {
    const f = Regeln.FAEHIGKEITEN;
    let html = '';
    for (let i = 0; i < 10; i++) {
      const a = f[i];
      const taste = i === 9 ? '0' : String(i + 1);
      // Der Slot zeigt immer seine Zahl — sie ist es, die ihn auslöst.
      // Ein zweites Kürzel (E = Fressen, §18) kommt als eigenes Abzeichen
      // dazu, statt die Zahl zu verdrängen.
      html += `<div class="hb-slot${a ? '' : ' leer'}" data-slot="${i}">
        <div class="hb-icon ${a ? 'ic-' + a.icon : ''}"></div>
        <div class="hb-cd"><i></i><b></b></div>
        <u class="hb-blitz"></u>
        <u class="hb-glanz"></u>
        <u class="hb-nein"></u>
        <div class="hb-taste">${taste}</div>
        ${a && a.taste !== taste ? `<div class="hb-sondertaste">${a.taste}</div>` : ''}
        ${a && a.kosten ? `<div class="hb-kosten">${a.kosten}</div>` : ''}
      </div>`;
    }
    el['ui-hotbar'].innerHTML = html;
    el.slots = Array.from(el['ui-hotbar'].querySelectorAll('.hb-slot')).map(s => ({
      wurzel: s,
      cd: s.querySelector('.hb-cd'),
      wisch: s.querySelector('.hb-cd i'),
      zahl: s.querySelector('.hb-cd b'),
      icon: s.querySelector('.hb-icon'),
      blitz: s.querySelector('.hb-blitz'),
      glanz: s.querySelector('.hb-glanz'),
      nein: s.querySelector('.hb-nein'),
      letzteRest: 0,
      blitzRest: 0,
      neinRest: 0,
    }));

    // Maus muss genauso funktionieren wie die Tasten (GDD 10 §17).
    el['ui-hotbar'].addEventListener('mousedown', (e) => {
      const s = e.target.closest('.hb-slot');
      if (s) SPIEL.faehigkeitBenutzen(parseInt(s.dataset.slot, 10));
    });
  }

  /* Der Bereitmoment muss ein EIGENES Bild haben, nicht nur das Fehlen der
   * Abdunklung. Bei 0,55 s lag er zwischen zwei Aufnahmen fast immer im
   * Ausklang: im Kontaktbogen war vom „wieder da" nichts übrig als ein
   * minimal hellerer Slot. 0,95 s bedeckt bei 0,5-s-Abstand zwei Aufnahmen —
   * eine im vollen Aufschlag, eine im Nachglühen — und bleibt kurz genug,
   * dass die Leiste beim Dauerfeuer nicht flackert. */
  const BLITZ_DAUER = 0.95;
  /* Der Riegel muss auf einem 0,5-s-Raster der Aufnahme sicher erwischt
   * werden — kürzer als 0,8 s und der Fehlschlag findet zwischen zwei
   * Bildern statt. */
  const NEIN_DAUER = 0.85;

  function hotbarAktualisieren(G, dt) {
    const f = Regeln.FAEHIGKEITEN;
    // Alle drei zielgebundenen Typen prüfen, nicht nur „aktiv": Slot 1 (Biss)
    // und Slot 5 (Fressen) leuchteten ohne Ziel und ausser Reichweite
    // unverändert weiter und waren damit tote Knöpfe (Arbeitsliste 19).
    const k = SPIEL.zielKreatur();
    const b = G.slime.body;
    const abstand = k ? Math.hypot(b.cx - k.x, b.cz - k.z) : Infinity;
    const reichweite = k ? G.reichweite + window.PARAMS.radius + k.groesse : 0;
    if (letzteSperre.rest > 0) letzteSperre.rest = Math.max(0, letzteSperre.rest - dt);
    for (let i = 0; i < el.slots.length; i++) {
      const a = f[i], s = el.slots[i];
      if (!a) continue;
      const rest = G.cooldowns[a.id] || 0;
      const aktiv = rest > 0;
      s.wurzel.classList.toggle('kuehlt', aktiv);
      // Fehlende Ressource muss sichtbar sein, ohne es auszuprobieren (§16).
      // Zwei getrennte Stufen: die rote Kostenzahl steht IMMER, wenn das Mana
      // fehlt; die blaue Vollfläche nur, wenn sie die einzige Sperre ist.
      // Beides gleichzeitig zu zeigen hat die Aussagen übereinandergelegt —
      // der Wisch und die blaue Fläche verdunkelten denselben Slot und keiner
      // von beiden war noch als eigene Ursache lesbar.
      const knapp = a.kosten > G.spieler.mana;
      s.wurzel.classList.toggle('knapp', knapp);
      s.wurzel.classList.toggle('arm', knapp && !aktiv);
      const brauchtZiel = a.typ === 'aktiv' || a.typ === 'auto' || a.typ === 'fressen';
      const zuWeit = !!k && abstand > reichweite + (a.typ === 'fressen' ? 2.5 : 3);
      s.wurzel.classList.toggle('kein-ziel', brauchtZiel && (!k || zuWeit));

      if (aktiv) {
        const anteil = a.cd > 0 ? rest / a.cd : 0;   // 1 -> 0
        const weg = (1 - anteil) * 360;              // schon abgelaufener Sektor
        const zeiger = Math.min(360, weg + 4);       // heller Zeiger
        const kante = Math.min(360, weg + 16);       // Ausklang in die Dunkelheit
        // Radialer Wisch: der abgelaufene Sektor gibt das Icon wieder frei,
        // der Rest bleibt dunkel. Der Zeiger ist ein 4°-Keil mit 12°
        // Ausklang, kein 3°-Strich — als Strich war er am Rand einen Pixel
        // breit und las sich als Kratzer quer über das Icon statt als Hand,
        // die den freigegebenen Sektor anführt.
        s.wisch.style.background =
          `conic-gradient(rgba(3,5,9,0) 0deg ${weg.toFixed(1)}deg,` +
          ` rgba(226,246,255,.70) ${weg.toFixed(1)}deg ${zeiger.toFixed(1)}deg,` +
          ` rgba(3,5,9,.78) ${kante.toFixed(1)}deg 360deg)`;
        // Zehntel erst kurz vor Schluss. Die Referenz schreibt eine einzelne
        // Ziffer ins Icon; „8.5" sind vier Zeichen auf 44 px und drängen den
        // Wisch an den Rand, ohne mehr zu sagen als „8".
        s.zahl.textContent = rest >= 3 ? String(Math.ceil(rest)) : rest.toFixed(1);
      } else if (s.zahl.textContent !== '') {
        s.zahl.textContent = '';
      }

      // Wiederverfügbarkeit deutlich machen (§15). Drei Lagen, weil eine
      // einzelne im Standbild verschwindet:
      //   Stoßwelle  — Ring, der ÜBER den Slotrand hinauswächst und zerfällt
      //   Glanz      — Innenfläche + Rahmen leuchten, halten kurz, klingen aus
      //   Stups      — das Icon selbst antwortet mit einem kurzen Ausdehnen
      // Alles dt-gesteuert, kein CSS-Timer (Aufnahme muss wiederholbar sein).
      if (s.letzteRest > 0 && !aktiv) s.blitzRest = BLITZ_DAUER;
      // Neu ausgelöst, während das Nachglühen noch lief: der Slot ist jetzt
      // gesperrt, das Leuchten wäre eine Lüge.
      if (aktiv && s.letzteRest === 0) s.blitzRest = 0;
      s.letzteRest = rest;
      if (s.blitzRest > 0) {
        s.blitzRest = Math.max(0, s.blitzRest - dt);
        const q = s.blitzRest / BLITZ_DAUER;          // 1 -> 0
        const v = 1 - q;                              // 0 -> 1, Fortschritt
        const w = Math.min(1, v / 0.45);              // Stoßwelle: erste 45 %
        s.blitz.style.opacity = (1 - w * w).toFixed(3);
        s.blitz.style.transform = `scale(${(1 + w * 0.9).toFixed(3)})`;
        s.glanz.style.opacity = (v < 0.40 ? 1 : 1 - (v - 0.40) / 0.60).toFixed(3);
        const stups = v < 0.35 ? v / 0.35 : Math.max(0, 1 - (v - 0.35) / 0.65);
        s.icon.style.transform = `scale(${(1 + stups * 0.10).toFixed(3)})`;
      } else if (s.blitz.style.opacity !== '0') {
        s.blitz.style.opacity = '0';
        s.glanz.style.opacity = '0';
        s.icon.style.transform = 'scale(1)';
      }

      // Verweigerung: roter Riegel über dem Slot, der zuckt und ausklingt.
      // Er beantwortet „welcher Knopf hat nicht gezündet" — der Text oben
      // beantwortet „warum" (GDD 10 §73).
      if (s.neinRest > 0) {
        s.neinRest = Math.max(0, s.neinRest - dt);
        const q = s.neinRest / NEIN_DAUER;              // 1 -> 0
        s.nein.style.opacity = (q < 0.35 ? q / 0.35 : 1).toFixed(3);
        // Zwei kurze Ausschläge, dann Ruhe: gerade genug, um im Standbild
        // als „abgelehnt" zu lesen, ohne die Leiste zu verwackeln.
        const ruck = Math.sin((1 - q) * 18) * Math.max(0, q - 0.55) * 8;
        s.wurzel.style.transform = `translateX(${ruck.toFixed(2)}px)`;
      } else if (s.nein.style.opacity !== '0') {
        s.nein.style.opacity = '0';
        s.wurzel.style.transform = '';
      }
    }
  }

  /* --- Schwebender Kampftext (GDD 10 §73–78) ----------------------------- */

  /* Der Kern dieses Teils ist nicht die Zahl, sondern ihre ZUORDNUNG: an wem
   * ist das passiert. Am Material abgemessen (ref/wow-hud):
   *
   *   remix-damage-numbers-target-tooltip (1920x1080): „107" und „728" stehen
   *     mittig ÜBER der Namensplatte ihres jeweiligen Ziels, Ziffernhöhe
   *     22 px (= 2,0 % Bildhöhe), Abstand Zahlfuß→Plattenoberkante ~14 px.
   *   tww-dungeon-damage-numbers (2560x1440): „494.904" über „248.773",
   *     Zeilenabstand 50 px bei 38 px Ziffernhöhe — also 1,3 Zeilen, nie
   *     überlappend; die kleinere Zahl ist 0,72-mal so groß.
   *   remix-damage-heal-numbers-target (1920x1080): „+49" grün und „−785" rot,
   *     Ziffernhöhe 20 bzw. 22 px. Vorzeichen UND Farbe, nicht nur Farbe.
   *
   * Daraus die drei Regeln hier:
   *  1. Jede Zahl hat einen BESITZER und hängt jeden Bildschritt neu an ihm —
   *     nicht an dem Weltpunkt, an dem der Treffer einmal stattfand. Läuft der
   *     Wolf weg, läuft seine Zahl mit. Vorher klebte die Zahlenkolonne auf
   *     dem Felsen, an dem der Spieler eine Sekunde vorher stand.
   *  2. Getrennte Anker: Gegnerzahlen über der Namensplatte des Gegners,
   *     eigene Zahlen dicht an der Silhouette des Schleims, und zwar auf der
   *     vom Ziel ABGEWANDTEN Seite. Zwei Kolonnen, die sich nie treffen.
   *  3. Kein Fächer nach Zählerstand, sondern eine echte Trennung: nach dem
   *     Setzen misst ein Durchgang die Kästen und schiebt ältere Zahlen so
   *     weit nach oben, dass 8 px Luft bleiben. „+35" kann die Unterlängen
   *     der „−28" damit nicht mehr kreuzen, egal wie groß beide geraten.
   */
  const ANKER = {
    schaden:    { anker: 'kreatur', grund: -14, steig: 26 },  // Treffer am Gegner
    erlitten:   { anker: 'spieler', grund: -12, steig: 22 },  // eigener Schaden
    heilung:    { anker: 'spieler', grund: -12, steig: 22 },
    xp:         { anker: 'spieler', grund: -12, steig: 30 },
    ressource:  { anker: 'bild',    grund:   0, steig: 26 },
    gefressen:  { anker: 'spieler', grund: -46, steig: 34 },
    gross:      { anker: 'spieler', grund: -46, steig: 34 },
    fehl:       { anker: 'kreatur', grund: -46, steig: 34 },
  };

  /* Wucht aus dem Betrag. Ein 40er-Treffer darf nicht aussehen wie ein 7er —
   * in der Referenz steht die 494.904 rund 1,38-mal so groß da wie die
   * 248.773 daneben. Die Zahl trägt ihre Größe selbst, ohne dass game.js
   * (gesperrt) etwas mitschicken müsste. */
  function wuchtVon(text) {
    const n = Math.abs(parseFloat(String(text).replace(/[^0-9.]/g, '')));
    if (!isFinite(n)) return 0;
    return Math.min(1, Math.max(0, (n - 6) / 34));
  }

  /* Vorzeichen ist Pflicht, nicht Zierde. Die blanke „7" über dem Wolf ließ
   * offen, ob der Wolf getroffen oder geheilt wurde; „−7" beantwortet das
   * ohne Farbe, also auch vor jedem Untergrund und für jeden, der Rot und
   * Grün nicht trennt (GDD 10 §75). */
  function beschriften(text, art) {
    let s = String(text);
    if ((art === 'schaden' || art === 'erlitten' || art === 'ressource') &&
        !/^[-−+]/.test(s)) s = '−' + s;
    return s;
  }

  /* Wem gehört die Zahl? Für Gegnertreffer schickt game.js kopfPunkt(k) —
   * daraus lässt sich die Kreatur eindeutig zurückfinden, ohne dass die
   * gesperrte Datei etwas mitschicken müsste. */
  function besitzerFinden(G, art, welt) {
    if (!G || !welt) return null;
    if (art === 'schaden' || art === 'fehl') {
      for (const k of G.kreaturen) {
        if (Math.abs(k.x - welt.x) < 1e-6 && Math.abs(k.z - welt.z) < 1e-6) return k.id;
      }
    }
    return null;
  }

  function schwebetext({ text, art = 'schaden', welt, hoch = 1 }) {
    if (!bereit) return;
    const G = spiel || window.G;
    const beschriftung = beschriften(text, art);

    // Der Rahmen antwortet mit. Und wer zugeschlagen hat, steht im letzten
    // Ereignis, das game.js gerade gemeldet hat — die UI muss nichts raten.
    if (art === 'erlitten') {
      rahmenBlitz = { rest: 0.55, dauer: 0.55, art: 'schaden' };
      const e = G && G.ereignisse && G.ereignisse[G.ereignisse.length - 1];
      if (e && e.art === 'spielerSchaden' && e.von != null) angreifer = { id: e.von, rest: ANGRIFF_DAUER };
    } else if (art === 'heilung') {
      rahmenBlitz = { rest: 0.55, dauer: 0.55, art: 'heilung' };
    }

    const d = document.createElement('div');
    d.className = 'st st-' + art;
    d.textContent = beschriftung;
    el['ui-welt'].appendChild(d);

    const an = ANKER[art] || { anker: 'spieler', grund: -12, steig: 22 };
    const skaliert = art === 'schaden' || art === 'erlitten' || art === 'heilung';

    const s = {
      d, t: 0,
      dauer: (art === 'gross' || art === 'gefressen' || art === 'fehl') ? 1.9 : 1.25,
      art, anker: an.anker, grund: an.grund, steig: an.steig * hoch,
      kreaturId: besitzerFinden(G, art, welt),
      welt: welt ? { x: welt.x, y: welt.y, z: welt.z } : null,
      bild: an.anker === 'bild' ? manaAnker() : null,
      gross: skaliert ? 1 + wuchtVon(beschriftung) * 0.38 : 1,
      knall: (art === 'gross' || art === 'gefressen') ? 1.85 : 1.5,
      px: 0, py: 0, f: 0, sichtbar: true,
    };
    schwebende.push(s);
    // Weniger gleichzeitige Zahlen als früher (40): über etwa einem Dutzend
    // ist der Bildschirm die Zahlenkolonne, die GDD 10 §98 verbietet.
    while (schwebende.length > 12) schwebende.shift().d.remove();
    // Sofort setzen, nicht erst beim nächsten Takt: ein Treffer, der auf der
    // Endzeit einer Aufnahme ausgelöst wird, stand sonst in der linken oberen
    // Bildecke (Arbeitsliste 33).
    if (G && G.kamera && G.kamera.viewProj) schwebendeStellen(G);
  }

  function projizieren(G, p) {
    const m = G.kamera.viewProj;
    const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12];
    const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13];
    const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
    if (w <= 0.001) return null;
    const A = window.ANSICHT;
    return { x: (x / w * 0.5 + 0.5) * A.w, y: (1 - (y / w * 0.5 + 0.5)) * A.h };
  }

  const AUS = (t) => 1 - Math.pow(1 - t, 2.4);   // schnell weg, dann stehen bleiben

  /* Der Schleim, nicht sein Luftraum. spielerKopf() aus game.js sitzt
   * 1,5 Radien über dem Schwerpunkt — bei Kameradistanz 10 sind das über
   * 100 px oberhalb der Silhouette, und die Zahl schwebte im Leeren. Der
   * Scheitel liegt bei radius*squat; genau dort setzt die Kolonne an. */
  function spielerAnker(G) {
    const b = G.slime.body, P = window.PARAMS;
    return { x: b.cx, y: b.cy + P.radius * (P.squat || 0.86), z: b.cz };
  }

  function manaAnker() {
    const m = el['ui-sp-mana'];
    if (!m || !m.parentElement) return { x: 320, y: 800 };
    const r = m.parentElement.getBoundingClientRect();
    return { x: r.right + 34, y: r.bottom + 6 };
  }

  /* Auf welcher Seite des Schleims stehen die eigenen Zahlen? Auf der vom
   * Ziel abgewandten. Damit können eigene und gegnerische Zahlen selbst
   * dann nicht ineinanderlaufen, wenn Schleim und Gegner sich berühren. */
  function eigeneSeite(G) {
    const k = SPIEL.zielKreatur();
    if (!k) return -1;
    const a = projizieren(G, spielerAnker(G));
    const b = projizieren(G, { x: k.x, y: k.y + k.groesse, z: k.z });
    if (!a || !b) return -1;
    return b.x >= a.x ? -1 : 1;
  }

  function schwebendeAktualisieren(G, dt) {
    for (let i = schwebende.length - 1; i >= 0; i--) {
      const s = schwebende[i];
      s.t += dt;
      if (s.t / s.dauer >= 1) { s.d.remove(); schwebende.splice(i, 1); }
    }
    schwebendeStellen(G);
  }

  /* Zwei Durchgänge: erst die Grundlage aus dem Besitzer, dann die
   * Entzerrung. Die Entzerrung misst echte Kästen — nur so gilt die Zusage
   * „keine zwei Zahlen überlappen" unabhängig von Ziffernzahl und Wucht. */
  function schwebendeStellen(G) {
    const seite = eigeneSeite(G);
    const gruppen = new Map();

    for (const s of schwebende) {
      const f = Math.min(1, s.t / s.dauer);
      let p = null, gruppe = 'mitte', seit = 0, grund = s.grund;

      if (s.anker === 'bild') {
        p = { x: s.bild.x, y: s.bild.y };
        gruppe = 'bild';
      } else if (s.anker === 'kreatur') {
        const k = s.kreaturId != null ? G.kreaturen.find(q => q.id === s.kreaturId) : null;
        const w = k ? { x: k.x, y: k.y + k.groesse * 2.1, z: k.z } : s.welt;
        p = w ? projizieren(G, w) : null;
        gruppe = 'kreatur' + (s.kreaturId != null ? s.kreaturId : 'x');
        // Über der Namensplatte, nie darauf (Arbeitsliste 33). Die Platte
        // wird jeden Takt gemessen, damit der Abstand bei jeder Kameradistanz
        // stimmt statt bei genau einer.
        if (p && plattePx && k && k.id === G.zielId &&
            Math.abs(p.x - plattePx.x) < plattePx.w * 0.75 + 60) {
          grund = Math.min(grund, plattePx.oben - p.y - 12);
        }
      } else {
        p = projizieren(G, spielerAnker(G));
        gruppe = 'spieler';
        seit = seite * 54;
      }
      if (!p) { s.d.style.opacity = '0'; s.sichtbar = false; continue; }
      s.sichtbar = true;

      // Der Weg ist kurz und klingt aus: die Zahl springt von ihrem Besitzer
      // weg und bleibt dann bei ihm stehen, statt ihn zu verlassen.
      s.px = p.x + seit;
      s.py = p.y + grund - AUS(f) * s.steig;
      s.f = f;
      if (!gruppen.has(gruppe)) gruppen.set(gruppe, []);
      gruppen.get(gruppe).push(s);
    }

    // Entzerren: die jüngste Zahl behält ihre Grundlage, ältere weichen nach
    // oben aus. So steht die neueste immer dort, wo der Blick sie erwartet.
    // Kastenhöhe: der Umbau translate(-50%,-100%) scale(k) legt die Mitte
    // auf py − h/2 und die Höhe auf h·k — das ist die Rechnung darunter.
    for (const liste of gruppen.values()) {
      let deckel = Infinity;
      for (let i = liste.length - 1; i >= 0; i--) {
        const s = liste[i];
        const h = s.d.offsetHeight || 26;
        const halb = h * massstab(s) * s.gross * 0.5;
        const unten = (s.py - h * 0.5) + halb;
        if (unten > deckel) s.py -= (unten - deckel);
        deckel = (s.py - h * 0.5) - halb - 8;
      }
    }

    for (const s of schwebende) {
      if (!s.sichtbar) continue;
      s.d.style.transform =
        `translate(${s.px.toFixed(1)}px, ${s.py.toFixed(1)}px)` +
        ` translate(-50%, -100%) scale(${(massstab(s) * s.gross).toFixed(3)})`;
      s.d.style.opacity = String(s.f < 0.70 ? 1 : 1 - (s.f - 0.70) / 0.30);
    }
  }

  /* Aufschlag: erst übergroß, dann auf Maß. Das ist der sichtbare
   * Impact-Moment (GDD 01 §68) — eine Zahl, die in Endgröße erscheint und
   * wegschwebt, hat keinen Einschlag. */
  function massstab(s) {
    const a = 0.18, f = s.f || 0;
    return f < a ? s.knall - (s.knall - 1) * AUS(f / a) : 1 - 0.14 * ((f - a) / (1 - a));
  }

  /* --- Große Meldungen ---------------------------------------------------- */

  function hinweis(text, art = 'normal') {
    if (!bereit) return;
    const d = document.createElement('div');
    d.className = 'hw hw-' + art;
    d.textContent = text;
    el['ui-hinweise'].appendChild(d);
    hinweise.push({ d, t: 0, dauer: art === 'gross' ? 2.4 : 1.8 });
  }

  function hinweiseAktualisieren(dt) {
    for (let i = hinweise.length - 1; i >= 0; i--) {
      const h = hinweise[i];
      h.t += dt;
      const f = h.t / h.dauer;
      if (f >= 1) { h.d.remove(); hinweise.splice(i, 1); continue; }
      h.d.style.opacity = String(f < 0.75 ? 1 : 1 - (f - 0.75) / 0.25);
      h.d.style.transform = `translateY(${(-14 * Math.min(1, f * 4)).toFixed(1)}px)`;
    }
  }

  // Zwei Meldungen mit demselben Wortlaut ("Level 3" oben, "LEVEL 3" in der
  // Welt) sagen nichts doppelt so laut, sie belegen nur zweimal Platz
  // (GDD 10 §98). Die Banderole nennt das Ergebnis, der Weltausbruch feiert
  // den Moment — verschiedene Worte, ein Ereignis.
  function levelUp(G) {
    hinweis('Stufe ' + G.spieler.level + ' erreicht', 'gross');
    schwebetext({ text: 'LEVEL UP', art: 'gross', welt: SPIEL.spielerKopf(), hoch: 1.3 });
  }
  function fressErfolg(G, k) {
    hinweis(k.name + ' gefressen', 'gross');
    schwebetext({ text: 'GEFRESSEN', art: 'gefressen', welt: SPIEL.spielerKopf(), hoch: 1.5 });
  }
  function fressFehlschlag(G, k) {
    hinweis('Fressversuch fehlgeschlagen', 'fehl');
    schwebetext({ text: 'WIDERSTANDEN', art: 'fehl', welt: SPIEL.kopfPunkt(k), hoch: 1.5 });
  }

  /* --- Ziel (GDD 10 §21, GDD 02 §3) --------------------------------------- *
   * Die nackte Zahl „8" sagt nichts. In der Referenz (wow-hud, Zielrahmen)
   * ist die Levelzahl eine Gefahrenampel: je weiter über dem Spieler, desto
   * heisser die Farbe. Dieselbe Stufe faerbt Rahmen UND Weltschild, damit
   * beide als EINE Aussage über denselben Gegner gelesen werden. */
  function levelStufe(diff) {
    if (diff <= -5) return 'trivial';
    if (diff <= -3) return 'leicht';
    if (diff <= 2) return 'gleich';
    if (diff <= 4) return 'schwer';
    return 'toedlich';
  }

  /* Kreaturfarbe -> CSS. Aufgehellt wie im Renderer beim Anvisieren, sonst
   * ist ein grauer Wolf im 46-px-Portrait eine graue Scheibe. */
  function tierFarbe(c) {
    const v = (i) => Math.round(Math.min(1, c[i] * 1.5) * 255);
    return `rgb(${v(0)},${v(1)},${v(2)})`;
  }

  function zielAktualisieren(G, k) {
    const p = G.spieler;
    const anteil = k.hp / k.maxHp;
    const stufe = levelStufe(k.level - p.level);

    el['ui-z-name'].textContent = k.name;
    el['ui-z-level'].textContent = k.level;
    el['ui-z-level'].className = 'z-level lvl-' + stufe;
    el['ui-z-hp'].style.width = (anteil * 100).toFixed(1) + '%';
    // Referenz zeigt absolute Werte IM Balken (2.3M / 2.3M); §21 verlangt
    // zusaetzlich den Prozentsatz — der steht rechts in der Namenszeile.
    el['ui-z-hptext'].textContent = Math.round(k.hp) + ' / ' + k.maxHp;
    el['ui-z-prozent'].textContent = Math.round(anteil * 100) + ' %';
    el['ui-ziel'].className = 'stufe-' + stufe;
    const farbe = tierFarbe(k.farbe);
    el['ui-z-tier'].className = 'tier z-tier tier-' + k.art;
    el['ui-z-tier'].style.setProperty('--tier', farbe);

    // Fresschance ist die Entscheidungsinformation dieses Spiels (§19/§22).
    const c = Regeln.fresschance(p.level, k.level, anteil);
    el['ui-z-fress'].textContent = c <= 0 ? 'aussichtslos' : Math.round(c * 100) + ' %';
    el['ui-z-fress'].className = c <= 0 ? 'nein' : c > 0.6 ? 'gut' : 'mittel';

    // Weltschild: GDD 02 §3 verlangt, dass man JEDERZEIT sieht, wen man
    // angreift. Ein Kasten am Bildrand beantwortet das nicht — die Auskunft
    // muss am Gegner selbst haengen, mit demselben Namen, derselben
    // Levelfarbe und demselben Balken wie der Rahmen unten.
    // Ankerhoehe abgemessen, nicht geschaetzt: bei groesse * 1.5 sass die
    // Pfeilspitze IM Ruecken des Wolfs, bei groesse * 2.65 schwebte sie eine
    // Koerperlaenge daneben im Leeren. 2.25 setzt die Spitze rund 25 px ueber
    // die Ohrenspitzen — nah genug zum Zuordnen, hoch genug zum Lesen.
    const s = projizieren(G, { x: k.x, y: k.y + k.groesse * 2.25, z: k.z });
    if (!s) { el['ui-schild'].className = 'aus'; plattePx = null; return; }
    el['ui-schild'].className = 'stufe-' + stufe +
      (angreifer.rest > 0 && angreifer.id === k.id ? ' greift-an' : '');
    el['ui-schild'].style.transform =
      `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
    el['ui-np-name'].textContent = k.name;
    el['ui-np-level'].textContent = k.level;
    el['ui-np-hp'].style.width = (anteil * 100).toFixed(1) + '%';
    el['ui-np-tier'].className = 'tier np-tier tier-' + k.art;
    el['ui-np-tier'].style.setProperty('--tier', farbe);

    // Gemessener Kasten der Platte. Die Schadenszahlen richten sich daran
    // aus, statt einen einmal abgelesenen Pixelwert zu glauben — bei anderer
    // Kameradistanz waeren beide sonst wieder uebereinander (Arbeitsliste 33).
    plattePx = { x: s.x, oben: s.y - el['ui-schild'].offsetHeight, w: el['ui-schild'].offsetWidth };
  }

  /* --- Rahmen ------------------------------------------------------------- */

  function rahmenAktualisieren(G) {
    const p = G.spieler;
    el['ui-sp-level'].textContent = p.level;
    el['ui-sp-name'].textContent = p.name;
    el['ui-sp-hp'].style.width = (p.hp / p.maxHp * 100).toFixed(1) + '%';
    el['ui-sp-hptext'].textContent = Math.round(p.hp) + ' / ' + p.maxHp;
    el['ui-sp-mana'].style.width = (p.mana / p.maxMana * 100).toFixed(1) + '%';
    el['ui-sp-manatext'].textContent = Math.round(p.mana) + ' / ' + p.maxMana;
    document.body.dataset.faction = p.faction;

    el['ui-xp-fuell'].style.width = (p.xp / p.xpNaechstes * 100).toFixed(1) + '%';
    el['ui-xp-text'].textContent = `${p.xp} / ${p.xpNaechstes} XP`;

    const k = SPIEL.zielKreatur();
    if (k) {
      zielAktualisieren(G, k);
    } else {
      el['ui-ziel'].className = 'aus';
      el['ui-schild'].className = 'aus';
      plattePx = null;
    }

    const b = G.bestiarium;
    let gef = 0, bes = 0;
    for (const a in b) { gef += b[a].gefressen; bes += b[a].besiegt; }
    el['ui-q-fressen'].textContent = Math.min(gef, 3) + '/3';
    el['ui-q-besiegt'].textContent = Math.min(bes, 3) + '/3';
  }

  /* --- Minimap ------------------------------------------------------------ */

  function minimapZeichnen(G) {
    const c = el['ui-mm'];
    if (!c) return;
    const g = c.getContext('2d');
    const R = 75, s = R / WELT.bounds;
    g.clearRect(0, 0, 150, 150);
    g.fillStyle = '#10161c'; g.beginPath(); g.arc(R, R, R, 0, 6.284); g.fill();
    g.strokeStyle = '#2b3742'; g.lineWidth = 1;
    for (const o of WELT.obstacles) {
      g.beginPath();
      if (o.type === 'rock') g.arc(R + o.x * s, R + o.z * s, o.r * s, 0, 6.284);
      else g.rect(R + (o.x - o.w / 2) * s, R + (o.z - o.d / 2) * s, o.w * s, o.d * s);
      g.fillStyle = '#232d38'; g.fill();
    }
    g.fillStyle = '#8e9bb0';
    g.fillRect(R + WELT.friedhof.x * s - 2, R + WELT.friedhof.z * s - 2, 4, 4);
    for (const k of G.kreaturen) {
      if (!k.lebt) continue;
      g.fillStyle = k.id === G.zielId ? '#ffd36b' : '#d05a52';
      g.beginPath(); g.arc(R + k.x * s, R + k.z * s, 2.6, 0, 6.284); g.fill();
    }
    const b = G.slime.body;
    g.fillStyle = G.spieler.faction === 'ravok' ? '#ff7a6e' : '#7fd8ff';
    g.beginPath(); g.arc(R + b.cx * s, R + b.cz * s, 3.4, 0, 6.284); g.fill();
  }

  /* --- Wer trifft mich, und was kostet mich das (GDD 10 §73/§75) ---------- *
   * Zwei Fragen, die eine schwebende Zahl allein nicht beantwortet:
   *   „an mir?"    — der Spielerrahmen antwortet mit, rot bei Schaden, grün
   *                  bei Heilung. Derselbe Reflex wie in der Referenz, wo bei
   *                  einem Fehlschlag „Miss" AM Spielerrahmen steht.
   *   „von wem?"   — die Namensplatte des Angreifers glüht rot; ist er nicht
   *                  das Ziel, hängt eine kleine Marke über ihm.
   * Ressourcenverbrauch ist die dritte Kategorie aus §75. Er wird am
   * Manabalken abgelesen statt gemeldet — so erwischt er jeden Weg, auch den
   * der Aufnahme, ohne dass die gesperrte game.js ein Ereignis liefern muss. */
  function reaktionen(G, dt) {
    if (rahmenBlitz.rest > 0) {
      rahmenBlitz.rest = Math.max(0, rahmenBlitz.rest - dt);
      const q = rahmenBlitz.rest / rahmenBlitz.dauer;         // 1 -> 0
      el['ui-spieler'].dataset.reaktion = rahmenBlitz.art;
      el['ui-sp-blitz'].style.opacity = (q < 0.4 ? q / 0.4 : 1).toFixed(3);
    } else if (el['ui-sp-blitz'].style.opacity !== '0') {
      el['ui-sp-blitz'].style.opacity = '0';
    }

    if (angreifer.rest > 0) angreifer.rest = Math.max(0, angreifer.rest - dt);
    // Der Angreifer-Glanz schlägt beim Treffer voll aus und sinkt dann auf ein
    // ruhiges Grundleuchten. Bliebe er auf voller Stärke, hätte die Platte
    // dieselbe Lautstärke wie die Schadenszahl über ihr — und der Wolf schlägt
    // im Zweisekundentakt, das rote Kastenrechteck stünde also dauerhaft
    // (GDD 10 §98: Lesbarkeit schlägt Effektdichte).
    const q = ANGRIFF_DAUER > 0 ? angreifer.rest / ANGRIFF_DAUER : 0;
    el['ui-np-angriff'].style.opacity =
      (angreifer.rest <= 0 ? 0 : q > 0.72 ? 1 : 0.34 + q * 0.42).toFixed(3);

    const a = angreifer.rest > 0 ? G.kreaturen.find(k => k.id === angreifer.id && k.lebt) : null;
    if (a && a.id !== G.zielId) {
      const p = projizieren(G, { x: a.x, y: a.y + a.groesse * 2.2, z: a.z });
      if (p) {
        el['ui-angreifer'].className = '';
        el['ui-angreifer'].style.transform =
          `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      } else el['ui-angreifer'].className = 'aus';
    } else if (el['ui-angreifer'].className !== 'aus') {
      el['ui-angreifer'].className = 'aus';
    }

    const m = G.spieler.mana;
    if (letzteMana !== null && m < letzteMana - 0.5) {
      schwebetext({ text: String(Math.round(letzteMana - m)), art: 'ressource' });
    }
    letzteMana = m;
  }

  /* --- Takt --------------------------------------------------------------- */

  function aktualisieren(G, dt) {
    if (!bereit) bauen();
    if (!bereit) return;
    spiel = G;
    haken();
    rahmenAktualisieren(G);
    hotbarAktualisieren(G, dt);
    reaktionen(G, dt);
    schwebendeAktualisieren(G, dt);
    hinweiseAktualisieren(dt);
    minimapZeichnen(G);
  }

  function zuruecksetzen() {
    for (const s of schwebende) s.d.remove();
    for (const h of hinweise) h.d.remove();
    schwebende = []; hinweise = [];
    plattePx = null;
    angreifer = { id: null, rest: 0 };
    rahmenBlitz = { rest: 0, dauer: 0.55, art: '' };
    letzteMana = null;
    letzteSperre = { grund: '', rest: 0 };
    // Ohne das feuert der Bereitblitz einmal beim ersten Bild nach dem
    // Zurücksetzen — die Abklingzeiten fallen dort schlagartig auf 0.
    if (bereit && el.slots) {
      for (const s of el.slots) {
        s.letzteRest = 0; s.blitzRest = 0; s.neinRest = 0;
        s.blitz.style.opacity = '0'; s.glanz.style.opacity = '0';
        s.nein.style.opacity = '0'; s.wurzel.style.transform = '';
        s.icon.style.transform = 'scale(1)'; s.zahl.textContent = '';
      }
    }
    if (bereit) {
      el['ui-ziel'].className = 'aus';
      el['ui-schild'].className = 'aus';
      el['ui-angreifer'].className = 'aus';
      el['ui-sp-blitz'].style.opacity = '0';
    }
  }

  return {
    bauen, aktualisieren, zuruecksetzen, schwebetext, hinweis,
    levelUp, fressErfolg, fressFehlschlag, projizieren,
  };
})();

window.UI = UI;
