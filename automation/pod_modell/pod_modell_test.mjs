// Tests für pod_modell.mjs (kein Netz): Trockenlauf, LIVE-Schutz, Rücknahme. Eingaben in einem Temp-Ordner, Shopify = Attrappe.
// Lauf: /opt/node22/bin/node automation/pod_modell/pod_modell_test.mjs
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, verwendeteAusAbgleich, bestandAusMatrix, schaetzungAus, tabelleMarkdown, planDatei, modelleAusOrdner } from './pod_modell.mjs';
import { neueAttrappe } from './fake_shopify.mjs';
import { lade, versand, versandAufgeloest, testUebersetzung, bilderFuer, neuerTest } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('pod_modell');
const wurzel = mkdtempSync(join(tmpdir(), 'pm-'));
const KAT = join(wurzel, 'katalog'), UE = join(wurzel, 'ue'); mkdirSync(KAT); mkdirSync(UE);
const bilder = {};
for (const id of [19, 206, 574]) { const k = lade(id); writeFileSync(join(KAT, `${id}.json`), JSON.stringify({ ...k, geholt: '2026-11-05T10:00:00Z' })); Object.assign(bilder, bilderFuer(k)); if (id !== 574) writeFileSync(join(UE, `${id}.json`), JSON.stringify(testUebersetzung(k).u)); }
const VERS = join(wurzel, 'versand.json'); writeFileSync(VERS, JSON.stringify({ 19: versandAufgeloest(lade(19)), 206: versandAufgeloest(lade(206), versand('10.39', 6, 9)), 574: versandAufgeloest(lade(574)) }));
const BIL = join(wurzel, 'bilder.json'); writeFileSync(BIL, JSON.stringify(bilder));
const LOG = []; const log = (...a) => LOG.push(a.join(' '));
const basisEnv = (extra = {}) => ({ KATALOG_DIR: KAT, VERSAND: VERS, UEBERSETZUNGEN: UE, BILDER: BIL, STUFEN: '1', START: '2026-11-06', ...extra });
const JETZT = '2026-11-05T12:00:00Z';
const deps = (extra = {}) => ({ log, jetzt: () => JETZT, mtime: () => Date.parse('2026-11-05T11:00:00Z'), ...extra });

