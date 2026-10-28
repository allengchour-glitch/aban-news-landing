# Sicherung vor der Bereinigung der Editor-Hintergründe (28.10.2026)

**Anlass:** Besitzer-Meldung mit Screenshot der iPhone-Hülle: «Dein Design» blieb beim Bearbeiten unter dem Text des Kunden stehen. Der Text ist in die Printful-Mockups eingebrannt,
die der Editor (`pod/designer.js`, live als `lspod-designer-v5.js` auf dem Shopify-CDN) als Hintergrund lädt.

**Messung (nur ansehen, nichts geschrieben):** alle 123 Produktbilder der 37 Produkte mit Tag `wunschdesign`, zwei unabhängige Durchgänge mit je 17 Kontrollurteilen
(bekannt positives Bild immer «Text», bekannt negatives immer «sauber»), beide Durchgänge stimmten bei allen 123 Bildern überein.
Befund: eingebrannt auf allen 6 Mockups der iPhone-Hülle, auf 3 Galeriebildern des «Klassischen Unisex T-Shirts» (links, rechts, vorne); als Hinweis «DEIN MOTIV HIER» in der
Aufkleber-Vorlage. Absichtliche Hinweise in den Vorlagen des WM-Trikots (DRAFT) blieben unberührt.

**Geändert (alles per `automation/pod_editor_hintergruende.mjs`, Tabelle `pod/editor-hintergruende.json`):**
- iPhone-Hülle: Editor-Baustein bekommt `data-img-front` + `data-img-map` für alle 16 Modelle (14 bis 16 Plus: Printful-Katalog-Blanko auf ein weisses Quadrat gesetzt; 16 Pro, 16 Pro Max, 17,
  17 Air, 17 Pro, 17 Pro Max: die Mockups, der Text per Retusche entfernt). Die 6 alten Mockups sind gelöscht, die 6 retuschierten Fassungen als Galerie-Medien hinzugefügt.
- Aufkleber: neue Vorlage ohne Hinweistext (`luxe-editor-aufkleber-vorlage.png`).
- Klassisches Unisex T-Shirt: die 3 Mockups mit Text gelöscht; Blanko-Vorderansicht (`blank-tee-white.png`, wie beim anderen T-Shirt) als erstes Galeriebild ergänzt.

**Inhalt dieses Ordners:** `<handle>.json` = Beschreibung (HTML), Medien und Varianten VOR der Änderung; `originale/` = die 9 gelöschten Bilddateien (6 iPhone-Mockups, 3 T-Shirt-Mockups).

**Zurückdrehen:** Beschreibung aus `descriptionHtml` per `productUpdate` zurückschreiben; Bilder aus `originale/` neu hochladen (`productUpdate(media:)`) und die Karte `data-img-map` aus dem Baustein entfernen.
Die Quelldateien der neuen Hintergründe liegen unter `pod/editor/`, das Retusche-Verfahren ist in `automation/pod_editor_retusche.py` beschrieben und reproduzierbar.
