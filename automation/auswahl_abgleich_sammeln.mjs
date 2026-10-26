#!/usr/bin/env node
/**
 * Abgleich Shop ↔ CJ, Teil 1: Rohdaten sammeln. NUR LESEN (Shopify lesen, CJ lesen), schreibt nichts in den Shop.
 *
 * Liest die Handles aller von cj_varianten_nachziehen.mjs geschriebenen Produkte (Ledger «GESCHRIEBEN»), holt je Produkt die Shopify-Varianten
 * (SKU, Preis, Kosten, Optionswerte, Variantenbild) und die CJ-Antwort (variantSku, variantKey, variantSellPrice, variantImage) und hängt eine Zeile an die
 * JSONL-Datei. Die Auswertung (lib/auswahl_abgleich.mjs, auswahl_abgleich.mjs) braucht kein Netz und lässt sich beliebig oft wiederholen.
 *
 * REIHENFOLGE: nach Hash gemischt — jeder Anfang der Datei ist eine Zufallsstichprobe, ein Abbruch verfälscht nichts.
 * FORTSETZEN: schon vorhandene Handles der Datei werden übersprungen (Container-Neustart tötet Prozesse, die Datei bleibt).
 * CJ erlaubt 1 Anfrage pro Sekunde (PAUSE_MS 1100). Tagespunkte erschöpft oder Drosselung → Exitcode 3 (später fortsetzen).
 *
 * ENV: HANDLES_DATEI (Vorgabe: Ledger dropship/cj_varianten_ledger.txt, Zeilen GESCHRIEBEN) · AUS (Vorgabe /tmp/auswahl_abgleich_roh.jsonl)
 *      LIMIT (höchstens so viele NEUE Produkte in diesem Lauf, 0 = alle) · PAUSE_MS · SEED (Mischung, Vorgabe «abgleich»)
 *      LAGER_JEDES=n  (bei jedem n-ten Produkt zusätzlich den CJ-Bestand JE VARIANTE holen: eine Anfrage pro Variante; 0 = nie)
 *      SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, CJ_EMAIL, CJ_API_KEY
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { strategien } from './lib/fakten_block.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const SHOP = process.env.SHOPIFY_SHOP;
const AUS = process.env.AUS || '/tmp/auswahl_abgleich_roh.jsonl';
const PAUSE = Number(process.env.PAUSE_MS || 1100), LIMIT = Number(process.env.LIMIT || 0), LAGER_JEDES = Number(process.env.LAGER_JEDES || 0);
const SEED = process.env.SEED || 'abgleich';
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));

const handlesAusLedger = () => {
  const datei = process.env.HANDLES_DATEI || new URL('../dropship/cj_varianten_ledger.txt', import.meta.url).pathname;
  const txt = readFileSync(datei, 'utf8');
  if (process.env.HANDLES_DATEI && !/ · (GESCHRIEBEN|UEBERSPRUNGEN|FEHLER) · /.test(txt)) return [...new Set(txt.split('\n').map((z) => z.trim()).filter(Boolean))];
  return [...new Set(txt.split('\n').filter((z) => z.includes(' · GESCHRIEBEN · ')).map((z) => z.split(' ')[0]))];
};
const hash = (h) => createHash('sha1').update(SEED + h).digest('hex');

const PRODUKT = `query($h:String!){productByHandle(handle:$h){handle status title variantsCount{count} options{name values}
  variants(first:100){nodes{sku price image{id} selectedOptions{name value} inventoryItem{unitCost{amount}}}}}}`;

async function main() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (qq, v) => shopifyGql(SHOP, '2025-01', tok, qq, v);
  const cj = await cjToken();
  if (!cj) { console.error('Kein CJ-Token'); process.exit(1); }

  const fertig = new Set(existsSync(AUS) ? readFileSync(AUS, 'utf8').split('\n').filter(Boolean).map((z) => { try { return JSON.parse(z).handle; } catch { return null; } }) : []);
  const alle = handlesAusLedger().sort((a, b) => (hash(a) < hash(b) ? -1 : 1));
  console.log(`Handles: ${alle.length} · schon in ${AUS}: ${fertig.size}`);
  let neu = 0;
  for (let i = 0; i < alle.length; i++) {
    const h = alle[i];
    if (fertig.has(h)) continue;
    if (LIMIT && neu >= LIMIT) { console.log(`LIMIT ${LIMIT} erreicht`); break; }
    const zeile = { handle: h };
    try {
      const d = await q(PRODUKT, { h });
      const p = d.productByHandle;
      if (!p) zeile.shop = null;
      else {
        zeile.status = p.status; zeile.titel = p.title;
        zeile.shop = { variantsCount: p.variantsCount.count, options: p.options,
          variants: p.variants.nodes.map((v) => ({ sku: v.sku, price: v.price, kosten: v.inventoryItem?.unitCost ? Number(v.inventoryItem.unitCost.amount) : null,
            werte: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])), bildId: v.image?.id || null })) };
        const wege = strategien(p.variants.nodes[0]?.sku);
        let c = null;
        for (const [art, wert] of wege) {
          const res = await cjFetch(`${BASE}/product/query?${art}=${encodeURIComponent(wert)}`, { context: 'Abgleich', headers: { 'CJ-Access-Token': cj }, weicheCodes: WEICHE_CODES });
          await schlaf(PAUSE);
          if (res?.data) { c = res.data; break; }
        }
        zeile.cj = c ? { pid: c.pid, variants: (c.variants || []).map((v) => ({ vid: v.vid, sku: v.variantSku, key: v.variantKey || '', ek: Number(v.variantSellPrice), bild: v.variantImage || '' })) } : { fehler: wege.length ? 'CJ ohne Daten' : 'keine CJ-Kennung in der SKU' };
        if (c && LAGER_JEDES > 0 && neu % LAGER_JEDES === 0) {
          const shopSkus = new Set(p.variants.nodes.map((v) => v.sku));
          zeile.stock = {};
          for (const v of zeile.cj.variants.filter((x) => shopSkus.has(x.sku))) {
            try {
              const s = await cjFetch(`${BASE}/product/stock/queryByVid?vid=${encodeURIComponent(v.vid)}`, { context: 'Abgleich-Lager', headers: { 'CJ-Access-Token': cj }, weicheCodes: WEICHE_CODES });
              zeile.stock[v.vid] = (s?.data || []).reduce((sum, a) => sum + (Number(a.totalInventoryNum) || 0), 0);
            } catch (e) { if (/CJ_QUOTA|CJ_THROTTLED/.test(String(e.message))) throw e; /* einzelne Variante ohne Antwort: bleibt ohne Wert */ }
            await schlaf(PAUSE);
          }
        }
      }
    } catch (e) {
      if (/CJ_QUOTA|CJ_THROTTLED/.test(String(e.message))) { console.log('ABBRUCH:', e.message, '— später fortsetzen'); process.exitCode = 3; break; }
      zeile.fehler = String(e.message).slice(0, 200);
    }
    appendFileSync(AUS, JSON.stringify(zeile) + '\n');
    neu++;
    if (neu % 25 === 0) console.log(`${neu} neu (${fertig.size + neu} von ${alle.length})`);
  }
  console.log(`Fertig: ${neu} neue Zeilen, gesamt ${fertig.size + neu} von ${alle.length}`);
}
main().catch((e) => { console.error('FEHLER', e.message); process.exit(1); });
