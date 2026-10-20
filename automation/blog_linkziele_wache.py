#!/usr/bin/env python3
"""blog_linkziele_wache.py — misst die internen Linkziele aller Blogartikel AM URSPRUNG (Admin-API), nicht am Cache.

WARUM (05.10.2026, Fix-12h Punkt 18): `blog_tote_links.py` prueft jedes Ziel mit curl gegen luxestyle.ch. Von unserer
Rechenzentrums-IP liefert Shopify aber eine stundenalte Bot-Cache-Kopie (CLAUDE.md 19.08.) — ein 404 kann veraltet
sein (Produkt inzwischen aktiv), ein 200 ebenso (Produkt inzwischen Entwurf). Die Wahrheit steht in der Admin-API:
  Produkt    tot = fehlt ODER status != ACTIVE ODER nicht im Online Store veroeffentlicht
  Kollektion tot = fehlt ODER nicht im Online Store veroeffentlicht; /collections/all ist eingebaut
  Seite      tot = fehlt ODER nicht veroeffentlicht;  Blogartikel tot = fehlt ODER nicht veroeffentlicht (aus den geladenen Artikeln)
  «tot» MIT Redirect vom Pfad = UMGELEITET (Besucher landen per 301 am Ziel — aber Google/Linkkraft laufen den Umweg).

19.10.2026 (Betreiber «verbessere mehr sichtbarkeit»): BLINDFLECK behoben. Bis dahin zaehlte ein Redirect als «lebendig» («ein 301 ist eine
funktionierende Verlinkung») und tauchte in der Ampel nie auf — GEMESSEN 19.10. 21:25 UTC: 22 umgeleitete Ziele in 49 Artikeln (18 Kollektionen,
4 Produkte), die die Ampel nicht zeigte, dazu 16 tote Produkt-Ziele, die sie zwar zaehlte («⚠️ Hand-Zuordnung»), fuer die es aber keinen
Reparaturweg gab. Jetzt: beides getrennt gezaehlt, /pages/ und /blogs/ mitgeprueft, einfache Anfuehrungszeichen und HREF in Grossbuchstaben
erkannt, Reparatur = `automation/ratgeber_links_reparieren.py` (Liste alt→neu, trocken/scharf/zurueck).

Ausgabe (immer Zeile 1): «RATGEBER-LINKS: N tot · M umgeleitet (A Artikel, L Links)»; Zeile 2 «RATGEBER-DETAIL: …»; JSON nach $AUSGABE
(Standard /tmp/blog_linkziele.json) mit je Ziel: zustand, grund, redirect, artikel, ersatz-Kandidat (fuer gedraftete Produkte: ihre
veroeffentlichten Kollektionen, groesste zuerst) — Schluessel «tote», «mit_redirect» (Altname, unveraendert), «ohne_produktlink».
Bei Fehler «RATGEBER-LINKS: unklar (…)», nie «0». Exit 0.
Schalter: nur `--selbsttest` (Mutationspruefung mit Positiv-Kanarienvoegeln, offline + live; Exit 1 bei Fehler). Jeder andere Schalter bricht
mit Exit 2 ab — ein unbekannter Schalter startet NIE einen Lauf.
"""
import argparse, html, json, os, re, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # Eimer-Etikette inklusive

ONLINE_STORE = "gid://shopify/Publication/301970915713"
AUSGABE = os.environ.get("AUSGABE", "/tmp/blog_linkziele.json")
# 05.10. Nachbesserung (Pruefer): 49 Links in den Artikeln sind ABSOLUT (href="https://luxestyle.ch/…"), einer davon
# war echt tot und wurde von der relativen Regex uebersehen → optionaler Host-Praefix, Pfad bleibt die Gruppe.
# 19.10.: auch /pages/ und /blogs/, einfache Anfuehrungszeichen, HREF gross, «www.», protokollrelative «//»-Links.
# 20.10. (Pruefer-Befund 19.10.: 4 von 12 Mutationen unentdeckt → «0 tot» waere gruen geblieben): auch href OHNE Anfuehrungszeichen,
# HTML-Entities im href (&#x2F;, &#47;, &sol;), Gross-/Kleinschreibung des ersten Pfadsegments (/Products/) und Sprachpraefix
# (/en/products/…, /fr/collections/…, /de-ch/…; genau 2 Buchstaben, optional «-xx»).
LINK_RE = re.compile(r'''href\s*=\s*(?:(["'])|(?=[^\s"'>]))(?:(?:https?:)?//(?:www\.)?luxestyle\.ch)?(?:/[a-z]{2}(?:-[a-z]{2})?)?(/(?:products|collections|pages|blogs)/[^"'#?\s>]*)''', re.I)


