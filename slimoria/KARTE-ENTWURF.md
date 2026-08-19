# KARTE — Entwurf der Arena-Ausstattung

Lane KARTE-0. Begleitpapier zu `client/grafik/karte.js`.
Zielbild: Genshin Impact, Material unter `ref/genshin/`.

**Die Vorgabe, an der sich alles bricht:** Die Arena behält ihre GEOMETRIE.
Dieselbe Ebene, dieselben Felsen, dieselbe enge Passage bei z ≈ 14, dasselbe
Plateau, derselbe Friedhof bei (−18,−18). Kein Hindernis kommt dazu, keines
fällt weg, keines wandert. Es ändert sich, wie die Arena AUSSIEHT, nicht was
sie IST. Ausstattung ist deshalb **Dekoration**: sie steht neben den
Hindernissen, nie in ihnen, und sie nimmt an der Kollision nicht teil.
`client/world.js` ist unberührt geblieben.

---

## Teil A — Der Entwurf

### 1. Was heute wirklich da ist

Aufgenommen mit `node tools/capture.mjs g-fernsicht g-bodenlicht hud --out
karte-vorher`, Kontaktbögen und Einzelbilder angesehen. Schonungslos:

**Es ist kein Ort. Es ist ein Prüfstand.**

* **Der Boden ist Millimeterpapier.** Ein Schachbrettraster über die volle
  Bodenebene, in einem einzigen graugrünen Ton, ohne eine einzige Stelle, an
  der etwas anderes passiert als an jeder anderen. In `g-bodenlicht` sind rund
  75 % des Bildes dieses Raster. Es liefert Tempo (GDD 12 §4) und sonst nichts.
* **Der Horizont ist eine Kante ins Nichts.** Die Bodenebene läuft in einen
  farblosen Dunststreifen, darüber steht ein grauer Verlauf. In `g-fernsicht`
  ist das obere Drittel des Bildes vollständig leer — kein Berg, kein Baum,
  keine Silhouette, nichts, worauf das Auge landen könnte. Der Blick fällt aus
  dem Bild heraus.
* **Es gibt keinen Maßstab.** Sechs graue Kuppeln in drei Größen, drei graue
  Quader. Da nichts Bekanntes im Bild steht, ist nicht ablesbar, ob der
  Schleim einen halben Meter oder fünf Meter groß ist.
* **Der Friedhof ist kein Friedhof.** In `g-fernsicht` steht er genau in der
  Bildmitte, in rund 45 Einheiten Entfernung — und er ist von den übrigen
  Felsen nicht zu unterscheiden. Sechs Kuppeln im Kreis und ein aufrechter
  Quader. Wer nicht weiß, dass das ein Ort sein soll, sieht ihn nicht.
* **Die enge Passage liest sich als Wand.** Zwei lange Riegel mit einer 1,8
  Einheiten schmalen Lücke. Aus der Ferne verschmelzen sie zu einem Strich; die
  Lücke ist ein dunkler Punkt darin. Nichts sagt "hier geht es durch".
* **Das Plateau liest sich als Klotz.** Ein 7×7-Quader ohne Fuß, ohne Kante,
  ohne Andeutung, dass man oben stehen kann.
* **Der Schleim ist die einzige Farbe im Bild.** Das ist der einzige Punkt, an
  dem der Ist-Zustand richtig liegt, und er ist die eigentliche Latte: alles,
  was dazukommt, darf ihn nicht einholen.

Kurz: Es fehlt nicht Detail. Es fehlen **Orte, Maßstab und Ferne**.

### 2. Was in `ref/genshin/` tatsächlich zu sehen ist

Angesehen: `landschaft_mondstadt_mittag_fernnebel_4k`,
`landschaft_sumeru_wiese_see_tag_2560`, `landschaft_wiese_mittag_figur_2560`,
`goldene_stunde_grasland_2560`, `landschaft_sumeru_dorf_tag_2560`,
`landschaft_liyue_luftperspektive_4k`, `landschaft_dragonspine_schnee_tiefstand_4k`,
`goldene_stunde_sumeru_dorf_2560`, `morgen_lichtschaechte_login_4k`,
`gras_halme_nahaufnahme_tag_1366`, `nacht_liyue_laternen_1600x900`.

