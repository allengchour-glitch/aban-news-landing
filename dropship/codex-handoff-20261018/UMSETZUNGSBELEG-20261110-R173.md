# LuxeStyle Umsetzungsbeleg R173

Stand: 2026-11-10T20:33:29+01:00

## Auftrag und Grenzen

Der Inhaber gab nach dem exakt vorgelegten R172-Paket den Auftrag «fehlende sachen fertig machen und live was du kannst». Umgesetzt wurden nur die zwei konkret vorbereiteten, frisch gebundenen Inhaltskorrekturen: der claim-sichere Futterspender-Produkt-/SEO-Stand und die sichtbaren Mail-2-/Mail-3-Inhalte im weiterhin inaktiven Klaviyo-Flow `Vse76a`. Es wurden keine Rabatte angelegt, keine Flows aktiviert, keine Kunden kontaktiert, keine Testmail gesendet und kein Social-Post aktiviert.

## Shopify: Futterspender live claim-sicher

Vor dem Write wurden LuxeStyle / `luxestyle.ch` / CHF / Schweiz sowie Produkt `gid://shopify/Product/15523986473345`, Variante `gid://shopify/ProductVariant/56217490391425`, SKU `CJ-1418384701726527488` und CHF 96.90 frisch gebunden. Der dokumentierte Drift mit Automatik-, Edelstahl- und ca.-2,2-kg-Aussagen war weiterhin vorhanden.

Genau ein `productUpdate` setzte diese vier freigegebenen Zielwerte:

- Titel: `Futterspender für Katzen in Weiss`
- Body: `<p>Dieser weisse Futterspender für Katzen ist in einer Ausführung erhältlich. Prüfe vor dem Kauf die aktuelle Produktseite.</p><p>Aktuelle Ausführung: Farbe Weiss; eine Ausführung. Der aktuelle Preis und die Verfügbarkeit werden auf der Produktseite angezeigt.</p>`
- SEO-Titel: `Futterspender für Katzen in Weiss | LuxeStyle`
- Meta: `Weisser Futterspender für Katzen in einer Ausführung. Aktuellen Preis und Verfügbarkeit direkt bei LuxeStyle prüfen.`

Mutationsergebnis: `userErrors=[]`. Admin- und unabhängiger Schutz-Readback bestätigen die Zielwerte. Öffentlich: HTTP 200, korrekter H1/Title/Meta, Self-Canonical, Warenkorb und Kaufbarkeit. Handle, ACTIVE-Status, Variante, SKU, CHF 96.90, Medien, Alttexte, Tags, untracked/`CONTINUE`/Menge 0 und sieben Publikationen blieben erhalten. Es wurde kein Bestand oder keine Lieferzeit versprochen.

## Klaviyo: `Vse76a` bereinigt und DRAFT erhalten

Preflight: Konto `XWqMAD` = LuxeStyle CH / `luxestyle.ch` / Europe/Zurich / USD. Shopwährung CHF blieb getrennt. Flow `Vse76a` war und bleibt DRAFT. Zielbindungen:

| Mail | Aktion | Nachricht | Vorlage |
|---|---:|---|---|
| Mail 2 | `106812827` | `VPmnEB` | `TDX7Ux` |
| Mail 3 | `108024959` | `WNFHjV` | `WaQaDv` |

Mail 2 wurde neutralisiert:

- Betreff: `Dein Einkauf ist noch gespeichert`
- Vorschau: `Kehre zu deinem Warenkorb zurück und prüfe die aktuellen Angaben an der Kasse.`
- Sichtbares HTML enthält keinen 10-%-Claim, keinen `WELCOME10`-Code und keine Mindestbestellwert-Aussage mehr.

Mail 3 wurde neutralisiert:

- Betreff: `Möchtest du deine Bestellung fortsetzen?`
- Sichtbares HTML enthält keinen Platzhalterbetreff, Rabattcode, Fast-ausverkauft-, Knappheits- oder Heute-Zeitdruckclaim mehr.
- Checkout-Link, Abmeldetoken und Produktschleife blieben erhalten.

Readback-Hashes:

- Mail-2-Nachricht: `2767b3d1aecefd4dc228872802a0d5e2304ed4b4ff7077e08fd7b7bd8b2fe2f3`
- Mail-2-HTML: `bf7d4b6703be03cedcb959c07a7a6f777a8d8692c5cf4ef527b7bb2187ed1433`
- Mail-3-Nachricht: `9d36fd092184975b1a90556024ed6d68bf1a6b5fcd3d478ce51904ee1b17789e`
- Mail-3-HTML: `02efe83431a7b332c50cf47a7f235743afdbad9b0ed4cde381b08f1297e4f5ef`
- Flowdefinition: `294536beb9ec9cee4777d67e661b3f2f726e6070b88fa852edd9535576cf1f88`

Trigger `XhnJPv`, Placed-Order-Guard `W7XTVD`, Aktionskette, Verzögerungen 1 h / 23 h / 1 d, Tracking, Smart Sending und alle drei Aktionszustände DRAFT blieben erhalten. Klaviyo normalisierte bei Mail 3 `reply_to_email` von `null` auf `info@luxestyle.ch`, identisch mit `from_email`. Gemäss Stop-Regel gab es keinen Reparaturwrite. Interne historische Vorlagennamen enthalten weiterhin `-10%` beziehungsweise `Knappheit`; diese Namen sind nicht kunden sichtbar. Insgesamt: zwei Vorlagen- und zwei Flow-Aktions-Inhaltswrites, null Aktivierungen und null Sendungen.

## Social-Gate: null freigabefähige Objekte

Die vier Entwürfe für den 18.11. verwenden bytegleich dieselbe Knoblauchhacker-MP4, SHA-256 `4684d4e7860e880da06dfe530d0b8df6f2ff22da94109b7ed975a4e9910af8e9`, 10,6 s, 1080×1920, 25 fps, H.264 mit AAC/48 kHz/Stereo. Sie verfehlt die verbindliche Mastervorgabe 15–20 s / 30 fps. Das zugeordnete ACTIVE/kaufbare Produkt `15450838139265` trägt `rueckhol-0907`, was jede neue Social-Ausspielung blockiert. Variantenbindung, kommerzielle Bearbeitungs-/Werbe-/Metricool-Rechte und Ledger fehlen; Pflichtmusik ist technisch nicht nachgewiesen (`|r|max=0,089`). Instagram-/TikTok-Bioziel unbekannt; Pinterest hat keinen 18.11.-Entwurf; YouTube `madeForKids=false`/`privacy=public` schliessen die übrigen Gates nicht. Daher: null Metricool-Writes, null Aktivierungen und null Ersatzposts.

## Projektor-Master: visuelle Bindung weiter offen

Frames des aktuellen Projektorvideos `gid://shopify/Video/77496185356679`, SHA-256 `9ccfdc1b58b6f0b9bd1dd370a92bf21719c52a939467073b8546aefd72365795`, wurden gegen A–G verglichen. Das Grundgehäuse passt zur Produktfamilie. Sonnensystem, violette Galaxie und Sterne kommen jedoch in mehreren Sets vor; C/E und D/F verwenden jeweils identische Shopify-Bilder. Variantenbuchstabe, SKU, Barcode/Seriennummer, vollständiges Motivset und eine durchgehende Verpackung-zu-Gerät-Aufnahme fehlen. Das Video darf keiner einzelnen A–G-Ausführung zugeordnet werden. Rechte, physische Einheit, CJ-/Lieferantenbindung und native Hochkanttakes bleiben offen; keine Master-MP4 und kein Render.

## Tatsächlicher Write-Stand

| System | Änderung | Zustand |
|---|---|---|
| Shopify | 1 Produktmutation, vier freigegebene Text-/SEO-Felder | live und öffentlich zurückgelesen |
| Klaviyo | 2 Vorlagen- und 2 Nachrichteninhaltswrites | Flow/Aktionen DRAFT, keine Sendung |
| Metricool/Social | 0 Writes | null freigabefähige Objekte |
| Render/Upload | 0 | keine professionelle Master-MP4 |
| Kunden/Rabatt/Budget/DNS/Ads/Merchant/Feed/CJ/Theme | 0 | unverändert |

Kennzahlen, Klaviyo-Flowreport, GSC, breite Verkaufs-/Merchantdaten und Bestellungen wurden nicht erneut gelesen. Bestehende Frequenz 08:00/14:00/19:00 Europe/Zurich unverändert. Claude-Receipt bleibt `unknown_no_claude_receipt`.

[LUXESTYLE_R173_20261110]
