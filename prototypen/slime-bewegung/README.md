# Prototyp: Schleimbewegung (3D)

Testet die erste Säule aus [GDD-01](../../Doc/gdd/GDD-01-Core-Gameplay-Slime.md):
**Bewegen**. Alles andere (Fressen, Kampf, Wachstum) ist bewusst nicht drin.

Öffnen: `index.html` doppelklicken. Kein Server, kein Build, keine
Abhängigkeiten — reines WebGL2 und JavaScript.

---

## Steuerung

| Eingabe | Wirkung |
|---|---|
| **Linksklick** | Ziel auf dem Boden setzen (halten = Ziel folgt der Maus) |
| **Rechts ziehen** | Kamera drehen und neigen |
| **Mausrad** | Zoom |
| **Shift + links ziehen** | Am Schleim zupfen und schleudern |
| **WASD** | Direktsteuerung (kameraabhängig, nur zum Testen) |
| **Q / E** | Kamera drehen |
| **Leertaste** | Hüpfen |
| **K** | Kanone — Sprung nach vorn mit hartem Aufprall |
| **X** | Massepunkte einblenden (das Physiknetz) |
| **P** | Pause · **R** Reset · **F** Fraktion · **H** Panel |
| **1–4** | Presets: Standard, Träge Masse, Flutschig, Gallerte |

---

## Was hier bewusst *nicht* animiert ist

Verformung, Wabbeln, Nachschwingen, Strecken bei Tempo und der Aufprall-
Klatscher sind **keine Animationen**. Sie fallen aus der Simulation heraus.
Deshalb reagiert der Körper auf jede Situation von selbst richtig — auch auf
solche, die niemand vorher bedacht hat.

**Physiknetz:** 162 Massepunkte (Icosphere), 480 Kanten, 240 Hz, feste
Zeitschritte unabhängig von der Bildrate.

| Kraft | Wozu |
|---|---|
| Kantenfedern | halten die Haut zusammen |
| Biegefedern | verhindern scharfe Knicke beim Aufprall |
| Formfedern | ziehen auf die Ruheform, progressiv steifer bei großer Auslenkung |
| Volumendruck | erhält das Volumen — er quillt seitlich aus, wenn er gestaucht wird |
| Viskosität | Nachbarpunkte gleichen Geschwindigkeit an: Verformungen *fließen*, statt zu federn |
| Bodenfeder | weicher Kontakt statt harter Klemmung (harte Klemmung erzeugt Knickkanten) |
| Bodenhaftung | er klebt am Boden und muss sich beim Abheben ablösen |
| Kriechwelle | der Schub läuft als Welle von hinten nach vorn durch die Masse |

**Gezeichnet** wird nicht das Physiknetz, sondern eine zweifach unterteilte
Hülle (Loop-Subdivision, 162 → 642 → 2562 Punkte) mit formerhaltender
Taubin-Glättung. Deshalb bleibt die Silhouette auch aus der Nähe rund.
Kosten gemessen: **1,74 ms pro Bild** bei 1600×900, davon 0,8 ms Physik.

**Gesicht:** Augen und Mund werden aus der tatsächlichen Oberfläche
abgeleitet (gewichtete Mittelung der Hüllpunkte in Blickrichtung) und liegen
*im* Gel. Sie verformen sich dadurch mit dem Körper, statt aufgeklebt zu
wirken — GDD §7.

---

## Was aus dem GDD umgesetzt ist

* §9 Indirekte Steuerung per Klick, §10 drehbare/neigbare/zoombare Kamera
* §12 Bewegungsanimation: Nachziehen, Wippen, seitliches Wabbern
* §13 Anrollen → Beschleunigen → Abbremsen mit Nachschwingen
* §14 Tempo verformt die Form (Streckung in Bewegungsrichtung)
* §15 Richtungswechsel kostet Grip und Zeit
* §17 Kleine Öffnungen: die enge Passage ist schmaler als der Schleim
* §20 Aufprall verformt stark und federt zurück
* §5 Er wird nie völlig flach (progressive Versteifung)
* §8 Fraktionsfarben Valoria (blau) / Drakhar (rot)

## Gemessene Werte (Standard-Preset)

* Eingestelltes Max-Tempo wird erreicht (7,0 → gemessen 7,1 m/s)
* Enge Passage: passierbar ab **1,8 m** Spaltbreite bei ~2,2 m Körperbreite
* Stehend sackt er auf ~0,8 m Höhe zusammen, im Lauf richtet er sich auf 1,17 m auf
* Sprunghöhe ~2,1 m, Landung schwingt in ~1,5 s aus

---

## Bekannte Grenzen

* **Kein Pathfinding.** Er läuft stur Richtung Ziel und bleibt an Hindernissen
  hängen. GDD §11 verlangt eine Wegberechnung — die fehlt hier komplett.
* **Keine Kamerakollision.** Die Kamera fährt durch Felsen und Mauern.
* Bei der Kanone (härtester Aufprall) kann sich die Oberfläche für wenige
  Bilder in sich selbst falten. Bei normalem Sprung und Sturz tritt das nicht auf.
* Das Gesicht ist ein Platzhalter aus Kugeln, keine Charaktererstellung.
* Die Welt ist eine flache Ebene — keine Hänge, keine Treppen, kein Wasser.
* Braucht WebGL2 (jeder aktuelle Browser).

## Dateien

| Datei | Inhalt |
|---|---|
| `core.js` | Mathe, Icosphere, Topologie, Loop-Unterteilung |
| `softbody.js` | Die Weichkörper-Simulation |
| `slime.js` | Antrieb, Blickrichtung, Sprung, Gesichtspunkte, Schleimspur |
| `renderer.js` | WebGL2-Pipeline und Shader |
| `main.js` | Welt, Kamera, Eingabe, Schleife, Tuning-Panel |
