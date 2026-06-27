<!-- Auto-Website-Audit 2026-06-27, 6 Agenten (luxestyle.ch live). NUR INFO/Empfehlungen für die Shop-/Produkt-Session. -->

Hier ist der zusammengefasste Audit-Report.

# LuxeStyle CH — Website-Audit (konsolidiert)

**Stand:** für die Produkt-/Shop-Session · Theme: Shopify **Horizon** (`main-menu` id 310224093569) · Fokus: mobile-first DACH/Social-Traffic.

---

## 🏆 Die 5 wichtigsten Quick-Wins (sofort, höchster Hebel)

1. **🚨 Compliance — echte Markennamen RAUS (Kategorie/Recht):** Nike, Adidas, Puma, Chanel, Hugo Boss, Calvin Klein, Michael Kors, Dolce & Gabbana etc. aus Menü (`🏷️ Marken` + `Premium & Marken`) und Shop entfernen. Verstoss gegen Regel „keine Markenware" → Markenrecht-, Stripe/PayPal-Sperr- und Trust-Risiko. **Beide Marken-Dropdowns auflösen.**
2. **Menü auf 5–7 Top-Level eindampfen (Kategorie/Layout):** Statt 17 Einträge → `Frauen · Herren · Schmuck & Accessoires · Wohnen & Lifestyle · Selbst gestalten · Sale`. Bestehende `sub-*`-Smart-Collections als Unterpunkte wiederverwenden (vorher `publishablePublish` in Online-Store-Publication — sonst 404).
3. **Startseite mobil entschlacken (Mobile):** 20 Sections → 6–8; HTML von ~2,17 MB unter 1 MB; Bild-`width=3840` (322/332 Bilder!) auf mobil ~750–1080px deckeln. Spart oft >70 % Bytes pro Bild.
4. **Lieferzeiten shopweit vereinheitlichen (Conversion/Trust):** Aktuell 3 widersprüchliche Angaben (Bar „2–7 T / EU-Lager" vs. Produktseite „7–14 T" vs. Policy „7–12 T"). Eine ehrliche Aussage überall ausspielen. Gravierendstes Trust-Leck.
5. **Reviews-Sterne auf Karten + Hero aktivieren (Conversion):** Judge.me-Sterne auf Produktkacheln (Home + Collection) einschalten; echte ≥4★-Gewinner (Slim Wallet/Herrenuhr/Smartwatch 5,0★) sichtbar machen. Stärkstes Social-Proof-Signal bei Kalttraffic — korreliert direkt mit der aktuellen 0 %-Conversion.

---

## 1. Kategorie-Struktur & Menü/Navigation — **schwach**

**Top-Probleme:**
- **17 Top-Level-Einträge** (Best Practice: 5–7) → endlose Scroll-Liste im Horizon-Drawer.
- **Marken-Compliance-Verstoss (kritisch):** geschützte Markennamen als Menü-Links.
- **Duplikate:** „⭐ Topseller" doppelt; zwei konkurrierende Marken-Bereiche; „🔎 Schnell finden" dupliziert die Suchleiste.
- **Inkohärentes Sortiment:** Mode/Schmuck vermischt mit Werkzeug, Ventilatoren, Drohnen, Brettspielen → Gemischtwarenladen, kein Mode-Profil.
- **Schlechte Priorisierung:** Frauen/Herren/Schmuck erst Pos. 6–8; Sale auf Pos. 16.
- **Saison-Einträge dauerhaft:** „⚽ WM 2026", „1. August" belegen feste Top-Level-Slots.

**Empfehlungen:**
- Markennamen sofort entfernen, beide Marken-Dropdowns auflösen; markenfreie Artikel unter generische Kategorien (Sportswear/Damenmode).
- Menü mode-first auf 5–7 Top-Level (s. Quick-Win 2), je 4–6 saubere Unterkategorien aus bestehenden `sub-*`-Collections; jede vorher publishen.
- Saison-Themen über Announcement-Bar/Hero/temporäre Aktions-Collection statt Top-Level.
- Branchenfremde Cluster in ein schlankes „Wohnen & Lifestyle" bündeln oder aus dem Hauptmenü nehmen.
- Max. 1 Dropdown-Ebene, je Dropdown max. 6–8 Einträge; auf echtem Handy testen.

---

## 2. Mobile-Layout & Ladegefühl — **mittel**

**Top-Probleme:**
- **HTML-Startdokument ~2,17 MB** (mobil gemessen) → schlechtes TTFB-Gefühl/Datenverbrauch.
- **Überladen:** 20 Sections, 332 `<img>`, 837 Produktkarten-Referenzen auf einer Seite.
- **322/332 Bilder mit `width=3840`** auf ~390px-Display → massiv zu gross.
- **Above-the-Fold-Stau:** Announcement-Bar + Sticky-Header + Hero + zweites Design-Banner drücken Produkte weit nach unten.
- **Früh getriggertes Email-Popup**, 14 woff2-Fonts, 6 Stylesheets im Head.

**Empfehlungen:**
- Sections auf 6–8 reduzieren, Produkt-Sections auf 4–8 Karten begrenzen.
- `sizes`/`image_width` so setzen, dass mobil max. ~750–1080px geladen wird.
- Nur Hero `eager`/`fetchpriority=high`; zweites Banner `lazy` bzw. unter den Fold.
- Popup auf Exit-Intent/>15–20 s/Scroll-Tiefe; mobil als unterer Banner statt Vollbild-Modal.
- Announcement-Bar mobil auf 1 Kernaussage; Fonts auf 1 Headline + 1 Body reduzieren; Payload erneut messen (Ziel <1 MB).
- **Beibehalten (Stärke!):** korrektes Viewport-Meta, 331/332 Bilder mit `srcset`+`width/height` (CLS-Schutz), sinnvolles lazy/eager-Split (276/52).

---

## 3. Startseite-Conversion (Hero/CTA/Trust) — **mittel**

**Top-Probleme:**
- **Hero ohne Subheadline** (nur Headline + Button) → keine Nutzen-/Versand-Reassurance.
- **Announcement-Bar überladen** (5+ statische Botschaften) → bricht mobil um, verwässert.
- **Keine Sterne auf Topseller-Kacheln** trotz Judge.me + echter 5,0★-Produkte.
- **Kein Trust/USP-Badge-Block im Body** (Trust nur in der verschwindenden Top-Bar).
- **Message-Match-Bruch:** Hero bewirbt „Sommer-Mode", erste Sektion ist „⚽ WM & Fussball 2026".
- **TWINT nicht als Signal sichtbar**; Claim „✨ Geprüfte Markenqualität" ist bei Dropship-Katalog irreführend.

**Empfehlungen:**
- Hero-Subheadline ergänzen (z. B. „Kuratierte Sommer-Looks · Versand 2–7 Tage · 30 Tage Rückgabe").
- Announcement-Bar auf 3 rotierende Botschaften (Gratis-Versand ab CHF 65 / –10 % WELCOME10 / 30 Tage Rückgabe · TWINT).
- Judge.me-Sterne auf Home-Kacheln, ≥4★-Produkte als Topseller priorisieren.
- USP-Icon-Reihe direkt unter dem Hero (🚚 Versand · ↩️ Rückgabe · 🔒 Zahlung TWINT/Visa/MC · 🇨🇭 CH-Shop).
- Erste Produktsektion auf Hero-Botschaft ausrichten (Sommer/Topseller zuerst, WM nach unten).
- Claim ehrlich machen: „Sorgfältig kuratiert · Qualität geprüft"; WELCOME10 als sichtbarer Inline-Block (Footer + On-Page), nicht nur Popup.

---

## 4. Collection-Seiten-UX & Filter — **mittel**

**Top-Probleme:**
- **679 Artikel unter einem Label „👗 Damen-Mode"** (Kleider/Röcke/Bademode/Accessoires gemischt), `sub-*` nicht als Chips angeboten.
- **„No reviews"/keine Sterne** auf Karten; **keine Farb-Swatches**; keine Sale-/„Neu"-/„Bestseller"-Badges.
- **Dünne Filter:** nur Verfügbarkeit + Preis-Slider (bis CHF 675!) + Sortierung — **Grösse & Farbe fehlen** (grösster Mode-Conversion-Hebel).
- **Preis-Ausreisser** verzerren Slider; **Sortier-Default „relevant"** könnte 3,5★-Schwachprodukt nach oben spülen.
- Mobile-Spaltenzahl/Filter-Drawer nicht verifiziert; Header-Text bei ~108 Zeichen abgeschnitten.

**Empfehlungen:**
- Sub-Kategorie-Chips oben in die Collection (Kleider · Röcke · Bademode · …) → Wand sofort kleiner.
- Judge.me-Sterne auf Karten; „No reviews" → „Neu" labeln; Farb-Swatches aktivieren.
- **Grösse + Farbe** als Facetten via Shopify Search & Discovery ergänzen.
- Preis-Ausreisser umtaggen/raus → Slider realistisch (~bis CHF 150).
- Sortierung kuratieren: ≥4★-Gewinner (Bali 4,93★, Ibiza 4,47★) oben; `niedrig-bewertet-nicht-bewerben`-Produkt nicht in den ersten Reihen.
- Mobil 2-Spalten + sichtbarer Sticky-Filter-Button (Tap-Target ≥44px); Header-Copy straffen („Mehr anzeigen").
- Dezente Badges „Bestseller"/„Neu"/auto-„Sale" (bei Compare-at-Preis), keine Fake-Knappheit.

---

## 5. Trust/Checkout-Signale — **mittel**

**Top-Probleme:**
- **Widersprüchliche Lieferzeiten** (Bar 2–7 T / EU-Lager · Produktseite 7–14 T · Policy 7–12 T) → unseriös, Storno-Grund.
- **„EU-Lager"-Claim** für CJ-Artikel nicht haltbar (Policy nennt China/Zoll) → irreführend (UWG-Risiko CH).
- **Praktisch keine Reviews** („Be the first…") → grösster Conversion-Killer bei Kalttraffic; deckt sich mit 0 % Conversion.
- **Englische System-Texte** im DE-Shop (Judge.me-Default nicht lokalisiert).
- **Zahlungs-Badges nur Text** statt Logos; **kein Express-Checkout** (Shop Pay/Apple Pay/Google Pay) sichtbar.
- Rückgabe-Wording uneinheitlich („30 Tage Rückgabe" vs. „Geld-zurück-Garantie").

**Empfehlungen:**
- **Sofort** EINE ehrliche Lieferzeit shopweit (z. B. CH 7–12 Werktage; BigBuy-EU separat „2–7 Tage"); überall identisch.
- „EU-Lager" nur dort, wo es stimmt; sonst „schneller, getrackter Versand".
- Judge.me-Sterne auf Kacheln + Widget-Sprache **Deutsch** („Keine Bewertungen").
- Echte Zahlungs-Logos (TWINT/Visa/MC/PayPal/Apple Pay) im Footer + unter ATC; Express-/Dynamic-Checkout aktivieren.
- Rückgabe-Wording überall angleichen; Trust-Icons + Zahllogos nah an den (Sticky-)ATC.
- Post-Purchase-Review-Mail scharfschalten, 1–2 Hero-Produkte mit ersten Reviews priorisieren.

---

## 6. SEO & Auffindbarkeit — **gut**

**Top-Probleme:**
- **Kein `og:image`** (verifiziert) → keine Social-Vorschaubilder (Pinterest/FB/WhatsApp/Threads) — kritisch, da Pinterest der geplante Gratis-Hebel ist.
- **Kein Französisch:** hreflang nur de/en/it/x-default, `/fr` = 404 → ~23 % CH-Suchnachfrage (Romandie) verloren.
- **Home-H1 generisch & versteckt:** `<h1 class="visually-hidden">LuxeStyle</h1>` ohne Keywords.
- **Meta-Description 215 Zeichen** (wird bei ~150–160 gekürzt).
- **`html lang="de"`** statt `de-CH` (schwächeres Geo-Signal; JSON-LD ist bereits `de-CH`).
- Kein indexierbarer Fliesstext auf der Home (99 H3, 8 H2, aber kein SEO-Textblock).

**Empfehlungen:**
- `og:image` (1200×630 Markenbild) in `theme.liquid` ergänzen; Produkt-Templates mit `product.featured_image`.
- Französische Locale aktivieren (`/fr` live, hreflang=fr), mind. Home + Top-Collections + Bestseller übersetzen.
- Sichtbaren Keyword-H1 setzen („Premium Mode, Beauty & Lifestyle – Online-Shop Schweiz").
- Meta-Description auf ~150–155 Zeichen, Keyword + USP vorne.
- `html lang` → `de-CH`; SEO-Textsektion (~120–200 Wörter) unter den Grids.
- `aggregateRating`/`reviewCount` aus Judge.me ins Product-JSON-LD → Sterne als Rich Snippet.

---

### Gesamtbild
| Dimension | Bewertung |
|---|---|
| Kategorie-Struktur & Menü | 🔴 schwach |
| Mobile-Layout & Ladegefühl | 🟡 mittel |
| Startseite-Conversion | 🟡 mittel |
| Collection-UX & Filter | 🟡 mittel |
| Trust/Checkout-Signale | 🟡 mittel |
| SEO & Auffindbarkeit | 🟢 gut |

**Kernbotschaft:** Die technische Basis (SEO-Grundgerüst, CLS-Schutz, korrektes Viewport) ist solide. Die grössten Hebel liegen bei **Compliance (Markennamen raus)**, **Menü-/Sortiment-Fokus**, **Mobile-Payload** und vor allem **Trust/Social-Proof am Funnel** (einheitliche Lieferzeit + sichtbare Reviews) — letzteres adressiert direkt die aktuelle 0 %-Conversion. Alle Punkte sind im Horizon-Theme + Shopify-MCP autonom umsetzbar; nur die produktseitige Marken-Bereinigung berührt den Katalog selbst.