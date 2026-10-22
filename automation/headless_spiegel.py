#!/usr/bin/env python3
"""headless_spiegel.py — der Kanal «Luxe Style Headless» (die App) spiegelt den Onlineshop (22.10.2026, Betreiber-Screenshot «Schneidebretter · Kategorie nicht gefunden»).

ANLASS (GEMESSEN 22.10. ~09:40 UTC): Die App zeigt für «Schneidebretter» «Das hat nicht geklappt — Kategorie nicht gefunden». Die Kollektion existiert (75 Produkte,
im Onlineshop + 5 weiteren Kanälen), steht aber NICHT im Kanal «Luxe Style Headless» (App-Handle `headless-storefronts`) — eine App liest nur, was in IHREM Kanal steht.
Messung über alle 578 Kollektionen: 418 im Onlineshop, 540 im Headless-Kanal; 24 Kollektionen mit Ware im Onlineshop, aber nicht im Headless-Kanal (u. a. schneidebretter 75,
babykleidung 251, diamond-painting 209, abendkleider 117). Produkte: 8'265 aktive im Onlineshop ohne Headless-Kanal, UMGEKEHRT 0 — der Kanal ist eine verzögerte TEILMENGE
des Onlineshops. Ursache: die Importer und der Skill `shopify-publizieren` veröffentlichen auf eine feste Kanalliste (Onlineshop, Shop, TikTok, Facebook & Instagram,
Google & YouTube, Pinterest); der Headless-Kanal stand nie darauf, seine 540/578 stammen aus einem früheren Sammel-Veröffentlichen.

REGEL: Was im Onlineshop veröffentlicht ist (Kollektion; Produkt zusätzlich ACTIVE), muss auch im Headless-Kanal stehen. Dieser Läufer holt das täglich nach — er erfasst damit
auch NEUE Importe, ohne dass jeder Importer geändert werden muss. Nie angefasst: Produkte der Werbetest-Sperre (`werbetest_sperre.gesperrt`, bis 24.10.), DRAFT/ARCHIVED,
alles, was nicht im Onlineshop steht (der Kanal hat 146 Kollektionen, die nur dort stehen — das ist kein Befund und wird nicht verändert).
Rückweg: Ledger dropship/_headless_spiegel.tsv (Zeit, Art, ID, Handle) → `publishableUnpublish` für die Zeilen.

  python3 automation/headless_spiegel.py              TROCKEN: misst Lücke (Kollektionen + Produkte), schreibt Stand dropship/_headless_spiegel_stand.json
  python3 automation/headless_spiegel.py --scharf     veröffentlicht (MAX=n Produkte je Lauf, Standard 4000; Kollektionen immer alle)
  python3 automation/headless_spiegel.py --selbsttest
Aufruf: Aufseher täglich (fixer_keepalive.sh); Ampel «HEADLESS» (betreiber_ampel.py) über zeile().
"""
import datetime as dt, json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
STAND = os.path.join(REPO, "dropship", "_headless_spiegel_stand.json")
LEDGER = os.path.join(REPO, "dropship", "_headless_spiegel.tsv")
STALE_H = 36
SCHWELLE_PRODUKTE = 300      # darunter ist es der Tageszugang neuer Ware, kein Befund
MAX_PRODUKTE = int(os.environ.get("MAX", "4000"))
BATCH = 20
ARBEITER = int(os.environ.get("ARBEITER", "3"))


def waehle(luecke, gesperrt):
    """Reine Entscheidung: aus der Lücke (Liste {id,handle}) fliegen gesperrte Einträge raus. → (zu_veroeffentlichen, uebersprungen)."""
    ok, skip = [], []
    for x in luecke:
        (skip if gesperrt(x.get("id") or x.get("handle")) or gesperrt(x.get("handle")) else ok).append(x)
    return ok, skip


def kanaele(g):
    n = g("{publications(first:30){nodes{id name app{handle}}}}")["publications"]["nodes"]
    os_ = [p["id"] for p in n if (p.get("app") or {}).get("handle") == "online_store"]
    hl = [p["id"] for p in n if (p.get("app") or {}).get("handle") == "headless-storefronts"]
    if len(os_) != 1 or len(hl) != 1:
        raise RuntimeError(f"Kanäle nicht eindeutig: Onlineshop {os_}, Headless {hl} — nichts getan")
    return os_[0], hl[0]


def pid_num(gid):
    return gid.rsplit("/", 1)[-1]


