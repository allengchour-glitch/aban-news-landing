---
tags: [falle, teuer-gelernt]
quelle: dropship/WARENKORB-EINIG-2026-10-09.md
gelernt: 2026-10-09
---
# Zwei Bausteine für dieselbe Zahl widersprechen sich

Versandbalken (theme.liquid, 09.09.) und Warenkorb-Hinweis (cart-summary, 06.10.) rechneten die Gratisversand-Schwelle verschieden: derselbe Korb zeigte «noch 5.10» und «noch 10.10». Richtig war 10.10, weil jeder Zusatzartikel den Korb-Rabatt −10 % auslöst (items_subtotal_price = vor Rabatt). Beide waren einzeln gemessen und geprüft — erst die fertige Seite aus Kundensicht zeigte den Widerspruch. Regel: eine Formel an einem Ort, Test liest die gerenderte Seite. Zu viele Storefront-Testabrufe von unserer IP → HTTP 429 Bot-Schutz.

Verwandt: [[Hypothese-mit-Datum]]
