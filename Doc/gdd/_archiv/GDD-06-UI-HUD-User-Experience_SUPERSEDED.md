# SLIMORIA — GDD 06: UI, HUD & User Experience

**Dokumentstatus:** Final
**Version:** 1.0
**Priorität:** Hoch
**Scope:** Benutzeroberfläche, HUD, Menüs, Hotbar, Charakterfenster, Questanzeige, Gruppenanzeige, Inventar, Bestiarium, Kommunikation und allgemeine User Experience.

---

# 1. Grundprinzip

Die Benutzeroberfläche von SLIMORIA soll sich an etablierten MMORPGs orientieren, insbesondere an der Klarheit klassischer Spiele wie WoW.

Sie soll jedoch nicht unnötig überladen wirken.

Der Spieler soll jederzeit schnell erkennen:

* Wie viel HP habe ich?
* Wie viel Mana/Ressource habe ich?
* Welches Level habe ich?
* Welche Fähigkeiten kann ich benutzen?
* Welche Quests sind aktiv?
* Wo befinden sich meine Gruppenmitglieder?
* Welche wichtigen Informationen gibt es gerade?

---

# 2. Priorität

Die UI muss den Spieler unterstützen, darf aber niemals die wichtigste Figur verdecken:

> **den Schleim.**

Der Schleim und seine Bewegung sind die visuelle Hauptattraktion des Spiels.

Die UI wird deshalb überwiegend an den Bildschirmrändern platziert.

---

# 3. HUD

Das HUD ist während des normalen Spielens sichtbar.

Die grundlegende Struktur:

```text
┌─────────────────────────────────────────────────────────────┐
│                         Spielwelt                           │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│                                                             │
│ [Spieler]                              [Quest Tracker]      │
│ HP / Mana                                                   │
│                                                             │
│                                                             │
│                                                             │
│              [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ]                      │
│              [ 6 ][ 7 ][ 8 ][ 9 ][10 ]                      │
└─────────────────────────────────────────────────────────────┘
```

Die genaue Position einzelner Elemente kann später angepasst werden.

---

# 4. Spieleranzeige

Die Spieleranzeige enthält mindestens:

* Charaktername
* Level
* HP
* Ressourcenanzeige
* gegebenenfalls weitere relevante Kampfwerte

---

# 5. HP-Anzeige

Die HP-Leiste muss jederzeit schnell lesbar sein.

Sie zeigt:

> aktuelle HP / maximale HP

Beispiel:

> 850 / 1.200 HP

Die Leiste verändert sich unmittelbar bei Schaden und Heilung.

---

# 6. Ressourcenanzeige

Die verwendete Ressource hängt von der Klasse ab.

### Mana-Klassen

* Paladin
* Mage
* Priester
* Druide

zeigen:

> Mana

### Krieger

zeigt:

> Wut

### Schurke

zeigt:

> Stealth-Punkte

Die UI muss automatisch die passende Ressource anzeigen.

---

# 7. Levelanzeige

Das aktuelle Level ist dauerhaft beziehungsweise leicht erreichbar sichtbar.

Beispiel:

> Level 27

Zusätzlich gibt es eine XP-Anzeige.

---

# 8. XP-Leiste

Die XP-Leiste zeigt den Fortschritt zum nächsten Level.

Beispiel:

> Level 27
> 43.250 / 60.000 XP

Die Leiste soll unmittelbar verständlich machen:

> Wie weit bin ich vom nächsten Level entfernt?

---

# 9. Level 80

Bei Level 80 gibt es keinen weiteren normalen Level-Fortschritt.

Die XP-Anzeige wird entsprechend angepasst.

Der Spieler erhält stattdessen weiterhin Fortschritt über:

* Ausrüstung
* Fähigkeiten
* Fressboni
* Builds
* Bosse

---

# 10. Hotbar

Die Hotbar ist ein zentraler Bestandteil des HUDs.

Sie besitzt:

> **10 Slots**

mit den Standard-Hotkeys:

> **1–10**

---

# 11. Hotbar-Funktion

Die Hotbar ist keine reine Fähigkeitenleiste.

Sie ist eine allgemeine Aktionsleiste.

Darin können sich befinden:

* Fähigkeiten
* Tränke
* Mount
* weitere direkt verwendbare/interagierbare Aktionen

---

# 12. Beispiel-Hotbar

