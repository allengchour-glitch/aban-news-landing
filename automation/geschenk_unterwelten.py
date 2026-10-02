#!/usr/bin/env python3
"""geschenk_unterwelten.py — «Geschenke für Sie / für Ihn / für Kinder» mit echter Geschenk-Vielfalt füllen (02.10.2026).

ANLASS (12-Tage-Plan Tag 3 «Weihnachten + Geschenke», Kontaktbogen der ersten 24 sichtbaren Produkte):
  für Sie   = Regel Tag damen UND geschenk → 22/24 Schmuck (nur Schmuck trug beide Tags)
  für Ihn   = Regel Tag herren UND geschenk → 22/24 Uhren
  für Kinder = Regel Tag kinder ODER spielzeug → 16/24 Babykleider (Grind-Importe tragen «kinder»), 2 Spielzeuge
Die Sortierung war nicht schuld (BEST_SELLING zeigte dasselbe) — die ZUORDNUNG war es.

WAS ES TUT
  1. liest den Katalog-Export (hype_export_bauen.py, ZIEL=/tmp/geschenk_export.jsonl, ≤ 24 h alt)
  2. wählt je Welt Ware nach Warenart (Titel-Muster je Kategorie), nur: ACTIVE, im Google-Kanal (= sauber geprüft),
     ≥ 2 Bilder, Preis CHF 19–150, keine Sperr-Tags/-Wörter (Kostüm, Medizin, Klinge, Tierschutz, Biozid, Duplikat …)
  3. Tag `geschenkwelt-sie|ihn|kinder` setzen (fehlende) und bei nicht mehr passender Ware entfernen
  4. Kollektion: eine Regel «Tag = geschenkwelt-…», Sortierung MANUAL, die ersten 48 Plätze reihum nach Warenart
     (Kaufwillen-Tags zuerst), damit oben Vielfalt steht
  python3 automation/geschenk_unterwelten.py            Trockenlauf: Zählung je Welt/Kategorie + Beispiele
  SCHARF=1 python3 automation/geschenk_unterwelten.py   schreiben (Altregeln → dropship/_geschenk_unterwelten_alt.json)
"""
import collections, datetime as dt, json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql

EXPORT = "/tmp/geschenk_export.jsonl"
SCHARF = os.environ.get("SCHARF") == "1"
ALT = os.path.join(REPO, "dropship", "_geschenk_unterwelten_alt.json")
MAX_JE_WELT = int(os.environ.get("MAX_JE_WELT", "400"))
VORRANG = ("kunden-liebling", "nachfrage-liebling", "hype-jetzt")
SPERR_TAGS = re.compile(r"^(tierschutz|biozid|medizin|duplikat|klinge|handklinge|abhoer|marke-faelschung|recht-pruefen|"
                        r"bild-fremdpreis|kostuem|erotik)", re.I)
SPERR_TITEL = re.compile(r"kostüm|kostuem|perücke|verkleidung|fasnacht|halloween|erotik|dessous|tabak|vape|shisha|messer|"
                         r"klinge|serum|creme|massage|therapie|schmerz|magnet|wellness|ersatz|adapter|kabel|halterung|"
                         r"\bteile?\b|zubehör für|spalter|\bbeil\b|\baxt\b|machete|schwert|dolch|skalpell", re.I)

