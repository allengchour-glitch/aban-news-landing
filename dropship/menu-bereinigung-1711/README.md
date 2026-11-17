# Hauptmenü bereinigt (17.11.2026, Besitzer «2 ja»)

Anlass: Die Nachprüfung des Kachel-Fixes (`dropship/kategorie-kacheln-1611/README.md`, Funde 8, 9, 12, 13) nannte vier Menüeinträge, die sich nur im Menü beheben lassen. Der Besitzer antwortete am 17.11. auf meine Frage mit «2 ja» («Menü bereinigen») und «mach alles fix».

## Was geändert wurde (LIVE 17.11.2026 06:07 UTC, Exit 0)

Menü `main-menu`: 784 → 781 Einträge. Alle anderen 780 Einträge haben dieselbe id, Titel, Typ, Adresse, Tags, Eltern und Reihenfolge (unabhängig frisch gelesen und verglichen).

| Nr. | Änderung | Grund |
|---|---|---|
| E1 | «Sport & Party > Partydeko & Ballone» (HTTP `party-deko-ch`) entfernt | Dieselbe Sammlung steht als Sammlungs-Eintrag unter «Party, Deko & Geschenk». Der erste Menü-Treffer legte den falschen Eltern-Pfad für `party-deko-ch` fest (Codex-Fund 12). |
| E2 | «Sport & Party > Taschenlampen & Stirnlampen» (HTTP `taschenlampen`) entfernt | Dieselbe Sammlung steht weiter unter «Wandern, Angeln & Wasser». |
| E3 | «Wohnen & Garten > Fenster, Wand & Uhren > Wecker» (HTTP `wecker`) entfernt | Zwei Einträge «Wecker» am selben Ort (Fund 9). Der Sammlungs-Eintrag `wecker-radiowecker` (42 Produkte) bleibt, `wecker` (24 Produkte) war fast eine Teilmenge. |
| E4 | Unter «Beauty & Pflege > Körper, Mund & Düfte» als ERSTES Kind neu: «Parfum & Düfte» (Sammlung `parfum-duefte`, französisch «Parfums & fragrances») | Fund 8: die grösste Beauty-Sammlung (1 284 Produkte) hatte keinen eigenen Kind-Eintrag. Die Adresse der Gruppe bleibt `/collections/parfum-duefte`. |
| E5 | «🎁 Geschenke & Weihnachten > Kiffer-Zubehör (18+)» (HTTP `smoke-zubehoer`) entfernt | Fund 13: die 18+-Rubrik wurde zur Bildkachel und zum Nachbarlink auf 14 Geschenke-Seiten. Die Sammlung (114 Produkte) bleibt per Adresse erreichbar. |

Nach der Änderung stehen `wecker` und `smoke-zubehoer` nirgends mehr im Menü (beide Sammlungen bleiben veröffentlicht). Beide sind in `aenderungen.json` unter `verwaistOk` ausdrücklich erlaubt.

### Warum E4 anders ist als zuerst geplant

Die erste Fassung bog die Adresse der Gruppe zusätzlich von `parfum-duefte` auf `koerperpflege-bad` um. Ein unabhängiger Prüfer rechnete es mit dem Kachel-Simulator nach (`sim.py`, 0 von 742 Abweichungen gegen den Live-Stand): die Gruppe wäre auf eine 26-Produkte-Seite gefallen, Parfum aus der Beauty-Übersicht und aus den Nachbarlisten von fünf Seiten verschwunden, `parfum-duefte` selbst von 3 Kacheln auf 0 gefallen. Mit der Variante «Adresse bleibt, nur ein erstes Kind» ändert sich bei keiner Seite eine Kachel oder ein Nachbar durch E4. Dasselbe Muster (Eltern und erstes Kind zeigen auf dasselbe Ziel) hat das Menü schon bei «Beauty & Pflege», «Elektronik», «Highlights» und «Sport & Party».

## Werkzeug

`automation/menu_bereinigen.mjs` (Lauf) und `automation/lib/menu_bereinigen.mjs` (Logik). Eine benannte Liste kleiner Änderungen in einem Lauf: Eintrag `entfernen`, Adresse eines HTTP-Eintrags `url` ändern, Sammlung als Kind `einfuegen`. Aufbau wie `menu_eintrag_verschieben.mjs`, mit Übersetzungsschutz für das ganze Menü.

```
AENDERUNGEN=dropship/menu-bereinigung-1711/aenderungen.json node automation/menu_bereinigen.mjs          # Trockenlauf (Vorgabe, schreibt nur die Sicherung)
LIVE=1 AENDERUNGEN=dropship/menu-bereinigung-1711/aenderungen.json node automation/menu_bereinigen.mjs   # schreibt
```

Ablauf, jede Stufe bricht vor dem Schreiben ab: Menü lesen und Form prüfen, betroffene Sammlungen frisch lesen, Plan auf einer Kopie, unabhängige id-basierte Nachprüfung (genau die benannten Einträge fehlen oder ändern sich, nichts verwaist ausser `verwaistOk`), Übersetzungen ALLER 801 Menü-Links sichern, Sicherung des ganzen Menüs, direkt vor dem Schreiben noch einmal lesen (Exit 4 bei Änderung), `menuUpdate`, frisch lesen und streng vergleichen (ids, Titel, Typ, Ziel, Tags, rohe Adresse bei HTTP), Übersetzungen nachlesen, verlorene wieder eintragen, französischen Titel des neuen Eintrags eintragen. Exit 0 in Ordnung, 1 Aufruf- oder Lesefehler, 2 Prüffehler (nichts geschrieben), 3 geschrieben aber Abweichung, 4 Menü während des Laufs verändert.

