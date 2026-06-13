# 🎨 Shop-Optik & Struktur — LuxeStyle (Stand 2026-06-13)

> Ziel (User): „Seite muss sehr schön sein, sauber aufgeteilt, optisch verkaufsstark — top."
> Quellen: Baymard (Navigation UX), Visual-Merchandising-Best-Practices 2025 (siehe unten).

## ✅ Schon erledigt (live via Shopify-MCP)
- **Menü-Audit:** Hauptmenü hat **8 Top-Punkte** (Frauen · Herren · Schmuck · Wohnen & Wellness · Trends &
  Gadgets · 1. August · Selbst gestalten · Sale) mit logischen Mega-Menü-Unterkategorien = **Best-Practice**
  (Empfehlung max. 8). **Kein Umbau nötig.**
- **Kollektions-Sauberkeit (zu breite „Titel enthält"-Regeln gefixt, konjunktiv + NOT_CONTAINS):**
  - 📦 Taschen: 3 Fremdkörper raus (Gartenset, Widerstandsbänder, Strandtuch)
  - 📿 Halsketten 152→75 (Lichterketten raus) · 💫 Armbänder 51→46 (Mesh-Uhren/Mückenband) · 👗 Röcke 33→7
    (Haartrockner/Trockenblumen/Rocket-Sticker)
  - Kleider/Haustier/Küche/Yoga geprüft = sauber.

## 🛠️ API-Optimierung — STAND
1. ✅ **„Beste zuerst"-Sortierung:** geprüft — **alle** Haupt-Kollektionen stehen bereits auf `BEST_SELLING`. Nichts zu tun.
2. ✅ **Kollektions-Titelbilder gesetzt** (24 Kollektionen, je passendes Produktbild + altText): Damen/Herren/Taschen/
   Wohnen/Trends/Kleider/Halsketten + alle Menü-Subs (Röcke, Bademode, Ohrringe, Ringe, Armbänder, Uhren, Beleuchtung,
   Deko, Aroma, Massage, Trinkflaschen, Küche, Baby&Kids, Haustier, Reise, Handy, Yoga). → schöne Mega-Menü-Thumbnails.
   ⚠️ **Offen: 🧔 Bart & Rasur** — alle Produkte haben **kein Bild** hinterlegt (Daten-/Stockbild-Thema) → Cover nicht setzbar,
   bis die Produktbilder ergänzt sind.
3. ✅ **Kollektions-Texte/SEO:** Haupt-Kollektionen haben starke Texte; 5 dünne aufgewertet (Taschen, Trends,
   Halsketten, Kleider, Herren-Mode) auf einheitliches SEO-Format (Keywords + Trust-Zeile + WELCOME10). Bart&Rasur-
   Cover aus dem aktiven Produkt gesetzt.
4. **POD-Tote-Bags:** Bild zeigt nur das Motiv (wirkt wie Sticker) → echtes Taschen-Mockup als 1. Bild
   würde im Taschen-Raster hochwertiger wirken (POD-Session-Thema, koordinieren).

## ✅ „Komplette Produkte" — geprüft
- Bildlose Produkte (z. B. Bart&Rasur „Premium … Boutique -1..-7", Reisetaschen-Duplikate) sind **ARCHIVIERT**
  → **nicht kundensichtbar**, verschmutzen die Live-Seite nicht. **0 aktive** „Boutique"-Produkte.
- Kundensichtbare cj-real-Produkte sind bild-QA-geprüft (0 FAILED). → Storefront ist „komplett".
- Offener Backlog: die archivierten Duplikate könnten per Admin-Bulk gelöscht werden (API-Bulk war gesperrt).

## 🖼️ Bild-Polish (User „jedes Bild kontrollieren, gute Auflösung, keine Asiaten zuerst")
- **Sichtbare Bilder visuell geprüft** (Cover + erste Produkte je Haupt-Kategorie, per Download+Ansicht):
  Damen (Brise-Kleid), Herren (Amalfi-Strick), Kleider (Daisy), Röcke, Bamboo-Bluse, Schmuck/Schuhe-Erste →
  **alle gute Auflösung (1200–1920px) + westliche Models / Produktfotos. KEIN Asiaten-Supplier-Foto an 1. Stelle.**
- **Skalierung:** Den GESAMTEN Katalog (1 143 aktiv) per Auge zu prüfen ist 1 Session nicht möglich → bräuchte
  einen Vision-Workflow (Action). Die sichtbarsten/ersten Bilder sind gesichert.
- **Archiviert = 4 397** (kundenunsichtbar) → Admin-Bulk-Löschung (Produkte → Filter Archiviert → alle → löschen);
  kein Storefront-Effekt, daher niedrige Priorität.

## 🖱️ Nur im Customizer (dein Klick-Bereich — Haupt-Theme ist für mich gesperrt)
Recherche-belegte Hebel, die optisch am meisten bringen:
- **Einheitliche, quadratische Produktkacheln** in allen Rastern (gleiche Grösse = weniger „kognitive Reibung",
  Baymard). Image-Ratio in den Theme-Settings auf „square" für alle Produkt-Sektionen.
- **Mega-Menü mit Bild-Thumbnails** je Unterkategorie (Kunden klicken Bilder, nicht Textlisten).
- **Hero oben:** EIN starkes Lifestyle-Foto + 1 klarer CTA („Sommer entdecken"). Kein Text-Overload.
- **Sticky „In den Warenkorb"** + **Bewertungssterne auf den Kacheln** (Judge.me) = mehr Conversions.
- **Whitespace & max. 1–2 Akzentfarben** (Gold/Creme passt zur Marke) → Premium-Wirkung.
- **Schnell + mobil:** Bilder als WebP, Lazy-Load; Mobile = Hamburger + horizontale Kategorie-Leiste.
- **Trust-Band** sichtbar (Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · TWINT · –10% WELCOME10).

## Quellen
- Baymard — Homepage & Navigation UX Best Practices: https://baymard.com/blog/ecommerce-navigation-best-practice
- Visual Merchandising for Ecommerce (Nacelle): https://nacelle.com/blog/visual-merchandising-for-ecommerce-creating-digital-storefronts-that-convert
- Psychology of Visual Merchandising (Depict): https://depict.ai/magazine/the-psychology-of-visual-merchandising-how-product-arrangement-influences-shopper-behavior

## 📝 Produkt-SEO (Punkt 2) — STAND 2026-06-13
- Geprüft: Gros der aktiven Produkte hat bereits SEO. **Lücke = die 17 neuesten Produkte** (frisch importiert,
  oben sichtbar) hatten leeres SEO → **alle 17 mit such-starkem SEO gefüllt** (Nutzen + CHF-Preis + Trust + WELCOME10),
  live via MCP. Alle 17 haben auch ein Produktbild = komplett.
- Beispiele: WC-Rollenhalter «Shelfy», Vakuumierer «FreshSeal», Messerschärfer «SharpPro», Riviera-Espadrilles,
  Bamboo-Bluse/-Shirt/-Pullover, Lisbon-Slipper, Lash-Lift Kit u. a.
- **Punkt 3 (neue Produkte):** Katalog ist bereits gross (1 143 aktiv). Neuer CJ-Import braucht `CJ_EMAIL`/`CJ_API_KEY`
  (Secrets aktuell nicht gesetzt) → erst sinnvoll, wenn gezielt Lücken gefüllt werden sollen.

## 🧭 Mehr Unterkategorien (User 2026-06-13) — live via Shopify-MCP
Smart-Regel-Muster: **TAG geschlecht UND TITEL enthält <Typ>** (+ NOT_CONTAINS Set) → garantiert sortenrein.
Alle publiziert (Onlineshop + Kanäle), Titelbild + SEO-Text gesetzt, ins Hauptmenü eingehängt.
- **Herren-Subs (neu):** `herren-shirts` (👕 Shirts&Tops, 9) · `herren-hemden` (👔, 6) · `herren-hosen` (👖, 14) ·
  `herren-sets-sub` (🩳, 39) · + `herren-schuhe` neu im Menü verlinkt. Herren-Dropdown jetzt: Für Ihn · Shirts ·
  Hemden · Hosen · Sets · Schuhe · Uhren · Bart&Rasur · Schmuck · Sonnenbrillen.
- **Damen-Subs (neu):** `damen-blusen` (👚 Blusen&Tops, 5) · `damen-hosen` (👖, 4) · `damen-sets` (👗 Sets&2-Teiler;
  Schmuck-Sets via **TAG≠schmuck** ausgeschlossen). Frauen-Dropdown ergänzt um Blusen/Hosen/Sets.
- **Gender-Fix:** Strick-Pullover «Bamboo» (Frauen-Bild) war fälschlich `herren` → auf `damen` umgetaggt (raus aus
  „Für Ihn"). Gegen-Check: 0 weitere Fehl-Sortierungen (nur legitimer Unisex-Kaschmir-Schal).
- **Lehre:** Konjunktive Smart-Regel kann nicht OR — pro Sub EIN Titel-Keyword; Schmuck/Sets via NOT_CONTAINS bzw.
  TAG≠schmuck ausschliessen. Publish-Falle: neue Collections IMMER `publishablePublish` (sonst 404 im Menü).
