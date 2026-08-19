# SLIMORIA — GDD 03: Classes, Talents & Builds

**Dokumentstatus:** Final
**Version:** 1.0
**Priorität:** Hoch
**Scope:** Klassen, Klassenidentität, Rollen, Ressourcen, Talent-System, Spezialisierungen, Klassenlehrer, Build-System und klassenabhängige Fress-/Fähigkeitsentwicklung.

> **Abgrenzung:** GDD 03 definiert, **wie sich Klassen und Builds entwickeln**. Die detaillierte Umsetzung einzelner Kampffähigkeiten gehört zu GDD 02 und wird hier nicht erneut ausgearbeitet.

---

# 1. Grundidee

SLIMORIA besitzt **sechs Klassen**:

1. **Krieger**
2. **Paladin**
3. **Mage**
4. **Priester**
5. **Schurke**
6. **Druide**

Es gibt **keine weiteren Rassen**.

Jeder Charakter ist ein Schleim.

Die Klasse bestimmt nicht, *welche Art von Schleim* der Spieler ist, sondern **wie er seinen Schleim entwickelt und im Kampf einsetzt**.

---

# 2. Klassenfantasie

Jede Klasse soll eine klare Antwort auf die Frage geben:

> **„Wie möchte ich meinen Schleim spielen?“**

| Klasse   | Primärer Fokus                          | Typische Rolle       |
| -------- | --------------------------------------- | -------------------- |
| Krieger  | Nahkampf, Stärke, Widerstand            | Tank / DPS           |
| Paladin  | Verteidigung, Heiligkeit, Unterstützung | Tank / Heal / Hybrid |
| Mage     | Magie, Fernkampf, Flächenschaden        | DPS                  |
| Priester | Heilung, Unterstützung, später DPS      | Heal / DPS           |
| Schurke  | Geschwindigkeit, Burst, Stealth         | DPS                  |
| Druide   | Natur, Fernkampf, Heilung, Flexibilität | DPS / Heal / Hybrid  |

---

# 3. Grundprinzip: Keine Klasse ist nur eine Rolle

Eine Klasse darf nicht vollständig mit einer einzigen MMO-Rolle gleichgesetzt werden.

Beispiel:

> Paladin ≠ automatisch Tank.

Stattdessen:

> Paladin → Tank / Heiler / Hybrid

Ebenso:

> Priester → hauptsächlich Heiler, später auch DPS.

Dadurch entscheidet nicht nur die Charaktererstellung über den Spielstil.

Der Build entsteht **während des Spiels**.

---

# 4. Klassenwahl

Die Klasse wird bei der Charaktererstellung gewählt.

Die Wahl ist langfristig relevant.

Ein Charakter kann nicht einfach mitten im Kampf die Klasse wechseln.

Die sechs Klassen besitzen unterschiedliche:

* Fähigkeiten
* Ressourcen
* Talentbäume
* Rollen
* Fressaffinitäten
* Boss-Fähigkeiten
* Klassenlehrer

---

# 5. Klassen und Fraktionen

Die Klassen sind an die beiden Fraktionen gebunden.

## Eldoran – Blau

Spielbare Klassen:

* Krieger
* Paladin
* Priester
* Druide
* Schurke

Nicht verfügbar:

* Mage

---

## Ravok – Rot

Spielbare Klassen:

* Krieger
* Mage
* Priester
* Schurke
* Druide

Nicht verfügbar:

* Paladin

Die Fraktionen haben dadurch nicht exakt dieselbe Klassenauswahl.

Das ist bewusst.

### Sonderfall Schurke

Der Schurke ist in **beiden** Fraktionen spielbar.

Er ist jedoch nur in Ravok gesellschaftlich anerkannt.

In Eldoran wird die Klasse mit Diebstahl, Betrug und Kriminalität verbunden und deshalb misstrauisch betrachtet.

Das ist eine **kulturelle**, keine spielmechanische Einschränkung:

> Ein Eldoran-Schurke besitzt dieselben Fähigkeiten wie ein Ravok-Schurke, bewegt sich aber in einer Gesellschaft, die ihn nicht überall akzeptiert.

