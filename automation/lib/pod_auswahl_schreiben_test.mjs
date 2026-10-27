// Tests für den SCHREIBWEG der «Selbst gestalten»-Auswahl gegen einen Shopify-ATTRAPPE im Speicher (es wird nie ein echter Dienst berührt).
// Lauf: /opt/node22/bin/node automation/lib/pod_auswahl_schreiben_test.mjs
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planeAlles, pfIdAusSku, PLATZHALTER_VARIANTE, PLATZHALTER_BILD } from './pod_auswahl_plan.mjs';
import { ladePaket } from './pod_auswahl_daten.mjs';
import { lauf, pruefeAntwort, TageslimitFehler, variantenEingabe, vergleiche, leseFrisch, nurText, sicherungsName, produktSetEingabe, ledgerLesen, CHUNK } from './pod_auswahl_schreiben.mjs';
import { MARKE_AUF } from './pod_auswahl_spec.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 500)}\n   soll: ${JSON.stringify(b).slice(0, 500)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
const klon = (x) => JSON.parse(JSON.stringify(x));

const paket = ladePaket();
const planVon = (nur = null, bestand = paket.bestand) => planeAlles({ katalog: paket.katalog, beschreibungen: paket.beschreibungen, versand: paket.versand, bestand, skuPruefung: paket.skuPruefung, nur });
const HANDLES = { poster: 'poster-zum-selbstgestalten', hoodie: 'unisex-hoodie-selbst-gestalten', shirt: 'unisex-t-shirt-selbst-gestalten', iphone: 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', samsung: 'samsung-huelle-selbst-gestalten' };

// ───────────────────────────────────────────────────────── Shopify-Attrappe (so streng wie nötig: neue Optionswerte müssen vorher angelegt sein)
function neuerShop(bestand, o = {}) {
  const produkte = new Map(); let n = 5000; const aufrufe = [];
  for (const b of Object.values(bestand)) produkte.set(b.handle, {
    id: b.id, handle: b.handle, title: b.title, status: b.status, productType: b.productType, vendor: b.vendor, tags: [...b.tags], descriptionHtml: b.descriptionHtml, seo: b.seo, category: null,
    options: b.options.map((x, i) => ({ id: `gid://shopify/ProductOption/${b.handle.length}${i}`, name: x.name, position: x.position, values: [...x.values] })),
    variants: b.variants.map((v) => ({ id: v.id, sku: v.sku, price: v.price, inventoryPolicy: v.inventoryPolicy, selectedOptions: v.selectedOptions.map((s) => ({ ...s })), inventoryItem: { tracked: true, requiresShipping: true } })),
    media: [], metafields: [] });
  let angelegteVarianten = 0;
  const alsAntwort = (p) => ({ id: p.id, handle: p.handle, title: p.title, status: p.status, productType: p.productType, vendor: p.vendor, tags: p.tags, descriptionHtml: p.descriptionHtml, seo: p.seo, category: p.category && { id: p.category },
    options: p.options.map((x) => ({ ...x, optionValues: x.values.map((v) => ({ id: 'v', name: v })) })),
    variants: { edges: p.variants.map((v) => ({ node: v })) }, media: { edges: p.media.map((m) => ({ node: m })) }, metafields: { edges: p.metafields.map((m) => ({ node: m })) } });
  const nachId = (id) => [...produkte.values()].find((p) => p.id === id);
  const sortiere = (p) => { p.options.sort((a, b) => a.position - b.position); p.options.forEach((x, i) => { x.position = i + 1; }); for (const v of p.variants) v.selectedOptions.sort((a, b) => p.options.findIndex((x) => x.name === a.name) - p.options.findIndex((x) => x.name === b.name)); };
  async function gql(query, v) {
    const name = (query.match(/(productByHandle|productOptionsCreate|productOptionUpdate|productVariantsBulkCreate|productUpdate|productSet|metafieldsSet)/) || [])[1];
    aufrufe.push({ name, v });
    if (name !== 'productByHandle' && o.alleFehlschlagen) return { errors: [{ message: 'Internal error' }] };
    if (name === 'productByHandle') { const p = produkte.get(v.h); return { data: { productByHandle: p ? alsAntwort(p) : null } }; }
    if (name === 'productOptionsCreate') {
      const p = nachId(v.pid);
      for (const op of v.opts) {
        if (p.options.some((x) => x.name === op.name)) return { data: { productOptionsCreate: { userErrors: [{ code: 'OPTION_ALREADY_EXISTS', message: 'exists' }] } } };
        p.options.forEach((x) => { if (x.position >= op.position) x.position++; });
        p.options.push({ id: 'gid://shopify/ProductOption/neu' + (n++), name: op.name, position: op.position, values: [op.values[0].name] });
        for (const va of p.variants) va.selectedOptions.push({ name: op.name, value: op.values[0].name });   // LEAVE_AS_IS: alle vorhandenen bekommen den ersten Wert
      }
      sortiere(p); return { data: { productOptionsCreate: { product: alsAntwort(p), userErrors: [] } } };
    }
    if (name === 'productOptionUpdate') {
      const p = nachId(v.pid), op = p.options.find((x) => x.id === v.opt.id);
      for (const a of v.add) { if (op.values.includes(a.name)) return { data: { productOptionUpdate: { userErrors: [{ code: 'OPTION_VALUE_ALREADY_EXISTS', message: 'exists' }] } } }; op.values.push(a.name); }
      return { data: { productOptionUpdate: { product: alsAntwort(p), userErrors: [] } } };
    }
    if (name === 'productVariantsBulkCreate') {
      const p = nachId(v.pid);
      if (o.tageslimitAb !== undefined && angelegteVarianten + v.vs.length > o.tageslimitAb) return { data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ field: null, code: 'VARIANT_THROTTLE_EXCEEDED', message: 'Daily variant creation limit reached. Try again tomorrow.' }] } } };
      const erzeugt = [];
      for (const x of v.vs) {
        const sel = [];
        for (const ov of x.optionValues) {
          const op = p.options.find((q) => q.name === ov.optionName);
          if (!op || !op.values.includes(ov.name)) return { data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ code: 'OPTION_VALUE_DOES_NOT_EXIST', message: `${ov.optionName}=${ov.name}` }] } } };
          sel.push({ name: ov.optionName, value: ov.name });
        }
        if (p.variants.some((q) => q.sku === x.inventoryItem.sku)) return { data: { productVariantsBulkCreate: { productVariants: null, userErrors: [{ code: 'DUPLICATE', message: 'sku ' + x.inventoryItem.sku }] } } };
        if (o.verschluckeSku === x.inventoryItem.sku) { angelegteVarianten++; continue; }
        const nv = { id: 'gid://shopify/ProductVariant/' + (n++), sku: x.inventoryItem.sku, price: o.preisAendern?.[x.inventoryItem.sku] ?? x.price, inventoryPolicy: x.inventoryPolicy, selectedOptions: sel, inventoryItem: x.inventoryItem };
        p.variants.push(nv); erzeugt.push({ id: nv.id, sku: nv.sku }); angelegteVarianten++;
      }
      sortiere(p); return { data: { productVariantsBulkCreate: { productVariants: erzeugt, userErrors: [] } } };
    }
    if (name === 'productUpdate') { const p = nachId(v.p.id); p.descriptionHtml = o.beschreibungVerfaelschen ? v.p.descriptionHtml + '<p>fremd</p>' : v.p.descriptionHtml; return { data: { productUpdate: { product: { id: p.id }, userErrors: [] } } }; }
    if (name === 'productSet') {
      const i = v.input; const id = 'gid://shopify/Product/' + (n++);
      const p = { id, handle: i.handle, title: i.title, status: i.status, productType: i.productType, vendor: i.vendor, tags: [...i.tags], descriptionHtml: i.descriptionHtml, seo: i.seo, category: i.category,
        options: i.productOptions.map((x, k) => ({ id: 'gid://shopify/ProductOption/s' + (n++), name: x.name, position: x.position, values: x.values.map((y) => y.name) })),
        variants: [], media: i.files.map((f, k) => ({ id: 'm' + k, alt: f.alt, image: { url: f.originalSource } })), metafields: [] };
      for (const x of i.variants) {
        for (const ov of x.optionValues) if (!p.options.find((q) => q.name === ov.optionName)?.values.includes(ov.name)) return { data: { productSet: { product: null, userErrors: [{ message: 'Optionswert fehlt ' + ov.name }] } } };
        angelegteVarianten++; p.variants.push({ id: 'gid://shopify/ProductVariant/' + (n++), sku: x.sku, price: x.price, inventoryPolicy: x.inventoryPolicy, selectedOptions: x.optionValues.map((ov) => ({ name: ov.optionName, value: ov.name })), inventoryItem: x.inventoryItem });
      }
      produkte.set(p.handle, p); return { data: { productSet: { product: { id, handle: p.handle, status: p.status }, userErrors: [] } } };
    }
    if (name === 'metafieldsSet') { const p = nachId(v.mf[0].ownerId); for (const m of v.mf) p.metafields.push({ namespace: m.namespace, key: m.key, type: m.type, value: m.value }); return { data: { metafieldsSet: { metafields: v.mf.map((m) => ({ key: m.key })), userErrors: [] } } }; }
    throw new Error('Attrappe kennt die Abfrage nicht: ' + query.slice(0, 60));
  }
  return { gql, produkte, aufrufe, zaehle: (nm) => aufrufe.filter((a) => a.name === nm).length, reihenfolge: () => aufrufe.map((a) => a.name) };
}

