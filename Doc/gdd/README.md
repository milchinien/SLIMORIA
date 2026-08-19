# SLIMORIA — GDD-Index

Navigationsdokument für die Game Design Documents von SLIMORIA.
Dieses README definiert **keine** Designinhalte. Es sagt nur, **wo etwas steht**.

**Stand:** 14 Dokumente (GDD 00–13), alle Version 1.0.

---

## 1. Dokumentübersicht

| # | Dokument | Thema | Datei |
|---|----------|-------|-------|
| 00 | Master Game Overview | Gesamtvision, High Concept, Design-Säulen | [GDD-00](GDD-00-Master-Game-Overview.md) |
| 01 | Core Gameplay & Slime | Schleimkörper, Bewegung, Verformung, Fressen, Tod | [GDD-01](GDD-01-Core-Gameplay-Slime.md) |
| 02 | Combat & Abilities | Kampfsystem, Ressourcen, Fähigkeiten, Hotbar, Rollen | [GDD-02](GDD-02-Combat-Abilities.md) |
| 03 | Classes, Talents & Builds | Klassen, Talentbäume, Spezialisierung, Build-System | [GDD-03](GDD-03-Classes-Talents-Builds.md) |
| 04 | Progression & Character Development | Level, XP, Wachstum, Fressfortschritt, Tod/Verlust | [GDD-04](GDD-04-Progression-Character-Development.md) |
| 05 | Equipment, Inventory & Itemization | Ausrüstung, Items, Seltenheiten, Inventar, Gold, Handel | [GDD-05](GDD-05-Equipment-Inventory-Itemization.md) |
| 06 | World, Factions & Lore | Fraktionen, Kulturen, Völker, Politik, Lore-Mysterien | [GDD-06](GDD-06-World-Factions-Lore.md) |
| 07 | Quests & Story | Main Story, Side Quests, Klassenquests, Questtypen | [GDD-07](GDD-07-Quests-Story.md) |
| 08 | MMORPG Systems | Gruppen, PvP, Handel, Charakter-Slots, soziale Systeme | [GDD-08](GDD-08-MMORPG-Systems.md) |
| 09 | World & Content Design | Zonen, Levelbereiche, Gebiete, Kreaturenverteilung, Städte | [GDD-09](GDD-09-World-Content-Design.md) |
| 10 | UI, UX & Controls | HUD, Menüs, Steuerung, Kamera, Feedback, Tutorials | [GDD-10](GDD-10-UI-UX-Controls.md) |
| 11 | Technical Design Document | Architektur, Client/Server, Daten, Netzwerk, Performance | [GDD-11](GDD-11-Technical-Design-Document.md) |
| 12 | Development Roadmap | Phasen, Milestones, Entwicklungsreihenfolge | [GDD-12](GDD-12-Development-Roadmap.md) |
| 13 | Player Journeys & Player Experience | Spielertypen, Spielerreisen, Langzeitmotivation | [GDD-13](GDD-13-Player-Journeys-Player-Experience.md) |

---

## 2. Wo muss ich für was hin?

### Schleim & Bewegung

| Frage | Dokument |
|-------|----------|
| Wie sieht der Schleim aus, was darf er nicht werden? | GDD 01 §4–8, §62 |
| Wie fühlt sich Bewegung an (Beschleunigung, Verformung, Richtungswechsel)? | GDD 01 §9–15 |
| Wandklettern, Schwimmen, kleine Öffnungen, Kanonen | GDD 01 §16–20 · GDD 09 §52–56 |
| Wie wird Verformung technisch gebaut? | GDD 11 §19–32 |
| Wie muss sich der Prototyp anfühlen? | GDD 01 §70 · GDD 12 §4 |

### Fressen (Kernmechanik)

