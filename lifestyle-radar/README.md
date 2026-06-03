# KI-Lifestyle-Radar (`lifestyle-radar/`)

Statische Vergleichs-Site für **KI-Apps im Alltag & Lifestyle** (Fitness & Sport,
Ernährung & Kochen, Sprachenlernen, Reise & Outdoor, private Finanzen, mentale
Gesundheit & Gewohnheiten) für den DACH-Raum. Affiliate-Monetarisierung (deaktiviert).
Struktur an `video-radar/` angelehnt: reines Python-stdlib-Generat, baut nach `dist/`,
DSGVO-sicher (System-Fonts, kein Tracking, keine 3rd-Party-Requests), Aban-Voice
(anti-hype, du-Form — Lifestyle-KI ist hype- und datenlastig, hier wird nüchtern eingeordnet).

- **Domain (geplant):** `lifestyle.abannews.com` — Cloudflare-Projekt noch anzulegen.
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **SEO-Eingang:** `abannews.com/ki-lifestyle.html` verlinkt hierher.
- **Betreiber:** Alleng Chour, Belp (CH) — Rechtsseiten werden mitgeneriert.

## Bauen

```bash
cd lifestyle-radar
python3 generate.py            # -> dist/
```

Keine externen Abhängigkeiten (nur Python-stdlib). `dist/` ist gitignored.

## Erzeugte Seiten

- `index.html` — Startseite (Vergleichstabelle mit EU-Hosting-Spalte + Karten + Client-Side-Suche)
- `anbieter/<id>.html` — eine Detailseite je App (SoftwareApplication-JSON-LD, FAQ, Breadcrumb)
- `kategorie/<slug>.html` — Seiten je Bereich (Fitness, Ernährung, Sprache, Reise, Finanzen, Mentales)
- `fokus/<slug>.html` — Seiten je Schwerpunkt
- `impressum.html`, `datenschutz.html`, `404.html`, `sitemap.xml`, `robots.txt`, `feed.xml`, `_headers`, `favicon.svg`, `search.js`

JSON-LD: `SoftwareApplication`, `BreadcrumbList`, `ItemList`, `FAQPage`, plus `WebSite` + `Organization`.

## Daten

### `data/anbieter.json`
Kuratierte Liste **echter** KI-Lifestyle-Apps (Freeletics, Fitbod, WHOOP, Oura, YAZIO,
Lifesum, MyFitnessPal, Babbel, Duolingo, Speak, Finanzguru, Cleo, komoot, Mindtrip,
Wysa, Headspace, Replika, Rosebud).

**Daten-Integrität:** Preise (`preis_eur`) und Bewertungen (`worth_it_score`) werden **nicht
erfunden** — `null` bzw. `"[Redaktion: prüfen]"`, bis ein Mensch sie verifiziert. Kein
`offers`/`review`-JSON-LD für ungeprüfte Felder.

DACH-Filter: `eu_lager` = EU-/DSGVO-Hosting (bewusst meist `null`, weil das Hosting der
wenigsten Apps öffentlich belegt ist — wir behaupten es nicht), `deutsche_oberflaeche` =
nachweislich deutsche Oberfläche. EU-Firmensitze (Freeletics/München, YAZIO/Erfurt,
Babbel/Berlin, Finanzguru/Frankfurt, Lifesum/Stockholm, Oura/Finnland) stehen als
verifizierbare Tatsache im `aban_note`.

**Ehrlicher Schwerpunkt:** Diese Apps verarbeiten oft sehr persönliche Daten (Gesundheit,
Ernährung, Standort, Finanzen). Jeder `aban_note` ordnet das ein — inkl. Warnungen
(z. B. Replika: Datenschutz-Maßnahmen der ital. Behörde; Mental-Health-Apps: kein
Therapie-Ersatz; Finanz-Apps: keine Anlageberatung).

### `affiliate.json`
Mapping `Anbieter-id -> affiliate_url`. **Alle Slots deaktiviert** (`_`-Präfix). Zum
Aktivieren: persönlichen Link bei `affiliate_url` eintragen und führendes `_` entfernen.
Nie Secrets committen.

## Pflege

- Neue App: Objekt in `data/anbieter.json` → `anbieter[]` (offizielle URL Pflicht;
  Preis/Score `null` lassen) und `generate.py` laufen lassen.
- Deployment: Cloudflare **Pages**, Output = `lifestyle-radar/dist`, Build
  `cd lifestyle-radar && python generate.py`.
