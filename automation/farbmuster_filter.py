#!/usr/bin/env python3
"""farbmuster_filter.py — füllt das genormte Shopify-Farbfeld `shopify.color-pattern`, damit der Storefront-Filter
«Farbe» ~19 saubere Grundfarben mit Farbpunkt zeigt statt Tausender Rohwerte.

GEMESSEN 02.10.2026 (Betreiber «feinkategorie filter verbessern?»):
  - Die Facette «Farbe» auf den Kollektionsseiten liest die Option «Farbe & Grösse» — die tragen 8 Produkte. Auf
    /collections/sub-kleider (3'160 Kleider, 50/100 mit Option «Farbe») zeigte sie nur «Gelb», «Gelb-0XL» … ;
    einen Grössen-Filter gab es gar nicht.
  - Die Option «Farbe» selbst hat 35'545 verschiedene Werte (Himmelblau, Kaffeebraun, Armeegrün …); die 30
    häufigsten decken nur 43 % — ein Filter direkt auf die Option wäre eine endlose Liste.
  - Die 21 vorhandenen color-pattern-Metaobjekte sind doppelt und teils falsch verknüpft (Gold→Gray, Weiss→Rose gold).
REGEL
  - 19 eigene Grundfarben (Handle `lux-farbe-*`), verknüpft mit den Taxonomie-Farbwerten (gemessen an aa-1-4).
  - Rohwert → Grundfarbe(n) per Wortliste mit Vorrang (Roségold vor Gold/Rosé, Rosarot/Weinrot als EIN Wort,
    englische Reste mit Wortgrenze); ein Wert ohne Farbwort («Wie abgebildet», «Stil 1») zählt nicht.
  - Je Produkt die Vereinigung aller Werte der Option «Farbe»/«Color»; gesetzt wird nur, wo das Feld LEER ist oder
    nur von uns stammt (Ledger) — fremde Handpflege bleibt.
  - DRY (Standard) misst + Stichprobe; SCHARF=1 schreibt (metafieldsSet 25 je Anfrage, Eimer-Etikette über gql).
  - Die Facette selbst stellt der Betreiber in der App Search & Discovery um (keine API) → dropship/COWORK-BEFEHL.md.
"""
import collections, datetime as dt, json, os, re, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from seo_autopilot import gql

REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_farbmuster_ledger.tsv")
STAND = os.path.join(REPO, "dropship", "_farbmuster_stand.json")
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
SCHARF = os.environ.get("SCHARF") == "1"
TV = "gid://shopify/TaxonomyValue/"
TC = "gid://shopify/TaxonomyCategory/"

