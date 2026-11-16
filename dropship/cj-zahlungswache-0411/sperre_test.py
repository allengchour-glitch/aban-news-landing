import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sperre import trenne, lade
f = 0
def gleich(a, b, w):
    global f
    if a != b: f += 1; print("FEHLER", w, a, b)
S = {"gid://shopify/Product/1": "ring-mit-gravur"}
o1, o2, o3 = {"name": "#1"}, {"name": "#2"}, {"name": "#3"}
frei, ges = trenne([o1, o2, o3], {"#1": ["gid://shopify/Product/9"], "#2": ["gid://shopify/Product/9", "gid://shopify/Product/1"]}, S)
gleich([o["name"] for o in frei], ["#1"], "frei nur ohne Treffer")
gleich(ges, [("#2", ["ring-mit-gravur"]), ("#3", ["(Produkte nicht lesbar)"])], "gemischte Bestellung und unlesbar gesperrt")
L = lade(os.path.join(os.path.dirname(os.path.abspath(__file__)), "personalisierung_sperre.json"))
gleich(len(L) >= 200, True, "Liste geladen")
gleich("gid://shopify/Product/15496389788033" in L, True, "Halsband 621800 nachgetragen")
gleich(any("144640" in h for h in L.values()), False, "Malen nach Zahlen 144640 nicht gesperrt")
print("OK" if not f else "FEHLGESCHLAGEN", f); sys.exit(1 if f else 0)
