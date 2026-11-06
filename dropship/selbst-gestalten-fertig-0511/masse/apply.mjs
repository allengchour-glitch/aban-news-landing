// «Selbst gestalten»: Schweizer Masse (kein Zoll/oz/lb/US gal) in Beschreibung, SEO-Text und Optionswerten (Trockenlauf Vorgabe).
//   Trockenlauf:  node apply.mjs        Schreiben: LIVE=1 node apply.mjs        Rücknahme: ZURUECK=1 LIVE=1 node apply.mjs
//   Exit: 0 gut · 3 Rest an Imperialem übrig (nicht erkannte Schreibweise, nichts geschrieben für dieses Produkt) · 6 Abweichung beim Rücklesen · 1/2 Fehler
// Nur Beschreibung (Textknoten), SEO-Beschreibung und Optionswerte-Namen; IDs, SKUs, Preise, Bilder, Titel, Tags bleiben.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
import { bereinigeHtml, bereinigeText, bereinigeWert, restImperial } from './masse_bereinigen.mjs';
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const HIER = new URL('.', import.meta.url).pathname;
const SICH = process.env.SICHERUNG || HIER + 'sicherung.json';
const NUR = (process.env.NUR || '').split(',').map((s) => s.trim()).filter(Boolean);
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const pause = (ms) => new Promise((s) => setTimeout(s, ms));
const FELD = `id handle title status descriptionHtml seo{title description} options{id name optionValues{id name}}`;
const fehler = (j, name) => { if (!j) throw new Error(name + ': leere Antwort'); if (j.userErrors?.length) throw new Error(name + ': ' + JSON.stringify(j.userErrors)); };
const holeAlle = async () => {
  const m = new Map();
  for (const tag of ['wunschdesign', 'printful_personalized_product']) {
    let after = null;
    for (let s = 0; s < 8; s++) {
      const j = await q(`query($q:String!,$a:String){products(first:50,query:$q,after:$a){nodes{${FELD}}pageInfo{hasNextPage endCursor}}}`, { q: `tag:${tag}`, a: after });
      for (const p of j.products.nodes) if (/gestalten/.test(p.handle) && (!NUR.length || NUR.includes(p.handle))) m.set(p.handle, p);
      if (!j.products.pageInfo.hasNextPage) break; after = j.products.pageInfo.endCursor;
    }
  }
  return m;
};
const lies = async (handle) => { const n = (await q(`query($h:String!){products(first:2,query:$h){nodes{${FELD}}}}`, { h: `handle:${handle}` })).products.nodes.filter((p) => p.handle === handle); if (n.length !== 1) throw new Error('Produkt nicht eindeutig: ' + handle); return n[0]; };
const bis = async (name, pruefe, versuche = 6, ms = 2500) => { for (let i = 0; i < versuche; i++) { await pause(ms); if (await pruefe()) return true; } console.log('  ABWEICHUNG nach', versuche, 'Versuchen:', name); return false; };
const speichere = (s) => writeFileSync(SICH, JSON.stringify(s, null, 1));
const schreibe = async (p, desc, seoDesc, werte) => {
  if (desc !== null || seoDesc !== null) {
    const input = { id: p.id }; if (desc !== null) input.descriptionHtml = desc; if (seoDesc !== null) input.seo = { title: p.seo?.title ?? null, description: seoDesc };
    fehler((await q(`mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}`, { p: input })).productUpdate, 'productUpdate');
  }
  const nachOption = werte.reduce((m, w) => { (m[w.optionId] ||= []).push(w); return m; }, {});
  for (const [optionId, ws] of Object.entries(nachOption)) {
    fehler((await q(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v){userErrors{field message}}}`, { p: p.id, o: { id: optionId }, v: ws.map((w) => ({ id: w.id, name: w.neu })) })).productOptionUpdate, 'productOptionUpdate');
  }
};

if (ZURUECK) {
  const s = JSON.parse(readFileSync(SICH, 'utf8')); let nf = 0;
  for (const x of s.produkte) {
    const p = await lies(x.handle); let schreib = false;
    const desc = p.descriptionHtml === x.neu.descriptionHtml ? x.alt.descriptionHtml : null;
    const seo = x.neu.seoDescription !== null && p.seo?.description === x.neu.seoDescription ? x.alt.seoDescription : null;
    const werte = [];
    for (const w of x.werte || []) { const ist = p.options.flatMap((o) => o.optionValues).find((v) => v.id === w.id); if (ist && ist.name === w.neu) werte.push({ optionId: w.optionId, id: w.id, neu: w.alt }); }
    if (desc === null && seo === null && !werte.length) { console.log('nichts zurückzusetzen (weicht ab oder schon alt):', x.handle); continue; }
    console.log('zurück:', x.handle, desc !== null ? 'Text' : '', seo !== null ? 'SEO' : '', werte.length ? werte.length + ' Werte' : '');
    if (!LIVE) continue;
    await schreibe(p, desc, seo, werte); schreib = true;
    const ok = await bis('zurück ' + x.handle, async () => { const n = await lies(x.handle); return (desc === null || n.descriptionHtml === x.alt.descriptionHtml) && (seo === null || n.seo?.description === x.alt.seoDescription); });
    console.log('  rücklesen', ok ? 'GLEICH' : 'ABWEICHUNG'); if (!ok) nf++;
  }
  console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf, nichts geschrieben'); process.exit(nf ? 6 : 0);
}

const alle = await holeAlle();
const sich = existsSync(SICH) ? JSON.parse(readFileSync(SICH, 'utf8')) : { produkte: [] };
const plan = []; let rest3 = false;
for (const p of alle.values()) {
  const d = bereinigeHtml(p.descriptionHtml);
  const seoNeu = p.seo?.description ? bereinigeText(p.seo.description).text : null;
  const werte = [];
  for (const o of p.options) for (const v of o.optionValues) { const neu = bereinigeWert(v.name); if (neu) werte.push({ optionId: o.id, id: v.id, option: o.name, alt: v.name, neu }); }
  const descNeu = d.html !== p.descriptionHtml ? d.html : null;
  const seoAendert = seoNeu !== null && seoNeu !== p.seo.description ? seoNeu : null;
  const rest = [...restImperial(d.html), ...(seoNeu ? restImperial(seoNeu) : []), ...werte.flatMap((w) => restImperial(w.neu))];
  if (!descNeu && !seoAendert && !werte.length && !rest.length) continue;
  console.log(`\n## ${p.handle} (${p.status}) | Text: ${descNeu ? d.treffer.join(', ') : '-'} | SEO: ${seoAendert ? 'ja' : '-'} | Optionswerte: ${werte.map((w) => `${w.alt} → ${w.neu}`).join(' ; ') || '-'}`);
  if (seoAendert) console.log('   SEO neu:', seoAendert);
  if (process.env.DIFF && descNeu) { const a = p.descriptionHtml.split(/(<br\s*\/?>|\n)/), b = d.html.split(/(<br\s*\/?>|\n)/); a.forEach((z, i) => { if (z !== b[i]) console.log('   - ' + z.replace(/<[^>]+>/g, '').trim().slice(0, 200) + '\n   + ' + b[i].replace(/<[^>]+>/g, '').trim().slice(0, 200)); }); }
  if (rest.length) { rest3 = true; console.log('   ⚠ REST imperial (nicht erkannt, Produkt wird NICHT geschrieben):', rest.slice(0, 5).join(' | ')); }
  else plan.push({ p, descNeu, seoAendert, werte });
}
console.log(`\nzu ändern: ${plan.length} Produkte | mit Rest: ${rest3 ? 'ja' : 'nein'}`);
if (!LIVE) { console.log('Trockenlauf, nichts geschrieben'); process.exit(rest3 ? 3 : 0); }

let nf = 0;
for (const { p, descNeu, seoAendert, werte } of plan) {
  if (!sich.produkte.some((x) => x.handle === p.handle)) {
    sich.produkte.push({ handle: p.handle, id: p.id, alt: { descriptionHtml: p.descriptionHtml, seoDescription: p.seo?.description ?? null }, neu: { descriptionHtml: descNeu ?? p.descriptionHtml, seoDescription: seoAendert ?? p.seo?.description ?? null }, werte: werte.map((w) => ({ optionId: w.optionId, id: w.id, alt: w.alt, neu: w.neu })) });
    speichere(sich);
  }
  await schreibe(p, descNeu, seoAendert, werte);
  const ok = await bis(p.handle, async () => {
    const n = await lies(p.handle);
    if (descNeu !== null && n.descriptionHtml !== descNeu) return false;
    if (seoAendert !== null && n.seo?.description !== seoAendert) return false;
    for (const w of werte) { const v = n.options.flatMap((o) => o.optionValues).find((x) => x.id === w.id); if (!v || v.name !== w.neu) return false; }
    return true;
  });
  console.log(`rücklesen ${p.handle}: ${ok ? 'GLEICH' : 'ABWEICHUNG'}`); if (!ok) nf++;
}
process.exit(nf ? 6 : rest3 ? 3 : 0);