# (Handle-Suffix, Label, Hex, Taxonomie-Wert) — Taxonomie-IDs gemessen 02.10. an TaxonomyCategory aa-1-4 «Color»
GRUND = [
    ("schwarz", "Schwarz", "#111111", 1), ("weiss", "Weiss", "#FFFFFF", 3), ("grau", "Grau", "#8A8A8A", 8),
    ("blau", "Blau", "#2F6FD0", 2), ("marineblau", "Marineblau", "#1B2845", 15), ("rot", "Rot", "#C62828", 13),
    ("pink", "Pink", "#F48FB1", 11), ("lila", "Lila", "#8E44AD", 12), ("gruen", "Grün", "#2E9E4F", 9),
    ("gelb", "Gelb", "#F4D03F", 14), ("orange", "Orange", "#F39C12", 10), ("braun", "Braun", "#6F4E37", 7),
    ("beige", "Beige", "#D8C3A5", 6), ("gold", "Gold", "#D4AF37", 4), ("silber", "Silber", "#C0C0C0", 5),
    ("rosegold", "Roségold", "#B76E79", 16), ("bronze", "Bronze", "#CD7F32", 657),
    ("transparent", "Transparent", "#E8F4F8", 17), ("mehrfarbig", "Mehrfarbig", "#9B59B6", 2865),
]
# Reihenfolge = Vorrang; ein Treffer wird aus dem Wert entfernt, bevor die nächste Regel prüft.
REGELN = [
    (r"mehrfarbig|bunt|regenbogen|multi ?colou?r|gemischt|farbmix", "mehrfarbig"),
    (r"transparent|durchsichtig|\bklar\b|\bclear\b", "transparent"),
    (r"ros[ée] ?-?gold|rosegold", "rosegold"),
    (r"rosarot|altrosa|rosa|pink|rosé\b|magenta|fuchsia|fuchsie|zartrosa|lachs", "pink"),
    (r"gold|\bgolden\b", "gold"), (r"silber|\bsilver\b", "silber"), (r"bronze|kupfer|\bcopper\b", "bronze"),
    (r"marineblau|marine|\bnavy\b|dunkelblau", "marineblau"),
    (r"blau|t[üu]rkis|\bcyan\b|\baqua\b|\bblue\b|petrol", "blau"),
    (r"lila|violett|lavendel|flieder|purpur|\bpurple\b|aubergine", "lila"),
    (r"weinrot|bordeaux|burgund|rot\b|\bred\b", "rot"),
    (r"gr[üu]n|oliv|\bgreen\b|mint|matcha", "gruen"),
    (r"gelb|zitrone|senf|\byellow\b", "gelb"),
    (r"orange|aprikose|apricot|koralle|pfirsich", "orange"),
    (r"braun|kaffee|kamel|camel|cognac|schoko|mokka|\btan\b|\bbrown\b|karamell", "braun"),
    (r"beige|khaki|creme|crème|\bsand|elfenbein|ivory|champagner|\bnude\b|hautfarb", "beige"),
    (r"wei(?:ss|ß)|\bwhite\b|off-?white", "weiss"),
    (r"grau|anthrazit|\bgr[ae]y\b", "grau"),
    (r"schwarz|\bblack\b", "schwarz"),
]
_R = [(re.compile(m, re.I), z) for m, z in REGELN]
OPTION = {"farbe", "color", "colour"}

# Zweite Quelle (02.10.2026): Produkte OHNE Farb-Option (Schmuck, Caps, Uhren …) — Farbe aus dem TITEL, aber nur
# als GANZES Wort (keine Komposita) und nur, wenn genau EINE Grundfarbe vorkommt. Die Options-Wortliste oben ist für
# Titel zu grob (GEMESSEN: «Sandalette» → beige, «Edelweiss» → weiss, «Zitrone» → gelb, «Parrot» → rot,
# «Lavendelduft» → lila). Muster wie farbe_metafeld.py (Lehre 9b).
TITEL_REGELN = [
    (r"ros[ée][ -]?gold", "rosegold"), (r"schwarz(?:e[rsnm]?)?", "schwarz"),
    (r"wei(?:ss|ß)(?:e[rsnm]?)?", "weiss"), (r"grau(?:e[rsnm]?)?|anthrazit", "grau"),
    (r"silber(?:n|farben|ne[rsnm]?)?", "silber"), (r"gold(?:en|farben|ene[rsnm]?)?", "gold"),
    (r"bronze|kupfer(?:farben)?", "bronze"), (r"marineblau(?:e[rsnm]?)?|navy|dunkelblau(?:e[rsnm]?)?", "marineblau"),
    (r"blau(?:e[rsnm]?)?|hellblau(?:e[rsnm]?)?|himmelblau|t[üu]rkis(?:e[rsnm]?)?", "blau"),
    (r"rot(?:e[rsnm]?)?|weinrot(?:e[rsnm]?)?|bordeaux", "rot"),
    (r"gr[üu]n(?:e[rsnm]?)?|oliv(?:gr[üu]n)?|mintgr[üu]n", "gruen"), (r"gelb(?:e[rsnm]?)?", "gelb"),
    (r"orange(?:farben)?|apricot", "orange"), (r"lila|violett(?:e[rsnm]?)?|flieder", "lila"),
    (r"rosa|pink|rosarot(?:e[rsnm]?)?", "pink"), (r"beige|khaki|ecru", "beige"),
    (r"braun(?:e[rsnm]?)?|camel|cognac", "braun"), (r"bunt(?:e[rsnm]?)?|mehrfarbig(?:e[rsnm]?)?|regenbogen", "mehrfarbig"),
    (r"transparent(?:e[rsnm]?)?", "transparent"),
]
_TR = [(re.compile(r"(?<![a-zäöüß])(?:" + m + r")(?![a-zäöüß])", re.I), z) for m, z in TITEL_REGELN]


