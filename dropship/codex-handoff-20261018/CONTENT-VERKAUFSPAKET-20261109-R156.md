# LuxeStyle Content- und Verkaufspaket R156

Stand: 09.11.2026, 19:00 Uhr Europe/Zurich  
Status: kompakter Abendlauf zur Inhaberfreigabe

## Wichtigste Änderungen seit R155

- Shopify stimmt erneut exakt: LuxeStyle, `luxestyle.ch`, CHF, Schweiz. Metricool stimmt mit brandId `6227837`, `Europe/Zurich` und allen sechs erwarteten Kanalidentitäten vollständig überein.
- Die Planung 09.–17.11. enthält nun 65 Objekte: 21 aktiv, 44 Entwürfe und 0 aktive Videos. Zwei bestehende Fotoobjekte sind heute auf Facebook und Instagram kanalweise als `PUBLISHED` bestätigt. Sie stammen aus vorhandenen Abläufen und sind keine Veröffentlichung dieses Laufs.
- Ab 19:00 liegen 19 aktive Bildobjekte in der Zukunft. Facebook und Instagram sind bis 15.11., Pinterest bis 14.11. aktiv abgedeckt. TikTok, YouTube und Threads bleiben vollständig offen; ab 16.11. sind alle sechs Kanäle offen.
- Projektor und Futterspender sind weiterhin ACTIVE und öffentlich kaufbar. Der Projektor hat weiterhin sieben aktuelle Varianten A–G; die historische Variante `56197916361089` ist nicht mehr aktuell und darf nicht für den Master verwendet werden.
- Für denselben Projektor-Master liegt neu ein ausführbarer, hashgebundener Ingest- und Freigabe-Preflight vor. Sechs Tests sind grün. Der reale Lauf bleibt korrekt `FAIL_BLOCKED`, weil echte Takes, Rechte, Musikabnahme und finale MP4 fehlen.
- Die französische Selbstgestalten-Seite wurde live an unveränderte Quelldigests gebunden. Der genaue Vier-Felder-Mutationsentwurf besteht den Preflight; ein absichtlich veralteter Digest wird korrekt abgewiesen. Es erfolgte kein Shop-Write.

## Metricool: Planung und Publikationszustand

| Datum | Facebook | Instagram | TikTok | Pinterest | YouTube | Threads |
|---|---:|---:|---:|---:|---:|---:|
| 09.11. | 2 veröffentlicht | 2 veröffentlicht | Lücke | 1 geplant | Lücke | Lücke |
| 10.–14.11. | täglich 2 geplant | täglich 2 geplant | Lücke | täglich 1 geplant | Lücke | Lücke |
| 15.11. | 1 geplant | 1 geplant | Lücke | Lücke | Lücke | Lücke |
| 16.–17.11. | Lücke | Lücke | Lücke | Lücke | Lücke | Lücke |

Keine aktive kanalgleiche Slot-Kollision, keine exakte aktive Textduplikatgruppe und keine aktive Medienwiederholung auf demselben Kanal. Sieben vergangene Videoentwürfe tragen weiter das Provider-Label `PENDING`, bleiben aber `draft=true` und `autoPublish=false`; sie zählen weder als Planung noch als Publikation. Keine `ERROR`-Zustände. In R156 gab es keinen Metricool-Write. Ein fehlender geeigneter Master bleibt eine offene Tageslücke und wird nicht mit gesperrten Clips ersetzt.

## Heute wiederverwendete Kennzahlen und Klaviyo-Daten

R154 hat heute bereits die gültigen Kennzahl-IDs entdeckt und 02.–08.11. in sechs kleinen Kanalabfragen gelesen. R156 wiederholt diese Tagesmessung nicht:

| Kanal | Gültige IDs | Tageswert aus R154 | Datenlücken |
|---|---|---:|---|
| Instagram | `IGEV05`, `IGEV38` | 647 Views, mindestens 6 Interaktionen | Interaktionen an 3 Tagen unbekannt |
| Facebook | `FBEV49`, `FBEV34` | 406 Seiten-/Medien-Views, mindestens 1 Interaktion | Interaktionen an 6 Tagen unbekannt |
| TikTok | `TKEV12`, `TKEV13`, `TKEV14`, `TKEV15` | 2'095 bekannte Views, 3 Likes, 0 Kommentare, 1 Share | 08.11. unbekannt |
| Pinterest | `PIEV01`, `PIEV04` | 4'532 Impressionen, 61 Interaktionen | 07.–08.11. unbekannt |
| YouTube | `YTEV02`, `YTEV10`, `YTEV12`, `YTEV19` | 233 bekannte Views | 07.11. fehlt; 08.11. und Interaktionen teilweise unbekannt |
| Threads | `THEV06`, `THEV05` | am 08.11. explizit 0 Views und 0 Interaktionen | übrige 6 Tage unbekannt |

Fehlende Zeilen und `null` bleiben unbekannt. Es gibt keine kanalübergreifende Summierung und keine Ableitung von Käufen.

Klaviyo wurde heute bereits nach Discovery der Placed-Order-Metrik `W7XTVD` geprüft. Konto `XWqMAD` meldet USD; Shopify bleibt CHF, beide Währungen werden nicht vermischt. `Vse76a`, `VbLQj6`, `RnTvsY`, `XEGbTB` und `UXEjv2` waren alle `draft`; fehlende Reportzeilen bleiben unbekannt. Der einzige Vorschlag bleibt: `XEGbTB` als alleinigen deutschen Checkout-Recovery-Pfad konsolidieren, den nicht genehmigten `-10%`-Inhalt entfernen und Trigger sowie Checkout-Link Ende-zu-Ende testen. Kein Flow-Write und keine Aktivierung.

## Gezielte Produktprüfung

| Produkt | Frischer Befund | Social-Gate |
|---|---|---|
| Sternenlicht-Projektor, Produkt `15521256604033` | ACTIVE, HTTP 200, 12 echte Bilder, sieben aktuelle Varianten A–G, CHF 34.90–51.90, alle kaufbar; Menge 0 bei `tracked=false` und `CONTINUE`; Tags vorhanden, kein Sperrtag und kein `rueckhol` | `auswahl-offen`; aktuelle Variante/SKU/CJ-VID, Motiv und physische Einheit müssen gemeinsam an alle Aufnahmen gebunden werden |
| Automatischer Futterspender für Katzen, Produkt `15523986473345` | ACTIVE, HTTP 200, 5 echte Bilder; Variante `56217490391425`, SKU `CJ-1418384701726527488`, CHF 96.90, kaufbar; Menge 0 bei `tracked=false` und `CONTINUE`; Tags ohne Sperrtag | kein gebundener professioneller Film und kein kommerzieller Bearbeitungs-/Werberechtebeleg |

Menge 0 ist hier kein Ausverkaufsbeleg. Es wird keine Bestands- oder Lieferzeitzusage gemacht. Verifizierte Bildreferenz des Projektor-Masters: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/680d1ad3-95b3-47bd-9522-899efd79a301.jpg?v=1788153090`.

## Ein professioneller Master

Master-ID: `luxe_sternenprojektor_master_20261018`. Ziel: exakt 18,00 Sekunden, 1080×1920, konstante 30 fps, 540 Frames, H.264/yuv420p und genau eine AAC-Stereo-Spur. Kein Voiceover. Musik ausschliesslich `automation/music/luxe-premium.wav`, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`, erst nach Rechte-, Hör- und Mixfreigabe.

Vor Produktion muss genau eine aktuelle A–G-Ausführung mit Varianten-ID, SKU, CJ-VID und `unitToken` gewählt werden. Der neue Preflight verlangt dasselbe Gerät im Identitätsclip und in `operation` mindestens 9 s, `projection` 10 s, `detail` 7 s und `hero` 8 s, jeweils nativ mindestens 1080×1920 bei echten 30 fps. Er bindet alle SHA-256 an einen unterschriebenen Grant für Bearbeitung, Shop, organische und bezahlte Social-Nutzung sowie Metricool-Upload. Musikrechte, Hörabnahme, Mixfreigabe, Plattformausschnitte und Inhaberabnahme sind Pflicht.

