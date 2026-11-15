/**
 * Attrappe des Shopify-Admin-API für die Sortier-Tests (verfuegbar_zuerst_test.mjs). Wird per `node --import <diese Datei> <skript>` geladen.
 * Zustand aus der JSON-Datei in FAKE_SHOP: { menu: [handle…], collections: { handle: { id, sortOrder, ruleSet?, bsReihe?: [id…], kopf?: [id…] (Metafeld luxe.kopf_produkte),
 *   products: [{ id, handle, status, totalInventory, tracksInventory, online? (false = nicht im Onlineshop veröffentlicht) }] } },
 *   bulk?: [Zeilen der Bulk-Abfrage für bewertung_zuerst.mjs], ohneOnlineStore?: true (Kanal fehlt), nachReorderEntfernen?: id (verschwindet nach dem ersten Umsortieren),
 *   metafeldKlemmt?: true (Metafeld-Schreiben meldet Erfolg, ändert aber nichts: prüft das Zurücklesen), log: [] }.
 * Jede Mutation wird ausgeführt (Reihenfolge, sortOrder) und mit dem Zustand zurück in die Datei geschrieben; der Test liest sie danach.
 * Wartezeiten des Skripts (setTimeout) laufen sofort ab, damit ein LIVE-Lauf nicht 9 s je Collection braucht. Nichts geht ins Netz.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const DATEI = process.env.FAKE_SHOP;
const zustand = JSON.parse(readFileSync(DATEI, 'utf8'));
zustand.log ||= [];
const sichern = () => writeFileSync(DATEI, JSON.stringify(zustand, null, 1));
process.on('exit', sichern);   // auch reine Lesezugriffe (Zähler abfragen/kanalAbfragen) landen in der Datei
const nachId = id => Object.values(zustand.collections).find(c => c.id === id);
const antwort = data => new Response(JSON.stringify({ data, extensions: { cost: { requestedQueryCost: 1, throttleStatus: { currentlyAvailable: 1000, restoreRate: 100 } } } }), { status: 200, headers: { 'content-type': 'application/json' } });

const echtesTimeout = globalThis.setTimeout;
globalThis.setTimeout = (f, _ms, ...a) => echtesTimeout(f, 0, ...a);

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/admin/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'fake-token' }), { status: 200 });
  if (u === 'https://fake.local/bulk.jsonl') return new Response((zustand.bulk || []).map(o => JSON.stringify(o)).join('\n') + '\n', { status: 200 });
  if (!u.includes('/graphql.json')) throw new Error(`Attrappe: unerwarteter Abruf ${u}`);
  const { query, variables: v = {} } = JSON.parse(init.body);
  zustand.abfragen = (zustand.abfragen || 0) + 1; if (query.includes('publications(')) zustand.kanalAbfragen = (zustand.kanalAbfragen || 0) + 1;
  if (query.includes('bulkOperationRunQuery')) { zustand.bulkGestartet = true; return antwort({ bulkOperationRunQuery: { bulkOperation: { id: 'gid://shopify/BulkOperation/1' }, userErrors: [] } }); }
  if (query.includes('currentBulkOperation')) return antwort({ currentBulkOperation: zustand.bulkGestartet ? { status: 'COMPLETED', errorCode: null, objectCount: String((zustand.bulk || []).length), url: 'https://fake.local/bulk.jsonl' } : null });
  if (query.includes('publications(')) return antwort({ publications: { nodes: [{ id: 'gid://shopify/Publication/7', name: 'Point of Sale' }, ...(zustand.ohneOnlineStore ? [] : [{ id: 'gid://shopify/Publication/9', name: 'Online Store' }])] } });
  if (query.includes('metafieldsSet(')) {
    for (const m of v.m) { const c = nachId(m.ownerId); if (!zustand.metafeldKlemmt) c.kopf = JSON.parse(m.value); zustand.log.push({ art: 'metafeld', id: c.id, wert: m.value }); }
    sichern(); return antwort({ metafieldsSet: { userErrors: [] } });
  }
  if (query.includes('metafieldsDelete(')) {
    for (const m of v.m) { const c = nachId(m.ownerId); if (!zustand.metafeldKlemmt) delete c.kopf; zustand.log.push({ art: 'metafeld-weg', id: c.id }); }
    sichern(); return antwort({ metafieldsDelete: { userErrors: [] } });
  }
  if (query.includes('menus(')) return antwort({ menus: { nodes: [{ items: (zustand.menu || []).map(h => ({ url: `/collections/${h}`, items: [] })) }] } });
  if (query.includes('collectionByHandle')) {
    const c = zustand.collections[v.h];
    return antwort({ collectionByHandle: c ? { id: c.id, title: v.h, sortOrder: c.sortOrder, productsCount: { count: c.products.length }, ruleSet: c.ruleSet || null,
      metafield: c.kopf ? { id: 'gid://shopify/Metafield/1', type: 'list.product_reference', value: JSON.stringify(c.kopf) } : null } : null });
  }
  if (query.includes('collectionUpdate')) {
    const c = nachId(v.i.id); c.sortOrder = v.i.sortOrder; zustand.log.push({ art: 'sortOrder', id: c.id, wert: v.i.sortOrder }); sichern();
    return antwort({ collectionUpdate: { userErrors: [] } });
  }
  if (query.includes('collectionReorderProducts')) {
    const c = nachId(v.id), ids = c.products.map(p => p.id);
    for (const m of v.m) { const p = c.products.splice(c.products.findIndex(x => x.id === m.id), 1)[0]; c.products.splice(Number(m.newPosition), 0, p); }
    zustand.log.push({ art: 'reorder', id: c.id, zuege: v.m.length, vorher: ids });
    if (zustand.nachReorderEntfernen) { c.products = c.products.filter(p => p.id !== zustand.nachReorderEntfernen); delete zustand.nachReorderEntfernen; }
    sichern();
    return antwort({ collectionReorderProducts: { job: { id: 'gid://shopify/Job/1' }, userErrors: [] } });
  }
  if (query.includes('collection(id:$id)')) {
    // Nicht-manuelle Sortierung (oder ausdrücklich sortKey:BEST_SELLING): Reihenfolge aus bsReihe, sonst die gespeicherte Handreihenfolge
    const c = nachId(v.id), bs = c.bsReihe && (c.sortOrder !== 'MANUAL' || query.includes('sortKey:BEST_SELLING'));
    const nodes = bs ? c.bsReihe.map(id => c.products.find(p => p.id === id)) : c.products;
    return antwort({ collection: { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } });
  }
  if (query.includes('nodes(ids:$ids)')) {
    const c = v.c ? nachId(v.c) : null, alle = Object.values(zustand.collections).flatMap(k => k.products);
    return antwort({ nodes: v.ids.map(id => { const p = alle.find(x => x.id === id); return p ? { ...p, inCollection: c ? c.products.some(x => x.id === id) : undefined, publishedOnPublication: v.p ? p.online !== false : undefined } : null; }) });
  }
  throw new Error(`Attrappe: unbekannte Abfrage ${query.slice(0, 80)}`);
};
