# Suchanfragen und Keywordliste (10.11.2026)

**Anlass:** Besitzer 10.11. «suchanfrage und keywordliste erweitern», mit dem Bild des Codex-Monitors (Abschnitt «Suchanfragen und durchschnittliche Position»: 15 Anfragen, «Teilauszug, weitere Top-Zeilen vorhanden. Keine vollständige Keywordliste.»).
**Auslegung (meine, nicht bestätigt):** alle Anfragen zeigen, die Google für luxestyle.ch ausweist, dazu eine brauchbare Keywordliste (Stichwörter, Chancen, Ideen). Der Codex-Monitor selbst bekommt nur die Fähigkeit, eine lange Liste zu zeigen; seine Daten holt Codex aus seinem eigenen Zugang.

## Was es gibt

| Teil | Wo | Was |
|---|---|---|
| Seite «LuxeStyle Suchanfragen» | privates Claude-Dashboard (Link im Chat und in `CLAUDE.md`) | Reiter Übersicht, Anfragen, Stichwörter, Chancen, Ideen; Suche, Filter, «Liste kopieren» |
| Datenbau | `kwlib.py`, `bauen.py` | Wortlogik und Datensätze aus den Search-Console-Auszügen; schreibt JSON und CSV |
| Ideen-Ernte | `suggest.py` | Googles Autovervollständigung (Schweiz, Deutsch), kostenlos, mit Pause und Abbruch bei 429/403 |
| Seitenvorlage | `seite.html` | Inhalt von `files/index.html` des Dashboards |
| Monitor-Vorlage | `tools/buero/seo_monitor.html` | Suche, «Mehr anzeigen» (50 je Schritt) und ein Satz zur Deckung der Website-Summe; alles Übrige unverändert |
| Tests | `bauen.py --selbsttest`, `suggest.py --selbsttest`, `mutationsprobe.py`, `seite_test.mjs`, `monitor_test.mjs`, `mutationsprobe_seite.py`, `mutationsprobe_monitor.py` | siehe unten |

**Die Messwerte liegen nicht in Git** (Regel der Codex-Übergabe: private Rohdaten ausserhalb). Das Repo enthält nur Code, die Vorlage und dieses Protokoll mit Summen.

## Stand der Messung (GEMESSEN 10.11.2026 00:20 UTC, Search Console über OpenSEO, Websuche, `data_state=all`)

- **Zeitraum 04.10. bis 07.11.2026 (35 Tage).** Davor liefert die Search Console für diese Website nichts (die Tagesreihe beginnt am 04.10.). Die jüngsten Tage sind vorläufig.
- **4 442 verschiedene Anfragen**, davon 4 232 mit Impressionen in der Schweiz (93,0 % der Impressionen der Liste). Gesamt der Website: **18 892 Impressionen, 122 Klicks**, Platz im Schnitt 51,6 (aus den Tageswerten, nach Impressionen gewichtet).
- **Deckung der Liste:** 16 434 Impressionen (87,0 %) und nur **25 Klicks (20,5 %)**. Die übrigen 79,5 % der Klicks stammen aus Anfragen, die Google nicht nennt (seltene Anfragen). Eine vollständige Keywordliste gibt Google nicht heraus; was hier steht, ist alles, was für diese Website ausgewiesen wird.
- **Plätze:** 35 Anfragen auf Platz 1–3, 158 auf 4–10, 241 auf 11–20, 1 143 auf 21–50, 2 865 ab Platz 51. Auf Seite 1 stehen 193 von 4 442.
- **Wo die Sichtbarkeit liegt (Stichwort-Gruppen):** die «Selbst gestalten»-Produkte (bedrucken 1 195 Impressionen, T-Shirt 953, gestalten 723, Tasse 553) stehen sehr breit, aber auf Platz 73 bis 87; Trinkbrunnen/Katzen (519 und 498 Impressionen, Platz 29–37) und Weihnachtspyjama (384, Platz 24) liegen deutlich näher an Seite 2. Meistgesehene Seiten: `/products/shirt-zum-selbstgestalten` 1 171 Impressionen, `/products/tasse-zum-selbstgestalten` 655, `/collections/trinkbrunnen-katzen` 328, `/collections/weihnachtspyjama-familie` 321.
- **Chancen (Platz 4 bis 50, mindestens 3 Impressionen): 453.** Oben stehen familien-weihnachtspyjama (169 Impressionen, Platz 22,8), trinkbrunnen katze (114, 16,6), partner weihnachtspyjama (104, 21,3), tier trinkbrunnen, elektrischer futterspender für katzen. Das deckt sich mit den Hebeln vom 09.11. (`dropship/ranking-0911/README.md`); neu ist nur, dass es jetzt die vollständige Reihe ist.
- **Ideen:** 1 666 neue Vorschläge aus 99 Suchanfragen (ohne bekannte Anfragen, ohne Händler und Marken wie fressnapf, decathlon, c&a).
- **Auffällig:** `/fr/`-Produktseiten erscheinen für deutsche Anfragen (z. B. «lipglossset», «outdoor camera»). `/fr/` trägt für Produkte, Sammlungen und Blog seit 07.11. `noindex`; Google kann die Seiten trotzdem noch kennen, bis es sie neu abgerufen hat (Hypothese, nicht gemessen).

