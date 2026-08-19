# NACHWEIS — unabhaengige Nachpruefung

Gemessen am 2026-08-19 zwischen 05:10 und 05:40, waehrend die Gauntlet-Runde
lief. Keine Projektdatei wurde geaendert. Grundlage sind ausschliesslich
eigene Laeufe; die fuenf Arbeitsberichte wurden als Behauptung behandelt,
nicht als Beleg.

Kurzfassung: **Der Prototyp laeuft. Alles Gemessene haelt.** Von den 39 Punkten
beider Abnahmelisten sind 38 belegt. Der einzige rote Punkt — B16
serverautoritatives Gameplay — ist **kein Produktfehler, sondern ein Fehler in
der Pruefaufstellung**; ich habe die Serverautoritaet unabhaengig
nachgemessen und sie haelt. Details in §4 und §9.

---

## 1. Syntaxpruefung — bestanden

`node --check` auf **35 Dateien**: 17 × `client/*.js`, 1 × `shared/*.js`,
12 × `tools/*.mjs`, 5 × `server/*.mjs`.

```
geprueft: 35 Dateien, Fehler: 0
```

Zusatzpruefung Determinismus (ARCHITEKTUR §2):

| Verbot | Treffer in `client/` + `shared/` |
|---|---|
| `Math.random` | keiner — einziger Fund ist der Kommentar in `client/rng.js:6` |
| `new Date` / `Date.now` | keiner |
| `performance.now` | keiner |
| `setTimeout` / `setInterval` | **ein** Fund: `client/net.js:135` |

