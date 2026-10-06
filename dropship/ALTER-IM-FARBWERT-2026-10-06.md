# Alter im Farbwert → eigene Option «Grösse» (06.10.2026, Verbesserungsrunde 20:25)

**GEMESSEN** (Bulk-Optionen-Export 50'914 aktive, 20:10 UTC): 313 Farbwerte mit Alters-/Babygrössen-Anhang, verteilt auf
46 Produkte; bei **42** ist «Farbe» die EINZIGE Option und jeder Wert trägt den Anhang — «White-6 TO 9M», «Light Blue-1to3 Years
Old», «Pink-G3 TO 4Y», «Beige-0to3M». Folge: Filter «Farbe» zeigt «White-6 TO 9M» als Farbe; Filter «Grösse» und Google-`size`
kennen diese Produkte nicht. Ursache: CJ-`variantKey` ungeteilt in eine Option (dieselbe Quelle wie `groesse_im_farbwert.py`).

**GETAN:** `automation/alter_im_farbwert.py` (Selbsttest 12/12) — nur eindeutige Fälle (genau eine Farb-Option, alle Werte
mit Anhang, Teilung kollisionsfrei); `productOptionsCreate` «Grösse» (LEAVE_AS_IS) → `productVariantsBulkUpdate` (Farbe,
Grösse) → Rücklesen. Probe «Kaschmir-Socken für Kinder»: 10 Farben × 3 Grössen («1–3 Jahre» …), SKU/Preis unverändert.
Kanarien: «Pink-MS» (Mama-S im Partnerlook) bleibt, gemischte Produkte (4) bleiben, verdrehte Spannen bleiben.
Täglich im Aufseher (liest den Optionen-Export von `farbmuster_filter.py`) — erfasst Neuimporte.

**OFFEN:** 4 gemischte Produkte (Partnerlook «Pink-MS/MM/ML» + Kindergrössen) bleiben von Hand; englische Farbnamen
(«Light Blue») übersetzt `farbwerte_uebersetzen.py`. Ursache im CJ-Importer (variantKey teilen) wäre der Dauerfix.
