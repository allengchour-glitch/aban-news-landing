// Test des Kommandos pod_auswahl.mjs (Trockenlauf offline, Schutz von LIVE=1, Ausgabedateien). Kein Netz, keine Zugangsdaten:
// jeder Aufruf läuft mit LEERER Umgebung (nur PATH/HOME) und OFFLINE=1 bzw. ohne Shopify-Zugang – LIVE=1 kann hier nichts erreichen.
// Lauf: /opt/node22/bin/node automation/pod_auswahl_test.mjs
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';   // readdirSync: Testdateien des Bereichs suchen
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 500)}\n   soll: ${JSON.stringify(b).slice(0, 500)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);

const CLI = fileURLToPath(new URL('./pod_auswahl.mjs', import.meta.url));
const QUELLE = readFileSync(CLI, 'utf8');
// DATEN_MAX_ALTER_H gross: das Datenpaket trägt den Stand 27.10.2026, LIVE verweigert Daten über 72 Stunden. Ohne diese Vorgabe würden die Tests mit der Zeit rot, ohne dass sich am Code etwas ändert;
// der Altersschutz selbst wird unten gezielt geprüft (mit einer Katalogdatei vom Jahr 2000, die zu JEDEM Zeitpunkt zu alt ist).
const lauf = (env) => spawnSync(process.execPath, [CLI], { env: { PATH: process.env.PATH, HOME: process.env.HOME, DATEN_MAX_ALTER_H: '1000000', ...env }, encoding: 'utf8', timeout: 60000 });
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
  ist('Trockenlauf: sieben Blocker-Befunde sperren LIVE (Poster 1, Hoodie 3, T-Shirt 1, iPhone 2; nur Samsung ist frei)', plan.produkte.flatMap((p) => p.befunde.filter((b) => b.schwere === 'blocker').map((b) => p.handle.slice(0, 12) + ':' + b.code)).sort(),
    ['hardcase-iph:magsafe-irrefuehrend', 'hardcase-iph:material-metafeld', 'poster-zum-s:material-metafeld', 'unisex-hoodi:material-metafeld', 'unisex-hoodi:sku-anderes-produkt', 'unisex-hoodi:sku-in-anderem-produkt', 'unisex-t-shi:sku-in-anderem-produkt']);
  wahr('Trockenlauf: Metafeld-Befund in der Ausgabe', (r.stdout.match(/BEFUND \[material-metafeld\]/g) || []).length === 3);
  { const md2 = readFileSync(join(out, 'nicht_angelegt.md'), 'utf8');
    wahr('nicht_angelegt.md: Bestätigungsbefehl je Blocker-Befund (handle:code), auch für das Metafeld «Material»', md2.includes('BEFUND_OK=poster-zum-selbstgestalten:material-metafeld') && md2.includes('BEFUND_OK=unisex-hoodie-selbst-gestalten:sku-anderes-produkt') && md2.includes('BEFUND_OK=unisex-t-shirt-selbst-gestalten:sku-in-anderem-produkt') && md2.includes('BEFUND_OK=hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten:magsafe-irrefuehrend'));
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
// ── Altersschutz der Printful-Daten (Befund 11): LIVE verweigert veraltete Daten, der Trockenlauf warnt nur
{
  const d = tmp(); const kat = JSON.parse(readFileSync(new URL('../dropship/pod-auswahl/katalog.json', import.meta.url), 'utf8'));
  const alt = join(d, 'katalog_alt.json'); writeFileSync(alt, JSON.stringify({ ...kat, stand: '2000-01-01' }));
  const r = lauf({ LIVE: '1', OUT: tmp(), KATALOG: alt, DATEN_MAX_ALTER_H: '72' });
  ist('LIVE=1 mit Katalog vom Jahr 2000: Exit 1, nennt Datei und Stand, verweist auf DATEN=holen, schreibt/liest nichts', [r.status, /LIVE=1 verweigert: Printful-Daten zu alt \(katalog\.json: Stand 2000-01-01/.test(r.stderr), /DATEN=holen/.test(r.stderr), /ENDE: Exit 1/.test(r.stderr), /Trockenlauf fertig/.test(r.stdout)], [1, true, true, true, false]);
  const r2 = lauf({ OFFLINE: '1', OUT: tmp(), KATALOG: alt, DATEN_MAX_ALTER_H: '72' });
  ist('Trockenlauf mit demselben Katalog: Exit 0, aber Warnung (LIVE würde verweigert)', [r2.status, /⚠️ Printful-Daten älter als 72 Stunden \(katalog\.json/.test(r2.stdout), /Trockenlauf fertig/.test(r2.stdout)], [0, true, true]);
  const r3 = lauf({ LIVE: '1', OUT: tmp(), KATALOG: alt, DATEN_MAX_ALTER_H: '1000000' });
  ist('LIVE=1 mit ausdrücklich grosser Grenze: das Alter verweigert nicht mehr (es fehlt dann nur der Shopify-Zugang)', [r3.status, /Zugangsdaten/.test(r3.stderr), /zu alt/.test(r3.stderr)], [1, true, false]);
  const r4 = lauf({ OFFLINE: '1', OUT: tmp(), DATEN_MAX_ALTER_H: 'abc' });
  ist('DATEN_MAX_ALTER_H keine Zahl: Exit 1', [r4.status, /DATEN_MAX_ALTER_H: «abc» ist keine Zahl/.test(r4.stderr)], [1, true]);
  const r5 = lauf({ OFFLINE: '1', OUT: tmp(), VARIANT_BUDGET: '-3' });
  ist('VARIANT_BUDGET negativ: Exit 1', [r5.status, /VARIANT_BUDGET: «-3» ist keine Zahl/.test(r5.stderr)], [1, true]);
  const { parseZahl } = await import(CLI);
  ist('parseZahl: leer → Vorgabe, Zahl, 0 erlaubt bei min 0', [parseZahl('X', undefined, { leer: 5 }), parseZahl('X', '', { leer: 5 }), parseZahl('X', ' 12 ', { leer: null }), parseZahl('X', '0', { leer: null, min: 0 })], [5, 5, 12, 0]);
  rmSync(d, { recursive: true, force: true });
}
// ── DATEN=holen frischt ALLES auf (Befund 11): die Versandraten werden nicht aus der alten Datei übernommen, sonst wäre der Stand «heute» gelogen und der Altersschutz wertlos.
// Der Kindprozess bekommt ein gefälschtes fetch (--import): kein Netz, nur lesende Anfragen an Printful (GET, POST /shipping/rates = Berechnung) und Shopify (Abfragen).
{
  const d = tmp();
  const stub = join(d, 'stub.mjs');
  writeFileSync(stub, `
const j = (status, body) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, json: async () => body, text: async () => JSON.stringify(body) });
globalThis.fetch = async (url, o = {}) => {
  url = String(url);
  if (url.includes('api.printful.com/products/variant/')) { const id = Number(url.split('/').pop()); return j(200, { result: { variant: { id, name: 'v' + id, size: 'S', color: 'White', price: '10.00', in_stock: true }, product: { id: 146, type: 'T-SHIRT' } } }); }
  if (url.includes('api.printful.com/products/')) { const pid = Number(url.split('/').pop()); return j(200, { result: { product: { id: pid, title: 'P' + pid, type: 'POSTER', description: 'd', files: [{ id: 'default', title: 'Print file' }, { id: 'preview', title: 'Mockup' }] }, variants: [{ id: pid * 1000 + 1, name: 'a', size: 'S', color: 'White', price: '10.00', in_stock: true, availability_status: [{ region: 'EU', status: 'in_stock' }] }] } }); }
  if (url.includes('api.printful.com/shipping/rates')) return j(200, { result: [{ id: 'STANDARD', name: 'Flat', rate: '9.99', minDeliveryDays: 3, maxDeliveryDays: 6 }] });
  if (url.includes('myshopify.com') && url.includes('graphql')) {
    const b = JSON.parse(o.body), q = b.query;
    if (q.includes('shop {')) return j(200, { data: { shop: { name: 'x' } } });
    if (q.includes('productByIdentifier')) return j(200, { data: { productByIdentifier: { id: 'gid://shopify/Product/1', handle: b.variables.h, title: 'T', status: 'ACTIVE', productType: 'x', vendor: 'V', tags: [], descriptionHtml: '', seo: { title: null, description: null }, materialMetafeld: null,
      options: [{ name: 'Grösse', position: 1, values: ['S'] }], variants: { edges: [{ node: { id: 'v', sku: '1726823_5426', price: '10.00', inventoryPolicy: 'CONTINUE', selectedOptions: [{ name: 'Grösse', value: 'S' }] } }] } } } });
    if (q.includes('products(first')) return j(200, { data: { products: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [] } } });
  }
  throw new Error('unerwartete Anfrage: ' + url);
};`);
  const out = join(d, 'paket'); mkdirSync(out, { recursive: true });
  // altes Paket: Versandraten von 2000 – eine für eine Variante, die der Plan braucht (5426: vorhandene SKU des Hoodies), eine für eine Nummer, die niemand mehr braucht
  writeFileSync(join(out, 'versand.json'), JSON.stringify({ stand: '2000-01-01', ziel: 'CH 8001 (Test)', raten: { 5426: { usd: 1.23, id: 'STANDARD', gemessen: '2000-01-01' }, 99999: { usd: 4.56, id: 'STANDARD', gemessen: '2000-01-01' } } }));
  const r = spawnSync(process.execPath, ['--import', pathToFileURL(stub).href, CLI], { env: { PATH: process.env.PATH, HOME: process.env.HOME, DATEN: 'holen', DATEN_DIR: out, PRINTFUL_API_KEY: 'k', SHOPIFY_ADMIN_TOKEN: 'x', SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com', PF_PAUSE_FAKTOR: '0' }, encoding: 'utf8', timeout: 90000 });
  const heute = new Date().toISOString().slice(0, 10);
  const v = existsSync(join(out, 'versand.json')) ? JSON.parse(readFileSync(join(out, 'versand.json'), 'utf8')) : null;
  ist('DATEN=holen (gefälschtes fetch): Exit 0', [r.status, r.stderr.slice(0, 200)], [0, '']);
  ist('DATEN=holen: Stand «heute» in allen Dateien, auch beschreibungen und sku_pruefung', ['katalog.json', 'beschreibungen.json', 'versand.json', 'sku_pruefung.json', 'bestand.json', 'sku_index.json'].map((x) => JSON.parse(readFileSync(join(out, x), 'utf8')).stand), Array(6).fill(heute));
  ist('DATEN=holen: die alte Rate 1.23 für 5426 ist durch die frische 9.99 ersetzt, die nicht mehr gebrauchte Nummer 99999 ist weg, der Zielort bleibt', [v?.raten?.['5426']?.usd, v?.raten?.['99999'], v?.ziel], [9.99, undefined, 'CH 8001 (Test)']);
  ist('DATEN=holen: alle Raten der Datei sind frisch (gemessen heute, kein Rest von 2000)', Object.values(v?.raten || {}).every((x) => x.gemessen === heute) && Object.keys(v?.raten || {}).length >= 5, true);
  ist('DATEN=holen: bestand.json nennt productByIdentifier und trägt das Metafeld', [/productByIdentifier/.test(JSON.parse(readFileSync(join(out, 'bestand.json'), 'utf8')).quelle), 'materialMetafeld' in Object.values(JSON.parse(readFileSync(join(out, 'bestand.json'), 'utf8')).produkte)[0]], [true, true]);
  rmSync(d, { recursive: true, force: true });
}

// ── Das LIVE-Tor wird AUSGEFÜHRT (Befund 20): fremder Hash → Exit 3 ohne Zugang und ohne Schreibweg; gleicher Hash → der Schreibweg genau einmal
{
  const { liveAusfuehren } = await import(CLI);
  const H = 'a'.repeat(64);
  const bau = (extra = {}) => {
    const z = { gql: 0, lauf: 0, pruef: 0, args: null, aus: [], err: [] };
    return { z, basis: { plan: { hash: H }, planPfad: '/x/plan.json', existiert: () => true, lies: () => JSON.stringify({ hash: H }), gqlHolen: async () => { z.gql++; return 'GQL'; },
      laufFn: async (a) => { z.lauf++; z.args = a; return { ergebnisse: [{ handle: 'h', status: 'OK' }], exit: 0 }; }, log: (...x) => z.aus.push(x.join(' ')), err: (...x) => z.err.push(x.join(' ')),
      ledgerPfad: 'L', sicherungsDir: 'S', befundOk: ['h:c'], nur: ['h'], variantenBudget: 7, ...extra } };
  };
  { const { z, basis } = bau({ existiert: () => false }); let m = ''; try { await liveAusfuehren(basis); } catch (e) { m = e.message; }
    ist('Tor: fehlende Plandatei → Fehler, kein Shopify-Zugang, kein Schreibweg', [/braucht den geprüften Plan/.test(m), z.gql, z.lauf], [true, 0, 0]); }
  { const { z, basis } = bau({ lies: () => JSON.stringify({ hash: 'b'.repeat(64) }) }); const r = await liveAusfuehren(basis);
    ist('Tor: fremder Hash → Exit 3, weder Zugang zu Shopify noch Schreibweg', [r.exit, z.gql, z.lauf, z.err.some((x) => /ABWEICHUNG/.test(x)), z.err.at(-1).startsWith('ENDE: Exit 3')], [3, 0, 0, true, true]); }
  { const { z, basis } = bau({ lies: () => JSON.stringify({}) }); const r = await liveAusfuehren(basis);
    ist('Tor: Plandatei ohne Hash → wie ein fremder Hash (Exit 3)', [r.exit, z.lauf], [3, 0]); }
  { const { z, basis } = bau(); const r = await liveAusfuehren(basis);
    ist('Tor: gleicher Hash → Schreibweg genau einmal, mit Zugang, Ledger, Sicherung, Bestätigungen, ONLY und Budget', [r.exit, z.gql, z.lauf, z.args.gql, z.args.ledgerPfad, z.args.sicherungsDir, z.args.befundOk, z.args.nur, z.args.variantenBudget], [0, 1, 1, 'GQL', 'L', 'S', ['h:c'], ['h'], 7]);
    ist('Tor: die letzte Ausgabezeile nennt den Grund des Endes', z.aus.join('\n').split('\n').at(-1).startsWith('ENDE: Exit 0 – '), true); }
  { const { z, basis } = bau({ laufFn: async () => { z.lauf++; return { ergebnisse: [{ handle: 'h', status: 'GESPERRT' }], exit: 5 }; } }); const r = await liveAusfuehren(basis);
    ist('Tor: der Exit-Code des Laufs wird durchgereicht (5)', [r.exit, z.aus.join('\n').split('\n').at(-1).startsWith('ENDE: Exit 5')], [5, true]); }
  { const { z, basis } = bau({ pruefeVarianten: async () => { z.pruef++; return ['Printful 1 (S_1): Einkauf jetzt 11.20 USD, im Plan 10.00 USD']; } }); const r = await liveAusfuehren(basis);
    ist('Tor: Gegenprüfung bei Printful findet eine Abweichung → Exit 3, kein Shopify-Zugang, kein Schreibweg', [r.exit, z.pruef, z.gql, z.lauf, z.err.some((x) => /Printful 1 \(S_1\)/.test(x))], [3, 1, 0, 0, true]); }
  { const { z, basis } = bau({ lies: () => JSON.stringify({ hash: 'b'.repeat(64) }), pruefeVarianten: async () => { z.pruef++; return []; } }); await liveAusfuehren(basis);
    ist('Tor: bei fremdem Hash wird Printful gar nicht erst gefragt', z.pruef, 0); }
  { const { z, basis } = bau({ pruefeVarianten: async () => { z.pruef++; return []; } }); const r = await liveAusfuehren(basis);
    ist('Tor: Gegenprüfung ohne Abweichung → weiter zum Schreibweg', [r.exit, z.pruef, z.lauf], [0, 1, 1]); }
}

// ── Aufbau der Quelle: Schreibzugriffe nur über die Schreibbibliothek, hinter dem LIVE-Tor
{
  wahr('Kommando enthält selbst keinen GraphQL-Mutationstext (die steht nur in lib/pod_auswahl_schreiben.mjs)', !/[`'"]\s*mutation[\s(]/.test(QUELLE) && !/gql\(\s*M_/.test(QUELLE));
  // Das Tor ist die Funktion liveAusfuehren (unten mit Attrappen AUSGEFÜHRT getestet); hier nur noch: main ruft sie genau einmal und erst NACH der Trockenlauf-Rückgabe, der Schreibweg nur dort
  const iMain = QUELLE.indexOf('async function main()'), iTor = QUELLE.indexOf('if (!LIVE) {', iMain), iRuf = QUELLE.indexOf('await liveAusfuehren({', iMain), iFn = QUELLE.indexOf('export async function liveAusfuehren');
  wahr('main ruft liveAusfuehren NACH der Trockenlauf-Rückgabe auf', iFn > 0 && iFn < iMain && iTor > iMain && iRuf > iTor, `${iFn} ${iMain} ${iTor} ${iRuf}`);
  ist('liveAusfuehren wird genau einmal aufgerufen, der Schreibweg (laufFn) nur innerhalb der Funktion', [QUELLE.split('await liveAusfuehren({').length - 1, QUELLE.split('await laufFn({').length - 1, (QUELLE.match(/\blauf\(/g) || []).length], [1, 1, 0]);
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
    for (const f of [...lib, 'automation/pod_auswahl_test.mjs', 'automation/printful_sync_test.mjs', 'automation/pod_auswahl_mutation.mjs']) wahr(`CI führt ${f} aus`, new RegExp('node ' + f.replace(/\./g, '\\.') + '\\s*$', 'm').test(t));
    for (const f of ['automation/pod_auswahl.mjs', 'automation/printful_sync.mjs']) wahr(`CI prüft die Syntax von ${f}`, t.includes('node --check ' + f));
    wahr('sparse-checkout nennt dropship/pod-auswahl', /sparse-checkout: \|[\s\S]*?\n\s+dropship\/pod-auswahl\n/.test(t));
    wahr('Workflow startet bei Änderungen an dropship/pod-auswahl', /paths:[\s\S]*?- 'dropship\/pod-auswahl\/\*\*'/.test(t));
    const anzahl = (readFileSync(fileURLToPath(new URL('./pod_auswahl_mutation.mjs', import.meta.url)), 'utf8').match(/^  \{ name: /gm) || []).length;
    wahr(`Der Schrittname im Workflow nennt die Zahl der Mutanten (${anzahl})`, t.includes(`(${anzahl} absichtliche Fehler`), String(anzahl));
  }
}

// ── Schweizer Schreibweise: kein Eszett in den Dateien dieses Bereichs
{
  const dateien = ['automation/pod_auswahl.mjs', 'automation/pod_auswahl_test.mjs', 'automation/pod_auswahl_mutation.mjs', 'automation/printful_sync.mjs', 'automation/printful_sync_test.mjs', 'dropship/pod-auswahl/README.md',
    ...readdirSync(fileURLToPath(new URL('./lib', import.meta.url))).filter((x) => /^(pod_preise|pod_auswahl_\w+|printful_platzierung)(_test)?\.mjs$/.test(x)).map((x) => 'automation/lib/' + x)];
  const mit = dateien.filter((x) => /\u00df/.test(readFileSync(fileURLToPath(new URL('../' + x, import.meta.url)), 'utf8')));
  ist(`kein Eszett in ${dateien.length} Dateien des Bereichs (Schweizer Schreibweise: «ss»)`, mit, []);
}

for (const d of angelegt) rmSync(d, { recursive: true, force: true });
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
