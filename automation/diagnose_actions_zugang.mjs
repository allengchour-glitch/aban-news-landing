#!/usr/bin/env node
/**
 * Diagnose: Erreicht ein GitHub-Actions-Lauf Shopify und CJ? NUR LESEN, gibt keine Geheimnisse aus.
 *
 * WARUM (26.10.2026): «Bestseller Refresh» und «Shop Autopilot» melden täglich «success», obwohl das Skript mit
 * «Unexpected token '<', "<!DOCTYPE" is not valid JSON» endet — die Token-Antwort von Shopify war HTML. Ob das Secret
 * `SHOPIFY_SHOP` falsch geschrieben ist oder Shopify die GitHub-Rechner abweist, ist von aussen nicht zu sehen.
 * Bevor ein Dauerlauf auf Actions verlegt wird (Auswahl-Lauf), wird das hier gemessen.
 *
 * Ausgegeben werden nur Längen, Formate (ja/nein), HTTP-Status, Content-Type, bei HTML der <title> und bei JSON das
 * Feld `error`/`message`. Nie ein Token, nie ein Secret-Wert.
 * Aufruf: Workflow «Diagnose Actions-Zugang» (workflow_dispatch). Lokal: node automation/diagnose_actions_zugang.mjs
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';

const roh = k => String(process.env[k] || '');
const form = (name, v, re) => console.log(`${name}: gesetzt=${v.length > 0} länge=${v.length}${re ? ` format_ok=${re.test(v)}` : ''}`);
const kopf = t => console.log(`\n== ${t} ==`);
let fehler = 0;

/** HTTP holen, Antwort nach Art beschreiben (HTML-Titel / JSON-Schlüssel), nie den ganzen Text ausgeben. */
async function hole(url, init = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
    const text = await r.text();
    const ct = r.headers.get('content-type') || '';
    let art = 'text', json = null, titel = '';
    try { json = JSON.parse(text); art = 'json'; } catch { /* kein JSON */ }
    if (art === 'text') { const m = text.match(/<title[^>]*>([^<]{0,120})/i); titel = m ? m[1].trim() : text.slice(0, 80).replace(/\s+/g, ' '); art = /^\s*<(!doctype|html)/i.test(text) ? 'html' : 'text'; }
    console.log(`  HTTP ${r.status} · ${ct.split(';')[0]} · ${art} · ${text.length} Byte · ${Date.now() - t0} ms${titel ? ` · Titel/Anfang: «${titel}»` : ''}`);
    const server = r.headers.get('server'), cf = r.headers.get('cf-ray') ? 'cf-ray vorhanden' : '';
    if (server || cf) console.log(`  Header: server=${server || '-'} ${cf}`);
    return { status: r.status, art, json, text };
  } catch (e) { console.log(`  FEHLER beim Abruf: ${e.name}: ${String(e.message).slice(0, 160)}`); return { status: 0, art: 'fehler', json: null, text: '' }; }
}

// ── Shopify ──────────────────────────────────────────────────────────────
kopf('Shopify: Secrets');
const SHOP = roh('SHOPIFY_SHOP').trim(), CID = roh('SHOPIFY_CLIENT_ID').trim(), CS_ROH = roh('SHOPIFY_CLIENT_SECRET');
const CS = shopifyClientSecret(CS_ROH), ADMIN = roh('SHOPIFY_ADMIN_TOKEN').trim();
form('SHOPIFY_SHOP', SHOP, /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/);
if (SHOP && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(SHOP)) console.log(`  Hinweis: Wert beginnt mit https://=${/^https?:\/\//i.test(SHOP)}, enthält Schrägstrich=${SHOP.includes('/')}, enthält Leerzeichen=${/\s/.test(roh('SHOPIFY_SHOP').trim())}`);
form('SHOPIFY_CLIENT_ID', CID, /^[0-9a-f]{32}$/);
form('SHOPIFY_CLIENT_SECRET (roh)', CS_ROH.trim(), /^shpss_[0-9a-f]{32}$/);
console.log(`SHOPIFY_CLIENT_SECRET (nach shopifyClientSecret): länge=${CS.length} format_ok=${/^shpss_[0-9a-f]{32}$/.test(CS)}`);
form('SHOPIFY_ADMIN_TOKEN', ADMIN);
if (ADMIN) console.log(`  Art: ${/^shpat_/.test(ADMIN) ? 'shpat_' : /^shpca_/.test(ADMIN) ? 'shpca_' : 'andere'}`);

let token = '';
if (SHOP && CID && CS) {
  kopf('Shopify: Token holen (Client-Credentials)');
  const r = await hole(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }) });
  if (r.json) console.log(`  JSON-Felder: ${Object.keys(r.json).join(', ')}${r.json.error ? ` · error=${String(r.json.error).slice(0, 80)}` : ''}${r.json.error_description ? ` · ${String(r.json.error_description).slice(0, 120)}` : ''}`);
  token = r.json?.access_token || '';
  console.log(`  Token erhalten: ${!!token}`);
  if (!token) fehler++;
}
if (!token && ADMIN) token = ADMIN;
if (token && SHOP) {
  kopf('Shopify: lesende Abfrage');
  const r = await hole(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query: '{ shop { name myshopifyDomain } productsCount { count } }' }) });
  const d = r.json?.data;
  if (d) console.log(`  Shop: ${d.shop?.myshopifyDomain} · Produkte (mind.): ${d.productsCount?.count}`); else { fehler++; console.log(`  Antwort ohne data${r.json?.errors ? `: ${JSON.stringify(r.json.errors).slice(0, 200)}` : ''}`); }
} else if (!token) { fehler++; console.log('\nKein Shopify-Token → keine lesende Abfrage.'); }

// ── CJ ───────────────────────────────────────────────────────────────────
kopf('CJ: Secrets');
const CJE = roh('CJ_EMAIL').trim(), CJK = roh('CJ_API_KEY').trim();
form('CJ_EMAIL', CJE, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
form('CJ_API_KEY', CJK);
if (CJE && CJK && process.env.CJ_PROBE !== '0') {
  kopf('CJ: Token holen (einmal je 5 Minuten erlaubt)');
  const r = await hole('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: CJE, password: CJK }) });
  if (r.json) console.log(`  result=${r.json.result} code=${r.json.code} message=${String(r.json.message || '').slice(0, 100)} · Token erhalten: ${!!r.json.data?.accessToken}`);
  if (!r.json?.data?.accessToken) fehler++;
}

console.log(`\nErgebnis: ${fehler ? `${fehler} Zugang/Zugänge nicht erreichbar` : 'alles erreichbar'}`);
process.exit(fehler ? 1 : 0);