Die gesellschaftlichen Hintergründe sind in **GDD 06 – World, Factions & Lore** §11 und §18 definiert.

---

# 6. Konsequenz der Fraktionsklassen

Ein Spieler, der einen Paladin spielen möchte, muss Eldoran wählen.

Ein Spieler, der einen Mage spielen möchte, muss Ravok wählen.

Beim Schurken entscheidet die Fraktionswahl nicht über die Verfügbarkeit, sondern über das gesellschaftliche Umfeld:

> Ravok → anerkannt
> Eldoran → geduldet, aber misstrauisch betrachtet

Dadurch wird die Charakterwahl bereits zu einer bedeutenden Entscheidung.

---

# 7. Klassenbalance

Die Klassen sollen **nicht identisch stark**, sondern unterschiedlich stark in verschiedenen Situationen sein.

Beispiel:

Ein Schurke kann beim Fressen bestimmter schneller Kreaturen besonders hohe Boni erhalten.

Ein Paladin erhält dieselbe Eigenschaft möglicherweise deutlich schwächer.

Das erzeugt unterschiedliche Farmziele.

---

# 8. Klassenspezifische Fressaffinitäten

Jede Klasse besitzt unterschiedliche Gewichtungen für Kreatureneigenschaften.

Beispiel:

Ein Wolf liefert Geschwindigkeit.

| Klasse   | Wolf-Speed-Bonus |
| -------- | ---------------: |
| Schurke  |             hoch |
| Krieger  |           normal |
| Mage     |           normal |
| Druide   |           normal |
| Priester |           normal |
| Paladin  |          niedrig |

Die konkreten Zahlen werden später gebalanced.

Das Prinzip ist verbindlich.

---

# 9. Warum dieses System wichtig ist

Damit kann derselbe Gegner für verschiedene Klassen unterschiedlich wertvoll sein.

Für einen Schurken:

> „Ich brauche Wölfe.“

Für einen Paladin:

> „Wölfe bringen mir kaum etwas. Ich suche lieber robuste Kreaturen.“

Damit entstehen automatisch verschiedene Spieleridentitäten.

---

# 10. Krieger

## Klassenfantasie

Der Krieger ist der direkte, robuste Nahkämpfer.

Er soll sich wie ein Schleim anfühlen, der seine Masse als Waffe einsetzt.

Schwerpunkte:

* Nahkampf
* hoher physischer Schaden
* Widerstand
* Tanking
* Wutmanagement

---

# 11. Krieger-Rollen

Der Krieger kann primär:

### Tank

* hohe Widerstandsfähigkeit
* Aggro
* defensive Talente

oder:

### DPS

* hoher Nahkampfschaden
* stärkere offensive Talente

werden.

---

# 12. Krieger-Ressource

Der Krieger verwendet:

> **Wut**

Wut wird durch Kampf aufgebaut.

Sie wird anschließend für bestimmte Fähigkeiten ausgegeben.

Der Krieger spielt sich dadurch aktiver als eine Mana-Klasse.

---

# 13. Krieger-Fressidentität

Der Krieger profitiert besonders von:

* Stärke
* HP
* Schutz
* Nahkampfschaden
* physischen Eigenschaften

Er ist weniger auf extreme Geschwindigkeit spezialisiert als der Schurke.

---

# 14. Paladin

## Klassenfantasie

Der Paladin verbindet:

> **Widerstand + Heiligkeit + Unterstützung.**

Er ist die flexibelste defensive Klasse.

Er kann sich zu:

* Tank
* Heiler
* Hybrid

entwickeln.

---

# 15. Paladin-Rollen

### Tank-Paladin

Fokus:

* HP
* Schutz
* Aggro
* defensive Fähigkeiten

### Heiler-Paladin

Fokus:

* Heilung
* Unterstützung
* Manaeffizienz

### Hybrid-Paladin

Kombination aus:

* Verteidigung
* Heilung
* Schaden

---

# 16. Paladin-Ressource

Der Paladin verwendet:

> **Mana**

Mana wird für seine Fähigkeiten benötigt.

---

# 17. Paladin-Fressidentität

Der Paladin profitiert besonders von:

