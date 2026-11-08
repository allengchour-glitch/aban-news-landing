"""Legt ausschliesslich Bestellung #1038 mit der geprüften CJ-Engine an.

DRY=1 berechnet Variante, Fracht und Marge ohne createOrderV2. Ohne DRY darf
die Engine genau den unbezahlten CJ-Auftrag LX1038 anlegen. Zahlung,
Shopify-Fulfillment und Kundenbenachrichtigung gehören nicht zu diesem Lauf.
"""
import os
import sys

REPO = os.environ.get("CJ_ENGINE_ROOT", "").strip()
if not REPO or not os.path.isdir(REPO):
    raise SystemExit("CJ_ENGINE_ROOT fehlt oder ist unlesbar")

os.environ["REPO"] = REPO
os.chdir(REPO)
sys.path.insert(0, os.path.join(REPO, "automation"))
sys.argv = ["cj_order_engine.py"]
import cj_order_engine as engine  # noqa: E402

_offene_bestellungen = engine.offene_bestellungen
ZIEL = "#1038"


def nur_ziel():
    alle = _offene_bestellungen()
    treffer = [order for order in alle if order.get("name") == ZIEL]
    print(
        f"Filter: {len(alle)} offene bezahlte Bestellungen gelesen, "
        f"davon {ZIEL}: {len(treffer)}",
        flush=True,
    )
    return treffer


engine.offene_bestellungen = nur_ziel
engine.main()
