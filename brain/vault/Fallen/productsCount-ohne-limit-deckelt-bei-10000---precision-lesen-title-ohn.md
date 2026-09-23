---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-22 Nachtrag 19
gelernt: 2026-09-23
---
# productsCount ohne limit deckelt bei 10000 - precision lesen, title ohne Stern ist Ganz-Titel

GEMESSEN 22.09.2026: productsCount ohne limit gibt fuer ACTIVE, DRAFT und ohne Filter je 10'000 mit precision AT_LEAST; productsCount(limit:null) liefert die echte Zahl (gesamt 79'337, ACTIVE 51'326, DRAFT 27'850, EXACT). 19 von 20 Aufrufern in automation/ lesen precision nicht; shop_autopilot.mjs:82 und shop_pulse.mjs:51 melden 10'000 als aktiv. Preisbaender sind keine Partition (Mehr-Varianten zaehlen mehrfach, +5,6 %). Zweite Falle derselben Familie: title:helm OHNE Stern = 0 trotz 66 Wort-Treffern (Ganz-Titel-Vergleich), title:helm* = title:*helm* = 77, Voll-Export Teilstring 214. Dritte: unbekannte Suchfelder werden STILL ignoriert - Kanarienvogel foo:bar muss eine andere Liste geben, sonst ist der Filter tot (products(query:"price:<10") filtert exakt = 271, productVariants kennt price: nicht). Regel: bei jeder Zahl aus der Admin-API limit:null setzen und precision pruefen; AT_LEAST heisst gedeckelt, nicht gemessen.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
