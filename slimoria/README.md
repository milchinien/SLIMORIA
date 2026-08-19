# SLIMORIA — spielbarer Prototyp

## 1. Was das hier ist

Dieser Ordner ist die Umsetzung von **Phase 1 (Slime Movement Prototype)** und
**Phase 2 (Slime Combat Prototype)** aus `Doc/gdd/GDD-12-Development-Roadmap.md`
§4 und §5: ein Schleim in einer Testarena, den man per Mausklick bewegt, der
dabei wabbelt, sich verformt und anrempelt — dazu eine einfache Kreatur, die man
bekämpfen, schwächen und schließlich fressen kann, mit sichtbarem Erfolg,
sichtbarem Fehlschlag, Level, Wachstum, Tod und Wiederbelebung am Friedhof.

Darunter liegt die technische Basis aus GDD 11 §121: zwei gleichzeitig
verbundene Spieler, ein autoritativer Server, ein Charakter, der einen
Serverneustart übersteht. Der Prototyp ist damit zugleich die **Abnahme** für
diese beiden Phasen — die vollständige Prüfliste steht in Abschnitt 4.

Reines WebGL2 und JavaScript, ohne Framework, ohne Build-Schritt. Gebaut und
beurteilt wird bei **1600 × 900**.

---

## 2. Starten und spielen

Voraussetzungen: **Node.js** (getestet mit v24) und ein **Chrome** oder **Edge**
unter einem der üblichen Pfade (`C:/Program Files/Google/Chrome/Application/chrome.exe`,
`C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`,
`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`). Chrome braucht
man nur für die Werkzeuge — zum Spielen genügt jeder Browser mit WebGL2.

```bash
cd slimoria
npm install            # einmalig: puppeteer-core und ws
node tools/serve.mjs
```

Ausgabe:

```
SLIMORIA laeuft auf http://127.0.0.1:8099/client/index.html
```

Diese Adresse im Browser öffnen. Ein anderer Port geht über die Umgebungs-
variable `PORT` — in der PowerShell `$env:PORT=8611; node tools/serve.mjs`, in
einer POSIX-Shell `PORT=8611 node tools/serve.mjs`.
Die Leinwand füllt das Fenster; wer die Bildwirkung der Abnahmebilder sehen
will, macht das Fenster so groß, dass die Leinwand 1600 × 900 ergibt.

In der Arena stehen beim Start sechs Kreaturen (Schleimling, Wolf, Eber) an
festen Stellen. Der Knopf **Kreatur** im Tuning-Panel setzt eine weitere an
einen zufälligen Ruhepunkt.

Zuerst erscheint die **Charaktererstellung**: Name, Fraktion (Eldoran blau,
Ravok rot), Gesicht. „In die Welt" startet das Spiel. Die Auswahl liegt danach
im `localStorage` des Browsers; mit `C` lässt sich das Fenster wieder öffnen.

Oben links steht eine Marke: **SERVER** (autoritativer Server antwortet) oder
**EINZELSPIELER** (kein Server erreichbar, der Client rechnet die Regeln
selbst). Zum Alleinspielen braucht man nichts weiter zu tun.

### Steuerung

| Eingabe | Wirkung |
|---|---|
| Linksklick auf den Boden | dorthin bewegen (Klickbewegung, GDD 10 §151) |
| Linksklick auf eine Kreatur | Ziel auswählen — nur auswählen, kein Angriff |
| Linksklick halten und ziehen | Bewegungsziel mitziehen |
| Rechtsklick auf eine Kreatur | Ziel setzen **und** Auto-Angriff starten |
| Rechtsklick ziehen (Boden) | Kamera drehen |
| Mittlere Maustaste ziehen | Kamera drehen |
| Mausrad | Zoom |
| `W` `A` `S` `D` / Pfeiltasten | direkt schieben, kameraabhängig |
| `Q` / `Y` (bzw. `Z`) | Kamera nach links / rechts drehen |
| Leertaste | hüpfen |
| `E` | **Fressversuch** — ausschließlich dafür reserviert (GDD 10 §18) |
| `F` | interagieren (im Prototyp ohne Ziel: nur ein Hinweis) |
| `1` … `9`, `0` | Hotbar-Slots 1–10 |
| `Umschalt` + Linksklick am Körper | am Schleim zupfen (Spielerei) |
| `X` | Massepunkte des Weichkörpers einblenden |
| `P` | Pause |
| `R` | Welt zurücksetzen — leert dabei auch die Arena, die Startaufstellung kommt nicht wieder |
| `C` | Charaktererstellung öffnen |
| `H` / `Esc` | Tuning-Panel ein-/ausblenden |
| `K` | Kanonenstoß (Werkzeug zum Ausprobieren) |

Belegt sind derzeit die Slots 1–4 plus `E` (`shared/regeln.js`):

| Slot | Fähigkeit | Kosten | Abklingzeit |
|---|---|---|---|
| 1 | Biss — Grundangriff, läuft als Auto-Angriff weiter | 0 | 0 s |
| 2 | Körperstoß | 12 Mana | 6 s |
| 3 | Säurespritzer — schwächt für den Fressversuch | 20 Mana | 9 s |
| 4 | Straffen — heilt 30 % | 15 Mana | 18 s |
| `E` | Fressen | 0 | 2,5 s |

