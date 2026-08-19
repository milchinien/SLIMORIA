'use strict';

/* ---------------------------------------------------------------------------
 * Spielzustand und Ablaufsteuerung.
 *
 * GESPERRTE DATEI. Sie hält den Zustand zusammen und ruft die Lanes auf:
 *   Kampf   -> combat.js   (Combat)
 *   Fressen -> eat.js      (Fressen)
 *   Tod     -> death.js    (Tod)
 *   HUD     -> ui.js       (UI)
 *
 * Jede Lane bekommt denselben Vertrag: sie darf den Körper über Deform
 * anfassen, den Spielzustand lesen und über die hier definierten Ereignisse
 * zurückmelden. Sie darf den Ablauf nicht selbst umbauen.
 * ------------------------------------------------------------------------- */

const G = {
  zeit: 0,
  phase: 'frei',            // frei | fressen | tot
  seed: 1234,

  spieler: {
    name: 'Glibb', faction: 'eldoran',
    level: 1, xp: 0, xpNaechstes: 0,
    hp: 0, maxHp: 0, mana: 0, maxMana: 0, gold: 0,
    tot: false,
  },

  kreaturen: [],
  naechsteId: 1,
  zielId: null,
  autoAngriff: false,
  fressUhr: 0,              // Laufzeit der Fress-Lane, für den Wachhund
  schwungZeit: 0,           // Restzeit bis zum nächsten Auto-Angriff
  schwungDauer: 2.0,        // GDD 02 §5: fester Grundrhythmus
  reichweite: 2.6,

  cooldowns: {},            // id -> Restsekunden
  bestiarium: {},           // art -> { besiegt, gefressen }

  slime: null, mesh: null, surface: null, applySurface: null,
  kamera: null, welt: WELT, params: PARAMS,
  input: { axis: { x: 0, z: 0 }, hop: false, cannon: false },
  hudSichtbar: true,
  debug: false,
  ereignisse: [],           // Protokoll für Aufnahmen und Kritik
};

/* --- Aufbau --------------------------------------------------------------- */

let REND = null, coarse = null;

function spielAufbauen(canvas) {
  /* Zweiter Renderpfad (Phase Grafik). Der bestehende bleibt unangetastet,
   * weil jede Aenderung an renderer.js die laufenden Blindvergleiche des
   * Gauntlets entwerten wuerde. Umschalten mit ?renderer=2 in der Adresse
   * oder mit renderer: 2 im Aufnahmeszenario. */
  const wahl = new URLSearchParams(location.search).get('renderer');
  const zweiter = (wahl === '2' || window.RENDERER_WAHL === 2)
                  && typeof createRenderer2 === 'function';
  REND = zweiter ? createRenderer2(canvas) : createRenderer(canvas);
  REND.pfad = zweiter ? 2 : 1;

  const mesh = createIcosphere(2);
  const topo = buildTopology(mesh);
  mesh.bend = topo.bend;

  coarse = createSubdivider(mesh, topo);
  coarse.relaxLambda = 0;
  coarse.computeNormals = false;
  const midMesh = meshFromSurface(coarse);
  const surface = createSubdivider(midMesh, buildTopology(midMesh));

  G.mesh = mesh;
  G.surface = surface;
  G.applySurface = (src) => { coarse.apply(src); surface.apply(coarse.positions); };
  REND.slimeMesh = makeMesh(REND.gl, surface.positions, surface.normals, surface.indices);

  G.kamera = {
    yaw: Math.PI * 0.5, pitch: 0.40, dist: 9.5, follow: true,
    tx: 0, ty: 1, tz: 0,
    eye: new Float32Array(3),
    viewProj: M4.identity(), invViewProj: M4.identity(),
  };

  zuruecksetzen({});
  return REND;
}

