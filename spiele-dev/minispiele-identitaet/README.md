# Drei eigene Spielmechaniken

Nur `minispiele/tap-duell.html`, `minispiele/auto-rennen.html`, `minispiele/tauziehen.html` und dieser Prüfungsordner gehören zu dieser Änderung. Keine Änderung am Katalog, an gemeinsamen Quellen, Headern oder den anderen Spielen. Keine Veröffentlichung, kein Commit.

Die folgenden Regeln und Zeitwerte sind **SETZUNG** des Spielentwurfs:

| Spiel | Zentrale Entscheidung | Lokale Steuerung |
| --- | --- | --- |
| Tipp-Duell | Zwölf sichtbare Schläge präzise treffen. Erster Schlag nach 1000 ms, danach alle 750 ms; Runde 10 s. Bis ±55 ms gibt es 100 Punkte, bis ±140 ms 50. Ein verfrühter Versuch belegt den Schlag und kostet 40 Punkte; doppelte/zusätzliche Versuche kosten 25. Punktestand bleibt mindestens null. | Rot oben: A oder eigene Hälfte. Blau unten: L oder eigene Hälfte. Gedrückte Tasten erzeugen keine Wiederholungen. |
| Schalt-Rennen | Gas halten, Drehzahl beobachten und fünf Gänge ausfahren. Hochschalten bei 72–90% Drehzahl erhält das Tempo. Zu früh: Gang bleibt, Tempo sinkt; zu spät: höherer Gang mit Tempoverlust. Schaltsperre 650 ms. | Rot: A halten, S schalten; Blau: K halten, L schalten. Auf Touch zwei getrennte Knöpfe je Spieler, Gas darf beim Schalten gehalten bleiben. |
| Tauziehen | Halten verbraucht 27 Ausdauerpunkte/s; Loslassen regeneriert 35/s. Kraft sinkt mit der Ausdauer. Bei null bleibt die Kraft gesperrt, bis beim Loslassen mindestens 35% erreicht sind. | Rot unten: A oder Pad halten. Blau oben: L oder Pad halten. Ausdauer, Kraft und Erschöpfung sind sichtbar. Zwei Rundensiege entscheiden das Match. Nach 25 s entscheidet die Position; weniger als ein Prozentpunkt Abstand von der Mitte wiederholt die Runde ohne Punkt. |

**GEMESSEN im reinen Fahrmodell**, mit gleicher gehaltener Gasstellung und 120 Simulationsschritten/s: Schalten bei 80% Drehzahl erreicht das Ziel nach 9,692 s; ausschließlich Gas nach 40,233 s; permanenter Schaltversuch nach 33,125 s. Das sind Modellmessungen, keine gemessenen Browser-Spielzeiten.

## Ausführen und Prüfumfang

```sh
node --test spiele-dev/minispiele-identitaet/mechanik.test.cjs
node_modules/.bin/html-validate minispiele/tap-duell.html minispiele/auto-rennen.html minispiele/tauziehen.html
git diff --check
```

**GEMESSEN:** 21 Tests bestanden; HTML-Prüfung ohne Fehler und Warnungen; Diff-Prüfung sauber.

Die Logiktests lesen `script#game-logic` direkt aus den ausgelieferten HTML-Dateien und führen diese Originalfunktionen in Node-VMs aus. Es gibt keine kopierte Ersatzmechanik. Geprüft werden unter anderem Rhythmusfenster und Spam, Schaltstrategie gegen Dauerhalten/Spam, unterschiedliche Bildraten, Erschöpfung/Erholung, Symmetrie und Gleichstand.

Die Controllerprüfungen führen zusätzlich das unveränderte zweite Inline-Script aus. Eine kleine Fixture stellt nur die tatsächlich vorhandenen HTML-IDs, Eventregistrierung, Klassen, Text, Styles und RAF-Zeit bereit. Canvas-Zeichenbefehle sind leere Funktionen. Diese Tests belegen Eingabelogik, getrennte Spieler, mehrere Zeiger, gemischte Tastatur-/Zeigerquellen, Abbruch/Fokusverlust, sichtbare Zahlenwerte, Matchende und Neustart. Sie belegen **kein** echtes Layout, keine Pixel, keine Browser-Zeigererfassung, kein echtes Multitouch-Gerät, keine CSP-/HTTP-Header und keine tatsächliche iframe-Navigation. Die Zurück-Handler werden als Originaltext gegen Eltern-/History-Fixtures geprüft.

