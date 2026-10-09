# Uhren mit Produkttyp «Elektronik» fehlten in «Schmuck & Uhren» (09.10.2026, Verbesserungsrunde)

## Gemessen

**Neuimporte der letzten 4 Stunden** (12:25–16:25 UTC):
- 433 Produkte, davon 431 aktiv.
- 427 davon im Google-Kanal.
- 1 ohne Google-Kategorie, 1 mit nur einem Bild.

**Auffällig:** 79 der neuen Produkte haben den Produkttyp «Elektronik». Nur 11 davon sind bei Google wirklich Elektronik. Der
Rest sind 39 Uhren, 25 Uhrenarmbänder, Projektoren und Lautsprecher.

**Bestand** (Export von 15:53 UTC): 3'006 aktive Produkte haben den Typ «Elektronik». Davon stehen in Google-Kategorien unter
Schmuck (Jewelry):

| Kategorie | Produkte |
|---|---:|
| Watches | 875 |
| Watch Accessories | 186 |
| Bracelets | 26 |
| Rings und Body Jewelry | 2 |
| **Zusammen** | **1'089** |

**Folge im Shop:**
- Die Menü-Kollektion **«Schmuck & Uhren»** nimmt Produkte nach dem **Produkttyp** auf (Schmuck, Uhren, Ring, Halskette,
  Armband, Ohrringe). Keines dieser 1'089 Produkte erschien dort.
- 196 davon fehlen zusätzlich in «Uhren» und «sub-uhren», weil dort der Tag `uhren` bzw. `kategorie-uhr` zählt. Dazu gehören
  148 Uhren und 25 Uhrenarmbänder.

**Ursache:**
- Die CJ-Gruppe «elektronik» in `cj_category_fill.mjs` gibt **jedem** Import den Typ «Elektronik». CJ führt Smartwatches und
  Armbänder unter Elektronik.
- Der Importer leitet den Typ nur bei Sammeltypen (Trend-*) aus der Kategorie ab.
- Das ist dieselbe Klasse wie beim Büro-Sammelkorb und bei der Spielzeug-Trennung am 08.10.: Ein Gruppenstempel ist kein
  Urteil über die Ware.

## Getan

### Regel

Eine Datei: `automation/data/gruppenstempel_typ.json`. Sie wird gelesen von `automation/gruppenstempel_typ.py` (Bestand,
täglich) und `automation/gruppenstempel_typ.mjs` (Importer).

Die Regel greift nur bei Typ «Elektronik» **und** einer Kategorie unter Schmuck (Shopify aa-6 / Google Jewelry). Geprüft wird
der Reihe nach:

1. **Gerätewort** (Ladestation, Halterung, Ladegerät): Der Typ bleibt «Elektronik». Hier ist die Kategorie falsch, nicht der
   Typ, z. B. bei «3-in-1 Ladestation mit Uhr».
2. **Uhrwort** im Titel (uhr, watch, chronograph, zifferblatt; ohne Wortgrenze, damit auch Uhrband, Uhrwerk und Quarzuhr
   zählen): Typ wird «**Uhren**».
3. **Smart-, Fitness- oder Messwort** ohne Uhrwort (Fitness-Armband, Smart Ring, Pedometer, Antistatik-Armband): Typ bleibt
   «Elektronik».
4. **Kategorie im Uhren-Zweig** (Watch Bands und Accessories, Watches, Smart Watches), z. B. «Lederarmband für Fitbit Charge»:
   Typ wird «**Uhren**».
5. **Sonst:** Typ wird «**Schmuck**».

Dazu gilt:
- Fehlt einem neuen «Uhren»-Produkt der Uhren-Tag, kommt Tag `uhren` dazu.
- Tag `elektronik` bleibt. Smartwatches stehen weiter auch in «Elektronik & Gadgets».
- Für die Kollektionen gilt die **Sperre aus `produkttyp_vereinheitlichen.py`**, mit einer Verfeinerung: Eine ODER-Kollektion
  blockiert nicht, wenn das Produkt über einen ihrer Tags drin bleibt. «Elektronik & Gadgets» nimmt Typ Elektronik **oder**
  Tag `elektronik` auf. Ohne diese Verfeinerung hätte die Sperre alle 883 Produkte blockiert.

### Erster Trockenlauf: 60 «Schmuck»-Fälle gesichtet

