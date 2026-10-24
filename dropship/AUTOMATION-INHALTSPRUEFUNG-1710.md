# LuxeStyle: Eingaben prüfen, bevor Inhalte ausgespielt werden

Die bisherige Queue konnte ungeschlossene CSV-Felder, doppelte IDs, falsch geschriebene Zielkanäle oder veraltete Termine bis zum API-Aufruf durchlassen. Metricool und der direkte Meta-Poster lesen jetzt dieselbe strikte Queue-Bibliothek. Strukturfehler und ungültige aktive Zeilen stoppen vor dem ersten Request, auch hinter MAX_PER_RUN. Alte hold-Zeilen werden nicht veröffentlicht und inhaltlich nicht neu bewertet.

Geprüft werden eindeutige IDs und Header, Feldanzahl, vollständiger Text, exakte unterstützte Kanäle, HTTPS-Medienadressen ohne Zugangsdaten sowie echte Kalenderdaten und IANA-Zeitzonen. Vergangene Metricool-Termine, nicht existierende oder mehrdeutige Zeiten bei der Zeitumstellung werden abgelehnt. Meta verwendet den Zürcher Kalendertag. MAX_PER_RUN=0 pausiert tatsächlich. Ein ausdrücklich angeforderter, deaktivierter Threads-Kanal wird nicht still ausgelassen. Nach einer langen Mediennormalisierung wird der Termin direkt vor dem POST nochmals geprüft. URL-Syntax ist kein Nachweis für Erreichbarkeit, Filmqualität oder Produktidentität.

Shopify-Zugangsdaten werden erst nach Prüfung einer echten einzelnen myshopify.com-Shopdomain angefügt. Ähnlich benannte Fremddomains, eingebettete Zugangsdaten und zusätzliche Pfade werden abgewiesen. GraphQL und die hier angepassten Token-Grants folgen keinen Redirects und haben ein Zeitlimit. Die bisherigen Retryprüfungen bleiben erhalten.

Der Publikationswächter benötigt LIVE=1 und APPROVE_PUBLISH=1. Er schreibt nur für ACTIVE-Produkte mit vollständigen Tags und Kanalzuordnungen. DRAFT/ARCHIVED werden auch bei angepasstem PQUERY nicht veröffentlicht. Teilfehler, userErrors und fehlende Antwortdaten erzeugen einen Fehlerstatus statt eines falschen erfolgreichen Laufs. Bestätigte Teilerfolge werden separat gezählt. Eine blosse Lücke im Kanalbestand ist weiterhin keine Inhaberfreigabe.

Die CJ-Anreicherung verwendet natives Node-fetch statt einer fest eingebauten Playwright-Installation. TLS-Prüfung bleibt aktiv. CJ-API-/Quota-Fehler und unvollständige Ergebnisse erzeugen keine falsche erfolgreiche Kandidatenliste. Das Ergebnis enthält einzelne VID/SKU/Variantenmerkmale und originale Inventardaten; ein Produkt wird bei mehreren Suchtreffern nur einmal aufgenommen. Die bestehenden Suchbegriffe wurden nicht als neue Produktempfehlungen umgedeutet. Die tatsächliche CJ-Verbindung konnte hier mangels Runtime-Zugang nicht live geprüft werden.

## Inhaltsprüfung ohne Veröffentlichung

`automation/content_preflight.py` prüft eine JSON-Reviewqueue offline. Bildentwürfe benötigen kein MP4 und keinen Musiknachweis; Videoentwürfe benötigen einen geprüften vertikalen MP4-Master. Kaufbarkeit, Lieferfähigkeit und Tags brauchen frische Zeitstempel, die Lieferantenzuordnung höchstens sieben Tage alte Nachweise. Ein finales Inhalts- und Medienhash macht spätere Änderungen erkennbar. Fehlende Freigabe bleibt getrennt von technischen Blockern; publishing_enabled bleibt immer false. Das Werkzeug ist nicht automatisch mit den CSV-Publishern verbunden.

```sh
python3 automation/content_preflight.py /pfad/review-queue.json --output /pfad/pruefbericht.json
python3 automation/content_preflight.py /pfad/review-queue.json --strict
```

Der Report darf weder die Queue noch referenzierte lokale Originalmedien überschreiben. Im bestehenden Paket bleiben alle 18 Videoentwürfe wegen fehlender Nachweise/Medien blockiert. Es wurden keine Flags künstlich auf wahr gesetzt.

## Validierung

Nach der Portierung auf den Stand vom 24.10.2026 hier nachgemessen: die vier neuen Node-Dateien (`shopify_host_test`, `social_queue_test`, `publish_guard_test`, `cj_enrich_test`) ergeben **77 Tests, 77 bestanden**, die Inhaltsprüfung **16 Python-Tests, alle bestanden**; dazu bestehen die 15 bisherigen API-, Secret-, Kanalsperr- und Regressionsprüfungen. Die Zahlen „136 / 19" aus der ersten Fassung liessen sich nicht nachmessen und sind ersetzt. Neue Workflow-Imports sind im Sparse-Checkout enthalten. YAML und Bash der vier betroffenen Workflows geprüft. Tests benutzen Fake-APIs und simulierte Medienprüfungen; sie ersetzen keine Live-Endabnahme.

Separat wurden zwei neue Klaviyo-CODE-Vorlagen zur Prüfung angelegt: U5qvBK und Vac6ad. Sechs native Renderfälle mit synthetischen Checkoutdaten bestanden. Der bestehende Checkout-Flow bleibt unverändert und draft; keine E-Mails verschickt. Produktprüfungen zeigen weiterhin Varianten-/Massenlücken bei Canvas, Rucksack und Handytasche. Der Shopentwurf bleibt unveröffentlicht, Versanddomain pending und der neue Profifilm benötigt echte passende Aufnahmen.