### Der kürzeste Weg durch alles, was der Prototyp kann

1. Auf den Boden klicken, laufen lassen, mitten in der Fahrt woanders
   hinklicken — Beschleunigung, Nachschwingen, Richtungswechsel.
2. Eine der Kreaturen anklicken. Der Zielrahmen zeigt Name, Level, HP und die
   Fresschance.
3. Rechtsklick auf dieselbe Kreatur: der Schleim läuft hin und beißt im Takt.
4. Wenn die HP des Ziels unten sind: `E`. Entweder verschwindet die Kreatur in
   der Masse (Erfolg) oder der Schleim wird zurückgeschleudert (Fehlschlag,
   kostet HP).
5. Genug XP → Level-Up → der Körper wird sichtbar größer.
6. Sich von mehreren Kreaturen totprügeln lassen: Zittern, Platzen, Pfütze,
   Wiederbelebung am Friedhof in der Ecke bei (−18, −18).

Das Tuning-Panel rechts (`H`) verstellt das Spielgefühl zur Laufzeit. Es ist ein
Entwicklerwerkzeug, kein Spielinhalt — die Abnahmewerte gelten für die
Voreinstellung „Standard".

---

## 3. Zu zweit spielen

Der Client verbindet sich beim Start von selbst auf `ws://<host>:8790`. Es
genügt also, den Server zu starten, bevor man die Seite öffnet.

**Terminal 1 — Dateiserver:**

```bash
cd slimoria
node tools/serve.mjs
```

**Terminal 2 — Spielserver:**

```bash
cd slimoria
node server/server.mjs
```

Ausgabe:

```
SLIMORIA-Server bereit auf ws://127.0.0.1:8790 (Startwert 4242, Takt 20/s, Daten .../server/daten)
```

**Spieler 1** öffnet `http://127.0.0.1:8099/client/index.html`.
**Spieler 2** öffnet `http://127.0.0.1:8099/client/index.html?name=Zweiter`.

Der Namensparameter ist nötig, wenn beide denselben Browser benutzen: der
Server führt den persistenten Charakter unter seinem Namen, und der Name aus der
Charaktererstellung liegt im `localStorage`, den sich zwei Tabs teilen. Zwei
verschiedene Rechner oder zwei Browserprofile brauchen ihn nicht.

Beide Marken oben links müssen **SERVER** zeigen. Danach sehen sich die
Schleime gegenseitig und bewegen sich in der Welt des anderen mit.

Weitere Adressparameter:

| Parameter | Wirkung |
|---|---|
| (keiner) | verbindet auf Port 8790, fällt still auf Einzelspieler zurück |
| `?server=ws://host:port` | bestimmte Serveradresse |
| `?server=aus` | ausdrücklich allein spielen, kein Verbindungsversuch |
| `?name=NAME` | Charaktername für den Server |
| `?capture=1` | Aufnahmemodus — verbindet nie, keine Bildschleife |

Serveroptionen: `node server/server.mjs [--port 8790] [--seed 4242] [--daten ORDNER] [--test]`.
Die Charaktere liegen als JSON unter `server/daten/`. Löschen dieser Dateien
setzt alle Charaktere zurück.

Warum der Server: er besitzt HP, XP, Level, den Fresschance-Würfel, den
Kreaturenzustand und Tod/Respawn (GDD 11 §120, ARCHITEKTUR.md §7). Der Client
sagt nur, was er möchte, sagt seine Bewegung voraus und wird weich korrigiert.
Ob ein Fressversuch geglückt ist, entscheidet er nie selbst.

---

## 4. Was nachweisbar erfüllt ist

Nichts in diesem Abschnitt ist behauptet — jede Zeile stammt aus einem Lauf, den
man wiederholen kann. Drei Werkzeuge erzeugen die Belege:

```bash
node tools/abnahme.mjs        # beide Abnahmelisten, ~3 min  -> gauntlet/abnahme.json + ABNAHME.md + gauntlet/abnahme/*.png
node tools/zweispieler.mjs    # die drei Netzpunkte, ~3 min   -> gauntlet/zweispieler.json
node tools/fressweg.mjs       # die zwei Ortsangaben, ~7 s    -> gauntlet/fressweg.json
```

`abnahme.mjs` fährt den Prototyp in einem kopflosen Chrome durch **einen
zusammenhängenden Spieldurchlauf** — erschaffen, klicken, laufen, Kreatur
finden, kämpfen, schwächen, fressen (Fehlschlag und Erfolg), aufsteigen,
wachsen, sterben, am Friedhof aufwachen — und misst dabei. Jeder Punkt hat ein
maschinell prüfbares Kriterium und ein Belegbild. Die drei Netzpunkte kann ein
einzelner Client nicht beweisen; sie werden aus `gauntlet/zweispieler.json`
gelesen und gelten als **offen**, wenn diese Datei fehlt — niemals als erfüllt.

**Stand des letzten Laufs** (`gauntlet/abnahme.json`, erzeugt 2026-08-19
02:38:59 UTC, Startwert 1234): **Liste A 22/22 · Liste B 16/17 · gesamt 38/39.**
Die Zahlen bewegen sich, solange am Prototyp gearbeitet wird — maßgeblich ist
immer der eigene Lauf, nicht diese Tabelle.

