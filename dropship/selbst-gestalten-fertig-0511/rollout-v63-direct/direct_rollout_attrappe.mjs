// Offline-Attrappe für direct_rollout.mjs: ersetzt fetch VOLLSTÄNDIG (kein Durchreichen ins Netz, kein Zugang nötig).
//   - Shopify-Admin: Token, Shop-Identität, Produkt lesen, productUpdate (Zustand in einer JSON-Datei, über Läufe hinweg)
//   - Storefront luxestyle.ch (Canonical) und die Assets unter abannews.com/pod/v6 (die echten Repo-Dateien, mit CORS/CORP/Cache)
// Gebrauch: node --import direct_rollout_attrappe.mjs direct_rollout.mjs, mit ATTRAPPE_STATE=<Zustandsdatei> (ohne diese
// Variable installiert das Modul nichts und liefert nur zustandBauen() für Tests).
//
// Der Ausgangszustand entsteht aus den 16 Live-Blöcken in fixtures/live-editor-bloecke-0811.json (nur Editor-Blöcke, keine
// Kundentexte) plus erfundenem Vor- und Nachtext; die Tasse trägt den 6.3.1-Block (Stand nach dem Canary vom 08.11.), die
// drei Sperrprodukte den heutigen Sperrblock aus dem Generator. Jeder Schreibzugriff wird mitgeschrieben (ATTRAPPE_LOG).
//
// Fehlerschalter (je ein Produkt-Handle oder 1), nur für Tests:
//   ATTRAPPE_FAIL_UPDATE=<handle>        productUpdate antwortet mit userErrors (abgelehnt)
//   ATTRAPPE_THROW_UPDATE=<handle>       productUpdate wirft einen Netzfehler (Antwort unbekannt)
//   ATTRAPPE_READBACK_WRONG=<handle>     geschriebene Beschreibung kommt mit einem zusätzlichen Zeilenumbruch zurück
//   ATTRAPPE_DRIFT_SECOND_READ=<handle>  beim zweiten Lesen hat jemand fremd angehängt (Drift zwischen Plan und Write)
//   ATTRAPPE_DRAFT_SECOND_READ=<handle>  beim zweiten Lesen steht das Produkt auf ENTWURF (Status-Wechsel zwischen Plan und Write)
//   ATTRAPPE_EXIT_AFTER_WRITE=<handle>   Prozess endet NACH dem gespeicherten Write und VOR dem Ledger (Abbruch im Actions-UI)
//   ATTRAPPE_MISSING=<handle>            Produkt existiert nicht mehr (product = null)
//   ATTRAPPE_BAD_CANONICAL=<handle>      Storefront meldet einen anderen Canonical
//   ATTRAPPE_BAD_CANONICAL_SPAETER=<h>   erst ab dem zweiten Storefront-Abruf dieses Produkts (Wechsel zwischen Plan und Write)
//   ATTRAPPE_EDITOR_TAMPER=1             ausgelieferte 6.4.0-Datei weicht ab (SRI-Wettlauf)
//   ATTRAPPE_PRED_TAMPER=1               ausgelieferte 6.3.0-Datei weicht ab (Rückweg-Datei)
//   ATTRAPPE_EDITOR_NOCORS=1             6.4.0 wird ohne CORS/CORP ausgeliefert
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWLIST, BLOCKLIST, blockerBaustein } from './direct_rollout_lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HIER, '../../..');
const entescape = (t) => t.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

