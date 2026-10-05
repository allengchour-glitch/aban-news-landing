#!/usr/bin/env python3
"""kategorie_rein_2.py — Menü-Kategorien ohne Fremdware, Runde 2 (04.10.2026, Betreiber «fix 12 h lang alles»).

Schwester von kategorie_rein.py (dort Schmuck/Taschen/Deko/Kissen/Jeans/Stiefel). Hier die Kategorien, bei denen der
TYP allein Mitglied macht (Kinderschuhe gehören zu «Kinder & Baby», auch ohne «Kinder» im Titel) — darum eine Regel mit
drei Stufen statt Titel ∧ Typ:
  gehört ⇔ (Typ ∈ KERN  ∨  Titel trifft ECHT) ∧ kein BAN im Titel ∧ Typ ∉ FREMD
  KERN-Typen zählen ohne BAN (ausser kern_ban), «vertraute» Typen (Haustierbedarf bei Hunde/Katzen) ebenfalls ohne BAN;
  `haupt=True` prüft ECHT nur im Titel-HAUPTTEIL (Handy, Ladegeräte, Aroma).
Der Titel-HAUPTTEIL ist der Teil vor «mit»/«inkl.»/«&»/«+»: «Yogamatte mit Handyhalter» ist eine Yogamatte, «Nachtlicht
mit kabellosem Ladegerät» ein Nachtlicht — gemessen 04.10.: 81 Fremde in «Handy-Zubehör», fast alle dieser Form.

GEMESSEN 04.10. (Produkttyp-Filter je Menü-Kollektion): «Kinder & Baby» 39 Typen, 291× Haustierbedarf (Katzen-Spielzeug
über Regel TITLE «Spielzeug»); «Haustierwelt» mit Kinderkostüm Katze, Denim-Shorts mit Welpen-Design, BRUDER CAT (Bagger),
Katzenpfoten-Anhänger; «Katzen» mit Kostümen + Handyhülle; «Aroma & Diffuser» mit Seifenform, Cologne, Datenkabel;
«Büro & Home Office» mit Büro-Kleidern (Tag «buero» auf Damenmode); «Hunde» zeigte nur 419 von ~1'500 Hundeartikeln
(Tag «sub-hund» wurde nie nachgezogen).
Dann eigener Tag «kat-…», die Kollektion zeigt nur noch diesen Tag (alte Regel in dropship/_kategorie_rein_regeln_alt.json,
Mitglieder vorher in dropship/_kategorie_rein_2_vorher.tsv, jede Tag-Änderung in dropship/_kategorie_rein_2_tags.tsv).
Schutz: wird die Kollektion um mehr als 40 % kleiner, wird NICHT umgestellt. Nie über 5'000 aktive (Filtergrenze).
Schreibweg: ab 50 Tag-Änderungen eine BULK-Mutation (stagedUpload JSONL → bulkOperationRunMutation tagsAdd/tagsRemove, Muster
aus preis_senken.py) — GEMESSEN 04.10. 23:34: einzeln (10 je Anfrage) kamen 210 Tags in 5 min, der Eimer stand bei 351/2000,
weil vier andere Schreiber liefen; 11'000 Tags hätten 4 h gebraucht. Bulk kostet den Eimer ~10 Punkte für den ganzen Lauf.
Kleine Reste gehen weiter einzeln mit Eimer-Etikette (eimer_etikette.nachlauf).
  python3 automation/kategorie_rein_2.py [handle …]            (trocken, Stichprobe der Zu-/Abgänge)
  STICHPROBE=25 python3 automation/kategorie_rein_2.py handle   (mehr lesen)
  SCHARF=1 python3 automation/kategorie_rein_2.py [handle …]
  python3 automation/kategorie_rein_2.py --nachmessen [handle …] (Regel + aktive Zahl live, wartet auf Shopify)
"""
import collections, json, os, random, re, subprocess, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALT = os.path.join(REPO, "dropship/_kategorie_rein_regeln_alt.json")
LEDGER = os.path.join(REPO, "dropship/_kategorie_rein.tsv")
VORHER = os.path.join(REPO, "dropship/_kategorie_rein_2_vorher.tsv")
TAGS = os.path.join(REPO, "dropship/_kategorie_rein_2_tags.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
STICHPROBE = int(os.environ.get("STICHPROBE", "10"))
SHOP = "au3j0y-hq.myshopify.com"
R = lambda s: re.compile(s, re.I)
TRENNER = R(r"\bmit\b|\binkl\.?\b|\binklusive\b|\bplus\b|\+")   # «und»/«&» NICHT: «Solar- und Kurbel-Powerbank» ist eine Powerbank

# Typen, die in KEINE dieser Kategorien gehören, wenn nur der Titel trifft (Kleid «für Büro», Katzen-Ohrringe, Kinder-Kostüm
# im Haustier-Regal). Je Kategorie wird die Liste ergänzt oder gekürzt.
MODE_SCHMUCK = {"Damenmode", "Herrenmode", "Schmuck", "Ring", "Halskette", "Ohrringe", "Armband", "Uhren", "Accessoires",
                "Hüte & Caps", "Shirt", "Hoodies & Pullover", "Damenschuhe", "Herrenschuhe", "Make-up", "Hautpflege",
                "Nageldesign", "Beauty-Tools", "Kostüme & Verkleidung", "Partydeko & Ballone", "Tasse", "Poster", "Selbst gestalten",
                "Sticker", "Mauspad"}
# 05.10. (Prüfer «kategorie»): `\bpets?\b` traf «USB Mini Luftbefeuchter "Cute Pet Bear"» und «Polyester PET Luftfiltergewebe».
TIER_BAN = (r"luftbefeuchter|filtergewebe|pet bear|kostüm|verkleidung|katzenaugen?-?(sonnen)?brille|cat.?eye|pet-?flasche|\bcat\b|caterpillar|\bbruder\b|bworld|hundert|kissenbezug|sonnenbrille|"
            r"anhänger|ohrring|halskette|armband|\bring\b|haarreif|haarband|haarspange|ohren-|t-shirt|shorts|socken|pyjama|"
            r"schutzhülle|handyhülle|hülle für|wandtattoo|wandbild|poster|tasse|pferdeschwanz|hot.?dog|dogecoin|anti-?kater|"
            r"für (kinder|babys?|damen|herren|mädchen|jungen)|kinder|baby|kopfhaut|massagebürste|\bstoff\b|baumwollstoff|puzzle|ornament|"
            r"\bfigur|skulptur|(hunde|katzen)-?lampe|kunstharz|quallen|ohrhörer|etui|wandbild|leinwand|malen nach zahlen|diamond painting|brosche|pin\b|schlüsselanhänger|"
            r"gemälde|anatomie|kopfhörer|katzenohren|kätzchenohren|tastenkappe|tastatur|plüsch-?kissen|dekoration|desktop|"
            r"(hunde?|katzen?)-?(design|motiv)|aus pet\b|roboter|robot|\bcase\b|handgriff|kreuzstich|stickbild|stickerei|treibsand")
TIER_FREMD = MODE_SCHMUCK | {"Wohnen & Deko", "Baby & Kinder", "Kinder", "Kinderschuhe", "Taschen", "Küche & Bar", "Heimtextilien",
                             "Wellness & Aromatherapie"}
LADE_BAN = (r"(ladestation|ladegerät|ladekabel|lader) für (haarschneide|rasierer|zahnbürste|controller|gamepad|ps[45]|xbox|switch|"
            r"smartwatch|apple watch|galaxy watch|e-?bike|scooter|roller|akkus?|batterien?|kamera|drohne|staubsauger|laptop|notebook|"
            r"macbook)|controller|gamepad|\bps[45]\b|xbox|nintendo|ni-?cd|ni-?mh|18650|21700|16340|cr123|lithium|li-?ion|\baaa?\b|"
            r"tattoo|nagel|\bnail|beheizbare weste|led-?weste|warnweste|reflektierende|yogamatte|bauchmuskel|tennisnetz|handventilator|"
            r"haarschneide|rasierer|hunde|haustier|katzen|usb-?stick|usb-?hub|\bhub\b|docking|tassenwärmer|pfeffermühle|lederarmband|"
            r"velo-?licht|fahrradlicht|\bradio\b|e-?scooter|e-?bike|balance board|kühlstation|ventilator|batterieladegerät|fahrzeugladegerät")
LADE_BAN_HANDY = LADE_BAN + r"|smartwatch|apple watch|galaxy watch|laptop|macbook|notebook|oculus|quest|kopfband|handwärmer"

CFG = {
    "sub-baby-kids": dict(
        tag="kat-kinder-baby",
        suche=["baby", "kinder", "kind", "spielzeug", "mädchen", "jungen", "kleinkind", "puppe", "bausteine", "ferngesteuert"],
        echt=R(r"kinder|\bkinds?\b|baby|babys\b|kleinkind|säugling|neugeboren|spielzeug|bausteine|klemmbaustein|ferngesteuert|"
               r"\brc\b|puppe|kuscheltier|plüschtier|mädchen|\bjunge[ns]?\b|schulranzen|babyphone|kinderwagen|lätzchen|schnuller|"
               r"windel|stillkissen|wickel|buggy|laufgitter|krabbel|schulkind|teenager|kita\b|schulanfang|bausatz|bauklötze|bauklotz|"
               r"holzpuzzle|puzzle|modellbau|flugball|plüsch|kuschel.{0,6}(kinder|baby)|brettspiel|kartenspiel|spielfigur|spielset|spielmatte|holzmodell|"
               r"flugzeugmodell|automodell|modellauto|zusammenbau|bauset|steckbaustein|klemmbaustein|baukasten|bworld|\bbruder\b"),
        ban=R(r"babyliss|babydoll|baby.?(blau|blue|pink|rosa)|kinderwunsch|erotik|\bsex|vibrator|dessous|schaufensterpuppe|"
              r"puppenkopf|übungskopf|frisierkopf|hunde(spielzeug|leine|halsband|geschirr|bett|napf|futter|mantel|kleidung|pullover|"
              r"jacke|regenmantel|box|kissen|decke|ball)|katzen(spielzeug|angel|minze|klo|toilette|brunnen|baum|kratz|futter|napf|"
              r"höhle|bett|tunnel|streu|ball)|für (hunde|katzen|haustiere|welpen|hund und katze|hund & katze|hund|katze|kleine hunde|"
              r"grosse hunde)|haustier|welpe|\bpets?\b|kauspielzeug|kratzbaum|zahnpflege für hunde|hund und katze|hund & katze|"
              r"katzenspielzeuge|intelligente katzen|interaktives katzen|raucher|zigarette|\bvape|"
              r"junge (männer|frauen|leute|erwachsene|damen|herren|haut|mütter|eltern)|mädchenhaft|für erwachsene\b(?!.*kinder)|"
              r"puppenkragen|\bstoff\b|baumwollstoff|kleiderstoff|meterware|\bjunges\b|\bjunger\b|ihr junges|mädchenherz"),
        kern_ban=R(r"für (ruhige )?(hunde|katzen|haustiere|welpen|hund und katze|hund & katze|hund|katze)|haustier|welpe|\bpets?\b|hunde-?spielzeug|"
                   r"katzen-?spielzeug|kauspielzeug|katzenangel|schnüffel|quietsch|katzenhängematte|hunde-?plüschtier|hunde-?nächte|katzen-?plüschkissen"),
        kern={"Kinderschuhe", "Spielzeug & Spiele", "Baby & Kinder", "Kinder", "Spielzeug"},
        kern_tag=("spielzeug", {"Spass-Elektronik", "Gadget", "Elektronik", "Basteln & DIY"}),   # Bausteine, RC, Roboter: Tag + Typ = Spielzeug
        fremd={"Haustierbedarf", "Raucherzubehör", "Erotik"}),
    "sub-haustier": dict(
        tag="kat-haustier",
        suche=["hund", "katze", "haustier", "welpe", "pet", "hamster", "kaninchen", "aquarium", "vogel"],
        suche_q=["product_type:Haustierbedarf status:active"],
        echt=R(r"hund(?!ert)|hündin|welpe|katze|kätzchen|haustier|\bpets?\b|hamster|kaninchen|meerschwein|nager\b|papagei|wellensittich|"
               r"aquarium|terrarium|reptil|vogelfutter|vogelhaus|vogelhäus|hühner|kratzbaum|futternapf|fressnapf|futterautomat|"
               r"katzenklo|kauspielzeug|\bdogs?\b|quietsch"),
        ban=R(TIER_BAN),
        kern={"Haustierbedarf"},
        fremd=TIER_FREMD),
    "haustier-hunde": dict(
        tag="kat-hunde", suche=["hund", "welpe"],
        echt=R(r"hund(?!ert)|hündin|welpe|\bdogs?\b"),
        ban=R(TIER_BAN),
        vertraut={"Haustierbedarf"},
        kern=set(),
        fremd=TIER_FREMD),
    "haustier-katzen": dict(
        tag="kat-katzen", suche=["katze", "kätzchen", "kratzbaum", "katzenklo"],
        echt=R(r"katze|kätzchen|kratzbaum|katzenklo|katzenstreu|katzenminze"),
        ban=R(TIER_BAN),
        vertraut={"Haustierbedarf"},
        kern=set(),
        fremd=TIER_FREMD),
    "handy-zubehoer": dict(
        tag="kat-handy",
        suche=["handyhülle", "panzerglas", "ladekabel", "ladegerät", "powerbank", "handyhalter", "wireless charger", "handy",
               "smartphone", "iphone", "magsafe", "airpods"],
        echt=R(r"handy|hülle für|case für|schutzhülle|panzerglas|schutzglas|displayschutz|schutzfolie|ladekabel|ladegerät|ladestation|"
               r"powerbank|smartphone|wireless.?charger|kabellos(es|er)? lade|induktions-?lade|iphone|galaxy|airpods?|magsafe|"
               r"popsocket|selfie-?stick|auto-?halterung|lightning|usb-c.{0,14}kabel|kabel.{0,14}usb-c|datenkabel|ladepad"),
        ban=R(LADE_BAN_HANDY + r"|handyman|handy tools|hundespielzeug|cat ear|katzenohr|galaxy (projektor|lampe|licht|sternenhimmel)|spielzeug|kinder-?handy"),
        haupt=True,
        kern={"Handy-Zubehör"},
        fremd={"Nageldesign", "Haustierbedarf", "Schmuck", "Küche & Bar", "Werkzeug & Heimwerken", "Beauty-Tools", "Damenmode",
               "Herrenmode", "Hautpflege", "Make-up", "Spielzeug & Spiele", "Spass-Elektronik", "Kostüme & Verkleidung", "Partydeko & Ballone"}),
    "elektronik-laden": dict(
        tag="kat-laden",
        suche=["ladegerät", "powerbank", "ladestation", "ladekabel", "wireless charger", "netzteil", "magsafe", "ladepad"],
        echt=R(r"ladegerät|powerbank|ladestation|ladekabel|wireless.?charger|lade-?netzteil|usb-c.{0,12}netzteil|(laptop|notebook)-?netzteil|"
               r"netzteil-?adapter|kfz-?lader|magsafe.{0,14}(lade|charger|powerbank)|ladepad|ladedock|induktions-?lade|"
               r"kabellos(es|er)? lade|schnelllade|\blader\b|ladeständer"),
        ban=R(LADE_BAN),
        haupt=True,
        kern=set(),
        fremd={"Nageldesign", "Gaming-Zubehör", "Haustierbedarf", "Schmuck", "Küche & Bar", "Werkzeug & Heimwerken", "Beauty-Tools",
               "Damenmode", "Herrenmode", "Hautpflege", "Make-up", "Spielzeug & Spiele", "Kostüme & Verkleidung", "Partydeko & Ballone"}),
    "sub-aroma-diffuser": dict(
        tag="kat-aroma",
        suche=["diffuser", "diffusor", "aroma", "luftbefeuchter", "duftöl", "ätherisch", "räucher", "duftlampe", "raumduft"],
        echt=R(r"diffuser|diffusor|aroma|luftbefeuchter|nebelbefeuchter|befeuchter|ätherisch|duftöl|duftlampe|duftstein|räucher|duftspender|"
               r"humidifier|raumduft"),
        haupt=True,
        ban=R(r"aromatisch|aromatic|cologne|parfum|parfüm|eau de|massageöl|seifenform|kerzenform|\bgips|kerzen?\b|aromakerze|duftkerze|"
              r"wachskerze|candle|datenkabel|"
              r"\bkabel\b|terrari|gesichtsdampfer|gesichts-?sauna|geschenkset mit|aroma-?reis|aroma-?kaffee|aromabeutel|hunde|katzen|"
              r"haustier|kinder|baby|lippen|zahn|locken|haartrockner|föhn|\bhaar"),
        kern={"Aroma-Diffuser", "Wellness & Aromatherapie"},
        fremd={"Werkzeug & Heimwerken", "Partydeko & Ballone", "Nageldesign", "Damenmode", "Herrenmode", "Schmuck", "Uhren",
               "Haustierbedarf", "Make-up", "Taschen", "Spielzeug & Spiele", "Kostüme & Verkleidung", "Baby & Kinder", "Kinder"}),
    "buro-home-office": dict(
        tag="kat-buero",
        suche=["büro", "schreibtisch", "notizbuch", "notizblock", "mauspad", "homeoffice", "home office", "kugelschreiber",
               "laptop-sleeve", "laptopständer", "laptoptasche", "stifthalter", "schreibunterlage", "aktenordner", "textmarker"],
        echt=R(r"büro|schreibtisch|notizbuch|notizblock|mauspad|home-?office|kugelschreiber|füllfeder|gelstift|textmarker|"
               r"\blocher|tacker|hefter|aktenordner|ringordner|laptop-?(sleeve|ständer|stand|halter|tasche|hülle|tisch|unterlage|kühler|"
               r"kissen)|dokumentenmappe|stifthalter|stiftebox|stifteköcher|"
               r"schreibunterlage|haftnotiz|büroklammer|tischorganizer|monitor|tastatur|schreibset|visitenkarten"),
        ban=R(r"kleid|\brock\b|bluse|hose\b|hosen\b|shirt|blazer|pumps|schuh|lunchbox|becher|schale|snack|heizschal|\bschal\b|"
              r"strickdecke|heizdecke|\bdecke\b|reispapier|prägefolie|etikettenpapier|thermodrucker|kinder|baby|hunde|katzen|"
              r"laptop-?rucksack|monitor-?arm für tv|büro-?damen|ohrring|halskette|armband|\bring\b|uhr\b|topf\b|kocher|pfanne"),
        kern={"Büro & Home Office"},
        fremd=MODE_SCHMUCK | {"Küche & Bar", "Haustierbedarf", "Heimtextilien", "Auto-Zubehör", "Baby & Kinder", "Kinder",
                              "Kinderschuhe", "Wohnen & Deko", "Wellness & Aromatherapie"}),   # 05.10.: Schreibtisch-Luftbefeuchter sind kein Büromaterial
}


def gql(q, v=None):
    """Wie kaufwille_zeile.gql, gibt aber den Eimer nicht aus den Augen (throttleStatus → nachlauf) und wartet bei THROTTLED."""
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    grund = ""
    for a in range(40):
        try:
            r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                       data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=90))
            nachlauf(d)
            if d.get("data") is not None and not d.get("errors"):
                return d["data"]
            grund = str((d.get("errors") or [{}])[0].get("message", "keine Daten"))[:120]
            if "Throttled" in grund or "THROTTLED" in grund:
                time.sleep(15)
                continue
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:120]
        time.sleep(3 + 3 * min(a, 5))
    raise RuntimeError(grund)


