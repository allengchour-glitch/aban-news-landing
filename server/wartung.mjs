/**
 * wartung.mjs — die EINE feste Liste dessen, was der Agent am Server tun darf.
 *
 * ⛔ DAS WICHTIGSTE ZUERST: Aus der Auftragsdatei kommt NUR ein Name aus AKTIONEN.
 *    Keine Argumente, keine Pfade, keine Flags — nichts, was ein Auftrag mitbringt,
 *    landet je in einer Kommandozeile. Das Repo ist oeffentlich; ein Runner, der
 *    Befehle aus der Warteschlange ausfuehrt, waere eine Fernsteuerung dieses Servers
 *    fuer jeden, der einen Pull Request stellen kann. Dieselbe Regel gilt schon fuer
 *    die Browser-Skripte: ausgefuehrt wird, was IM REPO steht, nie was im Auftrag steht.
 *
 * ⛔ KEIN Neustart des Servers, kein `dist-upgrade`, kein `rm -rf` auf Pfaden, die
 *    nicht hier stehen. Ein Neustart nimmt den Agenten mit und kann nur der Betreiber
 *    verantworten — genau wie der ausstehende «System restart required» vom 17.09.
 *
 * Jede Aktion ist eine feste argv-Liste fuer execFile (KEINE Shell, also auch keine
 * Wortaufspaltung und kein Globbing). Betreiber-Freigabe: 17.09.2026.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 23.09.2026 (Betreiber: «hetzner eingerichtet, dass du alles eingeben kannst und nicht ich — für volle
// automation»): die Befehle, die der Betreiber bisher von Hand eintippte (Platte, Klone, Dienst-Logs, crontab,
// Aufräumen), stehen jetzt als FESTE Aktionen hier. Weiterhin gilt: aus dem Auftrag kommt nur der NAME.
const KLONE = ['/opt/abannews', '/opt/luxe-waechter/repo', '/opt/luxe-agent/repo', '/opt/luxe/repo'];
const HIER = fileURLToPath(new URL('.', import.meta.url));
const PLATTE_SKRIPT = `${HIER}platte-schlank.sh`;

/**
 * Quittungen landen in einem OEFFENTLICHEN Repo. Jede Ausgabe laeuft deshalb hier durch, bevor sie
 * in die Quittung geht. Lieber eine Commit-SHA zu viel geschwärzt als ein Token veröffentlicht.
 *
 * Pruefer-Runde 23.09. abends (19 bestaetigte Befunde, 3 verworfen) — was die erste Fassung durchliess
 * bzw. falsch schwaerzte, steht als Gegenprobe in wartung.test.mjs:
 *   - JSON-Schluessel in Anfuehrungszeichen («"token": "abc"») blieben stehen  → Regel 3
 *   - Zugangsdaten in Nicht-HTTP-URLs (ftp://, redis://, mit leerem Nutzer)  → Regel 4 (jedes Schema)
 *   - CLI-Formen ohne «=»: `-u user:pass`, `--api-key abc`                    → Regel 5
 *   - kurze Token mit bekanntem Praefix (glpat-, xox., ghp_, shpat_, EAA…)     → Regel 6, laengenunabhaengig
 *   - die 32-Zeichen-Regel schwaerzte PFADE («/opt/luxe/repo/automation/social_autopilot») — genau das,
 *     was platte/crontab melden sollen → kein «/» in der Klasse, und nur bei Entropie (Ziffer+Gross+Klein
 *     oder reines Hex); Base64 MIT «/» ab 40 Zeichen als eigene Regel            → Regel 7/8
 *   - der Namensteil «[A-Za-z0-9_]*» war quadratisch (48-KB-Journalzeile ≈ 1 s) → begrenzt, zeilenweise, 4-KB-Kappe
 */
