# SLIMORIA — GDD 02: Combat & Abilities

**Dokumentstatus:** Final
**Version:** 1.0
**Priorität:** Hoch
**Scope:** Kampfsystem, Ressourcen, Fähigkeiten, Angriffe, Fähigkeitenleiste, Zielsystem, Rollen und grundlegende Kampfregeln.

> **Wichtig:** Dieses Dokument beschreibt das Kampfsystem. Es verändert nicht die bereits festgelegten Grundprinzipien des Schleims aus GDD 01.

---

# 1. Grundidee des Kampfsystems

SLIMORIA verwendet ein **klassisches MMORPG-Kampfsystem**, dessen Bedienung sich stark an modernen MMORPGs wie WoW orientiert.

Der Unterschied:

> **Der Spieler steuert keinen humanoiden Charakter, sondern einen Schleim.**

Der Kampf muss deshalb die klassische MMO-Lesbarkeit behalten, während sich sämtliche Angriffe und Fähigkeiten um den Schleimkörper herum abspielen.

Der Spieler soll gleichzeitig das Gefühl haben:

* einen echten MMO-Charakter zu spielen
* seinen Schleim direkt in den Kampf zu schicken
* durch Fressen und Fähigkeiten einen einzigartigen Build zu entwickeln

---

# 2. Grundlegender Combat Loop

Der normale Kampfablauf:

```text
Gegner auswählen
      ↓
Schleim bewegt sich zum Gegner
      ↓
Angriffsreichweite erreichen
      ↓
Auto-Angriff beginnt
      ↓
Fähigkeiten einsetzen
      ↓
Gegner verliert HP
      ↓
Spieler reagiert auf Gegner
      ↓
Gegner wird besiegt
      ↓
Töten ODER Fressen
```

Der Kampf und das Fressen sind daher miteinander verbunden, aber nicht dasselbe System.

---

# 3. Gegner auswählen

Der Spieler kann einen Gegner direkt anklicken.

Das Ziel wird anschließend als aktuelles Ziel des Schleims gesetzt.

Die UI muss eindeutig zeigen:

* Name
* Level
* HP
* gegebenenfalls weitere grundlegende Informationen

Der Spieler muss jederzeit erkennen können:

> **„Welchen Gegner greife ich gerade an?“**

---

# 4. Rechtsklick-Kampf

Das wichtigste direkte Kampfsystem:

> **Rechtsklick auf einen Gegner.**

Daraufhin:

1. Gegner wird ausgewählt.
2. Schleim bewegt sich automatisch auf ihn zu.
3. Sobald er in Angriffsreichweite ist, beginnt der Angriff.
4. Der Schleim greift automatisch weiter an.
5. Der Spieler kann währenddessen Fähigkeiten benutzen.

Das Verhalten orientiert sich bewusst an klassischen MMORPGs.

---

# 5. Auto-Angriff

Der Auto-Angriff ist der grundlegende normale Angriff jeder Klasse.

Er läuft automatisch weiter, solange:

* ein gültiges Ziel vorhanden ist
* der Spieler in Reichweite ist
* der Charakter nicht handlungsunfähig ist
* das Ziel lebt

Der Spieler muss nicht für jeden normalen Angriff erneut klicken.

---

# 6. Schleim-spezifische Auto-Angriffe

Die Angriffe sollen sich nicht wie menschliche Waffenanimationen anfühlen.

Der Schleim besitzt beispielsweise:

* Biss
* Körperstoß
* Masseangriff
* magische Schleimattacken
* klassenabhängige Varianten

Die konkrete Angriffsausführung hängt von der Klasse ab.

---

# 7. Beispiel: Biss

Ein Schleim kann den Gegner mit seiner Masse erreichen und einen **Biss** ausführen.

Der Mund kann sich dabei sichtbar verformen.

Beispiel:

```text
Normaler Blob
     ↓
Mund öffnet sich
     ↓
Körper zieht sich zum Gegner
     ↓
Biss
     ↓
Schleim federt zurück
```

Der Angriff soll körperlich wirken.

---

# 8. Auto-Angriff und Fressen

Der normale Angriff darf **nicht automatisch zum Fressversuch werden**.

Das sind zwei getrennte Aktionen.

### Auto-Angriff

