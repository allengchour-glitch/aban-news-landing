# Lokaler Vorschlag: echte Shop-Hosts beim Produktresolver prüfen

Basis: allengchour-glitch/aban-news-landing, main 1667fc056033e756cf55a52574c35da0c10c8f72.

GEMESSEN: Plüsch Panda https://notluxestyle.ch/products/q7 erzwingt im Original das Testprodukt q7. Nach der Korrektur greift wieder der bestehende Wortvergleich und erkennt plusch-panda. Auch fremde URLs mit dem Shopnamen im Pfad oder Query waren betroffen. Das ist ein nachgestellter Codefehler, kein belegter Vorfall im Planer.

Der lokale Patch liest vollständige URL-Kandidaten und prüft Scheme, tatsächlichen Host, Benutzerinformationen, Port und vollständigen Produktpfad. Die in bestehenden Tests verlangte Kurzform luxestyle.ch/products/... bleibt als HTTPS-Kurzform erhalten. Sprachpfad, UTM-/country-Query, Fragment, Gross-/Kleinschreibung, übliche Markdown-Links und Reihenfolge bleiben unterstützt. Relative /products/...-Links waren vorher keine Produktlinks und werden nicht neu eingeführt.

GEMESSEN: ursprüngliche 148 Prüfungen grün; korrigierte Suite 184 Prüfungen grün; neue Tests am Original rot; Mutationsprobe 67/67 erkannt. Vier bestehende Mutationsziele wurden an den neuen Parser angepasst, fünf weitere ergänzt. Der vorhandene Metricool-Workflow ruft beide Testdateien bereits auf; er wurde weder geändert noch gestartet.

Dateien: original/ ist die vom Commit gelesene Basis; fixed/ enthält die drei vorgeschlagenen Dateien; resolver-host-boundary.patch ist der anwendbare Diff; reproduction-before.json und test-report.json dokumentieren die Messung. Alle Testprozesse und deren Python-Unterprozesse liefen über run_offline.py mit gesperrten Netzwerkfunktionen.

Keine Repo-, Shop-, Planer- oder Social-Schreibzugriffe. Keine neue Automation, Veröffentlichung oder Installation. Vollständige CI-Nachspielung und Deployment sind nicht geprüft. Der unveränderte Wortvergleich ist kein allgemeines Fremdlink-Verbot; diese Korrektur nimmt fremden URLs nur den eindeutigen Produktvorrang. Claude muss den Vorschlag gegen seinen dann aktuellen Stand prüfen.
