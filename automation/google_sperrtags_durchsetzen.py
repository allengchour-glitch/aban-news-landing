"""Setzt die Google-Ausschluss-Tags durch — unabhängig vom Anlegedatum.

Befund 23.09.2026 (Audit): 152 Suchtreffer, davon 87 mit einem exakten Tag aus
google_sperrliste.AUSSCHLUSS_TAGS standen im Google-Kanal (nicht-google-bewerben 33 von 34,
google-policy-flag 32/33, raucher 32/65, 18plus 28/56 …). Der Entscheid war getroffen, aber
nicht durchgesetzt: google_kanal_saeubern läuft im Aufseher mit SEIT=7 und prüft damit nur
Produkte der letzten sieben Tage — seit der Grind-Pause (05.09.) also keins mehr.
merchant_sperre_durchsetzen kennt nur 17 feste IDs.

Dieser Wächter fragt direkt «aktiv UND im Google-Kanal UND Sperr-Tag» und nimmt die Treffer
aus Google. Tags, die jede Bewerbung ausschliessen (Erotik, Rauch, 18+, nicht-bewerben …),
nehmen das Produkt zusätzlich aus den übrigen Werbekanälen (TikTok, Facebook & Instagram,
Pinterest) — dieselbe Hausregel wie in google_kanal_saeubern (29.08.). Onlineshop, Shop-App
und POS bleiben unberührt: die Ware bleibt kaufbar.

Rücklesen: publishedOnPublication je Kanal. DRY=1 zeigt nur.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import google_sperrliste as gs  # noqa: E402
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(d):
        return None

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_google_sperrtags_durchgesetzt.txt"
GOOGLE = "gid://shopify/Publication/302872297857"
WERBUNG = {
    "TikTok": "gid://shopify/Publication/302032716161",
    "Facebook & Instagram": "gid://shopify/Publication/302566834561",
    "Pinterest": "gid://shopify/Publication/302994456961",
}
# Tags, deren Grund für JEDE Bewerbung gilt, nicht nur für Google.
ALLE_WERBEKANAELE = {"nicht-bewerben", "18plus", "erotik", "raucher", "smoke-zubehoer",
                     "adult-nicht-bewerben", "gmc-adult-pull", "waffengesetz-verboten",
                     "verdeckte-ueberwachung", "messer-nicht-bewerben",
                     "waffe-pruefen"}  # 14.10.2026: Glock-Holster/AK74-Montage/Gewehrriemen trugen den Tag, standen aber auf TikTok/FB-IG/Pinterest (Hausregel 29.08.: Waffe = alle Werbekanäle)


def gql(q, v=None):
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "-m", "60", "-X", "POST",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if any("THROTTLED" in json.dumps(e) for e in d.get("errors") or []):
            time.sleep(10)
            continue
        nachlauf(d)
        return d
    raise SystemExit("ABBRUCH: Shopify antwortet nicht")


# 20.10.2026: gs.ausschluss_tag() kennt auch den Präfix `google-gesperrt-*` (von Google gemeldete Verstösse; merchant_issue_fix.py
# legt ihn an UND nimmt aus dem Kanal), aber die Suche unten fragte nur die exakten Tags aus AUSSCHLUSS_TAGS — wer einen
# `google-gesperrt-adult` per Hand setzte, blieb im Google-Kanal (gemessen 20.10.: 3 Produkte, Trockenlauf fand 0).
PRAEFIX_SUCHTAGS = ("google-gesperrt-adult", "google-gesperrt-cbd", "google-gesperrt-notlage")


# 22.10.2026 (Sauber-Inventur G6): gs.ausschluss_tag() erklärt JEDEN Tag mit Präfix `google-kanal-` als Ausschluss, die Vorfilter-Suche kannte aber nur
# feste Namen — `google-kanal-markenware-unklar` (Seagate Exos 10 TB, ACTIVE, im Google-Kanal) fiel durch. Shopify kann keine Tag-Präfix-Suche; deshalb
# werden die real vorhandenen Tags aus `productTags` gelesen (GEMESSEN 22.10.: 4'141 Tags, 17 Seiten, 7 s) und nach Präfix gefiltert.
# ⚠️ KORREKTUR 22.10. abends (unabhängige Gegenprüfung): `google-gesperrt-fehlalarm` ist KEINE Freigabe, sondern ein Ausschluss — merchant_issue_fix.py setzte es am
# 20.10. 15:22 auf zwei von Google gemeldete Produkte («Tabak»/«Sale of live animals», Weihrauchhalter, Katzenangel-Federn), um sie AUS dem Google-Kanal zu nehmen
# (Onlineshop bleibt; dropship/_merchant_issue_done.txt). «Fehlalarm» beschreibt Googles Diagnose, nicht unsere Entscheidung. Meine erste Fassung nahm das Tag als
# Ausnahme aus — beide Produkte wurden vom nächtlichen google_kanal_luecke wieder publiziert und von hier nicht mehr gefunden. Es gibt keine Ausnahmen.
PRAEFIXE = ("google-kanal-", "google-gesperrt-")


def waehle_praefix_tags(alle):
    """Rein: aus allen Shop-Tags die Sperr-Tags mit Präfix (jedes Tag mit diesem Präfix ist ein Ausschluss)."""
    return sorted({t for t in alle if t.lower().startswith(PRAEFIXE)})


def praefix_tags_live():
    """Alle real vorhandenen Präfix-Sperr-Tags des Shops; bei Fehler leer (der Aufrufer fällt auf die festen Namen zurück)."""
    alle, cur = [], None
    for _ in range(80):
        try:
            d = gql("query($c:String){ productTags(first:250, after:$c){ pageInfo{hasNextPage endCursor} edges{node} } }", {"c": cur})
            pt = d["data"]["productTags"]
        except Exception as e:  # noqa: BLE001
            print(f"⚠️ productTags nicht lesbar ({type(e).__name__}) — nur feste Sperr-Tags")
            return []
        alle += [e["node"] for e in pt["edges"]]
        if not pt["pageInfo"]["hasNextPage"]:
            return waehle_praefix_tags(alle)
        cur = pt["pageInfo"]["endCursor"]
    return waehle_praefix_tags(alle)


def suchtags():
    """Alle exakten Tags, nach denen die Vorfilter-Suche fragt (Ausschluss-Tags + bekannte Google-Sperr-Tags + alle Präfix-Sperr-Tags des Shops)."""
    return sorted(set(gs.AUSSCHLUSS_TAGS) | set(PRAEFIX_SUCHTAGS) | set(praefix_tags_live()))


def praefix_selbsttest():
    """Reiner Test von waehle_praefix_tags mit drei Mutanten (Präfix google-kanal- / google-gesperrt- vergessen, Gross/klein). → Fehlerliste."""
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        alle = ["google-kanal-markenware-unklar", "google-kanal-klinge-outdoor", "google-gesperrt-adult", "google-gesperrt-fehlalarm",
                "Google-Kanal-Neu", "kostuem", "google-kanal", "xgoogle-kanal-x"]
        w = m.waehle_praefix_tags(alle)
        if w != ["Google-Kanal-Neu", "google-gesperrt-adult", "google-gesperrt-fehlalarm", "google-kanal-klinge-outdoor", "google-kanal-markenware-unklar"]:
            f.append(f"Auswahl falsch: {w}")
        return f
    fehler = faelle(sys.modules[__name__])
    for name, alt, neu in (("google-gesperrt- vergessen", 'PRAEFIXE = ("google-kanal-", ' + '"google-gesperrt-")', 'PRAEFIXE = ("google-kanal-",)'),
                           ("google-kanal- vergessen", 'PRAEFIXE = ("google-kanal-", ' + '"google-gesperrt-")', 'PRAEFIXE = ("google-gesperrt-",)'),
                           ("Gross/klein", "t.lower().startswith(PRAEFIXE)", "t.startswith(PRAEFIXE)")):
        if quelle.count(alt) < 1:
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu, 1), "mutant", "exec"), m.__dict__)
        if not faelle(m):
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    return fehler


def kandidaten():
    tags = " OR ".join(f"tag:'{t}'" for t in suchtags())
    q = f"status:active AND publication_ids:{GOOGLE.rsplit('/', 1)[1]} AND ({tags})"
    # Kanarienvogel: ein Tag, den es nicht gibt, muss 0 ergeben — sonst ignoriert Shopify den Filter.
    kan = gql("query($q:String){productsCount(query:$q,limit:null){count}}",
              {"q": f"status:active AND publication_ids:{GOOGLE.rsplit('/', 1)[1]} AND tag:'zzz-kanarienvogel-xyz'"})
    if kan["data"]["productsCount"]["count"] != 0:
        raise SystemExit("ABBRUCH: Tag-Filter wird ignoriert (Kanarienvogel > 0)")
    raus, nach = [], None
    while True:
        d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){
          pageInfo{hasNextPage endCursor} nodes{id handle title tags}}}""", {"q": q, "n": nach})
        p = d["data"]["products"]
        raus += p["nodes"]
        if not p["pageInfo"]["hasNextPage"]:
            return raus
        nach = p["pageInfo"]["endCursor"]