Sicherung (wird nie überschrieben): `dropship/menu-sicherung/main-menu-vor-bereinigen-2026-11-17T06-07-40-035Z.json` (ganzer alter Baum mit ids) und `…-uebersetzungen-….json` (alle Übersetzungen). **Rücknahme:** das Werkzeug hat keinen Rückwärtsgang. Die vier entfernten Einträge einzeln im Admin (Onlineshop → Navigation → Hauptmenü) wieder anlegen: Titel und Adresse stehen in der Sicherung, Ort und Reihenfolge in der Tabelle oben; ihre französischen Titel gehen dabei verloren und müssten von Hand neu gesetzt werden.

## Prüfung

- **Test:** `node automation/lib/menu_bereinigen_test.mjs`, 130 Prüfungen, im CI (`luxestyle-automation-tests.yml`). Reine Logik gegen den ECHTEN Menübaum vom 17.11. (`menu_vorher.json`, 784 Einträge) und Läufe gegen eine ehrliche Attrappe von `shopifyGql` (liefert beim Lesen nur, was die Abfrage verlangt, wirft bei unbekannten Feldern, speichert wie Shopify: Adresse aus der resourceId, neue ids, Übersetzungen).
- **Mutationsprobe:** `python3 dropship/menu-bereinigung-1711/mutationsprobe.py`, 68 Mutanten, **67 erkannt, 1 gleichwertig** (Nr. 32: der Zusatz `k.id` im letzten Block von `pruefePlan` ist doppelt abgesichert, jede Fälschung fällt vorher auf). Der erste Test liess 16 von 57 Mutanten überleben, weil sich Prüfungen gegenseitig deckten: die Tests verlangen jetzt die zuständige Meldung, nicht irgendeinen Fehler.
- **Drei unabhängige Prüfer vor dem Schreiben** (Code, Plan gegen das Live-Menü, Shopify-Semantik), jeder Fund einzeln nachgestellt: kein Blocker. Behoben: E4 (siehe oben), rohe HTTP-Adresse im Nachlesen, jeder Link und der französische Eintrag einzeln abgesichert (ein Fehler beim ersten Link brach früher den Rest ab), neuer Eintrag in `pruefePlan` unabhängig geprüft (resourceId, keine Adresse, Tags, Kinder), zwei Einfügungen unter demselben Eltern verboten, `fr` und `verwaistOk` geprüft, Vergleichsfehler nach dem Schreiben ergibt Exit 3 statt Absturz. Nicht umgesetzt: die Übersetzung der Gruppe (siehe unten).
- **Trockenlauf gegen den echten Shop** als eigener Aufruf (Exit 0, 801 Links gelesen), dann Live-Lauf.
- **Nach dem Schreiben unabhängig gemessen:** Menü frisch gelesen und gegen den alten Stand verglichen (Python: 4 Einträge weniger, 1 neu, 0 veränderte, 0 Reihenfolgen verändert); Storefront (curl mit Browser-Kopf, 8 Seiten, alle HTTP 200): «Parfum & Düfte» verlinkt, `smoke-zubehoer` und «Kiffer» 0 mal, HTTP-«Wecker» 0 mal, auf `/fr` «Parfums & fragrances» 2 mal; Kacheln und Nachbarn von `beauty-pflege`, `parfum-duefte`, `party-deko-ch`, `premium-geschenke`, `vorhaenge-gardinen-rollos`, `wecker` gleich dem Simulator (6 von 6). Alle 742 Seiten wurden NICHT neu gescannt (Simulator war am 16.11. bei 742 von 742 exakt; Stichprobe 6 Seiten).

## Offen und ungemessen

- Die französische Übersetzung der Gruppe «Körper, Mund & Düfte» lautet «Parfum & Fragrances» und ist bei Shopify als veraltet (`outdated`) markiert: der deutsche Titel nennt Körper und Mund, der französische nur Parfum. Das bestand schon vorher. Eine Korrektur ist eine Textentscheidung, nicht angefasst.
- `/collections/wecker` bleibt veröffentlicht (24 Produkte, 23 davon auch in `wecker-radiowecker`). Ob Google sie indexiert hat, ist nicht geprüft; eine 301-Weiterleitung auf `wecker-radiowecker` wäre der saubere nächste Schritt (ein Produkt, das Wecker-Armband, fehlt dort, bleibt aber in neun weiteren Sammlungen).
- Alle 742 Kategorieseiten nach der Änderung neu zu messen (rund 75 Minuten gedrosselt) steht aus; Hypothese: wie vorhergesagt 22 Seiten mit geänderten Nachbarn oder Kacheln, keine schlechter.
- `damen-kleider` steht viermal als Überschrift im selben Eltern (vermutlich bewusst), nicht angefasst.

## Lehren

1. Ein Werkzeug, das die Liste «was ändert sich» selbst nachrechnet, fand beim ersten Testlauf den echten Fall, den die Planung übersehen hatte: zwei gleich betitelte Geschwister («Wecker»). Der Pfad allein reicht nicht, der Handle muss entscheiden.
2. Die Prüfung am Simulator gehört VOR die Entscheidung: eine Änderung, die auf dem Papier «besser» aussieht (Gruppe auf die Körperpflege-Seite), war für 1 284 Produkte ein Rückschritt.
3. Eine Mutationsprobe mit überlappenden Prüfungen meldet «erkannt», weil irgendeine andere Prüfung anschlägt. Erst die Forderung nach der zuständigen Meldung macht jede Prüfung einzeln beweisbar.
4. `mktemp`-Ordner einer Mutationsprobe füllten die Platte (121 Ordner, 340 MB): Tests räumen ihr Verzeichnis selbst auf.
