# LuxeStyle: sechs Hauptkategorien gezielt poliert

Stand: 06.11.2026, 14:37 Uhr Europe/Zurich

Lauf: R118

Shop: LuxeStyle · luxestyle.ch · CHF · Schweiz · CET

## Ergebnis

Sechs bestehende Collection-Seiten wurden live ergänzt und bereinigt. Pro Collection änderten sich ausschliesslich `descriptionHtml` und die SEO-Beschreibung; alle sechs bestehenden SEO-Titel blieben exakt erhalten. Die bestehende Gestaltung, das aktuelle Banner und die Produktdarstellung blieben ebenfalls erhalten. Jede Einleitung ordnet die Auswahl neutral ein, der Abschnitt «Schnell finden» führt zu geprüften Unterkategorien, und kurze Auswahlhinweise helfen beim Stöbern ohne unbelegte Produktversprechen.

| Collection | Live-Seite | Ergänzte Unterkategorien | Bereinigte Inhalte |
|---|---|---:|---|
| Damen-Mode | [damen-mode](https://luxestyle.ch/collections/damen-mode) | 6: Kleider, Blusen & Tops, Hosen, Röcke, Strick & Pullover, Schuhe | Unbelegte tägliche Neuheiten, Fair-/Preisclaims, Rabatt- und fragile Produktlinks entfernt |
| Herren-Mode | [fur-ihn](https://luxestyle.ch/collections/fur-ihn) | 6: Shirts & Tops, Pullover & Strick, Jacken & Hoodies, Hosen, Schuhe, Uhren & Schmuck | Unbelegte tägliche Neuheiten, Fair-/Preisclaims und pauschale Rückgabeaussagen entfernt |
| Kinder & Baby | [sub-baby-kids](https://luxestyle.ch/collections/sub-baby-kids) | 6: Babykleidung & Kindermode, Baby-Kleider/Oberteile/Jacken, Kinder-Sets & Outfits, Kinderschuhe, Spielzeug, Schule & Kindergarten | Entwicklungs-, Qualitäts- und Hype-Claims sowie fragile Produktlinks entfernt |
| Sport & Outdoor | [sport-outdoor](https://luxestyle.ch/collections/sport-outdoor) | 6: Yoga & Fitness, Fitnessgeräte & Home-Gym, Camping & Outdoor, Velo & Radsport, Schwimmen/Tauchen/Wassersport, Sporthelme & Schutzausrüstung | Unbelegte Premium-/Abenteuerclaims und fragile Produktlinks entfernt |
| Beauty & Pflege | [beauty-pflege](https://luxestyle.ch/collections/beauty-pflege) | 7: Make-up, Nägel & Nageldesign, Wimpern & Lashes, Hautpflege, Haarpflege & Styling, Beauty-Geräte, Parfum & Düfte | Unbelegte Wirkungs-/Hype-Aussagen, Rabatt- und pauschale Rückgabeclaims entfernt |
| Haustierwelt | [sub-haustier](https://luxestyle.ch/collections/sub-haustier) | 6: Hunde, Katzen, Leinen & Tierkleidung, Tierspielzeug, Näpfe & Füttern, Pflege & Unterwegs | Unbelegte Produktzahl, falscher Elternlink und fragile Produktlinks entfernt |

Die Shop-Einstellung zur öffentlichen Gratisversandsschwelle wurde in diesem Lauf nicht verändert. Sie ist kein Bestandteil der sechs neuen Collection-Beschreibungen; eine frische Rücklesung findet darin weder «CHF 50» noch eine Gratisversandaussage.

## Gegenprobe

- Shopify-Admin-Rücklesung: alle sechs geschriebenen `descriptionHtml`-Werte und alle sechs neuen SEO-Beschreibungen stimmen exakt mit dem jeweiligen Zieltext überein; die vorhandenen SEO-Titel sind 6/6 unverändert.
- Öffentliche Rücklesung: sechs von sechs Seiten liefern HTTP 200, den jeweils selbstreferenziellen Canonical, den richtigen H1, die neue Einleitung, die exakte neue Meta-Description und die Überschrift «Schnell finden».
- Linkprüfung: 37 von 37 ergänzten Unterkategorie-Links sind erreichbar. Für Spielzeug wurde der direkte, kanonische Collection-Link verwendet.
- Schutzfelder: Collection-Titel, Handles, Collection-Bilder und Alttexte, Regeln, Sortierung, Produktzuordnungen, Produktpreise und SEO-Titel blieben unverändert.
- Claude-Abgleich: keine Überschneidung der sechs Handles mit der aktuellen Claude-Arbeit. PR 2907 ist in `origin/main` (`8c123bc07`, 06.11.2026 12:49Z) gemergt; das belegt keine produktive Theme-Ausführung. Weil ein frischer Diff gegen den aktuellen MAIN-Theme-Stand nötig ist und MAIN-Theme-Writes blockiert sind, wurden in R118 keine Theme-Dateien angefasst.

## Separater offener Theme-Blocker

Die live durch das Theme ausgegebene Kategorie-FAQ enthält weiterhin nicht belegte Aussagen wie «Ab Schweizer Lager meist 2–3 Werktage, im Direktversand 10–20 Werktage» sowie globale Rabatt-/Rückgabeformulierungen. Diese Texte sind kein Bestandteil der sechs Collection-Beschreibungen. Ihre Korrektur benötigt wegen des in MAIN gemergten PR 2907 einen neuen Abgleich gegen den aktuellen MAIN-Theme-Stand; MAIN-Theme-Writes sind blockiert und ein älterer Theme-Patch darf nicht blind übernommen werden.

## Grenzen dieses Laufs

R118 änderte genau sechs Collection-Beschreibungen und deren sechs SEO-Beschreibungen. Es gab keine Theme-, Produkt-, Preis-, Bild-, Merchant-, Feed-, Metricool-, Klaviyo-, DNS-, Rabatt-, Budget-, Kunden-, Bestell- oder Renderänderung. Der Lauf belegt keinen Fertigstellungsgrad des gesamten Kategorie- oder Produktkatalogs.
