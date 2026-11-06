// Test für apply.mjs (das einzige Skript des Pakets, das live schreibt) gegen eine Attrappe der Theme-API. Kein Netz, kein Shopify.
//   node dropship/katalog-fenster-0611/apply_test.mjs
// Die Attrappe (shopify_gql.mjs im Wegwerfordner) hält die Theme-Dateien in einer JSON-Datei, kennt die Abfragen von apply.mjs (lesen, themeFilesUpsert, themeFilesDelete) und kann gezielt Fehler machen
// (FAKE=...). Aufrufnummern sind RELATIV zum Lauf (rel 1 = erster Schreibaufruf dieses Laufs): beim Einspielen 1 = Daten (Ausblenden + Karte), 2 = Texte-Datei, 3 = Texte und Liquid, 4 = CSS und JS;
// bei der Rücknahme 1 = CSS/JS, 2 = Texte und Liquid, 3 = Löschen.
//   step1aerr/step1berr/step2err/step3all/step3js: userErrors in Schritt 1a (Karte abgelehnt) / 1b (Texte-Datei abgelehnt) / 2 (de.json) / 3 (alles) / 3 (nur JS)
//   norm/normtexte: der Speicher legt die Karte (Aufruf 1) bzw. die Texte-Datei (Aufruf 2) anders ab; throw1b/throw3: Ausnahme beim Schreiben von Schritt 1b / 3
//   url: grosse Dateien als URL; nocsum: keine Prüfsumme; delerr/nodelete: Löschen scheitert / bleibt ohne Wirkung
//   vorlese: de.json ändert sich nach dem ersten Lesen; fremdjs1/fremdjs3/fremdcss3/fremdde2/fremdkarte1/fremdkarte2: ein zweiter Auftrag schreibt nach Aufruf rel 1/3/3/2/1/2;
//   rueckcss/rueckde: die erste (CSS) bzw. die zweite (de.json) Rücknahme-Schreibung wird nie sichtbar; fremdrueck: de.json ändert sich während der Rücknahme (nach rel 1);
//   fremdkarte_r1/fremdloesch/fremdtexte_r2: Karte nach rel 1 / Karte nach rel 2 / Texte-Datei nach rel 2 der Rücknahme verändert.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, anwendenKombi, lesenDaten } from './kombi.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];
const S1A = [NEUE_DATEIEN.AUSBLENDEN, NEUE_DATEIEN.KARTE], S1B = [NEUE_DATEIEN.TEXTE];
const S2 = [DATEIEN.DE, DATEIEN.EN, DATEIEN.FR, DATEIEN.SECTION, DATEIEN.MANIFEST, DATEIEN.COVER, DATEIEN.CATEGORY], S3 = [DATEIEN.CSS, DATEIEN.JS];
const EINSPIELEN = [S1A, S1B, S2, S3];
const sichName = (f) => f.replace('/', '__') + '.vor';
const sich = Object.fromEntries(ALT.map((f) => [f, readFileSync(HIER + 'sicherung/' + sichName(f), 'utf8')]));
const daten = lesenDaten();
const soll = anwendenKombi(sich, daten);
const sollMd5 = Object.fromEntries(ALLE.map((f) => [f, md5(soll[f])]));

