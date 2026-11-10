# Neu abrufen lassen: Liste B vom 10.11.2026 (zehn bereits verbesserte Seiten)

Messung: Search Console über OpenSEO `inspect_urls`, 10.11.2026 ca. 09:20 bis 09:30 UTC (14 Adressen); Einblendungen und Position aus `get_search_console_performance` (04.10. bis 07.11., 35 Tage; die letzten Tage sind unvollständig); Titel und Meta live gelesen (`curl`, Browser-Kopf, 6 s Pause): alle zehn HTTP 200, kein `noindex`, Canonical gleich der eigenen Adresse. Der Antrag selbst geht nur über das Search-Console-Konto des Besitzers («Indexierung beantragen»); die Links ändern sich bei jeder Messung.

**Was diese Liste von Liste A unterscheidet** (`INDEX-LISTE-1011.md`, heute früh): Liste A sind Seiten, die Google noch nicht indexiert hat. Hier stehen Seiten, bei denen wir Titel, Meta oder Text zwischen 04.11. und 09.11. verbessert haben und **Googles letzter Abruf vor unserer Änderung liegt** (01.08. bis 06.11.; bei Nr. 3 kennt Google die saubere Adresse nicht). Solange Google nicht neu liest, zeigt die Suche den alten Stand, und die Vergleichsmessung vom 18.11. misst unsere Änderung nicht, sondern die Saison.

**Warum Anträge der Weg sind (Beobachtung, kein Beweis):** wo die Indexierung beantragt wurde (Listen vom 06.11., 08.11. und 09.11.), waren 28 von 30 Seiten kurz danach drin, teils nach zehn Minuten; die 30 Seiten der Listen a, b, c ohne belegten Antrag stehen bei 1 von 30. Dass ein Antrag auch bei schon indexierten Seiten den Neu-Abruf auslöst, ist die Funktion der Schaltfläche; hier gemessen ist es noch nicht (siehe «Messung»).

| # | Seite | Was wir geändert haben | Googles letzter Abruf | Einblendungen / Position (35 Tage) | Direktlink (Anmeldung als Betreiber nötig) |
|---|---|---|---|---|---|
| 1 | collections/weihnachtspyjama-familie | 04.11. Titel und Meta; 09.11. Datumssatz («bis Mitte November») entfernt | 01.11. 21:12 UTC | 321 / 24,6 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=NAdsHYz6z7k8QHxKnOQemw&utm_medium=link&utm_source=api |
| 2 | products/weihnachts-pyjama-sets-fur-die-ganze-familie-613100 | 04.11. Titel und Meta | 01.08. 20:39 UTC | 203 / 30,7 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=a60crMDxl3MYw7hwNyA4ew&utm_medium=link&utm_source=api |
| 3 | products/weihnachts-pyjama-im-partnerlook-764352 | 04.11. Titel und Meta | saubere Adresse: «URL ist Google nicht bekannt» (siehe unten) | 93 / 22,9 (unter der Variantenadresse) | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=yujJTtYwOW-JqWxlUvKwRA&utm_medium=link&utm_source=api |
| 4 | blogs/ratgeber/weihnachtsgeschenke-2026-schweiz-ideen | 09.11. Text, FAQ, strukturierte Daten, drei Links auf Pyjama, Pullover und Adventskalender | 06.11. 10:43 UTC | 12 / 6,2 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=UaiW5Ogo5jBeUUXQELKP_A&utm_medium=link&utm_source=api |
| 5 | collections/trinkbrunnen-katzen | 09.11. Kaufhilfe (94 Wörter) und neue Meta | 04.11. 03:55 UTC | 328 / 49,5 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=I_4Wfv2lYSmVwEA0I3P3lQ&utm_medium=link&utm_source=api |
| 6 | collections/weihnachtspullover | 09.11. Datumssätze entfernt | 02.11. 17:19 UTC | 69 / 39,1 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=vhl0-RGQsRjHEHaXkQDY4g&utm_medium=link&utm_source=api |
| 7 | collections/buero-organizer-ablage | 09.11. Einleitung von 10 auf 110 Wörter | 31.10. 07:07 UTC | 128 / 67,1 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=YjU9Yuzh2NQiLXoIHRrgkg&utm_medium=link&utm_source=api |
| 8 | products/tragbarer-usb-fusselrasierer-613400 | 04.11. Titel und Meta | 12.10. 22:14 UTC | 49 / 19,5 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=XJBXWlJtHL8TIamM5_2c2g&utm_medium=link&utm_source=api |
| 9 | collections/adventskalender | 09.11. Datumssätze entfernt | 05.10. 08:34 UTC | 10 / 85,9 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=PVToUKhhc0dhwrOHA_9qaQ&utm_medium=link&utm_source=api |
| 10 | products/flammen-diffuser-715840 | 04.11. Titel und Meta | 30.08. 11:46 UTC | 19 / 25,0 | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=hr8XMgtU5Ef6Ifw1fUU4wQ&utm_medium=link&utm_source=api |

