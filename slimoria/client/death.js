'use strict';

/* ---------------------------------------------------------------------------
 * Todesanimation (GDD 01 §50).
 *
 * BESITZER: Lane DEATH.
 *
 *   1. Form verlieren        2. stark zittern/verformen     3. platzen
 *   4. dunklere Pfütze       5. Augen schwimmen darin       6. Farbe tot
 *   7. Rücksetzung zum Friedhof
 *
 * Der Schleim fällt nicht um — er hat keine Knochen (§49). Er darf humorvoll
 * wirken, muss aber eindeutig "tot" vermitteln.
 *
 * Dramaturgie (§68: starke Bewegungsphasen statt gleichmäßigem Zerfließen):
 *
 *   ANSCHWELLEN  Der Innendruck steigt, das Formgedächtnis gibt nach. Er wird
 *                praller und höher als im Leben — das ist der Anlauf, ohne den
 *                das Platzen unmotiviert wirkt.
 *   BEBEN        Krämpfe: der ganze Körper staucht und streckt sich im Takt,
 *                die Oberfläche kocht. In der Silhouette sichtbar, nicht nur
 *                als Kräuseln auf der Haut.
 *   PLATZEN      Ein Bild, das man nicht übersehen kann: die Masse fliegt
 *                radial auseinander, Spritzer fliegen weg und klatschen auf
 *                den Boden.
 *   ZERLAUFEN    Was übrig bleibt, sackt zur Pfütze — flach, aber niemals
 *                platt (§5: die Blob-Identität geht nie verloren). Sie behält
 *                eine niedrige Kuppel, in der die Augen liegen können.
 *   LIEGEN       Die Pfütze schwappt träge. Weil die Masse schwappt und der
 *                Kopf langsam wegdriftet, wandern die Augen sichtbar darin
 *                herum — sie schwimmen, weil der Körper sich bewegt, nicht
 *                weil sie animiert wären (§66).
 *
 * Nichts hier setzt Punktpositionen. Alles läuft über Deform und über die
 * Ruheform-Parameter — der Körper entscheidet selbst, wie er reagiert.
 * ------------------------------------------------------------------------- */

