// cj_specs_backfill.mjs — Faktenblock «Produktdetails» fuer BESTANDS-Produkte aus CJ-Daten nachtragen (02.09.2026).
//
// Der Importer schreibt den Block seit 02.09. (cj_specs.mjs). Der Bestand (49'000) bekommt ihn NICHT
// flaechig — je Produkt kostet der CJ-Nachschlag 10–20 Punkte, das waeren Tage Budget. Nachgetragen
// wird nur, wo Menschen ankommen: die Handles in dropship/_cj_specs_prio.txt (Such-/Landeseiten aus
// ShopifyQL). Regeln: LIVE lesen, nur wenn noch KEINE Liste im Text steht, Block vor dem Ratgeber-/
// Trust-Kasten bzw. am Ende einfuegen, Antwort lesen, erst dann quittieren. DRY=1 zeigt nur.
// SKU-Formen (Lehren 20.–25.08., cj_kosten_backfill): CJ-<zahlen>/CJ-<UUID> → product/query?pid=;
// CJ-CJXX…/CJXX… (Varianten-SKU) → product/variant/query?productSku= liefert pid → product/query?pid=.
// CJ-Budget leer (16900500) → Lauf endet OHNE Quittung; «unklar» wird nie quittiert.
import fs from 'node:fs';
import { produktdetails } from './cj_specs.mjs';

