#!/usr/bin/env python3
"""google_kategorie_kanarien.py — Kanarienvögel für die Google-Produktkategorie (22.10.2026, Runde 04:25).

ANLASS (GEMESSEN 22.10.): «Magnetische Rennstrecke mit Auto – 68-Teile-Set» (Tags gadgets+kinder+spielzeug, Typ Spass-Elektronik) bekam beim
Import die Google-Kategorie «Baby & Toddler»: kein Titelmuster erkannte das Spielzeug, also griff der Tag-Rückfall `kinder`. 18 aktive Spielzeuge
standen so im Feed (15 korrigiert, 3 bewusst offen: Adventskalender, Bastelset mit Pflanzen, Ornament-Musikbox). Regel: der Tag `spielzeug` steht
VOR `kinder`; Baby-/Neugeborenen-/Kleinkind-Titel bleiben bei `kinder` (→ Baby & Toddler). Es gibt ZWEI Umsetzungen der Tabelle
(automation/google_kategorie.py = Sammelläufer, automation/google_kategorie.mjs = alle Importer) — dieser Test prüft BEIDE und ihre Übereinstimmung.

  python3 automation/google_kategorie_kanarien.py     Exit 0 = alle richtig, 1 = mindestens ein Fall falsch oder die Umsetzungen weichen ab
Aufruf: Aufseher (fixer_keepalive.sh) täglich neben den Kanarienvögeln der Titelregeln; ohne Shop-Zugriff, < 2 s.
"""
import json, os, shutil, subprocess, sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

SPIEL = ["cj-real", "dropship", "gadgets", "kinder", "neuheit", "spielzeug"]
# (Titel, Tags, Typ, erwartet)
FAELLE = [
    ("Magnetische Rennstrecke mit Auto – 68-Teile-Set", SPIEL, "Spass-Elektronik", "Toys & Games > Toys"),
    ("Alloy Auto Modell 1:32", SPIEL, "Spass-Elektronik", "Toys & Games > Toys"),
    ("Holz-Miniflugzeug", SPIEL, "Spass-Elektronik", "Toys & Games > Toys"),
    ("Ferngesteuertes Wand-Rennauto für Kinder", SPIEL + ["rc"], "Spass-Elektronik", "Toys & Games > Toys"),
    # Baby-/Kleinkind-Titel bleiben Baby & Toddler (Ausnahme der Spielzeug-Regel)
    ("Baby Meilenstein-Würfel Set", ["gadgets", "kat-kinder-baby", "kinder", "neuheit", "spielzeug"], "Spass-Elektronik", "Baby & Toddler"),
    ("Holz-Steckspiel für Kleinkinder", ["gadgets", "kinder", "spielzeug"], "Spass-Elektronik", "Baby & Toddler"),
    ("Baumwoll Body für Neugeborene", ["baby", "kids", "kinder", "neuheit"], "Baby & Kinder", "Baby & Toddler"),
    # Haustier sticht Spielzeug (Regel 3 der Tabelle) — die neue Zeile darf daran nichts ändern
    ("Hundespielzeug Ball", ["haustier", "spielzeug", "kinder"], "Spass-Elektronik", "Animals & Pet Supplies > Pet Supplies"),
]

MJS = r"""
import {googleKategorie} from %r;
const faelle = JSON.parse(process.argv[1]);
console.log(JSON.stringify(faelle.map(([t, tg, ty]) => googleKategorie(t, tg, ty))));
"""


def main():
    import google_kategorie as gk
    py = [gk.kategorie(t, tags, typ) for t, tags, typ, _ in FAELLE]
    node = shutil.which("node") or "/opt/node22/bin/node"
    js = None
    fehler_js = ""
    try:
        r = subprocess.run([node, "--input-type=module", "-e", MJS % ("file://" + os.path.join(HIER, "google_kategorie.mjs")),
                            json.dumps([[t, tags, typ] for t, tags, typ, _ in FAELLE])],
                           capture_output=True, text=True, timeout=60)
        js = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else None
        if js is None:
            fehler_js = (r.stderr or r.stdout or "keine Ausgabe")[-200:]
    except Exception as e:
        fehler_js = f"{e.__class__.__name__}: {e}"
    falsch = 0
    for i, (t, tags, typ, soll) in enumerate(FAELLE):
        ok_py = py[i] == soll
        ok_js = js is not None and js[i] == soll
        falsch += (not ok_py) + (not ok_js)
        print(f"  {'✅' if ok_py and ok_js else '❌'} {t[:52]:52s} py={py[i]!s:36.36s} mjs={(js[i] if js else 'FEHLT')!s:36.36s} (soll {soll})")
    if js is None:
        falsch += 1
        print(f"  ❌ google_kategorie.mjs nicht ausführbar: {fehler_js}")
    print(f"GOOGLE-KATEGORIE-KANARIEN: {2 * len(FAELLE) - falsch}/{2 * len(FAELLE)} richtig (py + mjs)")
    return 1 if falsch else 0


if __name__ == "__main__":
    sys.exit(main())
