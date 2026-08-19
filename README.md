# SLIMORIA

SLIMORIA ist ein 3D-Fantasy-MMORPG, in dem man keinen Menschen mit Schwert
spielt, sondern einen Schleim. Der Körper ist eine Masse: er wabbelt, staucht
sich beim Aufprall, zieht sich beim Beschleunigen in die Länge und schwingt
beim Bremsen nach. Und er frisst — geschwächte Gegner werden umschlungen,
verschlungen und in Wachstum verwandelt. Das ist die Signaturmechanik, alles
andere ordnet sich ihr unter.

Die Spezifikation liegt unter **[`Doc/gdd/`](Doc/gdd/)**. Einstieg ist der
Index **[`Doc/gdd/README.md`](Doc/gdd/README.md)** — er sagt, wo etwas steht,
und verweist auf die 14 Dokumente GDD 00 bis GDD 13 (Kern-Gameplay, Kampf,
Klassen, Progression, Ausrüstung, Welt, Quests, MMORPG-Systeme, UI, Technik,
Roadmap, Spielerreisen). Das GDD ist die Quelle; wo eine andere Datei ihm
widerspricht, gilt das GDD.

Der spielbare Prototyp liegt unter **[`slimoria/`](slimoria/)** und setzt die
Phasen 1 und 2 der Roadmap um (GDD 12 §4 und §5): Schleim, Testarena,
Klickbewegung, Verformung, Kreatur, Kampf, Fressen, Level, Tod, Friedhof —
dazu zwei gleichzeitig verbundene Spieler an einem autoritativen Server.
Wie man ihn startet, was nachweisbar erfüllt ist und wo seine Grenzen liegen,
steht in **[`slimoria/README.md`](slimoria/README.md)**.

Daneben gibt es **[`prototypen/`](prototypen/)**: eine Spielwiese für
Experimente, unabhängig vom eigentlichen Spiel. Jedes Experiment bekommt einen
eigenen Unterordner, nichts davon wird vom Spiel importiert, und die
Abhängigkeit geht nur in eine Richtung — wenn ein Prototyp überzeugt, wandert
sein Code ins Spiel, nie umgekehrt. Details in
[`prototypen/README.md`](prototypen/README.md).
