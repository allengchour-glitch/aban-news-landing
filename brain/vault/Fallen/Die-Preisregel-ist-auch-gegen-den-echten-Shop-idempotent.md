---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-20
---
# Die Preisregel ist auch gegen den echten Shop idempotent

GEMESSEN 2026-09-20: von 44 Produkten der helm*-Gruppe kamen 30 als ueberspringen zurueck, darunter ALLE ELF, die am 19.09. und am selben Tag bereits gesetzt worden waren. Die Idempotenz von entscheide() ist damit nicht nur im Selbsttest belegt, sondern gegen die Live-Daten. Das ist die Eigenschaft, auf die es ankommt, bevor automation/preis_korrektur.mjs einmal ueber den ganzen Katalog laeuft: ein zweiter Lauf darf nichts mehr anfassen.

Verwandt: [[Hypothese-mit-Datum]]
