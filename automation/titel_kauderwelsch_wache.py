#!/usr/bin/env python3
"""titel_kauderwelsch_wache.py — Neuimport-Titel mit Wörtern, die es im Deutschen nicht gibt (01.10.2026).

NACHTRAG 01.10. 20:40 (Verbesserungsrunde): 6 von 254 Neuimporten der Lampen-Suche halb übersetzt («Halloween Witch
Hat Nachtlicht», «Lily of the Valley Duftwärmer») — kein Nicht-Wort, also vom ersten Prompt durchgelassen. Prompt deckt jetzt auch
stehengebliebenes Englisch mit gängigem deutschem Wort; Vergleich wortweise, Ersatz bindestrich-unabhängig.

ANLASS (12-Tage-Plan, Tag 1, Grind wieder an): Der erste Neuimport nach der Pause hiess «Inflierbares Halloween Kostüm für
zwei Personen» — eine Eindeutschung von «inflatable», richtig wäre «Aufblasbares». `titel_sprache.mjs` fängt nur ABGESCHRIEBENES
Englisch (alle Wörter stehen im CJ-Namen); ein erfundenes deutsches Wort fällt dort durch, weil es in keinem englischen Text
steht. Kein Wörterbuch im Container → zwei Modelle als Vier-Augen-Prüfung (Muster gemini_jury / google_bild_tausch):

  Gemini prüft alle neuen Titel im Block → nennt Nicht-Wörter + Korrektur.
  ChatGPT prüft jeden gemeldeten Titel einzeln, ohne Geminis Antwort zu kennen.
  Geändert wird NUR, wenn beide dasselbe Wort als falsch nennen; die Korrektur ist Geminis Titel, sofern ChatGPTs Titel
  dasselbe Ersatzwort enthält. Sonst: nur gemeldet (Bericht), nie geraten. Marken-/Modellnamen bleiben (Prompt + Sperre:
  Grossbuchstaben-Folgen, Ziffern).
Rücklesen nach jeder Änderung, Ledger dropship/_titel_kauderwelsch.tsv (jedes Produkt nur einmal geprüft).
  python3 automation/titel_kauderwelsch_wache.py            # Trockenlauf (Standard), STUNDEN=48
  SCHARF=1 python3 automation/titel_kauderwelsch_wache.py
  python3 automation/titel_kauderwelsch_wache.py --kanarienvogel
"""
import json, os, re, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from gemini_jury import schluessel, openai_schluessel, MODELL_GPT

TOK = os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
SCHARF = os.environ.get("SCHARF") == "1"
STUNDEN = float(os.environ.get("STUNDEN", "48"))
LEDGER = os.path.join(REPO, "dropship", "_titel_kauderwelsch.tsv")

PROMPT = """Du prüfst deutsche Produkttitel eines Schweizer Onlineshops auf Wörter, die es im Deutschen NICHT gibt
(falsche Eindeutschungen englischer Wörter wie «Inflierbar» statt «Aufblasbar», Tippfehler, erfundene Wörter)
UND auf stehengebliebene englische Wörter, für die es ein gängiges deutsches Wort gibt und die eine deutschsprachige
Kundin so nicht suchen würde (z. B. «Witch Hat» → «Hexenhut», «Lily of the Valley» → «Maiglöckchen», «Resin» → «Kunstharz»).
NICHT melden: Marken, Modellnamen, Produktnamen in Anführungszeichen, Masse, übliche Anglizismen (Oversized, Slim Fit,
Wireless, Hoodie, LED, USB, Set, Indoor, Outdoor, Halloween, Yacht, Camping, Make-up), Schweizer Schreibweise (ss statt ß),
Stil- oder Grammatikfragen.
Antworte NUR als JSON: {"titel": [{"nr": <Nummer>, "falsch": ["<Wort genau wie im Titel>"], "korrektur": "<ganzer korrigierter Titel>"}]}
Nur Titel mit mindestens einem Nicht-Wort aufführen. Leere Liste, wenn alles korrekt ist.

"""


def gql(q, v=None):
    letzter = ""
    for versuch in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            if j.get("data") and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * versuch)
    raise RuntimeError("Shopify antwortet nicht — " + letzter)


def gemini(text):
    k = schluessel()
    if not k:
        raise RuntimeError("GEMINI_API_KEY fehlt")
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"temperature": 0.0, "response_mime_type": "application/json"}}
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={k}",
                data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            return json.loads(re.search(r"\{.*\}", j["candidates"][0]["content"]["parts"][0]["text"], re.S).group(0))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + letzter)


def gpt(text):
    k = openai_schluessel()
    if not k:
        raise RuntimeError("OPENAI-Schlüssel fehlt")
    body = {"model": MODELL_GPT, "messages": [{"role": "user", "content": text}], "response_format": {"type": "json_object"}}
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + k})
            j = json.load(urllib.request.urlopen(r, timeout=180))
            return json.loads(re.search(r"\{.*\}", j["choices"][0]["message"]["content"], re.S).group(0))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("ChatGPT ohne Antwort — " + letzter)


def norm(w):
    return re.sub(r"[^a-zäöüß]", "", w.lower())


