/**
 * SCHREIBWEG der «Selbst gestalten»-Auswahl. Wird NUR von automation/pod_auswahl.mjs mit LIVE=1 aufgerufen. Alle Netzzugriffe laufen über die
 * hineingereichte Funktion `gql(query, variables)` → Antwort-JSON; die Tests reichen eine Attrappe hinein (es wird nie ein echter Dienst berührt).
 *
 * Ablauf je Produkt (art «erweitern»):
 *   1. frisch lesen, mit dem Plan vergleichen (vorhandene Varianten UND Beschreibung ausserhalb des Blocks unverändert?) → sonst AbweichungFehler, ohne Schreibzugriff
 *   2. Sicherung des Ausgangszustands nach dropship/pod-sicherung/<handle>.json (nie überschreiben)
 *   3. productOptionsCreate: Option «Material» (nur mit dem vorhandenen Wert), variantStrategy LEAVE_AS_IS (vorhandene Varianten bekommen den Wert);
 *      danach Optionsreihenfolge HERSTELLEN (productOptionsReorder, falls «Material» nicht an Position 1 steht; auch bei Wiederaufnahme) und frisch prüfen
 *   4. je neues Material, in Planreihenfolge: ZUERST sein Optionswert (productOptionUpdate), DIREKT DANACH seine Varianten (productVariantsBulkCreate in Stücken zu 50;
 *      optionValues, price, inventoryPolicy CONTINUE, inventoryItem{sku, tracked:false, requiresShipping:true}). Es steht also höchstens EIN Wert ohne Variante im Shop,
 *      und zwar nur während dieses einen Aufrufs. Scheitert er (Tageslimit!), wird der Wert wieder entfernt, sofern er keine Variante trägt: kein ausgegrauter Wert bleibt sichtbar.
 *   5. Beschreibung: nur der Block zwischen den Kommentarmarken; vorher FRISCH gelesen: hat ein anderer Prozess den Text ausserhalb des Blocks geändert → AbweichungFehler, nichts überschrieben
 *   6. FRISCH zurücklesen und mit dem Plan vergleichen → Abweichung = AbweichungFehler (Exit 3)
 * WIEDERAUFNAHME nach Exit 4 (Tageslimit): denselben Befehl später wiederholen. Jeder Schritt legt nur an, was fehlt; der Plan-Hash bleibt gleich (neu und schon angelegt zählen zusammen),
 * der geprüfte Plan gilt weiter. Das Produkt bleibt ACTIVE (es wird nie auf DRAFT gesetzt: das nähme ein verkaufendes Produkt aus dem Shop).
 * art «neu» (Samsung-Hülle, DRAFT): productSet (synchron) → Metafelder → Editor-Baustein füllen → zurücklesen und vergleichen.
 *
 * Fehlerregeln: VARIANT_THROTTLE_EXCEEDED / «Daily variant creation limit» → TageslimitFehler (Exit 4, sauber beenden, nicht wiederholen);
 * drei Fehler in Folge → Abbruch; Abweichung nach dem Schreiben → sofort Abbruch (Exit 3). Ledger: nur Erfolge werden übersprungen.
 *
 * EXIT-CODES (ein Wrapper oder eine Action darf «Exit 0» nur sehen, wenn WIRKLICH alles Geplante ausgeführt ist):
 *   0 alles ausgeführt (oder laut Ledger schon erledigt)      1 mindestens ein Produkt mit FEHLER, oder drei Fehler in Folge
 *   3 Abweichung: Zustand ≠ Plan                               4 Tageslimit für neue Varianten erreicht (nicht wiederholen)
 *   5 mindestens ein Produkt im Lauf ist GESPERRT (Blocker-Befund nicht bestätigt) – mit ONLY=… ausserhalb der gesperrten Produkte wird daraus 0
 * Vorrang: 4 und 3 beenden den Lauf sofort; sonst gewinnt 1 vor 5 vor 0.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { hashVon, pfIdAusSku, PLATZHALTER_BILD, PLATZHALTER_VARIANTE } from './pod_auswahl_plan.mjs';
import { MARKE_AUF, MARKE_ZU } from './pod_auswahl_spec.mjs';

export class AbweichungFehler extends Error { constructor(m, liste = []) { super(m); this.name = 'AbweichungFehler'; this.liste = liste; } }
export class TageslimitFehler extends Error { constructor(m, zustand = null) { super(m); this.name = 'TageslimitFehler'; this.zustand = zustand; } }
export const CHUNK = 50;
const DROSSEL = /VARIANT_THROTTLE|Daily variant creation limit/i;

// ───────────────────────────────────────────────────────── GraphQL-Texte
export const Q_PRODUKT = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status productType vendor tags descriptionHtml seo{ title description } category{ id }
  options{ id name position values optionValues{ id name } }
  variants(first:250){ edges{ node{ id sku price compareAtPrice inventoryPolicy taxable selectedOptions{ name value } inventoryItem{ tracked requiresShipping } } } }
  media(first:50){ edges{ node{ ... on MediaImage{ id alt image{ url } } } } }
  metafields(first:100){ edges{ node{ namespace key type value } } } } }`;
export const M_OPTION = `mutation($pid:ID!,$opts:[OptionCreateInput!]!){ productOptionsCreate(productId:$pid, options:$opts, variantStrategy:LEAVE_AS_IS){ product{ id options{ name position values } } userErrors{ field message code } } }`;
export const M_OPTION_WERTE = `mutation($pid:ID!,$opt:OptionUpdateInput!,$add:[OptionValueCreateInput!]){ productOptionUpdate(productId:$pid, option:$opt, optionValuesToAdd:$add){ product{ id options{ name position values } } userErrors{ field message code } } }`;
/** Optionswerte ENTFERNEN (nur Werte ohne Variante, die dieser Lauf selbst angelegt hat: Aufräumen nach einem abgebrochenen Aufruf). */
export const M_OPTION_WERTE_LOESCHEN = `mutation($pid:ID!,$opt:OptionUpdateInput!,$del:[ID!]){ productOptionUpdate(productId:$pid, option:$opt, optionValuesToDelete:$del){ product{ id options{ name position values } } userErrors{ field message code } } }`;
/** Optionsreihenfolge herstellen: alle Optionen in der gewollten Reihenfolge (Namen); die Positionen müssen lückenlos sein. */
export const M_REORDER = `mutation($pid:ID!,$opts:[OptionReorderInput!]!){ productOptionsReorder(productId:$pid, options:$opts){ product{ id options{ name position values } } userErrors{ field message code } } }`;
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
  return j.data?.productByIdentifier ? knoten(j.data.productByIdentifier) : null;
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

