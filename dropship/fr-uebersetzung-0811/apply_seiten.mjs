// Französische Übersetzung der Servicepages (Stufe 1, Besitzer 08.11.2026: «übersetzten»).
// Trockenlauf ist Vorgabe. LIVE=1 schreibt über translationsRegister (nur Sprache fr, nur Felder title/body_html/meta_*),
// liest danach jede Seite frisch zurück und vergleicht. ZURUECK=1 LIVE=1 entfernt genau diese fr-Übersetzungen wieder.
// Eingaben: seiten_fr.mjs (Paare Deutsch → Französisch). Das Originaldokument wird frisch gelesen; weicht ein Digest ab
// (Seite inzwischen geändert), wird die Seite übersprungen und gemeldet.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const API = '2025-01';
const SHOP = (process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const NUR = (process.env.NUR || '').split(',').map((s) => s.trim()).filter(Boolean);
const FELDER = ['title', 'body_html', 'meta_title', 'meta_description'];

// ---------- reine Logik (auch vom Test benutzt) ----------
export function paareAnwenden(html, paare) {
  let out = html;
  const probleme = [];
  for (const [de, fr] of paare) {
    const n = out.split(de).length - 1;
    if (n === 0) { probleme.push({ art: 'nicht-gefunden', de: de.slice(0, 80) }); continue; }
    if (n > 1) probleme.push({ art: 'mehrfach', n, de: de.slice(0, 80) });
    out = out.split(de).join(fr);
  }
  return { out, probleme };
}

const DEUTSCH = /\b(und|der|die|das|ist|nicht|für|mit|bei|wir|dein|deine|deinen|deiner|ein|eine|auf|oder|wenn|du|dir|dich|ihr|euch|sind|wird|werden|kann|kannst|noch|nur|auch|aber|schreib|bitte|Werktage|Rückgabe|Versand|Lieferung)\b/i;
export function restDeutsch(html) {
  const text = html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
  const treffer = [];
  for (const zeile of text.split(/(?<=[.!?:])\s+|\s{2,}/)) {
    // «Deutsch · English · Français · Italiano» ist eine Sprachliste und bleibt
    const z = zeile.replace(/Deutsch · English · Français · Italiano/g, '');
    // «du» ist auch französisch (de + le): nur gross am Satzanfang als Deutsch zählen
    const m = z.match(DEUTSCH);
    if (m && !/^du$/.test(m[1])) treffer.push(zeile.trim().slice(0, 100) + '  ← ' + m[1]);
  }
  return treffer;
}

export function planBauen(seitenDe, seitenFr) {
  const plan = [];
  for (const [handle, fr] of Object.entries(seitenFr)) {
    const de = seitenDe.find((s) => s.handle === handle);
    if (!de) { plan.push({ handle, fehler: 'Seite fehlt im Shop' }); continue; }
    const feld = (k) => de.fields.find((f) => f.key === k);
    const felder = [];
    const probleme = [];
    for (const k of FELDER) {
      const f = feld(k);
      if (!f) { probleme.push({ art: 'feld-fehlt', k }); continue; }
      let wert;
      if (k === 'body_html') {
        const r = paareAnwenden(f.value, fr.paare);
        wert = r.out; probleme.push(...r.probleme.map((p) => ({ ...p, k })));
        const rest = restDeutsch(wert);
        if (rest.length) probleme.push({ art: 'restdeutsch', k, treffer: rest.slice(0, 6) });
      } else {
        wert = fr[k];
        if (!wert) probleme.push({ art: 'ohne-uebersetzung', k });
      }
      if (wert != null) felder.push({ key: k, value: wert, digest: f.digest, laenge_de: f.value.length });
    }
    plan.push({ handle, id: de.id, felder, probleme });
  }
  return plan;
}

// ---------- Shopify ----------
async function token() {
  const f = process.env.SHOPIFY_TOKEN_DATEI || '/tmp/cj_shop_token.txt';
  try { const t = readFileSync(f, 'utf8').trim(); if (t) return t; } catch { /* weiter */ }
  const cid = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!cid || !sec) throw new Error('Kein Shopify-Zugang (Tokendatei oder SHOPIFY_CLIENT_ID/SECRET)');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: cid, client_secret: sec, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) });
  const j = await r.json();
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}
const Q_SEITEN = `query($a:String){pages(first:100,after:$a){pageInfo{hasNextPage endCursor}nodes{id handle isPublished}}}`;
const Q_RES = `query($id:ID!){translatableResource(resourceId:$id){resourceId translatableContent{key value digest} translations(locale:"fr"){key value outdated}}}`;
const M_REG = `mutation($id:ID!,$tr:[TranslationInput!]!){translationsRegister(resourceId:$id,translations:$tr){userErrors{field message} translations{key}}}`;
const M_DEL = `mutation($id:ID!,$k:[String!]!){translationsRemove(resourceId:$id,locales:["fr"],translationKeys:$k){userErrors{field message}}}`;