> Schaden verursachen.

### Fressen

> Gegner verschlingen.

Der Spieler entscheidet selbst, wann er fressen möchte.

---

# 9. Fressen während des Kampfes

Der Spieler kann während des Kampfes einen Fressversuch auslösen.

Der Fressversuch nutzt die in GDD 01 definierten Regeln.

Dadurch entsteht:

> **Kampf → Gegner schwächen → Fressversuch**

Der Spieler kann den Gegner aber auch einfach töten.

---

# 10. Fähigkeiten

Jede Klasse verfügt über eigene Fähigkeiten.

Zusätzlich können bestimmte Fähigkeiten durch:

* Bosse
* Kreaturen
* Klassenlehrer
* andere definierte Quellen

erhalten werden.

Die Fähigkeitssystematik muss daher zwischen verschiedenen Quellen unterscheiden können.

---

# 11. Grundregel für Fähigkeiten

Eine Fähigkeit ist eine **aktive oder passive Gameplay-Funktion**, die der Spieler über sein Charakter-/Fähigkeitssystem besitzt.

Aktive Fähigkeiten können auf die Hotbar gelegt werden.

Passive Eigenschaften müssen nicht auf der Hotbar liegen.

---

# 12. Hotbar

Der Spieler besitzt eine klassische Hotbar.

Standardmäßig:

> **10 Slots**

mit Hotkeys:

**1–10**

Die Hotbar ist **keine reine Skillbar**.

Sie ist eine allgemeine Aktionsleiste.

Auf ihr können liegen:

* aktive Fähigkeiten
* Tränke
* Fressaktion
* Mount
* andere aktivierbare Aktionen

---

# 13. Passive Fähigkeiten

Passive Fähigkeiten müssen nicht auf der Hotbar liegen.

Beispielsweise:

> +5 % Bewegungsgeschwindigkeit

oder:

> erhöhte Wirkung bestimmter Fressboni

laufen automatisch.

Die Hotbar soll nicht mit passiven Effekten überladen werden.

---

# 14. Fressen als Hotbar-Aktion

Die Fressaktion besitzt einen eigenen Hotkey.

Als Beispiel:

> **E**

Der genaue Key ist noch anpassbar, das Grundprinzip ist jedoch fest:

> **Fressen muss jederzeit schnell erreichbar sein.**

Der Spieler soll nicht erst ein Menü öffnen müssen.

Die Fresstaste ist ausschließlich dem Fressen vorbehalten und wird nicht mit der Weltinteraktion geteilt.

Weltinteraktion liegt auf einer eigenen Taste (Vorschlag: **F**) — siehe **GDD 10 – UI, UX & Controls** §18.

---

# 15. Fähigkeiten ausrüsten

Aktive Fähigkeiten werden aus dem Fähigkeiten-/Charaktermenü auf die Hotbar gezogen.

Beispiel:

```text
1 = Biss
2 = Schleimstoß
3 = Heilfähigkeit
4 = Sprint
5 = Trank
6 = Fressen
...
```

Der Spieler kann seine Hotbar seinem Build entsprechend anpassen.

---

# 16. Klassen

SLIMORIA besitzt sechs Klassen:

1. **Krieger**
2. **Paladin**
3. **Mage**
4. **Priester**
5. **Schurke**
6. **Druide**

Die Klassen unterscheiden sich nicht nur durch ihre Fähigkeiten, sondern durch ihre gesamte Kampfausrichtung.

---

# 17. Krieger

Der Krieger ist auf:

* Nahkampf
* Schaden
* Widerstandsfähigkeit
* Tanking

ausgelegt.

Seine Fähigkeiten sollen direkten, physischen Schleimkampf unterstützen.

Der Krieger verwendet **Wut** anstelle von Mana.

---

# 18. Wut

Wut funktioniert grundsätzlich anders als Mana.

Wut wird während des Kampfes aufgebaut.

Beispielsweise durch:

* normale Treffer
* erhaltene Treffer
* bestimmte Fähigkeiten

Der Spieler baut dadurch Ressourcen auf und verwendet sie für stärkere Fähigkeiten.

Wut ist keine statische Ressource, die sich einfach wie Mana regeneriert.

---

# 19. Paladin

