# SLIMORIA — GDD 05: Equipment, Inventory & Itemization

**Dokumentstatus:** Final
**Version:** 1.0
**Priorität:** Hoch
**Scope:** Ausrüstung, Ausrüstungsslots, Itemwerte, Seltenheiten, Inventar, Tränke, Gold, Beute und Ausrüstungsprogression.

---

# 1. Grundidee

Ausrüstung ist ein wichtiger Bestandteil der Charakterentwicklung, soll aber **nicht das eigentliche Herzstück von SLIMORIA ersetzen**.

Die Stärke eines Schleims entsteht aus mehreren Systemen:

> **Level + Klasse + Talente + Fressboni + Fähigkeiten + Ausrüstung**

Ausrüstung unterstützt und verstärkt einen Build.

Sie definiert ihn jedoch nicht vollständig.

---

# 2. Grundprinzip der Ausrüstung

Der Spieler soll bei einem Gegenstand möglichst sofort verstehen:

> **„Das ist für meine HP und meinen Schutz.“**

oder:

> **„Das ist für meinen Schaden.“**

Daher verwendet SLIMORIA bewusst **klassische und verständliche Ausrüstungsbegriffe**.

Keine unnötig abstrakten Namen für grundlegende Ausrüstungswerte.

---

# 3. Ausrüstungstypen

Die Ausrüstung wird grundsätzlich in verständliche Kategorien aufgeteilt:

* Waffen
* Rüstung
* weitere Ausrüstungsteile

Die genaue Anzahl der Slots wird im UI-System festgelegt, das Grundprinzip bleibt jedoch klassisch.

---

# 4. Waffen

Waffen erhöhen primär offensive Werte.

Beispiele:

* Schaden
* Angriffskraft
* magische Stärke
* weitere offensive Eigenschaften

Die Waffe soll auf einen Blick vermitteln:

> **„Damit mache ich mehr Schaden.“**

---

# 5. Rüstung

Rüstung konzentriert sich primär auf defensive Werte.

Beispiele:

* HP
* Schutz
* Resistenz
* weitere defensive Eigenschaften

Die Rüstung soll eindeutig vermitteln:

> **„Damit überlebe ich länger.“**

---

# 6. Keine optische Rüstung am Schleim

Die Ausrüstung muss nicht zwingend den Schleim optisch verändern.

Der Schleim bleibt visuell der zentrale Charakter.

Daher soll Ausrüstung primär über:

* Werte
* Icons
* Namen
* UI
* Itembeschreibung

funktionieren.

Das verhindert, dass der Schleim durch immer mehr Ausrüstung seine klare visuelle Identität verliert.

---

# 7. Itemnamen

Itemnamen müssen verständlich sein.

Beispiele:

> Eisenklinge
> Schwerer Eisenschild
> Robuste Lederpanzerung
> Stiefel der Geschwindigkeit

Der Spieler soll nicht erst eine komplizierte Beschreibung lesen müssen, um die grundlegende Funktion zu verstehen.

---

# 8. Itemwerte

Items können unterschiedliche Werte besitzen.

### Offensive Werte

* Schaden
* Angriffskraft
* magische Stärke
* Geschwindigkeit

### Defensive Werte

* HP
* Schutz
* Resistenz

### Unterstützende Werte

* Mana
* Mana-Regeneration
* Heilungswerte

Die genaue Stat-Verteilung hängt von Itemtyp und Klasse ab.

---

# 9. Klassenspezifische Ausrüstung

Bestimmte Gegenstände können für bestimmte Klassen gedacht sein.

Beispiel:

> Paladin-Rüstung
> Mage-Stab
> Schurkenklinge

Dadurch kann Loot gezielter für verschiedene Spieler interessant werden.

---

# 10. Klassenanforderungen

Ein Gegenstand kann eine Klasse voraussetzen.

Beispiel:

> **Heiliger Schild**
> Benötigt: Paladin

oder:

> **Assassinenklinge**
> Benötigt: Schurke

Dadurch kann nicht jede Klasse jeden Gegenstand optimal verwenden.

---

# 11. Rollenbezogene Ausrüstung

Ausrüstung kann außerdem auf Rollen ausgelegt sein.

Beispiel:

### Tank

