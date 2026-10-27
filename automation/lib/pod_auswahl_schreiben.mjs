/**
 * SCHREIBWEG der «Selbst gestalten»-Auswahl. Wird NUR von automation/pod_auswahl.mjs mit LIVE=1 aufgerufen. Alle Netzzugriffe laufen über die
 * hineingereichte Funktion `gql(query, variables)` → Antwort-JSON; die Tests reichen eine Attrappe hinein (es wird nie ein echter Dienst berührt).
 *
 * Ablauf je Produkt (art «erweitern»):
 *   1. frisch lesen, mit dem Plan vergleichen (vorhandene Varianten unverändert?) → sonst AbweichungFehler
 *   2. Sicherung des Ausgangszustands nach dropship/pod-sicherung/<handle>.json (nie überschreiben)
 *   3. productOptionsCreate: Option «Material» an Position 1, variantStrategy LEAVE_AS_IS (vorhandene Varianten bekommen den ersten Wert)
 *   4. productVariantsBulkCreate in Stücken zu 50 (optionValues, price, inventoryPolicy CONTINUE, inventoryItem{sku, tracked:false, requiresShipping:true})
 *   5. Beschreibung: nur der Block zwischen den Kommentarmarken
 *   6. FRISCH zurücklesen und mit dem Plan vergleichen → Abweichung = AbweichungFehler (Exit 3)
 * art «neu» (Samsung-Hülle, DRAFT): productSet (synchron) → Metafelder → Editor-Baustein füllen → zurücklesen und vergleichen.
 *
 * Fehlerregeln: VARIANT_THROTTLE_EXCEEDED / «Daily variant creation limit» → TageslimitFehler (Exit 4, sauber beenden, nicht wiederholen);
 * drei Fehler in Folge → Abbruch; Abweichung nach dem Schreiben → sofort Abbruch (Exit 3). Ledger: nur Erfolge werden übersprungen.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { hashVon, pfIdAusSku, PLATZHALTER_BILD, PLATZHALTER_VARIANTE } from './pod_auswahl_plan.mjs';
import { MARKE_AUF, MARKE_ZU } from './pod_auswahl_spec.mjs';

export class AbweichungFehler extends Error { constructor(m, liste = []) { super(m); this.name = 'AbweichungFehler'; this.liste = liste; } }
export class TageslimitFehler extends Error { constructor(m) { super(m); this.name = 'TageslimitFehler'; } }
export const CHUNK = 50;
const DROSSEL = /VARIANT_THROTTLE|Daily variant creation limit/i;

// ───────────────────────────────────────────────────────── GraphQL-Texte
export const Q_PRODUKT = `query($h:String!){ productByHandle(handle:$h){ id handle title status productType vendor tags descriptionHtml seo{ title description } category{ id }
  options{ id name position values optionValues{ id name } }
  variants(first:250){ edges{ node{ id sku price compareAtPrice inventoryPolicy taxable selectedOptions{ name value } inventoryItem{ tracked requiresShipping } } } }
  media(first:50){ edges{ node{ ... on MediaImage{ id alt image{ url } } } } }
  metafields(first:100){ edges{ node{ namespace key type value } } } } }`;
export const M_OPTION = `mutation($pid:ID!,$opts:[OptionCreateInput!]!){ productOptionsCreate(productId:$pid, options:$opts, variantStrategy:LEAVE_AS_IS){ product{ id options{ name position values } } userErrors{ field message code } } }`;
export const M_OPTION_WERTE = `mutation($pid:ID!,$opt:OptionUpdateInput!,$add:[OptionValueCreateInput!]){ productOptionUpdate(productId:$pid, option:$opt, optionValuesToAdd:$add){ product{ id options{ name position values } } userErrors{ field message code } } }`;
export const M_VARIANTEN =`mutation($pid:ID!,$vs:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$pid, variants:$vs){ productVariants{ id sku } userErrors{ field message code } } }`;
export const M_UPDATE = `mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;
export const M_SET = `mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle status } userErrors{ field message code } } }`;
export const M_META = `mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ metafields{ key } userErrors{ field message code } } }`;

// ───────────────────────────────────────────────────────── Hilfen
export function pruefeAntwort(j, was, pfad) {
  const text = JSON.stringify(j?.errors || '') + JSON.stringify(j?.data?.[pfad]?.userErrors || '');
  if (DROSSEL.test(text)) throw new TageslimitFehler(`${was}: Tageslimit für neue Varianten erreicht`);
  if (j?.errors?.length) throw new Error(`${was}: ${JSON.stringify(j.errors).slice(0, 300)}`);
  const ue = j?.data?.[pfad]?.userErrors || [];
  if (ue.length) throw new Error(`${was}: ${JSON.stringify(ue).slice(0, 300)}`);
  return j.data[pfad];
}

export const knoten = (p) => ({ ...p, options: p.options, variants: p.variants.edges.map((e) => ({ ...e.node, optionen: Object.fromEntries(e.node.selectedOptions.map((o) => [o.name, o.value])) })),
  media: (p.media?.edges || []).map((e) => e.node).filter(Boolean), metafields: (p.metafields?.edges || []).map((e) => e.node) });

export async function leseFrisch(gql, handle) {
  const j = await gql(Q_PRODUKT, { h: handle });
  if (j.errors) throw new Error('Abfrage: ' + JSON.stringify(j.errors).slice(0, 300));
  return j.data?.productByHandle ? knoten(j.data.productByHandle) : null;
}

export function variantenEingabe(neu, optionNamen) {
  return neu.map((v) => ({
    optionValues: optionNamen.map((n) => ({ optionName: n, name: v.optionen[n] })),
    price: v.preisChf.toFixed(2), inventoryPolicy: 'CONTINUE',
    inventoryItem: { sku: v.sku, tracked: false, requiresShipping: true },
  }));
}

/** Text ohne Markup (Shopify darf Leerraum und Entitäten umschreiben, der Inhalt muss gleich bleiben). */
export const nurText = (h) => String(h ?? '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export function blockVon(html) { const a = html.indexOf(MARKE_AUF), z = html.indexOf(MARKE_ZU); return a >= 0 && z > a ? html.slice(a, z + MARKE_ZU.length) : null; }
export function ohneBlock(html) { const b = blockVon(html); return b ? html.replace(b, '') : html; }

/** Vergleich Ist-Zustand ↔ Plan (nach dem Schreiben). Gibt eine Liste von Abweichungen zurück (leer = identisch). */
export function vergleiche(p, ist) {
  const a = [];
  if (!ist) return [`Produkt ${p.handle} nicht lesbar`];
  const nachher = p.optionen.nachher;
  const namen = ist.options.map((o) => o.name);
  if (JSON.stringify(namen) !== JSON.stringify(nachher.map((o) => o.name))) a.push(`Optionen: ${namen.join(', ')} ≠ ${nachher.map((o) => o.name).join(', ')}`);
  for (const o of nachher) {
    const io = ist.options.find((x) => x.name === o.name);
    if (!io) continue;
    if ([...io.values].sort().join('|') !== [...o.werte].sort().join('|')) a.push(`Optionswerte «${o.name}»: ${io.values.join(', ')} ≠ ${o.werte.join(', ')}`);
    if (io.position !== o.position) a.push(`Position «${o.name}»: ${io.position} ≠ ${o.position}`);
  }
  const soll = [...p.bestehende.map((v) => ({ ...v, art: 'bestehend' })), ...p.schonDa.map((v) => ({ ...v, art: 'neu' })), ...p.neu.map((v) => ({ ...v, art: 'neu' }))];
  if (ist.variants.length !== soll.length) a.push(`Variantenzahl ${ist.variants.length} ≠ ${soll.length}`);
  for (const s of soll) {
    const v = ist.variants.find((x) => x.sku === s.sku);
    if (!v) { a.push(`Variante ${s.sku} fehlt`); continue; }
    if (Math.abs(Number(v.price) - s.preisChf) > 0.001) a.push(`Preis ${s.sku}: ${v.price} ≠ ${s.preisChf}`);
    for (const [n, w] of Object.entries(s.optionen)) if (v.optionen[n] !== w) a.push(`Option ${s.sku}/${n}: «${v.optionen[n]}» ≠ «${w}»`);
    if (s.art === 'neu' && v.inventoryPolicy !== 'CONTINUE') a.push(`inventoryPolicy ${s.sku}: ${v.inventoryPolicy}`);
    if (s.art === 'bestehend' && s.id && v.id !== s.id) a.push(`Variante ${s.sku}: ID ${v.id} ≠ ${s.id} (vorhandene Variante ersetzt?)`);
  }
  // Beschreibung: Block vorhanden und gleich, Rest unverändert (als Text verglichen)
  const html = ist.descriptionHtml || '';
  if (p.beschreibung.block) {
    const b = blockVon(html);
    if (!b) a.push('Materialblock fehlt in der Beschreibung');
    else if (nurText(b) !== nurText(p.beschreibung.block)) a.push('Materialblock weicht vom Plan ab');
  }
  const restSoll = nurText(ohneBlock(p.beschreibung.nachher)), restIst = nurText(ohneBlock(html));
  if (restSoll !== restIst) a.push('Beschreibung ausserhalb des Blocks weicht vom Plan ab');
  if (p.art === 'neu') {
    if (ist.status !== 'DRAFT') a.push(`Status ${ist.status} ≠ DRAFT`);
    const t = [...(ist.tags || [])].sort().join(',');
    if (t !== [...p.neuesProdukt.tags].sort().join(',')) a.push(`Tags: ${t}`);
    for (const m of p.neuesProdukt.metafelder) if (!ist.metafields.some((x) => x.namespace === m.namespace && x.key === m.key)) a.push(`Metafeld ${m.namespace}.${m.key} fehlt`);
    if (html.includes(PLATZHALTER_VARIANTE) || html.includes(PLATZHALTER_BILD)) a.push('Editor-Baustein enthält noch Platzhalter');
  }
  return a;
}

export const sicherungsName = (handle) => String(handle).replace(/[^A-Za-z0-9._-]/g, '_') + '.json';

/** Sicherung des Ausgangszustands (nie überschreiben). Gibt true zurück, wenn neu geschrieben. */
export function sichere({ dir, handle, zustand, jetzt = () => new Date().toISOString() }) {
  const pfad = `${dir.replace(/\/$/, '')}/${sicherungsName(handle)}`;
  if (existsSync(pfad)) return false;
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, JSON.stringify({ gesichertAm: jetzt(), handle, zustand }, null, 1) + '\n', { flag: 'wx' });
  return true;
}

