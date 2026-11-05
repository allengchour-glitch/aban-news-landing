// Tests für anlegen.mjs (kein Netz): ein Shopify-Attrappe (fake_shopify.mjs) nimmt alle Aufrufe entgegen. Lauf: /opt/node22/bin/node automation/pod_modell/anlegen_test.mjs
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lauf, produktAnlegen, zuruecknehmen, vergleiche, leseFrisch, ledgerLesen, produktSetEingabe, sollBeschreibung, shopVariantenVon, Q_PRODUKT, Q_SKU, M_BIND, M_DELETE, MARKER_TAG, AbweichungFehler } from './anlegen.mjs';
import { neueAttrappe } from './fake_shopify.mjs';
import { planeModell, lade, versand, testUebersetzung, bilderFuer, neuerTest } from './testhilfe.mjs';
import { M_SET, M_META, M_UPDATE } from '../lib/pod_auswahl_schreiben.mjs';

const { ist, wahr, wirft, ende } = neuerTest('anlegen');
const URL_EDITOR = 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/lspod-designer-v6.js?v=1';
const plan = (id, opt = {}) => { const k = lade(id); return planeModell({ katalog: k, versand: versand(), uebersetzung: testUebersetzung(k), bilder: bilderFuer(k) }, { jetzt: 'x', stufen: [1, 2], ...opt }); };
const warte = async () => {};
const tempOrdner = [];
const ledger = () => { const d = mkdtempSync(join(tmpdir(), 'fabrik-')); tempOrdner.push(d); return join(d, 'ledger.txt'); };
const still = () => {};
const L = (extra = {}) => ({ editorUrl: URL_EDITOR, log: still, warte, mediaPauseMs: 0, ...extra });
const tasse = plan(19), cap = plan(206), shirt = plan(71);
wahr('Plan 19 ist anlegbar (sonst sind die Tests unten sinnlos)', tasse.anlegbar && cap.anlegbar && shirt.anlegbar);

