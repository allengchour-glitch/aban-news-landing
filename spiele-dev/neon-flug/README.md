# Neon-Flug / Aether Run – Koop-Kampagne

## Reviewstand v4 – 16.11.2026 (noch nicht veröffentlicht)

Der Arbeitsstand auf `codex/neon-flug-ringe-belohnung` ergänzt echte Höhensteuerung (WASD/Pfeile oder relativer Zwei-Achsen-Touchstick), einmalig verschwindende Ringe einschließlich Doppelringen und einen optionalen Modus **Neon-Schießen** im selben Einstieg. Die klassische Drei-Kapitel-Kampagne bleibt Standard. Der Gastgeber bestimmt den Modus. Protokoll, Raum- und Discovery-Präfix sind jetzt **v4**; `js/mp.js` bleibt unverändert.

Neon-Schießen dauert 60 Sekunden. Drohnen brauchen zwei Treffer, F oder der Feuerknopf schießen bei gehaltener Eingabe. Cooldown und Wärme begrenzen Dauerfeuer, Abkühlen gibt die Waffe wieder frei. Ringe, Schutz-Dash und Rettung bleiben erhalten. Überleben schließt das Match ab, Abschüsse geben bis zu 100 zusätzliche XP; der Modus schaltet keine klassischen Kapitel frei.

Sammlungen melden Punkte und Kette im HUD. Ergebnisse zeigen beste Kette, gegebenenfalls Abschüsse und die XP-Anteile für Abschluss, Team, Sammeln und Kampf. Abschluss-IDs bleiben im lokalen Profil und verhindern erneute Belohnung nach wiederholten Ergebnissen/Handshake/Reload. Training und Niederlagen geben keine XP. Web Locks serialisieren Schreibvorgänge; bei gesperrtem Speicher erhält der RAM den Fortschritt **nur für die aktuelle Sitzung**, mit ausdrücklichem Hinweis. Nach Seitenreload kann nicht gespeicherter Fortschritt nicht wiederhergestellt werden. Keine serverseitig verifizierten Accounts.

Beide Renderer verwenden echte X/Y-Koordinaten und dieselben Sammelzustände. Projektile sind auf 16 begrenzt, Sammelpartikel auf 96 und Trails auf 24 Punkte je Pilot. Trails werden alle 40 ms abgetastet. Reduzierte Bewegung unterdrückt Banking, Trails und Sammelpartikel. Bei schmaleren Formaten wird der Bildausschnitt angepasst; ein optionaler Knopf erlaubt nach dem Drehhinweis die Hochformatbedienung. Berggeometrie und Welttexturcode bleiben unverändert.

GEMESSEN: 66 Node-Tests sowie 90 Browser-/Rendererprüfungen bestanden. Darunter 22 neue Eingabe-/Canvas-/WebRTC-Prüfungen, 18 WebGL-/Geometrieprüfungen und 11 gezielte HUD-/Speicher-Gegenproben. Die drei HUD-Ansichten 390×844, 640×360 und 960×540 wurden mit echten Touch-Ereignissen geprüft. WebGL-Funktionsprüfungen erfolgten nach ausdrücklicher Parent-Freigabe, getrennt von LP; sie sind keine WebGL-Performancefreigabe. Details, Messgrenzen und Dateiliste: `WEITERARBEIT.md`, Rohwerte: `PRUEFUNG-v4.json`.

Zusätzliche gezielte Prüfungen:

```sh
PORT=8186 node spiele-dev/neon-flug/server.cjs
node --test spiele-dev/neon-flug/*.test.mjs
# Für Browser jeweils PLAYWRIGHT_MODULE, NEON_CHROME und NEON_TEST_URL setzen.
node spiele-dev/neon-flug/features-browser.cjs
node spiele-dev/neon-flug/review-browser.cjs
node spiele-dev/neon-flug/bounds-webgl.cjs
```

