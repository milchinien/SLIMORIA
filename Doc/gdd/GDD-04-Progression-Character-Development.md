# SLIMORIA — GDD 04: Progression & Character Development

**Dokumentstatus:** Final
**Version:** 1.0
**Priorität:** Hoch
**Scope:** Levelsystem, XP, Masse, Größe, Fressfortschritt, Charakterentwicklung, Tod, Verlust, langfristige Progression und Level-80-Ziel.

---

# 1. Grundprinzip

Die Progression von SLIMORIA basiert auf einem zentralen Gedanken:

> **Der Schleim wird stärker, weil er lebt, kämpft, frisst und sich weiterentwickelt.**

Das Levelsystem ist dabei nicht nur eine Zahl.

Das Level bestimmt unter anderem:

* Größe
* grundlegende HP
* grundlegenden Schaden
* allgemeine Kampfstärke
* Zugriff auf bestimmte Inhalte
* Talentfortschritt

---

# 2. Maximales Level

Das maximale Charakterlevel ist:

> **Level 80**

Level 80 soll ein langfristiges Ziel sein.

Es soll **nicht** innerhalb weniger Tage erreicht werden.

Ein Spieler soll dafür:

> **Hunderte Stunden**

benötigen können.

Level 80 soll sich wie eine echte Errungenschaft anfühlen.

---

# 3. Level 1

Jeder neue Schleim beginnt bei:

> **Level 1**

Der Startwert ist der grundlegende Ausgangspunkt des Charakters.

Der Spieler soll die Entwicklung später deutlich wahrnehmen können.

---

# 4. Level und Größe

Die Größe des Schleims orientiert sich am Level.

Mit jedem Level wird der Schleim etwas größer.

Dabei gilt:

> Die Größenänderung soll subtil erfolgen.

Der Spieler soll nicht nach jedem Level sofort denken:

> „Ich bin riesig geworden.“

Stattdessen soll die Veränderung über längere Spielzeit sichtbar werden.

---

# 5. Wahrnehmung der Größenentwicklung

Ein wichtiger gewünschter Effekt:

Ein Spieler erreicht beispielsweise Level 10 und kehrt an einen bekannten Ort zurück.

Er sieht seinen Charakter und denkt:

> **„Moment – ich bin ja deutlich größer als am Anfang.“**

Die Größenentwicklung soll dadurch eher **entdeckt** als ständig bewusst wahrgenommen werden.

---

# 6. Größenanzeige

Trotz der subtilen visuellen Entwicklung muss die Progression eindeutig nachvollziehbar bleiben.

Die Levelanzeige zeigt:

> aktuelles Level

und das Level bestimmt intern die Größe.

Dadurch weiß der Spieler:

> „Level 2 ist größer als Level 1.“

Er muss nicht selbst schätzen, wie groß sein Schleim geworden ist.

---

# 7. Levelkurve

Die Levelkurve wird bewusst progressiv gestaltet.

Die ersten Level gehen vergleichsweise schnell.

Danach wird der benötigte XP-Aufwand zunehmend höher.

Ziel:

> Der Spieler soll nach ungefähr einer Stunde Spielzeit Level 10 erreichen können.

Danach steigt der Zeitaufwand kontinuierlich.

---

# 8. Beispielhafte Progressionsstruktur

Die exakten XP-Werte werden später gebalanced.

Die gewünschte Struktur:

| Bereich     | Progression        |
| ----------- | ------------------ |
| Level 1–10  | schnell            |
| Level 10–20 | moderat            |
| Level 20–30 | deutlich langsamer |
| Level 30–50 | langfristig        |
| Level 50–70 | sehr langfristig   |
| Level 70–80 | extrem langfristig |

Das letzte Drittel soll besonders wertvoll sein.

---

# 9. XP-Quellen

XP können hauptsächlich erhalten werden durch:

* Gegner besiegen
* Gegner fressen
* Quests
* Bosse
* weitere definierte PvE-Inhalte

Dabei ist wichtig:

> **Fressen ist nicht einfach nur eine alternative Lootmechanik.**

Fressen ist ein zentraler Bestandteil der Charakterentwicklung.

---

# 10. Fressen und XP

Wenn der Spieler eine Kreatur erfolgreich frisst, erhält er die entsprechende XP-Belohnung.

Zusätzlich kann er:

* Eigenschaften
* Fressboni
* Fähigkeiten
* Bossfähigkeiten

erhalten.

Damit ist Fressen eine der wichtigsten Progressionsmechaniken.

---

# 11. Töten vs. Fressen

Der Spieler hat grundsätzlich zwei Möglichkeiten.

### Gegner töten

Vorteile:

* XP
* Gold
* mögliche Drops
* sicherer Abschluss

### Gegner fressen

Vorteile:

* XP
* Fressbonus
* mögliche besondere Eigenschaften
* potenziell weitere Fähigkeiten

Das Fressen ist dadurch langfristig attraktiver, aber riskanter.

---

# 12. Gold und Töten

Ein Gegner, der getötet und nicht gefressen wird, kann Gold liefern.

Damit entsteht ein echter Zielkonflikt:

> **Will ich diese Kreatur für meinen Build fressen oder für Gold töten?**

Das ist bewusst Teil der Progression.

---

# 13. Masse

Der Schleim besitzt zusätzlich eine spielinterne Verbindung zwischen:

> Fressen → Masse → Entwicklung.

Die Masse stellt den körperlichen Aspekt des Schleims dar.

Sie ist jedoch **nicht das eigentliche Levelsystem**.

### Masse ist ein interner Wert, keine sichtbare Größe

Masse ist eine **nicht sichtbare Fortschrittsgröße**.

Sie entsteht durch das Fressen und speist:

* Fressboni und dauerhafte Eigenschaften
* den Fressanteil der Charakterentwicklung

Sie bestimmt jedoch **nicht**, wie groß der Schleim auf dem Bildschirm dargestellt wird.

> **Sichtbare Größe = Level.**
> **Masse = interner Fressfortschritt.**

Ein Spieler mit sehr hohem Fressfortschritt und niedrigem Level bleibt deshalb ein optisch kleiner Schleim — er ist lediglich deutlich stärker, als seine Größe vermuten lässt.

Siehe **GDD 01** §29 und §45–48.

---

# 14. Level ist nicht Masse

Das ist ein wichtiger Unterschied.

Der Spieler kann durch Fressen Masse gewinnen.

Das Level repräsentiert dagegen den langfristigen Charakterfortschritt.

Dadurch können folgende Situationen existieren:

> großer Kampfbonus durch Fressfortschritt, aber niedriges Level

oder:

> hohes Level mit einem anderen spezialisierten Fressbuild.

---

# 15. Fressfortschritt

Jede Kreaturenart besitzt Eigenschaften.

Beispiel:

> Wolf → Geschwindigkeit.

Der erste Wolf kann einen starken Bonus geben.

Weitere Wölfe geben weiterhin etwas.

Der Effekt nimmt jedoch ab.

---

# 16. Abnehmender Grenznutzen

Beispiel:

| Anzahl gefressener Wölfe |        Speed-Bonus |
| -----------------------: | -----------------: |
|                        1 |               +1,0 |
|                       10 |               +0,5 |
|                       20 |               +0,2 |
|               sehr viele | immer noch positiv |

Die konkrete Formel wird später festgelegt.

Wichtig ist:

> Der Effekt darf niemals vollständig auf 0 fallen.

---

# 17. Warum kein Nullpunkt?

Der Spieler soll niemals das Gefühl bekommen:

> „Diese Kreatur bringt mir überhaupt nichts mehr.“

Selbst ein sehr erfahrener Wolf-Farmer erhält weiterhin einen kleinen Vorteil.

Allerdings wird es irgendwann extrem ineffizient, nur dieselbe Kreatur zu farmen.

Dadurch entsteht ein natürlicher Anreiz zur Diversifikation.

---

# 18. Klassenabhängiger Fresswert

Der Bonus hängt zusätzlich von der Klasse ab.

Beispiel:

Wolf → Geschwindigkeit

| Klasse         | Effekt |
| -------------- | -----: |
| Schurke        |   +1,5 |
| Standardklasse |   +1,0 |
| Paladin        |   +0,5 |

Dadurch besitzen verschiedene Klassen unterschiedliche optimale Farmrouten.

---

# 19. Fressspezialisierung

Ein Spieler kann sich bewusst auf bestimmte Eigenschaften konzentrieren.

Beispiel:

> Speed + Biss

oder:

> HP + Schutz

oder:

> Mana + Heilung.

