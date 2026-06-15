# 🚀 Auto-Deploy aktivieren (abannews.com)

Der Deploy ist **vorbereitet und scharf** — es fehlt nur **dein einmaliger Klick**, weil
der Cloudflare-Token aus Sicherheitsgründen nicht im Repo liegen darf.

## Empfohlen: 1 Token-Secret setzen → jeder `main`-Merge deployt automatisch

Der Workflow **`.github/workflows/cf-deploy-mainsite.yml`** ist bereits so gebaut, dass er
bei jedem Push auf `main` automatisch baut (`build-pages.sh` → `_site/`, inkl. `functions/`)
und nach Cloudflare Pages deployt. Er braucht nur zwei Repository-Secrets:

1. GitHub → Repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN` = ein Cloudflare-API-Token mit Berechtigung **„Cloudflare Pages: Edit"**
     ⚠️ **OHNE IP-Filter** erstellen (ein IP-gesperrter Token funktioniert aus der Cloud-Session/Action nicht — Fehler `code 9109`).
   - `CLOUDFLARE_ACCOUNT_ID` = `33e5217c0d0a92d76b120ca536cffd33`
2. Optional, falls ein anderes Pages-Projekt als `abannews` genutzt wird:
   Repo-**Variable** `CF_PAGES_PROJECT` = `<projektname>` (Default ist `abannews`).

Danach: nichts weiter. Jeder gemergte PR landet automatisch live.

> Hinweis: GitHub Actions muss für den Account aktiv sein. Falls Actions gesperrt ist
> (Fair-Use-Throttle), entweder kurz warten/entsperren **oder** die Alternative unten nutzen.

## Alternative A (ganz ohne Token/Action): Cloudflare-Pages-Git-Integration
Cloudflare-Dashboard → **Workers & Pages → Pages → Create → Connect to Git** → Repo
`allengchour-glitch/aban-news-landing`, Branch `main`, **Build command** `bash build-pages.sh`,
**Output directory** `_site`. Danach baut & deployt Cloudflare bei jedem `main`-Push selbst —
**kein Secret nötig**.

## Alternative B (manuell, von deinem PC „per port"):
```bash
bash build-pages.sh
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=33e5217c0d0a92d76b120ca536cffd33 \
  npx wrangler@3 pages deploy _site --project-name=abannews --branch=main
```

## Was sonst noch dein Klick ist (nicht autonom machbar)
- **Google Search Console:** `https://abannews.com/sitemap.xml` einreichen (Sitemap ist aktuell, `robots.txt` referenziert sie).
- **Monetarisierung scharfschalten** (optional): echte Tracking-Links in `js/affiliate-config.js`,
  AdSense `ca-pub-…` in `js/ads-config.js` (beide sind gegated → ohne Werte passiert nichts).
- **D1** für Inserate (Token mit `D1 Edit` ODER DB im Dashboard als `DB` ans Pages-Projekt binden).

Stand: 2026-06-15.
