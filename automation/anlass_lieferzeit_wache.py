#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""anlass_lieferzeit_wache.py — Anlass-Kollektionen zeigen oben nur Ware, die rechtzeitig ankommt (12.10.2026).

ANLASS (GEMESSEN 12.10.2026, 19 Tage vor Halloween): Die Kollektion «Halloween» (224 aktive: 92 CJ, 132 Schweizer Lager)
war nach «neueste zuerst» sortiert. Weil der CJ-Grind gerade Halloween-Suchaufträge abarbeitet, waren die **ersten 16 von
16 Artikeln CJ-Direktversand** — Lieferzusage 10–20 Werktage (+3 Bearbeitung) = nach Halloween. Die 132 Kostüme ab
Schweizer Lager (1–2 Werktage, DPD) lagen darunter, obwohl der Kollektionstext «Last-Minute? Kostüme ab Schweizer Lager»
verspricht. ChatGPT schickte 14 Besucher auf genau diese Seite (90 T, 0 Warenkörbe).

REGEL (Tabelle data/anlass_kollektionen.json):
  rechtzeitig(Quelle) = heute + Lieferwerktage(Quelle) ≤ Anlass-Datum   (schnell = Schweizer Lager 4 WT, langsam = 12 WT)
  Ist die LANGSAME Ware nicht mehr rechtzeitig, die schnelle aber schon:
    → Kollektion auf MANUAL, Reihenfolge = schnelle aktive Ware (in bisheriger Ordnung) · langsame aktive · Rest.
    → täglich neu (Neuimporte landen bei MANUAL hinten; neue Lager-Ware rückt so nach oben).
  Nach dem Anlass → frühere Sortierung zurück (Ledger dropship/_anlass_sort.tsv).
  Schnell = Tag «ch-lager»/«schweiz-versand» oder SKU «fortura-…» UND Versandprofil «CH-Lager» (1. Variante).
  Alles andere gilt als langsam (vorsichtig).
  13.10.2026: Die Kasse rechnet nach dem VERSANDPROFIL, nicht nach dem Tag. GEMESSEN: in den obersten 24 der Halloween-
  Seite lagen 16 Artikel mit Lager-Tag im «General profile» → Kasse 28.10.–11.11. (nach Halloween). Deshalb zählt
  ein Artikel nur als schnell, wenn auch sein Profil «CH-Lager» ist. Schnell = 4 WT (Kasse: P1D + 1–2 WT, 12-Uhr-Schluss; bis 13.10. 17:00 P3D → 6 WT)
  → Wache rechtzeitig bis Mo 26.10. (Kasse: Di 27.10. vor 12 Uhr); ab 27.10. meldet sie «auch Schweizer Lager zu spät».
Nichts wird gelöscht oder gedraftet — nur die Reihenfolge.

