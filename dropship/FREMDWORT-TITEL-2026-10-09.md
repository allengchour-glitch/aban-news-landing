# Englische Fremdwörter in Produkttiteln → deutsch (09.10.2026, Betreiber «verbesser weiter»)

## Warum

Aus der Google-Analyse (`GOOGLE-VERKEHR-WARUM-2026-10-09.md`): 71 von 91 Google-Besuchen landen direkt auf einer
Produktseite. Wer in der Schweiz «Rindsleder Tasche», «Baby Strampler» oder «Kapuzenpullover Damen» sucht, findet
«Cowhide-Tasche», «Baby-Romper» und «Hooded Pullover Sweater» schlechter. Der Titel ist das stärkste Signal in den
Gratis-Einträgen.

## Gemessen (52'082 aktive Titel, Export 12:26 UTC)

- **Eingebürgert, bleiben:** Sneaker 640, Hoodie 387, Cardigan 294, Boots 261, Jumpsuit 255, Loafer, Crossbody, Leggings,
  Bikini, Blazer usw. So suchen Schweizer Kundinnen tatsächlich.
- **Eindeutig fremd:**

| Fremdwort | Titel |
|---|---|
| Cowhide | 15 |
| Silicone | 10 |
| Stainless Steel | 10 |
| Hooded | 9 |
| «Kids» im Satz | 8 |
| Pendant | 7 |
| Baby-Romper | 6 |
| Vest | 6 |
| Portable | 6 |
| Wallet | 4 |
| Pajama | 3 |
| Backpack | 3 |

  Dazu kommen Einzelfälle: Lickmatte, Rompel, Genuine Leather, Waterproof, Adjustable, Glossy Draping, Sandal, Scarf,
  Necklace. Zwei Neuimporte von heute waren Kauderwelsch: «Wege-Sandalen» und «Herren-Halbbereiz-Hooded Sweatshirt».

## Getan

**Regel** in `automation/data/haendlerwort_regel.json`, Abschnitt `fremdwort_titel`, 25 Muster der Form
[Muster, Ersatz, Kontext]:
- Cowhide → Rindsleder, Silicone → Silikon, Stainless Steel → Edelstahl, Genuine Leather → Echtleder.
- Hooded … → Kapuzen-…, «für Kids» → «für Kinder», Pajama → Pyjama, Lickmatte → Leckmatte, Rompel → Strampler.
- **Romper → Strampler nur mit Kontext** Baby, Neugeboren, Säugling oder Kleinkind. «Casual Romper-Set» und
  «Romper-Pyjama · Damen» bleiben.

**57 Handtitel**, jeder nach Lesen der Beschreibung:
- Fälle mit Geschlechtswechsel: «Edles Silber-Pendant» → «Edler Silber-Anhänger», «Grosses Outdoor-Backpack» →
  «Grosser Outdoor-Rucksack».
- Mehrdeutiges: «Liebes-Pendant Puppe» ist laut Beschreibung eine Bastelpuppe → «Valentins-Puppe zum Basteln».
  «Basketball “Cowhide Texture”» ist ein Muster → «Basketball mit Leder-Textur». «Silicone Chronograph» meint das
  Armband → «Chronograph-Quarzuhr mit Silikonarmband».
- Neue Titel, die eine Dublette wären, bekamen ein unterscheidendes Merkmal aus der Beschreibung (8 Fälle, z. B.
  «Laufschuhe für Kinder, Lila und Grau»).
- Neuimporte: «Wege-Sandalen» → «Sandalen mit gekreuzten Riemen» (kein Keil belegt). «Halbbereiz-Hooded Sweatshirt»
  hat laut Beschreibung einen Stehkragen und keine Kapuze → «Herren-Sweatshirt mit Stehkragen und Aufsatztasche».

**Tests:**
- Kanarien **91/91** (+28). Köder bleiben unverändert: «K15 Kids» (Modellname), «Lidschatten-Palette «Star Necklace»»,
  «Vier-Wege-Stretch», «Plateau-Sneaker».
- Der erste Lauf fand einen echten Fehler: «Cowhides Messenger» → «Rindsleders». Gelöst durch die Reihenfolge der
  Regeln.
- **py = js** über 52'082 Titel, 0 Abweichungen.

**SCHARF 93 / 0 Fehler** (52 Handtitel, 41 per Regel). SEO-Titel laufen jetzt durch dieselbe Regel, denn sie weichen oft
vom Produkttitel ab («… | LuxeStyle CH»). Zurückgelesen 10/10.

**Quelle und Wächter:**
- `haendlerwort.mjs` hängt in `fallenSicher`, alle drei CJ-Importer schreiben den Titel also schon deutsch.
- `haendlerwort.py` läuft täglich im Aufseher (VSW) über den ganzen Bestand.
- Bild-Alts zieht `alt_titel_abgleich.py` täglich nach. Adressen bleiben, denn ein englisches Wort im Handle schadet
  kaum, und jede Umleitung ist ein Risiko.

## Offen

- Nebenbefund: «Herren-…-Sweatshirt» (Neuimport 12:3x) hat Farbwerte wie «SW006L20261910». Das ist Klasse
  `VARIANTENWERTE-ENGLISCH`. Ich prüfe in der nächsten Runde, ob deren Wächter Codes als Farbe erkennt.
- Beschreibungen tragen dieselben englischen Wörter weiter («Die Cowhide-Wallet besteht …»). Für Google zählt vor allem
  der Titel. Text-Regeln wären die nächste Stufe.

## Lehre

**Nicht jedes englische Wort ist ein Fehler.** Sneaker, Hoodie und Jumpsuit sucht die Schweiz genau so, also bleiben
sie. Cowhide, Pendant und Wallet sucht niemand. Die Grenze zieht die Suchgewohnheit, nicht die Sprache. Wo sich mit dem
Wort das Geschlecht ändert («Grosses Backpack» → «Grosser Rucksack»), ist eine Regel falsch und ein gelesener Handtitel
richtig.
