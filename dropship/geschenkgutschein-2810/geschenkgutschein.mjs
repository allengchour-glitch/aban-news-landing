#!/usr/bin/env node
/* LuxeStyle — geschenkgutschein.mjs (28.10.2026): digitalen Geschenkgutschein als ENTWURF anlegen.
 *
 * Auftrag des Besitzers (28.10., Verkaufsplan B2): «Geschenkgutschein: ja». Betraege CHF 25 / 50 / 100. Der Gutschein ist
 * die einzige Ware, die auch nach dem CJ-Bestellschluss (ca. 25.11.) noch am selben Tag zustellbar ist: kein Lieferant, keine Fracht.
 *
 * Das Produkt bleibt DRAFT. Veroeffentlichen, Bedingungen (Rueckgabe/Umtausch von Gutscheinen, Gueltigkeit) und Platzierung
 * entscheidet der Besitzer. Trockenlauf ist Vorgabe; LIVE=1 legt an. Schlaegt ein Schritt nach dem Anlegen fehl (z. B. Tageslimit
 * fuer neue Varianten, VARIANT_THROTTLE_EXCEEDED), wird das halb fertige Produkt wieder GELOESCHT (nie ein Rest im Shop).
 * Nach dem Anlegen wird FRISCH gelesen und gegen den Plan verglichen.
 *
 * Exit: 0 ok / Trockenlauf, 1 Fehler, 3 Nachlesen weicht ab, 4 Tageslimit fuer Varianten (nichts angelegt), 5 Produkt existiert schon.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';

const LIVE = process.env.LIVE === '1';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const HIER = dirname(fileURLToPath(import.meta.url));
const BILD = process.env.BILD || join(HIER, 'geschenkgutschein.png');

export const BETRAEGE = [25, 50, 100];
export const HANDLE = 'geschenkgutschein';
export const TITEL = 'LuxeStyle Geschenkgutschein';
export const OPTION = 'Betrag';
export const wertName = chf => `CHF ${chf}`;

export const BESCHREIBUNG = [
  '<p><strong>Schenke Wahlfreiheit.</strong> Mit dem LuxeStyle-Geschenkgutschein suchen sich die Beschenkten selbst aus, was ihnen gefällt, aus dem ganzen Sortiment auf luxestyle.ch.</p>',
  '<ul>',
  `<li>Betrag zur Wahl: ${BETRAEGE.map(wertName).join(', ').replace(/, ([^,]*)$/, ' oder $1')}</li>`,
  '<li>Digital: Den Gutschein-Code erhältst du nach dem Kauf per E-Mail. Es gibt keinen Versand und keine Wartezeit.</li>',
  '<li>Einlösen: Code im Warenkorb bzw. an der Kasse eingeben.</li>',
  '<li>Gilt für alle Artikel im Shop, auch für Ware ab Schweizer Lager.</li>',
  '</ul>',
  '<h3>Bedingungen</h3>',
  '<ul>',
  '<li>Der Gutschein hat kein Ablaufdatum.</li>',
  '<li>Ein Restbetrag bleibt auf dem Gutschein und kann beim nächsten Einkauf eingelöst werden.</li>',
  '<li>Nicht in bar auszahlbar. Mit einem Gutschein können keine weiteren Gutscheine gekauft werden.</li>',
  '</ul>',
  '<p>Fragen? Schreib an info@luxestyle.ch.</p>',
].join('');

export const SEO = {
  title: 'Geschenkgutschein CHF 25–100 digital | LuxeStyle',
  description: 'Geschenkgutschein für LuxeStyle: CHF 25, 50 oder 100, digital per E-Mail, einlösbar im ganzen Shop. Ohne Versand, sofort verschenkt.',
};

/** Der Plan als reine Daten (testbar, ohne Netz). */
export function plan() {
  return {
    produkt: {
      title: TITEL, handle: HANDLE, status: 'DRAFT', giftCard: true, vendor: 'LuxeStyle', productType: 'Geschenkgutschein',
      tags: ['geschenkgutschein', 'gutschein', 'nicht-bewerben-gutschein'],   // nicht-bewerben-…: bleibt aus dem Merchant-Feed und den Themenkategorien
      descriptionHtml: BESCHREIBUNG, seo: SEO,
      productOptions: [{ name: OPTION, values: BETRAEGE.map(c => ({ name: wertName(c) })) }],
    },
    varianten: BETRAEGE.map(c => ({ wert: wertName(c), preis: c.toFixed(2) })),
  };
}

