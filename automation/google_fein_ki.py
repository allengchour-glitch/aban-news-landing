#!/usr/bin/env python3
"""google_fein_ki.py — grobe Google-Kategorien per Zwei-Modell-Einigkeit in den feinen Unterzweig (02.10.2026).

ANLASS: Betreiber «google push und coole fein kategorien». GEMESSEN 02.10. (Bulk-Export, 48'132 aktive im Google-Kanal):
~7'100 Produkte hängen in einem Zweig, der noch Unterpfade hat — 1'200× nur «Electronics», 1'095× «Home & Garden > Decor»,
898× «Exercise & Fitness», 734× «Hardware > Tools», 650× «Kitchen & Dining», 448× «Pet Supplies» … Die Titelregeln von
google_kategorie_fein.py (Schritt 4) haben dort nichts mehr getroffen. Google ordnet Gratis-Einträge über Suchanfrage UND
Kategorie zu; «Wetterstation» unter «Electronics» konkurriert mit allem.

REGEL (eng, damit nichts falsch wird):
  * Nur INNERHALB des bisherigen Werts: Kandidaten = alle Unterpfade des jetzigen Pfads in Googles Taxonomie
    (taxonomy-with-ids.en-US.txt). Ein falsch einsortiertes Produkt bleibt, wo es ist — es wird nicht «verschlimmbessert».
  * Gemini 2.5 Flash und ChatGPT wählen UNABHÄNGIG eine Nummer aus derselben Liste (oder 0 = «keiner passt besser»).
    Geschrieben wird nur bei EXAKT gleicher Wahl ≠ 0. Uneinig/0 → bleibt grob, steht im Ledger (kein zweiter Versuch).
  * Kostüme/Erotik/Klingen (google_kanal_luecke.grund) und Kinderkleidung (kinder_google_pfad.py) bleiben aussen vor.
  * metafieldsSet in 25er-Blöcken, Rücklesen aus der Antwort, Eimer-Etikette; Ledger dropship/_google_fein_ki.tsv.

  EXPORT=/pfad.jsonl python3 automation/google_fein_ki.py          # Trockenlauf (Standard), PLAN_OUT=datei für die volle Liste
  EXPORT=… SCHARF=1 MAX=2000 python3 automation/google_fein_ki.py
Export braucht je Zeile: id, title, tags, g (im Google-Kanal), gk.value (google_product_category).
"""
import concurrent.futures as cf, json, os, re, sys, time, urllib.error, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import google_kategorie_fein as gkf
from google_kanal_luecke import grund as google_risiko
from titel_kauderwelsch_wache import gemini, gpt
from eimer_etikette import nachlauf

SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX", "100000"))
BATCH = int(os.environ.get("BATCH", "40"))
EXPORT = os.environ.get("EXPORT", "")
PLAN_OUT = os.environ.get("PLAN_OUT", "")
NUR = [x for x in os.environ.get("NUR", "").split("|") if x]   # optional: nur diese Ausgangspfade («|»-getrennt)
TEIL = os.environ.get("TEIL", "")          # «k/n»: Arbeiter k von n bekommt jede n-te Gruppe (Grösse absteigend)
LEDGER = os.path.join(os.path.dirname(HIER), "dropship", "_google_fein_ki.tsv")
NS = "mm-google-shopping"
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
KIND = re.compile(r"baby|neugeboren|kleinkind|strampler|kinder|jungen|mädchen|maedchen", re.I)

PROMPT = """Du ordnest Produkte eines Schweizer Onlineshops in Googles Produkt-Taxonomie ein.
Alle Produkte liegen heute unter «{basis}». Wähle für JEDES Produkt die EINE Nummer aus der Liste, deren Pfad das Produkt
am genauesten beschreibt. Nimm 0, wenn kein Unterpfad klar besser passt als «{basis}» selbst oder wenn das Produkt
eigentlich gar nicht unter «{basis}» gehört. Lieber 0 als geraten.

Unterpfade (relativ zu «{basis}»):
{liste}

Produkte:
{produkte}

Antworte NUR als JSON: {{"wahl": {{"<Produktnummer>": <Pfadnummer>, ...}}}} — für jedes Produkt genau ein Eintrag."""


