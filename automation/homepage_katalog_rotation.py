#!/usr/bin/env python3
"""homepage_katalog_rotation.py — «mach 8 produkte aber fülle die ganze webseite mit anderen katalogen»
(Betreiber 14.09.2026, nach dem Shop-Vergleich: Startseite 6,92 MB, Median der CH-Shops ~0,4 MB).

Was es tut (idempotent, täglich aus fixer_keepalive.sh):
  1. JEDE product-list-Reihe der Startseite zeigt 8 Produkte (max_products=8) und rendert als Karussell
     (layout_type=carousel — grid+carousel_on_mobile renderte jede Reihe doppelt, gemessen 14.09.).
  2. FESTE Reihen bleiben (Hype, Bestseller, Neu, CH-Lager, Damen, Herren, Wohnen, Schmuck, Schuhe, Elektronik).
  3. WECHSEL-Reihen (8 Stueck) zeigen jeden Tag acht ANDERE Kataloge aus dem POOL — so kommt ueber
     ~3 Wochen der ganze Katalog auf die Startseite, ohne die 25-Sektionen-Grenze zu sprengen.
     Saison zuerst: Halloween bis 31.10., Weihnachten ab 15.10.
  4. Die Sektion banner_trust (Hero-Banner mit Trust-Satz; derselbe Satz steht in trust_advantages und im
     Ankuendigungsband) wird EINMAL in eine Wechsel-Reihe umgebaut (Klon von pl_querbeet) — Startseite ist am
     25-Sektionen-Limit, neue Reihen gehen nur durch Umwidmen.

  5. SAISON-FESTE Reihe (23.09.2026, Betreiber «webseite auch herbstsachen und toller machen»): die alte
     Wechsel-Reihe budget_unter25 (Rest der Aktion «unter CHF 25») heisst jetzt pl_herbst, steht EINMALIG
     direkt nach den Bestsellern und zeigt vom 22.09. bis 30.11. fest «🍂 Herbst-Favoriten»
     (automation/herbst_kuratieren.py). In diesem Fenster dreht die Rotation sie NICHT; danach kehrt sie
     von selbst in die Wechsel-Rotation zurueck (Weihnachten laeuft ab 15.10. ueber SAISON im Pool).

  python3 automation/homepage_katalog_rotation.py --selbsttest     Gegenprobe auf einer Kopie (kein Netz)
  DRY=1 python3 automation/homepage_katalog_rotation.py            zeigt nur
  python3 automation/homepage_katalog_rotation.py                  schreibt (Backup theme_backup/index.json.rot-<datum>)
"""
import copy, datetime, json, os, re, subprocess, sys

SHOP = "au3j0y-hq.myshopify.com"
API = f"https://{SHOP}/admin/api/2026-01/graphql.json"
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
TOKENDATEI = "/tmp/cj_shop_token.txt"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX = 8

FEST = {"pl_trends", "product_list_topseller", "product_list_wm2026", "product_list_blitz", "mode_row",
        "pl_wohnen", "product_list_schweiz", "schmuck_row", "pl_beauty", "elektronik_row"}
WECHSEL = ["pl_kinder", "pl_tech_gadgets", "pl_senioren", "pl_spass_gadgets", "pl_herbst",
           "product_list_L3EDnA", "pl_querbeet", "pl_wechsel_taschen"]
# Saison-feste Reihen: (Sektion, Kollektion, von, bis). Im Fenster fest, sonst normale Wechsel-Reihe.
SAISON_FEST = [("pl_herbst", "herbst-favoriten", (9, 22), (11, 30))]
UMBENENNEN = ("budget_unter25", "pl_herbst", "product_list_topseller")   # alt, neu, einmalig danach einreihen
# Pool: veroeffentlichte Kataloge mit >= ~300 Produkten, die NICHT in einer festen Reihe stehen (gemessen 14.09.).
POOL = ["sub-kueche", "sub-taschen", "spielzeug", "sport-outdoor", "make-up", "werkzeug-maschinen", "sub-uhren",
        "aufbewahrung-sub", "hundewelt", "buero-schreibwaren", "parfum-duefte", "outdoor-garten",
        "klemmbausteine-bausaetze", "sub-reise", "gaming", "basteln-diy", "katzenwelt", "party-deko-ch",
        "handy-zubehoer", "sub-baby-kids", "auto-kfz-zubehoer", "beauty-pflege", "kostueme-ch-lager",
        "geschenke-unter-50-franken", "sub-haustier", "suesses-esswaren"]   # 14.09.: Betreiber «Kategorie mit Essen von Fortura» — 31 Süsswaren ab CH-Lager