def produkte(query=None, handle=None):
    cur, out = None, {}
    while True:
        if handle:
            d = gql('query($h:String!,$c:String){collectionByIdentifier(identifier:{handle:$h}){products(first:250,after:$c)'
                    '{pageInfo{hasNextPage endCursor} nodes{id title productType tags status}}}}', {"h": handle, "c": cur})
            d = d["collectionByIdentifier"]["products"]
        else:
            d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id title productType tags status}}}', {"q": query, "c": cur})["products"]
        for p in d["nodes"]:
            if p["status"] == "ACTIVE":
                out[p["id"]] = p
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def hauptteil(titel):
    return TRENNER.split(titel, maxsplit=1)[0]


def pod(p):
    """Editor/POD («Selbst gestalten», Printful) ist heilig — wird weder getaggt noch enttaggt."""
    return ("selbst gestalten" in p["title"].lower() or p["productType"] == "Selbst gestalten"
            or any(t in ("pod", "printful", "selbst-gestalten") or "printful" in t for t in p["tags"]))


def gehoert(c, p):
    t, typ = p["title"], p["productType"]
    if pod(p):
        return False
    kt = c.get("kern_tag")
    if typ in c["kern"] or (kt and kt[0] in p["tags"] and typ in kt[1]):   # der Typ ist die Wahrheit («Hundeleine Ring» bleibt bei den Haustieren) — ausser kern_ban (Pet-Plüsch bei Kindern)
        return not (c.get("kern_ban") and c["kern_ban"].search(t))
    if typ in c["fremd"] or (typ not in c.get("vertraut", ()) and c["ban"].search(t)):
        return False
    return bool(c["echt"].search(hauptteil(t) if c.get("haupt") else t))


