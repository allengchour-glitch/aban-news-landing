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
import json, os, re, sys, time, urllib.error, urllib.request
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
Steht unter einem Titel «(Ware: …)», muss die Korrektur zu DIESER Ware passen — keine wörtliche Übersetzung, die etwas
anderes bezeichnet («Mummy-Rucksack» für Mütter = Wickelrucksack, nicht «Mumien-Rucksack»).

"""


try:  # 03.10.2026: Eimer-Etikette im gemeinsamen gql-Helfer (Regel «helfer-ohne-eimer»)
    from eimer_etikette import nachlauf as _nachlauf
except Exception:  # pragma: no cover
    def _nachlauf(d):
        return 0


def gql(q, v=None):
    letzter = ""
    for versuch in range(6):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            _nachlauf(j)
            if j.get("data") and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        time.sleep(4 + 3 * versuch)
    raise RuntimeError("Shopify antwortet nicht — " + letzter)


ERSTPRUEFER = "gemini"          # welches Modell zuletzt als Erstprüfer antwortete (Bericht)
# Gemessen 04.10.2026 (/openai/v1/models): Llama 3.3 70B gibt es in diesem Konto NICHT mehr (404 model_not_found);
# verfügbar sind gpt-oss-120b/-20b und qwen3.8-27b. Qwen ist die andere Modellfamilie → Erstprüfer; Ausweich gpt-oss-20b.
GROQ_ERST = os.environ.get("KW_GROQ_ERST", "qwen/qwen3.8-27b")
GROQ_ERST_AUSWEICH = "openai/gpt-oss-20b"


def groq_erst(text):
    """Erstprüfer-Ersatz, wenn Gemini kein Guthaben hat (04.10.2026).

    GEMESSEN 04.10. 22:11: die Wache starb seit dem 03.10. bei JEDEM Lauf mit «HTTP Error 402: Payment
    Required» — 837 Neuimporte eines Tages blieben ungeprüft, darunter «Inspirational Dream Cut Letter
    Sticker Vision Board Set» und «Bicycle Shaft Tool Set – Crank Remover & Puller». Ein Wächter, der
    bei leerem Guthaben stirbt, ist keiner. Zweitprüfer ist dann Groq gpt-oss (zweitmodell.chat_json,
    weil auch ChatGPT leer war) — darum nimmt der Erstprüfer BEWUSST ein anderes Groq-Modell
    (Llama 3.3 70B), sonst fragte die Vier-Augen-Prüfung dasselbe Modell zweimal.
    """
    global ERSTPRUEFER
    import zweitmodell
    ks = zweitmodell.groq_schluessel()
    if not ks:
        raise RuntimeError("GROQ_API_KEY fehlt")
    letzter = ""
    # Reihenfolge: Erstprüfer-Modell mit jedem Schlüssel (Schlüssel 3 hängt an einer anderen Organisation = eigenes
    # Tageskontingent), dann das Ausweichmodell. Ein Tageslimit (429 TPD) ist kein Grund zu warten — nächste Kombination.
    kombis = [(m, k) for m in (GROQ_ERST, GROQ_ERST_AUSWEICH) for i, k in enumerate(ks)
              if not zweitmodell.reserviert(i + 1, m)]          # 05.10.: Bildmodell auf Schlüssel 3 = Vorrang-Reserve
    for a, (modell, k) in enumerate(kombis):
        body = {"model": modell, "temperature": 0, "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": text}]}
        if modell.startswith("openai/gpt-oss"):      # gemessen 04.10.: ohne Deckel verbrennt gpt-oss das Tageskontingent im Denken
            body.update(reasoning_effort="low", max_completion_tokens=2500)
        try:
            r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": f"Bearer {k}",
                                                "User-Agent": "luxestyle-kauderwelsch/1.0"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            ERSTPRUEFER = modell
            return json.loads(re.search(r"\{.*\}", j["choices"][0]["message"]["content"], re.S).group(0))
        except urllib.error.HTTPError as e:
            koerper = e.read().decode("utf-8", "replace")[:200]
            letzter = f"HTTP {e.code} ({modell}): {koerper}"
            if e.code == 429 and "per day" in koerper.lower():
                continue                       # Lehre 02.10.: Tageslimit = nicht warten; hier: nächster Schlüssel/Modell
            if e.code == 404:
                continue
            if e.code == 400 and "json_validate_failed" in koerper:
                # gpt-oss liefert im JSON-Modus bei langen Blöcken leeren Inhalt (gemessen 04.10. 22:50, failed_generation "")
                # → derselbe Auftrag ohne response_format; der Prompt verlangt JSON ohnehin, geparst wird mit Regex.
                try:
                    body2 = {kk: vv for kk, vv in body.items() if kk != "response_format"}
                    r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body2).encode(),
                                               headers={"Content-Type": "application/json", "Authorization": f"Bearer {k}",
                                                        "User-Agent": "luxestyle-kauderwelsch/1.0"})
                    j = json.load(urllib.request.urlopen(r, timeout=120))
                    ERSTPRUEFER = modell + " (frei)"
                    return json.loads(re.search(r"\{.*\}", j["choices"][0]["message"]["content"], re.S).group(0))
                except Exception as e2:
                    letzter = f"{modell} ohne JSON-Modus: {type(e2).__name__}: {str(e2)[:120]}"
                continue
            time.sleep(6 * (a + 1))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("Groq ohne Antwort — " + letzter)


def gemini(text):
    """Erstprüfer: Gemini; bei HTTP 402 (kein Guthaben, Marke /tmp/gemini_leer) sofort groq_erst."""
    global ERSTPRUEFER
    import zweitmodell
    k = schluessel()
    if not k or zweitmodell.gemini_leer():
        ERSTPRUEFER = GROQ_ERST
        return groq_erst(text)
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"temperature": 0.0, "response_mime_type": "application/json"}}
    letzter = ""
    for a in range(3):
        try:
            r = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={k}",
                data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=120))
            ERSTPRUEFER = "gemini-2.5-flash"
            return json.loads(re.search(r"\{.*\}", j["candidates"][0]["content"]["parts"][0]["text"], re.S).group(0))
        except urllib.error.HTTPError as e:
            koerper = e.read().decode("utf-8", "replace")
            letzter = f"HTTP {e.code}: {koerper[:150]}"
            if e.code == 402 or zweitmodell.ist_gemini_402(f"{e.code} {koerper}"):
                zweitmodell.handle_gemini_402(letzter)
                ERSTPRUEFER = GROQ_ERST
                return groq_erst(text)
            time.sleep(4 * (a + 1))
        except Exception as e:
            letzter = f"{type(e).__name__}: {str(e)[:150]}"; time.sleep(4 * (a + 1))
    raise RuntimeError("Gemini ohne Antwort — " + letzter)


def gpt(text):
    """Zweitprüfer (ChatGPT, bei leerem Guthaben Groq) — 02.10.2026, siehe zweitmodell.py."""
    import zweitmodell
    return zweitmodell.chat_json(text)


def norm(w):
    return re.sub(r"[^a-zäöüß]", "", w.lower())


BESTAETIGEN = """Ein Shop-Titel enthält ein Wort, das es im Deutschen nicht gibt, oder ein stehengebliebenes englisches Wort.
Ein anderes Modell schlägt eine Korrektur vor. Prüfe NUR: Ist die Korrektur richtig — ersetzt sie genau die falschen Wörter
durch das gängige deutsche Wort, erfindet nichts dazu, lässt nichts Wichtiges weg (Material, Mass, Zielgruppe bleiben) und
ist selbst fehlerfrei? Antworte NUR als JSON: {"ok": true|false, "grund": "<kurz>"}
Passt die Korrektur zur beschriebenen Ware? Eine wörtliche Übersetzung, die etwas anderes bezeichnet, ist falsch.
Original: «%s»
Falsche Wörter: %s
Korrektur: «%s»
Ware laut Beschreibung: «%s»"""


def bestaetigt(modell, titel, falsch, korrektur, ware=""):
    """09.10.2026: «uneinig» hiess oft nur: ein Modell markierte das Wort, lieferte aber keine Korrektur («G: —»). 354 Titel
    lagen so seit dem 01.10. im Ledger («Patentreifen» statt Lackleder, «Einheitsbalken» statt Riemen). Jetzt bestätigt das
    ANDERE Modell die Korrektur des einen — weiterhin zwei Modelle, eines schlägt vor, eines prüft."""
    if not korrektur or not (0.6 <= len(korrektur) / max(1, len(titel)) <= 1.6):
        return False
    if any(norm(w) and norm(w) in norm(korrektur) for w in falsch):
        return False                                   # das falsche Wort steht noch drin
    a = (gemini if modell == "gemini" else gpt)(BESTAETIGEN % (titel, ", ".join(sorted(falsch)), korrektur, ware or "—"))
    return bool(a.get("ok")) is True


def ware(html, n=180):
    """09.10.2026: Auszug aus der Beschreibung für die Prüfer. Rückstand-Durchgang 113 Vorschläge, davon ~8 wörtlich falsch
    («Mummy-Rucksack» → «Mumien-Rucksack», «Kaucher» → «Kocher» bei einem Hunde-Trinknapf) — die Beschreibung hätte es
    gesagt («für werdende Mütter … Babybedarf»). Ohne Beschreibung (Kanarien) bleibt alles wie vorher."""
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()
    t = t.split("Das zeichnet es aus")[0].split("🛡️")[0].strip()
    return t[:n]


def pruefen(titel, waren=None):
    """titel: Liste von Strings → Liste von (index, falsch_set, korrektur) mit Einigkeit beider Modelle.
    waren: optional gleich lange Liste von Beschreibungs-Auszügen (ware())."""
    waren = waren or [""] * len(titel)
    zeile = lambda i, t, w: f"{i}. {t}" + (f"\n   (Ware: {w})" if w else "")
    ergebnis = []
    for start in range(0, len(titel), 40):
        block = titel[start:start + 40]
        wblock = waren[start:start + 40]
        g = gemini(PROMPT + "\n".join(zeile(i + 1, t, wblock[i]) for i, t in enumerate(block)))
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
            o = gpt(PROMPT + zeile(1, t, wblock[i]))
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
            # 09.10.2026: beide markieren dasselbe Wort, aber nur EINES liefert eine (brauchbare) Korrektur → das andere bestätigt
            if not einig and gemeinsam:
                if okorr and bestaetigt("gemini", t, gemeinsam, okorr, wblock[i]):
                    korr, einig = okorr, True
                elif korr and bestaetigt("gpt", t, gemeinsam, korr, wblock[i]):
                    einig = True
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


def rueckstand():
    """--uneinig: Titel, die im Ledger als «uneinig» stehen und live unverändert sind, noch einmal prüfen (mit Bestätigung).
    Ledger-Status danach «korrigiert» oder «uneinig-2» (wird nicht ein drittes Mal gefragt). MAX (Std. 120) je Lauf."""
    mx = int(os.environ.get("MAX") or 120)
    zeilen = [l.rstrip("\n").split("\t") for l in open(LEDGER, encoding="utf-8") if l.count("\t") >= 2]
    letzter = {}
    for z in zeilen:
        letzter[z[0]] = z
    offen = [z for z in letzter.values() if z[1] == "uneinig"][:mx]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: Rückstand {sum(1 for z in letzter.values() if z[1] == 'uneinig')} uneinig · "
          f"diesmal {len(offen)} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    prod = []
    for z in offen:
        p = gql('query($i:ID!){product(id:$i){id title status descriptionHtml}}', {"i": z[0]})["product"]
        if p and p["status"] == "ACTIVE" and p["title"] == z[2]:
            prod.append(p)
    if not prod:
        print("FERTIG: 0"); return 0
    try:
        befunde = pruefen([p["title"] for p in prod], [ware(p.get("descriptionHtml")) for p in prod])
    except RuntimeError as e:
        print(f"PAUSE: kein Prüfer-Kontingent — {str(e)[:200]}"); return 0
    bef = {i: (f, k, ok_, e) for i, f, k, ok_, e in befunde}
    led = open(LEDGER, "a", encoding="utf-8"); geaendert = rest = 0
    for i, p in enumerate(prod):
        falsch, korr, okorr, einig = bef.get(i, (set(), "", "", False))
        if einig and SCHARF:
            r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{title} userErrors{message}}}',
                    {"i": {"id": p["id"], "title": korr}})["productUpdate"]
            if not r["userErrors"] and r["product"]["title"] == korr:
                geaendert += 1
                led.write(f"{p['id']}\tkorrigiert\t{p['title']}\t→ {korr}\t{','.join(sorted(falsch))}\n")
                print(f"  ✏️ {p['title']}  →  {korr}", flush=True); continue
        rest += 1
        if SCHARF:
            led.write(f"{p['id']}\t{'ok' if i not in bef else 'uneinig-2'}\t{p['title']}\t{korr or okorr}\t{','.join(sorted(falsch))}\n")
        if einig and not SCHARF:
            print(f"  (trocken) {p['title']}  →  {korr}", flush=True)
    led.flush()
    print(f"FERTIG Rückstand: {len(prod)} geprüft, {geaendert} korrigiert, {rest} bleiben", flush=True)
    return 0


def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    if "--uneinig" in sys.argv:
        return rueckstand()
    seit = (datetime.now(timezone.utc) - timedelta(hours=STUNDEN)).strftime("%Y-%m-%dT%H:%M:%SZ")
    fertig = {l.split("\t")[0] for l in open(LEDGER)} if os.path.exists(LEDGER) else set()
    prod, c = [], None
    while True:
        d = gql('query($c:String,$q:String!){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title status descriptionHtml}}}', {"c": c, "q": f"created_at:>='{seit}' AND status:active"})["products"]
        prod += [p for p in d["nodes"] if p["id"] not in fertig]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(prod)} neue aktive Titel seit {seit} · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    if not prod:
        print("FERTIG: 0 geprüft"); return 0
    try:
        befunde = pruefen([p["title"] for p in prod], [ware(p.get("descriptionHtml")) for p in prod])
    except RuntimeError as e:
        # 04.10.2026 22:50 gemessen: Gemini 402, ChatGPT leer, Groq qwen/gpt-oss-20b Tageslimit in BEIDEN Organisationen —
        # ohne zwei Modelle wird nichts geändert (Vier-Augen-Regel). Der Lauf endet sichtbar, nicht mit Traceback;
        # die Titel bleiben unquittiert und kommen beim nächsten Lauf (Kontingent-Reset) wieder dran.
        print(f"PAUSE {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: kein Prüfer-Kontingent — {str(e)[:200]}", flush=True)
        return 0
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
    print(f"FERTIG: {len(prod)} geprüft, {geaendert} korrigiert, {gemeldet} gemeldet · Erstprüfer {ERSTPRUEFER}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
