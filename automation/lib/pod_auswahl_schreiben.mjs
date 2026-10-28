/**
 * SCHREIBWEG der «Selbst gestalten»-Auswahl. Wird NUR von automation/pod_auswahl.mjs mit LIVE=1 aufgerufen. Alle Netzzugriffe laufen über die
 * hineingereichte Funktion `gql(query, variables)` → Antwort-JSON; die Tests reichen eine Attrappe hinein (es wird nie ein echter Dienst berührt).
 *
 * Ablauf je Produkt (art «erweitern»):
 *   1. frisch lesen, mit dem Plan vergleichen (vorhandene Varianten, Beschreibung ausserhalb des Blocks, eine schon vorhandene Option «Material»: Werte, Material der Varianten, UND die Werte
 *      ALLER Optionen: ein Wert im Shop, den der Plan für diese Option nicht kennt, wird vor dem ersten Schreibaufruf gemeldet, siehe fremdeOptionswerte)
 *      → sonst AbweichungFehler (Exit 3, 0 Schreibaufrufe, Hinweis auf DATEN=holen und einen neuen Trockenlauf). Liest die Abfrage 250 Varianten oder gibt es eine weitere Seite: kontrollierter Abbruch (Exit 3), nichts wird geraten
 *   2. Sicherung des Ausgangszustands nach dropship/pod-sicherung/<handle>.json (nie überschreiben)
 *   3. productOptionsCreate: Option «Material» (nur mit dem vorhandenen Wert), variantStrategy LEAVE_AS_IS (vorhandene Varianten bekommen den Wert);
 *      danach Optionsreihenfolge HERSTELLEN (productOptionsReorder, falls «Material» nicht an Position 1 steht; auch bei Wiederaufnahme) und frisch prüfen
 *   4. je neues Material, in Planreihenfolge: ZUERST sein Optionswert (productOptionUpdate), DIREKT DANACH seine Varianten (productVariantsBulkCreate in Stücken zu 50;
 *      optionValues, price, inventoryPolicy CONTINUE, inventoryItem{sku, tracked:false, requiresShipping:true}). Anlegen des Wertes, Zurücklesen und Variantenanlage stehen in
 *      EINER Fehlerbehandlung: jeder Abbruch dort (Tageslimit, anderer Fehler, auch ein Netzfehler NACH dem Anlegen mit verlorener Antwort) löst das AUFRÄUMEN aus.
 *      Das Aufräumen ist ZUSTANDSBASIERT: nach frischem Lesen werden alle Werte der Option «Material» ohne jede Variante entfernt (nach der Vorab-Prüfung ist die Option die eigene;
 *      nur Werte des Plans), Werte anderer Optionen (Grösse, Modell) nur, wenn dieser Aufruf sie ergänzt hat. Nie ein Wert mit mindestens einer Variante, nie ein fremder Wert.
 *      Darum repariert auch eine Wiederaufnahme, die sofort wieder am Tageslimit scheitert, einen liegengebliebenen leeren Wert.
 *      Ein Material mit nur TEIL seiner Varianten (Abbruch zwischen zwei Stücken zu 50) BLEIBT bestehen (Varianten werden nie gelöscht) und wird als «teilweise» (n von m) genannt;
 *      nur ein Prozessabsturz mitten im Aufruf kann einen leeren Wert zurücklassen, den die Wiederaufnahme dann entfernt oder füllt.
 *   5. Beschreibung: nur der Block zwischen den Kommentarmarken; vorher FRISCH gelesen: hat ein anderer Prozess den Text ausserhalb des Blocks geändert → AbweichungFehler, nichts überschrieben
 *   6. FRISCH zurücklesen und mit dem Plan vergleichen → Abweichung = AbweichungFehler (Exit 3)
 * LESEN (Korrekturrunde 4): Optionen immer über `optionValues { id name hasVariants }` (OPTIONEN_FELDER in pod_auswahl_daten.mjs), NIE über `ProductOption.values`: dort fehlen Werte OHNE Variante
 * (Schema: «including values not assigned to any variants» steht nur bei optionValues). Existenz eines Werts = in optionValues; «leer» = hasVariants false (und keine gelesene Variante trägt ihn);
 * Löschen über die Wert-ID aus optionValues. Sonst wäre ein liegengebliebener leerer Wert für die Wiederaufnahme unsichtbar: sie legte ihn neu an und bekäme für den schon vorhandenen Namen einen userError (Exit 1).
 * NICHT GEMESSEN: welchen Code Shopify dafür nennt, steht im Schema nicht (ProductOptionUpdateUserErrorCode kennt OPTION_VALUE_ALREADY_EXISTS, DUPLICATED_OPTION_VALUE und OPTION_VALUE_HAS_VARIANTS);
 * OPTION_VALUE_ALREADY_EXISTS ist die Antwort der Test-Attrappe nach Schema, nicht eine Messung. Der Code verlässt sich auf keinen dieser Codes: pruefeAntwort behandelt JEDEN userError als Fehler.
 * Ob hasVariants false, das Löschen über optionValuesToDelete und das Anlegen fehlender Werte durch productVariantsBulkCreate sich so verhalten, belegen bisher nur Schema und Doku:
 * die Wegwerf-Probe dafür steht in dropship/pod-auswahl/README.md («Vor dem ersten LIVE-Lauf: Wegwerf-Probe»).
 * WIEDERAUFNAHME nach Exit 4 (Tageslimit) oder einem anderen Abbruch: denselben Befehl SPÄTER wiederholen. Jeder Schritt legt nur an, was fehlt; der Plan-Hash bleibt gleich (neu und schon angelegt zählen zusammen),
 * der geprüfte Plan gilt weiter, solange die Daten höchstens DATEN_MAX_ALTER_H Stunden alt sind (sonst verweigert LIVE: zuerst DATEN=holen). Das Produkt bleibt ACTIVE (es wird nie auf DRAFT gesetzt: das nähme ein verkaufendes Produkt aus dem Shop).
 * art «neu» (Samsung-Hülle, DRAFT): productSet (synchron) → Metafelder → Editor-Baustein füllen → zurücklesen und vergleichen. KEINE Wiederaufnahme für fehlende Varianten (siehe README «Offen»).
 *
 * Fehlerregeln: VARIANT_THROTTLE_EXCEEDED / «Daily variant creation limit» → TageslimitFehler (Exit 4, sauber beenden; später denselben Befehl wiederholen, nicht sofort);
 * drei Fehler in Folge → Abbruch; Abweichung nach dem Schreiben → sofort Abbruch (Exit 3). Ledger: nur Erfolge werden übersprungen.
 * Variantenbudget (VARIANT_BUDGET): jedes Produkt zieht ab, was es angelegt hat, auch wenn es mit einem gewöhnlichen Fehler endet (frisch gelesen gezählt, nicht nur die bestätigten Antworten).
 *
 * EXIT-CODES (ein Wrapper oder eine Action darf «Exit 0» nur sehen, wenn WIRKLICH alles Geplante ausgeführt ist):
 *   0 alles ausgeführt (oder laut Ledger schon erledigt)      1 mindestens ein Produkt mit FEHLER, oder drei Fehler in Folge
 *   3 Abweichung: Zustand ≠ Plan                               4 Tageslimit für neue Varianten erreicht (später denselben Befehl wiederholen)
 *   5 mindestens ein Produkt im Lauf ist GESPERRT (Blocker-Befund nicht bestätigt) – mit ONLY=… ausserhalb der gesperrten Produkte wird daraus 0
 * Vorrang: 4 und 3 beenden den Lauf sofort; sonst gewinnt 1 vor 5 vor 0.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { hashVon, pfIdAusSku, PLATZHALTER_BILD, PLATZHALTER_VARIANTE, materialOptionAbweichungen } from './pod_auswahl_plan.mjs';
import { MARKE_AUF, MARKE_ZU } from './pod_auswahl_spec.mjs';
import { DATEN_MAX_ALTER_H, OPTIONEN_FELDER, optionenAusAntwort } from './pod_auswahl_daten.mjs';

export class AbweichungFehler extends Error { constructor(m, liste = []) { super(m); this.name = 'AbweichungFehler'; this.liste = liste; } }
export class TageslimitFehler extends Error { constructor(m, zustand = null) { super(m); this.name = 'TageslimitFehler'; this.zustand = zustand; } }
export const CHUNK = 50;
const DROSSEL = /VARIANT_THROTTLE|Daily variant creation limit/i;

// ───────────────────────────────────────────────────────── GraphQL-Texte
export const Q_PRODUKT = `query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status productType vendor tags descriptionHtml seo{ title description } category{ id }
  ${OPTIONEN_FELDER}
  variants(first:250){ edges{ node{ id sku price compareAtPrice inventoryPolicy taxable selectedOptions{ name value } inventoryItem{ tracked requiresShipping } } } pageInfo{ hasNextPage } }
  media(first:50){ edges{ node{ ... on MediaImage{ id alt image{ url } } } } }
  metafields(first:100){ edges{ node{ namespace key type value } } } } }`;
export const M_OPTION = `mutation($pid:ID!,$opts:[OptionCreateInput!]!){ productOptionsCreate(productId:$pid, options:$opts, variantStrategy:LEAVE_AS_IS){ product{ id ${OPTIONEN_FELDER} } userErrors{ field message code } } }`;
export const M_OPTION_WERTE = `mutation($pid:ID!,$opt:OptionUpdateInput!,$add:[OptionValueCreateInput!]){ productOptionUpdate(productId:$pid, option:$opt, optionValuesToAdd:$add){ product{ id ${OPTIONEN_FELDER} } userErrors{ field message code } } }`;
/** Optionswerte ENTFERNEN (nur Werte ohne Variante: Aufräumen nach einem abgebrochenen Aufruf, siehe leereWerteEntfernen). */
export const M_OPTION_WERTE_LOESCHEN = `mutation($pid:ID!,$opt:OptionUpdateInput!,$del:[ID!]){ productOptionUpdate(productId:$pid, option:$opt, optionValuesToDelete:$del){ product{ id ${OPTIONEN_FELDER} } userErrors{ field message code } } }`;
/** Optionsreihenfolge herstellen: alle Optionen in der gewollten Reihenfolge (Namen); die Positionen müssen lückenlos sein. */
export const M_REORDER = `mutation($pid:ID!,$opts:[OptionReorderInput!]!){ productOptionsReorder(productId:$pid, options:$opts){ product{ id ${OPTIONEN_FELDER} } userErrors{ field message code } } }`;
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