* Schutz
* HP
* Resistenz
* Heilung
* defensiven Eigenschaften

Offensive oder Geschwindigkeitseigenschaften können für ihn weniger effizient sein.

Dadurch wird beispielsweise der Wolf für einen Paladin weniger attraktiv als für einen Schurken.

---

# 18. Mage

## Klassenfantasie

Der Mage ist die klassische magische Fernkampfklasse.

Er nutzt die besonderen Eigenschaften des Schleims, um Magie zu kanalisieren.

Schwerpunkte:

* Fernkampf
* magischer Schaden
* Flächenschaden
* Reichweite
* Mana

---

# 19. Mage-Rolle

Der Mage ist primär:

> **DPS**

Seine Stärke liegt nicht in Tanking oder Heilung.

---

# 20. Mage-Ressource

Der Mage verwendet:

> **Mana**

Mana bestimmt, wie häufig mächtige Zauber eingesetzt werden können.

---

# 21. Mage-Fressidentität

Der Mage kann besonders von Eigenschaften profitieren wie:

* magische Stärke
* Mana
* Mana-Regeneration
* Reichweite
* magische Resistenz

Physische Eigenschaften sind nicht automatisch nutzlos, aber nicht sein primärer Fokus.

---

# 22. Priester

## Klassenfantasie

Der Priester ist der wichtigste klassische Heiler.

Seine Identität lautet:

> **„Ich halte meine Gruppe am Leben.“**

---

# 23. Priester-Rollen

Primär:

> **Heiler**

Später:

> **DPS**

Die DPS-Ausrichtung wird erst mit fortschreitender Entwicklung relevanter.

Der Priester soll nicht von Anfang an wie ein klassischer Nahkämpfer wirken.

---

# 24. Priester-Kampfstil

Der Priester besitzt:

* viele Heilfähigkeiten
* Unterstützungsfähigkeiten
* defensive Magie
* Fernkampfoptionen

Nahkampffähigkeiten sind stark eingeschränkt.

---

# 25. Priester-Ressource

Der Priester verwendet:

> **Mana**

---

# 26. Priester-Fressidentität

Der Priester profitiert besonders von:

* Mana
* Heilung
* Unterstützungswerten
* magischen Eigenschaften
* Wahrnehmung/Gespür

Bestimmte Kreaturen können Fähigkeiten liefern, die speziell für den Priester interessant sind.

---

# 27. Schurke

## Klassenfantasie

Der Schurke ist die schnellste und beweglichste Klasse.

Seine Identität:

> **Geschwindigkeit + Überraschung + Burst.**

---

# 28. Schurken-Rolle

Primär:

> **DPS**

Der Schurke ist nicht für Tanking oder Heilung vorgesehen.

---

# 29. Schurken-Ressource

Der Schurke verwendet:

> **Stealth-Punkte**

Diese werden durch bestimmte Verhaltensweisen aufgebaut.

Beispielsweise:

* Stealth
* bestimmte Ruhephasen
* spezielle Fähigkeiten

und anschließend für Fähigkeiten ausgegeben.

---

# 30. Schurken-Fressidentität

Der Schurke besitzt besonders starke Synergien mit:

* Geschwindigkeit
* Angriff
* Biss
* Stealth
* Wahrnehmung/Gespür

Deshalb kann der Schurke beispielsweise besonders stark von Wölfen profitieren.

---

# 31. Druide

## Klassenfantasie

Der Druide verbindet:

> **Natur + Flexibilität + Unterstützung.**

Er ist die vielseitigste magische Klasse.

---

# 32. Druiden-Rollen

Mögliche Ausrichtungen:

* Fernkampf-DPS
* Heilung
* Hybrid

---

# 33. Druiden-Ressource

Der Druide verwendet:

> **Mana**

---

# 34. Druiden-Fressidentität

Der Druide besitzt starke Synergien mit:

* Natur
* Wahrnehmung
* Heilung
* Fernkampf
* tierbezogenen Eigenschaften

---

# 35. Tierformen

Der Druide kann durch bestimmte Fähigkeiten bzw. Lehrer lernen, bestimmte tierbezogene Formen einzusetzen.

Wichtig:

> Diese Formen sind **Fähigkeiten**, keine dauerhafte kosmetische Charakterveränderung.

Der Schleim bleibt grundsätzlich ein Schleim.

Die Form wird nur als Teil der entsprechenden Fähigkeit verwendet.

---

# 36. Klassenlehrer

Jede Klasse kann bestimmte Lehrer besitzen.

Lehrer vermitteln **nur ausgewählte Fähigkeiten**.

Sie sind nicht dafür gedacht, dem Spieler sämtliche Klassenfähigkeiten kostenlos bereitzustellen.

Beispiele:

### Druide

Lehrer:

> bestimmte Tierform

### Schurke

Lehrer:

> Schleichen

Weitere Lehrer werden gezielt eingesetzt.

---

# 37. Klassenlehrer und Boss-Fähigkeiten

Es gibt eine klare Trennung:

### Lehrer

vermitteln bestimmte grundlegende bzw. spezielle Klassenfähigkeiten.

### Bosse

können außergewöhnliche Fähigkeiten liefern.

Dadurch bleiben Bosskämpfe und Fressfarming relevant.

---

# 38. Talent-System

Das Talent-System beginnt:

> **Level 10**

Ab Level 10 erhält der Spieler:

> **pro Level 1 Talentpunkt.**

Damit wird das Talent-System ein wichtiger Bestandteil der mittleren und späteren Charakterentwicklung.

---

# 39. Talentpunkte

Ein Talentpunkt kann in einen klassenspezifischen Talentbaum investiert werden.

Der Talentbaum enthält mehrere Pfade.

Die Pfade verstärken unterschiedliche Spielweisen.

---

# 40. Talentbaum-Prinzip

Ein Talentbaum soll nicht nur:

> +1 % Schaden

enthalten.

Es soll auch Entscheidungen geben wie:

* Fähigkeit verändert sich
* neue Synergie entsteht
* Ressourcennutzung verändert sich
* Rolle wird verstärkt
* bestimmte Spielweise wird attraktiver

---

# 41. Beispiel Krieger-Talentbaum

Mögliche Richtungen:

### Offensive

* Nahkampfschaden
* Biss
* Burst
* Wutnutzung

### Defensive

* HP
* Schadensreduktion
* Aggro
* Schutz

Der Spieler kann dadurch seinen Krieger stärker spezialisieren.

---

# 42. Beispiel Paladin-Talentbaum

Mögliche Richtungen:

### Schutz

Tank-Fokus.

### Heilig

Heil-Fokus.

### Kampf

offensiver Paladin.

Die endgültige größere Spezialisierungsentscheidung erfolgt zusätzlich auf Level 30.

---

# 43. Beispiel Mage-Talentbaum

Mögliche Richtungen:

* Einzelzielschaden
* Flächenschaden
* Manaeffizienz
* Kontrolle

---

# 44. Beispiel Priester-Talentbaum

Mögliche Richtungen:

* starke Heilung
* Gruppenunterstützung
* Manaeffizienz
* später offensivere Magie

---

# 45. Beispiel Schurke-Talentbaum

Mögliche Richtungen:

* Geschwindigkeit
* Biss/Nahkampfschaden
* Stealth
* Burst

---

# 46. Beispiel Druide-Talentbaum

Mögliche Richtungen:

* Heilung
* Naturmagie
* Fernkampf
* Tierfähigkeiten

---

# 47. Level 30 – große Spezialisierungsentscheidung

Ab Level 30 trifft jede Klasse eine zusätzliche wichtige Entscheidung.

Diese Entscheidung soll deutlich stärker sein als ein einzelner Talentpunkt.

Sie definiert:

> **Welche Art von Klassenbuild möchte ich langfristig spielen?**

---

# 48. Beispiel Paladin Level 30

Der Paladin kann beispielsweise wählen:

### Wächter

> Tank

### Lichtträger

> Heiler

### Auserwählter

> Hybrid

Die konkreten Namen sind noch nicht endgültig festgelegt.

---

# 49. Beispiel Priester Level 30

Mögliche Richtung:

### Heilung

stärkere Gruppenheilung.

### Dunklere/Offensive Magie

