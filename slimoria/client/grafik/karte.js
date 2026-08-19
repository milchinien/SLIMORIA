'use strict';
/* ===========================================================================
 * grafik/karte.js — Aufbau der Arena und Register fuer die Ausstattung.
 *
 * Besitzer: Lane KARTE-0. Vertrag: GRAFIK-MODULE.md §3, ordnung 40.
 * Der Entwurf, aus dem die Platzierung unten stammt, steht in KARTE-ENTWURF.md.
 *
 * DIE EINE REGEL, die diese Datei traegt:
 *   Die Arena behaelt ihre GEOMETRIE. Ausstattung ist DEKORATION. Sie steht
 *   NEBEN den Hindernissen aus world.js, nie in ihnen, und sie nimmt an der
 *   Kollision nicht teil. Kein Stueck kommt je in istFrei() oder bodenHoehe()
 *   vor. Damit bleiben alle Bewegungsaufnahmen des Gauntlets vergleichbar.
 *
 * DIE ZWEITE REGEL:
 *   Kein Math.random, kein Date. Jede Verteilung faellt aus der Weltposition.
 *   Dieselbe Arena in jeder Aufnahme, in jedem Lauf, auf jeder Maschine.
 *
 * DIE DRITTE REGEL (GDD 10 §69 / §98 — der Schleim ist die Figur):
 *   Innerhalb der Arena (|x|,|z| < 26) steht NICHTS hoeher als 2,0 Einheiten.
 *   Alles mit Krone — Baeume, Nadelbaeume, Fernberge — steht ausserhalb und
 *   kann den Schleim damit nie verdecken.
 *
 * Diese Datei baut KEINEN einzigen Ausstattungstyp. Sie fuehrt nur Buch.
 * Ein Typ, der sich nicht anmeldet, wird uebersprungen — seine Stuecke liegen
 * dann bereit und werden gezeichnet, sobald es ihn gibt.
 * ========================================================================= */
