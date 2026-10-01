#!/usr/bin/env node
/**
 * homepage_slim.mjs — macht die LuxeStyle-Startseite schlank und verkaufsorientiert.
 *
 *   DRY_RUN=1 node automation/homepage_slim.mjs     nur zeigen, was passieren wuerde (Standard)
 *   DRY_RUN=0 node automation/homepage_slim.mjs     scharf: legt eine Theme-KOPIE an und schreibt dort
 *            node automation/homepage_slim.mjs --selbsttest
 *
 * WARUM (alles gemessen am 2026-09-12, nicht geschaetzt):
 *   Die Startseite hatte 18 Produktreihen. Jede rendert ihre 12 Produkte SECHSMAL
 *   (72 Links bei 12 verschiedenen Produkten, nachgezaehlt) → 1108 Produktlinks,
 *   1130 Bilder, 1896 eingebettete SVGs, 6.91 MB, und bei 17 % der Abrufe antwortet
 *   Shopify mit HTTP 500 ("Something went wrong"), waehrend Produktseite und
 *   Collection auf derselben Infrastruktur 0 % Fehler haben.
 *   Messgeraet: tools/shop_startseite.mjs (mit Gegenprobe).
 *
 *   Zusaetzlich: ALLE bisherigen echten Kundenbestellungen lagen zwischen CHF 21.90
 *   und 41.90, und jedes verkaufte Produkt liegt in `geschenke-unter-50-franken`.
 *   KEINE der 18 Reihen nutzte diese Collection. Die erste Reihe ist jetzt genau sie.
 *
 * SICHERHEIT: schreibt NIE in das aktive Theme. Es wird immer eine Kopie angelegt
 * (oder ZIEL_THEME_ID benutzt); publizieren muss ein Mensch.
 *
 * ENV: SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET + SHOPIFY_SHOP (oder SHOPIFY_ADMIN_TOKEN)
 *      optional ZIEL_THEME_ID (gid oder Zahl) · DRY_RUN (Default 1)
 */
const API = process.env.SHOPIFY_API_VERSION || '2025-07';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const DRY = process.env.DRY_RUN !== '0';

// Die vier Reihen, die bleiben — Reihenfolge = Reihenfolge auf der Seite.
// Schluessel = Abschnittsname in templates/index.json, Wert = [Collection, Produktzahl]
export const BEHALTEN = {
  pl_trends:              ['geschenke-unter-50-franken', 8], // bewiesene Verkaufsklasse, 1. Reihe
  product_list_topseller: ['bestseller',                 8],
  product_list_wm2026:    ['neu-eingetroffen',           8],
  product_list_blitz:     ['blitzversand-highlights',    8], // beantwortet den Lieferzeit-Einwand
};

/** Entfernt den JSONC-Kommentarkopf, den Shopify vor die Theme-Vorlagen setzt. */
export function kopfAbtrennen(raw) {
  const m = raw.match(/^\s*\/\*[\s\S]*?\*\/\s*/);
  return { kopf: m ? m[0] : '', korpus: m ? raw.slice(m[0].length) : raw };
}

/** Die eigentliche Umstellung — rein, testbar, idempotent. */
export function umstellen(raw) {
  const { kopf, korpus } = kopfAbtrennen(raw);
  const idx = JSON.parse(korpus);
  const secs = idx.sections, order = idx.order;
  const vorher = order.filter(k => secs[k]?.type === 'product-list');
  const neu = [], weg = [];
  // erst die Nicht-Produkt-Abschnitte in ihrer Reihenfolge, Produktreihen an ihre Stelle
  for (const k of order) {
    if (secs[k]?.type !== 'product-list') { neu.push(k); continue; }
    if (k in BEHALTEN) {
      const [coll, n] = BEHALTEN[k];
      secs[k].settings.collection = coll;
      secs[k].settings.max_products = n;
      neu.push(k);
    } else {
      weg.push({ key: k, collection: secs[k].settings?.collection, n: secs[k].settings?.max_products });
      delete secs[k];
    }
  }
  idx.order = neu;
  const karten = neu.filter(k => secs[k].type === 'product-list')
                    .reduce((s, k) => s + (secs[k].settings.max_products || 0), 0);
  const out = kopf + JSON.stringify(idx, null, 2) + '\n';
  JSON.parse(kopfAbtrennen(out).korpus);   // Gegenprobe: bleibt gueltiges JSON
  return { inhalt: out, vorherReihen: vorher.length, nachherReihen: neu.filter(k => secs[k].type === 'product-list').length,
           entfernt: weg, karten, vorherBytes: raw.length, nachherBytes: out.length };
}

