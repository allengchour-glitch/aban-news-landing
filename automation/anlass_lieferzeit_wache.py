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
import datetime as dt, json, os, re, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from werbetest_sperre import gesperrt  # noqa: E402  jeder Schreiber fragt selbst (13.10.)
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
# 14.10.2026: keine Kostüme, obwohl Gruppe/Importer sie so markiert: Wintermützen/Beanies (Weihnacht nur MIT Mütze — sonst fiele
# «Kostüm Nikolaus» heraus). Fanartikel (Länder-Caps/-Shirts, Megafon) verlieren «kostuem-ch-front» (front_abgleich).
KEIN_KOSTUEM_RE = re.compile(r"\bwinterm(ü|ue)tze|\bbeanie\b|\bstrickm(ü|ue)tze", re.I)
FRONT_TAG, FAN_TAG = "kostuem-ch-front", "fanartikel"
LEDGER_FRONT = os.path.join(REPO, "dropship", "_kostuem_ch_front_fan.tsv")
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


# 14.10.2026 (MEHR-KAEUFER S2a): GEMESSEN — oben auf /collections/halloween standen 0 ganze Kostüme in den Top 24
# (abgeschnittene Hand, Horrorpuppe, blutiges Herz, Theaterblut …), obwohl 57 ganze Kostüme ab Schweizer Lager da waren
# (erstes auf Platz 37). Innerhalb der schnellen Ware gilt für Kollektionen mit «kostuem_zuerst» ein zweiter Schlüssel:
#   0 ganzes Kostüm (Titel «Kostüm» UND Auswahl Grösse) · 1 Kostüm in Einheitsgrösse · 2 Zubehör · 3 Deko/Blut/Spielzeug.
# Klasse 3 nach Typ und Titel, NIE nach dem Tag «kostuem-accessoire» (den tragen auch Hand, Herz und Puppe).
# In Klasse 0 abwechselnd Kinder/Damen/Herren/Unisex (sonst 11 von 12 Hexe/Vampirin, Simulation 14.10.).
KOSTUEM_RE = re.compile(r"kost(ü|ue)m", re.I)
GROESSE_OPT = {"grösse", "größe", "groesse", "grosse", "size"}
DEKO_TYP = {"Partydeko & Ballone", "Spielzeug & Spiele"}
DEKO_RE = re.compile(r"\bblut|abgeschnitten|kreiss(ä|ae)ge|horrorpuppe|schl(ä|ae)ger|theaterblut|\bleiche\b|\bsarg\b", re.I)
GRUPPEN = ("kinderkostuem", "damenkostuem", "herrenkostuem", "unisexkostuem")


def kostuem_klasse(titel, typ, optionen, tags=()):
    """→ (Klasse 0–3, Gruppe für die Mischung in Klasse 0)."""
    t = titel or ""
    gruppe = next((g for g in GRUPPEN if g in set(tags or ())), "andere")
    if KOSTUEM_RE.search(t):
        return (0 if {(o or "").strip().lower() for o in optionen or []} & GROESSE_OPT else 1), gruppe
    if (typ or "") in DEKO_TYP or DEKO_RE.search(t):
        return 3, gruppe
    return 2, gruppe


def gemischt(produkte):
    """Klasse-0-Kostüme reihum nach Gruppe (Reihenfolge innerhalb der Gruppe bleibt)."""
    toepfe, reihe = {}, []
    for p in produkte:
        g = p[4][1]
        if g not in toepfe:
            toepfe[g] = []
            reihe.append(g)
        toepfe[g].append(p)
    out = []
    while any(toepfe.values()):
        for g in reihe:
            if toepfe[g]:
                out.append(toepfe[g].pop(0))
    return out


def kaufbar_von(p):
    """6. Tupelfeld = kaufbar (Bestand > 0 oder nicht getrackt). Fehlt das Feld (alte Aufrufer, Tests), gilt die Ware als kaufbar."""
    return p[5] if len(p) > 5 else True