# Reihenfolge bewusst: Hunde(8)/Katzen(16)/Haustier(24) liegen >= 8 auseinander -> nie zwei Tier-Reihen an einem Tag
# 23.09. 23:30: «halloween» statt «halloween-2026» — beide Kollektionen trugen dieselbe Regel (Tag halloween, 230 Produkte);
# das Menü zeigt auf /collections/halloween (6 Kanäle, längerer Text), die 2026er ist abgemeldet + 301.
SAISON = [("halloween", (9, 1), (10, 31)), ("weihnachten-2026", (10, 15), (12, 26))]


def saison_fest_heute(tag):
    md = (tag.month, tag.day)
    return {k: h for k, h, von, bis in SAISON_FEST if von <= md <= bis}


def pool_heute(tag):
    """Saison-Kataloge zuerst, dann der Pool um den Tages-Offset gedreht — 8 verschiedene."""
    md = (tag.month, tag.day)
    vorne = [h for h, von, bis in SAISON if von <= md <= bis]
    n = len(POOL); rot = tag.toordinal() % n
    reihe = vorne + [POOL[(rot + i) % n] for i in range(n)]
    aus, seen = [], set()
    for h in reihe:
        if h not in seen:
            aus.append(h); seen.add(h)
        if len(aus) == len(WECHSEL):
            break
    return aus


def umbauen(t, tag):
    """Wendet alle Regeln auf das Template-Dict an. Gibt (geaendert:bool, notizen:list) zurueck."""
    notizen = []; vorher = json.dumps(t, sort_keys=True)
    secs, order = t["sections"], t["order"]
    # 4. banner_trust -> Wechsel-Reihe (einmalig)
    if "banner_trust" in secs and "pl_wechsel_taschen" not in secs and "pl_querbeet" in secs:
        klon = copy.deepcopy(secs["pl_querbeet"])
        klon["settings"]["collection"] = "sub-taschen"
        secs["pl_wechsel_taschen"] = klon
        t["order"] = order = [("pl_wechsel_taschen" if k == "banner_trust" else k) for k in order]
        del secs["banner_trust"]
        notizen.append("banner_trust -> pl_wechsel_taschen (Klon von pl_querbeet)")
    # 5. Umbenennen + einmalig nach oben (budget_unter25 -> pl_herbst direkt nach den Bestsellern)
    alt, neu, nach = UMBENENNEN
    if alt in secs and neu not in secs:
        secs[neu] = secs.pop(alt)
        order = [k for k in t["order"] if k != alt]
        pos = order.index(nach) + 1 if nach in order else len(order)
        order.insert(pos, neu)
        t["order"] = order
        notizen.append(f"{alt} -> {neu} (Position {pos + 1}, nach {nach})")
    # 1. 8 Produkte, Karussell
    for k, s in secs.items():
        if s.get("type") == "product-list":
            st = s.setdefault("settings", {})
            if st.get("max_products") != MAX:
                st["max_products"] = MAX; notizen.append(f"{k}: max_products -> {MAX}")
            if st.get("layout_type") != "carousel":
                st["layout_type"] = "carousel"; notizen.append(f"{k}: layout_type -> carousel")
    # 5b. Saison-feste Reihen setzen (im Fenster nie von der Rotation ueberschrieben)
    sf = saison_fest_heute(tag)
    for k, h in sf.items():
        if k in secs and secs[k]["settings"].get("collection") != h:
            notizen.append(f"{k}: {secs[k]['settings'].get('collection')} -> {h} (Saison fest)")
            secs[k]["settings"]["collection"] = h
    # 3. Wechsel-Reihen
    fest_colls = {secs[k]["settings"].get("collection") for k in list(FEST) + list(sf) if k in secs}
    heute = [h for h in pool_heute(tag) if h not in fest_colls]
    for k, h in zip([w for w in WECHSEL if w in secs and w not in sf], heute):
        if secs[k]["settings"].get("collection") != h:
            notizen.append(f"{k}: {secs[k]['settings'].get('collection')} -> {h}")
            secs[k]["settings"]["collection"] = h
    return json.dumps(t, sort_keys=True) != vorher, notizen