function zuruecksetzen(opts = {}) {
  RNG.seed(opts.seed ?? G.seed);
  G.seed = opts.seed ?? G.seed;
  G.zeit = 0;
  G.phase = 'frei';
  G.kreaturen.length = 0;
  G.naechsteId = 1;
  G.zielId = null;
  G.autoAngriff = false;
  G.schwungZeit = 0;
  G.cooldowns = {};
  G.ereignisse.length = 0;
  G.fressUhr = 0;
  G.input.axis.x = 0; G.input.axis.z = 0;
  G.input.hop = false; G.input.cannon = false;
  // Muss mit: capture.mjs faehrt alle Szenarien in EINER Seite, sonst schleppt
  // der Quest-Tracker die Zaehler der vorherigen Szene mit ins Bild.
  for (const a in G.bestiarium) delete G.bestiarium[a];

  const p = G.spieler;
  p.faction = opts.faction ?? p.faction;
  p.level = opts.level ?? 1;
  p.xp = 0;
  p.xpNaechstes = Regeln.xpFuerLevel(p.level);
  p.maxHp = Regeln.spielerMaxHp(p.level);
  p.hp = p.maxHp;
  p.maxMana = Regeln.spielerMaxMana(p.level);
  p.mana = p.maxMana;
  p.gold = 0;
  p.tot = false;

  PARAMS.radius = radiusFuerLevel(p.level);
  G.slime = createSlime(G.mesh, PARAMS);
  G.kamera.tx = 0; G.kamera.ty = PARAMS.radius; G.kamera.tz = 0;

  if (window.Fressen && Fressen.zuruecksetzen) Fressen.zuruecksetzen(G);
  if (window.Tod && Tod.zuruecksetzen) Tod.zuruecksetzen(G);
  if (window.Combat && Combat.zuruecksetzen) Combat.zuruecksetzen(G);
  if (window.UI && UI.zuruecksetzen) UI.zuruecksetzen(G);

  G.applySurface(G.slime.body.pos);
  kameraAktualisieren(G, 1);
}

/* --- Kreaturen ------------------------------------------------------------ */

function kreaturSetzen({ art = 'wolf', level = 1, x = 6, z = 0 }) {
  const w = Regeln.kreaturWerte(art, level);
  const k = {
    id: G.naechsteId++,
    art, level, name: w.name,
    x, z, y: bodenHoehe(x, z),
    hp: w.maxHp, maxHp: w.maxHp, dmg: w.dmg,
    reichweite: w.reichweite, tempo: w.tempo,
    farbe: w.farbe, groesse: w.groesse,
    lebt: true, aggro: false, schwung: 0,
    wackeln: RNG.range(0, 6.28),
    tot: 0,                 // Sterbe-Fortschritt zum Ausblenden
  };
  G.kreaturen.push(k);
  return k.id;
}

const zielKreatur = () => G.kreaturen.find(k => k.id === G.zielId && k.lebt) || null;

function kreaturenAktualisieren(dt) {
  const b = G.slime.body;
  for (const k of G.kreaturen) {
    if (!k.lebt) { k.tot = Math.min(1, k.tot + dt * 1.6); continue; }
    k.wackeln += dt * (2 + k.tempo);

    const dx = b.cx - k.x, dz = b.cz - k.z;
    const dist = Math.hypot(dx, dz);

    // Aggro erst, wenn sie angegriffen wurden oder der Schleim nah kommt.
    if (dist < 7) k.aggro = true;
    if (!k.aggro || G.phase === 'tot') continue;

    const nah = k.reichweite + PARAMS.radius * 0.9;
    if (dist > nah) {
      const s = (k.tempo * dt) / (dist || 1);
      const nx = k.x + dx * s, nz = k.z + dz * s;
      if (istFrei(nx, nz, k.groesse)) { k.x = nx; k.z = nz; }
      k.y = bodenHoehe(k.x, k.z);
    } else if (G.phase !== 'fressen') {
      k.schwung -= dt;
      if (k.schwung <= 0) {
        k.schwung = 2.4;
        spielerSchaden(k.dmg, k);
      }
    }
  }
  // Vollständig ausgeblendete Leichen entfernen.
  for (let i = G.kreaturen.length - 1; i >= 0; i--) {
    if (!G.kreaturen[i].lebt && G.kreaturen[i].tot >= 1) G.kreaturen.splice(i, 1);
  }
}

/* --- Zustandsänderungen (im Netzbetrieb kommen sie vom Server) ------------ */

function kreaturSchaden(k, betrag, quelle = 'angriff') {
  if (!k || !k.lebt) return;
  k.hp = Math.max(0, k.hp - betrag);
  k.aggro = true;
  melden('schaden', { ziel: k.id, betrag, quelle });
  if (window.UI && UI.schwebetext) {
    UI.schwebetext({ text: String(Math.round(betrag)), art: 'schaden', welt: kopfPunkt(k) });
  }
  if (k.hp <= 0) kreaturBesiegt(k);
}

