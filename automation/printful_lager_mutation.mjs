#!/usr/bin/env node
// Mutationsprobe des Printful-Lager-Wächters: baut absichtliche Fehler in die Quellen ein und verlangt, dass mindestens ein Test ROT wird.
// Ein Test, der einen eingebauten Fehler nicht bemerkt, schützt nichts. Gearbeitet wird in einer KOPIE im Temp-Ordner, das Repo bleibt unberührt.
// Lauf: /opt/node22/bin/node automation/printful_lager_mutation.mjs      (Exit 0 = alle Mutanten erkannt, 1 = mindestens einer überlebt, 2 = Ausgangslage nicht grün oder Muster nicht anwendbar)
// Jeder Mutant nennt `von` (muss genau einmal vorkommen) und `zu`. Steht «?» in der Ausgabe, passt das Muster nicht mehr zum Code: Mutant nachziehen.
// Die Probe zählt nur bei sauberer Ausgangslage: beide Tests müssen auf der unveränderten Kopie grün sein (sonst meldete sie für jeden Mutanten «erkannt»).
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const DATEIEN = [
  'automation/printful_lager.mjs', 'automation/lib/printful_lager.mjs', 'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_secret.mjs', 'automation/lib/shopify_host.mjs',
  'automation/printful_lager_test.mjs', 'automation/lib/printful_lager_test.mjs',
  'dropship/katalog-fenster-0611/ziel/assets__luxe-clothing-ausblenden.json', 'dropship/codex-katalog/ausblenden.json',
];
const TESTS = ['automation/lib/printful_lager_test.mjs', 'automation/printful_lager_test.mjs'];
const L = 'automation/lib/printful_lager.mjs', R = 'automation/printful_lager.mjs';

