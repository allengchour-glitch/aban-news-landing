#!/usr/bin/env python3
"""versprechen_wache.py — Liefer- und Eigenversprechen ohne Beleg aus Titel, Text und Google-Feldern (08.10.2026).

ANLASS (Betreiber 08.10. «verbessere alles und sauber»): Die Seite mit dem meisten Kaufwillen ohne Kauf (Leinen-Set
«Provence», 41 Sitzungen, 2 Warenkörbe, 0 Käufe) verspricht in der Google-Beschreibung «Schweizer Shop, schnelle
Lieferung» — auf derselben Seite steht «Lieferzeit Schweiz: 10–20 Werktage». GEMESSEN am SEO-Export (51'652 aktive):
106 solche Beschreibungen (100 CJ 10–20 Werktage, 6 Poster 7–14), dazu der Titel «Zigarettenhalter mit Band – Sofort
Lieferbar» (CJ-Neuimport; der Fix vom 12.08. traf ein älteres Produkt, der Importer brachte die Wendung zurück),
4× «Schweizer Shop · Qualität geprüft» (seit 02.09. heisst der Baustein «Geprüfte Angaben» — prüfen tun wir die
Angaben, nicht die Ware) und 6× «meistverkauft» (3 Verkäufe in 30 Tagen).

Wer «schnell» liest und 15 Werktage wartet, schreibt eine Mail oder storniert (Hängematte, 12.08.). Lieferversprechen
bleiben nur bei Ware mit Schweizer Lager stehen (Tag `ch-lager`, Fortura) — für alle anderen ersetzt durch die
wahre, neutrale Aussage «Lieferung in die ganze Schweiz».

REGEL: automation/data/versprechen_regel.json — EINE Datei, auch für die Importer (cj_copy_prompt.mjs versprechenSicher).
Schreibt Titel, Beschreibung, SEO-Titel/-Beschreibung (immer BEIDE SEO-Felder, Lehre 30.09.) und Bild-Alt-Texte (seit
08.10. abends: nach dem Diamant-Lauf trugen die Bilder noch «… mit Diamanten – Bild 2», live gesehen), liest zurück.
Handles bleiben (Umbenennen braucht 301) — sie stehen im Bericht.
DRY=1 zeigt nur. CACHE_NUTZEN=1 nimmt den letzten Export. --selbsttest prüft die Kanarien.

NACHTRAG 13.10.2026 spät (Kauf-Strecke Klassen 5/7/16, Abschnitt «editor_rueckgabe»): Zeile «EDITOR-RÜCKGABE: n von m
Editor-Produkten ohne Ausschluss-Satz · Theme ok/FEHLT» — zählt Editor-Produkte (lspod-designer) ohne Rückgabe-Ausschluss im Text
(Schreiber: automation/editor_rueckgabe_satz.py) und prüft die Pflicht-Zeichenfolgen in templates/product.json + cart.json
(Leiste/Akkordeon/Korb «Ersatz bei Druckfehlern», Brotkrumen trend/Doppel/Damen-Kette, Liefergebiet). Schreibt nichts.

NACHTRAG 13.10.2026 (Kauf-Strecke Klasse 12, Abschnitt «kosmetik_beleg» der Regeldatei) — zwei ZÄHL-Regeln, schreiben nichts:
  · «Geprüfte Angaben ohne Beleg»: Kosmetik (Hautpflege/Make-up/Haarpflege) ohne Inhaltsstoff-Liste im Text (Marker
    INCI · «Inhaltsstoffe:» · «Ingredients:» · «Zutaten:» — dieselben Zeichenfolgen prüft die Theme-Bedingung). Gemessen 13.10.:
    1'769 von 1'773 ohne Liste. Sichtbar ist «Geprüfte Angaben» dort nur, solange die Theme-Bedingung (Marker
    «kosmetik-inci-bedingung» in templates/product.json) fehlt → Zeile «GEPRÜFT-OHNE-INCI: n Kosmetik ohne Liste · sichtbar m».
  · «Reinstoff-Titel gegen INCI»: Titel nennt einen Reinstoff («Tunmate Rizinusöl», «… Arganöl», «Shea Butter»), der Text belegt
    eine Mischung (Mineral Oil, Paraffin, Fragrance/Duftstoff, «Ölmischung») → Meldung im Bericht. Reinstoff-Titel OHNE Liste
    stehen ebenfalls im Bericht (Karton im Bild zweimal lesen, erst dann Titel ändern). NUR=kosmetik zählt ohne den Rest.
"""
import json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
REGEL = json.load(open(os.path.join(HIER, "data", "versprechen_regel.json"), encoding="utf-8"))
DRY = os.environ.get("DRY") == "1"
CACHE = "/tmp/versprechen_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_versprechen_wache.tsv")
BERICHT = os.path.join(REPO, "dropship", "VERSPRECHEN-WACHE.md")
K_BERICHT = os.path.join(REPO, "dropship", "KOSMETIK-BELEG.md")
BULK = ('{ products(query: "status:active") { edges { node { id handle title productType tags descriptionHtml seo { title description } '
        'variants(first: 1) { edges { node { sku } } } media(first: 40) { edges { node { id alt } } } } } } }')