async function seitenLesen(tok, handles) {
  const alle = []; let after = null;
  for (;;) {
    const d = await gql(tok, Q_SEITEN, { a: after });
    alle.push(...d.pages.nodes);
    if (!d.pages.pageInfo.hasNextPage) break; after = d.pages.pageInfo.endCursor;
  }
  const out = [];
  for (const h of handles) {
    const p = alle.find((x) => x.handle === h);
    if (!p) continue;
    const r = (await gql(tok, Q_RES, { id: p.id })).translatableResource;
    out.push({ handle: h, id: p.id, isPublished: p.isPublished, fields: r.translatableContent, fr: r.translations });
  }
  return out;
}

async function main() {
  const { SEITEN } = await import(path.join(HIER, 'seiten_fr.mjs'));
  const handles = Object.keys(SEITEN).filter((h) => !NUR.length || NUR.includes(h));
  const tok = await token();
  const de = await seitenLesen(tok, handles);
  const seiten = Object.fromEntries(handles.map((h) => [h, SEITEN[h]]));
  const plan = planBauen(de, seiten);
  mkdirSync(path.join(HIER, 'lauf'), { recursive: true });

  if (ZURUECK) {
    const ledger = JSON.parse(readFileSync(path.join(HIER, 'lauf', 'seiten_ledger.json'), 'utf8'));
    for (const e of ledger.geschrieben) {
      if (NUR.length && !NUR.includes(e.handle)) continue;
      console.log(`${LIVE ? 'ENTFERNE' : 'WÜRDE ENTFERNEN'} ${e.handle}: ${e.keys.join(',')}`);
      if (LIVE) { const d = await gql(tok, M_DEL, { id: e.id, k: e.keys }); if (d.translationsRemove.userErrors.length) throw new Error(JSON.stringify(d.translationsRemove.userErrors)); }
    }
    return;
  }

  let fehlerzahl = 0;
  const geschrieben = [];
  for (const p of plan) {
    const sofort = (p.probleme || []).filter((x) => x.art !== 'mehrfach');
    console.log(`\n${p.handle}: ${p.felder ? p.felder.length : 0} Felder, Probleme: ${sofort.length}`);
    for (const x of p.probleme || []) console.log('  !', JSON.stringify(x));
    if (p.fehler) { console.log('  ✗', p.fehler); fehlerzahl++; continue; }
    if (sofort.length) { fehlerzahl++; continue; }
    // Digest frisch gegen den Shop (Seite inzwischen geändert?)
    const frisch = de.find((x) => x.handle === p.handle);
    const abw = p.felder.filter((f) => frisch.fields.find((g) => g.key === f.key)?.digest !== f.digest);
    if (abw.length) { console.log('  ✗ Digest weicht ab:', abw.map((a) => a.key).join(',')); fehlerzahl++; continue; }
    if (!LIVE) { console.log('  (Trockenlauf) würde schreiben:', p.felder.map((f) => `${f.key}(${f.value.length})`).join(' ')); continue; }
    const tr = p.felder.map((f) => ({ locale: 'fr', key: f.key, value: f.value, translatableContentDigest: f.digest }));
    const d = await gql(tok, M_REG, { id: p.id, tr });
    const ue = d.translationsRegister.userErrors;
    if (ue.length) { console.log('  ✗ userErrors', JSON.stringify(ue)); fehlerzahl++; continue; }
    geschrieben.push({ handle: p.handle, id: p.id, keys: p.felder.map((f) => f.key) });
    console.log('  ✓ geschrieben');
  }

  if (LIVE && geschrieben.length) {
    // Rücklesen: frisch lesen und vergleichen
    await new Promise((r) => setTimeout(r, 4000));
    const nach = await seitenLesen(tok, geschrieben.map((g) => g.handle));
    let gleich = 0, ungleich = 0;
    for (const g of geschrieben) {
      const pl = plan.find((x) => x.handle === g.handle);
      const n = nach.find((x) => x.handle === g.handle);
      for (const f of pl.felder) {
        const t = n.fr.find((x) => x.key === f.key);
        if (t && t.value === f.value) gleich++; else { ungleich++; console.log('  ✗ Rücklesen ungleich', g.handle, f.key); }
      }
    }
    console.log(`\nRücklesen: ${gleich} gleich, ${ungleich} ungleich`);
    if (ungleich) fehlerzahl++;
    const altPfad = path.join(HIER, 'lauf', 'seiten_ledger.json');
    let alt = { geschrieben: [] };
    try { alt = JSON.parse(readFileSync(altPfad, 'utf8')); } catch { /* neu */ }
    const rest = alt.geschrieben.filter((e) => !geschrieben.some((g) => g.handle === e.handle));
    writeFileSync(altPfad, JSON.stringify({ stand: new Date().toISOString(), geschrieben: [...rest, ...geschrieben] }, null, 1));
  }
  writeFileSync(path.join(HIER, 'lauf', LIVE ? 'seiten_plan_live.json' : 'seiten_plan_trocken.json'), JSON.stringify(plan.map((p) => ({ handle: p.handle, felder: (p.felder || []).map((f) => ({ key: f.key, laenge: f.value.length, laenge_de: f.laenge_de })), probleme: p.probleme })), null, 1));
  console.log(`\n${LIVE ? 'LIVE' : 'Trockenlauf'}: ${plan.length} Seiten, ${fehlerzahl} mit Problemen`);
  process.exit(fehlerzahl ? 2 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
