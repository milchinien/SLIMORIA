# SLIMORIA — GDD 10: UI, UX & Controls

**Version:** 1.0
**Dokumenttyp:** UI, UX & Controls
**Projekt:** SLIMORIA

> **Scope:** Dieses Dokument definiert die Benutzeroberfläche, Bedienung, Informationsdarstellung und grundlegende User Experience von SLIMORIA.
> Die zugrunde liegenden Spielsysteme werden hier nicht erneut definiert.

---

# 1. Ziel der Benutzeroberfläche

Die UI von SLIMORIA soll sich grundsätzlich an der Verständlichkeit klassischer MMORPGs orientieren, insbesondere an einer klaren, dauerhaft lesbaren Informationsstruktur.

Gleichzeitig muss sie die besondere Identität des Spiels unterstützen:

> **Der Spieler steuert einen Schleim.**

Die UI darf deshalb niemals den eigentlichen Schleim, seine Animationen oder die Welt unnötig verdecken.

---

# 2. Grundprinzipien

Die UI folgt sechs Hauptprinzipien:

1. **Klarheit**
2. **Schnelle Informationsaufnahme**
3. **MMORPG-Vertrautheit**
4. **Minimale Bildschirmüberladung**
5. **Schneller Zugriff auf häufig benötigte Funktionen**
6. **Fokus auf den Schleim und die Spielwelt**

---

# 3. Grundaufbau

Die grundlegende HUD-Struktur orientiert sich an klassischen MMORPGs.

Die wichtigsten Bereiche sind:

```text
┌──────────────────────────────────────────────┐
│                                     Minimap  │
│                              Quest Tracking  │
│                                              │
│                 SPIELWELT                    │
│                                              │
│                                              │
│                                              │
│ Gruppe                                       │
│                                              │
│ HP / Ressourcen                              │
│                                              │
│         [1][2][3][4][5][6][7][8][9][10]      │
└──────────────────────────────────────────────┘
```

Die genaue Position einzelner Elemente kann später angepasst werden.

---

# 4. HUD

Das HUD ist die dauerhaft sichtbare Benutzeroberfläche während des normalen Spiels.

Es enthält hauptsächlich:

* eigenen Charakterstatus
* Gruppenstatus
* Quest-Tracker
* Hotbar
* relevante Ressourcen
* Minimap
* wichtige Kontextinformationen

---

# 5. Spielerstatus

Der eigene Charakterstatus muss jederzeit schnell erfassbar sein.

Mindestens sichtbar:

* HP
* Mana beziehungsweise Klassenressource
* Level
* Erfahrung
* Charaktername

Die Darstellung muss deutlich machen, wenn sich der Zustand des Spielers kritisch verändert.

---

# 6. Levelanzeige

Das aktuelle Level ist dauerhaft oder sehr schnell erreichbar sichtbar.

Zusätzlich wird der Fortschritt zum nächsten Level dargestellt.

Beispiel:

> **Level 10**
> ███████░░░ 72 %

Dadurch kann der Spieler jederzeit nachvollziehen, wie weit er vom nächsten Level entfernt ist.

---

# 7. Größenentwicklung

Da die Größe des Schleims an seine Levelentwicklung gekoppelt ist, soll der Spieler seinen Level und damit seine Größenentwicklung nachvollziehen können.

Die UI muss jedoch nicht ständig eine numerische Größe anzeigen.

Das visuelle Wachstum soll primär **in der Spielwelt** wahrgenommen werden.

---

# 8. HP

Die HP-Leiste muss prominent und eindeutig sichtbar sein.

Sie soll:

* aktuellen Zustand zeigen
* maximalen Wert vermitteln
* kritische Gesundheit deutlich erkennbar machen

---

# 9. Mana

Mana ist für entsprechende Klassen eine wichtige Ressource.

Die UI muss daher den aktuellen Mana-Wert klar darstellen.

Beispiel:

> **Mana: 740 / 1.000**

---

# 10. Klassenressourcen

Klassen, die nicht Mana verwenden, erhalten eine entsprechende Ressourcendarstellung.

Beispiele:

### Krieger

> Wut

### Schurke

> Stealth-Punkte beziehungsweise die definierte klassenbezogene Ressource

Die UI muss eindeutig zeigen, welche Ressource aktuell verwendet wird.

---

# 11. Ressourcen sollen verständlich sein

Der Spieler soll ohne Öffnen eines Menüs erkennen können:

> „Kann ich diese Fähigkeit gerade benutzen?“

Die Ressource muss deshalb direkt mit der Verfügbarkeit der Fähigkeiten zusammenarbeiten.

---

# 12. Hotbar

Die Hotbar ist eines der wichtigsten HUD-Elemente.

Sie besitzt **10 Hauptslots**:

```text
[1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
```

Die Slots werden über die entsprechenden Hotkeys aktiviert.

---

# 13. Hotbar ist keine reine Fähigkeitenleiste

Die Hotbar kann unterschiedliche interaktive Elemente enthalten.

Dazu gehören:

* Fähigkeiten
* Tränke
* Mounts
* andere verwendbare Aktionen

Passive Effekte gehören nicht auf die Hotbar.

---

# 14. Fähigkeiten auf der Hotbar

Aktive Fähigkeiten werden auf der Hotbar durch Icons dargestellt.

Eine Fähigkeit kann beispielsweise zeigen:

* Icon
* Abklingzeit
* Ressourcenverbrauch
* Tastenkürzel
* momentane Verfügbarkeit

---

# 15. Abklingzeiten

Wenn eine Fähigkeit auf Cooldown ist, muss dies sofort erkennbar sein.

Die UI soll beispielsweise:

* das Icon abdunkeln
* verbleibende Zeit anzeigen
* die erneute Verfügbarkeit deutlich machen

---

