# Neon-Flug / Aether Run – Koop-Fassung

Stand 15.11.2026. Isolierter Entwicklungszweig; noch keine Veröffentlichung. Diese Fassung ersetzt den alten Endlosflug durch eine Kampagne für zwei Online-Spieler. Vor Freigabe fehlen noch die Prüfung über den öffentlichen Vermittlungsdienst und auf zwei tatsächlichen Zielgeräten. Headless-Tests belegen keine Handy-Bildrate.

## Spielumfang
Drei deterministische Strecken (90, 95 und 100 Sekunden), zwei getrennt gesteuerte Gleiter, Energieringe und gemeinsame Punkte, Dash mit Nachladezeit, drei Schildpunkte je Pilot, Rettung des Partners aus der Nähe innerhalb einer 20-Sekunden-Frist. Beide bestätigen Start, Fortsetzung und Levelwechsel. Eine Niederlage lässt das aktuelle Kapitel neu starten; nach dem dritten Leuchtfeuer erscheint der Kampagnenabschluss. Rekorde, Medaillen, freigeschaltete Kapitel und Einstellungen werden lokal gespeichert. Training mit ausdrücklich benanntem Autopilot speichert keinen Kampagnenfortschritt.

Der Flugraum ist nach Besitzerwunsch verbreitert: 18 statt 14 Einheiten steuerbare Breite, breiteres Sichtfeld und weiter auseinanderliegende Felswände. Die Hindernisse decken auch die äusseren Fluglinien ab; blosses Stehenbleiben am Rand umgeht die Strecke nicht.

## Darstellung und Ton
Neues Hauptmotiv, detaillierter Gleiter aus eigener Geometrie, gekachelte Basalttextur, instanzierte Felsformationen, Wasser- und Himmelshader, Triebwerksflammen, Lichtspuren, Ring-/Trefferpartikel, Wetterwechsel und animierte Leuchtfeuer. Musik und Effekte werden prozedural mit Web Audio erzeugt und starten erst nach Bedienung. Lautstärken, Grafikstufe und reduzierte Bewegung sind einstellbar. Menü nutzt das Hauptmotiv statt unnötig die verdeckte 3D-Welt zu rendern.

Die zwei neuen Bildmotive wurden mit OpenAIs Bildwerkzeug erstellt, nicht mit Higgsfield. Die Originaldateien bleiben unter /workspace/generated_images; die optimierten WebP-Dateien liegen unter assets/neon-flug. Higgsfield- und Drive-Kontozugriff waren in dieser Aufgabe nicht verfügbar. Keine externen Videoaufträge ausgelöst.

## Technik und Grenzen
Die Simulation läuft autoritativ beim Gastgeber. Gäste senden ausschliesslich begrenzte Steuereingaben und Bereitschafts-/Pause-Nachrichten. Snapshots prüfen Protokollversion, Spielzustände und Zahlen. Das vorhandene js/mp.js liefert PeerJS/WebRTC, Raumcode und Wiederverbindungsversuche; es wurde nicht global verändert. Die Verbindung benötigt öffentliche Vermittlungs-/Relay-Dienste. Ausfall, Netzunterbrechung, fehlende Eingaben oder Tab-Wechsel pausieren den gemeinsamen Flug; eine endgültig geschlossene Verbindung verlangt einen neuen Raum. Kein versprochenes nahtloses Wiederbeitreten nach geschlossenem Tab.

_headers passt nur Neon-Flug und seinen Wildnis-Elternpfad an, jeweils für URLs mit und ohne .html: eigenes Framing und nötige Verbindungsziele. Die Regeln der übrigen Website bleiben unverändert. Notwendige blob-Verbindungen der Wildnis werden gezielt zugelassen. Die neue Flugdarstellung benötigt keine externen GLB-Modelle.

Öffentlicher Verbindungstest: Die Cloud-Browserumgebung meldete beim WebSocket-Aufbau zu den Vermittlungsdiensten ERR_CERT_AUTHORITY_INVALID. Die automatische Freigabeprüfung lehnte das Ergänzen einer zusätzlichen dauerhaft vertrauenswürdigen Proxy-CA ab. Der Zertifikatsspeicher blieb unverändert; keine TLS-Prüfung abgeschaltet. Deshalb ist die öffentliche Online-Verbindung noch nicht nachgewiesen. Lokale Gegenprobe nutzt echtes WebRTC mit BroadcastChannel-Signaling, keinen simulierten Nachrichtenbus.

## Lokal starten und prüfen
Im Repository-Root:

    node spiele-dev/neon-flug/server.cjs

Dann http://localhost:8099/neon-flug öffnen. Für die lokale Zweibrowser-Gegenprobe beide Seiten mit ?mp=local&debug=1 öffnen. Für den normalen Online-Weg mp=local weglassen.

    node --test spiele-dev/neon-flug/core.test.mjs
    node spiele-dev/neon-flug/browser-test.cjs

Browserprüfung benötigt Playwright und Chromium. PLAYWRIGHT_MODULE kann auf eine bereits installierte Playwright-Bibliothek zeigen, PLAYWRIGHT_BROWSERS_PATH auf deren Browser, NEON_TEST_URL auf einen anderen lokalen Vorschau-Port und NEON_REPORT_DIR auf den Ausgabeordner. Der Test erstellt nur eigene lokale Räume. debug=1 aktiviert den Testzugriff; der beschleunigte Kampagnendurchlauf belegt Zustands-/Netzwerkübergänge, keinen manuellen Durchlauf oder Schwierigkeitsnachweis.

Geprüft: Simulation bei unterschiedlichen Bildraten, Treffer-Unverwundbarkeit, Dash, Rettungsnähe/-dauer, Niederlage, Rettungsfrist, Pause, ungültige Eingaben, Snapshots, drei Abschlüsse und Rand-Hindernisse. Zusätzlich Zwei-Browser-Ablauf, Touch-Bedienung, Drehhinweis, gespeicherte Einstellungen und axe-Menüprüfung. Aktuelle Ergebnisse und Screenshots im Übergabepaket.

Die vollständige lokale CI-Simulation konnte ihre Plandatei im schreibgeschützten HOME nicht anlegen. Deshalb nicht als bestanden melden. HTML-Validierung, Syntax, gezielte Tests und GitHub-Prüfungen getrennt bewerten. Vor Veröffentlichung reale Zweigeräte-Verbindung, Leistung, hörbare Mischung und Spielbalance prüfen.

## Quellen
- Three.js r128: bestehende lokale MIT-Bibliothek unter js/vendor/three.min.js.
- PeerJS: bestehende lokale MIT-Bibliothek unter js/vendor/peerjs.min.js; Transportadapter js/mp.js unverändert.
- Eigene Spiellogik, Geometrie und synthetisierte Klänge.
- KI-Motive: exec-b792d747-5d31-40f5-beb4-ac1007b11590.png (Hauptmotiv) und exec-a9daf47b-b2e7-4912-852d-54df81a97c41.png (Basalt).
