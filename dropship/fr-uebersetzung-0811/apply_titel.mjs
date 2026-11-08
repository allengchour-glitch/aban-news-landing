// Französische Titel für Menü-Links, Menüs und Sammlungen (Stufe 2, Besitzer 08.11.2026: «übersetzen»).
// Trockenlauf ist Vorgabe. LIVE=1 schreibt über translationsRegister (nur Sprache fr, nur das Feld «title», nur wo noch
// KEINE französische Übersetzung steht; vorhandene werden nie überschrieben). Danach frisch zurückgelesen.
// ZURUECK=1 LIVE=1 entfernt genau die im Ledger stehenden Titel wieder.
// TYP=LINK,MENU,COLLECTION (Vorgabe LINK,MENU) · MAX=n begrenzt die Zahl der Schreibungen (Stichprobe).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const API = '2025-01';
const SHOP = (process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const LIVE = process.env.LIVE === '1';
const ZURUECK = process.env.ZURUECK === '1';
const TYPEN = (process.env.TYP || 'LINK,MENU').split(',').map((s) => s.trim()).filter(Boolean);
const MAX = parseInt(process.env.MAX || '0', 10) || Infinity;
const PARALLEL = 4;

// ---------- reine Logik (auch vom Test benutzt) ----------
export function planTitel(ressourcen, woerterbuch) {
  const plan = []; const ohne = new Map(); let schonFr = 0, ohneTitel = 0;
  for (const r of ressourcen) {
    const t = (r.translatableContent || []).find((c) => c.key === 'title');
    if (!t || !t.value) { ohneTitel++; continue; }
    if ((r.translations || []).some((x) => x.key === 'title' && x.value)) { schonFr++; continue; }
    const fr = woerterbuch[t.value];
    if (!fr) { ohne.set(t.value, (ohne.get(t.value) || 0) + 1); continue; }
    plan.push({ id: r.resourceId, de: t.value, fr, digest: t.digest });
  }
  return { plan, ohneEintrag: [...ohne.entries()].sort((a, b) => b[1] - a[1]), schonFr, ohneTitel };
}

export async function woerterbuchLaden() {
  const W = {};
  for (const [datei, name] of [['menue_fr_1.mjs', 'T1'], ['menue_fr_2.mjs', 'T2'], ['menue_fr_3.mjs', 'T3'], ['sammlungen_fr_1.mjs', 'C1'], ['sammlungen_fr_2.mjs', 'C2'], ['sammlungen_fr_3.mjs', 'C3'], ['sammlungen_fr_4.mjs', 'C4']]) {
    try {
      const m = await import(path.join(HIER, datei));
      for (const [de, fr] of Object.entries(m[name] || {})) { if (de in W && W[de] !== fr) throw new Error(`Widerspruch im Wörterbuch: «${de}»`); W[de] = fr; }
    } catch (e) { if (!/Cannot find module|ERR_MODULE_NOT_FOUND/.test(String(e.message))) throw e; }
  }
  return W;
}

// ---------- Shopify ----------
async function token() {
  const f = process.env.SHOPIFY_TOKEN_DATEI || '/tmp/cj_shop_token.txt';
  try { const t = readFileSync(f, 'utf8').trim(); if (t) return t; } catch { /* weiter */ }
  const cid = process.env.SHOPIFY_CLIENT_ID, sec = process.env.SHOPIFY_CLIENT_SECRET;
  if (!cid || !sec) throw new Error('Kein Shopify-Zugang');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: cid, client_secret: sec, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(tok, q, v, versuch = 0) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v }) });
  const j = await r.json();
  const gedrosselt = (j.errors || []).some((e) => /throttl/i.test(JSON.stringify(e))) || r.status === 429;
  if (gedrosselt && versuch < 6) { await new Promise((s) => setTimeout(s, 1500 * (versuch + 1))); return gql(tok, q, v, versuch + 1); }
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}
const Q_ALLE = `query($t:TranslatableResourceType!,$a:String){translatableResources(first:100,resourceType:$t,after:$a){pageInfo{hasNextPage endCursor}nodes{resourceId translatableContent{key value digest} translations(locale:"fr"){key value}}}}`;
const M_REG = `mutation($id:ID!,$tr:[TranslationInput!]!){translationsRegister(resourceId:$id,translations:$tr){userErrors{field message}}}`;
const M_DEL = `mutation($id:ID!,$k:[String!]!){translationsRemove(resourceId:$id,locales:["fr"],translationKeys:$k){userErrors{field message}}}`;

