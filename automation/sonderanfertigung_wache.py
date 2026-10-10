#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sonderanfertigungs-Grössen aus dem Angebot nehmen (10.10.2026, Betreiber «2 aus dem angebot»).

Anlass (dropship/SONDERANFERTIGUNG-2026-10-10.md): 17 Schuhe trugen Lieferantensätze wie «Grössen 41–48 sind
Sonderanfertigungen und vom Umtausch ausgeschlossen» — der Vertrauensblock daneben verspricht «30 Tage Rückgabe». Der
Lieferant nimmt diese Grössen nicht zurück; der Betreiber entschied: diese Grössen nicht anbieten.

Regel (automation/data/sonderanfertigung_regel.json), je Produkt mit einem solchen Satz:
  * Teilbereich (z. B. «Grössen 41–48 …», «über 40», «für Grössen 42–44») → diese Grössen-Varianten löschen, den Satz
    entfernen, Bereichsangaben im Text auf die neue Obergrenze kürzen. Ab der ersten Sondergrösse fällt alles darüber weg.
  * Alle Grössen («alle Grössen …», «individuell angefertigt», «auf Mass gefertigt») → Entwurf + Tag.
  * Unklar (übrig bliebe kein zusammenhängender Block ab der kleinsten Grösse) → Entwurf + Tag.
  * Unbestimmt («Übergrössen», «Massanfertigungen» ohne Zahl) → ab standard_ab_unbestimmt (41), im Bericht als Annahme.
  * Keine Zahlengrössen (XS–L) → nur den Satz entfernen.
Hygiene-Hinweise («Versiegelung») bleiben unberührt. Neuimporte: cj_copy_prompt.mjs schreibt «Sonderanfertigung: Grössen X–Y.».

    python3 automation/sonderanfertigung_wache.py --kanarien             # Regel-Selbsttest (16 Fälle)
    python3 automation/sonderanfertigung_wache.py                        # Trockenlauf: Neuimporte der letzten TAGE (3)
    python3 automation/sonderanfertigung_wache.py --export DATEI.jsonl   # Trockenlauf über einen Voll-Export
    ... --scharf                                                         # schreiben (Vorher-Stand ins Ledger)
    ... --ids 1549…,1545…                                                # nur diese Produkte
