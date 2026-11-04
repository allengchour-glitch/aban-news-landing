# LuxeStyle Gesamtaudit R81

Stand: 04.11.2026. Dieser Bericht bündelt die aktuelle Live-Stichprobe und die vollständige Offline-Auswertung des belegten Aktivexports vom 26.10.2026. Es wurden keine Shop-, Theme-, Feed-, Metricool-, DNS-, Flow-, Rabatt-, Budget- oder Inventareinstellungen geändert.

## Aussagekraft

- **Aktuell live bestätigt:** Shop- und Metricool-Identität, fünf Shopify-Produkte mit 52 vollständig gelesenen Varianten, ausgewählte öffentliche Seiten und die Metricool-Planung vom 04.–11.11.2026.
- **Historisch vollständig ausgewertet:** 56'630 ACTIVE-Produkte aus dem Export mit Datenständen vom 30.09.–26.10.2026. Diese Auswertung findet Kandidaten, beweist aber nicht, dass jeder Treffer am 04.11. noch unverändert live ist.
- **Unbekannt im Vollkatalog:** aktuelle Varianten, Preise, SKUs, Bilder, Tracking, `inventoryPolicy`, Storefront-Verfügbarkeit sowie Shopify- und Google-Taxonomie. Diese Felder fehlen im Vollsnapshot und werden deshalb niemals als null oder fehlerfrei ausgegeben.
- **Merchant:** 28 hochgeladene Problemdateien, davon 26 unterschiedliche Inhalte. Unterschiedliche Exportfilter machen Trendvergleiche möglich, aber keinen vollständigen Reparaturnachweis.

## Identitäten

- Shopify: **LuxeStyle**, `luxestyle.ch`, CHF, Schweiz.
- Metricool: Brand **6227837**, Zeitzone `Europe/Zurich`.
- Kanäle stimmen mit der Vorgabe überein: Facebook `1049840534888592`, Instagram/Threads/TikTok `luxestyle.ch`, Pinterest `luxestyleCH`, YouTube `UCSfCEYjAsdOyYxyfTClXRZA`.

## Sofort blockieren

1. **Keine automatischen Materialnachträge.** Der aktuelle Material-Helfer besteht zwar 141 Basistests, fällt aber bei 12 von 23 zusätzlichen Quellenkonflikt-Prüfungen durch. Er überspringt bestehende Materialfelder und kann Holz-/Stoff- oder Komponentenwidersprüche nicht sicher auflösen. Das Live-Skript schreibt zudem ohne frischen Feldvergleich.
2. **Keine ungeprüften Massenkorrekturen.** Material-, Taxonomie-, Titel-, SKU- und Merchant-Treffer müssen produktbezogen live und bei Bedarf gegen die Lieferantenquelle bestätigt werden.
3. **Keine Social-Ausspielung gesperrter Produkte.** Im historischen Export haben 24'389 Produkte mindestens einen Social-Sperrtag; 24'233 davon tragen `rueckhol-0907`. Rechte-, Adult-, Medizin- und weitere Sperrtags bleiben erhalten.

## P1 – bestätigte Livefehler

### Faltbare Katzenhängematte mit Saugnäpfen, Produkt 16610153759111

- Fliesstext: «aus Stoff»; Detailzeile: «Material: Holz». Eine belastbare Komponentenquelle für Bezug und Gestell fehlt.
- Shopify-Taxonomie: «Reisenäpfe»; Google-Kategorie: «Pet Bowls, Feeders & Waterers». Beides ist für eine Katzenhängematte fachlich falsch.
- Öffentlicher Breadcrumb führt zusätzlich über «Sport & Party > Camping & Outdoor»; der Fehler erscheint auch in den Strukturdaten.
- Aktuell kaufbar bestätigt: 12 Varianten, 11 Bilder, CHF 34.90–37.90; alle Varianten `availableForSale=true`, `CONTINUE`, `tracked=false`. Daraus folgt keine Bestands- oder Lieferzeitzusage.

