/* ---------------------------------------------------------------------------
 * Die autoritative Welt.
 *
 * Hier — und nur hier — werden HP, XP, Level, Kreaturenzustand, Tod und
 * Respawn gefuehrt (GDD 11 §3–7, §98, §106, §120). Der Client sagt, was er
 * moechte; was daraus wird, entscheidet diese Datei.
 *
 * Der wichtigste Punkt ist der Fressversuch (GDD 11 §33–35): der Server
 * berechnet die Chance mit shared/regeln.js und wuerfelt mit einem
 * reproduzierbaren Wurfstrom. Der Client bekommt nur das Ergebnis und spielt
 * die Animation dazu (§39) — er kann es nicht beeinflussen, weil er nichts
 * schickt, das in die Rechnung eingeht ausser "ich will Ziel X fressen".
 *
 * Bewusst KEINE Zeitquelle in dieser Datei: `schritt(dt)` bekommt immer
 * denselben festen Schritt vom Aufrufer. Dieselbe Folge von Eingaben ergibt
 * damit immer denselben Verlauf.
 * ------------------------------------------------------------------------- */

import { createRequire } from 'node:module';
import { WELT, bodenHoehe, istFrei, PARAMS, radiusFuerLevel } from './arena.mjs';
import { wurf } from './zufall.mjs';

const require = createRequire(import.meta.url);
const Regeln = require('../shared/regeln.js');

/* Werte, die der Client in game.js/combat.js genauso fuehrt. Sie stehen dort
 * als Konstanten im gesperrten Kern; hier stehen sie mit derselben Bedeutung. */
const REICHWEITE = 2.6;          // game.js G.reichweite
const SCHWUNG_DAUER = 2.0;       // game.js G.schwungDauer (GDD 02 §5)
const KREATUR_TAKT = 2.4;        // game.js kreaturenAktualisieren
const MANA_REGEN = 3.5;          // game.js schritt
const FRESS_CD = 2.5;            // Regeln.FAEHIGKEITEN 'fressen'
const KREATUR_RESPAWN = 14;      // Sekunden, bis ein Spawnpunkt wieder besetzt ist
const SPIELER_RESPAWN = 4.0;     // Sekunden am Friedhof (GDD 01 §70 Punkt 22)
const AGGRO_RADIUS = 7;          // game.js

/* Wie lange der Fressversuch als eigener Weltzustand steht, bevor sein Ausgang
 * gilt (GDD 11 §38/§39). Der Wert deckt Anlauf (0,30 s), Umschlingen (0,55 s)
 * und Absorbieren (0,38 s) aus client/eat.js ab und laesst Reserve fuer die
 * Leitung. Vorher verschwand die Kreatur im selben Takt, in dem der Versuch
 * begann — ein zusehender Client konnte die Umschlingung nie zeichnen. */
const FRESS_LAUF = 1.6;

/* Wie weit der Schwerpunkt des Spielers in ein Hindernis hineinragen darf.
 * Nicht null: der Koerper ist eine Punktwolke, sein Schwerpunkt kommt der
 * Wand naeher als jeder einzelne Punkt. Aber deutlich unter dem Radius —
 * durch die enge Passage (Luecke 1,8 m) muss er weiterhin passen (GDD 01 §17). */
const SPIELER_HUELLE = 0.25;

/* Breite Mauern sind im Prototyp Plateaus: auf ihnen steht der Schleim, sie
 * sind Boden und kein Hindernis (GDD 01 §20). Schmale sind Waende, und ueber
 * die kommt niemand (GDD 01 §16). `istFrei` aus der Arena kennt den
 * Unterschied nicht, weil es fuer Kreaturen gedacht ist — die klettern nie. */
const PLATEAU_BREITE = 2.0;

const KREATUR_ARTEN = ['schleimling', 'wolf', 'eber', 'wolf', 'schleimling', 'eber'];

