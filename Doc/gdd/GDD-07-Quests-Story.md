# SLIMORIA — GDD 07: Quests & Story

**Version:** 1.0
**Dokumenttyp:** Quests & Story
**Projekt:** SLIMORIA

> **Scope:** Dieses GDD definiert ausschließlich das Quest- und Story-System von SLIMORIA.
> Klassen, Combat, Evolution, Progression, Weltaufbau, MMORPG-Systeme und UI werden nicht erneut definiert.

---

# 1. Zweck des Quest-Systems

Quests sind ein zentraler Bestandteil von SLIMORIA.

Sie sollen nicht nur als optionale Aufgaben neben dem eigentlichen Spiel existieren, sondern den Spieler:

* durch die Welt führen
* mit Charakteren verbinden
* die Geschichte erzählen
* neue Regionen vorbereiten
* Aktivitäten sinnvoll miteinander verbinden
* Gold und andere Belohnungen liefern
* unterschiedliche Spielweisen ermöglichen

Das Quest-System soll gleichzeitig für Spieler funktionieren, die die Geschichte aufmerksam verfolgen, und für Spieler, die hauptsächlich spielen und wenig lesen.

---

# 2. Quest-Struktur

SLIMORIA besitzt drei grundlegende Questarten:

1. **Main Story Quests**
2. **Side Quests**
3. **Klassenbezogene Quests**

Dabei besitzen Main Story Quests die höchste narrative Bedeutung.

---

# 3. Main Story

Der Spieler besitzt immer eine übergeordnete Main Story.

Die Main Story bildet den langfristigen roten Faden des Spiels.

Sie soll den Spieler schrittweise durch die Welt führen und erklären:

* was gerade passiert
* welche größeren Probleme existieren
* welche wichtigen Personen beteiligt sind
* warum der Spieler bestimmte Orte besucht
* warum bestimmte Ereignisse stattfinden

---

# 4. Main-Story-Fortschritt

Die Main Story soll nicht aus einer einzigen ununterbrochenen Questkette bestehen.

Stattdessen:

> **Main Story → mehrere benötigte Side Quests → nächster Main-Story-Abschnitt**

Der Spieler verfolgt dadurch grundsätzlich einen Hauptstorypfad, muss aber zwischendurch weitere Aufgaben erledigen.

---

# 5. Side Quests

Side Quests sind ein großer Bestandteil des Spiels.

Sie sollen deutlich zahlreicher sein als Main Story Quests.

Sie können:

* lokale Probleme behandeln
* Charaktere vorstellen
* die Umgebung erklären
* Ressourcen beschaffen
* Kreaturen bekämpfen
* Kreaturen fressen
* Gegenstände beschaffen
* NPCs unterstützen
* kleine Geschichten erzählen

---

# 6. Side Quests sind nicht bedeutungslos

Side Quests sollen sich nicht wie reine Füllaufgaben anfühlen.

Auch eine scheinbar einfache Aufgabe wie:

> „Töte 10 Wölfe.“

kann Teil der glaubwürdigen Welt sein.

Beispielsweise können Wölfe eine Straße blockieren, Vieh angreifen oder Reisende gefährden.

---

# 7. Questziele

SLIMORIA unterstützt verschiedene Questziele.

Dazu gehören insbesondere:

### Töten

> Töte 10 Wölfe.

### Fressen

> Fresse 5 Wölfe.

### Sammeln

> Sammle 8 Kräuter.

### Interagieren

> Sprich mit dem Dorfältesten.

### Erkunden

> Besuche die alte Ruine.

### Beschützen

> Beschütze einen NPC.

### Begleiten

> Begleite einen NPC zu einem bestimmten Ort.

### Besiegen

> Besiege einen bestimmten Gegner oder Boss.

### Beschaffen

> Bringe einen bestimmten Gegenstand zurück.

---

# 8. Kill- und Fressquests

Normale Kill- und Fressquests sind ausdrücklich vorgesehen.

Beispiele:

> Töte 10 Wölfe — 2/10
> Fresse 5 Wölfe — 3/5

Diese Aufgaben sollen einen großen Teil der alltäglichen Questaktivitäten bilden.

---

# 9. Mehrere Ziele innerhalb einer Quest

