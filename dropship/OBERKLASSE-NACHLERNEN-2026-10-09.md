# Neuimporte bleiben grob, weil die KI-Urteile nie zurückflossen (09.10.2026, Verbesserungsrunde 08:25 UTC)

## Gemessen

Export 05:01 UTC, Neuimporte der letzten 14 Tage:

- **459 aktive Neuimporte** stehen bei Google noch auf einer Oberklasse (z. B. «Pet Supplies», «Exercise & Fitness»).
  **426 davon** haben keine gelernte Regel.
- **Die KI-Stufe ruht.** `google_fein_ki.py` braucht ein Kontingent: OpenAI ist seit 09.10. 05:43 UTC leer, Groq ist
  für heute aufgebraucht. Ohne KI bleibt die Neuware grob.
- **Die KI-Antworten lagen schon vor, wurden aber nie gelernt.** Der Ledger `dropship/_google_fein_ki.tsv` enthält
  807× «ok» (beide Modelle wählten denselben feineren Pfad) und 1'219× «keiner» (beide: nichts passt besser). Der
  Regel-Lerner `oberklasse_lernen.py` las aber nur die Einzelurteile vom 07./08.10. Folge: Die KI beurteilt jeden Tag
  dieselben Produkttypen neu, zum Beispiel «Hundeschüssel».
- **Die Sperrliste im Lerner traf harmlose Titel.** Sie verglich ohne Wortgrenzen, darum sperrte sie rund 300 Titel:
  «Uni**sex**», «**Waffe**leisen», «Tür**klinge**l», «Pullover**kleid**» (verkleid) und jedes Wort auf «…messer»
  (Durchmesser, Feuchtigkeitsmesser).
- **Das Kopfwort war falsch erkannt.** «Anti-Rutsch-Hundeschüssel» lieferte «Anti» als Kopfwort statt «Hundeschüssel».

## Getan

1. **`automation/oberklasse_nachlernen.py` (neu):** Es liest den KI-Ledger und nimmt je Produkt das jüngste Urteil.
   - «ok» wird zum Lernbeispiel `{titel, alt, neu}`.
   - «keiner» wird zum Beispiel `{titel, alt, neu: ""}`. Das Veto «bleibt» zählt also mit.
   - «uneinig» und Fehler werden nie übernommen. Doppelte (Titel, Oberklasse) auch nicht.
   - Ziel ist eine eigene Datei, `automation/data/oberklasse_training_ki.jsonl`. **Neu: 1'032 Beispiele.** Ein zweiter
     Lauf findet 0 neue, das Werkzeug ist also idempotent.
2. **`oberklasse_lernen.py` liest jetzt beide Lerndateien.** Dazu kommen zwei Korrekturen:
   - Sperrliste mit Wortgrenzen. `zigar` sperrt den Zigarettenanzünder nicht mehr, `klinge` die Klingel nicht, `waffe`
     die Waffel nicht. «…messer» ist nur noch bei echten Messerarten gesperrt (Küchen-, Taschen-, Outdoor- usw.).
     **21 Kanarien** laufen bei jedem Start, und bei Rot schreibt das Werkzeug nichts.
   - Ketten wie «Anti-…» werden vor der Kopfwort-Suche entfernt.
3. **Gegenprobe 80/20:** Präzision **97,5 %** bei 229 Regeln (vorher 97,4 %). Die Sperre vor dem Schreiben bleibt bei
   95 %.
4. **Aufseher:** `oberklasse_nachlernen.py` läuft täglich vor `oberklasse_lernen.py` (fixer_keepalive.sh, Block
   OBERKLASSE-NEUIMPORT). Was die KI heute einig entscheidet, lernt der Regel-Lerner morgen.
5. **Geschrieben:** siehe unten. Plan 22: 14 Hundenäpfe, 2 Stickbilder, je 1× Bauchroller, Springseil, Messlöffel-Set,
   Lunchbox, Sandwich-Maschine, Tischdecke.

## Ergebnis Schreiblauf

Der erste Schreibversuch um 08:50 UTC scheiterte. Drei Wächter liefen nach dem Container-Neustart gleichzeitig, und der
Lauf brach mit «Throttled (40x gedrosselt)» ab. Der zweite Lauf ging über `shopify_schranke.sh`, das die
Shopify-Zugriffe der Wächter in eine Warteschlange stellt.

**22 gesetzt, 0 Fehler** (08:54 UTC, Ledger `dropship/_oberklasse_lernen.tsv`). Per Admin-API zurückgelesen: 8 von 8
Metafeldern stimmen, z. B. «Hundeschüssel Anti-Rutsch» → Pet Bowls, Feeders & Waterers und «Bauchmuskelrad» → Ab Wheels &
Rollers.

Beim Zurücklesen gesehen: Einige Neuimport-Titel sind halb englisch, z. B. «Silicone-Tier-Schlankesschüssel mit
Lickmatte». Das ist eine eigene Klasse. Der KI-Titelwächter dafür ruht ebenfalls ohne Kontingent.

## Offen

- **Der Wortschatz ist die Grenze, nicht die Präzision.** 425 Neuimporte bleiben ohne Regel. Ihre Kopfwörter streuen
  stark (Wasserspender, Schal, Weihnachtsbaum, Projektor, Bauchtrainer, Widerstandsband, Ständer, Bett …).
  Nach Oberklasse: Exercise & Fitness 70, Tools 58, Pet Supplies 35, Clothing 23, Seasonal 19, Kitchen & Dining 19.
  Hier hilft nur die KI-Stufe, und die braucht Kontingent.
- **Betreiber:** OpenAI-Guthaben aufladen. Dann holt `google_fein_ki` den Rest, und ab dem nächsten Tag lernt der
  Regel-Lerner jedes einige Urteil dazu.

## Lehre

**Ein Prüfer, dessen Urteil nicht zurückfliesst, prüft jeden Tag dasselbe.** Die KI-Stufe war als Rest-Verwerter gebaut
und schrieb nur in den Shop. Weil ihre Urteile nie Lerndaten wurden, blieb die Regel-Stufe auf dem Stand vom 08.10. stehen.
Ohne Kontingent fiel damit alles zurück auf «grob». Geprüfte Urteile gehören in die Lerndaten. Die Gegenprobe bleibt dabei
die Sperre, damit auch ein gelerntes Fehlurteil nicht durchkommt.
