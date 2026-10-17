# LuxeStyle Automation: Korrekturen zur Prüfung

Basis: `c2d7d8cd12b756b66ef2a91a9ff89367b342f085`, 17.10.2026. Kein Live-Posting, keine Lieferantenbestellung und keine Shop-Mutation wurden ausgeführt.

## Geändertes Verhalten

- Metricool: Dry-Run ist Standard. Live erfordert `DRY_RUN=0`, `APPROVE_PUBLISH=1` sowie explizite Token-, User- und Marken-Konfiguration. Der veraltete Marken-Default `6394001` entfällt; der lesbare Account meldet derzeit `6227837`. Die vollständige Plattformkonfiguration bleibt vor dem ersten freigegebenen Beitrag zu prüfen. Bereits existierende Workflows werden nicht reaktiviert.
- Meta-Videos: ebenfalls Dry-Run als Standard. Ein Verarbeitungsfehler verhindert den Publish-Aufruf. Erfolge werden pro Kanal in der zusätzlichen CSV-Spalte `platform_results` gespeichert. Bei IG-Erfolg/FB-Fehler bleibt der Eintrag `partial`; beim nächsten Lauf wird nur der fehlende Kanal versucht. Historische `posted`-Zeilen werden nicht rekonstruiert. Ein Absturz zwischen externem Erfolg und lokalem Speichern bleibt ein manuell abzugleichender Fall; kein Exactly-once-Versprechen.
- Price guard: `DENY` ist kein Preisfehler. Auch `LIVE=1` setzt keine Variante mehr pauschal auf `CONTINUE`. Stattdessen Bericht zur Lieferanten-/Variantenprüfung. Das verhindert unbelegtes Weiterverkaufen, behebt aber nicht automatisch einen falschen Lagerbestand.
- Shopify-GraphQL: HTTP 401/403/404 und erfolgreiche HTTP-Antworten ohne Daten werden als Fehler gemeldet. Eine leere `errors`-Liste blockiert echte Daten nicht. Bestehende Wiederholungen für Drosselung und 5xx bleiben bestehen.
- CJ-Reviews: Auch beim Kommentar-Endpunkt werden Quota-, HTTP-, Fach- und JSON-Fehler von echten leeren Listen getrennt. Solche Fehler erzeugen keinen Leer-Ledger-Eintrag. Der Scan hat einen separaten `SCAN`-Deckel (maximal 5000, standardmässig LIMIT × 5) und nennt Teilmessungen. Abgelaufene Leer-Einträge können erneuert werden. Der Import nutzt den bestehenden Shopify-Retry-Helfer. Fehlende Namen werden nicht als «verifizierter Käufer» bezeichnet. Der Ausgangsfilter nach Mindestbewertung wurde nicht verändert; vor neuen Importen Quelle, Zuordnung und Darstellung prüfen.
- Alter CJ-Anreicherer: Token-Anfrage verwendet das im Projekt dokumentierte Feld `password`; Fehler liefern Exit-Code 1. Seine alte Playwright-Abhängigkeit bleibt bestehen und wurde hier nicht installiert oder live ausgeführt.
- Price-/Publish-Guard und Scheduler melden erkannte Laufzeit-/Teilfehler mit Exit-Code 1 statt fälschlichem Erfolg.

## Prüfung

13 neue Verhaltenstests mit ausschliesslich simulierten APIs: vier CJ-Antworttests und neun Prozess-/Publikationstests. Dazu bestehende Tests für Shopify-Retry, Secret-Normalisierung und Kanal-Sperren. Die neue manuelle/PR-Test-Action benötigt keine Zugangsdaten, installiert keine npm-Pakete und veröffentlicht nichts.

Ausführung:

```sh
node automation/lib/cj_response_test.mjs
node automation/review_safety_test.mjs
node automation/lib/shopify_gql_test.mjs
node automation/lib/shopify_secret_test.mjs
node automation/lib/kanal_sperren_test.mjs
```

## Aktuelle Daten und Grenzen

Shopify meldet für 17.09.–16.10.2026 acht Bestellungen und CHF 356.68 `total_sales`; diese Kennzahl ist kein Gewinn und kein Beleg für acht bezahlte, nicht retournierte Aufträge. Klaviyo enthält im abgefragten Ereigniszeitraum ebenfalls acht `Placed Order`-Ereignisse, also keinen vollständigen Bestell-Sync-Ausfall. Eine Eins-zu-eins-Abstimmung fehlt noch. Die Versanddomain-Liste ist leer.

Eine Stichprobe von zwölf aktiven CJ-Produkten zeigt zwei `Shopping_ads`-Ausschlüsse. Das ist keine Katalogquote und belegt keinen Ausschluss aus `FREE_LISTINGS`. Die Merchant-Statusabfrage ist wegen negativer Zähler nicht als belastbare Bestandsmessung verwendbar. Kein Feed-Metafeld wurde geändert.

Die drei vorbereiteten Taschenprodukte sind aktiv, besitzen Onlineshop-URLs und nicht getrackte Varianten mit `CONTINUE`. Bestand 0 allein belegt hier keine Nichtverfügbarkeit. Tatsächlicher CJ-Bestand und Lieferbarkeit bleiben ungeprüft, weil dieser Arbeitsumgebung keine CJ-Laufzeit-Credentials bereitstehen.

Der aktuelle Cloudflare-Hauptseiten-Deploy wurde im GitHub-Lauf vom 17.10.2026 um 11:36 UTC erfolgreich abgeschlossen. Daraus folgt kein Nachweis über den Hetzner-Poller. Netzwerkzugriffe aus dem lokalen Executor, Bild-/Checkout-Prüfung, neue MP4-Produktion und serverseitige Installation bleiben blockiert. Kein neuer Server und kein Abo wurden bestellt.

Die Freigabe aus dem aktuellen Chat gilt weiter: Vorbereitung und Code-Review, keine Aktivierung von Verkaufsaktionen oder Veröffentlichung.
