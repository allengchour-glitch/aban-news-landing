/**
 * server_zustand.mjs — REIN LESEND: wie gesund ist der Hetzner-Server als Automations-Maschine? (06.10.2026)
 *
 * Anlass: Betreiber «hetzner verbessern und für die automation». Der Cloud-Container startet ~stündlich neu und nimmt jeden
 * Dauerläufer mit; der Server läuft durch. Bevor Arbeit umgezogen wird, wird gemessen: Last, Speicher, Platte, laufende
 * Skripte (nur Namen), systemd-Timer/-Dienste der Luxe-Einheiten, fehlgeschlagene Einheiten, Fehlerzeilen der Wächter-Logs,
 * vorhandene Geheimnis-NAMEN (nie Werte) und welche /tmp-Zugangsdateien die Wächter finden.
 *
 *   { "id": "server-zustand", "typ": "skript", "skript": "server_zustand.mjs" }
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const sh = (c) => { try { return execSync(c, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `FEHLER: ${String(e.message || e).slice(0, 200)}`; } };
const ohneGeheimnis = (t) => String(t).split('\n').filter(l => !/token|secret|passw|api[_-]?key|bearer|shpat_|shpss_|@api@|MCP@/i.test(l)).join('\n');

export default async function () {
  const z = {};
  z.uptime = sh('uptime');
  z.speicher = sh('free -m');
  z.platte = sh('df -h / /opt /tmp 2>/dev/null | sort -u');
  z.cpu = sh('nproc');
  // laufende Automations-Prozesse: nur Programm + Skriptname, nie Argumente mit Werten
  z.prozesse = sh(`ps -eo etimes=,rss=,args= | awk '$3 ~ /(python3|node|bash)$/ {n=split($4,a,"/"); printf "%s %dMB %s\\n", ($1>3600? int($1/3600) "h" : int($1/60) "m"), $2/1024, a[n]}' | sort -k3 | uniq -c | sort -rn | head -60`);
  z.timer = sh('systemctl list-timers --all --no-pager 2>/dev/null | grep -Ei "luxe|abannews" || echo keine');
  z.dienste = sh('systemctl list-units --all --no-pager --plain 2>/dev/null | grep -Ei "luxe|abannews" || echo keine');
  z.fehlgeschlagen = sh('systemctl --failed --no-pager --plain 2>/dev/null | head -20');
  z.journal_fehler = ohneGeheimnis(sh('journalctl --since "-6h" --no-pager -p err 2>/dev/null | tail -25'));
  // Wächter-Logs: nur Zeilen mit Fehler-Signal, gekürzt
  const logs = {};
  for (const f of sh('ls -t /tmp/*.log 2>/dev/null | head -80').split('\n').filter(Boolean)) {
    const t = ohneGeheimnis(sh(`grep -aE "Traceback|Error|FEHLER|⛔|Insufficient|THROTTLED|Killed|No space" "${f}" 2>/dev/null | tail -2`));
    if (t && !t.startsWith('FEHLER: Command failed')) logs[f.replace('/tmp/', '')] = t.slice(0, 300);
  }
  z.log_fehler = logs;
  // Zugangsdateien, die die Wächter in /tmp erwarten — nur ob vorhanden
  const da = {};
  for (const f of ['/tmp/cj_shop_token.txt', '/tmp/cj_token.json', '/tmp/cj_konten.env', '/tmp/cj_mcp.env', '/tmp/fortura_env.sh', '/tmp/metricool.env', '/tmp/secrets_env.sh', '/etc/luxe/secrets.env'])
    da[f] = fs.existsSync(f) ? `da (${Math.round((Date.now() - fs.statSync(f).mtimeMs) / 3600000)} h alt)` : 'fehlt';
  z.zugangsdateien = da;
  let namen = [];
  try { namen = fs.readFileSync('/etc/luxe/secrets.env', 'utf8').split('\n').map(l => l.replace(/^export\s+/, '').split('=')[0].trim()).filter(n => /^[A-Z0-9_]+$/.test(n)); } catch (e) { namen = [`nicht lesbar: ${e.code}`]; }
  z.geheimnis_namen = namen;
  z.repo = sh('cd /opt/luxe-waechter/repo 2>/dev/null && git log -1 --format="%h %ad %s" --date=iso && git status -sb | head -1');
  z.cj_takt = sh('tail -3 /tmp/cj_takt_stunde.log 2>/dev/null || ls /tmp | grep -i takt | head');
  return z;
}