Ein gesonderter Kompatibilitätstest injiziert genau das bisherige lesende Auto-QA-Handle. Nur dieser Test verändert die Scriptantwort. Die `GameLogic`-IIFEs enden deshalb mit `}());`, damit der bestehende Hook-Ausdruck aus `spiele-dev/parallel-audit/minispiele-qa.cjs` weiterhin die Controller-IIFE trifft.

**Browserstatus:** Nach ausdrücklicher GPU-Freigabe des Parents mit nativem Playwright-Chrome geprüft. Gleichzeitige Touch-Holds, Tastatur, iframe und beide Bildschirmformate sind Teil des unten dokumentierten Laufs. Es wurden keine CSP-Header gelockert.

Die vorgeschriebene `bash automation/ci_simulation.sh` wurde versucht und endet bereits bei `mktemp /home/agent/ci_plan…`: Home ist schreibgeschützt. Diese Simulation prüft außerdem nur eingechecktes HEAD, nicht die hier bewusst uncommitteten HTML-/Teständerungen. Keine Aussage über einen grünen Gesamtlauf; Integration und Release liegen beim Parent.

## Bestehende Regression anpassen

Alle bisherigen HTML-IDs bleiben erhalten. Start/Neustart bleiben normale `click`-Handler: Tipp-Duell `startBtn`/`againBtn`, Auto-Rennen erneut `startBtn`, Tauziehen `startBtn`/`againBtn`. `mini-back` an `parent.postMessage` und `history.back()` außerhalb eines iframe bleiben erhalten. Der Auto-Hook kann weiter `{running,winner,cars}` lesen; `cars.red.p`/`cars.blue.p` bleiben Fortschritt von null bis eins. Neu sind Drehzahl, Gang, Gas und Feedback. `winner` kann bei gleichzeitigem Zieleinlauf auch `'tie'` sein.

Die alte Regression enthält drei absichtlich überholte Spielannahmen:

- **Tipp-Duell, „Touch → Maus zählt beides“:** Zwei unmittelbare Tipps ergeben keine zwei Punkte mehr. Nach Start die Spieluhr um 1000 ms weiterstellen, eine Hälfte antippen → 100 Punkte. Ein zweiter Tipp im selben Schlag → 75. Nach weiteren 750 ms ein neuer präziser Tipp → 175. Alternativ getrennt Touch auf dem ersten und Maus auf dem zweiten Schlag prüfen → 200. Nach insgesamt etwas mehr als 10 s erscheint `endOverlay`; Neustart setzt Punkte auf null.
- **Auto-Rennen, 57 synthetische `mousedown`-Events:** Diese bewegen kein Auto. Nach Start und Countdown (etwa 2200 ms) `keyboard.down('a')`, dann etwa 42000 ms Spielzeit ohne Schalten simulieren; Rot gewinnt. Für den zentralen Schaltpfad den lesenden Hook verwenden und bei `cars.red.rpm >= 0.8`, `gear < 5`, `cooldown === 0` einmal S drücken; Gas bleibt dabei gedrückt. Die Modelltests decken den Strategievergleich bereits direkt ab. Neustart muss Fortschritt/Gänge/Gas zurücksetzen.
- **Tauziehen, zweimal 18 synthetische `mousedown`-Events:** Stattdessen je Runde nach Countdown (etwa 2500 ms) A für 2800 ms halten, 2200 ms loslassen, dann 1300 ms halten und loslassen. Gegen untätiges Blau ergibt das einen Rundensieg. Vor der nächsten Runde 1500 ms Rundenpause und erneut etwa 2500 ms Countdown simulieren. Nach dem zweiten Rundensieg erscheint `endO`; Neustart setzt `s1`/`s2`, Position und Ausdauer zurück.

Diese Abläufe sind in den Controller-Fixtures geprüft; die Browserregression muss sie mit ihrer echten Uhr und Ereigniszustellung übernehmen. Für echte Touch-Holds Zeiger-ID pro Finger verwenden, `pointerup`/`pointercancel` zustellen und Gas beim Schalten nicht lösen. Die Steuerungen verwenden ausschließlich Pointer Events, damit synthetische Mausereignisse nach Touch nicht doppelt wirken. Tastaturwiederholungen schalten nicht mehrfach. Abbruch, verlorene Zeigererfassung, Fenster-Fokusverlust und verstecktes Dokument lösen die Holds; ein Neustart übernimmt keine gehaltene Eingabe.

