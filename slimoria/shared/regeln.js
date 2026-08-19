/* ---------------------------------------------------------------------------
 * Spielregeln — identisch für Client und Server.
 *
 * GESPERRT. Der Server ist die Autorität (GDD 11 §120): er würfelt den
 * Fressversuch, er führt HP, XP und Level. Der Client rechnet dieselben Formeln
 * nur, um sofort etwas anzeigen zu können und um offline aufnehmbar zu bleiben.
 * Beide müssen dieselben Zahlen ergeben — deshalb liegen sie in einer Datei.
 * ------------------------------------------------------------------------- */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Regeln = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* --- Kreaturen --------------------------------------------------------- */

  const KREATUREN = {
    schleimling: { name: 'Schleimling', hp: 22, dmg: 3, reichweite: 1.5, tempo: 2.2, farbe: [0.55, 0.75, 0.45], groesse: 0.45 },
    wolf:        { name: 'Wolf',        hp: 34, dmg: 6, reichweite: 1.8, tempo: 3.4, farbe: [0.60, 0.63, 0.73], groesse: 0.62 },
    eber:        { name: 'Eber',        hp: 52, dmg: 9, reichweite: 1.8, tempo: 2.6, farbe: [0.56, 0.36, 0.26], groesse: 0.78 },
  };

  function kreaturWerte(art, level) {
    const k = KREATUREN[art] || KREATUREN.wolf;
    return {
      art,
      name: k.name,
      maxHp: Math.round(k.hp * (1 + 0.42 * (level - 1))),
      dmg: Math.round(k.dmg * (1 + 0.35 * (level - 1))),
      reichweite: k.reichweite,
      tempo: k.tempo,
      farbe: k.farbe,
      groesse: k.groesse * (1 + 0.10 * (level - 1)),
    };
  }

  /* --- Spieler ----------------------------------------------------------- */

  const spielerMaxHp = (level) => 80 + (level - 1) * 22;
  const spielerMaxMana = (level) => 60 + (level - 1) * 10;
  const spielerSchaden = (level) => 7 + (level - 1) * 2.4;

  /* --- Level und XP ------------------------------------------------------
   * Im Prototyp bewusst schnell: die Abnahmeliste verlangt, dass man ein
   * Level-Up und das Wachstum tatsächlich zu sehen bekommt (GDD 01 §70
   * Punkt 19/20), nicht dass die Kurve für 80 Level ausbalanciert ist. */
  const xpFuerLevel = (level) => Math.round(85 * Math.pow(level, 1.32));

  function xpBelohnung(gegnerLevel, gefressen) {
    // Fressen ist Charakterentwicklung, Töten ist Gold (GDD 01 §34).
    return Math.round(28 * gegnerLevel * (gefressen ? 1.75 : 1.0));
  }
  const goldBelohnung = (gegnerLevel, gefressen) =>
    gefressen ? 0 : Math.round(4 + gegnerLevel * 3);

  /* --- Fresschance -------------------------------------------------------
   * GDD 01 §22–25. Zwei Faktoren: Levelunterschied und Restleben.
   *
   *   Spieler 10 vs. Gegner 1  → 100 %   (§22, und §25 erlaubt den direkten
   *                                       Versuch ohne Vorkampf)
   *   Spieler  3 vs. Gegner 1  →  40 %   (§22)
   *   Gegner 6–10 Level höher  →   0 %   (§23) */
  function fresschance(spielerLevel, gegnerLevel, hpAnteil) {
    const diff = gegnerLevel - spielerLevel;
    if (diff >= 6) return 0;

    // Gerade durch die beiden im GDD genannten Stützpunkte.
    const basis = clamp(0.40 - 0.0857 * (diff + 2), 0.02, 1);

    // Massive Überlegenheit: direkt fressbar, ohne den Gegner erst zu
    // bekämpfen (§25).
    if (diff <= -8) return 1;

    /* Der Levelwert gilt bei VOLLEM Leben — so ist §22 gemeint, sonst waeren
     * die dort genannten 40 % nirgends erreichbar. Schaden hebt die Chance von
     * dort aus Richtung 100 % (§24), ohne sie je ganz zu erreichen: der
     * Fressversuch bleibt eine Entscheidung mit Risiko (§33). */
    /* Multiplikativ, nicht additiv: ein additiver Bonus haette jedem Gegner
     * dieselbe Verbesserung geschenkt und die Levelabhaengigkeit aufgehoben —
     * ein fast toter Gegner fuenf Level ueber dem Spieler waere dann zu drei
     * Vierteln fressbar gewesen. So bleibt der Levelunterschied der bestimmende
     * Faktor (§22), und Schwaechen zahlt sich trotzdem deutlich aus (§24). */
    const hp = clamp(hpAnteil, 0, 1);
    return clamp(basis * (1 + 1.25 * (1 - hp)), 0, 1);
  }

  /* Ein Fehlschlag kostet — sonst wäre Spammen der Fresstaste kostenlos
   * (GDD 01 §30 Punkt 7). */
  const fehlschlagSchaden = (spielerLevel, gegnerLevel) =>
    Math.round(6 + Math.max(0, gegnerLevel - spielerLevel) * 3 + spielerLevel * 0.8);

  /* --- Fähigkeiten -------------------------------------------------------
   * Nur so viele, wie die Hotbar zum Zeigen braucht. Klassen kommen erst in
   * Phase 4 (GDD 12 §7) und bleiben hier bewusst draußen. */
  const FAEHIGKEITEN = [
    { id: 'biss',      name: 'Biss',           taste: '1', cd: 0,   kosten: 0,  typ: 'auto',   icon: 'biss',
      text: 'Grundangriff. Läuft automatisch weiter, solange ein Ziel in Reichweite lebt.' },
    { id: 'stoss',     name: 'Körperstoß',     taste: '2', cd: 6,   kosten: 12, typ: 'aktiv',  icon: 'stoss',  schaden: 1.9,
      text: 'Die Masse schnellt nach vorn und rammt das Ziel.' },
    { id: 'saeure',    name: 'Säurespritzer',  taste: '3', cd: 9,   kosten: 20, typ: 'aktiv',  icon: 'saeure', schaden: 2.6,
      text: 'Ein Schwall Magensäure. Schwächt das Ziel für den Fressversuch.' },
    { id: 'straffen',  name: 'Straffen',       taste: '4', cd: 18,  kosten: 15, typ: 'heil',   icon: 'straffen', heilung: 0.30,
      text: 'Der Körper zieht sich zusammen und schließt Risse.' },
    { id: 'fressen',   name: 'Fressen',        taste: 'E', cd: 2.5, kosten: 0,  typ: 'fressen', icon: 'fressen',
      text: 'Versuch, das Ziel zu verschlingen. Chance steigt, je schwächer das Ziel ist.' },
  ];

  return {
    clamp, KREATUREN, kreaturWerte,
    spielerMaxHp, spielerMaxMana, spielerSchaden,
    xpFuerLevel, xpBelohnung, goldBelohnung,
    fresschance, fehlschlagSchaden,
    FAEHIGKEITEN,
  };
});