Das erzeugt eine zweite Progressionsachse neben dem Level.

---

# 20. Zwei Progressionsachsen

SLIMORIA besitzt dadurch:

### Vertikale Progression

> Level 1 → 80

und:

### Horizontale Progression

> Eigenschaften → Build → Spezialisierung

Ein Spieler kann deshalb auf demselben Level einen völlig anderen Charakter besitzen.

---

# 21. Eigenschaften

Kreaturen besitzen eine oder mehrere Eigenschaften.

Beispiele:

* Geschwindigkeit
* Stärke
* HP
* Schutz
* Mana
* Wahrnehmung
* Heilung
* weitere kampfrelevante Eigenschaften

Diese Eigenschaften können durch Fressen dauerhaft aufgebaut werden.

---

# 22. Keine unbegrenzte dominante Eigenschaft

Der Spieler kann theoretisch sehr viele Exemplare einer Kreatur fressen.

Aber:

> Der Grenznutzen sinkt immer weiter.

Dadurch kann kein einzelner Gegner unendlich effizient gefarmt werden.

---

# 23. Boss-Progression

Bosse stellen eine zweite Form der langfristigen Progression dar.

Ein Boss kann:

* stärkere Fressboni
* Fähigkeiten
* höherwertige Fähigkeiten
* besondere Klassenfähigkeiten

geben.

---

# 24. Boss-Level

Ein Boss kann beispielsweise Level 60 besitzen.

Der Spieler kann ihn nicht einfach als Level-10-Charakter zuverlässig verschlingen.

Das Levelsystem schützt vor solchen Progressionssprüngen.

---

# 25. Fresschance und Level

Die Fresschance orientiert sich unter anderem am Levelunterschied.

Grundregel:

> Ist der Gegner **6–10 Level über dem Spieler**, beträgt die Fresschance **0 %**.

Das verhindert, dass Spieler durch das Fressen deutlich stärkerer Gegner das Levelsystem umgehen.

---

# 26. Stärkere Gegner

Ein deutlich höherer Gegner ist nicht nur schwerer zu besiegen.

Er ist auch:

> **nicht als einfacher Progressionsshortcut gedacht.**

Der Spieler muss seine Stärke tatsächlich aufbauen.

---

# 27. Levelgrenzen

Bestimmte Inhalte werden an Level gekoppelt.

Beispiele:

* Gebiete
* Quests
* Bosse
* Fähigkeiten
* Talentfortschritt
* Spezialisierung

Dadurch kann der Spieler nicht einfach frühzeitig in Endgame-Inhalte springen.

---

# 28. Level 10

Level 10 ist ein zentraler Meilenstein.

Der Spieler:

* hat die grundlegende Klasse kennengelernt
* beginnt das Talent-System
* hat bereits eine sichtbare Größenentwicklung
* beginnt stärker über Builds nachzudenken

---

# 29. Level 20

Level 20 ist ebenfalls ein wichtiger Fortschrittspunkt.

Ab Level 20 können:

> **Mounts**

verwendet werden.

Das Mount-System erweitert die Fortbewegung, ersetzt aber nicht die Schleimbewegung im normalen Kampf.

---

# 30. Level 30

Level 30 schaltet die große Klassenspezialisierungsentscheidung frei.

Dadurch entsteht ein deutlicher Entwicklungssprung.

---

# 31. Level 80

Level 80 ist das langfristige Endziel der normalen Levelprogression.

Danach soll der Spieler nicht einfach „fertig“ sein.

Die Charakterstärke kann weiterhin durch andere Systeme verbessert werden:

* Fähigkeiten
* Fressboni
* Ausrüstung
* Builds
* Bossfarming

Das Level selbst steigt jedoch nicht über 80.

---

# 32. Tod

Wenn der Schleim stirbt:

> **Respawn am Friedhof.**

Der Tod soll visuell sehr charakteristisch sein.

---

# 33. Todesanimation

Beim Tod:

1. Der Schleim verliert seine Form.
2. Der Körper platzt auseinander.
3. Er wird zu einer dunklen Pfütze.
4. Die Augen schwimmen sichtbar darin.
5. Die Farbe wirkt dunkler und „tot“.

Das ist eine zentrale visuelle Charakteristik von SLIMORIA.

---

# 34. Tod und XP-/Masseverlust

