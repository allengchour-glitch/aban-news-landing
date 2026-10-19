#!/usr/bin/env python3
"""theme_text_kanarien.py — stehen die Zeichenketten aus automation/data/theme_kanarien.json noch in der LIVE-Theme-Datei? (19.10.2026). Nur lesend.

ANLASS: Am 19.10. kamen in templates/product.json zwei Änderungen dazu (Rückgabe-Zusatz, Liechtenstein-Zweig am Lieferdatum). Mehrere Skripte schreiben diese Datei
(Kaufweg-, Kassendatum-, Lieferzeit-Patches). Liest eines von ihnen einen alten Stand und schreibt ihn zurück, verschwinden die Zusätze OHNE Fehlermeldung.
Die Zeile sagt es innerhalb einer Stunde. Fehler (kein Token, kein Netz) = «unklar», nie «ok».

    python3 automation/theme_text_kanarien.py
    python3 automation/theme_text_kanarien.py --selbsttest
"""
import json
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
REGEL = os.path.join(HIER, "data", "theme_kanarien.json")
THEME = "gid://shopify/OnlineStoreTheme/187533001089"


def eintraege(pfad=REGEL):
    d = json.load(open(pfad, encoding="utf-8"))
    e = d.get("eintraege")
    if not isinstance(e, list) or not e:
        raise ValueError("keine Einträge")
    return e


def pruefen(lesen, liste):
    """lesen(datei) → Text; → (fehlend [str], unklar [str])."""
    fehlend, unklar, cache = [], [], {}
    for k in liste:
        datei = k["datei"]
        if datei not in cache:
            try:
                cache[datei] = lesen(datei)
            except Exception as e:      # kein Token, kein Netz, Datei fehlt
                cache[datei] = None
                unklar.append(f"{datei}: {type(e).__name__}")
        if cache[datei] is not None and k["muss"] not in cache[datei]:
            fehlend.append(f"{datei}: «{k['muss'][:48]}» fehlt ({k.get('grund', '')[:50]})")
    return fehlend, unklar


def zeile(fehlend, unklar, n):
    if fehlend:
        return "⚠️ THEME-KANARIEN: " + " | ".join(fehlend) + " — ein Theme-Schreiber hat einen alten Stand zurückgeschrieben? Backup theme_backup/templates__product.json.vor-rueckgabe-lieferland-1019 → Zusätze neu setzen"
    if unklar:
        return "THEME-KANARIEN: unklar (" + "; ".join(sorted(set(unklar)))[:120] + ")"
    return f"THEME-KANARIEN: {n}/{n} Zeichenketten live vorhanden"


def live_lesen(datei):
    sys.path.insert(0, HIER)
    import kollektion_leer as kl
    t = kl.gql('query($id:ID!,$f:String!){ theme(id:$id){ files(filenames:[$f], first:1){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }',
               {"id": THEME, "f": datei})["theme"]
    return t["files"]["nodes"][0]["body"]["content"]


def selbsttest():
    f = []
    liste = [{"datei": "a.json", "muss": "XYZ", "grund": "g"}, {"datei": "a.json", "muss": "ABC", "grund": "g"}]
    fe, un = pruefen(lambda d: "…XYZ…ABC…", liste)
    if fe or un or "2/2" not in zeile(fe, un, 2):
        f.append(f"alles da: {fe} {un}")
    fe, un = pruefen(lambda d: "…XYZ…", liste)
    if len(fe) != 1 or "ABC" not in fe[0] or not zeile(fe, un, 2).startswith("⚠️"):
        f.append(f"eine fehlt: {fe} {un}")
    def kaputt(d):
        raise OSError("kein Netz")
    fe, un = pruefen(kaputt, liste)
    z = zeile(fe, un, 2)
    if fe or "unklar" not in z or "ok" in z.lower().split("unklar")[0]:
        f.append(f"Fehler muss unklar sein, nie ok: {fe} {un} {z}")
    try:
        eintraege(REGEL)
    except Exception as e:
        f.append(f"Regeldatei nicht lesbar: {e}")
    print("SELBSTTEST theme_text_kanarien:", "OK" if not f else "FEHLER " + " | ".join(f))
    return 0 if not f else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--selbsttest"]:
        sys.exit(selbsttest())
    if a:
        print(f"unbekannter Schalter {a!r} — Abbruch (kein Lauf). Erlaubt: (ohne) · --selbsttest")
        sys.exit(2)
    try:
        liste = eintraege()
    except (OSError, ValueError) as e:
        print(f"THEME-KANARIEN: unklar (Regeldatei: {type(e).__name__})")
        sys.exit(0)
    fe, un = pruefen(live_lesen, liste)
    print(zeile(fe, un, len(liste)))
