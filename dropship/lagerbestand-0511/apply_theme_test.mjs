// Test für apply_theme.mjs (das Skript, das den Lieferblock live in templates/product.json schreibt) gegen eine Attrappe der Theme-API
// und der Storefront. Kein Netz, kein Shopify.
//   node dropship/lagerbestand-0511/apply_theme_test.mjs          (FAILFAST=1: beim ersten Fehler abbrechen; wird von der Mutationsprobe benutzt)
// Die Attrappe (shopify_gql.mjs im Wegwerfordner) hält die Vorlagen in einer JSON-Datei, kennt die Abfragen des Skripts und kann gezielt Fehler machen
// (FAKE=a,b,c): userErrors, abweichende Speicherung, Ausnahme nach dem Schreiben, verzögertes Rücklesen, Datei als URL, fehlende Prüfsumme ...
// Die Storefront-Attrappe (fakefetch.mjs, per --import) rendert Produktseiten aus dem Blocktext der gespeicherten Vorlage: Marker im Blocktext
// (FAKE_LIQUIDFEHLER, FAKE_500, FAKE_LEER, FAKE_NETZ, FAKE_HANG) lösen die jeweiligen Seitenfehler aus. APPLY_ZEIT=0.001 verkürzt alle Wartezeiten.
// Ausgangsstand ist die echte Datei sicherung/product.json.vor (MAIN-Theme vom 05.11.2026); der neue Blocktext ist hier ein Platzhalter mit Sonderzeichen.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import * as S from './apply_theme.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const FAILFAST = process.env.FAILFAST === '1';
let n = 0, fehler = 0, letzteAus = '';
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); if (process.env.ZEIGE) console.log(letzteAus.split('\n').slice(-40).map((z) => '      | ' + z).join('\n')); if (FAILFAST) { console.log(`${n} Prüfungen, ${fehler} Fehler`); process.exit(1); } } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const wirft = (f, code, muster, text) => { try { f(); ok(false, text + ': hat nicht geworfen'); } catch (e) { ok(e.code === code && (!muster || muster.test(e.message)), `${text}: Code ${e.code}, Meldung ${e.message.slice(0, 120)}`); } };

const D_ = S.DATEI, T_ = S.TESTDATEI;
const ORIG = readFileSync(HIER + 'sicherung/product.json.vor', 'utf8');
const ALT = readFileSync(HIER + 'lux_delivery.alt.liquid', 'utf8');
const NEU_KERN = [
  "{%- comment -%} NEU-PLATZHALTER: Sonderzeichen $& $' $` $1 $$ \\ \\\\ \"zitat\" 'a' ü ö ß « » 🚚 </script> {%- endcomment -%}",
  '{%- assign lx = 1 -%}',
  '{%- if lx == 1 -%}',
  '<div class="x">Bestelle jetzt – Lieferung voraussichtlich NEU</div>',
  '{%- endif -%}',
].join('\n');
const neuMit = (zusatz = '') => NEU_KERN + zusatz;

// ---------- 0. Ausgangslage ----------
ok(md5(ORIG) === S.MD5_VOR, 'Sicherung im Repo gleich MD5_VOR');
ok(md5(ALT) === S.ALT_MD5, 'lux_delivery.alt.liquid gleich ALT_MD5');
ok(S.blockWert(ORIG) === ALT, 'Block in der Sicherung gleich lux_delivery.alt.liquid');
ok(S.pruefeNeu(NEU_KERN).length === 0, 'Platzhalter-Block besteht die Eingabeprüfung');