`NEON_CHROME` benennt optional die vollständige Chromium-Binärdatei. Lokale Koop-Tests öffnen zwei echte Fenster desselben Browserprofils, damit Chromium keinen Hintergrund-Tab stilllegt. Discovery läuft über BroadcastChannel, Spielzustände über echte WebRTC-DataChannels. Das ist keine Transportattrappe. Matchabschlüsse werden im Test per Debug-Zeitraffer ausgelöst; dies ersetzt keinen manuellen Durchspielnachweis.

## Vorher veröffentlichter Stand v3

PR3156 wurde nach den Prüfungen zusammengeführt und auf https://abannews.com/neon-flug veröffentlicht. Produktionscommit218c7e4d987106ce55c7cba34b87ce515970a96e; erfolgreiche Auslieferung separat geprüft. Protokoll und Raumpräfix v3. Standard ist jetzt eine schnelle perspektivische Canvas-Darstellung; die aufwendigere Three.js-Fassung bleibt unter „3D · hohe Grafiklast“ wählbar. Im Standard wird kein WebGL-Kontext angelegt. Beim Zurückschalten zeichnet die verdeckte 3D-Ansicht nicht weiter.

## Spiel und Bonus-Schleife
Drei gestaltete Strecken (90/95/100 Sekunden), zwei getrennt gesteuerte Gleiter, gemeinsame Punkte, Dash, Rettung und gemeinsam bestätigte Übergänge bis zum Kampagnensieg. Navigator, Retter und Impuls unterscheiden sich in Lenktempo, Rettung und Dash. Training mit ausdrücklich benanntem Autopilot speichert keinen Kampagnenfortschritt.

Das sichtbare Resonanzband lädt durch Doppelringe auf gegenüberliegenden Seiten, abgestimmte Dashs, Rettungen und Boni. Volle Resonanz erzeugt fünf Sekunden Overdrive mit doppelten Sammelpunkten. Goldene Bonusringe geben zusätzlich 300 Punkte und Resonanz. Je fünf Sammlungen löst die gemeinsame Kette einen weiteren Bonus aus; Treffer unterbrechen die Kette.

Kapitelabschlüsse geben 100 Flug-XP, Team-Manöver bis zu 150 weitere und Bonusketten/-ringe bis zu 100 weitere. Levelaufstieg und neue Module werden beim Ergebnis angezeigt. Der Hangar zeigt den Fortschritt bis zum nächsten Level. Ein Modul ist pro Pilot aktiv; verdiente Ausrüstung kann zwischen Kapiteln synchron übernommen werden.

| Piloten-Level | XP ab | Neues Modul |
|---|---:|---|
| 1 | 0 | Basisausrüstung; alle drei Rollen spielbar |
| 2 | 100 | Kondensator – kürzere Dash-Nachladezeit |
| 3 | 250 | Fokusfeld – grösserer Sammelradius |
| 4 | 450 | Rettungsanker – voller Schild nach Rettung |
| 5 | 700 | Resonanzkern – mehr Team-Resonanz |
| 6 | 1000 | Vektordüsen – schnellerer Seitenwechsel |
| 7 | 1400 | Schutzmatrix – längerer Trefferschutz |
| 8 | 1900 | Schubspule – noch kürzere Dash-Nachladezeit |
| 9 | 2500 | Teamkanal – stärkere Nachladung in Partnernähe |
| 10 | 3200 | Rettungsimpuls – längerer Schutz nach Rettung |

Danach folgen weitere Piloten-Level im Abstand von 500 XP. Dies sind Piloten-Level, zusätzlich zu den drei Flugstrecken. XP, Modulwahl, Rekorde und Einstellungen werden lokal gespeichert; es gibt keine serverseitig verifizierten Accounts oder globale Rangliste.

