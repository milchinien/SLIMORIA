# PHASE-GRAFIK — Umsetzungsplan

Begleitpapier zu `PHASE-GRAFIK.md`. Dort steht der Auftrag, hier steht, wie er
in **diesem** Renderer gebaut wird — nicht in einem gedachten idealen.

Grundlage ist die Recherche zu Genshin Impact und Tower of Fantasy
(Verfahren, Shader-Dekompilate, eigene Pixelmessungen an `ref/genshin/` und
`ref/tof/`) plus der vollstaendig gelesene Ist-Stand von
`client/renderer.js` (867 Zeilen).

Alle Zahlen in diesem Papier sind gekennzeichnet:
**[BELEGT]** = aus Quelle oder eigener Messung, **[GERECHNET]** = aus belegten
Zahlen abgeleitet, **[GESCHAETZT]** = begruendete Vermutung.

---

## 0. Ist-Zustand — was heute wirklich da ist

Gelesen, nicht vermutet.

| Sache | Stand |
|---|---|
| Programme | 5: `slime`, `solid`, `ground`, `himmel`, `decal` |
| Vertexattribute | genau zwei: `location 0` Position, `location 1` Normale |
| Texturen | **keine** — kein einziges `gl.createTexture` im Modul |
| Framebuffer | **keine** — kein `gl.createFramebuffer`, gezeichnet wird direkt in den Standardpuffer |
| Erweiterungen | **keine** — kein `gl.getExtension` |
| Gammabehandlung | **keine** — Shaderwerte gehen unveraendert als sRGB heraus |
| Kantenglaettung | Kontext mit `{antialias:true}` (Zeile 316) — gilt nur fuer den Standardpuffer |
| Netze | Icosphere Stufe 2 (162 Punkte) fuer *alles* Runde, Wuerfel (harte Normalen), Quad |
| Schleimnetz | 2562 Punkte, 5120 Dreiecke, `Uint16`, jedes Bild per `bufferSubData` neu hochgeladen |
| Schleim-Durchgaenge | zwei, alphagemischt, `CULL_FRONT` dann `CULL_BACK`, **`depthMask(false)`** |
| Gesicht | eigene Netze (Linsen), gezeichnet **vor** dem Gel, mit `uEmissive` flachgelegt |
| Schatten | drei gestapelte Bodendekale, **kein** echter Schattenwurf |
| Zeichenaufrufe | rund 90 je Bild (17 Requisiten, ~39 Kreaturenteile, 21 Gesichtsteile, ~10 Dekale, 2 Gel, Himmel, Boden) |
| Kamera | `fovY = PI/3.6 = 50°`, `near 0.1`, `far 300`, Abstand 6,5–10 m, Nickwinkel 0,12–0,40 rad |

**Zwei Messungen, die die Reihenfolge im Plan bestimmen:**

1. **Der Himmel ist fast nie im Bild.** Bei `fovY = 50°` liegt die Oberkante
   des Bildes bei `pitch − 25°`. Der Himmelsanteil ist
   `(tan25° − tan(pitch)) / (2·tan25°)`:
   Standardkamera (pitch 0,40) → **4,6 %**; `aufprall` (0,12) → **37 %**;
   `anrollen` (0,20) → **27 %**; `wabbeln` (0,28) → **17 %**. [GERECHNET]
   Der **Boden** ist in jedem Bild die groesste Flaeche. Wer zuerst am Himmel
   arbeitet, arbeitet an 5 % des Bildes.

2. **Die Aufnahme-Pipeline kann alles, was der Plan braucht.** Selbst im
   kopflosen SwiftShader (das ist der Rasterizer, mit dem `tools/capture.mjs`
   aufnimmt) sind vorhanden: `EXT_color_buffer_float`, `RGBA16F` als
   vollstaendiges FBO-Ziel, `SAMPLES = 4` fuer `RGBA8` **und** `RGBA16F`,
   `DEPTH_COMPONENT24` als Textur, `TEXTURE_3D`, `OES_texture_float_linear`,
   `MAX_DRAW_BUFFERS = 6`. [BELEGT — eigene Sondierung, 2026‑08‑19]
   Es gibt in dieser Liste also **keinen** Baustein, der an einer
   WebGL2-Grenze scheitert. Was scheitert, scheitert an Kosten oder am Stil.

**Eigene Nachmessung der wichtigsten Referenzzahl** (damit der Plan nicht auf
fremden Angaben steht): `ref/genshin/figur_fischl_oberkoerper_cel_crop.png`,
Zeile 470, x = 228…267 liefert ein Lichtplateau `(247,238,227)` ueber 30 px mit
±1 Schwankung, einen Uebergang ueber **2 px** (`246,220,203` → `244,201,180`)
und ein Schattenplateau `(243,195,178)`. Schattenmultiplikator
**(0,983 / 0,819 / 0,784)**, Leuchtdichteverhaeltnis **0,854**. [BELEGT]
Das Dossier stimmt.

---

## 1. Was den Look ausmacht

Fuenf Dinge. Ohne sie wird es nicht wiedererkennbar; alles andere ist Ausbau.

### 1.1 Ein saettigender, kanalweise verschiedener Fernnebel — und ein Himmel, der dieselbe Farbe hat

**Warum entscheidend:** Genshins Nebel ist die *Tonwertuntergrenze* des Bildes.
Er deckt vollstaendig (ueber 520 px Bildhoehe exakt `RGB(140,104,85)`, Abweichung
0–2), er ist **heller als alles andere im Bild**, und er wirkt kanalweise
verschieden stark (Nebelanteile an drei gleichen Baumkronen: R 0,41 / G 0,65 /
B 0,77 → Extinktionsverhaeltnis **1 : 1,99 : 2,78**). [BELEGT]
Daraus folgt der in sieben Bildern gemessene Schwarzanteil von exakt 0,000 %.
Unsere Szene hat heute stattdessen einen grauen Dunst
`HORIZONT = (0.405,0.415,0.425)`, in den der Boden ab `bounds·0.7` uebergeht —
richtige Idee, farblos ausgefuehrt.

**Warum das bei uns viel bringt:** Der Boden ist die groesste Flaeche im Bild
(siehe 0.), und der Nebel ist das, was mit dem Boden ueber die Entfernung
passiert. Zusammen mit der Himmelsrampe entscheidet er die Farbstimmung von
rund 95 % der Pixel. Kosten: acht Zeilen GLSL, kein Puffer, keine Textur.

**Nicht verhandelbar:** `uNebel` im Objekt-Shader und `uDunst` im
Himmels-Shader **muessen dieselbe Uniform sein.** Laufen sie auseinander,
reisst am Horizont eine Naht auf — genau dort, wo das Auge am empfindlichsten
ist.

### 1.2 Schattenrampe statt Lambert auf allem Undurchsichtigen

**Warum entscheidend:** Das ist der Kern des NPR-Looks und die einzige Stelle,
an der Genshin und ToF sich als *verschiedene Funktionsklassen* unterscheiden:
Genshin ist stueckweise konstant (14 aufeinanderfolgende Pixel bei exakt
demselben Wert, dann 2 px Stufe), ToF ist stetig (132 → 26 ueber 70 px,
groesster Einzelschritt 8). Faktor rund 12 in der Flankensteilheit. [BELEGT]

Heute rechnet `FS_SOLID` `uColor * (amb + SONNE * ndl)` — ein stetiger Verlauf,
also die ToF-Seite. Die Umstellung auf eine 1D-Nachschlagetextur ist der
groesste Einzelschritt pro Zeile Code in dieser ganzen Liste, weil sie *jedes*
undurchsichtige Objekt gleichzeitig trifft: Felsen, Mauern, drei Kreaturen mit
je 13 Teilen, Augen, Mund.

Dazugehoerig, im selben Schritt: der weiche Blinn-Phong `pow(ndh, 40.0)*uGloss`
(Zeile 161) muss weg. Genshins Glanz ist eine **Binaerstufe**
(`(1.03 − maske.b) < pow(ndh, shininess)`, Ergebnis exakt 0 oder 1). [BELEGT]
Ein weicher Glanz ist im Genshin-Bild das einzige Element mit stetigem
Verlauf — er faellt sofort auf.

### 1.3 Kontur als umgedrehte Huelle — 1 bis 1,5 px, materialfarben, nicht schwarz

**Warum entscheidend:** Das ist das Merkmal, an dem ein Blindrichter Genshin am
schnellsten erkennt. Die Signatur ist ein **Unterschwinger**: ein Pixel, der
dunkler ist als *beide* Nachbarn, und zwar auch dort, wo Figur und Hintergrund
fast gleich hell sind. Gemessen an vier verschiedenen Figurengroessen (355 /
555 / 928 / 1221 px Figurenhoehe) bleibt die Linie bei **1 px**; umgerechnet auf
1600x900 sind das **1–1,5 px**, distanzunabhaengig. Unterschwinger gegenueber dem
Hintergrund: **70–90 Helligkeitsstufen**. Die Farbe ist gemessen `(88,36,48)` auf
violettem Strumpf und `(173,114,105)` an weissem Aermel — also ein dunkler,
warmer Materialton, **kein Schwarz**. [BELEGT]

**Bei uns billig:** ein zweiter `drawElements` je undurchsichtigem Objekt mit
`cullFace(FRONT)`, Verschiebung im Sichtraum. Kein Framebuffer, kein
Fragmentaufwand. Der einzige echte Aufwand faellt beim Netzbau an (siehe 3.2).

### 1.4 Der Boden und die Albedowerte

**Warum entscheidend, obwohl es in keiner Baustein-Liste steht:** Unsere
Requisitenfarben sind `(0.335,0.330,0.310)` fuer Fels und
`(0.355,0.360,0.375)` fuer Mauern; der Boden liegt zwischen 0,25 und 0,33.
Genshins heller Tagesboden misst `RGB(217,221,203)`, also **0,85**, und selbst
Vordergrundgras liegt bei `RGB(134,188,91)`. [BELEGT — eigene Nachmessung
`landschaft_sumeru_dorf_tag_2560.png`, Spalte 1280, ergab `(210,212,190)`]
Wir sind rund **eine Blendenstufe zu dunkel und vollstaendig unbunt.**

