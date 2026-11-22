# R315 – CJ-Grind, Bewertungen und Metricool am Mittag

22.11.2026, Europe/Zurich. Shopify-Shop `94368563585`, `luxestyle.ch`, CHF, und CJ OAuth «LuxeStyle CH» `2605251603003533600` nativ bestätigt. Der Shopify-Host ist `au3j0y-hq.myshopify.com`. Der lokale CJ-Schlüssel ist ungebunden. Die vorhandene OAuth-Anbindung liefert Produkt-, Bewertungs- und Logistikdaten.

## CJ-Grind

Vier kleine Abfragen lieferten 22 Suchtreffer ohne Pagination. Drei Neu-Kandidaten vertieft geprüft. Die gezielte Shopify-SKU-Suche und der Grind-Importledger `86debd4b…` lieferten für die drei Kandidaten keinen Treffer. Ähnliche Produkte im Gesamtkatalog bleiben möglich. Drei aktuelle Originalbilder geladen und angesehen.

| Kandidat | CJ-SKU / PID | EK USD | CH-Fracht USD | Summe USD | Ergebnis |
|---|---|---:|---:|---:|---|
| Schnüffelmatte | CJJJCWGY03502 / 3E97EABC-D955-41CE-8C7D-1E7E9A6A0516 | 2.05 | 6.33 | 8.38 | CJ-Eigenbestand in CN 0, je Variante 10’000 unbestätigter Fabrikbestand, 0 CJ-Bewertungen. Kandidat für eine weitere Lieferprüfung. |
| Holz-Futterpuzzle | CJMY2109475 / 2408130817211607600 | 4.36 | 16.50 | 20.86 | 0 CJ-Bewertungen, nur unbestätigter Fabrikbestand. Hauptbild mit Marke «loobani» und Sicherheitsbehauptungen. Nutzungs- und Bezugsnachweis offen. |
| Vase | CJYD2830335 / 2604130527041615400 | 9.12 | 34.44 | 43.56 | 0 CJ-Bewertungen. Titel nennt Keramik, Materialfeld nennt Glas. Versand macht den grössten Teil der Kosten aus. Zurückgestellt. |

Die Fracht ist ein Länderangebot CN→CH je Gewicht und CJ-Logistikkategorie. Ziel-PLZ, Zoll, Steuern, Zahlungsgebühren und tatsächliche Zustellung sind darin nicht bestätigt. [CJ-Logistikdokumentation](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html)

**Bestehende Produkte.** Die Shopify-Variante `CJST258356401AZ` der Schnüffelspielzeuge wurde bei CJ exakt gefunden. USD 3.71 plus USD 7.20 Fracht, Shopify-Preis CHF 24.90, 0 CJ-Bewertungen. Projektor A kostet USD 14.23 plus USD 14.54 für das günstigste geprüfte CN→CH-Angebot mit CJ-Warenklasse BATTERY. Die Warenklasse gehört zur Produktgruppe. Die Ausstattung der USB-Ausführung wird daraus nicht abgeleitet. Shopify-Preis CHF 34.90. CJ meldete beim engen Verbindungsabgleich keinen Projektor-Eintrag für dieses Shopify-Produkt. Die SKU-Übereinstimmung allein bestätigt keine Fulfillment-Verknüpfung. Keine Importe oder Produktänderungen.

## Echte Bewertungen und eine Verkaufsaktion zur Freigabe

