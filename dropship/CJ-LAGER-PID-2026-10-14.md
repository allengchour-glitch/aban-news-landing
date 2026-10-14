# CJ-Lagerabgleich für pid-Ware (14.10.2026, Verbesserungsrunde 16:26 UTC)

## GEMESSEN vorher
- 51'615 aktive CJ-Produkte. Davon tragen **29'013 nur die CJ-Produktnummer als SKU**: 24'023 als `CJ-<Zahl>`, 4'990 als `CJ-<UUID>`.
  29'010 davon haben genau eine Shop-Variante («Default Title»).
- `cj_lager_abgleich.py` konnte diese Produkte nicht abfragen. Im Ledger standen sie nur als «keine-cj-sku», und kein Wächter
  prüfte ihren Bestand (Leser «Wächter», Workflow wf_22f1be65). Wer so ein Produkt bestellte, bestellte ins Blaue (#1019: Produkt
  bei CJ entfernt, TRASH, erstattet).
- 74 Produkte hatten eine eigene Sperre dieses Werkzeugs. **20 davon waren inzwischen DRAFT «ausverkauft-lieferant»**:
  `lagerstand_hygiene.py` draftet ganz gesperrte Ware, der Export liest nur ACTIVE, also prüfte und gab sie niemand mehr frei.

