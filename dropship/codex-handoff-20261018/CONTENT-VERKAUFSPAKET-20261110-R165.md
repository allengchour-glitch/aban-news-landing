# Content- und Verkaufspaket R165

Stand: 2026-11-10T08:12:00+01:00

## Identität und Änderungen seit R164

- Shopify: LuxeStyle, `luxestyle.ch`, CHF, Schweiz; PASS.
- Metricool: brandId `6227837`, Europe/Zurich; Instagram/Threads/TikTok `luxestyle.ch`, Facebook `1049840534888592`, Pinterest `luxestyleCH`, YouTube `UCSfCEYjAsdOyYxyfTClXRZA`; PASS.
- Eine zweite fremde Metricool-Marke wurde ignoriert.
- Die R164-Shopify-Änderungen wurden öffentlich zurückgelesen: Rollball-Produkttext/-SEO claim-sicher deutsch; Männer-Geschenkratgeber vollständig deutsch mit neuem SEO, vier Fragen und sechs geprüften internen Zielen.
- In R165 gab es keine externen Writes. Planung, Kennzahlen, Produkte, Masterquelle und Klaviyo wurden read-only geprüft.

## Metricool: rollende Planung

Gelesenes Fenster: 10.11.2026 08:07 bis 18.11.2026 00:00 Europe/Zurich. Eine zu grosse Einzelabfrage wurde als `INVALID_ARGUMENT` erkannt und anschliessend erfolgreich in zwei kleine Fenster geteilt; der Fehler ist kein Leerdatenbeleg.

- 62 eindeutige Postobjekte, 79 Kanalzustände
- alle 79 `PENDING`, `draft=false`, global `autoPublish=true`
- kanalbezogenes Auto-Publish nur für Instagram ausdrücklich `true`; für die übrigen Kanäle im gelesenen Payload unbekannt
- keine kanalgleichen exakten Text-/Medienwiederholungen, keine gleiche Medienidentität mit anderem Text und keine gleichzeitigen Terminkollisionen
- jedes Objekt hat Medien; 62 unterschiedliche Medien-URL-Identitäten. Das belegt weder Rechte noch Qualität.

| Datum | Instagram | Facebook | Threads | TikTok | Pinterest | YouTube |
|---|---:|---:|---:|---:|---:|---:|
| 10.11. | 3 | 3 | 1 | 3 | 1 | 2 |
| 11.11. | 4 | 4 | 1 | 4 | 1 | 3 |
| 12.11. | 3 | 3 | 1 | 3 | 1 | 2 |
| 13.11. | 4 | 4 | 1 | 4 | 1 | 3 |
| 14.11. | 3 | 3 | 1 | 3 | 1 | 2 |
| 15.11. | 2 | 2 | 1 | 1 | 0 | 0 |
| 16.11. | 0 | 0 | 0 | 0 | 0 | 0 |
| 17.11. | 0 | 0 | 0 | 0 | 0 | 0 |

Lücken: alle Kanäle am 16.–17.11.; Pinterest und YouTube zusätzlich am 15.11. Keine Lücke wurde mit einer ungeprüften Datei gefüllt. Um 08:07 war nichts überfällig. Die nächsten bekannten Objekte um 10:00 waren YouTube ID `422276771` / UUID `2505682137165939640` und TikTok ID `422276869` / UUID `-8877028874765120990`, beide `PENDING`, `draft=false`, global `autoPublish=true`. Bereits publizierte Historie und Plattformzustände liefert die Zukunftsplanung nicht; sie bleiben unbekannt.

## Kanal-Kennzahlen 03.–09.11.2026

Die gültigen Metricool-IDs wurden vor den kleinen Abfragen entdeckt. Datenlücken bleiben unbekannt.