Keine Rampe und keine Kontur rettet ein Bild, dessen groesste Flaeche ein
mittelgraues Millimeterpapier ist. Das Plattenraster und das Schachbrett im
`FS_GROUND` haben einen guten Grund (Tempo und Entfernung ablesbar,
GDD 12 §4) — aber Genshins Boden besteht aus *grossen ruhigen Farbflaechen*.
Die Aufgabe ist, die Ablesbarkeit zu behalten und den Kontrast des Rasters auf
das zu senken, was dafuer noetig ist.

Dazu gehoert die senkrechte Felsrampe (*Gradient Tint Rock*): oben heller und
waermer, unten dunkler und relativ blauer. Gemessen am Tafelberg faellt Rot von
99 auf 66 (−33 %), Blau nur von 117 auf 89 (−24 %). [BELEGT] Drei Zeilen im
`FS_SOLID`, und Felsen sehen aus zehn wie aus zweihundert Metern gleich gut aus,
weil es keine Textur gibt, die auseinanderfaellt.

### 1.5 Der Schleim bekommt das Gegenteil der Figurenbehandlung

Ausfuehrlich unter 2. Kurz: **Randaufhellung statt Randabdunklung**, keine
umgedrehte Huelle, keine harte Zweistufigkeit. Das ist keine Vereinfachung,
sondern die physikalisch und stilistisch richtige Antwort auf einen
durchscheinenden Koerper — und `ref/tof/UNTERSCHIEDE.md` §8 empfiehlt sie
ausdruecklich.

---

## 2. Der Schleim — warum Genshins Figurenverfahren hier nicht gilt

Das ist die wichtigste inhaltliche Entscheidung dieses Plans, deshalb steht sie
gesondert.

**Der Befund.** Der Schleim ist durchscheinend (GDD 01 §28: der umschlungene
Gegner muss sichtbar *in* der Masse stecken), wird in zwei alphagemischten
Durchgaengen ohne Tiefenschreiben gezeichnet, und traegt sein Gesicht als
eigene Netze *hinter* dem Gel. Genshins Figurenverfahren setzt in jedem Punkt
das Gegenteil voraus: undurchsichtige Haut, ein Diffusanteil, den man
multiplikativ dimmen kann, und eine Huelle, die hinter dem Koerper unsichtbar
bleibt.

**Was daraus folgt, Punkt fuer Punkt:**

| Genshin-Verfahren | Bei uns | Warum |
|---|---|---|
| Schattenrampe, zwei harte Plateaus | **Nur zwei Baender mit weichem Uebergang, und nur auf dem Kernanteil** | Eine harte Stufe auf einem transparenten Koerper liest sich als *lackierte Schale*. Das Gel muesste dann innen dicht sein — genau das, was GDD 01 §28 verbietet. Der Uebergang darf rund 10 % des Rampenraums breit sein statt 1,5 %. |
| Umgedrehte Huelle als Kontur | **Nein.** Stattdessen `fwidth`-Silhouettenabdunklung *im* Fragment-Shader | Die Huelle liegt hinter dem Koerper. Bei einem transparenten Koerper sieht man sie **durch das Gel hindurch** — die Silhouette wird matschig statt schaerfer. Zweiter Grund: das Gel schreibt keine Tiefe, die Huelle koennte sich also nicht dahinter verstecken. |
| Fresnel nur fuer Trefferfarbe | **Fresnel traegt die Silhouette** | Bei einem streuenden Koerper ist der Blickweg am Rand am laengsten, dort sammelt sich das meiste gestreute Licht. Der Rand **muss** heller sein. Gemessener ToF-Zielwert: Ueberschuss **+91 Stufen** ueber den Hintergrund auf **2,5 px** bei 1600x900. [BELEGT] |
| Gesichts-Abstandskarte (SDF) | **Nicht noetig — schon geloest** | Augen und Mund sind eigene Netze mit `uEmissive` 0,40–0,95. Sie liegen damit schon heute ausserhalb jeder Lichtrechnung, und genau das ist Genshins eigentliche Entscheidung: *ein Anime-Gesicht empfaengt nie einen Schatten.* Zu tun ist nur, sie beim Schattenwurf (G8) ausdruecklich auszunehmen. |
| Anisotroper Haarglanz | Gibt es bei Genshin nicht — bei uns erst recht nicht | Bei Genshin ist der Tangentenkanal von den Konturrichtungen belegt, eine anisotrope Rechnung ist dort strukturell unmoeglich. [BELEGT] Verzichtsentscheidung, spart Arbeit. |

**Kostet die umgedrehte Huelle auf einem Koerper, der sich jeden Frame
verformt, ueberhaupt etwas?** Nein — der Rechenaufwand waere lachhaft: ein
dritter `drawElements` auf denselben, ohnehin schon hochgeladenen Puffer,
5120 Dreiecke, kein Fragmentaufwand. Das Problem ist nicht der Preis, sondern
die Durchsichtigkeit. Wenn spaeter ein *undurchsichtiger* Gegner umschlungen
wird, bekommt **der** eine Huelle.

Der zweite, oft unterschaetzte Punkt: die Normalen des Schleims werden jeden
Tick neu gemittelt und sind an stark gestauchten Stellen unruhig. Jeder
`pow()`-Term verstaerkt diesen Fehler. Deshalb gehoert in den Fresnel-Term ein
Exponent von **3,0**, nicht 5 oder 8 — ein hoher Exponent macht daraus eine
harte Linie, die *flackert*, und sieht ausserdem nach Metall aus statt nach
Streumedium.

---

## 3. Reihenfolge

Jeder Schritt ist einzeln baubar, einzeln aufnehmbar und einzeln blind
beurteilbar — nach demselben Muster wie der Gauntlet. Die Maschine dazu steht
in `gauntlet/grafik-teile.json`.

Die Reihenfolge folgt zwei Regeln:
1. **Erst die grossen Flaechen, dann die kleinen.** Boden und Nebel vor
   Kontur, Kontur vor Bloom.
2. **Erst im Ausgaberaum, dann in HDR.** Alle gemessenen Referenzzahlen sind
   sRGB-Ausgabewerte. Wer zuerst eine Tonwertkurve davorschaltet, muss jede
   Konstante rueckrechnen. Wer die Kurve zuletzt einzieht, hat das Zielbild
   schon festgenagelt und muss nur noch dieselben Ausgabewerte wieder treffen.

### G0 — Messwerkzeug und Grafik-Szenarien

**Datei:** `tools/grafik-mess.mjs` (neu), `client/capture.js` (Szenarien —
gesperrt, siehe 5.1)

**Was sich sichtbar aendert:** nichts. Das ist der Preis dafuer, dass alle
folgenden Schritte messbar statt behauptbar sind.

Das Werkzeug laeuft wie `tools/blind.mjs` (kopfloser Chrome, `getImageData`)
und kann auf *unsere* PNGs **und** auf die Referenzdateien dasselbe rechnen:
Zeilen- und Spaltenscan; Plateau- und Flankenerkennung (laengster Lauf mit
Streuung ≤1, Flankenbreite in px); Vollbildhistogramm mit p0,1/p01/p50/p99 und
Dichte je 4 Stufen; Kanalanteile eines Nebelverlaufs; Chromatizitaet
(sRGB → linear → XYZ D65 → xy) und CCT nach McCamy **nur fuer unbunte Proben**;
Unterschwingersuche an Kanten; radiales Bloomprofil.

**Wie man es misst:** Selbsttest. Das Werkzeug ist richtig, wenn es auf den
Referenzdateien die bekannten Zahlen reproduziert:
`figur_fischl_oberkoerper_cel_crop.png` Zeile 470 → Plateau `(247,238,227)`,
Flanke 2 px, Schatten `(243,195,178)`;
`landschaft_mondstadt_mittag_fernnebel_4k.png` Spalte 300 → Zenit `(34,114,188)`,
Horizont `(117,198,244)`. Beides habe ich bereits selbst nachgemessen und
bestaetigt.

**Szenarien** (ohne HUD, feste Kamera, `follow:false`, jeweils 1–3 Bilder):

| Name | Kamera | wofuer |
|---|---|---|
| `grafik_stand` | yaw 0,9 · pitch 0,28 · dist 7 | Gesamteindruck, das Standardvergleichsbild |
| `grafik_weit` | yaw 0,9 · pitch 0,12 · dist 24 | Himmel, Nebel, Horizontnaht, Arenarand |
| `grafik_kreatur` | yaw 2,2 · pitch 0,22 · dist 4 | Rampe, Kontur, Glanzstufe an einem Wolf |
| `grafik_gegenlicht` | Sonne hinter dem Schleim | Randlicht, Durchleuchtung |
| `grafik_nah` | dist 3,2, Schleim formatfuellend | Silhouettenrand, 1,5-px-Messung |

---

### G1 — Himmel: drei Farben, Potenzrampe, Blickrichtung statt Bildhoehe

**Datei:** `client/renderer.js` (`VS_HIMMEL`, `FS_HIMMEL`), `client/licht.js` (neu)

**Was sich sichtbar aendert:** Der graue Verlauf wird ein gesaettigter Himmel
mit einem *eigenen, helleren Dunstband* direkt ueber dem Horizont. Bei
`grafik_weit` ist das ein Drittel des Bildes.

**Wie gebaut:**
- Drei Uniforms statt zwei Konstanten: `uZenit`, `uHimmelHorizont`, `uDunst`.
  Startwerte Mittag, direkt aus der Messung: Zenit `(34,114,188)/255`,
  Horizont `(121,198,246)/255`, Dunst `(183,217,249)/255`. [BELEGT]
