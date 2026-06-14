# 🇨🇭 Swiss-Edition-Ausbau — Auftrag für PC-Claude / Gelato

> **Datenbasis (2026):** Mode = #1 CH-Online-Kategorie (51 %). Personalisierte Geschenke +7–8,7 %/Jahr,
> Segment Kleidung/Accessoires wächst am schnellsten (7,76 %). Schweiz-Themen-Apparel hat echte Nachfrage
> (Touristen + Expats + Locals) bei **schwacher, fragmentierter Konkurrenz** (Etsy/Redbubble/Souvenir-Shops).
> → Marktlücke = **premium Schweizer Themen-/Geschenk-Apparel**, vollautomatisch druckbar via Gelato.

**Fulfillment steht:** Gelato-Connector live (`cloudflare/src/gelato.js`) + `gelato_map.json` vorgebaut. Neue
DTG-Produkte landen nach dem Anlegen + KV-Map-Update automatisch im Druck. Druckart = **DTG, Front-Print**
(kein `-emb`/Stickerei, sonst kein Foto/Design-Upload). Region = **Europe** (CH-Lieferung).

---

## 🎨 Design-System (für ALLE 20 — sorgt für einheitlichen Marken-Look)
- **Palette:** Swiss-Rot `#D52B1E` · Anthrazit `#1F2328` · Off-White/Cream `#F4F1EA` · Alpen-Salbei-Grün `#7C8C6B` (Akzent). Pro Design max. 2–3 Farben.
- **Stil:** modern-minimalistisch, **premium editorial** — KEIN kitschiger Touristen-Look. Saubere Vektor-/Line-Art **oder** elegante Typografie.
- **Typografie (Mundart):** eine durchgehende kondensierte Grotesk (z. B. Anton/Oswald-Stil), gleiche Schrift über alle Text-Designs → Wiedererkennung.
- **Line-Art (Berge/Tiere):** gleiche Strichstärke (~3–4 px @ Druckauflösung), monoline.
- **Platzierung:** Front, zentriert, **mittel** (Tee 18–22 cm Breite, Hoodie/Sweatshirt 22–26 cm). Brust-klein-Variante optional als 2. Motiv.
- **Garment-Farben:** vorwiegend Cream/Sand/Anthrazit/Schwarz + 1× Swiss-Rot je Thema. Motiv-Kontrast beachten.

---

## 📦 Die 20 Produkte (Themen-gruppiert)