// ───────────────────────────────────────────────────────── Ledger (nur Erfolge überspringen)
export function ledgerLesen(pfad) {
  const m = new Map();
  if (!existsSync(pfad)) return m;
  for (const z of readFileSync(pfad, 'utf8').split('\n')) { const [handle, hash, , status] = z.split('\t'); if (handle && hash && /^OK/.test(status || '')) m.set(handle + '\t' + hash, true); }
  return m;
}
/** Schlüssel «Handle TAB Hash»: ändert sich der Plan dieses Produkts, gilt der alte Erfolg nicht mehr. */
export const ledgerSchluessel = (p) => p.handle + '\t' + hashVon({ handle: p.handle, nachher: p.optionen.nachher, neu: p.neu.map((v) => [v.sku, v.preisChf]), html: p.beschreibung.nachher }).slice(0, 16);
export function ledgerSchreiben(pfad, p, status, jetzt = () => new Date().toISOString()) {
  mkdirSync(dirname(pfad), { recursive: true });
  const [handle, hash] = ledgerSchluessel(p).split('\t');
  appendFileSync(pfad, `${handle}\t${hash}\t${jetzt()}\t${status}\n`);
}

// ───────────────────────────────────────────────────────── ein Produkt schreiben
async function erweitern(p, { gql, log, sicherungsDir, jetzt }) {
  const matName = p.optionen.materialOption;
  let ist = await leseFrisch(gql, p.handle);
  if (!ist) throw new AbweichungFehler(`${p.handle}: Produkt nicht gefunden`);
  if (ist.id !== p.produktId) throw new AbweichungFehler(`${p.handle}: Produkt-ID ${ist.id} ≠ Plan ${p.produktId}`);
  // 1. Ausgangszustand = Plan? (vorhandene Varianten unverändert)
  const vorab = [];
  for (const b of p.bestehende) {
    const v = ist.variants.find((x) => x.sku === b.sku);
    if (!v) vorab.push(`vorhandene Variante ${b.sku} fehlt`);
    else if (Math.abs(Number(v.price) - b.preisChf) > 0.001) vorab.push(`Preis ${b.sku}: ${v.price} ≠ Plan ${b.preisChf}`);
  }
  if (vorab.length) throw new AbweichungFehler(`${p.handle}: seit dem Plan verändert`, vorab);
  // 2. Sicherung
  if (sichere({ dir: sicherungsDir, handle: p.handle, zustand: ist, jetzt })) log(`   Sicherung geschrieben: ${sicherungsDir}/${sicherungsName(p.handle)}`);
  // 3. Option «Material»
  if (!ist.options.some((o) => o.name === matName)) {
    const j = await gql(M_OPTION, { pid: ist.id, opts: [{ name: matName, position: 1, values: [{ name: p.optionen.bestandsWert }] }] });
    pruefeAntwort(j, `${p.handle}: Option anlegen`, 'productOptionsCreate');
    ist = await leseFrisch(gql, p.handle);
    const mo = ist.options.find((o) => o.name === matName);
    const fehl = [];
    if (!mo || mo.position !== 1) fehl.push(`«${matName}» nicht an Position 1`);
    for (const b of p.bestehende) { const v = ist.variants.find((x) => x.sku === b.sku); if (!v || v.optionen[matName] !== p.optionen.bestandsWert) fehl.push(`${b.sku}: Material «${v?.optionen?.[matName]}» ≠ «${p.optionen.bestandsWert}»`); }
    if (fehl.length) throw new AbweichungFehler(`${p.handle}: nach dem Anlegen der Option nicht wie geplant`, fehl);
    log(`   Option «${matName}» angelegt (Position 1), vorhandene Varianten = «${p.optionen.bestandsWert}»`);
  }
  // 4a. fehlende Optionswerte ausdrücklich anlegen (nicht darauf verlassen, dass die Variantenanlage sie miterzeugt)
  const namen = p.optionen.nachher.map((o) => o.name);
  for (const o of p.optionen.nachher) {
    const io = ist.options.find((x) => x.name === o.name);
    const fehlt = o.werte.filter((w) => !io.values.includes(w));
    if (!fehlt.length) continue;
    pruefeAntwort(await gql(M_OPTION_WERTE, { pid: ist.id, opt: { id: io.id }, add: fehlt.map((w) => ({ name: w })) }), `${p.handle}: Optionswerte «${o.name}»`, 'productOptionUpdate');
    log(`   Optionswerte «${o.name}» ergänzt: ${fehlt.join(', ')}`);
  }
  ist = await leseFrisch(gql, p.handle);
  // 4b. neue Varianten (nur, was noch nicht da ist), in Stücken
  const offen = p.neu.filter((n) => !ist.variants.some((v) => v.sku === n.sku));
  for (let i = 0; i < offen.length; i += CHUNK) {
    const stueck = offen.slice(i, i + CHUNK);
    const j = await gql(M_VARIANTEN, { pid: ist.id, vs: variantenEingabe(stueck, namen) });
    const r = pruefeAntwort(j, `${p.handle}: Varianten anlegen`, 'productVariantsBulkCreate');
    log(`   ${r.productVariants?.length ?? stueck.length} Varianten angelegt (${i + stueck.length}/${offen.length})`);
  }
  // 5. Beschreibung (nur wenn nötig)
  const aktuell = await leseFrisch(gql, p.handle);
  if (nurText(aktuell.descriptionHtml) !== nurText(p.beschreibung.nachher) || !blockVon(aktuell.descriptionHtml)) {
    pruefeAntwort(await gql(M_UPDATE, { p: { id: aktuell.id, descriptionHtml: p.beschreibung.nachher } }), `${p.handle}: Beschreibung`, 'productUpdate');
    log('   Beschreibung: Block «Materialien im Vergleich» gesetzt');
  }
  // 6. frisch zurücklesen und vergleichen
  const nach = await leseFrisch(gql, p.handle);
  const abw = vergleiche(p, nach);
  if (abw.length) throw new AbweichungFehler(`${p.handle}: Zustand nach dem Schreiben weicht vom Plan ab`, abw);
  return { varianten: nach.variants.length, neu: offen.length };
}