def hrefs(body):
    """Interne Pfade (ohne Host, ohne ?/#, ohne Sprachpraefix, erstes Segment klein) in der Reihenfolge des Auftretens; leere Handles
    (`/products/`) zaehlen nicht. Entities werden vor dem Suchen aufgeloest."""
    aus = []
    for m in LINK_RE.finditer(html.unescape(body or "")):
        p = re.sub(r"^/[A-Za-z]+/", lambda x: x.group(0).lower(), m.group(2))
        if re.match(r"^/(?:products|collections|pages)/[^/]", p) or p.startswith("/blogs/"):
            aus.append(p)
    return aus


def lade_artikel():
    Q = """query($c:String){articles(first:50,after:$c){pageInfo{hasNextPage endCursor}
           nodes{id handle title body isPublished blog{handle}}}}"""
    out, c = [], None
    while True:
        d = gql(Q, {"c": c})["articles"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    return out


def ziele_sammeln(arts):
    """→ (ziele: Pfad → {Artikel-Handles}, Zahl aller Link-Vorkommen)."""
    ziele, n = {}, 0
    for a in arts:
        for href in hrefs(a.get("body")):
            n += 1
            ziele.setdefault(href.rstrip("/"), set()).add(a["handle"])
    return ziele, n


def pruefe_seiten(handles):
    """/pages/<handle>: lebt = existiert UND veroeffentlicht. Schluessel = Handle wie im Link (ggf. prozentkodiert)."""
    aus = {}
    roh = list(handles)
    for i in range(0, len(roh), 10):
        teil = roh[i:i + 10]
        d = gql("query($q:String!){pages(first:20,query:$q){nodes{handle isPublished title}}}",
                {"q": " OR ".join("handle:" + urllib.parse.unquote(h) for h in teil)})["pages"]["nodes"]
        da = {n["handle"]: n for n in d}
        for h in teil:
            n = da.get(urllib.parse.unquote(h))
            aus[h] = {"zustand": "fehlt"} if not n else {"zustand": "ok" if n["isPublished"] else "tot", "titel": n["title"]}
    return aus


def pruefe_blogs(pfade, arts):
    """/blogs/<blog>[/<artikel>|/tagged/<tag>]: lebt = Blog hat Artikel, bzw. Artikel existiert und ist veroeffentlicht (aus den geladenen Artikeln)."""
    blogs = {(a.get("blog") or {}).get("handle") for a in arts}
    pub = {((a.get("blog") or {}).get("handle"), a["handle"]) for a in arts if a.get("isPublished", True)}
    aus = {}
    for p in pfade:
        seg = [urllib.parse.unquote(x) for x in p.split("/")[2:] if x]
        if not seg:
            aus[p] = {"zustand": "fehlt"}
        elif len(seg) == 1 or seg[1] == "tagged":
            aus[p] = {"zustand": "ok" if seg[0] in blogs else "fehlt"}
        else:
            aus[p] = {"zustand": "ok" if (seg[0], seg[1]) in pub else "fehlt"}
    return aus


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


def bewerte(ziele, arts, prod_fn=None, koll_fn=None, seiten_fn=None, red_fn=None):
    """→ (tot, umgeleitet). Die Nachschlagefunktionen sind einsetzbar, damit der Selbsttest ohne API laeuft."""
    prod_fn, koll_fn, seiten_fn, red_fn = prod_fn or pruefe_produkte, koll_fn or pruefe_kollektionen, seiten_fn or pruefe_seiten, red_fn or redirects
    prod = prod_fn({p.split("/products/")[1] for p in ziele if p.startswith("/products/")})
    koll = koll_fn({p.split("/collections/")[1] for p in ziele if p.startswith("/collections/")})
    seit = seiten_fn({p.split("/pages/")[1] for p in ziele if p.startswith("/pages/")})
    blog = pruefe_blogs([p for p in ziele if p.startswith("/blogs/")], arts)
    nicht_ok = {}
    for p, arts_ in ziele.items():
        if p.startswith("/products/"):
            info = prod[p.split("/products/")[1]]
        elif p.startswith("/collections/"):
            info = koll[p.split("/collections/")[1]]
        elif p.startswith("/pages/"):
            info = seit[p.split("/pages/")[1]]
        else:
            info = blog[p]
        if info["zustand"] != "ok":
            nicht_ok[p] = dict(info, artikel=sorted(arts_))
    rd = red_fn(sorted(nicht_ok)) if nicht_ok else {}
    tot, umg = {}, {}
    for p, v in nicht_ok.items():
        if p in rd:
            umg[p] = dict(v, redirect=rd[p], zustand="redirect")      # Besucher kommen an — Google/Linkkraft laufen den Umweg
        else:
            tot[p] = v
    return tot, umg


def main():
    t0 = time.time()
    # Kanarienvogel VOR der Messung: eine 0 ist nur etwas wert, wenn der Detektor nachweislich findet (Hausregel 19.10.)
    n_off, f_off = selbsttest_offline()
    n_live, f_live, unklar = selbsttest_live()
    if f_off or f_live:
        print("RATGEBER-LINKS: unklar (Selbsttest fehlgeschlagen: " + "; ".join(f_off + f_live)[:160] + ")")
        print("FERTIG: abgebrochen")
        return
    kanarien = f"Kanarienvogel ok ({n_off} offline + {n_live} live)" if not unklar else "Kanarienvogel live unklar (" + "; ".join(unklar)[:80] + ")"
    arts = lade_artikel()
    ziele, n_links = ziele_sammeln(arts)
    tot, umg = bewerte(ziele, arts)
    art_tot = {h for v in tot.values() for h in v["artikel"]}
    art_umg = {h for v in umg.values() for h in v["artikel"]}
    n_p = sum(1 for p in tot if p.startswith("/products/"))
    n_k = sum(1 for p in tot if p.startswith("/collections/"))
    n_s = len(tot) - n_p - n_k
    # Fix-12h Punkt 18, zweites Fertig-Kriterium: Artikel ohne einen einzigen (lebenden) Produktlink
    ohne_produktlink = sorted(a["handle"] for a in arts
                              if not any(h.startswith("/products/") and h.rstrip("/") not in tot and h.rstrip("/") not in umg
                                         for h in hrefs(a.get("body"))))
    json.dump({"stand": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), "artikel": len(arts), "ziele": len(ziele), "links": n_links,
               "tote": tot, "mit_redirect": umg, "ohne_produktlink": ohne_produktlink},
              open(AUSGABE, "w"), ensure_ascii=False, indent=1)
    print(f"RATGEBER-LINKS: {len(tot)} tot · {len(umg)} umgeleitet ({len(arts)} Artikel, {n_links} Links)")
    print(f"RATGEBER-DETAIL: tot {n_p} Produkte + {n_k} Kollektionen + {n_s} Seiten/Blog in {len(art_tot)} Artikeln "
          f"· umgeleitet {len(umg)} in {len(art_umg)} Artikeln · {len(ziele)} Ziele · {len(ohne_produktlink)} Artikel ohne Produktlink "
          f"· {kanarien} · {int(time.time() - t0)} s")
    if tot or umg:
        print("RATGEBER-HINWEIS: Reparatur = python3 automation/ratgeber_links_reparieren.py --vorschlag (Liste alt→neu), dann trocken/--scharf; Rueckweg --zurueck")
    print(f"FERTIG: Details {AUSGABE}")


