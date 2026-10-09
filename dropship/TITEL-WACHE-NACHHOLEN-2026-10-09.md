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

## Offen

- Der Rückstand von 354 Titeln läuft ab jetzt im Aufseher, 120 Titel je 6 Stunden.
