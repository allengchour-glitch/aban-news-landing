#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""anlass_social_sperre.py — CJ-Anlassware im Anlass-Fenster aus den Social-Kanälen nehmen (13.10.2026).

ANLASS (dropship/KAUFSTRECKE-SEITEN-2026-10-13.md Klasse 3, Betreiber 13.10. «cj kostüme ja»): CJ-Direktversand aus
Asien kommt ab einer Bestellung am Do 15.10. nach dem 31.10. an (Kasse «28. Okt – 11. Nov»). Ein TikTok-/IG-/Pinterest-
Post für ein Halloween-Kostüm verkauft dann eine Enttäuschung. Der Onlineshop bleibt (kein 404 für URLs, die ChatGPT
kennt), Herbst-Deko bleibt, Ware ab Schweizer Lager bleibt überall.

AUSWAHL (Regeldatei automation/data/anlass_social_sperre.json, Bericht dropship/HALLOWEEN-SOCIAL-SPERRE-2026-10-13.md):
  aktiv · CJ (Tag cj-real ODER Varianten-SKU ^CJ) · OHNE ch-lager/profil-ch-lager · Halloween-Bezug
  (Titel, Tag halloween oder Beschreibung «für Halloween»/«Halloween-Party» — Ratgeber-Verweis abgeschnitten) · und
    Kostüm      = ist_kostuem() ODER Tag kostuem ODER Typ «Kostüme & Verkleidung» ODER Beschreibung «Verkleidung»
                  ODER Verkleidungsteil (Outfit/Umhang/Hexenhut … mit starkem Anlasswort)
    Partydeko   = Deko-Typ oder Deko-Wort UND (starkes Anlasswort ODER schwaches Wort + Tag halloween/Kürbis ODER
                  Halloween-Party in der Beschreibung); Schmuck (Anhänger/Kette/Ring …) ist nie Partydeko
  «Kürbis» allein ist Herbst (bleibt). Alles mit Halloween-Bezug, das keine Klasse trifft, steht als Grenzfall im Bericht.
  Beschreibungen werden nur für Ware mit Titel-/Tag-/Typ-Signal gelesen (Klasse.kandidat, ~250 je Lauf).

FENSTER [ab, bis) — im Fenster (nur --scharf):
  1. aus den Publikationen der Regel (TikTok, Facebook & Instagram, Pinterest — live per Name aufgelöst, NIE Online
     Store/Shop/Google) abmelden, je 20 in einer Anfrage; Ledger dropship/_anlass_social_sperre.tsv (Rückweg)
  2. Tag «social-pause-<anlass>» setzen (Poster-Wache, siehe automation/lib/social_pause.mjs)
  3. ready-Zeilen der Social-Queues dieser Ware → Status «social-pause-skip» (Datei vor dem Schreiben NEU gelesen,
     seit 14.10. unter der gemeinsamen Queue-Sperre automation/queue_csv.py)
  4. dropship/_social_pause.txt schreiben (Schlüssel pid:/h:/zeile: für die Poster, gilt nur bis «bis»)
  Ware, die im Fenster aus der Auswahl fällt (z. B. jetzt CH-Lager), wird sofort wieder angemeldet.
AB «bis»: genau die im Ledger abgemeldeten Paare wieder anmelden, Tag weg, Pause-Datei leer. Queue-Zeilen bleiben
  «social-pause-skip» (Halloween-Texte sind nach dem 01.11. Saison-vorbei).
Idempotent, täglich lauffähig, erfasst neue Importe (Voll-Export per Bulk-Operation).

  python3 automation/anlass_social_sperre.py               # Trockenlauf (Default): Liste, Grenzfälle, Queue-Treffer
  python3 automation/anlass_social_sperre.py --scharf      # gemäss Fenster schreiben (auch SCHARF=1, Aufseher-Schleife)
  python3 automation/anlass_social_sperre.py --selbsttest  # Kanarien (0 Fehler Pflicht, sonst schreibt nichts)
  python3 automation/anlass_social_sperre.py --ampel       # nur die Ampelzeile (liest Stand-Datei, kein Shop-Aufruf)
  python3 automation/anlass_social_sperre.py --faellig     # Exit 0 = Fenstergrenze seit letztem scharfem Lauf (Aufseher)
  JETZT=2026-10-15T06:00:00Z … simuliert einen Zeitpunkt (nur Trockenlauf)
