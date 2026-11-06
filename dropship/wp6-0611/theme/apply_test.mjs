// Test für apply.mjs (das einzige Skript des Pakets, das live schreibt) gegen eine Attrappe der Theme-API und der Storefront. Kein Netz, kein Shopify.
//   node dropship/wp6-0611/theme/apply_test.mjs
// Die Attrappe (shopify_gql.mjs im Wegwerfordner) hält die Theme-Datei in einer JSON-Datei, kennt die Abfragen von apply.mjs (MAIN-Theme, Produkt, Datei lesen, themeFilesUpsert) und kann gezielt Fehler machen
// (FAKE=...). Die Storefront-Attrappe (fakefetch.mjs) liefert Seiten aus dem Zustand der Theme-Datei: die Marke des Pakets in der Datei = «neuer Stand». Aufrufnummern sind RELATIV zum Lauf (rel 1 = erster Schreibaufruf).
//   usererr/nullup: userErrors (upsertedThemeFiles bei nullup null, laut Schema nullable) · throw: Ausnahme nach dem Speichern · norm: der Speicher hängt beim ersten Schreiben einen Zeilenumbruch an
//   verzoegert: die neue Prüfsumme wird erst bei der dritten Lesung sichtbar · unsichtbar: Erfolg gemeldet, Datei bleibt · vorlese: die Datei ändert sich nach der ersten Lesung (Editor speichert)
//   fremdnach: ein zweiter Auftrag ändert die Datei nach unserem Schreiben · rueckblind: Schreibaufrufe ab dem zweiten werden nie sichtbar (Rückweg scheitert) · url: Datei als URL · nocsum: keine Prüfsumme
//   liquidvorher/liquidnachher: «Liquid error» auf allen Seiten vor/nach dem Einspielen · huellen: nach dem Einspielen eine Hülle weniger · s500: /cart liefert nachher HTTP 500
//   s500danach: /cart liefert ab dem ersten Schreibaufruf HTTP 500, auch nach dem Rückweg · zurueckblind: die Rücknahme wird nie sichtbar · liquidimmer: «Liquid error» auf allen Seiten, immer
//   wkadd403: /cart/add.js gesperrt · wkfehler: /cart mit Wegwerf-Zeile zeigt nachher einen Liquid-Fehler · wkohne: keine Miniatur trotz neuem Stand · wkverraet: «_vorschau» im sichtbaren Text · wkvorher: Miniatur schon vor dem Einspielen
//   hang: der Schreibaufruf speichert und wartet dann 20 s (für das Signal)
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { DATEI, MD5_VOR, MARKE, anwenden } from './patches.mjs';
import { analysiereSeite, bewerte, bewerteWarenkorb, sichtbarerText } from './apply.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

const sich = readFileSync(HIER + 'sicherung/snippets__cart-products.liquid.vor', 'utf8');
const soll = anwenden(sich), sollPin = anwenden(sich, { cloud: 'dwyi6kkrl' });
const SICH = 'snippets__cart-products.liquid.vor';