```text
[1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
```

Beispielsweise:

```text
[ Biss ][ Angriff ][ Schild ][ Heal ][ Feuerball ]
[ Heiltrank ][ Mana ][ Speed ][ Mount ][ Fressen ]
```

Die konkrete Belegung entscheidet der Spieler.

---

# 13. Fressen

Die Fressaktion benötigt eine besonders gut erreichbare Taste.

Eine mögliche Standardbelegung ist:

> **E**

Die Taste soll für den Spieler intuitiv mit der Fressmechanik verbunden werden.

Die Fressaktion kann zusätzlich auf die Hotbar gelegt werden.

---

# 14. Abklingzeiten

Fähigkeiten mit Cooldowns zeigen diese direkt auf ihrem Hotbar-Symbol.

Beispiel:

```text
┌─────────┐
│  BISS   │
│   7.2   │
└─────────┘
```

Dadurch muss der Spieler nicht zusätzlich ein separates Fenster öffnen.

---

# 15. Ressourcenfeedback

Wenn eine Fähigkeit nicht verwendet werden kann, soll die UI den Grund verständlich vermitteln.

Beispielsweise:

> Nicht genug Mana.

oder:

> Nicht genug Wut.

oder:

> Fähigkeit auf Abklingzeit.

---

# 16. Quest-Tracker

Der Quest-Tracker befindet sich auf der rechten Bildschirmseite.

Er funktioniert ähnlich wie bei klassischen MMORPGs.

Beispiel:

```text
QUESTS

Wölfe im Wald
Töte 10 Wölfe
6/10

Gefahr am Fluss
Töte 5 Spinnen
2/5

Der verschwundene Händler
Finde den Händler
```

---

# 17. Quest-Anzeige

Aktive Quests zeigen:

* Questname
* kurze Aufgabenbeschreibung
* Fortschritt

Beispiel:

> Töte 10 Wölfe — 7/10

Dadurch muss der Spieler nicht ständig das Questfenster öffnen.

---

# 18. Viele aktive Quests

Der Spieler kann viele Quests gleichzeitig besitzen.

Der Quest-Tracker zeigt diese auf der rechten Seite.

Er soll dabei übersichtlich bleiben.

Quests können:

* minimiert
* ausgeblendet
* priorisiert

werden.

---

# 19. Quest-Tracker und Orientierung

Die UI soll den Spieler unterstützen, ohne ihm die gesamte Welt abzunehmen.

Der Spieler soll weiterhin:

* die Welt erkunden
* NPCs suchen
* Gebiete kennenlernen

können.

Der Tracker liefert die notwendigen Informationen, ersetzt aber nicht die Welt.

---

# 20. Quest-Fortschritt

Fortschritt wird automatisch aktualisiert.

Beispiel:

Vorher:

> Töte 10 Wölfe — 4/10

Nach zwei Kills:

> Töte 10 Wölfe — 6/10

Der Spieler muss kein Questfenster öffnen.

---

# 21. Questabschluss

Wenn eine Quest abgeschlossen ist, wird dies deutlich angezeigt.

Beispielsweise:

> Quest abgeschlossen

und die Quest kann anschließend beim entsprechenden NPC abgegeben werden.

---

# 22. Questbelohnungen

Beim Abschluss wird klar angezeigt:

* XP
* Gold
* Gegenstände
* sonstige Belohnungen

Der Spieler soll sofort erkennen:

> Was habe ich bekommen?

---

# 23. Gruppenanzeige

Wenn der Spieler einer Gruppe beitritt, erscheinen die Gruppenmitglieder links unterhalb bzw. neben der eigenen Spieleranzeige.

Beispiel:

```text
MICHEL
████████ HP
██████   Mana

Ragnar
████████ HP
██████   Mana

Luna
██████   HP
████████ Mana
```

---

# 24. Gruppeninformationen

Für jedes Gruppenmitglied werden mindestens angezeigt:

* Name
* HP
* Mana bzw. entsprechende Ressource

Dadurch kann der Spieler schnell erkennen:

> Wer braucht Hilfe?

---

# 25. Gruppenanzeige und Rollen

Die UI soll nicht unnötig kompliziert werden.

Die wichtigste Information bleibt:

> Lebenszustand des Gruppenmitglieds.

Weitere Informationen können abhängig von der Situation angezeigt werden.

---

