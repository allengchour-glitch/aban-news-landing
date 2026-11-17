# GMC Hebel A: Tag am Produkt (17.11.2026)

Besitzer 17.11. ca. 21:25 UTC auf meine gezielte Frage: **«Ja, in Chargen»** (Merchant-Änderung, Besitzerregel 11.11.).

## Warum (GEMESSEN, BigQuery-Export der Google-App, Schnappschuss je 20:00 UTC)
- Google führt bei 1 358 Produkten (6 235 Angebote, de und fr) «out of stock» oder «availability_updated», obwohl der Shop sie führt (17.11.: de out of stock 1 167 Angebote / 685 Produkte, de korrigiert 3 545 / 1 115, fr out of stock 550 / 317, fr korrigiert 973 / 298).
- Probe vom 16.11. (5 Produkte, 28 Angebote de, 28 fr): ein neutraler Tag `gmc-sync-1511` (Produkt-Update) machte 23 von 23 nicht sauberen de-Angeboten «in stock» ohne Korrektur; am 17.11. 28 von 28 de und 28 von 28 fr sauber. Kontrolle (alle übrigen de-Angebote, 15. gegen 17.11.): 4 696 nicht saubere, **0** wurden sauber (98 von out of stock auf korrigiert, 1 160 blieben out of stock).
- Arm B (Variantenbild lösen und neu binden) wirkt nur auf die berührten Varianten, Arm C entfernt die Werbeeinblendung (nicht Teil dieser Ausrollung).
- Grenzen: nur 5 Produkte, nicht zufällig; Ursache unbekannt (Hypothese: die Google-App liest das Produkt neu); Wiederkehr der Fehler ungemessen. Der Probe-Tag wurde am 17.11. 21:18 UTC wieder entfernt (Nachmessung der 5 Produkte ohne Tag: 18.11.).

## Ablauf
1. **Auswahl:** Produkte mit mindestens einem nicht sauberen Angebot, in Zufallsreihenfolge (Fingerabdruck der Produktnummer), ohne die 20 Probe-Produkte. `pool-rang-1-300.txt` = Rang 1 bis 300.
2. **Tore gegen den Shop (frisch, direkt vor dem Schreiben):** ACTIVE, im Kanal «Google & YouTube», mindestens eine Variante verkaufbar, Preis grösser 0, keine Sperr-Tags, Tag noch nicht gesetzt. Wirklich ausverkaufte Ware bleibt draussen (Trockenlauf Charge 1: 15 von 165 gelesenen Produkten).
3. **Hebel:** nur `tagsAdd gmc-sync-1511`. Keine Sammlungsregel nutzt den Tag (1 732 Sammlungen gelesen). Es ändert `updatedAt` (andere Kanäle synchronisieren ebenfalls neu).
4. **Chargen:** Charge 1 = 150 Produkte (`plan-charge1.json`, vor dem Schreiben im Repo), 1,5 s Pause je Produkt, Abbruch beim ersten Fehler. Messung am nächsten und übernächsten Tag. Mindestens 70 % der Angebote der Charge sauber (Kontrolle bleibt bei 0): danach 400 je Tag (`AB=` und `N=` setzen, Rang weiter), bis alle durch sind. Unter 50 % sauber: Stopp und Bericht.
5. **Ledger:** `ledger-a.json` (Zeit, Produkt, `updatedAt` vorher und nachher, ok). Rücknahme: `ZURUECK=1 LIVE=1` entfernt den Tag bei allen Ledger-Einträgen (harmlos, der Tag steuert nichts Sichtbares).

## Befehle (Node 22, Umgebung mit `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`)
- Trockenlauf (Vorgabe, schreibt nur die Planliste): `node anwenden_a.mjs` (`N=`, `AB=`, `PLAN=`, `LEDGER=`)
- Schreiben: `LIVE=1 node anwenden_a.mjs`
- Rücknahme: `ZURUECK=1 LIVE=1 node anwenden_a.mjs` (vorher ohne `LIVE` als Trockenlauf)
- Die Abfragen gegen den Export der Google-App stehen nicht im Repo (die Tabellennummer gehört nicht ins Repo).