### Liste A — GDD 01 §70, die 22 Punkte

Alle 22 aus `node tools/abnahme.mjs`, Belegbilder in `gauntlet/abnahme/`.

| # | Punkt | Gemessen | Erfüllt |
|---:|---|---|:--:|
| 1 | Schleim erstellen | 162 Massepunkte / 320 Dreiecke · Volumen 0,991 · Hülle 2,09 × 1,72 × 1,97 bei Radius 1,00 | ja |
| 2 | Aus der dritten Person sehen | Kamera 11,14 Einheiten hinter, 4,45 darüber · Hülle 2,2 % der Bildfläche, ganz im Bild · folgt am Laufende noch | ja |
| 3 | Auf einen Punkt klicken | echter Mausklick auf (800, 143) px → Marke (−12,00 / 12,02) · Rückprojektionsfehler 0,01 px | ja |
| 4 | Schleim dorthin bewegen | Abstand 16,99 → 0,01 Einheiten in 3,19 s, nur über Antrieb | ja |
| 5 | Beschleunigung und Abbremsen | Tempo 0,05 → 7,09 → 0,22 · Streckung 0,934 … 2,336 = 150,1 % Änderung | ja |
| 6 | Richtungswechsel spüren | Drehung 179,84° · Tempo bricht auf 0,33 ein · Streckung im Wendepunkt 0,857, danach 2,261 | ja |
| 7 | Wabbeln sehen | Schwankung 39,6 % um Mittel 0,933 · 5 Richtungswechsel · Schwerpunkt wandert nur 0,033 | ja |
| 8 | Geschwindigkeit an der Form erkennen | Stand 1,009 → Vollgas 2,093 = +107,4 % (249 Proben über 85 % Höchsttempo) | ja |
| 9 | Kreatur finden | Wolf — Level 2 · 48/48 HP · Abstand 9,24 · im Bild bei (800, 334) | ja |
| 10 | Zum Gegner bewegen | Abstand 9,25 → 4,18 (Reichweite 4,28) in 1,00 s | ja |
| 11 | Gegner bekämpfen | 3 Auto-Treffer im Takt 2,00 s · Ziel-HP 48 → 14 · Mund öffnet auf 1,00 | ja |
| 12 | Gegner schwächen | Ziel 14/48 = 29,2 % · HUD-Balken 28,5 % · Fresschance steigt von 14 % auf 27 % | ja |
| 13 | Fressversuch auslösen | Phase „fressen", Fressphase „anlauf" · Ereignis: Chance 27,1 %, Ausgang Fehlschlag | ja |
| 14 | Schleim umschlingt den Gegner | 122 Proben in „umschlingen" · geringster Abstand 0,30 bei Hüllachse vorn 1,53 → Gegner 1,23 Einheiten **innerhalb** der Hülle | ja |
| 15 | Gelingt oder scheitert | 5 Versuche · 3 gelungen (je 100,0 %) · 2 gescheitert (27,1 % / 0,0 %) · Fehlschlag kostet 31 HP | ja |
| 16 | Erfolg/Fehlschlag eindeutig | Bildunterschied 20,5 % · „GEFRESSEN" gegen „WIDERSTANDEN" · Erfolg landet 0,29 vom Gegnerort, Fehlschlag 0,11 von der Ausgangsstelle | ja |
| 17 | Veränderung nach dem Fressen | XP 0 → 49 · squash-Spitze 1,274 gegen Ruhewert 0,943 = 35,1 % praller · Landung 0,29 vom Gegnerort | ja |
| 18 | Mehrere Kreaturen fressen | 3 von 3 Versuchen erfolgreich · Bestiarium „gefressen" = 3 | ja |
| 19 | Level aufsteigen | Level 2 nach 112 XP aus 2 Ereignissen (Schwelle 85) · HUD „27 / 212 XP" | ja |
| 20 | Wachstum erkennen | Radius 1,058 (L2) → 1,260 (L9) = +19,1 % · alle 2 Radiusänderungen fallen auf einen Levelaufstieg · 3 Fressvorgänge ohne Radiuswirkung | ja |
| 21 | Todesanimation | Folge zittern → platzen → zerlaufen → liegen · Breite 2,77 → 3,26 · Höhe 2,52 → 0,94 · Breite/Höhe 1,10 → 3,37 | ja |
| 22 | Am Friedhof respawnen | Friedhof (−18, −18) · Schleim bei (−17,22 / −16,43) · Phase „frei" · HP 128/256 = 50 % | ja |

### Liste B — GDD 11 §121, technische Basis

Punkte 1–14 aus `node tools/abnahme.mjs`, Punkte 15–17 aus
`node tools/zweispieler.mjs`.