# Stichprobe 02.10.: englische Farbwörter sind im Titel meist Namen («White Noise Speaker», «Black Eight Billiards»),
# «Creme»/«Nude» Kosmetik, «Orange» ein Duft, «braunes Haar» die Haarfarbe der Kundin → Titel mit diesen Wörtern raus.
TITEL_NICHT = re.compile(r"(?<![a-zäöüß])(öl|öle|duft|aroma|creme|lotion|serum|parfum|tee|haar|haare|färbe\w*|"
                         r"lidschatten|nagellack|lippenstift|perücke|kostüm)(?![a-zäöüß])", re.I)


def titelfarbe(titel):
    """Genau eine Grundfarbe als ganzes Wort im Titel → [suffix], sonst []."""
    if TITEL_NICHT.search(titel or ""):
        return []
    s, gef = (titel or "").replace("«", " ").replace("»", " "), []
    for rx, z in _TR:
        if rx.search(s):
            if z not in gef:
                gef.append(z)
            s = rx.sub(" ", s)
    return gef if len(gef) == 1 else []


TITEL_SELBSTTEST = [("Damen High-Heel-Sandalette «Capri» · offene Spitze", []), ("Schweiz-Poster «Edelweiss»", []),
                    ("Zitruspresse für Zitrone und Limette", []), ("Sticker «Parrot» · 1 Stück", []),
                    ("Aromatisch-holziger Lavendelduft (100ml)", []), ("Baseball-Cap «Classic» · Rot, Baumwolle", ["rot"]),
                    ("S925 Silber-Halskette «Éclat»", ["silber"]), ("Herz-Ring Roségold · Zirkonia", ["rosegold"]),
                    ("Gelbes Slim-Fit Shirt mit Spitze", ["gelb"]), ("Schwarz-Weiss Sneaker", []),
                    ("Perlen-Anhänger «Coquille» · vergoldet", []), ("Cord-Bucket-Hat «Manchester» · Navy", ["marineblau"]),
                    ("White Noise Speaker mit Nachtlicht", []), ("Ätherisches Öl-Set: Orange, Minze", []),
                    ("Einfacher Färbekamm für braunes Haar", []), ("DR Japanische Sakura Creme", [])]


def grundfarben(wert):
    s, out = (wert or "").lower(), []
    for rx, z in _R:
        if rx.search(s):
            out.append(z)
            s = rx.sub(" ", s)
    return out


SELBSTTEST = [("Schwarz", ["schwarz"]), ("Weinrot", ["rot"]), ("Rosarot", ["pink"]), ("Roségold", ["rosegold"]),
              ("Himmelblau", ["blau"]), ("Marineblau", ["marineblau"]), ("Schwarz-Weiss", ["weiss", "schwarz"]),
              ("Kaffeebraun", ["braun"]), ("Armeegrün", ["gruen"]), ("Wie abgebildet", []), ("Stil 1", []),
              ("Khaki", ["beige"]), ("Dunkelgrau", ["grau"]), ("Black star", ["schwarz"]), ("Goldfarben", ["gold"]),
              ("Rotation", []), ("Hellila", ["lila"]), ("Aprikose", ["orange"]), ("Rose Print", [])]


def selbsttest():
    f = [(w, grundfarben(w), e) for w, e in SELBSTTEST if sorted(grundfarben(w)) != sorted(e)]
    f += [(w, titelfarbe(w), e) for w, e in TITEL_SELBSTTEST if titelfarbe(w) != e]
    for w, g, e in f:
        print(f"  ✗ Selbsttest «{w}»: {g} statt {e}")
    return not f


