# Filter «Grösse» auf Kleidern: Zahlengrössen + Grösse im Farbwert (06.10.2026, Betreiber «webshop mit kategorie und filter verbessert?» → «fix alles»)

GEMESSEN (live, WebFetch /collections/sub-kleider, 2'830 Kleider): Filter Verfügbarkeit · Preis · Produkttyp · **Farbe ✅** (Beige,
Blau, Braun … — Betreiber hat Search & Discovery umgestellt) · **Grösse ✅** (aber «2, 4, 6 … 52, 54» vor XS–XXXL) · **Kategorie ❌**.
Ursache der Zahlenwerte: 4 von 2'728 Kleidern (CJ) mit reinen Zahlengrössen. Über alle Mode (10'892): 106 Produkte mit reinen
Zahlengrössen — Jeans-Bundweite (28–40), Hemd-Kragenweite (38–45), EU-Anzug (50–56), US-Kleid (2–16). **Nicht automatisch
umbeschriftet**: dieselbe Zahl heisst je nach Ware etwas anderes, eine falsche Beschriftung = falsche Grösse bestellt.

GETAN:
- 4 Kleider nach Beschreibung belegt («Grössen 6, 8, 10 und 12 … 2 bis 26W, asiatische Grössen» = US; «für grosse Grössen 52–58» = EU)
  → «US10 …», «EU52 …» (Hausregel `groessenwert_normieren.py`: «US10», nie «US 10»).
- Neue Klasse: Plus-Grösse im FARBWERT («Grün-16 W», «154Chiffon-18W», «Komplett Weiss-US0»). `groesse_im_farbwert.py` erkennt
  jetzt `-\d\dW` und `-US\d`, Grössen-Option mit «US…»-Werten; schreibt «US16W». **3 Produkte, 69 Varianten** umgehängt, 0 Kollision
  (Spitzen-Abendkleid: Farbe 24 Werte → 3). Kanarienvögel: «Weiss-10 W» = 10 WATT (Ladegerät, Lockenstab) → übersprungen, weil
  keine Grössen-Option (plan() verlangt sie). `groessenwert_normieren.py`: «US 16W» → «US16W» mitgenommen.
- Beide Werkzeuge laufen täglich im Aufseher (auch für Neuimporte).

OFFEN (nur Betreiber, keine API): Search & Discovery → Filter hinzufügen → Quelle «Kategorie / Product category» → «Kategorie».
