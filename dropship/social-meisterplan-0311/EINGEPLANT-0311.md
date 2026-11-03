# Eingeplant am 03.11.2026: zwei Karussells und fünf Stories (Instagram und Facebook)

Marken: **GEMESSEN** = hier abgefragt · **Hypothese** = nicht belegt · **unbekannt** = nicht gemessen. Der Besitzer hatte am 03.11. «reels ja auch stories und so» geschrieben; geplant wurde per Metricool (Marke 6227837, Zeitzone Europe/Zurich), Beiträge `autoPublish`.

## Eingeplant (Metricool-Kennungen `uuid`, damit der nächste Lauf sie wiederfindet)
| Wann | Was | Netzwerk | uuid |
|---|---|---|---|
| 09.11. 16:00 | Story 1 «Musik, die man sehen kann» (LED-Wasser-Speaker) | IG + FB (Story) | -8611238648907481079 |
| 10.11. 12:30 | Story 3 «Romantik im Glas» (Ewige Rose) | IG + FB (Story) | 37985340483322184 |
| 11.11. 17:00 | Karussell «5 Geschenke bis CHF 30» (7 Folien) | IG | -4201876028718560102 |
| 11.11. 17:00 | dasselbe, mit Link zur Sammlung | FB | -8822571646587483154 |
| 12.11. 12:30 | Story 4 «Wie von Zauberhand» (Duftbefeuchter) | IG + FB (Story) | -8331410252591837975 |
| 13.11. 17:00 | Story 5 «Spiralen in Sekunden» (Gemüsehobel) | IG + FB (Story) | 3126986420977421943 |
| 14.11. 16:00 | Karussell «Lieferung ehrlich erklärt» (6 Folien) | IG | 6199136659928140012 |
| 14.11. 16:00 | dasselbe, mit Link zur Versandseite | FB | 7768651932591999367 |
| 14.11. 19:30 | Story 6 «Der Löffel hat Feierabend» (Kaffeebecher) | IG + FB (Story) | 3200332797454403886 |

Abstand: mindestens drei Stunden zu den bestehenden Feed-Beiträgen auf demselben Netzwerk (9.11. 12:15, 10.11. 18:00, 11.11. 12:15, 12.11. 18:00, 13.11. 12:15, 14.11. 11:00). Bilder liegen als öffentliche Dateien im Shopify-Dateibereich (`luxe-social-*-0311.jpg`, alle HTTP 200); Metricool hat sie in den eigenen Speicher kopiert. Die ausgelieferte JPEG-Qualität wurde an Story 3 und 6 gegen das Original gemessen (PSNR 34,8 und 44,0 dB, Sicht ohne Auffälligkeit).

## Wegweiser repariert
`luxestyle.ch/ig` und `/tt` führen auf die handgepflegte Sammlung `aus-tiktok-und-instagram`. Dort fehlten sieben beworbene Produkte (GEMESSEN durch beide Prüfer: 0 von 6 Story-Produkten, 3 von 5 Geschenken). Am 03.11. wurden Wasser-Speaker, Ewige Rose, Duftbefeuchter, Gemüsehobel, Kaffeebecher, Tulpen-Planet und Retro-Vogel-Becher hinzugefügt (11 → 18 Produkte, frisch nachgelesen). Rücknahme: `collectionRemoveProducts`. Neue beworbene Produkte immer zuerst dort aufnehmen.

## Bewusst NICHT eingeplant
- **Story 2 (faltbare Nachtlichtlampe)** und das Reel dazu: die Produktseite öffnet auf «Rot, 0.3 watts» (Bild zeigt die graue Lampe) und hat 18 Varianten mit rohen englischen Namen, darunter «USB data cable-1pc» zu CHF 18.90 und Mehrstück-Varianten zum Preis eines Stücks (GEMESSEN). Zuerst Variantenliste bereinigen.
- **Reel-Vorlage v2 / drei Test-Reels** (Skripte in `werkzeuge/reel-v2/`): Vorlage technisch in Ordnung (1080×1920, 11,0 s, -17 LUFS bzw. -22 LUFS, Hook in Bild 0, Text im sicheren Bereich). Nicht freigabefähig: Nachtlicht-Reel (Blocker, siehe oben); Lampe: drei von vier Bildern zeigen ein ladendes Handy, die Caption wirbt mit dem Preis der Variante ohne Laden (UWG-Risiko), der «schwebt»-Satz liegt auf einem Bild ohne Schwebeeindruck; Speaker: nur zwei saubere Fotos für vier Szenen, 440 bis 540 px breite Ausschnitte werden um bis zu 2× hochgezogen; Texteinblendungen stehen kürzer als nötig (z. B. 1,2 s für 32 Zeichen); Captions ohne «Schweiz:» und ohne Versandkosten. **Die Stimme (Piper, KI) widerspricht der festen Regel «Marketing-Videos ohne Voiceover» (CLAUDE.md, 12.06.): nur mit ausdrücklichem Ja des Besitzers.** Wird die Vorlage weiterverwendet: Stimme-Arm weglassen, nur Text-Arm.

## Offen für den Besitzer
1. ~~Gratis-Versand 45 gegen 50~~ **Kein Widerspruch (Korrektur vom 03.11. nachmittags):** Die Regel «ab CHF 45 auf den Korb nach Rabatt» in Shopify und «CHF 50» in allen Texten und Beiträgen sind die bewusste Regel vom 04.10. (50 × 0,9 = 45, wegen WELCOME10 −10 %; siehe `SHARED-MEMORY.md` und `dropship/VERSAND-SCHWELLE.md`). Nicht korrigieren. Meine erste Fassung dieses Punktes («Entscheid offen») war falsch.
2. Fortura-Ware (CH-Lager): Ein Prüfer las im Lieferprofil «CH-Lager» «Standard» CHF 0 aktiv, die Produktseite sagt «Versand in der Schweiz CHF 7»; der zweite Prüfer und mein eigener Abruf (erste 20 Profile) fanden das Profil nicht: **unbestätigt**, im Admin nachsehen. Folie 4 der Lieferung folgt dem Seitentext.
3. Produktseiten, auf die Social-Verkehr führt, tragen Aussagen, die der Plan nicht verwendet: «30 Tage Rückgabe» (Fusszeile und Meta, Entscheid offen), bei der Ladetischlampe «schützt die Augen» und «Schlafzimmer», beim Panda «mit DPD».
4. Kleine, optionale Funde aus der Prüfung (nicht behoben): Geschenke-Folien mit Produktnamen in 50 px statt 80 px; Kopfzeile in Gold nur 3,9:1 Kontrast; Story 5 hell auf hell mit schwächstem Zug (Hypothese); Story 1 aus 800-px-Foto hochgezogen (bei 2-facher Ansicht weich).

## Wirkung
Unbekannt. Nichts davon ist bisher veröffentlicht; nach dem Erscheinen am 09.11. in der Statistik von Metricool (Reichweite, Antippen, Link-Klicks mit UTM `utm_source=instagram|facebook`) messen, nicht vorher bewerten.