## Browserprüfung

`browser-qa.cjs` ist per `node --check` geprüft. Ein Aufruf ohne `--run` startet ausdrücklich keinen Browser. Aufruf nach GPU-Freigabe des Parents:

```sh
PW_MODULE=/tmp/aban-games-audit/node_modules/playwright \
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers \
PW_CHROME=/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome \
MINI_ID_BASE=http://127.0.0.1:8182 \
node spiele-dev/minispiele-identitaet/browser-qa.cjs --run
```

`PW_MODULE` hat Vorrang vor dem ebenfalls unterstützten `PLAYWRIGHT_MODULE`. Optional: `PW_CHROME`, `MINI_ID_OUT` (Vorgabe `/tmp/minispiele-identitaet-browser`). Der Header-Server wird weiterverwendet, nicht ersetzt. Kein `bypassCSP`, kein Umschreiben von Spielantworten, keine Spielzustandssetter und kein Abschalten des Zeichnens.

**SETZUNG des Browserplans:** Je Spiel und je Format 390×844 / 640×360 ein vollständiger Ablauf mit Touch sowie einer mit Tastatur; dazu je Spiel/Format ein iframe-Test, insgesamt 18 Fälle. Playwright pausiert die Uhr und führt mit `clock.runFor` sämtliche normalen Frames aus. Die Strategieentscheidungen stammen ausschließlich aus sichtbarem DOM: Punktestand, Gang, Drehzahlmarkierung und Ausdauer. Das Spielmodell läuft original. Die Regelwerte sind SETZUNG; tatsächliche Browser-Messergebnisse stehen im Ergebnisabschnitt.

Der Lauf prüft:

- Start und Neustart sowohl per echtem Touch als auch per fokussiertem Knopf + Enter. Spielaktionen laufen über vertrauenswürdige Browser-Tastaturereignisse oder Chromium-CDP-Touches; mehrere Finger bleiben beim Schalten gleichzeitig aktiv. `event.isTrusted` und `pointerType` werden lesend geprüft.
- Tipp-Duell: zwölf präzise Schläge ergeben genau 1200 Punkte; wiederholte zu frühe und zusätzliche Versuche des Gegners bleiben bei null. Ein doppelter Tipp kostet nachweislich genau 25 Punkte. Vollständiges Ergebnis, Rücksetzung und neue Schläge nach echtem Fenster-Fokusverlust.
- Auto-Rennen: Schaltversuche allein bewirken weder Strecke noch höheren Gang. Gleichzeitiges Gas für beide Fahrer; Rot schaltet viermal bei sichtbaren 80% Drehzahl, Blau versucht wiederholt zu schalten. Rot muss in weniger als zwölf Sekunden mit höchstem Gang das Ziel erreichen, während Blau unter 50% Strecke bleibt. Ergebnis, Neustart ohne geerbtes Gas, echter Fokusverlust beider Gasfelder und Ausrollen bis null Drehzahl.
- Tauziehen: Ein Tipp-Burst ohne verstrichenen Frame bewegt nichts. Gleichzeitiges Halten erschöpft beide gleich stark; dauerhaftes Weiterhalten regeneriert nicht. Nur Loslassen regeneriert. Erholtes Rot gewinnt gegen erschöpftes Blau, erreicht anschließend den zweiten Rundensieg, zeigt den Endstand und startet mit voller Ausdauer neu. Echter Fokusverlust löst beide Griffe und regeneriert die Ausdauer.
- Layout bei Start, Spiel und Ergebnis: alle maßgeblichen Touchziele mindestens 44 px, vollständig im Bildschirm und in der Mitte tatsächlich treffbar; Zahlen, Anzeigen und Hinweise dürfen auch nicht innerhalb von Pads abgeschnitten sein. Kein horizontaler oder vertikaler Dokumentüberlauf. Screenshots für alle Phasen; gesonderte Fehlerbilder.
- iframe: echte Spiel-URL unter den realen CSP-/SAMEORIGIN-Headern. Nur der Eltern-DOM einer realen eigenen Tipp-Duell-Antwort wird zur Host-Fixture; die Spiel-URLs im iframe bleiben unverändert. Echter Touch auf Zurück muss genau eine `mini-back`-Nachricht vom richtigen Frame mit richtigem Origin liefern. Ein echter Empfänger des Elternprodukts wird damit nicht nachgebildet.
- HTTP-Status, CSP, `nosniff`, Frame-Schutz, Konsolen-/Netzwerk-/JavaScriptfehler und `securitypolicyviolation`. Fehler bleiben harte Assertions und erzeugen Exit 1; weitere unabhängige Fälle werden trotzdem gemessen. `report.json` enthält keine übersprungenen Assertions als Erfolge.

