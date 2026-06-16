# 🖼️ POD-Mockup-Auftrag (für PC-Claude / Gelato-Printful-Pipeline)

**Problem (User 2026-06-16):** „fehlen Livebild Mauspad, sonst sieht man nicht wie gross das ist."
Audit-Ergebnis: **487 von 490 POD-Produkten** (Tag `printful_personalized_product`) zeigen NUR ein flaches
Design-Bild — kein Mockup, kein Maßstab, kein Lifestyle-Foto. Kunde kann Grösse/Wirkung nicht einschätzen.

**Vollständige Liste:** `dropship/pod_no_mockup.jsonl` (487 Zeilen: `{id,title,productType,images}`).

## Warum nicht aus der Cloud-Session
Die Cloud-Session kann **keine fotorealistischen Mockups rendern** (kein Brave, keine Gelato/Printful-Mockup-UI,
keine echten Produktmaße). Echte Mockups + korrekte Maße liefert die **PC-Claude-Pipeline** (Brave Port 9222,
Gelato/Printful eingeloggt) bzw. die Gelato-Mockup-API. Erfundene cm-Angaben wurden bewusst NICHT gesetzt.

## Auftrag (priorisiert — 3D-/grössenkritische Typen zuerst)
Für jedes Produkt: **mind. 1 Mockup mit Maßstab-Referenz** als ZWEITES Bild ergänzen (flaches Design als Hauptbild
behalten oder Mockup nach vorne — Lifestyle wirkt meist besser). Maßstab = Hand/Maus/Münze/Person im Bild.

| Prio | productType | Anzahl | Mockup-Empfehlung (mit Grössen-Bezug) |
|---|---|---|---|
| 1 | Mauspad (25) | 25 | Mauspad auf Schreibtisch **mit echter Maus + Tastatur** → Grösse sofort klar; Gelato zeigt Maße |
| 2 | Tasse / MUG (56) | 56 | Tasse in Hand / auf Tisch mit Kaffee → 330 ml sichtbar |
| 3 | Tasche (31) | 31 | Tote über Schulter / an Person getragen → Grösse klar |
| 4 | Kissen (26) | 26 | Kissen auf Sofa → Grösse im Raum |
| 5 | T-Shirt/Shirt/CUT-SEW (~70) | 70 | On-Model oder Flat-Lay mit Maßband/Grössentabelle-Bild |
| 6 | Magnet (7), Poster (1) | 8 | Magnet am Kühlschrank / Poster an Wand mit Möbel-Bezug |
| 7 | Sticker (268) | 268 | Sticker auf Laptop/Flasche **mit cm-Lineal** oder neben Münze (Grösse!) |

**Technik (PC-Claude / Gelato-Mockup-API):**
- Gelato `mockup`-Endpoint bzw. Dashboard-Mockup-Generator je productUid (Map: `cloudflare/gelato_map.json`).
- Design-PNGs liegen in `pod/swiss-edition/` (+ Welle-2) bzw. sind aus dem aktuellen Hauptbild ableitbar.
- Ergebnis-Bild je Produkt per Shopify-`productCreateMedia` (oder Cloud-Session via MCP) als zusätzliches Bild anhängen;
  Alt-Text = Produkttitel. Bei Lifestyle-Hero: Reihenfolge so, dass das Mockup vorne steht.

**Sticker-Hinweis:** 268 Sticker = grösster Block, aber flach → Mindestlösung = ein **cm-Lineal/Münze** im Bild
(reine Grössenreferenz), kein aufwändiges Lifestyle nötig. Mauspad/Tasse/Tasche/Kissen zuerst (höchster Conversion-Hebel).

## Danach (Cloud-Session, automatisierbar)
Sobald Mockups als Medien hochgeladen sind: Bildreihenfolge/Alt-Texte via MCP ordnen; `alt_text_guard.mjs` füllt
fehlende Alt-Texte. Fortschritt gegen `dropship/pod_no_mockup.jsonl` abgleichen (erledigt = >1 Bild).