/** Die Eingabe von productSet für ein NEUES Produkt (Samsung-Hülle). Auch der Trockenlauf zeigt genau dieses Objekt (samsung_payload.json). Die Variantennummer des Editor-Bausteins folgt nach dem Anlegen. */
export function produktSetEingabe(p) {
  const np = p.neuesProdukt, namen = p.optionen.nachher.map((o) => o.name);
  return {
    title: np.titel, handle: np.handle, status: 'DRAFT', vendor: np.vendor, productType: np.produktart, tags: np.tags, category: np.category, seo: np.seo,
    descriptionHtml: p.beschreibung.nachher.split(PLATZHALTER_BILD).join(np.bilder[0].url),
    productOptions: p.optionen.nachher.map((o) => ({ name: o.name, position: o.position, values: o.werte.map((w) => ({ name: w })) })),
    variants: p.neu.map((v) => ({ optionValues: namen.map((n) => ({ optionName: n, name: v.optionen[n] })), price: v.preisChf.toFixed(2), sku: v.sku, inventoryPolicy: 'CONTINUE', inventoryItem: { tracked: false, requiresShipping: true } })),
    files: np.bilder.map((b) => ({ originalSource: b.url, contentType: 'IMAGE', alt: b.alt })),
  };
}

async function neuAnlegen(p, { gql, log, jetzt }) {
  const np = p.neuesProdukt;
  const schon = await leseFrisch(gql, p.handle);
  let id = schon?.id;
  if (!id) {
    const input = produktSetEingabe(p);
    const r = pruefeAntwort(await gql(M_SET, { input }), `${p.handle}: Produkt anlegen`, 'productSet');
    id = r.product.id; log(`   Produkt angelegt (DRAFT): ${id}`);
  } else log(`   Produkt gab es schon (${id}) – ergänze, was fehlt`);
  const mf = np.metafelder.map((m) => ({ ownerId: id, namespace: m.namespace, key: m.key, type: m.type, value: m.value }));
  for (let i = 0; i < mf.length; i += 25) pruefeAntwort(await gql(M_META, { mf: mf.slice(i, i + 25) }), `${p.handle}: Metafelder`, 'metafieldsSet');
  let ist = await leseFrisch(gql, p.handle);
  // Editor-Baustein: Platzhalter durch die erste Variante und das erste Bild ersetzen
  if (ist.descriptionHtml.includes(PLATZHALTER_VARIANTE) || ist.descriptionHtml.includes(PLATZHALTER_BILD)) {
    const ersteSku = p.neu[0].sku, v1 = ist.variants.find((v) => v.sku === ersteSku) || ist.variants[0];
    const html = ist.descriptionHtml.split(PLATZHALTER_VARIANTE).join(String(v1.id).split('/').pop()).split(PLATZHALTER_BILD).join(np.bilder[0].url);
    pruefeAntwort(await gql(M_UPDATE, { p: { id, descriptionHtml: html } }), `${p.handle}: Editor-Baustein`, 'productUpdate');
    log('   Editor-Baustein: erste Variante und erstes Bild eingetragen');
  }
  ist = await leseFrisch(gql, p.handle);
  const soll = { ...p, beschreibung: { ...p.beschreibung, nachher: p.beschreibung.nachher.split(PLATZHALTER_BILD).join(np.bilder[0].url).split(PLATZHALTER_VARIANTE).join(String(ist.variants.find((v) => v.sku === p.neu[0].sku)?.id || '').split('/').pop()) } };
  const abw = vergleiche(soll, ist);
  if (abw.length) throw new AbweichungFehler(`${p.handle}: Zustand nach dem Anlegen weicht vom Plan ab`, abw);
  return { varianten: ist.variants.length, neu: p.neu.length };
}

