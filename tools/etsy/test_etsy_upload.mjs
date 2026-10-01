// Tests für den Etsy-Upload ohne echtes Etsy: (1) Regelprüfung schlägt bei Verstössen an, (2) nachgebauter
// Etsy-Server prüft Reihenfolge, Formate und Pflichtfelder laut OpenAPI-Spezifikation.
//   node tools/etsy/test_etsy_upload.mjs
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { paketLesen, pruefen, schluesselFehler } from './etsy_upload.mjs';

let ok = true;
const t = (c, m) => { console.log((c ? '✅ ' : '❌ ') + m); if (!c) ok = false; };

// 1. Gegenprobe Regelprüfung
const gut = paketLesen('en/budget-planner');
t(pruefen(gut).length === 0, 'echtes Paket besteht die Regeln');
const schlecht = { ...gut, titel: 'A: B: C & D & E', tags: [...gut.tags.slice(0, 12), 'zu&viel'], dateien: [] };
const f = pruefen(schlecht);
t(f.some((x) => x.includes('„:"')) && f.some((x) => x.includes('„&"')), `doppelte : und & erkannt`);
t(f.some((x) => x.includes('unerlaubtem Zeichen')), 'Tag mit & erkannt');
t(f.some((x) => x.includes('Dateien')), 'fehlende Dateien erkannt');
t(pruefen({ ...gut, tags: gut.tags.slice(0, 12) }).some((x) => x.includes('12 Tags')), '12 statt 13 Tags erkannt');
t(gut.beschreibung.startsWith('Stop getting surprised') && !gut.beschreibung.includes('FILES'), 'Beschreibung sauber ausgeschnitten');

// 1b. Platzhalter-Schlüssel (so stand er in Cloudflare: client_id=keystring) wird erkannt, echter Aufbau nicht
const ECHT = 'a1b2c3d4e5f6g7h8i9j0k1l2:zz9yy8xx7w';
t(schluesselFehler('keystring:shared_secret').includes('Platzhalter'), 'Platzhalter keystring:shared_secret erkannt');
t(schluesselFehler('a1b2c3d4e5f6g7h8i9j0k1l2').includes('shared_secret'), 'fehlendes :shared_secret erkannt');
t(schluesselFehler('') === 'ETSY_API_KEY fehlt', 'leerer Schlüssel erkannt');
t(schluesselFehler(ECHT) === '', 'echt aufgebauter Schlüssel akzeptiert');

