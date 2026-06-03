# LuxeStyle CH — Dropship-Produkt-Pipeline

> Stand: 2026-05-30 · Store: luxestyle.ch (Shopify Basic, CHF) · Fulfillment: CJdropshipping via DSers
> Ziel dieser Session: CJ-Dropship-Sortiment von 8 → 20-30 fulfillment-fähigen SKUs ausbauen.

---

## 1. Ist-Zustand (live geprüft via Shopify Admin API)

| Kennzahl | Wert |
|---|---|
| Produkte gesamt | **5.288** |
| Davon ACTIVE (live) | **1.148** — manuell bestückt, Vendor „LuxeStyle CH", echte Lagerbestände |
| Davon mit CJ-SKU (`CJ-…`) | **8** — die einzigen echt CJ-fulfillbaren Dropship-Produkte |
| Drafts (Bulk-Import, `sku:null`) | **~4.130** — NICHT auto-fulfillbar, kein CJ-Binding |
| Offene Bestellungen | #1001 (CHF 21.90, bezahlt, unfulfilled) |

**Kernproblem:** Nur 8 Produkte haben ein echtes CJ-Lieferanten-Binding. Alle anderen Drafts
sind Hüllen ohne SKU — DSers/CJ kann sie nicht erfüllen. „Mehr Produkte" heißt also:
**echte CJ-Produkte über DSers importieren**, nicht Drafts live schalten.

### Die 8 live CJ-Produkte (heute aktiviert)
| Produkt | Preis | CJ-SKU |
|---|---|---|
| Elektrischer Gemüseschneider Multifunktional | 39.90 | CJ-CJJT172393804DW |
| LED Schreibtischlampe Akku | 34.90 | CJ-CJJT194948101AZ |
| Mini Bluetooth Speaker Wasserdicht | 29.90 | CJ-CJYP117078804DW |
| Outdoor Bluetooth Speaker Solar RGB | 54.90 | CJ-CJYS260671001AZ |
| Rugged Smartwatch X5 | 79.90 | CJ-CJJX235873303CX |
| Smartwatch Pro 1.78″ AMOLED | 69.90 | CJ-CJZN169265501AZ |
| Aroma Diffuser Hohl-Design | 44.90 | CJ-CJJJJTJT35117 |
| Aroma Diffuser 400ml 7 LED | 44.90 | CJ-CJJJTJT22925 |

---

## 2. Marktrecherche (autonom, 2026-05-30)

Validiert gegen: Switzerland-2026-Trendreport (overviewdata.io), Summer-Winning-Products
(sellthetrend.com), AliExpress/CJ-Trending-Listen, TikTok-Summer-Discover.
Cross-Check: Produkte mit Switzerland-Signal **UND** Summer-Signal priorisiert.

### Bereits im Store abgedeckt (kein Neu-Import nötig)
Nacken-Ventilator · Pool-Liege/Schwimmring · Sandfreies Strandtuch · Kühlbox · Picknick-Set
· Kofferraum-Organizer · MagSafe-Auto-Halter · 3-in-1 Gemüseschneider (= CJ-live).
→ Summer-Basics sind da. Lücke liegt bei **CJ-fulfillbarem Nachschub** + echten Gap-Produkten.

### LÜCKEN — validierte Trends, die im Store FEHLEN (Import-Kandidaten)

| # | Produkt | Signal | Marge* | Saison | TikTok-tauglich |
|---|---|---|---|---|---|
| A | **High-Power Wasserpistole** (Akku/Elektrisch) | Summer-viral | ~55% | ☀️ Jetzt | ⭐⭐⭐ (Action-Demo) |
| B | **Bartglätter-Kamm** (heated beard straightener) | CH-Trend, low-sat | ~50% | Ganzjahr | ⭐⭐ (Before/After) |
| C | **Orthopädisches Gel-Kissen** | CH-Trend | ~50% | Ganzjahr | ⭐ |
| D | **Beheizte Winterhandschuhe USB** | CH #3 | ~50% | ❄️ Q4 (vormerken) | ⭐⭐ |
| E | **Sand-freie Strandmatte XL** (nicht Tuch) | Summer | ~45% | ☀️ Jetzt | ⭐⭐⭐ (Sand-Demo) |
| F | **Tragbarer Mini-Akku-Luftpumpe** (Pool/Camping) | Summer-Util | ~50% | ☀️ Jetzt | ⭐⭐ |
| G | **Matter Smart-Plug** (Apple/Google, hub-less) | Tech-Trend 2026 | ~45% | Ganzjahr | ⭐ |
| H | **LED Gesichtsmaske** (Beauty-Device) | Konstant top-order | ~55% | Ganzjahr | ⭐⭐⭐ |

\* Marge = Richtwert aus Trendreports (VK CH vs. CJ-Kost), in DSers final prüfen.

---

## 3. Umsetzungs-Workflow (DSers → Shopify)

Fulfillment-Binding entsteht NUR über DSers' eigenen Import. Pro Kandidat:

1. **DSers** → „Find Suppliers" / AliExpress-Import → Produkt suchen (Kandidat A-H).
2. Lieferant wählen: **CH-Versand < 12 Tage**, Rating > 95%, > 500 Orders.
3. „Push to Shopify" → erzeugt Produkt **mit CJ/AliExpress-SKU** (= fulfillbar).
4. Danach übernehme ich (Claude) in Shopify:
   - Titel + DE-Copy im LuxeStyle-Stil (Highlights-Liste + 🇨🇭-Trust-Zeile + WELCOME10)
   - Tags: `cj-real`, Kategorie, `NEU 2026`, `tiktok-ad-live` (falls Ad geplant)
   - Preis: VK auf CHF .90 runden, Marge ≥ 2.5× CJ-Kost
   - Inventar-Policy: `DENY` + untracked (= immer bestellbar)
   - Collection „Neu 2026" + Status ACTIVE
5. Ziel-Batch: **A, E, F, H jetzt** (Summer + ganzjährig) → +4 SKUs = 12 total.
   B, C, G als zweite Welle. D im September.

---

## 4. Offene Blocker (brauche dich)

- **DSers-Login:** Ich kann DSers nicht autonom bedienen (Login-gated, kein Desktop/Display
  in dieser Umgebung, und ich frage keine Passwörter ab). Die DSers-Importe (Schritt 1-3)
  machst du; Schritt 4-5 (Shopify-Veredelung + Live) fahre ich autonom zu Ende.
- Alternativ: Schick mir **CJ/AliExpress-Produkt-Links oder einen CSV-Export** (SKU, Titel,
  Bild-URLs, Kost) — dann lege ich die Produkte direkt fulfillment-fähig in Shopify an.
