# 📦 CJ-Import-Log — LuxeStyle CH

> Autonom via CJ-API importierte & live geschaltete Produkte.
> Tool: `dropship/cj_enrich.mjs` (Suche + Relevanzfilter + Detail-Anreicherung).
> Stand: 2026-05-31 — **52 Produkte LIVE** (Richtung 60 unterwegs).

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
30-Min-Loop liess sich nicht einrichten. Stattdessen manuell in dieser Session weitergefüllt.
Für echtes autonomes Nachfüllen: `/loop` in einer Umgebung mit aktivierten Scheduler-Tools,
oder Session erneut starten und Charge fortsetzen. (Desktop/Browser-Zugriff hilft hier NICHT —
der CJ-Workflow ist headless via API; das Limit ist allein der fehlende Scheduler.)

## Charge 6 (2026-05-31) — +4 live → 29 gesamt
| Produkt | VK CHF | CJ-Kost $ | SKU |
|---|---|---|---|
| Übersetzer-Kopfhörer 144 Sprachen | 69.90 | 24.00 | `CJFU29004820001` |
| Profi Messerschärfer Präzision | 21.90 | 7.46 | `CJYD291530101AZ` |
| Elegante Umhängetasche Lack-Optik | 16.90 | 4.21 | `CJNS291461101AZ` |
| Komfort-Fahrradsattel XXL gefedert | 16.90 | 4.19 | `CJYD291313201AZ` |

Aussortiert Charge 6: Cat-Paw-Anhänger & Moonlight-Ring & Silber-Feder-Ohrringe (Schmuck, off-theme),
Etagenbett ($525 EK / 28 kg), Duschkopf ($38 EK, off-theme), Toilettentasche (Duplikat bereits live).

## Charge 7 (2026-05-31) — +1 live → 30 gesamt ✅
| Produkt | VK CHF | CJ-Kost $ | SKU |
|---|---|---|---|
| Full-HD Dashcam 1080P 90° | 64.90 | 23.89 | `CJNS285014001AZ` |

Aussortiert Charge 7: Ice-Silk-T-Shirt (42 Grössen, Kleidung), Schuhschrank ($127/19 kg),
Industrie-Messwerkzeug (off-theme), Ohrclip (Schmuck), Spray-Fan (Duplikat bereits live).

