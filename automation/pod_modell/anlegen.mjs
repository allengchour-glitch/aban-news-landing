/**
 * SCHREIBWEG der Modell-Fabrik: legt ein geplantes «Selbst gestalten»-Produkt als ENTWURF an (status DRAFT, in keinem Verkaufskanal). Wird NUR von pod_modell.mjs mit LIVE=1 aufgerufen.
 * Alle Netzzugriffe laufen über die hineingereichte Funktion `gql(query, variables)` → {data}|{errors} (gqlFuer aus lib/pod_auswahl_gql.mjs: Mutationen werden nie still wiederholt);
 * die Tests reichen eine Attrappe hinein (fake_shopify.mjs), es wird nie ein echter Dienst berührt.
 *
 * Ablauf je Produkt:
 *   0. Ledger: steht der Handle schon als OK im Ledger → übersprungen (idempotent).
 *   1. Handle frisch lesen. Gibt es ihn schon: nur das EIGENE halb fertige Produkt wird fortgesetzt (Ledger-Eintrag BEGONNEN mit gleicher Produkt-ID, Status DRAFT, Tag sg-fabrik, Titel/Tags/Optionen/
 *      SKUs wie im Plan). Alles andere = Abweichung OHNE Schreibzugriff (ein vorhandenes Produkt wird NIE überschrieben).
 *   2. SKU-Präfix im Shop suchen (productVariants query sku:<Präfix>_*): jeder Treffer, der nicht zum eigenen Produkt gehört → Abweichung ohne Schreibzugriff.
 *   3. Variantenbudget: passt das Produkt nicht mehr in den Rest des Tageslimits, wird es gar nicht begonnen (Exit 4).
 *   4. productSet (synchron): Titel, Handle, DRAFT, Optionen, Varianten (SKU, Preis, CONTINUE, nicht verfolgt), Medien (files). Sofort danach Ledger BEGONNEN mit der Produkt-ID.
 *   5. metafieldsSet (Editor-Karte, Modellnummer, Klasse, …).
 *   6. Warten bis alle Medien READY sind, dann productVariantAppendMedia je Farbe/Bild (productVariantsBulkUpdate mit mediaSrc wird von Shopify ignoriert, GEMESSEN 04.11.2026).
 *   7. Beschreibung: Platzhalter für die erste Variante und die Editor-Adresse ersetzen (productUpdate).
 *   8. FRISCH zurücklesen und mit dem Plan vergleichen (Titel, Handle, DRAFT, Tags, Optionen, jede Variante mit SKU/Preis/Optionen/Bild, Medien READY, Metafelder, Beschreibung, KEINE Veröffentlichung).
 *      Abweichung → AbweichungFehler (Exit 3). Dann Ledger OK.
 * Rücknahme (`zuruecknehmen`): löscht NUR Produkte, die im Ledger stehen, noch DRAFT sind, das Tag sg-fabrik tragen, die Ledger-ID haben und in keinem Kanal veröffentlicht sind.
 *
 * EXIT-CODES: 0 alles Geplante ausgeführt · 1 Fehler (Produkt mit FEHLER oder drei Fehler in Folge) · 2 Lauf-Grenze (höchstens `maxProLauf` neue Varianten je Lauf, Rest am nächsten Tag)
 *             3 Abweichung (Zustand ≠ Plan) · 4 Tageslimit für neue Varianten (später denselben Befehl wiederholen) · 5 mindestens ein Produkt GESPERRT (Tor nicht bestanden)
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pruefeAntwort, TageslimitFehler, AbweichungFehler, M_SET, M_META, M_UPDATE } from '../lib/pod_auswahl_schreiben.mjs';
import { PLATZHALTER_VARIANTE, PLATZHALTER_EDITOR, PLATZHALTER_SHOP, htmlText } from './beschreibung.mjs';

export { TageslimitFehler, AbweichungFehler };
export const MARKER_TAG = 'sg-fabrik';
export const CHUNK_META = 25;

// ───────────────────────────────────────────────────────── GraphQL-Texte
export const Q_PRODUKT = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status vendor productType tags descriptionHtml seo{ title description }
  options{ id name position optionValues{ id name hasVariants } }
  variants(first:250){ nodes{ id sku price inventoryPolicy selectedOptions{ name value } inventoryItem{ tracked requiresShipping } media(first:5){ nodes{ id alt } } } pageInfo{ hasNextPage } }
  media(first:100){ nodes{ id alt status mediaContentType } }
  metafields(first:50){ nodes{ namespace key type value } }
  resourcePublicationsCount{ count } } }`;
export const Q_SKU = `query($q:String!){ productVariants(first:5, query:$q){ nodes{ id sku product{ id handle } } } }`;
export const M_BIND = `mutation($p:ID!,$m:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$p, variantMedia:$m){ userErrors{ field message code } } }`;
export const M_DELETE = `mutation($id:ID!){ productDelete(input:{id:$id}){ deletedProductId userErrors{ field message } } }`;

const nummer = (gid) => String(gid ?? '').split('/').pop();
const normHtml = (h) => String(h ?? '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').replace(/\s*\/>/g, '>').trim();

// ───────────────────────────────────────────────────────── Ledger (Anhänge, eine Zeile je Ereignis)
export const LEDGER_KOPF = '# Modell-Fabrik Ledger: Zeit\\tHandle\\tPrintful-Nr\\tStatus\\tProdukt-ID\\tDetail (BEGONNEN, OK, ZURUECK, FEHLER)';
export function ledgerLesen(pfad) {
  const m = new Map();
  if (!pfad || !existsSync(pfad)) return m;
  for (const z of readFileSync(pfad, 'utf8').split('\n')) {
    if (!z.trim() || z.startsWith('#')) continue;
    const [zeit, handle, pfNr, status, produktId, ...detail] = z.split('\t');
    if (handle && status) m.set(handle, { zeit, handle, pfNr, status, produktId: produktId || m.get(handle)?.produktId || null, detail: detail.join('\t') });   // eine spätere Zeile ohne ID (FEHLER) behält die ID der BEGONNEN-Zeile
  }
  return m;
}
export function ledgerSchreiben(pfad, { handle, pfNr, status, produktId = '', detail = '' }, jetzt = () => new Date().toISOString()) {
  if (!pfad) return;
  mkdirSync(dirname(pfad), { recursive: true });
  if (!existsSync(pfad)) writeFileSync(pfad, LEDGER_KOPF.replace(/\\t/g, '\t') + '\n');
  appendFileSync(pfad, [jetzt(), handle, pfNr, status, produktId, String(detail).replace(/[\t\n]/g, ' ')].join('\t') + '\n');
}

// ───────────────────────────────────────────────────────── Lesen und Vergleichen
export const knoten = (p) => ({
  ...p, optionen: (p.options ?? []).map((o) => ({ name: o.name, position: o.position, werte: (o.optionValues ?? []).map((w) => ({ name: w.name, hatVarianten: w.hasVariants })) })),
  varianten: (p.variants?.nodes ?? []).map((v) => ({ ...v, optionen: Object.fromEntries((v.selectedOptions ?? []).map((o) => [o.name, o.value])), bilder: (v.media?.nodes ?? []).map((m) => m.alt) })),
  medien: p.media?.nodes ?? [], metafelder: p.metafields?.nodes ?? [], kanaele: p.resourcePublicationsCount?.count ?? null,
});
export async function leseFrisch(gql, handle) {
  const j = await gql(Q_PRODUKT, { h: handle });
  if (j.errors) throw new Error('Abfrage: ' + JSON.stringify(j.errors).slice(0, 300));
  const p = j.data?.productByIdentifier;
  if (!p) return null;
  if ((p.variants?.nodes?.length ?? 0) >= 250 || p.variants?.pageInfo?.hasNextPage) throw new AbweichungFehler(`${handle}: mehr Varianten gelesen, als die Abfrage ohne Seitenblätterung fasst`);
  return knoten(p);
}

/** Beschreibung, wie sie nach dem letzten Schritt im Shop stehen soll. */
export function sollBeschreibung(plan, { ersteVarianteNr, editorUrl, shopVarianten }) {
  return plan.beschreibungHtml.split(PLATZHALTER_VARIANTE).join(String(ersteVarianteNr)).split(PLATZHALTER_EDITOR).join(editorUrl)
    .split(JSON.stringify(PLATZHALTER_SHOP)).join(JSON.stringify(shopVarianten ?? {}));
}
/** Abbildung Shopify-Variantennummer → Printful-Variante für die Karte des Editors (shop.varianten), aus den frisch gelesenen Varianten und den SKUs des Plans. */
export function shopVariantenVon(plan, variantenIst) {
  const jeSku = new Map(plan.varianten.map((v) => [v.sku, v.printfulVariantId]));
  const o = {};
  for (const x of variantenIst ?? []) if (jeSku.has(x.sku)) o[nummer(x.id)] = jeSku.get(x.sku);
  return o;
}
const jsonGleich = (a, b) => { try { return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b)); } catch { return a === b; } };