ALT_LEDGER = os.path.join(REPO, "dropship", "_versprechen_alt.tsv")
M_ALT = ('mutation($id:ID!,$m:[UpdateMediaInput!]!){productUpdateMedia(productId:$id,media:$m){media{id alt} '
         'mediaUserErrors{message}}}')


def _regeln(name, flags=re.I):
    return [(re.compile(a, flags), b) for a, b in REGEL.get(name, [])]


LIEFER_TITEL, LIEFER_SEO, LIEFER_TEXT = _regeln("liefer_titel"), _regeln("liefer_seo"), _regeln("liefer_text")
EIGEN_TEXT, EIGEN_GROSS = _regeln("eigen_text"), _regeln("eigen_text_gross", 0)


def _glätten(neu, alt):
    if neu == alt:
        return alt
    neu = re.sub(r"[ \t]{2,}", " ", neu)
    neu = re.sub(r"\s+([.,;:!?])", r"\1", neu)
    neu = re.sub(r"\s*[–—·-]\s*(?=</|$)", "", neu)            # nackter Gedankenstrich am Ende
    neu = re.sub(r"([.,;:])\1+", r"\1", neu)
    return neu.strip() if alt == alt.strip() else neu


def anwenden(regeln, t):
    neu = t or ""
    for rx, ers in regeln:
        neu = rx.sub(ers, neu)
    return _glätten(neu, t or "")


def titel(t):
    neu = anwenden(LIEFER_TITEL, t)
    # Ränder nur glätten, wenn eine Regel gegriffen hat — «… Passendes Halsketten-» (abgeschnittener Titel) ist kein Befund
    return neu.strip(" –—·-:") if neu != (t or "") else (t or "")


def seo(t):
    return anwenden(LIEFER_SEO, t)


def text_liefer(t):
    return anwenden(LIEFER_TEXT, t)


def text_eigen(t):
    return anwenden(EIGEN_GROSS, anwenden(EIGEN_TEXT, t))


# ── «Diamanten» bei Modeschmuck/Uhren/Taschen (08.10. «weiter sauber machen») ─────────────────────────────────────────
# Gemessen: 622 aktive mit «Diamant», teuerstes CHF 150.90 (Moissanit) — echte Diamanten führt der Shop nicht. Ersetzt wird
# nur die Verzierung («mit funkelnden Diamanten», «Diamant-Zifferblatt»); Vergleiche («brillanter als Diamant»), Formen
# («Diamant-Design»), Diamond Painting, Bausteine, Schleifwerkzeug und Karat/VVS/Moissanit-Angaben bleiben unberührt.
D = REGEL.get("diamant") or {}