def gql(q, v=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    letzter = ""
    for a in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            nachlauf(j)
            if j.get("data") is not None and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * a)
    print("Shopify-Fehler: " + letzter, file=sys.stderr)
    raise RuntimeError(letzter)


def wahl(antwort, n_prod, n_pfad):
    """JSON-Antwort → {produkt_idx: pfad_idx}; ungültige Einträge fallen weg."""
    out = {}
    for k, v in ((antwort or {}).get("wahl") or {}).items():
        try:
            i, j = int(k), int(v)
        except (TypeError, ValueError):
            continue
        if 1 <= i <= n_prod and 0 <= j <= n_pfad:
            out[i] = j
    return out


_GPT_LEER = False


def groq(text):
    """Ersatz-Zweitprüfer (02.10.: OpenAI «credit_balance_exhausted», DeepSeek «Insufficient Balance»)."""
    k = os.environ.get("GROQ_API_KEY", "")
    if not k:
        raise RuntimeError("GROQ_API_KEY fehlt")
    body = {"model": os.environ.get("GROQ_MODELL", "openai/gpt-oss-120b"), "temperature": 0,
            "messages": [{"role": "user", "content": text}], "response_format": {"type": "json_object"}}
    letzter = ""
    for a in range(4):
        try:
            r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + k,
                                                "User-Agent": "luxestyle-google-fein/1"})   # ohne User-Agent 403
            j = json.load(urllib.request.urlopen(r, timeout=120))
            return json.loads(re.search(r"\{.*\}", j["choices"][0]["message"]["content"], re.S).group(0))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(15 * (a + 1))
    raise RuntimeError("Groq ohne Antwort — " + letzter)


def zweiter(text):
    """ChatGPT, solange es Guthaben hat; sonst Groq (einmal erkannt, für den Rest des Laufs)."""
    global _GPT_LEER
    if not _GPT_LEER and os.environ.get("ZWEITMODELL", "auto") != "groq":
        try:
            return gpt(text)
        except Exception as e:
            if "429" not in str(e):
                raise
            try:   # 429 = Drosselung ODER leeres Guthaben — nur Letzteres schaltet um
                from gemini_jury import openai_schluessel
                urllib.request.urlopen(urllib.request.Request("https://api.openai.com/v1/models",
                                       headers={"Authorization": "Bearer " + openai_schluessel()}), timeout=30)
                req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(
                    {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "ok"}], "max_tokens": 1}).encode(),
                    headers={"Content-Type": "application/json", "Authorization": "Bearer " + openai_schluessel()})
                urllib.request.urlopen(req, timeout=30)
                raise   # Guthaben da → echte Drosselung, normal weiter
            except urllib.error.HTTPError as h:
                if b"insufficient_quota" in h.read() or h.code == 402:
                    _GPT_LEER = True
                    print("  ChatGPT ohne Guthaben → Zweitprüfer Groq", file=sys.stderr, flush=True)
                else:
                    raise e
    return groq(text)


def geduldig(fn, text):
    """ChatGPT antwortet bei parallelen Läufen mit 429 — warten statt den Block zu verwerfen (02.10.: 11× in 10 min)."""
    for a in range(5):
        try:
            return fn(text)
        except Exception as e:
            if "429" not in str(e) or a == 4:
                raise
            time.sleep(30 * (a + 1))


def frage(basis, pfade, titel):
    liste = "\n".join(f"{i}. {p[len(basis) + 3:]}" for i, p in enumerate(pfade, 1))
    produkte = "\n".join(f"{i}. {t}" for i, t in enumerate(titel, 1))
    text = PROMPT.format(basis=basis, liste=liste, produkte=produkte)
    with cf.ThreadPoolExecutor(2) as ex:
        a, b = ex.submit(geduldig, gemini, text), ex.submit(geduldig, zweiter, text)
        ra = rb = None
        try:
            ra = a.result()
        except Exception as e:
            print(f"  Gemini: {e}", file=sys.stderr)
        try:
            rb = b.result()
        except Exception as e:
            print(f"  ChatGPT: {e}", file=sys.stderr)
    return wahl(ra, len(titel), len(pfade)), wahl(rb, len(titel), len(pfade)), ra is not None and rb is not None