def stichprobe(kand, ids, zeichen):
    ids = list(ids)
    random.shuffle(ids)
    for i in sorted(ids[:STICHPROBE], key=lambda i: kand[i]["productType"]):
        print(f"   {zeichen} {kand[i]['productType'][:18].ljust(19)} {kand[i]['title'][:78]}")


def warte_bulk():
    for _ in range(int(os.environ.get("WARTE_MIN", "90")) * 4):
        c = gql('{currentBulkOperation(type:MUTATION){id status objectCount url errorCode}}')["currentBulkOperation"]
        if not c or c["status"] not in ("CREATED", "RUNNING", "CANCELING"):
            return c
        time.sleep(15)
    raise RuntimeError("fremde/eigene Bulk-Mutation läuft seit > WARTE_MIN — nicht fertig")


def bulk(ids, op, tag, handle):
    """Eine Bulk-Mutation tagsAdd/tagsRemove für viele Produkte. Gibt (status, ok, Fehlerzähler)."""
    os.makedirs("/tmp/kategorie_rein_2", exist_ok=True)
    pfad = f"/tmp/kategorie_rein_2/{handle}_{op}.jsonl"
    with open(pfad, "w", encoding="utf-8") as fh:
        for i in ids:
            fh.write(json.dumps({"id": i, "tags": [tag]}) + "\n")
    st = gql('mutation{stagedUploadsCreate(input:[{resource:BULK_MUTATION_VARIABLES,filename:"kategorie_rein_2.jsonl",'
             'mimeType:"text/jsonl",httpMethod:POST}]){stagedTargets{url resourceUrl parameters{name value}} userErrors{message}}}')
    t = st["stagedUploadsCreate"]["stagedTargets"][0]
    form = []
    for q in t["parameters"]:
        form += ["-F", f"{q['name']}={q['value']}"]
    key = next(q["value"] for q in t["parameters"] if q["name"] == "key")
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "600", "-X", "POST", t["url"]]
                       + form + ["-F", f"file=@{pfad}"], capture_output=True, text=True)
    if r.stdout.strip() not in ("200", "201", "204"):
        raise RuntimeError(f"Upload HTTP {r.stdout}")
    warte_bulk()   # ein fremder Bulk-Lauf (gleiche App) blockiert — warten statt kollidieren
    m = gql('mutation($p:String!){bulkOperationRunMutation(mutation:"mutation call($id: ID!, $tags: [String!]!) { ' + op +
            '(id: $id, tags: $tags) { userErrors { field message } } }",stagedUploadPath:$p){bulkOperation{id status} userErrors{message}}}',
            {"p": key})
    if m["bulkOperationRunMutation"]["userErrors"]:
        raise RuntimeError(f"Bulk nicht gestartet: {m['bulkOperationRunMutation']['userErrors']}")
    time.sleep(10)
    c = warte_bulk()
    fehler, ok = collections.Counter(), 0
    if c and c.get("url"):
        out = subprocess.run(["curl", "-sL", "--max-time", "600", c["url"]], capture_output=True, text=True).stdout
        for z in out.splitlines():
            d = json.loads(z)
            ue = (((d.get("data") or {}).get(op) or {}).get("userErrors")) or d.get("errors")
            if ue:
                fehler[str(ue)[:120]] += 1
            else:
                ok += 1
    return (c or {}).get("status"), ok, fehler


