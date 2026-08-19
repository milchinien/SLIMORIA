# SLIMORIA — GDD 12: Development Roadmap

**Version:** 1.0
**Dokumenttyp:** Development Roadmap
**Projekt:** SLIMORIA

> Dieses Dokument definiert die **Reihenfolge der Entwicklung** von SLIMORIA. Es beschreibt, was wann gebaut, getestet und erweitert wird. Die einzelnen Systeme werden nicht erneut im Detail spezifiziert.

---

# 1. Entwicklungsphilosophie

SLIMORIA wird **nicht sofort als vollständiges MMORPG** entwickelt.

Die Entwicklung erfolgt schrittweise:

```text
Prototyp
↓
Vertical Slice
↓
Pre-Alpha
↓
Alpha
↓
Beta
↓
Release Candidate
↓
Launch
↓
Live-Service
```

Der wichtigste Grundsatz:

> **Jede Phase muss zuerst beweisen, dass die vorherige Phase funktioniert, bevor neue Komplexität hinzugefügt wird.**

---

# 2. Entwicklungsprioritäten

Die Priorität des Projekts lautet:

1. Schleim-Bewegung
2. Schleim-Verformung
3. Fressgefühl
4. Kampfgefühl
5. Charaktersteuerung
6. Multiplayer-Grundlage
7. Kernprogression
8. Welt
9. Quests und Story
10. MMORPG-Systeme
11. Content-Skalierung
12. Optimierung
13. Release

---

# 3. Phase 0 — Pre-Production

**Ziel:** Technische und kreative Grundlage schaffen.

### Aufgaben

* Engine auswählen
* Projektstruktur erstellen
* Versionskontrolle einrichten
* technische Architektur festlegen
* Datenstruktur vorbereiten
* Art Direction festlegen
* grundlegende Asset-Pipeline vorbereiten
* Entwicklungsstandards definieren
* GDD-Struktur als Referenz einrichten

### Ergebnis

Ein leeres, technisch sauberes SLIMORIA-Projekt, auf dem Prototypen aufgebaut werden können.

---

# 4. Phase 1 — Slime Movement Prototype

**Ziel:** Herausfinden, ob sich der Schleim tatsächlich gut anfühlt.

### Enthalten

* einfacher Schleim
* einfache Testfläche
* Third-Person-Kamera
* Klickbewegung
* Beschleunigung
* Abbremsen
* Richtungswechsel
* dynamische Verformung
* grundlegende Kollision

### Nicht enthalten

* MMORPG
* Quests
* Klassen
* vollständige Welt
* komplexer Kampf
* Inventar
* Progression

### Erfolgsbedingung

Der Schleim muss sich bereits in einer simplen Testarena **flüssig, kontrollierbar und befriedigend** bewegen.

---

# 5. Phase 2 — Slime Combat Prototype

**Ziel:** Den eigentlichen Gameplay-Loop testen.

```text
Bewegen
↓
Kreatur finden
↓
Kämpfen
↓
HP reduzieren
↓
Fressen versuchen
↓
Erfolg / Fehlschlag
↓
Belohnung
```

### Enthalten

* einfache Kreatur
* grundlegender Angriff
* HP
* Schaden
* Fressmechanik
* Fressanimation
* Erfolg
* Fehlschlag
* einfache Belohnung

### Erfolgsbedingung

Der Spieler soll bereits verstehen:

> „Ich kämpfe den Gegner herunter und versuche anschließend, ihn zu fressen.“

---

# 6. Phase 3 — Multiplayer Prototype

**Ziel:** Prüfen, ob der zentrale Gameplay-Loop multiplayerfähig ist.

### Enthalten

* zwei oder mehr Spieler
* synchronisierte Schleimbewegung
* Kreaturen
* Kampf
* Fressversuche
* grundlegende Spielerinteraktion

### Schwerpunkt

* Synchronisation
* Latenz
* Server Authority
* Bewegung
* Fressmechanik

### Erfolgsbedingung