/**
 * Ganzer LIVE-Lauf. Gibt {ergebnisse, exit} zurück (Exit 0 = ok, 1 = Fehlerfolge, 3 = Abweichung, 4 = Tageslimit).
 * `plan` ist der geprüfte Plan (pod_auswahl_plan.planeAlles), `befundOk` = Handles, deren Blocker-Befund der Besitzer bestätigt hat.
 */
export async function lauf({ plan, gql, ledgerPfad, sicherungsDir, befundOk = [], log = console.log, jetzt = () => new Date().toISOString(), maxFehlerFolge = 3, nur = null }) {
  const ledger = ledgerLesen(ledgerPfad);
  const ergebnisse = [];
  let folge = 0;
  for (const p of plan.produkte) {
    if (nur && !nur.includes(p.handle)) continue;
    if (!p.neu.length && !p.schonDa.length && !p.beschreibung.block) { ergebnisse.push({ handle: p.handle, status: 'NICHTS_ZU_TUN' }); continue; }
    const blocker = p.befunde.filter((b) => b.schwere === 'blocker');
    if (blocker.length && !befundOk.includes(p.handle)) {
      log(`✗ ${p.handle}: GESPERRT durch Befund (${blocker.map((b) => b.code).join(', ')}) – mit BEFUND_OK=${p.handle} bestätigen, wenn der Besitzer entschieden hat`);
      ergebnisse.push({ handle: p.handle, status: 'GESPERRT', befunde: blocker.map((b) => b.code) });
      continue;
    }
    if (ledger.has(ledgerSchluessel(p))) { log(`= ${p.handle}: laut Ledger schon erledigt`); ergebnisse.push({ handle: p.handle, status: 'UEBERSPRUNGEN' }); continue; }
    log(`→ ${p.handle} (${p.art}): ${p.neu.length} neue Varianten`);
    try {
      const r = p.art === 'neu' ? await neuAnlegen(p, { gql, log, jetzt }) : await erweitern(p, { gql, log, sicherungsDir, jetzt });
      ledgerSchreiben(ledgerPfad, p, `OK ${r.varianten} Varianten (${r.neu} neu)`, jetzt);
      ergebnisse.push({ handle: p.handle, status: 'OK', ...r }); folge = 0;
      log(`✓ ${p.handle}: ${r.varianten} Varianten, Zustand frisch gelesen und gleich dem Plan`);
    } catch (e) {
      if (e instanceof TageslimitFehler) { log(`TAGESLIMIT: ${e.message}`); ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT' }); return { ergebnisse, exit: 4 }; }
      if (e instanceof AbweichungFehler) { log(`ABWEICHUNG: ${e.message}`); for (const x of e.liste.slice(0, 20)) log('   · ' + x); ergebnisse.push({ handle: p.handle, status: 'ABWEICHUNG', liste: e.liste }); return { ergebnisse, exit: 3 }; }
      folge++; log(`✗ ${p.handle}: ${e.message}`); ergebnisse.push({ handle: p.handle, status: 'FEHLER', fehler: e.message });
      if (folge >= maxFehlerFolge) { log(`ABBRUCH: ${folge} Fehler in Folge`); return { ergebnisse, exit: 1 }; }
    }
  }
  return { ergebnisse, exit: 0 };
}
