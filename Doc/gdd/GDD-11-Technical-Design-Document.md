# SLIMORIA — GDD 11: Technical Design Document

**Version:** 1.0
**Dokumenttyp:** Technical Design Document
**Projekt:** SLIMORIA

> **Scope:** Dieses Dokument beschreibt die technische Grundlage, Architektur und Entwicklungsanforderungen für SLIMORIA. Es definiert, wie die im bisherigen GDD beschriebene Spielwelt technisch umgesetzt werden soll.
> Es verändert keine bereits definierten Gameplay-Systeme.

---

# 1. Technisches Ziel

SLIMORIA ist als 3D-MMORPG konzipiert.

Die technische Architektur muss deshalb insbesondere folgende Anforderungen unterstützen:

* dauerhaft laufende Multiplayer-Welt
* viele gleichzeitig existierende Spieler
* NPCs und Kreaturen
* synchronisierte Bewegungen
* Kampf
* Fressmechanik
* Fähigkeiten
* Charakterentwicklung
* Quests
* Inventar
* Handel
* Gruppen
* Fraktionen
* große Welt
* persistente Charakterdaten

Der wichtigste technische Schwerpunkt bleibt:

> **Eine hochwertige, flüssige und visuell überzeugende Schleimbewegung.**

---

# 2. Engine

Die konkrete Engine wird vor Beginn der eigentlichen Produktion festgelegt.

Die Engine muss mindestens unterstützen:

* 3D
* Physik
* Animation
* Navigation
* Multiplayer
* Asset Streaming
* UI
* Audio
* Partikeleffekte
* große Szenen
* Serverkommunikation

Die Architektur darf nicht unnötig von einer einzigen Engine-Funktion abhängig sein.

---

# 3. Client-Server-Modell

SLIMORIA verwendet grundsätzlich eine:

> **Client-Server-Architektur**

Der Client ist für Darstellung und Eingabe verantwortlich.

Der Server ist die autoritative Instanz für spielrelevante Zustände.

```text
Spieler
   ↓
Client
   ↓
Server
   ↓
Spielwelt / Daten
```

---

# 4. Server Authority

Der Server entscheidet über kritische Spielzustände.

Dazu gehören insbesondere:

* Positionen im relevanten Gameplay-Kontext
* HP
* Ressourcen
* Schaden
* Level
* Erfahrung
* Fressversuche
* Fresserfolg
* Loot
* Fähigkeiten
* Inventar
* Quests
* Gold
* Handel
* Tod
* Respawn

Der Client darf diese Werte nicht eigenständig endgültig bestimmen.

---

# 5. Client-Aufgaben

Der Client übernimmt primär:

* Darstellung
* Animation
* Kamera
* Eingaben
* UI
* Audio
* visuelle Effekte
* lokale Vorhersage
* Darstellung des Serverzustands

---

# 6. Server-Aufgaben

Der Server übernimmt:

* Spielregeln
* Validierung
* Charakterzustand
* Weltzustand
* NPC-Zustand
* Gegnerzustand
* Kampfberechnung
* Fressberechnung
* Questfortschritt
* Loot
* Persistenz
* Multiplayer-Synchronisation

---

# 7. Schutz gegen Manipulation

Der Client darf niemals vertrauenswürdig sein.

Ein Spieler darf beispielsweise nicht selbst bestimmen:

```text
"Ich habe den Boss gefressen."
"Ich habe 500.000 Gold."
"Ich bin Level 80."
"Ich habe diesen Gegenstand."
```

Der Server muss solche Aktionen validieren.

---

# 8. Persistente Charakterdaten

Jeder Schleimcharakter benötigt persistente Daten.

Dazu gehören unter anderem:

* Charakter-ID
* Name
* Fraktion
* Klasse
* Level
* Erfahrung
* Werte
* Fähigkeiten
* Talente
* Ausrüstung
* Inventar
* Gold
* Bestiarium-Fortschritt
* Quests
* relevante Fortschrittsdaten

---

# 9. Charakter-Slots

Ein Account besitzt:

> **8 Schleim-Slots**

Die Slots werden serverseitig verwaltet.

Ein Charakter darf nicht versehentlich Daten eines anderen Slots verwenden.

---

# 10. Datenbank

Die persistenten Spielerdaten benötigen eine dauerhafte Speicherung.

Die Datenbank muss unter anderem unterstützen:

* Accounts
* Charaktere
* Inventare
* Items
* Fähigkeiten
* Talente
* Quests
* Bestiarium
* Währungen
* Gruppeninformationen
* Weltfortschritt

---

# 11. Datenmodell

Die Daten sollten logisch voneinander getrennt werden.

Beispiel:

```text
Account
 ├── Character 1
 │    ├── Stats
 │    ├── Inventory
 │    ├── Equipment
 │    ├── Abilities
 │    ├── Talents
 │    └── QuestProgress
 │
 ├── Character 2
 └── ...
```

---

# 12. Keine harte Datenkopplung

Spielwerte dürfen nicht an zahlreichen Stellen im Code fest eingebaut werden.

Beispielsweise sollte ein Wolf nicht als:

```text
Wolf = +1 Speed
```

an mehreren Stellen implementiert werden.

Stattdessen werden Kreaturen über Daten definiert.

---

# 13. Data-Driven Design

Kreaturen, Fähigkeiten, Items, Quests und andere Inhalte sollen möglichst datengetrieben aufgebaut sein.

Beispiel:

```text
CreatureDefinition
 ├── ID
 ├── Name
 ├── LevelRange
 ├── HP
 ├── Damage
 ├── Fresswerte
 ├── Eigenschaften
 ├── LootTable
 └── AbilityDrops
```

Dadurch können Inhalte später hinzugefügt oder verändert werden, ohne Kerncode umzubauen.

---

# 14. Kreaturensystem

Alle Kreaturen verwenden eine gemeinsame technische Grundlage.

Eine Kreatur kann Eigenschaften besitzen wie:

* Level
* HP
* Angriff
* Bewegung
* Verhalten
* Loot
* Fresswerte
* Fähigkeiten
* Bossstatus

---

# 15. NPC-System

NPCs verwenden ebenfalls ein standardisiertes System.

NPCs können unterschiedliche Rollen besitzen:

* Questgeber
* Händler
* Trainer
* Wachen
* andere Welt-NPCs

---

# 16. AI-System

Kreaturen benötigen eine AI-Struktur.

Die AI muss mindestens Zustände unterstützen wie:

```text
Idle
 ↓
Patrol
 ↓
Detect
 ↓
Chase
 ↓
Attack
 ↓
Return
```

Nicht jede Kreatur benötigt alle Zustände.

---

# 17. AI und Server

Die relevante NPC-AI läuft serverautoritativ.

Der Client erhält die notwendigen Zustandsinformationen und stellt die Bewegung dar.

---

# 18. Navigation

Kreaturen und NPCs benötigen ein Navigationssystem.

Die Welt muss daher navigierbare Bereiche definieren.

Dabei müssen berücksichtigt werden:

* Hindernisse
* Gelände
* Wege
* Gebäude
* Gewässer
* Engstellen

---

# 19. Schleim-Navigation

Der Schleim besitzt eine besondere Fortbewegung.

Die Navigation darf deshalb nicht einfach eine normale Humanoidbewegung voraussetzen.

Der Schleim bleibt:

> **ein zusammenhängender Blob.**

---

# 20. Schleim-Bewegungsmodell

Die Bewegung besteht technisch aus mehreren Ebenen:

```text
Spielerbefehl
      ↓
Navigation
      ↓
Bewegungsziel
      ↓
Geschwindigkeit
      ↓
Körperbewegung
      ↓
Verformung
      ↓
Animation / Rendering
```

---

# 21. Bewegungsziel

Wenn der Spieler auf einen Ort klickt, wird ein Bewegungsziel erzeugt.

Der Server beziehungsweise die autoritative Bewegungslogik bestimmt den gültigen Bewegungsweg.

---

# 22. Bewegungsinterpolation

Die Bewegung muss für den Spieler flüssig aussehen.

Zwischen Serverupdates darf der Client nicht einfach sichtbare Positionssprünge darstellen.

Stattdessen wird interpoliert.

---

# 23. Netzwerkbewegung

Die Netzwerkdarstellung muss berücksichtigen:

* Latenz
* Paketverlust
* unterschiedliche Frameraten
* Serverupdates

Die sichtbare Bewegung darf dadurch nicht ruckartig werden.

---

# 24. Client Prediction

Für die lokale Steuerung kann Client Prediction verwendet werden.

Dadurch reagiert der Schleim unmittelbar auf einen Bewegungsklick.

Der Server bleibt trotzdem autoritativ.

---

# 25. Server Reconciliation

Wenn der Client eine Bewegung anders darstellt als der Server, muss der Client korrigiert werden.

