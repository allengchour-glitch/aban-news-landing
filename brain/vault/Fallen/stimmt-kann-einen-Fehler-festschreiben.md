---
tags: [falle, teuer-gelernt]
quelle: dropship/UHRENARMBAND-KATEGORIE-2026-10-09.md
gelernt: 2026-10-09
---
# stimmt kann einen Fehler festschreiben

uhren_fein.py zählte 28 Uhrenarmbänder bei Google 'Watches' als 'stimmt', weil die eigene Uhr-Regel 'uhren' das Kompositum 'Uhrenarmband' traf und Bänder nur mit 'für … Watch' erkannt wurden. Fix: Kopfwort-Regel zuerst (Band/Zubehör/Werkzeug, Uhrwort ausserhalb → Uhr), Kanarien mit Komposita, in denen das Regelwort nur Bestandteil ist.

Verwandt: [[Hypothese-mit-Datum]]
