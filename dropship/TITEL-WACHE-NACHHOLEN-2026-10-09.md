# Titel-Wache nachgeholt, «uneinig» bestätigen lassen, «Martin Boots» → «Worker-Boots» (09.10.2026, «weiter»)

## Gemessen

**Neuimporte der letzten 24 Stunden:** 400 Produkte. Davon kamen mit schiefen Übersetzungen in den Shop:
- «Hollow-Toe-Block-heel-**Patentreifen**-Sandale»: patent leather heisst Lackleder, nicht Patentreifen.
- «Plattform-Sandalen mit **Rhabarber**-Bänder»
- «Stilettosandale mit **Einheitsbalken**»
- «Sneaker aus **Vollnette**»
- «Western Denim Farbwechsel **Martin** Schuhe»

**Warum:**
- Die Titel-Kauderwelsch-Wache hat heute zweimal pausiert, um 09:14 und um 15:20 UTC: «kein Prüfer-Kontingent».
- OpenAI war ohne Guthaben, Groq hatte sein Tageskontingent aufgebraucht. Ohne zwei Prüfmodelle ändert die Wache nichts.
- Dadurch blieben **452 Titel ungeprüft**.

**Rückstand:** Im Ledger stehen **354 Titel als «uneinig»**, seit dem 01.10.
- Häufigster Grund: Beide Modelle haben dasselbe Wort als falsch markiert, aber nur eines lieferte eine Korrektur. In der
  Ausgabe steht dann «G: —».
- Diese Titel blieben unverändert im Shop.

**«Martin Boots / Stiefel / Schuhe»:** in über 100 aktiven Titeln.
- Das ist die wörtliche Übersetzung von 马丁靴, dem chinesischen Namen für Stiefel im Dr.-Martens-Stil.
- Der Markenanklang ist ein Risiko: Google hat «Kinder Martin Boots» schon einmal als «Inappropriate title» gesperrt.

## Getan

**1. Titel-Wache nachgeholt.** OpenAI ist wieder aufgeladen.
- 452 Titel geprüft, **21 korrigiert** (beide Modelle einig), 57 gemeldet.
- Beispiele: «Sniffing-Matte» → «Schnüffelmatte», «Korrekturbelt» → «Korrekturgürtel», «Fascia-Ball» → «Faszienball»,
  «Vollnette» → «Netzstoff», «Hundebowlen» → «Hundenäpfe».

**2. Bestätigungsweg für uneinige Fälle** (`titel_kauderwelsch_wache.py`):
- Gilt, wenn beide Modelle dasselbe Wort markieren, aber nur eines eine Korrektur liefert.
- Dann **bestätigt das andere Modell** diese Korrektur. Es prüft dabei: Sind nur die falschen Wörter ersetzt? Ist nichts
  erfunden? Fehlt nichts Wichtiges (Material, Mass, Zielgruppe)?
- Es bleiben also zwei Modelle beteiligt: eines schlägt vor, das andere prüft.
- Zusätzlich gilt: Das falsche Wort darf nicht mehr im Titel stehen, und die Länge bleibt im Rahmen (60–160 %).

**3. Rückstand-Modus** `--uneinig`:
- Prüft die «uneinig»-Titel noch einmal, die live unverändert sind.
- Im Aufseher läuft er direkt nach jeder Titel-Wache (alle 6 h), höchstens 120 Titel je Lauf.
- Danach steht im Ledger «korrigiert» oder «uneinig-2». Ein Titel wird nicht ein drittes Mal geprüft.

**4. «Martin Boots» → «Worker-Boots»:**
- Als `fremdwort_titel` in `data/haendlerwort_regel.json` eingetragen, für Boots, Booties, Stiefel, Stiefeletten und Schuhe.
  «Worker Boots» ist der übliche Name des Stils, z. B. als Kategorie bei Zalando.
- Kanarien 96/96. «Martini-Gläser» bleibt unverändert.
- **py = js über 52'144 Titel: 0 Abweichungen.** Die Importer filtern also selbst (`haendlerwort.mjs` in `fallenSicher`).
- **Live 93 geschrieben, alle 93 bestätigt.** Ein Titel bleibt stehen, weil der neue Name eine Dublette wäre.