def gql(q, v=None):
    tok = open(TOKENDATEI).read().strip()
    # Body ueber stdin: das Template hat 140 KB, als Argument -> «Argument list too long» (14.09.)
    r = subprocess.run(["curl", "-s", "--max-time", "60", API, "-H", "X-Shopify-Access-Token: " + tok,
                        "-H", "Content-Type: application/json", "--data-binary", "@-"],
                       input=json.dumps({"query": q, "variables": v or {}}), capture_output=True, text=True)
    return json.loads(r.stdout)


def selbsttest():
    fehler = 0
    def pruefe(ok, was):
        nonlocal fehler; print(("  ✔ " if ok else "  ✘ ") + was); fehler += (not ok)
    basis = {"type": "product-list", "settings": {"collection": "x", "layout_type": "grid", "carousel_on_mobile": True,
             "max_products": 12}, "blocks": {"static-header": {"type": "_product-list-content"}}}
    secs = {k: copy.deepcopy(basis) for k in list(FEST) + [w for w in WECHSEL if w not in ("pl_wechsel_taschen", "pl_herbst")]
            + ["budget_unter25"]}
    for k, c in zip(FEST, ["hype-jetzt", "bestseller", "neu-eingetroffen", "blitzversand-highlights", "damen-mode",
                          "wohnen-dekoration", "fur-ihn", "premium-schmuck", "schuhe-sneaker", "elektronik-technik"]):
        secs[k]["settings"]["collection"] = c
    secs["banner_trust"] = {"type": "hero", "settings": {}}
    secs["lux_usp"] = {"type": "custom-liquid", "settings": {"custom_liquid": "x"}}
    t = {"sections": secs, "order": list(secs.keys())}
    n_vor = len(t["order"])
    tag = datetime.date(2026, 9, 23)   # im Herbstfenster (22.09.–30.11.) und in der Halloween-Saison
    ge, notizen = umbauen(t, tag)
    pruefe(ge and len(notizen) > 10, f"erster Lauf aendert ({len(notizen)} Notizen)")
    pruefe("pl_wechsel_taschen" in t["sections"] and "banner_trust" not in t["sections"], "banner_trust wurde zur Wechsel-Reihe")
    pruefe(len(t["order"]) == n_vor and "banner_trust" not in t["order"] and "pl_wechsel_taschen" in t["order"], "order: gleiche Laenge, Schluessel getauscht")
    pruefe("budget_unter25" not in t["sections"] and "budget_unter25" not in t["order"]
           and t["order"].index("pl_herbst") == t["order"].index("product_list_topseller") + 1,
           "budget_unter25 -> pl_herbst, direkt nach den Bestsellern")
    pruefe(len(t["order"]) == len(t["sections"]) == n_vor, f"Sektionszahl gleich ({n_vor})")
    pl = [s for s in t["sections"].values() if s["type"] == "product-list"]
    pruefe(all(s["settings"]["max_products"] == MAX and s["settings"]["layout_type"] == "carousel" for s in pl), f"alle {len(pl)} Reihen: 8 Produkte, Karussell")
    pruefe(t["sections"]["pl_herbst"]["settings"]["collection"] == "herbst-favoriten", "Herbstfenster: pl_herbst zeigt herbst-favoriten")
    WR = [w for w in WECHSEL if w != "pl_herbst"]
    wc = [t["sections"][k]["settings"]["collection"] for k in WR]
    fc = {t["sections"][k]["settings"]["collection"] for k in FEST}
    pruefe(len(set(wc)) == len(WR) and not (set(wc) & fc), f"{len(WR)} verschiedene Wechsel-Kataloge, keiner doppelt zu festen: {wc}")
    pruefe("halloween" in wc, "Saison: Halloween steht im September vorne")
    ge2, n2 = umbauen(t, tag)
    pruefe(not ge2 and not n2, "Gegenprobe: zweiter Lauf am selben Tag aendert nichts (idempotent)")
    ge3, n3 = umbauen(t, tag + datetime.timedelta(days=1))
    wc3 = [t["sections"][k]["settings"]["collection"] for k in WR]
    pruefe(ge3 and wc3 != wc and len(set(wc3)) == len(WR), "naechster Tag: andere Kataloge, wieder alle verschieden")
    pruefe(t["sections"]["pl_herbst"]["settings"]["collection"] == "herbst-favoriten", "Herbstfenster: pl_herbst bleibt fest auf herbst-favoriten")
    t_dez = copy.deepcopy(t); umbauen(t_dez, datetime.date(2026, 12, 2))
    pruefe(t_dez["sections"]["pl_herbst"]["settings"]["collection"] != "herbst-favoriten", "nach dem 30.11.: pl_herbst dreht wieder mit")
    dez = umbauen(copy.deepcopy(t), datetime.date(2026, 12, 1))
    pruefe("halloween" not in pool_heute(datetime.date(2026, 12, 1)) and "weihnachten-2026" in pool_heute(datetime.date(2026, 12, 1)), "Saison: im Dezember Weihnachten statt Halloween")
    alle = set()
    for d in range(len(POOL)):
        alle |= set(pool_heute(tag + datetime.timedelta(days=d)))
    pruefe(set(POOL) <= alle, f"ueber {len(POOL)} Tage kommt JEDER Pool-Katalog dran")
    print("SELBSTTEST BESTANDEN" if not fehler else f"SELBSTTEST FEHLGESCHLAGEN ({fehler})")
    return fehler


