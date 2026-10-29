# Hängematte: Prüfkontext ergänzt, Google-Zugriffsgrenze belegt

29.10.2026. Fortsetzung der Aufgabe `schema-hammock-15450856292737`; kein Theme-Write, keine SKU-Änderung, kein Google-Indexierungsauftrag.

## Tatsächlicher Fortschritt

Der achtzeilige SKU-Patch bleibt unverändert. Die frisch gelesene MAIN-Section `sections/product-information.liquid` ist bytegleich zur bisherigen Vorher-Datei (MD5 `e4ba950be4a05c5d6dd6f6ebf5d8a0a9`). Das aktive Theme ist weiterhin `212656488839`. Die Dateigegenprobe umfasst die tatsächlichen API-Inhalte, ohne nachträglich ergänzte Schlusszeilen.

Der bisherige isolierte Validator konnte globale Einstellungen nicht lesen. Jetzt liegen die echte `config/settings_schema.json` und sieben gezielt nachgelesene direkte Abhängigkeiten vor: zwei Produktblöcke, drei Snippets und zwei Sprachdateien. Alle neun Quelldateien sind anhand ihrer Bytes und MD5-/SHA-256-Werte belegt. Es gab keine vollständige Theme-Pagination und keine Installation.

Vorher und Nachher bestehen die statische Shopify-Prüfung der geänderten Section im echten begrenzten Dateikontext, jeweils Exit 0. Die Warnung über die fehlenden globalen Einstellungen und die anfänglich fehlenden direkten Dateien sind behoben. Der vollständige Theme-Kontext und eine native Shopify-Liquid-Ausführung wurden damit nicht geprüft. Der automatische Download der aktuellen Linter-Regeln schlug fehl; der Validator verwendete seinen vorhandenen lokalen Regelcache. Dessen Hashes und Datierungen stehen im Beleg.

Die bereits vorher bestätigte Referenztransformation (24 ausgelassene ungültige SKU-Eigenschaften, 33 erhaltene Varianten/Offers und neun unveränderte gültige SKU-Eigenschaften) wurde in diesem Schritt nicht als neuer Testumfang ausgegeben. Der lokale Patch ist weiterhin ein Entwurf, keine ausgelieferte Seite.

## Google Rich Results: konkret versucht, kein Ergebnis

Der öffentliche [Rich Results Test](https://search.google.com/test/rich-results) liess sich im CODE-Modus öffnen. Ein isolierter HTML-Prüfentwurf mit den vorhandenen öffentlichen Organization-/Breadcrumb-Daten und dem vorgeschlagenen ProductGroup wurde in den Editor gesetzt. Der genaue Inhalt wurde im Browser mit 23’630 UTF-8-Bytes und SHA-256 `a423f393f80f0386a9b36784bd8bb7ab124e9f216db3eade94863d94fbb72294` bestätigt.

Nach genau einem Klick auf TEST CODE meldete Google: «Something went wrong / Log in and try again». Es entstand keine Ergebnis-URL. Die Browserseite zeigte daneben einen reCAPTCHA-Rahmen; eine genauere Ursache als die angezeigte Anmeldeanforderung wurde nicht behauptet. Keine Anmeldung, kein Umgehen, kein zweiter Testversuch. Die Sitzung wurde geschlossen. Anzahl gültiger/ungültiger Rich Results bleibt unbekannt, nicht Null.

## Verbleibende Abnahme

Google verbietet Leerraum in `sku`, fordert für Varianten jedoch auch eindeutige IDs und nennt `sku`/`gtin` als Beispiele. Die bestehenden `@id` bleiben eindeutig. Dass Google diese nach dem Weglassen der 24 ungültigen `sku` akzeptiert, ist weiterhin unbestätigt. Keine Ersatz-SKU, GTIN oder Produktaussage wurde erfunden.

Vor produktiver Übernahme: den aktuellen Themehash erneut vergleichen, den Patch im zulässigen Shopify-Prüfkontext nativ rendern und die tatsächlich gerenderte Ausgabe in einer legitim angemeldeten Google-Prüfsitzung validieren. Der vorbereitete Code-Test ersetzt keine native Ausgabe und bestätigt weder Indexierung noch Sichtbarkeitsgewinn.

Belege: [gesammelte Validierungsbelege](HAENGEMATTE-VALIDIERUNG-BELEGE-20261029.json), `VALIDATOR-CONTEXT-before.json`, `VALIDATOR-CONTEXT-after.json` und `RRT-ATTEMPT.json`. Die vollständigen neun lokalen Kontextdateien sind in `before/` und `after/` abgelegt; beide Ordner unterscheiden sich ausschliesslich in den acht vorbereiteten SKU-Zeilen.