Der eine Fund ist die Zeitgrenze fuer den Verbindungsaufbau, mit Begruendung
im Code („Das ist Transport, keine Spiel-Logik"). Er liegt ausserhalb der
Simulationsschleife, und `client/net.js:813` bricht im Aufnahmemodus vor jedem
Verbindungsversuch ab. Kein Verstoss.

---

## 2. Aufnahme aller Szenarien — kein Seitenfehler

```
node tools/capture.mjs --alle --out nachweis
```

**24 Szenarien, 273 Einzelbilder, Ruecksprungwert 0.** Der Block
„Seitenfehler waehrend der Aufnahme" erscheint nicht — weder `pageerror` noch
eine `console.error`. Der Lauf wurde zweimal gefahren, weil die erste Ausgabe
beim Abschneiden nicht bis zur Fehlerzeile reichte; beide Laeufe sind sauber.

Szenarien: wabbeln · anrollen · vollgas · bremsen · richtungswechsel ·
aufprall · fressanlauf · umschlingung · absorption · rueckschnapp · tod ·
autoangriff · biss · wachstum · hud · hotbar · zielanzeige · trefferzahlen ·
cooldowns · g-schattenkante · g-randlicht · g-fernsicht · g-bodenlicht ·
g-nacht.

---

## 3. `tools/abnahme.mjs`

```
Station  1–12 ... alle ok  (Station 9: Level 9 · Station 10: 3/3)

Liste A: 22/22 · Liste B: 16/17
  nicht erfuellt B16 serverautoritatives Gameplay
```

Laufzeit rund 3 min, Ruecksprungwert 1 (wegen B16).

**Ehrlichkeitspruefung des Werkzeugs:** `abnahme.mjs` behauptet die drei
Netzpunkte B15/B16/B17 nicht selbst. Es liest sie aus
`gauntlet/zweispieler.json` (Zeilen 1466–1498) und meldet „offen", wenn die
Datei fehlt. Ein einzelner Client kann sie nicht beweisen, und das Werkzeug
tut auch nicht so. Das ist sauber gebaut.

---

## 4. `tools/zweispieler.mjs` — 3 von 4

| Nr | Pruefung | Ergebnis |
|---|---|---|
| 1 | Zwei Spieler gleichzeitig verbunden | **BESTANDEN** |
| 2 | Client 2 sieht die Bewegung von Client 1 | **BESTANDEN** |
| 3 | Fressversuch entscheidet der Server, nicht der Client | **GESCHEITERT** |
| 4 | Charakter ueberlebt den Serverneustart | **BESTANDEN** |

Belegzahlen aus `gauntlet/zweispieler.json`:

* Pruefung 1: beide Sitzungen fuehren beide Spieler (`spielerLautA` =
  `spielerLautB` = `["PruefEins","PruefZwei"]`), Eigen-Ids 7 und 8.
* Pruefung 2: Client 1 legt 8,92 Einheiten zurueck, Client 2 zieht mit,
  Endabweichung **0,01**, Korrekturschritte 0.
* Pruefung 4: vor Neustart Level 2 / 55 XP / 102 HP, auf der Platte dasselbe,
  nach hartem Neustart dasselbe.

### Warum Pruefung 3 scheitert — und warum das kein Produktfehler ist

Die Pruefung stellt in `tools/zweispieler.mjs:167` folgende Lage her:

```js
kreatur: { art: 'wolf', level: 2, hpAnteil: 0.05 },   // Spieler level: 5
```

Nachgerechnet gegen `shared/regeln.js`:

```
Spieler 5 vs Gegner 2 bei HP-Anteil 0.05  ->  100.0 %
Spieler 5 vs Gegner 2 bei HP-Anteil 1.00  ->   48.6 %
```

Bei 100 % kann kein Wurf mehr fehlschlagen. Beide Durchgaenge liefern
`111111`, `folgeGemischt` ist `false`, und das Werkzeug bewertet das —
korrekt — als nicht bewiesen. **Die Pruefung ist durch die Neukalibrierung der
Fresschance wertlos geworden, nicht durch eine Regression der
Serverautoritaet.** Die Lane NETZ und die Lane DOKU melden das beide; die
Messung bestaetigt sie.

Die Kalibrierung selbst ist ueberprueft und trifft das GDD:

| Lage | gemessen | GDD |
|---|---|---|
| Spieler 10 vs Gegner 1 | 100,0 % | §22 „100 %" ✔ |
| Spieler 3 vs Gegner 1 | 40,0 % | §22 „ca. 40 %" ✔ |
| Spieler 1 vs Gegner 7 | 0,0 % | §23 „6–10 darueber → 0 %" ✔ |
| Spieler 1 vs Gegner 11 | 0,0 % | §23 ✔ |
| Spieler 3 vs Gegner 1, HP 100 → 50 → 5 % | 40,0 → 65,0 → 87,5 % | §24 „steigt mit Schwaechung" ✔ |

---

## 5. `tools/fressweg.mjs` — beide erfuellt

```
GDD 01 §29 Punkt 5 — Erfolg: Standort des Gegners wird neuer Standort
  Start (0,0)  Gegner (3.2,0)  Ende (2.432, 0.023)
  Abstand zum Gegnerort   0.768   ERFUELLT  (Grenze 1.09)
  Abstand zur Ausgangsstelle: 2.433

GDD 01 §30 Punkt 5 — Fehlschlag: ungefaehr an der Ausgangsposition
  Start (0,0)  Gegner (3.2,0)  Ende (-0.202, 0.027)
  Abstand zur Ausgangsstelle  0.204   ERFUELLT  (Grenze 1.09)
  in Prozent der Anlaufstrecke: 6 %

BEIDE ERFUELLT
```

Ruecksprungwert 0. Die beiden Ortsangaben sind sauber getrennt: Erfolg landet
bei 76 % der Strecke am Gegner, Fehlschlag bei 6 % der Strecke am Start.

---

## 6. Determinismus — 37 von 37 Bildern bitgleich

Zwei Szenen (`wabbeln`, `rueckschnapp`) je zweimal hintereinander aufgenommen,
`--out detA` und `--out detB`.

**Pruefsummen vor und nach der Messung** ueber alle `client/*.js`,
`client/*.css`, `client/index.html`, `shared/*.js`:

```
=== Dateiaenderung waehrend der Messung: KEINE
```

Die Messung ist damit gueltig. Ergebnis:

```
bitgleich: 37   abweichend: 0
wabbeln kontakt.png:      bitgleich
rueckschnapp kontakt.png: bitgleich
```

20 Bilder `wabbeln` + 17 Bilder `rueckschnapp`, dazu beide Kontaktboegen.
Kein einziges Byte Unterschied.

---

## 7. Was auf den vier Kontaktboegen tatsaechlich zu sehen ist

Beschrieben ist, was im Bild steht — nicht, was dort stehen sollte.

### `wachstum/nachweis/kontakt.png` — 10 Bilder

Fester Kamerastandpunkt, blauer Schleim mittig zwischen drei Felsen. Von
Bild #0 bis #9 wird der Koerper **sichtbar groesser**; nebeneinandergehalten
ist der Unterschied unstrittig. Gemessen aus `messwerte.json`:

| Bild | Level | bbox.h | bbox.w | Volumen |
|---|---|---|---|---|
| #0 | 1 | 1,862 | 2,023 | 0,984 |
| #6 | 14 | 2,336 | 2,871 | 0,994 |
| #9 | 27 | 3,091 | 3,127 | 0,997 |

Linearer Faktor Level 1 → 27: **1,66** (rund +2 % je Stufe). Das Volumen
bleibt ueber alle zehn Bilder zwischen 0,984 und 1,015 — die Verformung ist
volumenerhaltend, das Wachstum kommt tatsaechlich vom Level und nicht von
einer Quetschung.

Mitlaufend im Bild: HP-/Ressourcenleiste links unten, Hotbar unten mittig,
Minimap oben rechts, XP-Leiste unter der Hotbar. Aufsteigende gelbe Meldungen
„Stufe 3 erreicht", „Stufe 5", „Stufe 8", „Stufe 14", „Stufe 22",
„Stufe 27" plus „LEVEL UP".

**Was daran stoert:** die Level-Meldungen stapeln sich und ueberlagern
einander. In #2, #6 und #7 stehen drei bis vier Zeilen ineinandergeschoben,
„LEVEL UP" liegt teilweise ueber „Stufe 14 erreicht". Bei schnellen Aufstiegen
ist der Meldungsstapel unleserlich. Das ist Kosmetik, kein Abnahmefehler —
Punkt A19/A20 sind belegt.

### `umschlingung/nachweis/kontakt.png` — 14 Bilder

Der staerkste Bogen der ganzen Sammlung.

* #0–#1 (300–380 ms, `anlauf`): Schleim links, weisser Wolf rechts im roten
  Zielring, Koerper richtet sich aus.
* #2–#3 (460–540 ms, `umschlingen`): der Koerper **schnellt** los und zieht
  sich extrem in Bewegungsrichtung — `streckung` 2,79 und 2,88, gemessen.
  Im Bild ein langgezogener Keil ueber den halben Boden.
* #4–#9 (620–1020 ms): **der Wolf steht vollstaendig innerhalb der
  durchscheinenden blauen Masse.** Ich habe `frame_007.png` in voller
  Aufloesung nachgesehen: die Wolfssilhouette liegt komplett innerhalb der
  Blob-Kontur, blau eingefaerbt vom Gel, nur die Pfotenspitzen beruehren die
  Bodenkante. Das ist ueber **fuenf aufeinanderfolgende Bilder / rund 320 ms**
  so, nicht in einem Glueckstreffer.
* #10–#11 (`absorbieren`): der Wolf schrumpft in der Masse, zuletzt sind nur
  noch Beine zu ahnen.
* #12–#13 (`prall`, `erholen`): Gegner weg, Koerper rundlich, squash 1,10 →
  1,16.

Damit ist **ARBEITSLISTE Nr. 5 („Beim Umschlingen ist der Gegner zu keinem
Zeitpunkt sichtbar innerhalb der Masse") erledigt.** Die Arbeitsliste ist an
dieser Stelle veraltet.

**Was daran stoert:** der rote Zielring bleibt bis #11 auf dem Boden liegen,
also auch noch, waehrend der Gegner bereits in der Masse verschwindet. Und
das in §28 verlangte „die Masse bewegt sich kurz um ihn herum" findet nicht
statt — der Koerper zieht sich nur zusammen.

### `tod/nachweis/kontakt.png` — 18 Bilder

Vollstaendige Kette, alle fuenf Stufen aus GDD 01 §50 im Bild:

| Bilder | Zeit | was zu sehen ist | squash |
|---|---|---|---|
| #0–#5 | 100–1000 ms | Form verlieren, Zittern, Koerper zieht sich zur Traene hoch | 1,24 → 0,97 |
| #6 | 1100 ms | **Platzen** — dunkelblaue Tropfen fliegen weg | 1,13 |
| #7–#11 | 1180–1600 ms | Tropfen fallen, Koerper sackt zusammen | 0,99 → 0,70 |
| #12–#16 | 1800–3600 ms | **dunkle Pfuetze**, zwei weisse Augen schwimmen darin | 0,65 → 0,61 |
| #17 | 4300 ms | Respawn, Phase `frei`, heiler blauer Schleim | 1,16 |

Die Pfuetze ist deutlich dunkler als der lebende Koerper, die Augen sind
eindeutig darin schwimmend. „Tot" wird unmissverstaendlich vermittelt.
Tiefster squash 0,61 — das Verbot „nie voellig flach" ist gehalten.

**Zur offenen Frage aus dem Spielbericht („7-Meter-Steigflug beim Tod"):** in
dieser Aufnahme gibt es ihn nicht. Der Schwerpunkt erreicht ueber die gesamte
Todesphase hoechstens **1,145** (Bild #2) und liegt ab #8 unter 0,44.
Entweder ist die Beobachtung inzwischen behoben, oder sie tritt nur unter
Bedingungen auf, die dieses Szenario nicht herstellt.

`frame_017.png` in voller Aufloesung: der Schleim steht auf einem blassen
Bodenring, umgeben von **sechs Felsen im Kreis und einer aufrechten dunklen
Steinplatte** dahinter. Das ist mehr als der „flache Bodenring in leerer
Ebene", den ARBEITSLISTE Nr. 8 beschreibt — der Ort hat inzwischen
weltseitige Bauteile. Als „Steinkreis" lesbar, als „Friedhof" nur mit
Wohlwollen. Mechanisch stimmt Punkt A22.

**Was daran stoert:** die Augen wechseln beim Platzen den Stil. Vorher eine
dunkle Augenhoehle mit hellem Mund, danach zwei weisse Kugelaugen. Und
#13–#16 sind ueber 1,5 s praktisch bewegungslos (squash konstant 0,61) — die
Pfuetze steht still statt nachzuzittern.

### `hud/nachweis/kontakt.png` — 6 Bilder

Im Kontaktbogen zu klein zum Lesen; ich habe `frame_001.png` in voller
Aufloesung geprueft. Vorhanden und lesbar:

| Bauteil | Ort | Inhalt |
|---|---|---|
| Minimap | oben rechts | Kreis, „Testarena", farbige Kreaturenpunkte |
| Auftragsanzeige | darunter | „PROTOTYP · Kreaturen fressen 0/3 · Kreaturen besiegen 0/3" |
| Gruppe | oben links | „GRUPPE — allein unterwegs —" |
| Spielerrahmen | links unten | Portraet, Stufenabzeichen „1", „Glibb", HP 70/80 gruen, Ressource 50/60 blau, roter Kampfrand |
| Hotbar | unten mittig | **10 Felder**, Tastenkuerzel 1–0, fuenf belegt mit Symbol und Kosten (12/20/15/5), Feld 5 traegt „E" |
| XP-Leiste | unter der Hotbar | „0 / 85 XP" |
| Zielrahmen | **rechts unten** | „3 Wolf · 79 % · 50/63 · FRESSEN 7 %" mit Portraet |
| Namensschild | ueber dem Wolf | „3 Wolf" mit roter HP-Leiste |
| Schadenszahlen | in der Welt | „−10" rot ueber dem Schleim, „−13" gelb am Gegner, „−12" am Spielerrahmen |

Das deckt GDD 10 §3/§150 (Minimap oben rechts, Tracker darunter, Gruppe
links, HP/Ressource links unten, Hotbar zentriert unten) und §21 (Name, Level,
HP am Ziel). §18 ist eingehalten: E ist Fressen, nicht Interagieren. Die
Fresschance steht als eigene Zeile im Zielrahmen — mehr, als §21 verlangt.

**Was daran stoert:** der Zielrahmen sitzt rechts unten. In der genannten
Messlatte (WoW) steht er oben links neben dem Spielerrahmen; der Blick muss
hier ueber die ganze Bildbreite springen. Nicht spezifiziert, aber gegen die
Messlatte eine Abweichung. Fuenf der zehn Hotbar-Felder sind leer.

---

## 8. `gauntlet/netz/` — die Belegbilder halten, was die Beschriftung sagt

Drei Belegseiten, erzeugt von `tools/netzbild.mjs`, dazu 13 Rohbilder,
`BELEG.md` und `netzbild.json`. Alle drei mit dem Bildbetrachter geprueft.

### `bewegung.png` — **belegt**

2×2-Raster, zwei getrennte Browser. In **beiden** Ansichten sind **beide**
Schleime zu sehen: NetzBlau (Eldoran, blau) und NetzRot (Ravok, rot). Links
die Ausgangslage, rechts nach dem Lauf. Der blaue Schleim steht links im Bild
und danach in beiden Ansichten rechts im Bild. Beschriftungen mit Fuehrungs-
linien sitzen auf den Koerpern. Marke „SERVER" gruen oben links in allen vier
Bildern. Fusszeile je Bild mit Weltkoordinaten: eigen −0,0/0,0 → −11,9/11,9,
fremd 4,1/−4,0 unveraendert.

Behauptet werden 16,8 Einheiten Weg bei beiden Clients, 643 Bildpunkte
Versatz, 0,00 Endabweichung. Das Bild zeigt genau diese Lage. **Das ist der
Beleg fuer B15, den der Kontaktbogen bisher schuldig blieb** (ARBEITSLISTE
Nr. 2).

**Einschraenkung, die im Bild sichtbar ist und die die Beschriftung nicht
nennt:** der jeweils **fremde** Schleim wird als glatte Kugel gezeichnet —
ohne Gesicht, ohne Verformung, ohne Weichkoerper. Nur der eigene Schleim ist
ein voller Koerper. Der Renderer fuehrt weiterhin nur einen Weichkoerper. Fuer
„zwei gleichzeitig verbundene Spieler" reicht das; fuer einen Kontaktbogen mit
zwei vollwertigen Schleimen nicht.

### `fressen.png` — **belegt, und die Luecke ist selbst benannt**

3×2-Raster. Obere Reihe Client 1: Ziel gewaehlt („Wolf · Lv 1 · 12/34 HP") →
waehrend („Phase: fressen / umschlingen", Koerper deutlich in die Laenge
gezogen ueber dem Wolf) → danach („Ziel Nr. 9 in der Welt dieses Clients:
nein", XP springt von 0/1776 auf 49/1776). Das Serverurteil steht im Klartext
unter der rechten Spalte: **„Chance 100.0 %, Wurf 0.357251, Wurf-Nr. 0 —
Erfolg"**.

Untere Reihe Client 2: sieht denselben Wolf vorher und waehrend („ja
(12/34 HP)"), danach ist er weg („nein") — ohne dass Client 2 etwas getan
haette.

Die Seite schreibt selbst unter „Was es nicht belegt", dass der fremde
Schleim beim Zuschauer als ruhender Koerper gezeichnet wird: kein Anlauf, kein
Umschlingen, kein Rueckschnapp. Das ist im Bild nachpruefbar und stimmt — in
allen drei unteren Bildern ist NetzBlau eine unbewegte blaue Kugel. **Eine
Belegseite, die ihre eigene Luecke benennt, ist die Ausnahme; das gehoert
anerkannt.**

### `persistenz.png` — **belegt**

Drei Spalten mit vergroessertem HUD-Ausschnitt, dazu die Charakterdatei.

| | Spalte 1 | Spalte 2 (Gegenprobe) | Spalte 3 |
|---|---|---|---|
| Marke | SERVER (gruen) | **EINZELSPIELER** (bernstein) | SERVER (gruen) |
| Stufenabzeichen | **2** | **1** | **2** |
| HP / Ressource | 102/102 · 70/70 | 80/80 · 60/60 | 102/102 · 70/70 |
| XP-Leiste | **55 / 212 XP** | **0 / 85 XP** | **55 / 212 XP** |
| Serverprozess | 21792 | keine Verbindung | 14460 |

Alle Zahlen sind im vergroesserten Ausschnitt mit blossem Auge lesbar. Die
Charakterdatei `server/daten/NetzDauer.json` steht als vierte Karte im Bild:
`"level": 2, "xp": 55, "hp": 102, "bestiarium": {"wolf": {"besiegt": 1}}`.

Die mittlere Spalte ist der entscheidende Teil: derselbe Client, frisch
geladen, **ohne** Verbindung, zeigt Level 1 und 0 XP. Damit ist
ausgeschlossen, dass die Zahlen aus dem Browser stammen. Das ist sauber
konstruiert. B17 ist belegt.

---

## 9. Serverautoritaet (B16) — eigene Nachmessung

Weil `tools/zweispieler.mjs` Pruefung 3 durch die gesaettigte Ausgangslage
nicht mehr urteilsfaehig ist, habe ich B16 **selbst gemessen** — mit einer
rohen WebSocket-Verbindung ohne Browser, gegen einen frisch gestarteten
`server/server.mjs --test`, Gegner auf **vollem** HP (Chance 48,57 %, also im
gemischten Bereich). Zweimal derselbe Charaktername, dazwischen Serverprozess
hart beendet und Charakterdatei geloescht.

Lauf A schickt den ehrlichen Wunsch. Lauf B haengt an jede Nachricht
`chance: 1, wurf: 0, erfolg: true` an.

```
Lauf A (ehrlicher Client):                      Folge 011100
    chance=48.57% augen=0.967781 nr=0 -> FEHLSCHLAG
    chance=48.57% augen=0.440759 nr=1 -> Erfolg
    chance=48.57% augen=0.126213 nr=2 -> Erfolg
    chance=48.57% augen=0.011340 nr=3 -> Erfolg
    chance=48.57% augen=0.657380 nr=4 -> FEHLSCHLAG
    chance=48.57% augen=0.970559 nr=5 -> FEHLSCHLAG

Lauf B (Client behauptet chance=1, wurf=0, erfolg=true):  Folge 011100
    ... identisch, Zahl fuer Zahl ...

Folgen identisch: true
Folge gemischt:   true
```

**Damit ist B16 sachlich belegt:**

1. Die Folge ist gemischt (3 Erfolg, 3 Fehlschlag) — der Wurf entscheidet
   tatsaechlich, er ist keine Formalie.
2. Die Folge ist Zahl fuer Zahl identisch, obwohl der Client in Lauf B
   Chance, Wurf und Ergebnis mitschickt. Der Server ignoriert alle drei.
3. Der Server rechnet die Chance selbst: 48,57 % statt der behaupteten 100 %.
4. Strukturell bestaetigt: `server/server.mjs:126` liest aus der Nachricht
   `fressen` **ausschliesslich** `m.ziel`. Chance und Wurf entstehen in
   `server/welt.mjs:412–414` aus `wurf(welt.startwert, p.name, nr)` — einer
   reinen Funktion von Startwert, Charaktername und persoenlichem
   Wurfzaehler. Es gibt keinen Pfad, auf dem ein Client sie beeinflussen
   koennte.

Nebenbefund aus dieser Messung: der Wurfstrom haengt am **Charakternamen**.
Zwei Laeufe mit verschiedenen Namen ergeben verschiedene Folgen (mein erster
Versuch: `101110` gegen `001011`). Das ist so gewollt und in
`server/zufall.mjs` begruendet — wer Fressfolgen vergleicht, muss denselben
Namen benutzen, sonst misst er Rauschen.

**Fazit B16: das Gameplay ist serverautoritativ. Nur der Nachweis fehlt.**
Eine Zeile in `tools/zweispieler.mjs:167` — `hpAnteil: 0.05` → `hpAnteil: 1` —
stellt Pruefung 3 wieder her. Ich habe die Datei nicht angefasst.

---

## 10. Wo die ARBEITSLISTE veraltet ist

`gauntlet/ARBEITSLISTE.md` traegt Stand 01:46 und fuehrt 8 blockierende
Eintraege. Nach dem, was ich um 05:30 gemessen habe, sind davon mindestens
**vier erledigt**:

| Nr | Behauptung der Arbeitsliste | gemessener Stand |
|---:|---|---|
| 1 | Client startet clientautoritativ, verbindet nur mit `?server=` | **erledigt** — `client/net.js:808–835` verbindet von selbst; `persistenz.png` zeigt die Marke „SERVER" ohne Parameter, „EINZELSPIELER" ohne Server |
| 2 | Kein Beleg fuer die drei Netzpunkte, nur Werkzeugausgabe | **erledigt** — `gauntlet/netz/{bewegung,fressen,persistenz}.png` sind Bildbelege mit zwei sichtbaren Schleimen |
| 3 | Wachstum nirgends belegt, kein Szenario | **erledigt** — Szenario `wachstum`, 10 Bilder, Level 1 → 27, Faktor 1,66 |
| 5 | Gegner beim Umschlingen nie in der Masse sichtbar | **erledigt** — fuenf aufeinanderfolgende Bilder mit dem Wolf vollstaendig im Gel |
| 7 | Verformungsszenen frontal gefilmt, Schleim steht in 4 von 10 Bildern | **erledigt** — `vollgas` ist jetzt quer gefilmt, Streckung im Bild sichtbar, langsamstes Bild v = 0,5 (kein Stillstand) |
| 4 | Erfolg und Fehlschlag am Koerper nicht unterscheidbar | **teilweise** — Erfolgsgipfel squash **1,26** (Kriterium war ≥ 1,20 ✔), Fehlschlag 1,38 mit eigener Phase `rueckschnapp` und streckung bis 1,84. Die Zahlen erfuellen das Kriterium; ob ein blinder Betrachter den Ausgang benennen kann, habe ich **nicht** geprueft |
| 8 | Friedhof ist nur ein Bodenring in leerer Ebene | **teilweise** — inzwischen Steinkreis aus sechs Felsen plus aufrechte Steinplatte. Als Ort erkennbar, als „Friedhof" nicht zwingend |
| 6 | Gegner steckt waehrend des Auto-Angriffs im Koerper | **nicht geprueft** |

Wer die Arbeitsliste als Stand der Dinge liest, arbeitet an mindestens fuenf
bereits erledigten Punkten.

---

## 11. Was laeuft, was kaputt ist, was fehlt

### Laeuft

* Alle 35 Quelldateien syntaktisch sauber, Determinismusregeln eingehalten.
* 24 Szenarien, 273 Bilder, kein Seitenfehler.
* Determinismus bitgenau: 37/37 Bilder identisch bei wiederholter Aufnahme.
* Liste A vollstaendig: 22/22.
* Liste B: 16 von 17 durch das Werkzeug belegt, der 17. (B16) durch meine
  eigene Messung.
* Fresschance trifft die drei GDD-Ankerwerte auf die Nachkommastelle.
* Beide Ortsangaben aus §29/§30 mit deutlichem Abstand erfuellt.
* Serverautoritaet strukturell und empirisch dicht.
* Zwei Clients an einem Server, beide sehen einander, Charakter ueberlebt den
  harten Neustart.

### Kaputt

* **`tools/zweispieler.mjs:167`** — einziger echter Defekt, den ich gefunden
  habe. Die Pruefaufstellung ist durch die Neukalibrierung wertlos geworden
  und laesst B16 durchfallen, obwohl die Sache haelt. `hpAnteil: 0.05` →
  `hpAnteil: 1`. Nicht von mir geaendert.
* **`gauntlet/ARBEITSLISTE.md`** ist als Arbeitsgrundlage veraltet (§10).
* **`ARCHITEKTUR.md` §1** fuehrt `client/net.js` und `server/*` pauschal als
  „GESPERRT", ohne die Lane NETZ zu nennen; die ARBEITSLISTE schreibt
  „GESPERRT — Lane NETZ". Die beiden Dokumente widersprechen sich.

### Fehlt noch

Fuer **Liste A** fehlt nichts Abnahmerelevantes. Offene Politur:

* Der Level-Meldungsstapel ueberlagert sich bei schnellen Aufstiegen
  (`wachstum` #2, #6, #7) — Lane UI.
* Der Zielring bleibt liegen, waehrend der Gegner in der Masse verschwindet
  (`umschlingung` #10–#11) — Lane UI oder EAT.
* Beim Umschlingen fehlt das in §28 verlangte „die Masse bewegt sich kurz um
  ihn herum"; der Koerper zieht sich nur zusammen — Lane EAT.
* Die Todespfuetze steht ueber 1,5 s vollkommen still (squash konstant 0,61,
  Bilder #13–#16) — Lane DEATH.
* Der Augenstil wechselt beim Platzen von Augenhoehle zu Kugelaugen — Lane
  DEATH.
* Wachstum je Stufe rund +2 % Radius; zwischen Nachbarstufen kaum sichtbar.
  Zwischen Level 1 und 27 dagegen eindeutig — Kernfrage, nicht Lane.

Fuer **Liste B** fehlt genau eines, und es ist Beleg, nicht Funktion:

* **B16.** Behoben mit der einen Zeile in `tools/zweispieler.mjs`. Danach
  meldet `abnahme.mjs` 17/17 — die Ausgangslage `hpAnteil: 1` liefert
  Chance 48,57 % und, wie oben gemessen, eine gemischte Folge.
* **Kein voller zweiter Weichkoerper.** Der fremde Schleim ist in beiden
  Clients eine glatte Kugel ohne Gesicht und ohne Verformung
  (`bewegung.png`, `fressen.png`). B15 ist damit belegt, aber der Bogen
  „zwei vollwertige Schleime im Kontakt" existiert nicht. Das haengt an
  `client/renderer.js` und ist waehrend des Gauntlets gesperrt.
* **Fressanimation beim Zuschauer.** `server/welt.mjs zustand()` schickt zu
  einem fremden Spieler keine Phase mit, und `client/net.js fressErgebnis(e)`
  steigt bei fremdem Spieler aus. Ein Zuschauer sieht den Gegner
  verschwinden, aber keine Umschlingung. In `gauntlet/netz/BELEG.md` selbst
  vermerkt.

### Nicht geprueft

ARBEITSLISTE Nr. 6 (Gegner steckt waehrend des Auto-Angriffs im Koerper),
die Kontaktboegen ausser den fuenf genannten, das Blindurteil zu
Erfolg/Fehlschlag am Koerper, und die 30 nicht-blockierenden Eintraege der
Arbeitsliste.
