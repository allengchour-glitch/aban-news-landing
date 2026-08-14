#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Grösse aus dem Farb-Dropdown herausziehen  ·  14.08.2026

BEFUND (dropship/FEHLERSUCHE-14-08.md, [variantenwerte]):
  Bei rund 276 aktiven Produkten hat die Kundin ein einziges Auswahlfeld «Farbe», in dem
  in Wahrheit Grösse UND Farbe zusammengeklebt stehen — «S-Schwarz», «Beige-L-Vest»,
  «Blue-90cm». Ein Grössenfeld gibt es gar nicht. Beim «Yoga Tanktop mit Kreuzträgern»
  (15447994794369) sind das 44 Einträge in EINEM Feld statt 4 Grössen × 11 Farben.

ZAHL AUS DEM PROBELAUF (Export 12.08., live gegengeprüft):
  T1  262 Produkte  «GRÖSSE-Farbe»          → 2 Optionen: Grösse + Farbe/Ausführung
  T2   35 Produkte  «Farbe-GRÖSSE-Variante» → 3 Optionen: Farbe + Grösse + Ausführung
  T2b  65 Produkte  «Farbe-90cm» / «Farbe-Dad S» → 2 Optionen: Farbe/Ausführung + Grösse
  T3   40 Produkte  nicht sauber zerlegbar  → Option nur ehrlich BENENNEN
  ---  56 Produkte  bewusst unangetastet (siehe FEHLTREFFER)

FEHLTREFFER AUS DEM PROBELAUF — genau deshalb sind die Muster so eng:
  · «M» ist bei Kabeln, Sonnensegeln und Vorhängen METER, keine Konfektionsgrösse:
    «1 M-Pink Metal 100W CC» (15471974875521), «Beige-2 X 3 M» (15472047849857),
    «Beige-1.2 M» (15473433510273), «Light Blue-3 M» (15478247588225),
    «Blue-1.5M-Only rope» (15459839279489). → METER-Muster schliesst sie aus.
  · «3L»/«4L» bei der E-Scooter-Falttasche (15449167757697) ist LITER, keine Grösse.
    → Ziffer-Grössen nur mit mindestens einem X («2XL»), nie «3L».
  · «A-59cm» beim Baby-Strampler (15450852098433): A–P sind Lieferanten-Entwurfsnummern,
    die Grösse steht HINTEN. Das Feld heisst deshalb «Ausführung», nicht «Farbe».
  · «MandM-Pink RechargeableANDRed» beim LED-Halsband (15450849837441) ist unzerlegbarer
    Lieferanten-Müll → nur umbenennen, nicht zerlegen.
  · Ein Wort, das mit «L-» oder «S-» beginnt, muss keine Grösse sein («L-förmig»,
    «S-shaped»). Über den ganzen Katalog geprüft: 0 solche Werte. Muster bleibt trotzdem
    auf echte Grössen-Token begrenzt.
  · Die Farbwerte bleiben WÖRTLICH stehen (auch englische wie «Ball Pen Blue»). Das
    Übersetzen ist ein eigener Befund; hier wird nur die STRUKTUR repariert.

ENTSCHEIDUNG:
  · Nichts wird gelöscht, kein Preis, kein SKU, kein Bestand angefasst — es werden nur
    Optionen angelegt und Varianten auf die neuen Optionswerte umgehängt.
  · Ist der zweite Wortteil keine erkennbare Farbe («1Style», «Short T», «Fleece lining»),
    heisst die Option «Ausführung» statt «Farbe» — eine falsche Beschriftung ist so teuer
    wie ein falscher Wert.
  · Bleibt nur EIN Wert für die Ausführung übrig («Standing collar» bei allen Varianten),
    wird daraus KEIN Dropdown mit einem Eintrag — der konstante Teil entfällt.
  · Wo die Werte das nicht hergeben (T3), wird die Option ehrlich benannt
    («Farbe & Grösse» bzw. «Grösse & Ausführung») statt fälschlich «Farbe».

QUELLE (Regel 7): Diese Produkte stammen aus automation/cj_category_fill.mjs. Dessen
  parseVar() spaltete den CJ-variantKey nur am LETZTEN Bindestrich und prüfte nur den
  hinteren Teil auf eine Grösse — «S-Weiss» fiel deshalb komplett als «Farbe» durch.
  Im selben Zug gepatcht: Grösse-VORNE, dreiteilige Schlüssel und cm-Grössen.
  Ohne diesen Patch entstünde der Fehler mit jedem Import neu.

Aufruf:  python3 automation/groesse_aus_farbe.py            (Probelauf, schreibt nichts)
         python3 automation/groesse_aus_farbe.py --scharf   (schreibt)
