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
const tmp = () => mkdtempSync(join(tmpdir(), 'pod-cli-'));

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
  ist('tabelle.md: Spaltenkopf', md[0], '| Produkt | Material | Grösse/Modell | SKU | Einkauf USD | Versand USD | Preis CHF | Netto-Gewinn CHF | Status |');
  ist('tabelle.md: 66 vorhandene + 165 neue Zeilen', md.filter((z) => z.startsWith('| ') && !z.startsWith('| Produkt')).length, 37 + 165);
  const sp = JSON.parse(readFileSync(join(out, 'samsung_payload.json'), 'utf8'));
  ist('samsung_payload.json: productSet DRAFT, 84 Varianten, Optionen', [sp.mutation, sp.input.status, sp.input.variants.length, sp.input.productOptions.map((o) => o.name)], ['productSet(synchronous:true)', 'DRAFT', 84, ['Material', 'Handymodell']]);
  wahr('Trockenlauf: Befund zum Hoodie in der Ausgabe', /BEFUND \[sku-anderes-produkt\]/.test(r.stdout));
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
    wahr('Es gibt die erwarteten fünf Test-Dateien in lib', lib.length === 5, lib.join(','));
    for (const f of [...lib, 'automation/pod_auswahl_test.mjs', 'automation/pod_auswahl_mutation.mjs']) wahr(`CI führt ${f} aus`, new RegExp('node ' + f.replace(/\./g, '\\.') + '\\s*$', 'm').test(t));
    for (const f of ['automation/pod_auswahl.mjs', 'automation/printful_sync.mjs']) wahr(`CI prüft die Syntax von ${f}`, t.includes('node --check ' + f));
    wahr('sparse-checkout nennt dropship/pod-auswahl', /sparse-checkout: \|[\s\S]*?\n\s+dropship\/pod-auswahl\n/.test(t));
    wahr('Workflow startet bei Änderungen an dropship/pod-auswahl', /paths:[\s\S]*?- 'dropship\/pod-auswahl\/\*\*'/.test(t));
    const anzahl = (readFileSync(fileURLToPath(new URL('./pod_auswahl_mutation.mjs', import.meta.url)), 'utf8').match(/^  \{ name: /gm) || []).length;
    wahr(`Der Schrittname im Workflow nennt die Zahl der Mutanten (${anzahl})`, t.includes(`(${anzahl} absichtliche Fehler`), String(anzahl));
  }
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
