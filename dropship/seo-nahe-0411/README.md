# SEO-Titel und Meta für Suchbegriffe auf Position 7 bis 35 (04.11.2026)

Marken: **GEMESSEN** = hier abgefragt · **Hypothese** = nicht belegt · **unbekannt** = nicht gemessen.

## Auslöser und Verfahren
Die Search Console (3 Monate bis 01.11., Property luxestyle.ch) zeigt für den ganzen Shop sehr wenig Nachfrage: rund 60 Klicks in 28 Tagen, fast alle Suchanfragen auf Position 50 bis 90. Ausnahmen mit Reichweite, aber 0 Klicks: Weihnachts-Pyjama (Familie/Partner, rund 370 Einblendungen auf Position 21 bis 34), Katzen-Futterspender (rund 150 auf Position 17 bis 21), Aroma-Diffuser mit Flammeneffekt, Fusselrasierer USB (49 auf Position 19,5), «Selbst gestalten» (Position 30 bis 103) und der Rizinusöl-Wickel (107 Einblendungen, 8 Klicks, Position 7,8).

Workflow `wf_7a580dcf-0c0` (nur lesend): sechs Sucher (Shop-Daten über die Admin-API, Google-Treffer über Firecrawl mit Standort Schweiz, Search-Console-Zahlen) und je ein unabhängiger Prüfer, der jeden Vorschlag selbst gegen Datenblatt, Fotos und Zeichenzahl nachlas. 10 Agenten, rund 2,6 Mio. Tokens, 20 Minuten.

## Was live ist (7 Seiten, 13 Felder, `aenderungen.json`)
Nur `seo.title` und `seo.description`; keine Produkttexte, Preise oder Bilder. Rücklesen aller sieben Seiten GLEICH; auf der Live-Seite `flammen-diffuser-715840` stehen Titel, Meta und `og:`-Felder im neuen Wortlaut (GEMESSEN 04.11. ca. 20:30 UTC).

| Gruppe | Seite | Änderung |
|---|---|---|
| Weihnachts-Pyjama | Sammlung `weihnachtspyjama-familie` | Titel «Familien-Weihnachtspyjama & Partnerlook», Meta mit beiden Zielgruppen getrennt |
| | `weihnachts-pyjama-sets-fur-die-ganze-familie-613100` | Titel/Meta auf «Papa, Mama, Kind und Baby» ausgerichtet |
| | `weihnachts-pyjama-im-partnerlook-764352` | Titel/Meta auf Weihnachtsmann-Motiv und Partnerlook |
| Aroma-Diffuser | `flammen-diffuser-715840`, `new-flame-aroma-diffuser-mit-flammeneffekt-620700` | konkrete Merkmale statt «der Trend-Hit» / Boilerplate |
| Fusselrasierer | `tragbarer-usb-fusselrasierer-613400`, `usb-fusselrasierer-283968` | Hauptseite «Fusselrasierer USB», Nebenseite grenzt sich mit «Akku oder Batterie» ab |

Die Prüfer änderten 6 von 13 Sucher-Vorschlägen: «gestreift»/«rot» beim Familien-Pyjama (widerspricht den Fotos), «Karomuster in Weiss» (nur der Optionswert heisst Weiss), ein missverständlicher Satz in der Sammlungs-Meta. Alle neuen Texte: kein Preis, keine Liefer- oder Rückgabeaussage, kein Gratis-Versand-Satz (die Pyjama-Metas trugen vorher «30 Tage Rückgabe» und den Rabattcode).

## Was nicht geändert wurde, und warum
- **Katzen-Futterspender:** zwei der drei Seiten sind Entwurf (nicht in die Schweiz lieferbar bzw. CJ-Produkt entfernt), die aktive steht gegen Fressnapf, Galaxus, Amazon u. a.; das Wort «elektrisch» ist im Datenblatt nicht belegt. Keine Änderung.
- **«Selbst gestalten»:** Positionen 30 bis 103 gegen Druck-Shops mit Konfigurator und Hunderten Bewertungen (LuxeStyle: 0). Ein Text hebt die Seite nicht. Wiedervorlage in 28 Tagen.
- **Rizinusöl-Wickel:** der Prüfer gab zwei neue Texte frei, ich habe sie **nicht** eingespielt: die Seite ist der einzige Shop-Treffer mit echten Klicks (CTR 7,5 % bei Position 7,8, Kaufbegriffe auf Position 3 bis 4), und ein umgeschriebenes Snippet kann die Klickrate senken. Eingriff erst, wenn ein belegter Nutzen erkennbar ist.

