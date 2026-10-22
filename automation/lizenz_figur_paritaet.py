#!/usr/bin/env python3
"""lizenz_figur_paritaet.py — die Liste der Lizenzfiguren (nicht selbst bewerben) steht in VIER Kopien; hier wird sie gleichgehalten (22.10.2026).

ANLASS (unabhängige Prüfung der Sauber-Runde): `LIZENZ_FIGUR` steht in bild_reel_auswahl.py, tiktok_karussell.py, reel/montage_auswahl.py und metricool_pinterest_pin.mjs.
GEMESSEN 22.10.: drei Kopien hatten 47 Figuren, montage_auswahl.py (Reel-Motor) kannte «Eiskönigin/Frozen/Elsa/Olaf» nicht (Lizenzfiguren, die der Betreiber nicht beworben
haben will), die anderen drei kannten «blues clues», «bulbasaur», «hermine», «robin classic» nicht. Ein Fehler in EINER Kopie lässt die Ware über genau EINEN Poster doch laufen.

REGEL: Kanonisch ist die VEREINIGUNG aller Kopien, ohne das nackte «sonic» (trifft Schallzahnbürsten; die vier Kopien tragen «sonic (?:the hedgehog|classic|movie|shadow)»).
  python3 automation/lizenz_figur_paritaet.py                # prüfen: Abweichungen je Kopie (Exit 1 bei Abweichung)
  python3 automation/lizenz_figur_paritaet.py --angleichen   # fehlende Figuren in jede Kopie anhängen, nacktes «sonic» streichen (idempotent)
  python3 automation/lizenz_figur_paritaet.py --zeile        # Ampeltext oder leer
  python3 automation/lizenz_figur_paritaet.py --selbsttest
Zusätzliche Klauseln ausserhalb der Figurenliste (z. B. «\\bKostüm ES\\b» in montage_auswahl.py) bleiben unberührt.
"""
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
KOPIEN = ["bild_reel_auswahl.py", "tiktok_karussell.py", "reel/montage_auswahl.py", "metricool_pinterest_pin.mjs"]
NACKT_RAUS = {"sonic"}   # nacktes «sonic» ist zu breit; die spezifische Form bleibt
# Gruppe «\b(?:a|b|(?:c|d)|e)\b» mit EINER Ebene verschachtelter Klammern
GRUPPE = re.compile(r"(\\b\(\?:)((?:[^()]|\([^()]*\))*)(\)\\b)")


def gruppe_und_lage(text):
    """Rein: (m, start_der_alternativen, ende) der ersten Figurengruppe nach «LIZENZ_FIGUR» — oder None."""
    i = text.find("LIZENZ_FIGUR")
    if i < 0:
        return None
    m = GRUPPE.search(text, i)
    return m


def teile(alts):
    """Rein: oberste Ebene an «|» trennen (Klammern beachten). Python-Zeilenfortsetzungen im String ("…"⏎ r"…", wie in montage_auswahl.py) werden zusammengezogen."""
    alts = re.sub(r'"\s*\n\s*[rR]?"', "", alts)
    out, d, cur = [], 0, ""
    for ch in alts:
        if ch == "(":
            d += 1
        elif ch == ")":
            d -= 1
        if ch == "|" and d == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [t.strip() for t in out if t.strip()]


def alternativen(text):
    m = gruppe_und_lage(text)
    return teile(m.group(2)) if m else None


def kanonisch(listen):
    u = []
    for l in listen:
        for a in l or []:
            if a not in u and a not in NACKT_RAUS:
                u.append(a)
    return u


def abweichungen(texte):
    """Rein: {name: (fehlt, ueberzaehlig)} — leer, wenn alle Kopien gleich sind. Eine Kopie ohne Gruppe zählt als «nicht lesbar»."""
    listen = {n: alternativen(t) for n, t in texte.items()}
    kan = kanonisch(listen.values())
    out = {}
    for n, l in listen.items():
        if l is None:
            out[n] = (["<Figurenliste nicht lesbar>"], [])
            continue
        fehlt = [a for a in kan if a not in l]
        zuviel = [a for a in l if a in NACKT_RAUS]
        if fehlt or zuviel:
            out[n] = (fehlt, zuviel)
    return out


def angleichen_text(text, kan):
    """Rein: Text mit der Gruppe = bestehende Alternativen (ohne nackte) + fehlende kanonische. Idempotent."""
    m = gruppe_und_lage(text)
    if not m:
        return text
    bestehend = [a for a in teile(m.group(2)) if a not in NACKT_RAUS]
    neu = bestehend + [a for a in kan if a not in bestehend]
    return text[:m.start(2)] + "|".join(neu) + text[m.end(2):]


def lesen():
    return {n: open(os.path.join(HIER, n), encoding="utf-8").read() for n in KOPIEN}


