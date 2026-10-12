# Liechtenstein-Klasse «Gratis-Versand ab CHF 50» — Theme-Stellen (Stand 12.10.2026)

**Warum eine Liste statt einer Änderung:** Das aktive Theme (Horizon · LuxeStyle, MAIN) wird aus dem
Assistenten nicht geschrieben (Sicherheitsregel, siehe `shopify-publizieren`). Die Produkttexte sind
dagegen erledigt: `automation/li_gratis_text.py` hat 3'720 Produktbeschreibungen auf «in der Schweiz» gesetzt.

**Gemessen** am Theme-Snapshot `theme_live.json` (12.10. 04:28, 429 Dateien). Ersetzen je Stelle — nur der
genannte Ausschnitt, wörtlich:

| Datei | Ausschnitt heute | Vorschlag |
|---|---|---|
| `sections/header-group.json` | `🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe` | `🇨🇭 Schweizer Shop · 🚚 Gratis-Versand in der Schweiz ab CHF 50 · ↩️ 30 Tage Rückgabe` |
| `templates/index.json` | `🚚 Gratis ab CHF 50 · ↩️ 30 Tage Rückgabe · 💳 Klarna &amp; TWINT` | `🚚 Gratis in der Schweiz ab CHF 50 · ↩️ 30 Tage Rückgabe · 💳 Klarna &amp; TWINT` |
| `templates/collection.json` | `Gratis-Versand ab CHF 50, sonst CHF 7.00.` | `Gratis-Versand in der Schweiz ab CHF 50, sonst CHF 7.00.` |
| `templates/product.json` | `Gratis ab CHF 50` (Textbaustein) | `Gratis in der Schweiz ab CHF 50` |
| `templates/product.json` | `Ab CHF 50 versenden wir kostenlos.` | `In der Schweiz versenden wir ab CHF 50 kostenlos.` |
| `templates/product.json` | Liquid-Anhang `Gratis-Versand ab CHF 50 ·` (3 Stellen, split/append) | Gleicher Text wie oben, **Trennzeichen-Logik unverändert lassen** |
| `snippets/cart-summary.liquid` | `bis zum Gratisversand (ab CHF 50)` | `bis zum Gratisversand in der Schweiz (ab CHF 50)` |
| `layout/theme.liquid` | `bis zum Gratis-Versand (ab CHF 50 Warenwert)` (Balken-Text, JS) | `bis zum Gratis-Versand in der Schweiz (ab CHF 50 Warenwert)` |
| `templates/cart.json` | `gratis ab CHF 50` | `in der Schweiz gratis ab CHF 50` |

**Schon richtig:** `snippets/meta-tags.liquid` («in der Schweiz gratis ab CHF 50»), `ls-liefer`-Kasten
der Produkte («Versand nur in die Schweiz und nach Liechtenstein»).

**Achtung beim Balken** (`layout/theme.liquid`): Er rechnet mit dem Schwellenwert, nicht mit dem Land. Für
Liechtenstein bleibt der Text «in der Schweiz» dann richtig, der Balken selbst zeigt aber weiter einen
Fortschritt zu einem Gratisversand, den es dort nicht gibt. Der Text ist also nur die halbe Korrektur;
die zweite Hälfte ist die Ländererkennung im Warenkorb (nicht in diesem Lauf).

**Umsetzung:** Betreiber-Klick im Shopify-Theme-Editor ODER CLI mit Theme-Access-Token
(`shopify-publizieren`, Abschnitt «Theme veröffentlichen»). Danach `curl`-Prüfung der Startseite mit
`WebFetch` (Cache-Falle, siehe CLAUDE.md 19.08.).
