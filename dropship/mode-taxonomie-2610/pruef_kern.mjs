/**
 * Kern der Mode-Pruefung: die EINE gemeinsame Auswertungsfunktion (rein, ohne Nebenwirkung). Von pruefen.mjs und anpassen.mjs benutzt.
 */
const rxCache = new Map();
export const R = s => { let r = rxCache.get(s); if (!r) { r = new RegExp(s, 'i'); rxCache.set(s, r); } return r; };
export function geschlechtPasst(kat, gen) {
  if (kat.geschlecht === 'alle') return true;                         // Erweiterung: geschlechtsneutrale Kategorie (kein Filter)
  if (kat.geschlecht === 'damen' || kat.geschlecht === 'herren') return gen === kat.geschlecht || gen === 'unisex';
  return gen === kat.geschlecht;                                     // kinder, unisex, partner
}
export function passt(k, p, gen) {
  const g = p.g || '', t = p.title || '', tg = p.tags || [];
  const gp = k.g_prefix || [], tm = k.titel_muss || [];
  if (gp.length) { if (!gp.some(x => g.startsWith(x))) return false; }
  else if (!tm.some(s => R(s).test(t))) return false;
  if (tm.length && !tm.some(s => R(s).test(t))) return false;
  if ((k.titel_nicht || []).some(s => R(s).test(t))) return false;
  if ((k.g_nicht || []).some(x => g.startsWith(x))) return false;
  if ((k.tags_nicht || []).some(x => tg.includes(x))) return false;
  if ((k.tags_muss_eines || []).length && !k.tags_muss_eines.some(x => tg.includes(x))) return false;
  return geschlechtPasst(k, gen);
}
export function imUnterfilter(u, p) {
  const t = p.title || '';
  return (!(u.titel_muss || []).length || u.titel_muss.some(s => R(s).test(t))) && !(u.titel_nicht || []).some(s => R(s).test(t));
}


/** Wertet die einfache Shopify-Regeltext-Form der vorhandenen Collections aus («TAG EQUALS x UND TITLE CONTAINS y …»); null = nicht auswertbar (manuell, Vendor, Produktkategorie-ID). */
export function altMitglieder(c, daten) {
  const rule = String(c.regeln);
  if (rule === 'manuell') return null;
  const und = rule.includes(' UND '), terms = rule.split(und ? ' UND ' : ' ODER ');
  const ev = [];
  for (const t of terms) {
    const m = t.match(/^(TAG|TITLE|TYPE|VENDOR|PRODUCT_CATEGORY_ID_WITH_DESCENDANTS) (EQUALS|NOT_EQUALS|CONTAINS|NOT_CONTAINS|STARTS_WITH|ENDS_WITH) (.*)$/);
    if (!m) return null;
    const [, col, op, val] = m; const v = val.toLowerCase();
    if (col === 'VENDOR' || col === 'PRODUCT_CATEGORY_ID_WITH_DESCENDANTS') return null;
    ev.push(p => {
      const felder = col === 'TAG' ? (p.tags || []).map(x => x.toLowerCase()) : [String(col === 'TITLE' ? p.title : p.type || '').toLowerCase()];
      const pos = op === 'EQUALS' || op === 'NOT_EQUALS' ? felder.some(f => f === v) : op === 'CONTAINS' || op === 'NOT_CONTAINS' ? felder.some(f => f.includes(v)) : op === 'STARTS_WITH' ? felder.some(f => f.startsWith(v)) : felder.some(f => f.endsWith(v));
      return op.startsWith('NOT_') ? !pos : pos;
    });
  }
  return daten.map((p, i) => i).filter(i => und ? ev.every(f => f(daten[i])) : ev.some(f => f(daten[i])));
}

// Mode-Universum: was die vier Abteilungen ueberhaupt abdecken sollen
export function imUniversum(p) {
  const g = p.g || '';
  if (/^Apparel & Accessories > (Clothing|Shoes|Handbags, Wallets & Cases|Handbag & Wallet Accessories|Shoe Accessories)/.test(g)) return true;
  if (/^Luggage & Bags/.test(g)) return true;
  if (!g && ['Damenmode', 'Herrenmode', 'Baby & Kinder', 'Kinder', 'Mode'].includes(p.type)) return true;
  return false;
}