| # | Punkt | Gemessen | Erfüllt |
|---:|---|---|:--:|
| 1 | 3D-Welt | 2-m-Messlatte: 224,25 px bei Tiefe 8,61 gegen 76,22 px bei Tiefe 25,32 → Verhältnis 2,94 gegen 2,94, Fehler 0,0 % · 16 Hindernisse | ja |
| 2 | Third-Person-Kamera | Δyaw 1,60 rad · Auge wandert 14,67 Einheiten · Abstand bleibt 11,14 → 11,17 (Δ 0,3 %) | ja |
| 3 | Klickbewegung | Rückprojektionsfehler 0,01 px · Abstand 16,99 → 0,01 · Endgeschwindigkeit 0,22 | ja |
| 4 | Flüssige Schleimbewegung | größte Ortsrate 7,51 (Grenze 10,50) · größte Temporate 35,62 (Grenze 135) · Volumen 0,975 … 1,053 = 5,9 % Abweichung · 622 Proben | ja |
| 5 | Dynamische Verformung | Streckung 0,757 … 3,103 = 309,9 % · squash 0,599 … 2,039 · Stand-squash 0,928 | ja |
| 6 | Kreatur | Wolf (Art `wolf`, Level 2), 48/48 eigene HP, Größe 0,68 | ja |
| 7 | Zielauswahl | `zielId` = 1 · HUD „Wolf — Level 2 · 48 / 48" · Fresschance 14 % | ja |
| 8 | Grundlegender Angriff | 4 Treffer, Einzelschaden 7 / 13 / 7 / 7 | ja |
| 9 | Fressversuch | Ziel 1 · Chance 27,1 % · Phase „fressen" | ja |
| 10 | Fresserfolg | Chance 100,0 % (Level 9 gegen Level 1 → GDD 01 §25) · lebende Kreaturen 1 → 0 · XP +49 | ja |
| 11 | Fressfehlschlag | 110 Proben in „rueckschnapp" · Anlauf 2,74 · Restabstand zur Ausgangsstelle 0,11 = 3,9 % · Regelschaden 31 HP · Gegner lebt (234/234) | ja |
| 12 | HP | Schaden 24 HP (80 → 56), Heilung +24 HP, HUD und Balken folgen ohne Abweichung | ja |
| 13 | Level | Level 2 · MaxHP 102 · XP-Leiste „27 / 212 XP" (12,7 %) | ja |
| 14 | Einfache Fähigkeit | Körperstoß: Mana −11,30 · Ziel −13,00 HP · Slot 2 kühlt ab, Restzeit „6" | ja |
| 15 | Zwei gleichzeitig verbundene Spieler | Prüfung 1 und 2 bestanden (siehe unten) | ja |
| 16 | Serverautoritatives Gameplay | Prüfung 3 **nicht bestanden** — siehe Abschnitt 8 | **nein** |
| 17 | Persistenter Charakter | Prüfung 4 bestanden (siehe unten) | ja |

### Die vier Netzprüfungen

`node tools/zweispieler.mjs` startet den Spielserver, verbindet zwei kopflose
Chrome-Clients und prüft vier Aussagen. Letzter Lauf (`gauntlet/zweispieler.json`,
Startwert 7777, Dauer 188,2 s): **3/4 bestanden.**

| # | Prüfung | Ergebnis |
|---:|---|---|
| 1 | Zwei Spieler gleichzeitig verbunden und sehen einander | bestanden — beide Clients führen `PruefEins` und `PruefZwei`, jeder sieht den anderen als fremden Schleim |
| 2 | Client 2 sieht die Bewegung von Client 1 | bestanden — Client 1 legt 8,99 Einheiten zurück, Client 2 sieht ihn dort, Abweichung 0,01 · Beleg `gauntlet/zweispieler/client2-sieht-client1.png` |
| 3 | Der Server entscheidet den Fressversuch | **nicht bestanden** — die Manipulation im Client bleibt zwar folgenlos (beide Durchgänge liefern dieselbe Folge, ohne Server kippt sie sofort), aber die Ergebnisfolge ist mit `111111` nicht mehr gemischt, weil die geprüfte Ausgangslage inzwischen 100 % Fresschance ergibt. Siehe Abschnitt 8. |
| 4 | Charakter übersteht einen harten Serverneustart | bestanden — Level 2, 55 XP, 102 HP, Gold 19, Bestiarium und Position vor und nach dem Neustart identisch, gelesen aus `server/daten/PruefDauer.json` |

### Die zwei Ortsangaben zum Fressen

`node tools/fressweg.mjs` misst, was GDD 01 §29 und §30 über den **Ort** sagen —
Ortsaussagen werden gemessen, nicht beurteilt. Letzter Lauf
(`gauntlet/fressweg.json`): **beide erfüllt.**

| Regel | Anforderung | Gemessen |
|---|---|---|
| §29 Punkt 5 | Bei Erfolg wird der Standort des Gegners zum neuen Standort | Anlauf 3,20 · Ende 0,767 vom Gegnerort (Grenze 1,09) gegen 2,433 von der Ausgangsstelle |
| §30 Punkt 5 | Bei Fehlschlag landet er ungefähr an seiner Ausgangsposition | Ende 0,096 von der Ausgangsstelle = 3 % der Anlaufstrecke (Grenze 1,09) |

### Leistung

`node tools/leistung.mjs` misst Physik und Hülle getrennt vom Zeichnen
(`gauntlet/leistung.json`, letzter Lauf 2026-08-19 02:58:55 UTC). Kennzahl ist
p10 — auf einer ausgelasteten Maschine sind Median und p95 vom Scheduler
bestimmt, nicht vom Prototyp.

