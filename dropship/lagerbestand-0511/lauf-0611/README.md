# Fortura-Bestandsabgleich vom 06.11.2026 (aus der Sitzung)

- Feed: Stand auf dem Server 05.11.2026 22:52 UTC (8,8 h alt beim Stempel-Gate), 20 309 Zeilen, 18 940 Artikelnummern.
- Trockenlauf 07:32 UTC: 8 295 unverändert, 121 zu ändern (2 davon auf 0), 8 SKU nicht mehr im Feed (0,1 %). Verkaufbar 2 195 → 2 198.
- Live (Skript `automation/fortura_bestand_sync.mjs`, unverändert): Exit 0, geändert 121, offen 0. Journal mit alt/neu je Variante: `_fortura_bestand_log.tsv`.
- Nachprüfung (Trockenlauf danach): 8 416 unverändert, 0 zu ändern, Exit 0.
- Stempel-Gate im Trockenlauf bestanden; der Stempel `luxe.fortura_bestand_stand` wurde NICHT erneuert, weil die Freigabedatei `dropship/FORTURA-BESTAND-FREI.txt` (Schalter des Besitzers) im Repo fehlt und für heute kein ausdrücklicher Auftrag vorlag. Der Stempel vom 05.11. 11:57 UTC läuft am 06.11. gegen 13:57 UTC ab; danach zeigt das Theme «Auf Lager» statt «Nur noch N» (sicherer Rückfall).
- Rücknahme: Spalte «vorher» je Zeile mit `inventorySetQuantities` zurückschreiben (nicht empfohlen).