def ziel_reihenfolge(produkte, kostuem_zuerst=False):
    """produkte: [(id, aktiv, schnell[, titel, (klasse, gruppe)[, kaufbar]])] in aktueller Ordnung → stabile Aufteilung:
    kaufbar+schnell · kaufbar+langsam · ausverkauft (schnell vor langsam) · inaktiv. kostuem_zuerst: schnelle kaufbare aktive zusätzlich
    nach kostuem_klasse (stabil).
    21.10.2026 (Spähtrupp wf_3b017e9f, GEMESSEN): nach der Fortura-Bestandsumstellung vom 20.10. standen in /collections/halloween 11 von 24,
    in kostueme-ch-lager 11 von 24 und in blitzversand-schweiz 10 von 24 Produkten auf «Momentan ausverkauft» — die Sortierung kannte nur
    Typ/Lager, nie Kaufbarkeit; auf Platz 1 und 2 zwei ausverkaufte Hexen-Kostüme. Ausverkauftes bleibt sichtbar, steht aber hinten."""
    aktiv = [p for p in produkte if p[1]]
    gut = [p for p in aktiv if kaufbar_von(p)]
    aus = [p for p in aktiv if not kaufbar_von(p)]
    a = [p for p in gut if p[2]]
    if kostuem_zuerst:
        a = sorted(a, key=lambda p: p[4][0] if len(p) > 4 else 2)
        k0 = [p for p in a if len(p) > 4 and p[4][0] == 0]
        a = gemischt(k0) + [p for p in a if not (len(p) > 4 and p[4][0] == 0)]
    b = [p for p in gut if not p[2]]
    c = [p for p in aus if p[2]] + [p for p in aus if not p[2]]
    d = [p for p in produkte if not p[1]]
    return [p[0] for p in a + b + c + d]


def kaufbar_reihenfolge(produkte):
    """Nur die Kaufbarkeit, sonst stabil: kaufbare aktive · ausverkaufte aktive · Entwürfe. Für dauerhaft gepflegte MANUAL-Kollektionen
    (Tabelle: kaufbar_dauerhaft), deren Reihenfolge sonst nicht angetastet wird (blitzversand-schweiz, Startseiten-Reihe)."""
    gut = [p[0] for p in produkte if p[1] and kaufbar_von(p)]
    aus = [p[0] for p in produkte if p[1] and not kaufbar_von(p)]
    return gut + aus + [p[0] for p in produkte if not p[1]]


def lade(gql, handle):
    c = gql('query($h:String!){ collectionByHandle(handle:$h){ id title sortOrder } }', {"h": handle}).get("collectionByHandle")
    if not c:
        return None, []
    out, cur = [], None
    while True:
        d = gql('query($id:ID!,$c:String){ collection(id:$id){ products(first:250, after:$c, sortKey:COLLECTION_DEFAULT){ '
                'pageInfo{hasNextPage endCursor} nodes{ id title status tags productType totalInventory tracksInventory options{ name } '
                'variants(first:1){ nodes{ sku deliveryProfile{ name } } } } } } }',
                {"id": c["id"], "c": cur})
        pg = d["collection"]["products"]
        for p in pg["nodes"]:
            v0 = (p["variants"]["nodes"] or [{}])[0] or {}
            sku = v0.get("sku") or ""
            prof = (v0.get("deliveryProfile") or {}).get("name")
            kaufbar = (not p.get("tracksInventory")) or (p.get("totalInventory") or 0) > 0
            out.append((p["id"], p["status"] == "ACTIVE", schnell_profil(p["tags"], sku, prof), p["title"],
                        kostuem_klasse(p["title"], p.get("productType"), [o["name"] for o in p.get("options") or []], p["tags"]),
                        kaufbar))
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


KOPF = 600   # 21.10.2026: bei grossen Kollektionen (kostueme-ch-lager 1'673, blitzversand-schweiz 2'942) nur die vordersten Plätze bewegen — Job-Last, und hinten sieht niemand nach


def umsortieren(gql, c, ziel, alt_sort, kopf=KOPF):
    if c["sortOrder"] != "MANUAL":
        r = gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{ message } } }',
                {"i": {"id": c["id"], "sortOrder": "MANUAL"}})
        if (r.get("collectionUpdate") or {}).get("userErrors"):
            return f"Sortierung nicht umgestellt: {r['collectionUpdate']['userErrors']}"
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{c['handle'] if 'handle' in c else ''}\tvorher\t{alt_sort}\t{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\n")
    moves = [{"id": pid, "newPosition": str(i)} for i, pid in enumerate(ziel[:kopf])]
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
                'nodes{ id tags title } } }', {"c": cur, "q": q})["products"]
        for p in d["nodes"]:
            t = set(p["tags"])
            # 14.10.2026: «kostuem-hut» steht auf der ganzen Fortura-Gruppe «Hüte/Kopfbedeckung», auch auf Wintermützen
            # (GEMESSEN: «Wintermütze für Kinder leuchtende LED Weihnachten» auf Platz 3 von kostueme-ch-lager).
            if "ch-lager" in t and t & set(ZUBEHOER_QUELLE) and not KEIN_KOSTUEM_RE.search(p.get("title") or ""):
                soll.add(p["id"])
            if ZUBEHOER_TAG in t:
                ist.add(p["id"])
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    add, weg = sorted(soll - ist), sorted(ist - soll)
    add, weg = [x for x in add if not gesperrt(x)], [x for x in weg if not gesperrt(x)]   # Werbetest-Sperre (13.10.)
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


