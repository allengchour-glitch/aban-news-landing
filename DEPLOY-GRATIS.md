# Gratis deployen — ohne GitHub Actions

GitHub Actions gesperrt oder Minuten-Limit verbraucht? Diese Hoster bauen mit **eigener
Infrastruktur**, völlig unabhängig von GitHub Actions, im **Gratis-Tier**.

**Build-Command:** `bash build-pages.sh`  ·  **Output-Verzeichnis:** `_site`

---

## Option A — Cloudflare Pages (empfohlen ✅)

Kostenlos, schnell — **und die `/api/*`-Functions laufen** (nötig für die aban-Pro-Freischaltung
`/api/pro-validate`).

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Repository `aban-news-landing` wählen, Production-Branch **`main`**
3. **Build command:** `bash build-pages.sh`  ·  **Build output directory:** `_site`
4. **Save and Deploy** → danach unter **Custom domains** `abannews.com` verbinden
5. Ab jetzt deployt **jeder Push auf `main` automatisch** — ohne GitHub Actions

**Existiert schon ein Pages-Projekt?** Dashboard → Projekt → **Deployments** → letzten Build prüfen
(fehlgeschlagen? pausiert?) → **Retry deployment** / Projekt fortsetzen. Häufig ist nur das
GitHub-Actions-„pages build and deployment" gesperrt, während Cloudflare Pages weiterläuft — dann hier
einmal **Retry**.

## Option B — Netlify (nur statisch)

Kostenlos, aber **ohne** `/api/*` → die Pro-Freischaltung funktioniert hier **nicht** (nur die Website).
1. https://app.netlify.com → **Add new site** → **Import an existing project** → Repo wählen
2. Build & Output stehen schon in `netlify.toml` (`bash build-pages.sh` → `_site`)
3. **Deploy** → Domain in den Netlify-Einstellungen verbinden

## Warum das hilft

Der Workflow „pages build and deployment" (GitHub Pages) zählt auf dein GitHub-Actions-Kontingent.
**Cloudflare Pages** und **Netlify** bauen auf ihrer eigenen, kostenlosen Infrastruktur — dein
gesperrtes/aufgebrauchtes Actions-Limit spielt dann keine Rolle mehr.