/** Bestätigung eines Blocker-Befunds: nur ausdrücklich je Befund («<handle>:<code>»), nie pauschal für ein ganzes Produkt (sonst deckt eine alte Bestätigung neue Befunde zu). */
export const bestaetigt = (befundOk, handle, code) => (befundOk || []).includes(`${handle}:${code}`);

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

// ───────────────────────────────────────────────────────── Zustand prüfen und herstellen
/** Hat jemand anderes die Beschreibung ausserhalb unseres Blocks geändert, seit der Plan sie gelesen hat? (Text verglichen, Markup egal.) */
export function beschreibungSeitPlanVeraendert(p, html) {
  if (p.beschreibung?.vorher == null) return false;
  return nurText(ohneBlock(String(html ?? ''))) !== nurText(ohneBlock(String(p.beschreibung.vorher)));
}

/** Namen der Optionen in der Reihenfolge ihrer Position. */
const optionsReihe = (ist) => [...ist.options].sort((a, b) => a.position - b.position).map((o) => o.name);

/**
 * Optionsreihenfolge HERSTELLEN (nicht nur prüfen): Steht «Material» nach productOptionsCreate nicht an Position 1 (die Doku verspricht für
 * `OptionCreateInput.position` nur «Position of the option»), sortiert productOptionsReorder alle Optionen in Planreihenfolge. Läuft bei jeder Ausführung,
 * also auch bei der Wiederaufnahme nach einem Abbruch. Danach frisch lesen: stimmt es immer noch nicht → AbweichungFehler (Exit 3), nichts weiter geschrieben.
 */
