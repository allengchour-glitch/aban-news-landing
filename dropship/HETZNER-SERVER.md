# 🖥️ Hetzner-Server — der Weg zu Browser-Aufgaben aus der Cloud

> **Betreiber 17.09.2026: «hetzner server extra eingerichtet»** — eingerichtet genau dafür,
> dass ich Browser-Aufgaben selbst erledigen kann, statt sie an ihn zurückzugeben.
> **Status: Zugangsdaten stehen noch aus.** Diese Datei ist der Platz dafür.

## Warum das der richtige Weg ist (gemessen 17.09.2026)

Der Heim-PC ist für mich **grundsätzlich** unerreichbar, egal ob er läuft:
- Port 9222 antwortet nicht über `localhost`, `127.0.0.1`, `host.docker.internal` — das
  Setup-Dokument sagt selbst «Port 9222 ist **lokal**».
- `ListAgents` findet keine erreichbare Session.
- ALLE Bridge-Sessions melden `computer_unreachable`, die jüngste seit **15.09. 03:44**.

Ein Server mit **öffentlicher IP** hat dieses Problem nicht. Damit werden erledigbar:
BigBuy-Ticket (Formular gibt von hier HTTP 403), CJ-Dispute-Konsole, Google-Merchant-
Lieferland, Pinterest-OAuth, TikTok-Upload, IG/FB-Aufräumen über die Business Suite.

## ⚠️ Was ich brauche (bitte im CHAT, NIE in dieses Repo)

**Das Repo ist ÖFFENTLICH.** Zugangsdaten gehören nach `/tmp/hetzner.env` (Modus 600),
niemals in eine Datei, die committet wird. Siehe die IBAN-Lehre vom 16.09.

1. **IP oder Hostname** des Servers
2. **Zugang**: Benutzer + SSH-Schlüssel (privater Schlüssel im Chat) oder Passwort
3. **Was ist installiert?** Chrome/Chromium, Node, Playwright — oder blank?
4. Läuft schon ein Browser mit `--remote-debugging-port=9222`?

## ⚠️ Zuerst zu prüfen, bevor irgendetwas gebaut wird

**Ob dieser Container überhaupt nach draussen SSH sprechen darf.** Der Session-Proxy hat
schon andere Wege blockiert (Remote-Branch-Löschung, gemessen 30.08.). Ausgehendes HTTPS
geht über `$HTTPS_PROXY`; ob Port 22 offen ist, ist **ungeprüft**. Erst messen, dann planen:
`timeout 8 bash -c 'cat < /dev/null > /dev/tcp/<IP>/22' && echo offen || echo zu`

Falls SSH blockiert ist, bleibt der Weg über **HTTPS**: auf dem Server einen kleinen
Dienst hinter TLS, den ich per `curl` anspreche. Das ist mehr Arbeit, aber machbar.

## Sicherheit

- Der CDP-Port (9222) darf **NIE** offen im Internet stehen — wer ihn erreicht, steuert den
  Browser mitsamt allen eingeloggten Sitzungen. Nur über SSH-Tunnel oder Firewall auf eine IP.
- Keine Passwörter in Repo-Dateien, keine in Commit-Messages.