// ── Trockenlauf
const OUT = join(wurzel, 'out');
let code = await main(basisEnv({ OUT, MODELLE: '19,206,574' }), deps());
ist('Trockenlauf: Exit 0', code, 0);
ist('Trockenlauf: Dateien je Modell, plan.json, tabelle.md, chargen.json', readdirSync(OUT).sort(), ['19.json', '206.json', '574.json', 'chargen.json', 'plan.json', 'tabelle.md']);
const pl = JSON.parse(readFileSync(join(OUT, 'plan.json'), 'utf8'));
ist('plan.json: drei Pläne und ein Hash', [pl.plaene.length, /^[0-9a-f]{64}$/.test(pl.hash)], [3, true]);
ist('574 (Schuh) ist gesperrt, 19 und 206 anlegbar', pl.plaene.map((p) => p.anlegbar), [true, true, false]);
const tab = readFileSync(join(OUT, 'tabelle.md'), 'utf8');
wahr('Tabelle nennt Modell, Klasse und den Grund des gesperrten Schuhs', /\| 574 \|/.test(tab) && /klasse: Klasse UNGEEIGNET/.test(tab));
wahr('Tabelle: Kopfzeile mit Tore und Hinweisen', /Tore \(Blocker\)/.test(tab) && /Hinweise \(blockieren nicht\)/.test(tab));
const ch = JSON.parse(readFileSync(join(OUT, 'chargen.json'), 'utf8'));
ist('Chargen: ein Tag, nur die anlegbaren, Startdatum aus START', [ch.tage.length, ch.tage[0].tag, ch.tage[0].handles.length], [1, '2026-11-06', 2]);
ist('Trockenlauf schreibt NICHTS ausser nach OUT (kein Ledger)', existsSync(join(wurzel, 'ledger.txt')), false);
ist('Plan-Hash ist von der Uhr unabhängig', JSON.parse(readFileSync(join(OUT, 'plan.json'), 'utf8')).hash, planDatei(pl.plaene, {}).hash);
ist('Pflichtangaben fehlen → Exit 1', await main({}, deps()), 1);
ist('Modelle ohne Katalogdatei: gesperrt mit Tor, kein Absturz', await main(basisEnv({ OUT: join(wurzel, 'o2'), MODELLE: '19,99999' }), deps()), 0);
ist('… Plan-Eintrag trägt das Tor «katalog»', JSON.parse(readFileSync(join(wurzel, 'o2', 'plan.json'), 'utf8')).plaene[1].tore[0].code, 'katalog');
ist('modelleAusOrdner: alle Nummern sortiert', modelleAusOrdner(KAT), [19, 206, 574]);
code = await main(basisEnv({ OUT: join(wurzel, 'o3'), MODELLE: '19', ABGLEICH: (() => { const f = join(wurzel, 'abgleich.json'); writeFileSync(f, JSON.stringify({ zeilen: [{ katalog_produkte: [{ id: 19 }], produkte_aus_variant_ids: [19] }] })); return f; })() }), deps());
ist('ABGLEICH: Modell 19 steckt schon in einem Produkt → gesperrt', JSON.parse(readFileSync(join(wurzel, 'o3', '19.json'), 'utf8')).tore.find((t) => t.code === 'modell_neu').ergebnis, 'durchgefallen');
code = await main(basisEnv({ OUT: join(wurzel, 'o4'), MODELLE: '19', BESTAND: (() => { const f = join(wurzel, 'matrix.json'); writeFileSync(f, JSON.stringify([{ handle: 'weisse-glaenzende-tasse-selbst-gestalten', titel: 'Weisse glänzende Tasse – Selbst gestalten', varianten: [{ sku: 'X_1' }] }])); return f; })() }), deps());
ist('BESTAND: Handle und Titel der heutigen Produkte werden gemieden', (() => { const p = JSON.parse(readFileSync(join(wurzel, 'o4', '19.json'), 'utf8')); return [p.handle !== 'weisse-glaenzende-tasse-selbst-gestalten', p.titelUnterscheidung === 'modellnummer']; })(), [true, true]);
{ const f = join(wurzel, 'sch.json'); writeFileSync(f, JSON.stringify({ vid: { 1320: { zwischensumme: 99 } } })); await main(basisEnv({ OUT: join(wurzel, 'o5'), MODELLE: '19', SCHAETZUNG: f }), deps());
  ist('SCHAETZUNG wird gelesen und gilt für die genannte Variante', JSON.parse(readFileSync(join(wurzel, 'o5', '19.json'), 'utf8')).varianten.find((v) => v.printfulVariantId === 1320)?.ekQuelle, 'schaetzung'); }

// ── Hilfsfunktionen
ist('verwendeteAusAbgleich', [...verwendeteAusAbgleich({ zeilen: [{ katalog_produkte: [{ id: 1 }], produkte_aus_variant_ids: [2] }, {}] })].sort(), [1, 2]);
ist('bestandAusMatrix', (() => { const b = bestandAusMatrix([{ handle: 'h', titel: 'T', varianten: [{ sku: 'a' }, {}] }]); return [[...b.handles], [...b.skus], [...b.titel]]; })(), [['h'], ['a'], ['T']]);
ist('schaetzungAus: beide Formen, Fehler werden ignoriert', schaetzungAus({ vid: { 5: { zwischensumme: 24.25 }, 6: { fehler: 'x', zwischensumme: 1 }, 7: { gesamt: 3 } } }), { 5: 24.25 });
ist('schaetzungAus: schlichte Zuordnung', schaetzungAus({ 5: 3.5 }), { 5: 3.5 });
wahr('tabelleMarkdown: eine Zeile je Plan plus Kopf', tabelleMarkdown(pl.plaene).trim().split('\n').length === 2 + 3);