// ---------- Wegwerf-Umgebung (gleiche Ordnerstruktur wie im Repo) ----------
const D = mkdtempSync(join(tmpdir(), 'lxfenster-'));
const PAKET = join(D, 'dropship/katalog-fenster-0611');
const PAKET_A = join(D, 'dropship/katalog-nur-bestellbar-0511'), PAKET_B = join(D, 'dropship/katalog-texte-de-0611');
for (const d of [PAKET, join(PAKET_A, 'daten'), PAKET_B, join(D, 'automation/lib')]) mkdirSync(d, { recursive: true });
for (const f of ['apply.mjs', 'kombi.mjs', 'texte_ersetzungen.mjs']) cpSync(HIER + f, join(PAKET, f));
cpSync(HIER + '../katalog-nur-bestellbar-0511/patches.mjs', join(PAKET_A, 'patches.mjs'));
for (const f of ['ausblenden-quelle.json', 'variantenkarte.json']) cpSync(HIER + '../katalog-nur-bestellbar-0511/daten/' + f, join(PAKET_A, 'daten', f));
cpSync(HIER + '../katalog-texte-de-0611/luxe-clothing-texts-de.json', join(PAKET_B, 'luxe-clothing-texts-de.json'));
cpSync(HIER + 'sicherung', join(PAKET, 'sicherung'), { recursive: true });
rmSync(join(PAKET, 'sicherung/eingespielt.json'), { force: true });
writeFileSync(join(D, 'automation/lib/shopify_secret.mjs'), 'export const shopifyClientSecret = (s) => s;\n');
writeFileSync(join(D, 'automation/lib/shopify_gql.mjs'), `
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ST = process.env.SIM_STATE, FAKE = process.env.FAKE || '';
const md5 = (s) => createHash('md5').update(s).digest('hex');
const load = () => JSON.parse(readFileSync(ST, 'utf8')), save = (s) => writeFileSync(ST, JSON.stringify(s));
export async function shopifyGql(shop, api, tok, query, vars) {
  const s = load();
  if (query.includes('themes(first:5')) return { themes: { nodes: [{ id: 'gid://fake/1', name: 'fake' }] } };
  if (query.includes('files(filenames')) {
    s.ev = s.ev || []; s.ev.push('R'); s.nR = (s.nR || 0) + 1; s.nRL = (s.nRL || 0) + 1;
    const nodes = vars.f.filter((n) => s.files[n] != null).map((n) => {
      const c = s.files[n], url = FAKE.includes('url') && (n.includes('variantenkarte') || n.includes('texts-de') || n.endsWith('luxe-clothing.js'));
      return { filename: n, size: Buffer.byteLength(c), checksumMd5: FAKE.includes('nocsum') ? null : md5(c),
        body: url ? { __typename: 'OnlineStoreThemeFileBodyUrl', url: 'https://fake.invalid/' + n } : { __typename: 'OnlineStoreThemeFileBodyText', content: c } };
    });
    // ein zweiter Auftrag ändert de.json, NACHDEM die erste Antwort dieses Laufs geliefert wurde
    if (FAKE.includes('vorlese') && s.nRL === 1) s.files['locales/de.json'] += '\\n';
    save(s);
    return { theme: { files: { nodes } } };
  }
  if (query.includes('themeFilesUpsert')) {
    s.calls = s.calls || []; s.calls.push(vars.files.map((f) => f.filename)); s.ev = s.ev || []; s.ev.push('U');
    const rel = s.calls.length - (s.laufStart || 0), errs = [];
    for (const f of vars.files) {
      const nm = f.filename;
      if ((FAKE.includes('step1aerr') && rel === 1 && nm.includes('variantenkarte')) || (FAKE.includes('step1berr') && rel === 2 && nm.includes('texts-de')) || (FAKE.includes('step2err') && rel === 3 && nm === 'locales/de.json')
        || (FAKE.includes('step3js') && rel === 4 && nm.endsWith('luxe-clothing.js')) || (FAKE.includes('step3all') && rel === 4)) { errs.push({ filename: nm, message: 'FAKE abgelehnt' }); continue; }
      let v = f.body.value;
      if (FAKE.includes('norm') && !FAKE.includes('normtexte') && nm.includes('variantenkarte') && rel === 1) v = v.replace(/\\n$/, '');
      if (FAKE.includes('normtexte') && nm.includes('texts-de') && rel === 2) v += ' ';
      if (FAKE.includes('rueckcss') && rel === 1 && nm.endsWith('luxe-clothing.css') && s.zuruck) v += '\\n';
      if (FAKE.includes('rueckde') && rel === 2 && nm === 'locales/de.json' && s.zuruck) v += '\\n';
      s.files[nm] = v;
    }
    // ein zweiter Auftrag schreibt zwischen den Schritten
    if (FAKE.includes('fremdjs1') && rel === 1) s.files['assets/luxe-clothing.js'] += ' /* FREMDER AUFTRAG Katalogtexte */ ';
    if (FAKE.includes('fremdjs3') && rel === 3) s.files['assets/luxe-clothing.js'] += ' /* FREMDER AUFTRAG Katalogtexte */ ';
    if (FAKE.includes('fremdcss3') && rel === 3) s.files['assets/luxe-clothing.css'] += ' /* FREMDER AUFTRAG CSS */ ';
    if (FAKE.includes('fremdde2') && rel === 2) s.files['locales/de.json'] += '\\n';
    if (FAKE.includes('fremdkarte1') && rel === 1) s.files['assets/luxe-clothing-variantenkarte.json'] += '\\n';
    if (FAKE.includes('fremdkarte2') && rel === 2) s.files['assets/luxe-clothing-variantenkarte.json'] += '\\n';
    if (FAKE.includes('fremdrueck') && rel === 1 && s.zuruck) s.files['locales/de.json'] += '\\n';
    if (FAKE.includes('fremdkarte_r1') && rel === 1 && s.zuruck) s.files['assets/luxe-clothing-variantenkarte.json'] += '\\n';
    if (FAKE.includes('fremdloesch') && rel === 2 && s.zuruck) s.files['assets/luxe-clothing-variantenkarte.json'] += '\\n';
    if (FAKE.includes('fremdtexte_r2') && rel === 2 && s.zuruck) s.files['assets/luxe-clothing-texts-de.json'] += '\\n';
    save(s);
    if ((FAKE.includes('throw1b') && rel === 2) || (FAKE.includes('throw3') && rel === 4)) throw new Error('GraphQL: fetch failed (FAKE)');
    return { themeFilesUpsert: { upsertedThemeFiles: vars.files.filter((f) => !errs.some((e) => e.filename === f.filename)).map((f) => ({ filename: f.filename })), userErrors: errs } };
  }
  if (query.includes('themeFilesDelete')) {
    s.calls = s.calls || []; s.calls.push(['DEL', ...vars.files]); s.ev = s.ev || []; s.ev.push('D');
    if (FAKE.includes('delerr')) { save(s); return { themeFilesDelete: { deletedThemeFiles: [], userErrors: vars.files.map((f) => ({ filename: f, message: 'FAKE nicht löschbar' })) } }; }
    const geloescht = [];
    for (const f of vars.files) if (s.files[f] != null && !FAKE.includes('nodelete')) { delete s.files[f]; geloescht.push({ filename: f }); }
    save(s);
    return { themeFilesDelete: { deletedThemeFiles: geloescht, userErrors: [] } };
  }
  throw new Error('FAKE: unbekannte Abfrage ' + query.slice(0, 60));
}
`);
writeFileSync(join(D, 'fakefetch.mjs'), `
import { readFileSync } from 'node:fs';
globalThis.fetch = async (u) => {
  u = String(u);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 'fake' }), { status: 200 });
  if (u.startsWith('https://fake.invalid/')) { const s = JSON.parse(readFileSync(process.env.SIM_STATE, 'utf8')); return new Response(s.files[decodeURIComponent(u.slice('https://fake.invalid/'.length))], { status: 200 }); }
  throw new Error('FAKE-Sperre: echter Netzzugriff ' + u);
};
`);
const STATE = join(D, 'state.json');
const MERK = join(PAKET, 'sicherung/eingespielt.json');
const neuerStand = (aenderung = {}) => {
  const files = { ...sich, ...aenderung };
  for (const k of Object.keys(files)) if (files[k] === null) delete files[k];
  writeFileSync(STATE, JSON.stringify({ files, calls: [], ev: [], laufStart: 0 }));
  rmSync(MERK, { force: true });
};
const stand = () => JSON.parse(readFileSync(STATE, 'utf8'));
const lauf = (fake, env = {}) => {
  const st = stand(); st.laufStart = (st.calls || []).length; st.nRL = 0; st.zuruck = env.ZURUECK === '1'; writeFileSync(STATE, JSON.stringify(st));
  const r = spawnSync(process.execPath, ['--import', join(D, 'fakefetch.mjs'), join(PAKET, 'apply.mjs')], {
    encoding: 'utf8', timeout: 90000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, SIM_STATE: STATE, FAKE: fake, SHOPIFY_SHOP: 'fake.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', APPLY_ZEIT: '0.001', ...env },
  });
  return { code: r.status, aus: (r.stdout || '') + (r.stderr || '') };
};
// Ereignisfolge ohne Wiederholungen: R R R U R -> RUR
const folge = (von = 0) => (stand().ev || []).slice(von).join('').replace(/R+/g, 'R');
const md5Stand = () => Object.fromEntries(ALLE.map((f) => [f, stand().files[f] == null ? null : md5(stand().files[f])]));
const istSicherung = () => ALT.every((f) => stand().files[f] === sich[f]) && NEU.every((f) => stand().files[f] == null);
const istSoll = () => ALLE.every((f) => stand().files[f] === soll[f]);
const RUECK = [S3, S2, ['DEL', ...NEU]];

