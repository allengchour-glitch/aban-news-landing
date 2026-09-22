"""Gegenprobe in BEIDE Richtungen — eine Wache, die nur «0» kann, ist keine Wache.
Seit 22.09.2026 (Weg B) misst sie Markt UND sichtbare Zusagen; beide Achsen werden hier gefaelscht."""
import sys, importlib
sys.path.insert(0, "automation")
m = importlib.import_module("betreiber_ampel")

def mit(codes, texte=(), kaputt=False, leer=False, texte_kaputt=False):
    def fake(q, v=None):
        if "markets" in q:
            if kaputt: raise RuntimeError("Shopify antwortet nicht")
            if leer:   return {"data": {"markets": {"nodes": []}}}
            return {"data": {"markets": {"nodes": [
                {"id": "gid://shopify/Market/1", "regions": {"nodes": [{"code": c} for c in codes]}}]}}}
        if texte_kaputt: raise RuntimeError("Shopify antwortet nicht")
        return {"data": {"shop": {"shopPolicies": [{"body": t} for t in texte[:1]]},
                         "pages": {"nodes": [{"isPublished": True, "body": t} for t in texte[1:]]
                                            + [{"isPublished": False, "body": "unveroeffentlicht: Liechtenstein"}]}}}
    m.gql = fake
    return m.liechtenstein_gesperrt()

LI = "Wir liefern in die Schweiz und nach Liechtenstein."
faelle = [
    ("[CH], Texte sauber                → schweigt (Weg B erfuellt)", dict(codes=["CH"], texte=("Nur Schweiz.", "Nur Schweiz.")), False),
    ("[CH], 2 sichtbare LI-Zusagen      → MELDET mit Zahl",            dict(codes=["CH"], texte=(LI, LI)),                          True),
    ("[CH], LI nur unveroeffentlicht    → schweigt",                    dict(codes=["CH"], texte=("Nur Schweiz.",)),                  False),
    ("LI eingeschaltet [CH,LI], Texte LI → schweigt",                   dict(codes=["CH", "LI"], texte=(LI,)),                        False),
    ("Marktabfrage kaputt               → schweigt (kein Fehlalarm)",   dict(codes=[], kaputt=True),                                  False),
    ("Textabfrage kaputt                → schweigt (kein Fehlalarm)",   dict(codes=["CH"], texte_kaputt=True),                        False),
    ("leere Marktliste                  → schweigt (nichts gemessen)",  dict(codes=[], leer=True),                                    False),
]
ok = True
for name, kw, erwartet in faelle:
    r = mit(**kw); hat = r is not None; gut = hat == erwartet; ok &= gut
    print(f"  {'ok ' if gut else 'FEHL'} {name}")
    if hat and erwartet:
        gut2 = " 2 sichtbaren" in r; ok &= gut2
        print(f"        → {r[:80]}… {'(Zahl stimmt)' if gut2 else '(ZAHL FALSCH)'}")
print("ALLE GRUEN" if ok else "FEHLSCHLAG")
sys.exit(0 if ok else 1)
