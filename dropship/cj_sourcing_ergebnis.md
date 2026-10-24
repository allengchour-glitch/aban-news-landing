# CJ-Sourcing: Antworten (Stand 2026-10-24)

Gemessen mit `STATUS=1 node automation/cj_sourcing.mjs` (nur lesend) und
`logistic/freightCalculate` CN→CH. Das Ledger der gesendeten Anfragen liegt in
`dropship/cj_sourcing_ledger.txt`.

## Stand aller 17 Anfragen

| Anfragen | Stand |
|---|---|
| 1 | **Sourcing Succeeded** |
| 16 | `Pending` |

CJ antwortet nicht sofort. **Nicht erneut senden** — das Tagesbudget ist 25 Anfragen,
und eine Wiederholung verbraucht es für nichts. Stand in einer späteren Sitzung
erneut abfragen.

## Der eine Treffer, vollständig durchgemessen

`leuchtender-halloween-schaukelgeist-627400` (Anfrage `2610240115194488002`,
CJ-Mail #CJSPU960265818) → CJ-Produkt `2608070456571627400`.

- **Lieferbar:** alle vier Varianten bekommen **16 Frachtlinien CN→CH**
  (günstigste USD 15.09, CJPacket EQ Ordinary, 5–9 Tage). Das ist der sichere
  Positivfall, den `automation/lib/lieferbarkeit.mjs` sucht.
- **Rentabel, gerechnet statt geschätzt:** EK USD 4.92 + Fracht USD 15.09 = USD 20.01
  = **CHF 16.50** (Kurs 0.82435 vom 23.10.). VK im Shop ist **CHF 17.90**.
  Im Einzelartikel-Korb zahlt die Kundin CHF 7 Versand → Marge ≈ **CHF 8.40** vor
  Zahlgebühr. Im Gratis-Versand-Korb (echte Schwelle CHF 55.56) trägt der Shop die
  Fracht → der Artikel trägt nur noch ≈ **CHF 1.40** bei. Beides positiv.
- **Die Sperrtags waren veraltet:** `cj-entfernt` / `cj-entfernt-2026-09-27` — CJ führt
  das Produkt wieder. Dazu zwei falsche Kategorietags (`aufbewahrung`, `organizer`,
  aus CJs Kategorie „Home Office Storage"), für eine Halloween-Deko falsch. Entfernt;
  `automation/lib/kanal_sperren.mjs` meldet keine Kanalsperre.
- **Zeitpunkt ist kein Einwand:** der Shop führt bereits **247 aktive
  Halloween-Produkte** mit derselben China-Laufzeit, und die Beschreibung nennt
  „Lieferung 10–20 Werktage" ehrlich.
- **Live:** ACTIVE, in 7 Kanälen, `tracked:false` + `CONTINUE`, 5 Medien READY,
  HTTP 200 nachgeprüft.
