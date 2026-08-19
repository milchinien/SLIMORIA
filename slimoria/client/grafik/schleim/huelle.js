'use strict';
/* ===========================================================================
 * schleim/huelle.js — die Silhouette des Koerpers, bevor sie jemand zeichnet
 *
 * Ordnung 58. Dieses Modul ZEICHNET NICHTS. Es reicht die Huelle weiter, die
 * alle anderen dann zeichnen: `ctx.surface` zeigt nach diesem Modul auf eine
 * aufbereitete Fassung mit denselben Dreiecken, aber ruhigeren Punkten und
 * neuen Normalen.
 *
 * ---------------------------------------------------------------------------
 * WAS DIE VORLAGE ZEIGT (angesehen, nicht vermutet)
 *
 *   ref/slime-rancher/sr1-rock-slime-rest-dome-face-closeup.jpg
 *        Koerper 547 x 524 px in 1832 x 1030 — 51 % der Bildhoehe. Der Umriss
 *        hat NULL gerade Stuecke und keinen einzigen Knick.
 *   ref/slime-rancher/sr2-extreme-squash-spread-base.jpg
 *        rund 430 px (40 %), extrem gestaucht: der Rocksaum unten ist EIN
 *        durchgehender Bogen, keine Kette aus Sehnen.
 *   ref/slime-rancher/sr1-extreme-flatten-disc-skirt.jpg
 *        zur Scheibe geplattet — auch dort nur zwei Kruemmungen, kein Knick.
 *   ref/blob-jelly/slime-heroes-screenshot-2.jpg
 *        Koerper 250 px, Tropfenform: drei grosse Boegen, sonst nichts.
 *   ref/slime-rancher/sr1-single-pink-rest-form-clean.jpg
 *        Koerper 180 px, ein Ei-Umriss aus zwei Boegen.
 *
 * Die gemeinsame Sprache: die Silhouette besteht aus DREI BIS FUENF grossen
 * Boegen mit stetig wandernder Kruemmung, und zwar noch bei der DOPPELTEN
 * Bildschirmgroesse unseres Schleims (unser Koerper misst 210–260 px). Genau
 * das ist GRAFIK-MODULE.md §0: „Silhouette traegt die Lesbarkeit", „Form durch
 * Umriss", „wenige grosse Elemente".
 *
 * ---------------------------------------------------------------------------
 * DER BEFUND — gemessen, nicht vermutet
 *
 * Der gezeichnete Koerper entsteht in `core.js` in drei Stufen:
 *
 *      Icosphere Stufe 2      162 Punkte   das Physiknetz
 *   -> Loop-Unterteilung      642 Punkte   `coarse`, relaxLambda = 0
 *   -> Loop-Unterteilung     2562 Punkte   `surface`, ein Taubin-Durchgang
 *
 * Am fertigen Netz (2562 Punkte, 5120 Dreiecke, 7680 Kanten, geschlossen und
 * mannigfaltig — nachgemessen) sieht die Verteilung der KNICKWINKEL zwischen
 * benachbarten Dreiecken bei `aufprall`, Bild 3 so aus:
 *
 *      p50   1,88 Grad      <- so glatt wie eine Kugel dieser Feinheit
 *      p90   4,97
 *      p95   9,90
 *      p99  25,73
 *      p999 82,66
 *      max 114,13 Grad      <- eine Rasierklinge, kein Koerper
 *
 * Das ist die eigentliche Nachricht: die Huelle ist im MITTEL vollkommen
 * glatt. Kaputt ist ein SCHWANZ von rund hundert Kanten — 114 ueber 20 Grad,
 * 13 ueber 60 Grad. Genau diese hundert Kanten sind es, die man bei
 * vierfacher Vergroesserung sieht:
 *
 *   wabbeln #10     der Bodenrand links unten laeuft in drei geraden Stuecken
 *                   von rund 40 px statt in einem Bogen.
 *   aufprall #3     die linke Flanke hat vier deutliche Knicke; der Umriss ist
 *                   dort ein Streckenzug.
 *   rueckschnapp #8 quer ueber den Koerper stehen gerade, harte Falten.
 *
 * Dazu die Kantenlaengen: min 0,0077 — p50 0,0807 — max 0,1642. Ein
 * Verhaeltnis von 21 : 1. An den gestauchten Stellen sind die Dreiecke lang
 * und duenn, und dort kippen die flaechengewichteten Normalen aus `core.js`.
 *
 * ---------------------------------------------------------------------------
 * ZWEI SACKGASSEN — beide gebaut, gemessen und wieder ausgebaut. Sie stehen
 * hier, damit sie nicht ein zweites Mal gebaut werden.
 *
 * (1) TAUBIN UEBER DAS GANZE NETZ. Der naheliegende Griff.
 *
 *      vier Durchgaenge 0,50 / -0,53   p99 25,73 -> 24,20   max 114 -> 96
 *      Kosten (SwiftShader, p10 der Zeichenzeit)            +1,6 ms je Bild
 *
 *     Eineinhalb Grad auf p99 fuer anderthalb Millisekunden. Der Grund ist die
 *     Rechnung selbst: ein Spektralfilter daempft nach WELLENLAENGE IN KANTEN.
 *     Bei 21 : 1 gestreuten Kantenlaengen hat die sichtbare Falte aber keine
 *     Wellenlaenge — sie ist ein einzelner, oertlicher Knick. Ein Filter, der
 *     alles gleich behandelt, muss dafuer entweder viel zu schwach oder viel
 *     zu teuer eingestellt werden. Der Regler `taubin` steht auf 0; er bleibt
 *     erhalten, damit der Befund nachprüfbar ist statt nur behauptet.
 *
 * (2) TAUBIN-PAAR AUF DER TEILMENGE, an Ort und Stelle gerechnet. Klang nach
 *     dem Besten aus beidem und war das Schlechteste: gemessen an `aufprall`
 *     p99 42,0 -> 44,2, also HOEHER als ohne Behandlung. Zwei Gruende:
 *       - (1-lambda k)(1-mu k) gilt fuer VOLLE Durchgaenge. Auf einer
 *         Teilmenge liest der aufblaehende Schritt einen Schwerpunkt, der
 *         gerade eingelaufen ist, und schiesst darueber hinaus.
 *       - An Ort und Stelle liest ein Punkt Nachbarn, die in derselben Runde
 *         schon gewandert sind. Auf einem Grat laeuft das der Gratlinie
 *         entlang und schiebt den Knick weiter, statt ihn abzutragen.
 *     Gerechnet wird deshalb JACOBI und OHNE aufblaehenden Schritt.
 *
 * ---------------------------------------------------------------------------
 * WAS GEMACHT WIRD — Knickbegrenzung
 *
 * Behandelt wird, was kaputt ist, und nur das.
 *
 * 1. Flaechennormalen aller Dreiecke ausrechnen.
 * 2. Ueber die Kanten laufen: wo zwei benachbarte Dreiecke steiler als
 *    `knickGrad` gegeneinander stehen, sind beide Endpunkte markiert. Der
 *    Fall „Oberflaeche in sich selbst gefaltet" braucht keinen eigenen Test —
 *    ein umgestuelptes Dreieck liegt zwangslaeufig ueber 90 Grad und steht
 *    damit ohnehin in dieser Liste.
 * 3. Markierung um einen Ring ausweiten. Ohne das sitzt die Reparatur in
 *    einem Krater, dessen Rand im Umriss genauso auffaellt wie die Falte.
 * 4. Ein Laplace-Schritt (JACOBI, `lambda`) auf der Markierung: erst alles aus
 *    dem unveraenderten Stand rechnen, dann zurueckschreiben.
 * 5. Wiederholen, `runden` mal. Der SUCHLAUF ist der teure Teil, nicht das
 *    Ziehen: er faehrt ueber alle Dreiecke des beruehrten Gebiets, das Ziehen
 *    nur ueber dessen Punkte. Deshalb wird nur jede `pruefJede`-te Runde neu
 *    gesucht — und in jedem Fall die letzte.
 * 6. Ist nichts bewegt worden, werden auch die Normalen NICHT neu gerechnet:
 *    dann wird die Huelle unveraendert durchgereicht.
 *
 * Ohne aufblaehenden Schritt schrumpft die behandelte Stelle ein wenig. Das
 * ist unbedenklich, weil dieses Modul JEDES Bild von der unbearbeiteten Huelle
 * ausgeht: es gibt keine Anhaeufung ueber die Zeit, also kein Einfallen des
 * Koerpers. Gemessen ueber `aufprall`: Hoehe 1,75 -> 1,74 (-0,6 %), Breite
 * 2,06 -> 2,03 (-1,5 %). Die Verformung bleibt also lesbar (GDD 01 §63).
 *
 * Die Normalen, falls sie neu gerechnet werden, bekommen MAX-GEWICHTE:
 * Beitrag eines Dreiecks an seiner Ecke a ist n / (|ab|^2 |ac|^2) statt der
 * Flaeche. Bei einem 21 : 1 gestreuten Netz ist das der Unterschied zwischen
 * einer Normale, die dem groessten Nachbardreieck folgt, und einer, die der
 * Oberflaeche folgt. `gel.js` potenziert die Normale im Fresnel-Term mit 3 —
 * jeder Fehler darin steht dreifach im Rand.
 *
 * ---------------------------------------------------------------------------
 * WAS ES BRINGT UND WAS ES KOSTET (knickGrad 12, runden 12, lambda 0,90,
 * pruefJede 3 — Mittel ueber alle Bilder des Szenarios, Knickwinkel in Grad
 * ueber ALLE 7680 Kanten vorher und nachher gemessen)
 *
 *                     p95            p99            >20 Grad      >60 Grad
 *   aufprall     11,0 -> 9,7    41,0 -> 20,0    132 -> 77      36 -> 8
 *   wabbeln      12,7 -> 10,8  118,2 -> 31,9    195 -> 129    108 -> 37
 *
 * Kosten, SwiftShader, p10 der Zeichenzeit ueber 80 Laeufe, `aufprall`:
 *
 *   Modul aus                       1,50 ms
 *   runden 0 (nur der Suchlauf)     1,70 ms     +0,20
 *   runden 6                        2,70 ms     +1,20
 *   runden 12  <- Vorgabe           3,00 ms     +1,50
 *   runden 20                       4,00 ms     +2,50
 *
 * Anderthalb Millisekunden gegen 16,7 ms Budget bei 60 Hz, und der Regler
 * `runden` ist der Knopf, an dem man dreht, wenn es woanders eng wird:
 * bei 6 Runden bleibt gut die Haelfte der Wirkung fuer 1,2 ms.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE PUNKTE NICHT ZURUECKGESCHRIEBEN WERDEN
 *
 * `ctx.surface.positions` gehoert `game.js` und wird dort jeden Physiktick neu
 * gefuellt. Wuerde dieses Modul hineinschreiben, haenge das Ergebnis daran,
 * wie oft zwischen zwei Ticks gezeichnet wird: zwei Bilder ohne Tick dazwischen
 * ergaeben eine zweimal behandelte Huelle. Deshalb wird in EIGENE Puffer
 * gerechnet und `ctx.surface` auf ein Objekt umgehaengt, das per Prototyp alle
 * uebrigen Felder der Vorlage erbt. Gleiche Eingabe, gleiche Ausgabe.
 *
 * Wer die unbearbeitete Huelle braucht, findet sie unter `R.huelle.quelle`.
 *
 * ---------------------------------------------------------------------------
 * ORDNUNG 58 — warum genau dort
 *
 * Vor 58 liest niemand die Huellenpunkte; ab 58 liest sie jeder: der Grundzug
 * `gelschale` (58), `gel.js` (60), `glanz.js` (70), und `schatten.js` holt sie
 * sich in seinem zeichnen(), also ohnehin nach allen vorbereiten(). Alle
 * bekommen damit DIESELBE Huelle — was noetig ist, weil Schattenwurf und
 * Koerper sonst verschiedene Silhouetten haetten.
 *
 * ---------------------------------------------------------------------------
 * DETERMINISMUS (GRAFIK-MODULE.md §4)
 *
 * Kein Math.random, kein Date, kein performance.now. Dieses Modul liest
 * ueberhaupt keine Zeit — es haengt nur an den Punkten, die es bekommt. Die
 * Kostenmessung liegt deshalb ausserhalb; ein Zeitmesser im Modul waere genau
 * der Verstoss, den §4 verbietet.
 *
 * ---------------------------------------------------------------------------
 * WAS VON AUSSEN SICHTBAR IST — R.huelle
 *
 *   aus         true -> Huelle unveraendert durchreichen (fuer A/B-Messungen)
 *   messen      true -> Knickstatistik vorher/nachher rechnen. Kostet, ist
 *               also nur fuer Werkzeuge gedacht.
 *   quelle      die unbearbeitete Huelle
 *   scharf      Kanten ueber knickGrad im ganzen Netz, vor der Behandlung
 *   scharfRest  dieselbe Zahl beim letzten Suchlauf — der faehrt aber nur noch
 *               ueber das BERUEHRTE GEBIET, zaehlt also auch neu entstandene
 *               Kanten dort mit. Wer die ehrliche Vorher/Nachher-Zahl ueber
 *               alle 7680 Kanten will, setzt `messen` und liest `mass`.
 *   falten      Kanten ueber 90 Grad (Oberflaeche auf sich selbst), vorher
 *   faltenRest  ... beim letzten Suchlauf, mit derselben Einschraenkung
 *   punkte      wie viele Punkte bewegt wurden
 *   runden      wie viele Runden gelaufen sind
 *   mass        nur bei `messen`: vollstaendige Knickstatistik vorher/nachher
 *               samt Ausdehnung, zum Nachweis der erhaltenen Verformung
 * ========================================================================= */

