# 🇨🇭 Marktlücke & Strategie — „Schweiz Edition" (Print-on-Demand)

> Erstellt 2026-06-09 autonom. Datenbasiert. Ziel des Users steht: **Kunden, die KAUFEN.**
> Kurzfassung auch in `MEMORY-KOMPAKT.md`.

## 1. Die Daten (Shopify Analytics, letzte 30 Tage)
- **2.888 Sessions**, davon **1.541 aus der Schweiz** (940 social-CH + 601 direct-CH) = **53 % richtige Zielgruppe**.
  Rest: 583 direct-US (Bot/Junk) + Streuverkehr (SG/BR/MY/IN…).
- **8 Sessions mit Warenkorb · 7 erreichten Checkout · 0 abgeschlossen · Conversion 0,0 %.**
- **0 Bestellungen.** (Bestätigt den Dauerbefund.)

**Lesart:** Reichweite in die Schweiz **funktioniert** (TikTok/Social bringt 1.500+ CH-Leute/Monat).
Der Engpass ist **nicht Traffic, sondern Conversion**: kaltes Social-Publikum sieht **austauschbare
Dropship-Mode** (gibt's identisch auf Temu/Shein/AliExpress, China-Versand, kein Vertrauen) → **kein Kaufgrund**.

## 2. Die Marktlücke
**Schweiz-Identität als Print-on-Demand** — Mundart-Sprüche & CH-Kultur-Motive auf Shirt/Tasche/Tasse/Sticker.
Warum das die Lücke ist:
- **Generische Dropshipper können es nicht:** Mundart („Hoi zäme", „Chuchichäschtli", „Gopfertami") +
  Kanton/Stadt-Stolz brauchen Sprach- & Kulturwissen → sprachliche Schutzmauer gegen Temu/AliExpress-Kopien.
- **Emotional & lokal:** Heimat, Dialekt-Humor, Kanton-Pride → Identifikation = Kaufgrund, den Mode nicht liefert.
- **Geschenk- & Impuls-tauglich:** Sticker/Tasse ab CHF 4.90–17.90, 1.-August, Geburi, Abschied, „Merci".
- **On-Demand, kein Lager-Risiko:** Druck via **Printful (EU-Fulfillment, schnell in die CH)** bzw.
  **Mister DTF (Schweizer Bügeltransfer, OEKO-TEX)** → glaubwürdig „näher als China".
- **Wir haben die Basis schon:** Editor v2, 26 POD-Blanks, 340-Motiv-Bibliothek inkl. ~12 CH-Motive,
  +39 neue Mundart-Briefs in der Pipeline (s. u.).

**Positionierung:** „**Schwiizer Sprüch & Symbol — uf Shirt, Täsche, Sticker. On-Demand druckt, kä China-Versand.**"

## 3. Das Sortiment (Launch-Linie)
Fokus auf **niedrigschwellige Erstkäufe** (Impuls/Geschenk) als Conversion-Hebel fürs kalte Publikum:
1. **Mundart-Sticker (Kiss-Cut), CHF 4.90** — Held der Linie. Kein Mockup nötig (Produktbild = Motiv),
   günstigster Erstkauf, Laptop/Bottle/Geschenk. → höchster erwarteter Conversion-Hebel.
2. **Mundart-Tasse, CHF 17.90** — „Znüni/Apéro/Feierabig", Büro-Geschenk.
3. **Jute-/Baumwolltasche, CHF 17.50** — „Merci vilmal", Märit/Einkauf, sehr CH.
4. **Shirt/Hoodie** — Kanton/Stadt-Pride, „Eidgenoss", 1.-August.
Bewerben nur ≥4★-tauglich; Preise via `printful_reprice.mjs`-Logik (×2,3 über Druckkosten).

## 4. Motiv-Pipeline (Stand)
- **Live in der Bibliothek (~12 CH):** matterhorn, alphorn, fondue, edelweiss, swiss-cowbell,
  swiss-chocolate, swiss-flag-heart, swiss-heart, text-gruezi/-hoi/-merci, alpaca.
- **NEU eingereiht (+39, generieren sobald Gemini-Billing da):** Mundart-Lettering (Hoi zäme, Merci vilmal,
  Grüezi mitenand, Chuchichäschtli, Gopfertami, Hä?, Feierabig, Apéro Time, Znüni, Bünzli, Eidgenoss,
  Züri/Bärn/Basel-Pride, 1. August…) + Icons (Sackmesser, Murmeli, Steinbock, Berner Sennenhund,
  Bernhardiner, Braunvieh, Chalet, Bähnli, Raclette, Cervelat, Heidi, Enzian, Fasnacht-Maske, Postauto-Horn…).
  Quelle: `social/designs/prompts.json` (313 Einträge). `gen_designs.mjs` überspringt Vorhandene → nur neue.

## 5. Was JETZT autonom vorbereitet ist (diese Session)
- ✅ Diagnose datenbasiert (oben).
- ✅ 39 Mundart-/CH-Design-Briefs in die Generator-Pipeline gelegt.
- ✅ Smart-Collection **„🇨🇭 Schweiz Edition"** angelegt (Regel: Tag `schweiz-edition`) — leer, startklar.
- ✅ POD-Mockups „Dein Design"-Platzhalter entfernt (saubere Blanks) — Store wirkt professionell.
- ✅ `pod_blank_mockups.mjs` + Printful-Gratis-Katalog-Trick dokumentiert (für Apparel-Blanks später).

## 6. Was es zum LIVE-Schalten noch braucht (Reihenfolge)
1. **🔴 Gemini-Billing aufladen** → die 39 CH-Motive generieren (`gen-designs.yml` dispatchen).
2. **🔴 Fulfillment-Key** (Kreditkarte): **Printify** (Sticker/Tasse) bzw. **Gelato** (CH-naher Druck) ODER
   weiter **Printful** (läuft schon, EU). → Connector bauen (Skelett vorhanden), Auto-Fulfill.
3. **Pre-made Produkte erzeugen:** Sticker = Motiv-PNG direkt als Produktbild (kein Mockup nötig) →
   schnellster Launch. Tassen/Taschen/Shirts = Motiv auf Blank baken (Cloudinary/Mockup-Generator).
   Alle taggen `schweiz-edition` → landen automatisch in der Collection.
4. **Sichtbarkeit:** Collection in Menü/Hero verlinken, 1 Reel „Schwiizer Sticker" pro Woche, WELCOME10.
5. **TikTok-Kampagne** (User-Klick/API-Token): CH/18–34, „Complete Payment", Pixel D8EKVR…, Motiv = Mundart-Sticker.

## 7. Erfolgsmessung
Nach Launch wöchentlich: add-to-cart-Rate (Ziel >2 %, heute 0,28 %), erste Bestellungen, Top-Motive
(→ Bibliothek nach Gewinnern ausbauen). Sticker-Conversion ist der Frühindikator.
