# SEO: doppelte Titel und Beschreibungen bei Sammlungen, zweite Charge (09.11.2026)

Auftrag: «mach alles fix» (Besitzer 09.11.), Rest der Doppelungen nach dem Modus `beschreibung` (siehe `dropship/seo-beschreibung-0911/README.md`).
Werkzeug: `apply.mjs` (Trockenlauf Vorgabe), Daten: `aenderungen.json` (42 Einträge, 23 Sammlungen), Sicherung: `sicherung/vor.json` (Ist-Stand vor der Änderung, 23 Einträge).

## Messung (09.11., lesend)

- `automation/kategorie_seo_dubletten.mjs` normalisiert stark (Gross-/Kleinschreibung, Satzzeichen, Markenzusatz) und zeigte darum 17 Titel- und 11 Beschreibungsgruppen. **Massgebend ist die exakte Zeichenkette der Sammlungen in der Sitemap** (1 559 deutsche Sammlungen, aus den vier Teil-Sitemaps `sitemap_collections_N.xml`). Dort waren es 13 + 4 + 2 betroffene Gruppen, der Rest war harmlos (unten).
- **Nachher gemessen (09.11. 11:56 UTC): 0 doppelte SEO-Titel, 0 doppelte SEO-Beschreibungen, 0 leere Felder** unter den 1 559 Sammlungen der Sitemap (Skript im Scratch, rechnet gegen die Admin-API und die Sitemap).

## Was geändert wurde (LIVE 09.11. ca. 11:50 und 11:55 UTC, alles frisch zurückgelesen GLEICH)

| Gruppe | Sammlungen | Änderung |
|---|---|---|
| Herren Kurzarm/Langarm | `herren-poloshirts-kurzarm`, `-langarm`, `herren-t-shirts-kurzarm`, `-langarm` | SEO-Beschreibung folgt dem SEO-Titel («Poloshirts kurzarm für Herren online kaufen. …») |
| Standardtext «Ausgewählte Produkte aus dem LuxeStyle Sortiment …» | `bestseller-shop`, `eu-lager-schnell` | eigene Beschreibung aus dem Titel und dem eigenen Sammlungstext abgeleitet |
| Filter-Chips mit gleichem Namen unter verschiedenen Warengruppen | `kabellos-laden-magnetisch`, `handyhalter-magnet`, `kopfhoerer-kabellos-bluetooth`, `controller-bluetooth-kabellos`, `laufschuhe-mesh`, `sportschuhe-mesh`, `schneidebretter-holz-bambus`, `kochutensilien-holz`, `servierplatten-holz`, `regale-holz-bambus` | SEO-Titel und SEO-Beschreibung nennen den Gegenstand (Wortlaut aus den Produkttiteln der Sammlung belegt, 9 Titel je Sammlung gesichtet); der Sammlungstitel (H1, Chip-Beschriftung) bleibt |
| Zwei Warengruppen, gleicher Name | `armbaender-leder` (53 Uhrenarmbänder aus Leder, heisst jetzt «Uhrenarmbänder aus Leder»), `tier-pullover-hoodies` (15 Haustier-Pullover, heisst jetzt «Pullover & Hoodies für Haustiere») | Sammlungstitel, Sammlungstext, SEO-Titel und SEO-Beschreibung; `lederarmbaender` (66 Schmuckarmbänder) und `hoodies-sweatshirts` (68) bleiben unberührt |
| Teilmenge einer grösseren Sammlung | `motorrad-rucksaecke` (27 von 31 in `rucksaecke-motorrad`), `moissanit-schmuck` (5 von 97 in `moissanit`), `besteck-essstaebchen` (46 von 77 in `besteck`) | eigener SEO-Wortlaut; **keine Indexierungsänderung** (kein `noindex`), Google kennt von diesen Paaren laut Search Console nur `moissanit` und `besteck` (indexiert) |
| Ohne Meta-Beschreibung | `mengenrabatt-ab-2-stueck`, `mengenrabatt-ab-3-stueck` | SEO-Beschreibung aus dem eigenen Sammlungstext (Rabattstufen wie dort) |