Der Paladin ist eine defensive/heilige Klasse.

Grundsätzlich kann er:

* tanken
* Schaden verursachen
* heilen

Der Spieler soll sich später stärker in eine bestimmte Richtung entwickeln können.

Der Paladin kann dadurch beispielsweise:

> Tank-Paladin

oder

> Heiler-Paladin

werden.

---

# 20. Paladin-Ressource

Der Paladin verwendet grundsätzlich:

> **Mana**

für seine entsprechenden Fähigkeiten.

Die konkrete Ressourcennutzung einzelner Fähigkeiten wird später anhand der jeweiligen Skillsets definiert.

---

# 21. Mage

Der Mage ist primär:

* Fernkampf
* magischer Schaden
* Flächenschaden
* Kontrolle

Er verwendet:

> **Mana**

Seine Fähigkeiten müssen klar vermitteln, dass der Schleim Magie verwendet, ohne den Schleimkörper durch permanente Transformationen zu verändern.

---

# 22. Priester

Der Priester ist primär:

> **Heiler.**

Er kann später zusätzlich eine DPS-Ausrichtung entwickeln.

Sein Hauptfokus liegt jedoch auf:

* Heilung
* Unterstützung
* defensive Magie
* Fernkampf

Der Priester soll **sehr wenige bis keine klassischen Nahkampffähigkeiten** besitzen.

---

# 23. Schurke

Der Schurke ist die schnelle Nahkampfklasse.

Schwerpunkte:

* Geschwindigkeit
* hoher Schaden
* Burst
* Schleichen
* Positionierung

Der Schurke soll sich deutlich schneller und aggressiver anfühlen als beispielsweise ein Paladin.

---

# 24. Schurken-Ressource

Der Schurke verwendet:

> **Stealth-Punkte**

anstelle von Mana.

Diese Ressourcen entstehen beispielsweise durch:

* nichts tun
* versteckt sein
* bestimmte Stealth-Fähigkeiten

und können für bestimmte Fähigkeiten verwendet werden.

Die Ressource soll den Schurken dazu motivieren, bewusst zwischen:

> vorbereiten → zuschlagen → zurückziehen → vorbereiten

zu wechseln.

---

# 25. Druide

Der Druide ist eine flexible Klasse.

Seine Schwerpunkte können sein:

* Fernkampf
* Heilung
* Naturmagie
* Unterstützung

Zusätzlich kann der Druide durch bestimmte Lehrer/Fähigkeiten besondere Formen bzw. tierbezogene Fähigkeiten erlernen.

Diese Transformationen sind **Fähigkeitsmechaniken**, keine permanente kosmetische Veränderung des Schleims.

---

# 26. Klassenidentität

Alle Klassen beginnen grundsätzlich mit einer relativ vergleichbaren Grundlage.

Die großen Unterschiede entstehen mit zunehmendem Fortschritt.

Der Spieler soll nicht bereits in den ersten Minuten das gesamte Klassensystem kennenlernen.

Neue Fähigkeiten und Spezialisierungen werden nach und nach freigeschaltet.

---

# 27. Ressourcenübersicht

| Klasse   | Hauptressource |
| -------- | -------------- |
| Krieger  | Wut            |
| Paladin  | Mana           |
| Mage     | Mana           |
| Priester | Mana           |
| Schurke  | Stealth-Punkte |
| Druide   | Mana           |

Es werden keine unnötigen zusätzlichen Ressourcen eingeführt.

---

# 28. Mana

Mana ist eine klassische Ressource.

Viele Fähigkeiten benötigen Mana.

Mana:

* wird verbraucht
* regeneriert sich
* begrenzt die Nutzung mächtiger Fähigkeiten

Dadurch muss der Spieler seine Fähigkeiten bewusst einsetzen.

---

# 29. Tränke

Es existieren klassische Tränke.

Grundtypen:

* Heiltrank
* Mana-Trank
* Speed-Trank

Tränke können auf der Hotbar liegen.

---

# 30. Fähigkeitenkosten

Jede aktive Fähigkeit kann beispielsweise Kosten besitzen:

> Mana
> Wut
> Stealth-Punkte

Zusätzlich können Fähigkeiten Cooldowns besitzen.

Damit entsteht ein klassisches MMO-Ressourcenmanagement.

