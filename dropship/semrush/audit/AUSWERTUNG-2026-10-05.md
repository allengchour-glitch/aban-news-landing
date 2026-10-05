# Semrush Site Audit — Export 05.10.2026 (Crawl vom 03.10., 100 Seiten)

Datei: `2026-10-05_mega_export.csv` (Betreiber). ⚠️ Der Crawl ist vom 03.10. — vor den Fixes vom 04.10.

| Befund | Seiten | Live-Stand 05.10. 18:30 UTC (curl) | Aktion |
|---|---|---|---|
| Missing meta description | 5 (/collections/all, 4 Policies) | alle 5 haben eine Meta (Theme-Fallback 04.10.) | — erledigt |
| Multiple h1 tags | 4 (kontakt-support, tracking, ueber-uns, versand-lieferung) | je **1** H1 | — erledigt (04.10.) |
| Duplicate content in h1 and title | 1 (ueber-uns) | Titel = H1 wortgleich | SEO-Titel → «Über uns – Schweizer Onlineshop aus Belp \| LuxeStyle CH» |
| Low text to HTML ratio | 86 | Theme-Eigenschaft (Horizon, Bildkarten) | keine — kein Ranking-Faktor |
| Disallowed internal/external resources | 87 / 87 | Shopify-Checkout-Skripte in robots.txt | keine — bei jedem Shopify-Shop so |
| Pages with only one internal link | 17 | Produkt-URLs mit `?variant=` (Canonical zeigt auf die Produktseite) | keine |
| Resources formatted as page links | 2 | Bild-Links in Beschreibungen | klein, offen |
| Content not optimized | 1 (Mini-Kleid mit Rüschen) | — | klein, offen |

Fazit: 0 Fehler (Errors), nur Warnungen/Hinweise; alles Relevante ist live behoben. Für eine echte Nachmessung im Audit
«Rerun campaign» drücken (Betreiber) — dann zeigen «Compare Crawls» die Differenz.

## Nachtrag 19:00 UTC — Detail «Pages with only one internal link» (17)
Alle 17 sind Produkt-URLs **mit `?variant=…`** (Karten-Links der Startseiten-Reihen). Gemessen: Canonical zeigt auf die
Produkt-URL ohne Parameter (z. B. `rucksack-mit-katzenmotiv-803264`) → Google wertet die Hauptseite, kein Handlungsbedarf.
