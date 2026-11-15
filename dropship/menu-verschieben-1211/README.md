# Werkzeug: einen Menü-Eintrag verschieben

Stand 15.11.2026. Erster Live-Lauf 12.11.2026 00:07:29 UTC: «Ersatzteile & Zubehör» (`ersatzteile-zubehoer`) von «Wohnen & Garten > Putzen & Haushalt» unter «Elektronik» hinter «Elektronik-Kleinteile» (Besitzer 11.11.: «kategorie ja verschieb, mache das automatisch»). 784 Einträge gleich, id gleich. Sicherung: `dropship/menu-sicherung/main-menu-vor-verschieben-ersatzteile-zubehoer-2026-11-12T00-07-27-319Z.json`.

## Lehre: menuUpdate wirft die Übersetzung des verschobenen Eintrags weg

GEMESSEN nach dem Lauf vom 12.11.: die id blieb gleich (`gid://shopify/MenuItem/1486632485255`), aber `translatableResource(gid://shopify/Link/1486632485255).translations(locale:"fr")` war leer; Stichproben anderer Einträge behielten ihre Übersetzung. Am 15.11. 20:12 UTC von Hand wieder eingetragen («Pièces de rechange & accessoires», frischer Digest, nachgelesen, `outdated:false`). Seit 15.11. macht das Werkzeug das selbst: es liest die Übersetzungen des Eintrags vor dem Schreiben (auch im Trockenlauf; nicht lesbar = Abbruch, nichts geschrieben) und trägt fehlende nach menuUpdate mit frischem Digest wieder ein (`automation/lib/menu_uebersetzung.mjs`). Bleibt danach etwas offen: Exit 3 mit den alten Werten in der Meldung. Test 199 Prüfungen (Pflicht 8: Übersetzung weg und wieder da, Gegenprobe ohne Verlust, userErrors, nicht lesbar, Trockenlauf), Mutationsprobe der neuen Stellen 9 von 9.

## Zweck

Verschiebt GENAU EINEN Collection-Eintrag im Hauptmenü von einem Elterneintrag zu einem anderen. Alles andere bleibt, wie es ist: ids, Titel, Typ, Adresse, resourceId, Tags, Reihenfolge und Kinder aller Einträge, auch des verschobenen.

`menuUpdate` ersetzt den ganzen Baum. Darum baut das Werkzeug die Eingabe aus dem gelesenen Baum, prüft den Plan unabhängig nach, liest das Menü direkt vor dem Schreiben noch einmal und vergleicht danach streng.

## Dateien (Pfade wie im Repo)

| Datei | Inhalt |
|---|---|
| `automation/menu_eintrag_verschieben.mjs` | Runner: Lesen, Sicherung, Schreiben, Nachlesen. Funktion `verschiebenLauf(q, opt)` mit eingespeister Abfrage. |
| `automation/lib/menu_verschieben.mjs` | Reine Logik ohne Netz: Leseform, Pfade, Treffer, Plan, Nachprüfung, Vergleich, Rücknahmebefehl, Sicherungsname. |
| `automation/lib/menu_verschieben_test.mjs` | Test mit Attrappe von shopifyGql (kein Netz). Die Attrappe liefert nur, was die Abfrage verlangt (siehe Tests). |
| `automation/lib/menu_verschieben_mutationsprobe.mjs` | Mutationsprobe in einer Kopie im Temp-Ordner. |

Gebraucht aus dem Repo (unverändert, im Scratch als Kopie von `origin/main` 1210e38609, byte-gleich geprüft): `lib/shopify_gql.mjs`, `lib/shopify_secret.mjs`, `lib/shopify_host.mjs`, `lib/menue_plan.mjs` (`ziel`, `tiefe`). Kein Dateiname kollidiert mit `main`.

## Aufruf

```
HANDLE=<collection-handle> VON='<Titelpfad alter Eltern>' ZIEL='<Titelpfad neuer Eltern>' \
  [NACH='<Geschwistertitel>' | VOR='<Geschwistertitel>'] [LIVE=1] \
  [MENUE=main-menu] [SICHERUNG_DIR=dropship/menu-sicherung] \
  node automation/menu_eintrag_verschieben.mjs
```