Die Sichtung fand zwei Lücken:
- Uhrenarmbänder ohne Uhrwort im Titel, z. B. «Lederarmband für Fitbit Charge», «QuickFit Silikonarmband für Garmin Fenix».
  Dafür gibt es jetzt den Uhren-Zweig der Kategorie (Schritt 4).
- Fitnessgeräte, z. B. «Pulsmesser-Armband», «Pedometer», «Wecker-Armband», «Antistatik-Armband». Sie bekamen eigene Wörter in
  der Smart-Liste (Schritt 3).

Danach blieben 6 echte Schmuckstücke übrig, z. B. «Doppelketten-Armband mit Blütenmotiv».

### Importer

`googleKategorie()` liefert beim Import für Uhrenarmbänder und Quarzuhren oft nur «Electronics». Die feine Kategorie setzen erst
später die Wächter.
- Darum gilt im Importer zusätzlich: Uhrwort im Titel, kein Gerätewort und kein Nicht-Uhr-Wort (Wecker, Wanduhr, Stoppuhr,
  Digitaluhr) → «Uhren».
- Getestet mit dem echten `googleKategorie()`: Uhrenarmband, «Armband für Apple Watch» und Quarzuhr-Set werden «Uhren».
  Projektor, Wecker und Ladegerät bleiben «Elektronik».

### Tests

- **Kanarien:** 27/27 für die Regel, 9/9 für den Importer.
- **py = js** über 6'012 Fälle (3'006 Titel, je mit und ohne Uhren-Zweig): 0 Abweichungen.

### Live

- **Typ: 883 von 883** geschrieben und zurückgelesen (877 «Uhren», 6 «Schmuck»).
- **Tag `uhren`: 91 von 91.**
- Bleiben «Elektronik»: 197 Smart- und Fitnessgeräte sowie Ladestationen.
- 4 Smartwatches gesperrt. Sie haben keinen Tag `elektronik` und würden sonst aus «Elektronik & Gadgets» fallen.

**Kollektionen nachgemessen:**

| Kollektion | vorher | nachher |
|---|---:|---:|
| Schmuck & Uhren | 6'499 | **7'382** (+883) |
| Uhren | 2'772 | 2'856 |
| sub-uhren | 3'784 | 3'869 |
| Elektronik & Gadgets | 6'051 | 6'051 (unverändert, wie gewollt) |

### Wächter

`fixer_keepalive.sh` (GRUPPENSTEMPEL-TYP), täglich:
- startet nur, wenn der Selbsttest grün ist (Kanarien + py = js)
- schreibt über `shopify_schranke.sh`
- Ledger `dropship/_gruppenstempel_typ.tsv`

Der Importer korrigiert neue Produkte selbst.

## Offen

- **Fitness-Armbänder mit Google-Kategorie «Bracelets»** (z. B. «C33 Smart-Armband», «G69 Armband für Herzfrequenz»): Ihre
  Google-Kategorie ist falsch, richtig wäre Watches → Smart Watches. `uhren_fein.py` sieht sie nicht, weil es nur Produkte im
  Watches-Zweig liest. Das ist eine eigene Klasse.
- **Geräte mit Uhren-Kategorie** wie «3-in-1 Ladestation mit Uhr» und «Magnethalterung für Apple Watch»: Die Kategorie ist
  falsch. Ihr Typ bleibt «Elektronik».
- **Google-Blocker 752** (Plan-Tag 7, Ziel < 600):
  - 655 davon sind «Ziel []»-Meldungen (Image under review, Inappropriate image, Restricted adult content).
  - Bildtausch und der Versuch A/B laufen. Auswertung vom 11:43 UTC: Gruppe A noch 23 von 128 blockiert, Gruppe B noch 26
    von 128.
  - Hier nicht doppelt angefasst.

## Lehre

**Eine Kollektion, die nach Produkttyp filtert, verliert jedes Produkt, dem ein Gruppenstempel den Typ gibt. Das sieht man
nicht am Produkt, sondern erst in der Kollektion.**
- Bei Gruppenstempeln immer prüfen, welche Kollektionen am Typ hängen.
- Eine Kollektions-Sperre, die nur die TYPE-Regeln liest, blockiert zu viel. Hält eine ODER-Kollektion das Produkt über einen
  Tag fest, fällt es durch den Typwechsel nicht heraus.