Elf Bilder, sieben Befunde:

**B1 — Es ist erstaunlich viel leer.** In `sumeru_wiese_see` ist das untere
Drittel eine einzige Wiese: eine Farbe, ein paar gelbe Blüten, sonst nichts.
In `wiese_mittag_figur` ist der gesamte Vordergrund eine ununterbrochene
Grasfläche. Eine ruhige Fläche ist bei Genshin nicht der Rest, den man noch
nicht gefüllt hat — sie ist ein Bauteil, und sie ist meistens das größte.

**B2 — Ein Blickfang trägt das Bild, alles andere staffelt sich darunter.**
Mondstadt: der Gipfel links, die Burg rechts, dazwischen sechs flache Lagen.
Dragonspine: eine Spitze, davor Nadelbäume abnehmender Größe.
`sumeru_wiese_see`: EIN Baum, außermittig, gegen die Felswand gesetzt. Nie zwei
gleich starke Blickfänge im selben Bild.

**B3 — Der Horizont schließt in Lagen, und jede Lage ist flacher und blasser
als die davor.** `liyue_luftperspektive` ist der Extremfall: fünf bis sechs
Tiefenschichten, die letzte ist fast reine Dunstfarbe. Gemeinsam ist allen:
die Silhouette wird nach hinten **einfacher**, nicht kleiner-aber-gleich-detailliert.

**B4 — Detail sitzt an Kanten und Übergängen, nie in der Fläche.** Grasbüschel,
Sträucher und Steine stehen am Fuß von Felsen, an Klippenkanten, an der
Wasserlinie, an Wegrändern. In `sumeru_wiese_see` sammelt sich das gesamte
Kleinzeug am Baumfuß und am Ufer; zwei Meter weiter ist nichts.

**B5 — Der Boden hat fast kein Detail.** Auch aus nächster Nähe
(`gras_halme_nahaufnahme_tag`) ist der Untergrund unter den Halmen eine
gleichmäßige Fläche. Die Struktur kommt von den Halmen, nicht vom Boden — und
die Halme stehen in **Horsten mit kahlen Zwischenräumen**, nicht gleichmäßig
gepudert.

**B6 — Wege führen den Blick, und sie sind meistens Aussparungen.** Der Sandweg
in Mondstadt ist eine Bahn ohne Bewuchs. Der Steinplatz in `sumeru_dorf_tag`
ist eine große helle Fläche; Laub liegt nur an den Rändern. Der Weg entsteht
dadurch, dass dort nichts steht.

**B7 — Senkrechtes markiert Orte.** Laternenpfähle, Säulen, Schirme, Stelen.
`nacht_liyue_laternen`: eine Reihe Lichter macht aus einer Uferlinie einen Ort.
`morgen_lichtschaechte_login`: nichts als Säulen und Wolken, und man weiß
sofort, wo der Weg entlanggeht.

### 3. Der Entwurf für unsere 52 × 52

#### 3.1 Wo ruhig, wo dicht — der Rhythmus

Sieben Zonen. Die Zahlen sind Radien um den Ursprung, wenn nicht anders gesagt.

| Zone | Lage | Was steht dort | Warum |
|---|---|---|---|
| **Ruhefeld** | r < 9 | nur Blütenflecken (≤ 0,15 hoch) und die Füße der drei Felsen, die dort ohnehin schon stehen | Hier läuft **jede** Bewegungsaufnahme des Gauntlets, hier steht der Schleim in jedem Standardbild. B1. |
| **Übergangsgürtel** | r 9 … 24 | Grasbüschel und Blüten, ab r 13 auch Büsche — Dichte steigt nach außen, moduliert durch ein Fleckenfeld | Der Blick soll nach außen "voller" werden, damit die Mitte als Lichtung liest. |
| **Saum** | r 24 … 26 | dünn, Übergang | Puffer: der Schleim kommt bis 25,4. |
| **Waldsaum** | Tschebyschew 26,2 … 42 | Bäume, Nadelbäume, hohes Unterholz | Der Rahmen. Außerhalb der Arena, deshalb ohne jede Rücksicht auf Lesbarkeit hoch. |
| **Fernsilhouette** | r 44 … 88 | drei Ringe Fernberge plus ein Hauptgipfel | B2, B3. |
| **Friedhof** | (−18,−18), r 4,2 | siehe 3.3 | eigener Ort, eigene Sprache. |
| **Passage** | z ≈ 14 | siehe 3.4 | Durchgang. |

