#!/usr/bin/env python3
"""groessenwert_kauderwelsch.py — meldet (und bereinigt eindeutige) Lieferanten-Kauderwelsch in Grössenwerten.

GEMESSEN 02.10.2026: Seit es den Storefront-Filter «Grösse» gibt (Search & Discovery, Quelle Option «Grösse»),
stehen die Werte ALLER Produkte einer Kollektion offen in der Filterliste. Auf /collections/beauty-pflege stand
«L Code-Need To Order Without Toolkit». Am Voll-Export (49'925 aktive) waren es 4 Produkte; von Hand
bereinigt (Ledger dropship/_groessenwerte_bereinigt.tsv). Dieser Wächter hält die Klasse täglich bei 0.

REGEL
  - Quelle: /tmp/farbmuster_export.jsonl (Bulk-Export mit Optionen, täglich von farbmuster_filter.py; < 30 h alt).
  - Befund = Wert einer Option «Grösse»/«Size» mit englischen Lieferantenwörtern (need, order, without, toolkit,
    code, canopy, size …). Länder-/Modellnamen wie «iPhone 15 Plus» sind kein Befund.
  - Automatisch bereinigt werden nur EINDEUTIGE Muster (Kürzel bleibt, Rest weg), alles andere wird gemeldet:
      «L Code-Need To Order Without Toolkit» → «L» · «Color-M Code» → «M» ·
      «Medium Size 35 X 43 Cm» → «M · 35×43 cm»
  - Kollision (zwei Werte würden gleich) → nichts schreiben, melden.
  - DRY (Standard) meldet; SCHARF=1 schreibt (productOptionUpdate) und liest zurück.
"""
import datetime as dt, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from seo_autopilot import gql

REPO = os.path.dirname(HIER)
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_groessenwerte_bereinigt.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
OPT = {"grösse", "groesse", "größe", "size"}
ENGLISCH = re.compile(r"\b(need|order|without|toolkit|code|canopy|patch|light strip|size|suitable|recommend(?:ed)?|"
                      r"pcs|pieces?|please|choose|note)\b", re.I)
AUSNAHME = re.compile(r"\b(iphone|galaxy|ipad|pixel|plus|pro|max|ultra)\b", re.I)
KUERZEL = r"(XXS|XS|S|M|L|XL|XXL|[2-6]XL)"
GROESSE_WORT = {"extra small": "XS", "small": "S", "medium": "M", "large": "L", "extra large": "XL"}


def bereinigen(w):
    """Eindeutige Muster → neuer Wert, sonst None (nur melden)."""
    m = re.fullmatch(KUERZEL + r"\s*Code-?Need To Order Without Toolkit", w.strip(), re.I)
    if m:
        return m.group(1).upper()
    m = re.fullmatch(r"Colou?r-" + KUERZEL + r"\s*Code", w.strip(), re.I)
    if m:
        return m.group(1).upper()
    m = re.fullmatch(r"(extra small|extra large|small|medium|large)\s+size\s+(\d+)\s*[xX×]\s*(\d+)\s*cm", w.strip(), re.I)
    if m:
        return f"{GROESSE_WORT[m.group(1).lower()]} · {m.group(2)}×{m.group(3)} cm"
    return None


SELBSTTEST = [("L Code-Need To Order Without Toolkit", "L"), ("XS Code-Need To Order Without Toolkit", "XS"),
              ("Color-M Code", "M"), ("Medium Size 35 X 43 Cm", "M · 35×43 cm"),
              ("Extra Small Size 23 X 34 Cm", "XS · 23×34 cm"), ("S Canopy with Patch", None), ("M", None)]


def befund(w):
    return bool(ENGLISCH.search(w)) and not AUSNAHME.search(w)


def main():
    falsch = [(w, bereinigen(w), e) for w, e in SELBSTTEST if bereinigen(w) != e]
    if falsch or befund("iPhone 15 Plus") or not befund("S Canopy with Patch"):
        raise SystemExit(f"Selbsttest gescheitert: {falsch}")
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 30 * 3600:
        print("GROESSENWERTE: Export fehlt/alt — übersprungen (farbmuster_filter.py baut ihn)")
        return
    gemeldet, geschrieben = [], 0
    M = ("mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,"
         "option:$o,optionValuesToUpdate:$v){product{options{id optionValues{id name}}} userErrors{message}}}")
    for l in open(EXPORT, encoding="utf-8"):
        p = json.loads(l)
        for o in p.get("options") or []:
            if o["name"].strip().lower() not in OPT:
                continue
            werte = [v["name"] for v in o["optionValues"]]
            treffer = [w for w in werte if befund(w)]
            if not treffer:
                continue
            neu = {w: bereinigen(w) for w in treffer}
            ziel = [neu.get(w) or w for w in werte]
            if any(v is None for v in neu.values()) or len(set(ziel)) < len(ziel):
                gemeldet.append((p["id"].split("/")[-1], treffer[:3]))
                continue
            if not SCHARF:
                gemeldet.append((p["id"].split("/")[-1], [f"{a} → {b}" for a, b in neu.items()][:3]))
                continue
            live = gql("query($i:ID!){product(id:$i){options{id name optionValues{id name}}}}", {"i": p["id"]})["product"]
            lo = next((x for x in live["options"] if x["name"].strip().lower() in OPT), None)
            if not lo:
                continue
            v = [{"id": x["id"], "name": neu[x["name"]]} for x in lo["optionValues"] if x["name"] in neu]
            r = gql(M, {"p": p["id"], "o": {"id": lo["id"]}, "v": v})["productOptionUpdate"]
            namen = {x["name"] for opt in (r["product"] or {}).get("options", []) for x in opt["optionValues"]}
            if not r["userErrors"] and all(x["name"] in namen for x in v):
                geschrieben += 1
                with open(LEDGER, "a", encoding="utf-8") as f:
                    for a, b in neu.items():
                        f.write(f"{dt.date.today()}\t{p['id'].split('/')[-1]}\t{a}\t{b}\n")
            else:
                gemeldet.append((p["id"].split("/")[-1], [f"FEHLER {r['userErrors']}"]))
    print(f"GROESSENWERTE: {geschrieben} bereinigt · {len(gemeldet)} gemeldet"
          + (" · " + "; ".join(f"{pid} {w}" for pid, w in gemeldet[:3]) if gemeldet else ""))


if __name__ == "__main__":
    main()
