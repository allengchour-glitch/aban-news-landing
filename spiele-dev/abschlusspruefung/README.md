# Abschlussprüfung und Veröffentlichungsstand

GEMESSEN am 15./16.11.2026: erneute Prüfung der Spiele-Änderungen. Der Besitzer hat anschliessend die Veröffentlichung dieses Spiele-Stands freigegeben. Die Bereitstellung ist jetzt separat bestätigt: Produktionscommit218c7e4d987106ce55c7cba34b87ce515970a96e, erfolgreicher Deploy43777503558,51 öffentliche HTTPS-Antworten geprüft. [Produktionsmessung](messungen/produktion.json) enthält Datei-Hashes, Header und die einzeln dokumentierte Build-Attribut-Ergänzung in Wildnis.

## Bestanden

- Flugkampagne ohne Vorspulen:90,95 und100 Sekunden echte Spielzeit, zwei echte lokale WebRTC-Seiten. Beide Piloten erreichten jedes Ziel mit drei Schilden; Punkte stimmten überein. Keine JS-Fehler, kein Abbruch und keine Pause. Geskriptete Lenkeingaben; kein manueller Durchspiel- oder Internetnachweis. [Messung](messungen/echtzeit-koop.json).
- Flug:51 Unit-/Geometrieprüfungen sowie erneute UI-, Renderer-, Such-/Ausrüstungs-, Gameplay- und Bildkontinuitätsproben bestanden.
- Minispiele60, Wortspiele642, Action74 und Traumhaus23 Interaktions- plus7 lokale Koop-Bedingungen bestanden. [Gruppenbericht](regression.md) mit Quellen-Hashes und vollständigen Grenzen.
- Audio36 Bedingungen bestanden. Zwei bestätigte Fehler korrigiert: Lautstärke0 erzeugt kein Restsignal mehr; Dash/Fortsetzen weckt stummgeschaltete Töne nicht wieder auf.30-Sekunden-Mischung bei maximalen Reglern ohne abgeschnittene Samples. Keine Hör- oder Hardwareprüfung. [Audiobericht](audio.md).
- Querformat-Einstieg bei844×390/DPR3 repariert: Die Fusszeile überdeckte vorher den Trainingsknopf. Fusszeile und Pilotknopf folgen jetzt dem Inhaltsfluss. Echte Bedienung führt ins Training.
- Mobil-Emulation: Standard rund52,7rAF/s bei1055×488 Renderfläche. Im sparsamen Modus mit4-fach gedrosselter CPU wurde die wiederholte Fels-Texturzeichnung entfernt; gemessen12,9→59,6rAF/s bei675×312. Die normale Darstellung behält ihre Welttexturen. Uhr, gehaltene Touch-Lenkung und Pause bestehen. Kurze Cloud-Emulation, keine echten Handy-FPS. [Vorher](messungen/mobil-lastprobe-vorher.json), [Nachher](messungen/mobil-lastprobe-nachher.json).

## Weiterhin offen

**Keine vollständige grüne Gesamtabnahme.** Park erreicht im vollständigen Software-Browserlauf die120-Sekunden-Frist. Der isolierte mobile Pause-/Weiter-Test besteht. Die bestätigten Eingabe-/Pausekorrekturen bleiben bestehen; Hardware-Leistung und die restliche vollständige Park-Abnahme sind offen.

Die öffentliche Koop-Verbindung wurde mit zwei eigenen Clients erneut versucht. Der Browser blockiert beide Vermittler mit `ERR_CERT_AUTHORITY_INVALID`; normale TLS-Prüfung bleibt aktiv. Ein normaler HTTPS-Abruf des Standardvermittlers erhielt200, der alternative Vermittler503. Das beweist keine öffentliche Browser-WebRTC-Verbindung. Kein zusätzlicher CA-Eintrag, kein Abschalten von TLS. [Browsermessung](messungen/oeffentlicher-koop.json).

Echte Mobilgeräte/Safari, NAT-/Mobilfunk-Strecken, subjektive Audiomischung, alle Regelvarianten und Langzeit-Spielstände sind nicht vollständig geprüft. Die Repo-CI-Simulation kann im schreibgeschützten HOME keine Plandatei erzeugen. GitHub-Prüfungen und der tatsächliche Produktions-Deploy sind getrennt zu bewerten.

## Reproduzieren

Vorschau aus dem Repository starten: `PORT=8113 node spiele-dev/neon-flug/server.cjs`. Playwright/Chromium vorausgesetzt; `PLAYWRIGHT_MODULE` und `PLAYWRIGHT_BROWSERS_PATH` unterstützen abweichende Installationen. `NEON_TEST_URL` und `FINAL_REPORT_DIR` sind konfigurierbar.

```sh
node spiele-dev/abschlusspruefung/echtzeit-koop.cjs
node spiele-dev/abschlusspruefung/mobil-lastprobe.cjs
node spiele-dev/abschlusspruefung/oeffentlicher-koop.cjs
```

Der öffentliche Test endet bei nicht erfolgreicher Verbindung mit Exit2 und bleibt als blockiert sichtbar. Gruppen- und Audio-Aufrufe stehen in den jeweiligen Berichten. Hardware-Prüfungen lassen sich durch diese Skripte nicht ersetzen.
