# 🖥️ Hetzner-Server — der Weg zu Browser-Aufgaben (Stand 17.09.2026)

Betreiber 17.09.: «hetzner server extra eingerichtet». Er ist **nicht neu** — er läuft
seit dem 22.06.2026 und steht seither im Repo beschrieben.

## Was GEMESSEN feststeht

| Frage | Messung | Ergebnis |
|---|---|---|
| Wo steht er? | `PROJEKT.md:57` | Hetzner **46.225.75.125**, Ubuntu 26.04, Repo unter `/opt/abannews` |
| Was tut er heute? | `server/README.md` | systemd-Timer `abannews-deploy.timer`, alle 3 Min: pollt `origin/main` → `build-pages.sh` → Cloudflare Pages |
| Erreiche ich ihn per SSH? | `/dev/tcp/46.225.75.125/22`, 8 s | **Nein**, Zeitüberschreitung |
| Liegt das am Server? | Gegenprobe `/dev/tcp/140.82.121.4/22` (github.com) | **Nein** — Port 22 ist von hier **generell** blockiert. Das ist die Ausgangsregel des Containers, nicht die Firewall des Servers. |
| Antwortet er auf 443? | `curl -k https://46.225.75.125/` | **Nein** — «Connection reset». Auf 443 lauscht nichts (ufw lässt nur SSH zu). |
| Steht CDP 9222 offen? | `/dev/tcp/…/9222` | **zu** — gut so. |

⚠️ **Eine Messung war wertlos und wäre fast als Befund durchgegangen:** der blosse
TCP-Verbindungstest auf **443 gelingt IMMER** — auch gegen `203.0.113.1`, eine Adresse aus
dem Testnetz, hinter der per Definition nichts steht. Der Ausgangs-Proxy nimmt jede
:443-Verbindung an, bevor irgendein Ziel gefragt wird. **Ein Test, der nicht scheitern
kann, misst nichts.** Erst `curl` gegen den echten Dienst zeigte die Wahrheit.

## Was daraus folgt

**Von dieser Session aus gibt es KEINEN Weg hinein** — weder SSH noch HTTPS, und daran
ändert kein Zugangsdatum etwas. Die Richtung muss umgekehrt sein: **der Server holt sich
seine Aufträge.** Genau das kann er schon — sein Deploy-Timer pollt seit Juni alle drei
Minuten `origin`. Dasselbe Muster trägt auch Browser-Aufträge.

```
ich → committe Auftrag nach auftraege/offen/*.json → push
                                   ↓ (Timer, alle 5 Min, git fetch)
Server → führt ihn aus → schreibt auftraege/erledigt/*.json + Screenshot → push
                                   ↓
ich → lese das Ergebnis beim nächsten Turn
```

Installation: `server/luxe-agent-setup.sh` (idempotent). **Noch nie auf dem Server
gelaufen** — alles darin ist ungetestet, bis er es einmal ausführt.

## Was nur der Betreiber tun kann

1. **Einmal installieren** (als root auf 46.225.75.125):
   `bash /opt/abannews/server/luxe-agent-setup.sh` — nachdem `/opt/abannews` auf einen
   Stand mit dieser Datei gezogen ist (der Deploy-Timer tut das von allein, sobald der
   Branch in `main` gemergt ist; vorher: `git fetch origin claude/luxestyle-status-tztnn1`).
2. **Den Browser einmal anmelden.** Ein frisch installiertes Chromium hat **keine**
   Sitzungen. Google Merchant, Shopify-Admin, BigBuy, Pinterest, TikTok verlangen Login
   und 2FA — das kann kein Automat. Ohne diesen einen Schritt kann der Server nur
   Seiten ansehen, die auch ohne Anmeldung offen sind.
   Profilpfad: `/var/lib/luxe-agent/chrome-profil` (bleibt erhalten, wird wiederverwendet).

## Sicherheitsregeln (nicht verhandelbar)

- **CDP-Port 9222 nie offen im Internet.** Wer ihn erreicht, steuert den Browser mitsamt
  allen angemeldeten Sitzungen. Nur lokal auf dem Server ansprechbar (`127.0.0.1`).
- **Der Runner führt NIE Shell-Code aus der Warteschlange aus.** Nur eine feste Liste von
  Auftragsarten mit geprüften Parametern. Das Repo ist **öffentlich**; ein Runner, der
  `sh -c "$(cat auftrag.json)"` täte, wäre eine Fernsteuerung für jeden, der je Schreibrechte
  auf den Branch bekommt.
- **Zugangsdaten gehören nach `/tmp/hetzner.env` (Modus 600)** — niemals ins Repo.
  Das Root-Passwort aus der Hetzner-Mail gilt seit Juni als kompromittiert
  (`server/harden-ssh.sh`, Schlüssel-Login erzwingen).
- Die IP steht bereits öffentlich im Repo (`PROJEKT.md`). Das ist kein Geheimnis, aber
  ein Grund mehr für Schlüssel-Login, `fail2ban` und eine enge ufw-Regel.