const OPT = `options { id name optionValues { id name hasVariants } }`;
const LESEN = `query($id:ID!){ product(id:$id){ id title handle status isGiftCard tags vendor productType descriptionHtml seo{ title description } media(first:5){ nodes{ ... on MediaImage { id status image{ url } } } } ${OPT}
  variants(first:20){ nodes{ id title price sku selectedOptions{ name value } inventoryItem{ requiresShipping tracked } } } } }`;

const wirfLimit = e => /VARIANT_THROTTLE|Daily variant creation limit/i.test(String(e?.message || e));

async function main() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: (process.env.SHOPIFY_CLIENT_ID || '').trim(), client_secret: (shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '').trim(), grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) throw new Error('Shopify-Anmeldung fehlgeschlagen (kein access_token)');
  const g = (q, v) => shopifyGql(SHOP, API, tok, q, v);

  const p = plan();
  console.log(`Plan: «${TITEL}» (DRAFT, Gutschein), Betraege ${BETRAEGE.join('/')} CHF, Handle ${HANDLE}, 3 neue Varianten, 1 Bild.`);

  // Gibt es schon einen Gutschein oder das Handle?
  const vorhanden = await g(`{ h: productByHandle(handle:"${HANDLE}"){ id title status } g: products(first:5, query:"gift_card:true"){ nodes{ id title status handle } } }`);
  const schon = [vorhanden.h, ...(vorhanden.g?.nodes || [])].filter(Boolean);
  if (schon.length) { console.log('Es gibt schon:', JSON.stringify(schon)); return 5; }
  if (!LIVE) { console.log('Trockenlauf: nichts angelegt (LIVE=1 legt an).'); return 0; }

  let pid = null;
  try {
    // 1. Bild in den Shopify-Speicher laden
    const png = readFileSync(BILD);
    const st = (await g(`mutation($i:[StagedUploadInput!]!){ stagedUploadsCreate(input:$i){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`,
      { i: [{ resource: 'IMAGE', filename: 'geschenkgutschein.png', mimeType: 'image/png', httpMethod: 'POST', fileSize: String(png.length) }] })).stagedUploadsCreate;
    if (st.userErrors.length) throw new Error('stagedUploadsCreate: ' + JSON.stringify(st.userErrors));
    const ziel = st.stagedTargets[0];
    const form = new FormData();
    for (const { name, value } of ziel.parameters) form.append(name, value);
    form.append('file', new Blob([png], { type: 'image/png' }), 'geschenkgutschein.png');
    const up = await fetch(ziel.url, { method: 'POST', body: form });
    if (up.status < 200 || up.status >= 300) throw new Error(`Bild-Upload HTTP ${up.status}`);
    console.log('Bild hochgeladen:', png.length, 'Bytes');

    // 2. Produkt (DRAFT, Gutschein) mit dem ersten Betrag
    const c = (await g(`mutation($p:ProductCreateInput!,$m:[CreateMediaInput!]){ productCreate(product:$p, media:$m){ product{ id ${OPT} variants(first:5){ nodes{ id selectedOptions{ name value } } } } userErrors{ field message } } }`,
      { p: p.produkt, m: [{ originalSource: ziel.resourceUrl, mediaContentType: 'IMAGE', alt: 'LuxeStyle Geschenkgutschein' }] })).productCreate;
    if (c.userErrors.length || !c.product) throw new Error('productCreate: ' + JSON.stringify(c.userErrors));
    pid = c.product.id;
    const v1 = c.product.variants.nodes[0];
    console.log('Produkt angelegt:', pid, '| erste Variante:', v1.selectedOptions.map(o => o.value).join('/'));

    // 3. erste Variante: Preis, kein Versand, kein Bestand
    const u = (await g(`mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkUpdate(productId:$pid, variants:$v){ productVariants{ id price } userErrors{ field message code } } }`,
      { pid, v: [{ id: v1.id, price: p.varianten[0].preis, inventoryItem: { tracked: false, requiresShipping: false } }] })).productVariantsBulkUpdate;
    if (u.userErrors.length) throw new Error('productVariantsBulkUpdate: ' + JSON.stringify(u.userErrors));

    // 4. die übrigen Beträge als Varianten
    const b = (await g(`mutation($pid:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$pid, variants:$v){ productVariants{ id price } userErrors{ field message code } } }`,
      { pid, v: p.varianten.slice(1).map(x => ({ optionValues: [{ optionName: OPTION, name: x.wert }], price: x.preis, inventoryItem: { tracked: false, requiresShipping: false } })) })).productVariantsBulkCreate;
    if (b.userErrors.length) throw new Error('productVariantsBulkCreate: ' + JSON.stringify(b.userErrors));

    // 5. FRISCH lesen und gegen den Plan vergleichen
    const f = (await g(LESEN, { id: pid })).product;
    const fehler = [];
    if (f.status !== 'DRAFT') fehler.push(`Status ${f.status} statt DRAFT`);
    if (!f.isGiftCard) fehler.push('isGiftCard ist false');
    if (f.handle !== HANDLE) fehler.push(`Handle ${f.handle}`);
    const preise = f.variants.nodes.map(v => `${v.selectedOptions[0]?.value}=${Number(v.price).toFixed(2)}`).sort().join(', ');
    const soll = p.varianten.map(x => `${x.wert}=${x.preis}`).sort().join(', ');
    if (preise !== soll) fehler.push(`Varianten/Preise ${preise} statt ${soll}`);
    if (f.variants.nodes.some(v => v.inventoryItem.requiresShipping || v.inventoryItem.tracked)) fehler.push('requiresShipping oder tracked ist true');
    if (!f.media.nodes.length) fehler.push('kein Bild');
    if (f.seo.title !== SEO.title || f.seo.description !== SEO.description) fehler.push('SEO weicht ab');
    console.log('Nachgelesen:', JSON.stringify({ id: f.id, handle: f.handle, status: f.status, isGiftCard: f.isGiftCard, varianten: preise, bilder: f.media.nodes.length, tags: f.tags }));
    if (fehler.length) { console.log('❌ Abweichungen:', fehler.join(' | ')); return 3; }
    console.log('✅ Entwurf steht, alles stimmt. Produkt-ID:', f.id);
    pid = null;                                                       // fertig: nichts aufzuräumen
    return 0;
  } catch (e) {
    if (pid) {
      try { const d = await g(`mutation($i:ProductDeleteInput!){ productDelete(input:$i){ deletedProductId userErrors{ field message } } }`, { i: { id: pid } });
        console.log('Halb fertiges Produkt gelöscht:', JSON.stringify(d.productDelete)); } catch (e2) { console.log('AUFRÄUMEN FEHLGESCHLAGEN, Produkt', pid, 'von Hand löschen:', e2.message); }
    }
    if (wirfLimit(e)) { console.log('TAGESLIMIT: Shopify erlaubt heute keine neuen Varianten (VARIANT_THROTTLE_EXCEEDED). Nichts angelegt, nicht umgangen. Spaeter erneut.'); return 4; }
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(code => process.exit(code), e => { console.error('❌', e.message); process.exit(1); });
}