- Trockenlauf ist Vorgabe. Nur `LIVE=1` schreibt (nicht `true`, nicht `yes`).
- Titelpfade mit ` > ` getrennt. Die oberste Ebene ist der Titel des obersten Eintrags. Ein Pfad gilt nur, wenn er genau einmal vorkommt.
- Ohne NACH und VOR kommt der Eintrag ans Ende von ZIEL. VOR ist eine Ergänzung zur Vorgabe; sie wird für die Rücknahme gebraucht, wenn der Eintrag vorher der erste war.
- Zugang wie die anderen Menü-Werkzeuge: `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` (Client-Credentials), Admin-API 2025-01.

Für den Auftrag vom 11.11.:

```
HANDLE=ersatzteile-zubehoer VON='Wohnen & Garten > Putzen & Haushalt' ZIEL='Elektronik' NACH='Elektronik-Kleinteile' LIVE=1 node automation/menu_eintrag_verschieben.mjs
```

## Was geprüft wird (jede Regel mit eigenem Test)

1. Menü lesen (3 Ebenen). Der Eintrag muss genau einmal direkt unter VON stehen. Vorher wird die Form des Gelesenen geprüft (Regel 10). Collection frisch über `collectionByHandle`; fehlt sie, Exit 2.
2. ZIEL genau einmal, nicht gleich VON, nicht der Eintrag selbst oder sein Nachfahre. Unter ZIEL kein Eintrag mit gleichem Titel, gleicher Adresse oder gleicher resourceId. NACH bzw. VOR genau einmal unter ZIEL.
3. Tiefe: Ebene(ZIEL) + 1 + Ebenen unter dem Eintrag ≤ 3.
4. Eingabe für `menuUpdate` aus dem gelesenen Baum (wie `eingabeAus()` in `menu_eintrag_einfuegen.mjs`, gegen dessen Ausgabe am echten Menü gleich gemessen). Danach unabhängige Nachprüfung des Plans (`pruefePlan`): ohne den verschobenen Eintrag sind alter Baum und Plan gleich, der Eintrag ist unverändert, steht genau einmal unter ZIEL an der verlangten Stelle und nicht mehr unter VON.
5. Sicherung des ganzen gelesenen Menüs nach `<SICHERUNG_DIR>/<menü>-vor-verschieben-<handle>-<UTC-Zeitstempel>.json`, auch im Trockenlauf. Eine vorhandene Datei wird nie überschrieben (Flag `wx`, sonst `-2`, `-3` …). Geht die Sicherung nicht, Exit 1 und nichts geschrieben.
6. LIVE: Menü direkt vor dem Schreiben noch einmal lesen. Weicht es ab (Menü-id, Titel, Handle, ein Eintrag in Titel, Typ, Ziel, Adresse, Tags, Reihenfolge oder id), Exit 4 und nichts geschrieben.
7. Nach dem Schreiben frisch lesen und streng vergleichen: jeder andere Eintrag mit gleichem Pfad, Titel, Typ, Ziel, Tags, Reihenfolge und id; der verschobene genau einmal am neuen Ort an der geplanten Stelle, nicht mehr am alten; Gesamtzahl gleich. Eine NEUE id des verschobenen Eintrags (oder seiner Kinder) ist kein Fehler, wird aber ausdrücklich gemeldet: «id gleich (…)» oder «id NEU (alt -> neu): Übersetzungen dieses Eintrags prüfen».
8. HANDLE und MENUE müssen `^[a-z0-9-]+$` sein (sonst Exit 1 ohne Netz). Das Menü wird über `handle:<MENUE>` gesucht und dann genau auf diesen Handle gefiltert. `userErrors` von `menuUpdate` = Exit 3.
9. Rücknahmebefehl wird immer ausgegeben (siehe unten).
10. Leseform (neu 12.11., Fund W1): Direkt nach dem ersten Lesen und vor dem Planen prüft `pruefeLeseform`, dass das Menü id, title und handle hat, jeder Eintrag die Schlüssel `id title type resourceId url tags` (Wert darf null sein, ausser id: nicht leerer Text; tags: Liste) und jeder Eintrag auf Ebene 1 und 2 eine Liste `items`. Sonst Exit 1, nichts geplant, keine Sicherung, nichts geschrieben; die Meldung nennt Ebene, Pfad und fehlenden Schlüssel (höchstens 10 Zeilen). Die Pflichtliste `LESE_PFLICHT` ist bewusst eine eigene Liste und nicht aus `FELDER` abgeleitet. Grund: fragt `MENU_Q` zu wenige Ebenen oder Felder ab, sehen Plan, Nachprüfung und Nachlesen alle dieselbe verkürzte Sicht, und `menuUpdate` löscht still, was fehlt (siehe Abschnitt Gegenprüfung).

