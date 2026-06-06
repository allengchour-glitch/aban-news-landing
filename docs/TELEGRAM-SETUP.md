# Telegram-Kanal + Autopost — Einrichtung (der einfachste autonom+gratis Kanal)

Anders als LinkedIn: **keine App, kein OAuth, keine Company Page, kein Token-Ablauf.** In ~5 Minuten steht ein
eigener Kanal, der werktags automatisch postet — über `automation/telegram_post.py` +
`.github/workflows/telegram-autopost.yml` + `social/telegram_queue.json` (17 geprüfte, ehrliche Posts).

## Schritt 1 — Kanal anlegen
- In Telegram: **Neuer Kanal** → Name „aban news", öffentlich → **@-Name** wählen, z. B. `@abannews`.

## Schritt 2 — Bot erstellen (@BotFather)
1. In Telegram **@BotFather** öffnen → `/newbot` → Namen + Username vergeben.
2. BotFather gibt dir den **Token** (Form `123456:ABC-...`) → das ist `TELEGRAM_BOT_TOKEN`.
3. Den **Bot als Administrator** in deinen Kanal hinzufügen (Kanal → Verwalten → Administratoren → hinzufügen),
   mit Recht „Nachrichten posten".

## Schritt 3 — Channel-Kennung
- `TELEGRAM_CHANNEL` = der öffentliche @-Name deines Kanals, z. B. `@abannews`.
  (Bei privaten Kanälen die numerische Chat-ID — bei öffentlichem Kanal reicht `@name`.)

## Schritt 4 — GitHub-Secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- `TELEGRAM_BOT_TOKEN` = Bot-Token von BotFather
- `TELEGRAM_CHANNEL` = `@abannews`

## Schritt 5 — scharf schalten
- Branch nach `main` mergen (Cron läuft nur vom Default-Branch).
- Test: Actions → **Telegram Autopost** → **Run workflow**.
- Lokal trocken: `python3 automation/telegram_post.py --dry-run`.

## Queue
- `social/telegram_queue.json` = die 17 ehrlichen Evergreen-Posts (dieselben wie LinkedIn).
- Pro Lauf wird **ein** `ready`-Eintrag gepostet, danach auf `posted` gesetzt und der Status zurück committet.
- Neue Posts einfach anhängen. ⚠️ Weiterhin: **keine erfundenen Zahlen**.

## On-Page-Verknüpfung
Sobald der Kanal steht, kann ich auf der Startseite/Footer einen „Auch auf Telegram"-Link ergänzen
(`https://t.me/abannews`) — sag einfach Bescheid bzw. nenne den finalen @-Namen.
