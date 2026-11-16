# Neon-Park: Lichterpremiere

## Befund und Umsetzung

Vorher: Pultpaare gleichzeitig besetzen; solo vier Sekunden warten. Zehn optionale
Tickets sammeln. Vier laufende Attraktionen lösten das Ende aus. Die Aktionstaste
hatte keine Funktion. Das wiederholte die Druckplatten-Idee anderer Spiele.

Jetzt: eine Park-Regie mit vier unterschiedlichen Probefahrten. An einem beliebigen
Pult der Attraktion startet E / Start die Fahrt. Einzelne Q/R-Impulse oder die beiden
Regie-Tasten beeinflussen die physikalische Simulation:

- Kettenflieger: trägen Motor bei wechselndem Wind regeln.
- Teetassen: Drehimpulse geben, Nachlauf beachten und gegenlenken.
- Piratenschiff: im Tal anschieben, Schwung jederzeit bremsen.
- Achterbahn: beschleunigen, Kurve dosieren und im Bahnhof abbremsen.

Jede Fahrt hat drei aufeinanderfolgende Vorgaben. Die weiße Nadel soll jeweils
2,2 Sekunden im grünen Bereich bleiben; außerhalb sinkt dieser Teilfortschritt
langsam. Bestandene Vorgaben bleiben erhalten. Kein Zeitlimit, keine verlorenen
Leben. Komfortsterne ergeben sich aus dem gemessenen Anteil guter Fahrtzeit.
Wegweiser, Fahrtplan, Zielband und Teilfortschritt zeigen das nächste Ziel.

Die Modell-Knoten Drehkranz, Drehteller/Unterteller und Pendel reagieren auf die
Regie. Die Achterbahn kann nach bestandener Probefahrt weiter mitgefahren werden.
Nach allen vier Fahrten öffnet E / Start am Stern (x=0, z=6) die zehn Sekunden lange
Lichterpremiere: Abendhimmel, vier Lichtsäulen, Funken, Ergebnis und Neustart bzw.
Stationsrückkehr. Es gibt keine Sammelobjekte mehr.

## Koop

Schnellsuche, Raumcode, Einladungslink, Partnerfigur und Ping bleiben vorhanden.
Die neue Protokollfamilie verwendet einheitlich **`park-premiere1`** für
`MP.quick`, `MP.host` und `MP.join`. Auch der lokale QA-Monitor hört auf
`aban-mp-park-premiere1-<Code>`. Bereits geöffnete ältere Park-Seiten verwenden
`park` und können deshalb nicht irrtümlich mit neuen Clients verbunden werden.
Für gemeinsame neue Räume müssen beide Seiten die neue Spielversion laden.
Die Snapshot-Versionsprüfung allein wäre dafür zu spät gewesen; die Trennung
findet bereits bei Schnellsuche/Signalisierung statt. `js/mp.js` blieb unverändert.
Ein Pult genügt für Solo und Koop. Beide können an derselben Attraktion helfen oder
verschiedene Fahrten übernehmen. Nur der Host simuliert den gemeinsamen Stand;
Gäste senden zuverlässige, nummerierte Regie-Eingaben. Der Host prüft Nähe,
Eingabeart, Duplikate und einen kurzen Eingabeabstand. Vollständige Zustände werden
regelmäßig und beim Abschluss sofort zuverlässig übertragen.

Solo-Pause hält die Simulation an. Online-Pause pausiert die eigene Steuerung.
Bei Verbindungsverlust wartet der Gast auf den Host; nach endgültiger Trennung
läuft der letzte bestätigte Stand solo weiter. Alte ride/tick/win-Nachrichten
können keinen Fortschritt oder Sieg auslösen.

## Prüfung

`node spiele-dev/neon-park/premiere.test.cjs`