def _drx(liste):
    return [(re.compile(r[0]), r[1].replace("$1", r"\1"), r[2] if len(r) > 2 else None, r[3] if len(r) > 3 else None)
            for r in liste]


D_STRASS, D_ZIRKONIA = _drx(D.get("strass", [])), _drx(D.get("zirkonia", []))
D_PRODUKT = re.compile(D.get("ausnahme_produkt") or r"(?!x)x", re.I)
D_KONTEXT = re.compile(D.get("ausnahme_kontext") or r"(?!x)x", re.I)
D_ZIRKON = re.compile(D.get("zirkon_beleg") or r"(?!x)x", re.I)
D_DATIV = re.compile(D.get("dativ_vor") or r"(?!x)x", re.I)
D_SINGULAR = re.compile(D.get("singular_vor") or r"(?!x)x", re.I)


def diamant(t, produkt=""):
    """Dekorative «Diamanten» → Strasssteine (Zirkonia, wenn Titel/Text Zirkonia nennen). produkt = Titel + Text."""
    t = t or ""
    if "iamant" not in t:
        return t
    ganz = f"{t} {produkt}"
    if D_PRODUKT.search(ganz):
        return t
    neu = t
    for rx, ers, dativ, einzahl in (D_ZIRKONIA if D_ZIRKON.search(ganz) else D_STRASS):
        def tausch(m, ers=ers, dativ=dativ, einzahl=einzahl):
            s = m.string
            if D_KONTEXT.search(s[max(0, m.start() - 50):m.end() + 50]):
                return m.group(0)
            e = ers
            vor = re.split(r"[.!?;:<>]", s[max(0, m.start() - 80):m.start()])[-1]
            if einzahl and D_SINGULAR.search(vor):
                e = einzahl
            elif dativ and D_DATIV.search(vor):
                e = dativ
            return m.expand(e)
        neu = rx.sub(tausch, neu)
    return neu


def schweiz_lager(tags, sku):
    tl = {x.lower() for x in tags or []}
    return bool(tl & set(REGEL["schweiz_lager"]["tags"])) or any(
        (sku or "").lower().startswith(p) for p in REGEL["schweiz_lager"]["sku_praefix"])


# ── Kosmetik: Inhaltsstoff-Beleg und Reinstoff-Titel (13.10.2026, Kauf-Strecke Klasse 12) ──────────────────────────────────
K = REGEL.get("kosmetik_beleg") or {}
K_TYPEN = set(K.get("typen") or [])
K_INCI = tuple(K.get("inci_marker") or ())
K_REIN = re.compile(K.get("reinstoff") or r"(?!x)x", re.I)
K_FORM = re.compile(K.get("reinstoff_form") or r"(?!x)x", re.I)
K_MISCH = re.compile(K.get("mischung_beleg") or r"(?!x)x", re.I)


def ist_kosmetik(p):
    return (p.get("productType") or "") in K_TYPEN


def inci_beleg(html):
    """Steht eine Inhaltsstoff-LISTE im Text? Dieselben Zeichenfolgen wie die Theme-Bedingung («contains» in Liquid) — ein
    «pflegende Inhaltsstoffe wie Honig» (62 Texte) ist keine Liste und zählt nicht."""
    return any(m in (html or "") for m in K_INCI)


def reinstoff_titel(t):
    """Titel verspricht einen Reinstoff: Stoffname ist das Produkt selbst, kein «Serum mit …», «Lippenbalsam mit Kokosöl»."""
    t = t or ""
    return bool(K_REIN.search(t)) and not K_FORM.search(K_REIN.sub(" ", t))


def mischung_beleg(html):
    return bool(K_MISCH.search(re.sub(r"<[^>]+>", " ", html or "")))


