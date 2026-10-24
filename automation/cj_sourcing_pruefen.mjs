#!/usr/bin/env node
/**
 * LuxeStyle — cj_sourcing_pruefen.mjs  (NUR LESEN, ändert nichts)
 *
 * Nimmt die beantworteten CJ-Sourcing-Anfragen aus dem Ledger und MISST für jeden
 * vorgeschlagenen Ersatzlieferanten, ob er in die Schweiz versendet und ob er rentabel ist.
 *
 * WARUM DIESES WERKZEUG ÜBERHAUPT: CJs „Sourcing Succeeded" sagt NICHTS über die Schweiz
 * (gemessen 2026-10-24: drei von vier Treffern bekamen null Frachtlinien CN→CH). Wer der
 * Erfolgsmeldung glaubt, stellt nicht lieferbare Ware live — genau die Ursache aller elf
 * Erstattungen des Shops. Das Urteil fällt darum `automation/lib/lieferbarkeit.mjs` anhand
 * echter Frachtlinien, nicht CJs Statuswort.
 *
 * `Similar Products` ist KEIN Treffer für dasselbe Produkt: CJ bietet dann etwas Ähnliches an.
 * Das bleibt `aehnlich` und wird nie automatisch als Ersatz behandelt.
 *
 * ENV: CJ_EMAIL · CJ_API_KEY (Pflicht) · SHOPIFY_* für den Abgleich mit dem Shop (optional:
 *      ohne Shopify fehlen VK und Status, die Frachtmessung läuft trotzdem) ·
 *      KURS (USD→CHF, Vorgabe 0.82435, Stand 23.10.2026) · NUR=<pid,pid> begrenzt die Messung.
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { lieferurteil } from './lib/lieferbarkeit.mjs';
import { readFile } from 'node:fs/promises';

const SHOP = process.env.SHOPIFY_SHOP || '', TOK_ST = process.env.SHOPIFY_ADMIN_TOKEN || '',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  API = '2025-01',
  KURS = Number(process.env.KURS || '0.82435'),
  NUR = (process.env.NUR || '').split(',').map(s => s.trim()).filter(Boolean),
  LEDGER = 'dropship/cj_sourcing_ledger.txt',
  CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

const schlaf = ms => new Promise(r => setTimeout(r, ms));
const zahl = v => { const n = Number(String(v ?? '').split('--')[0].trim()); return Number.isFinite(n) ? n : null; };

async function shopToken() {
  if (TOK_ST) return TOK_ST;
  if (!SHOP || !CID || !CS) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }),
  });
  if (!r.ok) { console.error(`Shopify-Token: HTTP ${r.status}`); return ''; }
  return (await r.json()).access_token || '';
}

/** Frachtlinien CN→CH für EINE Variante. null = nicht gemessen (nie als Befund lesen). */
async function fracht(tok, vid) {
  const r = await fetch(`${CJ_BASE}/logistic/freightCalculate`, {
    method: 'POST', headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid }] }),
  });
  const f = await r.json().catch(() => ({}));
  await schlaf(1200);
  if (Number(f?.code) !== 200 || !Array.isArray(f?.data)) return { linien: null, guenstigste: null };
  const preise = f.data.map(x => zahl(x?.logisticPrice)).filter(n => n !== null);
  return {
    linien: f.data.length,
    guenstigste: preise.length ? Math.min(...preise) : null,
    name: f.data.find(x => zahl(x?.logisticPrice) === Math.min(...preise))?.logisticName || '',
  };
}

