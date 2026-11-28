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

Geprüfter Branchstand, ohne Veröffentlichung im Shop oder auf dem CDN.
