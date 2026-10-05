#!/usr/bin/env python3
"""blog_preise_aktualisieren.py — Preisangaben in Blogartikeln an den Live-Preis angleichen (taeglich).

WARUM (05.10.2026, Fix-12h Punkt 18, Nebenbefund): Die Ratgeber nennen an Produktlinks Preise — inline «(CHF 18.90)»
und in Produktkarten «CHF 76.90 (Stand 2026-09-24)». Gemessen 05.10. ueber alle 334 Artikel: 142 Preisangaben an
105 Produkten, 82 davon ausserhalb des Live-Preisbandes (54 TIEFER als live = die Leserin sieht einen Preis, den der
Shop nicht haelt; 28 hoeher). Ursache: Preissenkung 02.10. (−11 %), Preis-Verlustschutz, Lieferantenwechsel — die
Artikel wurden einmalig geschrieben. Hausregel «keine erfundenen Zahlen» gilt auch fuer alte Zahlen.

WAS: Fuer jeden <a href="/products/…"> mit Preis direkt im/nach dem Anker ODER in der Karte darunter:
  · Produkt ACTIVE: Preis ausserhalb [min, max] der Varianten → Zahl ersetzen (eine Variante: «CHF min»; mehrere und
    Text ohne «ab»: «ab CHF min»); «(Stand JJJJ-MM-TT)» direkt dahinter → heute. «Preise Stand TT.MM.JJJJ» im Artikel
    → heute, wenn im Artikel etwas geaendert wurde.
  · Produkt nicht ACTIVE/fehlt: NICHT anfassen (toter Link ist Sache von blog_linkziele_wache.py / Linkreparatur).
Standard = Trockenlauf mit Ausgabe; SCHARF=1 schreibt (articleUpdate) und fuehrt dropship/_blog_preise_ledger.tsv
(artikel, handle, alt, neu, datum) + Vorher-Bodies in dropship/_blog_preise_vorher/<handle>.html (einmal je Tag).
Ausgabe: Ampel «BLOG-PREISE: N abweichend in M Artikeln (K korrigiert) · P Preisangaben geprueft». Fehler → «unklar».
ENV: SCHARF (0) · LIMIT (Artikel je Lauf, 40) · AUSGABE (/tmp/blog_preise.json)
"""
import json, os, re, sys, time, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_blog_preise_ledger.tsv")
VORHER_DIR = os.path.join(REPO, "dropship", "_blog_preise_vorher")
SCHARF = os.environ.get("SCHARF", "0") == "1"
LIMIT = int(os.environ.get("LIMIT", "40"))
AUSGABE = os.environ.get("AUSGABE", "/tmp/blog_preise.json")
HEUTE = datetime.date.today()
HEUTE_ISO = HEUTE.isoformat()
HEUTE_CH = HEUTE.strftime("%d.%m.%Y")

A_RE = re.compile(r'<a href="/products/([^"/#?]+)"[^>]*>([^<]*)</a>')
PREIS_RE = re.compile(r'(ab )?CHF (\d+\.\d\d)')