Diese Korrektur muss möglichst weich erfolgen.

Ein sichtbares „Teleportieren“ des Schleims soll vermieden werden.

---

# 26. Schleim-Verformung

Die Schleimform wird nicht ausschließlich durch klassische Bone-Animation erzeugt.

Sie benötigt ein System, das die Körperform dynamisch verändern kann.

---

# 27. Verformungsfaktoren

Die Verformung kann abhängig sein von:

* Geschwindigkeit
* Beschleunigung
* Richtungswechsel
* Bremsen
* Kollisionen
* Sprüngen beziehungsweise speziellen Bewegungsarten
* Angriffen
* Fressanimationen
* Treffern

---

# 28. Grundform

Trotz der Verformung muss der Charakter als klassischer Schleim erkennbar bleiben.

Der Körper darf nicht dauerhaft seine Blob-Identität verlieren.

---

# 29. Geschwindigkeit und Körperform

Bei hoher Geschwindigkeit kann der Schleim beispielsweise:

* nach hinten gezogen werden
* vorne stärker in Bewegungsrichtung gedrückt werden
* stärker wabbeln

Die konkrete mathematische Umsetzung wird engineabhängig implementiert.

---

# 30. Richtungswechsel

Bei einem abrupten Richtungswechsel soll der Körper nicht sofort starr die neue Form annehmen.

Die Masse soll verzögert reagieren.

Dadurch entsteht der gewünschte flüssige Eindruck.

---

# 31. Physik

Die Schleimbewegung soll physikalisch glaubwürdig wirken, ohne vollständig physikalisch simuliert zu werden.

Eine vollständig physikalische Schleimsimulation wäre für ein MMORPG unnötig teuer.

Daher:

> **Physikgefühl statt vollständiger Physiksimulation.**

---

# 32. Performance des Schleims

Der Schleim ist ein zentraler Charakter.

Seine Verformung darf deshalb nicht die Server- oder Clientperformance unverhältnismäßig belasten.

Visuelle Berechnungen sollen möglichst auf dem Client stattfinden.

---

# 33. Fressmechanik — technischer Ablauf

Ein Fressversuch läuft grundsätzlich so:

```text
Spieler wählt Kreatur
        ↓
Schleim bewegt sich zum Ziel
        ↓
Reichweite erreicht
        ↓
Fressaktion angefordert
        ↓
Server validiert
        ↓
Fresschance berechnet
        ↓
Erfolg / Fehlschlag
        ↓
Server aktualisiert Zustand
        ↓
Client spielt Animation
```

---

# 34. Fresschance

Die tatsächliche Fresschance wird serverseitig berechnet.

Dabei können die bereits definierten Faktoren berücksichtigt werden:

* eigenes Level
* Gegnerlevel
* Gegner-HP
* relative Stärke
* weitere definierte Modifikatoren

---

# 35. Fressversuch ist nicht rein visuell

Der Client darf nicht entscheiden:

> „Die Animation war erfolgreich, also wurde gefressen.“

Die Animation folgt dem Ergebnis des Servers.

---

# 36. Erfolgreiches Fressen

Bei Erfolg:

1. Server bestätigt Fresserfolg.
2. Ziel wird entfernt beziehungsweise entsprechend aktualisiert.
3. Fortschritt wird vergeben.
4. relevante Eigenschaften werden angewendet.
5. Client startet die Erfolgsanimation.
6. Schleim wird am Standort des Ziels positioniert.

---

# 37. Fehlgeschlagenes Fressen

Bei Fehlschlag:

1. Server bestätigt Fehlschlag.
2. Schleim erhält die entsprechende Konsequenz.
3. Fressanimation wird beendet.
4. Schleim kehrt beziehungsweise springt gemäß definierter Mechanik zurück.

---

# 38. Fressanimation

Die Fressanimation besteht aus mehreren visuellen Phasen:

```text
Annäherung
 ↓
Beschleunigung
 ↓
Umschlingen
 ↓
Blase / Umhüllung
 ↓
Erfolg
 ↓
Rückkehr zur normalen Blobform
```

---

# 39. Fressanimation und Netzwerk

Die Animation muss nicht jedes einzelne Meshdetail über das Netzwerk übertragen.

Der Server sendet den Zustand:

> Fressversuch gestartet

beziehungsweise:

> Erfolg

Der Client erzeugt daraus die lokale Animation.

---

# 40. Boss-System