## Was NICHT gemessen ist

- **Suchvolumen:** unbekannt. OpenSEO-Punkte und Semrush-Einheiten sind aufgebraucht; Impressionen zeigen nur, wo die Website erscheint, nicht wie oft insgesamt gesucht wird.
- **Wirkung der Ideen:** Autovervollständigung zeigt, was Menschen tippen, nicht wie oft. Welche Idee Nachfrage hat, ist offen.
- **Das Aussehen der Seite im echten Dashboard** (Handy, Safari): getestet nur mit einer Attrappe der Dashboard-Laufzeit in Chromium (390 und 1280 px, hell und dunkel). Das `check`-Dokument des Dashboards lag bis zum Schreiben dieses Protokolls nicht vor (niemand hatte die Seite geöffnet).
- **Der Codex-Monitor mit mehr Zeilen:** die erweiterte Vorlage ist getestet, aber sie zeigt nur, was Codex ihr als Datenstand gibt. Solange Codex 15 Zeilen liefert, bleibt die Anzeige bei 15 (und sagt «Teilauszug»).

## Neu messen / Seite auffrischen

1. Auszüge holen: OpenSEO `get_search_console_performance`, Projekt `LuxeStyle CH`, `dataState: all`, feste Daten (`startDate`/`endDate`, alle Auszüge im selben Zeitraum), je 1 000 Zeilen mit `startRow` 0, 1000, … bis keine mehr kommen:
   - `dimensions: ["query"]` (alle Länder), dazu dieselbe Abfrage mit Filter `country equals che`,
   - `dimensions: ["query","page"]`,
   - `dimensions: ["date"]` (Tagesreihe).
   Der Werkzeugaufruf legt grosse Antworten als Datei ab; die letzte Teilantwort kommt eventuell nur inline (dann mit einem überlappenden `startRow` nochmals holen, damit sie als Datei vorliegt).
2. Ideen holen (optional): `python3 suggest.py SEEDS.json AUSGABE.json 0.45` (Seeds = die Anfragen der Chancen-Liste, höchstens ein paar Hundert; etwa 6 Abrufe je Seed, 0,45 s Pause). Bei HTTP 429/403 bricht der Lauf ab und speichert das Teilergebnis.
3. Bauen: `python3 -I bauen.py --alle … --ch … --seiten … --tage TAGE.json --ideen AUSGABE.json --von 2026-10-04 --bis <letzter Tag> --abgerufen <UTC-Zeit> --aus ORDNER` (schreibt `anfragen.json`, `stichwoerter.json`, `chancen.json`, `ideen.json`, `seiten.json`, `tage.json`, `stand.json` und vier CSV).
4. Dashboard: die JSON-Dateien mit `Artifact` (`asset: true`) hochladen, in den Dokumenten `datasets/<name>` die Adresse `/_blob/…` und `updated` setzen (`ArtifactData update`, `if_version`), `files/index.html` nur bei Änderung der Vorlage.
5. Codex-Monitor: ein Snapshot im Format der Vorlage (`sites[].queries` = die Zeilen aus `anfragen`, mit `keys`, `clicks`, `impressions`, `ctr`, `position`) zeigt alle Zeilen mit Suche; die Zeilen der Anfragenliste können dafür direkt aus `anfragen.json` umgeformt werden.

## Methode (damit niemand Zahlen glauben muss)

- **Stichwörter:** Wörter ohne Funktionswörter, Kaufwörter (kaufen, günstig, Schweiz …) und Zahlen; Umlaute und Endungen vereinheitlicht (nur als Gruppierschlüssel, angezeigt wird die häufigste Schreibweise); mindestens 3 Anfragen. Eine Anfrage zählt in jeder ihrer Gruppen, die Gruppen lassen sich nicht addieren.
- **Platzklassen:** Platz ≤ 3, ≤ 10, ≤ 20, ≤ 50, darüber (je 10 Treffer je Ergebnisseite).
- **Chancen:** Platz über 3 und höchstens 50, mindestens 3 Impressionen, Reihenfolge nach Impressionen geteilt durch die Wurzel des Platzes. Das ist eine Einschätzung der Reihenfolge, keine Messung der Nachfrage.
- **Zielseite einer Anfrage:** die Seite mit den meisten Impressionen unter den Zeilen «Anfrage × Seite»; Adressen mit `?variant=…` zählen zur selben Seite.
- **Impressionen je Anfrage** sind die Werte der Abfrage nach Anfrage; die Zeilen «Anfrage × Seite» ergeben mehr (eine Anfrage kann mehrere Seiten zeigen), darum stehen sie nur für die Zielseite und die Seitenliste da.
- **Ideen:** nur zu Suchanfragen aus der Liste (Stichwörter allein lieferten Rauschen wie «uhrzeit bangkok», «partner mit adhs trennt sich plötzlich»); ohne Händler und Marken (`kwlib.MARKEN`, ergänzbar).

