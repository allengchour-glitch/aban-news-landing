# Nordstadt und Stadtmissionen

Stand: 16. November 2026. Auftrag: grössere zusammenhängende Stadt und mehrstufige Aufgaben wie in einem offenen Stadtspiel.

## Stadt

Die Erweiterung ergänzt 84 Gebäude nördlich der Oststadt, insgesamt stehen dort jetzt 148 Gebäude. Vier neue Blockreihen reichen bis z=-320; zwölf Innenhöfe, Depot, Garage, Technikpunkt und Nordpark bleiben erreichbar. Strassen, Karte, GPS, Entfernungsausblendung und Kamerakollision verwenden denselben Bauplan. Die 3D-Geschäftsorte sind mit Schildern, Paketen, Werkbank und Technikschrank gekennzeichnet.

X3 hält zusätzlich am Nordstadt-Depot. Der neue Shuttle N5 verbindet Oststadt-Forum, Depot und Nordpark. Das Netz umfasst fünf Linien und 22 Haltestellen.

## Vier Aufträge, jeweils drei Etappen

| Auftrag | Ablauf | Einmalige Belohnung |
| --- | --- | --- |
| Kurier | Paket am Bahnhof holen → am Forum abgeben → im Depot melden | 180 Spiel-Dollar |
| Wagenüberführung | Auftrag im Depot holen → in den blauen Auftragswagen steigen → an der Garage übergeben | 240 Spiel-Dollar |
| Technikdienst | Werkzeug holen → Technikpunkt drei Sekunden reparieren → Abschluss am Forum melden | 180 Spiel-Dollar |
| Stadtexpress | Mit Auto am Nordpark starten → Checkpoint an der Oststadt → Ziel am Motorsportpark | 220 Spiel-Dollar |

Die Beträge sind SETZUNGEN für die Spielbalance. Die vier Minuten beim Stadtexpress sind ein freiwilliges Zeitziel; eine langsamere Fahrt bleibt abschliessbar. Alle vier Aufträge sind sofort verfügbar. Wiederholungen zahlen kein weiteres Geld aus.

Start über Pokal → Stadtmissionen. Am markierten Ziel muss man die Aktion bewusst bestätigen. Fahraktionen benötigen ein stehendes Auto; die Überführung verlangt genau den blauen Auftragswagen. Reparatur beginnt per Tippen, pausiert in Menüs und bricht bei Weggehen oder Einsteigen ab. Die Mission kann jederzeit abgebrochen werden.

Im Koop führt der Gastgeber den Auftrag, der Gast kann mitfahren. Etappen und Abschlussflags liegen mit dem Geld im vorhandenen Haus-Spielstand. Laden stellt eine unterbrochene Etappe wieder her; der Auftragswagen steht bei Bedarf erneut am Depot. Einladungen von Stadtbewohnern öffnen jetzt echte Aufträge, statt schon beim Gespräch Geld für eine unerledigte Aufgabe zu zahlen.

## Prüfung

- Pure Missionslogik: GEMESSEN 12 erfolgreiche Prüfungen, einschliesslich aller Abläufe, ungültiger Speicherstände, falscher Fahrzeuge, Reparaturdauer und wiederholter Abschlüsse.
- Browser-Kontrolltest: GEMESSEN alle zwölf Etappen und alle zwölf Wiederholungsetappen; exakt 180/240/180/220 bei Erstabschluss und jeweils null bei Wiederholung. Die Figuren wurden für diese Prüfung gezielt an den Aufgabenorten positioniert. Geld und Etappe nach serialisiertem Speichern/Laden erhalten; Gastaktionen blockiert; keine JavaScript-Fehler.
- Fahrphysiktest: GEMESSEN Wagenüberführung mit unveränderter Fahrzeugphysik über 222,65 Meter durch die Hofzufahrten und das Strassennetz, Abschluss mit 240 Spiel-Dollar. Ein Testcontroller steuerte den Wagen; das war keine menschliche Handyfahrt.
- Reparatur: Originalfunktionen isoliert geprüft; Menüzeit zählt nicht, Weggehen und Einsteigen unterbrechen, drei aktive Sekunden führen weiter. Parallele Rallye, Rundkurs, Taxi und Lieferung sowie Foto-GPS sind gegen den Auftrag gesperrt.
- Handy: Board in 568×320, 844×390 und 390×844; alle vier Aktionen mindestens 48 CSS-Pixel und tatsächlich treffbar. Fahrt-HUD in beiden Querformaten ohne Textabschneiden oder Überschneidung mit Fahrzeugknöpfen; GPS und Abbruch 44 Pixel. Primäraktion bei laufender Mission ist Fortsetzen.
- Stadtgeometrie: GEMESSEN 21'096 Stichproben an Nordstrassen ohne Überschneidung mit Gebäuden; alle 84 neuen Gebäude von der Kamerakollision erfasst. Hofpunkte liegen ausserhalb der Fahrspuren.

Die Browsermessungen verwenden Software-WebGL. Eine Bildrate von 60 FPS auf echter Handy-Hardware ist weiterhin nicht nachgewiesen. Frühere Forschung und Gestaltungsentscheidungen stehen in TRAUMHAUS-STADTLEBEN.md. Veröffentlichung und abschliessende Netzprüfung werden im Pull Request festgehalten.