# ---- 14.10.2026 (MEHR-KAEUFER S2 b/c): Band + Kollektionssatz im Endspurt, danach zurück -------------------------------
# GEMESSEN 14.10.: keiner der 5 Bandtexte hatte einen Link; «halloween» hatte einen Last-Minute-Satz ohne Datum,
# «kostueme-ch-lager» gar keinen. Ein DATUM («bis Mo, 26. Okt. bestellt …») steht erst drin, wenn die erste echte
# Fortura-Bestellung zugestellt ist (Tor dropship/_fortura_probe_ok.json) — vorher nur «Lieferdatum in der Kasse».
LEDGER_BAND = os.path.join(REPO, "dropship", "_anlass_band.tsv")
LEDGER_SATZ = os.path.join(REPO, "dropship", "_anlass_satz.tsv")
PROBE_TOR = os.path.join(REPO, "dropship", "_fortura_probe_ok.json")
BAND_DATEI = "sections/header-group.json"


def endspurt(fen, heute):
    return fen["ab"] <= heute <= fen["schnell_bis"]


def mit_datum():
    try:
        return bool(json.load(open(PROBE_TOR, encoding="utf-8")).get("ok"))
    except Exception:
        return False


def text_soll(cfg, eintrag):
    """cfg: {"text": …, "text_datum": … {schnell_bis_text} …} → fertiger Text (Datum nur mit Tor)."""
    return cfg["text_datum"].format(**eintrag) if mit_datum() and cfg.get("text_datum") else cfg["text"]


def theme_datei(gql, name):
    t = gql('query($id:ID!){ theme(id:$id){ files(filenames:["%s"], first:1){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ '
            'content } } } } } }' % name, {"id": THEME})["theme"]
    return t["files"]["nodes"][0]["body"]["content"]


def json_teile(c):
    k = c.find("{", c.find("*/")) if c.lstrip().startswith("/*") else c.find("{")
    return c[:k], json.loads(c[k:])


