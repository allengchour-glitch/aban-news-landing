# LuxeStyle Live-Fehlerkorrektur – 08.11.2026, R126

Stand: 00:32 Uhr Europe/Zurich. Dieser Lauf setzt die belegten Live-Fehler fort, ohne bereits von Claude bearbeitete Punkte zu duplizieren.

## Direkt geprüft und geändert

- Shopify wurde frisch als LuxeStyle, `luxestyle.ch`, CHF und Schweiz bestätigt. Metricool wurde frisch als brandId `6227837`, Europe/Zurich und mit den sechs erwarteten Kanalidentitäten bestätigt.
- Beim DRAFT-Produkt `gid://shopify/Product/15402554229121` wurde genau der Handle `🦃-black-friday-mega-deal-40-auf-premium-set` zu `black-friday-mega-deal-40-auf-premium-set` geändert. Die Zieladresse war vorher kollisionsfrei. Produktstatus `DRAFT`, Variante `gid://shopify/ProductVariant/55713378402689`, CHF 149.90, `CONTINUE`, `tracked=false` und Menge 0 blieben erhalten. Die Admin-Rücklesung bestätigt den neuen Handle. Beide öffentlichen Adressen liefern weiterhin 404, weil das Produkt nicht veröffentlicht ist; es wurde nicht aktiviert und ein öffentlicher Redirect ist deshalb nicht belegt.
- Vier bestehende YouTube-Shorts-Entwürfe enthielten rohe Produkt-URLs. Da solche Links in Shorts-Beschreibungen nicht klickbar sind und das Kanalprofilziel nicht verifiziert war, wurde jeweils nur der vorhandene Entwurf mit einer neutralen Suchanweisung aktualisiert. Stabile UUID, Termin, Medium, Titel, `madeForKids=false`, `draft=true` und `autoPublish=false` wurden erhalten und frisch zurückgelesen. Es wurde kein Ersatzpost angelegt und nichts veröffentlicht.

| Datum Europe/Zurich | Produkt-Suchtext | Alte ID | Neue ID | UUID |
|---|---|---:|---:|---|
| 08.11.2026, 17:30 | Kristallspitzen-Set 8-teilig | 420321593 | 420335468 | `-4472725258033347244` |
| 09.11.2026, 21:00 | Ewige Rose mit LED-Licht | 420323647 | 420335551 | `-3553911421145298799` |
| 10.11.2026, 19:30 | 3-in-1 Gemüsehobel | 420323653 | 420335619 | `-7002936161864562103` |
| 11.11.2026, 19:00 | Wasserwellen-Projektionsleuchte | 420323659 | 420335708 | `5681760339256165072` |

## Live-Seiten und Claude-Abgleich

- Die zwei geprüften `/fr/products/...`-Seiten liefern 200 und deklarieren `lang=fr`, einen selbstreferenziellen `/fr/`-Canonical sowie `hreflang=fr`, enthalten aber weiterhin deutsche Titel, Metadaten und Produkttexte. `noindex, follow` ist live und reduziert vorläufig das Indexierungsrisiko; das gemischtsprachige Kundenerlebnis bleibt offen. Eine Massenübersetzung oder Sprachdeaktivierung wurde nicht ausgeführt.
- Die doppelte Formulierung «Alles rund um Alles ab Schweizer Lager» ist auf `blitzversand-schweiz` nicht mehr vorhanden. Der alte Satz «Versand nur in der Schweiz» ist auf der geprüften Hamsterseite nicht mehr vorhanden; Schweiz und Liechtenstein werden genannt. Die beanstandeten globalen TikTok-Kuscheldecken-/Halterungslinks fehlen auf den zwei geprüften Produktseiten. Diese bereits von Claude bearbeiteten Punkte wurden nicht erneut geschrieben.
- Claude-PR 2912 bleibt Draft und ungemergt. Seine dauerhaften Helferkorrekturen dürfen deshalb nicht als in `main` aktiv bezeichnet werden.

## Dauerhafte technische Schutzregeln

Draft-PR [2914](https://github.com/allengchour-glitch/aban-news-landing/pull/2914), Head `2ec8a8bc195a487ed5c869dfa31f7a1dc72e13de`, enthält vier Commits. Der initiale GitHub-Zustand ist wegen laufender Checks `UNSTABLE`; der Cloudflare-Pages-Job lief, seine Deploy-Schritte waren ausdrücklich `skipped`:

- neue Social-Regel: keine gesprochene Sprache und kein Voiceover; nur Text-Overlays/Captions auf Deutsch (Schweiz), Musik ausschliesslich `automation/music/luxe-premium.wav` nach Datei-, Hör- und Rechteprüfung;
- generische Metricool-Queue blockiert YouTube vor einem Netzaufruf, solange Titel, Zielgruppe und verifizierter CTA fehlen; deaktivierte Quellen werden nicht geladen oder geschrieben;
- neue Store-Sprachen können ohne vollständigen, aktuellen, shop- und SHA-gebundenen Übersetzungsnachweis nicht publiziert werden;
- Freiversand-Fortschritt trennt die öffentliche CHF-50-Schwelle von der internen CHF-45-Schwelle nach Rabatt und verweigert einen Theme-Patch bei abweichender oder mehrfacher Quellstelle.

Alle gezielten Tests waren lokal grün: Locale 12/12, Freiversand 8/8, Metricool-Checkpoint 19/19, Social Queue 38/38 sowie Videozeilen-, Syntax-, JSON- und Diff-Prüfungen. Der PR ist nur ein Review-Kandidat: kein Merge, Deployment oder produktiver Theme-/Locale-Write.

## Offene belegte Blocker

- Der Live-Warenkorb zeigt bei CHF 22.90 fälschlich CHF 32.66 Rest und bei CHF 27.90 fälschlich CHF 27.66 Rest. Korrekt zur öffentlichen CHF-50-Schwelle wären CHF 27.10 beziehungsweise CHF 22.10. Der getestete Patch-Kandidat ist vorbereitet; die produktive MAIN-Theme-Datei fehlt jedoch in `origin/main`, deshalb wurde nichts live geändert.
- «Selbst gestalten» funktioniert im geprüften Desktop-Pfad bis Warenkorb und `de-CH`-Checkout, ohne Bestellung. Offen bleiben fehlende belegte Masse für 4XL/5XL, eine generische Grössentabelle bis 3XL, `5.8 oz`, einzelne englische Drittanbieter-/UI-Texte und widersprüchliche Liefer-/Produktionsangaben. Ohne verifizierte Providerdaten wurden keine Masse, Materialien, Farben oder Lieferzeiten erfunden oder geändert.
- Alle bestehenden geplanten Social-Videos bleiben Entwürfe. Für neue Videos gilt weiterhin: kein Voiceover, keine gesprochene Sprache, nur visuelle Texte/Captions und nach Abnahme die eine erlaubte Musikdatei. Historisch veröffentlichte Sprachvideos wurden nicht gelöscht oder umgeschrieben.

## Umfang dieses Laufs

Tatsächliche externe Writes: ein Shopify-Produkt-Handle und vier Updates bestehender Metricool-YouTube-Entwürfe. Keine Produktaktivierung, kein neuer Post, keine Veröffentlichung, kein Upload, kein Render, keine Theme-, Locale-, Flow-, DNS-, Budget-, Rabatt-, Versand- oder Kundenänderung. Kennzahlen, Klaviyo und Bestellungen wurden für R126 nicht erneut gelesen.