| Szene | Rechenlast p10 | davon Physik | davon HUD | davon Hülle |
|---|---|---|---|---|
| 1 Kreatur | 3,3 ms | 2,6 ms | 0,4 ms | 0,5 ms |
| 5 Kreaturen | 3,1 ms | 2,4 ms | 0,4 ms | 0,5 ms |
| 15 Kreaturen | 3,2 ms | 2,6 ms | 0,4 ms | 0,5 ms |
| Fressen (Erfolg) | 7,7 ms | 7,1 ms | 4,0 ms | 0,5 ms |
| Fressen (Fehlschlag) | 12,6 ms | 11,0 ms | 6,4 ms | 0,5 ms |
| Todesanimation | 3,1 ms | 2,4 ms | 0,3 ms | 0,5 ms |
| Dauerlauf 60 s | 5,7 ms | — | — | — |

Die Rechenlast wächst von 1 auf 15 Kreaturen nicht (Faktor 0,97). Die
Zeichenzeit derselben Messung ist **nicht** aussagekräftig — der kopflose Chrome
rastert mit SwiftShader auf der CPU. Zwei Auffälligkeiten stehen in Abschnitt 8.

---

## 5. Wie beurteilt wird

Messen reicht nur dort, wo es eine Zahl gibt. „Sieht aus wie eine Masse" ist
keine Zahl. Deshalb läuft die Bewertung der Animationen über drei getrennte
Rollen, die einander nicht kennen:

**Der Builder** baut. Jede Datei hat genau einen Besitzer (ARCHITEKTUR.md §1),
fremde Dateien werden gelesen und nie verändert. Der Builder darf sein eigenes
Ergebnis nicht abnehmen.

**Der unabhängige Prüfer** misst gegen `api.metrics()` statt zu raten: Hüllmaße,
Squash, Streckung, Volumen, Achsabstände, Tempo — pro aufgenommenem Bild in
`messwerte.json`. Er prüft die Zahlen gegen die Vorgaben des GDD und schreibt
Befunde in `gauntlet/ARBEITSLISTE.md`. Er sieht den Code, aber nicht die Absicht
des Builders.

**Der blinde Richter** entscheidet, ob es gut aussieht. `tools/blind.mjs` nimmt
ein Bild aus unserer Aufnahme und ein Bild aus dem **echten Referenzmaterial**
unter `ref/` — Slime Rancher 2 für den Schleimkörper, World of Warcraft für das
HUD —, bringt beide auf dieselbe Breite, entfernt jeden Hinweis auf die Herkunft
und legt sie in zufälliger Reihenfolge als `A.png` und `B.png` ab. Der Schlüssel
landet **außerhalb** des Vergleichsordners (`gauntlet/schluessel/`). Der Richter
sieht nur die zwei Bilder und das Kriterium aus dem GDD; er weiß weder, welches
Bild unseres ist, noch in welcher Runde er urteilt. Sein Urteil landet in
`gauntlet/urteile/<teil>.json` — mit Begründung, mit der konkreten Lücke, und
mit dem Vermerk `beideSchwach`, wenn beide Bilder das Kriterium verfehlen.

Ein Teil gilt erst dann als gewonnen, wenn der Richter unser Bild gewählt hat
**und** `beideSchwach` nicht gesetzt ist. Ein Sieg als kleineres Übel ist kein
Sieg; die Latte lautet „gewinnt", nicht „verliert weniger".

Stand der ersten Runde (`gauntlet/urteile/`, 17 Teile): unser Bild wurde in 8
Fällen gewählt, davon 5 ohne den Vermerk `beideSchwach` — gewonnen sind also
`cooldowns`, `hotbar`, `tod`, `umschlingung` und `zielanzeige`. Die
Gesamtansicht baut `node tools/fortschritt.mjs` als einzelne HTML-Datei
(`gauntlet/fortschritt.html`), die alle Kontaktbögen als eingebettete Bilder
enthält und ohne Server funktioniert.

---

## 6. Eine eigene Aufnahme machen

```bash
node tools/capture.mjs --liste          # alle Szenarien mit Titel
node tools/capture.mjs wabbeln          # ein Szenario
node tools/capture.mjs --alle           # alle nacheinander
node tools/capture.mjs wabbeln --out probelauf --seed 1234
```

`--out` ersetzt nur den Zeitstempel im Ausgabepfad durch einen eigenen Namen
(hier `gauntlet/shots/wabbeln/probelauf/`); ein absoluter Pfad funktioniert
dort nicht.

Das Werkzeug startet den Prototyp in einem kopflosen Chrome, spielt das
Szenario in festen Schritten von 1/240 s ab und stellt die Uhr von außen vor.
Kein Bild hängt an der Bildrate der Maschine — dieselbe Eingabe ergibt immer
dieselben Bilder.

Ergebnis in `gauntlet/shots/<szenario>/<zeitstempel>/`:

| Datei | Inhalt |
|---|---|
| `frame_000.png` … | Einzelbilder, 1600 × 900 |
| `kontakt.png` | Kontaktbogen: alle Bilder in einem Raster, mit Bildnummer und Millisekunde. **Das ist das Bild, das der Richter anschaut.** |
| `messwerte.json` | `api.metrics()` pro aufgenommenem Bild |
| `szene.json` | was das Szenario gemacht hat |

Beispiel:

```
$ node tools/capture.mjs wabbeln
aufnehmen: wabbeln ... 20 Bilder -> gauntlet\shots\wabbeln\20260819-045056\kontakt.png
```

Vorhandene Szenarien: `wabbeln`, `anrollen`, `vollgas`, `bremsen`,
`richtungswechsel`, `aufprall`, `fressanlauf`, `umschlingung`, `absorption`,
`rueckschnapp`, `tod`, `autoangriff`, `biss`, `wachstum`, `hud`, `hotbar`,
`zielanzeige`, `trefferzahlen`, `cooldowns` sowie fünf `g-*`-Szenen für die
spätere Grafikphase. Neue Szenarien werden in `client/capture.js` unter
`SZENARIEN` eingetragen; das Format steht in ARCHITEKTUR.md §6.

---

## 7. Was ausdrücklich nicht drin ist

GDD 12 §4 grenzt den Umfang der beiden Phasen ab. Draußen bleiben — nicht aus
Zeitmangel, sondern weil sie hier nichts beweisen würden:

| Nicht enthalten | Wo es hingehört |
|---|---|
| Quests, Story, Questgeber | GDD 07 · spätere Phase |
| Klassen, Talente, Builds | GDD 03 · Phase 4 (GDD 12 §7) |
| Welt, Zonen, Fraktionspolitik, Lore-Orte | GDD 06 / GDD 09 |
| Handel, Wirtschaft, Auktionshaus | GDD 08 |
| Inventar, Ausrüstung, Itemization | GDD 05 |
| Charakterplätze, dauerhafte Eigenschaften, Fortschrittsverlust | GDD 04 |
| Detailstufen, Streaming, Grafikniveau Genshin/ToF | `PHASE-GRAFIK.md`, startet erst nach dieser Abnahme |

Die Testarena ist absichtlich schlicht: eine Ebene, sechs Felsen, eine enge
Passage, ein Plateau zum Runterspringen, ein Friedhof. Es gibt genau drei
Kreaturenarten (Schleimling, Wolf, Eber) und fünf Fähigkeiten. Mehr Welt würde
nur davon ablenken, ob sich der Schleim gut anfühlt.

Ebenfalls draußen und nie geplant, weil das GDD sie verbietet (GDD 01 §62, §16,
§18, §5): humanoide Laufanimation, Identität über Rüstung, Verwandlung in
Kreaturen, automatisches Fressen durch reinen Levelüberschuss, Wandklettern,
Schwimmen, ein völlig flacher oder beliebig verformbarer Körper.

---

## 8. Bekannte Grenzen

Die vollständige, laufend geführte Liste steht in
**`gauntlet/ARBEITSLISTE.md`** — 44 Einträge, davon 8 blockierend, 19 wichtig,
17 klein, jeder mit GDD-Fundstelle, zuständiger Datei und einem Kriterium, an
dem man die Behebung messen kann. Was hier steht, ist die Kurzfassung; die
Arbeitsliste ist maßgeblich.

### Der eine offene Abnahmepunkt

**B16 „serverautoritatives Gameplay" ist derzeit nicht belegt.** Nicht, weil der
Server die Entscheidung abgäbe — die Prüfung zeigt weiterhin, dass eine
Manipulation der Fresschance im Client das Ergebnis nicht verändert, während
dieselbe Manipulation ohne Server sofort durchschlägt. Sondern weil die
Prüfaufstellung von `tools/zweispieler.mjs` (Spieler Level 5 gegen Wolf Level 2
bei 5 % Rest-HP) nach der Korrektur der Fresschance-Kurve 100 % ergibt: alle
sechs Würfe gelingen, die Folge lautet `111111`, und eine Folge ohne jeden
Fehlschlag kann nicht zeigen, dass die Würfel vom Server kommen. Die Prüfung
braucht eine Ausgangslage mit einer Chance zwischen etwa 20 % und 80 %. Bis
dahin bleibt der Punkt offen — das Werkzeug meldet lieber „nicht bestanden" als
einen Nachweis, der keiner ist.

### Blockierende Punkte aus der Arbeitsliste

Beim Nachprüfen am 19.08.2026 unverändert offen:

* **Kein Aufnahmeszenario für die drei Netzpunkte.** Alle Szenarien in
  `client/capture.js` sind Einzelspieler. Fremde Schleime werden inzwischen
  gezeichnet, aber es gibt keinen Kontaktbogen, auf dem zwei Spieler
  gleichzeitig zu sehen sind, und keinen Bildbeleg für Persistenz über einen
  Serverneustart. Der Nachweis existiert nur als Werkzeugausgabe.
* **Keine Körperkollision zwischen Schleim und Kreatur.** `istFrei` wird nur
  für die Bewegung der Kreaturen gegen Weltobjekte benutzt. Während des
  Auto-Angriffs steckt der Gegner deshalb im Schleimkörper — gemessen lag die
  Lücke über 14 s Kampf durchgehend zwischen −0,19 und −0,82 Einheiten. Damit
  ist im Bild nicht ablesbar, wer wen trifft, und das Bild „Gegner in der
  Masse" ist laut GDD 01 §28 dem Fressen vorbehalten.
* **Erfolg und Fehlschlag des Fressens sind am Körper schwer zu unterscheiden.**
  Das HUD trennt sie deutlich, die Körperform bisher nicht. Der Erfolgsgipfel
  hat sich gebessert (squash 1,274 gegen Ruhewert 0,943), die Blindurteile für
  `absorption` und `rueckschnapp` stehen aber weiterhin auf verloren.

