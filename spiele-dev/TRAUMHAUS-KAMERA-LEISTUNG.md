# Traumhaus: Kamera und Darstellung

Stand: 16. November 2026. Branch: `codex/traumhaus-kamera-20261116`. Die lokalen Prüfungen sind abgeschlossen. Ein Merge oder eine Veröffentlichung ist hier noch nicht bestätigt.

## Kamera

Belohnungs- und Aufprallimpulse verändern den gewählten Kamerawinkel nicht länger dauerhaft. Das Nicken wird als vorübergehender Zusatz berechnet und klingt anhand der verstrichenen Zeit ab, auch wenn die Kamera mehrfach pro Bild aktualisiert wird.

GEMESSEN: Nach elf Impulsen lag der alte Kamerawinkel bei rund 87,5 Grad. Ausgehend von 0,78 Radiant, rund 44,7 Grad, entspricht das etwa 42,8 Grad unerwünschter Veränderung. Mit der Korrektur bleibt der Grundwinkel erhalten; gemessene bleibende Veränderung null. Gegenproben mit 30, 60 und 120 Aktualisierungen pro Sekunde zeigen nach derselben Zeit denselben Abklingwert. Diese Prüffrequenzen sind keine gemessenen Spielbildraten.

Die Folgekamera sucht zwischen Hochhäusern einen etwas höheren freien Blick, bevor sie bis nahe an die Figur heranrückt. Der gewählte Grundwinkel bleibt gespeichert. Hindernisse begrenzen den Abstand sofort; nach einer freien Passage wird der Abstand geglättet zurückgegeben. Bei manueller Kamerabedienung hat die Eingabe Vorrang. Das gilt auch für die Bedienung mit zwei Fingern. Ego- und Bauansicht erhalten keine automatische Anhebung.

GEMESSEN am Nordstadtpunkt `(680, -68)`: Der Abstand zur Figur wächst im geprüften Blick von etwa 22,46 auf 45,20 Meter. Die Verbindung zwischen Kamera und Ziel ist nach der Anhebung frei. Der kontrollierte Weg durch den Engpass zeigte bei den drei Prüffrequenzen keine blockierte Kameralinie; Bau- und Ego-Gegenproben behalten ihren Grundwinkel und keinen automatischen Winkelzusatz.

## Himmel und Fotos

Himmelskuppel und Sterne folgen der Kameraposition; die Wolkengruppe folgt ihr horizontal. Damit bleibt der Himmel auch ausserhalb des ursprünglichen zentralen Bereichs um die Kamera angeordnet. Die Wolkenrotation richtet sich nach verstrichener Zeit. Die beweglichen Gruppen sind gegen das Einfrieren statischer Weltobjekte gekennzeichnet.

Vor einer Fotoaufnahme wird die Himmelsposition ebenfalls aktualisiert. GEMESSEN: Kuppel und Kamera liegen in den geprüften Aussen- und Zentrumansichten am selben Mittelpunkt. Die Foto-Gegenprobe bestätigt die Ausrichtung; die Aufnahme wurde erzeugt. Tag- und Nachtansichten wurden geprüft, ohne JavaScript-Fehler.

## Statische Instanzgruppen

Das neue Hilfsmodul `js/traumhaus-sicht.js` registriert gezielt statische Instanzgruppen und prüft ihre vollständigen Hüllflächen gegen das Sichtfeld. Bewegte Objekte werden ausgeschlossen. Geometrie- oder Instanzänderungen erneuern die Hüllfläche; gemeinsam verwendete Quellgeometrien werden dabei nicht überschrieben.

Die Sichtbarkeitsänderung gilt nur für den jeweiligen Zeichenaufruf und wird anschliessend zurückgesetzt. Der Filter wird im Hauptbild nur bei ausgeschalteter Schattenkarte verwendet, damit ausserhalb des Bildes liegende Schattenwerfer im vollständigen Grafikprofil erhalten bleiben.

GEMESSEN am aktuellen Stand: Zehn A/B-Ansichten mit Blickumkehr, Egoansicht und Zoom 24/90/135 bleiben pixelidentisch (je 329’160 Pixel). Auch die Rückprobe stellt das Original exakt wieder her. In der Nordstadt sinken die Zeichenaufrufe von 151 auf 74 und die Dreiecke von 160’999 auf 82’915. Altstadt: 639 auf 621 Aufrufe; Seepark: 684 auf 673. Zwölf Funktionstests und ein unabhängiger Review bestanden, keine JavaScript-Fehler. Quelle: `/tmp/th-sicht-final-befund.md`.

## Nachweise und Grenzen

Lokale Prüfprotokolle: `/tmp/th-kamera-analyse-agent.log`, `/tmp/th-kamera-browser-agent.log`, `/tmp/th-kamera-final-agent.log`, `/tmp/th-kamera-handy-agent.log`, `/tmp/th-kamera-pinch-final-agent.log` und `/tmp/th-himmel-final.log`. Diese temporären Dateien sind keine dauerhafte Sicherung; die Ergebnisse stehen deshalb zusätzlich hier.

Die Browserprüfung verwendet Software-WebGL. Sie belegt weder eine Bildrate von 60 FPS auf einem echten Handy noch eine bestimmte Verbesserung der Bildrate des gesamten Spiels. Die Egoansicht am Seepark bleibt mit 2’241 Zeichenaufrufen teuer; der Filter löst diese verbleibende Last nicht vollständig.

Die separate 3D-Parkuhr über Higgsfield endete mit Status `failed`; es liegt kein GLB vor. Die alternativ gestartete Nordpark-Grafik ist nicht Bestandteil dieser Kamera- und Leistungsänderung.
