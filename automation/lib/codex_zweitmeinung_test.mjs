#!/usr/bin/env node
/**
 * Test des Zweitmeinung-Läufers (automation/codex_zweitmeinung.mjs + lib/codex_zweitmeinung.mjs).
 *
 * Startet NIE das echte Codex: der Lauf geht gegen einen falschen `codex` (ein Node-Skript im Temp-Ordner), der Argumente,
 * Umgebung, Arbeitsordner und stdin in eine Datei schreibt und je nach Fall eine vollständige Antwort, die Limit-Meldung,
 * einen Absturz, eine abgeschnittene Antwort oder gar nichts liefert. Kein Netz, kein Modell, kein Schlüssel.
 *
 * Das Messgerät zuerst: jede Suchregel und jede Ablehnung ist in BEIDE Richtungen geprüft (Treffer UND Nicht-Treffer).
 * Schlüssel, Telefonnummern und Adressen entstehen hier zur Laufzeit aus Teilen, damit diese Datei selbst nichts Treffendes enthält.
 * Zusammenfassung ganz am Ende (fertig()).
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs';
import fsAlle from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fertig, ist } from '../../codex-mods/luxe-codex/test/kern.mjs';
import * as L from './codex_zweitmeinung.mjs';
import * as K from '../codex_zweitmeinung.mjs';

const { fuehreAus, main } = K;
const HIER = dirname(fileURLToPath(import.meta.url));
const ECHTES_REPO = realpathSync(join(HIER, '..', '..'));
const CLI = join(ECHTES_REPO, 'automation', 'codex_zweitmeinung.mjs');
const RUBRIK = join(ECHTES_REPO, 'codex-mods', 'luxe-codex', 'skills', 'zweitmeinung', 'RUBRIK.md');
const SKILL = join(ECHTES_REPO, 'codex-mods', 'luxe-codex', 'skills', 'zweitmeinung', 'SKILL.md');
const schlafe = ms => new Promise(r => setTimeout(r, ms));
/** Eine Prüfung, die eine Ausnahme wirft, zählt als Fehler und bricht den Testlauf nicht ab. */
const sicher = f => { try { return f(); } catch (e) { return `Ausnahme: ${e.message}`; } };
const sicherAsync = async f => { try { return await f(); } catch (e) { return `Ausnahme: ${e.message}`; } };
/** Wartet höchstens `ms`; hängt der Lauf, kommt { keinEnde: true } statt eines endlosen Tests. */
const mitFrist = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ keinEnde: true }), ms))]);
/** Lebt der Prozess noch? Ein Zombie (Zustand Z) zählt als beendet. */
const lebtNoch = pid => {
  try { process.kill(pid, 0); } catch { return false; }
  try {
    const s = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const k = s.lastIndexOf(')');
    return s.slice(k + 2, k + 3) !== 'Z';
  } catch { return true; }
};
const toete = pid => { try { process.kill(pid, 'SIGKILL'); } catch { /* schon weg */ } };
const rnd = (n, z = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0') => z.repeat(Math.ceil(n / z.length)).slice(0, n);

// ------------------------------------------------------------------------------------------------
// Erfundene Prüfwerte, zur Laufzeit gebaut
const HEX32 = '0123456789abcdef'.repeat(2);
const W = {
  shopify: `${'shp'}${'at_'}${HEX32}`,
  shopifySs: `${'shp'}${'ss_'}${HEX32}`,
  stripe: `${'sk'}${'_live_'}A1b2C3d4E5f6G7h8I9j0`,
  groq: `${'gs'}${'k_'}${'A1b2C3d4E5'.repeat(4)}`,
  google: `${'AI'}${'za'}${'A1b2C3d4E5'.repeat(3)}A1b2C`,
  ghp: `${'gh'}${'p_'}${'A1b2C3d4E5'.repeat(4)}`,
  ghpat: `${'github'}${'_pat_'}${'A1b2C3d4E5'.repeat(5)}`,
  slack: `${'xo'}${'xb-'}1234567890-abcdefghij`,
  pem: `${'-----BEGIN '}${'RSA PRIVATE KEY'}${'-----'}`,
  openai: `${'sk'}${'-'}${'proj-'}${'A1b2C3d4E5f6'.repeat(3)}`,
  jwt: `${'eyJ'}${'hbGciOiJIUzI1NiJ9'}.${'eyJ'}${'zdWIiOiIxMjM0NTY3ODkw'}.${'abcDEF123_-xyzQ'}`,
  basic: `${'https://'}${'benutzer'}:${'geheim123'}${'@'}${'host.beispiel.ch/pfad'}`,
  email: `${'max.muster'}${'@'}${'beispiel.ch'}`,
  iban: `${'CH'}${'93 0076 2011 6238 5295 7'}`,
  tel1: '+41 79 123 45 67', // luxe-geheim-ok
  tel2: '0041 79 123 45 67', // luxe-geheim-ok
  tel3: '079 123 45 67', // luxe-geheim-ok
  tel4: '0791234567', // luxe-geheim-ok
  tel5: '+41 (0)79 123 45 67', // luxe-geheim-ok
  tel6: '079/123 45 67', // luxe-geheim-ok
  ahv: `${'756.'}${'1234.5678.97'}`,
};
const arten = text => [...new Set(L.sucheText(text, 'x').map(f => f.art))];
const trifft = (text, anfang) => arten(text).some(a => a.startsWith(anfang));
const sauber = text => arten(text).length === 0;
const sicherLeer = (obj, werte) => !werte.some(w => JSON.stringify(obj).includes(w));

// ------------------------------------------------------------------------------------------------
// 0. Rubrik und Skill sind Teil des Werkzeugs: der Parser versteht ihr Beispiel
{
  // Windows-Checkout (autocrlf): Zeilenenden normalisieren, sonst fände leseBeispiel() nichts und der Test stürzte ab.
  const rubrik = readFileSync(RUBRIK, 'utf8').replace(/\r\n?/g, '\n');
  const zeilen = rubrik.trimEnd().split('\n');
  ist('Rubrik: höchstens 60 Zeilen', zeilen.length <= 60, true);
  ist('Rubrik: nennt alle sieben Felder in der Ausgabeliste', L.FELDER.every(f => rubrik.includes(`- \`${f}\``)), true);
  ist('Rubrik: Schweregrade, ENDE, nur lesen, Geldwirkung, Reproduktion, Stilfunde, unklar',
    ['`wichtig`', '`klein`', '`ENDE`', 'Nur lesen', 'Geldwirkung', 'Reproduktion', 'Keine Stilfunde', '`unklar`'].every(w => rubrik.includes(w)), true);
  ist('Rubrik: die allerletzte Zeile verlangt ENDE', zeilen[zeilen.length - 1].includes('ENDE'), true);
  const beispiel = leseBeispiel(rubrik);
  const ohneListe = L.leseFunde(beispiel);
  ist('Rubrik: das Beispiel ist ein vollständiger Fund im Format des Parsers', [ohneListe.ok, ohneListe.zaehlung?.gelesen, ohneListe.zaehlung?.ausgewertet, ohneListe.zaehlung?.unvollstaendig], [true, 1, 1, 0]);
  const mitListe = L.leseFunde(beispiel, { dateien: [{ rel: 'a.mjs', zeilen: 5 }] });
  ist('Rubrik: das erfundene Beispiel fällt als Fund auf, wenn Codex es abschreibt (Datei nicht in der Liste)', [mitListe.zaehlung?.unvollstaendig, mitListe.funde[0]?.luecken], [1, ['datei steht nicht in der Dateiliste']]);
  ist('Rubrik mit Windows-Zeilenenden (CRLF): das Beispiel wird trotzdem gefunden', leseBeispiel(rubrik.replace(/\n/g, '\r\n')), beispiel);
  ist('Rubrik: keine Funde heisst nur «[]», ohne weiteren Text', rubrik.includes('ohne weiteren Text'), true);
  const skill = readFileSync(SKILL, 'utf8').replace(/\r\n?/g, '\n');
  ist('Skill: Kopf mit name und description, verweist auf RUBRIK.md, verlangt das Nachstellen und ENDE',
    [/^---\nname: zweitmeinung\ndescription: .+\n---\n/.test(skill), skill.includes('RUBRIK.md'), skill.includes('am echten Code nach'), skill.includes('ENDE')], [true, true, true, true]);
  for (const [name, pfad] of [['RUBRIK.md', RUBRIK], ['SKILL.md', SKILL], ['lib', join(ECHTES_REPO, 'automation/lib/codex_zweitmeinung.mjs')], ['CLI', CLI]]) {
    ist(`eigene Datei ist selbst sauber unter der Vorab-Suche: ${name}`, L.sucheText(readFileSync(pfad, 'utf8'), name), []);
  }
}
function leseBeispiel(text) {
  const m = /Beispiel[^\n]*\n\n```json\n([\s\S]*?)\n```/.exec(String(text).replace(/\r\n?/g, '\n'));
  return m ? m[1] : '';
}

// ------------------------------------------------------------------------------------------------
// 1. Suche nach Geheimnissen und Personendaten: Treffer UND Nicht-Treffer
ist('Treffer Shopify shpat_', trifft(`x = "${W.shopify}"`, 'Shopify'), true);
ist('Treffer Shopify shpss_', trifft(W.shopifySs, 'Shopify'), true);
ist('Treffer Stripe', trifft(W.stripe, 'Stripe'), true);
ist('Treffer Groq', trifft(W.groq, 'Groq'), true);
ist('Treffer Google AIza', trifft(W.google, 'Google'), true);
ist('Treffer GitHub ghp_', trifft(W.ghp, 'GitHub-Token (ghp_'), true);
ist('Treffer GitHub github_pat_', trifft(W.ghpat, 'GitHub-Token (github_pat_'), true);
ist('Treffer Slack', trifft(W.slack, 'Slack'), true);
ist('Treffer PEM', trifft(W.pem, 'privater Schlüssel'), true);
ist('Treffer OpenAI sk-proj', trifft(`OPENAI=${W.openai}`, 'OpenAI'), true);
ist('Treffer JWT', trifft(`Bearer ${W.jwt}`, 'JWT'), true);
ist('Treffer Zugang in Adresse', trifft(W.basic, 'Zugang'), true);
ist('Treffer E-Mail', trifft(`Kontakt: ${W.email}`, 'E-Mail'), true);
ist('Treffer IBAN mit Leerzeichen', trifft(`IBAN ${W.iban}`, 'IBAN'), true);
ist('Treffer IBAN ohne Leerzeichen', trifft(`IBAN ${W.iban.replace(/ /g, '')}`, 'IBAN'), true);
ist('Treffer Telefon +41 mit Leerzeichen', trifft(W.tel1, 'Telefon'), true);
ist('Treffer Telefon 0041', trifft(W.tel2, 'Telefon'), true);
ist('Treffer Telefon 079 mit Leerzeichen', trifft(W.tel3, 'Telefon'), true);
ist('Treffer Telefon 0791234567 am Stück', trifft(`Tel:${W.tel4}`, 'Telefon'), true);
ist('Treffer Telefon +41 (0)79', trifft(W.tel5, 'Telefon'), true);
ist('Treffer Telefon 079/123 45 67', trifft(W.tel6, 'Telefon'), true);
ist('Treffer AHV-Nummer', trifft(W.ahv, 'AHV'), true);

ist('kein Treffer: normaler Code und Zahlen', sauber('const preis = 12.5; // CHF 19.90, Menge 3'), true);
ist('kein Treffer: Shopify-Muster mit 31 statt 32 Hexzeichen', sauber(W.shopify.slice(0, -1)), true);
ist('kein Treffer: reiner Kleinbuchstaben-Name nach sk- (CSS-Klasse)', sauber('<div class="sk-circle-fade-animation-wrapper">'), true);
ist('kein Treffer: sk- mitten im Wort (task-, risk-)', sauber('task-AB12CD34EF56GH78IJ90KL und risk-Report2026Final0123456789'), true);
ist('kein Treffer: Adresse @example.com', sauber('Mail an info@example.com'), true);
ist('kein Treffer: Adresse mit Unterdomäne unter example.org', sauber('a@mail.example.org'), true);
ist('kein Treffer: noreply@ (auch gross geschrieben)', sauber('Co-Authored-By: Claude <noreply@anthropic.com> und NoReply@Firma.ch'), true);
ist('kein Treffer: Paketversion name@4.17.21', sauber('"lodash@4.17.21" und react@18.3.1'), true);
ist('kein Treffer: Bilddatei logo@2x.png', sauber('<img src="logo@2x.png"> und icon@3x.webp'), true);
ist('kein Treffer: @media und einzelnes @', sauber('@media (min-width: 600px) { } und a @ b'), true);
ist('kein Treffer: Host ohne Punkt (user@localhost)', sauber('ssh user@localhost'), true);
ist('kein Treffer: Datum 2026-07-12 und Version 4.07.1', sauber('Stand 2026-07-12, Version 4.07.1, 07.11.2026'), true);
ist('kein Treffer: lange Zahl, die zufällig mit 07 endet oder 079 enthält', sauber('Nr 10791234567890 und 1079123456'), true);
ist('kein Treffer: IBAN mit einer Gruppe zu wenig', sauber('CH93 0076 2011 6238 5295'), true);
ist('kein Treffer: IBAN mit zwei Ziffern zu viel am Ende', sauber('CH93 0076 2011 6238 5295 78'), true);
ist('kein Treffer: AHV-Muster mit fehlender Gruppe', sauber('756.1234.5678'), true);
ist('kein Treffer: nur der JWT-Anfang', sauber('eyJhbGciOiJIUzI1NiJ9.eyJ'), true);
ist('kein Treffer: Adresse ohne Zugang (http://localhost:3000/api, https://host.ch/pfad@x)', sauber('http://localhost:3000/api und https://host.ch/pfad@x'), true);
ist('kein Treffer: öffentlicher Schlüssel (PUBLIC KEY)', sauber('-----BEGIN PUBLIC KEY-----'), true);

// --- weitere Schlüsselformate, Personendaten und Ausnahmen (Fund-Runde 2)
Object.assign(W, {
  telegram: `${'123456789'}:${'AA'}H${rnd(32)}`,
  aws: `${'AK'}${'IA'}${'ABCDEFGHIJKLMNOP'}`,
  awsGeheim: `${'aws_secret'}${'_access_key'} = ${rnd(40)}`,
  gocspx: `${'GOC'}${'SPX-'}${rnd(28)}`,
  fb: `${'EA'}${'AG'}${rnd(60)}`,
  ya29: `${'ya'}${'29.'}${rnd(60)}`,
  refresh: `${'1/'}${'/0g'}${rnd(50)}`,
  cj: `${'CJ'}${'5452995'}${'@api@'}${HEX32}`,
  passwort: `${'DB_PASS'}${'WORD'}=${'hunter2'}${'hunter2'}`,
  festnetz: '044 123 45 67', // luxe-geheim-ok
  festnetzKlammer: '(031) 123 45 67', // luxe-geheim-ok
  mobilKlammer: '(079) 123 45 67', // luxe-geheim-ok
  plus41Klammer: '(+41) 79 123 45 67', // luxe-geheim-ok
  ibanDe: `${'DE89'} ${'3704 0044 0532 0130 00'}`,
  ibanLi: `${'LI21'} ${'0881 0000 2324 013A A'}`,
  ibanChBuchstabe: `${'CH93'} ${'0076 2011 623A 5295 7'}`,
  ibanAt: `${'AT61'} ${'1904 3002 3457 3201'}`,
  ibanFr: `${'FR14'} ${'2004 1010 0505 0001 3M02 606'}`,
  umlautMail: `${'max'}${'@'}${'bücher.ch'}`,
});
ist('Treffer Telegram-Bot-Token', trifft(`TELEGRAM_BOT_TOKEN=${W.telegram}`, 'Telegram'), true);
ist('Treffer AWS-Zugangsschlüssel (AKIA)', trifft(`aws_access_key_id = ${W.aws}`, 'AWS'), true);
ist('Treffer AWS-Geheimschlüssel (Zuweisung mit 40 Zeichen)', trifft(W.awsGeheim, 'AWS'), true);
ist('Treffer Google-OAuth-Geheimnis (GOCSPX-)', trifft(`client_secret = "${W.gocspx}"`, 'Google'), true);
ist('Treffer Facebook-Token (EAA…)', trifft(`FB_PAGE_TOKEN='${W.fb}'`, 'Facebook'), true);
ist('Treffer Google-Zugriffstoken ya29.', trifft(`Bearer ${W.ya29}`, 'Google'), true);
ist('Treffer Google-Refresh-Token 1//0', trifft(`"refresh_token":"${W.refresh}"`, 'Google'), true);
ist('Treffer CJ-Schlüssel (CJnnnn@api@…)', trifft(`const KEY='${W.cj}'`, 'CJ'), true);
ist('Treffer Passwort-Zuweisung im .env-Stil', trifft(W.passwort, 'Passwort'), true);
ist('Treffer Passwort-Zuweisung mit export und Anführungszeichen', trifft(`export API_TOKEN="${rnd(16)}"`, 'Passwort'), true);
ist('Treffer Festnetz CH (044)', trifft(`Rückruf unter ${W.festnetz}`, 'Telefon'), true);
ist('Treffer Festnetz in Klammern, Mobil in Klammern, (+41) in Klammern', [trifft(`Tel ${W.festnetzKlammer}`, 'Telefon'), trifft(`Tel ${W.mobilKlammer}`, 'Telefon'), trifft(`Tel ${W.plus41Klammer}`, 'Telefon')], [true, true, true]);
ist('Treffer IBAN DE, LI, AT, FR und CH mit Buchstaben in der Kontonummer', [W.ibanDe, W.ibanLi, W.ibanAt, W.ibanFr, W.ibanChBuchstabe].map(i => trifft(`IBAN ${i}`, 'IBAN')), [true, true, true, true, true]);
ist('Treffer E-Mail mit Umlaut-Domain', trifft(`Mail ${W.umlautMail}`, 'E-Mail'), true);
ist('Treffer: Schlüssel mit Namen davor (MY_shpat_…, STRIPE_sk_live_…)', [trifft(`MY_${W.shopify}`, 'Shopify'), trifft(`STRIPE_${W.stripe}`, 'Stripe')], [true, true]);
ist('Treffer: Google-Schlüssel, der auf «-» endet, in Anführungszeichen', trifft(`key="${'AI'}${'za'}${rnd(34)}-"`, 'Google'), true);
ist('Treffer: Google-Schlüssel mit «_» am Ende (Gegenprobe zum «-»)', trifft(`key="${'AI'}${'za'}${rnd(34)}_"`, 'Google'), true);

ist('kein Treffer: Telegram-Muster ohne «AA» oder zu kurz', [sauber(`${'123456789'}:BBH${rnd(32)}`), sauber(`${'123456789'}:AAH${rnd(20)}`)], [true, true]);
ist('kein Treffer: AKIA mit 15 Zeichen, mit Buchstabe davor, mit 17 Zeichen', [sauber(W.aws.slice(0, -1)), sauber(`M${W.aws}`), sauber(`${W.aws}Q`)], [true, true, true]);
ist('kein Treffer: aws_secret_access_key mit zu kurzem Wert', sauber('aws_secret_access_key = abc123'), true);
ist('kein Treffer: GOCSPX- mit zu kurzem Rest, EAA mit zu kurzem Rest, ya29. kurz, 1//0 kurz', [sauber('GOCSPX-abc'), sauber('EAAG1234'), sauber('ya29.abc'), sauber('1//0abc')], [true, true, true, true]);
ist('kein Treffer: CJ-Schlüssel mit 31 statt 32 Hexzeichen', sauber(W.cj.slice(0, -1)), true);
ist('kein Treffer: Passwort-Zuweisung mit Platzhalter, Befehl, Umgebung, leer, zu kurz, JS-Zeile, Doppelpunkt', [
  sauber('DB_PASSWORD=${DB_PASSWORD}'), sauber('PASSWORD=$(cat /run/secret)'), sauber('API_TOKEN=process.env.TOKEN_WERT'), sauber('API_TOKEN='),
  sauber('API_KEY=kurz'), sauber('const TOKEN_URL = config.tokenUrl;'), sauber('SECRET_KEY: abcdefgh12345'),
], [true, true, true, true, true, true, true]);
ist('kein Treffer: Platzhalter in Anleitungen (sk-ant-..., dein-key-hier, your_client_secret, xxxx)', [sauber('export ANTHROPIC_API_KEY="sk-ant-..."'), sauber('API_KEY="dein-key-hier"'), sauber('CLIENT_SECRET=your_client_secret'), sauber('export TELEGRAM_BOT_TOKEN="xxxxxxxxxxx"')], [true, true, true, true]);
ist('kein Treffer: Matrix-Operator «A@B.sum()» (Ein-Zeichen-Name und -Domain); ein echter Name wie ab@cd.ch wird gefunden', [sauber('W = A@B.sum()'), trifft('Mail ab@cd.ch', 'E-Mail')], [true, true]);
ist('kein Treffer: Festnetz-Vorwahl, die es nicht gibt (010, 0800), zu lange Ziffernfolge, Ziffer davor', [sauber('Tel 010 123 45 67'), sauber('Gratis 0800 123 456'), sauber('Nr 0441234567890123'), sauber('Rechnung 10441234567')], [true, true, true, true]);
ist('kein Treffer: IBAN DE mit fehlender oder überzähliger Ziffer, unbekanntes Land', [sauber('DE89 3704 0044 0532 0130'), sauber('DE89 3704 0044 0532 0130 000'), sauber('XX89 3704 0044 0532 0130 00')], [true, true, true]);
ist('kein Treffer: Bot-, Git- und Aktionsadressen (noreply-Domain, git@host, bot@, actions@)', sauber('git config user.email "actions@users.noreply.github.com" und git clone git@github.com:foo/bar.git und bot@abannews.com'), true);
ist('kein Treffer: reservierte Endungen (.example, .test, .invalid, .localhost)', sauber('ssh root@vps.example und a@b.test und c@d.invalid und e@f.localhost'), true);
ist('kein Treffer: Adresse mit Platzhalter in der URL (${TOKEN}, $TOKEN, {{ secrets.X }}) statt Passwort', sauber('https://x-access-token:${GH_PUSH_TOKEN}@github.com/o/r.git und https://u:$TOKEN@h.ch/x und https://u:{{ secrets.X }}@h.ch/x'), true);
ist('kein Treffer: JSON-LD mit "@type" ist keine Adresse mit Zugang', sauber('{"url":"https://abannews.com","logo":{"@type":"ImageObject","url":"https://abannews.com/logo.png"}}'), true);
ist('kein Treffer: Schlüssel-Name ohne Wortgrenze davor (ask_live_…, mit Buchstabe davor)', sauber(`ask_live_${rnd(20)}`), true);

ist('lange Schlüssel (JWT mit 3000 Zeichen, Stripe und GitHub mit 260 Zeichen): erkannt und vollständig verdeckt', (() => {
  const jwtLang = `${'eyJ'}${rnd(3000)}.${'eyJ'}${rnd(3000)}.${rnd(3000)}`;
  return [trifft(`t=${jwtLang}`, 'JWT'), L.verdecke(`x ${jwtLang} y`), L.verdecke(`k=${'sk'}${'_live_'}${rnd(250)}`), L.verdecke(`k=${'gh'}${'p_'}${rnd(256)}`)];
})(), [true, 'x [verdeckt] y', 'k=[verdeckt]', 'k=[verdeckt]']);
{
  const t0 = Date.now();
  L.sucheText('eyJaaaa-'.repeat(50_000), 'jwt1');
  L.sucheText('eyJ'.repeat(130_000), 'jwt2');
  L.sucheText(`${'gh'}${'p_'}`.repeat(100_000) + 'AKIA'.repeat(100_000), 'g');
  L.sucheText('1234567890'.repeat(38_000), 'z');
  L.sucheText('A'.repeat(380_000), 'v');
  ist('ohne Obergrenzen bleibt die Suche linear (JWT, ghp_, AKIA, Ziffernfolge, Grossbuchstaben)', Date.now() - t0 < 4000, true);
}
ist('Marke luxe-geheim-ok in derselben Zeile erlaubt Testdaten', sauber(`const t = "${W.shopify}"; // luxe-geheim-ok`), true);
ist('Marke gilt nur für ihre Zeile: Zeile 2 wird gemeldet, Zeile 1 nicht', L.sucheText(`// luxe-geheim-ok ${W.email}\n${W.email}\n`, 'f.txt').map(f => [f.datei, f.zeile]), [['f.txt', 2]]);
ist('Zeilennummer stimmt auch bei CRLF', L.sucheText(`a\r\nb\r\n${W.email}\r\n`, 'f').map(f => f.zeile), [3]);
ist('der Fund selbst steht nie im Ergebnis der Suche', sicherLeer(L.sucheText(`${W.shopify}\n${W.email}\n${W.iban}\n${W.tel3}\n${W.openai}`, 'f'), [HEX32, 'max.muster', '0076', '123 45 67', 'A1b2C3d4E5f6']), true);
ist('mehrere Arten in einer Zeile: jede einmal', L.sucheText(`${W.email} ${W.tel3} ${W.email}`, 'f').map(f => f.art).sort(), ['E-Mail-Adresse', 'Telefonnummer (CH)']);
ist('verdecke ersetzt Treffer und lässt Rest stehen', L.verdecke(`fehler bei ${W.email} um 12:00`), 'fehler bei [verdeckt] um 12:00');
ist('verdecke: überlappende Treffer (Zugangsadresse enthält eine Adresse) ergeben einen Block ohne Rest', [L.verdecke(`x ${W.basic} y`), L.verdecke(`x ${W.basic} y`).includes('geheim123')], ['x [verdeckt]/pfad y', false]);
ist('verdecke: mehrere Zeilen', L.verdecke(`a\n${W.tel3}\nc`), 'a\n[verdeckt]\nc');
{
  const lang = `${'x'.repeat(380_000)} ${W.email}`;
  const t0 = Date.now();
  const gefunden = L.sucheText(lang, 'lang');
  ist('eine Zeile mit 380 000 Zeichen wird schnell durchsucht (linear)', [gefunden.length, Date.now() - t0 < 3000], [1, true]);
  const t1 = Date.now();
  L.sucheText('sk-'.repeat(60_000) + 'eyJ'.repeat(60_000), 'lang2');
  ist('Wiederholungen von sk- und eyJ lassen die Suche nicht explodieren', Date.now() - t1 < 3000, true);
}
{
  const d = [{ rel: 'a.mjs', inhalt: Buffer.from('ok\n') }, { rel: `kunde-${W.email}.json`, inhalt: Buffer.from('{}') }, { rel: 'b.mjs', inhalt: Buffer.from(`x\n${W.shopify}\n`) }];
  const f = L.sucheAlles({ dateien: d, auftrag: `Bitte prüfen. Rückfragen an ${W.email}`, rubrik: 'Rubrik ohne Funde' });
  ist('sucheAlles: Name, Inhalt und Auftrag werden durchsucht', f.map(x => `${x.datei}:${x.zeile}`), ['Datei Nr. 2 (Name verdeckt):0', 'b.mjs:2', 'Auftrag:1']);
  const m = L.meldungGeheimnisse(f);
  ist('Meldung: Datei:Zeile:Art, kein Fund, der Ausweg steht dabei', [m.includes('b.mjs:2:Shopify'), sicherLeer(m, ['max.muster', HEX32]), m.includes('luxe-geheim-ok')], [true, true, true]);
  ist('Meldung kürzt lange Listen', L.meldungGeheimnisse(Array.from({ length: 60 }, (_, i) => ({ datei: 'f', zeile: i + 1, art: 'E-Mail-Adresse' }))).includes('und 10 weitere'), true);
}

// ------------------------------------------------------------------------------------------------
// 2. Fester Aufbau: ein kleines Repo, ein Ausserhalb, Symlinks
const BASIS = realpathSync(mkdtempSync(join(tmpdir(), 'zm-test-')));
const REPO = join(BASIS, 'repo');
const AUSSEN = join(BASIS, 'aussen');
mkdirSync(REPO);
mkdirSync(AUSSEN);
const w = (rel, inhalt = 'x\n') => {
  const p = join(REPO, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, inhalt);
  return p;
};
w('a.mjs', 'export const preis = x => x * 2;\nexport const rabatt = 0.1;\n');
w('sub/b.mjs', 'export const b = 1;\n');
w('README.md', '# Titel\n');
w('.github/workflows/x.yml', 'name: x\n');
w('.gitignore', 'node_modules\n');
w('env.example', 'A=1\n');
w('.git/config', '[core]\n');
w('.env', 'A=1\n');
w('.env.local', 'A=1\n');
w('.envrc', 'A=1\n');
w('node_modules/pkg/index.js', 'x\n');
w('daten.bin', Buffer.from([1, 2, 0, 3]));
w('auth.json', '{}');
w('schluessel.pem', 'x');
w('.npmrc', 'x');
w('leer.txt', '');
w('ohne-umbruch.txt', 'eine Zeile');
w('..foo.txt');
w('..daten/b.mjs');
w('..ausgabe/x.txt');
w('dropship/README.md', 'dropship-README\n');
w('dropship/nur-hier.md', 'nur hier\n');
for (const n of ['production.env', 'prod.env', '.pgpass', '.htpasswd', 'id_rsa', 'credentials.json', 'client_secret_1.json', 'token.json', '.aws/credentials', 'keystore.jks']) w(n, 'x\n');
for (let i = 1; i <= 41; i += 1) w(`viele/f${String(i).padStart(2, '0')}.txt`);
w('gross/g1.txt', 'x'.repeat(409_600));
w('gross/g2.txt', 'x'.repeat(409_601));
w('gross/h1.txt', 'x'.repeat(200_000));
w('gross/h2.txt', 'x'.repeat(209_601));
w('gross/h3.txt', 'x'.repeat(209_600));
writeFileSync(join(AUSSEN, 'geheim.txt'), 'aussen\n');
mkdirSync(join(AUSSEN, 'ordner'));
writeFileSync(join(AUSSEN, 'ordner', 'x.txt'), 'x\n');
symlinkSync(join(AUSSEN, 'geheim.txt'), join(REPO, 'link-aus.txt'));
symlinkSync(join(AUSSEN, 'ordner'), join(REPO, 'link-ordner'));
symlinkSync('a.mjs', join(REPO, 'link-innen.mjs'));
symlinkSync(join(REPO, '.git'), join(REPO, 'link-git'));
symlinkSync(join(REPO, 'sub'), join(REPO, 'link-sub'));

const pr = namen => L.pruefeDateien(namen, REPO);
const abgelehnt = (namen, teil) => { const r = pr(namen); return [r.ok, r.fehler.some(f => f.includes(teil))]; };
const gut = namen => { const r = pr(namen); return [r.ok, r.dateien.map(d => d.rel)]; };

ist('Datei im Repo: angenommen, mit relativem Pfad', gut(['a.mjs', 'sub/b.mjs']), [true, ['a.mjs', 'sub/b.mjs']]);
const A_BYTES = statSync(join(REPO, 'a.mjs')).size;
ist('Datei: Bytes (wie auf der Platte), Zeilen und Inhalt werden eingelesen', (() => { const d = pr(['a.mjs']).dateien[0]; return [d.bytes, d.zeilen, d.inhalt.toString('utf8').startsWith('export const preis')]; })(), [A_BYTES, 2, true]);
ist('Zeilen: leere Datei 0, ohne Schlussumbruch zählt die letzte', [pr(['leer.txt']).dateien[0].zeilen, pr(['ohne-umbruch.txt']).dateien[0].zeilen], [0, 1]);
ist('./ vorn und absoluter Pfad im Repo sind erlaubt und führen zur selben Datei (ohne Doppelte)', gut(['./a.mjs', join(REPO, 'a.mjs'), 'a.mjs']), [true, ['a.mjs']]);
ist('«..» im Pfad wird abgelehnt, auch wenn das Ziel im Repo läge', abgelehnt(['sub/../a.mjs'], '«..» im Pfad'), [false, true]);
ist('«..» nach aussen wird abgelehnt', abgelehnt(['../aussen/geheim.txt'], '«..» im Pfad'), [false, true]);
ist('«..» mit Rückwärtsstrich wird abgelehnt', abgelehnt(['sub\\..\\a.mjs'], '«..» im Pfad'), [false, true]);
ist('absoluter Pfad ausserhalb des Repos wird abgelehnt', abgelehnt([join(AUSSEN, 'geheim.txt')], 'ausserhalb'), [false, true]);
ist('absoluter Pfad /etc/passwd wird abgelehnt', abgelehnt(['/etc/passwd'], 'ausserhalb'), [false, true]);
ist('Symlink auf eine Datei ausserhalb wird abgelehnt', abgelehnt(['link-aus.txt'], 'Symlink'), [false, true]);
ist('Datei in einem Symlink-Ordner, der hinausführt, wird abgelehnt', abgelehnt(['link-ordner/x.txt'], 'Symlink'), [false, true]);
ist('Symlink auf eine Datei im Repo wird auch abgelehnt (nur reguläre Dateien)', abgelehnt(['link-innen.mjs'], 'Symlink'), [false, true]);
ist('Symlink-Ordner, der auf .git zeigt, wird abgelehnt', abgelehnt(['link-git/config'], 'Ziel liegt in .git/'), [false, true]);
ist('Symlink-Ordner innerhalb des Repos mit harmlosem Ziel wird angenommen', gut(['link-sub/b.mjs']), [true, ['link-sub/b.mjs']]);
ist('.git/ wird abgelehnt', abgelehnt(['.git/config'], 'liegt in .git/'), [false, true]);
ist('.github/ ist KEIN .git und wird angenommen', gut(['.github/workflows/x.yml']), [true, ['.github/workflows/x.yml']]);
ist('.gitignore wird angenommen', gut(['.gitignore']), [true, ['.gitignore']]);
ist('.env, .env.local und .envrc werden abgelehnt', [abgelehnt(['.env'], 'ist eine .env*-Datei'), abgelehnt(['.env.local'], 'ist eine .env*-Datei'), abgelehnt(['.envrc'], 'ist eine .env*-Datei')], [[false, true], [false, true], [false, true]]);
ist('env.example (ohne Punkt) wird angenommen', gut(['env.example']), [true, ['env.example']]);
ist('node_modules/ wird abgelehnt', abgelehnt(['node_modules/pkg/index.js'], 'liegt in node_modules/'), [false, true]);
ist('Zugangs- und Schlüsseldateien werden abgelehnt (auth.json, .npmrc, .pem)', [abgelehnt(['auth.json'], 'Zugangsdaten'), abgelehnt(['.npmrc'], 'Zugangsdaten'), abgelehnt(['schluessel.pem'], 'Schlüsseldatei')], [[false, true], [false, true], [false, true]]);
{
  const gesperrt = ['production.env', 'prod.env', 'local.env', '.pgpass', '.htpasswd', '.pypirc', '.git-credentials', '.dockercfg', '.aws/credentials', '.ssh/id_ed25519', 'id_rsa', 'credentials', 'credentials.json', 'service-account.json', 'client_secret_123.json', 'token.json', 'secrets.yml', 'secrets.json', 'keystore.jks', 'cert.p8', '_netrc', 'terraform.tfstate', '.flaskenv', 'sub/.kube/config', 'Production.ENV'];
  ist('Zugangs- und Schlüsseldateien über .env/.npmrc hinaus sind gesperrt (Namen)', gesperrt.filter(n => sicher(() => L.verbotenerPfad(n)) === null), []);
  const erlaubt = ['src/credentials.mjs', 'lib/secrets.mjs', 'docs/credentials-howto.md', 'id_rsa.pub', 'keys.js', 'tokens.json', 'myenv.txt', 'env.example', 'README.md', 'token-handler.json'];
  ist('Gegenprobe: ähnliche Namen mit Code oder Doku bleiben erlaubt', erlaubt.filter(n => L.verbotenerPfad(n) !== null), []);
  ist('im Lauf: eine Zugangsdatei wie production.env oder .aws/credentials wird abgelehnt', ['production.env', 'prod.env', '.pgpass', '.htpasswd', 'id_rsa', 'credentials.json', 'client_secret_1.json', 'token.json', '.aws/credentials', 'keystore.jks'].filter(n => pr([n]).ok), []);
}
ist('Name mit «..» am Anfang, der kein Elternverweis ist, gehört zum Repo und wird angenommen', gut(['..foo.txt', '..daten/b.mjs']), [true, ['..foo.txt', '..daten/b.mjs']]);
ist('Ausgabeordner <Repo>/..ausgabe liegt im Repo und wird abgelehnt (Exit 2)', (() => { try { L.pruefeOrdnerAusserhalb(join(REPO, '..ausgabe'), REPO, 'Ausgabe'); return 'ok'; } catch (e) { return [e.exit, e.message.includes('im Repo')]; } })(), [2, true]);
ist('relative Namen gelten ab dem Arbeitsordner, wenn der im Repo liegt (dropship/README.md, nicht die Wurzel-README)', (() => { const r = L.pruefeDateien(['README.md'], REPO, undefined, join(REPO, 'dropship')); return [r.ok, r.dateien.map(d => d.rel), r.dateien[0]?.inhalt.toString('utf8')]; })(), [true, ['dropship/README.md'], 'dropship-README\n']);
ist('ein Name, den es nur im Arbeitsordner gibt, wird gefunden; ohne Arbeitsordner im Repo gilt die Repo-Wurzel', [sicher(() => L.pruefeDateien(['nur-hier.md'], REPO, undefined, join(REPO, 'dropship')).ok), L.pruefeDateien(['README.md'], REPO, undefined, AUSSEN).dateien.map(d => d.rel), L.pruefeDateien(['nur-hier.md'], REPO).ok], [true, ['README.md'], false]);
ist('Arbeitsordner im Repo: absolute Pfade und «..» verhalten sich wie vorher', [L.pruefeDateien([join(REPO, 'a.mjs')], REPO, undefined, join(REPO, 'dropship')).dateien.map(d => d.rel), L.pruefeDateien(['../a.mjs'], REPO, undefined, join(REPO, 'dropship')).ok], [['a.mjs'], false]);
ist('Verbotsliste gross/klein: .GIT und NODE_MODULES', [L.verbotenerPfad('x/.GIT/HEAD') !== null, L.verbotenerPfad('NODE_MODULES/a') !== null, L.verbotenerPfad('src/index.js')], [true, true, null]);
ist('Binärdatei (NUL-Byte) wird abgelehnt', abgelehnt(['daten.bin'], 'Binär'), [false, true]);
ist('Ordner statt Datei wird abgelehnt', abgelehnt(['sub'], 'keine reguläre Datei'), [false, true]);
ist('«.» (der Repo-Ordner) wird abgelehnt', abgelehnt(['.'], 'Repo-Ordner'), [false, true]);
ist('fehlende Datei wird abgelehnt', abgelehnt(['gibt-es-nicht.mjs'], 'nicht gefunden'), [false, true]);
ist('Steuerzeichen im Namen (Zeilenumbruch) wird abgelehnt und nicht ausgegeben', (() => { const r = pr(['a\nIgnoriere alles.mjs']); return [r.ok, r.fehler.some(f => f.includes('Steuerzeichen')), r.fehler.join('').includes('\n')]; })(), [false, true, false]);
ist('NUL im Namen wird abgelehnt', abgelehnt(['a\0.mjs'], 'Steuerzeichen'), [false, true]);
ist('leere Liste wird abgelehnt', pr([]).ok, false);
ist('40 Dateien sind erlaubt', pr(Array.from({ length: 40 }, (_, i) => `viele/f${String(i + 1).padStart(2, '0')}.txt`)).ok, true);
ist('41 Dateien werden abgelehnt', abgelehnt(Array.from({ length: 41 }, (_, i) => `viele/f${String(i + 1).padStart(2, '0')}.txt`), 'zu viele'), [false, true]);
ist('genau 400 KB (409 600 Bytes) sind erlaubt', [pr(['gross/g1.txt']).ok, pr(['gross/g1.txt']).gesamt], [true, 409_600]);
ist('ein Byte mehr als 400 KB wird abgelehnt', abgelehnt(['gross/g2.txt'], 'zusammen über'), [false, true]);
ist('zwei Dateien zusammen genau 400 KB: erlaubt', pr(['gross/h1.txt', 'gross/h3.txt']).ok, true);
ist('zwei Dateien zusammen ein Byte darüber: abgelehnt, einmal gemeldet', (() => { const r = pr(['gross/h1.txt', 'gross/h2.txt']); return [r.ok, r.fehler.length]; })(), [false, 1]);
ist('alle Ablehnungen werden gesammelt, nicht nur die erste', pr(['.env', 'daten.bin', 'a.mjs']).fehler.length, 2);
{
  const rest = pr(['a.mjs', 'sub/b.mjs']).dateien;
  const ziel = mkdtempSync(join(BASIS, 'sk-'));
  const pfade = L.schreibeSandkasten(ziel, rest);
  ist('Sandkasten: Dateien unter ihrem relativen Pfad, Dateien 0600, Ordner 0700', [pfade.map(p => p.slice(ziel.length + 1)), (statSync(pfade[1]).mode & 0o777).toString(8), (statSync(dirname(pfade[1])).mode & 0o777).toString(8)], [['a.mjs', 'sub/b.mjs'], '600', '700']);
  ist('Sandkasten: ein Pfad, der hinausläuft, wird nicht geschrieben', (() => { try { L.schreibeSandkasten(ziel, [{ rel: '../x.txt', inhalt: Buffer.from('x') }]); return 'geschrieben'; } catch { return 'abgelehnt'; } })(), 'abgelehnt');
}
ist('Ausgabeordner im Repo wird abgelehnt', (() => { try { L.pruefeOrdnerAusserhalb(join(REPO, 'sub'), REPO, 'Ausgabe'); return 'ok'; } catch (e) { return [e.exit, e.message.includes('im Repo')]; } })(), [2, true]);
ist('Ausgabeordner ausserhalb wird angenommen, fehlender abgelehnt', [L.pruefeOrdnerAusserhalb(AUSSEN, REPO, 'Ausgabe'), (() => { try { L.pruefeOrdnerAusserhalb(join(AUSSEN, 'nix'), REPO, 'Ausgabe'); return 'ok'; } catch (e) { return e.exit; } })()], [AUSSEN, 2]);

// ------------------------------------------------------------------------------------------------
// 3. Argumente, Einstellungen, Aufruf, Umgebung, Anweisung
ist('Argumente: Dateien, --auftrag, -- trennt', L.liesArgumente(['a', '--auftrag', 'Text', '--', '--b']), { dateien: ['a', '--b'], auftrag: 'Text', hilfe: false, fehler: [] });
ist('Argumente: --auftrag=…, unbekannte Option wird gemeldet', [L.liesArgumente(['--auftrag=X', 'a']).auftrag, L.liesArgumente(['--böse']).fehler.length, L.liesArgumente(['--auftrag']).fehler.length], ['X', 1, 1]);
ist('Dateiliste: Argumente gehen vor DATEIEN, Leere und Doppelte fallen weg', [L.leseDateiliste(['a', 'b'], { DATEIEN: 'x' }), L.leseDateiliste([], { DATEIEN: ' a , b,,a ,c' })], [['a', 'b'], ['a', 'b', 'c']]);
{
  const k = L.liesKonfiguration({});
  ist('Einstellungen: Vorgaben gpt-6-astra, high, 20 Minuten, kein LIVE, keine Programme', [k.modell, k.aufwand, k.minuten, k.zeitlimitMs, k.live, k.bin, k.codexHome], ['gpt-6-astra', 'high', 20, 1_200_000, false, '', '']);
  ist('LIVE gilt nur bei genau 1', ['1', '0', 'true', 'ja', ''].map(v => L.liesKonfiguration({ LIVE: v }).live), [true, false, false, false, false]);
  const fehl = env => { try { L.liesKonfiguration(env); return 'ok'; } catch (e) { return e.exit; } };
  ist('Einstellungen: ungültiges Modell (führender Strich), Aufwand, Zeitlimit und zu langer Auftrag → Exit 2', [fehl({ ZWEITMEINUNG_MODELL: '--dangerously-bypass' }), fehl({ ZWEITMEINUNG_AUFWAND: 'high -s x' }), fehl({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: '0' }), fehl({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: '181' }), fehl({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: 'abc' }), fehl({ ZWEITMEINUNG_AUFTRAG: 'x'.repeat(4001) })], [2, 2, 2, 2, 2, 2]);
  ist('Einstellungen: Zeitlimit 0.5 Minuten = 30 000 ms', L.liesKonfiguration({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: '0.5' }).zeitlimitMs, 30_000);
}
{
  const a = L.baueArgv({ modell: 'gpt-6-astra', aufwand: 'high', sandkasten: '/tmp/s' });
  ist('Aufruf: genau die vorgegebene Argumentliste, Anweisung über stdin («-»)', a, ['exec', '-m', 'gpt-6-astra', '-c', 'model_reasoning_effort=high', '-s', 'read-only', '--skip-git-repo-check', '-C', '/tmp/s', '-']);
  ist('Aufruf: schreibgeschützt ist fest, nie danger-full-access oder bypass', [a.includes('read-only'), a.some(x => /danger|bypass|full-auto|workspace-write/.test(x))], [true, false]);
  const wirft = f => { try { f(); return 'ok'; } catch (e) { return e.exit; } };
  ist('Aufruf: Modell mit Strich vorn, Aufwand mit Leerzeichen, relativer Sandkasten werden abgelehnt', [wirft(() => L.baueArgv({ modell: '-x', aufwand: 'high', sandkasten: '/s' })), wirft(() => L.baueArgv({ modell: 'm', aufwand: 'high x', sandkasten: '/s' })), wirft(() => L.baueArgv({ modell: 'm', aufwand: 'high', sandkasten: 'rel' }))], [2, 2, 2]);
}
ist('Umgebung: genau PATH, HOME, CODEX_HOME', Object.keys(L.baueUmgebung({ pfad: '/usr/bin', home: '/h', codexHome: '/c' })), ['PATH', 'HOME', 'CODEX_HOME']);
ist('PATH: nur absolute Einträge (kein «.», kein leerer), sonst Standard', [L.bereinigterPfad('/a:rel:/b::.'), L.bereinigterPfad(''), L.bereinigterPfad(undefined)], ['/a:/b', '/usr/local/bin:/usr/bin:/bin', '/usr/local/bin:/usr/bin:/bin']);
{
  const rest = pr(['a.mjs']).dateien;
  const t = L.baueAnweisung({ rubrik: '# Rubrik\n', auftrag: 'Prüfe das.', dateien: rest });
  ist('Anweisung: Rubrik, Auftrag, Dateiliste mit Grösse; Dateiinhalt steht NICHT drin; ENDE-Hinweis', [t.startsWith('# Rubrik'), t.includes(`- a.mjs (${A_BYTES} Bytes, 2 Zeilen)`), t.includes('export const preis'), t.trimEnd().endsWith('ENDE.')], [true, true, false, true]);
}
ist('Start: ohne Einstellungen fehlen CODEX_BIN und CODEX_HOME_ZWEITMEINUNG (kein Standardwert)', L.pruefeStart({ bin: '', codexHome: '' }).length, 2);
ist('Start: relativer Pfad mit «/», fehlende Datei, kein Ordner werden gemeldet', [L.pruefeStart({ bin: 'x/codex', codexHome: AUSSEN }).length, L.pruefeStart({ bin: join(AUSSEN, 'nix'), codexHome: AUSSEN }).length, L.pruefeStart({ bin: join(AUSSEN, 'geheim.txt'), codexHome: AUSSEN }).length, L.pruefeStart({ bin: 'codex', codexHome: join(AUSSEN, 'geheim.txt') }).length, L.pruefeStart({ bin: 'codex', codexHome: 'rel' }).length], [1, 1, 1, 1, 1]);

// ------------------------------------------------------------------------------------------------
// 4. Ergebnis einordnen (ohne Prozess)
const R = (rest = {}) => ({ code: 0, signal: null, stdout: '', stderr: '', zeitueberschreitung: false, startfehler: '', ueberlauf: false, abgebrochen: false, ...rest });
const LIMITTEXT = "ERROR: You've hit your usage limit. Upgrade to Pro or try again at 12:06 PM.";
{
  const k = L.klassifiziere(R({ code: 1, stderr: LIMITTEXT }));
  ist('Limit mit ASCII-Apostroph auf stderr → Exit 4 mit der Uhrzeit aus dem Text', [k.art, k.exit, k.uhrzeit], ['limit', 4, '12:06 PM']);
  const t = L.klassifiziere(R({ code: 0, stdout: 'You\u2019ve hit your usage limit. You can try again at 3:30 AM.\n' }));
  ist('Limit mit typografischem Apostroph ’ auf stdout, sogar bei Exit 0 → Exit 4', [t.art, t.exit, t.uhrzeit], ['limit', 4, '3:30 AM']);
  ist('Limit mit Datum: «Nov 3rd, 2026 9:12 AM»', L.findeLimit("You've hit your usage limit. Try again at Nov 3rd, 2026 9:12 AM.").wann, 'Nov 3rd, 2026 9:12 AM');
  ist('Limit «You have hit your usage limit» und «try again in …»', L.findeLimit('You have hit your usage limit, try again in 3 hours 20 minutes.').wann, 'in 3 hours 20 minutes');
  ist('Limit ohne Zeitangabe: Uhrzeit unbekannt, trotzdem Exit 4', [L.klassifiziere(R({ code: 1, stderr: "You've hit your usage limit." })).exit, L.findeLimit("You've hit your usage limit.").wann], [4, 'unbekannt']);
  ist('kein Limit ohne die Meldung', L.findeLimit('Das Limit der Funktion ist erreicht, usage ok'), undefined);
  ist('Limit-Text gewinnt NICHT gegen eine vollständige Antwort, die ihn nur zitiert', L.klassifiziere(R({ stdout: `[]\n${LIMITTEXT}\nENDE\n` })).art, 'ok');
  ist('Limit-Text bei vollständiger Antwort, aber Exit 1: bleibt Limit', L.klassifiziere(R({ code: 1, stdout: `[]\n${LIMITTEXT}\nENDE\n` })).exit, 4);
  ist('Limit hat Vorrang vor „ENDE fehlt“', L.klassifiziere(R({ stdout: `${LIMITTEXT}\n` })).exit, 4);
}
{
  const fall = (rest, exit, wort) => { const k = L.klassifiziere(R(rest)); return [k.exit, k.art, (k.grund ?? '').includes(wort)]; };
  ist('vollständige Antwort: ok, Schlusszeile ENDE entfernt', (() => { const k = L.klassifiziere(R({ stdout: '[]\n\nENDE\n\n' })); return [k.art, k.exit, k.antwort]; })(), ['ok', 0, '[]']);
  ist('ohne ENDE → Exit 5 «ENDE fehlt»', fall({ stdout: '[{"titel":"x"}]\n' }, 5, 'ENDE fehlt'), [5, 'fehler', true]);
  ist('ENDE nur mitten im Text zählt nicht', fall({ stdout: 'ENDE\nund weiter\n' }, 5, 'ENDE fehlt'), [5, 'fehler', true]);
  ist('Leerausgabe → Exit 5', fall({ stdout: '  \n' }, 5, 'Leerausgabe'), [5, 'fehler', true]);
  ist('Absturz mit Code 101 → Exit 5, Code im Grund', fall({ code: 101, stderr: 'thread main panicked\n' }, 5, 'Code 101'), [5, 'fehler', true]);
  ist('Anmeldefehler → Exit 5', fall({ code: 1, stderr: 'ERROR: Not logged in. Run codex login.\n' }, 5, 'Anmeldefehler'), [5, 'fehler', true]);
  ist('Anmeldefehler 401 → Exit 5', fall({ code: 1, stderr: 'unexpected status 401 Unauthorized\n' }, 5, 'Anmeldefehler'), [5, 'fehler', true]);
  ist('Netzfehler → Exit 5', fall({ code: 1, stderr: 'error sending request: ECONNRESET\n' }, 5, 'Netzfehler'), [5, 'fehler', true]);
  ist('ENDE vorhanden, aber Exit 1 → kein Ergebnis', fall({ code: 1, stdout: '[]\nENDE\n' }, 5, 'Code 1'), [5, 'fehler', true]);
  ist('Beendet durch Signal → Exit 5', fall({ code: null, signal: 'SIGKILL' }, 5, 'SIGKILL'), [5, 'fehler', true]);
  ist('Zeitlimit → Exit 5', fall({ zeitueberschreitung: true, code: null }, 5, 'Zeitlimit'), [5, 'fehler', true]);
  ist('Überlauf → Exit 5', fall({ ueberlauf: true }, 5, 'mehr Text'), [5, 'fehler', true]);
  ist('Startfehler (ENOENT) → Exit 5', fall({ startfehler: 'ENOENT', code: null }, 5, 'ENOENT'), [5, 'fehler', true]);
  ist('Abbruch durch Signal → Exit 5', fall({ abgebrochen: true, code: null }, 5, 'Signal'), [5, 'fehler', true]);
  ist('ein Schlüssel in der Fehlerausgabe landet nicht im Grund', L.klassifiziere(R({ code: 1, stderr: `boom ${W.shopify}\n` })).grund.includes(HEX32), false);
  ist('endetMitEnde: nur eine ganze Zeile ENDE zählt', [L.endetMitEnde('x\nENDE'), L.endetMitEnde('x\nENDE \n\n'), L.endetMitEnde('x\nTHE ENDE'), L.endetMitEnde('ENDE\nx'), L.endetMitEnde('')], [true, true, false, false, false]);
}

// ------------------------------------------------------------------------------------------------
// 5. Funde lesen
const FUND = (rest = {}) => ({ titel: 'Rabatt doppelt', schwere: 'wichtig', datei: 'a.mjs', zeile: 1, fehlerfall: 'preis(100) → 80 (richtig 90)', beleg: 'node -e gibt 80', unklar: false, ...rest });
const DATEIEN = [{ rel: 'a.mjs', zeilen: 2 }, { rel: 'sub/b.mjs', zeilen: 1 }];
const lesen = (text, d = DATEIEN) => L.leseFunde(text, { dateien: d });
const zahl = r => (r.zaehlung ? [r.zaehlung.gelesen, r.zaehlung.ausgewertet, r.zaehlung.unvollstaendig, r.zaehlung.stimmt] : ['keine Zählung', r.grund]);
{
  const f2 = [FUND(), FUND({ titel: 'Rand', schwere: 'klein', datei: 'sub/b.mjs', unklar: 'unsicher, ob Wert negativ' })];
  ist('Funde: Codeblock', zahl(lesen('Ergebnis:\n```json\n' + JSON.stringify(f2, null, 2) + '\n```')), [2, 2, 0, true]);
  ist('Funde: nackte Liste mit Text davor und danach', zahl(lesen('Hier: ' + JSON.stringify(f2) + ' Das war es.')), [2, 2, 0, true]);
  ist('Funde: Codeblock ohne Sprachangabe', zahl(lesen('```\n' + JSON.stringify(f2) + '\n```')), [2, 2, 0, true]);
  ist('Funde: Komma vor der schliessenden Klammer wird toleriert', zahl(lesen(`[${JSON.stringify(FUND())},]`)), [1, 1, 0, true]);
  ist('Funde: Klammern und Anführungszeichen in Zeichenketten stören nicht', zahl(lesen(JSON.stringify([FUND({ beleg: 'a[0] ] "x" } [', titel: 'Liste [1] bricht' })]))), [1, 1, 0, true]);
  ist('Funde: Liste in einem Objekt {"funde":[…]}', zahl(lesen(JSON.stringify({ funde: f2 }))), [2, 2, 0, true]);
  ist('Funde: Fussnote [1] im Text davor stört nicht', zahl(lesen(`Siehe [1] und [a].\n${JSON.stringify([FUND()])}`)), [1, 1, 0, true]);
  ist('Funde: erst das Schema als Beispiel, dann die Antwort → die letzte Liste gilt', zahl(lesen(`Schema: ${JSON.stringify([FUND({ titel: 'Beispiel' })])}\nAntwort: ${JSON.stringify(f2)}`)), [2, 2, 0, true]);
  ist('Funde: leere Liste ist ein gültiges Ergebnis («keine Funde» NUR so)', (() => { const r = lesen('```json\n[]\n```'); return [r.ok, ...zahl(r)]; })(), [true, 0, 0, 0, true]);
  ist('Funde: Prosa ohne Liste ist KEIN «keine Funde»', (() => { const r = lesen('Keine Funde, alles gut.'); return [r.ok, r.grund]; })(), [false, 'keine JSON-Liste in der Antwort gefunden']);
  ist('Funde: abgeschnittene Liste ist ein Fehler', (() => { const r = lesen('[{"titel": "Halb'); return [r.ok, r.grund.includes('abgeschnitten')]; })(), [false, true]);
  ist('Funde: kaputtes JSON als letzte Liste ist ein Fehler, auch wenn davor eine gültige steht', lesen(`${JSON.stringify([FUND()])}\n[{"titel": "x" "schwere": }]`).ok, false);
  ist('Funde: viele ungeschlossene Klammern enden als Fehler und hängen nicht', lesen('[{ '.repeat(500)).ok, false);
}
{
  const luecken = f => lesen(JSON.stringify([f])).funde[0].luecken;
  ist('unvollständig: Beleg fehlt', luecken(FUND({ beleg: '' })), ['beleg (Reproduktion) fehlt']);
  ist('unvollständig: Titel fehlt', luecken(FUND({ titel: undefined })), ['titel fehlt']);
  ist('unvollständig: Schwere «hoch» ist weder wichtig noch klein', luecken(FUND({ schwere: 'hoch' }))[0].includes('weder wichtig noch klein'), true);
  ist('Schwere in Grossbuchstaben wird angenommen', lesen(JSON.stringify([FUND({ schwere: 'Wichtig' })])).funde[0].schwere, 'wichtig');
  ist('Zeile als Zahlenkette «2» wird angenommen, 0 und «abc» nicht', [luecken(FUND({ zeile: '2' })), luecken(FUND({ zeile: 0 }))[0].includes('zeile'), luecken(FUND({ zeile: 'abc' }))[0].includes('zeile')], [undefined, true, true]);
  ist('unvollständig: Zeile hinter dem Dateiende', luecken(FUND({ zeile: 3 }))[0].includes('hinter dem Dateiende (2 Zeilen)'), true);
  ist('unvollständig: Datei steht nicht in der Dateiliste', luecken(FUND({ datei: 'erfunden.mjs' })), ['datei steht nicht in der Dateiliste']);
  ist('Datei mit ./ vorn wird zugeordnet', lesen(JSON.stringify([FUND({ datei: './a.mjs' })])).funde[0].status, 'ausgewertet');
  ist('Datei mit Sandkasten-Pfad davor wird eindeutig zugeordnet', lesen(JSON.stringify([FUND({ datei: '/tmp/zweitmeinung-sandkasten-X/sub/b.mjs', zeile: 1 })])).funde[0].datei, 'sub/b.mjs');
  ist('Datei wird nicht über ein Pfadende geraten (x/b.mjs ist nicht sub/b.mjs, ein fremder absoluter Pfad auch nicht)', [luecken(FUND({ datei: 'x/b.mjs' })), luecken(FUND({ datei: '/tmp/anders/sub/b.mjs', zeile: 1 }))], [['datei steht nicht in der Dateiliste'], ['datei steht nicht in der Dateiliste']]);
  ist('unvollständig: unklar fehlt; Text oder true sind gültig', [luecken(FUND({ unklar: undefined })), lesen(JSON.stringify([FUND({ unklar: true })])).funde[0].unklar, lesen(JSON.stringify([FUND({ unklar: ' etwas ' })])).funde[0].unklar], [['unklar fehlt'], true, 'etwas']);
  const r = lesen(JSON.stringify([FUND(), 'Text statt Objekt', null, 7, FUND({ beleg: '' })]));
  ist('Zählung: Nicht-Objekte zählen als unvollständig, gelesen = ausgewertet + unvollständig', zahl(r), [5, 1, 4, true]);
  ist('Zählung: Gegenzählung der «titel»-Felder im Rohtext', [r.zaehlung.rohtitel, r.zaehlung.abweichung], [2, true]);
  ist('Zählung: stimmt der Rohtext überein, keine Abweichung', lesen(JSON.stringify([FUND(), FUND()])).zaehlung.abweichung, false);
  ist('jeder Fund trägt den Hinweis «Behauptung der Modellfamilie»', lesen(JSON.stringify([FUND(), 'x', FUND({ beleg: '' })])).funde.map(f => f.hinweis === L.HINWEIS), [true, true, true]);
  ist('Hinweis nennt das Nachstellen am echten Code', L.HINWEIS, 'Behauptung der Modellfamilie: erst am echten Code nachstellen');
  const b = L.baueBericht({ ...lesen(JSON.stringify([FUND({ titel: 'klein1', schwere: 'klein' }), FUND({ titel: 'wichtig1' }), FUND({ titel: 'halbfund', beleg: '' })])), modell: 'gpt-6-astra', aufwand: 'high', dateien: DATEIEN, ausgabeDatei: '/tmp/x.txt' });
  ist('Bericht: Zahlen im Kopf, Reihenfolge wichtig → klein → unvollständig', [b.includes('3 gelesen = 2 ausgewertet + 1 unvollständig'), b.indexOf('wichtig1') < b.indexOf('klein1'), b.indexOf('klein1') < b.indexOf('halbfund'), b.includes('/tmp/x.txt')], [true, true, true, true]);
  ist('Bericht: jeder Fund hat den Hinweis (3 Funde + Kopf)', b.split(L.HINWEIS).length - 1, 4);
}

// 5b. Funde lesen: «[]» im Text, mehrere Listen, Gegenzählung, Steuerzeichen, Geheimnisse in der Antwort
{
  const f2 = [FUND(), FUND({ titel: 'Rand', schwere: 'klein', datei: 'sub/b.mjs' })];
  const prosa = 'Fund (wichtig): In a.mjs Zeile 1 wird der Rabatt doppelt abgezogen, preis(100) liefert 80 statt 90. Die Liste `acc = []` bleibt leer.';
  ist('Prosa mit Inline-Code «[]» ist KEIN «keine Funde» (Fehler, nicht Exit 0)', sicher(() => lesen(prosa).ok), false);
  ist('Markdown-Checkbox «- [ ] …» ist KEIN «keine Funde»', sicher(() => lesen('Funde:\n- [ ] a.mjs:1 Rabatt doppelt abgezogen').ok), false);
  ist('«[ ]» und «[]» allein (auch im Codeblock) bleiben «keine Funde»', [sicher(() => lesen('[ ]').ok), sicher(() => lesen('[]').zaehlung.gelesen), sicher(() => lesen('```json\n[]\n```').ok), sicher(() => lesen('  \n[\n]\n').ok)], [true, 0, true, true]);
  ist('«[]» zwischen anderem Text: Fehler mit Grund «nicht eindeutig»', sicher(() => lesen('Keine Funde: []').grund?.includes('nicht eindeutig')), true);
  const hinten = lesen(`${JSON.stringify(f2)}\nHinweis: ohne Funde wäre die Antwort [].`);
  ist('Liste mit 2 Funden, danach «[]» im Text: die 2 Funde bleiben erhalten, aber als unsicher gekennzeichnet', [hinten.ok, sicher(() => hinten.zaehlung.gelesen), sicher(() => hinten.status), sicher(() => hinten.pruefen.length)], [true, 2, 'pruefen', 1]);
  const offen = lesen(JSON.stringify({ funde: f2, offen: [] }));
  ist('{"funde":[…],"offen":[]}: die Funde bleiben erhalten, unsicher gekennzeichnet', [offen.ok, sicher(() => offen.zaehlung.gelesen), sicher(() => offen.status)], [true, 2, 'pruefen']);
  ist('301 mal «[] » vor der Liste: die Liste wird gelesen (keine Grenze von 300 Regionen), Status ok', (() => { const r = lesen(`${'[] '.repeat(301)}\n${JSON.stringify(f2)}`); return [r.ok, sicher(() => r.zaehlung.gelesen), sicher(() => r.status)]; })(), [true, 2, 'ok']);
  ist('«[]» VOR der Liste (Schemahinweis) stört nicht und ist nicht unsicher', (() => { const r = lesen(`Ohne Funde: []\n${JSON.stringify(f2)}`); return [r.ok, sicher(() => r.zaehlung.gelesen), sicher(() => r.status)]; })(), [true, 2, 'ok']);
  const zwei = lesen(`Wichtig:\n${JSON.stringify([FUND()])}\n\nKlein:\n${JSON.stringify([FUND({ titel: 'a' }), FUND({ titel: 'b' })])}`);
  ist('zwei Listen (Wichtig/Klein): nur die letzte wird gelesen, der Rest ist als MÖGLICHER VERLUST gekennzeichnet', [zwei.ok, sicher(() => zwei.zaehlung.gelesen), sicher(() => zwei.zaehlung.rohtitel), sicher(() => zwei.status), sicher(() => zwei.pruefen.some(g => g.includes('3 «titel»-Felder')))], [true, 2, 3, 'pruefen', true]);
  ist('Schema zuerst, dann die Antwort: gelesen wird die Antwort, Status «pruefen» (nicht unterscheidbar von zwei Gruppen)', (() => { const r = lesen(`Schema: ${JSON.stringify([FUND({ titel: 'Beispiel' })])}\nAntwort: ${JSON.stringify(f2)}`); return [zahl(r), r.status]; })(), [[2, 2, 0, true], 'pruefen']);
  ist('eine frühere kaputte Liste vor einer gültigen: Status «pruefen»', sicher(() => lesen(`[{"titel": "x" "schwere": }]\n${JSON.stringify(f2)}`).status), 'pruefen');
  ist('sauberer Fall: Status ok, keine Hinweise', (() => { const r = lesen(JSON.stringify(f2)); return [r.status, r.pruefen]; })(), ['ok', []]);
  ist('weniger «titel»-Felder als gelesen (Funde ohne Titel) ist kein Verlust: Status ok', sicher(() => lesen(JSON.stringify([FUND(), 'Text', 7])).status), 'ok');
  ist('ziehListe meldet Hinweise getrennt vom Fehler', (() => { const r = L.ziehListe(`${JSON.stringify(f2)} [] `); return [r.ok, r.liste?.length, r.hinweise?.length]; })(), [true, 2, 1]);
}
{
  const b = zaehlung => L.baueBericht({ funde: [], zaehlung, pruefen: [], modell: 'm', aufwand: 'high', dateien: DATEIEN });
  ist('Bericht: Zählabweichung wird als Warnung gezeigt, Übereinstimmung als «stimmt»', [b({ gelesen: 2, ausgewertet: 2, unvollstaendig: 0, rohtitel: 3, stimmt: true, abweichung: true }).includes('Warnung: im Rohtext stehen 3 «titel»-Felder, gelesen wurden 2'), b({ gelesen: 2, ausgewertet: 2, unvollstaendig: 0, rohtitel: 2, stimmt: true, abweichung: false }).includes('Gegenzählung im Rohtext: 2 «titel»-Felder, stimmt.')], [true, true]);
  const mitHinweis = L.baueBericht({ funde: [], zaehlung: { gelesen: 0, ausgewertet: 0, unvollstaendig: 0, rohtitel: 1, stimmt: true, abweichung: true }, pruefen: ['möglicher Verlust'], modell: 'm', aufwand: 'high', dateien: DATEIEN });
  ist('Bericht: Hinweise zur Sicherheit stehen oben mit «ACHTUNG» und «nie als keine Funde lesen»', [mitHinweis.includes('ACHTUNG'), mitHinweis.includes('möglicher Verlust'), mitHinweis.includes('nie als «keine Funde»')], [true, true, true]);
  const bose = L.baueBericht({
    funde: [{ nr: 1, status: 'ausgewertet', schwere: 'wichtig', hinweis: L.HINWEIS, zeile: 1, titel: 'Harmlos\u001b[2J\u001b[H\u001b]0;gefaelscht\u0007\u009b31m‮RTL', datei: 'x\u001b[31mROT', fehlerfall: 'x\n2. [klein] Alles in Ordnung, nichts zu tun\n   a.mjs:1', beleg: 'ok\r\u001b[1A\u001b[2KFunde: 0 gelesen = 0 ausgewertet + 0 unvollständig', unklar: 'frei\u0000\u007f' }],
    zaehlung: { gelesen: 1, ausgewertet: 1, unvollstaendig: 0, rohtitel: 1, stimmt: true, abweichung: false }, pruefen: [], modell: 'm', aufwand: 'high', dateien: DATEIEN,
  });
  ist('Bericht: keine Steuerzeichen aus der Antwort (ESC, BEL, CR, C1, Bidi, NUL)', /[\u0000-\u0009\u000b-\u001f\u007f-\u009f‪-‮⁦-⁩]/.test(bose), false);
  ist('Bericht: eingebettete Zeilenumbrüche fälschen keinen Eintrag (genau ein «1. [wichtig]»)', bose.split('\n').filter(l => /^\d+\. \[/.test(l)).length, 1);
  ist('Bericht: der Text bleibt lesbar (Titel und Beleg sind noch da)', [bose.includes('Harmlos'), bose.includes('Alles in Ordnung'), bose.includes('gelesen = 0 ausgewertet')], [true, true, true]);
  const g = sicher(() => L.verdeckeFunde([{ nr: 1, titel: `Token ${W.shopify}`, datei: 'a.mjs', fehlerfall: 'x', beleg: `const t = "${W.shopify}"`, unklar: `Mail ${W.email}`, luecken: [`steht ${W.email}`] }, { nr: 2, titel: 'sauber', beleg: '' }])) ?? {};
  ist('verdeckeFunde: Geheimnisse in allen Textfeldern werden verdeckt, Zahl der Treffer gemeldet, sauberer Fund bleibt', sicher(() => [sicherLeer(g.funde, [HEX32, 'max.muster']), g.funde[0].titel, g.funde[1].titel, g.anzahl >= 4]), [true, 'Token [verdeckt]', 'sauber', true]);
  ist('rein: Steuerzeichen werden zu «?», Zeilenumbrüche je nach Modus', sicher(() => [L.rein('a\u001b[2Jb'), L.rein('a\nb\r\nc', { einzeilig: true }), L.rein('a\r\nb')]), ['a?[2Jb', 'a b c', 'a\nb']);
}

// ------------------------------------------------------------------------------------------------
// 6. Ganzer Lauf gegen den falschen codex
const FAKE_DIR = join(BASIS, 'fake');
mkdirSync(FAKE_DIR);
const FAKE = join(FAKE_DIR, 'codex');
writeFileSync(FAKE, String.raw`#!${process.execPath}
const fs = require('fs'), path = require('path');
const hier = path.dirname(fs.realpathSync(process.argv[1]));
const fall = JSON.parse(fs.readFileSync(path.join(hier, 'fall.json'), 'utf8'));
const stdin = fs.readFileSync(0, 'utf8');
function baum(d, p) { let aus = []; for (const e of fs.readdirSync(path.join(d, p), { withFileTypes: true })) { const r = p ? p + '/' + e.name : e.name; if (e.isDirectory()) aus = aus.concat(baum(d, r)); else aus.push(r + ':' + (fs.statSync(path.join(d, r)).mode & 0o777).toString(8)); } return aus; }
const home = process.env.HOME;
const a = {
  argv: process.argv.slice(2), env: process.env, cwd: process.cwd(), cwdMode: fs.statSync('.').mode & 0o777,
  home, homeListe: fs.readdirSync(home), baum: baum('.', '').sort(), stdin, pid: process.pid,
  sichtbar: (fall.pruefe || []).map(p => fs.existsSync(p)),
};
fs.writeFileSync(path.join(hier, 'aufruf.json'), JSON.stringify(a));
const ZAUN = String.fromCharCode(96).repeat(3);
const funde = [
  { titel: 'Rabatt doppelt', schwere: 'wichtig', datei: 'a.mjs', zeile: 1, fehlerfall: 'preis(100) -> 80 (richtig 90)', beleg: 'node -e gibt 80', unklar: false },
  { titel: 'Randfall', schwere: 'klein', datei: 'sub/b.mjs', zeile: 1, fehlerfall: 'a -> b', beleg: '', unklar: 'ob Wert negativ sein darf' },
];
if (fall.loesche) fs.rmSync(fall.loesche, { recursive: true, force: true });
if (fall.stderrText) process.stderr.write(fall.stderrText);
switch (fall.fall) {
  case 'ok': process.stdout.write('Hier die Funde:\n\n' + ZAUN + 'json\n' + JSON.stringify(funde, null, 2) + '\n' + ZAUN + '\nENDE\n'); process.stderr.write('tokens used: 123\n'); break;
  case 'leereliste': process.stdout.write('[]\nENDE\n'); break;
  case 'prosa': process.stdout.write('Keine Funde, alles gut.\nENDE\n'); break;
  case 'zitat': process.stdout.write(JSON.stringify([{ ...funde[0], beleg: "Meldung: You've hit your usage limit. Try again at 12:06 PM." }]) + '\nENDE\n'); break;
  case 'limit': process.stderr.write("ERROR: You've hit your usage limit. Upgrade to Pro or try again at 12:06 PM.\n"); process.exit(1); break;
  case 'limittypo': process.stdout.write('You\u2019ve hit your usage limit. You can try again at 12:06 PM.\n'); break;
  case 'absturz': process.stderr.write('thread main panicked at src/x.rs\n'); process.exit(101); break;
  case 'abgeschnitten': process.stdout.write('[{"titel": "Halb'); break;
  case 'ohneende': process.stdout.write(JSON.stringify(funde) + '\n'); break;
  case 'leer': break;
  case 'anmeldung': process.stderr.write('ERROR: Not logged in. Please run codex login.\n'); process.exit(1); break;
  case 'netz': process.stderr.write('error sending request for url: ECONNRESET\n'); process.exit(1); break;
  case 'endemitfehler': process.stdout.write('[]\nENDE\n'); process.exit(1); break;
  case 'viel': process.stdout.write('x'.repeat(200000)); break;
  case 'haengt': setInterval(() => {}, 1000); break;
  case 'roh': process.stdout.write(fall.text); if (fall.exit) process.exit(fall.exit); break;
  case 'riesig': process.stdout.write('Vorueberlegung '.repeat(Math.ceil(fall.bytes / 15)).slice(0, fall.bytes) + '\n' + JSON.stringify(funde) + '\nENDE\n'); break;
  case 'ignoriertterm': process.on('SIGTERM', function () {}); setInterval(function () {}, 1000); break;
  case 'endlos': setInterval(function () { process.stdout.write('x'.repeat(10000)); }, 1); break;
  case 'enkel': {
    const g = require('child_process').spawn('sleep', ['25'], { stdio: 'inherit', detached: !!fall.detached });
    fs.writeFileSync(fall.pidDatei, String(g.pid));
    g.unref();
    if (fall.antwort) process.stdout.write(JSON.stringify(funde) + '\nENDE\n'); else setInterval(function () {}, 1000);
    break;
  }
  default: process.stderr.write('unbekannter Fall'); process.exit(9);
}
`);
chmodSync(FAKE, 0o755);
const CODEXHOME = join(BASIS, 'codex-home');
mkdirSync(CODEXHOME);
writeFileSync(join(CODEXHOME, 'auth.json'), '{}');
const AUS = join(BASIS, 'ausgabe');
mkdirSync(AUS);
// Eigener Temp-Ordner: zwei Testläufe gleichzeitig (oder ein echter Lauf daneben) sehen die Sandkästen des anderen nicht.
const TEMP = join(BASIS, 'temp');
mkdirSync(TEMP);
const FREMD = mkdtempSync(join(tmpdir(), 'zweitmeinung-sandkasten-'));
const setzeFall = (fall, rest = {}) => {
  writeFileSync(join(FAKE_DIR, 'fall.json'), JSON.stringify({ fall, pruefe: ['sub/b.mjs', 'README.md', '.git', '.env', 'gross', 'node_modules'], ...rest }));
  writeFileSync(join(FAKE_DIR, 'aufruf.json'), '');
};
const aufruf = () => { const t = readFileSync(join(FAKE_DIR, 'aufruf.json'), 'utf8'); return t ? JSON.parse(t) : null; };
const GEHEIM_SK = W.openai;
const GEHEIM_SHP = W.shopify;
const UMG = (rest = {}) => ({ PATH: process.env.PATH, LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME, ZWEITMEINUNG_AUSGABE_ORDNER: AUS, OPENAI_API_KEY: GEHEIM_SK, SHOPIFY_CLIENT_SECRET: GEHEIM_SHP, ...rest });
const fahre = async (args, env, opt = {}) => {
  const aus = [];
  const fehl = [];
  const code = await main(args, env, { wurzel: REPO, temp: TEMP, io: { aus: t => aus.push(t), fehler: t => fehl.push(t) }, ...opt });
  return { code, aus: aus.join('\n'), fehl: fehl.join('\n') };
};
const sandkaesten = () => readdirSync(TEMP).filter(n => n.startsWith('zweitmeinung-sandkasten-') || n.startsWith('zweitmeinung-home-'));
const SK0 = sandkaesten();
const dateienIn = ordner => readdirSync(ordner).sort();
const lies = (ordner, ende) => { const n = dateienIn(ordner).filter(x => x.endsWith(ende)); return n.map(x => join(ordner, x)); };

// 6a. vollständige Antwort
{
  setzeFall('ok');
  const vorher = dateienIn(AUS);
  const r = await fahre(['a.mjs', 'sub/b.mjs'], UMG());
  const a = aufruf();
  ist('Lauf ok: Exit 0, Bericht mit Zählung 2 gelesen = 1 ausgewertet + 1 unvollständig', [r.code, r.aus.includes('2 gelesen = 1 ausgewertet + 1 unvollständig')], [0, true]);
  ist('Lauf ok: die Umgebung des falschen codex enthält NUR PATH, HOME, CODEX_HOME', Object.keys(a.env).sort(), ['CODEX_HOME', 'HOME', 'PATH']);
  ist('Lauf ok: CODEX_HOME kommt aus CODEX_HOME_ZWEITMEINUNG, PATH ist der bereinigte Pfad', [a.env.CODEX_HOME, a.env.PATH], [CODEXHOME, L.bereinigterPfad(process.env.PATH)]);
  ist('Lauf ok: HOME ist ein neuer leerer Ordner im Temp', [a.home.startsWith(join(TEMP, 'zweitmeinung-home-')), a.homeListe], [true, []]);
  ist('Lauf ok: Arbeitsverzeichnis ist der Sandkasten, ein neuer Ordner im Temp mit Rechten 0700', [a.cwd.startsWith(join(TEMP, 'zweitmeinung-sandkasten-')), a.cwdMode.toString(8)], [true, '700']);
  ist('Lauf ok: im Sandkasten liegen genau die zwei Dateien (0600), sonst nichts', a.baum, ['a.mjs:600', 'sub/b.mjs:600']);
  ist('Lauf ok: Repo und seine übrigen Dateien sind im Sandkasten nicht zu sehen', a.sichtbar, [true, false, false, false, false, false]);
  ist('Lauf ok: genau die vorgegebene Argumentliste, -C zeigt auf den Sandkasten', a.argv, ['exec', '-m', 'gpt-6-astra', '-c', 'model_reasoning_effort=high', '-s', 'read-only', '--skip-git-repo-check', '-C', a.cwd, '-']);
  ist('Lauf ok: kein Schlüssel im Befehl, in der Umgebung oder in der Anweisung', [sicherLeer(a, [HEX32, 'A1b2C3d4E5f6']), a.argv.some(x => x.includes(CODEXHOME))], [true, false]);
  ist('Lauf ok: die Anweisung auf stdin hat Rubrik, Dateiliste mit Grössen, keine Dateiinhalte', [a.stdin.includes('Rubrik: Zweitmeinung als Gegenleser'), a.stdin.includes(`- a.mjs (${A_BYTES} Bytes, 2 Zeilen)`), a.stdin.includes('export const preis'), a.stdin.trimEnd().endsWith('ENDE.')], [true, true, false, true]);
  ist('Lauf ok: nach dem Lauf sind Sandkasten und Hilfs-HOME gelöscht', [existsSync(a.cwd), existsSync(a.home)], [false, false]);
  const neu = dateienIn(AUS).filter(n => !vorher.includes(n));
  ist('Lauf ok: Ausgabedatei, stderr-Datei und Funde-Datei liegen im Ausgabeordner', neu.map(n => n.replace(/^zweitmeinung-\d{8}T\d{6}-[0-9a-f]{8}/, 'X')), ['X.funde.json', 'X.stderr.txt', 'X.txt']);
  const txt = lies(AUS, '.txt').find(n => !n.endsWith('.stderr.txt'));
  ist('Lauf ok: alle drei Ausgabedateien haben Rechte 0600', neu.map(n => (statSync(join(AUS, n)).mode & 0o777).toString(8)), ['600', '600', '600']);
  ist('Lauf ok: die Antwortdatei enthält die rohe Antwort samt ENDE', readFileSync(txt, 'utf8').endsWith('ENDE\n'), true);
  const j = JSON.parse(readFileSync(lies(AUS, '.funde.json').pop(), 'utf8'));
  ist('Lauf ok: Funde-Datei mit Zählung, Hinweis an jedem Fund', [j.zaehlung.gelesen, j.zaehlung.ausgewertet, j.zaehlung.unvollstaendig, j.funde.every(f => f.hinweis === L.HINWEIS)], [2, 1, 1, true]);
  ist('Lauf ok: der unvollständige Fund nennt seine Lücke (Beleg fehlt)', j.funde.find(f => f.status === 'unvollstaendig').luecken, ['beleg (Reproduktion) fehlt']);
}
// 6b. Programm aus dem PATH statt aus einem Pfad (CODEX_BIN ohne «/»)
{
  setzeFall('ok');
  const r = await fahre(['a.mjs'], UMG({ CODEX_BIN: 'codex', PATH: `${FAKE_DIR}:${process.env.PATH}` }));
  ist('CODEX_BIN als Programmname wird über den PATH des Kindes gefunden', [r.code, aufruf().env.PATH.startsWith(FAKE_DIR)], [0, true]);
}
// 6c. Prozess-Fälle
{
  const txtZahl = () => dateienIn(AUS).filter(n => n.endsWith('.txt') && !n.endsWith('.stderr.txt')).length;
  const vorher = txtZahl();
  const fall = async (name, wort, rest = {}) => {
    setzeFall(name);
    const r = await fahre(['a.mjs'], UMG(rest));
    return [r.code, r.fehl.includes(wort), r.aus];
  };
  const neuerSandkasten = sandkaesten();
  ist('Limit (stderr, ASCII-Apostroph) → Exit 4, Uhrzeit, «KEIN Ergebnis», nichts auf stdout', await fall('limit', '12:06 PM'), [4, true, '']);
  ist('Limit (stdout, typografisches ’, Exit 0 des Programms) → Exit 4', (await fall('limittypo', '12:06 PM'))[0], 4);
  setzeFall('limit');
  const fundeVorher = lies(AUS, '.funde.json').length;
  const lim = await fahre(['a.mjs'], UMG());
  ist('Limit: Meldung enthält Uhrzeit, Zeitzone unbekannt, KEIN Ergebnis, keine Funde-Datei', [lim.fehl.includes('12:06 PM'), lim.fehl.includes('Zeitzone der Meldung unbekannt'), lim.fehl.includes('KEIN Ergebnis'), lies(AUS, '.funde.json').length], [true, true, true, fundeVorher]);
  ist('Absturz (Exit 101) → Exit 5', (await fall('absturz', 'Code 101'))[0], 5);
  ist('abgeschnittene Antwort → Exit 5 «ENDE fehlt»', await fall('abgeschnitten', 'ENDE fehlt'), [5, true, '']);
  ist('vollständige Liste, aber ENDE fehlt → Exit 5', (await fall('ohneende', 'ENDE fehlt'))[0], 5);
  ist('Leerausgabe → Exit 5', await fall('leer', 'Leerausgabe'), [5, true, '']);
  ist('Anmeldefehler → Exit 5', (await fall('anmeldung', 'Anmeldefehler'))[0], 5);
  ist('Netzfehler → Exit 5', (await fall('netz', 'Netzfehler'))[0], 5);
  ist('ENDE vorhanden, aber Exit 1 des Programms → Exit 5', (await fall('endemitfehler', 'Code 1'))[0], 5);
  ist('Antwort vollständig, aber ohne lesbare Liste (Prosa) → Exit 5, nie «keine Funde»', await fall('prosa', 'keine JSON-Liste'), [5, true, '']);
  ist('Antwort mit zitierter Limit-Meldung im Beleg ist ein Ergebnis (Exit 0)', (await fall('zitat', ''))[0], 0);
  setzeFall('leereliste');
  const leer = await fahre(['a.mjs'], UMG());
  ist('leere Liste mit ENDE → Exit 0 und «0 gelesen = 0 ausgewertet + 0 unvollständig»', [leer.code, leer.aus.includes('0 gelesen = 0 ausgewertet + 0 unvollständig')], [0, true]);
  ist('nach allen Fällen: kein Sandkasten und kein Hilfs-HOME übrig', sandkaesten(), neuerSandkasten);
  ist('jeder der 13 Läufe hat seine rohe Antwortdatei hinterlassen (auch Limit und Absturz)', txtZahl() - vorher, 13);
  // Zeitlimit: der Prozess wird beendet, aufgeräumt
  setzeFall('haengt');
  const t0 = Date.now();
  const z = await fahre(['a.mjs'], UMG({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: '0.05' }));
  const a = aufruf();
  await schlafe(150);
  let lebt = true;
  try { process.kill(a.pid, 0); } catch { lebt = false; }
  ist('Zeitlimit: Exit 5 „Zeitlimit“ nach kurzer Zeit, nicht nach 20 Minuten', [z.code, z.fehl.includes('Zeitlimit'), Date.now() - t0 < 15_000], [5, true, true]);
  ist('Zeitlimit: der hängende falsche codex ist beendet, Sandkasten weg', [lebt, existsSync(a.cwd), existsSync(a.home)], [false, false, false]);
}
// 6d. fuehreAus einzeln: Überlauf, Startfehler, Abbruch
{
  const umg = { PATH: process.env.PATH, HOME: FAKE_DIR, CODEX_HOME: CODEXHOME };
  setzeFall('viel');
  const v = await fuehreAus({ bin: FAKE, argv: [], env: umg, cwd: FAKE_DIR, stdin: '', zeitlimitMs: 20_000, maxBytes: 1000 });
  ist('Überlauf: mehr Ausgabe als erlaubt wird abgebrochen und gemeldet', [v.ueberlauf, v.stdout.length <= 1000, L.klassifiziere(v).exit], [true, true, 5]);
  const n = await fuehreAus({ bin: join(FAKE_DIR, 'gibt-es-nicht'), argv: [], env: umg, cwd: FAKE_DIR, stdin: '', zeitlimitMs: 5000 });
  ist('Startfehler: fehlendes Programm → ENOENT im Ergebnis, kein Absturz', [n.startfehler, L.klassifiziere(n).exit], ['ENOENT', 5]);
  setzeFall('haengt');
  const ac = new AbortController();
  const lauf = fuehreAus({ bin: FAKE, argv: [], env: umg, cwd: FAKE_DIR, stdin: '', zeitlimitMs: 60_000, signal: ac.signal });
  await schlafe(400);
  ac.abort();
  const ab = await lauf;
  ist('Abbruch per Signal beendet das Kind und meldet „abgebrochen“', [ab.abgebrochen, L.klassifiziere(ab).exit], [true, 5]);
  const schon = new AbortController();
  schon.abort();
  const sofort = await fuehreAus({ bin: FAKE, argv: [], env: umg, cwd: FAKE_DIR, stdin: '', zeitlimitMs: 60_000, signal: schon.signal });
  ist('bereits abgebrochenes Signal: Kind wird sofort beendet', sofort.abgebrochen, true);
}
// 6e. Trockenlauf
{
  setzeFall('ok');
  const vorher = dateienIn(AUS);
  const r = await fahre(['a.mjs', 'sub/b.mjs'], UMG({ LIVE: undefined }));
  ist('Trockenlauf ist die Vorgabe: Exit 0, zeigt Dateien, Grössen, Aufruf, Umgebung', [r.code, r.aus.includes('TROCKENLAUF'), r.aus.includes(`a.mjs  ${A_BYTES} Bytes  2 Zeilen`), r.aus.includes('exec -m gpt-6-astra'), r.aus.includes('genau PATH, HOME')], [0, true, true, true, true]);
  ist('Trockenlauf: Codex wurde nicht gestartet, nichts geschrieben, kein Sandkasten', [aufruf(), dateienIn(AUS), sandkaesten()], [null, vorher, SK0]);
  ist('Trockenlauf: auch LIVE=0 und LIVE=true bleiben Trockenlauf', [(await fahre(['a.mjs'], UMG({ LIVE: '0' }))).aus.includes('TROCKENLAUF'), (await fahre(['a.mjs'], UMG({ LIVE: 'true' }))).aus.includes('TROCKENLAUF'), aufruf()], [true, true, null]);
  const ohne = await fahre(['a.mjs'], { PATH: process.env.PATH });
  ist('Trockenlauf ohne CODEX_BIN: Exit 0, zeigt „Bereit für LIVE=1: NEIN“ mit Grund', [ohne.code, ohne.aus.includes('Bereit für LIVE=1: NEIN'), ohne.aus.includes('CODEX_BIN fehlt')], [0, true, true]);
  ist('Trockenlauf mit allem gesetzt: „Bereit für LIVE=1: ja“', (await fahre(['a.mjs'], UMG({ LIVE: undefined }))).aus.includes('Bereit für LIVE=1: ja'), true);
  ist('Trockenlauf: DATEIEN aus der Umgebung', (await fahre([], UMG({ LIVE: undefined, DATEIEN: 'a.mjs,sub/b.mjs' }))).aus.includes('Dateien: 2'), true);
  ist('Trockenlauf prüft dieselben Regeln: Geheimnis → Exit 3 auch ohne LIVE', (await fahre(['a.mjs'], UMG({ LIVE: undefined, ZWEITMEINUNG_AUFTRAG: `Mail ${W.email}` }))).code, 3);
}
// 6f. Exit 3: Geheimnis oder Personendaten
{
  w('leck.mjs', `const a = 1;\nconst t = "${W.shopify}";\n`);
  w('leck-ok.mjs', `const t = "${W.shopify}"; // luxe-geheim-ok\n`);
  w(`kunde-${W.email}.json`, '{}');
  w('mail.txt', `Rückfragen: ${W.email}\n`);
  setzeFall('ok');
  const vorher = dateienIn(AUS);
  const r = await fahre(['a.mjs', 'leck.mjs'], UMG());
  ist('Geheimnis in einer Datei → Exit 3 mit Datei:Zeile:Art', [r.code, r.fehl.includes('leck.mjs:2:Shopify-Token')], [3, true]);
  ist('Exit 3: der Fund steht in KEINER Ausgabe', sicherLeer([r.aus, r.fehl], [HEX32, W.shopify]), true);
  ist('Exit 3: nichts gesendet, kein Sandkasten, keine Ausgabedatei', [aufruf(), sandkaesten(), dateienIn(AUS)], [null, SK0, vorher]);
  ist('Marke luxe-geheim-ok erlaubt die Testdaten (Trockenlauf Exit 0)', (await fahre(['leck-ok.mjs'], UMG({ LIVE: undefined }))).code, 0);
  const m = await fahre(['mail.txt'], UMG());
  ist('E-Mail-Adresse in einer Datei → Exit 3, Adresse nicht ausgegeben', [m.code, m.fehl.includes('mail.txt:1:E-Mail-Adresse'), m.fehl.includes('max.muster')], [3, true, false]);
  const n = await fahre([`kunde-${W.email}.json`], UMG());
  ist('E-Mail-Adresse im Dateinamen → Exit 3 ohne den Namen zu nennen', [n.code, n.fehl.includes('Name verdeckt'), n.fehl.includes('max.muster'), n.aus.includes('max.muster')], [3, true, false, false]);
  const au = await fahre(['a.mjs'], UMG({ ZWEITMEINUNG_AUFTRAG: `Prüfe das. Mein Schlüssel ist ${W.openai}` }));
  ist('Geheimnis im Auftrag → Exit 3, Quelle «Auftrag:1»', [au.code, au.fehl.includes('Auftrag:1:OpenAI-Schlüssel'), au.fehl.includes('A1b2C3d4E5f6')], [3, true, false]);
  const au2 = await fahre(['a.mjs', '--auftrag', `Tel ${W.tel3}`], UMG());
  ist('Telefonnummer im Auftrag per --auftrag → Exit 3', au2.code, 3);
}
// 6g. Exit 2: Eingabe und Einstellungen
{
  setzeFall('ok');
  const code = async (args, env, opt) => (await fahre(args, env, opt)).code;
  ist('keine Datei → Exit 2', await code([], UMG()), 2);
  ist('«..» → Exit 2, Grund genannt', (await fahre(['../aussen/geheim.txt'], UMG())).fehl.includes('«..»'), true);
  ist('absolute Datei ausserhalb → Exit 2', await code([join(AUSSEN, 'geheim.txt')], UMG()), 2);
  ist('Symlink-Ausbruch (Datei) → Exit 2', await code(['link-aus.txt'], UMG()), 2);
  ist('Symlink-Ausbruch (Ordner) → Exit 2', await code(['link-ordner/x.txt'], UMG()), 2);
  ist('.env → Exit 2', await code(['.env'], UMG()), 2);
  ist('41 Dateien → Exit 2', await code(Array.from({ length: 41 }, (_, i) => `viele/f${String(i + 1).padStart(2, '0')}.txt`), UMG()), 2);
  ist('zu gross → Exit 2', await code(['gross/g2.txt'], UMG()), 2);
  ist('unbekannte Option → Exit 2', await code(['--böse', 'a.mjs'], UMG()), 2);
  ist('LIVE=1 ohne CODEX_BIN → Exit 2, Codex nicht gestartet', [await code(['a.mjs'], UMG({ CODEX_BIN: undefined })), aufruf()], [2, null]);
  ist('LIVE=1 ohne CODEX_HOME_ZWEITMEINUNG → Exit 2 (kein Standardwert)', [await code(['a.mjs'], UMG({ CODEX_HOME_ZWEITMEINUNG: undefined })), aufruf()], [2, null]);
  ist('LIVE=1 mit nicht vorhandenem CODEX_BIN → Exit 2', await code(['a.mjs'], UMG({ CODEX_BIN: join(AUSSEN, 'nix') })), 2);
  ist('LIVE=1 mit nicht vorhandenem CODEX_HOME_ZWEITMEINUNG → Exit 2', await code(['a.mjs'], UMG({ CODEX_HOME_ZWEITMEINUNG: join(AUSSEN, 'nix') })), 2);
  ist('ungültiges Modell → Exit 2', await code(['a.mjs'], UMG({ ZWEITMEINUNG_MODELL: '-x' })), 2);
  ist('Ausgabeordner im Repo → Exit 2: die Ausgabe darf nie ins Repo', [await code(['a.mjs'], UMG({ ZWEITMEINUNG_AUSGABE_ORDNER: join(REPO, 'sub') })), aufruf()], [2, null]);
  ist('Ausgabeordner, den es nicht gibt → Exit 2', await code(['a.mjs'], UMG({ ZWEITMEINUNG_AUSGABE_ORDNER: join(AUSSEN, 'nix') })), 2);
  ist('Temp-Ordner im Repo (Sandkasten läge im Repo) → Exit 2', [await code(['a.mjs'], UMG(), { temp: join(REPO, 'sub') }), aufruf()], [2, null]);
  ist('RUBRIK.md fehlt → Exit 2', await code(['a.mjs'], UMG(), { rubrikPfad: join(AUSSEN, 'gibt-es-nicht.md') }), 2);
  ist('--help → Exit 0 mit Aufruf', (await fahre(['--help'], UMG())).aus.includes('Aufruf:'), true);
  ist('nach allen Ablehnungen: kein Sandkasten angelegt, Codex nie gestartet', [sandkaesten(), aufruf()], [SK0, null]);
}
// 6h. der echte Einstieg als eigener Prozess (mit dem falschen codex)
{
  const rel = 'automation/codex_zweitmeinung.mjs';
  const prozess = (rest = {}) => spawnSync(process.execPath, [CLI, rel], { cwd: ECHTES_REPO, encoding: 'utf8', env: { PATH: process.env.PATH, TMPDIR: TEMP, ZWEITMEINUNG_AUSGABE_ORDNER: AUS, ...rest } });
  setzeFall('ok');
  const trocken = prozess();
  ist('Prozess: Trockenlauf von der Kommandozeile, Exit 0, Codex nicht gestartet', [trocken.status, trocken.stdout.includes('TROCKENLAUF'), aufruf()], [0, true, null]);
  const echt = prozess({ LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME, OPENAI_API_KEY: GEHEIM_SK });
  const a = aufruf();
  ist('Prozess: LIVE=1 mit dem falschen codex: Exit 0, Umgebung nur PATH/HOME/CODEX_HOME, Datei wie angegeben', [echt.status, Object.keys(a.env).sort(), a.baum], [0, ['CODEX_HOME', 'HOME', 'PATH'], ['automation/codex_zweitmeinung.mjs:600']]);
  ist('Prozess: der Schlüssel der Eltern-Umgebung kam nirgends hin', sicherLeer(a, ['A1b2C3d4E5f6']), true);
  setzeFall('limit');
  const lim = prozess({ LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME });
  ist('Prozess: Limit endet mit dem Exit-Code 4 des Prozesses', [lim.status, lim.stderr.includes('12:06 PM'), lim.stdout], [4, true, '']);
  setzeFall('absturz');
  ist('Prozess: Absturz endet mit Exit-Code 5', prozess({ LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME }).status, 5);
  ist('Prozess: Geheimnis → Exit-Code 3', spawnSync(process.execPath, [CLI, 'codex-mods/luxe-codex/test/kern.mjs', '--auftrag', `Mail ${W.email}`], { cwd: ECHTES_REPO, encoding: 'utf8', env: { PATH: process.env.PATH } }).status, 3);
  ist('Prozess: Datei ausserhalb → Exit-Code 2', spawnSync(process.execPath, [CLI, '/etc/passwd'], { cwd: ECHTES_REPO, encoding: 'utf8', env: { PATH: process.env.PATH } }).status, 2);
  // Ein Signal an den laufenden Läufer: Kind beenden, aufräumen, Exit 5 (auch SIGHUP bei geschlossenem Terminal und SIGQUIT)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
    setzeFall('haengt');
    const kind = spawn(process.execPath, [CLI, rel], { cwd: ECHTES_REPO, env: { PATH: process.env.PATH, TMPDIR: TEMP, LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME, ZWEITMEINUNG_AUSGABE_ORDNER: AUS }, stdio: ['ignore', 'pipe', 'pipe'] });
    let fehlText = '';
    kind.stderr.on('data', c => { fehlText += c; });
    const ende = new Promise(res => kind.on('close', (code, sig) => res([code, sig])));
    for (let i = 0; i < 100 && !aufruf(); i += 1) await schlafe(50);
    const b = aufruf();
    kind.kill(signal);
    const erg = await mitFrist(ende, 20_000);
    const [code, sig] = Array.isArray(erg) ? erg : ['kein Ende', null];
    await schlafe(150);
    const lebt = b ? lebtNoch(b.pid) : 'kein Kind gestartet';
    ist(`${signal} an den Läufer: Exit 5 „Signal“, falscher codex beendet, Sandkasten und HOME gelöscht`, [code, sig, fehlText.includes('Signal'), lebt, b ? existsSync(b.cwd) : null, b ? existsSync(b.home) : null], [5, null, true, false, false, false]);
    if (b) toete(b.pid);
    kind.kill('SIGKILL');
  }
  // zweites Signal kurz nach dem ersten: kein ungeschützter Abbruch (process.once liess das zweite Signal den Läufer töten)
  {
    setzeFall('haengt');
    const kind = spawn(process.execPath, [CLI, rel], { cwd: ECHTES_REPO, env: { PATH: process.env.PATH, TMPDIR: TEMP, LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME, ZWEITMEINUNG_AUSGABE_ORDNER: AUS }, stdio: ['ignore', 'pipe', 'pipe'] });
    const ende = new Promise(res => kind.on('close', (code, sig) => res([code, sig])));
    for (let i = 0; i < 100 && !aufruf(); i += 1) await schlafe(50);
    const b = aufruf();
    kind.kill('SIGINT');
    kind.kill('SIGINT');
    const erg = await mitFrist(ende, 20_000);
    const [code, sig] = Array.isArray(erg) ? erg : ['kein Ende', null];
    await schlafe(150);
    ist('zwei Signale hintereinander: Exit 5, falscher codex beendet, Sandkasten gelöscht', [code, sig, b ? lebtNoch(b.pid) : null, b ? existsSync(b.cwd) : null], [5, null, false, false]);
    if (b) toete(b.pid);
    kind.kill('SIGKILL');
  }
}

// ------------------------------------------------------------------------------------------------
// 6i. Fund-Runde 2: «[]» im Text, Exit 6, Steuerzeichen, Geheimnisse in der Antwort, Schreibfehler, Prozessende
{
  const F1 = { titel: 'Rabatt doppelt', schwere: 'wichtig', datei: 'a.mjs', zeile: 1, fehlerfall: 'preis(100) -> 80 (richtig 90)', beleg: 'node -e gibt 80', unklar: false };
  const F2 = { ...F1, titel: 'Randfall', schwere: 'klein', datei: 'sub/b.mjs' };
  const roh = async (text, rest = {}, env = {}) => {
    setzeFall('roh', { text, ...rest });
    const vorher = dateienIn(AUS);
    const r = await fahre(['a.mjs', 'sub/b.mjs'], UMG(env));
    const neu = dateienIn(AUS).filter(n => !vorher.includes(n));
    const fj = neu.find(n => n.endsWith('.funde.json'));
    const tx = neu.find(n => n.endsWith('.txt') && !n.endsWith('.stderr.txt'));
    return { ...r, neu, funde: fj ? JSON.parse(readFileSync(join(AUS, fj), 'utf8')) : null, txt: tx ? readFileSync(join(AUS, tx), 'utf8') : null };
  };
  const p1 = await roh('Fund (wichtig): In a.mjs Zeile 1 wird der Rabatt doppelt abgezogen. Die Liste `acc = []` bleibt leer.\nENDE\n');
  ist('Lauf: Prosa mit «[]» im Text → Exit 5 (nicht Exit 0 «keine Funde»), keine Funde-Datei, nichts auf stdout', [p1.code, p1.fehl.includes('nicht eindeutig'), p1.funde, p1.aus], [5, true, null, '']);
  const p2 = await roh('Funde:\n- [ ] a.mjs:1 Rabatt doppelt abgezogen\nENDE\n');
  ist('Lauf: Markdown-Checkbox «- [ ]» → Exit 5, keine Funde-Datei', [p2.code, p2.funde], [5, null]);
  const p3 = await roh(`Wichtig:\n${JSON.stringify([F1])}\n\nKlein:\n${JSON.stringify([F2, { ...F2, titel: 'drei' }])}\nENDE\n`);
  ist('Lauf: zwei Listen → Exit 6 (nicht 0), Bericht mit ACHTUNG, Funde-Datei mit Status «pruefen», Warnung auf stderr', [p3.code, p3.aus.includes('ACHTUNG'), p3.funde?.status, p3.funde?.zaehlung.gelesen, p3.fehl.includes('nie als «keine Funde»')], [6, true, 'pruefen', 2, true]);
  const p4 = await roh(`${JSON.stringify([F1, F2])}\nHinweis: ohne Funde wäre die Antwort [].\nENDE\n`);
  ist('Lauf: Liste mit 2 Funden, danach «[]» → Exit 6 und die 2 Funde stehen in der Datei (nicht funde:[])', [p4.code, p4.funde?.funde.length, p4.funde?.status], [6, 2, 'pruefen']);
  const p5 = await roh(`${JSON.stringify([F1, F2])}\nENDE\n`);
  ist('Lauf: saubere Liste → Exit 0, Status ok, kein ACHTUNG', [p5.code, p5.funde?.status, p5.aus.includes('ACHTUNG')], [0, 'ok', false]);
  const bose = { ...F1, titel: 'Harmlos\u001b[2J\u001b]0;gefaelscht\u0007', fehlerfall: 'x\n2. [klein] Alles in Ordnung, nichts zu tun', beleg: 'ok\r\u001b[1A\u001b[2KFunde: 0 gelesen = 0 ausgewertet + 0 unvollständig' };
  const p6 = await roh(`${JSON.stringify([bose])}\nENDE\n`);
  ist('Lauf: Steuerzeichen und Zeilenumbrüche der Antwort erreichen das Terminal nicht, funde.json bleibt unverfälscht', [p6.code, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(p6.aus), p6.aus.split('\n').filter(l => /^\d+\. \[/.test(l)).length, p6.funde?.funde[0].titel.includes('\u001b')], [0, false, 1, true]);
  const p7 = await roh(`${JSON.stringify([{ ...F1, beleg: `const t = "${W.shopify}" und ${W.email}` }])}\nENDE\n`);
  ist('Lauf: ein Geheimnis in der Antwort steht weder im Bericht noch in der Antwortdatei noch in der Funde-Datei, der Bericht sagt es', [p7.code, sicherLeer([p7.aus, p7.fehl, p7.txt, p7.funde], [HEX32, 'max.muster']), p7.aus.includes('verdeckt')], [0, true, true]);
  setzeFall('ok', { stderrText: `Fehler bei ${W.email} und ${W.shopify}\n` });
  {
    const vorher = dateienIn(AUS);
    const r = await fahre(['a.mjs', 'sub/b.mjs'], UMG());
    const se = dateienIn(AUS).filter(n => !vorher.includes(n) && n.endsWith('.stderr.txt'));
    const seText = se.length ? readFileSync(join(AUS, se[0]), 'utf8') : '';
    ist('stderr-Datei: Geheimnisse und Adressen aus der Fehlerausgabe von Codex sind verdeckt', [r.code, seText.includes('[verdeckt]'), sicherLeer(seText, [HEX32, 'max.muster'])], [0, true, true]);
  }

  // Ausgabeordner verschwindet während des Laufs: Limit/Absturz behalten ihren Exit-Code, nichts geht still verloren
  for (const [fall, erwartet, wort] of [['limit', 4, '12:06 PM'], ['absturz', 5, 'Code 101'], ['ok', 0, 'Rabatt doppelt']]) {
    const AUS2 = join(BASIS, `ausgabe-weg-${fall}`);
    mkdirSync(AUS2);
    setzeFall(fall, { loesche: AUS2 });
    const r = await fahre(['a.mjs', 'sub/b.mjs'], UMG({ ZWEITMEINUNG_AUSGABE_ORDNER: AUS2 }));
    ist(`Ausgabeordner verschwindet während des Laufs (${fall}): Exit ${erwartet} statt 1, «nicht gespeichert» gemeldet, ${fall === 'ok' ? 'Bericht und Antwort erscheinen trotzdem' : 'der Grund bleibt sichtbar'}`, [r.code, r.fehl.includes(wort), r.fehl.includes('nicht gespeichert'), fall === 'ok' ? r.aus.includes('Funde: 2 gelesen') : true], [erwartet, true, true, true]);
  }
  setzeFall('ok');
  const x = await fahre(['a.mjs'], UMG(), { wurzel: join(AUSSEN, 'gibt-es-nicht') });
  ist('unerwarteter Fehler (Repo-Ordner fehlt) → Exit 1 mit «unerwarteter Fehler», Codex nicht gestartet', [x.code, x.fehl.includes('unerwarteter Fehler'), aufruf()], [1, true, null]);

  // Schreibbarkeit wird VOR dem Start geprüft (kein Kontingent für eine Antwort, die nirgends hin kann)
  {
    const vor = readdirSync(AUSSEN).sort();
    ist('pruefeSchreibbar: ein schreibbarer Ordner → null, und keine Probedatei bleibt liegen', [sicher(() => L.pruefeSchreibbar(AUSSEN, 'der Ausgabeordner')), readdirSync(AUSSEN).sort()], [null, vor]);
    const kaputtFs = { ...fsAlle, openSync: () => { const e = new Error('Zugriff verweigert'); e.code = 'EACCES'; throw e; } };
    ist('pruefeSchreibbar: ein Fehler wird als Grund mit Fehlercode gemeldet', String(sicher(() => L.pruefeSchreibbar(AUSSEN, 'der Ausgabeordner', kaputtFs))).includes('EACCES'), true);
  }
  if (existsSync('/proc/self/fdinfo')) {
    setzeFall('ok');
    const t = await fahre(['a.mjs'], UMG({ LIVE: undefined, ZWEITMEINUNG_AUSGABE_ORDNER: '/proc/self/fdinfo' }));
    ist('Ausgabeordner, in dem man nicht schreiben kann: der Trockenlauf sagt «Bereit für LIVE=1: NEIN … nicht beschreibbar»', [t.code, t.aus.includes('Bereit für LIVE=1: NEIN'), t.aus.includes('nicht beschreibbar')], [0, true, true]);
    const l = await fahre(['a.mjs'], UMG({ ZWEITMEINUNG_AUSGABE_ORDNER: '/proc/self/fdinfo' }));
    ist('… und LIVE=1 endet mit Exit 2, BEVOR Codex startet', [l.code, aufruf(), sandkaesten()], [2, null, SK0]);
    const tl = await fahre(['a.mjs'], UMG(), { temp: '/proc/self/fdinfo' });
    ist('Temp-Ordner, in dem man nicht schreiben kann: Exit 2 vor dem Start', [tl.code, tl.fehl.includes('nicht beschreibbar'), aufruf()], [2, true, null]);
  }
  ist('pruefeStart: ein Programmname ohne «/» wird in den PATH-Ordnern gesucht', [sicher(() => L.pruefeStart({ bin: 'codex', codexHome: AUSSEN, pfad: FAKE_DIR })), sicher(() => L.pruefeStart({ bin: 'codex', codexHome: AUSSEN, pfad: AUSSEN }).length)], [[], 1]);
  setzeFall('ok');
  const t2 = await fahre(['a.mjs'], UMG({ LIVE: undefined, CODEX_BIN: 'codexx-gibt-es-nicht' }));
  ist('CODEX_BIN ohne «/», den es im PATH nicht gibt: der Trockenlauf sagt «Bereit für LIVE=1: NEIN»', [t2.aus.includes('Bereit für LIVE=1: NEIN'), t2.aus.includes('in keinem Ordner des PATH')], [true, true]);
  const l2 = await fahre(['a.mjs'], UMG({ CODEX_BIN: 'codexx-gibt-es-nicht' }));
  ist('… und LIVE=1 endet mit Exit 2 vor dem Sandkasten', [l2.code, sandkaesten(), aufruf()], [2, SK0, null]);

  // Teilschreibung
  {
    const teilFs = { ...fsAlle, writeSync: (fd, buf, off = 0, len = buf.length - off) => fsAlle.writeSync(fd, buf, off, Math.min(len, 1000)) };
    const ordner = mkdtempSync(join(BASIS, 'teil-'));
    const text = 'Zeile mit Umlaut ä\n'.repeat(500);
    const pfad = sicher(() => K.schreibeDatei(ordner, 'a.txt', text, teilFs));
    ist('schreibeDatei: eine Teilschreibung (höchstens 1000 Bytes je Aufruf) wird bis zum Ende fortgesetzt', sicher(() => readFileSync(pfad, 'utf8') === text), true);
    const nullFs = { ...fsAlle, writeSync: () => 0 };
    ist('schreibeDatei: kommt nichts mehr hinaus, ist es ein Fehler ohne Endlosschleife, und die halbe Datei bleibt nicht liegen', [String(sicher(() => K.schreibeDatei(ordner, 'b.txt', 'abc', nullFs))).startsWith('Ausnahme'), existsSync(join(ordner, 'b.txt'))], [true, false]);
    ist('schreibeDatei: Rechte 0600 und eine leere Antwort ergibt eine leere Datei', sicher(() => { const q = K.schreibeDatei(ordner, 'c.txt', ''); return [statSync(q).size, (statSync(q).mode & 0o777).toString(8)]; }), [0, '600']);
  }
  if (spawnSync('bash', ['-c', 'exit 0']).status === 0) {
    const AUS3 = join(BASIS, 'ausgabe-ulimit');
    mkdirSync(AUS3);
    setzeFall('riesig', { bytes: 110_000 });
    const u = spawnSync('bash', ['-c', 'ulimit -f 64 && exec "$0" "$@"', process.execPath, CLI, 'automation/codex_zweitmeinung.mjs'], { cwd: ECHTES_REPO, encoding: 'utf8', env: { PATH: process.env.PATH, TMPDIR: TEMP, LIVE: '1', CODEX_BIN: FAKE, CODEX_HOME_ZWEITMEINUNG: CODEXHOME, ZWEITMEINUNG_AUSGABE_ORDNER: AUS3 } });
    const txts = readdirSync(AUS3).filter(n => n.endsWith('.txt') && !n.endsWith('.stderr.txt'));
    ist('Dateigrössen-Limit (ulimit -f 64) bei einer 110-KB-Antwort: kein abgeschnittener Beleg bleibt liegen, der Fehler wird gemeldet', [u.stderr.includes('nicht gespeichert'), txts.every(n => readFileSync(join(AUS3, n), 'utf8').trimEnd().endsWith('ENDE'))], [true, true]);
  }

  // Namen relativ zum Arbeitsordner, Ordner mit «..»-Namen im Repo
  {
    const r = spawnSync(process.execPath, [CLI, 'kern.mjs'], { cwd: join(ECHTES_REPO, 'codex-mods', 'luxe-codex', 'test'), encoding: 'utf8', env: { PATH: process.env.PATH, TMPDIR: TEMP } });
    ist('Prozess aus einem Unterordner des Repos: ein Name ohne Pfad meint die Datei in diesem Ordner', [r.status, r.stdout.includes('codex-mods/luxe-codex/test/kern.mjs'), r.stdout.includes('Dateien: 1')], [0, true, true]);
    const rc = await fahre(['README.md'], UMG({ LIVE: undefined }), { cwd: join(REPO, 'dropship') });
    ist('main mit Arbeitsordner im Repo: README.md ist dropship/README.md, nicht die Datei der Wurzel', [rc.code, rc.aus.includes('dropship/README.md  ')], [0, true]);
    setzeFall('ok');
    ist('Ausgabeordner und Temp-Ordner mit Namen «..ausgabe» im Repo → Exit 2, Codex nicht gestartet', [(await fahre(['a.mjs'], UMG({ ZWEITMEINUNG_AUSGABE_ORDNER: join(REPO, '..ausgabe') }))).code, (await fahre(['a.mjs'], UMG(), { temp: join(REPO, '..ausgabe') })).code, aufruf()], [2, 2, null]);
  }

  // Ergebnis einordnen: Stichwörter nur in echten Fehlermeldungen
  {
    const g = rest => { const k = L.klassifiziere(R(rest)); return [k.exit, k.grund.includes('ENDE fehlt')]; };
    ist('«401» im Text der Antwort ist kein Anmeldefehler (der Grund bleibt «ENDE fehlt»)', g({ stdout: '[{"titel":"Shopify-Client wiederholt bei 401 endlos"}]\n' }), [5, true]);
    ist('«12,401» im Token-Zähler von stderr ist kein Anmeldefehler', g({ stdout: '[{"titel": "Halb', stderr: 'tokens used: 12,401\n' }), [5, true]);
    ist('«timed out» im Text der Antwort ist kein Netzfehler', g({ stdout: '[{"titel":"Abfrage läuft in ein timed out' }), [5, true]);
    const grund = rest => L.klassifiziere(R(rest)).grund;
    ist('die Stichwörter zählen nur in Fehlermeldungen: «HTTP 401» und «request timed out» als Befund IN der Antwort (Exit 0, ohne ENDE) bleiben «ENDE fehlt»', [g({ stdout: '[{"titel":"Antwort hat HTTP 401 Unauthorized als Fehlerfall"}]\n' }), g({ stdout: '[{"titel":"Der request timed out nach 30 s"}]\n' })], [[5, true], [5, true]]);
    ist('… aber bei einem Fehlercode mit kurzem Text auf stdout werden sie erkannt (Codex meldet den Fehler dort)', [grund({ code: 1, stdout: 'Error: not logged in\n' }).includes('Anmeldefehler'), grund({ code: 1, stdout: 'Error: request timed out\n' }).includes('Netzfehler')], [true, true]);
    ist('echte Fehler bleiben erkannt: «HTTP 401», «Request timed out», «connection timed out»', [grund({ code: 1, stderr: 'HTTP 401\n' }).includes('Anmeldefehler'), grund({ code: 1, stderr: 'Error: request timed out after 30s\n' }).includes('Netzfehler'), grund({ code: 1, stderr: 'connection timed out\n' }).includes('Netzfehler')], [true, true, true]);
  }

  // Prozessende: Gruppe, Eskalation, Überlauf, Enkel mit geerbten Pipes
  {
    const umg = { PATH: process.env.PATH, HOME: FAKE_DIR, CODEX_HOME: CODEXHOME };
    const PID = join(FAKE_DIR, 'enkel.pid');
    const start = opt => fuehreAus({ bin: FAKE, argv: [], env: umg, cwd: FAKE_DIR, stdin: '', ...opt });
    setzeFall('enkel', { pidDatei: PID, detached: false, antwort: false });
    let t0 = Date.now();
    let e = await mitFrist(start({ zeitlimitMs: 1500 }), 40_000);
    let enkel = Number(sicher(() => readFileSync(PID, 'utf8')));
    await schlafe(200);
    ist('Zeitlimit beendet auch den Enkelprozess (Prozessgruppe), und der Lauf kehrt nach dem Limit zurück, nicht erst wenn der Enkel endet', [e.zeitueberschreitung, Date.now() - t0 < 15_000, lebtNoch(enkel)], [true, true, false]);
    toete(enkel);

    setzeFall('ignoriertterm');
    t0 = Date.now();
    e = await mitFrist(start({ zeitlimitMs: 1500 }), 30_000);
    const ig = aufruf();
    await schlafe(200);
    ist('ein Kind, das SIGTERM ignoriert, wird mit SIGKILL beendet und der Lauf kehrt zurück', [e.zeitueberschreitung === true, Date.now() - t0 < 12_000, ig ? lebtNoch(ig.pid) : 'kein Kind'], [true, true, false]);
    if (ig) toete(ig.pid);

    setzeFall('endlos');
    t0 = Date.now();
    e = await mitFrist(start({ zeitlimitMs: 20_000, maxBytes: 1000 }), 30_000);
    const en = aufruf();
    await schlafe(200);
    ist('Überlauf: das endlos schreibende Kind wird sofort beendet, nicht erst beim Zeitlimit', [e.ueberlauf, Date.now() - t0 < 8000, en ? lebtNoch(en.pid) : 'kein Kind'], [true, true, false]);
    if (en) toete(en.pid);

    setzeFall('enkel', { pidDatei: PID, detached: false, antwort: true });
    t0 = Date.now();
    const f10 = await mitFrist(fahre(['a.mjs', 'sub/b.mjs'], UMG({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: '0.1' })), 40_000);
    enkel = Number(sicher(() => readFileSync(PID, 'utf8')));
    await schlafe(200);
    ist('vollständige Antwort, aber ein Enkel hält die Pipes offen: Exit 0 (kein falsches «Zeitlimit»), schnell, der Enkel wird beendet', [f10.code, Date.now() - t0 < 5000, lebtNoch(enkel)], [0, true, false]);
    toete(enkel);

    setzeFall('enkel', { pidDatei: PID, detached: true, antwort: false });
    t0 = Date.now();
    const f21 = await mitFrist(fahre(['a.mjs'], UMG({ ZWEITMEINUNG_ZEITLIMIT_MINUTEN: '0.05' })), 40_000);
    enkel = Number(sicher(() => readFileSync(PID, 'utf8')));
    ist('das Zeitlimit gilt auch, wenn ein abgelöster Enkel (eigene Sitzung) die Pipes hält: Exit 5 nach dem Limit, nicht erst wenn der Enkel endet', [f21.code, String(f21.fehl).includes('Zeitlimit'), Date.now() - t0 < 12_000], [5, true, true]);
    toete(enkel);
  }
}

rmSync(FREMD, { recursive: true, force: true });
rmSync(BASIS, { recursive: true, force: true });
fertig();