/** Vergleicht den frisch gelesenen Zustand mit dem Plan. Gibt die Liste der Abweichungen zurück (leer = gleich). */
export function vergleiche(plan, ist, { editorUrl, vollstaendig = true } = {}) {
  const a = [];
  const gl = (n, x, y) => { if (JSON.stringify(x) !== JSON.stringify(y)) a.push(`${n}: ist «${typeof x === 'string' ? x : JSON.stringify(x)}» ≠ soll «${typeof y === 'string' ? y : JSON.stringify(y)}»`); };
  gl('Status', ist.status, 'DRAFT'); gl('Handle', ist.handle, plan.handle); gl('Titel', ist.title, plan.titel); gl('Verkäufer', ist.vendor, plan.vendor); gl('Produktart', ist.productType, plan.produktart);
  gl('Tags', [...(ist.tags ?? [])].sort(), [...plan.tags].sort());
  if (plan.seo) { gl('SEO-Titel', ist.seo?.title ?? null, plan.seo.title); gl('SEO-Text', ist.seo?.description ?? null, plan.seo.description); }
  gl('Optionen (Namen)', ist.optionen.map((o) => o.name), plan.optionen.map((o) => o.name));
  for (const o of plan.optionen) { const io = ist.optionen.find((x) => x.name === o.name); gl(`Werte ${o.name}`, (io?.werte ?? []).map((w) => w.name), o.werte); if ((io?.werte ?? []).some((w) => w.hatVarianten === false)) a.push(`Option ${o.name}: Wert ohne Variante`); }
  gl('Anzahl Varianten', ist.varianten.length, plan.varianten.length);
  const nachSku = new Map(ist.varianten.map((v) => [v.sku, v]));
  for (const v of plan.varianten) {
    const x = nachSku.get(v.sku);
    if (!x) { a.push(`Variante ${v.sku} fehlt`); continue; }
    if (Number(x.price) !== Number(v.preisChf)) a.push(`Variante ${v.sku}: Preis ${x.price} ≠ ${v.preisChf}`);
    gl(`Variante ${v.sku} Optionen`, x.optionen, v.optionen);
    if (x.inventoryPolicy !== 'CONTINUE') a.push(`Variante ${v.sku}: inventoryPolicy ${x.inventoryPolicy}`);
    if (x.inventoryItem?.tracked !== false) a.push(`Variante ${v.sku}: Bestand wird verfolgt`);
    if (vollstaendig && v.bildAlt && !x.bilder.includes(v.bildAlt)) a.push(`Variante ${v.sku}: Bild «${v.bildAlt}» nicht verbunden`);
  }
  for (const m of plan.medien) { const x = ist.medien.find((y) => y.alt === m.alt); if (!x) a.push(`Medium «${m.alt}» fehlt`); else if (x.status !== 'READY') a.push(`Medium «${m.alt}» ${x.status}`); }
  for (const f of plan.metafelder) {
    const x = ist.metafelder.find((y) => y.namespace === f.namespace && y.key === f.key);
    if (!x) a.push(`Metafeld ${f.namespace}.${f.key} fehlt`); else if (f.type === 'json' ? !jsonGleich(x.value, f.value) : String(x.value) !== String(f.value)) a.push(`Metafeld ${f.namespace}.${f.key} weicht ab`);
  }
  if (vollstaendig) {
    const ersteNr = nummer((nachSku.get(plan.varianten[0]?.sku) ?? ist.varianten[0])?.id);
    const soll = sollBeschreibung(plan, { ersteVarianteNr: ersteNr, editorUrl, shopVarianten: shopVariantenVon(plan, ist.varianten) });
    if (normHtml(ist.descriptionHtml) !== normHtml(soll)) a.push(`Beschreibung weicht ab (Text ${htmlText(ist.descriptionHtml).length} gegen ${htmlText(soll).length} Zeichen; Platzhalter übrig: ${/__ERSTE_VARIANTE__|__LSPOD_EDITOR_URL__|__SHOP_VARIANTEN__/.test(ist.descriptionHtml)})`);
  }
  if (ist.kanaele !== 0) a.push(`Produkt ist in ${ist.kanaele} Verkaufskanal/-kanälen veröffentlicht (soll: keinem)`);
  return a;
}

