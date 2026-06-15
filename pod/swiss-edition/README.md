# 🇨🇭 Swiss-Edition Welle 1 — druckfertige Designs

Autonom generiert (Pillow, `automation/render_swiss_edition.py`). **Transparente PNGs in Druckauflösung**
(~2900 px breit ≈ 25 cm @ ~300 dpi). Design-System: Anton (condensed bold), Swiss-Rot `#D52B1E`,
Anthrazit `#1F2328`, Off-White `#F4F1EA`, Sage `#7C8C6B`.

## Auftrag für PC-Claude / Gelato — je Design auf das passende Garment (Front, mittig, DTG):

| Datei | Produkt | Garment (Gelato) | Garment-Farbe | Ink | Preis |
|---|---|---|---|---|---|
| `hoi-zaeme.png` | T-Shirt «Hoi Zäme» | Unisex-Tee (Gildan 5000) | Cream/Natural | Anthrazit + roter Punkt | 32.90 |
| `merci-vilmal.png` | Damen-Tee «Merci Vilmal» | Women's Tee | Off-White | Anthrazit + Rot | 32.90 |
| `chuchichaeschtli.png` | Hoodie «Chuchichäschtli» | Unisex-Hoodie (Gildan 18500) | **Anthrazit/Dunkel** | Off-White + Rot | 54.90 |
| `gmuetlech.png` | Sweatshirt «Gmüetlech» | Crewneck (Gildan 18000) | Sand | Anthrazit + Sage | 44.90 |
| `sali-zaeme.png` | Herren-Tee «Sali Zäme» | Unisex-Tee | **Schwarz** | Off-White | 32.90 |
| `erste-august.png` | T-Shirt «1. August» | Unisex-Tee | Off-White | Rot-Kreuz + Anthrazit | 32.90 |
| `hopp-schwiiz.png` | T-Shirt «Hopp Schwiiz» | Unisex-Tee | Cream/Weiss | Anthrazit + roter Punkt | 32.90 |
| `feierabig.png` | Sweatshirt «Feierabig» | Crewneck | Cream/Sand | Anthrazit + Sage | 44.90 |
| `grueezi.png` | T-Shirt «Grüezi» | Unisex-Tee | Cream/Weiss | Anthrazit + roter Punkt | 32.90 |
| `matterhorn-zermatt.png` | T-Shirt «Zermatt 4478» | Unisex-Tee | Cream/Weiss | Anthrazit Line-Art | 32.90 |
| `schwiizer-alpe.png` | Sweatshirt «Schwiizer Alpe» | Crewneck | Off-White | Anthrazit + rote Sonne | 44.90 |
| `edelweiss.png` | T-Shirt «Edelweiss» | Unisex-Tee | Cream/Weiss | Anthrazit + roter Kern | 32.90 |

**Welle 2 (Line-Art, `render_swiss_welle2.py`):** matterhorn-zermatt · schwiizer-alpe (Top) · edelweiss (geometrisch/Logo-Stil — kann später durch botanisches Motiv ersetzt werden).

> ⚠️ **Ink-Farbe ↔ Garment beachten:** Off-White-Designs (`chuchichaeschtli`, `sali-zaeme`) NUR auf
> dunkle Garments (sonst unsichtbar). Anthrazit-Designs auf helle Garments.

## Danach (Cloud-Session übernimmt)
DE-Titel/SEO/Alt-Texte, Tags (`schweiz-edition`,`swiss-edition`,`mundart`/`erste-august`,`gelato`,`pod`),
Collection „🇨🇭 Swiss Edition", 6 Kanäle, Werbe-Queue, Map-Update (neue Variant-IDs → `gelato_map.json`).

## Neu rendern / weitere Designs
`python3 automation/render_swiss_edition.py` (lädt Anton-Font nach `/tmp/fonts/`). Welle 2 (Kantone/Berge/
Tiere/Food) analog ergänzen — Brief: `dropship/SWISS-EDITION-AUSBAU.md`.
