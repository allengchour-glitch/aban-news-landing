# KI-Tools-Verzeichnis (`ki-verzeichnis/`)

Das **Dach-Verzeichnis**: aggregiert alle aban-Radar-Datensätze + `data/tools.json` zu
**einer** durchsuchbaren KI-Tools-Authority-Site für den DACH-Raum. Es erfindet keine
Daten — es bündelt die bereits kuratierten Radars und **verlinkt zu jedem Fach-Radar
zurück** (Cross-Linking stärkt das ganze Netzwerk).

- **Domain (geplant):** `tools.abannews.com` — Cloudflare-Projekt noch anzulegen.
- **Quellen:** `automatisierung-/video-/musik-/voice-/chatbot-/buchhaltung-/newsletter-/dropshipping-radar`
  (je `data/anbieter.json`) + `data/tools.json` (breiter Katalog).
  `handwerk-radar` ist **bewusst ausgeschlossen** (listet Betriebe, keine KI-Tools).
- Reines Python-stdlib-Generat → `dist/`, DSGVO-sicher (System-Fonts, kein Tracking,
  keine 3rd-Party-Requests), Aban-Voice (anti-hype, du-Form).

## Bauen

```bash
cd ki-verzeichnis
python3 generate.py            # -> dist/
```

Liest die Radar-Daten relativ aus dem Repo-Root. Keine externen Abhängigkeiten. `dist/` ist gitignored.

## Was erzeugt wird

- `index.html` — Startseite: Bereich-Kacheln + Live-Suche + Filter (Alle / Nur EU-Hosting / je Bereich)
- `tool/<slug>.html` — eine Detailseite je Tool (SoftwareApplication-JSON-LD, Liste der Bereiche,
  **Deep-Link zum jeweiligen Fach-Radar**, offizieller Anbieter-Link)
- `bereich/<slug>.html` — eine Seite je Bereich (ItemList-JSON-LD, Link zum Fach-Radar)
- `impressum.html`, `datenschutz.html`, `404.html`, `sitemap.xml`, `robots.txt`, `feed.xml`,
  `favicon.svg`, `_headers` (Security/CSP, Inline-Script für Suche/Theme erlaubt)

JSON-LD: `WebSite`, `Organization`, `CollectionPage`, `ItemList`, `BreadcrumbList`, `SoftwareApplication`.

## Daten-Integrität

- **Dedup nach Name** (`norm_name`): erscheint ein Tool in mehreren Radars, wird es **einmal**
  gelistet und allen passenden Bereichen zugeordnet.
- **Preise und Wertungen werden hier NICHT angezeigt/erfunden** — sie bleiben im jeweiligen
  Fach-Radar, wo sie verifiziert sind. Das Verzeichnis zeigt nur: Name, Bereich(e), EU-Hosting-
  Flag, Wertung (falls im Radar gesetzt), offizieller Link.
- `eu_lager` wird aus den Radar-Daten übernommen; bei `data/tools.json`-Tools ist es `?`
  (unbekannt, ehrlich so markiert). Sortierung: EU-Hosting zuerst.

## Pflege

- **Automatisch:** Der Workflow `.github/workflows/ki-verzeichnis-build.yml` baut neu, sobald
  sich `ki-verzeichnis/**`, ein `*-radar/data/anbieter.json` oder `data/tools.json` ändert.
  Das Verzeichnis wächst also mit jedem Radar-Update von selbst mit.
- Neuen Radar aufnehmen: Eintrag in `BEREICHE` in `generate.py` ergänzen (Slug, Label, Domain, Icon).
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command nötig.
