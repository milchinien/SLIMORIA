# SLIMORIA — GDD 01: Core Gameplay & Slime

**Dokumentstatus:** Arbeitsgrundlage / Core Design
**Priorität:** Kritisch
**Version:** 1.0
**Scope:** Kern-Spielgefühl, Schleimbewegung, Schleimkörper, Fressen, Wachstum, Masse, Tod und die unmittelbare Spielerinteraktion
**Nicht enthalten:** Combat & Abilities als eigenes System, Lore-Vertiefung, Welt-/Gebietsdesign, technische Implementierung

---

# 1. Zweck dieses Dokuments

Dieses Dokument definiert **was der Spieler mit seinem Schleim macht und wie sich der Schleim dabei anfühlen soll**.

Der Schleim ist nicht lediglich ein Charaktermodell.

> **Der Schleim ist das zentrale Gameplay-Element von SLIMORIA.**

Die Qualität der Bewegung, Verformung, Beschleunigung, Fressanimation und Reaktion auf die Umgebung hat deshalb eine höhere Priorität als viele sekundäre MMORPG-Systeme.

Das Spiel soll sich nicht wie ein gewöhnliches MMORPG anfühlen, bei dem zufällig ein Schleim als Charaktermodell verwendet wurde.

Es soll sich anfühlen wie:

> **Ein MMORPG, dessen gesamtes Gameplay um einen lebendigen, wabbelnden, verschlingenden Schleim herum gebaut wurde.**

---

# 2. Core Fantasy

Die zentrale Spielerfantasie lautet:

> **„Ich bin ein Schleim. Ich bewege mich als lebendige Masse durch eine Fantasywelt, verschlinge Kreaturen und werde durch sie stärker.“**

Der Spieler soll langfristig das Gefühl entwickeln:

> „Dieser Schleim gehört mir. Ich habe ihn durch meine Entscheidungen entwickelt.“

Ein Spieler soll beispielsweise nach vielen Stunden sagen können:

> „Mein Schleim ist extrem schnell, weil ich über Stunden Wolfsarten gefressen habe.“

Oder:

> „Mein Schleim ist auf Biss und Nahkampfschaden spezialisiert.“

Oder:

> „Ich habe diesen Boss immer wieder gefarmt, bis ich endlich seine seltene Fähigkeit bekommen habe.“

Oder:

> „Mein Schleim ist nicht besonders schnell, aber unglaublich widerstandsfähig.“

---

# 3. Die fünf Säulen des Core Gameplays

Das Kernspiel besteht aus fünf miteinander verbundenen Säulen.

## 3.1 Bewegen

Der Spieler bewegt seinen Schleim indirekt durch die Welt.

Die Bewegung muss:

* präzise genug für ein MMORPG sein
* weich und flüssig wirken
* physisch nachvollziehbar erscheinen
* sichtbar auf Geschwindigkeit reagieren
* die Masse des Schleims vermitteln

---

## 3.2 Kämpfen

Der Schleim kann gegen Kreaturen kämpfen.

Der Kampf reduziert die Lebenspunkte eines Gegners und ermöglicht es dem Spieler, einen geeigneten Zeitpunkt für einen Fressversuch herzustellen.

**Das Fressen ersetzt den Kampf nicht.**

Es ist häufig das Ziel des Kampfes.

---

## 3.3 Fressen

Der Spieler kann grundsätzlich versuchen, **jede Kreatur** zu fressen.

Die Erfolgschance hängt unter anderem von:

* Levelunterschied
* verbleibenden HP
* Stärke des Gegners
* Größe/Stärke der Kreatur
* weiteren definierten Gameplay-Faktoren

ab.

Das Fressen ist der wichtigste einzigartige Gameplay-Loop von SLIMORIA.

---

## 3.4 Entwickeln

Durch gefressene Kreaturen erhält der Schleim:

* XP
* Masse bzw. die mit dem Fressen verbundene Entwicklung
* permanente Eigenschaften
* bei geeigneten Bossen die Chance auf Fähigkeiten

Die Effekte wiederholten Fressens derselben Kreatur nehmen ab, **gehen aber nicht vollständig auf null**.

---

## 3.5 Wachsen

Der Level des Schleims bestimmt unter anderem seine Größe.

Der Schleim wird mit zunehmendem Level langsam größer.

Das Wachstum soll **nicht ständig offensiv kommuniziert werden**.

Der Spieler soll beispielsweise bei Level 2 nicht denken:

> „Wow, ich bin jetzt doppelt so groß.“

Stattdessen soll es ein schleichendes Gefühl sein.

Erst später, beispielsweise um Level 10:

> „Moment... war ich am Anfang wirklich so klein?“

Die Levelanzeige bleibt trotzdem eindeutig und zeigt den Fortschritt nachvollziehbar an.

---

# 4. Grundprinzip: Der Spieler ist der Schleim

Der Charakter soll nicht wie ein humanoider Avatar funktionieren.

Der Spieler besitzt:

