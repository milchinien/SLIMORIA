# SLIMORIA — GDD 08: MMORPG Systems

**Version:** 1.0
**Dokumenttyp:** MMORPG Systems
**Projekt:** SLIMORIA

> **Scope:** Dieses Dokument definiert die übergreifenden Multiplayer- und MMORPG-Systeme von SLIMORIA.
> Bereits definierte Systeme wie Combat, Klassen, Quests, Progression, Weltaufbau oder UI werden hier nicht erneut detailliert beschrieben.

---

# 1. Ziel des MMORPG-Systems

SLIMORIA soll sich trotz seiner ungewöhnlichen Schleim-Mechanik wie ein vollwertiges MMORPG anfühlen.

Der Spieler soll die Welt nicht ausschließlich alleine erleben.

Er soll:

* andere Spieler sehen
* Gruppen bilden
* gemeinsam kämpfen
* gemeinsam Quests erledigen
* Bosse bekämpfen
* handeln
* Freunde treffen
* langfristige soziale Beziehungen aufbauen

können.

---

# 2. Grundprinzip

SLIMORIA ist eine persistente Multiplayer-Fantasywelt.

Spieler bewegen sich mit ihren eigenen Charakteren durch dieselbe Welt und können dabei anderen Spielern begegnen.

Die Welt soll dadurch belebt wirken.

---

# 3. Spielercharaktere

Jeder Spieler besitzt einen eigenen Schleimcharakter.

Ein Spieler kann mehrere Schleimcharaktere besitzen.

Das Charakter-System sieht:

> **8 Charakter-Slots**

vor.

Jeder Slot repräsentiert einen eigenständigen Charakter.

---

# 4. Charaktere sind getrennt

Die Charaktere eines Spielers teilen nicht automatisch ihren Fortschritt.

Jeder Schleim besitzt seinen eigenen:

* Level
* Fortschritt
* Fähigkeiten
* Ausrüstung
* Inventar
* Questfortschritt
* Charakteraufbau

Dadurch fühlt sich jeder Charakter wie ein eigenständiger MMORPG-Charakter an.

---

# 5. Fraktionszugehörigkeit

Ein Charakter gehört zu einer der beiden großen Fraktionen.

* Eldoran
* Ravok

Die Fraktionszugehörigkeit ist Bestandteil der Charakteridentität.

---

# 6. Keine gleichzeitige Nutzung mehrerer Charaktere

Ein Spieler kann nicht mehrere seiner eigenen Charaktere gleichzeitig spielen.

Es wird immer genau ein Schleimcharakter aktiv gespielt.

---

# 7. Andere Spieler

Andere Spieler erscheinen als eigenständige Charaktere in der Welt.

Sie können:

* gesehen werden
* sich bewegen
* kämpfen
* Quests erledigen
* Kreaturen bekämpfen
* miteinander interagieren

Dadurch entsteht das typische MMORPG-Gefühl einer gemeinsam bevölkerten Welt.

---

# 8. Spielergruppen

Spieler können Gruppen bilden.

Eine Gruppe besteht aus mehreren Spielern, die gemeinsam Inhalte spielen.

Typische Gründe für Gruppen sind:

* gemeinsames Questen
* schwierige Gegner
* Bosse
* gemeinsame Erkundung
* gegenseitige Unterstützung

---

# 9. Gruppeneinladung

Spieler können andere Spieler in eine Gruppe einladen.

Die Einladung muss vom anderen Spieler angenommen werden.

Dadurch entsteht eine bewusste soziale Interaktion statt einer automatischen Gruppenzuweisung.

---

# 10. Gruppenanzeige

Die Mitglieder der eigenen Gruppe werden sichtbar dargestellt.

Die Gruppe zeigt insbesondere:

* Charakter
* HP
* Mana beziehungsweise Klassenressource

Die Gruppe soll dadurch schnell erkennen können, wie es den Mitgliedern geht.

---

# 11. Gruppenrollen

Die unterschiedlichen Klassen können unterschiedliche Aufgaben innerhalb einer Gruppe erfüllen.

Grundsätzlich entstehen dadurch Rollen wie:

* Tank
* Heiler
* Schaden

Die Klassen sind dabei nicht vollständig auf nur eine Rolle festgelegt.

---

# 12. Flexible Rollen

Ein Spieler kann seine Klasse entsprechend seinem Build unterschiedlich ausrichten.

Beispielsweise kann ein Paladin:

* stärker auf Tank ausgerichtet sein
* stärker auf Heilung ausgerichtet sein
* eine Mischform darstellen

Auch der Priester kann neben seiner klassischen Heilrolle später stärker offensiv ausgerichtet werden.

---

# 13. Gruppenidentität

Das Gruppensystem soll nicht voraussetzen, dass alle Spieler dieselbe Klasse besitzen.