def pruefen(titel):
    """titel: Liste von Strings → Liste von (index, falsch_set, korrektur) mit Einigkeit beider Modelle."""
    ergebnis = []
    for start in range(0, len(titel), 40):
        block = titel[start:start + 40]
        g = gemini(PROMPT + "\n".join(f"{i + 1}. {t}" for i, t in enumerate(block)))
        for e in g.get("titel") or []:
            try:
                i = int(e["nr"]) - 1
            except Exception:
                continue
            if not (0 <= i < len(block)) or not e.get("falsch"):
                continue
            t = block[i]
            # 01.10. (Denglisch): «falsch» kann eine Wortfolge sein («Witch Hat») — verglichen wird Wort für Wort,
            # sonst wäre «Witch Hat» ≠ [«Witch», «Hat»] und zwei einige Modelle gälten als uneinig.
            gf = {norm(x) for w in e["falsch"] if not re.search(r"\d", w) for x in w.split()
                  if norm(x) and norm(x) in norm(t)}
            if not gf:
                continue
            o = gpt(PROMPT + "1. " + t)
            oe = (o.get("titel") or [{}])[0] if o.get("titel") else {}
            of = {norm(x) for w in (oe.get("falsch") or []) for x in str(w).split() if norm(x)}
            gemeinsam = gf & of
            korr = (e.get("korrektur") or "").strip()
            okorr = (oe.get("korrektur") or "").strip()
            einig = bool(gemeinsam) and korr and okorr
            if einig:
                # Ersatzwörter: was in Geminis Korrektur neu ist, muss auch in ChatGPTs Korrektur stehen
                neu_g = {norm(w) for w in korr.split()} - {norm(w) for w in t.split()}
                neu_o = {norm(w) for w in okorr.split()} - {norm(w) for w in t.split()}
                # Bindestrich/Zusammenschreibung zählt nicht als Uneinigkeit («Hexenhut-Nachtlicht» = «Hexenhut Nachtlicht»):
                # jedes neue Wort Geminis muss in ChatGPTs Korrektur vorkommen, die ohne Leerzeichen gelesen wird.
                o_flach = norm(okorr)
                einig = bool(neu_g) and all(w in o_flach for w in neu_g) and 0.6 <= len(korr) / max(1, len(t)) <= 1.4
            ergebnis.append((start + i, gemeinsam or gf, korr if einig else "", okorr, einig))
    return ergebnis


def kanarienvogel():
    faelle = [("Inflierbares Halloween Kostüm für zwei Personen", True),
              ("Aufblasbares Halloween-Kostüm für zwei Personen", False),
              ("Solarer Weihnachtsbaum für Garten", False),
              ("Centechia 1-zu-3 RJ45 Ethernet Splitter", False),
              ("Damen Oversized Hoodie mit Kängurutasche", False),
              ("Wasserdichtige Regenjacke für Herren", None),
              ("Adjustierbarer Ledergürtel für Damen", True),
              # Denglisch (01.10., Neuimporte der Lampen-Suche): halb übersetzt → korrigieren; echte Anglizismen bleiben
              ("Halloween Witch Hat Nachtlicht", True),
              ("Lily of the Valley Duftwärmer ohne Flamme", True),
              ("Outdoor LED-Lichterkette für den Garten", False),
              ("Marine Yacht Indoor Leselicht", None)]
    r = pruefen([t for t, _ in faelle])
    gemeldet = {i: einig for i, _, _, _, einig in r}
    ok = 0
    for i, (t, soll) in enumerate(faelle):
        ist = gemeldet.get(i, False)
        if soll is None:                  # Grenzfall: Modelle dürfen uneinig sein → nur melden, nie ändern; zählt als bestanden
            print(f"· Grenzfall (gemeldet {i in gemeldet}, geändert {ist})  {t}"); ok += 1; continue
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} soll {soll!s:5} ist {ist!s:5}  {t}")
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    seit = (datetime.now(timezone.utc) - timedelta(hours=STUNDEN)).strftime("%Y-%m-%dT%H:%M:%SZ")
    fertig = {l.split("\t")[0] for l in open(LEDGER)} if os.path.exists(LEDGER) else set()
    prod, c = [], None
    while True:
        d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title status}}}', {"c": c, "q": f"created_at:>='{seit}' AND status:active"})["products"]
        prod += [p for p in d["nodes"] if p["id"] not in fertig]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(prod)} neue aktive Titel seit {seit} · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    if not prod:
        print("FERTIG: 0 geprüft"); return 0
    befunde = pruefen([p["title"] for p in prod])
    led = open(LEDGER, "a", encoding="utf-8")
    geaendert = gemeldet = 0
    bef = {i: (f, k, ok_, e) for i, f, k, ok_, e in befunde}
    for i, p in enumerate(prod):
        if i not in bef:
            if SCHARF:
                led.write(f"{p['id']}\tok\t{p['title']}\n")
            continue
        falsch, korr, okorr, einig = bef[i]
        if einig and SCHARF:
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{title} userErrors{message}}}',
                    {"i": {"id": p["id"], "title": korr}})["productUpdate"]
            if not r["userErrors"] and r["product"]["title"] == korr:
                geaendert += 1
                led.write(f"{p['id']}\tkorrigiert\t{p['title']}\t→ {korr}\t{','.join(sorted(falsch))}\n")
                print(f"  ✏️ {p['title']}  →  {korr}", flush=True)
                continue
        gemeldet += 1
        art = "einig-trocken" if einig else "uneinig"
        if SCHARF:
            led.write(f"{p['id']}\t{art}\t{p['title']}\t{korr or okorr}\t{','.join(sorted(falsch))}\n")
        print(f"  ⚠️ {art}: {p['title']}  (G: {korr or '—'} | GPT: {okorr or '—'})", flush=True)
    led.flush()
    print(f"FERTIG: {len(prod)} geprüft, {geaendert} korrigiert, {gemeldet} gemeldet", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