CJ liefert für Projektor-PID `1477820492730732544` vier unterschiedliche Kommentare mit 2, 3, 4 und 5 Sternen. Die Daten enthalten keine Varianten-ID und keinen Nachweis eines Kaufs bei LuxeStyle. Null beim bestehenden Hundeartikel und den drei Kandidaten ist der explizite Antwortwert der CJ-Abfragen. Der aktuelle Repo-Workflow setzt für den geplanten Betrieb `MIN_SCORE=1` und aktiviert den Quellenhinweis. Der direkte Script-Standard ist 4 Sterne, der Quellenhinweis dort optional. Kein Start und kein Import. [Workflow](https://github.com/allengchour-glitch/aban-news-landing/blob/main/.github/workflows/cj-reviews.yml)

Judge.me zeigt auf der Startseite 4,83 von 5 aus 12’573 Bewertungen mit einem Hinweis auf teilweise übernommene und übersetzte Herstellerbewertungen. Die mechanische Tastatur zeigt sechs Bewertungen, bei denen Judge.me `verified_buyer=false` liefert. Projektor, Walkie-Talkie, Elite-Controller und PulseFit zeigten in der Stichprobe keine veröffentlichten Einzelbewertungen. Die ausgelieferten Judge.me-Einstellungen verbergen unter anderem die Herkunftshinweise für fremde Anbieter und Shop-Besucher.

**Eine Aktion zur Freigabe.** Die Judge.me-Herkunftshinweise für importierte Bewertungen und Shop-Besucher einblenden. Danach Tastatur und eine Seite ohne Bewertungen auf Handy und Desktop prüfen. Käuferkennzeichnungen sollen weiter nur den bestehenden App-Nachweis verwenden. Authentifizierter App-Schreibzugang war in diesem Lauf nicht verfügbar. [Judge.me-Anleitung](https://judge.me/help/en/articles/11136451-review-transparency-badges)

## Metricool

`6227837`, `Europe/Zurich`, Instagram/Threads/TikTok `luxestyle.ch`, Facebook `1049840534888592`, Pinterest `luxestyleCH`, YouTube `UCSfCEYjAsdOyYxyfTClXRZA` bestätigt. 22.–29.11. in acht Tagesabfragen gelesen. 37 Objekte, 15 Entwürfe. Die 22 aktiven Planungsobjekte haben 25 ausstehende, zwei veröffentlichte und einen fehlerhaften Kanalzustand. Keine exakten UUID-, Caption-, Medien-URL- oder Kanalzeit-Dubletten. Die Gesamtvergangenheit und Dateigleichheit unter anderer URL bleiben unbekannt.

- Heute 13:00 Uhr wurden die bereits geplanten Wassersäulen-Beiträge kanalbezogen veröffentlicht. [TikTok](https://www.tiktok.com/@luxestyle.ch/video/7710964953187994912) · [YouTube](https://www.youtube.com/shorts/Gt0FkdqJfRo)
- Threads 11:00 Uhr Christbaumdecke, `426962312` / `7447187506709285656`, bleibt `ERROR`. Zwei frische Abrufe der Shopify-Medien-URL lieferten HTTP 200 und dasselbe dekodierbare JPEG 1080 × 1350. Ursache der Plattformstörung unbekannt. Rechte- und Duplikatbeleg für einen weiteren Push fehlen.
- Heute ausstehend Instagram und Facebook 17:00 und 20:30, TikTok 18:00, Pinterest 20:00. 23.–24.11. alle sechs Kanäle belegt. 25.11. nur Threads 11:00. 26.–29.11. alle sechs offen. Keine neue Terminierung.
- Kennzahlen wurden heute früh gelesen. Klaviyo verlangte im Morgenlauf eine Neuverbindung. Flow-Daten bleiben unbekannt. Die vier genehmigten DNS-Records waren bei der heutigen öffentlichen Gegenprobe nicht nachweisbar, der authentifizierte DNS-Schreibzugang fehlte. [Morgenbericht](R313-MORGENLAUF-20261122.md)

## Weiter am einen Master

`luxe_sternenprojektor_master_20261018`. Shopify `15521256604033`, aktive Variante `68122445283719` mit `CJSN139239101AZ`, CHF 34.90, nativ und öffentlich verfügbar. Tracking aus, `inventoryPolicy=CONTINUE). Zwölf nichtleere Tags. Frischer Kanalwächter `3adab736…` plus gesondertes `rueckhol` ohne Treffer.

CJ-Ausführung A-USB aktuell SKU- und VID-genau belegt (`1477826312449167360`). CJ- und Shopify-Foto zeigen dasselbe Motiv bei 800 × 654 und demselben Dateinamen. Beide Bilder wurden dekodiert. Byte-Hashes weichen ab, der Bildvergleich ergab zwei abweichende Bits von 1’024 und eine mittlere RGB-Abweichung von 1,57 auf 255. CJ-Video-ID `1602963697889193984` nur auf Produktebene. Der nächste Drehschritt ist der durchgehende Hochformattake mit belegtem Modell A, sichtbarer Bedienung und realer Projektion. Film-/Bearbeitungs-/Werberechte, Hörabnahme und Master-MP4 fehlen. Musik ausschliesslich `automation/music/luxe-premium.wav` nach Rechteprüfung, ohne Voiceover. [Originalfoto Variante A](https://cdn.shopify.com/s/files/1/0943/6856/3585/files/752b9e0c-e2c0-40d0-a56a-1ae8aa4c2a15.jpg?v=1788153090)

18 Sekunden, 1080 × 1920, 30 fps, Taupe/Cream. 0–2 s echte Raumprojektion «Dein Raum. Neues Licht.» oder Gerätefront «Licht im Detail.». 2–5 s belegte Bedienung «Grundmodell A». 5–9 s Stütze, Front und Kabel «USB-Ausführung». 9–13 s belegtes Wandmotiv «Licht im Raum». 13–16 s Gerät und Wand im selben Bild «Ausführung A». 16–18 s CTA «Produkt ansehen». Die fünf Schnitt-Prüffenster aus R313 bleiben Drehreferenz.

| Kanal | Textentwurf | Produktziel |
|---|---|---|
| Instagram Reels | Ein Blick auf das USB-Grundmodell A. So wirkt das Licht im Raum. | Link in Bio erst angeben, wenn das konkrete Profilziel bestätigt wurde. [UTM-Link](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=instagram&utm_medium=organic_social&utm_campaign=sternenlicht_master_18s&utm_content=master_a_instagram) |
| TikTok | Ein Handgriff und Licht an der Wand. So sieht Grundmodell A aus. | Link in Bio erst angeben, wenn das konkrete Profilziel bestätigt wurde. [UTM-Link](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=tiktok&utm_medium=organic_social&utm_campaign=sternenlicht_master_18s&utm_content=master_a_tiktok) |
| YouTube Shorts | Sternenlicht-Projektor A im Einsatz | Kanal-Link. Zielgruppe am neuen Master vor Veröffentlichung bestätigen. [UTM-Link](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=youtube&utm_medium=organic_social&utm_campaign=sternenlicht_master_18s&utm_content=master_a_youtube) |
| Facebook | So sieht das Grundmodell A im Raum aus. Die Angaben zur USB-Ausführung findest du auf der Produktseite. | Produktlink im Beitrag. [UTM-Link](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=facebook&utm_medium=organic_social&utm_campaign=sternenlicht_master_18s&utm_content=master_a_facebook) |
| Threads | Würdest du zuerst die Bedienung sehen wollen oder das Licht im Raum? Hier ist Grundmodell A. | Produktlink im Beitrag. [UTM-Link](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=threads&utm_medium=organic_social&utm_campaign=sternenlicht_master_18s&utm_content=master_a_threads) |
| Pinterest | Sternenlicht-Projektor A fürs Schlafzimmer | Pin-Ziel. Vor einem Write Kontoboard und Medienrechte frisch bestätigen. [UTM-Link](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?variant=68122445283719&utm_source=pinterest&utm_medium=organic_social&utm_campaign=sternenlicht_master_18s&utm_content=master_a_pinterest) |
