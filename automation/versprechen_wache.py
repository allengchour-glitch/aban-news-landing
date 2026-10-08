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
Schreibt Titel, Beschreibung und SEO-Titel/-Beschreibung (immer BEIDE SEO-Felder, Lehre 30.09.), liest zurück.
Handles bleiben (Umbenennen braucht 301) — sie stehen im Bericht.
DRY=1 zeigt nur. CACHE_NUTZEN=1 nimmt den letzten Export. --selbsttest prüft die Kanarien.
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
BULK = ('{ products(query: "status:active") { edges { node { id handle title tags descriptionHtml seo { title description } '
        'variants(first: 1) { edges { node { sku } } } } } } }')


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


def schweiz_lager(tags, sku):
    tl = {x.lower() for x in tags or []}
    return bool(tl & set(REGEL["schweiz_lager"]["tags"])) or any(
        (sku or "").lower().startswith(p) for p in REGEL["schweiz_lager"]["sku_praefix"])


def selbsttest():
    f = 0
    for art, ein, soll in REGEL["kanarien"]:
        ist = {"seo": seo, "titel": titel, "text": text_liefer, "eigen": text_eigen}[art](ein)
        if ist != soll:
            f += 1
            print(f"  ✗ {art}: {ein!r}\n      ist  {ist!r}\n      soll {soll!r}")
    print(f"Selbsttest: {len(REGEL['kanarien']) - f}/{len(REGEL['kanarien'])} ok")
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
    alle, sku = {}, {}
    for z in open(CACHE, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o:
            sku.setdefault(o["__parentId"], o.get("sku") or "")
        elif "handle" in o:
            alle[o["id"]] = o
    for pid, p in alle.items():
        p["_sku"] = sku.get(pid, "")
        yield p


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if not selbsttest():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if not (os.environ.get("CACHE_NUTZEN") == "1" and os.path.exists(CACHE)):
        export()
    n = fix = fehl = 0
    zaehl, handles, beispiele = {}, [], []
    for p in produkte():
        n += 1
        lager = schweiz_lager(p.get("tags"), p["_sku"])
        s = p.get("seo") or {}
        neu = {}
        t_neu = p["title"] if lager else titel(p["title"])
        if t_neu != p["title"] and t_neu:
            neu["title"] = t_neu
        h = p.get("descriptionHtml") or ""
        h_neu = text_eigen(h if lager else text_liefer(h))
        if h_neu != h:
            neu["descriptionHtml"] = h_neu
        st, sd = s.get("title"), s.get("description")
        st_neu = st if lager or not st else seo(st)
        sd_neu = sd if lager or not sd else seo(sd)
        if (st_neu, sd_neu) != (st, sd):
            neu["seo"] = {"title": st_neu, "description": sd_neu}
        if re.search(r"sofort-lieferbar|schnell-lieferbar", p["handle"]) and not lager:
            handles.append((p["handle"], p["title"]))
        if not neu:
            continue
        for k in neu:
            zaehl[k] = zaehl.get(k, 0) + 1
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
            ok = text_eigen(got.get("descriptionHtml") or "") == (got.get("descriptionHtml") or "")
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
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Versprechen ohne Beleg — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Regel: `automation/data/versprechen_regel.json` (Lieferversprechen nur bei Schweizer Lager; «Qualität geprüft», "
                f"«meistverkauft», «unser Bestseller» nie). Geprüft: {n} aktive · {'zu ändern' if DRY else 'geändert'}: {fix} "
                f"({', '.join(f'{k} {v}' for k, v in sorted(zaehl.items()))}) · Fehler: {fehl}\n\n## Beispiele\n\n")
        for hd, nn in beispiele:
            f.write(f"- `{hd}` — {json.dumps(nn, ensure_ascii=False)[:300]}\n")
        f.write(f"\n## Handles mit Lieferversprechen ({len(handles)}) — Umbenennen nur mit 301\n\n")
        for hd, t in handles:
            f.write(f"- `{hd}` — {t}\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {n} geprüft, {fix} {'zu ändern' if DRY else 'geändert'} "
          f"{zaehl}, {fehl} Fehler, {len(handles)} Handles gemeldet")


if __name__ == "__main__":
    main()
