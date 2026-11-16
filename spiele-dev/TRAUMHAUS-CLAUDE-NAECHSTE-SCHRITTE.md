# Traumhaus – nächste Schritte für Claude Code

Stand: 16.11.2026. Letzter Besitzerauftrag: laufende Änderungen fertigstellen, Memory regelmässig teilen und anschliessend nur weitere Verbesserungen für Claude Code suchen. Die folgenden Vorschläge sind **nicht umgesetzt**. Zuerst den aktuellen Stand in [der Übergabe](CLAUDE-UEBERGABE-TRAUMHAUS.md) und PR #3216 prüfen; bereits erledigte Korrekturen nicht erneut anwenden.

## Priorität 1: Leistung auf einem echten Handy

GEMESSEN: Die Egoansicht am Seepark benötigt in der bestehenden Software-WebGL-Probe rund 2’241 Zeichenaufrufe. Ein zusätzlicher Profillauf ordnet 424 Aufrufe dem Frachtschiff `th15_frachtschiff.glb` mit 18 Materialien und 176 dem Landbus `th40_bus.glb` zu. Diese Zahlen sind keine Handy-Bildraten. Vom Gerät des Besitzers ist nur «Handy» bekannt.

Vorschlag: zuerst Gerätemodell und Browser festhalten und Zentrum, Seepark, Nordstadt sowie Rennfahrt mit identischen Einstellungen messen. Danach statische Teile der teuersten Modelle pro Material zusammenfassen; bewegliche Teile, transparente Flächen und deren Zeichenreihenfolge erhalten. Kamera- und Fotomodus sowie Tag/Nacht im direkten Bildvergleich prüfen. Keine pauschale Verringerung aller Stadtdetails, bevor der konkrete Engpass gemessen ist.

Erfolgskriterium: weniger Zeichenaufrufe bei unverändertem Bild und besserer gemessener Bildzeit auf dem Zielgerät. 60 FPS erst nach dortiger Messung behaupten.

## Priorität 2: Missionen im Einstieg sichtbar machen

QUELLE: `traumhaus.html`, `achBtn`, `tipRow` und Einführungsdialog. Der Pokalknopf hat den Titel «Spielmodi und Erfolge», zeigt aber nur ein Symbol. Die Einführung nennt die Bauabnahme als Ziel, obwohl vier Stadtmissionen, ÖV und Rennen vorhanden sind.

Vorschlag: eine knappe sichtbare Beschriftung «Spielen» beziehungsweise «Missionen» prüfen und den Einstieg um Stadt erkunden, Aufträge und Bauen ergänzen. Der Spieler soll den ersten Auftrag ohne Kenntnis des Pokalsymbols finden. Bestehende Bauabnahme und Spielstände erhalten.

Erfolgskriterium: verständlicher Weg vom frischen Spielstart zum Missionsbrett; keine verdeckten Joystick- oder Fahrzeugtasten im kleinen Handy-Querformat.

## Priorität 3: Rennknopf passend zur Entfernung beschriften

QUELLE: `traumhaus.html`, `stadtMenue()` und `rennenStart()`. Der Knopf «Leihwagen & Rennen starten» setzt aus der Ferne zunächst nur die GPS-Route.

Vorschlag: aus der Ferne «Zum Motorsportpark navigieren», vor Ort die tatsächliche Startaktion anzeigen. Keine automatische Versetzung des Spielers ergänzen. Bestehende Startbedingungen, Countdown und Ergebnisanzeige erhalten.

Erfolgskriterium: Beschriftung und tatsächliche Wirkung stimmen vor Ort und aus der Stadt überein; der Startcountdown hält den Wagen weiterhin vollständig an.

## Priorität 4: Weitere Strassenbilder gezielt vergleichen

QUELLE: abgeschlossene Strassenrunde in [TRAUMHAUS-STRASSEN.md](TRAUMHAUS-STRASSEN.md). Die bestätigten Gehweg-, Asphalt-, Schild- und Rennnahtfehler sind korrigiert. Als Gestaltungsvorschlag kann Claude den Wechsel zwischen alter Strasse und neuer breiterer Fahrbahn bei etwa `(420, -140)` auf einen ruhigeren Breiten- und Gehwegübergang prüfen. Daraus ist bisher kein Fahrbarkeitsfehler belegt.

Erfolgskriterium: ein nachvollziehbar besseres Vergleichsbild bei unverändert freier Fahrbahn und ohne neue Zeichenaufrufe pro Strassenmarkierung. Neue Befunde zuerst am geladenen Spiel nachstellen.

## Arbeitsstand weitergeben

Nach jedem abgeschlossenen Paket die kanonische Übergabe aktualisieren und den Traumhaus-Verweis in `SHARED-MEMORY.md` sowie den eigenen Abschnitt in `docs/CODEX-CLAUDE-UEBERGABE.md` nachführen. Andere Projekte und deren Abschnitte erhalten. Verifizierte Quellen und Prüfprotokolle zusätzlich im bestehenden Traumhaus-Drive-Ordner sichern; private Drive-Links gehören nicht ins öffentliche Repository. Speichern ist keine Empfangsbestätigung von Claude.

Higgsfield: beide bisherigen Aufträge sind mit `failed` beendet. Kein Asset geliefert; Auftragskennungen stehen in der Übergabe. Keine weiteren kostenpflichtigen Versuche ohne Prüfung des Kontostandes und des konkreten Nutzens starten.