(function () {

  const G = window.GRAFIK;
  if (!G || typeof G.modul !== 'function') {
    console.error('schleim/huelle.js: kein GRAFIK-Register. Ladereihenfolge pruefen.');
    return;
  }

  /* --- Stellschrauben, Vorgabewerte -------------------------------------
   * knickGrad 12: das Netz hat p50 1,9 und p90 5,0 Grad. Zwoelf Grad ist rund
   * das Doppelte dessen, was eine Kugel dieser Feinheit ueberhaupt an
   * Kruemmung je Kante hat (0,081 m Kante bei rund 1 m Halbmesser -> 4,6 Grad).
   * Darueber liegt keine Verformung mehr, sondern ein Fehler.
   * Bei 10 Grad wird es minimal glatter (p99 20,0 -> 19,7), aber die Zahl der
   * angefassten Punkte steigt von 517 auf 707 und damit die Kosten; bei 18
   * bleibt zuviel stehen (p99 nur bis 26,6).
   *
   * lambda 0,90: gemessen deutlich wirksamer als 0,50 oder 0,70 bei gleicher
   * Rundenzahl (aufprall, p99: 0,70 -> 23,1 gegen 0,90 -> 20,0). Ueber 1,0
   * darf es nicht gehen — dann springt der Punkt ueber den Schwerpunkt hinaus
   * und die Runde schwingt. */
  const P = {
    knickGrad: 12,
    runden: 12,
    lambda: 0.90,
    pruefJede: 3,     // nur jede n-te Runde neu suchen (der Suchlauf ist der teure Teil)
    taubin: 0,        // globale Taubin-Durchgaenge — gemessen wirkungslos, s.o.
  };

  const S = {
    quelle: null,
    n: 0, dreiecke: 0, kanten: 0,
    off: null, nb: null,         // Punkt -> Nachbarpunkte (CSR)
    fOff: null, fNb: null,       // Punkt -> anliegende Dreiecke (CSR)
    kv: null,                    // Kante -> zwei Endpunkte
    kf: null,                    // Kante -> zwei Dreiecke (Offset in indices)
    a: null, b: null,            // Punktpuffer (b nur fuer globales Taubin)
    fn: null,                    // Flaechennormalen
    nrm: null,                   // Punktnormalen
    schmutz: null,               // Dreiecke, deren Normale neu muss
    huelle: null,
  };

  /* ======================================================================
   * Topologie — einmal je Netz
   * ==================================================================== */
  function topologie(surface) {
    const idx = surface.indices;
    const n = surface.positions.length / 3;
    const dreiecke = idx.length / 3;

    /* Kanten sammeln, dabei je Kante die (bis zu zwei) Dreiecke merken. */
    const karte = new Map();
    for (let f = 0; f < idx.length; f += 3) {
      const p = [idx[f], idx[f + 1], idx[f + 2]];
      for (let e = 0; e < 3; e++) {
        const i = p[e], j = p[(e + 1) % 3];
        const s = i < j ? i * 65536 + j : j * 65536 + i;
        const v = karte.get(s);
        if (v === undefined) karte.set(s, [i, j, f, -1]);
        else if (v[3] < 0) v[3] = f;
      }
    }

    const kanten = karte.size;
    const kv = new Int32Array(kanten * 2);
    const kf = new Int32Array(kanten * 2);
    const zahl = new Int32Array(n);
    let k = 0;
    karte.forEach((v) => {
      kv[k * 2] = v[0]; kv[k * 2 + 1] = v[1];
      kf[k * 2] = v[2]; kf[k * 2 + 1] = v[3];
      zahl[v[0]]++; zahl[v[1]]++;
      k++;
    });

    const off = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) off[i + 1] = off[i] + zahl[i];
    const lauf = off.slice(0, n);
    const nb = new Int32Array(off[n]);
    for (let e = 0; e < kanten; e++) {
      const i = kv[e * 2], j = kv[e * 2 + 1];
      nb[lauf[i]++] = j;
      nb[lauf[j]++] = i;
    }

    /* Dreieck -> seine drei Kanten. Gebraucht, um nach einer Bewegung genau
     * die Kanten nachzupruefen, deren Winkel sich geaendert haben KANN — und
     * das sind die Kanten der beruehrten Dreiecke, nicht nur die an den
     * bewegten Punkten: ein Dreieck kippt auch, wenn nur seine dritte Ecke
     * gewandert ist. */
    const kIndex = new Map();
    for (let e = 0; e < kanten; e++) {
      const i = kv[e * 2], j = kv[e * 2 + 1];
      kIndex.set(i < j ? i * 65536 + j : j * 65536 + i, e);
    }
    const fe = new Int32Array(dreiecke * 3);
    for (let f = 0, t = 0; f < idx.length; f += 3, t++) {
      const p = [idx[f], idx[f + 1], idx[f + 2]];
      for (let e = 0; e < 3; e++) {
        const i = p[e], j = p[(e + 1) % 3];
        fe[t * 3 + e] = kIndex.get(i < j ? i * 65536 + j : j * 65536 + i);
      }
    }

    /* Punkt -> anliegende Dreiecke */
    const fZahl = new Int32Array(n);
    for (let f = 0; f < idx.length; f += 3) { fZahl[idx[f]]++; fZahl[idx[f + 1]]++; fZahl[idx[f + 2]]++; }
    const fOff = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) fOff[i + 1] = fOff[i] + fZahl[i];
    const fLauf = fOff.slice(0, n);
    const fNb = new Int32Array(fOff[n]);
    for (let f = 0; f < idx.length; f += 3) {
      fNb[fLauf[idx[f]]++] = f;
      fNb[fLauf[idx[f + 1]]++] = f;
      fNb[fLauf[idx[f + 2]]++] = f;
    }

    S.quelle = surface;
    S.n = n; S.dreiecke = dreiecke; S.kanten = kanten;
    S.off = off; S.nb = nb; S.fOff = fOff; S.fNb = fNb; S.fe = fe;
    S.kv = kv; S.kf = kf;
    S.a = new Float32Array(n * 3);
    S.fn = new Float32Array(dreiecke * 3);
    S.nrm = new Float32Array(n * 3);

    /* Listen statt Flaechen: ab der zweiten Runde faellt der Aufwand mit der
     * GROESSE DES SCHADENS, nicht mit der Groesse des Netzes. Das ist der
     * ganze Unterschied zwischen 6 ms und einem Bruchteil davon — gemessen,
     * siehe Kopf. Die Stempel sparen das Nullen der Merkfelder. */
    S.listeM = new Int32Array(n);       // markierte Punkte
    S.listeD = new Int32Array(n);       // markierte Punkte samt einem Ring
    S.listeF = new Int32Array(dreiecke);
    S.mStempel = new Int32Array(n);
    S.dStempel = new Int32Array(n);
    S.fStempel = new Int32Array(dreiecke);
    S.eStempel = new Int32Array(kanten);
    S.neu = new Float32Array(n * 3);    // Jacobi-Ergebnis, nach listeD gepackt
    S.runde = 0;                        // Stempelzaehler, waechst monoton

    /* Erbt alle uebrigen Felder der Vorlage (vertexCount, indices, scratch …),
     * ueberschreibt nur, was dieses Modul rechnet. */
    S.huelle = Object.create(surface);
    S.huelle.positions = S.a;
    S.huelle.normals = S.nrm;
  }

  /* ======================================================================
   * Flaechennormalen. `nur` = null -> alle, sonst nur die markierten.
   * ==================================================================== */
  function flaechenNormalen(pos, idx, fn, liste, anz, dreiecke) {
    const zahl = liste ? anz : dreiecke;
    for (let k = 0; k < zahl; k++) {
      const t = liste ? liste[k] : k, f = t * 3;
      const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const o = t * 3;
      if (l > 1e-20) { fn[o] = nx / l; fn[o + 1] = ny / l; fn[o + 2] = nz / l; }
      else { fn[o] = 0; fn[o + 1] = 1; fn[o + 2] = 0; }
    }
  }

  /* Punktnormalen mit Max-Gewichten: n / (|ab|^2 |ac|^2) je Ecke. */
  function punktNormalen(pos, idx, out) {
    out.fill(0);
    for (let f = 0; f < idx.length; f += 3) {
      const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const wx = pos[c] - pos[b], wy = pos[c + 1] - pos[b + 1], wz = pos[c + 2] - pos[b + 2];
      const lu = ux * ux + uy * uy + uz * uz;
      const lv = vx * vx + vy * vy + vz * vz;
      const lw = wx * wx + wy * wy + wz * wz;
      if (lu < 1e-24 || lv < 1e-24 || lw < 1e-24) continue;
      const wa = 1 / (lu * lv), wb = 1 / (lu * lw), wc = 1 / (lv * lw);
      out[a] += nx * wa; out[a + 1] += ny * wa; out[a + 2] += nz * wa;
      out[b] += nx * wb; out[b + 1] += ny * wb; out[b + 2] += nz * wb;
      out[c] += nx * wc; out[c + 1] += ny * wc; out[c + 2] += nz * wc;
    }
    for (let i = 0; i < out.length; i += 3) {
      const x = out[i], y = out[i + 1], z = out[i + 2];
      const l = Math.sqrt(x * x + y * y + z * z);
      if (l > 1e-20) { out[i] = x / l; out[i + 1] = y / l; out[i + 2] = z / l; }
      else { out[i] = 0; out[i + 1] = 1; out[i + 2] = 0; }
    }
  }

  /* Voller Laplace-Durchgang (nur fuer den abgeschalteten Taubin-Regler). */
  function laplace(ziel, quelle, lam, off, nb, n) {
    for (let i = 0; i < n; i++) {
      const s = off[i], e = off[i + 1], anz = e - s, k = i * 3;
      if (anz === 0) { ziel[k] = quelle[k]; ziel[k + 1] = quelle[k + 1]; ziel[k + 2] = quelle[k + 2]; continue; }
      let sx = 0, sy = 0, sz = 0;
      for (let j = s; j < e; j++) {
        const m = nb[j] * 3;
        sx += quelle[m]; sy += quelle[m + 1]; sz += quelle[m + 2];
      }
      const inv = 1 / anz;
      ziel[k] = quelle[k] + lam * (sx * inv - quelle[k]);
      ziel[k + 1] = quelle[k + 1] + lam * (sy * inv - quelle[k + 1]);
      ziel[k + 2] = quelle[k + 2] + lam * (sz * inv - quelle[k + 2]);
    }
  }

  /* ======================================================================
   * Diagnose — laeuft NUR, wenn jemand von aussen R.huelle.messen setzt.
   * ==================================================================== */
  function knickMessen(pos, idx) {
    const fn = new Float32Array(S.dreiecke * 3);
    flaechenNormalen(pos, idx, fn, null, null, S.dreiecke);
    const w = [];
    for (let e = 0; e < S.kanten; e++) {
      const f = S.kf[e * 2], g2 = S.kf[e * 2 + 1];
      if (g2 < 0) continue;
      const i = (f / 3) * 3, j = (g2 / 3) * 3;
      let d = fn[i] * fn[j] + fn[i + 1] * fn[j + 1] + fn[i + 2] * fn[j + 2];
      if (d > 1) d = 1; if (d < -1) d = -1;
      w.push(Math.acos(d) * 180 / Math.PI);
    }
    w.sort((x, y) => x - y);
    const q = (p) => +w[Math.min(w.length - 1, Math.round(p * (w.length - 1)))].toFixed(2);
    let sum = 0; for (let i = 0; i < w.length; i++) sum += w[i];
    return {
      kanten: w.length, mittel: +(sum / w.length).toFixed(2),
      p50: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99), p999: q(0.999), max: q(1),
      ueber20: w.filter(x => x > 20).length, ueber60: w.filter(x => x > 60).length,
    };
  }

  function ausdehnung(pos) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    return [+(x1 - x0).toFixed(5), +(y1 - y0).toFixed(5), +(z1 - z0).toFixed(5)];
  }

  /* ======================================================================
   * Das Modul
   * ==================================================================== */
  G.modul({
    name: 'huelle',
    ordnung: 58,

    regler: [
      { key: 'knickGrad', min: 4, max: 60, step: 1, wert: P.knickGrad },
      { key: 'runden', min: 0, max: 40, step: 1, wert: P.runden },
      { key: 'lambda', min: 0.0, max: 0.90, step: 0.05, wert: P.lambda },
      { key: 'pruefJede', min: 1, max: 8, step: 1, wert: P.pruefJede },
      { key: 'taubin', min: 0, max: 6, step: 1, wert: P.taubin },
    ],

    aufbau(gl, R) {
      /* Nichts zu uebersetzen: die Topologie haengt an ctx.surface, und die
       * gibt es erst beim ersten Bild. R.huelle steht trotzdem schon hier,
       * damit ein Messwerkzeug es findet, bevor das erste Bild gelaufen ist. */
      R.huelle = {
        aus: false, messen: false, quelle: null,
        scharf: 0, scharfRest: 0, falten: 0, faltenRest: 0,
        punkte: 0, runden: 0, mass: null,
      };
    },

    vorbereiten(gl, R, ctx) {
      const quelle = ctx.surface;
      if (!quelle || !quelle.positions || !quelle.indices) return;

      const api = R.huelle || (R.huelle = { aus: false, messen: false });
      api.quelle = quelle;
      if (api.aus) return;

      if (S.quelle !== quelle || S.n !== quelle.positions.length / 3) topologie(quelle);

      const w = (R.regler && R.regler.huelle) || P;
      const zahl = (k) => (w[k] !== undefined ? w[k] : P[k]);
      const grenze = Math.cos(Math.max(1, zahl('knickGrad')) * Math.PI / 180);
      const runden = Math.max(0, Math.round(zahl('runden')));
      const lambda = Math.max(0, Math.min(0.9, zahl('lambda')));
      const pruefJede = Math.max(1, Math.round(zahl('pruefJede')));
      const taubin = Math.max(0, Math.round(zahl('taubin')));

      const idx = quelle.indices, n = S.n;
      const a = S.a, fn = S.fn, kv = S.kv, kf = S.kf;
      a.set(quelle.positions);

      /* --- Knickbegrenzung ----------------------------------------------
       * Runde 0 sieht das ganze Netz an. Ab Runde 1 nur noch, was sich
       * geaendert haben KANN: die Dreiecke an bewegten Punkten und deren
       * Kanten. Der Aufwand haengt danach an der Groesse des Schadens, nicht
       * an der Groesse des Netzes. */
      const off = S.off, nb = S.nb, fOff = S.fOff, fNb = S.fNb, fe = S.fe;
      const listeM = S.listeM, listeD = S.listeD, listeF = S.listeF, neu = S.neu;

      let bewegt = false, gelaufen = 0;
      let scharf = 0, falten = 0, restScharf = 0, restFalten = 0, punkte = 0;
      let anzM = 0, anzF = 0, anzD = 0;
      let pruefen = true;

      for (let r = 0; r <= runden; r++) {
        /* --- Suchen ---------------------------------------------------- */
        if (pruefen) {
          S.runde++;
          const stempel = S.runde;

          /* Flaechennormalen: Runde 0 alle, danach nur die beruehrten. */
          if (r === 0) flaechenNormalen(a, idx, fn, null, null, S.dreiecke);
          else flaechenNormalen(a, idx, fn, listeF, anzF, S.dreiecke);

          /* Kanten pruefen: Runde 0 alle, danach nur die der beruehrten
           * Dreiecke. Ueber die DREIECKE, nicht ueber die Punkte — ein
           * Dreieck kippt auch, wenn nur seine dritte Ecke gewandert ist. */
          anzM = 0;
          let treffer = 0, ueber90 = 0;
          const pruefe = (e) => {
            const g2 = kf[e * 2 + 1];
            if (g2 < 0) return;
            const i = kf[e * 2], j = g2;
            const d = fn[i] * fn[j] + fn[i + 1] * fn[j + 1] + fn[i + 2] * fn[j + 2];
            if (d >= grenze) return;
            treffer++;
            if (d < 0) ueber90++;
            const u = kv[e * 2], v = kv[e * 2 + 1];
            if (S.mStempel[u] !== stempel) { S.mStempel[u] = stempel; listeM[anzM++] = u; }
            if (S.mStempel[v] !== stempel) { S.mStempel[v] = stempel; listeM[anzM++] = v; }
          };
          if (r === 0) {
            for (let e = 0; e < S.kanten; e++) pruefe(e);
          } else {
            for (let k = 0; k < anzF; k++) {
              const t = listeF[k];
              for (let s = 0; s < 3; s++) {
                const e = fe[t * 3 + s];
                if (S.eStempel[e] === stempel) continue;
                S.eStempel[e] = stempel;
                pruefe(e);
              }
            }
          }

          if (r === 0) { scharf = treffer; falten = ueber90; }
          restScharf = treffer; restFalten = ueber90;
          gelaufen = r;
          if (treffer === 0 || r === runden) break;

          /* Einen Ring ausweiten, damit die Reparatur nicht in einem Krater
           * mit scharfem Rand endet. */
          anzD = 0;
          for (let k = 0; k < anzM; k++) {
            const i = listeM[k];
            if (S.dStempel[i] !== stempel) { S.dStempel[i] = stempel; listeD[anzD++] = i; }
            for (let j = off[i], e = off[i + 1]; j < e; j++) {
              const u = nb[j];
              if (S.dStempel[u] !== stempel) { S.dStempel[u] = stempel; listeD[anzD++] = u; }
            }
          }

          /* Die Dreiecke, die von hier an schmutzig sind. */
          anzF = 0;
          for (let k = 0; k < anzD; k++) {
            const i = listeD[k];
            for (let j = fOff[i], e = fOff[i + 1]; j < e; j++) {
              const t = fNb[j] / 3;
              if (S.fStempel[t] === stempel) continue;
              S.fStempel[t] = stempel;
              listeF[anzF++] = t;
            }
          }
          punkte = anzD;
        }

        /* --- Ziehen: Jacobi, erst rechnen, dann zurueckschreiben --------
         * Kein Ganzfeld-Kopieren und kein Nachbar, der in derselben Runde
         * schon gewandert ist. */
        for (let k = 0; k < anzD; k++) {
          const i = listeD[k], s = off[i], e = off[i + 1], anz = e - s;
          const p = i * 3, q = k * 3;
          if (anz === 0) { neu[q] = a[p]; neu[q + 1] = a[p + 1]; neu[q + 2] = a[p + 2]; continue; }
          let sx = 0, sy = 0, sz = 0;
          for (let j = s; j < e; j++) {
            const m = nb[j] * 3;
            sx += a[m]; sy += a[m + 1]; sz += a[m + 2];
          }
          const inv = 1 / anz;
          neu[q] = a[p] + lambda * (sx * inv - a[p]);
          neu[q + 1] = a[p + 1] + lambda * (sy * inv - a[p + 1]);
          neu[q + 2] = a[p + 2] + lambda * (sz * inv - a[p + 2]);
        }
        for (let k = 0; k < anzD; k++) {
          const p = listeD[k] * 3, q = k * 3;
          a[p] = neu[q]; a[p + 1] = neu[q + 1]; a[p + 2] = neu[q + 2];
        }
        bewegt = true;
        gelaufen = r + 1;

        /* Der Suchlauf ist der teure Teil, nicht das Ziehen: er faehrt ueber
         * alle Dreiecke des beruehrten Gebiets, das Ziehen nur ueber dessen
         * Punkte. Gemessen kostet ein Suchlauf rund das Fuenffache eines
         * Zuges. Deshalb wird nicht jede Runde neu gesucht — nur jede
         * `pruefJede`-te und in jedem Fall die letzte. */
        pruefen = ((r + 1) % pruefJede === 0) || (r + 1 === runden);
      }

      /* --- Globales Taubin: abgeschaltet, siehe Kopf --------------------- */
      if (taubin > 0) {
        if (!S.b) S.b = new Float32Array(n * 3);
        for (let d = 0; d < taubin; d++) {
          laplace(S.b, a, 0.5, off, nb, n);
          laplace(a, S.b, -0.53, off, nb, n);
        }
        bewegt = true;
      }

      /* --- Weiterreichen ------------------------------------------------- */
      if (bewegt) {
        punktNormalen(a, idx, S.nrm);
        S.huelle.positions = a;
        S.huelle.normals = S.nrm;
        ctx.surface = S.huelle;
      }
      /* Nichts bewegt -> die Vorlage bleibt stehen. Das Modul hat dann nur
       * seinen Suchlauf gekostet und kein Byte angefasst. */

      api.scharf = scharf; api.scharfRest = restScharf;
      api.falten = falten; api.faltenRest = restFalten;
      api.punkte = punkte; api.runden = gelaufen;

      if (api.messen) {
        api.mass = {
          vorher: knickMessen(quelle.positions, idx),
          nachher: knickMessen(bewegt ? a : quelle.positions, idx),
          ausdehnungVorher: ausdehnung(quelle.positions),
          ausdehnungNachher: ausdehnung(bewegt ? a : quelle.positions),
          knickGrad: zahl('knickGrad'), runden: runden, lambda: lambda, pruefJede: pruefJede,
        };
      }
    },
  });

})();
