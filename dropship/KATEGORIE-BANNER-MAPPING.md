# 🖼️ Kategorie-Banner ↔ Collection (FEST — nicht überschreiben!)

Die 9 Kategorie-Collections zeigen als **Collection-Bild** die selbst erstellten Marken-Banner
(Creme/Taupe/Gold, `automation/gen_category_banners.py`). **⚠️ Andere Sessions/Bots: das
Collection-Bild dieser 9 NICHT durch Produktfotos ersetzen** — sonst sind die Banner wieder weg
(passiert am 2026-06-13 schon einmal; per API wiederhergestellt).

| Collection (handle) | Banner-Datei (CDN /files/) |
|---|---|
| damen-mode | cat-frauen.jpg |
| fur-ihn | cat-herren.jpg |
| premium-schmuck | cat-schmuck-v2.jpg |
| schuhe | cat-schuhe.jpg |
| wohnen-dekoration | cat-wohnen.jpg |
| premium-beauty | cat-beauty.jpg |
| trends-gadgets | cat-trends.jpg |
| premium-geschenke | cat-geschenke-v2.jpg |
| unter-chf-25 | cat-sale.jpg |

Basis-URL: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/<datei>`

**Wieder anhängen (falls erneut überschrieben):** `collectionUpdate(input:{id, image:{src:"…/cat-*.jpg"}})`
für jede der 9 (IDs via `collectionByHandle`). **Anzeige auf der Kategorieseite** braucht zusätzlich die
Theme-Sektion „Collection banner" (Customizer) — siehe `dropship/WEBSITE-LAYOUT-REDESIGN.md`.
