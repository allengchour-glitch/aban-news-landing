# LERNEN — YouTube-Runde «Webseite optisch und SEO» (14.09.2026, 17:40–18:30 UTC)

Betreiber: «schau in youtube für verbesserung webseite optisch und seo». Marken wie im Skill `recherchieren`:
GEMESSEN = hier nachgeprüft · QUELLE = fremde Angabe · BEHAUPTUNG = ungeprüftes Versprechen.

## 1. Quellen (GEMESSEN 17:40–17:50 UTC)
- YouTube drosselte nach zwei Abrufen erneut (HTTP 429, zweites Mal heute). Nur `c6oo8KMufJY` lieferte Kapitel:
  Hero → Kollektionen → Wertversprechen → Bestseller → Social Proof → Markenstory → E-Mail/Angebot → Speed → Trust.
- oEmbed-Titel (ohne Inhalt): `jZgXu3f2SXo` (Johannes Kliesch), `9sv4EBDRc4s` (My First Website),
  `Wk1rw4gCNB8` (SmartMoneyTutorials), `Fq9_SivnjmE` (Shopify Academy), `6gkxhdAwdIg` (searchnewseas).
- Shopify-Blog SEO-Checkliste (QUELLE): Title < 55 Zeichen, Description < 150, genau eine H1 pro Seite,
  Alt-Text ≤ 100 Zeichen, strukturierte Daten, schnelle Seite.
- Judge.me-Hilfe (QUELLE): Reviews-Karussell zeigt bis 15 neueste 5★-Bewertungen; als App-Block («Reviews Carousel -
  Legacy») ODER als Liquid über `shop.metafields.judgeme.featured_carousel` (Vintage-Anleitung 8205142).

## 2. Gegenprobe am eigenen Shop (GEMESSEN, 6 Seiten per curl + Admin-API, 17:55 UTC)
| Befund | Startseite | Produkt | Kollektion damen-mode |
|---|---|---|---|
| Title-Länge | 38–69 Zeichen über 6 Seiten | ok | ok |
| Meta-Description | **196** (>150, Shop-Einstellung, API-los) | 105 | **174 → 138** (gesetzt) |
| H1 | 1 (visually-hidden «LuxeStyle») | 1 | 1 |
| h2 VOR der H1 | 0 | **2× «Dein Warenkorb ist leer»** (Header-Cart-Drawer, `snippets/header-actions.liquid`) | **2×** |
| JSON-LD | Organization/WebSite als custom-liquid-**Sektion** (belegte 1 von 25 Plätzen) | Product/Breadcrumb ok | — |
| Social Proof über der Falz | Sterne auf Karten (Judge.me-Badge); **kein Karussell** — die Sektion `lux_jsonld` war der letzte freie Platz | Review-Widget ok | — |
| Kollektionen ≥30 Produkte ohne SEO-Beschreibung | 9 von 402 → gesetzt | | |

Bewertungsbestand (GEMESSEN Judge.me-API/Metafeld): 4'355 veröffentlicht, 3'903 mit 5★, Shop-Schnitt 4.88 aus 4'349.

## 3. Umgesetzt (alles live, Admin-API, Readback identisch; Backups in `theme_backup/*-0914`)
1. **Warenkorb-h2 weg:** beide `<h2 class="cart-drawer__heading">` in `snippets/header-actions.liquid` →
   `<div role="heading" aria-level="2">` (Barrierefreiheit gleich, Überschriften-Hierarchie sauber; `cart-drawer.js`
   greift nicht auf `h2` zu, CSS ist klassenbasiert). GEMESSEN danach: «h2 vor H1» = 0 auf allen drei Seiten.
2. **JSON-LD in den Head:** `layout/theme.liquid` trägt Organization + WebSite/SearchAction vor `</head>`, nur bei
   `template.name == 'index'` (GEMESSEN: Startseite 1× ld+json im Head, Produkt/Kollektion 0×).
3. **Kundenstimmen-Karussell** auf dem frei gewordenen Platz: Sektion `lux_kundenstimmen` (custom-liquid) direkt nach
   «⭐ Unsere Bestseller» — H2 «Das sagen unsere Kundinnen und Kunden», Zeile «4.88 von 5 · 4'349 verifizierte
   Bewertungen» aus den Judge.me-Shop-Metafeldern (nie von Hand, nie erfunden), darunter
   `shop.metafields.judgeme.featured_carousel` (15 echte 5★-Bewertungen, Locale de). Kein App-Block-Handle nötig.
   GEMESSEN per WebFetch (fremder Ausgang): Titel + Zahlenzeile sichtbar, kein «Let customers speak for us».
4. **damen-mode** SEO-Beschreibung 174 → 138 Zeichen; **9 Kollektionen** SEO-Beschreibung gesetzt;
   **Firmen & Vereine** Title-/Description-Tag gesetzt.

## 4. Nicht von hier möglich
- Startseiten-Meta-Description 196 → ≤150: Shop-Beschreibung ist nur im Admin änderbar (Onlineshop → Einstellungen)
  → Cowork-Befehl Punkt 5 (`dropship/COWORK-BEFEHL-2026-09-14.md`).

## 5. Lehren
- **«Zwei Fassungen derselben Seite»:** die Startseite hat die H1 im Header (visually-hidden), Produkt-/Kollektionsseiten
  nicht — deshalb stand der Cart-Drawer-h2 dort VOR der H1, auf der Startseite nicht. Eine Seite messen reicht nicht.
- **Ein Judge.me-Widget braucht keinen App-Block:** die Shop-Metafelder `judgeme.featured_carousel`/`all_reviews_rating`/
  `all_reviews_count` tragen das fertige Markup; custom-liquid + Klasse `jdgm-carousel-wrapper` mit
  `data-auto-install="false"` genügt, die App-Embed-Skripte hängen es an. So bleibt der Titel deutsch und in meiner Hand.
- **Ein Sektionsplatz für ein `<script>` ist Verschwendung:** JSON-LD gehört in den Head, hinter `template.name`.
