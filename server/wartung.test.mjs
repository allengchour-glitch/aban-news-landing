// wartung.test.mjs — Gegenproben für die feste Aktionsliste und das Schwärzen (23.09.2026).
// Aufruf: node server/wartung.test.mjs   (Exit 0 = alle grün)
// Die Zeilen unter «Pruefer 23.09.» sind die Faelle, die die ERSTE Fassung durchliess oder falsch schwaerzte.
import assert from 'node:assert/strict';
import { schwaerzen, crontabZeile, ist_erlaubt, fuehre_wartung_aus, AKTIONEN } from './wartung.mjs';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };
const weg = (text, geheim) => assert.ok(!schwaerzen(text).includes(geheim), `nicht geschwärzt: ${text}`);
const bleibt = text => assert.equal(schwaerzen(text), text);

t('Geheimnis-Paare werden geschwärzt', () => {
  assert.equal(schwaerzen('AZURE_SPEECH_KEY=abc123'), 'AZURE_SPEECH_KEY=***');
  assert.equal(schwaerzen('export META_TOKEN="x y z"'), 'export META_TOKEN=***');
  assert.equal(schwaerzen('FORTURA_FTP_PW: geheim'), 'FORTURA_FTP_PW: ***');
  assert.equal(schwaerzen('password = hunter2'), 'password = ***');
  weg("DB_PASS=$'ab cd'", 'ab cd');                      // Pruefer 23.09.: Wert mit Leerzeichen
  weg('GROQ_API_KEY=gsk_short', 'gsk_short');
});
t('JSON/YAML-Schlüssel in Anführungszeichen (Pruefer 23.09.)', () => {
  weg('{"token": "abc"}', '"abc"');
  weg('{"password":"hunter2"}', 'hunter2');
  weg('{"api_token": "x1"}', '"x1"');
  weg('"passwd": "kurz"', 'kurz');
  assert.equal(schwaerzen('{"token": "abc", "n": 3}'), '{"token": "***", "n": 3}');
});
t('Zugangsdaten in URLs — jedes Schema (Pruefer 23.09.)', () => {
  assert.equal(schwaerzen('git clone https://user:ghp_abc@github.com/x/y'), 'git clone https://***@github.com/x/y');
  weg('ftp://luxe:Geh3im@ftp.fortura.ch/feed.csv', 'Geh3im');
  weg('redis://:pw123@localhost:6379/0', 'pw123');
  weg('postgres://u:p/w%2F@db/x', 'p/w');
  weg('mysql://root:a@b@host/db', 'a@b');
});
t('CLI-Formen ohne = (Pruefer 23.09.)', () => {
  weg('curl -u luxe:S3cret https://api', 'S3cret');
  weg('tool --api-key abc123 --x', 'abc123');
  weg('tool --password hunter2', 'hunter2');
  weg('tool --token=t0kABC --x', 't0kABC');
});
t('Token-Präfixe, unabhängig von der Länge (Pruefer 23.09.)', () => {
  weg('x glpat-abcdef123 y', 'glpat-abcdef123');
  weg('xoxb-1234-abcd', 'xoxb-1234');
  weg('shpat_0123456789abcdef', 'shpat_0123');
  weg('https://hooks.slack.com/services/T000/B000/XXXX', 'T000/B000');
  weg('?sv=2023&sig=AbCdEf0123456789AbCdEf', 'AbCdEf0123');
  weg('EAAaBbCcDdEeFf0011', 'EAAaBb');
});
t('lange Schlüssel-Zeichenketten', () => {
  const k = 'Xy9kL2mN8'.repeat(9);   // synthetisch (Gross+Klein+Ziffer, 81 Zeichen) — NIE ein echter Schluessel im Repo
  weg(`key ist ${k} fertig`, '5flv');
  weg('Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123', 'abcdefghij');
  weg('sha 3f2a9c1d4e5b6a7f8091a2b3c4d5e6f708192a3b', '3f2a9c1d4e5b');                 // Commit-SHA: zu viel ist ok
  weg('b64 Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv1Wx2Yz3Ab4Cd/5Ef6==', 'Ab1Cd2Ef3Gh4');  // Base64 MIT «/»
});
t('Pfade und normale Zeilen bleiben lesbar (Pruefer 23.09.: die Längenregel schwärzte Pfade)', () => {
  bleibt('/dev/sda1        38G   30G  6.2G  83% /');
  bleibt('*/5 * * * * /opt/luxe/repo/run.sh >> /var/log/x.log');
  bleibt('size-pack: 4.99 GiB');
  bleibt('/opt/luxe/repo/automation/social_autopilot_und_noch_laenger.sh');
  bleibt('1234567 /opt/abannews/.git/objects/pack/tmp_pack_30Vnz5');
  bleibt('/opt/luxe-waechter/repo/automation/engine_keepalive_und_fixer_keepalive.log');
  bleibt('Sep 23 21:17:03 srv systemd[1]: luxe-waechter.service: Deactivated successfully.');
});
t('Journalzeile von 48 KB wird in unter 200 ms geschwärzt (Pruefer 23.09.: quadratisch)', () => {
  const z = 'Redirect '.repeat(5000) + 'x'.repeat(3000);
  const t0 = Date.now(); const r = schwaerzen(z); const ms = Date.now() - t0;
  assert.ok(ms < 200, `${ms} ms`); assert.ok(r.length <= 4200, 'Zeile gekappt');
});
t('crontab_luxe: nur Zeitfelder und Pfade (Allowlist)', () => {
  assert.equal(crontabZeile('*/5 * * * * /opt/luxe/repo/run.sh --token abc >> /var/log/x.log 2>&1'),
               '*/5 * * * * /opt/luxe/repo/run.sh … /var/log/x.log …');
  assert.equal(crontabZeile('@hourly cd /opt/jarvis && node x.mjs -u a:b'), '@hourly … /opt/jarvis …');
  assert.equal(crontabZeile('0 3 * * * curl -s ftp://u:p@h/x /opt/luxe/y'), '0 3 * * * … /opt/luxe/y');
  assert.equal(crontabZeile('MAILTO=admin@x.ch'), null);
  assert.equal(crontabZeile('# /opt/luxe kommentar'), null);
  assert.equal(crontabZeile('*/5 * * * * /opt/x/ftp://u:p@h'), '*/5 * * * * …');   // Pfad mit Zugangsdaten → weg
});
t('nur Namen aus der Liste, nichts anderes', () => {
  for (const a of ['platte', 'dienste_server', 'crontab_luxe', 'platte_schlank', 'platte_bericht', 'speicher']) assert.ok(ist_erlaubt(a), a);
  for (const a of ['rm -rf /', 'platte; reboot', '__proto__', 'constructor', 'toString', '', null, undefined, ['platte']]) assert.ok(!ist_erlaubt(a), String(a));
  assert.throws(() => fuehre_wartung_aus('reboot'), /nicht erlaubt/);
});
t('jeder Schritt ist eine feste argv-Liste (keine Shell)', () => {
  for (const [name, a] of Object.entries(AKTIONEN)) for (const [befehl, argv, opt] of a.schritte) {
    assert.equal(typeof befehl, 'string', name); assert.ok(Array.isArray(argv), name);
    assert.ok(!['sh', 'bash', '/bin/sh'].includes(befehl) || name === 'platte_schlank', `${name}: Shell als Befehl`);
    for (const x of argv) assert.equal(typeof x, 'string', `${name}: Argument kein String`);
    if (opt !== undefined) assert.equal(typeof opt, 'object', `${name}: Schritt-Optionen`);
  }
  // platte_schlank startet genau EIN Skript aus diesem Verzeichnis — über systemd-run, nicht direkt
  const s = AKTIONEN.platte_schlank.schritte.find(([b]) => b === 'systemd-run');
  assert.ok(s && s[1].at(-1).endsWith('/server/platte-schlank.sh'), 'platte_schlank: Skriptpfad');
  assert.ok(s[1].includes('--setenv=AUS_AGENT=1'), 'platte_schlank: AUS_AGENT fehlt');
  assert.ok(!AKTIONEN.platte_schlank.weiter, 'platte_schlank: weiter darf nicht gesetzt sein (Pruefer 23.09.)');
  assert.ok(!AKTIONEN.platte_schlank.schritte.some(([, a]) => a.includes('reset-failed')), 'reset-failed gestrichen');
  const j = AKTIONEN.dienste_server.schritte.find(([b]) => b === 'journalctl');
  assert.ok(!j[1].includes('-g') && !j[1].includes('-n') && j[2].filter, 'journalctl: Filter hier, nicht -g/-n');
});
t('lesende Aktion läuft durch, auch wenn Klone fehlen (weiter)', () => {
  const r = fuehre_wartung_aus('platte');
  assert.equal(r.aktion, 'platte');
  assert.ok(r.ausgaben.length >= 3, 'alle Schritte gemeldet');
});
t('verändernde Aktion mit gescheitertem Pflichtschritt wirft MIT Teilergebnis (Pruefer 23.09.)', () => {
  AKTIONEN.__probe = { was: 'Probe', aendert: true, schritte: [['false', []], ['true', []]] };
  try {
    assert.throws(() => fuehre_wartung_aus('__probe'), e => e.teilergebnis && e.teilergebnis.ausgaben.length === 1);
    AKTIONEN.__probe.schritte = [['false', [], { weiter: true }], ['true', []]];
    const r = fuehre_wartung_aus('__probe'); assert.equal(r.ausgaben.length, 2);   // Auskunftsschritt darf scheitern
  } finally { delete AKTIONEN.__probe; }
});
console.log(`\n${n} Gegenproben grün`);
