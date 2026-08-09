"""Prueft JEDE Kollektion so, wie ein Kunde sie sieht: echter Abruf der Live-URL.

⚠️ METHODEN-LEHRE (2026-08-09): Ein erster Anlauf prüfte nur den Seitentext auf
«Keine Produkte gefunden» — und meldete drei unveroeffentlichte Kollektionen als «zeigt Ware»,
weil Shopifys 404-Seite diesen Text nicht enthaelt. **Ohne HTTP-Statuscode ist der Test wertlos.**
Ebenso taeuscht der Admin: `productsCount` zaehlt Entwuerfe mit und hinkt Regeländerungen
hinterher. Die Wahrheit ist allein die ausgelieferte Seite.

Drei Zustaende:
  200 + Produkte      -> ok
  200 + keine Ware    -> TOTE SEITE (Kunde landet auf einer leeren Kategorie)  ← das ist der Fehler
  404                 -> unveroeffentlicht, aber ggf. noch im Menue verlinkt   ← separat pruefen

Seriell mit Pause: parallele Abrufe liefen frueher in Shopifys 429-Drossel und erzeugten
25 Phantom-Fehler.
Resumable ueber /tmp/colllive_done.txt.
"""
import json, subprocess, os, re, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
PX = os.environ.get("HTTPS_PROXY", "")
PAUSE = float(os.environ.get("PAUSE", "1.5"))
OUT = "dropship/_coll_live_check.txt"


def gql(q, v=None):
    r = subprocess.run(["curl", "-s", "--max-time", "50",
                        "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                        "-H", "X-Shopify-Access-Token: " + TOK,
                        "-H", "Content-Type: application/json",
                        "-d", json.dumps({"query": q, "variables": v or {}})],
                       capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {}


def alle_handles():
    cur, out = None, []
    while True:
        d = gql('query($c:String){collections(first:200,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{handle title}}}', {"c": cur})
        pg = (d.get("data") or {}).get("collections")
        if not pg:
            break
        out += [(c["handle"], c["title"]) for c in pg["nodes"]]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    return out


def pruefe(handle):
    # -L: Weiterleitungen folgen. Ein 301 ist per se kein Fehler — entscheidend ist, wo er
    # landet. Ohne -L wuerde jede umbenannte Kollektion faelschlich als Problem gemeldet.
    r = subprocess.run(["curl", "-sL", "--max-time", "30", "-x", PX,
                        "-o", "/tmp/_cl.html", "-w", "%{http_code}\t%{url_effective}",
                        f"https://luxestyle.ch/collections/{handle}"],
                       capture_output=True, text=True)
    code, _, ziel = (r.stdout or "").strip().partition("\t")
    if ziel and f"/collections/{handle}" not in ziel:
        # Weiterleitung auf etwas anderes — nur ein Problem, wenn es auf der Startseite endet
        if re.fullmatch(r'https?://[^/]+/?', ziel):
            return "weiterleitung-auf-startseite", 0
    try:
        h = open("/tmp/_cl.html", encoding="utf-8", errors="ignore").read()
    except Exception:
        h = ""
    if code == "404":
        return "unveroeffentlicht", 0
    if code != "200":
        return f"http-{code}", 0
    # Die 404-Vorlage verlinkt selbst 4 Empfehlungen -> Produktzahl allein reicht nicht,
    # darum zusaetzlich auf den Leer-Text pruefen.
    if "Keine Produkte gefunden" in h:
        return "TOTE-SEITE", 0
    n = len(set(re.findall(r'/products/([a-z0-9-]+)', h)))
    return ("ok", n) if n else ("TOTE-SEITE", 0)


def main():
    done = set()
    if os.path.exists(OUT):
        done = {l.split("\t")[0] for l in open(OUT)}
    f = open(OUT, "a")
    handles = alle_handles()
    print(f"{len(handles)} Kollektionen | schon geprüft {len(done)}", flush=True)
    zst = {}
    for i, (h, t) in enumerate(handles, 1):
        if h in done:
            continue
        st, n = pruefe(h)
        zst[st] = zst.get(st, 0) + 1
        f.write(f"{h}\t{st}\t{n}\t{t}\n"); f.flush()
        if st == "TOTE-SEITE":
            print(f"  ⛔ leere Kategorieseite: /collections/{h}  «{t[:40]}»", flush=True)
        elif st.startswith("http-"):
            print(f"  ⚠️ {st}: /collections/{h}", flush=True)
        if i % 100 == 0:
            print(f"  … {i}/{len(handles)} | {zst}", flush=True)
        time.sleep(PAUSE)
    print(f"FERTIG: {zst}")


if __name__ == "__main__":
    main()