mehr DPS.

Der Priester bleibt grundsätzlich eine Unterstützungs-/Magieklasse.

---

# 50. Beispiel Krieger Level 30

Mögliche Richtungen:

### Tank

### DPS

### Hybrid

Die Spezialisierung kann neue Kernfähigkeiten oder passive Effekte freischalten.

---

# 51. Bedeutung der Level-30-Entscheidung

Die Entscheidung soll nicht bloß bedeuten:

> „+5 % Tanking.“

Sie soll die Spielweise erkennbar verändern.

Der Spieler soll danach sagen können:

> „Ich habe meinen Paladin als Heiler aufgebaut.“

---

# 52. Build-System

Ein Build besteht aus mehreren Ebenen:

```text
Klasse
 ↓
Talentpunkte
 ↓
Level-30-Spezialisierung
 ↓
Ausrüstung
 ↓
Fressboni
 ↓
Bossfähigkeiten
 ↓
Klassenfähigkeiten
 ↓
persönlicher Spielstil
```

Damit entsteht die tatsächliche Identität des Charakters.

---

# 53. Fressboni als Build-Komponente

Fressboni sind nicht unabhängig vom Klassenbuild.

Ein Spieler kann seinen Schleim beispielsweise auf:

> Geschwindigkeit + Biss

spezialisieren.

Ein anderer Spieler derselben Klasse:

> HP + Schutz.

Beide können dieselbe Klasse besitzen und sich trotzdem stark unterscheiden.

---

# 54. Beispiel: Zwei Schurken

## Schurke A – Speed/Biss

Farmt:

* Wölfe
* schnelle Kreaturen
* Bosse mit Bissfähigkeiten

Build:

> maximale Geschwindigkeit + Biss.

---

## Schurke B – Stealth/Burst

Farmt:

* Kreaturen mit Gespür
* Stealth-bezogene Bosse
* Schadenseigenschaften

Build:

> Stealth + Burst.

Beide sind Schurken.

Sie spielen sich aber unterschiedlich.

---

# 55. Beispiel: Zwei Paladine

## Paladin A

> Tank

Farmt:

* robuste Kreaturen
* HP
* Schutz
* Resistenz

---

## Paladin B

> Heiler

Farmt:

* Mana
* Heilung
* Unterstützungswerte

Dadurch kann derselbe Paladin-Klasse-Spieler völlig unterschiedliche Farmrouten verfolgen.

---

# 56. Kein kosmetisches Build-System

Die Entwicklung soll primär Gameplay-basiert sein.

Es gibt bewusst **keine Pflicht**, den Schleim optisch mit jeder gefressenen Kreatur zu verändern.

Keine:

> Wolfshörner für Wolfsfresser.

Keine:

> permanenten Flügel für gefressene Vögel.

Keine:

> permanente Tiertransformation als kosmetische Evolution.

Der Spieler erkennt seinen Build hauptsächlich über:

* Werte
* Fähigkeiten
* Talente
* Ausrüstung
* Spielweise

---

# 57. Build-Identität

Der Build soll trotzdem erzählbar sein.

Beispiel:

> „Mein Schleim ist ein Level-80-Schurke, der extrem schnell ist, Biss maximiert und fast ausschließlich Wolfsarten gefarmt hat.“

Das ist genau die Art von Spieleridentität, die SLIMORIA erzeugen soll.

---

# 58. Ausrüstung und Klasse

Ausrüstung unterstützt den Build.

Sie ersetzt aber nicht das Fresssystem.

Ein Spieler soll nicht ausschließlich durch Ausrüstung stark werden.

Seine Stärke entsteht aus:

> Klasse + Talente + Fressboni + Fähigkeiten + Ausrüstung + Spielerentscheidung.

---

# 59. Keine „beste“ Kreatur für alle Klassen

Ein wichtiger Designgrundsatz:

> **Es darf nicht eine einzige Kreatur geben, die für alle Klassen objektiv die beste Fressquelle ist.**

Stattdessen soll jede Klasse unterschiedliche Prioritäten besitzen.

---

# 60. Farmidentität

Dadurch entstehen Spielerprofile wie:

> „Der Wolf-Schurke.“