# 26. Zielanzeige

Wenn der Spieler einen Gegner anklickt, soll dessen Zielanzeige erscheinen.

Sie zeigt mindestens:

* Name
* Level
* HP
* gegebenenfalls weitere relevante Informationen

Beispiel:

> Wilder Wolf — Level 12
> ███████░░░ 720 / 900 HP

---

# 27. Ziel und Fressen

Das Zielsystem ist besonders wichtig für das Fresssystem.

Der Spieler muss sofort erkennen:

> Welchen Gegner habe ich ausgewählt?

und:

> Wie viel HP besitzt er?

Denn die HP beeinflussen die Fresschance.

---

# 28. Fresschance

Wenn der Spieler eine Kreatur anvisiert, kann die UI gegebenenfalls relevante Fressinformationen anzeigen.

Dabei darf die Anzeige das Spiel nicht zu einer reinen Prozentoptimierung machen.

Die genaue Darstellung der Fresschance wird daher bewusst zurückhaltend gestaltet.

---

# 29. Fressfeedback

Ein erfolgreicher Fressversuch muss visuell eindeutig erkennbar sein.

Der Spieler soll sofort verstehen:

> Ich habe die Kreatur gefressen.

Ein fehlgeschlagener Versuch muss genauso eindeutig sein.

---

# 30. Fressaktion und UI

Die UI darf die Fressanimation nicht verdecken.

Während des Fressens sollte die Aufmerksamkeit des Spielers auf:

> Schleim + Gegner + Animation

liegen.

Nicht auf einem großen UI-Fenster.

---

# 31. Inventar

Das Inventar wird über ein eigenes Fenster geöffnet.

Es enthält:

* Ausrüstung
* Tränke
* sonstige Gegenstände
* Questgegenstände

---

# 32. Inventarstruktur

Eine klare Rasterstruktur wird verwendet.

Beispiel:

```text
┌─────────────────────────────┐
│ INVENTAR                    │
│                             │
│ [ ][ ][ ][ ][ ][ ]          │
│ [ ][ ][ ][ ][ ][ ]          │
│ [ ][ ][ ][ ][ ][ ]          │
│ [ ][ ][ ][ ][ ][ ]          │
│                             │
│ Gold: 12.450                │
└─────────────────────────────┘
```

---

# 33. Inventar-Tooltip

Beim Überfahren eines Gegenstands erscheint ein Tooltip.

Dieser enthält:

* Name
* Seltenheit
* Level
* Klasse
* Werte
* Beschreibung
* gegebenenfalls Verkaufspreis

---

# 34. Ausrüstungsfenster

Das Ausrüstungsfenster wird separat vom normalen Inventar dargestellt.

Es zeigt:

* aktuell ausgerüstete Gegenstände
* grundlegende Charakterwerte

Der Spieler kann dort seine Ausrüstung verwalten.

---

# 35. Charakterfenster

Das Charakterfenster zeigt die wichtigsten Werte des Schleims.

Beispielsweise:

```text
LEVEL 42

HP
Mana
Schaden
Schutz
Geschwindigkeit
weitere Werte
```

---

# 36. Wertevergleich

Das Charakterfenster soll verdeutlichen, welche Auswirkungen Ausrüstung und Entwicklung haben.

Der Spieler kann dadurch seinen aktuellen Build nachvollziehen.

---

# 37. Talentfenster

Das Talentfenster zeigt:

* verfügbare Talentpunkte
* Talentbaum
* investierte Talente
* nicht freigeschaltete Talente

---

# 38. Talentpunkte

Der Spieler sieht deutlich:

> Verfügbare Talentpunkte: 3

Nach dem Ausgeben wird der Wert unmittelbar aktualisiert.

---

# 39. Level-30-Spezialisierung

Wenn der Spieler Level 30 erreicht, wird die Spezialisierungsentscheidung besonders deutlich dargestellt.

Sie soll nicht wie ein gewöhnlicher Talentpunkt wirken.

Der Spieler soll verstehen:

> Dies ist eine wichtige Klassenentscheidung.

---

# 40. Bestiarium

Das Bestiarium ist ein eigenes Fenster.

Es enthält die bekannten Kreaturen.

Beispiel:

```text
BESTIARIUM

WOLF
Besiegt: 183

BÄR
Besiegt: 41

SPINNE
Besiegt: 77

WOLF-BOSS
Besiegt: 13
```

