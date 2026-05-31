# KI-Weiterbildungs-Radar (`kurse-radar/`)

Statische Vergleichs-Site für **KI-Kurse, Zertifikate und Lernpfade** für den
DACH-Raum. Affiliate-Monetarisierung. Struktur an `ki-tools-radar/` angelehnt:
reines Python-stdlib-Generat, baut nach `dist/`, DSGVO-sicher (System-Fonts,
kein Tracking, keine 3rd-Party-Requests), Aban-Voice (anti-hype, du-Form).

- **Domain (geplant):** `kurse.abannews.com`
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **Betreiber:** Alleng Chour, Belp (CH) — Rechtsseiten werden mitgeneriert.

## Bauen

```bash
cd kurse-radar
python3 generate.py            # -> dist/
python3 generate.py --out /tmp/preview --data data/kurse.json --affiliate affiliate.json
```

Keine externen Abhängigkeiten (nur Python-stdlib). `dist/` ist gitignored
(siehe `.gitignore`) und wird bei jedem Lauf neu erzeugt.

## Erzeugte Seiten

- `index.html` — Startseite (Vergleichstabelle + Karten + Client-Side-Suche)
- `kurs/<id>.html` — eine Detailseite je Kurs (Course-JSON-LD, FAQ, Breadcrumb)
- `thema/<slug>.html` — Kategorie-/Themen-Seiten
- `niveau/<slug>.html` — Seiten nach Niveau (Einsteiger … Profi)
- `impressum.html`, `datenschutz.html`, `404.html`
- `sitemap.xml`, `robots.txt` (KI-Crawler erlaubt), `feed.xml` (RSS), `favicon.svg`, `search.js`

JSON-LD: `Course`, `BreadcrumbList`, `ItemList`, `FAQPage`, plus `WebSite` +
`Organization` auf der Startseite. Jede Seite hat `canonical`, OG-Tags, `lang="de"`
und hreflang (de / x-default).

## Daten

### `data/kurse.json`
Kuratierte Liste **echter** KI-Kurs-Anbieter (DeepLearning.AI, fast.ai, Coursera,
DataCamp, Udemy, LinkedIn Learning, openHPI, Google/Google Cloud, Microsoft Learn,
IBM, Hugging Face, edX/Harvard, Anthropic, Udacity, Elements of AI).

**Daten-Integrität (wichtig):** Preise (`preis_eur`) und Bewertungen
(`worth_it_score`) werden **nicht erfunden**. Sie stehen auf `null` oder tragen den
Marker `"[Redaktion: prüfen]"`, bis ein Mensch sie verifiziert. Der Generator
zeigt unbewertete Kurse als „noch nicht geprüft“ / „–/10“ und gibt für `null`-Felder
**kein** `offers`/`review`-JSON-LD aus (keine Fake-SEO-Signale). Der interne Marker
`[Redaktion: prüfen]` wird in Besucher-Texten automatisch ausgeblendet. Jeder Eintrag
verweist auf eine offizielle, verifizierbare Anbieter-URL.

Feldschema je Kurs: `id`, `name`, `anbieter`, `url`, `sprache[]`, `level`,
`kategorie[]`, `themen[]`, `format`, `zertifikat`, `preis_eur`, `preis_hinweis`,
`worth_it_score`, `aban_note`.

### `affiliate.json`
Mapping `Kurs-id -> affiliate_url`, aufgebaut wie `ki-tools-radar/affiliate.json`.
**Alle Slots sind aktuell deaktiviert** (Key mit `_`-Präfix), da noch keine
Affiliate-Links freigegeben sind. Solange ein Key mit `_` beginnt, ignoriert der
Generator ihn und verlinkt auf die offizielle Anbieter-URL aus `kurse.json`
(kein `*`, keine Provision). Zum Aktivieren: persönlichen Link bei `affiliate_url`
eintragen und das führende `_` im Key entfernen. Fallback/Kontakt:
`mailto:hallo@abannews.com`.

## Pflege

- Neuen Kurs ergänzen: Objekt in `data/kurse.json` → `kurse[]` einfügen (offizielle
  URL Pflicht; Preis/Score auf `null` lassen, bis verifiziert) und `generate.py` laufen lassen.
- Neue Kategorie/Niveau: in `kategorien` / `level` ergänzen — Seiten entstehen automatisch
  aus den in den Kursen referenzierten Werten.
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command nötig.
