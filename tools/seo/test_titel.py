#!/usr/bin/env python3
# =============================================================================
#  test_titel.py — Tests fuer tools/seo/titel.py
#  Aufruf: python3 tools/seo/test_titel.py
#
#  Jeder Fall unten ist ein Titel, der im echten Diff aufgefallen ist — nicht
#  erfunden. Am Ende steht eine GEGENPROBE: absichtlich kaputte Regeln muessen
#  die Tests zum Scheitern bringen, sonst messen die Tests nichts.
# =============================================================================

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import titel as t  # noqa: E402

fehler = []


def pruefe(name, ist, soll):
    if ist != soll:
        fehler.append(f"{name}\n    ist : {ist!r}\n    soll: {soll!r}")


# --- Marke hinten: steht in der Suche sowieso ausserhalb, darf also weichen ---
pruefe("Marke weg, Rest passt",
       t.kuerzen("Krankenkassen-Vergleich 2027: alle Kassen, offizielle Prämien · aban news")[0],
       "Krankenkassen-Vergleich 2027: alle Kassen, offizielle Prämien")

# --- Kopf + Jahr, wenn der ganze Titel auch ohne Marke zu lang bleibt ---
pruefe("Kopf mit Jahr und Marke",
       t.kuerzen("AI for acoustic construction & soundproofing — where it really "
                 "saves time (2026) | aban news")[0],
       "AI for acoustic construction & soundproofing (2026) | aban news")

# --- Kurzer Kopf: dann lieber am Wortende kuerzen als 27 Zeichen Titel ---
kurz, regel = t.kuerzen("Hochbeet kaufen Schweiz 2026 — Holz, Metall & Wicking im Vergleich | aban")
pruefe("kurzer Kopf -> Wortgrenze", kurz,
       "Hochbeet kaufen Schweiz 2026 — Holz, Metall & Wicking")
pruefe("Regel dabei", regel, "wortgrenze")

# --- Nie mitten im Wort schneiden ---
lang = ("L'IA pour les entreprises de dératisation et désinsectisation — là où "
        "elle fait vraiment gagner du temps (2026) | aban news")
neu = t.kuerzen(lang)[0]
pruefe("Wort nicht zerschnitten", neu.split(" ")[-1] in lang.split(" "), True)
pruefe("passt in 65", len(neu) <= 65, True)

# --- Haenger am Ende: Praeposition, Negation, attributives Adjektiv ---
pruefe("Praeposition faellt weg",
       t.kuerzen("Empfiehlt ChatGPT Elektriker? — KI-Sichtbarkeit für "
                 "Elektroinstallateur:innen · aban news")[0],
       "Empfiehlt ChatGPT Elektriker? — KI-Sichtbarkeit")
pruefe("Negation faellt weg",
       t.am_wortende("L'IA per i birrifici — i testi dello shop e gli eventi, "
                     "non la birra", 60),
       "L'IA per i birrifici — i testi dello shop e gli eventi")
pruefe("Adjektiv ohne Bezugswort faellt weg",
       t.am_wortende("Bett kaufen Schweiz 2026 — Bettrahmen, Lattenrost & "
                     "Schweizer Bettmasse", 60),
       "Bett kaufen Schweiz 2026 — Bettrahmen, Lattenrost")

# --- Bruchstueck der Marke darf nicht stehen bleiben ---
pruefe("Marken-Bruchstueck weg",
       t.kuerzen("Heckenschere kaufen Schweiz 2026 — Akku, Kabel & Benzin | "
                 "aban Kaufberater")[0],
       "Heckenschere kaufen Schweiz 2026 — Akku, Kabel & Benzin")
pruefe("vollstaendige Marke bleibt",
       t.ohne_marken_rest("AI for curtain shops (2026) | aban news"),
       "AI for curtain shops (2026) | aban news")

# --- Kurze Titel werden gar nicht angefasst: der Plan filtert vorher ---
#     (kuerzen() selbst wuerde auch bei 60 Zeichen die Marke abziehen)
pruefe("Grenze ist 65", t.MAX, 65)
pruefe("kurzer Titel kommt nicht in den Plan",
       len("KI für Cafés — wo sie wirklich Zeit spart (2026) | aban news") <= t.MAX,
       True)

# --- Ergebnis immer <= 65 Zeichen, egal wie der Titel aussieht ---
for probe in [
    "A" * 200,
    "Wort " * 40,
    "Ein Titel ohne alles",
    "Titel — mit — vielen — Gedankenstrichen — und — noch — mehr — Text (2026) | aban news",
    "(2026) | aban news",
    "x | aban",
]:
    pruefe(f"Grenze gehalten bei {probe[:28]!r}", len(t.kuerzen(probe)[0]) <= 65, True)

# --- Die Dubletten-Liste muss mit der Jahresklammer noch in 65 passen ---
import json  # noqa: E402

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "titel_handarbeit.json"), encoding="utf-8") as f:
    liste = json.load(f)
liste.pop("_doku", None)
for pfad, wert in liste.items():
    # titel.py haengt die Jahresklammer der ALTEN Fassung wieder an. Nur wo die
    # Seite eine trug, braucht der Eintrag die 7 Zeichen Reserve.
    seite = os.path.join(t.ROOT, pfad)
    reserve = 0
    if os.path.exists(seite):
        _, alter_titel = t.titel_von(t.lies(pfad))
        if alter_titel and t.JAHR.search(alter_titel):
            reserve = 7
    pruefe(f"Handarbeit-Eintrag {pfad} passt in 65 Zeichen",
           len(t.ohne_jahr(wert)) + reserve <= 65, True)
# Innerhalb einer Sprache muss jeder Eintrag einmalig sein
gesehen = {}
for pfad, wert in liste.items():
    schluessel = (pfad.split("/")[0], t.ohne_jahr(wert))
    pruefe(f"Dubletten-Eintrag {pfad} einmalig", schluessel in gesehen, False)
    gesehen[schluessel] = pfad

# --- Gegenprobe: ohne die Haenger-Liste und ohne die Marken-Saeuberung
#     muessen Tests scheitern. Sonst pruefen sie nichts. ---
echte_fehler = list(fehler)
originale = (t.HAENGER, t.MARKE_REST)
t.HAENGER = set()
kaputt = t.am_wortende("L'IA per i birrifici — i testi dello shop e gli eventi, "
                       "non la birra", 60)
t.HAENGER = originale[0]
gegenprobe_1 = kaputt.endswith("non")

import re  # noqa: E402

t.MARKE_REST = re.compile(r"(?!x)x")   # trifft nie
kaputt2 = t.kuerzen("Heckenschere kaufen Schweiz 2026 — Akku, Kabel & Benzin | "
                    "aban Kaufberater")[0]
t.MARKE_REST = originale[1]
gegenprobe_2 = kaputt2.endswith("| aban")

print(f"Gegenprobe: Haenger-Liste wirkt = {gegenprobe_1} · "
      f"Marken-Säuberung wirkt = {gegenprobe_2}")
if not (gegenprobe_1 and gegenprobe_2):
    echte_fehler.append("GEGENPROBE: eine absichtlich entfernte Regel fiel nicht auf — "
                        "die Tests messen an dieser Stelle nichts.")

if echte_fehler:
    print(f"\n{len(echte_fehler)} Test(s) gescheitert:\n")
    for f_ in echte_fehler:
        print(" ✗", f_)
    sys.exit(1)
print("alle Tests bestanden")