function kreaturBesiegt(k) {
  k.lebt = false;
  k.hp = 0;
  if (G.zielId === k.id) G.zielId = null;
  zaehlen(k.art, 'besiegt');
  xpGeben(Regeln.xpBelohnung(k.level, false));
  G.spieler.gold += Regeln.goldBelohnung(k.level, false);
  melden('besiegt', { ziel: k.id, art: k.art, level: k.level });
}

function spielerSchaden(betrag, von) {
  const p = G.spieler;
  if (p.tot) return;
  p.hp = Math.max(0, p.hp - betrag);
  melden('spielerSchaden', { betrag, von: von?.id ?? null });
  if (window.UI && UI.schwebetext) {
    UI.schwebetext({ text: String(Math.round(betrag)), art: 'erlitten', welt: spielerKopf() });
  }
  if (p.hp <= 0) todStarten();
}

function spielerHeilen(betrag) {
  const p = G.spieler;
  const echt = Math.min(betrag, p.maxHp - p.hp);
  p.hp += echt;
  melden('heilung', { betrag: echt });
  if (window.UI && UI.schwebetext) {
    UI.schwebetext({ text: '+' + Math.round(echt), art: 'heilung', welt: spielerKopf() });
  }
}

function xpGeben(betrag) {
  const p = G.spieler;
  p.xp += betrag;
  melden('xp', { betrag });
  if (window.UI && UI.schwebetext) {
    UI.schwebetext({ text: '+' + betrag + ' XP', art: 'xp', welt: spielerKopf(), hoch: 1.6 });
  }
  let aufgestiegen = false;
  while (p.xp >= p.xpNaechstes && p.level < 80) {
    p.xp -= p.xpNaechstes;
    p.level++;
    p.xpNaechstes = Regeln.xpFuerLevel(p.level);
    aufgestiegen = true;
  }
  if (aufgestiegen) levelUp();
}

function levelUp() {
  const p = G.spieler;
  p.maxHp = Regeln.spielerMaxHp(p.level);
  p.hp = p.maxHp;
  p.maxMana = Regeln.spielerMaxMana(p.level);
  p.mana = p.maxMana;
  // Sichtbare Größe kommt ausschließlich vom Level (GDD 01 §45, GDD 04 §13).
  PARAMS.radius = radiusFuerLevel(p.level);
  melden('levelUp', { level: p.level, radius: PARAMS.radius });
  if (window.UI && UI.levelUp) UI.levelUp(G);
}

function zaehlen(art, feld) {
  const e = G.bestiarium[art] || (G.bestiarium[art] = { besiegt: 0, gefressen: 0 });
  e[feld]++;
}

/* --- Fressen und Tod: nur anstoßen, die Lanes machen den Rest ------------- */

function fressversuch(opts = {}) {
  if (G.phase !== 'frei') return { ok: false, grund: 'beschaeftigt' };
  const k = zielKreatur();
  if (!k) return { ok: false, grund: 'kein ziel' };

  const b = G.slime.body;
  if (Math.hypot(b.cx - k.x, b.cz - k.z) > G.reichweite + PARAMS.radius + k.groesse + 2.5) {
    return { ok: false, grund: 'zu weit' };
  }
  if (G.cooldowns.fressen > 0) return { ok: false, grund: 'abklingzeit' };

  const chance = Regeln.fresschance(G.spieler.level, k.level, k.hp / k.maxHp);
  // Der Server würfelt (GDD 11 §34–35). Offline würfeln wir mit demselben
  // gesäten Generator, damit Aufnahmen wiederholbar bleiben.
  let erfolg;
  if (opts.erzwinge === 'erfolg') erfolg = true;
  else if (opts.erzwinge === 'fehlschlag') erfolg = false;
  else erfolg = RNG.next() < chance;

  G.cooldowns.fressen = 2.5;
  G.phase = 'fressen';
  melden('fressversuch', { ziel: k.id, chance, erfolg });
  Fressen.starten(G, k, erfolg);
  return { ok: true, chance, erfolg };
}

/* Wird von eat.js gerufen, sobald die Animation ihren Ausgang erreicht hat. */
function fressenAbgeschlossen(k, erfolg) {
  if (erfolg) {
    k.lebt = false; k.tot = 1;
    const i = G.kreaturen.indexOf(k);
    if (i >= 0) G.kreaturen.splice(i, 1);
    if (G.zielId === k.id) G.zielId = null;
    zaehlen(k.art, 'gefressen');
    xpGeben(Regeln.xpBelohnung(k.level, true));
    melden('fressErfolg', { art: k.art, level: k.level });
  } else {
    spielerSchaden(Regeln.fehlschlagSchaden(G.spieler.level, k.level), k);
    melden('fressFehlschlag', { art: k.art, level: k.level });
  }
  // G.phase bleibt auf 'fressen', bis die Lane ihre Animation zu Ende gefahren
  // hat. Sie setzt sie am Ende von 'erholen' selbst zurueck.
}

