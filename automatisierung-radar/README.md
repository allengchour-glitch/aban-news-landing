# Automatisierungs-Radar (`automatisierung-radar/`)

Statische Vergleichs-Site für **KI- & Workflow-Automatisierungs-Tools** (No-Code-Automatisierung,
iPaaS / App-Integration, KI-Agenten, RPA, Prozess-Orchestrierung) für den DACH-Raum.
Affiliate-Monetarisierung. Struktur an `voice-radar/` / `newsletter-radar/` angelehnt: reines
Python-stdlib-Generat, baut nach `dist/`, DSGVO-sicher (System-Fonts, kein Tracking, keine
3rd-Party-Requests), Aban-Voice (anti-hype, du-Form — Automatisierung ist hype-lastig, hier
wird ehrlich verglichen).

- **Domain (geplant):** `automatisierung.abannews.com` — Cloudflare-Projekt noch anzulegen.
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **Betreiber:** Alleng Chour, Belp (CH) — Rechtsseiten werden mitgeneriert.

## Bauen

```bash
cd automatisierung-radar
python3 generate.py            # -> dist/
python3 generate.py --out /tmp/preview --data data/anbieter.json --affiliate affiliate.json
```

Keine externen Abhängigkeiten (nur Python-stdlib). `dist/` ist gitignored und wird
bei jedem Lauf neu erzeugt.

## Erzeugte Seiten

- `index.html` — Startseite mit:
  - **Entscheidungshilfe** „Welches Tool für welche Aufgabe?“ (kuratiertes Situation→Tool-Mapping, `DECISIONS` in `generate.py`)
  - **Vergleichstabelle** (Spalten: Tool, Typ, EU-Hosting, Deutsche Oberfläche, Preismodell)
  - **Interaktive Filter** (Client-Side, kein Tracking): Kategorie-Buttons + EU-Hosting-Toggle, kombiniert mit der Live-Suche (`search.js`)
- `automatisierungs-tools-auswaehlen.html` — **SEO-Ratgeber** (Cornerstone): 5-Schritte-Leitfaden + FAQ, `Article`- + `FAQPage`-JSON-LD, interne Links auf Tools/Kategorien
- `anbieter/<id>.html` — eine Detailseite je Tool (SoftwareApplication-JSON-LD, FAQ, Breadcrumb, Preismodell, direkte Vergleichs-Links)
- `vergleich/<a>-vs-<b>.html` — **automatische Vergleichsseiten** „Tool A vs. Tool B“ für jedes Paar mit ≥1 gemeinsamer Kategorie (echte Daten nebeneinander + datengetriebene „Wann welches?“-Einordnung + FAQPage-JSON-LD). Wächst automatisch mit jedem neuen Tool.
- `fuer/<slug>.html` — **Anwendungsfall-Seiten** („Beste Automatisierungs-Tools für Onlineshops / Steuerberater / Agenturen …“), kuratiertes `USE_CASES`-Mapping aus echten Tools
- `kategorie/<slug>.html` — Seiten je Tool-Typ (Workflow-Automatisierung (No-Code), iPaaS / App-Integration, KI-Agenten & KI-Automatisierung, RPA, Browser-Automatisierung, Prozess-Orchestrierung / BPM)
- `fokus/<slug>.html` — Seiten je Schwerpunkt (EU-Hosting / DSGVO, Self-Hosting / Open Source, Enterprise / RPA, KI-Agenten, International)
- `impressum.html`, `datenschutz.html`, `404.html`
- `sitemap.xml`, `robots.txt` (KI-Crawler erlaubt), `feed.xml` (RSS), `favicon.svg`, `search.js`

JSON-LD: `SoftwareApplication`, `BreadcrumbList`, `ItemList`, `FAQPage`, `Article` (Ratgeber),
plus `WebSite` + `Organization` auf der Startseite. Jede Seite hat `canonical`, OG-Tags,
`lang="de"` und hreflang (de / x-default).

## Daten

### `data/anbieter.json`
Kuratierte Liste **echter** KI- & Workflow-Automatisierungs-Tools (n8n, Make, Zapier,
Microsoft Power Automate, Locoia, Camunda, BRYTER, SeaTable, Activepieces, Pipedream,
Workato, Tray.ai, UiPath, Automation Anywhere, IFTTT, Bardeen, Gumloop, Lindy,
Relay.app, Parabola, Albato, Latenode).

