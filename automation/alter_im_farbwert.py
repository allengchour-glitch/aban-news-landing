#!/usr/bin/env python3
"""alter_im_farbwert.py — Alter/Babygrösse aus dem FARBWERT in eine eigene Option «Grösse» (06.10.2026, Verbesserungsrunde).

GEMESSEN 06.10. (Bulk 50'914 aktive): 44 Kinder-/Babyprodukte führen nur EINE Option «Farbe», deren Werte Farbe UND Alter
tragen — «White-6 TO 9M», «Light Blue-1to3 Years Old», «Pink-G3 TO 4Y», «Beige-0to3M» (CJ-variantKey ungeteilt). Folge: der
Storefront-Filter «Farbe» zeigt «White-6 TO 9M» als Farbe, die Grösse fehlt im Filter «Grösse» und im Google-Feed (`size`).
Verwandte Klasse: groesse_im_farbwert.py («Aprikose-2XL», Grössen-Option schon vorhanden) — hier gibt es KEINE Grössen-Option.

REGEL (nichts raten): nur Produkte mit genau EINER Option (Farbe/Color), bei denen JEDER Wert auf ein Alters-Muster endet.
Alter → «1–3 Jahre» / «6–9 Monate» (Schreibweise wie groessenwert_normieren.py «3–4 Jahre»); Präfix G/C (Girls/Children) fällt
weg. Die neue Kombination (Farbe, Grösse) muss je Variante eindeutig sein, sonst bleibt das Produkt unberührt.
Ablauf je Produkt: productOptionsCreate «Grösse» (LEAVE_AS_IS) → productVariantsBulkUpdate mit beiden Optionswerten →
Rücklesen. Ledger dropship/_alter_im_farbwert.tsv, Bericht dropship/ALTER-IM-FARBWERT-2026-10-06.md.
  python3 automation/alter_im_farbwert.py                  # trocken (Export /tmp/farbmuster_export.jsonl)
  SCHARF=1 [IDS=gid,…] [MAX=n] python3 automation/alter_im_farbwert.py
  python3 automation/alter_im_farbwert.py --selbsttest
"""
import datetime, json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_alter_im_farbwert.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX") or 0)
IDS = {x if x.startswith("gid:") else f"gid://shopify/Product/{x}" for x in os.environ.get("IDS", "").split(",") if x.strip()}

ALTER = re.compile(r"^(?P<farbe>.+?)\s*-\s*[GC]?(?P<a>\d{1,2})\s*to\s*(?P<b>\d{1,2})\s*(?P<e>y(?:ears?)?(?:\s*old)?|m(?:onths?)?)\s*$", re.I)


def teilen(wert):
    """«Light Blue-1to3 Years Old» → («Light Blue», «1–3 Jahre»); kein Alters-Anhang → None."""
    m = ALTER.match((wert or "").strip())
    if not m or int(m["a"]) >= int(m["b"]):
        return None
    einheit = "Jahre" if m["e"].lower().startswith("y") else "Monate"
    return m["farbe"].strip(" -"), f"{int(m['a'])}–{int(m['b'])} {einheit}"


def plan(p):
    opts = p.get("options") or []
    if len(opts) != 1 or opts[0]["name"].lower() not in ("farbe", "color"):
        return None, "nicht genau eine Farb-Option"
    werte = [v["name"] for v in opts[0]["optionValues"]]
    geteilt = {w: teilen(w) for w in werte}
    if not werte or any(v is None for v in geteilt.values()):
        return None, "nicht alle Werte mit Alter"
    if len(set(geteilt.values())) != len(werte):
        return None, "Kollision nach Teilung"
    return geteilt, "ok"