def theme_bedingung():
    """True/False: trägt templates/product.json im Haupt-Theme den Marker der INCI-Bedingung? None = nicht lesbar."""
    try:
        d = gql('{ themes(first: 1, roles: [MAIN]) { nodes { files(filenames: ["templates/product.json"]) { nodes { body { '
                '... on OnlineStoreThemeFileBodyText { content } } } } } } }')
        inhalt = d["themes"]["nodes"][0]["files"]["nodes"][0]["body"]["content"]
        return (K.get("theme_marker") or "kosmetik-inci-bedingung") in inhalt
    except Exception as e:  # Zählung bleibt gültig, nur «sichtbar» ist dann unklar
        print(f"   Theme nicht lesbar: {str(e)[:120]}", flush=True)
        return None


E = REGEL.get("editor_rueckgabe") or {}


def editor_ohne_satz(html):
    """Editor-Produkt (lspod-designer im Text) ohne Rückgabe-Ausschluss-Satz → True."""
    h = html or ""
    return (E.get("editor_marker") or "lspod-designer") in h and not any(x in h for x in E.get("satz") or [])


def theme_klassen():
    """13.10.2026 (Kauf-Strecke 5/7/16): Pflicht-Zeichenfolgen in den Live-Dateien → Liste fehlender Stellen (None = unlesbar)."""
    pflicht, verboten = E.get("theme_pflicht") or {}, E.get("theme_verboten") or {}
    namen = sorted(set(pflicht) | set(verboten))
    if not namen:
        return []
    try:
        d = gql('query($f:[String!]!){ themes(first: 1, roles: [MAIN]) { nodes { files(filenames: $f) { nodes { filename body { '
                '... on OnlineStoreThemeFileBodyText { content } } } } } } }', {"f": namen})
        t = {x["filename"]: x["body"]["content"] for x in d["themes"]["nodes"][0]["files"]["nodes"]}
    except Exception as e:  # noqa: BLE001
        print(f"   Theme nicht lesbar: {str(e)[:120]}", flush=True)
        return None
    fehlt = [f"{n.split('/')[-1]} ohne «{x}»" for n in pflicht for x in pflicht[n] if x not in t.get(n, "")]
    fehlt += [f"{n.split('/')[-1]} mit «{x[:40]}»" for n in verboten for x in verboten[n] if x in t.get(n, "")]
    return fehlt


def selbsttest():
    f = 0
    for art, ein, soll in REGEL["kanarien"]:
        ist = {"seo": seo, "titel": titel, "text": text_liefer, "eigen": text_eigen}[art](ein)
        if ist != soll:
            f += 1
            print(f"  ✗ {art}: {ein!r}\n      ist  {ist!r}\n      soll {soll!r}")
    for ein, produkt, soll in D.get("kanarien", []):
        ist = diamant(ein, produkt)
        if ist != soll:
            f += 1
            print(f"  ✗ diamant: {ein!r}\n      ist  {ist!r}\n      soll {soll!r}")
    for art, fn in (("reinstoff", reinstoff_titel), ("inci", inci_beleg), ("mischung", mischung_beleg)):
        for ein, soll in K.get(f"kanarien_{art}", []):
            if fn(ein) != soll:
                f += 1
                print(f"  ✗ {art}: {ein!r} → {fn(ein)} (soll {soll})")
    for ein, soll in (('<div class="lspod-designer"></div><p>x</p>', True),
                      ('<div class="lspod-designer"></div><div class="ls-pod-retoure">…</div>', False),
                      ('<p>eine Rückgabe aus Meinungsänderung ist darum ausgeschlossen</p><div class="lspod-designer">', False),
                      ('<p>Normales Produkt, 30 Tage Rückgabe</p>', False)):
        if editor_ohne_satz(ein) != soll:
            f += 1
            print(f"  ✗ editor_ohne_satz: {ein!r} → {editor_ohne_satz(ein)} (soll {soll})")
    n = 4 + len(REGEL["kanarien"]) + len(D.get("kanarien", [])) + sum(len(K.get(f"kanarien_{a}", [])) for a in ("reinstoff", "inci", "mischung"))
    print(f"Selbsttest: {n - f}/{n} ok")
    return f == 0


def gql(q, v=None):
    from kollektionstexte_nachbessern import gql as g        # Client-Credentials-Token, Retry, lauter Abbruch
    return g(q, v)


