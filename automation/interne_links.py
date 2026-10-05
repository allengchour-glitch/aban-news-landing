#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""interne_links.py — interne Verlinkung der Seiten mit Suchvolumen messen, ergänzen, zurücknehmen, bewachen (05.10.2026).

ANLASS: Semrush `domain_rank` ch 05.10.: 559 Begriffe in den Top 100, geschätzter Verkehr 0 — fast alles steht auf
Platz 11–100. Betreiber: «das geht mehr verbesserung mit semrush». Google wertet Seiten höher, auf die von Menü,
Startseite und anderen Seiten mit passendem Ankertext verlinkt wird. Gemessen 05.10. (--messen): die 40 Kollektionen mit
dem höchsten Schweizer Suchvolumen hatten im Median 1 eingehenden Link (nur das Menü), 37 Produktseiten auf Platz 16–30
hatten fast alle 0 — kein Ratgeber, keine Kollektion nennt sie.

WAS ES TUT
  --messen    Tabelle: eingehende Links je Zielseite (Hauptmenü, Footer, Startseite, Kollektionstexte, Ratgeber, Seiten).
              Ziele = Top-40-Kollektionen nach Suchvolumen (suchvolumen.fuer_kollektion) + Top-38-Ranking-URLs
              (dropship/semrush/luxestyle_ch_top30_*.csv). Schreibt nichts.
  --trocken   Plan (Standard): welche QUELL-Kollektion bekommt welchen Block «Passend dazu: …» (2–4 Links, Ankertext =
              Suchbegriff), damit jedes Ziel ≥ ZIEL_LINKS (3) eingehende Links hat; dazu Punkt (3): Unterkollektionen im
              Hauptmenü ohne Link zur Oberkategorie bekommen ihn im selben Block.
  --scharf    schreibt die Blöcke (collectionUpdate descriptionHtml, Altwert ins Ledger), liest jede live zurück.
  --zurueck   stellt descriptionHtml aus dem Ledger wieder her (jüngster ok-Eintrag je Kollektion).
  --pruefen   Wächter: jeder Link in einem ls-verwandt-Block muss auf eine veröffentlichte, gefüllte Kollektion bzw. ein
              aktives Produkt zeigen; eine Zeile «INTERNE-LINKS: …», ⚠️ bei Befund. Nie «0 Befund» bei Lesefehler.

REGELN (Hausregeln 05.10.)
  • Block ist mit <!-- ls-verwandt --> … <!-- /ls-verwandt --> markiert → ersetzbar, nie doppelt.
  • Keine Links auf Entwürfe, leere oder unveröffentlichte Kollektionen (resourcePublications Onlineshop + productsCount);
    Produkte nur ACTIVE mit onlineStoreUrl.
  • Keine Quelle, kein Ziel aus Hausregel-Klassen (Kostüm/Fasnacht/Halloween/Erotik/Tabak/Klingen/Waffen) oder POD/Editor.
  • Quell-Kollektionen nur thematisch verwandt: Menü-Eltern, Menü-Geschwister, Kollektionen des Produkts, gleiche Welt.
  • Ledger dropship/semrush/_interne_links_<datum>.tsv mit Altwert (JSON) → --zurueck.
  • Vor jedem Schreiben wird die Kollektion frisch gelesen (ein paralleler Schreiber darf nichts verlieren).

  python3 automation/interne_links.py --messen
  python3 automation/interne_links.py                 (= --trocken)
  python3 automation/interne_links.py --scharf
  python3 automation/interne_links.py --zurueck [datei]
  python3 automation/interne_links.py --pruefen
