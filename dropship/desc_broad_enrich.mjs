/**
 * desc_broad_enrich.mjs — Broad thin-description finder + enricher (autonom).
 *
 * Paginiert ACTIVE-Produkte (status:active, sortKey CREATED_AT reverse = newest first,
 * bis ~3000), strippt HTML aus body_html, und bei plain-text < 100 Zeichen wird eine
 * deutsche Beschreibung via Gemini gemini-2.5-flash (thinkingBudget:0) generiert und
 * per productUpdate als descriptionHtml gesetzt.
 *
 * Env: SHOPIFY_SHOP + (SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET | SHOPIFY_ADMIN_TOKEN) + GEMINI_API_KEY
 * Idempotenz-Ledger: /tmp/desc_broad_done.txt   Cap: 200 enriched.
 */
import fs from 'node:fs';

const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN || '';
const GEMINI = process.env.GEMINI_API_KEY || '';
const API = '2025-01';
const LEDGER = '/tmp/desc_broad_done.txt';
const THIN_MAX = 100;
const SCAN_MAX = 3000;
const CAP = 200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function loadLedger() {
  try { return new Set(fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)); }
  catch { return new Set(); }
}
function markDone(id) { fs.appendFileSync(LEDGER, id + '\n'); }

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getToken() {
  if (SHOP && CID && CSECRET) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CID, client_secret: CSECRET, grant_type: 'client_credentials' })
    });
    const j = await r.json();
    if (j.access_token) return j.access_token;
  }
  if (TOK_STATIC) return TOK_STATIC;
  throw new Error('Kein Shopify-Token (Client-Credentials fehlgeschlagen, kein statischer Token).');
}

// Shopify GraphQL mit Retry auf 429 + THROTTLED
async function gql(token, query, variables = {}, tries = 6) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    let r;
    try {
      r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
        body: JSON.stringify({ query, variables })
      });
    } catch (e) {
      await sleep(1500 * attempt); continue;
    }
    if (r.status === 429) { await sleep(2000 * attempt); continue; }
    const j = await r.json().catch(() => null);
    if (!j) { await sleep(1500 * attempt); continue; }
    const throttled = (j.errors || []).some(e => (e.extensions?.code === 'THROTTLED') || /throttl/i.test(e.message || ''));
    if (throttled) { await sleep(2500 * attempt); continue; }
    if (j.errors && j.errors.length) {
      throw new Error('GraphQL errors: ' + JSON.stringify(j.errors).slice(0, 400));
    }
    return j.data;
  }
  throw new Error('GraphQL: zu viele Retries (Throttle).');
}

async function geminiDesc(title, productType, tags, tries = 5) {
  const prompt = `Du bist Produkttexter für den Schweizer Online-Shop LuxeStyle (Deutsch, du-Ansprache).
Schreibe eine ansprechende Produktbeschreibung für dieses Produkt.

Titel: ${title}
${productType ? `Kategorie: ${productType}` : ''}
${tags ? `Tags: ${tags}` : ''}

Anforderungen:
- Deutsch, du-Ansprache, natürlicher Ton.
- Ein kurzer Intro-Satz (1-2 Sätze), dann 3-4 stichhaltige Vorteil-Bullets.
- Erfinde KEINE konkreten Spezifikationen (keine Masse, Materialien, Gewichte, technische Daten, die nicht im Titel stehen). Bleib bei allgemeinen, glaubwürdigen Vorteilen.
- Keine erfundenen Rabatte/Preise/Garantien.
- Antworte NUR mit gültigem HTML: ein <p>-Intro gefolgt von einer <ul> mit <li>-Bullets. Kein Markdown, kein Codeblock.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`;
  for (let attempt = 1; attempt <= tries; attempt++) {
    let r;
    try {
      r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } }
        })
      });
    } catch (e) { await sleep(2000 * attempt); continue; }
    if (r.status === 429 || r.status === 503) { await sleep(4000 * attempt); continue; }
    const j = await r.json().catch(() => null);
    if (!j) { await sleep(2000 * attempt); continue; }
    const txt = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (txt.trim()) {
      let html = txt.trim().replace(/^```html?\s*/i, '').replace(/```\s*$/i, '').trim();
      return html;
    }
    // no text (safety block etc.) -> give up on this item
    return '';
  }
  return null; // signal repeated 429 -> skip
}

const PAGE_Q = `query($cursor:String){
  products(first:100, after:$cursor, query:"status:active", sortKey:CREATED_AT, reverse:true){
    edges{ cursor node{ id title productType tags descriptionHtml } }
    pageInfo{ hasNextPage endCursor }
  }
}`;

const UPDATE_M = `mutation($id:ID!,$html:String!){
  productUpdate(input:{id:$id, descriptionHtml:$html}){
    product{ id }
    userErrors{ field message }
  }
}`;

(async () => {
  if (!GEMINI) throw new Error('GEMINI_API_KEY fehlt.');
  const token = await getToken();
  const done = loadLedger();

  let scanned = 0, thin = 0, enriched = 0, skipped = 0, alreadyDone = 0;
  const thinList = [];
  let cursor = null, hasNext = true;

  // 1) Scan
  while (hasNext && scanned < SCAN_MAX) {
    const data = await gql(token, PAGE_Q, { cursor });
    const conn = data.products;
    for (const e of conn.edges) {
      scanned++;
      const n = e.node;
      const plain = stripHtml(n.descriptionHtml);
      if (plain.length < THIN_MAX) {
        thin++;
        thinList.push(n);
      }
      if (scanned >= SCAN_MAX) break;
    }
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }

  console.log(`Gescannt: ${scanned} ACTIVE-Produkte. Thin (<${THIN_MAX} Zeichen plain): ${thin}.`);

  // 2) Enrich
  for (const n of thinList) {
    if (enriched >= CAP) { console.log(`Cap ${CAP} erreicht — Stopp.`); break; }
    if (done.has(n.id)) { alreadyDone++; continue; }
    const html = await geminiDesc(n.title, n.productType, (n.tags || []).slice(0, 8).join(', '));
    if (html === null) { skipped++; console.log(`SKIP (Gemini 429): ${n.title}`); continue; }
    if (!html) { skipped++; markDone(n.id); console.log(`SKIP (kein Gemini-Text): ${n.title}`); continue; }
    try {
      const res = await gql(token, UPDATE_M, { id: n.id, html });
      const errs = res.productUpdate.userErrors;
      if (errs && errs.length) { skipped++; console.log(`FEHLER update ${n.title}: ${JSON.stringify(errs)}`); continue; }
      enriched++; markDone(n.id);
      console.log(`OK [${enriched}] ${n.title}`);
    } catch (e) {
      skipped++; console.log(`FEHLER update ${n.title}: ${e.message}`);
    }
    await sleep(400);
  }

  console.log('\n===== ZUSAMMENFASSUNG =====');
  console.log(`Gescannt (ACTIVE): ${scanned}`);
  console.log(`Thin gefunden (<${THIN_MAX} Z.): ${thin}`);
  console.log(`Neu angereichert: ${enriched}`);
  console.log(`Bereits im Ledger (übersprungen): ${alreadyDone}`);
  console.log(`Sonst übersprungen (429/leer/Fehler): ${skipped}`);
  if (thin === 0) console.log('=> Katalog bereits gut beschrieben (0 thin).');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
