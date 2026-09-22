/**
 * server_inventar.mjs — REIN LESEND: was hat der Hetzner-Server fuer ein sichtbares
 * Anmelde-Fenster (Xvfb + VNC + noVNC + Tunnel) schon an Bord, und wer bin ich dort?
 *
 * Anlass 22.09.2026: Der Betreiber kann sich ueber chrome://inspect nicht anmelden und
 * sagt «wenn du externe browser oeffnest kann ich einloggen». Bevor etwas installiert
 * wird, wird gemessen. Keine Werte von Geheimnissen — nur ob Dateien/Programme da sind.
 *
 *   { "id": "server-inventar", "typ": "skript", "skript": "server_inventar.mjs" }
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const sh = (c) => { try { return execSync(c, { encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `FEHLER: ${String(e.message || e).split('\n')[0].slice(0, 120)}`; } };

export default async function ({ auftrag }) {
  const programme = {};
  for (const p of ['Xvfb', 'x11vnc', 'websockify', 'novnc_proxy', 'cloudflared', 'systemd-run', 'apt-get', 'ssh', 'curl', 'openssl'])
    programme[p] = sh(`command -v ${p} || echo fehlt`);
  const pakete = sh(`dpkg-query -W -f='\${Package} \${Status}\\n' xvfb x11vnc novnc websockify tigervnc-standalone-server 2>/dev/null || echo 'dpkg nicht lesbar'`);
  const dateien = {};
  for (const f of ['/usr/share/novnc', '/etc/luxe/secrets.env', '/opt/luxe-agent/repo', '/var/lib/luxe-agent/chrome-profil', '/usr/local/bin/luxe-auftrag', '/tmp/secrets_env.sh'])
    dateien[f] = fs.existsSync(f) ? (fs.statSync(f).isDirectory() ? 'ordner' : `datei ${fs.statSync(f).size} B`) : 'fehlt';
  // Geheimnis-Datei: nur NAMEN der Variablen, nie Werte
  let geheimnis_namen = 'keine Datei';
  if (fs.existsSync('/etc/luxe/secrets.env'))
    geheimnis_namen = fs.readFileSync('/etc/luxe/secrets.env', 'utf8').split('\n').map(z => z.split('=')[0].trim()).filter(Boolean).join(' ');
  return {
    wer: sh('id'),
    host: sh('hostname'),
    os: sh('. /etc/os-release && echo "$PRETTY_NAME"'),
    uptime: sh('uptime -p'),
    platte: sh("df -h / | tail -1 | awk '{print $4\" frei von \"$2}'"),
    programme, pakete, dateien, geheimnis_namen,
    ports_offen: sh("(command -v ss >/dev/null && ss -ltnp 2>/dev/null | awk 'NR>1{print $4}' | tr '\\n' ' ') || echo 'ss fehlt'"),
    firewall: sh('(command -v ufw >/dev/null && ufw status | head -3) || echo "ufw fehlt"'),
    chromium: sh("ls -d /opt/pw-browsers/chromium*/chrome-linux/chrome 2>/dev/null | head -1 || echo fehlt"),
    node: sh('node -v'),
    dienste: sh('systemctl list-units --type=service --state=running --no-legend 2>/dev/null | grep -i -E "luxe|abannews|caddy|nginx|apache" | awk \'{print $1}\' | tr "\\n" " "'),
  };
}