def luecke_kollektionen(g, os_id, hl_id):
    out, after = [], None
    while True:
        d = g("""query($a:String,$os:ID!,$hl:ID!){collections(first:100,after:$a){nodes{id handle productsCount{count}
          os:publishedOnPublication(publicationId:$os) hl:publishedOnPublication(publicationId:$hl)}
          pageInfo{hasNextPage endCursor}}}""", {"a": after, "os": os_id, "hl": hl_id})["collections"]
        out += [{"id": c["id"], "handle": c["handle"], "n": c["productsCount"]["count"]} for c in d["nodes"] if c["os"] and not c["hl"]]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        after = d["pageInfo"]["endCursor"]


def luecke_produkte(g, os_id, hl_id, grenze):
    q = f"status:active AND publication_ids:{pid_num(os_id)} AND NOT publication_ids:{pid_num(hl_id)}"
    out, after = [], None
    while len(out) < grenze:
        d = g("query($a:String,$q:String){products(first:250,after:$a,query:$q){nodes{id handle} pageInfo{hasNextPage endCursor}}}", {"a": after, "q": q})["products"]
        out += [{"id": p["id"], "handle": p["handle"]} for p in d["nodes"]]
        if not d["pageInfo"]["hasNextPage"]:
            break
        after = d["pageInfo"]["endCursor"]
    gesamt = g("query($q:String){productsCount(query:$q,limit:null){count}}", {"q": q})["productsCount"]["count"]
    return out, gesamt


def veroeffentlichen(g, hl_id, art, eintraege):
    """Veröffentlicht in Paketen zu BATCH Einträgen; ARBEITER Pakete gleichzeitig (der Server arbeitet die Aliase eines Pakets nacheinander ab —
    22.10.: ~100 Produkte/Minute mit einem Arbeiter, 8'000 Produkte = 80 Minuten und damit länger als ein Container lebt)."""
    import threading
    from concurrent.futures import ThreadPoolExecutor
    sperre = threading.Lock()
    summe = {"ok": 0, "fehl": 0}
    fehler = []

    def paket(teil):
        m = "mutation{" + " ".join(
            f'p{j}:publishablePublish(id:"{x["id"]}",input:[{{publicationId:"{hl_id}"}}]){{userErrors{{message}}}}' for j, x in enumerate(teil)) + "}"
        d = g(m)
        with sperre:
            with open(LEDGER, "a", encoding="utf-8") as f:
                for j, x in enumerate(teil):
                    e = (d.get(f"p{j}") or {}).get("userErrors") or []
                    if e:
                        summe["fehl"] += 1
                        fehler.append(f"{x['handle']}: {e[0]['message'][:80]}")
                    else:
                        summe["ok"] += 1
                        f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%M:%SZ}\t{art}\t{x['id']}\t{x['handle']}\n")
        time.sleep(0.2)

    pakete = [eintraege[i:i + BATCH] for i in range(0, len(eintraege), BATCH)]
    with ThreadPoolExecutor(max_workers=ARBEITER) as ex:
        list(ex.map(paket, pakete))
    return summe["ok"], summe["fehl"], fehler


def schreibe_stand(s):
    tmp = STAND + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(s, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)


