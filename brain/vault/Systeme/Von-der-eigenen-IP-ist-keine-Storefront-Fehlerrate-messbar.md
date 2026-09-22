---
tags: [system]
quelle: Journal 2026-09-20 · 🎯 Vierzig von vierzig Treffern
gelernt: 2026-09-22
---
# Von der eigenen IP ist keine Storefront-Fehlerrate messbar

Unser Ausgang bekommt vom Shopify-Edge eine eigene Cache-Kopie (19.08. zweimal belegt), und ein Cache-Treffer kann gar nicht scheitern — eine Fehlerquote ist von hier prinzipiell nicht bestimmbar. Das einzige ehrliche Fenster ist der Hetzner-Agent (automation/browser/storefront_wahrheit.mjs), der am 20.09. eine echte Shopify-Fehlerseite sah (17'568 B statt 240'000 B). Er lädt die Startseite 5× je Lauf (Versuch 1 ohne Cache-Bust = was eine Kundin sieht, 2–5 mit), meldet beide Zahlen getrennt, macht je Fehlversuch ein Bild, und EIN Fehlschlag ist ein Befund (keine Mehrheitsregel). Inhaltsprüfungen nur am geladenen Versuch.

Verwandt: [[Hypothese-mit-Datum]]
