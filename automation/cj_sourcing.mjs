#!/usr/bin/env node
/**
 * Lieferantensuche bei CJ für gesperrte Ware — der Gegenzug zum Lieferbarkeits-Wächter.
 *
 * WARUM: `automation/lieferbarkeit_guard.mjs` findet Produkte, die CJ nicht in die Schweiz
 * liefert, und setzt sie auf DRAFT. Damit ist der Schaden abgewendet, aber die Ware bleibt
 * weg. `product/sourcing/create` ist der nächste Schritt: CJ sucht einen Lieferanten für ein
 * benanntes Produkt. Seit dem Prime-Abo (23.10.2026) sind das 25 Anfragen am Tag statt 5.
 *
 * WAS ANGEFRAGT WIRD, ENTSCHEIDET `automation/lib/sourcing_kandidaten.mjs`, nicht dieser Lauf.
 * Dort steht auch, warum das zweimal gekaufte Taschenmesser trotzdem keine Anfrage bekommt.
 *
 * DER TROCKENLAUF IST VORGABE. Eine Anfrage geht an einen Menschen bei CJs Einkauf und lässt
 * sich nicht zurücknehmen — darum zeigt der Lauf ohne LIVE=1 nur, was er senden würde.
 *
 * Schalter:
 *   PQUERY    Shopify-Suche (Vorgabe: Entwürfe mit Sperrgrund)
 *   SCAN      wie viele Produkte gelesen werden (Deckel 250)
 *   MAX       wie viele Anfragen höchstens gesendet werden (Vorgabe 5, Deckel 25 = Prime)
 *   HANDLES   Komma-Liste statt Suche
 *   BESUCHT=1 nimmt die meistbesuchten Produktseiten der letzten 90 Tage als Vorrat statt der
 *             Shopify-Suche. DAS IST DAS BESSERE KRITERIUM: gemessen am 24.10.2026 ist die
 *             vierthäufigste Seite des ganzen Shops (`rizinusol-wickel-set-mit-bio-ol-323457`,
 *             64 von 2619 Sitzungen) ein gesperrter Entwurf. Die Marge allein füllte das
 *             Tagesbudget mit 300-Franken-Koffern, die nie jemand aufgerufen hat.
 *   AEHNLICH  0 schaltet `acceptSimilar` aus (Vorgabe 1: ein ähnliches Produkt ist brauchbar)
 *   STATUS=1  fragt nur den Stand der bisherigen Anfragen ab (kein Senden)
 *   LIVE=1    sendet wirklich
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { auswahl, sourcingUrteil } from './lib/sourcing_kandidaten.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const SHOP = process.env.SHOPIFY_SHOP || '', TOK_ST = process.env.SHOPIFY_ADMIN_TOKEN || '',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  API = '2025-01', LIVE = process.env.LIVE === '1', STATUS = process.env.STATUS === '1',
  SCAN = Math.min(parseInt(process.env.SCAN || '100', 10), 250),
  MAX = Math.min(parseInt(process.env.MAX || '5', 10), 25),
  AEHNLICH = process.env.AEHNLICH === '0' ? 0 : 1,
  BESUCHT = process.env.BESUCHT === '1',
  TAGE = parseInt(process.env.TAGE || '90', 10),
  HANDLES = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean),
  PQUERY = process.env.PQUERY || 'status:draft AND (tag:cj-nicht-versendbar-ch OR tag:nicht-lieferbar-ch OR tag:ausverkauft-lieferant OR tag:cj-entfernt)',
  LEDGER = 'dropship/cj_sourcing_ledger.txt',
  CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1',
  CJ_EMAIL = process.env.CJ_EMAIL || '', CJ_KEY = process.env.CJ_API_KEY || '';

const schlaf = ms => new Promise(r => setTimeout(r, ms));
const gql = (t, q, v) => shopifyGql(SHOP, API, t, q, v);

async function shopToken() {
  if (TOK_ST) return TOK_ST;
  if (!SHOP || !CID || !CS) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }),
  });
  const t = await r.text();
  if (!r.ok) { console.error(`Shopify-Token: HTTP ${r.status} — ${t.slice(0, 200)}`); return ''; }
  return JSON.parse(t).access_token || '';
}

async function ledgerLesen() {
  try { return (await readFile(LEDGER, 'utf8')).split('\n').filter(Boolean); } catch { return []; }
}

/** Produkte, für die schon einmal bezahlt und dann erstattet wurde — die stärkste Nachfrage. */
async function bezahlteAusfaelle(tok) {
  const q = `query{orders(first:40,query:"financial_status:refunded OR financial_status:partially_refunded",sortKey:CREATED_AT,reverse:true){nodes{name lineItems(first:5){nodes{product{handle}}}}}}`;
  try {
    const d = await gql(tok, q, {});
    const m = new Map();
    for (const o of d?.orders?.nodes || [])
      for (const li of o.lineItems?.nodes || [])
        if (li.product?.handle) m.set(li.product.handle, o.name);
    return m;
  } catch (e) { console.error('Bestellungen nicht lesbar:', e.message); return new Map(); }
}