---

# 41. Bestiarium und Sammelgefühl

Das Bestiarium unterstützt das langfristige Sammel- und Farmgefühl.

Der Spieler kann seine Fortschritte nachvollziehen.

Es ist bewusst kein klassisches Pokédex-System, sondern eine Dokumentation der besiegten Kreaturen.

---

# 42. Karten-/Weltanzeige

Die Welt benötigt eine Karte, damit der Spieler sich orientieren kann.

Die Karte soll unter anderem:

* Gebiete
* wichtige Orte
* Städte
* Questziele
* relevante NPCs

anzeigen können.

---

# 43. Karte und Erkundung

Die Karte darf die Erkundung nicht vollständig zerstören.

Sie soll Orientierung bieten, aber nicht jede Einzelheit der Welt permanent markieren.

Der Spieler soll weiterhin die Welt kennenlernen.

---

# 44. NPC-Anzeige

Wichtige NPCs müssen eindeutig erkennbar sein.

Beispielsweise:

* Questgeber
* Händler
* Schmiede
* Klassenlehrer
* wichtige Story-NPCs

---

# 45. Questgeber

Questgeber sollen eine klare visuelle Kennzeichnung besitzen.

Der Spieler soll erkennen:

> Dieser NPC bietet eine Quest.

Die Darstellung kann sich an klassischen MMORPG-Konventionen orientieren.

---

# 46. Interaktion

Wenn der Spieler einen NPC anklickt oder mit ihm interagiert, öffnet sich ein Dialogfenster.

Dieses zeigt:

* NPC-Name
* Dialog
* mögliche Antworten
* verfügbare Aktionen

---

# 47. Dialogsystem

Das Dialogsystem soll einfach verständlich sein.

Es muss nicht jede Unterhaltung in ein komplexes Dialog-RPG verwandeln.

Es dient hauptsächlich:

* Story
* Questannahme
* Questabschluss
* Händler
* Klassenlehrer
* Weltinformationen

---

# 48. Shop

Händler öffnen ein eigenes Shopfenster.

Der Spieler sieht:

* Gegenstände
* Preise
* verfügbares Gold

---

# 49. Schmiede-UI

Die Schmiede funktioniert ähnlich.

Der Spieler kann:

> Gegenstand auswählen → Preis sehen → kaufen.

Die UI muss deutlich machen:

> Wie viel Gold habe ich?
> Wie viel kostet das Item?

---

# 50. Handel

Beim Spielerhandel öffnet sich ein separates Handelsfenster.

Beide Spieler besitzen eine eigene Angebotsseite.

```text
SPIELER A                 SPIELER B

[Item]                    [Item]
[Item]                    [Gold]

Gold: 500                 Gold: 1.200

       [HANDEL BESTÄTIGEN]
```

---

# 51. Sicherheitsprinzip beim Handel

Beide Spieler müssen den Handel bestätigen.

Ändert eine Seite anschließend ihr Angebot, muss die Bestätigung erneut erfolgen.

Dadurch werden einfache Betrugsversuche verhindert.

---

# 52. Benachrichtigungen

Wichtige Ereignisse werden über kurze UI-Benachrichtigungen angezeigt.

Beispiele:

> +125 XP
> Quest abgeschlossen
> Neues Item erhalten
> Level 10 erreicht
> Neue Fähigkeit gelernt

Die Meldungen dürfen nicht dauerhaft den Bildschirm blockieren.

---

# 53. Loot-Anzeige

Wenn ein Gegner besiegt wurde, können erhaltene Gegenstände kurz angezeigt werden.

Beispiel:

> Erhalten: 18 Gold
> Erhalten: Eisenklinge

Bei wichtigen Gegenständen darf die Darstellung auffälliger sein.

---

# 54. Seltenheitsfeedback

Die Itemfarbe wird auch in den UI-Elementen verwendet.

Beispielsweise:

| Seltenheit | Farbe |
| ---------- | ----- |
| Common     | Grau  |
| Uncommon   | Grün  |
| Rare       | Blau  |
| Epic       | Lila  |
| Legendary  | Gold  |
| Mythic     | Rot   |

Dadurch erkennt der Spieler seltene Beute schnell.

---

# 55. Boss-Loot

Bossdrops erhalten stärkeres visuelles Feedback als gewöhnliche Beute.