export async function stelleReihenfolgeHer({ gql, log, p, ist }) {
  const soll = p.optionen.nachher.map((o) => o.name);
  const ok = (x) => JSON.stringify(optionsReihe(x)) === JSON.stringify(soll) && x.options.every((o) => o.position === soll.indexOf(o.name) + 1);
  if (ok(ist)) return ist;
  if ([...optionsReihe(ist)].sort().join('|') !== [...soll].sort().join('|')) throw new AbweichungFehler(`${p.handle}: Optionen im Shop (${optionsReihe(ist).join(', ')}) ≠ Plan (${soll.join(', ')})`, [`Optionen: ${optionsReihe(ist).join(', ')} ≠ ${soll.join(', ')}`]);
  pruefeAntwort(await gql(M_REORDER, { pid: ist.id, opts: soll.map((name) => ({ name })) }), `${p.handle}: Optionsreihenfolge`, 'productOptionsReorder');
  const neu = await leseFrisch(gql, p.handle);
  if (!ok(neu)) throw new AbweichungFehler(`${p.handle}: Optionsreihenfolge nach productOptionsReorder nicht wie geplant`, [`Optionen: ${optionsReihe(neu).join(', ')} (Positionen ${neu.options.map((o) => o.position).join(',')}) ≠ ${soll.join(', ')}`]);
  log(`   Optionsreihenfolge hergestellt: ${soll.join(' → ')}`);
  return neu;
}

/**
 * Entfernt die Optionswerte, die dieser Lauf angelegt hat (`hinzu`: [{optionName, wert}]) und die KEINE Variante tragen. Liest vorher frisch: ein Wert mit Variante
 * bleibt, ein unbekannter Ausgang (Netzfehler nach dem Senden) kann so nichts Falsches löschen. Gibt die entfernten Werte zurück.
 */
