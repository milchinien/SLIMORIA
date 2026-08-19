'use strict';

/* ---------------------------------------------------------------------------
 * Aufnahme-Treiber und Szenarienliste.
 *
 * Im Aufnahmemodus laeuft die Simulation nicht an der Bildrate, sondern an
 * einer Uhr, die das Werkzeug von aussen vorstellt. Dieselbe Eingabe ergibt
 * damit immer exakt dieselben Bilder — die Voraussetzung dafuer, dass ein
 * Kritiker zwei Staende ueberhaupt vergleichen kann.
 *
 * Neue Szenarien kommen unten in SZENARIEN dazu. Wer ein Teil baut, braucht
 * genau ein Szenario, das genau diesen Moment zeigt.
 * ------------------------------------------------------------------------- */

/* Sonnenrichtung fuer die Grafik-Szenarien.
 *
 * Der Renderer haelt die Lichtrichtung in R.light und hat dafuer keinen
 * api-Aufruf; er ist waehrend des Gauntlets gesperrt, ein solcher Aufruf kann
 * also erst in Phase Grafik dazukommen (siehe BRAUCHT_KERNAENDERUNG im
 * Bericht). Bis dahin setzt die Aufnahme die Richtung hier direkt.
 *
 * Wichtig: JEDES der fuenf g-Szenarien setzt die Sonne ausdruecklich, auch
 * wenn es die Vorgabe will. Sonst nimmt ein spaeter im selben Browserlauf
 * gestartetes Szenario die Beleuchtung des vorigen mit, und die Aufnahmen der
 * anderen Lanes waeren still verfaelscht. Aus demselben Grund steht der Block
 * am Ende von SZENARIEN: bei `--alle` laeuft er zuletzt. */
const SONNE_TAG = [0.55, 0.78, 0.32];   // Vorgabe des Renderers, rund 51 Grad hoch

function sonneSetzen(x, y, z) {
  const R = window.SLIMORIA && window.SLIMORIA.R;
  if (R) R.light = [x, y, z];
}

