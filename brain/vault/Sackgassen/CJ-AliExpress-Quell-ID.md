---
tags: [sackgasse, cj, reviews]
quelle: CLAUDE.md
gelernt: 2026-09-07
status: nicht-erneut-versuchen
---
# Sackgasse — AliExpress-Reviews über CJ-Daten

CJ liefert **keine AliExpress-Quell-ID**. `sourceFrom` ist nur ein Zahlen-Flag, das Wort
„aliexpress" kommt im JSON nirgends vor. Ein automatischer AliExpress-Review-Import über
CJ-Daten ist damit nicht möglich.

**Reviews per Namens-Ähnlichkeit zuzuordnen ist verboten** — irreführend, Fake-Review-Grenze, UWG.

Was stattdessen geht: [[Reviews-Importer]] mit echten CJ-`productComments`.