def schreiben(pid, opt_name, geteilt):
    from kaufwille_zeile import gql
    p = gql('query($i:ID!){product(id:$i){options{name} variants(first:100){nodes{id selectedOptions{name value}}}}}', {"i": pid})["product"]
    if len(p["options"]) != 1:
        return "übersprungen: Optionen geändert"
    alter = []
    for g in geteilt.values():
        if g[1] not in alter:
            alter.append(g[1])
    r = gql('mutation($p:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(productId:$p,options:$o,variantStrategy:LEAVE_AS_IS){userErrors{field message code}}}',
            {"p": pid, "o": [{"name": "Grösse", "values": [{"name": a} for a in alter]}]})["productOptionsCreate"]
    if r["userErrors"]:
        return f"fehler optionsCreate: {r['userErrors'][:1]}"
    vs = []
    for v in p["variants"]["nodes"]:
        alt = next(o["value"] for o in v["selectedOptions"] if o["name"] == opt_name)
        f, a = geteilt[alt]
        vs.append({"id": v["id"], "optionValues": [{"optionName": opt_name, "name": f}, {"optionName": "Grösse", "name": a}]})
    r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{field message code}}}',
            {"p": pid, "v": vs})["productVariantsBulkUpdate"]
    if r["userErrors"]:
        return f"fehler variantsUpdate: {r['userErrors'][:1]}"
    q = gql('query($i:ID!){product(id:$i){options{name optionValues{name hasVariants}}}}', {"i": pid})["product"]
    farbe = next(o for o in q["options"] if o["name"] == opt_name)
    rest = [v["name"] for v in farbe["optionValues"] if v["hasVariants"] and teilen(v["name"])]
    return "gesetzt" if not rest and any(o["name"] == "Grösse" for o in q["options"]) else f"fehler rücklesen: {rest[:2]}"


def main():
    stat = {}; ziele = []
    for l in open(EXPORT, encoding="utf-8"):
        p = json.loads(l)
        if IDS and p["id"] not in IDS:
            continue
        opts = p.get("options") or []
        if not any(teilen(v["name"]) for o in opts for v in o.get("optionValues") or []):
            continue
        g, grund = plan(p)
        stat[grund] = stat.get(grund, 0) + 1
        if g:
            ziele.append((p["id"], p["title"], opts[0]["name"], g))
    erledigt = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8")} if os.path.exists(LEDGER) else set()
    ziele = [z for z in ziele if z[0] not in erledigt]
    if MAX:
        ziele = ziele[:MAX]
    print("Stand:", stat, "· offen", len(ziele))
    for pid, t, _, g in ziele[:5]:
        print(f"  {t[:50]}: " + " · ".join(f"{a} → {b[0]} / {b[1]}" for a, b in list(g.items())[:3]))
    erg = {}
    if SCHARF:
        with open(LEDGER, "a", encoding="utf-8") as led:
            for pid, t, on, g in ziele:
                st = schreiben(pid, on, g)
                erg[st.split(":")[0]] = erg.get(st.split(":")[0], 0) + 1
                led.write(f"{pid}\t{st}\t{datetime.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{t[:60]}\n"); led.flush()
                if not st.startswith("gesetzt"):
                    print(f"  {t[:50]}: {st}")
    print(f"ALTER-IM-FARBWERT: {len(ziele)} offen" + (f" · {erg}" if SCHARF else " (TROCKEN)"))
    return 0


def selbsttest():
    t = [
        (teilen("Light Blue-1to3 Years Old") == ("Light Blue", "1–3 Jahre"), "1to3 Years Old"),
        (teilen("Light Blue-6 To 10 Years Old") == ("Light Blue", "6–10 Jahre"), "6 To 10 Years Old"),
        (teilen("Pink-G3 TO 4Y") == ("Pink", "3–4 Jahre"), "G3 TO 4Y"),
        (teilen("Pink-C12 TO 18M") == ("Pink", "12–18 Monate"), "C12 TO 18M"),
        (teilen("White-6 TO 9M") == ("White", "6–9 Monate"), "6 TO 9M"),
        (teilen("Sea Blue- 3to6M") == ("Sea Blue", "3–6 Monate"), "Leerzeichen nach Bindestrich"),
        (teilen("Blue 1139-0to3M") == ("Blue 1139", "0–3 Monate"), "0to3M"),
        (teilen("Pink-MS") is None, "Kanarie: Pink-MS (Mama S) bleibt"),
        (teilen("Schwarz") is None, "ohne Anhang"),
        (teilen("Rot-10 To 6Y") is None, "verdreht = nichts"),
        (plan({"options": [{"name": "Farbe", "optionValues": [{"name": "Pink-MS"}, {"name": "Pink-C12 TO 18M"}]}]})[0] is None, "gemischt = nichts"),
        (plan({"options": [{"name": "Farbe", "optionValues": [{"name": "Pink-0to3M"}]}, {"name": "Grösse", "optionValues": [{"name": "S"}]}]})[0] is None, "zweite Option = nichts"),
    ]
    ok = sum(b for b, _ in t)
    for b, n in t:
        print(("✓ " if b else "✗ ") + n)
    print(f"{ok}/{len(t)}"); return 0 if ok == len(t) else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
