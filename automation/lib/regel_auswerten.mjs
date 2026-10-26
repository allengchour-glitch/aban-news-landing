/**
 * Wertet Smart-Collection-Regeln LOKAL auf Produkten aus (ohne Shopify). Rein, getestet (regel_auswerten_test.mjs).
 * Herkunft: automation/kategorie_pruefer.mjs (25.10.2026); hierher verschoben, damit auch lib/kategorien_verengt.mjs es nutzen kann.
 */
const klein = s => String(s || '').toLowerCase();

/** Wertet EINE Regel auf einem Produkt aus. null = nicht auswertbar. */
export function regelPasst(r, p) {
  const c = r.column, rel = r.relation, v = klein(r.condition);
  if (c === 'TAG') { const t = (p.tags || []).map(klein); return rel === 'EQUALS' ? t.includes(v) : rel === 'NOT_EQUALS' ? !t.includes(v) : null; }
  if (c === 'TITLE') { const t = klein(p.title); return rel === 'CONTAINS' ? t.includes(v) : rel === 'NOT_CONTAINS' ? !t.includes(v) : rel === 'EQUALS' ? t === v : rel === 'STARTS_WITH' ? t.startsWith(v) : rel === 'ENDS_WITH' ? t.endsWith(v) : null; }
  if (c === 'TYPE') { const t = klein(p.productType); return rel === 'EQUALS' ? t === v : rel === 'NOT_EQUALS' ? t !== v : null; }
  return null;
}

/** Passt EIN Produkt auf die ganze Regelmenge? null = eine Regel ist nicht lokal auswertbar. */
export function passtRegelmenge(ruleSet, p) {
  if (!ruleSet?.rules?.length) return null;
  const res = ruleSet.rules.map(r => regelPasst(r, p));
  if (res.includes(null)) return null;
  return ruleSet.appliedDisjunctively ? res.some(Boolean) : res.every(Boolean);
}

/** Collection-Regel → Mitgliederliste (oder null, wenn eine Regel nicht lokal auswertbar ist). */
export function mitglieder(ruleSet, produkte) {
  if (!ruleSet?.rules?.length) return null;
  const out = [];
  for (const p of produkte) {
    const ok = passtRegelmenge(ruleSet, p);
    if (ok === null) return null;
    if (ok) out.push(p);
  }
  return out;
}