13.10.2026 abends (Kauf-Strecke Klasse 3, Richter): Die CJ-Halloween-Ware zeigte «Lieferung 28. Okt – 11. Nov» ohne ein Wort
zu Halloween, und die Wache meldete «alles rechtzeitig bis 29.10.», weil sie nach der KALIBRIERTEN Ankunft (12 WT) fragte,
nicht nach dem, was Seite und Kasse ANZEIGEN (bis 21 WT). Jetzt:
  (a) Umsortieren ab hinweis_ab = erster Tag, an dem heute + zusage_langsam_max (21 WT) nach dem Anlass liegt — also sobald
      die Kasse für Direktversand ein Datum nach dem Anlass zeigen KANN (Halloween: seit Fr 02.10.), nicht erst ab dem Kipptag.
  (c/d) Hinweis auf der Produktseite: Block «lux_anlass_hinweis» in templates/product.json liest das Shop-Metafeld
      luxe.anlass_hinweis (JSON), das NUR diese Wache schreibt (ausserhalb aller Fenster gelöscht → Hinweis aus):
        vor dem Kipptag  «Lieferung vor Halloween (Sa, 31. Okt.) nicht garantiert»
        ab dem Kipptag   «Kommt erst nach Halloween (Sa, 31. Okt.) an»
        Kipptag = erster Tag mit heute + langsam (12 WT, Kalibrierung) > Anlass → Halloween Do 15.10.
        Link «Rechtzeitig: Halloween ab Schweizer Lager →» nur bis schnell_bis (letzter Tag mit + schnell 4 WT ≤ Anlass →
        Mo 26.10.) und nur auf eine Kollektion, deren obersten 12 aktiven Artikel ALLE im Profil «CH-Lager» liegen.
      Der Block zeigt NIE etwas auf Ware mit Tag «profil-ch-lager» (die Kasse rechnet dort kurz).
  Wächter: prüft per Admin-API, dass der Block in der LIVE-Datei steht und das Metafeld dem Soll entspricht
  (Stand dropship/_anlass_hinweis.json, Zeile «ANLASS-HINWEIS: …»).
  (e) kostueme-ch-lager: Die Regel verknüpfte «peruecke»/«kostuem-hut» mit ODER und liess CJ-Perücken hinein (Platz 1 =
      CJ-Perücke aus Asien). Regel jetzt mit «kostuem-ch-zubehoer» statt dieser beiden; das Zeichen setzt/entfernt diese
      Wache täglich auf Ware mit ch-lager UND (peruecke ODER kostuem-hut) — fängt auch neue Fortura-Importe.

  python3 automation/anlass_lieferzeit_wache.py               # Trockenlauf (Standard)
  SCHARF=1 python3 automation/anlass_lieferzeit_wache.py      # umsortieren + zurücklesen
  python3 automation/anlass_lieferzeit_wache.py --selbsttest
  python3 automation/anlass_lieferzeit_wache.py --hinweis   # nur Hinweis-Soll + Theme-/Metafeld-Prüfung (Trockenlauf)
