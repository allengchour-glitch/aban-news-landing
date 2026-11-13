# Shop-Kategorien: drei Auswahlkollektionen angelegt, R193

Auf Besitzerauftrag «kategorie erstellen dort auch» sind **drei neue Kollektionen in Shopify tatsächlich angelegt**, jeweils mit zwei gezielt ausgewählten Produkten, kurzer Beschreibung und echtem bestehenden Produktfoto als Titelbild. **Unveröffentlicht und noch nicht im Shop-Profil eingefügt:** der frische Readback bestätigt für jede Kollektion zwei exakt passende Produkt-IDs und null aktive Kanalpublikationen. Die Shop-Profil-Zuweisung bleibt durch den in R192 frisch belegten Anmeldeschirm blockiert; in R193 wurde kein weiterer isolierter Browser gestartet.

| Kategorie / Reihenfolge im Entwurf | Bestehende neue Kollektion | Produkte | Titelbild |
|---|---|---|---|
| 1. Geschenkideen | Collection757437432199, Handle `shop-geschenkideen` | Retro-Vogel-Keramikbecher16617685418375 und Keramikbecher «Happy Birthday Rabbit»15497451929985 | Echtes Retro-Becherfoto,1493×1493 |
| 2. Licht & Wohnen | Collection757437530503, Handle `shop-licht-wohnen` | Tulpen-Planet-Nachtlicht16638319788423 und Sternenlicht-Projektor15521256604033 | Echtes Tulpen-Nachtlichtfoto,900×900 |
| 3. Beauty & Ordnung | Collection757437563271, Handle `shop-beauty-ordnung` | Kosmetik-Organizer mit Tragegriff16655083274631 und Organizer für Bad/Schminktisch16615385727367 | Echtes Taschen-Organizerfoto,1200×1200 |

Alle sechs Produkte wurden einzeln frisch gelesen: ACTIVE, nicht leere Tags und CHF-Preise. Vorhandenen `automation/lib/kanal_sperren.mjs` aus dem Hauptworktree angewendet; zusätzlich jedes `rueckhol` und fehlende/leere Tags gemäss Besitzerregel blockiert. Keine Treffer in den sechs ausgewählten Produkten. In den vorgelagerten Suchtreffern vorkommende `rueckhol`-Produkte wurden nicht ausgewählt. Bestand null wird nicht als Ausverkaufsbeweis interpretiert. Kaufbarkeit, genaue Variantenbindung und tatsächliche Shop-Kanalverfügbarkeit sind vor kanalbezogener Ausspielung erneut zu prüfen; Produktkanäle wurden nicht verändert.

## Gegenprobe, Änderung und Rücklesen

Bestehende Kollektionen zunächst auf20gezielte Treffer begrenzt gelesen (weitere vorhanden, keine Pagination); engere Titel-/Handleabfragen fanden keine passenden neuen Zielgruppen. Keine Katalog-Vollständigkeit oder Löschung bestehender Gruppen daraus ableiten. Die unplausiblen Produkt-Suchzählwerte wurden nicht als Gesamtzahlen übernommen; ausschliesslich gelieferte Einzelproduktdaten verwendet.

Expliziter Diff: drei manuelle Auswahlkollektionen, keine Änderungen an bestehenden Kollektionen/Produkten/Kanälen. Den neuen, schemaentdeckten `collectionCreate(collection:...)`-Vertrag mit `sources → source → inclusion → selections` genutzt. Eine Mutation mit drei benannten seriellen Erstellungen; keine Usererrors. Der unmittelbare Erstellungswert `productsCount=0` war noch nicht aktuell: der anschliessende gezielte Readback lieferte jeweils2und exakt die erwarteten IDs. Keine erneuten Produkt-Adds oder Neuanlagen. Alle drei Publikationszähler bleiben0, kein `publishablePublish` aufgerufen.

Alle drei Collection-CDN-Titelbilder liefern HTTP200. Retro- und Organizerbild sind pixelgleich zu den tatsächlich angesehenen Produktquellen. Shopify hat das Nachtlicht-JPEG geringfügig neu kodiert (mittlere absolute RGB-Abweichung unter0.022/255); es wurde zusätzlich visuell gegengeprüft, gleiches900×900-Motiv. Kein Bytegleichheitsanspruch für dieses Bild. Das Organizerfoto zeigt dekorative Bücher im Hintergrund; kein fremdes Parfumprodukt als Titelbild gewählt. Eine weitere Vorlage mit grossem englischem Text und eine Massgrafik wurden verworfen. Keine Bilder künstlich bearbeitet oder generiert.

Eine unabhängige lokale Gegenprüfung bestätigte Scope, echte Sperrfunktion und exakte Mitgliedschaften. Die Produkte wurden jeweils in umgekehrter Reihenfolge zur Eingabe geliefert. Die manuelle Sortierart ist gespeichert; eine gewünschte Produktreihenfolge ist damit noch nicht bestätigt. Die obige Kategorie-Reihenfolge ist ein Einbindungsvorschlag.

## Verbleibende konkrete Übernahme

Im authentifizierten Shop-Profil-Editor die **vorhandenen drei IDs** unter Abschnitt hinzufügen → Kollektionsliste und gegebenenfalls Navigation auswählen. Kanaleignung und Verfügbarkeit der ausgewählten Produkte/Kollektionen verifizieren; fehlende Produktkanäle nicht pauschal aktivieren. Kommerzielle Bildrechte und native mobile Vorschau vor Veröffentlichung prüfen. Die Titelbilder bewerben keine konkrete Farb-/Modellvariante; beim Nachtlicht bleibt diese Bindung für spezifische Werbung offen. «auswahl-offen» wurde nicht entfernt. Die persönliche Freigabe zum Erstellen ist vorhanden; keine erneute allgemeine Bestätigung dafür verlangen.

Kein öffentliches Shop-Profil, kein Live-Menü und keine öffentlichen neuen Landingpages als erledigt behaupten.0Profil-/Produktkanal-/Publikations-/Metricool-/Rabatt-/Budget-/Flow-/DNSwrites,0neueRenders oder Tagesberichte. Logo/Video ausR191 und24Aufgaben/Publikationsregister unverändert. [Vollständiger Beleg](SHOP-KATEGORIEN-20261113-R193.json). Für Claude gespeichert; Empfang unbekannt.