WELTEN = {
    "sie": {"handle": "geschenke-fuer-sie", "nicht": re.compile(r"herren|männer|\bmen\b|jungen|kinder|baby", re.I),
            "arten": [
                ("schmuck", r"ohrring|halskette|kette mit|anhänger|armband(?!uhr)|armreif|\bring\b|schmuckset"),
                ("tasche", r"handtasche|umhängetasche|clutch|schultertasche|tote ?bag|abendtasche"),
                ("kuschel", r"kuscheldecke|heizdecke|wärmekissen|fleecedecke|wolldecke|sofadecke"),
                ("duft", r"duftkerze|kerze|diffuser|aroma|duftstäbchen|kerzenwärmer"),
                ("beauty", r"make-?up-?(pinsel|set)|schminkkoffer|kosmetiktasche|haarstyler|lockenstab|glätteisen|"
                           r"warmluftbürste|haarbürste|spiegel"),
                ("schal", r"\bschal\b|-schal\b|halstuch|seidentuch|foulard|wintermütze|strickmütze|lederhandschuhe|winterhandschuhe|strickhandschuhe"),
                ("home", r"pyjama|bademantel|hausschuh|finken|morgenmantel"),
                ("uhr", r"damenuhr|damen-uhr|uhr für damen"),
            ]},
    "ihn": {"handle": "geschenke-fuer-ihn", "nicht": re.compile(r"damen|frauen|mädchen|kinder|baby", re.I),
            "arten": [
                ("uhr", r"herrenuhr|herren-?armbanduhr|automatikuhr|chronograph|herren.{0,20}uhr"),
                ("leder", r"geldbörse|portemonnaie|brieftasche|kartenetui|herrengürtel|ledergürtel|gürtel für herren|\bkrawatte\b|manschettenknöpfe"),
                ("tech", r"powerbank|kopfhörer|ohrhörer|bluetooth-?lautsprecher|smartwatch|ladestation|"
                         r"gaming-?(maus|tastatur|headset)|drohne"),
                ("bar", r"whisky|flachmann|cocktail|bar-?set|weinset|bierkrug|grill"),
                ("taschen", r"rucksack|reisetasche|kulturbeutel|aktentasche|laptoptasche|umhängetasche"),
                ("pflege", r"bart|rasierer|trimmer"),
                ("outdoor", r"taschenlampe|stirnlampe|camping|thermosflasche|fernglas"),
            ]},
    "kinder": {"handle": "geschenke-fuer-kinder", "nicht": re.compile(r"strampler|\bbody\b|bodys|pyjama|pullover|hose|"
                                                                      r"kleid|shirt|jacke|socken|schuhe|mütze|set aus|zweiteiler", re.I),
               "arten": [
                   ("plüsch", r"plüschtier|plüsch-?(dino|bär|hase|figur|spielzeug|puppe)|kuscheltier|stofftier|teddy"),
                   ("bauen", r"bausteine|klemmbausteine|baukasten|bauspielzeug|magnet-?bau|3d-?puzzle"),
                   ("spiel", r"brettspiel|kartenspiel|puzzle|würfelspiel|lernspielzeug|montessori|holzspielzeug"),
                   ("rc", r"ferngesteuert|rc-?auto|rc-?fahrzeug|rennauto|spielzeugauto|modellauto|\bzug\b|eisenbahn"),
                   ("kreativ", r"bastelset|bastel-?set|bastelkoffer|malset|malbuch|knete|kinderkamera|diamond painting|stickerbuch"),
                   ("licht", r"sternenhimmel|sternenprojektor|nachtlicht"),
                   ("draussen", r"seifenblasen|kinderroller|wasserpistole|lenkdrachen|springseil|hüpfball"),
                   ("musik", r"xylophon|spielzeug-?(gitarre|klavier|trommel)|musikinstrument"),
                   ("spielzeug", r"spielzeug"),
               ]},
}


def export_laden():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 86400:
        subprocess.run(["python3", os.path.join(HIER, "hype_export_bauen.py")],
                       env={**os.environ, "ZIEL": EXPORT, "MAXALTER": "86400"}, check=True)
    for z in open(EXPORT, encoding="utf-8"):
        d = json.loads(z)
        if d.get("status") == "ACTIVE":
            yield d


# Fallen aus dem ersten Trockenlauf (02.10.): «Bade-ANZUG»/«ANZUG für Herren» = «zug», «Maxi-Kleid mit GÜRTEL» = Leder,
# «Hoodie mit PLAID-Muster» = Kuscheldecke, «UHRENARMBAND-Werkzeug» = Schmuck, Hunde-/Katzenspielzeug = Kinder,
# «Mini-Projektor für Home Office» = Kinder-Licht, «Winter-PLÜSCH-Kissen» = Plüschtier.
TIER = re.compile(r"hund|katze|katzen|haustier|nager|vögel|vogel|leine|aquarium|welpe", re.I)
KLEIDUNG = re.compile(r"kleid|hose|hemd|shirt|bluse|anzug|bikini|jacke|mantel|pullover|hoodie|\brock\b|jeans|leggings|"
                      r"\btop\b|weste|overall|jumpsuit|cardigan", re.I)
ART_NICHT = {
    "schmuck": r"uhrenarmband|werkzeug|smart|watch|uhr|herzfrequenz|sportarmband|silikon|trainer|grip|kautschuk",
    "tech": r"armband|hülle|case|kabel|ersatz|kopfband|oculus",
    "licht": r"office|büro|heimkino|home-?kino|beamer|hd |uhr|rucksack|schul|gemälde|nagel|nägel|charger|feuchttuch|luftbefeuchter|diffus|lade|speaker|lautsprecher|wecker|halskette|ring|hoodie|traumfänger|wohnräume|harz|holz|silikon|tischlampe|nachttischlampe|feuerwerk|bluetooth",
    "plüsch": r"kissen|auto|winter-plüsch|sitz|rucksack",
    "taschen": r"schul|teens|kinder|studentin|frauen|damen|helm|fuzzy|plüsch|weiblich",
    "tasche": r"taktisch|camouflage|tarn|outdoor",
    "leder": r"weiblich|damen|trench|mantel",
    "bar": r"backform|gasbrenner|brenner",
    "schal": r"box|einweg|sommer|\bski|velo|arbeits|koch|augen|beheizbar",
    "duft": r"öl|nachfüll|kerzenform|form\b|vorratsglas",
    "pflege": r"rasen|mäh|garten|echthaar|augenbrauen|bartender|nadel|roller|serum",
    "rc": r"kissen|wurst|reise",
    "spiel": r"eiswürfel|form\b|behälter|meilenstein",
    "spielzeug": r"quietsch|beiss|laser|futter|schnüffel|kau|pistole|sprüh|badeball|beagle|feder|zerr|seil",
    "kreativ": r"nagel|werkzeugset|stift set|stiftset|diffuser",
    "draussen": r"abnehmen|fitness|stahlseil",
    "beauty": r"wecker",
}