(function () {

  /* =======================================================================
   * 1. Deterministische Zahlen
   *
   * h32() ist ein ganzzahliger Mischer (Math.imul ueberall, damit nichts in
   * die Gleitkommadarstellung rutscht). Gefuettert wird er ausschliesslich
   * mit gerundeten WELTKOORDINATEN und einem Salz — nie mit einem Zaehler.
   * Deshalb aendert sich die Verteilung nicht, wenn irgendwo ein Stueck
   * dazukommt oder ein Bereich verschoben wird: jede Zelle traegt ihre
   * eigene Zahl.
   * ===================================================================== */

  function h32(a, b, c) {
    let h = Math.imul(a | 0, 0x27d4eb2d);
    h ^= Math.imul(b | 0, 0x165667b1);
    h ^= Math.imul(c | 0, 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h ^= h >>> 13;
    h = Math.imul(h, 0x297a2d39);
    return (h ^ (h >>> 16)) >>> 0;
  }
  /** Zahl in [0,1) aus drei ganzzahligen Schluesseln. */
  const zahl = (a, b, c) => h32(a, b, c) * 2.3283064365386963e-10;
  /** Zahl in [0,1) aus einer Weltposition (auf 1/64 gerundet) plus Salz. */
  const zahlXZ = (x, z, salz) => zahl(Math.round(x * 64), Math.round(z * 64), salz | 0);

  const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);
  /** weiche Rampe: 0 bei a, 1 bei b */
  function rampe(t, a, b) {
    if (a === b) return t < a ? 0 : 1;
    const u = klemm((t - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  }
  function spanne(v, u) {                      // Zahl oder [min,max] -> Zahl
    if (Array.isArray(v)) return v[0] + (v[1] - v[0]) * u;
    return v;
  }

  /* Fleckenfeld: niederfrequentes, bilinear geglaettetes Rauschen, ebenfalls
   * nur aus dem Ortshash. Ohne es waere jede Streuung gleichmaessig
   * gepudert. Genshins Wiesen sind aber GEFLECKT: Horste mit kahlen
   * Zwischenraeumen (gras_halme_nahaufnahme_tag_1366, die Vordergrundwiese
   * in landschaft_sumeru_wiese_see_tag_2560). Genau das macht den
   * Unterschied zwischen "bewachsen" und "bestreut". */
  function fleck(x, z, welle, salz) {
    const u = x / welle, v = z / welle;
    const i = Math.floor(u), j = Math.floor(v);
    let fu = u - i, fv = v - j;
    fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv);
    const a = zahl(i, j, salz), b = zahl(i + 1, j, salz);
    const c = zahl(i, j + 1, salz), d = zahl(i + 1, j + 1, salz);
    const o = a + (b - a) * fu, u2 = c + (d - c) * fu;
    return o + (u2 - o) * fv;
  }
  /** Horstfaktor: rund ein Fuenftel der Flaeche bleibt ganz kahl. */
  const horst = (x, z, welle, salz) => klemm((fleck(x, z, welle, salz) - 0.20) * 1.95, 0, 1.25);

  /* =======================================================================
   * 2. Weltzugriff — schreibgeschuetzt
   * ===================================================================== */

  const W = (typeof WELT !== 'undefined') ? WELT : { bounds: 26, obstacles: [], spawns: [], friedhof: { x: -18, z: -18, r: 4.2 } };
  const istFreiF = (typeof istFrei === 'function') ? istFrei : () => true;
  const bodenF = (typeof bodenHoehe === 'function') ? bodenHoehe : () => 0;

  /* =======================================================================
   * 3. Bereiche
   *
   * Ein Bereich ist ein schlichtes Objekt mit .art. Alles, was streuen()
   * braucht, ist ein Test "liegt drin" und eine Huelle zum Abrastern.
   * ===================================================================== */

  function abstandStrecke(x, z, x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    const l2 = dx * dx + dz * dz;
    let t = l2 > 0 ? ((x - x0) * dx + (z - z0) * dz) / l2 : 0;
    t = klemm(t, 0, 1);
    return Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t));
  }

  function imBereich(b, x, z) {
    const bx = b.x || 0, bz = b.z || 0;
    switch (b.art) {
      case 'kreis': {
        const dx = x - bx, dz = z - bz;
        return dx * dx + dz * dz <= b.r * b.r;
      }
      case 'ring': {
        const dx = x - bx, dz = z - bz, d2 = dx * dx + dz * dz;
        return d2 >= b.innen * b.innen && d2 <= b.aussen * b.aussen;
      }
      case 'rechteck':
        return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
      case 'quadratring': {                    // Tschebyschew-Ring: Rahmen um die Arena
        const c = Math.max(Math.abs(x - bx), Math.abs(z - bz));
        return c >= b.innen && c <= b.aussen;
      }
      case 'gasse':                            // Korridor um eine Strecke
        return abstandStrecke(x, z, b.x0, b.z0, b.x1, b.z1) <= b.breite * 0.5;
      default:
        return false;
    }
  }

  function huelle(b) {
    const bx = b.x || 0, bz = b.z || 0;
    switch (b.art) {
      case 'kreis': return { x0: bx - b.r, z0: bz - b.r, x1: bx + b.r, z1: bz + b.r };
      case 'ring': return { x0: bx - b.aussen, z0: bz - b.aussen, x1: bx + b.aussen, z1: bz + b.aussen };
      case 'rechteck': return { x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 };
      case 'quadratring': return { x0: bx - b.aussen, z0: bz - b.aussen, x1: bx + b.aussen, z1: bz + b.aussen };
      case 'gasse': {
        const h = b.breite * 0.5;
        return {
          x0: Math.min(b.x0, b.x1) - h, z0: Math.min(b.z0, b.z1) - h,
          x1: Math.max(b.x0, b.x1) + h, z1: Math.max(b.z0, b.z1) + h,
        };
      }
      default: return { x0: 0, z0: 0, x1: 0, z1: 0 };
    }
  }

  /* =======================================================================
   * 4. Das Register
   *
   * TYPEN  — was gezeichnet werden kann (meldet ein Prop-Agent an)
   * STUECK — wo etwas steht (meldet diese Datei an)
   *
   * Beides ist bewusst entkoppelt. Stuecke duerfen fuer einen Typ gesetzt
   * werden, den es noch gar nicht gibt; taucht er spaeter auf, findet er
   * seine Liste vor. Fehlt er fuer immer, passiert schlicht nichts.
   * ===================================================================== */

  const TYPEN = new Map();
  const STUECK = new Map();

  function liste(name) {
    let a = STUECK.get(name);
    if (!a) { a = []; STUECK.set(name, a); }
    return a;
  }

  function warnEinmal(schluessel, text) {
    if (warnEinmal._[schluessel]) return;
    warnEinmal._[schluessel] = true;
    // Bewusst console.warn, nicht console.error: ein fehlender oder kaputter
    // Ausstattungstyp ist kein Seitenfehler und darf keine Aufnahme rot faerben.
    if (typeof console !== 'undefined' && console.warn) console.warn('[karte] ' + text);
  }
  warnEinmal._ = Object.create(null);

  const KARTE = {
    /* ---------------------------------------------------------------
     * KARTE.typ(name, beschreibung)
     *
     * beschreibung = {
     *   aufbau(gl, R)                        einmalig, Programme und Netze
     *   vorbereiten(gl, R, ctx, stuecke)     optional, je Bild vor dem Zeichnen
     *   zeichnen(gl, R, ctx, stuecke)        je Bild
     *   schicht: 0                           kleiner = frueher gezeichnet
     * }
     * Wirft aufbau() oder zeichnen(), wird der Typ stillgelegt und der Rest
     * der Karte laeuft weiter.
     * ------------------------------------------------------------- */
    typ(name, beschreibung) {
      if (!name || !beschreibung) return null;
      if (TYPEN.has(name)) warnEinmal('dop:' + name, 'Typ "' + name + '" doppelt angemeldet — der zweite gewinnt.');
      const t = {
        name,
        schicht: beschreibung.schicht || 0,
        aufbau: beschreibung.aufbau || null,
        vorbereiten: beschreibung.vorbereiten || null,
        zeichnen: beschreibung.zeichnen || null,
        aufgebaut: false,
        tot: false,
      };
      TYPEN.set(name, t);
      liste(name);
      return t;
    },

    /* ---------------------------------------------------------------
     * KARTE.setzen(name, { x, z, y, drehung, groesse, ... })
     *
     * Ein Stueck von Hand setzen. y faellt, wenn nicht angegeben, aus
     * bodenHoehe() — damit steht Ausstattung auf dem Plateau auch oben.
     * Alle zusaetzlichen Felder werden unveraendert durchgereicht.
     * ------------------------------------------------------------- */
    setzen(name, o) {
      o = o || {};
      const x = +o.x || 0, z = +o.z || 0;
      const s = Object.assign({}, o);
      s.typ = name;
      s.x = x; s.z = z;
      s.y = (o.y === undefined) ? bodenF(x, z) : +o.y;
      s.drehung = (o.drehung === undefined) ? zahlXZ(x, z, 7001) * Math.PI * 2 : +o.drehung;
      s.groesse = (o.groesse === undefined) ? 1 : spanne(o.groesse, zahlXZ(x, z, 7002));
      s.zufall = [
        zahlXZ(x, z, 7011), zahlXZ(x, z, 7012),
        zahlXZ(x, z, 7013), zahlXZ(x, z, 7014),
      ];
      s.variante = h32(Math.round(x * 64), Math.round(z * 64), 7020) & 255;
      s.frei = istFreiF(x, z, 0.25);
      liste(name).push(s);
      return s;
    },

    /* ---------------------------------------------------------------
     * KARTE.streuen(name, opts)
     *
     *   bereich          Bereich (siehe oben) — Pflicht
     *   dichte           0..1, Zahl ODER Funktion(x,z) -> 0..1
     *   mindestabstand   Meter zwischen zwei Stuecken desselben Aufrufs
     *   meiden           [Bereich, ...] — hier steht nichts
     *   spawnAbstand     Radius um jeden Kreaturen-Ruhepunkt, der frei bleibt
     *   groesse          Zahl oder [min,max]
     *   drehung          Zahl oder [min,max]; fehlt sie, volle Drehfreiheit
     *   abstand          Radius, mit dem istFrei() gefragt wird (Vorgabe 0,4)
     *   frei             false = Hindernisse und Arenagrenze ignorieren
     *                    (nur fuer Ausstattung AUSSERHALB der Arena)
     *   salz             trennt zwei Aufrufe desselben Typs voneinander
     *   daten            Felder, die jedes Stueck zusaetzlich bekommt
     *
     * Verfahren: Rasterzellen der Kantenlaenge mindestabstand*0,8, in jeder
     * Zelle genau ein Kandidat, dessen Ort und Annahme aus der Zellnummer
     * gehasht werden. Danach eine echte Abstandspruefung gegen die schon
     * angenommenen Nachbarzellen. Reihenfolge ist zeilenweise fest, das
     * Ergebnis damit bitgleich reproduzierbar.
     * ------------------------------------------------------------- */
    streuen(name, opts) {
      const o = opts || {};
      const b = o.bereich;
      if (!b) return 0;

      const min = o.mindestabstand || 1.0;
      const zelle = Math.max(0.25, min * 0.8);
      const salz = (o.salz | 0) + 100003;
      const abstand = (o.abstand === undefined) ? 0.4 : o.abstand;
      const pruefeFrei = o.frei !== false;
      const meiden = o.meiden || [];
      const spawnAbstand = o.spawnAbstand || 0;
      const dichte = o.dichte === undefined ? 1 : o.dichte;
      const dichteF = (typeof dichte === 'function') ? dichte : () => dichte;
      const daten = o.daten || null;

      const h = huelle(b);
      const cx0 = Math.floor(h.x0 / zelle), cx1 = Math.ceil(h.x1 / zelle);
      const cz0 = Math.floor(h.z0 / zelle), cz1 = Math.ceil(h.z1 / zelle);

      const ziel = liste(name);
      const belegt = new Map();                // Zellschluessel -> [x,z]
      const schluessel = (a, c) => a * 100003 + c;
      let gesetzt = 0;

      for (let cz = cz0; cz <= cz1; cz++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          // Ort und Annahme kommen aus der Zellnummer, nicht aus einem Zaehler.
          const ux = zahl(cx, cz, salz);
          const uz = zahl(cx, cz, salz + 1);
          const ua = zahl(cx, cz, salz + 2);
          const x = (cx + 0.12 + ux * 0.76) * zelle;
          const z = (cz + 0.12 + uz * 0.76) * zelle;

          if (!imBereich(b, x, z)) continue;
          if (ua >= dichteF(x, z)) continue;

          let raus = false;
          for (let i = 0; i < meiden.length; i++) if (imBereich(meiden[i], x, z)) { raus = true; break; }
          if (raus) continue;

          if (pruefeFrei) {
            if (!istFreiF(x, z, abstand)) continue;
            for (let i = 0; i < SCHUTZ.length; i++) if (imBereich(SCHUTZ[i], x, z)) { raus = true; break; }
            if (raus) continue;
            if (spawnAbstand > 0) {
              const sp = W.spawns || [];
              for (let i = 0; i < sp.length; i++) {
                if (Math.hypot(x - sp[i].x, z - sp[i].z) < spawnAbstand) { raus = true; break; }
              }
              if (raus) continue;
            }
          }

          // echte Mindestabstandspruefung gegen die Nachbarzellen
          for (let dz = -2; dz <= 0 && !raus; dz++) {
            for (let dx = -2; dx <= 2; dx++) {
              if (dz === 0 && dx > 0) break;
              const p = belegt.get(schluessel(cx + dx, cz + dz));
              if (p && Math.hypot(x - p[0], z - p[1]) < min) { raus = true; break; }
            }
          }
          if (raus) continue;

          belegt.set(schluessel(cx, cz), [x, z]);

          const s = daten ? Object.assign({}, daten) : {};
          s.typ = name;
          s.x = x; s.z = z;
          s.y = bodenF(x, z);
          s.drehung = (o.drehung === undefined)
            ? zahl(cx, cz, salz + 3) * Math.PI * 2
            : spanne(o.drehung, zahl(cx, cz, salz + 3));
          s.groesse = (o.groesse === undefined) ? 1 : spanne(o.groesse, zahl(cx, cz, salz + 4));
          s.zufall = [
            zahl(cx, cz, salz + 11), zahl(cx, cz, salz + 12),
            zahl(cx, cz, salz + 13), zahl(cx, cz, salz + 14),
          ];
          s.variante = h32(cx, cz, salz + 20) & 255;
          s.frei = true;
          ziel.push(s);
          gesetzt++;
        }
      }
      return gesetzt;
    },

    /** Alle Stuecke eines Typs. Fuer Prop-Agenten zum Nachsehen. */
    stuecke(name) { return liste(name).slice(); },
    /** Namen aller Typen, fuer die Stuecke vorliegen. */
    namen() { return Array.from(STUECK.keys()).sort(); },
    /** Namen aller angemeldeten Typen. */
    typen() { return Array.from(TYPEN.keys()).sort(); },
    /** Diagnose: { name: anzahl, ... } plus Summe. */
    zahlen() {
      const o = { _summe: 0 };
      for (const [n, a] of STUECK) { o[n] = a.length; o._summe += a.length; }
      return o;
    },
    /* Diagnose: Stuecke, die WIRKLICH in einem Hindernis stecken.
     * Gemessen mit Radius 0 — ein Saum darf einen Fels beruehren, das ist
     * seine Aufgabe. Was hier auftaucht, ist ein Fehler.
     * Uebersprungen wird, was auf einer Plateauoberkante steht (y > 0) und
     * was ausserhalb der Arena als Kulisse steht. */
    pruefen() {
      const schlecht = [];
      for (const [n, a] of STUECK) {
        for (const s of a) {
          if (Math.abs(s.x) > W.bounds || Math.abs(s.z) > W.bounds) continue;
          if (s.y > 0.01) continue;
          if (!istFreiF(s.x, s.z, 0)) schlecht.push({ typ: n, x: +s.x.toFixed(2), z: +s.z.toFixed(2) });
        }
      }
      return schlecht;
    },
  };

  /* =======================================================================
   * 5. Die Orte, an denen niemals etwas steht
   *
   * SCHUTZ gilt fuer JEDE Streuung innerhalb der Arena. Das ist kein
   * Geschmack, das sind Abnahmepunkte:
   *   - Startkreis: hier steht der Schleim in jeder einzelnen Aufnahme.
   *   - Respawnkreis: GDD 01 §51 / Abnahme 22 — man muss sehen, wo man
   *     aufgewacht ist.
   *   - Die Gasse durch die Passage: sie ist Weg, weil dort nichts steht.
   *     Ein Pfad aus Leere kostet keinen einzigen Zeichenaufruf und liest
   *     sich genauso deutlich wie ein gemalter.
   *
   * Eine zweite Gasse von der Mitte zum Friedhof war geplant und ist wieder
   * gestrichen: das Plateau liegt genau auf der Diagonale (0,0)->(-18,-18),
   * die Gasse haette also entweder das Hindernis geschnitten oder den
   * Schuttsaum an dessen Suedflanke ausgeraeumt. Der Friedhof wird ohne sie
   * gefunden — ueber die kahle Senke, den Grasguertel, den Laternenkranz,
   * die Lichtung im Waldsaum und den Hauptgipfel dahinter.
   *
   * SCHUTZ gilt nur fuer streuen(). Handsetzungen sind Absicht und stehen,
   * wo sie stehen — die vier Torlaternen zum Beispiel mitten in der Gasse.
   * ===================================================================== */

  const FR = W.friedhof || { x: -18, z: -18, r: 4.2 };
  const RESPAWN = (FR.spawn || { x: FR.x, z: FR.z });

  /** Gasse durch die enge Passage bei z=14 (Luecke bei |x| < 0,9). */
  const GASSE_PASSAGE = { art: 'gasse', x0: 0, z0: 7.5, x1: 0, z1: 20.5, breite: 5.6 };

  const SCHUTZ = [
    { art: 'kreis', x: 0, z: 0, r: 4.2 },                       // Startkreis
    { art: 'kreis', x: RESPAWN.x, z: RESPAWN.z, r: 2.4 },       // Respawnkreis
    GASSE_PASSAGE,
  ];

  /* =======================================================================
   * 6. Die Platzierung
   *
   * Abgeleitet aus KARTE-ENTWURF.md. Reihenfolge der Abschnitte = Reihenfolge
   * vom Grossen zum Kleinen, damit man beim Lesen die Arena vor sich sieht.
   *
   * Zwoelf Typnamen. Es baut sie hier niemand — sie melden sich selbst an.
   * ===================================================================== */

  const B = W.bounds;                         // 26
  const AUSSEN = B + 0.6;                     // ab hier kann nichts mehr verdecken

  /* --- 6.1 Fernsilhouette: der Blickfang, damit der Horizont nicht leer ist
   *
   * Vier Tiefenlagen. Die Winkelhoehen sind so gewaehlt, dass sie sich in der
   * Fernsicht (Kameraauge rund 3,5 hoch, 24 Einheiten Abstand, fovY 50°)
   * uebereinander staffeln statt sich zu decken: rund 1,7° / 4,1° / 6,7° und
   * der Hauptgipfel bei 10,4°. Der Bildoberrand liegt bei 18°.
   *
   * Der Hauptgipfel steht im Suedwesten — genau hinter dem Friedhof und genau
   * dort, wo das Szenario g-fernsicht hinsieht. Ort, Luecke im Waldsaum und
   * Fernberg liegen damit auf einer Achse. Das ist die Genshin-Anordnung aus
   * landschaft_mondstadt_mittag_fernnebel_4k: eine Spitze traegt das Bild,
   * alles andere staffelt sich darunter. */
  KARTE.setzen('fernberg', { x: -52, z: -57, groesse: 22, drehung: 0.55, rolle: 'gipfel' });
  KARTE.setzen('fernberg', { x: -34, z: -71, groesse: 15, drehung: 2.1, rolle: 'schulter' });
  KARTE.setzen('fernberg', { x: -70, z: -36, groesse: 14, drehung: 4.4, rolle: 'schulter' });

  KARTE.streuen('fernberg', {
    bereich: { art: 'ring', innen: 44, aussen: 54 },
    dichte: 0.80, mindestabstand: 13, groesse: [3, 6], frei: false, salz: 11,
    daten: { rolle: 'huegel' },
  });
  KARTE.streuen('fernberg', {
    bereich: { art: 'ring', innen: 60, aussen: 72 },
    dichte: 0.85, mindestabstand: 17, groesse: [6, 10], frei: false, salz: 12,
    daten: { rolle: 'tafelberg' },
  });
  KARTE.streuen('fernberg', {
    bereich: { art: 'ring', innen: 76, aussen: 88 },
    dichte: 0.90, mindestabstand: 22, groesse: [11, 17], frei: false, salz: 13,
    daten: { rolle: 'massiv' },
  });

  /* --- 6.2 Waldsaum: drei Haine und zwei Lichtungen
   *
   * Ein gleichmaessiger Baumring waere eine Wand und wuerde die Fernberge
   * zudecken. Stattdessen: Dichte nach Himmelsrichtung. Zwei Lichtungen —
   * eine breite nach Suedwesten (Friedhof, Hauptgipfel), eine schmalere nach
   * Norden (hinter der engen Passage, damit der Durchgang Tiefe bekommt und
   * nicht gegen eine Wand fuehrt).
   *
   * Alle Kronen stehen ausserhalb von |x|,|z| = 26,6. Innerhalb der Arena
   * gibt es keinen einzigen Baum. */
  function lichtung(winkel, mitte, halbbreite) {
    let d = winkel - mitte;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return rampe(Math.abs(d), halbbreite * 0.35, halbbreite);
  }
  function saumDichte(x, z) {
    const a = Math.atan2(z, x);
    return lichtung(a, -2.356, 0.62) *     // Suedwest: Friedhof und Hauptgipfel
           lichtung(a, 1.571, 0.42) *      // Nord: hinter der Passage
           lichtung(a, 0.000, 0.34);       // Ost: Tiefe fuer die zweite Messkamera
  }

  KARTE.streuen('baum', {
    bereich: { art: 'quadratring', innen: AUSSEN, aussen: 42 },
    dichte: (x, z) => 0.62 * saumDichte(x, z),
    mindestabstand: 5.0, groesse: [4.0, 6.5], frei: false, salz: 21,
  });
  KARTE.streuen('nadelbaum', {
    bereich: { art: 'quadratring', innen: AUSSEN + 2, aussen: 40 },
    dichte: (x, z) => 0.26 * saumDichte(x, z),
    mindestabstand: 6.0, groesse: [5.0, 8.5], frei: false, salz: 22,
  });
  /* Unterholz vor dem Waldsaum: schliesst den Boden ab, ohne Hoehe
   * aufzubauen. Es steht ganz aussen und darf deshalb hoch sein:
   * ab |x|,|z| = 26,2. Der Schleim kommt hoechstens bis 25,4 (bounds minus
   * Radius), also steht auch das hoechste Stueck dieses Guertels nie
   * zwischen Kamera und Schleim. */
  KARTE.streuen('busch', {
    bereich: { art: 'quadratring', innen: B + 0.2, aussen: 34 },
    dichte: (x, z) => 0.52 * (0.28 + 0.72 * saumDichte(x, z)) * horst(x, z, 11.0, 403),
    mindestabstand: 2.4, groesse: [0.9, 1.6], frei: false, salz: 23,
  });
  KARTE.streuen('bueschel', {
    bereich: { art: 'quadratring', innen: B + 0.1, aussen: 33 },
    dichte: (x, z) => 0.52 * (0.30 + 0.70 * saumDichte(x, z)) * horst(x, z, 8.5, 401),
    mindestabstand: 1.3, groesse: [0.6, 1.1], frei: false, salz: 24,
  });

  /* Zwei Einzelbaeume als Mittelgrundanker — je einer fuer die beiden
   * Messkameras. Sie stehen an der SCHULTER der Suedwest-Lichtung, nicht in
   * ihr: so bekommt die Oeffnung eine Kante, wie der Einzelbaum in
   * landschaft_sumeru_wiese_see_tag_2560. Beide ausserhalb der Arena. */
  KARTE.setzen('baum', { x: -27.8, z: -4.6, groesse: 7.4, drehung: 0.9, rolle: 'solitaer' });
  KARTE.setzen('baum', { x: 6.2, z: -29.4, groesse: 6.8, drehung: 2.7, rolle: 'solitaer' });
  /* Die zwei Nadelbaeume, die die Suedwest-Lichtung links und rechts fassen.
   * Sie stehen NEBEN der Blickachse zum Hauptgipfel, nicht darin. */
  KARTE.setzen('nadelbaum', { x: -28.6, z: -14.4, groesse: 9.0, drehung: 1.4, rolle: 'pfosten' });
  KARTE.setzen('nadelbaum', { x: -13.6, z: -28.8, groesse: 8.4, drehung: 3.9, rolle: 'pfosten' });

  /* --- 6.3 Das Ruhefeld: die grosse leere Flaeche
   *
   * Radius 0 bis 9 um den Ursprung. Hier laeuft jede Bewegungsaufnahme des
   * Gauntlets, hier steht der Schleim in jedem Standardbild. Es gibt hier
   * nichts ausser Bluetenflecken unter Kniehoehe eines Schleims.
   *
   * Das ist die wichtigste Entscheidung des ganzen Entwurfs: In Genshins
   * Landschaften ist der Vordergrund fast immer EINE ruhige Flaeche. Ein
   * gleichmaessig zugestellter Platz sieht schlechter aus, nicht besser. */
  KARTE.streuen('blume', {
    bereich: { art: 'kreis', r: 9.5 },
    dichte: (x, z) => 0.30 * horst(x, z, 6.5, 405),
    mindestabstand: 1.9, groesse: [0.7, 1.15], salz: 31, abstand: 0.3,
  });

  /* --- 6.4 Der Uebergangsguertel: Radius 9 bis 24
   *
   * Dichte steigt nach aussen. Nichts hier ist hoeher als der Schleim
   * (Busch hoechstens 0,85, Bueschel hoechstens 0,7) — er bleibt in jeder
   * Kameralage die hoechste bewegte Silhouette im Bild.
   *
   * spawnAbstand haelt die sechs Ruhepunkte der Kreaturen frei: eine
   * Kreatur, die hinter einem Busch erscheint, kostet Abnahmepunkt 9
   * ("Kreatur finden") und §16 ("Erfolg/Fehlschlag eindeutig erkennen"). */
  const rAb = (x, z) => Math.hypot(x, z);

  KARTE.streuen('bueschel', {
    bereich: { art: 'ring', innen: 9.0, aussen: B - 0.5 },
    dichte: (x, z) => (0.14 + 0.75 * rampe(rAb(x, z), 9, 23)) * horst(x, z, 8.5, 401),
    mindestabstand: 1.25, groesse: [0.35, 0.7], spawnAbstand: 2.8, salz: 32,
    meiden: [{ art: 'kreis', x: FR.x, z: FR.z, r: 6.2 }],
  });
  KARTE.streuen('busch', {
    bereich: { art: 'ring', innen: 13.0, aussen: B - 0.8 },
    dichte: (x, z) => (0.14 + 0.36 * rampe(rAb(x, z), 13, 24)) * horst(x, z, 11.0, 403),
    mindestabstand: 2.8, groesse: [0.5, 0.85], spawnAbstand: 3.6, salz: 33, abstand: 0.6,
    meiden: [{ art: 'kreis', x: FR.x, z: FR.z, r: 6.8 }],
  });
  KARTE.streuen('blume', {
    bereich: { art: 'ring', innen: 9.5, aussen: B - 0.5 },
    dichte: (x, z) => (0.16 + 0.22 * rampe(rAb(x, z), 10, 22)) * horst(x, z, 6.5, 405),
    mindestabstand: 1.7, groesse: [0.7, 1.2], salz: 34, abstand: 0.3,
  });
  /* Lesesteine im Feld — sehr sparsam. Sie geben der Ebene Massstab, ohne
   * Hoehe aufzubauen (hoechstens 0,4). */
  KARTE.streuen('stein', {
    bereich: { art: 'ring', innen: 11.0, aussen: B - 0.6 },
    dichte: (x, z) => 0.30 * horst(x, z, 13.0, 407),
    mindestabstand: 3.2, groesse: [0.5, 1.0], salz: 35, abstand: 0.35,
  });

  /* --- 6.5 Fuesse: an jedem Hindernis ein Saum
   *
   * Der billigste und wirksamste Detailtyp in Genshins Landschaften: nichts
   * steht auf dem Boden auf, alles hat einen Fuss aus Geroell und Blattwerk.
   * Der Saum haengt an den Hindernissen aus world.js, aendert sie aber nicht:
   * er liegt komplett AUSSERHALB des Kollisionsradius. */
  let felsNr = 0;
  for (const o of W.obstacles) {
    if (o.type !== 'rock') continue;
    felsNr++;
    const r = o.r;
    KARTE.streuen('stein', {
      bereich: { art: 'ring', x: o.x, z: o.z, innen: r + 0.12, aussen: r + 0.85 },
      dichte: 0.55, mindestabstand: 0.55, groesse: [0.35, 0.9],
      abstand: 0.08, salz: 200 + felsNr,
    });
    if (r >= 1.1) {
      KARTE.streuen('farn', {
        bereich: { art: 'ring', x: o.x, z: o.z, innen: r + 0.35, aussen: r + 1.45 },
        dichte: 0.42, mindestabstand: 0.85, groesse: [0.4, 0.7],
        abstand: 0.2, spawnAbstand: 2.2, salz: 260 + felsNr,
      });
    }
    if (r >= 1.4) {
      KARTE.streuen('bueschel', {
        bereich: { art: 'ring', x: o.x, z: o.z, innen: r + 0.5, aussen: r + 2.0 },
        dichte: 0.45, mindestabstand: 0.9, groesse: [0.4, 0.75],
        abstand: 0.25, spawnAbstand: 2.2, salz: 320 + felsNr,
      });
    }
  }

  /* --- 6.6 Das Plateau bei (-13,-12): 7x7, Oberkante 1,2
   *
   * Von hier springt der Schleim herunter (GDD 01 §20, Aufprallaufnahme).
   * Oben liegt deshalb nichts ausser Bluetenflecken — die Landeflaeche und
   * die Absprungkante muessen unverstellt bleiben.
   * Unten ein Schuttsaum an allen vier Flanken: das ist dieselbe Aufgabe wie
   * das Kontaktband in G6, nur in Geometrie statt in Schattierung. */
  const PLATEAU = W.obstacles.find(o => o.type === 'wall' && o.w === 7 && o.d === 7)
                || { x: -13, y: 0.6, z: -12, w: 7, h: 1.2, d: 7 };
  const phx = PLATEAU.w * 0.5, phz = PLATEAU.d * 0.5;

  KARTE.streuen('blume', {
    bereich: { art: 'rechteck', x0: PLATEAU.x - phx + 0.7, z0: PLATEAU.z - phz + 0.7, x1: PLATEAU.x + phx - 0.7, z1: PLATEAU.z + phz - 0.7 },
    dichte: 0.22, mindestabstand: 1.3, groesse: [0.7, 1.1], frei: false, salz: 41,
  });
  KARTE.streuen('stein', {
    bereich: { art: 'quadratring', x: PLATEAU.x, z: PLATEAU.z, innen: phx + 0.1, aussen: phx + 1.15 },
    dichte: 0.60, mindestabstand: 0.6, groesse: [0.4, 1.0], abstand: 0.06, salz: 42,
  });
  KARTE.streuen('farn', {
    bereich: { art: 'quadratring', x: PLATEAU.x, z: PLATEAU.z, innen: phx + 0.45, aussen: phx + 1.7 },
    dichte: 0.40, mindestabstand: 0.9, groesse: [0.45, 0.7], abstand: 0.2, salz: 43,
  });
  /* Eine Laterne an der Westecke — 2,0 hoch, duenn, ausserhalb des
   * Plateaugrundrisses. Sie sagt aus jeder Entfernung "hier ist eine Kante",
   * ohne die Absprungrichtung zu verstellen. */
  KARTE.setzen('laterne', { x: -17.6, z: -8.4, groesse: 2.0, drehung: 0.4, rolle: 'kante' });

  /* --- 6.7 Die enge Passage bei z=14: Luecke bei |x| < 0,9
   *
   * Der Spieler muss sie als WEG lesen, nicht als Wand. Drei Mittel, keines
   * davon neue Geometrie:
   *
   *  1. Die Gasse (SCHUTZ, 5,6 breit, z 7,5 bis 20,5) ist voellig frei.
   *     Ein getretener Weg entsteht durch Aussparung. Genshins Sandwege in
   *     landschaft_mondstadt sind genau das: eine Bahn ohne Bewuchs.
   *  2. Vier Laternen flankieren die beiden Mundungen, 2,0 hoch — hoeher als
   *     die 1,6 hohe Mauer. Aus der Ferne stehen zwei Lichter nebeneinander,
   *     und das liest sich als Tor. Vorbild: die Laternenreihen in
   *     nacht_liyue_laternen_1600x900.
   *  3. Der Bewuchs waechst dicht an die AUSSENflanken der beiden Mauern
   *     heran. Die Mauer wird dadurch zur bewachsenen Barriere, die Luecke
   *     zum einzigen sauberen Durchlass. Kontrast macht die Arbeit. */
  KARTE.setzen('laterne', { x: -1.62, z: 12.45, groesse: 2.0, drehung: 0.0, rolle: 'tor' });
  KARTE.setzen('laterne', { x: 1.62, z: 12.45, groesse: 2.0, drehung: 0.0, rolle: 'tor' });
  KARTE.setzen('laterne', { x: -1.62, z: 15.55, groesse: 2.0, drehung: Math.PI, rolle: 'tor' });
  KARTE.setzen('laterne', { x: 1.62, z: 15.55, groesse: 2.0, drehung: Math.PI, rolle: 'tor' });

  for (const seite of [-1, 1]) {
    for (const flanke of [-1, 1]) {            // Sued- und Nordflanke der Mauern
      const z0 = flanke < 0 ? 11.6 : 14.6, z1 = flanke < 0 ? 13.4 : 16.4;
      KARTE.streuen('bueschel', {
        bereich: { art: 'rechteck', x0: seite < 0 ? -10.6 : 0.6, z0, x1: seite < 0 ? -0.6 : 10.6, z1 },
        dichte: 0.75, mindestabstand: 0.75, groesse: [0.45, 0.75],
        abstand: 0.15, salz: 51 + seite * 3 + flanke,
      });
      KARTE.streuen('busch', {
        bereich: { art: 'rechteck', x0: seite < 0 ? -10.6 : 0.6, z0, x1: seite < 0 ? -0.6 : 10.6, z1 },
        dichte: 0.35, mindestabstand: 1.9, groesse: [0.55, 0.85],
        abstand: 0.35, salz: 61 + seite * 3 + flanke,
      });
    }
  }
  /* Bewusst KEIN Geroell an den Mauerkoepfen. Alles, was dort noch frei
   * liegen wuerde, laege in der Luecke selbst — also genau dort, wo der
   * Schleim sich durchquetscht (GDD 01 §17) und wo der Gauntlet diese
   * Bewegung aufnimmt. Die Luecke bleibt blank. */

  /* --- 6.8 Der Friedhof bei (-18,-18), r 4,2
   *
   * Er soll als ORT lesbar sein, ohne zugestellt zu werden. Das Mittel ist
   * nicht Fuellung, sondern Kontrast:
   *
   *   - Die Senke selbst bleibt KAHL. Kein Bueschel, kein Busch innerhalb
   *     6,2. Eine leere Flaeche inmitten von Bewuchs liest sich als
   *     getreten, benutzt, betreten — genau das, was ein Friedhof ist.
   *   - Um die Senke ein dichter Grasguertel (6,2 bis 9,5). Der Rand
   *     entsteht damit von aussen, nicht von innen.
   *   - Drei Laternen auf dem Kranz, gesetzt in die LUECKEN zwischen den
   *     Findlingen aus world.js, und zwar nur auf der Suedwesthaelfte. Die
   *     Nordostseite bleibt offen — dort liegt der Respawnpunkt (-17,2/-16,4),
   *     dort kommt der Spieler an. Ein Ring aus Licht mit einer Tuer.
   *   - Fuenf Grabmale als lockerer Bogen auf der Suedwesthaelfte, alle
   *     hoechstens 0,85 hoch. Wer aufwacht, sieht sie und das aufrechte Mal
   *     aus world.js vor sich — nie im Ruecken.
   *
   * Alle acht Handsetzungen liegen geprueft in den Luecken des Findlingskranzes
   * (KARTE.pruefen() meldet sie nicht). */
  const grab = [
    [-20.10, -18.55], [-20.05, -19.60], [-19.15, -20.30], [-17.85, -20.55], [-16.62, -20.12],
  ];
  for (let i = 0; i < grab.length; i++) {
    const g = grab[i];
    KARTE.setzen('stele', {
      x: g[0], z: g[1], groesse: 0.6 + 0.25 * zahlXZ(g[0], g[1], 900),
      // leicht zur Ankunftsseite gedreht, damit sie von Nordost lesbar sind
      drehung: Math.atan2(RESPAWN.z - g[1], RESPAWN.x - g[0]),
      neigung: (zahlXZ(g[0], g[1], 901) - 0.5) * 0.22,
      rolle: 'grab',
    });
  }
  KARTE.setzen('laterne', { x: -22.10, z: -15.91, groesse: 1.9, drehung: 2.7, rolle: 'friedhof' });
  KARTE.setzen('laterne', { x: -21.98, z: -20.30, groesse: 1.9, drehung: 3.7, rolle: 'friedhof' });
  KARTE.setzen('laterne', { x: -18.08, z: -22.60, groesse: 1.9, drehung: 4.7, rolle: 'friedhof' });

  /* Gefallenes Geroell in der Senke — wenige Stuecke, sehr flach. */
  KARTE.streuen('stein', {
    bereich: { art: 'ring', x: FR.x, z: FR.z, innen: 1.2, aussen: 3.0 },
    dichte: 0.22, mindestabstand: 1.1, groesse: [0.35, 0.7], abstand: 0.2, salz: 81,
    meiden: [{ art: 'kreis', x: RESPAWN.x, z: RESPAWN.z, r: 2.4 }],
  });
  /* Der Grasguertel, der die kahle Senke ueberhaupt erst zur Senke macht. */
  KARTE.streuen('bueschel', {
    bereich: { art: 'ring', x: FR.x, z: FR.z, innen: 6.2, aussen: 9.6 },
    dichte: 0.80, mindestabstand: 0.85, groesse: [0.45, 0.8], abstand: 0.25, salz: 82,
  });
  KARTE.streuen('busch', {
    bereich: { art: 'ring', x: FR.x, z: FR.z, innen: 6.8, aussen: 9.6 },
    dichte: 0.30, mindestabstand: 2.2, groesse: [0.55, 0.85], abstand: 0.5, salz: 83,
  });
  /* Farn direkt am Findlingskranz — der Fuss, den auch jeder Fels bekommt. */
  KARTE.streuen('farn', {
    bereich: { art: 'ring', x: FR.x, z: FR.z, innen: 3.4, aussen: 5.4 },
    dichte: 0.35, mindestabstand: 0.95, groesse: [0.4, 0.65], abstand: 0.2, salz: 84,
    meiden: [{ art: 'kreis', x: RESPAWN.x, z: RESPAWN.z, r: 2.4 }],
  });

  /* =======================================================================
   * 7. Anmeldung als Grafikmodul
   *
   * Ein Typ, der beim Aufbau oder beim Zeichnen wirft, wird stillgelegt.
   * Weder ein fehlender noch ein kaputter Typ darf ein Bild kosten.
   * ===================================================================== */

  function aktive() {
    const a = [];
    for (const t of TYPEN.values()) if (!t.tot) a.push(t);
    a.sort((p, q) => (p.schicht - q.schicht) || (p.name < q.name ? -1 : p.name > q.name ? 1 : 0));
    return a;
  }

  function sicher(t, was, fn, args) {
    try { fn.apply(null, args); return true; }
    catch (e) {
      t.tot = true;
      warnEinmal('tot:' + t.name, 'Typ "' + t.name + '" bei ' + was + ' ausgefallen und stillgelegt: ' + (e && e.message));
      return false;
    }
  }

  const modul = {
    name: 'karte',
    ordnung: 40,

    /* NICHT ANFASSEN, und hier steht warum.
     *
     * renderer2.js fuehrt eine Tabelle ERSATZ_NAME, in der `karte` auf den
     * Grundzug `hindernisse` zeigt: ein Modul dieses Namens gilt dort als
     * Uebernahme des Hindernis-Durchgangs, der Grundzug wird dann nicht mehr
     * gezeichnet. Fuer diese Datei ist das falsch. Sie zeichnet KEIN einziges
     * Hindernis — sie stellt Dekoration DANEBEN. Ohne `ersetzt: false`
     * verschwinden mit dem ersten ?renderer=2 saemtliche Felsen, beide
     * Passagemauern, das Plateau und der Findlingskranz des Friedhofs aus dem
     * Bild, und die Arena, deren Geometrie ausdruecklich unangetastet bleiben
     * soll, waere optisch leer.
     *
     * Wenn spaeter jemand den Hindernis-Durchgang wirklich uebernimmt, gehoert
     * das in ein eigenes Modul mit eigenem Namen — nicht in dieses. */
    ersetzt: false,

    aufbau(gl, R) {
      for (const t of aktive()) {
        if (t.aufgebaut || !t.aufbau) { t.aufgebaut = true; continue; }
        if (sicher(t, 'aufbau', t.aufbau, [gl, R])) t.aufgebaut = true;
      }
    },

    vorbereiten(gl, R, ctx) {
      for (const t of aktive()) {
        const s = liste(t.name);
        if (!s.length) continue;
        if (!t.aufgebaut && t.aufbau) { if (!sicher(t, 'aufbau', t.aufbau, [gl, R])) continue; t.aufgebaut = true; }
        if (t.vorbereiten) sicher(t, 'vorbereiten', t.vorbereiten, [gl, R, ctx, s]);
      }
    },

    zeichnen(gl, R, ctx) {
      for (const t of aktive()) {
        const s = liste(t.name);
        if (!s.length || !t.zeichnen) continue;
        if (!t.aufgebaut && t.aufbau) { if (!sicher(t, 'aufbau', t.aufbau, [gl, R])) continue; t.aufgebaut = true; }
        sicher(t, 'zeichnen', t.zeichnen, [gl, R, ctx, s]);
      }
    },
  };

  KARTE.modul = modul;                        // Notausgang, falls renderer2.js selbst holen will

  if (typeof window !== 'undefined') window.KARTE = KARTE;
  if (typeof GRAFIK !== 'undefined' && typeof GRAFIK.modul === 'function') GRAFIK.modul(modul);

})();