* keinen menschlichen Körper
* keine Beine
* keine Arme
* keine menschliche Laufanimation

Der Körper ist ein **klassischer Blob-Schleim**.

Er bleibt grundsätzlich ein Blob.

Auch bei späteren Leveln oder enormem Wachstum darf er nicht dauerhaft seine Grundform verlieren.

---

# 5. Schleimkörper

## 5.1 Grundform

Die Grundform ist:

* weich
* rundlich
* leicht asymmetrisch
* elastisch
* wabbelnd
* kompakt genug, um als Spielfigur erkennbar zu bleiben

Der Schleim darf sich während der Bewegung deutlich verformen.

Er soll jedoch niemals zu einem völlig flachen oder beliebig deformierbaren Flüssigkeitskörper werden.

### Designregel

> **Der Spieler muss jederzeit erkennen können: „Das ist mein Schleim.“**

---

# 6. Visueller Stil

Der Stil liegt bewusst zwischen:

**physisch glaubwürdigem Wabbeln**

und

**humorvollem Anime-Stil.**

Es soll weder aussehen wie:

* realistische Flüssigkeit
* Fotorealismus
* eine reine Physiksimulation

noch wie:

* ein komplett flacher Cartoon
* eine starre Kugel mit Laufanimation

Das gewünschte Ergebnis ist:

> **Anime-Schleim mit glaubwürdiger physischer Masse.**

---

# 7. Gesicht

Der Schleim besitzt ein Gesicht.

Der Spieler kann bei der Charaktererstellung unter anderem verändern:

* Augen
* Mund
* Nase
* Name

Die Gesichtselemente bleiben Bestandteil des Schleimkörpers.

Sie sollen sich während der Bewegung und Verformung überzeugend mit dem Körper bewegen.

### Wichtig

Das Gesicht soll **nicht** permanent aufgesetzt wirken.

Wenn der Schleim sich nach vorne streckt, muss sich das Gesicht entsprechend mit der Oberfläche verhalten.

---

# 8. Fraktionsabhängiges Erscheinungsbild

Der Spieler kann die Farbe nicht frei wählen.

Die Farbe wird durch die Fraktion bestimmt.

### Eldoran

**Blauer Schleim**

### Ravok

**Roter Schleim**

Das verhindert, dass die Fraktionszugehörigkeit ausschließlich über UI oder Kleidung kommuniziert wird.

Die Farbe ist ein grundlegender Bestandteil der Identität.

---

# 9. Bewegungssystem

## 9.1 Steuerungsprinzip

Die Bewegung erfolgt **indirekt**.

Der Spieler klickt mit der Maus auf einen Punkt.

Der Schleim bewegt sich anschließend selbstständig zu diesem Ziel.

Das Grundprinzip ist ähnlich einer klassischen MMO-Steuerung.

---

# 10. Kamera

Die Kamera ist eine typische dritte-Person-MMO-Kamera.

Sie ist:

* drehbar
* neigbar
* zoombar

Grundsätzlich befindet sie sich hinter bzw. oberhalb des Schleims.

Die Kamera kann vom Spieler frei angepasst werden.

Im normalen Gameplay soll die Kamera den Schleim jedoch überwiegend verfolgen.

---

# 11. Zielbewegung

Beim Klick auf den Boden:

> Zielposition wird festgelegt → Schleim berechnet seinen Weg → Schleim bewegt sich dorthin.

Der Spieler steuert dabei nicht jeden einzelnen Körperpunkt.

Er steuert:

> **Wohin möchte sich die Schleimmasse bewegen?**

Das ist wichtig für das Spielgefühl.

---

# 12. Bewegungsanimation

Die Bewegung darf niemals wie:

> „Eine Kugel gleitet mit einer Laufgeschwindigkeit über den Boden“

aussehen.

Der Schleim muss **Masse besitzen**.

Beispiel bei niedriger Geschwindigkeit:

* Körper bleibt relativ kompakt
* leichte Wellenbewegung
* kleine seitliche Verformungen
* leichtes Wippen

Bei höherer Geschwindigkeit:

* Körper zieht sich stärker in Bewegungsrichtung
* hinterer Teil bleibt kurz zurück
* Körper schwingt nach
* Oberfläche wabbert stärker
* seitliche Bewegung entsteht
* der Schleim „federt“ in die Bewegung hinein

---

# 13. Beschleunigung

Der Schleim soll nicht augenblicklich von:

> 0 → maximale Geschwindigkeit

springen.

Stattdessen:

> Stillstand → Anrollen → Beschleunigung → maximale Geschwindigkeit

Dadurch wird Masse vermittelt.

Beim Stoppen gilt das gleiche Prinzip:

> maximale Geschwindigkeit → Abbremsen → leichtes Nachschwingen → Stillstand

Der Körper darf dabei kurz über die Zielbewegung hinausschwingen, bevor er sich stabilisiert.

---

# 14. Geschwindigkeit beeinflusst die Form

Das ist ein zentraler Bestandteil des Spiels.

### Langsam