def grund_objekte():
    """Holt/erstellt die 19 lux-farbe-Metaobjekte; gibt {suffix: gid} zurück."""
    da = {}
    r = gql('{metaobjects(type:"shopify--color-pattern",first:100){nodes{id handle}}}')
    for n in r["metaobjects"]["nodes"]:
        if n["handle"].startswith("lux-farbe-"):
            da[n["handle"][10:]] = n["id"]
    for suf, label, hexf, tv in GRUND:
        if suf in da:
            continue
        if not SCHARF:
            da[suf] = f"(neu:{suf})"
            continue
        m = gql("""mutation($m:MetaobjectCreateInput!){metaobjectCreate(metaobject:$m){metaobject{id} userErrors{field message}}}""",
                {"m": {"type": "shopify--color-pattern", "handle": f"lux-farbe-{suf}",
                       "fields": [{"key": "label", "value": label}, {"key": "color", "value": hexf},
                                  {"key": "color_taxonomy_reference", "value": json.dumps([TV + str(tv)])},
                                  {"key": "pattern_taxonomy_reference",   # Pflichtfeld «Base pattern»: Solid, Mehrfarbig = Rainbow
                                   "value": TV + ("24502" if suf == "mehrfarbig" else "2874")}]}})["metaobjectCreate"]
        if m["userErrors"]:
            raise SystemExit(f"Metaobjekt {suf}: {m['userErrors']}")
        da[suf] = m["metaobject"]["id"]
        print(f"  + Metaobjekt {label} {da[suf]}")
    return da


def export_holen():
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < 6 * 3600:
        return
    q = ('{ products(query:"status:active") { edges { node { id title options { name optionValues { name } } '
         'category { id } metafield(namespace:"shopify", key:"color-pattern") { value } } } } }')
    r = gql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}", {"q": q})
    b = r["bulkOperationRunQuery"]
    if b["userErrors"]:
        raise SystemExit(f"Bulk: {b['userErrors']}")
    bid = b["bulkOperation"]["id"]
    for _ in range(240):
        time.sleep(15)
        s = gql("query($i:ID!){node(id:$i){... on BulkOperation{status url objectCount errorCode}}}", {"i": bid})["node"]
        if s["status"] == "COMPLETED":
            urllib.request.urlretrieve(s["url"], EXPORT + ".teil")
            os.replace(EXPORT + ".teil", EXPORT)
            print(f"  Export {s['objectCount']} Objekte")
            return
        if s["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {s['status']} {s['errorCode']}")
    raise SystemExit("Bulk: Zeitüberschreitung")


def mit_farbe(kat_ids=None):
    """Kategorien, für die Shopify shopify.color-pattern annimmt = die Bedingungsliste der Feld-Definition selbst
    (constraints key «category», exakte Taxonomie-Handles, ~1'000+). Sonst «Owner subtype does not match the metafield
    definition's constraints», und metafieldsSet verwirft die GANZE Charge. GEMESSEN 02.10.: «Kategorie hat ein
    Merkmal Color» ist NICHT dasselbe — damit scheiterten weiter Chargen."""
    ja, cur = set(), None
    while True:
        r = gql("query($c:String){d:metafieldDefinition(identifier:{ownerType:PRODUCT,namespace:\"shopify\",key:\"color-pattern\"})"
                "{constraints{key values(first:250,after:$c){nodes{value} pageInfo{hasNextPage endCursor}}}}}", {"c": cur})
        v = r["d"]["constraints"]["values"]
        ja |= {TC + n["value"] for n in v["nodes"]}
        if not v["pageInfo"]["hasNextPage"]:
            return ja
        cur = v["pageInfo"]["endCursor"]