Quests können mehrere Ziele besitzen.

Beispiel:

```text
Unruhe im Wald

Töte 8 Wölfe      — 8/8
Fresse 3 Wölfe    — 2/3
Sprich mit dem Förster
```

Dadurch können Quests verschiedene Gameplay-Aktivitäten miteinander verbinden.

---

# 10. Questgeber

NPCs können unterschiedliche Mengen an Quests anbieten.

Ein Questgeber kann beispielsweise besitzen:

* 1 Quest
* 2–3 Quests
* mehrere Quests
* maximal etwa 6–7 Quests

Ein einzelner NPC soll nicht mit einer unüberschaubaren Liste von Aufgaben überladen werden.

---

# 11. Questgeberrollen

Questgeber können unterschiedliche Funktionen besitzen.

Beispiele:

* Bürger
* Händler
* Soldaten
* Wachen
* Geistliche
* Handwerker
* Jäger
* Anführer
* Reisende
* Klassenlehrer

Dadurch entstehen unterschiedliche Arten von Questgeschichten.

---

# 12. Quest-Freischaltung

Nicht jede Quest steht von Beginn an zur Verfügung.

Quests können abhängig sein von:

* Level
* vorher abgeschlossenen Quests
* Main-Story-Fortschritt
* Zugang zu einer Region
* bestimmten Voraussetzungen

Dadurch kann verhindert werden, dass Spieler zu früh mit Inhalten konfrontiert werden, für die sie noch nicht vorgesehen sind.

---

# 13. Levelbeschränkungen

Quests müssen zum erwarteten Fortschritt des Spielers passen.

Ein Spieler auf Level 7 soll beispielsweise nicht durch eine normale Quest direkt in ein Gebiet geschickt werden, das für Level 10–20 vorgesehen ist.

Questvoraussetzungen sollen daher die Progressionsstruktur respektieren.

---

# 14. Questketten

Mehrere Quests können miteinander verbunden werden.

Beispiel:

```text
Quest 1: Finde heraus, warum die Wölfe aggressiv sind.
      ↓
Quest 2: Untersuche den Wald.
      ↓
Quest 3: Finde die Ursache.
      ↓
Quest 4: Besiege den Verantwortlichen.
```

Dadurch können auch einfache Aufgaben Teil einer größeren Geschichte werden.

---

# 15. Main Story + Side Quest Struktur

Die gewünschte Struktur ist:

```text
MAIN STORY
     │
     ▼
Story-Aufgabe
     │
     ▼
mehrere Side Quests
     │
     ├── Kill Quest
     ├── Fress Quest
     ├── Sammel Quest
     └── Erkundungs Quest
     │
     ▼
nächster Main-Story-Abschnitt
```

Die Side Quests unterstützen somit den Fortschritt der Hauptgeschichte.

---

# 16. Storyverständlichkeit

Ein großer Teil der Spieler wird Questtexte nicht vollständig lesen.

Das Quest-System muss deshalb wichtige Informationen zusätzlich über:

* Questnamen
* kurze Zielbeschreibungen
* NPC-Dialoge
* visuelle Hinweise
* Questmarker
* Questziele

verständlich machen.

---

# 17. Quest-Texte

Questtexte dürfen trotzdem ausführlicher sein.

Spieler, die die Welt und Geschichte kennenlernen möchten, sollen zusätzliche Informationen erhalten.

Dadurch existieren zwei Ebenen:

### Schnelle Ebene

> „Töte 10 Wölfe.“

### Narrative Ebene

> Warum diese Wölfe getötet werden sollen.

---

# 18. Questlog

Der Spieler besitzt ein Questlog.

Dort werden aktive Quests gespeichert.

Eine Quest enthält mindestens:

* Name
* Beschreibung
* Ziele
* Fortschritt
* Belohnungen
* Voraussetzungen, sofern relevant

---

# 19. Aktive Questliste

Aktive Quests werden übersichtlich dargestellt.

Die Darstellung soll es ermöglichen, viele parallele Side Quests zu verfolgen.

Ein typisches Ziel kann beispielsweise angezeigt werden als:

> Wölfe im Wald
> Töte 10 Wölfe — 2/10

---

# 20. Questfortschritt