# 16. Ressourcenanforderungen

Kann eine Fähigkeit wegen fehlender Ressource nicht benutzt werden, muss dies visuell verständlich sein.

Der Spieler soll nicht erst ausprobieren müssen, warum eine Fähigkeit nicht funktioniert.

---

# 17. Hotbar-Interaktion

Die Hotbar soll sowohl per Tastatur als auch per Maus bedienbar sein.

Die Hauptbedienung erfolgt jedoch über die Hotkeys.

Dadurch kann der Spieler schnell reagieren, ohne die Maus von der Welt wegbewegen zu müssen.

---

# 18. Fress-Taste

Die Fressmechanik erhält eine eigene wichtige Interaktion.

Der Spieler soll eine dedizierte Taste besitzen, beispielsweise:

> **E = Fressen**

Die konkrete Taste kann später konfigurierbar sein.

Die Fressfunktion muss leicht erreichbar sein, da sie eine Kernmechanik von SLIMORIA ist.

### E ist ausschließlich für das Fressen reserviert

Die Fresstaste wird **nicht** zusätzlich mit anderen Funktionen belegt.

Weltinteraktion (NPCs, Objekte, Questgeber) liegt auf einer eigenen Taste:

> **F = Interagieren**

Der Grund ist die Fehlbedienungsgefahr:

Wenn dieselbe Taste je nach Kontext einmal einen Fressversuch und einmal ein Händlergespräch auslöst, kann der Spieler in einer Siedlung versehentlich eine Kreatur angreifen — oder mitten im Kampf ein Dialogfenster öffnen.

Da ein fehlgeschlagener Fressversuch laut **GDD 01 §30** Schaden verursachen kann, wäre eine kontextabhängige Doppelbelegung an dieser Stelle besonders teuer.

> **Regel: Eine Kernmechanik mit Risiko bekommt eine eindeutige Taste.**

---

# 19. Fressbarkeit

Wenn ein Ziel gefressen werden kann beziehungsweise der Versuch sinnvoll ausführbar ist, muss die UI den Spieler nicht mit großen Overlays überladen.

Die wichtigste Information soll über:

* Zielanzeige
* Zielzustand
* Kontextfeedback

verständlich werden.

---

# 20. Zielsystem

SLIMORIA verwendet ein klassisches MMORPG-Zielsystem.

Der Spieler kann beispielsweise einen Gegner mit der Maus auswählen.

Die UI zeigt anschließend relevante Informationen über das Ziel.

---

# 21. Zielanzeige

Das aktuelle Ziel soll mindestens darstellen:

* Name
* Level
* HP
* gegebenenfalls weitere relevante Zustände

Beispiel:

> **Wolf — Level 8**
> ██████░░░░ 63 %

---

# 22. Ziel und Fresschance

Da die Fressmechanik stark vom Zustand des Gegners abhängt, muss der Spieler ausreichend Informationen erhalten, um seine Situation einschätzen zu können.

Die exakte Fresschance muss nicht zwingend als Prozentzahl angezeigt werden.

Das Spiel soll nicht jede Entscheidung vollständig automatisieren.

---

# 23. Gegnerische Statusinformationen

Relevante Zustände eines Gegners können über die Zielanzeige vermittelt werden.

Dazu gehören beispielsweise:

* HP
* Level
* aktive Debuffs
* relevante Kampfzustände

---

# 24. Quest-Tracker

Der Quest-Tracker befindet sich standardmäßig am rechten Bildschirmrand.

Er zeigt aktive Questziele kompakt an.

Beispiel:

> **Wölfe im Wald**
> Töte 10 Wölfe — **2/10**

---

# 25. Quest-Tracker-Struktur

Ein Quest-Eintrag besteht mindestens aus:

* Questname
* kurzer Zielbeschreibung
* aktuellem Fortschritt

Die vollständige Questbeschreibung befindet sich im Questlog.

---

# 26. Viele aktive Quests

Der Spieler soll mehrere Side Quests gleichzeitig verfolgen können.

Der Quest-Tracker muss deshalb mit vielen aktiven Quests umgehen können, ohne die Spielwelt vollständig zu verdecken.

---

# 27. Quest-Fortschrittsaktualisierung

Questfortschritt wird automatisch aktualisiert.

Beispiel:

> Töte 10 Wölfe — 2/10

wird nach dem nächsten Kill zu:

> Töte 10 Wölfe — 3/10

Der Spieler erhält dadurch unmittelbares Feedback.

---

# 28. Questabschluss

Wenn ein Questziel vollständig erreicht wurde, muss dies klar erkennbar sein.

Der Spieler soll sofort erkennen:

> **Diese Quest ist fertig.**

Die genaue visuelle Umsetzung kann beispielsweise über einen veränderten Queststatus erfolgen.

---

# 29. Questlog

Das Questlog ist das zentrale Menü für sämtliche aktiven und relevanten abgeschlossenen Quests.

Es ermöglicht:

* aktive Quests anzeigen
* Questdetails lesen
* Ziele überprüfen
* Belohnungen ansehen
* abgeschlossene Quests nachvollziehen

---

# 30. Questkategorien

Quests sollen im Questlog mindestens unterscheidbar sein nach:

* Main Story
* Side Quest
* Klassenquest

Dadurch bleibt der Hauptstorypfad auch bei vielen Side Quests auffindbar.

---

# 31. Main Story hervorheben

Die Main Story soll visuell eindeutig von normalen Side Quests unterscheidbar sein.

Der Spieler muss auch dann schnell erkennen können:

> **„Welche Quest gehört zur Hauptgeschichte?“**

---

# 32. Quest-Level

Quest-Empfehlungen beziehungsweise Levelbereiche sollen sichtbar sein.

Beispiel:

> **[12] Die vergessene Straße**