def main():
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    if not selbsttest():
        raise SystemExit("Selbsttest gescheitert — nichts geschrieben")
    obj = grund_objekte()
    eigene = set(obj.values())
    export_holen()
    erledigt = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            f = z.rstrip("\n").split("\t")
            if len(f) >= 3:
                erledigt[f[1]] = f[2]
    soll, zaehl, ohne_farbe, fremd, ohne_treffer, ohne_kat, aus_titel = [], collections.Counter(), 0, 0, 0, 0, 0
    zeilen = [json.loads(l) for l in open(EXPORT, encoding="utf-8")]
    farbkat = mit_farbe({(p.get("category") or {}).get("id") for p in zeilen if p.get("category")})
    print(f"  {len(farbkat)} Kategorien in der Feld-Bedingung")
    for p in zeilen:
        if "options" not in p:
            continue
        werte = [v["name"] for o in p["options"] if o["name"].strip().lower() in OPTION for v in o["optionValues"]]
        g = []
        if werte:
            for w in werte:
                for z in grundfarben(w):
                    if z not in g:
                        g.append(z)
        elif "title" in p:
            g = titelfarbe(p["title"])          # keine Farb-Option → genau eine Farbe als ganzes Wort im Titel
            if g:
                aus_titel += 1
            else:
                ohne_farbe += 1
                continue
        else:
            ohne_farbe += 1
            continue
        if not g:
            ohne_treffer += 1
            continue
        if (p.get("category") or {}).get("id") not in farbkat:
            ohne_kat += 1          # ohne Kategorie / Kategorie ohne Farbmerkmal → nächster Tag, wenn kategorie_wache sie setzt
            continue
        ist = json.loads((p.get("metafield") or {}).get("value") or "[]")
        if ist and not set(ist) <= eigene:
            fremd += 1
            continue
        neu = [obj[z] for z in g]
        if sorted(ist) == sorted(neu):
            continue
        soll.append((p["id"], neu, g))
        zaehl.update(g)
    print(f"  Produkte: {len(soll)} zu setzen · {ohne_farbe} ohne Farb-Option · {ohne_treffer} Farb-Option ohne Farbwort · "
          f"{fremd} fremd gepflegt (bleibt) · {ohne_kat} Kategorie ohne Farbmerkmal · {aus_titel} Titel-Kandidaten")
    print("  Verteilung:", ", ".join(f"{z} {n}" for z, n in zaehl.most_common()))
    ok = 0
    if SCHARF:
        led = open(LEDGER, "a", encoding="utf-8")
        for i in range(0, len(soll), 25):
            teil = soll[i:i + 25]
            r = gql("""mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} value} userErrors{field message code}}}""",
                    {"m": [{"ownerId": pid, "namespace": "shopify", "key": "color-pattern",
                            "type": "list.metaobject_reference", "value": json.dumps(neu)} for pid, neu, _ in teil]})["metafieldsSet"]
            zurueck = {(m.get("owner") or {}).get("id"): m["value"] for m in r["metafields"] or []}
            if r["userErrors"]:   # metafieldsSet ist atomar → einzeln nachholen, Ausreisser nur melden
                print(f"  Block {i}: {r['userErrors'][0]['message'][:80]} → einzeln")
                for pid, neu, _ in teil:
                    e = gql("""mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} value} userErrors{message}}}""",
                            {"m": [{"ownerId": pid, "namespace": "shopify", "key": "color-pattern",
                                    "type": "list.metaobject_reference", "value": json.dumps(neu)}]})["metafieldsSet"]
                    for m in e["metafields"] or []:
                        zurueck[(m.get("owner") or {}).get("id")] = m["value"]
            for pid, neu, g in teil:
                if sorted(json.loads(zurueck.get(pid) or "[]")) == sorted(neu):
                    ok += 1
                    led.write(f"{dt.date.today()}\t{pid}\t{','.join(g)}\n")
            led.flush()
            if i % 2500 == 0:
                print(f"  … {i + len(teil)}/{len(soll)}", flush=True)
    json.dump({"datum": dt.datetime.utcnow().isoformat(timespec="minutes"), "zu_setzen": len(soll), "geschrieben": ok,
               "ohne_farb_option": ohne_farbe, "ohne_farbwort": ohne_treffer, "fremd": fremd, "kategorie_ohne_farbe": ohne_kat,
               "verteilung": dict(zaehl.most_common())}, open(STAND, "w"), ensure_ascii=False, indent=1)
    print(f"FERTIG: {len(soll)} zu setzen · {ok} geschrieben+zurückgelesen")


if __name__ == "__main__":
    main()