def kanarienvogel():
    tax = gkf.taxonomie()
    basis = "Electronics"
    pfade = sorted(p for p in tax if p.startswith(basis + " > "))
    titel = ["Drahtlose Wetterstation mit Thermo- und Hygrometer", "NM Speicherkarte 128 GB für Huawei Smartphones",
             "Elektrischer Weihnachtsmann – Spass für Kinder"]
    g, c, ok = frage(basis, pfade, titel)
    for i, t in enumerate(titel, 1):
        pg = pfade[g[i] - 1] if g.get(i) else "0"
        pc = pfade[c[i] - 1] if c.get(i) else "0"
        print(f"{'=' if g.get(i) == c.get(i) else '≠'} {t}\n    Gemini: {pg}\n    Zweitprüfer: {pc}")
    return 0 if ok else 1


def schreiben(plan, ledger_neu):
    """Ein Block: Ledger der Uneinigen + metafieldsSet mit Rücklesen. Gibt (ok, fehl) zurück."""
    ok = fehl = 0
    with open(LEDGER, "a", encoding="utf-8") as led:
        for z in ledger_neu:
            led.write(z + "\n")
        for i in range(0, len(plan), 25):
            teil = plan[i:i + 25]
            m = [{"ownerId": p["id"], "namespace": NS, "key": "google_product_category", "type": "single_line_text_field",
                  "value": ziel} for p, _, ziel in teil]
            r = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){metafields{owner{... on Product{id}} value} userErrors{message}}}',
                    {"m": m})["metafieldsSet"]
            gesetzt = {(x["owner"] or {}).get("id"): x["value"] for x in r["metafields"] or []}
            for p, basis, ziel in teil:
                if gesetzt.get(p["id"]) == ziel:
                    ok += 1; led.write(f"{p['id']}\tok\t{basis}\t{ziel}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
                else:
                    fehl += 1
            if r["userErrors"]:
                print("  userErrors:", r["userErrors"][:3], file=sys.stderr)
    return ok, fehl


GROSS = int(os.environ.get("GROSS", "150"))   # mehr Unterpfade → zweistufig (Groq lehnt ~400er-Listen mit 413 ab)


def einordnen(basis, titel, tax):
    """Je Titel (ziel|None, status) — status ok/keiner/uneinig/fehlt. Bei > GROSS Unterpfaden erst die direkte
    Unterstufe (beide Modelle einig), dann rekursiv in deren Teilbaum; scheitert Stufe 2, gilt die einige Stufe 1."""
    pfade = sorted(p for p in tax if p.startswith(basis + " > "))
    if not pfade:
        return [(None, "keiner")] * len(titel)
    if len(pfade) <= GROSS:
        g, c, ok = frage(basis, pfade, titel)
        if not ok:
            return [(None, "fehlt")] * len(titel)
        out = []
        for k in range(1, len(titel) + 1):
            a, b = g.get(k), c.get(k)
            out.append((pfade[a - 1], "ok") if a and a == b else (None, "keiner" if a == b else "uneinig"))
        return out
    stufe = [p for p in pfade if p.count(">") == basis.count(">") + 1]
    g, c, ok = frage(basis, stufe, titel)
    if not ok:
        return [(None, "fehlt")] * len(titel)
    out = [None] * len(titel)
    weiter = {}
    for k in range(1, len(titel) + 1):
        a, b = g.get(k), c.get(k)
        if a and a == b:
            weiter.setdefault(stufe[a - 1], []).append(k - 1)
        else:
            out[k - 1] = (None, "keiner" if a == b else "uneinig")
    for kind, idx in weiter.items():
        tiefer = einordnen(kind, [titel[i] for i in idx], tax)
        for i, (z, st) in zip(idx, tiefer):
            # Stufe 1 einig: tieferer Pfad, wenn Stufe 2 einig; der Zweig selbst nur, wenn BEIDE auch dort «0» sagen
            out[i] = (z, "ok") if z else ((kind, "ok") if st == "keiner" else (None, st))
    return out


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    if not EXPORT or not os.path.exists(EXPORT):
        raise SystemExit("EXPORT=<bulk.jsonl> fehlt")
    tax = gkf.taxonomie()
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER, encoding="utf-8") if l.strip()}
    gruppen = {}
    for l in open(EXPORT, encoding="utf-8"):
        p = json.loads(l)
        v = ((p.get("gk") or {}).get("value") or "").strip()
        if not p.get("g") or not v or v.count(">") > 1 or p["id"] in erledigt:
            continue
        if NUR and v not in NUR:
            continue
        if google_risiko(p["title"], p.get("tags") or []) or KIND.search(p["title"]):
            continue
        gruppen.setdefault(v, []).append(p)
    plan, gesamt, uneinig, null = [], 0, 0, 0
    ledger_neu = []
    ok_ges = fehl_ges = schon = led_schon = ausgelassen = 0
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    reihe = sorted(gruppen.items(), key=lambda x: -len(x[1]))
    if TEIL:
        k, n = (int(x) for x in TEIL.split("/"))
        reihe = [g for i, g in enumerate(reihe) if i % n == k - 1]
    for basis, prod in reihe:
        if not any(p.startswith(basis + " > ") for p in tax):
            continue
        for i in range(0, len(prod), BATCH):
            if gesamt >= MAX:
                break
            teil = prod[i:i + BATCH]
            gesamt += len(teil)
            erg = einordnen(basis, [p["title"] for p in teil], tax)
            if all(st == "fehlt" for _, st in erg):
                print(f"  ⚠️ {basis}: ein Modell ohne Antwort — Block übersprungen (kein Ledger)", flush=True)
                ausgelassen += 1
                continue
            for p, (ziel, st) in zip(teil, erg):
                if st == "fehlt":
                    ausgelassen += 1
                elif ziel:
                    plan.append((p, basis, ziel))
                elif st == "keiner":
                    null += 1; ledger_neu.append(f"{p['id']}\tkeiner\t{basis}")
                else:
                    uneinig += 1; ledger_neu.append(f"{p['id']}\tuneinig\t{basis}")
            if SCHARF:
                o, f_ = schreiben(plan[schon:], ledger_neu[led_schon:])
                ok_ges += o; fehl_ges += f_; schon, led_schon = len(plan), len(ledger_neu)
            print(f"  {basis}: {min(i + BATCH, len(prod))}/{len(prod)} · einig {len(plan)} · uneinig {uneinig} · beide 0 {null}"
                  + (f" · geschrieben {ok_ges}" if SCHARF else ""), flush=True)
    print(f"geprüft {gesamt} · einig {len(plan)} · uneinig {uneinig} · beide 0 {null}", flush=True)
    if PLAN_OUT:
        with open(PLAN_OUT, "w", encoding="utf-8") as f:
            for p, basis, ziel in plan:
                f.write(f"{p['title']}\t{basis}\t{ziel[len(basis) + 3:]}\n")
    if SCHARF:
        print(f"FERTIG: {ok_ges} gesetzt · {fehl_ges} Fehler · ausgelassen {ausgelassen}", flush=True)
        if TEIL and gesamt < MAX and not ausgelassen and not fehl_ges:   # Anteil komplett → Aufseher startet ihn nicht mehr
            open(os.path.join(os.path.dirname(HIER), "dropship", f"_google_fein_ki_fertig_{TEIL.replace('/', 'von')}.txt"), "w").write(
                time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()) + f" geprüft {gesamt}, gesetzt {ok_ges}\n")
    return 1 if fehl_ges else 0


if __name__ == "__main__":
    sys.exit(main())
