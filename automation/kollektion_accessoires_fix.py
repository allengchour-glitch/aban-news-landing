#!/usr/bin/env python3
"""Drei Kollektionen, die ihr Menü-Versprechen nicht hielten, plus der fehlende Menüpunkt
«Geschenke für Ihn» (23.09.2026, Audit-Befunde 3, 13, 14).

GEMESSEN 23.09. ~18:00 UTC (productsCount limit:null, precision EXACT):
  accessoires       Menü Damen › «Accessoires: Schals, Mützen & Gürtel», Regel TAG=accessoires:
                    34 aktiv — Caps, Sonnenbrillen, Sticker, Handyhülle; 0 Schals, 0 Gürtel, 0 Socken.
                    Die Ware lag aktiv im Shop, trug aber den Tag nicht.
  parfum-duefte     Regel TYPE Parfum | TYPE «Parfum & Düfte» | TAG parfum: 31 aktiv, darunter
                    Boden-Reinigungstücher, abziehbarer Nagellack, Auto-Duft-Clip, Reed-Diffuser —
                    alle über den Tag `parfum`, den cat_tags.mjs für nacktes «duft» vergab.
  geschenke-fuer-ihn Regel TAG herren UND TAG geschenk: 14 aktiv. 705 aktive Herrenuhren ab CHF 19,
                    630 davon MIT Tag geschenk — aber 698 OHNE Tag herren. Der Engpass war `herren`.

WARUM TAGS UND NICHT DIE REGEL: Eine Titel-Regel «CONTAINS Schal» träfe Schale, Schalter,
Schalkragen; «CONTAINS Gürtel» träfe Taillengürtel an Kleidern und Bauchweg-Gürtel. Deshalb
entscheidet hier ein Titel-KOPF (Text vor « mit ») mit Wortgrenzen und Ausschlüssen, und
geschrieben wird nur der Tag. Die Regeln der drei Kollektionen bleiben unverändert.

Modi (MODUS=, Standard accessoires,parfum,ihn — der Menü-Eingriff nur ausdrücklich mit MODUS=menue):
  accessoires  + `accessoires` an Schals/Tücher, Mützen, Damen-Gürtel, Socken/Strümpfe, Handschuhe
               (keine Kostüme, Kinder, Herren, Sport-/Heiz-/Massagegürtel, Box-/Arbeitshandschuhe);
               − `accessoires` nur an Nicht-Mode ohne POD-Tag (Panda-Handyhalter). POD-Artikel
               («Selbst gestalten») bleiben unberührt (GEHIRN Regel 4).
  parfum       − `parfum` an Mitgliedern von parfum-duefte, die laut PARFUM_JA/-NEIN (cat_tags.mjs)
               kein Duft sind; + `parfum` an aktiven Düften, die fehlen. Entscheidung über Node,
               derselbe Code wie im Importer.
  ihn          + `geschenk` und `herren` an Herrenuhren, Herrenschmuck, Leder-Accessoires, Bart/
               Rasur (ohne Klingen), Herrendüfte ab CHF 19. `herren` wird NICHT gesetzt, wenn der
               Titel Shirt/Hemd/Hose enthält oder das Produkt den Tag schuhe trägt (sonst fiele es
               in herren-shirts/-hemden/-hosen/-schuhe).
  menue        «Geschenke für Ihn» → /collections/geschenke-fuer-ihn direkt hinter «Geschenke für
               Sie» im Menü «🎁 Geschenke & Mehr»; vorher JSON-Sicherung dropship/menu_backup_<datum>.json,
               menuUpdate mit ALLEN Einträgen (IDs erhalten), danach Einträge vorher/nachher zählen.
               Idempotent: steht der Punkt schon drin, passiert nichts.

Umgebung: DRY=1 (nur zeigen) · MAX=1500 (Deckel je Modus; mehr = Regel kaputt → Abbruch)
Täglich laufen lassen (Standard-Modi) fängt Neuimporte ein; Schreibvorgänge nur bei Bedarf.
Letzte Zeile «FERTIG …» = Lauf sauber (Konvention von fixer_keepalive.sh); bei Fehlern keine FERTIG-Zeile.
"""
import json, os, re, subprocess, sys, time, unicodedata, urllib.request
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf  # noqa: E402

