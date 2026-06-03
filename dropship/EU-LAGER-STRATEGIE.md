# CJ-EU-Lager-Strategie (Frankfurt) — schneller CH-Versand ohne 2. Plattform

> Entscheidung 2026-05-30: CJ als Basis behalten + um EU-Lager-Sourcing ergänzen.
> Kein neuer Account, keine Abo-Gebühr. Reine API-Filter-Logik.

---

## Warum

CJ liefert aus China in 7–14 Tagen — das ist die größte Conversion-Bremse für CH-Kunden.
CJ hat aber ein **Frankfurt-Lager (DE)**: Artikel mit EU-Bestand kommen in **5–10 Tagen**
in die Schweiz. Statt zu Spocket/Syncee zu wechseln, sourcen wir gezielt CJ-EU-Lager-Artikel.
Vorteil: 0 € Abo, bestehendes Setup + die 8 Live-SKUs bleiben, ein einziges Fulfillment-Konto.

## Wie (API-verifiziert)

Die CJ-API filtert nach Lager-Land:

| Endpoint | Param | Wirkung |
|---|---|---|
| `/product/list` | `countryCode=DE` | nur Produkte mit DE/EU-Lagerbestand |
| `/product/query` | `countryCode=DE` | nur Varianten mit EU-Bestand |
| `/product/globalWarehouseList` | – | Liste aller CJ-Lager (DE/US/CN…) |

Response-Detail: jede Variante hat `inventories[]` mit `{countryCode, totalInventory,
cjInventory, factoryInventory}` → beim Anlegen **nur Varianten mit EU-Bestand > 0** übernehmen.

## Umsetzung im Script

`dropship/cj_import.mjs` liest jetzt `CJ_COUNTRY`:
```
CJ_EMAIL=allengchour@gmail.com CJ_API_KEY=<key> CJ_COUNTRY=DE node dropship/cj_import.mjs
```
→ liefert nur EU-bevorratete Treffer der validierten Kandidaten.

## 2-Tier-Sortiment-Logik (Hybrid in EINEM CJ-Konto)

| Tier | Quelle | Versand | Positionierung | Tag |
|---|---|---|---|---|
| **Express** | CJ-EU-Lager (`countryCode=DE`) | 5–10 T | Hero-/Ad-Produkte, „Schnell aus EU geliefert" | `eu-lager`, `express` |
| **Standard** | CJ-China-Lager | 7–14 T | Long-Tail, Nischen, Margen-Ware | `cj-real` |

→ Ad-Produkte (TikTok) IMMER aus EU-Lager (schnelle Lieferung = weniger Storno/Beschwerden).
→ Produktseite: bei EU-Artikeln Versand-Badge „📦 Versand aus EU · 5–10 Tage" statt „7–14".

## Nächster Schritt (morgen, nach Limit-Reset)

1. `CJ_COUNTRY=DE node dropship/cj_import.mjs` für Kandidaten A/E/F/H (Summer + ganzjährig).
2. Pro EU-Treffer: in Shopify anlegen, Tag `eu-lager`+`express`, Versand-Badge in Copy,
   Marge ≥ 2.5× Kost, Collection „Neu 2026 · Express-Versand", ACTIVE.
3. Falls ein Kandidat NICHT im EU-Lager: entweder China-Tier (Tag `cj-real`) oder Alternative
   suchen. Nicht beides vermischen ohne klare Versandauszeichnung.
