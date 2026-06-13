# 🎯 CJ-Import-Ziele 2026 — gewinnträchtige Produkte für die volle Automation

> Recherche-basiert (Trend-Quellen unten) + auf **Katalog-Lücken** und **Schweizer Sommer 2026** abgestimmt.
> Die CJ-Import-Pipeline (`automation/cj_gaps_import.mjs` / `dropship/cj_*_search.mjs` + `cj_enrich.mjs`) arbeitet
> diese Suchbegriffe ab — **sobald die Secrets `CJ_EMAIL` + `CJ_API_KEY` gesetzt sind** (siehe unten).
> Regeln wie immer: Bild per HTTP-200 prüfen, ACTIVE anlegen, in alle 6 Publications publizieren, Tags passend
> zu den Smart-Collections, **keine sperrigen Möbel / keine schlechten Bilder / keine Asiaten-Fotos als 1. Bild.**

## Prio A — Trend-Gewinner (hohe Marge / Sommer-Peak)
| Produkt | CJ-Suchbegriff | Ziel-Kategorie (Tags) | Ziel-Preis | Warum |
|---|---|---|---|---|
| Kühl-/Isolier-Tote (Cooler Bag) | `insulated cooler tote bag` | strand, sommer, taschen | CHF 24–34 | Such-Spike 2026, fehlt im Katalog |
| Kühltuch / Cooling Towel | `cooling towel sport` | strand, sport, sommer | CHF 9–16 | Sommer-Peak, Impulskauf |
| Anti-Diebstahl-Rucksack (RFID + USB) | `anti theft backpack usb rfid` | herren, taschen, reise | CHF 39–59 | Funktional, Reise-Trend |
| Red-Light-Therapie-Maske | `red light therapy mask led` | beauty, wellness, anti-aging | CHF 49–79 | Top-Conversion Wellness-Gadget |
| Haltungstrainer (Posture Corrector) | `posture corrector back` | fitness, recovery, wellness | CHF 19–29 | Wellness-Dauerseller |
| Klebe-Wandregal (ohne Bohren) | `adhesive floating wall shelf` | wohnen, aufbewahrung | CHF 14–22 | 65–75% Marge, kein Werkzeug nötig |
| Peel-off Nagellack-Set | `peel off gel nail polish set` | beauty, naegel | CHF 14–22 | Beauty/Nails-Trend |

## Prio B — Katalog-Lücken füllen (dünne Kategorien)
| Produkt | CJ-Suchbegriff | Ziel-Kategorie | Ziel-Preis |
|---|---|---|---|
| Hunde-Geschirr / Leine-Set | `dog harness leash set` | haustier | CHF 19–29 |
| Katzen-Brunnen (Trinkbrunnen) | `cat water fountain` | haustier | CHF 29–39 |
| Strand-Muschel / Pop-up-Zelt | `pop up beach tent sun shelter` | strand, pool, outdoor | CHF 34–49 |
| Schwimmring / Floatie (erwachsen) | `inflatable pool float adult` | pool, sommer | CHF 16–26 |
| Reise-Organizer Packwürfel-Set | `packing cubes travel set` | reise, taschen | CHF 16–24 |
| Auto-Handyhalter Kühlung | `car phone holder cooling fan` | auto-handy | CHF 19–29 |
| Kinder-Wasserspielzeug | `kids water toy summer` | baby-kids, sommer | CHF 12–22 |

## Prio C — Mode-Nachschub (Bestseller-Stil, westliche/Produkt-Fotos!)
| Produkt | CJ-Suchbegriff | Ziel-Kategorie | Ziel-Preis |
|---|---|---|---|
| Leinen-Hemd Herren (Sommer) | `men linen shirt summer` | herren, herren-mode | CHF 34–44 |
| Midi-Wickelkleid Damen | `women midi wrap dress summer` | damen, kleid | CHF 34–49 |
| Strohhut / Bucket-Hat | `straw bucket hat summer` | accessoire, sommer | CHF 16–26 |
| Espadrilles / Leinen-Slipper | `women espadrilles linen` | schuhe, damen | CHF 29–39 |

