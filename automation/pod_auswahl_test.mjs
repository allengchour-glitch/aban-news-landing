// Test des Kommandos pod_auswahl.mjs (Trockenlauf offline, Schutz von LIVE=1, Ausgabedateien). Kein Netz, keine Zugangsdaten:
// jeder Aufruf läuft mit LEERER Umgebung (nur PATH/HOME) und OFFLINE=1 bzw. ohne Shopify-Zugang – LIVE=1 kann hier nichts erreichen.
// Lauf: /opt/node22/bin/node automation/pod_auswahl_test.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';   // readdirSync: Testdateien des Bereichs suchen
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 500)}\n   soll: ${JSON.stringify(b).slice(0, 500)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const CLI = fileURLToPath(new URL('./pod_auswahl.mjs', import.meta.url));
const QUELLE = readFileSync(CLI, 'utf8');
const lauf = (env) => spawnSync(process.execPath, [CLI], { env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env }, encoding: 'utf8', timeout: 60000 });
const angelegt = [];
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'pod-cli-')); angelegt.push(d); return d; };   // alle Ordner werden am Ende entfernt (sonst bleiben sie in /tmp liegen)

// ── Trockenlauf offline
{
  const out = tmp();
  const r = lauf({ OFFLINE: '1', OUT: out });
  ist('Trockenlauf offline: Exit 0', r.status, 0);
  wahr('Trockenlauf: meldet «nichts geschrieben»', /nichts geschrieben/.test(r.stdout), r.stderr.slice(0, 200));
  wahr('Trockenlauf: 165 neue Varianten gemeldet', /165 neue Varianten/.test(r.stdout));
  ist('Trockenlauf: Dateien', ['plan.json', 'tabelle.md', 'tabelle.csv', 'nicht_angelegt.md', 'samsung_payload.json', 'beschreibungen'].map((f) => existsSync(join(out, f))), Array(6).fill(true));
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  ist('plan.json: Hash, fünf Produkte, Modus', [/^[0-9a-f]{64}$/.test(plan.hash), plan.produkte.length, plan.erzeugt.modus], [true, 5, 'Trockenlauf']);
  const md = readFileSync(join(out, 'tabelle.md'), 'utf8').split('\n');
  ist('tabelle.md: Spaltenkopf (zehn Spalten)', md[0], '| Produkt | Material | Grösse/Modell | SKU | Einkauf USD | Versand USD | Preis CHF | Netto-Gewinn CHF | Netto ohne Kundenversand CHF | Status |');
  ist('tabelle.md: 66 vorhandene + 165 neue Zeilen', md.filter((z) => z.startsWith('| ') && !z.startsWith('| Produkt')).length, 37 + 165);
  const sp = JSON.parse(readFileSync(join(out, 'samsung_payload.json'), 'utf8'));
  ist('samsung_payload.json: productSet DRAFT, 84 Varianten, Optionen', [sp.mutation, sp.input.status, sp.input.variants.length, sp.input.productOptions.map((o) => o.name)], ['productSet(synchronous:true)', 'DRAFT', 84, ['Material', 'Handymodell']]);
  wahr('Trockenlauf: Befund zum Hoodie in der Ausgabe', /BEFUND \[sku-anderes-produkt\]/.test(r.stdout));
  wahr('Trockenlauf: Befunde zu den doppelten Printful-Varianten (T-Shirt, Hoodie) und zu MagSafe in der Ausgabe', (r.stdout.match(/BEFUND \[sku-in-anderem-produkt\]/g) || []).length === 2 && /BEFUND \[magsafe-irrefuehrend\]/.test(r.stdout));
  wahr('Trockenlauf: Hinweise zu Netto ohne Kundenversand, Preisleiter und Text ausserhalb des Blocks', ['netto-nur-mit-kundenversand', 'preisleiter-nicht-monoton', 'text-ausserhalb-block'].every((c) => r.stdout.includes('[' + c + ']')));
  wahr('Trockenlauf: nennt die Quelle des SKU-Index', /SKU-Index: Datenpaket \(Stand 2026-10-27\)/.test(r.stdout));
  ist('Trockenlauf: vier Blocker-Befunde sperren LIVE (Hoodie 2, T-Shirt 1, iPhone 1)', plan.produkte.flatMap((p) => p.befunde.filter((b) => b.schwere === 'blocker').map((b) => p.handle.slice(0, 12) + ':' + b.code)).sort(), ['hardcase-iph:magsafe-irrefuehrend', 'unisex-hoodi:sku-anderes-produkt', 'unisex-hoodi:sku-in-anderem-produkt', 'unisex-t-shi:sku-in-anderem-produkt']);
  { const md2 = readFileSync(join(out, 'nicht_angelegt.md'), 'utf8');
    wahr('nicht_angelegt.md: Bestätigungsbefehl je Blocker-Befund (handle:code)', md2.includes('BEFUND_OK=unisex-hoodie-selbst-gestalten:sku-anderes-produkt') && md2.includes('BEFUND_OK=unisex-t-shirt-selbst-gestalten:sku-in-anderem-produkt') && md2.includes('BEFUND_OK=hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten:magsafe-irrefuehrend'));
    wahr('nicht_angelegt.md: die fünf Katalog-Lücken des Posters stehen drin', ['Foto-Glanzpapier / 70×100 cm', 'Leinwand / A2 (42×59,4 cm)', 'Gerahmt · Schwarz / 70×100 cm', 'Gerahmt · Weiss / 70×100 cm', 'Gerahmt · Eiche / 70×100 cm'].every((t) => md2.includes('nicht angelegt: ' + t))); }
  wahr('nicht_angelegt.md nennt den Befund und die ausgelassenen Varianten', /sku-anderes-produkt/.test(readFileSync(join(out, 'nicht_angelegt.md'), 'utf8')) && /Printful 9358/.test(readFileSync(join(out, 'nicht_angelegt.md'), 'utf8')));
  const out2 = tmp(); lauf({ OFFLINE: '1', OUT: out2 });
  ist('Trockenlauf: zweiter Lauf liefert denselben Hash', JSON.parse(readFileSync(join(out2, 'plan.json'), 'utf8')).hash, plan.hash);
  rmSync(out, { recursive: true, force: true }); rmSync(out2, { recursive: true, force: true });
}
// ── ONLY
{
  const out = tmp(); const r = lauf({ OFFLINE: '1', OUT: out, ONLY: 'unisex-t-shirt-selbst-gestalten' });
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  ist('ONLY: nur das T-Shirt', [r.status, plan.produkte.map((p) => p.handle), existsSync(join(out, 'samsung_payload.json'))], [0, ['unisex-t-shirt-selbst-gestalten'], false]);
  rmSync(out, { recursive: true, force: true });
  const r2 = lauf({ OFFLINE: '1', OUT: tmp(), ONLY: 'gibt-es-nicht' });
  ist('ONLY mit unbekanntem Handle: Exit 1 und Hinweis', [r2.status, /unbekannte Handles/.test(r2.stderr)], [1, true]);
}
// ── OHNE=handle:Material
{
  const out = tmp(); const r = lauf({ OFFLINE: '1', OUT: out, OHNE: 'unisex-t-shirt-selbst-gestalten:Klassische Baumwolle, unisex-hoodie-selbst-gestalten:Premium-Baumwolle' });
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  ist('OHNE: Exit 0, 151 neue Varianten (165 − 8 − 6), keine Kollisions-Blocker, Hash anders', [r.status, /151 neue Varianten/.test(r.stdout), plan.produkte.flatMap((p) => p.befunde).filter((b) => b.code === 'sku-in-anderem-produkt').length, /OHNE: unisex-t-shirt-selbst-gestalten:Klassische Baumwolle/.test(r.stdout)], [0, true, 0, true]);
  const r2 = lauf({ OFFLINE: '1', OUT: tmp(), OHNE: 'unisex-t-shirt-selbst-gestalten' });
  ist('OHNE ohne «:Material»: Exit 1 mit Hinweis', [r2.status, /nicht von der Form handle:Material/.test(r2.stderr), /ENDE: Exit 1/.test(r2.stderr)], [1, true, true]);
  const r3 = lauf({ OFFLINE: '1', OUT: tmp(), OHNE: 'unisex-t-shirt-selbst-gestalten:Seide' });
  ist('OHNE mit unbekanntem Material: Exit 1', [r3.status, /kein Material von/.test(r3.stderr)], [1, true]);
  const r4 = lauf({ OFFLINE: '1', OUT: tmp(), OHNE: 'unisex-t-shirt-selbst-gestalten:Ringgarn-Baumwolle' });
  ist('OHNE auf das vorhandene Material: Exit 1', [r4.status, /vorhandene Material/.test(r4.stderr)], [1, true]);
  const { parseOhne } = await import(CLI);
  ist('parseOhne: Leerzeichen und «·» im Material erlaubt, leer → []', [parseOhne('a:Gerahmt · Eiche , b:X'), parseOhne(''), parseOhne(undefined)], [[{ handle: 'a', material: 'Gerahmt · Eiche' }, { handle: 'b', material: 'X' }], [], []]);
}
// ── DATEN=skuindex braucht Shopify-Zugang und schreibt sonst nichts
{
  const r = lauf({ DATEN: 'skuindex', DATEN_DIR: tmp() });
  ist('DATEN=skuindex ohne Zugangsdaten: Exit 1, kein Netz', [r.status, /Zugangsdaten/.test(r.stderr)], [1, true]);
}
// ── Schutz von LIVE=1
{
  const r = lauf({ LIVE: '1', OFFLINE: '1', OUT: tmp() });
  ist('LIVE=1 mit OFFLINE=1: Exit 1, Widerspruch benannt', [r.status, /widersprechen/.test(r.stderr)], [1, true]);
  const r2 = lauf({ LIVE: '1', OUT: tmp() });
  ist('LIVE=1 ohne Shopify-Zugang: Exit 1, nichts gelesen/geschrieben', [r2.status, /Zugangsdaten/.test(r2.stderr), /Trockenlauf fertig/.test(r2.stdout)], [1, true, false]);
  const r3 = lauf({ LIVE: '1', OUT: tmp(), SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' });
  ist('LIVE=1 mit leeren Zugangsdaten: Exit 1', r3.status, 1);
}
// ── Aufbau der Quelle: Schreibzugriffe nur über die Schreibbibliothek, hinter dem LIVE-Tor
{
  wahr('Kommando enthält selbst keinen GraphQL-Mutationstext (die steht nur in lib/pod_auswahl_schreiben.mjs)', !/[`'"]\s*mutation[\s(]/.test(QUELLE) && !/gql\(\s*M_/.test(QUELLE));
  const iLauf = QUELLE.indexOf('await lauf({'), iTor = QUELLE.indexOf('if (!LIVE) {'), iHash = QUELLE.indexOf('geprueft.hash !== plan.hash');
  wahr('lauf() steht NACH dem Trockenlauf-Rückgabe und NACH der Hash-Prüfung des geprüften Plans', iTor > 0 && iHash > iTor && iLauf > iHash, `${iTor} ${iHash} ${iLauf}`);
  ist('lauf() wird genau einmal aufgerufen', QUELLE.split('await lauf({').length - 1, 1);
  wahr('Mutationen laufen über lib/pod_auswahl_gql.mjs (keine stille Wiederholung): das Kommando ruft shopifyGql nur für die Anmelde-Probe «{ shop { name } }» selbst auf', QUELLE.includes('gqlFuer({ shop: SHOP') && (QUELLE.match(/shopifyGql\(/g) || []).length === 1 && QUELLE.includes("shopifyGql(SHOP, API, t, '{ shop { name } }'"));
  wahr('Exit-Code des Laufs wird durchgereicht, die Zusammenfassung steht VOR process.exit (letzte Zeilen der Ausgabe)', QUELLE.indexOf('zusammenfassung(res)') > 0 && QUELLE.indexOf('zusammenfassung(res)') < QUELLE.indexOf('process.exit(res.exit)'));
  wahr('printful_reprice.mjs überspringt die «Selbst gestalten»-Produkte (Schutz gegen das Absenken der neuen Preise)', (() => { const q = readFileSync(fileURLToPath(new URL('./printful_reprice.mjs', import.meta.url)), 'utf8'); return q.includes("from './lib/pod_auswahl_spec.mjs'") && q.includes('AUSWAHL.has(p.handle)') && /AUCH_AUSWAHL/.test(q) && /edges\{ node\{ id handle title/.test(q); })());
  wahr('Plan-Modul, Preis-Modul, Spezifikation und Datenmodul enthalten keine Schreib-Mutation', ['lib/pod_auswahl_plan.mjs', 'lib/pod_preise.mjs', 'lib/pod_auswahl_spec.mjs', 'lib/pod_auswahl_daten.mjs', 'lib/printful_platzierung.mjs'].every((f) => !/mutation\s*\(|productSet|BulkCreate|metafieldsSet|productUpdate/.test(readFileSync(fileURLToPath(new URL('./' + f, import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))));
  wahr('einziger POST des Datenmoduls ist /shipping/rates (reine Berechnung)', (readFileSync(fileURLToPath(new URL('./lib/pod_auswahl_daten.mjs', import.meta.url)), 'utf8').match(/method: '(POST|PUT|DELETE|PATCH)'/g) || []).length === 1);
  ist('Datenmodul: POST geht nur an die Versandberechnung', /fetchFn\('https:\/\/api\.printful\.com\/shipping\/rates', \{ method: 'POST'/.test(readFileSync(fileURLToPath(new URL('./lib/pod_auswahl_daten.mjs', import.meta.url)), 'utf8')), true);
}

// ── CI: jede Testdatei dieses Bereichs läuft im Workflow, die Daten stehen in der sparse-checkout-Liste (sonst fehlen sie im frischen Checkout)
{
  const yml = fileURLToPath(new URL('../.github/workflows/luxestyle-automation-tests.yml', import.meta.url));
  if (!existsSync(yml)) console.log('(.github/workflows/luxestyle-automation-tests.yml nicht im Checkout → CI-Prüfung übersprungen)');
  else {
    const t = readFileSync(yml, 'utf8');
    const lib = readdirSync(fileURLToPath(new URL('./lib', import.meta.url))).filter((f) => /^(pod_preise|pod_auswahl_\w+|printful_platzierung)_test\.mjs$/.test(f)).map((f) => 'automation/lib/' + f);
    wahr('Es gibt die erwarteten sechs Test-Dateien in lib', lib.length === 6, lib.join(','));
    for (const f of [...lib, 'automation/pod_auswahl_test.mjs', 'automation/pod_auswahl_mutation.mjs']) wahr(`CI führt ${f} aus`, new RegExp('node ' + f.replace(/\./g, '\\.') + '\\s*$', 'm').test(t));
    for (const f of ['automation/pod_auswahl.mjs', 'automation/printful_sync.mjs']) wahr(`CI prüft die Syntax von ${f}`, t.includes('node --check ' + f));
    wahr('sparse-checkout nennt dropship/pod-auswahl', /sparse-checkout: \|[\s\S]*?\n\s+dropship\/pod-auswahl\n/.test(t));
    wahr('Workflow startet bei Änderungen an dropship/pod-auswahl', /paths:[\s\S]*?- 'dropship\/pod-auswahl\/\*\*'/.test(t));
    const anzahl = (readFileSync(fileURLToPath(new URL('./pod_auswahl_mutation.mjs', import.meta.url)), 'utf8').match(/^  \{ name: /gm) || []).length;
    wahr(`Der Schrittname im Workflow nennt die Zahl der Mutanten (${anzahl})`, t.includes(`(${anzahl} absichtliche Fehler`), String(anzahl));
  }
}

for (const d of angelegt) rmSync(d, { recursive: true, force: true });
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
