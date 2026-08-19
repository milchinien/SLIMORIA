# SLIMORIA Prototyp — Architektur und Arbeitsverträge

Verbindlich für alle Builder. Wer diese Verträge bricht, bricht die
Aufnahme-Pipeline und damit die Bewertung.

---

## 1. Dateibesitz (WICHTIG)

Mehrere Builder arbeiten gleichzeitig. **Jede Datei hat genau einen Besitzer.**
Fremde Dateien werden gelesen, aber **niemals** verändert.

| Datei | Besitzer (Lane) |
|---|---|
| `client/core.js` | GESPERRT — Mathe/Geometrie, niemand ändert das |
| `client/rng.js` | GESPERRT |
| `client/capture.js` | GESPERRT — Aufnahme-Treiber |
| `client/main.js` | GESPERRT — Eingabe, Kamera, Schleife |
| `client/index.html` | GESPERRT |
| `client/renderer.js` | GESPERRT während des Gauntlets · in Phase Grafik: **Lane GRAFIK** |
| `client/softbody.js` | **Lane MOTION** |
| `client/slime.js` | **Lane MOTION** |
| `client/tuning.js` | **Lane MOTION** |
| `client/eat.js` | **Lane EAT** |
| `client/death.js` | **Lane DEATH** |
| `client/combat.js` | **Lane COMBAT** |
| `client/ui.js`, `client/ui.css` | **Lane UI** |
| `client/shader/*` (Phase Grafik) | **Lane GRAFIK** |
| `client/game.js` | GESPERRT — Zustandsmaschine, ruft die Lanes auf |
| `client/world.js`, `client/entities.js` | GESPERRT |
| `client/net.js`, `server/*` | GESPERRT |

Wenn eine Lane eine Änderung an einer gesperrten Datei braucht: **melden, nicht
selbst ändern.** Im Bericht als `BRAUCHT_KERNAENDERUNG: <datei> — <grund>`.

---

## 2. Determinismus

Die Simulation läuft in **festen Schritten von 1/240 s**. Im Aufnahmemodus gibt
es kein `performance.now()`, kein `Math.random()` und kein `Date`.

* Zufall **ausschließlich** über `RNG.next()` aus `client/rng.js`.
  `Math.random()` ist in Spiel-Logik verboten — die Aufnahme wäre sonst nicht
  wiederholbar und der Kritiker verglichen unvergleichbare Bilder.
* Zeit **ausschließlich** über den `time`-Parameter, den `game.js` durchreicht.
* Kein `setTimeout`/`setInterval` in Spiel-Logik. Timer laufen über
  Sekundenzähler, die pro Schritt um `dt` verringert werden.

---

## 3. Globale Schnittstelle (`window.SLIMORIA`)

`game.js` stellt diese bereit. Der Aufnahme-Treiber benutzt **nur** sie.

```js
window.SLIMORIA = {
  ready,                    // Promise, erfüllt wenn alles geladen ist
  step(dt),                 // Simulation um dt vorrücken (feste Teilschritte)
  render(),                 // genau ein Bild zeichnen
  canvas,                   // HTMLCanvasElement
  api: { ... },             // siehe unten
}
```

### `api` — Skriptsteuerung für Aufnahmen

| Aufruf | Wirkung |
|---|---|
| `reset(opts)` | Welt zurücksetzen. `opts: {seed, level, faction}` |
| `setCamera({yaw,pitch,dist,follow})` | Kamera setzen. `follow:false` friert sie ein |
| `moveTo(x,z)` | Klickbewegung auslösen (wie Linksklick auf den Boden) |
| `stop()` | Bewegungsziel löschen |
| `setDrive(x,z)` | Direktschub setzen (Einheitsvektor) oder `(0,0)` |
| `spawnCreature({art,level,x,z})` → `id` | Kreatur setzen |
| `selectTarget(id)` | Ziel wählen |
| `setAutoAttack(bool)` | Auto-Angriff an/aus |
| `useAbility(slot)` | Hotbar-Slot 1–10 auslösen |
| `tryEat({erzwinge})` | Fressversuch. `erzwinge: 'erfolg' \| 'fehlschlag' \| null` |
| `damagePlayer(n)` / `healPlayer(n)` | Für Feedback-Aufnahmen |
| `killPlayer()` | Todesablauf auslösen |
| `setHudVisible(bool)` | HUD ein/aus (Schleim-Aufnahmen ohne HUD) |
| `grantXp(n)` | XP geben, kann Level-Up auslösen |
| `metrics()` | Messwerte, siehe §4 |
| `state()` | `{phase, playerHp, targetHp, level, ...}` |

