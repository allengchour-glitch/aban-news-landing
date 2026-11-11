# R177 – Merchant-Versanddienst Liechtenstein: an Loginwand gestoppt

Stand: 2026-11-11T10:26:28+01:00
Marke: LuxeStyle / `luxestyle.ch`
Merchant Center: `5797470070` / `LuxeStyle CH`

## Freigegebener Zielzustand

Der Besitzer hat am 11.11.2026 ausdrücklich einen separaten Versanddienst für Liechtenstein freigegeben:

- Land: Liechtenstein
- Währung: CHF
- Pauschale: CHF 14.90
- kein Gratisversand
- Bearbeitungszeit: 1–3 Werktage
- Lieferzeit: 15–45 Tage
- Schweizer Versanddienst unverändert lassen

Der Auftrag entspricht Weg A aus `dropship/BROWSER-BEFEHL-MERCHANT-LI-0811.md` auf `origin/main` (`cb0242799f2a08e8348b9a5ae48394f2efa3029f`). Die neuere direkte Chatvorgabe präzisiert, dass ein eigener Liechtenstein-Dienst anzulegen und der Schweizer Dienst nicht zu erweitern ist.

## Tatsächliche Prüfung

Die verbundene Merchant-Identität wurde read-only als `5797470070` / `LuxeStyle CH` bestätigt. HYPD stellt für Merchant nur Lesezugriffe bereit. Die frisch geprüfte Windsor-Verbindung führt das richtige Merchant-Konto, bietet aber keine Aktion für Versanddienste oder Kontoversandeinstellungen. Im vorhandenen Repository wurde ebenfalls kein geeigneter authentifizierter Versanddienst-Write-Helfer gefunden.

Die vom Besitzer angegebene Merchant-URL wurde mit einer Kopie des lokalen Chromium-Profils geöffnet. Sie leitete auf `accounts.google.com/v3/signin/identifier` um und zeigte «Anmeldung – Weiter zum Google Merchant Center». Das Konto und die Versandseite wurden nicht geladen. Das Originalprofil blieb unverändert. Der Repo-Auftrag verlangt bei Loginwand, 2FA oder Sicherheitsabfrage ausdrücklich anzuhalten. Deshalb erfolgten keine Eingabe, kein Klick auf eine Merchant-Einstellung und kein Write.

Beleg der Loginwand: `MERCHANT-LI-LOGINWAND-20261111-R177.png`, 1440×1100, SHA-256 `f07986ea4e6cdb3c48b510ffb451d831ea28dd8f4aacc10bc112cbc65ed88731`.

## Ergebnis

- Der Liechtenstein-Dienst wurde **nicht angelegt**.
- Ein gespeicherter Merchant-Zustand und ein Rücklesebeleg liegen **nicht** vor.
- Der aktuelle Merchant-Versandzustand für Liechtenstein bleibt unbekannt.
- Der Schweizer Versanddienst wurde nicht verändert; dies ist durch null Merchant-Writes belegt, nicht durch einen eingeloggten Vorher-/Nachher-Readback.
- Die Diagnosezahl «Missing shipping info» wurde nicht als behoben oder null ausgegeben. Google-Verarbeitung und Problemzahl bleiben unbekannt.

## Nächster ausführbarer Schritt

Den Auftrag in der bereits authentifizierten lokalen Brave-Sitzung gemäss `dropship/BROWSER-AGENT-SETUP.md` ausführen: zuerst Versanddienste und Diagnose lesen und Vorher-Screenshots erstellen; dann ausschliesslich den separaten Liechtenstein-Dienst mit den freigegebenen Werten speichern; danach Liechtenstein-Dienst und unveränderten Schweizer Dienst zurücklesen und Nachher-Screenshots sichern. Keine Zugangsdaten oder 2FA-Codes im Chat übermitteln.

[LUXESTYLE_R177_20261111]
