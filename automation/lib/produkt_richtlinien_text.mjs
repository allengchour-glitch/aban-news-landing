/**
 * Sachlicher Richtlinienhinweis fuer automatisch importierte Produkte.
 *
 * Keine feste Lieferzeit, keine pauschale Rueckgabefrist und kein Rabattcode:
 * diese Angaben koennen sich aendern und gehoeren in die kanonischen Richtlinien.
 */
export const PRODUKT_RICHTLINIEN_HTML = `<div class="ls-produktrichtlinien" style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>Versand und Rückgabe</strong><br>Preis und Verfügbarkeit richten sich nach der gewählten Ausführung. <a href="/policies/shipping-policy">Versandinformationen</a> und <a href="/policies/refund-policy">Rückgabebedingungen</a>.</div>`;

export function produktSeoBeschreibung(titel) {
  const basis = String(titel || '').trim();
  if (!basis) return '';
  return `${basis} bei LuxeStyle Schweiz. Preis und verfügbare Ausführungen auf der Produktseite prüfen.`.slice(0, 320);
}
