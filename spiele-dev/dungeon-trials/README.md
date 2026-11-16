# Dungeon: drei Bossprüfungen

Eigener Umfang: `neon-dungeon.html`, `js/dungeon-trials/`, `css/dungeon-trials.css`, diese Prüfdateien. Keine Veröffentlichung und kein Commit.

- Stein: zwei zeitversetzte Ringfronten überspringen.
- Eis: angekündigte Frostströmung aus einer festen Richtung; hinter dem markierten Runenstein stehen. Richtung wechselt je Zyklus.
- Lava: markierter sicherer Sektor, der sich während des Angriffs dreht. Die Mitte bleibt gefährlich.

Alle Prüfungen behalten den Fackel-Parcours, vier Waffen und den Koloss. Nach jedem Angriff ist eine gut erreichbare Faust 5,5 Sekunden offen. Ein Treffer pro Person und Fenster; aufeinanderfolgende Koop-Treffer erhalten einen Kombobonus. Ein Fehler kostet höchstens ein Herz im aktuellen Angriff. Meister beginnt mit drei statt vier Herzen. Rekorde sind nach Ebene, Solo/Koop und Meister getrennt; alte globale Zeiten werden nicht mit den neuen Mechaniken vermischt.

## Gemeinsame Uhr

Nur der Host erhöht die Prüfungszeit und bestätigt Boss-HP, Treffer und Heilungen. Der erste Eintritt eines Spielers startet diese Uhr; die spätere Ankunft des Partners setzt sie nicht zurück. `state.js` leitet Phase, Ringradien, Frostrichtung, Sektorwinkel und offene Faust vollständig aus Ebene und Zeit ab. Kein Angriff verwendet Zufall. Grafikpartikel bleiben lokal.

Der bestehende `MP`-Transport verwendet den eigenen Namensraum `dungeon-trials1`. Alte `dungeon2`-Clients können deshalb keine inkompatible Partie bilden; beide Spieler müssen die neue Dungeon-Version laden. Ein neuer Backenddienst ist nicht nötig.

Der Host sendet etwa alle 100 ms `{t:trialState,v:1,round,master,state}`. Die erste Konfiguration (`trialConfig`, bei Bedarf über `trialHello` erneut angefordert) bestimmt auch Ebene und Meister-Modus des Gasts. Der Zustand enthält `run`, zunehmende `seq`, `time`, `active`, `hp`, `max` und die bestätigten Trefferzyklen beider Plätze. Fremde Runden, alte Sequenzen und ungültige Zustände werden verworfen. Geräteuhren müssen nicht übereinstimmen: Der Gast verankert empfangene Prüfungszeit an seiner eigenen Empfangszeit und extrapoliert höchstens 200 ms. Nach 600 ms ohne Zustand setzt seine Gefahrenerkennung aus; Zeitsprünge erhalten eine kurze Schonfrist. Das ist eine begrenzte Latenzvorhersage, keine Garantie auf framegleiche Darstellung bei beliebiger Netzverzögerung.

`trialHit` übermittelt Runde, Zyklus, Platz, Waffe und Position. Der Host prüft Fenster, Reichweite, plausible Partnerposition und bereits bestätigte Treffer; HP werden nie auf beiden Seiten unabhängig abgezogen. `trialDeath` hat eine Zählung gegen doppelte Heilung. Veraltete `bhit`/`bheal`/`bwin`-Nachrichten werden nicht mehr angewendet.

Ein Online-Rückspiel beginnt nach Zustimmung beider Spieler: Der Host erhöht die Runde und setzt beide Parcours über `trialConfig` zurück, die Verbindung bleibt erhalten. Ein endgültiger Verbindungsabbruch erlaubt Solo-Fortsetzung derselben Prüfung; der Lauf zählt weiterhin zur Koop-Rekordkategorie. Ohne laufenden Host gibt es während eines Verbindungsverlusts keine unabhängige neue Angriffssimulation des Gasts.

`stationDone` behält `{score,win:1|0}`, `stationRematch` wird vor Rückspiel/erneutem Abstieg gesendet und der Wildnis-Knopf sendet weiter `mini-back`.