export function erzeugeWelt({ startwert = 1234 } = {}) {

  const welt = {
    tick: 0,
    startwert,
    spieler: new Map(),          // id -> Spieler
    kreaturen: new Map(),        // id -> Kreatur
    naechsteId: 1,
    ereignisse: [],              // pro Tick gesammelt, danach geleert
  };

  const neueId = () => welt.naechsteId++;
  const melden = (art, daten) => welt.ereignisse.push({ art, ...daten });

  /* --- Kreaturen --------------------------------------------------------- */

  function kreaturSetzen({ art = 'wolf', level = 1, x = 6, z = 0, spawn = null, hpAnteil = 1 }) {
    const w = Regeln.kreaturWerte(art, level);
    const k = {
      id: neueId(),
      art, level, name: w.name,
      x, z, y: bodenHoehe(x, z),
      hp: Math.max(1, Math.round(w.maxHp * hpAnteil)), maxHp: w.maxHp, dmg: w.dmg,
      reichweite: w.reichweite, tempo: w.tempo, groesse: w.groesse,
      lebt: true, aggro: false, schwung: 0,
      spawn,                     // Ruhepunkt, an dem sie wieder erscheint
      leiche: 0,                 // Sekunden seit dem Tod
      fresser: null,             // Spieler, der sie gerade umschlingt (GDD 01 §28)
    };
    welt.kreaturen.set(k.id, k);
    return k;
  }

  /* Startaufstellung wie in client/main.js arenaFuellen — damit ein Client,
   * der sich verbindet, dieselbe Arena sieht, die er offline sehen wuerde. */
  function arenaFuellen() {
    WELT.spawns.forEach((s, i) => {
      kreaturSetzen({ art: KREATUR_ARTEN[i % KREATUR_ARTEN.length], level: 1 + (i % 3),
                      x: s.x, z: s.z, spawn: i });
    });
  }

  function naechsterSpieler(x, z) {
    let beste = null, bestD = Infinity;
    for (const p of welt.spieler.values()) {
      if (p.tot) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) { bestD = d; beste = p; }
    }
    return beste ? { p: beste, d: bestD } : null;
  }

  function kreaturenSchritt(dt) {
    for (const k of [...welt.kreaturen.values()]) {
      if (!k.lebt) {
        k.leiche += dt;
        if (k.leiche > KREATUR_RESPAWN) {
          welt.kreaturen.delete(k.id);
          if (k.spawn !== null) {
            const s = WELT.spawns[k.spawn];
            kreaturSetzen({ art: k.art, level: k.level, x: s.x, z: s.z, spawn: k.spawn });
          }
        }
        continue;
      }

      /* Wer umschlungen wird, tut nichts mehr: er steckt in der Masse und
       * bleibt dort stehen, bis der Versuch entschieden ist (GDD 01 §28). */
      if (k.fresser !== null) continue;

      const nah = naechsterSpieler(k.x, k.z);
      if (!nah) continue;
      const p = nah.p, dist = nah.d;
      if (dist < AGGRO_RADIUS) k.aggro = true;
      if (!k.aggro) continue;

      const rand = k.reichweite + radiusFuerLevel(p.level) * 0.9;
      if (dist > rand) {
        const s = (k.tempo * dt) / (dist || 1);
        const nx = k.x + (p.x - k.x) * s, nz = k.z + (p.z - k.z) * s;
        if (istFrei(nx, nz, k.groesse)) { k.x = nx; k.z = nz; }
        k.y = bodenHoehe(k.x, k.z);
      } else {
        k.schwung -= dt;
        if (k.schwung <= 0) {
          k.schwung = KREATUR_TAKT;
          spielerSchaden(p, k.dmg, k.id);
        }
      }
    }
  }

  /* --- Spieler ----------------------------------------------------------- */

  function spielerAufnehmen(name, faction, gespeichert) {
    const p = {
      id: neueId(),
      name, faction: faction || 'eldoran',
      level: 1, xp: 0, xpNaechstes: Regeln.xpFuerLevel(1),
      hp: 0, maxHp: 0, mana: 0, maxMana: 0, gold: 0,
      x: 0, z: 0,
      zielId: null, autoAngriff: false, schwungZeit: 0,
      folge: 0,                  // letzte verarbeitete Positionsmeldung
      zwang: 0,                  // zaehlt erzwungene Versetzungen (Respawn)
      fressCd: 0, cooldowns: {},
      tot: false, respawnZeit: 0,
      fressLauf: null,           // laufender Fressversuch (GDD 11 §38)
      bestiarium: {},
      wuerfe: 0,                 // Zaehler des persoenlichen Wurfstroms
      wegBudget: 0,              // erlaubte Strecke bis zur naechsten Meldung
      dreckig: true,             // muss gespeichert werden
    };

    if (gespeichert) {
      p.faction = gespeichert.faction || p.faction;
      p.level = gespeichert.level || 1;
      p.xp = gespeichert.xp || 0;
      p.gold = gespeichert.gold || 0;
      p.bestiarium = gespeichert.bestiarium || {};
      p.wuerfe = gespeichert.wuerfe || 0;
      if (typeof gespeichert.x === 'number') { p.x = gespeichert.x; p.z = gespeichert.z; }
    }
    p.xpNaechstes = Regeln.xpFuerLevel(p.level);
    p.maxHp = Regeln.spielerMaxHp(p.level);
    p.maxMana = Regeln.spielerMaxMana(p.level);
    p.hp = gespeichert && gespeichert.hp > 0 ? Math.min(gespeichert.hp, p.maxHp) : p.maxHp;
    p.mana = p.maxMana;

    welt.spieler.set(p.id, p);
    melden('beitritt', { spieler: p.id, name: p.name, level: p.level });
    return p;
  }

  function spielerEntfernen(id) {
    const p = welt.spieler.get(id);
    if (!p) return null;
    // Sonst bliebe eine umschlungene Kreatur fuer immer regungslos stehen.
    fressLaufAbbrechen(p);
    welt.spieler.delete(id);
    melden('verlassen', { spieler: id, name: p.name });
    return p;
  }

  /* --- Hindernisse fuer den Spieler ---------------------------------------
   *
   * `istFrei` aus der Arena wurde bisher nur fuer Kreaturen benutzt. Ein
   * manipulierter Client konnte sich deshalb mitten durch Felsen und Mauern
   * melden, solange er dabei langsam genug blieb (GDD 11 §7/§21). Fuer den
   * Spieler gelten dieselben Hindernisse, nur mit zwei Unterschieden: er ist
   * eine Punktwolke, kein Kreis (deshalb die kleine Huelle), und er steht auf
   * breiten Mauern oben drauf, statt an ihnen abzuprallen. */
  function spielerFrei(x, z) {
    for (const o of WELT.obstacles) {
      if (o.type === 'rock') {
        if (Math.hypot(x - o.x, z - o.z) < o.r + SPIELER_HUELLE) return false;
      } else {
        if (Math.min(o.w, o.d) >= PLATEAU_BREITE) continue;   // Plateau = Boden
        if (Math.abs(x - o.x) < o.w * 0.5 + SPIELER_HUELLE &&
            Math.abs(z - o.z) < o.d * 0.5 + SPIELER_HUELLE) return false;
      }
    }
    return true;
  }

  /* Der gemeldete Weg wird abgeschritten statt nur an seinem Ende geprueft —
   * sonst huepft eine Meldung ueber eine duenne Mauer hinweg, ohne je in ihr
   * zu liegen. Am Hindernis wird nicht abgewiesen, sondern entlanggerutscht:
   * ein ehrlicher Client soll an einer Kante nicht haengenbleiben. */
  function wegAbschreiten(vonX, vonZ, nachX, nachZ) {
    const bis = (zx, zz) => {
      const dx = zx - vonX, dz = zz - vonZ;
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.30));
      let ex = vonX, ez = vonZ;
      for (let i = 1; i <= n; i++) {
        const px = vonX + dx * i / n, pz = vonZ + dz * i / n;
        if (!spielerFrei(px, pz)) break;
        ex = px; ez = pz;
      }
      return { x: ex, z: ez, weit: Math.hypot(ex - vonX, ez - vonZ) };
    };

    let beste = bis(nachX, nachZ);
    if (Math.abs(beste.x - nachX) < 1e-9 && Math.abs(beste.z - nachZ) < 1e-9) return beste;
    for (const r of [bis(nachX, vonZ), bis(vonX, nachZ)]) if (r.weit > beste.weit) beste = r;
    return beste;
  }

  /* Der Client sagt, wo er sich vorhergesagt hat (GDD 11 §23). Der Server
   * glaubt ihm nur, solange die Strecke zum Hoechsttempo passt und der Weg
   * frei ist — sonst schiebt er ihn nur so weit, wie erlaubt gewesen waere.
   * Die Differenz ist die Korrektur, die der Client weich ausgleicht (§24–25).
   *
   * `folge` ist die laufende Nummer der Meldung. Sie geht im Zustand zurueck
   * an den Client, damit der seine Korrektur gegen den EIGENEN damaligen
   * Stand rechnet und nicht gegen einen um die Laufzeit veralteten. Ohne das
   * bremst sich ein laufender Schleim selbst aus. */
  function positionMelden(p, x, z, folge) {
    if (p.tot) return;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    if (Number.isFinite(folge)) p.folge = folge;
    const dx = x - p.x, dz = z - p.z;
    const d = Math.hypot(dx, dz);
    let zx = x, zz = z;
    if (d > p.wegBudget) {
      const f = p.wegBudget / (d || 1);
      zx = p.x + dx * f; zz = p.z + dz * f;
      p.wegBudget = 0;
    } else {
      p.wegBudget -= d;
    }
    const grenze = WELT.bounds - 0.6;
    zx = Math.max(-grenze, Math.min(grenze, zx));
    zz = Math.max(-grenze, Math.min(grenze, zz));

    /* Steckt der Spieler bereits in einem Hindernis — Respawn, Levelsprung,
     * geaenderte Arena —, wird er nicht auch noch eingesperrt: dann gilt die
     * Meldung, damit er wieder herausfindet. */
    if (!spielerFrei(p.x, p.z)) { p.x = zx; p.z = zz; return; }

    const ziel = wegAbschreiten(p.x, p.z, zx, zz);
    p.x = ziel.x;
    p.z = ziel.z;
  }

  function spielerSchaden(p, betrag, vonKreatur = null) {
    if (p.tot) return;
    p.hp = Math.max(0, p.hp - betrag);
    melden('spielerSchaden', { spieler: p.id, betrag: Math.round(betrag), von: vonKreatur });
    p.dreckig = true;
    if (p.hp <= 0) todStarten(p);
  }

  function spielerHeilen(p, betrag) {
    const echt = Math.min(betrag, p.maxHp - p.hp);
    p.hp += echt;
    melden('heilung', { spieler: p.id, betrag: Math.round(echt) });
    p.dreckig = true;
  }

  function xpGeben(p, betrag) {
    p.xp += betrag;
    melden('xp', { spieler: p.id, betrag });
    let aufgestiegen = false;
    while (p.xp >= p.xpNaechstes && p.level < 80) {
      p.xp -= p.xpNaechstes;
      p.level++;
      p.xpNaechstes = Regeln.xpFuerLevel(p.level);
      aufgestiegen = true;
    }
    if (aufgestiegen) {
      p.maxHp = Regeln.spielerMaxHp(p.level);
      p.hp = p.maxHp;
      p.maxMana = Regeln.spielerMaxMana(p.level);
      p.mana = p.maxMana;
      melden('levelUp', { spieler: p.id, level: p.level });
    }
    p.dreckig = true;
  }

  function zaehlen(p, art, feld) {
    const e = p.bestiarium[art] || (p.bestiarium[art] = { besiegt: 0, gefressen: 0 });
    e[feld]++;
  }

  function todStarten(p) {
    if (p.tot) return;
    p.tot = true;
    fressLaufAbbrechen(p);
    p.hp = 0;
    p.autoAngriff = false;
    p.zielId = null;
    p.respawnZeit = SPIELER_RESPAWN;
    melden('tod', { spieler: p.id });
  }

  function respawn(p) {
    p.tot = false;
    p.hp = Math.round(p.maxHp * 0.5);
    p.mana = Math.round(p.maxMana * 0.5);
    p.x = WELT.friedhof.x;
    p.z = WELT.friedhof.z;
    p.wegBudget = 0;
    p.zwang++;                   // Versetzung, keine Korrektur: hier darf gesprungen werden
    melden('respawn', { spieler: p.id, x: p.x, z: p.z });
    p.dreckig = true;
  }

  function kreaturSchaden(p, k, betrag, quelle) {
    if (!k || !k.lebt) return;
    // In der Masse ist sie unerreichbar — dort entscheidet der Fresswurf.
    if (k.fresser !== null) return;
    k.hp = Math.max(0, k.hp - betrag);
    k.aggro = true;
    melden('schaden', { ziel: k.id, betrag: Math.round(betrag), quelle, von: p ? p.id : null });
    if (k.hp <= 0) kreaturBesiegt(p, k);
  }

  function kreaturBesiegt(p, k) {
    k.lebt = false;
    k.hp = 0;
    k.leiche = 0;
    for (const s of welt.spieler.values()) if (s.zielId === k.id) s.zielId = null;
    if (p) {
      zaehlen(p, k.art, 'besiegt');
      xpGeben(p, Regeln.xpBelohnung(k.level, false));
      p.gold += Regeln.goldBelohnung(k.level, false);
    }
    // `art` ist der Ereignisname — die Kreaturenart heisst deshalb `kreaturArt`.
    melden('besiegt', { ziel: k.id, kreaturArt: k.art, level: k.level, von: p ? p.id : null });
  }

  /* --- Reichweiten (identisch zu game.js/combat.js) ----------------------- */

  const inKampfReichweite = (p, k) =>
    Math.hypot(p.x - k.x, p.z - k.z) <= REICHWEITE + radiusFuerLevel(p.level) + k.groesse;

  const inFressReichweite = (p, k) =>
    Math.hypot(p.x - k.x, p.z - k.z) <= REICHWEITE + radiusFuerLevel(p.level) + k.groesse + 2.5;

  /* --- Fressversuch: der Kern der Serverautoritaet ------------------------
   *
   * Zwei Zustaende statt einem (GDD 11 §38/§39). Frueher gab es nur das
   * fertige Ergebnis, und bei Erfolg verschwand die Kreatur im selben Takt,
   * in dem der Versuch begann — Anlauf, Umschlingen und Absorption konnte
   * niemand zeichnen, der nur zusah.
   *
   *   `fressBeginn`    Der Versuch laeuft. Die Kreatur bleibt in der Welt und
   *                    haelt still: sie steckt in der Masse (GDD 01 §28).
   *                    Aus diesem Zustand erzeugt jeder Client die Animation
   *                    selbst — uebertragen wird Zustand, kein Mesh (§39).
   *   `fressErgebnis`  Erst danach gilt der Ausgang: Kreatur weg und XP, oder
   *                    Schaden fuer den Fehlschlag.
   *
   * Gewuerfelt wird weiterhin beim Beginn und ausschliesslich hier: der Wurf
   * darf nicht davon abhaengen, was in den 1,6 Sekunden dazwischen passiert,
   * sonst waere die Folge nicht mehr reproduzierbar. Der Ausgang steht damit
   * fest, bevor der Client ihn kennt — er kann ihn nicht mehr beeinflussen.
   * Er steht in `fressBeginn`, weil der Client sonst 1,6 Sekunden lang
   * dastuende, bevor seine eigene Animation anlaeuft. */

  function fressversuch(p, zielId) {
    if (p.tot) return { erlaubt: false, grund: 'tot' };
    if (p.fressLauf) return { erlaubt: false, grund: 'beschaeftigt' };
    if (p.fressCd > 0) return { erlaubt: false, grund: 'abklingzeit' };

    const k = welt.kreaturen.get(zielId ?? p.zielId);
    if (!k || !k.lebt) return { erlaubt: false, grund: 'kein ziel' };
    if (k.fresser !== null) return { erlaubt: false, grund: 'kein ziel' };
    if (!inFressReichweite(p, k)) return { erlaubt: false, grund: 'zu weit' };

    /* Chance aus den gemeinsamen Regeln — mit SERVER-Werten fuer Level und
     * Restleben. Der Client schickt keine Zahl, die hier eingehen koennte. */
    const chance = Regeln.fresschance(p.level, k.level, k.hp / k.maxHp);

    const nr = p.wuerfe++;
    const augen = wurf(welt.startwert, p.name, nr);
    const erfolg = augen < chance;

    p.fressCd = FRESS_CD;
    p.dreckig = true;

    k.fresser = p.id;
    k.aggro = false;
    p.fressLauf = {
      ziel: k.id, kreaturArt: k.art, kreaturLevel: k.level,
      chance, augen, wurfNr: nr, erfolg, rest: FRESS_LAUF,
    };

    melden('fressBeginn', {
      spieler: p.id, ziel: k.id, kreaturArt: k.art, level: k.level,
      chance: +chance.toFixed(4), erfolg, dauer: FRESS_LAUF,
    });
    return { erlaubt: true, begonnen: true, chance, augen, erfolg, wurfNr: nr, ziel: k.id };
  }

  /* Der Ausgang, sobald die Animation ihn erreicht haben kann. */
  function fressAbschliessen(p) {
    const lauf = p.fressLauf;
    p.fressLauf = null;
    const k = welt.kreaturen.get(lauf.ziel);
    if (k) k.fresser = null;

    if (lauf.erfolg && k && k.lebt) {
      /* Gefressen heisst: weg aus der Welt. Der Eintrag bleibt nur als Leiche
       * stehen, damit der Spawnpunkt spaeter wieder besetzt wird — an die
       * Clients geht er nicht mehr (siehe zustand()). */
      k.lebt = false;
      k.hp = 0;
      k.leiche = 0;
      k.gefressen = true;
      for (const s of welt.spieler.values()) if (s.zielId === k.id) s.zielId = null;
      zaehlen(p, k.art, 'gefressen');
      xpGeben(p, Regeln.xpBelohnung(lauf.kreaturLevel, true));
    } else if (!lauf.erfolg) {
      spielerSchaden(p, Regeln.fehlschlagSchaden(p.level, lauf.kreaturLevel), lauf.ziel);
    }

    melden('fressErgebnis', {
      spieler: p.id, ziel: lauf.ziel, kreaturArt: lauf.kreaturArt, level: lauf.kreaturLevel,
      chance: +lauf.chance.toFixed(4), augen: +lauf.augen.toFixed(6),
      wurfNr: lauf.wurfNr, erfolg: lauf.erfolg,
    });
  }

  /* Abbruch ohne Ausgang — Tod, Verbindungsende, neuer Pruefaufbau. Die
   * Kreatur wird wieder freigegeben, gemeldet wird nichts: es gab kein
   * Ergebnis, und der Client soll keins anzeigen. */
  function fressLaufAbbrechen(p) {
    if (!p.fressLauf) return;
    const k = welt.kreaturen.get(p.fressLauf.ziel);
    if (k) k.fresser = null;
    p.fressLauf = null;
  }

  /* --- Faehigkeiten ------------------------------------------------------- */

  function faehigkeit(p, slot) {
    const f = Regeln.FAEHIGKEITEN[slot];
    if (!f) return { erlaubt: false, grund: 'leer' };
    if (p.tot) return { erlaubt: false, grund: 'tot' };
    if (f.typ === 'fressen') return fressversuch(p, p.zielId);
    if ((p.cooldowns[f.id] || 0) > 0) return { erlaubt: false, grund: 'abklingzeit' };
    if (f.kosten > p.mana) return { erlaubt: false, grund: 'ressource' };

    if (f.typ === 'aktiv') {
      const k = welt.kreaturen.get(p.zielId);
      if (!k || !k.lebt) return { erlaubt: false, grund: 'kein ziel' };
      if (Math.hypot(p.x - k.x, p.z - k.z) > REICHWEITE + radiusFuerLevel(p.level) + k.groesse + 3) {
        return { erlaubt: false, grund: 'zu weit' };
      }
      p.mana -= f.kosten;
      p.cooldowns[f.id] = f.cd;
      kreaturSchaden(p, k, Regeln.spielerSchaden(p.level) * f.schaden, f.id);
      melden('faehigkeit', { spieler: p.id, id: f.id, ziel: k.id });
      return { erlaubt: true };
    }
    if (f.typ === 'heil') {
      p.mana -= f.kosten;
      p.cooldowns[f.id] = f.cd;
      spielerHeilen(p, p.maxHp * f.heilung);
      melden('faehigkeit', { spieler: p.id, id: f.id, ziel: null });
      return { erlaubt: true };
    }
    return { erlaubt: false, grund: 'passiv' };
  }

  /* --- Ein Tick ----------------------------------------------------------- */

  function schritt(dt) {
    welt.tick++;

    for (const p of welt.spieler.values()) {
      p.wegBudget = Math.min(p.wegBudget + PARAMS.maxSpeed * 1.35 * dt, PARAMS.maxSpeed * 0.5);
      if (p.fressCd > 0) p.fressCd = Math.max(0, p.fressCd - dt);
      for (const id in p.cooldowns) {
        if (p.cooldowns[id] > 0) p.cooldowns[id] = Math.max(0, p.cooldowns[id] - dt);
      }
      if (p.tot) {
        p.respawnZeit -= dt;
        if (p.respawnZeit <= 0) respawn(p);
        continue;
      }
      p.mana = Math.min(p.maxMana, p.mana + dt * MANA_REGEN);

      if (p.fressLauf) {
        p.fressLauf.rest -= dt;
        if (p.fressLauf.rest <= 0) fressAbschliessen(p);
        continue;                // waehrend des Umschlingens wird nicht gebissen
      }

      /* Auto-Angriff (GDD 02 §5): laeuft weiter, solange das Ziel lebt und in
       * Reichweite ist. Der Takt gehoert dem Server, nicht dem Client. */
      const k = welt.kreaturen.get(p.zielId);
      if (p.autoAngriff && k && k.lebt && inKampfReichweite(p, k)) {
        p.schwungZeit -= dt;
        if (p.schwungZeit <= 0) {
          p.schwungZeit = SCHWUNG_DAUER;
          kreaturSchaden(p, k, Regeln.spielerSchaden(p.level), 'auto');
        }
      } else {
        p.schwungZeit = Math.max(0, Math.min(p.schwungZeit, SCHWUNG_DAUER));
      }
    }

    kreaturenSchritt(dt);
  }

  /* --- Was die Clients sehen ---------------------------------------------- */

  function zustand() {
    const spieler = [];
    for (const p of welt.spieler.values()) {
      spieler.push({
        id: p.id, name: p.name, faction: p.faction, level: p.level,
        x: +p.x.toFixed(3), z: +p.z.toFixed(3),
        hp: Math.round(p.hp), maxHp: p.maxHp,
        mana: Math.round(p.mana), maxMana: p.maxMana,
        xp: p.xp, xpNaechstes: p.xpNaechstes, gold: p.gold,
        zielId: p.zielId, autoAngriff: p.autoAngriff, tot: p.tot,
        // Laufender Fressversuch als Zustand (GDD 11 §38): daraus zeichnet
        // auch ein zusehender Client, dass hier gerade umschlungen wird.
        frisst: p.fressLauf ? p.fressLauf.ziel : null,
        folge: p.folge, zwang: p.zwang,
      });
    }
    const kreaturen = [];
    for (const k of welt.kreaturen.values()) {
      if (k.gefressen) continue;         // in der Masse verschwunden (GDD 01 §29)
      kreaturen.push({
        id: k.id, art: k.art, level: k.level,
        x: +k.x.toFixed(3), z: +k.z.toFixed(3),
        hp: Math.round(k.hp), maxHp: k.maxHp, lebt: k.lebt,
        fresser: k.fresser,
      });
    }
    return { typ: 'zustand', tick: welt.tick, spieler, kreaturen };
  }

  function ereignisseHolen() {
    const e = welt.ereignisse;
    welt.ereignisse = [];
    return e;
  }

  function speicherstand(p) {
    return {
      name: p.name, faction: p.faction, level: p.level, xp: p.xp,
      hp: Math.round(p.hp), gold: p.gold, bestiarium: p.bestiarium,
      wuerfe: p.wuerfe, x: +p.x.toFixed(3), z: +p.z.toFixed(3),
    };
  }

  /* --- Pruefaufbau (nur mit --test) ---------------------------------------
   * Setzt eine reproduzierbare Ausgangslage fuer tools/zweispieler.mjs. Der
   * Aufbau aendert NICHTS am Wuerfeln: Chance und Wurf entstehen weiterhin
   * ausschliesslich aus Serverwerten. */
  function pruefAufbau(p, o = {}) {
    if (typeof o.level === 'number') {
      p.level = o.level;
      p.xp = o.xp || 0;
      p.xpNaechstes = Regeln.xpFuerLevel(p.level);
      p.maxHp = Regeln.spielerMaxHp(p.level);
      p.hp = p.maxHp;
      p.maxMana = Regeln.spielerMaxMana(p.level);
      p.mana = p.maxMana;
      p.tot = false;
    }
    if (o.wuerfe !== undefined) p.wuerfe = o.wuerfe;
    fressLaufAbbrechen(p);
    p.fressCd = 0;
    p.cooldowns = {};

    let ziel = null;
    if (o.kreatur) {
      // Alte Pruefkreaturen wegraeumen, damit die Lage exakt gleich bleibt.
      for (const k of [...welt.kreaturen.values()]) {
        if (k.pruef) welt.kreaturen.delete(k.id);
      }
      /* Freie Bahn: alle uebrigen Kreaturen zurueck auf ihren Ruhepunkt und
       * Aggro loeschen. Ohne das haengt das Ergebnis davon ab, wie viele
       * Kreaturen sich waehrend der bisherigen Pruefungen um den Nullpunkt
       * versammelt haben — der Aufbau waere nicht wiederholbar. */
      if (o.freieBahn !== false) {
        for (const k of welt.kreaturen.values()) {
          if (k.spawn === null || k.spawn === undefined) continue;
          const s = WELT.spawns[k.spawn];
          k.x = s.x; k.z = s.z; k.y = bodenHoehe(s.x, s.z);
          k.aggro = false;
          k.schwung = KREATUR_TAKT;
        }
      }
      const abstand = o.abstand ?? 2.2;
      const k = kreaturSetzen({
        art: o.kreatur.art || 'wolf', level: o.kreatur.level || 1,
        x: p.x + abstand, z: p.z, hpAnteil: o.kreatur.hpAnteil ?? 1,
      });
      k.pruef = true;
      k.aggro = false;
      k.spawn = null;
      p.zielId = k.id;
      ziel = k.id;
    }
    p.dreckig = true;
    return { ziel, level: p.level, wuerfe: p.wuerfe };
  }

  arenaFuellen();

  return {
    welt, schritt, zustand, ereignisseHolen,
    spielerAufnehmen, spielerEntfernen, positionMelden, spielerFrei,
    fressversuch, faehigkeit, kreaturSetzen, speicherstand, pruefAufbau,
    spielerSchaden, spielerHeilen, xpGeben,
  };
}
