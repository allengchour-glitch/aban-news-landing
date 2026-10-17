# Wie viele Bewertungen hat CJ wirklich? — gemessen 2026-10-17

Der Conversion-Radar sagt: **1489 von 1500** geprüften aktiven `cj-real`-Produkten haben **keine
Sterne** (99 %). Das ist der grösste Conversion-Hebel des Shops. Die Frage vor dem Handeln ist
aber nicht „läuft der Importer?", sondern **„hat CJ für diese Produkte überhaupt Bewertungen?"** —
sonst hält man eine leere Quelle für einen vollen Eimer.

## Die Messung

Stichproben aus den aktiven `cj-real`-Produkten **ohne** Bewertungen, über den Katalog gestreut
(jede 4. Seite), je Produkt zwei CJ-Abfragen (pid auflösen, dann `productComments`):

| Stichprobe | pid aufgelöst | mit ≥1 Kommentar | mit ≥4★ | brauchbare Bewertungen |
|---|---|---|---|---|
| 60 Produkte (neuester Teil) | 60 / 60 | **1** (1,7 %) | 1 | 6 (Ø 6,0) |
| 150 Produkte (tiefer gestreut) | 139 / 150 | **14** (10,1 %) | 14 | 82 (Ø 5,9) |

**Zwei Dinge stehen damit fest, und ein drittes ausdrücklich nicht:**

1. **Der Resolver funktioniert.** 60/60 bzw. 139/150 pids lösen auf — der pid-SKU-Fix vom 04.10.
   trägt. Die 11 Fehlschläge sind einzelne Produkte, die CJ nicht mehr führt, kein Muster.
2. **Die Trefferquote hängt stark davon ab, wo im Katalog man schaut.** Im zuletzt geänderten Teil
   fast null, tiefer gestreut rund jedes zehnte Produkt. Beide Zahlen sind echt gemessen — der
   Unterschied ist der Befund, nicht ein Fehler.