oder:

> „Der defensive Bären-Paladin.“

oder:

> „Der Mana-Priester.“

oder:

> „Der naturorientierte Druide.“

Diese Identität soll aus den tatsächlichen Entscheidungen des Spielers entstehen.

---

# 61. Klassenübergreifende Fähigkeiten

Bestimmte Fähigkeiten können für mehrere Klassen verfügbar sein.

Beispiel:

> Gespür

kann für:

* Priester
* Druide
* Schurke

relevant sein.

Andere Fähigkeiten können exklusiv sein.

Dadurch entstehen unterschiedliche Farmmärkte und Farmziele.

---

# 62. Exklusive Fähigkeiten

Klassenexklusive Fähigkeiten sind wichtig, um die Klassenidentität zu schützen.

Beispiele:

> Schurke → Schleichen
> bestimmte Paladin-Fähigkeit → nur Paladin
> bestimmte Priester-Heilfähigkeit → nur Priester

---

# 63. Keine Klassenvermischung

Ein Schurke kann nicht plötzlich alle Paladin-Fähigkeiten lernen.

Ein Priester wird nicht zum vollwertigen Krieger.

Die Klassen bleiben klar unterscheidbar.

Buildvielfalt bedeutet:

> **verschiedene Varianten innerhalb einer Klasse.**

Nicht:

> alle Klassen zu einer Klasse vermischen.

---

# 64. Respec

Das Talent-System sollte grundsätzlich eine Möglichkeit bieten, die Talentpunkte neu zu verteilen.

Die genaue Methode wird über das Spielsystem geregelt.

Eine mögliche Variante ist:

> Respec gegen Gold bei einem NPC.

Die Entscheidung soll relevant sein, aber keine permanente Fehlentscheidung darstellen.

---

# 65. Level 1–9

Vor Level 10 soll der Spieler die grundlegende Klassenidentität kennenlernen.

Der Spieler erhält:

* erste Klassenfähigkeiten
* grundlegende Ressource
* grundlegende Spielweise

Aber:

> **noch keine Talentpunkte.**

Dadurch bleibt der Einstieg übersichtlich.

---

# 66. Level 10

Level 10 ist ein wichtiger Meilenstein.

Der Spieler erhält:

> **Zugang zum Talent-System.**

Ab diesem Punkt beginnt die stärkere Individualisierung.

---

# 67. Level 30

Level 30 ist der zweite große Meilenstein.

Der Spieler trifft:

> **seine große Klassenspezialisierungsentscheidung.**

Ab diesem Zeitpunkt wird sein Build wesentlich eindeutiger.

---

# 68. Level 80

Level 80 repräsentiert die maximale Charakterentwicklung.

Der Spieler besitzt zu diesem Zeitpunkt:

* vollständig entwickelten Talentbaum
* Level-30-Spezialisierung
* zahlreiche Fressboni
* starke Fähigkeiten
* hochwertige Ausrüstung
* seinen individuellen Build

Level 80 bedeutet jedoch nicht:

> Jeder Level-80-Charakter ist identisch stark.

Die Builds können sich erheblich unterscheiden.

---

# 69. Klassenbalance über Fresssystem

Die Klassenbalance darf nicht ausschließlich über Skill-Schaden erfolgen.

Ein Teil der Balance entsteht durch:

> **unterschiedliche Fressaffinitäten.**

Wenn eine Kreatur einen extrem wertvollen Bonus besitzt, kann dieser Bonus für eine Klasse sehr stark und für eine andere Klasse deutlich schwächer sein.

Dadurch können verschiedene Klassen unterschiedliche Farmwege haben, ohne dass jede Kreatur für alle Spieler gleich wertvoll sein muss.

---

# 70. Klassenbalance über Rollen

In Gruppen müssen Rollen sinnvoll verteilt werden.

### Tank

* Krieger
* Paladin

### Heiler

* Priester
* Paladin
* Druide

### DPS

* Krieger
* Paladin
* Mage
* Priester
* Schurke
* Druide

Die tatsächliche Stärke hängt vom Build ab.

---

# 71. Hybrid-Builds

Hybrid-Builds sind erlaubt.

