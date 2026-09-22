---
tags: [falle, teuer-gelernt]
quelle: Journal 2026-09-21 · 🔁 68 kaufbare Produkte; 2026-09-22 · 🩺 Nachtrag 3
gelernt: 2026-09-22
---
# Ein «not found» vom falschen Endpunkt beweist nichts — Kanarienvogel zuerst

Am 21.09. wurden 68 kaufbare Produkte gedraftet, weil eine PRODUKT-SKU (CJJSBGSD00009, kein 01AZ-Suffix) am Varianten-Endpunkt gefragt wurde und 1602001 als Absage galt; dieselbe SKU am productSku-Endpunkt: 200, 40 Varianten. Am 22.09. stand die Klasse UUID-SKU (4'564 aktive Produkte) kurz vor «unbestellbar → DRAFT» — variant/queryByVid 20/20 not found, product/query?pid= 200 mit 8 Bildern. Regel: vor jedem Massenurteil zuerst «welche Anfrage ist für DIESE Form die richtige?» und grep -rn "<Form>" automation/ (die Wächter kennen die Form oft schon); sichere Absage ist allein 1602002, 1602001 heisst nur «diese Frage fand nichts»; ein Produkt, das sicher existiert, muss mit derselben Anfrage «existiert» ergeben, sonst misst man das Messgerät. Wer eine Entscheidung auf ein Automaten-Tag stützt, muss wissen, mit welcher Anfrage der Automat es gesetzt hat.

Verwandt: [[Hypothese-mit-Datum]]