const SCHLUESSELWORT = 'TOKEN|SECRET|PASS(?:WORD|WORT|WD)?|PW|KEY|APIKEY|AUTH|CRED(?:ENTIALS?)?|COOKIE|SESSION|SIG(?:NATURE)?|DSN|PRIVATE|PAT|WEBHOOK';
const ZEILE_MAX = 4096;
function schwaerzeZeile(z) {
  if (z.length > ZEILE_MAX) z = z.slice(0, ZEILE_MAX) + ' …[gekürzt]';
  return z
    // 1 «Bearer/Basic/token <wert>» zuerst — sonst schwaerzt die Paar-Regel nur «Bearer»
    .replace(/(?:Bearer|Basic|token)\s+[A-Za-z0-9._~+\/\-]{8,}=*/gi, m => m.split(/\s+/)[0] + ' ***')
    // 2 NAME=wert / NAME: wert — mit Geheimniswort im Namen; Wert bis Zeilenende (auch «x y z», auch $'…')
    .replace(new RegExp(`(\\b[A-Za-z0-9_-]{0,40}(?:${SCHLUESSELWORT})[A-Za-z0-9_-]{0,40}\\s*[=:]\\s*)(?!\\*\\*\\*)[^\\n]+`, 'gi'), '$1***')
    // 3 "token": "abc" — Schluessel in Anfuehrungszeichen (JSON, YAML)
    .replace(new RegExp(`("[A-Za-z0-9_-]*(?:${SCHLUESSELWORT})[A-Za-z0-9_-]*"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'gi'), '$1"***"')
    // 4 Zugangsdaten in URLs — jedes Schema, auch leerer Nutzer, auch «/» im Passwort
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s\/@]*:[^\s@]*@/gi, '$1***@')
    // 5 CLI-Formen ohne «=»: -u user:pass · --api-key abc · --password abc
    .replace(/(\s-u\s+)[^\s:]+:\S+/g, '$1***')
    .replace(new RegExp(`(\\s--?[A-Za-z0-9-]*(?:${SCHLUESSELWORT})[A-Za-z0-9-]*\\s+)(?!\\*\\*\\*)\\S+`, 'gi'), '$1***')
    // 6 Token-Praefixe (laengenunabhaengig): GitLab, Slack, GitHub, Shopify, Meta, Google, Groq, AWS, Webhooks, SAS
    .replace(/\b(?:glpat-|xox[abpsr]-|ghp_|gho_|ghs_|github_pat_|shpat_|shpss_|shpca_|shpua_|gsk_|sk-|AIza|EAA|AKIA)[A-Za-z0-9_\-]{6,}/g, '***')
    .replace(/hooks\.slack\.com\/services\/\S+/g, 'hooks.slack.com/services/***')
    .replace(/\b(sig|sv|se|st)=[A-Za-z0-9%+\/_\-]{16,}/g, '$1=***')
    // 7 Base64 MIT «/» (ab 40 Zeichen, Gross+Klein+Ziffer) — vor Regel 8, weil «/» dort nicht in der Klasse steht
    .replace(/(?<![A-Za-z0-9+\/=])(?=[A-Za-z0-9+\/]*[A-Z])(?=[A-Za-z0-9+\/]*[a-z])(?=[A-Za-z0-9+\/]*\d)[A-Za-z0-9+\/]{40,}={0,2}(?![A-Za-z0-9+\/=])/g, '***')
    // 8 lange Zeichenketten OHNE «/» — nur mit Entropie (Ziffer+Gross+Klein) oder reines Hex ≥ 32
    .replace(/(?<![A-Za-z0-9+_\-=])(?:(?=[A-Za-z0-9+_\-]*[A-Z])(?=[A-Za-z0-9+_\-]*[a-z])(?=[A-Za-z0-9+_\-]*\d)[A-Za-z0-9+_\-]{32,}={0,2}|[0-9a-f]{32,}|[0-9A-F]{32,})(?![A-Za-z0-9+_\-=])/g, '***');
}
export function schwaerzen(text) {
  return String(text || '').split('\n').map(schwaerzeZeile).join('\n');
}

/**
 * crontab_luxe: NICHT «alles ausser Geheimnissen» (Denylist), sondern NUR Zeitfelder und Pfade (Allowlist).
 * Die Aktion beantwortet «wer benutzt /opt/luxe/repo?» — dafuer genuegen Zeitplan und Skript-/Log-Pfade.
 * Argumente, Umgebungswerte, Weiterleitungen werden zu «…» (Pruefer 23.09.: Crontab-Zeilen tragen typisch
 * Zugangsdaten als CLI-Flags oder Nicht-HTTP-URLs, die keine Denylist zuverlaessig erkennt).
 */
export function crontabZeile(z) {
  const t = z.trim();
  if (!t || t.startsWith('#')) return null;
  const w = t.split(/\s+/);
  let kopf, rest;
  if (/^@[a-z]+$/.test(w[0])) { kopf = [w[0]]; rest = w.slice(1); }
  else if (w.length > 5 && w.slice(0, 5).every(x => /^[\d*\/,\-]+$/.test(x))) { kopf = w.slice(0, 5); rest = w.slice(5); }
  else return null;                                   // NAME=wert-Zeilen und Unlesbares: gar nicht ausgeben
  const teile = [];
  for (const x of rest) {
    const ok = x.startsWith('/') && !/[@:]/.test(x) && x.length <= 120;
    if (ok) teile.push(x);
    else if (teile.at(-1) !== '…') teile.push('…');
  }
  return [...kopf, ...teile].join(' ');
}

// Fehlerzeilen aus dem Journal (Pruefer: -g gab unter systemd 255 die NEUESTE Zeile zuerst aus, slice(-4000)
// warf dann genau die neuesten Fehler weg; ohne Treffer Exit 1 → «fehler» im gesunden Zustand; das Muster
// verpasste systemds eigene Zeilen «Failed with result», «timed out», «status=1/FAILURE»). Jetzt: Filter HIER.
const JOURNAL_FEHLER = 'fatal|[Ee]rror|ERROR|[Kk]illed|space|Traceback|ENOENT|Failed|timed out|FAILURE|not found|[Dd]enied';

const APT_LEISE = { DEBIAN_FRONTEND: 'noninteractive', PATH: process.env.PATH };

// Schritt = [befehl, argv] oder [befehl, argv, { weiter, filter, form }]:
//   weiter  — dieser Schritt darf scheitern, ohne die Aktion zu beenden (Auskunft, kein Absturz)
//   filter  — Regex: nur passende Zeilen der Ausgabe
//   form    — Funktion je Zeile (Allowlist-Umformung; null = Zeile weglassen)
export const AKTIONEN = {
  // ── rein lesend ────────────────────────────────────────────────────────────
  speicher: {
    was: 'Platte, Arbeitsspeicher und die groessten Verzeichnisse melden',
    aendert: false,
    schritte: [
      ['df', ['-h', '/']],
      ['free', ['-h']],
      ['du', ['-xh', '--max-depth=1', '/var']],
      ['du', ['-xh', '--max-depth=1', '/opt']],
    ],
  },
  updates_pruefen: {
    was: 'offene Paket-Updates zaehlen',
    aendert: false,
    schritte: [['apt', ['list', '--upgradable']]],
  },
  dienste: {
    was: 'Zustand des Agenten und seines Timers melden',
    aendert: false,
    schritte: [
      ['systemctl', ['is-active', 'luxe-agent.timer']],
      ['systemctl', ['status', 'luxe-agent.timer', '--no-pager', '-n', '5']],
      ['systemctl', ['status', 'luxe-agent.service', '--no-pager', '-n', '20']],
    ],
  },

  // ── veraendernd (vom Betreiber am 17.09. freigegeben) ──────────────────────
  updates_einspielen: {
    was: 'Sicherheits- und Paket-Updates einspielen (KEIN dist-upgrade, KEIN Neustart)',
    aendert: true,
    schritte: [
      ['apt-get', ['update', '-qq']],
      // --force-confold: bestehende Konfigurationsdateien behalten. Ohne das kann apt
      // auf eine Rueckfrage warten, die hier niemand beantwortet — der Lauf haengt dann
      // bis zur Zeitgrenze und hinterlaesst ein halb aktualisiertes System.
      ['apt-get', ['-y', '-o', 'Dpkg::Options::=--force-confold',
                   '-o', 'Dpkg::Options::=--force-confdef', 'upgrade']],
    ],
    zeit: 900,
  },
  aufraeumen: {
    was: 'Paket-Cache, alte Journale und verwaiste Pakete entfernen',
    aendert: true,
    schritte: [
      ['apt-get', ['clean']],
      ['apt-get', ['-y', 'autoremove']],
      ['journalctl', ['--vacuum-time=7d']],
    ],
    zeit: 600,
  },
  // ── Server-Platte und Dienste (23.09.2026) ─────────────────────────────────
  // rein lesend; `weiter: true` = ein fehlender Klon (z. B. geloescht) bricht die Liste nicht ab.
  platte: {
    was: 'Platte, /opt (2 Ebenen), Git-Objektgroessen der Klone und halbfertige Packdateien melden',
    aendert: false, weiter: true, zeit: 300,
    schritte: [
      ['df', ['-h', '/']],
      ['du', ['-xh', '--max-depth=2', '/opt']],
      ...KLONE.map(k => ['git', ['-C', k, 'count-objects', '-vH']]),
      ['find', [...KLONE.map(k => `${k}/.git/objects/pack`), '-maxdepth', '1', '-name', 'tmp_*', '-printf', '%s %p\n']],
    ],
  },
  dienste_server: {
    was: 'Zustand aller luxe-/abannews-Dienste und Timer, Fehlerzeilen der letzten 6 h',
    aendert: false, weiter: true,
    schritte: [
      ['systemctl', ['list-units', '--all', '--plain', '--no-pager', 'luxe-*', 'abannews-*']],
      ['systemctl', ['list-timers', '--all', '--no-pager']],
      // aufsteigend (kein -g, kein -n): slice(-4000) behaelt so die NEUESTEN Zeilen
      ['journalctl', ['-u', 'luxe-waechter.service', '-u', 'abannews-deploy.service', '-u', 'luxe-agent.service',
                      '-u', 'luxe-platte.service', '--since=-6h', '--no-pager'], { filter: JOURNAL_FEHLER }],
    ],
  },
  crontab_luxe: {
    was: 'root-crontab lesen — nur Zeitfelder und Pfade der Zeilen zu /opt, luxe, abannews, jarvis',
    aendert: false,
    filter: '/opt|luxe|abannews|jarvis',
    form: crontabZeile,
    schritte: [['crontab', ['-l']]],
  },

  // ── veraendernd (Betreiber 23.09.: «für volle automation») ─────────────────
  // server/platte-schlank.sh als EIGENE systemd-Einheit: der Agent darf je Lauf nur 15 min (TimeoutStartSec=900),
  // ein gc ueber 5 GB dauert laenger — ein abgewuergter gc hinterliesse genau die tmp_pack-Reste, die er
  // aufraeumen soll. AUS_AGENT=1: das Skript haelt den Agenten nicht an und klont ihn nicht neu (es liefe sonst
  // in seinem eigenen Verzeichnis). /opt/luxe/repo wird NICHT geloescht (ALT_LOESCHEN fehlt absichtlich).
  // Kein `reset-failed` (--collect entlaedt die Einheit ohnehin; der Schritt scheiterte bei JEDEM normalen Lauf)
  // und kein `weiter`: laeuft die Einheit noch, scheitert systemd-run («already loaded») → Quittung «fehler»,
  // nicht «ok» mit dem Status des ERSTEN Laufs. Der Status-Schritt danach ist Auskunft (darf scheitern).
  platte_schlank: {
    was: 'Server-Platte aufraeumen (Reste, fremde Zweige, gc) als eigene Einheit luxe-platte im Hintergrund',
    aendert: true,
    schritte: [
      ['systemd-run', ['--unit=luxe-platte', '--collect', '--setenv=AUS_AGENT=1', '/bin/bash', PLATTE_SKRIPT]],
      ['systemctl', ['status', 'luxe-platte.service', '--no-pager', '-n', '5'], { weiter: true }],
    ],
  },
  platte_bericht: {
    was: 'Ausgabe des letzten Aufraeumlaufs (luxe-platte) lesen',
    aendert: false, weiter: true,
    schritte: [
      ['systemctl', ['is-active', 'luxe-platte.service']],
      ['journalctl', ['-u', 'luxe-platte.service', '--no-pager', '-n', '80', '-o', 'cat']],
      ['df', ['-h', '/']],
    ],
  },

  agent_neustart: {
    was: 'den Auftrags-Agenten neu starten (nicht den Server)',
    aendert: true,
    schritte: [
      ['systemctl', ['restart', 'luxe-agent.timer']],
      ['systemctl', ['is-active', 'luxe-agent.timer']],
    ],
  },
};

export function ist_erlaubt(aktion) {
  return typeof aktion === 'string' && Object.prototype.hasOwnProperty.call(AKTIONEN, aktion);
}

function aufbereiten(text, a, opt) {
  let zeilen = String(text || '').split('\n');
  const f = opt.filter || a.filter;
  if (f) { const re = new RegExp(f); zeilen = zeilen.filter(z => re.test(z)); }
  const form = opt.form || a.form;
  if (form) zeilen = zeilen.map(form).filter(z => z != null);
  return schwaerzen(zeilen.join('\n'));
}

export function fuehre_wartung_aus(aktion) {
  if (!ist_erlaubt(aktion))
    throw new Error(`Wartungsaktion nicht erlaubt: ${aktion} — erlaubt sind: `
                    + Object.keys(AKTIONEN).join(', '));
  const a = AKTIONEN[aktion];
  const ausgaben = [];
  for (const [befehl, argv, opt = {}] of a.schritte) {
    try {
      const out = execFileSync(befehl, argv, {
        encoding: 'utf8', timeout: (a.zeit || 120) * 1000,
        maxBuffer: 32 * 1024 * 1024, env: APT_LEISE,
      });
      ausgaben.push({ befehl: `${befehl} ${argv.join(' ')}`, ausgabe: aufbereiten(out, a, opt).slice(-4000) });
    } catch (e) {
      ausgaben.push({ befehl: `${befehl} ${argv.join(' ')}`, fehler: schwaerzen(String(e.message)).slice(0, 300),
                      ausgabe: aufbereiten((e.stdout || '').toString(), a, opt).slice(-2000) });
      if (a.weiter || opt.weiter) continue;   // 23.09.: rein lesende Listen melden den Fehlschlag und machen weiter
      // ⚠️ Ein Schritt, der scheitert, wird BENANNT und bricht den Rest ab. Frueher
      // haette ein stiller Fehlschlag eine Quittung «ok» erzeugt — genau die Klasse,
      // die heute schon zweimal aussah wie Erfolg (Bot-Wand, Einwilligungswand).
      // `systemctl is-active` gibt bei «inactive» Code 3 zurueck; auch das ist eine
      // Auskunft, kein Absturz — deshalb wird stdout mitgegeben.
      break;
    }
  }
  const ergebnis = { aktion, was: a.was, aendert: a.aendert, ausgaben };
  // Veraendernde Aktion mit gescheitertem Pflichtschritt → Quittung «fehler» MIT Teilergebnis (der Runner
  // uebernimmt e.teilergebnis). Vorher stand «ok» ueber einem Lauf, der nichts getan hatte (Pruefer 23.09.).
  if (a.aendert && ausgaben.some((x, i) => x.fehler && !(a.schritte[i][2] || {}).weiter))
    throw Object.assign(new Error(`Wartungsschritt gescheitert: ${ausgaben.find(x => x.fehler).befehl}`), { teilergebnis: ergebnis });
  return ergebnis;
}
