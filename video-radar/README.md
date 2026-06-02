# KI-Video-Radar (`video-radar/`)

Statische Vergleichs-Site für **KI-Video-Tools** (Text→Video, KI-Avatare/Sprecher,
Video-Schnitt & Repurposing, Untertitel & Übersetzung, Bild→Video) für den DACH-Raum.
Affiliate-Monetarisierung. Struktur an `voice-radar/` angelehnt: reines Python-stdlib-Generat,
baut nach `dist/`, DSGVO-sicher (System-Fonts, kein Tracking, keine 3rd-Party-Requests),
Aban-Voice (anti-hype, du-Form — KI-Video ist hype-lastig, hier wird ehrlich verglichen).

- **Domain (geplant):** `video.abannews.com` — Cloudflare-Projekt noch anzulegen.
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **Betreiber:** Alleng Chour, Belp (CH) — Rechtsseiten werden mitgeneriert.

## Bauen

```bash
cd video-radar
python3 generate.py            # -> dist/
```

Keine externen Abhängigkeiten (nur Python-stdlib). `dist/` ist gitignored.

## Erzeugte Seiten

- `index.html` — Startseite (Vergleichstabelle mit EU-Hosting-Spalte + Karten + Client-Side-Suche)
- `anbieter/<id>.html` — eine Detailseite je Tool (SoftwareApplication-JSON-LD, FAQ, Breadcrumb)
- `kategorie/<slug>.html` — Seiten je Typ (Text→Video, KI-Avatare & Sprecher, Video-Schnitt & Repurposing, Untertitel & Übersetzung, Bild→Video / Animation)
- `fokus/<slug>.html` — Seiten je Schwerpunkt
- `impressum.html`, `datenschutz.html`, `404.html`, `sitemap.xml`, `robots.txt`, `feed.xml`, `favicon.svg`, `search.js`

JSON-LD: `SoftwareApplication`, `BreadcrumbList`, `ItemList`, `FAQPage`, plus `WebSite` + `Organization`.

## Daten

### `data/anbieter.json`
Kuratierte Liste **echter** KI-Video-Tools (Runway, Pika, Luma, Kling, Sora, Google Veo,
Synthesia, HeyGen, D-ID, Colossyan, Descript, CapCut, OpusClip, VEED, Submagic, Pictory,
InVideo, Fliki, Kapwing, Adobe Firefly, Topaz Video AI, Elai).

**Daten-Integrität:** Preise (`preis_eur`) und Bewertungen (`worth_it_score`) werden **nicht
erfunden** — `null` bzw. `"[Redaktion: prüfen]"`, bis ein Mensch sie verifiziert. Kein
`offers`/`review`-JSON-LD für ungeprüfte Felder.

DACH-Filter: `eu_lager` = EU-/DSGVO-Hosting, `deutsche_oberflaeche` = deutsche Oberfläche/Stimmen.
**Diese Nische ist stark US-lastig** — die meisten Tools stehen ehrlich auf „EU-Hosting: nein/—".
EU-nähere Anbieter (z. B. Submagic/FR, Elai/EE, Synthesia·VEED·Colossyan/UK) sortieren nach vorn.
Tools wie CapCut/Kling (ByteDance/Kuaishou) sind im `aban_note` mit Drittland-Warnung markiert.

### `affiliate.json`
Mapping `Anbieter-id -> affiliate_url`, wie `voice-radar/affiliate.json`. **Alle Slots
deaktiviert** (`_`-Präfix). Zum Aktivieren: Link bei `affiliate_url` eintragen und führendes
`_` entfernen. `_programme` listet echte Partnerprogramme (Synthesia, HeyGen, Descript,
Pictory, InVideo, Fliki, VEED).

## Pflege

- Neues Tool: Objekt in `data/anbieter.json` → `anbieter[]` (offizielle URL Pflicht;
  Preis/Score `null` lassen) und `generate.py` laufen lassen.
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command nötig.
