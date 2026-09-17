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

const APT_LEISE = { DEBIAN_FRONTEND: 'noninteractive', PATH: process.env.PATH };

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

export function fuehre_wartung_aus(aktion) {
  if (!ist_erlaubt(aktion))
    throw new Error(`Wartungsaktion nicht erlaubt: ${aktion} — erlaubt sind: `
                    + Object.keys(AKTIONEN).join(', '));
  const a = AKTIONEN[aktion];
  const ausgaben = [];
  for (const [befehl, argv] of a.schritte) {
    try {
      const out = execFileSync(befehl, argv, {
        encoding: 'utf8', timeout: (a.zeit || 120) * 1000,
        maxBuffer: 8 * 1024 * 1024, env: APT_LEISE,
      });
      ausgaben.push({ befehl: `${befehl} ${argv.join(' ')}`, ausgabe: out.slice(-4000) });
    } catch (e) {
      // ⚠️ Ein Schritt, der scheitert, wird BENANNT und bricht den Rest ab. Frueher
      // haette ein stiller Fehlschlag eine Quittung «ok» erzeugt — genau die Klasse,
      // die heute schon zweimal aussah wie Erfolg (Bot-Wand, Einwilligungswand).
      // `systemctl is-active` gibt bei «inactive» Code 3 zurueck; auch das ist eine
      // Auskunft, kein Absturz — deshalb wird stdout mitgegeben.
      ausgaben.push({ befehl: `${befehl} ${argv.join(' ')}`, fehler: String(e.message).slice(0, 300),
                      ausgabe: (e.stdout || '').toString().slice(-2000) });
      break;
    }
  }
  return { aktion, was: a.was, aendert: a.aendert, ausgaben };
}
