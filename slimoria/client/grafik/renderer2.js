'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — zweiter Renderpfad. Pipeline und Durchgaenge.
 *
 * Aktiv nur mit `?renderer=2` in der Adresse oder `window.RENDERER_WAHL === 2`
 * vor dem Aufbau (game.js Zeile 58–62). `client/renderer.js` bleibt unberuehrt:
 * sie traegt die laufenden Blindvergleiche des Gauntlets, und die duerfen sich
 * unter der Beurteilung nicht veraendern.
 *
 * WAS DIESE DATEI IST
 * Sie ist die Buehne, nicht das Stueck. Sie kann ALLES, was renderer.js kann —
 * Himmel, Boden, Hindernisse, Kreaturen, Gesicht, Bodendekale, Schleim,
 * Debugpunkte, die Erweiterungen der Spiel-Lanes — und zwar mit denselben
 * Verfahren und denselben Zahlen. Das ist Absicht: beim Umschalten darf nichts
 * verschwinden, und die zehn Grafikmodule brauchen ein vollstaendiges Bild, in
 * das sie sich einzeln hineinsetzen koennen. Verschoenert wird hier nichts;
 * das ist die Arbeit der Module.
 *
 * ---------------------------------------------------------------------------
 * SONDIERUNG DER FAEHIGKEITEN
 *
 * Gemessen im kopflosen Chrome mit ANGLE/SwiftShader, so wie tools/capture.mjs
 * aufnimmt (`--use-angle=swiftshader --use-gl=angle`), 2026-08-19, durch
 * `GRAFIK.faehigkeiten(gl)` weiter unten in dieser Datei. Nicht uebernommen,
 * sondern nachgemessen — der Plan behauptet diese Werte, verlassen sollte sich
 * darauf niemand ohne Gegenprobe.
 *
 *   WebGL-Fassung             WebGL 2.0 (OpenGL ES 3.0 Chromium)
 *   GLSL                      WebGL GLSL ES 3.00
 *   Zeichner                  ANGLE (Google, Vulkan 1.3.0
 *                             (SwiftShader Device (Subzero)), SwiftShader driver)
 *   EXT_color_buffer_float    VORHANDEN
 *   EXT_float_blend           VORHANDEN
 *   OES_texture_float_linear  VORHANDEN
 *   EXT_texture_filter_anisotropic VORHANDEN
 *   EXT_disjoint_timer_query_webgl2 VORHANDEN
 *   RGBA16F als FBO-Ziel      VOLLSTAENDIG (FRAMEBUFFER_COMPLETE)
 *   RGBA32F als FBO-Ziel      VOLLSTAENDIG
 *   DEPTH_COMPONENT24-Textur  VOLLSTAENDIG
 *   DEPTH_COMPONENT32F-Textur VOLLSTAENDIG
 *   MAX_SAMPLES               4
 *   MSAA RGBA8                [4]
 *   MSAA RGBA16F              [4]
 *   MSAA DEPTH_COMPONENT24    [4]
 *   MAX_DRAW_BUFFERS          6
 *   MAX_COLOR_ATTACHMENTS     6
 *   MAX_TEXTURE_SIZE          8192
 *   MAX_3D_TEXTURE_SIZE       2048
 *   MAX_VERTEX_ATTRIBS        16
 *   MAX_TEXTURE_IMAGE_UNITS   32
 *   MAX_VARYING_COMPONENTS    124
 *
 * Fazit fuer die zehn Bausteine: an einer WebGL2-Grenze scheitert nichts aus
 * PHASE-GRAFIK-PLAN.md. Die Schattenkarte (G8, DEPTH_COMPONENT24 als Textur),
 * die HDR-Kette samt Bloom (G11, RGBA16F mit linearer Filterung und 4x MSAA
 * ueber `renderbufferStorageMultisample` + `blitFramebuffer`) und ein G-Puffer
 * sind verfuegbar. Was scheitert, scheitert an Kosten oder am Stil — nicht an
 * der Hardware.
 *
 * Zwei Abweichungen von den Zahlen in PHASE-GRAFIK-PLAN §0, gemessen statt
 * uebernommen: MAX_DRAW_BUFFERS ist 6, nicht 8 (fuer einen G-Puffer immer noch
 * reichlich), und die MSAA-Liste meldet nur die eine Stufe 4 statt [4,2,1] —
 * wer 2x will, bekommt es nicht. Beides ist fuer den Plan folgenlos, aber wer
 * `SAMPLES = 2` fest verdrahtet, bekommt einen unvollstaendigen Framebuffer.
 * Die Werte stehen zur Laufzeit in `R.faehigkeiten` — sie ABFRAGEN, nicht
 * diesen Kommentar abschreiben: er ist eine Momentaufnahme einer Maschine.
 *
 * ACHTUNG bei MSAA: `{antialias:true}` gilt NUR fuer den Standardpuffer. Wer
 * die Szene nach einem eigenen FBO umleitet und das vergisst, verliert die
 * vorhandene Kantenglaettung stillschweigend. `R.faehigkeiten` steht deshalb
 * jedem Modul zur Laufzeit zur Verfuegung.
 *
 * ---------------------------------------------------------------------------
 * ORDNUNGEN — wer wann drankommt
 *
 * Module werden nach `ordnung` aufsteigend gerufen (klein = frueh). Die neun
 * eingebauten Grundzuege liegen auf festen Ordnungen:
 *
 *   10 himmel · 20 boden · 30 hindernisse · 40 kreaturen · 45 gesicht ·
 *   50 dekale · 58 gelschale · 60 gel · 88 punkte (nur bei scene.debug) ·
 *   90 extras
 *
 * DIE TIEFENORDNUNG — warum 58 dazwischensteht
 *
 * Bis 50 ist alles UNDURCHSICHTIG und schreibt Tiefe: Boden, Gras, Felsen,
 * Ausstattung, Kreaturen, Gesicht, Bodendekale. Ab 60 ist der Schleim
 * DURCHSCHEINEND und schreibt keine Tiefe — er kann den Hintergrund also
 * nicht verdecken, sondern nur einfaerben, und was hinter ihm liegt, bleibt
 * zu einem Drittel stehen. Bei Gras ist dieses Drittel als eigener
 * Gegenstand lesbar: die Halme standen mitten im Koerper.
 *
 * Dazwischen liegt deshalb 58, `gelschale`: die abgewandte Seite der Huelle,
 * undurchsichtig und mit Tiefenschreiben. Sie verdeckt, was HINTER dem
 * Koerper liegt, und laesst stehen, was DARIN liegt — ein gefressener Gegner
 * ist naeher als die Rueckwand und besteht den Tiefentest (GDD 01 §28).
 * Wer den Schleim ersetzt und selbst verdecken will, nimmt
 * `ersetzt: ['gel', 'gelschale']`.
 *
 * Ein Modul VERDRAENGT einen Grundzug, wenn es GENAUSO HEISST (`gel.js`
 * meldet 'gel' an und ersetzt damit den eingebauten Schleim) oder wenn es
 * `ersetzt: 'boden'` bzw. `ersetzt: ['boden','dekale']` traegt. `karte`,
 * `props`, `terrain`, `schleim` und `dekal` sind als abweichende Namen
 * eingetragen. `ersetzt: false` schaltet die Namensregel ab.
 * Ohne Verdraengung zeichnet ein Modul ZUSAETZLICH — dann steht am Ende
 * beides im Bild, und das ist fast nie gemeint.
 *
 * Empfohlene Belegung (die Zahl entscheidet nur die Reihenfolge, nicht was
 * ersetzt wird):
 *
 *    0   licht.js       Lichtmodell, Tagesgang. Fuellt ctx.licht. Zeichnet nichts.
 *    5   schatten.js    Schattenkarte rendern (eigenes Ziel), legt ctx.schatten ab
 *   10   himmel.js      verdraengt 'himmel'
 *   20   boden.js       verdraengt 'boden'
 *   25   gras.js        instanzierte Halme, zeichnet zusaetzlich auf den Boden
 *   30   karte.js       verdraengt 'hindernisse'  (props/*.js haengen daran)
 *   40   (Kreaturen)    Grundzug; rampe.js/kontur.js liefern hierfuer Bausteine
 *   45   gesicht.js     verdraengt 'gesicht'
 *   50   (Bodendekale)  Grundzug
 *   58   (Gelrueckwand) Grundzug — verdeckt, was hinter dem Koerper liegt
 *   60   gel.js         verdraengt 'gel'
 *   70   glanz.js …     Aufsaetze auf dem Gel, zeichnen zusaetzlich
 *   80   nebel.js       Bildschirmdurchgang ueber die fertige Szene
 *   88   (Debugpunkte)  Grundzug
 *   90   (Alt-Erweiterungen) R.extras aus combat.js, death.js, eat.js,
 *                       charakter.js — dieselbe Stelle wie in renderer.js
 *   95   post.js        Tonemapping, Schwarzhub, Bloom, Dither. Immer zuletzt.
 *
 * Wer eine Zwischenstufe braucht, nimmt eine Zahl dazwischen. Bei GLEICHER
 * Ordnung kommt der Grundzug zuerst und das Modul darauf; unter mehreren
 * Modulen gleicher Ordnung entscheidet die Anmeldereihenfolge, und die haengt
 * an grafik/laden.js — darauf sollte sich niemand verlassen.
 *
 * ---------------------------------------------------------------------------
 * WAS IN ctx STEHT
 *
 *   camera        G.kamera: { eye, viewProj, invViewProj, yaw, pitch, dist,
 *                 tx, ty, tz, follow } — dasselbe Objekt, nicht eine Kopie
 *   cam           camera.eye, Float32Array(3)      \  Kurzformen, weil jeder
 *   viewProj      camera.viewProj, Float32Array(16) > Shader sie braucht
 *   invViewProj   camera.invViewProj               /
 *   time          Sekunden seit Szenenstart, deterministisch (G.zeit)
 *   params        PARAMS aus tuning.js — params.radius ist die Koerpergroesse
 *   game          G: spieler, kreaturen, zielId, phase, bestiarium …
 *   slime         G.slime: body, trail, target, blink, mouth, look, fx/fz
 *   surface       die unterteilte Huelle: { positions, normals, indices }
 *   welt / world  WELT aus world.js: bounds, obstacles, spawns, friedhof
 *                 (beide Namen, weil renderer.js den Alt-Erweiterungen
 *                 `world` gibt und der Vertrag `welt` nennt)
 *   pal           Fraktionspalette: { deep, mid, light, trail }
 *   faction       'eldoran' | 'ravok'
 *   licht         { richtung, farbe, himmel, boden, ambient, dunst, zenit,
 *                   staerke, tageszeit } — Vorgabe unten, licht.js ueberschreibt
 *   ziel          aktuelles Renderziel: { fbo, breite, hoehe, hdr }
 *   view          ANSICHT: { w, h, pw, ph }
 *   breite/hoehe  Geraetepixel des Ziels (= view.pw/ph)
 *   debug         true, wenn die Massepunkte gezeichnet werden sollen
 *   regler        R.regler: { modulname: { key: wert } } aus den regler-Listen
 *   faehigkeiten  R.faehigkeiten, die Sondierung von oben
 *   szene         das ganze Szenenobjekt aus game.js, fuer Notfaelle
 *
 * Zusaetzlich am Renderer selbst (R):
 *   R.gl R.canvas R.pfad(=2) R.light R.extras R.regler R.faehigkeiten
 *   R.propMesh (Icosphere 2) R.boxMesh R.quadMesh R.slimeMesh R.vollbild
 *   R.slime R.solid R.ground R.himmel R.decal — die fuenf Grundprogramme
 *   R.drawProp(mesh, model, nmat, farbe, gloss, emissive, cam, vp)
 *   R.drawDecal(x, z, radius, farbe, alpha, ring, vp)
 *   R.zielBinden(ziel) R.grundzustand() R.bildschirm R.grundzuege
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4): kein Math.random, kein Date, kein
 * performance.now — weder hier noch in einem Modul. Zeit ausschliesslich ueber
 * `ctx.time`.
 * ------------------------------------------------------------------------- */

(function () {

  /* ==========================================================================
   * 0. Register
   *
   * Wortgleich mit dem Block in glsl.js. Beide Dateien legen es an, falls es
   * fehlt — damit haengt keine von der Ladereihenfolge der anderen ab.
   * ======================================================================== */
  const GRAFIK = window.GRAFIK || (window.GRAFIK = (function () {
    const R = {
      _module: [],
      _bausteine: Object.create(null),
      _klagen: Object.create(null),
      modul(m) {
        if (!m || typeof m !== 'object') throw new Error('GRAFIK.modul: kein Objekt');
        if (!m.name) throw new Error('GRAFIK.modul: Modul ohne name');
        const alt = R._module.findIndex(x => x.name === m.name);
        if (alt >= 0) {
          console.warn('GRAFIK: Modul "' + m.name + '" war schon angemeldet — ersetzt.');
          R._module.splice(alt, 1);
        }
        if (m.ordnung === undefined || m.ordnung === null) m.ordnung = 50;
        m.aufgebaut = false;
        m.aus = false;
        m.wert = Object.create(null);
        R._module.push(m);
        return m;
      },
      module() {
        return R._module.slice().sort((a, b) => (a.ordnung || 0) - (b.ordnung || 0));
      },
      baustein(name) {
        if (Array.isArray(name)) return name.map(n => R.baustein(n)).join('\n');
        if (arguments.length > 1) {
          return Array.prototype.slice.call(arguments).map(n => R.baustein(n)).join('\n');
        }
        const s = R._bausteine[name];
        if (s === undefined) {
          if (!R._klagen['b:' + name]) {
            R._klagen['b:' + name] = 1;
            console.error('GRAFIK.baustein: unbekannter Baustein "' + name + '".');
          }
          return '\n/* fehlender Baustein: ' + name + ' */\n';
        }
        return s;
      },
      bausteinSetzen(name, text) {
        if (typeof name !== 'string' || typeof text !== 'string') {
          throw new Error('GRAFIK.bausteinSetzen(name, text): beides Zeichenketten');
        }
        R._bausteine[name] = text;
        return text;
      },
      bausteine() { return Object.keys(R._bausteine).sort(); },
    };
    return R;
  })());

  const klemm = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  /* ==========================================================================
   * 1. Werkzeug fuer die Module — GRAFIK.programm / mesh / vollbild / textur
   * ======================================================================== */

  /* Uebersetzt einen Shader und wirft mit Zeilennummer und Umgebung.
   * Ohne die numerierten Zeilen sucht man einen Tippfehler in 200 Zeilen GLSL
   * ueber die Konsole eines kopflosen Browsers — das kostet mehr Zeit als der
   * ganze Baustein. */
  function uebersetzen(gl, typ, quelle, wessen) {
    const sh = gl.createShader(typ);
    gl.shaderSource(sh, quelle);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;

    const log = gl.getShaderInfoLog(sh) || '(kein Protokoll)';
    gl.deleteShader(sh);
    const art = (typ === gl.VERTEX_SHADER) ? 'Vertex' : 'Fragment';
    const zeilen = quelle.split('\n');
    const treffer = new Set();
    for (const m of log.matchAll(/\b\d+:(\d+)\b/g)) treffer.add(parseInt(m[1], 10));

    let ausschnitt = '';
    if (treffer.size) {
      for (const n of Array.from(treffer).sort((a, b) => a - b)) {
        for (let i = Math.max(1, n - 2); i <= Math.min(zeilen.length, n + 2); i++) {
          ausschnitt += (i === n ? ' >> ' : '    ') + String(i).padStart(4) + ' | '
                      + zeilen[i - 1] + '\n';
        }
        ausschnitt += '    ...\n';
      }
    } else {
      ausschnitt = zeilen.map((z, i) => '    ' + String(i + 1).padStart(4) + ' | ' + z)
                         .slice(0, 60).join('\n');
    }
    throw new Error(art + '-Shader' + (wessen ? ' (' + wessen + ')' : '') + ':\n'
                    + log + '\n' + ausschnitt);
  }

  /* Uebersetzt, verlinkt, sammelt Uniform- und Attributorte ein.
   *
   * RUECKGABE: das WebGLProgram SELBST, zusaetzlich beschriftet mit
   *   .u  Uniform-Orte nach Namen        (u.uViewProj, Felder auch ohne "[0]")
   *   .a  Attributorte nach Namen
   *   .p  zeigt auf sich selbst
   *
   * Damit passen beide Schreibweisen, die im Projekt vorkommen, ohne dass
   * jemand seinen Code aendern muss:
   *   gl.useProgram(prog)     — so erwartet es grafik/gel.js
   *   gl.useProgram(prog.p)   — so schreibt es renderer.js, und so lesen
   *                             combat.js/death.js R.decal.p und R.decal.u
   * Das ist kein Trick, sondern die einzige Antwort, die beide Lager bedient:
   * ein WebGLProgram ist ein gewoehnliches JS-Objekt und nimmt Eigenschaften an. */
  GRAFIK.programm = function programm(gl, vs, fs, wessen) {
    const p = gl.createProgram();
    const v = uebersetzen(gl, gl.VERTEX_SHADER, vs, wessen);
    const f = uebersetzen(gl, gl.FRAGMENT_SHADER, fs, wessen);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error('Programm' + (wessen ? ' (' + wessen + ')' : '') + ' verlinkt nicht:\n' + log);
    }
    const u = Object.create(null);
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
      // Felder melden sich als "uFoo[0]"; unter beiden Namen erreichbar machen.
      const kurz = name.replace(/\[0\]$/, '');
      if (kurz !== name) u[kurz] = u[name];
    }
    const a = Object.create(null);
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) {
      const name = gl.getActiveAttrib(p, i).name;
      a[name] = gl.getAttribLocation(p, name);
    }
    p.u = u;
    p.a = a;
    p.p = p;
    p.benutzen = function () { gl.useProgram(p); return p; };
    return p;
  };

  /* VAO aus Position (Ort 0), Normale (Ort 1) und Indizes.
   * Formgleich mit makeMesh aus renderer.js — game.js legt das Schleimnetz mit
   * jener Funktion an, und beide muessen zusammenpassen. */
  GRAFIK.mesh = function mesh(gl, positionen, normalen, indizes) {
    const pos = positionen instanceof Float32Array ? positionen : new Float32Array(positionen);
    const nor = normalen == null ? null
              : (normalen instanceof Float32Array ? normalen : new Float32Array(normalen));
    let idx = indizes;
    if (!(idx instanceof Uint16Array) && !(idx instanceof Uint32Array)) {
      let max = 0;
      for (let i = 0; i < idx.length; i++) if (idx[i] > max) max = idx[i];
      idx = max > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    let nb = null;
    if (nor) {
      nb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nb);
      gl.bufferData(gl.ARRAY_BUFFER, nor, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    }

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    return {
      vao, pb, nb, ib,
      count: idx.length,
      typ: (idx instanceof Uint32Array) ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      zeichnen(g) {
        g = g || gl;
        g.bindVertexArray(vao);
        g.drawElements(g.TRIANGLES, idx.length,
                       (idx instanceof Uint32Array) ? g.UNSIGNED_INT : g.UNSIGNED_SHORT, 0);
      },
    };
  };

  /* Vollbilddreieck fuer Bildschirmdurchgaenge. Ein Dreieck, kein Quad: die
   * Diagonale eines Quads ist eine Naht, an der die Ableitungen (fwidth,
   * Nachbarschaftszugriffe) auf beiden Seiten aus verschiedenen Bloecken
   * kommen. Wird je Kontext einmal angelegt. */
  GRAFIK.vollbildVs = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  GRAFIK.vollbild = function vollbild(gl) {
    if (gl.__grafikVollbild) return gl.__grafikVollbild;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    const o = {
      vao, puffer: b, count: 3,
      zeichnen(g) { g = g || gl; g.bindVertexArray(vao); g.drawArrays(g.TRIANGLES, 0, 3); },
    };
    gl.__grafikVollbild = o;
    return o;
  };

  /* Textur oder Renderziel.
   *
   *   GRAFIK.textur(gl, { breite: 1024, hoehe: 1024, format: 'tiefe24',
   *                       filter: 'nearest', ziel: true })
   *
   * format: 'rgba8' | 'rgba16f' | 'rgba32f' | 'rg16f' | 'r8' | 'r16f'
   *         | 'tiefe24' | 'tiefe32f'
   * ziel:   true legt einen Framebuffer an und haengt die Textur an
   * tiefe:  'textur' | 'puffer' | false — Tiefenanlage fuer ein Farbziel
   */
  const FORMATE = {
    rgba8:    ['RGBA8',              'RGBA',            'UNSIGNED_BYTE'],
    srgb8:    ['SRGB8_ALPHA8',       'RGBA',            'UNSIGNED_BYTE'],
    rgba16f:  ['RGBA16F',            'RGBA',            'HALF_FLOAT'],
    rgba32f:  ['RGBA32F',            'RGBA',            'FLOAT'],
    rg16f:    ['RG16F',              'RG',              'HALF_FLOAT'],
    r8:       ['R8',                 'RED',             'UNSIGNED_BYTE'],
    r16f:     ['R16F',               'RED',             'HALF_FLOAT'],
    tiefe24:  ['DEPTH_COMPONENT24',  'DEPTH_COMPONENT', 'UNSIGNED_INT'],
    tiefe32f: ['DEPTH_COMPONENT32F', 'DEPTH_COMPONENT', 'FLOAT'],
  };

  GRAFIK.textur = function textur(gl, opts) {
    opts = opts || {};
    const breite = Math.max(1, opts.breite | 0 || 1);
    const hoehe = Math.max(1, opts.hoehe | 0 || 1);
    const name = opts.format || 'rgba8';
    const f = FORMATE[name];
    if (!f) throw new Error('GRAFIK.textur: unbekanntes Format "' + name + '"');
    const istTiefe = name.indexOf('tiefe') === 0;

    const filter = (opts.filter === 'linear') ? gl.LINEAR : gl.NEAREST;
    const wrap = (opts.wrap === 'repeat') ? gl.REPEAT
               : (opts.wrap === 'spiegel') ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[f[0]], breite, hoehe, 0,
                  gl[f[1]], gl[f[2]], opts.daten || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (opts.vergleich) {
      // sampler2DShadow: textureProj vergleicht dann selbst (G8)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);

    const o = {
      tex, breite, hoehe, format: name, fbo: null, tiefeTex: null, tiefePuffer: null,
      binden(einheit) {
        gl.activeTexture(gl.TEXTURE0 + (einheit || 0));
        gl.bindTexture(gl.TEXTURE_2D, tex);
        return einheit || 0;
      },
      loeschen() {
        gl.deleteTexture(tex);
        if (o.fbo) gl.deleteFramebuffer(o.fbo);
        if (o.tiefeTex) gl.deleteTexture(o.tiefeTex);
        if (o.tiefePuffer) gl.deleteRenderbuffer(o.tiefePuffer);
      },
    };

    if (!opts.ziel) return o;

    o.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, o.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,
      istTiefe ? gl.DEPTH_ATTACHMENT : gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (istTiefe) {
      // Reines Tiefenziel: ohne diese beiden Zeilen ist der Framebuffer nach
      // WebGL2 unvollstaendig, weil er einen Farbanhang erwartet.
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
    } else if (opts.tiefe === 'textur') {
      const dt = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, dt);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, breite, hoehe, 0,
                    gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dt, 0);
      o.tiefeTex = dt;
    } else if (opts.tiefe) {
      const rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, breite, hoehe);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      o.tiefePuffer = rb;
    }

    const stand = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (stand !== gl.FRAMEBUFFER_COMPLETE) {
      o.loeschen();
      throw new Error('GRAFIK.textur: Renderziel "' + name + '" ' + breite + 'x' + hoehe
                    + ' unvollstaendig (0x' + stand.toString(16) + ')');
    }
    o.ziel = { fbo: o.fbo, breite, hoehe, hdr: (name === 'rgba16f' || name === 'rgba32f') };
    return o;
  };

  /* ==========================================================================
   * 2. Sondierung
   *
   * Alles hier ist eine Messung, kein Zitat. Legt an, prueft, raeumt auf.
   * ======================================================================== */
  GRAFIK.faehigkeiten = function faehigkeiten(gl) {
    const f = { gemessen: true };
    const frage = (was, wie) => { try { f[was] = wie(); } catch (e) { f[was] = 'Fehler: ' + e.message; } };

    frage('version', () => gl.getParameter(gl.VERSION));
    frage('glsl', () => gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    frage('zeichner', () => {
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });

    f.erweiterungen = {};
    for (const e of ['EXT_color_buffer_float', 'EXT_float_blend', 'OES_texture_float_linear',
                     'EXT_texture_filter_anisotropic', 'WEBGL_compressed_texture_s3tc',
                     'OVR_multiview2', 'EXT_disjoint_timer_query_webgl2']) {
      f.erweiterungen[e] = !!gl.getExtension(e);
    }
    f.colorBufferFloat = f.erweiterungen.EXT_color_buffer_float;

    frage('maxDrawBuffers', () => gl.getParameter(gl.MAX_DRAW_BUFFERS));
    frage('maxColorAttachments', () => gl.getParameter(gl.MAX_COLOR_ATTACHMENTS));
    frage('maxSamples', () => gl.getParameter(gl.MAX_SAMPLES));
    frage('maxTexturGroesse', () => gl.getParameter(gl.MAX_TEXTURE_SIZE));
    frage('max3dTexturGroesse', () => gl.getParameter(gl.MAX_3D_TEXTURE_SIZE));
    frage('maxVertexAttribute', () => gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
    frage('maxTexturEinheiten', () => gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
    frage('maxVaryings', () => gl.getParameter(gl.MAX_VARYING_COMPONENTS));

    const stufen = (format) => {
      const a = gl.getInternalformatParameter(gl.RENDERBUFFER, gl[format], gl.SAMPLES);
      return a ? Array.from(a) : [];
    };
    frage('msaaRgba8', () => stufen('RGBA8'));
    frage('msaaRgba16f', () => stufen('RGBA16F'));
    frage('msaaTiefe24', () => stufen('DEPTH_COMPONENT24'));

    /* Der einzige belastbare Test fuer ein Renderziel ist: anlegen und
     * checkFramebufferStatus fragen. Eine vorhandene Erweiterung sagt noch
     * nicht, dass das Format auch angehaengt werden darf. */
    const zielGeht = (format) => {
      let t = null;
      try { t = GRAFIK.textur(gl, { breite: 8, hoehe: 8, format, ziel: true }); return true; }
      catch (e) { return false; }
      finally { if (t) t.loeschen(); }
    };
    frage('zielRgba8', () => zielGeht('rgba8'));
    frage('zielRgba16f', () => zielGeht('rgba16f'));
    frage('zielRgba32f', () => zielGeht('rgba32f'));
    frage('tiefe24Textur', () => zielGeht('tiefe24'));
    frage('tiefe32fTextur', () => zielGeht('tiefe32f'));

    f.bericht = function () {
      return [
        'GRAFIK-Sondierung:',
        '  ' + f.version + ' / ' + f.zeichner,
        '  EXT_color_buffer_float ' + f.colorBufferFloat
          + ' · EXT_float_blend ' + f.erweiterungen.EXT_float_blend
          + ' · OES_texture_float_linear ' + f.erweiterungen.OES_texture_float_linear,
        '  Ziel RGBA16F ' + f.zielRgba16f + ' · RGBA32F ' + f.zielRgba32f
          + ' · Tiefe24-Textur ' + f.tiefe24Textur + ' · Tiefe32F-Textur ' + f.tiefe32fTextur,
        '  MSAA: max ' + f.maxSamples + ' · RGBA8 [' + f.msaaRgba8 + ']'
          + ' · RGBA16F [' + f.msaaRgba16f + ']',
        '  MAX_DRAW_BUFFERS ' + f.maxDrawBuffers + ' · Farbanhaenge ' + f.maxColorAttachments
          + ' · Textur ' + f.maxTexturGroesse + ' · Attribute ' + f.maxVertexAttribute,
      ].join('\n');
    };
    return f;
  };

  /* ==========================================================================
   * 3. Shaderquellen
   *
   * Uebernommen aus client/renderer.js, damit der zweite Pfad beim Umschalten
   * dasselbe Bild liefert. Jedes Modul, das einen dieser Durchgaenge ersetzt,
   * bringt seine eigenen mit — diese hier sind der Boden, auf dem sie stehen.
   * ======================================================================== */

  const FACTIONS = {
    eldoran: {
      name: 'Eldoran',
      deep:  [0.02, 0.17, 0.50],
      mid:   [0.13, 0.58, 0.97],
      light: [0.66, 0.93, 1.00],
      trail: [0.24, 0.60, 0.92],
    },
    ravok: {
      name: 'Ravok',
      deep:  [0.32, 0.03, 0.07],
      mid:   [0.94, 0.17, 0.20],
      light: [1.00, 0.68, 0.58],
      trail: [0.80, 0.18, 0.20],
    },
  };

  const LICHT = `
const vec3 HIMMELLICHT = vec3(0.34, 0.38, 0.47);
const vec3 BODENLICHT  = vec3(0.27, 0.26, 0.23);
const vec3 SONNE       = vec3(0.88, 0.85, 0.78);
const vec3 HORIZONT    = vec3(0.405, 0.415, 0.425);
const vec3 ZENIT       = vec3(0.135, 0.165, 0.225);
`;

  const VS_LIT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;
out vec3 vPos;
out vec3 vNormal;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vPos = world.xyz;
  vNormal = uNormalMat * aNormal;
  gl_Position = uViewProj * world;
}`;

  const FS_SLIME = `#version 300 es
precision highp float;
${LICHT}
in vec3 vPos;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLightCol;
uniform float uAlpha;
uniform float uTime;
uniform float uBottom;
uniform float uRadius;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);
  vec3 H = normalize(L + V);

  float ndl = max(dot(N, L), 0.0);
  float ndv = max(dot(N, V), 0.0);
  float ndh = max(dot(N, H), 0.0);
  float fres = pow(1.0 - ndv, 2.4);

  float tropfen  = pow(ndh, 300.0);
  float schimmer = pow(ndh, 26.0);

  float back = pow(max(dot(V, -L), 0.0), 2.0);
  float hoehe = clamp((vPos.y - uBottom) / (uRadius * 2.2), 0.0, 1.0);

  float dicke = 1.0 - fres;

  float schlieren = 0.5 + 0.5 * sin(vPos.y * 5.0 + uTime * 1.4
                                  + vPos.x * 2.3 + vPos.z * 1.7);

  vec3 kern = mix(uDeep, uMid, hoehe * 0.62 + ndl * 0.40);
  kern = mix(kern, uMid * 1.18, schlieren * 0.10 * dicke);
  kern = mix(uMid, kern, dicke * 0.55 + 0.45);

  vec3 col = kern;
  col += uLightCol * back * 0.36;
  col += uLightCol * fres * 0.50;
  col += BODENLICHT * max(-N.y, 0.0) * 0.35;
  col += uLightCol * schimmer * 0.22;
  col += vec3(1.0) * tropfen * 0.55;

  col = col / (1.0 + col * 0.28);

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.22);

  float alpha = clamp(uAlpha + fres * 0.80, 0.0, 1.0);
  outColor = vec4(col, alpha);
}`;

  const FS_SOLID = `#version 300 es