def nur_werbekanal_kandidaten():
    """13.10.2026: Produkte mit einem Alle-Kanäle-Tag (ALLE_WERBEKANAELE), die NICHT mehr im Google-Kanal, aber noch in
    TikTok / Facebook & Instagram / Pinterest stehen. kandidaten() fragt nur «im Google-Kanal UND Tag» — ein Heil-Schmuck,
    der schon aus Google draussen war, wäre getaggt worden und trotzdem in den Werbekanälen geblieben. GEMESSEN 13.10.: 0
    exakte Träger (die 9 Suchtreffer trugen «lizenz-nicht-bewerben» — Shopifys tag:-Suche trifft Wortteile; Lizenz ist
    bewusst nur eine Google-Sperre). Entschieden wird am EXAKTEN Tag."""
    tags = " OR ".join(f"tag:'{t}'" for t in sorted(ALLE_WERBEKANAELE))
    pubs = " OR ".join(f"publication_ids:{v.rsplit('/', 1)[1]}" for v in WERBUNG.values())
    q = f"status:active AND -publication_ids:{GOOGLE.rsplit('/', 1)[1]} AND ({pubs}) AND ({tags})"
    raus, nach = [], None
    while True:
        d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){
          pageInfo{hasNextPage endCursor} nodes{id handle title tags}}}""", {"q": q, "n": nach})
        p = d["data"]["products"]
        raus += [x for x in p["nodes"] if {t.lower() for t in x["tags"]} & ALLE_WERBEKANAELE]
        if not p["pageInfo"]["hasNextPage"]:
            return raus
        nach = p["pageInfo"]["endCursor"]


def kostuem_titel_kandidaten():
    """13.10.2026: Kostüme/Kostüm-Masken OHNE Sperr-Tag im Google-Kanal finden (Titel-Regel gs.ist_kostuem).

    GEMESSEN 13.10.: 18 standen drin — 8 Horror-/Latex-Masken mit Typ «Hautpflege», 8 Plüsch-Tiermasken, «Kinderkostüm
    Falbala» (von einer Reaktivierung am 04.10. in alle 11 Kanäle gestellt), ein Haustier-Geisterkostüm. Dieser Wächter
    fragte nur exakte Tags. Die Suche ist Vorfilter, entschieden wird an gs.ist_kostuem (Kanarien vorher, 0 Fehler).
    """
    # 13.10. A4d: + Rollenwörter (Waggis, Nikolaus, Zimmermädchen …), die gs.kostuem_rolle() mit Kleidungsstück entscheidet
    worte = ["maske", "mask", "kostüm", "kostuem", "kostum", "verkleidung"] + list(gs.KOSTUEM_ROLLE_SUCHWORTE)
    q = (f"status:active AND publication_ids:{GOOGLE.rsplit('/', 1)[1]} AND ("
         + " OR ".join(f"title:*{w}*" for w in worte) + ")")
    raus, nach = [], None
    while True:
        d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){
          pageInfo{hasNextPage endCursor} nodes{id handle title tags productType}}}""", {"q": q, "n": nach})
        p = d["data"]["products"]
        raus += [x for x in p["nodes"] if gs.ist_kostuem(x["title"], x.get("productType") or "")
                 and not gs.ausschluss_tag(x["tags"])]
        if not p["pageInfo"]["hasNextPage"]:
            break
        nach = p["pageInfo"]["endCursor"]
    # ⚠️ Die Titelsuche findet «maske»/«kostüm» nur am WORTANFANG (GEMESSEN 13.10.: «Halbmaske», «Horrormaske»,
    # «Kinderkostüm» fehlten — 11 statt 18). Deshalb zusätzlich der tägliche Voll-Export (hype_export_bauen.py,
    # /tmp/export.jsonl, Felder status/title/productType/tags/g), jeder Treffer wird LIVE gegengeprüft.
    gesehen = {x["id"] for x in raus}
    exp = os.environ.get("EXPORT", "/tmp/export.jsonl")
    if os.path.exists(exp) and time.time() - os.path.getmtime(exp) < 30 * 3600:
        for zeile in open(exp, encoding="utf-8"):
            try:
                x = json.loads(zeile)
            except Exception:
                continue
            if (x.get("status") != "ACTIVE" or not x.get("g") or x["id"] in gesehen
                    or not gs.ist_kostuem(x.get("title") or "", x.get("productType") or "")
                    or gs.ausschluss_tag(x.get("tags"))):
                continue
            live = gql("query($id:ID!,$g:ID!){product(id:$id){id handle title tags productType status "
                       "publishedOnPublication(publicationId:$g)}}", {"id": x["id"], "g": GOOGLE})
            lp = (live.get("data") or {}).get("product")
            if (lp and lp["status"] == "ACTIVE" and lp["publishedOnPublication"]
                    and gs.ist_kostuem(lp["title"], lp.get("productType") or "") and not gs.ausschluss_tag(lp["tags"])):
                raus.append(lp)
                gesehen.add(lp["id"])
    else:
        print(f"⚠️ Export fehlt/zu alt ({exp}) — nur Titelsuche (Wortanfang)")
    return raus


