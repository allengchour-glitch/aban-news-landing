# Cloudflare-Pages-Setup per API — `tools/cf_pages_setup.py`

Statt jede Radar-Subdomain von Hand im Cloudflare-Dashboard anzulegen, macht das
ein Skript per **Cloudflare-API**: Pages-Projekt + Custom-Domain + DNS-CNAME, in
einem Lauf, **idempotent** (Vorhandenes wird übersprungen). Reine Python-stdlib.

## Was es anlegt

Pro Radar (`<dir>` = Repo-Ordner, z. B. `video-radar`):

1. **Pages-Projekt** `<dir>`, Git-verbunden mit diesem Repo, Production-Branch `main`,
   Build-Command `cd <dir> && python generate.py`, Output `<dir>/dist`,
   Env-Var `PYTHON_VERSION=3.11`.
2. **Custom-Domain** `<sub>.abannews.com`.
3. **DNS-CNAME** `<sub>` → `<dir>.pages.dev` (proxied) in der `abannews.com`-Zone.
4. Optional ein erster **Production-Deploy**.

## Zwei Wege — einer ganz ohne Dashboard

**A) Git-verbunden** (`--mode git`, Standard): CF baut + deployt bei jedem
`main`-Push selbst. Braucht **einmal** die CF↔GitHub-OAuth-Verbindung im
Dashboard („Connect to Git") — die lässt sich per API nicht herstellen.

**B) Direct Upload** (`--mode direct`, **kein Dashboard nötig**): Ein
GitHub-Action baut das Radar und lädt `dist/` per **Wrangler** zu CF hoch — es
wird **nur ein API-Token** gebraucht, keine OAuth-Verbindung. Danach verknüpft
das Skript Custom-Domain + DNS. Workflow: `.github/workflows/cf-pages-deploy.yml`.
Nachteil: kein Auto-Deploy bei git-Push — der Workflow lädt neu hoch (manuell
oder per Erweiterung auf `push`).

> **Wenn du das Dashboard ganz vermeiden willst, nimm Weg B.** Du brauchst dann
> nur die Repo-Secrets unten und startest *Actions → „Cloudflare Pages — Direct
> Deploy (ohne OAuth)" → Run* mit `radar: video`.

## Einmalige Voraussetzungen

- **API-Token** mit den Rechten
  `Account · Cloudflare Pages · Edit` **und** `Zone · DNS · Edit`
  (für die `abannews.com`-Zone). Token erstellen unter
  Cloudflare → My Profile → API Tokens.
- **Nur für Weg A (Git-verbunden):** Die GitHub-App-Verbindung auf dem CF-Account
  muss **einmal** im Dashboard bestätigt sein („Connect to Git"). Diese
  OAuth-Verknüpfung lässt sich per API **nicht** herstellen.
  **Weg B (Direct Upload) braucht das nicht** — dort reicht der Token.

## Nutzung — lokal

```bash
export CLOUDFLARE_API_TOKEN=...          # Pflicht
export CLOUDFLARE_ACCOUNT_ID=...         # optional (sonst auto, falls eindeutig)

python3 tools/cf_pages_setup.py --list             # bekannte Radars zeigen
python3 tools/cf_pages_setup.py video --dry-run    # Probelauf, nichts ändern
python3 tools/cf_pages_setup.py video              # video.abannews.com anlegen
python3 tools/cf_pages_setup.py video kurse prompts
python3 tools/cf_pages_setup.py --all-pending      # alle noch nicht live
python3 tools/cf_pages_setup.py video --no-deploy  # ohne ersten Deploy
```

**Immer zuerst `--dry-run`.** Es zeigt jeden schreibenden Call, ohne ihn auszuführen.

## Nutzung — GitHub Actions (ohne lokalen Token)

Workflow **„Cloudflare Pages — Projekt anlegen"** (`.github/workflows/cf-pages-setup.yml`),
manuell über *Actions → Run workflow* startbar. Eingaben: `radar` (z. B. `video`
oder `all-pending`), `dry_run`, `no_deploy`.

Vorher die Repo-Secrets setzen (*Settings → Secrets and variables → Actions*):
`CLOUDFLARE_API_TOKEN` und optional `CLOUDFLARE_ACCOUNT_ID`.

## Registry pflegen

Neue Subdomain? Eintrag in `RADARS` in `tools/cf_pages_setup.py` ergänzen
(`key`, `dir`, `sub`). Build-Command und Output-Dir werden aus `dir` abgeleitet.
Bereits geschaltete Projekte mit `"live": True` markieren — sie werden ohne
`--force` übersprungen.

## Grenzen / ehrlich

- Schlägt der Projekt-Anlage-Call mit „GitHub-Connection"-Fehler fehl, ist die
  OAuth-Verbindung oben noch nicht bestätigt — einmal im Dashboard nachholen.
- Liegt die `abannews.com`-Zone nicht im selben Account, kann das Skript den
  CNAME nicht setzen und gibt den manuell zu setzenden Record aus.
- Das Skript erfindet nichts und ändert keine bestehenden Projekte (außer mit
  `--force`).
