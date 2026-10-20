"""Gegenprobe für die Ampelzeile VERKAUF-GEWINN (20.10.2026): «offen» ist der Rest nach dem Lauf, nie die Planlänge.
Fälle in BEIDE Richtungen (ein Test, der nur «still» kann, ist keiner). Aufruf: python3 automation/test_verkauf_gewinn_ampel.py"""
import datetime, importlib, json, os, shutil, sys, tempfile

REAL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REAL, "automation"))
b = importlib.import_module("betreiber_ampel")


def mit(stand):
    d = tempfile.mkdtemp(prefix="vg_test_")
    os.makedirs(d + "/dropship")
    if stand is not None:
        s = {"stand": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="minutes")}
        s.update(stand)
        json.dump(s, open(d + "/dropship/_verkauf_gewinn_stand.json", "w"))
    b.REPO = d
    try:
        return b.verkauf_gewinn()
    finally:
        b.REPO = REAL; shutil.rmtree(d, ignore_errors=True)


faelle = [
    ("Plan 1, geschrieben 1, kein EK fehlt → schweigt (der Fehlalarm vom 20.10.)", dict(zu_heben=1, geaendert=1, ohne_ek_anzahl=0), None),
    ("Plan 2, geschrieben 1 → MELDET «1 offen»",                                   dict(zu_heben=2, geaendert=1, ohne_ek_anzahl=0), "1 offen"),
    ("Trockenlauf (dry), Plan 1 → MELDET «1 offen»",                               dict(zu_heben=1, geaendert=0, dry=True, ohne_ek_anzahl=0), "1 offen"),
    ("Wache schreibt `offen` selbst (Schreibfehler) → MELDET «1 offen»",           dict(zu_heben=1, geaendert=0, offen=1, ohne_ek_anzahl=0), "1 offen"),
    ("alles auf Ziel, aber 1 Variante ohne EK → MELDET (Gewinn unbekannt)",        dict(zu_heben=0, geaendert=0, ohne_ek_anzahl=1), "ohne Einkaufspreis"),
    ("kein Stand → «unklar», nie «0»",                                             None, "unklar"),
]
ok = True
for name, stand, erwartet in faelle:
    r = mit(stand)
    gut = (r is None) if erwartet is None else (r is not None and erwartet in r)
    ok &= gut
    print(f"  {'ok  ' if gut else 'FEHL'} {name}" + ("" if gut else f"\n        → {r}"))
print("ALLE GRUEN" if ok else "FEHLSCHLAG")
sys.exit(0 if ok else 1)