const Tod = (() => {
  let aktiv = false;
  let phase = '';
  let t = 0;
  let pfuetze = 0;          // 0..1, wie weit der Körper zur Pfütze zerlaufen ist
  let nass = 0;             // 0..1, wie stark der Boden bereits eingesaut ist
  let tot = 0;              // 0..1, wie weit die Farbe schon gestorben ist
  let gesichert = null;     // Formparameter vor dem Tod
  let mitte = { x: 0, z: 0 };
  let blick = 0;            // Blickrichtung im Moment des Todes
  let spritzer = [];        // fliegende und liegende Tropfen vom Platzen
  let augen = null;         // die zwei Massepunkte, auf denen die Augen treiben
  let augenAuf = 0;         // 0..1, wie weit die Augen aus dem Körper gelöst sind

  const DAUER = { zittern: 0.95, platzen: 0.35, zerlaufen: 1.5, liegen: 1.2 };

  /* Ruhe-Kuppel der Leiche. Referenz Slime Rancher: selbst die extremsten
   * Pfützenformen bleiben eine breite flache Kuppel mit dünnem Saum — Breite
   * zu Höhe etwa 2:1 bis 2,6:1 in der Ansicht, niemals eine Scheibe ohne
   * Höhe. Darum ein ausdrücklicher Höhenboden statt "immer flacher". */
  const PFUETZE_HOCH = 0.36;   // wirksames squat der Pfütze
  const PFUETZE_BREIT = 1.55;  // wirksames sag  der Pfütze — der breite Saum

  /* Wohin die Farbe stirbt: entsättigt, abgedunkelt, ein Stich ins Fahle. */
  const TOT_MISCH = [0.050, 0.062, 0.052];
  const TOT_REST = 0.22;       // wieviel Eigenfarbe überlebt

  let palRef = null, palOrig = null;
  let rRef = null, eingehaengt = false;

  /* --- Farbe ------------------------------------------------------------- */

  function palAnfassen(G) {
    if (typeof FACTIONS === 'undefined') return;
    const p = FACTIONS[G.spieler.faction];
    if (!p) return;
    palRef = p;
    palOrig = {};
    for (const k of ['deep', 'mid', 'light', 'trail']) palOrig[k] = p[k].slice();
  }

  function palSetzen(f) {
    if (!palRef) return;
    for (const k of ['deep', 'mid', 'light', 'trail']) {
      const o = palOrig[k], z = palRef[k];
      for (let i = 0; i < 3; i++) {
        z[i] = o[i] * (1 - f) + (o[i] * TOT_REST + TOT_MISCH[i]) * f;
      }
    }
  }

  function palLoslassen() {
    if (palRef && palOrig) {
      for (const k of ['deep', 'mid', 'light', 'trail']) {
        for (let i = 0; i < 3; i++) palRef[k][i] = palOrig[k][i];
      }
    }
    palRef = null; palOrig = null;
  }

  /* --- Ruheform ------------------------------------------------------------
   * updateRestShape rechnet den Stand-Slump noch einmal obendrauf. Wir wollen
   * aber die tatsächliche Sollform steuern, nicht eine, die je nach Standzeit
   * anders ausfällt — also rechnen wir den Slump heraus. */
  function form(P, hoch, breit, slump) {
    P.squat = hoch / Math.max(0.2, 1 - 0.42 * slump);
    P.sag = Math.max(0.04, breit - 0.75 * slump);
  }

  function mische(a, b, f) { return a + (b - a) * f; }

  /* --- Spritzer ------------------------------------------------------------
   * Der Beweis, dass er geplatzt ist und nicht bloß umgekippt: Masse verlässt
   * den Körper und landet daneben. Richtungen und Tempi sind fest abgeleitet,
   * damit jede Aufnahme identisch ist (ARCHITEKTUR §2). */
  function spritzerWerfen(b, P) {
    spritzer = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996;                       // goldener Winkel
      const s = 0.7 + 0.06 * ((i * 7) % 11);
      /* Flache, weite Bögen. Steil geworfene Tropfen stehen zu lange in der
       * Luft und wirken wie Insekten statt wie Spritzer. */
      const vh = 5.6 * s;
      const r = P.radius * (0.15 + 0.022 * ((i * 3) % 5));
      spritzer.push({
        x: b.cx + Math.cos(a) * P.radius * 0.45,
        y: b.cy + P.radius * 0.15,
        z: b.cz + Math.sin(a) * P.radius * 0.45,
        vx: Math.cos(a) * vh,
        vy: 2.6 + 0.22 * ((i * 5) % 7),
        vz: Math.sin(a) * vh,
        r, liegt: false, alter: 0,
      });
    }
  }

  /* --- Augen ---------------------------------------------------------------
   * Beim Platzen lösen sich die Augen aus dem Gesicht und treiben von da an
   * auf zwei festen Massepunkten der Pfütze. Sie schwimmen also, weil die
   * Masse unter ihnen schwappt — nicht weil sie eine eigene Animation hätten
   * (§66). Nötig ist das, weil das tote Gel zu dunkel geworden ist: die
   * eingebetteten Augen des Renderers wären darin nicht mehr zu sehen. */
  function augenLoesen(b, s) {
    /* Weit auseinander und weit oben gewählt: sonst enden beide Augen als
     * Paar auf demselben Randstück der Pfütze und kleben dort fest. */
    const dirs = [-1.05, 1.05].map(y => ({
      x: Math.cos(s.facing + y) * 0.62,
      y: 0.78,
      z: Math.sin(s.facing + y) * 0.62,
    }));
    augen = dirs.map(d => {
      let best = 0, bestD = -2;
      for (let i = 0; i < b.n; i++) {
        const k = i * 3;
        const dd = b.base[k] * d.x + b.base[k + 1] * d.y + b.base[k + 2] * d.z;
        if (dd > bestD) { bestD = dd; best = i; }
      }
      return best;
    });
  }

  function spritzerSchritt(dt, P) {
    for (const s of spritzer) {
      if (s.liegt) { s.alter += dt; continue; }
      s.vy -= P.gravity * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y <= s.r * 0.6) { s.y = s.r * 0.6; s.liegt = true; }
    }
  }

  /* --- Zeichnen ------------------------------------------------------------
   * renderer.js ist gesperrt; die Pfütze kommt über R.extras (ARCHITEKTUR §5).
   * Sie liegt am Boden UND bleibt liegen — sie ist der bleibende Beweis. */
  function einhaengen() {
    if (eingehaengt) return;
    const R = window.SLIMORIA && window.SLIMORIA.R;
    if (!R || !R.extras) return;
    rRef = R;
    eingehaengt = true;
    R.extras.push({ name: 'todes-pfuetze', order: 5, draw: zeichnen });
  }

  function zeichnen(gl, ctx) {
    if (nass <= 0.001 && !spritzer.length) return;
    const R = rRef, P = ctx.params, vp = ctx.viewProj;
    const d = ctx.pal.deep;
    // Deutlich dunkler als der (bereits sterbende) Körper: die Pfütze muss
    // sich vom Schleim darüber absetzen, sonst sieht man nur einen Fleck.
    const dunkel = [d[0] * 0.45 + 0.010, d[1] * 0.45 + 0.014, d[2] * 0.45 + 0.016];
    const rand = [d[0] * 0.9 + 0.02, d[1] * 0.9 + 0.03, d[2] * 0.9 + 0.04];

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);

    const rad = P.radius * (1.15 + 1.55 * nass);
    R.drawDecal(mitte.x, mitte.z, rad * 1.34, dunkel, 0.34 * nass, false, vp);
    R.drawDecal(mitte.x, mitte.z, rad, dunkel, 0.62 * nass, false, vp);
    R.drawDecal(mitte.x, mitte.z, rad * 1.06, rand, 0.30 * nass, true, vp);

    for (const s of spritzer) {
      if (!s.liegt) continue;
      const w = Math.min(1, s.alter * 3.2);
      R.drawDecal(s.x, s.z, s.r * (1.9 + 1.5 * w), dunkel, 0.55, false, vp);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);

    for (const s of spritzer) {
      if (s.liegt) continue;
      const r = s.r;
      R.drawProp(R.propMesh, M4.trs(s.x, s.y, s.z, r, r * 1.15, r),
                 normalMat(r, r * 1.15, r), rand, 0.6, 0.05, ctx.cam, vp);
    }

    /* Die Augen liegen auf der Pfütze, halb eingesunken, und werden vom
     * schwappenden Gel herumgetragen. */
    if (augen && augenAuf > 0.02) {
      const b = ctx.game.slime.body;
      const re = P.radius * 0.21 * (0.75 + 0.25 * augenAuf);
      for (const i of augen) {
        const k = i * 3;
        const nx = b.normals[k], ny = b.normals[k + 1], nz = b.normals[k + 2];
        const ex = b.pos[k] + nx * re * 0.25;
        const ey = Math.max(re * 0.55, b.pos[k + 1] + ny * re * 0.25);
        const ez = b.pos[k + 2] + nz * re * 0.25;
        R.drawProp(R.propMesh, M4.trs(ex, ey, ez, re, re * 0.86, re),
                   normalMat(re, re * 0.86, re), [0.93, 0.96, 0.98], 0.8, 0.10,
                   ctx.cam, vp);
        // Pupille zur Kamera gedreht: ein Auge, dessen Pupille man nicht
        // sieht, liest sich als Blase.
        let px = ctx.cam[0] - ex, py = ctx.cam[1] - ey, pz = ctx.cam[2] - ez;
        const pl = Math.hypot(px, py, pz) || 1;
        px /= pl; py /= pl; pz /= pl;
        const pr = re * 0.46;
        R.drawProp(R.propMesh,
                   M4.trs(ex + px * re * 0.62, ey + py * re * 0.62, ez + pz * re * 0.62,
                          pr, pr, pr),
                   normalMat(pr, pr, pr), [0.04, 0.07, 0.11], 1.0, 0.15, ctx.cam, vp);
      }
    }
  }

  /* --- Ablauf -------------------------------------------------------------- */

  function zuruecksetzen(G) {
    aktiv = false; phase = ''; t = 0; pfuetze = 0; nass = 0; tot = 0;
    spritzer = []; augen = null; augenAuf = 0;
    palSetzen(0); palLoslassen();
    if (gesichert && G) { Object.assign(G.params, gesichert); gesichert = null; }
  }

  function starten(G) {
    aktiv = true; phase = 'zittern'; t = 0; pfuetze = 0; nass = 0; tot = 0;
    spritzer = []; augen = null; augenAuf = 0;
    gesichert = {
      shape: G.params.shape, stiffen: G.params.stiffen, pressure: G.params.pressure,
      squat: G.params.squat, sag: G.params.sag, jiggleDamp: G.params.jiggleDamp,
      adhesion: G.params.adhesion, viscosity: G.params.viscosity,
    };
    mitte.x = G.slime.body.cx; mitte.z = G.slime.body.cz;
    blick = G.slime.facing;
    palAnfassen(G);
    einhaengen();
    G.slime.target = null;
    G.slime.mouth = 0.7;
  }

  function wechsel(neu) { phase = neu; t = 0; }

  function aktualisieren(G, dt) {
    if (!aktiv) return;
    const b = G.slime.body, P = G.params, s = G.slime;
    t += dt;
    spritzerSchritt(dt, P);

    if (phase === 'zittern') {
      const f = t / DAUER.zittern;

      /* Erst aufblähen, dann die Form verlieren: das Formgedächtnis wird
       * weich, der Innendruck steigt weiter. Er wird praller und höher als
       * im Leben — Anticipation für das Platzen (§68). */
      const auf = Math.min(1, t / 0.30);
      P.shape = gesichert.shape * (1 - 0.62 * f * f);
      P.stiffen = gesichert.stiffen * (1 - 0.9 * f);
      P.pressure = gesichert.pressure * (1 + 1.15 * f);
      P.jiggleDamp = gesichert.jiggleDamp * 0.7;
      form(P, mische(gesichert.squat, 1.12, auf) - 0.12 * f * f,
              mische(gesichert.sag, 0.12, auf) + 0.10 * f * f, s.slump);

      /* Krämpfe: der ganze Körper staucht und streckt sich im Takt. Das ist
       * der Teil, den man in der Silhouette sieht — das Kräuseln der Haut
       * allein verschwindet bei Spielkameradistanz.
       * Alles läuft über `stauchen`: das verformt um den Schwerpunkt herum
       * und schiebt die Leiche nicht durch die Arena. Ein Impuls auf den
       * ganzen Körper würde genau das tun. */
      const takt = Math.sin(G.zeit * 17.5);
      Deform.stauchen(b, 0, 1, 0, 1 + 0.38 * f * takt, 32 * f, dt);
      /* Zwei Zitterfrequenzen übereinander: eine allein sieht aus wie ein
       * sauber pulsierender Ballon, zwei ergeben die unruhigen Beulen, die
       * man von einem Körper erwartet, der die Form verliert. */
      Deform.zittern(b, 18 + 260 * f * f, 23 + 10 * f, G.zeit, dt);
      Deform.zittern(b, 120 * f * f, 8.5, G.zeit + 1.7, dt);
      // Zusätzlich ein Krampf quer dazu, auf einer wandernden Achse: der
      // Klumpen wirft sich hin und her, statt nur zu pulsieren.
      const r = G.zeit * 5.5;
      Deform.stauchen(b, Math.cos(r), 0, Math.sin(r),
                      1 - 0.26 * f * Math.sin(G.zeit * 21), 26 * f, dt);
      /* Und ein echtes Rütteln der ganzen Masse. Zwei feste Achsen mit
       * unterschiedlicher Frequenz — reine Sinus, deren Mittel null ist, und
       * hoch genug, dass der Ausschlag im Zentimeterbereich bleibt: der
       * Klumpen zappelt auf der Stelle, statt durch die Arena zu wandern. */
      const zapp = 190 * f * f * dt;
      Deform.impuls(b, 1, 0, 0, Math.sin(G.zeit * 37) * zapp);
      Deform.impuls(b, 0, 0, 1, Math.sin(G.zeit * 43.7) * zapp);

      s.mouth = 0.45 + 0.5 * Math.abs(Math.sin(G.zeit * 13)) * f;
      if (t >= DAUER.zittern) wechsel('platzen');
      return;
    }

    if (phase === 'platzen') {
      if (t <= dt * 1.5) {
        // Der eine Moment, den man sehen muss.
        mitte.x = b.cx; mitte.z = b.cz;
        /* Radial aufreißen — vor allem in die Breite. Der Aufwärtsanteil von
         * `platzen` wirkt auf JEDEN Punkt, ist also netto ein Startschuss
         * nach oben: ohne Gegenimpuls schießt die Leiche meterhoch in die
         * Luft und die Kamera fährt hinterher. Der Gegenimpuls nimmt den
         * gemeinsamen Anteil weg und lässt nur den Unterschied zwischen oben
         * und unten stehen — oben spritzt es weg, unten klatscht es auf. */
        Deform.platzen(b, 14.5, 0.52);
        Deform.impuls(b, 0, -1, 0, 5.3);
        spritzerWerfen(b, P);
        augenLoesen(b, s);
        P.shape = gesichert.shape * 0.05;
        P.stiffen = 0;
        P.pressure = gesichert.pressure * 0.42;
        P.jiggleDamp = 3.4;
        P.viscosity = Math.max(gesichert.viscosity, 24);
        P.adhesion = gesichert.adhesion * 2.2;
        G.slime.mouth = 1;
        if (window.UI && UI.hinweis) UI.hinweis('Du bist geplatzt.');
      }
      const f = Math.min(1, t / DAUER.platzen);
      /* Die geplatzte Hülle darf sich nicht wieder zur Kugel zusammenziehen —
       * sie sackt sofort in Richtung Pfütze. Im ersten Sechstel wird sie
       * zusätzlich auseinandergetrieben: das ist der Klatscher, der das
       * Platzen in einem einzigen Bild lesbar macht (§68). */
      form(P, mische(0.78, 0.54, f), mische(0.30, 1.00, f), s.slump);
      if (t < 0.14) Deform.stauchen(b, 0, 1, 0, 0.6, 34, dt);
      nass = Math.max(nass, 0.35 * f);
      tot = Math.min(1, 0.45 * f);
      palSetzen(tot);
      augenAuf = Math.max(augenAuf, f);
      s.blink = 0.3;              // das Gesicht des Körpers ist erloschen
      if (t >= DAUER.platzen) wechsel('zerlaufen');
      return;
    }

    if (phase === 'zerlaufen') {
      const f = Math.min(1, t / DAUER.zerlaufen);
      pfuetze = f;
      nass = Math.max(nass, 0.35 + 0.65 * Math.min(1, f * 1.35));
      tot = Math.min(1, 0.45 + 0.55 * Math.min(1, f * 1.6));
      palSetzen(tot);

      /* Zur Pfütze zerlaufen: flach und breit, aber mit Höhenboden. Ein
       * Pfannkuchen wäre ein Regelbruch (§5) und die Augen hätten nichts
       * mehr, worin sie liegen könnten. */
      form(P, mische(0.54, PFUETZE_HOCH, f), mische(1.00, PFUETZE_BREIT, f), s.slump);
      /* Das Formgedächtnis kommt schwach zurück: nur so hält die Pfütze ihre
       * niedrige Kuppel, statt immer weiter auseinanderzulaufen. */
      P.shape = gesichert.shape * mische(0.05, 0.5, f);
      P.pressure = gesichert.pressure * mische(0.42, 0.6, f);
      P.jiggleDamp = mische(3.4, 1.5, f);
      P.adhesion = gesichert.adhesion * mische(2.2, 1.15, f);

      // Nur am Anfang nachhelfen: der Rest ist Schwerkraft auf weicher Masse.
      Deform.stauchen(b, 0, 1, 0, 0.9, 7 * (1 - f), dt);
      /* Die zerlaufende Masse sammelt sich dort, wo er geplatzt ist. Schwach
       * genug, dass es wie Fließen aussieht und nicht wie ein Magnet. */
      Deform.ziehenZu(b, mitte.x, P.radius * 0.3, mitte.z, 2.2, dt);
      augenAuf = 1; s.blink = 0.3;
      s.mouth = Math.max(0, 0.9 - 1.4 * f);

      if (t >= DAUER.zerlaufen) wechsel('liegen');
      return;
    }

    if (phase === 'liegen') {
      pfuetze = 1; nass = 1; tot = 1;
      palSetzen(1);
      form(P, PFUETZE_HOCH, PFUETZE_BREIT, s.slump);

      /* Die Pfütze ist nicht tot-still: sie schwappt träge in sich. Weil die
       * Masse schwappt und der Kopf dabei langsam wegdriftet, wandern die
       * Augen sichtbar darin herum (§50 "Augen schwimmen"). Bewegt wird die
       * Masse, nicht das Auge (§66). */
      const w = t * 2.2;
      /* Das Schwappen klingt ab: eine Leiche kommt zur Ruhe, sie pumpt nicht
       * dauerhaft weiter. */
      const ruhe = Math.max(0.25, 1 - t / DAUER.liegen);
      Deform.stauchen(b, Math.cos(w), 0, Math.sin(w), 1 - 0.16 * ruhe, 16 * ruhe, dt);
      Deform.zittern(b, 9 * ruhe, 3.1, G.zeit, dt);
      Deform.ziehenZu(b, mitte.x, P.radius * 0.3, mitte.z, 1.4, dt);
      /* Der Kopf treibt in der Pfütze hin und her, statt sich zu drehen: die
       * Augen wandern sichtbar durch die Masse, verschwinden aber nicht auf
       * der Rückseite — sonst sieht man im halben Ablauf gar keine Augen. */
      s.facing = blick + 1.15 * Math.sin(t * 1.35);
      s.fx = Math.cos(s.facing); s.fz = Math.sin(s.facing);
      augenAuf = 1; s.blink = 0.3;
      s.mouth = 0.06;

      if (t >= DAUER.liegen) {
        aktiv = false; phase = '';
        Object.assign(P, gesichert);
        gesichert = null;
        pfuetze = 0; nass = 0; tot = 0;
        spritzer = []; augen = null; augenAuf = 0;
        palSetzen(0); palLoslassen();
        SPIEL.respawn();
      }
    }
  }

  return {
    get aktiv() { return aktiv; },
    get phase() { return phase; },
    get pfuetze() { return pfuetze; },
    starten, aktualisieren, zuruecksetzen,
  };
})();

window.Tod = Tod;
