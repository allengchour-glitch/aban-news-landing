# LuxeStyle: ein konkreter YouTube-Einstieg im Shop

Stand 26.10.2026, Europe/Zurich. **Inhaberfreigabe erteilt, noch nicht live umgesetzt.** Kostenrahmen CHF 0.

## Frisch belegter Befund

Die Startseite https://luxestyle.ch/ wurde genau einmal vollständig gelesen: HTTP200, 2’824’102 Bytes, kein Abbruch am Leselimit und keine Skriptausführung. Ihr semantischer Footer enthält den bestätigten Facebook-Link `https://www.facebook.com/1049840534888592`; im gelieferten gesamten HTML wurde kein YouTube-Anker gefunden. Dynamische Browserzustände wurden dabei nicht geprüft.

Der anschliessende native Shopify-Read bestätigt das veröffentlichte MAIN-Theme **187533001089**, «Horizon · LuxeStyle + Email-Popup (Claude)». In seiner Datei `sections/footer-group.json` ist genau dieses vorhandene Feld leer:

`sections.footer_utilities_jLGE8U.blocks.social_links_Ew63Kq.settings.youtube_url`

Der aktuelle Block `blocks/social-links.liquid` besitzt das Feld bereits mit Typ `url`, führt es im Social-Link-Loop und ordnet es der Plattform YouTube zu. Das aktuelle `snippets/icon.liquid` enthält den YouTube-Iconfall. Es braucht dafür kein neues Icon, keine Library und keine neue Liquid-Renderlogik.

## Genau eine vorgeschlagene Änderung

Von leer auf den mit der frisch bestätigten Metricool-Kanalidentität übereinstimmenden normalen Kanallink:

https://www.youtube.com/channel/UCSfCEYjAsdOyYxyfTClXRZA

[Exakter Ein-Feld-Diff](FOOTER-YOUTUBE-20261026.diff), [Prüfbeleg mit Quell- und Zielhash](FOOTER-YOUTUBE-VALIDATION-20261026.json).

Das macht den YouTube-Kanal über das vorhandene Social-Link-Element erreichbar. Es ist kein automatisches Abonnement und kein Nachweis zusätzlicher Follower oder Verkäufe. Facebook und die übrigen bestehenden Social-Ziele bleiben im Diff erhalten. Der native vorhandene Renderer übernimmt Beschriftung und Icon; keine Profiländerung auf Facebook oder YouTube.

## Prüfung und enge Übernahmegrenze

Alle drei gelesenen nativen Theme-Dateien passen zu ihren gelieferten MD5-Prüfsummen. Footer-Ausgangs-SHA256: `c10b8cf27ec413d44dae0bbd78d92914ffc24cd4b296a440d8a049ff22307e5f`.

Der lokale Entwurf ändert genau einen JSON-Wert. Alle übrigen JSON-Werte und die ursprünglichen Textbytes vor/nach dieser Stelle bleiben erhalten, einschliesslich Newsletter-/Popup-, Gutschein-, Versand-, Konto- und Kontaktlogik. Diese Logik wurde nicht ausgeführt oder sachlich neu geprüft. `config/settings_data.json` ist kein Änderungskandidat. Kein Themewechsel und keine Installation.

Schemafelder und gültige Rollen wurden nativ entdeckt; offizielle Admin-Dokumentation gelesen. Die tatsächlichen beiden GraphQL-Leseoperationen waren erfolgreich. Der separate native Validator delegierte seine Prüfung an diese Ausführung. Der lokale CLI-Dokuabruf meldete `fetch failed`, der CLI-Validator fehlende lokale `assets`; deshalb kein grünes CLI- oder vollständiges Themevalidator-Ergebnis behauptet und nichts nachinstalliert. JSON-/Feld-/Hashprüfung bestanden; eine Browser-/Mobilabnahme des später tatsächlich geänderten Shops fehlt weiterhin.

Vor einer ausdrücklich freigegebenen Anwendung MAIN-Rolle, exakte Datei und Leerwert frisch gegenprüfen. Bei abweichendem Ausgangs-Hash den Entwurf neu gegen den aktuellen Inhalt abgleichen, keine alte vollständige Footer-Datei darüberladen. Nur dieses YouTube-Feld ergänzen, anschliessend nativen Zielwert und tatsächlich gerenderten Footer separat zurücklesen. Keine anderen Shop-/Profil-/Flow-/Feed-/Budget-/Rabatt-/DNS-Einstellungen ändern.

Der Inhaber hat die konkrete Footer-Ergänzung inzwischen mit «ja» genehmigt. Keine erneute Genehmigung desselben Links verlangen. Die aktive Shopify-App erlaubt Theme-Dateischreibzugriffe jedoch nur auf unveröffentlichte Themes; deshalb wurde keine Mutation gegen das aktive MAIN-Theme ausgeführt. [Genehmigter Einmalauftrag und genauer Admin-Schritt](FOOTER-YOUTUBE-GENEHMIGT-20261026.md). Die übrigen Shopgrenzen bleiben erhalten; keine Liveübernahme oder Social-Ausspielung behauptet.

Offizielle API-Quellen: https://shopify.dev/docs/api/admin-graphql/2026-10/queries/theme und https://shopify.dev/docs/api/admin-graphql/2026-10/objects/OnlineStoreTheme.