def ledger_offen(pfad, schluessel):
    """Letzte «vorher»-Zeile für schluessel ohne spätere «zurueck»-Zeile → [Felder…] oder None."""
    offen = None
    if os.path.exists(pfad):
        for z in open(pfad, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 3 and t[1] == schluessel:
                offen = t[3:] if t[2] == "vorher" else (None if t[2] == "zurueck" else offen)
    return offen


def ledger_zeile(pfad, schluessel, art, *felder):
    with open(pfad, "a", encoding="utf-8") as f:
        f.write("\t".join([f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", schluessel, art,
                           *[str(x).replace("\t", " ").replace("\n", " ") for x in felder]]) + "\n")


def band_abgleich(gql, a, fen, eintrag, heute):
    """→ (ok, info). Im Endspurt Soll-Text+Link im Block, danach den alten Stand aus dem Ledger zurück."""
    cfg = a.get("band")
    if not cfg:
        return True, "kein Band"
    c = theme_datei(gql, BAND_DATEI)
    kopf, j = json_teile(c)
    sec = next((x for x in j["sections"].values() if x.get("type") == "header-announcements"), None)
    blk = (sec or {}).get("blocks", {}).get(cfg["block"])
    if not blk:
        return False, f"Block {cfg['block']} fehlt in {BAND_DATEI}"
    st = blk.setdefault("settings", {})
    ist = (st.get("text", ""), st.get("link", ""))
    schl = f"{a['handle']}:{cfg['block']}"
    offen = ledger_offen(LEDGER_BAND, schl)
    if endspurt(fen, heute):
        soll = (text_soll(cfg, eintrag), cfg["link"])
        if ist == soll:
            return True, "Band gesetzt"
        if not SCHARF:
            return False, f"Band ≠ Soll ({ist[0][:40]}…) — SCHARF=1 setzt"
        if offen is None:
            ledger_zeile(LEDGER_BAND, schl, "vorher", *ist)
        open(f"/tmp/header-group.vor-anlass.{int(time.time())}.json", "w", encoding="utf-8").write(c)
    else:
        if offen is None:
            return True, "Band nicht im Endspurt"
        soll = (offen[0], offen[1] if len(offen) > 1 else "")
        if not SCHARF:
            return False, "Band nach dem Endspurt noch nicht zurück — SCHARF=1 setzt zurück"
    st["text"], st["link"] = soll
    r = gql('mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ '
            'upsertedThemeFiles{ filename } userErrors{ field message } } }',
            {"id": THEME, "files": [{"filename": BAND_DATEI, "body": {"type": "TEXT",
                                                                     "value": kopf + json.dumps(j, ensure_ascii=False, indent=2) + "\n"}}]})
    if (r.get("themeFilesUpsert") or {}).get("userErrors"):
        return False, f"Band nicht geschrieben: {r['themeFilesUpsert']['userErrors']}"
    for _ in range(8):
        time.sleep(3)
        _, j2 = json_teile(theme_datei(gql, BAND_DATEI))
        s2 = next(x for x in j2["sections"].values() if x.get("type") == "header-announcements")["blocks"][cfg["block"]]["settings"]
        if (s2.get("text", ""), s2.get("link", "")) == soll:
            if not endspurt(fen, heute):
                ledger_zeile(LEDGER_BAND, schl, "zurueck", *soll)
            return True, "Band gesetzt (neu)" if endspurt(fen, heute) else "Band zurückgesetzt"
    return False, "Band: Rücklesen bestätigt nicht"


SATZ_RE = lambda tag: re.compile(r'<p data-lux-anlass="%s">.*?</p>' % re.escape(tag), re.S)  # noqa: E731


def satz_abgleich(gql, a, fen, eintrag, heute):
    """→ [(handle, ok, info)]. Markierter Absatz <p data-lux-anlass="…"> in den Kollektionen aus a["satz"]."""
    cfg = a.get("satz")
    if not cfg:
        return []
    out = []
    for h in cfg["kollektionen"]:
        c = gql('query($h:String!){ collectionByHandle(handle:$h){ id descriptionHtml } }', {"h": h}).get("collectionByHandle")
        if not c:
            out.append((h, False, "Kollektion fehlt")); continue
        alt = c["descriptionHtml"] or ""
        rx = SATZ_RE(a["hinweis_tag"])
        schl = f"{h}:satz"
        soll_p = f'<p data-lux-anlass="{a["hinweis_tag"]}">{text_soll(cfg, eintrag)}</p>'
        if endspurt(fen, heute):
            if soll_p in alt:
                out.append((h, True, "Satz steht")); continue
            if rx.search(alt):
                neu = rx.sub(lambda m: soll_p, alt, count=1)
            else:
                ersetzt = re.search(cfg.get("ersetzt", r"$^"), alt, re.S) if cfg.get("ersetzt") else None
                if ersetzt:
                    if SCHARF and ledger_offen(LEDGER_SATZ, schl) is None:
                        ledger_zeile(LEDGER_SATZ, schl, "vorher", ersetzt.group(0))
                    neu = alt[:ersetzt.start()] + soll_p + alt[ersetzt.end():]
                else:
                    m = re.search(r"</p>", alt)
                    neu = (alt[:m.end()] + soll_p + alt[m.end():]) if m else soll_p + alt
                    if SCHARF and ledger_offen(LEDGER_SATZ, schl) is None:
                        ledger_zeile(LEDGER_SATZ, schl, "vorher", "")
        else:
            if not rx.search(alt):
                out.append((h, True, "kein Satz (nicht im Endspurt)")); continue
            offen = ledger_offen(LEDGER_SATZ, schl)
            neu = rx.sub(lambda m: (offen[0] if offen else ""), alt, count=1)
        if not SCHARF:
            out.append((h, False, "Satz ≠ Soll — SCHARF=1 schreibt")); continue
        r = gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ collection{ descriptionHtml } userErrors{ message } } }',
                {"i": {"id": c["id"], "descriptionHtml": neu}})
        e = (r.get("collectionUpdate") or {}).get("userErrors")
        back = ((r.get("collectionUpdate") or {}).get("collection") or {}).get("descriptionHtml") or ""
        if e:
            out.append((h, False, f"nicht geschrieben: {e}")); continue
        if endspurt(fen, heute):
            ok = soll_p in back or (text_soll(cfg, eintrag) in back)
            out.append((h, ok, "Satz gesetzt" if ok else "Satz: Rücklesen findet ihn nicht (Attribut entfernt?)"))
        else:
            ledger_zeile(LEDGER_SATZ, schl, "zurueck", "")
            out.append((h, not rx.search(back), "Satz entfernt"))
    return out


def kostueme_oben(prods, n=12):
    """Zahl ganzer Kostüme (Klasse 0) unter den obersten n aktiven."""
    return sum(1 for p in [p for p in prods if p[1]][:n] if len(p) > 4 and p[4][0] == 0 and kaufbar_von(p))