def lauf(handle, c):
    jetzt = produkte(handle=handle)
    kand = dict(jetzt)
    for s in c["suche"]:
        kand.update(produkte(query=f"title:*{s}* status:active"))
    for q in c.get("suche_q", []):
        kand.update(produkte(query=q))
    kand.update(produkte(query=f"tag:{c['tag']} status:active"))
    rein = {i for i, p in kand.items() if gehoert(c, p)}
    raus = set(jetzt) - rein
    neu = rein - set(jetzt)
    print(f"== {handle}: jetzt {len(jetzt)} · gehört {len(rein)} · raus {len(raus)} · neu {len(neu)}")
    stichprobe(kand, raus, "−")
    stichprobe(kand, neu, "+")
    if len(rein) < 0.6 * len(jetzt):
        print(f"   ⛔ würde um {100 - 100 * len(rein) // max(1, len(jetzt))} % schrumpfen — nicht umgestellt, Regeln prüfen")
        return
    if len(rein) > 4800:
        print(f"   ⛔ {len(rein)} aktive > Filtergrenze (4'800 WARN / 5'000) — nicht umgestellt")
        return
    if not SCHARF:
        return
    ops = [("tagsAdd", i) for i in rein if c["tag"] not in kand[i]["tags"]] + \
          [("tagsRemove", i) for i, p in kand.items() if i not in rein and c["tag"] in p["tags"] and not pod(p)]
    # 05.10. (Prüfer «kategorie»): vorher schrieb jeder Tageslauf die VOLLE Mitgliederliste (11'000 Zeilen / 1,2 MB pro Tag),
    # auch bei «raus 0». Der Rückweg braucht nur die Abgänge → nur die, und nur wenn es welche gibt.
    if raus:
        with open(VORHER, "a", encoding="utf-8") as f:
            for i in raus:
                f.write(f"{handle}\t{i}\t{kand[i]['productType']}\t{kand[i]['title']}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
    print(f"   schreibe {len(ops)} Tag-Änderungen …", flush=True)
    t0 = time.time()
    if len(ops) > 50:
        for op in ("tagsAdd", "tagsRemove"):
            ids = [i for o, i in ops if o == op]
            if not ids:
                continue
            status, ok, fehler = bulk(ids, op, c["tag"], handle)
            print(f"   Bulk {op}: {status} · {ok} ok · Fehler {dict(fehler) or 0}", flush=True)
            with open(TAGS, "a", encoding="utf-8") as f:
                for i in ids:
                    f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{handle}\t{op}\t{c['tag']}\t{i}\tbulk:{status}\n")
            if status != "COMPLETED" or ok < 0.95 * len(ids):
                print("   ⛔ Bulk unvollständig — Regel NICHT umgestellt, nächster Lauf holt nach")
                return
        ops = []
    for k in range(0, len(ops), 10):
        teil = ops[k:k + 10]
        m = " ".join(f'm{j}:{op}(id:"{i}",tags:["{c["tag"]}"]){{userErrors{{message}}}}' for j, (op, i) in enumerate(teil))
        antwort = gql("mutation{" + m + "}")
        fehler = [e for v in (antwort or {}).values() for e in (v or {}).get("userErrors", [])]
        if fehler:
            print("   ⚠️", fehler[:2])
        with open(TAGS, "a", encoding="utf-8") as f:
            for op, i in teil:
                f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{handle}\t{op}\t{c['tag']}\t{i}\n")
    print(f"   Tags fertig in {int(time.time() - t0)} s", flush=True)
    col = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id ruleSet{appliedDisjunctively '
              'rules{column relation condition}}}}', {"h": handle})["collectionByIdentifier"]
    ziel = [{"column": "TAG", "relation": "EQUALS", "condition": c["tag"]}]
    if [(r["column"], r["condition"]) for r in col["ruleSet"]["rules"]] != [("TAG", c["tag"])]:
        alt = json.load(open(ALT)) if os.path.exists(ALT) else {}
        alt.setdefault(handle, col["ruleSet"])
        json.dump(alt, open(ALT, "w"), ensure_ascii=False, indent=1)
        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": col["id"], "ruleSet": {"appliedDisjunctively": False, "rules": ziel}}})
        print("   Regel → TAG", c["tag"], r["collectionUpdate"]["userErrors"] or "✅")
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{handle}\tjetzt {len(jetzt)}\tgehört {len(rein)}\t"
                f"raus {len(raus)}\tneu {len(neu)}\n")


def nachmessen(handles):
    """Regel + aktive Zahl live. Shopify füllt Smart-Kollektionen asynchron (Lehre 02.10.) → bis 10 min warten."""
    for h in handles:
        c = CFG[h]
        for _ in range(20):
            col = gql('query($h:String!){collectionByIdentifier(identifier:{handle:$h}){id ruleSet{rules{column condition}}}}',
                      {"h": h})["collectionByIdentifier"]
            regel = [(r["column"], r["condition"]) for r in col["ruleSet"]["rules"]]
            n = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
                    {"q": f"collection_id:{col['id'].split('/')[-1]} status:active"})["productsCount"]["count"]
            soll = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
                       {"q": f"tag:{c['tag']} status:active"})["productsCount"]["count"]
            if regel == [("TAG", c["tag"])] and n == soll:
                break
            time.sleep(30)
        print(f"{h}: Regel {regel} · aktiv {n} · mit Tag {soll} {'✅' if n == soll else '⏳ Shopify füllt noch'}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ziele = args or list(CFG)
    if "--nachmessen" in sys.argv:
        return nachmessen(ziele)
    for h in ziele:
        lauf(h, CFG[h])


if __name__ == "__main__":
    main()
