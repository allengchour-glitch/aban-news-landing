"""Legt ALLE offenen bezahlten Shopify-Bestellungen mit CJ-Artikeln bei CJ an (bezahlbereit; bezahlt wird nichts).
Unveränderte Engine aus dem Status-Branch, DRY=1 rechnet nur. CLOUD_WARTE_MIN (Vorgabe hier 15) = Wartezeit seit der Bestellung.
Aufruf (aus dem Ordner dieser Datei):  DRY=1 python3 lauf_alle.py   → prüfen;   python3 lauf_alle.py   → anlegen."""
import os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HIER, "repo")
os.environ["REPO"] = REPO
os.environ.setdefault("CLOUD_WARTE_MIN", "15")
os.chdir(REPO)
sys.path.insert(0, os.path.join(REPO, "automation"))
sys.argv = ["cj_order_engine.py"]
import cj_order_engine as E
E.main()