- `smoothstep(0.0, 0.62, ueber)` → `pow(clamp(ueber/0.62,0.0,1.0), 1.6)`.
  Der Exponent ist der Kern des Befunds: die Anpassung `mix(zenit,horizont,t^1,47)`
  ist in sRGB ueber fuenf Stuetzstellen auf ±0,02 stabil, in Linearlicht
  streut sie zwischen 1,51 und 1,89. Belastbarer Bereich **1,5 bis 2,5**. [BELEGT]
- Drittes Band: `col = mix(uDunst, rampe, smoothstep(0.0, 0.06, ueber))`.
  Gemessene Bandhoehe 114 px bei 2160 = **5,3 % der Bildhoehe**. [BELEGT]
- Azimutaler Term (Sonnendunst), eine Zeile:
  `col += uSonnenDunst * pow(max(dot(blick, uSonnenRichtung),0.0), 4.0);`
  Gemessen: sonnenseitig L=190 gegen gegensonnenseitig L=77 auf derselben
  Bildzeile, Faktor 2,5. [BELEGT]
- **Blickrichtung als Varying.** Der heutige Shader nimmt die Bildhoehe in NDC.
  Das ist bei fester Kamerahoehe billig und richtig — aber unsere Kamera nickt
  (pitch 0,06…1,45). Sobald sie nickt, wandert der Verlauf mit dem Bild statt
  mit der Welt und der Himmel „klebt". Fix: inverse ViewProj auf die vier
  Eckpunkte des Vollbildquads, Richtung als Varying, im Fragment-Shader
  normalisieren. Drei Zeilen mehr, und `horizontNdc()` (Zeile 472) entfaellt.

**Wie man es misst:** Spaltenscan durch reinen Himmel; Potenzanpassung ueber
fuenf Stuetzstellen, Exponent muss in [1,5; 2,5] liegen und ueber die
Stuetzstellen auf ±0,1 stabil sein. Dunstband >4 % und <7 % der Bildhoehe.

**Referenzbild:** `ref/genshin/landschaft_mondstadt_mittag_fernnebel_4k.png`,
Ausschnitt `0,0,3840,900` (reiner Himmel), gegen `grafik_weit`, oberes Drittel.

---

### G2 — Fernnebel: kanalweise, saettigend, an `uDunst` gekoppelt

**Datei:** `client/renderer.js` (`FS_SOLID`, `FS_GROUND`, `FS_SLIME`, `FS_DECAL`)

**Was sich sichtbar aendert:** Der Arenarand, die fernen Felsen und die
Bodenebene loesen sich in **dieselbe** helle Dunstfarbe auf wie der Himmel.
Der heutige graue Ring zwischen Arenakante und Horizont verschwindet. Ferne
wird **heller**, nicht dunkler.

**Wie gebaut:**
```glsl
float d = max(length(uCam - vPos) - uNebelStart, 0.0);
vec3  f = vec3(1.0) - exp(-uBeta * d);
col = mix(col, uDunst, f);
```
- Verhaeltnis `uBeta.rgb = beta0 * vec3(0.503, 1.0, 1.397)` — das ist
  `1 : 1,99 : 2,78`, normiert auf Gruen. [BELEGT]
- `beta0 = 0.052 /m`, `uNebelStart = 12 m`. [GERECHNET] Begruendung: Genshins
  Saettigungsdistanz liegt bei 400–800 m, unsere Welt ist `bounds = 26`, die
  Bodenebene reicht bis 78 m. Ein blosses Uebernehmen von Genshins Dichte
  faerbt bei uns nichts. Mit Startabstand 12 m ist der Schleim (Kamera 6,5–10 m)
  **unberuehrt**, der Arenarand bei 35 m liegt bei f_G = 0,70, der Rand der
  Bodenebene bei 78 m bei f_G = 0,96.
  Ohne Startabstand ginge das nicht: eine Exponentialfunktion kann nicht
  gleichzeitig bei 9 m sauber und bei 40 m gesaettigt sein. Der Startabstand ist
  eine Stilisierung, keine Physik — und er ist unsichtbar, weil `1−exp(−βd)`
  bei d=0 mit Steigung β beginnt, nicht mit einem Sprung.

**Drei Fallen, alle drei schon einmal von jemandem getreten:**
1. `uDunst` **ist dieselbe Uniform** wie im Himmel. Sonst Naht am Horizont.
2. Der Nebel gehoert **innerhalb** von `FS_SLIME` auf `col`, **vor** dem
   Alpha-Blending. Auf das Endergebnis angewandt frisst er die Durchsichtigkeit.
3. Der Himmel wird **nicht** benebelt — er laeuft von sich aus in `uDunst`
   (G1, drittes Band).
4. Die bestehende `dunst`-Mischung in `FS_GROUND` (Zeile 252) faellt ersatzlos
   weg. Zwei Nebelmodelle uebereinander ergeben eine sichtbare Doppelkante.

**Wie man es misst:** Drei gleiche Felsen in 8 / 20 / 40 m: Nebelanteile je
Kanal, Verhaeltnis muss `1 : 1,9…2,1 : 2,6…2,9` treffen. Am Bildrand der
Bodenebene: 200 aufeinanderfolgende Pixel mit Streuung ≤2 je Kanal
(Saettigungsnachweis). Horizontnaht: Sprung ueber die Horizontlinie ≤2 Stufen.

**Referenzbild:** `ref/genshin/landschaft_mondstadt_mittag_fernnebel_4k.png`
(Nebelanteile) und `ref/genshin/goldene_stunde_grasland_2560.png` (Saettigung).

---

### G3 — Lichtgeruest: Uniforms, Halblambert, neutral bis warm, Albedo hoch

**Datei:** `client/renderer.js` (`LICHT`-Block, `FS_SOLID`, `FS_GROUND`),
`client/licht.js`

**Was sich sichtbar aendert:** Die Szene wird heller und waermer, die
Schattenseiten runder Koerper saufen nicht mehr ab, das Bild verliert seinen
Grauschleier.

**Wie gebaut:**
- `HIMMELLICHT`, `BODENLICHT`, `SONNE` von Konstanten auf Uniforms
  (`uHimmelLicht`, `uBodenLicht`, `uSonneFarbe`, `uSonneStaerke`), damit G11
  sie fuehren kann. Der Ausdruck `mix(BODENLICHT, HIMMELLICHT, N.y*0.5+0.5)`
  in Zeile 163 ist bereits genau richtig und bleibt.
- **Halblambert**: `ndl` → `ndl*0.5+0.5`. Genshins Schattenseiten fallen kaum
  ab (L 239 → 202, also −15 %), ToFs deutlich mehr (−23 %). [BELEGT]
- **Kein blaues Umgebungslicht.** Genshins unbunte Tagesflaechen liegen bei
  x = 0,3217, y = 0,3487 — praktisch neutral, rund 5970 K. ToFs liegen bei
  x = 0,286–0,290 (8300–8900 K). Das Blau ist ToFs Signatur, nicht Genshins.
  [BELEGT] Startwerte Mittag, in sRGB:
  `uSonneFarbe = (1.00, 0.97, 0.90)`, `uHimmelLicht = (0.55, 0.62, 0.72)`,
  `uBodenLicht = (0.38, 0.36, 0.30)`.
- **Schatten gehen waermer, nicht kuehler.** B/R faellt im Schatten von 0,92
  auf 0,73. Wer den „Anime-Schatten sind blau"-Reflex einbaut, trifft weder
  Genshin noch ToF. [BELEGT]
- **Albedo anheben.** Fels von `(0.335,0.330,0.310)` auf rund
  `(0.62,0.60,0.55)`, Mauer entsprechend. Zielkalibrierung: eine weisse
  Diffusflaeche (Albedo 1,0) in voller Sonne soll vor der Tonwertkurve (G9)
  den Wert **c ≈ 2,1** erreichen; nach der Kurve landet sie dann bei 0,83
  → **L = 213**, also im gemessenen Stau von L 216…232. [GERECHNET aus der
  Histogrammmessung]

**Wie man es misst:** Chromatizitaet einer unbunten besonnten Flaeche muss
x = 0,31…0,33 treffen (nicht 0,286). Verhaeltnis Licht/Schatten an einer Kugel:
Leuchtdichte −12 bis −18 %, dabei ΔR deutlich kleiner als ΔB.

**Referenzbild:** `ref/genshin/landschaft_sumeru_dorf_tag_2560.png`.

---

### G4 — Schattenrampe und harte Glanzstufe fuer alles Undurchsichtige

**Datei:** `client/renderer.js` (`FS_SOLID`, neue Funktion `rampeErzeugen()`)

**Was sich sichtbar aendert:** Felsen, Mauern und Kreaturen bekommen zwei
flache Helligkeitsbaender mit einer harten Kante dazwischen statt eines
stetigen Verlaufs. Glanzlichter werden scharf begrenzte Flecken statt weicher
Halos. Das ist der Schritt, nach dem das Bild „gezeichnet" wirkt.

**Wie gebaut:**
- Rampentextur prozedural, **256 x 32 RGBA8, 8 Zeilen zu je 4 Texeln**.
  Zeilenmitte `v = zeile*0.125 + 0.0625`. `LINEAR`, `CLAMP_TO_EDGE`, **kein**
  `generateMipmap` (sonst bluten die Zeilen ineinander). Vier Texel
  Zeilenhoehe sind das Minimum, damit die bilineare Filterung in v innerhalb
  der Zeile bleibt.
- Zeilenbelegung: 0 Fels · 1 Mauer · 2 Kreatur hell · 3 Kreatur dunkel ·
  4 Knochen · 5 Gel (G7) · 6 Boden · 7 frei. Auswahl ueber **`uRampZeile`
  als Uniform je Zeichenaufruf** — wir haben keine UVs und keine Vertexfarben,
  und wir brauchen sie auch nicht: unsere Objekte sind einfarbig.
- Im Shader, Genshins Formel wortgetreu (damit die Zahlen uebertragbar
  bleiben):
