# Tempel der Zwei: Grafikdurchgang

16.11.2026, Ausgangspunkt `2ddb884703dd663b13fc53bfad3d193c7250a746`. Die vorherige Grafikfassung ist über PR3177 und Hauptseitenlauf43815764560 veröffentlicht; ihr HTTPS-Nachweis liegt im Workspace unter `aban-spiele-analyse/tempel-grafik/live/production.json`.

Vier bestätigte Fehlergruppen sind korrigiert:

1. **Figuren und Ringe im Stein.** Auf den beiden Druckplatten, drei Schattenplatten und dem Herzpodest standen die Figuren weiter auf y=0. Die Plattenfläche liegt auf0,12, das Herzpodest auf0,065; der alte Markierungsring lag auf0,028. Jetzt folgt die Darstellung der tatsächlichen Zylinderhöhe, mit kurzem Übergang an der Kante. Auch die Siegesanimation addiert die Podesthöhe. X/Z-Bewegung und Netzwerkpositionen bleiben erhalten.
2. **Hinweise verdecken Figuren.** Bei360×640 und844×390 lag das Hinweisband quer über beiden Figuren. Meldungen stehen jetzt in der Aufgabenkarte, Ereignismeldungen ersetzen vorübergehend deren Titel. In kurzen Querformaten liegt die Karte oberhalb des linken Daumenbereichs. Längere Inhalte bleiben scrollbar. Der bestehende UI-Test prüft echte zweidimensionale Überschneidungen mit Steuerung und Namen statt eine feste horizontale Position.
3. **Versunkene Schalterzeichen.** Die runden Frontzeichen der beiden Gleichklang-Säulen schnitten sich im unteren Bereich mit dem breiter werdenden Säulenkörper. Ring, Plakette und Rune sitzen jetzt davor und bleiben befestigt. Geometrie- und Zeichenaufwand unverändert.
4. **Durchgehbarer Wächtersockel.** Mit echter W-Bewegung bei x=1,8 konnte die Figur den sichtbaren Sockel durchqueren. Mindestabstand vorher1,80 bei Sockelradius2,1. Eine kreisförmige Kollision berücksichtigt jetzt Sockel und Figurenradius0,42; im identischen Versuch mindestens2,57 Abstand. Die übrigen Wände und Tore verwenden ihre bisherigen Rechtecke.

Die geänderte `props.js` wird über ihren Inhalts-Hash geladen. Hintergrund: Die öffentliche Antwort war vier Stunden cachebar; eine reine Veröffentlichung derselben URL würde bereits geladene Browserkopien nicht sofort ersetzen. Keine globale Cache-Regel geändert.

## Gemessene Prüfung

- [Vorher](grafik-check/vorher-grafik.json)/[Nachher](grafik-check/nachher-grafik.json):40 konkrete Prüfbedingungen für Plattenkontakt, Ringe und freie Figuren.20 Fehlschläge am veröffentlichten HTML,0 nach Korrektur. Alle tatsächlichen Fuß-Meshes gemessen; Körper-Rig allein wäre dafür ungeeignet.
- [20 Kammeransichten](grafik-check/final-kammern.json): alle vier Kammern bei1440×900,360×640,390×844,844×390 und640×360. Keine Überschneidung der Aufgabenkarte mit den projizierten Figuren; keine JavaScriptfehler. Der Zwischenstand zeigte noch vier problematische Szenen bei640×360, diese führten zur abschließenden Querformatkorrektur.
- [Oberflächen und Siegesfeier](grafik-check/flaechen.json): Boden als positive Gegenprobe unverändert richtig, alle sechs erhöhten Flächen korrigiert. Siegesanimation vorher bis y=0,007 unter dem Podest, nachher mindestens0,070 bei Podestoberkante0,065.
- [Wächterkontakt](grafik-check/sockel.json): echtes W, geblendeter Wächter, identische Startpositionen; kein Teleport im geprüften Gehabschnitt.
- [33 Koop-Prüfungen](grafik-check/qa-results.json) und [22 Solo-/UI-Prüfungen](grafik-check/solo-results.json) erneut bestanden. Tatsächliche lokale WebRTC-Clients, UI-/Tastatur-/Touch-Eingaben. Positionsfixtures verkürzen längere Wege.
- [Schalter vorher](grafik-check/before-glyph.json)/[nachher](grafik-check/after-glyph.json): Detailkamera zur Flächenprüfung, zusätzlicher Test beider Schalter bis Tor3. In dieser begrenzten Szene65 Zeichenaufrufe und29.960 Dreiecke vor/nach Korrektur.
- [Leistung vorher](grafik-check/vorher-performance.json)/[nachher](grafik-check/nachher-performance.json): getrennte8-s-Proben,960×540, SwiftShader.33,47→33,40rAF/s, Median33,3ms und95.Perzentil50ms unverändert. Je55 Zeichenaufrufe/28.598 Dreiecke bei Renderverhältnis0,55. Kein zusätzlicher Zeichenaufwand, gleiche gemessene Median-/95.-Perzentil-Framezeit; keine Hardware-FPS-Zusage.

Die eigene lokale Shop-CI-Simulation startet nicht: `mktemp` kann unter dem schreibgeschützten `/home/agent` keinen Plan anlegen. Keine Tests daraus als bestanden gezählt, keine Änderung an HOME oder Sandbox. Die tatsächlichen PR-Prüfungen sind separat abzuwarten.

Kein physisches Mobilgerät, Safari- oder öffentlicher NAT-/Vermittlungstest. Screenshot-Prüfungen sind begrenzte Ansichten und keine Zusage, dass jede mögliche Kameraposition geprüft ist. Hauptseitenlauf und HTTPS-Quellenvergleich belegen die Veröffentlichung separat.

| Ansicht | Beleg |
| --- | --- |
| Verdeckte Figuren im bisherigen Querformat | [Vorher](grafik-check/vorher-quer.webp) |
| Korrigiertes kleines Querformat, Wächterkammer | [Nachher](grafik-check/nachher-quer.webp) |
| Korrigiertes kleines Hochformat | [Hochformat](grafik-check/nachher-hoch.webp) |
| Schalter, Detailkamera | [Vorher](grafik-check/vorher-zeichen.webp) · [Nachher](grafik-check/nachher-zeichen.webp) |

Die WebP-Dateien sind reine Formatkonvertierungen der Browserbilder. Originalbilder, weitere Ansichten und ausführliche Proben liegen unter `/workspace/aban-spiele-analyse/tempel-grafik-check/`.
