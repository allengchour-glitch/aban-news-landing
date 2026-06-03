# 🛰️ GO-LIVE — die fertigen Radar-Subdomains

> Mehrere eigenständige Verzeichnis-Sites sind **code-fertig und bauen sauber**, aber noch
> nicht öffentlich erreichbar. Jede ist ein eigenes Cloudflare-Pages-Projekt auf einer
> eigenen Subdomain. Was fehlt, ist **kein Code**, sondern der manuelle Cloudflare-
> Dashboard-Schritt + DNS — das kann nur jemand mit deinem CF-Login auslösen.
>
> Diese Datei = Tieftauchen (was jedes Projekt ist, wie es Geld bringt, was fehlt)
> **plus** die genaue Live-Schalt-Anleitung. Reihenfolge der Projekte = Empfehlung,
> womit zu starten ist.

---

## Auf einen Blick

| Projekt | Subdomain | Inhalt heute | Geldweg | Build prüft | Live? |
|---------|-----------|--------------|---------|:-----------:|:-----:|
| `prompts-bibliothek/` | `prompts.abannews.com` | **73** echte deutsche Prompts | Newsletter-Opt-in | ✅ 97 Dateien | ❌ CF fehlt |
| `kurse-radar/` | `kurse.abannews.com` | **22** KI-Kurs-Anbieter | Affiliate (deaktiviert) | ✅ 45 Dateien | ❌ CF fehlt |
| `dropshipping-radar/` | `dropshipping.abannews.com` | **22** PoD/Dropship-Anbieter | Affiliate (deaktiviert) | ✅ 42 Dateien | ❌ CF fehlt |
| `agenturen-radar/` | `agenturen.abannews.com` | **2** (ehrlich leer, Platzhalter) | Bezahlte Listings | ✅ 20 Dateien | ❌ CF fehlt |
| `foerder-radar/` | `foerder.abannews.com` | **86** Programme + 3-Fragen-Matcher | Pay-per-Lead (Berater) | ✅ 126 Dateien | ❌ CF fehlt |
| `jobs-radar/` | `jobs.abannews.com` | KI-Jobs DACH (auto-backfill) | Premium-Listings + Sponsoring | ✅ baut | ❌ CF fehlt |
| `handwerk-radar/` | `handwerk.abannews.com` | **2** (ehrlich leer, Platzhalter) | Pay-per-Lead + Featured | ✅ 15 Dateien | ❌ Daten + CF |
| `video-radar/` | `video.abannews.com` | **22** KI-Video-Tools | Affiliate (deaktiviert) | ✅ 35 Dateien | ❌ CF fehlt |

> Alle: **kein Build-Step im klassischen Sinn nötig** — `python generate.py` rendert
> reines statisches HTML nach `dist/`. Keine Abhängigkeiten außer Python-stdlib.

---

## Der Live-Schalt-Vorgang (identisch für alle)

> **Schneller, automatisiert:** `tools/cf_pages_setup.py` legt Pages-Projekt +
> Custom-Domain + DNS-CNAME per Cloudflare-API an (idempotent). Details:
> [`CF-PAGES-SETUP.md`](CF-PAGES-SETUP.md). Beispiel:
> `python3 tools/cf_pages_setup.py video --dry-run` → dann ohne `--dry-run`.
> Voraussetzung: API-Token + einmalig die GitHub-Verbindung im CF-Dashboard.
> Der manuelle Weg unten bleibt als Fallback gültig.

Pro Projekt **einmal** im Cloudflare-Dashboard:

1. **Cloudflare Pages → „Create a project" → „Connect to Git"** → dieses Repo wählen.
2. **Build-Einstellungen:**
   - *Production branch:* `main`
   - *Build command:* `cd PROJEKT && python generate.py`
   - *Build output directory:* `PROJEKT/dist`
   - *Root directory:* leer (Repo-Root)
   - Python-Version: 3.11 (Env-Var `PYTHON_VERSION=3.11`, falls CF nicht automatisch erkennt)
3. **Deploy auslösen** → CF baut und vergibt eine `*.pages.dev`-URL. Diese öffnen, prüfen.
4. **Custom Domain → „Set up a custom domain"** → die jeweilige Subdomain eintragen.
   CF legt den CNAME automatisch an (Domain liegt bereits bei Cloudflare).
5. **Fertig.** Ab dann deployt jeder Push auf `main` die Subdomain automatisch mit.

> Konkrete Werte je Projekt stehen unten im Tieftauchen. Die GitHub-Build-Workflows
> (`*-build.yml`) existieren bereits und prüfen den Build bei jedem PR — der eigentliche
> Deploy läuft aber über Cloudflare Pages, nicht über die Workflows.

