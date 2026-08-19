'use strict';

/* ---------------------------------------------------------------------------
 * Phase Grafik — Ladeliste des zweiten Renderpfads.
 *
 * Zwei Regeln, beide teuer gelernt:
 *
 * 1. Es wird NUR geladen, wenn der zweite Pfad tatsaechlich verlangt ist.
 *    Vorher stand hier eine feste Liste, die bei jedem Start abgearbeitet
 *    wurde. Die per document.write geschriebenen Script-Tags feuern echte
 *    HTTP-Anfragen — jede fehlende Datei ergibt einen 404, und
 *    tools/capture.mjs wertet jeden 404 als Seitenfehler. Zwei Pruefer des
 *    Gauntlets haben ihre Blindvergleiche daraufhin voellig zu Recht
 *    abgebrochen, weil sie nicht auf einem moeglicherweise kaputten Build
 *    urteilen wollten. Der alte Kommentar an dieser Stelle behauptete das
 *    Gegenteil und war schlicht falsch.
 *
 * 2. Geladen wird, was es WIRKLICH gibt. Die Liste steht in
 *    grafik/manifest.js und wird aus dem Verzeichnis erzeugt:
 *        node tools/grafikmanifest.mjs
 *    Wer ein Modul hinzufuegt, laesst das Werkzeug einmal laufen. Eine von
 *    Hand gepflegte Liste geht auseinander, sobald zwanzig Agenten daran
 *    arbeiten.
 * ------------------------------------------------------------------------- */

(function () {
  const q = new URLSearchParams(location.search);
  const gewuenscht = q.get('renderer') === '2' || window.RENDERER_WAHL === 2;
  if (!gewuenscht) return;

  const liste = window.GRAFIK_MODULE;
  if (!Array.isArray(liste) || !liste.length) {
    console.warn('grafik/laden.js: kein Manifest. Erst "node tools/grafikmanifest.mjs" laufen lassen.');
    return;
  }
  for (const m of liste) document.write('<script src="' + m + '"><\/script>');
})();
