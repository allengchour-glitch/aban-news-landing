# 🧠 aban Site-Brain (Cloudflare-Cron-Worker)

Der **Cloudflare-Arm des Hirns**: ein serverloser Wächter, der die Live-Seite
`abannews.com` regelmäßig prüft — **gratis, ohne GitHub Actions und ohne GitLab**.

## Was er tut (per Cron, alle 6 h)
- ruft die wichtigsten Seiten live ab und prüft: HTTP 200, `<title>`, canonical, `og:title`, meta-description
- berechnet einen **Health-Score** und speichert den **Verlauf** in KV
- **alarmiert per Telegram**, sobald etwas kaputt ist (optional)

## Was er bewusst NICHT tut
Er **fixt nichts** und **deployt nichts**. Reparieren + Deployen braucht den Quellcode
und einen Review (Branch → PR → Deploy) — das macht der GitLab-Brain-Job
(`.gitlab-ci.yml` → `brain-improve`) oder eine Claude-Session. Dieser Worker ist das
**Auge**: er bemerkt Probleme sofort, ohne dass jemand etwas tun muss.

## Einrichtung (einmalig, ~5 Min)
Voraussetzung: ein Cloudflare-Token mit **Workers Scripts: Edit** + **Workers KV Storage: Edit**
(das vorhandene Pages-Token reicht dafür evtl. nicht — ggf. ein neues anlegen).

```bash
cd workers/site-brain

# 1) KV-Namespace anlegen → gibt eine id aus
npx wrangler kv namespace create BRAIN_KV
#    → die ausgegebene id in wrangler.toml bei kv_namespaces.id eintragen

# 2) optionale Secrets
npx wrangler secret put TRIGGER_KEY        # schützt den manuellen Test-Aufruf
npx wrangler secret put TELEGRAM_BOT_TOKEN # Alarm bei Problemen
npx wrangler secret put TELEGRAM_CHAT_ID

# 3) deployen (Cron ist dann aktiv)
npx wrangler deploy
```

## Nutzung
- **Status ansehen:** `GET https://aban-site-brain.<dein-subdomain>.workers.dev/`
- **Sofort prüfen:** `GET https://aban-site-brain.<…>.workers.dev/?run=1&key=<TRIGGER_KEY>`

## Zusammenspiel der drei Hirn-Arme
1. **Cloudflare Site-Brain** (dieser Worker) — *überwacht* die Live-Seite rund um die Uhr.
2. **GitLab `brain-improve`** — *verbessert* (scannt + fixt, schlägt auf `brain/auto` vor).
3. **Claude-Session-Hook** — weckt das Hirn bei jeder Session, arbeitet Befunde ab + deployt.