Fortschritte werden automatisch aktualisiert.

Beispiel:

> Töte 10 Wölfe — 2/10

Nach dem nächsten Wolf:

> Töte 10 Wölfe — 3/10

Der Spieler muss nicht jedes Mal das Questfenster öffnen.

---

# 21. Questbelohnungen

Quests können verschiedene Belohnungen geben.

Dazu gehören:

* XP
* Gold
* Gegenstände
* Tränke
* Ausrüstung
* weitere geeignete Belohnungen

Questbelohnungen sollen einen wichtigen Bestandteil des Gesamtfortschritts darstellen.

---

# 22. Gold durch Quests

Gold ist eine reguläre Questbelohnung.

Quests sollen damit eine relevante Einkommensquelle darstellen.

Goldbelohnungen können abhängig sein von:

* Questaufwand
* Questtyp
* Questfortschritt
* Bedeutung der Quest

---

# 23. XP durch Quests

Quests liefern ebenfalls Erfahrung.

Die Menge muss so balanciert werden, dass Quests eine relevante Alternative beziehungsweise Ergänzung zu anderen Fortschrittsaktivitäten darstellen.

Quest-XP soll nicht dazu führen, dass sämtliche anderen Aktivitäten bedeutungslos werden.

---

# 24. Questbelohnungen sollen sinnvoll sein

Belohnungen sollen möglichst zum Inhalt der Quest passen.

Beispiel:

Ein Jäger, der den Spieler bittet, gefährliche Kreaturen zu beseitigen, kann beispielsweise:

* Gold
* Ausrüstung
* Tränke
* andere praktische Belohnungen

geben.

---

# 25. Klassenquests

Klassenquests existieren, sind aber bewusst minimal gehalten.

Sie sollen nicht die Hauptqueststruktur dominieren.

Ihr Hauptzweck besteht darin, bestimmte klassenspezifische Fähigkeiten oder Spielmechaniken in die Welt einzubinden.

---

# 26. Klassenlehrer

Bestimmte Fähigkeiten können über spezielle NPCs beziehungsweise Klassenlehrer vermittelt werden.

Ein Klassenlehrer kann beispielsweise eine Quest anbieten, nach deren Abschluss der Spieler eine bestimmte Fähigkeit erlernt.

---

# 27. Klassenquests sind nicht das komplette Fähigkeiten-System

Nicht jede Fähigkeit wird über Klassenquests erlernt.

Klassenquests werden nur für bestimmte Fähigkeiten verwendet, bei denen eine Verbindung zwischen:

> **Fähigkeit + Klasse + Welt/NPC**

sinnvoll ist.

Andere Fähigkeiten bleiben an die vorgesehenen Systeme gebunden.

---

# 28. Verbindung zwischen Klassenquests und Bossen

Eine Klassenfähigkeit kann thematisch mit einem bestimmten Boss-Typ verbunden sein.

Dadurch können zwei unterschiedliche Wege der Charakterentwicklung entstehen:

* eine Fähigkeit wird durch eine besondere Quest beziehungsweise einen Lehrer vermittelt
* andere oder verbesserte Versionen können mit Bossen verbunden sein

Die genaue Fähigkeitssystematik gehört nicht in dieses GDD.

---

# 29. Beispiel Klassenquest

Ein Druide könnte einen Lehrer treffen, der ihm eine besondere Fähigkeit vermittelt.

Die Quest könnte ihn beispielsweise dazu bringen:

* eine bestimmte Kreatur aufzuspüren
* deren Verhalten zu beobachten
* eine Prüfung zu bestehen
* anschließend eine neue Fähigkeit zu erlernen

Die Quest erzählt dadurch gleichzeitig etwas über die Klasse.

---

# 30. Questentscheidungen

SLIMORIA kann vereinzelt Entscheidungen innerhalb von Quests enthalten.

Diese sollen jedoch:

* selten
* überschaubar
* technisch realistisch

bleiben.

---

# 31. Keine massiven Story-Verzweigungen

Entscheidungen sollen nicht zu riesigen alternativen Storykampagnen führen.

Sie können eher:

* eine kleine Quest verändern
* eine Belohnung beeinflussen
* einen NPC anders reagieren lassen
* einen kleinen lokalen Ausgang verändern