Bosse verwenden dieselbe technische Grundlage wie normale Kreaturen, besitzen jedoch zusätzliche Daten.

Beispielsweise:

* Boss-ID
* Bosslevel
* Fähigkeiten
* Loot
* Ability-Drops
* Seltenheiten
* Respawninformationen

---

# 41. Fähigkeitssystem

Fähigkeiten werden datengetrieben definiert.

Eine Fähigkeit besitzt beispielsweise:

```text
Ability
 ├── ID
 ├── Name
 ├── Klasse
 ├── Kosten
 ├── Cooldown
 ├── Reichweite
 ├── Effekt
 ├── Animation
 └── VFX
```

---

# 42. Fähigkeitenausführung

Der Client fordert eine Fähigkeit an.

Der Server überprüft:

* besitzt der Charakter die Fähigkeit?
* ist sie verfügbar?
* reicht die Ressource?
* ist das Ziel gültig?
* ist die Reichweite korrekt?
* ist der Cooldown abgelaufen?

Erst danach wird die Fähigkeit ausgeführt.

---

# 43. Cooldowns

Cooldowns werden serverseitig kontrolliert.

Der Client zeigt lediglich die verbleibende Zeit an.

---

# 44. Ressourcen

Mana und andere Klassenressourcen werden serverseitig verwaltet.

Der Client zeigt den aktuellen Zustand an.

---

# 45. Talent-System

Talente werden ebenfalls datengetrieben aufgebaut.

Ein Talent besitzt beispielsweise:

```text
Talent
 ├── ID
 ├── Klasse
 ├── Position im Tree
 ├── Voraussetzungen
 ├── Kosten
 └── Effekt
```

---

# 46. Level-System

Das Levelsystem muss serverseitig autoritativ sein.

Der Server bestimmt:

* aktuelles Level
* benötigte Erfahrung
* Level-Up
* Statsteigerungen
* Talentpunkte

---

# 47. Level 1–80

Das Spiel unterstützt:

> **Level 1 bis Level 80**

Level 80 ist das maximale Charakterlevel.

---

# 48. Erfahrung

Erfahrung wird ausschließlich durch validierte Spielaktionen vergeben.

Beispielsweise:

* Gegner besiegen
* Gegner fressen
* Quests abschließen

Die konkrete Verteilung wird nicht hier definiert.

---

# 49. Tod

Beim Tod wird der Charakterzustand serverseitig aktualisiert.

Der Client erhält anschließend das Ergebnis.

---

# 50. Respawn

Der Respawn erfolgt an einem gültigen Friedhof beziehungsweise Respawnpunkt.

Der Server bestimmt den gültigen Respawnort.

---

# 51. Inventarsystem

Das Inventar wird serverseitig verwaltet.

Jeder Gegenstand besitzt eine eindeutige Itemdefinition.

Der Charakter besitzt dagegen konkrete Iteminstanzen beziehungsweise Itemmengen.

---

# 52. Itemdefinition

```text
ItemDefinition
 ├── ID
 ├── Name
 ├── Typ
 ├── Qualität
 ├── Stackgröße
 ├── Werte
 └── Verwendungsart
```

---

# 53. Gegenstandsinventar

Das Inventar muss unterstützen:

* Stapel
* Verschieben
* Verwenden
* Ausrüsten
* Entfernen
* Handel

---

# 54. Handel

Spieler-zu-Spieler-Handel wird serverseitig kontrolliert.

Ein Handel darf erst abgeschlossen werden, wenn beide Seiten die jeweilige Transaktion bestätigt haben.

---

# 55. Gold

Gold ist eine serverseitig verwaltete Währung.

Spieler können Gold beispielsweise erhalten durch:

* Gegner
* Quests
* Verkauf beziehungsweise definierte Spielquellen

---

# 56. Gruppen

Gruppen werden serverseitig verwaltet.

Eine Gruppe enthält:

* Gruppen-ID
* Mitglieder
* Gruppenstatus

---

# 57. Gruppen-Synchronisation

Der Client erhält relevante Informationen über Gruppenmitglieder.

Dazu gehören insbesondere:

* Position
* HP
* Mana beziehungsweise Ressource
* Gruppenstatus

---

# 58. Quest-System

Quests werden datengetrieben definiert.

Eine Quest kann beispielsweise enthalten:

```text
Quest
 ├── ID
 ├── Typ
 ├── Level
 ├── Voraussetzungen
 ├── Ziele
 ├── Dialog
 ├── Belohnungen
 └── Folgequest
```