Mehrere Spieler können gleichzeitig in derselben Testwelt spielen, ohne dass die zentrale Schleimbewegung oder der Kampf unzuverlässig wirken.

---

# 7. Phase 4 — Character Prototype

**Ziel:** Aus dem technischen Schleim einen echten SLIMORIA-Charakter machen.

### Enthalten

* Charaktererstellung
* Name
* Gesichtsanpassung
* Fraktion
* Klasse
* Level
* grundlegende Werte
* Fähigkeiten
* Hotbar

### Ergebnis

Ein Spieler kann einen vollständigen Testcharakter erstellen und damit spielen.

---

# 8. Phase 5 — Progression Prototype

**Ziel:** Überprüfen, ob sich Fortschritt langfristig gut anfühlt.

### Enthalten

* Levelsystem
* Erfahrung
* Größenentwicklung
* Statentwicklung
* Fähigkeiten
* Ressourcen
* Talentpunkte
* grundlegende Ausrüstung

### Schwerpunkt

Das Spiel muss vermitteln:

> **„Mein Schleim wird stärker.“**

und gleichzeitig:

> **„Mein Charakter wird immer mächtiger, ohne dass Fortschritt bedeutungslos wird.“**

---

# 9. Phase 6 — Creature & Boss Prototype

**Ziel:** Das einzigartige Fress- und Evolutionssystem auf eine größere Anzahl von Kreaturen übertragen.

### Enthalten

* mehrere Kreaturen
* unterschiedliche Eigenschaften
* Fressfortschritt
* abnehmende Effektivität wiederholter Kreaturen
* Bosse
* Bossfähigkeiten
* unterschiedliche Seltenheiten
* Fähigkeiten durch Fressen

### Erfolgsbedingung

Der Spieler soll beginnen, eigene Ziele zu entwickeln:

> „Diese Kreatur möchte ich farmen.“

oder:

> „Diesen Boss brauche ich für diese Fähigkeit.“

---

# 10. Phase 7 — First Playable Zone

**Ziel:** Aus den Systemen eine tatsächlich spielbare Welt machen.

### Enthalten

* erste Zone
* Umgebung
* Kreaturen
* NPCs
* Questgeber
* Gegner
* Dörfer
* erste Questkette
* erste Storyabschnitte

### Ergebnis

Ein neuer Spieler kann:

```text
Charakter erstellen
↓
Startgebiet betreten
↓
Quests annehmen
↓
Kämpfen
↓
Fressen
↓
Leveln
↓
Fähigkeiten erhalten
↓
Gebiet verlassen
```

---

# 11. Phase 8 — First Vertical Slice

**Ziel:** Eine kleine Version von SLIMORIA produzieren, die bereits wie das fertige Spiel wirkt.

Der Vertical Slice enthält:

* funktionierende Schleimbewegung
* hochwertige Animationen
* vollständigen grundlegenden Kampf
* Fressmechanik
* mindestens eine Klasse
* Progression
* Quests
* eine ausgearbeitete Zone
* NPCs
* UI
* Audio
* VFX
* Multiplayer
* grundlegende Persistenz

### Wichtig

Der Vertical Slice dient nicht dazu, möglichst viel Content zu enthalten.

Er soll zeigen:

> **„So fühlt sich SLIMORIA als fertiges Spiel an.“**

---

# 12. Phase 9 — Full Core Systems

**Ziel:** Alle wichtigen Spielsysteme auf Produktionsniveau bringen.

Jetzt werden die bereits konzipierten Systeme vollständig miteinander verbunden.

Dazu gehören unter anderem:

* alle Klassen
* Talente
* Progression
* Kreaturen
* Bosse
* Fähigkeiten
* Quests
* Inventar
* Ausrüstung
* Gruppen
* Handel
* Bestiarium
* Tränke
* Mounts
* Fraktionen

---

# 13. Phase 10 — Faction Content

**Ziel:** Beide Fraktionen vollständig spielbar machen.

### Fraktion A

* Startgebiet
* weitere Gebiete
* Hauptstadt
* NPCs
* Quests
* Gegner
* Fraktionsgeschichte

### Fraktion B