// ── LIVE-Schutz
const led = join(wurzel, 'led', 'ledger.txt');
const fake = neueAttrappe();
const liveEnv = (extra = {}) => basisEnv({ LIVE: '1', MODELLE: '19,206', PLAN: join(wurzel, 'out2', 'plan.json'), LEDGER: led, LSPOD_EDITOR_URL: 'https://cdn.shopify.com/s/x/lspod-v6.js', ...extra });
const liveDeps = (extra = {}) => deps({ gqlHolen: async () => fake.gql, ...extra });
await main(basisEnv({ OUT: join(wurzel, 'out2'), MODELLE: '19,206' }), deps());
ist('LIVE ohne PLAN: Exit 1, nichts geschrieben', [await main(liveEnv({ PLAN: '' }), liveDeps()), fake.st.schreibaufrufe], [1, 0]);
ist('LIVE mit nicht vorhandenem PLAN: Exit 1', await main(liveEnv({ PLAN: join(wurzel, 'gibt-es-nicht.json') }), liveDeps()), 1);
{ const f = join(wurzel, 'out2', 'plan.json'); const p = JSON.parse(readFileSync(f, 'utf8')); const alt = p.hash; p.hash = '0'.repeat(64); writeFileSync(f, JSON.stringify(p)); ist('LIVE mit verändertem Plan-Hash: Exit 3, nichts geschrieben', [await main(liveEnv(), liveDeps()), fake.st.schreibaufrufe], [3, 0]); p.hash = alt; writeFileSync(f, JSON.stringify(p)); }
ist('LIVE mit zu alten Daten (Versanddatei 100 h alt): Exit 1', await main(liveEnv(), liveDeps({ mtime: () => Date.parse('2026-11-01T00:00:00Z') })), 1);
ist('LIVE mit zu altem Katalog (geholt vor 5 Tagen): Exit 1', await main(liveEnv(), deps({ gqlHolen: async () => fake.gql, jetzt: () => '2026-11-10T12:00:00Z', mtime: () => Date.parse('2026-11-10T11:00:00Z') })), 1);
ist('LIVE ohne LEDGER: Exit 1', await main(liveEnv({ LEDGER: '' }), liveDeps()), 1);
ist('LIVE ohne Editor-Adresse: Exit 1', await main(liveEnv({ LSPOD_EDITOR_URL: '' }), liveDeps()), 1);
ist('LIVE mit http-Editor-Adresse: Exit 1', await main(liveEnv({ LSPOD_EDITOR_URL: 'http://x/y.js' }), liveDeps()), 1);
ist('bis hierher wurde nichts geschrieben', fake.st.schreibaufrufe, 0);
ist('LIVE mit anderer Modellauswahl als im geprüften Plan: Exit 3', await main(liveEnv({ MODELLE: '19' }), liveDeps()), 3);
code = await main(liveEnv(), liveDeps());
ist('LIVE mit geprüftem Plan: Exit 0, zwei Entwürfe im Shop', [code, fake.st.produkte.size, [...fake.st.produkte.values()].every((p) => p.status === 'DRAFT' && p.kanaele === 0)], [0, 2, true]);
ist('LIVE: Ledger und Sicherung des Plans', [existsSync(led), existsSync(join(wurzel, 'led', 'sicherung'))], [true, true]);
ist('LIVE nochmal: Exit 0, nichts doppelt', [await main(liveEnv(), liveDeps()), fake.st.produkte.size], [0, 2]);
ist('LIVE mit ONLY: nur der genannte Handle (schon im Ledger → übersprungen)', await main(liveEnv({ ONLY: 'x-selbst-gestalten' }), liveDeps()), 0);

// ── Rücknahme
ist('ZURUECK ohne LIVE löscht nichts', [await main(basisEnv({ ZURUECK: '1', LEDGER: led }), liveDeps()), fake.st.produkte.size], [0, 2]);
ist('ZURUECK ohne LEDGER: Exit 1', await main(basisEnv({ ZURUECK: '1', LIVE: '1' }), liveDeps()), 1);
ist('ZURUECK mit LIVE: beide Fabrik-Entwürfe weg', [await main(basisEnv({ ZURUECK: '1', LIVE: '1', LEDGER: led }), liveDeps()), fake.st.produkte.size], [0, 0]);

rmSync(wurzel, { recursive: true, force: true });   // keine Wegwerf-Ordner im Temp-Verzeichnis zurücklassen
ende();
