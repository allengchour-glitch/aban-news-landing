"""Entfernt Lieferantencodes aus den kundensichtbaren VARIANTEN-Optionswerten (Option «Farbe»).

DER BEFUND (2026-08-20): Die bisherigen Reiniger `farbcode_bereinigen.py` (Beschreibungstext)
und `titelcode_entfernen.py` (Titel) fassen die Optionswerte NIE an — dabei ist der Code dort
für die Kundin unausweichlich, weil sie ihn im Dropdown anklicken muss:
«A039 Black», «E7916 White», «L985 Dark Brown», «Ts3018 Pink».
Quelle ist der laufende CJ-Grind: `cj_category_fill.mjs` übernimmt den CJ-Wert 1:1, wenn seine
Farbtabelle ihn nicht kennt — und CJ stellt der Farbe den Artikelcode voran.

WAS DIESES SKRIPT TUT — und was bewusst NICHT:
 • Repariert NUR Werte der Form «<CODE> <Farbe>» bzw. «<Farbe> <CODE>», bei denen der Rest
   eine BEKANNTE Farbe ist (Tabelle aus farbwerte_uebersetzen.py). Ergebnis ist der deutsche
   Farbname: «A039 Light Gray» → «Hellgrau». Damit ist jede Änderung belegbar richtig.
 • Werte, die NUR aus einem Code bestehen («HQ24798», «XXL276 XL7500»), bleiben unangetastet.
   Dort steht nirgends, welche Farbe gemeint ist — raten hiesse, der Kundin eine falsche Farbe
   zu versprechen. Sie werden gemeldet und gehören dem Betreiber (Variantenbild ansehen).
 • Werte mit Grössenkürzel im Farbfeld («HQ24799-XXS») bleiben ebenfalls stehen: dort ist die
   STRUKTUR falsch, nicht die Sprache (dieselbe Grenze wie in farbwerte_uebersetzen.py).
 • Kollidiert der neue Name mit einem anderen Wert derselben Option, wird ÜBERSPRUNGEN —
   Shopify würde sonst zwei Varianten verschmelzen («Option value already exists»).

⚠️ Schutzliste: UV400, TR90, RF433, SR626SW, IP44/67/68, CR2032, AG/LR-Batterien, Modelljahre.
Ein Code wird nur am Wortanfang/Wortende geschnitten, nie innen (Falle vom 11.08.: «Retro-Glam»).

QUELLE=export (Standard, /tmp/optvals.jsonl aus einem Bulk-Export) oder QUELLE=ids mit IDS=...
DRY=1 meldet nur.
"""
import json, os, re, sys, time, urllib.request

TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
QUELLE = os.environ.get("QUELLE", "export")
EXPORT = os.environ.get("EXPORT", "/tmp/optvals.jsonl")
LEDGER = "dropship/_farbcode_optionswerte.txt"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from farbwerte_uebersetzen import FARBE  # eine Farbtabelle für den ganzen Shop

# Werte, die wie ein Artikelcode aussehen, aber eine Aussage sind.
SCHUTZ = re.compile(
    r"^(uv\d{3}|tr\d{2}|rf\d{3}|sr\d{3,4}[a-z]{0,2}|ip\d{2}|cr\d{4}|lr\d{2,4}|ag\d{1,2}|"
    r"a[34]|20\d{2}|usb\d?|type\d?|led\d*|rgb\d*|no\d+)$", re.I)

# Lieferanten-Artikelcode: beginnt mit GROSSbuchstabe, dann Buchstaben, dann mindestens zwei
# Ziffern, höchstens ein Buchstabe hinten dran. KEIN Bindestrich — «Beige-110v», «Bunny-100»,
# «Black-240D» sind Farbe+Grösse bzw. Farbe+Spannung, kein Artikelcode.
CODE = re.compile(r"^[A-Z][A-Za-z]{0,9}\d{2,7}[A-Za-z]?$")
# Masseinheit hinter der Zahl → keine Artikelnummer, sondern eine technische Angabe.
EINHEIT = re.compile(r"\d+(v|w|ml|cm|mm|kg|g|db|hz|mah|a|k)$", re.I)
GROESSE = re.compile(r"^(xx?s|[sml]|xx?x?l|[2-9]xl|\d{2,3}[a-z]?)$", re.I)

