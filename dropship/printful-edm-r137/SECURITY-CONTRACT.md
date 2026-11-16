# Sicherheits- und Integrationsvertrag

Dieses lokale Paket führt selbst keinen Netzwerkaufruf durch. `transport` und `tokenProvider` müssen serverseitig bewusst eingebunden werden; ohne bestätigten EDM-Zugang scheitert die Factory geschlossen.

Die technische Gegenprobe vom 05.11.2026 ist massgebend: Der aktuelle Store-Token besitzt keine `product_templates`-Scopes und `POST /embedded-designer/nonces` antwortete HTTP 403. **EDM-Zugang, Account-Token, Extension und Domainbindung sind nicht bestätigt.** `edmAccessConfirmed` darf erst nach einer erfolgreichen aktuellen Nonce-Gegenprobe gesetzt werden.

## Verbindliche Host-Anforderungen

1. **Servergrenze:** `server/` nie in Theme-Assets, Browser-Bundles, Liquid, öffentliche JSON-Dateien oder Source Maps aufnehmen. Den privaten Printful-Token nur aus bestehendem legitimen Server-Secret-Store lesen. Keine Zugangsdaten im Chat, in URLs oder Protokollen.
2. **Sitzung und CSRF:** Session vor jedem Aufruf authentifizieren. `subjectId` muss aus der serverseitig verifizierten Sitzung kommen. Der API-Client darf sie nicht frei wählen. Exakte Origin-Prüfung und CSRF-Prüfung kombinieren; Origin allein beweist keine Autorisierung. Rate-Limit pro Sitzung und Quelle vor `createDraft` und `openDraft` setzen. Keine öffentliche Nonce-Factory.
3. **Eigene Herkunft:** Explizit `https://luxestyle.ch` freischalten; `https://www.luxestyle.ch` nur bei tatsächlich genutzter/verifizierter Herkunft. Keine Wildcards oder beliebigen URLs. Zulassung zusätzlich bei Printful prüfen. Weitere Vorschauherkünfte erfordern eine eigene Prüfung und explizite Code-/Konfigurationsänderung.
4. **Katalog:** Produktstatus, Handle und ausgewählte Shopify-Variant-GID exakt auf Printful-Produkt, Printful-Variante, Technik und Platzierung abbilden. Die Varianten-ID muss aktuell als Variante dieses Printful-Modells belegt sein. Kein Handle-Fallback bei Mehrmodell-Produkten. `DRAFT`, unbekannte Variante, unvollständige Zuordnung und Nicht-Printful-Fulfilment bleiben gesperrt. Die aktuelle Allowlist lässt konservativ nur `default` zu; weitere Flächen benötigen eine technikspezifische positive Zuordnung. Keine aus Screenshots abgeleiteten Techniken, Druckmasken, Stoffe oder Auswahlkombinationen.
5. **Geheimnisse:** Token nur am festen `https://api.printful.com/embedded-designer/nonces`-Aufruf einsetzen. Transport darf Header, Request-/Response-Inhalt und rohe Exceptions nicht loggen. Der Dienst protokolliert nichts und verwirft rohe Transportfehler. Betriebstelemetrie darf nur eigene redigierte Fehlercodes und notwendige Zustandsbelege erfassen. Auch Nonces sind kurzlebige Zugangsdaten: kein Analytics, Cache, Local Storage oder URL-Parameter.
6. **HTTP-Antwort:** Nur den expliziten Client-Payload zurückgeben, `Cache-Control: no-store` setzen; keine private-token-/upstream-Felder ergänzen. JSON- und API-Grenzen im Host begrenzen. Keine Browseraufrufe direkt an das Printful-API einbauen.
7. **Atomar und dauerhaft:** Produktionsspeicher muss `create` eindeutig sowie `transition` atomar ausführen und den Checkpoint vor dem Request dauerhaft schreiben. Zustand `inflight` nach Prozessabbruch ist unbekannt, nicht wieder versendbar. Der Memory-Store genügt nicht bei Neustarts, mehreren Prozessen oder mehreren Servern.
8. **Kein automatischer Retry:** Netzwerkfehler, ungültige/unerwartete Nonce-Antwort oder HTTP-Fehler bleiben `unknown`. Fehler wegen 401/429/5xx bedeuten nicht «leere Daten». Bei unklarem Ausgang gezielt prüfen, keinen Ersatzentwurf als automatischen Retry anlegen.
9. **Designbesitz:** Entwurfs-ID ist serverseitig zufällig, pro Gestaltung eindeutig, an Sitzung und Herkunft gebunden. Sie darf nicht nur die Shopify-Produkt-ID sein. Fremde Session hat keinen Zugriff. Für erneutes Bearbeiten muss Besitz erhalten und die Vorlagenidentität überprüft werden.
10. **Speichern ist kein Kaufbeleg:** Client-Callback meldet nur eine beanspruchte `templateId`. Server muss diese bei Printful gegenprüfen und Produkt, Varianten, gültige Gestaltung sowie Bestellfähigkeit separat prüfen. `checkoutReady` bleibt hier ausdrücklich false. Kein Bestell-/Zahlungs-/Fulfilment-Endpoint gehört zu diesem Paket.
11. **Sicherer UI-Host:** SDK nur vom dokumentierten offiziellen CDN laden. CSP für tatsächlich benötigte offizielle Frames/Assets anhand der realen Integration prüfen, keine pauschalen Wildcards. Texte/Fehler nie als HTML injizieren. Fokus, Tastaturbedienung, Mobilansicht und Schliessen mit Entwurfswarnung prüfen. Keine iframe-internen Sicherheitsschranken umgehen.
12. **Aktualität vor Sitzung:** Vor jeder Live-Sitzung Shopify-Produktstatus, gewählte Variante, Preis in CHF und Kaufbarkeit frisch lesen. Das versionierte Manifest ist eine positive technische Zuordnung, kein dauerhafter Verfügbarkeits- oder Preisbeleg.

## Zustände

`reserved` → `inflight` → `open` → `save-reported`

Nach dem Request ist ein unbestätigter Ausgang `unknown`. Kein Zustand ausser `reserved` löst nochmals einen Nonce-POST aus. `save-reported` bezeichnet weder eine serverseitig verifizierte Vorlage noch Kaufbarkeit. Das Paket stellt bewusst keine Löschung, keinen Reset und keinen automatischen Wiederanlauf bereit.

## Freigabestatus

Die lokale Entwicklung und die Offline-Prüfung sind ausgeführt. Der aktuelle technische Befund ist **blockiert (HTTP 403)**. Produktionsbetrieb, Preise, Sortimentserweiterung, Fulfilment und Veröffentlichung sind durch diese lokale Entwicklung nicht nachgewiesen. Ein legitimer Account-Token mit `embedded_designer`-/`product_templates`-Berechtigung und die bei Printful erlaubte Domain müssen vor jeder Aktivierung erfolgreich gegengeprüft werden. Die Zugangsdaten dürfen nicht im Chat oder Repository bereitgestellt werden.
