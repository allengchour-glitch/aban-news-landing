# LuxeStyle: sechs weitere Kategorien gezielt poliert

Stand: 06.11.2026, 16:34 Uhr Europe/Zurich

Lauf: R119

Shop: LuxeStyle · luxestyle.ch · CHF · Schweiz · CET

## Ergebnis

Sechs weitere bestehende Collection-Seiten wurden live bereinigt und um eine klare Navigation ergänzt. Geändert wurden je Collection `descriptionHtml` und die SEO-Beschreibung; beim BRUDER-Titel wurde zusätzlich das vorangestellte Symbol entfernt. Die anderen fünf SEO-Titel sowie Collection-Titel, Handles, Bilder und Alttexte, Sortierung, Produktzuordnungen und Preise blieben erhalten.

| Collection | Live-Seite | Neue Navigationsziele | Bereinigte Inhalte |
|---|---|---:|---|
| BRUDER Fahrzeuge | [ft-bruder](https://luxestyle.ch/collections/ft-bruder) | 5 | Unbelegte Qualitäts- und Schweizer-Lager-Aussage sowie das vorangestellte Symbol im SEO-Titel entfernt; Fahrzeuge, Figuren und Zubehör neutral eingeordnet |
| Herren-Schuhe | [herren-schuhe](https://luxestyle.ch/collections/herren-schuhe) | 6 | Pauschale Leder-, Sohlen-, Grössen-, Grössentabellen-, Liefer-, Rückgabe- und Rabattangaben entfernt |
| Damen-Schuhe | [damen-schuhe](https://luxestyle.ch/collections/damen-schuhe) | 6 | Laufendes-Wachstum-, Liefer-, Rückgabe- und Rabattformulierungen entfernt |
| Haarpflege & Styling | [beauty-haar](https://luxestyle.ch/collections/beauty-haar) | 7 | Schweizer-Lager-, Universal-Haarstruktur- und Rückgabeclaim sowie die nicht zum sichtbaren Sortiment passende Shampoo-/Kuren-Meta entfernt |
| Katzen | [haustier-katzen](https://luxestyle.ch/collections/haustier-katzen) | 6 | Pauschale Rückgabeaussage und fragiler Einzelproduktlink entfernt; sachliche Katzenbereiche ergänzt |
| Camping & Outdoor | [camping-outdoor](https://luxestyle.ch/collections/camping-outdoor) | 7 | Abenteuer-/Einzelprodukt-, Liefer-, Rückgabe- und Rabattclaims sowie der falsche Elternlink zu «Sport & Party» entfernt |

Jede Seite enthält jetzt eine kurze sachliche Einleitung, den Abschnitt «Schnell finden» und einen Hinweis, variantenabhängige Angaben direkt am Produkt zu prüfen. Insgesamt wurden 37 eindeutige Collection-Ziele ergänzt.

## Gegenprobe

- Shopify-Admin-Rücklesung: sechs von sechs `descriptionHtml`-Werte und sechs von sechs SEO-Beschreibungen stimmen mit dem Zielinhalt überein; fünf SEO-Titel blieben erhalten und der BRUDER-SEO-Titel wurde symbolfrei bestätigt.
- Finale Admin-Zeitstempel: `ft-bruder` 15:32:14Z, `herren-schuhe` 15:30:03Z, `damen-schuhe` 15:30:05Z, `beauty-haar` 15:30:06Z, `haustier-katzen` 15:30:08Z und `camping-outdoor` 15:30:09Z.
- Öffentliche Rücklesung: alle sechs Seiten liefern HTTP 200 sowie den jeweils korrekten Canonical, H1, die exakte neue Meta-Beschreibung und «Schnell finden».
- Die öffentlich gerenderten Collection-Beschreibungen enthalten 5, 6, 6, 7, 6 beziehungsweise 7 neue Links. Alle 37 Ziele liefern HTTP 200 und öffnen direkt ohne Weiterleitung.
- Die alten problematischen Aussagen und fragilen Links fehlen im jeweiligen Collection-Beschreibungsblock.
- Claude-Abgleich: `origin/main` stand bei `a51c1a64a`; keine der sechs Collections überschneidet die aktuelle Claude-Arbeit. Globale Theme-Dateien wurden nicht verändert und ältere Theme-Patches nicht übernommen.

## Offene Kategoriepunkte

Die Smart-Collection `camping-outdoor` zieht wegen ihrer breiten ODER-Titelregeln weiterhin mindestens eine Katzen-Hängematte und ein Hundebett ein. Eine zusätzliche Negativregel würde in der bestehenden ODER-Logik nicht sicher ausschliessen und könnte den Katalog stark erweitern. Deshalb wurde die Produktzuordnung in diesem Lauf nicht blind geändert; sie benötigt einen eigenen begrenzten Regel-/Tag-Diff.

Die global durch das Theme gerenderte Kategorie-FAQ enthält weiterhin unbelegte Schweizer-Lager-, Lieferzeit-, Rabatt- und pauschale Rückgabeformulierungen. MAIN enthält seit PR 2907 neue globale Kategorie-Theme-Dateien. Ein älterer Patch darf daher nicht übernommen werden; ausserdem sind direkte MAIN-Theme-Writes über den aktuellen Zugang blockiert.

## Grenzen dieses Laufs

R119 änderte genau sechs Collection-Beschreibungen, deren sechs SEO-Beschreibungen und einen SEO-Titel. Es gab keine Produkt-, Preis-, Bild-, Sortier-, Regel-, Theme-, Merchant-, Feed-, Metricool-, Klaviyo-, DNS-, Rabatt-, Budget-, Kunden-, Bestell- oder Renderänderung. Der Fertigstellungsgrad des gesamten Kategorienkatalogs bleibt unbekannt.