Besonders bei:

* Legendary
* Mythic

soll die UI den Moment hervorheben.

Der Fokus bleibt trotzdem auf dem Spielgeschehen.

---

# 56. Tod und UI

Beim Tod wird die normale Kampfoberfläche durch eine eindeutige Todesanzeige ergänzt.

Der Spieler erkennt:

> Der Schleim ist tot.

Anschließend folgt der Respawn am Friedhof.

---

# 57. Todesanzeige

Die UI kann Informationen darstellen wie:

* Todesursache
* verlorener Fortschritt
* Respawn-Möglichkeit

Sie darf die besondere Todesanimation des Schleims nicht überdecken.

---

# 58. Respawn

Nach dem Tod erscheint der Schleim am Friedhof.

Die UI informiert den Spieler darüber, dass der Charakter wieder aktiv ist.

---

# 59. Levelverlust

Falls ein Todesereignis zu einem Levelverlust führt, muss die UI dies eindeutig kommunizieren.

Beispiel:

> Levelverlust
> Level 24 → Level 23

Der Spieler darf niemals rätseln müssen, warum seine Werte plötzlich niedriger sind.

---

# 60. Fähigkeitssystem

Das Fähigkeitenfenster zeigt:

* erlernte Fähigkeiten
* verfügbare Fähigkeiten
* Klassenfähigkeiten
* Bossfähigkeiten
* gegebenenfalls passive Eigenschaften

---

# 61. Fähigkeiten und Seltenheit

Bossfähigkeiten können die definierten Seltenheiten besitzen:

* Common
* Uncommon
* Rare
* Epic
* Legendary
* Mythic

Die UI verwendet dieselben Farben wie das Itemsystem.

---

# 62. Fähigkeiten-Tooltip

Beim Überfahren einer Fähigkeit werden mindestens angezeigt:

* Name
* Seltenheit
* Beschreibung
* Kosten
* Abklingzeit
* Klasse
* gegebenenfalls Quelle

Beispiel:

> Legendary Biss
> Schurke
> Quelle: Wolf-Boss

---

# 63. Skillbar-Verwaltung

Der Spieler kann Fähigkeiten aus dem Fähigkeitenfenster auf die Hotbar ziehen.

Ebenso können Tränke und andere verwendbare Gegenstände auf die Hotbar gezogen werden.

---

# 64. Drag & Drop

Wichtige UI-Interaktionen sollen intuitiv sein:

> Fähigkeit → Hotbar ziehen.
> Item → Ausrüstungsplatz ziehen.
> Item → Handel ziehen.
> Item → Verkauf ziehen.

---

# 65. Tastatur und Maus

Die grundlegende Steuerung basiert auf:

* Maus
* Tastatur

Die Maus wird unter anderem verwendet für:

* Bewegung
* Zielauswahl
* Interaktion
* UI

---

# 66. Bewegungsziel

Da der Schleim indirekt gesteuert wird, klickt der Spieler auf einen Punkt.

Die UI soll diesen Klick nicht unnötig überladen.

Die Welt selbst vermittelt:

> „Hierhin bewegt sich der Schleim.“

---

# 67. Zielbewegung

Beim Rechtsklick auf einen Gegner:

1. Gegner wird ausgewählt.
2. Schleim bewegt sich automatisch in Reichweite.
3. Der Kampf beginnt.
4. Der Spieler kann Fähigkeiten verwenden.

Die UI unterstützt diese Kette, ohne sie unnötig kompliziert zu machen.

---

# 68. Kamera

Die Kamera ist:

* 3D
* drehbar
* neigbar
* zoombar

und meistens hinter dem Schleim positioniert.

Die UI muss mit verschiedenen Zoomstufen funktionieren.

---

# 69. Kamera und UI

Die UI bleibt grundsätzlich am Bildschirm verankert.

Sie darf nicht mit der Welt „mitschwimmen“.

Ausnahme sind gezielte Weltanzeigen wie:

* Gegnername
* Questmarker
* Interaktionshinweise

---

# 70. UI während des Kampfes

Während eines Kampfes muss der Spieler schnell Zugriff auf:

* Fähigkeiten
* Ressourcen
* HP
* Ziel
* Tränke
* Fressaktion

haben.

Das sind die wichtigsten Informationen.

---

# 71. UI während des Fressens