SHOP = "au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY") == "1"
MAX = int(os.environ.get("MAX", "1500"))
MODI = [m.strip() for m in os.environ.get("MODUS", "accessoires,parfum,ihn").split(",") if m.strip()]
NODE = "/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
POD_TAGS = {"sg-accessoires", "selbst-gestalten", "pod", "printful", "sg-kleidung", "sg-taschen"}


def token():
    return open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None, versuche=8):
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for i in range(versuche):
        try:
            req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=body,
                                         headers={"X-Shopify-Access-Token": token(),
                                                  "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            print("  Netz:", str(e)[:120]); time.sleep(2 * (i + 1)); continue
        if d.get("errors"):
            if "hrottled" in json.dumps(d["errors"]):
                time.sleep(3 * (i + 1)); continue
            raise RuntimeError("GraphQL: " + json.dumps(d["errors"])[:400])
        if d.get("data") is None:
            time.sleep(2 * (i + 1)); continue
        nachlauf(d)
        return d["data"]
    raise RuntimeError("Shopify blieb stumm — nichts quittiert")


def zaehle(q):
    r = gql('query($q:String!){productsCount(query:$q,limit:null){count precision}}', {"q": q})["productsCount"]
    return r["count"], r["precision"]


def koll_aktiv(handle):
    c = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": handle})["collectionByHandle"]
    return zaehle(f"status:active AND collection_id:{c['id'].split('/')[-1]}") if c else None


FELDER = "id title status productType tags priceRangeV2{minVariantPrice{amount}}"


def alle(q):
    out, cur = [], None
    while True:
        d = gql('query($q:String!,$c:String){products(first:250,query:$q,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{' + FELDER + '}}}', {"q": q, "c": cur})["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")


def aktive_titel(versuch=0):
    """Alle aktiven Produkte (id/title/productType/tags/Preis). Die Shopify-Suche findet Komposita
    nicht (`title:*lampe*` = 47, Tag lampe = 168) — deshalb ganze Liste und eigener Vergleich.
    Quelle: /tmp/export.jsonl, wenn jünger als 30 h (Tags darin dürfen veraltet sein: `schreibe()`
    liest jedes Produkt vor dem Schreiben live nach); sonst eigener Bulk-Export.
    Kanarienvogel: Zeilenzahl ≈ productsCount(status:active)."""
    soll = zaehle("status:active")[0]
    if os.path.exists(EXPORT) and (time.time() - os.path.getmtime(EXPORT)) < 30 * 3600:
        out = []
        for zeile in open(EXPORT, encoding="utf-8"):
            try:
                p = json.loads(zeile)
            except ValueError:
                continue
            if p.get("status") == "ACTIVE":
                out.append(p)
        if abs(len(out) - soll) <= max(500, soll * 0.03):
            print(f"  Export {EXPORT}: {len(out)} aktive (productsCount {soll})")
            return out
        print(f"  Export {EXPORT} passt nicht ({len(out)} statt ~{soll}) — eigener Bulk-Export")
    q = ('{products(query:"status:active"){edges{node{id title status productType tags '
         'priceRangeV2{minVariantPrice{amount}}}}}}')
    r = gql('mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}', {"q": q})
    ue = r["bulkOperationRunQuery"]["userErrors"]
    if ue:  # läuft schon eine Bulk-Operation (anderer Wächter) → warten und neu versuchen
        if versuch >= 20:
            raise RuntimeError("Bulk-Export seit 10 Min belegt: " + ue[0]["message"][:100])
        print("  Bulk belegt:", ue[0]["message"][:100]); time.sleep(30); return aktive_titel(versuch + 1)
    meine = r["bulkOperationRunQuery"]["bulkOperation"]["id"]
    while True:
        time.sleep(5)
        s = gql('query($id:ID!){node(id:$id){... on BulkOperation{id status objectCount url errorCode}}}',
                {"id": meine})["node"]  # die EIGENE Operation, nicht currentBulkOperation (fremde Wächter)
        if s["status"] in ("COMPLETED", "FAILED", "CANCELED", "EXPIRED"):
            break
    if s["status"] != "COMPLETED" or not s["url"]:
        raise RuntimeError(f"Bulk-Export: {s['status']} {s.get('errorCode')}")
    out = []
    with urllib.request.urlopen(s["url"], timeout=300) as f:
        for zeile in f:
            try:
                out.append(json.loads(zeile))
            except ValueError:
                pass
    if abs(len(out) - soll) > max(50, soll * 0.02):
        raise RuntimeError(f"Bulk-Export unvollständig: {len(out)} statt ~{soll}")
    print(f"  Bulk-Export: {len(out)} aktive Produkte (productsCount {soll})")
    return out


def norm(s):
    return " " + unicodedata.normalize("NFD", (s or "").lower()).encode("ascii", "ignore").decode() + " "


def kopf(t):
    return re.split(r"\s(?:mit|with)\s", t)[0]


def preis(p):
    try:
        return float(p["priceRangeV2"]["minVariantPrice"]["amount"])
    except (TypeError, KeyError, ValueError):
        return 0.0


# ── accessoires ──────────────────────────────────────────────────────────────────────────────
ACC_KLASSEN = [
    ("schal", re.compile(r"schals?\b|halstuch|halstucher|\bpashmina|kopftuch|bandana|\bstola\b")),
    ("mutze", re.compile(r"mutzen?\b|beanie|\bstrickhut|\bwollhut|\bbarett\b")),
    ("gurtel", re.compile(r"gurtel\b")),
    ("socken", re.compile(r"socken\b|kniestrumpfe?\b|strumpfe\b|overknee-?strumpfe?")),
    ("handschuh", re.compile(r"handschuhe?\b|faustlinge?\b|fausthandschuh|pulswarmer|armstulpen")),
]
# Ausschluss am Titel-KOPF. Kompositum-Fallen: Schale/Schalter/Schalkragen fallen schon durch
# `schals?\b`; Taillengürtel am Kleid fällt durch den Kopf («Kleid mit Taillengürtel»).
ACC_NEIN = re.compile(
    r"kostum|verkleidung|fasnacht|halloween|karneval|cosplay|perucke|polizei|pilot|clown|einhorn|pirat|waggis|"
    r"zipfel|cabaret|\b20er\b|rastam|plusch|papier|\bkoch|\bgel\b|gel-|kuhlend|\bled\b|leucht|bluetooth|"
    r"kopfhorer|lautsprecher|massage|heiz|warme-|elektr|\bakku|\busb\b|\bdiy\b|hakelset|strickset|bastel|"
    r"zauber|kinder|\bbaby|\bkids|jungen|madchen|\bherren|\bmanner|\bmen\b|hund|katze|haustier|puppe|teddy|"
    r"kette\b|kettchen|halskette|armband|apple watch|brosche|\bclip\b|klammer|\bschnalle\b|etui|tasche|portemonnaie|"
    r"geldborse|brieftasche|uhr\b|uhren|uhrgurtel|werkzeug|fitness|schwitz|trimmer|abnehm|fettverbrenn|sauna|"
    r"stutz|haltung|ruck|bauch|schwanger|lenden|korsett|shapewear|expander|deadlift|power-|taktisch|utility|"
    r"laufgurtel|trainings|gewicht|klimmzug|kompression|thrombose|diabet|medizin|arbeitshandschuh|"
    r"gartenhandschuh|einweg|nitril|latex|vinyl|grill|ofen|\btopf|kuche|putz|reinigung|wasch|spul|peeling|"
    r"pflege|\bspa\b|feuchtigkeit|kosmetik|nagel|boxhandschuh|boxing|\bboxen\b|schwimm|reit|\bski\b|snowboard|"
    r"motorrad|\brad\b|velo|fahrrad|trockner|mucken|netz\b|strumpfhalter|strapse|(?<!hand)schuh|sneaker|boot|kissen|"
    r"decke|poncho|kleid|\brock\b|hose|bluse|hemd|shirt|jacke|mantel|cardigan|jumpsuit|overall|weste|blazer|"
    r"pullover|hoodie|oberteil|\btop\b|kimono|pyjama|nachthemd|bademantel|set:|3-in-1|winterset|\bset\b")
ACC_TYP_NEIN = re.compile(r"kostum|spielzeug|haustier|baby|kinder")
# Am GANZEN Titel (auch hinter « mit »): Körperformer und Wärme-/Therapiegürtel
ACC_NEIN_GANZ = re.compile(r"shapewear|figurform|abnehm(?!bar)|schwitz|fettverbrenn|rotlicht|warmegurtel|massage|heiz")
# Nicht-Mode, die den Tag trägt (nur ohne POD-Tag angefasst). ⚠️ `\bsticker\b`: nacktes «sticker»
# traf im DRY-Lauf «Baseball-Cap … Stickerei» (Kompositum-Falle, 23.09.)
ACC_WEG = re.compile(r"handyhalter|handy-?stander|aufkleber|\bsticker\b|bugeltransfer|iphone|handyhulle")


def acc_klasse(p):
    t = kopf(norm(p["title"]))
    tags = [x.lower() for x in p["tags"]]
    if ACC_NEIN.search(t) or ACC_TYP_NEIN.search(norm(p.get("productType"))) or any("kostu" in x for x in tags):
        return None
    if ACC_NEIN_GANZ.search(norm(p["title"])):
        return None
    for k, rx in ACC_KLASSEN:
        if rx.search(t):
            return k
    return None


# ── Geschenke für Ihn ────────────────────────────────────────────────────────────────────────
MANN = re.compile(r"\bherren|\bmanner|\bmann\b|\bmen\b|\bmens\b|\bmen s\b|gentleman|\bpapa\b|\bvater|fur ihn\b")
IHN_KLASSEN = [
    ("uhr", re.compile(r"uhr\b|uhren\b|chronograph|\bwatch\b|smartwatch")),
    ("schmuck", re.compile(r"armband\b|armreif|\bring\b|siegelring|halskette|\bkette\b|anhanger|manschettenknopf|"
                           r"krawattennadel|krawattenklammer")),
    ("leder", re.compile(r"geldborse|portemonnaie|brieftasche|kartenetui|kartenhalter|\bwallet\b|gurtel\b|"
                         r"aktentasche|kulturbeutel|kulturtasche|schlusselanhanger|flachmann|"
                         r"(?:leder|rindsleder|echtleder|crazy horse|vollnarben)\w*[\s-]+(?:\w+[\s-]+)?(?:umhangetasche|messenger)|"
                         r"(?:umhangetasche|messenger bag)\w*.*(?:leder|rindsleder|crazy horse)")),
    ("bart", re.compile(r"bartpflege|bartol|bartbalsam|bartkamm|bartburste|bartschneider|barttrimmer|bartset|"
                        r"folienrasierer|elektrorasierer|rasierapparat|rasierset|haarschneider|grooming")),
    ("parfum", re.compile(r"parfum|eau de (?:parfum|toilette|cologne)|\bcologne\b|herrenduft")),
    ("geschenkset", re.compile(r"geschenkset|geschenk-set|geschenkbox")),
]
IHN_NEIN = re.compile(
    r"kostum|verkleidung|fasnacht|halloween|perucke|\bkinder|\bbaby|jungen|\bdamen|frauen|\blady\b|women|madchen|"
    r"klinge|messer|rasierhobel|\baxt\b|\bbeil\b|schwert|dolch|machete|multitool|schere\b|pistole|waffe|erotik|"
    r"\bsex|penis|potenz|kondom|erektion|pheromon|seduce|magnet|abnehm|unterhose|boxershort|\bslip|uhrenarmband|"
    r"ersatzarmband|armband fur|uhrenbox|uhrenbeweger|uhrenwerkzeug|batterie|displayschutz|schutzfolie|schutzhulle|"
    r"ladekabel|ladegerat fur|hund|katze|haustier|halsband\b|\bleine\b|nasenhaar|ohrhaar|intim|bikini|korperhaar|"
    r"schamhaar|spliss|(?:1[6-9]|2[0-6])\s?mm\b")
IHN_TYP_NEIN = re.compile(r"kostum|spielzeug|haustier|baby|kinder")
HERREN_LECK = re.compile(r"shirt|hemd|hose", re.I)  # Titel-CONTAINS-Regeln von herren-shirts/-hemden/-hosen


def ihn_klasse(p):
    t = norm(p["title"])
    tags = [x.lower() for x in p["tags"]]
    if preis(p) < 19:
        return None
    mann = MANN.search(t) or {"herren", "herrenuhr", "herrenschmuck"} & set(tags) or \
        norm(p.get("productType")).strip() == "herrenmode"
    if not mann:
        return None
    if IHN_NEIN.search(t) or IHN_TYP_NEIN.search(norm(p.get("productType"))) or any("kostu" in x for x in tags):
        return None
    if any("klinge" in x for x in tags):
        return None
    k = kopf(t)
    for name, rx in IHN_KLASSEN:
        if rx.search(k):
            return name
    return None


# ── parfum (Node: dieselbe Entscheidung wie im Importer) ─────────────────────────────────────
DUFT_ML = re.compile(r"duft\w*.*\b\d+\s?ml\b|\b\d+\s?ml\b.*duft")


def ist_parfum_nein(titel):
    js = ("import {PARFUM_NEIN,normTitel} from './cat_tags.mjs';"
          "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{process.stdout.write(JSON.stringify("
          "JSON.parse(s).map(t=>PARFUM_NEIN.test(normTitel(t)))));});")
    r = subprocess.run([NODE, "--input-type=module", "-e", js], input=json.dumps(titel), cwd=HIER,
                       capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError("Node PARFUM_NEIN: " + r.stderr[:300])
    res = json.loads(r.stdout)
    if len(res) != len(titel):
        raise RuntimeError("Node PARFUM_NEIN: Länge stimmt nicht")
    return res


def ist_parfum(titel):
    js = ("import {PARFUM_JA,PARFUM_NEIN,normTitel} from './cat_tags.mjs';"
          "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{process.stdout.write(JSON.stringify("
          "JSON.parse(s).map(t=>{const n=normTitel(t);return PARFUM_JA.test(n)&&!PARFUM_NEIN.test(n);})));});")
    r = subprocess.run([NODE, "--input-type=module", "-e", js], input=json.dumps(titel), cwd=HIER,
                       capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError("Node PARFUM: " + r.stderr[:300])
    res = json.loads(r.stdout)
    if len(res) != len(titel):
        raise RuntimeError("Node PARFUM: Länge stimmt nicht")
    return res


# ── Schreiben + Rücklesen ────────────────────────────────────────────────────────────────────
def schreibe(plan, name):
    """plan = [(produkt, [add-tags], [remove-tags])]. Liest jedes Produkt live nach, schreibt nur die
    Differenz, liest zurück. Gibt (ok, falsch) zurück."""
    if len(plan) > MAX:
        raise RuntimeError(f"{name}: {len(plan)} Änderungen > MAX={MAX} — Regel prüfen")
    sich = f"/tmp/{name}_tags_sicherung_{datetime.now(timezone.utc):%Y%m%d_%H%M}.json"
    json.dump([{"id": p["id"], "title": p["title"], "tags": p["tags"], "add": a, "remove": r} for p, a, r in plan],
              open(sich, "w"), ensure_ascii=False)
    print(f"  Sicherung: {sich}")
    erledigt = []
    for p, add, rem in plan:
        live = gql('query($id:ID!){product(id:$id){id status tags}}', {"id": p["id"]})["product"]
        if not live:
            continue
        klein = {t.lower() for t in live["tags"]}  # Shopify-Tags sind für Regeln gross/klein-blind
        a = [t for t in add if t.lower() not in klein]
        r = [t for t in live["tags"] if t.lower() in {x.lower() for x in rem}]
        if a and live["status"] != "ACTIVE":
            a = []
        if a:
            x = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                    {"id": p["id"], "t": a})["tagsAdd"]
            if x["userErrors"]:
                print("  FEHLER tagsAdd", p["title"][:60], x["userErrors"]); continue
        if r:
            x = gql('mutation($id:ID!,$t:[String!]!){tagsRemove(id:$id,tags:$t){userErrors{message}}}',
                    {"id": p["id"], "t": r})["tagsRemove"]
            if x["userErrors"]:
                print("  FEHLER tagsRemove", p["title"][:60], x["userErrors"]); continue
        if a or r:
            erledigt.append((p["id"], a, r))
    ok = falsch = 0
    for i in range(0, len(erledigt), 50):
        teil = erledigt[i:i + 50]
        ns = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title tags}}}', {"ids": [e[0] for e in teil]})["nodes"]
        for n, (_, a, r) in zip(ns, teil):
            klein = {t.lower() for t in n["tags"]}
            if all(t.lower() in klein for t in a) and not any(t.lower() in klein for t in r):
                ok += 1
            else:
                falsch += 1; print("  ⚠️ Rücklesen falsch:", n["title"][:70])
    print(f"  {name}: {len(erledigt)} Produkte geändert · rückgelesen OK {ok}, falsch {falsch}")
    return ok, falsch