```glsl
float ndl01 = dot(N, L) * 0.5 + 0.5;
float u = 1.0 - (((uLightArea - ndl01) / uLightArea) / uRampBreite);
vec3  schatten = (ndl01 >= uLightArea)
               ? vec3(1.0)
               : texture(uRamp, vec2(clamp(u,0.0,1.0), uRampZeile)).rgb;
vec3 col = albedo * schatten;          // MULTIPLIKATIV, nicht additiv
col *= uUmgebung;                      // Umgebungslicht ganz am Ende
```
  `uLightArea = 0.55`, `uRampBreite = 1.0`. [BELEGT, Standardwerte des
  Spielshaders]
- **Der Lichtterm wird nicht mit der Lichtfarbe multipliziert.** Die
  Umgebungsbeleuchtung kommt als eigener, milder Multiplikator ganz am Ende
  dazu. Genau deshalb bleiben Genshin-Figuren in jeder Beleuchtung hell und
  lesbar. [BELEGT]
- Schattenmultiplikatoren je Zeile, in sRGB direkt eintragbar (wir rechnen
  ohne Gammakorrektur, die gemessenen Werte sind bereits sRGB):
  Kreatur hell `(0.98,0.82,0.78)` [BELEGT],
  Knochen `(0.95,0.86,0.80)` [GESCHAETZT],
  Mauer/neutral `(0.78,0.79,0.81)` [BELEGT],
  Fels `(0.88,0.83,0.80)` [GESCHAETZT — an einem Genshin-Felsausschnitt
  nachzumessen, bevor der Wert festgeschrieben wird].
- Kantenlage in der Textur bei u = 0,88, Uebergang ueber **3 von 256 Texeln**.
  Praxisregel aus dem Dossier: hoechstens 4. [BELEGT]
  Ergibt bei einem Fels mit 60 px Bildradius rund **0,8 px** Flanke
  [GERECHNET] — die Messung an Genshin ergab 2 px bei doppelter Aufloesung.
- Glanz, Ersatz fuer Zeile 161:
```glsl
float s = pow(max(dot(N,H),0.0), uShininess);   // uShininess = 10
float t = 1.03 - uSpecSchwelle;
s = smoothstep(t - fwidth(s), t + fwidth(s), s) * uSpecMulti;  // uSpecMulti = 0.1
```
  `smoothstep` mit `fwidth` statt `step`: glaettet exakt auf Pixelbreite,
  bleibt optisch hart, und flimmert nicht — wir haben keine zeitliche
  Kantenglaettung, mit der wir das sonst zudecken koennten.

**Falle:** Das Halbraumlicht aus G3 muss beim Uebergang auf die Rampe zu einem
**milden multiplikativen** Umgebungsfaktor zusammengezogen werden. Bleibt es
additiv, hebt jede Aufhellung die Stufe wieder auf und der ganze Schritt ist
umsonst.

**Wie man es misst:** Zeilenscan quer ueber einen Fels und ueber einen
Kreaturenrumpf. Verlangt: Lichtplateau ≥15 px mit Streuung ≤1; Flanke ≤2 px bei
1600x900; Schattenplateau ≥12 px mit Streuung ≤2; Leuchtdichteverhaeltnis
Schatten/Licht **0,82…0,88**; ΔR deutlich kleiner als ΔB. Am Glanzlicht: keine
Zwischenwerte ausser einer 1-px-Kante.

**Referenzbild:** `ref/genshin/figur_fischl_oberkoerper_cel_crop.png`,
Zeile 470, gegen `grafik_kreatur`.

---

### G5 — Kontur als umgedrehte Huelle (nur Undurchsichtiges)

**Datei:** `client/renderer.js` (neues Programm `kontur`, `drawProp`),
`client/core.js` (geglaettete Normalen fuer den Wuerfel — **gesperrt**, siehe 5.1)

**Was sich sichtbar aendert:** Jedes undurchsichtige Objekt bekommt eine
1,3 px schmale, dunkle, warme Linie an seiner Silhouette. Das ist der Schritt,
nach dem ein Blindrichter den Stil zuordnet.