Alle Adressen beginnen mit `https://luxestyle.ch/`. Reihenfolge: Weihnachts-Seiten zuerst (die Nachfrage steigt ab Mitte November; der Ratgeber steht schon auf Seite 1), dann nach Einblendungen. Das Kontingent liegt bei rund zehn Anträgen je Tag, ist aber nicht fest (am 29.10. «Kontingent überschritten» ab Nr. 4, am 04.11. und 09.11. nach Angabe des Besitzers zehn Anträge durch): bei «Kontingent überschritten» bitte sagen, ab welcher Nummer.

**Zusammen mit Liste A:** zwanzig Anträge an einem Tag sind vermutlich zu viel. Meine Reihenfolge: diese Liste zuerst (zeitkritisch, die Weihnachtsware), Liste A morgen. Ist Liste A heute schon durch, diese Liste morgen.

## Was Google beim Abruf sieht (live gelesen 10.11. 09:2x UTC)

| # | Titel | Meta-Beschreibung |
|---|---|---|
| 1 | Familien-Weihnachtspyjama & Partnerlook \| LuxeStyle CH | Familien-Weihnachtspyjama für Papa, Mama, Kinder und Baby sowie Partner-Weihnachtspyjama für Pärchen: Elch, Karo, Streifen. Versand in die Schweiz. |
| 2 | Weihnachts-Pyjama für Papa, Mama, Kind und Baby \| LuxeStyle | Weihnachts-Pyjama-Set im Partnerlook für Papa, Mama, Kind (2T bis 14T) und Baby (3M bis 18M). Jede Person einzeln wählbar. Versand in die Schweiz. |
| 3 | Weihnachtsmann-Pyjama im Partnerlook, Baumwolle \| LuxeStyle | Weihnachts-Pyjama im Partnerlook aus Baumwolle: Weihnachtsmann-Motiv mit Karomuster. Für Papa, Mama, Kinder und Babys, jede Person einzeln wählbar. |
| 4 | Weihnachtsgeschenke 2026 Schweiz: Elektronik-Ideen – LuxeStyle | Weihnachtsgeschenke 2026 in der Schweiz: Elektronik-Ideen nach Empfänger und Budget sowie Hinweise zu Kompatibilität, Auswahl und Bestellung. |
| 5 | Trinkbrunnen für Katzen & Hunde kaufen \| LuxeStyle | Katzentrinkbrunnen und Hunde-Trinkbrunnen: Keramik oder Kunststoff, mit Filter, USB, Akku oder ohne Strom, von etwa 0,5 bis 4 Liter. Versand in die Schweiz. |
| 6 | Weihnachtspullover & Ugly Christmas Sweater \| LuxeStyle | Weihnachtspullover für Damen und Herren: Strick mit Schneeflocken, Hoodies mit Rentier, Elch und Lebkuchenmann, Christmas Sweater. Versand in die Schweiz. |
| 7 | Büro-Organizer & Ablage online kaufen \| LuxeStyle CH | Büro-Organizer & Ablage: Schreibtisch-Organizer, Stiftehalter und Etuis. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt. |
| 8 | Fusselrasierer USB, tragbar mit 3 Gängen \| LuxeStyle CH | Tragbarer USB-Fusselrasierer in Weiss oder Schwarz: 3 Gänge für verschiedene Stoffe, Type-C-USB-Kabel und Reinigungsbürste inklusive. Bei LuxeStyle. |
| 9 | Adventskalender kaufen: Kinder, Schmuck & zum Befüllen – LuxeStyle | Adventskalender für Kinder, Katzen und Bastelfans: Bausteine, Puzzle, Charm-Armband oder zum Befüllen. Versand in die Schweiz – rechtzeitig bestellen. |
| 10 | Flammen-Diffuser mit Weihnachtsmotiv \| LuxeStyle CH | Flammen-Diffuser mit Weihnachtsmotiv: Aroma-Diffuser, Luftbefeuchter und Stimmungslicht in einem. Timer 2 bis 8 Std., Abschaltung bei Wassermangel. |