def zeige(plan, titel, n=400):
    print(f"  Plan {titel}: {len(plan)}")
    for p, a, r in plan[:n]:
        print(f"    {'+' + ','.join(a) if a else ''}{' −' + ','.join(r) if r else ''}  {p['title'][:85]}  (CHF {preis(p):.2f})")


# ── Modi ─────────────────────────────────────────────────────────────────────────────────────
def modus_accessoires(aktiv):
    vorher = koll_aktiv("accessoires")
    plan = []
    for p in aktiv:
        tags = [x.lower() for x in p["tags"]]
        if "accessoires" in tags:
            continue
        k = acc_klasse(p)
        if k:
            plan.append((p, ["accessoires"], []))
    for p in alle("tag:accessoires AND status:active"):
        tags = {x.lower() for x in p["tags"]}
        if tags & POD_TAGS:
            continue  # POD/«Selbst gestalten»: nicht anfassen (Regel 4)
        if ACC_WEG.search(kopf(norm(p["title"]))):
            plan.append((p, [], ["accessoires"]))
    zeige(plan, "accessoires")
    if DRY or not plan:
        return 0
    _, falsch = schreibe(plan, "accessoires")
    time.sleep(5)
    print(f"  accessoires aktiv: vorher {vorher} → nachher {koll_aktiv('accessoires')}")
    return falsch