/** Baut den Shop-Ausgangszustand. `tasse631` = false lässt auch die Tasse auf 6.3.0 (Zustand vor dem 6.3.1-Canary). */
export function zustandBauen({ tasse631 = true } = {}) {
  const fx = JSON.parse(readFileSync(join(HIER, 'fixtures/live-editor-bloecke-0811.json'), 'utf8'));
  const allowlist = JSON.parse(readFileSync(join(HIER, '../rollout-v63/allowlist.json'), 'utf8'));
  const store = { products: {}, writes: 0 };
  for (const a of ALLOWLIST) {
    const fix = tasse631 && a.id === fx.tasse631.id ? fx.tasse631 : fx.produkte.find((p) => p.id === a.id);
    const block = fix.block;
    const standard = block.match(/data-variant="(\d+)"/)[1];
    const row = allowlist.products.find((p) => p.shopifyProductId === a.id);
    const ids = row.variants.map((v) => String(v.shopifyVariantId));
    store.products[a.id] = {
      id: a.id, handle: a.handle, title: entescape(block.match(/data-produkttitel="([^"]*)"/)[1]), status: 'ACTIVE',
      updatedAt: '2026-11-09T06:00:00Z', onlineStoreUrl: `https://luxestyle.ch/products/${a.handle}`,
      descriptionHtml: `<p>Vorspann ${a.handle} &amp; äöü</p>\n${block}<p>Nachspann ${a.handle}</p>`,
      variants: [standard, ...ids.filter((x) => x !== standard)],   // die erste kaufbare Variante ist die Standardvariante des Blocks
    };
  }
  for (const b of BLOCKLIST) {
    const row = allowlist.products.find((p) => p.shopifyProductId === b.id);
    const ids = row ? row.variants.map((v) => String(v.shopifyVariantId)) : ['99'];
    const sperre = blockerBaustein({ product: { handle: b.handle, variants: { nodes: ids.map((i) => ({ id: `gid://shopify/ProductVariant/${i}` })) } }, blocker: b });
    store.products[b.id] = {
      id: b.id, handle: b.handle, title: `Sperre ${b.handle}`, status: 'ACTIVE', updatedAt: '2026-11-09T06:00:00Z',
      onlineStoreUrl: `https://luxestyle.ch/products/${b.handle}`, descriptionHtml: `<p>Sperre-Vorspann</p>\n${sperre}`, variants: ids,
    };
  }
  return store;
}

