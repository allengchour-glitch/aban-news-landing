# Französische Ankündigungsleiste und Fusszeile (09.11.2026)

Rest des «Rückgabe-Text»-Auftrags (`dropship/rueckgabe-0611/README.md`, Zeile «Offen: die französische Leiste und Fusszeile»).

## Ausgangslage (GEMESSEN 09.11.2026)
`translatableResources(ONLINE_STORE_THEME_SECTION_GROUP)`, Sprache `fr`: die Übersetzungen von Leistenzeile 1, 3, 4, 5 und dem Kontaktblock der Fusszeile waren `outdated`, wurden aber ausgeliefert (auf `/fr/policies/*` gelesen):

| Stelle | französisch vorher | Problem |
|---|---|---|
| Leiste 1 | «Boutique Suisse · Livraison gratuite dès CHF 50 · 30 jours de retour» | deutscher Text ist inzwischen ein anderer (Lieferung nur CH/LI, nach Rabatt) |
| Leiste 3 | «30 jours de retour · Paiement sécurisé & crypté» | ohne Zusatz zu selbst gestalteten Artikeln |
| Leiste 4 | «🎃 Nouveau : La boutique d'Halloween est là …» | Halloween-Shop, seit 01.11. Fasnacht |
| Leiste 4, Link | keine Übersetzung | führte von `/fr` auf die deutsche Sammlung |
| Leiste 5 | «Remise sur quantité : –10% dès 2 articles» | überholter Mengenrabatt (heute ab 2 Stück –5 %, ab 3 bis –10 %, nur bei ausgewählten Artikeln) |
| Fusszeile Kontakt | «Retour sous 30 jours», Links ohne `/fr` | ohne Zusatz; Richtlinien-Links führten vermutlich auf Deutsch |

## Was jetzt gilt (LIVE 09.11.2026, 18:4x UTC)
Sechs Schlüssel (Wortlaut in `apply.mjs`, Liste `ZIELE`). Wortlaut der deutschen Fassung ist die Vorgabe des Inhabers; die französische folgt ihr inhaltlich 1:1. Sprachprüfung (Schweizer Französisch, unabhängig) ohne Blocker; eingearbeitet: Richtlinien-Links auf `/fr/policies/…` (GEMESSEN: die drei Seiten liefern HTTP 200 mit `lang="fr"`), «chiffré» statt «crypté», «Rabais de quantité», geschützte Leerzeichen vor «:» und «%», «soirées»/«saison du carnaval», «Livraison» statt «Expédition».

## Betrieb
```bash
node dropship/fr-leiste-fusszeile-0911/apply.mjs                   # Trockenlauf (Vorgabe)
LIVE=1 node dropship/fr-leiste-fusszeile-0911/apply.mjs            # schreibt, sichert vorher.json, liest zurück
ZURUECK=1 LIVE=1 node dropship/fr-leiste-fusszeile-0911/apply.mjs  # stellt den Stand vor dem ersten Lauf wieder her
node dropship/fr-leiste-fusszeile-0911/apply_test.mjs              # 77 Prüfungen gegen eine Attrappe
node dropship/fr-leiste-fusszeile-0911/mutationsprobe.mjs          # 41 Muster, jedes muss den Test rot machen
```
Schutz: stimmt der deutsche Quelltext eines Schlüssels nicht mehr mit `ZIELE[].de` überein, schreibt das Werkzeug nichts (Exit 2). Die Sicherung wird nie überschrieben, nur ergänzt. Exit: 0 gut · 1 technisch · 2 Plan/Quelle/unvollständige Rücknahme · 3 Schreib- oder Rücklesefehler.
Die Rücknahme setzt die alten Werte zurück; die Markierung «veraltet» kommt dabei nicht zurück.

## Geprüft
- Test 77 Prüfungen, Mutationsprobe 41 von 41 (die erste Fassung hatte 4 von 20 überlebende Mutanten und echte Lücken: Sicherung nur beim ersten Lauf, Rücklesen ohne Wiederholung, Rücknahme ohne Prüfung, abgelaufener Token).
- Zwei unabhängige Prüfer (Sprache, Werkzeug), keine Blocker.
- Live: Rücklesen aller sechs Schlüssel gleich dem Zieltext, nicht mehr `outdated`; Storefront `/fr/policies/shipping-policy` zeigt die neuen Texte, die alten sind weg.

## Nicht gemessen
Darstellung der längeren Zeilen 4 und 5 in der laufenden Leiste auf dem Handy (Zeichenzahl +11 % bzw. +17 % gegenüber Deutsch); Wirkung auf Verkäufe (die Sprache `/fr` hat fast keinen Verkehr). Die französische Rückgaberichtlinie selbst trägt den Abschnitt «articles personnalisés» noch nicht (Punkt «Französische Richtlinien neu übersetzen» braucht das Ja des Inhabers).
