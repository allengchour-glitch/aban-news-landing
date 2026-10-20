# LuxeStyle: Abendpaket 20.10.2026

Stand: 19:20–19:30 Europe/Zurich. Fortsetzung der begonnenen Verkaufsprüfung vom Nachmittag. Nur belegte eigene Arbeit; bestehende Fremdabläufe sind separat ausgewiesen. Kein eigener Social-, Shop-, Feed-, Flow-, Rabatt-, Budget- oder DNS-Write, kein Kundenkontakt, kein kostenpflichtiger Render.

## Wichtigste neuen Ergebnisse

1. **Konkrete Suchlücke eingegrenzt:** Der aktive Paperang-Fotodrucker fehlt bei den gewöhnlichen Shopanfragen `mini fotodrucker` und `paperang`, erscheint aber bei der exakten Phrase `"mini-fotodrucker"`. Keine pauschale Deindexierung: direkte Seite erreichbar, `seo.hidden` in der aktuellen Admin-Abfrage null. Die Ursache der unterschiedlichen Suchtreffer bleibt offen.
2. **Warenkorb-Textkorrektur vorbereitet:** Der ausgelieferte Versandbalken verspricht ohne Lieferlandprüfung «Gratis-Versand gesichert» und «Du zahlst». Ein enger lokaler Diff kennzeichnet dies als Schweiz-Schätzung und verweist auf die endgültige Kassenberechnung sowie die LI-Versandbedingungen. Fünf lokale Renderingfälle bestanden. Keine Tarife geändert; die bereits bekannte CHF-40.50-/CHF-45-Abweichung muss vor Anwendung abgeglichen werden.
3. **Master-Quellenprüfung verbessert:** Der lokale CJ-Parser erhält jetzt echte zurückgelieferte Varianten und verlangt eine eindeutige Auswahl. Unlesbare Exporte und ausdrücklich gekürzte Antworten bleiben unbekannt. 14 Offline-Tests bestanden. Keine CJ-Ausführung, keine Filmrechte und keine fertige MP4 daraus.
4. **Planung frisch geprüft:** 131 Objekte, 113 PENDING und 18 mit PUBLISHED-Meldung, keine Entwürfe. Am 26.10. keine Planung auf den sechs Kanälen. Kein eigener Post angelegt oder geändert.

## Frisch bestätigte Identitäten und Produkte

Shopify: LuxeStyle, `https://luxestyle.ch`, Shop `94368563585`, CHF, Europe/Zurich. Metricool: Marke `6227837`, Europe/Zurich; Instagram/Threads/TikTok `luxestyle.ch`, Facebook `1049840534888592`, Pinterest `luxestyleCH`, YouTube `UCSfCEYjAsdOyYxyfTClXRZA`. Alle erwarteten Identitäten passend.

| Produkt | Aktueller begrenzter Befund | Ausspielung |
|---|---|---|
| Sternenlicht-Projektor, Produkt 15521256604033, Variante 56197916361089 | ACTIVE; CHF 34.90; acht nicht leere Tags; keine Sperrmustertreffer; availableForSale=true, tracked=false, CONTINUE. Öffentliche Variante und echtes Bild HTTP 200. | Tagprüfung bestanden; Master-/Rechte-/Kanal-/Historienfreigaben fehlen weiterhin. |
| Mini-Fotodrucker Paperang, Produkt 15449432162689 | ACTIVE; Grundmodell 55881799729537 CHF 31.90; CHF 15.90 sind ausschliesslich Papier-Ausführungen. Sieben Varianten kaufbar, tracked=false, CONTINUE. Öffentliche Varianten und echtes Bild HTTP 200. | `rueckhol-0907` blockiert neue Social-Ausspielung nach Inhabervorgabe. Tag und Kanalzuordnung unverändert. |

Lagerzähler 0 ist bei diesen geprüften Einstellungen kein Ausverkaufsbeweis. Keine Lager-, Funktions- oder Lieferzeitgarantie daraus ableiten.

Der aktuelle Repo-Wächter `automation/lib/kanal_sperren.mjs`, Blob `3adab7369f90945769331910525c08b3778b4371`, wurde tatsächlich angewandt, ergänzt um jedes `rueckhol` sowie die Sperre bei leeren Tags.