**Daten-Integrität (wichtig):** Preise (`preis_eur`) und Bewertungen
(`worth_it_score`) werden **nicht erfunden**. Sie stehen auf `null` oder tragen den
Marker `"[Redaktion: prüfen]"`, bis ein Mensch sie verifiziert. Der Generator zeigt
unbewertete Tools als „noch nicht geprüft“ / „–/10“ und gibt für `null`-Felder
**kein** `offers`/`review`-JSON-LD aus (keine Fake-SEO-Signale). Der interne Marker
`[Redaktion: prüfen]` wird in Besucher-Texten automatisch ausgeblendet. Jeder Eintrag
verweist auf eine offizielle, verifizierbare Anbieter-URL.

DACH-Filter: Die booleschen Felder `eu_lager` und `deutsche_oberflaeche` sind das
eigentliche Unterscheidungsmerkmal für den DACH-Raum. Hier:
**`eu_lager` = EU-/DSGVO-Hosting**, **`deutsche_oberflaeche` = deutsche Bedienoberfläche/Support**
(DSGVO-näher, EU-Datenverarbeitung, weniger Drittland-Aufwand, wenn personenbezogene Daten
durch die Workflows laufen). Die JSON-Feldnamen bleiben unverändert (gleicher Generator wie
voice-radar); nur die UI-Labels sind angepasst. Der Generator sortiert EU-Hosting-Anbieter
nach vorn und zeigt sie als farbige Badges.

Feldschema je Anbieter: `id`, `name`, `anbieter`, `url`, `sprache[]`, `fokus`,
`kategorie[]`, `themen[]`, `format`, `integration[]`, `deutsche_oberflaeche`,
`eu_lager`, `preis_eur`, `preis_hinweis`, `preismodell`, `worth_it_score`, `aban_note`.

`preismodell` = Abrechnungsmodell (z. B. „pro Task“, „pro Operation“, „nach Laufzeit“,
„Credits“, „auf Anfrage“, „Self-Hosting / Abo“). Das ist öffentlich bekannte Anbieter-Info,
**kein** geschätzter Preis — `preis_eur`/`worth_it_score` bleiben unangetastet `null`.

### `affiliate.json`
Mapping `Anbieter-id -> affiliate_url`, aufgebaut wie `voice-radar/affiliate.json`.
**Alle Slots sind aktuell deaktiviert** (Key mit `_`-Präfix), da noch keine
Affiliate-Links freigegeben sind. Solange ein Key mit `_` beginnt, ignoriert der
Generator ihn und verlinkt auf die offizielle Anbieter-URL aus `anbieter.json`
(kein `*`, keine Provision). Zum Aktivieren: persönlichen Link bei `affiliate_url`
eintragen und das führende `_` im Key entfernen. `_programme` listet echte
Partnerprogramm-Signup-URLs der Anbieter (Make, Zapier, SeaTable, UiPath, Bardeen).
Fallback/Kontakt: `mailto:hallo@abannews.com`.

## Wachstum „von selbst"

Der Radar wächst datengetrieben — **ohne erfundene Inhalte**:

1. **Programmatische Vergleichsseiten.** Aus jedem Tool-Paar mit gemeinsamer Kategorie
   entsteht automatisch eine `vergleich/<a>-vs-<b>.html`. Aus 22 Tools werden so 154
   Long-Tail-Seiten; jedes neue Tool erzeugt automatisch weitere.
2. **Anwendungsfall-Seiten.** `USE_CASES` in `generate.py` mappt Branchen/Einsatzzwecke
   auf reale Tools → je eine SEO-Seite unter `/fuer/<slug>`.
3. **Auto-Aktualisierung (Cron).** `.github/workflows/automatisierung-radar-build.yml`
   läuft wöchentlich (`schedule`), baut neu und deployt (mit CF-Secret) — frisches
   `sitemap`-`lastmod` / RSS, und neue Tools/Seiten gehen automatisch live, sobald sie
   in `data/anbieter.json` stehen.