const STATE = process.env.ATTRAPPE_STATE;
if (STATE) {
  const LOG = process.env.ATTRAPPE_LOG;
  const env = (n) => process.env[`ATTRAPPE_${n}`];
  const lade = () => JSON.parse(readFileSync(STATE, 'utf8'));
  const speichere = (s) => writeFileSync(STATE, JSON.stringify(s));
  const log = (o) => { if (LOG) appendFileSync(LOG, `${JSON.stringify(o)}\n`); };
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = async (url, opt = {}) => {
    const u = new URL(typeof url === 'string' ? url : url.href || url.url || String(url));
    if (u.host === 'au3j0y-hq.myshopify.com' && u.pathname.endsWith('/oauth/access_token')) { log({ t: 'oauth' }); return json({ access_token: 'attrappe' }); }
    if (u.host === 'au3j0y-hq.myshopify.com' && u.pathname.endsWith('/graphql.json')) {
      const { query: q, variables: v } = JSON.parse(opt.body);
      const s = lade();
      if (q.includes('myshopifyDomain')) return json({ data: { shop: { myshopifyDomain: 'au3j0y-hq.myshopify.com', currencyCode: 'CHF', primaryDomain: { host: 'luxestyle.ch', url: 'https://luxestyle.ch' } } } });
      if (q.includes('productUpdate')) {
        const p = s.products[v.p.id];
        log({ t: 'WRITE', id: v.p.id, handle: p?.handle, bytes: v.p.descriptionHtml.length });
        if (env('FAIL_UPDATE') && p.handle === env('FAIL_UPDATE')) return json({ data: { productUpdate: { product: null, userErrors: [{ field: ['descriptionHtml'], message: 'abgelehnt' }] } } });
        if (env('THROW_UPDATE') && p.handle === env('THROW_UPDATE')) throw new Error('Netz weg');
        p.descriptionHtml = v.p.descriptionHtml + (env('READBACK_WRONG') && p.handle === env('READBACK_WRONG') ? '\n' : '');
        p.updatedAt = new Date().toISOString(); s.writes = (s.writes || 0) + 1; speichere(s);
        if (env('EXIT_AFTER_WRITE') && p.handle === env('EXIT_AFTER_WRITE')) process.exit(9);   // geschrieben, aber der Lauf kommt nie zum Ledger
        return json({ data: { productUpdate: { product: { id: p.id, handle: p.handle, updatedAt: p.updatedAt, descriptionHtml: p.descriptionHtml }, userErrors: [] } } });
      }
      if (q.includes('product(id:$id)')) {
        const p = s.products[v.id];
        if (!p || (env('MISSING') && p.handle === env('MISSING'))) return json({ data: { product: null } });
        p.reads = (p.reads || 0) + 1;
        if (env('DRIFT_SECOND_READ') && p.handle === env('DRIFT_SECOND_READ') && p.reads === 2) { p.descriptionHtml += '<!-- fremd -->'; log({ t: 'DRIFT', handle: p.handle }); }
        if (env('DRAFT_SECOND_READ') && p.handle === env('DRAFT_SECOND_READ') && p.reads === 2) { p.status = 'DRAFT'; log({ t: 'DRAFT', handle: p.handle }); }
        speichere(s);
        log({ t: 'READ', id: v.id, handle: p.handle });
        return json({ data: { product: { id: p.id, handle: p.handle, title: p.title, status: p.status, updatedAt: p.updatedAt, tags: [], onlineStoreUrl: p.onlineStoreUrl, descriptionHtml: p.descriptionHtml, variants: { pageInfo: { hasNextPage: false }, nodes: p.variants.map((x) => ({ id: `gid://shopify/ProductVariant/${x}`, sku: 's', availableForSale: true, inventoryPolicy: 'CONTINUE', inventoryItem: { tracked: false } })) } } } });
      }
      throw new Error(`Attrappe kennt die Abfrage nicht: ${q.slice(0, 80)}`);
    }
    if (u.host === 'luxestyle.ch' && u.pathname.startsWith('/products/')) {
      const h = decodeURIComponent(u.pathname.slice('/products/'.length));
      const s = lade(); const p = Object.values(s.products).find((x) => x.handle === h);
      if (p) { p.storefront = (p.storefront || 0) + 1; speichere(s); }
      const schlecht = (env('BAD_CANONICAL') && h === env('BAD_CANONICAL')) || (env('BAD_CANONICAL_SPAETER') && h === env('BAD_CANONICAL_SPAETER') && p?.storefront >= 2);
      const kanon = schlecht ? 'anderes-produkt' : encodeURI(h);
      log({ t: 'STOREFRONT', handle: h });
      return new Response(`<html><head><link rel="canonical" href="https://luxestyle.ch/products/${kanon}"></head></html>`, { status: 200 });
    }
    if (u.host === 'abannews.com' && u.pathname.startsWith('/pod/v6/')) {
      const rel = u.pathname.slice('/pod/v6/'.length);
      const pf = join(ROOT, 'pod/v6', rel);
      if (!existsSync(pf)) return new Response('nicht da', { status: 404 });
      const editor = rel.startsWith('lspod-designer-v6-');
      log({ t: 'ASSET', rel });
      let body = readFileSync(pf);
      if (env('EDITOR_TAMPER') && rel === 'lspod-designer-v6-6.4.0.js') body = Buffer.concat([body, Buffer.from('//x')]);
      if (env('PRED_TAMPER') && rel === 'lspod-designer-v6-6.3.0.js') body = Buffer.concat([body, Buffer.from('//x')]);
      if (env('EDITOR_NOCORS') && rel === 'lspod-designer-v6-6.4.0.js') return new Response(body, { status: 200, headers: { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=31536000, immutable' } });
      return new Response(body, { status: 200, headers: { 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin', 'content-type': editor ? 'application/javascript' : 'application/json', 'cache-control': editor ? 'public, max-age=31536000, immutable' : 'public, max-age=86400, must-revalidate' } });
    }
    log({ t: 'UNBEKANNT', url: u.href });
    throw new Error(`Attrappe: unbekannte URL ${u.href}`);
  };
}