Ein Paladin kann beispielsweise:

> 60 % Tank / 40 % Heal

spielen.

Ein Druide:

> 70 % DPS / 30 % Heal.

Aber ein Hybrid darf nicht automatisch in allen Bereichen genauso stark sein wie eine vollständig spezialisierte Klasse.

Das ist wichtig für die Rollenbalance.

---

# 72. Entscheidungsprinzip

Jede wichtige Buildentscheidung sollte einen Preis haben.

Beispiel:

> mehr Tanking → weniger offensive Stärke

oder:

> mehr Heilung → weniger Schaden

oder:

> maximale Geschwindigkeit → weniger defensive Investition

Dadurch entstehen echte Builds statt einer Kombination aller Vorteile.

---

# 73. Ziel des Talent-Systems

Das Talent-System soll nicht nur dafür sorgen, dass Zahlen steigen.

Es soll beantworten:

> **„Was für ein Schleim möchte ich sein?“**

Ein Spieler soll seinen Charakter anhand seiner Entscheidungen beschreiben können.

---

# 74. Beispiel einer kompletten Entwicklung

### Level 1

Schurke erstellt.

Grundlegende Nahkampffähigkeiten.

---

### Level 5

Er entdeckt, dass Wölfe gute Geschwindigkeitsboni geben.

---

### Level 10

Er beginnt, Talentpunkte in Geschwindigkeit und Biss zu investieren.

---

### Level 15

Er farmt gezielt Wolfsarten.

---

### Level 20

Sein Schleim ist bereits merklich schneller als andere Builds.

---

### Level 30

Er entscheidet sich für eine offensive Schurken-Spezialisierung.

---

### Level 40

Er findet einen Wolf-Boss.

---

### Level 50

Er farmt den Boss wiederholt.

---

### Level 60

Er erhält eine seltene Biss-Fähigkeit.

---

### Level 70

Sein Build konzentriert sich vollständig auf:

> Speed + Biss + Burst.

---

### Level 80

Er besitzt einen extrem spezialisierten Schurken.

Sein Charakter ist das Ergebnis von:

> Klasse → Talente → Fressentscheidungen → Bossfarming → Fähigkeiten → Ausrüstung.

---

# 75. Klassen-Design-Grundsatz

Die Klassen sollen nicht dafür sorgen, dass jeder Spieler denselben Schleim spielt.

Sie sollen dafür sorgen, dass **derselbe Grundcharakter – ein Schleim – auf sechs sehr unterschiedliche Arten gespielt werden kann.**

---

# 76. Zusammenfassung der sechs Klassen

| Klasse       | Hauptrolle           | Ressource      | Kernidentität                      |
| ------------ | -------------------- | -------------- | ---------------------------------- |
| **Krieger**  | Tank / DPS           | Wut            | Stärke, Nahkampf, Widerstand       |
| **Paladin**  | Tank / Heal / Hybrid | Mana           | Schutz, Heiligkeit, Unterstützung  |
| **Mage**     | DPS                  | Mana           | Magie, Reichweite, Flächenschaden  |
| **Priester** | Heal / DPS           | Mana           | Heilung, Unterstützung, Magie      |
| **Schurke**  | DPS                  | Stealth-Punkte | Geschwindigkeit, Stealth, Burst    |
| **Druide**   | DPS / Heal / Hybrid  | Mana           | Natur, Flexibilität, Unterstützung |

---

# 77. Endgültiger Design-Grundsatz

Das Klassensystem von SLIMORIA soll drei Ebenen miteinander verbinden:

### **Klasse**

> Wie kämpfe ich grundsätzlich?

### **Talent/Spezialisierung**

> Welche Rolle und Spielweise entwickle ich?

### **Fressen**

> Welche Eigenschaften möchte ich meinem Schleim dauerhaft geben?

Daraus entsteht:

> **Nicht nur eine Klasse, sondern ein individueller Schleim-Build.**

---

## Kernformel

**Klasse → Talente → Spezialisierung → Fressziele → Bossfähigkeiten → Ausrüstung → individueller Build**

Das ist die vollständige Grundlage für **GDD 03 – Classes, Talents & Builds**.
