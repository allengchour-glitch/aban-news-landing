#!/usr/bin/env python3
"""shopify_fein.py — grobe Shopify-Oberklassen per Titelwort in Shopifys Unterklassen (08.10.2026).

ANLASS (Betreiber «weiter feinkategorie verbessern»). GEMESSEN 08.10. 14:40 (Export 51'683 aktive): Google steht bei 45'239
auf einem Blatt, Shopify aber bei 27'897 auf einer Klasse MIT Unterklassen. Grösste: Clothing Tops 4'671 · Handbags 880 ·
Pants 772 · Power Adapters & Chargers 742 · Pet Collars & Harnesses 733 · Pet Leashes 727 · Coats & Jackets 715 ·
Pet Bowls 544 · Pillows 250. Google kennt darunter nichts Feineres («Shirts & Tops», «Pants», «Pet Leashes» sind Blätter),
darum kommt kategorie_fein (Weg über Google) dort nie weiter — gleiche Lage wie bei den Schuhen (schuhe_fein.py, 08.10.).
Der Shop-Filter «Kategorie» kann so Hoodies nicht von Blusen oder Powerbanks nicht von Autoladegeräten trennen.

REGEL (EINE Datei automation/data/shopify_fein.json, je Elternklasse):
  «nicht» trifft → bleibt grob · sonst erste passende Titelregel → Unterklasse · keine Regel → bleibt grob.
  NUR Produkte, deren Shopify-Kategorie GENAU die Elternklasse ist (eine schon feine Klasse wird nie überschrieben).
  Google-Wert bleibt unverändert (kosmetik_fein.schreiben schreibt ihn gleich zurück). Ziel-IDs werden vor dem Schreiben gegen
  die Taxonomie des Shops geprüft (kategorie_fein.ids_pruefen). Kanarien je Klasse aus echten Titeln vor jedem Lauf.
  Neue Klasse = Block in der JSON-Datei, kein neues Skript.
Ledger dropship/_shopify_fein.tsv (pid, Stand, Google, Ziel, Zeit, Fehler, alt). Täglich im Aufseher (Kategorie-Kette) →
erfasst auch Neuimporte.

  python3 automation/shopify_fein.py --kanarien  ·  python3 automation/shopify_fein.py  ·  SCHARF=1 [NUR=aa-1-13] …
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

REGELN = os.path.join(HIER, "data", "shopify_fein.json")
LEDGER = os.path.join(REPO, "dropship", "_shopify_fein.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
NUR = {x for x in os.environ.get("NUR", "").split(",") if x}

_D = json.load(open(REGELN, encoding="utf-8"))["klassen"]
K = {cid: {"name": k["name"],
           "nicht": re.compile(k["nicht"], re.I) if k.get("nicht") else None,
           "regeln": [(re.compile(m, re.I), z) for m, z in k["regeln"]],
           "kanarien": k.get("kanarien", [])} for cid, k in _D.items()}


def ziel(cid, titel):
    k = K.get(cid)
    if not k:
        return None
    t = titel or ""
    if k["nicht"] and k["nicht"].search(t):
        return None
    for rx, z in k["regeln"]:
        if rx.search(t):
            return z
    return None


def kanarien():
    ok = n = 0
    for cid, k in K.items():
        for t, s in k["kanarien"]:
            ist = ziel(cid, t); n += 1; ok += ist == s
            if ist != s:
                print(f"  ✗ [{k['name']}] {t!r} → {ist} (soll {s})")
    print(f"SHOPIFY-FEIN-KANARIEN {ok}/{n}")
    return ok == n


def main():
    import kategorie_fein as kf
    import kosmetik_fein as kos
    if not kanarien():
        raise SystemExit("Kanarienvögel gescheitert — nichts geschrieben")
    kf.export_holen()
    try:
        erledigt = {(l.split("\t")[0], l.split("\t")[3]) for l in open(LEDGER, encoding="utf-8") if l.count("\t") >= 4}
    except OSError:
        erledigt = set()
    plan, st, bsp, alt = [], collections.Counter(), collections.defaultdict(list), {}
    for l in open(kf.EXPORT, encoding="utf-8"):
        p = json.loads(l)
        cid = ((p.get("category") or {}).get("id") or "").split("/")[-1]
        if cid not in K or (NUR and cid not in NUR):
            continue
        name = K[cid]["name"]
        st[(name, "grob")] += 1
        g = (p.get("metafield") or {}).get("value") or ""
        if not g:
            st[(name, "ohne-google")] += 1; continue
        sid = ziel(cid, p["title"])
        if not sid:
            st[(name, "bleibt")] += 1
            if len(bsp[(name, "—")]) < 8:
                bsp[(name, "—")].append(p["title"][:55])
            continue
        if (p["id"], sid) in erledigt:
            st[(name, "schon-im-ledger")] += 1; continue
        plan.append((p["id"], g, sid)); alt[p["id"]] = cid; st[(name, "plan")] += 1; st[("ziel", sid)] += 1
        if len(bsp[(name, sid)]) < 3:
            bsp[(name, sid)].append(p["title"][:55])
    gueltig = kf.ids_pruefen({x[2] for x in plan}) if plan else set()
    ungueltig = {x[2] for x in plan} - gueltig
    if ungueltig:
        print("⚠️ unbekannte Ziel-IDs (übersprungen):", sorted(ungueltig))
    plan = [x for x in plan if x[2] in gueltig]
    for cid, k in K.items():
        n = k["name"]
        if st[(n, "grob")]:
            print(f"  {n:32} grob {st[(n, 'grob')]:5} · Plan {st[(n, 'plan')]:5} · bleibt {st[(n, 'bleibt')]:5}"
                  f" · ohne Google {st[(n, 'ohne-google')]} · Ledger {st[(n, 'schon-im-ledger')]}")
    if os.environ.get("ZEIGEN"):
        for k, v in bsp.items():
            print(f"    {k[0]} → {k[1]}: {v}")
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), 25):
                for pid, s_, g_, sid, feh in kos.schreiben(plan[i:i + 25]):
                    f.write(f"{pid}\t{s_}\t{g_}\t{sid}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{feh}\t{alt.get(pid, '')}\n")
                    ok += s_ == "gesetzt"; fe += s_ == "fehler"
                f.flush()
                time.sleep(0.4)
    print(f"FERTIG: SHOPIFY-FEIN {len(plan)} geplant{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'}"
          f" · grob {sum(v for k, v in st.items() if k[1] == 'grob')} · bleibt {sum(v for k, v in st.items() if k[1] == 'bleibt')}")


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
