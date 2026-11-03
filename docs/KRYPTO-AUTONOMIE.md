# Krypto-Autonomie: was automatisch besser werden darf und was nie

Stand 2026-11-03 (abends). Gilt für `tools/trading/` (Krypto-Pilot, Cockpit, Schattenkonto). Auftrag des Users: «mache selbstständig selber Verbesserungen und werde automatisch besser ohne mich».

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

## Auto-Update und Pflege ohne Klick (Auftrag des Users, 03.11.2026: «das muss viel mehr laufen, Automatisierung»)
Vorher musste der User ein ZIP entpacken, «Täglich automatisch» und «Alles prüfen & reparieren» klicken. Jetzt läuft die Kette von allein, und zwar **nur mit Spielgeld**:

1. **Cloud:** Landet eine Änderung an `tools/trading/` in `main`, baut `.github/workflows/krypto-paket.yml` ein Paket: alle Selbsttests wie auf dem PC (`krypto-auto.bat`), dazu `test_autoupdate.py` und `test_paket_bauen.py`; der Paketbau prüft das ZIP mit derselben Funktion wie der PC (Pfade, Prüfsummen, Syntax, Pflichtdateien, CRLF der `.bat`); das ZIP wird entpackt und dort läuft der Probelauf des PCs; erst dann das GitHub-Release `krypto-latest` (erst das ZIP, dann `paket.json`), danach eine Handy-Nachricht (Telegram). Jeder Fehler hält die Kette an und meldet es aufs Handy.
2. **PC:** `krypto-auto.bat` ruft nach dem Tageslauf, `cockpit.bat` beim Start `pflege.py` (`autoupdate.py` dann `cockpit.py --heilen`). Der Updater fragt höchstens alle 20 Stunden, lädt das Paket, prüft Prüfsumme und jeden Pfad, spielt die neue Version **zuerst in einer Kopie** (`data/krypto-update-tmp`) durch die Selbsttests (ohne den 6-Minuten-Test `test_pilot2_streng`, der läuft beim nächsten Tageslauf) und tauscht erst dann unter der Lauf-Sperre des Piloten: alte Dateien sichern (`data/krypto-update-backup`, die letzten drei), neue schreiben (Start-Skripte und `VERSION.json` zuletzt), zurücklesen, bei jedem Fehler alles zurück. Ein Absturz mitten im Tausch wird beim nächsten Start geheilt.
3. **Selbstpflege:** `cockpit.py --heilen` und ein Hintergrundfaden im Cockpit (beim Start, danach alle 6 Stunden) legen fehlende Windows-Aufgaben an (nur bei Auto-Handel AN) und frischen veraltete Markt-Infos auf. Sie senden nie Aufträge. Das Ergebnis steht in `data/krypto-pflege.json` und in der Ampel (Punkte «Programm-Update (automatisch)», «Selbstpflege (automatisch)»). Probleme kommen aufs Handy (Telegram/ntfy, falls eingerichtet), dieselbe Meldung höchstens einmal in 20 Stunden.

**Schutz, in der Reihenfolge der Wirkung**
- **Echtes Geld → der automatische Lauf macht nichts** (`BINANCE_FUTURES_TESTNET` oder `BINANCE_TESTNET` falsch, oder `KI_BOT_ECHTGELD` gesetzt). Dann nur der Knopf «Update holen».
- **Schalter am PC:** `setx KRYPTO_AUTOUPDATE aus` oder eine Datei `data\krypto-update-aus.txt`. Der Knopf «Update holen» geht trotzdem.
- **Not-Aus aus der Cloud:** eine Datei `docs/KRYPTO-UPDATE-STOPP.txt` mit einem Satz in `main` legen, dann holt kein PC mehr etwas (gilt auch für den Knopf). Löschen = weiter. Das ist der Hebel, falls ein fehlerhaftes Paket draussen ist.
- **Fehlversuche:** scheitert dieselbe Version zweimal (Probelauf, Prüfsumme, Tausch), wird sie 3 Tage ausgesetzt; eine neuere Version wird sofort versucht.
- **Nie angefasst:** `data/` (Logbücher, Buch von Pilot 2.0, Einstellungen), `tools/trading/daten/` (Kurs-Zwischenspeicher), die Not-Aus-Dateien `ki_bot/STOP` und `PAUSE`, die Schlüssel (liegen in der Windows-Umgebung). Dateien, die es nur beim User gibt, werden nie gelöscht: gelöscht wird nur, was die vorherige Paketversion selbst mitbrachte.
- **Zonen bleiben:** Was nach `main` kommt, kommt jetzt automatisch zum PC. Darum gilt hart: Gelb und Rot (siehe Tabelle) kommen **nur nach dem ausdrücklichen Ja des Users** in `main`. Ein Merge ohne dieses Ja ist ein Verstoss, nicht nur ein Prozessfehler.
- **Wochenroutine:** nach jedem Merge, der `tools/trading/` berührt, den Lauf «Krypto-Paket» ansehen (`actions_list`, Workflow `krypto-paket.yml`). Rot = melden, nicht weiterbauen.