const tmp = () => mkdtempSync(join(tmpdir(), 'pod-auswahl-test-'));
const still = () => {};
const cfg = (dir, extra = {}) => ({ ledgerPfad: join(dir, 'ledger.txt'), sicherungsDir: join(dir, 'sicherung'), log: still, jetzt: () => '2026-10-27T12:00:00.000Z', ...extra });

// ───────────────────────────────────────────────────────── 1. Bausteine
ist('variantenEingabe: Form (Optionen in Reihenfolge, Preis als Text, kein sku auf oberster Ebene)', variantenEingabe([{ sku: '9000001_6875', preisChf: 28.9, optionen: { Material: 'Foto-Glanzpapier', 'Grösse': '30×40 cm' } }], ['Material', 'Grösse']),
  [{ optionValues: [{ optionName: 'Material', name: 'Foto-Glanzpapier' }, { optionName: 'Grösse', name: '30×40 cm' }], price: '28.90', inventoryPolicy: 'CONTINUE', inventoryItem: { sku: '9000001_6875', tracked: false, requiresShipping: true } }]);
ist('pruefeAntwort: Erfolg gibt den Teil zurück', pruefeAntwort({ data: { x: { a: 1, userErrors: [] } } }, 't', 'x').a, 1);
for (const [n, j] of [['userErrors VARIANT_THROTTLE_EXCEEDED', { data: { x: { userErrors: [{ code: 'VARIANT_THROTTLE_EXCEEDED', message: 'm' }] } } }], ['errors «Daily variant creation limit»', { errors: [{ message: 'Daily variant creation limit reached' }] }]]) {
  let e; try { pruefeAntwort(j, 't', 'x'); } catch (x) { e = x; } wahr(`pruefeAntwort: ${n} → TageslimitFehler`, e instanceof TageslimitFehler);
}
{ let e; try { pruefeAntwort({ data: { x: { userErrors: [{ message: 'kaputt' }] } } }, 't', 'x'); } catch (x) { e = x; } wahr('pruefeAntwort: userErrors → Fehler (kein Tageslimit)', e && !(e instanceof TageslimitFehler) && /kaputt/.test(e.message)); }
ist('sicherungsName: Sonderzeichen (®) ersetzt', sicherungsName('hardcase-iphone®-hulle'), 'hardcase-iphone_-hulle.json');
ist('nurText: Markup und Entitäten egal', nurText('<p>a &amp; b</p>\n<!-- x -->  <b>c</b>'), 'a & b c');
ist('CHUNK ist 50', CHUNK, 50);