Im Gegenteil:

Die unterschiedlichen Klassen sollen sich gegenseitig ergänzen.

Eine Gruppe kann beispielsweise aus:

* Tank
* Heiler
* Nahkämpfer
* Fernkämpfer

bestehen.

---

# 14. Spieler gegen Spieler

PvP existiert in SLIMORIA.

Spieler können andere Spieler bekämpfen.

Es gibt jedoch **kein Fressen anderer Spieler**.

Das zentrale Fresssystem bleibt auf Kreaturen und andere dafür vorgesehene Ziele ausgerichtet.

---

# 15. PvP und Tod

Wenn Spieler gegeneinander kämpfen, kann ein Spieler getötet werden.

Der Tod eines Spielers führt jedoch nicht dazu, dass der andere Spieler ihn fressen kann.

Damit bleiben:

> **PvP und Fressmechanik zwei getrennte Systeme.**

---

# 16. Levelunterschiede im PvP

Levelunterschiede sollen spürbar sein.

Ein Spieler mit deutlich höherem Level soll gegenüber einem deutlich niedrigeren Spieler einen klaren Vorteil bei:

* HP
* Schaden
* Überlebensfähigkeit

besitzen.

Ein Unterschied von etwa 6–7 Leveln soll bereits deutlich bemerkbar sein.

---

# 17. PvP-Fairness

Das Ziel ist nicht, Levelunterschiede vollständig zu entfernen.

Die Charakterentwicklung soll Bedeutung besitzen.

Ein deutlich stärker entwickelter Spieler soll auch tatsächlich stärker sein.

---

# 18. Handel

SLIMORIA besitzt ein Spieler-zu-Spieler-Handelssystem.

Spieler können untereinander Gegenstände und andere handelbare Güter tauschen.

---

# 19. Handel zwischen Spielern

Der Handel ist bewusst auf Spieler zu Spieler ausgelegt.

Ein Spieler kann beispielsweise:

* einen Gegenstand anbieten
* einen Gegenstand anfordern
* mehrere Gegenstände gleichzeitig handeln

Der Handel muss von beiden Seiten bestätigt werden.

---

# 20. Gold

Gold ist die grundlegende Währung des Spiels.

Gold kann unter anderem durch:

* das Töten von Gegnern
* Quests
* seltene Drops

erhalten werden.

---

# 21. Gold und Fressen

Ein wichtiger Bestandteil der Wirtschaft ist die Entscheidung:

> **Töte ich die Kreatur oder fresse ich sie?**

Das Töten einer Kreatur kann Gold einbringen.

Das Fressen einer Kreatur dient dagegen dem Aufbau des Schleims.

Damit entsteht eine echte Entscheidung zwischen:

> kurzfristigem wirtschaftlichem Gewinn

und

> langfristigem Charakterfortschritt.

---

# 22. Seltene Goldquellen

Gegenstände und Gold können selten direkt von Gegnern fallen.

Bosse besitzen dabei eine höhere Wahrscheinlichkeit, wertvolle Belohnungen zu liefern.

Quests bleiben ebenfalls eine reguläre Einnahmequelle.

---

# 23. NPC-Handel

NPCs bilden einen normalen Bestandteil der Weltwirtschaft.

Sie können beispielsweise:

* Gegenstände verkaufen
* Gegenstände ankaufen
* Dienstleistungen anbieten

---

# 24. Ausrüstung kaufen

Schmiede können für Gold Ausrüstung anbieten.

Die Schmiede stellen damit einen wichtigen Teil der normalen Wirtschaft dar.

Der Spieler kann dort Ausrüstung erwerben, ohne zwingend auf einen bestimmten Drop angewiesen zu sein.

---

# 25. Tränke

Das MMORPG besitzt ein klassisches Tränkemechanik-System.

Dazu gehören insbesondere:

* Heiltränke
* Geschwindigkeitstränke
* Manatränke

Tränke können im Inventar getragen und über die dafür vorgesehenen Interaktionen verwendet werden.

---

# 26. Inventarwirtschaft

Spieler besitzen ein Inventar für:

* Ausrüstung
* Tränke
* Gegenstände
* sonstige Items

Das Inventar bildet damit einen zentralen Bestandteil der persönlichen Wirtschaft.

---

# 27. Bestiarium

Zusätzlich zum normalen Inventar besitzt jeder Charakter ein Bestiarium.

Das Bestiarium dokumentiert die Begegnungen mit Kreaturen.

Es kann unter anderem festhalten:

* welche Kreatur gefunden wurde
* wie oft sie besiegt wurde
* wie oft sie gefressen wurde

Das Bestiarium dient damit auch als langfristige Sammlung persönlicher Erfolge.

---

