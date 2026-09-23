---
tags: [falle, teuer-gelernt]
quelle: dropship/LERNEN-SHOPIFY-CLAUDE-2026-09-13.md
gelernt: 2026-09-13
---
# Count-Felder ignorieren ihren Filter stillschweigend

Bekannt war es von productsCount (Preisfilter wird ignoriert). Am 2026-09-13 fuer customersCount bestaetigt: email_marketing_state:subscribed, orders_count:>0 und sogar email:zzzgibtesnicht@example.invalid liefern alle dieselbe Zahl 1498. Aufgefallen nur, weil drei verschiedene Filter dasselbe Ergebnis gaben. Es filtern nur customerSegmentMembers mit totalCount und die Listenabfrage customers(query:), die auf den Unsinn-Filter korrekt eine leere Liste zurueckgibt. Regel fuer jede Session: nie eine Zahl aus einem Count-Feld mit Filter glauben, ohne denselben Filter einmal mit einem Unsinn-Wert gegenzupruefen. Wenn die Zahl sich nicht aendert, filtert das Feld nicht.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
