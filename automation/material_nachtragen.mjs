#!/usr/bin/env node
/**
 * Material nachtragen (Besitzer 27.10.2026: «Material zur Auswahl … und alle anderen auch nachtragen»).
 *
 * Schreibt das Metafeld `mm-google-shopping.material` (single_line_text_field) bei jedem aktiven Produkt, das noch kein Material zeigt
 * UND dessen Material in einer belegten Quelle steht (lib/material.mjs: Produkttext «Material: …» oder CJ-Datenblatt). Der Theme-Block
 * `lux_spezifikationen` zeigt das Feld als Zeile «Material» in «Spezifikationen & Details»; dasselbe Feld füttert das Merchant-Center-Attribut.
 * Nichts wird erfunden: ohne Quelle bleibt das Produkt leer (siehe Zusammenfassung «keine-quelle»).
 *
 * TROCKENLAUF IST VORGABE. LIVE=1 schreibt (25 Produkte je Aufruf), liest danach eine Stichprobe FRISCH zurück und meldet Abweichungen (Exit 3).
 * Aufruf:  node automation/material_nachtragen.mjs                       (Trockenlauf, Plan → /tmp/material_plan.jsonl)
 *          LIVE=1 node automation/material_nachtragen.mjs                (schreiben)
 * Umgebung: PLAN=pfad · ROH=pfad (vorhandene Bulk-Datei statt neuer Abfrage) · ROH_AUS=pfad (Bulk-Rohdaten speichern) · CJ_FAKTEN_CACHE=ordner (Vorgabe /tmp/cj_fakten_cache)
 *           LIMIT=n (höchstens n Schreibvorgänge) · ONLY=handle,handle
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { entscheide, hatMaterial, enZuDe, bereinige, pruefeWert, lederWert } from './lib/material.mjs';

const LIVE = process.env.LIVE === '1';
const PLAN = process.env.PLAN || '/tmp/material_plan.jsonl';
const ROH = process.env.ROH || '';
const CJ_ORDNER = (process.env.CJ_FAKTEN_CACHE || '/tmp/cj_fakten_cache').replace(/\/?$/, '/');
const LIMIT = Number(process.env.LIMIT || 1e9);
const ONLY = new Set((process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean));
const BELEGE = existsSync('dropship/material_belege.json') ? JSON.parse(readFileSync('dropship/material_belege.json', 'utf8')) : {};
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) throw new Error('Kein Shopify-Token');
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);

  let text;
  if (ROH && existsSync(ROH)) text = readFileSync(ROH, 'utf8');
  else {
    const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
    if (lauf && ['CREATED', 'RUNNING'].includes(lauf.status)) throw new Error('Es läuft schon eine Bulk-Abfrage — abwarten');
    const inner = `{ products(query:"status:active") { edges { node { id handle title descriptionHtml options{ name } m:metafield(namespace:"mm-google-shopping", key:"material"){ value } } } } }`;
    const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
    if (m.userErrors?.length) throw new Error(JSON.stringify(m.userErrors));
    for (let i = 0; i < 360; i++) {
      await schlaf(10000);
      const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
      if (s.status === 'COMPLETED') { text = await (await fetch(s.url)).text(); break; }
      if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) throw new Error('Bulk ' + s.status + ' ' + s.errorCode);
    }
    if (!text) throw new Error('Bulk-Abfrage dauert zu lange');
  }

  if (process.env.ROH_AUS) writeFileSync(process.env.ROH_AUS, text);   // Rohdaten für weitere Trockenläufe ohne neue Bulk-Abfrage (ROH=…)
  const z = { gelesen: 0 }, gruende = {}, werte = {}, plan = [], unbekannt = {};
  for (const l of text.split('\n').filter(Boolean)) {
    const o = JSON.parse(l); if (!o.handle) continue;
    if (ONLY.size && !ONLY.has(o.handle)) continue;
    z.gelesen++;
    const datei = CJ_ORDNER + o.handle + '.json';
    const cj = existsSync(datei) ? JSON.parse(readFileSync(datei, 'utf8')) : null;
    // Schon ein Metafeld: nur englische Werte («Silver», «Alloy», «Cotton») ins Deutsche setzen; deutsche bleiben unberührt
    const vorhanden = String(o.m?.value || '').trim();
    if (vorhanden) {
      const cjL = existsSync(CJ_ORDNER + o.handle + '.json') ? JSON.parse(readFileSync(CJ_ORDNER + o.handle + '.json', 'utf8')) : null;
      // «Leather» (CJ-Grobfeld) nur mit Beleg übersetzen; ohne Beleg bleibt der Wert, wie er ist
      const de = /^leather$/i.test(vorhanden) ? lederWert({ titel: o.title, descriptionHtml: o.descriptionHtml, cj: cjL }) : enZuDe(vorhanden);
      if (/^leather$/i.test(vorhanden) && !de) gruende['leder-ohne-beleg'] = (gruende['leder-ohne-beleg'] || 0) + 1;
      if (de && de.toLowerCase() !== vorhanden.toLowerCase()) {
        const sperre = pruefeWert(de, { descriptionHtml: o.descriptionHtml, titel: o.title }, { uebersetzung: true });
        if (sperre) gruende['sperre-uebersetzung'] = (gruende['sperre-uebersetzung'] || 0) + 1;
        else { plan.push({ id: o.id, handle: o.handle, wert: de, alt: vorhanden, quelle: 'uebersetzt' }); werte[de] = (werte[de] || 0) + 1; }
      } else if (!de && !bereinige(vorhanden)) unbekannt[vorhanden] = (unbekannt[vorhanden] || 0) + 1;
      if (!(de && de.toLowerCase() !== vorhanden.toLowerCase())) gruende['schon-da:metafeld'] = (gruende['schon-da:metafeld'] || 0) + 1;
      continue;
    }
    let e = entscheide({ descriptionHtml: o.descriptionHtml, optionen: o.options, metafeld: o.m?.value, cj, titel: o.title });
    // Von Hand belegte Angaben (dropship/material_belege.json) gelten, wenn die Seite sonst noch kein Material zeigt
    if (!e.tun && BELEGE[o.handle]?.wert && !hatMaterial({ descriptionHtml: o.descriptionHtml, optionen: o.options, metafeld: o.m?.value })) e = { tun: true, wert: BELEGE[o.handle].wert, quelle: 'belegt-von-hand' };
    if (e.tun) { plan.push({ id: o.id, handle: o.handle, wert: e.wert, quelle: e.quelle }); werte[e.wert] = (werte[e.wert] || 0) + 1; }
    else { const g = e.grund.split(':').slice(0, 2).join(':').slice(0, 40); gruende[g.startsWith('schon') ? g : g.split(':')[0]] = (gruende[g.startsWith('schon') ? g : g.split(':')[0]] || 0) + 1; }
  }
  writeFileSync(PLAN, plan.map(p => JSON.stringify(p)).join('\n') + (plan.length ? '\n' : ''));
  const quellen = plan.reduce((a, p) => (a[p.quelle] = (a[p.quelle] || 0) + 1, a), {});
  console.log(JSON.stringify({ ...z, zuSchreiben: plan.length, quellen, ohneEintrag: gruende, verschiedeneWerte: Object.keys(werte).length, plan: PLAN }));
  console.log('bestehende Metafeld-Werte, die weder deutsch noch übersetzbar sind (' + Object.keys(unbekannt).length + '):', Object.entries(unbekannt).sort((x, y) => y[1] - x[1]).slice(0, 40).map(([w, n]) => `${w}×${n}`).join(' | '));
  console.log('häufigste Werte:', Object.entries(werte).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w, n]) => `${w}×${n}`).join(' | '));
  if (!LIVE) { console.log('Trockenlauf — nichts geschrieben. LIVE=1 zum Schreiben.'); return; }

  const MUT = `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ key } userErrors{ field message code } } }`;
  const arbeit = plan.slice(0, LIMIT); let ok = 0, fehler = 0, folge = 0; const geschrieben = [];
  for (let i = 0; i < arbeit.length; i += 25) {
    const stueck = arbeit.slice(i, i + 25);
    const w = (await q(MUT, { m: stueck.map(p => ({ ownerId: p.id, namespace: 'mm-google-shopping', key: 'material', type: 'single_line_text_field', value: p.wert })) })).metafieldsSet;
    const bad = new Set((w.userErrors || []).map(e => Number(String(e.field?.[1] ?? '').replace(/\D/g, '')) ).filter(Number.isFinite));
    if (w.userErrors?.length) { fehler += Math.max(1, bad.size); folge++; console.error('metafieldsSet:', JSON.stringify(w.userErrors).slice(0, 300)); if (folge >= 3) { console.error('3 Fehler in Folge — Abbruch'); break; } }
    else folge = 0;
    stueck.forEach((p, k) => { if (!bad.has(k)) { ok++; geschrieben.push(p); } });
    if ((i / 25) % 20 === 19) console.log(`  … ${ok} geschrieben`);
    await schlaf(250);
  }
  appendFileSync('dropship/material_ledger.txt', `${new Date().toISOString()} · material nachgetragen · ${ok} Produkte (Fehler ${fehler}) · Quellen ${JSON.stringify(quellen)}\n`);

  // Frisch zurücklesen: 25 zufällige geschriebene Produkte
  const probe = geschrieben.slice().sort(() => Math.random() - .5).slice(0, 25); let abw = 0;
  for (const p of probe) {
    const d = await q(`query($id:ID!){product(id:$id){m:metafield(namespace:"mm-google-shopping", key:"material"){value}}}`, { id: p.id });
    if (d.product?.m?.value !== p.wert) { abw++; console.error('ABWEICHUNG', p.handle, JSON.stringify(d.product?.m?.value), 'statt', p.wert); }
  }
  console.log(JSON.stringify({ geschrieben: ok, fehler, stichprobe: probe.length, abweichungen: abw }));
  if (abw) process.exit(3);
}
main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
