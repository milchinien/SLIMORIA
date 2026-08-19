# Das Zielbild — gemalter Anime-Hintergrund

**Diese Datei ersetzt Genshin Impact als Messlatte für die Welt.**

Der Auftraggeber hat sechs Referenzbilder vorgelegt. Sie zeigen nicht ein
3D-Spiel, sondern **gemalte Anime-Hintergründe** — die Bildsprache von Ghibli,
Makoto Shinkai und Kyoto Animation. Das ist ein anderer Look als Genshin, und
der Unterschied ist nicht klein.

Die Bilder selbst liegen nicht im Repo (sie kamen aus dem Gespräch). Was hier
steht, ist die Beschreibung dessen, was auf ihnen zu sehen ist, so genau wie
möglich. Vergleichbares Material zum Danebenlegen gehört nach `ref/anime/`.

---

## 1. Was Genshin und gemalter Anime-Hintergrund unterscheidet

| | Genshin Impact | Gemalter Anime-Hintergrund |
|---|---|---|
| Herkunft | 3D-Echtzeit mit Cel-Shading | Malerei, oft Gouache oder digital gemalt |
| Kanten | hart, geometrisch, Kontur | weich, malerisch, Pinselgrenze |
| Flächen | flach mit Rampenstufe | flach, aber mit Pinselstruktur |
| Himmel | Verlauf, wenig Wolken | **große Kumuluswolken, bildbeherrschend** |
| Sättigung | mittel | **hoch, besonders im Grün** |
| Helligkeit | ausgewogen | **hell durchgehend, kaum dunkle Ecken** |
| Gelände | modelliert | **weiche Hügel, Bänder aus Licht und Schatten** |
| Detail | Objektdetail | **Farbmasse statt Objekt** |

Kurzfassung: **weniger Technik, mehr Malerei.** Wo Genshin eine harte
Cel-Kante setzt, setzt ein Anime-Hintergrund eine weiche Farbgrenze.

---

## 2. Die sechs Vorlagen, einzeln

**A — Malerisches Tal.** Sichtbare Pinselstriche, fast Spachtel. Flache
Grünmassen in mehreren Werten nebeneinander, keine Verläufe innerhalb einer
Masse. Schneebedeckte Berge in Blaugrau. Nadelbäume als einfache dunkle
Dreiecksmassen. Ein heller Weg, der sich durch die Wiese zieht. Wenig Detail,
alles ist Farbfläche.

**B — Blauer Himmel über Wiese.** Große weiße Kumuluswolken mit blaugrauen
Unterseiten, sie nehmen rund **55 % der Bildhöhe** ein. Himmel oben satt blau,
zum Horizont hin deutlich heller. Wiese in kräftigem Gelbgrün mit einem
helleren Band dort, wo das Licht auftrifft. Ferne Hügel blaugrün. Weiche
diagonale Lichtschäfte. Im Vordergrund einzelne Grashalme als feine
Silhouetten.

**C — Wiese im warmen Licht.** Abendlicht. Dichtes Gras, im Vordergrund
einzelne Halme erkennbar, in der Ferne eine geschlossene Masse. Bäume als
weiche, bauschige Kronen auf einer Anhöhe. Rote und orange Blütenpunkte.
Darüber ein dunkleres blauviolettes Himmelsstück mit warm angeleuchteten
Wolkenrändern. Starker Wertunterschied zwischen beleuchteten und
beschatteten Grasbändern.

**D — Ghibli-Wiese mit Wasser.** Die gesättigtste Vorlage. Schneeberg mit
blaugrauem Fels, weiße Wolken schmiegen sich daran. Wasser in tiefem
Blaugrün, Oberfläche fast völlig flach. Grasinseln in leuchtendem Gelbgrün.
Blüten als **dichte Sprenkel in Rosa, Weiß und Gelb**. Alles flach, kaum
Verlauf innerhalb einer Fläche, die Übergänge zwischen Farbflächen sind
ziemlich hart.

**E — Blaugrüner Anime mit großem Baum.** Die ganze Palette ins Blaue
gezogen, sogar das Gras ist blaugrün. Ein großer Baum mit geschichteter
Krone, Lichtschäfte fallen hindurch. Weiße Funkelpunkte in der Luft. Ferne
Hügel und ein Dorf. Schlieren-Zirren am Himmel. Vordergrundgras als
Silhouette.

**F — Einfacher Hügel.** Die reduzierteste Vorlage und deshalb die
lehrreichste: tiefblauer Himmel, große weiße Kumuluswolken, ein grüner
Hügel. Sonst **nichts**. Es braucht nicht viel — es braucht das Richtige.

---

## 3. Was daraus für uns folgt, nach Wirkung geordnet

### 3.1 Wolken — die größte Lücke

In vier von sechs Vorlagen sind Kumuluswolken das beherrschende Element.
Unser Himmel hat **gar keine**. Das ist der einzelne größte Unterschied
zwischen unserem Bild und den Vorlagen.

