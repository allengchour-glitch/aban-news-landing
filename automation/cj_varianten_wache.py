#!/usr/bin/env python3
"""cj_varianten_wache.py — Ghost-Sale-Schutz auf VARIANTEN-Ebene (21.09.2026).

ANLASS: Trainingsanzug CJWL2960714 — CJ hat die Farbe «Blau» (8 Varianten) gestrichen, das
Produkt lebt mit 32 anderen Varianten. `cj_verfuegbarkeit.py` fragt je Produkt EINE SKU (die
erste) und sah deshalb nur «Variante weg, Produkt da» — die 8 blauen Varianten standen mit
inventoryQuantity 0 + inventoryPolicy CONTINUE weiter kaufbar im Shop. Gemessen: 18'787
aktive CJ-Produkte sind mehrvariantig (~420k Varianten). Jede davon kann so eine Klasse tragen.

WAS ER TUT: je mehrvariantigem CJ-Produkt EINE CJ-Anfrage (productSku bzw. pid → ALLE lebenden
Varianten) und Vergleich mit den Shop-Varianten. Shop-Variante, die CJ nicht mehr fuehrt und
noch CONTINUE ist → inventoryPolicy DENY (zeigt «ausverkauft», nichts wird geloescht, jederzeit
umkehrbar). Fehlen ALLE Shop-Varianten bei CJ, ist das kein Befund, sondern ein Verdacht auf
falsche SKU-Ableitung → «unklar», nichts anfassen (Lehre 09.08./21.09.: ein «not found» aus der
falschen Anfrage beweist nichts). Produkt ganz weg (1602002) → bleibt `cj_verfuegbarkeit` ueberlassen.

KANARIENVOGEL: vor dem Lauf muss CJWL2960714 mit ≥30 Varianten antworten, sonst Abbruch — sonst
wuerde eine gedrosselte/kaputte CJ-Antwort «alle Varianten weg» fuer alles melden.

Ledger: dropship/_cj_varianten_wache.txt (pid, ts, ergebnis) — Wiedervorlage nach RECHECK_TAGE.
Env: LIMIT (Produkte je Lauf, Std. 300), DRY=1 (nur messen), RECHECK_TAGE (Std. 30).
"""
import os, sys, re, json, time, fcntl, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cj_takt import takt, frei   # EIN Takt fuer alle CJ-Verbraucher (21.09.)

# ⚠️ Der Aufseher startet die /tmp-KOPIE (`python3 /tmp/cj_varianten_wache.py`); ein aus
# __file__ abgeleitetes REPO waere dann «/» — gemessen beim ersten Lauf: FileNotFoundError auf
# das Ledger. Fester Pfad, wie bei den anderen Reinigern.
REPO = os.environ.get("REPO", "/home/user/aban-news-landing")
os.chdir(REPO)
LEDGER = "dropship/_cj_varianten_wache.txt"
EXPORT = "/tmp/export.jsonl"
OPTS = "/tmp/opts_frisch.jsonl"
KANARIE = ("CJWL2960714", 30)
DRY = os.environ.get("DRY") == "1"
LIMIT = int(os.environ.get("LIMIT", "300"))
RECHECK_S = int(os.environ.get("RECHECK_TAGE", "30")) * 86400
SHOP = "au3j0y-hq.myshopify.com"
TOKPFAD = "/tmp/cj_shop_token.txt"