## Node-Prüfung ohne GPU

```sh
node spiele-dev/dungeon-trials/state.test.cjs
node spiele-dev/dungeon-trials/integration.test.cjs
```

Der VM-Harness lädt die originalen Inline-Funktionen und echten Three.js-Geometrien. DOM, Transport und Renderer sind lokale Testdoubles; es startet kein Browser und kein Netzwerk. Geprüft werden sichere/gefährliche Aktionen, erreichbare Zeitfenster, erfolgreiche Solo-Prüfungen, Parcours-Sprünge/Pause/Sturz, Koop-Brücken, Host-Konfiguration, unterschiedliche Geräteuhren, begrenzte Vorhersage, veraltete Pakete, bestätigte Treffer, Heilung, Sieg, Rekorde, Stationsnachrichten und gemeinsames Rückspiel.

Die gemeinsame CI-Simulation wurde zusätzlich versucht. Sie endet hier vor den Jobs mit `unshare: Operation not permitted`, weil die Sandbox keinen Mount-Namensraum erlaubt. Sie prüft ohnehin nur den eingecheckten Stand, während dieser Auftrag ausdrücklich uncommittet bleibt.

Die GPU-Abnahme wurde nach ausdrücklicher Freigabe mit dem Playwright-Chromium durchgeführt. Ergebnisse und Einschränkungen stehen unten. Alle Browser sind laut ihren Abschlussberichten geschlossen; die GPU ist wieder beim Parent. Die Node-Ergebnisse allein belegen keine Bildprüfung und keine echte WebRTC-Verbindung.

## Browser-Abnahme und wiederholbare Aufrufe

`browser-qa.cjs` hat einen Startschutz vor Playwright-Import, HTTP-Zugriff und Dateierzeugung. Jeder weitere Aufruf benötigt erneut eine ausdrückliche GPU-Übergabe. Der letzte freigegebene Lauf ist abgeschlossen; keine weiteren Browseraufrufe nach der Rückgabe an den Parent.

```sh
DUNGEON_GPU_GRANTED=1 PW_CHROME=/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome node spiele-dev/dungeon-trials/browser-qa.cjs
```

Ziel ist der bereits laufende echte Headers-Server `http://127.0.0.1:8182`. Die Prüfung verlangt dessen Dungeon-CSP inklusive `frame-ancestors 'self'`. Sie startet keinen Ersatzserver und verändert `_headers` nicht. Optional: `DUNGEON_QA_BASE`, `DUNGEON_QA_OUT`, `PW_CHROME`, `PLAYWRIGHT_MODULE`.

Der Browser kommt ausschliesslich aus der Playwright-Installation: explizites `PW_CHROME`, sonst der oben genannte installierte Chromium, sonst `chromium.executablePath()`. System-Wrapper unter `/usr/bin/` werden abgewiesen. Kein erzwungenes `--use-angle`; Basisflags sind `--no-sandbox --enable-unsafe-swiftshader`, ergänzt nur um Hintergrund-Taktung für die beiden Peer-Tabs. Der tatsächlich verwendete Pfad steht im Ergebnis. Keine TLS-/Sicherheitsänderungen und keine Änderungen an `js/mp.js`.

Der erste Durchgang rendert die unveränderte Seite. Anschliessend ergänzt der Response-Hook eine lokale Sonde bei Erhalt sämtlicher Response-Header. Diese setzt Position und Prüfungszeit, um lange Laufwege/Wartephasen zu überspringen; beim Zeitwechsel wird alte lokale Unverwundbarkeit zurückgesetzt. Treffer, Herzen, Sieg, rAF-Uhr und WebRTC-Transport werden nicht ersetzt. Solo- und Mobile-Prüfungen behalten durchgehendes Originalrendering. Vollständige Siege entstehen durch UI-Waffenwahl und echte Angriffe; die Niederlage entsteht durch vier echte Gefahrenkollisionen. Das ist eine kontrollierte Mechanikprüfung, keine durchgehend ohne Teleport gespielte Parcours-Abnahme.

