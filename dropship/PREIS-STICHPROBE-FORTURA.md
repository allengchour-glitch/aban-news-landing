# 💰 Preis-Stichprobe Fortura (Schweizer Lager) — 04.10.2026

> **Befund in einem Satz:** Die **Widmann-Kostümartikel** (761 von 2390) liegen deutlich über dem Schweizer
> Ladenpreis, die **Bruder-Spielwaren** (289) sind marktgerecht. Ranking nützt dort nichts, wo der erste
> Preisvergleich das Doppelte zeigt — und die Vergleichshändler sind genau die, die auf diesen Keywords ranken.

## Der Bestand (live gemessen)

**2390 aktive Artikel** mit Preis, **2371 davon mit Lagerbestand > 0** — das ist der einzige Teil des Katalogs
mit echtem Schweizer Lager und 1–2 Tagen Lieferzeit, also der stärkste Verkaufsvorteil des Shops.

Preisverteilung: min **15.90** · 25 % **24.90** · Median **35.90** · 75 % **52.90** · 90 % **70.90** · max **724.90**

Marken: Widmann (761) · Bruder Spielwaren (289) · Unitoys (93) · CHAKS (47) · BOLAND (37) · Haus Huberts (35) · FT (35) · Orlob (26)

## Stichprobe gegen Schweizer Händler

| Artikel | LuxeStyle | Schweizer Handel | Faktor |
|---|---|---|---|
| Widmann **Zauberstab 122 cm** (Art. 52815) | **CHF 33.90** | **CHF 14.90** — Vonarburg | **2,3×** |
| Widmann **Kapitänshut deluxe** (Art. 90186) | CHF 22.90 | CHF 11.90 Ex Libris · CHF 16.80 Galaxus | 1,4–1,9× |
| Widmann **Cowboyhut m. Metallverzierung** (Art. ~925494) | CHF 19.90 | CHF 11.40–16.30 Galaxus | 1,2–1,7× ⚠️ |
| Bruder **MB Sprinter UPS** (Art. 02538) | CHF 63.90 | CHF 55.40–61.65 (UVP 68.50–79.90) | **im Rahmen ✓** |

⚠️ Beim Cowboyhut stimmt die gefundene Artikelnummer (925494) nicht exakt mit unserer (925495) überein —
der Vergleich ist nahe, aber nicht beweisend. Die beiden anderen Widmann-Artikel sind über die Artikelnummer
eindeutig (bei Vonarburg steht `52815` sogar in der URL).

## 🔧 Korrektur meiner eigenen Aussage von heute Mittag

Im PR #2598 habe ich den Zauberstab gegen **deutsche** Händler verglichen (rund EUR 9) und daraus „das
Vierfache" gemacht. Der richtige Massstab ist **Schweiz gegen Schweiz**: CHF 33.90 gegen CHF 14.90 =
**2,3×**. Die Richtung stimmt, die Zahl war zu hoch. Schweizer Kostümhändler sind teurer als deutsche —
wer gegen DE-Preise vergleicht, überzeichnet den eigenen Aufschlag.

## Was das bedeutet

1. **Bruder ist in Ordnung** — dort nicht am Preis drehen.
2. **Widmann-Zubehör ist der Hebel.** 761 Artikel, systematisch 1,4–2,3× über Galaxus/Ex Libris/Vonarburg.
   Genau diese Händler stehen auf den Keywords, auf die wir optimieren.
3. **Nur der User entscheidet über Preise.** Eine saubere Messung über alle 761 Widmann-Artikel bräuchte einen
   Preis-Feed (Galaxus/Toppreise) statt Einzelsuchen — machbar, aber als eigener Auftrag.

## Methode

- Bestand: Shopify-Admin, `tag:fortura AND status:ACTIVE`, Marke aus dem `<strong>Marke:</strong>`-Feld der
  Beschreibung, Artikelnummer aus der SKU (`fortura-<Nr>`).
- Stichprobe über vier Preisbänder, nur Artikel mit numerischer Artikelnummer.
- Vergleich über die **Artikelnummer**, nicht über den Produktnamen — Kostümartikel heissen überall anders.
- **Immer gegen Schweizer Händler vergleichen** (Galaxus, Ex Libris, Vonarburg, fasnacht24, Toppreise).
