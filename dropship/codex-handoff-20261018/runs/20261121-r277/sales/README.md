# R277: Modellvergleich-Link als konkreter Entwurf

Status: nur lokal vorbereitet, keine Shopify- oder Produktänderung und keine Freigabe abgeleitet.

## Frisch lokalisierter Einbau

Shop94368563585/luxestyle.ch, Theme214169584007 aktuell MAIN. Projektor15521256604033 hat templateSuffix=null. Die beiden tatsächlichen Einbauquellen sind `blocks/variant-picker.liquid` und `templates/product.json`, darin `sections.main.blocks.product-details.blocks.lux_beschreibung.settings.custom_liquid`.

- Wählerquelle MD5 `f299d1a228fcaa40fff605bdd6e3860e`.
- Produkt-Template MD5 `3d989256216e0d5ebbb65987d4a8398e`.
- Originale bytegenau lokal abgelegt; Quell-MD5 stimmt mit nativer Antwort. Ein zunächst durch Dateitransport angefügter Zeilenumbruch wurde vor dem endgültigen Manifest entfernt, kein Quellstand verändert.

Die Produktbeschreibung ist aktuell ein sichtbarer `.rte.lux-beschreibung`-Block. Versand/Rückgabe haben ein anderes Accordion. Weder Zielüberschrift noch Beschreibung liegen in `details`; daher keine erfundene Aufklapp-Logik.

## Begrenzter Kandidat

Der Wähler rendert nach seiner bestehenden Ausgabe einen Textlink «Modelle A–G vergleichen». Er erscheint nur auf Produktseiten, im tatsächlichen `main`-Sektionskontext, beim globalen Produkt15521256604033, übereinstimmender product_resource.id, deutscher Sprache und unveränderter genauer Vergleichsüberschrift.

Die vorhandene Beschreibungspipeline erhält unmittelbar vor ihrer bisherigen Ausgabe nur einen ebenfalls auf Produktseite/Projektor/DE begrenzten `replace_first`. Er setzt `id="luxe-modellvergleich" tabindex="-1"` am vorhandenen H2. Produktbeschreibung im Admin, Übersetzungen, Varianten, Preise und Schema bleiben unangetastet. Keine JS-Datei, kein Klickhandler und kein Formularereignis nötig. Fragmentnavigation erhält die `?variant=`-Auswahl und fokussiert das H2.

Der JSON-Kandidat wurde mittels exakt einmaligen Zeichenkettenaustauschs gebaut. Nach Rücktausch dieses einen custom_liquid-Werts stimmt der geparste gesamte JSON-Baum mit dem Original überein. Die Variante-Picker-Datei unterscheidet sich ausschliesslich in der Link-/CSS-/Scope-Einfügung. Diff und vollständige SHA/MD5 in `MODELLVERGLEICH-ENTWURF.patch` und `SOURCE-MANIFEST.json`.

## Geprüft und Grenzen

Sechs Chromium-Fälle: zwei echte aktuelle öffentliche Server-HTMLs (A CHF34.90 und B CHF37.90), je360/390/1440px. Fremdskripte und übrige Netzaufrufe blockiert; fünf aktuelle Stylesheets lokal zurückgespielt. Kandidaten-DOM aus den beiden Liquid-Einfügungen simuliert, kein nativer Liquid-Render. Link mit Tastatur/Enter aktiviert; Ziel erhielt echten Fokus, Fragment erschien, ausgewählte Varianten-ID/Radiozustand, Menge und alle Preistextknoten blieben vor/nach Klick gleich. Je ein Link/Ziel und Ziel im Viewport. Ein anfänglicher100-ms-Messpunkt lag noch in laufender Scrollbewegung; nach700ms in allen sechs Fällen bestanden. Das belegt keine Performancevorgabe. Screenshot390px angesehen.

`GUARD-REVIEW.json` enthält eine statische Negativprüfung für fremdes Produkt, Startseiten-Featured-Product, fremde/Quickview-Sektion, abweichende Ressourcen-ID, FR und fehlende Überschrift. Mangels installiertem Liquid-Interpreter sind das keine ausgeführten Liquid-Renderfälle. Es wurde nichts installiert.

Offen vor Umsetzung: konkrete Inhaberfreigabe, erneute MD5-/Objektgegenprobe gegen aktuellen Stand, native Liquid-/Theme-Vorschau, Variantenwechsel/Re-Rendering, tatsächliche Sticky-Header-Überdeckung, echte Mobilgeräte/iPhone/Safari, FR-Negativkontrolle im nativen Render. Keine Live- oder Umsatzwirkung gemessen. Wenn Quellchecksums oder H2 abweichen: nicht blind anwenden.

Vorgeschlagener späterer Ablauf nach Freigabe: aktuelle Kopie anlegen/identifizieren; exakt diese zwei Kandidaten dort speichern; Schutzgegenproben an Projektor A/B und Fremdprodukt/FR samt Tastatur; erst nach Abnahme live. Kein zusätzlicher Verkaufsvorschlag.
