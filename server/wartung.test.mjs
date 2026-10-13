// wartung.test.mjs — Gegenproben für die feste Aktionsliste und das Schwärzen (23.09.2026).
// Aufruf: node server/wartung.test.mjs   (Exit 0 = alle grün)
// Die Zeilen unter «Pruefer 23.09.» sind die Faelle, die die ERSTE Fassung durchliess oder falsch schwaerzte.
import assert from 'node:assert/strict';
import { schwaerzen, crontabZeile, psZeile, journalZeile, ist_erlaubt, fuehre_wartung_aus, AKTIONEN } from './wartung.mjs';

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
  for (const a of ['platte', 'dienste_server', 'crontab_luxe', 'platte_schlank', 'platte_bericht', 'speicher', 'alt_cron_aus', 'alt_cron_zurueck', 'waechter_zustand']) assert.ok(ist_erlaubt(a), a);
  for (const a of ['rm -rf /', 'platte; reboot', '__proto__', 'constructor', 'toString', '', null, undefined, ['platte']]) assert.ok(!ist_erlaubt(a), String(a));
  assert.throws(() => fuehre_wartung_aus('reboot'), /nicht erlaubt/);
});
// Shell nur fuer Aktionen, die genau EIN Skript aus server/ starten (Pfad unten geprueft)
const SKRIPT_AKTIONEN = new Set(['platte_schlank', 'alt_cron_aus', 'alt_cron_zurueck']);
t('jeder Schritt ist eine feste argv-Liste (keine Shell)', () => {
  for (const [name, a] of Object.entries(AKTIONEN)) for (const [befehl, argv, opt] of a.schritte) {
    assert.equal(typeof befehl, 'string', name); assert.ok(Array.isArray(argv), name);
    assert.ok(!['sh', 'bash', '/bin/sh', '/bin/bash'].includes(befehl) || SKRIPT_AKTIONEN.has(name), `${name}: Shell als Befehl`);
    for (const x of argv) assert.equal(typeof x, 'string', `${name}: Argument kein String`);
    if (opt !== undefined) assert.equal(typeof opt, 'object', `${name}: Schritt-Optionen`);
  }
  // platte_schlank startet genau EIN Skript aus diesem Verzeichnis — über systemd-run, nicht direkt
  const s = AKTIONEN.platte_schlank.schritte.find(([b]) => b === 'systemd-run');
  assert.ok(s && s[1].at(-1).endsWith('/server/platte-schlank.sh'), 'platte_schlank: Skriptpfad');
  assert.ok(s[1].includes('--setenv=AUS_AGENT=1'), 'platte_schlank: AUS_AGENT fehlt');
  assert.ok(!AKTIONEN.platte_schlank.weiter, 'platte_schlank: weiter darf nicht gesetzt sein (Pruefer 23.09.)');
  assert.ok(!AKTIONEN.platte_schlank.schritte.some(([, a]) => a.includes('reset-failed')), 'reset-failed gestrichen');
  // alt_cron_aus/-zurueck: genau EIN Skript aus server/, feste Argumente, Crontab nur in Allowlist-Form
  for (const [name, arg] of [['alt_cron_aus', []], ['alt_cron_zurueck', ['--zurueck']]]) {
    const [b, a] = AKTIONEN[name].schritte[0];
    assert.equal(b, '/bin/bash', name);
    assert.ok(a[0].endsWith('/server/alt-cron-aus.sh') && a.length === 1 + arg.length && a.slice(1).join() === arg.join(), `${name}: Skriptpfad/Argumente`);
    assert.ok(AKTIONEN[name].aendert && !AKTIONEN[name].weiter, `${name}: aendert ja, weiter nein`);
    assert.equal(AKTIONEN[name].schritte[1][2].form, crontabZeile, `${name}: Crontab nur in Allowlist-Form`);
  }
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
// ── 13.10.2026: waechter_zustand (Plan «Hetzner auf Maximum», Schritt 1) ─────────────────────────────────────────
t('psZeile: Alter + Einheit + Skriptname, NIE Argumente', () => {
  assert.equal(psZeile('   725 luxe-waechter.service python3 automation/cj_ausgelistet_sichtbar.py --token abc123'),
               '12m luxe-waechter.service cj_ausgelistet_sichtbar.py');
  assert.equal(psZeile('    30 luxe-agent.service /usr/bin/node /opt/luxe-agent/repo/server/luxe_auftrag_runner.mjs'),
               '30s luxe-agent.service luxe_auftrag_runner.mjs');
  // setsid-Huelle aus fixer_keepalive.sh: Satzzeichen am Wortrand, Lock- und Log-Pfade, Umgebungswert
  assert.equal(psZeile('  4000 luxe-waechter.service bash -c exec 9>/tmp/lock_x.lock; flock -n 9 || exit 0; exec >> "/tmp/x.log" 2>&1; NUR_NEIN=1 exec python3 automation/besuchte_seiten_lieferbar.py;'),
               '66m luxe-waechter.service besuchte_seiten_lieferbar.py');
  assert.equal(psZeile('9200000 luxe-waechter.service bash automation/fixer_keepalive.sh'), '106d luxe-waechter.service fixer_keepalive.sh');
  assert.equal(psZeile('   200 luxe-waechter.service bash -c curl -u luxe:S3cret https://api'), '3m luxe-waechter.service bash');
  assert.equal(psZeile('    12 luxe-m-cj_ausgelistet.service /usr/bin/nice -n 10 python3 automation/cj_ausgelistet_sichtbar.py'),
               '12s luxe-m-cj_ausgelistet.service cj_ausgelistet_sichtbar.py');
  for (const z of ['  5 - [kworker/0:1-events]', '9000000 fail2ban.service /usr/bin/python3 /usr/bin/fail2ban-server -xf start',
                   '  80 ssh.service sshd: root@pts/0', '', 'kaputt'])
    assert.equal(psZeile(z), null, z);
  for (const z of ['  9 luxe-waechter.service node x.mjs --api-key=abc123', '  9 luxe-waechter.service python3 y.py https://u:pw@h/x'])
    assert.ok(!/abc123|pw@/.test(psZeile(z)), z);
});
t('journalZeile: nur systemds eigene Zeilen, gekürzt', () => {
  assert.equal(journalZeile('2026-10-13T19:20:01+00:00 ubuntu-4gb-nbg1-1 systemd[1]: luxe-waechter.service: Consumed 1min 2.345s CPU time over 3min 4.567s wall clock time, 312.4M memory peak.'),
               '2026-10-13T19:20:01 Consumed 1min 2.345s CPU time over 3min 4.567s wall clock time, 312.4M memory peak.');
  assert.equal(journalZeile('2026-10-13T19:17:01+0000 srv systemd[1]: Starting luxe-waechter.service - LuxeStyle Aufseher-Keepalive (Tages-Waechter)...'),
               '2026-10-13T19:17:01 Starting');
  assert.equal(journalZeile('2026-10-13T19:20:01+00:00 srv systemd[1]: luxe-waechter.service: Deactivated successfully.'),
               '2026-10-13T19:20:01 Deactivated successfully.');
  // Ausgabe von engine_keepalive.sh steht im selben Journal — kommt nie durch, auch wenn sie «Consumed» sagt
  assert.equal(journalZeile('2026-10-13T19:18:00+00:00 srv bash[1234]: Consumed GROQ_API_KEY=gsk_abc'), null);
  assert.equal(journalZeile('Oct 13 19:20:01 srv systemd[1]: luxe-waechter.service: Consumed 3s'), null);   // ohne -o short-iso
});
t('Schritt-Optionen letzte/zaehlen/max; zaehlen nie neben einem Fehlschlag', () => {
  AKTIONEN.__zaehl = { was: 'Probe', aendert: false, weiter: true, schritte: [
    ['printf', ['a\nb\nc\n'], { zaehlen: true }],
    ['printf', [''], { zaehlen: true }],
    ['printf', ['1\n2\n3\n'], { letzte: 2 }],
    ['printf', ['abcdefghi\n'.repeat(600)], { max: 5000 }],   // viele Zeilen: eine Einzelzeile kappt schon ZEILE_MAX
    ['printf', ['abcdefghi\n'.repeat(600)]],
    ['false', [], { zaehlen: true }],
  ] };
  try {
    const r = fuehre_wartung_aus('__zaehl').ausgaben.map(x => x.ausgabe);
    assert.deepEqual(r.slice(0, 3), ['3', '0', '2\n3']);
    assert.equal(r[3].length, 5000); assert.equal(r[4].length, 4000);
    assert.equal(r[5], '', 'gescheiterter Zählschritt meldet keine «0»');
  } finally { delete AKTIONEN.__zaehl; }
});
t('waechter_zustand: rein lesend, feste Schritte, nichts aus /etc/luxe', () => {
  const a = AKTIONEN.waechter_zustand;
  assert.ok(!a.aendert && a.weiter, 'aendert nein, weiter ja');
  const befehle = a.schritte.map(([b]) => b);
  for (const b of ['systemctl', 'journalctl', 'ps', 'python3', 'ffmpeg', 'git', 'df', 'free', 'swapon', 'find', 'tail'])
    assert.ok(befehle.includes(b), `Schritt ${b} fehlt`);
  // systemctl/git nur lesende Unterbefehle
  for (const [b, argv] of a.schritte) {
    if (b === 'systemctl') assert.ok(['show', 'list-units'].includes(argv[0]), `systemctl ${argv[0]}`);
    if (b === 'git') assert.deepEqual(argv.slice(0, 4), ['-C', '/opt/luxe-waechter/repo', 'stash', 'list']);
    assert.ok(!argv.some(x => /\/etc\/luxe|secrets/.test(x)), `${b}: liest Geheimnisse`);
  }
  const ps = a.schritte.find(([b]) => b === 'ps');
  assert.equal(ps[2].form, psZeile, 'ps nur über psZeile');
  const j = a.schritte.find(([b]) => b === 'journalctl');
  assert.equal(j[2].form, journalZeile, 'Journal nur über journalZeile');
  assert.ok(!j[1].includes('-g') && !j[1].includes('-n') && j[1].includes('short-iso'), 'journalctl: aufsteigend, short-iso');
  // der Python-Schritt importiert nur und druckt Versionen — kein Datei-, Prozess- oder Netzzugriff
  const py = a.schritte.find(([b]) => b === 'python3')[1];
  assert.equal(py[0], '-c');
  assert.ok(!/open\(|os\.|subprocess|socket|exec\(|eval\(|urllib|sys\.argv/.test(py[1]), 'Python-Probe nur Import');
  const st = a.schritte.find(([b, argv]) => b === 'git' && argv.includes('list') && !argv.includes('-1'));
  assert.ok(st[2].zaehlen, 'Stash-Liste wird nur gezählt (Nachrichten bleiben auf dem Server)');
});
// Interpreter als Befehl nur für die feste Import-Probe in waechter_zustand
t('Interpreter (python3/node) nur in waechter_zustand', () => {
  for (const [name, a] of Object.entries(AKTIONEN)) for (const [b] of a.schritte)
    if (['python3', 'python', 'node', 'perl'].includes(b)) assert.equal(name, 'waechter_zustand', name);
});
t('waechter_zustand läuft durch, auch ohne systemd und ohne Wächter-Klon (Container)', () => {
  const r = fuehre_wartung_aus('waechter_zustand');
  assert.equal(r.ausgaben.length, AKTIONEN.waechter_zustand.schritte.length, 'jeder Schritt gemeldet');
  for (const x of r.ausgaben) assert.ok(!/GROQ|gsk_|shpat_|shpss_/.test(x.ausgabe), `${x.befehl}: Geheimnis in der Ausgabe`);
});
console.log(`\n${n} Gegenproben grün`);
