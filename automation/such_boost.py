#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""such_boost.py — Such-Boosts: die richtige Ware oben in der Shop-Suche (12.10.2026).

ANLASS (Workflow-Messrunde 12.10., Prüfer «Suche & Navigation»): Wer sucht, kommt 4,4× häufiger in den Warenkorb
(90 T: 6,1 % gegen 1,4 %), aber die Enter-Suche zeigte bei 14 Begriffen Fremdware vorn — «halloween» 0/8 ab Schweizer
Lager (8/8 Direktversand, Ankunft nach dem 31.10.), «kostüm» Platz 1–4 Zubehör, «geschenk für frau» Platz 4 ein
Intim-Pflegeserum, «powerbank» 3/8. Der Hebel war ungenutzt: Search & Discovery gleicht das Produkt-Metafeld
`shopify--discovery--product_search_boost.queries` (list.single_line_text_field, list.max 10) mit seinen Produkt-Boosts
ab — metafieldsCount war 0.

REGEL (data/such_boosts.json): je Familie Suchbegriffe + Quelle (Kollektion in ihrer Reihenfolge oder Admin-Suche)
+ Titel-Muster → die ersten max_je_familie Produkte, die AKTIV, im Onlineshop, verfügbar und mit ≥ 2 Bildern sind,
nicht gesperrt (Intim/Erotik/Kosmetik-Heilversprechen/Klingen/Duplikat) und nicht von der Gemini-Jury durchgefallen.
Anlass-Familien: nach dem Datum leer; ist Direktversand nicht mehr rechtzeitig, nur Ware ab Schweizer Lager.
Jeder Lauf rechnet das Soll neu (ausverkauft/gedraftet fällt raus, neue Ware rückt nach) und SCHREIBT NUR DIE EIGENEN
BEGRIFFE: was die App oder ein Mensch gesetzt hat, bleibt stehen (Stand-Datei dropship/_such_boosts_stand.json).

  python3 automation/such_boost.py                 Trockenlauf: Soll je Familie
  SCHARF=1 python3 automation/such_boost.py        schreiben + zurücklesen (Aufseher täglich)
  python3 automation/such_boost.py --messen        Enter-Suche je Familie: wie viele der ersten 8 sind Soll-Ware
  python3 automation/such_boost.py --selbsttest
  python3 automation/such_boost.py --kontaktbogen   Bilder der Soll-Ware → /tmp/kontaktbogen_such_boost*.png
