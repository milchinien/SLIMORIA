'use strict';
/* ===========================================================================
 * grafik/props/baum.js — Ausstattungstyp "baum".
 *
 * Besitzer: Lane KARTE (Prop-Agent Baum). Vertrag: GRAFIK-MODULE.md §3 und
 * das Register in grafik/karte.js (KARTE.typ / schicht / aufbau / zeichnen).
 *
 * WAS DIESE DATEI IST — und was sie ausdruecklich NICHT ist
 *
 *   Sie zeichnet Baeume. Sie setzt keinen einzigen. Wo ein Baum steht,
 *   entscheidet grafik/karte.js; diese Datei bekommt die fertige Liste und
 *   hat keine eigene Zufallsquelle (KARTE liefert s.zufall und s.variante,
 *   beides ortsgehasht). Damit steht der Wald in jeder Aufnahme an derselben
 *   Stelle, auf jeder Maschine, in jedem Lauf.
 *
 *   Sie fasst world.js nicht an, nimmt an keiner Kollision teil und aendert
 *   die Arenageometrie nicht. Ein Baum ist Kulisse.
 *
 * DIE GRENZE, die ueber allem steht (GDD 10 §69 / §98):
 *   Der Schleim ist die Figur. Ein 4 bis 7 Einheiten hoher Baum wuerde ihn
 *   verdecken, stuende er in der Arena. karte.js setzt deshalb keinen Baum
 *   innerhalb |x|,|z| = 26,6 — und diese Datei prueft das nach und
 *   ueberspringt, was trotzdem dort landet (siehe instanzenBauen). Lieber ein
 *   fehlender Baum als ein verdeckter Schleim.
 *
 * ---------------------------------------------------------------------------
 * WAS IN ref/genshin/ WIRKLICH ZU SEHEN IST — gemessen, nicht vermutet
 *
 * landschaft_sumeru_wiese_see_tag_2560 (Einzelbaum, Figur im Bild):
 *   - Figur rund 250 px hoch, der Baum rund 655 px und dabei weiter hinten:
 *     der Baum ist also grob das 3- bis 4-fache der Figurhoehe. Bei einem
 *     Schleim mit Radius 1 (tuning.js) heisst das 4 bis 7 Einheiten — genau
 *     die Spanne, die karte.js vergibt.
 *   - Krone 480 x 400 px: BREITER ALS HOCH, rund 1,2 : 1.
 *   - Stamm 255 px sichtbar von 655 px Gesamthoehe = 39 %. Die Krone haengt
 *     tief, sie sitzt nicht wie ein Ball auf einer Stange.
 *   - Stammbreite rund 40 px gegen 480 px Kronenbreite = 1 : 12.
 *   - Der Umriss ist GEKERBT, keine Ellipse: rund acht rundliche Lappen
 *     ueberlappen sich, dazwischen Einbuchtungen.
 *   - Farben: Oberseite gelbgruen, Mitte sattgruen, Unterseite ein
 *     BLAEULICHES Dunkelgruen — der Schatten ist farbig, nicht grau.
 *     Stamm warmes Dunkelbraun.
 *
 * landschaft_wiese_mittag_figur_2560 (Baum rechts neben der Figur):
 *   - rund neun erkennbare Lappen, jeder etwa 1/8 der Kronenbreite.
 *   - Die helle Oberseite ist eine HART begrenzte Form auf dem dunkleren
 *     Gruen. Der Uebergang ist bei 1440p etwa 6 bis 10 px breit, also eine
 *     Kante — kein Verlauf ueber die halbe Krone.
 *
 * landschaft_mondstadt_mittag_fernnebel_4k (Mittelgrund, 20 bis 60 Einheiten):
 *   - Auf dieser Entfernung ist ein Baum eine SILHOUETTE aus drei bis fuenf
 *     Ballen. Der Stamm verschwindet fast. Kein Blattdetail ueberlebt.
 *   - Je weiter hinten, desto mehr zieht die Farbe zum Dunst: die
 *     Schattenseite hellt auf, der Baum wird am Ende fast einfarbig.
 *
 * goldene_stunde_grasland_2560 (Gegenlicht):
 *   - Beim gegenlichtigen Baum am rechten Rand ist der AUSSENRAND der Krone
 *     heller als ihre Mitte. Das Licht kommt dort durch, wo das Blattwerk
 *     duenn ist. Genau das macht uDurch unten — Rand mal Gegenlicht, nicht
 *     ein gleichmaessiges Leuchten ueber die ganze Krone.
 *
 * landschaft_liyue_luftperspektive_4k:
 *   - Vordergrundbaum: rund zehn deutlich getrennte Lappen, Krone rund
 *     1,3 : 1 breiter als hoch. Bestaetigt die Zahlen von oben.
 *
 * ---------------------------------------------------------------------------
 * DARAUS ABGELEITET
 *
 *   Krone = wenige ueberlappende Ballen, nicht Blattwerk. Sechs bis sieben
 *   Icosphere-Lappen (Stufe 1, 80 Dreiecke), gemeinsam auf die Zielmasse
 *   normiert, mit gekerbtem Radius fuer den unruhigen Umriss.
 *
 *   Die Normale ist bewusst NICHT die Lappennormale, sondern eine Mischung
 *   aus Lappenrichtung (42 %) und Richtung vom Kronenmittelpunkt (58 %),
 *   plus ein fest eingebackenes Zittern. Ohne die Mischung liest sich die
 *   Krone als Haufen Kugeln, ohne das Zittern als glatter Pilz mit einer
 *   waagerechten Terrasse. Beide Fehler standen im ersten Versuch im Bild,
 *   die Begruendung steht bei kroneNetz().
 *
 *   Beleuchtung: drei Tonstufen mit harten Kanten (GRAFIK-MODULE.md §0),
 *   dazu die Durchleuchtung im Gegenlicht. Kein Lambert-Verlauf.
 *
 *   Wind: eine gemeinsame langsame Welle, Amplitude quadratisch mit der
 *   Hoehe (der Fuss steht still), Phase aus der Weltposition. Kein
 *   Math.random, kein Date, kein performance.now — nur ctx.time.
 *
 * KOSTEN bei 1600x900 (gemessen):
 *   Krone 480 bis 560 Dreiecke, Stamm 24 bis 28 — 504 bis 588 je Baum.
 *   Alles instanziert: SECHS Zeichenaufrufe fuer den ganzen Wald, egal wie
 *   viele Baeume es sind (drei Bauplaene mal Krone und Stamm).
 *   Instanzdaten 44 Byte je Baum, einmal hochgeladen.
 *   Tragbar sind rund 150 Baeume; darueber wird nicht die Bildrate das
 *   Problem, sondern die Lesbarkeit. karte.js setzt heute 58.
 * ========================================================================= */
