# 🖥️ VPS-Setup — Always-on Hirn (n8n) für LuxeStyle

> User hat 2026-06-22 einen **€4/Mo VPS** bezahlt. Ziel: ein Server, der **immer läuft, sich selbst
> neustartet** und alle **API-Arbeit autonom** macht (Shopify/SEO/Meta-CAPI/TikTok-Kampagnen/E-Mail) —
> **kein PC-Neustart mehr nötig**. Voller Hintergrund: `dropship/ZERO-STEERING-BLUEPRINT.md`.

## Schritt 0 — Was du brauchst
- SSH-Zugang zum VPS (IP + Root/User-Passwort oder SSH-Key — bekommst du vom Hoster, z.B. Hetzner-Console).
- Betriebssystem **Ubuntu 22.04/24.04** (bei Hetzner beim Erstellen wählen).

## Schritt 1 — Einloggen + Docker installieren
```bash
ssh root@DEINE_VPS_IP
# Docker + Compose in einem Rutsch:
curl -fsSL https://get.docker.com | sh
```

## Schritt 2 — n8n starten (selbstheilend)
```bash
mkdir -p /opt/luxe && cd /opt/luxe
# diese docker-compose.yml hierher kopieren (per scp, nano, oder git):
#   git clone -b claude/luxestyle-product-CizQ6 <REPO_URL> repo && cp repo/automation/vps/docker-compose.yml .
docker compose up -d
docker compose ps          # n8n sollte "running" zeigen
```
→ n8n läuft jetzt 24/7 und startet nach Crash/Reboot **von selbst** neu (`restart: unless-stopped`).

## Schritt 3 — n8n öffnen (sicher, ohne offenen Port)
n8n hört nur auf localhost. Vom eigenen Rechner einen **SSH-Tunnel** aufmachen:
```bash
ssh -L 5678:localhost:5678 root@DEINE_VPS_IP
```
Dann im Browser **http://localhost:5678** öffnen → **Owner-Konto** anlegen (Mail + Passwort = nur du).
*(Komfortabler später: Cloudflare Tunnel für eine eigene HTTPS-URL — Anleitung im Blueprint.)*

## Schritt 4 — Secrets in n8n hinterlegen (NICHT ins Repo!)
In n8n → **Credentials** anlegen für:
- **Shopify Admin API** (Token aus der Custom-App, Client-Credentials-Grant — siehe CLAUDE.md „Shopify-API-Login").
- **Meta Marketing API + CAPI** (Pixel/Conversions-API-Token).
- **TikTok Marketing API** (nach Ad-Konto-Onboarding).
- **Klaviyo/Brevo** (E-Mail), **Telegram** (Alerts).

## 🟢 Schnellstart-Alternative (ohne n8n) — sofort produktiv mit cron
Wenn du n8n (noch) nicht aufsetzen willst, reicht für die API-Jobs **purer cron + die vorhandenen Skripte**:
```bash
apt-get update && apt-get install -y nodejs npm git
git clone -b claude/luxestyle-product-CizQ6 <REPO_URL> /opt/luxe/repo && cd /opt/luxe/repo && npm ci || npm i
# Secrets anlegen (NIE ins Repo):
cat > /opt/luxe/.env <<'ENV'
SHOPIFY_CLIENT_ID=ffe6c3a1326affdd7f461760ac1a8950
SHOPIFY_CLIENT_SECRET=DEIN_SHPSS_SECRET
SHOPIFY_SHOP=au3j0y-hq.myshopify.com
ENV
chmod 600 /opt/luxe/.env
# Testlauf (DRY = aendert nichts):
DRY=1 /opt/luxe/repo/automation/vps/run-api-jobs.sh
# Cron eintragen (taeglich 04:00, echt):
( crontab -l 2>/dev/null; echo "0 4 * * * /opt/luxe/repo/automation/vps/run-api-jobs.sh >> /opt/luxe/api-jobs.log 2>&1" ) | crontab -
```
→ Ab jetzt füllt der VPS **täglich autonom** Google-Merchant-Felder + Mode-Beschreibungen (Search = dein
bester Kanal) — **kein PC, kein Browser, kein Neustart**. Später n8n drauf für CAPI/TikTok/Alerts.

## Schritt 5 — Erste Workflows (Reihenfolge = größter Gewinn zuerst)
1. **SEO/Katalog-Cron** (Schedule-Trigger täglich) → Shopify-API: leere Meta-Beschreibungen füllen, Feed-Felder. *Kein Browser.*
2. **Meta CAPI** (server-side Events) → schließt die 0-Kauf/„leerer-Pixel"-Lücke (recovered 20–30 % Conversions). *Kein Browser.*
3. **TikTok-Marketing-API-Kampagne** (sobald Ad-Konto-Onboarding fertig) → Budget/Kampagne per API. *Kein Browser.*
4. **Error-Trigger → Telegram** → du wirst nur bei echten Fehlern gepingt (Stille = gesund).

## Schritt 6 — PC-Tasks abschalten (sobald VPS-Workflows laufen)
Jeden API-Job, den n8n übernimmt, auf dem PC deaktivieren (Task Scheduler). Am Ende bleibt am PC nur der
kleine **Browser-Rest** (TikTok-Organic / IG-FB-Cookie / CH-Marktplätze) — den später per Cloud-Browser
(Skyvern/Steel + CH-Residential-IP) auch noch vom VPS aus, dann ist der PC ganz raus.

## ⚠️ Regeln
- **Secrets nur in n8n-Credentials / ENV — NIE ins Repo.**
- Strikt **CH**, kein Deutschland-Markt. Budget nur im freigegebenen Rahmen (10 CHF/Tag, 350 gesamt).
- Branch-Regel unverändert: Code auf `claude/luxestyle-product-CizQ6`.

## 🤝 Wie ich (Cloud-Claude) helfe
Sag mir Hoster + dass du eingeloggt bist (oder gib mir nach Schritt 3 die n8n-URL), dann führe ich dich
**Workflow für Workflow** durch — oder ich baue die Workflow-JSONs vor, die du in n8n importierst.
Server-Zugangsdaten brauche ich NICHT in den Chat — die bleiben bei dir.