export const knoten = (p) => ({ ...p, options: optionenAusAntwort(p.options, `Abfrage ${p.handle}`), variants: p.variants.edges.map((e) => ({ ...e.node, optionen: Object.fromEntries(e.node.selectedOptions.map((o) => [o.name, o.value])) })),
  media: (p.media?.edges || []).map((e) => e.node).filter(Boolean), metafields: (p.metafields?.edges || []).map((e) => e.node) });

/** Die Abfrage liest höchstens so viele Varianten, ohne Seitenblätterung (alle Produkte des Plans haben höchstens 100). Bei diesem Wert oder einer weiteren Seite wird NICHT weitergerechnet. */
export const LESEGRENZE_VARIANTEN = 250;

export async function leseFrisch(gql, handle) {
  const j = await gql(Q_PRODUKT, { h: handle });
  if (j.errors) throw new Error('Abfrage: ' + JSON.stringify(j.errors).slice(0, 300));
  const p = j.data?.productByIdentifier;
  if (!p) return null;
  // Unvollständig gelesen? Dann wären «vorhandene» Varianten ausserhalb der Seite scheinbar fehlend (falsche Wiederaufnahme-Rechnung, Konfliktfehler, nie bestätigbare Abschlussprüfung).
  const n = p.variants?.edges?.length ?? 0, weitere = p.variants?.pageInfo?.hasNextPage === true;
  if (n >= LESEGRENZE_VARIANTEN || weitere) throw new AbweichungFehler(`${handle}: ${n} Varianten gelesen, die Abfrage liest höchstens ${LESEGRENZE_VARIANTEN} ohne Seitenblätterung${weitere ? ' (weitere Seite vorhanden)' : ''} – der Zustand ist nicht vollständig lesbar, Lauf beendet statt falsch weiterzurechnen`, [`Varianten: ${n}${weitere ? ' + weitere Seite' : ''} ≥ Lesegrenze ${LESEGRENZE_VARIANTEN}`]);
  return knoten(p);
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

/** Hinweis am Ende der Meldung «seit dem Plan verändert»: der Shop ist nicht mehr der Shop des Plans, also Plan neu herstellen (nichts wird geraten oder repariert). */
export const NEUER_PLAN_HINWEIS = 'Nichts geschrieben. Zuerst DATEN=holen (Datenpaket auffrischen), dann einen neuen Trockenlauf machen und ansehen; LIVE erst mit dem neuen, geprüften Plan wiederholen.';

/**
 * Vorab-Prüfung der Optionswerte ALLER Optionen des Produkts (nicht nur «Material»): steht im Shop ein Wert, den der Plan für diese Option nicht kennt (leer oder mit Variante; ein Wert, der nach dem
 * Plan von Hand oder von einem anderen Prozess entstanden ist), wäre der Abschlussvergleich nach dem Schreiben rot («Optionswerte «…»», Exit 3) und das Ledger bekäme kein OK, obwohl schon alle Varianten
 * stehen. Darum Meldung VOR dem ersten Schreibaufruf. Geprüft wird nur «Shop ⊆ Plan»: Plan-Werte, die dem Shop noch fehlen, legt der Schreibweg selbst an (Schritt 4).
 *   • Die Option «Material» (`ausser`) prüft materialOptionAbweichungen (dieselbe Regel plus Material der Varianten): hier übersprungen, damit nichts doppelt gemeldet wird.
 *   • Eine Option, die der Plan nicht kennt, meldet stelleReihenfolgeHer; eine Option des Plans, die der Shop noch nicht hat («Material» vor dem Anlegen), gibt es hier nichts zu prüfen.
 *   • Das Aufräumen (leereWerte) fasst fremde Werte weiterhin NIE an: diese Prüfung verweigert nur den Start, sie löscht nichts.
 * REIN: gibt die Meldungen zurück (leer = in Ordnung).
 */
export function fremdeOptionswerte(p, ist, { ausser = p.optionen.materialOption } = {}) {
  const a = [];
  for (const o of p.optionen.nachher) {
    if (o.name === ausser) continue;
    const io = ist.options.find((x) => x.name === o.name);
    if (!io) continue;
    const fremd = io.values.filter((w) => !o.werte.includes(w));
    if (fremd.length) a.push(`Option «${o.name}» im Shop hat Werte, die der Plan nicht kennt: ${fremd.map((w) => `«${w}»`).join(', ')} (Plan: ${o.werte.join(', ')})`);
  }
  return a;
}

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
 * Optionswerte OHNE jede Variante im frisch gelesenen Zustand `ist`: Shopify meldet `hasVariants: false` UND keine der frisch gelesenen Varianten trägt den Wert (beides muss stimmen, sonst nie löschen).
 *   eigene: Werte der Option `materialOption`, die im Plan stehen (`planWerte`), plus Werte anderer Optionen, die dieser Aufruf ergänzt hat (`hinzu`: [{optionName, wert}], VOR dem Senden notiert,
 *           damit auch eine verlorene Antwort aufgeräumt wird). Nur diese darf das Werkzeug entfernen.
 *   fremde: Werte der Option `materialOption` ohne Variante, die der Plan nicht kennt: werden nie angefasst, nur genannt.
 * Werte anderer Optionen, die der Aufruf nicht ergänzt hat (zum Beispiel ein von Hand angelegter Grössenwert), kommen nirgends vor. REIN.
 */
export function leereWerte(ist, { materialOption, planWerte = [], hinzu = [] }) {
  const eigene = [], fremde = [];
  for (const o of ist.options) {
    for (const ov of o.optionValues || []) {
      if (ov.hasVariants !== false) continue;   // «leer» nennt Shopify selbst (optionValues.hasVariants = false); fehlt die Angabe (undefined), wird nichts angefasst
      if (ist.variants.some((v) => v.optionen[o.name] === ov.name)) continue;
      const e = { optionName: o.name, optionId: o.id, wert: ov.name, id: ov.id };
      if (o.name === materialOption) (planWerte.includes(ov.name) ? eigene : fremde).push(e);
      else if (hinzu.some((h) => h.optionName === o.name && h.wert === ov.name)) eigene.push(e);
    }
  }
  return { eigene, fremde };
}

/**
 * AUFRÄUMEN, ZUSTANDSBASIERT: liest frisch und entfernt die `eigene`n leeren Optionswerte (siehe leereWerte). Ein Wert mit mindestens einer Variante bleibt immer (die Prüfung gegen den frisch
 * gelesenen Zustand ersetzt jede Annahme über den Ausgang eines Aufrufs mit unbekanntem Ergebnis). Gibt die entfernten Werte («Option=Wert») zurück.
 */
export async function leereWerteEntfernen({ gql, log, handle, materialOption, planWerte = [], hinzu = [] }) {
  const ist = await leseFrisch(gql, handle);
  if (!ist) return [];
  const weg = new Map();   // optionId → { ids:[], namen:[] }
  for (const e of leereWerte(ist, { materialOption, planWerte, hinzu }).eigene) {
    const g = weg.get(e.optionId) || weg.set(e.optionId, { ids: [], namen: [] }).get(e.optionId);
    g.ids.push(e.id); g.namen.push(`${e.optionName}=${e.wert}`);
  }
  const entfernt = [];
  for (const [optionId, g] of weg) {
    pruefeAntwort(await gql(M_OPTION_WERTE_LOESCHEN, { pid: ist.id, opt: { id: optionId }, del: g.ids }), `${handle}: leere Optionswerte entfernen`, 'productOptionUpdate');
    entfernt.push(...g.namen);
  }
  if (entfernt.length) log(`   Aufgeräumt: Optionswert(e) ohne Variante wieder entfernt: ${entfernt.join(', ')}`);
  return entfernt;
}

/**
 * Was vom Plan ist im frisch gelesenen Zustand `ist` angekommen? `offenSkus`: die SKUs, die dieser Aufruf anlegen wollte (Plan-`neu`, die zu Beginn noch fehlten).
 * Je Material: Varianten im Shop (`da`) von den geplanten (`soll`, neue UND schon angelegte): fertig = alle, teilweise = einige, ohneVariante = keine. REIN.
 */
export function materialStand(p, ist, offenSkus = []) {
  const matName = p.optionen.materialOption, imShopSkus = new Set(ist.variants.map((v) => v.sku)), je = new Map();
  for (const s of [...(p.schonDa || []), ...p.neu]) {
    const w = s.optionen[matName], e = je.get(w) || je.set(w, { wert: w, da: 0, soll: 0 }).get(w);
    e.soll++; if (imShopSkus.has(s.sku)) e.da++;
  }
  const m = [...je.values()];
  return {
    geplant: m.reduce((a, x) => a + x.soll, 0), imShop: m.reduce((a, x) => a + x.da, 0), neuAngelegt: offenSkus.filter((k) => imShopSkus.has(k)).length,
    fertig: m.filter((x) => x.da === x.soll).map((x) => x.wert), teilweise: m.filter((x) => x.da > 0 && x.da < x.soll), ohneVariante: m.filter((x) => x.da === 0).map((x) => x.wert),
    werte: ist.options.find((o) => o.name === matName)?.values ?? [],
  };
}

const mehrzahl = (optionName) => ({ 'Grösse': 'Grössen', Handymodell: 'Handymodelle' }[optionName] ?? 'Varianten');

/**
 * Der Zustandstext nach einem Abbruch, aus dem frisch gelesenen BEFUND gebaut (nicht aus Annahmen): `stand` (materialStand) oder null, wenn das Lesen scheiterte;
 * `uebrig`/`fremde` (leereWerte nach dem Aufräumen), `entfernt` (was das Aufräumen entfernt hat), `aufraeumFehler`. REIN.
 */
export function zustandsText({ handle, matName, zweiteOption = null, stand, entfernt = [], uebrig = [], fremde = [], aufraeumFehler = null, tageslimit = false }) {
  const t = [];
  if (stand) {
    t.push(`Option «${matName}» mit den Werten ${stand.werte.join(', ')}; ${stand.imShop} von ${stand.geplant} geplanten neuen Varianten im Shop, ${stand.geplant - stand.imShop} fehlen noch`);
    if (stand.teilweise.length) t.push(`TEILWEISE angelegt: ${stand.teilweise.map((x) => `${x.wert} (${x.da} von ${x.soll} ${mehrzahl(zweiteOption)})`).join(', ')}; diese Materialien bleiben mit ihren vorhandenen Varianten im Shop stehen (es werden nie Varianten gelöscht), die Wiederaufnahme legt die übrigen an`);
  } else t.push('ACHTUNG: der Zustand nach dem Abbruch ist nicht lesbar, ob leere Optionswerte im Shop stehen, ist unbekannt (der nächste Lauf liest frisch und räumt auf)');
  if (entfernt.length) t.push(`leerer Wert wieder entfernt (${entfernt.join(', ')})`);
  for (const e of uebrig) t.push(`ACHTUNG: leerer Wert «${e.wert}»${e.optionName === matName ? '' : ` (${e.optionName})`} konnte nicht entfernt werden${aufraeumFehler ? ` (${String(aufraeumFehler.message).slice(0, 120)})` : ''} (der nächste Lauf legt seine Varianten an oder entfernt ihn)`);
  for (const e of fremde) t.push(`Hinweis: leerer Wert «${e.wert}» der Option «${matName}» steht nicht im Plan und wurde nicht angefasst`);
  const wieder = tageslimit
    ? `Wiederaufnahme: denselben Befehl später wiederholen (der geprüfte Plan bleibt gültig, der Hash ändert sich nicht; die Daten dürfen höchstens ${DATEN_MAX_ALTER_H} Stunden alt sein, sonst zuerst DATEN=holen)`
    : 'Wiederaufnahme: nach Behebung der Ursache denselben Befehl wiederholen (der Hash ändert sich nicht)';
  return `Zustand ${handle}: ${t.join('; ')}. ${wieder}.`;
}

/**
 * Nach einem Abbruch in Schritt 4: aufräumen (zustandsbasiert), frisch lesen, Zustandstext bauen. Wirft nie (jeder Fehler wird Teil des Textes).
 * Gibt {text, neuAngelegt} zurück; `neuAngelegt` = wie viele der `offen`en Varianten wirklich im Shop stehen (für das Variantenbudget; null = nicht lesbar).
 */
async function nachAbbruch({ gql, log, p, planWerte, hinzu, offen, tageslimit }) {
  const matName = p.optionen.materialOption;
  let entfernt = [], aufraeumFehler = null, ist = null;
  try { entfernt = await leereWerteEntfernen({ gql, log, handle: p.handle, materialOption: matName, planWerte, hinzu }); } catch (e2) { aufraeumFehler = e2; log(`   ⚠️ Aufräumen nicht möglich: ${e2.message}`); }
  try { ist = await leseFrisch(gql, p.handle); } catch (e3) { log(`   ⚠️ Zustand nach dem Abbruch nicht lesbar: ${e3.message}`); }
  const stand = ist ? materialStand(p, ist, offen.map((n) => n.sku)) : null, rest = ist ? leereWerte(ist, { materialOption: matName, planWerte, hinzu }) : { eigene: [], fremde: [] };
  return { neuAngelegt: stand ? stand.neuAngelegt : null,
    text: zustandsText({ handle: p.handle, matName, zweiteOption: p.optionen.nachher[1]?.name ?? null, stand, entfernt, uebrig: rest.eigene, fremde: rest.fremde, aufraeumFehler, tageslimit }) };
}

// ───────────────────────────────────────────────────────── ein Produkt schreiben
async function erweitern(p, { gql, log, sicherungsDir, jetzt, verbrauch = { varianten: 0 } }) {
  const matName = p.optionen.materialOption;
  let ist = await leseFrisch(gql, p.handle);
  if (!ist) throw new AbweichungFehler(`${p.handle}: Produkt nicht gefunden`);
  if (ist.id !== p.produktId) throw new AbweichungFehler(`${p.handle}: Produkt-ID ${ist.id} ≠ Plan ${p.produktId}`);
  // 1. Ausgangszustand = Plan? (vorhandene Varianten unverändert; eine vorhandene Option «Material» muss der erkennbare eigene Halbzustand sein)
  const vorab = [];
  for (const b of p.bestehende) {
    const v = ist.variants.find((x) => x.sku === b.sku);
    if (!v) vorab.push(`vorhandene Variante ${b.sku} fehlt`);
    else if (Math.abs(Number(v.price) - b.preisChf) > 0.001) vorab.push(`Preis ${b.sku}: ${v.price} ≠ Plan ${b.preisChf}`);
  }
  // optionWerte = Namen ALLER Optionswerte der Option «Material» (optionValues, auch ohne Variante): ein leerer Fremdwert («Holz») wird so vor dem ersten Schreibaufruf gemeldet
  vorab.push(...materialOptionAbweichungen({ matName, bestandsWert: p.optionen.bestandsWert, planWerte: p.optionen.nachher[0].werte, optionWerte: ist.options.find((o) => o.name === matName)?.values ?? null,
    bestehende: p.bestehende, schonDa: p.schonDa, materialVon: (sku) => { const v = ist.variants.find((x) => x.sku === sku); return v ? (v.optionen[matName] ?? null) : undefined; } }));
  // die Werte ALLER übrigen Optionen (Grösse, Handymodell …): ein Wert, den der Plan nicht kennt, würde erst der Abschlussvergleich nach dem Schreiben aller Varianten melden
  vorab.push(...fremdeOptionswerte(p, ist));
  if (beschreibungSeitPlanVeraendert(p, ist.descriptionHtml)) vorab.push('Beschreibung ausserhalb des Blocks seit dem Plan verändert (anderer Prozess?)');
  if (vorab.length) throw new AbweichungFehler(`${p.handle}: seit dem Plan verändert. ${NEUER_PLAN_HINWEIS}`, vorab);
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
  // 4. je Material: Optionswert, DIREKT DANACH seine Varianten. Alles in EINER Fehlerbehandlung: jeder Abbruch (auch ein Netzfehler nach dem Anlegen) räumt zustandsbasiert auf.
  const namen = p.optionen.nachher.map((o) => o.name);
  const offen = p.neu.filter((n) => !ist.variants.some((v) => v.sku === n.sku));
  const reihe = p.optionen.nachher[0].werte;
  const unbekannt = offen.filter((n) => !reihe.includes(n.optionen[matName]));
  if (unbekannt.length) throw new AbweichungFehler(`${p.handle}: neue Variante mit Material ausserhalb des Plans`, unbekannt.map((n) => `${n.sku}: «${n.optionen[matName]}»`));
  const gruppen = reihe.map((w) => ({ wert: w, varianten: offen.filter((n) => n.optionen[matName] === w) })).filter((g) => g.varianten.length);
  let angelegt = 0;
  const hinzu = [];   // Werte, die DIESER Aufruf ergänzt: VOR dem Senden notiert (eine verlorene Antwort darf sie nicht der Aufräumhilfe entziehen)
  try {
    for (const g of gruppen) {
      let ergaenzt = false;
      for (const o of p.optionen.nachher) {
        const io = ist.options.find((x) => x.name === o.name);
        const fehlt = [...new Set(g.varianten.map((v) => v.optionen[o.name]))].filter((w) => !io.optionValues.some((x) => x.name === w));   // EXISTENZ = in optionValues (auch ein Wert ohne Variante: er wird gefüllt, nicht neu angelegt)
        if (!fehlt.length) continue;
        for (const w of fehlt) hinzu.push({ optionName: o.name, wert: w });
        ergaenzt = true;
        pruefeAntwort(await gql(M_OPTION_WERTE, { pid: ist.id, opt: { id: io.id }, add: fehlt.map((w) => ({ name: w })) }), `${p.handle}: Optionswerte «${o.name}»`, 'productOptionUpdate');
        log(`   Optionswerte «${o.name}» ergänzt: ${fehlt.join(', ')}`);
      }
      if (ergaenzt) { ist = await leseFrisch(gql, p.handle); if (!ist) throw new Error(`${p.handle}: nach dem Ergänzen der Optionswerte nicht mehr lesbar`); }
      for (let i = 0; i < g.varianten.length; i += CHUNK) {
        const stueck = g.varianten.slice(i, i + CHUNK);
        const j = await gql(M_VARIANTEN, { pid: ist.id, vs: variantenEingabe(stueck, namen) });
        const r = pruefeAntwort(j, `${p.handle}: Varianten anlegen (${g.wert})`, 'productVariantsBulkCreate');
        angelegt += stueck.length; verbrauch.varianten = angelegt;
        log(`   ${r.productVariants?.length ?? stueck.length} Varianten angelegt: ${g.wert} (${i + stueck.length}/${g.varianten.length}), insgesamt ${angelegt}/${offen.length}`);
      }
    }
  } catch (e) {
    const nach = await nachAbbruch({ gql, log, p, planWerte: reihe, hinzu, offen, tageslimit: e instanceof TageslimitFehler });
    if (nach.neuAngelegt !== null) verbrauch.varianten = Math.max(verbrauch.varianten, nach.neuAngelegt);
    if (e && typeof e === 'object') e.zustand = nach.text;
    throw e;
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
    const verbrauch = { varianten: 0 };   // was dieses Produkt im Shop angelegt hat (auch bei einem Abbruch), für das Variantenbudget
    try {
      const r = p.art === 'neu' ? await neuAnlegen(p, { gql, log, jetzt }) : await erweitern(p, { gql, log, sicherungsDir, jetzt, verbrauch });
      ledgerSchreiben(ledgerPfad, p, `OK ${r.varianten} Varianten (${r.neu} neu)`, jetzt);
      if (budget !== null) budget -= r.neu;
      ergebnisse.push({ handle: p.handle, status: 'OK', ...r }); folge = 0;
      log(`✓ ${p.handle}: ${r.varianten} Varianten, Zustand frisch gelesen und gleich dem Plan`);
    } catch (e) {
      if (budget !== null) budget -= verbrauch.varianten;   // auch ein Produkt, das nach angelegten Varianten mit einem gewöhnlichen Fehler endet, hat Tageslimit verbraucht
      const zustand = e.zustand ? { zustand: e.zustand } : {};
      if (e instanceof TageslimitFehler) { log(`TAGESLIMIT: ${e.message}`); if (e.zustand) log(`   ${e.zustand}`); ergebnisse.push({ handle: p.handle, status: 'TAGESLIMIT', ...zustand }); return { ergebnisse, exit: 4 }; }
      if (e instanceof AbweichungFehler) { log(`ABWEICHUNG: ${e.message}`); for (const x of e.liste.slice(0, 20)) log('   · ' + x); if (e.zustand) log(`   ${e.zustand}`); ergebnisse.push({ handle: p.handle, status: 'ABWEICHUNG', liste: e.liste, ...zustand }); return { ergebnisse, exit: 3 }; }
      folge++; log(`✗ ${p.handle}: ${e.message}`); if (e.zustand) log(`   ${e.zustand}`); ergebnisse.push({ handle: p.handle, status: 'FEHLER', fehler: e.message, ...zustand });
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
  4: `TAGESLIMIT für neue Varianten erreicht: nicht sofort wiederholen, später denselben Befehl (der geprüfte Plan bleibt gültig, solange die Daten höchstens ${DATEN_MAX_ALTER_H} Stunden alt sind; sonst zuerst DATEN=holen)`,
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