GEMESSEN: **11 ok, 0 Fehler**, Node/VM ohne Browser/WebGL. Geprüft werden Warten
ohne Sieg, vier lösbare Fahrten mit normalen Einzelimpulsen, Schubfenster/Bremse,
ungültige Eingaben und Snapshots, echte Seiteneingaben, Nähe, Solo-/Online-Pause,
Modell-Knoten mit echtem Three-AnimationMixer, zwei gekoppelte Seiten, aufgeteilte
Regie, Nachrichtenduplikate, Trennung und vollständige Solo-/Koop-Abschlüsse.
Ein eigener Vertragstest prüft die tatsächlich an MP übergebenen Argumente für
Schnellsuche, Host und Join sowie den QA-Monitorkanal. Jede Stationsseite meldet
ihren Abschluss genau einmal. Die Endzustände beider
Koop-Seiten stimmen überein.

GEMESSEN im deterministischen Simulationshelfer, ohne Laufwege und mit 240 ms
Mindestabstand zwischen Impulsen: Kettenflieger 9,3 s / 17 Impulse; Teetassen
9,8 s / 12; Schiff 8,8 s / 7; Achterbahn 8,2 s / 14. Das belegt Lösbarkeit,
keine menschliche Bestzeit oder Schwierigkeitseinschätzung.

`git diff --check -- neon-park.html css/neon-park.css js/neon-park spiele-dev/neon-park`
war ebenfalls ohne Befund.

## Browser-Abnahme nach GPU-Übergabe

Echter Chromium gegen den Parent-Server 8182 mit den unveränderten CSP-/Sicherheits-
Headern. Der erste Lauf belegt den unveränderten WebGL-Render mit 78 geladenen
Besuchern, Bewegung und Pause. Die Software-GPU ließ dabei nur 5,3 Sekunden
Fahrtsimulation in 100 Sekunden Wandzeit zu. Deshalb verwendet die weitere
Browser-Fixture ausschließlich eine Render-Drossel: nach einer Zeichnung zwei
Sekunden Pause vor der nächsten Zeichnung, für Screenshots erzwungene echte
Zeichnungen. Die Spieluhr und requestAnimationFrame bleiben echt; Zielzustände,
Fortschritt und Siege werden nicht gesetzt. Debug-Teleport verkürzt nur Laufwege.

GEMESSEN: alle vier Solo-Probefahrten über E/Q/R bestanden, anschließend Lichtshow
und Ergebnis über die normale Aktion am Stern erreicht. Die Browser-Simulations-
zeiten waren 9,62 / 10,28 / 7,83 / 8,68 Sekunden (keine Wandzeiten). Echte Touch-
Taps starten und regeln eine Fahrt; native CDP-Touch-Ereignisse bewegen die Figur.
390×844 und 844×390 wurden gerendert. Ein überlappender Uhr-Chip im Hochformat
und die Fußzeile am Regiehinweis im Querformat wurden in der eigenen CSS-Datei
korrigiert und erneut geprüft: alle Aktionstasten mindestens 44 px, erreichbar,
im Viewport; Überschriften und Fußzeile frei.

Der erste generische 404 trat vor der Favicon-Verknüpfung auf. Konkret ist
`http://127.0.0.1:8182/favicon.ico` mit HTTP 404 nachweisbar; die vorhandene
`/favicon.svg` liefert HTTP 200 und ist jetzt ausdrücklich verknüpft. Die erneuten
Browser-Läufe protokollierten keine HTTP-/Konsolenfehler. Keine globale
Fehlerunterdrückung; der ursprüngliche Fehler bleibt im Rohbericht erhalten.

Native lokale WebRTC-Kanäle wurden mit dem vom Parent genannten
`/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome` und ausschließlich
`--no-sandbox --enable-unsafe-swiftshader` geöffnet. Die zwei Seiten verwenden
denselben Browser-Kontext, `?mp=local`, echtes BroadcastChannel-Signaling und den
unveränderten lokalen Transport aus `js/mp.js`. Native `getStats()` und `_diag()`
bestätigen offene main-/fast-Kanäle. Nur der Host ruft die Fahrtsimulation auf;
über den echten Kanal eingespeiste falsche Gast-Snapshots und alte win-/ride-
Nachrichten können keinen Sieg setzen. GEMESSEN: Host 23 Simulationsaufrufe,
Gast 0 bei dieser Autoritätsprobe. Alle vier Fahrten wurden anschließend über
Host-/Gast-Tastatureingaben bestanden (9,43 / 10,90 / 7,78 / 8,83 simulierte
Sekunden). Damit sind sieben native Teilprüfungen einschließlich CSP grün.
Das System-Chromium unter `/usr/bin`
hatte zuvor trotz Offer/Answer keine ICE-Kandidaten erzeugt; diese erfolglosen
Versuche sind separat erhalten und belegen keinen Koop-Erfolg.