def modus_parfum(aktiv):
    vorher = koll_aktiv("parfum-duefte")
    c = gql('{collectionByHandle(handle:"parfum-duefte"){id}}')["collectionByHandle"]
    mitglieder, cur = [], None
    while True:
        d = gql('query($id:ID!,$c:String){collection(id:$id){products(first:250,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{' + FELDER + '}}}}', {"id": c["id"], "c": cur})["collection"]["products"]
        mitglieder += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    typ_parfum = {"parfum", "parfum & düfte", "parfüm", "parfums damen"}
    plan = []
    # Entfernen nur, wo es SICHER kein Duft ist: «Aromatisch-holziger Lavendelduft (100ml)» ist laut
    # Beschreibung ein Herrenparfüm, trifft PARFUM_JA aber nicht → Duftwort + ml-Angabe behält den Tag.
    urteil = ist_parfum([p["title"] for p in mitglieder])
    nein = ist_parfum_nein([p["title"] for p in mitglieder])
    for p, ja, neg in zip(mitglieder, urteil, nein):
        duft_ml = bool(DUFT_ML.search(norm(p["title"])))
        if (ja or (duft_ml and not neg)):
            continue
        if "parfum" in [t.lower() for t in p["tags"]] and (p.get("productType") or "").lower() not in typ_parfum:
            plan.append((p, [], ["parfum"]))
    drin = {p["id"] for p in mitglieder}
    rest = [p for p in aktiv if p["id"] not in drin]
    urteil = ist_parfum([p["title"] for p in rest])
    for p, ja in zip(rest, urteil):
        if ja and "parfum" not in [t.lower() for t in p["tags"]]:
            plan.append((p, ["parfum"], []))
    zeige(plan, "parfum")
    if DRY or not plan:
        return 0
    _, falsch = schreibe(plan, "parfum")
    time.sleep(5)
    print(f"  parfum-duefte aktiv: vorher {vorher} → nachher {koll_aktiv('parfum-duefte')}")
    return falsch


