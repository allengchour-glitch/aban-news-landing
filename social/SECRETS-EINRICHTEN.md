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

## Schritt C — testen (1 Klick)
1. Öffne: https://github.com/allengchour-glitch/aban-news-landing/actions/workflows/social-autopost.yml
2. Rechts **„Run workflow"** klicken
3. Dein erster Post geht raus 🎉 — danach automatisch **Mo/Mi/Fr**.

Fertig. Ab jetzt postet das System von selbst, du musst nie wieder klicken.
