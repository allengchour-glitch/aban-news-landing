# 🗂️ Kategorie- & Navigations-Blueprint (Grossmarkt-Modell, 2026)

> Recherche-belegt (Baymard, Shopify-Taxonomie, Galaxus/Amazon/Zalando/Otto). 88% der Shops haben
> mittelmässige Taxonomie = echter Conversion-Hebel. Ziel: Kunden finden schnell, mobil first.

## IA-Regeln (fest)
- **Tiefe ≤ 3 Ebenen** (Top → Sub → Sub-Sub).
- **9 Abteilungen** + 2 Achsen (Geschenke, Sale) = ~11 Header-Items, NICHT mehr.
- 4–8 Sub pro Abteilung · 7–9 Links pro Mega-Menü-Spalte · 3–5 Spalten pro Panel.
- **MECE:** jedes Produkt EINE primäre Abteilung; Geschenk/Preis/Anlass/Sale = Overlay-Collections/Tags, NIE Geschwister-Abteilung.
- Benennung: Kunden-Sprache, Plural, kein Lieferanten-/Jargon. Unterscheidungswort vorne.
- Breadcrumbs überall (Home › Schmuck › Ohrringe › Creolen).
- Smart-Collections: **konjunktiv (ALL) + NOT_CONTAINS** (nie brüchiges „TITLE contains").
- Collection > 5'000 Produkte splitten (sonst keine Filter).

## (a) 9 Abteilungen (Top-Level)
1. **👗 Mode & Kleidung** — Damen · Herren · Kleider · Oberteile · Hosen & Jeans · Jacken · Bademode
2. **👜 Taschen & Accessoires** — Handtaschen · Rucksäcke · Beutel · Gürtel · Schals · Caps & Hüte · Sonnenbrillen
3. **💎 Schmuck** — Halsketten · Armbänder · Ohrringe · Ringe · Wasserfest · Sets
4. **⌚ Uhren** — Damenuhren · Herrenuhren · Smartwatches · Zubehör
5. **💄 Beauty & Pflege** — Parfum & Düfte · Hautpflege · Make-up · Haarpflege · Beauty-Tools · Körperpflege
6. **📱 Tech & Gadgets** — Audio & Kopfhörer · Handy-Zubehör · Smart Home · Beleuchtung · Elektro-Gadgets
7. **🏠 Home & Living** — Küche · Deko · Aufbewahrung · Bad · Garten & Balkon · Haustier
8. **🔧 Werkzeug & Garten** — Handwerkzeug · Elektriker · Garten · Outdoor & Camping
9. **✏️ Selbst gestalten (POD)** — Eigenes Design · T-Shirts · Tassen · WM-Trikot · Geschenkideen
**+ Achsen (visuell abgesetzt):** 🎁 Geschenke (nach Anlass/Preis) · 🔥 Sale/Highlights (rot).

## (b) Mega-Menü
- **Desktop:** 3–5 Spalten/Panel, je Spalte 1 Sub-Heading + 7–9 Sub-Sub-Links; rechts 1–2 Bild-Tiles („Neu"/„Bestseller"/Saison). „Alle anzeigen →" als 1. Link. Such-Feld im Menü. „Shop by": Kategorie / Anlass / Preis (Bis 30 · 30–80 · Premium ab 80) / Marke (nur wo echt: Beauty/Uhren/Werkzeug).
- **Mobil (Engpass!):** Drill-down (Vollbild-Subpage gleitet rein, Back-Chevron), KEIN Riesen-Akkordeon. Sale + Geschenke oben gepinnt. Filter als Vollbild-Sheet mit „X Ergebnisse anzeigen"-Button (mobil NICHT live-update).

## (c) Facetten-Filter (Shopify Search & Discovery, gratis)
Preis (Slider+Text) · Grösse (Checkbox) · **Farbe (Swatches)** · Marke/Vendor · Material (Metafield) · Bewertung (≥4★) · Verfügbarkeit. Regeln: Checkboxen (nicht Radio); Desktop live, Mobil Apply-Button; **Filter-State in URL** (Back behält Filter); ≤8–10 sichtbare Filter.

## (e) Shopify-Umsetzung (Build-Reihenfolge)
1. **Smart-Collections** pro Node (tag-basiert, konjunktiv + NOT_CONTAINS) → self-fill bei Import.
2. **Native Nav** (Online Store → Navigation → Main menu): 3 Ebenen per Drag-Drop-Nesting, jedes Item → Collection.
3. **Mega-Menü-App** für Bild-Tiles + „Shop by" (Globo/Qikify — Dawn nativ kann keine Bilder). = Theme-Session.
4. **Search & Discovery** Facetten (Farb-Swatches, Mobil-Drawer, DE-Labels). = Theme-Session.
5. **Breadcrumbs + Collection-SEO** (H1/Intro/Meta) — fixt auch toten Search-Traffic.

## Zuständigkeit
- **CizQ6 (ich):** Smart-Collections (Taxonomie-Backbone) + native Menü-Struktur (`menuUpdate`) + Collection-SEO + Tags.
- **Theme-Session:** Mega-Menü-App (Bild-Tiles/Shop-by), Search-&-Discovery-Facetten, Mobil-Drill-down, Breadcrumb-Rendering. → via SHARED-MEMORY.

## Ist-Zustand (Basis, 2026-06-21)
Aktuell **14 Top-Items** (zu viele): Topseller, Schnell finden, Marken, WM 2026, Frauen, Herren, Schmuck,
Premium & Marken, Wohnen & Wellness, Trends & Gadgets, Selbst gestalten, 1. August, Sale, Werkzeug & Garten.
→ Konsolidieren auf 9 Abteilungen + Geschenke + Sale; Uhren als eigene Abteilung rausziehen; saisonale (WM/1.Aug)
unter Sale/Aktionen; „Marken"+„Premium & Marken" zusammenführen.
