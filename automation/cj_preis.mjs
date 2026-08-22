// cj_preis.mjs — EINE Preis- und Kostenrechnung für ALLE CJ-Importer.
//
// WARUM EINE DATEI:
// Am 22.08.2026 nachgezählt hatte JEDER Importer seine eigene Formel — und nur EINE davon
// war die korrigierte:
//   cj_category_fill.mjs   max(landed·1,4 · landed·1,167+8,2 · 16.90)   ✅ (Fix vom 20.08.)
//   cj_sku_import.mjs      max(u·m, 4.90), Fracht erst ab 0,4 kg       ⛔ Boden CHF 4.90
//   cj_trending_import.mjs landed = u·0,9 + 8 (pauschal), Boden 14.90   ⛔ Gewicht ignoriert
//   cj_gaps_import.mjs     max(9.90, usd·kurs·marge)                    ⛔ gar keine Fracht
// `cj_sku_import.mjs` steht in vier Runner-Aufrufen, legte also täglich Ware mit einem
// Boden an, den der Preisboden-Lauf vom 12.08. schon einmal bei 2'355 Produkten von Hand
// anheben musste. Ein Fix an einer Stelle heilt so nichts — dieselbe Geschwister-Lehre wie
// bei der viermal kopierten Farbtabelle und bei publishVerified().
//
// GRUNDLAGE DER ZAHLEN (gemessen, nicht geschätzt):
//   Fracht China→CH je ARTIKEL: $6.34 · $9.49 · $15.77 · $19.35 (Orders #1011, LX1013, LX1015).
//   CJ zerlegt Mehrfachbestellungen und berechnet jede Sendung einzeln — zwei Artikel sind
//   zwei Frachten. Die Fracht hängt am GEWICHT, nicht am Preis.
//   Umrechnung 0.9 statt Tageskurs 0.79: rechnet die Marge klein, nicht schön.

export const fracht = grams => {
  const kg = (parseFloat(grams) || 0) / 1000;
  return Math.max(15, 3.4 + 16.3 * kg);
};

// VOLLE Stückkosten: Ware + ganze Fracht. Die CHF 7, die der Kunde für den Versand zahlt,
// sind ERLÖS und stehen in der Bestellung — sie gehören nicht in die Stückkosten, sonst
// rechnet sich die Marge schön.
export const kosten = (usd, grams) => {
  const u = parseFloat(('' + usd).split('--')[0]) || 0;
  return (u * 0.9 + fracht(grams)).toFixed(2);
};

// Verkaufspreis. Der Preis muss die vollen Kosten tragen UND dem automatischen
// «2+ Artikel −10 %» standhalten: gefordert ist p·0,9 ≥ Kosten·1,05, also p ≥ Kosten·1,167.
// Der Boden von 16.90 ist die Untergrenze, unter der auch die leichteste Ware nicht mehr
// trägt — «relativer Boden ist kein Boden» (Lehre 12.08.2026).
export const chf = (usd, grams) => {
  const u = parseFloat(('' + usd).split('--')[0]) || 0;
  const gap = Math.max(0, fracht(grams) - 7);   // vom Preis zu deckende Fracht-LÜCKE
  const landed = u * 0.9 + gap;
  const p = Math.max(landed * 1.4, landed * 1.167 + 8.2, 16.90);
  return (Math.floor(p) + 0.90).toFixed(2);
};