---

# 59. Questziele

Questziele werden über standardisierte Objective-Typen umgesetzt.

Beispielsweise:

* Kreatur töten
* Kreatur fressen
* Gegenstand erhalten
* NPC besuchen
* Ort erreichen
* Boss besiegen
* Gespräch führen

---

# 60. Questfortschritt

Questfortschritt wird serverseitig gespeichert.

Ein Spieler darf seinen Fortschritt nicht durch Clientmanipulation verändern können.

---

# 61. Story-Quests

Main-Story-Quests können Voraussetzungen besitzen.

Dadurch kann verhindert werden, dass Spieler Inhalte in falscher Reihenfolge erreichen.

---

# 62. Klassenquests

Klassenquests verwenden dasselbe Questframework.

Die dadurch erlernten besonderen Fähigkeiten werden anschließend über das Fähigkeitssystem verwaltet.

---

# 63. Weltserver

Die Spielwelt wird nicht als ein einzelner unstrukturierter Prozess aufgebaut.

Sie wird logisch in Bereiche unterteilt.

```text
World
 ├── Zone
 │    ├── Region
 │    ├── NPCs
 │    ├── Creatures
 │    └── Players
 └── ...
```

---

# 64. Zonen

Zonen ermöglichen:

* bessere Performance
* Streaming
* Verwaltung von NPCs
* Spawnkontrolle
* Questbereiche
* Levelbereiche

---

# 65. World Streaming

Nicht die komplette Welt muss gleichzeitig vollständig geladen werden.

Client und Server können relevante Bereiche dynamisch laden beziehungsweise verwalten.

---

# 66. Sichtweite

Spieler sollen nur die für ihre Umgebung relevanten Objekte erhalten.

Dadurch wird Netzwerkverkehr reduziert.

---

# 67. Interest Management

Der Server muss bestimmen, welche Objekte ein Spieler tatsächlich benötigt.

Beispielsweise:

Ein Spieler in einem Wald muss nicht sämtliche NPCs einer weit entfernten Zone erhalten.

---

# 68. Netzwerkoptimierung

Über das Netzwerk werden bevorzugt Zustandsänderungen übertragen.

Nicht jedes visuelle Detail muss synchronisiert werden.

Beispielsweise:

> Schleim-Verformung

kann lokal aus der synchronisierten Bewegung berechnet werden.

---

# 69. Server-Tick

Der Server arbeitet mit einem festen Simulationsrhythmus.

Dadurch bleiben:

* Kampf
* Bewegung
* AI
* Fressmechanik

deterministischer und besser synchronisierbar.

Die konkrete Tickrate wird während der technischen Prototypen bestimmt.

---

# 70. Client-Framerate

Die Darstellung läuft unabhängig von der Server-Tickrate.

Die Client-Framerate darf nicht von der Serverupdatefrequenz abhängig sein.

---

# 71. Animation

Animationen werden möglichst lokal auf dem Client abgespielt.

Der Server muss nicht jede einzelne Animationsphase kennen.

Der Server muss nur relevante Zustände kennen.

---

# 72. Animation State Machine

Der Schleim benötigt eine eigene Animationslogik.

Beispielsweise:

```text
Idle
Move
FastMove
Attack
Eat
Hit
Death
Respawn
SpecialAbility
```

---

# 73. Animation und Bewegung

Die Animation darf nicht unabhängig von der tatsächlichen Bewegung wirken.

Die Körperverformung muss mit:

* Geschwindigkeit
* Richtung
* Beschleunigung

verbunden werden.

---

# 74. VFX

Visuelle Effekte werden überwiegend clientseitig erzeugt.

Dazu gehören:

* Fähigkeiten
* Treffer
* Fressversuch
* Level-Up
* besondere Bossfähigkeiten

---

# 75. Audio

Audioevents werden ebenfalls aus Gameplayzuständen ausgelöst.

Beispiele:

```text
AbilityStarted
Hit
EatSuccess
EatFail
LevelUp
Death
QuestComplete
```

---

# 76. Asset-Struktur

Assets müssen logisch organisiert werden.

Beispiel:

```text
Assets/
 ├── Characters/
 ├── Creatures/
 ├── NPCs/
 ├── Environment/
 ├── UI/
 ├── VFX/
 ├── Audio/
 ├── Animations/
 └── Items/
```

---

# 77. Datenstruktur

