/* cj_claim.mjs — Rennschutz zwischen parallelen CJ-Importern (01.09.2026).
 *
 * BEFUND: 4 Dubletten-Paare an EINEM Vormittag, jede pid ZWEIMAL in Folge im
 * Ledger (Zeilen 48548/48549). Ursache: Jeder Runner liest das Erledigt-Ledger
 * EINMAL beim Start; was ein anderer Runner waehrend des Laufs importiert, ist
 * fuer ihn unsichtbar. Beide pruefen «nicht im Ledger», beide importieren.
 *
 * PROTOKOLL (rennsicher ohne Lock, weil O_APPEND kleine Schreibvorgaenge
 * atomar haelt):
 *   1. Frischer Ledger-Blick DIREKT vor dem Import (nicht das Start-Set).
 *   2. Claim `<pid> <prozess-pid>` in die Claims-Datei anhaengen.
 *   3. Datei zurücklesen: Gehoert die ERSTE Claim-Zeile dieser pid einem
 *      anderen Prozess, hat der gewonnen — wir ueberspringen OHNE Quittung
 *      (der Gewinner quittiert; scheitert er, bleibt die pid holbar).
 * Alle Verzahnungen enden richtig: Wer zuerst anhaengt, steht zuerst in der
 * Datei, und BEIDE Leser sehen dieselbe Reihenfolge.
 *
 * Die Claims-Datei liegt bewusst in /tmp: Sie schuetzt nur das LIVE-Fenster
 * (Minuten); die Langzeit-Dedup traegt das Repo-Ledger. Ein /tmp-Wipe kostet
 * nichts als einen leeren Neuanfang.
 */
import fs from 'node:fs';

const CLAIMS = '/tmp/cj_pid_claims.txt';
const LEDGER = 'dropship/cj_niche_done.txt';

/** true = Finger weg: schon quittiert ODER ein anderer Prozess hat den Zuschlag. */
export function schonBeansprucht(pid) {
  const p = String(pid);
  try {
    if (fs.readFileSync(LEDGER, 'utf8').includes('cj:' + p + '\n')) return true;
  } catch {}
  const eigene = p + ' ' + process.pid;
  try { fs.appendFileSync(CLAIMS, eigene + '\n'); } catch { return false; }
  try {
    const zeilen = fs.readFileSync(CLAIMS, 'utf8').split('\n').filter(z => z.startsWith(p + ' '));
    return zeilen.length > 0 && zeilen[0] !== eigene;
  } catch { return false; }
}