* HP
* Schutz
* Resistenz

### Heiler

* Mana
* Heilung
* Mana-Regeneration

### DPS

* Schaden
* Angriffskraft
* Geschwindigkeit

Dadurch können Spieler ihre Spezialisierung zusätzlich über Ausrüstung unterstützen.

---

# 12. Ausrüstung ersetzt keine Fressboni

Ein wichtiger Designgrundsatz:

> Ein Spieler soll nicht einfach durch bessere Ausrüstung sämtliche Fressboni bedeutungslos machen können.

Wenn ein Spieler auf Geschwindigkeit spezialisiert ist, soll diese Identität auch ohne perfekte Ausrüstung bestehen.

Ausrüstung verstärkt sie lediglich.

---

# 13. Beispiel

Ein Schurke hat durch Fressen:

> hohe Geschwindigkeit

und besitzt zusätzlich:

> schnelle Schurkenausrüstung.

Dadurch entsteht ein extrem schneller Build.

Ein anderer Schurke besitzt defensive Ausrüstung.

Er kann dieselben Fressboni besitzen, spielt sich aber etwas anders.

---

# 14. Item-Seltenheiten

Items können unterschiedliche Seltenheitsstufen besitzen.

Die Seltenheit bestimmt grundsätzlich:

* Qualität
* mögliche Stärke
* Wert
* Seltenheit des Drops

Das System orientiert sich an bekannten MMORPG-Strukturen.

---

# 15. Farbige Seltenheiten

Die Seltenheiten sollen visuell sofort erkennbar sein.

Grundprinzip:

| Seltenheit | Farbe |
| ---------- | ----- |
| Common     | Grau  |
| Uncommon   | Grün  |
| Rare       | Blau  |
| Epic       | Lila  |
| Legendary  | Gold  |
| Mythic     | Rot   |

Diese Farbstruktur entspricht ebenfalls dem bereits definierten Fähigkeitensystem.

---

# 16. Common

Common-Gegenstände sind:

* häufig
* einfach
* frühe Ausrüstung
* häufige Gegnerdrops

Sie bilden die Grundlage der Ausrüstungsprogression.

---

# 17. Uncommon

Uncommon-Gegenstände sind stärker und seltener.

Sie können:

* bessere Werte
* passendere Stat-Kombinationen

besitzen.

---

# 18. Rare

Rare-Gegenstände stellen einen deutlicheren Qualitätssprung dar.

Sie können besonders interessant für Builds werden.

---

# 19. Epic

Epic-Ausrüstung ist deutlich seltener.

Sie soll für stärkere Gegner, Quests und spätere Inhalte relevant werden.

---

# 20. Legendary

Legendary-Gegenstände sind sehr selten.

Sie sollen sich wie besondere Beute anfühlen.

Ein Spieler soll beispielsweise sagen können:

> „Ich habe dieses Legendary von diesem Boss bekommen.“

---

# 21. Mythic

Mythic ist die höchste reguläre Seltenheitsstufe.

Mythic-Gegenstände sollen extrem selten und besonders wertvoll sein.

Sie gehören zum langfristigen Endgame-Farming.

---

# 22. Itemquelle

Ausrüstung kann unter anderem erhalten werden durch:

* Gegner
* Bosse
* Quests
* Händler
* Schmiede
* besondere Inhalte

---

# 23. Gegnerdrops

Normale Gegner können Ausrüstung droppen.

Dabei soll nicht jeder Gegner ständig wertvolle Gegenstände fallen lassen.

Die meisten Drops sind gewöhnlicher.

---

# 24. Bossdrops

Bosse besitzen deutlich bessere Chancen auf hochwertige Ausrüstung.

Je stärker der Boss:

> desto interessanter können seine Drops sein.

Dadurch entsteht ein weiterer Grund, Bosse wiederholt zu bekämpfen.

---

# 25. Questbelohnungen

Quests können ebenfalls Ausrüstung geben.

Questbelohnungen sollen besonders für Spieler wichtig sein, die gerade in ein neues Gebiet kommen.

Beispiel:

> Der Spieler erledigt eine Questreihe und erhält eine neue Rüstung.

Damit fühlt sich die Questprogression auch spielerisch relevant an.

---