def main():
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    dry = os.environ.get("DRY") == "1"
    d = gql('{theme(id:"%s"){files(filenames:["templates/index.json"]){nodes{body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % THEME)
    raw = d["data"]["theme"]["files"]["nodes"][0]["body"]["content"]
    m = re.match(r"^(/\*.*?\*/\s*)", raw, flags=re.S); pre = m.group(1) if m else ""
    t = json.loads(raw[len(pre):])
    tag = datetime.date.today()
    ge, notizen = umbauen(t, tag)
    for n in notizen: print("  " + n)
    if not ge:
        print(f"{tag} unveraendert (schon auf Stand)"); return
    if dry:
        print(f"DRY: {len(notizen)} Aenderungen, nichts geschrieben"); return
    bk = os.path.join(REPO, "theme_backup", f"index.json.rot-{tag.isoformat()}")
    if not os.path.exists(bk):
        open(bk, "w").write(raw)
    neu = pre + json.dumps(t, ensure_ascii=False, indent=2); json.loads(neu[len(pre):])
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME, "files": [{"filename": "templates/index.json", "body": {"type": "TEXT", "value": neu}}]})
    ue = r.get("data", {}).get("themeFilesUpsert", {}).get("userErrors")
    if ue:
        print("FEHLER", ue); sys.exit(1)
    # ⚠️ 23.09.2026: Direkt nach themeFilesUpsert lieferte das Rücklesen noch die ALTE Datei (pl_herbst fehlte,
    # 5 s später war sie da). Deshalb: kurz warten und bis zu 5x lesen, bevor «nicht bestätigt» gemeldet wird.
    import time
    for _ in range(5):
        time.sleep(4)
        back = gql('{theme(id:"%s"){files(filenames:["templates/index.json"]){nodes{body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % THEME)["data"]["theme"]["files"]["nodes"][0]["body"]["content"]
        ok = back.count('"max_products": 8') >= 17 and '"pl_wechsel_taschen"' in back and '"pl_herbst"' in back
        if ok:
            break
    print(f"{tag} geschrieben: {len(notizen)} Aenderungen · Ursprung bestaetigt={ok} · Wechsel-Reihen heute: {[t['sections'][k]['settings']['collection'] for k in WECHSEL if k in t['sections']]}")


if __name__ == "__main__":
    main()