// { name, datei, von, zu }
export const MUTANTEN = [
  // ── Lib: Zuordnung und Fremdware
  { name: 'stocked_on_demand zählt nicht als lieferbar', datei: L, von: "new Set(['in_stock', 'stocked_on_demand'])", zu: "new Set(['in_stock'])" },
  { name: 'SKU: auch Endziffern ohne Muster werden akzeptiert', datei: L, von: "/^(\\d+)_(\\d+)$/.exec(", zu: "/(\\d+)_(\\d+)$/.exec(" },
  { name: 'Fortura-Tag schliesst nicht mehr aus', datei: L, von: '/^(fortura|ch-lager|cj-|cj$|cjdropshipping|zendrop|gelato|spocket)/i', zu: '/^(ch-lager|cj-|cj$|cjdropshipping|zendrop|gelato|spocket)/i' },
  { name: 'Fortura-SKU schliesst nicht mehr aus', datei: L, von: 'export const FREMD_SKU = /^(fortura-|cj)/i;', zu: 'export const FREMD_SKU = /^(zzzz)/i;' },
  { name: 'fehlendes Statusfeld gilt als ausverkauft', datei: L, von: "if (!Array.isArray(v.availability_status)) return { art: 'unbekannt', regionen: [] };", zu: '' },
  // ── Lib: Modell lesen
  { name: '404 gilt nicht als «weg»', datei: L, von: "if (st === 404) return { art: 'weg', id: erwarteteId };", zu: '' },
  { name: 'falsche Modellnummer wird geglaubt', datei: L, von: "if (ganz(r.product.id) !== erwarteteId) return { art: 'unbekannt', id: erwarteteId, grund: 'falsche Modellnummer' };", zu: '' },
  { name: 'leere Variantenliste wird geglaubt', datei: L, von: "if (!Array.isArray(r.variants) || !r.variants.length) return", zu: "if (!Array.isArray(r.variants)) return" },
  { name: 'eingestelltes Modell bleibt im Fenster', datei: L, von: 'if (r.product.is_discontinued === true) return', zu: 'if (false) return' },
  { name: 'Variantenschwund wird nicht bemerkt', datei: L, von: 'varianten.length < basis * REGELN.varianteSchwund', zu: 'varianten.length < 0' },
  { name: '«alle aus» schon bei einer ausverkauften Variante', datei: L, von: 'alleAus: nUnbekannt === 0 && ausIds.length === varianten.length', zu: 'alleAus: ausIds.length >= 1' },
  { name: 'Testvariante darf ausverkauft sein', datei: L, von: "    if (v.art !== 'ok') continue;\n    const k = v.regionen.join('+');", zu: "    const k = v.regionen.join('+');" },
  { name: 'Testvarianten: wenige Regionen zuerst', datei: L, von: 'b.n - a.n ||', zu: 'a.n - b.n ||' },
  { name: 'Signatur ohne Regionen', datei: L, von: "`${v.id}:${v.art}:${v.regionen.join('+')}`", zu: '`${v.id}:${v.art}`' },
  // ── Lib: Versandrate
  { name: '«ausverkauft» gilt als keine Schweizer Rate', datei: L, von: "if (/out of stock/i.test(text)) return { art: 'ausverkauft', grund: text.slice(0, 120) };", zu: "if (/out of stock/i.test(text)) return { art: 'keine-rate', grund: text.slice(0, 120) };" },
  { name: 'unbekannte 400-Meldung gilt als keine Rate', datei: L, von: "return { art: 'unbekannt', grund: text.slice(0, 160) || 'HTTP 400' };", zu: "return { art: 'keine-rate', grund: text.slice(0, 160) || 'HTTP 400' };" },
  { name: '403 ist nicht fatal', datei: L, von: 'if (st === 401 || st === 403) return { art: \'fatal\'', zu: 'if (st === 401) return { art: \'fatal\'' },
  { name: 'teuerste statt günstigste Rate', datei: L, von: 'raten.sort((a, b) => a.usd - b.usd);', zu: 'raten.sort((a, b) => b.usd - a.usd);' },
  { name: 'eine unklare Antwort genügt für «keine Rate»', datei: L, von: 'if (keine.length && !offen.length)', zu: 'if (keine.length)' },
  // ── Lib: wann wird die Rate gemessen
  { name: 'Modelle ohne Rate werden nicht neu gemessen', datei: L, von: "if (chVorher !== true) return { mess: true,", zu: "if (chVorher === null) return { mess: true," },
  { name: 'geänderte Signatur löst keine Messung aus', datei: L, von: "if (z.sig !== lesung.signatur) return { mess: true, grund: 'signatur-geaendert' };", zu: '' },
  { name: 'Shop-Modelle werden nie neu gemessen', datei: L, von: 'alter > REGELN.shopRateMaxTage', zu: 'alter > 99999' },
  { name: 'tägliche Scheibe entfällt', datei: L, von: 'lesung.id % REGELN.scheiben === tagIndex % REGELN.scheiben', zu: 'false' },
  { name: 'veraltete Rate wird nie erneuert', datei: L, von: 'if (alter !== null && alter > REGELN.rateMaxTage)', zu: 'if (false)' },
  // ── Lib: Urteil
  { name: 'unklare Messung zählt als frisch', datei: L, von: 'const frisch = !!rate && rate.ch !== null && rate.ch !== undefined;', zu: 'const frisch = !!rate;' },
  { name: 'alter Stand «keine Rate» darf den Shop anfassen', datei: L, von: 'const shopUnsicher = !shopAus && ch === false;', zu: 'const shopUnsicher = false;' },
  { name: 'technisch ungeeignete Modelle bleiben im Fenster', datei: L, von: "const technisch = b.klasse === 'UNGEEIGNET';", zu: 'const technisch = false;' },
  { name: 'alter Stand «keine Rate» zählt als Shop-Grund', datei: L, von: "if (frisch && rate.ch === false) shopGruende.push('keine-ch-rate');", zu: "if (ch === false) shopGruende.push('keine-ch-rate');" },
  { name: 'ausverkaufte Varianten stehen auch bei ausgeblendeten Modellen', datei: L, von: 'ausVarianten: fensterAus ? [] : [...lesung.ausIds], ch, unbekannt: false };', zu: 'ausVarianten: [...lesung.ausIds], ch, unbekannt: false };' },
  // ── Lib: Datei
  { name: 'Varianten werden auch für ausgeblendete Modelle geschrieben', datei: L, von: 'if (u.fensterAus) modelle.push(id);\n    else if (u.ausVarianten.length)', zu: 'if (u.fensterAus) modelle.push(id);\n    if (u.ausVarianten.length)' },
  { name: 'andere Zeilentrennung in der Datei', datei: L, von: ".join(',\\n');", zu: ".join(',');" },
  { name: 'Vergleich hängt von der Reihenfolge ab', datei: L, von: "m: [...o.modelle].sort((x, y) => x - y)", zu: 'm: [...o.modelle]' },
  { name: 'Schema wird nicht geprüft', datei: L, von: 'o.schemaVersion !== SCHEMA_AUSBLENDEN', zu: 'false' },
  { name: 'Stand der Datei ist beliebig alt', datei: L, von: 'standErneuernTage: 7,', zu: 'standErneuernTage: 7000,' },
  // ── Lib: Shop-Plan
  { name: 'Produkte ohne POD-Tag werden bearbeitet', datei: L, von: 'if (!istPodProdukt(p)) { zaehl.fremdOderOhnePod++; continue; }', zu: '' },
  { name: 'unvollständige Variantenliste genügt', datei: L, von: 'if (p.variantenVollstaendig === false) {', zu: 'if (false) {' },
  { name: 'unsicheres Modell zählt wie lieferbar', datei: L, von: 'if (!m || m.unbekannt || m.shopUnsicher) {', zu: 'if (!m || m.unbekannt) {' },
  { name: 'ENTWURF auch bei einer unbekannten Variante', datei: L, von: "if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0 && nUnb === 0) {", zu: "if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0) {" },
  { name: 'ENTWURF schon bei einer ausverkauften Variante', datei: L, von: "if (p.status === 'ACTIVE' && nAus > 0 && nOk === 0 && nUnb === 0) {", zu: "if (p.status === 'ACTIVE' && nAus > 0 && nUnb === 0) {" },
  { name: 'fremde Entwürfe werden reaktiviert', datei: L, von: "if (p.status === 'DRAFT' && hatTag) {", zu: "if (p.status === 'DRAFT') {" },
  { name: 'Reaktivierung schon bei einer lieferbaren Variante von vielen', datei: L, von: 'nOk > 0 && nOk / zeilen.length >= REAKTIV_MIN_ANTEIL', zu: 'nOk > 0' },
  { name: 'Strategie auto sperrt nicht', datei: L, von: "const alsA = strategie === 'A' || strategie === 'auto';", zu: "const alsA = strategie === 'A';" },
  { name: 'Strategie B sperrt auch', datei: L, von: "const alsA = strategie === 'A' || strategie === 'auto';", zu: 'const alsA = true;' },
  { name: 'bereits gesperrte Variante wird nochmals gesperrt', datei: L, von: "if (sm.ok && z.v.inventoryPolicy === 'CONTINUE') aktionen.push", zu: 'if (sm.ok) aktionen.push' },
  { name: 'Sperre am Dienst-Standort erlaubt', datei: L, von: "if (lv.some((l) => l.location && l.location.isFulfillmentService)) return { ok: false, grund: 'dienststandort' };", zu: '' },
  { name: 'Sperre bei positivem Bestand', datei: L, von: "if (menge > 0) return { ok: false, grund: 'menge-positiv' };", zu: '' },
  { name: 'Sperre bei ungetrackter Variante (Konflikt mit dem Lager-Wächter)', datei: L, von: "if (!it.tracked) return { ok: false, grund: 'ungetrackt' };", zu: '' },
  { name: 'gesperrte Variante wird nie freigegeben', datei: L, von: "} else if (z.art === 'ok' && gesperrt) {", zu: '} else if (false) {' },
  // ── Lib: Bremsen, Ledger, Erlaubnisliste
  { name: 'Bremse «nicht lesbar» zu locker', datei: L, von: 'z.unbekannt / gesamt > r.maxUnbekanntAnteil', zu: 'z.unbekannt / gesamt > r.maxUnbekanntAnteil * 3' },
  { name: 'Bremse «neu verschwindend» zu locker', datei: L, von: 'z.neuAus > maxNeu', zu: 'z.neuAus > maxNeu * 10' },
  { name: 'Bremse «Entwürfe» zu locker', datei: L, von: 'z.entwuerfe > maxEnt', zu: 'z.entwuerfe > maxEnt * 10' },
  { name: 'Mindestzahl neu verschwindender Modelle viel zu hoch', datei: L, von: 'maxNeuAusMin: 20,', zu: 'maxNeuAusMin: 2000,' },
  { name: 'Printful: Schreiben erlaubt', datei: L, von: "(methode === 'GET' && /^\\/products\\/\\d+$/.test(String(pfad))) || (methode === 'POST' && pfad === '/shipping/rates')", zu: "(methode === 'GET' && /^\\/products\\/\\d+$/.test(String(pfad))) || methode === 'POST'" },
  { name: 'Printful: jeder Lesepfad erlaubt', datei: L, von: "(methode === 'GET' && /^\\/products\\/\\d+$/.test(String(pfad)))", zu: "(methode === 'GET')" },
  { name: 'Ledger-Zeile ohne vorher=', datei: L, von: "`printful-lager ${iso} ${typ} ${ziel} vorher=${JSON.stringify(vorher)}`", zu: "`printful-lager ${iso} ${typ} ${ziel} ${JSON.stringify(vorher)}`" },
  { name: 'Kanäle fehlen nie', datei: L, von: 'return (vorher || []).map(String).filter((x) => !j.has(x));', zu: 'return [];' },
  // ── Lauf: Schutzschalter
  { name: 'Printful-Erlaubnisliste wird im Lauf nicht geprüft', datei: R, von: 'if (!pfErlaubt(methode, pfad)) throw', zu: 'if (false) throw' },
  { name: 'Shopify darf im Trockenlauf schreiben', datei: R, von: "if (!schreiben) { z.uebersprungen++; throw new Error('Schreibzugriff im Trockenlauf (Programmfehler)'); }", zu: '' },
  { name: 'LIVE=1 ohne Freigabedatei schreibt', datei: R, von: 'else if (C.live && existsSync(C.freigabe)) schreiben = true;', zu: 'else if (C.live) schreiben = true;' },
  { name: 'Freigabedatei allein schreibt', datei: R, von: 'else if (C.live && existsSync(C.freigabe)) schreiben = true;', zu: 'else if (existsSync(C.freigabe)) schreiben = true;' },
  { name: 'Telegram auch im Trockenlauf', datei: R, von: "if (!schreiben) { log('[Trockenlauf] Telegram: '", zu: "if (false) { log('[Trockenlauf] Telegram: '" },
  { name: 'FORCE hebt auch die Bremse «nicht lesbar» auf', datei: R, von: "const hart = ver.filter((v) => v.art === 'zu-viele-unbekannt' || !C.force);", zu: 'const hart = ver.filter((v) => !C.force);' },
  { name: 'Bremsen werden ignoriert', datei: R, von: 'const abbruch = hart.length > 0;', zu: 'const abbruch = false;' },
  { name: 'Abbruch endet mit Exit 0', datei: R, von: "return await ende(2, `Bremse: ${hart.map((v) => v.art).join(', ')}`);", zu: "return await ende(0, `Bremse: ${hart.map((v) => v.art).join(', ')}`);" },
  { name: 'Zeitlimit wird nicht beachtet', datei: R, von: 'const zeitAbgelaufen = () => jetztMs() - START > C.runLimitMs;', zu: 'const zeitAbgelaufen = () => false;' },
  { name: 'Nachprüfung vor dem ENTWURF entfällt', datei: R, von: "if (a.typ === 'entwurf' && !bestaetigt(a)) {", zu: 'if (false) {' },
  { name: 'Datei wird auch angelegt, wenn sie im Theme fehlt', datei: R, von: "const dateiNeu = live.zustand === 'ok' && !C.modelleTeil &&", zu: 'const dateiNeu = !C.modelleTeil &&' },
  { name: 'Teilmenge schreibt die Datei', datei: R, von: "const dateiNeu = live.zustand === 'ok' && !C.modelleTeil &&", zu: "const dateiNeu = live.zustand === 'ok' &&" },
  { name: 'Stand wird nie erneuert', datei: R, von: 'standAlter >= REGELN.standErneuernTage', zu: 'false' },
  { name: 'Datei wird trotz Änderung durch Dritte überschrieben', datei: R, von: 'if (frisch.zustand !== \'ok\' || frisch.md5 !== live.md5) fehler.push(', zu: 'if (false) fehler.push(' },
  { name: 'Rücklesen der Datei entfällt', datei: R, von: 'if (r.zustand === \'ok\' && r.md5 === md5(text)) { ok = true; break; }', zu: 'ok = true; break;' },
  { name: 'Rücklesen der Produkte entfällt', datei: R, von: "if (!ok) fehler.push(`Rücklesen ${a.typ} ${a.handle}: Stand weicht vom Soll ab`);", zu: '' },
  { name: 'Ledger wird nicht geschrieben', datei: R, von: "const led = (typ, ziel, vorher) => appendFileSync(C.ledger, ledgerZeile(iso(), typ, ziel, vorher) + '\\n');", zu: 'const led = () => {};' },
  { name: 'Kanäle werden vor dem ENTWURF nicht gemerkt', datei: R, von: "let d = await schreibenGql(M_MF_SET, { m: [{ ownerId: produktId, namespace: MF_NAMESPACE, key: MF_KANAELE, type: 'single_line_text_field', value: merk }] });", zu: 'let d = { metafieldsSet: { userErrors: [] } };' },
  { name: 'Kanäle werden bei der Rückkehr nicht veröffentlicht', datei: R, von: 'if (fehlt.length) {\n        d = await schreibenGql(M_PUBLISH', zu: 'if (false) {\n        d = await schreibenGql(M_PUBLISH' },
  { name: 'Kanäle nach dem Veröffentlichen nicht geprüft', datei: R, von: "if (fehlt.length) throw new Error(`Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt", zu: "if (false) throw new Error(`Verkaufskanäle nach dem Aktivieren nicht wiederhergestellt" },
  { name: 'Tag wird beim ENTWURF nicht gesetzt', datei: R, von: "d = await schreibenGql(M_TAGS_ADD, { id: produktId, tags: [TAG_AUS] }); f = userFehler(d, 'tagsAdd'); if (f) throw new Error('tagsAdd: ' + f);", zu: '' },
  { name: 'userErrors der Produktänderung werden übersehen', datei: R, von: "d = await schreibenGql(M_STATUS, { p: { id: produktId, status: 'DRAFT' } }); f = userFehler(d, 'productUpdate'); if (f) throw new Error('productUpdate: ' + f);", zu: "d = await schreibenGql(M_STATUS, { p: { id: produktId, status: 'DRAFT' } });" },
  { name: 'Strategie A merkt die alte Einstellung nicht', datei: R, von: "metafields: [{ namespace: MF_NAMESPACE, key: MF_SPERRE, type: 'single_line_text_field', value: a.vorherPolicy }] }] });\n          const f", zu: "}] });\n          const f" },
  { name: 'Sperre setzt CONTINUE statt DENY', datei: R, von: "v: [{ id: a.varianteId, inventoryPolicy: 'DENY', metafields:", zu: "v: [{ id: a.varianteId, inventoryPolicy: 'CONTINUE', metafields:" },
  { name: 'Freigabe löscht die Markierung nicht', datei: R, von: "d = await schreibenGql(M_MF_WEG, { m: [{ ownerId: a.varianteId, namespace: MF_NAMESPACE, key: MF_SPERRE }] }); f = userFehler(d, 'metafieldsDelete'); if (f) throw new Error('metafieldsDelete: ' + f);\n        }", zu: '}' },
  // ── Lauf: Printful-Client
  { name: '429 wird nicht abgewartet', datei: R, von: 'if (r.status === 429) {', zu: 'if (false) {' },
  { name: '401 wird nicht als fatal erkannt', datei: R, von: 'if (r.status === 401 || r.status === 403) throw', zu: 'if (false) throw' },
  { name: '5xx wird nicht wiederholt', datei: R, von: "if (r.status >= 500) { letzte = new PfFehler(`Printful ${pfad}: HTTP ${r.status}`, 'transient'); await sleep(2000 * (i + 1)); continue; }", zu: '' },
  { name: 'abgeschnittene Antwort wird geglaubt', datei: R, von: 'if (!ganz && r.status === 200) {', zu: 'if (false) {' },
  { name: 'X-PF-Store-Id fehlt nie', datei: R, von: "if (C.pfStore) headers['X-PF-Store-Id'] = C.pfStore;", zu: "headers['X-PF-Store-Id'] = C.pfStore;" },
  { name: 'Preisauskunft: Land nicht Schweiz', datei: R, von: "recipient: { country_code: 'CH', zip: '8001' }", zu: "recipient: { country_code: 'DE', zip: '8001' }" },
  // ── Lauf: Shopify, Zustand, Rücknahme
  { name: 'hängender Cursor wird nicht erkannt', datei: R, von: "if (!d.pageInfo.endCursor || d.pageInfo.endCursor === cur) throw", zu: 'if (false) throw' },
  { name: 'Zustandsdatei wird nicht geschrieben', datei: R, von: 'try { writeFileSync(C.zustandDatei, JSON.stringify(neuZ)); } catch { /* Zugabe */ }', zu: '' },
  { name: 'MAX_RATEN begrenzt nichts', datei: R, von: 'const dran = plan2.slice(0, C.maxRaten), vertagt = plan2.slice(C.maxRaten);', zu: 'const dran = plan2, vertagt = [];' },
  { name: 'Rücknahme prüft die fremde Veränderung der Datei nicht', datei: R, von: 'if (aktuell.md5 !== e.vorher.md5Nachher && !C.fremdUeberschreiben) {', zu: 'if (false) {' },
  { name: 'Rücknahme setzt nicht vom Ledger gesetzte Stände zurück', datei: R, von: "const ok = p && (e.typ === 'entwurf' ? (p.status === 'DRAFT' && p.tags.includes(TAG_AUS)) : p.status === 'ACTIVE');", zu: 'const ok = !!p;' },
  { name: 'Rücknahme stellt die Kanäle nicht wieder her', datei: R, von: "if (e.typ === 'entwurf') await produktReaktivieren(e.ziel, Array.isArray(e.vorher.kanaele) ? e.vorher.kanaele : null, () => {}, 'DRAFT');", zu: "if (e.typ === 'entwurf') await produktReaktivieren(e.ziel, null, () => {}, 'DRAFT');" },
  { name: 'ungültige Strategie wird hingenommen', datei: R, von: "if (!['A', 'B', 'AUTO'].includes(strategie)) fehler.push(", zu: "if (false) fehler.push(" },
  { name: 'Fremde Shop-Adresse wird nicht abgelehnt', datei: R, von: "try { return normalizeShopifyHost(env.SHOPIFY_SHOP || '') || 'au3j0y-hq.myshopify.com'; } catch { fehler.push('SHOPIFY_SHOP ungültig'); return ''; }", zu: "return env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';" },
  // ── Korrekturrunde 06.11.2026: Statuswörter, Randregionen, Schweizer Rate, POD-Erkennung
  { name: 'ein fremdes Statuswort gilt als ausverkauft', datei: L, von: "if (woerter.length) return { art: 'unbekannt', regionen: [], woerter };", zu: '' },
  { name: 'out_of_stock zählt als ausverkauft (ungemessen)', datei: L, von: "export const STATUS_AUS = new Set(['supplier_out_of_stock']);", zu: "export const STATUS_AUS = new Set(['supplier_out_of_stock', 'out_of_stock']);" },
  { name: 'Regionen ohne Schweizer Versand: Liste leer', datei: L, von: "export const REGIONEN_NICHT_CH = new Set(['AU', 'BR', 'JP', 'UK']);", zu: 'export const REGIONEN_NICHT_CH = new Set([]);' },
  { name: 'JP fehlt in der Liste der Randregionen', datei: L, von: "REGIONEN_NICHT_CH = new Set(['AU', 'BR', 'JP', 'UK']);", zu: "REGIONEN_NICHT_CH = new Set(['AU', 'BR', 'UK']);" },
  { name: 'UK fehlt in der Liste der Randregionen', datei: L, von: "REGIONEN_NICHT_CH = new Set(['AU', 'BR', 'JP', 'UK']);", zu: "REGIONEN_NICHT_CH = new Set(['AU', 'BR', 'JP']);" },
  { name: 'Randregion bleibt in der Regionsliste', datei: L, von: 'const regionen = lieferbar.filter((r) => !REGIONEN_NICHT_CH.has(r));', zu: 'const regionen = lieferbar;' },
  { name: 'nur ausserhalb der Schweiz lieferbar gilt als ausverkauft nur ohne Grund', datei: L, von: "if (lieferbar.length) return { art: 'aus', regionen: [], grund: 'nur-ausserhalb-ch' };", zu: '' },
  { name: 'fremde Wörter gehen nicht ins Ergebnis', datei: L, von: 'fremdeWoerter, nurAusserhalb:', zu: 'fremdeWoerter: [], nurAusserhalb:' },
  { name: 'HTTP 200 ohne verwertbare Rate gilt als «keine Schweizer Rate»', datei: L, von: "return { art: 'unbekannt', grund: 'HTTP 200 ohne verwertbare Rate' };", zu: "return { art: 'keine-rate', grund: 'leere Liste' };" },
  { name: 'negative Raten zählen', datei: L, von: 'x.usd !== null && x.usd >= 0', zu: 'x.usd !== null' },
  { name: 'Produkte nur mit SKU 9000001_ werden nicht erkannt', datei: L, von: '|| hatPodSku(p)) && !istFremdeWare(p);', zu: ') && !istFremdeWare(p);' },
  { name: 'SKU-Erkennung schon bei einer passenden SKU', datei: L, von: 'return l.length > 0 && l.every((x) => POD_SKU.test(x));', zu: 'return l.length > 0 && l.some((x) => POD_SKU.test(x));' },
  { name: 'Shop-Abfrage ohne SKU-Zweig', datei: R, von: " OR sku:9000001_*'", zu: "'" },
  // ── Korrekturrunde: nachziehen, Status-Prüfung, Rollback
  { name: 'aktives Produkt mit unserem Tag wird nicht zu Ende geführt', datei: L, von: "if (p.status === 'ACTIVE' && hatTag) {", zu: 'if (false) {' },
  { name: 'nachziehen vergisst die gemerkte Kanalliste', datei: L, von: "vorher: 'ACTIVE', kanaele: p.kanaele == null ? null : kanaeleLesen(p.kanaele) });", zu: "vorher: 'ACTIVE', kanaele: null });" },
  { name: 'Katalog-Lücken auch bei Entwürfen', datei: L, von: "if (p.status === 'ACTIVE') katalogLuecken.push({ handle: p.handle, sku: v.sku });", zu: 'katalogLuecken.push({ handle: p.handle, sku: v.sku });' },
  { name: 'ENTWURF prüft den Status nicht erneut', datei: R, von: "if (p.status !== 'ACTIVE') throw new Uebersprungen(", zu: 'if (false) throw new Uebersprungen(' },
  { name: 'Reaktivierung prüft Status und Tag nicht erneut', datei: R, von: 'if (p0.status !== erwartet || !p0.tags.includes(TAG_AUS)) throw new Uebersprungen(', zu: 'if (false) throw new Uebersprungen(' },
  { name: 'Reaktivierung prüft das Tag nicht erneut', datei: R, von: 'if (p0.status !== erwartet || !p0.tags.includes(TAG_AUS)) throw new Uebersprungen(', zu: 'if (p0.status !== erwartet) throw new Uebersprungen(' },
  { name: 'schon gemerktes Merkfeld wird überschrieben', datei: R, von: 'const merk = kanaeleText([...kanaeleLesen(altesMerkfeld), ...kan]);', zu: 'const merk = kanaeleText([...kan]);' },
  { name: 'Rollback entfernt das Tag nicht', datei: R, von: 'try { await schreibenGql(M_TAGS_WEG, { id: produktId, tags: [TAG_AUS] }); if (altesMerkfeld == null)', zu: 'try { if (altesMerkfeld == null)' },
  { name: 'Rollback löscht das Merkfeld nicht', datei: R, von: 'if (altesMerkfeld == null) await schreibenGql(M_MF_WEG', zu: 'if (false) await schreibenGql(M_MF_WEG' },
  { name: 'Rollback löscht auch ein vorhandenes Merkfeld', datei: R, von: 'if (altesMerkfeld == null) await schreibenGql(M_MF_WEG', zu: 'if (true) await schreibenGql(M_MF_WEG' },
  { name: 'tagsAdd-Fehler werden übersehen', datei: R, von: "d = await schreibenGql(M_TAGS_ADD, { id: produktId, tags: [TAG_AUS] }); f = userFehler(d, 'tagsAdd'); if (f) throw new Error('tagsAdd: ' + f);", zu: 'await schreibenGql(M_TAGS_ADD, { id: produktId, tags: [TAG_AUS] });' },
  { name: 'nachziehen erwartet einen Entwurf', datei: R, von: "a.typ === 'nachziehen' ? 'ACTIVE' : 'DRAFT');", zu: "'DRAFT');" },
  { name: 'übersprungene Änderung zählt als Fehler', datei: R, von: 'if (e instanceof Uebersprungen) { befunde.push(', zu: 'if (false) { befunde.push(' },
  { name: 'Rücklesen nach nachziehen und Reaktivierung entfällt', datei: R, von: "ok = p.status === 'ACTIVE' && !p.tags.includes(TAG_AUS) && !p.kanaele && kanaeleFehlend(a.kanaele || [], kanaeleVon(p)).length === 0;", zu: 'ok = true;' },
  { name: 'Rücklesen der Reaktivierung prüft die Kanäle nicht', datei: R, von: ' && kanaeleFehlend(a.kanaele || [], kanaeleVon(p)).length === 0;', zu: ';' },
  { name: 'Rücklesen des ENTWURFS prüft Tag und Merkfeld nicht', datei: R, von: "ok = p.status === 'DRAFT' && p.tags.includes(TAG_AUS) && !!p.kanaele;", zu: "ok = p.status === 'DRAFT';" },
  { name: 'nicht gelesene Nachprüfung zählt als bestätigt', datei: R, von: "if (n.l2.art !== 'ok') return false;", zu: "if (n.l2.art !== 'ok') return true;" },
  { name: 'nicht veröffentlichte Kanäle werden mitgemerkt', datei: R, von: '.filter((x) => x.isPublished).map((x) => pubNr(x.publication.id));', zu: '.map((x) => pubNr(x.publication.id));' },
  { name: 'Ledger der Reaktivierung fehlt', datei: R, von: 'ledgerFn({ status: p0.status, kanaele: kanaeleSoll });', zu: '' },
  { name: 'Ledger des ENTWURFS erst nach dem Schreiben', datei: R, von: "    ledgerFn({ status: p.status, handle: p.handle, kanaele: kan });\n    let d = await schreibenGql(M_MF_SET", zu: "    let d = await schreibenGql(M_MF_SET" },
  // ── Korrekturrunde: Befunde und Telegram
  { name: 'Befund-Schlüssel ohne SKU', datei: L, von: "`${b.art}:${b.sku || b.wort || b.handle || ''}`", zu: 'b.art' },
  { name: 'schon gemeldete Befunde werden erneut gemeldet', datei: L, von: 'if (!Object.prototype.hasOwnProperty.call(g, k)) neu.push(b);', zu: 'neu.push(b);' },
  { name: 'erledigte Befunde bleiben im Zustand', datei: L, von: 'for (const k of aktuell) { if (gemeldet &&', zu: 'for (const k of Object.keys(gemeldet || {})) { if (gemeldet &&' },
  { name: 'ausverkaufte Einzelvarianten sind nicht meldepflichtig', datei: L, von: "new Set(['variante-ausverkauft', 'variante-nicht-im-katalog', 'status-wort-unbekannt'])", zu: "new Set(['variante-nicht-im-katalog', 'status-wort-unbekannt'])" },
  { name: 'Telegram-Ausfall zählt als gemeldet', datei: R, von: 'if (r === true) gesendet = mb.neu;', zu: 'gesendet = mb.neu;' },
  { name: 'gemeldete Befunde werden nicht in den Zustand geschrieben', datei: R, von: 'gemeldet: zustand.gemeldet || {} };', zu: 'gemeldet: {} };' },
  { name: 'Katalog-Lücken auch bei Teilmenge', datei: R, von: 'if (plan.katalogLuecken.length && unbekannt.length === 0 && !C.modelleTeil) {', zu: 'if (plan.katalogLuecken.length && unbekannt.length === 0) {' },
  { name: 'Katalog-Lücken auch bei nicht lesbaren Modellen', datei: R, von: 'if (plan.katalogLuecken.length && unbekannt.length === 0 && !C.modelleTeil) {', zu: 'if (plan.katalogLuecken.length && !C.modelleTeil) {' },
  { name: 'fremde Statuswörter werden nicht gemeldet', datei: R, von: 'for (const [id, l] of lesungen) if (l) for (const w of l.fremdeWoerter || [])', zu: 'for (const [id, l] of lesungen) if (l) for (const w of [])' },
  { name: 'Telegram-Text nennt den Fehler nicht', datei: R, von: "${fehler.length ? `\\nFehler: ${esc(fehler.slice(0, 5).join(' | '))}` : ''}", zu: '' },
  // ── Korrekturrunde: Zustand, Rücknahme, Zeit (Mutanten der beiden Gegenleser)
  { name: 'Zustandsdatei mit fremdem Schema wird geglaubt', datei: R, von: 'if (zz && zz.schema === 1 && zz.modelle', zu: 'if (zz && zz.modelle' },
  { name: 'Rücknahme geht von vorn nach hinten', datei: R, von: "ledgerLesen(readFileSync(C.ledger, 'utf8')).reverse()", zu: "ledgerLesen(readFileSync(C.ledger, 'utf8'))" },
  { name: 'Rücknahme eines ENTWURFS prüft das Tag nicht', datei: R, von: "(p.status === 'DRAFT' && p.tags.includes(TAG_AUS))", zu: "(p.status === 'DRAFT')" },
  { name: 'Rücknahme einer Freigabe vertauscht Einstellung und Markierung', datei: R, von: "inventoryPolicy: e.vorher.policy, metafields: [{ namespace: MF_NAMESPACE, key: MF_SPERRE, type: 'single_line_text_field', value: e.vorher.marker }] }] });", zu: "inventoryPolicy: e.vorher.marker, metafields: [{ namespace: MF_NAMESPACE, key: MF_SPERRE, type: 'single_line_text_field', value: e.vorher.policy }] }] });" },
  { name: 'Rücknahme einer Reaktivierung tut nichts', datei: R, von: 'else await produktEntwerfen(e.ziel, () => {});', zu: 'else { /* nichts */ }' },
  { name: 'Preisauskunft: nach «ausverkauft» wird nie weiter gefragt', datei: R, von: "if (r.art === 'rate' || erg.filter((x) => x.art === 'keine-rate').length >= 2) break;", zu: 'if (true) break;' },
  { name: 'Preisauskunft: auch nach zwei Absagen wird weiter gefragt', datei: R, von: "if (r.art === 'rate' || erg.filter((x) => x.art === 'keine-rate').length >= 2) break;", zu: "if (r.art === 'rate') break;" },
  { name: 'Zeitlimit gilt nicht in der Preisauskunft-Phase', datei: R, von: "      if (zeitAbgelaufen()) return;\n      raten.set(id,", zu: '      raten.set(id,' },
  { name: 'Variante ausserhalb des Katalogs zählt als ausverkauft', datei: L, von: "zeilen.push({ v, art: 'unbekannt', grund: 'variante-nicht-im-katalog', variantId: s.variantId });", zu: "zeilen.push({ v, art: 'aus', grund: 'variante-nicht-im-katalog', variantId: s.variantId, modell: 0 });" },
  { name: 'Seitenlimit der Shop-Abfrage entfällt', datei: R, von: 'for (let seite = 0; seite < 60; seite++) {', zu: 'for (let seite = 0; seite < 600000; seite++) {' },
];