## Eine klar umrissene Verkaufsaktion zur Freigabe

**Priorität: eine gezielte Suchverbesserung für den bestehenden Paperang-Artikel vorbereiten.** Keine neue Produktseite, keine pauschale Kanalaktivierung und kein Rabatt.

| Shopanfrage | Beobachtete vollständige Ergebnisliste | Paperang-Zielartikel |
|---|---|---|
| `mini-fotodrucker` | 11 Artikel, Nachmittagsbeleg 16:04 | fehlt |
| `"mini-fotodrucker"` | 1 Artikel, Abendgegenprobe 19:22 | vorhanden |
| `mini fotodrucker` | 16 Artikel, Abendgegenprobe 19:22 | fehlt |
| `paperang` | 2 Artikel, Abendgegenprobe 19:22 | fehlt |

Alle vier Antworten HTTP 200; keine nächste Seite in den untersuchten Ergebnislisten. Die zwei Abendanfragen ohne Treffer für das Zielprodukt liefern andere Artikel. Dieser Befund beweist weder ein Google-Rankingproblem noch eine generelle Sperre des Artikels.

**Enger Freigabeumfang:** In Shopify Search & Discovery zunächst vorhandene Boosts/Synonyme für genau diese drei unzitierten Suchbegriffe lesen. Falls dort keine absichtliche gegenteilige Regel besteht, ausschliesslich den vorhandenen Artikel `15449432162689` für `mini-fotodrucker`, `mini fotodrucker` und `paperang` gezielt hervorheben. Vor dem Write Originalzustand sichern und konkreten Diff prüfen; nachher dieselben vier Suchanfragen gegenlesen. Die Produktkarte muss klar zwischen Drucker ab CHF 31.90 und Papier CHF 15.90 unterscheiden. Preis-/Kartendarstellung vor Umsetzung als zusätzliche Voraussetzung prüfen.

Der aktuelle App-Konfigurationsstand wurde nicht gelesen; diese Aktion ist ein konkreter Freigabeentwurf, noch kein ausführungsfertiger Konfigurationspatch. Keine Synonymgruppe erfunden oder aktiviert. `rueckhol-0907`, Shop-/Feed-/Social-Kanäle und Preiswerte bleiben unangetastet.

