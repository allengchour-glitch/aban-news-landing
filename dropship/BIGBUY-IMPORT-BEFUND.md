# 🔍 Befund: BigBuy/KI-Massen-Import (Live-Audit 2026-06-27)

> Read-only Live-Audit via Shopify-Admin-API (Client-Credentials-Token). **Es wurde nichts am Shop geändert.**
> Begleit-Liste mit allen Risiko-Produkten + direkten Admin-Links: **`dropship/bigbuy-risiko-kandidaten.csv`**.

## Lage
- Shop **LuxeStyle** (au3j0y-hq, CHF): **5.006 Produkte gesamt · 4.780 ACTIVE · 223 DRAFT · ~3 archiviert.**
- Davon **529 `cj-real`** (die sauber gepflegte, fulfillbare Kern-Linie): **0 FAILED-Bilder, 0 fehlende SEO, 0 leere Alt-Texte** — makellos.
- **4.251 aktive Produkte OHNE `cj-real`** = neuer Massen-Import.

## Herkunft (eindeutig per Tags/Datum)
- Erstellt fast komplett **im Juni 2026** (3.933 Juni + 318 Mai) → kein altes Archiv, sondern frischer Import.
- Quelle: **BigBuy** (Tag `bigbuy` = 3.336) + KI-Texte (`ls-ai-deep`, `ls-ai-desc`).
- SKU: 11 CJ · **3.932 Fake-SKU** · 308 ohne SKU → über die CJ/DSers-Pipeline **nicht erfüllbar**
  (nur über eine BigBuy-Fulfillment-App, falls verbunden — **offene Frage an den User**).

## 🔴 Risiken (verstoßen gegen §5/§9 des Runbooks)
| Gruppe | Anzahl | Problem |
|---|---|---|
| **Marke/IP** | **765** | Adidas (53), Puma (57), Nike (24), Disney/Frozen, New Era, Converse, Reebok, Champion, Head, Vans … → Markenrechts-/Fälschungsrisiko (Wiederverkauf ohne Autorisierung) |
| **Safety/Haftung** | **113** | Baby-Lätzchen, Baby-Body, Lern-Tablet Kinder, Schwimmring/Pool-Float, Schwimmbrille, Kinder-Markenschuhe → §9 verbotene Kategorien |
| **Dubletten** | **293** | Mehrfach identische Titel |
| **Risiko gesamt (dedup.)** | **1.082** | siehe CSV |

## Bewertung
Der Juni-Import widerspricht der dokumentierten Strategie (SESSION-HANDOFF: „CJ-only"; §5/§9: keine Marken,
kein Baby/Schwimm-Safety) und bringt — bei den Markenartikeln — **echtes rechtliches Risiko** in einen
kundensichtbaren Shop. Wahrscheinlich lief eine BigBuy-App + KI-Enrichment-Pipeline an, ohne die Hartfilter
des CJ-Runbooks.

## Empfehlung (reversibel, keine Löschung)
1. **Dringend:** die **765 Marken-/IP- + 113 Safety-Produkte auf DRAFT** setzen (aus Storefront nehmen, voll
   reversibel). → CSV-Spalte `gruppe` = `marke`/`safety`.
2. **Strategie-Entscheidung (User):** Hast du eine BigBuy-Fulfillment-App? Wenn ja, kann der nicht-markige
   Rest bleiben; wenn nein, den kompletten Nicht-CJ-Import auf DRAFT → Shop zeigt nur die 529 sauberen cj-real.
3. **293 Dubletten** bereinigen.

> Der User hat diese Session entschieden: **nur Liste, nichts ändern.** Die Aktion (DRAFT/Bereinigung)
> erfolgt also manuell im Admin (CSV-Links) oder auf ausdrückliche Freigabe in einer Folge-Session.
