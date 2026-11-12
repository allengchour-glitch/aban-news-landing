# Indexierungslinks und 404-Stichprobe – 12.11.2026, R187

Nach dem Hinweis des Besitzers auf acht bereits indexierte URLs wurden 18 alternative URLs gezielt mit der Search Console geprüft. Genau acht davon meldet Google als derzeit nicht indexiert oder unbekannt. Alle acht sind frisch HTTP 200 mit Self-Canonical und ohne robots-Meta im ersten Dokumentkopf geprüft. Das ist keine Indexierungszusage und es wurde keine Indexierung beantragt.

| URL | Gespeicherter Google-Status |
|---|---|
| https://luxestyle.ch/collections/hundewelt | Gefunden – zurzeit nicht indexiert |
| https://luxestyle.ch/collections/tier-futterautomaten | Gefunden – zurzeit nicht indexiert |
| https://luxestyle.ch/collections/camping-geschirr-kochsets | URL ist Google nicht bekannt |
| https://luxestyle.ch/collections/selbst-gestalten-1 | Gecrawlt – zurzeit nicht indexiert |
| https://luxestyle.ch/pages/alle-kategorien | Gefunden – zurzeit nicht indexiert |
| https://luxestyle.ch/products/schirm-aufsatz-fur-reithelm-600000 | URL ist Google nicht bekannt |
| https://luxestyle.ch/products/ventileinsatz-werkzeug-tubeless-reifen-832000 | URL ist Google nicht bekannt |
| https://luxestyle.ch/products/elegante-taille-verjungung-rock-fur-frauen-609600 | Gecrawlt – zurzeit nicht indexiert |

Der anschliessende Besitzer-Screenshot zeigt bei der 404-Validierung 14’469 ausstehende URLs, 0 fehlgeschlagene und Startdatum 12.11.2026. Das sind URL-Prüffälle, keine belegten 14’469 unterschiedlichen Produkte. Die noch laufende Prüfung beweist keine Behebung.

Die sechs vollständig sichtbaren Beispiele wurden einzeln mit Google und öffentlich gegengeprüft. Alle sechs melden bei Google «Nicht gefunden (404)»; ein zusätzlicher direkter GET ohne Redirect-Follow bestätigt aktuell jeweils HTTP 404 und keinen Location-Header. Fünf gerenderte Firecrawl-Abrufe endeten dagegen auf der Startseite. Diese Browseransicht ist kein serverseitiger 301-Beleg; der genaue Mechanismus wurde nicht ermittelt. Der erste direkte Body-Read scheiterte mit IncompleteRead, danach wurde die Gegenprobe auf GET-Antwortheader begrenzt.

Für keine der sechs URLs wurde lokal ein genauer datierter Lösch-, Umbenennungs- oder Redirect-Beleg gefunden. Nächster sinnvoller Schritt: die sechs alten Handles gezielt aktuellen Shopify-Produkten und eventuellen Nachfolgern zuordnen. Nur bei sachlich passender Nachfolgeseite eine konkrete 301 als Freigabeentwurf vorbereiten. Bewusst entfernte Produkte ohne passenden Ersatz dürfen 404/410 bleiben; aktive interne Links und Sitemap-Einträge dann gesondert prüfen. Keine pauschalen Startseiten-Weiterleitungen und keine Indexierungsanfragen für 404-Adressen. Aus sechs Fällen lässt sich keine Katalogquote oder Ursache ableiten.

Alle Abfragen waren read-only: 24 gezielte URL-Inspektionen (18 Ersatzkandidaten plus 6 Screenshotfälle), keine Performance-/Umsatzberichte, kein Katalogscan, keine Shop-, Redirect-, Sitemap-, Flow-, DNS-, Budget- oder Publikationsänderung. Verifizierte Property https://luxestyle.ch/; andere Marken blieben unberührt. [Vollständiger Beleg](INDEXIERUNG-UND-404-20261112-R187.json). Claude-Kenntnisnahme dieses neuen Befunds bleibt unbekannt.