Während der Fressanimation soll die UI möglichst wenig Aufmerksamkeit verlangen.

Die zentrale Information ist:

> Was passiert mit dem Schleim?

Daher keine unnötigen Fenster oder großen Popups.

---

# 72. Menü

Ein Hauptmenü innerhalb des Spiels bietet Zugriff auf:

* Charakter
* Inventar
* Fähigkeiten
* Talente
* Bestiarium
* Karte
* Quests
* Einstellungen

---

# 73. Escape-Menü

Die Escape-Taste öffnet ein klassisches Menü.

Beispiel:

```text
┌──────────────────┐
│ SLIMORIA         │
│                  │
│ Charakter        │
│ Inventar         │
│ Talente          │
│ Bestiarium       │
│ Karte            │
│ Einstellungen    │
│ Ausloggen        │
└──────────────────┘
```

---

# 74. Einstellungen

Die Einstellungen sollen mindestens grundlegende Optionen enthalten:

* Grafik
* Audio
* Steuerung
* UI
* Kamera

Die genaue technische Ausgestaltung gehört nicht in dieses GDD.

---

# 75. UI-Anpassbarkeit

Da SLIMORIA ein langfristiges MMORPG sein soll, sollte die UI grundsätzlich anpassbar sein.

Mögliche Optionen:

* Hotbarposition
* Größe bestimmter UI-Elemente
* Quest-Tracker
* Gruppenanzeige
* UI-Skalierung

Die Kerninformationen müssen jedoch immer verfügbar bleiben.

---

# 76. Keine übermäßige UI-Dichte

Die größte Gefahr bei einem MMORPG-HUD ist:

> zu viele Informationen gleichzeitig.

SLIMORIA besitzt bereits viele Systeme.

Deshalb gilt:

> **Komplexität in den Menüs, Klarheit im Gameplay.**

Während des Kampfes sieht der Spieler nur das, was er tatsächlich benötigt.

---

# 77. UI und Anfänger

Ein neuer Spieler soll nicht direkt mit zehn verschiedenen Fenstern konfrontiert werden.

Neue Systeme werden im Spielverlauf eingeführt.

Beispiel:

### Start

* HP
* XP
* Hotbar
* Quest-Tracker

### später

* Talente
* Bestiarium
* komplexere Charakterwerte
* weitere Systeme

---

# 78. UI-Fortschritt

Neue UI-Funktionen werden passend zum Fortschritt freigeschaltet bzw. erklärt.

Beispiel:

> Level 10 → Talentfenster wird relevant.
> Level 20 → Mount kann auf Hotbar gelegt werden.
> Level 30 → Spezialisierungsfenster.

---

# 79. Tutorial

Das Spiel soll wichtige UI-Funktionen nicht nur durch Text erklären.

Der Spieler soll sie direkt benutzen.

Beispiel:

> Erste Quest → Quest-Tracker erklärt sich praktisch.
> Erster Gegner → Zielanzeige erscheint.
> Erste Fähigkeit → Hotbar wird erklärt.
> Erster Fressversuch → Fressmechanik wird erklärt.

---

# 80. Tutorial-Philosophie

Der Spieler soll nicht durch lange UI-Erklärungen gezwungen werden.

Stattdessen:

> **Zeigen → ausprobieren lassen → verstehen.**

Das ist besonders wichtig, weil viele Spieler Questtexte und Tutorials nur oberflächlich lesen.

---

# 81. Visuelles Feedback

Jede wichtige Aktion soll mindestens eine Form von Feedback liefern:

* Animation
* Sound
* UI
* Zahlen
* Bewegung
* Effekt

Beispiel:

> Fähigkeit benutzt → Animation + Sound + Cooldown.

---

# 82. Zahlenfeedback

Schaden und Heilung können als schwebende Zahlen dargestellt werden.

Beispiel:

> -125
> +250

Dabei muss die Darstellung übersichtlich bleiben.

---

# 83. Kritische Treffer

Kritische Treffer können visuell stärker hervorgehoben werden.

Der Spieler soll sofort erkennen:

> Das war ein besonders starker Treffer.

---

# 84. Level-Up

Ein Level-Up muss deutlich erkennbar sein.

Beispielsweise:

> **LEVEL UP**

mit:

* neuem Level
* XP-Reset auf nächsten Abschnitt
* Größenänderung
* gegebenenfalls neu verfügbaren Systemen