def selbsttest_offline():
    """Mutationspruefung OHNE API: ein sauberer Artikel wird Schritt fuer Schritt mit einem bekannten toten bzw. umgeleiteten Link «vergiftet» —
    die Wache MUSS ihn finden, sonst ist eine 0 wertlos. → (Zahl der Pruefungen, [Fehler])."""
    fehler, n = [], 0

    def pruefe(name, ok):
        nonlocal n
        n += 1
        if not ok:
            fehler.append(name)

    def fp(hs):
        return {h: {"zustand": "ok"} if h.startswith("lebt") else {"zustand": "tot"} if h.startswith("draft") or h.startswith("umgeleitet")
                else {"zustand": "fehlt"} for h in hs}

    def fk(hs):
        return {h: {"zustand": "ok"} if h.startswith("lebt") else {"zustand": "tot"} if h.startswith("unpub") or h.startswith("umgeleitet")
                else {"zustand": "fehlt"} for h in hs}

    def fs(hs):
        return {h: {"zustand": "ok"} if h.startswith("lebt") else {"zustand": "fehlt"} for h in hs}

    def fr(ps):
        return {p: "/collections/ziel" for p in ps if "umgeleitet" in p}

    def art(h, body, pub=True):
        return {"handle": h, "body": body, "isPublished": pub, "blog": {"handle": "ratgeber"}}

    basis = ('<a href="/products/lebt-1">a</a> <a href="https://luxestyle.ch/collections/lebt-k">b</a> <a href="/pages/lebt-s">c</a> '
             '<a href="/blogs/ratgeber/a2">d</a>')
    a2 = art("a2", "<p>zweiter Artikel</p>")

    def lauf(body):
        arts = [art("a1", body), a2]
        z, n_l = ziele_sammeln(arts)
        t, u = bewerte(z, arts, fp, fk, fs, fr)
        return len(t), len(u), n_l

    t, u, nl = lauf(basis)
    pruefe("Basis sauber: 0 tot", t == 0)
    pruefe("Basis sauber: 0 umgeleitet", u == 0)
    pruefe("Basis: 4 Links gezaehlt", nl == 4)
    for name, alt, neu_, erw in [
        ("Produkt-Entwurf (relativ)", "/products/lebt-1", "/products/draft-1", (1, 0)),
        ("Produkt fehlt", "/products/lebt-1", "/products/gibts-nicht", (1, 0)),
        ("Produkt-Entwurf MIT Redirect", "/products/lebt-1", "/products/umgeleitet-p", (0, 1)),
        ("Kollektion unveroeffentlicht", "/collections/lebt-k", "/collections/unpub-k", (1, 0)),
        ("Kollektion MIT Redirect", "/collections/lebt-k", "/collections/umgeleitet-k", (0, 1)),
        ("Seite fehlt", "/pages/lebt-s", "/pages/weg", (1, 0)),
        ("Blogartikel fehlt", "/blogs/ratgeber/a2", "/blogs/ratgeber/gibts-nicht", (1, 0)),
    ]:
        t, u, nl = lauf(basis.replace(alt, neu_))
        pruefe("Mutation: " + name, (t, u) == erw and nl == 4)
    for name, link in [("absolut mit www", '<a href="https://www.luxestyle.ch/products/draft-2">x</a>'),
                       ("einfache Anfuehrungszeichen", "<a href='/products/draft-2'>x</a>"),
                       ("HREF gross", '<a HREF="/products/draft-2">x</a>'),
                       ("protokollrelativ", '<a href="//luxestyle.ch/products/draft-2">x</a>'),
                       ("mit Zeilenumbruch", '<a\n href = "/products/draft-2">x</a>'),
                       ("mit Fragment", '<a href="/products/draft-2#preis">x</a>'),
                       # 20.10.: die vier Formen, die der Pruefer am 19.10. als unentdeckt belegt hat
                       ("ohne Anfuehrungszeichen", "<a href=/products/draft-2>x</a>"),
                       ("ohne Anfuehrungszeichen mit weiterem Attribut", "<a href=/products/draft-2 class=a>x</a>"),
                       ("Entity &#x2F;", '<a href="&#x2F;products&#x2F;draft-2">x</a>'),
                       ("Entity &#47; und &sol;", '<a href="&#47;products&sol;draft-2">x</a>'),
                       ("Grossschreibung /Products/", '<a href="/Products/draft-2">x</a>'),
                       ("Sprachpraefix /en/", '<a href="/en/products/draft-2">x</a>'),
                       ("Sprachpraefix /de-ch/ absolut", '<a href="https://luxestyle.ch/de-ch/products/draft-2">x</a>')]:
        t, u, nl = lauf(basis + " " + link)
        pruefe("Schreibweise: " + name, (t, u, nl) == (1, 0, 5))
    for name, link in [("dreibuchstabiger Pfadanfang /xyz/ ist kein Sprachpraefix", '<a href="/xyz/products/draft-9">x</a>'),
                       ("Wort mit products im Pfadanfang", '<a href="/shop-products/draft-9">x</a>')]:
        t, u, nl = lauf(basis + " " + link)
        pruefe("kein Treffer: " + name, (t, u, nl) == (0, 0, 4))
    t, u, nl = lauf(basis + ' <a href="https://example.com/products/draft-3">fremd</a> <a href="/search?q=draft">s</a>')
    pruefe("Fremdlink und /search zaehlen nicht", (t, u, nl) == (0, 0, 4))
    arts = [art("a1", basis + ' <a href="/blogs/ratgeber/entwurf">e</a>'), a2, art("entwurf", "x", pub=False)]
    z, _ = ziele_sammeln(arts)
    t, u = bewerte(z, arts, fp, fk, fs, fr)
    pruefe("Link auf unveroeffentlichten Blogartikel = tot", len(t) == 1 and "/blogs/ratgeber/entwurf" in t)
    return n, fehler