# 28. Bestiarium als Langzeitmotivation

Ein Spieler kann beispielsweise über lange Zeit eine bestimmte Kreaturenart verfolgen.

Dadurch kann das Bestiarium sichtbar machen:

> „Wie viele dieser Kreaturen habe ich eigentlich schon besiegt?“

Es unterstützt damit das Sammel- und Langzeitgefühl des Spiels.

---

# 29. Mounts

Mounts sind Bestandteil des MMORPG-Systems.

Sie werden jedoch erst ab **Level 20** verfügbar.

Damit bleiben die frühen Spielstunden bewusst auf die normale Fortbewegung des Schleims konzentriert.

---

# 30. Mounts als Fortschrittsmeilenstein

Das Freischalten eines Mounts soll sich wie ein bedeutender Fortschritt anfühlen.

Es ist ein sichtbares Zeichen dafür, dass der Charakter nicht mehr am Anfang seiner Reise steht.

---

# 31. Soziale Interaktion

Die Welt soll Spieler dazu bringen, miteinander zu interagieren.

Dazu gehören:

* Gruppen
* Handel
* gemeinsames Questen
* gemeinsames Kämpfen
* gemeinsames Farmen
* PvP

---

# 32. Gemeinsames Farmen

Spieler können gemeinsam Gegner bekämpfen.

Dadurch können sie beispielsweise gemeinsam:

* Erfahrung sammeln
* Gold verdienen
* Bosse farmen
* bestimmte Kreaturen suchen

---

# 33. Boss-Farming als Gruppenerlebnis

Stärkere Bosse können einen natürlichen Grund darstellen, andere Spieler zu suchen.

Besonders schwierige Inhalte können dadurch zu sozialen Treffpunkten werden.

Die konkrete Bossstruktur selbst gehört jedoch nicht in dieses Dokument.

---

# 34. MMORPG ohne Zwang zur Gruppe

SLIMORIA soll trotzdem vollständig alleine spielbar bleiben.

Ein Spieler muss nicht permanent einer Gruppe angehören.

Das Spiel soll sowohl:

> **Solo-Spieler**

als auch

> **Gruppenspieler**

unterstützen.

---

# 35. Solo-Spieler

Solo-Spieler können ihren Charakter eigenständig entwickeln und die Welt erkunden.

Sie sollen nicht das Gefühl bekommen:

> „Ohne Gruppe kann ich überhaupt nichts machen.“

---

# 36. Gruppen-Spieler

Gruppenspieler erhalten dagegen zusätzliche Möglichkeiten durch die Kombination verschiedener Klassen und Fähigkeiten.

Das Zusammenspiel mehrerer Charaktere soll Vorteile bieten, ohne Solo-Spiel grundsätzlich wertlos zu machen.

---

# 37. Soziale MMORPG-Identität

Ein langfristiges Ziel ist, dass Spieler Geschichten über ihre eigenen Charaktere erzählen können.

Beispielsweise:

> „Wir haben diesen Boss zu fünft immer wieder gefarmt.“

oder:

> „Wir haben uns nur für dieses Gebiet zusammengeschlossen.“

Das Spiel soll dadurch persönliche Multiplayer-Erinnerungen erzeugen.

---

# 38. Spielerhandel als soziale Verbindung

Der Handel kann auch soziale Beziehungen erzeugen.

Ein Spieler kann beispielsweise einen Gegenstand besitzen, den ein anderer Spieler benötigt.

Dadurch entsteht ein natürlicher Grund für Interaktion.

---

# 39. Wirtschaftliche Entscheidungen

Der Spieler muss nicht jeden Gegenstand automatisch verkaufen.

Er kann Gegenstände:

* selbst verwenden
* behalten
* verkaufen
* mit anderen Spielern handeln

Dadurch entsteht eine einfache persönliche Wirtschaft.

---

# 40. MMORPG-Langzeitstruktur

SLIMORIA soll langfristig gespielt werden können.

Die langfristige Motivation entsteht aus mehreren Ebenen:

```text
Charakter entwickeln
       ↓
Build verbessern
       ↓
neue Inhalte erreichen
       ↓
stärkere Gegner bekämpfen
       ↓
seltene Belohnungen erhalten
       ↓
Charakter weiterentwickeln
```

Diese langfristige Struktur wird durch die sozialen MMORPG-Systeme ergänzt.

---

# 41. Charakterbindung

Da jeder Charakter einen eigenen Fortschritt besitzt, soll sich ein Spieler stark mit seinem jeweiligen Schleim identifizieren können.

Ein Charakter ist nicht nur ein Avatar.

Er repräsentiert die persönliche Geschichte des Spielers innerhalb der Welt.

---

# 42. Fraktion als soziale Identität

Die Fraktionswahl kann auch eine soziale Bedeutung erhalten.

