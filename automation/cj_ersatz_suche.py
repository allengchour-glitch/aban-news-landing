#!/usr/bin/env python3
"""cj_ersatz_suche.py — Ersatz für eine besuchte, aber nicht lieferbare Seite bei CJ suchen (28.09.2026).

Anlass: «Rizinusöl-Wickel-Set» = meistbesuchte Produktseite (21 Sitzungen/30 T, 2 Warenkörbe, 2× Kasse, 0 Käufe) ist seit
18.09. DRAFT (Bestand nur US-Lager, CN→CH 0 Optionen). Die Weiterleitung auf das reine Öl brachte 0 Warenkörbe.
Dieses Werkzeug sucht nach Stichwort und prüft je Kandidat CN→CH-Versand (freightCalculate, erste Variante).

⚠️ Kanarienvogel wie besuchte_seiten_lieferbar.py: zuerst #1018 (belegt in CH zugestellt) — 0 Optionen dort = Werkzeug blind,
Abbruch ohne Urteil. ⚠️ Versandoption ≠ Kategorie erlaubt (#1017 Klinge) — Urteil ist nur «CJ bietet einen Weg an».
Ändert NICHTS im Shop. Wenige Aufrufe → in cj_takt.IMMER_FREI («cj_ersatz»).

  python3 automation/cj_ersatz_suche.py "castor oil pack wrap" ["weiteres stichwort" …]
"""
import os, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_versand_ch_guard import cj            # noqa: E402

KANARIENVOGEL_VID = "2608150717551606700"
N = int(os.environ.get("N", "8"))


def optionen(vid):
    code, opts, msg = cj("/logistic/freightCalculate", {"startCountryCode": "CN", "endCountryCode": "CH",
                                                         "products": [{"quantity": 1, "vid": vid}]})
    return (len(opts or []), min((float(o.get("logisticPrice") or 999) for o in opts or []), default=None)) if code == 200 else (None, None)


def main(woerter):
    k, _ = optionen(KANARIENVOGEL_VID)
    if not k:
        sys.exit("⛔ Kanarienvogel #1018 ohne Optionen — Werkzeug blind, KEIN Urteil")
    for w in woerter:
        # 28.09.: /product/list ignoriert productName/productNameEn (lieferte Kerzenhalter für «castor oil pack») → listV2 keyWord
        code, d, msg = cj("/product/listV2?page=1&size=20&keyWord=" + urllib.parse.quote(w))
        liste = [{"pid": x.get("id"), "sellPrice": x.get("sellPrice"), "productNameEn": x.get("nameEn")}
                 for x in (((d or {}).get("content") or [{}])[0].get("productList") or [])]
        print(f"## {w}: {len(liste)} Treffer (code {code})")
        for p in liste[:N]:
            c2, det, _ = cj("/product/query?pid=" + p["pid"])
            vs = (det or {}).get("variants") or []
            if not vs:
                print(f"  ?  {p['pid']}  keine Varianten  {p.get('productNameEn','')[:70]}"); continue
            n, preis = optionen(vs[0]["vid"])
            mark = "✅" if n else ("⛔" if n == 0 else "?")
            print(f"  {mark} {p['pid']}  EK {p.get('sellPrice')} USD  CH-Wege {n}  ab {preis} USD  {len(vs)} Var.  {p.get('productNameEn','')[:70]}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:] or ["castor oil pack wrap"])
