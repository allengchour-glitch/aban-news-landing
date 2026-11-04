# Küche und Geschirr getrennt (03.11.2026)

Auftrag des Besitzers: «kochen geschirr trennen und so». Die Auslegung (Menü «Wohnen & Garten» mit 18 Gruppen aufteilen) ist eine Annahme; Rücknahme siehe unten.

## Was jetzt live ist (GEMESSEN am 03.11.2026, Live-Shop)

| Menü | Gruppen (Menü) | Sammlung des Kopfes |
|---|---|---|
| **Küche** | Kochen, Grillen & Backen · Küchenhelfer & Vorrat · Küchengeräte (mit «Wasserkocher & Kaffeemaschinen») | `kueche-kochen`, Titel «Küchenbedarf & Kochzubehör», 1 457 Produkte |
| **Geschirr** | Geschirr, Besteck & Tisch · Kaffee, Tee & Trinken | `geschirr-tisch`, Titel «Geschirr & Tisch», 841 Produkte |
| Wohnen & Garten | die übrigen 13 Gruppen, Reihenfolge wie vorher | unverändert |

- Jede der fünf Gruppen hat jetzt eine eigene Sammlung (`kochen-grillen-backen` 355, `kuechenhelfer-vorrat` 714, `kuechengeraete-alle` 388, `geschirr-besteck-tisch` 433, `kaffee-tee-trinken` 408). Vorher zeigte der Gruppenkopf nur seine erste Kind-Sammlung (z. B. «Kochen, Grillen & Backen» nur Pfannen, 112 von 355). Das alte Kopf-Ziel steht als erstes Kind der Gruppe.
- Regel jeder Sammlung: ODER über `TAG EQUALS sort-<kind>` der vorhandenen Kind-Sammlungen (BEST_SELLING, danach «Gut bewertete zuerst»). Mitglieder = Katalog (Abweichung 0). Küche und Geschirr überschneiden sich in 0 Produkten.
- Aus den Vereinigungen bewusst draussen (Fremdkörper, im Menü bleiben sie): `waagen` (Körper-, Haustier-, Kranwaagen), `haushaltsgeraete` (28 % Staubsauger, Bügeleisen), `sub-kueche` (Titel-Regel).
- **Menütitel «Küche» und «Geschirr» statt «Küche & Kochen» / «Geschirr & Tisch»:** mit den langen Titeln rutschten bei 1440 px «Wohnen & Garten» und «Elektronik» in «Mehr» (Browsermessung, Titel im Live-Menü getauscht). Mit den kurzen: 1440 px bis «Wohnen & Garten» (nur Elektronik in «Mehr»), 1920 px bis «Elektronik» (nur Auto & Motorrad in «Mehr»), 1280 px bis «Geschirr» (Wohnen & Garten in «Mehr»). Vorher: 1440 px bis Elektronik, 1920 px bis Auto, 1280 px bis Wohnen.
- **Sammlungstitel:** «Küche & Kochen» tragen schon `sub-kueche` (3 966 Produkte, indexiert) und das umgeleitete `kuche-kochen`; darum heisst die neue Kopf-Sammlung «Küchenbedarf & Kochzubehör».
- Meta-Texte höchstens 160 Zeichen (Prüfer-Fund: die ersten Entwürfe hatten 169 bis 214).
- Theme: `templates/collection.json` (MAIN) kennt die Welten «Küche» und «Geschirr» in der Filterzeile (Whitelist), sonst erschienen auf den Küchenseiten Damen, Ringe, Taschen. Sicherung: `dropship/kueche-geschirr-0311/collection.json.vor`.
- Französisch (`/fr`, einzige veröffentlichte Fremdsprache): Köpfe «Cuisine» und «Vaisselle» eingetragen; die Gruppen und Kinder waren vorher schon unübersetzt.

## Rücknahme

`LIVE=1 node automation/kueche_geschirr_zurueck.mjs` (Trockenlauf ohne `LIVE`). Liest `dropship/menu-sicherung/main-menu-vor-kueche-geschirr-0311.json` (Stand VOR dem Umbau), streicht die Ids der neu angelegten Einträge (35; menuUpdate meldet für unbekannte Ids NOT_FOUND), behält alle anderen Ids (Übersetzungen), liest streng nach. Die sieben neuen Sammlungen bleiben im Shop. Filterzeile: `collection.json.vor` zurückschreiben.

## Werkzeuge und Prüfung

`automation/lib/kueche_geschirr_menue.mjs` (Plan, `pruefeUmbau`, `rueckgaengigEingabe`, `kopfTitelNeu`), `automation/kueche_geschirr_gruppen.mjs` (legt die sieben Sammlungen an, Mengenprüfung, HTTP-Prüfung im Onlineshop), `automation/kueche_geschirr_menue.mjs` (Menü, Trockenlauf Vorgabe, Sicherung, strenges Nachlesen), `automation/kueche_geschirr_zurueck.mjs`. Test `automation/lib/kueche_geschirr_menue_test.mjs` (161 Prüfungen, in der CI), Mutationsprobe 49 Mutanten, alle erkannt. Vorlage des Tests: `dropship/taxonomie-2610-b/orakel/menue-main-0311.json`. Drei unabhängige, nur lesende Prüfer vor dem Live-Gang (Workflow `wf_f733daab-933`): kein Blocker, 8 wichtige Funde behoben (Rücknahme-Weg, Ids und Tags im Vergleich, Titelkollision, Meta-Texte, Wasserkocher gehört zu Küchengeräten, Belegpflicht «Zangen», Mengenprüfung, Heilweg bei halbem Zustand).

## Offen (kein Blocker)

- «Küche & Kochen (alle)» (`sub-kueche`, 3 966, rund 11 % fachfremd) bleibt letztes Kind von «Kochen, Grillen & Backen»: entfernen oder «Alle Küchenartikel» nennen? Der neue Kopf ersetzt ihn.
- Kind «Kochlöffel, Zangen & Sets» trägt «Zangen» im Titel, 0 Titel der Mitglieder nennen eine Zange; Kind «Waagen» ist halb Körperwaage.
- Rund 120 Küchen-/Geschirrprodukte tragen noch kein `sort-`-Tag (Prüfer-Schätzung) und fehlen in den neuen Sammlungen, bis der nächste Kategorien-Lauf sie einsortiert.
- Die neuen Sammlungsseiten sind 2,0 bis 2,5 MB gross (wie alle Kategorieseiten; Googlebot liest 2 MB). Die Verschlankung der Kopfzeile wartet auf einen freien Theme-Platz (`INDEX-ANALYSE-0311.md`).
- Wirkung auf Index und Verkäufe ungemessen: die sieben Adressen nach 7 und 14 Tagen mit `inspect_urls` messen (nie am selben Tag).