Die Hauptstruktur des Spiels bleibt dadurch kontrollierbar.

---

# 32. Fraktionsabhängige Quests

Die beiden Fraktionen erleben teilweise unterschiedliche Questinhalte.

Da sie unterschiedliche Startregionen und Kulturen besitzen, sollen ihre frühen Geschichten entsprechend unterschiedlich sein.

---

# 33. Gleicher Gesamtfortschritt

Obwohl die Fraktionen unterschiedliche Geschichten und Aufgaben besitzen, sollen sie ungefähr vergleichbare Fortschrittszeiten ermöglichen.

Ein Spieler soll nicht aufgrund seiner Fraktion wesentlich schneller oder langsamer durch die normale Progression kommen.

---

# 34. Unterschiedliche Perspektiven

Eine Quest kann für beide Fraktionen eine völlig andere Perspektive besitzen.

Beispielsweise kann dieselbe politische Situation:

* Eldoran als Verteidigung darstellen
* Ravok als Unterdrückung darstellen

Dadurch kann die Welt aus Sicht beider Fraktionen unterschiedlich wirken.

---

# 35. Questdesign für die zwei Fraktionen

### Eldoran

Questinhalte können stärker verbunden sein mit:

* Dörfern
* Wäldern
* Flüssen
* Landwirtschaft
* Kirchen
* Wachen
* Handel
* Schutzaufgaben

### Ravok

Questinhalte können stärker verbunden sein mit:

* Brachland
* Küsten
* Clans
* Überleben
* Jagd
* Ruhm
* Ehre
* rivalisierenden Gruppen

---

# 36. Gegnerische Fraktion als Questbestandteil

Gegnerische Fraktionsmitglieder können als Questziele auftreten.

Dazu gehören beispielsweise:

* Soldaten
* Spione
* Saboteure
* Kundschafter

Dadurch wird der Fraktionskonflikt in die normalen Quests integriert.

---

# 37. Questgeber sollen nicht statisch „Questautomaten“ sein

NPCs dürfen zwar einfache Questgeber sein, sollen aber möglichst einen erkennbaren Grund besitzen, warum sie eine Aufgabe anbieten.

Beispiel:

Nicht nur:

> „Töte 10 Wölfe.“

Sondern:

> „Die Wölfe greifen seit Tagen unsere Viehherden an.“

Dadurch entsteht eine einfache, verständliche Motivation.

---

# 38. Alltägliche Quests

Nicht jede Quest muss episch sein.

SLIMORIA benötigt auch einfache Aufgaben.

Beispiele:

* Tiere vertreiben
* Waren suchen
* Kräuter sammeln
* Gegner töten
* Gegner fressen
* jemanden begleiten
* einen Ort untersuchen

Diese Aufgaben bilden einen großen Teil des normalen Spieleralltags.

---

# 39. Größere Quests

Daneben existieren bedeutendere Aufgaben.

Diese können:

* mehrere Schritte besitzen
* mehrere NPCs einbeziehen
* mehrere Gebiete umfassen
* stärkere Gegner enthalten
* Teil einer Questkette sein

Sie bilden die Brücke zwischen normalen Aufgaben und Main Story.

---

# 40. Quest-Schwierigkeit

Questaufgaben sollen grundsätzlich zum erwarteten Levelbereich passen.

Eine Quest für einen niedrigen Levelbereich soll nicht voraussetzen, dass der Spieler einen Gegner bekämpft, der deutlich über seinem vorgesehenen Fortschritt liegt.

Höhere Quests können entsprechend anspruchsvoller werden.

---

# 41. Questziele und Schleimidentität

Quests sollen die besondere Natur des Spielercharakters berücksichtigen.

Deshalb sind Fressquests ein wichtiger Bestandteil.

Der Spieler soll regelmäßig Situationen erleben, in denen nicht nur gefragt wird:

> „Kannst du diesen Gegner töten?“

sondern:

> „Kannst du diesen Gegner fressen?“

---

# 42. Fressquests als eigene Kategorie

Fressquests können verschiedene Formen besitzen:

### Anzahl

> Fresse 10 Wölfe.

### Spezifische Kreatur

> Fresse den Alpha-Wolf.

### Kreaturengruppe