precision highp float;
${LICHT}
in vec3 vPos;
in vec3 vNormal;
uniform vec3 uCam;
uniform vec3 uLight;
uniform vec3 uColor;
uniform float uGloss;
uniform float uEmissive;
out vec4 outColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCam - vPos);
  vec3 L = normalize(uLight);
  float ndl = max(dot(N, L), 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 40.0) * uGloss;

  vec3 amb = mix(BODENLICHT, HIMMELLICHT, N.y * 0.5 + 0.5);
  vec3 col = uColor * (amb + SONNE * ndl)
           + HIMMELLICHT * rim * 0.30
           + vec3(spec) * 0.75;
  col = mix(col, uColor, uEmissive);
  outColor = vec4(col, 1.0);
}`;

  const VS_HIMMEL = `#version 300 es
layout(location = 0) in vec3 aPos;
out float vHoehe;
void main() {
  vHoehe = aPos.z;
  gl_Position = vec4(aPos.x, aPos.z, 0.0, 1.0);
}`;

  const FS_HIMMEL = `#version 300 es
precision highp float;
${LICHT}
in float vHoehe;
uniform float uHorizont;
out vec4 outColor;
void main() {
  float ueber = max(vHoehe - uHorizont, 0.0);
  outColor = vec4(mix(HORIZONT, ZENIT, smoothstep(0.0, 0.62, ueber)), 1.0);
}`;

  const VS_GROUND = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform float uSize;
out vec3 vWorld;
void main() {
  vWorld = vec3(aPos.x * uSize, 0.0, aPos.z * uSize);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

  const FS_GROUND = `#version 300 es
