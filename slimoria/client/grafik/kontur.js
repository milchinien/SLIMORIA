'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik, Schritt G5 — die Kontur als umgedrehte Huelle.
 *
 * Jedes undurchsichtige Objekt wird ein zweites Mal gezeichnet: Vorderseiten
 * verworfen, Punkte entlang der GEGLAETTETEN Normale nach aussen versetzt, in
 * einem dunklen, warmen Materialton. Was vom zweiten Durchgang uebrig bleibt,
 * ist genau der schmale Streifen, der ueber die Silhouette hinausragt.
 *
 * WARUM UEBERHAUPT
 * Es ist das Merkmal, an dem ein Blindrichter Genshin am schnellsten erkennt.
 * ref/tof/UNTERSCHIEDE.md §1 nennt es "der haerteste Einzelbefund": Genshin
 * zieht eine dunkle Linie, ToF zieht keine. Die Signatur ist ein
 * UNTERSCHWINGER — ein Pixel, der dunkler ist als BEIDE Nachbarn, und zwar
 * auch dort, wo Objekt und Hintergrund fast gleich hell sind. Genau das kann
 * ein Kantenfilter im Bildraum nicht, eine Geometriehuelle schon.
 *
 * Angesehenes Material, aus dem die Zahlen kommen (nicht aus dem Gefuehl):
 *   ref/genshin/figur_xingqiu_tageslicht_crop.png        Linie an vier Kanten
 *   ref/genshin/figur_traveler_tageslicht_crop.png       Haar gegen Himmel
 *   ref/genshin/figur_fischl_oberkoerper_cel_crop.png    Linie auf dunklem Grund
 *   ref/genshin/figur_xingqiu_tageslicht_schlagschatten_1920.png
 *   ref/genshin/landschaft_sumeru_dorf_tag_2560.png
 *   ref/tof/figur-nah-tageslicht-herbst.jpg              die Gegenprobe: keine
 *
 * Ein Befund aus den beiden Landschaftsbildern, der im Plan nicht steht und
 * den ich hier festhalte, weil er die naechste Runde betrifft: Genshin gibt
 * die Kontur den FIGUREN, nicht der Architektur. Treppenstufen, Pfeiler,
 * Steinlaternen und ferne Felsen in `figur_xingqiu_tageslicht_schlagschatten`
 * und `landschaft_sumeru_dorf_tag` haben keine Linie — ihre Kanten sind reine
 * Kantenglaettung. Die winzige, rund 40 px hohe Nebenfigur links im
 * Liyue-Bild hat dagegen eine, und sie ist dort genauso 1 px breit wie an der
 * nahen Figur. Fuer uns heisst das zweierlei: die Linie ist wirklich
 * distanzunabhaengig (das ist die Grundlage fuer die Vorgabe von
 * `fernAusduennung` weiter unten), und wenn ein Blindvergleich unsere Felsen
 * spaeter zu "gezeichnet" findet, ist die Linie an den REQUISITEN die
 * Stellschraube, nicht die an den Kreaturen. Ich baue diese Trennung hier
 * bewusst NICHT ein: sie liefe ueber einen Vergleich mit den beiden
 * Requisitenfarben aus renderer2.js, und der hoerte in dem Moment stumm auf
 * zu greifen, in dem Schritt G6 die Albedowerte anhebt. Ein Regler, der
 * unbemerkt aufhoert zu wirken, ist schlimmer als keiner.
 *
 * DIE ZWEI FALLEN, DIE DER AUFTRAG NENNT
 *
 * 1. DICKE UEBER DIE KAMERADISTANZ. Ein Versatz um feste Weltmeter ist nah
 *    dick und fern unsichtbar. Der Versatz muss deshalb in BILDPUNKTEN
 *    vorgegeben und in die passende Weltgroesse zurueckgerechnet werden.
 *    Der Plan (G5) macht das mit `px * z / 965.0`, wobei 965 = P11*H/2 fuer
 *    fovY 50 Grad und H 900 ist — richtig, aber die Zahl ist an Blickwinkel
 *    und Bildhoehe genagelt, und ein Modul, das den Sichtwinkel aendert,
 *    macht sie stumm falsch. Hier steht stattdessen die exakte Ableitung:
 *    wie weit wandert der Bildpunkt, wenn ich den Weltpunkt um einen Meter
 *    entlang der Normale schiebe? Das ist
 *
 *        d(clip.xy / clip.w) = (clipN.xy*clip.w - clip.xy*clipN.w) / clip.w^2
 *
 *    mal der halben Bildgroesse. Die Richtung dieses Vektors ist die
 *    Verschieberichtung im Bild, sein Betrag der Umrechnungsfaktor. Damit ist
 *    `uDicke` unmittelbar eine Bildpunktbreite — bei jeder Distanz, jedem
 *    Sichtwinkel, jedem Bildformat, und ohne eine einzige Konstante, die
 *    jemand nachpflegen muesste.
 *
 * 2. GEGLAETTETE NORMALE. Der Wuerfel aus `createBox` hat gespaltene
 *    Normalen: 24 Punkte auf 8 Ecken, je Seitenflaeche eine eigene. Eine
 *    Huelle entlang DIESER Normale schiebt die drei Quads einer Ecke in drei
 *    verschiedene Richtungen — an jeder Wuerfelkante reisst ein Loch auf, und
 *    die Kontur zerfaellt in Fetzen. WebGL2 hat keinen Geometrieshader, die
 *    Mittelung muss also auf der CPU passieren, genau wie bei Genshin (dort
 *    im Werkzeug des Kuenstlers). `glaetten()` weiter unten schweisst Punkte
 *    gleicher Lage zusammen, mittelt die Flaechennormalen FLAECHENGEWICHTET
 *    (das Kreuzprodukt wird ungenormt aufsummiert, sein Betrag ist die
 *    doppelte Dreiecksflaeche) und schreibt das Ergebnis in ein eigenes
 *    Attribut zurueck.
 *
 *    Bewusst ein EIGENES Attribut und nicht die Tangente: Genshin legt die
 *    geglaettete Normale in den Tangentenkanal und kann deshalb weder
 *    Normalmapping noch anisotrope Schattierung (ref/tof/UNTERSCHIEDE.md).
 *    Wir haben freie Attributplaetze, also machen wir diesen Fehler nicht.
 *
 *    Selbstprobe beim Aufbau: fuer unsere beiden Netze — Ikosphaere (Punkte
 *    liegen auf der Einheitskugel) und Wuerfel (jeder Punkt ist eine Ecke,
 *    drei gleich grosse Flaechen) — muss die geglaettete Normale exakt
 *    normalize(Position) sein. Weicht sie ab, ist `glaetten()` kaputt; die
 *    Abweichung wird in die Konsole geschrieben.
 *
 * WAS DIESES MODUL NICHT ANFASST
 * Den Schleim. Er ist durchscheinend, wird alphagemischt ohne Tiefenschreiben
 * gezeichnet, und eine Huelle hinter ihm waere DURCH ihn hindurch sichtbar —
 * die Silhouette wuerde matschig statt schaerfer. Er bekommt seine Silhouette
 * ueber `fwidth` in der Lane SCHLEIM (Plan §2 und G7). Ebenso ausgenommen:
 * Augen und Mund, erkennbar an uEmissive >= 0.30. Ein Anime-Gesicht bekommt
 * weder Schatten noch Umriss von aussen aufgezwungen.
 *
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 * Kein Math.random, kein Date, kein performance.now. Das Modul liest ueberhaupt
 * keine Zeit: die Kontur haengt nur an Geometrie und Kamera.
 * ------------------------------------------------------------------------- */