| Frage | Dokument |
|-------|----------|
| Fresschance, Levelgrenzen, HP-Einfluss | GDD 01 §21–25 · GDD 04 §25 |
| Fressanimation, Umschlingen, Erfolg/Fehlschlag | GDD 01 §26–32 |
| Abnehmender Grenznutzen bei Wiederholung | GDD 01 §35–36 · GDD 04 §16–17 |
| Klassenabhängige Fressboni | GDD 01 §37 · GDD 03 §8–9 · GDD 04 §18 |
| Boss-Fressen und Fähigkeitsränge | GDD 01 §40–44 · GDD 02 §52–55 |
| Fressen vs. Töten (Gold-Zielkonflikt) | GDD 01 §34 · GDD 04 §11–12 · GDD 05 §27 · GDD 08 §21 |
| Technischer Ablauf eines Fressversuchs | GDD 11 §33–39, §119 |
| UI-Feedback beim Fressen | GDD 10 §18–19, §77–78, §140–141 |

### Kampf & Klassen

| Frage | Dokument |
|-------|----------|
| Combat Loop, Auto-Angriff, Zielsystem | GDD 02 §2–9 |
| Hotbar und Fähigkeiten ausrüsten | GDD 02 §12–15 · GDD 10 §12–17, §58–60 |
| Die sechs Klassen im Detail | GDD 03 §10–35 |
| Ressourcen (Mana, Wut, Stealth-Punkte) | GDD 02 §17–28 · GDD 10 §9–11 |
| Talente ab Level 10 | GDD 03 §38–46 · GDD 02 §47 |
| Level-30-Spezialisierung | GDD 03 §47–51 · GDD 02 §48–49 |
| Klassenlehrer vs. Boss-Drops | GDD 02 §50–51 · GDD 03 §36–37 · GDD 07 §25–29 |
| Aggro, Tanking, Rollen | GDD 02 §43–46 · GDD 08 §11–13 |
| Beispiel-Builds | GDD 03 §54–55 · GDD 13 §15–17, §45–50 |

### Progression

| Frage | Dokument |
|-------|----------|
| Levelkurve und Meilensteine | GDD 04 §7–8, §28–31 |
| Größenwachstum des Schleims | GDD 01 §45–48 · GDD 04 §4–6 · GDD 10 §7, §144 |
| Tod, Respawn, Levelverlust | GDD 01 §49–55 · GDD 04 §32–42 |
| Zwei Progressionsachsen (vertikal/horizontal) | GDD 04 §19–22 |
| Bestiarium | GDD 05 §45–46 · GDD 08 §27–28 · GDD 10 §52–55 |

### Items & Wirtschaft

| Frage | Dokument |
|-------|----------|
| Ausrüstungstypen und Itemwerte | GDD 05 §3–11 |
| Seltenheitsstufen und Farben | GDD 05 §14–21 · GDD 02 §54 · GDD 10 §85–86 |
| Gold, Schmiede, Verkauf | GDD 05 §26–29, §51 · GDD 08 §20–24 |
| Spielerhandel | GDD 05 §40–42 · GDD 08 §18–19 · GDD 10 §50–51 |
| Tränke | GDD 05 §35–39 · GDD 08 §25 |

### Welt & Lore

| Frage | Dokument |
|-------|----------|
| Wer sind Eldoran und Ravok? | GDD 06 §4–19 |
| Verbündete Völker | GDD 06 §24–30 |
| Fraktionsführer, Hauptstädte | GDD 06 §43–46 · GDD 09 §11–12 |
| Was bleibt bewusst ungeklärt? | GDD 00 §39–40 · GDD 01 §69 · GDD 06 §32–35, §52–54 |
| Zonen, Levelbereiche, Wegverzweigungen | GDD 09 §3–6, §28–30, §37–42 |
| Kreaturenhabitate und Gegnerplatzierung | GDD 09 §15–20 |
| Architektur der Fraktionen | GDD 06 §6, §13 · GDD 09 §45–47 |

### Quests

| Frage | Dokument |
|-------|----------|
| Questarten und Struktur | GDD 07 §2–5, §15 |
| Questzieltypen (inkl. Fressquests) | GDD 07 §7–9, §41–42 |
| Questgeber, Ketten, Freischaltung | GDD 07 §10–14, §44–46, §66 |
| Fraktionsabhängige Quests | GDD 07 §32–36, §62 |
| Questdarstellung in der UI | GDD 10 §24–32 |