// ---------- 1. reine Funktionen ----------
{
  // jsonStart / parseVorlage
  gleich(S.jsonStart('{"a":1}'), 0, 'jsonStart ohne Kommentar');
  gleich(S.jsonStart('/* x */\n{"a":1}'), 8, 'jsonStart mit Kommentar');
  gleich(S.parseVorlage('/*\n * x\n */\n{"a":1}'), { a: 1 }, 'parseVorlage mit Kommentar');
  // blockWert: Pfad, Typ, Wert
  const vorlage = (typ, wert) => JSON.stringify({ sections: { main: { blocks: { 'product-details': { blocks: { lux_delivery: { type: typ, settings: { custom_liquid: wert } } } } } } } });
  gleich(S.blockWert(vorlage('custom-liquid', 'abc')), 'abc', 'blockWert');
  wirft(() => S.blockWert(vorlage('text', 'abc')), 4, /kein custom-liquid/, 'blockWert falscher Typ');
  wirft(() => S.blockWert(vorlage('custom-liquid', 5)), 4, /kein Text/, 'blockWert kein Text');
  wirft(() => S.blockWert('{"sections":{}}'), 4, /Block fehlt/, 'blockWert Pfad fehlt');
  // ersetzen: genau ein Treffer, Sonderzeichen werden nicht als Ersatzmuster gedeutet
  const v1 = '/* kopf */\n' + vorlage('custom-liquid', 'alt "x" <b>');
  const e1 = S.ersetzen(v1, 'alt "x" <b>', "neu $& $' $` $1 \\ \n 🚚");
  ok(e1.text === v1.slice(0, e1.index) + JSON.stringify("neu $& $' $` $1 \\ \n 🚚") + v1.slice(e1.index + e1.altLaenge), 'ersetzen: Text exakt prefix + JSON-String + suffix');
  ok(S.blockWert(e1.text) === "neu $& $' $` $1 \\ \n 🚚", 'ersetzen: Block trägt den neuen Text (Ersatzmuster wirkungslos)');
  ok(e1.text.startsWith('/* kopf */\n{"sections"'), 'ersetzen: Kommentar am Anfang bleibt');
  // Maskierung nicht gefunden (0 Treffer) und Hinweis auf andere Maskierung
  wirft(() => S.ersetzen(v1.replace('<b>', '\\u003cb\\u003e'), 'alt "x" <b>', 'neu'), 5, /kommt 0× .*anderer Maskierung/, 'ersetzen: 0 Treffer mit Hinweis');
  wirft(() => S.ersetzen(v1.replace('<b>', '\\/b'), 'alt "x" <b>', 'neu'), 5, /kommt 0×/, 'ersetzen: 0 Treffer');
  // mehrdeutig (2 Treffer)
  ok(/\}{8}$/.test(v1), 'Testaufbau: acht schliessende Klammern am Ende');
  wirft(() => S.ersetzen(v1.replace(/\}{8}$/, ',"k":' + JSON.stringify('alt "x" <b>') + '}'.repeat(8)), 'alt "x" <b>', 'neu'), 5, /kommt 2×/, 'ersetzen: 2 Treffer');
  // Treffer unter fremdem Schlüssel
  wirft(() => S.ersetzen('{"x": "T", "sections": {}}', 'T', 'neu'), 5, /nicht als Wert von/, 'ersetzen: falscher Schlüssel (Kontext)');
  wirft(() => S.ersetzen('{"custom_liquid": "T"x', 'T', 'neu'), 5, /kein Ende des Wertes/, 'ersetzen: Ende des Wertes');
  // diffStat
  gleich(S.diffStat('a\nb\nc', 'a\nX\nY\nc'), { zeilenAlt: 3, zeilenNeu: 4, gleichAnfang: 1, gleichEnde: 1, entfernt: 1, hinzu: 2 }, 'diffStat');
  gleich(S.diffStat('a', 'a'), { zeilenAlt: 1, zeilenNeu: 1, gleichAnfang: 1, gleichEnde: 0, entfernt: 0, hinzu: 0 }, 'diffStat gleich');
  // sicherungsName
  gleich(S.sicherungsName(S.MD5_VOR), 'product.json.vor', 'sicherungsName Ausgangsstand');
  gleich(S.sicherungsName('abcdef0123456789abcdef0123456789'), 'product.json.vor-abcdef01', 'sicherungsName fremd');
  // liquidBalance
  ok(S.liquidBalance(ALT).ok && S.liquidBalance(NEU_KERN).ok, 'liquidBalance: alter und Platzhalter-Block in Ordnung');
  ok(!S.liquidBalance('{% if a %}x').ok, 'liquidBalance: if ohne endif');
  ok(!S.liquidBalance('{% if a %}x{% endfor %}').ok, 'liquidBalance: falsches Ende');
  ok(!S.liquidBalance('{% if a %}x{% endif ').ok, 'liquidBalance: abgeschnittenes Tag');
  ok(!S.liquidBalance('{{ x ').ok, 'liquidBalance: abgeschnittene Ausgabe');
  ok(S.liquidBalance('{% comment %}{% if a %}{% endcomment %}x').ok, 'liquidBalance: Tags im Kommentar zählen nicht');
  ok(!S.liquidBalance('{% liquid\n assign a = 1 %}').ok, 'liquidBalance: Tag liquid wird abgelehnt');
  // pruefeNeu
  ok(S.pruefeNeu('').length === 1 && S.pruefeNeu('  \n').length === 1, 'pruefeNeu: leer');
  ok(S.pruefeNeu('a\uFFFDb').some((x) => /U\+FFFD/.test(x)), 'pruefeNeu: U+FFFD');
  ok(S.pruefeNeu('a\u0000b').some((x) => /NUL/.test(x)), 'pruefeNeu: NUL');
  ok(S.pruefeNeu('\uFEFF' + NEU_KERN).some((x) => /U\+FEFF/.test(x)), 'pruefeNeu: Byte-Order-Mark am Anfang');
  ok(S.pruefeNeu('x'.repeat(120001)).some((x) => /120 KB/.test(x)), 'pruefeNeu: zu gross');
  ok(S.pruefeNeu('{% if a %}').some((x) => /Liquid unplausibel/.test(x)), 'pruefeNeu: Liquid unplausibel');
  // Seitenauswertung
  gleich(S.analysiereSeite('<p>Lieferung voraussichtlich 6. Nov.</p>' + S.TESTMARKE), { fehler: [], art: 'box', ausverk: false, marke: true }, 'analysiereSeite Lieferbox + Marke');
  gleich(S.analysiereSeite('Momentan ausverkauft <p>Lieferung voraussichtlich 6. Nov.</p>'), { fehler: [], art: 'box', ausverk: true, marke: false }, 'analysiereSeite: ausverkauft UND Lieferbox (alter Block bei ausverkaufter Ausführung)');
  gleich(S.analysiereSeite('Diese Ausführung ist ausverkauft').ausverk, true, 'analysiereSeite: ausverk bei «Diese Ausführung ist ausverkauft»');
  gleich(S.analysiereSeite('Momentan ausverkauft').art, 'aus', 'analysiereSeite ausverkauft');
  gleich(S.analysiereSeite('Diese Ausführung ist ausverkauft').art, 'aus', 'analysiereSeite Ausführung ausverkauft');
  gleich(S.analysiereSeite('Lieferung nach Liechtenstein: x').art, 'box', 'analysiereSeite Liechtenstein');
  gleich(S.analysiereSeite('nichts').art, 'kein', 'analysiereSeite nichts');
  {
    // Ausverkauft-Zweig des neuen Blocks: der versteckte Satz ist keine Lieferbox (sonst bliebe der Alarm «kaufbar -> ausverkauft» stumm)
    const SPAN_T = '<span hidden data-lx-kein-liefertermin>Lieferung voraussichtlich: erst wieder, wenn diese Ausführung lieferbar ist.</span>';
    gleich(S.analysiereSeite('<div>Diese Ausführung ist ausverkauft</div>' + SPAN_T), { fehler: [], art: 'aus', ausverk: true, marke: false }, 'analysiereSeite: versteckter Satz zählt nicht als Lieferbox (Ausführung)');
    gleich(S.analysiereSeite('<div>Momentan ausverkauft</div>' + SPAN_T).art, 'aus', 'analysiereSeite: versteckter Satz zählt nicht als Lieferbox (Produkt)');
    gleich(S.analysiereSeite('<div>Diese Ausführung ist ausverkauft</div><span data-lx-kein-liefertermin hidden="">Lieferung voraussichtlich: erst wieder.</span>').art, 'aus', 'analysiereSeite: versteckter Satz mit anderer Attributreihenfolge');
    gleich(S.analysiereSeite('<p>Lieferung voraussichtlich 6. Nov.</p><div>Momentan ausverkauft</div>' + SPAN_T).art, 'box', 'analysiereSeite: eine echte Lieferbox neben dem versteckten Satz bleibt «box»');
    gleich(S.analysiereSeite('<div>Auf Lager</div>' + SPAN_T).art, 'kein', 'analysiereSeite: nur der versteckte Satz, sonst nichts: kein Lieferblock');
    gleich(S.analysiereSeite('<div>Auf Lager</div>' + SPAN_T + '<p><span>Lieferung nach Liechtenstein: x</span></p>').art, 'box', 'analysiereSeite: nur der Span wird abgezogen, nicht alles bis zum letzten </span> der Seite');
    gleich(S.bewerte({ status: 200, marke: false, ...S.analysiereSeite('<div>Diese Ausführung ist ausverkauft</div>' + SPAN_T) }, { fehler: [], art: 'box', ausverk: false }), ['Lieferblock zeigt «aus» statt «box»'], 'bewerte: vorher kaufbar (box), nachher ausverkauft meldet Alarm trotz verstecktem Satz');
    gleich(S.bewerte({ status: 200, marke: false, ...S.analysiereSeite('<div>Momentan ausverkauft</div>' + SPAN_T) }, { fehler: [], art: 'aus', ausverk: true }), [], 'bewerte: vorher schon ausverkauft, nachher ausverkauft mit verstecktem Satz: kein Alarm');
  }
  gleich(S.analysiereSeite('Liquid error A\nLiquid error A\nLiquid syntax error B <p>Liquid error C</p>').fehler, ['Liquid error A', 'Liquid syntax error B ', 'Liquid error C'], 'analysiereSeite: Liquid-Fehler entdoppelt, Zeilenende und Tag begrenzen');
  const gut = { status: 200, fehler: [], art: 'box', marke: false };
  gleich(S.bewerte(gut, { fehler: [], art: 'box' }), [], 'bewerte: in Ordnung');
  ok(S.bewerte({ ...gut, status: 500 }, { fehler: [], art: 'box' }).some((x) => /HTTP 500/.test(x)), 'bewerte: HTTP 500');
  ok(S.bewerte({ ...gut, status: 0, netz: 'Netzfehler: x' }, null).some((x) => /Netzfehler/.test(x)), 'bewerte: Netzfehler');
  ok(S.bewerte({ ...gut, fehler: ['Liquid error: a'] }, { fehler: [], art: 'box' }).some((x) => /Liquid-Fehler/.test(x)), 'bewerte: neuer Liquid-Fehler');
  gleich(S.bewerte({ ...gut, fehler: ['Liquid error: a'] }, { fehler: ['Liquid error: a'], art: 'box' }), [], 'bewerte: schon vorher vorhandener Liquid-Fehler ist kein neuer');
  ok(S.bewerte({ ...gut, fehler: ['Liquid error: a'] }, null).length === 1, 'bewerte: absolut, Liquid-Fehler zählt');
  gleich(S.bewerte({ ...gut, fehler: ['Liquid error: a'] }, null, { vorfehlerOk: true }), [], 'bewerte: absolut mit vorfehlerOk');
  ok(S.bewerte({ ...gut, art: 'kein' }, { fehler: [], art: 'box' }).some((x) => /Lieferblock/.test(x)), 'bewerte: Lieferblock verschwunden');
  // ausverkaufte Ausführung: box -> aus ist gewollt (der neue Block lässt die Lieferbox weg), aber nur wenn «ausverkauft» vorher UND nachher dasteht
  gleich(S.bewerte({ ...gut, art: 'aus', ausverk: true }, { fehler: [], art: 'box', ausverk: true }), [], 'bewerte: ausverkauft vorher und nachher, Lieferbox weg = gewollt');
  ok(S.bewerte({ ...gut, art: 'aus', ausverk: true }, { fehler: [], art: 'box', ausverk: false }).some((x) => /Lieferblock zeigt «aus» statt «box»/.test(x)), 'bewerte: nachher ausverkauft, vorher nicht = Abweichung');
  ok(S.bewerte({ ...gut, art: 'kein', ausverk: false }, { fehler: [], art: 'box', ausverk: true }).some((x) => /Lieferblock zeigt «kein»/.test(x)), 'bewerte: vorher ausverkauft, nachher gar kein Block = Abweichung');
  ok(S.bewerte({ ...gut, art: 'box', ausverk: false }, { fehler: [], art: 'aus', ausverk: true }).some((x) => /statt «aus»/.test(x)), 'bewerte: Lieferbox erscheint plötzlich bei vorher ausverkaufter Seite = Abweichung ausserhalb der Ausnahme');
  gleich(S.bewerte({ ...gut, art: 'kein' }, { fehler: [], art: 'kein' }), [], 'bewerte: Seite ohne Block bleibt ohne Block');
  ok(S.bewerte(gut, { fehler: [], art: 'box' }, { marke: true }).some((x) => /Testmarke/.test(x)), 'bewerte: Testmarke fehlt');
}