Nur im separaten Netzwerkfall setzt `__dungeonQA.networkDraw(false)` die laufenden `renderer.render`-Aufrufe beider Tabs aus. Originale Game-/UI-/rAF-/Zeit-/Transportlogik laufen weiter. Der Screenshot-Helfer ruft vor jedem Netzwerkbild über `drawSnapshot()` den gespeicherten Originalrenderer einmal ausdrücklich auf. `networkDraw(true)` stellt das normale Rendern wieder her. `result.json` kennzeichnet diese Einschränkung unter `networkFixture`, jedes Bild trägt seinen `renderMode`. Diese Variante belegt weder unverändertes Dual-Rendering noch dessen Leistung; die tatsächliche kontinuierliche 3D-Darstellung wird separat durch Solo-/Touch-Fälle geprüft. Der Testhook verändert keine ausgelieferte Runtime-Datei und keine Inhalts-Hashes.

Geplant sind alle drei Mechaniken per Tastatur und nativem CDP-Touch, Desktop-Rendering, 390×844 und 844×390, echte iframe-Nachrichten über `qa-host.html`, Erfolg/Niederlage/Retry, ein nativer WebRTC-Gast mit abweichender Ebenenwahl, gemeinsame Phase/Zeit, bestätigte Gasttreffer, gemeinsamer Sieg, Rückspiel und Kanalabschluss. Der Konstruktor-Proxy zeichnet native PeerConnections nur auf; `getStats()` und offene main/fast-Kanäle belegen den Transport. Lokales BroadcastChannel-Signaling ersetzt keine Prüfung der öffentlichen PeerJS-/TURN-Erreichbarkeit.

Jeder UI-/Netzschritt ist begrenzt, der gesamte Browserteil auf vier Minuten. Kontexte und Browser werden in `finally` geschlossen, auch bei Fehlern. Ergebnisse, Bilder und eine Checkliste landen standardmässig unter `/tmp/aban-dungeon-browser/`. Danach Bilder tatsächlich mit dem Bildwerkzeug öffnen, Sichtbefunde festhalten und Fehler beheben. `result.json` und `sichtpruefung.md` markieren Sichtprüfung ausdrücklich als ausstehend; ein erfolgreicher Skriptlauf allein ist keine visuelle Freigabe.

## Abnahme 16.11.2026 — abgeschlossen, GPU zurückgegeben

Artefakte: `/workspace/aban-spiele-analyse/arcade-einzigartig/dungeon/`. Die drei ursprünglichen `result.json` samt Bildern und Logs bleiben unverändert erhalten. Die nachträgliche tatsächliche Sichtung aller 33 Bilder steht getrennt in `visual-review.json` und `visual-review.md`; der konsolidierte Abschluss steht in `final-summary.json`.

- Erster Lauf: **2 positive Checks**, **2 Bilder**, danach Fixture-Fehler. Die unveränderte Seite rendert wirklich WebGL; der separat ausgelieferte QA-Host wurde durch dessen globale `frame-src` ohne `self` blockiert. Das war keine geänderte Dungeon-CSP.
- Erster Follow-up `followup-fixture`: **1 positiver Header-Check**, **1 Bild**, danach Stein-Assertion `3 != 4`. Beide Fehlberichte enthalten `browserClosed: true`.
- Abschliessender gezielter Lauf `followup-actions`: **28 erfolgreiche Checks**, **30 Bilder**, **0 Seiten-/Konsolenfehler**, **kein Fehlerabschluss**, **`browserClosed: true`**. Er lässt den bereits positiv geprüften Vanilla-Durchgang aus. Die 28 Checks plus die 2 früheren Positiven sind 30 protokollierte positive Ergebnisse mit einem doppelten Header-Check, also 29 unterschiedliche Prüfungsbezeichnungen; keine Behauptung von 30 unabhängigen Szenarien.
- 23 Node-Prüfungen: 10 Zustands- und 13 Originalfunktions-VM-Prüfungen.