/* ---------------------------------------------------------------- Shopify */
async function token() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
  });
  if (!r.ok) throw new Error(`Token-Abruf ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).access_token;
}

async function gql(tok, query, variables = {}) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
  return j.data;
}

const Q_MAIN = `query { themes(first:1, roles:[MAIN]) { edges { node { id name
  files(first:1, filenames:["templates/index.json"]) { edges { node { size
    body { ... on OnlineStoreThemeFileBodyText { content } } } } } } } } }`;
const M_DUP = `mutation($id:ID!,$name:String){ themeDuplicate(id:$id,name:$name){
  newTheme{ id name role processing } userErrors{ field message } } }`;
const M_UPSERT = `mutation($themeId:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){
  themeFilesUpsert(themeId:$themeId, files:$files){
    upsertedThemeFiles{ filename } userErrors{ filename code message } } }`;

async function lauf() {
  const tok = await token();
  if (!tok) { console.log('Keine Shopify-Zugangsdaten → No-op. Erwartet SHOPIFY_CLIENT_ID/_SECRET oder SHOPIFY_ADMIN_TOKEN.'); return 0; }

  const d = await gql(tok, Q_MAIN);
  const main = d.themes.edges[0].node;
  const datei = main.files.edges[0].node;
  console.log(`Aktives Theme: ${main.name}  ·  templates/index.json ${Number(datei.size).toLocaleString('de-CH')} B`);

  const r = umstellen(datei.body.content);
  console.log(`\nProduktreihen: ${r.vorherReihen} → ${r.nachherReihen}`);
  console.log(`Konfigurierte Karten: ${r.karten} (jede wird vom Theme 6× gerendert → ~${r.karten * 6} Links)`);
  console.log(`Vorlage: ${r.vorherBytes.toLocaleString('de-CH')} → ${r.nachherBytes.toLocaleString('de-CH')} B`);
  console.log(`\nEntfernte Reihen (${r.entfernt.length}):`);
  for (const e of r.entfernt) console.log(`  ${e.key.padEnd(26)} ${String(e.collection).padEnd(24)} ${e.n}`);
  console.log(`\nBleibende Reihen:`);
  for (const [k, [c, n]] of Object.entries(BEHALTEN)) console.log(`  ${k.padEnd(26)} ${c.padEnd(28)} ${n}`);

  if (DRY) { console.log('\nDRY_RUN → nichts geschrieben. Mit DRY_RUN=0 erneut starten.'); return 0; }

  let ziel = process.env.ZIEL_THEME_ID || '';
  if (!ziel) {
    const name = `Startseite schlank ${new Date().toISOString().slice(5, 10)}`.slice(0, 50);
    const dup = await gql(tok, M_DUP, { id: main.id, name });
    if (dup.themeDuplicate.userErrors?.length) throw new Error(JSON.stringify(dup.themeDuplicate.userErrors));
    ziel = dup.themeDuplicate.newTheme.id;
    console.log(`\nKopie angelegt: ${dup.themeDuplicate.newTheme.name} (${ziel})`);
    for (let i = 0; i < 30; i++) {   // auf processing:false warten
      const s = await gql(tok, `query($id:ID!){ theme(id:$id){ processing } }`, { id: ziel });
      if (!s.theme.processing) break;
      await new Promise(r2 => setTimeout(r2, 2000));
    }
  } else if (!ziel.startsWith('gid://')) {
    ziel = `gid://shopify/OnlineStoreTheme/${ziel}`;
  }

  if (ziel === main.id) throw new Error('SICHERHEITSHALT: Ziel ist das AKTIVE Theme. Abbruch.');

  const up = await gql(tok, M_UPSERT, {
    themeId: ziel,
    files: [{ filename: 'templates/index.json', body: { type: 'TEXT', value: r.inhalt } }],
  });
  const fehler = up.themeFilesUpsert.userErrors || [];
  if (fehler.length) { console.error('FEHLER:', JSON.stringify(fehler)); return 1; }
  console.log(`\n✅ Geschrieben in ${ziel} → templates/index.json`);
  console.log(`   Vorschau: https://${SHOP.replace('.myshopify.com','')}.myshopify.com/?preview_theme_id=${ziel.split('/').pop()}`);
  console.log(`   Danach messen: node tools/shop_startseite.mjs`);
  console.log(`   ⚠️  Publizieren muss ein Mensch (Shopify-Admin → Onlineshop → Themes → Veroeffentlichen).`);
  return 0;
}

