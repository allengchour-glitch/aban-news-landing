# LuxeStyle Ranking-Fixes – R158

Stand: 09.11.2026, 21:52 Europe/Zurich

## Ergebnis

Shopify wurde frisch als `LuxeStyle`, Primärdomain `luxestyle.ch`, CHF verifiziert. Der aktuelle MAIN-Theme blieb unverändert. Auf einer frischen Kopie des aktuellen MAIN wurde genau die gemeinsame SEO-Metadatei korrigiert und vollständig als unveröffentlichte Vorschau geprüft:

- MAIN: `gid://shopify/OnlineStoreTheme/213013037447`, Datei-MD5 `c7e3f66093cbdb59f29210b62ebd1447`
- Vorschau: `gid://shopify/OnlineStoreTheme/213619179911`, Name `LuxeStyle – R158 SEO Preview 09.11.2026`, Rolle `UNPUBLISHED`
- Vorschau-Datei-MD5 nach beiden Korrekturen: `5272479d3e09c18aa461e78f465c7c0b`
- Vollinventur: 537 MAIN-Dateien gegen 537 Vorschau-Dateien, keine fehlenden oder zusätzlichen Dateien, genau eine abweichende Datei: `snippets/meta-tags.liquid`

Die Datei enthält zwei eng begrenzte Korrekturen:

1. Die beiden primären Liquid-Ausgaben für `og:image` verwenden `https:` statt `http:`. `og:image:secure_url` bleibt unverändert HTTPS.
2. Nur für die französische Startseite wird eine eigene Beschreibung gesetzt: `LuxeStyle : mode, beauté, technologie et maison. Livraison en Suisse et au Liechtenstein. Livraison gratuite dès CHF 50.` Die deutsche Startseitenbeschreibung bleibt bytegenau erhalten.

## Vorschau-Abnahme

Beide Vorschauseiten lieferten HTTP 200.

| Prüfung | Deutsch | Französisch |
|---|---|---|
| Titel | `LuxeStyle CH – Premium Mode, Beauty & Lifestyle Shop Schweiz` | `LuxeStyle Suisse – Mode, beauté, maison et technologie` |
| H1 | `Schön leben. Schlau shoppen.` | `Bien vivre. Acheter malin.` |
| Meta-/OG-/Twitter-Beschreibung | unverändert deutsch | vollständig französisch und claim-sicher |
| Canonical | `https://luxestyle.ch/` | `https://luxestyle.ch/fr` |
| Hreflang | x-default, de, fr | x-default, de, fr |
| `og:image` | HTTPS | HTTPS |
| `og:image:secure_url` | HTTPS | HTTPS |

Firecrawl-Scrapes: DE `01a1c211-9e5b-77af-841a-33e0e562e539`, FR `01a1c211-9f82-7359-b21c-42a8769b5957`. Eine direkte öffentliche HTML-Gegenprobe bestätigte zusätzlich beide H1.

## Publikationszustand

Die Theme-Kopie ist technisch veröffentlichungsbereit, aber weiterhin `UNPUBLISHED`. Der anschliessende `themePublish`-Aufruf wurde von der automatischen Freigabeprüfung vor Ausführung blockiert. Die Prüfung verlangt das spezialisierte Werkzeug `theme_publish`; dieses Werkzeug ist in der Sitzung nicht verfügbar. Es gab keinen Retry und keinen MAIN-Write. Daher sind die FR-Homepage- und HTTPS-OG-Korrekturen noch nicht produktiv.

## Menü-IA

Der aktuelle Hauptmenübaum wurde ohne Write ausgewertet:

- 784 Knoten: 21 Top-Level, 243 zweite Ebene, 520 dritte Ebene
- 779 Collection-Knoten, 742 normalisierte eindeutige Collection-URLs
- Phase-A-Entwurf: alle 21 Top-Level- und 243 Second-Level-Knoten erhalten; 520 Third-Level-Knoten erst nach vollständiger Hub-Abdeckung aus dem globalen Menü entfernen
- Zielgrösse: 264 Knoten; eindeutige Header-Ziele 744 auf 240, Reduktion 504 beziehungsweise 67,7 Prozent

Die Live-Mutation bleibt gesperrt. Der historische Erreichbarkeits-Gate weist 397 von 520 Kindkanten als im Hauptinhalt fehlend und 44 Ziele als unter einem Sechser-Cap verborgen aus. Vor einer Menüänderung müssen alle 520/520 Kanten auf 84/86 Hubs sowie 86/86 mobile «Alle in …»-Wege in einer unveröffentlichten Vorschau bestehen. 12/12 lokale Konsistenztests des Entwurfs sind grün.

## Claude-Code-Kontinuität

Der Handoff-Branch stand vor diesem Dokumentationswrite auf `b417b4387ebe48cb3f4830e7d85db26c0b10ff9f`, Revision 157, 24 eindeutige Aufgaben und 120 Historieneinträge. Ein lokaler Fail-Closed-Handoff-Guard bestand 11/11 Tests. Er wird nicht als produktive Automation oder Empfangsbeleg ausgegeben. Der bestehende Rhythmus 08:00/14:00/19:00 Europe/Zurich bleibt unverändert; keine neue Automation oder Frequenz wurde angelegt. Claude-Empfang bleibt `unknown_no_claude_receipt`.

## Grenzen

Keine erneute GSC-, Metricool-, Klaviyo-, DNS-, Bestell- oder breite Verkaufsabfrage. Keine Kundenansprache, Rabatte, Budgets, Flow-, DNS-, Merchant-, Social-, Menü-, MAIN-Theme- oder kostenpflichtige Renderänderung. Keine andere Marke bearbeitet. Fehlende Publikation wird nicht als live bezeichnet.

[LUXESTYLE_R158_20261109]
