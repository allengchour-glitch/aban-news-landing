# KI-Musik-Radar (`musik-radar/`)

Statische Vergleichs-Site für **KI-Musik-Tools** (Song-Generierung mit Gesang,
royalty-freie Instrumental-/Funktionsmusik, Stems & Mastering, Open-Source-Modelle)
für den DACH-Raum. Affiliate-Monetarisierung. Struktur an `voice-radar/` angelehnt:
reines Python-stdlib-Generat, baut nach `dist/`, DSGVO-sicher (System-Fonts, kein
Tracking, keine 3rd-Party-Requests), Aban-Voice (anti-hype, du-Form — KI-Musik ist
hype- und rechtslastig, hier wird ehrlich verglichen).

- **Domain (geplant):** `musik.abannews.com` — Cloudflare-Projekt noch anzulegen.
- **Newsletter-CTA:** `https://abannews.com/gratis-ki-tools.html`
- **Betreiber:** Allen Chour, Belp (CH) — Rechtsseiten werden mitgeneriert.

## Bauen

```bash
cd musik-radar
python3 generate.py            # -> dist/
```

Keine externen Abhängigkeiten (nur Python-stdlib). `dist/` ist gitignored.

## Erzeugte Seiten

- `index.html` — Startseite (Vergleichstabelle mit EU-Hosting-Spalte + Karten + Client-Side-Suche)
- `anbieter/<id>.html` — eine Detailseite je Tool (SoftwareApplication-JSON-LD, FAQ, Breadcrumb)
- `kategorie/<slug>.html` — Seiten je Typ (Song-Generierung, Instrumental & Royalty-Free, Stems & Mastering, Open Source, Funktionsmusik)
- `fokus/<slug>.html` — Seiten je Schwerpunkt
- `impressum.html`, `datenschutz.html`, `404.html`, `sitemap.xml`, `robots.txt`, `feed.xml`, `favicon.svg`, `search.js`

JSON-LD: `SoftwareApplication`, `BreadcrumbList`, `ItemList`, `FAQPage`, plus `WebSite` + `Organization`.

## Daten

### `data/anbieter.json`
Kuratierte Liste **echter** KI-Musik-Tools (Suno, Udio, ElevenLabs Music, Stable Audio,
Soundraw, Mubert, AIVA, Loudly, Soundful, Beatoven.ai, Boomy, Meta MusicGen/AudioCraft,
Riffusion, Google MusicFX, LANDR, Moises, LALAL.AI, Endel).

**Daten-Integrität:** Preise (`preis_eur`) und Bewertungen (`worth_it_score`) werden **nicht
erfunden** — `null` bzw. `"[Redaktion: prüfen]"`, bis ein Mensch sie verifiziert. Kein
`offers`/`review`-JSON-LD für ungeprüfte Felder.

**Lizenz-Hinweis (wichtig in dieser Nische):** Bei KI-Musik ist die kommerzielle Nutzung
heikel — wem die Rechte gehören, ob Tracks royalty-frei sind und ob du sie monetarisieren
darfst, hängt stark vom Tool und Tarif ab. Jeder Eintrag trägt im `aban_note` einen
Lizenz-Caveat. Vor kommerzieller Nutzung immer die aktuellen AGB des Anbieters prüfen.

DACH-Filter: `eu_lager` = EU-/DSGVO-Hosting, `deutsche_oberflaeche` = deutsche Oberfläche.
**Diese Nische ist stark US-lastig** — EU-nähere Anbieter (AIVA/Luxemburg, Loudly/Berlin)
sortieren nach vorn. Open-Source-Modelle (MusicGen, Riffusion) sind selbst-hostbar markiert.

### `affiliate.json`
Mapping `Anbieter-id -> affiliate_url`, wie `voice-radar/affiliate.json`. **Alle Slots
deaktiviert** (`_`-Präfix). Zum Aktivieren: Link bei `affiliate_url` eintragen und führendes
`_` entfernen. `_programme` listet echte Partnerprogramme (Soundraw, AIVA, Mubert, LANDR,
Loudly, Soundful, LALAL.AI).

## Pflege

- Neues Tool: Objekt in `data/anbieter.json` → `anbieter[]` (offizielle URL Pflicht;
  Preis/Score `null` lassen) und `generate.py` laufen lassen.
- Deployment: Cloudflare Pages, Output = `dist/`, kein Build-Command nötig.
