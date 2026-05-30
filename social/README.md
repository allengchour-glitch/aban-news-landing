# 📣 Social-Poster — 1-Klick an Telegram & Discord

Sendet die fertigen Posts aus `posts.json` mit **einem Befehl** an deinen Telegram-Kanal
und/oder Discord. Anders als LinkedIn erlauben beide offiziell automatisches Posten.

## 🔐 Sicherheit zuerst
Tokens/Webhook-URLs kommen **nur aus Umgebungsvariablen** — NIE in den Code, NIE ins Git,
NIE in einen Chat. So kann nichts geleakt werden.

## Einrichten (einmalig, ~5 Min)

### Discord (am einfachsten — kein Bot nötig)
1. In deinem Discord-Server: Kanal → ⚙️ → **Integrationen → Webhooks → Neuer Webhook**.
2. **Webhook-URL kopieren**.
3. Als Umgebungsvariable setzen:
   ```
   export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/...."
   ```

### Telegram
1. Schreib **@BotFather** auf Telegram → `/newbot` → Namen wählen → du bekommst einen **Token**.
2. Erstelle einen Kanal, mach den Bot zum **Administrator**.
3. Setze:
   ```
   export TELEGRAM_BOT_TOKEN="123456:ABC..."
   export TELEGRAM_CHAT_ID="@deinkanal"
   ```

## Nutzen
```bash
python social/post.py            # sendet den NÄCHSTEN ungesendeten Post (1 Klick)
python social/post.py --id p2-top5   # bestimmten Post senden
python social/post.py --dry-run  # nur anzeigen, nichts senden
python social/post.py --all      # alle ungesendeten (Vorsicht)
```
Nach Versand wird `"sent": true` gesetzt — beim nächsten Aufruf kommt automatisch der nächste Post.

## Voll-automatisch (optional, später)
Per GitHub Action mit Zeitplan + den Tokens als **Repository-Secrets** (Settings → Secrets →
Actions). Dann postet das System z.B. 3×/Woche von selbst. Sag Bescheid, dann baue ich den Workflow.

## Posts pflegen
`posts.json` enthält 8 fertige Posts (ehrlich, kein Hype, mit echten Zahlen). Neue Posts einfach
unten anhängen (`"sent": false`). Tipp: aus jeder Newsletter-Ausgabe 1–2 neue Posts ableiten.

> Hinweis: Die Posts verlinken auf `radar./foerder./jobs.abannews.com` und `abannews.com`.
> Erst senden, wenn die jeweilige Seite live ist (sonst zeigt der Link ins Leere).