Die Dichte ist **nirgends konstant**. Drei Mittel:

1. **Radiale Rampe.** Büschel 0,14 bei r 9 → 0,89 bei r 23.
2. **Fleckenfeld** (`horst()` in `karte.js`): bilinear geglättetes Ortsrauschen,
   Wellenlänge 6,5 / 8,5 / 11 / 13 Einheiten — je Typ eine andere, damit die
   Typen nicht alle im selben Fleck klumpen. Rund ein Fünftel der Fläche bleibt
   dadurch **ganz kahl**. Das ist B5: Horste statt Puder.
3. **Himmelsrichtung** für den Waldsaum: drei Haine, drei Lichtungen (3.2).

Der Unterschied ist im Draufsicht-Plan sofort zu sehen: ohne Fleckenfeld ein
gleichmäßiger Sprenkel, mit ihm kahle Taschen und dichte Nester.

#### 3.2 Der Blickfang in der Ferne

**Vier Tiefenlagen plus ein Hauptgipfel.** Die Winkelhöhen sind für die
Fernsichtkamera gerechnet (Auge ≈ 3,5 hoch bei dist 24, pitch 0,12,
fovY 50° → Bildoberkante bei +18,1°):

| Lage | Radius | Höhe | erscheint bei |
|---|---|---|---|
| Ring A — Hügel | 44 … 54 | 3 … 6 | ≈ 1,7° |
| Ring B — Tafelberge | 60 … 72 | 6 … 10 | ≈ 4,1° |
| Ring C — Massiv | 76 … 88 | 11 … 17 | ≈ 6,7° |
| **Hauptgipfel** | (−52,−57) | 22 | ≈ 10,4° |

Sie staffeln sich also sauber übereinander statt sich zu decken — B3. Bei
`beta0 = 0,052/m` aus dem Grafikplan liegt Ring C bei rund 95 % Nebelanteil:
eine blasse Silhouette, die kaum vom Himmel abhebt. Genau das zeigt
`liyue_luftperspektive`.

**Der Hauptgipfel steht im Südwesten — und zwar nicht beliebig.** Das Szenario
`g-fernsicht` blickt vom Kameraauge (14,8 / 18,6) auf den Ursprung, also nach
Südwesten. Auf derselben Achse liegen, von vorn nach hinten: **die Arena → der
Friedhof (−18,−18) → die Lichtung im Waldsaum → der Hauptgipfel.** Ort,
Öffnung und Ferne stehen in einer Flucht. Das ist die Mondstadt-Anordnung.
Zwei Einzelbäume und zwei Nadelbäume fassen diese Lichtung an den Schultern —
die Öffnung bekommt eine Kante, wie der Solitärbaum in `sumeru_wiese_see`.

Zwei weitere Lichtungen: eine nach Norden (hinter der Passage, damit der
Durchgang in Tiefe führt statt gegen eine Wand) und eine schmale nach Osten
(für die zweite Messkamera `g-bodenlicht`). Drei Öffnungen, drei Haine.

#### 3.3 Wie der Friedhof ein Ort wird, ohne zugestellt zu werden

Nicht durch Füllung — durch **Kontrast**. Fünf Mittel, keines davon fügt der
Senke Masse hinzu:

1. **Die Senke bleibt kahl.** Innerhalb von 6,2 Einheiten kein einziges
   Grasbüschel, kein Busch. Eine leere Fläche inmitten von Bewuchs liest sich
   als getreten, benutzt, betreten.
2. **Ein dichter Grasgürtel von 6,2 bis 9,6** (Dichte 0,80 — die höchste im
   ganzen Entwurf). Der Rand des Orts entsteht damit von außen, nicht von innen.
3. **Drei Laternen auf dem Kranz**, gesetzt in die Lücken zwischen den
   Findlingen aus `world.js`, und ausschließlich auf der Südwesthälfte. Die
   Nordostseite bleibt offen — dort liegt der Respawnpunkt (−17,2 / −16,4).
   **Ein Ring aus Licht mit einer Tür.** B7, `nacht_liyue_laternen`.
