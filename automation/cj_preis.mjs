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

// ⚠️ 23.08.2026 — DER BODEN VON CHF 15 WAR FALSCH, und er verfälschte JEDE Margenrechnung
// im ganzen Katalog nach unten. Er stand auf einem Zirkelschluss: `cj_kosten_backfill.mjs`
// berechnet `unitCost` selbst mit genau dieser Formel, also war jede Kostenzahl per
// Konstruktion ≥ 15 — und diente dann als «Beleg» für den Boden.
//
// CJ live nach Frachtquoten gefragt (CN→CH, je 1 Stück) und gegen die Formel gerechnet:
//     20 g  gemessen  4.34 CHF | alter Boden 15.00  (Faktor 3,5 zu hoch)
//    270 g  gemessen  8.17 CHF | alter Boden 15.00
//    840 g  gemessen 16.38 CHF | Formel      17.09
//   1250 g  gemessen 25.22 CHF | Formel      23.77
// Die Regression über sechs Messpunkte ergibt `3.84 + 16.42·kg` (CHF) — der LINEARE Teil
// der Formel war also die ganze Zeit richtig, nur der Boden nicht. Zwei der vier eigenen
// Bestellmessungen liegen ebenfalls darunter (LX1013: $6.34 und $9.49 für zwei Sendungen).
//
// Neuer Boden CHF 5.00: knapp über dem gemessenen Minimum von 4.34, als Sicherheitsmarge.
// ⚠️ Am schweren Ende UNTERschätzt die Formel (23.77 gegen gemessene 25.22) — dort ist die
// konservative Rundung an anderer Stelle das Gegengewicht, und dort sitzt auch das echte
// Margenproblem, nicht bei der leichten Ware.
// ⚠️ CJ LIEFERT BEI MEHR-VARIANTEN-PRODUKTEN SPANNEN, KEINE ZAHLEN (27.08.2026).
// Beim «Mehrzweck-Organizer fürs Pult» (pid 2511301329441606400) antwortet CJ:
//     sellPrice "4.41-12.22"   ·   productWeight "1600.00-5000.00"
// Der bisherige Ausdruck `('' + usd).split('--')[0]` sucht ZWEI Bindestriche und trennt
// deshalb NIE; `parseFloat` bricht dann am ersten Bindestrich ab und liefert **4.41** und
// **1600** — also durchgehend die billigste und leichteste Variante.
// Gerechnet für dieses eine Produkt (Verkaufspreis CHF 39.90):
//     angenommen 1,6 kg / $4.41 → Kosten CHF 34.10  → +5.80
//     tatsächlich 5,0 kg / $12.22 → Kosten CHF 96.90 → **−57.00**
// Genommen wird deshalb die OBERE Grenze: sie beschönigt nie. Ein zu hoher Preis kostet
// einen Verkauf, ein zu tiefer kostet Geld bei jedem Verkauf.
const obereGrenze = w => {
  const teile = ('' + w).split(/[-–—]/).map(x => parseFloat(x)).filter(x => !isNaN(x));
  return teile.length ? Math.max(...teile) : 0;
};

export const fracht = grams => {
  const kg = obereGrenze(grams) / 1000;
  return Math.max(5, 3.4 + 16.3 * kg);
};

// VOLLE Stückkosten: Ware + ganze Fracht. Die CHF 7, die der Kunde für den Versand zahlt,
// sind ERLÖS und stehen in der Bestellung — sie gehören nicht in die Stückkosten, sonst
// rechnet sich die Marge schön.
export const kosten = (usd, grams) => {
  const u = obereGrenze(usd);
  return (u * 0.9 + fracht(grams)).toFixed(2);
};

// Verkaufspreis. Der Preis muss die vollen Kosten tragen UND dem automatischen
// «2+ Artikel −10 %» standhalten: gefordert ist p·0,9 ≥ Kosten·1,05, also p ≥ Kosten·1,167.
// Der Boden von 16.90 ist die Untergrenze, unter der auch die leichteste Ware nicht mehr
// trägt — «relativer Boden ist kein Boden» (Lehre 12.08.2026).
export const chf = (usd, grams) => {
  const u = obereGrenze(usd);
  const gap = Math.max(0, fracht(grams) - 7);   // vom Preis zu deckende Fracht-LÜCKE
  const landed = u * 0.9 + gap;
  const p = Math.max(landed * 1.4, landed * 1.167 + 8.2, 16.90);
  return (Math.floor(p) + 0.90).toFixed(2);
};

// Gewicht für Shopify. Leeres Objekt, wenn CJ nichts liefert — ein `weight: 0` waere ein
// ungueltiger Input, und ein geratenes Gewicht waere schlimmer als gar keines.
// ⚠️ Das Gewicht war IMMER bekannt (die Frachtrechnung oben liest es) und wurde bis zum
// 22.08.2026 in allen Importern weggeworfen: von 45'741 aktiven Produkten trugen 45'700
// gar kein Gewicht. Ohne Gewicht ist keine gewichtsbasierte Versandregel moeglich — und
// die Frage, welche Ware im Mehrfachkorb Geld kostet, ist nicht beantwortbar.
export const gewicht = grams => {
  const g = obereGrenze(grams);
  return g > 0 ? { measurement: { weight: { value: g, unit: 'GRAMS' } } } : {};
};