Kompakter Blob.

### Mittel

Leicht nach vorne gezogen.

### Schnell

Deutlich in Bewegungsrichtung gestreckt.

### Sehr schnelle Bewegung / besondere Bewegung

Stärkere Deformation.

Beispielsweise:

> Vorne wird der Körper flacher und länger, während der hintere Teil nachgezogen wird.

---

# 15. Richtungswechsel

Ein plötzlicher Richtungswechsel soll sichtbar Masse besitzen.

Beispiel:

Schleim bewegt sich nach Norden.

Spieler klickt plötzlich nach Süden.

Der Körper:

1. beginnt abzubremsen
2. verformt sich
3. schwingt kurz nach
4. ändert seine Bewegungsrichtung
5. beschleunigt in die neue Richtung

Damit wird die Bewegung visuell befriedigend.

---

# 16. Keine Wandkletterei

Der Schleim kann **nicht** einfach:

* Wände hochlaufen
* Gebäude hochkriechen
* senkrechte Flächen erklimmen

Er bleibt an die normale Bodenbewegung gebunden.

---

# 17. Kleine Öffnungen

Eine besondere Eigenschaft des Schleims ist seine Verformbarkeit.

Er kann sich durch **kleine Öffnungen** bewegen, durch die ein normaler Charakter möglicherweise nicht passen würde.

Dies ist keine vollständige Physikfreiheit.

Es soll kontrolliert und spielbar bleiben.

Beispielsweise:

> Ein schmaler Spalt zwischen Felsen → Schleim kann hindurch.

Aber:

> geschlossene Wand → Schleim kann nicht hindurch.

---

# 18. Wasser

Der Schleim kann **nicht schwimmen**.

Wasser soll keine zweite vollständige Bewegungsmechanik für den Schleim erzeugen.

Das bedeutet:

* kein freies Schwimmen
* kein Unterwasser-Slime-Gameplay als Kernmechanik

Wasser kann trotzdem als Umgebungshindernis, Fluss, Dekoration oder später durch spezielle Inhalte relevant werden.

---

# 19. Kanonen und externe Bewegung

Der Schleim kann durch bestimmte **vorbereitete Weltobjekte** bewegt werden.

Beispiel:

> Kanone → Schleim wird hineingeschossen → Schleim fliegt durch die Luft → landet → Körper deformiert sich beim Aufprall.

Dies ist keine normale Fortbewegungsart.

Es handelt sich um **situative Weltinteraktion**.

---

# 20. Aufprall

Bei einem Aufprall kann sich der Schleim stark verformen.

Beispiel:

> Schleim fällt aus großer Höhe → Körper wird beim Kontakt mit dem Boden flach gedrückt → Masse federt zurück → Körper stabilisiert sich.

Die Animation soll dabei humorvoll wirken, ohne die physische Masse zu verlieren.

---

# 21. Fressen – das zentrale System

Das Fressen ist das wichtigste einzigartige System von SLIMORIA.

Grundregel:

> **Der Spieler kann grundsätzlich versuchen, jede Kreatur zu fressen.**

Die Möglichkeit bedeutet jedoch nicht, dass jede Kreatur tatsächlich mit realistischer Wahrscheinlichkeit gefressen werden kann.

---

# 22. Fresschance

Die Fresschance wird unter anderem durch den relativen Stärkeunterschied beeinflusst.

Ein zentraler Faktor ist der Levelunterschied.

### Beispiel

Spieler Level 10
Gegner Level 1
→ **100 % Fresschance**, sofern die übrigen Voraussetzungen erfüllt sind.

Spieler Level 3
Gegner Level 1
→ beispielsweise **40 %**.

Spieler deutlich schwächer als Gegner:
→ Chance kann stark sinken.

---

# 23. Levelunterschied über dem Spieler

Wenn ein Gegner **6–10 Level über dem Spieler** liegt:

> **0 % Fresschance.**

Der Spieler soll keinen kostenlosen Progress durch das Fressen deutlich stärkerer Gegner erhalten.

Der Spieler muss sich seinen Fortschritt erarbeiten.

---

# 24. HP beeinflussen die Fresschance

Der Spieler soll einen Gegner zunächst bekämpfen können.

Je stärker der Gegner geschwächt wurde:

> desto höher wird die Fresschance.

Dadurch entsteht der zentrale Kampfloop:

```text
Gegner auswählen
       ↓
zum Gegner bewegen
       ↓
Kämpfen
       ↓
Gegner schwächen
       ↓
Fresschance steigt
       ↓
Fressversuch
       ↓
Erfolg / Fehlschlag
```

---

# 25. Direkter Fressversuch bei großer Überlegenheit

Wenn der Spieler einen Gegner massiv überlevelt, soll er nicht gezwungen sein, den Gegner vollständig zu bekämpfen.

Beispielsweise:

> Spieler Level 10
> Gegner Level 1

Der Spieler kann den Gegner direkt fressen.

Das vermittelt:

> **„Ich bin diesem Gegner inzwischen weit überlegen.“**

---

# 26. Fressanimation

Die Fressanimation besitzt höchste Priorität.

Sie soll nicht einfach sein:

> Gegner verschwindet → Zahlen steigen.

Der Schleim soll tatsächlich versuchen, den Gegner zu **umschlingen**.

---

# 27. Beginn des Fressens

Der Schleim richtet seinen Körper auf das Ziel aus.

Er verformt sich deutlich.

Dann:

> **Der Schleim schnellt auf den Gegner zu.**

Die Masse wird nach vorne gezogen.

---

# 28. Umschlingen

Wenn der Fressversuch erfolgreich beginnt:

Der Schleim bildet eine Art **Blase/Kugel um den Gegner**.

Der Gegner befindet sich sichtbar innerhalb der Schleimmasse.

Die Masse bewegt sich kurz um ihn herum.

Der Gegner wird absorbiert.

Anschließend:

> Schleim zieht sich wieder zusammen.

---

# 29. Erfolgreiches Fressen

Nach erfolgreichem Fressen:

1. Gegner verschwindet innerhalb der Schleimmasse.
2. Schleim verarbeitet die Kreatur.
3. entsprechende Belohnungen werden vergeben.
4. Schleim nimmt wieder seine normale Form an.
5. Schleim landet am Ort, an dem der Gegner stand.
6. Der Körper wirkt kurz praller und schwingt nach, bevor er sich stabilisiert.
7. XP und Eigenschaften werden angewendet.

Der Standort des Gegners wird zum neuen Standort des Schleims.

### Wichtig: Fressen verändert nicht die dauerhafte Größe

Der Volumeneffekt nach dem Fressen ist eine **kurzzeitige visuelle Reaktion**.

Der Schleim kehrt anschließend auf seine reguläre Größe zurück.

> **Die dauerhafte Größe des Schleims wird ausschließlich durch sein Level bestimmt.**

Siehe §45–48.

---

# 30. Fehlgeschlagenes Fressen

Wenn der Fressversuch scheitert:

1. Schleim schnellt zum Ziel.
2. Umschlingung wird versucht.
3. Gegner widersteht.
4. Schleim wird zurückgestoßen bzw. schnappt zurück.
5. Schleim landet ungefähr an seiner ursprünglichen Position.
6. Spieler erhält keinen Fressfortschritt für diesen Versuch.
7. Der Schleim kann durch den Fehlschlag Schaden bzw. den definierten Verlustmechanismus erleiden.

Der Rückschnapp-Effekt soll deutlich sichtbar sein.

---

# 31. „Schnappen“ beim Fehlschlag

Der Schleim soll sich beim Fehlschlag physisch so verhalten, als hätte er sich zu stark gedehnt.

Beispiel:

> Schleim zieht sich um den Gegner → Gegner widersteht → Schleim wird elastisch zurückgezogen → Körper schnellt zurück → Blob wabbert nach.

Das ist eine der wichtigsten Animationen des gesamten Spiels.

Sie muss sich **befriedigend** anfühlen.

---

# 32. Fressen ist nicht nur eine Animation

Der Spieler soll jederzeit verstehen:

> **„Ich habe gerade versucht, dieses Wesen zu verschlingen.“**

Der Unterschied zwischen Erfolg und Fehlschlag muss visuell klar sein.

### Erfolg

* Gegner wird vollständig umschlossen
* Absorption
* Schleim stabilisiert sich
* Belohnung

### Fehlschlag

* Gegner bleibt bestehen
* Schleim wird zurückgeschleudert
* Schaden/Verlust
* Schleim stabilisiert sich

---

# 33. Fressversuch und Spielerentscheidung

Der Spieler soll den richtigen Zeitpunkt selbst wählen.

Ein Gegner kann beispielsweise bei:

> 80 % HP

zu gefährlich sein.

Bei:

> 20 % HP

kann die Chance wesentlich besser sein.

Damit entsteht ein Risiko:

> **„Versuche ich es jetzt oder kämpfe ich weiter?“**

---

# 34. Fressen als Progressionsentscheidung

Der Spieler entscheidet bei einem Gegner grundsätzlich zwischen:

### Töten

Mögliche Vorteile:

* XP
* Gold
* Ausrüstung
* sonstige normale Lootquellen

### Fressen

Mögliche Vorteile:

* XP
* Eigenschaften
* Masse/Entwicklung
* Bossfähigkeiten

Beide Wege liefern XP.

Der Unterschied liegt darin, **was zusätzlich** dabei entsteht: Gold und Loot beim Töten, dauerhafte Eigenschaften und Fähigkeiten beim Fressen.

Damit ist das Fressen **keine reine alternative Killanimation**.

Es verändert die gesamte Spielweise.

---

# 35. Wiederholtes Fressen derselben Kreatur

Eine Kreatur kann theoretisch **unendlich oft gefressen werden**.

Es gibt keine harte Grenze wie:

> „Nach 20 Wölfen bekommt der Spieler nichts mehr.“