def _nur_einmal():
    """flock auf FESTEM Pfad: /tmp-Kopie (Aufseher) und Repo-Fassung sind DERSELBE Waechter."""
    fd = os.open("/tmp/cj_varianten_wache.lock", os.O_RDWR | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("laeuft schon (Sperre /tmp/cj_varianten_wache.lock) — Ende"); sys.exit(0)
    globals()["_LOCK_FD"] = fd


def _cj_token():
    for p in ("/tmp/cj_token.json",):
        try:
            d = json.load(open(p)); t = d.get("accessToken") or d.get("token") or d.get("data", {}).get("accessToken")
            if t: return t
        except Exception: pass
    for p in ("/tmp/cj_creds.env",):
        try:
            for l in open(p):
                if l.startswith("CJ_TOKEN=") or l.startswith("export CJ_TOKEN="):
                    return l.split("=", 1)[1].strip().strip('"')
        except Exception: pass
    print("CJ-Token fehlt (/tmp/cj_token.json) — NICHT MESSBAR"); sys.exit(2)


CJTOK = _cj_token()


def cj(path):
    a = ["curl", "-s", "--max-time", "40", "-H", "CJ-Access-Token: " + CJTOK,
         "https://developers.cjdropshipping.com" + path]
    for att in range(5):
        takt()                                   # prozessuebergreifend 1 Anfrage/s
        out = subprocess.run(a, capture_output=True, text=True).stdout
        frei()
        try: d = json.loads(out)
        except Exception:
            time.sleep(2); continue
        if str(d.get("code")) in ("1600200", "1600201"):
            time.sleep(1.2); continue            # mit Takt selten; kurz statt 8/16/24 s
        return d
    return None


def gql(q, v=None):
    tok = open(TOKPFAD).read().strip()
    a = ["curl", "-s", "--max-time", "60", "-X", "POST", f"https://{SHOP}/admin/api/2026-01/graphql.json",
         "-H", "X-Shopify-Access-Token: " + tok, "-H", "Content-Type: application/json",
         "-d", json.dumps({"query": q, "variables": v or {}})]
    drossel = 0; versuche = 0; grund = ""
    while versuche < 4:
        out = subprocess.run(a, capture_output=True, text=True).stdout
        try: d = json.loads(out)
        except Exception:
            grund = "kein JSON: " + out[:80]; versuche += 1; time.sleep(3); continue
        errs = d.get("errors")
        if errs:
            grund = "[API] " + str(errs[0].get("message"))[:120]
            if "THROTTLED" in grund.upper():
                drossel += 1; wartezeit = 12.0
                try:
                    k = (d.get("extensions") or {}).get("cost") or {}; t = k.get("throttleStatus") or {}
                    fehlt = float(k.get("requestedQueryCost") or 0) - float(t.get("currentlyAvailable") or 0)
                    rate = float(t.get("restoreRate") or 0)
                    if fehlt > 0 and rate > 0: wartezeit = min(30.0, fehlt / rate + 0.5)
                except Exception: pass
                time.sleep(wartezeit)
                if drossel < 12: continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund; break
            versuche += 1; time.sleep(3); continue
        return d
    raise RuntimeError(f"Shopify antwortet nicht ({versuche} Versuche). Letzter Grund: {grund}")


def cj_varianten(sku):
    """-> (set lebender CJ-Varianten-SKUs, grund) — grund gesetzt = unklar/weg, Set leer."""
    s = (sku or "").strip(); kern = re.sub(r'^CJ-', '', s, flags=re.I)
    if re.fullmatch(r'[0-9]{10,}', kern):
        d = cj(f"/api2.0/v1/product/variant/query?pid={kern}")
        if d is None: return set(), "keine CJ-Antwort"
        if str(d.get("code")) == "200" and isinstance(d.get("data"), list):
            return {v.get("variantSku") for v in d["data"] if v.get("variantSku")}, ""
        return set(), f"pid-Abfrage Code {d.get('code')}"
    m = re.match(r'([A-Za-z]{2,8}\d{5,}[A-Za-z]{0,3})', kern)
    if not m: return set(), f"SKU-Form nicht pruefbar: {s[:30]!r}"
    kern = m.group(1)
    psku = kern[:-4] if re.search(r'\d{2}[A-Za-z]{2}$', kern) else kern
    d = cj(f"/api2.0/v1/product/query?productSku={psku}")
    if d is None: return set(), "keine CJ-Antwort"
    code = str(d.get("code"))
    if code == "1602001" and psku != kern:
        d = cj(f"/api2.0/v1/product/query?productSku={kern}") or {}; code = str(d.get("code"))
    if code == "1602002": return set(), "PRODUKT-WEG (1602002) — cj_verfuegbarkeit zustaendig"
    if code != "200": return set(), f"CJ-Code {code}: {str(d.get('message'))[:50]}"
    vs = ((d.get("data") or {}).get("variants") or [])
    if not vs: return set(), "200 ohne Varianten"
    return {v.get("variantSku") for v in vs if v.get("variantSku")}, ""


def kandidaten(done):
    tags = {}
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 36 * 3600:
        print("Export fehlt/zu alt (/tmp/export.jsonl) — NICHT MESSBAR"); sys.exit(2)
    for l in open(EXPORT):
        try: p = json.loads(l)
        except Exception: continue
        if p.get("status") == "ACTIVE" and any(t == "cj-real" or t.startswith("cj-real") for t in (p.get("tags") or [])):
            tags[p["id"]] = 1
    out = []
    for l in open(OPTS):
        try: o = json.loads(l)
        except Exception: continue
        pid = o.get("id")
        if pid not in tags or pid in done: continue
        k = 1
        for op in o.get("options") or []: k *= max(1, len(op.get("optionValues") or []))
        if k > 1: out.append(pid)
    return out


def main():
    _nur_einmal()
    k = cj(f"/api2.0/v1/product/query?productSku={KANARIE[0]}") or {}
    nk = len(((k.get("data") or {}).get("variants") or []))
    if str(k.get("code")) != "200" or nk < KANARIE[1]:
        print(f"KANARIENVOGEL ROT: {KANARIE[0]} → {k.get('code')} / {nk} Varianten — Abbruch, kein Urteil"); sys.exit(2)
    done = {}
    if os.path.exists(LEDGER):
        for l in open(LEDGER):
            t = l.rstrip("\n").split("\t")
            if len(t) >= 2:
                if len(t) > 3 and t[2] == "unklar" and ("PRODUKT-WEG" in t[3] or "Ableitung" in t[3]):
                    continue                     # erste Fassung: liegen gelassen bzw. SKU-Anhaengsel → neu pruefen
                try: done[t[0]] = float(t[1])
                except ValueError: pass
    jetzt = time.time()
    frisch = {p for p, ts in done.items() if jetzt - ts < RECHECK_S}
    kand = kandidaten(frisch)
    if os.environ.get("NUR_PID"):          # Gegenprobe: ein bekannter Fall muss ein «1» ergeben
        kand = [os.environ["NUR_PID"]]
    print(f"Start | Ledger {len(done)} (frisch {len(frisch)}) | Kandidaten {len(kand)} | LIMIT {LIMIT} | DRY={DRY}", flush=True)
    fl = open(LEDGER, "a")
    n = deny = unklar = weg = 0
    arbeit = kand[:LIMIT]; produkte = {}
    # Shopify in 50er-Buendeln (nodes(ids:)) statt einer Abfrage je Produkt: 0,5 s → ~0,01 s je Produkt
    for i in range(0, len(arbeit), 50):
        try:
            d = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title variants(first:100){nodes{id sku title inventoryPolicy}}}}}', {"ids": arbeit[i:i+50]})
        except RuntimeError as e:
            print("ABBRUCH (Shopify):", e); break
        for p in (d.get("data") or {}).get("nodes") or []:
            if p and p.get("id"): produkte[p["id"]] = p
    for pid in arbeit:
        n += 1
        p = produkte.get(pid) or {}
        vs = [v for v in ((p.get("variants") or {}).get("nodes") or []) if re.match(r'CJ-?', v.get("sku") or "", re.I)]
        if len(vs) < 2:
            fl.write(f"{pid}\t{jetzt:.0f}\tkeine-cj-mehrvarianten\n"); fl.flush(); continue
        live, grund = cj_varianten(vs[0]["sku"])
        if grund.startswith("PRODUKT-WEG"):
            # Gemessen 21.09.: 1602002 nennt die pid des einst existierenden Produkts, Garbage-SKUs
            # geben 1602001 — die Absage ist also eine Aussage ueber DIESES Produkt. Ein Produkt,
            # das CJ nicht mehr fuehrt und ACTIVE ist, ist ein Ghost-Sale (Klasse #1006/#1008/#1009);
            # cj_verfuegbarkeit fragt einmal geprueft nie wieder (Ledger anhaengend, datumslos),
            # deshalb wird hier gedraftet — gleiche Tag- und Ledger-Konvention, damit er nicht
            # erneut fragt.
            weg += 1
            if not DRY:
                r1 = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}', {"i": {"id": pid, "status": "DRAFT"}})
                r2 = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": pid, "t": ["cj-nicht-mehr-verfuegbar"]})
                e = ((r1.get("data") or {}).get("productUpdate") or {}).get("userErrors") or ((r2.get("data") or {}).get("tagsAdd") or {}).get("userErrors")
                if e:
                    print(f"  FEHLER Draft {pid}: {e}", flush=True); unklar += 1
                    fl.write(f"{pid}\t{jetzt:.0f}\tunklar\tDraft-Fehler {str(e)[:60]}\n"); fl.flush(); continue
                open("dropship/_cj_verfuegbarkeit.txt", "a").write(f"{pid}\tbei-cj-weg\t{vs[0]['sku']}\tvia-varianten-wache-{time.strftime('%Y-%m-%d')}\n")
            fl.write(f"{pid}\t{jetzt:.0f}\tprodukt-weg\t{'wuerde-draften' if DRY else 'gedraftet'} ({vs[0]['sku']})\n"); fl.flush()
            print(f"  {'DRY ' if DRY else ''}⛔ PRODUKT WEG: {p.get('title','')[:45]} [{vs[0]['sku']}] → {'wuerde draften' if DRY else 'DRAFT'}", flush=True); continue
        if grund:
            unklar += 1
            fl.write(f"{pid}\t{jetzt:.0f}\tunklar\t{grund}\n"); fl.flush()
            print(f"  ❔ {p.get('title','')[:45]} — {grund}", flush=True); continue
        # Shop-SKUs tragen teils den Variantennamen angehaengt («CJ-CJYD292660001AZ-English
        # PackagingGray», gemessen 21.09. am Akku-Handsauger) — verglichen wird der fuehrende
        # SKU-Block, sonst «fehlen» alle und der Verdachts-Zweig unten greift zu Unrecht.
        def _kern(sku):
            k = re.sub(r'^CJ-', '', sku or '', flags=re.I)
            m = re.match(r'([A-Za-z]{2,8}\d{5,}[A-Za-z]{0,3})', k)
            return m.group(1) if m else k
        fehlend = [v for v in vs if _kern(v["sku"]) not in live]
        if len(fehlend) == len(vs):
            unklar += 1
            fl.write(f"{pid}\t{jetzt:.0f}\tunklar\tALLE {len(vs)} Shop-SKUs fehlen bei CJ ({len(live)} lebend) — Ableitung pruefen\n"); fl.flush()
            print(f"  ❔ {p.get('title','')[:45]} — alle {len(vs)} Shop-SKUs fehlen bei CJ ({len(live)} lebend): Ableitung?", flush=True); continue
        zu_deny = [v for v in fehlend if v["inventoryPolicy"] == "CONTINUE"]
        if zu_deny and not DRY:
            r = gql('mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}',
                    {"p": pid, "v": [{"id": v["id"], "inventoryPolicy": "DENY"} for v in zu_deny]})
            e = ((r.get("data") or {}).get("productVariantsBulkUpdate") or {}).get("userErrors")
            if e:
                print(f"  FEHLER {pid}: {e}", flush=True); unklar += 1
                fl.write(f"{pid}\t{jetzt:.0f}\tunklar\tDENY-Fehler {str(e)[:60]}\n"); fl.flush(); continue
        deny += len(zu_deny)
        fl.write(f"{pid}\t{jetzt:.0f}\tok\t{len(vs)} Shop / {len(live)} CJ / {len(fehlend)} fehlend / {len(zu_deny)} {'wuerde-DENY' if DRY else 'DENY'}\n"); fl.flush()
        if fehlend:
            print(f"  {'DRY ' if DRY else ''}⛔ {p.get('title','')[:45]}: {len(fehlend)} von {len(vs)} Varianten bei CJ weg → {len(zu_deny)} DENY: {[v['title'] for v in fehlend][:6]}", flush=True)
    print(f"FERTIG: {n} geprüft, {deny} Varianten {'wuerden' if DRY else ''} DENY, {weg} Produkt-weg, {unklar} unklar, Rest {max(0, len(kand)-n)}", flush=True)


if __name__ == "__main__":
    main()