def ausverkauft_oben(prods, n=24):
    """Zahl ausverkaufter aktiver Produkte unter den obersten n aktiven (Wächter: > AUSVERKAUFT_OBEN_MAX ist ein Befund)."""
    return sum(1 for p in [p for p in prods if p[1]][:n] if not kaufbar_von(p))


AUSVERKAUFT_OBEN_MAX = 3


def front_abgleich(gql):
    """Fanartikel und Wintermützen tragen kein «kostuem-ch-front» (Kollektion «Kostüme ab Schweizer Lager»). Nur mit SCHARF.
    → (gefunden, entfernt)."""
    ids, cur = [], None
    while True:
        d = gql('query($c:String,$q:String!){ products(first:250, after:$c, query:$q){ pageInfo{ hasNextPage endCursor } '
                'nodes{ id title tags } } }', {"c": cur, "q": f"tag:'{FRONT_TAG}'"})["products"]
        ids += [(p["id"], p["title"]) for p in d["nodes"]
                if FAN_TAG in p["tags"] or KEIN_KOSTUEM_RE.search(p["title"] or "")]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    n = 0
    if SCHARF:
        frei = [x for x in ids if not gesperrt(x[0])]
        for i in range(0, len(frei), 20):
            teil = frei[i:i + 20]
            r = gql("mutation{" + " ".join(f'a{j}:tagsRemove(id:"{x[0]}",tags:["{FRONT_TAG}"]){{userErrors{{message}}}}'
                                          for j, x in enumerate(teil)) + "}")
            with open(LEDGER_FRONT, "a", encoding="utf-8") as f:
                for j, x in enumerate(teil):
                    if not (r.get(f"a{j}") or {}).get("userErrors", ["?"]):
                        f.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\tweg {FRONT_TAG}\t{x[0]}\t{x[1]}\n")
                        n += 1
    return len(ids), n