## Funde, die nicht Teil dieser Änderung sind (Besitzer-Entscheide)
1. **«30 Tage Rückgabe» in der Meta-Beschreibung von mindestens 42 «Selbst gestalten»-Produkten** (gemessen an den ersten 50 gelesenen), obwohl der Rückgabe-Kasten auf derselben Seite Rückgabe aus Meinungsänderung bei personalisierter Ware ausschliesst. Mehrere Metas enden zudem abgeschnitten mit «Code…» (Bomberjacke, Hoodie, Boardshorts, Kleid, Jogginghosen, Badeanzug, Pullover, Trinkflasche, klassisches T-Shirt), beim recycelten Hoodie sogar der SEO-Titel mit «…». Die Entscheidung vom 28.10. («30 Tage Rückgabe» aus SEO-Texten entfernen?) ist weiter offen. Die zwei fertigen Texte für Bomberjacke und Keramik-Tasse liegen im Workflow-Ergebnis (Scratch) bereit.
2. **Familien-Pyjama `613100` widerspricht sich selbst:** Text «Gestreiftes Cartoon-Muster», Option «Rot», Material einmal «Baumwollmischgewebe», einmal «Polyester»; alle 6 Fotos zeigen ein weisses Set mit Weihnachtsmann-/Rentier-Muster. Bis das beim Lieferanten geklärt ist, steht in Titel und Meta keine Muster-, Farb- oder Materialaussage. Die Fotos wirken laut Prüfer wie Katalogbilder einer anderen Marke (Bildrechte ungeprüft).
3. Die Sammlungsbeschreibung `weihnachtspyjama-familie` nennt «möglichst bis Mitte November» (Regel vom 28.10.: Bestellschluss nur mit Ja des Besitzers) und «Rückgabe innerhalb von 30 Tagen».
4. Rund 25 Diffuser-Seiten tragen dieselbe Boilerplate-Meta mit «30 Tage Rückgabe»; der Faktenblock von `flammen-diffuser-715840` sagt «rund» und «Batterie/Akku», Text und Fotos zeigen ein abgerundetes Rechteck mit USB-Betrieb.
5. `shirt-zum-selbstgestalten`: Merchant-Metafeld `gender` = female bei einem Unisex-Shirt.
6. Die beiden aktiven Beutel (`bio-jutebeutel-selbst-gestalten`, `allover-stoffbeutel-selbst-gestalten`) stehen bei Google auf «Crawled - currently not indexed»: ein Fall für die Index-Liste, nicht für Text.

## Wirkung und Nachmessung
Unbekannt (Hypothese), Erwartung gering: die Mengen sind klein (bei den Diffusern 24 Einblendungen in drei Monaten). Nachmessen am 18.11. und 02.12. mit denselben Suchbegriffen und Seiten (Einblendungen, Position, Klicks): `familien-weihnachtspyjama`, `partner weihnachtspyjama`, `weihnachtspyjama pärchen`, `aroma diffuser mit flammeneffekt`, `fusselrasierer usb`. Die Weihnachtssaison hebt die Einblendungen unabhängig von der Änderung an; ein Vorher-Nachher-Vergleich muss das berücksichtigen.

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/seo-nahe-0411/apply.mjs` schreibt die alten Werte zurück, aber nur, wenn die Seite noch den neuen Wert trägt. Der Ist-Stand vor dem Eingriff liegt in `sicherung/vor.json`. Selbsttest: `node dropship/seo-nahe-0411/apply.mjs --selbsttest` (20 Prüfungen).

## Lehren
- Ein Sucher schlug «gestreift» und «rot» vor, weil die Textfelder des Produkts es sagen; erst der Prüfer, der alle Fotos ansah, fand den Widerspruch. Für Titel mit Muster- oder Farbaussage gilt: Foto ansehen, nicht nur das Datenblatt lesen.
- Von drei konkurrierenden Futterspender-Seiten waren zwei Entwürfe: vor jedem Kannibalisierungs-Fix den Status lesen.