Shopify dokumentiert sowohl exakte Phrasensuche als auch gezielte Suchbegriff-Boosts. Das begründet den vorgeschlagenen Prüfweg, nicht die noch unbekannte Ursache im konkreten Shop: [Suchverhalten](https://help.shopify.com/en/manual/online-store/storefront-search/search-behavior), [Suche mit Search & Discovery anpassen](https://help.shopify.com/en/manual/online-store/storefront-search/search-and-discovery-modify-search).

## Warenkorb und mobile Kaufstrecke

Der relevante öffentliche Warenkorb-JavaScript-Block war zwischen 16:03 und 19:22 bytegleich, SHA-256 `5ebca0596a73d23d8f1c9f8e025ec8c36e07a9f2d088afd01b35a5f2d3e7ab1a`. Seine Berechnung setzt Gratisversand unter anderem ab 4050 Rappen nach Rabatt und kennt in dieser Funktion kein Lieferland. Die öffentliche Versand-Policy nennt Liechtenstein CHF 14.90 ohne Gratisversand. Daraus folgt ein fehlender Ländervorbehalt im Textbaustein; ein falscher tatsächlicher Checkouttarif ist damit nicht bewiesen.

Der lokale Textdiff entfernt das unbedingte Zahlungsversprechen und ergänzt: «Versandkosten und Endbetrag werden an der Kasse bestätigt. Für Liechtenstein gelten andere Versandbedingungen.» Er verändert keine Berechnung. Fünf synthetische Fälle wurden gegen den tatsächlich extrahierten Vorher-/Nachher-Code ausgeführt. Vor Live-Anwendung müssen Theme-Quelldatei, parallele Warenkorb-Zusammenfassung und aktuelle Tarife gemeinsam geprüft werden. Öffentliche CHF 50 und interne CHF 45 nach Rabatt bleiben die verbindliche Inhabervorgabe.

Eine frische mobile Chromium-Beobachtung bei 390 × 844 zeigte den Hauptknopf «In den Warenkorb legen» aktiv, mit richtiger Variante und unverdecktem Mittelpunkt; kein horizontaler Überlauf. Screenshot visuell geprüft. Cookiebanner berührt den zusätzlichen Shop-Pay-Bereich, der Hauptknopf bleibt frei. Nur lesende GET/HEAD-Aufrufe zugelassen; 79 Tracking-/Fremd-/Write-Aufrufe bewusst blockiert. Daraus entstandene Fetch-Fehler sind kein Nachweis eines normalen Shopfehlers. Keine Formulareingabe, Warenkorbmutation, Zahlungsprüfung oder Bestellung.

## Derselbe offene Produktfilm

Master-ID: `luxe_sternenprojektor_master_20261018`. 18 Sekunden / 540 Frames, 1080 × 1920, konstante 30 fps. Premium, clean, taupe/cream; reale Handlung, kontrolliertes Licht, unverfälschte Produktfarben. Kein Voiceover. Das folgende Storyboard wird fortgeführt und nicht als neu gerenderter Film ausgegeben.

Echte frisch gegengeprüfte Bildreferenz: [Projektorbild aus Shopify](https://cdn.shopify.com/s/files/1/0943/6856/3585/files/680d1ad3-95b3-47bd-9522-899efd79a301.jpg?v=1788153090), SHA-256 `bb5526ce54c7eca8ac2bb38bb720d53a590a97e6df5bc1904de9cef8e8544b5d`. Weisses rundes Gerät im Bügel, schwarze Sternenhaube und echte Bedienelemente; kein Beleg für enthaltene Motivsets oder Lieferantenfilmrechte.

**Hook A:** «Dein Raum. Neues Licht.» — reales, zur verkauften Variante gehörendes Projektionsergebnis.

**Hook B:** «Licht im Detail.» — echte Nahaufnahme der Bedienung, Handbewegung wird im Anschluss fortgesetzt.

| Zeit / Frames, Ende exklusiv | Aufnahme und Schnitt | Overlay |
|---|---|---|
| 0–2 s / 0–60 | Eine gewählte Hook-Fassung, reale Projektion oder Bedienungsnähe | Hook A oder B |
| 2–4.6 s / 60–138 | Hand nähert sich dem echten Bedienelement, Gerät identifizierbar | Sternenlicht-Projektor |
| 4.6–7.6 s / 138–228 | Nachvollziehbare reale Bedienung, keine erfundene Reaktion | Aus der Nähe entdecken. |
| 7.6–12.4 s / 228–372 | Passendes echtes Projektionsergebnis | Für besondere Lichtmomente. |
| 12.4–14 s / 372–420 | Präzise Gehäuse-/Lichtdetailaufnahme; keine Haube abheben | Kein neuer Text |
| 14–18 s / 420–540 | Vollständiges passendes Gerät als ruhige Schlussaufnahme | Produkt ansehen · CHF 34.90 · luxestyle.ch |

Die am Morgen korrigierten Mindestaufnahmen bleiben gültig: Bedienung mindestens 8 nutzbare Sekunden, Projektion mindestens 7, jeweils zusätzlich 1 Sekunde Vor- und Nachlauf. Für den Schluss fehlen vier passende echte Sekunden mit sichtbarem Gerät. Die alte Projektionsquelle erfüllt diesen Schluss nicht.

Frische begrenzte Shopify-Abfrage: genau ein Produktvideo, `77496185356679`, READY, Original 960 × 540; keine weitere Seite. Es ist die bekannte Quelle. Keine neue native Premiumquelle oder fertige 18-Sekunden-MP4 im geprüften Umfang.

Nur `automation/music/luxe-premium.wav`: aktuelle lokale Datei 11'343'950 Bytes, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`, Git-Blob `61de48704b2b3ae22fb028e6cf0a3c88e4826a7c`, passend zur frisch gelesenen Repository-Metadatei. Repo-Credits dokumentieren Eigenproduktion; Hash/Credits ersetzen die finale Rechte- und Hörabnahme nicht.

**Konkrete Blocker:** native ausreichend gute Originalaufnahmen, belegtes Default-Modell/Motivset, dateibezogene kommerzielle Bearbeitungs-/Werberechte, fertige MP4 und Inhaberabnahme von Bild, Produktidentität, Ton, Lesbarkeit und Plattform-Crops. Master-Publikationshistorie weiterhin unbekannt; kein Register initialisiert.

Neu in diesem Lauf: Der lokale Quellenparser erhält tatsächlich gelieferte Variantenmetadaten und verhindert stille Erstauswahl. Fehlerhafte Top-Level-Exporte, 429/Auth-/HTTP-Fehler, mehrdeutige Varianten und ausdrücklich gekürzte Captures bleiben unbekannt. 14 Offline-Tests mit synthetischen Daten bestanden. `publication_ready=false` bleibt gesetzt. `body_truncated` ist lokale Erfassungsmetadaten, kein erfundenes CJ-API-Feld; unmarkierte Kürzungen kann der Parser nicht zuverlässig erkennen.

Parser-SHA-256: `c39d0206d4df63e00ebb20462cd2eeb548eee50c68745b16925e3fe63298fb4e`. Lokaler Entwurf unter `/workspace/luxestyle-review/sales-focus-20261020/master/`; nicht gemergt, deployt oder als produktiver CJ-Lauf ausgegeben.

## Sechs Kanalentwürfe, keine neuen Uploads

Ein Master, dieselbe Kampagne. Preis unmittelbar vor Verwendung erneut prüfen. Instagram/TikTok-Bioziele nicht bestätigt, Pinterest-Board unbekannt, YouTube-Zielgruppe/Made-for-kids und Profilziel offen. Alle neuen Master-Publikationen bleiben blockiert. Facebook-Seitenzuordnung einzelner bestehender URLs bleibt zusätzlich offen.

| Kanal / Titel | Textentwurf | Eindeutiges Produktziel |
|---|---|---|
| Instagram — Dein Raum. Neues Licht. | Ein neuer Blick auf deinen Raum. Entdecke den Sternenlicht-Projektor von LuxeStyle für CHF 34.90. Produkt ansehen über den Link in unserer Bio. | [Vorgeschlagenes Bio-Ziel](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=instagram&utm_medium=organic_social&utm_campaign=projektor_master_18s&utm_content=master_produktfilm) — erst nach Verifikation des tatsächlichen Bio-Links verwenden |
| TikTok — Licht im Detail. | Ein Lichtmoment für deinen Raum. Der Sternenlicht-Projektor von LuxeStyle, aktuell CHF 34.90. Alle Produktangaben findest du über den Link in unserer Bio. | [Vorgeschlagenes Bio-Ziel](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=tiktok&utm_medium=organic_social&utm_campaign=projektor_master_18s&utm_content=master_produktfilm) — keine Caption-Klickbarkeit behaupten |
| YouTube Shorts — Sternenlicht-Projektor: Licht im Detail – LuxeStyle | Ein Blick auf den Sternenlicht-Projektor von LuxeStyle. Aktuell CHF 34.90. Produktdetails über den verifizierten Link im Kanalprofil. | [Vorgeschlagenes Profilziel](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=youtube&utm_medium=organic_social&utm_campaign=projektor_master_18s&utm_content=master_produktfilm) — Profilziel und Zielgruppe vor Verwendung klären |
| Facebook — Dein Raum. Neues Licht. | Entdecke den Sternenlicht-Projektor von LuxeStyle aus der Nähe. Aktuell CHF 34.90. Produkt ansehen: | [Produktlink](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=facebook&utm_medium=organic_social&utm_campaign=projektor_master_18s&utm_content=master_produktfilm) |
| Threads — Licht im Detail. | Ein Lichtmoment beginnt im Detail. Entdecke den Sternenlicht-Projektor aus der Nähe. Aktuell CHF 34.90 bei LuxeStyle. Produktdetails: | [Produktlink](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=threads&utm_medium=organic_social&utm_campaign=projektor_master_18s&utm_content=master_produktfilm) |
| Pinterest — Sternenlicht-Projektor für dein Schlafzimmer – LuxeStyle | Licht als Detail für deinen Raum: Entdecke den Sternenlicht-Projektor von LuxeStyle und die aktuellen Produktangaben. Preis bei der Prüfung: CHF 34.90. | [Pin-Ziel](https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=pinterest&utm_medium=organic_social&utm_campaign=projektor_master_18s&utm_content=master_produktfilm) — kein Board erfunden |

## Heutige Daten einmal nutzen

Die Morning-Belege vom 20.10. wurden erneut gehasht, nicht nochmals breit abgefragt. Zeitraum 13.–19.10. Europe/Zurich:

| Kanal | Gelieferte Reichweitenwerte | Interaktionen und Lücken |
|---|---|---|
| Instagram | 1'301 Views, 7/7 Tage | 16 bekannte Interaktionen aus 4/7 Tagen; Woche unbekannt |
| Facebook | 835 Content Views, 7/7 Tage | Nur 19.10. mit 0 geliefert; übrige Tage und Wocheninteraktionen unbekannt |
| TikTok | 4'450 bekannte Views aus 6/7 Tagen | 24 bekannte Interaktionen; 16.10. fehlt, Wochenwerte unbekannt |
| Threads | 2 bekannte Views aus 2/7 Tagen | Nur 19.10. mit 0 Interaktionen geliefert; Wochenwerte unbekannt |
| Pinterest | 8'860 bekannte Impressionen aus 4/7 Tagen | 156 bekannte Interaktionen; 17.–19.10. fehlen, Wochenwerte unbekannt |
| YouTube | 1'321 bekannte Views aus 5/7 Tagen | 27 Likes und 1 Share in gelieferten Tagen; 18.–19.10. fehlen |

Felddefinitionen sind kanalbezogen. Keine Verkäufe oder kanalübergreifenden Erfolgsranglisten daraus.

Klaviyo frisch: Konto XWqMAD, LuxeStyle CH, luxestyle.ch, Europe/Zurich, USD. Shopify CHF separat halten. Heutiger Morgenreport nach Entdeckung von Placed Order `W7XTVD`: Report `c606b62c-8bb5-4344-9b1f-3be8dcaa25f9`, 13.10.00:00 bis 20.10.00:00 Zürich. Gelieferte Post-Purchase-Zeile RnTvsY/Tr6DXE: ein Empfänger, eine Zustellung, null eindeutige Klicks und null Conversions in genau dieser Zeile. Nicht gelieferte Flows bleiben unbekannt; kein aktueller Shop-Bestellzähler oder Einzelauftrags-Sync daraus.

Heutiger Definitions-/Capture-Befund wiederverwendet: Vse76a draft, XEGbTB live Checkout-Recovery, VbLQj6 live Welcome, RnTvsY live Post-Purchase; öffentlicher Capture-Code XWqMAD/T2VHfu. Abends `TTuuTS.add_tracking_params=false` frisch bestätigt.

**Genau ein Klaviyo-Vorschlag bleibt zur Freigabe:** TTuuTS `add_tracking_params: false → true`, vor Änderung Konto-UTMs und beide Linkvorschauen prüfen. Keine Nachricht versendet, kein Flowstatus, Inhalt oder Rabatt geändert.

Merchant-Zulassung weiter unbekannt; keine neuen negativen Zähler verwertet und keine Feed-/GTIN-Ableitung. Vier DNS-Ergänzungen bleiben bereits genehmigt, aber ohne authentifizierten Schreibzugang und nicht umgesetzt. Öffentlicher DNS-Befund stammt aus dem heutigen Morgenlauf, nicht aus einer erfundenen Abendprüfung.

Die aktuelle Laufzeit meldet Netzwerkzugriff enforced, aber keine bereitgestellten Secrets, Runtime-Variablen oder Outbound-Identitäten. Das widerlegt vorhandene CJ-Helfer und andere Kontoverbindungen nicht. Kein legitimer CJ-/DNS-Laufzeitzugang wurde bestätigt.

## Planung und historische Identität

Fenster 20.–26.10. mit Zeitumstellung in Europe/Zurich. Gegen 14-Uhr-Beleg neun zusätzlich gelieferte UUIDs und sieben nicht mehr gelieferte UUIDs. Keine Löschung, bewusste Ersetzung oder neue kreative Identität daraus behauptet. Vier vorhandene Objekte wurden seitdem als PUBLISHED gemeldet; vier zusätzliche Objekte bereits mit PUBLISHED geliefert. Alle stammen aus bestehenden anderen Abläufen.

Keine identischen Medien-URLs je Kanal und keine identischen Kanal-Zeit-Slots im gelesenen Fenster. Das ist keine vollständige Filmhistorie. Kein Master-Publikationsregister angelegt oder zurückgesetzt.

Bei bestehenden Facebook-URLs mit Seitenpfad `122108214291350792` ist die Zuordnung zum verbundenen Konto `1049840534888592` weiterhin ungeklärt. Die Marke selbst meldet unverändert die erwartete ID; aus den URL-Pfaden wird weder Gleichheit noch ein falsches Ziel abschliessend abgeleitet.

Der alte 15-Sekunden-Projektor 399397274 / UUID 2789149365522222304 ist weiterhin als veröffentlicht auf Facebook, Instagram und TikTok gemeldet. Er ist kein neuer 18-Sekunden-Master und keine Veröffentlichung dieses Laufs.

## Nächster Arbeitsschritt

Zuerst den engen Such-Entwurf samt App-Originalzustand und korrekter Drucker-/Papier-Preisdarstellung zur Umsetzung freigeben lassen. Parallel die bestehende Warenkorb-Textkorrektur gegen aktuelle Theme-Quelle und Tarifgrundlage prüfen. Für den Film bleibt die nächste echte Voraussetzung die Beschaffung passender Originalaufnahmen und dateibezogener Rechte über legitimen Zugang. Kein Mindestvolumen, keine neuen Altclip-Kopien, keine Umsatzgarantie.

## Zusätzliche kanalbezogene Publikationsmeldungen seit 14 Uhr

Von Metricool gelieferte Zustände bestehender anderer Abläufe. Kein eigener Write.

| Metricool-ID / UUID | Kanal / Zustand | Geplanter Zeitpunkt Zürich | Plattformbeleg |
|---|---|---|---|
| 399450774 / 2591850071655600061 | pinterest / PUBLISHED | 2026-10-20T14:40:00 | [Gelieferte URL](https://www.pinterest.es/pin/1111333645583523580) |
| 399450879 / 1258388312746446065 | youtube / PUBLISHED | 2026-10-20T16:05:00 | [Gelieferte URL](https://www.youtube.com/shorts/GtdjH8rvXps) |
| 399488220 / 8360711901354608333 | pinterest / PUBLISHED | 2026-10-20T17:10:00 | [Gelieferte URL](https://www.pinterest.es/pin/1111333645583533758) |
| 399527943 / 2219498820699439888 | instagram / PUBLISHED | 2026-10-20T16:10:00 | [Gelieferte URL](https://www.instagram.com/p/DeuBB75CteR/) |
| 401176715 / 1358266328096391728 | instagram / PUBLISHED | 2026-10-20T16:46:00 | [Gelieferte URL](https://www.instagram.com/stories/luxestyle.ch/4012166911298686635) |
| 401176741 / 3426092440651449535 | facebook / PUBLISHED | 2026-10-20T16:46:00 | [Gelieferte URL](https://facebook.com/122108214291350792/posts/3045424599136553) |
| 401178177 / -3072320024094161039 | instagram / PUBLISHED | 2026-10-20T19:10:00 | [Gelieferte URL](https://www.instagram.com/stories/luxestyle.ch/4012239575619006352) |
| 401178194 / -3355326682620867490 | facebook / PUBLISHED | 2026-10-20T19:10:00 | [Gelieferte URL](https://facebook.com/122108214291350792/posts/1645908306944932) |

## Wiederauffindbare lokale Prüfentwürfe

Diese dokumentierten Diffs sind keine produktive Aktivierung. Nur nach frischer Quellengegenprobe und den geltenden Inhaberfreigaben verwenden. Das Tagesprotokoll ersetzt kein Publikationsregister.

### Warenkorb-Textdiff

Quelle lokal: `/workspace/luxestyle-review/sales-focus-20261020/conversion/cart-shipping-text.diff`. SHA-256 `102e7ec53c77444b72cdaf177d1137fea6977d9d0a8987cdb0c823cbc69a7b06`.

```diff
--- delivered/cart-shipping.before.js
+++ review-only/cart-shipping.proposed.js
@@ -27,13 +27,14 @@
         chl=(cart.alle_chlager===true)||(cart.alle_chlager===undefined&&!!chlDom);
     var gratis=chl||tot>=4050, rest=gratis?0:Math.max(5000-sub, Math.floor(((4050-tot)*10+8)/9));
     var end=((tot+(gratis?0:VERSAND))/100).toFixed(2);
-    if(chl){el.innerHTML='🎉 <strong>Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager · Du zahlst <strong>CHF '+end+'</strong>';}
-    else if(gratis){el.innerHTML='🎉 <strong>Gratis-Versand gesichert</strong> · Du zahlst <strong>CHF '+end+'</strong>';}
+    if(chl){el.innerHTML='<strong>Versandschätzung für die Schweiz: CHF 0</strong> · Ware ab Schweizer Lager · Geschätzter Gesamtbetrag <strong>CHF '+end+'</strong>';}
+    else if(gratis){el.innerHTML='<strong>Versandschätzung für die Schweiz: CHF 0</strong> · Geschätzter Gesamtbetrag <strong>CHF '+end+'</strong>';}
     else{
-      el.innerHTML='🚚 Noch <strong>CHF '+(rest/100).toFixed(2)+'</strong> bis zum Gratis-Versand (ab CHF 50 Warenwert)'+
+      el.innerHTML='Für die Schweiz: noch <strong>CHF '+(rest/100).toFixed(2)+'</strong> bis zum Gratis-Versand (ab CHF 50 Warenwert)'+
       '<div class="track"><div class="fill" style="width:'+Math.min(100,Math.round(sub/5000*100))+'%"></div></div>'+
-      '<div style="margin-top:6px;color:#5b5346">Aktuell CHF '+(tot/100).toFixed(2)+' + CHF '+(VERSAND/100).toFixed(2)+
+      '<div style="margin-top:6px;color:#5b5346">Schätzung für die Schweiz: CHF '+(tot/100).toFixed(2)+' + CHF '+(VERSAND/100).toFixed(2)+
       ' Versand = <strong style="color:#2b2b2b">CHF '+end+'</strong></div>';}
+    el.innerHTML+='<div style="margin-top:6px;color:#5b5346">Versandkosten und Endbetrag werden an der Kasse bestätigt. Für Liechtenstein gelten andere <a href="/policies/shipping-policy">Versandbedingungen</a>.</div>';
     anchors[0].parentNode.insertBefore(el,anchors[0]);
   }
   function refresh(){fetch('/cart?view=lux-chlager',{credentials:'same-origin',headers:{'Accept':'application/json'}})
```

### CJ-Parser: vollständiger Zusatzdiff zur Vorlage vom 18.10.

Quelle lokal: `/workspace/luxestyle-review/sales-focus-20261020/master/parser-review.diff`. SHA-256 `dc332d6b9809527deb0a617ca6611ab7cfce0b766987940dbff2bfa7fe7ae556`.

```diff
--- /workspace/luxestyle-review/next-improvements-20261018/source/cj_video_proof_parser.mjs
+++ /workspace/luxestyle-review/sales-focus-20261020/master/cj_video_proof_parser.mjs
@@ -11,6 +11,8 @@
     product_id: null,
     selected_video: null,
     video_rows_returned: null,
+    variant_metadata: { status: UNKNOWN, errors: [], rows_returned: null, candidates: null, selected: null },
+    shopify_variant_mapping: UNKNOWN,
     delivered_variant_and_motif_set: UNKNOWN,
     commercial_editing_and_social_usage_rights: UNKNOWN,
     existing_shopify_clip_match: UNKNOWN,
@@ -22,17 +24,23 @@
 /**
  * candidatePid is explicitly a candidate derived from reviewed importer code.
  * It is not treated as a CJ variant SKU or proof of the supplied configuration.
- * Wrappers are { http_status: number, body: actual CJ JSON }.
+ * Wrappers are { http_status: number, body: actual CJ JSON, body_truncated?: boolean }.
+ * body_truncated is local capture metadata, not a CJ API field. An absent flag
+ * is not completeness proof: results describe only returned metadata.
  */
-export function parseCjVideoProof({ candidatePid, productResponse, videoResponse, selectedVideoId } = {}) {
+export function parseCjVideoProof(input = {}) {
   const out = base();
   const reject = code => { out.errors.push(code); return out; };
+  if (!object(input)) return reject('INPUT_OBJECT_UNKNOWN');
+  const { candidatePid, productResponse, videoResponse, selectedVideoId, selectedVariantId } = input;
   if (!str(candidatePid)) return reject('CANDIDATE_PRODUCT_ID_MISSING');
   for (const [name, res] of [['PRODUCT', productResponse], ['VIDEO', videoResponse]]) {
     if (!object(res) || !Number.isInteger(res.http_status)) return reject(`${name}_HTTP_UNKNOWN`);
     if (res.http_status === 429) return reject(`${name}_RATE_LIMIT_UNKNOWN`);
     if (res.http_status === 401 || res.http_status === 403) return reject(`${name}_AUTH_UNKNOWN`);
     if (res.http_status < 200 || res.http_status >= 300) return reject(`${name}_HTTP_ERROR_UNKNOWN`);
+    if (res.body_truncated === true) return reject(`${name}_TRUNCATED_UNKNOWN`);
+    if (res.body_truncated !== undefined && res.body_truncated !== false) return reject(`${name}_COMPLETENESS_FLAG_UNKNOWN`);
     if (!object(res.body)) return reject(`${name}_JSON_UNKNOWN`);
   }
   const p = productResponse.body;
@@ -42,6 +50,7 @@
   if (v.success !== true || v.code !== 0 || !Array.isArray(v.data)) return reject('VIDEO_API_UNKNOWN');
   if (!equalId(p.data.pid, candidatePid)) return reject('PRODUCT_ID_MISMATCH');
   out.product_id = p.data.pid;
+  out.variant_metadata = parseVariantMetadata(p.data.variants, selectedVariantId);
   out.video_rows_returned = v.data.length;
   if (!str(selectedVideoId)) return reject('VIDEO_SELECTION_REQUIRED');
   const matches = v.data.filter(row => object(row) && row.id === selectedVideoId);
@@ -72,3 +81,28 @@
   out.data_status = 'matched_account_metadata_only';
   return out;
 }
+
+/** Preserve the actual variant rows; never select row zero or infer a Shopify mapping.
+ * Field names follow the existing CJ read helper. No supplier request is performed.
+ * This intentionally does not validate images, claims, licence or supplied motifs.
+ */
+function parseVariantMetadata(rows, selectedVariantId) {
+  const out = { status: UNKNOWN, errors: [], rows_returned: null, candidates: null, selected: null };
+  const reject = code => { out.errors.push(code); return out; };
+  if (!Array.isArray(rows)) return reject('VARIANT_ROWS_UNKNOWN');
+  if (rows.length > 50) return reject('VARIANT_SCOPE_LIMIT_UNKNOWN');
+  out.rows_returned = rows.length;
+  if (rows.length === 0) return reject('VARIANT_SELECTION_UNAVAILABLE');
+  if (rows.some(row => !object(row) || !str(row.vid) || !str(row.variantSku) || !str(row.variantKey))) {
+    return reject('VARIANT_ROW_INVALID');
+  }
+  const ids = rows.map(row => row.vid);
+  if (new Set(ids).size !== ids.length) return reject('DUPLICATE_VARIANT_ID');
+  out.candidates = rows.map(row => ({ id: row.vid, sku: row.variantSku, key: row.variantKey }));
+  if (!str(selectedVariantId)) return reject('VARIANT_SELECTION_REQUIRED');
+  const matches = out.candidates.filter(row => row.id === selectedVariantId);
+  if (matches.length !== 1) return reject('SELECTED_VARIANT_NOT_RETURNED');
+  out.selected = matches[0];
+  out.status = 'selected_supplier_metadata_only';
+  return out;
+}
```
