# abannews Auto-Deploy-Server (Ersatz für gesperrte GitHub Actions)

GitHub Actions ist account-weit gesperrt → der bisherige Auto-Deploy
(`.github/workflows/cloudflare-pages.yml`) läuft nicht mehr. Dieser Hetzner-Server
übernimmt das: er pollt `origin/main`, baut `_site/` und deployt per Wrangler zu
Cloudflare Pages — unabhängig von GitHub Actions.

## Einrichtung (einmalig, als root auf dem frischen Server)

```bash
# 1) Setup-Skript holen + ausführen (klont Repo, installiert Node/Wrangler, legt Timer an)
curl -fsSL https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/main/server/abannews-server-setup.sh -o setup.sh
bash setup.sh

# 2) Cloudflare-Token eintragen (NIE ins Repo!)
nano /etc/abannews/deploy.env      # CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
abannews-deploy                    # sofort 1x bauen + live deployen

# 3) Server absichern (Hetzner-Passwort gilt als kompromittiert!)
bash /opt/abannews/server/harden-ssh.sh "ssh-ed25519 AAAA... dein@key"
```

## Wie es läuft

- **systemd-Timer** `abannews-deploy.timer` ruft alle ~3 min `abannews-auto-deploy` auf.
- Nur wenn `origin/main` einen neuen Commit hat → `git reset --hard origin/main`
  + `bash build-pages.sh` + `wrangler pages deploy _site --project-name=abannews`.
- Secrets liegen in `/etc/abannews/deploy.env` (chmod 600), **nie im Git**.

## Befehle

| Zweck | Befehl |
|---|---|
| Sofort deployen | `abannews-deploy` |
| Timer-Status | `systemctl status abannews-deploy.timer` |
| Deploy-Logs | `journalctl -u abannews-deploy.service -n 50 --no-pager` |
| Intervall ändern | `INTERVAL=5min bash /opt/abannews/server/abannews-server-setup.sh` |

## Dateien

- `abannews-server-setup.sh` — Haupt-Setup (idempotent).
- `deploy-now.sh` → `/usr/local/bin/abannews-deploy` (build + Wrangler-Deploy).
- `auto-deploy.sh` → `/usr/local/bin/abannews-auto-deploy` (Poller).
- `harden-ssh.sh` — SSH-Key setzen + Passwort-Login abschalten.

## Sicherheit

- Das per Hetzner-Mail/Screenshot verschickte Root-Passwort ist **kompromittiert** →
  mit `harden-ssh.sh` Key-only erzwingen **und** im Hetzner-Panel rotieren.
- Firewall (`ufw`) lässt nur SSH zu; `fail2ban` + `unattended-upgrades` aktiv.
- Cloudflare-Token nur in `/etc/abannews/deploy.env`, niemals committen.
