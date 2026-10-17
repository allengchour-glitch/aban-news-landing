# Bewertungs-Import: zwei stille Fehler (17.10.2026 abends)

Auftrag: „pushe bewertungen". Ergebnis in einem Satz: **der Importer hat Bewertungen live in den
Shop gestellt und gleichzeitig „0 echte Reviews" gemeldet.** Beides gemessen, beides behoben.

## 1. HTTP 429 verbrannte Produkte, die nie geprüft wurden

**Messung.** Lauf `QUERY="tag:gadgets AND tag:cj-real" LIMIT=200`: **45 Fehler, davon 36
`CJ_HTTP: HTTP 429`**. `cjGet()` machte **einen** `fetch` ohne jede Wiederholung; die Pause von
1100 ms stand **nach** dem Aufruf. CJ erlaubt ~1 Abfrage je Sekunde.

**Warum das teuer ist.** Ein 429 ist keine Antwort, sondern die Bitte zu warten. Jedes so
abgehakte Produkt zählte als „Fehler", obwohl CJ nie gesagt hat, ob es Kommentare hat — und es
landete **nicht** im Leer-Ledger, war also auch nicht gemerkt.

**Fix.** `automation/lib/cj_fetch.mjs`: wachsende Pausen bei 429/5xx/Netzfehler.
Hält die Drosselung durch, kommt `CJ_THROTTLED` — ein eigener Grund, mit dem der Importer den
Lauf **beendet**, statt hundert ungeprüfte Produkte als Fehler durchzureichen.

**Gegenproben (19 Tests, `automation/lib/cj_fetch_test.mjs`)** — die wichtigeren als die
Wiederholung selbst:
- Erschöpfte Tagespunkte fliegen **sofort**, auch wenn sie als HTTP 429 kommen (sonst wartet der
  Lauf minutenlang auf etwas, das erst morgen zurückkommt).
- Ein echter API-Fehler (`code=1602002`) fliegt sofort, ohne Warteschleife.
- Eine **leere, aber erfolgreiche** Antwort bleibt leer und wird nie als Drosselung gedeutet.
- Gegenprobe am alten Code: 429 → sofortiger Abbruch, die zweite Antwort wurde nie geholt.

**Nachher, am echten Lauf** (`tag:elektronik`, 120 Produkte): **0 × HTTP 429.** Die restlichen
17 Fehler sind echte CJ-Codes (1602002/1602003 = Produkt bei CJ nicht auffindbar) und am Ende die
erschöpften Tagespunkte — alles korrekt benannt.

Dieselbe Fehlerklasse wie `automation/lib/shopify_gql.mjs` (8 Wächter) und
`automation/lib/url_status.mjs` (site-health hielt 429 für 404). **Die 19 anderen CJ-Skripte haben
denselben `cjGet`-Block noch ohne Wiederholung** — offene Fläche, hier bewusst nicht angefasst.

## 2. Judge.me bestätigt mit HTTP 201 **ohne** Review-ID

**Messung.** Der Lauf meldete `Import nicht bestätigt: walkie-talkie-…, HTTP 201; vor
Wiederholung abgleichen` und zählte das als Fehler. In Judge.me nachgelesen lagen die
Bewertungen **live im Shop**:

| Produkt | Bewertungen | Ø |
|---|---|---|
| `m8-puls-4k-retro-game-console-956928` | 4 | 5,00★ |
| `walkie-talkie-mit-frequenz-scanning-639000` | 3 | 5,00★ |

Der Importer verlangte eine ID im Antwort-Body; Judge.me liefert bei 201 keine. Folge: Zustand
`uncertain` → die Bewertung wird nie wieder angefasst, das Produkt bekommt keinen Ledger-Eintrag,
und der Abschlussbericht sagt **„0 echte Reviews auf 0 Produkte"**.

**Dritter Fall derselben Fehlerklasse im Projekt** (nach CJ-`apiKey`/`password` und dem
pid-SKU-Skip): **ein stiller Fehlschlag sieht aus wie „keine Daten"** — hier sogar ein stiller
**Erfolg**, der wie ein Fehler aussah.

**Fix.** `automation/lib/judgeme_antwort.mjs` trennt drei Ausgänge statt zwei: `ok` (ID genannt) ·
`abgleichen` (2xx ohne ID → im Shop nachlesen) · `uncertain` (nur 5xx). Dazu `jmAbgleich()` im
Importer: nach dem Senden eines Produkts die neuesten Bewertungen lesen und auf Produkt-ID +
Text prüfen. Gefunden → `sent`; nicht gefunden → `uncertain` wie bisher. Zwischen POST und
Abgleich bleibt der Zustand `sending`, ein Abbruch führt also weiter **nicht** zum Doppel-Import.

**Gegenprobe, die den Abgleich gerettet hat:** der Produktfilter der Judge.me-Liste wird **still
ignoriert** — `external_id=99999999` liefert dieselben 5 neuesten Bewertungen wie ohne Filter.
Hätte ich darauf gebaut, wäre jeder Abgleich zufällig richtig gewesen. Darum liest `jmAbgleich`
ohne Filter und prüft `product_external_id` selbst. Dieselbe Falle wie der Metafeld-Filter in der
Shopify-Produktsuche (04.10./17.10.).

25 Tests in `automation/lib/judgeme_antwort_test.mjs`, mit Gegenproben in beide Richtungen:
Ablehnungen (`success:false`, `errors:[…]`, 4xx) gehen nie als `abgleichen` durch, `errors: []`
ist keine Ablehnung, ID `0`/`""` zählt nicht als Bestätigung.

## 3. Wo CJ Kommentare hat — zwei Katalogregionen gemessen

- **`tag:gadgets` ist NICHT die nächste gute Fläche**, anders als die Notiz vom 17.10. erwartet
  hat. Die ältesten 150 Treffer sind **ausnahmslos BigBuy-Ware** (`bb-…`, Xiaomi/KSIX/Denver) —
  keine CJ-Quelle, also auch keine CJ-Kommentare, 0 Punkte verbraucht. Mit
  `tag:gadgets AND tag:cj-real` folgt die nächste Schicht: **RC-Spielzeug, Roboterhunde,
  Spielzeugschwerter — 0 Kommentare** auf allen geprüften.
- **`tag:elektronik AND tag:cj-real`** (neueste zuerst): 120 geprüft, Treffer bei
  Walkie-Talkie und Retro-Konsole, viele Mikrofon-/Notenständer-Artikel sind bei CJ gar nicht
  mehr auffindbar (1602002).
- Das Muster vom 17.10. hält damit: **CJ-Käufer kommentieren Elektronik und Gaming-Zubehör.**
  Spielzeug gehört nicht dazu, obwohl es unter „gadgets" liegt.
- **Immer `AND tag:cj-real` an die Abfrage hängen** — sonst läuft der Scan durch BigBuy-Ware.

## 4. Punkte

Die Tagespunkte waren beim Start schon fast weg (Lauf vom Vormittag: 56 730 von 68 875). Die
Meldung „Tagespunkte erschöpft" kam zweimal, dazwischen gingen einzelne Abfragen wieder durch —
die Grenze ist also kein harter Riegel, sondern ein Eimer, der sich langsam füllt.
**Nächste Sitzung:** `QUERY='tag:elektronik AND tag:cj-real'`, `SORT=UPDATED_AT REVERSE=1`,
`LIMIT` 150–250. Danach `tag:gadgets AND tag:cj-real` nur noch in der neuesten Region.
