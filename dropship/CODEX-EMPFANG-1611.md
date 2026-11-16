# Empfang durch Claude: Codex R259 bis R268 (16.11.2026, abends)

Claude hat den Projektspeicher des Zweigs `codex/luxestyle-claude-handoff-20261018` bis R268 (Commit `e3cb454fea`) gelesen.

## Bestätigt und nachgemessen (GEMESSEN 16.11. ca. 20:00 UTC)

- **Theme 214169584007 ist MAIN.** Laut R268 hat es der Besitzer veröffentlicht.
  - Gegen das alte MAIN 213991391623 unterscheiden sich 18 Dateien (Prüfsummen). Alle sind Codex-Änderungen vom 16.11.
  - Im alten MAIN wurde nach Codex' Kopie (16:57 UTC) keine Datei mehr geändert. Es ist also keine Claude-Änderung verloren gegangen.
- **Kategorieseiten live:** 6 von 6 HTTP 200, 0 Liquid-Fehler, Grösse 1,47 bis 2,04 MB. Die grösste ist `viral-hits` mit 2 037 396 Byte, also unter 2 MiB.
- **Was die Kategorieseiten verloren haben:** kompakter Kopf (`lx-kopf-kompakt`), Unterfilter-Chips (`lx-kopf-chips`), FAQ-Block. Ersetzt wurden sie durch `lx-collection-welten` und `lx-collection-details`. Das ist der Entscheid des Besitzers; Claude nimmt nichts zurück. Der FAQ-Block trug kein Schema-Markup.
- **og:price (R262):** Er folgt der gewählten Variante, in 10 von 10 Fällen gleich dem sichtbaren Preis (unabhängige Prüfung). Claude zieht nichts nach.
  - Rest: Preise ab 1000 erscheinen als «1,180.90» mit Tausenderkomma. Das gab es schon vorher.
  - Vorschlag: `| remove: ','` anhängen. Nicht umgesetzt.

## Ton und Planer

- Der Besitzer hat «Ton weg, einplanen» entschieden. Stumme Videos sind gewollt.
- Die Codex-Automation mit «Musik ist Pflicht» bitte anpassen; das muss der Besitzer im Codex-Auftrag ändern.
- Metricool schreibt nur Claude über die Freigabe. Bedenken gehen als Datei an Claude.

## Merchant (Claude, mit Ja des Besitzers 16.11.)

- Liechtenstein «Versand fehlt» ist auf 0.
- Die 13 Fehlergruppen sind gemessen: `dropship/merchant-fehler-1611/README.md`.
- Claude hat 17 verwaiste Angebote gelöscht (32 Einträge). Werkzeug: `automation/merchant_fehler_beheben.py`.
- Den Einspruch für 11 Fehlurteile sperrt Google über die Schnittstelle (`triggeraction` nur mit Allowlist). Er geht von Hand: `dropship/BROWSER-BEFEHL-MERCHANT-EINSPRUCH-1611.md`.
- **Codex schreibt im Merchant Center nichts.**
