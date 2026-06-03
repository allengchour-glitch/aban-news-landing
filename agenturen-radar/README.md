# agenturen-radar — KI-Dienstleister-Verzeichnis DACH

Statisches Verzeichnis für KI-Agenturen und -Freelancer im DACH-Raum (DE/AT/CH).

**Geschäftsmodell:** Sichtbarkeit verkaufen. Kostenloser Basis-Eintrag vs. bezahltes
Featured-Listing — kein Affiliate, keine Bewertungen. Im Mittelpunkt steht der Funnel
„Eintrag einreichen / Listing buchen".

- **Domain:** `agenturen.abannews.com`
- **Kontakt/Funnel:** mailto an `hallo@abannews.com` (Adresse aus dem Aban-News-Impressum)
- **Stack:** reines Python (stdlib), kein Build-Step, keine externen Abhängigkeiten,
  System-Fonts, kein Tracking (DSGVO).

## Bauen

```bash
python3 generate.py            # baut nach dist/
python3 generate.py --out /tmp/x --data data/agenturen.json
```

Der Generator läuft fehlerfrei auch mit leerer oder fast leerer Liste und zeigt dann
einen „Sei der erste Eintrag"-Zustand.

## Daten — strenge Integrität

`data/agenturen.json` enthält **keine erfundenen Agenturen, Namen, Kontaktdaten oder
Bewertungen.** Aktuell stehen dort nur klar markierte Struktur-Beispiele
(`"platzhalter": true`). Platzhalter-Detailseiten werden auf `noindex` gesetzt und
nicht in die Sitemap/RSS aufgenommen.

Felder pro Eintrag: `id`, `name`, `platzhalter`, `featured`, `tagline`, `leistungen`
(Beratung/Entwicklung/Automation/Content), `land` (DE/AT/CH), `stadt`, `website`,
`email`, `beschreibung`, `gegruendet`, `teamgroesse`. Unbestätigte Felder mit
`null` oder `"[Redaktion: prüfen]"` markieren.

Echte Einträge kommen ausschließlich über den Einreich-Funnel rein und werden
redaktionell geprüft. Vor dem Live-Gang: Platzhalter löschen.

## Erzeugte Seiten

Startseite (Verzeichnis + Funnel + Modell-Erklärung), Detailseite je Eintrag,
Leistungs-Seiten (4), Land-Seiten (3), `preise.html`, `eintrag-einreichen.html`,
Impressum, Datenschutz, `404.html`, `sitemap.xml`, `robots.txt`, `feed.xml`.

JSON-LD: WebSite/Organization, ProfessionalService (LocalBusiness, nur echte Einträge),
BreadcrumbList, ItemList, FAQPage. Pro Seite: canonical, OG-Tags, `lang="de"`.

## Preise

Konkrete Preise sind **nicht** festgelegt — der Featured-Preis steht als
`[Redaktion: festlegen]` und wird per Mail-Anfrage genannt. Basis-Eintrag = 0 €.

## Deployment

Cloudflare Pages, kein Build-Command, Output = `dist/`. `dist/` ist in `.gitignore`.
