# SLIMORIA — Prototyp-Auftrag (verbindliche Kurzfassung)

Quelle ist immer `Doc/gdd/`. Diese Datei fasst nur zusammen, was für **Phase 1
(Slime Movement Prototype)** und **Phase 2 (Slime Combat Prototype)** gilt.
Bei Zweifel: das GDD lesen, nicht diese Datei erweitern.

Auflösung, in der gebaut und beurteilt wird: **1600 × 900**.

---

## 0. Umfang

Drin (GDD 12 §4–5): Schleim, Testarena, Third-Person-Kamera, Klickbewegung,
Beschleunigung, Abbremsen, Richtungswechsel, dynamische Verformung, Kollision,
einfache Kreatur, Angriff, HP, Schaden, Fressmechanik + Fressanimation,
Erfolg/Fehlschlag, einfache Belohnung.

Draußen: Quests, Klassen, Talente, Welt, Handel, Inventar, Fraktionspolitik.

Zusatz aus GDD 11 §121 (technische Basis): zwei gleichzeitig verbundene
Spieler, serverautoritatives Gameplay, persistenter Charakter, Zielauswahl,
einfache Fähigkeit, Level.

---

## 1. Abnahmeliste A — GDD 01 §70 (22 Punkte)

1. Schleim erstellen
2. Schleim aus der dritten Person sehen
3. Auf einen Punkt klicken
4. Schleim dorthin bewegen
5. Beschleunigung und Abbremsen sehen
6. Richtungswechsel spüren
7. Schleim wabbeln sehen
8. Geschwindigkeit an der Körperform erkennen
9. Kreatur finden
10. Zum Gegner bewegen
11. Gegner bekämpfen
12. Gegner schwächen
13. Fressversuch auslösen
14. Schleim umschlingt den Gegner
15. Fressversuch gelingt oder scheitert
16. Erfolg/Fehlschlag visuell eindeutig erkennen
17. Nach erfolgreichem Fressen die Veränderung wahrnehmen
18. Mehrere Kreaturen fressen
19. Level aufsteigen
20. Wachstum des Schleims erkennen
21. Bei Tod die charakteristische Todesanimation sehen
22. Am Friedhof respawnen

## 2. Abnahmeliste B — GDD 11 §121 (technische Basis)

3D-Welt · Third-Person-Kamera · Klickbewegung · flüssige Schleimbewegung ·
dynamische Schleimverformung · Kreatur · Zielauswahl · grundlegender Angriff ·
Fressversuch · Fresserfolg · Fressfehlschlag · HP · Level · einfache Fähigkeit ·
zwei gleichzeitig verbundene Spieler · serverautoritatives Gameplay ·
persistenter Charakter

---

## 3. Die drei Leitregeln (jede Animation kann daran scheitern)

**GDD 01 §66 — Masse statt Animation.** Der Schleim darf nie wie ein Objekt mit
Schleim-Textur aussehen. Der Körper reagiert *immer* auf die Bewegung:
beschleunigen, stoppen, springen, aufprallen, fressen, zurückgeschleudert
werden, sterben.

**GDD 01 §67 — Physikgefühl statt Simulation.** Keine vollständige
Flüssigkeitssimulation. Physik darf nie dazu führen, dass Kontrolle,
Lesbarkeit, Treffsicherheit oder Synchronisation leiden.
Ziel: *„sieht physikalisch glaubwürdig aus, fühlt sich wie ein präzises Spiel an."*

**GDD 01 §68 — Anime + Physik.** Physik liefert Gewicht, Trägheit, Verformung,
Elastizität, Masse. Anime liefert starke Bewegungsphasen, übertriebene
Deformation, klare Silhouetten, humorvolle Reaktionen, sichtbare Impact-Momente.
Ergebnis: nicht realistisch, sondern **glaubwürdig und charaktervoll**.

---

## 4. Harte Verbote

* **GDD 01 §62** — keine humanoide Laufanimation, kein MMO-Charakter mit
  Schleimhaut, keine Identität über Rüstung, keine Verwandlung in Kreaturen,
  kein automatisches Fressen durch reinen Levelüberschuss.