/* -------------------------------------------------------------- Selbsttest */
function selbsttest() {
  console.log('Selbsttest homepage_slim.mjs\n' + '-'.repeat(46));
  let fehler = 0;
  const mk = (keys) => {
    const sections = {};
    for (const k of keys) sections[k] = k.startsWith('x_')
      ? { type: 'custom-liquid', settings: {} }
      : { type: 'product-list', settings: { collection: 'alt-' + k, max_products: 12 } };
    return '/* auto */\n' + JSON.stringify({ sections, order: keys });
  };
  const keys = ['x_hero', 'pl_trends', 'pl_weg1', 'product_list_topseller', 'pl_weg2',
                'product_list_wm2026', 'product_list_blitz', 'x_fuss'];
  const r = umstellen(mk(keys));

  const ok1 = r.vorherReihen === 6 && r.nachherReihen === 4 && r.entfernt.length === 2;
  console.log(`  ${ok1 ? 'OK ' : 'FEHLER'} Reihen 6 → 4, 2 entfernt (gemessen ${r.vorherReihen} → ${r.nachherReihen}, ${r.entfernt.length})`);
  fehler += ok1 ? 0 : 1;

  const idx = JSON.parse(kopfAbtrennen(r.inhalt).korpus);
  const ok2 = idx.order[0] === 'x_hero' && idx.order[idx.order.length - 1] === 'x_fuss'
           && !idx.order.includes('pl_weg1') && !idx.sections.pl_weg1;
  console.log(`  ${ok2 ? 'OK ' : 'FEHLER'} Nicht-Produkt-Abschnitte bleiben, entfernte sind weg`);
  fehler += ok2 ? 0 : 1;

  const ok3 = idx.sections.pl_trends.settings.collection === 'geschenke-unter-50-franken'
           && idx.sections.pl_trends.settings.max_products === 8;
  console.log(`  ${ok3 ? 'OK ' : 'FEHLER'} 1. Reihe ist die bewiesene Verkaufsklasse mit 8 Produkten`);
  fehler += ok3 ? 0 : 1;

  const zweimal = umstellen(r.inhalt);
  const ok4 = zweimal.entfernt.length === 0 && zweimal.nachherReihen === 4
           && JSON.stringify(JSON.parse(kopfAbtrennen(zweimal.inhalt).korpus)) === JSON.stringify(idx);
  console.log(`  ${ok4 ? 'OK ' : 'FEHLER'} idempotent: zweiter Lauf aendert nichts mehr`);
  fehler += ok4 ? 0 : 1;

  let ok5 = false;
  try { umstellen('/* auto */\n{kein gueltiges json'); } catch { ok5 = true; }
  console.log(`  ${ok5 ? 'OK ' : 'FEHLER'} Gegenprobe: kaputte Vorlage wird abgewiesen`);
  fehler += ok5 ? 0 : 1;

  console.log('-'.repeat(46));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

// Nur ausfuehren, wenn direkt gestartet — beim Importieren (Tests, andere Skripte) nicht.
import { fileURLToPath } from 'node:url';
const direkt = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (direkt) {
  if (process.argv.includes('--selbsttest')) process.exit(selbsttest());
  else lauf().then(c => process.exit(c)).catch(e => { console.error('FEHLER:', e.message); process.exit(1); });
}