Nachweislich behoben, seit die Arbeitsliste zuletzt geschrieben wurde — beim
Schreiben dieses Dokuments nachgemessen:

* Der Client startet nicht mehr clientautoritativ: ohne jeden Adressparameter
  verbindet er auf Port 8790 und zeigt oben links **SERVER**; ohne erreichbaren
  Server steht dort **EINZELSPIELER**, `?server=aus` bleibt ausdrücklich allein.
* Es gibt ein Wachstumsszenario (`capture.mjs wachstum`, feststehende Kamera).
* Der Friedhof ist ein Ort: eine Senke, ein Kranz aus sechs Findlingen, ein
  aufrechtes Mal — nicht mehr nur ein Bodenring.
* Die Verformungsszenen filmen quer zur Fahrtrichtung statt frontal.
* Die Fresschance trifft die Stützwerte des GDD: Spieler 3 gegen Gegner 1 bei
  vollem Leben ergibt 40,0 %, der Übergang zur Abkürzung nach §25 läuft über
  82,8 % (L8) auf 100 % (L9) statt in einem Sprung; ab 6 Leveln Rückstand 0 %.
* Die Ruheform ist nicht mehr doppelt so breit wie hoch: gemessen 2,09 zu 1,72
  = Verhältnis 1,21, im Zielband der Referenz (1,20–1,45).
* Hotbar-Slot 1 ist kein toter Knopf mehr.

### Weiteres, das man beim Spielen merkt

* **Keine Wegberechnung.** Der Schleim nimmt die Luftlinie zum Klickziel;
  Hindernisse wirken erst als Kollision. Wer hinter einen Felsen klickt, sieht
  den Schleim dagegenfahren und langsam daran entlangrutschen.
* **Die enge Passage hält fest.** Die Lücke ist 1,8 m breit, der Körper bei
  Level 1 rund 2,4 m — auf hohen Leveln kommt er gar nicht mehr hinein.