Dadurch kann der Spieler schnell beurteilen, ob eine Aufgabe zu seinem aktuellen Fortschritt passt.

---

# 33. Minimap

Die Minimap unterstützt die Orientierung innerhalb des aktuellen Gebietes.

Sie soll wichtige Informationen darstellen können, ohne die Weltkarte vollständig zu ersetzen.

---

# 34. Minimap-Funktionen

Die Minimap kann unter anderem zeigen:

* Spielerposition
* Richtung
* wichtige NPCs
* Questziele
* relevante Orte
* Gruppenmitglieder

---

# 35. Weltkarte

Zusätzlich zur Minimap besitzt das Spiel eine größere Weltkarte.

Die Weltkarte soll:

* Regionen darstellen
* bekannte Orte anzeigen
* Städte zeigen
* Orientierung ermöglichen
* Reiseplanung unterstützen

---

# 36. Karte und Erkundung

Die Karte soll nicht automatisch jeden unbekannten Ort vollständig offenlegen.

Erkundung soll weiterhin eine Rolle spielen.

---

# 37. Gruppenanzeige

Gruppenmitglieder werden links im HUD unter beziehungsweise neben dem eigenen Charakterstatus dargestellt.

Ein Gruppenmitglied besitzt mindestens:

* Name
* HP
* Mana beziehungsweise Ressource

---

# 38. Gruppenstatus

Der Spieler muss schnell erkennen können, wenn ein Gruppenmitglied:

* wenig HP besitzt
* wenig Mana besitzt
* gestorben ist
* nicht verfügbar ist

---

# 39. Gruppeninformationen

Die Gruppenanzeige soll bewusst kompakt bleiben.

Sie darf nicht zu einem großen Teil des Bildschirms werden.

---

# 40. NPC-Interaktion

Wenn der Spieler einen NPC anspricht, öffnet sich eine Dialogoberfläche.

Diese soll mindestens enthalten:

* NPC-Name
* Dialog
* mögliche Antworten
* verfügbare Quests
* relevante Interaktionen

---

# 41. Questannahme

Bei einem Questgeber muss der Spieler klar erkennen können:

* Questname
* Aufgabe
* Belohnung
* Voraussetzungen

---

# 42. Questabgabe

Bei einer abgeschlossenen Quest muss deutlich erkennbar sein:

> **Quest abgeschlossen**

und welche Belohnungen erhalten werden.

---

# 43. NPC-Markierungen

Questgeber sollen anhand der Welt und UI schnell erkennbar sein.

Die Markierung muss unterscheiden können zwischen:

* Quest verfügbar
* Quest aktiv
* Quest abgeschlossen
* Main Story
* Klassenquest

---

# 44. Interaktionsfeedback

Wenn ein Objekt oder NPC interagierbar ist, soll der Spieler ein klares Feedback erhalten.

Beispielsweise:

> **[F] Interagieren**

Die Interaktion darf nicht ausschließlich über einen winzigen UI-Hinweis funktionieren.

---

# 45. Inventar

Das Inventar ist ein eigenes Fenster.

Es enthält unter anderem:

* Ausrüstung
* Tränke
* Gegenstände
* sonstige Items

---

# 46. Inventarstruktur

Das Inventar soll eine klassische MMORPG-Struktur besitzen.

Gegenstände werden als einzelne Slots dargestellt.

Jeder Slot kann mindestens zeigen:

* Item-Icon
* Menge
* gegebenenfalls Qualitätsstufe

---

# 47. Item-Tooltip

Beim Überfahren eines Gegenstands mit der Maus soll ein Tooltip erscheinen.

Dieser zeigt die wichtigsten Informationen des Gegenstands.

---

# 48. Ausrüstungsanzeige

Ausrüstung soll in einem separaten Charakter-/Ausrüstungsbereich dargestellt werden.

Der Spieler soll sofort erkennen können:

> **„Was trage ich gerade?“**

---

# 49. Verständliche Ausrüstungsnamen

Ausrüstung soll bereits über ihre Bezeichnung verständlich machen, wofür sie gedacht ist.

Beispiele:

> **Schwere Eisenrüstung**
> → Schutz / defensive Ausrichtung

> **Leichte Jagdrüstung**
> → offensive beziehungsweise bewegungsorientierte Ausrichtung

Die genaue Itemisierung wird nicht in diesem Dokument definiert.

---

# 50. Tränke

Tränke können im Inventar gelagert werden.

Sie können zusätzlich auf die Hotbar gelegt werden.

Dadurch kann der Spieler sie im Kampf schnell verwenden.

---

# 51. Mounts

Mounts können ebenfalls auf der Hotbar abgelegt werden.

Dadurch kann der Spieler sie schnell aktivieren.

---

# 52. Bestiarium

Das Bestiarium ist ein **eigenes Fenster**, getrennt vom normalen Inventar.

Es dokumentiert Kreaturen.

---

# 53. Bestiarium-Darstellung

Das Bestiarium soll beispielsweise eine Liste enthalten:

> Wolf
> Bär
> Spinne
> Fledermaus
> ...

Bei Auswahl einer Kreatur werden deren bekannte Informationen angezeigt.

---

# 54. Kreaturenstatistik

Das Bestiarium kann unter anderem anzeigen:

* wie oft eine Kreatur besiegt wurde
* wie oft sie gefressen wurde

Dadurch entsteht eine persönliche Statistik.

---

# 55. Bestiarium und Sammelgefühl

Das Bestiarium soll dem Spieler das Gefühl vermitteln:

> **„Ich kenne diese Welt und ihre Kreaturen.“**

Es ist kein notwendiges Kampfmenü, sondern ein langfristiges Informations- und Sammlungssystem.

---

# 56. Charaktermenü

Der Spieler benötigt ein Charakterfenster.