"""
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(REPO, "automation", "data", "sonderanfertigung_regel.json"), encoding="utf-8"))
SATZ = re.compile(R["satz_muster"], re.I)
AUSNAHME = re.compile(R["satz_ausnahme"], re.I)
ALLE = re.compile(R["alle_muster"], re.I)
GROESSE = re.compile(R["grossen_option"], re.I)
BEREICH = re.compile(r"(\d\d)\s*(?:-|–|bis)\s*(\d\d)")
LISTE = re.compile(r"\((\d\d(?:\s*,\s*\d\d){2,})\)")
SCHWELLE = re.compile(r"(über|ab)\s+(\d\d)\b", re.I)
SCHARF = "--scharf" in sys.argv


def ist_satz(s):
    return bool(SATZ.search(s)) and not AUSNAHME.search(s)


def entscheid(satz, werte):
    """→ ('teil', {Grössen}) | ('alle', set) | ('unklar', set) | ('keine', set) — werte = Optionswerte (Strings)."""
    zahlen = sorted(int(w) for w in werte if re.fullmatch(r"\d\d", w.strip()))
    if not zahlen:
        return "keine", set()
    if ALLE.search(satz) and not LISTE.search(satz):
        return "alle", set(zahlen)
    m = LISTE.search(satz)
    if m:
        aus = {int(x) for x in re.findall(r"\d\d", m.group(1))}
    elif SCHWELLE.search(satz):
        art, n = SCHWELLE.search(satz).groups()
        aus = {z for z in zahlen if (z > int(n) if art.lower() == "über" else z >= int(n))}
    else:
        bereiche = [(int(a), int(b)) for a, b in BEREICH.findall(satz) if int(a) >= zahlen[0] - 5]  # keine «10–20 Werktage»
        if bereiche and bereiche[-1][0] > zahlen[0]:
            aus = {z for z in zahlen if z >= bereiche[-1][0]}
        else:                                       # nur Gesamtbereich oder gar keine Zahl → Annahme ab 41
            aus = {z for z in zahlen if z >= R["standard_ab_unbestimmt"]}
    aus &= set(zahlen)
    if not aus:
        return "keine", set()
    if aus == set(zahlen):
        return "alle", aus
    rest = [z for z in zahlen if z not in aus]
    if any(a < max(rest) for a in aus):
        return "unklar", aus
    return "teil", aus


def kurz(aus):
    z = sorted(aus)
    return f"{z[0]}-{z[-1]}" if z and z == list(range(z[0], z[-1] + 1)) else ",".join(map(str, z))


def kanarien():
    ok = 0
    for k in R["kanarien"]:
        w = k["werte"]
        werte = [str(x) for x in range(int(w.split("-")[0]), int(w.split("-")[1]) + 1)] if re.fullmatch(r"\d\d-\d\d", w) else w.split(",")
        if not ist_satz(k["satz"]):
            ist = "nichts"
        else:
            art, aus = entscheid(k["satz"], werte)
            ist = kurz(aus) if art == "teil" else art
        gut = ist == k["soll"]
        ok += gut
        print(f"  {'ok ' if gut else 'FEHLER'} {k['soll']:>6} ← {k['satz'][:80]}" + ("" if gut else f"   (ist {ist})"))
    print(f"Kanarien {ok}/{len(R['kanarien'])}")
    return ok == len(R["kanarien"])


def saetze_im_text(html):
    """Sätze aus dem Text — Listenpunkte/Absätze sind eigene Sätze (sonst klebt «Lieferung 10–20 Werktage» daran)."""
    t = re.sub(r"</(li|p|h\d|div|td)>|<br\s*/?>", "\n", html or "")
    t = re.sub(r"[ \t]+", " ", re.sub(r"<[^>]+>", " ", t))
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n", t) if s.strip() and ist_satz(s)]


def text_bereinigen(html, neu_max, mini, rest=None):
    """Sätze/Klammern mit Sonderanfertigung aus den Textknoten nehmen, Bereiche «mini–X» auf neu_max kürzen."""
    teile = re.split(r"(<[^>]+>)", html)
    for i, t in enumerate(teile):
        if t.startswith("<") or not ist_satz(t):
            continue
        t = re.sub(r"\s*\([^()]*\)", lambda m: "" if ist_satz(m.group(0)) else m.group(0), t)
        saetze = re.split(r"(?<=[.!?])\s+", t)
        neu = []
        for s in saetze:
            if not ist_satz(s):
                neu.append(s)
            elif neu_max and re.search(r"erhältlich|verfügbar|reichen", s, re.I) and re.search(rf"\b{mini}\b", s):
                neu.append(f"Erhältlich in den Grössen {mini}–{neu_max}" + ("." if re.search(r"[.!?]\s*$", s) else ""))
        teile[i] = " ".join(x for x in neu if x.strip()) if neu else ""
        if t[:1] == " " and teile[i][:1] != " " and teile[i]:
            teile[i] = " " + teile[i]
    h = "".join(teile)
    if neu_max:
        def kuerzen(m):
            a, b = int(m.group(2)), int(m.group(4))
            return m.group(1) + m.group(2) + m.group(3) + str(neu_max) if a == mini and b > neu_max else m.group(0)
        h = re.sub(r"(Grössen?[^.<]{0,30}?)(\d\d)(\s*(?:-|–|bis)\s*)(\d\d)", kuerzen, h)
    if rest:
        def liste(m):
            z = [x for x in rest][:8]
            return m.group(1) + ", ".join(map(str, z)) + (" u. a." if len(rest) > 8 else "")
        h = re.sub(r"(Grössen?:(?:</strong>)?\s*)(?:\d\d,\s*)+\d\d(?:\s*u\.\s*a\.)?", liste, h)
    h = re.sub(r"<(li|p)>\s*</\1>", "", h)
    return h


Q = """query($id:ID!){product(id:$id){id title status tags descriptionHtml options{name values}
 variants(first:250){nodes{id title sku selectedOptions{name value}}}}}"""


def kandidaten():
    if "--ids" in sys.argv:
        return [f"gid://shopify/Product/{x}" for x in sys.argv[sys.argv.index("--ids") + 1].split(",")]
    if "--export" in sys.argv:
        out = []
        for l in open(sys.argv[sys.argv.index("--export") + 1], encoding="utf-8"):
            o = json.loads(l)
            if "__parentId" not in o and saetze_im_text(o.get("descriptionHtml")):
                out.append(o["id"])
        return out
    seit = (dt.datetime.utcnow() - dt.timedelta(days=int(os.environ.get("TAGE", "3")))).strftime("%Y-%m-%dT%H:%M:%SZ")
    out, after = [], None
    while True:
        d = gql('query($q:String,$a:String){products(first:100,after:$a,query:$q){pageInfo{hasNextPage endCursor} nodes{id descriptionHtml}}}',
                {"q": f"status:active created_at:>={seit}", "a": after})["products"]
        out += [p["id"] for p in d["nodes"] if saetze_im_text(p["descriptionHtml"])]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        after = d["pageInfo"]["endCursor"]


def main():
    if "--kanarien" in sys.argv:
        return 0 if kanarien() else 1
    if not _still_ok():
        print("⛔ SONDERANFERTIGUNG: Kanarien rot — kein Lauf")
        return 1
    try:
        ids = kandidaten()
    except Exception as e:  # noqa: BLE001
        print(f"⚠️ SONDERANFERTIGUNG: unklar ({type(e).__name__}: {str(e)[:80]})")
        return 1
    zaehl = {"teil": 0, "alle": 0, "unklar": 0, "keine": 0, "fehler": 0}
    ledger = open(os.path.join(REPO, R["ledger"]), "a", encoding="utf-8") if SCHARF else None
    for pid in ids:
        p = gql(Q, {"id": pid})["product"]
        if not p or p["status"] != "ACTIVE":
            continue
        opt = next((o for o in p["options"] if GROESSE.search(o["name"])), None)
        werte = opt["values"] if opt else []
        saetze = saetze_im_text(p["descriptionHtml"])
        if not saetze:
            continue
        art, aus = entscheid(" ".join(saetze), werte)
        zaehl[art] += 1
        zahlen = sorted(int(w) for w in werte if re.fullmatch(r"\d\d", w.strip()))
        rest = [z for z in zahlen if z not in aus]
        neu_max = max(rest) if art == "teil" else None
        print(f"{art:>6} {kurz(aus) if aus else '':>8} · {p['title'][:60]} · {len(p['variants']['nodes'])} Var.")
        if not SCHARF:
            continue
        stand = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")
        if art in ("alle", "unklar"):
            r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{status} userErrors{message}}}",
                    {"p": {"id": pid, "status": "DRAFT", "tags": sorted(set(p["tags"]) | {R["draft_tag"]})}})["productUpdate"]
            gut = not r["userErrors"] and r["product"]["status"] == "DRAFT"
        else:
            gut = True
            if art == "teil":
                weg = [v["id"] for v in p["variants"]["nodes"]
                       if any(o["name"] == opt["name"] and o["value"].strip().isdigit() and int(o["value"]) in aus
                              for o in v["selectedOptions"])]
                r = gql("mutation($p:ID!,$v:[ID!]!){productVariantsBulkDelete(productId:$p,variantsIds:$v){product{id} userErrors{message}}}",
                        {"p": pid, "v": weg})["productVariantsBulkDelete"]
                gut = not r["userErrors"]
            if gut:
                neu = text_bereinigen(p["descriptionHtml"], neu_max, zahlen[0] if zahlen else None, rest if art == "teil" else None)
                r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{message}}}",
                        {"p": {"id": pid, "descriptionHtml": neu}})["productUpdate"]
                gut = not r["userErrors"] and not saetze_im_text(neu)
        zaehl["fehler"] += not gut
        print(f"       {'ok' if gut else 'FEHLER'}")
        ledger.write("\t".join([stand, pid.rsplit("/", 1)[1], art, kurz(aus) if aus else "-", p["title"][:80],
                                json.dumps([v["sku"] for v in p["variants"]["nodes"]
                                            if any(o["value"].strip().isdigit() and int(o["value"]) in aus for o in v["selectedOptions"])])]) + "\n")
    if ledger:
        ledger.close()
    gesamt = sum(v for k, v in zaehl.items() if k != "fehler")
    zeile = (f"SONDERANFERTIGUNG: {gesamt} mit Rückgabe-Ausschluss · Grössen raus {zaehl['teil']} · Entwurf "
             f"{zaehl['alle'] + zaehl['unklar']} · nur Satz {zaehl['keine']}" + (" · SCHARF" if SCHARF else " · trocken"))
    print(("⚠️ " if zaehl["fehler"] or (gesamt and not SCHARF) else "") + zeile + (f" · Fehler {zaehl['fehler']}" if zaehl["fehler"] else ""))
    return 1 if zaehl["fehler"] else 0


def _still_ok():
    import contextlib
    import io
    with contextlib.redirect_stdout(io.StringIO()):
        return kanarien()


if __name__ == "__main__":
    sys.exit(main())
