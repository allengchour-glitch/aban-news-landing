# LuxeStyle: genau ein YouTube-Footerlink genehmigt

**Inhaberfreigabe erteilt, noch nicht live umgesetzt.** Der Inhaber hat auf die konkrete Frage «Gibst du diese eine YouTube-Link-Ergänzung im Shop-Footer frei?» mit «ja» geantwortet. Diese Freigabe gilt weiter; nicht nochmals dieselbe Genehmigung verlangen.

Genehmigter Umfang: Im aktiven Theme ausschliesslich das bestehende Feld `sections.footer_utilities_jLGE8U.blocks.social_links_Ew63Kq.settings.youtube_url` von leer auf den bestätigten YouTube-Kanallink setzen. Kein anderer Shop-/Profil-/Flow-/Feed-/Budget-/Rabatt-/DNS-Wert ist dadurch genehmigt.

## Frische Gegenprobe und tatsächlicher Stand

Shop luxestyle.ch/CHF, Metricool 6227837/Europe/Zurich und alle sechs Kanalidentitäten erneut passend. Die native aktuelle Shopadresse ist `au3j0y-hq.myshopify.com`. MAIN-Theme 187533001089 ist weiterhin «Horizon · LuxeStyle + Email-Popup (Claude)». Footer-Wert weiterhin leer. Aktueller Quellhash `c10b8cf27ec413d44dae0bbd78d92914ffc24cd4b296a440d8a049ff22307e5f` passt exakt zum unabhängig geprüften Ein-Feld-Diff. Die neue Angabe wurde nicht durch Codex geschrieben; kein erfolgreicher Livewrite behauptet.

## Tatsächliche Zugriffsgrenze

Die aktive Shopify-App erlaubt laut dokumentierter Toolfähigkeit Theme-Dateischreibzugriffe (`themeFilesCopy`, `themeFilesUpsert`) ausschliesslich an unveröffentlichten Themes und sperrt MAIN-Schreibzugriffe. Die Nutzerfreigabe hebt diese App-Grenze nicht auf. Es wurde kein bekanntermassen gesperrter Upsert gesendet, kein anderer Credential-/Workflowweg als Umgehung genutzt und keine unnötige Theme-Kopie erstellt. Es gab keine ausgeführte Mutation und keine tatsächliche automatische Approval-Rejection; die bekannte Fähigkeitssperre ist der Blocker.

Codex hätte diese Einschränkung vor der Freigabefrage klären müssen. Der vorherige Freigabeentwurf bleibt gültig und wird nicht erneut als ungenehmigt ausgegeben.

## Genau das vorhandene Feld im Shopify-Admin setzen

1. [Aktuelles Theme öffnen](https://admin.shopify.com/store/au3j0y-hq/themes/187533001089/editor).
2. Im Footer-Bereich **Dienstprogramme → Social-Media-Links → YouTube** öffnen. Diese deutschen Bezeichnungen wurden frisch aus `locales/de.schema.json` gelesen.
3. Diesen normalen Kanallink einfügen und speichern:

https://www.youtube.com/channel/UCSfCEYjAsdOyYxyfTClXRZA

Das Linkziel ist mit der bestätigten Metricool-Kanalidentität identisch. Ein Klick öffnet den Kanal; kein automatisches Abo versprochen. Der Editorlink ist aus der frisch ermittelten nativen Shopdomain und MAIN-Theme-ID abgeleitet, keine authentifizierte Browserbedienung behauptet. Alte Screenshot-Theme-IDs nicht als aktuelle Quelle übernehmen.

Die übrigen vorhandenen Social-Links sowie Newsletter, Gutscheine, Versandgrenzen CHF 50/45 und account.luxestyle.com.co erhalten. Nicht die gesamte historische Footer-Datei aus einem alten Archiv darüberladen. Nach einer tatsächlichen Übernahme exakten gespeicherten Wert sowie sichtbaren Footer-Link getrennt frisch prüfen; bis dahin bleibt die Umsetzung unbestätigt.

[Genehmigungs- und Prüfbeleg](FOOTER-YOUTUBE-GENEHMIGT-20261026.json) · [bewilligter Ein-Feld-Diff](FOOTER-YOUTUBE-20261026.diff).