async function alleLesen(tok, typ) {
  const out = []; let after = null;
  for (;;) {
    const d = await gql(tok, Q_ALLE, { t: typ, a: after });
    out.push(...d.translatableResources.nodes);
    if (!d.translatableResources.pageInfo.hasNextPage) break; after = d.translatableResources.pageInfo.endCursor;
  }
  return out;
}

async function parallel(items, n, fn) {
  let i = 0; const res = [];
  await Promise.all(Array.from({ length: n }, async () => { for (;;) { const k = i++; if (k >= items.length) return; res[k] = await fn(items[k], k); } }));
  return res;
}

async function main() {
  const W = await woerterbuchLaden();
  const tok = await token();
  mkdirSync(path.join(HIER, 'lauf'), { recursive: true });
  const ledgerPfad = path.join(HIER, 'lauf', 'titel_ledger.json');
  let ledger = { eintraege: [] };
  try { ledger = JSON.parse(readFileSync(ledgerPfad, 'utf8')); } catch { /* neu */ }

  if (ZURUECK) {
    const ziele = ledger.eintraege.filter((e) => TYPEN.includes(e.typ));
    console.log(`${LIVE ? 'ENTFERNE' : 'WÜRDE ENTFERNEN'}: ${ziele.length} Titel (${TYPEN.join(',')})`);
    if (LIVE) {
      await parallel(ziele, PARALLEL, async (e) => { const d = await gql(tok, M_DEL, { id: e.id, k: ['title'] }); if (d.translationsRemove.userErrors.length) throw new Error(JSON.stringify(d.translationsRemove.userErrors)); });
      ledger.eintraege = ledger.eintraege.filter((e) => !TYPEN.includes(e.typ));
      writeFileSync(ledgerPfad, JSON.stringify(ledger));
    }
    return;
  }

  let fehler = 0;
  for (const typ of TYPEN) {
    const res = await alleLesen(tok, typ);
    const { plan, ohneEintrag, schonFr, ohneTitel } = planTitel(res, W);
    const teil = plan.slice(0, MAX);
    console.log(`\n${typ}: ${res.length} Ressourcen, schon fr ${schonFr}, ohne Titel ${ohneTitel}, im Plan ${plan.length}${teil.length < plan.length ? ` (begrenzt auf ${teil.length})` : ''}, ohne Wörterbuch-Eintrag ${ohneEintrag.reduce((s, [, n]) => s + n, 0)} (${ohneEintrag.length} verschiedene)`);
    if (ohneEintrag.length) console.log('  Beispiele ohne Eintrag:', ohneEintrag.slice(0, 8).map(([t, n]) => `${t}×${n}`).join(' | '));
    if (!LIVE) continue;
    let ok = 0, bad = 0;
    await parallel(teil, PARALLEL, async (p) => {
      try {
        const d = await gql(tok, M_REG, { id: p.id, tr: [{ locale: 'fr', key: 'title', value: p.fr, translatableContentDigest: p.digest }] });
        if (d.translationsRegister.userErrors.length) { bad++; console.log('  ✗', p.de, JSON.stringify(d.translationsRegister.userErrors)); return; }
        ok++; ledger.eintraege.push({ typ, id: p.id, de: p.de, fr: p.fr });
      } catch (e) { bad++; console.log('  ✗', p.de, String(e.message).slice(0, 120)); }
    });
    writeFileSync(ledgerPfad, JSON.stringify(ledger));
    console.log(`  geschrieben ${ok}, Fehler ${bad}`);
    if (bad) fehler++;
    // Rücklesen
    await new Promise((s) => setTimeout(s, 4000));
    const nach = await alleLesen(tok, typ);
    const nachMap = new Map(nach.map((r) => [r.resourceId, r]));
    let gleich = 0, ungleich = 0;
    for (const p of teil) {
      const r = nachMap.get(p.id); const t = r?.translations.find((x) => x.key === 'title');
      if (t && t.value === p.fr) gleich++; else { ungleich++; if (ungleich <= 5) console.log('  ✗ Rücklesen ungleich:', p.de); }
    }
    console.log(`  Rücklesen: ${gleich} gleich, ${ungleich} ungleich`);
    if (ungleich) fehler++;
  }
  console.log(`\n${LIVE ? 'LIVE' : 'Trockenlauf'} beendet, ${fehler} Läufe mit Problemen`);
  process.exit(fehler ? 2 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch((e) => { console.error(e); process.exit(1); });