---

## Tieftauchen je Projekt

### 1. `prompts-bibliothek/` → `prompts.abannews.com` — **als Erstes live schalten**

**Was es ist:** Durchsuchbare Bibliothek mit **73 selbst geschriebenen** deutschen
Prompts (9 Berufe × 11 Aufgaben), Live-Filter + Copy-Button, SEO-orientiert.

**Aufbau:** `data/prompts.json` (73 Prompts) → `generate.py` (stdlib) → `dist/`
(97 Dateien: Index, Kategorie-Seiten, Einzelseiten, Such-JSON).

**Geldweg:** Newsletter-Opt-in. Jede Prompt-Seite ist ein SEO-Eingang; das
Newsletter-CTA fängt die Leser ein. **Kein Affiliate** — bewusst sauber.

**Warum zuerst:** Kleinster Risiko-Footprint, reiner Content (keine Affiliate-/
Listing-Logik zu klären), und laut Marktrecherche ist „Premium-Nischen-Prompt-Pack
für eine definierte Zielgruppe" der einzige digitale-Produkt-Typ mit Evidenz — die
Gratis-Bibliothek ist der Funnel-Einstieg dafür.

**Was noch fehlt:** Nur der CF-Schritt oben. Optional danach: mehr Prompts ergänzen
(`data/prompts.json` erweitern → Push → Auto-Deploy).

---

### 2. `kurse-radar/` → `kurse.abannews.com`