| Kanal | Gültige IDs | Ergebnis |
|---|---|---|
| Instagram | `IGEV05`, `IGEV38` | 669 Darstellungen vollständig. Mindestens 5 Interaktionen explizit; vier Tageswerte fehlen, Wocheninteraktionen unbekannt. |
| Facebook | `FBEV49`, `FBEV34` | 405 Inhaltsaufrufe vollständig. Mindestens 1 Interaktion explizit; sechs Tageswerte fehlen, Wocheninteraktionen unbekannt. |
| Threads | `THEV06`, `THEV05` | Nur 09.11. geliefert: explizit 0/0. 03.–08.11. unbekannt. |
| TikTok | `TKEV12`–`TKEV15` | Teilmessung 03.–08.11.: 2'383 Aufrufe und 8 Interaktionen; 09.11. unbekannt. |
| Pinterest | `PIEV11`, `PIEV13` | Alle sieben Tageszeilen vorhanden und explizit 0 Impressionen/0 Interaktionen für diesen Connector-Scope. |
| YouTube | `YTEV02`, `YTEV14`, `YTEV16`, `YTEV18` | Teilmessung 03.–07.11.: 607 Aufrufe; Interaktionen sowie 08.–09.11. unvollständig, Wochenwerte unbekannt. |

Die Metrik-Scope unterscheiden sich. Es wurde keine gemeinsame Interaktionsrate gebildet und kein Verkauf abgeleitet.

## Kleine Shopify-Produktstichprobe

### Sternenlicht-Projektor

Produkt `15521256604033` ist ACTIVE, HTTP 200, Self-Canonical und öffentlich kaufbar: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544`. Die Varianten A–G kosten CHF 34.90 / 37.90 / 40.90 / 49.90 / 51.90 / 44.90 / 35.90, alle `availableForSale=true`, ungetrackt, `CONTINUE`, Menge 0. Zwölf READY-Bilder, ein READY-Video und acht Publikationen. Tags sind nicht leer, enthalten aber `auswahl-offen`; konkrete Ausführung, Motivset, gefilmte Einheit und Werberechte bleiben ungebunden. Deshalb kein Social-Push.

Echtes Referenzbild: `/workspace/luxestyle-review/live-qa-20261108/projector-shopify-featured.jpg`, 1920×1919, SHA-256 `bb5526ce54c7eca8ac2bb38bb720d53a590a97e6df5bc1904de9cef8e8544b5d`. Es belegt den Produkttyp, keine bestimmte A–G-Ausführung.

### Futterspender

Produkt `15523986473345` ist ACTIVE, HTTP 200, Self-Canonical und öffentlich kaufbar: `https://luxestyle.ch/products/futterautomat-fur-katze-527488`. Eine Variante `56217490391425`, SKU `CJ-1418384701726527488`, CHF 96.90, `availableForSale=true`, ungetrackt, `CONTINUE`, Menge 0. Fünf READY-Bilder, acht Publikationen und nicht leere Tags ohne definierten Sperrtag. Echtes zugeordnetes Shopify-Bild: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/1da71d7a-c3b9-44ea-8179-626f37671f2e.jpg?v=1788416889`. Die Bilder belegen ein weisses Gerät mit Schale, aber nicht Edelstahl, automatische Fütterung während Abwesenheit oder 2,2 kg.

## Ein professioneller Master: Storyboard, kein fertiger Film

Master-ID bleibt `luxe_sternenprojektor_master_20261018`. Aktuelle Shopify-Quelle: Produktmedium `77496185356679`, lokale Datei `/workspace/luxestyle-review/master-shopify-refresh-20261108/shopify-source.mp4`, SHA-256 `2bb28156f28beed60f7db0980e870fff89c5e0648911a06ab91324f27fdf1d57`. Technik: 27,96 s, 960×540, 25 fps, H.264/yuv420p, AAC Stereo 44,1 kHz.

Ein bildfüllender Hochkant-Crop hätte nur etwa 304×540 nutzbare Pixel und benötigte etwa 3,55-fache Vergrösserung. Eine 25-zu-30-fps-Wandlung würde in 18 Sekunden 90 Bildplätze wiederholen. Diese Quelle bleibt Identitätsreferenz und ist kein Premium-Mastermaterial.

Ziel: exakt 18,00 s / 540 Frames, 1080×1920, konstante 30 fps. Es wird später genau ein Hook gewählt.