/**
 * Die meistbesuchten Produktseiten als Handle→Sitzungen-Karte.
 *
 * Gelesen wird ShopifyQL über die Admin-API. Lässt sich die Abfrage nicht lesen, wird NICHT
 * geraten: der Lauf sagt es und fällt auf die normale Suche zurück.
 */
async function besuchteSeiten(tok) {
  const q = `FROM sessions SHOW sessions GROUP BY landing_page_path SINCE -${TAGE}d UNTIL today ORDER BY sessions DESC LIMIT 250`;
  const d = await gql(tok, `query($q:String!){shopifyqlQuery(query:$q){tableData{rows columns{name}} parseErrors}}`, { q });
  const r = d?.shopifyqlQuery;
  const fehler = r?.parseErrors || [];
  if (fehler.length) { console.error('ShopifyQL:', fehler.join('; ')); return new Map(); }
  const zeilen = r?.tableData?.rows || [];
  const m = new Map();
  // Die Zeilen kommen als Objekte, nicht als Felder-Listen: {landing_page_path, sessions}.
  for (const z of zeilen) {
    const pfad = z?.landing_page_path, sitzungen = z?.sessions;
    const t = String(pfad || '').match(/^\/products\/([^?#]+)/);
    if (t) m.set(decodeURIComponent(t[1]), Number(sitzungen) || 0);
  }
  return m;
}

async function produkte(tok, besucht) {
  const liste = HANDLES.length ? HANDLES : (besucht ? [...besucht.keys()] : []);
  if (liste.length) {
    const out = [];
    for (const h of liste) {
      const d = await gql(tok, `query($h:String!){products(first:1,query:$h){nodes{handle title tags status featuredMedia{preview{image{url}}} variants(first:1){nodes{sku price inventoryItem{unitCost{amount}}}}}}}`, { h: `handle:${h}` });
      const n = d?.products?.nodes?.[0]; if (n) out.push(n);
    }
    return out;
  }
  const out = []; let after = null;
  while (out.length < SCAN) {
    const d = await gql(tok, `query($q:String!,$n:Int!,$a:String){products(first:$n,query:$q,after:$a,sortKey:UPDATED_AT,reverse:true){pageInfo{hasNextPage endCursor}nodes{handle title tags status featuredMedia{preview{image{url}}} variants(first:1){nodes{sku price inventoryItem{unitCost{amount}}}}}}}`,
      { q: PQUERY, n: Math.min(50, SCAN - out.length), a: after });
    const p = d?.products; if (!p) break;
    out.push(...p.nodes);
    if (!p.pageInfo.hasNextPage) break;
    after = p.pageInfo.endCursor;
  }
  return out;
}

async function standAbfragen(cjt, ids) {
  if (!ids.length) { console.log('Ledger leer — keine Anfragen zum Nachfragen.'); return; }
  const frage = ids.slice(0, 100).map(i => `sourceIds=${encodeURIComponent(i)}`).join('&');
  const r = await cjFetch(`${CJ_BASE}/product/sourcing/queryList?${frage}`, {
    context: 'Stand', headers: { 'CJ-Access-Token': cjt },
  });
  for (const s of r?.data || [])
    console.log(`  ${s.sourceId}  ${s.sourceStatusStr || s.sourceStatus}` +
      (s.cjProductId ? `  → CJ-Produkt ${s.cjProductId} (${s.cjVariantSku || '?'})` : '') +
      (s.failReasonStr ? `  Grund: ${s.failReasonStr}` : ''));
  const fehlend = ids.length - (r?.data?.length || 0);
  if (fehlend > 0) console.log(`  ${fehlend} Kennung(en) kennt CJ nicht (mehr).`);
}

(async () => {
  const tok = await shopToken();
  if (!tok) { console.error('Kein Shopify-Token (Status, Antworttext siehe oben). Abbruch.'); process.exit(1); }
  const cjt = await cjToken();
  if (!cjt) { console.error('Kein CJ-Token: CJ_EMAIL/CJ_API_KEY fehlen oder CJ lehnt ab. Abbruch.'); process.exit(1); }

  const zeilen = await ledgerLesen();
  const schonGefragt = new Set(zeilen.map(z => z.split('·')[0]?.trim()).filter(Boolean));

  if (STATUS) {
    console.log(`Stand der ${zeilen.length} bisherigen Anfragen:`);
    await standAbfragen(cjt, zeilen.map(z => z.split('·')[2]?.trim()).filter(Boolean));
    return;
  }

  const bezahlt = await bezahlteAusfaelle(tok);
  let besucht = null;
  if (BESUCHT && !HANDLES.length) {
    besucht = await besuchteSeiten(tok);
    if (!besucht.size) { console.error('Keine Besuchsdaten lesbar — zurück zur normalen Suche.'); besucht = null; }
    else console.log(`Besuchs-Vorrat: ${besucht.size} Produktseiten aus ${TAGE} Tagen.`);
  }
  const rohe = await produkte(tok, besucht);
  const kandidaten = rohe.filter(p => !schonGefragt.has(p.handle)).map(p => ({
    handle: p.handle, titel: p.title, tags: p.tags,
    bild: p.featuredMedia?.preview?.image?.url || null,
    preis: p.variants?.nodes?.[0]?.price, ek: p.variants?.nodes?.[0]?.inventoryItem?.unitCost?.amount,
    sku: p.variants?.nodes?.[0]?.sku || '',
    bestellt: bezahlt.has(p.handle), bestellung: bezahlt.get(p.handle) || null,
    sitzungen: besucht ? (besucht.get(p.handle) || 0) : null,
  }));

  const gruende = {};
  for (const p of kandidaten) { const u = sourcingUrteil(p); gruende[u.grund] = (gruende[u.grund] || 0) + 1; }
  const entscheid = kandidaten.map(p => ({ p, u: sourcingUrteil(p) })).filter(x => x.u.nurMitEntscheid);
  const gewaehlt = auswahl(kandidaten, MAX);

  console.log(`\ngelesen ${rohe.length}, davon neu ${kandidaten.length}, schon gefragt ${schonGefragt.size}`);
  console.log('Gründe:', JSON.stringify(gruende));
  if (entscheid.length) {
    console.log(`\nBRAUCHT EINEN ENTSCHEID (keine Anfrage gesendet), ${entscheid.length}:`);
    for (const x of entscheid.slice(0, 15)) console.log(`  [${x.u.grund}] ${x.p.titel} (${x.p.handle})`);
  }
  console.log(`\n${LIVE ? 'SENDE' : 'TROCKENLAUF — würde senden'} ${gewaehlt.length} von höchstens ${MAX}:`);

  const neu = [];
  for (const { p, u } of gewaehlt) {
    const zeile = `  [${u.grund}${p.bestellung ? ' ' + p.bestellung : ''}] ${p.titel} — ${p.preis} / EK ${p.ek ?? '?'}${Number.isFinite(p.sitzungen) ? ` / ${p.sitzungen} Sitzungen` : ''}`;
    if (!LIVE) { console.log(zeile); continue; }
    const body = {
      productName: String(p.titel).slice(0, 200),
      productImage: String(p.bild).slice(0, 200),
      productUrl: `https://luxestyle.ch/products/${p.handle}`.slice(0, 200),
      thirdProductSku: String(p.sku).slice(0, 200),
      remark: `Versand in die Schweiz nötig. Grund: ${u.grund}.`.slice(0, 200),
      acceptSimilar: AEHNLICH,
    };
    if (Number.isFinite(Number(p.preis))) body.price = Number(p.preis);
    try {
      const r = await cjFetch(`${CJ_BASE}/product/sourcing/create`, {
        context: `Sourcing ${p.handle}`, headers: { 'CJ-Access-Token': cjt, 'Content-Type': 'application/json' },
        init: { method: 'POST', body: JSON.stringify(body) },
      });
      const id = r?.data?.cjSourcingId || '';
      console.log(`${zeile}  → ${id || 'ohne Kennung'} ${r?.data?.result || ''}`);
      neu.push(`${p.handle} · ${new Date().toISOString().slice(0, 10)} · ${id} · ${u.grund}`);
    } catch (e) {
      console.log(`${zeile}  → FEHLER ${e.message}`);
      if (/CJ_QUOTA|CJ_THROTTLED/.test(e.message)) { console.log('  Punkte/Drosselung — Lauf beendet.'); break; }
    }
    await schlaf(1200);
  }
  if (neu.length) {
    await writeFile(LEDGER, [...zeilen, ...neu].join('\n') + '\n');
    console.log(`\n${neu.length} Anfrage(n) im Ledger ${LEDGER} vermerkt. Stand später: STATUS=1`);
  }
})().catch(e => { console.error('Abbruch:', e.message); process.exit(1); });
