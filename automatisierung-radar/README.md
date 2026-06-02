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