Die alten Spam-Siegesfälle bleiben ausdrücklich überholte Regeln. Der Parent passt ausschließlich seinen bisherigen Harness an. Bestätigter Ersatzpfad aus dem Modell/Controller: A im Auto mit `clock.runFor(45000)` halten; im Tauziehen nach Countdown zweimal A für je `clock.runFor(26000)` halten, dazwischen `keyboard.up('a')` und rund 4000 ms Rundenwechsel. Der Tau-Sieg fällt bei diesem Ersatzpfad über das Positionslimit nach 25 s, nicht durch endlose Zugkraft. Ein einzelnes `clock.fastForward(...)` wäre hierfür ungeeignet: Die Bewegung begrenzt den Zeitschritt pro Frame auf 50 ms. Die dedizierte Browserprüfung oben verlangt zusätzlich die eigentlichen Strategieunterschiede und schwächt diese nicht auf bloßes Spielende ab.

Browserwahl: Der QA-Lauf verwendet standardmäßig das native `/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome`. Ein gesetztes `PW_CHROME` muss auf dieselbe echte Datei zeigen; System-Wrapper werden vor dem Start abgewiesen. Lokale Startargumente sind ausschließlich `--no-sandbox --enable-unsafe-swiftshader`. Keine TLS-/Sicherheitsausnahmen und keine Änderungen an gemeinsamem Multiplayer-Code. Browserläufe erfolgen nur nach GPU-Freigabe.

## Beim Browserlauf behobene Befunde

Die erste echte Prüfung reproduzierte abgeschnittene Inhalte bei 640×360: Im Tipp-Duell stand die kompakte Media-Regel vor späteren Basisregeln und wurde überschrieben; beim Tauziehen überschritt das untere Pad den Bildschirm. Die kompakte Tipp-Regel steht jetzt zuletzt; Tauziehen hat eine schrumpfbare Arena und bei geringer Höhe kompakte Pads und Karten. Beide Änderungen bleiben ausschließlich in den zugeteilten HTML-Dateien.

Ein fehlendes explizites Favicon führte im ersten Browserkontext zu einer 404-Konsolenmeldung. Alle drei eigenen Seiten verlinken jetzt das vorhandene `/favicon.svg` (HTTP 200 geprüft). Keine Fehlermeldung wird unterdrückt. Die erste Berichtfassung mit dieser Meldung bleibt unter `/tmp/minispiele-identitaet-browser/zweiter-lauf.json` erhalten. Ein weiterer Bericht mit 366/367 Prüfungen betrifft den damaligen Index-Host der iframe-Fixture und liegt unter `/tmp/minispiele-identitaet-host-index.json`. Der Parent besitzt den Index; die eigene iframe-Fixture verwendet deshalb jetzt eine echte eigene Tipp-Duell-Antwort als Elternseite. Das iframe selbst erhält weiter das Originalspiel und alle echten Header.

Der erste Mehrfinger-Treiber benannte bei `touchEnd` fälschlich die verbleibenden statt der endenden Finger; Chromium löste dadurch die Gas-/Seil-Holds. Der Treiber sendet jetzt ausschließlich den tatsächlich endenden Finger. Spielhandler wurden dafür nicht verändert. Playwright emuliert in Headless-Kontexten standardmäßig Fokus für mehrere Seiten zugleich. Für den Fokusverlusttest wird nur am getesteten Target die Fokus-Emulation kurz deaktiviert und danach wiederhergestellt; geprüft wird ein natives, vertrauenswürdiges `blur`, kein per JavaScript erzeugtes Ereignis.

