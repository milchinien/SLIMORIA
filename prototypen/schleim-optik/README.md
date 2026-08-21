# Prototyp: Schleimoptik

Ein einzelner Schleim, so schön wie es ohne Fremdbibliothek geht. Hier geht es
**nur um das Material** — wie Licht durch die Masse läuft, was sie davon
schluckt, was sie zurückstreut und was auf der nassen Haut glänzt.

Kampf, Fressen, Wachstum: bewusst nicht drin. Laufen schon — aber nur, damit
man das Material in Bewegung beurteilen kann. Wer das *Bewegungsgefühl* sucht,
ist bei [`../slime-bewegung/`](../slime-bewegung/) richtig: der Prototyp
simuliert einen echten Weichkörper, sieht dafür aber schlicht aus. Dieser hier
ist das Gegenstück — dünne Verformung, teure Optik.

Öffnen: `index.html` doppelklicken. Kein Server, kein Build, keine
Abhängigkeiten — reines WebGL2 und JavaScript.

---

## Steuerung

| Eingabe | Wirkung |
|---|---|
| **Rechte Maustaste ziehen** | Umsehen — **der Schleim dreht sich mit**, die Kamera bleibt hinter ihm |
| **Linke Maustaste ziehen** | Nur umschauen; der Schleim bleibt stehen, wie er steht |
| **Beide Maustasten** | Vorwärts laufen |
| **Mausrad** | Zoom (läuft weich nach) |
| **W / S** | Vor und zurück · **A / D** drehen · **Q / E** seitwärts |
| **Leertaste** | Hüpfen (Landung staucht und schwingt aus) |
| **Knopf „Bewegen"** oder **B** | Der Schleim läuft von selbst durch die Arena |
| **Klick auf den Schleim** | Anstupsen — die Delle federt zurück |
| **F** | Kamera hinter dem Schleim halten (an) |
| **C** | Autodrehung der Kamera an/aus (hat Vorrang vor „Folgen") |
| **1–6** | Farbwelten: Valoria, Drakhar, Smaragd, Amethyst, Honig, Milchglas |
| **G** | Augen · **X** Dickenpuffer · **P** Pause |
| **R** | Kamera und Standort zurücksetzen · **F2** Bildschirmfoto · **H** Panel |

Die Steuerung ist die aus WoW: Bewegung geht immer relativ zur **Blickrichtung
des Schleims**, nicht zur Kamera. `A` und `D` drehen ihn auf der Stelle, statt
ihn seitwärts zu schieben — dafür gibt es `Q` und `E`.

Rechts liegen 20 Regler. Alles, was das Material ausmacht, lässt sich im
laufenden Bild verstellen — Dichte, Brechung, Trübung, Durchleuchtung,
Innenleben, Rauheit, Spiegelung, Randlicht, Sonnenstand, Bloom, Belichtung.

---

## Wie das Bild entsteht

Der Schleim wird **nicht alpha-gemischt**. Er liest den bereits gezeichneten
Hintergrund selbst aus einer Textur, verbiegt ihn, schluckt Licht auf dem Weg
durch die Masse und legt Streuung, Spiegelung und Glanz darauf. Am Ende ist er
ein undurchsichtiges Pixel — und trotzdem durchsichtig anzusehen. Nur so
stimmen Brechung und Absorption; mit gewöhnlicher Transparenz geht beides nicht.

Reihenfolge pro Bild:

| # | Durchgang | Was passiert |
|---|---|---|
| 1 | **Szene** | Himmel, Boden, Felsen, Leuchtkern, Blasen, Staub — in ein HDR-Ziel |
| 2 | **Dicke** | Rückseiten addieren ihre Kameraentfernung, Vorderseiten ziehen sie ab. Was übrig bleibt, ist die Strecke durch die Masse (halbe Auflösung) |
| 3 | **Kopie** | Die Szene wird kopiert und zusätzlich unscharf gerechnet |
| 4 | **Schleim** | Brechung, Absorption, Volumenstreuung, Spiegelung, Glanz |
| 4b | **Augen** | weich darübergeblendet |
| 5 | **Bloom** | Hellpass und zwei Unschärfestufen |
| 6 | **Final** | Belichtung, ACES, Vignette, Farbquerung, Filmkorn |

Der **Dickenpuffer** aus Durchgang 2 ist der Schlüssel. Er sagt für jedes Pixel,
wie viel Schleim davorliegt, und steuert damit fast alles:

| Wirkung | woraus |
|---|---|
| **Absorption** | Beer-Lambert, ein Koeffizient je Farbkanal. Ein blauer Schleim ist einer, der Rot frisst. Deshalb wird er zur Mitte hin satt und an den dünnen Rändern hell — von selbst, nicht per Farbverlauf |
| **Brechung** | Der Hintergrund wird entlang der Normalen verschoben, je dicker desto weiter; die drei Kanäle leicht verschieden, das gibt den Farbsaum |
| **Trübung** | Dicke Masse streut das durchgelassene Licht — dort wird die Brechung unscharf, an dünnen Rändern bleibt sie glasklar. Ohne das sieht Gel aus wie Fensterglas |
| **Innenleben** | Acht Schritte durch den Körper entlang desselben Blicks: die Schlieren liegen wirklich *im* Volumen, nicht auf der Haut |
| **Durchleuchtung** | Gegenlicht kommt gefärbt auf der Vorderseite wieder heraus, gedämpft mit der Dicke |

Dazu kommen Fresnel-Spiegelung eines prozeduralen Himmels (derselbe, der auch
den Hintergrund malt — deshalb passt das Spiegelbild immer zur Umgebung), ein
GGX-Glanzlicht plus breite zweite Keule für die nasse Haut, und ein Randsaum.

**Auf dem Boden** liegen Schlagschatten, Kontaktschatten und der farbige
Lichtsee, den die Masse durchlässt — mit wandernden Kaustik-Adern. Der See ist
der halbe Grund, warum der Körper saftig statt aufgeklebt wirkt.

**Beim Laufen** neigt sich die Masse und streckt sich in Laufrichtung. Beides
läuft der Geschwindigkeit *träge hinterher*: beim Anfahren bleibt der Körper
zurück, beim Bremsen schwingt er nach vorn. Dazu ein Kriechpuls, der ihn in
Wellen vorwärtsschiebt, und ein Gesicht, das sich in die Laufrichtung dreht —
und ausblendet, sobald es von der Kamera weg zeigt. Im Stand dreht sich das
Gesicht zur Kamera — sonst bekäme man es bei einer Kamera, die immer hinten
sitzt, nie zu sehen. Felsen schieben ihn weg.

**Die Kamera sitzt hinter ihm** und bleibt dort. Sie hängt nicht an der
Laufrichtung, sondern am **Kurs** des Körpers — deshalb schwenkt sie auch mit,
wenn er sich auf der Stelle dreht. Gespeichert wird nur `versatz`: der Winkel,
den man mit der linken Maustaste weggezogen hat. Im Stand bleibt der erhalten,
damit man ihn in Ruhe von vorn ansehen kann; sobald er losläuft, federt er auf
null zurück, und die Kamera landet wieder im Rücken. Beim Ziehen mit rechts
geht sie 1:1 mit — jeder Nachlauf fühlt sich beim Mausschauen zäh an. Bei
Tastendrehung hinkt sie rund 15° hinterher, was dem Körper Masse gibt.

**Der Umriss** ist keine Kugel, sondern ein Tropfen: unten breit, oben gewölbt,
die Unterseite gegen den Boden plattgedrückt. Verformt wird im Vertexshader;
die Normale wird nicht mitgeliefert, sondern aus zwei Nachbarpunkten derselben
Verformung berechnet — dadurch stimmt sie immer, egal wie stark er wabbelt.
Beim Hüpfen rundet sich die Unterseite wieder, und Schatten wie Lichtsee gehen
mit der Flughöhe weicher.

---

## Was aus dem GDD umgesetzt ist

* §7 Gesicht: Augen liegen im Gel, nicht darauf
* §8 Fraktionsfarben Valoria (blau) und Drakhar (rot), dazu vier weitere Welten
* §5 Er wird nie völlig flach — die Unterseite drückt sich, der Rest bleibt Tropfen
* §20 Aufprall staucht und schwingt aus (hier als Feder, nicht als Simulation)

## Bekannte Grenzen

* **Keine echte Weichkörperphysik.** Wabbeln, Stauchen, Neigen und die Delle
  vom Anstupsen sind Formeln im Shader, keine Simulation. Er reagiert deshalb
  nur auf das, was vorgesehen ist — anders als `slime-bewegung/`.
* **Kein Pathfinding.** Beim Wandern läuft er stur auf sein Ziel zu; Felsen
  schieben ihn nur zur Seite, umlaufen kann er sie nicht.
* Die Dicke wird ohne Tiefentest gemessen: steht etwas vor dem Schleim, zählt
  das für die Brechung nicht mit. Bei einem freistehenden Körper fällt das
  nicht auf, in einer vollen Szene schon.
* Die Blasen im Inneren sind additive Kugeln, keine echten Hohlräume. Bei sehr
  hoher Blasenzahl werden sie zu hellen Schlieren.
* Die Augen liegen als eigene Schicht über der Masse. Sie werden dadurch nicht
  mit gebrochen — dafür sind sie überhaupt zu sehen.
* Es gibt keine Kamerakollision und keinen Mund.
* Braucht WebGL2. Ohne `EXT_color_buffer_float` fällt der Prototyp auf
  8-Bit-Ziele zurück: läuft, aber Bloom und Durchleuchtung verlieren Kopfraum.

## Kosten

Gerendert wird mit dem 1,35-fachen der Bildschirmauflösung und vom Browser
herunterskaliert — die billigste Kantenglättung, die es gibt. Pro Bild laufen
elf Durchgänge, die meisten davon in halber oder viertel Auflösung. Die
tatsächliche Bildrate und die Zeit pro Bild stehen live oben links im HUD;
zum Vergleichen die Regler `Bloom` auf 0 und `Innenleben` auf 0 stellen —
das sind die beiden teuersten Posten.

## Dateien

| Datei | Inhalt |
|---|---|
| `core.js` | Mathe, Icosphere, WebGL2-Wrapper (Programm, Mesh, Renderziel) |
| `shader.js` | Alle GLSL-Quellen |
| `main.js` | Szene, Kamera, Renderpfad, Bewegung, Eingabe, Bedienfeld |
| `serve.mjs` | winziger statischer Server (`node serve.mjs`), nötig ist er nicht |
