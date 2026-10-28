#!/usr/bin/env node
/* LuxeStyle — halloween_ehrlich.mjs (28.10.2026): Halloween-Lieferversprechen ehrlich machen.
 *
 * Anlass (Verkaufsdiagnose 28.10.): Die Seiten werben «Für Halloween» / «meist 2–3 Werktage», Ware ab Schweizer Lager
 * (Fortura) zeigt aber 2.–3. November, also NACH Halloween (Sa 31.10.). Bestellungen mit Halloween-Erwartung enden als
 * Reklamation oder Erstattung (Zahlungsgebühr verloren). Geändert wird nur der Wortlaut, kein Preis, keine Zusage eines Datums.
 *
 *   1. Ankündigungsleiste (sections/header-group.json) im MAIN-Theme UND im Startseiten-Entwurf 212645413255
 *      (sonst käme der alte Text mit der Veröffentlichung des Entwurfs zurück).
 *   2. Sammlung «halloween»: Beschreibung und SEO-Beschreibung.
 *
 * Trockenlauf ist Vorgabe; LIVE=1 schreibt. Vor dem Schreiben liegt die Sicherung in ./vorher/ (nie überschrieben, wx),
 * nach dem Schreiben wird FRISCH gelesen und verglichen. Jede Ersetzung muss genau einmal treffen, sonst Abbruch (Exit 2).
 * Exit: 0 ok / Trockenlauf, 1 Fehler, 2 Ersetzung trifft nicht genau einmal, 3 Nachlesen weicht ab.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';

const LIVE = process.env.LIVE === '1';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const HIER = dirname(fileURLToPath(import.meta.url));
const VORHER = join(HIER, 'vorher');
const ENTWURF_STARTSEITE = 'gid://shopify/OnlineStoreTheme/212645413255';

// --- Texte -------------------------------------------------------------------------------------------------------
const LEISTE_ALT = '🎃 Halloween-Kostüme ab Schweizer Lager – das Lieferdatum siehst du in der Kasse';
const LEISTE_NEU = '🎭 Kostüme ab Schweizer Lager – Lieferung nach Halloween, für Partys im November und die Fasnacht ab 11.11. (Datum auf der Produktseite)';

const BESCHR_ALT_1 = 'Gruselig gut: Kostüme, Masken, Deko, Kürbis-Lichter und Party-Zubehör für Halloween — vieles ab Schweizer Lager, meist 2–3 Werktage. Finde jetzt dein Halloween-Outfit!';
const BESCHR_NEU_1 = 'Gruselig gut: Kostüme, Masken, Deko, Kürbis-Lichter und Party-Zubehör — vieles ab Schweizer Lager. <strong>Ehrlich vorab:</strong> Was du jetzt bestellst, kommt erst nach Halloween (31.10.) bei dir an. Das genaue Lieferdatum steht auf jeder Produktseite. Passend für Partys im November und die Fasnacht ab 11.11.';
const BESCHR_ALT_2 = '🎃 Für Halloween: Kostüme ab Schweizer Lager kommen in der Schweiz am schnellsten an';
const BESCHR_NEU_2 = '🎭 Kostüme ab Schweizer Lager kommen in der Schweiz am schnellsten an';

const SEO_ALT = 'Halloween-Kostüme, Masken, Deko & Kürbis-Lichter online kaufen – vieles ab CH-Lager, meist 2–3 Werktage. Gratis-Versand CH ab CHF 50, 30 Tage Rückgabe.';
const SEO_NEU = 'Halloween-Kostüme, Masken, Deko & Kürbis-Lichter online kaufen – vieles ab CH-Lager, Lieferdatum je Artikel. Gratis-Versand CH ab CHF 50, 30 Tage Rückgabe.';

// --- Hilfen ------------------------------------------------------------------------------------------------------
/** Ersetzt `von` durch `zu`, aber nur wenn es GENAU einmal vorkommt (sonst wirft es). */
export function ersetzeEinmal(text, von, zu, wo) {
  const n = text.split(von).length - 1;
  if (n !== 1) { const e = new Error(`Ersetzung in ${wo} trifft ${n}-mal statt genau einmal`); e.code = 2; throw e; }
  return text.replace(von, () => zu);
}
const ohneKommentar = s => s.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
const sichern = (name, inhalt) => {
  mkdirSync(VORHER, { recursive: true });
  const pfad = join(VORHER, name);
  if (!existsSync(pfad)) writeFileSync(pfad, inhalt, { flag: 'wx' });
  return pfad;
};

