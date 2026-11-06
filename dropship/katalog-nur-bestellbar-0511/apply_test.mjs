// Test für apply.mjs (das einzige Skript des Pakets, das live schreibt) gegen eine Attrappe der Theme-API. Kein Netz, kein Shopify.
//   node dropship/katalog-nur-bestellbar-0511/apply_test.mjs
// Die Attrappe (shopify_gql.mjs im Wegwerfordner) hält die Theme-Dateien in einer JSON-Datei, kennt die Abfragen von apply.mjs (lesen, themeFilesUpsert, themeFilesDelete) und kann
// gezielt Fehler machen (FAKE=...): userErrors in Schritt 2, ein Speicher, der eine Datei anders ablegt (norm), eine Ausnahme beim zweiten Schreiben, Dateien als URL,
// fehlende Prüfsumme, userErrors beim Löschen, Löschen ohne Wirkung. APPLY_ZEIT=0.001 verkürzt alle Wartezeiten.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DATEIEN, NEUE_DATEIEN, MD5_VOR, anwenden } from './patches.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

const ALT = Object.values(DATEIEN), NEU = Object.values(NEUE_DATEIEN), ALLE = [...ALT, ...NEU];
const SCHRITT1 = [NEUE_DATEIEN.AUSBLENDEN, NEUE_DATEIEN.KARTE, DATEIEN.DE, DATEIEN.EN, DATEIEN.FR, DATEIEN.SECTION, DATEIEN.MANIFEST, DATEIEN.COVER, DATEIEN.CATEGORY];
const SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS];
const RUECK1 = SCHRITT1.filter((f) => ALT.includes(f));
const sichName = (f) => f.replace('/', '__') + '.vor';
const sich = Object.fromEntries(ALT.map((f) => [f, readFileSync(HIER + 'sicherung/' + sichName(f), 'utf8')]));
const daten = { ausblenden: JSON.parse(readFileSync(HIER + 'daten/ausblenden-quelle.json', 'utf8')), karte: readFileSync(HIER + 'daten/variantenkarte.json', 'utf8') };
const soll = anwenden(sich, daten);
const sollMd5 = Object.fromEntries(ALLE.map((f) => [f, md5(soll[f])]));

// ---------- Wegwerf-Umgebung ----------
const D = mkdtempSync(join(tmpdir(), 'lxapply-'));
const PAKET = join(D, 'dropship/katalog-nur-bestellbar-0511');
mkdirSync(join(D, 'automation/lib'), { recursive: true });
mkdirSync(PAKET, { recursive: true });
for (const f of ['apply.mjs', 'patches.mjs']) cpSync(HIER + f, join(PAKET, f));
cpSync(HIER + 'daten', join(PAKET, 'daten'), { recursive: true });
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
    s.ev = s.ev || []; s.ev.push('R'); save(s);
    const nodes = vars.f.filter((n) => s.files[n] != null).map((n) => {
      const c = s.files[n], url = FAKE.includes('url') && (n.includes('variantenkarte') || n.endsWith('luxe-clothing.js'));
      return { filename: n, size: Buffer.byteLength(c), checksumMd5: FAKE.includes('nocsum') ? null : md5(c),
        body: url ? { __typename: 'OnlineStoreThemeFileBodyUrl', url: 'https://fake.invalid/' + n } : { __typename: 'OnlineStoreThemeFileBodyText', content: c } };
    });
    return { theme: { files: { nodes } } };
  }
  if (query.includes('themeFilesUpsert')) {
    s.calls = s.calls || []; s.calls.push(vars.files.map((f) => f.filename)); s.ev = s.ev || []; s.ev.push('U');
    const callNo = s.calls.length, errs = [];
    for (const f of vars.files) {
      if ((FAKE.includes('step2err') && f.filename.endsWith('luxe-clothing.js') && callNo === 2) || (FAKE.includes('step2all') && callNo === 2)) { errs.push({ filename: f.filename, message: 'FAKE Syntaxfehler' }); continue; }
      let v = f.body.value;
      if (FAKE.includes('norm') && f.filename.includes('variantenkarte') && callNo === 1) v = v.replace(/\\n$/, '');
      s.files[f.filename] = v;
    }
    save(s);
    if (FAKE.includes('throw2') && callNo === 2) throw new Error('GraphQL: fetch failed (FAKE)');
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
  writeFileSync(STATE, JSON.stringify({ files, calls: [], ev: [] }));
  rmSync(MERK, { force: true });
};
const stand = () => JSON.parse(readFileSync(STATE, 'utf8'));
const lauf = (fake, env = {}) => {
  const r = spawnSync(process.execPath, ['--import', join(D, 'fakefetch.mjs'), join(PAKET, 'apply.mjs')], {
    encoding: 'utf8', timeout: 60000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, SIM_STATE: STATE, FAKE: fake, SHOPIFY_SHOP: 'fake.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y', APPLY_ZEIT: '0.001', ...env },
  });
  return { code: r.status, aus: (r.stdout || '') + (r.stderr || '') };
};
// Ereignisfolge ohne Wiederholungen: R R R U R -> RUR
const folge = (von = 0) => (stand().ev || []).slice(von).join('').replace(/R+/g, 'R');
const md5Stand = () => Object.fromEntries(ALLE.map((f) => [f, stand().files[f] == null ? null : md5(stand().files[f])]));
const istSicherung = () => ALT.every((f) => stand().files[f] === sich[f]) && NEU.every((f) => stand().files[f] == null);
const istSoll = () => ALLE.every((f) => stand().files[f] === soll[f]);