const SZENARIEN = {

  /* ---------------- Lane MOTION ---------------------------------------- */

  wabbeln: {
    teil: 'wabbeln', titel: 'Wabbeln im Stand — der Koerper steht, lebt aber',
    hud: false, kamera: { yaw: 0.9, pitch: 0.28, dist: 6.5, follow: true },
    dauer: 4.0, bilder: 20,
    // Ein kurzer Anstoss, danach nur noch Stillstand: was bleibt, ist das
    // Eigenleben der Masse. Genau das wird hier beurteilt.
    skript: [
      { t: 0.0, tu: a => a.setDrive(1, 0) },
      { t: 0.35, tu: a => a.setDrive(0, 0) },
    ],
  },

  anrollen: {
    teil: 'anrollen', titel: 'Anrollen — Stillstand in Bewegung, GDD 01 §13',
    hud: false, kamera: { yaw: 1.57, pitch: 0.20, dist: 8, follow: true },
    dauer: 2.2, bildZeiten: [0, .05, .1, .15, .2, .25, .3, .4, .5, .65, .8, 1.0, 1.3, 1.6, 2.0],
    skript: [{ t: 0.0, tu: a => a.moveTo(26, 0) }],
  },

  vollgas: {
    teil: 'vollgas', titel: 'Vollgas — Streckung bei Hoechsttempo, GDD 01 §14',
    hud: false, kamera: { yaw: 0.0, pitch: 0.18, dist: 8, follow: true },
    dauer: 4.0, bildZeiten: [0.2, 0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8],
    skript: [{ t: 0.0, tu: a => a.moveTo(0, 60) }],
  },

  bremsen: {
    teil: 'bremsen', titel: 'Bremsen — Nachschwingen ueber das Ziel hinaus, GDD 01 §13',
    hud: false, kamera: { yaw: 0.0, pitch: 0.18, dist: 8.5, follow: true },
    dauer: 3.6,
    bildZeiten: [1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.15, 2.3, 2.5, 2.7, 3.0, 3.3, 3.6],
    skript: [
      { t: 0.0, tu: a => a.moveTo(0, 60) },
      { t: 1.5, tu: a => a.stop() },
    ],
  },

  richtungswechsel: {
    teil: 'richtungswechsel', titel: 'Richtungswechsel — Nord nach Sued, GDD 01 §15',
    hud: false, kamera: { yaw: 0.0, pitch: 0.34, dist: 10, follow: true },
    dauer: 4.0,
    bildZeiten: [1.4, 1.55, 1.7, 1.85, 2.0, 2.15, 2.3, 2.5, 2.7, 2.9, 3.2, 3.5, 3.8],
    skript: [
      { t: 0.0, tu: a => a.moveTo(0, -40) },
      { t: 1.5, tu: a => a.moveTo(0, 40) },
    ],
  },

  aufprall: {
    teil: 'aufprall', titel: 'Aufprall — Squash und Rueckfederung, GDD 01 §20',
    hud: false, kamera: { yaw: 0.5, pitch: 0.12, dist: 7, follow: true },
    dauer: 3.2,
    // Eng um den Bodenkontakt herum: hier faellt die Entscheidung.
    bildZeiten: [0.6, 0.8, 0.9, 0.95, 1.0, 1.03, 1.06, 1.09, 1.12, 1.16, 1.2,
                 1.28, 1.36, 1.5, 1.7, 1.9, 2.2, 2.6],
    skript: [{ t: 0.0, tu: a => a.dropFrom(6.5) }],
  },

  /* ---------------- Lane EAT -------------------------------------------- */

  fressanlauf: {
    teil: 'fressanlauf', titel: 'Fress-Anlauf — ausrichten, verformen, schnellen, GDD 01 §27',
    hud: false, kamera: { yaw: 1.32, pitch: 0.20, dist: 7, follow: true },
    dauer: 1.6,
    bildZeiten: [0, .06, .12, .18, .24, .3, .36, .42, .48, .55, .65, .75, .9, 1.1, 1.35],
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 1, x: 4.5, z: 0 }) },
      { t: 0.0, tu: a => a.selectTarget(1) },
      { t: 0.15, tu: a => a.tryEat({ erzwinge: 'erfolg' }) },
    ],
  },

  umschlingung: {
    teil: 'umschlingung', titel: 'Umschlingen — Blase um den Gegner, GDD 01 §28',
    hud: false, kamera: { yaw: 1.32, pitch: 0.16, dist: 5.5, follow: true },
    dauer: 2.2,
    bildZeiten: [.3, .38, .46, .54, .62, .7, .78, .86, .94, 1.02, 1.14, 1.3, 1.5, 1.8],
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 1, x: 4.0, z: 0 }) },
      { t: 0.0, tu: a => a.selectTarget(1) },
      { t: 0.1, tu: a => a.tryEat({ erzwinge: 'erfolg' }) },
    ],
  },

  absorption: {
    teil: 'absorption', titel: 'Absorption und Nachschwingen, GDD 01 §29',
    hud: false, kamera: { yaw: 1.32, pitch: 0.20, dist: 6.5, follow: true },
    dauer: 3.4,
    bildZeiten: [.8, .95, 1.1, 1.2, 1.3, 1.4, 1.5, 1.65, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2],
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 1, x: 4.0, z: 0 }) },
      { t: 0.0, tu: a => a.selectTarget(1) },
      { t: 0.1, tu: a => a.tryEat({ erzwinge: 'erfolg' }) },
    ],
  },

  rueckschnapp: {
    teil: 'rueckschnapp', titel: 'Rueckschnapp beim Fehlschlag — GDD 01 §30/§31',
    hud: false, kamera: { yaw: 1.32, pitch: 0.18, dist: 7.5, follow: true },
    dauer: 3.2,
    bildZeiten: [.4, .5, .6, .68, .74, .8, .86, .92, .98, 1.06, 1.15, 1.3, 1.5,
                 1.75, 2.05, 2.4, 2.8],
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 8, x: 4.0, z: 0 }) },
      { t: 0.0, tu: a => a.selectTarget(1) },
      { t: 0.1, tu: a => a.tryEat({ erzwinge: 'fehlschlag' }) },
    ],
  },

  /* ---------------- Lane DEATH ------------------------------------------ */

  tod: {
    teil: 'tod', titel: 'Todesanimation — zittern, platzen, Pfuetze, GDD 01 §50',
    hud: false, kamera: { yaw: 0.6, pitch: 0.25, dist: 7.5, follow: true },
    dauer: 4.5,
    bildZeiten: [.1, .3, .5, .7, .85, 1.0, 1.1, 1.18, 1.26, 1.34, 1.45, 1.6,
                 1.8, 2.1, 2.5, 3.0, 3.6, 4.3],
    skript: [{ t: 0.1, tu: a => a.killPlayer() }],
  },

  /* ---------------- Lane COMBAT ----------------------------------------- */

  autoangriff: {
    teil: 'autoangriff', titel: 'Auto-Angriff — Anlauf, Reichweite, Rhythmus, GDD 02 §2–5',
    hud: true, kamera: { yaw: 0.7, pitch: 0.38, dist: 11, follow: true },
    dauer: 7.0, bilder: 18,
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 2, x: 9, z: 2 }) },
      { t: 0.2, tu: a => a.selectTarget(1) },
      { t: 0.3, tu: a => a.setAutoAttack(true) },
    ],
  },

  biss: {
    teil: 'biss', titel: 'Biss — Mund oeffnen, zuschnappen, zurueckfedern, GDD 02 §7',
    hud: false, kamera: { yaw: 1.35, pitch: 0.15, dist: 5, follow: true },
    dauer: 2.4,
    bildZeiten: [.5, .58, .66, .72, .78, .84, .9, .96, 1.02, 1.1, 1.2, 1.32,
                 1.5, 1.75, 2.05],
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 2, x: 3.0, z: 0 }) },
      { t: 0.0, tu: a => a.selectTarget(1) },
      { t: 0.45, tu: a => a.setAutoAttack(true) },
    ],
  },

  wachstum: {
    teil: 'wachstum', titel: 'Wachstum durch Level — GDD 01 §45–48, Abnahme 19/20',
    hud: true, kamera: { yaw: 1.2, pitch: 0.22, dist: 11, follow: false },
    dauer: 6.0,
    bildZeiten: [0.4, 1.0, 1.6, 2.2, 2.8, 3.4, 4.0, 4.6, 5.2, 5.8],
    // Kamera steht fest: nur so ist der Groessenunterschied im Bild ablesbar
    // und nicht vom mitfahrenden Zoom weggerechnet.
    skript: [
      { t: 0.5, tu: a => a.grantXp(300) },
      { t: 1.5, tu: a => a.grantXp(900) },
      { t: 2.5, tu: a => a.grantXp(3000) },
      { t: 3.5, tu: a => a.grantXp(12000) },
      { t: 4.5, tu: a => a.grantXp(60000) },
    ],
  },

  /* ---------------- Lane UI --------------------------------------------- */

  hud: {
    teil: 'hud', titel: 'HUD gesamt — Messlatte World of Warcraft, GDD 10 §3/§150',
    hud: true, kamera: { yaw: 0.7, pitch: 0.42, dist: 12, follow: true },
    dauer: 5.0, bilder: 6,
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 3, x: 7, z: 1 }) },
      { t: 0.0, tu: a => a.spawnCreature({ art: 'eber', level: 2, x: -6, z: 5 }) },
      { t: 0.2, tu: a => a.selectTarget(1) },
      { t: 0.4, tu: a => a.setAutoAttack(true) },
      { t: 1.2, tu: a => a.useAbility(1) },
      { t: 2.6, tu: a => a.useAbility(2) },
    ],
  },

  hotbar: {
    teil: 'hotbar', titel: 'Hotbar — 10 Slots, Icons, Tasten, GDD 10 §12–17',
    hud: true, kamera: { yaw: 0.7, pitch: 0.45, dist: 12, follow: true },
    dauer: 4.0, bilder: 8, ausschnitt: 'hotbar',
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 3, x: 6, z: 0 }) },
      { t: 0.2, tu: a => a.selectTarget(1) },
      { t: 0.5, tu: a => a.useAbility(1) },
      { t: 1.5, tu: a => a.useAbility(2) },
      { t: 2.4, tu: a => a.useAbility(3) },
    ],
  },

  zielanzeige: {
    teil: 'zielanzeige', titel: 'Zielanzeige — Name, Level, HP, GDD 10 §21',
    hud: true, kamera: { yaw: 0.7, pitch: 0.42, dist: 11, follow: true },
    dauer: 6.0, bilder: 8, ausschnitt: 'ziel',
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 8, x: 6, z: 0 }) },
      { t: 0.3, tu: a => a.selectTarget(1) },
      { t: 0.6, tu: a => a.setAutoAttack(true) },
    ],
  },

  trefferzahlen: {
    teil: 'trefferzahlen', titel: 'Treffer-, Heilungs- und Fressfeedback, GDD 10 §73–78',
    hud: true, kamera: { yaw: 0.7, pitch: 0.38, dist: 10, follow: true },
    dauer: 5.0, bilder: 14,
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 3, x: 4.5, z: 0 }) },
      { t: 0.1, tu: a => a.selectTarget(1) },
      { t: 0.3, tu: a => a.setAutoAttack(true) },
      { t: 1.4, tu: a => a.useAbility(1) },
      { t: 2.2, tu: a => a.damagePlayer(28) },
      { t: 2.9, tu: a => a.healPlayer(35) },
      { t: 3.6, tu: a => a.grantXp(400) },
    ],
  },

  cooldowns: {
    teil: 'cooldowns', titel: 'Abklingzeiten — Wisch, Restzeit, Wiederverfuegbarkeit, GDD 10 §15',
    hud: true, kamera: { yaw: 0.7, pitch: 0.45, dist: 12, follow: true },
    dauer: 8.0, bilder: 16, ausschnitt: 'hotbar',
    skript: [
      { t: 0.0, tu: a => a.spawnCreature({ art: 'wolf', level: 3, x: 6, z: 0 }) },
      { t: 0.1, tu: a => a.selectTarget(1) },
      { t: 0.3, tu: a => a.useAbility(1) },
      { t: 0.5, tu: a => a.useAbility(2) },
      { t: 0.7, tu: a => a.useAbility(3) },
    ],
  },

  /* ---------------- Phase GRAFIK ---------------------------------------
   *
   * Schritt G0 aus PHASE-GRAFIK-PLAN.md. Fuenf Bilder, die je EINE
   * Eigenschaft des Renderings moeglichst rein zeigen, damit sie mit
   * tools/grafikmass.mjs gegen die Zahlen des Referenzdossiers gehalten
   * werden koennen.
   *
   * Drei Regeln fuer alle fuenf:
   *  - kein HUD. Gemessen wird das Bild, nicht die Oberflaeche darueber.
   *  - `follow: false`. Eine mitfahrende Kamera aendert zwischen zwei Laeufen
   *    den Bildausschnitt; dann misst man den Zoom statt das Rendering.
   *  - Der Schleim steht still. Es gibt kein Skript ausser der Sonne — jede
   *    Bewegung waere eine zweite Variable im selben Bild.
   *
   * Die Paare sind mit Absicht paarweise gebaut: g-schattenkante gegen
   * g-randlicht und g-bodenlicht gegen g-nacht zeigen denselben
   * Bildausschnitt bei anderem Licht. Was sich zwischen den beiden Bildern
   * aendert, ist dann ausschliesslich die Beleuchtung.
   * -------------------------------------------------------------------- */

  'g-schattenkante': {
    teil: 'g-schattenkante',
    titel: 'Schattenkante — Schleim und Fels bei streifendem Licht',
    hud: false, kamera: { yaw: 1.45, pitch: 0.20, dist: 5.0, follow: false },
    dauer: 1.6, bildZeiten: [0.8, 1.6],
    // Sonne quer zur Blickachse und flach: so laeuft der Terminator senkrecht
    // mitten durch den Koerper und die Flanke von Licht nach Schatten liegt
    // dort, wo eine Bildzeile sie mit den meisten Pixeln trifft.
    skript: [{ t: 0.0, tu: () => sonneSetzen(0.94, 0.34, 0.05) }],
  },

  'g-randlicht': {
    teil: 'g-randlicht',
    titel: 'Randlicht — dieselbe Szene im Gegenlicht',
    hud: false, kamera: { yaw: 1.45, pitch: 0.20, dist: 5.0, follow: false },
    dauer: 1.6, bildZeiten: [0.8, 1.6],
    // Sonne entlang der Blickachse vom Bild weg, also hinter Schleim und Fels.
    // Nur so entsteht der Randstreifen, dessen Breite und Ueberschuss
    // gemessen werden sollen (Plan G7: +60..+100 Stufen auf 2..3 px).
    skript: [{ t: 0.0, tu: () => sonneSetzen(0.05, 0.41, -0.91) }],
  },

  'g-fernsicht': {
    teil: 'g-fernsicht',
    titel: 'Fernsicht — ueber die Arena zum Horizont, fuer Nebel und Himmel',
    hud: false, kamera: { yaw: 0.9, pitch: 0.12, dist: 24, follow: false },
    dauer: 1.6, bildZeiten: [0.8, 1.6],
    // Flacher Nickwinkel: bei fovY 50 Grad stehen so rund 37 Prozent des
    // Bildes Himmel, der Rest laeuft ueber die Arenakante in den Dunst.
    // Genau die beiden Flaechen, um die es in G1 und G2 geht.
    skript: [{ t: 0.0, tu: () => sonneSetzen(SONNE_TAG[0], SONNE_TAG[1], SONNE_TAG[2]) }],
  },

  'g-bodenlicht': {
    teil: 'g-bodenlicht',
    titel: 'Bodenlicht — grosse Bodenflaeche mit Fels, fuer Albedo und Kontakt',
    hud: false, kamera: { yaw: 2.10, pitch: 0.45, dist: 11, follow: false },
    dauer: 1.6, bildZeiten: [0.8, 1.6],
    // Steilerer Blick auf die Ebene: der Boden ist hier die groesste Flaeche
    // im Bild, und zwei Felsen stehen darauf. Damit sind Bodenhelligkeit
    // (G6) und der Uebergang Fels-zu-Boden in einem Bild.
    skript: [{ t: 0.0, tu: () => sonneSetzen(SONNE_TAG[0], SONNE_TAG[1], SONNE_TAG[2]) }],
  },

  'g-nacht': {
    teil: 'g-nacht',
    titel: 'Bodenlicht bei tiefstehendem Licht — dieselbe Szene, Sonne bei 11 Grad',
    hud: false, kamera: { yaw: 2.10, pitch: 0.45, dist: 11, follow: false },
    dauer: 1.6, bildZeiten: [0.8, 1.6],
    // Gleicher Himmelswinkel wie am Tag, nur tief: der Vergleich mit
    // g-bodenlicht zeigt, was der Renderer ueberhaupt auf die Lichthoehe
    // gibt — und was nicht (der Boden hat heute gar keine Lichtrechnung).
    skript: [{ t: 0.0, tu: () => sonneSetzen(0.90, 0.20, 0.52) }],
  },
};