### Hundepullover mit Norwegermuster, weiss, Produkt 16605072458119

- Titel nennt «weiss»; alle zehn aktuellen Varianten sind Braun oder Beige.
- Text nennt nur Grösse M; live vorhanden sind XS–XL.
- Text nennt 200 g; derselbe Text zeigt 57–117 g je Variante.
- «Hundelange» und «Der Langer» sind klare Textfehler.
- Titelbild zeigt ein mehrfarbiges Norwegermuster; Handle und Meta-Beschreibung tragen alte Begriffe.
- Wolle, Mass und Gewicht bleiben ohne Lieferantenbeleg gesperrt.

### Weitere aktuelle Prüffälle

- Produkt 16611936010631: Pullover im Titel, aber Handle, Alttexte und Tag nennen noch «Hundekuscheldecke»; das Titelbild zeigt ein Tiermotiv, während der Titel «Streifen» verspricht.
- Produkt 15525477187969: Geschirr-mit-Leine-Set ist als Standardleine eingeordnet; Material-, Funktions- und Massangaben sind quellenabhängig.
- Produkt 15450834665857: «40x50 cm» steht in der Farboption und zusätzlich «S» in der Grössenoption; `rueckhol-0907` blockiert Social.

## P1 – historischer Vollkatalog, vor Write live bestätigen

| Bereich | Befund |
|---|---:|
| Kritische/hohe Textsignale | 3'523 Produkte |
| Material-Prüfkandidaten | 2'841 |
| Materialzeile gegen Fliesstext | 1'504 |
| Mehrere unterschiedliche Materialzeilen | 595 |
| Titel-/Text-Materialabweichungen | 336 |
| Medizin-/Therapieaussagen | 15 |
| Review-/Beliebtheitsaussagen | 13 |
| Hoch sichere Produkttyp-/Tag-Widersprüche | 103 |
| Weitere Taxonomie-Prüffälle | 66 |
| Konservative Text-/Optionswidersprüche | 62 Produkte |
| Zusätzliche Titel-/Handle-/Exklusivitätsprüffälle | 621 Produkte |

Konkrete Taxonomiefehler betreffen unter anderem Lampen unter Sport oder Organizer, Küchengeräte unter Organizer, Haustierbetten unter Mode sowie Schmuck unter Haushalt, Make-up oder Geschenkset. Fünf Lampen tragen Schmuck-Tags. Die offizielle Ziel-Taxonomie-ID muss vor jeder Änderung nachgeschlagen werden.

Weitere Commerce-Signale:

- fünf Produkte mit Optionswerten, die sich nur in Gross-/Kleinschreibung unterscheiden;
- `GLOBAL-FAP-A2`, `GLOBAL-FAP-A3` und `GLOBAL-FAP-A4` werden jeweils bei acht Posterprodukten wiederverwendet;
- Inventar-Sentinelwerte `-1`, 40'000 und insgesamt 759'999 in historischen Stichproben sind keine Bestandsversprechen;
- 66 Gruppen identischer Titel, darunter sechs Produkte «Arbeitsschuhe mit Stahlkappe»;
- ein 589×554-Bild in der geprüften historischen Auswahl.

Die grossen Werte 53'926 feste Lieferzeitfenster und 53'068 pauschale «Geprüfte Angaben»-Blöcke stammen weitgehend aus wiederholten Serviceblöcken. Sie sind Prüfsignale, keine automatische Feststellung, dass jede Aussage falsch ist.

## Merchant Center

In der jüngsten gefilterten Serie vom 02.11. wurden 1'693 unterschiedliche Offer-IDs über alle Probleme beobachtet. Deduplizierte Hauptgruppen:

- fehlender Preis: 1'211 Offer-IDs;
- Werbe-Overlay im Bild: 277;
- Bild zu klein: 75;
- Produktseite nicht erreichbar: 30;
- defekter Bildlink: 15;
- fehlende Verfügbarkeit: 13;
- CSS-Kapazitätsgrenze: 42, als Konto-/Programmthema getrennt von Produkttexten.

