# R299 – Gewünschte Veröffentlichung der Startseite vorbereitet – 21.11.2026

Der Inhaber hat Film und Einkaufskacheln zur Live-Schaltung freigegeben. Shopify-Shop 94368563585 und luxestyle.ch sind bestätigt. Öffentlicher MAIN-Stand nach dem Speichern ist weiterhin Theme 214169584007. Das öffentliche HTML zeigte den bisherigen Aufmacher und die bisherigen Kacheln.

## Neue Filmdateien

Die geprüften Originale aus R298 wurden in Shopify Files registriert. Beide sind READY, 32 Sekunden und 60 fps. Die vom öffentlichen Shopify-CDN zurückgeladenen Originale stimmen bytegleich mit den freigegebenen Fassungen überein. Teilabruf HTTP 206 auf beiden URLs bestätigt. Der Release-Kandidat bindet diese Originale getrennt für Desktop und Handy ein.

| Fassung | Shopify-Video-ID | Format | SHA-256 | Quelle |
|---|---|---|---|---|
| Desktop | 78154351313287 | 3840 × 2160 | `2bd87343cebc6889e73cab525e06510dca2cc35f57bd7826a1fb722219141c90` | [Shopify-Original](https://cdn.shopify.com/videos/c/o/v/bd45f8cab78849a5970b0fc8f9073cd8.mp4) |
| Handy | 78154351346055 | 1080 × 1920 | `afae0004b3177217a64f2b5f9773ef3aad3b2e9b0fde21780139be357796d058` | [Shopify-Original](https://cdn.shopify.com/videos/c/o/v/2a85604fa9fd4a1abb0270fd5b993cd8.mp4) |

## Release-Kandidat und Publikationsgrenze

Vollvergleich der vorhandenen Vorschau 214208577927 mit MAIN ergab 20 auseinanderlaufende Dateipfade, auch in Collection, Navigation und Produkt-Templates. Auf Basis des aktiven Themes wurde ein gezielter Startseiten-Patch vorbereitet. Die angewendeten Inhalte umfassen R292/R295-Aufmacher und Spotlight, R297-Kacheln und den R298-Film. Der korrigierte Desktop- und Mobil-Screenshot zeigt Titel, Bild und die neuen Originalkacheln im vorgesehenen Layout.

Shopify Theme-Commit `fa3792c8e27964110f26a485c7936e4fb051144b` hat den Patch als zur Veröffentlichung wartende Version gespeichert. Die Rückgabe bündelt unsere zehn Startseiten-/Übersetzungsdateien mit 13 im selben Theme bereits wartenden Dateien. Diese zusätzlichen Änderungen sind ausserhalb der Freigabe für diese Startseite. Beispiele sind Header, Collection- und Produkt-Templates sowie Meta-Tags. Theme-Veröffentlichung würde das gesamte Paket umfassen. Daher ist keine Veröffentlichung erfolgt. Die einzelne, unveröffentlichte Startseiten-Version ist im bestätigten Commit dokumentiert. Für eine getrennte Veröffentlichung wurde der Inhaber um Zustimmung zu einer sauberen Kopie des aktuellen öffentlichen Themes gebeten.

Geprüfte zusätzliche wartende Pfade

- `DESIGN.md`
- `blocks/_announcement.liquid`
- `sections/header-announcements.liquid`
- `sections/header-group.json`
- `sections/lx-collection-details.liquid`
- `sections/lx-collection-welten.liquid`
- `snippets/lx-collection-welten-card.liquid`
- `snippets/lx-kopf-pfad.liquid`
- `snippets/meta-tags.liquid`
- `templates/collection.json`
- `templates/collection.lxwelten.json`
- `templates/product.json`
- `templates/product.lxszene.json`

Kandidaten und lokale Vergleichsdaten unter `/tmp/luxe-live-20261121/`. Keine Änderung an Produkten, Preisen, Navigationsdaten oder Metricool durch diesen Auftrag. [Öffentliche Startseite](https://luxestyle.ch/)
