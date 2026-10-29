# Codex-Auftrag: Merchant Center nach dem Schaufenster (29.10.2026)

Besitzer 29.10. abends: «merchant macht codex jetzt». Nur Repo, Tests, Doku; kein Schreibzugriff auf Shopify/Google, `LIVE=1` nie. Regeln wie in `dropship/CODEX-VOLLGAS-2810.md`.
Marken: **GEMESSEN** = selbst gelesen (Datum) · **QUELLE** = fremde Angabe · **BEHAUPTUNG** · **unbekannt**.

## Ausgangslage (Besitzer-Screenshot 29.10., Merchant Center «Make these fixes»)
- «Shopping ads quota limit reached (outside of CSS program)»: 31,2 Tsd. Produkte (39 %).
- «Over capacity for Shopping ads (in CSS program)»: 21,2 Tsd. (26,6 %).
- «Missing product price»: 8,33 Tsd. (10,4 %). Neu gegenüber dem 28.10. (damals nur die zwei Quota-Karten, je 236 Tsd. = 60 %).
- Aus den Prozenten folgt eine Gesamtzahl von rund 80 Tsd. bei Google (31,2 / 0,39). Vorher rund 393 Tsd. (236 / 0,60). Die Abwahl wirkt also.

## Gemessen am Shop (29.10.2026, Bulk, nur lesen, 56 622 aktive Produkte)
- Auf dem Kanal «Google & YouTube» (`gid://shopify/Publication/302872297857`): **26 539 Produkte, 85 817 Varianten** (gleich dem Schaufenster-Lauf).
- **Keine** dieser Varianten hat einen leeren Preis oder einen Preis ≤ 0. «Missing product price» kommt daher nicht aus Shopify-Preisen.

## Offene Frage (Hypothesen, nicht belegt)
1. Quota: Google zählt rund 80 Tsd. Artikel, meldet aber trotzdem 52 Tsd. über der Quote. Entweder hinkt die Anzeige (Stunden bis Tage) oder die Quote dieses Kontos ist viel kleiner als die 150 000 aus der Google-Hilfe (QUELLE `support.google.com/merchants/answer/16564100`). Die genaue Zahl steht auf der Karte hinter «Learn more» / «View fix» (Besitzer fragen).
2. «Missing product price»: Ursache unbekannt. Kandidaten: Zeitversatz zwischen Abwahl/Wiederaufnahme und Feed, Varianten, die das Google-&-YouTube-Programm ohne Preis liefert, andere Preisquelle (Länder/Währung). Nicht raten.

## Aufträge
**M1. CSV-Auswerter** `automation/gmc_csv_auswertung.mjs` (+ `_test.mjs`, in `luxestyle-automation-tests.yml` eintragen, `sparse-checkout` UND `paths`): liest eine Merchant-Center-Exportdatei («Needs attention»/«All products», CSV), ordnet Angebots-IDs den Shopify-Produkten/Varianten zu (Katalogdatei wie `automation/katalog_bulk.mjs`, kein Netz), zählt je Problemgrund und liefert 10 Beispiele je Grund mit Handle. Format der Angebots-ID aus der CSV ableiten, nicht raten; unbekannte Spalten melden. Test mit künstlicher CSV, beide Seiten (bekannter Fall muss anschlagen, harmloser nicht), Mutationsprobe.
**M2. Schaufenster-Budget als Entscheid vorbereiten** (`automation/lib/gmc_schaufenster.mjs`, `automation/gmc_schaufenster.mjs`): `BUDGET` ist schon wählbar (Vorgabe 90 000, Minimum 40 000). Rechne offline mit dem gelesenen Katalog (`KATALOG=…`, Trockenlauf), wie viele Produkte und Varianten bei 60 000 / 50 000 / 40 000 im Schaufenster blieben und welche Stufen (Fortura, bewährt, Marge A/B) zuerst fallen. Nur Tabelle in dieser Datei, keine Änderung der Vorgabe.
**M3. Doku** in `dropship/GMC-SCHAUFENSTER-2810.md` (eigener Abschnitt mit Datum): obige Messung, die zwei Hypothesen, was wen entscheidet.

## Vom Besitzer nötig (nicht von Codex entscheiden)
- Zahl der Quote hinter «Learn more» der Karte «Shopping ads quota limit reached».
- 3 bis 5 Beispiele oder die CSV zu «Missing product price» (Merchant Center → «View products» → Download).
- Ob das Budget kleiner werden soll, falls die Quote kleiner ist (Entscheid nach M2).

## Zurück an Claude
Pro PR eine Zeile «Fund | nachgestellt (Befehl) | Test vorher rot, nachher grün». Offene Entscheide unter «Entscheid nötig» in der PR-Beschreibung.
