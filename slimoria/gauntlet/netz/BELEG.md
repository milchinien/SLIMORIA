# Netzbelege — Abnahmeliste B (GDD 11 §121)

Erzeugt von `tools/netzbild.mjs` am 2026-08-19 05:08:33. Zwei kopflose Chrome-Clients bei
1600 × 900 an einem Serverprozess. Rohbilder in `roh/`, die Belegseiten in `seite/`.

## bewegung — belegt

![bewegung](bewegung.png)

Vier Bildschirme aus zwei getrennten Browsern, je Spalte derselbe Augenblick: der blaue Schleim steht links im Bild und nach dem Lauf bei BEIDEN Clients rechts im Bild — Client 2 hat dabei nichts getan ausser zuzusehen.

## fressen — belegt

![fressen](fressen.png)

Sechs Bildschirme: Client 1 waehlt den Wolf, umschlingt ihn und steht danach ohne Gegner da; Client 2 sieht denselben Wolf in seiner Welt und danach dieselbe Luecke. Das Urteil des Servers (Chance, Wurf, Wurf-Nummer) steht unter der rechten Spalte.

## persistenz — belegt

![persistenz](persistenz.png)

Drei Bildschirme mit vergroessertem HUD: Level und XP vor dem Neustart, Level 1 und 0 XP im frisch geladenen Client ohne Verbindung, und nach dem Neustart wieder derselbe Stand. Darunter die Charakterdatei, die der Server auf die Platte geschrieben hat.

## Pruefungen

| Beleg | Aussage | Ergebnis |
|---|---|---|
| bewegung | Client 2 zeigt die Bewegung von Client 1 | zeigt es |
| fressen | Client 1 spielt Umschlingung und Erfolg | zeigt es |
| fressen | Client 2 sieht denselben Vorgang | zeigt es |
| persistenz | Level und XP stehen nach dem Neustart wieder im HUD | zeigt es |

Messwerte zu jeder Zeile: `netzbild.json`.

## Was die Bilder nicht hergeben

* **Fressanimation beim Zuschauer.** In `fressen.png` zeigt die mittlere Spalte von Client 2 den fremden Schleim als ruhenden Koerper — kein Anlauf, kein Umschlingen, kein Rueckschnapp. Der Gegner steht dort waehrend des Versuchs immerhin noch, der Vorgang hat also eine Dauer; was fehlt, ist die Phase des fremden Spielers im Zustand.