// ───────────────────────────────────────────────────────── Eingaben für Shopify
export function produktSetEingabe(plan) {
  const namen = plan.optionen.map((o) => o.name);
  return {
    title: plan.titel, handle: plan.handle, status: 'DRAFT', vendor: plan.vendor, productType: plan.produktart, tags: plan.tags, seo: plan.seo,
    descriptionHtml: plan.beschreibungHtml,   // mit Platzhaltern; Schritt 7 ersetzt sie
    productOptions: plan.optionen.map((o, i) => ({ name: o.name, position: i + 1, values: o.werte.map((w) => ({ name: w })) })),
    variants: plan.varianten.map((v) => ({ optionValues: namen.map((n) => ({ optionName: n, name: v.optionen[n] })), price: v.preisChf.toFixed(2), sku: v.sku, inventoryPolicy: 'CONTINUE', inventoryItem: { tracked: false, requiresShipping: true } })),
    files: plan.medien.map((m) => ({ originalSource: m.url, contentType: 'IMAGE', alt: m.alt })),
  };
}
/** Gruppen für productVariantAppendMedia: je Medium (Alt-Text) die Varianten. */
export function bildGruppen(plan, ist) {
  const mediumJeAlt = new Map(ist.medien.map((m) => [m.alt, m.id]));
  const idJeSku = new Map(ist.varianten.map((v) => [v.sku, v]));
  const gruppen = new Map();
  for (const v of plan.varianten) {
    if (!v.bildAlt) continue;
    const x = idJeSku.get(v.sku);
    if (!x || x.bilder.includes(v.bildAlt)) continue;      // schon verbunden (Wiederaufnahme)
    const mid = mediumJeAlt.get(v.bildAlt);
    if (!mid) continue;
    if (!gruppen.has(mid)) gruppen.set(mid, []);
    gruppen.get(mid).push({ variantId: x.id, mediaIds: [mid] });
  }
  return [...gruppen.values()].flat();
}

