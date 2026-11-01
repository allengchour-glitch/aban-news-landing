# Elektronik sauber getrennt (LIVE 01.11.2026)

Auftrag des Besitzers 01.11.: «Elektronik hat zu viel Zufälliges, mach mehr Unterkategorien, und bei den anderen Bereichen auch».
Grundlage: der geprüfte Plan `dropship/taxonomie-2610-b/` (Bereichsdateien handy, computer, unterhaltung), Werkzeug `automation/kategorien_anlegen.mjs`
mit `SCHMUCK=1 BEREICH_DATEI=<bereich> BEREICH_GRUPPEN=<alle Gruppen> PREFIX=s-`.

## Was live ist (GEMESSEN)
- **Katalog** frisch gelesen (56 529 aktive Produkte, vollständig). Trockenlauf je Bereich, Listen stichprobenhaft gelesen (Smartwatches, Drohnen, Gamepads, Mikrofone, Überwachung, USB-Sticks, Powerbanks, Kabellos laden): Titel passen zur Kategorie.
- **Handy-Zubehör:** 14 Kategorien/Filter, 1 253 Tag-Änderungen. **Computer:** 31, 891. **Unterhaltung:** 64, 4 261.
- Tags `sort-…`, Smart-Sammlungen angelegt und in 7 Kanälen publiziert. Mitglieder gegen Erwartung: 0 Abweichungen (Handy 22 Zeilen, Computer 31, Unterhaltung 64).
- **Menü «Elektronik»** (menuUpdate, Sicherung `dropship/menu-sicherung/main-menu-vor-elektronik-0111.json`): 16 Köpfe statt ~20 flacher Einträge, 76 Links, höchstens 3 Ebenen.
  Köpfe: Handy & Laden · Kopfhörer & Audio · Smartwatches & Wearables · Kamera, Foto & Drohnen · TV, Beamer & Streaming · Gaming & VR · PC & Computer ·
  Büro & Drucker · Sicherheit & Überwachung · Strom, Batterien & Solar · dazu unverändert Smart Home, 3D-Drucker, Kabel & Adapter, Elektronik-Kleinteile, Auto & KFZ.
  Ausserhalb von «Elektronik» nach dem Schreiben frisch gelesen: 0 fehlend, 0 neu. Alle 76 Links HTTP 200.
- Kundensicht (Handy): «Elektronik & Technik» zeigt jetzt Reiter «Handy & Laden …» und «Alle 16 Kategorien».

## Was NICHT gemacht ist (unbekannt / offen)
- Wirkung auf Verkäufe und Google: unbekannt.
- Gruppen-Köpfe haben keine eigene Sammlung (sie verlinken auf die bestehende Oberkategorie, z. B. «Handy & Laden» → `handy-zubehoer`).
- Reihenfolge «gut bewertete zuerst» für die neuen Sammlungen: noch nicht gelaufen (`bewertung_zuerst.mjs`).
- Label-Bilder/Banner der neuen Kategorien: Gemini-Guthaben leer (402), Banner macht Codex.
- Die anderen Bereiche sind im Trockenlauf gerechnet, nichts geschrieben: Spielzeug 45 Kategorien (1 793 Änderungen), Auto 34 (956), Tiere 60 (5 653), Haus & Bau 27 (705), Sport 46 (1 795), Wohnen 154 (6 881), Hobby & Party 26 (1 047), Beauty 66 (4 500), Sportschuhe 18 (815).

## Rücknahme
Menü: `menuUpdate` mit dem Inhalt der Sicherungsdatei (ID bleibt `main-menu`). Tags/Sammlungen: Sammlungen `s-…` löschen und Tags `sort-<handle>` der drei Bereichsdateien entfernen (`kategorien_anlegen.mjs`, `PHASE=…`, Ledger `dropship/kategorien_ledger.txt`).
Menü-Skript: `dropship/taxonomie-2610-b/menue_elektronik_0111.mjs` (liest `/tmp/advbau-claude/sh.mjs`, ohne diese Umgebung nicht lauffähig).
