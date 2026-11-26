#!/usr/bin/env node
/**
 * Titel-Wahrheit 26.11.2026: korrigiert die Produkttitel aus PRODUKTDATEN-MAENGEL.md, deren Titel etwas anderes
 * verspricht als Bild und Datenblatt (Kapuzenpullover ohne Kapuze, «Automatische» Uhr mit Quarz-Angabe, Handtasche,
 * die eine Reisetasche ist …). Skill: .claude/skills/titel-wahrheit/SKILL.md.
 *
 * Eingabe plan.json: { "<handle>": { titel, seo: { title, description }, beleg } }  (SEO vorab mit seoTitel() gerechnet)
 *
 * TROCKENLAUF IST VORGABE: liest jedes Produkt, schreibt beim ersten Lauf sicherung.json (Titel + SEO vorher) und zeigt
 * alt -> neu. LIVE=1 schreibt (nur mit vorhandener Sicherung), liest jedes Produkt danach frisch zurück und bricht beim
 * ersten Fehler oder jeder Abweichung ab. ZURUECK=1 LIVE=1 setzt Titel und SEO aus sicherung.json zurück.
 *
 * Warum eigenes Skript statt automation/titel_korrigieren.mjs: jenes erzeugt die SEO-Beschreibung immer neu (Falle 1
 * im Skill) und würde handgeschriebene Beschreibungen überschreiben; hier steht jede SEO-Beschreibung im Plan, die
 * nicht fehlerhaften bleiben unverändert. Shopify-`seo` ist ein ERSETZEN: Titel und Beschreibung gehen immer zusammen.
 * Shopify speichert einen SEO-Titel, der gleich dem Produkttitel ist, als null - das Rücklesen akzeptiert das.
 *
 * Aufruf (Repo-Wurzel, Node 22): NODE_USE_ENV_PROXY=1 [LIVE=1] [ZURUECK=1] node dropship/startseite-saison-2411/titel-wahrheit/titel_wahrheit.mjs
 * Zugang: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const PLAN = process.env.PLAN || join(HIER, 'plan.json');
const SICHERUNG = process.env.SICHERUNG || join(HIER, 'sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const SHOP = process.env.SHOPIFY_SHOP;
const CS = (String(process.env.SHOPIFY_CLIENT_SECRET || '').trim().match(/^shpss_[0-9a-f]{32}/) || [String(process.env.SHOPIFY_CLIENT_SECRET || '').trim()])[0];

const tr = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const TOK = (await tr.json()).access_token;
if (!TOK) { console.error('Kein Shopify-Token'); process.exit(1); }

async function gql(query, variables) {
  for (let versuch = 1; ; versuch++) {
    const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOK }, body: JSON.stringify({ query, variables }) });
    const txt = await r.text();
    let j; try { j = JSON.parse(txt); } catch { j = null; }
    const gedrosselt = r.status === 429 || r.status >= 500 || /throttled/i.test(JSON.stringify(j?.errors || ''));
    if (gedrosselt && versuch < 6) { await new Promise((s) => setTimeout(s, 1500 * versuch)); continue; }
    if (!r.ok || !j || j.errors) throw new Error(`GraphQL HTTP ${r.status}: ${txt.slice(0, 300)}`);
    return j.data;
  }
}

const LESEN = `query($h:String!){productByHandle(handle:$h){id title status updatedAt seo{title description}}}`;
const SCHREIBEN = `mutation($i:ProductInput!){productUpdate(input:$i){product{id} userErrors{field message}}}`;
const lesen = async (h) => (await gql(LESEN, { h })).productByHandle;

/** Shopify legt einen SEO-Titel gleich dem Produkttitel als null ab. */
function gleichSoll(p, soll) {
  const seoTitelOk = p.seo.title === soll.seo.title || (p.seo.title == null && (soll.seo.title == null || soll.seo.title === soll.titel));
  return p.title === soll.titel && seoTitelOk && (p.seo.description ?? null) === (soll.seo.description ?? null);
}

const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
let ziel = plan;
if (ZURUECK) {
  if (!existsSync(SICHERUNG)) { console.error('Keine sicherung.json - Rücknahme unmöglich'); process.exit(2); }
  const s = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  ziel = Object.fromEntries(Object.entries(s).map(([h, v]) => [h, { titel: v.title, seo: { title: v.seo.title ?? v.title, description: v.seo.description } }]));
}

if (!LIVE) {
  const sicherung = {};
  for (const [h, soll] of Object.entries(ziel)) {
    const p = await lesen(h);
    if (!p) { console.log(`✗ ${h}: nicht gefunden`); process.exit(3); }
    sicherung[h] = { id: p.id, status: p.status, updatedAt: p.updatedAt, title: p.title, seo: p.seo };
    console.log(`[Trockenlauf] ${h} (${p.status})`);
    if (gleichSoll(p, soll)) { console.log('   schon im Soll'); continue; }
    console.log(`   Titel     «${p.title}» → «${soll.titel}»`);
    if (p.seo.title !== soll.seo.title) console.log(`   SEO-Titel «${p.seo.title}» → «${soll.seo.title}»`);
    if (p.seo.description !== soll.seo.description) console.log(`   SEO-Text  «${p.seo.description}»\n          → «${soll.seo.description}»`);
  }
  if (!ZURUECK && !existsSync(SICHERUNG)) { writeFileSync(SICHERUNG, JSON.stringify(sicherung, null, 1) + '\n'); console.log(`\nSicherung geschrieben: ${SICHERUNG}`); }
  console.log(`\nTROCKENLAUF: ${Object.keys(ziel).length} Produkte gelesen, nichts geschrieben.`);
  process.exit(0);
}

if (!existsSync(SICHERUNG)) { console.error('LIVE ohne sicherung.json verweigert: erst den Trockenlauf fahren und die Sicherung committen.'); process.exit(2); }
const sicherung = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
let geschrieben = 0, schon = 0;
for (const [h, soll] of Object.entries(ziel)) {
  const p = await lesen(h);
  if (!p) { console.log(`✗ ${h}: nicht gefunden`); process.exit(3); }
  if (gleichSoll(p, soll)) { console.log(`= ${h}: schon im Soll`); schon++; continue; }
  const alt = sicherung[h];
  const erwartetVorher = ZURUECK ? plan[h] : { titel: alt?.title, seo: { title: alt?.seo?.title, description: alt?.seo?.description } };
  if (!alt || p.title !== erwartetVorher.titel) { console.log(`✗ ${h}: Titel seit der Sicherung verändert («${p.title}») - Abbruch`); process.exit(4); }
  const u = (await gql(SCHREIBEN, { i: { id: p.id, title: soll.titel, seo: { title: soll.seo.title, description: soll.seo.description } } })).productUpdate;
  if (u.userErrors.length) { console.log(`✗ ${h}: ${JSON.stringify(u.userErrors)}`); process.exit(5); }
  const n = await lesen(h);
  if (!gleichSoll(n, soll)) { console.log(`✗ ${h}: ABWEICHUNG nach dem Schreiben: ${JSON.stringify({ title: n.title, seo: n.seo })}`); process.exit(6); }
  console.log(`✓ ${h}: «${n.title}» · SEO-Titel ${n.seo.title === null ? 'null (= Produkttitel)' : '«' + n.seo.title + '»'} · GLEICH`);
  geschrieben++;
}
console.log(`\n${ZURUECK ? 'ZURÜCKGESETZT' : 'GEÄNDERT'}: ${geschrieben} · schon im Soll ${schon} · alle frisch zurückgelesen`);
