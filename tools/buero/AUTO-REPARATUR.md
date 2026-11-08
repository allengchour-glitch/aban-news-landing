# Automatische technische Reparatur

Vor jeder Veröffentlichung prüft `auto_reparatur.py` den fertigen Ordner `_site`. Zwei bestätigte Fälle werden korrigiert: echte Links mit `target=_blank` ohne `rel=noopener` und vollständige HTML-Dokumente ohne Viewport-Metadaten. Kommentare, JavaScript-Beispiele, Textfelder, Fragmente, Verknüpfungen nach außerhalb und unklare doppelte Attribute werden nicht umgeschrieben.

Der zweite Durchlauf muss ohne weitere Änderungen enden. Nach dem Schreiben werden die Dateien frisch gelesen. Ein Fehler stoppt die Veröffentlichung. Es gibt keine automatische Wiederholungsschleife. Die Quelltexte bleiben unverändert; die korrigierten Dateien gehören zum veröffentlichten Build. Eine spätere Neuerstellung repariert diese Stellen erneut, statt eine dauerhafte Quellcodeänderung zu behaupten.

Der vorhandene Hauptseiten-Workflow läuft zusätzlich täglich um 06:45 UTC. GitHub kann Termine verzögern oder auslassen. Der öffentliche Bericht `/buero-reparatur.json` nennt Zeitpunkt, geprüfte Dateien, Korrekturen und ausgenommene Fälle. Die Büro-Webansicht liest den Bericht; die sonstigen privaten Büro-Arbeitsstände bleiben unverbunden. Ein fehlgeschlagener neuer Build ersetzt den letzten veröffentlichten Bericht nicht, dessen Zeitpunkt deshalb sichtbar bleibt.

Die Reparatur verändert keine Preise, Bestellungen, Zahlungsziele, Texte oder Produktdaten. Für beschädigte Daten, falsche Lieferangaben, unbekannte Programmlogik und Shopify-Fehler braucht es jeweils eigene geprüfte Reparaturregeln. Die Gesamtzahl aller Fehler bleibt unbekannt. Null Treffer bei diesen zwei Regeln bedeuten keinen vollständig fehlerfreien Shop.

```bash
python3 tools/buero/auto_reparatur.py _site --bericht /tmp/reparatur-plan.json
python3 tools/buero/auto_reparatur.py _site --anwenden --bericht _site/buero-reparatur.json
```
