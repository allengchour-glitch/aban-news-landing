# Cloudflare-API in Betrieb nehmen

Kurz: Die **Live-Site `abannews.com`** läuft auf **Cloudflare Pages** und wird über die
**Dashboard-Git-Integration** automatisch bei jedem Push auf `main` deployt — dafür ist
**kein API-Token nötig**. Der API-Token wird nur für die **automatischen Deploys per
GitHub Action** gebraucht (Haupt-Site-Direct-Upload **und** die Radar-Subdomains wie
`video.abannews.com`).

## Aktueller Stand (08.06.2026)
- ✅ Token `CLOUDFLARE_API_TOKEN` ist als Secret gesetzt und **authentifiziert** (Account sichtbar).
- ❌ Dem Token fehlt die Berechtigung **„Cloudflare Pages · Edit"** → `wrangler pages deploy`
  scheitert mit `Authentication error [code: 10000]`.
- 🔧 Der Workflow „Cloudflare Pages" ist jetzt **opt-in** (Schalter `CF_DIRECT_DEPLOY`) und
  erzeugt **keine roten Checks mehr**, solange der API-Deploy nicht bewusst scharfgeschaltet ist.

## Schritt für Schritt

### 1. Token mit den richtigen Rechten erstellen
Auf <https://dash.cloudflare.com/profile/api-tokens> → **Create Token** → **Create Custom Token**:

| Berechtigung | Typ | Zweck |
|---|---|---|
| **Account · Cloudflare Pages · Edit** | Account | Pages-Projekte anlegen + deployen |
| **Zone · DNS · Edit** | Zone → `abannews.com` | CNAMEs für Subdomains anlegen |
| **User · User Details · Read** | User | (optional, entfernt eine Warnung) |

→ Token kopieren (wird nur einmal angezeigt).

### 2. Secrets/Variablen im Repo setzen
**Settings → Secrets and variables → Actions**

Secrets:
- `CLOUDFLARE_API_TOKEN` = der Token aus Schritt 1
- `CLOUDFLARE_ACCOUNT_ID` = Account-ID (Cloudflare-Dashboard, rechte Seitenleiste)

Variablen (Tab „Variables"):
- `CF_PAGES_PROJECT` = Name des **Haupt-Site-Pages-Projekts** (Preflight zeigt ihn an, s. u.)
- `CF_DIRECT_DEPLOY` = `true`  ← erst setzen, **wenn der Preflight grün ist**

### 3. Token prüfen (deployt nichts)
**Actions → „Cloudflare — Preflight" → Run workflow.**
Der Report zeigt: Token aktiv? Account? Pages-Zugriff? DNS? und **wie das Haupt-Site-Projekt heißt**
(→ Wert für `CF_PAGES_PROJECT`). Lokal alternativ:

```bash
export CLOUDFLARE_API_TOKEN=…
python3 tools/cf_preflight.py
```

### 4. Scharfschalten
Ist der Preflight grün und `CF_DIRECT_DEPLOY=true` gesetzt, deployt der Workflow
**„Cloudflare Pages"** bei jedem Push auf `main` automatisch (Production) bzw. pro PR (Preview).

## Radar-Subdomains (separat)
Eine neue Subdomain (z. B. `video.abannews.com`) live schalten — sobald der Token Pages+DNS-Edit kann:
**Actions → „Cloudflare Pages — Direct Deploy (ohne OAuth)" → Run** (Eingabe `radar`-Kürzel),
oder **„Cloudflare Pages — Projekt anlegen"** für Projekt + Domain + DNS auf einmal.
Kürzel/Liste: `tools/cf_pages_setup.py` (`RADARS`).

## Troubleshooting
- **`Authentication error [code: 10000]` bei `/pages/projects/…`** → Token fehlt „Cloudflare Pages · Edit".
- **`projects/radar failed`** → `CF_PAGES_PROJECT` zeigt aufs falsche Projekt; auf den vom Preflight
  gemeldeten Haupt-Site-Namen setzen (`radar` ist nur die ki-tools-radar-Subdomain).
- **Site aktualisiert sich trotzdem** → das ist die Dashboard-Git-Integration; sie ist unabhängig vom Token.
