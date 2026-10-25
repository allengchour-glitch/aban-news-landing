# Auftrag: LuxeStyle als zusammenhängenden Gesamtshop verbessern

**Task-ID LUXESTYLE_GESAMTSHOP_20261025.** Inhaberpräzisierung vom25.10.: die ganze Website soll überzeugen, nicht nur zwei Produkttexte. Die vorliegende lokale Vorschau umfasst alle wesentlichen Seitentypen und den gesamten Navigationsentwurf. Das ist kein veröffentlichtes Shopify-Theme und kein vollständiger Katalogaudit.

## Reviewbare Lieferung

- `preview/index.html`: eigenständig nutzbare, bedienbare Gesamtvorschau mit eingebetteten echten Bildreferenzen und sechs tatsächlich aktiven bestehenden Produkten als Datenstichprobe.
- `DESIGN.md`: beobachtetes Design, konkrete Gesamtseitenprobleme, gemeinsame Gestaltungsregeln und klare Quell-/Vorschlagsgrenzen.
- `structure/NAVIGATION.json` und `structure/START.json`: sechs Hauptgruppen und44 vorhandene Unterlinks, Alt/Neu-Matrix, passende Filterregeln und belegte Ziele.
- `theme/index-order.diff` und `theme/INDEX-CHANGE.json`: exakter enger Homepage-Diff gegen Theme187533001089, nur bestehende Kategorien vonPosition8 auf3. Alle25 Sektionen/22 aktiven Sektionen, Einstellungen und Produktlisten bleiben erhalten.
- Die zwei Beschreibungsvorschläge unter `improve-next-20261025/products/` und der neutrale Video-CTA unter `improve-next-20261025/renderer/` gehören als separate geprüfte Teilentwürfe dazu. Sie sind keine bereits produktiven Änderungen.

## Gesamtes Einkaufserlebnis

1. **Startseite:** verständliche erste Orientierung, Kategorien direkt nach Hero/Service, danach ruhige kuratierte Auswahl. Nicht alle15 bestehenden Produktreihen gleich stark um Aufmerksamkeit konkurrieren lassen. Der vorliegende enge Theme-Diff verändert zunächst nur die Reihenfolge; eine spätere Reduktion separat gegen konkrete Daten freigeben lassen.
2. **Globale Navigation:** Mode & Accessoires / Wohnen & Licht / Technik & Gaming / Beauty & Pflege / Familie & Freizeit / Geschenke & Saison. Gruppentitel ohne belegtes Sammelziel bleiben Menüknöpfe, keine erfundenen Collectionseiten. Vorhandene Unterkategorien und echte Ziel-URLs erhalten. Suche auf Desktop und Mobil erreichbar halten.
3. **Kategorie-/Suchseiten:** klare Überschrift, Unterkategorien und passende Filter. Bereits vorhandene Filter verbessern, nicht als neu erfunden darstellen. Mode-Grösse/Farbe aus tatsächlichen Optionen; Technik keine Schuh-/Konfektionsgrössen ohne Kontext. Keine automatische EU-/US-/cm-Umrechnung, keine unbestätigten Material-/Kompatibilitätsfilter, keine internen Automations-/Sperrtags anzeigen. Aktive Auswahl und Zurücksetzen müssen funktionieren.
4. **Produktkarten:** gleiche Bildgeometrie, unveränderte reale Bilder, gut lesbare kurze Namen/CHF-Preise. Varianten mit tatsächlicher Preis-/Kaufbarkeit koppeln. Fehlende Werte niemals als CHF0 oder automatisch kaufbar behandeln. Keine erfundenen Sterne, Reviews, Rabatte oder Lagerknappheit.
5. **Produktdetail:** ruhiger Bild-/Informationsaufbau, echte Variante/Preis, einfacher Kaufbereich, danach hilfreiche Details und Bedingungen. Bestehende Horizon-Funktionen wie Sticky-CTA, Merkliste und Accordion berücksichtigen. Projektorclaim-Diff nur descriptionHtml; Diffuser nur die eine zusätzliche Kaufhilfe. Keine Bilder, Tags, Varianten, Preise oder SEO-Felder dadurch ändern.
6. **Warenkorb:** verständliche Mengen, Varianten und Summen, klare Weiterführung und öffentliche CHF50-Anzeige. Prototype ist ausdrücklich Demo im Arbeitsspeicher, kein echter Shopwarenkorb und kein Checkout. Die interneCHF45-Regel nach Rabatt wird nicht verändert;5000-Cent-Stellen im Theme sind UI-Anzeigen und belegen keine andere Shippingrate.
7. **Mobil:** Menü, Suche, Filter, Varianten, Mengen und Dialoge auf realen Zielbreiten prüfen. Grosse erreichbare Schaltflächen, lesbare Texte, Escape/Schliessen/Fokus und keine horizontale Überbreite. Desktop-Screenshot ist kein Mobilnachweis.
8. **Footer/Service:** konsistentes Deutsch Schweiz, klare bestehende Kontakt-/Policy-/Konto-Verweise, account.luxestyle.com.co erhalten. Capturemarker bestehen bereits; keine fehlenden Newsletterformulare aus leerer API ableiten. Kein Newsletter-/Flowumbau oder echter Submit durch diese Designarbeit.