# 26. Gold

Gold ist die grundlegende Währung von SLIMORIA.

Gold kann unter anderem erhalten werden durch:

* Töten von Gegnern
* Quests
* seltene Drops
* Verkauf von Gegenständen
* weitere normale Spielaktivitäten

---

# 27. Töten vs. Fressen und Gold

Ein wichtiger Bestandteil des Spiels:

> **Ein Gegner, der gefressen wird, liefert nicht dieselbe Goldbelohnung wie ein getöteter Gegner.**

Dadurch entsteht ein bewusster Zielkonflikt.

Der Spieler entscheidet:

> „Will ich diese Kreatur für meinen Build fressen oder für Gold töten?“

---

# 28. Schmiede

Schmiede sind wichtige NPCs für Ausrüstung.

Der Spieler kann dort Ausrüstung gegen Gold erwerben.

Sie bieten insbesondere:

* grundlegende Ausrüstung
* Ausrüstung für verschiedene Levelbereiche
* eventuell klassenspezifische Gegenstände

---

# 29. Schmiede als sichere Alternative

Ein Spieler muss nicht ausschließlich auf Drops hoffen.

Wenn er Pech mit Gegnerdrops hat, kann er:

> Gold sammeln → zur Schmiede gehen → Ausrüstung kaufen.

Dadurch bleibt der Fortschritt kontrollierbar.

---

# 30. Ausrüstungsprogression

Die Ausrüstung entwickelt sich gemeinsam mit dem Level.

Ein Level-10-Spieler soll grundsätzlich Ausrüstung für seinen Levelbereich erhalten können.

Ein Level-60-Spieler erhält entsprechend stärkere Ausrüstung.

---

# 31. Levelanforderungen

Gegenstände können ein Mindestlevel besitzen.

Beispiel:

> Eisenklinge
> Benötigt Level 5

oder:

> Drachenrüstung
> Benötigt Level 60

Dadurch kann ein Spieler nicht beliebig früh hochwertige Ausrüstung verwenden.

---

# 32. Itemprogression

Ein typischer Ablauf:

```text
Startausrüstung
      ↓
erste Gegnerdrops
      ↓
Schmiede
      ↓
Questbelohnungen
      ↓
stärkere Gegner
      ↓
Dungeons/Bosse
      ↓
Epic
      ↓
Legendary
      ↓
Mythic
```

---

# 33. Inventar

Der Spieler besitzt ein klassisches Inventar.

Darin befinden sich:

* Ausrüstung
* Tränke
* Gegenstände
* Questgegenstände
* sonstige Items

---

# 34. Inventar und Ausrüstung getrennt

Das Inventar ist nicht dasselbe wie das Ausrüstungsfenster.

Der Spieler kann:

1. einen Gegenstand erhalten
2. ihn im Inventar sehen
3. ihn auswählen
4. ihn ausrüsten

---

# 35. Tränke

SLIMORIA besitzt ein klassisches Tränkensystem.

Es gibt insbesondere:

### Heiltränke

Stellen HP wieder her.

### Mana-Tränke

Stellen Mana wieder her.

### Geschwindigkeitstränke

Erhöhen für eine bestimmte Zeit die Bewegungsgeschwindigkeit.

---

# 36. Tränke und Hotbar

Tränke können auf die Hotbar gelegt werden.

Dadurch kann der Spieler beispielsweise:

> Taste 1–8 → Fähigkeiten
> Taste 9 → Heiltrank
> Taste 10 → Mana-Trank

verwenden.

Die genaue Belegung bleibt frei.

---

# 37. Keine separate Trankressource

Tränke sind normale Inventargegenstände.

Sie besitzen keine eigene Energie oder Ressource.

Der Spieler muss sie besitzen, um sie verwenden zu können.

---

# 38. Trankverbrauch

Ein verwendeter Trank wird aus dem Inventar entfernt.

Dadurch entsteht ein Verbrauchsgut-System.

---

# 39. Tränke als Vorbereitung

Spieler können sich vor schwierigen Inhalten vorbereiten.

Beispiel:

> Bosskampf → Heiltränke + Mana-Tränke + Geschwindigkeitstränke.

Damit bekommt das Inventar auch strategische Bedeutung.

---

# 40. Handel