**Endstand dieser Session: 30 cj-real Produkte ACTIVE & live in 6 Kanälen.** (+1 DRAFT „Shoe Rack".)

## Charge 8–13 (2026-05-31) — +10 live → 40 gesamt 🎯
| Produkt | VK CHF | CJ-Kost $ | SKU |
|---|---|---|---|
| Augenmassagegerät Bluetooth | 44.90 | 14.97 | `CJJT290442101AZ` |
| 16-in-1 Gemüseschneider | 39.90 | 14.00 | `CJCF287790001AZ` |
| Reise-Schallzahnbürste | 29.90 | 10.67 | `CJYD291548901AZ` |
| LED-Fahrradrucksack mit Blinker | 44.90 | 15.50 | `CJNS290432901AZ` |
| Selbstklebende 3D-Wimpern | 14.90 | 13.10 | `CJJJ29039800001` |
| XXL Leselupe mit LED-Licht | 16.90 | 5.03 | `CJYD290957402BY` |
| 4L Luftbefeuchter Cool-Mist | 54.90 | 20.40 | `CJJD29047400001` |
| Silikon-Abtropfmatte XL | 24.90 | 11.09 | `CJCF290358201AZ` |
| LED-Wandleuchte mit Akku | 16.90 | 2.28 | `CJYD291551202BY` |
| Edelstahl Thermo-Suppenbecher | 16.90 | 1.17 | `CJYD291498201AZ` |

Aussortiert Charge 8–13 (off-theme/Risiko): diverser Schmuck (Cat-Paw, Ringe, Ohrringe, Bangle),
Möbel >$70 (Beistelltisch, Etagenbett, Schuhschrank, Grilltisch, LED-Coffee-Table), Kleidung mit
vielen Grössen (T-Shirt, Jeans, Mules, Beach-Set, Wig), Duplikate (Zahnbürste/Spray-Fan/Snuff-Bottle),
Einzelbild-Artikel (Cleansing-Brush), Sägeblatt/Industrie-Tool, Haarentfernungscreme.

**🎯 Endstand: 40 cj-real Produkte ACTIVE & live in 6 Kanälen.** Alle Bilder verifiziert (READY),
echte CJ-SKUs fürs Fulfillment, deutsche LuxeStyle-Copy, Marge ~2,7–10×.

## Charge 14 (2026-05-31) — +1 live → 41
- 3D-Druck Nachttischlampe (`CJSN290228901AZ`, 16.90). Gua-Sha-Massager verworfen (nur 1 Bild).
- **Lehre:** CJ-Bild-Check kann `000` (Timeout) statt `200` liefern → mit längerem Timeout
  **erneut prüfen**, bevor man valide Bilder fälschlich verwirft.

## Rechts-Check (2026-05-31) — Shop ist solide aufgestellt
Shop-Policies + Pages bereits umfassend & CH-konform: Impressum (MWST-/HR-Status), AGB
(CH-Recht, Gerichtsstand Bern, Eigentumsvorbehalt, Gewährleistung OR), Widerruf (CH 30 Tage +
EU 14 Tage + Muster-Formular + Hygiene-Ausschlüsse), Versand (inkl. „direkt vom Hersteller",
längere Lieferzeit, Zoll-/Einfuhrhinweis), Datenschutz, Cookie-Richtlinie, FAQ, Garantie.
- ⚠️ **OFFEN für den User (manueller Fix):** In der Shop-Policy *AGB/Nutzungsbedingungen* steht
  noch die tote Domain `aban-192.myshopify.com` → auf `luxestyle.ch` ändern. Konnte nicht per API
  gefixt werden (Scope `write_legal_policies` fehlt dem MCP-Token). Admin → Einstellungen →
  Richtlinien → AGB.

## Charge 15 (2026-05-31) — +3 live → 44
- All-in-One Elektro-Kochtopf (`CJCJ291535201AZ`, 69.90) · Home-Projektor HY300 (`CJYD289971202BY`,
  99.90, Hero-Kandidat) · Monitor-Lichtleiste m. Sensor (`CJYD291621501AZ`, 29.90).
- **Lehre:** Beim Bündeln von Bild-URLs aus dem Terminal können sie **abgeschnitten** werden
  (PROJ/SCR hatten je 2 FAILED-Medien) → immer volle URL aus /tmp/cj_enriched.json kopieren,
  nach Anlage Media-Status prüfen, FAILED per productDeleteMedia + productCreateMedia ersetzen. ✔ behoben.

## Zweitmeinung-Tool (Stand)
`dropship/zweitmeinung.mjs` funktioniert; OpenAI-Keys vom User sind gültig, aber **ohne Guthaben**
(„exceeded quota"). → Sobald OpenAI-Billing aktiv ODER ein GEMINI_API_KEY vorliegt, liefert
`node dropship/zweitmeinung.mjs --autopilot` die externe Review.

## Charge 16–19 (2026-05-31) — +6 live → 50 LIVE 🎯
| Produkt | VK CHF | SKU |
|---|---|---|
| Kühlende Sommerdecke Cool-Feel | 34.90 | `CJYD290251301AZ` |
| Handliches Massagegerät | 44.90 | `CJYD291255301AZ` |
| Roboter Mini-Ventilator USB | 19.90 | `CJJT289858001AZ` |
| Auto-Schnellladegerät PD | 19.90 | `CJYD290828701AZ` |
| Polarisierte Sonnenbrille (Herren) | 16.90 | `CJCF291317701AZ` |
| Flötenkessel 2L Edelstahl | 44.90 | `CJHS291534201AZ` |

**Endstand: 50 cj-real Produkte ACTIVE & live in 6 Kanälen.** (Dazu 1 alter DRAFT „Shoe Rack"
mit Autopilot-Tag — bewusst NICHT live geschaltet: generische Falsch-Copy + Möbel >5kg
= dropship-untauglich. Bei Bedarf löschen oder neu betexten.)

### Massage-/Beauty-Geräte: Copy-Hinweis
Bei „Massagegerät" o.ä. KEINE medizinischen/Schlankheits-Versprechen (Fat-burning etc.) — nur
„Wohlbefinden/Entspannung" + Disclaimer „kein medizinisches Gerät". So gelistet.

### Hinweis zur Methode
Jedes Produkt: Keyword-Suche → Relevanzfilter → Bild-URLs per HTTP-200 verifiziert → angelegt →
mit der **echten** zurückgegebenen ID publiziert (geratene IDs scheitern systematisch → immer
erst create-Antwort abwarten). `published`-Counter hinkt der Indexierung ein paar Sekunden nach.

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