Die beobachtete Menge beim fehlenden Preis ist gegenüber früheren Exporten deutlich kleiner. Wegen wechselnder Filter ist der Restzustand unbekannt und nicht «behoben». Richtlinienfälle werden getrennt: offensichtliche Fehlklassifikationen eignen sich für gezielte Überprüfung; tatsächlich sensible Produkte brauchen zuerst eine Richtlinien- und Datenprüfung. Negative API-Zähler und externe Google-Produktempfehlungen wurden nicht als LuxeStyle-Daten verwendet.

## Website und Kategorien

- Alle 24 begrenzt geprüften internen Ziele antworteten HTTP 200. Die geprüften Seiten haben Canonicals, parsebares JSON-LD und Sprachalternates.
- Hauptkategorien zeigen fachfremde Filterchips: Haustierwelt 27 Chips, Beauty 18 und Elektronik 23. Darunter stehen Mode, Schmuck, Auto, Küche oder Haustier ausserhalb des jeweiligen Kontexts. Die geprüfte Tag-Zielseite ist 200, selbstkanonisch und nicht `noindex`.
- Der bekannte Preisfilterfehler bleibt offen: Zusatzpager verlieren die aktive Höchstpreisgrenze. Der geprüfte Fünfzeilen-Patch ist noch nicht live.
- Sitemap: 1'560 Collection-URLs; «Alle Kategorien» nennt 412 Unterkategorien in 21 Gruppen, 76 davon unter «Weitere Kategorien».
- Die geprüften Seiten enthalten 775–839 unterschiedliche interne URLs und 1'535–1'664 interne Linkvorkommen. Roh-HTML lag bei 1.52–2.72 MB. Das beweist keine schlechten Core Web Vitals, zeigt aber eine grosse Navigations- und DOM-Last.
- Auf der Startseite hatten 53 von 65 tatsächlichen Bildern leere Alttexte; auf vier Collections jeweils vier. Dekorative Bilder dürfen leer bleiben, informative Produkt-/Kategoriebilder brauchen einen kurzen Alttext.
- Aussagen wie «Kostüme ab Schweizer Lager» und 2–3 Werktage wurden gesehen, aber in diesem Audit nicht belegt.

## Metricool-Planung 04.–11.11.2026

- 34 Planungsobjekte, 51 kanalbezogene Zustände, alle `PENDING`; 34 mit Auto-Publish, keine Entwürfe.
- Netzwerkzustände: Facebook 16, Instagram 16, TikTok 13, Pinterest 5, Threads 1, YouTube 0.
- Keine exakte Kollision mit gleichem Kanal, Zeitpunkt, Text und Medium. Keine Medienwiederholung auf demselben Kanal; wiederholte URLs kommen nur kanalübergreifend vor.
- Zwei geplante Facebook-/Instagram-Posts haben leere Captions: ID 415033593 am 09.11. um 16:00 und ID 415035691 am 10.11. um 12:30, jeweils Europe/Zurich.
- YouTube hat im Fenster keinen Termin, Threads nach dem 04.11. keinen und Pinterest nach dem 08.11. keinen. Eine Lücke ist kein Fehler und erzeugt keine Veröffentlichungspflicht.
- `PENDING` ist nicht veröffentlicht. Produktbindung, Rechte und Medienqualität sind durch Metricool-Metadaten nicht belegt. Es wurde nichts geändert oder neu terminiert.

## Content-, Klaviyo- und Verkaufsstand