try {
  // 0. Die Wegwerf-Umgebung hat wirklich den Ausgangsstand, und die Reihenfolge der Schritte ist die erwartete
  ok(ALT.every((f) => md5(sich[f]) === MD5_VOR[f]), 'Sicherung gleich MD5_VOR');
  gleich([...SCHRITT1, ...SCHRITT2].slice().sort(), ALLE.slice().sort(), 'Schritt 1 und 2 decken alle elf Dateien ab');

  // 1. Trockenlauf schreibt nichts
  neuerStand(); let r = lauf('');
  gleich(r.code, 0, 'Trockenlauf: Exit'); gleich(stand().calls, [], 'Trockenlauf: keine Schreibaufrufe'); ok(istSicherung(), 'Trockenlauf: Stand unverändert'); ok(!existsSync(MERK), 'Trockenlauf: keine Merkliste'); ok(/Trockenlauf/.test(r.aus), 'Trockenlauf: Meldung');

  // 2. Einspielen: Reihenfolge, Ergebnis, Merkliste
  neuerStand(); r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'LIVE: Exit'); gleich(stand().calls, [SCHRITT1, SCHRITT2], 'LIVE: zwei Schritte in dieser Reihenfolge (Daten/Texte/Liquid, dann CSS/JS)');
  ok(istSoll(), 'LIVE: alle elf Dateien gleich dem Soll-Stand'); gleich(md5Stand(), sollMd5, 'LIVE: Prüfsummen gleich dem Soll');
  ok(existsSync(MERK) && JSON.stringify(JSON.parse(readFileSync(MERK, 'utf8')).md5) === JSON.stringify(sollMd5), 'LIVE: Merkliste mit den Soll-Prüfsummen');
  gleich((r.aus.match(/GLEICH/g) || []).length, 11, 'LIVE: Rücklesen meldet 11 × GLEICH'); ok(!/ABWEICHUNG/.test(r.aus), 'LIVE: keine ABWEICHUNG');
  gleich(folge(), 'RURUR', 'LIVE: Lesen, Schritt 1, Warten (Lesen bis die Prüfsummen stimmen), Schritt 2, Rücklesen');

  // 3. Zweites Einspielen wird abgelehnt
  const vorher = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'zweites LIVE: Exit 3'); gleich(stand().calls.length, vorher, 'zweites LIVE: nichts geschrieben'); ok(/Schon eingespielt/.test(r.aus), 'zweites LIVE: Meldung');

  // 4. Rücknahme nach Erfolg: erst Code, dann Texte/Liquid, zuletzt die zwei neuen Dateien löschen; Ergebnis gleich Sicherung
  r = lauf('', { ZURUECK: '1' });
  gleich(r.code, 0, 'ZURUECK Trockenlauf: Exit'); gleich((r.aus.match(/zustand .*neu/g) || []).length, 11, 'ZURUECK Trockenlauf: 11 Dateien «neu»'); gleich(stand().calls.length, vorher, 'ZURUECK Trockenlauf: nichts geschrieben');
  ok(/zu löschen: assets\/luxe-clothing-ausblenden\.json, assets\/luxe-clothing-variantenkarte\.json/.test(r.aus), 'ZURUECK Trockenlauf: nennt die zwei zu löschenden Dateien');
  const ev4 = stand().ev.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK LIVE: Exit');
  gleich(stand().calls.slice(vorher), [SCHRITT2, RUECK1, ['DEL', ...NEU]], 'ZURUECK: erst CSS/JS, dann Texte/Liquid, zuletzt die neuen Dateien löschen');
  ok(istSicherung(), 'ZURUECK: neun Dateien gleich der Sicherung, zwei neue Dateien weg'); gleich((r.aus.match(/GLEICH/g) || []).length, 11, 'ZURUECK: Rücklesen meldet 11 × GLEICH');
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
  ok(/weicht ab: locales\/de\.json/.test(r.aus) && /Anker von patches\.mjs passen noch/.test(r.aus), 'fremder Ausgangsstand: nennt die Datei und dass die Anker noch passen');
  neuerStand({ [DATEIEN.JS]: sich[DATEIEN.JS].replace('const variantsFor = product =>', 'const variantenFuer = product =>') }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremd veränderter Anker: Exit 4'); ok(/passen NICHT mehr/.test(r.aus), 'fremd veränderter Anker: Hinweis, dass die Anker nicht mehr passen'); gleich(stand().calls, [], 'fremd veränderter Anker: nichts geschrieben');
  neuerStand(); r = lauf('nocsum', { LIVE: '1' }); gleich(r.code, 4, 'fehlende Prüfsumme: Exit 4'); gleich(stand().calls, [], 'fehlende Prüfsumme: nichts geschrieben');
  neuerStand({ [DATEIEN.CATEGORY]: null }); r = lauf('', { LIVE: '1' }); gleich(r.code, 4, 'bestehende Datei fehlt: Exit 4'); gleich(stand().calls, [], 'bestehende Datei fehlt: nichts geschrieben');

  // 7b. Eine fremde Datei mit dem Namen einer neuen Datei → Exit 4; unsere eigene (Teilzustand) → Exit 3
  neuerStand({ [NEUE_DATEIEN.KARTE]: '{"fremd":true}\n' }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremde Datei mit neuem Namen: Exit 4'); ok(/existiert schon mit anderem Inhalt/.test(r.aus), 'fremde Datei mit neuem Namen: Meldung'); gleich(stand().calls, [], 'fremde Datei mit neuem Namen: nichts geschrieben');
  neuerStand({ [NEUE_DATEIEN.AUSBLENDEN]: soll[NEUE_DATEIEN.AUSBLENDEN] }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'nur eine neue Datei (gleich Soll) vorhanden: Exit 3'); gleich(stand().calls, [], 'nur eine neue Datei vorhanden: nichts geschrieben');

  // 8. Sicherung weicht ab → Exit 4, nichts geschrieben
  neuerStand(); const sv = join(PAKET, 'sicherung', sichName(DATEIEN.CSS)), svInhalt = readFileSync(sv, 'utf8');
  writeFileSync(sv, svInhalt + '/* x */\n'); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'verfälschte Sicherung: Exit 4'); gleich(stand().calls, [], 'verfälschte Sicherung: nichts geschrieben'); writeFileSync(sv, svInhalt);

  // 9. userErrors in Schritt 2: Teilzustand, Hinweis, wiederholtes LIVE verweist auf die Rücknahme, Rücknahme stellt her
  neuerStand(); r = lauf('step2all', { LIVE: '1' });
  gleich(r.code, 5, 'userErrors Schritt 2: Exit 5'); ok(/Teilzustand/.test(r.aus), 'userErrors: Hinweis auf Teilzustand');
  ok(SCHRITT1.every((f) => stand().files[f] === soll[f]) && SCHRITT2.every((f) => stand().files[f] === sich[f]), 'userErrors: Schritt 1 geschrieben, Schritt 2 nicht');
  const v9 = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'LIVE nach reinem Schritt 1: Exit 3 (nicht 4)'); ok(/Rücknahme: ZURUECK=1/.test(r.aus), 'LIVE nach Schritt 1: nennt die Rücknahme'); gleich(stand().calls.length, v9, 'LIVE nach Schritt 1: nichts geschrieben');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach Schritt 1: Exit'); ok(istSicherung(), 'Rücknahme nach Schritt 1: Sicherung hergestellt');
  gleich(stand().calls.slice(v9), [RUECK1, ['DEL', ...NEU]], 'Rücknahme nach Schritt 1: schreibt nur die sieben alten Dateien von Schritt 1 und löscht die zwei neuen');

  // 10. nur die JS-Datei abgelehnt
  neuerStand(); r = lauf('step2err', { LIVE: '1' }); gleich(r.code, 5, 'JS abgelehnt: Exit 5');
  ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] && stand().files[DATEIEN.CSS] === soll[DATEIEN.CSS], 'JS abgelehnt: CSS geschrieben, JS alt');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach abgelehntem JS: Exit'); ok(istSicherung(), 'Rücknahme nach abgelehntem JS: Sicherung hergestellt');

  // 11. Speicher legt die Variantenkarte anders ab (Prüfsumme nie gleich) → Exit 6, Schritt 2 NICHT geschrieben
  neuerStand(); r = lauf('norm', { LIVE: '1' });
  gleich(r.code, 6, 'Prüfsumme nie sichtbar: Exit 6'); gleich(stand().calls.length, 1, 'Prüfsumme nie sichtbar: Schritt 2 nicht geschrieben'); ok(/Schritt 2 NICHT/.test(r.aus), 'Prüfsumme nie sichtbar: Meldung');
  ok(SCHRITT2.every((f) => stand().files[f] === sich[f]), 'Prüfsumme nie sichtbar: Code-Dateien unberührt');
  // 11b. Rücknahme verweigert die «fremde» Karte, nichts wird geschrieben; mit FREMD_UEBERSCHREIBEN=1 geht es
  const v11 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme mit fremder Datei: Exit 3'); gleich(stand().calls.length, v11, 'Rücknahme mit fremder Datei: nichts geschrieben'); ok(/fremd: assets\/luxe-clothing-variantenkarte\.json/.test(r.aus) && /FREMD_UEBERSCHREIBEN=1/.test(r.aus), 'Rücknahme mit fremder Datei: nennt Datei, Prüfsummen und den Ausweg');
  r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 0, 'FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(istSicherung(), 'FREMD_UEBERSCHREIBEN=1: Sicherung hergestellt, fremde neue Datei gelöscht');

  // 12. Ausnahme während des zweiten Schreibens: Exit 7 mit Teilzustand-Hinweis; Rücknahme geht
  neuerStand(); r = lauf('throw2', { LIVE: '1' });
  gleich(r.code, 7, 'Ausnahme beim Schreiben: Exit 7'); ok(/Teilzustand/.test(r.aus) && /fetch failed/.test(r.aus), 'Ausnahme beim Schreiben: Hinweis und Ursache sichtbar');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach Ausnahme: Exit'); ok(istSicherung(), 'Rücknahme nach Ausnahme: Sicherung hergestellt');

  // 13. Grosse Dateien kommen als URL
  neuerStand(); r = lauf('url', { LIVE: '1' }); gleich(r.code, 0, 'Dateien als URL: Exit'); ok(istSoll(), 'Dateien als URL: Soll-Stand erreicht');
  r = lauf('url', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme mit URL-Dateien: Exit'); ok(istSicherung(), 'Rücknahme mit URL-Dateien: Sicherung hergestellt');

  // 14. Rücknahme verweigert jede Datei, die jemand anderes verändert hat (auch eine der neun alten)
  neuerStand(); lauf('', { LIVE: '1' });
  const st = stand(); st.files[DATEIEN.EN] += '\n'; writeFileSync(STATE, JSON.stringify(st));
  const v14 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme bei fremd verändertem Stand: Exit 3'); gleich(stand().calls.length, v14, 'Rücknahme bei fremd verändertem Stand: nichts geschrieben');
  // 14b. Ein anderer Auftrag hat luxe-clothing.js nach dem Einspielen weiterverändert → ebenso Exit 3
  neuerStand(); lauf('', { LIVE: '1' });
  const st2 = stand(); st2.files[DATEIEN.JS] += '/* anderer Auftrag */\n'; writeFileSync(STATE, JSON.stringify(st2));
  const v14b = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme nach fremder Änderung am JS: Exit 3'); gleich(stand().calls.length, v14b, 'Rücknahme nach fremder Änderung am JS: nichts geschrieben');

  // 15. Neue Dateien bleiben stehen (NEUE_BEHALTEN=1)
  neuerStand(); lauf('', { LIVE: '1' });
  r = lauf('', { ZURUECK: '1', LIVE: '1', NEUE_BEHALTEN: '1' }); gleich(r.code, 0, 'NEUE_BEHALTEN: Exit'); ok(ALT.every((f) => stand().files[f] === sich[f]) && NEU.every((f) => stand().files[f] === soll[f]), 'NEUE_BEHALTEN: neun alte zurück, zwei neue bleiben');
  ok(!stand().calls.some((c) => c[0] === 'DEL'), 'NEUE_BEHALTEN: kein Löschaufruf');

  // 15b. Erster echter Lauf: die Sicherung gibt es noch nicht und wird aus dem Live-Stand angelegt (alle neun Dateien, byte-gleich dem Ausgangsstand)
  neuerStand();
  for (const f of ALT) rmSync(join(PAKET, 'sicherung', sichName(f)), { force: true });
  r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'ohne vorhandene Sicherung: LIVE Exit 0'); ok(istSoll(), 'ohne vorhandene Sicherung: Soll-Stand erreicht');
  ok(ALT.every((f) => existsSync(join(PAKET, 'sicherung', sichName(f))) && readFileSync(join(PAKET, 'sicherung', sichName(f)), 'utf8') === sich[f]), 'ohne vorhandene Sicherung: alle neun .vor-Dateien angelegt und gleich dem Ausgangsstand');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'ohne vorhandene Sicherung: Rücknahme danach geht'); ok(istSicherung(), 'ohne vorhandene Sicherung: Rücknahme stellt den Ausgangsstand her');
  // die Sicherung des Pakets wieder herstellen (die Folge-Szenarien brauchen sie)
  for (const f of ALT) writeFileSync(join(PAKET, 'sicherung', sichName(f)), sich[f]);

  // 16. Löschen scheitert (userErrors) → Exit 5; Löschen ohne Wirkung → Exit 6 (Rücklesen)
  neuerStand(); lauf('', { LIVE: '1' });
  r = lauf('delerr', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 5, 'Löschen mit userErrors: Exit 5'); ok(/FAKE nicht löschbar/.test(r.aus), 'Löschen mit userErrors: Ursache sichtbar');
  ok(ALT.every((f) => stand().files[f] === sich[f]), 'Löschen mit userErrors: die neun alten Dateien sind trotzdem zurück');
  neuerStand(); lauf('', { LIVE: '1' });
  r = lauf('nodelete', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 6, 'Löschen ohne Wirkung: Exit 6 (Rücklesen weicht ab)'); ok(/ABWEICHUNG/.test(r.aus), 'Löschen ohne Wirkung: ABWEICHUNG gemeldet');
} finally {
  rmSync(D, { recursive: true, force: true });
}
console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
