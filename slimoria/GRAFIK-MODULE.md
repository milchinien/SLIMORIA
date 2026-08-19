# Phase Grafik — Modulvertrag

Verbindlich für alle Agenten der Lanes GRAFIK, KARTE und SCHLEIM.

Zielbild: Genshin Impact / Tower of Fantasy. Was reproduziert wird, ist das
**Verfahren**, nicht die Assets — Begründung und Abgrenzung in
`PHASE-GRAFIK.md`, der abgeleitete Plan in `PHASE-GRAFIK-PLAN.md`.

---

## 0. Die Stilvorgabe — steht über allem anderen

**Anime, nicht Fotorealismus. Und im Zweifel simpler.**

Das ist keine Geschmacksfrage, sondern die Vorgabe des Auftraggebers und
zugleich GDD 01 §6 und §68: gewünscht ist *Anime-Schleim mit glaubwürdiger
physischer Masse* — ausdrücklich **weder** Fotorealismus **noch** ein flacher
Cartoon. Genshin Impact ist deshalb die richtige Latte: es ist ein Anime-Look,
kein realistischer.

Wenn eine Entscheidung zwischen "näher an echt" und "näher an gezeichnet"
steht, gewinnt immer gezeichnet.

### Was das konkret heißt

| Nimm das | Nicht das |
|---|---|
| Große, ruhige Farbflächen | Verlaufsteppiche über die ganze Fläche |
| Zwei bis drei Tonstufen je Oberfläche | Stufenloser Helligkeitsverlauf |
| Harte Schattenkante, Flanke etwa 2 px | Weicher Halbschatten |
| Glanzlicht als klar begrenzte Form | Weich auslaufender Schimmer |
| Silhouette trägt die Lesbarkeit | Oberflächendetail trägt sie |
| Farbe: satt und hell, Schatten farbig statt grau | Entsättigt, dunkel, "realistisch" |
| Wenige große Elemente | Viele kleine |
| Form durch Umriss | Form durch Textur |

### Ausdrücklich verboten

Alles, was nach Kamera aussieht statt nach Zeichnung:
Linsenreflexe, chromatische Aberration, Filmkorn, Vignette,
Bewegungsunschärfe, Tiefenschärfe im Gameplay, prozedurale
Oberflächenrauheit, Normalenkarten für Materialdetail, physikalisch
korrekte Reflexionen.

Ebenso: Texturdetail, das nur aus der Nähe wirkt. Der Boden in Genshin hat
erstaunlich wenig Zeichnung — sieh in `ref/genshin/` nach, statt es zu
vermuten.

### Zwei Beispiele, damit die Richtung eindeutig ist

**Wasser.** Richtig: eine ruhige Farbfläche, klar am Ufer und satt zur Mitte,
mit einer *harten* hellen Schaumlinie am Rand und wenigen großen, langsam
wandernden Wellenformen. Falsch: zwei gegenläufig scrollende Normalenkarten,
Fresnel-Spiegelung und Brechung — das ist die realistische Lösung derselben
Aufgabe und sieht sofort nach anderem Spiel aus.

**Gras.** Richtig: flache Halme in zwei Tönen, unten dunkler, oben heller,
eine gemeinsame Windwelle. Falsch: jeder Halm einzeln beleuchtet mit
Glanzlicht und Selbstverschattung.

### Die Probe

Ein Ausschnitt deines Ergebnisses muss neben einem Ausschnitt aus
`ref/genshin/` als **dieselbe Art Bild** durchgehen. Nicht gleich gut — das
kommt später —, sondern von derselben Sorte. Wirkt deins daneben wie ein
Foto oder wie eine Technikdemonstration, ist es falsch, egal wie sauber es
gebaut ist.

---

## 1. Warum es einen zweiten Renderpfad gibt

`client/renderer.js` trägt die laufenden Blindvergleiche des Gauntlets. Ändert
sich der Renderer unter einer laufenden Beurteilung, vergleicht der Richter
zwei verschiedene Spiele. Deshalb:

* `renderer.js` bleibt **unberührt**. Niemand fasst sie an.
* Der neue Pfad liegt vollständig in `client/grafik/` und ist nur aktiv, wenn
  die Adresse `?renderer=2` enthält oder ein Aufnahmeszenario `renderer: 2`
  setzt.
* Erst wenn alle 17 Gauntlet-Teile blind gewonnen sind, wird umgeschaltet.

Aufnahme mit dem neuen Pfad:

```bash
node tools/capture.mjs g-bodenlicht --out mein-versuch
```

wenn das Szenario `renderer: 2` trägt. Zum Vergleichen beider Pfade dasselbe
Szenario einmal mit und einmal ohne.

---

## 2. Dateibesitz

**Jede Datei hat genau einen Besitzer.** Fremde Dateien werden gelesen, nie
geändert. Wer eine Änderung woanders braucht, meldet sie als
`BRAUCHT_FREMDAENDERUNG: <datei> — <grund>`.

