#!/usr/bin/env node
/* LuxeStyle — gezielte SEO-Vorschläge, standardmässig ohne Shop-Schreibzugriff.
 * PRODUCT_IDS: 1–6 explizite numerische Produkt-IDs oder Product-GIDs, kommagetrennt.
 * SCAN_LIMIT: unabhängiges Lesebudget (1–6, Standard 6); LIMIT: Vorschläge (1–6, Standard 6).
 * DRY_RUN=1 erzwingt Review. APPLY_SEO_APPROVED=1 ist erst nach konkreter Freigabe zulässig.
 * Keine Telegram-Nachrichten. Kein Cron wird durch dieses Modul angelegt oder gestartet.
 */
import { pathToFileURL } from 'node:url';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';
import { seoTitel, titelNormalisieren, kuerzen, MAX_BESCHREIBUNG } from './lib/seo_titel.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';

export const API_VERSION = '2026-10';
export const EXPECTED_SHOP = 'au3j0y-hq.myshopify.com';
export const READ = `query SeoTargeted($ids:[ID!]!){
  shop { name myshopifyDomain currencyCode primaryDomain { host } }
  nodes(ids:$ids) { ... on Product {
    id title status seo { title description }
    media(first:3) { nodes { status } pageInfo { hasNextPage endCursor } }
  } }
}`;
export const UPDATE = `mutation SeoMissingFields($product:ProductUpdateInput!){
  productUpdate(product:$product){ product { id } userErrors { field message } }
}`;

function budget(raw, name) {
  if (!/^[1-6]$/.test(String(raw))) throw new Error(`${name}: ganze Zahl 1–6 erforderlich`);
  return Number(raw);
}

export function configuration(env = process.env) {
  const raw = String(env.PRODUCT_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!raw.length || raw.length > 6) throw new Error('PRODUCT_IDS: 1–6 explizite Produkt-IDs erforderlich; kein Katalogscan');
  const ids = raw.map(id => {
    if (/^[1-9][0-9]*$/.test(id)) return `gid://shopify/Product/${id}`;
    if (/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(id)) return id;
    throw new Error('PRODUCT_IDS: ungültige Product-ID');
  });
  if (new Set(ids).size !== ids.length) throw new Error('PRODUCT_IDS: doppelte Produkt-ID');
  const shop = normalizeShopifyHost(env.SHOPIFY_SHOP || '');
  if (shop !== EXPECTED_SHOP) throw new Error('SHOP_IDENTITY: nur der bestätigte LuxeStyle-Admin-Host ist zulässig');
  const scanLimit = budget(env.SCAN_LIMIT ?? '6', 'SCAN_LIMIT');
  const limit = budget(env.LIMIT ?? '6', 'LIMIT');
  return { shop, ids: ids.slice(0, scanLimit), requestedIds: ids, scanLimit, limit,
    mode: env.APPLY_SEO_APPROVED === '1' && env.DRY_RUN !== '1' ? 'apply' : 'review' };
}

function identity(shop) {
  return shop?.name === 'LuxeStyle' && shop?.myshopifyDomain === EXPECTED_SHOP
    && shop?.primaryDomain?.host === 'luxestyle.ch' && shop?.currencyCode === 'CHF';
}

function seoSnapshot(product) {
  if (!product?.seo || !['title', 'description'].every(key =>
    Object.hasOwn(product.seo, key) && (product.seo[key] === null || typeof product.seo[key] === 'string'))) {
    throw new Error('SEO_UNKNOWN: SEO-Felder fehlen oder sind ungültig');
  }
  return { title: product.seo.title, description: product.seo.description };
}
const empty = value => value === null || value.trim() === '';