// ───────────────────────────────────────────────────────── ein Produkt anlegen
export function pruefeVorhandenes(plan, ist, ledgerEintrag) {
  const a = [];
  if (!ledgerEintrag || !['BEGONNEN', 'FEHLER'].includes(ledgerEintrag.status) || !ledgerEintrag.produktId) a.push('der Handle gehört keinem halb fertigen Produkt dieser Fabrik (Ledger kennt ihn nicht als BEGONNEN)');
  else if (ledgerEintrag.produktId !== ist.id) a.push(`Produkt-ID ${ist.id} ≠ Ledger ${ledgerEintrag.produktId}`);
  if (ist.status !== 'DRAFT') a.push(`Status ${ist.status} ≠ DRAFT`);
  if (!(ist.tags ?? []).includes(MARKER_TAG)) a.push(`Tag ${MARKER_TAG} fehlt`);
  if (ist.title !== plan.titel) a.push(`Titel «${ist.title}» ≠ «${plan.titel}»`);
  const erlaubt = new Set(plan.varianten.map((v) => v.sku));
  for (const v of ist.varianten) if (!erlaubt.has(v.sku)) a.push(`SKU ${v.sku} gehört nicht zum Plan`);
  return a;
}

const warteStandard = (ms) => new Promise((r) => setTimeout(r, ms));