# Nur Buchstaben, Leerzeichen, Bindestrich – höchstens drei Wörter.
WORT = re.compile(r"^[a-zäöüéèàA-ZÄÖÜ]+(?:[ -][a-zäöüéèàA-ZÄÖÜ]+){0,2}$")

DEUTSCH = {v.lower() for v in FARBE.values()}


def ist_code(tok):
    if not CODE.match(tok) or EINHEIT.search(tok) or SCHUTZ.match(tok) or GROESSE.match(tok):
        return False
    # «Black240» wäre Farbe + Zahl, kein Code.
    buchstaben = re.match(r"^[A-Za-z]+", tok).group(0).lower()
    return buchstaben not in FARBE and buchstaben not in DEUTSCH


def norm(t):
    return " ".join(t.split()).strip(" -·/")


def farbe_von(rest):
    """Gibt den deutschen Farbnamen zurück – oder None, wenn der Rest keine bekannte Farbe ist."""
    r = norm(rest)
    return FARBE.get(r.lower()) if r else None


def ohne_code(wert):
    """Gibt den Wert ohne führenden/nachgestellten Artikelcode zurück (unverändert, wenn keiner)."""
    teile = wert.split()
    if len(teile) < 2:
        return wert
    if ist_code(teile[0]):
        return norm(" ".join(teile[1:]))
    if ist_code(teile[-1]):
        return norm(" ".join(teile[:-1]))
    return wert


def ist_farbe(wert):
    r = norm(ohne_code(wert)).lower()
    return r in FARBE or r in DEUTSCH


def neuer_wert(wert, farbliste=True):
    """«A039 Light Gray» → «Hellgrau», «A03 Moonlight» → «Moonlight». None = nicht anfassen."""
    rest = ohne_code(wert)
    if rest == wert or not rest:
        return None
    deutsch = farbe_von(rest)
    if deutsch:
        return deutsch
    # Rest ist kein Wort aus der Tabelle: nur dann stehen lassen, wenn die Option überhaupt
    # eine Farbliste ist (sonst ist «X11 MAX» → «MAX» eine Verschlechterung).
    if farbliste and WORT.match(rest) and not GROESSE.match(rest) and not SCHUTZ.match(rest):
        return rest
    return None