export function suggestion(product) {
  const before = seoSnapshot(product);
  if (typeof product.title !== 'string' || !product.title.trim()) throw new Error('TITLE_UNKNOWN: kein gültiger Produkttitel');
  const generated = {
    title: seoTitel(product.title).title,
    // Historische Werbebausteine des Titelhelfers werden hier bewusst nicht übernommen.
    description: kuerzen(`${titelNormalisieren(product.title)} bei LuxeStyle entdecken. Produktinformationen direkt im Shop ansehen.`, MAX_BESCHREIBUNG)
  };
  const patch = {};
  for (const key of ['title', 'description']) if (empty(before[key])) patch[key] = generated[key];
  return { before, patch, after: { ...before, ...patch } };
}

export function mediaSample(product) {
  const conn = product?.media;
  if (!Array.isArray(conn?.nodes) || typeof conn?.pageInfo?.hasNextPage !== 'boolean'
      || conn.nodes.length > 3) return { state: 'unknown', sampled: null, complete: null };
  const states = conn.nodes.map(item => item?.status);
  const known = ['READY', 'FAILED', 'PROCESSING', 'UPLOADED'];
  if (states.some(state => !known.includes(state))) return { state: 'unknown', sampled: states.length, complete: !conn.pageInfo.hasNextPage };
  return { state: states.includes('FAILED') ? 'failed_in_sample'
    : states.some(state => state !== 'READY') ? 'processing_in_sample'
    : states.length ? 'ready_in_sample' : 'no_media_returned',
    sampled: states.length, complete: !conn.pageInfo.hasNextPage };
}

async function readProducts(gql, ids) {
  const data = await gql(READ, { ids }, { mutation: false });
  if (!data || data.errors?.length || !identity(data.shop) || !Array.isArray(data.nodes)
      || data.nodes.length !== ids.length) throw new Error('READ_UNKNOWN: Shop-Identität oder Produktantwort nicht bestätigt');
  for (let i = 0; i < ids.length; i++) {
    // Null bleibt unbekannt/nicht zugreifbar, statt als erfundener 404 interpretiert zu werden.
    if (data.nodes[i] !== null && data.nodes[i]?.id !== ids[i]) throw new Error('READ_UNKNOWN: abweichende Produktzuordnung');
  }
  return data.nodes;
}

