# Minispiele: begrenzte Reparaturrunde, 15.11.2026

Arbeitsbaum `/tmp/aban-neon-coop`, Zweig `codex/neon-flug-koop`. Keine Commits, kein Push, kein Merge. Nur zugewiesene Minispiel-Dateien und dieser eigene Bericht/Test geändert. Fremde Änderungen nicht zurückgesetzt.

## Ergebnis und Nachweise

**GEMESSEN:** 20 eigenständige Spiele plus Index inventarisiert. Keine Legacy-Weiterleitung innerhalb dieses Bereichs. Alle 20 unveränderten Seitenantworten im echten Chromium gestartet, jeweils auf **390×540 mit Touch** und **900×540**. Abschliessender Lauf gegen **http://127.0.0.1:8112** mit tatsächlichen Response-Headern: **60 Prüfungen bestanden, 0 Fehler** (40 Starts, 20 gezielte Prüfungen einschliesslich Index). Browser in `finally` geschlossen, Assertion-Fehler liefern Exit 1.

Bei den gezielten Tests werden bei Bedarf ausschliesslich in der Testantwort lesende Zustandsgriffe ergänzt. Ausnahme: Pongs verpasster Ball wird als definierter Grenzzustand eingespeist; Neustarts werden zusätzlich direkt zur RAF-Leck-Prüfung aufgerufen. Header bleiben unverändert. Keine deaktivierte CSP, kein `ignoreHTTPSErrors`, keine externen Assets/Dienste, keine Änderungen an `js/mp.js`, `js/arcade.js`, `js/vendor` oder `_headers`.

### Bestätigte Fehler vor und nach der Reparatur

| Datei | Reproduktion vorher | Nachher / gezielter Nachweis |
|---|---|---|
| `minispiele/ballon-pump.html` | 390×540: Arena 559 px hoch, untere Pump-/Stoppbuttons y=503..559 bei verdecktem Seitenüberlauf. Beim Platzen meldete `msg0` „Peng!“, `ftxt0` blieb beispielsweise auf **69 %**. | Kompakte Darstellung mit freier Rücknavigation; alle vier Pump-/Stoppbuttons liegen innerhalb des Bildschirms und ihre Mittelpunkte sind anklickbar. `render()` aktualisiert vor der Platzanimation Balken und „GEPLATZT“. Drei Punkte, Matchende und Reset geprüft. |
| `minispiele/farb-klick.html` | 390×540: untere Farbreihe y≈486,8..558,8, vom nicht scrollbareren Layout abgeschnitten. | Alle zwölf Farbtasten erreichbar, jeweils mindestens 44 px hoch. Wortregel, falsche Farbe/Sperre, vier Punkte und Revanche geprüft. |
| `minispiele/drei-gewinnt.html` | Felder 0,3,1,4,2 gewinnen lassen; vor 700 ms „Neu“ drücken: leeres Brett, danach trotzdem `overlay show` mit altem Sieg. | Ausstehenden Ergebnistimer beim Rundenwechsel löschen. Leeres Brett bleibt frei; anschliessender echter Sieg, Remis und Revanche geprüft. |
| `minispiele/hoch-tief.html` | Nach echtem Touch verhinderte `preventDefault()` den synthetischen Klick; `handled=true` unterdrückte dann den ersten echten Mausklick desselben Buttons. | Native Button-Klicks bedienen Touch/Maus/Tastatur gemeinsam. Echter Tap gefolgt von echtem Mausklick wird verarbeitet. 20 Tipps, gleiche Karte als Punkt, Ende/Reset geprüft. Bereits geltende Regeln „Ass = 1“ und Gleichstand-Punkt sichtbar erklärt. |
| `minispiele/index.html` | Beschreibung versprach 21 Spiele bei tatsächlich 20 Links; Footer nannte gegeneinander gespielte Duelle „Koop“. | Metadaten nennen 20, Footer „20 lokale Duelle“. 20 eindeutige Links und Wortlaut geprüft. Kein Online-/Koopversprechen hinzugefügt. |
| `minispiele/pong.html` | Gleich lange Sekunde mit kontrollierten RAF-Zeitstempeln: bei 30 Hz noch `serve`, bei 60 Hz gerade `play`, bei 120 Hz bereits längerer Ballwechsel. Spielfeldkoordinaten kamen inklusive Padding vom Elterncontainer statt vom Canvas. | Zeitbasierte Bewegung, Aufschlag und Partikel; Kollisionsschritte höchstens ein ursprünglicher 60-Hz-Schritt. Canvasmasse aus dem tatsächlichen Canvas, Ballposition beim Resize proportional erhalten. Aufschlag nach 1033,3 / 1016,7 / 1000 ms bei 30 / 60 / 120 Hz, also innerhalb eines 30-Hz-Frames. Schlägerposition, Canvasmasse, fünf Punkte und Reset geprüft. |
| `minispiele/schere-stein-papier.html` | Spieler 1 wählt Stein, Spieler 2 noch offen: genau der gewählte Knopf bekommt `.picked` und verrät die Wahl. | Alle drei eigenen Knöpfe werden gleich gesperrt; keine Auswahlmarkierung, Fokus entfernt. Andere Seite weiter frei. Remis, drei Siege und Revanche geprüft. Sichtschutz gegen unmittelbares Zuschauen beim Tippen bleibt naturgemäss Aufgabe der Spieler. |
| `minispiele/schlange-duell.html` | Direkt nach Start lagen alle drei Segmente jeder Schlange auf derselben Zelle. Zwei Apfel-Spawns mit `Math.random=()=>0` erzeugten zweimal `(0,0)` nach ausgeschöpften Zufallsversuchen. | Körper startet mit drei aufeinanderfolgenden Zellen entgegen der Laufrichtung. Apfel wird aus freien Zellen gewählt; keine Ausgabe bei vollem Brett. Eindeutige Körper/Äpfel unter konstantem Zufall, Crash und Reset geprüft. |
| `minispiele/stapel-turm.html` | Touchfähiges Browserfenster, echte Maus: Canvas-Klick ohne Platzierung, weil `ontouchstart` vorhanden. Anfangs ein ausstehender RAF; nach erneutem `newGame()` zwei parallele Schleifen. | Pointer-Eingabe für Maus/Touch, vorherigen RAF stoppen, Zeitbasis/Fallteile/Flash zurücksetzen. Sechs tatsächliche Maus-Platzierungen bis Ergebnis, Revanche und vier zusätzliche Starts mit weiter genau einem ausstehenden RAF geprüft. |
| `minispiele/tap-duell.html` | Touch setzte ein bleibendes `touched=true`; da der synthetische Mausklick unterdrückt wurde, verlor ein späterer echter Mausklick seinen Punkt. | Ein Pointer-Ereignis pro Finger/Mausdruck. Echter Tap plus echter Mausklick ergeben zwei Punkte; Zeitende und Reset geprüft. |