## Darstellung und gemessene Performance
Der neue Standard zeichnet perspektivisch projizierte, texturierte Felsflächen, vorbereitete Gleitermotive, Energieringe, Resonanzband, Partikel und Wetter in Canvas2D. Die Spielsimulation ist dieselbe wie in der optionalen 3D-Fassung. Die bisherigen schweren Shader werden dafür nicht gestartet. Alte Grafikeinstellungen werden einmalig auf den neuen Schnellmodus migriert; spätere eigene Entscheidungen bleiben gespeichert.

Gemessene Kurzprobe nach der Felskorrektur bei einem Fenster von 960×540 und gleich grosser Renderfläche: rund 57,3 rAF-Bilder/s, Median 16,7 ms, 95. Perzentil 16,8 ms. Während 4,52 Sekunden vergingen 4,52 Sekunden Simulation. Die vorherige Kurzprobe ohne feste Welttextur lag bei 59,8 rAF-Bilder/s. Das ist eine kurze lokale Cloud-Probe, keine Zusage für reale Handys oder Internetlatenz. Die alte WebGL-Softwareprobe lag nach der ersten Optimierung bei rund 7,3 FPS und bereits reduzierter Renderauflösung.

Die Spieluhr holt langsame Frames in kleinen Schritten nach. Lange Unterbrechungen pausieren die laufende Mission. Zustandsupdates im Flug laufen im Abstand von 50 Millisekunden; wichtige Übergänge bleiben zuverlässig. Sequenzschutz verhindert Rücksprünge durch alte Pakete, die Gastdarstellung wird geglättet und eigene Bewegung kurz visuell vorhergesagt. Entscheidungen bleiben beim Gastgeber.

Eigene synthetisierte Musik und Effekte starten nach Bedienung. Getrennte Lautstärken, Stummschaltung und reduzierte Bewegung werden gespeichert. Die Bildmotive für Menü und Basalt entstanden mit OpenAIs Bildwerkzeug; Gleitermotive und Darstellungs-Code sind eigene Arbeit. Diese Umsetzung nutzte keine Higgsfield-Verbindung. Three.js und PeerJS sind bestehende lokale MIT-Bibliotheken; js/mp.js bleibt gemeinsam nutzbar und unverändert.

## Felsbewegung und Detailprüfung

Die Seitenwände nutzen feste Weltabschnitte mit gemeinsamen Kanten. Form und Texturkoordinaten bleiben beim Nachladen am Ort; angeschnittene Flächen werden an der Kameraebene gekürzt, statt als ganze Wand zu verschwinden. Auch Wasserlinien behalten ihre absolute Position. Zwei feste Texturstreifen pro Fläche vermeiden einen zusätzlichen sichtbaren Detailstufenwechsel.

Die gezielte Bildgegenprobe vergleicht die Seitenbereiche bei 0,01 Metern Bewegung an sechs Abschnittsgrenzen. Die alte Fassung sprang dabei um bis zu 10,35 RGB-Werte pro Farbkanal; die neue um höchstens 0,612. Normale Bewegung bleibt sichtbar (5,18 bei 5,5 Metern). Das ist eine lokale Kontinuitätsprobe, kein Beweis für sämtliche Kamerawinkel oder die optionale 3D-Fassung.

Am Ziel wird erst abgeschlossen, wenn beide Piloten flugfähig sind. Ein ausgefallener Partner kann innerhalb seiner echten Rettungsfrist noch gerettet werden; ein abgelaufener Countdown führt zur Niederlage. Der Trainingsautopilot setzt die Frist nicht mehr unbemerkt zurück. Der einmalige Lenkhinweis überdeckt keine Team-Bonusmeldung mehr. Beim Abreisen eines Partners bleibt ein bereits erzieltes Ergebnis sichtbar; nach dem Kampagnensieg kann jeder selbst zum Hangar zurückkehren.