"""
import csv, datetime as dt, glob, html, json, os, re, sys, time, unicodedata, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql                     # Shopify Admin GraphQL mit Eimer-Etikette + Drossel-Geduld
from shop_kanal import im_onlineshop_liste
import suchvolumen

ORDNER = os.path.join(REPO, "dropship", "semrush")
HEUTE = dt.date.today().isoformat()
LEDGER = os.path.join(ORDNER, f"_interne_links_{HEUTE}.tsv")
ZIEL_LINKS = int(os.environ.get("ZIEL_LINKS", "3"))
MAX_LINKS_JE_BLOCK = 4
TOP_KOLL = int(os.environ.get("TOP_KOLL", "40"))
CACHE = os.environ.get("CACHE")                     # Ordner mit collections.json/menus.json/articles.json/pages.json (nur Entwicklung)

ANFANG, ENDE = "<!-- ls-verwandt -->", "<!-- /ls-verwandt -->"
BLOCK_RE = re.compile(re.escape(ANFANG) + r".*?" + re.escape(ENDE), re.S)
LINK_RE = re.compile(r"/(collections|products)/([^\s\"'?#<>)]+)")

# Hausregel-Klassen: nie Quelle, nie Ziel (Handle + Titel, normalisiert)
HAUSREGEL_RE = re.compile(r"kostuem|kostum|fasnacht|halloween|erotik|sexy|dessous|tabak|raucher|shisha|vape|e-zigarette|"
                          r"messer|klinge|waffe|airsoft|softair")
POD_RE = re.compile(r"selbst-gestalten|(^|-)pod(-|$)|printful|editor|personalisier")
# nicht-thematische Sammel-Kollektionen: keine «Passend dazu»-Quelle
KEINE_QUELLE = {"all", "frontpage", "neu", "neu-eingetroffen", "hype-jetzt", "bestseller", "blitzversand-schweiz",
                "eu-lager-schnell", "unter-chf-25", "viral-hits", "luxestyle-premium", "sale", "premium-geschenke"}

# Welten für «thematisch verwandt» (Handle + Titel normalisiert; eine Kollektion kann in mehreren Welten liegen)
WELTEN = {
    "damen": r"damen|frauen|bluse|kleid|rock|roecke|tunika|leggings|shapewear|bikini|bademode|bh",
    "herren": r"herren|maenner|fur-ihn|fuer-ihn|hemd|polo|krawatte",
    "schuhe": r"schuh|sneaker|boots|stiefel|ballerina|pumps|heels|sandale|slipper|pantoffel|loafer",
    "schmuck": r"schmuck|ring|kette|armband|ohrring|anhaenger|perlen|uhr",
    "taschen": r"tasche|rucksack|portemonnaie|wallet|koffer|kleinleder",
    "accessoires": r"accessoire|muetze|schal|guertel|handschuh|sonnenbrille|hut|cap|socken",
    "wohnen": r"wohn|deko|kissen|decke|vorhang|teppich|bettwaesche|lampe|leucht|beleucht|kerze|spiegel|regal|moebel|tisch|"
              r"stuhl|aufbewahr|organizer|ordnung|bad|dusch|waesche|wecker|vase|wand|textil",
    "kueche": r"kuech|koch|back|kaffee|tee|flasche|geschirr|besteck|barware|trinken|grill",
    "garten": r"garten|outdoor|balkon|camping|grill|pflanz|pool",
    "elektronik": r"elektronik|technik|gadget|usb|ladege|kabel|kopfhoerer|lautsprecher|audio|beamer|heimkino|projektor|"
                  r"smart|kamera|foto|drohne|konsole|gaming|nintendo|pc-|tastatur|maus|taschenlampe|adapter|computer|"
                  r"handy|phone|tablet|3d-druck|haushaltsgeraet|ventilator|wearable",
    "beauty": r"beauty|kosmetik|pflege|massage|nagel|naegel|manikuere|wimpern|parfum|parfuem|rasier|make-up|haar",
    "sport": r"sport|fitness|training|yoga|pilates|fahrrad|velo|wander|ski|schwimm|trinkflasche|hydration",
    "tier": r"tier|hund|katz|haustier|kratz|vogel|aquarium|leine|napf",
    "kinder": r"kind|baby|spielzeug|spiel|puzzle|bauklotz|bausteine|schul|kids|lern",
    "party": r"party|ballon|hochzeit|geburtstag",
    "geschenke": r"geschenk|fuer-sie|fuer-ihn|weihnacht|advent|valentin|muttertag|unter30|unter-chf",
    "saison": r"weihnacht|advent|herbst|winter|sommer|ostern|erste-august|jacke|mantel|maentel",
    "hobby": r"malen|diamond|basteln|handarbeit|strick|naeh|sticker|aufkleber",
    "gesundheit": r"gesund|orthop|stuetz|bandage|wellness|schlaf|luftbefeuchter",
}
WELTEN_RE = {k: re.compile(v) for k, v in WELTEN.items()}
KLEIN = {"und", "mit", "für", "fuer", "von", "im", "in", "der", "die", "das", "aus", "zu", "ab", "bis", "auf"}


# ---------------------------------------------------------------- Hilfen
def norm(s):
    s = (s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9\- ]+", " ", s)


def titel_rein(t):
    """Emoji/Symbole aus einem Kollektionstitel, für Ankertexte ohne Suchbegriff."""
    t = re.sub(r"[^\w\s&:,.\-/()'’]+", " ", t or "", flags=re.U)
    return re.sub(r"\s+", " ", t).strip(" :-·")


def anker_aus_begriff(b):
    """«pullover damen» → «Pullover Damen» (deutsche Substantive gross; Füllwörter klein)."""
    w = []
    for i, x in enumerate(b.split()):
        w.append(x if (x in KLEIN and i > 0) else (x[:1].upper() + x[1:]))
    return " ".join(w)


def anker_tauglich(begriff, titel, handle, alle=True):
    """Suchbegriff nur als Ankertext, wenn seine Wörter (≥ 3 Zeichen, grob gestemmt) im Titel/Handle vorkommen —
    «staubsauger» für «Haushaltsgeräte» oder «regale» für «Aufbewahrung» wäre ein irreführender Anker (05.10.).
    alle=True: jedes Wort muss passen (Kollektionen); alle=False: eines genügt (Produkte, der Begriff ist ihr Ranking)."""
    ziel = norm(titel) + " " + norm(handle)
    woerter = [w for w in norm(begriff).split() if len(w) >= 3]
    if not woerter:
        return False
    treffer = [re.sub(r"(en|er|es|e|n|s)$", "", w) in ziel for w in woerter]
    return all(treffer) if alle else any(treffer)


def anker_fuer(begriff, titel, handle, produkt=False):
    if begriff and anker_tauglich(begriff, titel, handle, alle=not produkt):
        return anker_aus_begriff(begriff)
    return titel_rein(titel)


def hausregel(handle, titel):
    return bool(HAUSREGEL_RE.search(norm(handle) + " " + norm(titel)))


def pod(handle, titel):
    return bool(POD_RE.search(norm(handle) + " " + norm(titel)))


def welten(handle, titel):
    s = norm(handle) + " " + norm(titel)
    return {k for k, r in WELTEN_RE.items() if r.search(s)}


def links_in(html_text):
    """Set der verlinkten (art, handle) in einem HTML-Text (Handle dekodiert, ohne Pfad-Rest)."""
    raus = set()
    for art, h in LINK_RE.findall(html_text or ""):
        h = urllib.parse.unquote(h).split("/")[0].strip()
        if h:
            raus.add((art, h))
    return raus


# ---------------------------------------------------------------- Laden
def lade_alles():
    """Kollektionen, Menüs, Artikel, Seiten, Startseite — live (oder CACHE-Ordner)."""
    if CACHE:
        c = json.load(open(f"{CACHE}/collections.json"))
        m = json.load(open(f"{CACHE}/menus.json"))
        a = json.load(open(f"{CACHE}/articles.json"))
        p = json.load(open(f"{CACHE}/pages.json"))
    else:
        c, cur = [], None
        while True:
            d = gql('''query($c:String){ collections(first:100, after:$c){ pageInfo{hasNextPage endCursor}
              nodes{ id handle title descriptionHtml productsCount{count} seo{ title description }
                     resourcePublications(first:10){ nodes{ isPublished publication{ id name } } } } } }''',
                    {"c": cur})["collections"]
            for n in d["nodes"]:
                n["online"] = im_onlineshop_liste(n["resourcePublications"]["nodes"])
                n["n"] = n["productsCount"]["count"]
                del n["resourcePublications"], n["productsCount"]
                c.append(n)
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
        m = gql('{ menus(first:20){ nodes{ id handle title items{ title url type items{ title url type items{ title url type } } } } } }')["menus"]["nodes"]
        a, cur = [], None
        while True:
            d = gql('''query($c:String){ articles(first:100, after:$c){ pageInfo{hasNextPage endCursor}
              nodes{ id handle title isPublished body } } }''', {"c": cur})["articles"]
            a += d["nodes"]
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
        p, cur = [], None
        while True:
            d = gql('''query($c:String){ pages(first:100, after:$c){ pageInfo{hasNextPage endCursor}
              nodes{ id handle title isPublished body } } }''', {"c": cur})["pages"]
            p += d["nodes"]
            if not d["pageInfo"]["hasNextPage"]:
                break
            cur = d["pageInfo"]["endCursor"]
    start = startseite_links()
    return c, m, a, p, start


def startseite_links():
    """Kollektions-Handles, die die Startseite (templates/index.json des Live-Themes) zeigt. None = nicht lesbar."""
    try:
        d = gql('{ themes(first:1, roles:[MAIN]){ nodes{ files(filenames:["templates/index.json"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } } }')
        body = d["themes"]["nodes"][0]["files"]["nodes"][0]["body"]["content"]
    except Exception:
        return None
    raus = set()
    for h in re.findall(r'"collection"\s*:\s*"([^"]+)"', body):
        raus.add(("collections", urllib.parse.unquote(h)))
    raus |= links_in(body)
    return raus


def menue_baum(menus):
    """{(art, handle): {'eltern': (art,handle)|None, 'ebene': n}} aus dem Hauptmenü + Liste aller Menü-Links je Menü."""
    baum, je_menue = {}, {}

    def ziel(url):
        m = LINK_RE.search(url or "")
        return (m.group(1), urllib.parse.unquote(m.group(2)).split("/")[0]) if m else None

    def geh(items, eltern, ebene, handle):
        for it in items:
            z = ziel(it.get("url"))
            if z:
                je_menue.setdefault(handle, set()).add(z)
                if handle == "main-menu" and z not in baum:
                    baum[z] = {"eltern": eltern if eltern != z else None, "ebene": ebene, "titel": it["title"]}
            geh(it.get("items") or [], z if z else eltern, ebene + 1, handle)

    for m in menus:
        geh(m["items"], None, 0, m["handle"])
    return baum, je_menue


# ---------------------------------------------------------------- Ziele
def top_kollektionen(colls):
    rows = []
    for c in colls:
        if not c["online"] or c["n"] == 0 or hausregel(c["handle"], c["title"]) or pod(c["handle"], c["title"]):
            continue
        v, begriff = suchbegriff_fuer(c)
        if v > 0:
            rows.append((v, begriff, c))
    rows.sort(key=lambda r: (-r[0], r[2]["handle"]))
    return rows[:TOP_KOLL]


def suchbegriff_fuer(c):
    """(Volumen, Suchbegriff) mit dem meisten Volumen für eine Kollektion — Semrush-Ernte + SEO-Kollektions-Ledger."""
    kand = suchvolumen.suchbegriffe(c["title"]) + suchvolumen.suchbegriffe("handle:" + c["handle"])
    for name in sorted(glob.glob(os.path.join(ORDNER, "_seo_kollektion_ledger*.tsv"))):
        for z in csv.reader(open(name, encoding="utf-8"), delimiter="\t"):
            if len(z) > 2 and z[1] == c["handle"]:
                kand.append(z[2])
    best = max([(suchvolumen.volumen(b), b) for b in kand] or [(0, "")])
    return best


def top_rankings():
    """Top-38-Ranking-URLs (Platz ≤ 30) aus der Semrush-Ernte → [(begriff, position, volumen, art, handle)]."""
    raus = []
    for name in sorted(glob.glob(os.path.join(ORDNER, "luxestyle_ch_top30_*.csv"))):
        for z in csv.DictReader(open(name, encoding="utf-8"), delimiter=";"):
            m = LINK_RE.search(z.get("Url") or "")
            if m:
                raus.append((z["Keyword"].strip().lower(), int(z["Position"]), int(z["Search Volume"]), m.group(1), urllib.parse.unquote(m.group(2))))
    return raus


def produkte_lesen(handles):
    """Status, Onlineshop-URL, Titel und Kollektionen je Produkt-Handle (lebend)."""
    raus = {}
    for h in handles:
        d = gql('query($h:String!){ productByHandle(handle:$h){ id title status onlineStoreUrl tags collections(first:30){ nodes{ handle } } } }', {"h": h})["productByHandle"]
        raus[h] = d
    return raus


# ---------------------------------------------------------------- Messen
def eingehende(ziel, colls, arts, pages, je_menue, start, quelle_ausser=None):
    """Zählt Quell-DOKUMENTE je Art, die auf ziel=(art,handle) verlinken. Kollektionstexte: andere Kollektionen."""
    z = {"menue": int(ziel in je_menue.get("main-menu", set())), "footer": int(ziel in je_menue.get("footer", set())),
         "start": ("?" if start is None else int(ziel in start))}
    z["koll"] = sum(1 for c in colls if c["online"] and c["handle"] != ziel[1] and ziel in links_in(c["descriptionHtml"]))
    z["blog"] = sum(1 for a in arts if a["isPublished"] and ziel in links_in(a["body"]))
    z["seiten"] = sum(1 for p in pages if p["isPublished"] and ziel in links_in(p["body"]))
    z["total"] = sum(v for k, v in z.items() if k != "start" and isinstance(v, int)) + (z["start"] if isinstance(z["start"], int) else 0)
    return z


def ziele_sammeln(colls, arts, pages, je_menue, start):
    """Alle Zielseiten mit Begriff, Volumen, Status und eingehenden Links."""
    by_handle = {c["handle"]: c for c in colls}
    ziele = []
    for v, begriff, c in top_kollektionen(colls):
        ziele.append({"art": "collections", "handle": c["handle"], "titel": c["title"], "begriff": begriff, "vol": v,
                      "pos": None, "ok": True, "grund": "", "links": eingehende(("collections", c["handle"]), colls, arts, pages, je_menue, start)})
    rank = top_rankings()
    prod = produkte_lesen(sorted({h for _, _, _, art, h in rank if art == "products"}))
    for begriff, pos, vol, art, h in rank:
        if art == "collections":
            c = by_handle.get(h)
            if c and not (c["online"] and c["n"] > 0):            # 301 folgen (beleuchtung-lampen → sub-beleuchtung, 05.10.)
                r = gql('query($q:String!){ urlRedirects(first:1, query:$q){ nodes{ target } } }', {"q": f"path:/collections/{h}"})["urlRedirects"]["nodes"]
                m = LINK_RE.search((r or [{}])[0].get("target") or "")
                if m and m.group(1) == "collections" and by_handle.get(m.group(2)):
                    h = m.group(2); c = by_handle[h]; begriff = begriff + " (301)"
            ok = bool(c and c["online"] and c["n"] > 0 and not hausregel(h, c["title"]))
            titel = c["title"] if c else "(fehlt)"
            grund = "" if ok else ("fehlt" if not c else "nicht kaufbar/online" if not (c["online"] and c["n"]) else "Hausregel")
            kolls = []
        else:
            p = prod.get(h)
            titel = (p or {}).get("title") or "(fehlt)"
            if not p:
                ok, grund = False, "Produkt fehlt"
            elif p["status"] != "ACTIVE" or not p["onlineStoreUrl"]:
                ok, grund = False, f"Produkt {p['status']} / nicht im Onlineshop"
            elif hausregel(h, p["title"]) or pod(h, p["title"]) or any(t.lower() in ("pod", "printful", "selbst-gestalten") for t in p["tags"]):
                ok, grund = False, "Hausregel-Klasse"
            else:
                ok, grund = True, ""
            kolls = [n["handle"] for n in (p or {}).get("collections", {}).get("nodes", [])]
        if any(zz["handle"] == h and zz["art"] == art for zz in ziele):      # Begriff zur schon vorhandenen Zielseite
            continue
        ziele.append({"art": art, "handle": h, "titel": titel, "begriff": begriff, "vol": vol, "pos": pos, "ok": ok, "grund": grund,
                      "kolls": kolls, "links": eingehende((art, h), colls, arts, pages, je_menue, start)})
    return ziele


def tabelle(ziele):
    k = "| # | Ziel | Suchbegriff | Vol./Mt | Pos. | Menü | Footer | Start | Koll. | Blog | Seiten | **Σ** | Status |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n"
    for i, z in enumerate(ziele, 1):
        l = z["links"]
        k += (f"| {i} | /{z['art']}/{z['handle'][:45]} | {z['begriff']} | {z['vol']} | {z['pos'] or ''} | {l['menue']} | {l['footer']} | {l['start']} | "
              f"{l['koll']} | {l['blog']} | {l['seiten']} | **{l['total']}** | {'ok' if z['ok'] else z['grund']} |\n")
    return k


# ---------------------------------------------------------------- Planen
def plan_bauen(ziele, colls, baum):
    """→ {quell_handle: {'links': [(href, anker, ziel_key)], 'eltern': (href, anker)|None}}"""
    by_handle = {c["handle"]: c for c in colls}

    def quelle_ok(h):
        c = by_handle.get(h)
        return bool(c and c["online"] and c["n"] > 0 and h not in KEINE_QUELLE and not hausregel(h, c["title"]) and not pod(h, c["title"]))

    def kinder(eltern_key):
        return [k[1] for k, v in baum.items() if v["eltern"] == eltern_key and k[0] == "collections"]

    plan = {}
    last = {}

    def gib(quelle, href, anker, key):
        q = plan.setdefault(quelle, {"links": [], "eltern": None})
        if any(x[2] == key for x in q["links"]):
            return True
        if len(q["links"]) >= MAX_LINKS_JE_BLOCK:
            return False
        q["links"].append((href, anker, key))
        last[quelle] = last.get(quelle, 0) + 1
        return True

    offen = []
    for z in sorted([z for z in ziele if z["ok"] and z["links"]["total"] < ZIEL_LINKS], key=lambda z: -z["vol"]):
        key = (z["art"], z["handle"])
        schon = {c["handle"] for c in colls if c["online"] and c["handle"] != z["handle"] and key in links_in(c["descriptionHtml"])}
        bedarf = ZIEL_LINKS - z["links"]["total"]
        anker = anker_fuer(z["begriff"], z["titel"], z["handle"], produkt=(z["art"] == "products"))
        href = f"/{z['art']}/{z['handle']}"
        kand = []
        if z["art"] == "collections":
            el = (baum.get(key) or {}).get("eltern")
            if el and el[0] == "collections":
                kand.append(el[1])
                kand += sorted(kinder(el), key=lambda h: -by_handle.get(h, {}).get("n", 0))
            kand += sorted(kinder(key), key=lambda h: -by_handle.get(h, {}).get("n", 0))      # eigene Unterkollektionen
            w = welten(z["handle"], z["titel"])
            rest = [(len(w & welten(c["handle"], c["title"])), c["n"], c["handle"]) for c in colls
                    if c["handle"] != z["handle"] and quelle_ok(c["handle"]) and (w & welten(c["handle"], c["title"]))]
            kand += [h for _, _, h in sorted(rest, key=lambda r: (-r[0], -r[1]))]
        else:
            kand = sorted([h for h in z.get("kolls", []) if quelle_ok(h)], key=lambda h: by_handle.get(h, {}).get("n", 0))
        gefunden = 0
        gesehen = set()
        for q in kand:
            if q in gesehen or q == z["handle"] or q in schon or not quelle_ok(q):
                continue
            gesehen.add(q)
            if gib(q, href, anker, key):
                gefunden += 1
            if gefunden >= bedarf:
                break
        if gefunden < bedarf:
            offen.append((z["handle"], z["begriff"], bedarf - gefunden))

    # (3) Breadcrumb: Unterkollektion → Oberkategorie
    eltern_fehlt = []
    for key, v in baum.items():
        el = v["eltern"]
        if key[0] != "collections" or not el or el[0] != "collections" or el[1] == key[1]:
            continue
        c = by_handle.get(key[1])
        ec = by_handle.get(el[1])
        if not (c and ec and quelle_ok(key[1]) and ec["online"] and ec["n"] > 0 and not hausregel(el[1], ec["title"])):
            continue
        text_ohne = BLOCK_RE.sub("", c["descriptionHtml"] or "")
        if el in links_in(text_ohne):
            continue
        eltern_fehlt.append((key[1], el[1]))
        q = plan.setdefault(key[1], {"links": [], "eltern": None})
        ev, eb = suchbegriff_fuer(ec)
        q["eltern"] = (f"/collections/{el[1]}", anker_fuer(eb if ev else "", ec["title"], el[1]))
    return plan, offen, eltern_fehlt


def block_html(eintrag):
    teile = []
    if eintrag["links"]:
        teile.append("<p class=\"ls-verwandt\"><strong>Passend dazu:</strong> " +
                     " · ".join(f"<a href=\"{html.escape(h)}\">{html.escape(a)}</a>" for h, a, _ in eintrag["links"]) + "</p>")
    if eintrag["eltern"]:
        h, a = eintrag["eltern"]
        teile.append(f"<p class=\"ls-verwandt-eltern\">Zur Übersicht: <a href=\"{html.escape(h)}\">{html.escape(a)}</a></p>")
    return ANFANG + "".join(teile) + ENDE


def einsetzen(alt, block):
    alt = alt or ""
    if BLOCK_RE.search(alt):
        return BLOCK_RE.sub(lambda _: block, alt, count=1)
    return (alt.rstrip() + "\n" + block) if alt.strip() else block


# ---------------------------------------------------------------- Schreiben
def ledger_schreiben(zeile):
    neu = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        if neu:
            w.writerow(["zeit", "handle", "id", "aktion", "alt_descriptionHtml_json", "neu_block_json", "links", "status"])
        w.writerow(zeile)


def schreiben(plan, colls):
    by_handle = {c["handle"]: c for c in colls}
    ok = fehler = 0
    for handle, e in sorted(plan.items()):
        if not e["links"] and not e["eltern"]:
            continue
        cid = by_handle[handle]["id"]
        frisch = gql('query($id:ID!){ collection(id:$id){ descriptionHtml } }', {"id": cid})["collection"]["descriptionHtml"] or ""
        block = block_html(e)
        neu = einsetzen(frisch, block)
        if neu == frisch:
            ledger_schreiben([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), handle, cid, "block", json.dumps(frisch, ensure_ascii=False), json.dumps(block, ensure_ascii=False), len(e["links"]) + bool(e["eltern"]), "unverändert"])
            continue
        d = gql('mutation($in:CollectionInput!){ collectionUpdate(input:$in){ collection{ descriptionHtml } userErrors{ field message } } }',
                {"in": {"id": cid, "descriptionHtml": neu}})["collectionUpdate"]
        if d["userErrors"]:
            fehler += 1
            ledger_schreiben([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), handle, cid, "block", json.dumps(frisch, ensure_ascii=False), json.dumps(block, ensure_ascii=False), len(e["links"]) + bool(e["eltern"]), "FEHLER " + str(d["userErrors"])[:150]])
            print("FEHLER", handle, d["userErrors"])
            continue
        zurueck = gql('query($id:ID!){ collection(id:$id){ descriptionHtml } }', {"id": cid})["collection"]["descriptionHtml"] or ""
        status = "ok" if ANFANG in zurueck and all(h in zurueck for h, _, _ in e["links"]) else "ZURUECKLESEN-ABWEICHUNG"
        ok += status == "ok"
        fehler += status != "ok"
        ledger_schreiben([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), handle, cid, "block", json.dumps(frisch, ensure_ascii=False), json.dumps(block, ensure_ascii=False), len(e["links"]) + bool(e["eltern"]), status])
        print(f"{status:>4} {handle}: {len(e['links'])} Links" + (" + Eltern" if e["eltern"] else ""))
    print(f"geschrieben ok={ok} fehler={fehler} → {LEDGER}")


def zurueck(datei=None):
    datei = datei or (sorted(glob.glob(os.path.join(ORDNER, "_interne_links_*.tsv"))) or [None])[-1]
    if not datei:
        print("kein Ledger"); return
    letzte = {}
    for z in csv.DictReader(open(datei, encoding="utf-8"), delimiter="\t"):
        if z["aktion"] == "block" and z["status"] == "ok":
            letzte[z["handle"]] = z
    n = 0
    for handle, z in letzte.items():
        alt = json.loads(z["alt_descriptionHtml_json"])
        d = gql('mutation($in:CollectionInput!){ collectionUpdate(input:$in){ collection{ descriptionHtml } userErrors{ message } } }',
                {"in": {"id": z["id"], "descriptionHtml": alt}})["collectionUpdate"]
        st = "ok" if not d["userErrors"] and (d["collection"]["descriptionHtml"] or "") == alt else "FEHLER " + str(d["userErrors"])[:100]
        ledger_schreiben([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), handle, z["id"], "zurueck", "", "", 0, st])
        n += st == "ok"
        print(st, handle)
    print(f"zurückgestellt: {n}/{len(letzte)}")


# ---------------------------------------------------------------- Wächter
def pruefen():
    try:
        colls, menus, arts, pages, start = lade_alles()
    except Exception as e:
        print(f"INTERNE-LINKS: unklar ({str(e)[:100]})"); return
    by_handle = {c["handle"]: c for c in colls}
    bloecke, befund, prod_handles = 0, [], set()
    for c in colls:
        m = BLOCK_RE.search(c["descriptionHtml"] or "")
        if not m:
            continue
        bloecke += 1
        for art, h in links_in(m.group(0)):
            if art == "collections":
                z = by_handle.get(h)
                if not z or not z["online"] or z["n"] == 0:
                    befund.append(f"{c['handle']} → /collections/{h} ({'fehlt' if not z else 'unveröffentlicht' if not z['online'] else 'leer'})")
            else:
                prod_handles.add((c["handle"], h))
    if prod_handles:
        prod = produkte_lesen(sorted({h for _, h in prod_handles}))
        for q, h in sorted(prod_handles):
            p = prod.get(h)
            if not p or p["status"] != "ACTIVE" or not p["onlineStoreUrl"]:
                befund.append(f"{q} → /products/{h} ({'fehlt' if not p else p['status']})")
    if befund:
        print(f"INTERNE-LINKS: ⚠️ {len(befund)} tote/leere Ziele in {bloecke} ls-verwandt-Blöcken · " + " · ".join(befund[:4]))
    else:
        print(f"INTERNE-LINKS: {bloecke} ls-verwandt-Blöcke, alle Ziele kaufbar")


# ---------------------------------------------------------------- main
def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "--trocken"
    if arg == "--zurueck":
        zurueck(sys.argv[2] if len(sys.argv) > 2 else None); return
    if arg == "--pruefen":
        pruefen(); return
    colls, menus, arts, pages, start = lade_alles()
    baum, je_menue = menue_baum(menus)
    ziele = ziele_sammeln(colls, arts, pages, je_menue, start)
    print(f"Kollektionen {len(colls)} (online+gefüllt {sum(1 for c in colls if c['online'] and c['n'])}) · Artikel {sum(a['isPublished'] for a in arts)} · "
          f"Seiten {sum(p['isPublished'] for p in pages)} · Startseite {'nicht lesbar' if start is None else str(len(start)) + ' Links'} · Ziele {len(ziele)}")
    if arg == "--messen":
        print(tabelle(ziele))
        json.dump(ziele, open(os.path.join(ORDNER, f"_interne_links_messung_{HEUTE}.json"), "w"), ensure_ascii=False, indent=0)
        unter = [z for z in ziele if z["ok"] and z["links"]["total"] < ZIEL_LINKS]
        print(f"Ziele mit < {ZIEL_LINKS} eingehenden Links: {len(unter)} von {sum(z['ok'] for z in ziele)} kaufbaren")
        return
    plan, offen, eltern_fehlt = plan_bauen(ziele, colls, baum)
    n_links = sum(len(e["links"]) for e in plan.values())
    print(f"Plan: {len(plan)} Quell-Kollektionen · {n_links} Links · {sum(bool(e['eltern']) for e in plan.values())} Eltern-Links "
          f"(Unterkollektionen ohne Link zur Oberkategorie: {len(eltern_fehlt)}) · offen {len(offen)}")
    for handle, e in sorted(plan.items()):
        print(f"  {handle}: " + " · ".join(f"[{a}]→{h}" for h, a, _ in e["links"]) + (f" · Übersicht→{e['eltern'][0]} [{e['eltern'][1]}]" if e["eltern"] else ""))
    for h, b, n in offen:
        print(f"  OFFEN {h} ({b}): {n} Quelle(n) fehlen")
    if arg == "--scharf":
        schreiben(plan, colls)
    else:
        print("(Trockenlauf — nichts geschrieben; --scharf schreibt)")


if __name__ == "__main__":
    main()