def gql(q, v=None):
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for versuch in range(5):
        try:
            r = urllib.request.Request(URL, data=body, headers={
                "X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=60).read())
            if d.get("data") is not None:
                return d["data"]
        except Exception:
            pass
        time.sleep(3 + versuch * 3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def optionen(gid):
    d = gql("query($id:ID!){node(id:$id){... on Product{id title status "
            "options{id name optionValues{id name}}}}}", {"id": gid})
    return (d.get("node") or {})



def live_produkte(seit):
    """Frisch aus dem Shop statt aus dem Schnappschuss – der CJ-Grind legt täglich nach,
    ein Export von gestern kennt genau die neuen Produkte nicht (Lehre vom 14.08.2026)."""
    q = ("query($c:String,$q:String!){products(first:100,after:$c,query:$q){"
         "pageInfo{hasNextPage endCursor} nodes{id title status "
         "options{id name optionValues{id name}}}}}")
    cursor = None
    while True:
        d = (gql(q, {"c": cursor, "q": f"status:active created_at:>{seit}"}) or {}).get("products")
        if not d:
            return
        for n in d["nodes"]:
            yield n
        if not d["pageInfo"]["hasNextPage"]:
            return
        cursor = d["pageInfo"]["endCursor"]
        time.sleep(0.5)


def quelle():
    """Liefert Produkt-Dicts (id/title/options) – aus dem Export oder live."""
    if QUELLE == "live":
        seit = os.environ.get("SEIT") or (
            __import__("datetime").date.today() - __import__("datetime").timedelta(days=3)).isoformat()
        print(f"Quelle: LIVE, angelegt nach {seit}", flush=True)
        yield from live_produkte(seit)
    else:
        for zeile in open(EXPORT):
            yield json.loads(zeile)

def main():
    if QUELLE == "ids":
        ids = [i.strip() for i in os.environ["IDS"].split(",") if i.strip()]
        kandidaten = [(i if i.startswith("gid:") else "gid://shopify/Product/" + i, "") for i in ids]
    else:
        kandidaten = []
        for p in quelle():
            if "options" not in p:
                continue
            for o in p.get("options") or []:
                if (o.get("name") or "").strip().lower() not in ("farbe", "color", "colour"):
                    continue
                werte = [v["name"] for v in o.get("optionValues") or []]
                fl = any(ist_farbe(w) for w in werte)
                if any(neuer_wert(w, fl) for w in werte):
                    kandidaten.append((p["id"], p.get("title", "")))
                break
    print(f"Kandidaten: {len(kandidaten)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}

    geaendert = uebersprungen = fehler = 0
    f = None if DRY else open(LEDGER, "a")
    for gid, titel in kandidaten:
        if gid in done:
            continue
        p = optionen(gid)
        if not p or p.get("status") != "ACTIVE":
            continue
        opt = next((o for o in p.get("options") or []
                    if (o.get("name") or "").strip().lower() in ("farbe", "color", "colour")), None)
        if not opt:
            continue
        werte = [v["name"] for v in opt["optionValues"]]
        fl = any(ist_farbe(w) for w in werte)
        # Zielnamen erst vollständig bilden – kollidiert auch nur EINER, bleibt die GANZE
        # Option unangetastet. Eine halb umbenannte Liste («Kid03 children» neben «children»)
        # ist schlimmer als die unveränderte, und Shopify würde Varianten verschmelzen.
        ziel, upd, protokoll = [], [], []
        for v in opt["optionValues"]:
            neu = neuer_wert(v["name"], fl)
            ziel.append((v, neu or v["name"]))
        namen = [z[1].strip().lower() for z in ziel]
        if len(set(namen)) != len(namen):
            doppelt = [f"{v['name']} → {n}" for v, n in ziel if namen.count(n.strip().lower()) > 1]
            print(f"  ⏭️  {p['title'][:44]}: Kollision, GANZE Option übersprungen: "
                  f"{'; '.join(doppelt[:6])}", flush=True)
            uebersprungen += 1
            continue
        for v, n in ziel:
            if n != v["name"]:
                upd.append({"id": v["id"], "name": n})
                protokoll.append(f"{v['name']} → {n}")
        if not upd:
            uebersprungen += 1
            continue
        print(f"  {p['title'][:44]} | {'; '.join(protokoll)}", flush=True)
        if DRY:
            continue
        d = gql("mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){"
                "productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$u)"
                "{userErrors{message}}}", {"p": gid, "o": {"id": opt["id"]}, "u": upd})
        e = ((d.get("productOptionUpdate") or {}).get("userErrors")) or []
        if e:
            fehler += 1
            print(f"  ⚠️  {e[0]['message'][:90]}", flush=True)
            continue
        geaendert += 1
        f.write(f"{gid}\t{len(upd)}\t{' | '.join(protokoll)}\t{p['title']}\n")
        f.flush()
        time.sleep(0.5)
    if f:
        f.close()
    print(f"FERTIG: {geaendert} Produkte bereinigt, {uebersprungen} ohne Änderung, {fehler} Fehler")


if __name__ == "__main__":
    main()