* Startgebiet
* weitere Gebiete
* Hauptstadt
* NPCs
* Quests
* Gegner
* Fraktionsgeschichte

### Ziel

Beide Fraktionen sollen sich deutlich unterschiedlich anfühlen, ohne dass eine Seite spielerisch grundsätzlich benachteiligt wird.

---

# 14. Phase 11 — World Expansion

**Ziel:** Die Spielwelt von einem Prototyp zu einer echten MMORPG-Welt erweitern.

### Aufgaben

* zusätzliche Zonen
* Städte
* Dörfer
* Dungeons beziehungsweise besondere Gebiete
* neue Kreaturen
* neue Bosse
* neue Questketten
* neue Storyabschnitte
* versteckte Inhalte
* höherstufige Gebiete

---

# 15. Phase 12 — Content Pipeline

**Ziel:** SLIMORIA muss in großem Umfang mit neuen Inhalten erweitert werden können.

Dafür wird eine Produktionspipeline aufgebaut für:

* Kreaturen
* Bosse
* Fähigkeiten
* Items
* Quests
* NPCs
* Gebiete
* Weltobjekte
* VFX
* Animationen

Der Fokus liegt darauf, neue Inhalte effizient produzieren zu können.

---

# 16. Phase 13 — Alpha

**Ziel:** Das gesamte Spiel ist grundsätzlich spielbar.

Die Alpha muss bereits den vollständigen grundlegenden Gameplay-Loop enthalten.

### Fokus

* Systemintegration
* Multiplayer
* Progression
* Welt
* Quests
* Klassen
* Fressen
* Bosse
* Persistenz

Noch nicht erforderlich:

* endgültige Menge an Content
* perfekte Balance
* finale Optimierung

---

# 17. Phase 14 — Content Alpha

**Ziel:** Die meisten geplanten Inhalte sind vorhanden.

Jetzt werden insbesondere:

* Gebiete
* Quests
* Kreaturen
* Bosse
* Fähigkeiten
* Items
* Story

massiv erweitert.

---

# 18. Phase 15 — Closed Beta

**Ziel:** Tests mit einer begrenzten Anzahl echter Spieler.

### Fokus

* Serverstabilität
* Multiplayer
* Progression
* Economy
* Questfortschritt
* Klassenbalance
* Fressbalance
* Bossbalance
* Fehler
* Exploits

---

# 19. Phase 16 — Open Beta

**Ziel:** Belastung unter realistischeren Spielerzahlen.

### Fokus

* Serverkapazität
* Netzwerk
* Login
* Charakterpersistenz
* große Spielergruppen
* Wirtschaft
* Performance
* technische Stabilität

---

# 20. Phase 17 — Release Candidate

**Ziel:** Das Spiel ist technisch bereit für Veröffentlichung.

Es dürfen keine kritischen Fehler mehr bestehen.

### Prüfung

* Serverstabilität
* Datenverlust
* Charakterdaten
* Handel
* Progression
* Quests
* Kampf
* Fressen
* Klassen
* UI
* Performance

---

# 21. Phase 18 — Launch

**Ziel:** Veröffentlichung von SLIMORIA.

Der Launch sollte nicht gleichzeitig mit einer riesigen Menge zusätzlicher Systeme erfolgen.

Priorität:

> **Stabilität vor zusätzlichem Content.**

---

# 22. Phase 19 — Live Development

Nach dem Launch beginnt die langfristige Entwicklung.

Mögliche Erweiterungen:

* neue Gebiete
* neue Kreaturen
* neue Bosse
* neue Fähigkeiten
* neue Questketten
* neue Story
* neue Systeme
* Balancing
* Events

---

# 23. Entwicklungsreihenfolge der wichtigsten Systeme

| Priorität | System            |
| --------: | ----------------- |
|         1 | Schleimbewegung   |
|         2 | Schleimverformung |
|         3 | Kamera            |
|         4 | Kampf             |
|         5 | Fressen           |
|         6 | Multiplayer       |
|         7 | Charakter         |
|         8 | Progression       |
|         9 | Kreaturen         |
|        10 | Bosse             |
|        11 | Quests            |
|        12 | Welt              |
|        13 | Klassen           |
|        14 | MMORPG-Systeme    |
|        15 | Content           |
|        16 | Optimierung       |

