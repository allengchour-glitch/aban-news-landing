"""Legt NUR Bestellung #1034 bei CJ an (Auftrag Besitzer 04.11.2026 «1034 bestellung push sofort»).
Nutzt die unveränderte Engine aus dem Status-Branch; filtert nur die Liste der offenen Bestellungen.
DRY=1 rechnet nur; ohne DRY wird bei CJ angelegt (bezahlbereit, bezahlt wird nichts)."""
import os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HIER, "repo")
os.environ["REPO"] = REPO
os.chdir(REPO)
sys.path.insert(0, os.path.join(REPO, "automation"))
sys.argv = ["cj_order_engine.py"]
import cj_order_engine as E

_orig = E.offene_bestellungen
ZIEL = "#1034"
def nur_ziel():
    alle = _orig()
    treffer = [o for o in alle if o.get("name") == ZIEL]
    print(f"Filter: {len(alle)} offene bezahlte Bestellungen gelesen, davon {ZIEL}: {len(treffer)}", flush=True)
    return treffer
E.offene_bestellungen = nur_ziel
E.main()