### Abweichung von der Vorgabe: HTTP-Einträge

Die Vorgabe verlangte «Typ COLLECTION». Der Eintrag «Ersatzteile & Zubehör» ist im echten Menü aber ein **HTTP-Link** auf `/collections/ersatzteile-zubehoer` (GEMESSEN 11.11. 23:20 und 23:38 UTC; im Hauptmenü sind 142 von 784 Einträgen HTTP). Mit «nur COLLECTION» bräche die verlangte Verschiebung immer mit Exit 2 ab. Darum zählt auch ein HTTP-Eintrag, dessen Adresse genau `/collections/<handle>` ist: ohne Abfrage, ohne weiteren Pfadteil, ohne längeren Handle, eigener Host und Sprachpräfix zählen nicht, ein fremder Host zählt nicht. Andere Typen (PAGE usw.) zählen nie. Der Eintrag wird nicht umgeschrieben: er bleibt HTTP mit seiner Adresse.

## Exit-Codes

| Code | Bedeutung | geschrieben? |
|---|---|---|
| 0 | in Ordnung (Trockenlauf oder LIVE mit strengem Nachlesen ohne Abweichung) | nur bei LIVE |
| 1 | Aufruffehler: HANDLE/MENUE ungültig, VON/ZIEL fehlt oder hat leeren Teil, NACH und VOR zugleich, Menü nicht gefunden, gelesenes Menü unvollständig (Regel 10), kein Token, Sicherung unmöglich | nein |
| 2 | Prüffehler: Collection fehlt, Eintrag nicht genau einmal unter VON, VON/ZIEL fehlt oder mehrdeutig, ZIEL im Eintrag, Dublette unter ZIEL, NACH/VOR nicht eindeutig, zu tief, Nachprüfung des Plans | nein |
| 3 | geschrieben (oder Zustand unklar), aber: `userErrors`, Netzfehler beim Schreiben, Nachlesen unmöglich oder Abweichung beim strengen Vergleich. Sicherung liegt vor. | ja oder unklar |
| 4 | Menü hat sich zwischen erstem Lesen und Schreiben verändert | nein |

Restfenster: zwischen dem erneuten Lesen (6) und `menuUpdate` bleibt ein kurzer Moment; Shopify kennt keine Versionsprüfung.

## Rücknahme

Dasselbe Werkzeug mit VON und ZIEL vertauscht und NACH = früherer Vorgänger. War der Eintrag der erste, steht VOR = früherer Nachfolger; war er das einzige Kind, weder NACH noch VOR. Titel stehen in einfachen Anführungszeichen (Apostroph, `&`, `>`, `$` sind geschützt). Bei einem anderen Menü steht `MENUE=` mit drin. Steht der frühere Nachbartitel unter VON mehrfach, gibt das Werkzeug einen Hinweis aus (die Rücknahme bräche mit Exit 2 ab und muss dann von Hand gesetzt werden).

Für den Auftrag vom 11.11. (vom Werkzeug ausgegeben):

```
HANDLE=ersatzteile-zubehoer VON='Elektronik' ZIEL='Wohnen & Garten > Putzen & Haushalt' NACH='Mülleimer & Abfall' LIVE=1 node automation/menu_eintrag_verschieben.mjs
```

Grenze: Gibt Shopify dem verschobenen Eintrag eine neue id, bringt die Rücknahme die alte id nicht zurück (Übersetzungen hängen an der id). Den alten Stand zeigt die Sicherungsdatei.

