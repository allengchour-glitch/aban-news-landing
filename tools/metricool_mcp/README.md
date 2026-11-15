# Metricool-MCP für diese Arbeitskopie

Eigene lokale MCP-Brücke mit drei lesenden Werkzeugen: `connection_status`, `get_brands` und `get_scheduled_posts`. Keine Veröffentlichung, keine Planeränderung und keine Löschfunktion. Kein zusätzlicher Anbieter und keine fremde OAuth-Domain. Alle Kontoabfragen gehen ausschliesslich an `https://app.metricool.com/api`.

Start: `python3 /workspace/aban-news-landing/tools/metricool_mcp/server.py`. Python-Pakete `mcp` und `httpx` sind in dieser Cloud-Umgebung bereits installiert. Auf anderen Rechnern müssen diese im verwendeten Python verfügbar sein; keine Systemeinstellungen oder Pakete wurden überschrieben.

Die Projektkonfigurationen für Codex und Claude Code enthalten nur Startbefehl und Variablennamen. Den vorhandenen Token über `METRICOOL_USER_TOKEN` aus der sicheren Umgebung weiterreichen. Niemals seinen Wert in Konfiguration, Git oder Chat speichern. Nutzer-/Marken-ID können über `METRICOOL_USER_ID` und `METRICOOL_BLOG_ID` gesetzt werden; die dokumentierten LuxeStyle-Werte sind die Vorgabe, keine frisch bestätigte Kontozuordnung.

Nach dem Laden der Projektkonfiguration erst `connection_status` und danach `get_brands` aufrufen. Erst eine erfolgreiche authentifizierte Markenabfrage belegt die Kontoverbindung. Der Server kann ohne Token starten und seine Werkzeuge auflisten; Kontoabfragen melden dann einen Fehler. Das ist kein erfolgreicher Metricool-Login.

Die Einrichtung einer lokalen Projekt-MCP-Konfiguration schaltet die Werkzeuge nicht automatisch in einer bereits laufenden Cloud-Unterhaltung frei. Der MCP-Client muss die Projektkonfiguration neu laden und die sichere Secret-Verknüpfung für den Serverprozess übernehmen. Eine bereits anderswo eingerichtete Metricool-App-Verbindung wird dadurch nicht verändert.

## Geprüfter Stand

GEMESSEN am 15.11.2026: MCP-Initialisierung, Auflisten der drei Werkzeuge, lokaler Statusaufruf, Fehler bei fehlendem Credential und Begrenzung auf zwei Kalendertage bestanden. Der Protokolltest lief ausserhalb der Sandbox, weil deren Thread-/Asyncio-Aufwecken die Standardeingabe blockiert; ein minimaler AnyIO-Gegentest zeigte denselben Fehler. Keine Anmeldung oder Kontoabfrage als erfolgreich behaupten. Ergebnis: `protocol-check.json`.

Der lokale Codex-CLI-Eintrag `metricool_local` wurde global registriert und mit `codex mcp get metricool_local --json` frisch bestätigt. Er übernimmt nur die drei benannten Metricool-Umgebungsvariablen und beschränkt die Werkzeuge auf Lesen. Die ergänzte Projektdatei `.codex/config.toml` allein wurde von `codex mcp list` in dieser Installation nicht geladen; sie ersetzt deshalb nicht die bestätigte globale Registrierung. Claude Code erhält den separaten Projekteintrag in `.mcp.json`; dessen Laden im Claude-Client ist hier nicht getestet.

In der laufenden Umgebung fehlt weiterhin die Zustellung von `METRICOOL_USER_TOKEN`. Die vorhandene Vault-Verknüpfung nicht erneut anfordern; nach Übernahme der gespeicherten Umgebungskonfiguration mit neuem Prozess `connection_status` und `get_brands` ausführen. Erst dann ist die Verbindung zum Konto prüfbar.