def feuerzeug_kandidaten():
    """13.10.2026 (Betreiber «auch sonst normale feuerzeug»): Feuerzeuge im Google- ODER einem Werbekanal ohne Sperr-Tag.
    Titelsuche findet nur Wortanfänge («Sturmfeuerzeug» fehlt) → zusätzlich der Voll-Export, jeder Treffer live gegengeprüft."""
    kanaele = [GOOGLE] + list(WERBUNG.values())
    raus, gesehen, ids = [], set(), []
    for q in ("title:*feuerzeug* OR title:*lighter* OR title:*Zigarrenanzünder*",):
        nach = None
        while True:
            d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){pageInfo{hasNextPage endCursor}
              nodes{id}}}""", {"q": "status:active AND (" + q + ")", "n": nach})
            p = d["data"]["products"]
            ids += [x["id"] for x in p["nodes"]]
            if not p["pageInfo"]["hasNextPage"]:
                break
            nach = p["pageInfo"]["endCursor"]
    exp = os.environ.get("EXPORT", "/tmp/export.jsonl")
    if os.path.exists(exp) and time.time() - os.path.getmtime(exp) < 30 * 3600:
        for zeile in open(exp, encoding="utf-8"):
            try:
                x = json.loads(zeile)
            except Exception:
                continue
            if x.get("status") == "ACTIVE" and gs.ist_feuerzeug(x.get("title") or ""):
                ids.append(x["id"])
    else:
        print(f"⚠️ Export fehlt/zu alt ({exp}) — Feuerzeuge nur über die Titelsuche (Wortanfang)")
    for pid in dict.fromkeys(ids):
        if pid in gesehen:
            continue
        gesehen.add(pid)
        q = "query($id:ID!" + "".join(f",$k{i}:ID!" for i in range(len(kanaele))) + "){product(id:$id){id handle title tags status " + \
            " ".join(f"p{i}:publishedOnPublication(publicationId:$k{i})" for i in range(len(kanaele))) + "}}"
        v = {"id": pid, **{f"k{i}": k for i, k in enumerate(kanaele)}}
        lp = ((gql(q, v).get("data") or {}).get("product")) or {}
        if (lp.get("status") == "ACTIVE" and gs.ist_feuerzeug(lp["title"])
                and "smoke-zubehoer" not in {t.lower() for t in lp["tags"]}
                and any(lp.get(f"p{i}") for i in range(len(kanaele)))):
            raus.append(lp)
    return raus


HEILSCHMUCK_LEDGER = "dropship/_heilschmuck_getaggt.tsv"


def heilschmuck_kandidaten():
    """13.10.2026: Heil-Schmuck (gs.ist_heilschmuck, Regel data/heilschmuck_regel.json) im Google- ODER einem Werbekanal
    ohne «nicht-bewerben». GEMESSEN 13.10.: «Terahertz Armband – Energie & Balance» und «Kupfer-Armband mit negativen Ionen»
    standen in allen vier Kanälen — keine Wache kannte die Klasse (dieser Durchsetzer las nur Tags, die niemand setzte).
    Titelsuche findet nur Wortanfänge («Magnettherapie-Armband» ja, «Kupfer-Magnettherapie…» nein) → zusätzlich der
    Voll-Export, jeder Treffer LIVE gegengeprüft. Gibt Produkte samt Kanalstand (für das Altwerte-Ledger) zurück."""
    kanaele = [GOOGLE] + list(WERBUNG.values())
    ids, nach = [], None
    q = "status:active AND (" + " OR ".join(f"title:*{w}*" for w in gs.HEILSCHMUCK_SUCHWORTE) + ")"
    while True:
        d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){pageInfo{hasNextPage endCursor}
          nodes{id title}}}""", {"q": q, "n": nach})
        p = d["data"]["products"]
        ids += [x["id"] for x in p["nodes"] if gs.ist_heilschmuck(x["title"])]
        if not p["pageInfo"]["hasNextPage"]:
            break
        nach = p["pageInfo"]["endCursor"]
    exp = os.environ.get("EXPORT", "/tmp/export.jsonl")
    if os.path.exists(exp) and time.time() - os.path.getmtime(exp) < 30 * 3600:
        for zeile in open(exp, encoding="utf-8"):
            try:
                x = json.loads(zeile)
            except Exception:
                continue
            if x.get("status") == "ACTIVE" and gs.ist_heilschmuck(x.get("title") or ""):
                ids.append(x["id"])
    else:
        print(f"⚠️ Export fehlt/zu alt ({exp}) — Heil-Schmuck nur über die Titelsuche (Wortanfang)")
    raus = []
    for pid in dict.fromkeys(ids):
        q = "query($id:ID!" + "".join(f",$k{i}:ID!" for i in range(len(kanaele))) + "){product(id:$id){id handle title tags status " + \
            " ".join(f"p{i}:publishedOnPublication(publicationId:$k{i})" for i in range(len(kanaele))) + "}}"
        lp = ((gql(q, {"id": pid, **{f"k{i}": k for i, k in enumerate(kanaele)}}).get("data") or {}).get("product")) or {}
        if (lp.get("status") == "ACTIVE" and gs.ist_heilschmuck(lp["title"])
                and "nicht-bewerben" not in {t.lower() for t in lp["tags"]}
                and any(lp.get(f"p{i}") for i in range(len(kanaele)))):
            lp["_kanaele"] = [k for i, k in enumerate(kanaele) if lp.get(f"p{i}")]
            raus.append(lp)
    return raus


