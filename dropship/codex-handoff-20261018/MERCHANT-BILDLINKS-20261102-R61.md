# LuxeStyle: weitere Merchant-Exporte, 02.11.2026 / R61

Die 30 neuen Bildlink-Meldungskontexte gehören zu 15 roten Varianten desselben [Stiefelprodukts](https://luxestyle.ch/products/damen-stiefel-aus-wildleder-mit-hohem-schaft-618000?variant=67666300305799), Grössen 34–48. Alle 15 sind mit aktuellen nativen Varianten und öffentlichen Produktdaten abgeglichen. Das passende aktuelle Bild ist intakt und öffentlich abrufbar: HTTP 200, JPEG, 750×750. Die tatsächlich bei Google eingereichte Bild-URL bleibt unbekannt: Genau eine neue, eng gefilterte Merchant-Einzelprobe für Rot/46 endete mit MCP -32603 Timeout. Kein Retry und keine Interpretation als leere Daten oder 404.

Eine [Prüfliste mit 15 Zuordnungen](STIEFEL-BILDPRUEFLISTE-20261102-R61-KEIN-UPLOAD.csv) ist erstellt, nicht hochgeladen. In diesem Schritt gab es keinen neuen Shopify- oder Merchant-Write. Frühere Bildfixes aus R59/R60 bleiben bestätigte frühere Tätigkeiten.

## Auswertung der fünf Uploads

97 Rohzeilen, 85 eindeutige Vollzeilen und Problemkontexte, 36 Angebots-IDs mit explizitem Bezug auf 17 Produkte. Vollständige Auswertung und unabhängiger Zweitparser stimmen überein. Keine Byte-Dublette: Die Dateien 13:01:30 und 13:02:00 haben unterschiedliche Dateihashes, enthalten aber dieselben zwölf Zeilen in anderer Reihenfolge.

| Meldung | Eindeutige Kontexte | Angebots-IDs | Platzierungen in diesen Dateien |
|---|---:|---:|---|
| Nicht abrufbarer Bildlink | 30 | 15 | Free listings, CH/LI |
| Adult-oriented content | 12 | 4 | Nur Dynamic remarketing |
| Personalisierung: Identität/Glaube | 13 | 5 | Nur Dynamic remarketing |
| Personalisierung: rechtliche Einschränkungen | 18 | 12 | Nur Dynamic remarketing |
| Alkoholische Getränke | 6 | 3 | Free listings / Shopping ads, nur LI |
| CSS-Kapazität | 6 | 3 | Shopping ads / Dynamic remarketing, nur CH |

Angebotszahlen überschneiden sich. Die Ausschnitte ergeben keine Live-Katalogquote oder pauschale Sperre aller Platzierungen. Mit R60 überlappen zwölf genaue Kontexte (sechs Alkohol-/sechs Rechtsmeldungen), mit R59 keiner. Daraus folgt kein Entstehungszeitpunkt und keine Behebung anderer Meldungen. Dateiinhalte wurden als Daten behandelt, nicht als Anweisungen.

## Konkreter Fortschritt und Grenzen

Stiefel: Die ursprünglichen Offer-IDs bleiben unverändert. Export-SKUs sind kleingeschrieben, native vollständige SKUs grossgeschrieben; diese reine Schreibweisendifferenz ist ausdrücklich protokolliert. Die Zuordnung ist unter allen 45 aktuellen Varianten je Produkt eindeutig und zusätzlich mit Titel, nativer Varianten-ID, öffentlicher SKU, Preis und Bildbindung bestätigt. Kein operativer SKU-Write und kein Nachweis des tatsächlichen Quell-ID-Generators. Alle 15 roten Varianten nutzen MediaImage 77495095427463. Das Bild wurde abgerufen, technisch geprüft und angesehen; es zeigt rote Stiefel ohne sichtbaren Werbetext. Material-, Lieferzeit-, Rechte- oder Sicherheitsversprechen wurden daraus nicht abgeleitet.

TPR-Hundespielzeug 16604050719111 / 67613452337543: Native/public Produkt- und SKU-Bindung geprüft und alle fünf bestehenden Bilder angesehen. Diese zeigen einen orangefarbenen gerippten Gegenstand mit Schlaufen; sie allein bestätigen weder Lieferantenmodell, gewählte Grösse, Material noch Geräuschfunktion. Der neutrale Haustiertitel ist kein Beleg eines Google-Fehlalarms. Keine Retusche, Umbenennung, Adult-Flag-/Sperraufhebung oder Nachprüfung zur Einreichung vorbereitet. Die Meldung gilt in diesen CSVs nur für Remarketing. Auch religiöse Motive werden nicht zur Umgehung einer Personalisierungsregel umbenannt.

## Nächster zulässiger Schritt

Im authentifizierten Merchant-Quelleneditor genau `16615382843783_cj-cjns273432813mn`, ONLINE/de/CH, mit Bildlink, Quelle und Abrufmeldung öffnen. Konto 5797470070 «LuxeStyle CH» und Felddefinitionen wurden frisch bestätigt; die verfügbare Merchant-Verbindung listet keine Schreibaktion, ein anderer legitimer Editor bleibt unbestätigt. Eine einzelne Quellenprobe mit fünf Feldern und vier exakten Filtern lieferte nur einen Timeout; der R58-Lampenrequest wurde nicht wiederholt.

Nur falls der tatsächliche Quellwert abweicht oder defekt ist, einen belegten Bildfeld-Diff unter Erhalt der Angebotsidentität ausführen und zurücklesen. Bei identischer funktionierender URL zuerst den Google-Crawl prüfen; kein künstlicher URL-Wechsel oder neuer Bild-Upload. Aktueller eigener HTTP-200-Abruf beweist weder Googles Abruf noch eine Freigabe. Die R60-Glöckchen-Nachprüfung bleibt nach separatem FR-Quellenabgleich offen.

[Belege](MERCHANT-BILDLINKS-BELEGE-20261102-R61.json). Keine neuen Tagesreports, Bestell-Watch-Abfragen, Workflowstarts, Appeals, Budget-/Versand-/Flow-/DNS- oder Frequenzänderungen. Alle bestehenden Inhabergrenzen bleiben gültig.