precision highp float;
${LICHT}
in vec3 vWorld;
uniform float uBound;
out vec4 outColor;

void main() {
  vec2 p = vWorld.xz;

  vec2 uv = p * 0.5;
  vec2 g = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
  float naht = 1.0 - min(min(g.x, g.y), 1.0);

  vec2 uv2 = p * 0.1;
  vec2 g2 = abs(fract(uv2 - 0.5) - 0.5) / fwidth(uv2);
  float haupt = 1.0 - min(min(g2.x, g2.y), 1.0);

  vec2 zelle = floor(p * 0.5);
  float schach = mod(zelle.x + zelle.y, 2.0);

  float fleck = sin(p.x * 0.31 + 1.7) * sin(p.y * 0.27 - 0.9)
              + 0.5 * sin(p.x * 0.13 - 2.4) * sin(p.y * 0.11 + 1.1);

  float innen = 1.0 - smoothstep(uBound - 0.5, uBound + 0.1,
                                 max(abs(p.x), abs(p.y)));

  vec3 col = mix(vec3(0.250, 0.252, 0.260), vec3(0.330, 0.320, 0.286), innen);
  col *= 1.0 + schach * 0.062 + fleck * 0.040;
  col -= vec3(0.048, 0.046, 0.042) * naht * 0.8;
  col += vec3(0.070, 0.064, 0.050) * haupt;

  float kante = smoothstep(0.75, 0.0, abs(max(abs(p.x), abs(p.y)) - uBound));
  col = mix(col, vec3(0.44, 0.38, 0.25), kante * 0.50);

  float dunst = smoothstep(uBound * 0.7, uBound * 1.6, length(p));
  col = mix(col, HORIZONT, dunst);

  outColor = vec4(col, 1.0);
}`;

  const VS_DECAL = `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uViewProj;