| Zeit / Frames | Bild und Schnitt | Overlay |
|---|---|---|
| 0,00–2,00 / 0–59 | Hook A: echte Raumprojektion derselben Einheit. Hook B: ruhiges Linsen-/Tastendetail derselben Einheit. | A: `Dein Raum.` / `Neues Licht.`; B: `Licht im Detail.` |
| 2,00–4,60 / 60–137 | Durchgehende Bedienhandlung, Gerät, Hand und Kontaktpunkt vollständig sichtbar. | `Sternenlicht-Projektor` |
| 4,60–7,60 / 138–227 | Dieselbe Bedienaufnahme, kontrollierter Kamerazug. | `Aus der Nähe` / `entdecken.` |
| 7,60–12,40 / 228–371 | Match-Cut auf die nachweislich zu dieser Einheit gehörende Projektion. | `Projektion` / `im Raum.` |
| 12,40–14,00 / 372–419 | Ruhiges Gehäuse-, Linsen-, Tasten- oder Anschlussdetail; kein Hauben-Abheben. | kein Text |
| 14,00–18,00 / 420–539 | Ruhiger Hero-Take mit derselben Einheit und zugehöriger Projektion. | `Produkt ansehen` / `LuxeStyle · luxestyle.ch` |

Gestaltung: kontrolliertes Taupe/Creme, höchstens zwei Zeilen, mindestens 48 px, weisse Gehäusefarbe und reale Projektionsfarben unverändert. Kein Voiceover, Stock, Optical Flow, KI-Animation oder Fotozoom.

Pflichtmusik `automation/music/luxe-premium.wav` ist technisch vorhanden, PCM 16 Bit/44,1 kHz/Stereo/64,31 s, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`. Buildmanifest, Soundfont-Hash, vollständige Lizenzbindung sowie Hör- und Mixabnahme fehlen. Keine Master-MP4 wurde gerendert. Alte Juni-Videoassets wurden nicht verwendet.

Produktionsblocker: eine aktuelle A–G-Variante samt Shopify-ID/SKU/CJ-VID/Motivset und derselben gefilmten Einheit festlegen; vier native 1080×1920/30-fps-Takes derselben Einheit beschaffen; je Quelle SHA-256 und kommerzielle Bearbeitungs-/Werbe-/Social-/Metricool-Rechte belegen; Musikrechte und Hörabnahme schliessen.

## Kanaltexte und eindeutige UTM-Ziele

Diese Texte sind Entwürfe. Instagram/TikTok dürfen erst nach aktueller Bio-Zielprüfung verwendet werden. Pinterest-Board `1111333714239531706` wurde in der Markenabfrage nicht geliefert und muss vor Nutzung frisch bestätigt werden. YouTube-Entwurfswert `madeForKids=false` muss am konkreten Post zurückgelesen werden.

- Instagram: `Dein Raum. Neues Licht. Entdecke den Sternenlicht-Projektor und prüfe die passende Ausführung im Shop. Produkt über den Link in der Bio ansehen. #LuxeStyle #Sternenlicht #Schlafzimmer #Lichtidee`
- TikTok: `Licht im Detail. Entdecke den Sternenlicht-Projektor und prüfe die passende Ausführung im Shop. Produkt über den Link in der Bio ansehen. #LuxeStyle #Sternenlicht #Zimmerlicht`
- YouTube Shorts: Titel `Sternenlicht-Projektor fürs Schlafzimmer | Licht im Detail`; Beschreibung `Dein Raum. Neues Licht. Ausführung, Preis und Verfügbarkeit direkt im Shop prüfen: [YouTube-UTM]`
- Facebook: `Dein Raum. Neues Licht. Entdecke den Sternenlicht-Projektor fürs Schlafzimmer. Ausführungen und aktuelle Preise direkt im Shop prüfen: [Facebook-UTM]`
- Threads: `Licht im Detail: Sternenlicht-Projektor fürs Schlafzimmer. Ausführung und aktuellen Preis direkt im Shop prüfen: [Threads-UTM]`
- Pinterest: Titel `Sternenlicht-Projektor fürs Schlafzimmer`; Beschreibung `Dein Raum. Neues Licht. Entdecke den Sternenlicht-Projektor und prüfe die passende Ausführung direkt bei LuxeStyle.`

UTM-Ziele:

- Instagram: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=instagram&utm_medium=organic_social&utm_campaign=sternenlicht_master_202611&utm_content=hook_dein_raum_neues_licht`
- TikTok: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=tiktok&utm_medium=organic_social&utm_campaign=sternenlicht_master_202611&utm_content=hook_licht_im_detail`
- YouTube: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=youtube&utm_medium=organic_video&utm_campaign=sternenlicht_master_202611&utm_content=shorts_licht_im_detail`
- Facebook: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=facebook&utm_medium=organic_social&utm_campaign=sternenlicht_master_202611&utm_content=hook_dein_raum_neues_licht`
- Threads: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=threads&utm_medium=organic_social&utm_campaign=sternenlicht_master_202611&utm_content=hook_licht_im_detail`
- Pinterest: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=pinterest&utm_medium=organic_social&utm_campaign=sternenlicht_master_202611&utm_content=pin_licht_im_detail`