## Tests und Grenzen der Tests

- `python3 -I -B bauen.py --selbsttest` (Wortlogik, Grenzfälle der Klassen und Chancen, Vereinigung der Auszüge, CSV mit Schutz vor Formeln und BOM, Ideenfilter), `python3 -I -B suggest.py --selbsttest` (Abruf mit Attrappe, Fortsetzen, Sperre).
- `python3 -I -B mutationsprobe.py`: 42 gezielte Änderungen an `kwlib.py`, `bauen.py`, `suggest.py`; **42 von 42 erkannt** (erster Lauf: 10 überlebten, weil Grenzwerte, Gruppenzählung, Marken als ganzes Wort und Fragment-Adressen nicht geprüft waren; der Test wurde geschärft). Ein Lauf mit altem Bytecode täuschte Überlebende vor: `-B` setzen.
- `node seite_test.mjs` (synthetische Daten) oder `KS_DATEN=<Ordner mit den JSON> node seite_test.mjs`: Seite in Chromium mit einer Attrappe der Dashboard-Laufzeit; prüft Zahlen im Kopf, Platzbalken und Tagesbalken (Länge, Tooltip), Reiterwechsel, Suche (Gross/klein), Klassenfilter, Reihenfolge nach Impressionen, Platz, Klicks und A–Z, Mindestwert, Mehr-Knopf, «Liste kopieren», Sprung vom Stichwort in die Anfragen, fehlende Elemente (von Hand gelöscht: Abschnitt, Knöpfe, Suchfelder), kein seitliches Scrollen auf dem Handy (hell und dunkel), keine Konsolenfehler. Mit `KS_BILDER=<Ordner>` zusätzlich Bilder. **Mutationsprobe `mutationsprobe_seite.py`: 14 von 14 erkannt** (im ersten Lauf überlebten 5: Balkenlängen, Gross/klein in der Suche, Guards bei fehlenden Elementen und die Klick-Reihenfolge waren nicht geprüft).
- `node monitor_test.mjs`: die erweiterte Monitor-Vorlage mit synthetischem Datenstand (300 und 15 Zeilen, Teilauszug, Seitenwechsel, Suche, Mehr-Knopf, Deckungssatz, Content-Security-Policy unverändert, keine Netzzugriffe); Mutationsprobe `mutationsprobe_monitor.py` an der Vorlage **15 von 15 erkannt** (zwei überlebten zuerst: Grossschreibung in den Anfragen und das Zurücksetzen der Suche beim Seitenwechsel waren nicht geprüft). Beide Browser-Proben laufen nur lokal (`NODE_PATH=$(npm root -g) python3 mutationsprobe_seite.py`), nicht in der CI.
- CI: `.github/workflows/keywordliste-test.yml` (eigene kleine Datei, nur bei Änderungen in diesem Ordner oder an der Monitor-Vorlage).
- **Die Attrappe ist nicht die echte Laufzeit.** Was die Attrappe nicht kennt (Auflösung der `/_blob/`-Dateien, die Prüfung der Marken `data-source`, das Verhalten unter `hidden`), zeigt erst das `check`-Dokument des Dashboards, sobald jemand die Seite öffnet.

## Rücknahme

Nichts im Shop oder bei Google wurde geändert. Das Dashboard ist privat; löschen geht im Dashboard. Die Monitor-Vorlage: `git revert` des Commits (sie wird nur von Hand mit einem Datenstand gefüllt, nichts hängt davon ab).

## Lehren

1. **Ein Auszug mit 15 Zeilen war kein Fehler der Anzeige, sondern der Abfrage:** die Search Console liefert auf Wunsch tausende Zeilen je Aufruf. Vor dem Erweitern einer Anzeige zuerst messen, wie viel Daten es gibt (hier 4 442 Anfragen).
2. **Die Liste ist nicht das Ganze:** 87 % der Impressionen, aber nur 20,5 % der Klicks stehen in der Anfrageliste. Wer aus ihr «die Keywords der Website» ableitet, übersieht vier Fünftel der Klicks. Der Deckungssatz steht deshalb auf der Seite und in der Monitor-Vorlage.
3. **Ein Test, der sofort grün ist, braucht die Mutationsprobe:** zehn Überlebende im ersten Lauf, zwei in der Monitor-Vorlage.
4. **Ein unsichtbares Zeichen im Quelltext (U+FEFF als echtes Zeichen statt `﻿`) hielt die Mutationsprobe für «nicht anwendbar»:** Quelltext mit nur sichtbaren Zeichen schreiben.
5. **`python -I` ignoriert `PYTHONDONTWRITEBYTECODE`:** für Proben, die Dateien gleicher Länge ändern, `-B` angeben, sonst läuft der alte Bytecode.