/* --------------------------------------------------------------------------
 * Treiber
 * ------------------------------------------------------------------------ */

const __cap = (() => {
  const STEP = 1 / 240;
  let uhr = 0;
  let szene = null;
  let offen = [];

  function zeiten(s) {
    if (s.bildZeiten) return s.bildZeiten.slice();
    const n = s.bilder || 12;
    const d = s.dauer || 3;
    // Erstes Bild leicht nach dem Start, letztes am Ende — sonst zeigt Bild 0
    // den noch unbewegten Aufbau und verschenkt einen Platz im Kontaktbogen.
    return Array.from({ length: n }, (_, i) => (d * (i + 1)) / n);
  }

  function start(name, opts = {}) {
    const s = SZENARIEN[name];
    if (!s) return { fehler: 'unbekanntes Szenario: ' + name };
    const A = window.SLIMORIA.api;

    szene = s;
    uhr = 0;
    offen = (s.skript || []).slice().sort((a, b) => a.t - b.t);

    window.RENDERER_WAHL = s.renderer || (opts.renderer ?? 1);
    A.reset({ seed: opts.seed ?? 1234, level: s.level ?? 1, faction: s.faction ?? 'eldoran' });
    A.setHudVisible(!!s.hud);
    if (s.kamera) A.setCamera(s.kamera);
    window.SLIMORIA.render();

    return { titel: s.titel, teil: s.teil, zeiten: zeiten(s), hud: !!s.hud, dauer: s.dauer };
  }

  function advanceTo(t) {
    const A = window.SLIMORIA.api;
    let schutz = 0;
    while (uhr < t - 1e-9 && schutz++ < 200000) {
      // Faellige Skriptpunkte zuerst — sie sollen den Schritt beeinflussen,
      // den sie ausloesen, nicht erst den naechsten.
      while (offen.length && offen[0].t <= uhr + 1e-9) offen.shift().tu(A);
      const dt = Math.min(STEP, t - uhr);
      window.SLIMORIA.step(dt);
      uhr += dt;
    }
    while (offen.length && offen[0].t <= uhr + 1e-9) offen.shift().tu(A);
    window.SLIMORIA.render();
    return { uhr: Math.round(uhr * 1000) / 1000, ...window.SLIMORIA.api.metrics() };
  }

  return { szenarien: SZENARIEN, start, advanceTo, get uhr() { return uhr; } };
})();

window.__cap = __cap;
window.SZENARIEN = SZENARIEN;
