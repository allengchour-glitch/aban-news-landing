/* Einstellungen der Folge «Warum vegan leben? Grund 1: die Tiere» (szene.html liest sie als window.__FOLGE).
   Die Zeiten stammen aus zeiten.js (wird vorher geladen), damit Kamera, Karten und Hühner zum Sprechtext passen.
   kamera:    je Bühne Schlüssel [u, Ort, Blickpunkt, Bildwinkel], u = Anteil der Szenendauer (0 bis 1)
   karten:    je Bühne Funktion → Liste [gross, klein, von, bis] (Sekunden in der Szene; bis ist freiwillig)
   kartenTop: Oberkante der Karten in Pixeln (Bild 1080 × 1920); wichtige Inhalte liegen zwischen 15 und 75 Prozent der Höhe */
(() => {
  const Z = window.__ZEITEN, s5 = Z.szenen.find((s) => s.id === 'S5'), s10 = Z.szenen.find((s) => s.id === 'S10');
  const D5 = s10.t0 - s5.t0;                      // Dauer der Tier-Szene (sie endet, wo die Schlussszene beginnt)
  const zehn = s5.zeilen[1].start - s5.t0;        // Beginn des Satzes «Das sind rund zehn für jeden Menschen.»
  const schmerz = s5.zeilen[2].start - s5.t0;     // Beginn des Satzes «Und auch sie fühlen Schmerz.»
  const ab = zehn + 0.15, takt = 0.26;            // die zehn Hühner erscheinen einzeln, während der Satz läuft
  const sichtbar = (tl) => Math.max(0, Math.min(10, Math.floor((tl - ab) / takt) + 1));
  window.__FOLGE = {
    huehnerAb: ab, huehnerTakt: takt,
    kamera: {
      S1: [[0, [0.5, 1.45, 4.2], [0, 1.2, -0.6], 34], [1, [1.3, 1.6, 5.6], [0, 1.2, -1.3], 36]],
      S5: [
        [0, [2.5, 2.6, 10.5], [-2.6, 0.9, -3.0], 42],                    // Kühe auf der Wiese, Pia rechts
        [(zehn - 0.6) / D5, [0, 8.3, 12.2], [0, 0.2, 0.2], 42],          // von oben: Platz für den Kreis der zehn Hühner
        [(schmerz - 0.3) / D5, [0.5, 8.0, 12.0], [0, 0.2, 0.2], 42],
        [1, [1.0, 3.0, 7.6], [0, 1.25, 0.2], 36]                         // näher zu Pia und den Hühnern
      ],
      S10: [[0, [3.2, 1.6, 9.0], [0, 1.25, -0.6], 38], [1, [0.9, 1.65, 8.0], [0, 1.35, -1.3], 38]]
    },
    karten: {
      S5: ({ zahl, tl }) => tl < zehn - 0.15
        ? [[zahl(83, tl, 0.9, 3.2) + ' Mrd.', 'für Fleisch geschlachtet (2022)', 0.9, zehn - 0.15]]
        : [[String(sichtbar(tl)), 'Tiere für jeden Menschen, jedes Jahr', zehn, schmerz - 0.1]],
      S10: () => [['0', 'Tiere geschlachtet für einen pflanzlichen Teller', 0.7]]
    },
    kartenTop: { S5: [1230, 1410, 1590], S10: [1175, 1350, 1525] }
  };
})();
