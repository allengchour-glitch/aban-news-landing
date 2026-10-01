# Hörgerät ohne das Wort «Hörgerät» — Verbesserungsrunde 01.10.2026, 12:26 UTC

## GEMESSEN
- Google meldet 67 aktive Produkte als «Personalized advertising: personal hardships» (dropship/GOOGLE-FEEDBACK.md, Stand 30.09.).
  Sieben davon einzeln geprüft (Admin-API, Titel + Text):
  | Produkt | Urteil |
  |---|---|
  | Digitaler Hörer im Ohr mit 32 Kanälen und Bluetooth (15452681535873, CHF 107.90) | **Hörgerät**: «speziell für ältere Menschen», App-Anpassung, UV-Sterilisationskoffer |
  | Sauerstoff-Infusions-/-Injektionsgerät (CHF 21.90/55.90) | Kosmetik-Wassersprüher, kein Medizingerät |
  | 1ml Spritzen, 25er-Pack | Luer-Slip ohne Nadel, Haustier/Hobby |
  | Microneedling Derma Roller 0.25 mm | Kosmetik-Werkzeug |
  | Tragetasche für Sauerstoffkonzentrator | Tasche (Zubehör) |
  | Drahtloser Bettnässer-Alarm | Grauzone, bleibt (siehe OFFEN) |
- **Warum der Wächter das Hörgerät durchliess:** `medizin_zweck.json` → Regel `geraet-nach-funktion` kennt «Hörgerät/Hörverstärker»,
  hat aber «Bluetooth» in ihrer Sperre (gegen Ohrhörer, die die Maschinenübersetzung «Hörgerät» nennt). Dieses Gerät heisst «Hörer im Ohr» UND hat Bluetooth.
- Der alte Namens-Wächter `medizinprodukte_guard.py` steht in keiner Startliste; das ist gewollt (abgelöst durch `medizin_zweck_guard.py`, täglich + 7-tägig voll).

## GETAN
- Neue Regel `hoergeraet-funktion` in `automation/medizin_zweck.json` (eine Datei, zwei Leser: Bestand `medizin_zweck_guard.py` und Importer `medizin_zweck.mjs`):
  Im-Ohr-Hörer · Hörhilfe · Hörsystem · Hörverlust/Schwerhörigkeit mit Verstärkung oder Kanälen · Kanalzahl mit Senioren/älteren Menschen. Ohne Bluetooth-Sperre;
  gesperrt bleiben Gehörschutz, Ohrstöpsel, Kinderkopfhörer mit Lautstärkebegrenzung, Wanzendetektoren, Reinigungssets, Funkgeräte, Babyphone.
- Probelauf über den Voll-Export (30.09., alle aktiven): **1 Treffer, 0 Fehlalarme.**
- Kanarienvögel 10/10 (Python), Importer-Gegenprobe gleich (JS):
  3 echt (Hörer im Ohr · Verstärker bei Hörverlust mit 16 Kanälen · unsichtbare Hörhilfe) — 7 nicht (Bluetooth-Ohrhörer mit Equalizer-Kanälen, Kinderkopfhörer,
  Gehörschutz, Fasnachts-Stethoskop, Wanzendetektor, Walkie-Talkie für Senioren mit 22 Kanälen, Seniorenhandy).
- Über den Wächter selbst angewendet: 15452681535873 → **DRAFT** + Tags `medizinprodukt-pruefen`, `medizin-zweck-hoergeraet-funktion`; zurückgelesen. Ledger `dropship/_medizin_zweck.txt`.
- Der nächste 7-Tage-Vollstreifzug (fällig 02.10., `_medizin_voll_stand.txt` = 25.09.) prüft den ganzen Bestand mit der neuen Regel.

## OFFEN
- «Personalized advertising: personal hardships» bleibt als Kanal-Frage beim Betreiber (merchant_sperre_durchsetzen.py, Kopfkommentar): beschränkt nur personalisierte Werbung.
- Bettnässer-Alarm (Enuresis-Wecker, MDR Klasse I in der EU): bewusst nicht gedraftet — geringes Schadensrisiko, keine Krankheitsbehandlung im Text. Bei Bedarf Betreiber-Entscheid.

## Lehre
Googles Richtlinien-Meldungen sind ein zweiter, unabhängiger Prüfer für die eigenen Muster: eine Liste, die nach Funktion sortiert ist, findet,
was unser Wortmuster wegen einer Sperre übersieht. Eine Regel-Sperre, die eine harmlose Klasse schützt (Bluetooth-Ohrhörer), deckt immer
auch die echte Klasse mit demselben Merkmal (Bluetooth-Hörgerät) — dann braucht es eine eigene Regel ohne diese Sperre, nicht eine kleinere Sperre.
