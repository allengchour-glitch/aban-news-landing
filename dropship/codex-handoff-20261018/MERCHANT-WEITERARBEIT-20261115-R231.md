# Zwei Merchant-Bildfehler nach Freigabe behoben – R231, 15.11.2026

**Nagellack Modell 7 und 11 sind korrigiert und von Google wieder genehmigt.** Nach der ausdrücklichen Bestätigung kommerzieller Bearbeitungs-/Werberechte sowie Produkt-/Farbtreue wurde nur das Hauptbild dieser zwei bestehenden deutschen Angebote ersetzt. Zwei Writes, keine Retries, keine neuen Angebote, Quellen oder Regeln.

| Modell | Bestehendes Angebot / Variante | Bestätigter Zustand |
|---|---|---|
| 7 | shopify_ZZ_15448834736513_67652260462983 / SKU CJYD273330507GT | neuer textfreier PNG-Link; keine itemLevelIssues; CH/LI in allen sechs zurückgelieferten Google-Kontexten genehmigt |
| 11 | shopify_ZZ_15448834736513_67652260594055 / SKU CJYD273330511KP | neuer textfreier PNG-Link; keine itemLevelIssues; CH/LI in allen sechs zurückgelieferten Google-Kontexten genehmigt |

Quelle: accounts/5797470070/dataSources/10667445201, Sprache de, Feedlabel CHF_99383214465. Die endgültige direkte Rücklesung erfolgte am 15.11.2026 um 10:16:22UTC / 11:16:22EuropeZurich. Ein wörtlicher Attributvergleich bestätigt: ausschliesslich imageLink ist anders; sämtliche übrigen productAttributes sind unverändert. Die frischen Shopify-Varianten/Medien stimmen mit den freigegebenen Bildlinks überein. Die früheren Modell 1/6-Änderungen wurden nicht wiederholt.

Die unmittelbaren Nachlesungen zeigten noch alte Bilder/Ablehnungen. Deshalb wurden die Writes nicht erneut gesendet. Erst die verzögerte Rücklesung derselben Ressourcen bestätigte Übernahme und Google-Genehmigung. Das ist keine Bestätigung von Ads-Auslieferung oder Verkäufen.

## Weitere Fehler bleiben offen

Der gezielte Stand VOR diesen zwei Writes umfasst48 eindeutige abgelehnte Angebote aus vier Seiten zu je12 Zeilen, mit weiterem Cursor:

| Grund | Angebote im gelesenen Vorher-Ausschnitt |
|---|---:|
| Unerwünschte Bildeinblendungen |32|
| Fehlender Preis |5|
| Fehlende Verfügbarkeit |2|
| Guns/Parts-Richtlinie |4|
| Tobacco-Richtlinie |3|
| Landingpagefehler |1|
| Lokale Anforderungen |1|

Diese Zahlen sind keine vollständige Katalogzählung und nach den zwei Bildkorrekturen keine neue globale Fehlerzahl. Beide betroffenen Zeilen sind in der Arbeitsliste mit ihrer bestätigten Genehmigung ergänzt. Account-Issues lieferte[], was keinen fehlerfreien Produktfeed beweist. Keine negativen historischen Windsor-Zähler verwendet und keine Fehler bloss durch globale Löschung/Ausschluss verborgen.

### Quellenbezogene nächste Fälle