def zeile():
    try:
        ab = abweichungen(lesen())
    except OSError as e:
        return f"ℹ️ LIZENZ-PARITÄT: unklar ({type(e).__name__})"
    if not ab:
        return ""
    return "⚠️ LIZENZ-PARITÄT: " + " · ".join(f"{n}: fehlt {', '.join(f)}{' / nacktes sonic' if z else ''}" for n, (f, z) in sorted(ab.items())) + \
           " — automation/lizenz_figur_paritaet.py --angleichen"


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    py_a = 'X = 1\nLIZENZ_FIGUR = jsre(r"\\b(?:batman|joker|sonic (?:the hedgehog|movie)|elsa)\\b", re.I)\n'
    py_b = 'LIZENZ_FIGUR = re.compile(r"\\b(?:batman|joker|sonic|hermine)\\b|\\bKostüm ES\\b", re.I)\n'
    py_m = 'LIZENZ_FIGUR = re.compile(r"\\b(?:batman|joker|"\n                          r"elsa|sonic (?:the hedgehog|movie))\\b", re.I)\n'
    js_c = "const LIZENZ_FIGUR = /\\b(?:batman|joker|sonic (?:the hedgehog|movie)|elsa)\\b/i;\n"

    def faelle(m):
        f = []
        if m.alternativen(py_a) != ["batman", "joker", "sonic (?:the hedgehog|movie)", "elsa"]:
            f.append(f"A verschachtelte Klammer muss EINE Alternative bleiben: {m.alternativen(py_a)}")
        if m.alternativen("nichts hier") is not None:
            f.append("B ohne Figurenliste → None")
        ab = m.abweichungen({"a": py_a, "b": py_b, "c": js_c})
        if "hermine" not in ab["a"][0] or "elsa" not in ab["b"][0] or "sonic (?:the hedgehog|movie)" not in ab["b"][0] or ab["b"][1] != ["sonic"]:
            f.append(f"C Abweichungen falsch erkannt: {ab}")
        if m.abweichungen({"a": py_a, "c": js_c}):
            f.append("D gleiche Listen → keine Abweichung")
        kan = m.kanonisch([m.alternativen(py_a), m.alternativen(py_b)])
        neu = m.angleichen_text(py_b, kan)
        if m.abweichungen({"a": m.angleichen_text(py_a, kan), "b": neu}):
            f.append("E nach dem Angleichen müssen alle gleich sein")
        if m.angleichen_text(neu, kan) != neu:
            f.append("F Angleichen muss idempotent sein")
        if "\\bKostüm ES\\b" not in neu or not neu.endswith('re.I)\n'):
            f.append("G Klauseln ausserhalb der Figurenliste bleiben unberührt")
        if "|sonic|" in neu or neu.count("sonic") != 1:
            f.append(f"H nacktes sonic muss raus, die spezifische Form bleiben: {neu}")
        if m.alternativen(py_m) != ["batman", "joker", "elsa", "sonic (?:the hedgehog|movie)"] or m.abweichungen({"a": py_a, "m": py_m}):
            f.append(f"J mehrzeilige Python-Kopie muss wie eine einzeilige gelesen werden: {m.alternativen(py_m)}")
        if m.abweichungen({"a": py_a, "x": "kein treffer"})["x"][0] != ["<Figurenliste nicht lesbar>"]:
            f.append("I unlesbare Kopie muss gemeldet werden, nicht still als gleich gelten")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Zeilenfortsetzung wird Teil der Figur", "alts = re.sub(r'\"\\s*\\n\\s*[rR]?\"', \"\", alts)", "pass"),
           ("Verschachtelung ignoriert", r'(?:[^()]|\([^()]*\))*', r'(?:[^()])*'),
           ("nacktes sonic bleibt", 'NACKT_RAUS = {"sonic"}', "NACKT_RAUS = set()"),
           ("fehlende werden nicht angehängt", "neu = bestehend + [a for a in kan if a not in bestehend]", "neu = bestehend"),
           ("unlesbar gilt als gleich", 'out[n] = (["<Figurenliste nicht lesbar>"], [])', "continue")]
    erkannt = 0
    for name, alt, ers in mut:
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        mm = types.ModuleType("mutant")
        mm.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, ers, 1), "mutant", "exec"), mm.__dict__)
        try:
            ok = bool(faelle(mm))
        except Exception:
            ok = True
        if ok:
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 10 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


def main():
    texte = lesen()
    if "--angleichen" in sys.argv:
        kan = kanonisch([alternativen(t) for t in texte.values()])
        for n, t in texte.items():
            neu = angleichen_text(t, kan)
            if neu != t:
                open(os.path.join(HIER, n), "w", encoding="utf-8").write(neu)
                print(f"angeglichen: {n}")
        rest = abweichungen(lesen())
        print("OK: alle vier Kopien gleich" if not rest else f"⚠️ Rest-Abweichungen: {rest}")
        return 1 if rest else 0
    ab = abweichungen(texte)
    for n, (f, z) in sorted(ab.items()):
        print(f"{n}: fehlt {f}{' · nacktes sonic' if z else ''}")
    print("OK: alle vier Kopien gleich" if not ab else f"{len(ab)} Kopie(n) weichen ab")
    return 1 if ab else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile())
        sys.exit(0)
    sys.exit(main())