Die Screenshots `/tmp/minispiele-farb-klick.png`, `/tmp/minispiele-ballon-pump.png` und `/tmp/minispiele-pong.png` wurden selbst angesehen. Beim Ballon wurde danach die mittige Rundenplakette an den durch den Navigationsabstand verschobenen Trenner angepasst; anschliessende Hit-Tests bestanden.

## Alle zwanzig Spiele klassifiziert und geprüft

Alle Zeilen: echter Browserstart auf beiden Grössen, kein JS-Absturz, kein horizontaler Seitenüberlauf. Die Zeilen beschreiben konkrete Prüfabdeckung, keine Fertigfreigabe.

| Adresse unter `minispiele/` | Identität / Regeln | Ende und Neustart im Browser |
|---|---|---|
| `auto-rennen.html` | Lokaler Tippwettkampf, A/L im Code vorhanden | 57 rote Tipps nach Countdown → Ziel/Sieg; Reset auf 0 |
| `ballon-pump.html` | Gleichzeitiges lokales Risikoduell; zuerst drei Punkte | Platzen, Stoppvergleich, Match und Reset |
| `drei-gewinnt.html` | Abwechselndes lokales Brettduell | Sieg, Remis, Ergebnis-Timer/Reset, Revanche |
| `elfmeter.html` | Abwechselnd Schütze/Torwart; je maximal fünf Schüsse, früher Schluss bei uneinholbarem Stand | Gehalten, Tor, uneinholbarer Sieg, leere Revanche |
| `farb-klick.html` | Lokales Reaktionsduell; Wortbedeutung zählt, erste vier Punkte | Fehlersperre, Sieg, Revanche |
| `hoch-tief.html` | Abwechselndes Kartenduell; je zehn Tipps, Ass niedrig, gleiche Karte zählt | 20 Tipps, Gleichstandkarte, Endschirm und Reset |
| `mathe-duell.html` | Lokales Rechenduell; erste vier, Fehler sperrt nur eigene Seite | Antworten gegen selbst berechnetes Ergebnis geprüft, vier eindeutige Optionen, Sperre, Sieg/Reset |
| `maulwurf.html` | Lokaler Trefferwettkampf über 20 Sekunden | Treffer, Zeitablauf und Reset |
| `memory.html` | Abwechselnd, Extra-Zug beim Paar | Fehlpaar wechselt Spieler; alle acht Paare, Ende/Reset |
| `pong.html` | Gleichzeitiges lokales Geschicklichkeitsduell, zuerst fünf | Schläger, definierter verpasster Ball, fünf Punkte, Reset; Zeitvergleich |
| `punkte-jagd.html` | Lokales Sternfangduell über 30 Sekunden | Treffer, Zeitablauf, Reset |
| `quiz-buzzer.html` | Lokales Buzzerduell über zehn Fragen | Alle zehn richtigen Antworten, 10 Punkte, Ende/Reset |
| `reaktions-duell.html` | Best of 5; Frühstart gibt Gegner Punkt | Drei Frühstarts → 0:3, Ende/Revanche |
| `schere-stein-papier.html` | Verdecktes lokales Duell, zuerst drei Siege, Remis ohne Punkt | Auswahl verborgen, Remis, Match und Reset |
| `schlange-duell.html` | Gleichzeitiges lokales Schlangenduell, WASD/Pfeile bzw. Wischhälften | Eindeutiger Körper/Spawn, gemeinsamer Crash und Reset |
| `simon.html` | Lokaler Gedächtnisvergleich nacheinander | Erfolgreiche Folge, Fehler, Wechsel, Sieg und Reset |
| `stapel-turm.html` | Lokaler Timingvergleich, drei Platzierungen je Spieler | Sechs Platzierungen, Ergebnis, Reset und RAF-Leck |
| `tap-duell.html` | Lokaler Tippvergleich über zehn Sekunden | Zählen, Zeitende und Reset |
| `tauziehen.html` | Lokaler Tippwettkampf, zuerst zwei Rundensiege | Zwei Siege, Matchende und Reset |
| `vier-gewinnt.html` | Abwechselndes lokales Brettduell | Vertikaler Vierer, Endschirm und Revanche |