// ---------- Wegwerf-Umgebung ----------
const D = mkdtempSync(join(tmpdir(), 'lxapplytheme-'));
const PAKET = join(D, 'dropship/lagerbestand-0511');
const SICH = join(PAKET, 'sicherung'), MERK = join(SICH, 'eingespielt.json');
mkdirSync(join(D, 'automation/lib'), { recursive: true });
mkdirSync(SICH, { recursive: true });
const WURZEL = join(HIER, '../..');
cpSync(join(WURZEL, 'automation/lib/shopify_host.mjs'), join(D, 'automation/lib/shopify_host.mjs'));
cpSync(HIER + 'apply_theme.mjs', join(PAKET, 'apply_theme.mjs'));
cpSync(HIER + 'lux_delivery.alt.liquid', join(PAKET, 'lux_delivery.alt.liquid'));
writeFileSync(join(D, 'automation/lib/shopify_secret.mjs'), 'export const shopifyClientSecret = (s) => s;\n');
writeFileSync(join(D, 'automation/lib/shopify_gql.mjs'), `
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ST = process.env.SIM_STATE, F = new Set((process.env.FAKE || '').split(',').filter(Boolean));
const md5 = (s) => createHash('md5').update(s).digest('hex');
const load = () => JSON.parse(readFileSync(ST, 'utf8')), save = (s) => writeFileSync(ST, JSON.stringify(s));
export async function shopifyGql(shop, api, tok, query, vars) {
  const s = load();
  if (query.includes('themes(first:5')) return { themes: { nodes: F.has('keinmain') ? [] : F.has('zweimain') ? [{ id: 'gid://fake/1', name: 'fake' }, { id: 'gid://fake/2', name: 'fake2' }] : [{ id: 'gid://fake/1', name: 'fake' }] } };
  if (query.includes('products(first')) { s.produktAnfragen = (s.produktAnfragen || 0) + 1; save(s); return { f: { nodes: [{ handle: 'fortura-test' }] }, c: { nodes: [{ handle: 'cj-test' }] }, a: { nodes: [{ handle: 'fortura-test' }, { handle: 'zufall-test' }] } }; }
  if (query.includes('files(filenames')) {
    s.stale = s.stale || {}; let geaendert = false; const nodes = [];
    for (const n of vars.f) {
      let c = s.files[n]; const st = s.stale[n];
      if (st && st.rest > 0) { st.rest--; geaendert = true; c = st.text; }
      if (c == null) continue;
      const url = F.has('url') && n === 'templates/product.json';
      nodes.push({ filename: n, size: Buffer.byteLength(c), checksumMd5: F.has('nocsum') ? null : F.has('csumfalsch') ? md5(c + 'x') : md5(c),
        body: url ? { __typename: 'OnlineStoreThemeFileBodyUrl', url: 'https://fake.invalid/' + n } : { __typename: 'OnlineStoreThemeFileBodyText', content: c } });
    }
    if (geaendert) save(s);
    return { theme: { files: { nodes } } };
  }
  if (query.includes('themeFilesUpsert')) {
    s.calls = s.calls || []; s.calls.push({ op: 'upsert', files: vars.files.map((f) => f.filename) });
    const nr = s.calls.filter((c) => c.op === 'upsert').length, errs = [];
    for (const f of vars.files) {
      let v = f.body.value;
      if (F.has('usererr') || (F.has('rueckweg_kaputt') && nr >= 2)) { errs.push({ filename: f.filename, message: 'FAKE Syntaxfehler' }); continue; }
      if (F.has('usererr_dirty') && nr === 1) errs.push({ filename: f.filename, message: 'FAKE userError (trotzdem geschrieben)' });
      if ((F.has('norm') && v.includes('NEU-PLATZHALTER')) || F.has('norm_alles')) v += '\\n';
      if (F.has('verzug')) { s.stale = s.stale || {}; s.stale[f.filename] = { text: s.files[f.filename], rest: 3 }; }
      s.files[f.filename] = v;
    }
    save(s);
    if (F.has('throwafter') && nr === 1) throw new Error('GraphQL: fetch failed (FAKE)');
    return { themeFilesUpsert: { upsertedThemeFiles: vars.files.filter((f) => !errs.some((e) => e.filename === f.filename)).map((f) => ({ filename: f.filename })), userErrors: errs } };
  }
  if (query.includes('themeFilesDelete')) {
    s.calls = s.calls || []; s.calls.push({ op: 'delete', files: vars.f });
    if (F.has('delerr')) { save(s); return { themeFilesDelete: { deletedThemeFiles: [], userErrors: [{ filename: vars.f[0], message: 'FAKE' }] } }; }
    if (F.has('verzug')) { s.stale = s.stale || {}; for (const n of vars.f) s.stale[n] = { text: s.files[n], rest: 3 }; }
    if (!F.has('delstuck')) for (const n of vars.f) delete s.files[n];
    save(s);
    return { themeFilesDelete: { deletedThemeFiles: vars.f.map((n) => ({ filename: n })), userErrors: [] } };
  }
  throw new Error('FAKE: unbekannte Abfrage ' + query.slice(0, 60));
}
`);
writeFileSync(join(D, 'fakefetch.mjs'), `
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ST = process.env.SIM_STATE, F = new Set((process.env.FAKE || '').split(',').filter(Boolean)), ORIG = process.env.ORIG_MD5, MARKE = ${JSON.stringify(S.TESTMARKE)};
const md5 = (s) => createHash('md5').update(s).digest('hex');
const save = (s) => writeFileSync(ST, JSON.stringify(s));
const block = (text) => JSON.parse(text.replace(/^\\s*\\/\\*[\\s\\S]*?\\*\\/\\s*/, '')).sections.main.blocks['product-details'].blocks.lux_delivery.settings.custom_liquid;
globalThis.fetch = async (u, opt) => {
  u = String(u);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'fake' }), { status: 200 });
  if (u.startsWith('https://fake.invalid/')) { const s = JSON.parse(readFileSync(ST, 'utf8')); return new Response(s.files[decodeURIComponent(u.slice('https://fake.invalid/'.length))], { status: 200 }); }
  if (!u.startsWith('https://shop.test')) throw new Error('FAKE-Sperre: echter Netzzugriff ' + u);
  const s = JSON.parse(readFileSync(ST, 'utf8')), url = new URL(u), view = url.searchParams.get('view');
  s.urls = s.urls || []; s.urls.push(url.pathname + url.search);
  if (F.has('editor_waehrend') && s.urls.length === 2 && !(s.calls || []).length) s.files['templates/product.json'] += '\\n';   // der Theme-Editor speichert mitten in der Seitenmessung
  const istOrig = md5(s.files['templates/product.json']) === ORIG;
  if (!istOrig) s.nachher = (s.nachher || 0) + 1;
  if (F.has('drossel')) { s.drossel = s.drossel || {}; if (!s.drossel[u]) { s.drossel[u] = 1; save(s); return new Response('', { status: 429 }); } }
  if (url.pathname === '/') { save(s); if (F.has('start500_nachher') && !istOrig) return new Response('Fehler', { status: 500 }); return new Response('<html>Start</html>', { status: 200 }); }
  let name = 'templates/product.json';
  if (view === 'lxtest' && s.files['templates/product.lxtest.json']) { s.lxcount = (s.lxcount || 0) + 1; if (!(F.has('lxverzug') && s.lxcount <= 3)) name = 'templates/product.lxtest.json'; }
  save(s);
  const b = block(s.files[name]), geschrieben = (s.calls || []).some((c) => c.op === 'upsert');
  if (b.includes('FAKE_NETZ')) throw new TypeError('fetch failed');
  if (b.includes('FAKE_500')) return new Response('Fehler', { status: 500 });
  if (b.includes('FAKE_HANG')) await new Promise((_, rej) => { setInterval(() => {}, 1000); opt && opt.signal && opt.signal.addEventListener('abort', () => rej(opt.signal.reason)); });
  let body = '<html><body>';
  if (!b.includes('FAKE_LEER') && b.includes('Lieferung voraussichtlich') && !(F.has('blockblind_vorher') && istOrig)) body += 'Bestelle jetzt – Lieferung voraussichtlich 6. Nov.';
  if (F.has('soldout_wechsel')) { body = '<html><body>'; if (!b.includes('FAKE_LEER')) body += 'Momentan ausverkauft'; if (istOrig && name === 'templates/product.json') body += 'Bestelle jetzt – Lieferung voraussichtlich 6. Nov.'; }   // wie der echte alte Block: Pille UND Lieferbox; der neue: nur die Pille
  if (b.includes(MARKE)) body += MARKE;
  if (b.includes('FAKE_LIQUIDFEHLER') || (F.has('seitenfehler_vorher') && istOrig) || (F.has('runde2fehler') && !istOrig && s.nachher > 4) || (F.has('seiten_kaputt_nach_write') && geschrieben)) body += "Liquid error (templates/product line 12): Unknown tag 'x'";
  return new Response(body + '</body></html>', { status: 200 });
};
`);
const STATE = join(D, 'state.json');
const SCRIPT = join(PAKET, 'apply_theme.mjs'), NEU = join(PAKET, 'lux_delivery.neu.liquid');
const stand = () => JSON.parse(readFileSync(STATE, 'utf8'));
const dateien = () => stand().files;
const calls = () => stand().calls || [];
const upserts = () => calls().filter((c) => c.op === 'upsert').map((c) => c.files);
// frischer Ausgangsstand: Vorlage = Sicherung aus dem Repo, Merkliste weg, Sicherungen aus früheren Szenarien weg, neuer Blocktext = Platzhalter
function neuerStand({ vorlage = ORIG, neu = NEU_KERN, extra = {} } = {}) {
  writeFileSync(STATE, JSON.stringify({ files: { [D_]: vorlage, ...extra }, calls: [] }));
  rmSync(MERK, { force: true });
  for (const f of readdirSync(SICH)) rmSync(join(SICH, f), { force: true });
  writeFileSync(join(SICH, 'product.json.vor'), ORIG);
  writeFileSync(NEU, neu);
  cpSync(HIER + 'apply_theme.mjs', SCRIPT);
}
const umgebung = (fake, env, skript) => ({ PATH: process.env.PATH, HOME: process.env.HOME, SIM_STATE: STATE, FAKE: fake, ORIG_MD5: md5(ORIG), SHOPIFY_SHOP: 'fake.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', APPLY_ZEIT: '0.001', STOREFRONT: 'https://shop.test', ...env });
const lauf = (fake, env = {}, skript = SCRIPT) => {
  const r = spawnSync(process.execPath, ['--import', join(D, 'fakefetch.mjs'), skript], { encoding: 'utf8', timeout: 90000, env: umgebung(fake, env) });
  letzteAus = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, aus: letzteAus };
};
const laufSignal = (fake, env, warteAuf, signal) => new Promise((fertig) => {
  const k = spawn(process.execPath, ['--import', join(D, 'fakefetch.mjs'), SCRIPT], { env: umgebung(fake, env) });
  let aus = '', gesendet = false;
  const hin = (d) => { aus += d; if (!gesendet && warteAuf.test(aus)) { gesendet = true; k.kill(signal); } };
  k.stdout.on('data', hin); k.stderr.on('data', hin);
  const wache = setTimeout(() => { k.kill('SIGKILL'); }, 60000);
  k.on('close', (code, sig) => { clearTimeout(wache); fertig({ code: code ?? (sig ? 'signal:' + sig : null), aus, gesendet }); });
});
const istOrig = () => dateien()[D_] === ORIG;
// Soll-Vorlage unabhängig gerechnet: genau die eine Zeile mit dem Blocktext wird ersetzt
const sollVorlage = (vorlage, alt, neu) => {
  const zeilen = vorlage.split('\n'), roh = JSON.stringify(alt);
  const idx = zeilen.map((z, i) => (z.includes(roh) ? i : -1)).filter((i) => i >= 0);
  if (idx.length !== 1) throw new Error('Testfehler: Blockzeile nicht eindeutig');
  const z = zeilen[idx[0]], k = z.indexOf(roh);
  zeilen[idx[0]] = z.slice(0, k) + JSON.stringify(neu) + z.slice(k + roh.length);
  return zeilen.join('\n');
};
// patcht MD5_VOR im Skript, damit ein verändertes Wegwerf-Original als «erwarteter Ausgangsstand» gilt
const mitMd5Vor = (md5neu) => { const t = readFileSync(HIER + 'apply_theme.mjs', 'utf8'); const p = join(PAKET, 'apply_theme_md5.mjs'); const t2 = t.replace(/export const MD5_VOR = '[0-9a-f]{32}'/, `export const MD5_VOR = '${md5neu}'`); if (t2 === t) throw new Error('Testfehler: MD5_VOR nicht gefunden'); writeFileSync(p, t2); return p; };
const einmal = (t, a, b) => { const i = t.indexOf(a); if (i < 0 || t.indexOf(a, i + 1) >= 0) throw new Error('Testfehler: Muster nicht genau einmal: ' + a.slice(0, 40)); return t.slice(0, i) + b + t.slice(i + a.length); };
const blockZeile = () => ORIG.split('\n').findIndex((z) => z.includes(JSON.stringify(ALT)));

