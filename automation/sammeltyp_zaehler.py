#!/usr/bin/env python3
"""sammeltyp_zaehler.py — eine Ampel-Zeile: wie viele aktive Produkte tragen noch den Sammeltyp «Trend-Produkt»/«Trend-Gadget»?

ANLASS (05.10.2026, FIX-12H-PLAN Punkt 16): cj_sku_import/cj_trending_import legten JEDES Produkt als Sammeltyp an,
produkttyp_vereinheitlichen.py räumte täglich nach. Seit 05.10. leiten die Importer den Typ aus der Google-Kategorie ab
(automation/produkttyp_aus_kategorie.mjs). Diese Zeile misst, ob das hält: Fertig-Kriterium ≤ 10 über 48 h ohne Nachlauf.
Bei Fehler «unklar», nie «0». Schreibt nichts.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from kaufwille_zeile import gql
    d = gql('{a:productsCount(query:"status:active product_type:\'Trend-Produkt\'"){count} '
            'b:productsCount(query:"status:active product_type:\'Trend-Gadget\'"){count} '
            'n:products(first:3,sortKey:CREATED_AT,reverse:true,query:"status:active product_type:\'Trend-Produkt\' OR product_type:\'Trend-Gadget\'"){nodes{title createdAt}}}')
    n = d["a"]["count"] + d["b"]["count"]
    juengst = ", ".join(f"{p['title'][:30]} ({p['createdAt'][:10]})" for p in d["n"]["nodes"])
    print(f"SAMMELTYP: {n} aktiv als Trend-Produkt/Trend-Gadget (Soll ≤ 10)" + (f" · {'⚠️ Importer legt wieder an: ' if n > 10 else 'jüngste: '}{juengst}" if juengst else ""))
except Exception as e:
    print(f"SAMMELTYP: unklar ({str(e)[:80]})")