export async function produktAnlegen(plan, { gql, ledgerPfad, editorUrl, log = console.log, jetzt = () => new Date().toISOString(), warte = warteStandard, mediaPolls = 20, mediaPauseMs = 3000, sicherungsDir = null }) {
  const L = (status, extra = {}) => ledgerSchreiben(ledgerPfad, { handle: plan.handle, pfNr: plan.printfulProductId, status, ...extra }, jetzt);
  const praefix = String(plan.varianten[0].sku).split('_')[0];
  let schon = await leseFrisch(gql, plan.handle);
  const led = ledgerLesen(ledgerPfad).get(plan.handle);
  if (schon) {
    const fremd = pruefeVorhandenes(plan, schon, led);
    if (fremd.length) throw new AbweichungFehler(`${plan.handle}: Handle gibt es schon, aber nicht als das eigene halb fertige DRAFT-Produkt dieser Fabrik, nichts geschrieben`, fremd);
    log(`   Produkt gab es schon (${schon.id}, eigener Entwurf), ergänze, was fehlt`);
  } else {
    // SKU-Präfix im Shop: kein Treffer ausser dem eigenen Produkt
    const j = await gql(Q_SKU, { q: `sku:${praefix}_*` });
    if (j.errors) throw new Error('SKU-Suche: ' + JSON.stringify(j.errors).slice(0, 300));
    const treffer = (j.data?.productVariants?.nodes ?? []);
    if (treffer.length) throw new AbweichungFehler(`${plan.handle}: SKU-Präfix ${praefix}_ gibt es im Shop schon (${treffer.map((t) => `${t.sku} in ${t.product?.handle}`).join(', ')}), nichts geschrieben`, treffer.map((t) => t.sku));
    if (sicherungsDir) { mkdirSync(sicherungsDir, { recursive: true }); writeFileSync(join(sicherungsDir, `${plan.handle}.plan.json`), JSON.stringify(plan, null, 1)); }
    const r = pruefeAntwort(await gql(M_SET, { input: produktSetEingabe(plan) }), `${plan.handle}: Produkt anlegen`, 'productSet');
    schon = { id: r.product.id };
    L('BEGONNEN', { produktId: schon.id, detail: `${plan.varianten.length} Varianten` });
    log(`   Produkt angelegt (DRAFT): ${schon.id}`);
  }
  const id = schon.id;
  // Metafelder
  const mf = plan.metafelder.map((m) => ({ ownerId: id, namespace: m.namespace, key: m.key, type: m.type, value: m.value }));
  for (let i = 0; i < mf.length; i += CHUNK_META) pruefeAntwort(await gql(M_META, { mf: mf.slice(i, i + CHUNK_META) }), `${plan.handle}: Metafelder`, 'metafieldsSet');
  // Medien: warten, dann Varianten verbinden
  let ist = null;
  for (let i = 0; i < mediaPolls; i++) {
    ist = await leseFrisch(gql, plan.handle);
    const offen = plan.medien.filter((m) => { const x = ist.medien.find((y) => y.alt === m.alt); return !x || x.status !== 'READY'; });
    const fehlgeschlagen = plan.medien.filter((m) => ist.medien.find((y) => y.alt === m.alt)?.status === 'FAILED');
    if (fehlgeschlagen.length) throw new Error(`${plan.handle}: Medium fehlgeschlagen: ${fehlgeschlagen.map((m) => m.alt).join(', ')}`);
    if (!offen.length) break;
    if (i === mediaPolls - 1) throw new Error(`${plan.handle}: ${offen.length} Medium/Medien nach ${mediaPolls} Versuchen nicht READY`);
    await warte(mediaPauseMs);
  }
  const bind = bildGruppen(plan, ist);
  for (let i = 0; i < bind.length; i += 50) pruefeAntwort(await gql(M_BIND, { p: id, m: bind.slice(i, i + 50) }), `${plan.handle}: Varianten mit Bildern verbinden`, 'productVariantAppendMedia');
  if (bind.length) log(`   ${bind.length} Varianten mit ihrem Bild verbunden`);
  // Beschreibung: Platzhalter ersetzen
  ist = await leseFrisch(gql, plan.handle);
  const erste = ist.varianten.find((v) => v.sku === plan.varianten[0].sku) ?? ist.varianten[0];
  const soll = sollBeschreibung(plan, { ersteVarianteNr: nummer(erste.id), editorUrl, shopVarianten: shopVariantenVon(plan, ist.varianten) });
  if (normHtml(ist.descriptionHtml) !== normHtml(soll)) {
    // nur ersetzen, wenn der Text noch der Plan-Text mit Platzhaltern ist (sonst hat jemand anderes daran geändert)
    if (normHtml(ist.descriptionHtml) !== normHtml(plan.beschreibungHtml)) throw new AbweichungFehler(`${plan.handle}: Beschreibung im Shop ist weder der Plan-Text noch der fertige Text, nichts überschrieben`, ['Beschreibung wurde nach dem Anlegen von anderer Seite geändert (oder Shopify hat das HTML umgeschrieben)']);
    pruefeAntwort(await gql(M_UPDATE, { p: { id, descriptionHtml: soll } }), `${plan.handle}: Editor-Baustein`, 'productUpdate');
    log('   Editor-Baustein: erste Variante, Variantenabbildung und Editor-Adresse eingetragen');
  }
  // FRISCH zurücklesen und vergleichen
  ist = await leseFrisch(gql, plan.handle);
  const abw = vergleiche(plan, ist, { editorUrl });
  if (abw.length) { L('FEHLER', { produktId: id, detail: `Abweichung: ${abw[0]}` }); throw new AbweichungFehler(`${plan.handle}: Zustand nach dem Anlegen weicht vom Plan ab`, abw); }
  L('OK', { produktId: id, detail: `${ist.varianten.length} Varianten, ${ist.medien.length} Medien, frisch gelesen gleich dem Plan` });
  return { produktId: id, varianten: ist.varianten.length, medien: ist.medien.length };
}

