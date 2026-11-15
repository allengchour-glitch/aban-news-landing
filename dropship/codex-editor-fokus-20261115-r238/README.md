# LuxeStyle: Fokuskorrektur für den nächsten Editor-Release

Nach dem Schliessen der Druckvorschau geht der Tastaturfokus auf das Dokument zurück. Der kleine Fix setzt ihn wieder auf die Vorschau-Schaltfläche. Er ist auf den bestehenden, unveröffentlichten 6.4.2-Stand übertragen und bei 390×844 Pixeln lokal gegengeprüft: Escape und «Schliessen» schlagen im unveränderten 6.4.2-Stand fehl und bestehen im Kandidaten. Das Vorschaubild vor dem Schliessen bleibt im Screenshot bytegleich.

Dieses Verzeichnis ist ausschliesslich ein Reviewpaket. Es ändert keine Datei unter `pod/v6`, keine aktive Release-Konfiguration, keinen Workflow und keine Shopify-Beschreibung. Die Live-Version 6.4.0 und die parallele 6.4.2-Datei bleiben erhalten. Version 6.4.1 gehört bereits zu PR [#3035](https://github.com/allengchour-glitch/aban-news-landing/pull/3035); es wird kein zweiter 6.4.1-Release angelegt.

## Dateien

- [Fokusdiff auf dem 6.4.2-Stand](fokus-auf-642.patch): genau ein Schliesshandler. Nicht direkt auf eine eingefrorene oder veröffentlichte Datei anwenden.
- [Vollständige lokale Reviewkopie](lspod-designer-v6-6.4.3.review.js.txt): vorgeschlagene Version 6.4.3; ausser dem Fokus-Fix nur Versionsdeklaration und Kopf angepasst. Kein reservierter oder veröffentlichter Versionsstand.
- [Generierter Manifestentwurf](editor-release-6.4.3.review.json): mit dem vorhandenen `editor_release_bauen.mjs` aus echten lokalen Bytes erzeugt; Vorgänger 6.4.0 und 6.4.2. Keine aktive Rollout-Datei.
- [Quellen und Prüfergebnisse](PRUEFUNG.json).

## Validierung

Der bestehende Manifestprüfer bestätigt Hashes und Dateigrössen. Die Gegenprobe mit einer absichtlich um ein Byte falschen Manifestgrösse endet wie erwartet mit Exit 1. JavaScript-Syntaxprüfung bestanden. Der aktuelle Rollout-Konfigurator weist `editorVersion=6.4.3` weiterhin vor jedem Netzzugriff zurück; seine Schranke wurde nicht verändert.

Die beiden Browserfälle sind ausdrücklich lokale Fixtures mit passend berechnetem SRI, keine Live-Auslieferung. Sie verwenden das Tassenprodukt 15422823465345 / Variante 55777979629953, eigenen lokalen Text und ausschliesslich die Druckvorschau. Keine Datei hochgeladen, kein Warenkorb-/Checkout-Ablauf und kein Auftrag ausgelöst. Nicht-GET/HEAD-/Telemetrie-/Cart-Anfragen werden blockiert; der Browserkontext wird anschliessend geschlossen.

Lokale Laufzeit: Node 24.22.1. Das im Repo dokumentierte Node 22 ist hier nicht installiert. Vollständige Editor-/Rollout-CI, Mutationsprobe und echte Auslieferung bleiben offen. Keine Installation, keine Änderung an Tests oder Workflows, kein Merge/Deployment.

## Übernahme

Zuerst mit dem bestehenden 6.4.2-Zweig abstimmen und dessen aktuellen Sourcehash gegen `PRUEFUNG.json` lesen. Falls diese Basis freigegeben bleibt, den einen Fokus-Fix als neue unveränderliche Version übernehmen und Manifest, Versions-/Canary-/Rollback-Gates sowie Referenz-SRI gemeinsam prüfen. Der vorhandene Default-Branch-Workflow kann diese Reviewversion nicht ausführen. Keine bestehende SRI-Datei überschreiben und keinen alten 6.3.1-/6.4.0-Lauf dafür starten. Anschliessend die gleiche Tassenfunktion nach einer legitim freigegebenen Auslieferung öffentlich gegenprüfen. Claude-Empfang unbekannt.