function lauf(dir, test) {
  const r = spawnSync(process.execPath, [join(dir, test)], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') + (r.error ? `\nStart fehlgeschlagen: ${r.error.message}` : '') };
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), 'plager-mut-'));
  let code = 0;
  try {
    for (const f of DATEIEN) { mkdirSync(dirname(join(dir, f)), { recursive: true }); copyFileSync(join(REPO, f), join(dir, f)); }
    for (const t of TESTS) { const g = lauf(dir, t); if (g.code !== 0) { console.error(`Ausgangslage nicht grün: ${t}\n${g.out.slice(-600)}`); code = 2; return; } }
    let erkannt = 0, ueberlebt = [], unpassend = [];
    for (const [i, m] of MUTANTEN.entries()) {
      const pfad = join(dir, m.datei);
      const orig = readFileSync(pfad, 'utf8');
      const treffer = orig.split(m.von).length - 1;
      if (treffer !== 1) { unpassend.push(`${m.name} (${treffer} Treffer)`); console.log(`? ${String(i + 1).padStart(3)} ${m.name}: Muster kommt ${treffer}-mal vor`); continue; }
      writeFileSync(pfad, orig.replace(m.von, () => m.zu));
      let rot = false, wer = '';
      for (const t of TESTS) { const g = lauf(dir, t); if (g.code !== 0) { rot = true; wer = t.split('/').pop(); break; } }
      writeFileSync(pfad, orig);
      if (rot) { erkannt++; console.log(`✓ ${String(i + 1).padStart(3)} ${m.name}  [${wer}]`); } else { ueberlebt.push(m.name); console.log(`✗ ${String(i + 1).padStart(3)} ${m.name}: ÜBERLEBT`); }
    }
    console.log(`\nMutationsprobe: ${erkannt} von ${MUTANTEN.length} erkannt, ${ueberlebt.length} überlebt, ${unpassend.length} mit unpassendem Muster`);
    for (const x of ueberlebt) console.log(`  überlebt: ${x}`);
    for (const x of unpassend) console.log(`  unpassend: ${x}`);
    code = unpassend.length ? 2 : ueberlebt.length ? 1 : 0;
  } finally { rmSync(dir, { recursive: true, force: true }); process.exitCode = code; }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
