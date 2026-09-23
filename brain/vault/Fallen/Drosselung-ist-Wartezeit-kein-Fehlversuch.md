---
tags: [falle, teuer-gelernt]
quelle: GEDAECHTNIS-JOURNAL.md Nachtrag 35 (23.09.2026)
gelernt: 2026-09-23
---
# Drosselung ist Wartezeit, kein Fehlversuch

23.09.: tiktok_karussell.gql zählte jede THROTTLED-Antwort als Versuch (8 × 6 s) und starb um 02:11, als die Tages-Wächter gleichzeitig starteten — Abfrage kostete nur 99 Punkte. Fix: Drosseln nicht zählen, Wartezeit aus requestedQueryCost − currentlyAvailable / restoreRate, nachlauf() nach jeder Antwort. py_compile beweist keine Lauffähigkeit: NameError auf Modulebene zeigt erst der Import.

Verwandt: [[Hypothese-mit-Datum]]
