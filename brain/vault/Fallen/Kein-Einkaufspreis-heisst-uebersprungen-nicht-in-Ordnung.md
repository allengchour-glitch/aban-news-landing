---
tags: [falle, teuer-gelernt]
quelle: CLAUDE.md Stand 2026-09-22, siebter Block
gelernt: 2026-09-25
---
# Kein Einkaufspreis heisst uebersprungen, nicht in Ordnung

Im siebten Schutzausruestungs-Block hatten 3 von 10 Produkten kein unitCost: Elektr. Schutzhandschuhe doppelseitig isoliert (14.90), Kuehlende Warnweste 14 Varianten (20.90), Gehoerschutz-Roehrchen (17.90). Solche Produkte duerfen NICHT als 'in Ordnung' gezaehlt werden - ohne Einkaufspreis ist die Marge unbekannt, nicht gut. Die Regel in varianten_preis.mjs ueberspringt sie korrekt; die Gefahr liegt im BERICHT, wo aus 'uebersprungen' leicht 'geprueft und in Ordnung' wird. Dieselbe Klasse wie 'ein nicht abgefragtes Feld ist UNBEKANNT, nicht leer' (12.09.). Nebenbefund: die isolierenden Elektro-Handschuhe sind PSA Kategorie III (EN 60903 / IEC 60903) und gehoeren damit zur offenen Normen-Frage wie Helme und Atemschutz.

Verwandt: [[Hypothese-mit-Datum]]