4. **Fünf Grabmale** als lockerer Bogen, alle ≤ 0,85 hoch, alle auf der
   Südwesthälfte und zur Ankunftsseite gedreht. Wer aufwacht, sieht sie und das
   aufrechte Mal aus `world.js` **vor** sich, nie im Rücken.
5. **Die Lichtung dahinter und der Hauptgipfel darüber** (3.2). Der Friedhof
   liegt im Mund der Öffnung.

Der Respawnkreis (r 2,4) und die kahle Innenfläche werden von jeder Streuung
ausgenommen. Man wacht auf freier Fläche auf und sieht, wo man ist —
Abnahmepunkt 22, GDD 01 §51.

#### 3.4 Wie die enge Passage ein Durchgang wird

Die Lücke ist 1,8 Einheiten breit bei |x| < 0,9, z ≈ 14. Drei Mittel, keines
davon neue Geometrie:

1. **Eine Gasse aus Leere.** 5,6 breit, von z 7,5 bis z 20,5, absolut frei von
   jeder Streuung. Ein getretener Weg entsteht durch Aussparung — B6. Kostet
   null Zeichenaufrufe.
2. **Vier Laternen**, je zwei an jeder Mündung bei x = ±1,62 und z = 12,45 /
   15,55. Sie sind 2,0 hoch, also höher als die 1,6 hohe Mauer, und stehen
   nachweislich **neben** beiden Mauern (mit `istFrei()` geprüft). Aus der
   Ferne stehen zwei Lichter nebeneinander, und das liest sich als Tor.
3. **Bewuchs dicht an die Mauerflanken.** Grasbüschel mit Dichte 0,75 und
   Büsche mit 0,35 wachsen bis auf 0,15 an beide Mauern heran, aber erst ab
   x = 2,8 (die Gasse verbietet es näher). Die Mauer wird zur bewachsenen
   Barriere, die Lücke zum einzigen sauberen Durchlass.

**In der Lücke selbst liegt nichts.** Ausdrücklich auch kein Geröll an den
Mauerköpfen, obwohl es dort gut aussähe: alles, was dort noch frei läge, läge
genau dort, wo der Schleim sich durchquetscht (GDD 01 §17) und wo der Gauntlet
diese Bewegung aufnimmt.

#### 3.5 Damit der Schleim IMMER lesbar bleibt

Er ist die Figur (GDD 10 §69, §98; GDD 02 §64). Die Regel ist eine einzige und
sie ist prüfbar:

> **Innerhalb der Arena (|x|,|z| < 26) steht nichts höher als 2,0 Einheiten.
> Alles mit Krone — Bäume, Nadelbäume, Fernberge — steht außerhalb von
> |x|,|z| = 26,2 und kann den Schleim damit nie verdecken.**

Der Schleim kommt höchstens bis 25,4 (bounds minus Radius). Ein Stück, das erst
bei 26,2 beginnt, steht nie zwischen Kamera und Schleim.

Die Höhenstaffel innerhalb der Arena, gegen den Schleim gehalten (Radius 0,6 auf
Level 1, also rund 1,2 hoch):

| Typ | Höhe innen | Höhe außen | wo |
|---|---|---|---|
| Blume | ≤ 0,15 | — | überall, auch im Ruhefeld |
| Stein | ≤ 0,40 | — | Felsfüße, Plateaufuß, sparsam im Feld |
| Farn | 0,40 … 0,70 | — | nur an Hindernisfüßen |
| Büschel | 0,35 … 0,70 | 0,6 … 1,1 | ab r 9 |
| Busch | 0,50 … **0,85** | 0,9 … 1,6 | ab r 13 |
| Grabmal | ≤ 0,85 | — | Friedhof |
| Laterne | 2,0 (dünn) | — | Passage, Friedhof, Plateaukante |
| Baum / Nadelbaum | **verboten** | 4,0 … 9,0 | nur außerhalb |

Der höchste flächige Bewuchs innerhalb der Arena ist damit **0,85 — niedriger
als der Schleim**. Deshalb bleibt seine Oberseite in jeder Kameralage frei.
Laternen sind die einzige Ausnahme und dünn genug, dass sie höchstens einen
Streifen verdecken; sie stehen an drei Stellen, an denen ein senkrechter
Akzent seine Aufgabe hat.