**Frühere Wartegrenze, später gezielt nachgeprüft:** Der erste native Lauf hatte im
Finale noch eine alte Grenze von 25 Wandsekunden. Beim Ablauf waren beide
Peers weiterhin verbunden, alle vier Fahrten bestanden und beide im Zustand
`show`: Host 3,4498 / Gast 3,3665 von erforderlichen 10 Simulationssekunden.
Kein Seiten-, Konsolen- oder HTTP-Fehler. Der Finalstart war damit gültig;
der Test wartete zu kurz. Der Browser wurde danach im finally geschlossen,
die GPU freigegeben. Keine Produktuhr oder Spielmechanik dafür geändert.

Das Testskript `browser-qa.cjs` erfordert `PARK_GPU_GRANTED=1`. Mit
`PARK_QA_PHASE=coop` werden die teuren unveränderten Solo-/Touch-Prüfungen
übersprungen. Für den bekannten Browser zusätzlich `PARK_QA_NATIVE_BASELINE=1`
und den obigen Pfad in `PW_CHROME` setzen. Der Solver begrenzt gemessene
Simulationszeit, taktet Eingaben nach dieser Uhr und besitzt nur als Notbremse
eine großzügige Wandzeitgrenze. Für zukünftige Netzläufe ist Zeichnen inzwischen
bis auf explizite Screenshots ausgesetzt (`gap=Infinity`). Der bereits gelaufene
native Vier-Fahrten-Lauf verwendete noch die 2-Sekunden-Drossel.

Der **reine Finale-Test** wurde nach erneuter exklusiver GPU-Freigabe ausgeführt:
`PARK_QA_PHASE=finale` statt `coop` verwenden, alle übrigen obigen Variablen
beibehalten. `fixtures/finale-ready.json` enthält den gültigen Stand der vier
tatsächlich nativ bestandenen Fahrten; nur die vorherige Schlussphase wird
explizit auf `ready` zurückgesetzt. Die Fixture setzt weder `gewonnen` noch
Ergebnis-/Siegfunktionen. Die normale E-Aktion am Stern startet die Show;
Original-Updates erreichen danach selbst `done` und den Ergebnisdialog.
Die zuverlässige Endzustandsübertragung und der native Kanalabschluss wurden
anschließend bestätigt. Der Ergebnisbericht heißt `result-finale.json` und
überschreibt die sieben erfolgreichen nativen Prüfungen nicht.
Beide Seiten teilen sich eine maximale Schlusswartezeit von **120000 ms**;
die zweite Seite erhält nur die verbleibende Zeit. Kein 600000-ms-Finalewarten.

**GEMESSEN: sieben fokussierte Prüfungen grün**, keine Seiten-, Konsolen- oder
HTTP-Fehler, Browser im finally geschlossen. Namespace `park-premiere1` und
offene native main-/fast-Kanäle bestätigt; normales E am Stern startet `show`;
beide Endstände sind identisch `done`; der Gast hat null Simulationsaufrufe.
Der native Kanalabschluss wird auf der Gegenseite erkannt. Der separate Bericht
und das Ergebnisbild liegen unter
`/workspace/aban-spiele-analyse/arcade-einzigartig/park-finale/`.
Das sind **kein erneut ausgeführter Vier-Fahrten-Gesamtlauf**, sondern eine
gezielte Schlussprüfung auf dem explizit wiederhergestellten, vorher bestätigten
Vier-Fahrten-Stand. Die zwölf früheren Solo-/UI-Prüfungen und die sieben
nativen Vier-Fahrten-/Autoritätsprüfungen bleiben als eigene Teilläufe erhalten.