**5. Variantenwert-KI:** Felder, in denen jeder Wert die Form «Farbe-Alter» hat («Purple-0 to 3M»), lässt sie jetzt
`alter_im_farbwert.py`. Der teilt sie in Farbe und Grösse auf. Übersetzt die KI vorher, findet der Teiler sein Muster nie
mehr, und das Alter fehlt dauerhaft im Filter.

## Nachtrag 20:00–20:45 UTC — Rückstand 354 im Trockenlauf, von Hand gesichtet

**GEMESSEN:** `--uneinig` trocken über den ganzen Rückstand.
- 258 Titel waren live noch unverändert und aktiv.
- Davon bekamen **113 eine Korrektur**, bei der sich beide Modelle einig waren.

**Sichtung:** Rund 100 Korrekturen sind gut (z. B. «Patentreifen» → Lackriemen, «Wutanhölz» → Holz, «Eel» → Aal). Etwa
8 waren **wörtlich übersetzt und falsch für die Ware**:

| Titel | KI-Korrektur | Ware laut Beschreibung |
|---|---|---|
| «Mummy-Rucksack» | «Mumien-Rucksack» | Rucksack für werdende Mütter, Babybedarf |
| «Kaucher aus Keramik» | «Kocher» | Hunde-Trinknapf |
| «Bauchschuhe» | «Barfussschuhe» | High-Top-Sneaker |
| «Auto Abat Vent» | «Windabweiser» | Sonnenschutz-Aufkleber aus Mesh |

Dazu kamen grammatisch holprige Ersatzwörter: «Gerades Fräser», «Kleine … Laubsägeblatt».

**Getan:**
- **111 Titel geschrieben, 0 Fehler.** Davon 89 KI-Vorschläge unverändert, 22 als Handtitel aus der Beschreibung (z. B.
  «Grosser Wickelrucksack für unterwegs», «Keramik-Trinknapf für Hunde mit hohem Fuss», «Auto-Sonnenschutz aus Mesh zum
  Aufkleben · 2 Stück»).
- Ausgelassen:
  - «Handzangen-Set … Tschim-Zange»: unklar, braucht eine Bildsichtung. Ledger «uneinig-2».
  - «Bambus- und Leinen-Herrenschirt»: die Korrektur wäre eine Titel-Dublette. Vermutlich ein doppeltes Produkt, offen.
- Den scharfen KI-Lauf habe ich bewusst nicht gestartet. Er hätte die Modelle neu gefragt, und die gesichteten Vorschläge
  wären durch neue, ungesichtete ersetzt worden.

**An der Quelle:** Die Prüfer sehen jetzt die Ware. `titel_kauderwelsch_wache.ware()` gibt einen Auszug der Beschreibung
mit (bis 180 Zeichen, ohne Faktenblock):
- Beide Modelle bekommen ihn unter jedem Titel als «(Ware: …)».
- Der Bestätiger fragt zusätzlich: «Passt die Korrektur zur beschriebenen Ware?»
- Gegenprobe mit den drei Fehlgriffen: «Mummy-Rucksack» → «Grosser Wickelrucksack für unterwegs», «Kaucher» → «Trinknapf aus
  Keramik», «Bauchschuhe» → «Freizeitschuhe Herren». Alle drei sind jetzt richtig.
- Kanarien (ohne Beschreibung) in drei Läufen: 10/11, 11/11, 11/11. Das ist die bekannte Schwankung der Modelle, kein
  Regelbruch.

## Offen

- Den Rest (145 ohne Einigkeit, 96 nicht mehr aktiv oder inzwischen umbenannt) prüft der Aufseher ab jetzt mit Beschreibung,
  120 Titel je 6 Stunden.
- Eine Stichprobe der nächsten 20 scharfen Korrekturen gegen die Beschreibung lesen. Wenn sie sauber sind, bleibt es beim
  Automaten.