Stattdessen nimmt der Effekt kontinuierlich ab.

Beispiel:

| Gefressene Wölfe | zusätzlicher Speed |
| ---------------: | -----------------: |
|                1 |              +1,00 |
|               10 |              +0,50 |
|               20 |              +0,20 |
|               50 |              +0,08 |
|              100 |              +0,03 |

Die konkreten Zahlen sind später Balancingwerte.

Das Prinzip ist fest:

> **Der Nutzen nähert sich langfristig sehr kleinen Werten an, erreicht aber nicht automatisch exakt null.**

---

# 36. Warum keine harte Grenze?

Weil ein Spieler theoretisch sagen können soll:

> „Ich habe meinen Schleim komplett auf Geschwindigkeit spezialisiert und dafür 40 Stunden lang Wolfsarten gejagt.“

Diese extreme Spezialisierung ist ein gewünschter Bestandteil der Identität von SLIMORIA.

---

# 37. Klassenabhängige Fressboni

Die Wirkung einer Kreatur kann je nach Klasse unterschiedlich sein.

Beispiel Wolf:

| Klasse   | erster Wolf |
| -------- | ----------: |
| Schurke  |  +1,5 Speed |
| Krieger  |  +1,0 Speed |
| Mage     |  +1,0 Speed |
| Druide   |  +1,0 Speed |
| Priester |  +1,0 Speed |
| Paladin  |  +0,5 Speed |

Die genauen Werte sind Balancingwerte.

Das grundlegende Prinzip ist fest:

> **Klassen haben unterschiedliche Affinitäten zu bestimmten Kreatureneigenschaften.**

Dadurch kann ein Wolf für einen Schurken wesentlich attraktiver sein als für einen Paladin.

---

# 38. Fressboni sind dauerhaft

Wenn der Spieler eine entsprechende Kreatur erfolgreich frisst und die Eigenschaft erhält, bleibt sie erhalten.

Die Eigenschaften werden nicht einfach zu temporären Buffs.

Sie bilden einen Teil des langfristigen Charakters.

---

# 39. Fressboni sind nicht optisch sichtbar

Der Schleim bekommt **keine permanente visuelle Anzeige**, die beispielsweise sagt:

> „+47 Wolfsinstinkt“

Es kann sich gameplayseitig um einen starken Wert handeln, aber der Körper bleibt optisch ein Schleim.

Keine:

* Wolfsohren
* Wolfsschwanz
* sichtbare Krallen
* Flügel aus gefressenen Kreaturen

als permanente kosmetische Darstellung.

Kosmetische Transformationen sind ausdrücklich **kein Kernsystem**.

---

# 40. Boss-Fressen

Bosse besitzen besondere Eigenschaften.

Das Fressen eines Bosses kann dem Spieler ermöglichen:

* besondere Fähigkeiten
* stärkere Varianten bestehender Fähigkeiten
* passive Boni
* außergewöhnliche Eigenschaften

zu erhalten.

---

# 41. Boss-Fähigkeiten

Bossfähigkeiten sind **nicht garantiert**.

Ein Boss kann beispielsweise:

> 20 % Biss
> 10 % Gespür

geben.

Die Dropchance und Qualität hängen vom Boss und seinen Eigenschaften ab.

Das Fressen eines Bosses soll deshalb einen wiederholbaren Grind erzeugen.

---

# 42. Fähigkeitsränge

Bossfähigkeiten besitzen Seltenheitsstufen:

* **Common** – Grau
* **Uncommon** – Grün
* **Rare** – Blau
* **Epic** – Lila
* **Legendary** – Gold
* **Mythic** – Rot

Diese Seltenheit beeinflusst die Qualität der Fähigkeit.

---

# 43. Bestehende Fähigkeiten beeinflussen höhere Ränge

Ein bereits vorhandener Bonus derselben Fähigkeit soll nicht wertlos sein.

Beispiel:

Der Spieler besitzt bereits:

> Common Biss

Durch wiederholtes Farmen kann sich seine Grundlage weiterentwickeln.

Später erhält er:

> Uncommon Biss

und schließlich eventuell:

> Rare / Epic / Legendary / Mythic Biss.

Das bedeutet:

> **Die Geschichte des Spielers mit einer bestimmten Fähigkeit kann seinen späteren Fortschritt beeinflussen.**

Das verhindert, dass Common-Fähigkeiten nach wenigen Stunden vollständig irrelevant werden.

---

# 44. Fressen und Klassenfähigkeiten

Nicht jede Kreatur kann jede Fähigkeit für jede Klasse geben.

Beispiel:

**Wolf → Biss**

kann eine Fähigkeit sein, die beispielsweise für den Schurken relevant ist.

**Wolf → Gespür**

kann beispielsweise für:

* Priester
* Druide
* Schurke

relevant sein.

Dadurch entstehen unterschiedliche Farmziele für unterschiedliche Klassen.

---

# 45. Wachstum durch Level

Der Schleim wächst mit dem Level.