Dazu vier Freihaltezonen, die für **jede** Streuung gelten:

* **Startkreis** r 4,2 um (0,0) — die Reset-Position jeder Aufnahme. Leer.
* **Respawnkreis** r 2,4 um (−17,2 / −16,4). Leer.
* **Passagegasse** (3.4). Leer bis auf die vier gesetzten Laternen.
* **Kreaturen-Ruhepunkte**: Büschel halten 2,8 Abstand, Büsche 3,6, die Farne
  an Felsfüßen 2,2. Eine Kreatur, die hinter einem Busch erscheint, kostet
  Abnahmepunkt 9 ("Kreatur finden") und §16 ("Erfolg/Fehlschlag eindeutig
  erkennen").

Und die Plateauoberkante trägt **nur Blütenflecken**: von dort springt der
Schleim herunter (GDD 01 §20), Absprungkante und Landefläche bleiben frei. Der
Fuß des Plateaus bekommt dagegen an allen vier Flanken einen Schuttsaum aus
Stein und Farn — dieselbe Aufgabe wie das Kontaktband aus Schritt G6, nur in
Geometrie statt in Schattierung (B4).

#### 3.6 Eine gestrichene Idee, damit sie nicht zweimal erfunden wird

Geplant war eine zweite Gasse von der Arenamitte zum Friedhof, als
Blickführung. **Gestrichen:** das Plateau liegt genau auf der Diagonale
(0,0) → (−18,−18). Die Gasse hätte entweder das Hindernis geschnitten oder den
Schuttsaum an dessen Südflanke ausgeräumt. Der Friedhof wird ohne sie gefunden
— über die kahle Senke, den Grasgürtel, den Laternenkranz, die Lichtung und
den Hauptgipfel. Vier Mittel genügen; ein fünftes, das gegen ein anderes
Bauteil arbeitet, ist schlechter als keines.

### 4. Was tatsächlich gesetzt wird

`KARTE.zahlen()`, gemessen im Browser unter `?renderer=2`:

```
fernberg  43   baum  58   nadelbaum  20   busch  128   bueschel 749
blume    150   farn  83   stein     206   stele    5   laterne    8
                                                    Summe  1450
```

Geprüft und bestanden:

| Prüfung | Ergebnis |
|---|---|
| Stücke in einem Hindernis (`istFrei` mit Radius 0) | **0** |
| Stücke > 2,0 hoch innerhalb der Arena | **0** |
| Bäume/Nadelbäume/Fernberge innerhalb der Arena | **0** |
| Stücke im Startkreis r 4,2 | **0** |
| Stücke im Respawnkreis r 2,4 | **0** |
| Stücke in der Passagegasse | **4** (die gesetzten Torlaternen) |
| Zwei Läufe bitgleich | **ja**, 350 817 Byte identisch |
| Aufbaudauer | **65–85 ms** einmalig beim Laden |
| `?renderer=2` mit Modul angemeldet, Seitenfehler | **keine** |
| `client/world.js` verändert | **nein** |

---

## Teil B — Das Register

Vollständige Beschreibung für die Typ-Agenten in `client/grafik/karte.js`
selbst. Kurzfassung:

### Anmeldung

```js
KARTE.typ('baum', {
  schicht: 0,                              // klein = früher gezeichnet
  aufbau(gl, R) { … },                     // einmalig: Programm, Netz, Instanzpuffer
  vorbereiten(gl, R, ctx, stuecke) { … },  // optional, je Bild
  zeichnen(gl, R, ctx, stuecke) { … },     // je Bild, ALLE Stücke auf einmal
});
```

`zeichnen` bekommt **alle** Stücke des Typs in einem Aufruf — genau damit ein
Typ instanziert zeichnen kann. Bei 749 Grasbüscheln ist das keine Kür.

Ein Typ, der nicht angemeldet ist, wird übersprungen; seine Stücke liegen
bereit und werden gezeichnet, sobald es ihn gibt. Ein Typ, der in `aufbau`,
`vorbereiten` oder `zeichnen` wirft, wird stillgelegt (`console.warn`, **nicht**
`console.error` — ein kaputter Requisitentyp darf keine Aufnahme rot färben),
und der Rest des Bildes läuft weiter. Beides ist im Browser nachgewiesen.

### Was ein Stück mitbringt

```js
{ typ, x, y, z, drehung, groesse, zufall: [z0,z1,z2,z3], variante: 0..255, frei, …extras }
```

`y` kommt aus `bodenHoehe(x,z)` — Stücke auf der Plateauoberkante stehen
dadurch von selbst richtig. `zufall` und `variante` sind aus der Weltposition
gehasht: **ein Typ braucht und darf keine eigene Zufallsquelle** (kein
`Math.random`, kein `Date`). Wer Variation will, nimmt `zufall[k]`.

`extras` sind typspezifische Felder aus dem Entwurf, z. B.
`rolle: 'gipfel' | 'schulter' | 'huegel' | 'tafelberg' | 'massiv'` bei
`fernberg`, `rolle: 'solitaer' | 'pfosten'` bei Baum und Nadelbaum,
`rolle: 'tor' | 'friedhof' | 'kante'` bei `laterne`, `rolle: 'grab'` und
`neigung` bei `stele`.

### Die zwölf Typnamen

| Name | Höhe (`groesse`) | Anzahl | Bemerkung |
|---|---|---|---|
| `fernberg` | 3 … 22 | 43 | reine Silhouette, immer stark benebelt, keine Kleinform nötig |
| `baum` | 4,0 … 7,4 | 58 | nur außerhalb der Arena |
| `nadelbaum` | 5,0 … 9,0 | 20 | nur außerhalb; schmale Krone |
| `busch` | 0,5 … 1,6 | 128 | innen ≤ 0,85 |
| `bueschel` | 0,35 … 1,1 | 749 | höher als der Grasteppich aus `grafik/gras.js`, ergänzt ihn |
| `blume` | ≤ 0,15 | 150 | Farbtupfer, `groesse` ist hier ein Faktor um 1,0 |
| `farn` | 0,4 … 0,7 | 83 | Breitblatt, nur an Hindernisfüßen |
| `stein` | ≤ 0,4 | 206 | Geröll und Lesesteine |
| `stele` | ≤ 0,85 | 5 | Grabmal, `neigung` beachten |
| `laterne` | 1,9 … 2,0 | 8 | dünner Pfahl mit Licht |
| `pfad` | — | 0 | frei, falls ein elfter Agent eine Wegdecke will |
| `torpfosten` | — | 0 | frei, falls jemand das Tor kräftiger will als vier Laternen |

`bueschel` ist ausdrücklich **nicht** der Grasteppich. Der gehört zu
`grafik/gras.js` (Lane GRAFIK, instanzierte Halme mit Windwelle). `bueschel`
sind die höheren Horste darüber.

### Was das Modul selbst tut und nicht tut

Es meldet sich als `{ name: 'karte', ordnung: 40, ersetzt: false }` an.

`ersetzt: false` ist **nicht optional**: `renderer2.js` führt eine Tabelle
`ERSATZ_NAME`, in der `karte` auf den Grundzug `hindernisse` zeigt. Ohne die
Zeile verschwinden mit dem ersten `?renderer=2` sämtliche Felsen, beide
Passagemauern, das Plateau und der Findlingskranz aus dem Bild — und genau die
Geometrie, die unangetastet bleiben soll, wäre optisch leer. Diese Datei
zeichnet kein einziges Hindernis; wer den Hindernis-Durchgang wirklich
übernimmt, tut das in einem eigenen Modul mit eigenem Namen.

---

## BRAUCHT_FREMDAENDERUNG

`client/grafik/laden.js` — die Dateien `grafik/props/*.js` werden dort nicht
geladen. Sie müssen **nach** `grafik/karte.js` und **vor** `grafik/renderer2.js`
in die Liste, sonst kann sich kein Requisitentyp anmelden. `karte.js` lädt sie
bewusst nicht selbst: jede noch fehlende Datei ergäbe eine 404-Zeile, die
`tools/capture.mjs` als Seitenfehler protokolliert, und die Datei gehört
ohnehin nicht dieser Lane.
