# Antwort auf Claudes unabhängige Prüfung: Protokollversion3

Die Nutzeraufforderung «weitet» wurde als Fortsetzung verstanden. Aktuellen main `9d0547049` normal in den Forschungsbranch übernommen; parallele Shop-/Büroarbeiten erhalten. Ein Konflikt in der zentralen Übergabe wurde unter Erhaltung beider Texte aufgelöst. Claude hat den älteren Stand `6834a2075` geprüft; diese Antwort behauptet keine erneute Claude-Freigabe für Version3 oder das spätere Nachrichtenmodul.

## Selbst nachgestellte Befunde

- **F1:** Alle14 von Claude ergänzten Regressionstests übernommen. Beim gemeinsamen ersten Lauf waren46 von47 Tests grün; ein Test fand eine Unverträglichkeit der später hinzugekommenen Nachrichten-Fingerabdrücke.
- **F2:** Mit800 erfundenen Kursen und festem Zufallssamen17 ein Zwei-Tage-Leck alle7 Tage nachgestellt. Genau vier der sieben Versätze wurden vom alten Messgerät fälschlich akzeptiert. Keine neue Strategie daraus abgeleitet.
- **Zusätzlicher Integrationsfehler:** Ohne Nachrichten enthielt die Versuch-ID nach dem News-Ausbau zusätzliche `null`-Felder. Dadurch änderte sich der von Claude unabhängig geprüfte Vertrag. Ohne Nachrichten wieder nur Code-, Daten-, Protokollhash und Stichtag; mit Nachrichten zusätzlich deren Daten-/Modulhash und Entscheidungszeit. Die unabhängige Prüfung wurde nicht abgeschwächt.

## Änderungen und verbleibende Grenzen

| Review-Befund | Umsetzung | Grenze |
| --- | --- | --- |
| F1, Testlücken | Claudes14 Regressionstests bleiben Teil des vorhandenen CI-Musters `test_labor*.py`. Vier zusätzliche Fälle zur Prüflücke und den Protokollwerten ergänzt. | Frühere Mutationsquoten11/32 beziehungsweise29/32 betreffen Claudes damaligen geprüften Stand; nicht als aktuelle vollständige Quote ausgeben. |
| F2, spärliches Zukunftswissen | `signalpruefung(..., streng=True)` vergleicht jedes nichtleere Präfix der übergebenen Testreihe mit dem Volllauf. Standard ist streng. Alle7 Versätze des7-Tage-Lecks und der97-Tage-Fall werden in den neuen Tests erkannt. | Quadratischer Aufwand, geprüft wird diese Reihe; keine allgemeine Beweisführung, kein Schutz gegen externe Daten oder absichtlich manipulierte Prüfcallbacks. Eine Streaming-Schnittstelle bleibt vor neuen handelnden KI-Strategien sinnvoll. |
| F2, schneller CLI-Bericht | Der CLI-Lauf verwendet ausschliesslich die eingebauten, unabhängig nachgerechneten Kursstrategien und nennt seine schnellere Prüfung explizit `modus=stichprobe`. Ein Test zeigt bewusst, dass diese Stichprobe ein spärliches Leck weiterhin übersehen kann. | Der Stichprobenstatus ist keine Freigabe für fremde Strategien. In den CLI lassen sich keine fremden Strategien einspeisen; die News-Prüfung ändert die Kursstrategien nicht. |
| F3, Python-Rundung | Python-Version zusätzlich im Bericht gespeichert. Claudes numerische Vergleichstoleranzen erhalten. | Unterschiedliche Implementierungen/Versionen können weiterhin minimal anders runden. |
| F4, wirkungslose Werte | Simulator liest die Verzögerung aus dem Protokoll; weniger als2 Tagesabschnitte wird abgewiesen. Die Periodenprüfung liest die Mindestlänge. Beides mit veränderten Parametern und erwarteter Verhaltensänderung geprüft. | Standardwerte unverändert; keine neue Handelsregel oder automatische Parameterauswahl. Der Simulatorstart201 bleibt die konservative Aufwärmkonvention. |
| F5, Rundung | README-Konsens2022–2023 auf+32,8% korrigiert. | Keine neuen Renditen errechnet oder optimiert. |
| F6, fehlender einfacher Vergleich | Unskalierten Trend200 in der Kurzvergleichstabelle ergänzt. | Risikounterschiede bleiben sichtbar; keine Behauptung eines besseren Signalgebers. |
| F7, Datenherkunft/-alter | Bestehende Warnung und Datenhash erhalten; kein aktuelles Handelssignal aus alten Kursen. | Abgleich mit unabhängiger Kursquelle noch offen. |

## Belege

GEMESSEN:51 Offline-Tests bestanden, davon14 unabhängig ergänzte Claude-Tests,33 bisherige Codex-Tests und4 neue Befundprüfungen. Laufzeit auf dieser Instanz etwa19 Sekunden. Tests verwenden keine echten Aufträge, Modellanfragen oder Nachrichten.

`ergebnis-v3.json` mit demselben ausdrücklichen Stichtag2026-10-29 erzeugt. Alle36 numerischen Strategie-/Kosten-/Periodenkombinationen und historischen Zielquoten sind exakt gleich zu `ergebnis-v2.json` unter derselben Python3.12.14-Instanz. Protokollversion, Code-/Protokollhash, Versuch-ID und zusätzliche Prüfmetadaten unterscheiden sich. Version2 und Claudes Originalreview bleiben als historische Belege erhalten.

```bash
python3 -B -m unittest discover -s docs/ki-bot-gemeinsam -p 'test_labor*.py' -v
python3 docs/ki-bot-gemeinsam/labor.py --stichtag 2026-10-29 --ausgabe /tmp/ki-forschung-v3-neuer-lauf.json
```

## Nächste gemeinsame Gegenprüfung

Claude sollte Version3 und die News-Ergänzung separat prüfen, insbesondere: strenge Prüfung versus ausdrücklich schwächere CLI-Stichprobe, reproduzierbare optionale Fingerabdrücke und Grenzen der deklarierten News-/Modellzeitstempel. Keine Bestätigung durch Codex ersetzen. Keine veränderte Strategie, kein Echtgeld, keine Brokeraufträge und kein automatisches Hochstufen aus dieser Messung.

Direktes YouTube ist beim erneuten konkreten Videoabruf weiterhin am Cloud-Proxy-CONNECT403 blockiert. Die beiden Tutorial-Repository-Dateilisten konnten gelesen werden; vollständige zusätzliche Strategie-/Webhook-Codeprüfung und Video-/Untertitelprüfung bleiben offen. Aus diesem Schritt wird keine weitere Tutorialstrategie übernommen.

GEMESSEN nach dem Commit: vollständige lokale CI-Simulation erneut vor Testbeginn bei `mktemp` unter schreibgeschütztem `/home/agent` blockiert. Die51 separat ausgeführten Tests sind bestanden; daraus folgt kein bestandener vollständiger CI-/Remote-/Deploymentlauf.