## Nr. 3: die saubere Adresse kennt Google nicht

GEMESSEN 10.11.: `inspect_urls` für `https://luxestyle.ch/products/weihnachts-pyjama-im-partnerlook-764352` meldet «URL ist Google nicht bekannt» (obwohl sie in der Produkt-Sitemap steht, `lastmod` 10.11.). Die Einblendungen (93, Anfrage «partner weihnachtspyjama», Position 22,9) laufen unter der Variantenadresse `…-764352?variant=55873728250241&country=CH&currency=CHF`. Diese hat Google am 30.10. abgerufen («Gecrawlt – zurzeit nicht indexiert») und als **eigene** Canonical gewählt, obwohl die Seite auf die saubere Adresse zeigt. Die Abfrage mit `page equals` auf die saubere Adresse lieferte 0 Zeilen; erst `contains` auf die Kennung fand die Zeile. Der Antrag gehört auf die saubere Adresse (Zeile 3); der Direktlink der Variantenadresse steht in der Reserve.

## Reserve (falls mehr als zehn gehen)

| Seite | Stand | Direktlink |
|---|---|---|
| collections/freizeit-sportrucksaecke (09.11. Einleitung von 16 auf 120 Wörter; 42 / 32,9) | Googles Abruf 29.10. 18:34 UTC | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=XOYO0ZS-DJlkrGE0txIr-A&utm_medium=link&utm_source=api |
| products/new-flame-aroma-diffuser-mit-flammeneffekt-620700 (04.11. Titel und Meta; 6 / 11,5) | Googles Abruf 19.08. 06:13 UTC | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=ZheVldW8E1Is9ruULNxtxg&utm_medium=link&utm_source=api |
| products/usb-fusselrasierer-283968 (04.11. Titel und Meta; keine Einblendungen) | «URL ist Google nicht bekannt» | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=l9_XFJ2TeIIMl6inFMF0Nw&utm_medium=link&utm_source=api |
| Variantenadresse des Partner-Pyjamas (`?variant=55873728250241&country=CH&currency=CHF`) | «Gecrawlt – zurzeit nicht indexiert», Abruf 30.10. 08:02 UTC | https://search.google.com/search-console/inspect?resource_id=https://luxestyle.ch/&id=_G5MRvztha-t62PgS3qlWQ&utm_medium=link&utm_source=api |

## Bewusst nicht in der Liste

- **`products/futterautomat-fur-katze-527488`** (167 Einblendungen, Position 25,5; Googles Abruf 15.10.; Direktlink-Kennung `1sIkrshmmT8ylGVuxr0tBA`): der Text ist in Bewegung. Eine Parallelsitzung stellte ihn am 10.11. gegen 07:28 UTC auf «Futterschale aus Edelstahl» zurück (belegt im CJ-Datenblatt), um 08:46 UTC (`updatedAt`) steht wieder die kurze Fassung («Futterspender für Katzen in Weiss», Meta «Weisser Futterspender für Katzen in einer Ausführung. Aktuellen Preis und Verfügbarkeit direkt bei LuxeStyle prüfen.»). Wer sie geschrieben hat, ist von hier nicht zu sehen; nichts angefasst. Ein Antrag lohnt erst, wenn der Text steht.
- **`products/trinkbrunnen-fur-haustiere-411520`** (303 Einblendungen, Position 27,0): Titel, Meta und Text sind ehrlich (es ist ein schwimmender Wassernapf) und seit dem Befund vom 10.11. unverändert; ein Neu-Abruf brächte nichts Neues.
- Seiten ohne Änderung von uns und `/fr/`-Adressen (seit 07.11. `noindex`).

## Messung