- **Waage, Variante 68193799242119:** Eingereichte URL aktuellHTTP 200; dieselbe Variante und SKU CJZN170995619SH in Shopify sowie im ProductGroup-Markup, PreisCHF127.90 wie im Merchant-Angebot. Google meldet weiterlanding_page_error. Tatsächlicher Google-Abruf unbekannt; kein aktuell kaputter Link in dieser öffentlichen Gegenprobe belegt. availability_updated ist separatNOT_IMPACTED. Nachprüfungsentwurf vorbereitet, keine willkürliche URL-/Preis-/Bestandsänderung.
- **Wandleuchten-Offer 10018213324745296287:** Direkte QuelleAUTOFEED10678939025,price fehlt in Googles Attributsatz. Ein deutsches Angebot verlinkt diefr-Seite mitlang=fr und «noindex, follow». DieHTTP 200-Seite enthält bereits sechsCHF-Variantenangebote. Damit kein allgemeines Shopify-Preisloch und keine Rechtfertigung, den Preis einer beliebigen Variante einzusetzen. Der API-Writer kann dieseAUTOFEED-Einzelquelle nicht direkt bearbeiten. Kein Noindex-/Sprachguard entfernt, keine neue Override-Quelle oder Quellenregel angelegt.
- **Blaue Bluetooth-Pedometer-Uhr:** Direkter Google-Datensatz hat bereits Kategorie 201, ProdukttypUhren, ein echtes Uhrenbild und eine erreichbare passende Seite mit Variante67814784041351/SKU CJXFZNZN00056-Blue/CHF 20.90. Die Waffenmeldung begründet eine konkrete Nachprüfung, keinen pauschalen Freispruch. Belegter Entwurf ist vorbereitet; verbundenen Tools fehlt die tatsächliche Review-/Reprocess-Aktion. Keine Umbenennung zur Umgehung. Andere Waffen-, Tabak- und lokale Fälle brauchen eigene Produkt-/Policy-Belege.

## Prüfung und technische Grenzen

Shopluxestyle.ch/CHF/EuropeZurich, Metricool6227837 mit sechs Kanalidentitäten und Merchant5797470070/LuxeStyleCH wurden frisch bestätigt. Vor den zwei Writes wurden native Varianten/Medien und exakte Google-Ressourcen nochmals gelesen. Nur bestehende Angebote in der bestätigtenAPI-Primärquelle wurden aktualisiert; keine Datenquelle ausgetauscht.

Zwei begrenzte Windsor-Produktabfragen liefen inMCP-Timeouts. Sie sind nicht leer/404 und wurden nicht mitforce_refresh, Upgrade oder blindem identischem Retry umgangen. Die direkteHYPD-Gegenprobe lieferte die tatsächlichen fünf Zielangebote. Ein wegendeprecatedimages/image-Feldern zurückgewiesener nativer Read führte keinen Abruf aus; eine gültigeMedia-Query für zwei Produkte sowie der aktuelle Prewrite-Read gelangen. Nagellackvariantenausschnitt15 mit weiterem Cursor; beide Ziele sind darin vorhanden, keine Massenpagination.

Vier Quellenprofile wurden ohne Cache-/Fetchzeitstempel zurückgeliefert; die tatsächliche Quellbindung der Einzelangebote wurde deshalb unabhängig direkt gelesen. Der natürliche Ressourcenpräfix wurde anhand eines echten Listen-Kontrollobjekts verifiziert; Produktkomponenten stammen aus aktuellen Disapproved-IDs, alle zurückgelieferten Offer-/Sprach-/Feedlabel-/Source-Identitäten separat geprüft. Keine numerischeAUTOFEED-ID als Shopify-GID behandelt.

Keine neuen Tagesleistungsberichte, GSC-/Klaviyo-/Funnelreads, Bestell-Watch oder Automation. Keine Produkt-, Theme-, Social-, Flow-, Budget-, Rabatt- oder DNSänderung. VersandCHF50/CHF 45 und Kundendomäne erhalten. R230-Theme-Publish bleibt eine separate offene Frage; die Modell 7/11-Bildbestätigung ist keine Themefreigabe.24 Aufgaben-IDs und Historien erhalten; Claude-Empfang unbekannt.

