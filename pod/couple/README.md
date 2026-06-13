# 💞 Partner & Paare — POD-Kollektion (LuxeStyle)

Selbst gerenderte Paar-Produkte (Tassen + Shirts) im Stil des Shop-Editors.
Erstellt 2026-06-13. Mockups liegen live auf der Shopify-CDN; hier die **Quell-Generatoren**
und die **druckfertigen Design-Dateien** für Printful.

## Designs
8 Motive (transparent, hochauflösend, `print/print-*.png`):
`king`, `queen`, `mr`, `mrs`, `her-king`, `his-queen`, `hubby`, `wifey`
→ schwarze Serifen-Typo + Krone (Heart bei Hubby/Wifey).

## Regenerieren
```
python3 pod/couple/pod_couple_mugs.py     # → /tmp/couple_mugs/*-set.jpg  (Tassen-Mockups, 2 nebeneinander)
python3 pod/couple/pod_couple_shirts.py   # → /tmp/couple_shirts/*-shirts.jpg
python3 pod/couple/pod_print_files.py     # → /tmp/couple_mugs/print/print-*.png  (Druckdateien)
```
Basis-Vorlagen: `pod/templates/tasse.png` + `pod/templates/shirt-white.png` (Druckzone wird
weiss überdeckt, Design einkomponiert, Tasse/Shirt freigestellt).

## Live im Shop (ACTIVE, alle 6 Kanäle, in 💞 Partner & Paare + 🔥 Hype 2026)

### Tassen-Sets (2 Tassen, productType `Tasse`, CHF 34.90 / 39.90)
| Produkt-ID | Titel | SKUs |
|---|---|---|
| 15429994185089 | King & Queen | MUGSET-KINGQUEEN-11/15 |
| 15429994217857 | Mr & Mrs | MUGSET-MRMRS-11/15 |
| 15429994283393 | Her King & His Queen | MUGSET-HERHIS-11/15 |
| 15429994316161 | Hubby & Wifey | MUGSET-HUBWIF-11/15 |

### Shirts (Motiv × Grösse S–XXL, productType `Shirt`, CHF 29.90 / XXL 31.90)
| Produkt-ID | Titel | SKU-Prefix |
|---|---|---|
| 15429997724033 | King & Queen | SHIRT-KQ-* |
| 15429997822337 | Mr & Mrs | SHIRT-MM-* |
| 15429997855105 | Her King & His Queen | SHIRT-HH-* |
| 15429997920641 | Hubby & Wifey | SHIRT-HW-* |

Collection: `partner-paare` (smart, Regel TAG = `paar`) · im Menü unter **Schmuck**.

## ⚠️ Offen (User, manuell)
Designs (`print/print-*.png`) in **Printful** hochladen und mit den SKUs verknüpfen,
damit Bestellungen automatisch produziert werden — gleicher Flow wie die 49 bestehenden POD-Tassen.
Bis dahin: sichtbar & bestellbar, Fulfillment manuell.