Spieldefinitionen sollten getrennt von visuellen Assets gespeichert werden.

Beispielsweise:

```text
Data/
 ├── Creatures/
 ├── Abilities/
 ├── Items/
 ├── Quests/
 ├── Talents/
 ├── Classes/
 └── Zones/
```

---

# 78. ID-System

Alle wichtigen Spielobjekte benötigen stabile IDs.

Beispiele:

```text
CREATURE_WOLF
ABILITY_BITE
QUEST_WOLF_HUNT
ITEM_HEALTH_POTION
```

Die konkrete Namenskonvention wird zentral festgelegt und konsequent eingehalten.

---

# 79. Versionierung von Daten

Spielerdaten und Spieldaten müssen voneinander getrennt versionierbar sein.

Wenn sich beispielsweise ein Item verändert, dürfen bestehende Charakterdaten nicht unbrauchbar werden.

---

# 80. Save-System

Spielerdaten müssen regelmäßig gespeichert werden.

Kritische Änderungen dürfen nicht ausschließlich im Clientzustand verbleiben.

---

# 81. Fehlerbehandlung

Server und Client benötigen eine robuste Fehlerbehandlung.

Ein einzelner Fehler darf möglichst nicht:

* Charakterdaten zerstören
* eine ganze Zone herunterfahren
* andere Spieler beeinflussen

---

# 82. Logging

Serverseitig müssen wichtige Ereignisse protokolliert werden.

Beispiele:

* Login
* Logout
* Level-Up
* Fressversuch
* Bosskill
* Itemerhalt
* Handel
* Questabschluss
* Tod

---

# 83. Debug-System

Während der Entwicklung benötigt das Spiel interne Debugwerkzeuge.

Diese müssen unter anderem ermöglichen:

* Kreaturen erzeugen
* NPCs erzeugen
* Level setzen
* Items vergeben
* Fähigkeiten vergeben
* Quests abschließen
* Positionen prüfen
* Fresswahrscheinlichkeiten testen

---

# 84. Entwicklerbefehle

Entwicklerbefehle dürfen nur in Entwicklungsumgebungen oder mit entsprechenden Berechtigungen verfügbar sein.

Sie dürfen nicht versehentlich im Livebetrieb offenstehen.

---

# 85. Testbarkeit

Jedes zentrale System muss isoliert getestet werden können.

Insbesondere:

* Bewegung
* Fressmechanik
* Kampf
* Fähigkeiten
* Quests
* Inventar
* Handel
* Levelsystem
* Gruppen

---

# 86. Schleim-Prototyp

Der allererste technische Prototyp sollte sich auf den Schleim konzentrieren.

Er benötigt zunächst nur:

* 3D-Schleim
* Kamera
* Klickbewegung
* Navigation
* Geschwindigkeit
* Verformung
* einfache Kollision

Noch kein vollständiges MMORPG.

---

# 87. Bewegungs-Prototyp

Der Bewegungsprototyp muss folgende Fragen beantworten:

* Fühlt sich Klickbewegung gut an?
* Ist die Beschleunigung angenehm?
* Wirkt die Verformung glaubwürdig?
* Ist der Schleim bei hoher Geschwindigkeit kontrollierbar?
* Funktioniert die Kamera?
* Ist der Schleim jederzeit gut sichtbar?

---

# 88. Fress-Prototyp

Danach wird die zentrale Fressmechanik prototypisiert:

```text
Schleim
 ↓
Wolf
 ↓
Annäherung
 ↓
Umschlingen
 ↓
Erfolg / Fehlschlag
```

---

# 89. Multiplayer-Prototyp

Erst nachdem Bewegung und Fressen überzeugend funktionieren, wird die Multiplayer-Synchronisation darauf aufgebaut.

Dabei wird getestet:

* zwei Spieler
* Bewegung
* Zielauswahl
* Kreaturen
* Kampf
* Fressen

---

# 90. Skalierbarkeit

Die Architektur muss von Anfang an darauf ausgelegt werden, später wesentlich mehr Spieler und Inhalte zu unterstützen.

Dabei wird zwischen:

* Prototyp
* Alpha
* Beta
* Livebetrieb

unterschieden.

Die frühe Version muss nicht sofort die endgültige MMO-Skalierung erreichen.

---

# 91. Serverinstanzen

Die Welt kann technisch auf mehrere Serverprozesse beziehungsweise Instanzen verteilt werden.

Das Ziel ist:

> Ein Spieler soll möglichst wenig von dieser technischen Aufteilung bemerken.

