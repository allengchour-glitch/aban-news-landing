# Scharfschalten — Token Schritt für Schritt

Alle Tokens kommen als **GitHub-Secret** ins Repo (nie in den Code!). Ablageort immer gleich:
**Repo → Settings → Secrets and variables → Actions → „New repository secret"**
Direktlink: https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions

Pro Secret: Name **exakt** wie unten + Wert einfügen → „Add secret".

---

## 1) GEMINI_API_KEY  (Gemini schreibt Posts/Bilder/Entwürfe)
1. Öffne **https://aistudio.google.com/app/apikey**
2. „**Create API key**" → Key kopieren (beginnt mit `AIza…`)
3. GitHub-Secret anlegen:
   - Name: `GEMINI_API_KEY`
   - Wert: der Key

## 2) TELEGRAM_BOT_TOKEN  (Bot zum Posten + Steuern)
> ⚠️ Der alte Bot-Token war öffentlich geleakt — **neu erzeugen!**
1. In Telegram **@BotFather** öffnen.
2. Entweder neuer Bot: `/newbot` → Namen + Username vergeben → Token kopieren.
   Oder alten neu erzeugen: `/mybots` → Bot wählen → „API Token" → „Revoke current token".
3. GitHub-Secret:
   - Name: `TELEGRAM_BOT_TOKEN`
   - Wert: der Token (Form `123456:ABC…`)

## 3) TELEGRAM_CHANNEL  (öffentlicher Kanal fürs Publikum)
1. In Telegram **neuer Kanal** → öffentlich → @-Name vergeben, z. B. `@abannews`.
2. Kanal → Verwalten → Administratoren → **deinen Bot als Admin** hinzufügen (Recht „Nachrichten posten").
3. GitHub-Secret:
   - Name: `TELEGRAM_CHANNEL`
   - Wert: `@abannews`

## 4) TELEGRAM_OWNER_ID  (nur DU darfst den Bot steuern)
1. In Telegram **@userinfobot** anschreiben → er nennt deine **Id** (eine Zahl, z. B. `164567631`).
2. GitHub-Secret:
   - Name: `TELEGRAM_OWNER_ID`
   - Wert: die Zahl

## 5) (optional) CF Web Analytics — sehen, welche Seite zieht
- Cloudflare-Dashboard → Web Analytics → Site → Token kopieren → in `js/analytics.js` bei `CF_TOKEN` einsetzen (oder mir schicken).

## 5b) (optional) PEXELS_API_KEY — echte Stockfotos statt KI-Bilder
1. Gratis-Key holen: **https://www.pexels.com/api/** → „Get Started" → Key kopieren.
2. GitHub-Secret: Name `PEXELS_API_KEY`, Wert = der Key.
3. Bildquelle steuern (GitHub → Settings → Variables):
   - `ABAN_IMAGE_SOURCE` = `auto` (Default: Pexels falls Key, sonst KI) · `pexels` (nur echte Fotos) · `ai` (nur Imagen).
   - Bildkosten ganz aus: Variable `ABAN_DISABLE_IMAGE_GEN` = `1` → nur die gratis Marken-Karte.
   Reihenfolge im Code: **Pexels → Imagen → Marken-Karte** (alles no-op-sicher).

## 6) (optional, später) LinkedIn
- `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AUTHOR_URN` (siehe `docs/LINKEDIN-AUTOPOST.md`). Braucht Company Page am Desktop — kann warten.

---

## Zum Schluss: live schalten
1. **PR #381 mergen** (Crons laufen nur vom `main`-Branch).
2. Test: Actions → „Telegram Steuerbot" → Run workflow → dann dem Bot **`/status`** schreiben.
3. Läuft? Dann posten Content-Engine + Autopost werktags von selbst, du steuerst per Telegram.

## Mindest-Set für „autonom posten heute"
`GEMINI_API_KEY` + `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL` + `TELEGRAM_OWNER_ID` → mergen. Fertig.
