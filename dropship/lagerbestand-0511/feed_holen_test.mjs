// Test für automation/fortura_feed_holen.sh gegen einen Attrappen-Server, der die Synology-FileStation-API nachbildet. Kein Fortura-Zugriff.
//   node dropship/lagerbestand-0511/feed_holen_test.mjs
// Der Server läuft auf 127.0.0.1; das Skript nimmt eine Ersatzadresse nur zusammen mit FORTURA_TEST=1 an (sonst immer webtransfer.fortura.ch).
// Geprüft: Erfolgsweg (Reihenfolge Login -> Download -> Zeitstempel -> Logout, Serverzeit als Dateizeit, nichts Halbes am Ziel), alle Fehlerwege mit Exit 2
// (falsches Passwort wird NICHT wiederholt, zu kleine Datei, JSON-Fehlerantwort, falscher Inhalt, Server 503 mit Wiederholung), Zugangsdaten nie in
// URL/Ausgabe/Befehlszeile, Zertifikatsprüfung ist ohne FORTURA_TLS_UNSICHER=1 scharf. Alter des Feeds: FORTURA_MAX_ALTER_H lehnt einen veralteten Feed ab,
// und ist der Stand auf dem Server nicht lesbar, steht die Dateizeit auf 1970, sodass das Gate des Stempels ablehnt (Prüfer 05.11.: vorher wurde die Abrufzeit genommen).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '../..');
const SKRIPT = path.join(WURZEL, 'automation/fortura_feed_holen.sh');

let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);

const USER = 'kunde544341-test', PW = 'Geh&eim/Pw+ä%20=?x';   // Sonderzeichen: müssen per URL-Kodierung heil ankommen
const SID = 'SID-TEST-9f3a';

function feedKoerper(bytes) {
  const kopf = 'ArtNr|Bezeichnung|Lagerbestand Bazar|Lagerbestand Fortura|Lagerbestand Total|Internet_VE\r\n';
  const teile = [kopf]; let groesse = kopf.length, i = 0;
  while (groesse < bytes) { const z = `A${String(i++).padStart(7, '0')}|Artikel ${i}|1|${i % 7}|${1 + (i % 7)}|1\r\n`; teile.push(z); groesse += z.length; }
  return Buffer.from(teile.join('').slice(0, bytes), 'latin1');
}
// Mindestgrösse 9 MB (Messbasis: Feed vom 05.11.2026 = 11,7 MB). GROSS liegt knapp darüber, ZU_KLEIN knapp darunter; die Grenze selbst wird auf das Byte geprüft.
const GROSS = feedKoerper(9_200_000), ZU_KLEIN = feedKoerper(8_900_000), KLEIN = feedKoerper(2000);
const GENAU_GRENZE = feedKoerper(9_000_000), EIN_BYTE_DARUNTER = feedKoerper(8_999_999), ALTE_GRENZE = feedKoerper(5_200_000);
const OHNE_KOPF = Buffer.from('x'.repeat(9_200_000));

function startServer(art, optionen) {
  const log = [];
  const handler = (req, res) => {
    const url = new URL(req.url, 'http://x');
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      const p = new URLSearchParams(req.method === 'POST' ? body : url.search);
      const o = optionen();
      const api = p.get('api'), methode = p.get('method');
      log.push({ methode: req.method, api, apiMethode: methode, urlHatPasswort: req.url.includes('passwd') || req.url.includes(encodeURIComponent(PW)), konto: p.get('account'), pw: p.get('passwd'), sid: p.get('_sid'), pfad: p.get('path') });
      const json = (obj, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (api === 'SYNO.API.Auth' && methode === 'login') {
        if (o.login503 && log.filter(l => l.apiMethode === 'login').length <= o.login503) return json({}, 503);
        if (o.loginHtml) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>Zugriff gesperrt</html>'); }
        if (o.login403) { res.writeHead(403); return res.end('forbidden'); }
        if (o.gesperrt) return json({ error: { code: 407 }, success: false });
        if (p.get('account') === USER && p.get('passwd') === PW && !o.falschesPasswort) return json({ data: { sid: SID }, success: true });
        return json({ error: { code: 400 }, success: false });
      }
      if (api === 'SYNO.API.Auth' && methode === 'logout') return json({ success: true });
      if (p.get('_sid') !== SID) return json({ error: { code: 119 }, success: false });
      if (api === 'SYNO.FileStation.Download') {
        if (p.get('path') !== '/home/Art_DataFeed.CSV') return json({ error: { code: 408 }, success: false });
        if (o.downloadJsonFehler) return json({ error: { code: 408 }, success: false });
        if (o.download500) { res.writeHead(500); return res.end('kaputt'); }
        res.writeHead(200, { 'content-type': 'application/octet-stream' });
        return res.end(o.koerper);
      }
      if (api === 'SYNO.FileStation.List' && methode === 'getinfo') {
        if (o.ohneZeit) return json({ error: { code: 105 }, success: false });
        return json({ success: true, data: { files: [{ path: '/home/Art_DataFeed.CSV', additional: { time: { mtime: o.mtime } } }] } });
      }
      return json({ error: { code: 101 }, success: false });
    });
  };
  return new Promise(r => {
    const s = art.tls ? https.createServer(art.tls, handler) : http.createServer(handler);
    s.listen(0, '127.0.0.1', () => r({ s, log, port: s.address().port }));
  });
}