def main(nur_hinweis=False):
    gql = _gql()
    tab = json.load(open(TABELLE, encoding="utf-8"))
    wt = tab["lieferung_werktage"]
    heute = dt.date.today()
    zeilen, zahl = [], {"umsortiert": 0, "schon_richtig": 0, "rechtzeitig": 0, "zurueck": 0, "zu_spaet_alles": 0, "fehlt": 0}
    hinweise, cache, befunde_anlass = {}, {}, []

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
            if (a.get("band") or a.get("satz")) and not nur_hinweis:   # 14.10.: Band/Satz spätestens jetzt zurück
                try:
                    ok_b, info_b = band_abgleich(gql, a, fen, {}, heute)
                    if not ok_b:
                        befunde_anlass.append(f"{a['handle']}: {info_b}")
                    for h_s, ok_s, info_s in satz_abgleich(gql, a, fen, {}, heute):
                        if not ok_s:
                            befunde_anlass.append(f"{h_s}: {info_s}")
                except Exception as e:  # pragma: no cover
                    befunde_anlass.append(f"{a['handle']}: Band/Satz-Rückbau gescheitert: {e}"[:200])
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
                ziel = ziel_reihenfolge(prods, a.get("kostuem_zuerst", False))
                if [p[0] for p in prods][:KOPF] == ziel[:KOPF] and c["sortOrder"] == "MANUAL":
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
        # 21.10.2026: Wächter «ausverkauft ganz oben» — nach dem Sortieren (SCHARF: zurückgelesen, sonst simuliert) dürfen höchstens
        # AUSVERKAUFT_OBEN_MAX der obersten 24 Produkte ausverkauft sein (sonst Befund; hebt sich selbst auf, wenn Bestand nachkommt).
        if not nur_hinweis and heute >= fen["ab"] and heute <= datum:
            try:
                if SCHARF:
                    cache.pop(a["handle"], None)
                    _, jetzt_p = laden(a["handle"])
                else:
                    by_id = {p[0]: p for p in prods}
                    jetzt_p = [by_id[i] for i in ziel_reihenfolge(prods, a.get("kostuem_zuerst", False))]
                n_aus = ausverkauft_oben(jetzt_p)
                n_kauf = sum(1 for p in jetzt_p if p[1] and kaufbar_von(p))
                if n_aus > AUSVERKAUFT_OBEN_MAX and n_kauf >= 24:
                    befunde_anlass.append(f"{a['handle']}: {n_aus} ausverkaufte Produkte unter den obersten 24 (Soll ≤ {AUSVERKAUFT_OBEN_MAX}) trotz {n_kauf} kaufbaren")
                zeilen.append(f"| {a['handle']} | {a['datum']} | ausverkauft unter den obersten 24: {n_aus} (kaufbar insgesamt {n_kauf}) | — |")
            except Exception as e:  # pragma: no cover
                befunde_anlass.append(f"{a['handle']}: Ausverkauft-Prüfung gescheitert: {e}"[:200])
        if a.get("kostuem_zuerst") and endspurt(fen, heute) and not nur_hinweis:
            cache.pop(a["handle"], None) if SCHARF else None
            _, aktuell = laden(a["handle"])
            n_k = kostueme_oben(aktuell) if SCHARF else kostueme_oben([next(p for p in prods if p[0] == i) for i in
                                                                       ziel_reihenfolge(prods, True)])
            if n_k < 8:
                befunde_anlass.append(f"{a['handle']}: nur {n_k} ganze Kostüme in den obersten 12 (Soll ≥ 8)")
            zeilen.append(f"| {a['handle']} | {a['datum']} | ganze Kostüme oben 12: {n_k} | — |")
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
            if not nur_hinweis:
                try:
                    ok_b, info_b = band_abgleich(gql, a, fen, hinweise[tag], heute)
                    if not ok_b:
                        befunde_anlass.append(f"{a['handle']}: {info_b}")
                    zeilen.append(f"| {a['handle']} | {a['datum']} | Band: {info_b} | — |")
                    for h_s, ok_s, info_s in satz_abgleich(gql, a, fen, hinweise[tag], heute):
                        if not ok_s:
                            befunde_anlass.append(f"{h_s}: {info_s}")
                        zeilen.append(f"| {h_s} | {a['datum']} | Satz: {info_s} | — |")
                except Exception as e:  # pragma: no cover
                    befunde_anlass.append(f"{a['handle']}: Band/Satz gescheitert: {e}"[:200])
            zeilen.append(f"| {a['handle']} | {a['datum']} | Hinweis auf Tag «{tag}» (ohne {MARKE_PROFIL}): "
                          f"{'«kommt erst nach» ' if heute >= fen['kipptag'] else '«nicht garantiert» '}(Kipptag {fen['kipptag']}, "
                          f"schnell bis {fen['schnell_bis']}) · Link {('/collections/' + link) if link else '— (keine Kollektion oben schnell)'} | — |")

    # ---- 21.10.2026: dauerhaft gepflegte MANUAL-Kollektionen (z. B. Startseiten-Reihe blitzversand-schweiz): Ausverkauftes nach hinten, sonst nichts
    if not nur_hinweis:
        for h in tab.get("kaufbar_dauerhaft") or []:
            try:
                c2, p2 = laden(h)
                if not c2:
                    zeilen.append(f"| {h} | dauerhaft | Kollektion fehlt | — |"); continue
                if c2["sortOrder"] != "MANUAL":
                    zeilen.append(f"| {h} | dauerhaft | Sortierung {c2['sortOrder']} (nicht MANUAL) — nicht angefasst | {c2['sortOrder']} |"); continue
                c2["handle"] = h
                ziel2 = kaufbar_reihenfolge(p2)
                if [p[0] for p in p2][:KOPF] == ziel2[:KOPF]:
                    zeilen.append(f"| {h} | dauerhaft | kaufbare Ware schon vorn (ausverkauft oben 24: {ausverkauft_oben(p2)}) | MANUAL |")
                    continue
                fehler2 = umsortieren(gql, c2, ziel2, "MANUAL") if SCHARF else None
                if fehler2:
                    zeilen.append(f"| {h} | dauerhaft | ⚠️ {fehler2} | MANUAL |"); continue
                n_vor = ausverkauft_oben(p2)
                if SCHARF:
                    time.sleep(3)
                    cache.pop(h, None)
                    _, p2n = laden(h)
                    n_nach = ausverkauft_oben(p2n)
                else:
                    n_nach = ausverkauft_oben([next(p for p in p2 if p[0] == i) for i in ziel2])
                zahl["umsortiert"] += 1
                zeilen.append(f"| {h} | dauerhaft | Ausverkauftes nach hinten: oben 24 vorher {n_vor} → nachher {n_nach}{'' if SCHARF else ' (TROCKEN)'} | MANUAL |")
                if n_nach > AUSVERKAUFT_OBEN_MAX and sum(1 for p in p2 if p[1] and kaufbar_von(p)) >= 24:
                    befunde_anlass.append(f"{h}: {n_nach} ausverkaufte Produkte unter den obersten 24 nach dem Sortieren")
            except Exception as e:  # pragma: no cover
                befunde_anlass.append(f"{h}: kaufbar-Sortierung gescheitert: {e}"[:200])

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
    befunde = list(befunde_anlass)
    if hinweise and not im_theme:
        befunde.append("Hinweis-Block fehlt in der Live-Datei templates/product.json (Marke LUX-ANLASS-HINWEIS)")
    if not mf_aktuell:
        befunde.append(f"Metafeld {META_NS}.{META_KEY} nicht aktuell" + (f" ({mf_fehler})" if mf_fehler else "")
                       + ("" if SCHARF else " — SCHARF=1 schreibt es"))
    zub = fan = None
    if not nur_hinweis:
        try:
            zub = zubehoer_abgleich(gql)
        except Exception as e:  # pragma: no cover
            befunde.append(f"Zubehör-Zeichen nicht abgeglichen: {e}"[:160])
        try:
            fan = front_abgleich(gql)
            if fan[0] - fan[1] > 0:
                befunde.append(f"{fan[0] - fan[1]} Fanartikel/Wintermützen tragen noch «{FRONT_TAG}»" + ("" if SCHARF else " — SCHARF=1 entfernt"))
        except Exception as e:  # pragma: no cover
            befunde.append(f"Fanartikel-Abgleich gescheitert: {e}"[:160])
    stand = {"stand": f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", "scharf": SCHARF, "hinweise": list(hinweise.values()),
             "metafeld_aktuell": mf_aktuell, "metafeld_updated": ist_upd, "block_im_theme": im_theme, "befunde": befunde,
             "zubehoer": dict(zip(("gesetzt", "entfernt", "soll", "ist_vorher"), zub)) if zub else None,
             "fanartikel_front": dict(zip(("gefunden", "entfernt"), fan)) if fan else None}
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