/** Injectable GraphQL transport returns data directly, matching the existing shopifyGql helper. */
export async function runOptimizer(config, { gql }) {
  const report = { mode: config.mode, state: 'complete', requested: config.requestedIds.length,
    scanBudget: config.scanLimit, proposalLimit: config.limit, scanned: 0, proposed: 0,
    updated: 0, mutationAttempts: 0, unknown: [], products: [],
    mediaScope: 'Stichprobe: höchstens drei Medien je explizit gewähltem Produkt; kein Katalogaudit.' };
  let products;
  try { products = await readProducts(gql, config.ids); }
  catch (error) { report.state = 'unknown'; report.scanned = null; report.proposed = null; report.updated = null;
    report.unknown.push({ phase: 'initial_read', reason: error.message }); return report; }
  for (let index = 0; index < products.length; index++) {
    const product = products[index], id = config.ids[index];
    report.scanned++;
    const entry = { id, state: 'unchanged', media: mediaSample(product) };
    report.products.push(entry);
    if (!product) { entry.state = 'unknown'; report.unknown.push({ id, phase: 'product_read', reason: 'Produkt nicht bestätigt' }); continue; }
    if (product.status !== 'ACTIVE') {
      entry.state = typeof product.status === 'string' && ['DRAFT', 'ARCHIVED', 'UNLISTED'].includes(product.status) ? 'skipped_inactive' : 'unknown';
      if (entry.state === 'unknown') report.unknown.push({ id, phase: 'product_read', reason: 'Produktstatus unbekannt' });
      continue;
    }
    let change;
    try { change = suggestion(product); }
    catch (error) { entry.state = 'unknown'; report.unknown.push({ id, phase: 'suggestion', reason: error.message }); continue; }
    if (!Object.keys(change.patch).length) continue;
    if (report.proposed >= config.limit) { entry.state = 'proposal_limit'; continue; }
    Object.assign(entry, change, { state: 'proposed' });
    report.proposed++;
    if (config.mode !== 'apply') continue;
    // Jeder konkrete Write erhält eine aktuelle Identitäts-/Status-/Feld-Gegenprobe.
    // Änderung zwischen Review-Lesen und Write: stoppen, statt ein anderes Feld zu überschreiben.
    let fresh;
    try {
      [fresh] = await readProducts(gql, [id]);
      if (!fresh || fresh.status !== 'ACTIVE' || fresh.title !== product.title
          || JSON.stringify(seoSnapshot(fresh)) !== JSON.stringify(change.before)) throw new Error('PRECONDITION_CHANGED: neuer Review erforderlich');
    } catch (error) { entry.state = 'blocked'; report.unknown.push({ id, phase: 'pre_write', reason: error.message }); continue; }
    try {
      report.mutationAttempts++;
      // Nur fehlende Felder senden: ein bestehender Wert gehört niemals in die Mutation.
      const result = await gql(UPDATE, { product: { id, seo: change.patch } }, { mutation: true });
      const payload = result?.productUpdate;
      if (Array.isArray(payload?.userErrors) && payload.userErrors.length) {
        entry.state = 'rejected'; entry.errors = payload.userErrors; continue;
      }
      if (result?.errors?.length || !Array.isArray(payload?.userErrors) || payload.product?.id !== id) {
        throw new Error('MUTATION_UNKNOWN: keine vollständige Erfolgsantwort mit passender Produkt-ID');
      }
      const [confirmed] = await readProducts(gql, [id]);
      if (!confirmed || confirmed.status !== 'ACTIVE' || JSON.stringify(seoSnapshot(confirmed)) !== JSON.stringify(change.after)) {
        throw new Error('READBACK_UNKNOWN: SEO-Gegenprobe bestätigt die Änderung nicht');
      }
      entry.state = 'confirmed_updated'; report.updated++;
    } catch (error) {
      entry.state = 'unknown'; report.unknown.push({ id, phase: 'mutation_or_readback', reason: error.message });
      // Unklarer Write kann erfolgt sein. Kein Retry und keine weiteren Writes in diesem Lauf.
      break;
    }
  }
  if (report.unknown.length) report.state = 'partial_unknown';
  else if (report.products.some(entry => entry.state === 'rejected')) report.state = 'partial_rejected';
  return report;
}

export async function cli(env = process.env, { fetchFn = fetch, output = console.log } = {}) {
  let config;
  try { config = configuration(env); }
  catch (error) { output(JSON.stringify({ state: 'blocked', reason: error.message })); return 1; }
  const clientId = env.SHOPIFY_CLIENT_ID || '', clientSecret = shopifyClientSecret(env.SHOPIFY_CLIENT_SECRET);
  let token = env.SHOPIFY_ADMIN_TOKEN || '';
  if (!token && !(clientId && clientSecret)) {
    output(JSON.stringify({ state: 'unknown', reason: 'Keine Shopify-Credentials; keine Produktprüfung erfolgt.' })); return 1;
  }
  // Host ist bereits strikt geprüft. Redirects dürfen keine Credentials weiterreichen.
  const safeFetch = (url, options = {}) => fetchFn(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (clientId && clientSecret) {
    try {
      const response = await safeFetch(`https://${config.shop}/admin/oauth/access_token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (typeof json.access_token !== 'string' || !json.access_token) throw new Error('Token fehlt');
      token = json.access_token;
    } catch (error) { output(JSON.stringify({ state: 'unknown', phase: 'auth', reason: error.message })); return 1; }
  }
  const gql = (query, variables, { mutation }) => shopifyGql(config.shop, API_VERSION, token, query, variables, {
    fetch: safeFetch, versuche: mutation ? 1 : 2
  });
  const report = await runOptimizer(config, { gql });
  output(JSON.stringify(report, null, 2));
  return report.state === 'complete' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await cli();