Spieler derselben Fraktion teilen:

* eine gemeinsame Weltanschauung
* gemeinsame Städte
* gemeinsame politische Zugehörigkeit
* gemeinsame kulturelle Identität

---

# 43. Fraktionskonflikt

Die beiden Fraktionen bilden einen dauerhaften sozialen Gegensatz.

Dies kann sich insbesondere in:

* PvP
* politischen Geschichten
* unterschiedlichen Questinhalten
* unterschiedlichen Gebieten
* unterschiedlichen NPC-Gesellschaften

widerspiegeln.

---

# 44. Kein Charakterwechsel während des Spiels

Der Spieler kann nicht während einer laufenden Sitzung einfach zwischen seinen Charakteren wechseln.

Er spielt immer den aktuell ausgewählten Charakter.

Ein anderer Charakter muss separat ausgewählt werden.

---

# 45. Charakterauswahl

Das Spiel besitzt ein Charakterauswahlsystem mit bis zu:

> **8 Schleim-Slots**

Der Spieler kann dort seine unterschiedlichen Charaktere verwalten.

---

# 46. Mehrere Charaktere als langfristiges System

Die acht Slots ermöglichen beispielsweise:

* verschiedene Klassen
* unterschiedliche Fraktionen
* unterschiedliche Builds
* unterschiedliche persönliche Spielweisen

Der Spieler kann dadurch mehrere eigene Schleimcharaktere entwickeln.

---

# 47. Keine gemeinsame Klassenidentität

Jeder Charakter besitzt seine eigene Klasse.

Dadurch kann ein Spieler beispielsweise mehrere unterschiedliche Rollen ausprobieren, ohne den bestehenden Charakter verändern zu müssen.

---

# 48. MMORPG-Fantasie

Die zentrale MMORPG-Fantasie von SLIMORIA lautet:

> **„Ich entwickle meinen eigenen Schleim in einer großen lebendigen Fantasywelt und treffe dabei auf andere Spieler, die ihre eigenen völlig unterschiedlichen Schleime entwickelt haben.“**

---

# 49. Was SLIMORIA vom klassischen MMORPG unterscheidet

Das MMORPG-Grundgerüst ist bewusst vertraut:

* Gruppen
* Quests
* Handel
* Klassen
* Bosse
* Ausrüstung
* PvP
* Mounts

Der entscheidende Unterschied bleibt jedoch der Charakter selbst:

> **Jeder Spieler ist ein Schleim.**

Und dieser Schleim entwickelt sich durch seine Interaktion mit der Welt.

---

# 50. MMORPG-System-Grundsätze

Für die weitere Entwicklung gelten folgende Regeln:

1. SLIMORIA ist ein echtes MMORPG.
2. Spieler können gemeinsam in derselben Welt spielen.
3. Spieler können Gruppen bilden.
4. Spieler können miteinander handeln.
5. Spieler können andere Spieler bekämpfen.
6. Spieler können andere Spieler niemals fressen.
7. Jeder Spieler besitzt bis zu 8 Charakter-Slots.
8. Charaktere besitzen getrennten Fortschritt.
9. Nur ein eigener Charakter wird gleichzeitig gespielt.
10. Solo-Spiel bleibt möglich.
11. Gruppenspiel bietet starke Vorteile durch Klassenkombinationen.
12. Gold ist eine zentrale Währung.
13. Tränke gehören zur normalen Wirtschaft.
14. Mounts werden ab Level 20 verfügbar.
15. Das Bestiarium dokumentiert besiegte und gefressene Kreaturen.
16. Spielerhandel ist ein wichtiger sozialer Bestandteil.
17. Fraktionen besitzen auch eine soziale Identität.
18. Levelunterschiede bleiben im PvP spürbar.
19. Das MMORPG-System unterstützt langfristige Charakterbindung.
20. Die Schleim-Identität bleibt der zentrale Unterschied zu klassischen MMORPGs.

---

# 51. Master MMORPG Statement

> **SLIMORIA ist eine persistente Fantasywelt, in der jeder Spieler seinen eigenen Schleim entwickelt, mit anderen Spielern zusammenarbeitet, handelt, kämpft und gemeinsam Abenteuer erlebt.**
>
> Das Spiel bietet die vertrauten sozialen Strukturen eines MMORPGs – Gruppen, Handel, PvP, Quests und langfristige Charakterentwicklung – verbindet sie jedoch mit einer einzigartigen Charakterfantasie:
>
> **Jeder Spieler ist ein Schleim.**
>
> Dadurch wird aus einem klassischen MMORPG-System eine Welt, in der zwei Spieler niemals einfach nur zwei Krieger sind, sondern zwei völlig unterschiedlich entwickelte Schleime mit ihrer eigenen Geschichte.
