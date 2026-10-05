# Ricardo.ch — Start (05.10.2026, Betreiber «kannst du ricardo machen»)

## Was steht (von Claude gebaut)
- **Feed:** `dropship/ricardo/ricardo_feed.csv` (TSV, Google-Shopping-Spalten) — **361 Produkte / 862 Varianten**, Schweizer Lager
  (Fortura, Lieferung 1–3 Werktage), 97 % mit EAN. Vor allem Kostüme (721 Varianten — Halloween/Fasnacht) + Spielzeug (133).
- **Öffentliche Feed-URL (für Ricardo):**
  `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/dropship/ricardo/ricardo_feed.csv`
- **Täglich neu** (Aufseher, `automation/ricardo_feed.py`): Bestand/Status live, nur Ware mit ≥ CHF 5 Gewinn nach 12 % Provision,
  keine Klingen, keine Einkaufspreise im Feed.
- **Rechnung (gemessen 05.10.):** Fortura-Marge Median 21 % (z. B. VK 49.90 / EK 39.46). Nach 12 % Provision bleiben bei 364 von
  2'388 Produkten ≥ CHF 5 → nur diese im Feed. CJ-Ware (10–20 Werktage) bewusst NICHT — Ricardo-Käufer erwarten Tage.

## Stand 05.10. 20:45 UTC
- ✅ Betreiber hat sich bei Ricardo **als Privatperson** registriert (Benutzername `allengchour`, Mitgliedsnummer 404683860, Mail verifiziert).
- Ricardo-Hilfe: Geschäftskonto ist für **MWST-pflichtige** Firmen; Umstellung nur über den Kundendienst
  ([help.ricardo.ch](https://help.ricardo.ch/hc/de/articles/16882997491996)). LuxeStyle ist nicht MWST-pflichtig (Umsatz < CHF 100'000, keine UID)
  → Ricardo selbst fragen, ob Privatkonto für Feed + Shopify reicht (Kurz-Mail unten), statt auf Verdacht umzustellen.

## Was nur der Betreiber kann (≈ 15 Min)
1. **Ricardo-Konto als gewerblicher Verkäufer** anlegen/umstellen: ricardo.ch → Mein Ricardo → Konto → «Gewerblicher Verkäufer»
   (Verifizierung mit Firmenangaben; LuxeStyle hat keine UID/HR — Einzelfirma angeben, Ricardo fragt ggf. nach).
2. **Versand festlegen:** Paket PostPac Economy ~CHF 9 bzw. was Fortura verrechnet — der Käufer zahlt den Versand separat.
3. **Mail an Ricardo** (vom Konto-Mail aus), Text unten.
4. Ricardo schickt einen **Installationslink für Shopify** → anklicken (Shop `au3j0y-hq`) → Ricardo-Bestellungen landen in Shopify
   und laufen durch die normale Bestell-Ampel.

### Kurz-Mail an accountmanagement@ricardo.ch (seit 05.10., ersetzt die lange)
> Betreff: Produkt-Feed für meinen Shop
>
> Grüezi
> Ich habe ein Ricardo-Konto (Benutzername: allengchour, Mitgliedsnummer 404683860) und einen kleinen Online-Shop (luxestyle.ch, nicht MWST-pflichtig).
> Ich möchte rund 360 Artikel per Produkt-Feed einstellen und die Bestellungen in Shopify erhalten.
> Geht das mit meinem Konto, oder muss ich etwas umstellen?
> Freundliche Grüsse

### (alt) Mail an accountmanagement@ricardo.ch
> Betreff: Produkt-Feed + Shopify-Anbindung für LuxeStyle
>
> Grüezi
> Ich möchte als gewerblicher Verkäufer (Ricardo-Benutzername: ________) meine Angebote über einen Produkt-Feed einstellen und
> die Bestellungen in Shopify erhalten.
> - Feed-URL (TSV, Google-Shopping-Format, täglich aktualisiert): https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/dropship/ricardo/ricardo_feed.csv
> - Rund 360 Produkte / 860 Varianten (Kostüme, Spielzeug, Partydeko), ab Lager Schweiz, Lieferzeit 1–3 Werktage, EAN vorhanden.
> - Angebotsform: Sofortkauf (Fixpreis), Menge laut Spalte «quantity».
> - Shopify-Shop-Handle: au3j0y-hq
> Besten Dank und freundliche Grüsse
> LuxeStyle, Belp

## Danach (Claude)
- Erste Ricardo-Bestellung → Bestell-Ampel prüfen (Fortura-Versand), Provision gegen Rechnung nachmessen.
- Läuft es: Schwelle prüfen (Ricardo-Preis +10 % wäre möglich, um mehr Fortura-Ware rentabel zu machen — Betreiber-Entscheid).