* **GDD 01 §16** — keine Wandkletterei, keine senkrechten Flächen.
* **GDD 01 §18** — kein Schwimmen, kein Unterwasser-Gameplay.
* **GDD 01 §5 / GDD 11 §28** — nie völlig flach, nie beliebig deformierbare
  Flüssigkeit; die Blob-Identität geht **niemals dauerhaft** verloren.
* **Sichtbare Größe kommt ausschließlich vom Level** (GDD 01 §29, §45–48 ·
  GDD 04 §13). Fressen erzeugt nur eine kurzzeitige pralle Reaktion.

---

## 5. Schleimseite — was beurteilt wird

**§12 Bewegungsanimation.** Niemals „Kugel gleitet mit Laufgeschwindigkeit".
Langsam: kompakt, leichte Wellenbewegung, kleine seitliche Verformung, leichtes
Wippen. Schnell: zieht sich in Bewegungsrichtung, hinterer Teil bleibt kurz
zurück, schwingt nach, Oberfläche wabbert stärker, seitliche Bewegung, federt in
die Bewegung hinein.

**§13 Beschleunigung.** Stillstand → Anrollen → Beschleunigung → Maximum.
Stoppen: Maximum → Abbremsen → **leichtes Nachschwingen** → Stillstand. Der
Körper darf kurz über die Zielbewegung hinausschwingen.

**§14 Geschwindigkeit verformt.** Langsam = kompakter Blob. Mittel = leicht nach
vorn gezogen. Schnell = deutlich in Bewegungsrichtung gestreckt. Sehr schnell =
vorne flacher und länger, hinterer Teil wird nachgezogen.

**§15 Richtungswechsel.** Abbremsen → verformen → kurz nachschwingen →
Richtung ändern → in die neue Richtung beschleunigen. Muss sichtbar Masse haben.

**§20 Aufprall.** Beim Kontakt flach gedrückt → Masse federt zurück → Körper
stabilisiert sich. Humorvoll, ohne die Masse zu verlieren.

**§26–32 Fressen — der wichtigste Einzelmoment des Spiels.**
* §27 Beginn: Körper richtet sich auf das Ziel aus, verformt sich deutlich,
  **schnellt** auf den Gegner zu, Masse wird nach vorn gezogen.
* §28 Umschlingen: Blase/Kugel **um** den Gegner. Der Gegner ist sichtbar
  *innerhalb* der Schleimmasse. Die Masse bewegt sich kurz um ihn herum. Dann
  Absorption, dann zieht der Schleim sich zusammen.
* §29 Erfolg: Gegner verschwindet in der Masse → verarbeiten → Belohnung →
  normale Form → Schleim landet **am Ort des Gegners** → Körper wirkt kurz
  praller und schwingt nach → stabilisiert sich.
* §30/§31 Fehlschlag — der Rückschnapp: schnellt zum Ziel → Umschlingung wird
  versucht → Gegner widersteht → Schleim wird **elastisch zurückgezogen** wie
  überdehnt → Körper schnellt zurück → Blob wabbert nach → landet ungefähr an
  der Ausgangsposition. „Eine der wichtigsten Animationen des gesamten Spiels.
  Sie muss sich **befriedigend** anfühlen."
* §32 Der Unterschied Erfolg/Fehlschlag muss **visuell klar** sein.

**§50 Todesanimation.** Form verlieren → stark zittern/verformen → **platzen** →
dunklere Schleimpfütze bleibt → Augen schwimmen sichtbar in der Pfütze → Farbe
dunkler und „tot" → Rücksetzung zum Friedhof. Darf humorvoll wirken, muss
eindeutig „tot" vermitteln.

**§5–§8 Körper.** Weich, rundlich, leicht asymmetrisch, elastisch, wabbelnd,
kompakt genug als Spielfigur. Gesicht ist Bestandteil des Körpers, nie
aufgesetzt; verformt sich mit der Oberfläche. Farbe = Fraktion:
**Eldoran blau, Ravok rot** (Valoria/Drakhar sind Städte, keine Fraktionen).

---

## 6. MMO-Seite — was beurteilt wird