async function main() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: (process.env.SHOPIFY_CLIENT_ID || '').trim(), client_secret: (shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '').trim(), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) throw new Error('Shopify-Anmeldung fehlgeschlagen (kein access_token)');
  const g = (q, v) => shopifyGql(SHOP, API, tok, q, v);

  const main_ = (await g(`{ themes(first:3, roles:[MAIN]){ nodes{ id name } } }`)).themes.nodes[0];
  if (!main_) throw new Error('Kein MAIN-Theme');
  const Q_DATEI = `query($id:ID!){ theme(id:$id){ files(first:1, filenames:["sections/header-group.json"]){ nodes{ filename body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }`;
  const M_THEME = `mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ upsertedThemeFiles{ filename } userErrors{ field message } } }`;
  const plan = [];

  // 1. Ankündigungsleiste in beiden Themes
  for (const [name, id] of [['main', main_.id], ['entwurf-startseite', ENTWURF_STARTSEITE]]) {
    const inhalt = (await g(Q_DATEI, { id })).theme?.files?.nodes?.[0]?.body?.content;
    if (!inhalt) { console.log(`- Theme ${name}: header-group.json nicht lesbar → übersprungen`); continue; }
    if (!inhalt.includes(LEISTE_ALT)) { console.log(`- Theme ${name}: alter Leistentext nicht (mehr) vorhanden → nichts zu tun`); continue; }
    const neu = ersetzeEinmal(inhalt, LEISTE_ALT, LEISTE_NEU, `${name}/header-group.json`);
    JSON.parse(ohneKommentar(neu));                                    // muss gültiges JSON bleiben
    plan.push({ art: 'theme', name, id, alt: inhalt, neu });
  }

  // 2. Sammlung
  const c = (await g(`{ collectionByHandle(handle:"halloween"){ id descriptionHtml seo{ title description } } }`)).collectionByHandle;
  if (!c) throw new Error('Sammlung halloween nicht gefunden');
  let beschr = c.descriptionHtml;
  if (beschr.includes(BESCHR_ALT_1) || beschr.includes(BESCHR_ALT_2)) {
    if (beschr.includes(BESCHR_ALT_1)) beschr = ersetzeEinmal(beschr, BESCHR_ALT_1, BESCHR_NEU_1, 'Sammlung/Beschreibung 1');
    if (beschr.includes(BESCHR_ALT_2)) beschr = ersetzeEinmal(beschr, BESCHR_ALT_2, BESCHR_NEU_2, 'Sammlung/Beschreibung 2');
  }
  // Shopify gibt «&» als «&amp;» zurück; für die SEO-Beschreibung ist der Klartext massgebend
  const seoAlt = (c.seo?.description || '');
  const seoNeu = seoAlt === SEO_ALT ? SEO_NEU : seoAlt;
  if (beschr !== c.descriptionHtml || seoNeu !== seoAlt) plan.push({ art: 'sammlung', id: c.id, alt: c, beschr, seoTitel: c.seo?.title || '', seoNeu });
  else console.log('- Sammlung halloween: nichts zu ändern');

  // Anzeige
  for (const p of plan) {
    if (p.art === 'theme') console.log(`\n# Theme ${p.name}: sections/header-group.json\n  alt: ${LEISTE_ALT}\n  neu: ${LEISTE_NEU}`);
    else console.log(`\n# Sammlung halloween\n  Beschreibung neu:\n   ${p.beschr}\n  SEO-Beschreibung neu: ${p.seoNeu}`);
  }
  if (!plan.length) { console.log('\nNichts zu tun.'); return 0; }
  if (!LIVE) { console.log(`\nTrockenlauf: ${plan.length} Änderung(en) geplant, nichts geschrieben (LIVE=1 schreibt).`); return 0; }

  // Sicherung, dann schreiben, dann frisch lesen
  for (const p of plan) sichern(p.art === 'theme' ? `theme-${p.name}-header-group.json` : 'sammlung-halloween.json', p.art === 'theme' ? p.alt : JSON.stringify(p.alt, null, 1));
  let abweichung = 0;
  for (const p of plan) {
    if (p.art === 'theme') {
      const u = await g(M_THEME, { id: p.id, files: [{ filename: 'sections/header-group.json', body: { type: 'TEXT', value: p.neu } }] });
      const fehler = u.themeFilesUpsert.userErrors;
      if (fehler.length) throw new Error(`themeFilesUpsert ${p.name}: ${JSON.stringify(fehler)}`);
      const frisch = (await g(Q_DATEI, { id: p.id })).theme.files.nodes[0].body.content;
      const ok = frisch.includes(LEISTE_NEU) && !frisch.includes(LEISTE_ALT);
      console.log(`${ok ? '✅' : '❌'} Theme ${p.name}: nachgelesen ${ok ? 'neuer Text steht, alter weg' : 'WEICHT AB'}`);
      if (!ok) abweichung++;
    } else {
      const u = await g(`mutation($input:CollectionInput!){ collectionUpdate(input:$input){ collection{ id } userErrors{ field message } } }`,
        { input: { id: p.id, descriptionHtml: p.beschr, seo: { title: p.seoTitel, description: p.seoNeu } } });   // seo wird ERSETZT: immer beide Felder
      if (u.collectionUpdate.userErrors.length) throw new Error(`collectionUpdate: ${JSON.stringify(u.collectionUpdate.userErrors)}`);
      const f = (await g(`{ collectionByHandle(handle:"halloween"){ descriptionHtml seo{ title description } } }`)).collectionByHandle;
      const norm = s => s.replace(/&amp;/g, '&');
      const ok = norm(f.descriptionHtml) === norm(p.beschr) && f.seo.description === p.seoNeu && f.seo.title === p.seoTitel;
      console.log(`${ok ? '✅' : '❌'} Sammlung halloween: nachgelesen ${ok ? 'Beschreibung und SEO stimmen' : 'WEICHT AB'}`);
      if (!ok) abweichung++;
    }
  }
  return abweichung ? 3 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(code => process.exit(code), e => { console.error('❌', e.message); process.exit(e.code === 2 ? 2 : 1); });
}