Dort sollen die persönlichen Charakterinformationen übersichtlich dargestellt werden.

Dazu gehören beispielsweise:

* Level
* Werte
* Ausrüstung
* relevante Charakterinformationen
* aktive Entwicklung

---

# 57. Talentfenster

Das Talent-System erhält ein eigenes Menü.

Der Spieler soll dort:

* verfügbare Talentpunkte sehen
* Talentpfade betrachten
* investierte Punkte erkennen
* mögliche nächste Talente sehen

---

# 58. Fähigkeitenfenster

Das Spiel benötigt ein separates Fähigkeitenmenü.

Dort kann der Spieler seine verfügbaren Fähigkeiten betrachten.

Die Hotbar enthält nur die aktuell für den schnellen Zugriff ausgewählten Aktionen.

---

# 59. Fähigkeiten auf Hotbar legen

Eine Fähigkeit kann aus dem Fähigkeitenmenü auf einen Hotbar-Slot gezogen werden.

Dadurch kann der Spieler seine persönliche Hotbar konfigurieren.

---

# 60. Hotbar-Konfiguration

Der Spieler soll die Hotbar frei an seine Spielweise anpassen können.

Beispielsweise:

```text
1 = Hauptangriff
2 = zweite Fähigkeit
3 = Bewegung
4 = Fressfähigkeit
5 = Trank
...
```

Die konkrete Auswahl bleibt dem Spieler überlassen.

---

# 61. Tastatursteuerung

Die Steuerung soll vollständig über Tastatur und Maus möglich sein.

Wichtige Aktionen besitzen direkte Hotkeys.

---

# 62. Maussteuerung

Die Maus wird insbesondere verwendet für:

* Kamerasteuerung
* Zielauswahl
* Interaktionen
* Menüs
* Navigation

---

# 63. Bewegung

Die Bewegung des Schleims erfolgt **indirekt über Klicks**.

Der Spieler klickt auf einen Punkt beziehungsweise ein Ziel.

Der Schleim bewegt sich anschließend dorthin.

---

# 64. Bewegung auf Ziel

Bei der Auswahl eines Gegners kann die Bewegung mit der Kampfinteraktion verbunden werden.

Beispielsweise:

> Rechtsklick auf Gegner
> → Schleim bewegt sich zum Ziel.

Sobald die erforderliche Reichweite erreicht wird:

> → entsprechende Aktion wird ausgeführt.

---

# 65. Kamera

Die Kamera ist eine 3D-Kamera nach dem Vorbild klassischer Third-Person-MMORPGs.

Sie soll:

* drehbar
* neigbar
* zoombar

sein.

---

# 66. Kamera-Grundposition

Die Kamera befindet sich überwiegend **hinter dem Schleim**.

Sie folgt dem Spielercharakter während der normalen Fortbewegung.

---

# 67. Kamerarotation

Der Spieler kann die Kamera frei um den Schleim drehen.

Dadurch kann er:

* die Umgebung betrachten
* Gegner beobachten
* Wege prüfen
* den Schleim aus verschiedenen Winkeln sehen

---

# 68. Kamera-Zoom

Der Spieler kann die Kamera näher heran- und weiter herauszoomen.

Damit kann er zwischen:

* detaillierter Betrachtung des Schleims
* größerem Überblick über die Umgebung

wechseln.

---

# 69. Kamera und Schleim

Der Schleim ist der visuelle Mittelpunkt.

Die Kamera darf daher nicht dauerhaft so weit entfernt sein, dass die Animationen des Schleims kaum noch sichtbar sind.

---

# 70. Kamera bei Fressversuchen

Während eines Fressversuchs muss die Kamera weiterhin ausreichend Sicht auf den Schleim und das Ziel ermöglichen.

Der Fressvorgang ist eine der wichtigsten visuellen Aktionen des Spiels.

---

# 71. Zielauswahl

Ein Ziel wird klar hervorgehoben.

Der Spieler soll unmittelbar erkennen können:

> **„Diesen Gegner habe ich ausgewählt.“**

---

# 72. Zielwechsel

Der Spieler muss Ziele schnell wechseln können.

Dies kann über Mausauswahl und entsprechende Zielwechselmechanismen erfolgen.

---

# 73. Kampf-Feedback

Kampfaktionen müssen unmittelbar verständliches Feedback liefern.

Dazu gehören beispielsweise:

* Treffer
* Schaden
* Heilung
* Ressourcenverbrauch
* Statusveränderungen

Die Effekte dürfen die Sicht auf den Schleim jedoch nicht überladen.

---

# 74. Schadenszahlen

Schadenszahlen können in der Welt beziehungsweise über dem Ziel erscheinen.

Sie sollen dem Spieler ein unmittelbares Gefühl dafür geben, dass eine Aktion erfolgreich war.

---

# 75. Heilungsfeedback

Heilung soll ebenfalls eindeutig erkennbar sein.

Der Spieler soll unterscheiden können zwischen:

* Schaden
* Heilung
* Ressourcenänderung

---

# 76. Level-Up-Feedback

Bei einem Level-Up muss der Spieler deutlich informiert werden.

Der Levelanstieg soll sich wie ein bedeutender Fortschritt anfühlen.

Gleichzeitig soll das Feedback nicht die gesamte Spielwelt blockieren.

---

# 77. Fress-Erfolg

Ein erfolgreicher Fressvorgang benötigt besonders starkes Feedback.

Der Spieler soll unmittelbar erkennen:

> **„Ich habe die Kreatur erfolgreich gefressen.“**

Dazu gehören insbesondere:

* Animation
* visuelles Feedback
* relevante Fortschrittsinformation

---

# 78. Fress-Fehlschlag

Auch ein fehlgeschlagener Fressversuch muss eindeutig erkennbar sein.

Der Spieler soll verstehen:

> **„Der Versuch ist fehlgeschlagen.“**

---

# 79. Tod

Beim Tod des Schleims muss die UI den neuen Zustand eindeutig kommunizieren.

Die Weltanimation bleibt dabei zentral.

Die UI soll nur die notwendigen Informationen liefern.

---

# 80. Respawn

Nach dem Tod muss der Spieler erkennen können:

* dass er gestorben ist
* wo er respawnt
* welchen aktuellen Charakterzustand er besitzt

---

# 81. Fehlermeldungen

Wenn eine Aktion nicht möglich ist, soll eine kurze verständliche Rückmeldung erscheinen.

Beispielsweise:

> **Nicht genug Mana**

oder:

> **Ziel außerhalb der Reichweite**

Die Meldungen sollen kurz bleiben.

---

# 82. Keine unnötigen UI-Popups

SLIMORIA soll nicht ständig den Bildschirm mit Meldungen füllen.

Popups werden nur für Informationen verwendet, die der Spieler tatsächlich benötigt.

---

# 83. Loot-Feedback

Wenn ein Gegner einen Gegenstand fallen lässt, muss der Spieler dies erkennen können.

Lootinformationen sollen klar, aber nicht störend dargestellt werden.

---

# 84. Lootfenster

Bei entsprechendem Loot kann ein Lootfenster geöffnet werden.

Dort werden verfügbare Gegenstände übersichtlich dargestellt.

---

# 85. Qualitätsdarstellung

Gegenstände mit unterschiedlichen Qualitätsstufen müssen visuell unterscheidbar sein.

Die Qualitätsfarben orientieren sich an der etablierten Item-Systematik des Spiels.

---

# 86. Boss-Fähigkeiten und Seltenheit

Da besondere Fähigkeiten beziehungsweise Belohnungen verschiedene Seltenheitsstufen besitzen können, muss die UI diese Unterschiede klar darstellen.

Beispielsweise:

* Common
* Uncommon
* Rare
* Epic
* Legendary
* Mythic

Die konkrete Balance dieser Stufen gehört nicht in dieses Dokument.

---

# 87. Chat

Als MMORPG benötigt SLIMORIA ein Chat-System.

Der Chat ermöglicht die Kommunikation zwischen Spielern.

---

# 88. Chatkanäle

Der Chat kann unterschiedliche Kanäle besitzen, beispielsweise:

* Allgemein
* Gruppe
* Flüstern
* Handel
* Fraktion

Die konkrete Kanalstruktur kann später erweitert werden.

---

# 89. Gruppenchat

Spieler einer Gruppe benötigen einen eigenen Kommunikationskanal.

Dadurch können sie sich koordinieren, ohne dass andere Spieler die Kommunikation stören.

---

# 90. Whisper

Spieler sollen anderen Spielern private Nachrichten senden können.

Dies ermöglicht direkte Kommunikation außerhalb einer Gruppe.

---

# 91. Handelschat

Ein eigener Handelskanal kann Spieler unterstützen, die Gegenstände anbieten oder suchen.

---

# 92. Fraktionskommunikation

Die Fraktionen können einen eigenen Kommunikationsbereich besitzen.

Dies stärkt das Gefühl einer gemeinsamen Fraktionszugehörigkeit.

---

# 93. Chat-UX

Der Chat darf während des normalen Spielens nicht unnötig viel Platz einnehmen.

Er soll sich bei Bedarf erweitern lassen.

---

# 94. Benachrichtigungen

Das Spiel benötigt ein Benachrichtigungssystem für wichtige Ereignisse.

Beispiele:

* Quest abgeschlossen
* Level-Up
* Gegenstand erhalten
* Fähigkeit erhalten
* Gruppeneinladung
* Handelsanfrage
* Spielerinteraktion

---

# 95. Benachrichtigungspriorität

Nicht jede Meldung besitzt dieselbe Wichtigkeit.

Wichtige Ereignisse müssen stärker hervorgehoben werden als gewöhnliche Informationen.

---

# 96. Audio-Feedback

Die UX wird nicht ausschließlich visuell gestaltet.

Bestimmte Aktionen können durch Audio unterstützt werden.

Beispiele:

* Fähigkeit verfügbar
* Quest abgeschlossen
* Level-Up
* Fress-Erfolg
* Fress-Fehlschlag
* Warnung bei niedrigem HP

---

# 97. Visuelles Feedback des Schleims

Da der Schleim selbst der Fokus des Spiels ist, soll die UX nicht versuchen, jede Information über UI zu vermitteln.

Viele Informationen können direkt durch die Animation des Schleims vermittelt werden.

Beispielsweise:

* Bewegung
* Geschwindigkeit
* Fressversuch
* Treffer
* Tod
* Erfolg

---

# 98. UI darf den Schleim nicht ersetzen

Die wichtigste UX-Regel lautet:

> **Der Spieler soll den Schleim erleben, nicht nur seine Werte verwalten.**

Die UI unterstützt das Gameplay.

Sie darf nicht zum eigentlichen Mittelpunkt werden.

---

# 99. Menüs

Wichtige Systeme werden über eigene Fenster geöffnet.

Dazu gehören insbesondere:

* Inventar
* Charakter
* Fähigkeiten
* Talente
* Questlog
* Karte
* Bestiarium

---

# 100. Menüstruktur

Die Menüs sollen logisch miteinander verbunden sein.

Beispielsweise:

```text
Charakter
 ├── Ausrüstung
 ├── Werte
 ├── Talente
 └── Fähigkeiten

Inventar
 ├── Gegenstände
 ├── Tränke
 └── sonstige Items

Questlog
 ├── Main Story
 ├── Side Quests
 └── Klassenquests

Bestiarium
 └── Kreaturen
```

---

# 101. Menübedienung

Menüs sollen mit:

* Maus
* Tastatur
* bekannten Hotkeys

bedienbar sein.

---

# 102. Tooltips

Tooltips sind ein wichtiges Hilfsmittel.

Sie sollen komplexe Informationen erklären, ohne dauerhaft Platz im HUD zu benötigen.

---

# 103. Tooltip-Grundsätze

Tooltips sollen:

* kurz genug sein
* wichtige Informationen priorisieren
* Fachbegriffe erklären, wenn nötig
* keine unnötigen Textblöcke erzeugen

---

# 104. Informationshierarchie

Die UI muss zwischen wichtigen und unwichtigen Informationen unterscheiden.

### Sehr wichtig

* HP
* Ressource
* Ziel
* aktive Fähigkeiten
* Questziele

### Wichtig

* Level
* Gruppe
* Cooldowns
* relevante Statuswerte

### Situativ

* Bestiarium
* Charakterdetails
* Iteminformationen
* zusätzliche Statistiken

---

# 105. Bildschirmfokus

Der zentrale Bildschirmbereich bleibt möglichst frei.

Dort befinden sich:

* der Schleim
* Gegner
* Umgebung
* wichtige Weltaktionen

Die UI wird bevorzugt an den Rändern angeordnet.

---

# 106. Quest-Tracker rechts

Der Quest-Tracker bleibt standardmäßig am rechten Bildschirmrand.

Das entspricht der gewünschten klassischen MMORPG-Struktur.

---

# 107. Gruppenanzeige links

Die Gruppe befindet sich standardmäßig links im HUD.

Dadurch entsteht eine klare Trennung:

> **Links → Spieler / Gruppe**
> **Rechts → Quests**
> **Unten → Aktionen**
> **Mitte → Spielwelt**

---

# 108. Hotbar unten

Die Hotbar befindet sich standardmäßig im unteren Bildschirmbereich.

Dadurch kann der Spieler:

* Aktionen schnell erreichen
* Tastenkürzel erkennen
* Cooldowns beobachten

ohne den zentralen Spielbereich zu verdecken.

---

# 109. UI-Skalierung

Die Benutzeroberfläche muss auf unterschiedlichen Bildschirmauflösungen funktionieren.

Elemente dürfen nicht so groß sein, dass sie bei kleineren Auflösungen die Spielwelt verdecken.

---

# 110. UI-Anpassbarkeit

Langfristig soll die UI möglichst flexibel angepasst werden können.

Dazu gehören beispielsweise:

* Größe
* Position
* Sichtbarkeit bestimmter Elemente
* Hotbar-Belegung

---

# 111. Tastenkonfiguration

Der Spieler soll wichtige Tastenbelegungen anpassen können.

Beispielsweise kann die Fressaktion statt der Standardtaste auf eine andere Taste gelegt werden.

---

# 112. Maustasten

Auch Mausaktionen sollen konfigurierbar sein, soweit dies sinnvoll ist.

Insbesondere wichtige Aktionen wie:

* Zielauswahl
* Kamerasteuerung
* Interaktion

sollen komfortabel funktionieren.

---

# 113. Steuerungsphilosophie

Die Steuerung soll möglichst wenig direkte Charaktersteuerung benötigen.

Der Schleim bewegt sich indirekt auf das Ziel des Spielers zu.

Dadurch liegt der Fokus stärker auf:

* Positionierung
* Zielauswahl
* Timing
* Fähigkeiten
* Fressentscheidungen

---

# 114. Bewegung und Kamera müssen getrennt verständlich sein

Der Spieler soll jederzeit wissen:

> **Wo bewegt sich mein Schleim hin?**

und gleichzeitig:

> **In welche Richtung schaue ich mit der Kamera?**

Diese beiden Informationen dürfen nicht miteinander verwechselt werden.

---

# 115. Klickfeedback

Wenn der Spieler auf einen Ort klickt, sollte visuelles Feedback zeigen, dass der Bewegungsbefehl angenommen wurde.

Dadurch entsteht ein klares:

> **Klick → Befehl → Schleim bewegt sich**

---

# 116. Interaktionsfeedback

Bei jeder wichtigen Spieleraktion gilt:

```text
Eingabe
 ↓
Spielreaktion
 ↓
visuelles / akustisches Feedback
```

Der Spieler soll niemals lange überlegen müssen, ob seine Eingabe registriert wurde.

---

# 117. Fehlbedienung

Falsche Eingaben sollen möglichst wenig Frustration erzeugen.

Beispielsweise soll ein Klick auf einen unerreichbaren Ort nicht dazu führen, dass der Spieler minutenlang versucht, dorthin zu gelangen.

---

# 118. Barrierefreiheit

Die UI sollte langfristig grundlegende Barrierefreiheitsoptionen unterstützen.

Dazu gehören beispielsweise:

* anpassbare UI-Größe
* frei belegbare Tasten
* gut lesbare Schrift
* ausreichende Kontraste
* klare Symbole

---

# 119. Lesbarkeit

Text muss auch während des normalen Spiels gut lesbar bleiben.

Besonders wichtig:

* Questziele
* HP
* Ressourcen
* Hotkeys
* Itemnamen
* NPC-Namen

---

# 120. Keine Informationsüberflutung

SLIMORIA besitzt viele Systeme.

Die UI darf deshalb nicht versuchen, alle Informationen gleichzeitig darzustellen.

Grundregel:

> **Information nur dann anzeigen, wenn sie für die aktuelle Situation relevant ist.**

---

# 121. Anfängerfreundlichkeit

Neue Spieler sollen die UI schrittweise verstehen.

Wichtige Systeme können beim ersten Auftreten erklärt werden.

Beispielsweise:

* erste Fähigkeit
* erste Quest
* erste Fressaktion
* erste Gruppe
* erstes Inventar
* erstes Talent

---