* **Kein Spielmenü.** `Esc` schaltet nur das Tuning-Panel um, genau wie `H`.
* **Kein Feedback bei scheiternden Aktionen.** `game.js` liefert die Gründe
  („kein ziel", „zu weit", „abklingzeit", „ressource", „tot") zurück, das HUD
  zeigt sie nicht an — man drückt, und nichts geschieht.
* **Klicks auf das HUD bewegen den Schleim.** Nur die Hotbar fängt Mausklicks
  ab; ein Klick auf Minimap, Gruppenrahmen oder Zielrahmen setzt ein
  Bewegungsziel.
* **Keine Lebensregeneration außerhalb des Kampfes.** Nach dem Respawn mit 50 %
  HP bleibt es dabei; die einzige Heilung ist Slot 4 mit 18 s Abklingzeit, was
  nirgends erklärt wird.
* **Der Auto-Angriff ist schwer wieder loszuwerden.** Ein Klick auf den Boden
  beendet ihn — das sagt aber niemand.
* **Das Zielportrait ist bei dunklen Kreaturen kaum zu erkennen**, und der
  Zielrahmen sitzt unten rechts, diagonal maximal weit vom Spielerrahmen.
* **Die Todespfütze verschwindet**, sobald man am Friedhof erscheint, statt
  liegen zu bleiben (GDD 01 §50 Punkt 4 verlangt das Gegenteil).
* **Der Server prüft gemeldete Positionen nicht gegen Hindernisse**, nur gegen
  Wegbudget und Weltgrenze.
* **Das HUD wird 240-mal je Sekunde neu gerechnet.** `game.js` ruft
  `UI.aktualisieren` in jedem Teilschritt statt einmal je Bild. Während der
  Fressanimation sind dadurch 56 % (Erfolg) bzw. 58 % (Fehlschlag) der
  gemessenen „Physik"-Zeit in Wahrheit HUD-Arbeit — 4,0 von 7,1 ms und 6,4 von
  11,0 ms bei p10. Der Prototyp trägt das, aber die Zahl ist vermeidbar.
* **Der Heap wächst langsam:** +352 kB über 60 s Dauerlauf. Für einen
  Prototypenlauf unerheblich, für eine Sitzung über Stunden nicht.

Die Grafik ist Zweckgrafik. Sie ist ausdrücklich noch nicht Gegenstand dieser
Abnahme — dafür gibt es `PHASE-GRAFIK.md`, und diese Phase beginnt erst, wenn
beide Abnahmelisten erfüllt und die Blindvergleiche gewonnen sind.

---

## 9. Dateiübersicht

### Dokumente

| Datei | Inhalt |
|---|---|
| `SPEC-BRIEF.md` | verbindliche Kurzfassung des Auftrags: Umfang, beide Abnahmelisten, Leitregeln, harte Verbote, die Latte |
| `ARCHITEKTUR.md` | Dateibesitz, Determinismus, `window.SLIMORIA`-Schnittstelle, `metrics()`-Vertrag, Aufnahmeformat, Serverautorität |
| `PHASE-GRAFIK.md`, `PHASE-GRAFIK-PLAN.md` | Auftrag und Plan für die spätere Grafikphase |
| `gauntlet/ARBEITSLISTE.md` | die 44 offenen Befunde mit Fundstelle, Datei und Messkriterium |
| `gauntlet/ABNAHME.md` | die Abnahmetabelle im Klartext, von `tools/abnahme.mjs` geschrieben |

### Client (`client/`)

| Datei | Zuständig für |
|---|---|
| `index.html` | lädt alle Skripte, hält Leinwand, HUD-Wurzel und Tuning-Panel |
| `main.js` | Leinwand, Maus- und Tastatureingabe, Kamera, Bildschleife |
| `game.js` | Spielzustand und Ablaufsteuerung — ruft die Lanes auf, führt HP/XP/Level/Abklingzeiten, stellt `window.SLIMORIA.api` bereit |
| `core.js` | Mathe- und Geometriewerkzeuge |
| `rng.js` | gesäter Zufall — der einzige erlaubte Zufall in der Spiellogik |
| `world.js` | die Testarena: Ebene, Felsen, enge Passage, Plateau, Friedhof |
| `softbody.js` | der Weichkörper in 3D: Massepunkte, Innendruck, Kollision |
| `slime.js` | der Schleim als Spielfigur: Antrieb, Klickziel, Tempoverformung |
| `tuning.js` | alle Stellschrauben des Spielgefühls an einem Ort |
| `deform.js` | gemeinsame Verformungswerkzeuge (Stauchen, Impuls) |
| `eat.js` | Fressen — Anlauf, Umschlingen, Absorption, Rückschnapp (GDD 01 §26–32) |
| `combat.js` | Auto-Angriff und Biss (GDD 02 §2–7) |
| `death.js` | Todesanimation: zittern, platzen, Pfütze (GDD 01 §50) |
| `renderer.js` | WebGL2-Renderer ohne Fremdbibliotheken; erweiterbar über `R.extras` |
| `ui.js`, `ui.css` | HUD nach GDD 10: Rahmen, Hotbar, Zielanzeige, Schwebetexte |
| `charakter.js`, `charakter.css` | Charaktererstellung: Name, Fraktion, Gesicht, Persistenz |
| `net.js` | Netzschicht: Verbindung, Vorhersage, weiche Korrektur, fremde Schleime |
| `capture.js` | Aufnahmetreiber und die Szenarienliste |
| `style.css` | Grundgerüst der Seite |

### Server (`server/`) und gemeinsam (`shared/`)

| Datei | Zuständig für |
|---|---|
| `server/server.mjs` | der autoritative Spielserver: WebSocket, Takt 20/s, Sicherung alle 2 s |
| `server/welt.mjs` | die autoritative Welt: Spieler, Kreaturen, Kampf, Fresswurf |
| `server/persistenz.mjs` | Charaktere als JSON unter `server/daten/` |
| `server/arena.mjs` | die Arena, wie der Client sie kennt |
| `server/zufall.mjs` | gesäter Zufall des Servers |
| `shared/regeln.js` | Regeln, die Client und Server **identisch** rechnen müssen: Kreaturenwerte, HP/Mana/Schaden, XP-Kurve, Fresschance, Fähigkeiten |

### Werkzeuge (`tools/`)

| Datei | Zweck |
|---|---|
| `serve.mjs` | Dateiserver zum Selberspielen (`http://127.0.0.1:8099/client/index.html`) |
| `capture.mjs` | Szenarien aufnehmen: Einzelbilder, Kontaktbogen, Messwerte |
| `abnahme.mjs` | beide Abnahmelisten in einem Spieldurchlauf beweisen |
| `zweispieler.mjs` | die drei Netzpunkte beweisen: zwei Spieler, Serverautorität, Persistenz |
| `fressweg.mjs` | die zwei Ortsangaben zum Fressen messen (GDD 01 §29/§30) |
| `leistung.mjs` | Physik-, Hüll- und Zeichenzeit getrennt messen |
| `blind.mjs` | Blindvergleich vorbereiten: A/B anonymisieren, Schlüssel auslagern |
| `fortschritt.mjs` | Fortschrittsseite als einzelne, weiterreichbare HTML-Datei bauen |
| `livestand.mjs` | den aktuellen Stand in die Live-Fortschrittsseite eintragen |
| `smoke-webgl.mjs` | prüft, ob der kopflose Chrome überhaupt WebGL2 liefert |

### Ergebnisse (`gauntlet/`) und Referenzmaterial (`ref/`)

| Ordner | Inhalt |
|---|---|
| `gauntlet/abnahme/` | Belegbilder der Abnahmepunkte |
| `gauntlet/shots/` | Aufnahmen je Szenario, je Lauf ein Zeitstempelordner |
| `gauntlet/blind/` | anonymisierte Vergleichspaare `A.png` / `B.png` |
| `gauntlet/schluessel/` | die Auflösung dazu — bewusst außerhalb von `blind/` |
| `gauntlet/urteile/` | die Urteile des blinden Richters, mit Begründung und Lücke |
| `ref/` | echtes Referenzmaterial: Slime Rancher 2, Cuphead, World of Warcraft, Genshin Impact, Sprite-Abfolgen mit Dossier |

Verglichen wird immer gegen das **Material** unter `ref/`, nie gegen eine
Beschreibung davon.
