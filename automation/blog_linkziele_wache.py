#!/usr/bin/env python3
"""blog_linkziele_wache.py — misst die internen Linkziele aller Blogartikel AM URSPRUNG (Admin-API), nicht am Cache.

WARUM (05.10.2026, Fix-12h Punkt 18): `blog_tote_links.py` prueft jedes Ziel mit curl gegen luxestyle.ch. Von unserer
Rechenzentrums-IP liefert Shopify aber eine stundenalte Bot-Cache-Kopie (CLAUDE.md 19.08.) — ein 404 kann veraltet
sein (Produkt inzwischen aktiv), ein 200 ebenso (Produkt inzwischen Entwurf). Die Wahrheit steht in der Admin-API:
  Produkt   tot  = fehlt ODER status != ACTIVE ODER nicht im Online Store veroeffentlicht — und KEIN Redirect vom Pfad
  Kollektion tot = fehlt ODER nicht im Online Store veroeffentlicht — und kein Redirect; /collections/all ist eingebaut
Ausgabe: Ampel-Zeile «BLOG-LINKS: N tote Ziele in M Artikeln (P Produkte, K Kollektionen) · Z Ziele geprueft»
und JSON nach $AUSGABE (Standard /tmp/blog_linkziele.json) mit je Ziel: zustand, grund, redirect, artikel, ersatz-Kandidat
(fuer gedraftete Produkte: ihre veroeffentlichten Kollektionen, groesste zuerst).
Bei Fehler «BLOG-LINKS: unklar (…)», nie «0». Exit 0.
"""
import json, os, re, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # Eimer-Etikette inklusive

ONLINE_STORE = "gid://shopify/Publication/301970915713"
AUSGABE = os.environ.get("AUSGABE", "/tmp/blog_linkziele.json")
# 05.10. Nachbesserung (Pruefer): 49 Links in den Artikeln sind ABSOLUT (href="https://luxestyle.ch/…"), einer davon
# war echt tot und wurde von der relativen Regex uebersehen → optionaler Host-Praefix, Pfad bleibt die Gruppe.
HREF_RE = re.compile(r'href="(?:https?://(?:www\.)?luxestyle\.ch)?(/(?:products|collections)/[^"#?]+)')