## Drei Zonen
| Zone | Was | Wie |
|---|---|---|
| **Grün** (automatisch) | Berichte und Auswertungen, Cockpit-Anzeige (nur lesen), Texte, Doku, Tests, Prüfwerkzeuge, Varianten im **Spielgeld**-Schattenkonto | Branch, Tests, PR, Merge bei grünem CI (Regel aus CLAUDE.md) |
| **Gelb** (nur Entwurf) | Alles, was ändert, **wann oder wie** Aufträge gesendet oder Stops gesetzt werden (`broker_futures.py`, Auftragspfade in `pilot.py`, Regeln und Standardwerte in `pilot_kern.py`), Standard-Hebel, neue Strategien fürs Testnetz; ebenso **die Update-Kette selbst** (`autoupdate.py`, `pflege.py`, `paket_bauen.py`, `krypto-paket.yml`) und die Start-Dateien (`*.bat`, `*.vbs`): sie bestimmen, was auf dem PC läuft | Entwurfs-PR, bleibt offen, bis der User ja sagt |
| **Rot** (nie automatisch) | Echtes Geld einschalten (`BINANCE_FUTURES_TESTNET`, `KI_BOT_ECHTGELD`), `FREIGEGEBEN` in `pilot2_live.py`, Schutz- und Sperrcode (`pilot2_live.py`, `sperre.py`: jede Änderung braucht die ganze Prüfkampagne), Schlüssel und Auszahlungsrechte, mehr als 1,75× Hebel empfehlen, Prüfungen oder Grenzen lockern | Nur der User, ausdrücklich |

## Wochenroutine (geplante Sitzung, siehe unten)
1. `git fetch`, CI-Stand von `main` ansehen.
2. Messen: `python3 tools/trading/schatten/wochenbericht.py --schreiben` (hängt den Abschnitt an `docs/KRYPTO-WOCHENBERICHT.md` an, je Stand einmal).
3. Prüfen: alle Tests aus `.github/workflows/tages-update.yml` (Schritt «Tests») und `test_cockpit.py`, `test_wochenbericht.py`, `test_autoupdate.py`, `tools/trading/test_paket_bauen.py` laufen lassen; dazu der letzte Lauf von `krypto-paket.yml` (grün = das Paket ist draussen). Rot auf `main` = Ursache suchen; liegt sie in Gelb oder Rot, nur melden.
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
7. ✅ Neue Version kommt von selbst (Auto-Update, 03.11.2026), nur mit Spielgeld; der Hinweis «neue Programmversion installiert» steht im Cockpit.
8. Spielgeld-Turnier der Risiko-Stufen 1,5× / 1,75× / 2× im Schattenkonto (nur messen, **keine** automatische Stufenwahl; neue Reihen ab Einführungstag).
9. Dashboard «Pilot 2.0 Prüfstand» (Claude-Artefakt) mit den Zahlen des Wochenberichts nachführen.
10. Das Release-Telegram nennt, ob Handels- oder Schutzdateien (`pilot*.py`, `broker_*.py`, `sperre.py`, `*.bat`) gegenüber dem letzten Paket geändert sind (nur Hinweis, keine Sperre).
11. `autoupdate.py --erholen` ganz vorn in `krypto-auto.bat`: heute heilt ein Absturz mitten im Tausch erst am Ende des nächsten Tageslaufs (der Selbsttest am Anfang würde den halben Stand sehen und den Handel für diesen Tag auslassen). Gelb, weil es die Start-Datei des Piloten berührt.
12. Handy-Alarm ohne Zutun: Anleitung für ntfy direkt in der Ampel (Backlog 5), damit die Meldungen von «Pflege» den User sicher erreichen.

## Was nicht automatisch geht
- Die Cloud sieht den PC nicht (kein Zugriff, keine Schlüssel). Ob ein Update dort ankam, steht nur in der Ampel und im Handy-Alarm des PCs. Mit echtem Geld macht der Auto-Update nichts: dort bleibt jede Änderung ein Klick des Users. (Bis 03.11.2026 galt das für alle Fälle; der User hat es für Spielgeld ausdrücklich anders gewollt.)
- Das Testnetz-Konto auf dem PC (Logbücher nur lokal) ist von der Cloud aus unsichtbar. Der Wochenbericht beruht auf dem Spielgeld-Schattenkonto auf GitHub.
- Echtes Geld bleibt doppelt gesperrt (siehe `tools/trading/krypto_bot/README.md`).

## Stopp-Regeln für die Routine
Rotes CI, das nicht schon vorher rot war: melden statt in Gelb oder Rot herumzubauen. Fehlen Daten: nichts erfinden, es so schreiben. Höchstens ein Backlog-Punkt pro Lauf. Keine Schlüssel, keine Geheimnisse in Dateien oder Chats.
