#!/usr/bin/env node
/**
 * Fakten-Block auf Produktseiten setzen: Technische Daten, Lieferumfang, Anleitung, Hinweise — NUR aus dem CJ-Datenblatt.
 * Regeln und Prüfungen: automation/lib/fakten_block.mjs (Zahlen-Gegenprobe, Markensperre, Mindestsubstanz).
 *
 * TROCKENLAUF IST VORGABE (LIVE=1 schreibt). Je Produkt wird der fertige Block in OUT geschrieben, damit man ihn vor dem Scharflauf liest.
 * CJ-Antworten werden in /tmp/cj_fakten_cache zwischengespeichert: Trockenlauf und Scharflauf kosten zusammen einen Abruf.
 *
 * Aufruf:  HANDLES=a,b node automation/cj_fakten_block.mjs                         (Trockenlauf)
 *          LISTE=scratch/traffic_top150.csv LIMIT=40 node automation/cj_fakten_block.mjs
 *          LIVE=1 HANDLES=… node automation/cj_fakten_block.mjs
 * Schalter: OUT=/tmp/fakten_vorschau · FORCE=1 (Produkte mit Marker nochmals) · KEIN_LLM=1 (nur Quelltext zeigen)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { cjFetch, WEICHE_CODES } from './lib/cj_fetch.mjs';
import { GROQ_MODELLE } from './lib/uebersetzen.mjs';
import { MARKER, strategien, quelleAus, saeubern, genug, renderBlock, einsetzen, wissenFuer, auftrag, htmlZuText } from './lib/fakten_block.mjs';

const LIVE = process.env.LIVE === '1', FORCE = process.env.FORCE === '1', KEIN_LLM = process.env.KEIN_LLM === '1';
const OUT = process.env.OUT || '/tmp/fakten_vorschau', CACHE = '/tmp/cj_fakten_cache';
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const schlaf = ms => new Promise(r => setTimeout(r, ms));

/** Ein Aufruf, der JSON liefern muss: Gemini, sonst Groq. null = beide ohne brauchbare Antwort. */
async function modellJson(prompt) {
  const gk = (process.env.GEMINI_API_KEY || '').trim(), qk = (process.env.GROQ_API_KEY || '').trim();
  const lies = text => { try { const t = String(text || '').replace(/^```(json)?/i, '').replace(/```$/, '').trim(); const a = t.indexOf('{'), b = t.lastIndexOf('}'); return JSON.parse(t.slice(a, b + 1)); } catch { return null; } };
  const gruende = [];
  if (gk) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(gk)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { const o = lies((j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')); if (o) return { o, weg: 'gemini' }; gruende.push('Gemini: Antwort nicht lesbar'); }
      else gruende.push(`Gemini HTTP ${r.status} ${String(j?.error?.message || '').slice(0, 80)}`);
    } catch (e) { gruende.push('Gemini: ' + e.message); }
  }
  if (qk) {
    for (const modell of GROQ_MODELLE) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${qk}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modell, temperature: 0, messages: [{ role: 'user', content: prompt }] }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { const o = lies(j?.choices?.[0]?.message?.content); if (o) return { o, weg: 'groq' }; gruende.push(`Groq ${modell}: Antwort nicht lesbar`); }
        else gruende.push(`Groq ${modell} HTTP ${r.status}`);
      } catch (e) { gruende.push(`Groq ${modell}: ${e.message}`); }
    }
  }
  return { o: null, weg: 'keins', gruende };
}

async function cjProdukt(cj, handle, sku) {
  const datei = `${CACHE}/${handle}.json`;
  if (existsSync(datei)) { try { return JSON.parse(readFileSync(datei, 'utf8')); } catch { /* neu holen */ } }
  for (const [art, wert] of strategien(sku)) {
    const r = await cjFetch(`${BASE}/product/query?${art}=${encodeURIComponent(wert)}`, { context: 'Fakten', headers: { 'CJ-Access-Token': cj }, weicheCodes: WEICHE_CODES });
    await schlaf(1100);
    if (r?.data?.pid || r?.data?.productNameEn) { writeFileSync(datei, JSON.stringify(r.data)); return r.data; }
  }
  return null;
}

