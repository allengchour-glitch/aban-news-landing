# Inserate-Portale anbinden — legale Wege (Homegate & Co.)

Engine: `functions/_portals.mjs` (Tests `functions/_portals.test.mjs`, 33 grün).
Beliebig viele Portale per Cloudflare-Secret **`LISTING_PORTALS`** (JSON) + Legacy-Comparis-Secrets.
Alles **no-op-safe**: ohne Config ändert sich nichts.

## ⚖️ Was ist legal? (Recherche 2026-06-16)

**Kernbefund:** Es gibt **keine öffentliche „Pull"-API**, um Inserate von Homegate / ImmoScout24 /
Comparis / Anibis / Tutti / Ricardo herauszuholen. Die kursierenden „Scraper" (Apify u. a.) verstossen
gegen die Nutzungsbedingungen → **nicht legal, nicht nutzen.** Homegate, ImmoScout24, Anibis, Tutti,
Ricardo, AutoScout24 gehören alle zur **SMG Swiss Marketplace Group**; Comparis ist ein Aggregator, der
fremde Inserate **nur per Vertrag** bündelt.

Daraus folgen die legalen Optionen:

| Richtung | Portal | Legaler Weg | Was du brauchst |
|---|---|---|---|
| **Export** (aban → Portal) | **Homegate** + die meisten CH-Immobilienportale | **OpenImmo-XML** (DACH-Standard, Anbieter-Schnittstelle) | Anbieter-/Datenliefer-Vertrag + Anbieter-ID (`openimmo_anid`), Impressum, Kontaktperson, Upload-Endpoint |
| **Export** | **ImmoScout24** | eigenes Format (kein OpenImmo) | Vertrag + deren Format-Doku |
| **Export/Import** | **Comparis** (Aggregator) | Datenpartner-Vertrag | Partner-Endpoint (dann als Portal in `LISTING_PORTALS`) |
| **Import** (Portal → aban) | alle | nur mit **offiziellem Feed/API aus Vertrag** | Feed-URL vom Partnerzugang → `importUrl` |
| **Monetarisierung** | alle | **Affiliate/Deep-Links** (sofern Programm existiert) | je Portal anfragen |

➡️ **Konkret realistisch zuerst: Export der aban-Immobilien-Inserate an Homegate via OpenImmo.**
Das ist gebaut & getestet; es fehlt nur dein Homegate-Anbietervertrag + Upload-Endpoint.

## ✅ Homegate vorbereiten (OpenImmo-Export)
1. Bei Homegate / SMG einen **Anbieter-/Datenliefervertrag** abschliessen → du erhältst **Anbieter-ID**
   + Upload-Endpoint (URL, ggf. Key).
2. Diese Cloudflare-Secrets setzen:
   - `OPENIMMO_ANID` = deine Homegate-Anbieter-ID
   - `OPENIMMO_FIRMA` = „aban news" (oder Firmenname)
   - `OPENIMMO_EMAIL` = Kontakt-E-Mail fürs Objekt
3. Homegate als Portal in `LISTING_PORTALS` eintragen (siehe unten, `format: "openimmo"`).
4. Fertig: jedes **freigegebene Inserat mit `kat: "Immobilien"`** wird automatisch als OpenImmo-XML
   an Homegate gepusht (andere Kategorien werden für Homegate übersprungen).

Der XML-Generator (`toOpenImmoXml`) ist ein solides Scaffold (objektkategorie/geo/preise/freitexte/
anhaenge/verwaltung_techn/kontaktperson, Kauf-vs-Miete-Heuristik, XML-escaped). Sobald das exakte
Homegate-Mapping feststeht, erweitere ich die Felder gezielt.

## Konfiguration `LISTING_PORTALS` (Beispiel)
```json
[
  { "name": "Homegate", "feedUrl": "https://PARTNER-ENDPOINT/openimmo", "format": "openimmo",
    "categories": ["Immobilien"], "apiKey": "…" },
  { "name": "Comparis", "feedUrl": "https://PARTNER/post", "importUrl": "https://PARTNER/feed" },
  { "name": "Anibis", "importUrl": "https://PARTNER/feed" }
]
```
Felder je Portal: `name` (Pflicht), `feedUrl` (Export-Push), `importUrl` (Import-Pull, nur aus Vertrag!),
`apiKey` (Bearer, optional), `format` (`"json"` Standard | `"openimmo"`), `categories` (nur diese kat exportieren).
Legacy-Comparis (`COMPARIS_FEED_URL`/`COMPARIS_IMPORT_URL`/`COMPARIS_API_KEY`) wird automatisch mit eingereiht.

## ⚠️ Wichtig
- **Import nur mit vertraglichem Feed.** Kein Scraping fremder Portale — Rechts-/ToS-Verstoss.
- Pro Portal vor dem Scharfschalten AGB/Anbietervertrag klären.

## Quellen
- [SMG Swiss Marketplace Group — Portfolio](https://swissmarketplace.group/portfolio/real-estate/)
- [OpenImmo — XML-Standard (immobilienportale.com)](https://www.immobilienportale.com/200655-openimmo-der-xml-standard-fuer-immobilien/)
- [OpenImmo — Überblick & Portale (immoxxl.de)](https://www.immoxxl.de/blog/openimmo)
- [OpenImmo-Schnittstelle Schweiz (immoclick.ch)](https://immoclick.ch/openimmo-schnittstelle-ab-sofort-verfuegbar/)
- [Aggregator vs. Pureplay — Comparis/Homegate (McKinsey)](https://www.mckinsey.com/industries/private-capital/our-insights/unlocking-switzerlands-potential-the-rise-of-online-marketplaces)
