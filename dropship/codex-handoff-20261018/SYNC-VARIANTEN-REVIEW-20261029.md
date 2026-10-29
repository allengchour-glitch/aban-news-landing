# Unabhängige lokale Prüfung: Printful-Sync und CJ-Varianten

Stand: 29.10.2026. Basis der Patch-Eigentümer: main `a74459a94a800b24d4b348332154d25f516920b8`.

Ergebnis: Im engen Korrekturumfang keine verbleibende blockierende Regression gefunden. Beide Korrekturen sind lokal geprüft. Das ist keine Produktionsfreigabe, kein Deployment und kein Nachweis einer Merchant-/Search-Console-Fehlerbehebung.

## Eigenständig ausgeführte Prüfungen

Runtime: Node v24.19.0; kein Node-22-Lauf behauptet. Die Verhaltenstests wurden vorher gelesen: synthetische Antworten ersetzen fetch, keine echten Bestellungen oder Netzwerk-Mutationen. Eigene Gegenproben verweigern jeden unerwarteten Netzwerkaufruf. Keine eigentlichen Sync-Hauptprogramme mit Laufzeit-Credentials gestartet.

| Prüfung | Vorher | Nachher / Ergebnis |
|---|---|---|
| Printful Verhaltenstests mit neuen Regressionen | 24 erfolgreich, 8 fehlgeschlagen | 32 erfolgreich, 0 fehlgeschlagen |
| Printful eigene Gegenprobe: gültige erste Position, SKU-Konflikt zuletzt | Ein bestätigter synthetischer POST mit Varianten 4025 und 4026 | Kein POST; Review-Tag angefordert; ein zulässiger Varianten-Read der ersten Position |
| Printful eigene Gegenprobe: aktuelles variant-Objekt gelöscht, historische SKU gültig | Nicht zusätzlich geprüft | Historische Variante 4025 unverändert verwendet |
| CJ neue Verhaltenstests | Nicht als ganze Suite auf Altcode ausgeführt | 119 erfolgreich, 0 fehlgeschlagen |
| CJ eigene Gegenprobe: unitCost unbekannt | `ok=true`, Einheitspreis 19.90 mit `kostenChf=null` | `ok=false`, keine Preis-Ersatzangabe |
| CJ eigene Gegenprobe: productSet liefert Produkt, aber keine userErrors-Liste | Nicht zusätzlich geprüft | Schreibstatus unbekannt; beide SKU reserviert; zweiter Aufruf sendet keine weitere Mutation |
| Syntax | – | Beide geänderten Hauptmodule geprüft |

Eigene Dateien: `printful-independent.mjs`, `cj-independent.mjs`. Unabhängige Laufprotokolle: `printful-green.log`, `printful-red.log`, `cj-green.log`, `cj-independent.log`. Die vollständigen CJ-Abhängigkeiten liegen im vom Patch-Eigentümer bereitgestellten `cj/validation/runner-snapshot`; die dort ausgeführten geänderten Module wurden gegen `cj/after` geprüft. Der anschliessende Patchabschluss entfernte nur je eine zusätzliche Leerzeile am Dateiende in Runner und Preisbibliothek; dies wurde per Diff und normalisiertem Bytevergleich bestätigt, ohne Verhaltensänderung. Test- und finale Datei-Hashes sind getrennt dokumentiert.

## Konkreter Review-Fund, im lokalen Patch behoben

Der CJ-Runner verwendete zunächst noch `USD_CHF || 0.82435`. Dadurch hätte eine fehlende Kurskonfiguration den historischen Standard übernommen. Nach Review entfernt: fehlende oder leere Kurskonfiguration blockiert die Mehrvarianten-Preisplanung. Zwei neue Regressionen sind in den 119 erfolgreichen Prüfungen enthalten. Der allgemeine Bibliotheksdefault bleibt zur Kompatibilität bestehen; die neuen v2-Pläne und der Mehrvarianten-Writer verlangen einen gespeicherten positiven endlichen Kurs. Die Tests belegen keine wirtschaftliche Aktualität eines manuell gesetzten Wechselkurses.

## Verbleibende Grenzen, nicht durch diese Korrekturen behoben

| Priorität | Bereich | Befund und Grenze |
|---|---|---|
| Hoch, Bestand | Printful-Auftragsidempotenz | Der POST enthält weiterhin keine stabile external_id. Shopify-Tags/Metafeld sind der bestehende Erfolgsmarker; deren GraphQL-/userErrors-Antworten werden in `tagOrder()` nicht geprüft. Eine bestätigte Anbieterbestellung bei fehlgeschlagenem Marker bleibt ein Duplikatsrisiko. Review-Tag wird nur angefordert, nicht als gespeichert bezeichnet. |
| Hoch, Bestand | Printful-Designprüfung | Fehlender oder fehlerhafter Gemini-Dienst kann weiterhin PASS ergeben. Der SKU-Patch macht den gesamten Produktionsprozess nicht freigabefähig. |
| Hoch, separater Bestandspfad | CJ `SKU_NACHZIEHEN` / `schreibeSku()` | Weiter `nodes || []`, keine pageInfo-Gegenprobe, Reservierung erst nach Rückantwort. Unbekannte Suchantwort darf hier weiterhin als frei erscheinen. Dieser Pfad wurde bewusst nicht gehärtet; keine pauschale Aussage über alle CJ-SKU-Schreibwege. |
| Mittel, technische Grenze | CJ Reservierung | Neue Reservierung schützt den Mehrvarianten-Writer innerhalb desselben Prozesses, auch bei Timeout/unbekannter Mutation. Kein dauerhafter, rechner- oder prozessübergreifender Lock. |
| Abgrenzung | Produktangaben und Merchant | Keine echten Preise, Masse, Materialien, Verfügbarkeit oder Lieferzeiten ergänzt; keine Google-Datenquelle repariert und keine betroffenen Artikel neu eingereicht. Die native Quelle muss separat pro Merchant-Artikel belegt werden. |

Die neuen CJ-Wächter binden die Preisbasis vor Filterung an die eindeutige bisherige SKU, verlangen CHF-unitCost, sperren unvollständige/alte Pläne und unvollständige SKU-Suchantworten, prüfen die Preisbasis unmittelbar vor productSet frisch und reservieren vor dem Versand. Aktuelle Produkt-/Varianten-Zuordnung, konkurrierende Läufe und dauerhaft unklare Writes bleiben Voraussetzungen eines späteren Betriebsreviews.

## Prüfsummen

Printful-Patch `sources/printful-sku-identity-review.patch`:
`e6a31e505d14c104d171f6c7111f0cad4cc5f13e3b1b12c9d38b74baaf25379f`

Geprüfte Laufdateien und weitere Patch-Hashes stehen in `BELEGE.json`. Diese Versionen gelten für dieses Review; spätere Änderungen benötigen eine gezielte Gegenprüfung.

CJ-Patch `cj/CJ-VARIANTEN-REVIEW.patch`:
`ad84af1a6e66a3b8ec203dcc20e7d1d5532ec51e1421c631dc533023757e2743`

Keine vollständige Schema-/API-Validierung behauptet: Root meldete für die native Prüfung ausdrücklich `skipped`; keine reale Ausführung.