(function () {

  if (typeof KARTE === 'undefined' || typeof KARTE.typ !== 'function') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[baum] KARTE fehlt — props/baum.js muss NACH grafik/karte.js geladen werden.');
    }
    return;
  }

  /* =======================================================================
   * 0. Stellschrauben
   *
   * Bewusst Konstanten und keine regler-Liste: KARTE.typ() reicht keine
   * Regler an das Tuning-Panel weiter, das koennen nur GRAFIK-Module. Wer
   * hier dreht, dreht hier.
   * ===================================================================== */

  const WIND_STAERKE  = 0.034;   // Ausschlag der Kronenspitze, Anteil der Baumhoehe
  const WIND_RICHTUNG = [0.82, 0.57];        // wird unten normiert
  const HIMMEL_KIPPUNG = 0.15;   // Normale zum Himmel kippen: Kronen lesen sich von oben
  const DURCH_STAERKE  = 0.70;   // Gegenlicht durch das Blattwerk

  /* Luftperspektive am Material. Der Waldsaum steht 27 bis 42 Einheiten
   * entfernt; ohne diesen Zug stehen dort harte dunkle Formen vor dem
   * Himmel, was in KEINEM der Referenzbilder vorkommt (siehe mondstadt und
   * liyue oben).
   *
   * ABSICHTLICH SCHWACH. Der Fernnebel gehoert grafik/nebel.js, und das
   * Modul liegt inzwischen (nebel@70). Was hier bleibt, ist nur die
   * Materialentsaettigung der Krone, die ein Bildschirmdurchgang nicht
   * leisten kann. Wer den Eindruck doppelt genebelt findet, dreht
   * DUNST_STAERKE auf 0 — es ist genau diese eine Zahl. */
  const DUNST_STAERKE = 0.22;
  const DUNST_NAH     = 20.0;
  const DUNST_FERN    = 56.0;

  /* Drei Tonstufen je Farbfamilie: Schatten, Mitte, Licht.
   * Abgelesen aus landschaft_sumeru_wiese_see_tag_2560 und
   * landschaft_wiese_mittag_figur_2560. Der Schatten ist blaeulich-gruen,
   * nicht grau (GRAFIK-MODULE.md §0). */
  const KRONE_KUEHL = {
    schatten: [0.030, 0.135, 0.130],
    mitte:    [0.105, 0.330, 0.170],
    hell:     [0.400, 0.720, 0.230],
  };
  const KRONE_WARM = {
    schatten: [0.070, 0.140, 0.075],
    mitte:    [0.215, 0.390, 0.125],
    hell:     [0.630, 0.810, 0.250],
  };
  /* Blattdurchlicht: gelber und heller als das Blatt selbst — so sieht
   * Gegenlicht in goldene_stunde_grasland_2560 aus. */
  const DURCHLICHT = [0.72, 0.92, 0.30];

  /* Stamm. In den Referenzbildern ist er dunkel, aber nie schwarz — er behaelt
   * seine warme Farbe bis in den Schatten. Ein schwarzer Stamm zieht bei
   * 27 Einheiten Entfernung mehr Aufmerksamkeit als die Krone. */
  const STAMM = {
    schatten: [0.150, 0.115, 0.095],
    mitte:    [0.290, 0.225, 0.165],
    hell:     [0.470, 0.375, 0.270],
  };

  /* =======================================================================
   * 1. Bauplaene
   *
   * Der Einheitsbaum ist 1,0 hoch: y = 0 ist der Fuss, y = 1 die
   * Kronenspitze. Die Instanz skaliert ihn auf s.groesse.
   *
   *   kroneRx     halbe Kronenbreite (Anteil der Baumhoehe)
   *   kroneUnten  Unterkante der Krone — 1 minus kroneUnten ist die
   *               Kronenhoehe, kroneUnten selbst der sichtbare Stammanteil
   *   stammR      Stammradius am Fuss
   *   stammBis    bis wohin der Stamm reicht (steckt oben in der Krone)
   *   lappen      [x, y, z, r] in unnormierten Einheiten; die Krone wird
   *               danach als Ganzes auf kroneRx / kroneUnten normiert,
   *               deshalb muessen diese Zahlen nur ihr Verhaeltnis stimmen
   * ===================================================================== */

  const PLAENE = [
    /* A "breit" — der Laubbaum aus landschaft_sumeru_wiese_see:
     * Krone 0,94 breit auf 0,66 hoch = 1,42 : 1, Stamm 34 % sichtbar,
     * Stammdurchmesser 0,080 gegen 0,94 Kronenbreite = 1 : 11,8. */
    {
      name: 'breit', kroneRx: 0.47, kroneUnten: 0.30,
      stammR: 0.056, stammBis: 0.62, seiten: 7,
      /* Zwei Gipfelballen (der Umriss oben muss unruhig sein — eine glatte
       * Kuppe sieht nach Pilz aus), drei Seitenballen und zwei tiefe, die
       * ueber den Stamm haengen. */
      lappen: [
        [0.00, 0.66, 0.05, 0.50],
        [0.40, 0.46, -0.34, 0.44],
        [-0.44, 0.34, 0.26, 0.46],
        [0.70, -0.02, 0.16, 0.50],
        [-0.68, -0.14, -0.20, 0.48],
        [0.12, -0.24, 0.72, 0.46],
        [-0.12, -0.46, -0.56, 0.44],
      ],
    },
    /* B "schlank" — der haeufigere Waldbaum im Mittelgrund von
     * landschaft_mondstadt: schmaler, hoeherer Ansatz, fuenf Ballen. */
    {
      name: 'schlank', kroneRx: 0.36, kroneUnten: 0.42,
      stammR: 0.045, stammBis: 0.70, seiten: 6,
      lappen: [
        [0.00, 0.70, 0.00, 0.46],
        [0.34, 0.40, 0.22, 0.44],
        [-0.32, 0.34, -0.20, 0.45],
        [0.44, -0.08, -0.28, 0.44],
        [-0.40, -0.14, 0.30, 0.43],
        [0.06, -0.46, 0.10, 0.40],
      ],
    },
    /* C "gedrungen" — der breite, tief angesetzte Baum am Ufer in
     * landschaft_liyue_luftperspektive: sieben Ballen, fast so breit wie
     * hoch, Stamm kaum sichtbar. */
    {
      name: 'gedrungen', kroneRx: 0.54, kroneUnten: 0.24,
      stammR: 0.062, stammBis: 0.52, seiten: 7,
      lappen: [
        [0.00, 0.44, 0.06, 0.50],
        [0.62, 0.26, -0.24, 0.46],
        [-0.58, 0.22, 0.28, 0.48],
        [0.86, -0.14, 0.20, 0.46],
        [-0.84, -0.10, -0.16, 0.45],
        [0.14, -0.24, 0.82, 0.46],
        [-0.16, -0.30, -0.78, 0.44],
      ],
    },
  ];

  /* =======================================================================
   * 2. Deterministische Zahl fuer die Netzerzeugung
   *
   * NICHT die Zufallsquelle des Typs — die Verteilung und jede Variation je
   * Baum kommen aus KARTE (s.zufall, s.variante). Das hier kerbt nur den
   * Kronenumriss und laeuft genau einmal beim Aufbau: das Ergebnis ist
   * gebackene Geometrie, in jedem Lauf bitgleich dieselbe.
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
  const zahl = (a, b, c) => h32(a, b, c) * 2.3283064365386963e-10;
  const klemm = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* =======================================================================
   * 3. Netze
   *
   * Beide Netze liefern drei Attribute:
   *   0 aPos    vec3   Einheitsbaum, Hoehe 1
   *   1 aNormal vec3
   *   2 aExtra  vec2   x = Hoehenanteil 0..1 (Windgewicht), y = Lappenphase
   * ===================================================================== */

  /* --- 3.1 Krone --------------------------------------------------------
   *
   * Erst alle Lappen roh erzeugen, dann als GANZES auf kroneRx / kroneUnten
   * normieren. Dadurch stimmen die Verhaeltnisse aus dem Referenzmaterial,
   * ohne dass die Lappenzahlen oben von Hand ausgerechnet werden muessten.
   * Die Normale entsteht ERST NACH der Normierung, sonst zeigt sie schief. */
  function kroneNetz(plan) {
    const ico = createIcosphere(1);              // 42 Ecken, 80 Dreiecke
    const nv = ico.positions.length / 3;
    const nl = plan.lappen.length;

    const roh = new Float32Array(nv * nl * 3);   // Orte
    const dir = new Float32Array(nv * nl * 3);   // Lappenrichtung, fuer die Normale
    const lap = new Float32Array(nv * nl);       // Lappennummer
    const idx = new Uint16Array(ico.indices.length * nl);

    let v = 0;
    for (let l = 0; l < nl; l++) {
      const L = plan.lappen[l];
      const basis = v;
      for (let i = 0; i < nv; i++) {
        const dx = ico.positions[i * 3], dy = ico.positions[i * 3 + 1], dz = ico.positions[i * 3 + 2];
        /* Kerbung: der Radius haengt an der gerundeten Richtung. Zwei Ecken,
         * die in dieselbe Richtung zeigen, bekommen denselben Wert — die
         * Kerben sitzen also fest am Lappen und flackern nicht. */
        const k = 0.74 + 0.50 * zahl(Math.round(dx * 24), Math.round(dy * 24),
                                     Math.round(dz * 24) + l * 977);
        const r = L[3] * k;
        roh[v * 3] = L[0] + dx * r;
        roh[v * 3 + 1] = L[1] + dy * r;
        roh[v * 3 + 2] = L[2] + dz * r;
        dir[v * 3] = dx; dir[v * 3 + 1] = dy; dir[v * 3 + 2] = dz;
        lap[v] = l;
        v++;
      }
      for (let f = 0; f < ico.indices.length; f++) {
        idx[l * ico.indices.length + f] = basis + ico.indices[f];
      }
    }

    /* Normieren: x und z mit demselben Faktor (die Krone soll rund bleiben),
     * y so, dass die Unterkante auf kroneUnten und die Spitze auf 1,0 liegt. */
    let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9, zmin = 1e9, zmax = -1e9;
    for (let i = 0; i < v; i++) {
      const x = roh[i * 3], y = roh[i * 3 + 1], z = roh[i * 3 + 2];
      if (x < xmin) xmin = x; if (x > xmax) xmax = x;
      if (y < ymin) ymin = y; if (y > ymax) ymax = y;
      if (z < zmin) zmin = z; if (z > zmax) zmax = z;
    }
    const mx = (xmin + xmax) * 0.5, mz = (zmin + zmax) * 0.5;
    const sxz = plan.kroneRx / Math.max(xmax - mx, mx - xmin, zmax - mz, mz - zmin, 1e-6);
    const sy = (1.0 - plan.kroneUnten) / Math.max(ymax - ymin, 1e-6);
    const kroneMitte = plan.kroneUnten + (1.0 - plan.kroneUnten) * 0.5;

    const pos = new Float32Array(v * 3);
    const nor = new Float32Array(v * 3);
    const ext = new Float32Array(v * 3);
    for (let i = 0; i < v; i++) {
      const px = (roh[i * 3] - mx) * sxz;
      const py = plan.kroneUnten + (roh[i * 3 + 1] - ymin) * sy;
      const pz = (roh[i * 3 + 2] - mz) * sxz;
      pos[i * 3] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;

      // Lappenrichtung, mit der inversen Streckung nachgezogen
      let lx = dir[i * 3] / sxz, ly = dir[i * 3 + 1] / sy, lz = dir[i * 3 + 2] / sxz;
      let ll = Math.hypot(lx, ly, lz) || 1; lx /= ll; ly /= ll; lz /= ll;
      // Richtung vom Kronenmittelpunkt
      let cx = px, cy = py - kroneMitte, cz = pz;
      const cl = Math.hypot(cx, cy, cz) || 1; cx /= cl; cy /= cl; cz /= cl;
      /* 42 % Lappen, 58 % Krone. Bei 45/55 zerfiel die Krone in gestapelte
       * Teller (an jedem Lappenaequator lief eine waagerechte Kante durch
       * die Tonstufen), bei 35/65 wurde sie zur glatten Kuppe mit einer
       * einzigen waagerechten Terrasse. Dazwischen liegt die Masse mit
       * Beulen, die ref/genshin/ zeigt.
       *
       * Dazu ein fest eingebackenes Zittern auf der Normalen. Es ist der
       * wichtigste Zug an dieser Krone: ohne ihn laeuft die Grenze zwischen
       * den Tonstufen als saubere waagerechte Linie um den Baum und der
       * Baum sieht aus wie ein Pilz. Mit ihm franst sie aus, und die Krone
       * bekommt die unregelmaessigen hellen und dunklen Flecken, die in
       * landschaft_wiese_mittag_figur_2560 das Blattwerk andeuten. Die
       * Icosphere hat nur 42 Ecken je Ballen, die Flecken bleiben also
       * gross — kein Rauschen (GRAFIK-MODULE.md §0: wenige grosse Formen). */
      const ax = Math.round(dir[i * 3] * 24);
      const ay = Math.round(dir[i * 3 + 1] * 24);
      const az = Math.round(dir[i * 3 + 2] * 24);
      const nr = lap[i] | 0;
      const jx = zahl(ax, ay, 3100 + nr) - 0.5;
      const jy = zahl(ay, az, 3200 + nr) - 0.5;
      const jz = zahl(az, ax, 3300 + nr) - 0.5;
      let nx = lx * 0.42 + cx * 0.58 + jx * 0.62;
      let ny = ly * 0.42 + cy * 0.58 + jy * 0.44;
      let nz = lz * 0.42 + cz * 0.58 + jz * 0.62;
      const nn = Math.hypot(nx, ny, nz) || 1;
      nor[i * 3] = nx / nn; nor[i * 3 + 1] = ny / nn; nor[i * 3 + 2] = nz / nn;

      ext[i * 3] = klemm(py, 0, 1);                        // Windgewicht
      ext[i * 3 + 1] = (lap[i] * 0.37) % 1.0;              // Lappenphase
      // Hoehe INNERHALB der Krone, 0 = Unterkante, 1 = Spitze
      ext[i * 3 + 2] = klemm((py - plan.kroneUnten) / (1.0 - plan.kroneUnten), 0, 1);
    }
    return { pos, nor, ext, idx, ecken: v, dreiecke: idx.length / 3 };
  }

  /* --- 3.2 Stamm --------------------------------------------------------
   *
   * Schlichtes, sich verjuengendes Prisma mit harten Normalen — mehr traegt
   * auf 27 Einheiten Entfernung ohnehin kein Pixel. Eine leichte Biegung ist
   * eingebaut (der Baum in landschaft_sumeru_wiese_see steht schief); die
   * Instanzdrehung dreht die Biegerichtung mit. */
  function stammNetz(plan) {
    const n = plan.seiten;
    const ringe = [0.0, 0.45, 1.0];
    const radius = [1.0, 0.74, 0.52];
    const pos = [], nor = [], ext = [], idx = [];
    const hoehe = plan.stammBis;
    const bieg = 0.055;

    for (let s = 0; s < n; s++) {
      const a0 = (s / n) * Math.PI * 2, a1 = ((s + 1) / n) * Math.PI * 2;
      const am = (a0 + a1) * 0.5;
      const nx = Math.cos(am), nz = Math.sin(am);
      for (let b = 0; b < ringe.length - 1; b++) {
        const basis = pos.length / 3;
        for (const [a, ri] of [[a0, b], [a1, b], [a1, b + 1], [a0, b + 1]]) {
          const y = ringe[ri] * hoehe;
          const r = plan.stammR * radius[ri];
          const versatz = bieg * Math.pow(ringe[ri], 1.6) * hoehe;
          pos.push(Math.cos(a) * r + versatz, y, Math.sin(a) * r);
          nor.push(nx, 0.28, nz);              // leicht nach oben: kein schwarzer Stamm
          ext.push(klemm(y, 0, 1), 0.0, 1.0);
        }
        idx.push(basis, basis + 1, basis + 2, basis, basis + 2, basis + 3);
      }
    }
    // Normalen normieren
    const nf = new Float32Array(nor);
    for (let i = 0; i < nf.length; i += 3) {
      const l = Math.hypot(nf[i], nf[i + 1], nf[i + 2]) || 1;
      nf[i] /= l; nf[i + 1] /= l; nf[i + 2] /= l;
    }
    return {
      pos: new Float32Array(pos), nor: nf, ext: new Float32Array(ext),
      idx: new Uint16Array(idx), ecken: pos.length / 3, dreiecke: idx.length / 3,
    };
  }

  /* =======================================================================
   * 4. Shader
   * ===================================================================== */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aExtra;     // x = Hoehenanteil, y = Lappenphase,
                                         // z = Hoehe innerhalb der Krone