export async function leereWerteEntfernen({ gql, log, handle, hinzu }) {
  const ist = await leseFrisch(gql, handle);
  if (!ist) return [];
  const weg = new Map();   // optionId → { option, ids:[], namen:[] }
  for (const h of hinzu) {
    const o = ist.options.find((x) => x.name === h.optionName), ov = o?.optionValues?.find((x) => x.name === h.wert);
    if (!ov || ist.variants.some((v) => v.optionen[h.optionName] === h.wert)) continue;
    const e = weg.get(o.id) || weg.set(o.id, { option: o, ids: [], namen: [] }).get(o.id);
    e.ids.push(ov.id); e.namen.push(`${h.optionName}=${h.wert}`);
  }
  const entfernt = [];
  for (const e of weg.values()) {
    pruefeAntwort(await gql(M_OPTION_WERTE_LOESCHEN, { pid: ist.id, opt: { id: e.option.id }, del: e.ids }), `${handle}: leere Optionswerte entfernen`, 'productOptionUpdate');
    entfernt.push(...e.namen);
  }
  if (entfernt.length) log(`   Aufgeräumt: Optionswert(e) ohne Variante wieder entfernt: ${entfernt.join(', ')}`);
  return entfernt;
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
  if (beschreibungSeitPlanVeraendert(p, ist.descriptionHtml)) vorab.push('Beschreibung ausserhalb des Blocks seit dem Plan verändert (anderer Prozess?)');
  if (vorab.length) throw new AbweichungFehler(`${p.handle}: seit dem Plan verändert`, vorab);
  // 2. Sicherung
  if (sichere({ dir: sicherungsDir, handle: p.handle, zustand: ist, jetzt })) log(`   Sicherung geschrieben: ${sicherungsDir}/${sicherungsName(p.handle)}`);
  // 3. Option «Material» (nur mit dem vorhandenen Wert; die neuen Werte kommen erst mit ihren Varianten)
  if (!ist.options.some((o) => o.name === matName)) {
    const j = await gql(M_OPTION, { pid: ist.id, opts: [{ name: matName, position: 1, values: [{ name: p.optionen.bestandsWert }] }] });
    pruefeAntwort(j, `${p.handle}: Option anlegen`, 'productOptionsCreate');
    ist = await leseFrisch(gql, p.handle);
    const fehl = [];
    if (!ist.options.some((o) => o.name === matName)) fehl.push(`Option «${matName}» fehlt nach dem Anlegen`);
    for (const b of p.bestehende) { const v = ist.variants.find((x) => x.sku === b.sku); if (!v || v.optionen[matName] !== p.optionen.bestandsWert) fehl.push(`${b.sku}: Material «${v?.optionen?.[matName]}» ≠ «${p.optionen.bestandsWert}»`); }
    if (fehl.length) throw new AbweichungFehler(`${p.handle}: nach dem Anlegen der Option nicht wie geplant`, fehl);
    log(`   Option «${matName}» angelegt, vorhandene Varianten = «${p.optionen.bestandsWert}»`);
  }
  // 3b. Optionsreihenfolge herstellen (auch bei Wiederaufnahme: eine halbe Vorrunde kann «Material» an falscher Stelle zurückgelassen haben)
  ist = await stelleReihenfolgeHer({ gql, log, p, ist });
  // 4. je Material: Optionswert, DIREKT DANACH seine Varianten (höchstens ein Wert ohne Variante, und nur während dieses Aufrufs)
  const namen = p.optionen.nachher.map((o) => o.name);
  const offen = p.neu.filter((n) => !ist.variants.some((v) => v.sku === n.sku));
  const reihe = p.optionen.nachher[0].werte;
  const unbekannt = offen.filter((n) => !reihe.includes(n.optionen[matName]));
  if (unbekannt.length) throw new AbweichungFehler(`${p.handle}: neue Variante mit Material ausserhalb des Plans`, unbekannt.map((n) => `${n.sku}: «${n.optionen[matName]}»`));
  const gruppen = reihe.map((w) => ({ wert: w, varianten: offen.filter((n) => n.optionen[matName] === w) })).filter((g) => g.varianten.length);
  let angelegt = 0;
  for (const g of gruppen) {
    const hinzu = [];
    for (const o of p.optionen.nachher) {
      const io = ist.options.find((x) => x.name === o.name);
      const fehlt = [...new Set(g.varianten.map((v) => v.optionen[o.name]))].filter((w) => !io.values.includes(w));
      if (!fehlt.length) continue;
      pruefeAntwort(await gql(M_OPTION_WERTE, { pid: ist.id, opt: { id: io.id }, add: fehlt.map((w) => ({ name: w })) }), `${p.handle}: Optionswerte «${o.name}»`, 'productOptionUpdate');
      for (const w of fehlt) hinzu.push({ optionName: o.name, wert: w });
      log(`   Optionswerte «${o.name}» ergänzt: ${fehlt.join(', ')}`);
    }
    if (hinzu.length) ist = await leseFrisch(gql, p.handle);
    try {
      for (let i = 0; i < g.varianten.length; i += CHUNK) {
        const stueck = g.varianten.slice(i, i + CHUNK);
        const j = await gql(M_VARIANTEN, { pid: ist.id, vs: variantenEingabe(stueck, namen) });
        const r = pruefeAntwort(j, `${p.handle}: Varianten anlegen (${g.wert})`, 'productVariantsBulkCreate');
        angelegt += stueck.length;
        log(`   ${r.productVariants?.length ?? stueck.length} Varianten angelegt: ${g.wert} (${i + stueck.length}/${g.varianten.length}), insgesamt ${angelegt}/${offen.length}`);
      }
    } catch (e) {
      // Der Aufruf ist gescheitert (Tageslimit!): einen Wert ohne Variante nicht im Shop stehen lassen.
      let entfernt = [], aufraeumFehler = null;
      try { entfernt = await leereWerteEntfernen({ gql, log, handle: p.handle, hinzu }); } catch (e2) { aufraeumFehler = e2; log(`   ⚠️ Aufräumen nicht möglich: ${e2.message}`); }
      if (e instanceof TageslimitFehler) {
        const rest = offen.length - angelegt;
        e.zustand = `Zustand ${p.handle}: Option «${matName}» mit allen fertigen Materialien; ${angelegt} von ${offen.length} neuen Varianten angelegt, ${rest} fehlen noch${entfernt.length ? '; leerer Wert wieder entfernt (' + entfernt.join(', ') + ')' : ''}${aufraeumFehler ? '; ACHTUNG: leerer Wert «' + g.wert + '» konnte nicht entfernt werden (der nächste Lauf legt seine Varianten an)' : ''}. Wiederaufnahme: denselben Befehl später wiederholen (der geprüfte Plan bleibt gültig, der Hash ändert sich nicht).`;
      }
      throw e;
    }
  }
  // 5. Beschreibung (nur wenn nötig; vorher frisch gelesen, fremde Änderungen werden nie überschrieben)
  const aktuell = await leseFrisch(gql, p.handle);
  if (beschreibungSeitPlanVeraendert(p, aktuell.descriptionHtml)) throw new AbweichungFehler(`${p.handle}: Beschreibung ausserhalb des Blocks hat sich während des Laufs geändert (anderer Prozess?) – nicht überschrieben`, ['Beschreibung ausserhalb des Blocks weicht vom Plan ab']);
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

/**
 * Gibt es den Handle schon, darf das Werkzeug ihn nur übernehmen, wenn es das EIGENE halb fertige Produkt ist: DRAFT, Titel, Verkäufer, Produktart, Tags und
 * Optionsnamen wie im Plan, und jede vorhandene SKU gehört zum Plan. Sonst Abweichung OHNE Schreibzugriff (sonst wären die Metafelder eines fremden Produkts schon überschrieben).
 */
export function pruefeVorhandenesProdukt(p, schon) {
  const np = p.neuesProdukt, a = [];
  if (schon.status !== 'DRAFT') a.push(`Status ${schon.status} ≠ DRAFT`);
  if (schon.title !== np.titel) a.push(`Titel «${schon.title}» ≠ «${np.titel}»`);
  if (schon.vendor !== np.vendor) a.push(`Verkäufer «${schon.vendor}» ≠ «${np.vendor}»`);
  if (schon.productType !== np.produktart) a.push(`Produktart «${schon.productType}» ≠ «${np.produktart}»`);
  const tags = [...(schon.tags || [])].sort().join(','), soll = [...np.tags].sort().join(',');
  if (tags !== soll) a.push(`Tags «${tags}» ≠ «${soll}»`);
  const namen = optionsReihe(schon).join(', '), sollNamen = p.optionen.nachher.map((o) => o.name).join(', ');
  if (namen !== sollNamen) a.push(`Optionen «${namen}» ≠ «${sollNamen}»`);
  const erlaubt = new Set(p.neu.map((v) => v.sku));
  for (const v of schon.variants) if (!erlaubt.has(v.sku)) a.push(`SKU ${v.sku} gehört nicht zum Plan`);
  return a;
}

async function neuAnlegen(p, { gql, log, jetzt }) {
  const np = p.neuesProdukt;
  const schon = await leseFrisch(gql, p.handle);
  if (schon) {
    const fremd = pruefeVorhandenesProdukt(p, schon);
    if (fremd.length) throw new AbweichungFehler(`${p.handle}: Handle gibt es schon, aber nicht als das erwartete eigene DRAFT-Produkt – nichts geschrieben`, fremd);
  }
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
 * Ganzer LIVE-Lauf. Gibt {ergebnisse, exit} zurück (Exit-Codes: siehe Kopf der Datei).
 * `plan` ist der geprüfte Plan (pod_auswahl_plan.planeAlles), `befundOk` = Liste «<handle>:<code>» der Blocker-Befunde, die der Besitzer bestätigt hat.
 */
export async function lauf({ plan, gql, ledgerPfad, sicherungsDir, befundOk = [], log = console.log, jetzt = () => new Date().toISOString(), maxFehlerFolge = 3, nur = null, variantenBudget = null }) {
  const ledger = ledgerLesen(ledgerPfad);
  const ergebnisse = [];
  let folge = 0, budget = variantenBudget;   // Vorprüfung: Shopify nennt den Rest des Tageslimits nicht; der Besitzer kann ihn vorgeben (VARIANT_BUDGET), dann wird ein Produkt gar nicht erst begonnen, das nicht mehr hineinpasst
  for (const p of plan.produkte) {
    if (nur && !nur.includes(p.handle)) continue;
    if (!p.neu.length && !p.schonDa.length && !p.beschreibung.block) { ergebnisse.push({ handle: p.handle, status: 'NICHTS_ZU_TUN' }); continue; }
    const offen = p.befunde.filter((b) => b.schwere === 'blocker' && !bestaetigt(befundOk, p.handle, b.code));
    if (offen.length) {
      const codes = [...new Set(offen.map((b) => b.code))];
      log(`✗ ${p.handle}: GESPERRT durch Befund (${codes.join(', ')}) – erst nach dem Entscheid des Besitzers mit BEFUND_OK=${codes.map((c) => p.handle + ':' + c).join(',')} bestätigen`);
      ergebnisse.push({ handle: p.handle, status: 'GESPERRT', befunde: codes });
      continue;
    }
    if (ledger.has(ledgerSchluessel(p))) { log(`= ${p.handle}: laut Ledger schon erledigt`); ergebnisse.push({ handle: p.handle, status: 'UEBERSPRUNGEN' }); continue; }
    if (budget !== null && p.neu.length > budget) {
      log(`TAGESLIMIT (Vorprüfung): ${p.handle} braucht ${p.neu.length} neue Varianten, vorgegebenes Budget ${budget}. Nichts begonnen, nichts Halbes im Shop. Später wiederholen.`);
      ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT', vorab: true, geplant: p.neu.length, budget });
      return { ergebnisse, exit: 4 };
    }
    log(`→ ${p.handle} (${p.art}): ${p.neu.length} neue Varianten`);
    try {
      const r = p.art === 'neu' ? await neuAnlegen(p, { gql, log, jetzt }) : await erweitern(p, { gql, log, sicherungsDir, jetzt });
      ledgerSchreiben(ledgerPfad, p, `OK ${r.varianten} Varianten (${r.neu} neu)`, jetzt);
      if (budget !== null) budget -= r.neu;
      ergebnisse.push({ handle: p.handle, status: 'OK', ...r }); folge = 0;
      log(`✓ ${p.handle}: ${r.varianten} Varianten, Zustand frisch gelesen und gleich dem Plan`);
    } catch (e) {
      if (e instanceof TageslimitFehler) { log(`TAGESLIMIT: ${e.message}`); if (e.zustand) log(`   ${e.zustand}`); ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT', ...(e.zustand ? { zustand: e.zustand } : {}) }); return { ergebnisse, exit: 4 }; }
      if (e instanceof AbweichungFehler) { log(`ABWEICHUNG: ${e.message}`); for (const x of e.liste.slice(0, 20)) log('   · ' + x); ergebnisse.push({ handle: p.handle, status: 'ABWEICHUNG', liste: e.liste }); return { ergebnisse, exit: 3 }; }
      folge++; log(`✗ ${p.handle}: ${e.message}`); ergebnisse.push({ handle: p.handle, status: 'FEHLER', fehler: e.message });
      if (folge >= maxFehlerFolge) { log(`ABBRUCH: ${folge} Fehler in Folge`); return { ergebnisse, exit: 1 }; }
    }
  }
  return { ergebnisse, exit: endeCode(ergebnisse) };
}

/** Exit-Code nach einem Lauf, der nicht vorzeitig (Tageslimit, Abweichung, drei Fehler in Folge) beendet wurde: FEHLER → 1, GESPERRT → 5, sonst 0. */
export function endeCode(ergebnisse) {
  if (ergebnisse.some((r) => r.status === 'FEHLER')) return 1;
  if (ergebnisse.some((r) => r.status === 'GESPERRT')) return 5;
  return 0;
}

export const EXIT_TEXT = Object.freeze({
  0: 'alles Geplante ausgeführt (oder laut Ledger schon erledigt)',
  1: 'mindestens ein Produkt mit FEHLER (oder drei Fehler in Folge): nicht alles ist ausgeführt',
  3: 'ABWEICHUNG: der Zustand im Shop weicht vom Plan ab (Lauf sofort beendet)',
  4: 'TAGESLIMIT für neue Varianten erreicht (nicht wiederholen, morgen neu planen)',
  5: 'mindestens ein Produkt GESPERRT: Blocker-Befund nicht bestätigt, dieses Produkt wurde nicht angefasst',
});

/** Letzte Zeilen der Ausgabe: Ergebnis je Produkt, Zähler und der Grund des Endes (damit «Exit 0» nie etwas verdeckt). */
export function zusammenfassung(res) {
  const z = {}; for (const r of res.ergebnisse) z[r.status] = (z[r.status] || 0) + 1;
  return [
    `Ergebnis: ${JSON.stringify(res.ergebnisse.map((r) => `${r.handle}: ${r.status}`))}`,
    `Zähler: ${Object.entries(z).map(([k, v]) => `${k} ${v}`).join(' · ') || 'keine Produkte'}`,
    `ENDE: Exit ${res.exit} – ${EXIT_TEXT[res.exit] ?? 'unbekannt'}`,
  ].join('\n');
}
