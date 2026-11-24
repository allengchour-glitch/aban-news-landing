# Absprung-Fix + CJ-Ticket #1042 (23.11.2026)

Grundlage: Betreiber «heute viele besucher aber keim verkauf» → «ja fix»; danach Screenshot CJ-Ticket T202611211049062321.
Pläne je Produkt wurden von einem Workflow (wf_441b212b-d94) gebaut und von je einem Prüfer live gegengeprüft: `plaene.json`.
Sicherungen (Stand vor dem Schreiben): `sicherung/`.

## LIVE (23.11.2026 ~22:50–23:00 UTC, alle zurückgelesen)
| Was | Wo | Rückweg |
|---|---|---|
| Auswahlliste statt 79 Knöpfe | neue Theme-Datei `templates/product.viele-varianten.json` (= product.json mit `variant_style: dropdowns`, md5 0294913d…), `templateSuffix` nur an Thermo-Strumpfhose 15450828898689 | `templateSuffix: null`; Datei löschen. ⚠️ Kopie von product.json: Änderungen an product.json wirken hier NICHT mit → bei Theme-Arbeit an product.json diese Datei nachziehen |
| Strumpfhose: 11 englische + 50 gemischte Optionswerte vereinheitlicht, Fleece-Variante (CJ-CJDD157416003CX) auf Platz 1, Einzelfoto 69886870126977 vorne, Text «1 Leggings»/englische Farbliste korrigiert | Produkt 15450828898689 | `sicherung/strumpfhose_*` (vorher-Werte), Mutationen in plaene.json |
| Rizinusöl-Ratgeber: Produktlink nach dem ersten Absatz | Artikel 1002487841153 | `sicherung/rizinus_1_vorher.json` |
| Jacke 626900: sauberes Bild (ohne LV-Tasche) vorne | MediaImage 77777935729031 auf 1 | alte Reihenfolge in `sicherung/jacken_1_vorher.txt`; ⚠️ Variantenbilder zeigen weiter Bild 7 (LV-Tasche) |
| Jacke 636700: «XL (100–118 Jin) bis 8XL (210–230 Jin)» → kg | Beschreibung | `sicherung/jacken_5_vorher.json` |
| Babyjacke winterjacke-bc20bb: 4 Erwachsenen-Sortiertags weg | Tags | `sicherung/jacken_9_vorher.json` |
| Bergamotte + Weihrauch (CJBJPFJY00219) gesperrt (CJ: eingestellt) | Varianten 67814964855175, 67814964789639 via `automation/ausverkauft.py sperren` | `freigeben()` – nur mit belegtem CJ-Bestand; der Lagerabgleich gibt fremde Sperren nicht frei |
| seo_autopilot: Produktblock nur bei Kopf-Treffer, Rücklesen ohne Leerraum | `automation/seo_autopilot.py`, Test `automation/seo_autopilot_test.py` (28 Fälle) | git revert |

## Lehren
- **Teilwort-Treffer im SEO-Autopiloten:** «wickel» steckt in «Wickel-Rock», «Wickelkleid», «Wickelarmband» → der Rizinusöl-Ratgeber (23 Besuche) zeigte Mode. Deutsche Komposita tragen ihr Thema am ENDE. Dazu: nach Präposition («Set für Elektronik»), nach Zubehör-Kopf («Silikonform … Kerzen»), Kinderware in Erwachsenen-Ratgebern → kein Treffer. Lieber kein Block als ein falscher.
- **Rücklesen nie byte-genau gegen Shopify-HTML:** Shopify formt `<ul><li>` um → jeder Lauf «fehler» → derselbe Artikel wurde bei jedem Lauf neu bearbeitet (124 Einträge im Ledger).
- **CJ «Products Discontinued»:** Variante SOFORT im Shop sperren (der Lagerabgleich sieht eingestellte Ware mit Restbestand nicht). CJ fragt verneint («so you don't want …?») → mit «Correct: we do NOT want …» antworten, nie mit «No» (doppeldeutig).
- **79 Werte in einer Option** = Knopfwand auf dem Handy → eigene Vorlage mit Dropdown nur für dieses Produkt.

## Offen
- CJ-Ticket #1042: Antwort an CJ = Betreiber-Klick (Text im Chat 23.11.). Kundenmail liegt als Gmail-Entwurf bereit (vor dem Senden Absender info@luxestyle.ch wählen und frischen Thread lesen). Rückerstattung Bergamotte CHF 15.21 = Betreiber-Klick in Shopify; Weihrauch erst nach CJ-Bestätigung.
- 24.11. 00:25 UTC Erinnerung (trig_015BvpQyN8q2a33MRUdPmwAQ): CJ-Bestand der 11 übrigen Düfte, Daunen-Beleg 636700 (Titel «Lange Steppjacke für Damen» nur ohne Beleg), Auftrag LX1042.
- Jacken 636700 und 612500: alle Bilder mit Herz-Sticker → neue Fotos nötig (kein sauberes Bild vorhanden).

## Nachprüfung 24.11.2026 00:26 UTC (CJ-Punkte frisch)
- **CJBJPFJY00219:** CJ führt weiterhin alle 13 Varianten (status 3). `stock/queryByVid` meldet für ALLE ~10–14k «factoryInventory» (cjInventory 0), **auch für die laut Ticket eingestellte Bergamotte** → die CJ-Bestandszahl beweist hier nichts. Sperren Bergamotte/Weihrauch bleiben; die übrigen 11 bleiben offen (kein Beleg für eingestellt). Lehre: Ein CJ-Ticket «Discontinued» schlägt die API-Bestandszahl.
- **CJWY2689967 (Jacke 636700):** Name bei CJ «Casual Down Jackets …», aber Material «Cloth», Kategorie «Women's Padded Jackets», kein Füllungs-/Daunen-Satz in der Beschreibung → Daunen nicht belegt. LIVE: Titel «Lange Steppjacke für Damen», SEO-Titel/-Beschreibung, «diese Steppjacke» im Text, 21 Alt-Texte (Handle bleibt). Rückweg: `sicherung/jacken_636700_titel_vorher.json`.
- **LX1042 / SD2611172218050640600:** unverändert UNSHIPPED, USD 24.61, alle 3 Positionen noch im Auftrag → CJ hat noch nichts storniert; Antwort im Ticket weiter offen (Betreiber).

## #1042 Kundin (24.11.)
- 04:47 UTC erste Mail (Betreiber gesendet). 08:12 UTC Antwort Kundin: «Bitte 2 …Ich möchte unbedingt die 2 Wickel» → gelesen als: Wickel liefern.
- 08:39 UTC Antwort an Kundin gesendet (info@luxestyle.ch): Wickel kommen, Bergamotte CHF 15.21 zurück, Weihrauch je nach CJ, Versand gratis; falls «2» doch Storno gemeint war, kurz melden.
- CJ-Ticket-Antwort vom Betreiber am 24.11. morgens gesendet (Auftrag um 08:3x UTC noch unverändert mit beiden Ölen). Offen: Shopify-Teilerstattung Bergamotte CHF 15.21; Nachprüfung 12:4x UTC (send_later).