Neue Werte: Titel höchstens 60, Beschreibung höchstens 160 Zeichen; kein ß, kein Gedankenstrich, keine Rückgabe-/Rabattcode-Aussage, kein «MagSafe» und kein «D-VVS1» (unbelegt, vom Werkzeug verboten); jeder neue Titel und jede neue Beschreibung ist im ganzen Bestand (1 723 Sammlungen) einmalig (Kollisionsprüfung vor dem Schreiben).

## Bewusst nicht angefasst (der Trockenlauf des Werkzeugs zeigt sie weiter, sie sind harmlos)

| Gruppe | Grund |
|---|---|
| `metalldetektor`, `metalldetektoren-schatzsuche`, `express-lieferung` | je nur ein oder acht Entwurfsprodukte, die Adresse leitet per 301 weiter (`/collections/outdoor-garten`, `/collections/eu-lager-schnell`), nicht in der Sitemap |
| `under-armour`, `marke-under-armour`, `gant`, `marke-gant` | alle Produkte Entwurf, 301 auf `sport-outdoor` bzw. `sonnenbrillen-alle`, nicht in der Sitemap |
| `🎁-geschenke-bis-chf-30-alt-20261010`, `beleuchtung-lampen` | in keinem Verkaufskanal veröffentlicht (0 Publikationen) |
| `herren-uhren` / `uhren-herren`, `spielzeug-pluesch` / `pluesch-kuscheltiere` | die Zeichenketten der Titel und Beschreibungen unterscheiden sich (nur das Werkzeug normalisiert sie gleich) |
| `selbst-gestalten-1` / `✏️-selbst-gestalten` | die zweite steht nicht in der Sitemap; «Selbst gestalten» ist der Bereich des Editors |

**Beobachtung:** Eine 301-Weiterleitung hat in Shopify Vorrang vor einer veröffentlichten Sammlung gleichen Handles (`/collections/express-lieferung` antwortet 301, obwohl die Sammlung veröffentlicht ist).

## Prüfung

- Selbsttest 73 Prüfungen (`node dropship/seo-doppelt-0911/apply.mjs --selbsttest`), darunter der ganze Ablauf gegen eine Attrappe des Shops: Trockenlauf schreibt nichts, LIVE schreibt alle 23, zweiter Lauf schreibt nichts, Rücknahme stellt alles her, abweichender Ist-Wert bricht ab, userErrors, verpuffendes Schreiben je Feld, Kollision, Rücknahme bei später entstandener Kollision, Sicherung ergänzt und überschreibt nie.
- **Mutationsprobe 43 von 43 erkannt** (Skript im Scratch `mut_seo_doppelt.py`, nicht im Repo). Die erste Runde liess drei Lücken: Rücklesen prüfte nur den SEO-Titel, die Sicherung wurde beim zweiten Lauf überschrieben, die Rücknahme prüfte die Kollision; jede hat jetzt ein eigenes Szenario.
- Live: Trockenlauf (Kollisionsprüfung gegen alle Sammlungen: keine Treffer), LIVE, Rücklesen 21 von 21 und danach 2 von 2 gleich, zweiter Lauf 0 Änderungen. Storefront-Stichprobe an sechs Seiten (HTTP 200, `<title>` und `<h1>` wie geplant).

## Rücknahme

`ZURUECK=1 LIVE=1 node dropship/seo-doppelt-0911/apply.mjs` (schreibt nur dort zurück, wo der Shop noch genau den neuen Wert trägt; sonst Exit 3). Die alten Werte stehen im `alt` der Daten und in `sicherung/vor.json`.

## Ungemessen

Eine Wirkung auf Rang oder Klicks ist nicht zu erwarten (Hygiene für Audits); Google braucht Tage, bis die neuen Titel in den Ergebnissen stehen. Die Zahl «0 Fehler» im Semrush-Sinn bleibt ungemessen (`no_api_units`).

## Lehren

- «0 Dubletten» an der exakten Zeichenkette der Sammlungen aus der Sitemap messen, nicht an den normalisierten Gruppen des Werkzeugs; so schrumpften 28 Gruppen auf 19 echte.
- Vor einer Struktur-Änderung (Weiterleitung, noindex, Menü) zuerst messen, ob die Sammlung überhaupt sichtbar ist (Veröffentlichungen, Sitemap, 301): vier der sechs «leeren» Fälle waren schon erledigt.
- Ein Skript, das live schreibt, braucht den Ablauf gegen eine Attrappe: erst damit fand die Mutationsprobe die drei Lücken im Schreibweg.
