#!/usr/bin/env node
/* LuxeStyle — image-audit.mjs
 * --------------------------------------------------------------------------------
 * Prüft die HAUPTBILDER aller aktiven Produkte und macht sie „top":
 *   • Auflösung (Breite/Höhe via Admin-API) → flaggt zu kleine Bilder
 *   • Gemini-Vision auf das 1. Bild: zeigt es eine Person? wirkt sie asiatisch?
 *     ist es ein sauberes Produktfoto? schlechte Qualität (blurry/Collage/Wasserzeichen)?
 *   • Wenn das 1. Bild ungünstig ist (asiatisches Model / schlechte Qualität) UND ein
 *     besseres, sauberes Produktbild existiert → wird dieses per reorderMedia NACH VORNE
 *     sortiert (das Produkt verliert kein Bild, nur die Reihenfolge ändert sich).
 *
 * Sicher & günstig: BATCH pro Lauf (Default 40), idempotenter Ledger (überspringt schon
 * geprüfte Produkte), max. wenige Vision-Calls pro Produkt, Report als CSV. APPLY=0 = nur
 * Report (kein Umsortieren). No-op ohne GEMINI_API_KEY bzw. Shopify-Creds.
 *
 * ENV (GitHub-Secrets): GEMINI_API_KEY · SHOPIFY_SHOP · SHOPIFY_CLIENT_ID · SHOPIFY_CLIENT_SECRET
 *      GEMINI_MODEL (Default gemini-2.5-flash) · BATCH (40) · MIN_PX (800) · APPLY (1)
 */
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GEMINI_API_KEY || '';
const SHOP = process.env.SHOPIFY_SHOP || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = process.env.SHOPIFY_CLIENT_SECRET || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GBASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const API_VER = process.env.SHOPIFY_API_VERSION || '2025-01';
const BATCH = Math.max(1, parseInt(process.env.BATCH || '40', 10) || 40);
const MIN_PX = Math.max(200, parseInt(process.env.MIN_PX || '800', 10) || 800);
const APPLY = process.env.APPLY !== '0'; // Default: Umsortieren AN

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const LEDGER = path.join(ROOT, 'dropship', 'image-audit-done.txt');
const REPORT = path.join(ROOT, 'dropship', 'image-audit-report.csv');

if (!KEY || !SHOP || !CID || !CSECRET) { console.log('Fehlende Keys (GEMINI_API_KEY/SHOPIFY_*) → No-op.'); process.exit(0); }

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const seen = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : []);
const remember = (id) => { seen.add(id); fs.appendFileSync(LEDGER, id + '\n'); };
const csvEsc = (v) => /[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? '');
if (!fs.existsSync(REPORT)) fs.writeFileSync(REPORT, 'handle,issue,action,width,height,featured_url\n');
const report = (row) => fs.appendFileSync(REPORT, row.map(csvEsc).join(',') + '\n');

// ---- Shopify Admin (Client-Credentials-Grant, 2026) ----
let TOKEN = '';
async function shopToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CSECRET, grant_type: 'client_credentials' }) });
  const j = await r.json(); return j.access_token || '';
}
async function gql(query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/${API_VER}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }) });
  return r.json();
}

// ---- Gemini Vision: klassifiziert ein Bild ----
async function classify(url) {
  try {
    const img = await fetch(url); if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    const mime = url.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
    const prompt = 'Du bewertest ein Produktbild für einen Schweizer Online-Shop. Antworte NUR mit kompaktem JSON ' +
      '(keine Erklärung): {"person":bool,"asian":bool,"clean_product":bool,"low_quality":bool}. ' +
      '"person"=ein menschliches Model ist prominent zu sehen. "asian"=die prominenteste Person wirkt ost-/südostasiatisch. ' +
      '"clean_product"=zeigt v. a. das Produkt (wenig/kein Mensch), gut als Katalog-Vorschau. ' +
      '"low_quality"=unscharf, Wasserzeichen, Text-Overlay, Collage oder billig.';
    const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: buf.toString('base64') } }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 80 } };
    const r = await fetch(`${GBASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = txt.match(/\{[^}]*\}/); if (!m) return null;
    return JSON.parse(m[0]);
  } catch { return null; }
}

(async () => {
  log(`Bild-Audit start · APPLY=${APPLY} · BATCH=${BATCH} · MIN_PX=${MIN_PX} · geprüft bisher: ${seen.size}`);
  TOKEN = await shopToken();
  if (!TOKEN) { log('❌ Kein Shopify-Token.'); process.exit(0); }

  let after = null, processed = 0, flagged = 0, reordered = 0;
  outer:
  while (processed < BATCH) {
    const q = `query($after:String){ products(first:50, after:$after, query:"status:active"){ pageInfo{ hasNextPage endCursor }
      edges{ node{ id handle media(first:8){ edges{ node{ ... on MediaImage { id image{ url width height } } } } } } } } }`;
    const data = await gql(q, { after });
    const conn = data?.data?.products; if (!conn) { log('Query-Fehler:', JSON.stringify(data).slice(0,200)); break; }
    for (const e of conn.edges) {
      if (processed >= BATCH) break outer;
      const p = e.node; if (seen.has(p.id)) continue;
      const imgs = (p.media?.edges || []).map(x => x.node).filter(n => n?.image?.url);
      if (!imgs.length) { remember(p.id); continue; }
      processed++;
      const feat = imgs[0];
      const w = feat.image.width || 0, h = feat.image.height || 0;
      const lowres = (w && w < MIN_PX) || (h && h < MIN_PX);
      const c = await classify(feat.image.url); await sleep(400);
      const badFeat = c && ((c.person && c.asian) || c.low_quality);
      let action = 'ok';
      if (lowres) { action = 'NIEDRIGE-AUFLOESUNG'; flagged++; }
      if (badFeat) {
        flagged++;
        // bessere Alternative suchen: sauberes Produktfoto ohne (asiatische) Person
        let altIdx = -1;
        for (let i = 1; i < Math.min(imgs.length, 4); i++) {
          const ca = await classify(imgs[i].image.url); await sleep(400);
          if (ca && ca.clean_product && !ca.low_quality && !(ca.person && ca.asian)) { altIdx = i; break; }
        }
        if (altIdx > 0 && APPLY) {
          const mv = `mutation($id:ID!,$moves:[MoveInput!]!){ productReorderMedia(id:$id, moves:$moves){ mediaUserErrors{ message } } }`;
          const res = await gql(mv, { id: p.id, moves: [{ id: imgs[altIdx].id, newPosition: '0' }] });
          const errs = res?.data?.productReorderMedia?.mediaUserErrors || [];
          if (!errs.length) { action = `UMSORTIERT (Bild ${altIdx+1}→1)`; reordered++; }
          else action = 'FEHLER-UMSORT: ' + errs[0].message;
          await sleep(600);
        } else {
          action = altIdx > 0 ? 'BESSERES-BILD-VORHANDEN (APPLY=0)' : 'FLAG: kein sauberes Alt-Bild (Bild ersetzen)';
        }
      }
      if (action !== 'ok') report([p.handle, lowres ? 'lowres' : (c && c.person && c.asian ? 'asian-model-first' : 'low-quality'), action, w, h, feat.image.url]);
      remember(p.id);
    }
    if (!conn.pageInfo.hasNextPage) { log('Katalog-Ende erreicht.'); break; }
    after = conn.pageInfo.endCursor;
  }
  log(`Fertig: ${processed} Produkte geprüft · ${flagged} geflaggt · ${reordered} umsortiert. Report: dropship/image-audit-report.csv`);
})();
