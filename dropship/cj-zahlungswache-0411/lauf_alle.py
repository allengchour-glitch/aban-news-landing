"""Legt ALLE offenen bezahlten Shopify-Bestellungen mit CJ-Artikeln bei CJ an (bezahlbereit; bezahlt wird nichts).
Unveränderte Engine aus dem Status-Branch, DRY=1 rechnet nur. CLOUD_WARTE_MIN (Vorgabe hier 15) = Wartezeit seit der Bestellung.
16.11.2026: Sperre Personalisierung (sperre.py, personalisierung_sperre.json): Bestellungen mit Artikeln, deren Text, Foto,
Gravur oder Buchstabe der Shop nicht erfasst, werden nicht angelegt, sondern als ⚠️-Warnung gemeldet. Vorher: lauf_alle.vor-sperre.py.
Aufruf (aus dem Ordner dieser Datei):  DRY=1 python3 lauf_alle.py   → prüfen;   python3 lauf_alle.py   → anlegen."""
import os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HIER, "repo")
os.environ["REPO"] = REPO
os.environ.setdefault("CLOUD_WARTE_MIN", "15")
sys.path.insert(0, HIER)
import sperre
SPERRLISTE = sperre.lade(os.environ.get("SPERRDATEI") or os.path.join(HIER, "personalisierung_sperre.json"))
os.chdir(REPO)
sys.path.insert(0, os.path.join(REPO, "automation"))
sys.argv = ["cj_order_engine.py"]
import cj_order_engine as E

_orig = E.offene_bestellungen
def _mit_sperre():
    bestellungen = _orig()
    if not bestellungen:
        return bestellungen
    q = '''{orders(first:25, query:"financial_status:paid AND fulfillment_status:unfulfilled",
             sortKey:CREATED_AT, reverse:true){nodes{ name lineItems(first:20){nodes{ product{ id } }} }}}'''
    ids = {}
    try:
        for n in ((E.gql(q).get("data") or {}).get("orders") or {}).get("nodes") or []:
            ids[n["name"]] = [((li.get("product") or {}).get("id")) for li in n["lineItems"]["nodes"]]
    except Exception as e:
        print(f"  ⚠️ Sperre Personalisierung: Produkte nicht lesbar ({type(e).__name__}) — alle offenen Bestellungen zurückgehalten", flush=True)
    frei, gesperrt = sperre.trenne(bestellungen, ids, SPERRLISTE)
    for name, handles in gesperrt:
        print(f"  {name}: ⚠️ WARNUNG Personalisierung nicht erfasst ({', '.join(handles)}) — NICHT bei CJ anlegen, Kundin nach Text/Foto/Buchstabe fragen, Besitzer melden", flush=True)
    return frei
E.offene_bestellungen = _mit_sperre
E.main()