// ───────────────────────────────────────────────────────── 2. Poster komplett: Reihenfolge der Aufrufe, Zustand danach, Sicherung, Ledger, Idempotenz
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const vorher = klon(paket.bestand[HANDLES.poster]);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Poster: Exit 0, Status OK', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK']]);
  const p = shop.produkte.get(HANDLES.poster);
  ist('Poster: Optionen danach Material (1) → Grösse (2)', p.options.map((o) => [o.name, o.position]), [['Material', 1], ['Grösse', 2]]);
  ist('Poster: 18 Varianten', p.variants.length, 18);
  ist('Poster: vorhandene Varianten behalten ID, SKU, Preis', vorher.variants.map((v) => { const x = p.variants.find((q) => q.id === v.id); return [x.sku, x.price]; }), vorher.variants.map((v) => [v.sku, v.price]));
  wahr('Poster: vorhandene Varianten haben «Poster matt»', vorher.variants.every((v) => p.variants.find((q) => q.id === v.id).selectedOptions.find((s) => s.name === 'Material').value === 'Poster matt'));
  ist('Poster: Material-Werte im Shop', p.options[0].values, ['Poster matt', 'Foto-Glanzpapier', 'Leinwand', 'Gerahmt · Schwarz', 'Gerahmt · Weiss', 'Gerahmt · Eiche']);
  wahr('Poster: neue Varianten tracked=false, CONTINUE', p.variants.filter((v) => !vorher.variants.some((q) => q.id === v.id)).every((v) => v.inventoryItem.tracked === false && v.inventoryPolicy === 'CONTINUE'));
  wahr('Poster: Beschreibung mit Block', p.descriptionHtml.includes(MARKE_AUF) && p.descriptionHtml.includes('Materialien im Vergleich'));
  const reihe = shop.reihenfolge().filter((x) => x !== 'productByHandle');
  ist('Poster: Reihenfolge der Schreibaufrufe: Option → Optionswerte → Varianten → Beschreibung', reihe, ['productOptionsCreate', 'productOptionUpdate', 'productVariantsBulkCreate', 'productUpdate']);
  ist('Poster: erste Mutation kommt NACH dem ersten Lesen', shop.reihenfolge()[0], 'productByHandle');
  ist('Poster: Option mit LEAVE_AS_IS-Eingabe (Position 1, erster Wert = «Poster matt»)', shop.aufrufe.find((a) => a.name === 'productOptionsCreate').v.opts, [{ name: 'Material', position: 1, values: [{ name: 'Poster matt' }] }]);
  ist('Poster: Optionswerte vor den Varianten ergänzt (5 neue Material-Werte)', shop.aufrufe.find((a) => a.name === 'productOptionUpdate').v.add.map((x) => x.name), ['Foto-Glanzpapier', 'Leinwand', 'Gerahmt · Schwarz', 'Gerahmt · Weiss', 'Gerahmt · Eiche']);
  // Sicherung
  const sf = join(dir, 'sicherung', sicherungsName(HANDLES.poster));
  wahr('Poster: Sicherung des Ausgangszustands geschrieben', existsSync(sf));
  const sj = JSON.parse(readFileSync(sf, 'utf8'));
  ist('Poster: Sicherung enthält den Zustand VOR dem Schreiben (1 Option, 4 Varianten)', [sj.zustand.options.length, sj.zustand.variants.length, sj.zustand.descriptionHtml === vorher.descriptionHtml], [1, 4, true]);
  // Ledger
  const lg = readFileSync(join(dir, 'ledger.txt'), 'utf8').trim().split('\n');
  ist('Poster: Ledger hat eine Zeile mit OK', [lg.length, lg[0].split('\t')[0], /^OK 18 Varianten/.test(lg[0].split('\t')[3])], [1, HANDLES.poster, true]);
  // zweiter Lauf: laut Ledger erledigt, keine Mutation
  const vor = shop.aufrufe.length;
  const r2 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Poster: zweiter Lauf überspringt laut Ledger, kein Aufruf', [r2.ergebnisse.map((x) => x.status), shop.aufrufe.length - vor], [['UEBERSPRUNGEN'], 0]);
  // dritter Lauf ohne Ledger gegen den schon geschriebenen Shop: Plan neu berechnen (Bestand = Zustand jetzt) → nichts mehr zu schreiben
  rmSync(join(dir, 'ledger.txt'));
  const jetztBestand = klon(paket.bestand); const pj = shop.produkte.get(HANDLES.poster);
  jetztBestand[HANDLES.poster] = { ...jetztBestand[HANDLES.poster], descriptionHtml: pj.descriptionHtml, options: pj.options.map((o) => ({ name: o.name, position: o.position, values: o.values })),
    variants: pj.variants.map((v) => ({ id: v.id, sku: v.sku, price: v.price, inventoryPolicy: v.inventoryPolicy, selectedOptions: v.selectedOptions })) };
  const plan3 = planVon([HANDLES.poster], jetztBestand);
  ist('Poster: neu geplant nach dem Schreiben → 0 neue Varianten, alle 14 «schonDa»', [plan3.produkte[0].neu.length, plan3.produkte[0].schonDa.length, plan3.produkte[0].bestehende.length], [0, 14, 4]);
  const vor3 = shop.zaehle('productVariantsBulkCreate') + shop.zaehle('productOptionsCreate');
  const r3 = await lauf({ plan: plan3, gql: shop.gql, ...cfg(dir) });
  ist('Poster: dritter Lauf (ohne Ledger) legt nichts doppelt an', [r3.exit, shop.zaehle('productVariantsBulkCreate') + shop.zaehle('productOptionsCreate') - vor3, shop.produkte.get(HANDLES.poster).variants.length], [0, 0, 18]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 3. Hoodie: Blocker-Befund sperrt, mit BEFUND_OK läuft er
{
  const dir = tmp(); const plan = planVon([HANDLES.hoodie]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Hoodie: ohne Bestätigung GESPERRT, nichts geschrieben', [r.exit, r.ergebnisse.map((x) => x.status), shop.aufrufe.length], [0, ['GESPERRT'], 0]);
  const r2 = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [HANDLES.hoodie] }) });
  ist('Hoodie: mit Bestätigung OK, 19 Varianten', [r2.exit, r2.ergebnisse.map((x) => x.status), shop.produkte.get(HANDLES.hoodie).variants.length], [0, ['OK'], 19]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 4. Samsung (neu): productSet, Metafelder, Editor-Baustein, DRAFT
{
  const dir = tmp(); const plan = planVon([HANDLES.samsung]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Samsung: Exit 0, OK', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK']]);
  const p = shop.produkte.get(HANDLES.samsung);
  ist('Samsung: DRAFT, 84 Varianten, Optionen Material → Handymodell', [p.status, p.variants.length, p.options.map((o) => o.name)], ['DRAFT', 84, ['Material', 'Handymodell']]);
  ist('Samsung: genau ein productSet, genau eine Mutation für Metafelder (7 Felder, < 25)', [shop.zaehle('productSet'), shop.zaehle('metafieldsSet'), p.metafields.length], [1, 1, 7]);
  wahr('Samsung: Editor-Baustein ohne Platzhalter, mit numerischer Variantennummer und erstem Bild', !p.descriptionHtml.includes(PLATZHALTER_VARIANTE) && !p.descriptionHtml.includes(PLATZHALTER_BILD)
    && /data-variant="\d+"/.test(p.descriptionHtml) && p.descriptionHtml.includes(plan.produkte[0].neuesProdukt.bilder[0].url));
  const ersteSku = plan.produkte[0].neu[0].sku, v1 = p.variants.find((v) => v.sku === ersteSku);
  wahr('Samsung: data-variant ist die Nummer der ersten geplanten Variante', p.descriptionHtml.includes(`data-variant="${v1.id.split('/').pop()}"`));
  wahr('Samsung: Tags wie im Plan, nicht «bild-ok»', p.tags.includes('wunschdesign') && !p.tags.includes('bild-ok'));
  wahr('Samsung: Kategorie wie beim iPhone-Produkt', p.category === 'gid://shopify/TaxonomyCategory/el-4-8-4-2');
  ist('Samsung: vier Bilder', p.media.length, 4);
  ist('Samsung: Plan-Eingabe von productSet = was der Trockenlauf zeigt', produktSetEingabe(plan.produkte[0]).variants.length, 84);
  wahr('Samsung: Sicherung entfällt (es gibt keinen Ausgangszustand)', !existsSync(join(dir, 'sicherung', sicherungsName(HANDLES.samsung))));
  // zweiter Lauf ohne Ledger: Produkt gibt es schon → ergänzt nur, legt es nicht noch einmal an
  rmSync(join(dir, 'ledger.txt'));
  const r2 = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Samsung: Wiederholung ohne Ledger legt das Produkt nicht doppelt an', [r2.exit, shop.zaehle('productSet'), shop.produkte.size], [0, 1, Object.keys(paket.bestand).length + 1]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 5. Alles zusammen (Hoodie bestätigt): 165 neue Varianten, alle OK
{
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand);
  const vorab = Object.values(paket.bestand).map((b) => b.variants.length).reduce((a, c) => a + c, 0);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [HANDLES.hoodie] }) });
  ist('Alle fünf: Exit 0, fünf OK', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK', 'OK', 'OK', 'OK', 'OK']]);
  const gesamt = [...shop.produkte.values()].reduce((a, p) => a + p.variants.length, 0);
  ist('Alle fünf: 165 Varianten mehr als vorher', gesamt - vorab, 165);
  wahr('Alle: höchstens 100 Varianten je Produkt', [...shop.produkte.values()].every((p) => p.variants.length <= 100));
  ist('Alle: Option «Material» steht überall an Position 1', [...shop.produkte.values()].map((p) => p.options[0].name + p.options[0].position), Array(5).fill('Material1'));
  ist('Alle: SKUs je Produkt eindeutig', [...shop.produkte.values()].map((p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length), Array(5).fill(true));
  wahr('Alle: jede SKU endet auf eine Printful-Nummer', [...shop.produkte.values()].every((p) => p.variants.every((v) => pfIdAusSku(v.sku))));
  ist('Alle: iPhone braucht nur einen Variantenaufruf (32 ≤ 50)', shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate' && a.v.pid === paket.bestand[HANDLES.iphone].id).length, 1);
  ist('Alle: T-Shirt braucht einen Aufruf (24 ≤ 50)', shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate' && a.v.pid === paket.bestand[HANDLES.shirt].id).length, 1);
  ist('Ledger: fünf Erfolge', [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length, 5);
  ist('Sicherungen: vier Dateien (Samsung hat keinen Ausgangszustand)', readdirSync(join(dir, 'sicherung')).length, 4);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 6. Stückelung: mehr als 50 neue Varianten in einem erweiterten Produkt → mehrere Aufrufe zu höchstens 50
{
  const dir = tmp(); const bestand = klon(paket.bestand);
  // künstlich: iPhone-Plan mit 120 neuen Varianten
  const plan = planVon([HANDLES.iphone]); const pr = plan.produkte[0];
  const basis = pr.neu[0]; const mehr = [];
  for (let i = 0; i < 120; i++) mehr.push({ ...basis, sku: `3615382_9${String(i).padStart(4, '0')}`, optionen: { Material: 'Klare Hülle', Handymodell: pr.optionen.nachher[1].werte[i % 16] } });
  // gleiche Kombination mehrfach ist in der Attrappe erlaubt (nur SKU zählt)
  pr.neu = mehr; pr.summe = { ...pr.summe, neu: 120, gesamt: 136 };
  const shop = neuerShop(bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir), maxFehlerFolge: 3 });
  const stuecke = shop.aufrufe.filter((a) => a.name === 'productVariantsBulkCreate').map((a) => a.v.vs.length);
  ist('Stückelung: 120 Varianten → 50 + 50 + 20', stuecke, [50, 50, 20]);
  wahr('Stückelung: Ergebnis nicht Exit 1 (Zustand weicht wegen der künstlichen Plan-Änderung höchstens ab)', [0, 3].includes(r.exit));
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 7. Tageslimit: Exit 4, vorherige Produkte bleiben im Ledger, spätere unberührt
{
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { tageslimitAb: 14 + 11 + 5 });   // Poster (14) + Hoodie (11) gehen, das T-Shirt (24) scheitert
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [HANDLES.hoodie] }) });
  ist('Tageslimit: Exit 4', r.exit, 4);
  ist('Tageslimit: Poster und Hoodie OK, T-Shirt TAGESLIMIT, nichts danach', r.ergebnisse.map((x) => `${x.handle.slice(0, 12)}:${x.status}`), ['poster-zum-s:OK', 'unisex-hoodi:OK', 'unisex-t-shi:TAGESLIMIT']);
  ist('Tageslimit: iPhone und Samsung nicht angefasst', [shop.produkte.get(HANDLES.iphone).variants.length, shop.produkte.has(HANDLES.samsung)], [16, false]);
  ist('Tageslimit: Ledger kennt nur die zwei Erfolge (nicht wiederholen, was scheiterte)', [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length, 2);
  const stand = shop.zaehle('productVariantsBulkCreate');
  ist('Tageslimit: nach dem Fehler kein weiterer Versuch', shop.zaehle('productVariantsBulkCreate'), stand);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 8. Abweichung nach dem Schreiben: Exit 3, sofort Schluss
{
  const dir = tmp(); const plan = planVon([HANDLES.poster, HANDLES.shirt]);
  const shop = neuerShop(paket.bestand, { verschluckeSku: '9000001_6875' });    // Shopify meldet Erfolg, die Variante fehlt aber
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Abweichung (Variante verschwunden): Exit 3', [r.exit, r.ergebnisse.map((x) => x.status)], [3, ['ABWEICHUNG']]);
  wahr('Abweichung: Liste nennt die fehlende SKU', r.ergebnisse[0].liste.some((x) => /9000001_6875/.test(x)));
  ist('Abweichung: nächstes Produkt (T-Shirt) wird nicht mehr angefasst', shop.produkte.get(HANDLES.shirt).variants.length, 9);
  ist('Abweichung: kein Ledger-Erfolg', existsSync(join(dir, 'ledger.txt')) ? [...ledgerLesen(join(dir, 'ledger.txt')).keys()].length : 0, 0);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { preisAendern: { '9000001_6875': '99.90' } });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Abweichung (falscher Preis im Shop): Exit 3', [r.exit, r.ergebnisse[0].status, r.ergebnisse[0].liste.some((x) => /Preis 9000001_6875/.test(x))], [3, 'ABWEICHUNG', true]);
  rmSync(dir, { recursive: true, force: true });
}
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const shop = neuerShop(paket.bestand, { beschreibungVerfaelschen: true });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Abweichung (Beschreibung ausserhalb des Blocks verändert): Exit 3', [r.exit, r.ergebnisse[0].status], [3, 'ABWEICHUNG']);
  rmSync(dir, { recursive: true, force: true });
}
{ // Ausgangszustand ≠ Plan (jemand hat den Preis einer vorhandenen Variante geändert): Exit 3, KEINE Mutation
  const dir = tmp(); const plan = planVon([HANDLES.poster]);
  const b2 = klon(paket.bestand); b2[HANDLES.poster].variants[0].price = '27.90';
  const shop = neuerShop(b2);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Vorab: geänderter Preis seit dem Plan → Exit 3, keine Mutation, keine Sicherung', [r.exit, r.ergebnisse[0].status, shop.aufrufe.filter((a) => a.name !== 'productByHandle').length, existsSync(join(dir, 'sicherung'))], [3, 'ABWEICHUNG', 0, false]);
  rmSync(dir, { recursive: true, force: true });
}
{ // Produkt-ID im Shop ≠ Plan
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  shop.produkte.get(HANDLES.poster).id = 'gid://shopify/Product/1';
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Vorab: andere Produkt-ID → Exit 3', [r.exit, r.ergebnisse[0].status], [3, 'ABWEICHUNG']);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 9. Drei Fehler in Folge → Abbruch (Exit 1)
{
  const dir = tmp(); const plan = planVon(); const shop = neuerShop(paket.bestand, { alleFehlschlagen: true });
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir, { befundOk: [HANDLES.hoodie] }) });
  ist('Fehlerfolge: Exit 1 nach dem dritten Fehler', [r.exit, r.ergebnisse.map((x) => x.status)], [1, ['FEHLER', 'FEHLER', 'FEHLER']]);
  ist('Fehlerfolge: iPhone und Samsung nie versucht', [shop.produkte.get(HANDLES.iphone).variants.length, shop.produkte.has(HANDLES.samsung)], [16, false]);
  rmSync(dir, { recursive: true, force: true });
}
{ // ein Fehler dazwischen setzt die Folge nicht fort, wenn danach etwas gelingt (hier: Hoodie gesperrt zählt nicht als Fehler)
  const dir = tmp(); const plan = planVon([HANDLES.hoodie, HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Gesperrtes Produkt (Hoodie) bremst die übrigen nicht, Reihenfolge wie in der Spezifikation', [r.exit, r.ergebnisse.map((x) => x.status)], [0, ['OK', 'GESPERRT']]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 10. Sicherung wird nie überschrieben
{
  const dir = tmp(); const plan = planVon([HANDLES.poster]); const shop = neuerShop(paket.bestand);
  const sd = join(dir, 'sicherung'); const sf = join(sd, sicherungsName(HANDLES.poster));
  const { mkdirSync } = await import('node:fs'); mkdirSync(sd, { recursive: true }); writeFileSync(sf, '{"alt":true}\n');
  const r = await lauf({ plan, gql: shop.gql, ...cfg(dir) });
  ist('Sicherung: vorhandene Datei bleibt unverändert, das Produkt wird trotzdem geschrieben (kein Fehler)', [r.exit, r.ergebnisse.map((x) => x.status), readFileSync(sf, 'utf8'), shop.produkte.get(HANDLES.poster).variants.length], [0, ['OK'], '{"alt":true}\n', 18]);
  rmSync(dir, { recursive: true, force: true });
}

// ───────────────────────────────────────────────────────── 11. vergleiche(): erkennt jede Art von Abweichung
{
  const plan = planVon([HANDLES.poster]); const pr = plan.produkte[0];
  const shop = neuerShop(paket.bestand); await lauf({ plan, gql: shop.gql, ...cfg(tmp()) });
  const gut = await leseFrisch(shop.gql, HANDLES.poster);
  ist('vergleiche: geschriebener Zustand = Plan', vergleiche(pr, gut), []);
  const a = klon(gut); a.variants.pop(); wahr('vergleiche: fehlende Variante', vergleiche(pr, a).length > 0);
  const b = klon(gut); b.options.reverse(); wahr('vergleiche: Option an falscher Stelle', vergleiche(pr, b).some((x) => /Optionen/.test(x)));
  const c = klon(gut); c.variants[0].price = '1.00'; wahr('vergleiche: falscher Preis', vergleiche(pr, c).some((x) => /Preis/.test(x)));
  const d = klon(gut); d.variants[5].optionen.Material = 'Leinwand'; wahr('vergleiche: falscher Optionswert', vergleiche(pr, d).some((x) => /Option /.test(x)));
  const e = klon(gut); e.descriptionHtml = e.descriptionHtml.replace(/<!-- lx-material-v1 -->[\s\S]*<!-- \/lx-material-v1 -->/, ''); wahr('vergleiche: Block fehlt', vergleiche(pr, e).some((x) => /Materialblock fehlt/.test(x)));
  const f = klon(gut); f.variants[0].id = 'gid://shopify/ProductVariant/42'; wahr('vergleiche: vorhandene Variante ersetzt (andere ID)', vergleiche(pr, f).some((x) => /ersetzt/.test(x)));
  const g = klon(gut); g.variants[g.variants.length - 1].inventoryPolicy = 'DENY'; wahr('vergleiche: inventoryPolicy der neuen Variante', vergleiche(pr, g).some((x) => /inventoryPolicy/.test(x)));
  ist('vergleiche: nicht lesbares Produkt', vergleiche(pr, null), [`Produkt ${HANDLES.poster} nicht lesbar`]);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