### A) Mundart-Sprüche (viral, Expat-/Geschenk-Liebling)
1. **T-Shirt «Hoi Zäme»** — grosse kondensierte Typo, Punkt in Swiss-Rot. *Unisex-Tee, Cream/Anthrazit.* CHF 32.90 · Tags `mundart`
2. **T-Shirt «Merci Vilmal»** — Typo + kleines Edelweiss-Icon als Akzent. *Damen-Tee, Off-White.* CHF 32.90 · Tags `mundart`
3. **Hoodie «Chuchichäschtli»** — das unübersetzbare Wort, gross & selbstironisch („nur echte Schwiizer können's sagen"). *Unisex-Hoodie, Anthrazit.* CHF 54.90 · Tags `mundart`,`hype-2026`
4. **Sweatshirt «Gmüetlech»** — entspannte Typo, Salbei-Grün. *Unisex-Crewneck, Sand.* CHF 44.90 · Tags `mundart`,`loungewear`
5. **T-Shirt «Sali Zäme»** — minimalistische Typo, Brust-klein-Variante. *Herren-Tee, Schwarz.* CHF 32.90 · Tags `mundart`,`herren`

### B) Kantone & Städte (Lokalstolz — gezielt bewerbbar pro Region)
6. **T-Shirt «Züri»** — Limmat-Skyline als Monoline + Koordinaten 47.37° N. *Unisex-Tee, Cream.* CHF 32.90 · Tags `stadt`,`zuerich`
7. **T-Shirt «Bärn»** — Zytglogge-Silhouette + kleiner Bär. *Unisex-Tee, Anthrazit.* CHF 32.90 · Tags `stadt`,`bern`
8. **Sweatshirt «Basel»** — Fasnachts-/Tinguely-verspielte Line-Art. *Unisex-Crewneck, Off-White.* CHF 44.90 · Tags `stadt`,`basel`
9. **Hoodie «Zermatt 4478»** — Matterhorn-Outline + Höhenangabe, edel. *Unisex-Hoodie, Sand.* CHF 54.90 · Tags `berge`,`wallis`,`hype-2026`

### C) Berge & Natur (zeitlos, Premium)
10. **Sweatshirt «Alpen-Panorama»** — durchgehende Gipfel-Monoline (Brustband). *Unisex-Crewneck, Cream.* CHF 44.90 · Tags `berge`
11. **T-Shirt «Vierwaldstättersee»** — minimalistische See-/Berg-Line + Welle. *Damen-Tee, Salbei.* CHF 32.90 · Tags `berge`,`natur`
12. **Hoodie «Swiss Peaks» (Topo)** — topografische Höhenlinien als Allover-Akzent vorne. *Unisex-Hoodie, Anthrazit.* CHF 54.90 · Tags `berge`,`hype-2026`

### D) Tradition & Genuss (Food = sympathisch, teilbar)
13. **T-Shirt «Raclette»** — Retro-70er-Typo + Pfännchen-Icon. *Unisex-Tee, Cream.* CHF 32.90 · Tags `food`,`tradition`
14. **Sweatshirt «Schoggi»** — „Powered by Schoggi", verspielt. *Damen-Crewneck, Sand.* CHF 44.90 · Tags `food`,`loungewear`
15. **T-Shirt «Grill-Schwiizer»** — Sommer/BBQ + Swiss-Cross-Spatel (saisonal Sommer). *Herren-Tee, Schwarz.* CHF 32.90 · Tags `food`,`herren`,`sommer-2026`

### E) Tiere (herzig, Geschenk + Kids)
16. **T-Shirt «Murmeli»** — herzige Monoline-Murmeli. *Unisex-Tee, Cream.* CHF 32.90 · Tags `tiere`,`geschenk`
17. **Hoodie «Bernhardiner»** — edler St.-Bernhard-Kopf, Line-Art + Fässchen-Detail. *Unisex-Hoodie, Anthrazit.* CHF 54.90 · Tags `tiere`,`hype-2026`

### F) Anlässe · Baby · Paar (höchste Geschenk-Marge)
18. **Baby-Body «Mini-Schwiizer»** — Edelweiss + Herz, zart. *Baby-Bodysuit, Cream.* CHF 24.90 · Tags `baby`,`geschenk`
19. **Paar-Set «Heimweh / Dahei»** — 2 Shirts: einer „Heimweh", einer „Dahei", gleiches Design-Sprachbild. *Unisex-Tees, Anthrazit.* CHF 59.90 (Set) · Tags `paar`,`geschenk`
20. **T-Shirt «1. August»** — Swiss-Cross + minimalistisches Feuerwerk (zum Nationalfeiertag, **JETZT timing-relevant**). *Unisex-Tee, Off-White.* CHF 32.90 · Tags `erste-august`,`schweiz-edition`

---

## 🏷️ Gemeinsame Tags & Collection (für ALLE 20)
- Pflicht-Tags: `schweiz-edition`, `swiss-edition`, `gelato`, `pod` + die themen-spezifischen oben.
- Collection: **🛋️ Loungewear** (`loungewear`) für Hoodies/Sweatshirts; alle ausserdem in eine **neue Smart-Collection „🇨🇭 Swiss Edition"** (Regel: TAG = `schweiz-edition`) — als Top-Menüpunkt verlinken.
- SEO-Titel direkt mit anlegen (Lehre: `create-product` setzt `seo.title` sonst NICHT) — Muster: `«Name» · Swiss Edition | LuxeStyle`.

## ⚙️ Ausführung (Reihenfolge für PC-Claude / Gelato)
1. **Gelato:** je Produkt aus passendem DTG-Template (Hoodie Gildan 18500, Sweatshirt Gildan 18000, Tee Gildan 5000, Damen-Tee Next-Level/Bella, Baby-Body) anlegen → Design vorne mittig platzieren (Design-System oben). **KEINE Stickerei.** Region Europe. Nach Sync zu Shopify publizieren.
2. **Shopify-Feinschliff (Cloud-Session übernimmt danach):** DE-Titel/SEO/Alt-Texte, Tags, Collections, 6 Kanäle publizieren, Werbe-Queue (`automation/good_products.csv`), Cross-Sell innerhalb der Linie.
3. **Connector scharf:** nach Anlegen die neuen Varianten-IDs → `gelato_map.json` ergänzen (`node automation/gelato_discover.mjs`, dann Map neu hochladen). Dann fallen sie automatisch in den Gelato-Druck.

> **Realismus:** 20 auf einmal ist viel — sinnvoll in 2 Wellen (erst A+F = Mundart + Geschenk/Anlass, da
> höchste Marge & Viralität + 1.-August-Timing; dann B–E). Lieber 6 erstklassige Designs als 20 mittelmässige.