Die Animation darf den Spieler nicht lange aus dem Gameplay reißen.

---

# 85. Fress-Erfolg

Ein erfolgreicher Fressvorgang sollte mehrere Feedbackelemente verbinden:

* Animation
* Sound
* XP
* Fressbonus
* gegebenenfalls Fähigkeit/Loot

Der Spieler soll das Ereignis als wichtigen Moment wahrnehmen.

---

# 86. Fress-Fehlschlag

Ein Fehlschlag muss ebenfalls eindeutig sein.

Der Spieler erkennt:

> Der Gegner wurde nicht gefressen.

Der Schleim kehrt an die entsprechende Position zurück.

---

# 87. Social UI

Da SLIMORIA ein MMORPG ist, benötigt das Spiel soziale Funktionen.

Mindestens:

* Gruppen
* Spielerhandel
* Chat
* Spielerinformationen

---

# 88. Chat

Ein klassisches Chatfenster kann Nachrichten anzeigen.

Mögliche Kategorien:

* Allgemein
* Gruppe
* Flüstern
* Handel

Die genaue Kanalstruktur kann später konkretisiert werden.

---

# 89. Spielerinformationen

Beim Auswählen eines anderen Spielers kann die UI grundlegende Informationen anzeigen.

Beispielsweise:

* Name
* Level
* Fraktion
* Klasse

Nicht jede Charakterinformation muss öffentlich sein.

---

# 90. Fraktionsdarstellung

Die beiden Fraktionen besitzen klare visuelle Identitäten.

### Eldoran

> Blau

### Ravok

> Rot

Diese Farben können sich auch in UI-Elementen wiederfinden.

Sie dürfen jedoch nicht die gesamte Benutzeroberfläche dominieren.

---

# 91. UI und Weltidentität

Die UI soll zur Welt passen.

Eldoran kann stärker:

* geordnet
* mittelalterlich
* steinern
* sakral

wirken.

Ravok kann stärker:

* wild
* rau
* organisch
* tribal

wirken.

Die Benutzeroberfläche kann diese Unterschiede subtil aufgreifen.

---

# 92. Informationshierarchie

Die wichtigsten Informationen während des Spiels sind:

### Priorität 1

* Schleim
* HP
* Ressourcen
* Ziel
* Hotbar

### Priorität 2

* Questfortschritt
* Gruppe
* XP

### Priorität 3

* weitere Informationen

Dadurch bleibt die visuelle Aufmerksamkeit beim Gameplay.

---

# 93. Mobile UI

SLIMORIA ist primär als PC-MMORPG konzipiert.

Das UI wird deshalb für:

> Maus + Tastatur

optimiert.

---

# 94. Ziel des UI-Designs

Der Spieler soll möglichst selten denken:

> „Wo finde ich diese Information?“

Stattdessen soll er intuitiv wissen:

> „Dort sehe ich meine HP.“
> „Dort sehe ich meine Quests.“
> „Dort sind meine Fähigkeiten.“
> „Dort sehe ich meine Gruppe.“

---

# 95. Gesamtaufbau

```text
                         SPIELWELT
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
   SPIELER-UI            QUEST-UI              ZIEL-UI
       │                     │                     │
       ↓                     ↓                     ↓
  HP / Mana              Quests                 Gegner
    Level               Fortschritt                HP
       │
       ↓
     HOTBAR
       │
 ┌─────┼───────────────────────────┐
 ↓     ↓            ↓              ↓
Skills Tränke      Mount        Fressen
```

---

# 96. Designziel

Die UI soll drei Dinge gleichzeitig erreichen:

### Klarheit

Der Spieler versteht jederzeit den Zustand seines Charakters.

### Geschwindigkeit

Wichtige Aktionen sind schnell erreichbar.

### Immersion

Die Benutzeroberfläche nimmt dem Schleim nicht die Aufmerksamkeit.

---

# 97. Endgültiger Design-Grundsatz

> **Die UI erklärt das Spiel, aber sie ist nicht das Spiel.**

SLIMORIA soll sich nicht wie eine Sammlung von Menüs anfühlen.

Der Spieler soll überwiegend:

> seinen Schleim sehen, bewegen, kämpfen und fressen.

Die UI liefert genau die Informationen und Werkzeuge, die dafür notwendig sind.
