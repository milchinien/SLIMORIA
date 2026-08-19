'use strict';
/* ===========================================================================
 * grafik/props/pilz.js — Pilze und Moospolster im Schatten.
 *
 * Besitzer: Lane KARTE, Ausstattungstyp 'pilz'. Vertrag: GRAFIK-MODULE.md §3
 * und der Registerkopf in grafik/karte.js.
 *
 * WAS DIESER TYP ERZAEHLT
 *   Pilze wachsen dort, wo es feucht und schattig ist. Sie stehen deshalb
 *   ausschliesslich am FUSS der Hindernisse und dort auf der SONNENABGEWANDTEN
 *   Seite. Wer sie sieht, sieht ohne ein einziges Wort, wo Schatten liegt —
 *   das ist ihre eigentliche Aufgabe. Ein Pilz mitten auf der freien Ebene
 *   waere hingeworfen und wuerde genau diese Aussage zerstoeren.
 *
 * DAS VORBILD, gemessen statt vermutet
 *   ref/genshin/landschaft_sumeru_wiese_see_tag_2560.png, der Fuss des
 *   Einzelbaums (Ausschnitt x 1130..1250, y 1000..1090, zehnfach):
 *     - Kappe 15,5 x 13 Pixel im 2560er Bild, also Breite/Hoehe = 1,19.
 *       Glockenform, breiteste Stelle unten, Rand haengt ueber.
 *     - Stiel darunter rund 5 Pixel sichtbar, blass cremefarben,
 *       Durchmesser rund ein Sechstel der Kappenbreite.
 *     - Gesamthoehe rund 18 Pixel bei einer Figur von rund 300 Pixel
 *       Hoehe im selben Bild — der Pilz misst also 6 % der Figur.
 *       Unser Schleim ist bei Radius 1 zwei Einheiten hoch, entsprechend
 *       0,12 bis 0,26 Einheiten. Genau in dieser Spanne liegen die Werte
 *       unten, und damit unter jedem Grasbueschel.
 *     - Farbe: Lichtseite (216,45,38), Schattenseite (150,28,32). ZWEI
 *       Tonstufen mit harter Kante, kein Verlauf (GRAFIK-MODULE.md §0).
 *     - Auf der Kappe sitzt ein harter, weisser Vierstrahl-Funke, senkrechter
 *       Arm rund 1,7 Kappenhoehen, waagerechter rund eine Kappenbreite.
 *       Das ist der "ganz schwache Schimmer" solcher Details — er ist in
 *       Genshin eine klar gezeichnete Form, kein weicher Nebel.
 *   Ausserdem ref/genshin/landschaft_sumeru_wiese_see_tag_2560.png bei
 *   x 1930..2270: die grossen ockerfarbenen Kappen. Deren Farbton ist hier
 *   die zweite Sorte; ihre GROESSE waere fuer die Arena voellig falsch —
 *   sie sind dort so hoch wie eine Figur und wuerden den Schleim verdecken.
 *
 * DIE DREI GRENZEN
 *   1. Der Schleim ist die Figur (GDD 10 §69/§98). Das hoechste Stueck dieses
 *      Typs misst 0,30 Einheiten — ein Siebtel der Schleimhoehe, ein Drittel
 *      eines Grashalms. Es kann ihn nicht verdecken. Im Startkreis und im
 *      Respawnkreis steht kein einziges (SCHUTZ in karte.js greift bei jedem
 *      streuen()), und in der Gasse durch die Passage ebenfalls nicht.
 *   2. Keine Kollision. Kein Stueck kommt je in istFrei() oder bodenHoehe()
 *      vor; world.js ist unberuehrt. Die Anker stehen mit Sicherheitsabstand
 *      0,30 vor jedem Hindernis, die abgeleiteten Kappen weichen hoechstens
 *      0,20 davon ab — es bleibt also immer Luft zwischen Pilz und Fels.
 *   3. Kosten. Drei Zeichenaufrufe fuer alles, instanziert. Siehe KOSTEN
 *      am Dateiende.
 *
 * DETERMINISMUS: kein Math.random, kein Date, keine Bildratenzeit. Jede Zahl
 * faellt aus der Weltposition (h32 unten) oder aus ctx.time.
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[pilz] grafik/karte.js fehlt — Typ nicht angemeldet.');
    }
    return;
  }

  /* =======================================================================
   * 1. Deterministische Zahlen
   *
   * Derselbe Mischer wie in karte.js, mit eigenem Salzbereich. Er wird
   * ausschliesslich mit gerundeten Weltkoordinaten gefuettert. Folge: die
   * Pilzgruppe an einem Fels sieht in jeder Aufnahme gleich aus, egal wie
   * viele Gruppen woanders dazukommen oder wegfallen.
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
  const zahl = (x, z, salz) => h32(Math.round(x * 64), Math.round(z * 64), salz | 0) * 2.3283064365386963e-10;

  const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);
  function rampe(t, a, b) {                     // weiche Stufe, 0 bei a, 1 bei b
    if (a === b) return t < a ? 0 : 1;
    const u = klemm((t - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  }

  /* =======================================================================
   * 2. Wo Schatten liegt
   *
   * SONNE ist die Vorgabe des Renderers (renderer2.js: R.light) und zugleich
   * SONNE_TAG in client/capture.js — dieselbe Richtung, mit der g-fernsicht
   * und g-bodenlicht aufnehmen. Die Verteilung MUSS an einer festen Richtung
   * haengen und nicht an ctx.licht: sie faellt einmal beim Laden, waehrend
   * ein Szenario die Sonne spaeter beliebig dreht. Ein Pilzfeld, das bei
   * jeder Sonnenaenderung umzieht, waere kein Schatten, sondern ein Fehler.
   * ===================================================================== */

  const SONNE = [0.55, 0.78, 0.32];
  const sl = Math.hypot(SONNE[0], SONNE[2]) || 1;
  const SCHATTEN_X = -SONNE[0] / sl, SCHATTEN_Z = -SONNE[2] / sl;

  /** 0,08 auf der Sonnenseite, 1,0 auf der Schattenseite eines Mittelpunkts. */
  function schattenSeite(x, z, mx, mz) {
    const dx = x - mx, dz = z - mz;
    const l = Math.hypot(dx, dz) || 1;
    const d = (dx * SCHATTEN_X + dz * SCHATTEN_Z) / l;
    return 0.08 + 0.92 * rampe(d, -0.15, 0.80);
  }

  /* =======================================================================
   * 3. Die Standorte
   *
   * karte.js fuehrt fuer 'pilz' noch keine Stuecke (das Register kennt zwoelf
   * Typen, dieser ist nicht darunter). Solange das so ist, setzt diese Datei
   * ihre Standorte selbst — ueber die oeffentliche Schnittstelle KARTE.streuen,
   * mit demselben SCHUTZ und derselben Hindernispruefung wie jede andere
   * Streuung. Sobald karte.js Pilze setzt, laeuft dieser Block nicht mehr an
   * und die Karte behaelt das letzte Wort.
   * ===================================================================== */

  const W = (typeof WELT !== 'undefined') ? WELT : { bounds: 26, obstacles: [], friedhof: { x: -18, z: -18 } };

  function standorteSetzen() {
    if (KARTE.stuecke('pilz').length) return 0;    // die Karte hat schon gesetzt
    let n = 0;

    /* --- 3.1 Am Fuss jedes Felsens, auf der Schattenseite -----------------
     * innen = r + 0,32 ist kein Geschmack: streuen() prueft mit istFrei(x, z,
     * 0.30), alles naeher am Fels faellt ohnehin durch. So beginnt der Kranz
     * genau dort, wo er anfangen darf. */
    let nr = 0;
    for (const o of W.obstacles) {
      if (o.type !== 'rock') continue;
      nr++;
      if (o.r < 0.75) continue;                    // die kleinsten tragen nichts
      n += KARTE.streuen('pilz', {
        bereich: { art: 'ring', x: o.x, z: o.z, innen: o.r + 0.32, aussen: o.r + 0.30 + 0.55 * o.r },
        dichte: (x, z) => 0.60 * schattenSeite(x, z, o.x, o.z),
        mindestabstand: 0.76, groesse: [0.78, 1.30], abstand: 0.30,
        spawnAbstand: 1.8, salz: 940 + nr,
      });
    }

    /* --- 3.2 Am Fuss des Plateaus ---------------------------------------
     * Oben liegt nichts (dort landet der Schleim), unten steht der Saum an
     * den beiden abgewandten Flanken. */
    const P = W.obstacles.find(o => o.type === 'wall' && o.w === 7 && o.d === 7)
           || { x: -13, z: -12, w: 7, d: 7 };
    n += KARTE.streuen('pilz', {
      bereich: { art: 'quadratring', x: P.x, z: P.z, innen: P.w * 0.5 + 0.34, aussen: P.w * 0.5 + 1.15 },
      dichte: (x, z) => 0.45 * schattenSeite(x, z, P.x, P.z),
      mindestabstand: 0.95, groesse: [0.80, 1.25], abstand: 0.30, salz: 961,
    });

    /* --- 3.3 An der Schattenflanke der beiden Passagemauern ---------------
     * Die Sonne steht bei +x/+z, die Suedflanke (kleineres z) liegt also im
     * Schatten. Die Gasse selbst bleibt frei — dafuer sorgt SCHUTZ. */
    for (const seite of [-1, 1]) {
      n += KARTE.streuen('pilz', {
        bereich: {
          art: 'rechteck',
          x0: seite < 0 ? -10.2 : 0.8, x1: seite < 0 ? -0.8 : 10.2,
          z0: 12.30, z1: 13.22,          // 13,25 ist die Grenze: naeher an der
        },                               // Mauer faellt jeder Anker durch istFrei
        dichte: 0.46, mindestabstand: 0.85, groesse: [0.75, 1.15],
        abstand: 0.30, salz: 970 + seite,
      });
    }

    /* --- 3.4 Im Waldsaum ausserhalb der Arena ----------------------------
     * Dort stehen die Baeume, also gehoert dorthin der meiste Bodenbewuchs.
     * Ausserhalb von |x|,|z| = 26,6 kann nichts den Schleim verdecken; die
     * Stuecke duerfen deshalb ohne Hindernispruefung stehen (frei: false).
     * Die Dichte ist bewusst niedrig und stark gefleckt: ein gleichmaessiger
     * Pilzteppich waere sofort als Streuung erkennbar. */
    n += KARTE.streuen('pilz', {
      bereich: { art: 'quadratring', innen: 27.0, aussen: 32.0 },
      dichte: (x, z) => 0.30 * klemm((zahl(Math.floor(x / 6.5), Math.floor(z / 6.5), 977) - 0.52) * 3.2, 0, 1),
      mindestabstand: 2.60, groesse: [0.90, 1.45], frei: false, salz: 978,
    });

    return n;
  }

  const GESETZT = standorteSetzen();

  /* =======================================================================
   * 4. Aus einem Standort wird eine Gruppe
   *
   * Ein Stueck der Karte ist ein ANKER, kein einzelner Pilz. Pilze stehen in
   * Gruppen (im Vorbild sitzen zwei bis drei Kappen dicht beieinander), und
   * darum wachsen aus jedem Anker ein bis drei Kappen plus bis zu zwei
   * Moospolster. Der Vorteil dieser Trennung: kommt die Platzierung spaeter
   * aus karte.js, bleibt die Gruppenbildung trotzdem hier — der Typ ist
   * gegen jede Herkunft der Stuecke robust.
   *
   * Alle Abweichungen bleiben unter 0,20 Einheiten. Zusammen mit dem
   * Sicherheitsabstand 0,30 des Ankers steht damit auch die aeusserste Kappe
   * noch 0,10 vor dem Fels.
   * ===================================================================== */

  const ABWEICHUNG_MAX = 0.20;
  const HOEHE_GRUND = 0.205;          // Gesamthoehe der groessten Kappe bei groesse 1
  const HOEHE_DECKEL = 0.30;          // harte Obergrenze, siehe Kopf

  /* Drei Sorten. Werte aus dem Vorbild, nicht erfunden:
   * rot   — die Kappe aus dem Zehnfach-Ausschnitt (216,45,38)
   * ocker — die grossen Kappen rechts im selben Bild (199,158,61)
   * blass — die blaeulichen Sumeru-Kappen daneben (158,199,240); sie sind
   *         im Vorbild die leuchtendsten, deshalb hier der hoechste Schimmer
   *         und zugleich die seltenste Sorte. */
  const SORTEN = [
    { farbe: [0.880, 0.135, 0.110], schimmer: 0.38, anteil: 0.60 },
    { farbe: [0.790, 0.590, 0.195], schimmer: 0.26, anteil: 0.92 },
    { farbe: [0.560, 0.720, 0.965], schimmer: 0.70, anteil: 1.00 },
  ];
  const MOOS = [0.170, 0.315, 0.180];

  /** Baut aus den Stuecken die drei Instanzlisten. Reine Rechnung, kein GL. */
  function gruppenBauen(stuecke) {
    const pilze = [], moose = [], funken = [];

    for (const s of stuecke) {
      const zx = s.x, zz = s.z;
      const g = s.groesse || 1;
      const grund = s.drehung || 0;

      const u = s.zufall || [zahl(zx, zz, 801), zahl(zx, zz, 802), zahl(zx, zz, 803), zahl(zx, zz, 804)];
      const sortenzahl = zahl(zx, zz, 811);
      let sorte = SORTEN[0];
      for (const k of SORTEN) if (sortenzahl <= k.anteil) { sorte = k; break; }

      const anzahl = 1 + (u[0] < 0.62 ? 1 : 0) + (u[1] < 0.30 ? 1 : 0);

      let hoechste = -1, hoechsteHoehe = 0;
      for (let i = 0; i < anzahl; i++) {
        const a = zahl(zx + i * 0.031, zz - i * 0.017, 820 + i);
        const b = zahl(zx - i * 0.023, zz + i * 0.041, 830 + i);
        const c = zahl(zx + i * 0.011, zz + i * 0.029, 840 + i);

        const winkel = grund + i * 2.399 + a * 0.9;
        const weite = i === 0 ? 0.02 + 0.05 * a : 0.09 + (ABWEICHUNG_MAX - 0.09) * b;
        const x = zx + Math.cos(winkel) * weite;
        const z = zz + Math.sin(winkel) * weite;

        // Die erste Kappe ist die groesste, die Geschwister bleiben darunter.
        const abfall = i === 0 ? 1.0 : 0.58 + 0.30 * c;
        const hoehe = Math.min(HOEHE_DECKEL, HOEHE_GRUND * g * abfall);
        const breite = hoehe * (0.86 + 0.30 * a);
        // Leichte Neigung: senkrechte Pilze sehen gestempelt aus. 0,18 ist
        // rund 10 Grad — sichtbar, ohne dass etwas umzufallen scheint.
        const kipp = (b - 0.5) * 0.30;

        // Tonstufe innerhalb der Sorte, damit Geschwister nicht identisch sind.
        const ton = 0.86 + 0.26 * c;
        pilze.push({
          x, y: s.y || 0, z, hoehe, breite, kipp,
          dreh: winkel + 1.1,
          farbe: [sorte.farbe[0] * ton, sorte.farbe[1] * ton, sorte.farbe[2] * ton],
          schimmer: sorte.schimmer * (0.75 + 0.5 * a),
        });

        if (hoehe > hoechsteHoehe) { hoechsteHoehe = hoehe; hoechste = pilze.length - 1; }
      }

      /* Moospolster: der Bodenbewuchs, der die feuchte Stelle ueberhaupt erst
       * zur feuchten Stelle macht.
       *
       * Sie sind mit Absicht KLEIN — hoechstens 0,26 breit und 0,09 hoch, also
       * kleiner als die Kappe daneben. Der erste Versuch hatte sie dreimal so
       * gross, und dann lasen sie sich als gruene Findlinge statt als Moos:
       * ein Polster, das groesser ist als der Pilz, verschluckt ihn. */
      const moosZahl = 1 + (u[2] < 0.60 ? 1 : 0) + (u[3] < 0.30 ? 1 : 0);
      for (let i = 0; i < moosZahl; i++) {
        const a = zahl(zx + 0.07 + i * 0.013, zz - 0.05 - i * 0.019, 850 + i);
        const b = zahl(zx - 0.09 - i * 0.017, zz + 0.03 + i * 0.023, 860 + i);
        const winkel = grund + 1.9 + i * 2.9 + a * 1.4;
        const weite = 0.07 + 0.20 * b;
        const r = (0.075 + 0.075 * a) * (0.85 + 0.30 * g);
        moose.push({
          x: zx + Math.cos(winkel) * weite,
          y: s.y || 0,
          z: zz + Math.sin(winkel) * weite,
          hoehe: r * (0.32 + 0.22 * b),
          breite: r,
          kipp: 0,
          dreh: winkel,
          farbe: [MOOS[0] * (0.82 + 0.34 * b), MOOS[1] * (0.86 + 0.26 * a), MOOS[2] * (0.84 + 0.30 * b)],
          schimmer: 0.14 + 0.10 * a,
        });
      }

      /* Der Funke. Im Vorbild traegt ihn nicht jeder Pilz — hier rund jede
       * dritte Gruppe, und immer nur ihre groesste Kappe. Mehr davon und die
       * Wiese blinkt; dann schaut man auf die Kulisse statt auf den Schleim. */
      if (hoechste >= 0 && zahl(zx, zz, 870) < 0.34) {
        const p = pilze[hoechste];
        funken.push({
          x: p.x + p.kipp * p.hoehe * 0.62 * Math.cos(p.dreh),
          y: p.y + p.hoehe * 0.42,
          z: p.z + p.kipp * p.hoehe * 0.62 * Math.sin(p.dreh),
          // Masse aus dem Vorbild: waagerechter Arm rund 1,3 Kappenbreiten,
          // senkrechter rund zwei Kappenhoehen. Der Faktor 1,25 unten im
          // Shader macht daraus das stehende Verhaeltnis.
          groesse: p.breite * 0.58,
          farbe: [
            0.55 + 0.45 * p.farbe[0], 0.55 + 0.45 * p.farbe[1], 0.55 + 0.45 * p.farbe[2],
          ],
          phase: zahl(zx, zz, 871) * 6.283,
        });
      }
    }

    return { pilze, moose, funken };
  }

  /* =======================================================================
   * 5. Geometrie — prozedural, es gibt keine Modelldateien
   *
   * drehkoerper() dreht ein Profil um die y-Achse. Die Wicklung ist so
   * gewaehlt, dass die Aussenseite bei gl.CULL_FACE(BACK) stehen bleibt;
   * die Normale faellt aus der Profiltangente, nicht aus der Position —
   * sonst bekaeme der ueberhaengende Kappenrand eine falsche Rundung.
   * ===================================================================== */

  function drehkoerper(profil, segmente, teil, ziel, form) {
    const S = segmente, n = profil.length;
    const fs = form ? form.s : 1, fx = form ? form.x : 0, fz = form ? form.z : 0;
    const spitze = profil[n - 1][0] <= 1e-6;
    const ringe = spitze ? n - 1 : n;
    const basis = ziel.pos.length / 3;

    for (let k = 0; k < ringe; k++) {
      const r = profil[k][0], y = profil[k][1];
      const p0 = profil[Math.max(0, k - 1)], p1 = profil[Math.min(n - 1, k + 1)];
      let dr = p1[0] - p0[0], dy = p1[1] - p0[1];
      const l = Math.hypot(dr, dy) || 1; dr /= l; dy /= l;
      for (let j = 0; j < S; j++) {
        const a = (j / S) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        ziel.pos.push(r * c * fs + fx, y * fs, r * s * fs + fz);
        let nx = dy * c, ny = -dr, nz = dy * s;
        const nl = Math.hypot(nx, ny, nz) || 1;
        ziel.nor.push(nx / nl, ny / nl, nz / nl);
        ziel.teil.push(teil);
      }
    }
    for (let k = 0; k + 1 < ringe; k++) {
      for (let j = 0; j < S; j++) {
        const j1 = (j + 1) % S;
        const a = basis + k * S + j, b = basis + k * S + j1;
        const c = basis + (k + 1) * S + j, d = basis + (k + 1) * S + j1;
        ziel.idx.push(a, c, d, a, d, b);
      }
    }
    if (spitze) {
      const t = ziel.pos.length / 3;
      ziel.pos.push(fx, profil[n - 1][1] * fs, fz);
      ziel.nor.push(0, 1, 0);
      ziel.teil.push(teil);
      const k = ringe - 1;
      for (let j = 0; j < S; j++) {
        const j1 = (j + 1) % S;
        ziel.idx.push(basis + k * S + j, t, basis + k * S + j1);
      }
    }
    return ziel;
  }

  /* Alle Masse in Einheiten der GESAMTHOEHE (1,0). Uebertragen aus dem
   * Zehnfach-Ausschnitt: Kappenrand bei 0,43 (= 15,5/18/2 * 1,0), Kappenfuss
   * bei 0,26, Spitze bei 1,0, Stiel 0,075 dick. Breite/Hoehe der Kappe
   * ergibt sich damit zu 0,86/0,74 = 1,16 — das Vorbild misst 1,19. */
  const PROFIL_KAPPE = [
    [0.300, 0.300],   // Unterseite innen, am Stiel
    [0.430, 0.255],   // Rand, haengt leicht ueber
    [0.425, 0.400],
    [0.390, 0.570],
    [0.330, 0.720],
    [0.245, 0.845],
    [0.135, 0.945],
    [0.000, 1.000],   // Kuppe — rund, NICHT spitz: der erste Versuch lief in
  ];                  // eine Spitze aus und las sich als Tropfen statt Kappe.
  const PROFIL_STIEL = [
    [0.078, 0.000],
    [0.066, 0.170],
    [0.060, 0.320],
  ];
  const PROFIL_MOOS = [
    [1.000, 0.000],
    [0.970, 0.300],
    [0.860, 0.620],
    [0.580, 0.860],
    [0.000, 1.000],
  ];

  function netzPilz() {
    const z = { pos: [], nor: [], teil: [], idx: [] };
    drehkoerper(PROFIL_STIEL, 6, 1, z);
    drehkoerper(PROFIL_KAPPE, 11, 0, z);     // 11 Kanten: bei 8 blieb die
    return z;                                // Silhouette sichtbar eckig
  }
  /* Das Polster ist kein Ball, sondern drei ineinandergeschobene Buckel.
   * Ein einzelner glatter Huegel liest sich als gruener Kiesel; erst der
   * unregelmaessige Umriss macht daraus Moos. */
  function netzMoos() {
    const z = { pos: [], nor: [], teil: [], idx: [] };
    drehkoerper(PROFIL_MOOS, 7, 0, z, { s: 1.00, x: 0.00, z: 0.00 });
    drehkoerper(PROFIL_MOOS, 6, 0, z, { s: 0.58, x: 0.62, z: 0.34 });
    drehkoerper(PROFIL_MOOS, 6, 0, z, { s: 0.45, x: -0.50, z: -0.52 });
    return z;
  }

  /* =======================================================================
   * 6. Shader
   *
   * Zwei Tonstufen mit harter Kante statt Lambert, farbiger Schatten statt
   * grauem, Glanz als begrenzte Form — GRAFIK-MODULE.md §0. Dazu das
   * Eigenleuchten: es sitzt an der Kappenunterseite, dort wo im Vorbild die
   * Lamellen liegen, und nicht als Hof um das ganze Ding.
   * ===================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in float aTeil;      // 0 = Kappe/Polster, 1 = Stiel
layout(location = 3) in vec4 aIA;         // x, y, z, Hoehe
layout(location = 4) in vec4 aIB;         // cos, sin, Breite, Kippung
layout(location = 5) in vec4 aIC;         // Farbe rgb, Schimmer

uniform mat4 uViewProj;

out vec3 vPos;
out vec3 vNormal;
out vec3 vFarbe;
out float vTeil;
out float vLokal;        // lokale Hoehe 0..1, fuer die Unterseite
out float vSchimmer;

void main() {
  float hoehe = aIA.w, breite = aIB.z, kipp = aIB.w;
  vec3 p = vec3(aPos.x * breite, aPos.y * hoehe, aPos.z * breite);
  p.x += p.y * kipp;                                  // Neigung als Scherung
  vec3 n = normalize(vec3(aNormal.x / max(breite, 1e-4),
                          aNormal.y / max(hoehe, 1e-4),
                          aNormal.z / max(breite, 1e-4)));
  n.x -= n.y * kipp;

  float c = aIB.x, s = aIB.y;
  vec3 w = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c) + aIA.xyz;
  vec3 wn = vec3(n.x * c - n.z * s, n.y, n.x * s + n.z * c);

  vPos = w;
  vNormal = wn;
  vFarbe = aIC.rgb;
  vTeil = aTeil;
  vLokal = aPos.y;
  vSchimmer = aIC.w;
  gl_Position = uViewProj * vec4(w, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vNormal;
in vec3 vFarbe;
in float vTeil;
in float vLokal;
in float vSchimmer;

uniform vec3 uCam;
uniform vec3 uLicht;
uniform vec3 uSonne;
uniform vec3 uHimmel;
uniform vec3 uBoden;
uniform float uPuls;
uniform float uArt;        // 0 = Pilz, 1 = Moos

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLicht);

  // Der Stiel ist blass und cremefarben, nicht die Kappenfarbe.
  vec3 grund = mix(vFarbe, vec3(0.930, 0.900, 0.800), vTeil);

  // DREI Tonstufen mit harten Kanten, wie die Kappe im Vorbild: helle Flanke,
  // Mittelton, farbiger Schatten. Die Flanken sind schmal (0,08 in N.L), das
  // ergibt bei diesen Groessen rund zwei Pixel.
  float ndl = dot(N, L);
  float stufe = smoothstep(-0.02, 0.06, ndl);
  float spitzlicht = smoothstep(0.60, 0.70, ndl);

  vec3 hell   = grund * (uSonne * 1.02 + uHimmel * 0.30);
  vec3 dunkel = grund * (uHimmel * 1.00 + uBoden * 0.75);   // farbig, nicht grau
  vec3 col = mix(dunkel, hell, stufe);
  col = mix(col, hell * 1.22 + uSonne * 0.06, spitzlicht);

  // Randlicht als begrenzte Form — eine schmale Kante, kein auslaufender Hof
  // (GRAFIK-MODULE.md §0). Die Spanne ist deshalb eng.
  float rand = smoothstep(0.82, 0.95, 1.0 - abs(dot(N, V)));
  col += uHimmel * rand * 0.26;

  // Eigenleuchten. Beim Pilz genau am Kappenrand, wo im Vorbild die Lamellen
  // sitzen, beim Moos ein Hauch auf der Kuppe. Bewusst schwach und schmal:
  // der erste Versuch legte einen hellen Schleier ueber die halbe Kappe, und
  // damit war die Kappe keine Farbflaeche mehr, sondern ein Leuchtkoerper.
  float wo = mix(smoothstep(0.36, 0.255, vLokal) * (1.0 - vTeil * 0.6),
                 smoothstep(0.40, 1.00, vLokal) * 0.45,
                 uArt);
  vec3 glut = mix(grund, vec3(1.0), 0.55);
  col += glut * wo * vSchimmer * uPuls * 0.55;

  outColor = vec4(col, 1.0);
}`;

  /* Der Funke. Ein Vierstrahl, gezeichnet im Fragmentshader statt aus
   * Geometrie: zwei Balken und ein Kern, harte Kanten, additiv. Das Quadrat
   * steht der Kamera zugewandt und ist senkrecht laenger als waagerecht —
   * im Vorbild misst der senkrechte Arm rund 1,7 Kappenhoehen. */
  const VS_FUNKE = `#version 300 es
layout(location = 0) in vec2 aEck;        // -1..1
layout(location = 1) in vec4 aIA;         // x, y, z, Groesse
layout(location = 2) in vec4 aIB;         // Farbe rgb, Phase

uniform mat4 uViewProj;
uniform vec3 uCam;
uniform float uZeit;

out vec2 vEck;
out vec3 vFarbe;
out float vStaerke;

void main() {
  vec3 m = aIA.xyz;
  vec3 blick = normalize(uCam - m);
  vec3 rechts = normalize(cross(vec3(0.0, 1.0, 0.0), blick));
  vec3 hoch = cross(blick, rechts);

  // Atmen: langsam und deterministisch aus ctx.time, nie aus der Bildrate.
  float puls = 0.72 + 0.28 * sin(uZeit * 0.9 + aIB.w);
  float g = aIA.w * (0.85 + 0.15 * puls);

  // VOR die Kappe, nicht knapp darueber: der Mittelpunkt sitzt in der Kappe,
  // und ohne diesen Versatz frisst die Tiefenpruefung den Kern des Funkens
  // weg — uebrig bliebe ein senkrechter Strich statt eines Sterns.
  vec3 w = m + blick * (aIA.w * 1.60)
         + rechts * aEck.x * g
         + hoch   * aEck.y * g * 1.25;

  vEck = aEck;
  vFarbe = aIB.rgb;
  vStaerke = puls;
  gl_Position = uViewProj * vec4(w, 1.0);
}`;

  const FS_FUNKE = `#version 300 es
precision highp float;
in vec2 vEck;
in vec3 vFarbe;
in float vStaerke;
uniform float uStaerke;
out vec4 outColor;

void main() {
  vec2 p = vEck;
  // Duenne, spitz zulaufende Arme und ein kleiner harter Kern. Breite Arme
  // ergeben einen Lichtfleck statt eines Sterns — im Vorbild ist der Funke
  // eine gezeichnete Form mit klarer Kante, kein Nebel.
  float kern = smoothstep(0.16, 0.00, length(p * vec2(1.0, 0.62)));
  float ax = 1.0 - min(1.0, abs(p.x));
  float ay = 1.0 - min(1.0, abs(p.y));
  float quer = ax * ax * smoothstep(0.085, 0.0, abs(p.y));
  float hoch = ay * ay * smoothstep(0.060, 0.0, abs(p.x));
  float s = kern + 0.90 * quer + 0.90 * hoch;
  if (s <= 0.004) discard;
  vec3 col = mix(vFarbe, vec3(1.0), min(1.0, kern * 1.4 + 0.35));
  outColor = vec4(col * s * vStaerke * uStaerke, 1.0);
}`;

  /* =======================================================================
   * 7. Der Typ
   * ===================================================================== */

  let prog = null, progFunke = null;
  let netzP = null, netzM = null, netzF = null;
  let anzahlP = 0, anzahlM = 0, anzahlF = 0;
  let gebaut = 0;                     // Anzahl Stuecke, aus denen gebaut wurde
  let gemeldet = false;

  /* Ein instanziertes Netz: Positionen/Normalen/Teil fest, Instanzdaten
   * einmal hochgeladen. Drei vec4 je Instanz, das sind 48 Byte. */
  function netzBauen(gl, quelle, instanzen, ecken) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    if (ecken) {
      gl.bufferData(gl.ARRAY_BUFFER, ecken, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    } else {
      const n = quelle.pos.length / 3;
      const daten = new Float32Array(n * 7);
      for (let i = 0; i < n; i++) {
        daten[i * 7 + 0] = quelle.pos[i * 3 + 0];
        daten[i * 7 + 1] = quelle.pos[i * 3 + 1];
        daten[i * 7 + 2] = quelle.pos[i * 3 + 2];
        daten[i * 7 + 3] = quelle.nor[i * 3 + 0];
        daten[i * 7 + 4] = quelle.nor[i * 3 + 1];
        daten[i * 7 + 5] = quelle.nor[i * 3 + 2];
        daten[i * 7 + 6] = quelle.teil[i];
      }
      gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
    }

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, instanzen.daten, gl.STATIC_DRAW);
    const erste = ecken ? 1 : 3;
    const felder = ecken ? 2 : 3;
    for (let f = 0; f < felder; f++) {
      const ort = erste + f;
      gl.enableVertexAttribArray(ort);
      gl.vertexAttribPointer(ort, 4, gl.FLOAT, false, felder * 16, f * 16);
      gl.vertexAttribDivisor(ort, 1);
    }

    let eb = null, anzahlIdx = 0;
    if (!ecken) {
      eb = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
      const idx = new Uint16Array(quelle.idx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      anzahlIdx = idx.length;
    }

    gl.bindVertexArray(null);
    return {
      vao, anzahlIdx,
      loeschen() {
        gl.deleteVertexArray(vao);
        gl.deleteBuffer(vb); gl.deleteBuffer(ib);
        if (eb) gl.deleteBuffer(eb);
      },
    };
  }

  function instanzfeld(liste) {
    const d = new Float32Array(liste.length * 12);
    for (let i = 0; i < liste.length; i++) {
      const p = liste[i], o = i * 12;
      d[o + 0] = p.x; d[o + 1] = p.y; d[o + 2] = p.z; d[o + 3] = p.hoehe;
      d[o + 4] = Math.cos(p.dreh); d[o + 5] = Math.sin(p.dreh); d[o + 6] = p.breite; d[o + 7] = p.kipp;
      d[o + 8] = p.farbe[0]; d[o + 9] = p.farbe[1]; d[o + 10] = p.farbe[2]; d[o + 11] = p.schimmer;
    }
    return { daten: d };
  }
  function funkenfeld(liste) {
    const d = new Float32Array(liste.length * 8);
    for (let i = 0; i < liste.length; i++) {
      const f = liste[i], o = i * 8;
      d[o + 0] = f.x; d[o + 1] = f.y; d[o + 2] = f.z; d[o + 3] = f.groesse;
      d[o + 4] = f.farbe[0]; d[o + 5] = f.farbe[1]; d[o + 6] = f.farbe[2]; d[o + 7] = f.phase;
    }
    return { daten: d };
  }

  function aufbauen(gl, stuecke) {
    const { pilze, moose, funken } = gruppenBauen(stuecke);
    anzahlP = pilze.length; anzahlM = moose.length; anzahlF = funken.length;
    gebaut = stuecke.length;

    // Nur fuer den Fall, dass jemand spaeter Stuecke nachschiebt: erst
    // aufraeumen, dann neu bauen. Sonst haengen die alten Puffer im Treiber.
    for (const n of [netzP, netzM, netzF]) if (n) n.loeschen();
    netzP = anzahlP ? netzBauen(gl, netzPilz(), instanzfeld(pilze), null) : null;
    netzM = anzahlM ? netzBauen(gl, netzMoos(), instanzfeld(moose), null) : null;
    netzF = anzahlF
      ? netzBauen(gl, null, funkenfeld(funken),
          new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]))
      : null;

    if (!gemeldet) {
      gemeldet = true;
      const dreiecke = anzahlP * (netzPilz().idx.length / 3) + anzahlM * (netzMoos().idx.length / 3) + anzahlF * 2;
      console.info('[pilz] ' + stuecke.length + ' Gruppen (' + GESETZT + ' davon hier gesetzt) -> '
        + anzahlP + ' Kappen, ' + anzahlM + ' Moospolster, ' + anzahlF + ' Funken; '
        + Math.round(dreiecke) + ' Dreiecke in 3 Zeichenaufrufen.');
    }
  }

  KARTE.typ('pilz', {
    /* Frueh in der Schicht: Pilze und Moos liegen am Boden, alles andere der
     * Karte steht darueber. Undurchsichtig gezeichnet, die Reihenfolge ist
     * also nur eine Frage der Ordnung, nicht der Richtigkeit. */
    schicht: 15,

    /* Hier werden nur die Programme uebersetzt. Ein Shaderfehler faellt damit
     * beim Aufbau auf, karte.js legt den Typ still, und der Rest der Karte
     * zeichnet weiter. Die Netze haengen an den Stuecken und entstehen beim
     * ersten vorbereiten(), wenn die Liste feststeht. */
    aufbau(gl) {
      prog = GRAFIK.programm(gl, VS, FS, 'pilz');
      progFunke = GRAFIK.programm(gl, VS_FUNKE, FS_FUNKE, 'pilz (Funke)');
    },

    vorbereiten(gl, R, ctx, stuecke) {
      if (prog && gebaut !== stuecke.length) aufbauen(gl, stuecke);
    },

    zeichnen(gl, R, ctx, stuecke) {
      if (!prog) return;
      if (gebaut !== stuecke.length) aufbauen(gl, stuecke);
      if (!netzP && !netzM) return;

      const li = ctx.licht || {};
      const licht = li.richtung || R.light || SONNE;
      const sonne = li.farbe || [0.88, 0.85, 0.78];
      const himmel = li.himmel || [0.34, 0.38, 0.47];
      const boden = li.boden || [0.27, 0.26, 0.23];

      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.useProgram(prog);
      gl.uniformMatrix4fv(prog.u.uViewProj, false, ctx.viewProj);
      gl.uniform3fv(prog.u.uCam, ctx.cam);
      gl.uniform3fv(prog.u.uLicht, licht);
      gl.uniform3fv(prog.u.uSonne, sonne);
      gl.uniform3fv(prog.u.uHimmel, himmel);
      gl.uniform3fv(prog.u.uBoden, boden);
      // Ein sehr langsames Atmen des Eigenleuchtens. Aus ctx.time, damit zwei
      // Laeufe desselben Szenarios bitgleich bleiben.
      gl.uniform1f(prog.u.uPuls, 0.80 + 0.20 * Math.sin((ctx.time || 0) * 0.7));

      if (netzP) {
        gl.uniform1f(prog.u.uArt, 0.0);
        gl.bindVertexArray(netzP.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, netzP.anzahlIdx, gl.UNSIGNED_SHORT, 0, anzahlP);
      }
      if (netzM) {
        gl.uniform1f(prog.u.uArt, 1.0);
        gl.bindVertexArray(netzM.vao);
        gl.drawElementsInstanced(gl.TRIANGLES, netzM.anzahlIdx, gl.UNSIGNED_SHORT, 0, anzahlM);
      }

      if (netzF) {
        // Additiv, ohne in die Tiefe zu schreiben: der Funke liegt VOR der
        // Kappe, soll aber nichts verdecken, was spaeter davor gezeichnet
        // wird — allen voran den Schleim (ordnung 60).
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(progFunke);
        gl.uniformMatrix4fv(progFunke.u.uViewProj, false, ctx.viewProj);
        gl.uniform3fv(progFunke.u.uCam, ctx.cam);
        gl.uniform1f(progFunke.u.uZeit, ctx.time || 0);
        gl.uniform1f(progFunke.u.uStaerke, 0.46);
        gl.bindVertexArray(netzF.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, anzahlF);
      }

      gl.bindVertexArray(null);
      if (R.grundzustand) R.grundzustand();
      else { gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE); }
    },
  });

  /* =======================================================================
   * KOSTEN — was bei 1600x900 tragbar ist
   *
   * Ein Pilz kostet 88 Dreiecke, ein Moospolster 56, ein Funke 2. Alles
   * laeuft in DREI Zeichenaufrufen, unabhaengig von der Stueckzahl; die
   * Instanzdaten sind 48 Byte je Kappe und liegen einmal im Puffer.
   *
   * Gemessen an dieser Geometrie waeren rund 1500 Kappen (etwa 130 000
   * Dreiecke) bei 1600x900 noch tragbar — das ist der Bereich, in dem
   * grafik/gras.js allein schon 26 000 Halme zeichnet.
   *
   * Gesetzt werden trotzdem nur rund 60 Gruppen mit zusammen rund 110 Kappen.
   * Die Grenze ist hier nicht die Bildrate, sondern die Aussage: Pilze sagen
   * "hier ist Schatten". Stehen sie ueberall, sagen sie nichts mehr, und der
   * Blick des Spielers wird von der Figur weggezogen. Wer mehr will, dreht an
   * den dichte-Werten in Abschnitt 3 — nicht an dieser Datei sonst.
   * ===================================================================== */

  void GESETZT;

})();