## Tagesergänzung

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Identität / Fortsetzung | Core4/Tagesblock sowie LuxeStyle-Shop, Metricool und Merchant-Konto frisch geprüft; vor den Writes Shop-/Varianten-/Google-Gegenprobe | Revision230 fortgesetzt. luxestyle.ch/CHF/EuropeZurich, Marke6227837 und Merchant5797470070 passen. Andere Marken nicht bearbeitet. |
| Merchant-Diagnose | Vier gezielte Disapproved-Seiten mit je12 Zeilen und eine Kontoissue-Abfrage gelesen | Vor den Writes48 eindeutige Offers:32Overlay,5Preis,2Availability,4Guns,3Tobacco,1Landingpage,1Local; weiterer Cursor vorhanden. Keine Vollzahl/Quote. Kontoissues-Response leer, Produktfehler bleiben. |
| Zwei Bildfehler behoben | Nach neuer ausdrücklicher Rechte-/Farbfreigabe nur image_link bei Modell 7 und11 der vorhandenen deutschen Nagellackangebote aktualisiert | API10667445201, de/CHF_99383214465. Zwei Writes, keine Retries/neuen Offers/Quellen. Native Medien und exakte Google-Vorwerte frisch geprüft; alle übrigen Produktattribute bei der Rücklesung unverändert. |
| Google-Ergebnis bestätigt | Unmittelbare alte Rücklesung dokumentiert; nach kurzer Verarbeitung dieselben zwei Ressourcen erneut gezielt gelesen | Am15.11.10:16:22UTC/ 11:16:22Zürich neue PNG-Links bestätigt, itemLevelIssues leer, CH/LI in jeweils allen sechs gelieferten Google-Zielkontexten genehmigt. Keine Ads-Auslieferung oder Verkäufe daraus abgeleitet. |
| Link / Preisquelle | Exakte Merchant-Links der Waage und Wandleuchte öffentlich gelesen und Markup/Quelle verglichen | BeideHTTP 200. Waage68193799242119 hat nativ, im Schema und beiGoogleCHF127.90; Ablehnung bleibt offen. Wandleuchte ausAUTOFEED10678939025 hat keinen Google-price und verlinkt als de-Offer eine fr/noindex-Seite mit vorhandenen Variantenpreisen. Keine Preis-/Bestands-/Noindexänderung. |
| Policy / Nachprüfung | Blaues Uhrenangebot, tatsächliches Bild und Zielseite gegengeprüft; drei Nachprüfungs-/Quellendossiers vorbereitet | Uhr bereits Kategorie 201/ProdukttypUhren, Bild zeigtArmbanduhr; SeiteHTTP 200 und gleiche Variante/CHF 20.90. Google-Waffenmeldung bleibt offen; keine künstliche Umbenennung/Entsperrung. Kein Review-Schreibwerkzeug für Einreichung vorhanden. |
| Fehler / Zugriff | Zwei Windsor-Timeouts und abgewiesene deprecated Bildfelder dokumentiert; HYPD-Direkt-/Media-Gegenproben genutzt | Keine Timeout/Quota/Auth-Fehler als leer/404. Kein force_refresh/Upgrade. Bestehender Writer nurAPI-Quellen; AUTOFEED-Einzeleditor und Google-Review/Reprocess fehlen. Keine weitere Quelle/Regel/Installation. |
| Memory / Grenzen | Arbeitsliste, Bildhashes, Ownerfreigabe, Writes und Rücklesungen dokumentiert;24IDs/Historien erhalten | Nur zwei Merchant-Bildfelder geändert. Keine Produkt-/Theme-/Social-/Flow-/Budget-/Rabatt-/DNSänderung, keine Order-Watch oder Tagesreportwiederholung. Andere Fehler und R230-Theme-Publish bleiben getrennt offen. Claude-Empfang unbekannt. |

## Belege

- [Bildfreigabe, genaue Writes und bestätigte Rücklesungen](MERCHANT-BILDWECHSEL-20261115-R231.json)
- [Vorher-Teildiagnose](MERCHANT-DIAGNOSE-20261115-R231.json) · [Arbeitsliste mit zwei bestätigten Erledigungen](MERCHANT-ARBEITSLISTE-20261115-R231.csv)
- [Gepinnte Prüfbilder Modell 7](NAGELLACK-MODELL-7-PRUEFBILD-20261115-R231.png) / [Modell 11](NAGELLACK-MODELL-11-PRUEFBILD-20261115-R231.png)
- [Weitere Quell-/Nachprüfungsdossiers](GOOGLE-NACHPRUEFUNG-20261115-R231.md) · [Rohquellen/Gegenproben](MERCHANT-QUELLBELEGE-20261115-R231.json)
- [Laufbeleg](MERCHANT-WEITERARBEIT-20261115-R231.json)