def zeile(jetzt=None, pfad=None):
    """Ampel: leer = in Ordnung / nie gelaufen; ⚠️ bei Lücke über Schwelle (Kollektionen > 0 oder Produkte > 300) oder Stand älter als 36 h."""
    p = pfad or STAND
    if not os.path.exists(p):
        return ""
    try:
        s = json.load(open(p, encoding="utf-8"))
        alter = ((jetzt or dt.datetime.utcnow()) - dt.datetime.strptime(s["gemessen"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:
        return "⚠️ HEADLESS: Stand unlesbar (dropship/_headless_spiegel_stand.json)"
    kk, kp = int(s.get("kollektionen_luecke", 0)), int(s.get("produkte_luecke", 0))
    if kk > 0 or kp > SCHWELLE_PRODUKTE:
        return (f"⚠️ HEADLESS: App-Kanal hinkt dem Onlineshop nach — {kk} Kollektionen, {kp} Produkte nicht im Kanal «Luxe Style Headless» "
                f"(App zeigt «Kategorie nicht gefunden») → python3 automation/headless_spiegel.py --scharf")
    if alter > STALE_H:
        return f"⚠️ HEADLESS: seit {alter:.0f} h nicht gemessen (Takt 24 h)"
    return ""


def main():
    scharf = "--scharf" in sys.argv
    from lux_assistent import _gql
    from werbetest_sperre import gesperrt
    g = _gql()
    os_id, hl_id = kanaele(g)
    kolls = luecke_kollektionen(g, os_id, hl_id)
    prods, p_gesamt = luecke_produkte(g, os_id, hl_id, MAX_PRODUKTE if scharf else 500)
    k_ok, k_skip = waehle(kolls, gesperrt)
    p_ok, p_skip = waehle(prods, gesperrt)
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}: Lücke Kollektionen {len(kolls)} · Produkte {p_gesamt} (Lauf holt {len(p_ok)}, Werbetest-Sperre übersprungen {len(p_skip)}) · {'SCHARF' if scharf else 'TROCKEN'}")
    stand = {"gemessen": f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", "kollektionen_luecke": len(kolls), "produkte_luecke": p_gesamt,
             "veroeffentlicht_kollektionen": 0, "veroeffentlicht_produkte": 0, "uebersprungen_sperre": len(p_skip) + len(k_skip)}
    if scharf:
        a, f1, e1 = veroeffentlichen(g, hl_id, "kollektion", k_ok)
        b, f2, e2 = veroeffentlichen(g, hl_id, "produkt", p_ok)
        stand.update(veroeffentlicht_kollektionen=a, veroeffentlicht_produkte=b,
                     kollektionen_luecke=len(kolls) - a, produkte_luecke=max(0, p_gesamt - b), fehler=(e1 + e2)[:10])
        print(f"FERTIG: Kollektionen {a} veröffentlicht ({f1} Fehler), Produkte {b} ({f2} Fehler)" + (f" — {(e1 + e2)[:3]}" if (e1 or e2) else ""))
    schreibe_stand(stand)
    print(zeile() or "OK")
    return 0


def selbsttest():
    import tempfile
    fehler = []
    ok = lambda b, t: b or fehler.append(t)
    sperre = lambda x: str(x) in {"gid://shopify/Product/9", "geschenk-1"}
    z = [{"id": "gid://shopify/Product/1", "handle": "a"}, {"id": "gid://shopify/Product/9", "handle": "b"}, {"id": "gid://shopify/Product/2", "handle": "geschenk-1"}]
    a, s = waehle(z, sperre)
    ok([x["handle"] for x in a] == ["a"] and len(s) == 2, f"Sperre über ID und Handle ({a}/{s})")
    ok(waehle([], sperre) == ([], []), "leere Lücke")
    ok(pid_num("gid://shopify/Publication/391626359175") == "391626359175", "pid_num")
    tmp = os.path.join(tempfile.mkdtemp(), "s.json")
    jetzt = dt.datetime(2026, 10, 22, 12, 0)
    ok(zeile(jetzt, tmp) == "", "ohne Stand: leer")
    json.dump({"gemessen": "2026-10-22T09:00Z", "kollektionen_luecke": 0, "produkte_luecke": 120}, open(tmp, "w"))
    ok(zeile(jetzt, tmp) == "", "Tageszugang 120 unter Schwelle: leer")
    json.dump({"gemessen": "2026-10-22T09:00Z", "kollektionen_luecke": 0, "produkte_luecke": 8265}, open(tmp, "w"))
    ok("HEADLESS" in zeile(jetzt, tmp) and "8265" in zeile(jetzt, tmp), "8265 Produkte → ⚠️")
    json.dump({"gemessen": "2026-10-22T09:00Z", "kollektionen_luecke": 1, "produkte_luecke": 0}, open(tmp, "w"))
    ok("1 Kollektionen" in zeile(jetzt, tmp), "eine Kollektion fehlt → ⚠️")
    json.dump({"gemessen": "2026-10-20T09:00Z", "kollektionen_luecke": 0, "produkte_luecke": 0}, open(tmp, "w"))
    ok("nicht gemessen" in zeile(jetzt, tmp), "Stand 51 h alt → ⚠️")
    open(tmp, "w").write("kaputt")
    ok("unlesbar" in zeile(jetzt, tmp), "kaputter Stand → ⚠️")
    if fehler:
        print("SELBSTTEST FEHLER:\n  " + "\n  ".join(fehler))
        return 1
    print("SELBSTTEST OK (Sperre ID+Handle, Schwelle, Stand alt/kaputt)")
    return 0


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
