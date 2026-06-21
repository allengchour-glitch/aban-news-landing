#!/usr/bin/env node
/**
 * fix_trust_consistency.mjs — KATALOG-WEITE Trust-Text-Korrektur (vollautonom, idempotent).
 *
 * Hintergrund (2026-06-21, Funnel-Daten): Im Shop standen INKONSISTENTE Trust-Angaben in
 * Produktbeschreibungen — manche „14 Tage Rückgaberecht", manche „30 Tage". Die OFFIZIELLE
 * Policy (refund-policy + AGB §7) = **30 Tage Rückgaberecht für CH-Kund:innen**. Untertreibung
 * = verschenkte Conversion + Inkonsistenz = Vertrauensverlust. Ebenso falsche Versandschwelle
 * „ab CHF 49" statt der echten **CHF 65** (Versandprofil verifiziert).
 *
 * Dieses Skript ersetzt katalogweit in descriptionHtml:
 *   „14 Tage Rückgaberecht" / „14 Tage Rückgabe"  → „30 Tage Rückgabe"
 *   „ab CHF 49" / „ab Fr. 49"                       → „ab CHF 65"
 * NUR diese exakten Strings — sonst nichts angefasst. Produkte ohne Treffer werden übersprungen
 * (idempotent: ein zweiter Lauf ändert nichts mehr). Rate-Limit-fest, resümierbar, MAX/DRY.
 *
 * ⚠️ NICHT die EU-Zeile anfassen: „gesetzliche 14-tägige Widerrufsrecht" ist KORREKT (EU-Recht)
 *    und bleibt unverändert (Regex trifft nur die freiwillige CH-Rückgabe-Trust-Zeile).
 *
 * ENV (transient, NIE committen):
 *   SHOPIFY_SHOP=au3j0y-hq.myshopify.com
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET   ODER   SHOPIFY_TOKEN
 *   DRY=1   MAX=0(alle)   DELAY=250(ms)
 *
 * Lauf:  node automation/fix_trust_consistency.mjs
 *        DRY=1 node automation/fix_trust_consistency.mjs   (nur Report)
 */
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const CID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const MAX = parseInt(process.env.MAX || '0', 10);
const DELAY = parseInt(process.env.DELAY || '250', 10);
const API = '2025-01';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Nur die freiwillige CH-Rückgabe-Trust-Zeile + Versandschwelle. EU-Widerrufsrecht bleibt unberührt.
function fixHtml(html) {
  if (!html) return { out: html, changed: false };
  let out = html;
  out = out.replace(/14\s*Tage\s*Rückgaberecht/g, '30 Tage Rückgabe');
  // „14 Tage Rückgabe" (ohne -recht), aber NICHT „gesetzliche 14-tägige" (anderer Wortlaut → kein Treffer)
  out = out.replace(/14\s*Tage\s*Rückgabe(?!recht)/g, '30 Tage Rückgabe');
  out = out.replace(/ab\s*CHF\s*49\b/g, 'ab CHF 65');
  out = out.replace(/ab\s*Fr\.?\s*49\b/g, 'ab CHF 65');
  return { out, changed: out !== html };
}

async function shToken() {
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  if (!(SHOP && CID && SEC)) throw new Error('Keine Shopify-Creds (SHOPIFY_TOKEN ODER SHOPIFY_CLIENT_ID/SECRET).');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: SEC, grant_type: 'client_credentials' }) });
  if (!r.ok) throw new Error('Token-Grant fehlgeschlagen: ' + r.status);
  return (await r.json()).access_token;
}
async function gql(tok, query, variables) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }) });
    const j = await r.json();
    const throttled = j.errors && JSON.stringify(j.errors).includes('THROTTLED');
    if (throttled || r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('THROTTLED: zu viele Versuche');
}

const Q = `query($cursor:String){ products(first:50, after:$cursor, query:"status:active") {
  pageInfo{ hasNextPage endCursor }
  nodes{ id title descriptionHtml } } }`;
const M = `mutation($id:ID!,$html:String!){ productUpdate(input:{id:$id, descriptionHtml:$html}){ userErrors{ message } } }`;

(async () => {
  const tok = await shToken();
  console.log(`fix_trust_consistency ${DRY ? '[DRY] ' : ''}— Shop ${SHOP}, MAX=${MAX || '∞'}`);
  let cursor = null, seen = 0, fixed = 0, skipped = 0;
  outer: while (true) {
    const d = await gql(tok, Q, { cursor });
    for (const p of d.products.nodes) {
      seen++;
      const { out, changed } = fixHtml(p.descriptionHtml);
      if (!changed) { skipped++; continue; }
      if (!DRY) {
        const r = await gql(tok, M, { id: p.id, html: out });
        const err = r.productUpdate.userErrors;
        if (err && err.length) { console.log('  ⚠️', p.title, JSON.stringify(err)); continue; }
        await sleep(DELAY);
      }
      fixed++;
      console.log(`  ✏️ ${DRY ? '[würde fixen]' : 'gefixt'}: ${p.title}`);
      if (MAX && fixed >= MAX) break outer;
    }
    if (!d.products.pageInfo.hasNextPage) break;
    cursor = d.products.pageInfo.endCursor;
  }
  console.log(`Fertig: ${seen} geprüft · ${fixed} ${DRY ? 'zu fixen' : 'gefixt'} · ${skipped} schon korrekt.`);
  process.exit(0);
})();