"""
import datetime as dt, json, os, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
TABELLE = os.path.join(REPO, "data", "anlass_kollektionen.json")
LEDGER = os.path.join(REPO, "dropship", "_anlass_sort.tsv")
BERICHT = os.path.join(REPO, "dropship", "ANLASS-LIEFERZEIT.md")
SCHARF = os.environ.get("SCHARF") == "1"
STAND_HINWEIS = os.path.join(REPO, "dropship", "_anlass_hinweis.json")
LEDGER_ZUBEHOER = os.path.join(REPO, "dropship", "_kostuem_ch_zubehoer.tsv")
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
BLOCK_MARKE = "LUX-ANLASS-HINWEIS"
META_NS, META_KEY = "luxe", "anlass_hinweis"
MARKE_PROFIL = "profil-ch-lager"
ZUBEHOER_TAG = "kostuem-ch-zubehoer"
ZUBEHOER_QUELLE = ("peruecke", "kostuem-hut")
WOCHENTAG = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
MONAT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."]


def plus_werktage(tag, n):
    d = tag
    while n > 0:
        d += dt.timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def erster_tag_zu_spaet(datum, wt):
    """Erster Kalendertag d, an dem plus_werktage(d, wt) > datum (ab hier ist eine Zusage von wt Werktagen zu spät)."""
    d = datum - dt.timedelta(days=wt * 2 + 14)
    while plus_werktage(d, wt) <= datum:
        d += dt.timedelta(days=1)
    return d


def datum_text(d):
    return f"{WOCHENTAG[d.weekday()]}, {d.day}. {MONAT[d.month - 1]}"


def hinweis_fenster(datum, wt):
    """→ dict mit ab / kipptag / schnell_bis (date) für einen Anlass, aus der Kalibrierung in data/anlass_kollektionen.json."""
    return {"ab": erster_tag_zu_spaet(datum, wt["zusage_langsam_max"]),
            "kipptag": erster_tag_zu_spaet(datum, wt["langsam"]),
            "schnell_bis": erster_tag_zu_spaet(datum, wt["schnell"]) - dt.timedelta(days=1)}


def hinweis_eintrag(a, datum, f, link):
    """Ein Eintrag im Metafeld (Liquid vergleicht Zahlen JJJJMMTT, Texte sind fertig formatiert)."""
    z = lambda d: d.strftime("%Y%m%d")  # noqa: E731
    return {"tag": a["hinweis_tag"], "anlass": a["anlass"], "datum": z(datum), "datum_text": datum_text(datum),
            "ab": z(f["ab"]), "kipptag": z(f["kipptag"]), "schnell_bis": z(f["schnell_bis"]),
            "schnell_bis_text": datum_text(f["schnell_bis"]), "link": f"/collections/{link}" if link else ""}


def top_schnell(prods, n=12):
    """(alle obersten n aktiven schnell?, Zahl schnell unter den obersten n aktiven)."""
    akt = [p for p in prods if p[1]][:n]
    k = sum(1 for p in akt if p[2])
    return (len(akt) > 0 and k == len(akt)), k


def schnell(tags, sku):
    t = set(tags or [])
    return bool({"ch-lager", "schweiz-versand"} & t) or (sku or "").lower().startswith("fortura")


PROFIL_SCHNELL = "CH-Lager"


def schnell_profil(tags, sku, profil):
    """Schnell nur, wenn Tag/SKU UND Versandprofil der 1. Variante «CH-Lager» sagen (die Kasse folgt dem Profil)."""
    return schnell(tags, sku) and (profil or "") == PROFIL_SCHNELL


def ziel_reihenfolge(produkte):
    """produkte: [(id, aktiv, schnell)] in aktueller Ordnung → stabile Aufteilung: schnell+aktiv · langsam+aktiv · inaktiv."""
    a = [p[0] for p in produkte if p[1] and p[2]]
    b = [p[0] for p in produkte if p[1] and not p[2]]
    c = [p[0] for p in produkte if not p[1]]
    return a + b + c


def lade(gql, handle):
    c = gql('query($h:String!){ collectionByHandle(handle:$h){ id title sortOrder } }', {"h": handle}).get("collectionByHandle")
    if not c:
        return None, []
    out, cur = [], None
    while True:
        d = gql('query($id:ID!,$c:String){ collection(id:$id){ products(first:250, after:$c, sortKey:COLLECTION_DEFAULT){ '
                'pageInfo{hasNextPage endCursor} nodes{ id title status tags variants(first:1){ nodes{ sku deliveryProfile{ name } } } } } } }',
                {"id": c["id"], "c": cur})
        pg = d["collection"]["products"]
        for p in pg["nodes"]:
            v0 = (p["variants"]["nodes"] or [{}])[0] or {}
            sku = v0.get("sku") or ""
            prof = (v0.get("deliveryProfile") or {}).get("name")
            out.append((p["id"], p["status"] == "ACTIVE", schnell_profil(p["tags"], sku, prof), p["title"]))
        if not pg["pageInfo"]["hasNextPage"]:
            return c, out
        cur = pg["pageInfo"]["endCursor"]


def ledger_alt(handle):
    if not os.path.exists(LEDGER):
        return None
    alt = None
    for z in open(LEDGER, encoding="utf-8"):
        t = z.rstrip("\n").split("\t")
        if len(t) >= 3 and t[0] == handle and t[1] == "vorher":
            alt = t[2]
        if len(t) >= 3 and t[0] == handle and t[1] == "zurueck":
            alt = None
    return alt


def umsortieren(gql, c, ziel, alt_sort):
    if c["sortOrder"] != "MANUAL":
        r = gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{ message } } }',
                {"i": {"id": c["id"], "sortOrder": "MANUAL"}})
        if (r.get("collectionUpdate") or {}).get("userErrors"):
            return f"Sortierung nicht umgestellt: {r['collectionUpdate']['userErrors']}"
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{c['handle'] if 'handle' in c else ''}\tvorher\t{alt_sort}\t{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
    moves = [{"id": pid, "newPosition": str(i)} for i, pid in enumerate(ziel)]
    for k in range(0, len(moves), 250):
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){ collectionReorderProducts(id:$id, moves:$m){ job{ id done } userErrors{ message } } }',
                {"id": c["id"], "m": moves[k:k + 250]})
        rr = r.get("collectionReorderProducts") or {}
        if rr.get("userErrors"):
            return f"Umsortieren abgelehnt: {rr['userErrors']}"
        job = (rr.get("job") or {}).get("id")
        for _ in range(30):
            if not job:
                break
            j = gql('query($id:ID!){ job(id:$id){ done } }', {"id": job}).get("job") or {}
            if j.get("done"):
                break
            time.sleep(2)
    return None


def _gql():
    try:
        from kaufwille_zeile import gql   # wartet bei Drosselung statt aufzugeben
    except Exception:  # pragma: no cover
        from seo_autopilot import gql
    return gql


def shop_id(gql):
    return gql("{ shop { id } }")["shop"]["id"]


def metafeld_lesen(gql):
    m = gql('{ shop { metafield(namespace:"%s", key:"%s"){ value updatedAt } } }' % (META_NS, META_KEY))["shop"]["metafield"]
    if not m:
        return None, None
    try:
        return json.loads(m["value"]), m["updatedAt"]
    except Exception:
        return {"_kaputt": m["value"][:80]}, m["updatedAt"]


def metafeld_schreiben(gql, wert):
    """wert None → löschen (Hinweis aus). Sonst JSON setzen. → Fehlertext oder None."""
    sid = shop_id(gql)
    if wert is None:
        r = gql('mutation($m:[MetafieldIdentifierInput!]!){ metafieldsDelete(metafields:$m){ deletedMetafields{ key } '
                'userErrors{ message } } }', {"m": [{"ownerId": sid, "namespace": META_NS, "key": META_KEY}]})
        e = (r.get("metafieldsDelete") or {}).get("userErrors")
        return f"Löschen abgelehnt: {e}" if e else None
    r = gql('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ key } userErrors{ message } } }',
            {"m": [{"ownerId": sid, "namespace": META_NS, "key": META_KEY, "type": "json",
                    "value": json.dumps(wert, ensure_ascii=False)}]})
    e = (r.get("metafieldsSet") or {}).get("userErrors")
    return f"Setzen abgelehnt: {e}" if e else None


def block_im_theme(gql):
    """True/False: steht der Hinweis-Block (Marke + Metafeld-Zugriff) in der LIVE-Datei templates/product.json?"""
    t = gql('query($id:ID!){ theme(id:$id){ role files(filenames:["templates/product.json"], first:1){ nodes{ '
            'body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }', {"id": THEME})["theme"]
    nodes = (t or {}).get("files", {}).get("nodes") or []
    if not nodes:
        return False
    c = nodes[0]["body"]["content"]
    return BLOCK_MARKE in c and f"metafields.{META_NS}.{META_KEY}" in c and MARKE_PROFIL in c


def zubehoer_abgleich(gql):
    """Zeichen «kostuem-ch-zubehoer» = ch-lager UND (peruecke ODER kostuem-hut). Hängt an der Regel von kostueme-ch-lager
    (statt der beiden Lieferanten-übergreifenden Tags). Setzt/entfernt nur mit SCHARF. → (gesetzt, entfernt, soll, ist)."""
    soll, ist, cur = set(), set(), None
    q = " OR ".join(f"tag:'{t}'" for t in ZUBEHOER_QUELLE + (ZUBEHOER_TAG,))
    while True:
        d = gql('query($c:String,$q:String!){ products(first:250, after:$c, query:$q){ pageInfo{ hasNextPage endCursor } '
                'nodes{ id tags } } }', {"c": cur, "q": q})["products"]
        for p in d["nodes"]:
            t = set(p["tags"])
            if "ch-lager" in t and t & set(ZUBEHOER_QUELLE):
                soll.add(p["id"])
            if ZUBEHOER_TAG in t:
                ist.add(p["id"])
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    add, weg = sorted(soll - ist), sorted(ist - soll)
    n_add = n_weg = 0
    if SCHARF:
        for ids, mut, art in ((weg, "tagsRemove", "weg"), (add, "tagsAdd", "neu")):
            for i in range(0, len(ids), 20):
                teil = ids[i:i + 20]
                q2 = "mutation{" + " ".join(f'a{j}:{mut}(id:"{x}",tags:["{ZUBEHOER_TAG}"]){{userErrors{{message}}}}'
                                           for j, x in enumerate(teil)) + "}"
                r = gql(q2)
                with open(LEDGER_ZUBEHOER, "a", encoding="utf-8") as f:
                    for j, x in enumerate(teil):
                        if not (r.get(f"a{j}") or {}).get("userErrors", ["?"]):
                            f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{art}\t{x}\n")
                            if art == "neu":
                                n_add += 1
                            else:
                                n_weg += 1
    return n_add, n_weg, len(soll), len(ist)


def main(nur_hinweis=False):
    gql = _gql()
    tab = json.load(open(TABELLE, encoding="utf-8"))
    wt = tab["lieferung_werktage"]
    heute = dt.date.today()
    zeilen, zahl = [], {"umsortiert": 0, "schon_richtig": 0, "rechtzeitig": 0, "zurueck": 0, "zu_spaet_alles": 0, "fehlt": 0}
    hinweise, cache = {}, {}

    def laden(h):
        if h not in cache:
            cache[h] = lade(gql, h)
        return cache[h]

    for a in tab["anlaesse"]:
        datum = dt.date.fromisoformat(a["datum"])
        frist_schnell = plus_werktage(heute, wt["schnell"])
        fen = hinweis_fenster(datum, wt)
        c, prods = laden(a["handle"])
        if not c:
            zahl["fehlt"] += 1; zeilen.append(f"| {a['handle']} | — | Kollektion fehlt | — |"); continue
        c["handle"] = a["handle"]
        n_akt = sum(1 for p in prods if p[1]); n_schnell = sum(1 for p in prods if p[1] and p[2])
        oben_langsam = sum(1 for p in prods[:12] if p[1] and not p[2])
        if heute > datum:
            alt = ledger_alt(a["handle"])
            if alt and c["sortOrder"] == "MANUAL" and not nur_hinweis:
                if SCHARF:
                    gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{ message } } }',
                        {"i": {"id": c["id"], "sortOrder": alt}})
                    with open(LEDGER, "a", encoding="utf-8") as f:
                        f.write(f"{a['handle']}\tzurueck\t{alt}\t{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
                zahl["zurueck"] += 1
                zeilen.append(f"| {a['handle']} | {a['datum']} vorbei | Sortierung zurück auf {alt}{'' if SCHARF else ' (TROCKEN)'} | — |")
            continue
        if heute < fen["ab"]:
            # Seite + Kasse zeigen für Direktversand noch ein Datum VOR dem Anlass → nichts zu tun
            zahl["rechtzeitig"] += 1
            zeilen.append(f"| {a['handle']} | {a['datum']} | alles rechtzeitig (Kassen-Zusage Direktversand bis "
                          f"{plus_werktage(heute, wt['zusage_langsam_max'])}; Hinweis/Sortierung ab {fen['ab']}) | {c['sortOrder']} |")
            continue
        if not nur_hinweis:
            if frist_schnell > datum:
                zahl["zu_spaet_alles"] += 1
                zeilen.append(f"| {a['handle']} | {a['datum']} | auch Schweizer Lager zu spät — nichts umgestellt | {c['sortOrder']} |")
            else:
                ziel = ziel_reihenfolge(prods)
                if [p[0] for p in prods] == ziel and c["sortOrder"] == "MANUAL":
                    zahl["schon_richtig"] += 1
                    zeilen.append(f"| {a['handle']} | {a['datum']} | schon richtig ({n_schnell} Lager-Artikel im Profil «CH-Lager» oben) | MANUAL |")
                else:
                    fehler = umsortieren(gql, c, ziel, c["sortOrder"]) if SCHARF else None
                    if fehler:
                        zeilen.append(f"| {a['handle']} | {a['datum']} | ⚠️ {fehler} | {c['sortOrder']} |"); continue
                    nach = ""
                    if SCHARF:
                        time.sleep(3)
                        cache.pop(a["handle"], None)
                        _, neu = laden(a["handle"])
                        nach = f" · zurückgelesen: oben 12 = {top_schnell(neu)[1]} Lager-Artikel im Profil"
                    zahl["umsortiert"] += 1
                    zeilen.append(f"| {a['handle']} | {a['datum']} | Kasse zeigt Direktversand bis "
                                  f"{plus_werktage(heute, wt['zusage_langsam_max'])} → Lager-Ware (Profil «CH-Lager») nach oben "
                                  f"({n_schnell} von {n_akt} aktiven; vorher oben 12: {oben_langsam} langsam){nach}"
                                  f"{'' if SCHARF else ' (TROCKEN)'} | {c['sortOrder']} → MANUAL |")
        # Hinweis für die Produktseite (einmal je Tag; erste Anlass-Zeile gewinnt)
        tag = a.get("hinweis_tag")
        if tag and tag not in hinweise:
            link = ""
            if heute <= fen["schnell_bis"]:
                for k in a.get("link_kandidaten") or []:
                    if not SCHARF and k == a["handle"] and not nur_hinweis:
                        # Trockenlauf: die Kollektion wäre nach dem Umsortieren oben schnell, wenn es genug schnelle gibt
                        ok = n_schnell >= 12
                    else:
                        _, kp = laden(k)
                        ok = top_schnell(kp)[0]
                    if ok:
                        link = k
                        break
            hinweise[tag] = hinweis_eintrag(a, datum, fen, link)
            zeilen.append(f"| {a['handle']} | {a['datum']} | Hinweis auf Tag «{tag}» (ohne {MARKE_PROFIL}): "
                          f"{'«kommt erst nach» ' if heute >= fen['kipptag'] else '«nicht garantiert» '}(Kipptag {fen['kipptag']}, "
                          f"schnell bis {fen['schnell_bis']}) · Link {('/collections/' + link) if link else '— (keine Kollektion oben schnell)'} | — |")

    # ---- Metafeld (Soll) + Wächter (Theme-Block, Metafeld aktuell)
    soll = {"stand": heute.isoformat(), "quelle": "automation/anlass_lieferzeit_wache.py",
            "hinweise": list(hinweise.values())} if hinweise else None
    ist, ist_upd = metafeld_lesen(gql)
    vergleich = lambda x: [h for h in (x or {}).get("hinweise", [])]  # noqa: E731
    mf_fehler = None
    if vergleich(ist) != vergleich(soll) or (soll is None) != (ist is None):
        if SCHARF:
            mf_fehler = metafeld_schreiben(gql, soll)
            ist, ist_upd = metafeld_lesen(gql)
    mf_aktuell = vergleich(ist) == vergleich(soll) and (soll is None) == (ist is None)
    im_theme = block_im_theme(gql)
    befunde = []
    if hinweise and not im_theme:
        befunde.append("Hinweis-Block fehlt in der Live-Datei templates/product.json (Marke LUX-ANLASS-HINWEIS)")
    if not mf_aktuell:
        befunde.append(f"Metafeld {META_NS}.{META_KEY} nicht aktuell" + (f" ({mf_fehler})" if mf_fehler else "")
                       + ("" if SCHARF else " — SCHARF=1 schreibt es"))
    zub = None
    if not nur_hinweis:
        try:
            zub = zubehoer_abgleich(gql)
        except Exception as e:  # pragma: no cover
            befunde.append(f"Zubehör-Zeichen nicht abgeglichen: {e}"[:160])
    stand = {"stand": f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", "scharf": SCHARF, "hinweise": list(hinweise.values()),
             "metafeld_aktuell": mf_aktuell, "metafeld_updated": ist_upd, "block_im_theme": im_theme, "befunde": befunde,
             "zubehoer": dict(zip(("gesetzt", "entfernt", "soll", "ist_vorher"), zub)) if zub else None}
    if SCHARF or nur_hinweis:
        json.dump(stand, open(STAND_HINWEIS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if not nur_hinweis:
        with open(BERICHT, "w", encoding="utf-8") as f:
            f.write(f"# Anlass-Kollektionen: rechtzeitige Ware oben — Stand {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n\n"
                    f"Regel: `automation/anlass_lieferzeit_wache.py`, Tabelle `data/anlass_kollektionen.json` (Schweizer Lager "
                    f"{wt['schnell']} WT, Direktversand {wt['langsam']} WT kalibriert, Kassen-Zusage bis {wt['zusage_langsam_max']} WT). "
                    f"Schnell = Profil «CH-Lager». Geändert wird nur die Reihenfolge, dazu das Metafeld für den Hinweis.\n\n"
                    "| Kollektion | Anlass | Ergebnis | Sortierung |\n|---|---|---|---|\n" + "\n".join(zeilen) + "\n\n"
                    f"Hinweis-Metafeld `{META_NS}.{META_KEY}`: {'aktuell' if mf_aktuell else '⚠️ NICHT aktuell'} · Block im Theme: "
                    f"{'ja' if im_theme else 'NEIN'}" + (f" · Zubehör-Zeichen: +{zub[0]} −{zub[1]} (Soll {zub[2]})" if zub else "")
                    + ("\n\n⚠️ " + "\n⚠️ ".join(befunde) if befunde else "") + "\n")
    print(f"ANLASS-LIEFERZEIT: umsortiert {zahl['umsortiert']} · schon richtig {zahl['schon_richtig']} · alles rechtzeitig "
          f"{zahl['rechtzeitig']} · zurück {zahl['zurueck']} · fehlt {zahl['fehlt']}{'' if SCHARF else ' (TROCKEN)'} → dropship/ANLASS-LIEFERZEIT.md")
    print(f"ANLASS-HINWEIS: {len(hinweise)} aktiv ({', '.join(h['tag'] + (' → ' + h['link'] if h['link'] else ' ohne Link') for h in hinweise.values()) or '—'})"
          f" · Metafeld {'aktuell' if mf_aktuell else 'NICHT aktuell'} · Block im Theme {'ja' if im_theme else 'NEIN'}"
          + (f" · Zubehör-Zeichen +{zub[0]} −{zub[1]} (Soll {zub[2]})" if zub else ""))
    for b in befunde:
        print(f"⚠️ ANLASS-HINWEIS: {b}")
    return 0 if not befunde else 1


def selbsttest():
    f = 0
    mo = dt.date(2026, 10, 12)  # Montag
    pruef = [
        (plus_werktage(mo, 2), dt.date(2026, 10, 14), "2 WT ab Mo = Mi"),
        (plus_werktage(mo, 5), dt.date(2026, 10, 19), "5 WT ab Mo = nächster Mo"),
        (plus_werktage(mo, 23) > dt.date(2026, 10, 31), True, "Direktversand ab 12.10. zu spät für Halloween"),
        (plus_werktage(mo, 2) <= dt.date(2026, 10, 31), True, "Lager ab 12.10. rechtzeitig"),
        (plus_werktage(dt.date(2026, 11, 1), 23) <= dt.date(2026, 12, 24), True, "Direktversand ab 01.11. rechtzeitig für Weihnachten"),
        (schnell(["ch-lager"], "x"), True, "Tag ch-lager"), (schnell([], "fortura-CK1"), True, "SKU fortura"),
        (schnell(["cj-real"], "CJ-123"), False, "CJ langsam"), (schnell([], ""), False, "unbekannt = langsam"),
        (schnell_profil(["ch-lager"], "x", "CH-Lager"), True, "ch-lager-Tag + Profil CH-Lager = schnell"),
        (schnell_profil(["ch-lager"], "x", "General profile"), False, "ch-lager-Tag, General profile → langsam"),
        (schnell_profil([], "fortura-CK1", "General profile"), False, "fortura-SKU, General profile → langsam"),
        (schnell_profil(["ch-lager"], "x", None), False, "ch-lager-Tag, Profil unbekannt → langsam"),
        (schnell_profil(["cj-real"], "CJ-123", "CH-Lager"), False, "Profil CH-Lager ohne Lager-Tag/SKU → langsam"),
        (plus_werktage(dt.date(2026, 10, 26), 4) <= dt.date(2026, 10, 31), True, "Lager 4 WT ab Mo 26.10. rechtzeitig (Fr 30.10.)"),
        (plus_werktage(dt.date(2026, 10, 27), 4) > dt.date(2026, 10, 31), True, "Lager 4 WT ab Di 27.10. zu spät (Mo 02.11.)"),
        (plus_werktage(dt.date(2026, 10, 15), 12) > dt.date(2026, 10, 31), True, "Direktversand 12 WT ab Do 15.10. zu spät → umsortieren"),
        (ziel_reihenfolge([("a", True, False), ("b", True, True), ("c", False, True), ("d", True, True)]), ["b", "d", "a", "c"], "stabil"),
        # 13.10. Kauf-Strecke Klasse 3: Fenster aus der Kalibrierung (schnell 4, langsam 12, Kassen-Zusage 21 WT)
        (hinweis_fenster(dt.date(2026, 10, 31), {"schnell": 4, "langsam": 12, "zusage_langsam_max": 21}),
         {"ab": dt.date(2026, 10, 2), "kipptag": dt.date(2026, 10, 15), "schnell_bis": dt.date(2026, 10, 26)},
         "Halloween: Hinweis ab Fr 02.10., Kipptag Do 15.10., Lager bis Mo 26.10."),
        (plus_werktage(dt.date(2026, 10, 14), 12) <= dt.date(2026, 10, 31), True, "Mi 14.10. + 12 WT = Fr 30.10. noch rechtzeitig"),
        (datum_text(dt.date(2026, 10, 31)), "Sa, 31. Okt.", "Datumstext"),
        (hinweis_fenster(dt.date(2026, 12, 24), {"schnell": 4, "langsam": 12, "zusage_langsam_max": 21})["kipptag"],
         dt.date(2026, 12, 9), "Weihnachten: Kipptag Mi 09.12."),
        (top_schnell([("a", True, True), ("x", False, False), ("b", True, True)]), (True, 2), "oben schnell (Entwurf zählt nicht)"),
        (top_schnell([("a", True, True), ("b", True, False)]), (False, 1), "oben ein langsamer → kein Link"),
        (top_schnell([]), (False, 0), "leere Kollektion → kein Link"),
        (hinweis_eintrag({"hinweis_tag": "halloween", "anlass": "Halloween"}, dt.date(2026, 10, 31),
                         hinweis_fenster(dt.date(2026, 10, 31), {"schnell": 4, "langsam": 12, "zusage_langsam_max": 21}),
                         "halloween")["kipptag"], "20261015", "Metafeld: Kipptag als Zahl JJJJMMTT"),
    ]
    for ist, soll, name in pruef:
        ok = ist == soll
        f += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {name} → {ist}")
    print("SELBSTTEST", "OK" if not f else f"FEHLER ({f})")
    return 0 if not f else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main(nur_hinweis="--hinweis" in sys.argv))