function todStarten() {
  if (G.phase === 'tot') return;
  G.phase = 'tot';
  G.spieler.tot = true;
  G.spieler.hp = 0;
  G.autoAngriff = false;
  G.zielId = null;
  melden('tod', {});
  Tod.starten(G);
}

/* Wird von death.js gerufen, wenn die Pfütze fertig ist. */
function respawn() {
  const p = G.spieler;
  p.tot = false;
  p.hp = Math.round(p.maxHp * 0.5);
  p.mana = Math.round(p.maxMana * 0.5);
  G.phase = 'frei';
  G.slime = createSlime(G.mesh, PARAMS);
  const ort = WELT.friedhof.spawn || WELT.friedhof;
  G.slime.body.cx = ort.x;
  G.slime.body.cz = ort.z;
  for (let i = 0; i < G.slime.body.n; i++) {
    G.slime.body.pos[i * 3] += ort.x;
    G.slime.body.pos[i * 3 + 2] += ort.z;
  }
  G.kamera.tx = ort.x; G.kamera.tz = ort.z;
  melden('respawn', { x: ort.x, z: ort.z });
  if (window.UI && UI.hinweis) UI.hinweis('Am Friedhof wiedererweckt');
}

/* --- Fähigkeiten ---------------------------------------------------------- */

function faehigkeitBenutzen(slot) {
  const f = Regeln.FAEHIGKEITEN[slot];
  if (!f) return { ok: false, grund: 'leer' };
  if (G.phase === 'tot') return { ok: false, grund: 'tot' };
  if ((G.cooldowns[f.id] || 0) > 0) return { ok: false, grund: 'abklingzeit' };
  if (f.kosten > G.spieler.mana) return { ok: false, grund: 'ressource' };

  if (f.typ === 'fressen') return fressversuch({});

  const k = zielKreatur();
  if (f.typ === 'auto') {
    if (!k) return { ok: false, grund: 'kein ziel' };
    G.autoAngriff = true;
    // Sofort zuschlagen, wenn der Takt es hergibt: ein Tastendruck ohne
    // sichtbare Folge fuehlt sich nach einem kaputten Knopf an.
    if (G.schwungZeit <= 0.05 && G.phase === 'frei') G.schwungZeit = 0;
    melden('faehigkeit', { id: f.id, ziel: k.id });
    return { ok: true };
  }
  if (f.typ === 'aktiv') {
    if (!k) return { ok: false, grund: 'kein ziel' };
    const b = G.slime.body;
    if (Math.hypot(b.cx - k.x, b.cz - k.z) > G.reichweite + PARAMS.radius + k.groesse + 3) {
      return { ok: false, grund: 'zu weit' };
    }
    G.spieler.mana -= f.kosten;
    G.cooldowns[f.id] = f.cd;
    kreaturSchaden(k, Regeln.spielerSchaden(G.spieler.level) * f.schaden, f.id);
    if (Combat.faehigkeit) Combat.faehigkeit(G, f, k);
    melden('faehigkeit', { id: f.id, ziel: k.id });
    return { ok: true };
  }
  if (f.typ === 'heil') {
    G.spieler.mana -= f.kosten;
    G.cooldowns[f.id] = f.cd;
    spielerHeilen(G.spieler.maxHp * f.heilung);
    if (Combat.faehigkeit) Combat.faehigkeit(G, f, null);
    melden('faehigkeit', { id: f.id, ziel: null });
    return { ok: true };
  }
  return { ok: false, grund: 'passiv' };
}

/* --- Schritt --------------------------------------------------------------- */

