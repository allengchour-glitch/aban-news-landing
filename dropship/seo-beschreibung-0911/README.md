# SEO-Beschreibungen der Damen-/Herren-/Kinder-Sammlungen (09.11.2026)

Auftrag: «fix alles» (Besitzer 09.11.), Punkt «SEO-Reste» aus der Liste vom 08.11. («5 Sammlungs-Paare mit gleichem Titel oder gleicher Beschreibung»).
Werkzeug: `automation/kategorie_seo_dubletten.mjs`, neuer Modus `MODUS=beschreibung` (Plan: `beschreibungsPlan` in `automation/lib/seo_dubletten.mjs`, Test `automation/lib/seo_dubletten_test.mjs`, 92 Prüfungen, Mutationsprobe 36 von 36).

## Messung (09.11., lesend, 1 720 Sammlungen mit Produkten)

- Die **SEO-Titel** der Paare (Hosen, Kopfbedeckung, Hausschuhe …) unterscheiden sich seit dem 28.10. («Hosen für Herren online kaufen»). Die Titel-Paare nach Geschlecht sind aufgelöst; offen bleiben 17 Titel-Gruppen (16 ohne Geschlecht im Handle, darunter Lederarmbänder, dazu Herrenuhren: `herren-uhren` / `uhren-herren`), Trockenlauf `MODUS=geschlecht`.
- Die **SEO-Beschreibungen** blieben die Vorlage «Hosen online kaufen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.» und standen bei beiden Sammlungen gleich: **35 Gruppen, 75 Sammlungen** mit gleicher Beschreibung, davon 23 reine Damen-/Herren-/Kinder-Gruppen. Audit-Werkzeuge zählen das als doppelte Meta-Beschreibung.
- Eine Wirkung auf Rang oder Verkäufe ist **nicht zu erwarten und nicht gemessen** (die Beschreibung ist kein Rankingsignal; Google schreibt sie oft um). Es ist Hygiene für den Wunsch «0 Fehler» in Audits.

## Was geändert wurde (LIVE 09.11. 10:29 bis 10:30 UTC)

**49 Sammlungen**, nur `seo.description` (der eigene SEO-Titel geht unverändert mit, weil Shopify `seo` als Ganzes ersetzt): «<Gegenstand> online kaufen. <Rest>» wird «<Gegenstand> für Damen|Herren|Kinder online kaufen. <Rest>».
Beispiel: `herren-hosen` → «Hosen für Herren online kaufen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.»

- Frisch zurückgelesen: 49 von 49 gleich dem Soll (Exit 0). Zweiter Trockenlauf danach: 0 Änderungen.
- Auf der Storefront gemessen (curl, HTTP 200): `herren-hosen`, `damen-hosen`, `kinder-hausschuhe`, `herren-sandalen` tragen die neue Beschreibung in `meta description` und `og:description`, der Seitentitel ist unverändert.
- Sicherung (alter und neuer Wert je Sammlung): `sicherung.json` in diesem Ordner. Ledger: `dropship/seo_dubletten_ledger.txt` (Zeilen «beschreibung <handle>»).

## Regel (nur was sicher ist)

Eine Gruppe wird nur geändert, wenn danach KEINE Beschreibung mehr doppelt ist: nur die Vorlage «… online kaufen. …», je Geschlecht höchstens ein Mitglied, höchstens ein Mitglied ohne Geschlecht (es behält den Text), keine neue Beschreibung gleicht einer vorhandenen, höchstens 160 Zeichen. Alles andere steht als «OFFEN» im Trockenlauf und bleibt unberührt.

## Rücknahme

`MODUS=beschreibung ZURUECK=1 LIVE=1 node automation/kategorie_seo_dubletten.mjs` (ohne `LIVE=1` Trockenlauf). Setzt die alte Beschreibung aus `sicherung.json` zurück, aber nur bei Sammlungen, deren Beschreibung noch genau dem geschriebenen Wert entspricht; hat seither jemand anders etwas geändert, bleibt sie unberührt und der Lauf endet mit Exit 3.

## Offen (11 Gruppen, 25 Sammlungen; Rest der Messung)

| Gruppe | Handles | Grund |
|---|---|---|
| Standardtext «Ausgewählte Produkte aus dem LuxeStyle Sortiment …» | express-lieferung, bestseller-shop, eu-lager-schnell | kein Geschlecht, drei Sammlungen ohne eigenen Text |
| Metalldetektoren | metalldetektoren-schatzsuche, metalldetektor | doppelte Sammlung (Menü-Entscheid, nicht Text) |
| Geschenke bis CHF 30 | 🎁-geschenke-bis-chf-30-alt-20261010, 🎁-geschenke-bis-chf-30 | die «alt»-Sammlung ist ein Überbleibsel |
| Kurzarm / Langarm für Herren | herren-poloshirts-…, herren-t-shirts-… (je zwei) | gleiches Geschlecht; die Titel lösen die Einträge `MANUELL` auf, für die Beschreibung fehlt die Zuordnung (4 Sammlungen, kleine Ergänzung) |
| Lederarmbänder, Motorrad-Rucksäcke | je zwei Sammlungen | Doppelsammlungen mit gleichem Titel (Menü-Entscheid) |
| Magnetisch & MagSafe, Kabellos & Bluetooth, Mesh & atmungsaktiv, Holz & Bambus | je zwei bis vier Sammlungen | gleicher Begriff in verschiedenen Warengruppen: braucht je Gruppe einen Gegenstand im Text |

Nicht angefasst (kosmetisch, Nutzen klein): 6 Produkttitel und 1 Sammlung über 70 Zeichen, 14 Seitentitel über 60, 7 Seitenbeschreibungen über 160, 3 Sammlungs-Beschreibungen über 160.

## Hinweise

- `kategorien_anlegen.mjs` und die Taxonomie-Erzeuger schreiben die Vorlage nur für neu angelegte oder als `aktualisiere` markierte Sammlungen; die Titel vom 28.10. blieben seither stehen, bei der Beschreibung ist dasselbe zu erwarten. Wird eine Sammlung neu erzeugt, den Trockenlauf wiederholen (idempotent).
- Spätere Chargen ergänzen die Sicherung (der erste alte Wert bleibt), sie wird nie überschrieben.

## Lehren

- Die Mutationsprobe fand vier Lücken im ersten, sofort grünen Test: die Prüfung «danach nichts mehr doppelt» war ohne Gegenbeispiel ungetestet (Gegenstand nennt beide Geschlechter, allgemeine Sammlung bliebe der unveränderten gleich), das Rücklesen der Rücknahme fehlte, und die Vorlage «nur mit Rest» hatte keinen Randfall.
- Ein Gegenbeispiel für jede Schutzprüfung vor dem Vertrauen auf «alles grün»: sonst steht eine Prüfung im Code, die nie auslöst.