# 122. Tutorials

Tutorial-Hinweise sollen kurz und handlungsorientiert sein.

Beispiel:

> **Rechtsklick auf einen Gegner, um ihn anzugreifen.**

oder:

> **Drücke E, um einen geschwächten Gegner zu fressen.**

---

# 123. Tutorials nicht dauerhaft

Tutorialinformationen sollen verschwinden, sobald der Spieler das entsprechende System verstanden hat.

Das normale Gameplay darf nicht dauerhaft von Hilfetexten begleitet werden.

---

# 124. UX für erfahrene Spieler

Erfahrene Spieler sollen möglichst schnell spielen können.

Deshalb:

* Hotkeys
* kurze Animationen der UI
* wenige Bestätigungsfenster
* schnelle Menüs
* klare Abklingzeiten

---

# 125. Bestätigungsfenster

Bestätigungen werden nur bei Aktionen verwendet, bei denen ein Fehler problematisch wäre.

Beispielsweise bei:

* endgültigem Löschen eines Charakters
* wichtigen Handelsaktionen
* möglicherweise irreversiblen Entscheidungen

---

# 126. Charakterauswahl

Die Charakterauswahl zeigt die verfügbaren **8 Schleim-Slots**.

Jeder Slot soll mindestens erkennen lassen:

* Charaktername
* Klasse
* Level
* Fraktion
* visuellen Charakter

---

# 127. Schleim-Erstellung

Vor dem Spielstart erstellt der Spieler seinen Schleim.

Die UI führt durch die Charaktererstellung.

Anpassbar sind:

* Augen
* Mund
* Nase
* Name

Die Farbe wird nicht frei gewählt, da sie durch die Fraktion bestimmt wird.

---

# 128. Fraktionswahl

Bei der Charaktererstellung muss die Fraktion eindeutig dargestellt werden.

Der Spieler soll verstehen:

> **Diese Entscheidung bestimmt meine Fraktionszugehörigkeit und damit meine Ausgangswelt.**

---

# 129. Klassenwahl

Die verfügbaren Klassen werden entsprechend der gewählten Fraktion angezeigt.

Nicht jede Klasse steht jeder Fraktion zur Verfügung.

Die UI muss daher verhindern, dass ein Spieler eine nicht verfügbare Klassenkombination auswählt.

---

# 130. Charaktererstellung soll verständlich sein

Der Spieler soll vor Abschluss der Charaktererstellung eindeutig sehen:

* Name
* Aussehen
* Fraktion
* Klasse

---

# 131. Ladebildschirme

Ladebildschirme können wichtige Informationen über SLIMORIA vermitteln.

Beispielsweise:

* kurze Gameplay-Tipps
* Weltinformationen
* Kreatureninformationen
* Steuerungstipps

---

# 132. Keine Spoiler durch Ladebildschirme

Ladebildschirme dürfen keine wichtigen Storygeheimnisse vorwegnehmen.

Das gilt insbesondere für das zentrale Mysterium rund um die Schleime.

---

# 133. Interface-Identität

Die UI soll zum Fantasy-Anime-Stil der Welt passen.

Sie soll jedoch nicht übermäßig dekorativ sein.

Funktionalität steht über Ornamenten.

---

# 134. Fraktionsidentität in der UI

Die Fraktionen können sich in bestimmten UI-Elementen unterscheiden.

### Eldoran

* Blau
* geordnete Formen
* Stein-/Fantasy-Anmutung

### Ravok

* Rot
* rauere Formen
* Holz-/Knochen-Anmutung

Die UI darf dadurch die Fraktionsidentität unterstützen, ohne zwei komplett unterschiedliche Benutzeroberflächen zu benötigen.

---

# 135. UI-Konsistenz

Unabhängig von Klasse und Fraktion sollen grundlegende UI-Regeln gleich bleiben.

Ein Spieler soll sich auch nach einem Charakterwechsel schnell zurechtfinden.

---

# 136. Status-Effekte

Temporäre Statusveränderungen müssen verständlich dargestellt werden.

Dazu gehören beispielsweise:

* Geschwindigkeitsverringerung
* positive Buffs
* negative Debuffs
* temporäre Effekte

---

# 137. Status-Tooltips

Beim Überfahren eines Statussymbols kann der Spieler erfahren:

* Name
* Wirkung
* verbleibende Dauer

---

# 138. Buff- und Debuff-Anzeige

Aktive Effekte sollen übersichtlich dargestellt werden.

Die Anzeige darf nicht bei vielen Effekten unlesbar werden.

---

# 139. Kampfhinweise

Kampfbezogene Informationen sollen dort erscheinen, wo der Spieler sie schnell wahrnehmen kann.

Dabei muss der Schleim weiterhin sichtbar bleiben.

---

# 140. Fress-Feedback als UX-Schwerpunkt

Die Fressmechanik ist eine der wichtigsten UX-Komponenten des Spiels.

Der Spieler muss jederzeit verstehen:

1. welches Ziel ausgewählt ist
2. ob ein Fressversuch gestartet wurde
3. ob der Versuch erfolgreich war
4. ob er fehlgeschlagen ist
5. welche unmittelbare Konsequenz daraus entsteht

---

# 141. Fressaktion darf nicht wie ein normaler MMO-Skill aussehen

Die UI darf die Fressmechanik nicht zu einer gewöhnlichen Icon-Fähigkeit reduzieren.

Der eigentliche Fressvorgang muss primär durch:

* Bewegung
* Verformung
* Umschlingen
* Animation
* Sound
* Weltfeedback

vermittelt werden.

---

# 142. Schleimbewegung als UX

Die indirekte Steuerung bedeutet, dass Bewegungsfeedback besonders wichtig ist.

Der Spieler muss erkennen können:

> „Mein Klick wurde registriert.“