## Spielersuche und verbleibende Prüfung
„Mitspieler finden“ zeigt tatsächlich erreichbare öffentliche Räume mit Rufname und Belegung. Private Einladungen bleiben separat. Produktion verwendet die sechs bestehenden öffentlichen Raumcodes des PeerJS-Adapters. Ein leeres Suchergebnis kann auch an einer eingeschränkten Verbindung liegen. Im lokalen Testmodus erfolgt die Raum-Entdeckung über einen tatsächlichen BroadcastChannel, anschliessend die Spielverbindung über WebRTC-DataChannels. Keine künstlichen Mitspieler oder erfundenen Online-Zahlen.

Der öffentliche Cloud-Browsertest scheiterte zuvor an ERR_CERT_AUTHORITY_INVALID. Automatische Freigabeprüfung verweigerte einen zusätzlichen dauerhaften Proxy-CA-Eintrag. Kein erneuter Eingriff und kein Abschalten der Zertifikatsprüfung. Öffentliche Vermittlung, zwei reale Zielgeräte, hörbare Mischung und Balance sind vor Veröffentlichung noch zu prüfen. Die neue Videoaufnahme zeigt die echte lokale Trainingsfassung mit Autopilot und geskripteten Eingaben.

## Vorschau und Prüfungen
Im Repository-Root:

    node spiele-dev/neon-flug/server.cjs

Dann http://localhost:8099/neon-flug öffnen. Für lokale Such-/Koop-Tests beide Clients mit ?mp=local&debug=1 öffnen; für öffentliche Vermittlung mp=local weglassen. debug=1 stellt nur Testzugriffe bereit. Beschleunigte Kampagnenabschlüsse im Test sind kein manueller Durchspielnachweis.

    node --test spiele-dev/neon-flug/core.test.mjs spiele-dev/neon-flug/profile.test.mjs spiele-dev/neon-flug/timing.test.mjs spiele-dev/neon-flug/scenery.test.mjs
    node spiele-dev/neon-flug/browser-test.cjs
    node spiele-dev/neon-flug/matchmaking-test.cjs
    node spiele-dev/neon-flug/ui-test.cjs
    node spiele-dev/neon-flug/renderer-test.cjs
    node spiele-dev/neon-flug/scenery-browser-test.cjs
    node spiele-dev/neon-flug/gameplay-audit.cjs
    node spiele-dev/neon-flug/performance-sample.cjs

Gemessen: 51 Simulations-/Profil-/Timing-/Geometrieprüfungen, zehn Kampagnen-WebRTC-Prüfungen, zwölf Such-/Ausrüstungsprüfungen, neun UI-Prüfungen, sechs Rendererprüfungen, zwei Bildkontinuitäts- und sechs Gameplay-Detailprüfungen bestanden (96). Dazu HTML-, Syntax- und Diff-Prüfung. Browserprüfungen benötigen Playwright/Chromium, UI-Prüfung zusätzlich @axe-core/playwright. Alternative Installationen über PLAYWRIGHT_MODULE, AXE_MODULE und PLAYWRIGHT_BROWSERS_PATH; Testserver über NEON_TEST_URL, Berichte über NEON_REPORT_DIR, Performance-JSON über PERF_OUT.

Die vollständige lokale CI kann im schreibgeschützten HOME keine Plandatei anlegen. Daher keine vollständige CI-Freigabe behaupten; GitHub-Prüfungen getrennt bewerten. Produktionsnachweis und verbleibende Grenzen stehen in `spiele-dev/abschlusspruefung/README.md`.

Im ausdrücklich sparsamen Modus werden keine wiederholten Fels-Texturprojektionen gezeichnet. Standard behält die festen Welttexturen. Die4x-CPU-Emulation stieg damit von12,9 auf59,6rAF/s; Touch und Spieluhr wurden mitgeprüft. Audio-Lautstärke0 bleibt wirklich still, auch nach Dash/Fortsetzen. Das niedrige Querformat-Menü ist scrollbar, ohne dass die Fusszeile den Trainingsknopf überdeckt. Keine Hardware-FPS-Zusage.