"""
import csv
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from queue_csv import umbauen  # noqa: E402  gemeinsame Queue-Sperre (14.10.2026)
try:
    from eimer_etikette import nachlauf
except Exception:  # pragma: no cover
    def nachlauf(d):
        return 0.0

SHOP = "au3j0y-hq.myshopify.com"
REGEL_DATEI = os.path.join(HIER, "data", "anlass_social_sperre.json")
LEDGER = os.path.join(REPO, "dropship", "_anlass_social_sperre.tsv")
STAND = os.path.join(REPO, "dropship", "_anlass_social_sperre.json")
PAUSE = os.path.join(REPO, "dropship", "_social_pause.txt")
EXPORT = "/tmp/anlass_social_export.jsonl"
EXPORT_MAXALTER = int(os.environ.get("EXPORT_MAXALTER", str(6 * 3600)))
QUEUES = ["social/posts_image.csv", "automation/reels_seed.csv", "social/ig_karussell.csv", "social/story_queue.csv",
          "social/video_queue.csv", "social/tiktok_queue.csv"]
BUENDEL = 20
STORY_KUERZE = 74          # story_bauen.py: f"story-{handle}"[:80] bzw. handle[:74]


def regel():
    return json.load(open(REGEL_DATEI, encoding="utf-8"))["anlaesse"]


def zeit(s):
    return dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)


def jetzt():
    j = os.environ.get("JETZT")
    return zeit(j) if j else dt.datetime.now(dt.timezone.utc)


# ---------------------------------------------------------------- Klassifikation (rein, testbar)
class Klasse:
    def __init__(self, r):
        self.r = r
        f = re.I
        self.stark = re.compile(r["stark"], f)
        self.schwach = re.compile(r["schwach"], f)
        self.kuerbis = re.compile(r["kuerbis"], f)
        self.deko_wort = re.compile(r["deko_wort"], f)
        self.verkleidung = re.compile(r["verkleidung_wort"], f)
        self.deko_typen = set(r["deko_typen"])
        self.aus = {t.lower() for t in r["ausschluss_tags"]}
        # 13.10. abends (Prüfer): Lieferant auch über SKU, Kostüm auch über Tag/Typ/Beschreibung, Schmuck ≠ Deko
        self.lief_sku = re.compile(r.get("lieferant_sku") or r"^CJ", f)
        self.kostuem_tag = (r.get("kostuem_tag") or "kostuem").lower()
        self.kostuem_typen = set(r.get("kostuem_typen") or [])
        self.b_verkleidung = re.compile(r.get("beschr_verkleidung") or r"(?!x)x", f)
        self.b_bezug = re.compile(r.get("beschr_bezug") or r"(?!x)x", f)
        self.schmuck = re.compile(r.get("schmuck_wort") or r"(?!x)x", f)
        self.schmuck_tags = {t.lower() for t in r.get("schmuck_tags") or []}
        self.schmuck_deko = re.compile(r.get("schmuck_deko_wort") or r"(?!x)x", f)
        self.b_schnitt = re.compile(r.get("beschr_abschneiden") or r"(?!x)x", f)

    def ist_cj(self, tags, skus=()):
        return self.r["lieferant_tag"] in {t.lower() for t in tags} or any(self.lief_sku.search(s or "") for s in skus)

    def kandidat(self, titel, typ, tags):
        """Braucht dieses Produkt die Beschreibung? (nur Ware mit Titel-/Tag-/Typ-Signal — Export ohne Beschreibung)"""
        tl = {t.lower() for t in tags}
        t = titel or ""
        return bool(self.r["anlass_tag"] in tl or self.kostuem_tag in tl or (typ or "") in self.kostuem_typen
                    or self.stark.search(t) or self.schwach.search(t) or self.kuerbis.search(t))

    def urteil(self, titel, typ, tags, beschr="", skus=()):
        """→ (klasse, grund). klasse ∈ {"sperre", "grenzfall", None}. Lieferant/CH-Lager zuerst, dann Anlassbezug."""
        tl = {t.lower() for t in tags}
        t = titel or ""
        b = beschr or ""
        m = self.b_schnitt.search(b)
        if m:
            b = b[:m.start()]                   # Ratgeber-Verweis («📖 Passend dazu im Ratgeber: Halloween-Deko …») ≠ Produkt
        anlass_tag = self.r["anlass_tag"] in tl
        stark = bool(self.stark.search(t))
        schwach = bool(self.schwach.search(t))
        b_bezug = bool(self.b_bezug.search(b))
        bezug = anlass_tag or stark or schwach or b_bezug
        if not self.ist_cj(tags, skus):
            return (("grenzfall", "kein CJ (weder Tag noch SKU) — bleibt") if (anlass_tag or stark) else (None, ""))
        if tl & self.aus:
            return None, ""                     # ab Schweizer Lager: bleibt überall
        try:
            from google_sperrliste import ist_kostuem
        except Exception:  # pragma: no cover — ohne Kostümregel lieber gar nichts sperren
            raise RuntimeError("google_sperrliste.ist_kostuem nicht ladbar")
        kostuem = (ist_kostuem(t, typ or "") or self.kostuem_tag in tl or (typ or "") in self.kostuem_typen
                   or bool(self.b_verkleidung.search(b)))
        if kostuem:
            if bezug:
                return "sperre", "Kostüm"
            return "grenzfall", "CJ-Kostüm ohne Halloween-Bezug — bleibt (Fasnacht/Mottoparty)"
        schmuck = bool(self.schmuck.search(t) or (tl & self.schmuck_tags))
        deko = (typ or "") in self.deko_typen or bool(self.deko_wort.search(t))
        if schmuck and not self.schmuck_deko.search(t):
            deko = False                        # Anhänger/Kette/Ring … ist Schmuck, auch bei falschem Typ «Partydeko»
        # Kürbis + Halloween-Party in der Beschreibung ist Halloween, nicht Herbst
        deko_bezug = stark or (schwach and (anlass_tag or bool(self.kuerbis.search(t)))) or b_bezug
        if deko and deko_bezug:
            return "sperre", "Partydeko"
        if stark and self.verkleidung.search(t):
            return "sperre", "Verkleidungsteil"
        if anlass_tag or stark or b_bezug:
            if schmuck:
                return "grenzfall", "Schmuck mit Halloween-Bezug — bleibt (ganzjährig)"
            if deko:
                return "grenzfall", "Kürbis/Herbst-Bezug ohne Halloween-Wort — bleibt (Herbst-Deko)"
            return "grenzfall", "Halloween-Bezug, aber weder Kostüm noch Partydeko — bleibt"
        return None, ""


def kanarien(r, leise=False):
    k = Klasse(r)
    fehler = []
    for kn in r["kanarien"]:
        titel, typ, tags, soll = kn[:4]
        beschr = kn[4] if len(kn) > 4 else ""
        skus = kn[5] if len(kn) > 5 else ()
        ist = k.urteil(titel, typ, tags, beschr, skus)[0] == "sperre"
        if ist != soll:
            fehler.append((titel, tags, soll, ist))
        if not leise:
            print(f"  {'✓' if ist == soll else '✗'} {'SPERRE' if soll else 'bleibt'} · {titel} · {','.join(tags)}")
    return len(r["kanarien"]), fehler


LANG_H = "halloween-deko-realistische-kunststoffkette-mit-totenkopf-und-spinnennetz-fuer-garten-658880"


def selbsttest(leise=False):
    gut = True
    for r in regel():
        n, f = kanarien(r, leise)
        pos = sum(1 for k in r["kanarien"] if k[3])
        if pos < 15 or n - pos < 15:
            print(f"✗ {r['anlass']}: zu wenige Kanarien ({pos} Sperre / {n - pos} bleibt, je ≥ 15 Pflicht)")
            gut = False
        if f:
            gut = False
            for x in f:
                print(f"✗ {r['anlass']}: {x}")
        if not leise:
            print(f"KANARIEN {r['anlass']}: {n - len(f)}/{n} ({pos} Sperre, {n - pos} bleibt)")
    # Zeilen-Zuordnung der Queues
    probe = {"pid": {"15452605448577"}, "h": {"halloween-kostum-fur-hunde", LANG_H},
             "titel": {"halloween-kostüm für hunde"}}
    faelle = [({"id": "kimi-x-15452605448577", "caption": ""}, True),
              ({"id": "bildreel-halloween-kostum-fur-hunde", "caption": ""}, True),
              ({"id": "fresh-halloween-kostum-fur-hunde-123456", "caption": ""}, True),
              ({"id": "x", "caption": "Neu ➜ luxestyle.ch/products/halloween-kostum-fur-hunde?x=1"}, True),
              ({"slug": "s", "produkte": "a halloween-kostum-fur-hunde b", "caption": ""}, True),
              ({"id": "cjreel-1", "caption": "Halloween-Kostüm für Hunde\nCHF 19.90"}, True),
              ({"id": "kimi-y-15452605448578", "caption": "Kürbis-Kissen\nCHF 9"}, False),
              ({"id": "bildreel-halloween-kostum-fur-hunde-xl", "caption": ""}, False),
              ({"id": "story-halloween-kostum-fur-hunde", "caption": ""}, True),
              ({"id": "story-" + LANG_H[:74], "caption": ""}, True),
              ({"id": "story-halloween-kostum", "caption": ""}, False)]
    for zeile, soll in faelle:
        ist = bool(zeile_treffer(zeile, probe))
        if ist != soll:
            print(f"✗ Zeilen-Zuordnung {zeile} → {ist}, soll {soll}")
            gut = False
    # Aufseher-Takt: Phasenwechsel erzwingt den Lauf (simulierter Stand, simulierte Zeit)
    import tempfile
    r0 = regel()[0]
    ab, bis = zeit(r0["ab"]), zeit(r0["bis"])
    sek = dt.timedelta(seconds=1)
    # 19.10.2026: «stand» (Zeitpunkt des letzten scharfen Laufs) gehört jetzt zur Fälligkeit: ≥ 20 h alt = fällig, auch ohne Phasenwechsel.
    # Die acht Takt-Fälle laufen mit frischem Stand (1 h vor t); zwei weitere prüfen die 20-h-Regel (5 h → nicht fällig, 21 h → fällig).
    for st_phase, st_scharf, t, soll, alter_h in [("vor", True, ab - sek, False, 1), ("vor", True, ab, True, 1), ("vor", False, ab - sek, True, 1),
                                                  ("im", True, ab + sek, False, 1), ("im", True, bis - sek, False, 1), ("im", True, bis, True, 1),
                                                  ("nach", True, bis + sek, False, 1), (None, True, ab, True, 1),
                                                  ("im", True, ab + dt.timedelta(hours=6), False, 5), ("im", True, ab + dt.timedelta(hours=22), True, 21)]:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
            json.dump({"scharf": st_scharf, "stand": (t - dt.timedelta(hours=alter_h)).strftime("%Y-%m-%dT%H:%MZ"),
                       "anlaesse": {r0["anlass"]: {"phase": st_phase}} if st_phase else {}}, tf)
        ist = faellig(t, tf.name)
        os.unlink(tf.name)
        if ist != soll:
            print(f"✗ faellig(Stand {st_phase}/{st_scharf}, {t:%Y-%m-%dT%H:%M:%SZ}) → {ist}, soll {soll}")
            gut = False
    if not leise:
        print(f"SELBSTTEST {'OK' if gut else 'ROT'} (Zeilen-Zuordnung {len(faelle)} Fälle, Aufseher-Takt 10 Fälle)")
    return gut


# ---------------------------------------------------------------- Shopify
def gql(q, v=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for versuch in range(10):
        try:
            r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=body,
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=90))
        except Exception as e:  # noqa: BLE001
            if versuch == 9:
                raise RuntimeError(f"Shopify nicht erreichbar: {e}")
            time.sleep(5 + 5 * versuch)
            continue
        if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
            time.sleep(10 + 5 * versuch)
            continue
        if d.get("errors"):
            raise RuntimeError(json.dumps(d["errors"])[:300])
        nachlauf(d)
        return d["data"]
    raise RuntimeError("dauerhaft gedrosselt")


def publikationen(r):
    """{Name: gid} für die Kanäle der Regel. Fehlt einer oder steht ein nie-Kanal darin → Abbruch."""
    d = gql("{publications(first:50){nodes{id name}}}")["publications"]["nodes"]
    nach_name = {n["name"]: n["id"] for n in d}
    verboten = set(r["kanaele"]) & set(r["nie_kanaele"])
    if verboten:
        raise SystemExit(f"ABBRUCH: Regel nennt verbotene Kanäle {verboten}")
    fehlt = [k for k in r["kanaele"] if k not in nach_name]
    if fehlt:
        raise SystemExit(f"ABBRUCH: Publikation(en) {fehlt} nicht gefunden — vorhanden {sorted(nach_name)}")
    return {k: nach_name[k] for k in r["kanaele"]}


EXPORT_VERSION = 2      # 13.10. abends: + Varianten-SKU (CJ ohne Tag cj-real); alter Cache ohne SKU gilt nicht mehr


def export(pubs, r):
    """Voll-Export aktiver CJ-Ware (Tag ODER SKU ^CJ) per Bulk-Operation, mit Varianten-SKU. Gecacht EXPORT_MAXALTER."""
    vertrag = json.dumps({"_vertrag": sorted(pubs.values()), "v": EXPORT_VERSION})
    if os.path.exists(EXPORT) and time.time() - os.path.getmtime(EXPORT) < EXPORT_MAXALTER:
        kopf = open(EXPORT, encoding="utf-8").readline()
        if kopf.strip() == vertrag:
            return lesen_export()
    alias = " ".join(f'p{i}:publishedOnPublication(publicationId:"{g}")' for i, g in enumerate(pubs.values()))
    such = "status:active AND (tag:%s OR sku:%s*)" % (r["lieferant_tag"], (r.get("lieferant_sku") or "^CJ").lstrip("^"))
    q = ('{ products(query:"%s") { edges { node { id handle title productType status tags %s '
         'variants { edges { node { id sku } } } } } } }' % (such, alias))
    for versuch in range(12):
        rr = gql("mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id status} userErrors{field message}}}",
                 {"q": q})["bulkOperationRunQuery"]
        if not rr["userErrors"]:
            bid = rr["bulkOperation"]["id"]
            break
        print(f"  Bulk belegt ({rr['userErrors'][0]['message'][:80]}) — warte 60 s")
        time.sleep(60)
    else:
        raise RuntimeError("Bulk-Operation nicht startbar")
    for _ in range(360):
        time.sleep(5)
        b = gql("query($id:ID!){node(id:$id){... on BulkOperation{status url objectCount errorCode}}}", {"id": bid})["node"]
        if b["status"] in ("COMPLETED", "FAILED", "CANCELED", "EXPIRED"):
            break
    if b["status"] != "COMPLETED":
        raise RuntimeError(f"Bulk {b['status']} {b.get('errorCode')}")
    tmp = EXPORT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(vertrag + "\n")
        if b.get("url"):
            with urllib.request.urlopen(b["url"], timeout=300) as u:
                for z in u:
                    f.write(z.decode("utf-8"))
    os.replace(tmp, EXPORT)
    return lesen_export()


def lesen_export():
    aus, skus = [], {}
    with open(EXPORT, encoding="utf-8") as f:
        f.readline()
        for z in f:
            o = json.loads(z)
            if "__parentId" in o:
                skus.setdefault(o["__parentId"], []).append(o.get("sku") or "")
            elif "/Product/" in o.get("id", ""):
                o["social"] = [i for i in range(10) if o.get(f"p{i}")]
                aus.append(o)
    for o in aus:
        o["skus"] = skus.get(o["id"], [])
    return aus


def beschreibungen(ids):
    """{id: Beschreibung (Text)} — nur für Kandidaten mit Titel-/Tag-Signal, je 50 in einer Anfrage."""
    aus = {}
    ids = sorted(ids)
    for i in range(0, len(ids), 50):
        d = gql("query($ids:[ID!]!){nodes(ids:$ids){... on Product{id description}}}", {"ids": ids[i:i + 50]})
        for n in d["nodes"] or []:
            if n:
                aus[n["id"]] = n.get("description") or ""
    return aus


def tag_traeger(tag):
    aus, nach = {}, None
    while True:
        d = gql("""query($n:String,$q:String!){products(first:250,after:$n,query:$q){pageInfo{hasNextPage endCursor}
          nodes{id handle title tags status}}}""", {"n": nach, "q": f"tag:'{tag}'"})["products"]
        for n in d["nodes"]:
            if tag in n["tags"]:
                aus[n["id"]] = n
        if not d["pageInfo"]["hasNextPage"]:
            return aus
        nach = d["pageInfo"]["endCursor"]


def ledger_schreiben(*teile):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")] + [str(t) for t in teile]) + "\n")


def ledger_offen(anlass):
    """{(produkt, publikation): titel} — im Ledger abgemeldet («ab») und noch nicht wieder angemeldet («an»)."""
    offen = {}
    if not os.path.exists(LEDGER):
        return offen
    for z in open(LEDGER, encoding="utf-8"):
        t = z.rstrip("\n").split("\t")
        if len(t) < 5 or t[2] != anlass:
            continue
        k = (t[3], t[4])
        if t[1] in ("ab", "ab-geplant"):   # «ab-geplant» steht VOR der Abmeldung (13.10.: Rückweg-Lücke) — Wiederanmelden
            offen[k] = t[5] if len(t) > 5 else ""   # ist idempotent, ein nie abgemeldetes Paar kostet am 01.11. nichts
        elif t[1] == "an":
            offen.pop(k, None)
    return offen


def buendel(paare, mut, anlass, art, titel):
    """paare: [(produkt, publikation)] — je BUENDEL in einer Anfrage (Aliase). Ledger je Erfolg. → Liste der Erfolge."""
    n = []
    for i in range(0, len(paare), BUENDEL):
        teil = paare[i:i + BUENDEL]
        if art == "ab":   # 13.10.2026 (Prüfer): Absicht VOR der Anfrage festhalten — stirbt der Container zwischen Antwort und
            for p, g in teil:   # «ab»-Zeile, bliebe das Paar sonst nach dem 01.11. abgemeldet und fehlte im Rückweg
                ledger_schreiben("ab-geplant", anlass, p, g, titel.get(p, ""))
        q = "mutation{" + " ".join(f'a{j}:{mut}(id:"{p}",input:[{{publicationId:"{g}"}}]){{userErrors{{message}}}}'
                                   for j, (p, g) in enumerate(teil)) + "}"
        d = gql(q)
        for j, (p, g) in enumerate(teil):
            fe = (d.get(f"a{j}") or {}).get("userErrors", ["?"])
            if not fe:
                n.append((p, g))
                ledger_schreiben(art, anlass, p, g, titel.get(p, ""))
            else:
                print(f"  ⚠️ {mut} {p} {g}: {fe[:1]}")
    return n


def tags_buendel(ids, mut, tag):
    n = set()
    for i in range(0, len(ids), BUENDEL):
        teil = ids[i:i + BUENDEL]
        q = "mutation{" + " ".join(f'a{j}:{mut}(id:"{p}",tags:["{tag}"]){{userErrors{{message}}}}'
                                   for j, p in enumerate(teil)) + "}"
        d = gql(q)
        n |= {p for j, p in enumerate(teil) if not (d.get(f"a{j}") or {}).get("userErrors", ["?"])}
    return n


# ---------------------------------------------------------------- Queues
def norm_titel(s):
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def zeile_treffer(row, probe):
    """probe = {"pid": set, "h": set, "titel": set}. Gibt den Schlüssel zurück, über den die Zeile trifft, sonst ""."""
    zid = (row.get("id") or row.get("slug") or "").strip()
    cap = row.get("caption") or row.get("text") or ""
    m = re.search(r"(\d{12,15})\s*$", zid)
    if m and not zid.startswith("cjreel-") and m.group(1) in probe["pid"]:
        return "pid:" + m.group(1)
    for h in re.findall(r"/products/([a-z0-9][a-z0-9-]*)", cap):
        if h in probe["h"]:
            return "h:" + h
    kand = [re.sub(r"^bildreel-", "", zid), re.sub(r"^(?:ki|kimi|img|clip|post|auto|fresh\d*|meta-auto|story)-", "", zid)]
    kand += [re.sub(r"-\d{1,8}$", "", k) for k in kand]
    for h in kand + (row.get("produkte") or "").split():
        if h in probe["h"]:
            return "h:" + h
    # Story-IDs sind «story-<handle[:74]>» (story_bauen.py) → gekürzten Handle per Präfix vergleichen
    if zid.startswith("story-") and len(zid) - 6 >= STORY_KUERZE:
        rest = zid[6:]
        for h in sorted(probe["h"]):
            if h.startswith(rest):
                return "h:" + h
    erste = norm_titel(cap.replace("⏎", "\n").split("\n")[0])
    erste = re.sub(r"\s+·\s+chf.*$", "", erste)
    if erste and erste in probe["titel"]:
        return "titel:" + erste
    return ""


def queue_treffer(probe):
    """[(datei, zeilen_id, status, schluessel, medium)] — alle Zeilen, die eine gesperrte Ware bewerben."""
    aus = []
    for rel in QUEUES:
        p = os.path.join(REPO, rel)
        if not os.path.exists(p):
            continue
        with open(p, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                k = zeile_treffer(row, probe)
                if k:
                    aus.append((rel, row.get("id") or row.get("slug") or "", (row.get("status") or "").strip(), k,
                                row.get("image_url") or row.get("video_url") or row.get("media_url") or row.get("ordner") or ""))
    return aus


def queue_sperren(treffer, skip, basis=REPO):
    """Setzt ready-Zeilen auf skip. Datei direkt vor dem Schreiben NEU gelesen (Regel social_queue_saeubern 28.09.).
    14.10.2026: Lesen + Setzen + Schreiben unter der GEMEINSAMEN Queue-Sperre (queue_csv.umbauen, dieselbe Sperre wie
    Poster/Motoren in Node), atomar ohne feste «<csv>.tmp» — vorher konnte ein Poster, der zwischen Nachlesen und
    os.replace schrieb, seine Zeile verlieren (Lost Update), und zwei Prozesse mit derselben .tmp schrieben ineinander.
    Eine Queue, die leer/halb geschrieben ist oder deren Sperre 60 s belegt bleibt, wird mit Warnung übersprungen — der
    Lauf schreibt Pause-Datei und Stand trotzdem (die Poster lesen die Sperre auch aus _social_pause.txt, «zeile:…»)."""
    n = 0
    for rel in sorted({t[0] for t in treffer if t[2] == "ready"}):
        p = os.path.join(basis, rel)
        ziel = {(t[1], t[4]) for t in treffer if t[0] == rel and t[2] == "ready"}
        m = [0]

        def setzen(rows, ziel=ziel, m=m):
            kopf = rows[0]
            if "status" not in kopf:
                return None
            si = kopf.index("status")
            for z in rows[1:]:
                row = dict(zip(kopf, z))            # gleiche Lesart wie früher csv.DictReader (Spaltenname → Wert)
                k = (row.get("id") or row.get("slug") or "",
                     row.get("image_url") or row.get("video_url") or row.get("media_url") or row.get("ordner") or "")
                if k in ziel and (row.get("status") or "").strip() == "ready":
                    z[si] = skip
                    m[0] += 1
            return rows if m[0] else None
        try:
            umbauen(p, setzen)
        except RuntimeError as e:
            print(f"  ⚠️ Queue {rel}: {e}")
            continue
        n += m[0]
    return n


def pause_datei(r, gesperrt, treffer, aktiv):
    """dropship/_social_pause.txt: Kopf «# anlass ab bis», dann Schlüssel je Zeile (pid:/h:/titel:/zeile:)."""
    zeilen = [f"# {r['anlass']}\t{r['ab']}\t{r['bis']}\t{r['tag']}"]
    if aktiv:
        for p in sorted(gesperrt.values(), key=lambda x: x["id"]):
            zeilen += [f"pid:{p['id'].rsplit('/', 1)[1]}", f"h:{p['handle']}", f"titel:{norm_titel(p['title'])}"]
        zeilen += sorted({f"zeile:{t[1]}" for t in treffer if t[1]})
    alt = open(PAUSE, encoding="utf-8").read() if os.path.exists(PAUSE) else ""
    neu = "\n".join(zeilen) + "\n"
    if alt != neu:
        with open(PAUSE, "w", encoding="utf-8") as f:
            f.write(neu)


