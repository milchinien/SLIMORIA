# Prototyp: animierte 2D-Sprites in einer 3D-Welt

Isolierter Technik- und Stiltest. Der Prototyp wird von `slimoria/` nicht
importiert und verändert das eigentliche Spiel nicht.

## Start

```powershell
cd prototypen/sprite-billboards
npm install
node serve.mjs
```

Dann `http://127.0.0.1:8101` öffnen.

## Getestete Idee

- Figuren bestehen vollständig aus generierten 2D-Sprite-Atlanten.
- Die Arena ist eine echte Three.js-3D-Szene: eine horizontale 80×80-Plane mit
  wiederholter Anime-Grastextur, 3D-Bäume und -Felsen, Schatten, Nebel,
  Perspektivkamera und Raycasting auf Weltkoordinaten.
- Die Figuren sind *spherical billboards*: Nur ihre unsichtbare Bildebene
  entspricht überall der Kameraebene. Die Anime-Figur darauf behält eine feste
  Weltblickrichtung und blickt nicht zum Betrachter. Passende Links-/Rechts-
  Profile werden mit einer Totzone gewählt, damit beim Kameradrehen nichts
  flackert oder willkürlich die Richtung wechselt.
- Richtungsatlas mit Front-, Rücken- und Seitenansichten verhindert, dass
  Vorwärtsbewegung wie seitliches Gleiten aussieht.
- Kampf-Lock hält etwa 2,0 Einheiten Abstand und richtet den Schleim permanent
  auf das anvisierte Ziel aus.
- Generierte, nahtlos wiederholte Anime-Grastextur auf echter 3D-Geometrie.
- Animationen: Ruhe, Bewegung, Angriff, Treffer, Fressen und Tod beim Spieler;
  Ruhe, Bewegung, Angriff, Treffer und Tod bei Wolf und Eber.

## Einzelne Aktionsstreifen

Die direkt vom Spiel verwendeten, zugeschnittenen Animationen liegen unter
`assets/animations/`. Jede PNG-Datei enthält genau eine Aktion mit zwölf
horizontalen Frames. Jeder Frame besitzt 24 Pixel transparenten Sicherheitsrand.
`manifest.json` beschreibt Dateipfade und Zellmaße; Wolf und Eber haben getrennte
Links-/Rechts-Streifen, der Schleim acht Blickrichtungen.

Neu erzeugen lassen sich die Dateien mit:

```powershell
python tools/build_action_sheets.py
```

## Steuerung

`WASD` Bewegung, Klick auf Boden oder Gegner, `1` Angriff, `E` Fressen,
Leertaste Sprung, rechte Maustaste ziehen für Kamera, Mausrad Zoom, `R` Reset.

Die Atlanten unter `assets/` wurden mit dem eingebauten Bildgenerator erstellt.