---

# 92. Zonenwechsel

Bei einem technischen Serverwechsel muss der Charakterzustand sicher übertragen werden.

Dabei dürfen insbesondere nicht verloren gehen:

* Items
* Gold
* Erfahrung
* Questfortschritt
* Level
* Fähigkeiten

---

# 93. Login

Beim Login:

```text
Client
 ↓
Authentifizierung
 ↓
Charakterauswahl
 ↓
Charakterdaten laden
 ↓
Weltserver auswählen
 ↓
Charakter in Welt einfügen
 ↓
Spiel starten
```

---

# 94. Logout

Beim Logout müssen relevante Charakterdaten gespeichert werden.

Der Server entfernt den Charakter anschließend sauber aus der Welt.

---

# 95. Verbindungsabbruch

Bei einem unerwarteten Verbindungsabbruch darf der Charakter nicht sofort dauerhaft verloren gehen.

Der Server muss den Spielerzustand kontrolliert behandeln.

---

# 96. Reconnect

Nach einer erneuten Verbindung soll der Spieler möglichst seinen letzten gültigen Charakterzustand wiederherstellen können.

---

# 97. Sicherheit

Serverseitig müssen insbesondere folgende Systeme geschützt werden:

* Inventar
* Gold
* Handel
* Erfahrung
* Level
* Fähigkeiten
* Talente
* Questfortschritt

---

# 98. Anti-Cheat-Grundprinzip

Alle kritischen Aktionen werden serverseitig validiert.

Der Client ist niemals die Quelle der Wahrheit.

---

# 99. Performance-Ziele

Performance muss insbesondere in diesen Bereichen überwacht werden:

* Schleimverformung
* viele Kreaturen
* viele Spieler
* VFX
* Animationen
* Netzwerkverkehr
* UI
* große Zonen

---

# 100. Performanceprofiling

Während der Entwicklung müssen regelmäßig Profile erstellt werden.

Nicht erst kurz vor Veröffentlichung.

---

# 101. LOD-System

3D-Objekte benötigen unterschiedliche Detailstufen.

Besonders wichtig bei:

* Kreaturen
* NPCs
* Gebäuden
* Umgebung
* Spielern

---

# 102. Animation LOD

Nicht jede entfernte Kreatur benötigt dieselbe Animationsqualität wie eine Kreatur direkt neben dem Spieler.

Animationen können abhängig von Entfernung reduziert werden.

---

# 103. VFX-Limitierung

Viele gleichzeitig aktive Effekte dürfen die Performance nicht zerstören.

Effekte müssen daher abhängig von Entfernung und Anzahl optimiert werden.

---

# 104. Netzwerk-Limitierung

Nicht jede Information muss mit derselben Häufigkeit synchronisiert werden.

Beispielsweise:

### hohe Priorität

* Kampf
* Spielerbewegung
* Ziel
* HP

### niedrigere Priorität

* entfernte NPC-Details
* kosmetische Animationen
* entfernte Umgebung

---

# 105. Technische Prioritäten

Die Entwicklung soll technisch in dieser Reihenfolge priorisiert werden:

1. Schleimbewegung
2. Schleimverformung
3. Kamera
4. Fressmechanik
5. grundlegender Kampf
6. Multiplayer-Synchronisation
7. Charakterdaten
8. Fähigkeiten
9. Quests
10. Welt
11. restliche MMORPG-Systeme

---

# 106. Was technisch niemals Client-only sein darf

Folgende Werte dürfen nicht ausschließlich vom Client kontrolliert werden:

* Level
* XP
* HP
* Mana
* Gold
* Inventar
* Itembesitz
* Fähigkeiten
* Talente
* Questfortschritt
* Fresserfolg
* Loot
* Handel

---

# 107. Architekturprinzip

SLIMORIA wird modular aufgebaut.

```text
Core
├── Networking
├── Characters
├── Creatures
├── Combat
├── Abilities
├── Progression
├── Quests
├── Inventory
├── Items
├── Groups
├── World
├── AI
├── UI
└── Persistence
```

Module sollen möglichst wenig voneinander abhängig sein.

---

# 108. Erweiterbarkeit

Das System muss später neue Inhalte ermöglichen, ohne den Kern umzubauen.

Beispielsweise:

> Neue Kreatur

soll hauptsächlich neue Daten benötigen.

Nicht:

> Änderung an zehn verschiedenen Kernsystemen.

---