Offline ist die gespeicherte Fixture validiert: nach 3,44 simulierten Sekunden
noch `show`, nach 10,02 Sekunden `done`. Die vorhandenen elf VM-Prüfungen
bleiben grün, einschließlich eines vollständigen Koop-Abschlusses. Dieser
VM-Abschluss wird ausdrücklich nicht als nativer Browser-Abschluss bezeichnet.

Cache-Verweise im HTML: CSS `60b6a961230e`, JS `a1d8fa7c6595`, jeweils erste
zwölf SHA256-Zeichen des Inhalts. Der Protokollraum wurde vor der fokussierten
Nachprüfung auf Parent-Review von `park` auf `park-premiere1` geändert.
Der erfolgreiche fokussierte Finale-Lauf verwendete den neuen Raum und die
Hash-Verweise. Seit diesem Lauf: keine Runtime-Änderungen, nur Berichtsabschluss.
Der Browser-Testmarker
akzeptiert sowohl den einfachen Script-Verweis als auch den optionalen Hash.
Node-/Syntax- und Hashprüfung waren grün; kein weiterer Browserstart.

## Grenzen und Übergabe

Browser-Fixture und VM sind unterschiedliche Prüfungen. Die Render-Drossel ist
keine Performance-Abnahme für normale Geräte; der unveränderte Render wurde
separat aufgenommen. Native lokale Kanäle belegen weder öffentlichen PeerJS-
Signaldienst noch Internet-/NAT-/TURN-Verbindungen zwischen echten Geräten.
Die Rohberichte stehen unter `/tmp/aban-neon-park-browser/`; UI-/Solo-Bericht,
Touch-Nachprüfung, frühere ICE-Fehler und nativer Netzlauf bleiben getrennt.
`browser-summary.json` ordnet ihre positiven Teilprüfungen und verbleibenden
Grenzen zu. Es behauptet keinen vollständigen neuen Gesamtlauf.

Alle 16 finalen Aufnahmen wurden visuell geprüft: Desktop-Menü, Park, vier Solo-
Fahrten, Lichtshow, Solo-Ergebnis, Touch-Menü und beide Formate, vier native
Koop-Fahrten sowie das fokussierte native Ergebnis. Regie, Fortschritt und
Ergebnis sind lesbar; die korrigierten Überschriften-/Fußzeilen-Abstände stimmen.
Besucher können die Welt im Vordergrund verdecken, die Regie bleibt darüber
bedienbar. Der kurze Starttipp kann im Querformat teilweise hinter dem Regiepanel
liegen; die dauerhafte Fahranleitung steht lesbar im Panel. Keine Runtime-Fixes
nach der abschließenden Prüfung; Produktstand ist eingefroren und GPU freigegeben.

Für die Browser-Abnahme nach ausdrücklicher GPU-Übergabe: direkt
`neon-park.html` öffnen; Solo starten; zu einem Pult laufen; E und Q/R bzw.
Touch-Tasten prüfen. Debug `__np.tp(x,z)` verkürzt Laufwege. Pulte sind u.a.
(-30,-2.4), (30,-4.6), (-9.5,-44), (-6.6,50.5). `__np.state()` zeigt den
Premierenplan, `__np.action("start"|"minus"|"plus")` verwendet die normalen
Nähe-/Pausenprüfungen. Zusätzlich zwei Seiten per Raumcode verbinden und mindestens
eine gemeinsame Fahrt sowie den Abschluss prüfen; kleine Hoch-/Querformate auf
Überdeckung prüfen.

Geändert nur: neon-park.html; neu: css/neon-park.css,
js/neon-park/premiere.js sowie dieser Bericht, premiere.test.cjs, browser-qa.cjs,
browser-summary.json und fixtures/finale-ready.json im eigenen Testordner.
Keine Fremddateien, kein Traumhaus, keine gemeinsamen Dokumente oder Kataloge,
kein Commit, keine Veröffentlichung. Integration, Gesamt-CI und Release beim Parent.