const SHOP = 'au3j0y-hq.myshopify.com';
const TOK = (fs.existsSync('/tmp/cj_shop_token.txt') ? fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8') : '').trim();
const CJT = (() => { try { return JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken; } catch { return ''; } })();
const PRIO = 'dropship/_cj_specs_prio.txt';
const LEDGER = 'dropship/_cj_specs_done.txt';
const DRY = process.env.DRY === '1';
const LIMIT = parseInt(process.env.LIMIT || process.env.CAP || '40', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sgql(q, v) {
  for (let i = 0; i < 8; i++) {
    let j;
    try {
      const r = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, { method: 'POST',
        headers: { 'X-Shopify-Access-Token': TOK, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v || {} }) });
      j = await r.json();
    } catch { await sleep(2000 * (i + 1)); continue; }
    if ((j.errors || []).some(e => /Throttled/i.test(e.message))) {
      const ts = j.extensions?.cost?.throttleStatus || {}; const need = Math.max(1, ((ts.requestedQueryCost || 100) - (ts.currentlyAvailable || 0)) / (ts.restoreRate || 100));
      await sleep(Math.min(30000, need * 1000 + 500)); continue;
    }
    if (j.errors) { console.log('  GQL-Fehler', JSON.stringify(j.errors).slice(0, 200)); return {}; }
    return j;
  }
  return {};
}
async function cj(pfad) {
  for (let v = 0; v < 8; v++) {
    let t;
    try { const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/' + pfad, { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) }); t = await r.text(); }
    catch { await sleep(Math.min(20000, 1500 * (v + 1))); continue; }
    let j; try { j = JSON.parse(t); } catch { await sleep(Math.min(20000, 1500 * (v + 1))); continue; }
    if (String(j.code) === '1600200' || /Too Many Requests/i.test(String(j.message || ''))) { await sleep(1500 + v * 700); continue; }
    return j;
  }
  return { result: false, gedrosselt: true };
}
function budgetLeer(j) { return String(j?.code) === '16900500' || /Insufficient API points/i.test(String(j?.message || '')); }

async function cjProdukt(sku) {
  const s = String(sku || '').trim();
  const mPid = s.match(/^CJ-(\d{10,}|[0-9A-F-]{36})$/i);
  if (mPid) return await cj(`product/query?pid=${mPid[1]}`);
  const mVar = s.match(/^(?:CJ-)?(CJ[A-Z]{2}[0-9A-Z]{6,})$/i);
  if (!mVar) return { result: false, unbekannteForm: true };
  let j = await cj(`product/variant/query?productSku=${mVar[1]}`);
  if (budgetLeer(j)) return j;
  // Varianten-Anhaenge: «…01AZ» (zwei Ziffern + zwei Buchstaben, 22.08.) und «…0001» (vier Ziffern hinter
  // dem 7-stelligen Produktstamm, 25.08./02.09.) — beide auf den Produktstamm kuerzen.
  if (!j.result) { const stamm = mVar[1].match(/^(.*[0-9])\d{2}[A-Z]{2}$/i) || mVar[1].match(/^(CJ[A-Z]{2}\d{7})\d{4}$/i); if (stamm) { await sleep(1100); j = await cj(`product/variant/query?productSku=${stamm[1]}`); } }
  if (budgetLeer(j) || !j.result) return j;
  const pid = (Array.isArray(j.data) ? j.data[0] : j.data)?.pid;
  if (!pid) return { result: false };
  await sleep(1100);
  return await cj(`product/query?pid=${pid}`);
}

function einfuegen(html, block) {
  for (const marker of ['<div style="border-left:3px solid #d9e7d9', '<div style="background:#f7faf7', '<!--gdetails-->', '<p>👉 Passt dazu']) {
    const i = html.indexOf(marker); if (i >= 0) return html.slice(0, i) + block + '\n' + html.slice(i);
  }
  return html + '\n' + block;
}

async function main() {
  if (!TOK || !CJT) { console.log('PAUSE (Token fehlt)'); return; }
  if (!fs.existsSync(PRIO)) { console.log('FERTIG: keine Prioritätsliste'); return; }
  const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').map(l => l.split('\t')[0]).filter(Boolean) : []);
  const handles = fs.readFileSync(PRIO, 'utf8').split('\n').map(l => l.trim().split('\t')[0]).filter(h => h && !h.startsWith('#') && !done.has(h));
  let n = 0, gesetzt = 0, leer = 0;
  for (const h of handles) {
    if (n >= LIMIT) break;
    const q = await sgql(`query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id title status descriptionHtml variants(first:1){nodes{sku}} } }`, { h });
    const p = q.data?.productByIdentifier;
    if (!p) { console.log('  ? nicht gefunden', h); continue; }
    if (p.status !== 'ACTIVE') { if (!DRY) fs.appendFileSync(LEDGER, `${h}\tnicht-aktiv\n`); continue; }
    // Eine Liste, die NUR Versand-/Lieferzeilen traegt (alte ls-feed-details), ist fuer die Tabelle leer —
    // das Theme blendet Versandzeilen aus. Sie wird ersetzt; echte Listen bleiben unangetastet.
    const alt = (p.descriptionHtml || '').match(/<div class="(?:ls-produktdetails|ls-feed-details|gmc-details)">[\s\S]*?<\/div>/);
    const altKeys = alt ? [...alt[0].matchAll(/<strong>([^<]*?):?<\/strong>/g)].map(m => m[1].trim().replace(/:$/, '')) : [];
    const nurVersand = alt && altKeys.length > 0 && altKeys.every(k => /^(Versand|Lieferzeit|Lieferung)$/i.test(k));
    if ((alt && !nurVersand) || /<h4>Details<\/h4>/.test(p.descriptionHtml || '')) { if (!DRY) fs.appendFileSync(LEDGER, `${h}\that-liste\n`); continue; }
    const sku = p.variants.nodes[0]?.sku; n++;
    const j = await cjProdukt(sku); await sleep(1100);
    if (budgetLeer(j)) { console.log('CJ-Tagesbudget erschöpft — Pause'); break; }
    if (j?.unbekannteForm) { console.log('  keine CJ-SKU', h, sku); if (!DRY) fs.appendFileSync(LEDGER, `${h}\tkeine-cj-sku\n`); continue; }
    if (!j || !j.result || !j.data) { console.log('  unklar', h, String(j?.message || '').slice(0, 60)); continue; }   // keine Quittung
    const block = produktdetails(j.data, p.title);
    if (!block) { leer++; console.log('  keine belegten Fakten', h); if (!DRY) fs.appendFileSync(LEDGER, `${h}\tkeine-fakten\n`); continue; }
    const zeilen = (block.match(/<li>/g) || []).length;
    if (DRY) { console.log(`  [DRY] ${h} → ${zeilen} Zeilen: ${block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160)}`); gesetzt++; continue; }
    // LIVE erneut lesen (paralleler Schreiber), dann sofort schreiben
    const q2 = await sgql(`query($id:ID!){ product(id:$id){ descriptionHtml } }`, { id: p.id });
    let live = q2.data?.product?.descriptionHtml; if (!live) continue;
    const altLive = live.match(/<div class="(?:ls-produktdetails|ls-feed-details|gmc-details)">[\s\S]*?<\/div>/);
    if (altLive) { const ks = [...altLive[0].matchAll(/<strong>([^<]*?):?<\/strong>/g)].map(m => m[1].trim().replace(/:$/, '')); if (ks.length && ks.every(k => /^(Versand|Lieferzeit|Lieferung)$/i.test(k))) live = live.replace(altLive[0], ''); else continue; }
    const neu = einfuegen(live, block);
    const m = await sgql(`mutation($i:ProductInput!){ productUpdate(input:$i){ product{ descriptionHtml } userErrors{ message } } }`, { i: { id: p.id, descriptionHtml: neu } });
    const pu = m.data?.productUpdate;
    if (!pu || pu.userErrors?.length || !/class="ls-produktdetails"/.test(pu.product?.descriptionHtml || '')) { console.log('  ⛔ nicht geschrieben', h, JSON.stringify(pu?.userErrors || '')); continue; }
    fs.appendFileSync(LEDGER, `${h}\tgesetzt-${zeilen}\n`); gesetzt++; console.log(`  ✔ ${h} (${zeilen} Zeilen)`);
  }
  console.log(`${DRY ? '[DRY] ' : ''}geprüft ${n} · gesetzt ${gesetzt} · ohne Fakten ${leer}`);
  if (!handles.length) console.log('FERTIG: Prioritätsliste abgearbeitet');
}
main().catch(e => { console.error(e); process.exit(1); });