def modus_ihn(aktiv):
    vorher = koll_aktiv("geschenke-fuer-ihn")
    plan, klassen = [], {}
    for p in aktiv:
        k = ihn_klasse(p)
        if not k:
            continue
        tags = [x.lower() for x in p["tags"]]
        add = []
        if "geschenk" not in tags:
            add.append("geschenk")
        if "herren" not in tags:
            if HERREN_LECK.search(p["title"]) or "schuhe" in tags:
                continue  # ohne herren-Tag käme es ohnehin nicht in die Kollektion
            add.append("herren")
        if add:
            plan.append((p, add, []))
            klassen[k] = klassen.get(k, 0) + 1
    print("  Klassen:", klassen)
    zeige(plan, "ihn", n=60)
    if DRY or not plan:
        return 0
    _, falsch = schreibe(plan, "ihn")
    time.sleep(5)
    print(f"  geschenke-fuer-ihn aktiv: vorher {vorher} → nachher {koll_aktiv('geschenke-fuer-ihn')}")
    return falsch


MENU_ITEM_FELDER = "id title type url resourceId tags"


def _menu_lesen():
    q = ('{menus(first:20){nodes{id handle title items{' + MENU_ITEM_FELDER + ' items{' + MENU_ITEM_FELDER +
         ' items{' + MENU_ITEM_FELDER + ' items{' + MENU_ITEM_FELDER + '}}}}}}}')
    return next(m for m in gql(q)["menus"]["nodes"] if m["handle"] == "main-menu")