// ───────────────────────────────────────────────────────── Lauf über mehrere Produkte
/**
 * @param {{plaene:object[], gql:Function, ledgerPfad:string, editorUrl:string, log?:Function, variantenBudget?:number|null, maxProLauf?:number, maxFehlerFolge?:number, nur?:string[]|null, sicherungsDir?:string|null}} o
 * @returns {{ergebnisse:object[], exit:number}}
 */
export async function lauf({ plaene, gql, ledgerPfad, editorUrl, log = console.log, jetzt = () => new Date().toISOString(), warte = warteStandard, variantenBudget = null, maxProLauf = 3000, maxFehlerFolge = 3, nur = null, sicherungsDir = null, mediaPolls, mediaPauseMs }) {
  if (!editorUrl || !/^https:\/\//.test(editorUrl) || editorUrl.includes('__')) throw new Error('LIVE verweigert: LSPOD_EDITOR_URL fehlt oder ist keine https-Adresse (der Platzhalter darf nie in den Shop)');
  const ledger = ledgerLesen(ledgerPfad);
  const ergebnisse = []; let folge = 0, budget = variantenBudget, neuImLauf = 0, mitFehler = false, gesperrt = false, restTag = false;
  for (const p of plaene) {
    if (nur && !nur.includes(p.handle)) continue;
    if (!p.anlegbar) {
      const offen = (p.tore ?? []).filter((t) => t.art === 'blocker' && t.ergebnis !== 'bestanden').map((t) => t.code);
      log(`✗ ${p.handle ?? p.printfulProductId}: GESPERRT, Tore nicht bestanden: ${offen.join(', ')}`); ergebnisse.push({ handle: p.handle, status: 'GESPERRT', tore: offen }); gesperrt = true; continue;
    }
    if (ledger.get(p.handle)?.status === 'OK') { log(`= ${p.handle}: laut Ledger schon erledigt`); ergebnisse.push({ handle: p.handle, status: 'UEBERSPRUNGEN' }); continue; }
    if (neuImLauf + p.varianten.length > maxProLauf) { log(`LAUF-GRENZE: ${p.handle} (${p.varianten.length} Varianten) würde ${maxProLauf} neue Varianten je Lauf überschreiten, Rest am nächsten Tag`); ergebnisse.push({ handle: p.handle, status: 'RESTTAG' }); restTag = true; continue; }
    if (budget !== null && p.varianten.length > budget) { log(`TAGESLIMIT (Vorprüfung): ${p.handle} braucht ${p.varianten.length} neue Varianten, Budget ${budget}. Nichts begonnen.`); ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT', vorab: true }); return { ergebnisse, exit: 4 }; }
    log(`→ ${p.handle}: ${p.varianten.length} Varianten`);
    try {
      const r = await produktAnlegen(p, { gql, ledgerPfad, editorUrl, log, jetzt, warte, sicherungsDir, ...(mediaPolls ? { mediaPolls } : {}), ...(mediaPauseMs !== undefined ? { mediaPauseMs } : {}) });
      neuImLauf += p.varianten.length; if (budget !== null) budget -= p.varianten.length;
      ergebnisse.push({ handle: p.handle, status: 'OK', ...r }); folge = 0;
      log(`✓ ${p.handle}: ${r.varianten} Varianten, ${r.medien} Medien, frisch gelesen und gleich dem Plan`);
    } catch (e) {
      if (e instanceof TageslimitFehler) { log(`TAGESLIMIT: ${e.message}`); ledgerSchreiben(ledgerPfad, { handle: p.handle, pfNr: p.printfulProductId, status: 'FEHLER', detail: 'Tageslimit' }, jetzt); ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT' }); return { ergebnisse, exit: 4 }; }
      if (e instanceof AbweichungFehler) {
        log(`ABWEICHUNG: ${e.message}`); for (const x of e.liste.slice(0, 20)) log('   · ' + x);
        const eigenes = ledgerLesen(ledgerPfad).get(p.handle);   // nur ein EIGENES (begonnenes) Produkt wird als FEHLER vermerkt; bei einem fremden Handle bleibt das Ledger leer
        if (eigenes && eigenes.status !== 'OK' && eigenes.status !== 'ZURUECK') ledgerSchreiben(ledgerPfad, { handle: p.handle, pfNr: p.printfulProductId, status: 'FEHLER', detail: `Abweichung: ${e.liste[0] ?? e.message}`.slice(0, 200) }, jetzt);
        ergebnisse.push({ handle: p.handle, status: 'ABWEICHUNG', liste: e.liste }); return { ergebnisse, exit: 3 };
      }
      folge++; mitFehler = true; log(`✗ ${p.handle}: ${e.message}`); ledgerSchreiben(ledgerPfad, { handle: p.handle, pfNr: p.printfulProductId, status: 'FEHLER', detail: e.message.slice(0, 200) }, jetzt);
      ergebnisse.push({ handle: p.handle, status: 'FEHLER', fehler: e.message });
      if (folge >= maxFehlerFolge) { log(`ABBRUCH: ${folge} Fehler in Folge`); return { ergebnisse, exit: 1 }; }
    }
  }
  return { ergebnisse, exit: mitFehler ? 1 : gesperrt ? 5 : restTag ? 2 : 0 };
}

// ───────────────────────────────────────────────────────── Rücknahme
/** Löscht NUR Produkte aus dem Ledger (letzter Stand OK oder BEGONNEN/FEHLER mit Produkt-ID), die noch DRAFT sind, das Tag sg-fabrik tragen, die Ledger-ID haben und in keinem Kanal stehen. */
export async function zuruecknehmen({ gql, ledgerPfad, log = console.log, jetzt = () => new Date().toISOString(), nur = null }) {
  const ergebnisse = [];
  for (const e of ledgerLesen(ledgerPfad).values()) {
    if (!['OK', 'BEGONNEN', 'FEHLER'].includes(e.status) || !e.produktId) continue;
    if (nur && !nur.includes(e.handle)) continue;
    const ist = await leseFrisch(gql, e.handle);
    if (!ist) { log(`= ${e.handle}: gibt es nicht mehr`); ledgerSchreiben(ledgerPfad, { handle: e.handle, pfNr: e.pfNr, status: 'ZURUECK', produktId: e.produktId, detail: 'war schon weg' }, jetzt); ergebnisse.push({ handle: e.handle, status: 'WEG' }); continue; }
    const gruende = [];
    if (ist.id !== e.produktId) gruende.push(`Produkt-ID ${ist.id} ≠ Ledger ${e.produktId}`);
    if (ist.status !== 'DRAFT') gruende.push(`Status ${ist.status}, nur ENTWÜRFE werden gelöscht`);
    if (!(ist.tags ?? []).includes(MARKER_TAG)) gruende.push(`Tag ${MARKER_TAG} fehlt (nicht von dieser Fabrik)`);
    if (ist.kanaele !== 0) gruende.push(`in ${ist.kanaele} Kanal/Kanälen veröffentlicht`);
    if (gruende.length) { log(`✗ ${e.handle}: NICHT gelöscht: ${gruende.join('; ')}`); ergebnisse.push({ handle: e.handle, status: 'GESPERRT', gruende }); continue; }
    pruefeAntwort(await gql(M_DELETE, { id: ist.id }), `${e.handle}: löschen`, 'productDelete');
    const danach = await leseFrisch(gql, e.handle);
    if (danach) { log(`✗ ${e.handle}: nach dem Löschen noch vorhanden`); ergebnisse.push({ handle: e.handle, status: 'NOCH_DA' }); continue; }
    ledgerSchreiben(ledgerPfad, { handle: e.handle, pfNr: e.pfNr, status: 'ZURUECK', produktId: e.produktId, detail: 'gelöscht, frisch gelesen: weg' }, jetzt);
    log(`✓ ${e.handle}: gelöscht`); ergebnisse.push({ handle: e.handle, status: 'GELOESCHT' });
  }
  const offen = ergebnisse.filter((r) => ['GESPERRT', 'NOCH_DA'].includes(r.status)).length;
  return { ergebnisse, exit: offen ? 5 : 0 };
}