---

# 31. Cooldowns

Starke Fähigkeiten können Cooldowns besitzen.

Ein Cooldown verhindert, dass eine mächtige Fähigkeit permanent eingesetzt wird.

Die UI muss den Spieler klar darüber informieren:

> Wann kann die Fähigkeit wieder verwendet werden?

---

# 32. Globale Lesbarkeit

Während eines Kampfes muss der Spieler schnell erkennen können:

* eigenes HP
* eigene Ressource
* Ziel-HP
* Distanz
* aktive Fähigkeiten
* Cooldowns
* relevante Debuffs/Buffs

Das Kampfsystem soll niemals durch unnötige Effekte unlesbar werden.

---

# 33. Gegnerangriffe

Gegner besitzen normale Angriffe.

Sie greifen den Schleim aktiv an, wenn dieser ihr Ziel ist.

Gegner können außerdem einfache Fähigkeiten besitzen.

Für den grundlegenden Gegnerbereich gilt:

> Gegnerfähigkeiten sollen zunächst relativ einfach bleiben.

---

# 34. Gegner-Debuffs

Gegner können den Spieler beispielsweise mit einem einfachen Debuff belegen.

Beispiel:

> **-Bewegungsgeschwindigkeit für 10 Sekunden**

Debuffs sollen den Schleim beeinflussen können.

Es soll zunächst aber keine große Anzahl komplexer Crowd-Control-Mechaniken geben.

---

# 35. Kein überladenes Crowd Control

Im grundlegenden Kampfsystem werden zunächst keine extrem komplexen Systeme benötigt wie:

* permanente Stuns
* komplexe Kontrollketten
* zufällige Spielerbewegungen
* viele verschiedene Kontrollarten gleichzeitig

Der Fokus bleibt:

> **Bewegen → Kämpfen → Fähigkeiten → Fressen.**

---

# 36. Nahkampf

Nahkampffähigkeiten benötigen eine entsprechende Distanz.

Der Schleim muss sich innerhalb der Fähigkeitensreichweite befinden.

Wenn der Spieler beispielsweise einen Nahkampfangriff aktiviert und außerhalb der Reichweite steht, soll der Charakter entsprechend zum Ziel navigieren können, sofern die Fähigkeit dies erlaubt.

---

# 37. Fernkampf

Fernkampffähigkeiten können aus größerer Distanz eingesetzt werden.

Besonders relevant für:

* Mage
* Priester
* Druide

Der Schleim muss nicht direkt am Gegner stehen.

---

# 38. Flächenschaden

Bestimmte Fähigkeiten können mehrere Gegner gleichzeitig treffen.

Beispielsweise:

> Schleim springt/expandiert → Masse schlägt auf den Boden → Gegner in Radius erhalten Schaden.

Solche Fähigkeiten sollen wiederum visuell schleimtypisch umgesetzt werden.

---

# 39. Schleim-spezifische Fähigkeiten

Auch klassische MMO-Fähigkeiten sollen möglichst durch die Schleimform interpretiert werden.

Beispiel:

### Klassischer Sprint

Nicht:

> Schleim bekommt plötzlich menschliche Beine.

Sondern:

> Schleim zieht sich zusammen → katapultiert seine Masse nach vorne → hohe Geschwindigkeit.

---

# 40. Bewegungsfähigkeit

Eine Bewegungsskill kann die Schleimform stark verändern.

Beispielsweise:

> Schleim komprimiert sich → wird extrem elastisch → schnellt nach vorne.

Das verbindet Combat und das wichtigste visuelle Merkmal des Spiels.

---

# 41. Heilung

Heilfähigkeiten können ebenfalls schleimtypisch aussehen.

Beispielsweise:

> Schleimoberfläche beginnt zu leuchten → Körper zieht sich zusammen → Masse stabilisiert sich.

Die Heilung soll nicht einfach ein menschliches Zauberhandzeichen imitieren.

---

# 42. Defensive Fähigkeiten

Defensive Fähigkeiten können beispielsweise:

* Schaden reduzieren
* Schilde erzeugen
* Resistenz erhöhen
* temporäre Unverwundbarkeit ermöglichen

Sie werden visuell über den Schleim dargestellt.

