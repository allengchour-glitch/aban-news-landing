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

---

## Zweite Runde, 24.10.2026 vormittags

Der Besitzer meldete weitere CJ-Mails. Stand erneut abgefragt (nichts neu gesendet):
**5 „Sourcing Succeeded", 11 `Pending`, 1 „Similar Products"** von 17.

| Anfrage | Produkt | Fracht CN→CH | Urteil |
|---|---|---|---|
| `2610240115194488002` | Halloween-Schaukelgeist | **16 Linien** | lieferbar, rentabel → **live** (oben) |
| `2610240120534509902` | Elektrischer Fleischwolf 5L | **7 Linien** | lieferbar, rentabel → **live** |
| `2610240121044490402` | Resistance Bands Set | **0 Linien** | nicht lieferbar → bleibt DRAFT |
| `2610240115214481400` | Rizinusöl-Wickel-Set | **0 Linien** | nicht lieferbar → bleibt DRAFT |
| `2610240121014492402` | Schaum-Abflussreiniger | **0 Linien** | nicht lieferbar → bleibt DRAFT |
| `2610240115184481100` | Schwingerhose | „Similar Products", interne UUID statt CJ-SKU | kein Produkt → unbekannt |

**🚨 Die wichtigste Lehre dieser Runde: „Sourcing Succeeded" heisst NICHT lieferbar.** Drei von
vier neuen Treffern bekommen **null Frachtlinien in die Schweiz** — CJ hat einen Lieferanten
gefunden, aber keinen, der nach CH versendet. Das Messgerät funktionierte im selben Lauf (der
Fleischwolf bekam 7 Linien), also ist die Null ein Befund und kein Ausfall. **Ohne die eigene
Frachtmessung wären drei nicht lieferbare Produkte freigeschaltet worden — genau die Ursache
aller elf Erstattungen des Shops.**

Besonders bitter beim **Rizinusöl-Wickel-Set**: das ist die vierthäufigste Produktseite des
ganzen Shops (64 von 2619 Sitzungen) und rentabel. Der gesuchte Ersatzlieferant liefert
trotzdem nicht in die Schweiz. Die Seite bleibt gesperrt.

### Der zweite Treffer, durchgemessen

`elektrischer-fleischwolf-5l-kuchenmaschine-656962` → CJ-Produkt `1687282481562652672`,
EU-Variante `CJYD181444603CX` (110–240 V, also für die Schweiz passend).

- **Lieferbar:** 7 Frachtlinien, günstigste USD 35.52 (CJPacket EQ Sensitive, 6–10 Tage).
- **Rentabel:** EK USD 9.55 + Fracht USD 35.52 = USD 45.07 = **CHF 37.16** (Kurs 0.82435).
  VK **CHF 75.90** — über der Gratis-Versand-Schwelle, der Shop trägt die Fracht →
  Marge ≈ **CHF 38.74** vor Zahlgebühr. Der alte Lieferant kostete CHF 53.61 allein für die Ware.
- **Lieferantenwechsel vollzogen:** Varianten-SKU auf `CJYD181444603CX` und Kosten auf CHF 7.87
  gesetzt, sonst messen künftige Wächter weiter den alten, nicht versendbaren Lieferanten.
- Sperrtag `cj-nicht-versendbar-ch` entfernt (gilt nicht mehr), keine Kanalsperre,
  8 Bilder, `tracked:false`+`CONTINUE`, Beschreibung nennt „Lieferung 10–20 Werktage".
- **Live:** ACTIVE, 7 Kanäle, HTTP 200 nachgeprüft.

**11 Anfragen sind weiter offen** — in einer späteren Sitzung erneut `STATUS=1 node
automation/cj_sourcing.mjs`, nicht neu senden.