// ---------- Wegwerf-Umgebung (gleiche Ordnerstruktur wie im Repo) ----------
const D = mkdtempSync(join(tmpdir(), 'lxwp6-'));
const PAKET = join(D, 'dropship/wp6-0611/theme');
mkdirSync(join(PAKET, 'sicherung'), { recursive: true }); mkdirSync(join(D, 'automation/lib'), { recursive: true });
for (const f of ['apply.mjs', 'patches.mjs']) cpSync(HIER + f, join(PAKET, f));
cpSync(HIER + 'sicherung/' + SICH, join(PAKET, 'sicherung/' + SICH));
cpSync(HIER + '../../../automation/lib/shopify_host.mjs', join(D, 'automation/lib/shopify_host.mjs'));
writeFileSync(join(D, 'automation/lib/shopify_secret.mjs'), 'export const shopifyClientSecret = (s) => s;\n');
writeFileSync(join(D, 'automation/lib/shopify_gql.mjs'), `
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ST = process.env.SIM_STATE, FAKE = process.env.FAKE || '';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const load = () => JSON.parse(readFileSync(ST, 'utf8')), save = (s) => { const t = ST + '.' + process.pid; writeFileSync(t, JSON.stringify(s)); renameSync(t, ST); };   // atomar: der Test liest den Zustand, während das Kind schreibt
const warteEchtzeit = (ms) => new Promise((r) => setTimeout(r, ms));
export async function shopifyGql(shop, api, tok, query, vars) {
  const s = load(); s.ev = s.ev || [];
  if (query.includes('themes(first:5')) { s.ev.push('T'); save(s); return { themes: { nodes: FAKE.includes('zweithemen') ? [{ id: 'gid://fake/1', name: 'a' }, { id: 'gid://fake/2', name: 'b' }] : [{ id: 'gid://fake/1', name: 'fake' }] } }; }
  if (query.includes('products(first: 1')) { s.ev.push('P'); save(s); return { a: { nodes: [{ handle: 'testprodukt' }] } }; }
  if (query.includes('files(filenames')) {
    s.ev.push('R'); s.nR = (s.nR || 0) + 1; s.nRL = (s.nRL || 0) + 1;
    if (s.pending && --s.pendingN <= 0) { s.file = s.pending; delete s.pending; }
    const c = s.file;
    const antwort = c == null ? { theme: { files: { nodes: [] } } } : { theme: { files: { nodes: [{ filename: vars.f[0], size: Buffer.byteLength(c), checksumMd5: FAKE.includes('nocsum') ? null : md5(c),
      body: FAKE.includes('url') ? { __typename: 'OnlineStoreThemeFileBodyUrl', url: 'https://fake.invalid/datei' } : { __typename: 'OnlineStoreThemeFileBodyText', content: c } }] } } };
    if (FAKE.includes('vorlese') && s.nRL === 1) s.file += '\\n{% comment %} Editor hat gespeichert {% endcomment %}';
    save(s); return antwort;
  }
  if (query.includes('themeFilesUpsert')) {
    s.calls = s.calls || []; s.calls.push(vars.files.map((f) => f.filename)); s.ev.push('U');
    const rel = s.calls.length - (s.laufStart || 0), wert = vars.files[0].body.value;
    if (FAKE.includes('usererr') && rel === 1 && !s.zuruck) { save(s); const e = [{ filename: vars.files[0].filename, message: 'FAKE Liquid syntax error' }]; return { themeFilesUpsert: { upsertedThemeFiles: FAKE.includes('nullup') ? null : [], userErrors: e } }; }
    if (FAKE.includes('zurueckblind') && s.zuruck) { save(s); return { themeFilesUpsert: { upsertedThemeFiles: [{ filename: vars.files[0].filename }], userErrors: [] } }; }
    if (FAKE.includes('usererr') && s.zuruck) { save(s); return { themeFilesUpsert: { upsertedThemeFiles: [], userErrors: [{ filename: vars.files[0].filename, message: 'FAKE abgelehnt' }] } }; }
    if (FAKE.includes('rueckblind') && rel >= 2) { save(s); return { themeFilesUpsert: { upsertedThemeFiles: [{ filename: vars.files[0].filename }], userErrors: [] } }; }
    if (FAKE.includes('unsichtbar') && rel === 1) { save(s); return { themeFilesUpsert: { upsertedThemeFiles: [{ filename: vars.files[0].filename }], userErrors: [] } }; }
    let v = wert;
    if (FAKE.includes('norm') && rel === 1) v += '\\n';
    if (FAKE.includes('verzoegert') && rel === 1) { s.pending = v; s.pendingN = 3; } else s.file = v;
    if (FAKE.includes('fremdnach') && rel === 1) s.file = v + '\\n{% comment %} fremder Auftrag {% endcomment %}';
    save(s);
    if (FAKE.includes('hang') && rel === 1) await warteEchtzeit(20000);
    if (FAKE.includes('throw') && rel === 1) throw new Error('GraphQL: fetch failed (FAKE)');
    return { themeFilesUpsert: { upsertedThemeFiles: [{ filename: vars.files[0].filename }], userErrors: [] } };
  }
  throw new Error('FAKE: unbekannte Abfrage ' + query.slice(0, 60));
}
`);
writeFileSync(join(D, 'fakefetch.mjs'), `
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
const ST = process.env.SIM_STATE, FAKE = process.env.FAKE || '', MARKE = ${JSON.stringify(MARKE)};
const load = () => JSON.parse(readFileSync(ST, 'utf8')), save = (s) => { const t = ST + '.' + process.pid; writeFileSync(t, JSON.stringify(s)); renameSync(t, ST); };
const BASIS = 'https://shop.test';
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'fake' }), { status: 200 });
  if (u === 'https://fake.invalid/datei') { const s = load(); return new Response(s.file, { status: 200 }); }
  if (!u.startsWith(BASIS)) throw new Error('FAKE-Sperre: echter Netzzugriff ' + u);
  const s = load(); s.ev = s.ev || [];
  const pfad = u.slice(BASIS.length), neu = (s.file || '').includes(MARKE);
  const kopf = init.headers || {}, cookie = kopf.Cookie || kopf.cookie || '';
  if (init.method === 'POST' && pfad === '/cart/add.js') {
    s.ev.push('A'); s.cartAdds = (s.cartAdds || 0) + 1; s.letzteEigenschaften = JSON.parse(init.body).items[0].properties; save(s);
    if (FAKE.includes('wkadd403')) return new Response('{"status":403}', { status: 403 });
    const h = new Headers(); h.append('set-cookie', 'cart=abc123; path=/; HttpOnly'); h.append('set-cookie', 'cart_sig=xyz; path=/');
    return new Response('{"items":[]}', { status: 200, headers: h });
  }
  if (init.method === 'POST' && pfad === '/cart/clear.js') { s.ev.push('C'); s.cartClears = (s.cartClears || 0) + 1; s.cookieBeimLeeren = cookie; save(s); return new Response('{}', { status: 200 }); }
  s.ev.push('G'); s.seiten = (s.seiten || []); s.seiten.push(pfad); save(s);
  let liquid = '';
  if ((FAKE.includes('liquidvorher') && !neu) || (FAKE.includes('liquidnachher') && neu) || FAKE.includes('liquidimmer')) liquid = '<p>Liquid error (snippets/cart-products line 150): boom</p>';
  const huellen = FAKE.includes('huellen') && neu ? 1 : 2;
  let html = '<html><body>' + '<div class="cart-items__wrapper"></div>'.repeat(huellen) + liquid;
  let status = 200;
  if (FAKE.includes('s500') && neu && pfad === '/cart') status = 500;
  if (FAKE.includes('s500danach') && (s.calls || []).length > 0 && pfad === '/cart') status = 500;   // ab dem ersten Schreibaufruf, auch nach dem Rückweg
  if (pfad === '/cart' && cookie.includes('cart=abc123')) {
    const eig = s.letzteEigenschaften || {}, hatMiniatur = (neu && !FAKE.includes('wkohne')) || FAKE.includes('wkvorher');
    html += '<table><tr ref="cartItemRows[]"><td class="cart-items__media">' + (hatMiniatur ? '<a><img src="' + eig._vorschau + '" data-lx-vorschau="1"></a>' : '<a><img src="//cdn/x.jpg"></a>') + '</td><td><dl><dt>🎨 Design (front):</dt><dd>' + (eig['🎨 Design (front)'] || '').replace(/"/g, '&quot;') + '</dd></dl>' + (FAKE.includes('wkverraet') ? '<dt>_vorschau:</dt>' : '') + '</td></tr></table>';
    if (FAKE.includes('wkfehler') && neu) html += '<p>Liquid error (snippets/cart-products line 153): Zeile kaputt</p>';
  }
  return new Response(html + '</body></html>', { status });
};
`);
const STATE = join(D, 'state.json'), MERK = join(PAKET, 'sicherung/eingespielt.json');
const neuerStand = (datei = sich) => { writeFileSync(STATE, JSON.stringify({ file: datei, calls: [], ev: [], laufStart: 0 })); rmSync(MERK, { force: true }); for (const f of readdirSync(join(PAKET, 'sicherung'))) if (f.startsWith('fremd-')) rmSync(join(PAKET, 'sicherung', f)); };
const stand = () => { for (let v = 0; ; v++) { try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch (e) { if (v > 20) throw e; } } };   // Wiederholung: das Kind darf gerade ersetzen
const ENV_BASIS = (fake, env) => ({ PATH: process.env.PATH, HOME: process.env.HOME, SIM_STATE: STATE, FAKE: fake, SHOPIFY_SHOP: 'fake.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', STOREFRONT: 'https://shop.test', APPLY_ZEIT: '0.001', ...env });
const lauf = (fake, env = {}) => {
  const st = stand(); st.laufStart = (st.calls || []).length; st.nRL = 0; st.ev = []; st.zuruck = env.ZURUECK === '1'; writeFileSync(STATE, JSON.stringify(st));
  const r = spawnSync(process.execPath, ['--import', join(D, 'fakefetch.mjs'), join(PAKET, 'apply.mjs')], { encoding: 'utf8', timeout: 90000, env: ENV_BASIS(fake, env) });
  return { code: r.status, aus: (r.stdout || '') + (r.stderr || '') };
};
const folge = () => (stand().ev || []).join('').replace(/([A-Z])\1+/g, '$1');   // Ereignisse ohne Wiederholungen, z. B. T R P G R U R G
const istAlt = () => stand().file === sich, istSoll = () => stand().file === soll;
const WK = { LIVE: '1', PRUEF_WARENKORB: '1', PRUEF_VARIANTE: '46000000000001' };
const keinSchreiben = (text) => gleich(stand().calls, [], text + ': kein Schreibaufruf');