uniform mat4 uModel;
out vec2 vUv;
void main() {
  vUv = aPos.xz;
  gl_Position = uViewProj * uModel * vec4(aPos, 1.0);
}`;

  const FS_DECAL = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uRing;
out vec4 outColor;
void main() {
  float d = length(vUv);
  float a;
  if (uRing > 0.5) {
    a = smoothstep(1.0, 0.90, d) * smoothstep(0.74, 0.84, d);
  } else {
    a = pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
  }
  if (a <= 0.001) discard;
  outColor = vec4(uColor, a * uAlpha);
}`;

  /* ==========================================================================
   * 4. Zeichenhelfer — formgleich mit renderer.js
   * ======================================================================== */

  function normalMat(sx, sy, sz) {
    return new Float32Array([1 / sx, 0, 0, 0, 1 / sy, 0, 0, 0, 1 / sz]);
  }
  const IDENTITY_N = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

  const _mm = new Float32Array(16);
  const _nm = new Float32Array(9);
  const _B = { ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0 };

  function tangentBasis(nx, ny, nz, out) {
    const steil = Math.abs(ny) > 0.92;
    const ay = steil ? 0 : 1, az = steil ? 1 : 0;
    let ux = ay * nz - az * ny;
    let uy = az * nx;
    let uz = -ay * nx;
    const l = Math.hypot(ux, uy, uz) || 1;
    ux /= l; uy /= l; uz /= l;
    out.ux = ux; out.uy = uy; out.uz = uz;
    out.vx = ny * uz - nz * uy;
    out.vy = nz * ux - nx * uz;
    out.vz = nx * uy - ny * ux;
  }

  function patchModel(px, py, pz, B, nx, ny, nz, ru, rv, rn) {
    _mm[0] = B.ux * ru; _mm[1] = B.uy * ru; _mm[2] = B.uz * ru; _mm[3] = 0;
    _mm[4] = B.vx * rv; _mm[5] = B.vy * rv; _mm[6] = B.vz * rv; _mm[7] = 0;
    _mm[8] = nx * rn;   _mm[9] = ny * rn;   _mm[10] = nz * rn;  _mm[11] = 0;
    _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
    _nm[0] = B.ux / ru; _nm[1] = B.uy / ru; _nm[2] = B.uz / ru;
    _nm[3] = B.vx / rv; _nm[4] = B.vy / rv; _nm[5] = B.vz / rv;
    _nm[6] = nx / rn;   _nm[7] = ny / rn;   _nm[8] = nz / rn;
    return _mm;
  }

  function yawModel(px, py, pz, sx, sy, sz, c, s) {
    _mm[0] = sx * c; _mm[1] = 0;  _mm[2] = sx * s;  _mm[3] = 0;
    _mm[4] = 0;      _mm[5] = sy; _mm[6] = 0;       _mm[7] = 0;
    _mm[8] = -sz * s; _mm[9] = 0; _mm[10] = sz * c; _mm[11] = 0;
    _mm[12] = px; _mm[13] = py; _mm[14] = pz; _mm[15] = 1;
    _nm[0] = c / sx; _nm[1] = 0;      _nm[2] = s / sx;
    _nm[3] = 0;      _nm[4] = 1 / sy; _nm[5] = 0;
    _nm[6] = -s / sz; _nm[7] = 0;     _nm[8] = c / sz;
    return _mm;
  }

  function drawProp(R, mesh, model, nmat, color, gloss, emissive, cam, viewProj) {
    const gl = R.gl, s = R.solid;
    gl.useProgram(s.p);
    gl.bindVertexArray(mesh.vao);
    gl.uniformMatrix4fv(s.u.uViewProj, false, viewProj);
    gl.uniformMatrix4fv(s.u.uModel, false, model);
    gl.uniformMatrix3fv(s.u.uNormalMat, false, nmat);
    gl.uniform3fv(s.u.uCam, cam);
    gl.uniform3fv(s.u.uLight, R.light);
    gl.uniform3fv(s.u.uColor, color);
    gl.uniform1f(s.u.uGloss, gloss);
    gl.uniform1f(s.u.uEmissive, emissive || 0);
    gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);
  }

  function drawDecal(R, x, z, radius, color, alpha, ring, viewProj) {
    const gl = R.gl, d = R.decal;
    gl.useProgram(d.p);
    gl.bindVertexArray(R.quadMesh.vao);
    gl.uniformMatrix4fv(d.u.uViewProj, false, viewProj);
    gl.uniformMatrix4fv(d.u.uModel, false, M4.trs(x, 0.012, z, radius, 1, radius));
    gl.uniform3fv(d.u.uColor, color);
    gl.uniform1f(d.u.uAlpha, alpha);
    gl.uniform1f(d.u.uRing, ring ? 1 : 0);
    gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);
  }

  /* Bildhoehe der Horizontlinie in NDC. Ein Punkt weit vorn auf Augenhoehe
   * liegt per Definition auf dem Horizont — projizieren genuegt.
   * (himmel.js ersetzt das durch die Blickrichtung, siehe Plan G1.) */
  function horizontNdc(camera, cam) {
    let fx = camera.tx - cam[0], fz = camera.tz - cam[2];
    const l = Math.hypot(fx, fz) || 1;
    fx /= l; fz /= l;
    const px = cam[0] + fx * 400, py = cam[1], pz = cam[2] + fz * 400;
    const m = camera.viewProj;
    const y = m[1] * px + m[5] * py + m[9] * pz + m[13];
    const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
    if (!w) return 0;
    return klemm(y / w, -4, 4);
  }

  function bodySpread(b) {
    let max = 0;
    for (let i = 0; i < b.n; i++) {
      const k = i * 3;
      const d = Math.hypot(b.pos[k] - b.cx, b.pos[k + 2] - b.cz);
      if (d > max) max = d;
    }
    return max;
  }

  const _s = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };
  const KNOCHEN = [0.88, 0.85, 0.72];
  const PUPILLE = [0.04, 0.05, 0.07];
  const AUGE_HELL   = [0.78, 0.85, 0.92];
  const AUGE_DUNKEL = [0.020, 0.035, 0.070];
  const MUND        = [0.200, 0.045, 0.060];

  /* ==========================================================================
   * 5. Die eingebauten Durchgaenge (Grundzuege)
   *
   * Jeder setzt seinen Zustand SELBST. In renderer.js reichen sich die
   * Durchgaenge den GL-Zustand weiter; hier darf zwischen zwei Grundzuegen ein
   * fremdes Modul stehen, also darf sich keiner auf den Vorgaenger verlassen.
   * ======================================================================== */

  function zeichneHimmel(gl, R, ctx) {
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.useProgram(R.himmel.p);
    gl.bindVertexArray(R.quadMesh.vao);
    gl.uniform1f(R.himmel.u.uHorizont, horizontNdc(ctx.camera, ctx.cam));
    gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
  }

  function zeichneBoden(gl, R, ctx) {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);       // das Bodenquad liegt je nach Blick falschherum
    gl.useProgram(R.ground.p);
    gl.bindVertexArray(R.quadMesh.vao);
    gl.uniformMatrix4fv(R.ground.u.uViewProj, false, ctx.viewProj);
    gl.uniform1f(R.ground.u.uSize, ctx.welt.bounds * 3);
    gl.uniform1f(R.ground.u.uBound, ctx.welt.bounds);
    gl.drawElements(gl.TRIANGLES, R.quadMesh.count, gl.UNSIGNED_SHORT, 0);
  }

  /* Requisiten bleiben absichtlich stumpf und neutral: sie sollen die Ebene
   * gliedern, nicht mit dem Schleim um Aufmerksamkeit streiten. */
  function zeichneHindernisse(gl, R, ctx) {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    const cam = ctx.cam, viewProj = ctx.viewProj;
    for (const o of ctx.welt.obstacles) {
      if (o.type === 'rock') {
        drawProp(R, R.propMesh, M4.trs(o.x, o.y, o.z, o.r, o.r * 0.8, o.r),
                 normalMat(o.r, o.r * 0.8, o.r), [0.335, 0.330, 0.310], 0.12, 0, cam, viewProj);
      } else {
        drawProp(R, R.boxMesh, M4.trs(o.x, o.y, o.z, o.w * 0.5, o.h * 0.5, o.d * 0.5),
                 normalMat(o.w * 0.5, o.h * 0.5, o.d * 0.5), [0.355, 0.360, 0.375], 0.08, 0, cam, viewProj);
      }
    }
  }

  /* Kreaturen werden bewusst VOR dem Schleim gezeichnet. Weil das Gel
   * durchscheinend ist, steckt ein umschlungener Gegner danach sichtbar IN der
   * Masse (GDD 01 §28) — er wird nicht bloss verdeckt. */
  function zeichneKreaturen(gl, R, ctx) {
    if (!ctx.game) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const cam = ctx.cam, viewProj = ctx.viewProj;
    const b = ctx.slime.body;

    for (const k of ctx.game.kreaturen) {
      const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1)
              * (k.lebt ? 1 : Math.max(0, 1 - k.tot));
      if (f <= 0.01) continue;
      const g = k.groesse * f;

      let hx = b.cx - k.x, hz = b.cz - k.z;
      const hl = Math.hypot(hx, hz) || 1;
      hx /= hl; hz /= hl;

      const sack = k.lebt ? 1 : Math.max(0.2, 1 - 0.65 * k.tot);
      const wack = Math.sin(k.wackeln) * 0.05;

      const ziel = ctx.game.zielId === k.id;
      const c = k.farbe;
      const hell = ziel ? [Math.min(1, c[0] * 1.5), Math.min(1, c[1] * 1.5), Math.min(1, c[2] * 1.5)]
                        : c;
      const dunkel = [hell[0] * 0.70, hell[1] * 0.70, hell[2] * 0.74];
      const em = ziel ? 0.14 : 0;

      const teil = (vor, hoch, quer, lx, ly, lz, col, gloss) => {
        drawProp(R, R.propMesh,
          yawModel(k.x + hx * vor * g - hz * quer * g,
                   k.y + hoch * g * sack,
                   k.z + hz * vor * g + hx * quer * g,
                   lx * g, ly * g * sack, lz * g, hx, hz),
          _nm, col, gloss, em, cam, viewProj);
      };

      const spitze = (vor, hoch, quer, dv, dh, dq, laenge, dick, col) => {
        let dx = hx * dv - hz * dq, dy = dh, dz = hz * dv + hx * dq;
        const l = Math.hypot(dx, dy, dz) || 1;
        dx /= l; dy /= l; dz /= l;
        const px = k.x + hx * vor * g - hz * quer * g;
        const py = k.y + hoch * g * sack;
        const pz = k.z + hz * vor * g + hx * quer * g;
        const halb = laenge * g * 0.5;
        tangentBasis(dx, dy, dz, _B);
        drawProp(R, R.propMesh,
          patchModel(px + dx * halb, py + dy * halb, pz + dz * halb,
                     _B, dx, dy, dz, dick * g, dick * g, halb),
          _nm, col, 0.2, em, cam, viewProj);
      };

      const auge = (vor, hoch, quer, r) => teil(vor, hoch, quer, r, r, r, PUPILLE, 0.9);

      if (k.art === 'eber') {
        teil( 0.42, 0.24,  0.34, 0.17, 0.24, 0.17, dunkel, 0.15);
        teil( 0.42, 0.24, -0.34, 0.17, 0.24, 0.17, dunkel, 0.15);
        teil(-0.40, 0.24,  0.32, 0.17, 0.24, 0.17, dunkel, 0.15);
        teil(-0.40, 0.24, -0.32, 0.17, 0.24, 0.17, dunkel, 0.15);
        teil(-0.05, 0.78,  0.00, 0.78, 0.56, 0.58, hell, 0.2);
        teil( 0.34, 1.04,  0.00, 0.42, 0.44, 0.44, hell, 0.2);
        spitze( 0.30, 1.34, 0.0, -0.35, 1.0, 0.0, 0.36, 0.06, dunkel);
        spitze( 0.02, 1.26, 0.0, -0.40, 1.0, 0.0, 0.32, 0.06, dunkel);
        teil( 0.92, 0.68,  0.00, 0.36, 0.34, 0.34, hell, 0.2);
        teil( 1.26, 0.56,  0.00, 0.24, 0.20, 0.22, dunkel, 0.35);
        spitze( 1.28, 0.60,  0.16, 0.45, 0.85,  0.12, 0.42, 0.055, KNOCHEN);
        spitze( 1.28, 0.60, -0.16, 0.45, 0.85, -0.12, 0.42, 0.055, KNOCHEN);
        auge( 1.06, 0.86,  0.18, 0.058);
        auge( 1.06, 0.86, -0.18, 0.058);

      } else if (k.art === 'schleimling') {
        teil( 0.00, 0.62,  0.00, 0.85, 0.62, 0.80, hell, 0.65);
        teil(-0.05, 1.16 + wack * 2.0, 0.0, 0.24, 0.30, 0.24, hell, 0.65);
        auge( 0.62, 0.74,  0.26, 0.13);
        auge( 0.62, 0.74, -0.26, 0.13);
        teil( 0.76, 0.44,  0.00, 0.14, 0.06, 0.09, PUPILLE, 0.4);

      } else {
        teil( 0.45, 0.42,  0.30, 0.145, 0.42, 0.145, dunkel, 0.15);
        teil( 0.45, 0.42, -0.30, 0.145, 0.42, 0.145, dunkel, 0.15);
        teil(-0.42, 0.42,  0.28, 0.145, 0.42, 0.145, dunkel, 0.15);
        teil(-0.42, 0.42, -0.28, 0.145, 0.42, 0.145, dunkel, 0.15);
        teil( 0.00, 0.95,  0.00, 0.72, 0.40, 0.36, hell, 0.2);
        teil( 0.45, 1.00,  0.00, 0.36, 0.38, 0.34, hell, 0.2);
        teil( 1.05, 1.30 + wack, 0.0, 0.32, 0.28, 0.26, hell, 0.2);
        teil( 1.42, 1.20 + wack, 0.0, 0.26, 0.14, 0.15, dunkel, 0.3);
        spitze( 0.98, 1.46 + wack,  0.14, 0.10, 1.0,  0.35, 0.44, 0.07, dunkel);
        spitze( 0.98, 1.46 + wack, -0.14, 0.10, 1.0, -0.35, 0.44, 0.07, dunkel);
        spitze(-0.72, 1.05, 0.0, -0.70, 0.90, 0.0, 0.85, 0.125, dunkel);
        auge( 1.22, 1.36 + wack,  0.13, 0.062);
        auge( 1.22, 1.36 + wack, -0.13, 0.062);
      }
    }
  }

  /* Gesicht. GDD 01 §7: Bestandteil des Koerpers, nie aufgesetzt. Flache
   * Linsen auf der tatsaechlich verformten Oberflaeche, gezeichnet VOR dem Gel
   * — man schaut also durch den Schleim auf das Gesicht. */
  function zeichneGesicht(gl, R, ctx) {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    const s = ctx.slime, P = ctx.params, cam = ctx.cam, viewProj = ctx.viewProj;
    const b = s.body;
    const rEye = P.radius * 0.30;
    const blinkAmt = klemm(s.blink / 0.07, 0, 1);
    const offen = s.mouth;

    for (const side of [-1, 1]) {
      const d = faceDir(s, side * 0.60, 0.30);
      surfaceSample(b, d.x, d.y, d.z, _s);
      const nx = _s.nx, ny = _s.ny, nz = _s.nz;
      tangentBasis(nx, ny, nz, _B);

      const rv = rEye * 0.94 * (1 - 0.9 * blinkAmt);
      drawProp(R, R.propMesh,
        patchModel(_s.x - nx * rEye * 0.46, _s.y - ny * rEye * 0.46, _s.z - nz * rEye * 0.46,
                   _B, nx, ny, nz, rEye, rv, rEye * 0.30),
        _nm, AUGE_HELL, 0.3, 0.40, cam, viewProj);

      const du = klemm(s.look.x * _B.ux + s.look.y * _B.uy + s.look.z * _B.uz, -1, 1);
      const dv = klemm(s.look.x * _B.vx + s.look.y * _B.vy + s.look.z * _B.vz, -1, 1);
      const pr = rEye * 0.88;
      const px = _s.x - nx * rEye * 0.28 + _B.ux * du * rEye * 0.08 + _B.vx * dv * rEye * 0.06;
      const py = _s.y - ny * rEye * 0.28 + _B.uy * du * rEye * 0.08 + _B.vy * dv * rEye * 0.06;
      const pz = _s.z - nz * rEye * 0.28 + _B.uz * du * rEye * 0.08 + _B.vz * dv * rEye * 0.06;
      drawProp(R, R.propMesh,
        patchModel(px, py, pz, _B, nx, ny, nz,
                   pr, Math.max(pr * (1 - 0.92 * blinkAmt), rEye * 0.03), rEye * 0.24),
        _nm, AUGE_DUNKEL, 0.6, 0.78, cam, viewProj);

      if (blinkAmt < 0.55) {
        const gr = rEye * 0.20;
        drawProp(R, R.propMesh,
          patchModel(px - _B.ux * pr * 0.42 + _B.vx * pr * 0.42 - nx * rEye * 0.10,
                     py - _B.uy * pr * 0.42 + _B.vy * pr * 0.42 - ny * rEye * 0.10,
                     pz - _B.uz * pr * 0.42 + _B.vz * pr * 0.42 - nz * rEye * 0.10,
                     _B, nx, ny, nz, gr, gr, rEye * 0.09),
          _nm, [1, 1, 1], 1.0, 0.95, cam, viewProj);
      }
    }

    const steps = 15;
    for (let i = 0; i < steps; i++) {
      const t = (i / (steps - 1)) * 2 - 1;
      const yaw = t * 0.40;
      const pitch = -0.13 - (1 - t * t) * 0.14 + offen * 0.05;
      const d = faceDir(s, yaw, pitch);
      surfaceSample(b, d.x, d.y, d.z, _s);
      const nx = _s.nx, ny = _s.ny, nz = _s.nz;
      tangentBasis(nx, ny, nz, _B);

      const ru = P.radius * 0.115;
      const rv = P.radius * (0.055 + offen * 0.24 * (1 - t * t * 0.55));
      drawProp(R, R.propMesh,
        patchModel(_s.x - nx * P.radius * 0.075, _s.y - ny * P.radius * 0.075,
                   _s.z - nz * P.radius * 0.075,
                   _B, nx, ny, nz, ru, rv, P.radius * 0.055),
        _nm, MUND, 0.4, 0.72, cam, viewProj);
    }
  }

  /* Bodendekale: Schleimspur, Schatten, Zielringe. */
  function zeichneDekale(gl, R, ctx) {
    const viewProj = ctx.viewProj, pal = ctx.pal;
    const slime = ctx.slime, params = ctx.params, b = slime.body;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);

    for (const t of slime.trail) {
      drawDecal(R, t.x, t.z, t.r, pal.trail, Math.max(0, t.life) * 0.26, false, viewProj);
    }

    /* Schatten entlang der Lichtrichtung auf den Boden projiziert — direkt
     * unter dem Koerper waere er vollstaendig verdeckt und damit wirkungslos.
     * (Faellt weg, sobald schatten.js eine echte Schattenkarte liefert, G8.) */
    const spread = bodySpread(b);
    const L = ctx.licht.richtung;
    const shX = b.cx - (L[0] / L[1]) * b.cy;
    const shZ = b.cz - (L[2] / L[1]) * b.cy;
    const lift = klemm(1 - (b.cy - params.radius * 0.5) / (params.radius * 6), 0.2, 1);
    drawDecal(R, shX, shZ, spread * 1.75, [0.06, 0.07, 0.09], 0.30 * lift, false, viewProj);
    drawDecal(R, b.cx, b.cz, spread * 1.05, [0.05, 0.06, 0.08], 0.38 * lift, false, viewProj);
    drawDecal(R, b.cx, b.cz, spread * 0.60, [0.04, 0.05, 0.07], 0.34 * lift, false, viewProj);

    if (ctx.game) {
      for (const k of ctx.game.kreaturen) {
        const f = (k.groesseFaktor !== undefined ? k.groesseFaktor : 1);
        if (f <= 0.01) continue;
        drawDecal(R, k.x, k.z, k.groesse * 1.45 * f, [0.05, 0.06, 0.08], 0.48, false, viewProj);
        if (ctx.game.zielId === k.id) {
          const pz = 1 + Math.sin(ctx.time * 5) * 0.04;
          drawDecal(R, k.x, k.z, (k.groesse * 1.8 + 0.35) * pz, [1.0, 0.80, 0.32], 0.70, true, viewProj);
        }
      }
      if (ctx.welt.friedhof) {
        drawDecal(R, ctx.welt.friedhof.x, ctx.welt.friedhof.z, 2.2, [0.62, 0.80, 0.98], 0.34, true, viewProj);
      }
    }

    if (slime.target) {
      const pulse = 1 + Math.sin(ctx.time * 6) * 0.08;
      drawDecal(R, slime.target.x, slime.target.z, 0.7 * pulse, [0.45, 1.0, 0.75], 0.8, true, viewProj);
    }
  }

  /* Die verformte Huelle in den Puffer schieben. Genau einmal je Bild — der
   * Rueckwand-Durchgang (58) und das Gel (60) zeichnen dasselbe Netz, und ein
   * ausgelassener Upload kostet ein Bild Verzug in der Verformung. */
  function huelleHochladen(gl, R, ctx) {
    const mesh = R.slimeMesh;
    if (!mesh || !mesh.vao || !ctx.surface) return null;
    if (R._huelleBild !== R._bildNr) {
      R._huelleBild = R._bildNr;
      gl.bindVertexArray(mesh.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.positions);
      if (mesh.nb) {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nb);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ctx.surface.normals);
      }
    }
    return mesh;
  }

  /* Farbe der Rueckwand. gel.js veroeffentlicht seine schon aufgeloeste
   * Palette unter R.gel.farbe (Fraktion UND Todeszustand eingerechnet) — die
   * ist die richtige Quelle, sobald das Modul laeuft. Fehlt es, tut es die
   * Fraktionsfarbe aus der Tabelle in dieser Datei. */
  const _schale = new Float32Array(3);
  function schalenFarbe(R, ctx) {
    const f = R.gel && R.gel.farbe;
    const q = (f && f.kern) || ctx.pal.mid;
    _schale[0] = q[0]; _schale[1] = q[1]; _schale[2] = q[2];
    return _schale;
  }

  /* ------------------------------------------------------------------------
   * Die Rueckwand des Gels (Ordnung 58) — der Grund, warum kein Grashalm mehr
   * mitten im Koerper steht.
   *
   * Ein durchscheinender Koerper schreibt keine Tiefe; er kann den Hintergrund
   * also nicht verdecken, er kann ihn nur einfaerben. Beim Gel bleibt davon je
   * nach Kanal ein Drittel stehen — und ein gruener Halm vor blauem Grund ist
   * genau der Fall, in dem dieses Drittel als eigener Gegenstand gelesen wird.
   * Er steht dann IM Schleim, und die Silhouette, die nach GRAFIK-MODULE.md §0
   * die Lesbarkeit traegt, ist hin.
   *
   * Die Behebung ist eine Reihenfolge, keine Formel:
   *
   *   1. alles Undurchsichtige mit Tiefenschreiben  (Boden 20 … Dekale 50)
   *   2. HIER: die ABGEWANDTE Seite der Huelle, undurchsichtig und mit
   *      Tiefenschreiben. Sie legt sich ueber alles, was HINTER dem Koerper
   *      liegt, und laesst alles stehen, was DAVOR oder DARIN liegt — denn
   *      genau das ist naeher als die Rueckwand und besteht den Tiefentest
   *      bereits. Ein gefressener Gegner (GDD 01 §28) steckt zwischen Vorder-
   *      und Rueckflaeche, bleibt also erhalten; ebenso Augen und Mund, die
   *      dicht unter der Vorderflaeche sitzen.
   *   3. das Gel selbst, Tiefentest gegen das Vorhandene, ohne Tiefenschreiben
   *      (Ordnung 60). Es rechnet jetzt gegen die Rueckwand statt gegen die
   *      Wiese.
   *   4. was darueber liegt: Glanz (70), Extras (90), post (95).
   *
   * Warum nicht einfach das Gel dichter machen: dann verschwindet auch der
   * Gegner im Koerper, und das ist keine Kosmetik, sondern eine Kernanforderung.
   * Die Rueckwand trennt beide Faelle sauber — sie unterscheidet „dahinter"
   * von „darin", und nur das war das Problem.
   *
   * Am Silhouettenrand laeuft die Weglaenge gegen null, dort bleibt die
   * Rueckwandfarbe fast unveraendert stehen: der Rand wird eine klare, satte
   * Kante in der Fraktionsfarbe statt eines Fensters auf den Hintergrund.
   * Das ist die gewollte Richtung (§0: Silhouette traegt die Lesbarkeit).
   * ---------------------------------------------------------------------- */
  function zeichneGelSchale(gl, R, ctx) {
    const mesh = huelleHochladen(gl, R, ctx);
    if (!mesh) return;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);          // stehen bleibt die abgewandte Seite

    // uEmissive = 1 legt FS_SOLID flach: genau uColor, ohne Lichtrechnung.
    // Die Rueckwand soll nichts behaupten, sie soll nur verdecken.
    drawProp(R, mesh, M4.identity(), IDENTITY_N,
             schalenFarbe(R, ctx), 0, 1, ctx.cam, ctx.viewProj);

    gl.cullFace(gl.BACK);
  }

  /* Der Schleim: zwei durchscheinende Durchgaenge, Rueckseite zuerst.
   * Gezeichnet wird die feiner unterteilte Huelle, nicht das Physiknetz.
   * Ohne Tiefenschreiben — verdeckt wird von der Rueckwand (Ordnung 58). */
  function zeichneGel(gl, R, ctx) {
    const mesh = huelleHochladen(gl, R, ctx);
    if (!mesh) return;
    const pal = ctx.pal, params = ctx.params;

    gl.bindVertexArray(mesh.vao);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);

    const s = R.slime;
    gl.useProgram(s.p);
    gl.uniformMatrix4fv(s.u.uViewProj, false, ctx.viewProj);
    gl.uniformMatrix4fv(s.u.uModel, false, M4.identity());
    gl.uniformMatrix3fv(s.u.uNormalMat, false, IDENTITY_N);
    gl.uniform3fv(s.u.uCam, ctx.cam);
    gl.uniform3fv(s.u.uLight, ctx.licht.richtung);
    gl.uniform3fv(s.u.uDeep, pal.deep);
    gl.uniform3fv(s.u.uMid, pal.mid);
    gl.uniform3fv(s.u.uLightCol, pal.light);
    gl.uniform1f(s.u.uTime, ctx.time);
    gl.uniform1f(s.u.uBottom, 0);
    gl.uniform1f(s.u.uRadius, params.radius);

    gl.cullFace(gl.FRONT);                       // Rueckseite zuerst: Tiefe im Gel
    gl.uniform1f(s.u.uAlpha, 0.36);
    gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

    gl.cullFace(gl.BACK);
    // Der Fresnel-Term zieht die Deckkraft am Silhouettenrand auf 1: dort wird
    // die Kontur hart, in der Mitte bleibt das Gel durchsichtig.
    gl.uniform1f(s.u.uAlpha, 0.56);
    gl.drawElements(gl.TRIANGLES, mesh.count, mesh.typ || gl.UNSIGNED_SHORT, 0);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function zeichnePunkte(gl, R, ctx) {
    if (!ctx.debug) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    const b = ctx.slime.body;
    for (let i = 0; i < b.n; i += 1) {
      const k = i * 3;
      const r = 0.035;
      drawProp(R, R.propMesh, M4.trs(b.pos[k], b.pos[k + 1], b.pos[k + 2], r, r, r),
               normalMat(r, r, r), [1.0, 0.85, 0.3], 0, 0.9, ctx.cam, ctx.viewProj);
    }
  }

  /* Die Erweiterungen der Spiel-Lanes (combat.js, death.js, eat.js,
   * charakter.js). Sie haengen an R.extras und erwarten genau den ctx, den
   * renderer.js ihnen gibt — deshalb bekommen sie hier denselben. */
  function zeichneExtras(gl, R, ctx) {
    if (!R.extras || !R.extras.length) return;
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    for (const e of R.extras.slice().sort((a, b) => (a.order || 0) - (b.order || 0))) {
      try { e.draw(gl, ctx); } catch (err) { console.error('extra "' + e.name + '":', err); }
    }
  }

  /* Modulnamen, die einen anders heissenden Grundzug meinen. */
  const ERSATZ_NAME = {
    karte: 'hindernisse',
    props: 'hindernisse',
    terrain: 'boden',
    schleim: 'gel',
    dekal: 'dekale',
  };

  /* Welche Grundzuege verdraengt werden.
   *
   * Zwei Wege, und der erste ist der wichtige:
   *  1. NAMENSGLEICHHEIT. Ein Modul, das 'gel' heisst, ist der Schleim — es
   *     waere absurd, daneben noch den eingebauten Schleim zu zeichnen. Diese
   *     Regel gilt automatisch, weil sonst jeder der zehn Agenten ein Feld
   *     kennen muesste, das nirgends in seinem Auftrag steht; wer es vergisst,
   *     bekommt zwei Schleime uebereinander und sucht den Fehler bei sich.
   *  2. `ersetzt: 'boden'` bzw. `ersetzt: ['boden','dekale']` fuer alles, was
   *     anders heisst als der Durchgang, den es uebernimmt.
   * `ersetzt: false` schaltet Weg 1 ausdruecklich ab — fuer ein Modul, das
   *     zufaellig so heisst wie ein Grundzug, ihn aber nur ergaenzen will. */
  function verdraengte(module) {
    const s = new Set();
    for (const m of module) {
      if (m.ersetzt === false) continue;
      if (m.ersetzt) {
        for (const n of (Array.isArray(m.ersetzt) ? m.ersetzt : [m.ersetzt])) s.add(n);
        continue;
      }
      const auto = ERSATZ_NAME[m.name] || m.name;
      if (GRUNDZUEGE.some(g => g.name === auto)) s.add(auto);
    }
    return s;
  }

  const GRUNDZUEGE = [
    { name: 'himmel',      ordnung: 10, zeichnen: zeichneHimmel },
    { name: 'boden',       ordnung: 20, zeichnen: zeichneBoden },
    { name: 'hindernisse', ordnung: 30, zeichnen: zeichneHindernisse },
    { name: 'kreaturen',   ordnung: 40, zeichnen: zeichneKreaturen },
    { name: 'gesicht',     ordnung: 45, zeichnen: zeichneGesicht },
    { name: 'dekale',      ordnung: 50, zeichnen: zeichneDekale },
    { name: 'gelschale',   ordnung: 58, zeichnen: zeichneGelSchale },
    { name: 'gel',         ordnung: 60, zeichnen: zeichneGel },
    { name: 'punkte',      ordnung: 88, zeichnen: zeichnePunkte },
    { name: 'extras',      ordnung: 90, zeichnen: zeichneExtras },
  ];

  /* ==========================================================================
   * 6. Modulverwaltung
   * ======================================================================== */

  function einmalKlagen(R, schluessel, text, fehler) {
    if (R._geklagt.has(schluessel)) return;
    R._geklagt.add(schluessel);
    console.error(text, fehler || '');
  }

  /* Aufbau. Wirft ein Modul, wird es uebersprungen und der Rest laeuft weiter
   * (GRAFIK-MODULE.md §3). Wird bei jedem Bild fuer noch nicht aufgebaute
   * Module wiederholt — dadurch darf sich ein Modul auch nach createRenderer2
   * noch anmelden. */
  function moduleAufbauen(R) {
    for (const m of GRAFIK.module()) {
      if (m.aufgebaut || m.aus) continue;
      // Reglervorgaben einsammeln, bevor aufbau() sie lesen will.
      if (Array.isArray(m.regler)) {
        for (const r of m.regler) {
          if (m.wert[r.key] === undefined) m.wert[r.key] = r.wert;
        }
      }
      R.regler[m.name] = m.wert;
      try {
        if (m.aufbau) m.aufbau(R.gl, R);
        m.aufgebaut = true;
      } catch (e) {
        m.aus = true;
        console.error('GRAFIK: Modul "' + m.name + '" (ordnung ' + m.ordnung
          + ') ist im Aufbau gescheitert und wird uebersprungen. '
          + 'Der Rest des Bildes laeuft weiter.\n', e);
      }
    }
  }

  const aktiveModule = () => GRAFIK.module().filter(m => !m.aus && m.aufgebaut);

  /* ==========================================================================
   * 7. Aufbau des Renderers
   * ======================================================================== */

  function createRenderer2(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL2 wird von diesem Browser nicht unterstützt.');

    const R = {
      gl, canvas,
      pfad: 2,
      /* Lichtrichtung. Bleibt eine schlichte Eigenschaft, weil capture.js sie
       * direkt setzt (`R.light = [x,y,z]`) — die Grafik-Szenarien stellen so
       * den Sonnenstand. licht.js liest sie und legt daraus ctx.licht an. */
      light: [0.55, 0.78, 0.32],
      /* Erweiterungspunkt der Spiel-Lanes, formgleich mit renderer.js:
       * { name, order, draw(gl, ctx) }. */
      extras: [],
      regler: Object.create(null),
      _geklagt: new Set(),
      /* Bildzaehler. Nicht ctx.time: bei angehaltener Zeit waere die Huelle
       * sonst eingefroren, obwohl die Verformung weiterlaeuft. */
      _bildNr: 0,
      _huelleBild: -1,
    };

    R.slime  = GRAFIK.programm(gl, VS_LIT, FS_SLIME, 'gel (Grundzug)');
    R.solid  = GRAFIK.programm(gl, VS_LIT, FS_SOLID, 'fest (Grundzug)');
    R.ground = GRAFIK.programm(gl, VS_GROUND, FS_GROUND, 'boden (Grundzug)');
    R.himmel = GRAFIK.programm(gl, VS_HIMMEL, FS_HIMMEL, 'himmel (Grundzug)');
    R.decal  = GRAFIK.programm(gl, VS_DECAL, FS_DECAL, 'dekal (Grundzug)');

    const sphere = createIcosphere(2);
    R.propMesh = GRAFIK.mesh(gl, sphere.positions,
                             new Float32Array(sphere.positions), sphere.indices);
    const box = createBox();
    R.boxMesh = GRAFIK.mesh(gl, box.positions, box.normals, box.indices);
    const quad = new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]);
    R.quadMesh = GRAFIK.mesh(gl, quad, null, new Uint16Array([0, 1, 2, 0, 2, 3]));
    R.vollbild = GRAFIK.vollbild(gl);

    /* Formgleich mit renderer.js — death.js, eat.js, combat.js und
     * charakter.js rufen genau diese beiden auf. */
    R.drawProp = (mesh, model, nmat, color, gloss, emissive, cam, vp) =>
      drawProp(R, mesh, model, nmat, color, gloss, emissive, cam, vp);
    R.drawDecal = (x, z, radius, color, alpha, ring, vp) =>
      drawDecal(R, x, z, radius, color, alpha, ring, vp);

    /* Renderziel wechseln. Module, die zwischendurch woandershin zeichnen
     * (Schattenkarte, Bloompyramide), setzen ihr Ziel hiermit und schreiben
     * ihr Endziel nach ctx.ziel zurueck — renderScene2 bindet nach jedem Modul
     * ctx.ziel erneut, damit ein vergessenes Zuruecksetzen nicht das ganze
     * Bild verschluckt. */
    R.zielBinden = (ziel) => {
      const z = ziel || R.bildschirm;
      gl.bindFramebuffer(gl.FRAMEBUFFER, z.fbo || null);
      gl.viewport(0, 0, z.breite, z.hoehe);
      return z;
    };
    R.bildschirm = { fbo: null, breite: canvas.width, hoehe: canvas.height, hdr: false };

    /* Undurchsichtiger Grundzustand. Wer ihn braucht, ruft ihn — billiger als
     * jedes Modul einzeln zu belehren. */
    R.grundzustand = () => {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    };

    R.faehigkeiten = GRAFIK.faehigkeiten(gl);
    console.info(R.faehigkeiten.bericht());

    R.grundzuege = GRUNDZUEGE;
    moduleAufbauen(R);

    const mod = GRAFIK.module();
    console.info('GRAFIK: zweiter Renderpfad bereit. '
      + mod.length + ' Modul(e) angemeldet'
      + (mod.length ? ': ' + mod.map(m => m.name + '@' + m.ordnung
          + (m.aus ? ' (AUS)' : '')).join(', ') : '')
      + '. Bausteine: ' + GRAFIK.bausteine().join(', ') + '.');

    return R;
  }

  /* ==========================================================================
   * 8. Ein Bild
   * ======================================================================== */

  function renderScene2(R, scene) {
    const gl = R.gl;
    const { view, world, slime, camera, params, faction, time, debug } = scene;
    const pal = FACTIONS[faction] || FACTIONS.eldoran;

    const breite = (view && view.pw) || R.canvas.width;
    const hoehe = (view && view.ph) || R.canvas.height;
    R.bildschirm.breite = breite;
    R.bildschirm.hoehe = hoehe;
    R._bildNr = (R._bildNr + 1) | 0;

    /* Nachzuegler aufbauen: ein Modul darf sich auch nach createRenderer2
     * angemeldet haben. */
    moduleAufbauen(R);

    /* --- ctx (GRAFIK-MODULE.md §3) --------------------------------------- */
    const ctx = R.ctx || (R.ctx = {});
    ctx.camera = camera;
    ctx.cam = camera.eye;
    ctx.viewProj = camera.viewProj;
    ctx.invViewProj = camera.invViewProj;
    ctx.time = time;
    ctx.params = params;
    ctx.game = scene.game || null;
    ctx.slime = slime;
    ctx.surface = scene.surface;
    ctx.welt = world;
    ctx.world = world;                 // Kurzform, wie renderer.js sie den extras gibt
    ctx.pal = pal;
    ctx.faction = faction;
    ctx.debug = !!debug;
    ctx.view = view;
    ctx.breite = breite;
    ctx.hoehe = hoehe;
    ctx.regler = R.regler;
    ctx.faehigkeiten = R.faehigkeiten;
    ctx.szene = scene;

    /* Lichtvorgabe — die Uebersetzung des heutigen LICHT-Blocks aus
     * renderer.js in Werte.
     *
     * Sie wird JEDES Bild auf diese Vorgabe zurueckgesetzt, und zwar VOR den
     * vorbereiten()-Aufrufen. Damit hat licht.js (ordnung 0) freie Hand, ohne
     * dass es ein Uebernahmezeichen setzen muesste — und wenn licht.js einmal
     * fehlt oder abgeschaltet wurde, faellt das Bild sauber auf die Vorgabe
     * zurueck statt auf die halb ueberschriebenen Werte des letzten Bildes.
     * In die vorhandenen Felder geschrieben, nicht neu angelegt: sonst zeigt
     * eine Uniform, die sich jemand gemerkt hat, ins Leere.
     *
     * `richtung` ist R.light selbst, nicht eine Kopie — capture.js stellt den
     * Sonnenstand der Grafik-Szenarien ueber `R.light = [x,y,z]`. */
    const li = ctx.licht || (ctx.licht = {
      richtung: R.light,
      farbe: [0, 0, 0], himmel: [0, 0, 0], boden: [0, 0, 0],
      ambient: [0, 0, 0], dunst: [0, 0, 0], zenit: [0, 0, 0],
      staerke: 1, tageszeit: 0.5,
    });
    const setz = (z, r, g, b) => { z[0] = r; z[1] = g; z[2] = b; };
    li.richtung  = R.light;
    setz(li.farbe,   0.88,  0.85,  0.78);    // SONNE
    setz(li.himmel,  0.34,  0.38,  0.47);    // HIMMELLICHT
    setz(li.boden,   0.27,  0.26,  0.23);    // BODENLICHT
    setz(li.ambient, 0.34,  0.38,  0.47);
    setz(li.dunst,   0.405, 0.415, 0.425);   // HORIZONT
    setz(li.zenit,   0.135, 0.165, 0.225);   // ZENIT
    li.staerke = 1.0;
    li.tageszeit = 0.5;

    ctx.ziel = R.bildschirm;

    /* --- vorbereiten: ALLE Module zuerst ---------------------------------
     * Erst danach wird gezeichnet. Sonst haette ein Modul mit kleiner Ordnung
     * bereits gezeichnet, bevor licht.js ihm sagen konnte, wie das Licht
     * steht. */
    for (const m of aktiveModule()) {
      if (!m.vorbereiten) continue;
      try {
        m.vorbereiten(gl, R, ctx);
      } catch (e) {
        m.aus = true;
        console.error('GRAFIK: Modul "' + m.name + '" hat in vorbereiten() geworfen '
          + 'und wird fuer den Rest des Laufs abgeschaltet.\n', e);
      }
    }

    /* --- Bild leeren ------------------------------------------------------ */
    R.zielBinden(ctx.ziel);
    gl.clearColor(0.135, 0.165, 0.225, 1);
    gl.depthMask(true);                      // sonst raeumt clear die Tiefe nicht
    gl.depthFunc(gl.LESS);                   // ein Modul darf EQUAL/LEQUAL
                                             // hinterlassen haben (gel.js, glanz.js)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);

    /* --- Zeichenfolge: Grundzuege und Module nach ordnung verschraenkt ---- */
    const module = aktiveModule();
    const ersetzt = verdraengte(module);

    const folge = [];
    for (const g of R.grundzuege) {
      if (ersetzt.has(g.name)) continue;
      folge.push({ ordnung: g.ordnung, grund: g });
    }
    for (const m of module) {
      if (!m.zeichnen) continue;
      folge.push({ ordnung: m.ordnung || 0, modul: m });
    }
    // Stabil sortieren: bei gleicher Ordnung kommt der Grundzug zuerst, damit
    // ein zusaetzlich zeichnendes Modul auf ihm liegt statt darunter.
    folge.sort((a, b) => (a.ordnung - b.ordnung) || ((a.grund ? 0 : 1) - (b.grund ? 0 : 1)));

    for (const eintrag of folge) {
      if (eintrag.grund) {
        eintrag.grund.zeichnen(gl, R, ctx);
        continue;
      }
      const m = eintrag.modul;
      try {
        m.zeichnen(gl, R, ctx);
      } catch (e) {
        m.aus = true;
        console.error('GRAFIK: Modul "' + m.name + '" hat in zeichnen() geworfen '
          + 'und wird fuer den Rest des Laufs abgeschaltet.\n', e);
      }
      // Ziel zurueckbinden: ein Modul, das seine Schattenkarte bindet und das
      // Zuruecksetzen vergisst, wuerde sonst den Rest des Bildes verschlucken.
      R.zielBinden(ctx.ziel);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  /* ==========================================================================
   * 9. Ausgang
   * ======================================================================== */
  window.createRenderer2 = createRenderer2;
  window.renderScene2 = renderScene2;
  window.GRAFIK = GRAFIK;

})();