### Multiplayer

| Frage | Dokument |
|-------|----------|
| Gruppen und Rollen | GDD 08 §8–13 |
| PvP-Regeln (kein Spielerfressen) | GDD 08 §14–17 · GDD 02 §61–62 |
| 8 Charakter-Slots | GDD 08 §3–6, §44–47 · GDD 11 §9 |
| Solo- vs. Gruppenspiel | GDD 08 §34–36 |
| Chat und soziale UI | GDD 10 §87–93 |

### UI & Steuerung

| Frage | Dokument |
|-------|----------|
| HUD-Layout (Referenz) | GDD 10 §3, §150 |
| Tastenbelegung | GDD 10 §151 |
| Kamera | GDD 10 §65–70 · GDD 00 §7 |
| Informationshierarchie | GDD 10 §104–108, §154–155 |
| Charaktererstellung | GDD 10 §126–130 · GDD 01 §57 · GDD 13 §3–4 |
| Tutorials | GDD 10 §121–123 |

### Technik & Planung

| Frage | Dokument |
|-------|----------|
| Client/Server, Server Authority | GDD 11 §3–7, §98, §106, §120 |
| Datenmodell, Data-Driven Design | GDD 11 §8–13, §76–79 |
| Netzwerk, Prediction, Interpolation | GDD 11 §22–25, §63–70, §104 |
| Performance und LOD | GDD 11 §99–103 |
| Entwicklungsphasen und Milestones | GDD 12 §3–24 |
| Was zuerst gebaut wird | GDD 11 §105 · GDD 12 §2, §23 |
| Definition of Done | GDD 01 §70 · GDD 11 §121 · GDD 12 §30 |

---

## 3. Kanonische Kurzreferenz

Diese Werte sind dokumentübergreifend festgelegt. Bei Widersprüchen gilt die hier genannte Quelle.

### Fraktionen

| | Eldoran | Ravok |
|---|---------|-------|
| Farbe | Blau | Rot |
| Hauptstadt | Valoria | Drakhar |
| Anführer | König Aldric | Häuptling Ragor |
| Werte | Ordnung, Glaube, Schutz | Stärke, Freiheit, Ehre |
| Verbündete | Menschen, Elfen, Zwerge | Orcs, Oger, Trolle |
| Startgebiet | Wald, Wiesen, Flüsse | Brachland, Küste |

Quelle: GDD 06 §4–19, §43, §61 · Hauptstädte: GDD 09 §11

> **Achtung:** *Valoria* und *Drakhar* sind **Städte**, nicht Fraktionen. Frühere Entwürfe verwendeten diese Namen für die Fraktionen selbst.

### Klassen und Verfügbarkeit

| Klasse | Ressource | Eldoran | Ravok |
|--------|-----------|:-------:|:-----:|
| Krieger | Wut | ✓ | ✓ |
| Paladin | Mana | ✓ | — |
| Mage | Mana | — | ✓ |
| Priester | Mana | ✓ | ✓ |
| Schurke | Stealth-Punkte | (✓) | ✓ |
| Druide | Mana | ✓ | ✓ |

(✓) = spielbar, aber gesellschaftlich nicht anerkannt — kulturelle, keine mechanische Einschränkung.

Quelle: GDD 03 §5–6, §27 · kulturelle Begründung: GDD 06 §10–11, §17–18

### Level-Meilensteine

| Level | Bedeutung | Quelle |
|------:|-----------|--------|
| 1 | Start, harte Untergrenze bei Verlust | GDD 04 §3, §35 |
| 10 | Talent-System (1 Punkt pro Level) | GDD 03 §38 · GDD 04 §28 |
| 20 | Mounts | GDD 04 §29 · GDD 08 §29 |
| 30 | Große Spezialisierungsentscheidung | GDD 03 §47 · GDD 04 §30 |
| 80 | Maximallevel | GDD 04 §2, §31 |