def lade_artikel():
    Q = """query($c:String){articles(first:50,after:$c){pageInfo{hasNextPage endCursor}
           nodes{id handle title body blog{handle}}}}"""
    out, c = [], None
    while True:
        d = gql(Q, {"c": c})["articles"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    return out


def ziele_sammeln(arts):
    ziele = {}
    for a in arts:
        for href in HREF_RE.findall(a.get("body") or ""):
            p = href.rstrip("/")
            ziele.setdefault(p, set()).add(a["handle"])
    return ziele


def pruefe_produkte(handles):
    """handle -> dict(zustand, status, veroeffentlicht, titel, kollektionen[])"""
    aus = {}
    Q_TEIL = """ p%d: productByIdentifier(identifier:{handle:$h%d}){ id title status
                   publishedOnPublication(publicationId:$pub)
                   collections(first:12){nodes{handle title productsCount{count} publishedOnPublication(publicationId:$pub)}} }"""
    hs = list(handles)
    for i in range(0, len(hs), 10):
        teil = hs[i:i + 10]
        vars_ = {"pub": ONLINE_STORE}
        q = "query($pub:ID!," + ",".join(f"$h{j}:String!" for j in range(len(teil))) + "){"
        for j, h in enumerate(teil):
            q += Q_TEIL % (j, j)
            vars_[f"h{j}"] = urllib.parse.unquote(h)
        q += "}"
        d = gql(q, vars_)
        for j, h in enumerate(teil):
            p = d.get(f"p{j}")
            if not p:
                aus[h] = {"zustand": "fehlt"}
                continue
            tot = p["status"] != "ACTIVE" or not p["publishedOnPublication"]
            kolls = sorted([{"handle": k["handle"], "titel": k["title"], "n": k["productsCount"]["count"]}
                            for k in p["collections"]["nodes"] if k["publishedOnPublication"] and k["productsCount"]["count"] >= 4],
                           key=lambda k: -k["n"])
            aus[h] = {"zustand": "tot" if tot else "ok", "status": p["status"], "veroeffentlicht": bool(p["publishedOnPublication"]),
                      "titel": p["title"], "kollektionen": kolls}
    return aus


def pruefe_kollektionen(handles):
    """handles koennen eine Filterroute sein: «<kollektion>/<tag>» (Shopify zeigt die Kollektion gefiltert nach Tag;
    gemessen 05.10.: /collections/ft-pluesch/ch-lager = 221 Artikel live). Lebendig, wenn Kollektion veroeffentlicht
    UND mindestens ein aktives Produkt den Tag traegt (Schnittmenge ist am Ursprung nicht direkt zaehlbar)."""
    aus = {}
    filter_ = {h: h.split("/", 1) for h in handles if "/" in h}
    basis = {urllib.parse.unquote(k) for k, _ in filter_.values()}
    tags = {urllib.parse.unquote(t) for _, t in filter_.values()}
    tag_n = {}
    for t in tags:
        tag_n[t] = gql('query($q:String){productsCount(query:$q){count}}', {"q": f"tag:{t} status:active"})["productsCount"]["count"]
    hs = [h for h in handles if h != "all" and "/" not in h] + sorted(basis - set(handles))
    for i in range(0, len(hs), 10):
        teil = hs[i:i + 10]
        vars_ = {"pub": ONLINE_STORE}
        q = "query($pub:ID!," + ",".join(f"$h{j}:String!" for j in range(len(teil))) + "){"
        for j, h in enumerate(teil):
            q += " c%d: collectionByHandle(handle:$h%d){ id title productsCount{count} publishedOnPublication(publicationId:$pub) }" % (j, j)
            vars_[f"h{j}"] = urllib.parse.unquote(h)
        q += "}"
        d = gql(q, vars_)
        for j, h in enumerate(teil):
            c = d.get(f"c{j}")
            if not c:
                aus[h] = {"zustand": "fehlt"}
                continue
            aus[h] = {"zustand": "ok" if c["publishedOnPublication"] else "tot", "veroeffentlicht": bool(c["publishedOnPublication"]),
                      "titel": c["title"], "n": c["productsCount"]["count"]}
    if "all" in handles:
        aus["all"] = {"zustand": "ok", "titel": "(eingebaute Route)", "n": None}
    for h, (koll, tag) in filter_.items():
        k = aus.get(urllib.parse.unquote(koll)) or {"zustand": "fehlt"}
        n_tag = tag_n.get(urllib.parse.unquote(tag), 0)
        lebt = k["zustand"] == "ok" and n_tag > 0
        aus[h] = {"zustand": "ok" if lebt else ("fehlt" if k["zustand"] == "fehlt" else "tot"),
                  "titel": f"{k.get('titel', '?')} · Tag-Filter «{tag}» ({n_tag} aktive mit Tag, Schnittmenge nur live zaehlbar)",
                  "n": k.get("n"), "filterroute": True}
    return aus


def redirects(pfade):
    """Pfad -> Zielpfad, falls ein Redirect existiert (ein 301 ist eine funktionierende Verlinkung)."""
    aus = {}
    for i in range(0, len(pfade), 10):
        teil = pfade[i:i + 10]
        q = "query(" + ",".join(f"$q{j}:String!" for j in range(len(teil))) + "){"
        vars_ = {}
        for j, p in enumerate(teil):
            q += " r%d: urlRedirects(first:1,query:$q%d){nodes{path target}}" % (j, j)
            vars_[f"q{j}"] = f"path:{p}"
        q += "}"
        d = gql(q, vars_)
        for j, p in enumerate(teil):
            for n in d[f"r{j}"]["nodes"]:
                if n["path"].rstrip("/").lower() == p.lower() or n["path"].rstrip("/").lower() == urllib.parse.unquote(p).lower():
                    aus[p] = n["target"]
    return aus


def main():
    t0 = time.time()
    arts = lade_artikel()
    ziele = ziele_sammeln(arts)
    prod_h = {p.split("/products/")[1] for p in ziele if p.startswith("/products/")}
    koll_h = {p.split("/collections/")[1] for p in ziele if p.startswith("/collections/")}
    prod = pruefe_produkte(prod_h)
    koll = pruefe_kollektionen(koll_h)
    tote = {}
    for p, arts_ in ziele.items():
        if p.startswith("/products/"):
            info = prod[p.split("/products/")[1]]
        else:
            info = koll[p.split("/collections/")[1]]
        if info["zustand"] != "ok":
            tote[p] = dict(info, artikel=sorted(arts_))
    rd = redirects(sorted(tote)) if tote else {}
    for p in list(tote):
        if p in rd:
            tote[p]["redirect"] = rd[p]
            tote[p]["zustand"] = "redirect"      # funktioniert fuer Besucher
    echt_tot = {p: v for p, v in tote.items() if v["zustand"] != "redirect"}
    art_tot = {h for v in echt_tot.values() for h in v["artikel"]}
    n_p = sum(1 for p in echt_tot if p.startswith("/products/"))
    n_k = len(echt_tot) - n_p
    # Fix-12h Punkt 18, zweites Fertig-Kriterium: Artikel ohne einen einzigen (lebenden) Produktlink
    ohne_produktlink = sorted(a["handle"] for a in arts
                              if not any(h.startswith("/products/") and h.rstrip("/") not in echt_tot
                                         for h in HREF_RE.findall(a.get("body") or "")))
    json.dump({"stand": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "artikel": len(arts), "ziele": len(ziele),
               "tote": echt_tot, "mit_redirect": {p: v for p, v in tote.items() if v["zustand"] == "redirect"},
               "ohne_produktlink": ohne_produktlink},
              open(AUSGABE, "w"), ensure_ascii=False, indent=1)
    print(f"BLOG-LINKS: {len(echt_tot)} tote Ziele in {len(art_tot)} Artikeln ({n_p} Produkte, {n_k} Kollektionen) "
          f"· {len(ziele)} Ziele in {len(arts)} Artikeln geprueft · {len(rd)} per Redirect lebendig "
          f"· {len(ohne_produktlink)} Artikel ohne Produktlink · {int(time.time() - t0)} s")
    print(f"FERTIG: Details {AUSGABE}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"BLOG-LINKS: unklar ({type(e).__name__}: {str(e)[:140]})")
        print("FERTIG: abgebrochen")
    sys.exit(0)
