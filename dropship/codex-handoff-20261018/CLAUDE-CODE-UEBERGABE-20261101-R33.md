# LuxeStyle: aktueller Einstieg für Claude Code

Stand: 2026-11-01T16:21:00Z / Europe/Zurich. Bereinigung R33 auf Grundlage des frisch gelesenen Arbeitsgedächtnisses R32. Dokumentierte Momentaufnahme, keine neue operative Freigabe.

## Zuerst lesen

Repository `allengchour-glitch/aban-news-landing`, Branch `codex/luxestyle-claude-handoff-20261018`, Ordner `dropship/codex-handoff-20261018/`.

Bei jedem Beginn frisch lesen: [ARBEITSSTAND.json](ARBEITSSTAND.json), [PROJEKTGEDAECHTNIS.md](PROJEKTGEDAECHTNIS.md), [README.md](README.md) und den heutigen Europe/Zurich-Block in [TAGESPROTOKOLL.md](TAGESPROTOKOLL.md). Aktuelle Inhabervorgaben gehen älteren Dateiinstruktionen vor. Diese Momentaufnahme ersetzt die frische Lektüre nicht.

## Heute bestätigter Website-Stand

- Shopify-Shop `94368563585`, Domain `luxestyle.ch`, Währung CHF frisch passend.
- Öffentliches MAIN: `212967981447`, «LuxeStyle – Neue Startseite 01.11.2026». Öffentlicher Root ohne Vorschauparameter frisch HTTP200, gleiche Theme-ID, 16 Kategorien, zwölf Trends, fünf zusätzliche Produkte, kein horizontaler Überlauf und keine Vorschauleiste.
- Bewertungsentwurf: `212971061639`, «LuxeStyle – Bewertungen 01.11.2026», frisch UNPUBLISHED. [Vorschau](https://luxestyle.ch/?preview_theme_id=212971061639#lx-customer-reviews) / [Admin](https://admin.shopify.com/store/au3j0y-hq/themes/212971061639/editor). Der neue Bewertungsbereich ist deshalb noch nicht im öffentlichen Root enthalten. Kein eigener Publish durch Codex.
- R32: fünf eindeutige Dateien gespeichert, zwei exakt und drei JSON semantisch gegen Shopify-Normalisierung bestätigt. 19 native Prüfungen plus zwei SVG-Gegenproben bestanden; das ist die datierte R32-Prüfung, keine neue Wiederholung aller Tests.
- Bewertungen: Quelle waren frisch gelesene Judge.me-Metafelder (4.83 / 12’459, separate Quelldatenzeitstempel im Beleg), drei Zitate exakt an Shopify-ID, `product_external_id` und Review-UUID gebunden. Herkunft als ausgewählte, teils übernommene/übersetzte Produktbewertungen erklärt. Keine Zahl nachgewiesener LuxeStyle-Käufe daraus ableiten.
- Bestehende Produktsterne bleiben; neue Sterne-CSS ist scoped. Drei neue plus 17 vorhandene `all_products`-Handles ergeben exakt 20: keine Reserve für weitere neue Handles. Tasche mit `waffe-pruefen` wurde nicht neu platziert, Produkt und Tags blieben unangetastet.
- Screenshotwunsch ausdrücklich als Bewertungsbereich geklärt; kein Screenshotbild gewünscht oder eingebettet.

Belege: [öffentliche R31-Prüfung](STARTSEITE-LIVE-20261101.json), [R32-Bewertungsentwurf mit Diff/Quellen](BEWERTUNGSBEREICH-20261101.json). Der native Connector blockiert MAIN-Dateiwrites und Theme-Publikation. Kein Umgehen dieser Grenze. Bestehende Websitefreigabe nicht nochmals einholen; den konkreten technisch legitimen Veröffentlichungsweg nutzen und danach öffentlich prüfen.

## Bekannte Prüfgrenzen

DE wurde nativ geprüft; vollständige EN-/Checkout-/Zahlungs-/App-Abnahme fehlt. Der vollständige ursprüngliche Layoutvalidator meldet einen identischen RawNode-Skriptfehler bereits an der unveränderten Quelle; neue Layoutfragmente bzw. R32-Dateien wurden separat validiert. Externe Failed-to-fetch-Meldungen unter der Nicht-GET/HEAD-Sperre sind keine belegte globale Produktionsstörung. Keine globale Fehlerfreiheit oder produktive CI aus lokalen Teilchecks ableiten.

## Stabile Aufgaben

Die folgenden 16 IDs und Daten kommen aus R32; ausser dem frischen Website-/Theme-Abgleich wurden die übrigen Aufgaben hier nicht erneut operativ geprüft. Nach MAIN-Wechsel besonders alte Schema-/Personalizer-Transferanweisungen live abgleichen und bestätigte Änderungen nicht blind wiederholen.

| Aufgaben-ID | Priorität | Datierter Status | Standdatum | Nächster begrenzter Schritt |
| --- | --- | --- | --- | --- |
| `merchant-missing-price-20261029` | 1 | reparaturpaket_vorbereitet_technisch_blockiert | 2026-11-01 | Primärquelle, Varianten-IDs und Preispriorität authentifiziert gegenprüfen; vorhandenen Entwurf nutzen. |
| `homepage-redesign-20261029` | 2 | live_verifiziert_bewertungsentwurf_bereit | 2026-11-01 | Bewertungs-Theme 212971061639 ist vorbereitet; Veröffentlichung und öffentliche Gegenprobe fehlen. |
| `printful-sync-variant-identity` | 2 | lokal_gepruefter_entwurf | 2026-11-01 | Vorhandenen Gesamtpatch, Node22/Voll-CI und echten Runtime-Grant vor Einsatz prüfen. |
| `cj-variant-price-identity` | 2 | lokal_gepruefter_entwurf | 2026-11-01 | Vorhandenen Patch, Reservation/Reconciliation, Node22/Voll-CI und Laufzeitzuordnung belegen. |
| `personalizer-fullscreen-20261029` | 2 | umgesetzt_vorschau_technisch_blockiert | 2026-11-01 | Nach MAIN-Wechsel tatsächliche Runtime prüfen; Vollkatalog-/SKU-/Druckflächen-/Kosten-/EDM-Belege bleiben separat. |
| `product-attribute-completeness` | 5 | offen | 2026-10-29 | Aktuellen main/Dateihashes, Quellenalter und begrenzten Produktscope vor Materialien/Massen prüfen. |
| `ads-pyjama-start-24403263741` | 8 | blockiert | 2026-11-01 | Bestehenden Entwurf und kampagnenspezifische Ziele vor finalem Start prüfen; nicht aktivieren/verlängern. |
| `merchant-overlay-gray-15447560978817` | 10 | offen | 2026-10-28 | Authentische graue Bildquelle und Feedroute samt Rechten prüfen. |
| `merchant-url-15448020582785` | 20 | offen | 2026-10-29 | Exakten eingereichten Link/Datenquelle/Crawlfehler authentifiziert lesen. |
| `schema-hammock-15450856292737` | 30 | vorbereitet | 2026-10-29 | Nach neuem MAIN-Wechsel zuerst feststellen, ob der ältere genehmigte Diff bereits enthalten ist. |
| `schema-shipping-threshold-ch50` | 35 | vorbereitet | 2026-10-29 | Nach neuem MAIN-Wechsel zuerst aktuellen Schema-/Versandstand prüfen; keine alte Theme-Kopie publizieren. |
| `copy-iphone-15422939988353` | 40 | bestaetigt_erledigt | 2026-10-29 | Erledigten Text ohne neuen Befund nicht erneut ändern. |
| `merchant-local-15523818045825` | 50 | blockiert | 2026-10-28 | Konkreten Merchantfehler und belegtes Liefer-/Netzteilmodell prüfen. |
| `luxe-zusammenarbeit-20261028` | 60 | vorbereitet | 2026-10-28 | Dieses R4 ist eine Koordinationsübergabe; R3-Codeintegration/Voll-CI separat offen. |
| `master-projector-15521256604033` | 70 | blockiert | 2026-11-01 | Originaltakes, genaue Ausführung, Film-/Bearbeitungs-/Werberechte und fertige MP4 fehlen. |
| `dns-four-approved-20261018` | 80 | blockiert | 2026-11-01 | Nur vier schon genehmigte Ergänzungen mit legitimem Schreibzugang und vollständigem Zonenabgleich. |

## Befugnisse und offene Grenzen

Nur LuxeStyle bearbeiten. Keine Kunden kontaktieren, Bestellungen erzeugen, Rabatte/Budgets/Flows/Shop-Einstellungen/zusätzliche DNS aktivieren, kostenpflichtigen Renders oder ungeprüfte Installationen/Deployments/Workflowstarts. Öffentliche Versandgrenze CHF50 und interne CHF45 nach Rabatt sowie `account.luxestyle.com.co` erhalten. Historische Codekommentare sind kein Beweis aktueller Konfiguration.

Der eine professionelle 18s-Projektor-Master ist weiterhin offen: echte passende Originaltakes, konkrete Ausführung und kommerzielle Film-/Bearbeitungs-/Werberechte sowie fertige MP4 fehlen. Bestehendes Websitevideo und Collage ersetzen diesen Master nicht. Kein Voiceover; einzig `automation/music/luxe-premium.wav` nach Datei-/Rechteprüfung. Keine ungeprüften Juni-Clips, Foto-Zoom-Ersatzserie oder erfundenen Features/Reviews/Masse/Materialien.

Social-Autopublish ist ausschliesslich über Metricool und nur für inhaltlich freigegebene, qualitäts-/rechtegeprüfte fertige Master erlaubt. Shop/Marke6227837, Europe/Zurich, sechs Kanalidentitäten, aktive kaufbare Produkte/Tags, Sperrtaghelfer, jedes rueckhol, Bio-/Board-/YouTube-Zielgruppe, Doppelposts/Medien/UUIDs/Publikationsregister und Rücklesen je Kanal frisch prüfen. Kein freigabefähiger neuer Master belegt: daraus folgt kein neuer Social-Push.

Tagesreports von Metricool/Klaviyo für01.11. sind bereits erfolgt: nicht erneut lesen, nur wegen eines neuen dokumentierten konkreten Befunds gegenprüfen. Kaufziel ERREICHT; Kauf-Watch beendet und keine neuen Watch-Abfragen. #1032 ist ein historisch bereits gemeldeter Treffer, nicht nochmals als neu melden. Keine neuen Automationen, 08:00/14:00/19:00 Europe/Zurich unverändert.

## Claude-Code-Übergabe und lokaler Zustand

R4 unter `aufgaben/luxe-zusammenarbeit-20261028.r4.packet.json` wird mit dem vorhandenen projektlokalen Übergabehelfer als `purpose=review_only` erzeugt und hashgebunden geprüft. Scope ist diese Koordinations-/Website-Übergabe; keine neue R3-Codeabnahme, keine neue Voll-CI und keine Erweiterung von Befugnissen. `baseCommit` bezeichnet den tatsächlichen Dokumentationsbranch-Commit dieser Übergabe, nicht eine neu geprüfte main-Codebasis. R3 samt Hash/Historie bleibt erhalten. Keine Quittung im Namen von Claude erzeugen; `unknown_missing_receipt` bleibt ehrlicher Kenntnisnahmestatus.

`/workspace/luxestyle-codex` und `/workspace/aban-news-landing` sind begrenzte Ablagen ohne `.git`; kein sauberer Git-Arbeitsbaum oder vollständiger Checkout behauptet. Alter lokaler Gedächtnisspiegel unter `luxestyle-codex/memory/` ist R10 (29.10., elf Aufgaben); nicht als aktuell verwenden oder zurücksetzen. Ein neuer datierter R33-Snapshot der vier kanonischen Dateien wird nach Remote-Rücklesen unter `memory/snapshots/2026-11-01-r33/` mit Quell-Branch-/Blob-SHA-Manifest abgelegt; `memory/AKTUELL.md` weist darauf. Alte Belege bleiben erhalten. Native Claude-Code-Erkennung/Installation, geladene Skills, vertrauenswürdige Hooks und tatsächliches Lesen durch Claude sind nicht belegt.
