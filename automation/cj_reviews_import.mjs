#!/usr/bin/env node
/* LuxeStyle — cj_reviews_import.mjs  (ECHTE Käufer-Reviews von CJ → Judge.me)
 *
 * Importiert ECHTE Kundenbewertungen des EXAKT selben Produkts von der CJ-Quelle (CJ `productComments`)
 * nach Judge.me. KEINE erfundenen Reviews — der Inhalt kommt 1:1 von echten CJ-Käufern.
 *
 * Pipeline pro Produkt:
 *   Shopify-Produkt (tag:cj-real) → erste Varianten-SKU (`CJ-<sku>`) → CJ `product/query?variantSku` → pid
 *   → CJ `product/productComments?pid&score>=MIN` → (optional Gemini-DE-Übersetzung) → POST Judge.me /reviews
 *
 * No-op-safe: ohne CJ-/Judge.me-/Shopify-Creds passiert nichts (Exit 0). Idempotent über Ledger.
 * ENV: CJ_EMAIL, CJ_API_KEY · JUDGEME_PRIVATE_TOKEN [, JUDGEME_SHOP_DOMAIN] · SHOPIFY_CLIENT_ID/SECRET (o. ADMIN_TOKEN), SHOPIFY_SHOP
 *      [GEMINI_API_KEY → DE-Übersetzung] · [QUERY="tag:cj-real"] · [ONLY=handle,handle] · [LIMIT=25] · [PER=6]
 *      [MIN_SCORE=4] · [DRY_RUN=1]
 */
import fs from 'node:fs';

const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim();
const CJ_API_KEY = (process.env.CJ_API_KEY || '').trim();
const JM_TOKEN = (process.env.JUDGEME_PRIVATE_TOKEN || '').trim();
const JM_DOMAIN = (process.env.JUDGEME_SHOP_DOMAIN || 'au3j0y-hq.myshopify.com').trim();
const GKEY = (process.env.GEMINI_API_KEY || '').trim();
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';

const QUERY = process.env.QUERY || 'tag:cj-real';
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '25', 10) || 25);
const PER = Math.max(1, parseInt(process.env.PER || '6', 10) || 6);
const MIN_SCORE = Math.max(1, Math.min(5, parseInt(process.env.MIN_SCORE || '4', 10) || 4));
const DRY = process.env.DRY_RUN === '1';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const SHOP_API = '2025-01';
const JM_API = 'https://judge.me/api/v1/reviews';
const TOKEN_FILE = '/tmp/cj_token.json';
const LEDGER = 'dropship/cj_reviews_done.txt';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Guards (No-op statt Fehler) ──
if (!CJ_EMAIL || !CJ_API_KEY) { console.log('Keine CJ-Creds (CJ_EMAIL/CJ_API_KEY) → No-op.'); process.exit(0); }
if (!JM_TOKEN) { console.log('Kein JUDGEME_PRIVATE_TOKEN → No-op.'); process.exit(0); }
if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

