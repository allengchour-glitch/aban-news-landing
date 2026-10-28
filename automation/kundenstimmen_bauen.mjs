#!/usr/bin/env node
/**
 * Kundenstimmen der Startseite bauen: je Produkt EINE echte Judge.me-Bewertung, in das Shop-Metafeld `lux.kundenstimmen` (json).
 * Die Auswahlregeln stehen in lib/kundenstimmen.mjs (getestet). Der Theme-Abschnitt `lux_kundenstimmen` liest das Metafeld, mischt bei jedem
 * Seitenaufruf neu (md5 mit Zeitstempel) und zeigt höchstens ein Produkt je Karte; fehlt das Metafeld, zeigt er wie bisher das Judge.me-Karussell.
 *
 * TROCKENLAUF IST VORGABE. LIVE=1 schreibt das Metafeld und liest es danach frisch zurück (Abweichung = Exit 3).
 * Aufruf:  node automation/kundenstimmen_bauen.mjs                 (Trockenlauf: Auswahl + Zahlen)
 *          LIVE=1 node automation/kundenstimmen_bauen.mjs
 * Umgebung: SEITEN=60 (je 100 Bewertungen, neueste zuerst) · MAX=24 · PRO_TYP=3 · JUDGEME_PRIVATE_TOKEN, JUDGEME_SHOP_DOMAIN, SHOPIFY_*
 * Wiederholen, wenn neue Bewertungen dazukommen (die Auswahl ist ein Schnappschuss, kein Abo).
 */
import { writeFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { waehle, bewertungOk, textAblehnung } from './lib/kundenstimmen.mjs';

const LIVE = process.env.LIVE === '1';
const SEITEN = Math.max(1, Number(process.env.SEITEN || 60));
const MAX = Math.max(6, Number(process.env.MAX || 24));
const PRO_TYP = Math.max(1, Number(process.env.PRO_TYP || 3));
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, DOMAIN = process.env.JUDGEME_SHOP_DOMAIN || SHOP, TOKEN = process.env.JUDGEME_PRIVATE_TOKEN;
  if (!TOKEN) throw new Error('JUDGEME_PRIVATE_TOKEN fehlt');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) throw new Error('Kein Shopify-Token');
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  const reviews = []; let leer = 0;
  for (let seite = 1; seite <= SEITEN; seite++) {
    let d = null;
    for (let v = 0; v < 4 && !d; v++) {
      const res = await fetch(`https://judge.me/api/v1/reviews?shop_domain=${encodeURIComponent(DOMAIN)}&api_token=${encodeURIComponent(TOKEN)}&per_page=100&page=${seite}`);
      if (res.status === 429 || res.status >= 500) { await schlaf(4000 * (v + 1)); continue; }
      if (!res.ok) throw new Error(`Judge.me HTTP ${res.status} (Seite ${seite})`);
      d = await res.json();
    }
    if (!d) throw new Error(`Judge.me Seite ${seite} nicht lesbar`);
    const l = d.reviews || []; if (!l.length) { leer++; break; }
    reviews.push(...l); await schlaf(250);
  }
  const ok = reviews.filter(bewertungOk);
  const abgelehnt = {}; for (const x of reviews.filter(x => x.rating === 5 && x.published && !x.hidden && Number(x.product_external_id) > 0)) { const g = textAblehnung(x.body); if (g) abgelehnt[g] = (abgelehnt[g] || 0) + 1; }
  console.log(JSON.stringify({ gelesen: reviews.length, seiten: SEITEN, brauchbar: ok.length, verschiedeneProdukte: new Set(ok.map(x => x.product_external_id)).size, abgelehntNachGrund: abgelehnt }));

  // Produkte frisch aus Shopify (aktiv, Bild, Art)
  const ids = [...new Set(ok.map(x => String(x.product_external_id)))];
  const produkte = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const d = await q(`query($ids:[ID!]!){ nodes(ids:$ids){ ... on Product { id handle title status productType featuredMedia { preview { image { url } } } } } }`, { ids: ids.slice(i, i + 100).map(x => `gid://shopify/Product/${x}`) });
    for (const n of d.nodes || []) if (n && n.id) produkte.set(n.id.split('/').pop(), { handle: n.handle, title: n.title, type: n.productType, aktiv: n.status === 'ACTIVE', bild: n.featuredMedia?.preview?.image?.url ? n.featuredMedia.preview.image.url + (n.featuredMedia.preview.image.url.includes('?') ? '&' : '?') + 'width=240' : '' });
    await schlaf(300);
  }
  const pool = waehle(reviews, produkte, { max: MAX, proTyp: PRO_TYP });
  const arten = pool.reduce((a, p) => { const t = produkte.get([...produkte].find(([, v]) => v.handle === p.h)?.[0])?.type || '?'; a[t] = (a[t] || 0) + 1; return a; }, {});
  writeFileSync('/tmp/kundenstimmen_pool.json', JSON.stringify(pool, null, 1));
  console.log(`Auswahl: ${pool.length} Karten (je Produkt eine) · Arten: ${JSON.stringify(arten)} · Datei /tmp/kundenstimmen_pool.json`);
  for (const p of pool) console.log(`  ${p.h.slice(0, 44).padEnd(44)} | ${String(p.n || '-').padEnd(6)} | ${p.b.slice(0, 70)}`);
  if (pool.length < 8) throw new Error(`Nur ${pool.length} Karten: zu wenig für ein abwechslungsreiches Karussell — nichts geschrieben`);
  if (!LIVE) { console.log('Trockenlauf — nichts geschrieben. LIVE=1 zum Schreiben.'); return; }

  const shopId = (await q(`{ shop { id } }`)).shop.id;
  const w = (await q(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ id } userErrors{ field message code } } }`,
    { m: [{ ownerId: shopId, namespace: 'lux', key: 'kundenstimmen', type: 'json', value: JSON.stringify(pool) }] })).metafieldsSet;
  if (w.userErrors?.length) throw new Error('metafieldsSet ' + JSON.stringify(w.userErrors));
  const zurueck = (await q(`{ shop { metafield(namespace:"lux", key:"kundenstimmen"){ value } } }`)).shop.metafield?.value;
  if (zurueck !== JSON.stringify(pool)) { console.error('ABWEICHUNG beim Zurücklesen'); process.exit(3); }
  console.log(`OK: ${pool.length} Kundenstimmen in shop.metafields.lux.kundenstimmen geschrieben und frisch zurückgelesen.`);
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