function schritt(dt) {
  G.zeit += dt;

  for (const id in G.cooldowns) {
    if (G.cooldowns[id] > 0) G.cooldowns[id] = Math.max(0, G.cooldowns[id] - dt);
  }
  const p = G.spieler;
  if (!p.tot) p.mana = Math.min(p.maxMana, p.mana + dt * 3.5);

  kreaturenAktualisieren(dt);

  // Die Lanes fassen den Körper an, BEVOR die Physik integriert — sonst
  // wirkt ihr Impuls erst einen Schritt später und die Animation schleppt.
  if (G.phase === 'tot') {
    Tod.aktualisieren(G, dt);
  } else if (G.phase === 'fressen') {
    Fressen.aktualisieren(G, dt);
    /* Wachhund. Wenn die Lane fertig ist oder sich verschluckt hat, bekommt der
     * Spieler die Steuerung zurueck — Kontrollverlust ist laut GDD 01 §67 nie
     * hinnehmbar, auch nicht wegen eines Fehlers in einer Animation. */
    G.fressUhr += dt;
    if (!Fressen.aktiv || G.fressUhr > 6) {
      if (G.fressUhr > 6) melden('fressAbbruch', { nach: Math.round(G.fressUhr * 1000) });
      if (Fressen.zuruecksetzen) Fressen.zuruecksetzen(G);
      G.phase = 'frei';
    }
  } else {
    G.fressUhr = 0;
    Combat.aktualisieren(G, dt);
  }

  // Während Fressen und Tod steuert die Lane, nicht der Spieler.
  if (G.phase !== 'frei') { G.slime.target = null; G.input.axis.x = 0; G.input.axis.z = 0; }

  updateSlime(G.slime, dt, PARAMS, WELT, G.input, G.zeit);

  if (window.UI && UI.aktualisieren) UI.aktualisieren(G, dt);
}

function kameraAktualisieren(Gv, dt) {
  const c = Gv.kamera, b = Gv.slime.body;
  if (c.follow) {
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    c.tx += (b.cx - c.tx) * k;
    c.ty += (b.cy + PARAMS.radius * 0.4 - c.ty) * k;
    c.tz += (b.cz - c.tz) * k;
  }
  c.pitch = Math.max(0.06, Math.min(1.45, c.pitch));
  c.dist = Math.max(3.0, Math.min(45, c.dist));

  const cp = Math.cos(c.pitch);
  c.eye[0] = c.tx + Math.cos(c.yaw) * cp * c.dist;
  c.eye[1] = c.ty + Math.sin(c.pitch) * c.dist;
  c.eye[2] = c.tz + Math.sin(c.yaw) * cp * c.dist;
  if (c.eye[1] < 0.4) c.eye[1] = 0.4;

  const ansicht = window.ANSICHT || { w: 1600, h: 900 };
  const proj = M4.perspective(Math.PI / 3.6, ansicht.w / Math.max(ansicht.h, 1), 0.1, 300);
  const viewM = M4.lookAt(c.eye, [c.tx, c.ty, c.tz], [0, 1, 0]);
  c.viewProj = M4.multiply(proj, viewM, c.viewProj);
  c.invViewProj = M4.invert(c.viewProj);
}

function zeichnen() {
  const ansicht = window.ANSICHT;
  G.applySurface(G.slime.body.pos);
  const zeichne = (REND.pfad === 2 && typeof renderScene2 === 'function') ? renderScene2 : renderScene;
  zeichne(REND, {
    view: ansicht, world: WELT, slime: G.slime, surface: G.surface,
    camera: G.kamera, params: PARAMS, faction: G.spieler.faction,
    time: G.zeit, debug: G.debug, game: G, R: REND,
  });
}

/* --- Hilfspunkte für Schwebetext ------------------------------------------ */
const kopfPunkt = (k) => ({ x: k.x, y: k.y + k.groesse * 2.1, z: k.z });
const spielerKopf = () => ({
  x: G.slime.body.cx, y: G.slime.body.cy + PARAMS.radius * 1.5, z: G.slime.body.cz,
});

function melden(ereignis, daten) {
  // Nutzdaten zuerst: sonst ueberschreibt ein Feld 'art' (Kreaturenart) den
  // Ereignisnamen, und 'besiegt' erscheint im Protokoll als 'wolf'.
  G.ereignisse.push({ ...daten, t: Math.round(G.zeit * 1000), art: ereignis });
  if (G.ereignisse.length > 400) G.ereignisse.shift();
}

/* --- Messwerte für den Kritiker ------------------------------------------- */