> Fresse drei verschiedene Raubtiere.

### Bedingung

> Fresse einen Wolf, nachdem er auf unter 20 % HP geschwächt wurde.

---

# 43. Questdesign und Spielerfreiheit

Quests sollen den Spieler führen, aber nicht jede Aktion vollständig vorschreiben.

Ein Spieler kann:

* die Quest verfolgen
* nebenbei Kreaturen fressen
* andere Side Quests erledigen
* erkunden
* mit anderen Spielern spielen

Dadurch bleibt die Welt offen.

---

# 44. Questdichte

Die Welt soll ausreichend Quests besitzen, damit der Spieler regelmäßig sinnvolle Aufgaben findet.

Gleichzeitig sollen nicht überall NPCs mit riesigen Questmengen stehen.

Die maximale Anzahl von etwa 6–7 Quests pro Questgeber bleibt bestehen.

---

# 45. Questketten mit unterschiedlichen Längen

Questketten können unterschiedlich lang sein.

### Kurz

> 1–2 Quests

### Mittel

> 3–5 Quests

### Lang

> 6+ Quests

Lange Questketten sollen hauptsächlich bei wichtigeren Charakteren und Geschichten verwendet werden.

---

# 46. Questgeber mit eigener Identität

Ein NPC kann mehrere Quests besitzen, die gemeinsam seine Rolle erzählen.

Beispiel:

Ein Jäger könnte zunächst:

1. den Spieler bitten, Wölfe zu töten
2. anschließend Spuren zu untersuchen
3. danach einen gefährlicheren Wolf aufzuspüren

Dadurch entsteht aus einfachen Aufgaben eine kleine Geschichte.

---

# 47. Main Story als roter Faden

Die Main Story soll den Spieler langfristig durch das Spiel begleiten.

Der Spieler soll jederzeit ein Gefühl dafür haben:

> „Das ist die größere Geschichte, in der ich mich gerade befinde.“

Side Quests sorgen gleichzeitig dafür, dass die Welt zwischen diesen Hauptmomenten nicht leer wirkt.

---

# 48. Main Story und Spielerfortschritt

Die Main Story soll an sinnvollen Stellen neue Bereiche und Inhalte vorbereiten.

Sie darf jedoch nicht den gesamten Spielerfortschritt blockieren.

Side Quests sollen notwendig oder sinnvoll sein, um den Spieler auf den nächsten Main-Story-Abschnitt vorzubereiten.

---

# 49. Queststruktur als Führungssystem

Das Quest-System dient auch als Navigationshilfe durch das MMORPG.

Der Spieler soll nicht zwingend eine externe Anleitung benötigen, um zu wissen:

* wohin er gehen sollte
* was als Nächstes wichtig ist
* welche Gegner sinnvoll sind
* welche Aufgaben zu seinem Fortschritt passen

---

# 50. Questmarker und Orientierung

Quests sollen verständliche Ziele besitzen.

Der Spieler soll anhand der Questinformationen erkennen können:

* welchen NPC er suchen muss
* welchen Ort er besuchen muss
* welche Kreaturen relevant sind
* was gesammelt oder besiegt werden muss

Die konkrete Darstellung dieser Informationen gehört zu **GDD 10 – UI, UX & Controls**.

---

# 51. Questabschluss

Eine abgeschlossene Quest wird beim entsprechenden NPC oder über die vorgesehene Abschlussinteraktion beendet.

Der Spieler erhält anschließend die festgelegte Belohnung.

---

# 52. Questfortschritt soll zuverlässig sein

Questfortschritt darf nicht unnötig kompliziert sein.

Wenn der Spieler eine geforderte Aktivität ausführt, soll das Spiel zuverlässig erkennen, dass das Ziel erfüllt wurde.

---

# 53. Questdesign für unterschiedliche Spielertypen

Quests sollen verschiedene Spieler ansprechen.

### Kampforientierter Spieler

> Viele Kill- und Bossquests.

### Fressorientierter Spieler

> Viele Fressziele.

### Erkundungsorientierter Spieler

> Erkundungs- und Entdeckungsquests.

### Storyorientierter Spieler

> Main Story und längere Questketten.

### Sozialer Spieler

