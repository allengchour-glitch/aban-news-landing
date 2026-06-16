# aban Inserate-Brain (Cloudflare Worker)

Autonomer Wächter für die Kleinanzeigen — läuft per Cron (stündlich), **ohne GitHub Actions**.
Meldet per Telegram, wenn die Datenbank live geht und wenn neue Inserate auf Freigabe warten.

## Einmalig deployen (PC mit eingeloggtem wrangler)
```bash
cd workers/inserate-brain
npx wrangler kv namespace create INS_KV
# die ausgegebene id in wrangler.toml bei INS_KV eintragen
npx wrangler deploy
# Secrets:
npx wrangler secret put ADMIN_TOKEN         # derselbe Token wie im Pages-Projekt (für offene Freigaben)
npx wrangler secret put TELEGRAM_BOT_TOKEN  # für Alarme aufs Handy
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put TRIGGER_KEY         # optional
```

## Test
- `GET https://<worker-url>/?run=1&key=<TRIGGER_KEY>` → führt einen Lauf aus, gibt JSON zurück.
- `GET https://<worker-url>/` → letzter Stand aus KV.

## Was es meldet
- 🎉 „Datenbank ist LIVE" (erstes Mal `demo:false`)
- 🥳 „erstes echtes Inserat sichtbar"
- 📥 „N neue Inserate warten auf Freigabe → /inserate-admin.html"

Tut bewusst **kein** Deploy/Fix — es ist der autonome Melder. Freigeben via `/inserate-admin.html`.