try {
  // 0. Die Wegwerf-Umgebung hat wirklich den Ausgangsstand, und die Reihenfolge der Schritte ist die erwartete
  ok(ALT.every((f) => md5(sich[f]) === MD5_VOR[f]), 'Sicherung gleich MD5_VOR');
  gleich(EINSPIELEN.flat().slice().sort(), ALLE.slice().sort(), 'die vier Schritte decken alle zwölf Dateien ab, jede genau einmal');
  gleich(NEU.length, 3, 'drei neue Dateien'); ok(ALL_SIND_TEXT(), 'Soll-Stand: alle zwölf Dateien sind nicht leer');
  function ALL_SIND_TEXT() { return ALLE.every((f) => typeof soll[f] === 'string' && soll[f].length > 100); }

  // 1. Trockenlauf schreibt nichts, nennt die Schritte
  neuerStand(); let r = lauf('');
  gleich(r.code, 0, 'Trockenlauf: Exit'); gleich(stand().calls, [], 'Trockenlauf: keine Schreibaufrufe'); ok(istSicherung(), 'Trockenlauf: Stand unverändert'); ok(!existsSync(MERK), 'Trockenlauf: keine Merkliste'); ok(/Trockenlauf/.test(r.aus), 'Trockenlauf: Meldung');
  ok(/Schreibschritte: 1a Daten \(2 Dateien, \d+ KB\) → 1b Texte-Datei \(1 Datei, \d+ KB\) → 2 Texte und Liquid \(7 Dateien, \d+ KB\) → 3 CSS und JS \(2 Dateien, \d+ KB\)/.test(r.aus), 'Trockenlauf: nennt die vier Schreibschritte mit Grössen');

  // 2. Einspielen: Reihenfolge, Ergebnis, Merkliste
  neuerStand(); r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'LIVE: Exit'); gleich(stand().calls, EINSPIELEN, 'LIVE: vier Schritte in dieser Reihenfolge (Daten, Texte-Datei, Texte/Liquid, dann CSS/JS), kein Aufruf grösser als nötig');
  ok(istSoll(), 'LIVE: alle zwölf Dateien gleich dem Soll-Stand'); gleich(md5Stand(), sollMd5, 'LIVE: Prüfsummen gleich dem Soll');
  ok(existsSync(MERK) && JSON.stringify(JSON.parse(readFileSync(MERK, 'utf8')).md5) === JSON.stringify(sollMd5), 'LIVE: Merkliste mit den Soll-Prüfsummen');
  gleich((r.aus.match(/GLEICH/g) || []).length, 12, 'LIVE: Rücklesen meldet 12 × GLEICH'); ok(!/ABWEICHUNG/.test(r.aus), 'LIVE: keine ABWEICHUNG');
  gleich(folge(), 'RURURURUR', 'LIVE: Lesen, vor jedem der vier Schritte frisch lesen, nach jedem der ersten drei Warten bis die Prüfsummen stimmen, Rücklesen');
  ok(Math.max(...calls_gross()) < 420000, 'LIVE: grösster einzelner Aufruf unter 0,42 MB (Vorbild: 0,52 MB in einem Aufruf, gemeinsam wären es 0,92 MB)');
  function calls_gross() { return stand().calls.map((c) => c.reduce((s, f) => s + Buffer.byteLength(soll[f] || ''), 0)); }

  // 3. Zweites Einspielen wird abgelehnt
  const vorher = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'zweites LIVE: Exit 3'); gleich(stand().calls.length, vorher, 'zweites LIVE: nichts geschrieben'); ok(/Schon eingespielt/.test(r.aus), 'zweites LIVE: Meldung');

  // 4. Rücknahme nach Erfolg: erst Code, dann Texte/Liquid, zuletzt die drei neuen Dateien löschen; Ergebnis gleich Sicherung
  r = lauf('', { ZURUECK: '1' });
  gleich(r.code, 0, 'ZURUECK Trockenlauf: Exit'); gleich((r.aus.match(/zustand .*neu/g) || []).length, 12, 'ZURUECK Trockenlauf: 12 Dateien «neu»'); gleich(stand().calls.length, vorher, 'ZURUECK Trockenlauf: nichts geschrieben');
  ok(/zu löschen: assets\/luxe-clothing-ausblenden\.json, assets\/luxe-clothing-variantenkarte\.json, assets\/luxe-clothing-texts-de\.json/.test(r.aus), 'ZURUECK Trockenlauf: nennt die drei zu löschenden Dateien');
  const ev4 = stand().ev.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK LIVE: Exit');
  gleich(stand().calls.slice(vorher), RUECK, 'ZURUECK: erst CSS/JS, dann Texte/Liquid, zuletzt die drei neuen Dateien löschen');
  ok(istSicherung(), 'ZURUECK: neun Dateien gleich der Sicherung, drei neue Dateien weg'); gleich((r.aus.match(/GLEICH/g) || []).length, 12, 'ZURUECK: Rücklesen meldet 12 × GLEICH');
  gleich(folge(ev4), 'RURURDR', 'ZURUECK: Lesen, CSS/JS, Warten, Texte/Liquid, Warten, Löschen, Rücklesen (gelöscht wird erst, wenn die Prüfsummen der Texte stimmen)');

  // 5. Rücknahme ohne etwas zu tun
  const v5 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK im Ausgangsstand: Exit 0'); gleich(stand().calls.length, v5, 'ZURUECK im Ausgangsstand: nichts geschrieben'); ok(/nichts, alles schon im Ausgangsstand/.test(r.aus), 'ZURUECK im Ausgangsstand: Meldung');

  // 6. Rücknahme ohne Merkliste (Soll wird aus Paket und Daten gerechnet)
  neuerStand(); lauf('', { LIVE: '1' }); rmSync(MERK, { force: true });
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'ZURUECK ohne Merkliste: Exit'); ok(istSicherung(), 'ZURUECK ohne Merkliste: Sicherung hergestellt');

  // 7. Ausgangsstand weicht ab → Exit 4, nichts geschrieben; Hinweis, ob die Anker noch passen
  neuerStand({ [DATEIEN.DE]: sich[DATEIEN.DE] + '\n' }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremder Ausgangsstand: Exit 4'); gleich(stand().calls, [], 'fremder Ausgangsstand: nichts geschrieben'); ok(!existsSync(MERK), 'fremder Ausgangsstand: keine Merkliste');
  ok(/weicht ab: locales\/de\.json/.test(r.aus) && /Anker von patches\.mjs und texte_ersetzungen\.mjs passen noch/.test(r.aus), 'fremder Ausgangsstand: nennt die Datei und dass die Anker noch passen');
  neuerStand({ [DATEIEN.JS]: sich[DATEIEN.JS].replace('const variantsFor = product =>', 'const variantenFuer = product =>') }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremd veränderter Anker von (A): Exit 4'); ok(/passen NICHT mehr/.test(r.aus), 'fremd veränderter Anker von (A): Hinweis, dass die Anker nicht mehr passen'); gleich(stand().calls, [], 'fremd veränderter Anker von (A): nichts geschrieben');
  neuerStand({ [DATEIEN.JS]: sich[DATEIEN.JS].replace('const german = /^de(?:-|$)/i.test(config.locale || \'\');', 'const german = /^de/i.test(config.locale || \'\');') }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremd veränderter Anker von (B): Exit 4'); ok(/passen NICHT mehr/.test(r.aus) && /Nr\. 9/.test(r.aus), 'fremd veränderter Anker von (B): Hinweis nennt die Ersetzung'); gleich(stand().calls, [], 'fremd veränderter Anker von (B): nichts geschrieben');
  neuerStand(); r = lauf('nocsum', { LIVE: '1' }); gleich(r.code, 4, 'fehlende Prüfsumme: Exit 4'); gleich(stand().calls, [], 'fehlende Prüfsumme: nichts geschrieben');
  neuerStand({ [DATEIEN.CATEGORY]: null }); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'bestehende Datei fehlt: Exit 4'); gleich(stand().calls, [], 'bestehende Datei fehlt: nichts geschrieben');

  // 7a. Nur eines der beiden Einzelpakete ist eingespielt: der gemeinsame Stand setzt den Ausgangsstand voraus (Exit 3 mit klarem Hinweis)
  const textePaket = readFileSync(HIER + '../katalog-texte-de-0611/theme/assets__luxe-clothing.js', 'utf8');
  neuerStand({ [DATEIEN.JS]: textePaket }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'nur das Texte-Paket eingespielt: Exit 3'); gleich(stand().calls, [], 'nur das Texte-Paket: nichts geschrieben'); ok(/Nur das Paket katalog-texte-de-0611/.test(r.aus), 'nur das Texte-Paket: Hinweis nennt das Paket');
  const aPaket = (await import(join(PAKET_A, 'patches.mjs'))).anwenden(sich, { ausblenden: daten.ausblenden, karte: daten.karte });
  neuerStand({ [DATEIEN.JS]: aPaket[DATEIEN.JS], [DATEIEN.CSS]: aPaket[DATEIEN.CSS] }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'nur das Paket «nur bestellbar» eingespielt: Exit 3'); gleich(stand().calls, [], 'nur das Paket «nur bestellbar»: nichts geschrieben'); ok(/Nur das Paket katalog-nur-bestellbar-0511/.test(r.aus), 'nur das Paket «nur bestellbar»: Hinweis nennt das Paket');

  // 7b. Eine fremde Datei mit dem Namen einer neuen Datei → Exit 4; unsere eigene (Teilzustand) → Exit 3
  for (const [datei, name] of [[NEUE_DATEIEN.KARTE, 'Karte'], [NEUE_DATEIEN.TEXTE, 'Texte-Datei'], [NEUE_DATEIEN.AUSBLENDEN, 'Ausblenden-Datei']]) {
    neuerStand({ [datei]: '{"fremd":true}\n' }); r = lauf('', { LIVE: '1' });
    gleich(r.code, 4, `fremde Datei mit dem Namen der neuen ${name}: Exit 4`); ok(/existiert schon mit anderem Inhalt/.test(r.aus), `fremde ${name}: Meldung`); gleich(stand().calls, [], `fremde ${name}: nichts geschrieben`);
    neuerStand({ [datei]: soll[datei] }); r = lauf('', { LIVE: '1' });
    gleich(r.code, 3, `nur die neue ${name} (gleich Soll) vorhanden: Exit 3`); gleich(stand().calls, [], `nur die neue ${name} vorhanden: nichts geschrieben`);
  }

  // 8. Sicherung weicht ab → Exit 4, nichts geschrieben
  neuerStand(); const sv = join(PAKET, 'sicherung', sichName(DATEIEN.CSS)), svInhalt = readFileSync(sv, 'utf8');
  writeFileSync(sv, svInhalt + '/* x */\n'); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'verfälschte Sicherung: Exit 4'); gleich(stand().calls, [], 'verfälschte Sicherung: nichts geschrieben'); writeFileSync(sv, svInhalt);

  // 8b. Eine der drei Datenquellen ist seit dem Test verändert → Exit 1, nichts geschrieben
  neuerStand(); const tq = join(PAKET_B, 'luxe-clothing-texts-de.json'), tqInhalt = readFileSync(tq, 'utf8');
  writeFileSync(tq, tqInhalt.replace('"schema":1', '"schema":1 ')); r = lauf('', { LIVE: '1' });
  gleich(r.code, 1, 'veränderte Texte-Datei: Exit 1'); ok(/Datenquelle .*texte.* nicht die erwartete Prüfsumme|Datenquelle nicht lesbar oder verändert/.test(r.aus), 'veränderte Texte-Datei: Meldung'); gleich(stand().calls, [], 'veränderte Texte-Datei: nichts geschrieben'); writeFileSync(tq, tqInhalt);

  // 9. userErrors in Schritt 3 (CSS/JS): Teilzustand, Hinweis, wiederholtes LIVE verweist auf die Rücknahme, Rücknahme stellt her
  neuerStand(); r = lauf('step3all', { LIVE: '1' });
  gleich(r.code, 5, 'userErrors Schritt 3: Exit 5'); ok(/Teilzustand/.test(r.aus), 'userErrors: Hinweis auf Teilzustand');
  ok([...S1A, ...S1B, ...S2].every((f) => stand().files[f] === soll[f]) && S3.every((f) => stand().files[f] === sich[f]), 'userErrors: Schritte 1 und 2 geschrieben, CSS/JS nicht');
  const v9 = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'LIVE nach den Schritten ohne Code: Exit 3 (nicht 4)'); ok(/Rücknahme: ZURUECK=1/.test(r.aus), 'LIVE nach Teilzustand: nennt die Rücknahme'); gleich(stand().calls.length, v9, 'LIVE nach Teilzustand: nichts geschrieben');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach dem Teilzustand: Exit'); ok(istSicherung(), 'Rücknahme nach dem Teilzustand: Sicherung hergestellt');
  gleich(stand().calls.slice(v9), [S2, ['DEL', ...NEU]], 'Rücknahme nach dem Teilzustand: schreibt nur die sieben alten Dateien von Schritt 2 und löscht die drei neuen');

  // 9b. Fehler beim Anlegen einer NEUEN Datei: Schritt 1a (Karte abgelehnt), Schritt 1b (Texte-Datei abgelehnt): Exit 5, nichts weiter geschrieben, kein bestehende Datei berührt, Rücknahme räumt auf
  neuerStand(); r = lauf('step1aerr', { LIVE: '1' });
  gleich(r.code, 5, 'Karte abgelehnt (Schritt 1a): Exit 5'); ok(/FAKE abgelehnt/.test(r.aus) && /variantenkarte/.test(r.aus), 'Karte abgelehnt: Meldung nennt Datei und Ursache'); gleich(stand().calls.length, 1, 'Karte abgelehnt: nur der erste Aufruf, nichts weiter');
  ok(ALT.every((f) => stand().files[f] === sich[f]) && stand().files[NEUE_DATEIEN.AUSBLENDEN] === soll[NEUE_DATEIEN.AUSBLENDEN] && stand().files[NEUE_DATEIEN.KARTE] == null, 'Karte abgelehnt: neun bestehende Dateien unberührt, Ausblenden-Datei da, Karte und Texte-Datei fehlen');
  r = lauf('', { LIVE: '1' }); gleich(r.code, 3, 'LIVE nach abgelehnter Karte: Exit 3 (Teilzustand erkannt)');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach abgelehnter Karte: Exit'); ok(istSicherung(), 'Rücknahme nach abgelehnter Karte: Sicherung hergestellt (Ausblenden-Datei gelöscht)');
  neuerStand(); r = lauf('step1berr', { LIVE: '1' });
  gleich(r.code, 5, 'Texte-Datei abgelehnt (Schritt 1b): Exit 5'); ok(/texts-de/.test(r.aus), 'Texte-Datei abgelehnt: Meldung nennt die Datei'); gleich(stand().calls.length, 2, 'Texte-Datei abgelehnt: zwei Aufrufe, Texte/Liquid und Code nicht geschrieben');
  ok(ALT.every((f) => stand().files[f] === sich[f]) && S1A.every((f) => stand().files[f] === soll[f]) && stand().files[NEUE_DATEIEN.TEXTE] == null, 'Texte-Datei abgelehnt: bestehende Dateien unberührt, die zwei Daten-Dateien da');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach abgelehnter Texte-Datei: Exit'); ok(istSicherung(), 'Rücknahme nach abgelehnter Texte-Datei: Sicherung hergestellt');
  gleich(stand().calls.slice(2), [['DEL', ...S1A]], 'Rücknahme nach abgelehnter Texte-Datei: löscht nur die zwei vorhandenen neuen Dateien (kein Schreiben)');
  // Schritt 2 (de.json abgelehnt): Daten da, Code nicht
  neuerStand(); r = lauf('step2err', { LIVE: '1' });
  gleich(r.code, 5, 'de.json abgelehnt (Schritt 2): Exit 5'); gleich(stand().calls.length, 3, 'de.json abgelehnt: drei Aufrufe, CSS/JS nicht geschrieben'); ok(S3.every((f) => stand().files[f] === sich[f]), 'de.json abgelehnt: Code unberührt');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach abgelehnter de.json: Exit'); ok(istSicherung(), 'Rücknahme nach abgelehnter de.json: Sicherung hergestellt');

  // 10. nur die JS-Datei abgelehnt
  neuerStand(); r = lauf('step3js', { LIVE: '1' }); gleich(r.code, 5, 'JS abgelehnt: Exit 5');
  ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] && stand().files[DATEIEN.CSS] === soll[DATEIEN.CSS], 'JS abgelehnt: CSS geschrieben, JS alt');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach abgelehntem JS: Exit'); ok(istSicherung(), 'Rücknahme nach abgelehntem JS: Sicherung hergestellt');

  // 11. Speicher legt die Variantenkarte anders ab (Prüfsumme nie gleich) → Exit 6, nichts weiter geschrieben (auch keine Texte-Datei)
  neuerStand(); r = lauf('norm', { LIVE: '1' });
  gleich(r.code, 6, 'Prüfsumme der Karte nie sichtbar: Exit 6'); gleich(stand().calls.length, 1, 'Prüfsumme der Karte nie sichtbar: Schritt 1b und alle folgenden nicht geschrieben'); ok(/Schritt 1a Daten ist nach 150 s noch nicht/.test(r.aus) && /folgenden Schritte NICHT/.test(r.aus), 'Prüfsumme der Karte nie sichtbar: Meldung');
  ok(ALT.every((f) => stand().files[f] === sich[f]), 'Prüfsumme der Karte nie sichtbar: alle bestehenden Dateien unberührt');
  // 11b. Rücknahme verweigert die «fremde» Karte, nichts wird geschrieben; mit FREMD_UEBERSCHREIBEN=1 geht es
  const v11 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme mit fremder Datei: Exit 3'); gleich(stand().calls.length, v11, 'Rücknahme mit fremder Datei: nichts geschrieben'); ok(/fremd: assets\/luxe-clothing-variantenkarte\.json/.test(r.aus) && /FREMD_UEBERSCHREIBEN=1/.test(r.aus), 'Rücknahme mit fremder Datei: nennt Datei, Prüfsummen und den Ausweg');
  r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 0, 'FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(istSicherung(), 'FREMD_UEBERSCHREIBEN=1: Sicherung hergestellt, fremde neue Datei gelöscht');
  // 11c. dasselbe für die Texte-Datei: nach Aufruf 2 nie sichtbar → Exit 6, Texte/Liquid und Code nicht geschrieben
  neuerStand(); r = lauf('normtexte', { LIVE: '1' });
  gleich(r.code, 6, 'Prüfsumme der Texte-Datei nie sichtbar: Exit 6'); gleich(stand().calls.length, 2, 'Prüfsumme der Texte-Datei nie sichtbar: Texte/Liquid und Code nicht geschrieben'); ok(/Schritt 1b Texte-Datei ist nach 150 s noch nicht/.test(r.aus), 'Prüfsumme der Texte-Datei nie sichtbar: Meldung');
  ok(ALT.every((f) => stand().files[f] === sich[f]), 'Prüfsumme der Texte-Datei nie sichtbar: alle bestehenden Dateien unberührt');
  r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 0, 'Texte-Datei «fremd»: Rücknahme mit FREMD_UEBERSCHREIBEN=1'); ok(istSicherung(), 'Texte-Datei «fremd»: Sicherung hergestellt');

  // 12. Ausnahme während des Schreibens: Exit 7 mit Teilzustand-Hinweis; Rücknahme geht (Schritt 1b und Schritt 3)
  for (const [fake, name] of [['throw1b', 'bei der Texte-Datei'], ['throw3', 'bei CSS/JS']]) {
    neuerStand(); r = lauf(fake, { LIVE: '1' });
    gleich(r.code, 7, `Ausnahme ${name}: Exit 7`); ok(/Teilzustand/.test(r.aus) && /fetch failed/.test(r.aus), `Ausnahme ${name}: Hinweis und Ursache sichtbar`);
    r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, `Rücknahme nach Ausnahme ${name}: Exit`); ok(istSicherung(), `Rücknahme nach Ausnahme ${name}: Sicherung hergestellt`);
  }

  // 13. Grosse Dateien kommen als URL
  neuerStand(); r = lauf('url', { LIVE: '1' }); gleich(r.code, 0, 'Dateien als URL: Exit'); ok(istSoll(), 'Dateien als URL: Soll-Stand erreicht');
  r = lauf('url', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme mit URL-Dateien: Exit'); ok(istSicherung(), 'Rücknahme mit URL-Dateien: Sicherung hergestellt');

  // 14. Rücknahme verweigert jede Datei, die jemand anderes verändert hat (auch eine der neun alten und die Texte-Datei)
  neuerStand(); lauf('', { LIVE: '1' });
  const st = stand(); st.files[DATEIEN.EN] += '\n'; writeFileSync(STATE, JSON.stringify(st));
  const v14 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme bei fremd verändertem Stand (en.default.json): Exit 3'); gleich(stand().calls.length, v14, 'Rücknahme bei fremd verändertem Stand: nichts geschrieben');
  neuerStand(); lauf('', { LIVE: '1' });
  const st1 = stand(); st1.files[NEUE_DATEIEN.TEXTE] += ' '; writeFileSync(STATE, JSON.stringify(st1));
  const v14t = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme bei fremd veränderter Texte-Datei: Exit 3'); gleich(stand().calls.length, v14t, 'Rücknahme bei fremd veränderter Texte-Datei: nichts geschrieben');
  // 14b. Ein anderer Auftrag hat luxe-clothing.js nach dem Einspielen weiterverändert → ebenso Exit 3 (trägt unsere Marke, ist also «fremd», nicht «unberührt»)
  neuerStand(); lauf('', { LIVE: '1' });
  const st2 = stand(); st2.files[DATEIEN.JS] += '/* anderer Auftrag */\n'; writeFileSync(STATE, JSON.stringify(st2));
  const v14b = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme nach fremder Änderung am JS: Exit 3'); gleich(stand().calls.length, v14b, 'Rücknahme nach fremder Änderung am JS: nichts geschrieben');

  // 14c. Das JS trägt nur die Marke EINES der beiden Pakete (jemand hat (A) oder das Texte-Paket allein darübergespielt): das ist «fremd» (es trägt unsere Marke), nicht «unberührt» → Exit 3, nichts geschrieben
  for (const [name, inhalt] of [['nur die Marke von (B)', textePaket], ['nur die Marke von (A)', aPaket[DATEIEN.JS]]]) {
    neuerStand(); lauf('', { LIVE: '1' });
    const sx = stand(); sx.files[DATEIEN.JS] = inhalt; writeFileSync(STATE, JSON.stringify(sx));
    const vx = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
    gleich(r.code, 3, `Rücknahme, JS trägt ${name}: Exit 3 (fremd, nicht unberührt)`); gleich(stand().calls.length, vx, `Rücknahme, JS trägt ${name}: nichts geschrieben`);
    ok(/fremd: assets\/luxe-clothing\.js/.test(r.aus), `Rücknahme, JS trägt ${name}: Meldung nennt die Datei als fremd`);
  }

  // 15. Neue Dateien bleiben stehen (NEUE_BEHALTEN=1)
  neuerStand(); lauf('', { LIVE: '1' });
  r = lauf('', { ZURUECK: '1', LIVE: '1', NEUE_BEHALTEN: '1' }); gleich(r.code, 0, 'NEUE_BEHALTEN: Exit'); ok(ALT.every((f) => stand().files[f] === sich[f]) && NEU.every((f) => stand().files[f] === soll[f]), 'NEUE_BEHALTEN: neun alte zurück, drei neue bleiben');
  ok(!stand().calls.some((c) => c[0] === 'DEL'), 'NEUE_BEHALTEN: kein Löschaufruf');

  // 15b. Erster echter Lauf: die Sicherung gibt es noch nicht und wird aus dem Live-Stand angelegt (alle neun Dateien, byte-gleich dem Ausgangsstand)
  neuerStand();
  for (const f of ALT) rmSync(join(PAKET, 'sicherung', sichName(f)), { force: true });
  r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'ohne vorhandene Sicherung: LIVE Exit 0'); ok(istSoll(), 'ohne vorhandene Sicherung: Soll-Stand erreicht');
  ok(ALT.every((f) => existsSync(join(PAKET, 'sicherung', sichName(f))) && readFileSync(join(PAKET, 'sicherung', sichName(f)), 'utf8') === sich[f]), 'ohne vorhandene Sicherung: alle neun .vor-Dateien angelegt und gleich dem Ausgangsstand');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'ohne vorhandene Sicherung: Rücknahme danach geht'); ok(istSicherung(), 'ohne vorhandene Sicherung: Rücknahme stellt den Ausgangsstand her');
  for (const f of ALT) writeFileSync(join(PAKET, 'sicherung', sichName(f)), sich[f]); // die Folge-Szenarien brauchen die Sicherung

  // 16. Löschen scheitert (userErrors) → Exit 5; Löschen ohne Wirkung → Exit 6 (Rücklesen)
  neuerStand(); lauf('', { LIVE: '1' });
  r = lauf('delerr', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 5, 'Löschen mit userErrors: Exit 5'); ok(/FAKE nicht löschbar/.test(r.aus), 'Löschen mit userErrors: Ursache sichtbar');
  ok(ALT.every((f) => stand().files[f] === sich[f]), 'Löschen mit userErrors: die neun alten Dateien sind trotzdem zurück');
  neuerStand(); lauf('', { LIVE: '1' });
  r = lauf('nodelete', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 6, 'Löschen ohne Wirkung: Exit 6 (Rücklesen weicht ab)'); ok(/ABWEICHUNG/.test(r.aus), 'Löschen ohne Wirkung: ABWEICHUNG gemeldet');

  // 17. Ein zweiter Auftrag schreibt das JS ZWISCHEN den Schritten: der nächste Schritt wird NICHT geschrieben, seine Änderung bleibt, die Rücknahme lässt das JS unberührt
  const FREMD_JS = ' /* FREMDER AUFTRAG Katalogtexte */ ', FREMD_CSS = ' /* FREMDER AUFTRAG CSS */ ';
  // 17a. gleich nach Schritt 1a: schon vor Schritt 1b entdeckt (jeder Schritt prüft alle zwölf Dateien frisch)
  neuerStand(); r = lauf('fremdjs1', { LIVE: '1' });
  gleich(r.code, 4, 'JS nach Schritt 1a fremd verändert: Exit 4'); gleich(stand().calls, [S1A], 'JS nach Schritt 1a fremd verändert: nur Schritt 1a geschrieben');
  ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] + FREMD_JS, 'JS nach Schritt 1a fremd verändert: die Änderung des anderen Auftrags bleibt');
  ok(/Schritt 1b Texte-Datei NICHT geschrieben/.test(r.aus) && /assets\/luxe-clothing\.js/.test(r.aus) && /Dessen Änderung bleibt unberührt/.test(r.aus), 'JS nach Schritt 1a fremd verändert: Meldung nennt Schritt, Datei und dass die fremde Änderung bleibt');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach JS-Fremdänderung nach 1a: Exit 0'); ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] + FREMD_JS && NEU.every((f) => stand().files[f] == null), 'Rücknahme: JS unberührt, neue Dateien weg');
  // 17b. vor dem Code-Schritt (wie das Vorbild): Schritte 1a, 1b und 2 sind geschrieben, Schritt 3 nicht
  neuerStand(); r = lauf('fremdjs3', { LIVE: '1' });
  gleich(r.code, 4, 'JS zwischen den Schritten fremd verändert: Exit 4'); gleich(stand().calls, [S1A, S1B, S2], 'JS fremd verändert: nur Schritte 1a, 1b und 2 geschrieben, Schritt 3 (CSS/JS) nicht');
  ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] + FREMD_JS, 'JS fremd verändert: die Änderung des anderen Auftrags bleibt erhalten'); ok(stand().files[DATEIEN.CSS] === sich[DATEIEN.CSS], 'JS fremd verändert: CSS ebenfalls unberührt');
  ok(/Schritt 3 CSS und JS NICHT geschrieben/.test(r.aus) && /assets\/luxe-clothing\.js/.test(r.aus) && /Dessen Änderung bleibt unberührt/.test(r.aus), 'JS fremd verändert: Meldung nennt Datei und dass die fremde Änderung bleibt');
  ok(/Anker von patches\.mjs und texte_ersetzungen\.mjs passen noch auf die veränderte Datei/.test(r.aus), 'JS fremd verändert: Hinweis, dass die Anker noch passen');
  const v17 = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'LIVE nach abgebrochenem Schritt 3: Exit 3 (Teilzustand erkannt)'); gleich(stand().calls.length, v17, 'LIVE nach abgebrochenem Schritt 3: nichts geschrieben');
  r = lauf('', { ZURUECK: '1' });
  ok(/zustand\s+assets\/luxe-clothing\.js\s+unberuehrt/.test(r.aus) && /zustand\s+assets\/luxe-clothing\.css\s+alt/.test(r.aus), 'Rücknahme (Trockenlauf): fremd verändertes JS heisst «unberuehrt», CSS «alt»');
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'Rücknahme nach fremd verändertem JS: Exit 0 (kein Abbruch wegen «fremd»)');
  gleich(stand().calls.slice(v17), [S2, ['DEL', ...NEU]], 'Rücknahme nach fremd verändertem JS: schreibt nur die sieben Dateien von Schritt 2 und löscht die drei neuen, kein CSS/JS');
  ok(S2.every((f) => stand().files[f] === sich[f]) && NEU.every((f) => stand().files[f] == null), 'Rücknahme nach fremd verändertem JS: sieben Dateien wie vor dem Paket, neue Dateien weg');
  ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] + FREMD_JS, 'Rücknahme nach fremd verändertem JS: die Änderung des anderen Auftrags ist noch da'); gleich((r.aus.match(/GLEICH/g) || []).length, 12, 'Rücknahme nach fremd verändertem JS: Rücklesen 12 × GLEICH');
  // und mit FREMD_UEBERSCHREIBEN=1 wird die fremde, markenlose Datei trotzdem nie überschrieben
  neuerStand(); lauf('fremdjs3', { LIVE: '1' }); r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' });
  gleich(r.code, 0, 'FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] + FREMD_JS, 'FREMD_UEBERSCHREIBEN=1 überschreibt ein fremd verändertes JS ohne unsere Marke NIE');
  // 17c. dasselbe für das CSS
  neuerStand(); r = lauf('fremdcss3', { LIVE: '1' });
  gleich(r.code, 4, 'CSS zwischen den Schritten fremd verändert: Exit 4'); gleich(stand().calls, [S1A, S1B, S2], 'CSS fremd verändert: Schritt 3 nicht geschrieben');
  ok(stand().files[DATEIEN.CSS] === sich[DATEIEN.CSS] + FREMD_CSS && stand().files[DATEIEN.JS] === sich[DATEIEN.JS], 'CSS fremd verändert: die Änderung bleibt, das JS ist unberührt');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach fremd verändertem CSS: Exit 0'); ok(stand().files[DATEIEN.CSS] === sich[DATEIEN.CSS] + FREMD_CSS && S2.every((f) => stand().files[f] === sich[f]), 'Rücknahme nach fremd verändertem CSS: CSS unberührt, sieben Dateien zurück');
  // 17d. ein zweiter Auftrag ändert de.json nach Schritt 1b (also zwischen den Datenschritten und dem Textschritt): Schritt 2 wird NICHT geschrieben (sonst ginge seine Änderung verloren)
  neuerStand(); r = lauf('fremdde2', { LIVE: '1' });
  gleich(r.code, 4, 'de.json nach Schritt 1b fremd verändert: Exit 4'); gleich(stand().calls, [S1A, S1B], 'de.json fremd verändert: nur die zwei Datenschritte geschrieben');
  ok(stand().files[DATEIEN.DE] === sich[DATEIEN.DE] + '\n', 'de.json fremd verändert: die fremde Änderung bleibt'); ok(/Schritt 2 Texte und Liquid NICHT geschrieben/.test(r.aus) && /locales\/de\.json/.test(r.aus), 'de.json fremd verändert: Meldung');
  // 17e. eine unserer eigenen neuen Dateien wird gleich nach dem Schreiben von jemand anderem verändert: die Prüfsumme wird nie sichtbar → Exit 6 (nichts weiter geschrieben);
  //      wird sie erst NACH dem Warten dieses Schritts verändert, entdeckt es die frische Prüfung vor dem nächsten Schritt → Exit 4 mit dem Stand «bis hierher geschrieben»
  neuerStand(); r = lauf('fremdkarte1', { LIVE: '1' });
  gleich(r.code, 6, 'Karte gleich nach Schritt 1a fremd verändert: Exit 6'); gleich(stand().calls, [S1A], 'Karte gleich nach Schritt 1a fremd verändert: nichts weiter geschrieben');
  neuerStand(); r = lauf('fremdkarte2', { LIVE: '1' });
  gleich(r.code, 4, 'Karte nach Schritt 1b fremd verändert: Exit 4'); gleich(stand().calls, [S1A, S1B], 'Karte nach Schritt 1b fremd verändert: nichts weiter geschrieben'); ok(/Schritt 2 Texte und Liquid NICHT geschrieben/.test(r.aus) && /Bis hierher geschrieben/.test(r.aus) && /variantenkarte/.test(r.aus), 'Karte nach Schritt 1b fremd verändert: Meldung nennt Datei und den geschriebenen Stand');
  ok(/verändert wurde eine Datei, die dieser Lauf selbst geschrieben hat/.test(r.aus), 'Karte nach Schritt 1b fremd verändert: Hinweis, dass es eine eigene Datei war');

  // 18. Der Ausgangsstand ändert sich NACH dem ersten Lesen, aber VOR dem Schreiben (de.json): nichts geschrieben, keine Merkliste
  neuerStand(); r = lauf('vorlese', { LIVE: '1' });
  gleich(r.code, 4, 'Änderung nach dem ersten Lesen: Exit 4'); gleich(stand().calls, [], 'Änderung nach dem ersten Lesen: nichts geschrieben'); ok(!existsSync(MERK), 'Änderung nach dem ersten Lesen: keine Merkliste');
  ok(/Kurz vor dem Schreiben/.test(r.aus) && /locales\/de\.json/.test(r.aus), 'Änderung nach dem ersten Lesen: Meldung nennt die Datei');

  // 19. Rücknahme: die Prüfsumme der zurückgeschriebenen Datei wird nie sichtbar → Exit 6, Texte/Liquid und neue Dateien unberührt; der gleiche Befehl macht danach weiter
  neuerStand(); lauf('', { LIVE: '1' }); const v19 = stand().calls.length;
  r = lauf('rueckcss', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 6, 'Rücknahme, Prüfsumme nicht sichtbar: Exit 6'); gleich(stand().calls.length, v19 + 1, 'Rücknahme, Prüfsumme nicht sichtbar: nur die CSS/JS-Schreibung, nichts weiter');
  ok(S2.every((f) => stand().files[f] === soll[f]) && NEU.every((f) => stand().files[f] === soll[f]), 'Rücknahme, Prüfsumme nicht sichtbar: Texte/Liquid und neue Dateien noch im neuen Stand'); ok(/noch nicht auf dem Ausgangsstand sichtbar/.test(r.aus) && /wiederholbar/.test(r.aus), 'Rücknahme, Prüfsumme nicht sichtbar: Meldung');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme wiederholt: Exit 0'); ok(S2.every((f) => stand().files[f] === sich[f]) && NEU.every((f) => stand().files[f] == null) && stand().files[DATEIEN.JS] === sich[DATEIEN.JS], 'Rücknahme wiederholt: sieben Dateien zurück, neue weg, JS alt');

  // 20. Rücknahme: jemand ändert de.json während der Wartezeit zwischen den Schritten → angehalten (Exit 3), nichts gelöscht, de.json bleibt
  neuerStand(); lauf('', { LIVE: '1' }); const v20 = stand().calls.length;
  r = lauf('fremdrueck', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme, de.json während der Rücknahme verändert: Exit 3'); gleich(stand().calls.length, v20 + 1, 'Rücknahme, de.json verändert: nur die CSS/JS-Schreibung, nichts gelöscht');
  ok(stand().files[DATEIEN.DE] === soll[DATEIEN.DE] + '\n' && NEU.every((f) => stand().files[f] === soll[f]), 'Rücknahme, de.json verändert: die fremde Änderung bleibt, die neuen Dateien sind noch da'); ok(/Rücknahme angehalten/.test(r.aus) && /locales\/de\.json/.test(r.aus) && /wiederholbar/.test(r.aus), 'Rücknahme, de.json verändert: Meldung nennt die Datei und dass sie wiederholbar ist');

  // 21. Rücknahme: eine der drei zu löschenden Dateien wird verändert, NACHDEM Texte/Liquid zurückgeschrieben sind → nicht gelöscht (Exit 3), die fremde Änderung bleibt
  for (const [fake, datei, name] of [['fremdloesch', NEUE_DATEIEN.KARTE, 'Karte'], ['fremdtexte_r2', NEUE_DATEIEN.TEXTE, 'Texte-Datei']]) {
    neuerStand(); lauf('', { LIVE: '1' }); const v21 = stand().calls.length;
    r = lauf(fake, { ZURUECK: '1', LIVE: '1' });
    gleich(r.code, 3, `Rücknahme, zu löschende ${name} verändert: Exit 3`); gleich(stand().calls.length, v21 + 2, `Rücknahme, zu löschende ${name} verändert: CSS/JS und Texte geschrieben, nichts gelöscht`);
    ok(stand().files[datei] === soll[datei] + '\n' && NEU.filter((f) => f !== datei).every((f) => stand().files[f] === soll[f]), `Rücknahme, zu löschende ${name} verändert: alle drei neuen Dateien noch da, die fremde Änderung bleibt`);
    ok(/Rücknahme angehalten/.test(r.aus) && r.aus.includes(datei), `Rücknahme, zu löschende ${name} verändert: Meldung nennt die Datei`);
  }
  // 22. Rücknahme: die Prüfsumme der zurückgeschriebenen Texte wird nie sichtbar → die drei neuen Dateien werden NICHT gelöscht (Exit 6)
  neuerStand(); lauf('', { LIVE: '1' }); const v22 = stand().calls.length;
  r = lauf('rueckde', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 6, 'Rücknahme, Texte nie sichtbar: Exit 6'); gleich(stand().calls.length, v22 + 2, 'Rücknahme, Texte nie sichtbar: nichts gelöscht');
  ok(NEU.every((f) => stand().files[f] === soll[f]), 'Rücknahme, Texte nie sichtbar: die neuen Dateien sind noch da'); ok(/NICHT gelöscht/.test(r.aus) && /wiederholbar/.test(r.aus), 'Rücknahme, Texte nie sichtbar: Meldung');
  // 23. Rücknahme: eine der zu löschenden Dateien wird schon NACH dem CSS/JS-Schreiben verändert → Texte/Liquid werden gar nicht erst zurückgeschrieben (Exit 3)
  neuerStand(); lauf('', { LIVE: '1' }); const v23 = stand().calls.length;
  r = lauf('fremdkarte_r1', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme, zu löschende Datei früh verändert: Exit 3'); gleich(stand().calls.length, v23 + 1, 'Rücknahme, zu löschende Datei früh verändert: nur CSS/JS geschrieben, Texte/Liquid noch nicht, nichts gelöscht');
  ok(S2.every((f) => stand().files[f] === soll[f]) && stand().files[NEUE_DATEIEN.KARTE] === soll[NEUE_DATEIEN.KARTE] + '\n', 'Rücknahme, zu löschende Datei früh verändert: Texte/Liquid noch im neuen Stand, die fremde Änderung an der Karte bleibt');
} finally {
  rmSync(D, { recursive: true, force: true });
}
console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
