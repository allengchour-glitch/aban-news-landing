# Ursprungsprüfung: vier LX-/LXSCH-Produkte

29.10.2026, Europe/Zurich. Fortsetzung des vorhandenen Audits, keine neue Katalogmessung. Keine Shopify-/Metricool-Abfrage, kein Quellenkauf, keine Kontaktaufnahme, keine Remote-Änderung. Repo-Dateien wurden auf `b708c809c2b9ef074bf48999fdfe5b28d0ee3bbe` gelesen; diesen aktuellen Main-Stand hatte der Hauptagent frisch bestätigt.

Die neue Recherche hat zwei konkrete Fehlzuordnungen eingegrenzt, aber keinen belastbaren Lieferantenbeleg für Setinhalt oder Farbe geliefert:

| Neuer belegter Fortschritt | Quelle | Bedeutung |
|---|---|---|
| Die alte Referenz «Jade Roller Premium» trägt Produkt-ID **15397247385985**. Ausgewählt ist **15408457974145**. | `dropship/CJ-IMPORT-LOG.md`, Zeile 31; Git-Blob `9af36c0e9ad735eec8133660a52fcc19f746f8e5` | Alte Hero-/Review-/Beschaffungsangaben dürfen nicht auf den ausgewählten Roller übertragen werden. Sie klären dessen rosa Bild gegenüber dem Text «tiefes Grün» nicht. |
| Die exakte SKU `LX-11-PREMIUM-BAMBUS-AROMA-DIF` ist im vorhandenen Matching-Test ausdrücklich der Fall **eigene SKU → keine CJ-pid**. | `automation/lib/grind_dubletten_test.mjs`, Git-Blob `672c30b38a0c09bdf038520c2625d295ffd7d3c8`; Implementierung `automation/lib/grind_dubletten.mjs`, Git-Blob `99313c041310d0d707a2c68b1830dcfd6641346d` | Keine automatisierte CJ-Produktzuordnung aus diesem LX-Code ableiten. Das ist eine Code-/Erkennungsregel, kein Nachweis, dass es keinen Lieferanten gibt. |
| Ein früher Gua-Sha-Titel wurde bereits am 30.05.2026 um den Marketing-Suffix «Premium Beauty Tools …» gekürzt. | `dropship/WEBSITE-KRITIK.md` im Commit `d37cf0379fbed2e9aeb5adc54523b49de08e4a6a` | Belegt eine historische Textbearbeitung nach Name, keine ursprüngliche Erstellung, Materialquelle oder harte ID-Zuordnung. |
| Frühe CJ-Importnotizen nennen andere konkrete Smartwatch-/Diffuser-SKUs und Modelle. | `dropship/PRODUKT-PIPELINE.md` im Commit `ee7034a4a4a2771141ab9d1dc003f532b39d3e54` | Ähnlich benannte Einzelgeräte dürfen nicht zu einem vermeintlich belegten Tech-Hero-Set zusammengesetzt oder dem 300-ml-Diffuser zugeordnet werden. |

## Produktbezogener Stand nach der neuen Prüfung

| Produkt | Konkreter Quellenanker | Weiterhin unbekannt |
|---|---|---|
| Tech Hero 15406765801857 / Variante 55728148054401 | `LXSCH-GIFT-TECH-HERO`; vorhandenes Hauptbild `tech-hero-gift-box-smartwatch-pro-anc.jpg`, MediaImage 69731158950273 | Ursprünglicher Seed-/Importauftrag, Lieferantenmodell, Anzahl und Identität tatsächlich gelieferter Geräte. Bild mit Ladestation und Geräten belegt keinen Setinhalt. |
| Diffuser 15408457744769 / Variante 55732479099265 | Exakte LX-SKU im genannten Negativtest der CJ-pid-Erkennung | Exaktes Modell und Datenblatt; insbesondere tatsächliches Material gegenüber Holz-/Bambusoptik. |
| Gua Sha 15408457941377 / Variante 55732479295873 | Historische Titeländerung nur nach Name; Bilder `rosenquarz-gua-sha-set-02.jpg` und `-04.jpg` als weitere Suchanker | Originaler Import und exakte Bild-/Modellzuordnung; Material, Masse, Gewicht, Setumfang. |
| Roller 15408457974145 / Variante 55732479328641 | Bild `jade-roller-premium-doppelseitig.jpg`, MediaImage 69731159376257; ältere ähnlich benannte Produktreferenz eindeutig andere ID | Tatsächlich lieferbare Farbe, Material und Setinhalt. Bildfarbe allein ist keine bestätigte Bestelloption. |

Es wurde kein neuer Seedcode, keine Erstellungs-Mutation und kein Lieferanten-Mapping für die vier exakten IDs gefunden. Das gilt ausschliesslich für die begrenzte Suche. Nichttreffer beweisen weder fehlende Lieferbarkeit noch das Fehlen eines Connectors. Generierte Texte, Pinterest-Copy, Mediennamen und SEO-Bearbeitungen wurden nicht als Material- oder Funktionsnachweis verwendet.

## Abdeckung und Ablage

- GitHub-Zugriff funktioniert für diese gezielten Reads. Geprüft: acht SKU-/Bild-/Handle-Code-Suchen, sieben begrenzte Commit-Suchen, drei Verzeichnisse jeweils eine Ebene und die daraus ausgewählten Dateien/Commits. Kein Clone und keine Massenpagination.
- Zwei Galerie-Retrofit-Dateien vom 31.05.2026 sowie der Produkt-Deepdive enthalten keinen Treffer für die vier exakten IDs oder Namen. Kein positiver Produktnachweis daraus abgeleitet.
- Die unabhängige lokale Code-Suche findet nur den bereits angelegten Textentwurfs-Generator. Weitere lokale Treffer stammen aus bekannten Export-/Triage-/Merchant-Dateien.
- [Repo-Belege mit Git-Blob-/Commit-SHAs, Zeilen und Abgrenzung](PRODUKTQUELLEN-URSPRUNG-BELEGE-20261029.json).
- [Lokale Suchabdeckung und Quellenhashes](PRODUKTQUELLEN-URSPRUNG-BELEGE-20261029.json), SHA-256 der verlinkten kombinierten Datei `d4835ee7dc51493132020365d51225a950d0d3a8152449e73aad6e342f1ec15a`.

Nächster sinnvoller Schritt ist eine eindeutige, legitime Originalzuordnung zwischen den vorhandenen Shopify-Varianten und einem Lieferantenartikel beziehungsweise ursprünglichen Importbeleg. Erst dieser Schlüssel erlaubt eine belastbare Abfrage von Setinhalt, Farbe, Material und Massen. Bis dahin bleiben die vorbereiteten Text-/SEO-Entwürfe zur Produktquellenprüfung gesperrt; eine neue Umschreibung würde diese Lücke nicht schliessen.
