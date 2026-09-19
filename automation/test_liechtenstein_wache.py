"""Gegenprobe in BEIDE Richtungen — eine Wache, die nur «0» kann, ist keine Wache."""
import sys, importlib
sys.path.insert(0, "automation")
m = importlib.import_module("betreiber_ampel")

def mit(codes, kaputt=False, leer=False):
    def fake(q, v=None):
        if kaputt: raise RuntimeError("Shopify antwortet nicht")
        if leer:   return {"data": {"markets": {"nodes": []}}}
        return {"data": {"markets": {"nodes": [
            {"id": "gid://shopify/Market/1",
             "regions": {"nodes": [{"code": c} for c in codes]}}]}}}
    m.gql = fake
    return m.liechtenstein_gesperrt()

faelle = [
    ("heutiger Zustand [CH]        → MELDET", ["CH"],            True),
    ("LI eingeschaltet [CH,LI]     → schweigt", ["CH", "LI"],    False),
    ("nur [LI]                     → schweigt", ["LI"],          False),
    ("Abfrage kaputt               → schweigt (kein Fehlalarm)", None, False),
    ("leere Marktliste             → schweigt (nichts gemessen)", [], False),
]
ok = True
for name, codes, erwartet_meldung in faelle:
    if codes is None:
        r = mit([], kaputt=True)
    elif codes == []:
        r = mit([], leer=True)
    else:
        r = mit(codes)
    hat = r is not None
    gut = hat == erwartet_meldung
    ok &= gut
    print(f"  {'ok ' if gut else 'FEHL'} {name}")
    if hat and erwartet_meldung:
        print(f"        → {r[:90]}…")
print("ALLE GRUEN" if ok else "FEHLSCHLAG")
sys.exit(0 if ok else 1)