// 2. Nachgebauter Etsy-Server
const log = [];
const server = http.createServer((req, res) => {
  let body = [];
  req.on('data', (c) => body.push(c)).on('end', () => {
    body = Buffer.concat(body);
    const ct = req.headers['content-type'] || '';
    log.push({ m: req.method, u: req.url, ct, key: req.headers['x-api-key'], auth: req.headers.authorization, body: ct.startsWith('multipart') ? body.toString('latin1') : body.toString() });
    const j = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/v3/application/openapi-ping') return req.headers['x-api-key'] === ECHT ? j({ application_id: 5 }) : j({ error: 'Invalid API key' }, 403);
    if (req.url === '/token') return j({ access_token: 'AT', refresh_token: 'RT2' });
    if (req.url === '/v3/application/users/me') return j({ user_id: 1, shop_id: 77 });
    if (req.url === '/v3/application/shops/77') return j({ shop_name: 'TestShop', currency_code: 'CHF' });
    if (req.url === '/v3/application/seller-taxonomy/nodes') return j({ results: [{ id: 1, name: 'Paper & Party Supplies', children: [{ id: 2, name: 'Paper', children: [{ id: 1234, name: 'Planner Templates' }] }] }] });
    if (req.url === '/v3/application/shops/77/listings' && req.method === 'POST') return j({ listing_id: 900 + log.filter((x) => x.u.endsWith('/listings')).length });
    return j({});
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'etsy-'));
fs.mkdirSync(path.join(tmp, 'data'));
fs.symlinkSync(path.resolve('content'), path.join(tmp, 'content'));
const env = { ...process.env, ROOT: tmp, DRY_RUN: '0', ETSY_API_KEY: ECHT, ETSY_REFRESH_TOKEN: 'RT1', PAKETE: 'en/budget-planner,schulden-plan',
  ETSY_API_BASE: `http://127.0.0.1:${port}/v3`, ETSY_TOKEN_URL: `http://127.0.0.1:${port}/token` };
const lauf = () => new Promise((resolve) => {
  import('child_process').then(({ execFile }) => execFile('node', ['tools/etsy/etsy_upload.mjs'], { env }, (e, so, se) => resolve({ e, so, se })));
});
let r = await lauf();
t(!r.e, 'Upload-Lauf gegen den Nachbau ohne Fehler' + (r.e ? ': ' + r.se : ''));
const tok = log.find((x) => x.u === '/token');
t(tok && /grant_type=refresh_token/.test(tok.body) && /client_id=a1b2c3d4e5f6g7h8i9j0k1l2(&|$)/.test(tok.body), 'Token-Erneuerung mit client_id = keystring (ohne Secret)');
t(log.filter((x) => x.u !== '/token').every((x) => x.key === ECHT && x.auth === 'Bearer AT'), 'jede API-Anfrage mit x-api-key keystring:secret + Bearer-Token');
const neu = log.filter((x) => x.u === '/v3/application/shops/77/listings');
const p = new URLSearchParams(neu[0]?.body);
t(neu.length === 2 && neu[0].ct.includes('x-www-form-urlencoded'), '2 Entwürfe als form-urlencoded angelegt');
t(['quantity', 'title', 'description', 'price', 'who_made', 'when_made', 'taxonomy_id'].every((k) => p.get(k)), 'alle Pflichtfelder laut Spezifikation gesetzt');
t(p.get('type') === 'download' && p.get('who_made') === 'i_did' && p.get('when_made') === '2020_2026' && p.get('taxonomy_id') === '1234', 'type=download, i_did, 2020_2026, Kategorie aus dem Baum');
t(p.get('price') === '8' && p.get('tags').split(',').length === 13, 'Preis in Shop-Währung (CHF 8) und 13 Tags');
const bilder = log.filter((x) => /\/listings\/90\d\/images$/.test(x.u)), dateien = log.filter((x) => /\/listings\/90\d\/files$/.test(x.u));
t(bilder.length === 10 && bilder.every((x) => x.ct.startsWith('multipart/form-data') && x.body.includes('name="image"')), '10 Bilder als multipart „image" hochgeladen');
t(dateien.length === 5 && dateien.every((x) => x.body.includes('name="file"') && x.body.includes('name="name"')), '5 Dateien als multipart „file" hochgeladen');
t(!log.some((x) => x.m === 'PATCH'), 'ohne ACTIVATE nichts veröffentlicht');
const ledger = JSON.parse(fs.readFileSync(path.join(tmp, 'data/etsy-listings.json')));
t(Object.keys(ledger).length === 2, 'Ledger mit 2 Einträgen geschrieben');
// Idempotenz: zweiter Lauf legt nichts neu an
const vorher = log.length;
r = await lauf();
t(!r.e && !log.slice(vorher).some((x) => x.u.endsWith('/listings') && x.m === 'POST'), 'zweiter Lauf legt nichts doppelt an');
// Schlüssel-Test (KEY_CHECK): gültig → 0, abgelehnt → 1, Platzhalter → 1 ohne Netz
const pruef = (key) => new Promise((resolve) => import('child_process').then(({ execFile }) =>
  execFile('node', ['tools/etsy/etsy_upload.mjs'], { env: { ...env, KEY_CHECK: '1', ETSY_API_KEY: key } }, (e, so) => resolve({ e, so }))));
const vorPing = log.length;
let k = await pruef(ECHT);
t(!k.e && k.so.includes('gültig'), 'KEY_CHECK: gültiger Schlüssel → grün');
k = await pruef('zzzzzzzzzzzzzzzzzzzzzzzz:falsch1');
t(k.e && k.so.includes('403') && k.so.includes('freigegeben'), 'KEY_CHECK: abgelehnter Schlüssel → rot mit Hinweis auf Freigabe');
k = await pruef('keystring:shared_secret');
t(k.e && k.so.includes('Platzhalter') && log.length === vorPing + 2, 'KEY_CHECK: Platzhalter → rot, ohne Anfrage an Etsy');
server.close();
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(ok ? 0 : 1);
