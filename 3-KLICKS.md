# 🚀 3 Klicks zum ersten Euro — mit Direkt-Links

> Alles ist gebaut. Diese 3 Schritte kann nur DU machen (deine Accounts). Reihenfolge einhalten.

---

## Schritt 1 — Online stellen (Cloudflare Pages, gratis, ~15 Min)

1. **Cloudflare Pages öffnen:** https://dash.cloudflare.com/?to=/:account/pages
2. **„Create application" → „Pages" → „Connect to Git"** → dein Repo `allengchour-glitch/aban-news-landing` wählen.
3. Beim Einrichten diese Werte eintragen (für das erste Projekt, KI-Tools Radar):
   - **Build command:** `cd ki-tools-radar && pip install -r requirements.txt && python generate.py`
   - **Build output directory:** `ki-tools-radar/dist`
4. **„Save and Deploy"** → du bekommst eine Adresse wie `…pages.dev`.
5. **Eigene Subdomain:** im Projekt → **Custom domains** → `radar.abannews.com` hinzufügen.
   (Wenn abannews.com schon bei Cloudflare liegt, wird der DNS-Eintrag automatisch gesetzt.)

> Die anderen zwei Seiten genauso (eigenes Pages-Projekt je Ordner):
> - Förder-Radar → Build `cd foerder-radar && python generate.py` · Output `foerder-radar/dist` · Domain `foerder.abannews.com`
> - Jobs-Radar → Build `cd jobs-radar && python fetch_jobs.py && python generate.py` · Output `jobs-radar/dist` · Domain `jobs.abannews.com`

---

## Schritt 2 — Geld-Quellen aktivieren (Affiliate-Anmeldung)

Melde dich bei den Programmen an (Direkt-Links). Du bekommst je einen persönlichen Link →
trage ihn in `ki-tools-radar/affiliate.json` ein (Anleitung: `ki-tools-radar/GELD-VERDIENEN.md`).

**Recurring (verdienst du monatlich) — zuerst:**
- Jasper: https://www.jasper.ai/partners
- GetResponse: https://www.getresponse.com/partners/affiliate-programs
- Systeme.io: https://systeme.io/affiliate-program
- Writesonic: https://writesonic.com/affiliate
- Surfer SEO: https://surferseo.com/affiliate-program/
- ElevenLabs: https://elevenlabs.io/affiliates

**Hohe Einmal-Provision:**
- Semrush: https://www.semrush.com/lp/affiliate-program/
- Canva: https://www.canva.com/affiliates/

---

## Schritt 3 — Auto-Posting scharfschalten (Telegram/Discord)

1. **GitHub-Secrets öffnen:** https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions
2. **„New repository secret"** → anlegen (mindestens einen Kanal):
   - `DISCORD_WEBHOOK_URL` → deine Discord-Webhook-URL
   - `TELEGRAM_BOT_TOKEN` → dein BotFather-Token  ·  `TELEGRAM_CHAT_ID` → z.B. `@deinkanal`
3. **Testen:** https://github.com/allengchour-glitch/aban-news-landing/actions/workflows/social-autopost.yml
   → „Run workflow" → erster Post geht raus. Danach automatisch Mo/Mi/Fr.

> Discord-Webhook holen: Server → Kanal-⚙️ → Integrationen → Webhooks → Neuer Webhook → URL kopieren.
> Telegram-Bot: in Telegram **@BotFather** → `/newbot`; Bot als Admin in deinen Kanal.

---

## Bonus — Newsletter-Wachstum (der eigentliche Hebel)
- **beehiiv-Empfehlungsnetzwerk an** (einmal klicken, dann passiv): https://app.beehiiv.com → Settings → Grow.
- **Newsletter-Anmeldeseite** für LinkedIn/Social: `gratis-ki-tools.html` (das „Top-30-PDF"-Geschenk).

---

## ⚠️ Sicherheit
- Webhook-URLs/Tokens **nur** auf der jeweiligen Seite eingeben — **nie** in Chat, E-Mail oder Screenshot.
- Niemand Seriöses verlangt vorab Geld, damit du verdienen darfst. Bankdaten nur über offizielle Plattformen (Stripe/PayPal).
