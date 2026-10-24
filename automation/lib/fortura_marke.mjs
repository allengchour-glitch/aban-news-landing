/* LuxeStyle — fortura_marke.mjs
 * Liest aus einem Fortura-Produkt die MARKE und die ARTIKELNUMMER heraus.
 * Reine Funktionen, kein Netz. Grundlage für den Preisvergleich gegen Schweizer Händler.
 *
 * Warum ein eigenes Modul: die Shopify-Suchfilter `body:` und `available_for_sale:`
 * werden vom Shop STILL IGNORIERT (am 24.10.2026 gemessen: `body:Widmann` liefert
 * Rubie's, Haus Huberts und Eulenspiegel mit). Die Marke muss darum selbst aus der
 * Beschreibung gelesen werden, und das will geprüft sein.
 */

/** Marke aus dem `<strong>Marke:</strong> X`-Feld der Beschreibung. null = steht nicht drin. */
export function marke(descriptionHtml) {
  if (typeof descriptionHtml !== 'string' || !descriptionHtml) return null;
  const m = descriptionHtml.match(/<strong>\s*Marke:\s*<\/strong>\s*([^<]+)/i);
  if (!m) return null;
  const wert = m[1].replace(/&amp;/g, '&').trim();
  return wert || null;
}

/** true nur bei genau der Marke Widmann (Gross-/Kleinschreibung egal). */
export function istWidmann(descriptionHtml) {
  const m = marke(descriptionHtml);
  return m != null && /^widmann$/i.test(m);
}

/**
 * Artikelnummer aus der SKU `fortura-<Nr>`.
 * Gibt { nummer, suffix, numerisch } zurück oder null, wenn die SKU nicht passt.
 * `fortura-93624-2` → nummer 93624, suffix '2'   (das Suffix ist die Grösse/Variante)
 * `fortura-BO52816` → nummer BO52816             (BOLAND, NICHT Widmann — der
 *                                                 Buchstabenvorsatz ist die Marke)
 */
export function artikelnummer(sku) {
  if (typeof sku !== 'string') return null;
  const m = sku.trim().match(/^fortura-(.+)$/i);
  if (!m) return null;
  const rest = m[1].trim();
  if (!rest) return null;
  // Ein angehängtes -<Zahl> oder -<Grösse> ist Variante, nicht Artikelnummer.
  const t = rest.match(/^([A-Za-z]*\d+)(?:-(.+))?$/);
  if (!t) return { nummer: rest, suffix: null, numerisch: false };
  return { nummer: t[1], suffix: t[2] || null, numerisch: /^\d+$/.test(t[1]) };
}

/**
 * Der beste Suchschlüssel für einen Preisvergleich, in dieser Reihenfolge:
 * Barcode (eindeutig) → Artikelnummer → null.
 * Produktnamen taugen NICHT: Kostümartikel heissen bei jedem Händler anders.
 */
export function suchschluessel({ barcode, sku } = {}) {
  const b = typeof barcode === 'string' ? barcode.trim() : '';
  if (/^\d{8,14}$/.test(b)) return { art: 'barcode', wert: b };
  const a = artikelnummer(sku);
  if (a && a.numerisch) return { art: 'artikelnummer', wert: a.nummer };
  return null;
}
