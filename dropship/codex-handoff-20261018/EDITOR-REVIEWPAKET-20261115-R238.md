# LuxeStyle: Fokuskorrektur für die aktuelle Editor-Entwicklung

Der R237-Fix wurde auf den unveröffentlichten 6.4.2-Stand übertragen und als konkretes [Reviewpaket in Entwurfs-PR3145](https://github.com/allengchour-glitch/aban-news-landing/pull/3145) bereitgestellt. Die Live-Version bleibt unverändert.

| Gegenprobe bei390×844 | Unverändert6.4.2 | Lokaler Reviewkandidat |
|---|---|---|
|Fokus nach Escape zurück auf Vorschau|Fehler, BODY|bestanden|
|Fokus nach Schliessen zurück auf Vorschau|Fehler, BODY|bestanden|
|Druckvorschau|2700×1050-Blob|2700×1050-Blob|
|Screenshot vor dem Schliessen|SHA beb5081739f964bb483810786e3e963a6c225b528715238ca35c7333162fb4b8|bytegleich|

Die lokalen Fixtures ersetzen nur im Testbrowser Scriptbytes und SRI. Sie sind keine neue Auslieferung von abannews.com oder Shopify. Eigener Text, keine Uploads, Warenkorb-, Checkout- oder Bestellaktion. Browserkontexte danach geschlossen; keine bezahlten Video-Renders. Die Screenshot-Gleichheit ist kein vollständiger Vergleich aller Druckdatei-/Warenkorbbytes oder aller16 Editorprodukte.

Die bestehende642-Datei ist mit Gitblob `999ab176245ea74b7d2bc0ccda62b70ce83d9b01`,294981Bytes und SHA256 `886b05769ef80a6b9a490738c6f870bc92cc058d979e48480b0e4469fde02938` an Commit `91faac47e445ba934ae16d6f6216ca989bb22d81` gebunden. Der642-Zweig und main blieben unverändert. 6.4.1 ist im offenen PR3035 bereits belegt. Daher nur eine lokale, ausdrücklich nicht reservierte oder veröffentlichte6.4.3-Reviewkopie; keine konkurrierende6.4.1-Arbeit.

Der Manifestentwurf wurde mit dem vorhandenen Bauskript aus lokalen Original-/Kandidatenbytes erzeugt, nicht von Hand. Hash-/Grössenprüfung und Syntaxprüfung bestanden. Eine um ein Byte falsche Manifestgrösse endet mit Exit1. Der unveränderte Rollout-Konfigurator lehnt6.4.3 vor jedem Netzzugriff ab; das ist ein erhaltenes Schutz-Gate, kein freigegebener Rollout. Keine Workflow-/Testdatei geändert und kein Workflow gestartet. Node24.22.1 lokal; dokumentiertes Node22 fehlt. Vollständige Projekt-/Mutations-/Rollout-CI bleibt offen; aus leeren Statusrückgaben keine grüne CI ableiten.

PR3145 enthält genau fünf neue Dateien im Reviewverzeichnis `dropship/codex-editor-fokus-20261115-r238/`. Vollständige Reviewkopie absichtlich mit `.js.txt`, dazu Anleitung, Minimalpatch, Manifestentwurf und Quellen/Prüfungen. Keine aktive Datei in `pod/v6`, keine Shopbeschreibung und keine aktive Release-/Workflowkonfiguration geändert. Branch von frisch geprüftem main `b172645eae849c33b09c5e98a05e6cb5db3c0e6a`, fünf Content-/SHA-Readbacks und Commitvergleich bestätigt; draft=true und merged=false nachgelesen. Keine Revieweranforderung oder direkte Kontaktaufnahme; Claude-Empfang unbekannt.

Nächster konkreter Schritt ist die Übernahme dieses kleinen Fixes in den bestehenden642-Review durch den zuständigen Editor-Verantwortlichen, mit aktueller Source-Gegenprobe. Erst danach neuen unveränderlichen Pfad/Version, SRI, Manifest, Versions-/Canary-/Rollback-Gates und echte CI gemeinsam prüfen. Bestehende6.4.0-Bytes erhalten; keinen631/640-Workflow für die neue Version auslösen und keine bestehende SRI-Datei überschreiben. PR3145 ist Reviewmaterial, kein fertig freigegebener Produktivrelease.

Shop luxestyle.ch/CHF/EuropeZurich und Metricool6227837/EuropeZurich mit allen sechs erwarteten Konten frisch bestätigt. Theme214040805767 weiterUNPUBLISHED, MAIN213991391623, kein neuer Publishversuch. Keine Social-/Merchant-/Shop-/Flow-/DNS-/Budgetänderung oder Kennzahl-/Flow-/Bestellreport-Wiederholung. [Strukturierte Belege](EDITOR-REVIEWPAKET-20261115-R238.json).
