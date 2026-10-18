#!/usr/bin/env node
/**
 * titel_deutsch_fix.mjs — bringt maschinenübersetzte Produkttitel in richtiges Deutsch.
 *
 * Begründung, Muster und Tests: automation/lib/titel_deutsch.mjs
 * Der SEO-Titel wird mitgezogen, aber NUR wenn er aus dem alten Produkttitel gebaut war —
 * ein von Hand geschriebener SEO-Titel bleibt unangetastet.
 *
 * Trockenlauf ist die Vorgabe. LIVE=1 schreibt.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 *      SUCHEN (Titel-Suchwörter, Vorgabe „Mannlich*,Weiblich*,fuer") · MAXFIX (Vorgabe 100)
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { titelDeutsch, brauchtKorrektur } from './lib/titel_deutsch.mjs';
import { seoTitel } from './lib/seo_titel.mjs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const LIVE = process.env.LIVE === '1';
const MAXFIX = Math.min(parseInt(process.env.MAXFIX || '100', 10), 500);
const SUCHEN = (process.env.SUCHEN || 'Mannlich*,Weiblich*,fuer').split(',').map((s) => s.trim()).filter(Boolean);
const API = '2025-01';

async function token() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, sec = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!SHOP || !id || !sec) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  const t = await r.text();
  if (!r.ok) { console.log(`no-op: Token-Abruf HTTP ${r.status} · ${t.slice(0, 120)} (${t.length} Zeichen)`); return ''; }
  try { return JSON.parse(t).access_token || ''; } catch { return ''; }
}

const TOKEN = await token();
if (!TOKEN) { console.log('no-op: kein Shopify-Token — Grund steht oben.'); process.exit(0); }
const gql = (q, v) => shopifyGql(SHOP, API, TOKEN, q, v);

const gefunden = new Map();
for (const s of SUCHEN) {
  const d = await gql(`query($q:String!){ products(first:100, query:$q){ nodes{ id handle title seo{ title description } } } }`,
    { q: `status:active AND title:${s}` });
  for (const p of d.products.nodes) if (brauchtKorrektur(p.title)) gefunden.set(p.id, p);
}

const plan = [...gefunden.values()].map((p) => {
  const neu = titelDeutsch(p.title);
  // Der SEO-Titel wird nur mitgezogen, wenn er aus dem alten Produkttitel stammt.
  const altSeo = seoTitel(p.title).title;
  const seoZiehen = !p.seo?.title || p.seo.title === altSeo || p.seo.title === p.title;
  return { ...p, neu, seoZiehen, neuSeo: seoTitel(neu) };
});

console.log(`${plan.length} aktive Produkte mit maschinenübersetztem Titel (Suche: ${SUCHEN.join(', ')})`);
for (const p of plan.slice(0, 40)) {
  console.log(`  ${p.title}\n   → ${p.neu}${p.seoZiehen ? '' : '   (SEO-Titel von Hand, bleibt)'}`);
}
if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben. Mit LIVE=1 scharf stellen.'); process.exit(0); }

let ok = 0, fehler = 0;
for (const p of plan.slice(0, MAXFIX)) {
  const input = { id: p.id, title: p.neu };
  if (p.seoZiehen) input.seo = p.neuSeo;
  const r = await gql(`mutation($input:ProductInput!){ productUpdate(input:$input){ product{ id } userErrors{ message } } }`, { input });
  const err = r?.productUpdate?.userErrors?.[0]?.message;
  if (err) { fehler++; console.log('Fehler', p.handle, err); } else ok++;
}
console.log(`\n${ok} Titel korrigiert, ${fehler} Fehler.`);
