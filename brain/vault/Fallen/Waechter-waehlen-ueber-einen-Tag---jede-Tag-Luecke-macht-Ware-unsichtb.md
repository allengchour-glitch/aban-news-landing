---
tags: [falle, teuer-gelernt]
quelle: dropship/CJ-REAL-LUECKE-2026-10-14.md
gelernt: 2026-10-14
---
# Waechter waehlen ueber einen Tag - jede Tag-Luecke macht Ware unsichtbar

14.10.2026: Alle Lieferbarkeits-Waechter (cj_lager_abgleich, cj_verfuegbarkeit, cj_stock_guard …) waehlen ihre Arbeit ueber tag:cj-real. Die Importgruppe cjwerkzeug in cj_groups_extra.json trug den Tag nicht → 1'331 aktive CJ-Produkte (CONTINUE, kein Tracking) waren fuer alle Waechter unsichtbar und blieben kaufbar, auch wenn CJ ausverkauft hatte (Ghost-Sale-Klasse #1019). Regel: ein Auswahl-Tag wird an der Quelle UNABHAENGIG von der Gruppen-Konfiguration erzwungen (CJ_REAL_PFLICHT nach allen Tag-Filtern), und ein Zaehler sucht die Luecke ueber ein zweites Merkmal (SKU-Form, nicht Tag): cj_real_luecke.py. Frage bei jedem Waechter: Ueber welches Merkmal waehlt er, und wer garantiert, dass jede Ware es traegt?

Verwandt: [[Hypothese-mit-Datum]]