Ein Schaltversuch alle 200 ms traf im Fahrmodell zufällig fast alle guten Fenster und war kein belastbarer Spam-Gegner (GEMESSEN im Modell: etwa 93% Strecke bei rotem Zieleinlauf). Der Browserplan verwendet deshalb schnelle Versuche alle 50 ms; die harte Anforderung „Blau unter 50% bei rotem Zieleinlauf“ bleibt unverändert. Das eigentliche Fahrmodell wurde nicht nachträglich verändert.

## Endgültige Messung und GPU-Freigabe

**GEMESSEN, 16.11.2026, Server 8182, natives Playwright-Chrome:**

| Prüfung | Ergebnis | Artefakt |
| --- | --- | --- |
| Eigene Mechanik-/Controller-Quelltests | 21 bestanden | `node --test spiele-dev/minispiele-identitaet/mechanik.test.cjs` |
| Eigene Browserprüfung | 368/368 Assertions, alle 18 Fälle bestanden, keine JS-/HTTP-/Konsolen-/CSP-Fehler | `/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-identitaet/report.json`; Screenshots im selben Ordner |
| Bestehende Regression der zwanzig Minispiele, unverändert ausgeführt | 59 bestanden, ein bewusst unverändert gebliebener Altregel-Fehler; Exit 1 | `/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-regression.json` |
| Bestehende Wortspielregression, unverändert ausgeführt | PASS, 642 Prüfungen; keine Laufzeitfehler; Exit 0 | `/workspace/aban-spiele-analyse/arcade-einzigartig/wortspiele/results.json` |
| HTML, Testsyntax und Diff | fehlerfrei | `html-validate`, `node --check`, `git diff --check` |

Der einzige Altregel-Fehler heißt exakt `Tipp Duell: Touch → Maus zählt beides, Ende und Neustart`: erwartet `'2'`, tatsächlich `'0'` nach zwei sofortigen Tipps vor dem ersten Schlag. Diese Assertion wurde auf Auftrag des Parents nicht verändert oder übersprungen. Die eigene Browserprüfung belegt stattdessen 1200 Punkte für zwölf präzise Schläge, null für frühes Spammen sowie exakt 25 Punkte Abzug für einen doppelten Tipp. Start, Rundenende und Neustart werden ebenfalls vollständig geprüft.

Die vom Parent angepasste kombinierte Auto-/Tau-Prüfung besteht mit gehaltenen Eingaben. `Stapel Turm: Hybrid-Maus, sechs Züge, genau ein RAF nach Revanchen` besteht unverändert. Keine Änderung an den beiden gemeinsamen Regressionstools, Tower oder Katalog durch diese Arbeit. Die Wortspielprüfung meldet ausschließlich ihre bereits ausdrücklich erfassten Favicon-Abbrüche bei schnellen Navigationen als Beobachtungen, nicht als Laufzeitfehler; ihre Fehlerassertions blieben unangetastet.

Browser liefen ausschließlich nacheinander und schlossen jeweils in `finally`; nach dem Wortspiellauf wurde der GPU-Slot ausdrücklich freigegeben. Keine weiteren Browserstarts vorgesehen. Logs: `/tmp/minispiele-identitaet-final.log`, `/tmp/minispiele-regression.log`, `/tmp/wortspiele-regression.log`. Keine Commits oder Veröffentlichung.

## Abschließende Hashes und Berichtsabgrenzung

**GEMESSEN:** Node v24.19.0. Browser bereits geschlossen, GPU ausdrücklich an den Parent freigegeben; danach ausschließlich Node-/Dateiprüfungen. Die drei Rohberichte der gescheiterten Frühstände wurden bytegetreu nach `/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-identitaet/fixture-history/` kopiert. `index.json` hält Gründe, Prüfzähler und SHA-256 fest. Sie enthalten sowohl frühere echte Layoutfehler als auch Fehler der Eingabe-/Host-Fixtures und sind keine positiven Endnachweise. Der separate, positive Endnachweis bleibt `../report.json` mit 368/368 Assertions in 18 Fällen.

SHA-256 der ausgelieferten Spielseiten:

| Datei | SHA-256 |
| --- | --- |
| `minispiele/tap-duell.html` | `6b6eafa8dc3fb509845847c5acf89800c0fe4ba0c705965949aee3c66c36386a` |
| `minispiele/auto-rennen.html` | `43715303e76603069d3fca0a2f967b1dec2e70ef8afcf9ae518696b2e0356aa3` |
| `minispiele/tauziehen.html` | `771c25d8a2684d57b0db4444f8e7bcc321405a48d0df478fab13b122eb0ad80a` |

