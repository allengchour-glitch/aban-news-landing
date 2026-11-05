// Test für apply.mjs (das einzige Skript des Pakets, das live schreibt) gegen eine Attrappe der Theme-API. Kein Netz, kein Shopify.
//   node dropship/katalog-einheiten-0411/apply_test.mjs
// Die Attrappe (shopify_gql.mjs im Wegwerfordner) hält die sieben Dateien in einer JSON-Datei, kennt die Abfragen von apply.mjs und kann gezielt
// Fehler machen (FAKE=...): userErrors in Schritt 2, ein Speicher, der die Galerie anders ablegt (norm), eine Ausnahme beim zweiten Schreiben,
// Galerie als URL, fehlende Prüfsumme. APPLY_ZEIT=0.001 verkürzt alle Wartezeiten.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DATEIEN, MD5_VOR, anwenden } from './patches.mjs';

const HIER = new URL('.', import.meta.url).pathname;
const md5 = (s) => createHash('md5').update(s).digest('hex');
let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

const NAMEN = Object.values(DATEIEN);
const SCHRITT1 = [DATEIEN.DE, DATEIEN.EN, DATEIEN.SECTION, DATEIEN.GALERIE], SCHRITT2 = [DATEIEN.CSS, DATEIEN.JS, DATEIEN.BUY];
const sichName = (f) => f.replace('/', '__') + '.vor';
const sich = Object.fromEntries(NAMEN.map((f) => [f, readFileSync(HIER + 'sicherung/' + sichName(f), 'utf8')]));
const soll = anwenden(sich, JSON.parse(readFileSync(HIER + 'daten/etiketten.json', 'utf8')));
const sollMd5 = Object.fromEntries(NAMEN.map((f) => [f, md5(soll[f])]));

