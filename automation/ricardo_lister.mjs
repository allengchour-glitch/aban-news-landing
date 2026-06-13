#!/usr/bin/env node
/* LuxeStyle — ricardo_lister.mjs  (Shopify → Ricardo.ch Inserate, autonom)
 *
 * Listet aktive LuxeStyle-Produkte als Ricardo-Inserate. Liest die Produkte aus der ÖFFENTLICHEN
 * Storefront (luxestyle.ch/products.json) → nur ACTIVE/online sichtbare (archivierte/China-Artikel
 * sind dadurch automatisch ausgeschlossen). Auth + InsertArticle über Ricardos .NET-Webservice (JSON).
 *
 * ⚠️ STATUS: Auth-/Insert-Flow ist nach der dokumentierten Service-Struktur gebaut, aber die EXAKTEN
 * Endpoint-Pfade + Feldnamen + die CategoryId-Map liefert erst die offizielle Ricardo-API-Doku (Login
 * mit Partnership-Key). Markierte TODOs dann mit den echten Werten füllen. No-op ohne Credentials.
 *
 * SECRETS (NIE ins Repo):
 *   RICARDO_PARTNER_KEY   — Partnership-Key (help.ricardo.ch → Schnittstelle aufschalten)
 *   RICARDO_USERNAME / RICARDO_PASSWORD  — Verkäufer-Login
 *   RICARDO_API_BASE      — optional, Basis-URL des Webservice (Default unten)
 *   RICARDO_DEFAULT_CATEGORY — Fallback-CategoryId, bis das Mapping steht
 *
 * CLI:  node automation/ricardo_lister.mjs            (listet bis MAX neue Produkte)
 *       node automation/ricardo_lister.mjs --max 5
 *       node automation/ricardo_lister.mjs --dry      (nur zeigen, was es täte)
 */
import fs from 'node:fs';

const PARTNER = process.env.RICARDO_PARTNER_KEY || '';
const USER = process.env.RICARDO_USERNAME || '';
const PASS = process.env.RICARDO_PASSWORD || '';
const BASE = process.env.RICARDO_API_BASE || 'https://ws.ricardo.ch'; // TODO: echte Basis-URL aus der API-Doku
const DEFAULT_CAT = process.env.RICARDO_DEFAULT_CATEGORY || '';
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const MAX = Number((args[args.indexOf('--max') + 1]) || 3);
const LEDGER = 'ricardo_listed.txt'; // idempotent: schon gelistete Produkt-IDs

if (!(PARTNER && USER && PASS)) { console.error('RICARDO_* Secrets fehlen → No-op.'); process.exit(0); }

async function jpost(path, headers, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body || {}),
  });
  const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(`Ricardo ${path} ${r.status}: ${t.slice(0, 200)}`);
  return j;
}

/* Token holen (SecurityService). TODO: exakte Pfade/Felder aus der offiziellen Doku verifizieren. */
async function getToken() {
  const auth = { 'Ricardo-Username': USER, 'Ricardo-Password': PASS, 'Ricardo-PartnerKey': PARTNER };
  // 1) temporäre Credential → 2) Token-Credential
  const tmp = await jpost('/SecurityService/GetTemporaryCredential', auth, {});      // TODO Pfad
  const tok = await jpost('/SecurityService/CreateTokenCredential', auth, { temporaryCredential: tmp });
  return tok && (tok.token || tok.Token || tok);
}

async function fetchProducts() {
  const out = [];
  for (let page = 1; page < 40; page++) {
    const d = await (await fetch(`https://luxestyle.ch/products.json?limit=250&page=${page}`)).json();
    const ps = d.products || []; if (!ps.length) break;
    for (const p of ps) {
      const img = (p.images || [])[0]?.src;
      const v = (p.variants || [])[0] || {};
      if (img && v.price) out.push({ id: String(p.id), title: p.title, body: p.body_html || '', price: v.price, image: img });
    }
  }
  return out;
}

function toArticle(p, token) {
  // TODO: Felder/Struktur an InsertArticle der echten Doku anpassen (CategoryId-Mapping via SystemService).
  return {
    token,
    article: {
      Title: p.title.slice(0, 50),
      Description: (p.body || p.title).replace(/<[^>]+>/g, ' ').slice(0, 4000),
      BuyNowPrice: Math.round(Number(p.price)),
      Quantity: 1,
      CategoryId: DEFAULT_CAT,           // TODO: pro Produkt aus SystemService mappen
      Pictures: [{ Url: p.image }],
      DurationInDays: 10,
      // ShippingOptions / PaymentMethods: TODO laut Doku ergänzen
    },
  };
}

(async () => {
  const listed = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split(/\s+/).filter(Boolean) : []);
  const prods = (await fetchProducts()).filter(p => !listed.has(p.id));
  console.error(`Kandidaten: ${prods.length} (noch nicht gelistet)`);
  if (DRY) { prods.slice(0, MAX).forEach(p => console.error('[dry]', p.id, p.title, 'CHF', p.price)); return; }
  const token = await getToken();
  let done = 0;
  for (const p of prods.slice(0, MAX)) {
    try {
      await jpost('/ArticleService/InsertArticle', { 'Ricardo-PartnerKey': PARTNER }, toArticle(p, token));
      fs.appendFileSync(LEDGER, p.id + '\n'); done++;
      console.error('GELISTET', p.id, p.title);
    } catch (e) { console.error('FEHLER', p.id, e.message); }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.error(`Fertig. ${done} Inserate erstellt.`);
})().catch(e => { console.error('Abbruch:', e.message); process.exit(1); });