- **11.11. 06:00 UTC** (Wecker `trig_017BtCwZGthd71GakHQWi9uD`, liest die Listen nach): zusätzlich `lastCrawlTime` der zehn Adressen. Ein Abruf **nach** dem Antrag bestätigt den Weg; steht dort noch der alte Stand, hat Google den Antrag nicht umgesetzt (Beobachtung bei Neuseiten: Minuten bis Stunden).
- **18.11. 07:30 UTC** (`trig_01SDXKRsFJt9a4sBxM6WvutK`) und 02.12.: Einblendungen, Position und Klicks der zehn Seiten gegen die Tabelle oben (35 Tage bis 07.11.). Nur Seiten zählen, deren `lastCrawlTime` **nach** unserer Änderung liegt. Gegenprobe gegen die Saison: unangefasste Seiten (Rizinusöl-Wickel, `trinkbrunnen-fur-haustiere-411520`).
- Erwartung: gering. Die meisten Seiten stehen auf Position 20 bis 70, der Shop hat in 35 Tagen 122 Klicks bei 18 892 Einblendungen. Wirkung auf Rang und Verkäufe: unbekannt (Hypothese: Seite 3 auf Seite 2, beim Pyjama und beim Ratgeber näher an Seite 1).

## Auffällig: Trinkbrunnen-Seiten ohne Sichtbarkeit seit 04.11. (vor unserer Änderung)

GEMESSEN 10.11. (Search Console über OpenSEO, Tagesreihe, Datum in Pazifischer Zeit): alle Seiten mit «trinkbrunnen» in der Adresse (Sammlung, Produkte, `/fr/`-Sammlung) hatten vom 24.10. bis 03.11. 28 bis 58 Einblendungen je Tag (Position 30 bis 46; nur der 29.10. mit 8), am 04.11. 6, vom 05.11. bis 09.11. 0 bis 2 je Tag (Position 73 bis 99). Die deutsche Sammlung `trinkbrunnen-katzen` allein: 30 bis 40 je Tag vom 30.10. bis 03.11., am 04.11. 4, danach keine Zeile; die französische Adresse war schon seit 29.10. verschwunden. Der Shop insgesamt brach nicht ein (540 bis 680 Einblendungen je Tag, Position leicht schlechter, 55 auf 59); die Pyjama-Seiten schwanken, brachen aber nicht ein.

Das war **vor** unserer Textänderung (09.11. 20:42 UTC). Googles letzter Abruf der Sammlung war am 04.11. 03:55 UTC, also vor der Seitenverschlankung (04.11. 18:36 bis 18:55 UTC; Kategorieseiten waren davor 2,0 bis 2,6 MB gross, und Google liest laut Google-Blog nur die ersten 2 MiB) und vor dem neuen Text. **Hypothese (nicht belegt):** Google sah am 04.11. eine abgeschnittene, textarme Seite und stufte sie zurück; ein neuer Abruf zeigt die schlanke Seite (1,43 MB) mit Kaufhilfe. Prüfung nach dem Neu-Abruf: kommen die Einblendungen der Sammlung zurück (Erwartung: 20 bis 40 je Tag oder mehr)? Bleiben sie bei 0, war es etwas anderes (zum Beispiel eine Umordnung der Ergebnisse bei Google). Für die Messung am 18.11. gilt für Trinkbrunnen als Vorher-Wert die Zeit bis 03.11., nicht der 35-Tage-Schnitt der Tabelle.

## Lehren

1. Vor der Deutung einer Vorher-Nachher-Messung die Tagesreihe der Seite lesen: die Trinkbrunnen-Seiten verloren ihre Sichtbarkeit fünf Tage vor unserer Textänderung; ein Anstieg nach dem Neu-Abruf wäre sonst «Wirkung» einer Änderung, die nicht der Grund des Einbruchs war.
2. Einblendungen können unter einer Variantenadresse (`?variant=…&country=CH&currency=CHF`) laufen, während die saubere Adresse für Google «unbekannt» ist: bei einer Seiten-Abfrage mit 0 Zeilen zuerst mit `contains` auf die Kennung nachsehen, bevor man «keine Daten» schreibt.
3. Ein Vorher-Nachher-Vergleich nach einer Änderung am Titel oder Text zählt nur, wenn Google die Seite zwischen Änderung und Messung abgerufen hat; jede Messung beginnt mit `lastCrawlTime`.
4. Eine Seite, die zwei Sitzungen im Wechsel umschreiben (Futterautomat), nicht in eine Antragsliste nehmen, bevor der Text steht.
