# Sechs Produktseiten mit besserer Auswahlhilfe – R242

Stand 15.11.2026, Europe/Zurich. **Sechs Beschreibungen und sechs SEO-Beschreibungen live geändert und nativ sowie öffentlich bestätigt.**

| Produkt | Konkrete Verbesserung |
|---|---|
| [Retro Handheld-Konsole 4-Zoll HD-Bildschirm](https://luxestyle.ch/products/retro-handheld-konsole-4-zoll-hd-bildschirm-618400) | Vier Farb-/Speicher-Ausführungen erklärt; GB-Zahl von Spieleinhalt getrennt. |
| [Mini Klapp-Handheld Konsole](https://luxestyle.ch/products/mini-klapp-handheld-konsole-2c63e9) | Orange/Gelb und Anschlüsse erklärt; ungesicherte Aussage «interner Speicher» korrigiert. |
| [Retro Handheld Konsole mit 500 Spielen](https://luxestyle.ch/products/retro-handheld-konsole-mit-500-spielen-917314) | 500-Spiele-Angabe gegen CJ bestätigt; konkrete Titel und zusätzliche Controllerzahl offen ausgewiesen. |
| [Retro 8-Bit Mini-Konsole mit 620 Spielen](https://luxestyle.ch/products/retro-8-bit-mini-konsole-mit-620-spielen-613200) | Standardkonfiguration von B4-Controller-Auswahlen getrennt; AV-Anschluss und Packliste erklärt. |
| [Moderne minimalistische Wandleuchte](https://luxestyle.ch/products/moderne-minimalistische-wandleuchte-622600) | Sieben Gehäusefarben × drei Lichtausführungen sowie eine Leuchte pro Auswahl erklärt. |
| [Französisch-stil Deckenleuchte mit Sand-Textur & Wellenrand](https://luxestyle.ch/products/franzosisch-stil-deckenleuchte-mit-sand-textur-617000) | Lichtfunktion hinter «Farbe» und Grössenwahl erklärt; Schirmmaterial von Glaskeramik auf belegtes Glas korrigiert. |

Die neue Inhabervorgabe betrifft auch andere Produkte: Der weiterzuführende Qualitätsstandard umfasst verständliche Einleitung, echte Unterschiede der Ausführungen, bestätigte Produktmasse/Materialien/Anschlüsse, passenden Lieferumfang und kaufrelevante offene Angaben. Erste Nicht-Konsolen dieses Laufs sind die beiden Leuchten. Der gesamte übrige Katalog ist damit nicht fertig überarbeitet.

## Prüfung und tatsächliche Writes

Vor jedem der sechs seriellen Product-Updates wurde derselbe vollständige Produktstand frisch gegengeprüft. Payload: id,descriptionHtml,seo mit frisch erhaltenem bisherigen title und neuer description. Native Rücklesung bestätigt die Änderungen; alle übrigen gelesenen Felder sind identisch. **40 Varianten,48 Medien, Preise, SKUs, Barcodes, Optionswerte, Bestand/Tracking/Policies, Tags und SEO-Titel bleiben erhalten.** Rueckhol-Sperren bleiben wirksam; keine Social-Freigabe abgeleitet.

Alle sechs öffentlichen Produktseiten und JSONs lieferten HTTP200. Neue Beschreibungen entsprechen dem nativen Stand, Meta-Descriptions sind korrekt, Canonicals passen. Geschützte öffentliche JSON-Daten vor/nach sind hashgleich. Das ist keine Messung von Google-Übernahme, Ranking oder zusätzlichen Verkäufen.

CJ: sechs gezielte Produktreads, keine Suche/Massenpagination, keine Verbindungs-, Beschaffungs- oder Bestelländerung.21/21 Wandleuchten-SKUs und6/6 Deckenleuchten-SKUs passen; Produkt- und Verpackungsmasse nicht vermischt. Bei der500er-Konsole bestätigt die Quelle die500-Spiele-Angabe und alle acht nativen Bilddateinamen; lokale SKU nutzt die PID statt Varianten-SKU. Dieser Formatunterschied wurde nicht geändert und beweist keinen defekten Connector.

Ein strikt bytegleicher Vergleich stoppte nach dem ersten R36-Write, weil Shopify Formatierungszeilen zwischen HTML-Tags ergänzt. Write-Rückgabe und native Rücklesung waren bytegleich; nur Whitespace zwischen benachbarten Tags unterschied sich vom geplanten HTML. Inhalt und geschützte Felder stimmen. Danach weitere fünf serielle Writes; **kein R36-Retry und kein unklarer Doppelwrite**.

Veraltete pauschale Rabatt-/Lieferzeit-/Werbeabsätze wurden in diesen sechs Beschreibungen und SEO-Texten durch Produktinformationen ersetzt. Tatsächliche Rabatt-, Versand-, Shop-, Zahlungs- oder Rückgabeeinstellungen wurden nicht geändert. CHF50 öffentlich/CHF45 intern und Kundendomäne bleiben erhalten.

## Weiterarbeit

32 der ursprünglich36 Konsolen-/Kombigeräte sind nicht in diesem Lauf redaktionell geändert worden. Pro nächster kleiner Gruppe frische SKU-/Quellen-/Varianten-/Bild-/Kaufbarkeitsbasis und exakten Diff prüfen. Dasselbe Muster für weitere Produktarten anwenden, mit jeweils sachlich passenden Auswahlkriterien. Keine erfundenen Angaben, pauschalen Massenwrites oder ungeprüften Produkt-/Kanalaktivierungen.

[Vorher/Nachher und Prüfbelege](PRODUKTDETAILS-AUSWAHL-LIVE-20261115-R242.json) · [Redaktionsstandard](KATALOG-DETAILSTANDARD-20261115-R242.md) · [Fortsetzungsstand der36 Konsolenangebote](KONSOLEN-DETAILARBEIT-20261115-R242.csv). Claude-Empfang unbekannt.
