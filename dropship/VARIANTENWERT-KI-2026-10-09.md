# Englische Auswahlwerte, die keine Tabelle kennt: KI mit Zweitprüfer (09.10.2026, «weiter»)

## Gemessen

Grundlage ist der Durchgang von `variant_value_clean.py` (13:22–15:52 UTC, Bericht `VARIANTENWERTE-ENGLISCH.md`):
- 3'048 Optionen haben englische Werte. Übersetzt wurden nur 9.
- 15'783 Werte enthalten ein Wort, das die Tabellen nicht kennen. Die Tabelle wächst nur Wort für Wort und nur bei
  eindeutiger Lesart; den Rest holt sie nie ein.
- Auf besuchten Seiten standen Werte wie «Black, Hidden Elevator 8CM» (Plateau-Sneaker, 10 Sitzungen in 30 Tagen),
  «Beige Without Chest Pad» (Yoga-Jumpsuit), «Black Belt Black Shell» (Uhr), «Blue Coat» / «Blue Pants» (Jeansjacke: die
  zweite «Farbe» ist eine Hose).
- Kandidaten heute: **2'968 Produkte**, davon 26 mit Besuchen.

## Getan

Neues Werkzeug `automation/variantenwert_ki.py`. Es verbindet nur Vorhandenes:
- **Erkennung:** `variant_value_clean.englisch()` / `wert_de()`. Kandidat ist eine Option mit einem englischen Wert, den keine
  Tabelle übersetzt.
- **Übersetzung:** `auswahl_werte.uebersetze_ki()`. Übersetzer ist OpenAI gpt-5.5, sonst Groq gpt-oss-120b. Danach kommt die
  harte Prüfung `pruefe_ki()`: Anzahl, Zahlen, Masse und Bereiche bleiben gleich, jede Grundfarbe ist übersetzt, keine
  englischen Reste, höchstens 32 Zeichen, alle Werte verschieden. Dann urteilt ein **Zweitprüfer aus einer anderen
  Modellfamilie** (qwen). Alles wird in `_auswahl_uebersetzt.jsonl` festgehalten, keine Frage wird zweimal gestellt.

**Erster Trockenlauf: 18 von 20 abgelehnt.**
- Grund: `pruefe_ki` hielt jedes Wort, das schon im Original stand, für einen englischen Rest. Neben den englischen Werten
  standen aber deutsche wie «Schwarz» und «Weiss».
- Lösung: Deutsche Werte bleiben unverändert, Tabellen-Wörter übersetzt `wert_de()`, **nur der unbekannte englische Rest geht
  an die KI**.
- Ausserdem gelten «Generation», «Version» und «Edition» jetzt als gleich geschriebene deutsche Wörter (`GLEICH_DE`).

**Weitere Sperren:**
- Sagt die KI, dass das Feld eine andere Art von Auswahl ist (Grösse oder Länge statt Farbe), wird nichts geschrieben, nur
  gemeldet. Beispiel: Winterstiefel mit «38 · Samtgrau» im Farbfeld.
- Leere Ergebnisse wie «Farbe» oder «Mode · …» werden gemeldet, nicht geschrieben.
- Kollisionen werden gemeldet.
- Editor/POD und linkedMetafield werden nie angefasst. Es gilt nur ACTIVE.

**Reihenfolge:** zuerst besuchte Seiten (30 Tage), dann die neuesten Produkte.

**Live: 30 Optionen übersetzt, 0 Fehler, jede Option zurückgelesen.** Beispiele:
- «Black Without Chest Pad» → «Schwarz ohne Brustpolster»
- «Blue Coat» / «Blue Pants» → «Jacke · Blau» / «Hose · Blau»
- «Brown With Black Shell» → «Band Braun · Gehäuse Schwarz»
- «White-NB» → «Weiss · Neugeborene»
- «Sky + gray» → «Himmelblau + Grau»
- «Camouflage Color» → «Tarnfarbe»
- «Pink With Pockets» → «Rosa mit Taschen»

Berechtigt abgelehnt wurden zum Beispiel:
- eine verlorene Farbe («Brown With Black Shell» → «Gürtel · Braun»)
- verlorene Masse bei der Yoga-Hose
- «Gift» weggelassen (Zweitprüfer)
- «Generation» (vor der Ergänzung von `GLEICH_DE`)

**Wächter:** `fixer_keepalive.sh` (VARIANTENWERT-KI), täglich höchstens 60 Produkte.
- Das Groq-Kontingent teilt sich der Bestell-Bildvergleich.
- Selbsttest beider Bausteine als Tor (61/61 und 49/49).
- Startet nach 3 KI-Ausfällen in Folge nicht weiter. Ein einzelner Ausfall überspringt nur das Produkt; vorher beendete er den
  ganzen Lauf.

## Offen

- **Restbestand:** Rund 2'900 Kandidaten, ohne Ablehnungen. Bei 60 pro Tag sind das rund 7 Wochen. Am 09.10. um 19:11 war das
  Zweitprüfer-Kontingent (qwen) leer.
- **Etwas wörtliche Übersetzungen** hat der Zweitprüfer durchgelassen: «Zuckerbraun», «Moskitospule» (Spiralform bei einem
  Fusskettchen). Das ist keine Fehlinformation, aber nicht schön. Nachschärfen geht über die Prompt-Regel «Farbtöne nicht
  wörtlich» in `auswahl_werte`.