## Was die Bestellung tatsächlich bestellt (Workflow wf_22f1be65, 4 Leser + Entwurf + 3 Prüfer)
- `cj_order_engine.vid_fuer()` (automation/cj_order_engine.py:242–353):
  - Hat CJ **eine Variante**, wird diese bestellt.
  - Sonst gilt die Zeile in `dropship/_cj_varianten_zuordnung.tsv` (erste Zeile gewinnt).
  - Sonst entscheidet ein Bildvergleich, und zwar erst beim Bestellen.
  - Der Bestand wird beim Bestellen **nirgends** geprüft (#1021: vid mit cjInventory 0 bestellt).
- `product/query?pid=…&features=enable_inventory` geht für Zahl- und UUID-pid und kostet 10 Punkte (gemessen über ein Zusatzkonto).
  Die Antwort enthält `data.pid` und `variants[].vid/inventories[].totalInventory`. Beide Proben: cjInventory 0, Fabrikbestand 8'825–11'448.

## GETAN (`automation/cj_lager_abgleich.py`, Selbsttest 50/50)
- **pid-Ware**: Abfrage nur über die **Zusatzkonten**, nie über das Hauptkonto oder den Grind-Topf. Die pid-Ware kommt ans Ende jedes Laufs.
  - Grenzen: CAP_PID 300 je Lauf und PID_TAG 600 je UTC-Tag.
  - Der Tagesdeckel zählt echte Abfragen (Zähler `/tmp/cj_lager_pid_tag.json`), nicht Ledger-Zeilen.
  - Wiedervorlage nach 21 T plus 0–14 T Streuung.
- **Regel (= Bestellweg):**
  - Eine CJ-Variante oder eine Zuordnung → Bestand genau dieser Variante.
  - Mehrere Varianten → sperren nur, wenn **alle** 0 haben. Eine eigene Sperre wird frei, sobald eine Variante wieder Bestand hat.
  - Unklar bleibt: Antwort mit fremder pid, Zuordnung ohne Treffer, Shop-Produkt mit mehreren Varianten.
  - 1602002 «aus dem Sortiment» → sperren, wie bisher.
- **Bestand unbekannt ≠ 0:** `inventories` leer oder ohne `totalInventory` zählt als «unbekannt». Vorher galt es als 0, und ein
  umbenanntes Feld hätte alles gesperrt.
- **Ledger:**
  - Die Datei wird **je Zeile** geöffnet. Ein offener Griff schrieb nach einem git-Merge in die ersetzte Datei.
  - Vor jeder Sperre steht eine Zeile «geplant» mit den IDs.
  - Scheitert die Sperre, wird zurückgelesen, und nie gesetzte IDs werden mit «plan-verworfen» wieder aus «eigene» genommen.
    Verwaiste Pläne werden zu Laufbeginn bereinigt.
  - «fehler», «netz» und vorübergehende CJ-Codes (≠ 200/1602001) kommen nach 1 T wieder.
- **Entwürfe mit eigener Sperre** (DRAFT + `ausverkauft-lieferant`) werden alle 2 T mitgeprüft:
  - Bei Bestand werden sie freigegeben, `lagerstand_hygiene` holt sie dann mit ihren eigenen Prüfungen zurück.
  - Bei 0 bleiben sie gesperrt.
- **Zusatzkonten:** «Quota has been used up» (1600201) schaltet das Konto ab, statt endlos als Drossel zu warten.
  Die Drossel ist auf 20 Versuche begrenzt.
- **Bremsen:** höchstens 60 pid-Sperren je Lauf. Kanarie: Die erste pid-Antwort muss `totalInventory` tragen, sonst gibt es keine
  pid-Urteile und keine weiteren Abfragen im Lauf.

## Prüfung (Workflow wf_77b3cddc, 4 Prüfer + Gegenprobe je Befund)

| Befund | Gegenprobe | Behoben |
|---|---|---|
| Ledger-Griff schreibt nach git-Merge ins Leere (hoch) | echt, hoch | Datei je Zeile |
| «geplant» ohne Wirkung macht die Variante zur «eigenen» → könnte fremde Sperre freigeben | echt, mittel | Rücklesen + plan-verworfen + verwaiste Pläne |
| Tagesdeckel zählte Zeilen statt Abfragen | echt, mittel | Zähler + Stopp-Flag |
| Freigegebener Entwurf wird bei 0 nicht wieder gesperrt | echt, niedrig | Entwürfe werden wieder gesperrt |
| 1600201 «Quota used up» Endlosschleife | echt, niedrig | Kontingent vor Drossel |
| bestand(): leere Liste sperrt SKU-Ware nicht mehr | echt, niedrig | bewusst so (unbekannt ≠ 0), Zähler «varianten-unklar» |
| Zuordnung: letzte statt erste Zeile, Reihenfolge anders als Engine | – | wie Engine |

## NACHGEMESSEN
- **DRY 150 pid:** 120 eine CJ-Variante (80 %), 27 mehrere, 0 Sperren. Von den 20 festgefahrenen Entwürfen sind 17 laut CJ wirklich
  aus dem Sortiment (1602002) und bleiben gesperrt.
- **SCHARF 18:31 UTC** (CAP 50, CAP_PID 100):
  - 133 geprüft, davon 100 pid: 72 einzeln, 26 offen, 0 Bestand-0-Sperren.
  - **2 pid-Produkte, die CJ entfernt hatte, gesperrt und zurückgelesen** (availableForSale false): Mini-Drohne «AeroX»
    (CJ-2046123199736934401) und Antihaft-Bratpfannen-Set aus Maifanit (CJ-2606010430161614000).
  - 1 «fehler-cj» kommt morgen wieder.
- Der Aufseher (`fixer_keepalive.sh`, Lagerabgleich stündlich, CAP 4000) nimmt die pid-Ware jetzt mit. Bei 600/Tag dauert ein
  Durchgang durch die 29'013 rund 7 Wochen. Besuchte Seiten kommen zuerst.

## OFFEN
- **Restrisiko Mehrvarianten:** Bei 26 % der pid-Ware hat CJ mehrere Varianten. Gesperrt wird nur, wenn ALLE 0 haben. Die
  Variante, die der Bildvergleich beim Bestellen wählt, kann trotzdem 0 haben. Weg: `cj_order_engine` prüft vor `createOrderV2`
  den Bestand der gewählten vid (`product/stock/queryByVid`) und meldet statt zu bestellen. Das ist eine eigene Klasse am
  Bestellweg, nicht umgesetzt.
- **Fabrikbestand zählt** (n = 1: #1021 «Products Discontinued» trotz Fabrik 20'000). Nur CN zählen, solange die Engine aus CN
  bestellt? Das ist heute kein Unterschied (15 aktive pid-Produkte mit eu-lager-Tag).
- Für den pid-Lagerabgleich gibt es keine Ampel-Zeile. Die Bilanz steht in `dropship/CJ-LAGER.md`, das bei jedem Lauf neu geschrieben wird.
- Auf dem Hetzner-Server fehlen die Zusatzkonten. Er fragt deshalb keine pid-Ware ab. Kommen die Schlüssel dort an, fahren Server
  und Cloud dieselbe Liste doppelt.