Das Level ist somit nicht nur eine Zahl.

Es repräsentiert unter anderem:

> **Die körperliche Entwicklung des Schleims.**

Das Wachstum muss allerdings langsam genug sein, dass die Welt nicht nach kurzer Spielzeit durch riesige Schleime unspielbar wird.

---

# 46. Wachstum soll subtil sein

Die Größenveränderung soll über viele Level verteilt werden.

Der Spieler soll:

**Level 1**

als kleinen Schleim beginnen.

Bei:

**Level 5**

etwas größer sein.

Bei:

**Level 10**

kann der Unterschied bereits auffallen.

Bei:

**Level 30**

ist der Unterschied deutlich.

Bei:

**Level 80**

ist der Schleim sehr groß im Vergleich zum Ausgangszustand.

Aber:

> **Er bleibt immer als Schleim erkennbar.**

---

# 47. Größe ist keine reine kosmetische Variable

Die Größe soll hauptsächlich den Fortschritt visualisieren.

Sie darf nicht dazu führen, dass größere Spieler automatisch alle kleinen Spieler blockieren oder die Welt unspielbar machen.

Die genaue Gameplay-Bedeutung von Größe wird deshalb kontrolliert.

---

# 48. Level 80 und Wachstum

Der Spieler kann theoretisch sehr mächtig und groß werden.

Das Wachstum muss jedoch so gestaltet sein, dass Level 80 nicht bedeutet:

> „Der Spieler ist 50-mal größer als ein Level-1-Spieler.“

Das Ziel ist:

> **beeindruckender Größenunterschied, aber kontrollierte Spielbarkeit.**

---

# 49. Tod des Schleims

Der Tod ist eine wichtige visuelle Identität des Spiels.

Der Schleim soll nicht einfach:

> umfallen.

Er besitzt keine Knochen und keinen humanoiden Körper.

---

# 50. Todesanimation

Bei Tod:

1. Schleim verliert seine stabile Form.
2. Körper beginnt stark zu zittern/verformen.
3. Schleim **platzt**.
4. Es bleibt eine dunklere Schleimpfütze zurück.
5. Die Augen schwimmen sichtbar in der Pfütze.
6. Die Farbe wirkt dunkler und „tot“.
7. Der Charakter wird zum Friedhof zurückgesetzt.

Die Animation darf humorvoll wirken, soll aber eindeutig vermitteln:

> **Der Schleim ist tot.**

---

# 51. Respawn

Nach dem Tod:

> **Respawn am Friedhof.**

Der Spieler verliert nicht seinen Charakter.

Der Charakter bleibt erhalten.

---

# 52. Verlust bei Tod

Der Spieler kann durch Tod bzw. fehlgeschlagene Fressversuche Fortschritt verlieren.

Die zentrale harte Grenze lautet:

> **Der Spieler kann niemals unter Level 1 fallen.**

Das bedeutet:

### Schlimmster Fall

Ein Spieler verliert extrem viel Fortschritt und fällt auf:

> **Level 1**

Er behält jedoch:

* seine Fähigkeiten
* seine Charakteridentität
* seine Klasse
* seine gefressenen langfristigen Eigenschaften entsprechend dem definierten Persistenzsystem

Seine aktuellen Kampfwerte entsprechen jedoch wieder ungefähr einem Level-1-Charakter.

---

# 53. Konsequenz des Levelverlusts

Wenn ein Level-80-Spieler extrem viel Fortschritt verliert und auf Level 1 fällt:

Er besitzt weiterhin beispielsweise:

> Legendary Biss
> Mythic Bossfähigkeit
> jahrelang aufgebaute Eigenschaften

Aber:

> **Seine HP, sein Schaden und seine grundlegende Levelstärke entsprechen wieder Level 1.**

Das ist absichtlich ein extremes Risiko-/Fortschrittssystem.

---

# 54. Warum Fähigkeiten erhalten bleiben

Das verhindert, dass der Verlust des Charakters vollständig zerstörerisch wird.

Der Spieler verliert zwar:

> **seine aktuelle körperliche Stärke**

aber nicht:

> **seine Entwicklungsgeschichte.**

Dadurch bleibt der Charakter langfristig interessant.

---

# 55. Keine Charakterlöschung durch Tod

Der Spieler muss niemals einen neuen Schleim erstellen, nur weil er gestorben ist.

Die Charakterplätze bleiben erhalten.

Ein Spieler kann bis zu:

> **8 Schleim-Charaktere**

besitzen.

---

# 56. Charakteridentität

Jeder Schleim besitzt:

* Name
* Fraktion
* Klasse
* Aussehen
* Level
* Größe
* Eigenschaften
* Fähigkeiten
* Ausrüstung
* Fortschritt

Der Schleim soll sich dadurch über viele Spielstunden wie ein **persönlicher Charakter** entwickeln.

---

# 57. Charaktererstellung

Vor dem ersten Einstieg in die Welt erstellt der Spieler seinen Schleim.

Anpassbar:

* Augen
* Mund
* Nase
* Name

Nicht frei anpassbar:

* Fraktionsfarbe
* grundlegende Schleimform

Die Fraktionsfarbe wird durch die gewählte Fraktion bestimmt:

> Eldoran → Blau
> Ravok → Rot

---

# 58. Warum der Spieler nicht direkt mit maximalen Fähigkeiten startet

Der Anfang soll bewusst klein wirken.

Der Spieler beginnt als:

> **kleiner, schwacher Schleim.**

Er muss lernen:

* sich zu bewegen
* Kreaturen zu bekämpfen
* Gegner zu fressen
* Eigenschaften zu erhalten
* stärker zu werden

Der Kontrast zwischen:

> **Level 1 kleiner Schleim**

und

> **Level 80 mächtiger Schleim**

ist ein zentraler Bestandteil der Progressionsfantasie.

---

# 59. Der Core Gameplay Loop

Der zentrale Loop von SLIMORIA lautet:

```text
ERKUNDEN
   ↓
KREATUR FINDEN
   ↓
KÄMPFEN
   ↓
KREATUR SCHWÄCHEN
   ↓
FRESSCHANCE BEURTEILEN
   ↓
FRESSEN
   ↓
ERFOLG?
 ↙       ↘
JA        NEIN
↓          ↓
XP         Verlust/Schaden
Eigenschaft ↓
Masse      Weiterkämpfen
Fähigkeit
↓
STÄRKER WERDEN
   ↓
STÄRKERE KREATUREN
   ↓
STÄRKERE BOSSE
   ↓
NEUE EIGENSCHAFTEN
   ↓
NEUE FÄHIGKEITEN
   ↓
WEITER ENTWICKELN
```

Dieser Loop ist der **Kern von SLIMORIA**.

---

# 60. Der zweite Loop: Töten oder Fressen

Ein zweiter zentraler Entscheidungsloop:

```text
Kreatur gefunden
       ↓
      Kampf
       ↓
Gegner geschwächt
       ↓
 ┌───────────────┐
 │ Entscheidung  │
 └──────┬────────┘
        ↓
   FRESSEN       TÖTEN
      ↓             ↓
   XP /         Gold / Loot
Eigenschaften
Fähigkeiten
```

Dadurch hat jede Kreatur einen potentiellen Mehrfachnutzen.

---

# 61. Der langfristige Loop

Über viele Stunden:

```text
Kreaturen farmen
       ↓
Eigenschaften verbessern
       ↓
Build entwickeln
       ↓
Boss suchen
       ↓
Boss farmen
       ↓
seltene Fähigkeit erhalten
       ↓
neue Gebiete
       ↓
stärkere Kreaturen
       ↓
neue Bosse
       ↓
neuer Build
```

Das soll die Grundlage für die lange Level-1–80-Reise bilden.

---

# 62. Was SLIMORIA ausdrücklich nicht sein soll

Der Schleim soll **nicht**:

* ein humanoider Charakter mit Schleimhaut sein
* wie ein normaler MMO-Charakter laufen
* Waffen wie ein Mensch halten müssen
* seine Identität über Rüstung erhalten
* sich in jede beliebige Kreatur verwandeln
* automatisch jede gefressene Kreatur kosmetisch übernehmen
* beliebig Wände hochlaufen
* frei schwimmen
* ausschließlich durch Quest-XP leveln
* Gegner einfach durch Levelüberschuss automatisch verschlingen können

---

# 63. Prioritäten bei der Entwicklung

Für das Core-Gameplay gilt folgende Priorität:

## Priorität 1 – Schleimbewegung

Der Spieler muss bereits beim ersten Bewegen denken:

> **„Das fühlt sich wie ein Schleim an.“**

---

## Priorität 2 – Verformung

Beschleunigung, Bremsen, Richtungswechsel, Aufprall und Geschwindigkeit müssen sichtbar sein.

---

## Priorität 3 – Fressen

Das Fressen muss sich **befriedigend und physisch** anfühlen.

---

## Priorität 4 – Wachstum

Der Spieler muss langfristig erkennen können:

> „Mein Schleim entwickelt sich.“

---

## Priorität 5 – Tod

Auch der Tod soll eine charakteristische Schleimanimation besitzen.

---

# 64. Feedback-Anforderungen

Jede wichtige Aktion braucht eindeutiges Feedback.

### Bewegung

Der Körper zeigt:

> Geschwindigkeit + Richtung.

### Beschleunigung

Der Körper zieht sich:

> sichtbar in Bewegungsrichtung.

### Fressen erfolgreich

Der Gegner wird:

> vollständig umschlossen und absorbiert.

### Fressen fehlgeschlagen

Der Schleim:

> schnellt zurück.

### Levelaufstieg

Der Spieler erhält:

> eindeutiges UI-Feedback + nachvollziehbare Größenentwicklung.

### Tod

Der Schleim:

> platzt und bleibt als dunkle Pfütze zurück.

---

# 65. Spielerlebnis-Ziel

