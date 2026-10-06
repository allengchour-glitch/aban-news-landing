#!/usr/bin/env python3
"""groessenwert_normieren.py — eine Schreibweise je Grösse im Storefront-Filter (04.10.2026).

Betreiber: «kategorien und fein filter verbessern». Der Filter «Grösse» (Search & Discovery, Quelle Option «Grösse»)
führt jede Schreibweise als eigenen Wert: auf /collections/sub-kleider standen «US10» und «US 10», «S To M»,
«L To XL» und «F». Gemessen am Bulk-Export (16'895 Produkte mit Grössen, 1'204 Werte):
  «140cm» 458× neben «140 cm» 738× → «140 cm» · «US 10» 14× neben «US10» 56× → «US10» · «F» (einziger Wert) →
  «Einheitsgrösse» · «S to M» → «S/M» · «Girls 3 To 4Y» → «3–4 Jahre» · «M 50 To 55» → «M (50–55)» ·
  Kauderwelsch «Light Blue-European And American Size XS» / «Extra Small XS-Snake Head Manicure» → «XS».
NICHT angefasst: «0XL»/«1XL» (200 Produkte) — ob 0XL = XL meint, ist nicht belegbar; falsch umbenannt = Fehlkauf.
Kollision (neuer Wert existiert schon in derselben Option) → nichts schreiben, melden.
Quelle: /tmp/farbmuster_export.jsonl (Bulk mit Optionen, täglich von farbmuster_filter.py).
  python3 automation/groessenwert_normieren.py         (trocken)
  SCHARF=1 python3 automation/groessenwert_normieren.py
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship/_groessenwert_normiert.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
GROESSE = re.compile(r"grösse|groesse|size", re.I)
REGELN = [
    (re.compile(r"^(\d{2,3})\s?cm$", re.I), lambda m: f"{m.group(1)} cm"),
    (re.compile(r"^US (\d{1,2}W?)$"), lambda m: f"US{m.group(1)}"),   # 06.10.: + Plus-Grössen «US 16W»
    (re.compile(r"^Girls (\d+) To (\d+)Y$", re.I), lambda m: f"{m.group(1)}–{m.group(2)} Jahre"),
    (re.compile(r"^(XXS|XS|S|M|L|XL|XXL|XXXL) (\d+) To (\d+)$", re.I), lambda m: f"{m.group(1).upper()} ({m.group(2)}–{m.group(3)})"),
    (re.compile(r"^(XXS|XS|S|M|L|XL|XXL|XXXL) to (XXS|XS|S|M|L|XL|XXL|XXXL)$", re.I), lambda m: f"{m.group(1).upper()}/{m.group(2).upper()}"),
    (re.compile(r"^.*European And American Size (XXS|XS|S|M|L|XL|XXL|XXXL)$", re.I), lambda m: m.group(1).upper()),
    (re.compile(r"^(?:Extra Small|Small Size|Medium|Large) (XS|S|M|L)-Snake Head Manicure$", re.I), lambda m: m.group(1).upper()),
]


def neuer_wert(w, alle):
    if w == "F" and alle == ["F"]:
        return "Einheitsgrösse"
    for rx, f in REGELN:
        m = rx.match(w)
        if m:
            n = f(m)
            return n if n != w else None
    return None


def main():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 30 * 3600:
        print(f"PAUSE: {EXPORT} fehlt oder ist älter als 30 h"); return
    plan, kollision = [], 0
    for z in open(EXPORT):
        p = json.loads(z)
        for o in p.get("options") or []:
            if not GROESSE.search(o.get("name", "")):
                continue
            alle = [v["name"] for v in o.get("optionValues", [])]
            aend = {w: neuer_wert(w, alle) for w in alle}
            aend = {a: n for a, n in aend.items() if n}
            if not aend:
                continue
            ziel = [aend.get(w, w) for w in alle]
            if len(set(ziel)) != len(ziel):
                kollision += 1; print("  Kollision", p["title"][:50], aend); continue
            plan.append((p["id"], p["title"], o["name"], aend))
    print(f"{'SCHARF' if SCHARF else 'TROCKEN'}: {len(plan)} Produkte, {sum(len(a) for *_, a in plan)} Werte, {kollision} Kollisionen")
    for pid, t, on, a in plan[:8]:
        print("  ", t[:50], a)
    if not SCHARF:
        return
    ok = fehl = 0
    for pid, t, on, a in plan:
        live = gql('query($id:ID!){product(id:$id){options{id name optionValues{id name}}}}', {"id": pid})["product"]
        o = next((x for x in (live or {}).get("options", []) if x["name"] == on), None)
        if not o:
            continue
        werte = [{"id": v["id"], "name": a[v["name"]]} for v in o["optionValues"] if v["name"] in a]
        if not werte:
            continue
        r = gql('mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,'
                'option:$o,optionValuesToUpdate:$v){userErrors{message}}}', {"p": pid, "o": {"id": o["id"]}, "v": werte})
        if r["productOptionUpdate"]["userErrors"]:
            fehl += 1; print("  ⚠️", t[:50], r["productOptionUpdate"]["userErrors"]); continue
        ok += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            for alt, neu in a.items():
                f.write(f"{time.strftime('%Y-%m-%d')}\t{pid}\t{on}\t{alt}\t{neu}\n")
    print(f"FERTIG: {ok} Produkte umbenannt, {fehl} Fehler")


if __name__ == "__main__":
    main()