const tmpDirs = [];
const neuerTmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-')); tmpDirs.push(d); return d; };

// Das Skript bekommt einen eigenen TMPDIR: danach muss er leer sein (die Dateien mit den Zugangsdaten sind gelöscht, auch nach Fehlern).
function skript(env, args = []) {
  return new Promise(resolve => {
    const arbeit = neuerTmp();
    const k = spawn('bash', [SKRIPT, ...args], { env: { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, HOME: os.tmpdir(), NODE: process.execPath, TMPDIR: arbeit, ...env } });
    let out = '', err = '';
    k.stdout.on('data', d => { out += d; }); k.stderr.on('data', d => { err += d; });
    const t = setTimeout(() => k.kill('SIGKILL'), 60000);
    k.on('close', code => {
      clearTimeout(t);
      const rest = fs.readdirSync(arbeit);
      ok(rest.length === 0, `Arbeitsordner mit den Zugangsdateien ist nach dem Lauf gelöscht${rest.length ? ' (übrig: ' + rest.join(',') + ')' : ''}`);
      resolve({ code, out, err, alles: out + err });
    });
  });
}
const basisEnv = (port, extra = {}) => ({ FORTURA_FTP_USER: USER, FORTURA_FTP_PW: PW, FORTURA_TEST: '1', FORTURA_BASIS: `http://127.0.0.1:${port}`, FORTURA_PAUSE: '0', FORTURA_VERSUCHE: '3', ...extra });
const ohneGeheimnis = (r) => !r.alles.includes(PW) && !r.alles.includes(USER) && !r.alles.includes(encodeURIComponent(PW));