Alle `api`-Aufrufe müssen **sofort** wirken und dürfen nichts asynchron machen.

---

## 4. `api.metrics()` — womit gemessen wird

Der Kritiker misst hiermit, statt zu raten. Rückgabe:

```js
{
  bbox:      {w, h, d},      // Weltmaße der Hülle (Breite, Höhe, Tiefe)
  bboxRel:   {w, h, d},      // dasselbe geteilt durch den Ruheradius
  squash:    h / ruheHoehe,  // < 1 = gequetscht, > 1 = gestreckt
  breite:    w / ruheBreite,
  streckung: laenge in Bewegungsrichtung / Breite quer dazu,
  speed, speedRatio,
  hoeheSchwerpunkt,
  grounded, phase,
  volumen,                   // relativ zum Ruhevolumen — muss ~1 bleiben
  achsen: {vorne, hinten, links, rechts, oben, unten}  // Abstand vom Zentrum
}
```

Diese Werte sind Pflicht. Ohne sie kann der Kritiker Squash-Verhältnisse nicht
gegen die Referenzwerte im Dossier prüfen.

---

## 5. Renderer-Erweiterung

`renderer.js` ist gesperrt. Wer zusätzlich zeichnen muss (Pfütze beim Tod,
Blase beim Umschlingen, Zielring am Boden), registriert einen Zeichner:

```js
R.extras.push({
  name: 'todes-pfuetze',
  order: 10,                 // klein = früh
  draw(gl, ctx) { /* ctx = {camera, time, params, game} */ },
});
```

Für einfache Fälle gibt es fertige Helfer:

* `R.drawBlob(pos, radius, farbe, alpha)` — weiche Kugel
* `R.drawDecal(x, z, radius, farbe, alpha)` — flacher Fleck am Boden
* `R.drawRing(x, z, radius, farbe, breite)` — Ring am Boden (Zielmarkierung)

---

## 6. Aufnahmen

```bash
node tools/capture.mjs <szenario>            # eine Szene aufnehmen
node tools/capture.mjs --alle                # alle Szenen
node tools/capture.mjs <szenario> --out ordner
```

Ergebnis pro Szene in `gauntlet/shots/<szenario>/<zeitstempel>/`:

* `frame_000.png` … — Einzelbilder, 1600×900
* `kontakt.png` — Kontaktbogen: alle Bilder in einem Raster mit Bildnummer
  und Millisekunde. **Das ist das Bild, das der Kritiker anschaut.**
* `messwerte.json` — `metrics()` pro aufgenommenem Bild
* `szene.json` — was das Szenario gemacht hat

Neue Szenarien werden in `client/capture.js` unter `SZENARIEN` eingetragen.
Format:

```js
huepfer: {
  titel: 'Aufprall nach Sprung',
  hud: false,
  kamera: { yaw: 0.6, pitch: 0.25, dist: 7, follow: true },
  dauer: 2.5,                 // Sekunden Gesamtlauf
  bilder: 24,                 // gleichmäßig verteilt aufgenommene Bilder
  // oder: bildZeiten: [0.9, 0.95, 1.0, ...] für frame-genaue Momente
  skript: [
    { t: 0.0, tu: a => a.setDrive(1, 0) },
    { t: 0.8, tu: a => a.useAbility(0) },
  ],
}
```

---

## 7. Server-Autorität

Der Server (`server/server.mjs`) besitzt: HP, XP, Level, Fresschance-Würfel,
Kreaturenzustand, Tod/Respawn. Der Client sagt nur, was er **möchte**.

Der Client darf Bewegung vorhersagen (Client Prediction) und wird weich
korrigiert (GDD 11 §24–25). Er darf **niemals** selbst entscheiden, ob ein
Fressversuch geglückt ist (GDD 11 §35).

Ohne Server läuft der Client im **Offline-Modus** mit einem lokalen,
gesäten Regelwerk — identische Regeln, damit Aufnahmen deterministisch sind.

---

## 8. Stil

* Sprache im Code und in Kommentaren: **Deutsch**, wie im Bestandscode.
* Kommentardichte wie in `core.js`/`softbody.js`: erklärt *warum*, nicht *was*.
* Keine Frameworks, keine Build-Schritte, keine externen Laufzeit-Abhängigkeiten
  im Client. Reines WebGL2 + JavaScript, per `<script src>` geladen.
