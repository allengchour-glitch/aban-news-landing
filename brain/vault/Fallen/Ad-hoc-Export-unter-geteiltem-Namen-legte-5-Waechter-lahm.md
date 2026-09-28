---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-28
---
# Ad-hoc-Export unter geteiltem Namen legte 5 Wächter lahm

27.09. 20:08: mein Tag-Export für #1019 landete als /tmp/export.jsonl UND /tmp/kost28.jsonl. kosten_export_bauen prüfte nur das Alter (<24 h = frisch) → preis_verlustschutz/fortura_ek/kosten_boden15/preisboden/farbwerte starben je Lauf an KeyError, bis 20 h lang. Fix: format_ok im Kosten-Bauer, Format-Vorprüfung im Aufseher, beide neu gebaut (Gegenprobe False→True). Regel: Ad-hoc-Exporte nie unter geteilten Namen; Bauer prüft Format UND Alter.

Verwandt: [[Hypothese-mit-Datum]]