Es gibt:

> **Spieler-zu-Spieler-Handel.**

Spieler können Gegenstände und Gold untereinander handeln.

---

# 41. Handelsprinzip

Der Handel soll direkt zwischen zwei Spielern erfolgen.

Ein Spieler öffnet einen Handelsvorgang mit einem anderen Spieler.

Beide sehen:

* angebotene Gegenstände
* Gold
* endgültiges Ergebnis

Der Handel wird erst abgeschlossen, wenn beide Seiten bestätigen.

---

# 42. Keine Auktionshaus-Abhängigkeit

Ein zentraler Bestandteil des geplanten Systems ist nicht ein automatisierter globaler Marktplatz, sondern:

> direkter Spielerhandel.

Damit entsteht eine stärker soziale Wirtschaft.

---

# 43. Wirtschaftliche Bedeutung von Fressen

Das Fresssystem beeinflusst die Wirtschaft indirekt.

Ein Spieler kann sich entscheiden:

> Kreatur töten → Gold

oder:

> Kreatur fressen → Fressfortschritt.

Dadurch besitzt die Entscheidung einen wirtschaftlichen Preis.

---

# 44. Beute und Entscheidungen

Loot soll nicht ausschließlich bedeuten:

> „Besseres Item = automatisch anlegen.“

Der Spieler soll prüfen:

* Passt es zu meiner Klasse?
* Passt es zu meiner Rolle?
* Passt es zu meinem Build?
* Kann ich es verkaufen?
* Kann ich es einem anderen Spieler geben?

---

# 45. Bestiarium

Das Bestiarium ist ein eigenes Fenster und **kein Teil des normalen Inventars**.

Es dokumentiert die Kreaturen der Welt.

Für jede Kreatur werden **zwei getrennte Zähler** geführt:

> Wolf
> Besiegt: 183 · Gefressen: 97
>
> Bär
> Besiegt: 42 · Gefressen: 11
>
> Wolf-Boss
> Besiegt: 17 · Gefressen: 9

Die Trennung ist wichtig, weil Töten und Fressen unterschiedliche Belohnungen liefern (siehe **GDD 01** §34).

---

# 46. Bestiarium und Progression

Das Bestiarium macht den Fortschritt beim Farmen sichtbar.

Ein Spieler kann dadurch nachvollziehen:

> „Ich habe tatsächlich 500 Wölfe für meinen Build gefressen.“

Es unterstützt damit die persönliche Charaktergeschichte.

---

# 47. Iteminformationen

Bei einem Gegenstand soll das Tooltip eindeutig zeigen:

* Name
* Seltenheit
* Levelanforderung
* Klasse
* Werte
* gegebenenfalls besondere Eigenschaften
* Verkaufswert

---

# 48. Verständlichkeit

Das Itemsystem darf nicht unnötig kompliziert sein.

Der Spieler soll bereits beim ersten Blick verstehen:

> Was ist das?
> Für wen ist es?
> Was verbessert es?
> Ist es besser als mein aktuelles Item?

---

# 49. Vergleichssystem

Beim Überfahren eines neuen Gegenstands sollte der Spieler ihn mit dem aktuell ausgerüsteten Gegenstand vergleichen können.

Beispiel:

```text
NEUE RÜSTUNG
+120 HP
+15 Schutz

AKTUELL
+80 HP
+10 Schutz
```

Dadurch wird die Ausrüstungsentscheidung schnell verständlich.

---

# 50. Keine Itemflut

Obwohl SLIMORIA ein großes MMORPG werden soll, darf das Inventar nicht mit völlig nutzlosen Gegenständen überschwemmt werden.

Loot soll einen Zweck besitzen:

* Ausrüsten
* Verkaufen
* Handeln
* Sammeln
* Quest
* Verwendung

---

# 51. Verkauf

Nicht benötigte Gegenstände können gegen Gold verkauft werden.

Das ermöglicht:

> Gegner töten → Loot erhalten → verkaufen → Gold → Ausrüstung kaufen.

Damit entsteht eine einfache wirtschaftliche Progressionsschleife.

---

# 52. Gegenstandsdauer

Ausrüstung soll nicht durch normale Nutzung ständig zerstört werden.