Nach den ersten Spielstunden soll sich der Spieler nicht primär denken:

> „Ich spiele ein MMORPG.“

Sondern:

> **„Ich spiele meinen Schleim.“**

Die MMORPG-Systeme kommen darum herum.

Das ist die wichtigste Designentscheidung dieses Dokuments.

---

# 66. Designprinzip: Masse statt Animation

Eine zentrale Regel für alle zukünftigen Animationen:

> **Der Schleim darf niemals wie ein Objekt aussehen, das lediglich eine Schleim-Textur besitzt.**

Sein Körper muss auf seine Bewegung reagieren.

Wenn er:

* beschleunigt → Körper reagiert
* stoppt → Körper reagiert
* springt/geschossen wird → Körper reagiert
* aufprallt → Körper reagiert
* frisst → Körper reagiert
* zurückgeschleudert wird → Körper reagiert
* stirbt → Körper reagiert

Die Körperbewegung ist ein Teil des Feedbacks.

---

# 67. Designprinzip: Physik mit Gameplay-Kontrolle

SLIMORIA benötigt **keine vollständig realistische Flüssigkeitssimulation**.

Realistische Physik darf niemals dazu führen, dass:

* der Schleim unkontrollierbar wird
* Animationen unlesbar werden
* Treffer schwierig werden
* der Charakter durch den Boden fällt
* Multiplayer-Synchronisation problematisch wird
* der Spieler die Kontrolle verliert

Das Ziel lautet:

> **„Es sieht physikalisch glaubwürdig aus, fühlt sich aber wie ein präzises Spiel an.“**

---

# 68. Designprinzip: Anime + Physik

Die beiden Stilrichtungen müssen gleichzeitig funktionieren.

### Physik liefert:

* Gewicht
* Trägheit
* Verformung
* Elastizität
* Masse

### Anime liefert:

* starke Bewegungsphasen
* übertriebene Deformation
* klare Silhouetten
* humorvolle Reaktionen
* sichtbare Impact-Momente

Das Ergebnis soll **nicht realistisch**, sondern **glaubwürdig und charaktervoll** wirken.

---

# 69. Lore-Mysterien

Die Lore-Erklärungen, die in diesem Dokument indirekt für Gameplay benötigt werden, werden bewusst **nicht vollständig erklärt**.

Insbesondere bleibt offen:

* warum genau der Spieler außergewöhnlich gut absorbieren kann
* was genau die ursprüngliche Evolution der Schleime ausgelöst hat
* was bei der historischen Katastrophe vollständig geschah
* warum bestimmte Kreaturen besondere Essenzen besitzen
* warum alte Bosse zurückkehren
* welche vollständige Verbindung zwischen Spieler, Evolution und der Vergangenheit besteht

Diese Informationen sind **keine fehlenden Designentscheidungen**.

Sie sind bewusst gesetzte **Lore-Mysterien**.

Der Spieler soll diese Zusammenhänge im Verlauf der Geschichte selbst entdecken und interpretieren können.

Das GDD darf diese Geheimnisse daher **nicht vorzeitig als Fakten auflösen**.

---

# 70. Definition of Done für den Core-Slime-Prototyp

Der Kern-Prototyp ist erst dann erfolgreich, wenn ein Spieler ohne weitere Systeme bereits Spaß daran hat:

1. Schleim erstellen.
2. Schleim aus der dritten Person sehen.
3. Auf einen Punkt klicken.
4. Schleim dorthin bewegen.
5. Beschleunigung und Abbremsen sehen.
6. Richtungswechsel spüren.
7. Schleim wabbeln sehen.
8. Geschwindigkeit an der Körperform erkennen.
9. Kreatur finden.
10. Zum Gegner bewegen.
11. Gegner bekämpfen.
12. Gegner schwächen.
13. Fressversuch auslösen.
14. Schleim umschlingt den Gegner.
15. Fressversuch gelingt oder scheitert.
16. Erfolg/Fehlschlag visuell eindeutig erkennen.
17. Nach erfolgreichem Fressen die Veränderung wahrnehmen.
18. Mehrere Kreaturen fressen.
19. Level aufsteigen.
20. Wachstum des Schleims erkennen.
21. Bei Tod die charakteristische Todesanimation sehen.
22. Am Friedhof respawnen.

Wenn diese 22 Punkte **nicht bereits Spaß machen**, sind zusätzliche MMORPG-Systeme keine Lösung.

---

# 71. Kernformel von SLIMORIA

> **Bewegen → Kämpfen → Schwächen → Fressen → Entwickeln → Wachsen → stärkere Kreaturen suchen → Bosses fressen → einzigartige Fähigkeiten erhalten → weiterentwickeln.**

Und darunter liegt die wichtigste Designregel:

> **Der Spieler soll nicht einfach einen Charakter steuern, der ein Schleim ist. Der Spieler soll das Gefühl haben, einen Schleim zu steuern.**

**GDD 01 ist damit inhaltlich abgeschlossen.**