def selbsttest_live():
    """Positiv-Kanarienvoegel gegen die ECHTE Admin-API: ein Entwurfsprodukt MUSS tot sein, ein aktives ok, ein erfundener Handle fehlt, eine echte
    Weiterleitung MUSS erkannt werden. → (Zahl der Pruefungen, [Fehler], [unklar-Gruende])."""
    fehler, unklar, n = [], [], 0

    def pruefe(name, ok):
        nonlocal n
        n += 1
        if not ok:
            fehler.append(name)

    try:
        e = gql("query{products(first:1,query:\"status:draft\"){nodes{handle}}}")["products"]["nodes"]
        a = gql("query{products(first:1,query:\"status:active\"){nodes{handle}}}")["products"]["nodes"]
        if not e or not a:
            unklar.append("kein Entwurf-/aktives Produkt gefunden")
        else:
            r = pruefe_produkte({e[0]["handle"], a[0]["handle"], "zzz-gibt-es-garantiert-nicht-4711"})
            pruefe("LIVE Entwurfsprodukt = tot", r[e[0]["handle"]]["zustand"] == "tot")
            pruefe("LIVE aktives Produkt = ok (nicht jedes Produkt ist tot)", r[a[0]["handle"]]["zustand"] == "ok")
            pruefe("LIVE erfundener Handle = fehlt", r["zzz-gibt-es-garantiert-nicht-4711"]["zustand"] == "fehlt")
        rd = gql("query{urlRedirects(first:40){nodes{path target}}}")["urlRedirects"]["nodes"]
        kand = [x for x in rd if x["path"].startswith("/") and len(x["path"]) < 90 and re.fullmatch(r"[\x21-\x7e]+", x["path"])]
        if not kand:
            unklar.append("keine echte Weiterleitung als Kanarienvogel gefunden")
        else:
            gef = redirects([kand[0]["path"]])
            pruefe("LIVE echte Weiterleitung wird erkannt", gef.get(kand[0]["path"]) == kand[0]["target"])
    except Exception as ex:
        unklar.append(f"{type(ex).__name__}: {str(ex)[:100]}")
    return n, fehler, unklar


