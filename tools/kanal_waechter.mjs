#!/usr/bin/env node
/**
 * kanal_waechter.mjs — findet richtlinien-heikle Produkte, die in Werbekanaelen stehen.
 *
 *   node tools/kanal_waechter.mjs              pruefen (Exit 1 bei Befund)
 *   node tools/kanal_waechter.mjs --selbsttest Gegenprobe
 *
 * WARUM: Google Shopping und Meta verbieten Tabak- und Rauchzubehoer. Google Shopping ist mit
 * rund 32'800 fuer die Schweiz freigegebenen Angeboten die groesste Gratis-Reichweite des Shops.
 * Ein einziges verbotenes Angebot kann das Konto kosten.
 *
 * GEMESSEN am 2026-09-12: von 104 Produkten in "Kiffer- & Smoke-Zubehoer (18+)" standen
 * **2** in allen sechs Kanaelen (die zwei NEUESTEN), 102 korrekt in zwei. Die Beschraenkung war
 * also einmal angewandt und spaeter Zugaenge nicht erfasst. Genau das faellt ohne Waechter
 * niemandem auf: es gibt keine Fehlermeldung, nur ein stilles Risiko.
 *
 * WIE DIE REGEL GEDACHT IST (damit das Geraet nicht Absicht als Fehler zaehlt):
 * Heikel ist ein Produkt nicht wegen seines Titels, sondern weil ein MENSCH es in eine
 * heikle Collection gelegt hat. Ein Messerschaerfer ist Kuechenwerkzeug, ein Aschenbecher in
 * der Deko-Abteilung ist Deko. Darum zaehlt ausschliesslich die Collection-Zugehoerigkeit.
 *
 * ENV: SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET + SHOPIFY_SHOP (oder SHOPIFY_ADMIN_TOKEN)
 */
const API = process.env.SHOPIFY_API_VERSION || '2025-07';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';

/** Collections, deren Produkte NUR in Onlineshop + Shop gehoeren. */
export const HEIKEL = ['smoke-zubehoer'];
/** Kanaele, die fuer heikle Produkte erlaubt sind. */
export const ERLAUBT = new Set(['Onlineshop', 'Shop', 'Point of Sale', 'Inbox']);

/** Reine Pruefung, testbar ohne Netz. */
export function befunde(produkte) {
  const out = [];
  for (const p of produkte) {
    if (p.status !== 'ACTIVE') continue;          // Entwuerfe sind nirgends sichtbar
    const kanaele = (p.resourcePublications?.edges || [])
      .filter(e => e.node.isPublished)
      .map(e => e.node.publication.name);
    const verboten = kanaele.filter(k => !ERLAUBT.has(k));
    if (verboten.length) out.push({ id: p.id, title: p.title, verboten });
  }
  return out;
}

async function token() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
  });
  if (!r.ok) throw new Error(`Token ${r.status}`);
  return (await r.json()).access_token;
}

const Q = `query($handle:String!,$cursor:String){
  collectionByHandle(handle:$handle){ title
    products(first:100, after:$cursor){
      pageInfo{ hasNextPage endCursor }
      edges{ node{ id title status
        resourcePublications(first:12){ edges{ node{ isPublished publication{ name } } } } } }
    } } }`;

async function lauf() {
  const tok = await token();
  if (!tok) { console.log('Keine Shopify-Zugangsdaten → No-op.'); return 0; }
  let alle = [];
  for (const handle of HEIKEL) {
    let cursor = null, titel = handle, n = 0;
    for (;;) {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok },
        body: JSON.stringify({ query: Q, variables: { handle, cursor } }),
      });
      const j = await r.json();
      if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
      const c = j.data?.collectionByHandle;
      if (!c) { console.log(`  Collection "${handle}" gibt es nicht.`); break; }
      titel = c.title;
      const ed = c.products.edges.map(e => e.node);
      n += ed.length;
      alle = alle.concat(befunde(ed));
      if (!c.products.pageInfo.hasNextPage) break;
      cursor = c.products.pageInfo.endCursor;
    }
    console.log(`"${titel}": ${n} Produkte geprueft`);
  }
  if (!alle.length) { console.log('\n✅ Kein heikles Produkt steht in einem Werbekanal.'); return 0; }
  console.log(`\n🔴 ${alle.length} heikle Produkte stehen in Werbekanaelen:\n`);
  for (const b of alle) {
    console.log(`  ${b.title}`);
    console.log(`    ${b.id}`);
    console.log(`    entfernen aus: ${b.verboten.join(', ')}`);
  }
  console.log('\n⚠️  Entfernen muss ein Mensch: publishableUnpublish ist durch die');
  console.log('   Sicherheitsregel des Shopify-Zugangs blockiert. Im Admin beim Produkt');
  console.log('   unter "Verkaufskanäle" die genannten Häkchen entfernen.');
  return 1;
}

function selbsttest() {
  console.log('Selbsttest kanal_waechter.mjs\n' + '-'.repeat(50));
  let fehler = 0;
  const kan = (...namen) => ({ edges: namen.map(n => ({ node: { isPublished: true, publication: { name: n } } })) });

  const sauber = [{ id: 'a', title: 'Aschenbecher', status: 'ACTIVE', resourcePublications: kan('Onlineshop', 'Shop') }];
  let ok = befunde(sauber).length === 0;
  console.log(`  ${ok ? 'OK ' : 'FEHLER'} nur Onlineshop + Shop ist kein Befund`);
  fehler += ok ? 0 : 1;

  const leck = [{ id: 'b', title: 'Feuerzeug', status: 'ACTIVE',
    resourcePublications: kan('Onlineshop', 'Shop', 'Google & YouTube', 'Pinterest') }];
  const r = befunde(leck);
  ok = r.length === 1 && r[0].verboten.join(',') === 'Google & YouTube,Pinterest';
  console.log(`  ${ok ? 'OK ' : 'FEHLER'} Werbekanaele werden gefunden: ${r[0]?.verboten.join(', ')}`);
  fehler += ok ? 0 : 1;

  const entwurf = [{ id: 'c', title: 'Shisha', status: 'DRAFT', resourcePublications: kan('Google & YouTube') }];
  ok = befunde(entwurf).length === 0;
  console.log(`  ${ok ? 'OK ' : 'FEHLER'} Gegenprobe: ein ENTWURF ist kein Befund (nirgends sichtbar)`);
  fehler += ok ? 0 : 1;

  const unpub = [{ id: 'd', title: 'Grinder', status: 'ACTIVE',
    resourcePublications: { edges: [{ node: { isPublished: false, publication: { name: 'Google & YouTube' } } }] } }];
  ok = befunde(unpub).length === 0;
  console.log(`  ${ok ? 'OK ' : 'FEHLER'} Gegenprobe: ein Kanal mit isPublished=false zaehlt nicht`);
  fehler += ok ? 0 : 1;

  const pos = [{ id: 'e', title: 'Zigarrenbox', status: 'ACTIVE',
    resourcePublications: kan('Onlineshop', 'Shop', 'Point of Sale', 'Inbox') }];
  ok = befunde(pos).length === 0;
  console.log(`  ${ok ? 'OK ' : 'FEHLER'} Gegenprobe: Point of Sale und Inbox sind erlaubt`);
  fehler += ok ? 0 : 1;

  console.log('-'.repeat(50));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--selbsttest')) process.exit(selbsttest());
  else lauf().then(c => process.exit(c)).catch(e => { console.error('FEHLER:', e.message); process.exit(1); });
}