def _zaehle_items(items):
    return sum(1 + _zaehle_items(i.get("items") or []) for i in items)


def _als_input(items):
    out = []
    for i in items:
        e = {"id": i["id"], "title": i["title"], "type": i["type"]}
        if i.get("url") is not None:
            e["url"] = i["url"]
        if i.get("resourceId"):
            e["resourceId"] = i["resourceId"]
        if i.get("tags"):
            e["tags"] = i["tags"]
        e["items"] = _als_input(i.get("items") or [])
        out.append(e)
    return out


def modus_menue():
    ziel = gql('{collectionByHandle(handle:"geschenke-fuer-ihn"){id handle resourcePublicationsCount{count}}}')["collectionByHandle"]
    if not ziel:
        print("  ⛔ Kollektion geschenke-fuer-ihn fehlt — kein Menüpunkt"); return 1
    aktiv = koll_aktiv("geschenke-fuer-ihn")
    if aktiv[0] < 40:
        print(f"  ⛔ geschenke-fuer-ihn hat nur {aktiv} aktive — erst füllen, dann verlinken"); return 1
    m = _menu_lesen()
    vorher = _zaehle_items(m["items"])
    geschenke = next((i for i in m["items"] if "geschenke" in i["title"].lower()), None)
    if not geschenke:
        print("  ⛔ Menüpunkt «Geschenke & Mehr» nicht gefunden"); return 1
    kinder = geschenke.get("items") or []
    if any((i.get("url") or "").rstrip("/").endswith("/collections/geschenke-fuer-ihn") for i in kinder):
        print(f"  Menü: «Geschenke für Ihn» steht schon drin ({vorher} Einträge) — nichts zu tun"); return 0
    pos = next((n + 1 for n, i in enumerate(kinder) if (i.get("url") or "").endswith("/collections/geschenke-fuer-sie")),
               len(kinder))
    neu = {"title": "Geschenke für Ihn", "type": "HTTP", "url": "/collections/geschenke-fuer-ihn", "items": []}
    print(f"  Menü vorher: {vorher} Einträge; neu an Position {pos + 1} unter «{geschenke['title']}»")
    if DRY:
        return 0
    sich = os.path.join(REPO, "dropship", f"menu_backup_{datetime.now(timezone.utc):%Y-%m-%d_%H%M}_vor_geschenke_ihn.json")
    json.dump(m, open(sich, "w"), ensure_ascii=False, indent=1)
    print("  Sicherung:", os.path.relpath(sich, REPO))
    items = _als_input(m["items"])
    for e in items:
        if e["id"] == geschenke["id"]:
            e["items"].insert(pos, neu)
    r = gql('mutation($id:ID!,$t:String!,$h:String,$items:[MenuItemUpdateInput!]!){menuUpdate(id:$id,title:$t,handle:$h,'
            'items:$items){menu{id} userErrors{field message}}}',
            {"id": m["id"], "t": m["title"], "h": m["handle"], "items": items})["menuUpdate"]
    if r["userErrors"]:
        print("  ⛔ menuUpdate:", r["userErrors"]); return 1
    n = _menu_lesen()
    nachher = _zaehle_items(n["items"])
    alt_ids = set()

    def ids(items, acc):
        for i in items:
            acc.add(i["id"]); ids(i.get("items") or [], acc)
        return acc
    alt_ids = ids(m["items"], set())
    neu_ids = ids(n["items"], set())
    verloren = alt_ids - neu_ids
    drin = any((i.get("url") or "").endswith("/collections/geschenke-fuer-ihn")
               for i in next(i for i in n["items"] if i["id"] == geschenke["id"]).get("items") or [])
    print(f"  Menü nachher: {nachher} Einträge (vorher {vorher}) · verlorene IDs: {len(verloren)} · «für Ihn» drin: {drin}")
    return 0 if (nachher == vorher + 1 and not verloren and drin) else 1