---

# 24. Milestone-Struktur

Jede größere Entwicklungsphase erhält einen klaren Milestone.

```text
M0  — Pre-Production
M1  — Slime Prototype
M2  — Combat Prototype
M3  — Multiplayer Prototype
M4  — Character Prototype
M5  — Progression Prototype
M6  — Creature/Boss Prototype
M7  — First Playable
M8  — Vertical Slice
M9  — Full Systems
M10 — Alpha
M11 — Beta
M12 — Release Candidate
M13 — Launch
```

---

# 25. Wichtigste Abnahmekriterien

Ein Milestone wird nicht abgeschlossen, nur weil das Feature technisch existiert.

Es muss:

* funktionieren
* stabil sein
* mit anderen Systemen funktionieren
* sich gut anfühlen
* testbar sein

Insbesondere beim Schleim gilt:

> **„Funktioniert“ reicht nicht. Die Bewegung muss sich gut anfühlen.**

---

# 26. Entwicklungsregel für SLIMORIA

Neue Systeme werden erst hinzugefügt, wenn die bestehenden Kernsysteme ausreichend stabil sind.

Nicht:

```text
10 halbfertige Systeme
```

sondern:

```text
1 funktionierendes System
↓
testen
↓
verbessern
↓
nächstes System
```

---

# 27. Technische Prototypen vs. Produktionssysteme

Ein Prototyp darf temporären Code besitzen.

Sobald ein System in die Produktionsphase übernommen wird, muss es:

* strukturiert
* erweiterbar
* dokumentiert
* testbar

sein.

---

# 28. Entwicklungsfokus

Die Entwicklung von SLIMORIA darf sich nicht ausschließlich auf die Menge der Features konzentrieren.

Die wichtigsten Qualitätsmerkmale sind:

### 1. Schleimgefühl

Der Schleim muss sich einzigartig bewegen.

### 2. Fressgefühl

Das Fressen muss befriedigend und spannend sein.

### 3. Progression

Stärkerwerden muss langfristig motivieren.

### 4. Build-Vielfalt

Klassen und gefressene Eigenschaften müssen unterschiedliche Spielweisen ermöglichen.

### 5. Welt

Die Welt muss sich wie eine echte Fantasywelt anfühlen.

### 6. MMORPG-Gefühl

Andere Spieler müssen Teil der Welt sein, nicht nur zufällige Figuren.

---

# 29. Langfristiges Entwicklungsziel

Das fertige SLIMORIA soll technisch und spielerisch den folgenden Übergang ermöglichen:

```text
„Ich probiere einen Schleim aus.“
             ↓
„Ich werde stärker.“
             ↓
„Ich entdecke neue Fähigkeiten.“
             ↓
„Ich entwickle meinen eigenen Build.“
             ↓
„Ich suche bestimmte Kreaturen.“
             ↓
„Ich farme bestimmte Bosse.“
             ↓
„Ich werde immer stärker.“
             ↓
„Ich habe meinen eigenen Schleim-Build.“
             ↓
„Ich spiele SLIMORIA als langfristiges MMORPG.“
```

---

# 30. Abschlusskriterium des Projekts

SLIMORIA ist nicht dann erfolgreich umgesetzt, wenn sämtliche geplanten Systeme technisch vorhanden sind.

Das eigentliche Ziel ist erreicht, wenn ein Spieler:

> **seinen Schleim erstellt, ihn durch die Welt bewegt, Kreaturen bekämpft und frisst, Fähigkeiten und Eigenschaften sammelt, seinen eigenen Build entwickelt, Quests verfolgt, mit anderen Spielern interagiert und nach vielen Spielstunden das Gefühl hat, dass dieser Schleim tatsächlich „sein“ Charakter geworden ist.**

Das ist der zentrale Maßstab für alle Entwicklungsphasen.
