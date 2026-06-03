# KI-Voice- & Transkriptions-Radar (`voice-radar/`)

Statische Vergleichs-Site für **KI-Voice- & Transkriptions-Tools** (Meeting-Transkription,
Untertitel/SRT, deutsche Spracherkennung, Text-to-Speech) für den DACH-Raum.
Affiliate-Monetarisierung. Struktur an `newsletter-radar/` / `dropshipping-radar/`
angelehnt: reines Python-stdlib-Generat, baut nach `dist/`, DSGVO-sicher (System-Fonts,
kein Tracking, keine 3rd-Party-Requests), Aban-Voice (anti-hype, du-Form — Voice-KI ist
hype-lastig, hier wird ehrlich verglichen).

- **Domain (geplant):** `voice.abannews.com` — Cloudflare-Projekt noch anzulegen.
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **Betreiber:** Alleng Chour, Belp (CH) — Rechtsseiten werden mitgeneriert.

## Bauen

```bash
cd voice-radar
python3 generate.py            # -> dist/
python3 generate.py --out /tmp/preview --data data/anbieter.json --affiliate affiliate.json
```

Keine externen Abhängigkeiten (nur Python-stdlib). `dist/` ist gitignored und wird
bei jedem Lauf neu erzeugt.

## Erzeugte Seiten

- `index.html` — Startseite (Vergleichstabelle mit EU-Hosting-Spalte + Karten + Client-Side-Suche)
- `anbieter/<id>.html` — eine Detailseite je Tool (SoftwareApplication-JSON-LD, FAQ, Breadcrumb)
- `kategorie/<slug>.html` — Seiten je Tool-Typ (Meeting-Transkription, Transkription & Untertitel, Spracherkennung / API, Text-to-Speech, Audio-/Video-Editor)
- `fokus/<slug>.html` — Seiten je Schwerpunkt (EU-Hosting / DSGVO, International, Meeting-Notizen, Untertitel & Medien, Entwickler / API, Stimmen / Synthese)
- `impressum.html`, `datenschutz.html`, `404.html`
- `sitemap.xml`, `robots.txt` (KI-Crawler erlaubt), `feed.xml` (RSS), `favicon.svg`, `search.js`

JSON-LD: `SoftwareApplication`, `BreadcrumbList`, `ItemList`, `FAQPage`, plus
`WebSite` + `Organization` auf der Startseite. Jede Seite hat `canonical`, OG-Tags,
`lang="de"` und hreflang (de / x-default).

## Daten

### `data/anbieter.json`
Kuratierte Liste **echter** KI-Voice-/Transkriptions-Tools (Amberscript, Happy Scribe,
Noota, aTrain, Speechmatics, Krisp, Otter.ai, Fireflies.ai, tl;dv, Fathom, Sembly,
Supernormal, Descript, Trint, Sonix, Rev, Deepgram, AssemblyAI, OpenAI Whisper,
ElevenLabs, Murf, Play.ht).

**Daten-Integrität (wichtig):** Preise (`preis_eur`) und Bewertungen
(`worth_it_score`) werden **nicht erfunden**. Sie stehen auf `null` oder tragen den
Marker `"[Redaktion: prüfen]"`, bis ein Mensch sie verifiziert. Der Generator zeigt
unbewertete Tools als „noch nicht geprüft“ / „–/10“ und gibt für `null`-Felder
**kein** `offers`/`review`-JSON-LD aus (keine Fake-SEO-Signale). Der interne Marker
`[Redaktion: prüfen]` wird in Besucher-Texten automatisch ausgeblendet. Jeder Eintrag
verweist auf eine offizielle, verifizierbare Anbieter-URL.

DACH-Filter: Die booleschen Felder `eu_lager` und `deutsche_oberflaeche` sind das
eigentliche Unterscheidungsmerkmal für den DACH-Raum. Hier:
**`eu_lager` = EU-/DSGVO-Hosting**, **`deutsche_oberflaeche` = deutsche Spracherkennung/Oberfläche**
(DSGVO-näher, EU-Datenverarbeitung, weniger Drittland-Aufwand beim Audio-Upload). Die
JSON-Feldnamen bleiben unverändert (gleicher Generator wie newsletter-radar); nur die
UI-Labels sind angepasst. Der Generator sortiert EU-Hosting-Anbieter nach vorn und
zeigt sie als farbige Badges.

Feldschema je Anbieter: `id`, `name`, `anbieter`, `url`, `sprache[]`, `fokus`,
`kategorie[]`, `themen[]`, `format`, `integration[]`, `deutsche_oberflaeche`,
`eu_lager`, `preis_eur`, `preis_hinweis`, `worth_it_score`, `aban_note`.

### `affiliate.json`
Mapping `Anbieter-id -> affiliate_url`, aufgebaut wie `newsletter-radar/affiliate.json`.
**Alle Slots sind aktuell deaktiviert** (Key mit `_`-Präfix), da noch keine
Affiliate-Links freigegeben sind. Solange ein Key mit `_` beginnt, ignoriert der
Generator ihn und verlinkt auf die offizielle Anbieter-URL aus `anbieter.json`
(kein `*`, keine Provision). Zum Aktivieren: persönlichen Link bei `affiliate_url`
eintragen und das führende `_` im Key entfernen. `_programme` listet echte
Partnerprogramm-Signup-URLs der Anbieter (Otter.ai, Fireflies.ai, Descript,
ElevenLabs, Murf, Happy Scribe, tl;dv, Sonix). Fallback/Kontakt:
`mailto:hallo@abannews.com`.

## Pflege

- Neuen Anbieter ergänzen: Objekt in `data/anbieter.json` → `anbieter[]` einfügen
  (offizielle URL Pflicht; Preis/Score auf `null` lassen, bis verifiziert) und
  `generate.py` laufen lassen.
- Neue Kategorie/Schwerpunkt: in `kategorien` / `fokus` ergänzen — Seiten entstehen
  automatisch aus den in den Anbietern referenzierten Werten.
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command nötig.