/* ---------- statische Prüfungen am Skripttext ---------- */
{
  const t = fs.readFileSync(SKRIPT, 'utf8');
  ok(!/set\s+-[a-z]*x/.test(t), 'kein «set -x»');
  ok(!/passwd=\$|account=\$|passwd=%s|-u\s+"?\$FORTURA/.test(t), 'Zugangsdaten stehen nicht in der Befehlszeile (name@datei statt name=$WERT)');
  ok(t.includes('"account@$ARBEIT/u"') && t.includes('"passwd@$ARBEIT/p"'), 'Zugangsdaten gehen per Datei an curl');
  ok(t.includes('B="https://webtransfer.fortura.ch"'), 'feste Adresse webtransfer.fortura.ch auf Port 443');
  ok(/\[ "\$\{FORTURA_TEST:-\}" = "1" \] && \[ -n "\$\{FORTURA_BASIS:-\}" \]/.test(t), 'Ersatzadresse gilt nur zusammen mit FORTURA_TEST=1');
  ok(t.includes('MIN_BYTES="${FORTURA_MIN_BYTES:-9000000}"') && !t.includes('5000000') && /11,7 MB/.test(t) && /Messbasis/.test(t), 'Mindestgrösse 9 MB mit genannter Messbasis (11,7 MB am 05.11.2026), der alte Wert 5 MB ist weg');
  ok(t.includes('/home/Art_DataFeed.CSV') && t.includes('SYNO.FileStation.Download') && t.includes('SYNO.API.Auth') && t.includes('"session=FileStation"'), 'Protokoll und Pfad wie das Original (FileStation, /home/Art_DataFeed.CSV)');
  ok(/TLS=\(-k\)/.test(t) && /FORTURA_TLS_UNSICHER:-\}" = "1"/.test(t) && !/curl[^\n]* -k /.test(t), '-k nur über FORTURA_TLS_UNSICHER=1');
  ok(/max-time 900/.test(t) && /max-time 120/.test(t) && /connect-timeout 30/.test(t), 'Zeitlimits gesetzt');
  ok(!/\bsource\b|\. \/tmp\/fortura_env/.test(t) && !t.includes('/tmp/fortura_env.sh" ]'), 'liest nichts aus /tmp/fortura_env.sh');
  ok(!/\brm\s+-rf\s+(\/|\$HOME|~)\s/.test(t), 'kein gefährliches rm');
  ok(!/-X\s+(PUT|DELETE)|method=(delete|upload|rename|create)/i.test(t), 'nur lesende API-Aufrufe');
  const sh = spawnSync('bash', ['-n', SKRIPT], { encoding: 'utf8' });
  gleich(sh.status, 0, 'bash -n: Syntax in Ordnung');
}

/* ---------- Erfolgsweg ---------- */
{
  const opt = { koerper: GROSS, mtime: Math.floor(Date.now() / 1000) - 3 * 3600 };
  const sv = await startServer({}, () => opt);
  const d = neuerTmp(); const out = path.join(d, 'sub/feed.csv');
  const r = await skript(basisEnv(sv.port), [out]);
  gleich(r.code, 0, 'Erfolg: Exit 0');
  ok(fs.existsSync(out) && fs.readFileSync(out).equals(GROSS), 'Erfolg: Datei am Ziel ist byte-gleich mit dem Server-Feed');
  ok(/Fortura-Feed geladen -> .*feed\.csv \(9200000 Bytes, \d+ Zeilen, Stand auf dem Server \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\)/.test(r.out), 'Erfolg: Meldung mit Bytes, Zeilen, Serverstand');
  const alterS = Date.now() / 1000 - fs.statSync(out).mtimeMs / 1000;
  ok(alterS > 3 * 3600 - 30 && alterS < 3 * 3600 + 60, `Erfolg: Dateizeit ist der Serverstand (3 Stunden), nicht die Abrufzeit (gemessen ${(alterS / 3600).toFixed(2)} h)`);
  gleich(sv.log.map(l => `${l.api}:${l.apiMethode}`), ['SYNO.API.Auth:login', 'SYNO.FileStation.Download:download', 'SYNO.FileStation.List:getinfo', 'SYNO.API.Auth:logout'], 'Erfolg: Reihenfolge Login, Download, Zeitstempel, Logout');
  gleich([sv.log[0].methode, sv.log[0].konto === USER, sv.log[0].pw === PW], ['POST', true, true], 'Erfolg: Login per POST, Zugangsdaten mit Sonderzeichen kommen heil an');
  ok(sv.log.every(l => !l.urlHatPasswort), 'Erfolg: das Passwort steht in keiner URL');
  ok(sv.log.filter(l => l.sid).every(l => l.sid === SID), 'Erfolg: Download, Zeitstempel und Logout nutzen die SID');
  ok(ohneGeheimnis(r), 'Erfolg: Benutzer und Passwort nicht in der Ausgabe');
  gleich(fs.readdirSync(path.join(d, 'sub')), ['feed.csv'], 'Erfolg: keine Hilfsdateien neben dem Ziel');
  ok((fs.statSync(out).mode & 0o077) === 0, 'Erfolg: Datei nur für den Besitzer lesbar (umask 077)');
  sv.s.close();

  // Ziel aus FORTURA_CSV
  const sv2 = await startServer({}, () => opt);
  const out2 = path.join(neuerTmp(), 'aus-env.csv');
  const r2 = await skript(basisEnv(sv2.port, { FORTURA_CSV: out2 }));
  ok(r2.code === 0 && fs.existsSync(out2), 'Ziel aus FORTURA_CSV, wenn kein Argument');
  sv2.s.close();

  // Serverzeit nicht lesbar -> Hinweis, Exit 0, Dateizeit 1970 (NICHT die Abrufzeit: die sagt nichts über das Alter der Daten)
  const opt3 = { koerper: GROSS, ohneZeit: true };
  const sv3 = await startServer({}, () => opt3);
  const out3 = path.join(neuerTmp(), 'f.csv');
  const r3 = await skript(basisEnv(sv3.port), [out3]);
  ok(r3.code === 0 && /Stand der Datei auf dem Server nicht lesbar/.test(r3.err), 'ohne Serverzeit: Exit 0 mit Hinweis');
  gleich(fs.statSync(out3).mtimeMs, 0, 'ohne Serverzeit: Dateizeit steht auf 1970 (Alter der Daten unbelegt), nicht auf der Abrufzeit');
  ok(/NICHT gesetzt/.test(r3.err) && /1970/.test(r3.err), 'ohne Serverzeit: der Hinweis sagt, dass der Stempel nicht gesetzt wird');
  ok(!/Stand auf dem Server/.test(r3.out), 'ohne Serverzeit: die Meldung behauptet keinen Serverstand');
  ok(fs.readFileSync(out3).equals(GROSS), 'ohne Serverzeit: der Inhalt ist trotzdem vollständig (nur die Dateizeit ist 1970)');
  // Zusammenspiel mit dem Gate des Stempels: ein Feed ohne belegten Stand bekommt keinen Stempel (vorher: BESTANDEN, auch wenn er auf dem Server 5 Tage alt war)
  {
    const { stempelEntscheid } = await import(pathToFileURL(path.join(WURZEL, 'automation/fortura_bestand_stempel.mjs')).href);
    const jetzt = Date.now();
    const nach = 'Feed x: 1 Zeilen → 1 Artikelnummern (Fingerabdruck abc123def456)\nAbgleich: 8400 unverändert · 16 zu ändern (davon 2 auf 0) · 8 SKU nicht mehr im Feed (0.1 %)\n[DRY] nichts geschrieben.\n';
    const stand = { stand: new Date(jetzt - 60000).toISOString().slice(0, 16) + 'Z', feed_hash: 'abc123def456', offen: 0 };
    const gate = (mtimeMs) => stempelEntscheid({ liveExit: 0, nachText: nach, nachExit: 0, feedMtimeMs: mtimeMs, jetztMs: jetzt, stand });
    const eOhne = gate(fs.statSync(out3).mtimeMs);
    ok(!eOhne.ok && eOhne.gruende.some(g => g.includes('(c)') && g.includes('nicht belegt')), 'ohne Serverzeit: das Gate des Stempels lehnt die Datei ab, Grund (c) «nicht belegt»');
    // Gegenprobe mit lesbarer Serverzeit (3 Stunden alt): dasselbe Gate besteht
    const sv3b = await startServer({}, () => ({ koerper: GROSS, mtime: Math.floor(Date.now() / 1000) - 3 * 3600 }));
    const out3b = path.join(neuerTmp(), 'g.csv');
    const r3b = await skript(basisEnv(sv3b.port), [out3b]);
    ok(r3b.code === 0 && gate(fs.statSync(out3b).mtimeMs).ok, 'mit lesbarer Serverzeit (3 Stunden alt): dasselbe Gate besteht');
    sv3b.s.close();
  }
  sv3.s.close();

  // FORTURA_MAX_ALTER_H: nur mit lesbarer Serverzeit wirksam; ohne die Grenze gibt es nie eine Ablehnung wegen des Alters
  for (const [name, stundenAlt, grenze, soll] of [
    ['30 Stunden alt, Grenze 36', 30, '36', 0], ['35 Stunden 50 Minuten alt, Grenze 36', 35 + 50 / 60, '36', 0], ['36 Stunden 2 Minuten alt, Grenze 36', 36 + 2 / 60, '36', 2],
    ['40 Stunden alt, Grenze 36', 40, '36', 2], ['400 Stunden alt, ohne Grenze', 400, undefined, 0], ['400 Stunden alt, leere Grenze', 400, '', 0], ['40 Stunden alt, Grenze 48', 40, '48', 0],
  ]) {
    const opt = { koerper: GROSS, mtime: Math.floor(Date.now() / 1000 - stundenAlt * 3600) };
    const sv = await startServer({}, () => opt);
    const out = path.join(neuerTmp(), 'a.csv');
    fs.writeFileSync(out, 'ALTER-FEED-INHALT');
    const r = await skript(basisEnv(sv.port, grenze === undefined ? {} : { FORTURA_MAX_ALTER_H: grenze }), [out]);
    gleich(r.code, soll, `Alter: ${name}: Exit`);
    if (soll === 0) ok(fs.readFileSync(out).equals(GROSS), `Alter: ${name}: Feed liegt am Ziel`);
    else {
      gleich(fs.readFileSync(out, 'utf8'), 'ALTER-FEED-INHALT', `Alter: ${name}: das Ziel bleibt unverändert`);
      ok(/Stunden alt/.test(r.err) && /Veraltete Mengen werden nicht geschrieben/.test(r.err) && /FEHLER \(Fortura-Feed\)/.test(r.err), `Alter: ${name}: Meldung nennt Alter und Folge`);
      gleich(sv.log.filter(l => l.apiMethode === 'login').length, 1, `Alter: ${name}: kein zweiter Login (ein zu alter Feed wird nicht wiederholt geholt)`);
      gleich(sv.log.filter(l => l.apiMethode === 'logout').length, 1, `Alter: ${name}: die Sitzung wurde abgemeldet`);
    }
    ok(ohneGeheimnis(r), `Alter: ${name}: keine Zugangsdaten in der Ausgabe`);
    sv.s.close();
  }
  {
    // Serverzeit nicht lesbar + Grenze gesetzt: kein Urteil über das Alter möglich -> der Feed wird angenommen (der Stempel verweigert dann über Dateizeit 1970)
    const sv = await startServer({}, () => ({ koerper: GROSS, ohneZeit: true }));
    const out = path.join(neuerTmp(), 'b.csv');
    const r = await skript(basisEnv(sv.port, { FORTURA_MAX_ALTER_H: '36' }), [out]);
    ok(r.code === 0 && fs.statSync(out).mtimeMs === 0, 'Alter: Serverzeit unlesbar + Grenze 36: Feed wird angenommen, Dateizeit 1970');
    sv.s.close();
  }

  // genau auf der Grenze: 9 000 000 Bytes gehen durch
  {
    const svg = await startServer({}, () => ({ koerper: GENAU_GRENZE, mtime: Math.floor(Date.now() / 1000) - 3600 }));
    const outg = path.join(neuerTmp(), 'g.csv');
    const rg = await skript(basisEnv(svg.port, { FORTURA_VERSUCHE: '1' }), [outg]);
    ok(rg.code === 0 && fs.statSync(outg).size === 9_000_000, 'genau 9 000 000 Bytes: angenommen (die Grenze gehört dazu)');
    svg.s.close();
  }

  // Mindestgrösse einstellbar
  const opt4 = { koerper: KLEIN, mtime: Math.floor(Date.now() / 1000) };
  const sv4 = await startServer({}, () => opt4);
  const out4 = path.join(neuerTmp(), 'k.csv');
  const r4 = await skript(basisEnv(sv4.port, { FORTURA_MIN_BYTES: '1000' }), [out4]);
  ok(r4.code === 0 && fs.statSync(out4).size === KLEIN.length, 'FORTURA_MIN_BYTES=1000: kleiner Feed wird angenommen');
  sv4.s.close();
}

/* ---------- Fehlerwege: Exit 2 und das Ziel bleibt wie es war ---------- */
async function fehlerFall(name, opt, extra, { logins, pruefe } = {}) {
  const sv = await startServer({}, () => opt);
  const d = neuerTmp(); const out = path.join(d, 'feed.csv');
  fs.writeFileSync(out, 'ALTER-FEED-INHALT');
  const r = await skript(basisEnv(sv.port, extra), [out]);
  gleich(r.code, 2, `${name}: Exit 2`);
  gleich(fs.readFileSync(out, 'utf8'), 'ALTER-FEED-INHALT', `${name}: das Ziel bleibt unverändert`);
  gleich(fs.readdirSync(d), ['feed.csv'], `${name}: keine halbe Datei, keine Hilfsdateien`);
  ok(ohneGeheimnis(r), `${name}: keine Zugangsdaten in der Ausgabe`);
  if (logins !== undefined) gleich(sv.log.filter(l => l.apiMethode === 'login').length, logins, `${name}: Zahl der Login-Versuche`);
  ok(/FEHLER \(Fortura-Feed\)/.test(r.err), `${name}: Meldung «FEHLER (Fortura-Feed)»`);
  if (pruefe) pruefe(r, sv);
  sv.s.close();
  return { r, sv };
}
await fehlerFall('falsches Passwort', { koerper: GROSS, falschesPasswort: true }, {}, {
  logins: 1, pruefe: (r) => ok(/NICHT wiederholt/.test(r.err), 'falsches Passwort: wird nicht wiederholt (Sperrgefahr) und das steht in der Meldung'),
});
await fehlerFall('Login antwortet mit HTML statt JSON', { loginHtml: true }, {}, {
  logins: 3, pruefe: (r) => ok(/Antwort ohne JSON\/SID/.test(r.err) && !/NICHT wiederholt/.test(r.err), 'HTML-Antwort ist kein Urteil über die Zugangsdaten: wird wiederholt'),
});
await fehlerFall('Login mit HTTP 403 vom Proxy', { login403: true }, {}, { logins: 3, pruefe: (r) => ok(/Login: HTTP 403/.test(r.err), 'HTTP 403 am Login wird gemeldet und wiederholt') });
await fehlerFall('Quelladresse gesperrt (API-Code 407)', { gesperrt: true }, {}, {
  logins: 1, pruefe: (r) => ok(/Fehlercode 407/.test(r.err) && /Quelladresse/.test(r.err) && /NICHT wiederholt/.test(r.err), 'Code 407 wird genannt und nicht wiederholt'),
});
await fehlerFall('zu kleine Datei (8,9 MB)', { koerper: ZU_KLEIN, mtime: 1_700_000_000 }, {}, {
  logins: 3, pruefe: (r, sv) => {
    ok(/zu klein: 8900000 Bytes \(Mindestens 9000000\)/.test(r.err), 'zu klein: Grösse und Grenze in der Meldung');
    gleich(sv.log.filter(l => l.apiMethode === 'logout').length, 3, 'zu klein: nach jedem Versuch wird die Sitzung abgemeldet');
  },
});
await fehlerFall('ein Byte unter der Grenze (8 999 999)', { koerper: EIN_BYTE_DARUNTER, mtime: 1_700_000_000 }, { FORTURA_VERSUCHE: '1' }, { logins: 1, pruefe: (r) => ok(/zu klein: 8999999 Bytes/.test(r.err), 'ein Byte darunter: abgelehnt') });
await fehlerFall('der frühere Mindestwert 5 MB (5,2 MB) reicht nicht mehr', { koerper: ALTE_GRENZE, mtime: 1_700_000_000 }, { FORTURA_VERSUCHE: '1' }, { logins: 1, pruefe: (r) => ok(/zu klein: 5200000 Bytes/.test(r.err), 'ein halb abgeschnittener Feed (5,2 von 11,7 MB) wird abgelehnt') });
await fehlerFall('JSON-Fehlerantwort statt Feed', { downloadJsonFehler: true }, {}, { logins: 3 });
await fehlerFall('Inhalt ohne Kopfzeile ArtNr', { koerper: OHNE_KOPF }, {}, { logins: 3, pruefe: (r) => ok(/ArtNr/.test(r.err), 'ohne Kopfzeile: Meldung nennt ArtNr') });
await fehlerFall('Server liefert HTTP 500 beim Download', { download500: true }, {}, { logins: 3 });
await fehlerFall('ein Versuch', { koerper: ZU_KLEIN }, { FORTURA_VERSUCHE: '1' }, { logins: 1 });
await fehlerFall('Server nicht erreichbar', { koerper: GROSS }, { FORTURA_BASIS: 'http://127.0.0.1:1', FORTURA_VERSUCHE: '2' }, { pruefe: (r) => ok(/Netzfehler/.test(r.err), 'nicht erreichbar: Netzfehler gemeldet') });

// Wiederholung hilft bei 503 am Login
{
  const opt = { koerper: GROSS, mtime: Math.floor(Date.now() / 1000), login503: 2 };
  const sv = await startServer({}, () => opt);
  const out = path.join(neuerTmp(), 'f.csv');
  const r = await skript(basisEnv(sv.port), [out]);
  ok(r.code === 0 && fs.existsSync(out), 'zwei Mal 503 am Login, dritter Versuch klappt: Exit 0');
  gleich(sv.log.filter(l => l.apiMethode === 'login').length, 3, '503: drei Login-Versuche');
  sv.s.close();
}

/* ---------- Eingaben ---------- */
{
  const d = neuerTmp(); const out = path.join(d, 'x.csv');
  for (const [name, env] of [['ohne Benutzer', { FORTURA_FTP_USER: '' }], ['ohne Passwort', { FORTURA_FTP_PW: '' }], ['beides fehlt', { FORTURA_FTP_USER: '', FORTURA_FTP_PW: '' }]]) {
    const sv = await startServer({}, () => ({ koerper: GROSS }));
    const r = await skript(basisEnv(sv.port, env), [out]);
    gleich(r.code, 2, `Zugang fehlt (${name}): Exit 2`);
    ok(/FORTURA_FTP_USER/.test(r.err) && /FORTURA_FTP_PW/.test(r.err) && /Secrets/.test(r.err), `Zugang fehlt (${name}): Meldung nennt beide Secret-Namen und wo man sie setzt`);
    gleich(sv.log.length, 0, `Zugang fehlt (${name}): es wird kein einziger Aufruf gemacht`);
    ok(!fs.existsSync(out), `Zugang fehlt (${name}): nichts angelegt`);
    sv.s.close();
  }
  for (const [name, env] of [['MIN_BYTES keine Zahl', { FORTURA_MIN_BYTES: 'viel' }], ['VERSUCHE 0', { FORTURA_VERSUCHE: '0' }], ['PAUSE keine Zahl', { FORTURA_PAUSE: '-3' }],
    ['MAX_ALTER_H keine Zahl', { FORTURA_MAX_ALTER_H: 'viel' }], ['MAX_ALTER_H 0', { FORTURA_MAX_ALTER_H: '0' }], ['MAX_ALTER_H negativ', { FORTURA_MAX_ALTER_H: '-3' }], ['MAX_ALTER_H Dezimalzahl', { FORTURA_MAX_ALTER_H: '3.5' }]]) {
    const sv = await startServer({}, () => ({ koerper: GROSS }));
    const r = await skript(basisEnv(sv.port, env), [out]);
    ok(r.code === 2 && sv.log.length === 0, `${name}: Exit 2 ohne Aufruf`);
    sv.s.close();
  }
  const r = await skript({ FORTURA_FTP_USER: USER, FORTURA_FTP_PW: PW, NODE: '/nicht/da/node', FORTURA_TEST: '1', FORTURA_BASIS: 'http://127.0.0.1:1' }, [out]);
  ok(r.code === 2 && /node nicht gefunden/.test(r.err), 'ohne node: Exit 2 mit Meldung');
}

/* ---------- Zertifikatsprüfung ---------- */
{
  const d = neuerTmp();
  const ssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(d, 'k.pem'), '-out', path.join(d, 'c.pem'), '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8' });
  if (ssl.status !== 0) {
    console.log('  ! TLS-Prüfung ÜBERSPRUNGEN (openssl nicht verfügbar)');
    ok(false, 'TLS-Prüfung konnte nicht laufen');
  } else {
    const opt = { koerper: GROSS, mtime: Math.floor(Date.now() / 1000) };
    const tls = { key: fs.readFileSync(path.join(d, 'k.pem')), cert: fs.readFileSync(path.join(d, 'c.pem')) };
    const sv = await startServer({ tls }, () => opt);
    const out = path.join(d, 'tls.csv');
    const basis = { FORTURA_FTP_USER: USER, FORTURA_FTP_PW: PW, FORTURA_TEST: '1', FORTURA_BASIS: `https://127.0.0.1:${sv.port}`, FORTURA_PAUSE: '0', FORTURA_VERSUCHE: '3' };
    const r = await skript(basis, [out]);
    gleich(r.code, 2, 'unbekanntes Zertifikat: Exit 2 (Prüfung ist scharf)');
    ok(!fs.existsSync(out), 'unbekanntes Zertifikat: nichts geschrieben');
    gleich(sv.log.length, 0, 'unbekanntes Zertifikat: die Zugangsdaten gehen nie an den Server');
    ok(/Zertifikat/.test(r.err) && /FORTURA_TLS_UNSICHER=1/.test(r.err), 'unbekanntes Zertifikat: Hinweis auf Prüfung und Schalter');
    ok(ohneGeheimnis(r), 'unbekanntes Zertifikat: keine Zugangsdaten in der Ausgabe');
    const r2 = await skript({ ...basis, FORTURA_TLS_UNSICHER: '1' }, [out]);
    ok(r2.code === 0 && fs.existsSync(out) && /Zertifikatsprüfung ist abgeschaltet/.test(r2.err), 'FORTURA_TLS_UNSICHER=1: geht durch und sagt laut, dass die Prüfung aus ist');
    sv.s.close();
  }
}

for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
console.log(`\n${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
