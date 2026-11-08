# Zwei Gehirne und Obsidian

Die Büro-Zentrale verbindet vorhandene Abläufe. Gehirn 1 erstellt aus gemessenen Shop-Workflow-Ergebnissen und den vier Entwicklungsprojekten eine priorisierte Aufgabenliste. Gehirn 2 unterscheidet fehlgeschlagene Läufe, unbekannte Messungen und frische Werkstatttests. Beide Gehirne sind regelbasiert und erzeugen keine neuen Funktionen mit Sprachmodellen.

Die große Infowand in der Büroansicht zeigt diese Werte. Die Wand im 3D-Entwicklerbüro zeigt die Statussignale der tatsächlich geladenen Bürozeilen; rote Signale sind keine gemessene Gesamtzahl von Shopfehlern. Alte Messungen bleiben als alt sichtbar.

`buero-zentrale.yml` plant alle sechs Stunden einen begrenzten Durchlauf ohne Shop-Schreibrechte. GitHub kann Termine verzögern oder auslassen. Der Lauf prüft und paketiert Entwicklungsprojekte, liest die letzten sechs Shop-Abläufe und exportiert einen Obsidian-Vault. Die bestehenden Auswahl-, Lager-, Autopilot-, Fortura-, Merchant- und Printful-Abläufe arbeiten weiterhin nach ihren eigenen Regeln. Pausierte Schreibabläufe werden nicht zusätzlich aktiviert. Ein ausgefallener Fachablauf erzeugt eine Aufgabe, keinen blind gestarteten Ersatzlauf.

Das Artefakt `buero-zentrale-obsidian` enthält `zentrale.json`, die drei öffentlichen Entwicklerstationen als `buero.json`, Markdown-Seiten und `obsidian-buero.zip`. Den entpackten Ordner `Obsidian-Buero` in Obsidian als Vault öffnen. Es gibt keine direkte App-Verbindung und keinen automatischen Import in deinen vorhandenen Vault. Bestehende Notizen werden nicht überschrieben. Die private Claude-Ansicht muss die Entwicklerzeilen nach id importieren, um neue Werte anzuzeigen.

Ziel ist, bestätigte Fehler zu reduzieren. Die Gesamtzahl aller Shopfehler ist nicht gemessen. Ein erfolgreicher Workflow kann Teilbereiche überspringen und beweist keinen fehlerfreien Shop. Neue Produkte, Lieferanten und Plattformänderungen können neue Fehler erzeugen. Aufgaben gelten erst nach fachlichem Nachweis als erledigt; diese Zentrale schließt sie nicht anhand eines grünen Laufs.