Ledger:  dropship/_groesse_aus_farbe.txt  (eine Zeile je Produkt, sofort geflusht)
"""
import json, os, re, sys, time, urllib.request

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN = open("/tmp/cj_shop_token.txt").read().strip()
EXPORT = "/tmp/export.jsonl"
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dropship", "_groesse_aus_farbe.txt")
SCHARF = "--scharf" in sys.argv

# ── Muster ────────────────────────────────────────────────────────────────────
# Konfektionsgrössen. Ziffer-Formen NUR mit X («2XL»), damit «3L» (= 3 Liter,
# E-Scooter-Falttasche) und «10 M» (= 10 Meter) nicht als Grösse gelten.
SZT   = r"(?:[0-9]X{1,5}[SL]|X{1,5}[SL]|S|M|L)"
SZ    = re.compile(r"^" + SZT + r"$", re.I)
VORN  = re.compile(r"^(" + SZT + r")\s*[-–]\s*(.+)$", re.I)
SEG   = re.compile(r"(?:^|[-–\s])(" + SZT + r")(?:[-–\s]|$)", re.I)
# «2 X 3 M», «1.5 M», «10 M» — Ziffer unmittelbar vor dem M heisst Meter, nicht Medium.
METER = re.compile(r"\d\s*[.,x×]?\s*\d*\s*M\b", re.I)
CM    = re.compile(r"^(\d{2,3})\s*(cm)$", re.I)
# Familien-/Rollengrössen: «Dad S», «Mother XL», «Boy 110», «Suit XXS»
ROLLE = re.compile(r"^(?:dad|daddy|father|mom|mommy|mother|kids?\d?|boy|boys|girl|girls|"
                   r"male|female|men|women|baby|suit)\b.+$", re.I)

FARBWORT = re.compile(
    r"(schwarz|weiss|weiß|grau|blau|rot|grün|gruen|gelb|braun|beige|rosa|rosé|rose|pink|lila|"
    r"violett|orange|silber|gold|türkis|tuerkis|khaki|creme|nude|bunt|marine|aprikose|camel|"
    r"bordeaux|elfenbein|champagner|mint|lavendel|weinrot|kaffee|oliv|sand|"
    r"black|white|grey|gray|blue|red|green|yellow|brown|purple|navy|ivory|apricot|coffee|"
    r"burgundy|silver|turquoise|lavender|cream|wine|olive|violet|khaki|colou?r)", re.I)

RANG = {"XXXS": 0, "XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "XL": 6,
        "XXL": 8, "XXXL": 9, "XXXXL": 10, "XXXXXL": 11}


def rang(s):
    u = s.upper()
    if u in RANG:
        return (RANG[u], u)
    m = re.match(r"^(\d)X([SL])$", u)
    if m:
        return ((6 + int(m.group(1))) if m.group(2) == "L" else (2 - int(m.group(1))), u)
    m = CM.match(s)
    if m:
        return (100 + int(m.group(1)), u)
    m = re.search(r"(\d+)", u)
    return (500 + int(m.group(1)), u) if m else (900, u)


def farbig(werte):
    """Sind die Werte überwiegend Farbangaben? Sonst heisst die Option «Ausführung»."""
    w = [x for x in set(werte) if x]
    if not w:
        return False
    return sum(1 for x in w if FARBWORT.search(x)) >= len(w) * 0.5


def norm_cm(s):
    m = CM.match(s.strip())
    return f"{int(m.group(1))} cm" if m else s.strip()


# ── Shopify ───────────────────────────────────────────────────────────────────
class Fehler(Exception):
    pass


def gql(query, variables, versuche=5):
    """Regel 6: eine gescheiterte Anfrage ist KEIN Ergebnis — sie wirft."""
    body = json.dumps({"query": query, "variables": variables}).encode()
    letzte = None
    for i in range(versuche):
        try:
            r = urllib.request.Request(SHOP, data=body, headers={
                "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json"})
            with urllib.request.urlopen(r, timeout=60) as f:
                d = json.loads(f.read())
            if d.get("errors"):
                msg = json.dumps(d["errors"])[:300]
                if "THROTTLED" in msg.upper():
                    time.sleep(3 + 2 * i); letzte = msg; continue
                raise Fehler(msg)
            return d["data"]
        except Fehler:
            raise
        except Exception as e:
            letzte = str(e); time.sleep(2 + 2 * i)
    raise Fehler(f"keine Antwort nach {versuche} Versuchen: {letzte}")


Q_PROD = """query($id:ID!){product(id:$id){id title status
 options{id name position optionValues{id name}}
 variants(first:250){nodes{id selectedOptions{name value}}}}}"""

M_OPTS = """mutation($p:ID!,$o:[OptionCreateInput!]!){productOptionsCreate(
 productId:$p,options:$o,variantStrategy:LEAVE_AS_IS){
 product{options{id name position}} userErrors{field message code}}}"""

M_VARS = """mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(
 productId:$p,variants:$v){productVariants{id title} userErrors{field message code}}}"""

M_RENAME = """mutation($p:ID!,$o:OptionUpdateInput!){productOptionUpdate(
 productId:$p,option:$o){product{options{id name}} userErrors{field message code}}}"""


# ── Zerlegung ─────────────────────────────────────────────────────────────────
def zerlege(werte):
    """werte -> (plan, mapping) oder (None, grund).
    plan = Liste von (Optionsname, geordnete Werte); mapping = wert -> [Werte je Option]."""
    if len(werte) < 2:
        return None, "nur ein Wert"
    if any(METER.search(w) for w in werte):
        return None, "Meter-Angabe (M = Meter, nicht Medium)"

    # T1: GRÖSSE-Rest
    m = [VORN.match(w) for w in werte]
    if all(m):
        paare = [(x.group(1).upper(), x.group(2).strip()) for x in m]
        if all(r for _, r in paare) and len(set(paare)) == len(werte):
            rest = [r for _, r in paare]
            # Die BESTEHENDE Option trägt den Farb-/Ausführungsteil — sie muss an Position 1
            # bleiben, sonst kollidiert die neu anzulegende Option mit ihrem eigenen Namen.
            erst = "Farbe" if farbig(rest) else "Ausführung"
            plan = [(erst, sorted({r for r in rest})),
                    ("Grösse", sorted({s for s, _ in paare}, key=rang))]
            return plan, {w: [r, s] for w, (s, r) in zip(werte, paare)}

    teile = [[t.strip() for t in w.split("-")] for w in werte]

    # T2: Farbe-GRÖSSE-Ausführung
    if all(len(t) == 3 and SZ.match(t[1]) and t[0] and t[2] for t in teile):
        tri = [(t[0], t[1].upper(), t[2]) for t in teile]
        if len(set(tri)) == len(werte):
            erst = "Farbe" if farbig([a for a, _, _ in tri]) else "Ausführung"
            plan = [(erst, sorted({a for a, _, _ in tri})),
                    ("Grösse", sorted({b for _, b, _ in tri}, key=rang))]
            drittel = sorted({c for _, _, c in tri})
            if len(drittel) > 1:                       # ein Dropdown mit einem Eintrag ist Lärm
                plan.append(("Ausführung", drittel))
                mp = {w: [a, b, c] for w, (a, b, c) in zip(werte, tri)}
            else:
                mp = {w: [a, b] for w, (a, b, _) in zip(werte, tri)}
            return plan, mp

    # T2b: Farbe-90cm  /  Farbe-Dad S     (Grösse steht HINTEN, Rest enthält keinen Bindestrich)
    p2 = [w.rsplit("-", 1) for w in werte]
    if all(len(p) == 2 and p[0].strip() and "-" not in p[0]
           and (CM.match(p[1].strip()) or ROLLE.match(p[1].strip())) for p in p2):
        paare = [(a.strip(), norm_cm(b)) for a, b in p2]
        if len(set(paare)) == len(werte):
            erst = "Farbe" if farbig([a for a, _ in paare]) else "Ausführung"
            plan = [(erst, sorted({a for a, _ in paare})),
                    ("Grösse", sorted({b for _, b in paare}, key=rang))]
            return plan, {w: [a, b] for w, (a, b) in zip(werte, paare)}

    return None, "nicht eindeutig zerlegbar"


def ehrlicher_name(werte):
    """T3: Die Option heisst «Farbe», enthält aber auch Grössen. Ehrlich benennen."""
    treffer = [SEG.search(w) for w in werte]
    if sum(1 for t in treffer if t) < len(werte) * 0.7:
        return None
    reste, vorne = [], 0
    for w, t in zip(werte, treffer):
        if not t:
            continue
        a, b = t.span(1)
        reste.append((w[:a] + " " + w[b:]).strip(" -–"))
        if a <= len(w) / 2:
            vorne += 1
    ander = "Farbe" if farbig(reste) else "Ausführung"
    return f"Grösse & {ander}" if vorne > len(reste) / 2 else f"{ander} & Grösse"


# ── Kandidaten aus dem Export ─────────────────────────────────────────────────
def kandidaten():
    out = []
    for line in open(EXPORT):
        d = json.loads(line)
        if d.get("status") != "ACTIVE":
            continue
        opts = d.get("options") or []
        if len(opts) != 1:
            continue
        o = opts[0]
        if o["name"].strip().lower() not in ("farbe", "color", "colour"):
            continue
        if len(o["values"]) < 2:
            continue
        if not any(SEG.search(v) or CM.match(v.rsplit("-", 1)[-1].strip()) for v in o["values"]):
            continue
        out.append((d["id"], d["title"]))
    return out


def main():
    fertig = set()
    if os.path.exists(LEDGER):
        for z in open(LEDGER):
            fertig.add(z.split("\t")[0])
    led = open(LEDGER, "a", buffering=1) if SCHARF else None

    zaehl = {"split": 0, "rename": 0, "aus": 0, "fehler": 0}
    for pid, titel in kandidaten():
        if pid in fertig:
            continue
        try:
            p = gql(Q_PROD, {"id": pid})["product"]
        except Fehler as e:
            print(f"FEHLER  {pid} {titel[:40]} :: {e}"); zaehl["fehler"] += 1; continue
        if not p or p["status"] != "ACTIVE" or len(p["options"]) != 1:
            zaehl["aus"] += 1; continue                     # live schon repariert / geändert
        opt = p["options"][0]
        if opt["name"].strip().lower() not in ("farbe", "color", "colour"):
            zaehl["aus"] += 1; continue
        werte = [v["name"] for v in opt["optionValues"]]
        vars_ = p["variants"]["nodes"]
        if len(vars_) != len(werte):
            zaehl["aus"] += 1; continue                     # Varianten passen nicht zu den Werten

        plan, mp = zerlege(werte)
        if plan:
            neu = [n for n, _ in plan if n != opt["name"]]
            print(f"SPLIT   {pid.split('/')[-1]} {titel[:44]:44} "
                  f"{len(werte):3d} Werte -> " + " | ".join(f"{n}({len(v)})" for n, v in plan))
            if not SCHARF:
                zaehl["split"] += 1; continue
            try:
                # 1. fehlende Optionen anlegen (die bestehende «Farbe» wird umbenannt/weiterbenutzt)
                anlegen = [{"name": n, "position": i + 2, "values": [{"name": w} for w in v]}
                           for i, (n, v) in enumerate(plan[1:])]
                r = gql(M_OPTS, {"p": pid, "o": anlegen})["productOptionsCreate"]
                if r["userErrors"]:
                    raise Fehler(json.dumps(r["userErrors"])[:250])
                # 2. bestehende Option auf den ersten Planposten umbenennen
                if plan[0][0] != opt["name"]:
                    r = gql(M_RENAME, {"p": pid, "o": {"id": opt["id"], "name": plan[0][0]}})["productOptionUpdate"]
                    if r["userErrors"]:
                        raise Fehler(json.dumps(r["userErrors"])[:250])
                ids = {o["name"]: o["id"] for o in gql(Q_PROD, {"id": pid})["product"]["options"]}
                # 3. Varianten umhängen
                upd = []
                for v in vars_:
                    alt = v["selectedOptions"][0]["value"]
                    if alt not in mp:
                        raise Fehler(f"Variante ohne Planwert: {alt}")
                    upd.append({"id": v["id"], "optionValues": [
                        {"optionId": ids[n], "name": w} for (n, _), w in zip(plan, mp[alt])]})
                for i in range(0, len(upd), 100):
                    r = gql(M_VARS, {"p": pid, "v": upd[i:i + 100]})["productVariantsBulkUpdate"]
                    if r["userErrors"]:
                        raise Fehler(json.dumps(r["userErrors"])[:250])
                led.write(f"{pid}\tsplit\t{'+'.join(n for n,_ in plan)}\t{titel}\n")
                zaehl["split"] += 1
            except Fehler as e:
                print(f"  !! {e}"); zaehl["fehler"] += 1
            continue

        name = ehrlicher_name(werte)
        if not name:
            zaehl["aus"] += 1; continue
        print(f"NAME    {pid.split('/')[-1]} {titel[:44]:44} «Farbe» -> «{name}»")
        if not SCHARF:
            zaehl["rename"] += 1; continue
        try:
            r = gql(M_RENAME, {"p": pid, "o": {"id": opt["id"], "name": name}})["productOptionUpdate"]
            if r["userErrors"]:
                raise Fehler(json.dumps(r["userErrors"])[:250])
            led.write(f"{pid}\trename\t{name}\t{titel}\n")
            zaehl["rename"] += 1
        except Fehler as e:
            print(f"  !! {e}"); zaehl["fehler"] += 1

    print(f"\n{'SCHARF' if SCHARF else 'PROBELAUF'}: "
          f"zerlegt={zaehl['split']} umbenannt={zaehl['rename']} "
          f"ausgelassen={zaehl['aus']} fehler={zaehl['fehler']}")


if __name__ == "__main__":
    main()