def lade_artikel():
    Q = """query($c:String){articles(first:50,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title body}}}"""
    out, c = [], None
    while True:
        d = gql(Q, {"c": c})["articles"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    return out


def preise_live(handles):
    live = {}
    hs = sorted(handles)
    for i in range(0, len(hs), 10):
        teil = hs[i:i + 10]
        q = "query(" + ",".join(f"$h{j}:String!" for j in range(len(teil))) + "){" + "".join(
            f" p{j}:productByIdentifier(identifier:{{handle:$h{j}}}){{status priceRangeV2{{minVariantPrice{{amount}} maxVariantPrice{{amount}}}}}}"
            for j in range(len(teil))) + "}"
        d = gql(q, {f"h{j}": h for j, h in enumerate(teil)})
        for j, h in enumerate(teil):
            p = d.get(f"p{j}")
            live[h] = None if not p else (p["status"], float(p["priceRangeV2"]["minVariantPrice"]["amount"]),
                                         float(p["priceRangeV2"]["maxVariantPrice"]["amount"]))
    return live


def fundstellen(body):
    """Liefert [(handle, start, ende, hat_ab, preis)] der Preisangabe, die zu einem Produktlink gehoert."""
    aus = []
    for m in A_RE.finditer(body):
        h = m.group(1)
        # a) Preis im Ankertext oder direkt dahinter «(CHF x)»
        mi = re.search(r'\((ab )?CHF (\d+\.\d\d)\)', m.group(2))
        if mi:
            aus.append((h, m.start(2) + mi.start(), m.start(2) + mi.end(), bool(mi.group(1)), float(mi.group(2)), "inline"))
            continue
        nach = body[m.end():m.end() + 400]
        mi = re.match(r'\s*\((ab )?CHF (\d+\.\d\d)\)', nach)
        if mi:
            aus.append((h, m.end() + mi.start(), m.end() + mi.end(), bool(mi.group(1)), float(mi.group(2)), "inline"))
            continue
        # b) Karte: Anker schliesst den Titel-Div, Preis in einem der naechsten Divs (vor dem Knopf)
        if nach.startswith("</div>"):
            knopf = nach.find('<a href="/products/')
            feld = nach[:knopf if knopf > 0 else 400]
            mk = PREIS_RE.search(feld)
            if mk:
                aus.append((h, m.end() + mk.start(), m.end() + mk.end(), bool(mk.group(1)), float(mk.group(2)), "karte"))
    return aus


def neuer_text(alt_text, hat_ab, mn, mx):
    if abs(mn - mx) < 0.005:
        kern = f"CHF {mn:.2f}"
    else:
        kern = f"ab CHF {mn:.2f}"
    if alt_text.startswith("("):
        return f"({kern})"
    return kern


def main():
    t0 = time.time()
    arts = lade_artikel()
    alle = {a["handle"]: fundstellen(a["body"] or "") for a in arts}
    handles = {h for fs in alle.values() for h, *_ in fs}
    live = preise_live(handles)
    n_preise = sum(len(fs) for fs in alle.values())
    abweichend, plan = [], {}
    for a in arts:
        fs = alle[a["handle"]]
        if not fs:
            continue
        body = a["body"]
        aend = []
        for h, s, e, hat_ab, preis, art in sorted(fs, key=lambda x: -x[1]):   # von hinten, Offsets bleiben gueltig
            lv = live.get(h)
            if not lv or lv[0] != "ACTIVE":
                continue
            _, mn, mx = lv
            if mn - 0.005 <= preis <= mx + 0.005 and (hat_ab or abs(mn - mx) < 0.005):
                continue
            alt_text = body[s:e]
            neu = neuer_text(alt_text, hat_ab, mn, mx)
            abweichend.append((a["handle"], h, alt_text, neu, art))
            # «(Stand JJJJ-MM-TT)» direkt dahinter mitziehen
            rest = body[e:e + 30]
            ms = re.match(r' \(Stand \d{4}-\d{2}-\d{2}\)', rest)
            if ms:
                body = body[:s] + neu + f" (Stand {HEUTE_ISO})" + body[e + ms.end():]
            else:
                body = body[:s] + neu + body[e:]
            aend.append((h, alt_text, neu))
        if aend:
            body = re.sub(r'Preise Stand \d{2}\.\d{2}\.\d{4}', f"Preise Stand {HEUTE_CH}", body)
            plan[a["handle"]] = (a, body, aend)
    art_ab = len({x[0] for x in abweichend})
    korrigiert = 0
    if SCHARF and plan:
        os.makedirs(VORHER_DIR, exist_ok=True)
        M = "mutation($id:ID!,$b:HTML!){articleUpdate(id:$id,article:{body:$b}){userErrors{field message} article{id}}}"
        for h, (a, body, aend) in list(plan.items())[:LIMIT]:
            vp = os.path.join(VORHER_DIR, f"{h}.{HEUTE_ISO}.html")
            if not os.path.exists(vp):
                open(vp, "w", encoding="utf-8").write(a["body"] or "")
            r = gql(M, {"id": a["id"], "b": body})
            ue = r["articleUpdate"]["userErrors"]
            if ue:
                print("FEHLER", h, ue)
                continue
            korrigiert += len(aend)
            with open(LEDGER, "a", encoding="utf-8") as f:
                for ph, alt, neu in aend:
                    f.write(f"{h}\t{ph}\t{alt}\t{neu}\t{HEUTE_ISO}\n")
            time.sleep(0.4)
    json.dump({"stand": HEUTE_ISO, "preisangaben": n_preise, "abweichend": abweichend, "live": live},
              open(AUSGABE, "w"), ensure_ascii=False, indent=0)
    print(f"BLOG-PREISE: {len(abweichend)} abweichend in {art_ab} Artikeln ({korrigiert} korrigiert{'' if SCHARF else ', TROCKENLAUF'}) "
          f"· {n_preise} Preisangaben an {len(handles)} Produkten in {len(arts)} Artikeln · {int(time.time() - t0)} s")
    if not SCHARF:
        for x in abweichend[:60]:
            print("  ", x)
    print("FERTIG")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"BLOG-PREISE: unklar ({type(e).__name__}: {str(e)[:140]})")
        print("FERTIG: abgebrochen")
    sys.exit(0)
