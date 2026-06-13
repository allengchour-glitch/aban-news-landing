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

## 🔧 Robustheit & Wartung (für ALLE Sessions — wichtig)
**Frage: Was, wenn eine andere Session mehr Produkte postet / falsch sortiert / mehr Banner braucht?**

- **Banner brechen NIE durch neue Produkte:** Das Banner hängt am **Collection-Objekt** (`collection.image`),
  nicht an Produkten. Mehr Produkte = Banner bleibt.
- **Auto-Sortierung:** 8 der 9 Menü-Kategorien sind **Smart Collections** — neue Produkte landen automatisch per Tag/Preis:
  - `damen-mode`= Tag `damen`/`kleid`/`damen-mode`/`damen-taschen`/`sandalen`
  - `fur-ihn`= Tag `herren`/`herrenschmuck`/`herrenuhr`/`vatertag`
  - `schuhe`= Tag `schuhe` · `wohnen-dekoration`= `wohnen`/`dekoration`/`kueche`/…
  - `premium-beauty`= `beauty`+`premium` · `trends-gadgets`= `trend` · `premium-geschenke`= `geschenk`+`premium`
  - `unter-chf-25`= Variantenpreis < 25 (außer Sticker)
  → **Import-Session: korrekt taggen, dann sortiert sich alles selbst.**
- **⚠️ AUSNAHME `premium-schmuck` (Menü „Schmuck") = MANUELLE Collection** (id 687724560769). Shopify lässt sie
  **nicht** in eine Auto-Regel umwandeln. Am 2026-06-13 auf **alle 110 aktiven** Schmuckstücke (Tag `schmuck`/
  `damen-schmuck`) aufgefüllt. **Neue Schmuck-Produkte müssen entweder manuell hinzugefügt werden** (per
  `collectionAddProductsV2`, id oben) **oder** erscheinen ohnehin in den **Smart-Sub-Collections**
  `sub-halsketten`/`sub-ohrringe`/`sub-ringe`/`sub-armbaender` (Titel-Regel, auto). Discoverability ist also gesichert.
- **Neue Kategorie braucht ein Banner?** `automation/gen_category_banners.py` um einen Eintrag ergänzen → rendern →
  per Staged-Upload+`fileCreate` auf die CDN → `collectionUpdate image.src` setzen (genau wie 2026-06-13 gemacht).
  CDN-Banner-Dateien `cat-*.jpg` (inkl. `-v2`) **NICHT löschen**.

## 🎨 Hintergrund-Entscheidung (2026-06-13, research-basiert)
**Frage User: einfarbiger Hintergrund — was tun?** Recherche (ecorn/optimonk/brainspate, Premium-Fashion 2025/26):
**einfarbig hell ist Best Practice** (Produkte im Fokus) — KEINE gemusterte/verlaufende Vollseiten-Textur (wirkt billig).
→ **Entscheidung: Creme-Basis (`#faf7f2`) behalten.** Tiefe NICHT über Hintergrund-Muster, sondern über
**Sektions-Rhythmus + editoriale Bild-Bänder**.

**Exakte Customizer-Schritte (Anpassen → Startseite):**
1. Die 4 Produkt-Raster: `color_scheme` **abwechseln** statt 3× gleich → z. B. scheme-1 / scheme-2 / scheme-1 / scheme-2
   (hell/etwas-anders im Wechsel = sofort weniger flach).
2. **1 Taupe-Akzent-Sektion** (USP-Leiste ODER Newsletter) auf ein dunkleres Schema (Taupe `#8b7355`/Ink) → Kontrastpunkt.
3. **Lifestyle-Band** „Image with text" einfügen (zwischen Bestseller & Neuheiten):
   **Bild = `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/life_banner.jpg`** (schon gehostet),
   Button → `/collections/sommer`. (Text ist im Bild eingebrannt → Sektions-Textfelder leer lassen oder klein halten.)
4. **„Collection list"-Sektion** „Shop nach Kategorie" mit den 6 Hauptkategorien → zeigt die Kategorie-Banner als Kacheln.
→ Ergebnis: gleiche ruhige Creme-Basis, aber klarer Rhythmus (hell/dunkel-Band/Bild/Raster) = modern, nicht langweilig.

> Live-Theme-Writes sind API-gesperrt → diese 4 Schritte im **Customizer** (User/PC-Claude). Alle Bilder sind fertig
> gehostet (`cat-*.jpg`, `life_banner.jpg`).