def art_von(welt, titel):
    if TIER.search(titel):
        return None
    for name, rx in welt["arten"]:
        if re.search(rx, titel, re.I):
            if name in ART_NICHT and re.search(ART_NICHT[name], titel, re.I):
                return None
            if welt is not WELTEN["kinder"] and name != "home" and KLEIDUNG.search(titel):
                return None
            return name
    return None


def auswahl():
    kand = {w: [] for w in WELTEN}
    for d in export_laden():
        t, tags = d["title"], d.get("tags") or []
        preis = float(d["priceRangeV2"]["minVariantPrice"]["amount"])
        if not d.get("g") or d["mediaCount"]["count"] < 2 or not (19 <= preis <= 150):
            continue
        if SPERR_TITEL.search(t) or any(SPERR_TAGS.search(x) for x in tags):
            continue
        for w, welt in WELTEN.items():
            if welt["nicht"].search(t):
                continue
            a = art_von(welt, t)
            if a:
                prio = 0 if any(x in VORRANG for x in tags) else 1
                kand[w].append({"id": d["id"], "titel": t, "art": a, "preis": preis, "prio": prio,
                                "bilder": d["mediaCount"]["count"], "tags": tags})
    for w in kand:
        # je Art ausgewogen kappen: reihum aus den Art-Listen ziehen (Vorrang, dann mehr Bilder)
        je = collections.defaultdict(list)
        for k in sorted(kand[w], key=lambda k: (k["prio"], -k["bilder"], k["preis"])):
            je[k["art"]].append(k)
        reihe, i = [], 0
        while len(reihe) < MAX_JE_WELT and any(je.values()):
            for a in list(je):
                if je[a]:
                    reihe.append(je[a].pop(0))
            i += 1
        kand[w] = reihe[:MAX_JE_WELT]
    return kand


def main():
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{'' if SCHARF else ' · TROCKEN'}", flush=True)
    kand = auswahl()
    alt = {}
    for w, reihe in kand.items():
        welt = WELTEN[w]
        zahl = collections.Counter(k["art"] for k in reihe)
        print(f"\n== {w}: {len(reihe)} Produkte · {dict(zahl)}")
        for k in reihe[:18]:
            print(f"   {k['art']:9} CHF {k['preis']:6.2f} {k['titel'][:70]}")
        if not SCHARF:
            continue
        tag = f"geschenkwelt-{w}"
        soll = {k["id"] for k in reihe}
        ist = set()
        c = None
        while True:
            d = gql('query($q:String!,$c:String){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id}}}',
                    {"q": f"tag:{tag}", "c": c})["products"]
            ist |= {n["id"] for n in d["nodes"]}
            if not d["pageInfo"]["hasNextPage"]:
                break
            c = d["pageInfo"]["endCursor"]
        for pid in soll - ist:
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [tag]})
        for pid in ist - soll:
            gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": [tag]})
        print(f"   Tags: +{len(soll - ist)} −{len(ist - soll)}", flush=True)
        col = gql('query($h:String!){c:collectionByHandle(handle:$h){id sortOrder ruleSet{appliedDisjunctively rules{column relation condition}}}}',
                  {"h": welt["handle"]})["c"]
        alt[w] = col
        r = gql('mutation($c:CollectionInput!){collectionUpdate(input:$c){collection{sortOrder ruleSet{rules{condition}}} userErrors{message}}}',
                {"c": {"id": col["id"], "sortOrder": "MANUAL",
                       "ruleSet": {"appliedDisjunctively": False,
                                   "rules": [{"column": "TAG", "relation": "EQUALS", "condition": tag}]}}})["collectionUpdate"]
        print("   Kollektion:", r["collection"], r["userErrors"], flush=True)
        # Smart-Kollektionen füllen sich asynchron — kurz warten, dann die ersten 48 reihum setzen
        for _ in range(20):
            n = gql('query($id:ID!){c:collection(id:$id){productsCount{count}}}', {"id": col["id"]})["c"]["productsCount"]["count"]
            if abs(n - len(soll)) <= len(soll) * 0.1:   # alter Bestand (z. B. 2'743) zählt nicht als «gefüllt»
                break
            time.sleep(15)
        moves = [{"id": k["id"], "newPosition": str(i)} for i, k in enumerate(reihe[:48])]
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{message}}}',
                {"id": col["id"], "m": moves})["collectionReorderProducts"]
        print(f"   Reihenfolge: {len(moves)} Plätze · {r['userErrors'] or 'ok'} · Produkte in Kollektion {n}", flush=True)
    if SCHARF:
        bisher = json.load(open(ALT)) if os.path.exists(ALT) else {}
        bisher.setdefault(str(dt.date.today()), alt)
        json.dump(bisher, open(ALT, "w"), ensure_ascii=False, indent=1)
    print("\nFERTIG" + ("" if SCHARF else " (trocken)"))


if __name__ == "__main__":
    main()