try {
  // ---------- 0. reine Funktionen ----------
  {
    const seiteOk = '<div class="cart-items__wrapper"></div><div class="cart-items__wrapper"></div>';
    const a = analysiereSeite(seiteOk); gleich([a.huellen, a.miniaturen, a.fehler.length, a.verraet], [2, 0, 0, false], 'analysiereSeite: Hüllen zählen');
    ok(analysiereSeite('x Liquid error (snippets/a line 3): boom y').fehler.length === 1 && analysiereSeite('Liquid syntax error: x').fehler.length === 1, 'analysiereSeite: findet Liquid-Fehler');
    ok(analysiereSeite('<img data-lx-vorschau="1">').miniaturen === 1, 'analysiereSeite: zählt Miniaturen');
    ok(analysiereSeite('<script>var a="_vorschau"</script><style>/*_pod_karte*/</style><p>hallo</p>').verraet === false, 'analysiereSeite: Skript und Stil zählen nicht als sichtbarer Text');
    ok(analysiereSeite('<p>_vorschau: https://res.cloudinary.com/x</p>').verraet && analysiereSeite('<p>https://res.cloudinary.com/x</p>').adresseSichtbar, 'analysiereSeite: sichtbare Namen und Adressen werden erkannt');
    ok(!analysiereSeite('<img src="https://res.cloudinary.com/x" alt="_vorschau">').verraet && !analysiereSeite('<img src="https://res.cloudinary.com/x">').adresseSichtbar, 'analysiereSeite: Attribute zählen nicht als sichtbarer Text');
    ok(sichtbarerText('<p>a &quot;b&quot; &amp; c</p>').includes('a "b" & c'), 'sichtbarerText: Entitäten');
    const m = (x) => ({ status: 200, fehler: [], huellen: 2, miniaturen: 0, verraet: false, adresseSichtbar: false, ...x });
    gleich(bewerte(m({}), null, {}), [], 'bewerte: gesunde Seite'); ok(bewerte(m({ status: 500 }), null, {}).length === 1, 'bewerte: HTTP 500');
    ok(bewerte(m({ fehler: ['Liquid error x'] }), m({}), {}).length === 1, 'bewerte: neuer Liquid-Fehler'); gleich(bewerte(m({ fehler: ['Liquid error x'] }), m({ fehler: ['Liquid error x'] }), {}), [], 'bewerte: schon vorhandener Liquid-Fehler ist keiner');
    gleich(bewerte(m({ fehler: ['Liquid error x'] }), null, { vorfehlerOk: true }), [], 'bewerte: VORFEHLER_OK'); ok(bewerte(m({ huellen: 1 }), m({}), {}).length === 1, 'bewerte: andere Zahl Hüllen');
    ok(bewerte(m({ huellen: 0 }), null, { huellenErwartet: true }).length === 1 && bewerte(m({ huellen: 0 }), null, {}).length === 0, 'bewerte: Hülle erwartet nur dort, wo gesagt');
    ok(bewerte(m({ verraet: true }), null, {}).length === 1, 'bewerte: sichtbarer Unterstrich-Name');
    const w = (x) => ({ status: 200, fehler: [], miniaturen: 1, verraet: false, adresseSichtbar: false, designZeile: true, zeileDa: true, ...x });
    gleich(bewerteWarenkorb(w({}), 'nachher'), [], 'bewerteWarenkorb: nachher mit einer Miniatur'); gleich(bewerteWarenkorb(w({ miniaturen: 0 }), 'vorher'), [], 'bewerteWarenkorb: vorher ohne Miniatur');
    ok(bewerteWarenkorb(w({ miniaturen: 0 }), 'nachher').length === 1 && bewerteWarenkorb(w({}), 'vorher').length === 1, 'bewerteWarenkorb: falsche Miniaturzahl');
    for (const [name, x] of [['Liquid-Fehler', { fehler: ['Liquid error x'] }], ['HTTP 500', { status: 500 }], ['Name sichtbar', { verraet: true }], ['Adresse sichtbar', { adresseSichtbar: true }], ['Design-Zeile fehlt', { designZeile: false }], ['Zeile fehlt', { zeileDa: false }]])
      ok(bewerteWarenkorb(w(x), 'nachher').length === 1, `bewerteWarenkorb: ${name}`);
  }

  // ---------- 1. Trockenlauf schreibt nichts ----------
  neuerStand(); let r = lauf('');
  gleich(r.code, 0, 'Trockenlauf: Exit'); keinSchreiben('Trockenlauf'); ok(istAlt(), 'Trockenlauf: Datei unverändert'); ok(!existsSync(MERK), 'Trockenlauf: keine Merkliste');
  ok(/Trockenlauf, nichts geschrieben/.test(r.aus), 'Trockenlauf: Meldung'); ok(/Prüfsumme GLEICH dem Abbild/.test(r.aus), 'Trockenlauf: meldet die Basis-Prüfsumme als gleich dem Abbild'); ok(!stand().ev.includes('G'), 'Trockenlauf: ruft keine Seite ab');
  ok(new RegExp('md5 ' + md5(soll)).test(r.aus), 'Trockenlauf: nennt die Prüfsumme des Soll-Textes');
  neuerStand(); r = lauf('', { PRUEFEN: '1' });
  gleich(r.code, 0, 'Trockenlauf mit PRUEFEN=1: Exit'); keinSchreiben('Trockenlauf mit PRUEFEN=1'); ok(stand().ev.includes('G') && (r.aus.match(/HTTP 200/g) || []).length === 4, 'Trockenlauf mit PRUEFEN=1: misst vier Seiten');
  neuerStand(); r = lauf('', { PRUEFEN: '1', FAKE: 'liquidvorher' }); neuerStand(); r = lauf('liquidvorher', { PRUEFEN: '1' });
  gleich(r.code, 4, 'Trockenlauf mit PRUEFEN=1 und Liquid-Fehler vorher: Exit 4 (Befund, nichts geschrieben)'); keinSchreiben('Trockenlauf mit Fehler vorher');

  // ---------- 2. Einspielen ----------
  neuerStand(); r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'LIVE: Exit'); ok(istSoll(), 'LIVE: Datei gleich dem Soll-Text'); gleich(stand().calls, [[DATEI]], 'LIVE: genau ein Schreibaufruf auf die Zieldatei');
  const merk = existsSync(MERK) ? JSON.parse(readFileSync(MERK, 'utf8')) : null;
  ok(merk && merk.md5_soll === md5(soll) && merk.md5_vor === MD5_VOR && merk.datei === DATEI && merk.cloud === '', 'LIVE: Merkliste mit Soll- und Ausgangs-Prüfsumme');
  ok(/rücklesen GLEICH dem Soll/.test(r.aus) && !/ABWEICHUNG/.test(r.aus), 'LIVE: Rücklesen GLEICH'); gleich((r.aus.match(/HTTP 200/g) || []).length, 12, 'LIVE: vier Seiten vorher + zweimal vier nachher');
  gleich(folge(), 'TRPGRURG', 'LIVE: Reihenfolge Theme, Lesen, Produkt, Seiten vorher, NOCH EINMAL lesen, Schreiben, Rücklesen, Seiten nachher (kein Schreiben vor den Messungen)');
  ok(/FERTIG/.test(r.aus), 'LIVE: Schlussmeldung');
  // zweites Einspielen
  const vorher = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'zweites LIVE: Exit 3'); gleich(stand().calls.length, vorher, 'zweites LIVE: nichts geschrieben'); ok(/Schon eingespielt/.test(r.aus), 'zweites LIVE: Meldung');
  // andere Fassung (feste Cloud) auf eingespieltem Stand: abgelehnt
  r = lauf('', { LIVE: '1', VORSCHAU_CLOUD: 'dwyi6kkrl' }); gleich(r.code, 3, 'LIVE mit anderer Cloud auf eingespieltem Stand: Exit 3'); ok(/Marke lx-vorschau-0611/.test(r.aus), 'LIVE mit anderer Cloud: nennt die Marke'); gleich(stand().calls.length, vorher, 'LIVE mit anderer Cloud: nichts geschrieben');

  // ---------- 3. Rücknahme ----------
  r = lauf('', { ZURUECK: '1' });
  gleich(r.code, 0, 'ZURUECK Trockenlauf: Exit'); ok(/eingespielt \(gleich dem Soll\)/.test(r.aus), 'ZURUECK Trockenlauf: erkennt den eingespielten Stand'); gleich(stand().calls.length, vorher, 'ZURUECK Trockenlauf: nichts geschrieben'); ok(istSoll(), 'ZURUECK Trockenlauf: Datei unverändert');
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK LIVE: Exit'); ok(istAlt(), 'ZURUECK LIVE: Datei gleich der Sicherung (Ausgangsstand)'); gleich(stand().calls.length, vorher + 1, 'ZURUECK LIVE: genau ein Schreibaufruf'); ok(/GLEICH der Sicherung/.test(r.aus), 'ZURUECK LIVE: Rücklesen');
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK im Ausgangsstand: Exit 0'); ok(/schon im Ausgangsstand/.test(r.aus), 'ZURUECK im Ausgangsstand: Meldung'); gleich(stand().calls.length, vorher + 1, 'ZURUECK im Ausgangsstand: nichts geschrieben');
  // Rücknahme bei fremd verändertem Stand
  neuerStand(); lauf('', { LIVE: '1' }); const st1 = stand(); st1.file += '\n{% comment %} Fremd {% endcomment %}'; writeFileSync(STATE, JSON.stringify(st1)); const nUp = st1.calls.length;
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'ZURUECK bei fremd verändertem Stand: Exit 3'); gleich(stand().calls.length, nUp, 'ZURUECK bei fremd verändertem Stand: nichts geschrieben'); ok(/FREMD_UEBERSCHREIBEN=1/.test(r.aus), 'ZURUECK fremd: nennt den Schalter');
  r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' });
  gleich(r.code, 0, 'ZURUECK mit FREMD_UEBERSCHREIBEN: Exit 0'); ok(istAlt(), 'ZURUECK mit FREMD_UEBERSCHREIBEN: Datei gleich der Sicherung');
  ok(readdirSync(join(PAKET, 'sicherung')).filter((f) => f.startsWith('fremd-')).length === 1, 'ZURUECK mit FREMD_UEBERSCHREIBEN: der Fremdstand wurde vorher festgehalten');
  // Rücknahme einer Fassung mit fester Cloud: die Merkliste trägt die Cloud
  neuerStand(); r = lauf('', { LIVE: '1', VORSCHAU_CLOUD: 'dwyi6kkrl' });
  gleich(r.code, 0, 'LIVE mit fester Cloud: Exit'); ok(stand().file === sollPin && stand().file !== soll, 'LIVE mit fester Cloud: Datei gleich dem Soll mit Cloud'); ok(JSON.parse(readFileSync(MERK, 'utf8')).cloud === 'dwyi6kkrl', 'LIVE mit fester Cloud: Merkliste trägt die Cloud');
  r = lauf('', { ZURUECK: '1' }); ok(/feste Cloud dwyi6kkrl/.test(r.aus), 'ZURUECK ohne VORSCHAU_CLOUD: die Cloud kommt aus der Merkliste');
  // patches.mjs ändert sich nach dem Einspielen: die Rücknahme erkennt den eingespielten Stand an der Prüfsumme der Merkliste
  { const pp = join(PAKET, 'patches.mjs'), orig = readFileSync(pp, 'utf8'); writeFileSync(pp, orig.replace('width="800"', 'width="801"'));
    r = lauf('', { ZURUECK: '1' }); gleich(r.code, 0, 'ZURUECK nach geändertem patches.mjs: Exit 0'); ok(/eingespielt \(gleich dem Soll\)/.test(r.aus), 'ZURUECK nach geändertem patches.mjs: erkennt den eingespielten Stand an der Merkliste'); writeFileSync(pp, orig); }
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK ohne VORSCHAU_CLOUD (Cloud aus der Merkliste): Exit 0'); ok(istAlt(), 'ZURUECK mit Cloud aus der Merkliste: Datei gleich der Sicherung');
  // Rücknahme scheitert: userErrors, nie sichtbar, Seiten kaputt
  neuerStand(); lauf('', { LIVE: '1' }); const nUp2 = stand().calls.length;
  r = lauf('usererr', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 5, 'ZURUECK mit userErrors: Exit 5'); ok(istSoll(), 'ZURUECK mit userErrors: Datei bleibt auf dem Soll'); gleich(stand().calls.length, nUp2 + 1, 'ZURUECK mit userErrors: ein Schreibversuch');
  r = lauf('zurueckblind', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 6, 'ZURUECK, Schreiben nie sichtbar: Exit 6'); ok(istSoll(), 'ZURUECK nie sichtbar: Datei bleibt auf dem Soll'); ok(/wiederholbar/.test(r.aus), 'ZURUECK nie sichtbar: Meldung nennt die Wiederholung');
  r = lauf('liquidimmer', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 7, 'ZURUECK mit auffälligen Seiten: Exit 7 (Datei zurückgeschrieben, Seiten von Hand ansehen)'); ok(istAlt(), 'ZURUECK mit auffälligen Seiten: Datei zurückgeschrieben');
  // Eingaben
  neuerStand(); r = lauf('', { LIVE: '1', VORSCHAU_CLOUD: 'a b' }); gleich(r.code, 1, 'ungültige Cloud: Exit 1'); keinSchreiben('ungültige Cloud');
  r = lauf('', { LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 1, 'FREMD_UEBERSCHREIBEN beim Einspielen: Exit 1'); keinSchreiben('FREMD_UEBERSCHREIBEN beim Einspielen');
  r = lauf('', { LIVE: '1', SHOPIFY_CLIENT_ID: '' }); gleich(r.code, 1, 'ohne Zugangsdaten: Exit 1'); keinSchreiben('ohne Zugangsdaten');
  r = lauf('zweithemen', { LIVE: '1' }); gleich(r.code, 1, 'zwei MAIN-Themes: Exit 1'); keinSchreiben('zwei MAIN-Themes');

  // ---------- 4. Ausgangsstand und Sicherung ----------
  neuerStand(sich + '\n{% comment %} jemand hat geändert {% endcomment %}'); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'Live-Datei weicht ab: Exit 4'); keinSchreiben('Live-Datei weicht ab'); ok(/weicht vom erwarteten Ausgangsstand ab/.test(r.aus) && /MD5_VOR/.test(r.aus), 'Live-Datei weicht ab: Meldung nennt MD5_VOR');
  neuerStand(sich + '\n'); r = lauf('', { LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 1, 'FREMD_UEBERSCHREIBEN darf eine abweichende Datei nicht erzwingen'); keinSchreiben('kein Erzwingen');
  neuerStand(null); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Datei fehlt im Theme: Exit 4'); keinSchreiben('Datei fehlt');
  neuerStand(soll.replace('width="800"', 'width="400"')); r = lauf('', { LIVE: '1' }); gleich(r.code, 3, 'Datei trägt die Marke, ist aber nicht das Soll: Exit 3'); keinSchreiben('Marke, nicht Soll'); ok(/Marke lx-vorschau-0611/.test(r.aus), 'Marke, nicht Soll: Meldung');
  neuerStand(); writeFileSync(join(PAKET, 'sicherung/' + SICH), sich + ' '); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'Sicherung im Repo verfälscht: Exit 4'); keinSchreiben('Sicherung verfälscht'); ok(/Sicherung im Repo weicht von MD5_VOR ab/.test(r.aus), 'Sicherung verfälscht: Meldung'); cpSync(HIER + 'sicherung/' + SICH, join(PAKET, 'sicherung/' + SICH));
  rmSync(join(PAKET, 'sicherung/' + SICH)); neuerStand(); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Sicherung im Repo fehlt: Exit 4'); keinSchreiben('Sicherung fehlt'); cpSync(HIER + 'sicherung/' + SICH, join(PAKET, 'sicherung/' + SICH));
  neuerStand(); writeFileSync(MERK, '{kaputt'); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Merkliste unlesbar: Exit 4'); keinSchreiben('Merkliste unlesbar');
  neuerStand(); writeFileSync(MERK, JSON.stringify({ datei: 'anderes.liquid', md5_soll: md5(soll), md5_vor: MD5_VOR, cloud: '' })); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Merkliste mit falscher Datei: Exit 4'); keinSchreiben('Merkliste falsche Datei');
  neuerStand(); writeFileSync(MERK, JSON.stringify({ datei: DATEI, md5_soll: md5(soll), md5_vor: '0'.repeat(32), cloud: '' })); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Merkliste mit fremdem Ausgangsstand: Exit 4'); keinSchreiben('Merkliste fremder Ausgangsstand');
  neuerStand(); writeFileSync(MERK, JSON.stringify({ datei: DATEI, md5_soll: 'xyz', md5_vor: MD5_VOR, cloud: '' })); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Merkliste mit unlesbarer Prüfsumme: Exit 4'); keinSchreiben('Merkliste Prüfsumme');

  // ---------- 5. Schreib- und Leseverhalten ----------
  neuerStand(); r = lauf('usererr', { LIVE: '1' });
  gleich(r.code, 5, 'userErrors: Exit 5'); ok(istAlt(), 'userErrors: Datei unverändert'); gleich(stand().calls.length, 1, 'userErrors: ein Schreibversuch, kein Rückschreiben nötig'); ok(/userErrors/.test(r.aus), 'userErrors: Meldung');
  neuerStand(); r = lauf('usererr,nullup', { LIVE: '1' }); gleich(r.code, 5, 'userErrors mit upsertedThemeFiles = null (laut Schema möglich): Exit 5, kein Absturz'); ok(istAlt(), 'userErrors null: Datei unverändert');
  neuerStand(); r = lauf('norm', { LIVE: '1' });
  gleich(r.code, 6, 'Speicher verändert den Text (Zeilenumbruch): Rücklesen weicht ab, Exit 6'); ok(istAlt(), 'Rücklesen weicht ab: zurückgeschrieben (Datei = Sicherung)'); ok(/ABWEICHUNG/.test(r.aus) && /Rückweg, Versuch 1: Rücklesen GLEICH der Sicherung/.test(r.aus), 'Rücklesen weicht ab: Rückweg bestätigt');
  ok(readdirSync(join(PAKET, 'sicherung')).some((f) => f.startsWith('fremd-')), 'Rücklesen weicht ab: der abweichende Stand wurde vor dem Überschreiben festgehalten'); gleich(stand().calls.length, 2, 'Rücklesen weicht ab: Schreiben und Rückschreiben');
  neuerStand(); r = lauf('verzoegert', { LIVE: '1' });
  gleich(r.code, 0, 'neue Prüfsumme erst bei der dritten Lesung sichtbar: Geduld, Exit 0'); ok(istSoll(), 'verzögerte Sichtbarkeit: Datei gleich dem Soll'); gleich(stand().calls.length, 1, 'verzögerte Sichtbarkeit: nur ein Schreibaufruf');
  neuerStand(); r = lauf('unsichtbar', { LIVE: '1' }); gleich(r.code, 6, 'Schreiben gemeldet, aber nie sichtbar: Exit 6'); ok(istAlt(), 'nie sichtbar: Datei im Ausgangsstand'); gleich(stand().calls.length, 1, 'nie sichtbar: nichts zurückzuschreiben, wenn die Datei schon der Ausgangsstand ist');
  neuerStand(); r = lauf('throw', { LIVE: '1' }); gleich(r.code, 8, 'Ausnahme nach dem Speichern: Exit 8'); ok(istAlt(), 'Ausnahme: zurückgeschrieben'); ok(/Ausnahme: GraphQL: fetch failed/.test(r.aus), 'Ausnahme: Meldung');
  neuerStand(); r = lauf('fremdnach', { LIVE: '1' }); gleich(r.code, 6, 'ein zweiter Auftrag ändert die Datei nach unserem Schreiben: Exit 6'); ok(istAlt(), 'zweiter Auftrag: Rückweg'); ok(readdirSync(join(PAKET, 'sicherung')).some((f) => f.startsWith('fremd-')), 'zweiter Auftrag: sein Stand ist festgehalten');
  neuerStand(); r = lauf('vorlese', { LIVE: '1' }); gleich(r.code, 4, 'Datei ändert sich nach der ersten Lesung (Editor speichert): Exit 4'); keinSchreiben('Änderung zwischen Lesen und Schreiben'); ok(!existsSync(MERK), 'Änderung zwischen Lesen und Schreiben: keine Merkliste');
  neuerStand(); r = lauf('url', { LIVE: '1' }); gleich(r.code, 0, 'Datei als URL geliefert: Exit 0'); ok(istSoll(), 'Datei als URL: eingespielt');
  neuerStand(); r = lauf('nocsum', { LIVE: '1' }); gleich(r.code, 4, 'API ohne Prüfsumme: Exit 4'); keinSchreiben('ohne Prüfsumme'); ok(/Die API meldet keine Prüfsumme/.test(r.aus), 'API ohne Prüfsumme: Meldung nennt den Grund');

  // ---------- 6. Seitenprüfung ----------
  neuerStand(); r = lauf('liquidvorher', { LIVE: '1' }); gleich(r.code, 4, 'Liquid-Fehler schon vor dem Eingriff: Exit 4'); keinSchreiben('Liquid-Fehler vorher'); ok(/VORFEHLER_OK/.test(r.aus), 'Liquid-Fehler vorher: Meldung nennt VORFEHLER_OK');
  neuerStand(); r = lauf('liquidvorher', { LIVE: '1', VORFEHLER_OK: '1' }); gleich(r.code, 0, 'bekannter Liquid-Fehler mit VORFEHLER_OK: Exit 0'); ok(istSoll(), 'VORFEHLER_OK: eingespielt');
  neuerStand(); r = lauf('liquidnachher', { LIVE: '1' }); gleich(r.code, 7, 'neuer Liquid-Fehler nach dem Einspielen: Exit 7'); ok(istAlt(), 'Liquid-Fehler nachher: zurückgeschrieben'); ok(/Liquid-Fehler/.test(r.aus), 'Liquid-Fehler nachher: Meldung'); gleich(stand().calls.length, 2, 'Liquid-Fehler nachher: Schreiben und Rückschreiben');
  ok(/Seitenprüfung nach dem Einspielen fehlgeschlagen/.test(r.aus) && /Rückweg, Versuch 1: Rücklesen GLEICH/.test(r.aus), 'Liquid-Fehler nachher: Rückweg bestätigt');
  neuerStand(); r = lauf('huellen', { LIVE: '1' }); gleich(r.code, 7, 'Hülle des Warenkorbs verschwindet: Exit 7'); ok(istAlt(), 'Hülle verschwindet: zurückgeschrieben'); ok(/Hüllen des Warenkorbs: 1 statt 2/.test(r.aus), 'Hülle verschwindet: Meldung');
  neuerStand(); r = lauf('s500', { LIVE: '1' }); gleich(r.code, 7, 'HTTP 500 auf /cart nach dem Einspielen: Exit 7'); ok(istAlt(), 'HTTP 500: zurückgeschrieben');
  neuerStand(); r = lauf('s500danach', { LIVE: '1' }); gleich(r.code, 9, 'Datei zurückgeschrieben, aber die Seiten bleiben auffällig (HTTP 500 auch danach): Exit 9'); ok(istAlt(), 'Seiten auch nach dem Rückweg auffällig: Datei ist zurückgeschrieben'); ok(/Seiten sind auffällig/.test(r.aus) && !/RÜCKWEG NICHT BESTÄTIGT/.test(r.aus), 'Seiten auch nach dem Rückweg auffällig: Meldung unterscheidet sich vom unbestätigten Rückweg');
  neuerStand(); r = lauf('liquidnachher,rueckblind', { LIVE: '1' }); gleich(r.code, 9, 'Rückweg nicht bestätigt: Exit 9'); ok(istSoll(), 'Rückweg blind: Datei bleibt auf dem Soll (der Rückweg wurde nie sichtbar)'); ok(/RÜCKWEG NICHT BESTÄTIGT/.test(r.aus) && /ZURUECK=1 LIVE=1 FREMD_UEBERSCHREIBEN=1/.test(r.aus), 'Rückweg nicht bestätigt: Meldung mit Befehl für den Rückweg von Hand');
  gleich(stand().calls.length, 4, 'Rückweg nicht bestätigt: drei Rückschreib-Versuche');

  // ---------- 7. Warenkorb-Probe ----------
  neuerStand(); r = lauf('', { ...WK });
  gleich(r.code, 0, 'Warenkorb-Probe: Exit'); ok(istSoll(), 'Warenkorb-Probe: eingespielt'); gleich(folge(), 'TRPGAGCRURGAGC', 'Warenkorb-Probe: vorher (Seiten, Wegwerf-Warenkorb), nochmal lesen, Schreiben, Rücklesen, nachher (Seiten, Wegwerf-Warenkorb)');
  gleich([stand().cartAdds, stand().cartClears], [2, 2], 'Warenkorb-Probe: zweimal gefüllt, zweimal geleert'); ok(stand().cookieBeimLeeren.includes('cart=abc123') && stand().cookieBeimLeeren.includes('cart_sig=xyz'), 'Warenkorb-Probe: leert mit den Cookies des Wegwerf-Warenkorbs (alle Set-Cookie-Zeilen)');
  const eig = stand().letzteEigenschaften; gleich(Object.keys(eig), ['🎨 Design (front)', '_pod_karte', '_vorschau'], 'Warenkorb-Probe: Eigenschaften wie vom Editor'); ok(eig._vorschau === 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'Warenkorb-Probe: Standard-Vorschau ist die Beispielbild-Adresse der Demo-Cloud');
  ok(/Warenkorb-Probe \(vorher\): ok · 0 Miniatur/.test(r.aus) && /Warenkorb-Probe \(nachher\): ok · 1 Miniatur/.test(r.aus), 'Warenkorb-Probe: Meldungen vorher 0 und nachher 1 Miniatur');
  neuerStand(); r = lauf('', { LIVE: '1', PRUEF_WARENKORB: '1' }); gleich(r.code, 1, 'Warenkorb-Probe ohne PRUEF_VARIANTE: Exit 1'); keinSchreiben('ohne PRUEF_VARIANTE');
  r = lauf('', { ...WK, VORSCHAU_CLOUD: 'dwyi6kkrl' }); gleich(r.code, 1, 'Warenkorb-Probe mit fester Cloud ohne PRUEF_VORSCHAU: Exit 1'); keinSchreiben('feste Cloud ohne PRUEF_VORSCHAU');
  r = lauf('', { ...WK, VORSCHAU_CLOUD: 'dwyi6kkrl', PRUEF_VORSCHAU: 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1/probe.jpg' }); gleich(r.code, 0, 'Warenkorb-Probe mit fester Cloud und eigener Vorschau: Exit 0'); ok(stand().file === sollPin, 'feste Cloud: eingespielt');
  neuerStand(); r = lauf('wkadd403', { ...WK }); gleich(r.code, 4, 'Wegwerf-Warenkorb nicht anlegbar (HTTP 403) vor dem Eingriff: Exit 4'); keinSchreiben('Wegwerf-Warenkorb gesperrt'); ok(/POST \/cart\/add\.js: HTTP 403/.test(r.aus), 'Wegwerf-Warenkorb gesperrt: Meldung nennt HTTP 403'); ok(!/Wegwerf-Zeile steht nicht/.test(r.aus), 'Wegwerf-Warenkorb gesperrt: kein Folgefehler aus einem leeren Warenkorb'); gleich(stand().cartClears, 1, 'gesperrter Warenkorb: trotzdem aufgeräumt');
  neuerStand(); r = lauf('wkvorher', { ...WK }); gleich(r.code, 4, 'Miniatur schon vor dem Eingriff im Warenkorb: Exit 4'); keinSchreiben('Miniatur schon vorher');
  neuerStand(); r = lauf('wkfehler', { ...WK }); gleich(r.code, 7, 'Liquid-Fehler nur im Warenkorb mit Zeile: Exit 7 (die leeren Seiten allein hätten ihn nicht gesehen)'); ok(istAlt(), 'Fehler nur im Warenkorb: zurückgeschrieben'); gleich(stand().cartClears, 2, 'Fehler im Warenkorb: der Wegwerf-Warenkorb wurde geleert');
  neuerStand(); r = lauf('wkohne', { ...WK }); gleich(r.code, 7, 'keine Miniatur trotz neuem Stand: Exit 7'); ok(istAlt(), 'keine Miniatur: zurückgeschrieben'); ok(/0 Miniatur\(en\) mit Vorschau statt 1/.test(r.aus), 'keine Miniatur: Meldung');
  neuerStand(); r = lauf('wkverraet', { ...WK }); gleich(r.code, 4, 'Name der Eigenschaft im sichtbaren Text: Exit 4 (schon vor dem Eingriff erkannt)'); keinSchreiben('Name sichtbar');
  // ohne PRUEF_WARENKORB kein Aufruf der Warenkorb-Endpunkte
  neuerStand(); r = lauf('', { LIVE: '1' }); gleich([stand().cartAdds || 0, stand().cartClears || 0], [0, 0], 'ohne PRUEF_WARENKORB: kein Wegwerf-Warenkorb');

  // ---------- 8. Signal mitten im Schreiben ----------
  neuerStand();
  {
    const st = stand(); st.laufStart = 0; writeFileSync(STATE, JSON.stringify(st));
    const kind = spawn(process.execPath, ['--import', join(D, 'fakefetch.mjs'), join(PAKET, 'apply.mjs')], { env: ENV_BASIS('hang', { LIVE: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = ''; kind.stdout.on('data', (d) => { aus += d; }); kind.stderr.on('data', (d) => { aus += d; });
    const t0 = Date.now();
    while (Date.now() - t0 < 30000 && !(stand().calls || []).length) await new Promise((res) => setTimeout(res, 50));
    ok((stand().calls || []).length === 1, 'Signal: der Schreibaufruf läuft');
    kind.kill('SIGTERM');
    const code = await new Promise((res) => { kind.on('exit', (c) => res(c)); setTimeout(() => { kind.kill('SIGKILL'); }, 40000); });
    gleich(code, 130, 'SIGTERM nach dem Schreiben: Exit 130'); ok(istAlt(), 'SIGTERM nach dem Schreiben: zurückgeschrieben'); ok(/Signal SIGTERM nach dem Schreiben/.test(aus) && /Rücklesen GLEICH der Sicherung/.test(aus), 'SIGTERM: Rückweg bestätigt');
  }
  // Signal VOR dem Schreiben: sofort beenden, nichts schreiben
  neuerStand();
  {
    const kind = spawn(process.execPath, ['--import', join(D, 'fakefetch.mjs'), join(PAKET, 'apply.mjs')], { env: ENV_BASIS('', { PRUEFEN: '1', APPLY_ZEIT: '1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((res) => setTimeout(res, 1500)); kind.kill('SIGINT');
    const code = await new Promise((res) => { kind.on('exit', (c) => res(c)); setTimeout(() => kind.kill('SIGKILL'), 20000); });
    gleich(code, 130, 'SIGINT vor dem Schreiben: Exit 130'); keinSchreiben('SIGINT vor dem Schreiben');
  }
} finally {
  rmSync(D, { recursive: true, force: true });
}
console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