"""
import datetime as dt, json, os, re, subprocess, sys, time, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
SCHARF = os.environ.get("SCHARF") == "1"
REGEL = os.path.join(HIER, "data", "such_boosts.json")
ANLASS = os.path.join(REPO, "data", "anlass_kollektionen.json")
STAND = os.path.join(REPO, "dropship", "_such_boosts_stand.json")
LEDGER = os.path.join(REPO, "dropship", "_such_boosts.tsv")
NS, KEY = "shopify--discovery--product_search_boost", "queries"
JURY_SEKUNDEN = int(os.environ.get("SUCH_BOOST_JURY_SEKUNDEN", "600"))

SPERRE_TITEL = re.compile(r"intim|erotik|vaginal|sex|dessous|reizwäsche|menstruation|hämorrhoid|serum\b|creme\b|lotion\b|"
                          r"anti-?pilz|warzen|messer\b|klinge|dolch|machete|schwert|tabak|shisha|vape|e-zigarette|18\+", re.I)
SPERRE_TAGS = {"duplikat-auto-draft", "nicht-lieferbar-ch", "ausverkauft-lieferant", "keine-lieferanten-ref", "18+",
               "erotik", "klinge", "ist-klinge", "kein-google"}
SCHNELL_TAGS = {"ch-lager", "schweiz-versand"}


def norm_begriff(b):
    return re.sub(r"\s+", " ", b.strip().lower())


def plus_werktage(tag, n):
    d = tag
    while n > 0:
        d += dt.timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def schnell(tags, sku):
    return bool(SCHNELL_TAGS & set(tags or [])) or (sku or "").lower().startswith("fortura")


def anlass_lage(datum, heute=None):
    """→ 'vorbei' | 'nur_schnell' | 'alle'  (Lieferwerktage aus data/anlass_kollektionen.json)."""
    heute = heute or dt.date.today()
    d = dt.date.fromisoformat(datum)
    if heute > d:
        return "vorbei"
    try:
        lw = json.load(open(ANLASS)).get("lieferung_werktage", {})
    except Exception:
        lw = {}
    if plus_werktage(heute, int(lw.get("langsam", 12))) > d:
        return "nur_schnell"
    return "alle"


def vielfalt_schluessel(titel, staemme):
    """Erster Stamm aus der Vielfalt-Liste im Titel (fünf Hexen nebeneinander zeigen nur eine Idee)."""
    t = titel.lower()
    for st in staemme:
        if re.search(st, t):
            return st
    return None


def passt(fam, titel, tags, bilder):
    """Titel-Muster (alle titel_ja müssen treffen, titel_nein darf nicht), Sperren, ≥ 2 Bilder."""
    t = titel.lower()
    if bilder < fam.get("min_bilder", 2) or SPERRE_TITEL.search(t) or (SPERRE_TAGS & {x.lower() for x in tags}):
        return False
    for m in fam.get("titel_ja", []):
        if not re.search(m, t, re.I):
            return False
    if fam.get("titel_nein") and re.search(fam["titel_nein"], t, re.I):
        return False
    return True


def begriffe_zusammen(fam_begriffe, fremde, deckel=10):
    """Eigene Begriffe (Familien in Vorrang-Reihenfolge) hinter die fremden hängen, Dubletten raus, Deckel 10.
    → (liste, abgeschnittene)"""
    aus, gesehen = [], set()
    for b in list(fremde) + list(fam_begriffe):
        n = norm_begriff(b)
        if n and n not in gesehen:
            gesehen.add(n); aus.append(n)
    return aus[:deckel], aus[deckel:]


def selbsttest():
    ok = n = 0
    def pr(name, cond):
        nonlocal ok, n
        n += 1; ok += bool(cond); print(f"{'✓' if cond else '✗'} {name}")
    fam = {"titel_ja": ["t-?shirt", "herren|männer"], "titel_nein": "damen|hemd\\b"}
    pr("T-Shirt Herren passt", passt(fam, "Herren T-Shirt Matterhorn", [], 3))
    pr("Damen-T-Shirt nicht", not passt(fam, "Damen T-Shirt mit Herren-Print", [], 3))
    pr("Leinenhemd nicht", not passt(fam, "Leinen Hemd für Männer", [], 3))
    pr("1 Bild nicht", not passt(fam, "Herren T-Shirt", [], 1))
    pr("Intim-Serum gesperrt", not passt({}, "Intim-Pflegeserum für Frauen", [], 4))
    pr("Duplikat-Tag gesperrt", not passt({}, "Kostüm Hase", ["duplikat-auto-draft"], 4))
    k = {"titel_ja": ["kostüm|verkleidung"], "titel_nein": "handschuh|zubehör"}
    pr("Kostümhandschuhe nicht", not passt(k, "Glänzende ellenbogenlange Kostümhandschuhe", [], 3))
    pr("Kostüm Pilot passt", passt(k, "Kostüm Pilot", ["ch-lager"], 3))
    pr("schnell: Tag ch-lager", schnell(["ch-lager"], "") and schnell([], "fortura-123") and not schnell(["cj-real"], "CJ-1"))
    pr("Anlass vorbei", anlass_lage("2026-10-31", dt.date(2026, 11, 1)) == "vorbei")
    pr("Anlass nur schnell (5 Tage vorher)", anlass_lage("2026-10-31", dt.date(2026, 10, 26)) == "nur_schnell")
    pr("Anlass alle (60 Tage vorher)", anlass_lage("2026-12-24", dt.date(2026, 10, 25)) == "alle")
    l, weg = begriffe_zusammen(["Kostüm", "kostüme"] + [f"b{i}" for i in range(10)], ["Fasnacht"])
    pr("Deckel 10, fremde zuerst, klein", len(l) == 10 and l[0] == "fasnacht" and l[1] == "kostüm" and len(weg) == 3)
    l, _ = begriffe_zusammen(["halloween", "Halloween "], [])
    pr("Dubletten normalisiert", l == ["halloween"])
    pr("Vielfalt: Sternenhexe → hexe", vielfalt_schluessel("Kostüm Sternenhexe", ["vampir", "hexe"]) == "hexe")
    pr("Vielfalt: kein Stamm", vielfalt_schluessel("Kostüm Pilot", ["hexe"]) is None)
    print(f"SELBSTTEST {ok}/{n}")
    return 0 if ok == n else 1


FELDER = ("id handle title status tags onlineStoreUrl mediaCount{count} featuredImage{url} "
          "priceRangeV2{minVariantPrice{amount}} variants(first:20){nodes{availableForSale sku}}")


def kandidaten(gql, fam, grenze=250):
    q = fam["quelle"]
    if "kollektion" in q:
        sk = q.get("sortierung", "COLLECTION_DEFAULT")
        out, cur = [], None
        while len(out) < q.get("tiefe", grenze):
            d = gql('query($h:String!,$n:Int!,$c:String){collectionByHandle(handle:$h){products(first:$n, after:$c, sortKey:%s)'
                    '{pageInfo{hasNextPage endCursor} nodes{%s}}}}' % (sk, FELDER), {"h": q["kollektion"], "n": 250, "c": cur}).get("collectionByHandle")
            if not d:
                break
            out += d["products"]["nodes"]
            if not d["products"]["pageInfo"]["hasNextPage"]:
                break
            cur = d["products"]["pageInfo"]["endCursor"]
        return out
    d = gql('query($q:String!,$n:Int!){products(first:$n, query:$q, sortKey:RELEVANCE){nodes{%s}}}' % FELDER,
            {"q": q["suche"] + " status:active", "n": grenze})
    return d["products"]["nodes"]


def jury_urteil(p, start):
    """0 ok · 4 durchgefallen · 2 kein Urteil (zählt nicht als Nein)."""
    url = (p.get("featuredImage") or {}).get("url")
    if not url or os.environ.get("JURY") == "0":
        return 2
    args = ["python3", os.path.join(HIER, "gemini_jury.py"), url, "--caption",
            f"{p['title']}\nCHF {float(p['priceRangeV2']['minVariantPrice']['amount']):.2f}", "--typ", "bild"]
    if time.time() - start > JURY_SEKUNDEN:
        args.append("--nur-cache")
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=240)
    except subprocess.TimeoutExpired:
        return 2
    return r.returncode if r.returncode in (0, 4) else 2


def soll_berechnen(gql, regel, log=print):
    maxn = regel.get("max_je_familie", 8)
    veto = {h for hs in regel.get("veto", {}).values() for h in hs}
    start = time.time()
    soll, info = {}, {}          # soll: pid → {"handle", "titel", "begriffe": [...]} ; info: familie → [handles]
    for fam in regel["familien"]:
        lage = anlass_lage(fam["anlass"]) if fam.get("anlass") else "alle"
        info[fam["name"]] = {"lage": lage, "produkte": [], "durchgefallen": []}
        if lage == "vorbei":
            log(f"== {fam['name']}: Anlass {fam['anlass']} vorbei — keine Boosts"); continue
        roh = kandidaten(gql, fam)
        gut = []
        for p in roh:
            if p["status"] != "ACTIVE" or not p.get("onlineStoreUrl") or p["handle"] in veto:
                continue
            vs = p["variants"]["nodes"]
            if not any(v["availableForSale"] for v in vs):
                continue
            sk = (vs[0].get("sku") if vs else "") or ""
            p["_schnell"] = schnell(p["tags"], sk)
            if lage == "nur_schnell" and not p["_schnell"]:
                continue
            if passt(fam, p["title"], p["tags"], p["mediaCount"]["count"]):
                gut.append(p)
        if fam.get("schnell_zuerst"):
            gut = [p for p in gut if p["_schnell"]] + [p for p in gut if not p["_schnell"]]
        gewaehlt, je_stamm = [], {}
        vmax = fam.get("vielfalt_max")
        for p in gut:
            if len(gewaehlt) >= maxn:
                break
            st = vielfalt_schluessel(p["title"], regel.get("vielfalt_staemme", [])) if vmax else None
            if st and je_stamm.get(st, 0) >= vmax:
                continue
            if jury_urteil(p, start) == 4:
                info[fam["name"]]["durchgefallen"].append(p["handle"]); continue
            gewaehlt.append(p)
            if st:
                je_stamm[st] = je_stamm.get(st, 0) + 1
        log(f"== {fam['name']} ({lage}): {len(roh)} Quelle · {len(gut)} passend · {len(gewaehlt)} gewählt"
            + (f" · Jury raus {len(info[fam['name']]['durchgefallen'])}" if info[fam['name']]['durchgefallen'] else ""))
        for p in gewaehlt:
            log(f"   {'CH' if p['_schnell'] else '  '} CHF {float(p['priceRangeV2']['minVariantPrice']['amount']):7.2f}  {p['title'][:70]}")
            e = soll.setdefault(p["id"], {"handle": p["handle"], "titel": p["title"], "bild": (p.get("featuredImage") or {}).get("url"), "begriffe": []})
            e["begriffe"] += [norm_begriff(b) for b in fam["begriffe"]]
            info[fam["name"]]["produkte"].append(p["handle"])
    return soll, info


MARKE_TAG = "such-boost"


def lies_metafeld(gql, pid, mit_tags=False):
    d = gql('query($id:ID!){product(id:$id){handle tags metafield(namespace:"%s", key:"%s"){value}}}' % (NS, KEY), {"id": pid}).get("product")
    if not d:
        return (None, [], []) if mit_tags else (None, [])
    mf = d.get("metafield")
    werte = json.loads(mf["value"]) if mf and mf.get("value") else []
    return (d["handle"], werte, d.get("tags") or []) if mit_tags else (d["handle"], werte)


def tag_anstoss(gql, pid, tags, soll_aktiv):
    """12.10.: Ein reines Metafeld-Update stösst die Such-Indexierung NICHT an — 90 min nach dem Schreiben standen nur
    Boost-Produkte oben, die aus anderem Grund geändert worden waren (Geschenk-Tags); Kostüme ohne andere Änderung nicht,
    Veto-Entfernungen auch nicht. Der Tag `such-boost` (setzen/entfernen) ist eine echte Produktänderung = Neu-Indexierung
    und zugleich eine Markierung. → True, wenn geändert."""
    hat = MARKE_TAG in tags
    if soll_aktiv == hat or not SCHARF:
        return False
    m = "tagsAdd" if soll_aktiv else "tagsRemove"
    r = gql('mutation($id:ID!,$t:[String!]!){%s(id:$id,tags:$t){userErrors{message}}}' % m, {"id": pid, "t": [MARKE_TAG]})[m]
    return not r["userErrors"]


def anwenden(gql, soll, log=print):
    stand = json.load(open(STAND)) if os.path.exists(STAND) else {}
    neu_stand, gesetzt, geloescht, gleich, fehler, abgeschnitten, angestossen = {}, 0, 0, 0, 0, 0, 0
    for pid in sorted(set(stand) | set(soll)):
        eigen_alt = {norm_begriff(b) for b in stand.get(pid, {}).get("begriffe", [])}
        handle, ist, tags = lies_metafeld(gql, pid, mit_tags=True)
        if handle is None:            # Produkt gelöscht
            continue
        angestossen += tag_anstoss(gql, pid, tags, bool(soll.get(pid, {}).get("begriffe")))
        fremde = [b for b in ist if norm_begriff(b) not in eigen_alt]
        eigen_neu = soll.get(pid, {}).get("begriffe", [])
        ziel, weg = begriffe_zusammen(eigen_neu, fremde)
        abgeschnitten += len(weg)
        if weg:
            log(f"   ⚠️ {handle}: mehr als 10 Begriffe — weggelassen {weg}")
        behalten = [b for b in ziel if b in {norm_begriff(x) for x in eigen_neu}]
        if behalten:
            neu_stand[pid] = {"handle": handle, "begriffe": behalten}
        if [norm_begriff(b) for b in ist] == ziel:
            gleich += 1; continue
        if not SCHARF:
            log(f"   (trocken) {handle}: {ist} → {ziel}"); continue
        if ziel:
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}',
                    {"m": [{"ownerId": pid, "namespace": NS, "key": KEY, "type": "list.single_line_text_field",
                            "value": json.dumps(ziel, ensure_ascii=False)}]})["metafieldsSet"]
        else:
            r = gql('mutation($m:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$m){userErrors{field message}}}',
                    {"m": [{"ownerId": pid, "namespace": NS, "key": KEY}]})["metafieldsDelete"]
        _, zurueck = lies_metafeld(gql, pid)
        if r["userErrors"] or [norm_begriff(b) for b in zurueck] != ziel:
            fehler += 1; log(f"   ✗ {handle}: {r['userErrors']} · zurück {zurueck}"); continue
        if ziel:
            gesetzt += 1
        else:
            geloescht += 1
            if MARKE_TAG not in tags:          # nie markiert → Anstoss über Setzen + Entfernen (Index vergisst den Boost sonst nicht)
                for m in ("tagsAdd", "tagsRemove"):
                    gql('mutation($id:ID!,$t:[String!]!){%s(id:$id,tags:$t){userErrors{message}}}' % m, {"id": pid, "t": [MARKE_TAG]})
                angestossen += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{handle}\t{json.dumps(ist, ensure_ascii=False)}\t{json.dumps(ziel, ensure_ascii=False)}\n")
    if SCHARF:
        json.dump(neu_stand, open(STAND, "w"), ensure_ascii=False, indent=1, sort_keys=True)
    return dict(gesetzt=gesetzt, geloescht=geloescht, gleich=gleich, fehler=fehler, abgeschnitten=abgeschnitten, angestossen=angestossen,
                eigene=len(neu_stand) if SCHARF else len(soll))


def such_top(begriff, n=8):
    # _lx = Zeitstempel: ohne ihn liefert der Edge-Cache unserer IP Stunden alte Seiten (12.10.: «kostüm» Zeichen für
    # Zeichen wie um 19:08); mit ihm rechnet Shopify neu (Platz 5 wechselte). options[prefix]=last wie das Theme-Formular.
    u = ("https://luxestyle.ch/search?type=product&options%5Bprefix%5D=last&q=" + urllib.parse.quote(begriff)
         + f"&_lx={int(time.time())}")
    r = subprocess.run(["curl", "-s", "--max-time", "60", u], capture_output=True, text=True)
    h = r.stdout
    i, j = h.find("<main"), h.find("</main>")
    mm = h[i:j] if i > 0 else h
    out = []
    for x in re.findall(r'href="/products/([^"?#]+)', mm):
        if x not in out:
            out.append(x)
    return out[:n]


BERICHT = os.path.join(REPO, "dropship", "SUCH-BOOSTS.md")


def messen(gql, regel):
    """Enter-Suche (/search?type=product) je Familie, die ersten zwei Begriffe: wie viele der ersten 8 sind Soll-Ware.
    Schreibt dropship/SUCH-BOOSTS.md (erste fette Zeile = Ampel). Shopify zieht den Index mit Verzug nach — erst
    ≥ 60 min nach dem Schreiben messen (gemessen 12.10.: nach 30 min standen oben noch die Boosts des VORLETZTEN Laufs; der Aufseher wartet 60 min)."""
    soll, info = soll_berechnen(gql, regel, log=lambda *_: None)
    unten, zeilen = [], []
    for fam in regel["familien"]:
        hs = set(info[fam["name"]]["produkte"])
        if not hs:
            continue
        for b in fam["begriffe"][:2]:
            top = such_top(b)
            treffer = sum(h in hs for h in top)
            soll_n = min(len(hs), 8)
            print(f"  {fam['name']:14} «{b}»: {treffer}/{soll_n} Soll-Ware in den ersten 8 · {top[:3]}")
            zeilen.append(f"| {fam['name']} | {b} | {treffer}/{soll_n} | {', '.join(top[:3])} |")
            if not top:
                unten.append(b + " (Seite leer)")
            elif treffer < min(6, soll_n):
                unten.append(b)
    fam_n = len([f for f in regel["familien"] if info[f["name"]]["produkte"]])
    ampel = (f"SUCHSEITE: {fam_n} Familien · {len(soll)} Produkte · {len(unten)} Begriffe unter 6/8"
             + (f" ({', '.join(unten[:6])})" if unten else ""))
    print(ampel)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Such-Boosts — Messung der Enter-Suche\n\nStand: {dt.datetime.utcnow():%Y-%m-%d %H:%M} UTC\n\n**{ampel}**\n\n"
                "Werkzeug `automation/such_boost.py --messen`, Regel `automation/data/such_boosts.json`. Soll-Ware = die geboosteten "
                "Produkte der Familie. Unter 6/8: Index noch nicht nachgezogen, Boost greift für diesen Wortlaut nicht, oder "
                "die Suchseite liefert Fremdes vor dem Boost.\n\n| Familie | Begriff | Soll in Top 8 | erste 3 |\n|---|---|---|---|\n"
                + "\n".join(zeilen) + "\n")
    return 0


def kontaktbogen(gql, regel):
    soll, _ = soll_berechnen(gql, regel, log=lambda *_: None)
    liste = [{"url": (e["bild"] or "") + ("&width=400" if "?" in (e["bild"] or "") else "?width=400"),
              "titel": e["titel"][:40], "id": e["handle"]} for e in soll.values() if e.get("bild")]
    for i in range(0, len(liste), 30):
        p = f"/tmp/such_boost_liste_{i // 30}.json"
        json.dump(liste[i:i + 30], open(p, "w"), ensure_ascii=False)
        subprocess.run(["python3", os.path.join(HIER, "bild_kontaktbogen_liste.py"), p, f"such_boost{i // 30}"])
    return 0


def main():
    from seo_autopilot import gql
    regel = json.load(open(REGEL))
    if "--messen" in sys.argv:
        return messen(gql, regel)
    if "--kontaktbogen" in sys.argv:
        return kontaktbogen(gql, regel)
    soll, info = soll_berechnen(gql, regel)
    z = anwenden(gql, soll)
    print(f"SUCH-BOOSTS: {len(regel['familien'])} Familien · {len(soll)} Produkte im Soll · "
          + (f"gesetzt {z['gesetzt']} · entfernt {z['geloescht']} · unverändert {z['gleich']} · Tag-Anstoss {z['angestossen']} · Fehler {z['fehler']}"
             if SCHARF else "trocken") + (f" · {z['abgeschnitten']} Begriffe über dem Deckel" if z["abgeschnitten"] else ""))
    return 1 if z["fehler"] else 0


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