`minispiele/index.html` ist der lokale Katalog, kein 21. Spiel. Die elf Spieldateien ohne bestätigten eigenen Defekt wurden nicht umgeschrieben.

## Wiederholen

```bash
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers GAME_BASE_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/minispiele-qa.cjs
```

Optional: `PLAYWRIGHT_MODULE`, `PW_CHROME`, `MINI_QA_OUT`. Ohne Optionen wird lokal installiertes Playwright mit seinem Chromium und `/tmp/minispiele-qa.json` verwendet. Abschliessender Log: `/tmp/minispiele-final-qa.log`. `git diff --check` für eigene Änderungen bestanden.

Die nach AGENTS.md zusätzlich aufgerufene `bash automation/ci_simulation.sh` **konnte nicht starten**: `mktemp` schreibt ausdrücklich nach `/home/agent`, das hier schreibgeschützt ist. Der Helfer testet zudem nur eingechecktes HEAD; dieser Auftrag verbietet Commits. Kein HOME-Umbiegen, kein Rechte- oder Commit-Workaround. Das ist kein bestandenes CI-Ergebnis; die 60 Browserprüfungen betreffen den tatsächlichen Arbeitsbaum.

## Gemeinsamer Befund und offene Grenzen

- **An Hauptagent gemeldet:** Baseline-Port 8100 lieferte bei Minispielen `frame-ancestors 'none'` und `X-Frame-Options: DENY`, obwohl der Index Einbettung in Lebenspfad bewirbt. `_headers` wird ausschliesslich vom Hauptagenten repariert. Finalprüfung verwendet dessen Port 8112. Der eigene Bericht beansprucht keinen unabhängigen Zwei-Geräte-, Mikrofon-, WebRTC- oder Lebenspfad-Einbettungsnachweis; die Integration liegt beim Hauptagenten.
- Diese Spiele sind lokale Wettbewerbe bzw. lokale Spiele nacheinander. Kein Online-Koop implementiert oder behauptet.
- Kleine Portraitseiten wie Elfmeter, Drei gewinnt und Höher/Tiefer sind scrollbar; unterhalb der ersten Bildschirmhöhe liegende Bedienelemente sind dort kein abgeschnittenes, gesperrtes Vollbildlayout. Es erfolgte kein vollständiges Layout-Redesign.
- Keine vollständige Prüfung aller Bildschirmgrössen, echter iOS-/Androidgeräte oder aller Richtungs-/Remisvarianten von Vier gewinnt. Kein Langzeit-Leistungstest. Elfmeter-/Vier-gewinnt-Animationen sind weiterhin framebasiert; deren Refresh-Rate-Verhalten wurde in dieser begrenzten Runde nicht gemessen oder umgebaut.
- Kein allgemeiner Pause-/Mute-/Tastatur-Umbau. Der Grenzfall einer bereits wachsenden Schlange beim gleichzeitigen Betreten fremder Schwanzzellen wurde nicht verändert oder vollständig verifiziert.
- Der QA-Lauf verwendet zum Zeitraffen Playwrights Uhr; 30/60/120-Hz-Vergleich verwendet kontrollierte RAF-Zeitstempel. Das ist kein gemessener realer Geräte-FPS-Benchmark.

## Geänderte Pfade

- `minispiele/ballon-pump.html`
- `minispiele/drei-gewinnt.html`
- `minispiele/farb-klick.html`
- `minispiele/hoch-tief.html`
- `minispiele/index.html`
- `minispiele/pong.html`
- `minispiele/schere-stein-papier.html`
- `minispiele/schlange-duell.html`
- `minispiele/stapel-turm.html`
- `minispiele/tap-duell.html`
- `spiele-dev/parallel-audit/minispiele-qa.cjs`
- `spiele-dev/parallel-audit/minispiele.md`
