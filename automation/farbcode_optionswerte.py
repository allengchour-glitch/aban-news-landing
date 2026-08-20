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
    r"a[34]|20\d{2}|usb\d?|type\d?|led\d*|rgb\d*)$", re.I)
# Lieferanten-Artikelcode: Buchstaben+Zahlen, optional mit Bindestrich, ohne Leerzeichen.
CODE = re.compile(r"^[a-z]{1,8}-?\d{2,6}[a-z]?$", re.I)
GROESSE = re.compile(r"^(xx?s|[sml]|xx?x?l|[2-9]xl|\d{2})$", re.I)


def farbe_von(rest):
    """Gibt den deutschen Farbnamen zurück – oder None, wenn der Rest keine bekannte Farbe ist."""
    r = " ".join(rest.split()).strip(" -·/")
    if not r:
        return None
    return FARBE.get(r.lower())


# Nur Buchstaben, Leerzeichen, Bindestrich – höchstens drei Wörter. Ein solcher Rest ist ein
# Farbwort (oder ein Farb-Marketingname wie «Moonlight»), keine Artikelnummer.
WORT = re.compile(r"^[a-zäöüéèàA-ZÄÖÜ]+(?:[ -][a-zäöüéèàA-ZÄÖÜ]+){0,2}$")


def rest_ok(rest):
    """Der Rest nach dem Code – darf er als Farbwert stehen bleiben?"""
    r = " ".join(rest.split()).strip(" -·/")
    if not r or not WORT.match(r) or GROESSE.match(r) or SCHUTZ.match(r):
        return None
    return r


def neuer_wert(wert):
    """«A039 Light Gray» → «Hellgrau», «A03 Moonlight» → «Moonlight». None = nicht anfassen."""
    teile = wert.split()
    if len(teile) < 2:
        return None
    for rest in (teile[1:] if CODE.match(teile[0]) and not SCHUTZ.match(teile[0])
                 and not GROESSE.match(teile[0]) else None,
                 teile[:-1] if CODE.match(teile[-1]) and not SCHUTZ.match(teile[-1])
                 and not GROESSE.match(teile[-1]) else None):
        if rest is None:
            continue
        text = " ".join(rest)
        # 1. Wahl: bekannte Farbe → deutscher Name. 2. Wahl: Code abschneiden, Rest belassen.
        return farbe_von(text) or rest_ok(text)
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
    return {}


def optionen(gid):
    d = gql("query($id:ID!){node(id:$id){... on Product{id title status "
            "options{id name optionValues{id name}}}}}", {"id": gid})
    return (d.get("node") or {})


def main():
    if QUELLE == "ids":
        ids = [i.strip() for i in os.environ["IDS"].split(",") if i.strip()]
        kandidaten = [(i if i.startswith("gid:") else "gid://shopify/Product/" + i, "") for i in ids]
    else:
        kandidaten = []
        for zeile in open(EXPORT):
            p = json.loads(zeile)
            if "options" not in p:
                continue
            for o in p.get("options") or []:
                if (o.get("name") or "").strip().lower() not in ("farbe", "color", "colour"):
                    continue
                if any(neuer_wert(v["name"]) for v in o.get("optionValues") or []):
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
        vorhanden = {v["name"].strip().lower() for v in opt["optionValues"]}
        upd, protokoll, kollision = [], [], []
        for v in opt["optionValues"]:
            neu = neuer_wert(v["name"])
            if not neu or neu == v["name"]:
                continue
            if neu.lower() in vorhanden:
                kollision.append(f"{v['name']} → {neu}")
                continue
            vorhanden.add(neu.lower())
            upd.append({"id": v["id"], "name": neu})
            protokoll.append(f"{v['name']} → {neu}")
        if kollision:
            print(f"  ⏭️  {p['title'][:44]}: Kollision, übersprungen: {'; '.join(kollision)}", flush=True)
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
