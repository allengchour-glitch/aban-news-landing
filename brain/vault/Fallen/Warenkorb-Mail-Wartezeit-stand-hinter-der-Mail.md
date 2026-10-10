---
tags: [falle, teuer-gelernt]
quelle: dropship/WARENKORB-MAIL-2026-10-10.md
gelernt: 2026-10-10
---
# Warenkorb-Mail: Wartezeit stand hinter der Mail

Klaviyo-Flow Abandoned Checkout hatte die Mail als entry_action, die 1-h-Wartezeit danach; Vorlagenname ('nach 1 Std') und ein Bericht sagten das Gegenteil. Mail 1 kam im Median 25 s nach Kassenstart, 2/6 Empfängerinnen bezahlten gerade, Klaviyo zählte eine als zurückgeholt. Ablauf-Reihenfolge an entry_action_id und Zeitstempeln Auslöser→Versand ablesen. Vor Abbruch-Statistiken eigene Prüfkörbe (…@example.com, test/qa) abziehen: 3 von '7 fremden' waren eigene Tests. Wächter: automation/klaviyo_flow_pruefen.py.

Verwandt: [[Hypothese-mit-Datum]]