def main():
    if "--kanarien" in sys.argv:
        fp = praefix_selbsttest()
        for e in fp:
            print(f"  FEHLER Präfix-Tags: {e}")
        print(f"FERTIG: Präfix-Tag-Selbsttest (1 Fall, 3 Mutanten), {len(fp)} Fehler")
        if fp:
            sys.exit(1)
        n3, f3 = gs.heilschmuck_kanarien()
        for t, e in f3:
            print(f"  FEHLER Heil-Schmuck: «{t}» erwartet {e}")
        print(f"FERTIG: {n3} Heil-Schmuck-Kanarien, {len(f3)} Fehler")
        if f3:
            sys.exit(1)
        n2, f2 = gs.feuerzeug_kanarien()
        for t, e in f2:
            print(f"  FEHLER Feuerzeug: «{t}» erwartet {e}")
        print(f"FERTIG: {n2} Feuerzeug-Kanarien, {len(f2)} Fehler")
        n, f = gs.kostuem_kanarien()
        for t, ty, e in f:
            print(f"  FEHLER: «{t}» ({ty}) erwartet {e}")
        print(f"FERTIG: {n} Kostüm-Kanarien, {len(f)} Fehler")
        sys.exit(1 if (f or f2) else 0)
    # Kostüm-Titelregel: erst Kanarien, dann taggen (exakter Tag «kostuem» — keine Smart-Kollektion filtert darauf,
    # GEMESSEN 13.10.), danach greift der normale Ablauf unten.
    n, f = gs.kostuem_kanarien()
    if f:
        print(f"⚠️ Kostüm-Kanarien: {len(f)} von {n} falsch — Titelregel übersprungen")
    else:
        neu = kostuem_titel_kandidaten()
        print(f"Kostüm-Titelregel: {len(neu)} ohne Sperr-Tag im Google-Kanal")
        for p in neu:
            print(f"  + kostuem (Titel) | {(p.get('productType') or '')[:20]:20} | {p['title'][:70]}")
            if DRY:
                continue
            d = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
                    {"id": p["id"], "t": ["kostuem"]})
            # 13.10. Prüfung: `.get("tagsAdd", {})` stürzte bei `tagsAdd: null` ab, Top-Level-`errors` galten still als Erfolg.
            ta = (d.get("data") or {}).get("tagsAdd") or {}
            if ta.get("userErrors") or d.get("errors") or not d.get("data"):
                print(f"    ⚠️ Tag nicht gesetzt: {ta.get('userErrors') or str(d.get('errors'))[:160]}")
        if neu and not DRY:
            time.sleep(20)   # Suchindex braucht einen Moment, bis tag:'kostuem' die neuen Träger findet
    # Feuerzeug-Regel (13.10.2026): Tag «smoke-zubehoer» → unten raus aus Google + allen Werbekanälen (ALLE_WERBEKANAELE).
    n2, f2 = gs.feuerzeug_kanarien()
    if f2:
        print(f"⚠️ Feuerzeug-Kanarien: {len(f2)} von {n2} falsch — Feuerzeug-Regel übersprungen")
    else:
        fz = feuerzeug_kandidaten()
        print(f"Feuerzeug-Regel: {len(fz)} ohne smoke-zubehoer in Google/Werbekanälen")
        for p in fz:
            print(f"  + smoke-zubehoer (Feuerzeug) | {p['title'][:70]}")
            if DRY:
                continue
            d = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
                    {"id": p["id"], "t": ["smoke-zubehoer"]})
            ta = (d.get("data") or {}).get("tagsAdd") or {}
            if ta.get("userErrors") or d.get("errors") or not d.get("data"):
                print(f"    ⚠️ Tag nicht gesetzt: {ta.get('userErrors') or str(d.get('errors'))[:160]}")
        if fz and not DRY:
            time.sleep(20)
    # Heil-Schmuck (13.10.2026): Tags «nicht-bewerben» + «heilschmuck» → unten raus aus Google + allen Werbekanälen.
    # Altwerte-Ledger (Tags und Kanäle VORHER) = Rückweg: tagsRemove [nicht-bewerben, heilschmuck] + publishablePublish.
    n3, f3 = gs.heilschmuck_kanarien()
    if f3:
        print(f"⚠️ Heil-Schmuck-Kanarien: {len(f3)} von {n3} falsch — Heil-Schmuck-Regel übersprungen")
    else:
        hs = heilschmuck_kandidaten()
        print(f"Heil-Schmuck-Regel: {len(hs)} ohne nicht-bewerben in Google/Werbekanälen")
        for p in hs:
            print(f"  + nicht-bewerben, heilschmuck (Heil-Schmuck) | {p['title'][:70]}")
            if DRY:
                continue
            d = gql("mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}",
                    {"id": p["id"], "t": ["nicht-bewerben", "heilschmuck"]})
            ta = (d.get("data") or {}).get("tagsAdd") or {}
            if ta.get("userErrors") or d.get("errors") or not d.get("data"):
                print(f"    ⚠️ Tag nicht gesetzt: {ta.get('userErrors') or str(d.get('errors'))[:160]}")
                continue
            with open(HEILSCHMUCK_LEDGER, "a") as f:
                f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{p['id']}\t{p['handle']}\t{p['title']}\t"
                        f"{','.join(p['tags'])}\t{','.join(p['_kanaele'])}\n")
        if hs and not DRY:
            time.sleep(20)
    roh = kandidaten()
    # Shopifys tag:'kostuem' trifft auch «kostuem-hut» (Plüschmützen, 65 am 23.09.) — die Suche
    # ist nur der Vorfilter, entschieden wird am exakten Tag.
    ks = [p for p in roh if gs.ausschluss_tag(p["tags"])]
    print(f"{len(roh)} Suchtreffer, {len(ks)} mit exaktem Ausschluss-Tag im Google-Kanal")
    schon = {p["id"] for p in ks}
    extra = [p for p in nur_werbekanal_kandidaten() if p["id"] not in schon]
    print(f"{len(extra)} mit Alle-Kanäle-Tag nur noch in Werbekanälen (ausserhalb Google)")
    ok = fehl = 0
    for p in ks + extra:
        tg = {t.lower() for t in p["tags"]}
        grund = gs.ausschluss_tag(p["tags"])
        kanaele = {"Google & YouTube": GOOGLE}
        if tg & ALLE_WERBEKANAELE:
            kanaele.update(WERBUNG)
        print(f"  {grund[:40]:40} {len(kanaele)} Kan. | {p['title'][:70]}")
        if DRY:
            continue
        d = gql("""mutation($id:ID!,$in:[PublicationInput!]!){publishableUnpublish(id:$id,input:$in){
                  userErrors{message}}}""",
                {"id": p["id"], "in": [{"publicationId": v} for v in kanaele.values()]})
        fe = (d.get("data") or {}).get("publishableUnpublish", {}).get("userErrors") or d.get("errors")
        # 13.10.2026: Rücklesen JEDES Kanals, aus dem genommen wurde (vorher nur Google).
        kv = list(kanaele.values())
        chk = gql("query($id:ID!" + "".join(f",$k{i}:ID!" for i in range(len(kv))) + "){product(id:$id){"
                  + " ".join(f"p{i}:publishedOnPublication(publicationId:$k{i})" for i in range(len(kv))) + "}}",
                  {"id": p["id"], **{f"k{i}": k for i, k in enumerate(kv)}})
        noch = any(chk["data"]["product"].get(f"p{i}") for i in range(len(kv)))
        if fe or noch:
            fehl += 1
            print(f"    ⚠️ nicht raus: {fe or 'noch publiziert'}")
            continue
        ok += 1
        with open(LEDGER, "a") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{p['id']}\t{grund}\t"
                    f"{'+'.join(kanaele)}\t{p['handle']}\n")
    print(f"FERTIG: {ok} aus Werbekanälen genommen, {fehl} Fehler{' (DRY)' if DRY else ''}")


if __name__ == "__main__":
    main()