Der behobene Parent-Fixture lädt jetzt `/neon-dungeon.html?qaHost=1&lvl=…`, holt die echte HTTP-Antwort und ersetzt nur deren Body durch die Testhülle. Die Host-Route kehrt vor Child-Hook-Injektion zurück; der Child lädt weiter das echte Dungeon mit `?station=1&lvl=…`. Der erfolgreiche Follow-up verwendete die ebenfalls weiterhin akzeptierte Schreibweise `qa-host=1`; `qaHost=1` ist der aktuelle Aufruf. Keine Änderungen an `_headers`, `js/mp.js`, TLS oder Browser-Sicherheitsregeln.

Die erste Stein-Fixture setzte den Spieler in eine bereits laufende Ringphase, bevor mehrere Browserprotokoll-Aufrufe später die Sprungtaste drückten. Die End-Assertion alleine erfasst nicht den Trefferframe. Die kalibrierte Fixture wartet jetzt auf einen **wirklichen UI-Sprung mit y > 0,85**, richtet erst dann die Ringkreuzung aus und prüft ein begrenztes Zeitfenster. Sie setzt weder Sprunghöhe noch Herzen direkt. Desktop- und Touch-Checks bestanden; die zugehörigen Bildzustände zeigen y=1,395 bzw. y≈1,868 und jeweils vier Herzen. Spätere Öffnungs-/Siegbilder zeigen bei Stein drei Herzen nach einer Landung in der noch laufenden Prüfung; daraus wird kein fehlgeschlagener Sprung abgeleitet. Ein zusätzlicher per-Frame-Trace-Hook wurde nach Start des erfolgreichen Prozesses vorbereitet, war in diesem Lauf noch nicht geladen und wurde nach GPU-Rückgabe **nicht** ausgeführt. Er ist keine erhobene Messung.

Bestätigte Browserfälle: alle drei sicheren Aktionen über echte Tasten sowie nativen CDP-Touch; je drei komplette kontrollierte Solo-Siege auf Desktop und Touch; Layoutmessung im Hoch-/Querformat; echte iframe-Nachrichten `stationDone` mit `win:0`, Retry `stationRematch`, `mini-back`; beim nativen Koop `win:1` auf beiden Peers, Gasttreffer, gemeinsam bestätigter Sieg, Rückspiel nach beiden Zustimmungen und echter Kanalabschluss. Die lokale native Verbindung hatte ICE `connected`, main/fast `open`, einen tatsächlich nativen PeerConnection-Konstruktor und main-Kanal-Nachrichten in `getStats()`. Bei der Autoritätsmessung hatten beide Zustände exakt `time=18.7833…`, dieselbe Phase/Zyklus/Richtung, Host-Ticks 25 und Gast-Ticks 0. Das belegt die Host-Uhr, keinen öffentlichen WAN-/TURN-Test.

Sichtbefund: Warnung, offene Faust, Ringaktion, Eis-Deckungsfläche und gedrehter Lava-Sektor sind in Desktop-Bildern klar unterscheidbar. Touch-Bedienelemente und HUD liegen innerhalb der gemessenen Viewports; die Ergebnisansicht im Querformat ist scrollbar, nicht vollständig auf einem einzigen Bildschirm sichtbar. Grenzen: der übersprungene Intro-Zeitraum beeinflusst die Stein-Hochformatkamera, und die mobilen Lava-Aufnahmen wechseln während des eigentlichen Screenshots bereits von Angriff zu Öffnung. Der echte Touch-Lava-Aktionscheck ist positiv, aber diese Bilder alleine sind kein sauberer Nachweis des mobilen aktiven Sektors. Kein bestätigter Produktfehler wurde daraus abgeleitet oder ohne Koordination geändert. Keine Runtime-Änderung während/nach der Browser-Abnahme.

Unveränderte Inhalts-Hashes: CSS `71aca788e383`, State-JS `1c52bbf044bc`, View-JS `13b2c678b33b`. Share-Link behält Raum, Ebene und Meister-Modus, und `lvl` bleibt vom Wildnis-Redirect ausgenommen. Explizites `/favicon.svg` ist vor allen Browserläufen vorhanden.