**Wie gebaut:**
```glsl
vec4 vs = uView * uModel * vec4(aPos, 1.0);
vec3 nv = normalize(mat3(uView) * uNormalMat * aSmoothNormal);
float z  = -vs.z;
float px = uKonturPx * clamp(12.0 / z, 0.25, 1.0);   // konstant bis 12 m, danach 1/z
vs.xy   += normalize(nv.xy) * px * z / 965.0;
gl_Position = uProj * vs;
```
Der Faktor **965,0** ist `P11 * H/2 = 2.1445 * 450` fuer `fovY = 50°` und
`H = 900` [GERECHNET]; damit ist `px` unmittelbar eine Bildschirmpixelbreite.
`uKonturPx = 1.3`. [BELEGT — 1–1,5 px an vier Figurengroessen]
Die Ausduennung ab 12 m ist Genshins Verhalten (S(z')/z' faellt jenseits
z'=6 mit 1/z), damit ferne Objekte nicht zu schwarzen Flecken verklumpen.

- `uViewProj` muss dafuer in `uView` und `uProj` aufgeteilt werden — die
  Verschiebung findet im **Sichtraum** statt, nicht im Clipraum.
- Konturfarbe: `kontur = albedo * vec3(0.66, 0.41, 0.35) * min(vec3(1.0), uUmgebung)`.
  Der Faktor ist der Mittelwert zweier Messungen: violetter Strumpf
  `(0.59,0.33,0.24)`, weisser Aermel `(0.72,0.49,0.46)`. [BELEGT/GERECHNET]
  Die Klemmung auf 1 verhindert, dass die Kontur bei hellem Umgebungslicht
  aufhellt.
- `gl.cullFace(gl.FRONT)`, Tiefenschreiben an, gleiche Warteschlange.

**Zwei ehrliche Einschraenkungen:**

1. **Harte Kanten reissen auf.** Der Wuerfel (`createBox`) hat gespaltene
   Normalen; eine Huelle entlang der Schattierungsnormale zerfaellt an jeder
   Kante. WebGL2 hat **keinen Geometrieshader**, die Mittelung muss auf der
   CPU passieren — genau wie bei Genshin, dort im Content-Werkzeug. Also: ein
   drittes Attribut `aSmoothNormal`, beim Netzbau einmal berechnet (Punkte mit
   gleicher Position bis auf Epsilon zusammenfassen, Flaechennormalen
   flaechengewichtet mitteln, zurueckschreiben). Die Icosphere braucht das
   nicht (Position == Normale), der Schleim auch nicht.
   **Wichtig fuer spaeter:** Wir legen die geglaettete Normale in ein eigenes
   Attribut, **nicht** in die Tangente. Genshin tut Letzteres und kann deshalb
   kein Normalmapping und keine anisotrope Schattierung mehr. Wir haben freie
   Attributslots, also machen wir diesen Fehler nicht.
2. **Kreaturen bestehen aus 13 Einzelkugeln.** Eine Huelle je Kugel zeichnet
   auch dort eine Linie, wo ein Bein in den Rumpf eintritt. Das kann als
   gezeichnete Trennlinie *gut* aussehen (Genshin hat innere Konturen an
   Materialgrenzen) oder als Perlenkette. Das entscheidet der Blindvergleich,
   nicht der Plan. Rueckfall, falls Perlenkette: Konturbreite je Zeichenaufruf
   modulieren (`uKonturPx = 0` fuer Beine, Ohren, Augen) — das ist genau, was
   Genshin ueber `vertexfarbe.a` macht, nur mit einem Uniform statt einem
   Attribut.

**Wie man es misst:** Zeilenscan ueber eine Kreatursilhouette. Verlangt: ein
Pixel, der **dunkler ist als beide Nachbarn** (Unterschwinger), Breite 1–2 px,
Unterschwinger gegen den Hintergrund **70–90 Stufen**, und der Nachweis, dass
die Linie auch dort erscheint, wo Objekt und Hintergrund fast gleich hell sind
(dort wuerde ein Bildraum-Kantenfilter nichts finden). Zusaetzlich: Linienbreite
bei dist 4 und dist 20 vergleichen — Abweichung ≤0,5 px.

**Referenzbild:** `ref/genshin/figur_xingqiu_tageslicht_crop.png`, Zeile 290
(Werte 204 → 88 72 → 165), gegen `grafik_kreatur`.

---

### G6 — Boden und Fels: Flaechenfarbe, senkrechte Felsrampe, Kontaktband

**Datei:** `client/renderer.js` (`FS_GROUND`, `FS_SOLID`)

**Was sich sichtbar aendert:** Die groesste Flaeche im Bild hoert auf, graues
Millimeterpapier zu sein. Felsen bekommen einen senkrechten Farbverlauf und ein
dunkles Band an ihrem Bodenkontakt.

**Wie gebaut:**
- Grundfarbe des Bodens von `(0.25,0.252,0.26)`/`(0.33,0.32,0.286)` auf
  Genshin-Niveau. Zwei Varianten zur Wahl, beide gemessen: heller Erdboden
  `(217,221,203)/255` oder Wiese `(134,188,91)/255`. [BELEGT]
- **Rasterkontrast senken, nicht entfernen.** Genshins Boden besteht aus
  grossen ruhigen Farbflaechen; GDD 12 §4 verlangt ablesbares Tempo. Kompromiss:
  Schachbrett von ±6,2 % auf ±2,5 %, Naht von 0,048 auf 0,020, Hauptraster von
  0,070 auf 0,030 — und alle drei warm statt neutral. Die Fleckigkeit
  (`fleck`, Zeile 235) bleibt unveraendert, sie ist genau die richtige Art
  Struktur.
  **Gegenprobe zwingend:** die MOTION-Kontaktboegen (`anrollen`, `vollgas`)
  nochmal ansehen. Wenn Tempo darauf nicht mehr ablesbar ist, ist der Kontrast
  zu weit unten und der Schritt geht zurueck.
- Senkrechte Felsrampe, drei Zeilen in `FS_SOLID`:
```glsl
float hp = clamp((vPos.y - uFelsBasis) / uFelsSpanne, 0.0, 1.0);
vec3 albedo = mix(uFelsUnten, uFelsOben, pow(hp, 0.8));
albedo = mix(albedo, uFelsOben, max(N.y, 0.0) * 0.25);
```
  Richtung der Farbverschiebung ist der eigentliche Befund: **unten faellt Rot
  staerker als Blau** (−33 % gegen −24 %), die untere Partie wird also relativ
  blauer. [BELEGT] Als Helligkeitsmultiplikation gebaut ist der Effekt wertlos.
- Kontaktband: Genshin kaschiert Materialuebergaenge **nicht durch Verblenden**
  — die Gras/Fels-Kante ist 2 px hart bei 2560 px Breite. Kaschiert wird durch
  ein 4–6 px dunkles Band unter der Kante, rund **13 % unter dem Eigenwert des
  Felsens**. [BELEGT] Bei uns billig ueber `hp`: unterste 8 % der Felsspanne um
  13 % abdunkeln. Kein Splat-Blending, kein Dekal — Dekale brauchen eine
  Mischphase und flimmern bei streifender Sicht.

**Wie man es misst:** Spaltenscan durch einen Fels von oben nach unten: R muss
staerker fallen als B. Kontaktband: lokales Minimum 10–16 % unter dem
Fels-Eigenwert, Breite 2–4 px bei 1600x900. Boden: Vollbildhistogramm, Median
muss von heute ~85 auf 130…170 steigen.

**Referenzbild:** `ref/genshin/goldene_stunde_grasland_2560.png` (Spalte 1900,
Felsrampe) und `ref/genshin/landschaft_sumeru_wiese_see_tag_2560.png`
(Spalte 420, Kontaktband).

---

### G7 — Der Schleim: Rand hell, Silhouette dunkel, Innenbaenderung

**Datei:** `client/renderer.js` (`FS_SLIME`)

**Was sich sichtbar aendert:** Der Schleim setzt sich vom Hintergrund ab, ohne
eine Kontur zu bekommen. Sein Inneres bekommt zwei Helligkeitsbaender statt
eines Verlaufs, bleibt aber durchsichtig.

**Wie gebaut:**
- **Silhouettenabstand aus der Ableitung** (ersetzt die umgedrehte Huelle,
  siehe 2.):
```glsl
float ndv    = abs(dot(N, V));
float distPx = ndv / max(fwidth(ndv), 1e-5);   // Abstand zur Silhouette in Pixeln
float saum   = 1.0 - smoothstep(0.0, uSaumPx, distPx);
```
  `fwidth` ist in GLSL ES 3.00 Kernbestandteil, keine Erweiterung noetig.
  Das liefert einen Saum von **exakt `uSaumPx` Bildschirmpixeln**, unabhaengig
  von der Kruemmung — genau die Eigenschaft, wegen der Genshin fuer sein
  Randlicht den Tiefenpuffer-Trick baut. `uSaumPx = 1.5` fuer die Abdunklung.
  Was diese Naeherung **nicht** kann: Raender an inneren Tiefenspruengen. Der
  Schleim hat keine, also kein Verlust.
- **Randlicht (die eine Anleihe aus ToF), mit Gegenlichtgewichtung:**
```glsl
float rand = pow(1.0 - max(dot(N,V),0.0), 3.0)
           * (0.5 + 0.5 * dot(L, -V));
col += uRandFarbe * rand * uRandStaerke;      // Startwert 0.35
```
  Exponent **3,0**, nicht 5 oder 8 — begruendet in 2. (Normalenrauschen,
  Streumedium statt Metall). Die Gegenlichtgewichtung ist der Unterschied
  zwischen „billig" und „ueberzeugend": ohne sie leuchtet der Rand
  gleichmaessig wie eine Neonroehre. Zielwert aus ToF: Ueberschuss +91 Stufen
  ueber den Hintergrund auf 2,5 px. [BELEGT]
- **Innenbaenderung:** `kern` benutzt heute `hoehe*0.62 + ndl*0.40` stetig.
  Ersatz: derselbe Rampenaufruf wie in G4, aber Zeile 5 (Gel) mit **zwei
  Baendern und einem Uebergang ueber rund 10 % des Rampenraums** statt 1,5 %.
  Begruendung steht in 2.: eine harte Stufe macht aus dem Gel eine lackierte
  Schale.
- Der harte kleine Reflex (`tropfen`, `pow(ndh,300)`) bleibt, bekommt aber die
  `fwidth`-Glaettung aus G4. Der breite `schimmer` bleibt unveraendert — er ist
  das, was das Gel nass aussehen laesst.
- Der vorhandene Fresnel-Term (Zeile 99/122) bleibt fuer Treffer- und
  Elementarfaerbung reserviert, wie bei Genshin (`_HitColor`). Die
  Silhouettenlesbarkeit stuetzt sich **nicht** darauf.

**Wie man es misst:** Zeilenscan quer durch den Schleim bei `grafik_nah`:
von aussen nach innen muss die Folge lauten Hintergrund → **1,5 px dunkler
Saum** → **2–3 px heller Rand mit +60…+100 Stufen** → Gelinneres. Zusaetzlich
Nachweis, dass die Saumbreite an einer stark und an einer schwach gekruemmten
Stelle gleich ist (±0,3 px) — das trennt `fwidth` von einem Fresnel-Saum.
Bei `grafik_gegenlicht` muss der Rand deutlich staerker sein als bei
`grafik_stand`.

**Referenzbild:** `ref/tof/figur-nah-tageslicht-herbst.jpg`, Zeile 190
(Randlicht) und `ref/genshin/figur_amber_cutscene_halbnah_daemmerung_2843.png`,
Zeile 342 (Randstreifen konstanter Breite an verjuengender Straehne).

---

### G8 — Schlagschatten: eine harte Schattenkarte, vor die Rampe gerechnet

**Datei:** `client/renderer.js` (neues Programm `tiefe`, FBO), `client/licht.js`

**Was sich sichtbar aendert:** Statt dreier gestapelter runder Bodendekale
wirft der Schleim einen harten, gerichteten Schatten mit seiner tatsaechlichen
Silhouette. Kreaturen ebenso.

**Wie gebaut:**
- FBO mit `DEPTH_COMPONENT24`-**Textur** (WebGL2-Kern, in der
  Aufnahme-Pipeline nachgewiesen), **1024 x 1024**, orthographische Lichtsicht
  ueber die Arena. Ein zusaetzlicher Geometriedurchgang, nur Tiefe.
- `sampler2DShadow` + `textureProj`, **harte Kante** — hoechstens 2x2 PCF.
  Weichheit waere hier stilfremd: Genshins Figurenschatten ist praktisch
  penumbrafrei. [BELEGT]
- **Der empfangene Schatten wird VOR die Rampe in N·L eingerechnet**, nicht auf
  die Endfarbe multipliziert:
  `ndl01 = min(ndl01, schatten < 0.5 ? uLightArea - 0.001 : ndl01);`
  Sonst entsteht ein dritter Helligkeitswert und die Zweistufigkeit bricht.
  Das ist der Punkt, an dem die meisten Nachbauten den Look verlieren.
- **Augen und Mund werden ausgenommen** (`uEmissive > 0` → kein Schatten).
  Das ist Genshins eigentliche Pointe: ein Anime-Gesicht darf nie angeschattet
  werden, weil es sonst sofort dreidimensional und stilfremd wirkt. [BELEGT]
- Die drei Bodendekale (Zeilen 561–563) entfallen; die Schleimspur bleibt.

**Wie man es misst:** Kantenprofil quer ueber die Schattenkante am Boden:
Uebergang ≤3 px bei 1600x900 (kein Penumbraverlauf). Innerhalb des Schattens
darf es **genau zwei** Helligkeitswerte geben (Schattenplateau der Rampe), keinen
dritten. Der Schatten muss die Silhouette der Verformung zeigen — bei
`aufprall` also flach und breit, nicht rund.

**Referenzbild:** `ref/genshin/figur_xingqiu_tageslicht_schlagschatten_1920.png`.

---

### G9 — Tonwertgriff ohne Framebuffer: kanalweise Schulter, Schwarzhub, Dither

**Datei:** `client/renderer.js` (gemeinsamer GLSL-Block `GRIFF`)

**Das ist eine bewusste Abweichung von der Recherche.** Sie empfiehlt die volle
HDR-Kette. Fuer unser Bild geht das Wesentliche davon **ohne einen einzigen
Framebuffer**, weil alle drei Griffe reine Pro-Pixel-Operationen sind:

```glsl
vec3 griff(vec3 c) {
  c = c * (1.0 + c / (uWeiss*uWeiss)) / (1.0 + c);        // kanalweise, mit Weisspunkt
  c = uSchwarzhub + c * (1.0 - uSchwarzhub);              // uSchwarzhub = 0.08
  float n = fract(52.9829189 * fract(0.06711056*gl_FragCoord.x
                                   + 0.00583715*gl_FragCoord.y));
  return c + (n - 0.5) / 255.0;                           // Dither
}
```

- **Kanalweise, nicht auf der Luminanz.** Das ist der Unterschied, an dem man
  Genshin und ToF im Standbild am sichersten trennt: Genshins Saettigung faellt
  in den Lichtern nur auf **22–38 %**, ToFs auf **~6 %**. Genshins hellster
  Pixel ist nie Weiss (Sonnenkern `(254,253,219)`, Mondkern `(170,238,253)`),
  ToFs Neonkern ist `(255,255,255)`. [BELEGT] Fuer ein Gel mit farbigem Kern
  ist genau das der gewuenschte Effekt: der Kern wird hell und behaelt seine
  Farbe.
- **`uWeiss = 3.0`** [GERECHNET]: `y(2.1) = 0.835` → L = 213, `y(3.0) = 1.0`.
  Das trifft den gemessenen Stau bei L 216…232 und den Absturz darueber um
  Faktor 30–130.
- **`uSchwarzhub = 0.08`** [BELEGT]: Genshins Ausgabeuntergrenze liegt bei
  17–26 von 255 (0,067–0,102), und zwar als **harter Boden**, nicht als weiche
  Zehe — die Dichte unter dem Boden ist nicht klein, sondern null.
  Anteil Pixel unter L=8: 0,000 % in allen sieben geprueften Bildern.
- **Dither ist nicht optional.** Mit angehobenem Schwarz und flacher Kurve
  stehen fuer eine Nachtszene nur rund 113 der 256 Stufen zur Verfuegung; ein
  Himmelsverlauf bandet dann sichtbar. Kosten: null.
- **Anwendungsregel (wichtig, sonst falsch):** `griff()` kommt in `FS_HIMMEL`,
  `FS_GROUND`, `FS_SOLID` und in das Konturprogramm — also nur in die
  **undurchsichtigen** Shader. In `FS_SLIME` und `FS_DECAL` wird **nur die
  Schulter** angewandt, **nicht** der Schwarzhub: der Hintergrund ist bereits
  angehoben, und ein zweiter Hub auf dem gemischten Ergebnis hellte das Gel
  doppelt auf. Der Dither gehoert in den letzten Durchgang, der ein Pixel
  beschreibt — bei uns also auch in `FS_SLIME`.

**Wie man es misst:** Vollbildhistogramm. Verlangt: p0,1 zwischen **17 und 26**;
Anteil Pixel unter L=8 **exakt 0,000 %**; Dichtestau bei L 216…232 mindestens
3-fach ueber der mittleren Dichte von L 150…200; Saettigung des hellsten
Schleimglanzes **>20 %** (nicht ausgeblichen); an einem Himmelsverlauf keine
Streifenbildung (Nachbarschaftsdifferenz nie 2 Stufen ueber 20 px konstant).

**Referenzbild:** `ref/genshin/landschaft_sumeru_dorf_tag_2560.png` (Histogramm),
`ref/genshin/goldene_stunde_gegenlicht_login_4k.png` (Saettigungsboden).

---

### G10 — Tagesgang: eine Tabelle mit acht Stuetzstellen

**Datei:** `client/licht.js` (neu, reines JavaScript)

**Was sich sichtbar aendert:** Die Szene bekommt Tageszeiten. Wichtiger: der
Blindvergleich kann endlich gegen das *passende* Referenzbild antreten statt
immer gegen Mittag.

**Wie gebaut:** Acht Objekte mit acht Groessen (Zenit, Himmelshorizont, Dunst,
Sonnenfarbe, Sonnenrichtung, Sonnenstaerke, Umgebung oben, Umgebung unten),
lineare Interpolation, ein Aufruf je Bild. Kein Shadercode.

Vollstaendig gemessene Stuetzstellen [BELEGT]:

| | Zenit | Horizont | Dunst/Nebel | Vordergrund |
|---|---|---|---|---|
| Mittag | (34,114,188) | (121,198,246) | (183,217,249) L=212 | L=170 |
| goldene Stunde | (22,38,45) | (120,136,147) | (140,104,85) L=110 | L=46 |
| Daemmerung | (42,61,107) | (127,154,182) | (71,102,146) L=99 | L=66 |
| Nacht | (18,32,67) | (148,166,181) | (105,134,158) L=129 | L=33 |

**Drei Dinge, die man dabei falsch macht:**
1. **In sRGB interpolieren, nicht in Linearlicht.** Die Stuetzfarben sind in
   Gammaraum gemalt; in Linearlicht gemischt werden die Zwischentoene zu dunkel.
2. **Zenit bei goldener Stunde ist nicht blau, sondern dunkles Petrol**
   `(22,38,45)`. Wer den Tagesgang als Blau→Orange baut, verfehlt genau den
   Moment, den alle Screenshots zeigen.
3. **Nachts nicht alles herunterskalieren.** Das Verhaeltnis Fernnebel zu
   Vordergrund dreht sich ueber den Tag um: Mittag **1,25 : 1**, Nacht
   **3,9 : 1**. Genshin laesst den Fernnebel nachts fast auf Tagesniveau
   stehen und faellt nur im Vordergrund auf ein Fuenftel. Daraus entsteht der
   Eindruck von Mondlicht *und* die Lesbarkeit — Silhouetten stehen gegen einen
   hellen Grund. Fuer uns direkt anwendbar (GDD 10 §98): hinter dem Schleim ist
   nie ein Loch.

**Wie man es misst:** Je Stuetzstelle ein `grafik_weit`-Bild; Zenit-, Horizont-
und Nebelfarbe muessen die Tabelle auf ±8 Stufen treffen; Verhaeltnis
Nebel/Vordergrund muss die Zeile treffen.

**Referenzbild:** je Tageszeit die zugehoerige Datei aus der Tabelle.

---

### G11 — HDR-Kette und Bloom *(optional, erst wenn G1–G10 blind gewonnen sind)*

**Datei:** `client/renderer.js` (FBO-Aufbau, Pyramide, Composite)

**Was sich sichtbar aendert:** Nasse Glanzpunkte auf dem Gel und leuchtende
Anteile (Treffer, Faehigkeiten) bekommen einen Lichthof. Sonst wenig.

**Warum optional und warum zuletzt:** Genshins Bloom ist **flaechenabhaengig**
und wirkt nicht auf normale Bildhelligkeiten. Eine 3-px-Lichtquelle erzeugt
fast nichts (Ueberschuss +16 statt +49), erst ein breiter Lichtschlitz hebt
Nachbargeometrie an. [BELEGT] Ein Schleim vor leerem Grund hat sehr wenig, das
bloomen koennte. `ref/tof/UNTERSCHIEDE.md` §8 argumentiert genau so, und ich
teile das — **fuer den Bloom**, nicht fuer G9.

**Wenn doch gebaut:**
- Szene nach `RGBA16F` (nachgewiesen verfuegbar), MSAA ueber
  `renderbufferStorageMultisample(…, 4, RGBA16F, …)` plus `blitFramebuffer`.
  `SAMPLES = 4` ist auch fuer `RGBA16F` bestaetigt. **Das ist der Punkt, an dem
  man die vorhandene Kantenglaettung verliert, wenn man es vergisst** —
  `{antialias:true}` gilt nur fuer den Standardpuffer.
- Schwelle mit weichem Knie (Schwelle linear 1,0, Knie 0,5), Karis-Gewichtung
  `1/(1+lum)` beim ersten Downsample gegen Flimmern an einzelnen hellen Pixeln.
- 6 Stufen (800x450 bis 25x15), 13-Tap abwaerts, 9-Tap-Zelt aufwaerts,
  Streuung **0,65**, Rueckmischung **0,25**. Zielprofil aus der Messung:
  Spitzenuebertrag 25 % des Quellueberschusses, Halbwertsbreite **7,8 px**,
  Reichweite **37 px** bei 1600x900. [BELEGT/GERECHNET]
- **`RGBA16F` nehmen, nicht `RGBA32F`** — 16F ist linear filterbar, die
  bilinearen Taps sind damit gratis. **Kein `generateMipmap`** fuer die
  Pyramide: Boxfilter ergibt sichtbare Kastenkanten, eine Textur je Stufe.

**Wie man es misst:** Radialprofil um den Glanzpunkt des Gels: Halbwertsbreite
6…10 px, Grundwert wieder erreicht bei 30…45 px. Gegenprobe: an einer
Silhouettenkante gegen hellen Himmel darf auf der Dunkelseite **kein**
abklingender Sockel entstehen (Genshins besonntes Material bloomt nicht).

**Referenzbild:** `ref/genshin/nacht_login_mond_4k.png` (Zeile 340).

---

### G12 — Instanziertes Gras *(optional, gross, mit einer Entscheidung davor)*

**Datei:** `client/renderer.js` (neues Programm `gras`), `client/world.js`

**Ehrlich vorweg:** Solange der Boden eine Ebene mit Raster ist, kann kein
Blindvergleich gegen ein Genshin-Landschaftsbild gewonnen werden — egal wie gut
Rampe, Kontur und Nebel sind. Der Richter sieht Wiese gegen Millimeterpapier.
Zwei Auswege, und das ist eine Entscheidung fuer den Menschen, nicht fuer den
Plan:

**(a)** Der Blindvergleich wird auf vergleichbare Ausschnitte beschraenkt
(Figur gegen Figur, Fels gegen Fels — `tools/blind.mjs` kann das ueber
`--unserCrop`/`--referenzCrop`). Dann faellt G12 weg.
**(b)** Die Arena bekommt Gras. Dann ist GDD 12 §4 („einfache Testflaeche") neu
zu entscheiden, und die MOTION-Aufnahmen aendern ihren Hintergrund.

**Wenn (b):**
- **Keine gekreuzten Quads.** Die Nahaufnahme zeigt eindeutig *einzelne flache,
  sich verjuengende Halme*, keine X-Kreuze. [BELEGT] Ein Halm = 7 Segmente,
  14 Dreiecke; Buschel zu 8–15 Halmen; Grundneigung 15–20° mit ±12° Streuung.
- Instanziertes Zeichnen (`vertexAttribDivisor` + `drawArraysInstanced`),
  20.000 Instanzen = 280.000 Dreiecke in **einem** Zeichenaufruf.
- Windwelle **ausschliesslich im Vertex-Shader** (GDD 11 §32: darf die
  240-Hz-Physik nichts kosten):
```glsl
float h    = clamp(aPos.y / uHalmHoehe, 0.0, 1.0);
float ph   = dot(iPos.xz, vec2(0.12, 0.09)) + uZeit * 1.6;
float boe  = 0.65 + 0.35 * sin(dot(iPos.xz, vec2(0.013,0.011)) - uZeit*0.35);
float amp  = pow(h, 2.0) * uWindStaerke * boe;
pos.xz += uWindRichtung * (sin(ph)*0.7 + sin(ph*2.3 + 1.1)*0.3) * amp;
pos.y  -= amp * amp * 0.4 * uHalmHoehe;   // Laengenkorrektur, sonst streckt sich der Halm
```
  Die drei Bestandteile, auf die es ankommt: `pow(h,2.0)` (Basis steht still,
  sonst schwimmt das Gras ueber dem Boden), Phase aus der **Weltposition** des
  Buschels (sonst schwingt alles im Gleichtakt statt als Welle), und die
  langsame Boenwelle mit ~1/50 der Ortsfrequenz (ohne sie wirkt es wie ein
  Ventilator).
- Zwei Genshin-Eigenheiten, die man beide leicht falsch macht:
  **keine Wurzelverdunklung** — der Boden zwischen den Halmen ist *heller*
  (L≈215) als die Halme (L≈180) [BELEGT]; und die **gelbe Linie an jeder
  Silhouette gegen den Himmel**, gemessen `(158,141,54)` ueber 1,5–2 px bei
  900 p, vorhanden bei goldener Stunde, Daemmerung **und** Nacht. Sie entsteht
  aus `pow(dot(V,-L), 2.5) * (1 - abs(dot(N,V)))` — derselbe Ausdruck, der in
  `FS_SLIME` bereits als `back` steht. Gras und Schleim sollten ihn mit
  **denselben Uniforms** benutzen, sonst laufen sie im Tagesgang auseinander.
- Undurchsichtig mit Alpha-Test (`discard` bei alpha < 0.5), **nicht** mit
  Blending — sonst braeuchte es Sortierung je Halm.
- **Warnung zur Aufnahme-Pipeline:** SwiftShader rastert auf der CPU.
  280.000 Dreiecke je Bild machen `tools/capture.mjs` deutlich langsamer. Das
  ist der einzige Schritt in dieser Liste, der die Aufnahmen spuerbar
  verteuert.

**Wie man es misst:** Halmbreite an der Basis 1,1–1,5 % der Bildbreite; keine
dunkle Kontur an einem Halm (Kanten sind reine Kantenglaettung ueber 1–2 px);
Boden zwischen den Halmen heller als die Halme; Silhouettenlinie 1,5–2 px mit
Kontrast 2,5…3 : 1 gegen das Gras darunter.

**Referenzbild:** `ref/genshin/gras_halme_nahaufnahme_tag_1366.png` und
`ref/genshin/goldene_stunde_grasland_2560.png` (Spalte 980, Kammlinie).

---

### G13 — Wolkenschicht *(niedrigste Prioritaet)*

Bei Standardkamera sind **4,6 %** des Bildes Himmel (siehe 0.). Der Schritt
zahlt fast nichts ein. Wenn doch: gemalte Textur mit hellem Saum, prozedural
erzeugt (Worley, 3 Oktaven, Schwellwert, Maske um 2 px erodieren, Differenz als
Saumkanal), 1024x1024 RGBA, ein Quad direkt nach dem Himmel mit
`depthMask(false)`.
Der entscheidende Messbefund: der Saum ist **nicht heller, er ist
entsaettigt** — Saum `(255,255,255)` gegen Koerper `(210,251,255)`, also nur
+13 in der Luminanz, aber **+45 im Rotkanal**. [BELEGT] Ein bloss hellerer Saum
in derselben Farbe trifft den Effekt nicht.
Falle: `uv = blick.xz / max(blick.y, 0.05)` — ohne die Klemmung streckt sich
die Textur am Horizont ins Unendliche und flimmert.

---

## 4. Geht nicht / anders

| Genshin/ToF macht | Bei uns nicht tragfaehig, weil | Stattdessen |
|---|---|---|
| **Randlicht ueber Tiefenpuffer-Versatz** | Braucht einen Tiefen-Vorabdurchgang der ganzen Szene oder ein Umkopieren des Tiefenpuffers (man darf nicht gleichzeitig lesen und schreiben). Teuerster Posten der Liste fuer den geringsten sichtbaren Zugewinn. | `fwidth`-Silhouettenabstand (G7). Liefert exakt dieselbe *kruemmungsunabhaengige* Randbreite, ohne zweiten Durchgang. Kann keine Raender an inneren Tiefenspruengen — der Schleim hat keine. |
| **Gesichts-Abstandskarte (SDF)** | Ein Schleim hat kein UV-gemapptes Gesicht; Augen und Mund sind eigene Netze. Die harte UV-Symmetrieanforderung waere sinnlos. | Schon geloest: `uEmissive` legt die Gesichtsteile flach, sie stehen ausserhalb jeder Lichtrechnung. In G8 zusaetzlich vom empfangenen Schatten ausnehmen. Das **ist** Genshins Entscheidung, nur ohne Textur. |
| **Umgedrehte Huelle auf dem Schleim** | Der Koerper ist alphagemischt und schreibt keine Tiefe. Die Huelle waere durch das Gel hindurch sichtbar und machte die Silhouette matschig. | `fwidth`-Silhouettenabdunklung, 1,5 px, im selben Durchgang (G7). |
| **Volumennebel im Kegelstumpfgitter** | Braucht Compute-Shader zum Fuellen des Gitters. **WebGL2 hat keine.** Ueber `framebufferTextureLayer` waeren es 16 Zeichenrunden plus eine Aufsummierungsrunde je Bild. Nicht vertretbar. | Analytischer Hoehennebel mit geschlossener Loesung, falls ueberhaupt noetig — zwei `exp()` und eine Division mehr im selben Fragment-Shader. Fuer eine flache Arena bringt selbst das wenig; G2 reicht. |
| **TAA** | 162 Massepunkte, die sich jeden Tick nichtstarr verformen. Bewegungsvektoren aus Modellmatrizen gibt es dafuer nicht; an gestauchten Stellen sind sie falsch, und dort entstehen Schlieren — ausgerechnet auf dem Objekt, das der Spieler am genauesten ansieht. Verwirft man die Historie dort, ist das Rauschen wieder da. | 4x MSAA (in der Pipeline nachgewiesen). Bei G11 ueber `renderbufferStorageMultisample` + `blitFramebuffer` erhalten. |
| **SSR** | SSR und TAA sind ein Paket — ohne die zeitliche Rauschunterdrueckung sehen die Streifen rauh und flimmernd aus. Ausserdem: kein Wasser in der Arena. | Nichts. Falls je eine Wasserebene kommt: planare Spiegelung (ein zusaetzlicher Durchgang, keine Bildrandartefakte). |
| **Tiefenschaerfe** | Genshin hat sie im Gameplay **nachweislich nicht** (max. lokaler Helligkeitssprung ueber alle Tiefen 172/170/167 in *einem* Bild). Sie kostet Lesbarkeit (GDD 10 §98) und der Schleim liegt ohnehin in der Schaerfeebene. | Nichts. Bewusster Verzicht. |
| **Vignette, chromatische Aberration** | Am Bild **widerlegt**: Genshins Bildraender sind *heller* als die Mitte; Kanalversatz an 131 Kanten unter 0,6 px und ohne Vorzeichenwechsel. Beides kostet Lesbarkeit. | Nichts. |
| **Belichtungsautomatik** | Wenn der Schleim gross im Bild steht, verschoebe sie die Belichtung nach seiner Farbe — das Bild atmete mit der Schleimbewegung. Bei Genshin auch nicht nachweisbar (Tag/Nacht-Mediane bleiben um Faktor 2,3 auseinander). | Feste Belichtung je Tageszeit aus derselben Tabelle wie G10. |
| **HBAO/SSAO** | An einem konvexen Schleim gibt es keine Ecken; Bildschirmraum-AO ist dort fast wirkungslos. Ohne TAA rauscht es. | Der harte Schattenwurf (G8) plus, falls noetig, ein analytischer Kontaktschatten (Mittelpunkt und Radius als Uniform im Boden-Shader, kein Puffer). Fuer die Selbstverdeckung des Weichkoerpers reicht ein Kruemmungsterm aus der Abweichung zur Ruhelage. |
| **Acht Schattenkaskaden** | Fuer eine 52x52-m-Arena mit einem Schleim sinnlos. | Eine einzige 1024²-Karte (G8). |
| **Handgemalte Lichtmaske (RGBA)** | Keine UVs, keine Vertexfarben, keine Texturen. | Uniforms je Zeichenaufruf: `uRampZeile` (statt Kanal A), `uSpecSchwelle` (statt B), `uSpecMulti` (statt R). Der AO-Kanal (G) entfaellt — wir haben nichts Handgemaltes zu maskieren. Falls spaeter doch: ein `vec4 aMaske`-Attribut, nicht die Tangente. |

---

## 5. Was vorher entschieden werden muss

### 5.1 Dateibesitz

`ARCHITEKTUR.md` §1 sagt: **`client/renderer.js` ist GESPERRT**, Erweiterung nur
ueber `R.extras`. Diese Phase ist von Anfang bis Ende Renderer-Arbeit; ueber
`R.extras` ist sie nicht baubar (die Shader selbst muessen sich aendern).

Vorschlag: fuer die Dauer von Phase Grafik gilt
`client/renderer.js` → **Lane GRAFIK**, mit genau einem Builder gleichzeitig.
Ebenso `client/capture.js` (die Grafik-Szenarien aus G0) und `client/core.js`
(geglaettete Normalen fuer den Wuerfel, G5) — beide punktuell, jeweils als
`BRAUCHT_KERNAENDERUNG` gemeldet und einzeln freigegeben.
Neu und unstrittig: `client/licht.js` (Lane GRAFIK).

### 5.2 Werkzeugkette

- `tools/fortschritt.mjs` Zeile 65: `LANE_FOLGE` kennt nur
  `['MOTION','EAT','DEATH','COMBAT','UI']`. **`'GRAFIK'` muss dazu**, sonst
  taucht die Phase in der Fortschrittsseite nicht als eigene Lane auf.
- `gauntlet/grafik-teile.json` hat dieselbe Struktur wie `gauntlet/stand.json`;
  `fortschritt.mjs` liest zusaetzliche Felder anstandslos ueber. Fuer eine
  gemeinsame Seite muessen die Eintraege spaeter nach `stand.json` uebernommen
  oder `fortschritt.mjs` um eine zweite Quelle erweitert werden.

### 5.3 Der Vergleichsmassstab

Siehe G12: gegen ein Genshin-Landschaftsbild ist eine graue Testarena nicht zu
gewinnen. Entweder der Blindvergleich laeuft auf Ausschnitten (Figur gegen
Figur, Fels gegen Fels), oder die Arena bekommt Gras. Ohne diese Entscheidung
laeuft G1–G11 auf ein Urteil zu, das nicht die Shaderarbeit beurteilt, sondern
den Weltinhalt.

---

## 6. Rechenaufwand

Grobschaetzung bei 1600x900. „GPU" meint eine Mittelklasse-Grafikkarte der
letzten Jahre; „CPU" meint die JavaScript-Seite (Zeichenaufrufe, Uniforms).
Ausgangswert gemessen: heutige Zeichenzeit in SwiftShader p10 = **0,9 ms**,
Rechenlast (Physik + Huelle) p10 = **2,3 ms**, Budget bei 60 Hz = 16,7 ms.

| Schritt | GPU | CPU | Speicher | Anmerkung |
|---|---|---|---|---|
| G0 Messwerkzeug | – | – | – | laeuft ausserhalb des Spiels |
| G1 Himmel | +0,02 ms | – | – | wenige ALU auf 5–37 % des Bildes |
| G2 Fernnebel | +0,05 ms | – | – | 3x `exp()` je Fragment, ~1,5 Vollbilder |
| G3 Lichtgeruest | ±0 | +0,02 ms | – | mehr Uniforms je Aufruf |
| G4 Rampe + Glanzstufe | +0,03 ms | +0,03 ms | 32 kB | ein `texture()` je Fragment |
| G5 Kontur | +0,10 ms | **+0,15 ms** | ~40 kB | ~60 zusaetzliche Zeichenaufrufe — der CPU-Anteil ist hier der teurere |
| G6 Boden/Fels | ±0 | – | – | reine Konstantenaenderung |
| G7 Schleim | +0,05 ms | – | – | `fwidth` auf ~15 % des Bildes, doppelt gezeichnet |
| G8 Schattenkarte | +0,20 ms | +0,20 ms | 4 MB | ein zusaetzlicher Geometriedurchgang, 1024² |
| G9 Tonwertgriff | +0,02 ms | – | – | **kein Framebuffer** |
| G10 Tagesgang | – | +0,01 ms | – | 8 Uniform-Setzungen je Bild |
| **Summe G1–G10** | **~0,5 ms** | **~0,4 ms** | ~4 MB | gegen 16,7 ms Budget |
| G11 HDR + Bloom | +0,4…0,7 ms | +0,05 ms | **+16 MB** | 12 zusaetzliche Vollbild-Durchgaenge, ~2 Vollbildaequivalente |
| G12 Gras | +0,5…1,5 ms | +0,10 ms | ~2 MB | 280.000 Dreiecke, 1 Aufruf. **In SwiftShader deutlich teurer** |
| G13 Wolken | +0,05 ms | – | 4 MB | plus ~100 ms einmalig beim Start (prozedurale Textur) |

**Was das heisst:** G1–G10 zusammen liegen bei rund **0,9 ms je Bild**. Das ist
weniger als die heutige Rechenlast der Physik und rund 5 % des Budgets. Die
Grafik kostet das Spielgefuehl nichts (GDD 11 §32).

Der einzige Posten, der echte Aufmerksamkeit braucht, ist **G5** — nicht wegen
der GPU, sondern weil rund 60 zusaetzliche Zeichenaufrufe je Bild auf der
JavaScript-Seite anfallen. Nach G5 ist `tools/leistung.mjs` erneut zu fahren
und die Zahl `zeichnenSwiftshader` gegen den heutigen p10-Wert von 0,9 ms zu
halten.

---

## 7. Die Reihenfolge in einem Satz je Schritt

0. **G0** — Messwerkzeug und fuenf Grafik-Szenarien bauen, damit ab hier
   gemessen statt behauptet wird.
1. **G1** — Himmel auf drei gemessene Farben, Potenzrampe 1,6 und ein eigenes
   Dunstband umstellen, Blickrichtung statt Bildhoehe.
2. **G2** — Kanalweisen, saettigenden Fernnebel einziehen, dessen Farbe
   dieselbe Uniform ist wie das Dunstband des Himmels.
3. **G3** — Lichtkonstanten zu Uniforms machen, Halblambert einsetzen, das
   Umgebungslicht neutral bis warm halten und die Albedowerte auf
   Genshin-Niveau anheben.
4. **G4** — Den Lambert-Term in `FS_SOLID` durch eine prozedurale Rampentextur
   ersetzen und den weichen Blinn-Phong durch eine harte Glanzstufe.
5. **G5** — Umgedrehte Huelle als 1,3-px-Kontur fuer alle undurchsichtigen
   Objekte, mit geglaetteter Normale als drittem Attribut.
6. **G6** — Boden und Fels auf grosse ruhige Farbflaechen umstellen:
   Rasterkontrast runter, senkrechte Felsrampe, Kontaktband.
7. **G7** — Den Schleim gegenlaeufig behandeln: Rand aufhellen, Silhouette ueber
   `fwidth` um 1,5 px abdunkeln, das Innere in zwei weiche Baender legen.
8. **G8** — Die drei Bodendekale durch eine harte 1024²-Schattenkarte ersetzen,
   die vor der Rampe in N·L eingerechnet wird und das Gesicht ausnimmt.
9. **G9** — Kanalweise Schulter, Schwarzhub 0,08 und Dither in die
   undurchsichtigen Shader legen — ohne einen einzigen Framebuffer.
10. **G10** — Den Tagesgang als Acht-Stuetzstellen-Tabelle in JavaScript
    nachziehen, in sRGB interpoliert.
11. **G11** *(optional)* — HDR-Ziel, MSAA-Aufloesung und sechsstufigen Bloom
    nachruesten, falls das Gel genug Glanz hat, dass es sich lohnt.
12. **G12** *(optional, gross)* — Instanziertes Gras mit Windwelle im
    Vertex-Shader, sobald entschieden ist, dass die Arena eine Wiese sein darf.
13. **G13** *(niedrigste Prioritaet)* — Wolkenschicht mit entsaettigtem Saum,
    zahlt bei 4,6 % Himmelsanteil fast nichts ein.

---

# Entscheidungen zu den drei offenen Punkten

Getroffen nach Abschluss der Recherche, bevor Phase Grafik startet.

## 1. Wem gehoert renderer.js

Waehrend des Gauntlets bleibt die Datei gesperrt — sonst zieht ihr jede
Aenderung allen laufenden Blindvergleichen den Boden weg.

Mit dem Start von Phase Grafik geht sie an die **Lane GRAFIK**. In
ARCHITEKTUR.md §1 ist das eingetragen. R.extras bleibt bestehen, ist aber
ausdruecklich NICHT der Weg fuer die Grafikbausteine: Schattenrampe, Kontur und
Tonemapping greifen in die Shader selbst ein, das laesst sich von aussen nicht
anflanschen.

Neue Shader kommen nach client/shader/ und gehoeren ebenfalls Lane GRAFIK.

## 2. Die Lane GRAFIK in der Fortschrittsseite

tools/fortschritt.mjs kennt in Zeile 65 die Lane 'GRAFIK' nicht. Das ist ein
Einzeiler und wird beim Start von Phase Grafik miterledigt — nicht vorher, weil
die Datei sonst zwischen zwei Werkzeugen haengt, die gleichzeitig daran
schreiben.

## 3. Der Vergleichsmassstab — die eigentliche Frage

Diese Entscheidung bestimmt, ob G1 bis G11 ueberhaupt gewinnen koennen.

**Beides, aus zwei verschiedenen Gruenden.**

**Ausschnitt gegen Ausschnitt fuer die einzelnen Bausteine.** Beurteilt wird die
Schattenkante gegen die Schattenkante, das Randlicht gegen das Randlicht, der
Nebel gegen den Nebel. Der Richter bekommt ohnehin genau ein Kriterium — und
gegen eine Genshin-Landschaft mit Baeumen, Ruinen und Fernsicht verliert unsere
Testarena an INHALT, nicht an Rendering. Das waere kein Urteil ueber die
Grafik, sondern eines ueber den Umfang der Kunstproduktion. tools/blind.mjs
kann Ausschnitte bereits (--unserCrop / --referenzCrop).

**Vollbild gegen Vollbild als Schlussprobe.** Der Auftrag lautete, das Spiel
solle so aussehen — nicht, einzelne Shader sollen es tun. Es braucht deshalb am
Ende einen Vergleich der ganzen Ansicht. Der kann nur bestehen, wenn die Arena
mehr ist als eine graue Ebene.

**Folge: G12 (Gras) ist nicht optional, sondern Pflicht.** Dazu Bodenfarben auf
Genshin-Niveau (Fels 0,335 gegen 0,85 gemessen — rund eine Blendenstufe zu
dunkel), ein Horizont, der nicht in Schwarz laeuft, und ein paar Silhouetten in
der Ferne.

**Spannung zum GDD, ausdruecklich benannt:** GDD 12 §4 verlangt eine "einfache
Testflaeche", und GDD 01 §63 stellt das Spielgefuehl ueber alles andere. Eine
begruente Arena mit Fernsicht ist nicht mehr schlicht. Die Aufloesung: die
Arena behaelt ihre GEOMETRIE — dieselbe Ebene, dieselben Felsen, dieselbe enge
Passage, dasselbe Plateau, derselbe Friedhof. Es aendert sich, wie sie
AUSSIEHT, nicht was sie ist. Kein Hindernis kommt dazu, keines faellt weg, und
die Bewegungsaufnahmen bleiben damit vergleichbar.

**Harte Grenze, die auch in Phase Grafik gilt:** Wenn ein Grafikbaustein das
Spielgefuehl kostet — Bildrate, Lesbarkeit der Verformung, Erkennbarkeit des
Ziels —, faellt der Baustein, nicht das Spielgefuehl. GDD 01 §63, GDD 10 §98,
GDD 02 §64. Der Schleim ist die Figur, nicht die Kulisse.