def main():
    kan = zaehle("status:active AND tag:accessoires-xqzv-kanarie")
    if kan[0] != 0:
        print("⛔ Kanarienvogel-Suche liefert", kan, "— Suchfilter unzuverlässig"); return 2
    t = subprocess.run([NODE, os.path.join(HIER, "cat_tags.mjs"), "--test"], capture_output=True, text=True)
    if t.returncode != 0:
        print("⛔ Kanarienvögel in cat_tags.mjs schlagen fehl:\n" + t.stdout[-600:]); return 2
    aktiv = None
    if any(m in MODI for m in ("accessoires", "parfum", "ihn")):
        aktiv = aktive_titel()
    fehler = 0
    for m in MODI:
        print(f"== {m} {'(DRY)' if DRY else ''}")
        if m == "accessoires":
            fehler += modus_accessoires(aktiv)
        elif m == "parfum":
            fehler += modus_parfum(aktiv)
        elif m == "ihn":
            fehler += modus_ihn(aktiv)
        elif m == "menue":
            fehler += modus_menue()
        else:
            print("  unbekannter Modus", m)
    if fehler:
        print(f"⚠️ {fehler} Fehler — kein FERTIG, nächster Lauf wiederholt")
        return 1
    print(f"FERTIG {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC · Modi {','.join(MODI)}{' (DRY)' if DRY else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
