# 📦 CJ-Import-Log — LuxeStyle CH

> Autonom via CJ-API importierte & live geschaltete Produkte.
> Tool: `dropship/cj_enrich.mjs` (Suche + Relevanzfilter + Detail-Anreicherung).
> Stand: 2026-05-31 — **25 Produkte live** (Ziel erreicht).

Alle: Vendor `LuxeStyle`, Status ACTIVE, publiziert in **6 Kanälen** (Onlineshop, Shop,
TikTok, Meta, Google, Pinterest), Tags `cj-real, neu, sommer-2026`, Inventar untracked
(immer bestellbar). Versand aus CJ-China-Lager (~7–14 Tage; kein EU-Bestand für diese Artikel).
Preise FX-bereinigt (USD→CHF ≈ 0,88).

## Live-Produkte (10)

| # | Produkt | VK CHF | CJ-Kost $ | Marge | Fulfillment-SKU |
|---|---|---|---|---|---|
| 1 | Elektrische Wasserpistole XL | 59.90 | 24.53 | ~2.8× | `CJYZ291559001AZ` |
| 2 | Bladeless Nackenventilator | 29.90 | 6.62 | ~5× | `CJJT291608401AZ` |
| 3 | XXL Picknickdecke faltbar | 24.90 | 2.74–5.82 | ~4.9× | `CJYD291539501AZ` |
| 4 | Ice-Compress Mini-Ventilator | 27.90 | 5.99 | ~5.3× | `CJGR291509001AZ` |
| 5 | LED Solar-Lichterkette XL | 19.90 | 2.00–5.59 | ~3.5–10× | `CJYD291508502BY` |
| 6 | Solar Camping-Laterne Vintage | 34.90 | 10.61 | ~3.3× | `CJJT291381201AZ` |
| 7 | Aufblasbarer Palmen-Sprinkler XXL | 64.90 | 28.00 | ~2.6× | `CJHD291547501AZ` |
| 8 | Kühlmatte Hund/Katze Ice-Silk | 24.90 | 0.60–5.25 | ~5–10× | `CJYD291391601AZ` |
| 9 | Edelstahl-Trinkflasche XL isoliert | 29.90 | 12.45 | ~2.7× | `CJJT291256301AZ` |
| 10 | Vintage Sonnenbrille Oval | 16.90 | 1.46 | ~10× | `CJCF289297901AZ` |

## Bestandsaufnahme 2026-05-31 (Anzahl Produkte)
- **Diese Session importiert & live:** 10 (Charge 1: 4 · Charge 2: 3 · Charge 3: 3).
- **Frühere `cj-real`-Produkte gefunden & nachpubliziert:** 8 (2× Aroma-Diffuser, 2× Smartwatch,
  2× Bluetooth-Speaker, LED-Schreibtischlampe, Gemüseschneider) — waren ACTIVE, aber in **0 Kanälen**
  (also unsichtbar). Jetzt alle in 6 Kanälen live.