async function main() {
  const zeilen = (await readFile(LEDGER, 'utf8').catch(() => '')).split('\n').filter(Boolean);
  if (!zeilen.length) { console.log('no-op: Ledger leer.'); return; }
  const ctok = await cjToken();
  if (!ctok) { console.log('no-op: CJ-Auth fehlgeschlagen → CJ_API_KEY erneuern.'); return; }

  // Stand aller Anfragen holen: nur CJ weiss, welche pid ein Treffer ergeben hat.
  // Der Endpunkt will `sourceIds` mehrfach (NICHT `sourcingIds`, das gibt HTTP 400) und
  // antwortet mit einer flachen Liste; die Felder heissen sourceId/sourceStatusStr/cjProductId.
  const ids = zeilen.map(z => z.split('·')[2]?.trim()).filter(Boolean);
  const stand = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const frage = ids.slice(i, i + 100).map(x => `sourceIds=${encodeURIComponent(x)}`).join('&');
    const r = await cjFetch(`${CJ_BASE}/product/sourcing/queryList?${frage}`,
      { headers: { 'CJ-Access-Token': ctok }, context: 'sourcing/queryList' });
    for (const e of (r?.data || [])) if (e?.sourceId) stand.set(String(e.sourceId), e);
    await schlaf(1200);
  }

  const stok = await shopToken();
  const bericht = [];
  for (const z of zeilen) {
    const [handle, , sid, grund] = z.split('·').map(s => s.trim());
    const e = stand.get(sid);
    const status = e?.sourceStatusStr || e?.sourceStatus || '(kein Stand)';
    const pid = String(e?.cjProductId || '');
    const zeile = { handle, sid, status, pid, grundAnfrage: grund, cjVariantSku: e?.cjVariantSku || '', fehlgrund: e?.failReasonStr || '' };

    // Eine interne UUID statt einer CJ-pid ist UNBEKANNT, nicht lieferbar und nicht unlieferbar.
    if (!/^\d{10,}$/.test(pid)) {
      zeile.urteil = { urteil: 'unbekannt', grund: pid ? 'keine CJ-pid (interne Kennung)' : 'kein Produkt genannt' };
      bericht.push(zeile); continue;
    }
    if (NUR.length && !NUR.includes(pid)) { zeile.urteil = { urteil: 'uebersprungen', grund: 'nicht in NUR' }; bericht.push(zeile); continue; }

    const q = await cjFetch(`${CJ_BASE}/product/query?pid=${encodeURIComponent(pid)}`,
      { headers: { 'CJ-Access-Token': ctok }, context: 'product/query', weicheCodes: [1602001, 1602002, 1602003] });
    await schlaf(1200);
    const code = Number(q?.code);
    const d = (q?.result === true && q?.data) ? q.data : null;
    if (!d) { zeile.urteil = lieferurteil({ cjCode: code, vid: null, linien: null }); bericht.push(zeile); continue; }

    zeile.cjName = d.productNameEn || d.productName || '';
    const vs = d.variants || [];
    // Jede Variante messen wäre teuer; eine ohne Linie und eine mit entscheidet das Urteil.
    let best = { linien: null, guenstigste: null, name: '', sku: '', ek: null };
    const genannt = zeile.cjVariantSku
      ? vs.filter(v => v.variantSku === zeile.cjVariantSku) : [];
    const zuMessen = [...genannt, ...vs.filter(v => !genannt.includes(v))].slice(0, 4);
    for (const v of zuMessen) {
      if (!v?.vid) continue;
      const f = await fracht(ctok, v.vid);
      const ek = zahl(v.variantSellPrice);
      if (f.linien !== null && (best.linien === null || f.linien > best.linien)) {
        best = { ...f, sku: v.variantSku || '', ek };
      } else if (best.linien === null && f.linien !== null) {
        best = { ...f, sku: v.variantSku || '', ek };
      }
      if (f.linien) break; // eine lieferbare Variante genügt als Beweis
    }
    zeile.linien = best.linien; zeile.fracht = best.guenstigste; zeile.linie = best.name;
    zeile.cjSku = best.sku; zeile.ekUsd = best.ek;
    zeile.urteil = lieferurteil({ cjCode: 200, vid: vs[0]?.vid || null, linien: best.linien });
    if (best.ek !== null && best.guenstigste !== null) {
      zeile.landeChf = Math.round((best.ek + best.guenstigste) * KURS * 100) / 100;
    }

    if (stok) {
      const r = await shopifyGql(SHOP, API, stok,
        `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ status title
           variants(first:1){ nodes{ price sku inventoryItem{ unitCost{ amount } } } } } }`, { h: handle });
      const p = r?.data?.productByIdentifier;
      if (p) {
        zeile.shopStatus = p.status;
        zeile.vk = zahl(p.variants?.nodes?.[0]?.price);
        zeile.shopSku = p.variants?.nodes?.[0]?.sku || '';
      }
    }
    bericht.push(zeile);
  }

  const z = bericht;
  console.log(`\n=== ${z.length} Anfragen · Kurs USD→CHF ${KURS} ===\n`);
  for (const r of z) {
    const u = r.urteil?.urteil || '?';
    const marke = u === 'lieferbar' ? '✅' : u === 'nicht_lieferbar' ? '🚫' : '❓';
    console.log(`${marke} ${r.handle}`);
    console.log(`    CJ-Status ${r.status} · pid ${r.pid || '—'}${r.cjName ? ' · ' + r.cjName.slice(0, 50) : ''}`);
    console.log(`    Urteil: ${u} — ${r.urteil?.grund}`);
    if (r.linien) console.log(`    Fracht: ${r.linien} Linien, günstigste USD ${r.fracht} (${r.linie})`);
    if (r.ekUsd !== null && r.ekUsd !== undefined) console.log(`    EK USD ${r.ekUsd}${r.landeChf ? ` · gelandet CHF ${r.landeChf}` : ''} · CJ-SKU ${r.cjSku}`);
    if (r.vk) {
      const marge = r.landeChf ? Math.round((r.vk - r.landeChf) * 100) / 100 : null;
      console.log(`    Shop: ${r.shopStatus} · VK CHF ${r.vk} · SKU ${r.shopSku}${marge !== null ? ` → Marge CHF ${marge}` : ''}`);
    }
    console.log('');
  }
  const n = u => z.filter(r => r.urteil?.urteil === u).length;
  console.log(`Zusammenfassung: ${n('lieferbar')} lieferbar · ${n('nicht_lieferbar')} nicht lieferbar · ${n('unbekannt')} unbekannt`);
}

main().catch(e => { console.error('Abbruch:', e?.message || e); process.exitCode = 1; });