## Klaviyo

Konto XWqMAD: LuxeStyle CH, `luxestyle.ch`, Europe/Zurich, bevorzugte Kontowährung USD. Shopify bleibt CHF; Währungen wurden nicht vermischt. Aktuelle Metriken: Placed Order `W7XTVD`, Checkout Started `XhnJPv`, Added to Cart `TFy7Yn`.

- `XEGbTB` Abandoned Checkout: LIVE, 1 h + E-Mail 1 + 23 h + E-Mail 2, Placed-Order-Sicherung.
- `Vse76a`: DRAFT; drei Mails, Mail 3 mit Platzhalter, Mail 2 mit unbestätigtem Rabattclaim.
- `VbLQj6`: DRAFT; Added-to-List `T2VHfu`, Capture-Quelle/Form unbekannt.
- `RnTvsY`: DRAFT; tatsächliche Verzögerung 21 Tage, interner Name nennt T+10d.
- `UXEjv2`: DRAFT und gesperrt belassen; englische US-Texte, Fremdmarke ABAN und private Reply-to-Felder.

Kleiner 7-Tage-Flowreport mit Conversion `W7XTVD`: nur `XEGbTB` lieferte eine Zeile, 1 Empfänger, 1 zugestellt, 1 eindeutige Öffnung, 0 Klicks, 0 Konversionen. Für die übrigen ausgewählten Flows fehlen Zeilen; Werte unbekannt. Keine Verkäufe abgeleitet.

Einziger Flow-Vorschlag zur Freigabe, nicht umgesetzt: In `XEGbTB` E-Mail 2 den unbestätigten Rabattclaim ersetzen.

- Betreff: `Dein Einkauf ist noch gespeichert`
- Vorschau: `Kehre zu deinem Warenkorb zurück und prüfe die aktuellen Angaben an der Kasse.`

## Klar umrissene Verkaufsaktion zur Freigabe

Futterspender `15523986473345`: Produkttext und SEO auf bildlich und administrativ belegte Fakten begrenzen. Titelvorschlag: `Futterspender für Katzen in Weiss`.

Body-Entwurf:

`Dieser weisse Futterspender für Katzen ist in einer Ausführung erhältlich. Prüfe vor dem Kauf die aktuelle Produktseite.`

`Aktuelle Ausführung: Farbe Weiss; eine Ausführung. Der aktuelle Preis und die Verfügbarkeit werden auf der Produktseite angezeigt.`

SEO-Titel: `Futterspender für Katzen in Weiss | LuxeStyle`

SEO-Beschreibung: `Weisser Futterspender für Katzen in einer Ausführung. Aktuellen Preis und Verfügbarkeit direkt bei LuxeStyle prüfen.`

Unbelegte Edelstahl-, Gewichts-, automatische Fütterungs- und Abwesenheitsclaims würden entfernt. Preis, Bilder, Variante, SKU, Inventory-Verhalten, Tags und Publikationen blieben unverändert. Dies ist nur der konkrete Freigabeentwurf; kein Shopify-Write wurde ausgeführt.

## Freigabestatus

- Social-Publikation: blockiert; keine professionelle, rechtegeprüfte und variantengebundene Master-MP4.
- Metricool-Lücken: offen und konkret ausgewiesen; keine minderwertige Ersatzserie.
- Klaviyo-Textdiff: bereit zur Inhaberfreigabe, nicht angewendet.
- Futterspender-Textdiff: bereit zur Inhaberfreigabe, nicht angewendet.
- DNS: nicht erneut geprüft oder geändert.
- Keine Kunden-, Rabatt-, Budget-, Shop-Einstellungs-, Flow-, DNS-, Merchant-, Feed-, Social- oder Renderänderung in R165.

Claude-Code-Empfang bleibt `unknown_no_claude_receipt`.

[LUXESTYLE_R165_20261110]