def selbsttest():
    n_off, f_off = selbsttest_offline()
    n_live, f_live, unklar = selbsttest_live()
    fehler = f_off + f_live
    if fehler:
        print(f"RATGEBER-LINKS-SELBSTTEST: FEHLER ({len(fehler)} von {n_off + n_live}): " + "; ".join(fehler))
        return 1
    if unklar:
        print(f"RATGEBER-LINKS-SELBSTTEST: unklar (offline {n_off} Pruefungen ok, live: {'; '.join(unklar)})")
        return 1
    print(f"RATGEBER-LINKS-SELBSTTEST: ok ({n_off + n_live} Pruefungen: {n_off} offline + {n_live} live)")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Interne Linkziele der Ratgeber-Artikel am Ursprung messen (schreibt nichts im Shop).")
    ap.add_argument("--selbsttest", action="store_true", help="Mutationspruefung mit Positiv-Kanarienvoegeln, kein Messlauf")
    args = ap.parse_args()           # unbekannter Schalter → argparse beendet mit Exit 2, BEVOR irgendetwas laeuft
    if args.selbsttest:
        sys.exit(selbsttest())
    try:
        main()
    except Exception as e:
        print(f"RATGEBER-LINKS: unklar ({type(e).__name__}: {str(e)[:140]})")
        print("FERTIG: abgebrochen")
    sys.exit(0)