## Integration in das bestehende Shopify-Theme

Die Vanilla-Vorschau ist eine konkrete Gestaltungsvorlage, kein austauschbares Shopify-Theme. Nicht einfach die HTML-Datei als Live-Storefront hochladen. Komponenten und Verhalten gezielt in die bestehende Horizon-Struktur übertragen, nachdem die betreffenden Quell-Dateien/Selektoren und Ressourcen aktuell gegengeprüft sind. Vorhandene Helfer und bestehende Themeänderungen zuerst lesen; keine Installation, keine Workflows, kein Deployment und kein Hauptbranch-Merge als Zugangstest.

Zuerst die kleine belegte `/order`-Änderung als eigenen Reviewumfang führen. Für Header/Menü, globale Typografie, Kategorie-/Filterkomponenten, Produktkarten/PDP und Warenkorb jeweils einen getrennten engen Quell-/Nachher-Diff plus Rücksetzreferenz erstellen. Keine pauschale Settings-/Templateersetzung und keine vorhandenen Apps/Cart-/Consent-/Paymentfunktionen entfernen. Die Quelle config/settings_data.json hat eine dokumentierte Hashabweichung und wird nicht als bestätigte Änderungsbasis verwendet.

Vor jeder späteren autorisierten Umsetzung Shopidentität, aktives Theme und Quellhash frisch lesen. In der echten Shopify-Vorschau alle Seitentypen und nötige Zustände prüfen. Die lokale Gesamtvorschau oder eine erfolgreiche JSON-Prüfung belegt weder die aktuelle Shopify-Darstellung noch die echte Checkout-/Appfunktion. Der begrenzte Liquid-Validator hat wegen fehlender Theme-Abhängigkeiten kein vollständiges Theme-OK geliefert; Vorher/Nachher ergeben0 neue Diagnosen.

## Befugnisse und Kontinuität

Alle Ausarbeitungen bleiben reviewbar. Kein Shop-/Theme-/Menü-/Filter-/Feed-/Flow-/Rabatt-/Budget-/DNS-Write, keine Kunden-/Lieferantenansprache, kein Kauf und kein kostenpflichtiger Render wurde durch die Vorschau autorisiert oder durchgeführt. Die aktuelle ausdrückliche Social-Autopublish-Erlaubnis gilt weiterhin nur über Metricool und unter sämtlichen Produkt-/Rechte-/Qualitäts-/Kanal-/Ledgerbedingungen; dieser Gesamtshopentwurf erzeugt keine Socialfreigabe.

Die bereits erhobenen Kennzahlen und der Klaviyo-Flowreport vom25.10. werden weiterverwendet. Keine neue Tagesmessung für Design oder Protokoll. Andere Marken bleiben unberührt. README und TAGESPROTOKOLL auf Branch codex/luxestyle-claude-handoff-20261018 fortführen, aktuelle SHA und konkrete Diffs verwenden, zurücklesen. Der dokumentierte Gesamtshopauftrag ersetzt nicht die belegte Ausführung durch Claude; Lesebestätigung/Ausführung bleiben bis Nachweis unbekannt.

## Nächster konkreter Schritt

Der Inhaber prüft die zusammenhängende Vorschau statt einzelner isolierter Textstellen. Danach die freigegebenen Gestaltungsentscheidungen mit aktuellen Quellbelegen in den vorhandenen Shopify-Komponenten umsetzen und dort abnehmen. Vorher keine Live-Schaltung oder pauschale Katalog-/Settingsänderung. Die vollständige Katalogzuordnung und jede fehlende Zielseite bleiben eigene begrenzte Quellenarbeit, keine durch sechs Musterprodukte erledigte Migration.
