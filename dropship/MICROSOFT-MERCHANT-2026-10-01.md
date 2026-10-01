# Microsoft Merchant Center — Store abgelehnt «Beschreibung irreführend» (01.10.2026)

**Ablehnung (Screenshot Betreiber):** «Ihre Produktbeschreibung muss wahrheitsgemäss, genau sein und darf nicht irreführend … sein». Produktprobleme 0 — es geht um den STORE, nicht um Artikel.

## Gefunden (GEMESSEN, Admin-API + WebFetch)
| Stelle | Text vorher | Problem |
|---|---|---|
| `shop.description` (Startseiten-Meta, og:description) | «Premium Online-Shop … mit **schnellem Versand** in die Schweiz **und nach Deutschland**» | Versand nur CH, Direktversand 10–20 WT. Feld per API NICHT änderbar; Theme ersetzte nur «Deutschland» |
| Startseite Text | «… **ohne versteckte Gebühren**. Einfuhrsteuer fällt … ab rund CHF 60 an» | Widerspruch im selben Absatz |
| Startseite Hero | «Ohne versteckte Gebühren, zu Preisen, die Spass machen» | dito |
| Startseite USP + Trust-Karte, Ankündigungsband | «Angaben laufend geprüft», «Geprüfte Produktangaben», «40'000 Produkte mit geprüften Angaben» | unbelegbare Prüf-Zusage |
| Kollektion `eu-lager-schnell` | «EU-Lager — Schnell geliefert», «in wenigen Tagen statt Wochen», «✓ Geprüfte Angaben» | nicht gemessen |
| Footer | Links ja, aber keine Kontaktangabe sichtbar | Microsoft verlangt erkennbaren Händler |

## Geändert (live Theme 187533001089, Backups in /tmp/claude-0/*.vor-microsoft*)
- `snippets/meta-tags.liquid`: Startseite → «LuxeStyle aus Belp: Mode, Beauty, Technik & Wohnen. Versand nur in der Schweiz – ab Schweizer Lager 1–2 Werktage, übrige Artikel 10–20 Werktage.» (meta + og + twitter; curl bestätigt).
- `templates/index.json`: 5 Stellen ersetzt (Einfuhr-Satz ehrlich, «30 Tage Rückgabe» statt «geprüft», «Klare Angaben … info@luxestyle.ch»).
- `sections/header-group.json`: Band «↩️ 30 Tage Rückgabe · 🔒 Sichere Bezahlung».
- `sections/footer-group.json`: Block `text_lx_kontakt` (Kontakt · 3123 Belp · info@ · Impressum · Versand nur CH · 30 Tage Rückgabe) — WebFetch bestätigt.
- Kollektion `eu-lager-schnell`: Titel «EU-Lager — kürzere Lieferzeit», Text ohne Zahlen-Versprechen.
- 30-Tage-Rückgabe gegen Shop-Policy geprüft (REFUND_POLICY: «innerhalb von 30 Tagen ab Erhalt»).

## Offen beim Betreiber
1. Shopify Admin → Onlineshop → Einstellungen (Preferences) → Startseiten-Meta-Beschreibung durch den Text oben ersetzen (dann greift das Theme-Override ins Leere, schadet nicht).
2. Microsoft Merchant Center → Store erneut zur Prüfung einreichen; ohne Knopf → Microsoft-Advertising-Support «Re-review», Verweis auf die korrigierte Startseite.
3. Nichts bezahlen («Geldmittel hinzufügen» ist nur für bezahlte Anzeigen, Gratis-Listings brauchen das nicht).