- **`cj-real` aktiv & live gesamt: 18.** (+1 DRAFT „Shoe Rack" mit Tag `autopilot`, bewusst nicht live.)
- Shop-Gesamt: 5299 Produkte (Grossteil Theme-/Demo-Bestand), 383 ACTIVE.

## Charge 4 (2026-05-31) — +3 live → 21 gesamt
- Panda Handyhalter (`CJJT291503001AZ`, 14.90) · Kulturbeutel XL (`CJSB291389501AZ`, 34.90) · Vintage Baseball-Cap (`CJBQ291456801AZ`, 19.90). Alle 6 Kanäle, Bilder READY.
- Aussortiert: Sommer-Mules (Schuhe, 30 Grössen), Fishing-Rod-Rack ($85/20 kg).

## Charge 5 (2026-05-31) — +4 live → ZIEL 25 ERREICHT ✅
| Produkt | VK CHF | CJ-Kost $ | SKU |
|---|---|---|---|
| Reise-Rucksack mit Kettengriff | 29.90 | 4.70 | `CJYD290481801AZ` |
| Hunde-Snackball Intelligenzspielzeug | 39.90 | 13.60 | `CJCT291495601AZ` |
| Mini-Sprühventilator Wasserkühlung | 24.90 | 5.31 | `CJJT291288301AZ` |
| Regenschirm mit Handy-Halterung | 16.90 | 0.90 | `CJYD289701201AZ` |

**Stand: 25 cj-real Produkte ACTIVE & live (6 Kanäle).** (+1 DRAFT „Shoe Rack".)

Aussortiert in Charge 5: Glas-Hookah/Snuff-Bottle (Shisha/Tabak), Herren-Quarzuhr (off-theme),
Disinfektions-Sprühpistole (off-theme), Vintage-Jeans (Kleidung, Grössen), 30-Zoll-Tower-Fan
($54 EK / 2,5 kg, „prohibited on Amazon").

### Korrektur (Loop-Doppelanlage)
Der erste Charge-4-Lauf legte die 3 Produkte versehentlich **doppelt** an; die 3 Duplikate
wurden per `productDelete` entfernt, die Originale publiziert.

### ⚠️ Loop/Cron nicht verfügbar
`CronCreate`/`ScheduleWakeup` sind in dieser Umgebung **nicht aktiviert** → ein automatischer
30-Min-Loop liess sich nicht einrichten. Die 25 wurden stattdessen in dieser Session manuell
fertiggestellt. Für künftiges autonomes Nachfüllen: `/loop` in einer Umgebung mit aktivierten
Scheduler-Tools nutzen, oder Session erneut starten und Charge fortsetzen.

### Bei eingehender Bestellung
Produkt in CJ über die **Fulfillment-SKU** (oben) bestellen → an Kundenadresse senden lassen.

## Aussortiert (Relevanz / Qualität / Risiko)
- *High Pressure Disinfection Spray Gun* — off-theme.
- *Sterling Silver Fan-shaped Necklace* — Falschtreffer („fan"/„neck").
- *7-color LED Photon Face Mask* — nur 1 Bild, zu schwach für Hero.
- *Cross-border Microfiber Beach Towel* — Aufdruck „Frozen/Spider-Man" = **Marken-/Fälschungsrisiko**.
- *Motocross Goggles* — keine Schwimmbrille, off-theme.
- *Puffy Umbrella Skirt* — Damenrock, Falschtreffer auf „umbrella".
- *Strand-Cover-up Cardigan* — Damenkleidung, kein Strandspielzeug.
- *Baby-Schwimmring mit Sitz* — **Haftungsrisiko Kindersicherheit**, bewusst nicht gelistet.
- *Outdoor Grill Cart* — $152 EK / 29 kg → zu teuer & schwer fürs Dropshipping.

## Korrektur — gelöscht
- *Tragbarer Mini-Mixer* (SKU `CJ20240701115059212AZ`) wurde **wieder gelöscht**: basierte auf
  fehlerhaften Daten, alle Bilder hatten Status `FAILED` (URL-Pfad `cf…/quick/product/…` lieferte 404).

## ✅ Sicherheit (erledigt)
Der ursprüngliche CJ-API-Key stand in einem früheren Commit im Klartext. Er wurde am
**2026-05-31 rotiert** → alter Key ungültig (Leak in der Git-Historie damit entschärft).
Neuer Key nur noch als Env-Variable (`CJ_API_KEY`). **Empfehlung:** Key + `CJ_EMAIL` zusätzlich
als dauerhaftes Environment-Secret hinterlegen, damit er in jeder Web-Session verfügbar ist.

## Erkenntnisse (für nächste Chargen)
- **Bild-URLs vor `create-product` verifizieren** (HTTP 200). Funktionieren: `cf.cjdropshipping.com/<uuid>`
  und `oss-cf.cjdropshipping.com/...`. Teilweise 404: `cf.cjdropshipping.com/quick/product/...`.
  Nach Anlage Media-Status prüfen (READY vs. FAILED).
- **Nach `create-product` die echte zurückgegebene ID** zum Publizieren nutzen (nicht raten).
- **Keyword-Qualität:** präzise Substantiv-Phrasen matchen gut (`solar garden light`,
  `electric water gun`, `dog cooling mat`, `sunglasses`). Generische/mehrdeutige Begriffe
  (`swimming goggles`, `sun umbrella`) liefern off-theme → enger fassen.
- **Markenaufdrucke** (Disney/Marvel etc.) und **Kindersicherheits-Artikel** vor Listung prüfen.
- EU-Lager (`countryCode=DE`) bringt für virale Sommerware kaum Treffer → China-Lager nutzen.