## Tests (GEMESSEN 12.11.2026, 00:00 bis 00:04 UTC)

- `node automation/lib/menu_verschieben_test.mjs`: **189 Prüfungen, 0 Fehler** (Node 22.22 und Node 20.20; vorher 145). Mit `MENU_ECHT=<gelesenes Menü>` zusätzlich 5 Prüfungen am echten Hauptmenü (784 Einträge, nur Attrappe, inklusive `pruefeLeseform` ohne Befund): **194, 0 Fehler**, mit der Sicherung von 23:38 und mit der von 00:03 UTC.
- **Die Attrappe ist ehrlich zur Abfrage (neu, Fund W1):** sie liest die Auswahl aus dem Abfragetext (Argumente in Klammern fallen weg) und liefert beim Lesen nur die Felder und Ebenen, die verlangt sind, so wie Shopify. Unbekanntes Feld, `items` ohne Unterauswahl, Feld mit Unterauswahl, unausgeglichene Klammern oder eine Abfrage ohne `menus{nodes{…}}` werfen einen GraphQL-Fehler. Fehlt bei `menuUpdate` eine Pflichtvariable (`id`, `t`, `h`), wirft sie ebenfalls. Vergleiche gegen «das ganze Menü» laufen über eine EIGENE Bezugsabfrage (`VOLL_Q`), nicht über `MENU_Q`. Das Messgerät ist selbst getestet: 2-Ebenen-Abfrage ohne dritte Ebene, ohne tags keine Tags, Lesepfad `q()` liefert nur Verlangtes, alle Fehlerfälle.
- Sonst wie bisher: `NOT_FOUND` für unbekannte ids, `INVALID` bei fehlender Adresse/resourceId oder Tiefe über 3, gespeicherte COLLECTION-Adressen mit `/en/`. Varianten: neue id (Eintrag und Kind), fehlender Eintrag, vertauschte Reihenfolge, geänderter Titel/Typ/Adresse/resourceId/Tags/id eines anderen Eintrags, Eintrag doppelt oder an falscher Stelle, Menü zwischen den Lesungen verändert (7 Arten), `userErrors`, Netzfehler beim Schreiben und beim Nachlesen, fremdes Menü mit ähnlichem Handle.
- Neu für Regel 10 (P10): `MENU_Q` liefert mit der Attrappe genau die Bezugsform; `pruefeLeseform` findet jeden der 6 Pflichtschlüssel auf jeder der 3 Ebenen einzeln (18 Fälle), fehlende `items` auf Ebene 1 und 2, leere oder null-id, tags keine Liste, Menü ohne id/title/handle/items, Eintrag kein Objekt; die volle Form ergibt keinen Befund. Im Lauf: Antwort mit Lücke (Ebene 3 ohne tags, nur 2 Ebenen, alle ohne id, ein Eintrag ohne url) gibt Exit 1, nur das Menü gelesen, keine Sicherung, kein `menuUpdate`; Gegenprobe ungestört Exit 0. Wirkungsprobe: LIVE-Lauf mit einem Eintrag auf Ebene 2 (Tags und Kind auf Ebene 3), danach im Shop alle Einträge, alle ids und alle Tags erhalten.
- Gegenproben in beide Richtungen, u. a. Rundläufe hin und zurück (mit NACH, mit VOR, einziges Kind, Eintrag mit Kind und Tags, Sonderzeichen im Titel, anderes Menü), jeweils Menü danach exakt wie vorher.
- Zwei kleine Härtungen am Test, damit ein Mutant gemeldet statt mit Absturz beendet wird: `ist()` zeigt auch `undefined` an (vorher `a.slice` auf undefined), zwei neue Prüfungen greifen mit `?.` zu.
- `node automation/lib/menu_verschieben_mutationsprobe.mjs`: Ausgangslage grün, **70 Mutanten, 70 erkannt, 0 überlebt**, 0 unpassende Muster (Node 22.22 und 20.20; vorher 53). Je Pflicht: P1 7, P2 9, P3 3, P4 7, P5 6, P6 3, P7 7, P8 6, P9 5, **P10 17**. Laufzeit rund 10 Sekunden. Ein Mutant kann jetzt mit `mehr: [...]` mehrere Ersetzungen zugleich tragen. Die P10-Mutanten: die drei Ein-Wort-Fehler aus W1 (`MENU_Q` 2 Ebenen, `FELDER` ohne id, `FELDER` ohne tags), dieselben drei jeweils ZUSAMMEN mit abgeschaltetem Schutz im Lauf (beweist, dass die ehrliche Attrappe sie auch allein findet), Schutz aus, falscher Exit-Code, Pflichtliste ohne tags bzw. ohne id, fehlende items nicht gemeldet, items nur auf Ebene 1 verlangt, keine Rekursion, leere id hingenommen, tags als Nicht-Liste hingenommen, Menü ohne title/handle hingenommen, Attrappe liefert beim Lesen wieder immer alles.

