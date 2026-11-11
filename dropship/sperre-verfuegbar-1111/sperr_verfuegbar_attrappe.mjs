// Offline-Attrappe für sperr_verfuegbar.mjs (nur für den Test): ersetzt `fetch` vollständig, kein Netz, keine Zugangsdaten.
// Einbinden:  node --import ./sperr_verfuegbar_attrappe.mjs sperr_verfuegbar.mjs
// Zustand:    JSON-Datei aus SPERR_ATTRAPPE_ZUSTAND  { produkte:[{ id, handle, status, descriptionHtml, varianten:[{ id, titel, sku,
//             policy, item, tracked, staende:[{ ort, name, dienst, menge }] }] }], aufrufe:[…] }
// Verhalten wie am 11.11.2026 gemessen:
//   - availableForSale = nicht bestandsgeführt ODER Regel CONTINUE ODER eine Menge über 0;
//   - inventorySetQuantities am Standort eines Fulfillment-Dienstes (Printful) lehnt Shopify mit INVALID_LOCATION ab;
//   - changeFromQuantity muss der aktuellen Menge entsprechen, sonst lehnt die Attrappe ab (wie Shopify).
//   - SPERR_ATTRAPPE_VERZUG=<n>: nach einem Schreibzugriff zeigen die nächsten n Lesungen noch die ALTE Kaufbarkeit (Shopify rechnet
//     availableForSale zeitversetzt nach, gemessen bis rund 90 s); die geschriebenen Felder selbst sind sofort sichtbar.
// Jeder Aufruf steht in `aufrufe` (Art und Ziel), damit der Test zählen kann, was gelesen und was geschrieben wurde.
import { readFileSync, writeFileSync } from 'node:fs';

const PFAD = process.env.SPERR_ATTRAPPE_ZUSTAND;
if (!PFAD) throw new Error('SPERR_ATTRAPPE_ZUSTAND fehlt');
const laden = () => JSON.parse(readFileSync(PFAD, 'utf8'));
const sichern = (z) => writeFileSync(PFAD, JSON.stringify(z, null, 1));
const antwort = (koerper, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => koerper, text: async () => JSON.stringify(koerper) });
const kaufbar = (v) => !v.tracked || v.policy === 'CONTINUE' || v.staende.some((s) => s.menge > 0);
const VERZUG = Number(process.env.SPERR_ATTRAPPE_VERZUG || 0);
/** Vor jedem Schreibzugriff: die Kaufbarkeit von VOR der ersten Änderung merken und die Verzugs-Lesungen neu zählen. */
function verzugStarten(z) {
  if (!VERZUG) return;
  z.kaufbarVorher ||= Object.fromEntries(z.produkte.flatMap((p) => p.varianten.map((v) => [v.id, kaufbar(v)])));
  z.verzugRest = VERZUG;
}

// Wartezeiten des Skripts (6 s je Rücklese-Versuch, Drossel-Pausen) im Test stauchen: die Logik bleibt, nur die Uhr läuft schnell.
const echtesTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...rest) => echtesTimeout(fn, ms >= 1000 ? 1 : ms, ...rest);

