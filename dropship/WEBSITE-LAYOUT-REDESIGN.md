# 🎨 Website-Layout-Redesign — LuxeStyle (Stand 2026-06-13)

> Ziel (User): „richtige Kategorien, schöne Aufteilung, nicht langweilig, optisch gut, Hintergründe, modern."
> Theme: **Horizon · LuxeStyle + Email-Popup (Claude)** (MAIN, id 187533001089).

## ✅ Autonom erledigt (per Shopify-API, live)
**9 moderne Kategorie-Banner** generiert (1600×620, Marken-Look: Creme/Taupe/Gold, editorial, dunkler
Verlauf links + Titel + Subtitel + „Jetzt entdecken"-Pill) → auf Shopify-CDN hochgeladen → als
**Collection-Bild** gesetzt (`collectionUpdate image.src`). CDN-Dateien: `cat-frauen/-herren/-schmuck/
-schuhe/-wohnen/-beauty/-trends/-geschenke/-sale.jpg` (beim Aufräumen NICHT löschen).

| Kategorie | Collection | Banner |
|---|---|---|
| Frauen | damen-mode | cat-frauen.jpg |
| Herren | fur-ihn | cat-herren.jpg |
| Schmuck | premium-schmuck | cat-schmuck.jpg |
| Schuhe | schuhe | cat-schuhe.jpg |
| Wohnen & Wellness | wohnen-dekoration | cat-wohnen.jpg |
| Beauty | premium-beauty | cat-beauty.jpg |
| Trends & Gadgets | trends-gadgets | cat-trends.jpg |
| Geschenke | premium-geschenke | cat-geschenke.jpg |
| Sale | unter-chf-25 | cat-sale.jpg |

Tool (reproduzierbar): `automation/gen_category_banners.py`.

> ⚠️ Ob das Banner auf der **Kategorieseite** als Kopf erscheint, hängt vom Collection-Template ab. In Horizon:
> Customizer → Vorlage „Collection" → Sektion **„Collection banner"** hinzufügen/aktivieren (zeigt `collection.image`).

## 🛠 Startseite entlangweiligen — Customizer-Bauplan (NUR im Customizer, Live-Theme-Write ist API-gesperrt)
**IST:** Hero + 4 fast identische Produkt-Raster (Top10 · Neuheiten · Highlights · Geschenke) = monoton.
**SOLL** (abwechslungsreich, wie gute Mode-Shops): Sektions-Reihenfolge im Customizer (Onlineshop → Themes →
Anpassen → Startseite):
1. **Hero** (bleibt) — ggf. neues Hintergrundbild
2. **USP-/Trust-Leiste** (Sektion „Icons mit Text" / „Multicolumn"): 🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 ·
   ↩️ 30 Tage Rückgabe · 💳 TWINT & Karte
3. **„Shop nach Kategorie"** (Sektion „Collection list"): die Kollektionen
   damen-mode · fur-ihn · premium-schmuck · schuhe · premium-beauty · trends-gadgets auswählen →
   **zeigt automatisch die neuen Kategorie-Banner als Kacheln** (= Abwechslung statt nur Produkte)
4. **⭐ Top 10 Bestseller** (vorhandenes Raster, behalten)
5. **Lifestyle-Banner** (Sektion „Image with text" / „Image banner", breit): Hintergrundbild + „Sommer in der Schweiz" +
   Button → /collections/sommer
6. **✨ Neuheiten 2026** (Raster, anderes Farbschema als #4 für Kontrast)
7. **⭐ Reviews/Trust** (Judge.me-Sektion oder „Multicolumn" mit Sternen)
8. **Newsletter** (WELCOME10) + Footer
→ Punkte 2/3/5/7 brechen die Monotonie. Bilder für #3 sind schon gesetzt (Kategorie-Banner). Für #5 kann
   `automation/gen_category_banners.py` ein breites Lifestyle-Banner mitliefern.

## Warum nicht alles autonom
- **Live-Theme-Writes (Sektionen/CSS/index.json) sind über die Shopify-MCP hart gesperrt** („live_theme blocked").
  → Sektions-Umbau muss im **Customizer** passieren (User oder PC-Claude mit Browser).
- Was ohne Theme geht (Kategorie-Bilder, Menü, Collections, SEO) = autonom erledigt/erledigbar.

---
*Erstellt 2026-06-13 · Branch `claude/website-layout`*