**GDD 02 §2 Combat Loop.** Gegner auswählen → hinbewegen → Reichweite →
Auto-Angriff beginnt → Fähigkeiten → HP sinkt → reagieren → besiegt →
töten ODER fressen.

**§3 Zielauswahl.** Linksklick wählt. UI zeigt Name, Level, HP.
**§4 Rechtsklick-Kampf.** Rechtsklick: Ziel setzen → automatisch hinbewegen →
in Reichweite angreifen → weiter automatisch angreifen, Fähigkeiten parallel.
**§5 Auto-Angriff** läuft weiter solange Ziel gültig, in Reichweite, lebendig.
**§6/§7 Biss.** Keine menschlichen Waffenanimationen. Ablauf:
normaler Blob → Mund öffnet sich → Körper zieht sich zum Gegner → Biss →
Schleim federt zurück. Der Angriff soll **körperlich** wirken.

**GDD 10 §3/§150 HUD-Layout** (Referenz, klassisches MMORPG):
Minimap oben rechts, Quest-Tracker darunter, Gruppe links, HP/Ressource links
unten, Hotbar `[1]…[10]` zentriert unten.

**§12–17 Hotbar.** 10 Slots, Hotkeys 1–10. Icon, Abklingzeit, Ressourcen-
verbrauch, Tastenkürzel, Verfügbarkeit. Cooldown: Icon abdunkeln, verbleibende
Zeit anzeigen, Wiederverfügbarkeit deutlich machen. Fehlende Ressource muss
sichtbar sein, ohne Ausprobieren. Tastatur **und** Maus bedienbar.

**§18 Tasten.** `E` = Fressen, ausschließlich dafür reserviert. `F` =
Interagieren. Niemals dieselbe Taste.

**§21 Zielanzeige.** Mindestens Name, Level, HP. Beispiel:
`Wolf — Level 8` / `██████░░░░ 63 %`

**§73–78 Feedback.** Treffer, Schaden, Heilung, Ressourcenverbrauch,
Statusänderungen unmittelbar verständlich. Schadenszahlen in der Welt über dem
Ziel. Heilung von Schaden unterscheidbar. Level-Up deutlich, aber nicht
weltblockierend. Fress-Erfolg braucht **besonders starkes** Feedback.
Fress-Fehlschlag muss eindeutig als Fehlschlag erkennbar sein.

**§151 Steuerung.** Linksklick = Ziel/Auswahl/UI · Rechtsklick = zielorientierte
Aktion/Angriff · Klick auf Boden = Bewegung · E = Fressen · F = Interagieren ·
1–10 = Hotbar · Maus = Kamera · Rad = Zoom · ESC = Menü.

**Lesbarkeit schlägt Effektdichte.** GDD 10 §98: der Spieler soll den Schleim
erleben, nicht Werte verwalten — Effekte dürfen die Sicht auf den Schleim nicht
überladen. GDD 02 §64: eine einfache, sehr gute Animation ist besser als zehn
komplexe, unlesbare Effekte.

---

## 7. Fressregeln (Zahlen)

* Fresschance steigt, je stärker der Gegner geschwächt ist (GDD 01 §24).
* Levelunterschied ist zentraler Faktor: Spieler 10 vs. Gegner 1 → 100 %;
  Spieler 3 vs. Gegner 1 → ca. 40 % (GDD 01 §22).
* Gegner **6–10 Level über dem Spieler → 0 % Fresschance** (GDD 01 §23).
* Massive Überlegenheit erlaubt den direkten Fressversuch ohne Vorkampf (§25).
* Fehlschlag kostet Schaden bzw. den definierten Verlust (§30).
* Server berechnet die Chance, der Client spielt nur das Ergebnis (GDD 11 §34–35).

---

## 8. Die Latte

* **MMORPG-Gerüst:** World of Warcraft — The War Within, HUD bei 1600×900.
* **Schleimkörper:** Slime Rancher 2, Verformung bei vergleichbarer
  Kameradistanz.

Referenzmaterial liegt unter `slimoria/ref/`. Verglichen wird gegen das
**Material**, nicht gegen eine Beschreibung davon.