async function main() {
  mkdirSync(OUT, { recursive: true }); mkdirSync(CACHE, { recursive: true });
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const cj = await cjToken(); if (!cj) { console.error('Kein CJ-Token (CJ_EMAIL/CJ_API_KEY)'); process.exit(1); }

  let handles = (process.env.HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!handles.length && process.env.LISTE) handles = readFileSync(process.env.LISTE, 'utf8').split('\n').slice(1).map(z => z.split(';')[0].trim()).filter(Boolean);
  handles = handles.slice(0, Number(process.env.LIMIT || 1000));
  if (!handles.length) { console.error('HANDLES=a,b oder LISTE=datei.csv angeben'); process.exit(1); }

  const stat = { geschrieben: 0, vorschau: 0, uebersprungen: 0, fehler: 0 }; const gruende = {};
  const weg = (grund) => { stat.uebersprungen++; gruende[grund] = (gruende[grund] || 0) + 1; };
  for (const h of handles) {
    try {
      const p = (await q(`query($h:String!){productByHandle(handle:$h){id title status descriptionHtml variants(first:1){nodes{sku}}}}`, { h })).productByHandle;
      if (!p) { console.log(`${h}: nicht gefunden`); weg('nicht gefunden'); continue; }
      if (p.status !== 'ACTIVE') { console.log(`${h}: ${p.status} — übersprungen`); weg('nicht aktiv'); continue; }
      if (!FORCE && p.descriptionHtml.includes(MARKER)) { console.log(`${h}: hat schon einen Fakten-Block`); weg('schon bearbeitet'); continue; }
      const c = await cjProdukt(cj, h, p.variants.nodes[0]?.sku);
      if (!c) { console.log(`${h}: keine CJ-Daten (SKU ${p.variants.nodes[0]?.sku})`); weg('keine CJ-Daten'); continue; }
      const quelle = quelleAus(c);
      if (KEIN_LLM) { console.log(`\n#### ${h}\n${quelle.text}`); continue; }
      const wissen = wissenFuer(p.title, quelle.kategorie);
      const m = await modellJson(auftrag(quelle.text, p.title));
      if (!m.o) { console.log(`${h}: Modell ohne Antwort (${(m.gruende || []).join(' · ') || 'kein Schlüssel'})`); weg('Modell ohne Antwort'); continue; }
      const s = saeubern(m.o, quelle.text, htmlZuText(p.descriptionHtml));
      if (!genug(s) && !wissen) { console.log(`${h}: zu wenig belegte Angaben (${s.belegt}${s.verworfen.length ? ', verworfen ' + s.verworfen.length : ''}) — kein Block`); weg('zu wenig Quellfakten'); continue; }
      const block = renderBlock(s, { wissen });
      const neu = einsetzen(p.descriptionHtml, block);
      writeFileSync(`${OUT}/${h}.html`, block);
      console.log(`${h}: ${s.daten.length} Daten · ${s.lieferumfang.length} Lieferumfang · ${s.anleitung.length} Schritte · ${s.hinweise.length} Hinweise${wissen ? ' · +Wissen' : ''}${s.verworfen.length ? ` · ${s.verworfen.length} verworfen` : ''} [${m.weg}]`);
      if (!LIVE) { stat.vorschau++; continue; }
      const u = (await q(`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`, { i: { id: p.id, descriptionHtml: neu } })).productUpdate;
      if (u.userErrors.length) { console.log(`   ✗ ${JSON.stringify(u.userErrors)}`); stat.fehler++; continue; }
      appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · fakten ${h}\n`);
      stat.geschrieben++;
    } catch (e) {
      stat.fehler++; console.log(`${h}: FEHLER ${e.message}`);
      if (/CJ_QUOTA/.test(e.message)) { console.log('CJ-Tagespunkte erschöpft — Lauf endet.'); break; }
    }
  }
  console.log(`\n${LIVE ? 'GESCHRIEBEN' : 'VORSCHAU'}: ${LIVE ? stat.geschrieben : stat.vorschau} · übersprungen ${stat.uebersprungen} (${Object.entries(gruende).map(([k, v]) => `${k} ${v}`).join(', ') || '–'}) · Fehler ${stat.fehler}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
