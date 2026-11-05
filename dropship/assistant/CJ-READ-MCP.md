# LuxeStyle CJ Read MCP

Stand: 05.11.2026. Der Projekt-MCP `luxestyle-cj-read` stellt genau drei rein lesende Werkzeuge für CJdropshipping bereit. Er ist getrennt vom weiterhin lokalen und offline arbeitenden `luxestyle-assist`.

## Werkzeuge

| Werkzeug | Wirkung |
|---|---|
| `luxe_cj_status` | Prüft ohne Netzwerk, ob `CJ_API_KEY` an den MCP-Prozess gebunden ist. Es werden weder Wert, Länge noch Hash ausgegeben. |
| `luxe_cj_product_read` | Liest genau ein Produkt über `pid` oder `productSku`. Keine Suche, Pagination oder Folgestrategie. |
| `luxe_cj_inventory_read` | Liest nach einem im selben Prozess erfolgreich bestätigten Produkt-Read derselben `pid` genau einen begrenzten Lagerbericht. Länderwerte werden weder addiert noch als Lieferbarkeitsnachweis verwendet. |

Der Leser authentifiziert gemäss der am 05.11.2026 frisch geprüften [offiziellen CJ-Dokumentation](https://developers.cjdropshipping.com/en/api/api2/api/auth.html) mit `POST /authentication/getAccessToken` und dem Body `{ "apiKey": "…" }`. Access- und allfällig gelieferte Refresh-Tokens bleiben ausschliesslich im Prozessspeicher; der Refresh-Token wird nur für die Echo-Sperre behalten. Es gibt keine Token-Datei, keinen Refresh-Aufruf und keine Ausgabe von Schlüssel oder Token.

Danach folgt je Werkzeug höchstens ein fester GET: `/product/query` mit genau einem Identifikator oder `/product/stock/getInventoryByPid?pid=…`. Ein Lagerabruf startet nur, wenn unmittelbar zuvor im selben Prozess und mit derselben Credential-Bindung die identische PID samt vollständiger Variantenliste bestätigt wurde. Schlägt Authentifizierung, Produktabruf oder Variantenprüfung fehl, bleibt der Lagerstatus lokal `unknown`; es gibt keinen zweiten Authentifizierungs- oder Lageraufruf. Antworten sind auf 2 MiB begrenzt, Anfragen auf 15 Sekunden und mindestens 1,1 Sekunden Abstand. Beide Werkzeuge teilen denselben Prozess-Token-Cache und dieselbe serielle Request-Sperre. Es gibt keine Wiederholung. HTTP 401/403/429, Quota, 5xx, Timeout, ungültiges JSON und Identitätsabweichungen bleiben `unknown`; sie werden nie als leeres Produkt oder Nullbestand ausgegeben. Der Lagerendpunkt gilt ausschliesslich bei `success === true` und numerischem `code === 200` als erfolgreich; ein `result`-Feld wird dafür nicht verwendet.

Die Rückgabe enthält nur eine begrenzte Feldliste. Maximal 25 Bild-URLs und 50 Varianten werden ausgegeben; Texte und URLs haben eigene Bytegrenzen. Eine Kürzung ist als `partial` beziehungsweise am Feld als `truncated` markiert. Lieferanten-URLs belegen weder Download, Produktzuordnung im Shopify-Shop noch Bild-, Film-, Bearbeitungs- oder Werberechte. Prime-Status und Rechte bleiben unbekannt.

Der Lagerbericht enthält höchstens 50 Varianten, höchstens 20 Länderzeilen je Variante, höchstens 400 Länderzeilen insgesamt und höchstens 128 KiB. Pro Zeile werden nur `countryCode`, `totalInventory`, `cjInventory`, `factoryInventory` und `verifiedWarehouse` ausgegeben. Nur nichtnegative sichere Ganzzahlen gelten als Zahlen; eine ausdrücklich gelieferte `0` bleibt `0`, fehlende oder ungültige Werte werden `null` und damit unbekannt. `verifiedWarehouse` akzeptiert nur `1` oder `2`. Auch `pointsInfo.total`, `usedToday` und `remaining` werden nur als nichtnegative sichere Ganzzahlen oder `null` übernommen. Doppelte oder verschiedene Länderzeilen werden nicht zusammengezählt. Lagerwerte belegen keine Storefront-Verfügbarkeit, keine Versandzeit und keine Lieferbarkeit in die Schweiz.

Explizit nicht vorhanden sind Katalogsuche, Imports, Bestellungen, Käufe, Sourcing, Render, Shopify-Schreibzugriffe oder andere CJ-Mutationen.

## Sichere Credential-Bindung

`.mcp.json` enthält keine CJ-Zugangsdaten und keine Platzhalter dafür. Der Clientprozess muss `CJ_API_KEY` über seine sichere Laufzeit- oder Secret-Verwaltung erben. Ein GitHub-Actions-Secret wird nicht automatisch an einen lokalen MCP-Prozess weitergereicht.

Keine Schlüssel in Chat, Shellhistorie oder Repository schreiben. Nach einer sicheren Bindung zuerst `luxe_cj_status` ausführen. `bound_unverified` bestätigt nur die Prozessbindung. Erst ein erfolgreicher `luxe_cj_product_read` setzt den Verbindungszustand im laufenden Prozess auf `verified_by_product_read`.

Ohne Bindung startet der MCP trotzdem korrekt und meldet `credential_binding_missing` mit null Netzwerkaufrufen. Das ist der aktuell erwartete Zustand in einer Laufzeit ohne CJ-Secret und kein Beweis für einen ungültigen CJ-Zugang.

## Einmalige GitHub-Verifikation

Der manuelle Workflow `Diagnose Actions-Zugang (CJ-MCP, nur lesen)` besitzt ausschliesslich den Modus `cj_mcp` und die Operationen `product` und `inventory`. `product` verlangt genau eine `pid` oder `productSku`; `inventory` verlangt ausschliesslich eine `pid`. Der Modus verlangt einen exakt fixierten Commit, prüft die ausführbaren MCP-Dateien vor der Secret-Bindung gegen feste SHA-256-Werte und startet danach den exakten `luxestyle-cj-read`-Befehl aus `.mcp.json`. Bewegliche Action-Tags und der frühere, breitere Legacy-Secret-Job sind in diesem Workflow nicht vorhanden.

Der Actions-Job erhält als Repository-Secret ausschliesslich `CJ_API_KEY` und speichert kein Artefakt. Die Lageroperation führt im selben MCP-Prozess genau einen Authentifizierungsaufruf, einen Produktabruf zur SKU-/VID-Zuordnung und einen Lagerabruf aus. Ihre Ausgabe enthält nur feste Zustandsfelder, Anfragezähler, PID, productSku, variantSku/VID und begrenzte Länderzahlen. Namen, Bilder, URLs, Rohantworten, Punktefelder, Schlüssel, Token, Längen und Hashes werden nicht ausgegeben.

Ein erfolgreicher Actions-Lauf belegt den Remote-Zugriff dieses fixierten Commits. Er bindet das GitHub-Secret nicht dauerhaft an einen lokalen MCP-Host.

## Prüfung

```sh
node --check automation/cj-read-mcp.mjs
node --test automation/lib/cj_readonly_test.mjs automation/lib/cj_read_mcp_test.mjs automation/lib/cj_read_mcp_probe_test.mjs automation/lib/claude_assist_mcp_test.mjs
```

Die Tests verwenden ausschliesslich synthetische Offline-Schlüssel und Mock-Antworten. Ein echter `initialize`-/`tools/list`-/`tools/call`-Handshake wird gegen den gestarteten stdio-Prozess geprüft. Die Tests decken ausserdem `0` gegenüber unbekannt, HTTP-/Quota-Fehler, strikte Endpunktsemantik, Ausgabegrenzen, fehlende Retries, Runner-Redaktion und Workflow-Pinning ab. Bei fehlender Bindung bleiben Auth-, Produkt- und Lageranfragen bei null.