## 🔑 Aktivierung (1 User-Schritt) → dann läuft die Automation
1. GitHub-Secrets setzen: **`CJ_EMAIL`** + **`CJ_API_KEY`** (CJdropshipping-Konto → API).
   👉 https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions/new
2. Danach: `cj-gaps.yml` / `cj-autopilot.yml` importiert automatisch (sobald GitHub Actions frei ist) — ODER
   ich starte `cj_enrich.mjs` direkt, sobald die Creds verfügbar sind. **DRY-FIRST** (erst Trockenlauf prüfen,
   dann live anlegen) — frühere Läufe brachten sonst Müll (Master-Lesson).

## Quellen
- AutoDS — Best Summer Dropshipping Products 2026: https://www.autods.com/blog/dropshipping-niches/best-summer-dropshipping-products/
- Tradelle — 12 Best Summer Products 2026: https://www.tradelle.io/blog/12-best-summer-products-to-dropship-in-2026/
- Dropified — Top 50 Trending Products 2026 (Margen): https://www.dropified.com/blog/top-50-trending-dropshipping-products-to-sell-in-2026-with-profit-margins/

## ✅ Hand-Kuratierter Import (User „B", 2026-06-13) — mit CJ-Access-Token (transient)
**Befund:** Roh-Suche (`product/list?productNameEn=`) ist stark verrauscht (lose Matches, viel Müll) → NICHT blind importieren.
Methode: gezielt suchen → **Bild visuell prüfen** → nur echte Treffer anlegen.
**3 Produkte live angelegt (ACTIVE, Bild READY, in alle 6 Publications publiziert):**
- 🐶 Donut-Hundebett «Cozy» (CHF 34.90/44.90) — id 15430167855489 → 🐾 Haustier
- 💡 Akku-Tischlampe «Lumi» (CHF 44.90) — id 15430168052097 → 💡 Beleuchtung
- 🐾 Slow-Feeder Hundenapf «Slow» (CHF 19.90) — id 15430168117633 → 🐾 Haustier
**Lehren:** create-product (MCP) publiziert NICHT automatisch auf Online-Shop → IMMER `publishablePublish` nach.
Bild aus CJ-URL hängt sich **asynchron** an (in der create-Antwort erst leer, danach READY). CJ-Access-Token
läuft ~14 T (≈28.06.) → User setzt dann `CJ_EMAIL`+`CJ_API_KEY` (Weg „A") für die gefilterte Voll-Automation.

### Runde 2 (2026-06-13) — +2 kuratiert
- 🏖️ Aufblasbares Pool-Spiel «3-Gewinnt» (CHF 29.90) — id 15430169002369 → 🌊 Pool/Strand/Sommer
- 💡 LED-Wandleuchte «Spot» mit Lese-Spot (CHF 49.90) — id 15430169133441 → 💡 Beleuchtung
Übersprungen (Text-/Marken-Overlay auf 1. Bild): Pet-Feeder, Katzen-Plüsch; Fussel-Roller (Marge zu dünn, EK $22.88).
**Heute total 5 neue Produkte hand-kuratiert & live** (3+2). Volle Masse via Weg „A" (CJ-API-Key in ~14 T).

### Runde 3 (2026-06-13) — +2 kuratiert
- 🐚 Muschel-Anhänger-Kette «Coquille» (CHF 24.90) — id 15430169919873 → 📿 Halsketten/Schmuck
- 🔥 Burger-Smasher & Grill-Helfer-Set (CHF 29.90) — id 15430169985409 → ☀️ Grill & BBQ (Gap gefüllt)
Übersprungen: Strohtasche (asiatisches Model im 1. Bild), Initial-Kette (Personalisierung nötig), Ring (nur 400px).
**Heute total 7 neue Produkte hand-kuratiert & live** (3+2+2).