# ---------------------------------------------------------------- Lauf
def lauf(scharf):
    jetzt_ = jetzt()
    if scharf and os.environ.get("JETZT"):
        print("⚠️ JETZT=… gilt nur im Trockenlauf")
        return 1
    stand = {"stand": jetzt_.strftime("%Y-%m-%dT%H:%MZ"), "scharf": scharf, "anlaesse": {}}
    rc = 0
    for r in regel():
        ab, bis = zeit(r["ab"]), zeit(r["bis"])
        phase = phase_von(r, jetzt_)
        pubs = publikationen(r)
        gid_name = {g: n for n, g in pubs.items()}
        k = Klasse(r)
        st = {"phase": phase, "ab": r["ab"], "bis": r["bis"], "kanaele": pubs}
        print(f"== {r['anlass']}: Phase {phase} (Fenster {r['ab']} – {r['bis']}) · Kanäle {', '.join(pubs)}")

        if phase == "nach":
            offen = ledger_offen(r["anlass"])
            traeger = tag_traeger(r["tag"])
            print(f"  Freigabe: {len(offen)} Paare aus dem Ledger wieder anmelden, Tag an {len(traeger)} Produkten entfernen")
            if scharf:
                titel = {p: t for (p, _), t in offen.items()}
                st["angemeldet"] = len(buendel(sorted(offen), "publishablePublish", r["anlass"], "an", titel))
                weg = tags_buendel(sorted(traeger), "tagsRemove", r["tag"])
                st["tag_entfernt"] = len(weg)
                pause_datei(r, {}, [], False)
                offen = ledger_offen(r["anlass"])
                traeger = {x: v for x, v in traeger.items() if x not in weg}
            st.update({"gesperrt": 0, "offen": len(offen) + len(traeger)})
            if scharf and st["offen"]:
                rc = 1
            stand["anlaesse"][r["anlass"]] = st
            continue

        produkte = export(pubs, r)
        idx = {p["id"]: p for p in produkte}
        kand = [p["id"] for p in produkte if k.kandidat(p["title"], p.get("productType"), p["tags"])]
        beschr = beschreibungen(kand)
        print(f"  Export: {len(produkte)} aktive CJ (Tag oder SKU, davon ohne Tag "
              f"{sum(1 for p in produkte if r['lieferant_tag'] not in p['tags'])}) · Beschreibung gelesen für {len(beschr)}")
        sperre, grenz = {}, []
        for p in produkte:
            kl, grund = k.urteil(p["title"], p.get("productType"), p["tags"], beschr.get(p["id"], ""), p.get("skus", ()))
            if kl == "sperre":
                sperre[p["id"]] = dict(p, grund=grund)
            elif kl == "grenzfall":
                grenz.append((grund, p))
        social_ids = list(pubs.values())
        abmelden = [(pid, social_ids[i]) for pid, p in sorted(sperre.items()) for i in p["social"]]
        ohne_tag = sorted(pid for pid, p in sperre.items() if r["tag"] not in p["tags"])
        traeger = tag_traeger(r["tag"])
        raus = sorted(set(traeger) - set(sperre))        # trägt den Tag, gehört nicht (mehr) dazu
        offen_ledger = ledger_offen(r["anlass"])
        zurueck = sorted(k_ for k_ in offen_ledger if k_[0] in raus or (k_[0] in idx and k_[0] not in sperre))
        probe = {"pid": {pid.rsplit("/", 1)[1] for pid in sperre}, "h": {p["handle"] for p in sperre.values()},
                 "titel": {norm_titel(p["title"]) for p in sperre.values()}}
        treffer = queue_treffer(probe)
        ready = [t for t in treffer if t[2] == "ready"]

        nach_grund = {}
        for p in sperre.values():
            nach_grund[p["grund"]] = nach_grund.get(p["grund"], 0) + 1
        pro_kanal = {n: sum(1 for _, g in abmelden if g == gid) for n, gid in pubs.items()}
        print(f"  Auswahl: {len(sperre)} Produkte ({', '.join(f'{g} {n}' for g, n in sorted(nach_grund.items()))}) · "
              f"{len(grenz)} Grenzfälle · aus {len(produkte)} aktiven CJ")
        print(f"  Abmelden: {len(abmelden)} Paare ({', '.join(f'{n} {c}' for n, c in pro_kanal.items())}) · "
              f"Tag fehlt {len(ohne_tag)} · Tag zu viel {len(raus)} · Ledger zurück {len(zurueck)}")
        print(f"  Queues: {len(treffer)} Zeilen bewerben diese Ware, davon ready {len(ready)}")
        st.update({"auswahl": len(sperre), "nach_grund": nach_grund, "grenzfaelle": len(grenz),
                   "abmelden_paare": len(abmelden), "pro_kanal": pro_kanal, "tag_fehlt": len(ohne_tag),
                   "tag_zuviel": len(raus), "queue_zeilen": len(treffer), "queue_ready": len(ready),
                   "liste": [{"id": p["id"], "handle": p["handle"], "titel": p["title"], "typ": p.get("productType"),
                              "grund": p["grund"], "kanaele": [gid_name[social_ids[i]] for i in p["social"]]}
                             for p in sorted(sperre.values(), key=lambda x: x["title"])],
                   "grenzfall_liste": [{"handle": p["handle"], "titel": p["title"], "typ": p.get("productType"),
                                        "grund": g} for g, p in sorted(grenz, key=lambda x: (x[0], x[1]["title"]))],
                   "queue_liste": [{"datei": t[0], "zeile": t[1], "status": t[2], "schluessel": t[3]} for t in treffer]})

        if phase == "vor" or not scharf:
            st["gesperrt"] = sum(1 for p in sperre.values() if not p["social"] and r["tag"] in p["tags"])
            st["offen"] = len(sperre) - st["gesperrt"]
            if phase == "vor":
                if scharf:   # Pause-Datei schon vorher: die Poster lesen das Fenster selbst (lib/social_pause.mjs) —
                    pause_datei(r, sperre, treffer, True)   # so greift die Sperre um 00:00 UTC, nicht erst beim Tageslauf
                print(f"  Fenster beginnt {r['ab']} — im Shop heute nichts {'geschrieben' if scharf else 'zu schreiben'}"
                      + (" (Pause-Datei vorbereitet)" if scharf else ""))
        else:
            titel = {pid: p["title"] for pid, p in sperre.items()}
            titel.update({pid: t for (pid, _), t in offen_ledger.items()})
            st["zurueck_angemeldet"] = len(buendel(zurueck, "publishablePublish", r["anlass"], "an", titel)) if zurueck else 0
            st["tag_entfernt"] = len(tags_buendel(raus, "tagsRemove", r["tag"])) if raus else 0
            gesetzt = tags_buendel(ohne_tag, "tagsAdd", r["tag"]) if ohne_tag else set()
            ok = set(buendel(abmelden, "publishableUnpublish", r["anlass"], "ab", titel)) if abmelden else set()
            st["tag_gesetzt"], st["abgemeldet"] = len(gesetzt), len(ok)
            st["queue_gesperrt"] = queue_sperren(treffer, r["skip_status"])
            pause_datei(r, sperre, treffer, True)
            fehl = {p for p, g in abmelden if (p, g) not in ok} | (set(ohne_tag) - gesetzt)
            st["offen"], st["gesperrt"] = len(fehl), len(sperre) - len(fehl)
            print(f"  geschrieben: abgemeldet {st['abgemeldet']} · Tag {st['tag_gesetzt']} · Queue {st['queue_gesperrt']} · "
                  f"zurück {st['zurueck_angemeldet']} · Tag weg {st['tag_entfernt']}")
            if st["offen"]:
                rc = 1
        stand["anlaesse"][r["anlass"]] = st
    if not os.environ.get("JETZT"):                 # simulierte Zeitpunkte schreiben keinen Stand
        json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for z in ampel_zeilen(stand):
        print(z)
    return rc


