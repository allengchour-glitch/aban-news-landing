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
  Geschrieben wird NUR die Shopify-Kategorie; der Google-Wert bleibt unberührt (auch leer, z. B. Kostüme). Ziel-IDs werden vor dem Schreiben gegen
  die Taxonomie des Shops geprüft (kategorie_fein.ids_pruefen). Kanarien je Klasse aus echten Titeln vor jedem Lauf.
  Neue Klasse = Block in der JSON-Datei, kein neues Skript.
Ledger dropship/_shopify_fein.tsv (pid, Stand, Google, Ziel, Zeit, Fehler, alt). Täglich im Aufseher (Kategorie-Kette) →
erfasst auch Neuimporte.

  python3 automation/shopify_fein.py --kanarien  ·  python3 automation/shopify_fein.py  ·  SCHARF=1 [NUR=aa-1-13] [BULK=1] …
Schreibweg: ab 200 Produkten (oder BULK=1) eine Bulk-Mutation productUpdate(category) — kostet keinen Eimer; gemessen 08.10.:
einzeln 20/min neben einem Lese-Scan (Eimer ~120/2000), Bulk 109 in ~2 min. Darunter 10er-Chargen (CHARGE).
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

REGELN = os.path.join(HIER, "data", "shopify_fein.json")
LEDGER = os.path.join(REPO, "dropship", "_shopify_fein.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
NUR = {x for x in os.environ.get("NUR", "").split(",") if x}
# 08.10.: 25 je Anfrage kam neben einem Lese-Scan (textbild_fix, Eimer ~120/2000) 6 min lang nicht durch → kleinere Charge
CHARGE = int(os.environ.get("CHARGE", "10"))

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


def kat_schreiben(charge):
    """Nur die Shopify-Kategorie (Google bleibt unberührt, auch wenn leer): aliasierte productUpdate, Rücklesen aus der Antwort."""
    from kaufwille_zeile import gql
    teile = [f'p{i}: productUpdate(product:{{id:"{pid}", category:"gid://shopify/TaxonomyCategory/{sid}"}})'
             f'{{product{{id category{{id}}}} userErrors{{message}}}}' for i, (pid, _, sid) in enumerate(charge)]
    r = gql("mutation{" + " ".join(teile) + "}")
    aus = []
    for i, (pid, g, sid) in enumerate(charge):
        x = r.get(f"p{i}") or {}
        cat = ((x.get("product") or {}).get("category") or {}).get("id", "")
        fehler = "; ".join(e["message"] for e in (x.get("userErrors") or []))[:120]
        aus.append((pid, "gesetzt" if cat.endswith("/" + sid) and not fehler else "fehler", g, sid, fehler))
    return aus


def bulk_schreiben(plan, alt):
    """08.10.: Massenweg ohne Eimer — stagedUpload JSONL → bulkOperationRunMutation productUpdate(category).
    Verfolgt den EIGENEN Lauf über node(id:) (Lehre 07.10. «fremder-bulk»), liest jede Ergebniszeile zurück.
    Google-Wert wird nicht angefasst. Gibt (gesetzt, fehler) und schreibt das Ledger."""
    import subprocess
    from kaufwille_zeile import gql
    os.makedirs("/tmp/shopify_fein", exist_ok=True)
    pfad = "/tmp/shopify_fein/plan.jsonl"
    with open(pfad, "w", encoding="utf-8") as fh:
        for pid, _, sid in plan:
            fh.write(json.dumps({"product": {"id": pid, "category": "gid://shopify/TaxonomyCategory/" + sid}}) + "\n")
    st = gql('mutation{stagedUploadsCreate(input:[{resource:BULK_MUTATION_VARIABLES,filename:"shopify_fein.jsonl",'
             'mimeType:"text/jsonl",httpMethod:POST}]){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}')
    t = st["stagedUploadsCreate"]["stagedTargets"][0]
    form = []
    for q in t["parameters"]:
        form += ["-F", f"{q['name']}={q['value']}"]
    key = next(q["value"] for q in t["parameters"] if q["name"] == "key")
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "600", "-X", "POST", t["url"]]
                       + form + ["-F", f"file=@{pfad}"], capture_output=True, text=True)
    if r.stdout.strip() not in ("200", "201", "204"):
        raise RuntimeError(f"Upload HTTP {r.stdout}")
    for _ in range(360):   # nur EINE Bulk-Mutation je App gleichzeitig — eine laufende (eigene/fremde) abwarten, nie abbrechen
        c = gql('{currentBulkOperation(type:MUTATION){status}}')["currentBulkOperation"]
        if not c or c["status"] not in ("CREATED", "RUNNING", "CANCELING"):
            break
        time.sleep(10)
    m = gql('mutation($p:String!){bulkOperationRunMutation(mutation:"mutation call($product: ProductUpdateInput!) { productUpdate(product: $product) '
            '{ product { id category { id } } userErrors { message } } }",stagedUploadPath:$p){bulkOperation{id status} userErrors{message}}}', {"p": key})
    if m["bulkOperationRunMutation"]["userErrors"]:
        raise RuntimeError(f"Bulk nicht gestartet: {m['bulkOperationRunMutation']['userErrors']}")
    bid = m["bulkOperationRunMutation"]["bulkOperation"]["id"]
    print(f"BULK gestartet {bid} · {len(plan)} Produkte", flush=True)
    for _ in range(720):
        n = gql('query($i:ID!){node(id:$i){... on BulkOperation{status objectCount url errorCode}}}', {"i": bid})["node"]
        if n["status"] not in ("CREATED", "RUNNING", "CANCELING"):
            break
        time.sleep(10)
    print(f"BULK {n['status']} · {n.get('objectCount')} Objekte · {n.get('errorCode') or ''}", flush=True)
    soll = {pid: sid for pid, _, sid in plan}
    google = {pid: g for pid, g, _ in plan}
    ok = fe = 0
    gesehen = set()
    out = subprocess.run(["curl", "-sL", "--max-time", "600", n["url"]], capture_output=True, text=True).stdout if n.get("url") else ""
    with open(LEDGER, "a", encoding="utf-8") as f:
        for z in out.splitlines():
            d = json.loads(z)
            pu = ((d.get("data") or {}).get("productUpdate") or {})
            pr = pu.get("product") or {}
            pid = pr.get("id") or ""
            cat = ((pr.get("category") or {}).get("id") or "").split("/")[-1]
            ue = "; ".join(e.get("message", "") for e in (pu.get("userErrors") or []))[:120] or str(d.get("errors") or "")[:120]
            if not pid:
                fe += 1; continue
            gesehen.add(pid)
            gut = cat == soll.get(pid) and not ue
            ok += gut; fe += not gut
            f.write(f"{pid}\t{'gesetzt' if gut else 'fehler'}\t{google.get(pid, '')}\t{soll.get(pid, '')}\t"
                    f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{ue}\t{alt.get(pid, '')}\n")
    fehlend = len(soll) - len(gesehen)
    if fehlend:
        print(f"⚠️ {fehlend} Produkte ohne Ergebniszeile (nicht im Ledger — nächster Lauf nimmt sie wieder)")
    return ok, fe


def main():
    import kategorie_fein as kf
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
        g = (p.get("metafield") or {}).get("value") or ""   # nur fürs Ledger — geschrieben wird allein die Shopify-Kategorie
        if not g:
            st[(name, "ohne-google")] += 1                     # 08.10.: Kostüme sind bewusst ohne Google-Kanal → trotzdem verfeinern
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
    if SCHARF and plan and (os.environ.get("BULK") == "1" or len(plan) >= 200):   # ab 200: Bulk (Eimer frei für andere)
        ok, fe = bulk_schreiben(plan, alt)
    elif SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as f:
            for i in range(0, len(plan), CHARGE):
                for pid, s_, g_, sid, feh in kat_schreiben(plan[i:i + CHARGE]):
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