und:

> „Mein Schleim bewegt sich tatsächlich dorthin.“

---

# 143. Geschwindigkeit sichtbar machen

Die Geschwindigkeit des Schleims kann durch Animation und Verformung vermittelt werden.

Die UI muss nicht permanent einen Geschwindigkeitswert anzeigen.

---

# 144. Größe sichtbar machen

Die Größenentwicklung wird hauptsächlich über die Spielwelt wahrgenommen.

Der Spieler soll seinen Schleim im Verhältnis zu:

* NPCs
* Kreaturen
* Umgebung

größer werden sehen.

---

# 145. UI und Levelgefühl

Die Levelanzeige liefert die objektive Information.

Die Welt liefert das emotionale Feedback.

Beispiel:

> UI: **Level 10**

und gleichzeitig erkennt der Spieler:

> „Mein Schleim ist deutlich größer als früher.“

---

# 146. Systemmeldungen

Systemmeldungen sollen zentral und verständlich sein.

Beispiele:

> **Neue Fähigkeit erlernt**
> **Quest abgeschlossen**
> **Level 10 erreicht**
> **Neuer Eintrag im Bestiarium**

---

# 147. Systemmeldungen nicht stapeln

Viele gleichzeitig auftretende Meldungen müssen sinnvoll gruppiert oder zeitlich versetzt dargestellt werden.

Der Bildschirm darf nicht mit Benachrichtigungen überlaufen.

---

# 148. Benutzerführung

Die UI soll den Spieler führen, ohne seine Entscheidungen zu übernehmen.

Sie soll zeigen:

> **Was kann ich tun?**

aber nicht:

> **Was muss ich tun?**

---

# 149. Informationszugriff

Jedes wichtige System muss mit wenigen Eingaben erreichbar sein.

Der Spieler soll nicht durch mehrere unnötige Menüs navigieren müssen.

---

# 150. UI-Grundlayout

Das Referenzlayout lautet:

```text
┌──────────────────────────────────────────────────┐
│                                        MINIMAP   │
│                              QUEST TRACKER       │
│                              Quest 1             │
│                              Quest 2             │
│                                                  │
│                                                  │
│                 SPIELWELT                        │
│                                                  │
│                                                  │
│                                                  │
│ GRUPPE                                           │
│ Spieler                                          │
│ Spieler                                          │
│                                                  │
│ HP / MANA                                        │
│                                                  │
│        [1][2][3][4][5][6][7][8][9][10]           │
└──────────────────────────────────────────────────┘
```

Dieses Layout ist die grundlegende UX-Referenz und kann während der technischen Umsetzung angepasst werden, ohne die Informationshierarchie zu verändern.

---

# 151. Kernsteuerung

Die grundlegende Steuerungslogik lautet:

| Aktion          | Grundfunktion                    |
| --------------- | -------------------------------- |
| Linksklick      | Ziel / Auswahl / UI              |
| Rechtsklick     | Zielorientierte Aktion / Angriff |
| Klick auf Boden | Bewegung                         |
| E               | Fressen                          |
| F               | Interagieren (NPCs, Objekte)     |
| 1–10            | Hotbar                           |
| Mausbewegung    | Kamera                           |
| Mausrad         | Kamera-Zoom                      |
| ESC             | Menü / Schließen                 |

Die Belegung bleibt grundsätzlich konfigurierbar.

---

# 152. Steuerungsziel

Die Steuerung soll ermöglichen, dass der Spieler gleichzeitig:

* die Kamera kontrolliert
* den Schleim positioniert
* Gegner auswählt
* Fähigkeiten verwendet
* Fressversuche durchführt

ohne komplizierte Tastenkombinationen zu benötigen.

---

# 153. MMORPG-Vertrautheit

Ein Spieler, der bereits klassische MMORPGs kennt, soll die Grundstruktur der UI schnell verstehen.

Die Besonderheiten von SLIMORIA sollen anschließend über die Schleim-Mechanik hinzukommen.

---

# 154. UI-Prioritäten

Die wichtigsten UI-Elemente sind:

### Priorität 1

* Schleim / Spielwelt
* HP
* Ressourcen
* Ziel
* Hotbar
* Fressinteraktion

### Priorität 2

* Quest-Tracker
* Gruppe
* Minimap
* Status-Effekte

### Priorität 3

* Chat
* zusätzliche Informationen
* optionale Statistiken

---

# 155. UX-Prioritäten

Die wichtigsten UX-Ziele sind:

1. **Der Spieler versteht jederzeit, was passiert.**
2. **Der Spieler kann schnell reagieren.**
3. **Der Schleim bleibt der visuelle Mittelpunkt.**
4. **Die Welt bleibt sichtbar.**
5. **MMORPG-Spieler erkennen bekannte Strukturen wieder.**
6. **Neue Spieler können die Systeme schrittweise verstehen.**
7. **Fortgeschrittene Spieler können schnell und effizient spielen.**

---

# 156. Master UI/UX Statement

> **Die Benutzeroberfläche von SLIMORIA orientiert sich an der Klarheit klassischer MMORPGs, ohne den einzigartigen Schleim in den Hintergrund zu drängen.**
>
> Der Bildschirm ist klar strukturiert: **Spieler und Gruppe links, Quests rechts, Hotbar und zentrale Aktionen unten und die Spielwelt im Mittelpunkt.**
>
> Die wichtigsten Aktionen – insbesondere Bewegung, Zielauswahl, Fähigkeiten und Fressen – müssen unmittelbar verständlich sein.
>
> Die UI zeigt die Informationen, die der Spieler benötigt, während die eigentliche Identität des Spiels durch die Welt und vor allem durch den Schleim selbst vermittelt wird.
>
> **Die UI erklärt den Schleim nicht – sie lässt den Spieler ihn erleben.**