**Was es ist:** Vergleich von **22** KI-Weiterbildungs-/Zertifikats-Anbietern,
10 Kategorien, 4 Level. Preise/Scores stehen auf `null`, bis manuell geprüft —
ehrliche Politik („kein erfundener Score").

**Aufbau:** `data/kurse.json` → `generate.py --out dist` → 45 Dateien.

**Geldweg:** Affiliate über `affiliate.json` — **aktuell deaktiviert**. So aktivierst du:
beim Partnerprogramm des Anbieters anmelden → persönlichen Link in `affiliate.json`
unter `affiliate_url` eintragen → der Generator verlinkt automatisch (mit `rel="sponsored"`).

**Was noch fehlt:** CF-Schritt + (optional) Preise/Scores verifizieren und
Affiliate-Links eintragen, sobald Programme bestätigt sind.

---

### 3. `dropshipping-radar/` → `dropshipping.abannews.com`

**Was es ist:** Vergleich von **22** Dropshipping-/Print-on-Demand-Anbietern mit
DACH-Fokus (Filter `eu_lager` / `deutsche_oberflaeche`), 7 Kategorien.

**Aufbau:** `data/anbieter.json` → `generate.py` → 42 Dateien.

**Geldweg:** Affiliate, **deaktiviert** (`_`-Präfix in den Programm-Keys). Aktivierung
wie bei kurse-radar.

**Querverweis:** Die Root-Seite `geld-verdienen-mit-3d-druck.html` (Pretty-URLs
`/3d-druck`, `/3d`) verlinkt bereits hierher — der Traffic-Pfad steht also schon.

**Was noch fehlt:** CF-Schritt. Danach: `_redirects`-Eintrag `/dropshipping` zeigt
aktuell noch auf `geld-verdienen-mit-3d-druck.html` — prüfen, ob das nach Live-Gang
der Subdomain so gewollt bleibt.

---

### 4. `agenturen-radar/` → `agenturen.abannews.com` — **bewusst zuletzt**

**Was es ist:** Verzeichnis von KI-Dienstleistern in DACH. Startet **ehrlich leer**
(2 markierte Platzhalter) — keine erfundenen Einträge.

**Aufbau:** `data/agenturen.json` (2 Einträge) → `generate.py` → 20 Dateien.

**Geldweg:** **Bezahlte Listings** — der einzige der vier mit B2B-Verkaufslogik statt
Affiliate. Laut Marktrecherche (TIER-1 #2) ist genau das die AIO-resistente Richtung:
Premium-Placement + Pay-per-Lead schlägt Affiliate-Cents.

**Warum zuletzt:** Ein leeres Verzeichnis live zu schalten bringt wenig, bevor erste
echte Listings da sind. Sinnvoller Weg: erst 10–20 echte Agenturen aufnehmen (oder
zahlende Erst-Listings akquirieren), dann live. Code ist fertig — es wartet auf Inhalt.

---

### 5. `foerder-radar/` → `foerder.abannews.com` — **gebaut & inhaltsreich, früh live**

**Was es ist:** 86 echte DACH/EU-Förderprogramme + **3-Fragen-Förder-Matcher**
(Region · Zweck · Unternehmensgröße), clientseitiges Filtern echter Programme,
Lead-Formular mit Consent (kein Tracking).

**Aufbau:** `foerderungen.json` (86) + `leadgen.json` → `generate.py` → **126 Dateien**
(Matcher, Programm-Seiten, Themen-/Regionen-/Zielgruppen-Hubs).

**Geldweg:** **Pay-per-Lead** — `leadgen.json` ist **aktuell leer (0 Slots)**. Aktivieren:
Förder-Berater als Partner gewinnen → Slot in `leadgen.json` (als „Anzeige" markiert, UWG).
Bis dahin fängt das Mail-Fallback-Formular Leads zu `hallo@abannews.com`.

**Was fehlt:** CF-Schritt + echte Berater-Partner. Code & Inhalt sind fertig.

---

### 6. `jobs-radar/` → `jobs.abannews.com`

**Was es ist:** DACH-KI-Jobboard, gespeist via `fetch_jobs.py` (Arbeitnow + Remotive).
Premium-Listing-Feld + Newsletter-Embed-Block vorhanden.

**Aufbau:** `fetch_jobs.py` → `jobs.json` → `generate.py` → `dist`. Build-Workflow
`jobs-radar-build.yml` existiert.

**Geldweg:** Premium-Job-Listings + Newsletter-Sponsoring (`sponsors.json`).

**Was fehlt:** CF-Schritt + (optional) Auto-Backfill-Cron häufiger stellen + echte Sponsoren.

---

### 7. `handwerk-radar/` → `handwerk.abannews.com` — **erst Daten, dann live**

**Was es ist:** Wärmepumpe/Solar-Fachbetrieb-Verzeichnis. Startet **ehrlich leer**
(2 markierte Platzhalter).

**Aufbau:** `data/anbieter.json` → `generate.py` → 15 Dateien + sitemap + RSS.

**Geldweg:** Pay-per-Lead + Featured-Listings.

**Was fehlt:** **Echte Datenquelle** (Handwerkskammer/Fachverband/Selbst-Einreichung) —
der eigentliche Hebel. Erst füllen, dann CF. Wie agenturen: leeres Verzeichnis live
zu schalten bringt wenig.

---

### 8. `video-radar/` → `video.abannews.com` — **Content da, früh live möglich**

**Was es ist:** Ehrlicher Vergleich von **22** echten KI-Video-Tools (Text→Video,
KI-Avatare/Sprecher, Schnitt & Repurposing, Untertitel & Übersetzung, Bild→Video).
Stark US-lastige Nische — die EU-Hosting-Spalte und Drittland-Warnungen
(CapCut/ByteDance, Kling/Kuaishou) sind hier das ehrliche Alleinstellungsmerkmal.

**Aufbau:** `data/anbieter.json` → `generate.py` (stdlib) → 35 Dateien (Index,
Tool-Detailseiten, Kategorie-/Schwerpunkt-Seiten) + sitemap + RSS.

**Build-Werte für CF:** Build-command `cd video-radar && python generate.py`,
Output `video-radar/dist`.

**Geldweg:** Affiliate (aktuell **deaktiviert**, `_`-Präfix in `affiliate.json`).
Echte Partnerprogramme gemappt (Synthesia, HeyGen, Descript, Pictory, InVideo, Fliki,
VEED). Funnel: SEO-Seite `abannews.com/ki-videos-erstellen.html` → Radar → Newsletter.

**Was fehlt:** Nur der CF-Schritt oben. Optional danach: Affiliate-Slots freischalten,
sobald die Partnerprogramme bestätigt sind.

---

## Reihenfolge-Empfehlung

1. **prompts** (sofort, reiner Content, Newsletter-Funnel).
2. **foerder** + **jobs** (gebaut & inhaltsreich — höchster Sofort-Wert; Geldweg
   braucht nur Partner/Sponsoren, nicht mehr Code).
3. **kurse** + **dropshipping** + **video** (Content da, Affiliate später nachrüstbar).
4. **agenturen** + **handwerk** (erst echte Listings/Daten sammeln, dann live).

---

## Was bewusst NICHT zu tun ist
- Keine erfundenen Preise/Scores/Einträge (Anti-Hype-Markenversprechen).
- Affiliate-Links immer mit `rel="sponsored"` — der Generator macht das automatisch,
  also Logik nicht umgehen.
- Kein Tracking auf den Subdomains (gleiche DSGVO-Regel wie die Hauptseite).
- Affiliate-/Listing-Secrets nie ins Repo — nur öffentliche Partner-Links.

---

> Kurz: Diese Sites sind gebaut und getestet. Diese Liste ist alles, was zwischen
> „baut grün" und „erreichbar unter der eigenen Subdomain" steht — und der CF-Schritt
> liegt bei dir.