globalThis.fetch = async (url, opt = {}) => {
  const z = laden();
  z.aufrufe ||= [];
  const merke = (eintrag) => { z.aufrufe.push(eintrag); sichern(z); };
  const u = String(url);
  if (!u.startsWith('https://au3j0y-hq.myshopify.com/')) { merke({ art: 'fremd', url: u }); throw new Error('Attrappe: fremde Adresse ' + u); }
  if (u.endsWith('/admin/oauth/access_token')) { merke({ art: 'token' }); return antwort({ access_token: 'attrappe' }); }
  if (!u.endsWith('/graphql.json')) { merke({ art: 'fremd', url: u }); throw new Error('Attrappe: unbekannter Pfad ' + u); }
  const { query, variables = {} } = JSON.parse(opt.body);
  const varianten = z.produkte.flatMap((p) => p.varianten.map((v) => ({ p, v })));

  if (/\bproducts\(first:10/.test(query)) {
    const alt = z.verzugRest > 0 ? z.kaufbarVorher : null;
    if (alt) z.verzugRest--; else delete z.kaufbarVorher;
    merke({ art: 'lesen', ...(alt ? { verzug: true } : {}) });
    return antwort({ data: { products: { nodes: z.produkte.map((p) => ({
      id: p.id, handle: p.handle, status: p.status, descriptionHtml: p.descriptionHtml,
      variants: { nodes: p.varianten.map((v) => ({ id: v.id, title: v.titel, sku: v.sku, availableForSale: alt ? alt[v.id] : kaufbar(v), inventoryPolicy: v.policy,
        inventoryItem: { id: v.item, tracked: v.tracked, inventoryLevels: { nodes: v.staende.map((s) => ({ location: { id: s.ort, name: s.name, isFulfillmentService: s.dienst }, quantities: [{ quantity: s.menge }] })) } } })) },
    })) } } });
  }
  if (/\binventoryItemUpdate\(/.test(query)) {
    const t = varianten.find((x) => x.v.item === variables.id);
    if (!t) { merke({ art: 'abgelehnt', was: 'tracked', item: variables.id }); return antwort({ data: { inventoryItemUpdate: { inventoryItem: null, userErrors: [{ field: ['id'], message: 'unbekannt' }] } } }); }
    verzugStarten(z);
    t.v.tracked = variables.input.tracked;
    merke({ art: 'tracked', handle: t.p.handle, variante: t.v.id, wert: t.v.tracked });
    return antwort({ data: { inventoryItemUpdate: { inventoryItem: { id: t.v.item, tracked: t.v.tracked }, userErrors: [] } } });
  }
  if (/\binventorySetQuantities\(/.test(query)) {
    const q = variables.input.quantities[0];
    const t = varianten.find((x) => x.v.item === q.inventoryItemId);
    const s = t?.v.staende.find((x) => x.ort === q.locationId);
    const fehler = !t || !s ? 'unbekannt' : s.dienst ? 'INVALID_LOCATION' : s.menge !== q.changeFromQuantity ? 'CHANGE_FROM_QUANTITY_STALE' : null;
    if (fehler) { merke({ art: 'abgelehnt', was: 'menge', handle: t?.p.handle, code: fehler }); return antwort({ data: { inventorySetQuantities: { inventoryAdjustmentGroup: null, userErrors: [{ field: ['input'], message: fehler, code: fehler }] } } }); }
    verzugStarten(z);
    s.menge = q.quantity;
    merke({ art: 'menge', handle: t.p.handle, variante: t.v.id, wert: s.menge });
    return antwort({ data: { inventorySetQuantities: { inventoryAdjustmentGroup: { id: 'gid://shopify/InventoryAdjustmentGroup/1' }, userErrors: [] } } });
  }
  if (/\bproductVariantsBulkUpdate\(/.test(query)) {
    const geaendert = [];
    verzugStarten(z);
    for (const ein of variables.v) {
      const t = varianten.find((x) => x.v.id === ein.id && x.p.id === variables.p);
      if (!t) { merke({ art: 'abgelehnt', was: 'policy', variante: ein.id }); return antwort({ data: { productVariantsBulkUpdate: { productVariants: null, userErrors: [{ field: ['variants'], message: 'unbekannt' }] } } }); }
      t.v.policy = ein.inventoryPolicy; geaendert.push({ id: t.v.id, inventoryPolicy: t.v.policy });
      z.aufrufe.push({ art: 'policy', handle: t.p.handle, variante: t.v.id, wert: t.v.policy });
    }
    sichern(z);
    return antwort({ data: { productVariantsBulkUpdate: { productVariants: geaendert, userErrors: [] } } });
  }
  merke({ art: 'fremd', query: String(query).slice(0, 80) });
  throw new Error('Attrappe: unbekannte Abfrage');
};