| Zeit | Bildhandlung | Overlay |
|---|---|---|
| 0–2 s | Hook A: echte Projektion; Hook B: echtes Detail von Gehäuse oder Bedienung | A: «Dein Raum.» / «Neues Licht.»; B: «Licht im Detail.» |
| 2–5,2 s | durchgehende reale Bedienung | «Sternenlicht-Projektor» |
| 5,2–8 s | Linse, Taste oder Gehäuse derselben Einheit | «Aus der Nähe entdecken.» |
| 8–13 s | reale Projektion derselben Einheit und desselben Motivs | «Lichtmomente.» |
| 13–15 s | ruhiger Hero-Take | kein Text |
| 15–18 s | derselbe Hero-Take | «Produkt ansehen» / «LuxeStyle · luxestyle.ch» |

Sechs Validator-Tests bestehen. Der synthetische Vertrag liefert bewusst nur `PASS_METADATA_ONLY_NOT_RELEASEABLE`; der echte Live-Preflight liefert `FAIL_BLOCKED`. Keine professionelle MP4 wurde gerendert, hochgeladen, terminiert oder veröffentlicht. Es gibt deshalb auch keinen neuen Master-/Kanal-Publikationsbeleg.

## Kanaltexte und eindeutige Produktlinks

Die Texte sind Freigabeentwürfe für denselben Master und dürfen erst nach vollständiger Produkt-, Rechte-, Musik-, Datei- und Kanalabnahme verwendet werden.

- **Instagram:** «Dein Raum. Neues Licht. Entdecke den Sternenlicht-Projektor von LuxeStyle. Produkt über den verifizierten Link im Profil ansehen.» Profilziel vor Publikation gegenprüfen: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=instagram&utm_medium=organic_social&utm_campaign=sternenlicht_master_20261109&utm_content=hook_a`
- **TikTok:** «Licht im Detail. Ein ruhiger Blick auf den Sternenlicht-Projektor. Produkt über den verifizierten Link im Profil ansehen.» Profilziel vor Publikation gegenprüfen: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=tiktok&utm_medium=organic_social&utm_campaign=sternenlicht_master_20261109&utm_content=hook_b`
- **YouTube Shorts:** Titel «Sternenlicht-Projektor im Detail | LuxeStyle». Zielgruppe: `madeForKids=false`. Beschreibung mit Ziel: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=youtube&utm_medium=shorts&utm_campaign=sternenlicht_master_20261109&utm_content=hook_b`
- **Facebook:** «Dein Raum. Neues Licht. Sieh dir den Sternenlicht-Projektor mit echten Produktdetails an.» Ziel: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=facebook&utm_medium=organic_social&utm_campaign=sternenlicht_master_20261109&utm_content=hook_a`
- **Threads:** «Licht im Detail: ein ruhiger Blick auf Bedienung, Gehäuse und Projektion des Sternenlicht-Projektors.» Ziel: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=threads&utm_medium=organic_social&utm_campaign=sternenlicht_master_20261109&utm_content=hook_b`
- **Pinterest:** Titel «Sternenlicht-Projektor für ruhige Lichtmomente». Verifiziertes Board `1111333714239531706` im Konto `luxestyleCH`. Ziel: `https://luxestyle.ch/products/sternenlicht-projektor-fur-schlafzimmer-732544?utm_source=pinterest&utm_medium=organic_social&utm_campaign=sternenlicht_master_20261109&utm_content=hook_a`

Instagram und TikTok erhalten keinen vorgetäuschten klickbaren Caption-Link. Das aktuelle Profilziel muss vor einem späteren Push exakt auf den jeweiligen UTM-Link geprüft werden.

## Genau eine Verkaufsaktion zur Freigabe

**Freigabegegenstand:** vier französische Übersetzungen der bestehenden Shopify-Seite `gid://shopify/Page/698444710273` registrieren: `title`, `body_html`, `meta_title`, `meta_description`. Die aktuellen deutschen Quelldigests sind gegenüber R155 unverändert; französische Page-Übersetzungen sind weiterhin leer.

Zielwerte:

- Titel: «Personnalisez des T-shirts, des tasses et bien plus encore»
- Meta-Titel: «Personnaliser un T-shirt et une tasse en Suisse | LuxeStyle»
- Meta-Beschreibung: «Personnalisez T-shirts, sweat-shirts, hoodies bio et tasses. Placez votre motif, vérifiez l’aperçu et commandez en CHF en Suisse ou au Liechtenstein.»
- Inhalt: vollständige französische Übertragung des aktuellen deutschen Texts mit sechs `/fr/`-Links

Der exakte `translationsRegister`-Entwurf besteht den lokalen Preflight; ein Stale-Digest-Test scheitert erwartungsgemäss. Handle, Template, Produkte, Preise, Theme, Canonical, Hreflang, öffentliche CHF-50-Schwelle, interne CHF 45 und Kundendomäne bleiben unberührt. Nach Freigabe wären eine frische Digest-Gegenprobe, der einzelne Übersetzungswrite und die DE/FR-Rücklesung nötig. In R156 wurde nichts geschrieben.

## Öffentliche SEO-Stichprobe

Fünf gezielt geprüfte URLs und drei Bilddateien antworten HTTP 200. Canonical sowie `de`/`fr`/`x-default`-Hreflang stimmen. Die französische Homepage liefert weiterhin deutsche Meta- und Open-Graph-Beschreibungen; `/fr/pages/selbst-gestalten` fällt in Titel, Meta, H1 und Inhalt fast vollständig auf Deutsch zurück. Je Stichprobenseite stehen rund 744–751 eindeutige Collection-Ziele im HTML; `og:image` wird als `http://` ausgegeben, obwohl die Assets über HTTPS erreichbar sind. Diese beiden Theme-Themen bleiben Befunde und sind nicht Teil der einen freizugebenden Verkaufsaktion.

## Weitere Grenzen und DNS

Der R155-DNS-Befund bleibt die heutige aktuelle Quelle und wurde nicht erneut abgefragt: drei genehmigte CNAMEs waren `NXDOMAIN`, der genehmigte Klaviyo-Verifikations-TXT fehlte, der authentifizierte DNS-Schreibzugang war unbekannt. Die Genehmigung dieser vier Records ist vorhanden; die Umsetzung ist nicht erfolgt.

Keine Kundenansprache, Bestellung, Rabatt-, Budget-, Shop-, Flow-, Merchant-, DNS- oder Feed-Einstellung geändert. Kein kostenpflichtiger Render, keine neue Social-Planung und keine Arbeit an einer anderen Marke.

## Tagesprotokoll R156

| Bereich | Was Codex gemacht hat | Ergebnis / Status |
|---|---|---|
| Kontinuität / Tagesgrenze | Revision155, Projektgedächtnis, Übergabe und heutigen Tagesblock gelesen | R154-Kennzahlen/Klaviyo und R155-DNS nicht wiederholt; Kauf-Watch beendet |
| Identität | Shopify und Metricool samt sechs Kanälen frisch gelesen | vollständig passend; keine andere Marke bearbeitet |
| Metricool / Planung | 09.–17.11. in drei kleinen Fenstern gelesen; fällige Zustände und Duplikate geprüft | 65 Objekte,21 aktiv/44 Entwürfe/0 aktive Videos; 2 heutige Fotoobjekte kanalweise PUBLISHED; 0 Writes |
| Shopify-Produkte | Projektor und Futterspender gezielt gelesen | beide ACTIVE/kaufbar; Filmgates blockiert; keine Bestands-/Lieferzusage |
| Master | hashgebundenen Ingest-/Freigabe-Preflight und sechs Tests erstellt | Tests grün; reale Freigabe FAIL_BLOCKED; keine MP4, kein Upload/Push |
| Verkaufsaktion | FR-Seite, Digests und öffentliche Ausgabe frisch gegengeprüft; Mutation trocken validiert | PASS, Stale-Digest negativ; kein Shop-Write |
| SEO | genau fünf öffentliche Seiten und drei Bilder geprüft | FR-Fallback, Linkmenge und HTTP-OG-Bilder bestätigt; keine Änderung |
| Dokumentation | R156-Paket und Maschinenbelege vorbereitet | Revision156 mit 24 Aufgaben additiv fortzuführen; Claude-Empfang unbekannt |
