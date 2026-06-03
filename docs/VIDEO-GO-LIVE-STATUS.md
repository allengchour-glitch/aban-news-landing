# Handoff-Status: video.abannews.com Go-Live (Session-Stand)

> Kurz-Notiz, damit der Stand nicht verloren geht. Code ist vollständig in `main`;
> offen ist nur das finale Cloudflare-Live-Schalten + zwei Sicherheits-To-dos.

## Code-Stand: ✅ vollständig in `main`
- `video-radar/` baut sauber (36 Seiten inkl. `_headers`/Security-CSP).
- SEO-Seite `ki-videos-erstellen.html` + OG-Bild, Sitemap, Pretty-URLs `/ki-video`.
- Deploy-Automatik: `tools/cf_pages_setup.py` + Workflows
  `cf-pages-setup.yml` (Git-verbunden) und `cf-pages-deploy.yml` (Direct Upload).
- Docs: `CF-PROJEKTE-TABELLE.md` (6a), `API-KEYS.md` (6c), `CF-PAGES-SETUP.md`.

## Offen: video.abannews.com live schalten
Mehrere Deploy-Versuche über `cf-pages-deploy.yml` schlugen am **API-Token** fehl:
- `CLOUDFLARE_ACCOUNT_ID` ist **korrekt** (Account wird erreicht).
- `CLOUDFLARE_API_TOKEN` authentifiziert sich, aber der Pages-Zugriff scheitert mit
  **`Authentication error [code: 10000]`** → dem Token fehlt die Berechtigung
  **Account · Cloudflare Pages · Edit** (nicht „Account Custom Pages"!).

**Zwei Wege zum Abschluss:**
1. **Token reparieren:** Token mit **Account · Cloudflare Pages · Edit** + **Zone · DNS · Edit**
   (Zone abannews.com), **kein** Client-IP-Filter. In GitHub-Secret `CLOUDFLARE_API_TOKEN`
   aktualisieren → Workflow „Cloudflare Pages — Direct Deploy" neu starten (`radar: video`).
2. **Dashboard (einfacher):** CF → Workers & Pages → Create application → Pages →
   Connect to Git → Repo `aban-news-landing` → Build output `video-radar/dist`,
   Branch `main` → Save and Deploy → Custom domains → `video.abannews.com`.

**Verifikation:** `…pages.dev`-URL des Projekts öffnen (zeigt den KI-Video-Radar);
`video.abannews.com` braucht nach Einrichtung 1–5 Min für SSL/DNS.

## Wichtigster Befund: Worker statt Pages (aus echtem Build-Log)
Der entscheidende Fehler wurde im Cloudflare-Build-Log gefunden: Die Projekte wurden
über **„Workers Builds" als Worker** angelegt, **nicht als Pages**. Der Build läuft
durch (`cd <radar> && python generate.py` baut `dist/`), aber der Deploy-Schritt
`npx wrangler deploy` lädt mit **Output-Directory `.` das GESAMTE Repo-Root** hoch —
inkl. `.git/objects/pack/*.pack` (~297 MiB). Workers erlauben max. 25 MiB/Datei →

```
[ERROR] Asset too large. ... .git/objects/pack/...pack with a size of 297 MiB.
```

**Fix (zwei Moeglichkeiten):**
1. **Als Pages neu anlegen** (sauberste Loesung): Create application -> **Pages** ->
   Connect to Git -> Build output `video-radar/dist`. Pages laedt nur den Output-Ordner,
   nicht das Repo.
2. **Worker-Deploy auf den dist-Ordner begrenzen** (falls das Konto nur Workers Builds
   anbietet): im Projekt unter *Settings -> Builds* die **Deploy command** aendern zu
   `npx wrangler deploy --assets video-radar/dist --name video-radar`
   — dann wird statt des Repo-Roots nur `video-radar/dist` hochgeladen.

Gilt 1:1 fuer alle uebrigen Radars (jeweils `<radar>/dist`).

## Sicherheits-To-dos (offene Punkte)
Während der Einrichtung wurden **zwei Geheimnisse im Chat** sichtbar — beide gelten als
kompromittiert und sollten **gesperrt/rotiert** werden (Werte stehen bewusst NICHT hier):
- **ElevenLabs API-Key** → elevenlabs.io → Profile → API Keys → Delete + neu erstellen.
- **Cloudflare API-Token** (`cfut_…`) → dash.cloudflare.com → My Profile → API Tokens → Delete/Roll.

Grundregel: Keys nur in GitHub-Secrets / CF-Env-Variablen, **nie** in Chat/Repo
(siehe `docs/API-KEYS.md`).

## Restliche Radars
Gleicher Weg für die übrigen 13 offenen Subdomains (Tabelle: `docs/CF-PROJEKTE-TABELLE.md`).
Sobald der Token Pages·Edit hat, geht `python3 tools/cf_pages_setup.py --all-pending`
bzw. der Workflow je Radar.
