# Nie wieder #1019 — CJ-Ware laufend auf «ausgelistet» nachprüfen (28.09.2026)

**Auftrag Betreiber:** «1019 sachen nicht mehr solche passieren».

## GEMESSEN
- Aktive Produkte 49'548, davon **46'629 mit CJ-SKU** (46'224 mit auswertbarer CJ-Referenz).
- `cj_verfuegbarkeit.py` prüft jedes Produkt nur EINMAL, beim Import. Die Nachprüfung vom 27.09. deckte nur 6 Kollektionen ab, je höchstens 200 Produkte (643 Stück).
- Die Nachprüfung vom 27.09. fand **2 ausgelistete unter 643** (0,3 %). Hochgerechnet sind im übrigen Bestand etwa 150 Produkte verkaufbar, die CJ nicht mehr liefert.
- SKU-Lücke: Die alte Regel `^CJ-…` übersah Varianten-SKUs ohne Präfix (`CJLY…AZ`).

## GETAN — drei Stufen
| Stufe | Was | Wie oft | Menge |
|---|---|---|---|
| A — sichtbar | beworbene Kollektionen vollständig (neu-eingetroffen: erste 200), **besuchte Produktseiten 90 T** (ShopifyQL), Produkte in wartenden Social-Posts, `kunden-liebling` | täglich | 777 |
| B — Rest | übriger aktiver CJ-Bestand, nie geprüfte zuerst, dann die ältesten | 1'500 je Lauf, Zyklus ≤ 30 T | 46'224 |
| C — Bestellung | `cj_order_engine.py` fragt vor `createOrderV2` `product/query`; bei 1602002 wird kein Auftrag angelegt, die Ampel meldet sofort | bei jeder Bestellung | — |

- Ausgelistet (CJ 1602002) → Produkt auf DRAFT, Tags `cj-entfernt` und `cj-entfernt-<datum>` (tagsAdd).
- Jede andere Antwort gilt als «kein Urteil», nie als «ok».
- Ledger `dropship/_cj_nachpruefung.tsv` (gid, Datum, Urteil): Jede Prüfung wird sofort geschrieben. Ein Container-Neustart verliert nichts, und `fixer_keepalive` holt über `still_gestorben` bis 3× am Tag nach.
- Kanarienvögel:
  - Der #1019-Geist ergibt «weg», und zwar über die Produkt-ID UND über die Varianten-SKU.
  - Das gepostete Reel-Produkt (Laptop-Tasche) ergibt «ok».
  - `cj_ref()` erkennt 5 von 5 CJ-Formen und 0 von 2 Fremd-SKUs.
- CJ-Kosten: 10 Punkte je Abfrage, also rund 23k Punkte am Tag. Das Skript steht in `IMMER_FREI` von `cj_takt`.
- Bericht je Lauf: `dropship/CJ-AUSGELISTET-SICHTBAR.md` (mit Abdeckung «in 30 T geprüft x / 46'224»).

## Grenze
- Zwischen zwei Prüfungen kann CJ ein Produkt auslisten. Für die sichtbare Ware ist das Fenster höchstens 1 Tag, für den Rest höchstens 30 Tage.
- Stufe C fängt die Bestellung selbst ab. Die Kundin hat dann aber schon bezahlt, und es braucht Ersatz oder Rückerstattung.
