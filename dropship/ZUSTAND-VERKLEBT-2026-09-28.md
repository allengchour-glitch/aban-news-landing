# Verklebte Zustandsdateien — 28.09.2026

**GEMESSEN:** `dropship/HEILVERSPRECHEN.md` (Lauf 27.09. 21:01) meldete den Filter
`updated_at:>2026-09-25T20:29:48Z2026-09-25T00:26:28Z2026-09-23T22:11:04Z`. Das sind drei Zeitstempel ohne Trenner.
Die Stempel-Datei `_heilversprechen_seit.txt` war vom 25.09. 20:32 bis 27.09. 21:04 verklebt (git `23eeb461c`).
Ursache: Die Ledger-Union in `repo_vorspulen.sh` hängte nach Snapshot-Restores alte Werte an eine Datei ohne Zeilenende an.
Diesen Morgen wurde das schon für `cursor|zeiger|_pos|_stand` behoben, `_seit` und `_page` fehlten aber.

**Wirkung:** Die Heilversprechen-Wache prüfte 11'150 Produkte. Das ist breiter als nötig, es fehlte also nichts.
Seit dem Lauf vom 27.09. 21:01 ist der Stempel wieder sauber.
`_cj_all_page.txt` und `_cj_video_page.txt` (Seitenzahl, ungeschützt) waren im Verlauf ab 15.09. nie verklebt.

**GETAN:**
- Regel in `repo_vorspulen.sh`: Der Name-Filter kennt jetzt auch `_seit|_page`. Dazu kommt eine Inhaltsregel: Bestehen origin UND Snapshot
  aus genau einem Einzelwert (Zahl, Datum/Stempel, Zeiger-Token), bleibt die origin-Fassung, und es wird nichts angehängt.
- Wächter `automation/zustand_verklebt.py` läuft in jedem Keepalive. Er meldet «ZUSTAND VERKLEBT: …», wenn zwei Stempel oder zwei Zeiger ohne Trenner
  stehen oder eine Zustandsdatei mehrere Einzelwerte untereinander trägt. Bei 0 Funden bleibt er still.
- Kanarienvögel: `--test` 8/8 bestanden. Die echte verklebte Fassung (`23eeb461c`) wird gemeldet, der Live-Bestand ist sauber (0).

**Grenze:** Ein echter Ledger mit genau EINER Zahl-Zeile würde bei der Union wie ein Zustand behandelt, sein Snapshot-Eintrag also nicht angehängt.
Heute trifft das keinen Ledger: Alle 1-Zeilen-Zahldateien heissen `_pos` oder `_page`. Ein verlorener Eintrag hiesse höchstens Arbeit doppelt, nie falsch.