Ein Tod kann dazu führen, dass der Spieler einen Teil seines zuvor aufgebauten Fortschritts verliert.

Insbesondere:

> Masse / XP-Fortschritt

kann verloren gehen.

Das soll den Tod relevant machen.

---

# 35. Levelverlust

Der Spieler kann durch extreme Verluste bis auf:

> **Level 1**

zurückfallen.

Aber niemals darunter.

---

# 36. Wichtig: Fähigkeiten bleiben erhalten

Ein Levelverlust entfernt **nicht** die bereits erlernten Fähigkeiten.

Beispiel:

Ein Spieler war Level 40 und besitzt eine seltene Bossfähigkeit.

Er verliert durch wiederholte Niederlagen sehr viel Fortschritt und fällt auf Level 1 zurück.

Er besitzt weiterhin:

> die Fähigkeit.

---

# 37. Konsequenz des Levelverlusts

Das bedeutet jedoch nicht, dass die Fähigkeit weiterhin genauso stark ist.

Ein Level-1-Spieler mit einer mächtigen Fähigkeit besitzt:

* niedrige HP
* niedrigen Schaden
* niedrige Grundwerte

Die Fähigkeit bleibt erhalten, aber der Charakter ist wieder schwach.

---

# 38. Warum dieses System wichtig ist

Dadurch wird der Tod gefährlich, ohne seltene Errungenschaften vollständig zu zerstören.

Der Spieler verliert:

> **Fortschritt**

aber nicht:

> **seine gesamte Geschichte.**

---

# 39. Beispiel

Ein Spieler erreicht:

> Level 35

und besitzt:

> Legendary-Biss.

Nach mehreren schweren Fehlern fällt er auf:

> Level 18.

Er besitzt weiterhin:

> Legendary-Biss.

Er muss jedoch erneut Level aufbauen, um seine volle Kampfstärke zurückzugewinnen.

---

# 40. Extremfall

Ein Spieler kann theoretisch bis:

> Level 1

zurückfallen.

Dann beginnt seine numerische Charakterstärke wieder fast am Anfang.

Seine langfristig erworbenen Fähigkeiten bleiben jedoch bestehen.

---

# 41. Progressionsschutz

Es darf nicht passieren, dass ein Spieler durch einen einzigen Tod sämtliche langfristigen Errungenschaften verliert.

Daher bleiben wichtige dauerhafte Dinge erhalten, insbesondere:

* erlernte Fähigkeiten
* Klassenwahl
* Spezialisierungsentscheidungen
* langfristige Charakteridentität

---

# 42. Risiko und Belohnung

Das System erzeugt einen wichtigen psychologischen Effekt:

> Je stärker der Spieler wird, desto wertvoller wird sein aktueller Fortschritt.

Ein riskanter Bosskampf kann deshalb bedeuten:

> großer Gewinn oder großer Rückschritt.

---

# 43. Quest-XP

Quests sind eine wichtige XP-Quelle.

Da Quests ein zentraler Bestandteil von SLIMORIA sind, sollen sie nicht nur als Nebensystem behandelt werden.

Quests können geben:

* XP
* Gold
* Ausrüstung
* Tränke
* gelegentlich besondere Belohnungen

---

# 44. Quest-Progression

Quests werden entsprechend des Spielerlevels strukturiert.

Ein Spieler soll nicht plötzlich eine Quest erhalten, die ihn in ein Gebiet schickt, das massiv über seinem Level liegt.

Dadurch bleibt die Progressionskurve kontrollierbar.

---

# 45. Gebiet und Level

Die Welt ist in Levelbereiche aufgeteilt.

Beispiel:

> Level 1–6
> Level 6–12
> Level 10–16
> Level 12–20

Dadurch entstehen Überschneidungen.

Der Spieler kann verschiedene Wege wählen.

---

# 46. Nicht-linearer Fortschritt

SLIMORIA soll trotz Levelsystem nicht ausschließlich eine gerade Linie besitzen.

Beispiel:

```text
Startgebiet
    ↓
Gebiet A ─────┐
              ├── Gebiet C
Gebiet B ─────┘
              ↓
          weitere Wege
```

Der Spieler kann unterschiedliche Gebiete und Questketten erleben.

---

# 47. Fortschritt durch Spielstil

Ein Spieler kann schneller vorankommen, wenn er:

* viele Gegner tötet
* viele Quests erledigt
* passende Kreaturen farmt
* Gruppen nutzt
* Bosse bekämpft

Aber keine einzelne Methode soll alle anderen vollständig ersetzen.

---

# 48. Langfristige Charakterentwicklung

Ein Level-80-Charakter soll nicht einfach bedeuten:

> „Ich habe genug XP gesammelt.“

Er soll eine Geschichte erzählen.

Beispielsweise:

> Level 80
> Schurke
> Speed/Biss-Build
> 40 Stunden Wolfsfarming
> Legendary-Biss
> spezielle Stealth-Fähigkeiten
> bestimmte Ausrüstung

---

# 49. Bestiarium als Progressionsdokument

Das Bestiarium dokumentiert die Begegnungen mit Kreaturen.

Es zeigt unter anderem:

* Kreatur
* Anzahl besiegter Exemplare
* Anzahl gefressener Exemplare
* weitere relevante Informationen

Beide Zähler werden getrennt geführt, weil Töten und Fressen unterschiedliche Progressionswege darstellen.

Dadurch kann der Spieler seine eigene Progressionsgeschichte nachvollziehen.

---

# 50. Charakterentwicklung als Identität

Die Entwicklung soll drei Fragen beantworten:

### Wer bin ich?

> Meine Klasse und Spezialisierung.

### Was habe ich gefressen?

> Meine Fressboni.

### Was habe ich gelernt?

> Meine Fähigkeiten.

Dadurch wird der Charakter mehr als nur eine Levelzahl.

---

# 51. Progressionsphilosophie

SLIMORIA soll bewusst **langsam und langfristig** sein.

Der Spieler soll nicht innerhalb kurzer Zeit alles freischalten.

Stattdessen:

> kleine Fortschritte → neue Fähigkeiten → neue Gebiete → stärkere Gegner → neue Builds → stärkere Bosse.

---

# 52. Kein Level-Boost durch Fressen

Das Fresssystem darf nicht zu folgendem Exploit führen:

> „Ich finde einen starken Gegner und bekomme sofort mehrere Level.“

Das wird verhindert durch:

* Levelabhängigkeit
* Fresschance
* XP-Skalierung
* Gegnerstärke

---

# 53. Fresssystem als parallele Progression

Das Fresssystem soll trotzdem niemals nebensächlich werden.

Der Spieler kann Level 80 erreichen und weiterhin sagen:

> „Ich möchte meinen Speed-Wert noch verbessern.“

oder:

> „Ich brauche noch diese Bossfähigkeit.“

Dadurch bleibt das Fressen auch im späteren Spiel relevant.

---

# 54. Progressionsziel

Die ideale Spielererfahrung ist:

> **Leveln gibt mir neue Möglichkeiten.**
> **Fressen gibt meinem Charakter Identität.**
> **Talente geben meinem Build Richtung.**
> **Bosse geben mir langfristige Ziele.**
> **Ausrüstung vervollständigt meinen Build.**

---

# 55. Gesamtstruktur

```text
LEVEL
│
├── Größe
├── HP
├── Schaden
├── Inhalte
├── Talente
│
├── FRESSEN
│   ├── Eigenschaften
│   ├── Masse
│   ├── XP
│   └── Bossfähigkeiten
│
├── KLASSE
│   ├── Fähigkeiten
│   ├── Ressourcen
│   └── Rollen
│
├── BUILD
│   ├── Talente
│   ├── Spezialisierung
│   ├── Fressboni
│   └── Ausrüstung
│
└── LEVEL 80
      ↓
  langfristige Buildoptimierung
```

---

# 56. Endgültiger Design-Grundsatz

Die Progression von SLIMORIA soll nicht nur bedeuten:

> **„Meine Zahl ist größer geworden.“**

Sie soll bedeuten:

> **„Mein Schleim hat sich entwickelt.“**

Ein Spieler soll nach hunderten Stunden einen Charakter besitzen, dessen Stärke und Spielweise aus seinen eigenen Entscheidungen entstanden ist.

**Level bestimmt die grundlegende Macht.**
**Fressen bestimmt die individuelle Entwicklung.**
**Talente bestimmen die Richtung.**
**Fähigkeiten bestimmen das Gameplay.**
**Ausrüstung ergänzt den Build.**
**Bosse liefern langfristige Ziele.**