Ein Schild kann beispielsweise wie eine verdichtete Schleimschicht wirken.

---

# 43. Aggro und Tanking

Tankklassen benötigen ein klassisches Aggro-/Threat-System.

Ein Gegner soll erkennen:

> Welcher Spieler ist aktuell sein primäres Ziel?

Tankklassen wie:

* Krieger
* Paladin

sollen Fähigkeiten besitzen, mit denen sie Aggro aufbauen und Gegner kontrollieren.

---

# 44. Heilungsrollen

Heiler sollen Spieler gezielt auswählen und heilen können.

Primär:

> Priester

Sekundär:

> Paladin

Druide kann ebenfalls eine unterstützende/heilende Ausrichtung erhalten.

---

# 45. DPS-Rollen

DPS können grundsätzlich sein:

* Krieger
* Paladin
* Mage
* Priester
* Schurke
* Druide

Die Stärke und Art des DPS unterscheiden sich.

Nicht jede Klasse muss ausschließlich eine Rolle erfüllen.

---

# 46. Rollen sind Build-abhängig

Die Klasse bestimmt die grundlegende Identität.

Der Build bestimmt die konkrete Ausrichtung.

Beispiel:

**Paladin**

> Tank
> Heiler
> Hybrid

**Priester**

> Heiler
> später DPS

**Druide**

> Fernkampf
> Heilung
> Hybrid

---

# 47. Talente

Ab **Level 10** erhält der Spieler pro Level einen Talentpunkt.

Diese Punkte werden in einem Talentbaum eingesetzt.

Talente verändern die Spielweise.

Beispiele:

> stärkere Angriffe
> geringere Mana-Kosten
> stärkere Heilung
> verbesserte Verteidigung
> verbesserte Geschwindigkeit

---

# 48. Level-30-Spezialisierung

Ab **Level 30** trifft jede Klasse eine bedeutendere Spezialisierungsentscheidung.

Beispiel Paladin:

### Tank

stärker defensiv, kein Fokus auf Heilung.

### Heiler

stärker heilungsorientiert, weniger Tank-Fokus.

### Hybrid

ausgewogene Mischung.

Jede Klasse erhält eine solche wichtige Entscheidung.

---

# 49. Spezialisierung verändert Fähigkeiten

Die Level-30-Entscheidung kann:

* neue Fähigkeiten freischalten
* bestehende Fähigkeiten verändern
* passive Boni geben
* die Rolle definieren

Sie soll eine echte Buildentscheidung darstellen.

---

# 50. Klassenlehrer

Bestimmte Fähigkeiten können über Klassenlehrer erlernt werden.

Diese Lehrer sind bewusst mit der Welt verbunden.

Beispiel:

> Ein Druidenlehrer bringt eine bestimmte Fähigkeit bei.

Oder:

> Ein Schurkenlehrer bringt Schleichen bei.

---

# 51. Lehrer ersetzen nicht Boss-Drops

Ein Klassenlehrer soll **nicht alle wichtigen Fähigkeiten verschenken**.

Bestimmte Fähigkeiten bleiben an Kreaturen und Bosse gekoppelt.

Die Grundregel:

> **Lehrer vermitteln bestimmte Fähigkeiten. Bosse können besondere Fähigkeiten liefern.**

Dadurch bleiben Bosskämpfe und Bossfarming wichtig.

---

# 52. Boss-Fähigkeiten

Bosse können besondere Fähigkeiten liefern.

Beispiel:

> Wolf-Boss → besonderer Biss

Die Fähigkeit kann klassenspezifisch sein.

Dadurch entsteht:

> Klasse → gewünschter Build → gewünschte Fähigkeit → bestimmter Boss → Farmziel.

---

# 53. Klassenabhängige Fähigkeiten

Eine Fähigkeit kann ausschließlich für bestimmte Klassen verfügbar sein.

Beispiel:

> Biss → Schurke

Andere:

> Gespür → Priester / Druide / Schurke

Damit soll verhindert werden, dass alle Spieler automatisch exakt dieselben Fähigkeiten farmen.

---

# 54. Ability-Ränge

Bossfähigkeiten können unterschiedliche Qualitätsstufen besitzen:

| Rang      | Farbe |
| --------- | ----- |
| Common    | Grau  |
| Uncommon  | Grün  |
| Rare      | Blau  |
| Epic      | Lila  |
| Legendary | Gold  |
| Mythic    | Rot   |

Die höhere Stufe bedeutet eine stärkere Version der Fähigkeit.

---

# 55. Fähigkeit als langfristige Progression

Eine Fähigkeit ist nicht zwingend nach dem ersten Erhalt „fertig“.

Beispiel:

```text
Common Biss
   ↓
mehr Biss-Fortschritt
   ↓
Uncommon Biss
   ↓
Rare Biss
   ↓
Epic Biss
   ↓
Legendary Biss
   ↓
Mythic Biss
```

Dadurch kann ein Spieler sehr lange an einer bestimmten Fähigkeit arbeiten.

---

# 56. Klassen- und Kreaturen-Synergie

Die Kombination aus:

* Klasse
* Kreatur
* Fressbonus
* Fähigkeit
* Talentbaum
* Ausrüstung

soll unterschiedliche Builds ermöglichen.

Beispiel:

### Schneller Schurke

> Wölfe fressen → Speed → Biss → Stealth → Geschwindigkeit

### Defensiver Paladin

> robuste Kreaturen → HP/Schutz → Tank-Talente → defensive Fähigkeiten

### Heiler-Priester

> passende Kreaturen → Mana/Heilungswerte → Heil-Talente → Boss-Heilfähigkeiten

---

# 57. Keine vorgeschriebene perfekte Rotation

Das Spiel soll nicht ausschließlich darauf hinauslaufen:

> „Drücke exakt Fähigkeit 1 → 4 → 2 → 6.“

Fähigkeiten sollen Entscheidungen erzeugen.

Beispielsweise:

> Gegner schwächen → Fresschance prüfen → Fressen oder weiterkämpfen?

oder:

> Mana sparen oder starke Fähigkeit sofort verwenden?

---

# 58. Combat + Fressen

Das wichtigste Alleinstellungsmerkmal bleibt:

> **Der Kampf ist häufig die Vorbereitung auf das Fressen.**

Das unterscheidet SLIMORIA von klassischen MMORPGs.

In einem normalen MMORPG:

> Gegner töten → Loot.

In SLIMORIA:

> Gegner bekämpfen → Entscheidung: töten oder verschlingen?

---

# 59. Kampf gegen deutlich stärkere Gegner

Wenn ein Gegner deutlich stärker ist:

* Fresschance kann 0 % sein
* der Gegner verursacht erheblich mehr Schaden
* der Spieler muss gegebenenfalls fliehen
* ein Kampf kann tödlich enden

Der Spieler soll nicht durch einen einfachen Trick riesige Mengen Level erhalten können.

---

# 60. Levelunterschied im Kampf

Ein Unterschied von **6–7 Leveln** soll bereits spürbar sein.

Ein höherleveliger Charakter hat gegenüber einem deutlich niedrigeren Gegner einen merkbaren Vorteil bei:

* HP
* Schaden
* Überlebensfähigkeit
* allgemeinen Kampfwerten

Das gilt auch für PvP.

---

# 61. PvP

Spieler können gegeneinander kämpfen.

Es gibt jedoch:

> **kein Fressen anderer Spieler.**

PvP endet klassisch mit:

> Kampf bis zum Tod.

Der Spieler kann einen anderen Spieler nicht als Fressziel verwenden.

---

# 62. PvP und Level

Ein höherer Level soll einen deutlichen Vorteil geben.

Ein Spieler mit beispielsweise 6–7 Leveln Vorsprung soll:

> klar stärker sein.

Aber das bedeutet nicht automatisch:

> 100 % garantierter Sieg in jeder Situation.

Build, Fähigkeiten und Spielerqualität bleiben relevant.

---

# 63. Combat Readability

Das Kampfsystem muss visuell eindeutig bleiben.

Der Spieler muss erkennen:

> Wer greift an?
> Wer wird getroffen?
> Wie viel HP bleiben?
> Welche Fähigkeit ist bereit?
> Welche Ressource habe ich?
> Wann kann ich fressen?
> Welches Ziel habe ich?

---

# 64. Animation vor Komplexität

Für jede Fähigkeit gilt:

> **Eine einfache, sehr gute Animation ist besser als zehn komplexe, unlesbare Effekte.**

Besonders bei Schleimfähigkeiten muss die Animation die Körperform nutzen.

---

# 65. Ziel des Kampfsystems

Das Kampfsystem soll sich anfühlen wie:

> **ein zugängliches, klassisches MMORPG-Kampfsystem, das durch die einzigartige Körperlichkeit des Schleims und das Fresssystem eine eigene Identität bekommt.**

Es soll nicht versuchen, ein komplett neues Action-Combat-System zu sein.

Die Innovation von SLIMORIA liegt primär in:

> **Schleim + Fressen + Evolution + Klassen + MMORPG.**

---

# 66. Combat-Design-Prioritäten

### Priorität 1

**Lesbarkeit**

Der Spieler muss verstehen, was passiert.

### Priorität 2

**Responsiveness**

Fähigkeiten müssen schnell und zuverlässig reagieren.

### Priorität 3

**Schleim-Identität**

Angriffe sollen sich nach Schleim anfühlen.

### Priorität 4

**Build-Vielfalt**

Klassen, Talente und Fressboni sollen unterschiedliche Builds ermöglichen.

### Priorität 5

**MMORPG-Tiefe**

Ressourcen, Rollen, Cooldowns, Aggro und Gruppenplay sollen langfristig funktionieren.

---

# 67. Beispiel eines vollständigen Kampfes

Ein Schurke Level 15 entdeckt einen Level-14-Wolf.

### Schritt 1

Rechtsklick auf Wolf.

Der Schleim bewegt sich automatisch hin.

### Schritt 2

Der Schleim erreicht Nahkampfreichweite.

Auto-Angriff beginnt.

### Schritt 3

Der Spieler nutzt seine Schurkenfähigkeiten.

Stealth-Punkte werden eingesetzt.

### Schritt 4

Der Wolf verliert HP.

### Schritt 5

Der Spieler wartet, bis der Wolf stark geschwächt ist.

### Schritt 6

Der Spieler aktiviert **Fressen**.

### Schritt 7

Der Schleim schnellt auf den Wolf zu.

### Schritt 8

Der Schleim umschließt den Wolf.

### Schritt 9

Der Wolf wird absorbiert.

### Schritt 10

Der Spieler erhält:

* XP
* Fressbonus
* eventuell weitere Eigenschaften

### Ergebnis

Der Spieler hat nicht einfach einen Wolf getötet.

Er hat:

> **seinen Schleim weiterentwickelt.**

---

# 68. Beispiel eines Bosskampfes

Ein Schurke trifft auf einen Wolf-Boss.

Der Boss ist deutlich stärker.

Der Spieler muss:

> kämpfen → ausweichen/positionieren → Fähigkeiten verwenden → Boss schwächen.

Der Fressversuch ist erst sinnvoll, wenn die Chance ausreichend hoch ist.

Der Spieler entscheidet:

> „Jetzt fressen oder noch weiter schwächen?“

Bei Erfolg:

> Boss wird verschlungen.

Danach besteht die Chance auf:

> besondere Biss-/Gespür-Fähigkeit.

Damit wird der Boss zu einem langfristigen Farmziel.

---

# 69. Endgültige Designformel

Das Kampfsystem von SLIMORIA lässt sich auf diese Formel reduzieren:

> **Target → Approach → Attack → Ability → Weaken → Decide → Consume or Kill.**

Und die langfristige Ebene:

> **Combat → Fressen → Eigenschaften → Build → stärkere Gegner → Boss → stärkere Fähigkeiten → neuer Build.**

---

# 70. Finaler Design-Grundsatz

Das Kampfsystem darf niemals vergessen, **warum SLIMORIA kein gewöhnliches MMORPG ist**.

Der Spieler soll nicht denken:

> „Ich spiele einen Krieger mit einer blauen Skin.“

Sondern:

> **„Ich bin ein Schleim, der gelernt hat, wie man kämpft.“**

Und wenn der Spieler später einen Boss verschlingt und dessen Fähigkeit erhält, soll sich das wie die logische Weiterentwicklung seines Schleims anfühlen:

> **Kämpfen → Überleben → Verschlingen → Lernen → stärker werden.**
