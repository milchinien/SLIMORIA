# Phase Grafik — Zielbild Genshin Impact / Tower of Fantasy

Diese Phase startet ERST, wenn alle 17 Teile des Gauntlets blind gewonnen sind
und beide Abnahmelisten (GDD 01 §70, GDD 11 §121) erfuellt sind.

## Auftrag

Die Grafik auf das Niveau von Genshin Impact bzw. Tower of Fantasy bringen.

## Was das heisst und was nicht

**Nicht erreichbar:** pixelgleiche Uebereinstimmung. Beides sind Produktionen
mit tausenden handgebauten Assets, figurenspezifischen Ramp-Texturen und
eigener Art Direction. Deren Assets zu uebernehmen ist ausserdem nicht zulaessig.

**Erreichbar und das Ziel:** ihr Renderverfahren. Wer die Technik trifft, trifft
den Eindruck. Konkret:

| Baustein | Was Genshin/ToF tun |
|---|---|
| Figurenschattierung | Cel-Shading ueber Ramp-Textur statt Lambert, Lichtmaske steuert wo der Schattenrand laeuft |
| Gesicht | Vorzeichenbehaftete Abstandskarte statt Geometrieschatten — die Nase wirft nie einen haesslichen Schatten |
| Kontur | Umgedrehte Huelle mit Normalen nach aussen, Dicke abhaengig von Kameradistanz |
| Glanz | harte Specular-Stufe plus Matcap fuer Metall, kein weiches Blinn-Phong |
| Randlicht | Fresnel-Randlicht, das die Silhouette vom Hintergrund abhebt |
| Himmel | Atmosphaerenstreuung, Tageszeit, Wolkenschicht, Sonnenscheibe |
| Licht | ein Hauptlicht, weiche Umgebungsverdeckung, Farbtemperatur nach Tageszeit |
| Wasser | stilisierter Schaumrand, Tiefenfarbverlauf, Brechung |
| Vegetation | Windwelle im Vertex-Shader, Aufhellung von unten |
| Nachbearbeitung | Bloom mit Schwelle, Tonemapping, Farbgrading, leichte Tiefenschaerfe |

## Vorgehen

Dieselbe Maschinerie wie beim Gauntlet: pro Baustein ein Builder, ein Pruefer
mit eigenen Aufnahmen und ein blinder Richter, der unser Bild gegen einen
echten Screenshot aus Genshin/ToF bei 1600x900 legt, ohne zu wissen welches
welches ist. Fertig ist ein Baustein, wenn der Richter blind unseren waehlt.

Referenzmaterial: ref/genshin/, ref/tof/, ref/npr/

## Randbedingungen, die bestehen bleiben

- Reines WebGL2, keine externen Laufzeit-Abhaengigkeiten, kein Build-Schritt.
- Der Schleim bleibt ein Weichkoerper mit 162 Massepunkten bei 240 Hz. Die
  Grafik darf das Spielgefuehl nicht kosten (GDD 11 §32, §99-103).
- Die Verbote aus GDD 01 §62/§16/§18/§5 gelten unveraendert weiter.
- Lesbarkeit schlaegt Effektdichte (GDD 10 §98, GDD 02 §64) — auch hier.