# 109. Modulare Fähigkeiten

Neue Fähigkeiten sollen über das bestehende Fähigkeitssystem hinzugefügt werden können.

Das gleiche gilt für:

* Klassenfähigkeiten
* Bossfähigkeiten
* passive Effekte
* Spezialfähigkeiten

---

# 110. Modulare Kreaturen

Neue Kreaturen müssen über ein standardisiertes Kreaturensystem eingebunden werden können.

Beispiel:

```text
Wolf
Bär
Spinne
Orc
Boss X
Boss Y
```

Alle verwenden dieselbe technische Grundlage.

---

# 111. Modulare Quests

Neue Questtypen sollen auf vorhandenen Objective-Systemen aufbauen können.

Dadurch können große Mengen an Quests erstellt werden, ohne jedes Mal neuen Code zu schreiben.

---

# 112. Technische Entwicklungsregel

Wenn ein System mehrfach dieselbe Logik benötigt, soll diese Logik zentralisiert werden.

Beispiel:

Nicht:

```text
Wolf-Kampfcode
Boss-Kampfcode
Orc-Kampfcode
```

sondern:

```text
Combat-System
    ↓
Creature Definitions
```

---

# 113. Fehlerisolierung

Ein Fehler in einem einzelnen Contentobjekt soll möglichst nicht das gesamte System beschädigen.

Beispielsweise sollte eine fehlerhafte Quest nicht den kompletten Questserver stoppen.

---

# 114. Entwicklungsumgebungen

Mindestens folgende Umgebungen sollten getrennt werden:

* Development
* Test
* Production

---

# 115. Testserver

Auf dem Testserver müssen Entwickler schnell:

* Charaktere erstellen
* Level verändern
* Items erzeugen
* Bosse spawnen
* Fähigkeiten testen
* Quests überspringen

können.

---

# 116. Automatisierte Tests

Für kritische Systeme sollen automatisierte Tests existieren.

Besonders:

* Inventar
* Handel
* Level
* XP
* Fressberechnung
* Fähigkeiten
* Questfortschritt

---

# 117. Regressionstests

Wenn ein bestehendes System verändert wird, muss geprüft werden, ob andere Systeme weiterhin funktionieren.

Beispiel:

Eine Änderung am Levelsystem darf nicht plötzlich:

* Questbelohnungen
* Fresschance
* Gegnerstärke
* Talentpunkte

kaputtmachen.

---

# 118. Technische Wahrheit

Das Spiel muss zwischen drei Zuständen unterscheiden:

### Daten

Was der Charakter tatsächlich besitzt.

### Spielzustand

Was gerade in der Welt passiert.

### Darstellung

Was der Client dem Spieler zeigt.

Diese drei Ebenen dürfen nicht unkontrolliert vermischt werden.

---

# 119. Beispiel: Fressen

```text
DATEN
Wolf = Level 8, 40% HP

        ↓

SPIELZUSTAND
Fressversuch gestartet

        ↓

SERVER
Chance berechnet

        ↓

DATENÄNDERUNG
Wolf entfernt
Belohnung vergeben

        ↓

DARSTELLUNG
Fressanimation
```

---

# 120. Technisches Kernprinzip von SLIMORIA

Die gesamte technische Architektur folgt einem zentralen Grundsatz:

> **Der Server bestimmt, was passiert. Der Client macht es sichtbar.**

Für SLIMORIA kommt ein zweiter Grundsatz hinzu:

> **Die technisch komplexeste Darstellung des Spiels ist nicht die MMO-UI, sondern der Schleim selbst.**

Die Bewegungs-, Verformungs- und Fresssysteme müssen deshalb frühzeitig als eigene technische Kernsysteme entwickelt und optimiert werden.

---

# 121. Definition of Done für die technische Basis

Die technische Grundlage gilt erst als ausreichend, wenn ein Prototyp Folgendes zuverlässig demonstrieren kann:

* 3D-Welt
* Third-Person-Kamera
* Klickbewegung
* flüssige Schleimbewegung
* dynamische Schleimverformung
* Kreatur
* Zielauswahl
* grundlegender Angriff
* Fressversuch
* Fresserfolg
* Fressfehlschlag
* HP
* Level
* einfache Fähigkeit
* zwei gleichzeitig verbundene Spieler
* serverautoritatives Gameplay
* persistenter Charakter

Erst danach sollte die Entwicklung systematisch auf die vollständige MMORPG-Struktur erweitert werden.