try {
  ok(blockZeile() > 0, 'Testaufbau: Blockzeile in der Sicherung gefunden');

  // ----- 1. Trockenlauf schreibt nichts -----
  neuerStand(); let r = lauf('');
  gleich(r.code, 0, 'Trockenlauf: Exit'); gleich(calls(), [], 'Trockenlauf: keine Schreib- oder Löschaufrufe'); ok(istOrig(), 'Trockenlauf: Vorlage unverändert'); ok(!existsSync(MERK), 'Trockenlauf: keine Merkliste');
  ok(/Trockenlauf, nichts geschrieben/.test(r.aus) && /Diff-Statistik/.test(r.aus) && /Byte-Vergleich bestanden/.test(r.aus), 'Trockenlauf: Meldung und Diff-Statistik');
  ok(/Datei: +\d+ -> \d+ Byte \([+-]\d+\)/.test(r.aus) && /Prüfsumme: +[0-9a-f]{32} -> Soll [0-9a-f]{32}/.test(r.aus), 'Trockenlauf: Grössen und Prüfsummen in der Statistik');
  ok(!(stand().urls || []).length, 'Trockenlauf ohne PRUEFEN: keine Seitenabrufe'); ok(/Empfehlung: vor LIVE=1 erst TESTVORLAGE=1 LIVE=1/.test(r.aus), 'Trockenlauf: Hinweis auf die Testvorlage');
  // 1b. Trockenlauf mit Seitenmessung
  neuerStand(); r = lauf('', { PRUEFEN: '1' });
  gleich(r.code, 0, 'Trockenlauf PRUEFEN: Exit'); ok(/Seiten jetzt/.test(r.aus) && /Lieferblock box/.test(r.aus), 'Trockenlauf PRUEFEN: Seiten gemessen'); gleich(calls(), [], 'Trockenlauf PRUEFEN: nichts geschrieben');
  // 1c. Trockenlauf legt keine Sicherung an: fehlt sie, bleibt sie fehlend
  neuerStand(); rmSync(join(SICH, 'product.json.vor')); r = lauf('');
  gleich(r.code, 0, 'Trockenlauf ohne Sicherung: Exit'); ok(!existsSync(join(SICH, 'product.json.vor')) && /fehlt noch/.test(r.aus), 'Trockenlauf legt die Sicherung nicht an');

  // ----- 2. Einspielen: genau eine Datei, genau eine Stelle -----
  neuerStand(); r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'LIVE: Exit'); gleich(upserts(), [[D_]], 'LIVE: genau ein Schreibaufruf mit genau einer Datei');
  const soll = sollVorlage(ORIG, ALT, NEU_KERN);
  ok(dateien()[D_] === soll, 'LIVE: Vorlage gleich der unabhängig gerechneten Soll-Vorlage');
  {
    const a = ORIG.split('\n'), b = dateien()[D_].split('\n'), abw = a.map((z, i) => (z === b[i] ? -1 : i)).filter((i) => i >= 0);
    gleich(a.length, b.length, 'LIVE: gleich viele Zeilen'); gleich(abw, [blockZeile()], 'LIVE: genau eine Zeile weicht ab, und zwar die des Blocktexts');
    ok(Buffer.compare(Buffer.from(a.slice(0, blockZeile()).join('\n')), Buffer.from(b.slice(0, blockZeile()).join('\n'))) === 0, 'LIVE: alles vor der Blockzeile Byte-gleich (inkl. Kommentar am Dateianfang)');
    ok(Buffer.compare(Buffer.from(a.slice(blockZeile() + 1).join('\n')), Buffer.from(b.slice(blockZeile() + 1).join('\n'))) === 0, 'LIVE: alles nach der Blockzeile Byte-gleich');
    ok(b[0] === a[0] && b[0].startsWith('/*'), 'LIVE: Kommentar am Dateianfang unverändert');
    ok(S.blockWert(dateien()[D_]) === NEU_KERN, 'LIVE: Block trägt den neuen Text mit allen Sonderzeichen ($&, $\', Rückstrich, Emoji)');
  }
  ok(existsSync(MERK), 'LIVE: Merkliste angelegt');
  { const m = JSON.parse(readFileSync(MERK, 'utf8')); gleich([m.md5_vor, m.md5_soll, m.sicherung, m.datei, m.fremd], [S.MD5_VOR, md5(soll), 'product.json.vor', D_, false], 'LIVE: Merkliste mit Prüfsummen, Sicherung und Datei'); gleich([m.bytes_vor, m.bytes_soll, m.block_md5_vor, m.block_md5_neu], [Buffer.byteLength(ORIG), Buffer.byteLength(soll), md5(ALT), md5(NEU_KERN)], 'LIVE: Merkliste mit Grössen und Block-Prüfsummen'); }
  ok(readFileSync(join(SICH, 'product.json.vor'), 'utf8') === ORIG, 'LIVE: Sicherung gleich dem Ausgangsstand');
  ok(/rücklesen GLEICH/.test(r.aus) && /Seiten vorher/.test(r.aus) && /Runde 1 von 2/.test(r.aus) && /Runde 2 von 2/.test(r.aus) && /Fertig:/.test(r.aus), 'LIVE: Rücklesen, Seiten vorher, zwei Runden nachher, Fertig');
  ok(/Rückweg, falls nötig: ZURUECK=1 LIVE=1/.test(r.aus), 'LIVE: nennt den Rückweg vor dem Schreiben');
  ok(!/ABWEICHUNG|FEHLER/.test(r.aus), 'LIVE: keine Abweichung, kein Fehler');
  { const u = stand().urls; ok(u.includes('/') && u.includes('/products/fortura-test') && u.includes('/products/cj-test') && u.includes('/products/zufall-test'), 'LIVE: Startseite und drei Produktseiten abgerufen'); ok(u.filter((x) => x === '/').length === 3, 'LIVE: Startseite einmal vorher und zweimal nachher'); }

  // ----- 3. Zweites Einspielen wird abgelehnt -----
  let v = upserts().length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'zweites LIVE: Exit 3'); gleich(upserts().length, v, 'zweites LIVE: nichts geschrieben'); ok(/Schon eingespielt/.test(r.aus) && /ZURUECK=1/.test(r.aus), 'zweites LIVE: Meldung mit Rücknahme');
  // 3b. Blockdatei seitdem geändert: die Prüfsumme der Merkliste erkennt den eingespielten Stand trotzdem
  writeFileSync(NEU, NEU_KERN + '\n{%- comment -%} geändert {%- endcomment -%}'); r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'LIVE nach geänderter Blockdatei: Exit 3 (nicht 4)'); gleich(upserts().length, v, 'LIVE nach geänderter Blockdatei: nichts geschrieben'); ok(/Merkliste/.test(r.aus), 'LIVE nach geänderter Blockdatei: nennt die Merkliste');

  // ----- 4. Rücknahme nach Erfolg (die Blockdatei ist hier weiter verändert, die Merkliste trägt den Soll-Stand) -----
  r = lauf('', { ZURUECK: '1' });
  gleich(r.code, 0, 'ZURUECK Trockenlauf: Exit'); ok(/zustand .* neu /.test(r.aus) && /Trockenlauf/.test(r.aus), 'ZURUECK Trockenlauf: Zustand «neu»'); gleich(upserts().length, v, 'ZURUECK Trockenlauf: nichts geschrieben'); ok(dateien()[D_] === soll, 'ZURUECK Trockenlauf: Vorlage unverändert');
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK LIVE: Exit'); gleich(upserts().slice(v), [[D_]], 'ZURUECK: genau ein Schreibaufruf'); ok(dateien()[D_] === ORIG, 'ZURUECK: Vorlage Byte-gleich dem Ausgangsstand'); ok(/rücklesen GLEICH/.test(r.aus) && /Seiten nach der Rücknahme/.test(r.aus), 'ZURUECK: Rücklesen und Seitenprüfung');
  writeFileSync(NEU, NEU_KERN);
  // 5. Rücknahme ohne etwas zu tun
  v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK im Ausgangsstand: Exit 0'); gleich(upserts().length, v, 'ZURUECK im Ausgangsstand: nichts geschrieben'); ok(/Schon im Ausgangsstand/.test(r.aus), 'ZURUECK im Ausgangsstand: Meldung');
  // 5b. danach darf wieder eingespielt werden (der Ausgangsstand gilt wieder)
  r = lauf('', { LIVE: '1' }); gleich(r.code, 0, 'LIVE nach Rücknahme: Exit 0'); ok(dateien()[D_] === soll, 'LIVE nach Rücknahme: Soll-Stand');

  // ----- 6. Rücknahme ohne Merkliste: Soll wird aus Sicherung und Blockdatei neu gerechnet -----
  neuerStand(); lauf('', { LIVE: '1' }); rmSync(MERK, { force: true });
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK ohne Merkliste: Exit'); ok(istOrig(), 'ZURUECK ohne Merkliste: Ausgangsstand hergestellt');
  neuerStand(); lauf('', { LIVE: '1' }); rmSync(MERK, { force: true }); writeFileSync(NEU, NEU_KERN + '\n{%- comment -%} anders {%- endcomment -%}');
  v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'ZURUECK ohne Merkliste bei geänderter Blockdatei: Exit 3 (fremd)'); gleich(upserts().length, v, 'ZURUECK ohne Merkliste bei geänderter Blockdatei: nichts geschrieben');
  // ZURUECK ohne Merkliste und ohne Blockdatei
  rmSync(NEU); r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 4, 'ZURUECK ohne Merkliste und ohne Blockdatei: Exit 4');

  // ----- 7. Rücknahme verweigert einen fremd veränderten Stand -----
  neuerStand(); lauf('', { LIVE: '1' });
  { const st = stand(); st.files[D_] += '\n'; writeFileSync(STATE, JSON.stringify(st)); }
  v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'ZURUECK bei fremd verändertem Stand: Exit 3'); gleich(upserts().length, v, 'ZURUECK bei fremd verändertem Stand: nichts geschrieben'); ok(/FREMD_UEBERSCHREIBEN=1/.test(r.aus), 'ZURUECK bei fremd verändertem Stand: nennt den Ausweg');
  r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 0, 'FREMD_UEBERSCHREIBEN=1 bei Rücknahme: Exit 0'); ok(istOrig(), 'FREMD_UEBERSCHREIBEN=1 bei Rücknahme: Ausgangsstand hergestellt');

  // ----- 8. Ausgangsstand weicht ab -----
  neuerStand({ vorlage: ORIG + '\n' }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremder Ausgangsstand: Exit 4'); gleich(calls(), [], 'fremder Ausgangsstand: nichts geschrieben'); ok(!existsSync(MERK), 'fremder Ausgangsstand: keine Merkliste'); ok(/weicht vom erwarteten Ausgangsstand ab/.test(r.aus), 'fremder Ausgangsstand: Meldung');
  // mit FREMD_UEBERSCHREIBEN=1: schreibt, Sicherung ist der echte Live-Stand, Rücknahme stellt IHN her
  neuerStand({ vorlage: ORIG + '\n' }); r = lauf('', { LIVE: '1', FREMD_UEBERSCHREIBEN: '1' });
  gleich(r.code, 0, 'FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(dateien()[D_] === sollVorlage(ORIG + '\n', ALT, NEU_KERN), 'FREMD_UEBERSCHREIBEN=1: Soll-Vorlage');
  { const sn = 'product.json.vor-' + md5(ORIG + '\n').slice(0, 8); ok(existsSync(join(SICH, sn)) && readFileSync(join(SICH, sn), 'utf8') === ORIG + '\n', 'FREMD_UEBERSCHREIBEN=1: Sicherung ist der tatsächliche Live-Stand'); ok(JSON.parse(readFileSync(MERK, 'utf8')).sicherung === sn && JSON.parse(readFileSync(MERK, 'utf8')).fremd === true, 'FREMD_UEBERSCHREIBEN=1: Merkliste nennt diese Sicherung'); }
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(dateien()[D_] === ORIG + '\n', 'Rücknahme nach FREMD_UEBERSCHREIBEN=1: stellt den fremden Live-Stand her');
  // Prüfsumme fehlt in der API
  neuerStand(); r = lauf('nocsum', { LIVE: '1' }); gleich(r.code, 4, 'fehlende Prüfsumme: Exit 4'); gleich(calls(), [], 'fehlende Prüfsumme: nichts geschrieben'); ok(/keine Prüfsumme/.test(r.aus), 'fehlende Prüfsumme: Meldung');
  // Sicherung weicht ab
  neuerStand(); writeFileSync(join(SICH, 'product.json.vor'), ORIG + ' '); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'verfälschte Sicherung: Exit 4'); gleich(calls(), [], 'verfälschte Sicherung: nichts geschrieben');
  // Sicherung fehlt: wird bei LIVE aus dem Live-Stand angelegt
  neuerStand(); rmSync(join(SICH, 'product.json.vor')); r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'LIVE ohne Sicherung: Exit 0'); ok(existsSync(join(SICH, 'product.json.vor')) && readFileSync(join(SICH, 'product.json.vor'), 'utf8') === ORIG, 'LIVE ohne Sicherung: legt sie aus dem Live-Stand an');
  // alt.liquid verfälscht
  neuerStand(); writeFileSync(join(PAKET, 'lux_delivery.alt.liquid'), ALT + ' '); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'verfälschte alt.liquid: Exit 4'); gleich(calls(), [], 'verfälschte alt.liquid: nichts geschrieben');
  r = lauf('', { LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 4, 'verfälschte alt.liquid trotz FREMD_UEBERSCHREIBEN=1: Exit 4'); ok(/ALT_MD5/.test(r.aus), 'verfälschte alt.liquid: Meldung nennt ALT_MD5'); gleich(calls(), [], 'verfälschte alt.liquid trotz FREMD_UEBERSCHREIBEN=1: nichts geschrieben'); writeFileSync(join(PAKET, 'lux_delivery.alt.liquid'), ALT);

  // ----- 9. Doppelte Absicherung: gleiche Datei-MD5, aber anderer Blocktext -----
  {
    const geaendert = einmal(ORIG, JSON.stringify(ALT), JSON.stringify(ALT.replace('Auf Lager', 'Auf Lagerx')));
    ok(geaendert !== ORIG, 'Testaufbau: geänderter Blocktext');
    neuerStand({ vorlage: geaendert }); const p = mitMd5Vor(md5(geaendert));
    r = lauf('', { LIVE: '1' }, p); gleich(r.code, 4, 'Datei-MD5 passt, Blocktext nicht: Exit 4'); gleich(calls(), [], 'Datei-MD5 passt, Blocktext nicht: nichts geschrieben'); ok(/nicht der erwartete alte Text/.test(r.aus), 'Datei-MD5 passt, Blocktext nicht: Meldung');
    rmSync(join(SICH, 'product.json.vor')); r = lauf('', { LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }, p); gleich(r.code, 0, 'Blocktext abweichend + FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(dateien()[D_] === sollVorlage(geaendert, ALT.replace('Auf Lager', 'Auf Lagerx'), NEU_KERN), 'FREMD_UEBERSCHREIBEN=1 ersetzt den Text, der live steht');
  }

  // ----- 10. Maskierung nicht gefunden / mehrdeutig -> Exit 5 -----
  {
    const roh = JSON.stringify(ALT), anders = einmal(ORIG, roh, roh.replace(/[<>&']/g, (c) => '\\u00' + c.charCodeAt(0).toString(16).padStart(2, '0')));
    ok(anders !== ORIG && S.blockWert(anders) === ALT, 'Testaufbau: andere Maskierung, gleicher Wert');
    neuerStand({ vorlage: anders }); const p = mitMd5Vor(md5(anders));
    r = lauf('', { LIVE: '1' }, p); gleich(r.code, 5, 'andere Maskierung: Exit 5'); gleich(calls(), [], 'andere Maskierung: nichts geschrieben'); ok(/kommt 0× im Dateitext vor/.test(r.aus) && /anderer Maskierung/.test(r.aus), 'andere Maskierung: Erklärung');
    ok(!existsSync(MERK), 'andere Maskierung: keine Merkliste');
    const zwei = einmal(ORIG, roh, roh + ',\n"kopie": ' + roh); ok(zwei !== ORIG, 'Testaufbau: zweiter Treffer');
    neuerStand({ vorlage: zwei }); r = lauf('', { LIVE: '1' }, mitMd5Vor(md5(zwei))); gleich(r.code, 5, 'zwei Treffer: Exit 5'); gleich(calls(), [], 'zwei Treffer: nichts geschrieben'); ok(/kommt 2× im Dateitext vor/.test(r.aus), 'zwei Treffer: Erklärung');
  }
  // 10b. zu grosse Vorlage
  {
    const gross = einmal(ORIG, '"sections": {', '"padding": "' + 'x'.repeat(200000) + '",\n  "sections": {'); ok(gross !== ORIG && Buffer.byteLength(gross) > 250000 - 5000, 'Testaufbau: grosse Vorlage');
    neuerStand({ vorlage: gross }); r = lauf('', { LIVE: '1' }, mitMd5Vor(md5(gross))); gleich(r.code, 4, 'zu grosse Vorlage: Exit 4'); gleich(calls(), [], 'zu grosse Vorlage: nichts geschrieben'); ok(/Grenze 250000/.test(r.aus), 'zu grosse Vorlage: Meldung');
  }

  // ----- 11. Eingabedatei des neuen Blocks -----
  neuerStand({ neu: '' }); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'leere Blockdatei: Exit 4'); gleich(calls(), [], 'leere Blockdatei: nichts geschrieben');
  neuerStand({ neu: NEU_KERN.replace('{%- endif -%}', '') }); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Block ohne endif: Exit 4'); ok(/Liquid unplausibel/.test(r.aus), 'Block ohne endif: Meldung'); gleich(calls(), [], 'Block ohne endif: nichts geschrieben');
  neuerStand({ neu: NEU_KERN.slice(0, -9) }); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'abgeschnittener Block: Exit 4');
  neuerStand(); writeFileSync(NEU, Buffer.concat([Buffer.from(NEU_KERN), Buffer.from([0xc3])])); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Block mit halbem Zeichen am Ende: Exit 4'); ok(/U\+FFFD/.test(r.aus), 'Block mit halbem Zeichen: Meldung'); gleich(calls(), [], 'Block mit halbem Zeichen: nichts geschrieben');
  neuerStand(); rmSync(NEU); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Blockdatei fehlt: Exit 4');
  neuerStand({ neu: ALT }); r = lauf('', { LIVE: '1' }); gleich(r.code, 3, 'Blockdatei gleich dem Live-Block: Exit 3 (schon eingespielt)'); gleich(calls(), [], 'Blockdatei gleich dem Live-Block: nichts geschrieben');

  // ----- 12. userErrors / Rücklesen / Ausnahme -> Rückweg -----
  neuerStand(); r = lauf('usererr', { LIVE: '1' });
  gleich(r.code, 5, 'userErrors: Exit 5'); ok(istOrig(), 'userErrors: Vorlage unverändert'); gleich(upserts(), [[D_]], 'userErrors: kein Rückweg nötig, nur der eine Versuch');
  neuerStand(); r = lauf('usererr_dirty', { LIVE: '1' });
  gleich(r.code, 5, 'userErrors trotz Schreiben: Exit 5'); ok(istOrig(), 'userErrors trotz Schreiben: zurückgeschrieben'); gleich(upserts(), [[D_], [D_]], 'userErrors trotz Schreiben: Rückweg-Aufruf'); ok(/RÜCKWEG wegen/.test(r.aus), 'userErrors trotz Schreiben: Rückweg gemeldet');
  neuerStand(); r = lauf('norm', { LIVE: '1' });
  gleich(r.code, 6, 'Rücklesen abweichend: Exit 6'); ok(istOrig(), 'Rücklesen abweichend: zurückgeschrieben, Vorlage gleich dem Ausgangsstand'); gleich(upserts(), [[D_], [D_]], 'Rücklesen abweichend: Rückweg-Aufruf'); ok(/ABWEICHUNG/.test(r.aus) && /Rückweg bestätigt/.test(r.aus), 'Rücklesen abweichend: Meldung und Bestätigung');
  ok(!/Seiten nachher/.test(r.aus), 'Rücklesen abweichend: keine Seitenprüfung des falschen Stands');
  neuerStand(); r = lauf('throwafter', { LIVE: '1' });
  gleich(r.code, 8, 'Ausnahme nach dem Schreiben: Exit 8'); ok(istOrig(), 'Ausnahme nach dem Schreiben: zurückgeschrieben'); ok(/fetch failed/.test(r.aus) && /Rückweg bestätigt/.test(r.aus), 'Ausnahme nach dem Schreiben: Ursache und Bestätigung');
  // Verzug im Rücklesen (Eventual Consistency): das Skript wartet
  neuerStand(); r = lauf('verzug', { LIVE: '1' });
  gleich(r.code, 0, 'verzögertes Rücklesen: Exit 0'); ok(dateien()[D_] === soll, 'verzögertes Rücklesen: Soll-Stand'); gleich(upserts(), [[D_]], 'verzögertes Rücklesen: kein Rückweg');
  // Rückweg mit Verzug
  neuerStand({ neu: neuMit('<!--FAKE_LIQUIDFEHLER-->') }); r = lauf('verzug', { LIVE: '1' });
  gleich(r.code, 7, 'Rückweg mit verzögertem Rücklesen: Exit 7'); ok(istOrig(), 'Rückweg mit verzögertem Rücklesen: Ausgangsstand');
  // Datei als URL
  neuerStand(); r = lauf('url', { LIVE: '1' }); gleich(r.code, 0, 'Vorlage als URL: Exit 0'); ok(dateien()[D_] === soll, 'Vorlage als URL: Soll-Stand');

  // ----- 13. Seitenprüfung schlägt fehl -> Rückweg -----
  const seitenFall = (text, neuInhalt, code, muster, fake = '') => {
    neuerStand({ neu: neuInhalt }); const rr = lauf(fake, { LIVE: '1' });
    gleich(rr.code, code, text + ': Exit'); ok(istOrig(), text + ': Vorlage wieder im Ausgangsstand'); gleich(upserts(), [[D_], [D_]], text + ': erst Einspielen, dann Rückweg'); ok(muster.test(rr.aus) && /Rückweg bestätigt/.test(rr.aus), text + ': Meldung ' + muster + ' und Rückweg bestätigt');
    return rr;
  };
  seitenFall('Liquid-Fehler auf Produktseite', neuMit('<!--FAKE_LIQUIDFEHLER-->'), 7, /Liquid-Fehler/);
  seitenFall('HTTP 500 auf Produktseite', neuMit('<!--FAKE_500-->'), 7, /HTTP 500/);
  seitenFall('Lieferblock verschwunden', neuMit('<!--FAKE_LEER-->'), 7, /Lieferblock zeigt «kein» statt «box»/);
  seitenFall('Netzfehler auf Produktseite', neuMit('<!--FAKE_NETZ-->'), 7, /Netzfehler/);
  seitenFall('Produktseite hängt (Zeitlimit)', neuMit('<!--FAKE_HANG-->'), 7, /Netzfehler/);
  seitenFall('Startseite 500 nach dem Einspielen', NEU_KERN, 7, /HTTP 500/, 'start500_nachher');
  seitenFall('Fehler erst in der zweiten Runde', NEU_KERN, 7, /Liquid-Fehler/, 'runde2fehler');
  // Rückweg misslingt: Exit 9, Befehl von Hand in der Meldung
  neuerStand({ neu: neuMit('<!--FAKE_LIQUIDFEHLER-->') }); r = lauf('rueckweg_kaputt', { LIVE: '1' });
  gleich(r.code, 9, 'Rückweg misslingt: Exit 9'); ok(/RÜCKWEG NICHT BESTÄTIGT/.test(r.aus) && /ZURUECK=1 LIVE=1 node dropship\/lagerbestand-0511\/apply_theme\.mjs/.test(r.aus), 'Rückweg misslingt: Befehl für den Rückweg von Hand'); gleich(upserts().length, 4, 'Rückweg misslingt: drei Versuche'); ok(!istOrig(), 'Rückweg misslingt: (Attrappe) Vorlage bleibt neu');

  // ----- 14. Schon vor dem Eingriff fehlerhafte Seiten -----
  neuerStand(); r = lauf('seitenfehler_vorher', { LIVE: '1' }); gleich(r.code, 4, 'Seiten schon vorher fehlerhaft: Exit 4'); gleich(calls(), [], 'Seiten schon vorher fehlerhaft: nichts geschrieben'); ok(!existsSync(MERK), 'Seiten schon vorher fehlerhaft: keine Merkliste');
  neuerStand(); r = lauf('seitenfehler_vorher', { LIVE: '1', VORFEHLER_OK: '1' }); gleich(r.code, 0, 'Vorfehler mit VORFEHLER_OK=1: Exit 0');
  neuerStand(); r = lauf('blockblind_vorher', { LIVE: '1' }); gleich(r.code, 4, 'kein Lieferblock sichtbar (blind): Exit 4'); gleich(calls(), [], 'kein Lieferblock sichtbar: nichts geschrieben'); ok(/blind/.test(r.aus), 'kein Lieferblock sichtbar: Meldung');
  // Seiten bleiben auch nach dem Rückweg kaputt: Exit 9 (Rückweg ist nicht «bestätigt»)
  neuerStand(); r = lauf('seiten_kaputt_nach_write', { LIVE: '1' });
  gleich(r.code, 9, 'Seiten auch nach dem Rückweg kaputt: Exit 9'); ok(istOrig(), 'Seiten auch nach dem Rückweg kaputt: Datei zurückgeschrieben'); ok(/RÜCKWEG NICHT BESTÄTIGT/.test(r.aus), 'Seiten auch nach dem Rückweg kaputt: Meldung');
  // Rücknahme: Datei zurück, aber Seiten kaputt -> Exit 7
  neuerStand(); lauf('', { LIVE: '1' }); r = lauf('seiten_kaputt_nach_write', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 7, 'Rücknahme mit kaputten Seiten: Exit 7'); ok(istOrig(), 'Rücknahme mit kaputten Seiten: Datei trotzdem zurückgeschrieben'); ok(/Seiten sind nicht in Ordnung/.test(r.aus), 'Rücknahme mit kaputten Seiten: Meldung');
  // Rückweg: Speicher gibt die Sicherung nie unverändert zurück -> nicht bestätigt
  neuerStand(); r = lauf('norm_alles', { LIVE: '1' }); gleich(r.code, 9, 'Rückweg ohne passendes Rücklesen: Exit 9'); ok(/RÜCKWEG NICHT BESTÄTIGT/.test(r.aus), 'Rückweg ohne passendes Rücklesen: Meldung');
  // Drosselung 429
  neuerStand(); r = lauf('drossel', { LIVE: '1' }); gleich(r.code, 0, '429 bei den Seiten: Exit 0 (wartet und wiederholt)'); ok(dateien()[D_] === soll, '429: Soll-Stand');
  // Produkte aus PRUEF_PRODUKTE, ungültige Einträge werden verworfen
  neuerStand(); r = lauf('', { LIVE: '1', PRUEF_PRODUKTE: 'a-b, ../x ,;rm,C-D' });
  { const u = stand().urls || []; gleich(r.code, 0, 'PRUEF_PRODUKTE: Exit 0'); ok(u.includes('/products/a-b') && !u.some((x) => x.includes('..') || x.includes(';') || x.includes('C-D')) && !stand().produktAnfragen, 'PRUEF_PRODUKTE: nur gültige Handles, keine Produktabfrage'); }
  // PRUEF_RUNDEN
  neuerStand(); r = lauf('', { LIVE: '1', PRUEF_RUNDEN: '1' }); ok(/Runde 1 von 1/.test(r.aus) && !/Runde 2/.test(r.aus), 'PRUEF_RUNDEN=1: eine Runde');

  // ----- 15. Abbruch durch Signal nach dem Schreiben -----
  neuerStand({ neu: neuMit('<!--FAKE_HANG-->') });
  {
    const sr = await laufSignal('', { LIVE: '1' }, /^upsert /m, 'SIGTERM');
    ok(sr.gesendet, 'Signal: gesendet'); gleich(sr.code, 130, 'SIGTERM nach dem Schreiben: Exit 130'); ok(istOrig(), 'SIGTERM nach dem Schreiben: zurückgeschrieben'); ok(/Signal SIGTERM nach Beginn des Schreibens/.test(sr.aus) && /Rückweg bestätigt/.test(sr.aus), 'SIGTERM: Meldung und Rückweg bestätigt'); ok(!/Fertig:/.test(sr.aus), 'SIGTERM: Hauptablauf meldet nicht «Fertig»');
  }
  neuerStand({ neu: neuMit('<!--FAKE_HANG-->') });
  { const sr = await laufSignal('', { LIVE: '1' }, /^upsert /m, 'SIGINT'); gleich(sr.code, 130, 'SIGINT nach dem Schreiben: Exit 130'); ok(istOrig(), 'SIGINT nach dem Schreiben: zurückgeschrieben'); }

  // ----- 16. Testvorlage -----
  const sollTest = sollVorlage(ORIG, ALT, NEU_KERN + S.TESTMARKE);
  neuerStand(); r = lauf('', { TESTVORLAGE: '1' });
  gleich(r.code, 0, 'TESTVORLAGE Trockenlauf: Exit'); gleich(calls(), [], 'TESTVORLAGE Trockenlauf: nichts geschrieben'); ok(/noch nicht vorhanden/.test(r.aus), 'TESTVORLAGE Trockenlauf: Meldung');
  neuerStand(); r = lauf('', { TESTVORLAGE: '1', LIVE: '1' });
  gleich(r.code, 0, 'TESTVORLAGE LIVE: Exit'); gleich(upserts(), [[T_]], 'TESTVORLAGE LIVE: genau eine Datei, und zwar die Testvorlage'); ok(istOrig(), 'TESTVORLAGE LIVE: templates/product.json unberührt');
  ok(dateien()[T_] === sollTest, 'TESTVORLAGE LIVE: Inhalt = aktuelle product.json mit dem neuen Block plus Testmarke'); ok(!existsSync(MERK), 'TESTVORLAGE LIVE: keine Merkliste');
  ok(S.blockWert(dateien()[T_]) === NEU_KERN + S.TESTMARKE, 'TESTVORLAGE LIVE: Block der Testvorlage trägt neuen Text und Testmarke');
  { const u = stand().urls; ok(u.some((x) => x === '/products/fortura-test?view=lxtest') && u.some((x) => x === '/products/cj-test?view=lxtest'), 'TESTVORLAGE LIVE: Produktseiten mit ?view=lxtest abgerufen'); ok(!u.some((x) => x.startsWith('/?')), 'TESTVORLAGE LIVE: Startseite ohne view'); }
  ok(/Testmarke/.test(r.aus) && /Testvorlage in Ordnung/.test(r.aus) && /TESTVORLAGE_WEG=1 LIVE=1/.test(r.aus), 'TESTVORLAGE LIVE: Meldung mit Ausweg zum Löschen');
  // erneut anlegen überschreibt die eigene Testvorlage
  r = lauf('', { TESTVORLAGE: '1', LIVE: '1' }); gleich(r.code, 0, 'TESTVORLAGE erneut: Exit 0'); ok(/schon vorhanden und wird überschrieben/.test(r.aus), 'TESTVORLAGE erneut: Hinweis');
  // Auslieferung der Testvorlage verzögert: das Skript wartet auf die Marke
  neuerStand(); r = lauf('lxverzug', { TESTVORLAGE: '1', LIVE: '1' }); gleich(r.code, 0, 'TESTVORLAGE mit verzögerter Auslieferung: Exit 0'); ok(stand().lxcount > 3, 'TESTVORLAGE mit verzögerter Auslieferung: hat gewartet und erneut gemessen');
  // Testvorlage mit Seitenfehler: bleibt stehen, echte Vorlage unberührt, kein Rückweg
  neuerStand({ neu: neuMit('<!--FAKE_LIQUIDFEHLER-->') }); r = lauf('', { TESTVORLAGE: '1', LIVE: '1' });
  gleich(r.code, 7, 'TESTVORLAGE mit Liquid-Fehler: Exit 7'); ok(istOrig(), 'TESTVORLAGE mit Liquid-Fehler: echte Vorlage unberührt'); gleich(upserts(), [[T_]], 'TESTVORLAGE mit Liquid-Fehler: kein Rückweg auf die echte Vorlage'); ok(/Liquid-Fehler/.test(r.aus) && /unberührt/.test(r.aus), 'TESTVORLAGE mit Liquid-Fehler: Meldung');
  // Testvorlage wird anders gespeichert
  neuerStand(); r = lauf('norm', { TESTVORLAGE: '1', LIVE: '1' }); gleich(r.code, 6, 'TESTVORLAGE mit abweichender Speicherung: Exit 6'); ok(istOrig(), 'TESTVORLAGE mit abweichender Speicherung: echte Vorlage unberührt'); ok(/NICHT angefasst/.test(r.aus), 'TESTVORLAGE mit abweichender Speicherung: Meldung');
  // Testvorlage: userErrors
  neuerStand(); r = lauf('usererr', { TESTVORLAGE: '1', LIVE: '1' }); gleich(r.code, 5, 'TESTVORLAGE userErrors: Exit 5'); ok(istOrig() && !dateien()[T_], 'TESTVORLAGE userErrors: nichts entstanden');
  // Testvorlage bei schon eingespieltem Block / fremdem Stand
  neuerStand({ vorlage: ORIG + '\n' }); r = lauf('', { TESTVORLAGE: '1', LIVE: '1' }); gleich(r.code, 4, 'TESTVORLAGE bei fremdem Ausgangsstand: Exit 4'); gleich(calls(), [], 'TESTVORLAGE bei fremdem Ausgangsstand: nichts geschrieben');

  // ----- 17. Testvorlage löschen -----
  neuerStand(); lauf('', { TESTVORLAGE: '1', LIVE: '1' }); v = calls().length;
  r = lauf('', { TESTVORLAGE_WEG: '1' }); gleich(r.code, 0, 'WEG Trockenlauf: Exit'); gleich(calls().length, v, 'WEG Trockenlauf: nichts gelöscht'); ok(!!dateien()[T_], 'WEG Trockenlauf: Testvorlage noch da');
  r = lauf('', { TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 0, 'WEG LIVE: Exit'); gleich(calls().slice(v), [{ op: 'delete', files: [T_] }], 'WEG LIVE: genau ein Löschaufruf, nur für die Testvorlage'); ok(!dateien()[T_] && istOrig(), 'WEG LIVE: Testvorlage weg, templates/product.json unberührt'); ok(/GELÖSCHT/.test(r.aus), 'WEG LIVE: Rücklesen meldet GELÖSCHT');
  v = calls().length; r = lauf('', { TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 0, 'WEG ohne Testvorlage: Exit 0'); gleich(calls().length, v, 'WEG ohne Testvorlage: kein Löschaufruf'); ok(/nicht vorhanden/.test(r.aus), 'WEG ohne Testvorlage: Meldung');
  neuerStand({ extra: { [T_]: 'x' } }); r = lauf('delerr', { TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 5, 'WEG mit userErrors: Exit 5'); ok(!!dateien()[T_], 'WEG mit userErrors: Datei noch da');
  neuerStand({ extra: { [T_]: 'x' } }); r = lauf('delstuck', { TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 6, 'WEG, Datei bleibt in der API: Exit 6'); ok(/DATEI NOCH DA/.test(r.aus), 'WEG, Datei bleibt: Meldung');
  neuerStand({ extra: { [T_]: 'x' } }); r = lauf('verzug', { TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 0, 'WEG, Löschung erst verzögert sichtbar: Exit 0');

  // ----- 19. Funde der zweiten unabhängigen Prüfung (05.11.) -----
  // 19a. Der Theme-Editor speichert templates/product.json mitten in der Seitenmessung: vor dem Schreiben wird noch einmal gelesen, seine Änderung bleibt
  neuerStand(); r = lauf('editor_waehrend', { LIVE: '1' });
  gleich(r.code, 4, 'Editor speichert während der Messung: Exit 4'); gleich(calls(), [], 'Editor speichert während der Messung: nichts geschrieben'); ok(dateien()[D_] === ORIG + '\n', 'Editor speichert während der Messung: seine Änderung bleibt erhalten'); ok(!existsSync(MERK), 'Editor speichert während der Messung: keine Merkliste'); ok(/hat sich seit dem Lesen am Anfang des Laufs geändert/.test(r.aus), 'Editor speichert während der Messung: Meldung');
  neuerStand(); r = lauf('editor_waehrend', { TESTVORLAGE: '1', LIVE: '1' });
  gleich(r.code, 4, 'Editor speichert während der Messung (Testvorlage): Exit 4'); gleich(calls(), [], 'Editor speichert während der Messung (Testvorlage): nichts geschrieben'); ok(/hat sich seit dem Lesen am Anfang des Laufs geändert/.test(r.aus), 'Editor speichert während der Messung (Testvorlage): Meldung');
  // 19b. Ausverkaufte Prüfseite (das erste Fortura-Produkt ist es heute): der alte Block zeigt Pille UND Lieferbox, der neue nur die Pille. Gewollt, kein Rückweg.
  neuerStand(); r = lauf('soldout_wechsel', { LIVE: '1' });
  gleich(r.code, 0, 'ausverkaufte Prüfseiten, Lieferbox fällt weg: Exit 0'); ok(dateien()[D_] === soll, 'ausverkaufte Prüfseiten: Soll-Stand bleibt'); gleich(upserts(), [[D_]], 'ausverkaufte Prüfseiten: kein Rückweg'); ok(/Lieferblock aus\b/.test(r.aus), 'ausverkaufte Prüfseiten: nachher «aus» gemessen');
  neuerStand(); r = lauf('soldout_wechsel', { TESTVORLAGE: '1', LIVE: '1' });
  gleich(r.code, 0, 'ausverkaufte Prüfseiten, Testvorlage: Exit 0'); ok(/Testvorlage in Ordnung/.test(r.aus), 'ausverkaufte Prüfseiten, Testvorlage: in Ordnung');
  // 19c. Dasselbe, aber der neue Block verschwindet ganz (auch die Pille): bleibt eine Abweichung
  neuerStand({ neu: neuMit('<!--FAKE_LEER-->') }); r = lauf('soldout_wechsel', { LIVE: '1' });
  gleich(r.code, 7, 'ausverkaufte Prüfseiten, Block verschwindet ganz: Exit 7'); ok(istOrig(), 'ausverkaufte Prüfseiten, Block verschwindet ganz: zurückgeschrieben'); ok(/Lieferblock zeigt «kein» statt «box»/.test(r.aus), 'ausverkaufte Prüfseiten, Block verschwindet ganz: Meldung');
  // 19d. Byte-Order-Mark in der Blockdatei wird abgewiesen (würde unsichtbar in die Seite geschrieben)
  neuerStand({ neu: '\uFEFF' + NEU_KERN }); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'Blockdatei mit BOM: Exit 4'); gleich(calls(), [], 'Blockdatei mit BOM: nichts geschrieben'); ok(/U\+FEFF/.test(r.aus), 'Blockdatei mit BOM: Meldung');
  // 19e. Rücknahme: userErrors beim Schreiben -> Exit 5, Rücklesen weicht ab -> Exit 6 (ohne Seitenprüfung des falschen Stands)
  neuerStand(); lauf('', { LIVE: '1' }); v = upserts().length; r = lauf('usererr', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 5, 'Rücknahme mit userErrors: Exit 5'); ok(dateien()[D_] === soll, 'Rücknahme mit userErrors: Vorlage unverändert'); gleich(upserts().length, v + 1, 'Rücknahme mit userErrors: ein Versuch');
  neuerStand(); lauf('', { LIVE: '1' }); r = lauf('norm_alles', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 6, 'Rücknahme, Rücklesen weicht ab: Exit 6'); ok(/ABWEICHUNG/.test(r.aus) && !/Seiten nach der Rücknahme/.test(r.aus), 'Rücknahme, Rücklesen weicht ab: Meldung, keine Seitenprüfung des falschen Stands');
  // 19f. Ausnahme nach dem Schreiben der Testvorlage: Exit 8, echte Vorlage unberührt, Ausweg genannt
  neuerStand(); r = lauf('throwafter', { TESTVORLAGE: '1', LIVE: '1' });
  gleich(r.code, 8, 'Testvorlage, Ausnahme nach dem Schreiben: Exit 8'); ok(istOrig(), 'Testvorlage, Ausnahme: echte Vorlage unberührt'); ok(/wurde nicht angefasst/.test(r.aus) && /TESTVORLAGE_WEG=1/.test(r.aus), 'Testvorlage, Ausnahme: Ausweg genannt');
  // 19g. Der Block lux_delivery fehlt in der Live-Datei (umbenannt): Abbruch mit der eigenen Meldung, auch mit FREMD_UEBERSCHREIBEN=1
  {
    const ohne = einmal(ORIG, '"lux_delivery": {', '"lux_delivery_x": {'); neuerStand({ vorlage: ohne }); const pp = mitMd5Vor(md5(ohne));
    r = lauf('', { LIVE: '1' }, pp); gleich(r.code, 4, 'Block fehlt in der Live-Datei: Exit 4'); gleich(calls(), [], 'Block fehlt in der Live-Datei: nichts geschrieben'); ok(/Der Block lux_delivery ist in der Live-Datei nicht lesbar: nichts geschrieben/.test(r.aus), 'Block fehlt in der Live-Datei: eigene Meldung');
    r = lauf('', { LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }, pp); gleich(r.code, 4, 'Block fehlt in der Live-Datei trotz FREMD_UEBERSCHREIBEN=1: Exit 4'); gleich(calls(), [], 'Block fehlt in der Live-Datei trotz FREMD_UEBERSCHREIBEN=1: nichts geschrieben');
  }

  // ----- 18. Aufruf und Umgebung -----
  neuerStand(); r = lauf('', { ZURUECK: '1', TESTVORLAGE: '1' }); gleich(r.code, 1, 'ZURUECK + TESTVORLAGE: Exit 1'); gleich(calls(), [], 'ZURUECK + TESTVORLAGE: nichts geschrieben');
  r = lauf('', { TESTVORLAGE: '1', TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 1, 'TESTVORLAGE + TESTVORLAGE_WEG: Exit 1');
  r = lauf('', { ZURUECK: '1', TESTVORLAGE_WEG: '1', LIVE: '1' }); gleich(r.code, 1, 'ZURUECK + TESTVORLAGE_WEG: Exit 1');
  r = lauf('', { SHOPIFY_CLIENT_ID: '' }); gleich(r.code, 1, 'ohne Client-ID: Exit 1');
  r = lauf('', { SHOPIFY_SHOP: 'example.com' }); gleich(r.code, 1, 'falsche Shop-Domain: Exit 1');
  r = lauf('keinmain', { LIVE: '1' }); gleich(r.code, 1, 'kein MAIN-Theme: Exit 1'); gleich(calls(), [], 'kein MAIN-Theme: nichts geschrieben');
  r = lauf('zweimain', { LIVE: '1' }); gleich(r.code, 1, 'zwei MAIN-Themes: Exit 1'); gleich(calls(), [], 'zwei MAIN-Themes: nichts geschrieben');
  neuerStand(); r = lauf('csumfalsch', { LIVE: '1' }); gleich(r.code, 4, 'Inhalt passt nicht zur Prüfsumme: Exit 4'); gleich(calls(), [], 'Inhalt passt nicht zur Prüfsumme: nichts geschrieben'); ok(/nicht lesbar \(oder passt nicht zur Prüfsumme\)/.test(r.aus), 'Inhalt passt nicht zur Prüfsumme: Meldung');
  // Merkliste manipuliert: Pfad aus dem Ordner heraus / ungültige Prüfsumme
  neuerStand(); lauf('', { LIVE: '1' }); { const m = JSON.parse(readFileSync(MERK, 'utf8')); writeFileSync(MERK, JSON.stringify({ ...m, sicherung: '../../evil' })); v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 4, 'Merkliste mit Pfad aus dem Ordner: Exit 4'); ok(/Merkliste unvollständig oder ungültig/.test(r.aus), 'Merkliste mit Pfad aus dem Ordner: Meldung'); gleich(upserts().length, v, 'Merkliste mit Pfad aus dem Ordner: nichts geschrieben'); writeFileSync(MERK, JSON.stringify({ ...m, md5_soll: 'xyz' })); r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 4, 'Merkliste mit ungültiger Prüfsumme: Exit 4'); ok(/Merkliste unvollständig oder ungültig/.test(r.aus), 'Merkliste mit ungültiger Prüfsumme: Meldung'); writeFileSync(MERK, '{kaputt'); r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 4, 'unlesbare Merkliste: Exit 4'); gleich(upserts().length, v, 'kaputte Merkliste: nichts geschrieben'); }
  neuerStand(); lauf('', { LIVE: '1' }); { const m = JSON.parse(readFileSync(MERK, 'utf8')); writeFileSync(MERK, JSON.stringify({ ...m, sicherung: 'product.json.vor/../product.json.vor' })); v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 4, 'Merkliste mit Pfadanteil hinter dem Sicherungsnamen: Exit 4'); ok(/Merkliste unvollständig oder ungültig/.test(r.aus), 'Merkliste mit Pfadanteil: Meldung der Namensprüfung (nicht erst «Sicherung fehlt»)'); gleich(upserts().length, v, 'Merkliste mit Pfadanteil: nichts geschrieben'); }
  // Sicherung nach dem Einspielen verfälscht: die Rücknahme schreibt sie nicht
  neuerStand(); lauf('', { LIVE: '1' }); writeFileSync(join(SICH, 'product.json.vor'), ORIG + ' '); v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 4, 'Rücknahme mit verfälschter Sicherung: Exit 4'); gleich(upserts().length, v, 'Rücknahme mit verfälschter Sicherung: nichts geschrieben'); ok(/weicht vom erwarteten Ausgangsstand ab/.test(r.aus), 'Rücknahme mit verfälschter Sicherung: Meldung');
  neuerStand(); lauf('', { LIVE: '1' }); rmSync(join(SICH, 'product.json.vor')); v = upserts().length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 4, 'Rücknahme ohne Sicherung: Exit 4'); gleich(upserts().length, v, 'Rücknahme ohne Sicherung: nichts geschrieben');
  // Rücknahme mit Merkliste braucht die Blockdatei nicht
  neuerStand(); lauf('', { LIVE: '1' }); rmSync(NEU); r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme mit Merkliste ohne Blockdatei: Exit 0'); ok(istOrig(), 'Rücknahme mit Merkliste ohne Blockdatei: Ausgangsstand');
  // nie ein anderer Dateiname
  neuerStand(); lauf('', { LIVE: '1' }); lauf('', { ZURUECK: '1', LIVE: '1' }); lauf('', { TESTVORLAGE: '1', LIVE: '1' }); lauf('', { TESTVORLAGE_WEG: '1', LIVE: '1' });
  ok(calls().every((c) => c.files.every((f) => f === D_ || f === T_)), 'nur templates/product.json und templates/product.lxtest.json werden angefasst');
  ok(calls().filter((c) => c.op === 'delete').every((c) => c.files.length === 1 && c.files[0] === T_), 'gelöscht wird nur die Testvorlage');
  // Echte Blockdatei des anderen Bauers (falls vorhanden): der Trockenlauf muss mit ihr durchlaufen
  if (existsSync(HIER + 'lux_delivery.neu.liquid')) {
    neuerStand({ neu: readFileSync(HIER + 'lux_delivery.neu.liquid', 'utf8') }); r = lauf('', {});
    gleich(r.code, 0, 'Trockenlauf mit der echten lux_delivery.neu.liquid: Exit'); ok(/Byte-Vergleich bestanden/.test(r.aus), 'Trockenlauf mit der echten Blockdatei: Byte-Vergleich bestanden');
  }
} finally {
  rmSync(D, { recursive: true, force: true });
}
console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