4. **Tool-Vorschläge (Mensch prüft).** `suggest_tools.py` hält eine Backlog **echter,
   bekannter** Tools und schreibt für die noch fehlenden fertige Stubs nach
   `data/_vorschlaege.json` (gitignored) — alle wertenden Felder `null` /
   `"[Redaktion: prüfen]"`. `.github/workflows/automatisierung-radar-suggest.yml` läuft
   wöchentlich und legt die Liste als Artefakt ab. Ablauf: prüfen → offene Felder
   ausfüllen → Eintrag nach `anbieter.json` verschieben → `generate.py`. **Erst dann
   wird ein Tool live** — Preise/Bewertungen werden nie geschätzt.

   ```bash
   python3 suggest_tools.py            # -> data/_vorschlaege.json
   python3 suggest_tools.py --check    # Exit 1, wenn neue Kandidaten offen sind (CI)
   ```

## KI-Funktionen (Claude API)

Vier KI-Funktionen, die wie ein Redaktions-Assistent mitdenken — alle über das
Anthropic-SDK / die Claude-API, alle nach derselben Regel: **die KI erfindet nichts.**
Sie liefert Entwürfe und Prüf-Fragen; ein Mensch verifiziert und schaltet live.

**Offline-CLI** `ai/ki_helfer.py` (Modell `claude-opus-4-8`, gecachter Aban-Voice-Präfix):

```bash
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# 1) Recherche-Assistent: Faktenfelder für ein reales Tool entwerfen
python3 ai/ki_helfer.py recherche --name "Nintex" --url https://www.nintex.com/ --add

# 2) Content-Generator: Bausteine in Aban-Voice aus den echten Daten
python3 ai/ki_helfer.py content --typ newsletter
python3 ai/ki_helfer.py content --typ tool-des-monats --id n8n
python3 ai/ki_helfer.py content --typ social

# 3) Daten-Wächter: Prüf-Checkliste (Fragen, keine Behauptungen) -> data/_audit.json
python3 ai/ki_helfer.py audit
```

Recherche/Content/Audit erzeugen Entwürfe mit `[Redaktion: prüfen]`; `preis_eur` und
`worth_it_score` bleiben immer `null`. Generierten Marketing-Text vor dem Posten gegen
die Aban-Sperrliste prüfen (`tools/brand-voice-linter.py … --strict`).

**4) Frage-Assistent auf der Website** — `/fragen.html` + Edge-Function
`functions/api/ask.js` (von `generate.py` nach `dist/` gebaut). Beantwortet
„Welches Tool für X?" **nur aus den gelisteten echten Tools**, mit Blick auf
EU-Hosting; nennt keine erfundenen Preise. Server-seitig über Cloudflare Pages
Functions, Modell `claude-haiku-4-5` (schnell + günstig). **Ohne gesetzten
`ANTHROPIC_API_KEY` antwortet die Function mit einem freundlichen Fallback** (kein
Hard-Fail). Zum Aktivieren den Key als Umgebungs-Variable/Secret im Cloudflare-Pages-
Projekt `automatisierung` hinterlegen.

Automatisierte KI-Workflows: `.github/workflows/automatisierung-radar-audit.yml`
(wöchentlicher Daten-Wächter, Artefakt; nur mit Secret, sonst übersprungen).

## Pflege

- Neuen Anbieter ergänzen: Objekt in `data/anbieter.json` → `anbieter[]` einfügen
  (offizielle URL Pflicht; Preis/Score auf `null` lassen, bis verifiziert) und
  `generate.py` laufen lassen. Tool-Seite, alle zugehörigen Vergleichsseiten,
  passende Kategorie-/Schwerpunkt-/Anwendungsfall-Seiten und die Sitemap entstehen
  automatisch.
- Neue Kategorie/Schwerpunkt: in `kategorien` / `fokus` ergänzen — Seiten entstehen
  automatisch aus den in den Anbietern referenzierten Werten.
- Neuen Anwendungsfall: Eintrag in `USE_CASES` (`generate.py`) ergänzen.
- Vorschlags-Backlog pflegen: `BACKLOG` in `suggest_tools.py` um reale Tools erweitern.
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command nötig.
