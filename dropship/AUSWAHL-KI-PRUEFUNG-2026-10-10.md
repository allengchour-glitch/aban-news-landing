# KI-Übersetzung zu Unrecht abgelehnt (10.10.2026, Verbesserungsrunde 00:25)

## Gemessen

**Der häufigste MANUELL-Grund im Auswahl-Nachrüster** war «KI-Übersetzung fehlt/abgelehnt»: **83 von 177** gemerkten
Produkten (`dropship/_auswahl_manuell.tsv`). Diese Produkte bleiben 7 Tage gesperrt. Die Kundin sieht dort weiter eine
Seite ohne Auswahl, obwohl CJ mehrere Varianten führt.

Der KI-Ledger `dropship/_auswahl_uebersetzt.jsonl` (309 verschiedene Listen, jüngster Eintrag je Liste):
- 170 ok
- 53 vom **Zweitprüfer** abgelehnt (ein anderes Modell urteilt über den Sinn, das bleibt endgültig)
- **85 von der harten Regel** abgelehnt, davon **61 als «englisches Restwort»**

Die harte Regel lehnt jedes Wort ab, das wörtlich aus dem Original übernommen wurde, ausser es steht in `GLEICH_DE`.
Gesichtet: Die meisten Treffer waren **richtige** Übersetzungen.

| Art | Beispiele (Original → KI) | Zahl |
|---|---|---|
| Original war schon deutsch | «Schwarz» → «Schwarz», «Grün geblümt», «Pink-Blau», «Weiss erhöht 8 cm», «Dunkelkaffeebraun», «Gepunktet» | 16 |
| Im Deutschen gleich geschrieben (Duden) | Wok, Beagle, Avocado, Pedal, Jacquard, Futon, Sand, Hand, Extra, neutral, elegant, Greige, Oolong, Taro, Apricot | 24 |
| Feste Eigennamen | Morandi-Rosa, Tiangong-Raumstation | 2 |
| «Gruen» statt «Grün» | Farbprüfung sucht «grün» → «Farbe 'green' fehlt in 'Gruen'» | 4 |
| **Echte Reste (bleiben abgelehnt)** | Leather, Splicing, Graywall, Hidden Elevator, Crazy-Horse, Body (Kleid oder Gehäuse?), Roland-Lila (罗兰 = Violett), Pinyin-Reste Xuan/Fanghua/Huayu/Penglai/Sansha, Macron, Mason, Hey | ~20 |

**Dazu ein zweiter Fehler im Ablauf:** Eine hart abgelehnte Liste wurde beim nächsten Lauf **neu übersetzt**, nie aber gegen
die heutige Regel nachgeprüft. Groq und OpenAI waren am 09.10. zeitweise leer. Dann blieb das Produkt hängen, obwohl die
gespeicherte Übersetzung schon richtig war.

## Getan

**Regel** (`automation/auswahl_werte.py`):
- `schon_deutsch(t)` erkennt ein Wort als deutsch bei einem Umlaut, bei einem exakten Treffer im eigenen Farbwortschatz
  (`farblexikon` BASIS/DE_SOLO/EN2DE, `FARBE_EXTRA`, `FAMILIE`), bei Musterwörtern («gepunktet», «kariert» …) oder bei
  einem Kompositum, das ganz aus deutschen Teilen besteht und auf einen Farbstamm endet («dunkel+kaffee+braun»).
  **Nie nur «endet auf»:** «Carrot» endet auf «rot», «Parrot» auch. Kanarien prüfen beides.
- `GLEICH_DE` hat 24 gemessene Wörter mehr. **Bewusst nicht aufgenommen:** Body, Roland, Pinyin-Reste, Splicing, Crazy,
  Mason, Macron. Sie stehen mit Grund im Kommentar.
- `normalisiere_ki` schreibt «Gruen»/«Tuerkis» als «Grün»/«Türkis».
- **Ledger-Nachprüfung:** Eine früher hart abgelehnte Übersetzung wird zuerst gegen die heutige Regel geprüft. Besteht sie,
  geht sie **nur noch an den Zweitprüfer**, ohne neuen Übersetzer-Aufruf. Die Sinnprüfung bleibt also bei jedem Wert.

**Gegenprobe am Ledger:** 40 von 85 hart abgelehnten Listen bestehen jetzt die Regel. **0 von 170 guten kippen.**
Selbsttest 66/66, darunter 13 neue Kanarien: 7 richtige, die bestehen müssen, und 6 echte Reste, die abgelehnt bleiben
müssen (Leather, Splicing, Carrot, Roland-Lila, Stern Xuan, Body). Ausserdem eine Ledger-Probe: Der Übersetzer darf nicht
gerufen werden.

**Wächter:** Der Aufseher fährt den SCHARF-Nachrüster nur noch, wenn `auswahl_werte.py --selbsttest` grün ist. Ist er rot,
schreibt er «⛔ … kein SCHARF-Lauf» und die Keepalive-Zeile meldet es. Neue Importe laufen stündlich über dieselbe Regel.

**Bestand:** Die 83 gemerkten «KI»-Fälle wurden aus dem 7-Tage-Gedächtnis genommen. Vorher gesichert im Scratchpad, nicht
im Repo. Danach ein eigener Nachrüster-Lauf (`BERICHT=dropship/AUSWAHL-KI-LAUF-2026-10-10.md`), Ergebnis unten.

## Lauf über die 83 Fälle

(wird nach Laufende eingetragen)

## Offen

- **`farbe()` hält «Carrot»/«Parrot» für deutsche Farben.** `_ist_farbwort_de` prüft «endet auf». Das ist dieselbe Falle
  im deterministischen Übersetzer, bevor die KI überhaupt gefragt wird. Eigene Klasse.
- **Zweitprüfer-Ablehnungen sind endgültig**, auch wenn er irrt. Stichprobe nötig (53 Listen).
- **«Variantenbilder nicht unterscheidbar»** (37 gemerkte Fälle) ist der zweithäufigste MANUELL-Grund.

## Lehre

**Eine Regel «wörtlich übernommen = unübersetzt» braucht eine Gegenliste: Was im Original schon deutsch ist, kann gar nicht
übersetzt werden.** CJ liefert manche Werte bereits deutsch. Jede Prüfung, die Gleichheit mit dem Original als Fehler zählt,
muss vorher fragen, in welcher Sprache das Original steht.

**Und eine Ablehnung aus einer Regel, die sich ändern kann, muss beim nächsten Lauf gegen die neue Regel nachgeprüft
werden, bevor man neu fragt.** Sonst hängt das Ergebnis an der Verfügbarkeit eines Modells statt an der Richtigkeit.