// ── Abfragen und Mutationen gegen das echte Schema (GEMESSEN 05.11.2026 mit graphql_schema): hier nur, dass die Texte die richtigen Felder nennen
wahr('Q_PRODUKT liest Veröffentlichung, Metafelder, Medien und Variantenbilder', /resourcePublicationsCount\{ count \}/.test(Q_PRODUKT) && /metafields\(first:50\)/.test(Q_PRODUKT) && /media\(first:100\)/.test(Q_PRODUKT) && /media\(first:5\)/.test(Q_PRODUKT));
wahr('Q_SKU sucht mit sku:', /productVariants\(first:5, query:\$q\)/.test(Q_SKU));
wahr('M_BIND = productVariantAppendMedia, M_DELETE = productDelete', /productVariantAppendMedia\(productId:\$p, variantMedia:\$m\)/.test(M_BIND) && /productDelete\(input:\{id:\$id\}\)/.test(M_DELETE));
wahr('M_SET ist synchron', /productSet\(synchronous:true/.test(M_SET));

// ── Eingabe an productSet
const ein = produktSetEingabe(tasse);
ist('productSet: DRAFT, Handle, Titel', [ein.status, ein.handle, ein.title], ['DRAFT', tasse.handle, tasse.titel]);
ist('productSet: Varianten mit SKU, Preis (2 Stellen), CONTINUE, nicht verfolgt', ein.variants.every((v) => /_\d+$/.test(v.sku) && /^\d+\.\d\d$/.test(v.price) && v.inventoryPolicy === 'CONTINUE' && v.inventoryItem.tracked === false), true);
ist('productSet: jede Variante nennt jede Option', ein.variants.every((v) => v.optionValues.length === ein.productOptions.length), true);
ist('productSet: Medien mit Alt-Text', ein.files.every((f) => f.contentType === 'IMAGE' && f.alt && f.originalSource.startsWith('https://')), true);
wahr('productSet: enthält den Platzhalter noch (Schritt 7 ersetzt ihn)', ein.descriptionHtml.includes('__ERSTE_VARIANTE__'));
wahr('productSet: veröffentlicht nichts (kein publish, kein publications-Feld)', !('publications' in ein) && !JSON.stringify(ein).includes('publish'));

// ── Alles gut
{
  const f = neueAttrappe(); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Lauf: Exit 0, ein Produkt OK', [r.exit, r.ergebnisse[0].status, r.ergebnisse[0].varianten], [0, 'OK', tasse.varianten.length]);
  const p = [...f.st.produkte.values()][0];
  ist('Shop: DRAFT, in keinem Kanal', [p.status, p.kanaele], ['DRAFT', 0]);
  ist('Shop: Tag sg-fabrik gesetzt', p.tags.includes(MARKER_TAG), true);
  ist('Shop: jede Variante hat ihr Farbbild verbunden', p.variants.every((v) => v.mediaIds.length === 1), true);
  ist('Shop: Platzhalter ersetzt, Editor-Adresse und echte Varianten-ID drin', [p.descriptionHtml.includes('__'), p.descriptionHtml.includes(URL_EDITOR), p.descriptionHtml.includes(`data-variant="${p.variants[0].id.split('/').pop()}"`)], [false, true, true]);
  ist('Shop: Karte im Editor-Baustein trägt shop.varianten (Shopify-Variantennummer → Printful-Variante) für jede Variante', (() => { const m = /<script type="application\/json" id="lspod-karte">([\s\S]*?)<\/script>/.exec(p.descriptionHtml); const k = JSON.parse(m[1]); const soll = Object.fromEntries(p.variants.map((v) => [v.id.split('/').pop(), Number(v.sku.split('_').pop())])); return [JSON.stringify(k.shop.varianten) === JSON.stringify(soll), Object.keys(k.shop.varianten).length === tasse.varianten.length]; })(), [true, true]);
  ist('Shop: Metafelder geschrieben (Karte als JSON, Modell, Klasse)', ['karte', 'modell', 'klasse'].every((k) => p.metafields.some((m) => m.namespace === 'luxe_sg' && m.key === k)), true);
  ist('Ledger: BEGONNEN dann OK mit Produkt-ID', [...ledgerLesen(led).values()].map((e) => [e.status, e.produktId === p.id]), [['OK', true]]);
  ist('Ledger-Datei: beide Zeilen vorhanden', readFileSync(led, 'utf8').split('\n').filter((z) => /\tBEGONNEN\t|\tOK\t/.test(z)).length, 2);
  const a1 = f.st.schreibaufrufe;
  const r2 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('zweiter Lauf: übersprungen, 0 Schreibaufrufe mehr', [r2.ergebnisse[0].status, f.st.schreibaufrufe - a1, r2.exit], ['UEBERSPRUNGEN', 0, 0]);
  const ist1 = await leseFrisch(f.gql, tasse.handle);
  ist('Rücklesen: Vergleich mit dem Plan ohne Abweichung', vergleiche(tasse, ist1, { editorUrl: URL_EDITOR }), []);
}

// ── Vergleich erkennt jede Abweichung (am fertigen Produkt)
{
  const f = neueAttrappe(); const led = ledger();
  await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const p = [...f.st.produkte.values()][0];
  const frisch = async () => leseFrisch(f.gql, tasse.handle);
  const abw = async (aendere, teil) => { const orig = JSON.stringify(p); aendere(p); const a = vergleiche(tasse, await frisch(), { editorUrl: URL_EDITOR }); Object.assign(p, JSON.parse(orig)); return a.some((x) => x.includes(teil)); };
  wahr('Abweichung: Status ACTIVE', await abw(() => { p.status = 'ACTIVE'; }, 'Status'));
  wahr('Abweichung: Titel', await abw(() => { p.title = 'x'; }, 'Titel'));
  wahr('Abweichung: Tag fehlt', await abw(() => { p.tags = p.tags.filter((t) => t !== 'wunschdesign'); }, 'Tags'));
  wahr('Abweichung: Preis', await abw(() => { p.variants[0].price = '1.00'; }, 'Preis'));
  wahr('Abweichung: SKU fehlt', await abw(() => { p.variants[0].sku = 'X'; }, 'fehlt'));
  wahr('Abweichung: Bestand wird verfolgt', await abw(() => { p.variants[0].inventoryItem.tracked = true; }, 'Bestand'));
  wahr('Abweichung: inventoryPolicy DENY', await abw(() => { p.variants[0].inventoryPolicy = 'DENY'; }, 'inventoryPolicy'));
  wahr('Abweichung: Variantenbild gelöst', await abw(() => { p.variants[0].mediaIds = []; }, 'nicht verbunden'));
  wahr('Abweichung: Medium nicht READY', await abw(() => { p.media[0].status = 'PROCESSING'; p.media[0].lesungen = -1e9; }, 'PROCESSING'));
  wahr('Abweichung: Medium fehlt', await abw(() => { p.media = p.media.slice(1); }, 'fehlt'));
  wahr('Abweichung: Metafeld fehlt', await abw(() => { p.metafields = []; }, 'Metafeld'));
  wahr('Abweichung: Metafeld-Karte weicht ab', await abw(() => { p.metafields.find((m) => m.key === 'karte').value = '{"x":1}'; }, 'weicht ab'));
  wahr('Abweichung: Beschreibung', await abw(() => { p.descriptionHtml = '<p>x</p>'; }, 'Beschreibung'));
  wahr('Abweichung: shop.varianten zeigt auf die falsche Printful-Variante', await abw(() => { p.descriptionHtml = p.descriptionHtml.replace(/("shop":\{"varianten":\{"\d+":)\d+/, '$10'); }, 'Beschreibung'));
  wahr('Abweichung: Platzhalter übrig', await abw(() => { p.descriptionHtml = tasse.beschreibungHtml; }, 'Platzhalter übrig: true'));
  wahr('Abweichung: veröffentlicht', await abw(() => { p.kanaele = 2; }, 'Verkaufskanal'));
  wahr('Abweichung: Optionswert ohne Variante', await abw(() => { p.options[0].values.push('Leer'); }, 'ohne Variante'));
  wahr('Abweichung: eine Variante weniger', await abw(() => { p.variants.pop(); }, 'Anzahl Varianten'));
  wahr('Kein Fehlalarm bei geändertem Leerraum im HTML', vergleiche(tasse, { ...(await frisch()), descriptionHtml: (await frisch()).descriptionHtml.replace(/<\/p>\n/g, '</p>\n\n   ') }, { editorUrl: URL_EDITOR }).length === 0);
}

// ── Fremdes Produkt mit gleichem Handle: nichts überschreiben, nichts schreiben
{
  const f = neueAttrappe(); const led = ledger();
  const fremd = f.legeProduktAn({ handle: tasse.handle, status: 'ACTIVE', tags: ['x'] });
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Handle belegt: Abweichung (Exit 3), 0 Schreibaufrufe', [r.exit, r.ergebnisse[0].status, f.st.schreibaufrufe], [3, 'ABWEICHUNG', 0]);
  ist('Handle belegt: das fremde Produkt ist unverändert', [fremd.status, fremd.title, fremd.variants.length], ['ACTIVE', 'Fremd', 1]);
  ist('Handle belegt: Ledger bleibt leer', ledgerLesen(led).size, 0);
}
// ── Fremder DRAFT mit gleichem Handle UND Marker-Tag, aber nicht im Ledger: ebenfalls fremd
{
  const f = neueAttrappe(); const led = ledger();
  f.legeProduktAn({ handle: tasse.handle, status: 'DRAFT', tags: [MARKER_TAG], skus: tasse.varianten.map((v) => v.sku) });
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('gleicher Handle, DRAFT, Marker-Tag, aber nicht im Ledger: Abweichung, nichts geschrieben', [r.exit, f.st.schreibaufrufe], [3, 0]);
}
// ── SKU-Präfix im Shop schon vergeben (anderes Produkt)
{
  const f = neueAttrappe(); const led = ledger();
  f.legeProduktAn({ handle: 'anderes', skus: [tasse.varianten[0].sku] });
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('SKU-Präfix vergeben: Abweichung, nichts geschrieben', [r.exit, r.ergebnisse[0].status, f.st.schreibaufrufe], [3, 'ABWEICHUNG', 0]);
}
// ── Netzfehler mitten drin → Wiederaufnahme setzt fort, legt nichts doppelt an
for (const wo of ['metafieldsSet', 'productVariantAppendMedia', 'productUpdate']) {
  const f = neueAttrappe({ netzfehlerBei: wo }); const led = ledger();
  const r1 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist(`Netzfehler bei ${wo}: FEHLER, Produkt BEGONNEN im Ledger`, [r1.exit, r1.ergebnisse[0].status, f.st.produkte.size], [1, 'FEHLER', 1]);
  const r2 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist(`Wiederaufnahme nach ${wo}: OK, weiter nur ein Produkt`, [r2.exit, r2.ergebnisse[0].status, f.st.produkte.size], [0, 'OK', 1]);
  ist(`Wiederaufnahme nach ${wo}: kein zweites productSet`, f.st.aufrufe.filter((a) => /productSet/.test(a)).length, 1);
}
{ // Netzfehler IM productSet (Antwort verloren, Produkt nie angelegt): erneuter Lauf legt an
  const f = neueAttrappe({ netzfehlerBei: 'productSet' }); const led = ledger();
  const r1 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const r2 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Netzfehler vor dem Anlegen: erster Lauf FEHLER, zweiter OK', [r1.exit, r2.exit, f.st.produkte.size], [1, 0, 1]);
}
// ── Antwort auf productSet VERLOREN (Zeitüberschreitung), das Produkt steht aber im Shop (Fund beider Gegenleser 05.11.)
{
  const f = neueAttrappe({ antwortVerlorenBei: 'productSet' }); const led = ledger();
  const r1 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const e1 = ledgerLesen(led).get(tasse.handle); const p = [...f.st.produkte.values()][0];
  ist('Antwort verloren: Lauf 1 endet mit FEHLER, das Produkt steht im Shop', [r1.exit, r1.ergebnisse[0].status, f.st.produkte.size], [1, 'FEHLER', 1]);
  ist('Antwort verloren: das Werkzeug findet das Produkt nach dem Fehler und trägt die ID ein (kein Waisen-Entwurf)', [e1.produktId === p.id, e1.versucht], [true, true]);
  ist('Ledger-Datei trägt VERSUCH vor dem Senden und BEGONNEN mit ID', [/\tVERSUCH\t\t/.test(readFileSync(led, 'utf8')), readFileSync(led, 'utf8').includes(`\tBEGONNEN\t${p.id}\t`)], [true, true]);
  const r2 = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Wiederholung nach verlorener Antwort: OK, weiter ein Produkt, kein zweites productSet', [r2.exit, r2.ergebnisse[0].status, f.st.produkte.size, f.st.aufrufe.filter((a) => /productSet/.test(a)).length], [0, 'OK', 1, 1]);
}
{ // dasselbe, aber auch das Nachlesen nach dem Fehler scheitert: der nächste Lauf übernimmt das Produkt über die Zeile VERSUCH
  const f = neueAttrappe({ antwortVerlorenBei: 'productSet' }); const led = ledger(); let lesefehler = 0;
  const gql = async (q, v, e) => { if (/productByIdentifier/.test(q) && lesefehler === 1) { lesefehler = 2; throw new Error('Netz weg (Attrappe)'); } if (/productSet/.test(q)) lesefehler = 1; return f.gql(q, v, e); };
  const r1 = await lauf({ plaene: [tasse], gql, ledgerPfad: led, ...L() });
  const e1 = ledgerLesen(led).get(tasse.handle);
  ist('Antwort UND Nachlesen verloren: FEHLER, im Ledger steht keine ID, aber VERSUCH', [r1.exit, f.st.produkte.size, e1.produktId, e1.versucht], [1, 1, null, true]);
  const r2 = await lauf({ plaene: [tasse], gql, ledgerPfad: led, ...L() });
  ist('… der nächste Lauf übernimmt das eigene Produkt (VERSUCH + Tag + DRAFT + nur Plan-SKUs) und macht es fertig', [r2.exit, r2.ergebnisse[0].status, f.st.produkte.size, f.st.aufrufe.filter((a) => /productSet/.test(a)).length], [0, 'OK', 1, 1]);
  ist('… und trägt dabei die ID ins Ledger ein (Rücknahme geht dann über die ID)', ledgerLesen(led).get(tasse.handle).produktId, [...f.st.produkte.values()][0].id);
}
{ // Rücknahme eines Waisen-Entwurfs OHNE Ledger-ID
  const f = neueAttrappe({ antwortVerlorenBei: 'productSet' }); const led = ledger(); let lesefehler = 0;
  const gql = async (q, v, e) => { if (/productByIdentifier/.test(q) && lesefehler === 1) { lesefehler = 2; throw new Error('Netz weg (Attrappe)'); } if (/productSet/.test(q)) lesefehler = 1; return f.gql(q, v, e); };
  await lauf({ plaene: [tasse], gql, ledgerPfad: led, ...L() });
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme löst «VERSUCH/FEHLER ohne ID» über den Handle auf und löscht den Waisen-Entwurf', [r.ergebnisse.map((x) => x.status), r.exit, f.st.produkte.size, ledgerLesen(led).get(tasse.handle).status], [['GELOESCHT'], 0, 0, 'ZURUECK']);
}
{ // …aber nie ein Produkt, dessen SKUs nicht zum Modell des Ledgers gehören, oder das nicht mehr DRAFT ist
  const f = neueAttrappe(); const led = ledger();
  writeFileSync(led, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tVERSUCH\t\tx\n2026-11-05T00:00:01Z\t${tasse.handle}\t19\tFEHLER\t\ttimeout\n`);
  const fremd = f.legeProduktAn({ handle: tasse.handle, status: 'DRAFT', tags: [MARKER_TAG], kanaele: 0, skus: ['FREMD_1'] });
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme ohne Ledger-ID: Produkt mit fremden SKUs wird nie gelöscht', [r.ergebnisse[0].status, r.exit, f.st.produkte.has(fremd.id)], ['GESPERRT', 5, true]);
  fremd.variants[0].sku = `${9100000 + 19}_77`; f.setzeStatus(fremd.id, 'ACTIVE');
  ist('Rücknahme ohne Ledger-ID: ein aktives Produkt wird nie gelöscht', [(await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, f.st.produkte.has(fremd.id)], ['GESPERRT', true]);
  f.setzeStatus(fremd.id, 'DRAFT'); fremd.tags = [];
  ist('Rücknahme ohne Ledger-ID: ohne Marker-Tag nie', (await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, 'GESPERRT');
  fremd.tags = [MARKER_TAG];
  ist('Rücknahme ohne Ledger-ID: Modellnummer des Ledgers im SKU-Präfix, DRAFT, Marker, kein Kanal → gelöscht', [(await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, f.st.produkte.has(fremd.id)], ['GELOESCHT', false]);
}
{ // VERSUCH, aber das Produkt wurde nie angelegt: die Rücknahme verbucht «nie angelegt», löscht nichts
  const f = neueAttrappe(); const led = ledger();
  writeFileSync(led, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tVERSUCH\t\tx\n`);
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme: VERSUCH ohne Produkt im Shop → WEG, kein Schreibaufruf', [r.ergebnisse[0].status, f.st.schreibaufrufe, ledgerLesen(led).get(tasse.handle).status], ['WEG', 0, 'ZURUECK']);
}
{ // ein FEHLER ohne VERSUCH (z. B. vor dem Senden gescheitert) macht ein Fremdprodukt gleichen Handles NICHT zum eigenen
  const f = neueAttrappe(); const led = ledger();
  writeFileSync(led, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tFEHLER\t\tSKU-Suche kaputt\n`);
  f.legeProduktAn({ handle: tasse.handle, status: 'DRAFT', tags: [MARKER_TAG], kanaele: 0, skus: tasse.varianten.map((v) => v.sku) });
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('FEHLER ohne VERSUCH und ohne ID: ein gleichnamiges Produkt wird nicht übernommen (Exit 3, 0 Schreibaufrufe)', [r.exit, f.st.schreibaufrufe], [3, 0]);
  const led2 = ledger(); writeFileSync(led2, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tVERSUCH\t\tx\n`);
  const f2 = neueAttrappe(); f2.legeProduktAn({ handle: tasse.handle, status: 'DRAFT', tags: [MARKER_TAG], kanaele: 1, skus: tasse.varianten.map((v) => v.sku) });
  ist('VERSUCH, aber das Produkt steht in einem Verkaufskanal: nicht übernommen', (await lauf({ plaene: [tasse], gql: f2.gql, ledgerPfad: led2, ...L() })).exit, 3);
  const f3 = neueAttrappe(); f3.legeProduktAn({ handle: tasse.handle, status: 'DRAFT', tags: [MARKER_TAG], kanaele: 0, skus: [...tasse.varianten.map((v) => v.sku), 'FREMD_9'] });
  const led3 = ledger(); writeFileSync(led3, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tVERSUCH\t\tx\n`);
  ist('VERSUCH, aber eine SKU gehört nicht zum Plan: nicht übernommen', (await lauf({ plaene: [tasse], gql: f3.gql, ledgerPfad: led3, ...L() })).exit, 3);
}
{ // nach ZURUECK gilt ein früherer Versuch nicht mehr
  const f = neueAttrappe(); const led = ledger();
  writeFileSync(led, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tVERSUCH\t\tx\n2026-11-05T00:00:01Z\t${tasse.handle}\t19\tZURUECK\t\tnie angelegt\n`);
  ist('Ledger: ZURUECK nimmt «versucht» zurück', ledgerLesen(led).get(tasse.handle).versucht, false);
}
{ // productSet bekommt das längere Zeitlimit, Abfragen nicht
  const f = neueAttrappe(); const led = ledger();
  await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const i = f.st.aufrufe.findIndex((a) => /productSet/.test(a));
  ist('productSet läuft mit Zeitlimit 120 s, die Abfragen davor mit Vorgabe', [f.st.extras[i].timeoutMs, f.st.extras[0].timeoutMs ?? null], [120000, null]);
}
{ // Rücknahme: das Produkt wurde vom Besitzer umbenannt (Handle weg, ID noch da) → melden, nicht als «weg» verbuchen
  const f = neueAttrappe(); const led = ledger();
  await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const p = [...f.st.produkte.values()][0]; p.handle = 'vom-besitzer-umbenannt';
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme: umbenanntes Produkt → UMBENANNT (Exit 5), nicht gelöscht, Ledger bleibt OK', [r.ergebnisse[0].status, r.exit, f.st.produkte.size, ledgerLesen(led).get(tasse.handle).status], ['UMBENANNT', 5, 1, 'OK']);
  f.st.produkte.delete(p.id);
  ist('Rücknahme: Produkt samt ID wirklich weg → WEG, Ledger ZURUECK', [(await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, ledgerLesen(led).get(tasse.handle).status], ['WEG', 'ZURUECK']);
}
// ── Wiederaufnahme nur, solange das Produkt noch der eigene DRAFT ist
{
  const f = neueAttrappe({ netzfehlerBei: 'metafieldsSet' }); const led = ledger();
  await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const p = [...f.st.produkte.values()][0];
  f.setzeStatus(p.id, 'ACTIVE');
  const vor = f.st.schreibaufrufe;
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Produkt inzwischen ACTIVE: keine Wiederaufnahme (Exit 3), kein weiterer Schreibaufruf', [r.exit, f.st.schreibaufrufe - vor], [3, 0]);
  f.setzeStatus(p.id, 'DRAFT'); f.setzeTitel(p.id, 'Jemand hat den Titel geändert');
  ist('Titel von Dritten geändert: keine Wiederaufnahme (Exit 3)', (await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() })).exit, 3);
}
// ── Shopify ändert nach dem Anlegen etwas (hier: Preise +1): der Vergleich am Ende merkt es, das Ledger sagt nicht OK
{
  const f = neueAttrappe({ preisAufschlag: 1 }); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Preise nach dem Anlegen verändert: Abweichung (Exit 3) statt «OK»', [r.exit, r.ergebnisse[0].status, r.ergebnisse[0].liste.some((x) => /Preis/.test(x))], [3, 'ABWEICHUNG', true]);
  ist('… Ledger: FEHLER mit Grund, nicht OK', [[...ledgerLesen(led).values()][0].status, /Preis/.test([...ledgerLesen(led).values()][0].detail)], ['FEHLER', true]);
}
// ── Medien
{
  const f = neueAttrappe({ polls: 3 }); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Medien werden erst nach einigen Lesungen READY: der Lauf wartet', r.exit, 0);
}
{
  const f = neueAttrappe({ polls: 50 }); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L({ mediaPolls: 3 }) });
  ist('Medien nie READY: FEHLER, Produkt bleibt BEGONNEN (kein Verbinden vor READY)', [r.exit, r.ergebnisse[0].status, f.st.aufrufe.filter((a) => /productVariantAppendMedia/.test(a)).length], [1, 'FEHLER', 0]);
}
{
  const f = neueAttrappe({ mediaFehler: true }); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Medium FAILED: FEHLER mit Grund', [r.exit, /fehlgeschlagen/.test(r.ergebnisse[0].fehler)], [1, true]);
}
// ── Tageslimit, Budget, Lauf-Grenze
{
  const f = neueAttrappe({ tageslimit: true }); const led = ledger();
  const r = await lauf({ plaene: [tasse, cap], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Tageslimit: Exit 4, Lauf endet sofort, nichts im Shop', [r.exit, r.ergebnisse.length, f.st.produkte.size], [4, 1, 0]);
}
{
  const f = neueAttrappe(); const led = ledger();
  const r = await lauf({ plaene: [shirt], gql: f.gql, ledgerPfad: led, ...L({ variantenBudget: shirt.varianten.length - 1 }) });
  ist('Budget zu klein: Exit 4 VOR dem ersten Schreiben', [r.exit, r.ergebnisse[0].vorab, f.st.schreibaufrufe], [4, true, 0]);
  const r2 = await lauf({ plaene: [shirt], gql: f.gql, ledgerPfad: led, ...L({ variantenBudget: shirt.varianten.length }) });
  ist('Budget genau passend: läuft', r2.exit, 0);
}
{
  const f = neueAttrappe(); const led = ledger();
  const r = await lauf({ plaene: [tasse, cap, shirt], gql: f.gql, ledgerPfad: led, ...L({ maxProLauf: tasse.varianten.length + cap.varianten.length }) });
  ist('Lauf-Grenze: die ersten passen, das dritte bleibt für morgen (Exit 2)', [r.exit, r.ergebnisse.map((x) => x.status)], [2, ['OK', 'OK', 'RESTTAG']]);
  ist('Lauf-Grenze: im Shop stehen nur die ersten zwei', f.st.produkte.size, 2);
}
{
  const f = neueAttrappe(); const led = ledger();
  const r = await lauf({ plaene: [tasse, cap, shirt], gql: f.gql, ledgerPfad: led, ...L({ variantenBudget: tasse.varianten.length + cap.varianten.length }) });
  ist('Budget zählt über mehrere Produkte: das dritte scheitert vorab', [r.exit, f.st.produkte.size], [4, 2]);
}
// ── Gesperrte Pläne
{
  const f = neueAttrappe(); const led = ledger();
  const schlecht = { ...tasse, anlegbar: false, tore: [{ code: 'bilder', art: 'blocker', ergebnis: 'ungeprueft', grund: 'x' }] };
  const r = await lauf({ plaene: [schlecht, cap], gql: f.gql, ledgerPfad: led, ...L() });
  ist('gesperrter Plan wird nie angelegt, der gute schon; Exit 5', [r.ergebnisse.map((x) => x.status), r.exit, f.st.produkte.size], [['GESPERRT', 'OK'], 5, 1]);
}
// ── LIVE-Schutz
await wirft('Editor-Adresse fehlt', () => lauf({ plaene: [tasse], gql: neueAttrappe().gql, ledgerPfad: ledger(), editorUrl: '', log: still }), 'LSPOD_EDITOR_URL');
await wirft('Editor-Adresse mit http', () => lauf({ plaene: [tasse], gql: neueAttrappe().gql, ledgerPfad: ledger(), editorUrl: 'http://x/y.js', log: still }), 'https');
await wirft('Editor-Adresse ist der Platzhalter', () => lauf({ plaene: [tasse], gql: neueAttrappe().gql, ledgerPfad: ledger(), editorUrl: 'https://x/__LSPOD_EDITOR_URL__', log: still }), 'Platzhalter');
// ── Shopify schreibt die Beschreibung um (Skripte entfernt): Abweichung statt stillem «OK»
{
  const f = neueAttrappe({ entferneScripts: true }); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('Shopify entfernt <script> aus der Beschreibung: Abweichung (Exit 3) statt «OK»', [r.exit, r.ergebnisse[0].status], [3, 'ABWEICHUNG']);
  ist('… und das Ledger sagt FEHLER, nicht OK', [...ledgerLesen(led).values()][0].status, 'FEHLER');
}
{ // userError von Shopify
  const f = neueAttrappe({ userErrorBei: 'productSet' }); const led = ledger();
  const r = await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  ist('userError beim Anlegen: FEHLER, nichts im Shop', [r.exit, f.st.produkte.size], [1, 0]);
}
{ // drei Fehler in Folge → Abbruch
  const f = neueAttrappe({ userErrorBei: 'productSet' }); const led = ledger();
  const mk = (n) => ({ ...tasse, handle: `h${n}-selbst-gestalten` });
  const r = await lauf({ plaene: [mk(1), mk(2), mk(3), mk(4)], gql: f.gql, ledgerPfad: led, ...L() });
  ist('drei Fehler in Folge: Abbruch, viertes nicht versucht', [r.exit, r.ergebnisse.length], [1, 3]);
}
{ // nur: ONLY
  const f = neueAttrappe(); const led = ledger();
  const r = await lauf({ plaene: [tasse, cap], gql: f.gql, ledgerPfad: led, nur: [cap.handle], ...L() });
  ist('nur: bearbeitet nur den genannten Handle', [r.ergebnisse.length, [...f.st.produkte.values()][0].handle], [1, cap.handle]);
}

// ── Rücknahme
{
  const f = neueAttrappe(); const led = ledger();
  await lauf({ plaene: [tasse, cap], gql: f.gql, ledgerPfad: led, ...L() });
  const fremd = f.legeProduktAn({ handle: 'fremd-selbst-gestalten', status: 'DRAFT', tags: [MARKER_TAG], kanaele: 0 });
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme: beide Fabrik-Entwürfe gelöscht', [r.ergebnisse.map((x) => x.status), r.exit], [['GELOESCHT', 'GELOESCHT'], 0]);
  ist('Rücknahme: das fremde Produkt (nicht im Ledger) bleibt, obwohl DRAFT mit Marker-Tag', f.st.produkte.has(fremd.id), true);
  ist('Rücknahme: Ledger-Stand ZURUECK', [...ledgerLesen(led).values()].map((e) => e.status), ['ZURUECK', 'ZURUECK']);
  const r2 = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme ist wiederholbar (nichts mehr zu tun)', r2.ergebnisse.length, 0);
}
{
  const f = neueAttrappe(); const led = ledger();
  await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const p = [...f.st.produkte.values()][0];
  f.setzeStatus(p.id, 'ACTIVE');
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme: ein inzwischen aktives Produkt wird NIE gelöscht', [r.ergebnisse[0].status, f.st.produkte.size, r.exit], ['GESPERRT', 1, 5]);
  f.setzeStatus(p.id, 'DRAFT'); f.veroeffentliche(p.id, 1);
  ist('Rücknahme: ein veröffentlichtes (Kanal) Produkt wird nie gelöscht', (await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, 'GESPERRT');
  f.veroeffentliche(p.id, 0); p.tags = p.tags.filter((t) => t !== MARKER_TAG);
  ist('Rücknahme: ohne Marker-Tag nie', (await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, 'GESPERRT');
  p.tags.push(MARKER_TAG);
  const led2 = ledger(); writeFileSync(led2, `2026-11-05T00:00:00Z\t${tasse.handle}\t19\tOK\tgid://shopify/Product/9999\tx\n`);
  ist('Rücknahme: andere Produkt-ID als im Ledger → nie', (await zuruecknehmen({ gql: f.gql, ledgerPfad: led2, log: still })).ergebnisse[0].status, 'GESPERRT');
  ist('Rücknahme: gelöscht wird erst, wenn alles stimmt', (await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still })).ergebnisse[0].status, 'GELOESCHT');
  ist('Rücknahme nur für einen Handle (nur:)', (await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still, nur: ['gibt-es-nicht'] })).ergebnisse.length, 0);
}
{ // Rücknahme eines BEGONNEN-Produkts (Abbruch mitten drin)
  const f = neueAttrappe({ netzfehlerBei: 'metafieldsSet' }); const led = ledger();
  await lauf({ plaene: [tasse], gql: f.gql, ledgerPfad: led, ...L() });
  const r = await zuruecknehmen({ gql: f.gql, ledgerPfad: led, log: still });
  ist('Rücknahme räumt auch ein halb fertiges Produkt (BEGONNEN/FEHLER) weg', [r.ergebnisse[0].status, f.st.produkte.size], ['GELOESCHT', 0]);
}
ist('Ledger lesen: Datei fehlt → leer', ledgerLesen('/gibt/es/nicht.txt').size, 0);
ist('sollBeschreibung ersetzt beide Platzhalter', (() => { const s = sollBeschreibung(tasse, { ersteVarianteNr: 123, editorUrl: URL_EDITOR }); return [s.includes('data-variant="123"'), s.includes(URL_EDITOR), s.includes('__')]; })(), [true, true, false]);
ist('shopVariantenVon: nur Varianten des Plans, Nummer ohne gid, Wert = Printful-Variante aus dem Plan', shopVariantenVon(tasse, [{ id: 'gid://shopify/ProductVariant/77', sku: tasse.varianten[0].sku }, { id: 'gid://shopify/ProductVariant/78', sku: 'FREMD_1' }]), { 77: tasse.varianten[0].printfulVariantId });
ist('sollBeschreibung trägt die Abbildung ein (Platzhalter samt Anführungszeichen weg)', (() => { const s = sollBeschreibung(tasse, { ersteVarianteNr: 1, editorUrl: URL_EDITOR, shopVarianten: { 5: 9 } }); return [s.includes('"shop":{"varianten":{"5":9}}'), s.includes('__SHOP_VARIANTEN__')]; })(), [true, false]);
for (const d of tempOrdner) rmSync(d, { recursive: true, force: true });   // keine Wegwerf-Ordner im Temp-Verzeichnis zurücklassen
ende();