3. **Keine Hochrechnung auf „tausende".** Mit 10 % und Ø 6 Bewertungen wären es bei 1489 Produkten
   grob **850 Bewertungen auf etwa 150 Produkten** — aber die Spanne zwischen den beiden Stichproben
   ist zu gross, um daraus eine Zahl zu machen. Die alte Gedächtnis-Notiz vom 07.09. („realistisch
   tausende") stützte sich auf **Repo-Ledger-pids**, also auf ältere Produkte, nicht auf den
   heutigen aktiven Katalog. **Sie ist damit zu optimistisch.**

## Was das praktisch heisst

- Der Importer ist der richtige Weg, aber er muss **viele Produkte durchsehen, um wenige Treffer zu
  finden**. Bei ~2,4 s und 20 CJ-Punkten je Produkt sind das pro 1000 Produkte etwa **40 Minuten und
  20 000 Punkte** (Tagesvorrat war heute ~69 000).
- Die Produkte mit Treffern sind die wertvollen: **Ø 6 echte Käufer-Kommentare ≥4★**, oft mit Fotos.
- **Es werden keine Bewertungen erfunden.** Wo CJ nichts hat, bleibt das Produkt ohne Sterne.
  Beim Rizinusöl — dem stärksten Suchthema des Shops — hat CJ für **alle vier** Produkte
  `total: 0`. Genau dort hilft der Importer also gar nicht.

## Übersetzung: der 402-Blocker ist weg, und hat jetzt einen Rückfall

Am 04.10. antwortete Gemini mit **HTTP 402** („prepayment credits are depleted"), seither stand im
Gedächtnis, importierte Bewertungen blieben in der Originalsprache. **Heute antwortet Gemini wieder**
— im scharfen Lauf verifiziert (`Übersetzung über gemini`, Bewertungen kamen auf Deutsch an).

Damit ein leeres Guthaben nicht wieder stillschweigend englische und chinesische Bewertungen in den
Schweizer Shop spült, gibt es jetzt `automation/lib/uebersetzen.mjs` (+ Test, 10 Fälle):
**Gemini zuerst, Groq als Rückfall** (`GROQ_API_KEY` ist gesetzt und übersetzt gut; die Modellnamen
dort sind nicht die bekannten Llama-Namen, sondern u. a. `openai/gpt-oss-120b`).

**Die wichtigsten Tests sind die Gegenproben:** fällt beides aus, kommen die **Originaltexte**
zurück und der Grund wird genannt — und eine Antwort mit **falscher Anzahl** Einträgen wird
verworfen, sonst landet der Text der einen Bewertung unter einer anderen.

## Zwei Handgriffe am Importer, die aus der Messung folgen

**1. Er hatte kein Gedächtnis für Leerläufe.** Ins Ledger kam nur, wo Bewertungen importiert wurden.
Produkte, bei denen CJ nichts hatte, standen nirgends — also prüfte **jeder Lauf dieselben 90–98 %
leeren Produkte erneut** und bezahlte sie mit je 20 Punkten. So kommt man nie tief in den Katalog.
Neu: `dropship/cj_reviews_leer.txt` (`pid<TAB>Datum<TAB>Grund`), gültig `LEER_TAGE` (Standard 60)
Tage — CJ bekommt mit der Zeit neue Kommentare, „leer" ist kein Urteil für immer. Der Lauf meldet,
wie viele er deswegen übersprungen hat.

**2. Er konnte den Katalog nur in einer Reihenfolge abgrasen.** Neu `SORT` + `REVERSE`, damit sich
eine andere Katalogregion ansehen lässt — die Trefferquote hängt messbar davon ab.

**Erster scharfer Lauf heute:** 3 echte ≥4★-Bewertungen auf
`mini-spruhventilator-mit-wasserkuhlung-usb-6-stufen-flusterleise` (CJ-pid 2605280514131608300),
auf Deutsch über Gemini. Keine erfundene Bewertung, kein Doppel-Import (Ledger-Eintrag gesetzt).

---

## Der scharfe Lauf: 169 echte Bewertungen auf 29 Produkten — und ein klares Muster

**1200 Produkte geprüft, 29 Treffer, 169 echte ≥4★-Bewertungen importiert, 0 Fehler.**
Live gegengeprüft (Shopify-Metafelder `reviews.rating`):

| Produkt | jetzt |
|---|---|
| `kabelloser-elite-gaming-controller-619800` | **4,62★ aus 8** |
| `mechanische-tastatur-617400` | **4,93★ aus 14** |
| `smartwatch-pulsefit-fitness-anrufe-611100` | **4,6★ aus 5** |

### Das Muster ist nicht „wo im Katalog", sondern „welche Warengruppe"

Von den 29 Treffern sind **15 Gaming-Zubehör** (Controller, Gamepads, Joysticks, Thumbsticks,
Ladestation, mechanische Tastatur), dazu Smartwatch, Fitness-Tracker, Bluetooth-Lautsprecher,
Thermodrucker, Drohnen-Modul. **Mode, Kostüme und Haushalt haben fast nie Kommentare** — in den
ersten 369 geprüften Produkten (Mode/Deko-Region) war die Trefferquote **0**.

Das erklärt die scheinbar widersprüchlichen Stichproben weiter oben: nicht die Katalog-*Region*
entscheidet, sondern **was für ein Produkt es ist**. CJ-Käufer kommentieren Elektronik, nicht
Sommerkleider.

**Folge für die Arbeit:** zuerst die Warengruppen abgrasen, in denen es Bewertungen gibt.
Gemessene Segmentgrössen (aktiv, `cj-real`): `tag:elektronik` **4494** · `tag:gadgets` **1482** ·
`tag:gaming` **369**. Ein Lauf über `tag:gaming` kostet ~7400 CJ-Punkte und trifft nach diesem
Befund weit häufiger als ein blinder Lauf über den ganzen Katalog.

### Das Leer-Ledger trägt sofort

`dropship/cj_reviews_leer.txt` hält jetzt **1157 Produkte** fest (1056 ohne Kommentare, 101 ohne
auflösbare CJ-pid). Diese 1157 kosten den nächsten Lauf **keinen einzigen Punkt** mehr — vorher
wären das 23 140 Punkte gewesen, ein Drittel des Tagesvorrats, für ein garantiert leeres Ergebnis.

**CJ-Punkte heute:** 52 280 von 68 875 verbraucht, 23 927 übrig.
