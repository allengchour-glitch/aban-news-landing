#!/usr/bin/env python3
"""auswahl_fehlt_messen.py — Produkte mit EINER Shop-Variante, deren CJ-Listing mehrere Varianten hat (24.09.2026).

ANLASS: «Wasserfeste Maniküre» zeigt 18 Bilder mit 14 Designs, verkauft wird eine Variante «Default Title» mit der
Produkt-SKU `CJ-<pid>`. Bei «36 Farben Cat Eye UV Nagellack-Gel Set» ist es schlimmer: CJ führt 36 EINZELNE Farben
(CKM01…CKM36, je USD 2.60) — der Titel verspricht ein Set, geliefert würde eine Flasche. Der Bestell-Automat rät nicht
(`cj_order_engine.py`: mehrere CJ-Varianten + keine Variantenangabe → «manuell prüfen»), die Bestellung bliebe also
stehen. Für die Kundin heisst das: sie sieht eine Auswahl, kann nicht wählen, und ihr Paket geht nicht raus.

NUR LESEN. Je Produkt EINE CJ-Anfrage (product/query → alle Varianten) über den gemeinsamen Takt. Gemessen wird:
Anzahl CJ-Varianten, Preisspanne, ob die Variantenbilder schon als Medien am Produkt hängen (Dateistamm — der
Dateispeicher ist bis zum Grow-Plan voll, neue Bilder gingen nicht), und ein Beispiel der variantKeys.
Ausgabe: dropship/AUSWAHL-FEHLT.md + dropship/_auswahl_fehlt.jsonl (eine Zeile je gemessenem Produkt, idempotent).
ENV: QUERY (Shopify-Suche), LIMIT (Std. 400), MIN_BILDER (Std. 8).

ZEICHEN «auswahl-offen» (13.10.2026, Kauf-Strecke Klasse 4): 3'442 aktive Produkte hatten laut dieser Messung ≥ 2 CJ-Varianten,
im Shop aber nur «Default Title» (Kostüm 638900: Bilder Spiralhund + Dackel, kein Wahlfeld). Quelle: cj_sku_import.mjs legt
immer EINE Variante an (setzt das Zeichen seit 13.10. selbst bei ≥ 2 CJ-Varianten). Regel:
    Zeichen  ⇔  aktiv · genau 1 Shop-Variante · letzte Messung hier ≥ 2 CJ-Varianten · nicht in _auswahl_nachgeruestet.txt
                (Werbetest-Sperre und Aurora werden nie geschrieben)
  · Der Messlauf (main) setzt das Zeichen für jede NEU gemessene Zeile mit ≥ 2 CJ-Varianten (ZEICHEN=0 schaltet es ab)
    → fängt auch Neuimporte anderer Importer (Lauf «Neuimporte 3 Tage» im Aufseher).
  · --markieren gleicht den ganzen Bestand ab (Trockenlauf; SCHARF=1 schreibt): fehlende setzen, nach dem Nachrüsten
    (≥ 2 Shop-Varianten, im Nachrüst-Ledger, neue Messung ≤ 1) wieder entfernen. Ledger dropship/_auswahl_offen.tsv,
    Stand dropship/_auswahl_offen_stand.json (inkl. Kanarie «Neuimport ohne Zeichen»: ≤ 3 Tage alt, Soll, Zeichen fehlt).
  · --ampel  → eine Zeile «AUSWAHL-OFFEN n (besucht m)» (live; m = davon in dropship/_klassen/auswahl-besuchte-seiten.txt).
  · --rueckweg (SCHARF=1) nimmt das Zeichen überall weg, wo es laut Ledger gesetzt wurde. --selbsttest prüft die Regel.
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_stecker_pruefen import cj, cj_url           # noqa: E402  (Takt + Retry + Tagesbudget → SystemExit)
from kollektionstexte_nachbessern import gql         # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
AUS = "dropship/_auswahl_fehlt.jsonl"
BERICHT = os.environ.get("BERICHT", "dropship/AUSWAHL-FEHLT.md")
QUERY = os.environ.get("QUERY", 'status:active AND (title:*Nagel* OR title:*Maniküre* OR title:*Nägel* OR '
                                 'title:*Press-on* OR title:*Nageldesign* OR title:*Kunstnägel*)')
LIMIT = int(os.environ.get("LIMIT", "400"))
MIN_BILDER = int(os.environ.get("MIN_BILDER", "8"))


def stamm(url):
    """Dateistamm ohne Endung und ohne Shopifys _trans/Suffix-Varianten: «3c7b2775-…_trans.jpeg» → «3c7b2775-…»."""
    n = (url or "").split("?")[0].rsplit("/", 1)[-1].rsplit(".", 1)[0]
    m = re.match(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", n, re.I)
    return (m.group(0) if m else n).lower()


FELDER = ('id handle title variantsCount{count} mediaCount{count} variants(first:1){nodes{sku price}} '
          'media(first:60){nodes{... on MediaImage{image{url}}}}')
# 08.10.2026: LISTE=<Datei> (Zeilen «<Produkt-ID>\t<Titel>», z. B. die Klassenliste aus wahlversprechen) statt QUERY — die
# Shopify-Suche kann «Text verspricht eine Auswahl» nicht ausdrücken, die Klassenliste schon.
LISTE = os.environ.get("LISTE", "")
CACHE_DATEI = "/tmp/auswahl_cj_cache.json"          # dieselbe Datei wie auswahl_nachruesten.py
try:
    CACHE = json.load(open(CACHE_DATEI))
except Exception:
    CACHE = {}


def _cache_speichern():
    """Zwei Schreiber (Messung + Nachrüsten): erst die Datei einmischen, dann atomar ersetzen — sonst löscht jeder die
    Einträge des anderen (08.10.2026)."""
    try:
        try:
            for k, v in json.load(open(CACHE_DATEI)).items():
                CACHE.setdefault(k, v)
        except Exception:
            pass
        teil = f"{CACHE_DATEI}.{os.getpid()}.teil"
        json.dump(CACHE, open(teil, "w")); os.replace(teil, CACHE_DATEI)
    except Exception:
        pass


def _passt(n):
    sku = (n["variants"]["nodes"] or [{}])[0].get("sku") or ""
    return n["variantsCount"]["count"] == 1 and n["mediaCount"]["count"] >= MIN_BILDER and sku.upper().startswith("CJ-")


def kandidaten():
    if LISTE:
        ids = [z.split("\t")[0].strip() for z in open(LISTE, encoding="utf-8") if z.strip() and not z.startswith("#")]
        ids = [i if i.startswith("gid://") else "gid://shopify/Product/" + i for i in ids]
        out = []
        for k in range(0, len(ids), 50):
            r = gql('query($i:[ID!]!){nodes(ids:$i){... on Product{status ' + FELDER + '}}}', {"i": ids[k:k + 50]})
            out += [n for n in r["nodes"] if n and n.get("status") == "ACTIVE" and _passt(n)]
            if len(out) >= LIMIT:
                break
        return out[:LIMIT]
    after, out = None, []
    while len(out) < LIMIT:
        r = gql('query($q:String!,$a:String){products(first:100,query:$q,after:$a){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title variantsCount{count} mediaCount{count} variants(first:1){nodes{sku price}} '
                'media(first:60){nodes{... on MediaImage{image{url}}}}}}}', {"q": QUERY, "a": after})["products"]
        for n in r["nodes"]:
            sku = (n["variants"]["nodes"] or [{}])[0].get("sku") or ""
            if n["variantsCount"]["count"] == 1 and n["mediaCount"]["count"] >= MIN_BILDER and sku.upper().startswith("CJ-"):
                out.append(n)
        if not r["pageInfo"]["hasNextPage"]:
            break
        after = r["pageInfo"]["endCursor"]
    return out[:LIMIT]


def main():
    neu_zeichen = []
    fertig = {}
    if os.path.exists(AUS):
        for z in open(AUS):
            try:
                d = json.loads(z); fertig[d["id"]] = d
            except Exception:
                pass
    ks = kandidaten()
    print(f"{len(ks)} Kandidaten (1 Variante, ≥{MIN_BILDER} Bilder, SKU CJ-…), {sum(1 for k in ks if k['id'] in fertig)} schon gemessen", flush=True)
    for i, n in enumerate(ks, 1):
        if n["id"] in fertig:
            continue
        sku = n["variants"]["nodes"][0]["sku"]
        url = cj_url(sku)
        if not url:                          # 09.10.: unbekannte SKU-Form → nur dieses Produkt auslassen, nicht den Lauf
            print(f"  ⏭ SKU-Form unbekannt: {sku} ({n['handle']})"); continue
        d = cj(url)
        if d is None:
            print(f"PAUSE: CJ antwortet nicht ({n['handle']})"); break
        data = d.get("data") if isinstance(d.get("data"), dict) else {}
        vs = data.get("variants") or []
        if d.get("code") == 200 and data:
            # 08.10.2026: schlanke Kopie für auswahl_nachruesten (gleiches Cache-Format, 3 Tage gültig) — sonst fragt das
            # Nachrüsten CJ ein zweites Mal, und das Tagesbudget (16900500) war am 08.10. schon um 18:40 UTC leer.
            CACHE[sku] = {"t": time.time(), "d": {"code": 200, "data": {"variants": [
                {k: v.get(k) for k in ("vid", "variantSku", "variantKey", "variantImage", "variantSellPrice")} for v in vs]}}}
            if len(CACHE) % 25 == 0:
                _cache_speichern()
        if not vs:
            zeile = {"id": n["id"], "handle": n["handle"], "titel": n["title"], "cj": 0, "grund": d.get("message") or "keine Varianten"}
        else:
            shop = {stamm(m["image"]["url"]) for m in n["media"]["nodes"] if m.get("image")}
            preise = [float(v.get("variantSellPrice") or 0) for v in vs if v.get("variantSellPrice")]
            bild_da = sum(1 for v in vs if v.get("variantImage") and stamm(v["variantImage"]) in shop)
            zeile = {"id": n["id"], "handle": n["handle"], "titel": n["title"], "preis": n["variants"]["nodes"][0]["price"],
                     "cj": len(vs), "cj_min": min(preise) if preise else None, "cj_max": max(preise) if preise else None,
                     "bild_da": bild_da, "keys": [v.get("variantKey") for v in vs[:6]]}
        with open(AUS, "a") as fh:
            fh.write(json.dumps(zeile, ensure_ascii=False) + "\n")
        fertig[n["id"]] = zeile
        if ZEICHEN_IM_MESSLAUF and (zeile.get("cj") or 0) >= 2:
            neu_zeichen.append((n["id"], n["handle"]))
        if i % 25 == 0:
            print(f"{i}/{len(ks)} gemessen", flush=True)
    _cache_speichern()
    if neu_zeichen:
        try:
            nachgeruestet = nachgeruestet_ids()
            ziele = [(i, h) for i, h in neu_zeichen if _num(i) not in nachgeruestet and not schreibsperre(i, h)]
            n_ok = zeichen_schreiben("tagsAdd", ziele, "messlauf") if ziele else 0
            print(f"ZEICHEN {ZEICHEN_TAG}: {n_ok} von {len(neu_zeichen)} neu gemessenen mit ≥ 2 CJ-Varianten gesetzt", flush=True)
        except Exception as e:  # Zeichen ist Beiwerk — die Messung selbst ist geschrieben
            print(f"  ⚠️ Zeichen {ZEICHEN_TAG} nicht gesetzt: {str(e)[:160]}", flush=True)
    bericht([fertig[k["id"]] for k in ks if k["id"] in fertig])


def bericht(rows):
    mehr = [r for r in rows if r.get("cj", 0) > 1]
    voll = [r for r in mehr if r["bild_da"] == r["cj"]]
    teil = [r for r in mehr if 0 < r["bild_da"] < r["cj"]]
    spanne = [r for r in mehr if r.get("cj_min") and r["cj_max"] > 2 * r["cj_min"]]
    L = [f"# Auswahl fehlt — 1 Shop-Variante, mehrere CJ-Varianten (Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC)", "",
         f"Suche: `{QUERY}` · gemessen {len(rows)} · **{len(mehr)} mit mehreren CJ-Varianten** "
         f"(alle Variantenbilder schon am Produkt: {len(voll)}, teilweise: {len(teil)}, keine: {len(mehr) - len(voll) - len(teil)}; "
         f"Preisspanne > 2×: {len(spanne)}) · 1 CJ-Variante: {sum(1 for r in rows if r.get('cj') == 1)} · ohne Antwort: "
         f"{sum(1 for r in rows if not r.get('cj'))}", "",
         "Folge ohne Reparatur: Bestell-Automat stoppt «manuell prüfen» (rät nie), die Kundin konnte nichts wählen.", "",
         "| Produkt | CJ-Var. | Bilder da | CJ USD | Shop CHF | Beispiele |", "|---|---|---|---|---|---|"]
    for r in sorted(mehr, key=lambda r: -r["cj"]):
        L.append(f"| {r['titel']} (`{r['handle']}`) | {r['cj']} | {r['bild_da']} | {r['cj_min']}–{r['cj_max']} | {r['preis']} | "
                 f"{', '.join(str(k) for k in r['keys'][:4])} |")
    open(BERICHT, "w").write("\n".join(L) + "\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: {len(rows)} gemessen, {len(mehr)} mit mehreren CJ-Varianten "
          f"({len(voll)} alle Bilder da) → {BERICHT}")


# ───────────────────────── Zeichen «auswahl-offen» (13.10.2026, Kauf-Strecke Klasse 4) ─────────────────────────
ZEICHEN_TAG = "auswahl-offen"
ZEICHEN_IM_MESSLAUF = os.environ.get("ZEICHEN", "1") != "0"
SCHARF = os.environ.get("SCHARF") == "1"
NACHGERUESTET = "dropship/_auswahl_nachgeruestet.txt"
BESUCHT = "dropship/_klassen/auswahl-besuchte-seiten.txt"
ZEICHEN_LEDGER = "dropship/_auswahl_offen.tsv"
ZEICHEN_STAND = "dropship/_auswahl_offen_stand.json"
# Aurora: Testprodukt Shopping Ads (Kontingent voll) — bei jedem Massenlauf per ID ausnehmen (Richter Kauf-Strecke 13.10.).
AUSNAHMEN = {"15422934647169"}
NEUIMPORT_TAGE = 3
NACH_TAG = "auswahl-nachgeruestet"   # setzt auswahl_nachruesten.py nach dem Umbau
ZEICHEN_OK = set()                   # GIDs, die der letzte zeichen_schreiben()-Aufruf bestätigt hat


def _num(x):
    return str(x or "").rsplit("/", 1)[-1].strip()


def schreibsperre(pid, handle=""):
    """Werbetest-Sperre (dropship/_werbetest_sperre.txt) + feste Ausnahmen. Fehlt der Leser, gilt vorsichtshalber alles
    aus der Datei als gesperrt (lieber ein Zeichen zu wenig als ein Schreibvorgang an einem beworbenen Produkt)."""
    if _num(pid) in AUSNAHMEN:
        return True
    try:
        from werbetest_sperre import gesperrt
        return gesperrt(pid) or (bool(handle) and gesperrt(handle))
    except Exception:
        try:
            return _num(pid) in open("dropship/_werbetest_sperre.txt", encoding="utf-8").read()
        except OSError:
            return False


def nachgeruestet_ids():
    try:
        return {z.split("\t", 1)[0].strip() for z in open(NACHGERUESTET, encoding="utf-8") if z.strip() and not z.startswith("#")}
    except OSError:
        return set()


def besucht_ids():
    try:
        return {_num(z.split("\t", 1)[0]) for z in open(BESUCHT, encoding="utf-8") if z.strip() and not z.startswith("#")}
    except OSError:
        return set()


def messung_lesen():
    """Letzte Zeile je Produkt aus _auswahl_fehlt.jsonl (spätere Messung gewinnt)."""
    rows = {}
    if os.path.exists(AUS):
        for z in open(AUS, encoding="utf-8"):
            try:
                d = json.loads(z)
                rows[d["id"]] = d
            except Exception:
                pass
    return rows


def soll_zeichen(prod, messung, nachgeruestet, gesperrt=False):
    """REGEL (rein, ohne API): True = Zeichen gehört an dieses Produkt.
    prod: {status, variants (Zahl Shop-Varianten)}; messung: Zeile aus _auswahl_fehlt.jsonl oder None;
    nachgeruestet: Produkt steht im Nachrüst-Ledger (umgebaut oder bewusst entschieden)."""
    if gesperrt or nachgeruestet or not messung:
        return False
    return prod.get("status") == "ACTIVE" and prod.get("variants") == 1 and (messung.get("cj") or 0) >= 2


def zeichen_weg(prod, messung, nachgeruestet):
    """REGEL: True = vorhandenes Zeichen ist veraltet (nachgerüstet, ≥ 2 Shop-Varianten, neue Messung ≤ 1 CJ-Variante).
    Ohne Messung bleibt es (der Importer setzt es bei ≥ 2 CJ-Varianten, bevor gemessen wurde)."""
    if nachgeruestet or (prod.get("variants") or 0) >= 2:
        return True
    return bool(messung) and (messung.get("cj") or 0) <= 1


def zeichen_schreiben(mutation, ziele, quelle):
    """ziele [(gid, handle)] → tagsAdd/tagsRemove in Bündeln zu 20 Aliassen; jede bestätigte Änderung ins Ledger
    (Rückweg: --rueckweg bzw. Gegenmutation). → Zahl bestätigter Änderungen."""
    from datetime import datetime, timezone
    art = "neu" if mutation == "tagsAdd" else "weg"
    ok = 0
    ZEICHEN_OK.clear()
    for k in range(0, len(ziele), 20):
        teil = ziele[k:k + 20]
        q = "mutation{" + " ".join(f'a{j}:{mutation}(id:"{gid}",tags:["{ZEICHEN_TAG}"]){{userErrors{{message}}}}'
                                   for j, (gid, _) in enumerate(teil)) + "}"
        try:
            r = gql(q)
        except Exception as e:
            print(f"  ⚠️ Bündel {k // 20 + 1} abgelehnt: {str(e)[:160]}", flush=True)
            continue
        zeit = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(ZEICHEN_LEDGER, "a", encoding="utf-8") as fh:
            for j, (gid, handle) in enumerate(teil):
                fehler = (r.get(f"a{j}") or {}).get("userErrors", ["?"])
                if fehler:
                    print(f"  ⚠️ {handle}: {fehler}", flush=True)
                    continue
                fh.write(f"{zeit}\t{art}\t{gid}\t{handle}\t{'ohne' if art == 'neu' else 'mit'}\t{quelle}\n")
                ZEICHEN_OK.add(gid)
                ok += 1
    return ok


def _nodes(ids, felder="id handle status tags createdAt variantsCount{count}"):
    out = {}
    for k in range(0, len(ids), 250):
        r = gql("query($i:[ID!]!){nodes(ids:$i){... on Product{" + felder + "}}}", {"i": ids[k:k + 250]})
        for n in r["nodes"]:
            if n and n.get("id"):
                out[n["id"]] = n
    return out


def _mit_zeichen(query_zusatz="", felder="id handle status tags createdAt variantsCount{count}"):
    out, after = {}, None
    q = f"tag:{ZEICHEN_TAG}" + (f" AND {query_zusatz}" if query_zusatz else "")
    while True:
        r = gql("query($q:String!,$a:String){products(first:250,query:$q,after:$a){pageInfo{hasNextPage endCursor} nodes{"
                + felder + "}}}", {"q": q, "a": after})["products"]
        for n in r["nodes"]:
            out[n["id"]] = n
        if not r["pageInfo"]["hasNextPage"]:
            return out
        after = r["pageInfo"]["endCursor"]


def _prod(n):
    return {"status": n.get("status"), "variants": (n.get("variantsCount") or {}).get("count")}


def markieren():
    """Bestand abgleichen: Soll aus der Messung (live geprüft) gegen das Zeichen im Shop. Trockenlauf ohne SCHARF=1."""
    import datetime as _dt
    messung, nach = messung_lesen(), nachgeruestet_ids()
    kand = [i for i, r in messung.items() if (r.get("cj") or 0) >= 2 and _num(i) not in nach]
    live = _nodes(kand)
    ist = _mit_zeichen()
    jetzt = _dt.datetime.now(_dt.timezone.utc)
    soll, gesperrt_n, neuimport_ohne = set(), 0, []
    for i in kand:
        n = live.get(i)
        if not n:
            continue
        sp = schreibsperre(i, n.get("handle"))
        if sp and n.get("status") == "ACTIVE" and (n.get("variantsCount") or {}).get("count") == 1:
            gesperrt_n += 1
        if soll_zeichen(_prod(n), messung.get(i), NACH_TAG in (n.get("tags") or []), sp):
            soll.add(i)
            try:
                alt = (jetzt - _dt.datetime.fromisoformat(n["createdAt"].replace("Z", "+00:00"))).days
            except Exception:
                alt = 99
            if alt <= NEUIMPORT_TAGE and ZEICHEN_TAG not in (n.get("tags") or []):
                neuimport_ohne.append((i, n["handle"]))
    add = sorted(i for i in soll if ZEICHEN_TAG not in (live[i].get("tags") or []))
    weg = sorted(i for i, n in ist.items()
                 if i not in soll and not schreibsperre(i, n.get("handle"))
                 and zeichen_weg(_prod(n), messung.get(i), _num(i) in nach or NACH_TAG in (n.get("tags") or [])))
    besucht = besucht_ids()
    print(f"AUSWAHL-OFFEN Abgleich: Messung {len(kand)} offen (≥ 2 CJ-Varianten, nicht nachgerüstet) · Soll {len(soll)} "
          f"(aktiv, 1 Shop-Variante) · gesperrt {gesperrt_n} · Zeichen da {len(ist)} · setzen {len(add)} · entfernen {len(weg)}"
          f" · Neuimport (≤ {NEUIMPORT_TAGE} T) ohne Zeichen {len(neuimport_ohne)}{'' if SCHARF else ' (TROCKEN)'}", flush=True)
    for i in add[:8]:
        print(f"  + {live[i]['handle']}")
    for i in weg[:8]:
        print(f"  − {ist[i]['handle']} ({_prod(ist[i])})")
    n_add = n_weg = 0
    nachher_ohne = list(neuimport_ohne)
    if SCHARF:
        n_add = zeichen_schreiben("tagsAdd", [(i, live[i]["handle"]) for i in add], "markieren")
        nachher_ohne = [x for x in neuimport_ohne if x[0] not in ZEICHEN_OK]
        n_weg = zeichen_schreiben("tagsRemove", [(i, ist[i]["handle"]) for i in weg], "markieren")
        print(f"  geschrieben: +{n_add} −{n_weg}", flush=True)
    stand = {"stand": jetzt.strftime("%Y-%m-%dT%H:%MZ"), "scharf": SCHARF, "messung_offen": len(kand), "soll": len(soll),
             "soll_besucht": len({_num(i) for i in soll} & besucht), "gesperrt": gesperrt_n, "zeichen_vorher": len(ist),
             "setzen": len(add), "entfernen": len(weg), "gesetzt": n_add, "entfernt": n_weg,
             # Kanarie: Neuimporte (≤ 3 T), die der Importer/Messlauf NICHT gezeichnet hatte (vor diesem Abgleich). Der erste
             # Lauf (zeichen_vorher 0, 13.10.) zählt die Ware vor der Regel — die Ampel zeigt den Wert erst danach.
             "kanarie_neuimport_ohne_vorher": len(neuimport_ohne), "neuimport_ohne_zeichen": [h for _, h in nachher_ohne[:50]],
             "neuimport_ohne_zahl": len(nachher_ohne)}
    if SCHARF:
        json.dump(stand, open(ZEICHEN_STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return 0


def ampel():
    """Eine Zeile für betreiber_ampel: «AUSWAHL-OFFEN n (besucht m)» — live: aktive Produkte mit Zeichen und genau 1 Shop-
    Variante; m = davon besuchte Seiten (90 T, auswahl_besucht_liste.py). Zusatz nur, wenn etwas schief ist."""
    import datetime as _dt
    try:
        ist = _mit_zeichen("status:active", "id variantsCount{count}")
    except Exception as e:
        print(f"AUSWAHL-OFFEN unklar (Shopify: {str(e)[:80]})")
        return 1
    offen = {i for i, n in ist.items() if (n.get("variantsCount") or {}).get("count") == 1}
    m = len({_num(i) for i in offen} & besucht_ids())
    zusatz = []
    veraltet = len(ist) - len(offen)
    if veraltet > 20:   # der Nachrüster baut stündlich bis 150 um; --markieren räumt nach — erst ein Stau ist eine Meldung
        zusatz.append(f"{veraltet} Zeichen veraltet (schon nachgerüstet, --markieren)")
    try:
        st = json.load(open(ZEICHEN_STAND, encoding="utf-8"))
        alter = (_dt.datetime.now(_dt.timezone.utc)
                 - _dt.datetime.strptime(st["stand"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=_dt.timezone.utc)).total_seconds() / 3600
        if st.get("neuimport_ohne_zahl"):
            zusatz.append(f"{st['neuimport_ohne_zahl']} Neuimporte ohne Zeichen")
        if st.get("zeichen_vorher") and st.get("kanarie_neuimport_ohne_vorher"):
            zusatz.append(f"Kanarie: {st['kanarie_neuimport_ohne_vorher']} Neuimporte kamen ohne Zeichen an (Importer/Messlauf prüfen)")
        if alter > 30:
            zusatz.append(f"Abgleich {alter:.0f} h alt")
    except Exception:
        zusatz.append("Abgleich fehlt (--markieren)")
    print(f"AUSWAHL-OFFEN {len(offen)} (besucht {m})" + (" · " + " · ".join(zusatz) if zusatz else ""))
    return 0


def rueckweg():
    """Zeichen überall entfernen, wo dieses Skript es laut Ledger gesetzt hat (SCHARF=1; sonst nur zählen)."""
    gesetzt = {}
    try:
        for z in open(ZEICHEN_LEDGER, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 4 and t[1] == "neu":
                gesetzt[t[2]] = t[3]
            elif len(t) >= 4 and t[1] == "weg":
                gesetzt.pop(t[2], None)
    except OSError:
        pass
    print(f"RÜCKWEG: {len(gesetzt)} Produkte mit gesetztem Zeichen{'' if SCHARF else ' (TROCKEN)'}")
    if SCHARF and gesetzt:
        print(f"  entfernt: {zeichen_schreiben('tagsRemove', sorted(gesetzt.items()), 'rueckweg')}")
    return 0


def selbsttest():
    f = 0
    A1 = {"status": "ACTIVE", "variants": 1}
    faelle = [
        (soll_zeichen(A1, {"cj": 2}, False), True, "Kostüm 638900: aktiv, 1 Variante, CJ 2 → Zeichen"),
        (soll_zeichen(A1, {"cj": 91}, False), True, "Tischdecke CJ 91 → Zeichen"),
        (soll_zeichen(A1, {"cj": 1}, False), False, "CJ 1 → kein Zeichen"),
        (soll_zeichen(A1, {"cj": 0, "grund": "x"}, False), False, "ohne CJ-Antwort → kein Zeichen"),
        (soll_zeichen(A1, None, False), False, "nicht gemessen → (Bestand) kein Zeichen"),
        (soll_zeichen(A1, {"cj": 6}, True), False, "nachgerüstet → kein Zeichen"),
        (soll_zeichen({"status": "DRAFT", "variants": 1}, {"cj": 6}, False), False, "Entwurf → kein Zeichen"),
        (soll_zeichen({"status": "ACTIVE", "variants": 4}, {"cj": 6}, False), False, "schon 4 Shop-Varianten → kein Zeichen"),
        (soll_zeichen(A1, {"cj": 2}, False, gesperrt=True), False, "Werbetest-Sperre → nie schreiben"),
        (zeichen_weg({"status": "ACTIVE", "variants": 3}, {"cj": 3}, False), True, "nachgerüstet (3 Varianten) → weg"),
        (zeichen_weg(A1, {"cj": 6}, True), True, "im Nachrüst-Ledger → weg"),
        (zeichen_weg(A1, None, False), False, "Importer-Zeichen ohne Messung → bleibt"),
        (zeichen_weg(A1, {"cj": 1}, False), True, "neue Messung CJ 1 → weg"),
        (zeichen_weg(A1, {"cj": 2}, False), False, "offen → bleibt"),
        (schreibsperre("gid://shopify/Product/15422934647169"), True, "Aurora nie schreiben"),
        (_num("gid://shopify/Product/16603297251719"), "16603297251719", "GID → Ziffern"),
    ]
    for ist, soll, name in faelle:
        ok = ist == soll
        f += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {name} → {ist}")
    print("SELBSTTEST", "OK" if not f else f"FEHLER ({f})")
    return 0 if not f else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--markieren" in sys.argv:
        sys.exit(markieren())
    if "--ampel" in sys.argv:
        sys.exit(ampel())
    if "--rueckweg" in sys.argv:
        sys.exit(rueckweg())
    main()