// ---------- Wegwerf-Umgebung ----------
const D = mkdtempSync(join(tmpdir(), 'lxapply-'));
const PAKET = join(D, 'dropship/katalog-einheiten-0411');
mkdirSync(join(D, 'automation/lib'), { recursive: true });
mkdirSync(PAKET, { recursive: true });
for (const f of ['apply.mjs', 'patches.mjs', 'etiketten.mjs']) cpSync(HIER + f, join(PAKET, f));
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
    const nodes = vars.f.filter((n) => s.files[n] != null).map((n) => {
      const c = s.files[n], url = FAKE.includes('url') && n.includes('gallery');
      return { filename: n, size: Buffer.byteLength(c), checksumMd5: FAKE.includes('nocsum') ? null : md5(c),
        body: url ? { __typename: 'OnlineStoreThemeFileBodyUrl', url: 'https://fake.invalid/' + n } : { __typename: 'OnlineStoreThemeFileBodyText', content: c } };
    });
    return { theme: { files: { nodes } } };
  }
  if (query.includes('themeFilesUpsert')) {
    s.calls = s.calls || []; s.calls.push(vars.files.map((f) => f.filename));
    const callNo = s.calls.length, errs = [];
    for (const f of vars.files) {
      if ((FAKE.includes('step2err') && callNo === 2 && f.filename.endsWith('.js')) || (FAKE.includes('step2all') && callNo === 2)) { errs.push({ filename: f.filename, message: 'FAKE Syntaxfehler' }); continue; }
      let v = f.body.value;
      if (FAKE.includes('norm') && f.filename.includes('gallery') && callNo === 1) v = v.replace(/\\n$/, '');
      s.files[f.filename] = v;
    }
    save(s);
    if (FAKE.includes('throw2') && callNo === 2) throw new Error('GraphQL: fetch failed (FAKE)');
    return { themeFilesUpsert: { upsertedThemeFiles: vars.files.filter((f) => !errs.some((e) => e.filename === f.filename)).map((f) => ({ filename: f.filename })), userErrors: errs } };
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
  writeFileSync(STATE, JSON.stringify({ files: { ...sich, ...aenderung }, calls: [] }));
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
const md5Stand = () => Object.fromEntries(NAMEN.map((f) => [f, md5(stand().files[f])]));
const istSicherung = () => NAMEN.every((f) => stand().files[f] === sich[f]);
const istSoll = () => NAMEN.every((f) => stand().files[f] === soll[f]);

try {
  // 0. Die Wegwerf-Umgebung hat wirklich den Ausgangsstand
  ok(NAMEN.every((f) => md5(sich[f]) === MD5_VOR[f]), 'Sicherung gleich MD5_VOR');

  // 1. Trockenlauf schreibt nichts
  neuerStand(); let r = lauf('');
  gleich(r.code, 0, 'Trockenlauf: Exit'); gleich(stand().calls, [], 'Trockenlauf: keine Schreibaufrufe'); ok(istSicherung(), 'Trockenlauf: Stand unverändert'); ok(!existsSync(MERK), 'Trockenlauf: keine Merkliste'); ok(/Trockenlauf/.test(r.aus), 'Trockenlauf: Meldung');

  // 2. Einspielen: Reihenfolge, Ergebnis, Merkliste
  neuerStand(); r = lauf('', { LIVE: '1' });
  gleich(r.code, 0, 'LIVE: Exit'); gleich(stand().calls, [SCHRITT1, SCHRITT2], 'LIVE: zwei Schritte in dieser Reihenfolge (Texte/Section/Galerie, dann CSS/JS/Produktseite)');
  ok(istSoll(), 'LIVE: alle sieben Dateien gleich dem Soll-Stand'); gleich(md5Stand(), sollMd5, 'LIVE: Prüfsummen gleich dem Soll');
  ok(existsSync(MERK) && JSON.stringify(JSON.parse(readFileSync(MERK, 'utf8')).md5) === JSON.stringify(sollMd5), 'LIVE: Merkliste mit den Soll-Prüfsummen');
  gleich((r.aus.match(/GLEICH/g) || []).length, 7, 'LIVE: Rücklesen meldet 7 × GLEICH'); ok(!/ABWEICHUNG/.test(r.aus), 'LIVE: keine ABWEICHUNG');

  // 3. Zweites Einspielen wird abgelehnt
  const vorher = stand().calls.length; r = lauf('', { LIVE: '1' });
  gleich(r.code, 3, 'zweites LIVE: Exit 3'); gleich(stand().calls.length, vorher, 'zweites LIVE: nichts geschrieben'); ok(/Schon eingespielt/.test(r.aus), 'zweites LIVE: Meldung');

  // 4. Rücknahme nach Erfolg: erst Code, dann Texte; Ergebnis gleich Sicherung
  r = lauf('', { ZURUECK: '1' });
  gleich(r.code, 0, 'ZURUECK Trockenlauf: Exit'); gleich((r.aus.match(/neu/g) || []).length >= 7, true, 'ZURUECK Trockenlauf: 7 Dateien «neu»'); gleich(stand().calls.length, vorher, 'ZURUECK Trockenlauf: nichts geschrieben');
  r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK LIVE: Exit'); gleich(stand().calls.slice(vorher), [SCHRITT2, SCHRITT1], 'ZURUECK: erst CSS/JS/Produktseite, dann Texte/Section/Galerie'); ok(istSicherung(), 'ZURUECK: alle sieben Dateien gleich der Sicherung');

  // 5. Rücknahme ohne etwas zu tun
  const v5 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 0, 'ZURUECK im Ausgangsstand: Exit 0'); gleich(stand().calls.length, v5, 'ZURUECK im Ausgangsstand: nichts geschrieben'); ok(/nichts, alles schon im Ausgangsstand/.test(r.aus), 'ZURUECK im Ausgangsstand: Meldung');

  // 6. Rücknahme ohne Merkliste (Soll wird aus Paket und Daten gerechnet)
  neuerStand(); lauf('', { LIVE: '1' }); rmSync(MERK, { force: true });
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'ZURUECK ohne Merkliste: Exit'); ok(istSicherung(), 'ZURUECK ohne Merkliste: Sicherung hergestellt');

  // 7. Ausgangsstand weicht ab → Exit 4, nichts geschrieben
  neuerStand({ [DATEIEN.DE]: sich[DATEIEN.DE] + '\n' }); r = lauf('', { LIVE: '1' });
  gleich(r.code, 4, 'fremder Ausgangsstand: Exit 4'); gleich(stand().calls, [], 'fremder Ausgangsstand: nichts geschrieben'); ok(!existsSync(MERK), 'fremder Ausgangsstand: keine Merkliste');
  neuerStand(); r = lauf('nocsum', { LIVE: '1' }); gleich(r.code, 4, 'fehlende Prüfsumme: Exit 4'); gleich(stand().calls, [], 'fehlende Prüfsumme: nichts geschrieben');

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
  gleich(stand().calls.slice(v9), [SCHRITT1], 'Rücknahme nach Schritt 1: schreibt nur die vier Dateien von Schritt 1');

  // 10. nur die JS-Datei abgelehnt
  neuerStand(); r = lauf('step2err', { LIVE: '1' }); gleich(r.code, 5, 'JS abgelehnt: Exit 5');
  ok(stand().files[DATEIEN.JS] === sich[DATEIEN.JS] && stand().files[DATEIEN.CSS] === soll[DATEIEN.CSS] && stand().files[DATEIEN.BUY] === soll[DATEIEN.BUY], 'JS abgelehnt: CSS und Produktseite geschrieben, JS alt');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach abgelehntem JS: Exit'); ok(istSicherung(), 'Rücknahme nach abgelehntem JS: Sicherung hergestellt');

  // 11. Speicher legt die Galerie anders ab (Prüfsumme nie gleich) → Exit 6, Schritt 2 NICHT geschrieben
  neuerStand(); r = lauf('norm', { LIVE: '1' });
  gleich(r.code, 6, 'Prüfsumme nie sichtbar: Exit 6'); gleich(stand().calls.length, 1, 'Prüfsumme nie sichtbar: Schritt 2 nicht geschrieben'); ok(/Schritt 2 NICHT/.test(r.aus), 'Prüfsumme nie sichtbar: Meldung');
  ok(SCHRITT2.every((f) => stand().files[f] === sich[f]), 'Prüfsumme nie sichtbar: Code-Dateien unberührt');
  // 11b. Rücknahme verweigert die «fremde» Galerie, nichts wird geschrieben; mit FREMD_UEBERSCHREIBEN=1 geht es
  const v11 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme mit fremder Datei: Exit 3'); gleich(stand().calls.length, v11, 'Rücknahme mit fremder Datei: nichts geschrieben'); ok(/fremd: assets\/luxe-clothing-reference-gallery\.json/.test(r.aus) && /FREMD_UEBERSCHREIBEN=1/.test(r.aus), 'Rücknahme mit fremder Datei: nennt Datei, Prüfsummen und den Ausweg');
  r = lauf('', { ZURUECK: '1', LIVE: '1', FREMD_UEBERSCHREIBEN: '1' }); gleich(r.code, 0, 'FREMD_UEBERSCHREIBEN=1: Exit 0'); ok(istSicherung(), 'FREMD_UEBERSCHREIBEN=1: Sicherung hergestellt');

  // 12. Ausnahme während des zweiten Schreibens: Exit 7 mit Teilzustand-Hinweis; Rücknahme geht
  neuerStand(); r = lauf('throw2', { LIVE: '1' });
  gleich(r.code, 7, 'Ausnahme beim Schreiben: Exit 7'); ok(/Teilzustand/.test(r.aus) && /fetch failed/.test(r.aus), 'Ausnahme beim Schreiben: Hinweis und Ursache sichtbar');
  r = lauf('', { ZURUECK: '1', LIVE: '1' }); gleich(r.code, 0, 'Rücknahme nach Ausnahme: Exit'); ok(istSicherung(), 'Rücknahme nach Ausnahme: Sicherung hergestellt');

  // 13. Galerie kommt als URL (grosse Datei)
  neuerStand(); r = lauf('url', { LIVE: '1' }); gleich(r.code, 0, 'Galerie als URL: Exit'); ok(istSoll(), 'Galerie als URL: Soll-Stand erreicht');

  // 14. Rücknahme verweigert jede Datei, die jemand anderes verändert hat
  neuerStand(); lauf('', { LIVE: '1' });
  const st = stand(); st.files[DATEIEN.EN] += '\n'; writeFileSync(STATE, JSON.stringify(st));
  const v14 = stand().calls.length; r = lauf('', { ZURUECK: '1', LIVE: '1' });
  gleich(r.code, 3, 'Rücknahme bei fremd verändertem Stand: Exit 3'); gleich(stand().calls.length, v14, 'Rücknahme bei fremd verändertem Stand: nichts geschrieben');
} finally {
  rmSync(D, { recursive: true, force: true });
}
console.log(`${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
