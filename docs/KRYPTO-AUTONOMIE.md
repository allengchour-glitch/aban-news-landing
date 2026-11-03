# Krypto-Autonomie: was automatisch besser werden darf und was nie

Stand 2026-11-03. Gilt für `tools/trading/` (Krypto-Pilot, Cockpit, Schattenkonto). Auftrag des Users: «mache selbstständig selber Verbesserungen und werde automatisch besser ohne mich».

## Grundsatz
Die Regel des Piloten bleibt fest («vorab festgelegt»). Automatisch besser werden alles **um** sie herum: Messen, Prüfen, Anzeige, Doku, Tests.
Die Regel selbst ändert sich nicht, weil ein paar Wochen schlecht oder gut liefen. Grund (gemessen): der lernende KI-Bot schnitt mit mehr Lernen schlechter ab
(`tools/trading/ki_bot/README.md`), und wenige Wochen Kurse sind Rauschen. Wer Hebel oder Parameter der letzten Rendite hinterherzieht, landet in tiefen Einbrüchen.

## Selbstheilung und Check haben Vorrang (Auftrag des Users, 03.11.2026)
Ablauf immer gleich: **erkennen, nur Sicheres selbst beheben, nachprüfen, laut melden.** Im Zweifel nichts tun und es sagen.
- **Darf sich selbst heilen:** fehlende Windows-Aufgaben anlegen (nur bei Auto-Handel AN), Markt-Infos auffrischen, ein Prüflauf ohne Aufträge, ein kaputtes Logbuch beiseitelegen, die Position beim nächsten Lauf angleichen.
- **Darf nie selbst:** Aufträge senden, Risiko-Stufe ändern, Schlüssel anfassen, Auto-Handel ein- oder ausschalten, echtes Geld.
- **Schon eingebaut:** Positionsabgleich bei jedem Lauf (heilt verlorene oder gescheiterte Aufträge), Börsen-Stops (schützen auch bei ausgeschaltetem PC), Nachkontrolle alle 10 Minuten, Logbuch-Rettung, Not-Aus, die Ampel «Gesundheit».
- **Neu am 03.11.2026:** Knopf «🩹 Alles prüfen & reparieren» (`selbstheilung()` in `cockpit.py`, 9 Tests, Mutationsproben 4/4, darunter «sendet nie Aufträge»), Check «Risiko-Stufe» (2× = Warnung im Testnetz, rot mit echtem Geld), Fehlergrund eines gescheiterten Auftrags in der Ampel.

## Drei Zonen
| Zone | Was | Wie |
|---|---|---|
| **Grün** (automatisch) | Berichte und Auswertungen, Cockpit-Anzeige (nur lesen), Texte, Doku, Tests, Prüfwerkzeuge, Varianten im **Spielgeld**-Schattenkonto | Branch, Tests, PR, Merge bei grünem CI (Regel aus CLAUDE.md) |
| **Gelb** (nur Entwurf) | Alles, was ändert, **wann oder wie** Aufträge gesendet oder Stops gesetzt werden (`broker_futures.py`, Auftragspfade in `pilot.py`, Regeln und Standardwerte in `pilot_kern.py`), Standard-Hebel, neue Strategien fürs Testnetz | Entwurfs-PR, bleibt offen, bis der User ja sagt |
| **Rot** (nie automatisch) | Echtes Geld einschalten (`BINANCE_FUTURES_TESTNET`, `KI_BOT_ECHTGELD`), `FREIGEGEBEN` in `pilot2_live.py`, Schutz- und Sperrcode (`pilot2_live.py`, `sperre.py`: jede Änderung braucht die ganze Prüfkampagne), Schlüssel und Auszahlungsrechte, mehr als 1,75× Hebel empfehlen, Prüfungen oder Grenzen lockern | Nur der User, ausdrücklich |

## Wochenroutine (geplante Sitzung, siehe unten)
1. `git fetch`, CI-Stand von `main` ansehen.
2. Messen: `python3 tools/trading/schatten/wochenbericht.py --schreiben` (hängt den Abschnitt an `docs/KRYPTO-WOCHENBERICHT.md` an, je Stand einmal).
3. Prüfen: alle Tests aus `.github/workflows/tages-update.yml` (Schritt «Tests») und `test_cockpit.py`, `test_wochenbericht.py` laufen lassen. Rot auf `main` = Ursache suchen; liegt sie in Gelb oder Rot, nur melden.
4. Genau **einen** Punkt aus dem Backlog (Grün) umsetzen, mit Tests und einer Mutationsprobe der neuen Tests, dann PR und Merge.
5. Kurz in `CLAUDE.md` unter «Stand» nachführen (nur gemessene Zahlen, ehrlich «Rauschen» bei unter 8 Wochen).
6. Dem User auf dem Handy in drei Sätzen sagen, was sich geändert hat und ob etwas seine Entscheidung braucht.

## Backlog (nur Grün; Selbstheilung und Check zuerst)
1. ✅ Cockpit-Ampel nennt den Grund eines gescheiterten Auftrags (03.11.2026).
2. ✅ Knopf «Alles prüfen & reparieren» und Check «Risiko-Stufe» (03.11.2026).
3. Check «PC-Uhr geht richtig» (gegen die Binance-Serverzeit, nur lesen): falsche Uhr = abgelehnte Aufträge.
4. Check «Schlüssel gültig» (Konto lesbar, Auszahlungsrecht aus), nur lesen.
5. Handy-Alarm: Anleitung für ntfy (kostenlos, ohne Konto) direkt in der Ampel; mit echtem Geld und ohne Handy-Alarm = rot.
6. Wochenbericht meldet zusätzlich Lücken im Schattenkonto (fehlende Tage) und den CI-Stand von `main`.
7. Cockpit-Hinweis «neue Version verfügbar» (nur lesen; das Einspielen bleibt ein Klick des Users).
8. Spielgeld-Turnier der Risiko-Stufen 1,5× / 1,75× / 2× im Schattenkonto (nur messen, **keine** automatische Stufenwahl; neue Reihen ab Einführungstag).
9. Dashboard «Pilot 2.0 Prüfstand» (Claude-Artefakt) mit den Zahlen des Wochenberichts nachführen.

## Was nicht automatisch geht
- Auf dem PC des Users aktualisiert sich nichts von selbst. Neue Versionen kommen als ZIP oder über «Update holen». Das ist gewollt: Eine Änderung soll nie ungeprüft auf ein Konto wirken.
- Das Testnetz-Konto auf dem PC (Logbücher nur lokal) ist von der Cloud aus unsichtbar. Der Wochenbericht beruht auf dem Spielgeld-Schattenkonto auf GitHub.
- Echtes Geld bleibt doppelt gesperrt (siehe `tools/trading/krypto_bot/README.md`).

## Stopp-Regeln für die Routine
Rotes CI, das nicht schon vorher rot war: melden statt in Gelb oder Rot herumzubauen. Fehlen Daten: nichts erfinden, es so schreiben. Höchstens ein Backlog-Punkt pro Lauf. Keine Schlüssel, keine Geheimnisse in Dateien oder Chats.
