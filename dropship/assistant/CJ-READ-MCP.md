# LuxeStyle CJ Read MCP

Stand: 05.11.2026. Der Projekt-MCP `luxestyle-cj-read` stellt genau zwei rein lesende Werkzeuge für CJdropshipping bereit. Er ist getrennt vom weiterhin lokalen und offline arbeitenden `luxestyle-assist`.

## Werkzeuge

| Werkzeug | Wirkung |
|---|---|
| `luxe_cj_status` | Prüft ohne Netzwerk, ob `CJ_API_KEY` an den MCP-Prozess gebunden ist. Es werden weder Wert, Länge noch Hash ausgegeben. |
| `luxe_cj_product_read` | Liest genau ein Produkt über `pid` oder `productSku`. Keine Suche, Pagination oder Folgestrategie. |

Der Leser authentifiziert gemäss der am 05.11.2026 frisch geprüften [offiziellen CJ-Dokumentation](https://developers.cjdropshipping.com/en/api/api2/api/auth.html) mit `POST /authentication/getAccessToken` und dem Body `{ "apiKey": "…" }`. Access- und allfällig gelieferte Refresh-Tokens bleiben ausschliesslich im Prozessspeicher; der Refresh-Token wird nur für die Echo-Sperre behalten. Es gibt keine Token-Datei, keinen Refresh-Aufruf und keine Ausgabe von Schlüssel oder Token.

Danach folgt höchstens ein `GET /product/query` mit genau einem Identifikator. Antworten sind auf 2 MiB begrenzt, Anfragen auf 15 Sekunden und mindestens 1,1 Sekunden Abstand. Es gibt keine Wiederholung. HTTP 401/403/429, Quota, 5xx, Timeout, ungültiges JSON und Identitätsabweichungen bleiben `unknown`; sie werden nie als leeres Produkt oder Nullbestand ausgegeben.

Die Rückgabe enthält nur eine begrenzte Feldliste. Maximal 25 Bild-URLs und 50 Varianten werden ausgegeben; Texte und URLs haben eigene Bytegrenzen. Eine Kürzung ist als `partial` beziehungsweise am Feld als `truncated` markiert. Lieferanten-URLs belegen weder Download, Produktzuordnung im Shopify-Shop noch Bild-, Film-, Bearbeitungs- oder Werberechte. Prime-Status und Rechte bleiben unbekannt.

Explizit nicht vorhanden sind Katalogsuche, Imports, Bestellungen, Käufe, Sourcing, Render, Shopify-Schreibzugriffe oder andere CJ-Mutationen.

## Sichere Credential-Bindung

`.mcp.json` enthält keine CJ-Zugangsdaten und keine Platzhalter dafür. Der Clientprozess muss `CJ_API_KEY` über seine sichere Laufzeit- oder Secret-Verwaltung erben. Ein GitHub-Actions-Secret wird nicht automatisch an einen lokalen MCP-Prozess weitergereicht.

Keine Schlüssel in Chat, Shellhistorie oder Repository schreiben. Nach einer sicheren Bindung zuerst `luxe_cj_status` ausführen. `bound_unverified` bestätigt nur die Prozessbindung. Erst ein erfolgreicher `luxe_cj_product_read` setzt den Verbindungszustand im laufenden Prozess auf `verified_by_product_read`.

Ohne Bindung startet der MCP trotzdem korrekt und meldet `credential_binding_missing` mit null Netzwerkaufrufen. Das ist der aktuell erwartete Zustand in einer Laufzeit ohne CJ-Secret und kein Beweis für einen ungültigen CJ-Zugang.

## Einmalige GitHub-Verifikation

Der bestehende manuelle Workflow `Diagnose Actions-Zugang (Shopify + CJ, nur lesen)` besitzt den getrennten Modus `cj_mcp`. Dieser Modus verlangt einen exakt fixierten Commit und genau eine `pid` oder `productSku`, prüft die ausführbaren MCP-Dateien vor der Secret-Bindung gegen feste SHA-256-Werte und startet danach den exakten `luxestyle-cj-read`-Befehl aus `.mcp.json`. Der historische Shopify-/CJ-Diagnosejob läuft dabei nicht.

Der Actions-Job erhält als Repository-Secret ausschliesslich `CJ_API_KEY`, führt einen Authentifizierungsaufruf und höchstens einen Produktabruf ohne Retry aus und speichert kein Artefakt. Seine Ausgabe enthält nur feste Zustandsfelder, Anfragezähler sowie zurückgelieferte PID/SKU. Namen, Bilder, URLs, Schlüssel, Token, Längen und Hashes werden nicht ausgegeben.

Ein erfolgreicher Actions-Lauf belegt den Remote-Zugriff dieses fixierten Commits. Er bindet das GitHub-Secret nicht dauerhaft an einen lokalen MCP-Host.

## Prüfung

```sh
node --check automation/cj-read-mcp.mjs
node --test automation/lib/cj_readonly_test.mjs automation/lib/cj_read_mcp_test.mjs automation/lib/cj_read_mcp_probe_test.mjs automation/lib/claude_assist_mcp_test.mjs
```

Die Tests verwenden ausschliesslich synthetische Offline-Schlüssel und Mock-Antworten. Ein echter `initialize`-/`tools/list`-/`tools/call`-Handshake wird gegen den gestarteten stdio-Prozess geprüft. Der Produkttest bei fehlender Bindung bestätigt null Auth- und null Produktanfragen.