> Gruppenbezogene und gemeinschaftliche Aufgaben.

---

# 54. Questbelohnungen als Motivation

Eine Quest soll sich abgeschlossen lohnen.

Der Spieler soll nach einer Aufgabe das Gefühl haben:

> „Das hat sich gelohnt.“

Belohnungen dürfen jedoch nicht so hoch sein, dass das reine Questabgeben alle anderen Progressionswege entwertet.

---

# 55. Wiederholbare Quests

Normale Story- und Sidequests sollen grundsätzlich einen abgeschlossenen Charakter besitzen.

Wiederholbare Aufgaben können für bestimmte langfristige Aktivitäten existieren.

Sie dürfen jedoch nicht die eigentlichen Storyquests ersetzen.

---

# 56. Quest-Relevanz über das Spiel hinweg

Quests sollen sich mit dem Fortschritt des Spielers entwickeln.

Frühe Aufgaben sind:

* lokal
* einfach
* überschaubar

Spätere Aufgaben können:

* größere Konflikte
* stärkere Gegner
* größere Entfernungen
* komplexere Situationen

beinhalten.

---

# 57. Questentwicklung im Spielverlauf

Die grundsätzliche Entwicklung lautet:

```text
Lokale Probleme
      ↓
Gebietsprobleme
      ↓
Fraktionsprobleme
      ↓
größere Konflikte
      ↓
Main-Story-Konflikte
```

Die genaue Storyentwicklung wird durch die Main Story definiert.

---

# 58. Questdesign und Lore

Quests sollen die Lore nicht nur durch lange Texte vermitteln.

Spieler können die Welt auch durch ihre Aufgaben verstehen.

Beispielsweise kann eine Quest über:

* eine Kirche
* einen Clan
* einen Grenzkonflikt
* einen Händler
* einen Spion

gleichzeitig etwas über die Welt erzählen.

---

# 59. Lore-Mysterien in Quests

Das bestehende Mysterium um die Schleime soll auch in Quests nicht vollständig aufgelöst werden.

Quests dürfen:

* Hinweise geben
* Fragen aufwerfen
* ungewöhnliche Ereignisse zeigen
* widersprüchliche Aussagen enthalten

Aber sie sollen nicht einfach die gesamte Wahrheit erklären.

---

# 60. Questentscheidungen

Entscheidungen können selten eingesetzt werden.

Ein Beispiel:

Ein Spieler entscheidet, ob er bei einem kleinen Konflikt:

* einer Person hilft
* einer anderen Person hilft
* versucht, beide Seiten zu unterstützen

Die Auswirkungen bleiben bewusst begrenzt.

---

# 61. Keine moralischen Zwangsentscheidungen

Entscheidungen sollen nicht ständig den Spieler zwingen:

> „Gut oder Böse?“

SLIMORIA soll stärker mit:

* Interessen
* Loyalität
* Konsequenzen
* persönlichen Prioritäten

arbeiten.

---

# 62. Fraktionsquests

Fraktionsspezifische Quests können die Sichtweise der jeweiligen Seite verstärken.

Ein Eldoran-Spieler kann beispielsweise eine Aufgabe aus Sicht der eigenen Ordnung erhalten.

Ein Ravok-Spieler kann dieselbe Situation aus Sicht von Freiheit und Ehre erleben.

Dadurch wird die Wahl der Fraktion narrativ relevant.

---

# 63. Questdesign-Grundsatz

Eine gute Quest sollte mindestens eine dieser Funktionen erfüllen:

* Fortschritt ermöglichen
* eine Aktivität motivieren
* die Welt erklären
* einen Charakter vorstellen
* eine Geschichte erzählen
* eine Entscheidung ermöglichen
* den Spieler zu einem interessanten Ort führen

---

# 64. Schlechte Queststruktur vermeiden

Quests sollen nicht ausschließlich aus einer endlosen Aneinanderreihung von:

> Töte 10 Gegner → Töte 10 Gegner → Sammle 10 Gegenstände

bestehen.

Kill- und Fressquests sind wichtig, aber sie sollen mit anderen Questtypen kombiniert werden.

---

# 65. Questvariation

Eine Questkette kann beispielsweise so aussehen:

```text
Untersuche den Wald
        ↓
Sprich mit dem Jäger
        ↓
Töte 8 Wölfe
        ↓
Fresse 3 Wölfe
        ↓
Untersuche die Wolfshöhle
        ↓
Besiege den Alpha
        ↓
Berichte dem Jäger
```

So bleibt das Grundprinzip des Spiels erhalten, ohne dass jede Quest identisch funktioniert.

---

# 66. Questgeber mit 1–7 Quests

Die maximale Größenordnung bleibt:

> **1 bis ungefähr 7 Quests pro Questgeber**

Dadurch können wichtige NPCs mehrere Aufgaben anbieten, ohne zu einer unübersichtlichen Questzentrale zu werden.

---

# 67. Questfluss

Der gewünschte grundlegende Ablauf ist:

```text
Questgeber
    ↓
Quest annehmen
    ↓
Ziel verstehen
    ↓
Gebiet bereisen
    ↓
Aufgabe durchführen
    ↓
Fortschritt verfolgen
    ↓
Quest abschließen
    ↓
Belohnung erhalten
    ↓
nächste Quest / Main Story
```

---

# 68. Quest-System als Bindeglied

Das Quest-System verbindet die anderen Spielbereiche miteinander.

Es soll den Spieler motivieren, vorhandene Spielsysteme zu verwenden, ohne diese Systeme selbst neu zu definieren.

Quests können daher beispielsweise verlangen:

* zu kämpfen
* zu fressen
* einen Ort zu besuchen
* einen Boss zu besiegen
* mit NPCs zu sprechen

Die Regeln dieser Systeme bleiben in ihren jeweiligen GDDs.

---

# 69. Langfristiges Questziel

Das Quest-System soll dazu führen, dass der Spieler nicht nur denkt:

> „Ich muss Leveln.“

sondern:

> „Ich möchte wissen, was als Nächstes passiert.“

und gleichzeitig:

> „Ich möchte sehen, welche Aufgabe ich als Nächstes bekomme.“

---

# 70. Quest-Design-Prioritäten

Die Prioritäten lauten:

### 1. Verständlichkeit

Der Spieler muss wissen, was er tun soll.

### 2. Relevanz

Die Quest soll einen nachvollziehbaren Zweck besitzen.

### 3. Belohnung

Die Aufgabe soll sich lohnen.

### 4. Variation

Nicht jede Quest soll gleich funktionieren.

### 5. Weltintegration

Quests sollen sich so anfühlen, als würden sie tatsächlich in dieser Welt stattfinden.

### 6. Story

Die Main Story soll langfristig Interesse erzeugen.

---

# 71. Zusammenfassung

Das Quest-System von SLIMORIA besteht aus:

* einer zentralen Main Story
* zahlreichen Side Quests
* wenigen gezielten Klassenquests
* Killquests
* Fressquests
* Sammelquests
* Erkundungsquests
* Interaktionsquests
* Begleit- und Schutzaufgaben
* Boss- und Besiege-Aufgaben
* Questketten
* seltenen kleinen Entscheidungen
* fraktionsabhängigen Geschichten
* levelabhängigen Questvoraussetzungen
* XP- und Goldbelohnungen
* weiteren geeigneten Belohnungen

Die Main Story bildet den roten Faden.

Side Quests machen die Welt lebendig.

Klassenquests vermitteln nur ausgewählte klassenspezifische Fähigkeiten.

Das gesamte System soll den Spieler durch SLIMORIA führen, ohne ihm vorzuschreiben, wie er seinen Charakter spielen muss.

---

# 72. Master Quest Statement

> **Quests sind der rote Faden durch SLIMORIA.**
>
> Sie führen den Spieler durch die Welt, erzählen ihre Geschichten, geben ihm Gründe zu kämpfen und zu fressen und verbinden die großen Ereignisse mit den kleinen Problemen der Menschen, Elfen, Zwerge, Orcs, Oger, Trolle und Schleime.
>
> Die Main Story gibt die Richtung vor.
>
> Side Quests geben der Welt Leben.
>
> Klassenquests geben einzelnen Fähigkeiten eine Bedeutung innerhalb der Welt.
>
> Und über allem bleibt das zentrale Geheimnis bestehen:
>
> **Was ist dieser Schleim wirklich?**