### Seltenheitsstufen

Common (Grau) · Uncommon (Grün) · Rare (Blau) · Epic (Lila) · Legendary (Gold) · Mythic (Rot)

Gilt identisch für Items und Bossfähigkeiten. Quelle: GDD 05 §15 · GDD 01 §42

### Weitere feste Werte

- **8 Charakter-Slots** pro Account — GDD 08 §3, §45
- **10 Hotbar-Slots**, Hotkeys 1–10 — GDD 02 §12 · GDD 10 §12
- **Fressen** auf eigener Taste, Vorschlag `E` — GDD 02 §14 · GDD 10 §18
- **Interagieren** auf getrennter Taste, Vorschlag `F` — niemals mit der Fresstaste geteilt — GDD 10 §18, §44, §151
- **Sichtbare Größe = ausschließlich Level.** Masse ist ein interner Fressfortschritt ohne optische Wirkung — GDD 01 §29, §45 · GDD 04 §4, §13
- **Bestiarium** führt zwei getrennte Zähler (besiegt / gefressen) — GDD 04 §49 · GDD 05 §45 · GDD 08 §27 · GDD 10 §54
- **6–10 Level über dem Spieler** → 0 % Fresschance — GDD 01 §23 · GDD 04 §25
- **6–7 Level Unterschied** spürbar im PvP — GDD 02 §60 · GDD 08 §16
- **Max. ~7 Quests** pro Questgeber — GDD 07 §10, §66
- **Kein Fressen anderer Spieler** — GDD 00 §30 · GDD 02 §61 · GDD 08 §14

---

## 4. Die fünf Design-Säulen

1. **SLIME FIRST** — Der Schleim ist die zentrale Figur.
2. **EAT TO EVOLVE** — Fressen ist Charakterentwicklung.
3. **EVERY SLIME IS DIFFERENT** — Eigener Build statt Einheitscharakter.
4. **A LIVING FANTASY MMORPG** — Erkundbare, soziale Welt.
5. **LONG-TERM CHARACTER JOURNEY** — Geschichte über hunderte Stunden.

Quelle: GDD 00 §50

---

## 5. Leserouten

**Neu im Projekt** → 00 → 01 → 02 → 03
**Gameplay-Design** → 01 → 02 → 03 → 04 → 05
**Welt und Narrative** → 06 → 09 → 07 → 13
**Engineering** → 11 → 01 (Bewegung/Verformung) → 08 → 12
**UI/UX** → 10 → 02 (Hotbar) → 07 (Quest-Tracker) → 13
**Produktion/Planung** → 12 → 11 §105 → 00

---

## 6. Abgrenzungsregeln

Jedes GDD definiert seinen Bereich abschließend. Bei Überschneidungen gilt:

| Thema | Zuständig | Nicht zuständig |
|-------|-----------|-----------------|
| Schleimkörper und Fressmechanik | 01 | alle anderen |
| Einzelne Kampffähigkeiten | 02 | 03 |
| Klassenentwicklung und Builds | 03 | 02 |
| Lore und Kultur | 06 | 09 |
| Konkrete Zonen und Content | 09 | 06 |
| Questsystematik | 07 | 09 |
| UI-Darstellung beliebiger Systeme | 10 | die Systeme selbst |
| Technische Umsetzung | 11 | Gameplay-GDDs |
| Reihenfolge der Umsetzung | 12 | 11 |

Lore-Mysterien (Herkunft der Schleime) werden bewusst **in keinem Dokument** aufgelöst — siehe GDD 01 §69, GDD 06 §32–35, GDD 00 §39–40.

---

## 7. Archiv

`_archiv/GDD-06-UI-HUD-User-Experience_SUPERSEDED.md` — früherer UI-Entwurf, der ursprünglich als GDD 06 geführt wurde. Ersetzt durch **GDD 10 — UI, UX & Controls**. Nur historische Referenz, nicht verbindlich.