// ── Shopify ──
async function sgql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${SHOP_API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function sWorks(t) { try { const r = await sgql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function sCC() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function sToken() { if (ADMIN_TOKEN && await sWorks(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await sCC(); if (t && await sWorks(t)) return t; } return null; }

// ── CJ ──
async function cjToken() {
  try { if (fs.existsSync(TOKEN_FILE)) { const t = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); if (t.exp > Date.now() + 60000) return t.accessToken; } } catch {}
  const r = await fetch(`${CJ_BASE}/authentication/getAccessToken`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: CJ_EMAIL, apiKey: CJ_API_KEY }) });
  const j = await r.json().catch(() => ({}));
  if (!j.result || !j?.data?.accessToken) {
    console.log('⚠️  CJ-Auth fehlgeschlagen → No-op. Meldung: ' + (j.message || JSON.stringify(j).slice(0, 160)));
    console.log('    → CJ_API_KEY im CJ-Dashboard (My CJ → Authorization → API) neu generieren & GitHub-Secret aktualisieren.');
    return null;
  }
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify({ accessToken: j.data.accessToken, exp: Date.now() + 14 * 864e5 })); } catch {}
  return j.data.accessToken;
}
async function cjGet(tok, path, params) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${CJ_BASE}${path}?${qs}`, { headers: { 'CJ-Access-Token': tok } });
  return r.json().catch(() => ({}));
}

// ── Gemini DE-Übersetzung (optional, Batch je Produkt) ──
async function translateDE(texts) {
  if (!GKEY || !texts.length) return texts;
  const prompt = `Übersetze diese Produktbewertungen in natürliches, flüssiges Deutsch (Du-Form, kurz, authentisch). `
    + `Gib AUSSCHLIESSLICH ein JSON-Array von Strings in exakt gleicher Reihenfolge zurück, nichts anderes.\n`
    + JSON.stringify(texts);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GKEY)}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }) });
    const j = await r.json().catch(() => ({}));
    let t = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const arr = JSON.parse(t);
    if (Array.isArray(arr) && arr.length === texts.length) return arr.map((s, i) => (s && String(s).trim()) || texts[i]);
  } catch (e) { console.error('  Übersetzung fehlgeschlagen, nutze Original:', e.message); }
  return texts;
}

// ── Judge.me POST ──
async function jmPost(pid, r) {
  const body = { shop_domain: JM_DOMAIN, platform: 'shopify', id: pid,
    name: r.name || 'Verifizierter Käufer',
    email: r.email || `cj-import+${Math.random().toString(36).slice(2, 9)}@luxestyle.ch`,
    rating: Math.max(1, Math.min(5, Number(r.rating) || 5)), title: r.title || '', body: r.body || '', api_token: JM_TOKEN };
  if (r.created_at) body.created_at = r.created_at;
  if (Array.isArray(r.picture_urls) && r.picture_urls.length) body.picture_urls = r.picture_urls.slice(0, 3);
  const res = await fetch(JM_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, text: (await res.text()).slice(0, 160) };
}

const numId = (gid) => String(gid).split('/').pop();
const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []);

(async () => {
  const stok = await sToken();
  if (!stok) { console.log('Shopify-Auth fehlgeschlagen → No-op.'); process.exit(0); }

  // Produkte holen
  const q = ONLY.length ? ONLY.map(h => `handle:${h}`).join(' OR ') : QUERY;
  const pr = await sgql(stok, `query($q:String!,$n:Int!){ products(first:$n, query:$q){ edges{ node{ id title handle variants(first:1){ edges{ node{ sku } } } } } } }`, { q, n: LIMIT });
  const prods = (pr?.data?.products?.edges || []).map(e => e.node).filter(p => !done.has(numId(p.id)));
  console.log(`${prods.length} Produkt(e) zu prüfen (QUERY="${q}", LIMIT=${LIMIT})${DRY ? ' [DRY]' : ''}`);
  if (!prods.length) { console.log('Nichts zu tun.'); process.exit(0); }

  const ctok = await cjToken();
  if (!ctok) process.exit(0);
  console.log('CJ-Token ok.');

  let totalReviews = 0, prodWith = 0, fails = 0;
  for (const p of prods) {
    const pidNum = numId(p.id);
    const rawSku = p.variants?.edges?.[0]?.node?.sku || '';
    const cjSku = rawSku.replace(/^CJ-/i, '').trim();
    if (!cjSku) { console.log(`· ${p.handle}: keine SKU → skip`); continue; }
    try {
      const qr = await cjGet(ctok, '/product/query', { variantSku: cjSku });
      await sleep(1100); // CJ QPS 1/s
      const cjpid = qr?.data?.pid || qr?.data?.productId || qr?.data?.id;
      if (!cjpid) { console.log(`· ${p.handle}: keine CJ-pid für ${cjSku} → skip`); continue; }
      const cr = await cjGet(ctok, '/product/productComments', { pid: cjpid, pageNum: 1, pageSize: 30 });
      await sleep(1100);
      const list = cr?.data?.list || cr?.data?.comments || (Array.isArray(cr?.data) ? cr.data : []);
      const picked = (list || [])
        .filter(c => Number(c.score) >= MIN_SCORE && (c.comment || '').trim().length >= 8)
        .slice(0, PER);
      if (!picked.length) { console.log(`· ${p.handle}: 0 echte ≥${MIN_SCORE}★-Kommentare bei CJ → skip`); continue; }

      const bodiesDE = await translateDE(picked.map(c => c.comment.trim()));
      let sent = 0;
      for (let i = 0; i < picked.length; i++) {
        const c = picked[i];
        const rev = {
          name: (c.commentUser || '').trim() || 'Verifizierter Käufer',
          rating: Number(c.score) || 5,
          body: bodiesDE[i] || c.comment.trim(),
          created_at: (c.commentDate || '').slice(0, 10) || undefined,
          picture_urls: (Array.isArray(c.commentUrls) ? c.commentUrls : []).filter(u => /^https?:\/\//.test(u)),
        };
        if (DRY) { console.log(`  [DRY] ${p.handle} ★${rev.rating} ${rev.body.slice(0, 50)}`); sent++; continue; }
        const out = await jmPost(pidNum, rev);
        if (out.ok) { sent++; } else { fails++; console.error(`  ✗ ${p.handle} HTTP ${out.status}: ${out.text}`); }
        await sleep(700);
      }
      if (sent) { prodWith++; totalReviews += sent; console.log(`✓ ${p.handle}: ${sent} echte Reviews (CJ-pid ${cjpid})`); }
      if (!DRY) { try { fs.appendFileSync(LEDGER, pidNum + '\n'); } catch {} }
    } catch (e) { fails++; console.error(`✗ ${p.handle}: ${e.message}`); }
  }
  console.log(`\nFertig: ${totalReviews} echte Reviews auf ${prodWith} Produkt(e)${DRY ? ' [DRY]' : ''}${fails ? `, ${fails} Fehler` : ''}.`);
  process.exit(0);
})();