def export():
    m = gql('mutation { bulkOperationRunQuery(query: """%s""") { bulkOperation { id } userErrors { message } } }' % BULK)
    r = m["bulkOperationRunQuery"]
    if r["userErrors"]:
        raise SystemExit(f"Bulk-Start fehlgeschlagen: {r['userErrors']}")
    bid = r["bulkOperation"]["id"]                          # Status nur über die EIGENE Bulk-ID (Regel fremder-bulk)
    while True:
        time.sleep(15)
        b = gql('query($i:ID!){node(id:$i){... on BulkOperation{status objectCount url errorCode}}}', {"i": bid})["node"]
        print("   bulk:", b["status"], b["objectCount"], flush=True)
        if b["status"] == "COMPLETED":
            subprocess.run(["curl", "-sS", "-o", CACHE, b["url"]], check=True)
            return
        if b["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {b['status']} {b.get('errorCode')}")


def produkte():
    alle, sku, medien = {}, {}, {}
    for z in open(CACHE, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o:
            if "/ProductVariant/" in o.get("id", ""):
                sku.setdefault(o["__parentId"], o.get("sku") or "")
            elif "alt" in o:
                medien.setdefault(o["__parentId"], []).append(o)
        elif "handle" in o:
            alle[o["id"]] = o
    for pid, p in alle.items():
        p["_sku"] = sku.get(pid, "")
        p["_medien"] = medien.get(pid, [])
        yield p


def alts_schreiben(p, aend):
    """Bild-Alt-Texte (Schema «<Titel> – Bild N | LuxeStyle») — dieselbe Regel wie der Titel; Rücklesen auf Gleichheit."""
    r = gql(M_ALT, {"id": p["id"], "m": [{"id": i, "alt": n} for i, _, n in aend]})["productUpdateMedia"]
    live = {x["id"]: x["alt"] for x in (r.get("media") or [])}
    ok = 0
    with open(ALT_LEDGER, "a", encoding="utf-8") as f:
        for i, a, n in aend:
            gut = not r.get("mediaUserErrors") and live.get(i) == n
            ok += gut
            f.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), p["id"], i, (a or "").replace("\t", " "), n,
                                "ok" if gut else f"FEHLER {str(r.get('mediaUserErrors'))[:60]}"]) + "\n")
    return ok, len(aend) - ok


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if not selbsttest():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if not (os.environ.get("CACHE_NUTZEN") == "1" and os.path.exists(CACHE)):
        export()
    n = fix = fehl = 0
    zaehl, handles, beispiele, echt = {}, [], [], []
    nur_k = os.environ.get("NUR") == "kosmetik"
    kos_n = kos_ohne = 0
    rein_widerspruch, rein_offen = [], []
    ed_n, ed_ohne = 0, []
    for p in produkte():
        n += 1
        if (E.get("editor_marker") or "lspod-designer") in (p.get("descriptionHtml") or ""):   # 13.10.2026 Klasse 7
            ed_n += 1
            if editor_ohne_satz(p.get("descriptionHtml")):
                ed_ohne.append(p["handle"])
        lager = schweiz_lager(p.get("tags"), p["_sku"])
        s = p.get("seo") or {}
        neu = {}
        h = p.get("descriptionHtml") or ""
        if ist_kosmetik(p):                     # 13.10.2026: zählen, nichts schreiben (Klasse 12)
            kos_n += 1
            beleg = inci_beleg(h)
            kos_ohne += not beleg
            if reinstoff_titel(p["title"]):
                if mischung_beleg(h):
                    rein_widerspruch.append((p["handle"], p["title"]))
                elif not beleg:
                    rein_offen.append((p["handle"], p["title"]))
        if nur_k:
            continue
        ctx = f"{p['title']} {h}"
        t_neu = diamant(p["title"] if lager else titel(p["title"]), ctx)
        if t_neu != p["title"] and t_neu:
            neu["title"] = t_neu
        h_neu = diamant(text_eigen(h if lager else text_liefer(h)), ctx)
        if h_neu != h:
            neu["descriptionHtml"] = h_neu
        st, sd = s.get("title"), s.get("description")
        st_neu = st if not st else diamant(st if lager else seo(st), ctx)
        sd_neu = sd if not sd else diamant(sd if lager else seo(sd), ctx)
        if (st_neu, sd_neu) != (st, sd):
            neu["seo"] = {"title": st_neu, "description": sd_neu}
        alt_aend = []
        for m in p.get("_medien") or []:
            a = m.get("alt") or ""
            if a:
                a_neu = diamant(a if lager else titel(a), ctx)
                if a_neu != a and a_neu:
                    alt_aend.append((m["id"], a, a_neu))
        if alt_aend:
            zaehl["alt"] = zaehl.get("alt", 0) + len(alt_aend)
            if DRY:
                print(f"  {p['handle'][:55]:55} {len(alt_aend)} Alt-Texte", flush=True)
            else:
                a_ok, a_fehl = alts_schreiben(p, alt_aend)
                fehl += a_fehl
                if a_fehl:
                    print(f"    ⛔ Alt-Texte {p['handle']}: {a_fehl} Fehler", flush=True)
        if re.search(r"[Dd]iamant", ctx) and re.search(r"vvs|karat|\bct\b|lab[- ]?grown|labor", ctx, re.I) \
                and not re.search(r"moissanit", ctx, re.I):
            echt.append((p["handle"], p["title"]))
        if re.search(r"sofort-lieferbar|schnell-lieferbar", p["handle"]) and not lager:
            handles.append((p["handle"], p["title"]))
        if not neu:
            continue
        for k in neu:
            zaehl[k] = zaehl.get(k, 0) + 1
        if "iamant" in json.dumps(p, ensure_ascii=False) and any(
                "Strass" in json.dumps(v, ensure_ascii=False) or "Zirkonia" in json.dumps(v, ensure_ascii=False) for v in neu.values()):
            zaehl["diamant"] = zaehl.get("diamant", 0) + 1
        if len(beispiele) < 40:
            beispiele.append((p["handle"], {k: (v if k != "descriptionHtml" else "…") for k, v in neu.items()}))
        print(f"  {p['handle'][:55]:55} {'+'.join(neu)}", flush=True)
        if DRY:
            fix += 1
            continue
        eingabe = {"id": p["id"], **neu}
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title descriptionHtml seo{title description}} "
                "userErrors{message}}}", {"p": eingabe})["productUpdate"]
        got = r.get("product") or {}
        ok = not r.get("userErrors")
        if ok and "title" in neu:
            ok = got.get("title") == neu["title"]
        if ok and "descriptionHtml" in neu:
            # Shopify normalisiert HTML leicht — verglichen wird, dass KEIN Versprechen mehr drinsteht
            gh = got.get("descriptionHtml") or ""
            ok = text_eigen(gh) == gh and diamant(gh, f"{got.get('title') or ''} {gh}") == gh
        if ok and "seo" in neu:
            g = got.get("seo") or {}
            # SEO-Titel gleich Produkttitel speichert Shopify als null (heisst: Produkttitel gilt)
            ok = (g.get("description") or "") == (neu["seo"]["description"] or "") and \
                 ((g.get("title") or "") == (neu["seo"]["title"] or "") or (g.get("title") is None))
        if not ok:
            fehl += 1
            print("    ⛔", r.get("userErrors"), flush=True)
            continue
        fix += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%d')}\t{p['id']}\t{'+'.join(neu)}\t{p['handle']}\n")
    sichtbar = theme_bedingung()
    k_zeile = (f"GEPRÜFT-OHNE-INCI: {kos_ohne} von {kos_n} Kosmetik ohne Inhaltsstoff-Liste · sichtbar "
               f"{0 if sichtbar else (kos_ohne if sichtbar is False else '?')} (Theme-Bedingung {'aktiv' if sichtbar else ('fehlt' if sichtbar is False else 'unklar')}) "
               f"· Reinstoff-Titel mit Mischung {len(rein_widerspruch)} · ohne Liste {len(rein_offen)}")
    print(k_zeile, flush=True)
    tk = theme_klassen()
    e_zeile = (f"EDITOR-RÜCKGABE: {len(ed_ohne)} von {ed_n} Editor-Produkten ohne Ausschluss-Satz"
               + (f" ({', '.join(ed_ohne[:4])} → python3 automation/editor_rueckgabe_satz.py --scharf)" if ed_ohne else "")
               + " · Theme " + ("unklar" if tk is None else ("ok (Klassen 5/7/16)" if not tk else "FEHLT: " + "; ".join(tk[:4]))))
    if ed_ohne or tk:
        e_zeile = "⚠️ " + e_zeile
    print(e_zeile, flush=True)
    k_zeile = k_zeile + " · " + e_zeile
    with open(K_BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Kosmetik: Inhaltsstoff-Beleg — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n{k_zeile}\n\n"
                "Regel: `automation/data/versprechen_regel.json` → `kosmetik_beleg` (Kauf-Strecke Klasse 12, 13.10.2026). "
                "Liste = einer der Marker " + " · ".join(f"«{m}»" for m in K_INCI) + " im Beschreibungstext. Der Wächter schreibt nichts: "
                "INCI nur vom Karton (zweimal unabhängig gelesen) oder aus der CJ-Beschreibung nachtragen, Titel nur mit Beleg ändern "
                "(Rückweg-Ledger `dropship/_kosmetik_produktwahrheit.tsv`).\n\n"
                f"## Reinstoff-Titel, deren Text eine Mischung belegt ({len(rein_widerspruch)}) — Titel anpassen\n\n")
        for hd, t in rein_widerspruch:
            f.write(f"- `{hd}` — {t}\n")
        f.write(f"\n## Reinstoff-Titel ohne Inhaltsstoff-Liste ({len(rein_offen)}) — Karton im Bild prüfen\n\n")
        for hd, t in rein_offen:
            f.write(f"- `{hd}` — {t}\n")
    if nur_k:
        print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {n} geprüft (nur Kosmetik) · {k_zeile}")
        return
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Versprechen ohne Beleg — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Regel: `automation/data/versprechen_regel.json` (Lieferversprechen nur bei Schweizer Lager; «Qualität geprüft», "
                f"«meistverkauft», «unser Bestseller» nie; dekorative «Diamanten» = Strasssteine bzw. Zirkonia). Geprüft: {n} aktive · {'zu ändern' if DRY else 'geändert'}: {fix} "
                f"({', '.join(f'{k} {v}' for k, v in sorted(zaehl.items()))}) · Fehler: {fehl}\n\n## Beispiele\n\n")
        for hd, nn in beispiele:
            f.write(f"- `{hd}` — {json.dumps(nn, ensure_ascii=False)[:300]}\n")
        f.write(f"\n## «Diamant» mit Echtheitsangabe (Karat/VVS/Labor, ohne Moissanit) — Einzelprüfung ({len(echt)})\n\n"
                "Der Wächter lässt diese Produkte unberührt: eine Karat- oder Reinheitsangabe ist entweder wahr (dann darf «Diamant» "
                "stehen) oder eine Echtheitsbehauptung ohne Beleg (dann Produkt prüfen, nicht Wörter tauschen).\n\n")
        for hd, t in echt:
            f.write(f"- `{hd}` — {t}\n")
        f.write(f"\n## Handles mit Lieferversprechen ({len(handles)}) — Umbenennen nur mit 301\n\n")
        for hd, t in handles:
            f.write(f"- `{hd}` — {t}\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {n} geprüft, {fix} {'zu ändern' if DRY else 'geändert'} "
          f"{zaehl}, {fehl} Fehler, {len(handles)} Handles gemeldet · {k_zeile}")


if __name__ == "__main__":
    main()