| Datei | Lane | Inhalt |
|---|---|---|
| `grafik/renderer2.js` | GRAFIK-0 | Pipeline, Durchgänge, setzt alles zusammen |
| `grafik/glsl.js` | GRAFIK-0 | gemeinsame Shader-Bausteine als Textbausteine |
| `grafik/himmel.js` | GRAFIK | Himmelsverlauf, Sonnenscheibe, Dunstband |
| `grafik/licht.js` | GRAFIK | Lichtmodell, Tagesgang, Umgebungslicht |
| `grafik/rampe.js` | GRAFIK | Schattenrampe statt Lambert |
| `grafik/kontur.js` | GRAFIK | umgedrehte Hülle, Dickenkompensation |
| `grafik/nebel.js` | GRAFIK | Fernnebel, Luftperspektive |
| `grafik/boden.js` | GRAFIK | Terrain, Albedo, Kontaktband |
| `grafik/schatten.js` | GRAFIK | Schattenkarte |
| `grafik/post.js` | GRAFIK | Tonemapping, Schwarzhub, Bloom, Dither |
| `grafik/gras.js` | GRAFIK | instanzierte Halme, Windwelle |
| `grafik/karte.js` | KARTE-0 | Aufbau der Arena, Ausstattungsregister |
| `grafik/props/*.js` | KARTE | je Agent ein Ausstattungstyp |
| `grafik/gel.js` | SCHLEIM | Material des Schleims |
| `grafik/gesicht.js` | SCHLEIM | Augen und Mund im Körper |
| `grafik/glanz.js` … | SCHLEIM | je Agent eine Eigenschaft |

Gesperrt für alle: `renderer.js`, `game.js`, `main.js`, `index.html`,
`capture.js`, `core.js`, `world.js`, `shared/regeln.js`, und alles, was den
Gauntlet-Lanes gehört (`softbody.js`, `slime.js`, `tuning.js`, `eat.js`,
`combat.js`, `death.js`, `ui.js`, `ui.css`).

---

## 3. Wie ein Modul sich anmeldet

Jedes Modul ist eine klassische Skriptdatei ohne Import, die sich selbst in ein
globales Register einträgt. `renderer2.js` liest das Register und ruft die
Module in der Reihenfolge ihrer `ordnung`.

```js
'use strict';
GRAFIK.modul({
  name: 'himmel',
  ordnung: 10,          // klein = früh gezeichnet

  // Einmalig beim Aufbau: Programme übersetzen, Puffer anlegen.
  // Wirft dieses Modul, wird es übersprungen und der Rest läuft weiter.
  aufbau(gl, R) { ... },

  // Pro Bild, vor dem Zeichnen: Uniforms vorbereiten, Werte rechnen.
  vorbereiten(gl, R, ctx) { ... },

  // Pro Bild zeichnen. ctx siehe unten.
  zeichnen(gl, R, ctx) { ... },

  // Optional: Stellschrauben, die im Tuning-Panel erscheinen sollen.
  regler: [ { key: 'dunstHoehe', min: 0, max: 1, step: 0.01, wert: 0.35 } ],
});
```

`ctx` enthält:

```js
{
  camera,        // { eye, viewProj, invViewProj, yaw, pitch, dist, tx, ty, tz }
  viewProj, cam, // Kurzformen
  time,          // Sekunden seit Szenenstart, deterministisch
  params,        // PARAMS aus tuning.js (Radius usw.)
  game,          // G — Spieler, Kreaturen, Phase
  slime,         // G.slime
  surface,       // die unterteilte Hülle: { positions, normals, indices }
  welt,          // WELT aus world.js
  licht,         // was grafik/licht.js gesetzt hat: richtung, farbe, ambient
  ziel,          // aktuelles Renderziel: { fbo, breite, hoehe, hdr }
}
```

`GRAFIK` stellt außerdem bereit:

* `GRAFIK.programm(gl, vs, fs)` — übersetzt und verlinkt, wirft mit lesbarer
  Fehlermeldung samt Zeilennummer
* `GRAFIK.mesh(gl, positionen, normalen, indizes)` — VAO anlegen
* `GRAFIK.vollbild(gl)` — Dreieck für Bildschirmdurchgänge
* `GRAFIK.textur(gl, opts)` — Textur oder Renderziel
* `GRAFIK.baustein(name)` — Shader-Textbaustein aus `glsl.js` holen

---

## 4. Determinismus

Gilt unverändert (`ARCHITEKTUR.md` §2). Kein `Math.random`, kein `Date`, kein
`performance.now` in Modulen. Zeit ausschließlich über `ctx.time`.

Ein Wind, der sich pro Bild zufällig bewegt, macht jede Aufnahme unvergleichbar
und damit jede Beurteilung wertlos.

---

## 5. Was jeder selbst prüft, bevor er fertig meldet

1. `node --check` auf jede geänderte Datei.
2. `node tools/capture.mjs g-bodenlicht g-fernsicht --out mein-test` läuft ohne
   „Seitenfehler".
3. Den eigenen Kontaktbogen mit dem Read-Tool **ansehen**. Nicht hoffen.
4. `node tools/grafikmass.mjs <bild.png>` — die eigenen Zahlen gegen die
   Zielwerte aus `ref/genshin/DOSSIER.md` halten.
5. Der bestehende Pfad muss unverändert weiterlaufen:
   `node tools/capture.mjs hud --out regression` ohne Seitenfehler.

---

## 6. Die Grenze, die auch hier gilt

Kostet ein Baustein Bildrate, Lesbarkeit der Verformung oder Erkennbarkeit des
Ziels, fällt der Baustein — nicht das Spielgefühl.
GDD 01 §63 · GDD 10 §98 · GDD 02 §64. Der Schleim ist die Figur, nicht die
Kulisse.
