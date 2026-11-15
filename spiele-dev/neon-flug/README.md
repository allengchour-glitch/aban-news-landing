# Neon-Flug / Aether Run – Koop-Kampagne

Entwurfs-PR3156, nicht auf abannews.com veröffentlicht. Protokoll und Raumpräfix v3. Standard ist jetzt eine schnelle perspektivische Canvas-Darstellung; die aufwendigere Three.js-Fassung bleibt unter „3D · hohe Grafiklast“ wählbar. Im Standard wird kein WebGL-Kontext angelegt. Beim Zurückschalten zeichnet die verdeckte 3D-Ansicht nicht weiter.

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

Gemessene Kurzprobe bei einem Fenster von 960×540 und gleich grosser Renderfläche: rund 59,8 rAF-Bilder/s, Median 16,7 ms, 95. Perzentil 16,8 ms. Während 4,50 Sekunden vergingen 4,50 Sekunden Simulation. Das ist eine kurze lokale Cloud-Probe, keine Zusage für reale Handys oder Internetlatenz. Die alte WebGL-Softwareprobe lag nach der ersten Optimierung bei rund 7,3 FPS und bereits reduzierter Renderauflösung.

Die Spieluhr holt langsame Frames in kleinen Schritten nach. Lange Unterbrechungen pausieren die laufende Mission. Zustandsupdates im Flug laufen im Abstand von 50 Millisekunden; wichtige Übergänge bleiben zuverlässig. Sequenzschutz verhindert Rücksprünge durch alte Pakete, die Gastdarstellung wird geglättet und eigene Bewegung kurz visuell vorhergesagt. Entscheidungen bleiben beim Gastgeber.

Eigene synthetisierte Musik und Effekte starten nach Bedienung. Getrennte Lautstärken, Stummschaltung und reduzierte Bewegung werden gespeichert. Die Bildmotive für Menü und Basalt entstanden mit OpenAIs Bildwerkzeug; Gleitermotive und Darstellungs-Code sind eigene Arbeit. Diese Umsetzung nutzte keine Higgsfield-Verbindung. Three.js und PeerJS sind bestehende lokale MIT-Bibliotheken; js/mp.js bleibt gemeinsam nutzbar und unverändert.

## Spielersuche und verbleibende Prüfung
„Mitspieler finden“ zeigt tatsächlich erreichbare öffentliche Räume mit Rufname und Belegung. Private Einladungen bleiben separat. Produktion verwendet die sechs bestehenden öffentlichen Raumcodes des PeerJS-Adapters. Ein leeres Suchergebnis kann auch an einer eingeschränkten Verbindung liegen. Im lokalen Testmodus erfolgt die Raum-Entdeckung über einen tatsächlichen BroadcastChannel, anschliessend die Spielverbindung über WebRTC-DataChannels. Keine künstlichen Mitspieler oder erfundenen Online-Zahlen.

Der öffentliche Cloud-Browsertest scheiterte zuvor an ERR_CERT_AUTHORITY_INVALID. Automatische Freigabeprüfung verweigerte einen zusätzlichen dauerhaften Proxy-CA-Eintrag. Kein erneuter Eingriff und kein Abschalten der Zertifikatsprüfung. Öffentliche Vermittlung, zwei reale Zielgeräte, hörbare Mischung und Balance sind vor Veröffentlichung noch zu prüfen. Die neue Videoaufnahme zeigt die echte lokale Trainingsfassung mit Autopilot und geskripteten Eingaben.

## Vorschau und Prüfungen
Im Repository-Root:

    node spiele-dev/neon-flug/server.cjs

Dann http://localhost:8099/neon-flug öffnen. Für lokale Such-/Koop-Tests beide Clients mit ?mp=local&debug=1 öffnen; für öffentliche Vermittlung mp=local weglassen. debug=1 stellt nur Testzugriffe bereit. Beschleunigte Kampagnenabschlüsse im Test sind kein manueller Durchspielnachweis.

    node --test spiele-dev/neon-flug/core.test.mjs spiele-dev/neon-flug/profile.test.mjs spiele-dev/neon-flug/timing.test.mjs
    node spiele-dev/neon-flug/browser-test.cjs
    node spiele-dev/neon-flug/matchmaking-test.cjs
    node spiele-dev/neon-flug/ui-test.cjs
    node spiele-dev/neon-flug/renderer-test.cjs
    node spiele-dev/neon-flug/performance-sample.cjs

Gemessen: 43 Simulations-/Profil-/Timingprüfungen, acht Kampagnen-WebRTC-Prüfungen, zwölf Such-/Ausrüstungsprüfungen, neun UI-Prüfungen und sechs Rendererprüfungen bestanden. Dazu HTML-, Syntax- und Diff-Prüfung. Browserprüfungen benötigen Playwright/Chromium, UI-Prüfung zusätzlich @axe-core/playwright. Alternative Installationen über PLAYWRIGHT_MODULE, AXE_MODULE und PLAYWRIGHT_BROWSERS_PATH; Testserver über NEON_TEST_URL, Berichte über NEON_REPORT_DIR, Performance-JSON über PERF_OUT.

Die vollständige lokale CI kann im schreibgeschützten HOME keine Plandatei anlegen. Daher keine vollständige CI-Freigabe behaupten; GitHub-Prüfungen getrennt bewerten. Entwurf nicht automatisch veröffentlichen oder mergen.