Gebraucht: große, weiche, bauschige Massen. Oben weiß bis cremeweiß, unten
blaugrau abgesetzt. Weiche Ränder, keine harte Kontur. Wenige große Wolken,
nicht viele kleine. Deterministisch, langsam wandernd.

### 3.2 Farbe — unser Bild ist zu blass

Geschätzte Werte aus den Vorlagen (als Schätzung gekennzeichnet, jeder Agent
misst an `ref/anime/` selbst nach):

| Fläche | Vorlage, geschätzt | Unser Stand |
|---|---|---|
| Himmel Zenit | kräftiges Blau um `#1E7FD0` | zu blass |
| Himmel Horizont | helles Blauweiß um `#BFE0F5` | ungefähr passend |
| Wolke oben | `#FFFFFF` bis `#F5F8FF` | fehlt |
| Wolke unten | `#B8C8DC` | fehlt |
| Wiese im Licht | sattes Gelbgrün um `#7FC13C` | deutlich zu blass und zu grau |
| Wiese im Schatten | `#4A8A3A` | zu wenig Unterschied |
| Ferne Hügel | Blaugrün um `#7FA8B0` | vorhanden |
| Blüten | Rosa `#F0A0C0`, Gelb `#F5D84A`, Weiß | zu spärlich |

Unser Boden ist **deutlich zu entsättigt und zu hell-grau**. Die Vorlagen sind
sattes Gelbgrün.

### 3.3 Lichtbänder statt gleichmäßiger Fläche

In allen sechs Vorlagen läuft die Wiese in **Bändern** aus Licht und Schatten
— dort eine hellere Zone, hier eine dunklere. Das gibt der Fläche Form, ohne
dass die Geometrie sich ändert. Unsere Wiese ist gleichmäßig durchgefärbt und
wirkt deshalb wie ein Teppich.

### 3.4 Lichtschäfte

Drei der sechs Vorlagen haben weiche diagonale Lichtschäfte. Sparsam und weich
— sie sind Stimmung, kein Effekt.

### 3.5 Bäume als weiche Massen

In den Vorlagen sind Kronen bauschige, geschichtete Massen mit weichem Rand.
Unsere sind geometrische Lutscher mit harter Kontur. Das ist genau der
Genshin-Griff, der hier **falsch** ist.

### 3.6 Blüten als dichte Sprenkel

Vorlage D lebt von dichten Blütensprenkeln in Rosa, Weiß und Gelb. Bei uns
sind es vereinzelte gelbe Punkte. Blüten in **Gruppen**, nicht verstreut.

### 3.7 Hügel — mit einer harten Einschränkung

Die Vorlagen zeigen sanft rollendes Gelände. Wir dürfen die **Geometrie der
Arena nicht ändern**: dieselbe Ebene, dieselben Hindernisse, dieselbe enge
Passage, derselbe Friedhof. Sonst sind alle Bewegungsaufnahmen des Gauntlets
unvergleichbar und die bisherige Arbeit ist wertlos.

Auflösung: Hügel **außerhalb** der Weltgrenze von 26 Einheiten, also
unerreichbar, aber sichtbar. Innerhalb bleibt der Boden flach — und bekommt
seine Form über Licht- und Schattenbänder (§3.3) statt über Geometrie.

---

## 4. Die Probe

Ein Bildschirmabzug unseres Spiels muss neben einem gemalten Anime-Hintergrund
als **dieselbe Art Bild** durchgehen. Nicht gleich gut — sondern von derselben
Sorte.

Der Test, der nicht lügt: **zusammenkneifen der Augen.** Bleiben große,
klar getrennte Farbmassen übrig — Himmel, Wolke, ferne Hügel, Wiese im Licht,
Wiese im Schatten —, stimmt es. Löst sich alles in ein gleichmäßiges Rauschen
aus Halmen und Steinchen auf, ist es falsch, egal wie sauber die Technik ist.

---

## 5. Was unverändert gilt

* **Der Schleim ist die Figur** (GDD 10 §69). Diese Welt wird heller und
  bunter — der Schleim muss sich darin **trotzdem sofort finden lassen**. Ein
  blauer Blob vor blaugrünem Gras unter blauem Himmel ist eine echte Gefahr.
  Wer an der Welt baut, prüft das jedes Mal mit.
* Die Geometrie der Arena bleibt (§3.7).
* Determinismus bleibt: kein `Math.random`, kein `Date`, Zeit nur über
  `ctx.time`. Wolken, die zufällig ziehen, machen jede Aufnahme
  unvergleichbar.
* Lesbarkeit schlägt Effektdichte — GDD 10 §98, GDD 02 §64.
* Der alte Renderpfad bleibt unangetastet; alles Neue liegt in
  `client/grafik/` und ist nur mit `?renderer=2` aktiv.