layout(location = 3) in vec3 iPos;       // Fusspunkt in der Welt
layout(location = 4) in vec4 iForm;      // hoehe, cos(gier), sin(gier), Tonmischung
layout(location = 5) in vec4 iZufall;    // Windphase, Breite, Hoehe, Neigung

uniform mat4  uViewProj;
uniform float uZeit;
uniform float uWind;
uniform vec2  uWindRichtung;

out vec3  vPos;
out vec3  vNormal;
out float vTon;
out float vKroneH;

void main() {
  float c = iForm.y, s = iForm.z;

  vec3 p = aPos;
  vec3 n = aNormal;

  // Breite und Hoehe je Baum leicht verstellen; die Normale zieht invers mit.
  p.xz *= iZufall.y;
  p.y  *= iZufall.z;
  n.xz /= iZufall.y;
  n.y  /= iZufall.z;

  // Neigung als Scherung: der Baum steht schief, der Fuss bleibt am Boden.
  p.x += p.y * iZufall.w;
  n.y -= n.x * iZufall.w;

  // Drehung um die Hochachse
  vec3 q = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  vec3 m = vec3(n.x * c - n.z * s, n.y, n.x * s + n.z * c);

  q *= iForm.x;

  /* Wind. Zwei Sinusse verschiedener Frequenz — eine reine Sinuswelle
   * pendelt sichtbar wie ein Metronom. Die Amplitude waechst quadratisch
   * mit der Hoehe: der Fuss steht still, nur die Krone geht. Die Phase
   * kommt aus der Weltposition, damit nicht der ganze Wald im Gleichtakt
   * kippt (und damit sie in jeder Aufnahme dieselbe ist). */
  float ph = iZufall.x * 6.2831853 + iPos.x * 0.213 + iPos.z * 0.171;
  float h = aExtra.x;
  float schwung = sin(uZeit * 0.62 + ph) * 0.66
                + sin(uZeit * 0.97 + ph * 1.7 + aExtra.y * 6.2831853) * 0.34;
  float amp = uWind * iForm.x * h * h;
  q.x += schwung * amp * uWindRichtung.x;
  q.z += schwung * amp * uWindRichtung.y;

  vPos = iPos + q;
  vNormal = normalize(m);
  vTon = iForm.w;
  vKroneH = aExtra.z;
  gl_Position = uViewProj * vec4(vPos, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;

in vec3  vPos;
in vec3  vNormal;
in float vTon;
in float vKroneH;

uniform vec3 uCam;
uniform vec3 uLicht;         // Richtung zur Sonne
uniform vec3 uSonnenfarbe;
uniform vec3 uBodenlicht;

uniform vec3 uSchattenA, uMitteA, uHellA;
uniform vec3 uSchattenB, uMitteB, uHellB;
uniform vec3 uDurchfarbe;

uniform float uKrone;        // 1 = Krone, 0 = Stamm
uniform float uKippung;
uniform float uDurch;
uniform vec3  uDunstfarbe;
uniform vec3  uDunst;        // x Staerke, y nah, z fern

out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLicht);

  vec3 dunkel = mix(uSchattenA, uSchattenB, vTon);
  vec3 mitte  = mix(uMitteA,    uMitteB,    vTon);
  vec3 hell   = mix(uHellA,     uHellB,     vTon);

  /* Die Normale wird zum Himmel gekippt, bevor das Licht darauf trifft.
   * Kronen in Genshin lesen sich von OBEN beleuchtet, auch wenn die Sonne
   * flach steht — ohne diese Kippung zerfaellt die Krone bei tiefer Sonne
   * in zwei Haelften und verliert ihre Form. */
  vec3 Nl = normalize(N + vec3(0.0, uKippung, 0.0));
  float ndl = dot(Nl, L);

  /* Zwei harte Stufen statt eines Verlaufs (GRAFIK-MODULE.md §0).
   * Die Flanken sind absichtlich schmal: bei 1600x900 und einer Krone von
   * rund 120 px steht die Kante auf 2 bis 3 px.
   *
   * Die Schwellen sind nachgemessen und nicht geraten. Der erste Versuch
   * stand bei 0,00 / 0,42 — damit lag die GANZE Krone auf der hellsten
   * Stufe und war eine flache blassgruene Scheibe. Bei Sonnenstand
   * (0,55 / 0,78 / 0,32) und 0,15 Himmelskippung laeuft ndl von -0,78 bis
   * +0,83; die Schwellen unten teilen das so, dass Unterseite und
   * abgewandte Flanke wirklich im dunklen Ton stehen. */
  float s1 = smoothstep(0.06, 0.20, ndl);
  float s2 = smoothstep(0.60, 0.72, ndl);
  vec3 col = mix(dunkel, mitte, s1);
  col = mix(col, hell, s2);

  /* Selbstverschattung der Krone: das untere Drittel liegt im Schatten der
   * oberen Ballen. Bewusst eine STUFE mit schmaler Flanke, kein Verlauf —
   * in landschaft_wiese_mittag_figur_2560 sitzt genau so eine Kante quer
   * durch die Krone. */
  float unten = smoothstep(0.22, 0.40, vKroneH);
  col *= mix(0.52, 1.0, mix(1.0, unten, uKrone));

  // Tagesfarbe, ohne die Stufen zu verwischen
  col *= uSonnenfarbe * 0.5 + 0.5;

  /* Durchleuchtung. Nicht ueber die ganze Krone, sondern dort, wo das
   * Blattwerk duenn ist — also am Rand (uebersetzt: Normale quer zum Blick)
   * und nur im Gegenlicht. Genau so sieht der Baum am rechten Rand von
   * goldene_stunde_grasland_2560 aus. */
  float gegen = pow(max(dot(V, -L), 0.0), 2.2);
  float rand  = pow(1.0 - max(dot(N, V), 0.0), 1.9);
  col += uDurchfarbe * gegen * (0.18 + 0.82 * rand) * uDurch * uKrone;

  // Bodenlicht von unten: sonst ist die Kronenunterseite ein schwarzes Loch.
  col += uBodenlicht * max(-N.y, 0.0) * 0.14;

  // Luftperspektive (siehe Kopf der Datei — gehoert spaeter nebel.js)
  float d = distance(uCam, vPos);
  col = mix(col, uDunstfarbe, uDunst.x * smoothstep(uDunst.y, uDunst.z, d));

  outColor = vec4(col, 1.0);
}`;

  /* =======================================================================
   * 5. Aufbau
   * ===================================================================== */

  const G = {                                   // alles, was der Typ besitzt
    prog: null,
    gruppen: [],                                // je Bauplan { krone, stamm, ... }
    gebaut: 0,                                  // Anzahl Stuecke, aus denen die
                                                // Instanzpuffer entstanden sind
    dreiecke: 0,
    uebersprungen: 0,
  };

  function netzHochladen(gl, netz) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, netz.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, netz.nor, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const eb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, eb);
    gl.bufferData(gl.ARRAY_BUFFER, netz.ext, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, netz.idx, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return { vao, count: netz.idx.length, dreiecke: netz.dreiecke };
  }

  /* Instanzattribute an ein bestehendes VAO haengen.
   * Aufbau je Instanz, 11 Gleitkommazahlen (Schrittweite 44 Byte):
   *   0..2  iPos     x, y, z
   *   3..6  iForm    hoehe, cos, sin, Ton
   *   7..10 iZufall  Windphase, Breite, Hoehe, Neigung           */
  const SCHRITT = 11 * 4;
  function instanzAnhaengen(gl, vao, puffer) {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, SCHRITT, 0);
    gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, SCHRITT, 12);
    gl.vertexAttribDivisor(4, 1);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, SCHRITT, 28);
    gl.vertexAttribDivisor(5, 1);
    gl.bindVertexArray(null);
  }

  function aufbau(gl, R) {
    G.prog = GRAFIK.programm(gl, VS, FS, 'baum');

    let dreiecke = 0;
    for (const plan of PLAENE) {
      const kn = kroneNetz(plan);
      const sn = stammNetz(plan);
      const krone = netzHochladen(gl, kn);
      const stamm = netzHochladen(gl, sn);
      const puffer = gl.createBuffer();
      instanzAnhaengen(gl, krone.vao, puffer);
      instanzAnhaengen(gl, stamm.vao, puffer);
      G.gruppen.push({ plan, krone, stamm, puffer, n: 0 });
      dreiecke = Math.max(dreiecke, kn.dreiecke + sn.dreiecke);
    }
    G.dreiecke = dreiecke;
  }

  /* =======================================================================
   * 6. Instanzen
   *
   * Alles, was einen Baum von seinem Nachbarn unterscheidet, kommt aus dem
   * Stueck, das KARTE geliefert hat. Diese Datei wuerfelt nichts.
   * ===================================================================== */

  const BOUNDS = (typeof WELT !== 'undefined' && WELT.bounds) ? WELT.bounds : 26;

  let gewarntInnen = false;

  function planFuer(s) {
    // Der Solitaer traegt das Bild und bekommt immer die breite Krone.
    if (s.rolle === 'solitaer') return 0;
    const v = (s.variante | 0) & 255;
    return v < 100 ? 0 : (v < 190 ? 1 : 2);
  }

  function instanzenBauen(gl, stuecke) {
    const listen = [[], [], []];
    G.uebersprungen = 0;

    for (const s of stuecke) {
      /* GDD 10 §69 — der Schleim ist die Figur. Ein Baum INNERHALB der Arena
       * wuerde ihn verdecken. karte.js setzt keinen dorthin; landet doch
       * einer dort, faellt er hier heraus statt das Bild zu kosten. Bewusst
       * console.warn und nicht console.error: ein fehlender Baum darf keine
       * Aufnahme rot faerben (siehe karte.js §4). */
      if (Math.abs(s.x) < BOUNDS && Math.abs(s.z) < BOUNDS) {
        G.uebersprungen++;
        if (!gewarntInnen) {
          gewarntInnen = true;
          console.warn('[baum] Baum innerhalb der Arena bei ('
            + s.x.toFixed(1) + ',' + s.z.toFixed(1) + ') uebersprungen — '
            + 'Ausstattung mit Krone gehoert nach draussen (GDD 10 §69).');
        }
        continue;
      }
      listen[planFuer(s)].push(s);
    }

    for (let g = 0; g < G.gruppen.length; g++) {
      const gr = G.gruppen[g];
      const liste = listen[g];
      gr.n = liste.length;
      if (!liste.length) continue;

      const d = new Float32Array(liste.length * 11);
      for (let i = 0; i < liste.length; i++) {
        const s = liste[i];
        const z = s.zufall || [0.5, 0.5, 0.5, 0.5];
        const o = i * 11;
        d[o] = s.x; d[o + 1] = s.y || 0; d[o + 2] = s.z;
        d[o + 3] = s.groesse;
        d[o + 4] = Math.cos(s.drehung || 0);
        d[o + 5] = Math.sin(s.drehung || 0);
        /* Ton in DREI Stufen statt stufenlos. Ein Wald aus lauter leicht
         * verschiedenen Gruentoenen sieht gepudert aus; Genshin hat wenige,
         * klar unterscheidbare Baumsorten nebeneinander. */
        d[o + 6] = Math.floor(z[0] * 3) * 0.5;
        d[o + 7] = z[1];                                  // Windphase
        d[o + 8] = 0.86 + 0.26 * z[2];                    // Breite
        d[o + 9] = 0.95 + 0.11 * z[3];                    // Hoehe
        d[o + 10] = (z[2] - 0.5) * 0.10;                  // Neigung
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, gr.puffer);
      gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    G.gebaut = stuecke.length;
  }

  /* =======================================================================
   * 7. Zeichnen
   * ===================================================================== */

  const _wr = (() => {
    const l = Math.hypot(WIND_RICHTUNG[0], WIND_RICHTUNG[1]) || 1;
    return new Float32Array([WIND_RICHTUNG[0] / l, WIND_RICHTUNG[1] / l]);
  })();
  const _dunst = new Float32Array([DUNST_STAERKE, DUNST_NAH, DUNST_FERN]);

  function farben(gl, u, a, b) {
    gl.uniform3fv(u.uSchattenA, a.schatten);
    gl.uniform3fv(u.uMitteA, a.mitte);
    gl.uniform3fv(u.uHellA, a.hell);
    gl.uniform3fv(u.uSchattenB, b.schatten);
    gl.uniform3fv(u.uMitteB, b.mitte);
    gl.uniform3fv(u.uHellB, b.hell);
  }

  function zeichnen(gl, R, ctx, stuecke) {
    if (!G.prog || !G.gruppen.length) return;
    if (G.gebaut !== stuecke.length) instanzenBauen(gl, stuecke);

    const li = ctx.licht;
    const p = G.prog, u = p.u;

    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.useProgram(p);
    gl.uniformMatrix4fv(u.uViewProj, false, ctx.viewProj);
    gl.uniform3fv(u.uCam, ctx.cam);
    gl.uniform3fv(u.uLicht, li.richtung);
    gl.uniform3fv(u.uSonnenfarbe, li.farbe);
    gl.uniform3fv(u.uBodenlicht, li.boden);
    gl.uniform3fv(u.uDurchfarbe, DURCHLICHT);
    gl.uniform3fv(u.uDunstfarbe, li.dunst);
    gl.uniform3fv(u.uDunst, _dunst);
    gl.uniform1f(u.uZeit, ctx.time);
    gl.uniform1f(u.uWind, WIND_STAERKE);
    gl.uniform2fv(u.uWindRichtung, _wr);

    /* Staemme zuerst: sie stecken oben in der Krone, und wer sie danach
     * zeichnet, arbeitet gegen die Tiefenpruefung statt mit ihr. */
    gl.uniform1f(u.uKrone, 0.0);
    gl.uniform1f(u.uKippung, 0.12);
    gl.uniform1f(u.uDurch, 0.0);
    farben(gl, u, STAMM, STAMM);
    for (const gr of G.gruppen) {
      if (!gr.n) continue;
      gl.bindVertexArray(gr.stamm.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, gr.stamm.count, gl.UNSIGNED_SHORT, 0, gr.n);
    }

    gl.uniform1f(u.uKrone, 1.0);
    gl.uniform1f(u.uKippung, HIMMEL_KIPPUNG);
    gl.uniform1f(u.uDurch, DURCH_STAERKE);
    farben(gl, u, KRONE_KUEHL, KRONE_WARM);
    for (const gr of G.gruppen) {
      if (!gr.n) continue;
      gl.bindVertexArray(gr.krone.vao);
      gl.drawElementsInstanced(gl.TRIANGLES, gr.krone.count, gl.UNSIGNED_SHORT, 0, gr.n);
    }

    gl.bindVertexArray(null);
  }

  /* =======================================================================
   * 8. Anmeldung
   *
   * schicht 20: Baeume sind das Groesste, was dieser Ordner zeichnet, und
   * stehen am weitesten hinten — sie kommen vor Bueschen, Steinen und
   * Laternen dran. Alles hier ist undurchsichtig und tiefengeprueft, die
   * Reihenfolge ist also eine Frage der Ordnung, nicht der Richtigkeit.
   * ===================================================================== */
  KARTE.typ('baum', {
    schicht: 20,
    aufbau,
    zeichnen,
  });

  /* Diagnose fuer die Konsole — kostet nichts und beantwortet die Frage,
   * die man beim Ansehen eines Bildes zuerst hat. */
  if (typeof window !== 'undefined') {
    window.BAUM_DIAGNOSE = () => ({
      bauplaene: G.gruppen.map(g => ({ name: g.plan.name, stueck: g.n,
        dreiecke: g.krone.dreiecke + g.stamm.dreiecke })),
      zeichenaufrufe: G.gruppen.filter(g => g.n).length * 2,
      uebersprungen: G.uebersprungen,
    });
  }

})();