(function () {

  if (typeof GRAFIK === 'undefined' || typeof GRAFIK.modul !== 'function') return;

  /* =========================================================================
   * 1. Shader
   * ======================================================================= */

  const VS = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aGlatt;    // geglaettete Normale, auf der CPU gemittelt

uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uNormalMat;
uniform vec2 uHalbBild;   // (Breite/2, Hoehe/2) in Bildpunkten
uniform float uDicke;     // Zielbreite der Linie in Bildpunkten
uniform float uFern;      // 0 = ueberall gleich dick, 1 = Ausduennung ab uFernAb
uniform float uFernAb;    // Meter, ab denen ausgeduennt wird

void main() {
  vec4 welt = uModel * vec4(aPos, 1.0);

  /* Nicht aNormal: die waere am Wuerfel flaechenweise gespalten und die
   * Huelle risse an jeder Kante auf. */
  vec3 nWelt = normalize(uNormalMat * aGlatt);

  vec4 clip  = uViewProj * welt;
  vec4 clipN = uViewProj * vec4(nWelt, 0.0);

  /* Ableitung der Bildlage nach einer Verschiebung um einen Meter entlang
   * nWelt. Der gemeinsame Nenner clip.w^2 ist positiv und faellt beim
   * Normieren heraus — deshalb steht er hier nicht, das ist zugleich die
   * numerisch ruhigere Form. */
  vec2 dpix = (clipN.xy * clip.w - clip.xy * clipN.w) * uHalbBild;
  float laenge = length(dpix);
  vec2 richtung = laenge > 1e-9 ? dpix / laenge : vec2(0.0);

  /* clip.w ist bei perspektivischer Projektion der Augabstand in Metern.
   * Hinter der Kamera (w <= 0) wird geklemmt: solche Punkte schneidet die
   * Nahebene ohnehin weg, ein grosser Versatz dort erzeugte nur Zacken. */
  float w = max(clip.w, 1e-3);
  float px = uDicke * mix(1.0, clamp(uFernAb / w, 0.25, 1.0), uFern);

  /* Bildpunkte -> NDC -> Clipraum. Nach der Division durch w steht der Punkt
   * exakt px Bildpunkte weiter aussen. */
  clip.xy += richtung * (px / uHalbBild) * w;

  gl_Position = clip;
}`;

  const FS = `#version 300 es
precision highp float;
uniform vec3 uFarbe;
out vec4 outColor;
void main() { outColor = vec4(uFarbe, 1.0); }`;

  /* =========================================================================
   * 2. Geglaettete Normalen
   *
   * Punkte gleicher Lage zusammenschweissen, Flaechennormalen
   * flaechengewichtet mitteln, zurueckschreiben. Das ist die CPU-Haelfte, die
   * es braucht, weil WebGL2 keinen Geometrieshader hat.
   * ======================================================================= */

  /* Lagegleichheit ueber ein Gitter statt ueber einen Epsilon-Vergleich:
   * ein Vergleich waere O(n^2), das Gitter ist O(n) und fuer unsere Netze
   * (Kantenlaengen weit ueber 0.05) genau so trennscharf. */
  const GITTER = 1e4;

  /* `normalen` ist die Schattierungsnormale des Netzes und dient NUR dazu,
   * die Flaechennormale auszurichten.
   *
   * Warum das noetig ist, und zwar nachgemessen, nicht vermutet: `createBox`
   * in client/core.js hat KEINE einheitliche Umlaufrichtung — 4 seiner 12
   * Dreiecke laufen gegen ihre eigene Flaechennormale (nachgezaehlt: 8
   * gleichsinnig, 4 gegensinnig; die Ikosphaere ist mit 320:0 sauber). Ein
   * Mitteln der rohen Kreuzprodukte hebt an einer Wuerfelecke deshalb Beitraege
   * gegeneinander auf; die Selbstprobe unten meldete dafuer eine Abweichung
   * von 1,27 gegen normalize(Position), also rund 80 Grad Fehlrichtung. Die
   * Huelle waere an jeder zweiten Wuerfelkante nach INNEN gestuelpt.
   *
   * core.js ist gesperrt, und das gehoert dort auch nicht hin: eine Kontur
   * darf sich nicht darauf verlassen, dass ein fremdes Netz sauber gewickelt
   * ist. Deshalb wird jede Flaechennormale hier an der Schattierungsnormale
   * ihrer eigenen Punkte ausgerichtet, bevor sie in die Summe geht. */
  /* Umlaufrichtung pruefen. Liefert zwei Indexfelder:
   *
   *   `gerichtet`  — alle Dreiecke, verkehrte gewendet. Nur fuer die
   *                  Normalenmittelung. So bleibt die Eckennormale des
   *                  Wuerfels exakt (1,1,1)/sqrt(3), auch wenn Deckel und
   *                  Boden gleich aussortiert werden.
   *   `zeichnen`   — nur die von Haus aus richtig gewickelten Dreiecke.
   *                  Das ist der Satz, den die HUELLE zeichnen darf.
   *
   * WARUM DIE TRENNUNG — nachgemessen, nicht vermutet.
   *
   * `createBox` in client/core.js wickelt DECKEL UND BODEN jedes Kastens
   * verkehrt: in der Seitentabelle stehen fuer +Y und -Y die beiden
   * Flaechenachsen in umgekehrter Reihenfolge als bei den vier anderen
   * Seiten, dadurch laufen ihre vier Dreiecke gegen ihre eigene
   * Flaechennormale (nachgezaehlt: 8 richtig, 4 verkehrt; die Ikosphaere ist
   * mit 320:0 sauber). Folge im BESTEHENDEN Bild, auf BEIDEN Renderpfaden:
   * `gl.cullFace(BACK)` wirft Deckel und Boden weg — jede Mauer hat oben ein
   * Loch, man sieht durch sie hindurch auf den Boden dahinter. Das ist mit
   * `node kontur-schuss --pfad 1` genauso zu sehen wie mit Pfad 2, es ist
   * also ein Zustand von vorher (siehe BRAUCHT_FREMDAENDERUNG im Bericht).
   *
   * Fuer die Huelle folgt daraus eine Regel, die auch ohne diesen Fehler
   * richtig ist: DIE HUELLE DARF NUR UEBER DREIECKE GESPANNT WERDEN, DIE DAS
   * OBJEKT SELBST ALS OBERFLAECHE ZEICHNET. Baut man sie ueber ein Dreieck,
   * das der Grundzug wegwirft, dann sieht man durch das Loch im Objekt auf
   * die Innenseite der Huelle — und zwar grossflaechig. Gemessen: mit dem
   * Bodendeckel in der Huelle unterschieden sich bei dist 20 zwischen Dicke 0
   * und Dicke 1,3 ganze 116725 Pixel, ueber 940 davon in einer einzigen
   * Bildzeile quer durch die vordere Mauer. Eine 1,3-px-Linie kann das nie
   * sein: der Deckel der Huelle fuellte das Loch der Mauer in Konturfarbe.
   * Ohne die vier Dreiecke bleibt das Bild an der Mauer unveraendert, und die
   * Kontur an ihren senkrechten Kanten steht trotzdem. */
  function wickelnPruefen(positionen, indizes, normalen) {
    const gerichtet = indizes.slice();
    const zeichnen = [];
    let verkehrt = 0;
    for (let f = 0; f < indizes.length; f += 3) {
      const a = indizes[f] * 3, b = indizes[f + 1] * 3, c = indizes[f + 2] * 3;
      const ux = positionen[b] - positionen[a], uy = positionen[b + 1] - positionen[a + 1],
            uz = positionen[b + 2] - positionen[a + 2];
      const vx = positionen[c] - positionen[a], vy = positionen[c + 1] - positionen[a + 1],
            vz = positionen[c + 2] - positionen[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const q = normalen || positionen;
      const rx = q[a] + q[b] + q[c];
      const ry = q[a + 1] + q[b + 1] + q[c + 1];
      const rz = q[a + 2] + q[b + 2] + q[c + 2];
      if (nx * rx + ny * ry + nz * rz < 0) {
        gerichtet[f + 1] = indizes[f + 2];
        gerichtet[f + 2] = indizes[f + 1];
        verkehrt++;
      } else {
        zeichnen.push(indizes[f], indizes[f + 1], indizes[f + 2]);
      }
    }
    const gross = positionen.length / 3 > 65535;
    return {
      gerichtet,
      zeichnen: gross ? new Uint32Array(zeichnen) : new Uint16Array(zeichnen),
      verkehrt,
      gesamt: indizes.length / 3,
    };
  }

  function glaetten(positionen, indizes, normalen) {
    const n = positionen.length / 3;
    const summe = new Float32Array(n * 3);

    /* Schluessel -> Vertreterindex */
    const gruppe = new Map();
    const vertreter = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const key = Math.round(positionen[k] * GITTER) + ':'
                + Math.round(positionen[k + 1] * GITTER) + ':'
                + Math.round(positionen[k + 2] * GITTER);
      let v = gruppe.get(key);
      if (v === undefined) { v = i; gruppe.set(key, i); }
      vertreter[i] = v;
    }

    /* WINKELGEWICHTET, nicht flaechengewichtet.
     *
     * PHASE-GRAFIK-PLAN G5 schreibt "Flaechennormalen flaechengewichtet
     * mitteln". Das ist der Lehrbuchweg, und fuer unseren Wuerfel ist er
     * nachweislich falsch: eine Wuerfelseite ist ein Quad, das in zwei
     * Dreiecke zerlegt ist, und je nachdem, wo eine Ecke in dieser Zerlegung
     * liegt, gehoert sie zu einem oder zu zwei Dreiecken. Flaechengewichtet
     * bekommt dieselbe Ecke von einer Seite also das Gewicht 8 und von den
     * beiden anderen je 4 — die gemittelte Normale kippt nach
     * normalize(8,4,4) statt (1,1,1)/sqrt(3). Gemessen mit der Selbstprobe
     * unten: Abweichung 0,3382, und das ist exakt der Betrag, den diese
     * Rechnung vorhersagt. Die Huelle waere an jeder Wuerfelecke schief, und
     * zwar nicht wegen der Geometrie, sondern wegen der Zerlegung.
     *
     * Winkelgewichtet (Thuermer/Wuethrich) haengt nicht an der Zerlegung: die
     * Ecke sieht von jeder Seite genau 90 Grad, ob als ein Quadwinkel oder
     * als 45+45 ueber zwei Dreiecke. Das Ergebnis ist wieder exakt
     * (1,1,1)/sqrt(3), und die Ikosphaere bleibt unveraendert gut. */
    for (let f = 0; f < indizes.length; f += 3) {
      const a = indizes[f] * 3, b = indizes[f + 1] * 3, c = indizes[f + 2] * 3;
      const ux = positionen[b] - positionen[a];
      const uy = positionen[b + 1] - positionen[a + 1];
      const uz = positionen[b + 2] - positionen[a + 2];
      const vx = positionen[c] - positionen[a];
      const vy = positionen[c + 1] - positionen[a + 1];
      const vz = positionen[c + 2] - positionen[a + 2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;

      /* Ausrichten. Bezug ist die Schattierungsnormale der drei Punkte; fehlt
       * sie, die Richtung vom Ursprung zum Dreiecksschwerpunkt. */
      let rx, ry, rz;
      if (normalen) {
        rx = normalen[a] + normalen[b] + normalen[c];
        ry = normalen[a + 1] + normalen[b + 1] + normalen[c + 1];
        rz = normalen[a + 2] + normalen[b + 2] + normalen[c + 2];
      } else {
        rx = positionen[a] + positionen[b] + positionen[c];
        ry = positionen[a + 1] + positionen[b + 1] + positionen[c + 1];
        rz = positionen[a + 2] + positionen[b + 2] + positionen[c + 2];
      }
      if (nx * rx + ny * ry + nz * rz < 0) { nx = -nx; ny = -ny; nz = -nz; }

      const fl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (fl < 1e-20) continue;              // entartetes Dreieck, kein Beitrag
      nx /= fl; ny /= fl; nz /= fl;

      /* Innenwinkel an jedem der drei Punkte als Gewicht. */
      const ecke = [a, b, c];
      for (let e = 0; e < 3; e++) {
        const p0 = ecke[e], p1 = ecke[(e + 1) % 3], p2 = ecke[(e + 2) % 3];
        let e1x = positionen[p1] - positionen[p0];
        let e1y = positionen[p1 + 1] - positionen[p0 + 1];
        let e1z = positionen[p1 + 2] - positionen[p0 + 2];
        let e2x = positionen[p2] - positionen[p0];
        let e2y = positionen[p2 + 1] - positionen[p0 + 1];
        let e2z = positionen[p2 + 2] - positionen[p0 + 2];
        const l1 = Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z);
        const l2 = Math.sqrt(e2x * e2x + e2y * e2y + e2z * e2z);
        if (l1 < 1e-20 || l2 < 1e-20) continue;
        const cos = (e1x * e2x + e1y * e2y + e1z * e2z) / (l1 * l2);
        const winkel = Math.acos(cos < -1 ? -1 : cos > 1 ? 1 : cos);
        const g = vertreter[indizes[f + e]] * 3;
        summe[g] += nx * winkel; summe[g + 1] += ny * winkel; summe[g + 2] += nz * winkel;
      }
    }

    const aus = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const g = vertreter[i] * 3, k = i * 3;
      let x = summe[g], y = summe[g + 1], z = summe[g + 2];
      let l = Math.sqrt(x * x + y * y + z * z);
      if (l < 1e-12) {
        /* Entartet (alle Nachbardreiecke heben sich auf). Rueckfall auf die
         * Richtung vom Mittelpunkt weg — besser als eine Nullnormale, die
         * den Punkt gar nicht versetzt und die Linie unterbricht. */
        x = positionen[k]; y = positionen[k + 1]; z = positionen[k + 2];
        l = Math.sqrt(x * x + y * y + z * z) || 1;
      }
      aus[k] = x / l; aus[k + 1] = y / l; aus[k + 2] = z / l;
    }
    return aus;
  }

  /* Selbstprobe: fuer sternfoermige Netze um den Ursprung (Ikosphaere,
   * Wuerfel) MUSS die geglaettete Normale normalize(Position) sein. */
  function probeSternfoermig(name, positionen, glatt) {
    let schlimmste = 0;
    for (let i = 0; i < positionen.length; i += 3) {
      const l = Math.hypot(positionen[i], positionen[i + 1], positionen[i + 2]) || 1;
      const d = Math.hypot(glatt[i] - positionen[i] / l,
                           glatt[i + 1] - positionen[i + 1] / l,
                           glatt[i + 2] - positionen[i + 2] / l);
      if (d > schlimmste) schlimmste = d;
    }
    /* Schwelle 0,05: der Wuerfel muss praktisch exakt treffen (jeder Punkt ist
     * eine Ecke aus drei gleich grossen Flaechen, der Mittelwert ist also
     * (1,1,1)/sqrt(3) = normalize(Position)). Die Ikosphaere darf leicht
     * abweichen — ihre Dreiecke liegen als Sehnen unter der Kugel, und Punkte
     * mit fuenf Nachbarn mitteln minimal anders als solche mit sechs.
     * Gemessen: 0,0236, also 1,4 Grad. Was oberhalb von 0,05 landet, ist ein
     * Fehler in glaetten() oder ein Netz, das gar nicht sternfoermig ist. */
    if (schlimmste > 0.05) {
      console.warn('GRAFIK/kontur: geglaettete Normale von "' + name
        + '" weicht um ' + schlimmste.toFixed(4) + ' von normalize(Position) ab. '
        + 'Fuer ein sternfoermiges Netz sollte sie nahezu gleich sein — '
        + 'glaetten() oder die Umlaufrichtung des Netzes pruefen.');
    }
    return schlimmste;
  }

  /* =========================================================================
   * 3. Zustand des Moduls
   * ======================================================================= */

  let prog = null;
  let gl0 = null;
  let R0 = null;

  /* mesh.vao -> { vao, count, typ } fuer den Konturdurchgang */
  const NETZE = new Map();

  /* Aufgezeichnete undurchsichtige Zeichenaufrufe des laufenden Bildes. */
  const LISTE = [];
  let anzahl = 0;
  let sammelt = false;

  /* Obergrenze, damit ein abgeschaltetes Modul (zeichnen() hat geworfen, also
   * raeumt niemand mehr auf) den Speicher nicht auffrisst. */
  const HOECHSTENS = 4096;

  function eintrag() {
    if (anzahl >= HOECHSTENS) return null;
    let e = LISTE[anzahl];
    if (!e) {
      e = LISTE[anzahl] = {
        netz: null, model: new Float32Array(16), nmat: new Float32Array(9),
        farbe: new Float32Array(3), emissiv: 0,
      };
    }
    anzahl++;
    return e;
  }

  /* =========================================================================
   * 4. Aufzeichnung
   *
   * Die eingebauten Grundzuege rufen ihre eigene, dateiinterne drawProp() —
   * nicht R.drawProp. Von aussen ist da nichts einzuhaengen. Was allen
   * gemeinsam bleibt, ist der WebGL-Kontext: also merke ich mir die
   * Uniformwerte, die auf das Programm R.solid gesetzt werden, und die
   * Zeichenaufrufe, die darauf folgen.
   *
   * Bewusst KEIN gl.getUniform()-Rueckleser: das ist ein Synchronpunkt, rund
   * 90 Zeichenaufrufe mal vier Werte je Bild wuerden die Pipeline leerlaufen
   * lassen. Mitschreiben kostet nur JavaScript-Aufrufe.
   *
   * Die Fenster werden am Kontext einmal gesetzt und bleiben. Aufgezeichnet
   * wird nur, solange `sammelt` gilt; das Fahnenwort wird in vorbereiten()
   * gesetzt und in zeichnen() als ERSTES wieder geloescht. Wirft eine der
   * beiden Funktionen, schaltet renderer2.js das Modul ab und ruft es nie
   * wieder — dann steht `sammelt` auf false und die Fenster tun nichts mehr.
   * ======================================================================= */

  function fensterSetzen(gl, R) {
    if (gl.__konturFenster) return;
    gl.__konturFenster = true;

    const o = {
      useProgram: gl.useProgram,
      bindVertexArray: gl.bindVertexArray,
      uniformMatrix4fv: gl.uniformMatrix4fv,
      uniformMatrix3fv: gl.uniformMatrix3fv,
      uniform3fv: gl.uniform3fv,
      uniform1f: gl.uniform1f,
      drawElements: gl.drawElements,
    };

    let aktuellesProgramm = null;
    let aktuellesVao = null;
    const merk = { model: null, nmat: null, farbe: null, emissiv: 0 };

    const istSolid = () => R.solid && aktuellesProgramm === R.solid.p;

    gl.useProgram = function (p) { aktuellesProgramm = p; return o.useProgram.call(this, p); };
    gl.bindVertexArray = function (v) { aktuellesVao = v; return o.bindVertexArray.call(this, v); };

    gl.uniformMatrix4fv = function (loc, tr, val) {
      if (sammelt && istSolid() && loc === R.solid.u.uModel) merk.model = val;
      return o.uniformMatrix4fv.apply(this, arguments);
    };
    gl.uniformMatrix3fv = function (loc, tr, val) {
      if (sammelt && istSolid() && loc === R.solid.u.uNormalMat) merk.nmat = val;
      return o.uniformMatrix3fv.apply(this, arguments);
    };
    gl.uniform3fv = function (loc, val) {
      if (sammelt && istSolid() && loc === R.solid.u.uColor) merk.farbe = val;
      return o.uniform3fv.apply(this, arguments);
    };
    gl.uniform1f = function (loc, val) {
      if (sammelt && istSolid() && loc === R.solid.u.uEmissive) merk.emissiv = val;
      return o.uniform1f.apply(this, arguments);
    };

    gl.drawElements = function (modus, anz, typ, versatz) {
      const r = o.drawElements.apply(this, arguments);
      if (sammelt && istSolid() && merk.model && merk.nmat && merk.farbe) {
        const netz = NETZE.get(aktuellesVao);
        if (netz) {
          const e = eintrag();
          if (e) {
            /* Kopieren, nicht merken: renderer2.js gibt jedem Zeichenaufruf
             * DIESELBE Kratzmatrix (_mm/_nm). Wer sie sich nur merkt, hat am
             * Ende 90 Zeiger auf das letzte Objekt. */
            e.netz = netz;
            e.model.set(merk.model);
            e.nmat.set(merk.nmat);
            e.farbe.set(merk.farbe);
            e.emissiv = merk.emissiv;
          }
        }
      }
      return r;
    };
  }

  /* =========================================================================
   * 5. Modul
   * ======================================================================= */

  const modul = {
    name: 'kontur',

    /* Ordnung 46, nicht 60.
     *
     * Die Huelle schreibt und prueft Tiefe, sie muss also nach allem
     * Undurchsichtigen kommen (hindernisse 30, kreaturen 40, gesicht 45) —
     * sonst uebermalen die Koerper ihre eigene Linie. Sie muss aber VOR dem
     * Gel (60) kommen: das Gel ist alphagemischt und schreibt KEINE Tiefe.
     * Eine Kontur danach wuerde ihre Tiefenpruefung gegen einen Puffer
     * fahren, in dem das Gel gar nicht steht, und die Linie einer Kreatur
     * HINTER dem Schleim laege quer ueber dem Schleim. Zwischen 45 und 50 ist
     * das einzige Fenster, in dem beides stimmt. */
    ordnung: 46,

    regler: [
      /* 1,3 px. [BELEGT] ref/tof/UNTERSCHIEDE.md §1: 1-3 px bei nativ 1920,
       * also 1-2,5 px bei 1600x900; PHASE-GRAFIK-PLAN G5: 1-1,5 px an vier
       * Figurengroessen gemessen. Die Mitte der beiden Angaben ist 1,3. */
      { key: 'dicke', min: 0, max: 4, step: 0.05, wert: 1.3 },

      /* Konturfarbe als Faktor auf die Objektfarbe. [BELEGT/GERECHNET]
       * Mittelwert zweier Messungen an figur_xingqiu: violetter Strumpf
       * (0.59,0.33,0.24), weisser Aermel (0.72,0.49,0.46). Kein Schwarz —
       * ein schwarzer Umriss ist die Signatur billiger Cel-Nachbauten. */
      { key: 'tonRot',  min: 0, max: 1, step: 0.01, wert: 0.66 },
      { key: 'tonGruen', min: 0, max: 1, step: 0.01, wert: 0.41 },
      { key: 'tonBlau', min: 0, max: 1, step: 0.01, wert: 0.35 },

      /* Gesamtabdunklung obendrauf. 1,0 = genau die gemessenen Faktoren. */
      { key: 'dunkeln', min: 0.2, max: 1.5, step: 0.01, wert: 1.0 },

      /* Ausduennung in der Ferne. VORGABE AUS: der Auftrag verlangt rund
       * 1,3 px bei JEDER Distanz, und die Messung stuetzt das — die Linie
       * bleibt ueber vier Figurengroessen (355/555/928/1221 px) bei 1 px, und
       * die 40 px hohe Nebenfigur im Liyue-Bild hat dieselbe Breite wie die
       * nahe. ref/tof/UNTERSCHIEDE.md §7 fuehrt die Distanzabhaengigkeit
       * ausdruecklich als NICHT BELEGT. Der Plan schlaegt sie trotzdem vor
       * (1/z ab 12 m, damit ferne Objekte nicht verklumpen); wer sie will,
       * stellt hier auf 1. */
      { key: 'fernAusduennung', min: 0, max: 1, step: 0.05, wert: 0 },
      { key: 'fernAb', min: 2, max: 60, step: 1, wert: 12 },

      /* Objekte unter dieser Bildgroesse bekommen keine Linie. Verhindert,
       * dass ein 6 px grosses Auge oder eine ferne Hornspitze zum dunklen
       * Klecks wird. 0 = aus. */
      { key: 'mindestPx', min: 0, max: 20, step: 0.5, wert: 3.5 },
    ],

    aufbau(gl, R) {
      gl0 = gl; R0 = R;
      prog = GRAFIK.programm(gl, VS, FS, 'kontur');

      /* Die beiden eingebauten Netze anmelden. Beide sind sternfoermig um den
       * Ursprung, das Ergebnis der Glaettung muss also normalize(Position)
       * sein — die Probe schreibt es in die Konsole, wenn nicht. */
      if (typeof createIcosphere === 'function' && R.propMesh) {
        const s = createIcosphere(2);
        /* Die Ikosphaere liefert keine Normalen — Position und Normale sind
         * bei ihr dasselbe, genau wie renderer2.js es beim Anlegen macht. */
        netzAnmelden(gl, R.propMesh, s.positions, s.indices, s.positions, 'propMesh');
      }
      if (typeof createBox === 'function' && R.boxMesh) {
        const b = createBox();
        netzAnmelden(gl, R.boxMesh, b.positions, b.indices, b.normals, 'boxMesh');
      }
      if (!NETZE.size) throw new Error('kontur: kein einziges Netz angemeldet — '
        + 'weder propMesh noch boxMesh vorhanden.');

      fensterSetzen(gl, R);

      /* Notausgang fuer andere Module: eigene Netze anmelden bzw. eine Huelle
       * fuer eine Geometrie bestellen, die nicht ueber R.solid laeuft. */
      GRAFIK.kontur = {
        netzAnmelden: (mesh, pos, idx, nrm, name) =>
          netzAnmelden(gl, mesh, pos, idx, nrm, name),
        anmelden(mesh, model, nmat, farbe, emissiv) {
          if (!sammelt) return false;
          const netz = NETZE.get(mesh && mesh.vao);
          if (!netz) return false;
          const e = eintrag();
          if (!e) return false;
          e.netz = netz;
          e.model.set(model);
          e.nmat.set(nmat);
          e.farbe.set(farbe);
          e.emissiv = emissiv || 0;
          return true;
        },
      };
    },

    vorbereiten(gl, R, ctx) {
      sammelt = false;     // zuerst aus: wirft der Rest, bleibt es aus
      anzahl = 0;
      sammelt = true;      // ab hier zeichnen die Grundzuege, ab hier wird gehoert
    },

    zeichnen(gl, R, ctx) {
      sammelt = false;
      if (!prog || anzahl === 0) return;

      const w = modul.wert;
      const dicke = w.dicke;
      if (dicke <= 0) return;

      const halbB = Math.max(1, ctx.breite) * 0.5;
      const halbH = Math.max(1, ctx.hoehe) * 0.5;

      /* Umgebungsanteil, auf die Vorgabe normiert. Die gemessenen Tonfaktoren
       * gelten bei Tageslicht; wuerde man sie mit dem rohen Umgebungslicht
       * (0.34,0.38,0.47) multiplizieren, waere die Linie sofort dreimal zu
       * dunkel und blaustichig. Normiert heisst: bei Vorgabelicht genau 1,
       * bei halbiertem Licht 0,5 — und nach OBEN geklemmt, damit die Kontur
       * bei hellem Licht nicht mit aufhellt. Ohne diese Klemmung waere die
       * Linie mittags heller als das Objekt daneben im Schatten und der
       * Unterschwinger kippte ins Gegenteil. */
      const amb = (ctx.licht && ctx.licht.ambient) || VORGABE_AMBIENT;
      const dn = w.dunkeln;
      const tR = w.tonRot  * dn * Math.min(1, amb[0] / VORGABE_AMBIENT[0]);
      const tG = w.tonGruen * dn * Math.min(1, amb[1] / VORGABE_AMBIENT[1]);
      const tB = w.tonBlau * dn * Math.min(1, amb[2] / VORGABE_AMBIENT[2]);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);        // die Vorderseiten fliegen raus, das ist der Trick

      gl.useProgram(prog);
      gl.uniformMatrix4fv(prog.u.uViewProj, false, ctx.viewProj);
      gl.uniform2f(prog.u.uHalbBild, halbB, halbH);
      gl.uniform1f(prog.u.uFern, w.fernAusduennung);
      gl.uniform1f(prog.u.uFernAb, w.fernAb);
      gl.uniform1f(prog.u.uDicke, dicke);

      const cam = ctx.cam;
      const mindest = w.mindestPx;
      const p11 = P11(ctx.viewProj);
      let letztesVao = null;

      for (let i = 0; i < anzahl; i++) {
        const e = LISTE[i];

        /* Augen und Mund: eigene Netze mit hohem uEmissive, gezeichnet im
         * Koerper des Schleims. Ein Ring um die Pupille ist kein Umriss,
         * sondern ein Fehler. */
        if (e.emissiv >= 0.30) continue;

        const m = e.model;

        /* Bildgroesse abschaetzen: der groesste Spaltenbetrag der oberen 3x3
         * ist der Halbmesser in Metern; geteilt durch den Augabstand, mal der
         * halben Bildhoehe, mal P11 ergibt den Halbmesser in Bildpunkten. */
        if (mindest > 0) {
          const radius = Math.max(Math.hypot(m[0], m[1], m[2]),
                                  Math.hypot(m[4], m[5], m[6]),
                                  Math.hypot(m[8], m[9], m[10]));
          const z = Math.hypot(m[12] - cam[0], m[13] - cam[1], m[14] - cam[2]) || 1e-3;
          if (radius / z * halbH * p11 < mindest) continue;
        }

        gl.uniformMatrix4fv(prog.u.uModel, false, m);
        gl.uniformMatrix3fv(prog.u.uNormalMat, false, e.nmat);
        gl.uniform3f(prog.u.uFarbe,
          e.farbe[0] * tR, e.farbe[1] * tG, e.farbe[2] * tB);

        if (e.netz.vao !== letztesVao) { gl.bindVertexArray(e.netz.vao); letztesVao = e.netz.vao; }
        gl.drawElements(gl.TRIANGLES, e.netz.count, e.netz.typ, 0);
      }

      gl.cullFace(gl.BACK);
      gl.bindVertexArray(null);
      anzahl = 0;
    },
  };

  /* Vorgabe-Umgebungslicht aus renderer2.js. Bezugspunkt fuer die Normierung
   * der Konturfarbe — nicht der Wert selbst, sondern das Verhaeltnis zu ihm
   * zaehlt. */
  const VORGABE_AMBIENT = [0.34, 0.38, 0.47];

  /* P11 (der senkrechte Projektionsfaktor) aus einer ViewProj-Matrix. Bei
   * P*V ist die y-Zeile des Produkts P11 mal die y-Zeile der Sichtmatrix, und
   * die ist eine Einheitsachse — der Betrag der Zeile ist also P11 selbst.
   * So braucht dieses Modul den Sichtwinkel nirgends als Konstante. */
  function P11(vp) {
    return Math.hypot(vp[1], vp[5], vp[9]) || 1;
  }

  /* Ein Netz fuer den Konturdurchgang anmelden: geglaettete Normalen rechnen,
   * eigenen VAO aus dem FREMDEN Positionspuffer und dem EIGENEN Normalpuffer
   * bauen. Der Positionspuffer wird nur gelesen — das Netz selbst bleibt
   * unangetastet, sein eigener VAO auch. */
  function netzAnmelden(gl, mesh, positionen, indizes, normalen, name) {
    if (!mesh || !mesh.vao || !mesh.pb || !mesh.ib) return null;
    if (NETZE.has(mesh.vao)) return NETZE.get(mesh.vao);

    const pos = positionen instanceof Float32Array ? positionen : new Float32Array(positionen);
    const idx = (indizes instanceof Uint16Array || indizes instanceof Uint32Array)
              ? indizes : new Uint16Array(indizes);
    const nrm = normalen instanceof Float32Array ? normalen
              : (normalen ? new Float32Array(normalen) : null);

    const wick = wickelnPruefen(pos, idx, nrm);
    if (wick.verkehrt) {
      console.warn('GRAFIK/kontur: Netz "' + (name || '?') + '": ' + wick.verkehrt
        + ' von ' + wick.gesamt + ' Dreiecken laufen gegen ihre eigene '
        + 'Flaechennormale. Der Grundzug wirft sie per cullFace(BACK) weg — das '
        + 'Objekt hat dort ein Loch, auf BEIDEN Renderpfaden. Die Huelle laesst '
        + 'sie deshalb ebenfalls aus, statt das Loch in Konturfarbe zuzumauern. '
        + 'Ursache und Behebung: createBox in client/core.js, Seitentabelle +Y '
        + 'und -Y, dort stehen die beiden Flaechenachsen vertauscht.');
    }
    if (!wick.zeichnen.length) return null;

    const glatt = glaetten(pos, wick.gerichtet, nrm);
    probeSternfoermig(name || 'netz', pos, glatt);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pb);   // fremder Puffer, nur gelesen
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, glatt, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    /* EIGENES Indexfeld — nicht mesh.ib: es enthaelt nur die Dreiecke, die
     * das Objekt selbst als Oberflaeche zeichnet. */
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wick.zeichnen, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const eintragNetz = {
      vao,
      count: wick.zeichnen.length,
      typ: (wick.zeichnen instanceof Uint32Array) ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    };
    NETZE.set(mesh.vao, eintragNetz);
    return eintragNetz;
  }

  GRAFIK.modul(modul);

})();