function metrics() {
  const s = G.slime, b = s.body;
  const m = Deform.masse(b, s.fx, s.fz);
  const ruheH = PARAMS.radius * 2 * PARAMS.squat;
  const ruheB = PARAMS.radius * 2;
  let vol = 0;
  const idx = b.mesh.indices;
  for (let t = 0; t < idx.length; t += 3) {
    vol += signedTetra(b.pos, idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3, b.cx, b.cy, b.cz);
  }
  const ruheVol = (4 / 3) * Math.PI * Math.pow(PARAMS.radius, 3) * PARAMS.squat;
  const z = zielKreatur();
  const r = PARAMS.radius;
  return {
    bbox: { w: +m.w.toFixed(3), h: +m.h.toFixed(3), d: +m.d.toFixed(3) },
    // Auf den Ruheradius bezogen: nur so sind Aufnahmen ueber verschiedene
    // Level hinweg vergleichbar, weil die Groesse mit dem Level waechst.
    bboxRel: { w: +(m.w / (2 * r)).toFixed(3), h: +(m.h / (2 * r)).toFixed(3),
               d: +(m.d / (2 * r)).toFixed(3) },
    squash: +(m.h / ruheH).toFixed(3),
    breite: +(Math.max(m.w, m.d) / ruheB).toFixed(3),
    streckung: +m.streckung.toFixed(3),
    achsen: {
      vorne: +m.vorne.toFixed(3), hinten: +m.hinten.toFixed(3),
      links: +m.links.toFixed(3), rechts: +m.rechts.toFixed(3),
      oben: +m.oben.toFixed(3), unten: +m.unten.toFixed(3),
    },
    volumen: +(vol / ruheVol).toFixed(3),
    speed: +s.speed.toFixed(3),
    speedRatio: +s.speedRatio.toFixed(3),
    hoeheSchwerpunkt: +b.cy.toFixed(3),
    grounded: b.grounded,
    phase: G.phase,
    unterphase: (window.Fressen && Fressen.phase) || (window.Tod && Tod.phase) || '',
    playerHp: Math.round(G.spieler.hp),
    playerMaxHp: G.spieler.maxHp,
    level: G.spieler.level,
    radius: +PARAMS.radius.toFixed(3),
    zielHp: z ? Math.round(z.hp) : null,
    zielMaxHp: z ? z.maxHp : null,
    kreaturen: G.kreaturen.filter(k => k.lebt).length,
  };
}

/* --- Öffentliche Schnittstelle -------------------------------------------- */

const API = {
  reset: (o) => zuruecksetzen(o || {}),
  setCamera(o) {
    Object.assign(G.kamera, o);
    if (o.follow === false) { /* eingefroren, Ziel bleibt stehen */ }
    kameraAktualisieren(G, 1);
  },
  moveTo(x, z) { G.slime.target = { x, z }; },
  stop() { G.slime.target = null; },
  setDrive(x, z) { G.input.axis.x = x; G.input.axis.z = z; },
  dropFrom(h) {
    const b = G.slime.body;
    for (let i = 0; i < b.n; i++) { b.pos[i * 3 + 1] += h; b.vel[i * 3 + 1] = 0; }
  },
  spawnCreature: kreaturSetzen,
  selectTarget(id) { G.zielId = id; },
  setAutoAttack(v) { G.autoAngriff = !!v; },
  useAbility: (slot) => faehigkeitBenutzen(slot),
  tryEat: (o) => fressversuch(o || {}),
  damagePlayer: (n) => spielerSchaden(n, null),
  healPlayer: (n) => spielerHeilen(n),
  killPlayer: () => { G.spieler.hp = 0; todStarten(); },
  grantXp: (n) => xpGeben(n),
  setHudVisible(v) {
    G.hudSichtbar = !!v;
    document.body.classList.toggle('hud-aus', !v);
  },
  metrics,
  state: () => ({
    phase: G.phase, level: G.spieler.level, hp: G.spieler.hp, xp: G.spieler.xp,
    ziel: G.zielId, kreaturen: G.kreaturen.length, bestiarium: G.bestiarium,
    ereignisse: G.ereignisse.slice(-40),
  }),
};

window.G = G;
window.SLIMORIA = {
  bereit: false,
  G, api: API, R: null,
  step(dt) { schritt(dt); kameraAktualisieren(G, dt); },
  render: zeichnen,
  aufbauen: spielAufbauen,
};
window.SPIEL = {
  kreaturSchaden, kreaturBesiegt, spielerSchaden, spielerHeilen,
  fressenAbgeschlossen, respawn, zielKreatur, kopfPunkt, spielerKopf,
  melden, xpGeben, faehigkeitBenutzen, fressversuch, zuruecksetzen,
};