Der maschinenlesbare vollständige Hashstand einschließlich Node, eigener Tests, README, positivem Browserbericht und beider unveränderter Regressionsergebnisse steht in `/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-identitaet/source-sha256.json`. Keine nachträgliche Umwertung des alten Tap-Duell-Fehlers: Der gemeinsame Harness bleibt mit 59 bestandenen Fällen und genau diesem einen Fehler rot.

## Handoff, 16.11.2026, 15:10 UTC

Der Parent hat den GPU-Slot ausdrücklich übernommen und führt den nachträglich korrigierten einzelnen Tipp-Duell-Hybridfall selbst aus. Von dieser Arbeit wurde kein gezielter Browser-Nachlauf gestartet; eine Datei `minispiele-takt-nachlauf.json` wurde hier nicht erzeugt. Die ursprünglichen 59 bestandenen Fälle und der damalige Altregel-Fehler bleiben unverändert als historischer Gesamtlauf erhalten. Ein späterer positiver Einzelfall ist separat auszuweisen, nicht als rückwirkend grüner Gesamtlauf. Eigene positive Nachweise bleiben 368/368 UI-Assertions, 642 Wortspielprüfungen und 21 Node-Tests. Quellen abgeschlossen, keine weiteren Browserstarts, Commits oder Veröffentlichungen.

## Letzte Sichtprüfung ohne Browser

Alle 42 positiven Endbilder wurden per Hash auf 27 unterschiedliche Bildinhalte reduziert und diese vollständig gelesen: Start, Spielfeld, Ergebnis und iframe in beiden Formaten. Das separat verbliebene `*-FEHLER.png` ist ein altes Fehlerbild und kein positiver Endnachweis. Keine Datei wurde für die Sichtprüfung verändert und kein Browser gestartet.

Die Bilder zeigen zwei tatsächliche Restüberlappungen, die die bisherigen Trefferprüfungen in der Knopfmitte nicht erkennen: Der feste Rechtslink-Streifen liegt teilweise über dem unteren Rand des roten Gas-Knopfs; bei 640×360 berührt der Timer die Spielernamen des Tipp-Duells. Ausschließlich dafür erfolgten zwei lokale CSS-Korrekturen: 22 px unter den Fahrknöpfen freihalten; bei höchstens 450 px Höhe die Tipp-Duell-Inhalte jeweils 12 px von der Mitte abrücken. Tauziehen und sämtliche Spiellogik blieben unverändert.

Nach diesen Korrekturen erneut GEMESSEN: 21/21 Node-Logik-/Controllertests bestanden, alle sechs Original-Inline-Skripte syntaktisch gültig, HTML-Validierung und Diff-Prüfung sauber. Die eigenen Quellenhashes wurden aktualisiert. **Prüfgrenze:** Die zwei letzten CSS-Korrekturen wurden auf ausdrücklichen Auftrag ohne neuen Browserlauf vorgenommen; die gespeicherten 368/368 UI-Assertions und Screenshots gehören zum vorherigen CSS-Stand. Dessen drei Produkt-Hashes bleiben im Manifest als `browserReportProductHashes` erhalten. Der positive Bericht wird nicht nachträglich als Browsernachweis für diese beiden CSS-Korrekturen ausgegeben.

Der Parent meldet den separat korrigierten Tap-Hybrid-Nachlauf mit 1/1 positiv; die historische 59+1-Aufteilung bleibt unverändert und ist kein erneut grün gemessener Komplettlauf. Kein weiterer bestätigter Logikfehler gefunden. GPU bleibt freigegeben, keine Browserstarts.

## Gezielter Layout-Nachlauf für den Parent vorbereitet

**Produkt eingefroren:** Keine weitere Produktänderung. `final-layout.cjs` ist ausschließlich ein neues QA-Werkzeug und wurde hier nur syntaktisch sowie mit seinem sicheren Standardaufruf geprüft. Ohne `--run` importiert es kein Playwright und startet keinen Browser. Der GPU-Slot liegt beim Parent/Arena; dieser Nachlauf wurde nicht ausgeführt und es gibt noch keinen positiven Layout-Nachweis für die letzten beiden CSS-Korrekturen.

Genauer Aufruf durch den Parent **erst im eigenen GPU-Slot**:

```sh
PLAYWRIGHT_MODULE=/tmp/aban-games-audit/node_modules/playwright \
PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers \
PW_CHROME=/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome \
MINI_LAYOUT_BASE=http://127.0.0.1:8182 \
MINI_LAYOUT_OUT=/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-final-layout \
node spiele-dev/minispiele-identitaet/final-layout.cjs --run
```

**SETZUNG des begrenzten Nachlaufs:** Sechs Fälle, drei originale Seiten jeweils bei 390×844 und 640×360, je ein UI-Start per echtem Touch. Keine Antwortumschreibung, keine Zustandssetter, keine CSS-Injektion und keine Änderung an Headern. Die bekannten eingefrorenen Produkt-SHA-256 werden vor dem Browserstart überprüft; die tatsächlich empfangene HTML-Antwort muss außerdem bytegleich der lokalen Datei sein. Der Bericht enthält Quell-/Testhashes, reale Header und gemessene Rechtecke/Abstände.

Geprüft werden Start-/Spielinhalte im Bildschirm, nicht abgeschnittene Labels/Balken, mindestens 44 px große Eingabefelder, tatsächliche Treffer in der Mitte und bei Knöpfen zusätzlich innenliegende Ecken. Alle sichtbaren Rechtslinks und der komplette feste Rechtslink-Behälter müssen von den Steuerungen getrennt bleiben. Beide Tipp-Duell-Spielernamen dürfen das Timer-Rechteck nicht schneiden, auch während echter Touch-Holds. Diese Assertions prüfen ausdrücklich die zuletzt in den Screenshots gefundenen Überschneidungen; sie werden nicht auf bloßes „Knopfmitte funktioniert“ reduziert.

Die kurze Eingabeprobe verlangt echte Touch- und Tastaturereignisse: Tipp-Duell trifft zwei Schläge und bestätigt, dass Halten keine weiteren Punkte erzeugt; Gas für beide Autos bleibt beim Touch-Hochschalten gehalten und lässt sich unabhängig lösen; beide Tau-Griffe verbrauchen Ausdauer, nur Loslassen erholt. Eine kurze getrennte Tastaturprobe folgt je Spiel. Start, Spielfeld, gehaltene Eingaben und Zustand nach Eingaben erhalten Screenshots, bei Fehlern zusätzlich Fehlerbilder.

Das Werkzeug schließt jeden Kontext und abschließend den Browser in `finally`. Fehler bleiben harte Assertions; weitere unabhängige Fälle laufen weiter, der Gesamtlauf endet bei jedem Fehler mit Exit 1. Sein Ergebnis wird ausschließlich nach `MINI_LAYOUT_OUT/report.json` geschrieben. Weder der alte positive 368-Bericht noch Frühberichte oder Regressionsergebnisse werden überschrieben. Der Layout-Nachlauf ist **keine neue vollständige Strategie-/Ergebnis-/Restart-/Fokus-/iframe-Prüfung** und ersetzt diese früheren Nachweise nicht. Diese Grenzen stehen ebenfalls im JSON-Bericht.

## Abschließender Parent-Nachlauf

GEMESSEN nach den CSS-Korrekturen: **92/92 Bedingungen**, sechs Originalseiten-
Fälle in390×844 und640×360, keine JS-/HTTP-/Konsolen-/CSP-Fehler und Browser
geschlossen. Echte Touch-Holds, getrennte Tastatureingaben, Trefferpunkte sowie
Timer-/Namens- und Rechtslink-/Knopf-Abstände sind geprüft. Drei abschließende
Querformat-Spielbilder geöffnet und geprüft; Originalbericht unter
`/workspace/aban-spiele-analyse/arcade-einzigartig/minispiele-final-layout-03/`.

Die beiden vorherigen gezielten Layoutberichte mit jeweils83/84 bleiben erhalten:
zuerst2,5px Timer-/Namensüberdeckung, danach abgeschnittener oberer Feedbacktext
bei asymmetrischer Höhenverteilung. Jetzt erhalten beide Felder dieselbe Höhe;
der Inhalt rückt symmetrisch von der Mitte ab. Keine Spiellogik geändert.
Das ist der Abschluss der oben dokumentierten CSS-Prüflücke, kein neuer368er-
Gesamtlauf. Die kanonischen finalen Hashes und getrennten Berichte stehen in
`spiele-dev/arcade-einzigartig/belege/`.
