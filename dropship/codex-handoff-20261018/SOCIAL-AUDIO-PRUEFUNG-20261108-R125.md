# LuxeStyle Social-Audio-Prüfung – 08.11.2026, R125

Stand: 00:06 Uhr Europe/Zurich. Anlass ist die ausdrückliche Vorgabe «keine Sprache in Social, nur Text» zusammen mit der bestehenden Regel, Musik ausschliesslich aus `automation/music/luxe-premium.wav` zu verwenden.

## Befund

- Im aktuellen Sieben-Tage-Plan lagen 11 MP4-Objekte mit sieben Medien-URLs und vier eindeutigen Dateihashes.
- Alle vier Dateien enthalten AAC-Audio. Zwei lokale ASR-Gegenproben (`faster-whisper` tiny und base) erkannten in drei Dateien keine Sprachsegmente. In der Datei mit SHA-256 `fd335d43a5657a9a6cf2e427aba87b33bf39308f830226e91733fccc338fe9f9` erkannten beide Modelle mit hoher Sprachwahrscheinlichkeit eine deutsche Sprechspur über Kristallspitzen. Das ist ein ASR-Befund, keine menschliche Hörabnahme.
- Keine der vier Audiospuren ergab einen technischen Treffer zur vorgeschriebenen Musikdatei mit SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`; die höchste normalisierte Signalübereinstimmung lag je Datei nur zwischen 0,05 und 0,09. Das belegt keinen erlaubten Musikeinsatz. Die drei Dateien ohne erkannte Sprache sind damit ebenfalls nicht freigabefähig.

## Tatsächliche Metricool-Änderung

Nach frischer Gegenprüfung von brandId `6227837`, Europe/Zurich und allen sechs erwarteten Kanalidentitäten wurden genau die 11 bestehenden MP4-Objekte auf `draft=true` und global `autoPublish=false` gesetzt. Bei Instagram-Objekten wurde zusätzlich `instagramData.autoPublish=false` gesetzt. Die Write-Inputs änderten absichtlich nur diese Flags. UUIDs, aktuelle Text-Hashes, Medien-URLs/-Hashes, Kanalzustände, Zeitzone, YouTube-`madeForKids=false` und Termine wurden je Post zurückgelesen; numerische IDs änderten sich erwartungsgemäss. Für neun Posts wurde vor dem Write kein separater Text-Hash persistiert, weshalb die exakte Text-Bytegleichheit vor/nach dem Write dort unbekannt bleibt. Die vollständige Alt-/Neu-Zuordnung und Rücklesung steht im [R125-Beleg](SOCIAL-AUDIO-PRUEFUNG-20261108-R125.json).

Frische Rücklesung: 30 Planungsobjekte/47 Kanalzustände insgesamt; davon genau 11 Videoobjekte mit 16 Kanalzuständen als Entwurf und Auto-Publish aus. Die 19 Fotoobjekte wurden nicht verändert. Provider-Status `PENDING` ist bei den Entwürfen kein Publikationsbeleg.

Es wurde kein Post neu angelegt, kein Medium ersetzt, kein Video gerendert oder hochgeladen und nichts veröffentlicht. Zwei klar abgefangene Vorvalidierungsfehler erzeugten keinen Write. Kennzahlen, Klaviyo, Shopify-Bestellungen und Kauf-Watch wurden am neuen Kalendertag nicht erneut gelesen.

## Nächster zulässiger Schritt

Für jedes betroffene bestehende Post-UUID nur dann eine regelkonforme MP4 einsetzen, wenn Produktzuordnung, kommerzielle Rechte, Bildqualität, reine Textführung, die vorgeschriebene Musik sowie Kanal-Ausschnitte geprüft sind. Danach denselben Entwurf aktualisieren und frisch zurücklesen; keine Ersatzposts oder täglichen Kopien anlegen.