def _lade_kaufbar():
    """Selbsttest-Helfer: lade() gegen eine falsche gql — liefert die Kaufbar-Flags der vier Bestandsfälle."""
    def gql_falsch(q, v=None):
        if "collectionByHandle" in q:
            return {"collectionByHandle": {"id": "C1", "title": "T", "sortOrder": "MANUAL"}}
        fall = [(False, 0), (True, 0), (True, 5), (True, None)]
        nodes = [{"id": f"p{i}", "title": f"t{i}", "status": "ACTIVE", "tags": [], "productType": "", "options": [],
                  "tracksInventory": tr, "totalInventory": inv, "variants": {"nodes": [{"sku": "x", "deliveryProfile": {"name": "CH-Lager"}}]}}
                 for i, (tr, inv) in enumerate(fall)]
        return {"collection": {"products": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": nodes}}}
    _, prods = lade(gql_falsch, "x")
    return [p[5] for p in prods]


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
        # 21.10.2026: Kaufbarkeit vor Typ/Lager
        (ziel_reihenfolge([("aus1", True, True, "", (0, "x"), False), ("ok1", True, True, "", (0, "x"), True),
                           ("aus2", True, False, "", (0, "x"), False), ("ok2", True, False, "", (0, "x"), True)], True),
         ["ok1", "ok2", "aus1", "aus2"], "ausverkaufte Kostüme hinter alle kaufbaren (schnell vor langsam)"),
        (ziel_reihenfolge([("aus", True, True, "", (0, "x"), False), ("ok", True, False, "", (3, "x"), True)], True), ["ok", "aus"],
         "kaufbare Deko vor ausverkauftem ganzem Kostüm"),
        (ziel_reihenfolge([("i", False, True, "", (0, "x"), True), ("aus", True, True, "", (0, "x"), False)]), ["aus", "i"],
         "Entwurf bleibt ganz hinten, auch hinter Ausverkauftem"),
        (ziel_reihenfolge([("a", True, True), ("b", True, False)]), ["a", "b"], "ohne Kaufbar-Feld gilt kaufbar (alte Aufrufer)"),
        (kaufbar_reihenfolge([("aus", True, True, "", (0, "x"), False), ("ok", True, False, "", (0, "x"), True),
                              ("ent", False, True, "", (0, "x"), True), ("ok2", True, True, "", (0, "x"), True)]),
         ["ok", "ok2", "aus", "ent"], "kaufbar_reihenfolge: stabil, Ausverkauftes hinter Kaufbarem, Entwurf zuletzt"),
        (kaufbar_reihenfolge([("a", True, True), ("b", True, False)]), ["a", "b"], "kaufbar_reihenfolge ohne Feld: unverändert"),
        (_lade_kaufbar(), [True, False, True, False], "lade(): getrackt+0 = ausverkauft, ungetrackt+0 = kaufbar, getrackt+5 = kaufbar, None = ausverkauft"),
        (ausverkauft_oben([("a", True, True, "", (0, "x"), False), ("b", True, True, "", (0, "x"), True), ("i", False, True, "", (0, "x"), False)]),
         1, "Entwurf zählt nicht als ausverkauft oben"),
        (kostueme_oben([("a", True, True, "", (0, "x"), False), ("b", True, True, "", (0, "x"), True)]), 1, "ausverkauftes Kostüm zählt nicht als Kostüm oben"),
        # 14.10.2026 S2a: Kostüm-Klassen + Mischung
        (kostuem_klasse("Kostüm Sternenhexe", "Kostüm", ["Grösse"], ["damenkostuem"]), (0, "damenkostuem"), "Kostüm + Grösse = 0"),
        (kostuem_klasse("Kostüm Hexe schwarz", "Kostüm", ["Title"], []), (1, "andere"), "Kostüm Einheitsgrösse = 1"),
        (kostuem_klasse("Kinderkostüm Falbala", "", ["Title"], ["kinderkostuem"])[0], 1, "Kinderkostüm ohne Grösse = 1"),
        (kostuem_klasse("Blutige abgeschnittene Hand", "Partydeko & Ballone", ["Title"], ["kostuem-accessoire"])[0], 3,
         "Hand (Tag kostuem-accessoire!) = Deko 3"),
        (kostuem_klasse("Horrorpuppe", "Spielzeug & Spiele", ["Title"], [])[0], 3, "Horrorpuppe = 3"),
        (kostuem_klasse("Kanister Theaterblut 2 Liter", "Schminke", ["Title"], [])[0], 3, "Theaterblut = 3"),
        (kostuem_klasse("Hexenbesen gekrümmt", "Kostüm-Zubehör", ["Title"], [])[0], 2, "Hexenbesen = Zubehör 2"),
        (kostuem_klasse("Blumenkranz Hippie", "Kostüm-Zubehör", ["Title"], [])[0], 2, "Blumenkranz ≠ Blut (Wortanfang)"),
        (kostuem_klasse("Plüsch-Overall Kostüm Einhorn", "Spielzeug & Spiele", ["Grösse"], [])[0], 0, "Kostüm vor Spielzeug-Typ"),
        (kostuem_klasse("Kostüm Vampirin mit Blut", "Kostüm", ["Size"], [])[0], 0, "Kostüm vor Blut-Wort"),
        (ziel_reihenfolge([("hand", True, True, "", (3, "andere")), ("k1", True, True, "", (0, "damenkostuem")),
                           ("cj", True, False, "", (0, "andere")), ("k2", True, True, "", (0, "damenkostuem")),
                           ("hut", True, True, "", (2, "andere")), ("k3", True, True, "", (0, "kinderkostuem")),
                           ("eg", True, True, "", (1, "andere"))], True),
         ["k1", "k3", "k2", "eg", "hut", "hand", "cj"], "Kostüme gemischt vor Einheitsgrösse vor Zubehör vor Deko, CJ danach"),
        (ziel_reihenfolge([("a", True, False, "", (0, "x")), ("b", True, True, "", (3, "x"))]), ["b", "a"],
         "ohne kostuem_zuerst unverändert"),
        (bool(KEIN_KOSTUEM_RE.search("Wintermütze für Kinder leuchtende LED Weihnachten")), True, "Wintermütze kein Kostüm-Zubehör"),
        (bool(KEIN_KOSTUEM_RE.search("Mütze Nikolaus · Weihnachtsmann")), False, "Nikolausmütze bleibt Kostüm-Zubehör"),
        (bool(KEIN_KOSTUEM_RE.search("Hexenhut mit Schleier")), False, "Hexenhut bleibt"),
        (endspurt({"ab": dt.date(2026, 10, 2), "schnell_bis": dt.date(2026, 10, 26)}, dt.date(2026, 10, 26)), True, "Endspurt bis 26.10."),
        (endspurt({"ab": dt.date(2026, 10, 2), "schnell_bis": dt.date(2026, 10, 26)}, dt.date(2026, 10, 27)), False, "ab 27.10. kein Endspurt"),
        (bool(SATZ_RE("halloween").search('<p>a</p><p data-lux-anlass="halloween">x <a href="/y">y</a></p>')), True, "Satz-Marke gefunden"),
        (SATZ_RE("halloween").sub("", '<p>a</p><p data-lux-anlass="halloween">x</p><p>b</p>'), "<p>a</p><p>b</p>", "Satz entfernt sauber"),
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
