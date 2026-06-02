# 🔑 Auto-Posting scharfschalten — die letzten 2 Minuten

> Der Code ist fertig. Es fehlen nur deine Zugangs-Werte. Die holst DU aus deinen Apps
> und trägst sie EINMAL bei GitHub ein. **Niemand sonst kann das für dich** — sie liegen
> nur in deinem Discord/Telegram. (Genau wie dein Passwort.)
>
> ⚠️ Werte **nur** auf der GitHub-Seite eingeben — **nie** in einen Chat schicken.

## Weg 1: DISCORD (am einfachsten, empfohlen)

**Schritt A — Webhook holen:**
1. Discord öffnen (App oder discord.com)
2. Deinen **Server** wählen → einen **Textkanal** (z.B. #ankündigungen)
3. Neben dem Kanalnamen auf das **Zahnrad ⚙️** („Kanal bearbeiten")
4. Links auf **„Integrationen"**
5. **„Webhooks"** → **„Neuer Webhook"** → dann **„Webhook-URL kopieren"**
6. Sieht so aus: `https://discord.com/api/webhooks/123456789/abcd-XYZ...`

**Schritt B — bei GitHub eintragen:**
1. Öffne: https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions
2. **„New repository secret"**
3. Name: `DISCORD_WEBHOOK_URL`  ·  Secret: *(die kopierte URL einfügen)*
4. **„Add secret"** → fertig ✅

---

## Weg 2: TELEGRAM (alternativ)

**Schritt A — Bot + Kanal:**
1. In Telegram **@BotFather** anschreiben → `/newbot` → Namen geben → du bekommst einen **Token** (`123456:ABC...`)
2. Einen **Kanal** erstellen, den **Bot als Administrator** hinzufügen
3. Merke dir: Token + Kanalname (`@deinkanal`)

**Schritt B — bei GitHub eintragen** (gleiche Secrets-Seite wie oben):
- Name: `TELEGRAM_BOT_TOKEN`  · Secret: dein Token
- Name: `TELEGRAM_CHAT_ID`  · Secret: `@deinkanal`

---

## Weg 3: MASTODON (offen, kostenlos, kein Kontakt nötig)

1. Auf deiner Mastodon-Instanz (z.B. mastodon.social): **Einstellungen → Entwicklung → Neue Anwendung**
2. Berechtigung **`write:statuses`** genügt → **Anwendung anlegen** → **Access-Token** kopieren
3. Bei GitHub (gleiche Secrets-Seite) eintragen:
   - Name: `MASTODON_INSTANCE`  · Secret: `https://mastodon.social` (deine Instanz)
   - Name: `MASTODON_TOKEN`  · Secret: *(der Access-Token)*

---

## Weg 4: ÜBERALL (LinkedIn, X, Instagram …) — über deine Automatisierung

LinkedIn/X/Instagram lassen sich nicht sauber direkt aus einem Skript bedienen. Lösung:
ein **generischer Webhook** → den hängst du an **Make / n8n / Zapier** (deine eigenen
Automatisierungs-Tools), das fächert dann an die Plattformen.

**Fertiges Szenario liegt schon bei** — gratis & EU mit **n8n** (kein Zapier/Make-Abo nötig):
1. `social/n8n-publish-workflow.json` in n8n importieren (Webhook → LinkedIn / X / Mastodon).
2. Plattform-Credentials in n8n verbinden, Workflow aktivieren, Production-URL kopieren.
3. Bei GitHub eintragen: Name `PUBLISH_WEBHOOK_URL` · Secret: *(die n8n-URL)*

Schritt-für-Schritt-Anleitung: **`social/N8N-WEBHOOK.md`**.
Das System schickt dann pro Post ein JSON `{ id, text, url, tags }` an deinen Webhook.

---

## Schritt C — testen (1 Klick)
1. Öffne: https://github.com/allengchour-glitch/aban-news-landing/actions/workflows/social-autopost.yml
2. Rechts **„Run workflow"** klicken
3. Dein erster Post geht raus 🎉 — danach automatisch **Mo/Mi/Fr**.

Fertig. Ab jetzt postet das System von selbst, du musst nie wieder klicken.