- Der bestehende Sternenprojektor-Master `luxe_sternenprojektor_master_20261018` bleibt ein ausgearbeiteter 18-Sekunden-Schnitt- und Textplan. Es liegt weiterhin keine freigegebene professionelle Master-MP4 vor. Exakte Default-/Motiv-/Einheitsbindung, vier geeignete Originaltakes, Bearbeitungs-/Werberechte und die historische Musik-Buildbindung sind offen. Es wurde kein Render gestartet.
- Die Tageskennzahlen und Klaviyo wurden wegen der bereits abgeschlossenen Tagesabfrage nicht nochmals gelesen. Der datierte R77-Beleg vom 04.11. um 08:10:41 Europe/Zurich zeigte `Vse76a`, `VbLQj6` und `RnTvsY` jeweils `draft`. Das Konto meldete USD, der Shop CHF; Geldwerte wurden nicht vermischt. Fehlende Abandoned-Checkout-Berichtszeile bleibt unbekannt und ist nicht null.
- Genau ein vorhandener Klaviyo-Textentwurf bleibt offen: Betreff und Inhalt von Email 3 im Abbruch-Flow. Er wurde weder angewendet noch aktiviert oder versendet.
- Die nächste klar umrissene Verkaufsverbesserung ist Produktwahrheit vor zusätzlichem Traffic: zuerst Katzenhängematte und Hundepullover mit belegten Angaben und richtiger Taxonomie bereinigen, danach Missing-Price-Angebote quellenweise prüfen. Das ist ein Korrekturplan, keine freigegebene Shop-/Feed-/Flowänderung.

## Sichere Korrekturreihenfolge

1. Die fünf live gelesenen Produkte als ersten Review-Stapel behandeln: aktueller Wert, Produktbild/Variante, Lieferantenquelle, Zielwert und minimaler Diff.
2. Katzenhängematte nur nach Komponentenbeleg beim Material korrigieren; Shopify-Taxonomie, Google-Kategorie, Breadcrumb und JSON-LD gemeinsam auf eine verifizierte Katzenbett-/Hängematten-Kategorie ausrichten.
3. Den Hundepullover 16605072458119 mit aktuellen Varianten neu formulieren; unbelegte Wolle-, Mass- und Gewichtsangaben entfernen oder blockiert lassen.
4. Merchant in getrennten Stapeln bearbeiten: Preis/Verfügbarkeit, URL/Bild und Richtlinienfälle. Je Offer-ID aktive Quelle und Rohwert zuerst lesen.
5. Historische P1-Kandidaten zusammenführen und jeweils 20–50 explizite Produkt-/Varianten-IDs aktuell read-only gegenprüfen. Ein Vollbestand darf höchstens über einen kontrollierten, checkpointed Bulk-Lesejob mit Vollständigkeitsbeleg erhoben werden.
6. Kategorien mit kleinen, fachlich passenden Allowlists bereinigen; Preisfilter separat und minimal korrigieren. Danach Pagination, Nachladen, Canonicals und strukturierte Daten erneut testen.
7. Erst nach Quellen- und Diffprüfung ein Freigabepaket für konkrete Writes erstellen. Unklare Writes nie blind wiederholen.

## Quellenbelege

| Bericht | SHA-256 |
|---|---|
| `merchant-report.md` | `8c8640acdd5003f42e6c5a482e46d1989af1780ac6098cc98d8f1ebd6ffa3e98` |
| `commerce-report.md` | `b9ce74a68654770fbdee3490ee2e7450cdeeac78c599812765acf1c7ebdfc969` |
| `taxonomy-report.md` | `caac882309c38c5dc77fd68bfe6d5b5bbd05178044036196bf99377dcc7d07b0` |
| `title-variant-report.md` | `10769dc7557515c3a0cc3732f260bc09cf88001ec71a402e38bb23df104cbb7d` |
| `website-report.md` | `e9183a50da3c8977e2ac80faf350bfea38a8b5edfec435ac71b9a1916b145679` |
| `tooling-report.md` | `99cc482b94f441be2f85fa161dc633d742293c05574c8d4b2ba80bcfd2dc94e6` |
| `materials-report.md` | `b573a5f0a16e12d46babfa0e9aae29dd7183da36d4a12fe91a3fa09717a33765` |
| `live-sample-review.md` | `cbd9a11ad030590f863aeabc0899a9fbc975b6f7dbde9ce38f6ae39fd511939a` |
| `metricool-planning-summary.json` | `4f93f4ec58723d72a90c95118677ee4f36fc57c2ef1510ed7f802cd0637e6782` |

