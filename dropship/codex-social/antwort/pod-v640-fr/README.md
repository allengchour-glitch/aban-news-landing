# Personnalisation en français – Vorschlag für den Produkteditor

Am 28.11.2026 öffnete die französische Produktseite der Keramiktasse den deutschen Editor. Bei der Variante 55777979629953 (CHF 22.90) liess sich im Mobilbrowser ein Textmotiv gestalten, lokal wiederherstellen und im Druckdialog prüfen. Dieser Ablauf wurde auch auf der deutschen Seite geprüft.

Die öffentlich eingebundene Version 6.4.0 hat denselben SHA-256 wie die lesbare Quelle `pod/v6/lspod-designer-v6-6.4.0.js` im Commit `8b3ab325a67292cd6a5c498d08a744b9d4aa3a6e` von `main`. Der Besitzerbranch hat diese Quelle bisher nicht. Der Patch lässt sich gegen genau diesen Stand prüfen. Eine spätere Auslieferung braucht eine eigene neue Version und einen Abgleich mit den inzwischen vorhandenen Versionen 6.4.1 und 6.4.2.

Der Vorschlag übersetzt 157 Texte für Französisch, darunter Gestaltung, Druckqualität, Fehler, Druckfreigabe und Warenkorb. Zehn sprachneutrale bzw. technische Einträge werden übernommen, darunter die bisherigen Eigenschaftsnamen für ältere Warenkörbe. Die Platzierungsnamen «Druckfläche», «Vorne» und «Hinten» sind abgedeckt. Weitere Namen und Hinweise aus einzelnen Produktkarten sowie Produkttitel und Einstieg im Theme brauchen eigene Übersetzungen.

## Gegenprobe

Im Repository mit lokal verfügbarer Quellrevision, Python-Playwright und Chromium ausführen:

```sh
python dropship/codex-social/antwort/pod-v640-fr/pruefen.py
```

Der Test spielt den Patch in einem temporären Verzeichnis ein. Im lokalen Mobilbrowser (390 × 844) werden Produktkarte und Vorschaukarte der Keramiktasse verwendet. Bilder werden durch einen neutralen Testpixel ersetzt. Geprüft werden Sprache, Texteingabe, Druckdialog, Checkbox, Weiterbearbeiten und Wiederherstellung nach dem Neuladen. Alle Browseranfragen werden lokal beantwortet oder abgebrochen. Die Bilder selbst und der Bezahlschritt sind nicht Gegenstand dieses Tests.

Die erste Gegenprobe endete beim geprüften Branchstand.

## Abnahme vom 28. November, 19.50 Uhr Zürich

Die vier aktuellen DE-/FR-Produktseiten der Keramiktasse und des Unisex-T-Shirts verweisen auf 6.4.0. Auf der französischen Tasse bestätigte der mobile Browser den geladenen Skriptinhalt und die laufende Version. Das ist eine Stichprobe an zwei Produkten.

6.4.1 (`96eff419…`) und 6.4.2 (`7d4c3639…`) liegen in derselben Quellrevision. Der erste FR-Patch passt auf 6.4.1. Bei 6.4.2 scheitern zwei von sechs Abschnitten bei einer direkten Anwendung. Die neu hinzugekommenen acht Kundenmeldungen betreffen unter anderem leere Textebenen, Bildfehler und ausverkaufte Varianten. Der Builder führt die gemeinsame Übersetzung mittels Dreiweg-Merge zusammen. Der kleine 6.4.2-Zusatz übersetzt diese Meldungen und die sechs bekannten Hinweise zu Drucktechniken.

| Fassung | SHA-256 des Editor-Skripts |
| --- | --- |
| Eingebundene Quelle 6.4.0 | `e7e30bc231e6817f70e2cbd8089f57c82ad5ea7c285585709223798c16adb930` |
| Archivierter erster FR-Patch 6.4.0 | `60bcc4fbbdbdab43288b2797eda9c70c9a9c48c22a51f9a37445c14bfa5dfb48` |
| FR-Vorschaukandidat 6.4.0 mit stabilen Bestellwerten | `e41d0e6cebae111588f06332d8d8c2f7509412b2a0b8c88ac8fe34464f803cb3` |
| FR-Abnahmekandidat 6.4.2 mit stabilen Bestellwerten | `66e54d346e2887f635f557155d1f2e4d539c4a5331654e83c8a1a7fc76ae9adb` |

Eine Gegenprobe zeigte, dass die Erstfassung auch die Beschreibung im Warenkorb übersetzte, etwa «Texte» anstelle des bisher gespeicherten «Text». `bestellwerte.patch` erhält die bisherigen Beschreibungen für Text, Bild und Sticker. Er gilt für beide Vorschaukandidaten. Technische Eigenschaften werden ebenfalls im Browser verglichen.

### Private Bedienprobe

Vom Stammverzeichnis des Repositorys aus lässt sich mit Python und Git eine einzelne HTML-Datei erzeugen. Der Builder liest die festgehaltene Quellrevision, lädt einmal das zur Variante gehörende Originalfoto von Shopify und prüft seinen SHA-256. Ein lokal vorhandenes Original kann über `--foto DATEI` verwendet werden. Die fertige HTML-Datei kommt ohne externe Verbindungen aus.

```sh
mkdir -p private-vorschau
python dropship/codex-social/antwort/pod-v640-fr/vorschau.py private-vorschau/tasse.html
python -m http.server 8765 --bind 127.0.0.1 --directory private-vorschau
```

Unter `http://127.0.0.1:8765/tasse.html` «Ajouter du texte» wählen, «Lune» eingeben und «Vérifier le bon à tirer» öffnen. Die gewählte Variante ist 325 ml. Neben dem Druckmotiv erscheint die Vorderansicht der Tasse mit dem Motiv. Das Häkchen schaltet die Bestätigung frei. Die private Vorschau meldet das Ende des Tests und ermöglicht anschliessend die Prüfung des gespeicherten Entwurfs durch Neuladen. Mit `--version 6.4.0` lässt sich die frühere Basis mit der Korrektur der Bestellwerte prüfen.

Die Vorschau verwendet die echte Druckgeometrie und das echte Variantenfoto (700 × 1000 px). Die externe Printful-Hilfsgrafik ist im privaten Paket ausgelassen. Der Artikel ist auf die geprüfte 325-ml-Variante beschränkt. Der Druckdialog zeigt 2700 × 1050 px und eine Produktansicht von 800 × 800 px.

Der wiederholbare Chromium-Test nutzt Python-Playwright und vergleicht Sprachsteuerung, Checkbox, lokalen Entwurf, Druckdatei-Bytes, Produktbildpixel und die erzeugten Warenkorbeigenschaften. Ein gesonderter Test simuliert «ausverkauft» und prüft die französische Meldung vor dem Druckdialog. Der Verfügbarkeitswert in diesem Test ist künstlich. Für die reale Variante zeigte der Schweizer Storefront beim Abruf CHF 22.90 und `available=true`.

```sh
python dropship/codex-social/antwort/pod-v640-fr/pruefen642.py
```

Eine produktive Veröffentlichung benötigt eine eigene unveränderliche Version, eine Prüfung ihres öffentlich ausgelieferten Inhalts und der dazu passenden Integritätsangabe sowie die gezielte Umstellung der freigegebenen Produktseite. Die private Bedienprobe umfasst Chromium und eine Tassenvariante. Andere Produktmodelle, Browser und der tatsächliche Zahlungsschritt liegen ausserhalb dieser Abnahme.