## Gegenprüfung vom 11.11. (angriff-logik/, angriff-live/) und Runde 2

**W1 (wichtig) BEHOBEN.** Befund: die alte Attrappe lieferte beim Lesen immer alle Felder und 3 Ebenen. Darum überlebten drei Ein-Wort-Fehler alle 145 Prüfungen, die im Shop still Daten gelöscht und trotzdem «OK» mit Exit 0 gemeldet hätten.

Nachgestellt vor der Behebung (GEMESSEN 11.11. ca. 23:55 UTC, Skripte der Gegenprüfer, Ausgaben in `nachstellung/a03_vorher.txt`, `a04_vorher.txt`):
- `a03_mutanten.mjs`: «MENU_Q liest nur 2 Ebenen», «FELDER ohne tags», «FELDER ohne id» ÜBERLEBEN den Test (145 von 145 grün).
- `a04_ehrliche_attrappe.mjs` (unabhängige Attrappe, echtes Menü): M1b (2 Ebenen, `kinderschuhe` von «Schuhe» nach «Damen») Exit 0 «OK», danach 264 statt 784 Einträge; M3 (ohne id) Exit 0 «OK», 0 von 784 ids übrig; M2 (ohne tags, Menü mit 3 Tags) Exit 0 «OK», 0 Tags übrig. Gegenprobe unveränderter Code: 784/784 ids, Tags 3 → 3.

Behebung: (1) Attrappe baut die Antwort aus der Abfrage (siehe Tests). (2) Schutz im Lauf `pruefeLeseform` (Regel 10, Exit 1). (3) Mutanten in der Mutationsprobe (P10).

Nachgestellt nach der Behebung (GEMESSEN, `nachstellung/a03_nachher.txt`, `a04_nachher.txt`, `kombi_detail.txt`):
- `a03_mutanten.mjs`: alle drei W1-Mutanten jetzt **erkannt**.
- `a04_ehrliche_attrappe.mjs`: M1, M1b, M2, M3 jetzt **Exit 1**, im Shop danach 784 Einträge, 784/784 ids, Tags 3 → 3 (nichts geschrieben). Gegenproben G0, G0b, G0c weiter Exit 0.
- Dieselben drei Fehler bei abgeschaltetem Schutz: der Test wird trotzdem rot (6, 28 bzw. 25 rote Prüfungen, darunter immer die Wirkungsprobe «alle Einträge, ids und Tags erhalten»).

**Nicht Teil dieser Runde** (vom Auftrag nicht als bestätigt übergeben, unverändert offen, Einzelheiten in `ANGRIFF-logik.md`): K1 Menü-Titel nach dem Schreiben nicht verglichen; K2 HTTP-Adressen nach dem Schreiben nur normalisiert verglichen; K3 Rücknahme bricht bei gleich betiteltem Eintrag unter VON ab, ohne Warnung im Hin-Lauf; K4 zwei Pflichten ohne Mutant (`pfad` im Nachlesevergleich, Warnung bei mehrdeutigem Nachfolger); K5 `menuUpdate` wird bei Fehlern bis 6-mal gesendet; K6 Titel mit « > » nicht adressierbar; K7 Test räumt seinen Temp-Ordner nur bei normalem Ende auf. Keiner davon betrifft den Lauf für «Ersatzteile & Zubehör» (laut Gegenprüfer F10 und eigener Probe).