def ampel_zeilen(stand):
    aus = []
    for a, st in (stand.get("anlaesse") or {}).items():
        if st["phase"] == "vor":
            aus.append(f"SOCIAL-SPERRE {a}: ab {st['ab'][:10]} · {st.get('auswahl', '?')} vorgemerkt "
                       f"({st.get('abmelden_paare', '?')} Kanal-Einträge, {st.get('queue_ready', '?')} Queue-Zeilen)")
        elif st["phase"] == "im":
            warn = "⚠️ " if st.get("offen") else ""
            aus.append(f"{warn}SOCIAL-SPERRE {a}: {st.get('gesperrt', '?')} gesperrt / {st.get('offen', '?')} offen "
                       f"(bis {st['bis'][:10]})")
        else:
            warn = "⚠️ " if st.get("offen") else ""
            aus.append(f"{warn}SOCIAL-SPERRE {a}: vorbei · {st.get('angemeldet', 0)} wieder angemeldet / "
                       f"{st.get('offen', '?')} offen")
    return aus or ["SOCIAL-SPERRE: unklar (kein Stand)"]


def phase_von(r, t):
    return "vor" if t < zeit(r["ab"]) else ("im" if t < zeit(r["bis"]) else "nach")


def faellig(jetzt_=None, stand_datei=STAND):
    """Für den Aufseher (fixer_keepalive.sh): True, wenn seit dem letzten SCHARFEN Lauf eine Fenstergrenze überschritten
    wurde (Stand-Phase ≠ Phase jetzt) oder es keinen scharfen Stand gibt. Dann startet der Aufseher trotz FERTIG < 20 h —
    so fällt der erste scharfe Lauf auf den ersten Tick nach 15.10. 00:00 UTC, nicht bis zu 20 h später. Repo-Datei statt
    /tmp/_start_*: die löscht dreht_sich_im_kreis() vor jedem Neustart."""
    t = jetzt_ or jetzt()
    try:
        st = json.load(open(stand_datei, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return True
    if not st.get("scharf"):
        return True
    # 19.10.2026: auch fällig, wenn der letzte scharfe Lauf ≥ 20 h her ist (Schranke-Timeout/Neustart ließ den Stand 100 h alt: «Tageslauf fehlt»)
    try:
        if (t - dt.datetime.strptime(st["stand"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc)).total_seconds() >= 20 * 3600:
            return True
    except Exception:  # noqa: BLE001
        return True
    for r in regel():
        alt = (st.get("anlaesse") or {}).get(r["anlass"], {}).get("phase")
        if alt != phase_von(r, t):
            return True
    # 19.10.2026 (Prüfung wf_659d6d94, AF-1): ein Lauf mit offenen Kanal-Einträgen (rc=1) schreibt trotzdem einen frischen `stand`;
    # der Aufseher wertet für registrierte Wächter nur noch das Ergebnis — ohne diese Zeile wartete das Nachholen bis zu 20 h.
    # ≥ 10 min Abstand, damit ein Dauerfehler (userErrors) nicht bei jedem Tick neu läuft.
    try:
        alter_min = (t - dt.datetime.strptime(st["stand"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc)).total_seconds() / 60
    except Exception:  # noqa: BLE001
        return True
    if alter_min >= 10 and any((a or {}).get("offen") for a in (st.get("anlaesse") or {}).values()):
        return True
    return False


def grenze_ohne_lauf(jetzt_=None, stand_datei=STAND):
    """Nur für die Ampel (23.10.2026): True, wenn eine Fenstergrenze überschritten wurde, die der letzte SCHARFE Lauf nicht kennt
    (kein scharfer Stand ODER Stand-Phase ≠ Phase jetzt). Anders als faellig() OHNE die 20-h-Tagesregel: GEMESSEN 23.10. 12:20 UTC —
    der Tageslauf war nach 21 h «fällig» und lief gerade, die Ampel meldete trotzdem «Fenstergrenze 15.10. überschritten, kein
    scharfer Lauf danach» (falsche Ursache, 56 gesperrt / 0 offen). Den fehlenden Tageslauf meldet die Ampel separat («Stand > 30 h»)."""
    t = jetzt_ or jetzt()
    try:
        st = json.load(open(stand_datei, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return True
    if not st.get("scharf"):  # grenze
        return True
    for r in regel():
        phase_jetzt = phase_von(r, t)
        alt = (st.get("anlaesse") or {}).get(r["anlass"], {}).get("phase")
        if alt != phase_jetzt:  # grenze
            return True
    return False


def selbsttest_grenze(leise=False):
    """Fälle + Mutanten für grenze_ohne_lauf() (Ampel-Zeile «Fenstergrenze überschritten»)."""
    import tempfile
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    r0 = regel()[0]
    mitte = zeit(r0["ab"]) + dt.timedelta(days=1)          # sicher im Fenster
    ordner = tempfile.mkdtemp(prefix="sperre-grenze-")

    def stand(name, scharf, phase, alter_h):
        pfad = os.path.join(ordner, name)
        st = {"stand": (mitte - dt.timedelta(hours=alter_h)).strftime("%Y-%m-%dT%H:%MZ"), "scharf": scharf,
              "anlaesse": {r["anlass"]: {"phase": phase} for r in regel()}}
        json.dump(st, open(pfad, "w", encoding="utf-8"))
        return pfad

    def faelle(m):
        f = []
        if m.grenze_ohne_lauf(mitte, stand("a.json", True, "im", 21)):
            f.append("A scharfer Stand mit richtiger Phase, 21 h alt → KEINE Grenz-Warnung (Tageslauf ist ein anderer Fall)")
        if not m.grenze_ohne_lauf(mitte, stand("b.json", True, "vor", 2)):
            f.append("B Stand kennt die Phase «im» nicht → Warnung")
        if not m.grenze_ohne_lauf(mitte, stand("c.json", False, "im", 2)):
            f.append("C Stand ohne scharfen Lauf → Warnung")
        if not m.grenze_ohne_lauf(mitte, os.path.join(ordner, "gibt-es-nicht.json")):
            f.append("D fehlende Stand-Datei → Warnung")
        return f

    mod = sys.modules[__name__]
    fehler = faelle(mod)
    erkannt = 0
    mutanten = [("Phase wird nicht verglichen", 'if alt != phase_jetzt:  # grenze', 'if False:  # grenze'),
                ("scharf wird nicht verlangt", 'if not st.get("scharf"):  # grenze', 'if False:  # grenze')]
    for name, alt, ers in mutanten:
        if quelle.count(alt) < 1:  # die Mutanten-Liste selbst enthält den Text auch → die ERSTE Stelle ist der echte Code
            fehler.append(f"Mutant «{name}»: Stelle fehlt")
            continue
        mm = types.ModuleType("mutant_grenze")
        mm.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, ers, 1), "mutant_grenze", "exec"), mm.__dict__)
        if faelle(mm):
            erkannt += 1
        else:
            fehler.append(f"Mutant «{name}» NICHT erkannt")
    if fehler:
        print("SELBSTTEST GRENZE FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return False
    if not leise:
        print(f"SELBSTTEST GRENZE OK: 4 Fälle, {erkannt}/{len(mutanten)} Mutanten erkannt")
    return True


def main():
    a = sys.argv[1:]
    if "--selbsttest" in a:
        return 0 if (selbsttest() and selbsttest_grenze()) else 1
    if "--faellig" in a:            # Exit 0 = Phasenwechsel seit dem letzten scharfen Lauf → Aufseher startet sofort
        f = faellig()
        print("FAELLIG (Fenstergrenze seit letztem scharfem Lauf)" if f else "nicht fällig (Phase unverändert)")
        return 0 if f else 1
    if "--ampel" in a:
        try:
            for z in ampel_zeilen(json.load(open(STAND, encoding="utf-8"))):
                print(z)
        except Exception as e:  # noqa: BLE001
            print(f"SOCIAL-SPERRE: unklar ({str(e)[:60]})")
        return 0
    if not selbsttest(leise=True):
        print("⚠️ SOCIAL-SPERRE: Selbsttest rot — nichts geschrieben")
        return 1
    return lauf(scharf="--scharf" in a or os.environ.get("SCHARF") == "1")


if __name__ == "__main__":
    sys.exit(main())
