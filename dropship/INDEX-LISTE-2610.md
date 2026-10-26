# Index-Liste vom 26.10.2026 (Routine «Google-Index-Liste täglich»)

Gemessen mit `inspect_urls` (OpenSEO, Search Console, nur lesend, kostet keine Credits) um 08:5x UTC. Das Ledger `dropship/_index_beantragt.tsv`
liegt nur auf dem Branch `claude/luxestyle-status-tztnn1` (andere Sitzung); es wurde hier **nicht** beschrieben.

## 1. Stand der bisherigen Anträge: alles drin

- Alle 19 Seiten, deren letzter Ledger-Eintrag nicht «indexiert» lautete, sind heute **«Submitted and indexed»** (PASS). Darunter
  `damen-mode` (Abruf 24.10.), `sub-deko` (Abruf 24.10.), `winter-kaelte`, `winterjacken`, `winterschuhe`, `hochzeitsgeschenke`,
  `nachtwaesche-pyjamas`, `party-deko-ch`, `wanddeko`, `luftbefeuchter`, `handschuhe`, `lockenstaebe`, `glaetteisen`,
  `strickjacken-cardigans`, `strickkleider`, `uhrenarmbaender`, `aufbewahrungsboxen`, `handtuchhalter` und `geschenke-bis-chf-30`.
  Die Ledger-Notizen zu `damen-mode` («Nachmessung 22.10.») und `sub-deko` («Kontingent überschritten») sind damit überholt.
- Grundliste `_index_stand.tsv` (13.10., 105 Seiten, davon 40 offen): alle 40 wurden beantragt, die letzten beiden sind jetzt drin.
- Search Console, letzte 28 Tage: in den obersten 60 Seiten stehen nur wenige Dutzend Klicks; Seiten mit Impressionen sind per Definition
  indexiert, **«Impressionen, aber nicht indexiert» gibt es nicht**. Der Engpass ist nicht mehr die Indexierung der Grundliste, sondern das
  Ranking (Sammlungen stehen auf Position 40 bis 90, z. B. `beamer-heimkino` 105 Impressionen / Position 56).

## 2. Neue Kandidaten: die Mode-Kategorien von heute Nacht

Neun von zehn geprüften neuen Seiten sind Google noch **unbekannt**, `herren-jeans` ist «Discovered – currently not indexed». Alle zehn laden
(HTTP 200) und haben Ware (137 bis über 250 Produkte). Vorschlag für die heutigen ~10 «Indexierung beantragen»-Klicks, nach Suchnachfrage geordnet:

| # | Seite | Produkte |
|---|---|---|
| 1 | `/collections/damen-kleider` | 250+ |
| 2 | `/collections/damen-jeans` | 250+ |
| 3 | `/collections/herren-jeans` | 149 |
| 4 | `/collections/herren-hemden` | 250+ |
| 5 | `/collections/damen-t-shirts` | 250+ |
| 6 | `/collections/herren-sneaker` | 250+ |
| 7 | `/collections/damen-handtaschen` | 45 |
| 8 | `/collections/herren-umhaengetaschen` | 250+ |
| 9 | `/collections/damen-sportschuhe` | 137 |
| 10 | `/collections/damen-schals-tuecher` | 250+ |

Klickweg: search.google.com/search-console → oben «URL prüfen» → Adresse einfügen → «Indexierung beantragen» (rund 10 pro Tag; bei «Kontingent
überschritten» den Rest morgen und im Ledger vermerken, ab welcher Seite das war). Die übrigen 117 neuen Mode-Kategorien folgen über die
Sitemap oder in den nächsten Tagen in Zehnerpaketen.

## 3. Routine abschalten?

Schritt 4 der Routine sagt: sind alle Seiten der Grundliste indexiert und gibt es keine «Impressionen ohne Index» mehr, soll sie per
`update_trigger enabled=false` abgeschaltet werden. Beides trifft zu. **Nicht abgeschaltet**, weil das eine Änderung an einer geplanten Aufgabe
des Kontos ist, die der Besitzer entscheiden soll (Trigger `trig_014Jo16tokZP9MiCTeoH41SS`). Sinnvoll wäre, sie nicht abzuschalten, sondern
auf die Mode-Kategorien umzustellen, solange die Zehnerpakete laufen.