## Probe gegen den echten Shop (nur Lesen, ohne LIVE, 12.11.2026 00:03:35 UTC, mit Regel 10)

```
Trockenlauf: /collections/ersatzteile-zubehoer von «Wohnen & Garten > Putzen & Haushalt» nach «Elektronik» hinter «Elektronik-Kleinteile», Menü main-menu
Menü gelesen: 784 Einträge, 21 oben. Collection: «Ersatzteile & Zubehör» gid://shopify/Collection/689778065793
Eintrag: «Ersatzteile & Zubehör» Typ HTTP url /collections/ersatzteile-zubehoer, id gid://shopify/MenuItem/1486632485255, 0 Kinder, Stelle 5 unter VON
VON «Wohnen & Garten > Putzen & Haushalt» danach (4): Staubsauger & Zubehör | Desinfektions- & Reinigungsgeräte | Wäsche, Bügeln & Fusselentferner | Mülleimer & Abfall
ZIEL «Elektronik» danach (16): Elektronik & Technik | Handy & Laden | Kopfhörer & Audio | Smartwatches & Wearables | Kamera, Foto & Drohnen | TV, Beamer & Streaming | Gaming & VR | PC & Computer | Büro & Drucker | Sicherheit & Überwachung | Strom, Batterien & Solar | Smart Home & smarte Gadgets | 3D-Drucker & Zubehör | Kabel & Adapter | Elektronik-Kleinteile | [Ersatzteile & Zubehör]
Ebenen: 2 von höchstens 3. Einträge gesamt: vorher 784, nachher 784.
Rücknahme: HANDLE=ersatzteile-zubehoer VON='Elektronik' ZIEL='Wohnen & Garten > Putzen & Haushalt' NACH='Mülleimer & Abfall' LIVE=1 node automation/menu_eintrag_verschieben.mjs
Sicherung: …/menuverschieben1111/sicherung-probe/main-menu-vor-verschieben-ersatzteile-zubehoer-2026-11-12T00-03-35-381Z.json
Trockenlauf: nichts geschrieben.
EXIT 0
```

Die neue Sicherung ist mit der von 23:38:24 UTC byte-gleich (GEMESSEN: `JSON` gleich, Ebenen 21/243/520) und hat die volle Leseform (`pruefeLeseform`: 0 Befunde). Die Collection steht nur an dieser einen Stelle im Menü (kein Hinweis auf weitere Fundstellen).

Hilfsbibliotheken unverändert: `menue_plan.mjs`, `shopify_gql.mjs`, `shopify_host.mjs`, `shopify_secret.mjs` byte-gleich mit `origin/main` d4a4aed7f6 (GEMESSEN 12.11. nach `git fetch`). Die vier eigenen Dateien kollidieren weiter mit keinem Pfad auf `main`.

## Offen / ungemessen

- Ob Shopify beim Verschieben die id des Eintrags behält: UNBEKANNT. Das Werkzeug meldet es nach dem LIVE-Lauf.
- Der LIVE-Lauf selbst ist nicht gefahren (Auftrag dieser Runde: nur Lesen).
- K1 bis K7 der Gegenprüfung (siehe oben) sind nicht behoben.
- Die Mutationsprobe hinterlässt Temp-Ordner `/tmp/menuverschieben-test-*`, wenn ein Mutant den Test mit einer Ausnahme abbricht (K7). Meine Läufe erzeugten 87 davon, alle wieder entfernt; 34 ältere aus früheren Läufen liegen noch in `/tmp` (nicht von mir angelegt, nicht angefasst).
- Die Dateien liegen nur im Scratch; Übernahme ins Repo (Zweig, PR) und Einhängen des Tests in die CI (`luxestyle-automation-tests.yml`: `paths` UND `sparse-checkout`) stehen aus.
- Die Regel der Collection bleibt unverändert (68 Uhrenarmbänder, 30 Kabel, 5 Akkus, 1 Filter, 2 Rest laut Auftrag); unter «Elektronik» heisst der Eintrag weiter «Ersatzteile & Zubehör».