Es soll **kein permanenter Reparaturzwang** entstehen, der den Spieler dazu zwingt, ständig zur Schmiede zurückzukehren.

---

# 53. Ausrüstung und Schleimidentität

Das Itemsystem darf niemals die zentrale visuelle Idee vergessen:

> **Der Spieler ist ein Schleim.**

Die Ausrüstung ist daher ein Gameplay-System und keine Rechtfertigung dafür, den Schleim in einen vollständig ausgerüsteten humanoiden Charakter zu verwandeln.

---

# 54. Zusammenspiel mit Klassen

Beispiel:

### Schurke

sucht:

* Schaden
* Geschwindigkeit
* Burst

### Krieger

sucht:

* Schaden oder
* HP + Schutz

### Paladin

sucht:

* HP + Schutz für Tank
* Mana + Heilung für Heiler

### Mage

sucht:

* magischen Schaden
* Mana

### Priester

sucht:

* Heilung
* Mana
* Unterstützung

### Druide

sucht abhängig vom Build:

* Natur-/Magieschaden
* Heilung
* Mana

---

# 55. Ausrüstung und Fressboni

Ein Spieler kann zwei unterschiedliche Quellen für denselben Buildwert kombinieren.

Beispiel:

> Fressbonus: +Geschwindigkeit

plus:

> Ausrüstung: +Geschwindigkeit

Dadurch wird der Build verstärkt.

---

# 56. Kein vollständiger Ersatz

Die Ausrüstung soll aber nicht dazu führen:

> „Ich habe schlechte Fresswerte, aber meine Rüstung ist so gut, dass es egal ist.“

Fressfortschritt bleibt langfristig relevant.

---

# 57. Beispiel eines vollständigen Items

### Wolfsklinge

**Seltenheit:** Rare
**Benötigt:** Schurke, Level 25

**Werte:**

* +Schaden
* +Geschwindigkeit

**Beschreibung:**

> Eine leichte Klinge, deren Kampfstil auf schnelle Angriffe ausgelegt ist.

Der Spieler versteht unmittelbar:

> Dieses Item ist für einen schnellen Schurken.

---

# 58. Beispiel eines defensiven Items

### Schwerer Eisenpanzer

**Seltenheit:** Uncommon
**Benötigt:** Krieger/Paladin, Level 15

**Werte:**

* +HP
* +Schutz

Der Spieler erkennt:

> Defensive Ausrüstung.

---

# 59. Itemisierung und langfristige Ziele

Später im Spiel soll der Spieler nicht nur fragen:

> „Wie komme ich auf Level 80?“

Sondern auch:

> „Wie bekomme ich mein ideales Gear?“

Damit existieren mehrere langfristige Ziele.

---

# 60. Drei große Charakterfortschritte

Ein Charakter entwickelt sich langfristig über:

### Level

> allgemeine Macht

### Fressen

> permanente individuelle Eigenschaften

### Ausrüstung

> Optimierung des Builds

Talent- und Fähigkeitssysteme verbinden diese drei Bereiche miteinander.

---

# 61. Gesamtstruktur

```text
                     CHARAKTER
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       LEVEL          FRESSEN        AUSRÜSTUNG
          │              │              │
     Grundwerte     Eigenschaften      Stats
          │              │              │
       Talente       Build-Werte       Rollen
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                   INDIVIDUELLER
                       BUILD
```

---

# 62. Designziel

Das Ausrüstungssystem soll dem Spieler das Gefühl geben:

> **„Ich baue meinen Schleim immer weiter auf.“**

Nicht:

> „Ich tausche einfach alle paar Level meine Rüstung aus.“

Ausrüstung ist deshalb ein wichtiger Teil der Progression, aber **nicht die alleinige Quelle der Stärke**.

---

# 63. Endgültiger Design-Grundsatz

**Fressen macht den Schleim einzigartig.**
**Level macht ihn grundsätzlich stärker.**
**Talente geben ihm eine Richtung.**
**Fähigkeiten bestimmen seine Möglichkeiten.**
**Ausrüstung optimiert seinen Build.**
**Gold ermöglicht weitere Entscheidungen.**

Damit fügt sich das Itemsystem in die zentrale Progressionsphilosophie von SLIMORIA ein.
