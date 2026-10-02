#!/usr/bin/env python3
"""seo_autopilot.py — täglich EIN Ratgeber-Artikel aus echter Schweizer Suchnachfrage (02.10.2026).

ANLASS: Betreiber «mach besser als soro» (Soro = KI-SEO-Autopilot: Keywords → Artikel → On-Page-SEO → Links → Bild →
täglich veröffentlichen; trysoro.com, Shopify-App). GEMESSEN 02.10. (ShopifyQL 90 T, human): 331 Blog-Artikel bringen
~45 Sitzungen und 0 Warenkörbe — der letzte neue Ratgeber ist vom 25.09. «Mehr Text» allein bringt hier nichts.

Was dieser Autopilot BESSER macht als ein generischer Content-Roboter:
  1. NACHFRAGE STATT RATEN: Google-Autovervollständigung mit gl=ch/hl=de für jede Menü-Kollektion — echte Suchphrasen der
     Schweiz («hundebett waschbar», «… orthopädisch»). Konkurrenz-/Ladennamen (Landi, Qualipet, Galaxus …) fliegen raus.
  2. NUR THEMEN MIT WARE: die Kollektion braucht ≥ 6 aktive, kaufbare Produkte mit Bild; jeder Artikel verlinkt genau diese
     Produkte mit LIVE-Preis — kein Artikel, der auf leere Regale führt.
  3. KEINE KANNIBALISIERUNG: Wortvergleich gegen alle bestehenden Artikel (Titel + Handle); zu ähnlich → kein neuer Artikel.
  4. FAKTEN-TOR: Gemini schreibt NUR aus den mitgegebenen Produktdaten; danach prüft der Zweitprüfer (ChatGPT, bei leerem
     Guthaben Groq — zweitmodell.py) jede Aussage gegen die Fakten. Dazu harte Regeln: keine Heilversprechen
     (heilversprechen_wache.MUSTER), Du-Form (Sie-Erkennung), «ss» statt «ß», keine Konkurrenznamen, jeder Preis und jeder
     Produktlink muss aus der Faktenliste stammen. Durchgefallen → eine Überarbeitung, sonst wird NICHT veröffentlicht.
  5. ANTWORTMASCHINEN: Kernaussagen oben, FAQ-Block mit FAQPage-JSON-LD (ChatGPT/Google-Antworten), sauberer SEO-Titel/-Text.
  6. ERFOLG MESSEN: `--messen` schreibt Sitzungen/Warenkörbe je Autopilot-Artikel nach dropship/SEO-AUTOPILOT.md; was nach
     28 Tagen nichts bringt, wird als «überarbeiten» markiert (nicht gelöscht).
Ledger dropship/_seo_autopilot.tsv (Datum, Handle, Phrase, Kollektion, Produkte). Eimer-Etikette nach jeder Antwort.

  python3 automation/seo_autopilot.py                 # Trockenlauf: Thema + Artikel bauen und prüfen, NICHT veröffentlichen
  SCHARF=1 python3 automation/seo_autopilot.py        # veröffentlicht höchstens 1 Artikel (MAX=n für mehr)
  python3 automation/seo_autopilot.py --messen        # Wirkung messen
  N=10 [SCHARF=1] python3 automation/seo_autopilot.py --auffrischen   # bestehende Artikel: Produktblock + FAQ/JSON-LD
  python3 automation/seo_autopilot.py --kanarienvogel # Prüfregeln testen (ohne Netz)
"""
import html as H, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf

SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX", "1"))
LEDGER = os.path.join(REPO, "dropship", "_seo_autopilot.tsv")
BERICHT = os.path.join(REPO, "dropship", "SEO-AUTOPILOT.md")
URL = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
BLOG = "gid://shopify/Blog/119864721793"          # Ratgeber
MIN_WARE = 6
PAUSE_TAGE = 60                                     # dieselbe Kollektion frühestens wieder nach 60 Tagen
KONKURRENZ = re.compile(r"\b(landi|qualipet|fressnapf|ikea|galaxus|digitec|brack|aldi|lidl|coop|migros|manor|jumbo|"
                        r"zalando|amazon|temu|shein|decathlon|otto|interdiscount|media ?markt|ochsner|dosenbach|"
                        r"zooplus|kaufland|ricardo|tutti|aliexpress|wish|h&m|hm|zara|primark|tchibo|dm|müller|"
                        r"bauhaus|hornbach|obi|do it|hellweg|ebay|action|pepco|nanu|nana|jysk|xxxlutz|pfister|conforama)\b", re.I)
SIE_MITTE = re.compile(r"(?<![.!?:;] )(?<![.!?:;])\b(?:Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b(?<!^Sie)")
ORT = re.compile(r"\b(bern|zürich|zuerich|basel|luzern|st\.? ?gallen|winterthur|lausanne|genf|lugano|biel|thun|aarau|zug|"
                 r"chur|schaffhausen|in der nähe|online|schweiz|ch|bestellen|outlet|second ?hand|gebraucht|occasion)\b", re.I)
INFO = re.compile(r"waschbar|orthopäd|test|vergleich|welche|wie |für |grösse|groesse|material|richtig|pflege|reinigen|"
                  r"tipps|ideen|unterschied|beste|outdoor|winter|herbst|weihnacht|klein|gross|xxl|damen|herren|kinder", re.I)
GUT = re.compile(r"waschbar|orthopäd|test|vergleich|welche|wie|kaufen|für |grösse|groesse|material|richtig|pflege|"
                 r"reinigen|tipps|ideen|unterschied|beste|günstig|outdoor|winter|herbst|weihnacht|klein|gross|xxl", re.I)


# ---------------------------------------------------------------- Werkzeuge
def gql(q, v=None):
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    letzter = ""
    for a in range(8):
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


def norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]+", " ", t)


STOP = set("der die das und oder mit fur fuer ein eine einen im in am an auf zu von so wie was welche welcher richtig "
           "ratgeber tipps ideen guide kaufen worauf es ankommt 2026 schweiz ch den dem des ist sind dein deine".split())


def woerter(t):
    return {w for w in norm(t).split() if len(w) > 2 and w not in STOP}


def vorschlaege(begriff):
    url = ("https://suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=ch&q="
           + urllib.parse.quote(begriff.strip() + " "))
    try:
        j = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20))
        return [s for s in j[1] if isinstance(s, str)]
    except Exception as e:
        print(f"  Vorschläge für «{begriff}» nicht lesbar: {type(e).__name__}", file=sys.stderr)
        return []


# ---------------------------------------------------------------- 1) Themen aus Nachfrage
def menue_kollektionen():
    F = "title url"
    d = gql('{menus(first:10){nodes{handle items{%s items{%s items{%s}}}}}}' % (F, F, F))
    m = [x for x in d["menus"]["nodes"] if x["handle"] == "main-menu"][0]
    out = []
    def lauf(items):
        for it in items:
            u = (it.get("url") or "").split("?")[0]
            if "/collections/" in u:
                h = u.rsplit("/collections/", 1)[1].strip("/")
                titel = re.sub(r"[^\w\s&'-]", "", it["title"]).strip()
                if h and titel and not re.search(r"sale|neu|alle|highlights|geschenk|merkliste", h + titel, re.I):
                    out.append((h, titel))
            lauf(it.get("items") or [])
    lauf(m["items"])
    seen, uniq = set(), []
    for h, t in out:
        if h not in seen:
            seen.add(h); uniq.append((h, t))
    return uniq


def ware(handle):
    d = gql('query($h:String!){collectionByHandle(handle:$h){id title products(first:40,sortKey:BEST_SELLING){nodes{'
            'handle title status totalInventory tracksInventory featuredMedia{preview{image{url}}} '
            'priceRangeV2{minVariantPrice{amount}} description(truncateAt:400) productType '
            'variants(first:1){nodes{availableForSale}}}}}}', {"h": handle})["collectionByHandle"]
    if not d:
        return None, []
    gut = []
    for p in d["products"]["nodes"]:
        if p["status"] != "ACTIVE" or not (p.get("featuredMedia") or {}).get("preview"):
            continue
        if not any(v["availableForSale"] for v in p["variants"]["nodes"]):
            continue
        gut.append({"handle": p["handle"], "titel": p["title"],
                    "preis": f"{float(p['priceRangeV2']['minVariantPrice']['amount']):.2f}",
                    "bild": p["featuredMedia"]["preview"]["image"]["url"],
                    "info": re.sub(r"\s+", " ", p.get("description") or "")[:300]})
        if len(gut) >= 8:
            break
    return d["title"], gut


def bestehende_artikel():
    out, c = [], None
    while True:
        d = gql('query($c:String){articles(first:250,after:$c){pageInfo{hasNextPage endCursor} nodes{title handle}}}', {"c": c})["articles"]
        out += [(a["title"], a["handle"]) for a in d["nodes"]]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        c = d["pageInfo"]["endCursor"]


def zu_aehnlich(phrase, bestehend):
    w = woerter(phrase)
    if not w:
        return None
    for t, h in bestehend:
        b = woerter(t) | woerter(h.replace("-", " "))
        if w and len(w & b) / len(w) >= 0.75:
            return t
    return None


def ledger():
    if not os.path.exists(LEDGER):
        return []
    return [l.rstrip("\n").split("\t") for l in open(LEDGER, encoding="utf-8") if l.strip() and not l.startswith("#")]


def themen(bestehend):
    jetzt = time.time()
    def alter(z):
        return (jetzt - time.mktime(time.strptime(z[0][:10], "%Y-%m-%d"))) / 86400
    # veröffentlicht → 60 Tage Pause; abgelehnt («-») → 7 Tage, dann neuer Versuch mit anderer Phrase
    kuerzlich = {z[3] for z in ledger() if len(z) > 3 and alter(z) < (7 if z[1] == "-" else PAUSE_TAGE)}
    for handle, titel in menue_kollektionen():
        if handle in kuerzlich:
            continue
        stamm = re.sub(r"\s*&.*$", "", titel).strip()
        kandidaten = []
        for s in vorschlaege(stamm) + vorschlaege(stamm + " kaufen"):
            if KONKURRENZ.search(s) or ORT.search(s) or not GUT.search(s) or len(s.split()) < 2:
                continue
            if zu_aehnlich(s, bestehend):
                continue
            kandidaten.append(s)
        kandidaten.sort(key=lambda x: (not INFO.search(x), len(x)))   # Ratgeber-Absicht zuerst
        if kandidaten and INFO.search(kandidaten[0]):
            yield handle, titel, kandidaten[:5]


# ---------------------------------------------------------------- 2) Schreiben
PROMPT = """Du schreibst für den Schweizer Onlineshop LuxeStyle (luxestyle.ch) einen Ratgeber-Artikel.
Suchanfrage aus der Schweiz (echte Google-Vorschläge): {phrasen}
Hauptthema: «{haupt}». Passende Kollektion im Shop: «{koll}» → Link /collections/{khandle}

FAKTEN — nur diese Produkte, Preise und Eigenschaften darfst du nennen (nichts dazuerfinden):
{fakten}

REGELN (hart):
- Schweizer Hochdeutsch: immer «ss», nie «ß». Du-Form («du», «dein»), nie «Sie». Preise als «CHF 49.90».
- Hilfreicher Ratgeber zuerst, Verkauf danach: erkläre, worauf man bei {haupt} achtet (Grösse, Material, Pflege, Einsatz …),
  allgemein gültiges Wissen ohne erfundene Zahlen, Tests, Studien, Auszeichnungen oder Kundenmeinungen.
- Allgemeinwissen nur, wenn es sicher stimmt (Polyester ist NICHT atmungsaktiv; im Zweifel weglassen).
- Keine Heilversprechen, keine medizinischen Aussagen, keine Konkurrenz- oder Ladennamen, kein «wir haben getestet».
- Produkte NUR mit Links aus der Faktenliste: <a href="/products/HANDLE">Titel</a> (CHF Preis). 3–6 davon sinnvoll einbauen.
- Aufbau: Einleitung (2–3 Sätze, Link zur Kollektion) · <h2>Das Wichtigste in Kürze</h2> mit <ul> (4–5 Punkte) ·
  3–5 <h2>-Abschnitte · <h2>Unsere Auswahl</h2> mit den Produkten · am Ende KEIN FAQ im Text (kommt separat).
- 700–1100 Wörter, nur HTML mit <p>, <h2>, <h3>, <ul>, <li>, <strong>, <a>.

Antworte NUR als JSON:
{{"titel": "<max 70 Zeichen, enthält das Hauptthema>", "handle": "<url-slug, nur a-z 0-9 und -, ohne Umlaute>",
  "seo_titel": "<max 60 Zeichen>", "seo_text": "<120–155 Zeichen>", "zusammenfassung": "<1–2 Sätze>",
  "html": "<Artikel>", "faq": [{{"frage": "...", "antwort": "<2–3 Sätze>"}}, … 4 Stück], "tags": ["…", "…"]}}"""

PRUEF = """Du bist ein strenger Faktenprüfer. Unten stehen FAKTEN (Produktdaten eines Shops) und ein ARTIKEL.
Finde jede Aussage im Artikel, die etwas Konkretes über die genannten PRODUKTE behauptet, das NICHT aus den Fakten
hervorgeht (erfundene Masse, Materialien, Funktionen, Testergebnisse, Auszeichnungen, Kundenmeinungen, Lieferzeiten,
Garantien), sowie Heilversprechen. Allgemeines Ratgeber-Wissen ist erlaubt — melde es aber, wenn es SACHLICH FALSCH ist
(z. B. «Polyester ist atmungsaktiv», falsche Pflegehinweise, falsche Normen).
FAKTEN:
{fakten}
ARTIKEL:
{text}
Antworte NUR als JSON: {{"probleme": ["<Zitat aus dem Artikel> — <warum>", …]}} (leere Liste, wenn alles belegt ist)."""


def fakten_text(produkte):
    return "\n".join(f"- {p['titel']} · CHF {p['preis']} · /products/{p['handle']} · {p['info']}" for p in produkte)


def text_aus(html):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", html or ""))).strip()


def regeln(art, produkte):
    """Harte Prüfungen ohne KI → Liste der Verstösse."""
    from heilversprechen_wache import MUSTER, FEHLALARM
    v = []
    alles = art.get("html", "") + " " + " ".join(f"{f.get('frage','')} {f.get('antwort','')}" for f in art.get("faq", []))
    t = text_aus(alles)
    if "ß" in alles:
        v.append("ß statt ss")
    m = MUSTER.search(t)
    if m and not FEHLALARM.search(t[max(0, m.start() - 80):m.end() + 80]):
        v.append(f"Heilversprechen: «{m.group(0)}»")
    # Höflichkeitsform nur MITTEN im Satz eindeutig («wählen Sie», «für Ihren Hund»); am Satzanfang ist «Sie ist …»
    # meist 3. Person (die Tasche) — 02.10. Trockenlauf: zweimal fälschlich abgelehnt.
    satz = text_aus(re.sub(r"</?(?:p|li|h2|h3|ul|ol|br)[^>]*>", " . ", alles))
    m = SIE_MITTE.search(satz)
    if m:
        v.append(f"Sie-Form: «…{satz[max(0, m.start() - 25):m.end() + 15]}…»")
    if len(re.findall(r"\b(?:du|dein\w*|dir|dich)\b", t, re.I)) < 3:
        v.append("keine Du-Form")
    k = KONKURRENZ.search(t)
    if k:
        v.append(f"Konkurrenzname: «{k.group(0)}»")
    erlaubt = {p["handle"] for p in produkte}
    for h in re.findall(r'href="/products/([^"?#]+)', alles):
        if h not in erlaubt:
            v.append(f"Produktlink nicht in den Fakten: {h}")
    preise = {p["preis"] for p in produkte}
    for pr in re.findall(r"CHF\s?(\d+(?:[.,]\d{2})?)", t):
        pr = pr.replace(",", ".")
        if "." not in pr:
            pr += ".00"
        if pr not in preise and float(pr) not in (45.0, 60.0):   # Gratisversand-/Einfuhrschwelle sind Shop-Fakten
            v.append(f"Preis nicht in den Fakten: CHF {pr}")
    links = len(set(re.findall(r'href="/products/([^"?#]+)', art.get("html", ""))))
    if links < 3:
        v.append(f"nur {links} Produktlinks (mind. 3)")
    worte = len(text_aus(art.get("html", "")).split())
    if worte < 550:
        v.append(f"zu kurz ({worte} Wörter)")
    if len(art.get("faq") or []) < 3:
        v.append("FAQ fehlt")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", art.get("handle", "")):
        v.append("Handle ungültig")
    return v


def schreiben(haupt, phrasen, koll, khandle, produkte, rueckmeldung=""):
    from titel_kauderwelsch_wache import gemini
    text = PROMPT.format(phrasen="; ".join(phrasen), haupt=haupt, koll=koll, khandle=khandle, fakten=fakten_text(produkte))
    if rueckmeldung:
        text += "\n\nÜBERARBEITE: Die vorige Fassung hatte diese Fehler — vermeide sie:\n" + rueckmeldung
    return gemini(text)


def faktenpruefung(art, produkte):
    import zweitmodell
    t = text_aus(art.get("html", "")) + " FAQ: " + " ".join(f"{f.get('frage','')} {f.get('antwort','')}" for f in art.get("faq", []))
    for a in range(5):   # Groq-Minutenkontingent teilt sich mit anderen Läufen → warten statt aufgeben
        try:
            r = zweitmodell.chat_json(PRUEF.format(fakten=fakten_text(produkte), text=t[:12000]))
            break
        except RuntimeError as e:
            if "429" not in str(e) or "Tageskontingent" in str(e) or a == 4:
                raise
            time.sleep(60 * (a + 1))
    return [str(x) for x in (r.get("probleme") or [])][:8], zweitmodell.LETZTES_MODELL


def body_bauen(art):
    return block_ersetzen(art["html"].strip(), MARKE_F, faq_html(art.get("faq") or []))


def veroeffentlichen(art, produkte):
    handle = art["handle"][:80]
    d = gql('mutation($a:ArticleCreateInput!){articleCreate(article:$a){article{id handle} userErrors{field message}}}', {"a": {
        "blogId": BLOG, "title": art["titel"][:120], "handle": handle, "body": body_bauen(art),
        "summary": f"<p>{H.escape(art.get('zusammenfassung', ''))}</p>", "author": {"name": "LuxeStyle Redaktion"},
        "tags": list(dict.fromkeys(["ratgeber", "seo-autopilot"] + [t.lower() for t in art.get("tags", [])][:5])),
        "isPublished": True, "image": {"url": produkte[0]["bild"], "altText": art["titel"][:120]},
        "metafields": [{"namespace": "global", "key": "title_tag", "type": "single_line_text_field", "value": art["seo_titel"][:70]},
                       {"namespace": "global", "key": "description_tag", "type": "single_line_text_field", "value": art["seo_text"][:160]}]}})
    r = d["articleCreate"]
    if r["userErrors"] or not r["article"]:
        raise RuntimeError(f"articleCreate: {r['userErrors']}")
    return r["article"]


# ---------------------------------------------------------------- 2b) Bestehende Artikel aufwerten (02.10.2026)
# GEMESSEN 02.10.: 320 veröffentlichte Artikel — 231 verlinken KEIN Produkt (nur eine Kollektion), nur 24 tragen FAQ-JSON-LD.
# Soro schreibt nur Neues; wer schon Seiten hat, gewinnt mehr, wenn jede bestehende Seite auf kaufbare Ware führt und
# Antwortmaschinen eine FAQ findet. Der Artikeltext selbst bleibt UNVERÄNDERT (bestehende Rankings nicht gefährden) —
# es kommen nur zwei markierte Blöcke dazu, die jeder Lauf ersetzt statt verdoppelt:
#   <!-- lx-produkte --> … <!-- /lx-produkte -->   3–4 kaufbare Produkte der verlinkten Kollektion, Live-Preis, alle 30 T neu
#   <!-- lx-faq --> … <!-- /lx-faq -->              FAQ + FAQPage-JSON-LD; Antworten NUR aus dem Artikeltext (Zweitprüfer prüft)
# Hat ein Artikel schon «Häufige Fragen» mit <h3>/<p>-Paaren, wird daraus nur das JSON-LD gebaut (kein neuer Text).
AUFFRISCH_LEDGER = os.path.join(REPO, "dropship", "_seo_auffrischen.tsv")
PRODUKT_TAGE = 30
MARKE_P = ("<!-- lx-produkte -->", "<!-- /lx-produkte -->")
MARKE_F = ("<!-- lx-faq -->", "<!-- /lx-faq -->")

FAQ_PROMPT = """Erstelle zu diesem Ratgeber-Artikel eines Schweizer Onlineshops 4 häufige Fragen mit Antworten.
REGELN: Jede Antwort (2–3 Sätze) darf NUR enthalten, was im ARTIKEL steht — nichts dazuerfinden. Schweizer Hochdeutsch («ss»,
nie «ß»), Du-Form, keine Heilversprechen, keine Ladennamen, keine Preise. Fragen so, wie Menschen sie bei Google stellen.
ARTIKEL «{titel}»:
{text}
Antworte NUR als JSON: {{"faq": [{{"frage": "...", "antwort": "..."}}, …]}}"""

FAQ_PRUEF = """Prüfe, ob jede ANTWORT vollständig durch den ARTIKEL gedeckt ist. Melde jede Antwort, die etwas behauptet, das NICHT im
Artikel steht, oder die sachlich falsch ist.
ARTIKEL:
{text}
FAQ:
{faq}
Antworte NUR als JSON: {{"probleme": ["<Frage> — <warum>", …]}} (leere Liste, wenn alles gedeckt ist)."""


def block_ersetzen(body, marke, inhalt):
    a, z = marke
    body = re.sub(re.escape(a) + r".*?" + re.escape(z), "", body, flags=re.S).rstrip()
    return body + ("\n" + a + "\n" + inhalt + "\n" + z if inhalt else "")


ALLGEMEIN = set("guide ratgeber tipps ideen anleitung uebungen wirkung mythen test vergleich kaufen richtig pflege reinigen "
                "trends basics welche worauf ankommt grosse kleine beste besten neue schweiz damen herren kinder frauen maenner "
                "geschenke geschenk ideen fuer was wie warum wann wirklich bringt sie bringen arten unterschied unterschiede "
                "praktisch modern stil stile jahr jahre 2025 2026 alltag reise uni haus zuhause winter sommer herbst "
                "schweizer swiss baumwolle leder holz seide edelstahl silber gold metall kunststoff ultimative".split())


SUCH_PROMPT = """Ein Ratgeber-Artikel eines Schweizer Onlineshops heisst: «{titel}».
Nenne 1–3 deutsche Suchwörter für die PRODUKTE, um die es im Artikel geht — so, wie sie in deutschen Produkttiteln stehen
(z. B. «Seidenkissenbezug», «Faszienrolle», «Diffuser»). Kein Material allein (Baumwolle, Leder), kein Land, kein Adjektiv.
Antworte NUR als JSON: {{"woerter": ["…"]}}"""


def ware_zum_thema(titel, handle):
    """Kaufbare Produkte zum Artikelthema, deren TITEL das Suchwort trägt — sonst [] (lieber kein Block als ein falscher).
    02.10.: erst «erste Kollektion» (Salzlampe → Quarzuhr), dann «längstes Titelwort» (Silk-Pillowcase → «Baumwolle»,
    Ätherische Öle → «Schweizer») — beides falsch. Jetzt nennt Gemini die Produkt-Suchwörter, der Titel-Test bleibt hart."""
    from titel_kauderwelsch_wache import gemini
    try:
        kandidaten = [w for w in (gemini(SUCH_PROMPT.format(titel=titel)).get("woerter") or []) if isinstance(w, str)]
    except RuntimeError:
        kandidaten = []
    for w in kandidaten[:3]:
        n = norm(w).replace(" ", "")
        if len(n) < 4 or n in ALLGEMEIN or KONKURRENZ.search(w):
            continue
        stamm = n[:-1] if n.endswith(("n", "s", "e")) and len(n) > 6 else n
        d = gql('query($q:String!){products(first:40,query:$q){nodes{handle title status featuredMedia{preview{image{url}}} '
                'priceRangeV2{minVariantPrice{amount}} variants(first:1){nodes{availableForSale}}}}}',
                {"q": f"status:active AND title:{stamm}*"})["products"]["nodes"]
        gut = []
        for p in d:
            if stamm not in norm(p["title"]).replace(" ", "") or not (p.get("featuredMedia") or {}).get("preview"):
                continue
            if not any(v["availableForSale"] for v in p["variants"]["nodes"]):
                continue
            gut.append({"handle": p["handle"], "titel": p["title"], "info": "", "bild": p["featuredMedia"]["preview"]["image"]["url"],
                        "preis": f"{float(p['priceRangeV2']['minVariantPrice']['amount']):.2f}"})
        if len(gut) >= 3:
            return w, gut[:4]
    return None, []

def produkt_block(produkte, khandle, ktitel):
    zeilen = "".join(f'<li><a href="/products/{p["handle"]}">{H.escape(p["titel"])}</a> – CHF {p["preis"]}</li>' for p in produkte[:4])
    return (f"<h2>Passend dazu im Shop</h2><ul>{zeilen}</ul>"
            f'<p><a href="/collections/{khandle}">Mehr dazu im Shop ansehen</a></p>')


def faq_html(faq):
    teile = ["<h2>Häufige Fragen</h2>"] + [f"<h3>{H.escape(f['frage'])}</h3><p>{H.escape(f['antwort'])}</p>" for f in faq]
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": f["frage"], "acceptedAnswer": {"@type": "Answer", "text": f["antwort"]}} for f in faq]}
    return "".join(teile) + '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>"


def faq_vorhanden(body):
    """Bestehende «Häufige Fragen»-Sektion → [(frage, antwort)] aus <h3>/<p>-Paaren (oder [] )."""
    m = re.search(r"<h2[^>]*>\s*(?:Häufige Fragen|FAQ)[^<]*</h2>(.*?)(?=<h2|$)", body, re.S | re.I)
    if not m:
        return []
    paare = re.findall(r"<h3[^>]*>(.*?)</h3>\s*<p[^>]*>(.*?)</p>", m.group(1), re.S)
    return [{"frage": text_aus(q), "antwort": text_aus(a)} for q, a in paare if text_aus(q) and text_aus(a)]


def faq_regeln(faq):
    from heilversprechen_wache import MUSTER, FEHLALARM
    t = " ".join(f"{f['frage']} {f['antwort']}" for f in faq)
    v = []
    if "ß" in t:
        v.append("ß")
    m = MUSTER.search(t)
    if m and not FEHLALARM.search(t[max(0, m.start() - 80):m.end() + 80]):
        v.append(f"Heilversprechen «{m.group(0)}»")
    if SIE_MITTE.search(" . ".join(f"{f['frage']} . {f['antwort']}" for f in faq)):
        v.append("Sie-Form")
    if KONKURRENZ.search(t):
        v.append("Konkurrenzname")
    if len(faq) < 3:
        v.append("zu wenige Fragen")
    return v


def faq_erzeugen(titel, text):
    from titel_kauderwelsch_wache import gemini
    import zweitmodell
    faq = [f for f in (gemini(FAQ_PROMPT.format(titel=titel, text=text[:9000])).get("faq") or [])
           if isinstance(f, dict) and f.get("frage") and f.get("antwort")][:5]
    v = faq_regeln(faq)
    if v:
        return None, "Regeln: " + ", ".join(v)
    for a in range(5):
        try:
            r = zweitmodell.chat_json(FAQ_PRUEF.format(text=text[:9000], faq=json.dumps(faq, ensure_ascii=False)))
            break
        except RuntimeError as e:
            if "429" not in str(e) or "Tageskontingent" in str(e) or a == 4:
                raise
            time.sleep(60 * (a + 1))
    probleme = [str(x) for x in (r.get("probleme") or [])]
    if probleme:
        # nur die belegten Fragen behalten — reicht es noch für 3, ist die FAQ brauchbar
        schlecht = {f["frage"] for f in faq if any(f["frage"][:40] in p for p in probleme)}
        faq = [f for f in faq if f["frage"] not in schlecht]
        if len(faq) < 3 or len(schlecht) < len(probleme):
            return None, f"Zweitprüfer ({zweitmodell.LETZTES_MODELL}): " + " | ".join(probleme)[:200]
    return faq, f"ok ({zweitmodell.LETZTES_MODELL})"


def auffrisch_ledger():
    d = {}
    if os.path.exists(AUFFRISCH_LEDGER):
        for l in open(AUFFRISCH_LEDGER, encoding="utf-8"):
            z = l.rstrip("\n").split("\t")
            if len(z) >= 3:
                d[z[0]] = z   # letzter Eintrag gewinnt
    return d


def besuche_je_artikel():
    try:
        d = gql('{ shopifyqlQuery(query: "FROM sessions SHOW sessions GROUP BY landing_page_path WHERE human_or_bot_session = '
                "'human' AND landing_page_path CONTAINS '/blogs/' SINCE -90d LIMIT 1000\") { tableData { rows } } }")["shopifyqlQuery"]
    except RuntimeError:
        return {}
    z = {}
    for r in (d.get("tableData") or {}).get("rows") or []:
        h = r["landing_page_path"].rstrip("/").rsplit("/", 1)[-1]
        z[h] = z.get(h, 0) + int(r["sessions"])
    return z


def auffrischen(n):
    led = auffrisch_ledger()
    besuche = besuche_je_artikel()
    arts, c = [], None
    while True:
        d = gql('query($c:String){articles(first:100,after:$c){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title body isPublished}}}', {"c": c})["articles"]
        arts += [a for a in d["nodes"] if a["isPublished"]]
        if not d["pageInfo"]["hasNextPage"]:
            break
        c = d["pageInfo"]["endCursor"]
    jetzt = time.time()

    def faellig(a):
        z = led.get(a["handle"])
        if not z:
            return True
        return z[2] in ("fehler", "teil") or (jetzt - time.mktime(time.strptime(z[1][:10], "%Y-%m-%d"))) / 86400 >= PRODUKT_TAGE
    nur = [h for h in os.environ.get("NUR", "").split(",") if h]
    kand = [a for a in arts if (a["handle"] in nur) if nur] or \
           [a for a in arts if not nur and faellig(a) and "/collections/" in (a["body"] or "")]
    kand.sort(key=lambda a: (-besuche.get(a["handle"], 0), MARKE_P[0] in (a["body"] or "")))   # Besuchte zuerst
    print(f"Auffrischen: {len(arts)} veröffentlichte, {len(kand)} fällig, bearbeite bis {n}", flush=True)
    ok = 0
    ohne_zweit = False
    for a in kand[:n]:
        body = a["body"] or ""
        roh = re.sub(re.escape(MARKE_P[0]) + r".*?" + re.escape(MARKE_P[1]), "", body, flags=re.S)
        roh = re.sub(re.escape(MARKE_F[0]) + r".*?" + re.escape(MARKE_F[1]), "", roh, flags=re.S)
        text = text_aus(roh)
        was = []
        # Produkte: nur solche, deren Titel das Kernwort des Artikels trägt (Relevanz vor Menge)
        wort, produkte = ware_zum_thema(a["title"], a["handle"])
        if not produkte and MARKE_P[0] in body:
            body = block_ersetzen(body, MARKE_P, "")          # alter, nicht mehr belegbarer Block raus
            was.append("produkte-entfernt")
        if produkte:
            kh = next((k for k in re.findall(r'/collections/([a-z0-9-]+)', roh) if k not in ("all", "frontpage")), "all")
            body = block_ersetzen(body, MARKE_P, produkt_block(produkte, kh, wort.capitalize()) if kh != "all" else
                                  produkt_block(produkte, "all", "Shop").split("<p><a href=\"/collections/all")[0])
            was.append(f"produkte:{wort}")
        # FAQ: vorhandene Sektion → nur JSON-LD; sonst neu aus dem Artikeltext (nicht doppelt, wenn Block schon steht)
        if "FAQPage" not in roh and MARKE_F[0] not in body:
            alt = faq_vorhanden(roh)
            if len(alt) >= 2:
                ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
                    {"@type": "Question", "name": f["frage"], "acceptedAnswer": {"@type": "Answer", "text": f["antwort"]}} for f in alt]}
                body = block_ersetzen(body, MARKE_F, '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>")
                was.append(f"ld-aus-vorhandener-faq:{len(alt)}")
            elif len(text.split()) >= 250:
                if ohne_zweit:
                    faq, grund = None, "Zweitprüfer heute leer"
                    was.append("faq-später")
                else:
                    try:
                        faq, grund = faq_erzeugen(a["title"], text)
                    except RuntimeError as e:   # Tageskontingent leer → Produktblöcke weiter, FAQ beim nächsten Lauf
                        print(f"  ⏸ Zweitprüfer nicht verfügbar ({str(e)[:100]}) — ab hier nur Produktblöcke", flush=True)
                        ohne_zweit, faq, grund = True, None, "Zweitprüfer leer"
                        was.append("faq-später")
                if faq:
                    body = block_ersetzen(body, MARKE_F, faq_html(faq))
                    was.append(f"faq:{len(faq)}")
                elif "faq-später" not in was:
                    was.append("faq-abgelehnt")
                    print(f"    FAQ abgelehnt: {grund}", flush=True)
        if body == (a["body"] or ""):
            print(f"  · {a['handle']}: nichts zu tun ({', '.join(was) or 'keine Ware/FAQ'})", flush=True)
            continue
        print(f"  {'✓' if SCHARF else '(trocken)'} {a['handle']} [{besuche.get(a['handle'], 0)} Besuche]: {', '.join(was)}", flush=True)
        if not SCHARF:
            open(f"/tmp/seo_auffrischen_{a['handle'][:40]}.html", "w").write(body)
            continue
        r = gql('mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a){article{body} userErrors{message}}}',
                {"id": a["id"], "a": {"body": body}})["articleUpdate"]
        status = "ok" if not r["userErrors"] and r["article"] and r["article"]["body"] == body else "fehler"   # Rücklesen
        if status == "ok" and "faq-später" in was:
            status = "teil"
        if r["userErrors"]:
            print(f"    ✗ {r['userErrors']}", flush=True)
        with open(AUFFRISCH_LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{a['handle']}\t{time.strftime('%Y-%m-%d')}\t{status}\t{','.join(was)}\n")
        ok += status in ("ok", "teil")
    print(f"FERTIG Auffrischen: {ok} aktualisiert", flush=True)
    return 0


# ---------------------------------------------------------------- 3) Messen
def messen():
    eintraege = [z for z in ledger() if len(z) > 2 and z[1] != "-"]
    if not eintraege:
        print("noch keine Autopilot-Artikel"); return 0
    d = gql('{ shopifyqlQuery(query: "FROM sessions SHOW sessions, sessions_with_cart_additions GROUP BY landing_page_path '
            "WHERE human_or_bot_session = 'human' AND landing_page_path CONTAINS '/blogs/ratgeber/' SINCE -90d LIMIT 1000\") "
            '{ parseErrors tableData { rows } } }')["shopifyqlQuery"]
    zahl = {}
    for r in (d.get("tableData") or {}).get("rows") or []:
        h = r["landing_page_path"].rstrip("/").rsplit("/", 1)[-1]
        s, w = zahl.get(h, (0, 0))
        zahl[h] = (s + int(r["sessions"]), w + int(r["sessions_with_cart_additions"]))
    zeilen = ["# SEO-Autopilot — Wirkung", "", f"Stand {time.strftime('%Y-%m-%d %H:%M')} UTC · Quelle ShopifyQL (human, 90 T)", "",
              "| Datum | Artikel | Phrase | Sitzungen | Warenkörbe | Urteil |", "|---|---|---|---|---|---|"]
    for z in eintraege:
        datum, handle, phrase = z[0], z[1], z[2]
        s, w = zahl.get(handle, (0, 0))
        alter = (time.time() - time.mktime(time.strptime(datum[:10], "%Y-%m-%d"))) / 86400
        urteil = "läuft" if s else ("überarbeiten" if alter >= 28 else f"zu jung ({alter:.0f} T)")
        zeilen.append(f"| {datum[:10]} | [{handle}](https://luxestyle.ch/blogs/ratgeber/{handle}) | {phrase} | {s} | {w} | {urteil} |")
    open(BERICHT, "w", encoding="utf-8").write("\n".join(zeilen) + "\n")
    print("\n".join(zeilen[-len(eintraege):]))
    return 0


# ---------------------------------------------------------------- Kanarienvögel (ohne Netz)
def kanarienvogel():
    p = [{"handle": "hundebett-a", "titel": "Hundebett A", "preis": "49.90", "bild": "", "info": ""},
         {"handle": "hundebett-b", "titel": "Hundebett B", "preis": "59.90", "bild": "", "info": ""},
         {"handle": "hundebett-c", "titel": "Hundebett C", "preis": "39.90", "bild": "", "info": ""}]
    lang = " ".join(["Ein waschbares Hundebett ist praktisch für dich und deinen Hund."] * 80)
    gut = {"handle": "hundebett-waschbar", "faq": [{"frage": "a", "antwort": "b"}] * 4,
           "html": f'<p>{lang}</p><p><a href="/products/hundebett-a">A</a> (CHF 49.90) <a href="/products/hundebett-b">B</a> '
                   f'(CHF 59.90) <a href="/products/hundebett-c">C</a> (CHF 39.90). Gratis Versand ab CHF 45.</p>'}
    faelle = [("sauber", gut, 0),
              ("ß", {**gut, "html": gut["html"] + "<p>Grösse und Maß</p>"}, 1),
              ("Heilversprechen", {**gut, "html": gut["html"] + "<p>Das Kissen lindert Rückenschmerzen sofort.</p>"}, 1),
              ("Sie-Form", {**gut, "html": gut["html"] + "<p>Wählen Sie die richtige Grösse.</p>"}, 1),
              ("fremder Link", {**gut, "html": gut["html"] + '<a href="/products/fremd">X</a>'}, 1),
              ("falscher Preis", {**gut, "html": gut["html"] + "<p>nur CHF 19.90</p>"}, 1),
              ("Konkurrenz", {**gut, "html": gut["html"] + "<p>günstiger als bei Qualipet</p>"}, 1)]
    ok = 0
    for name, art, soll in faelle:
        v = regeln(art, p)
        treffer = (len(v) > 0) == bool(soll)
        ok += treffer
        print(f"{'✓' if treffer else '✗'} {name}: {v}")
    vor = ["hundebett waschbar", "hundebett landi", "hundebett", "hundebett orthopädisch"]
    gefiltert = [s for s in vor if not KONKURRENZ.search(s) and GUT.search(s) and len(s.split()) >= 2]
    t = gefiltert == ["hundebett waschbar", "hundebett orthopädisch"]
    ok += t
    print(f"{'✓' if t else '✗'} Vorschlagsfilter: {gefiltert}")
    print(f"Kanarienvögel {ok}/{len(faelle) + 1}")
    return 0 if ok == len(faelle) + 1 else 1


# ---------------------------------------------------------------- Ablauf
def main():
    if "--kanarienvogel" in sys.argv:
        return kanarienvogel()
    if "--messen" in sys.argv:
        return messen()
    if "--auffrischen" in sys.argv:
        return auffrischen(int(os.environ.get("N", "10")))
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())} · {'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    bestehend = bestehende_artikel()
    print(f"{len(bestehend)} bestehende Artikel", flush=True)
    fertig = 0
    for khandle, ktitel, phrasen in themen(bestehend):
        koll, produkte = ware(khandle)
        if len(produkte) < MIN_WARE:
            print(f"  · {ktitel}: nur {len(produkte)} kaufbare Produkte — übersprungen", flush=True)
            continue
        haupt = phrasen[0]
        print(f"→ Thema «{haupt}» · Kollektion {khandle} · {len(produkte)} Produkte · Phrasen {phrasen}", flush=True)
        art, rueck, protokoll = None, "", []
        for runde in range(2):
            art = schreiben(haupt, phrasen, koll, khandle, produkte, rueck)
            v = regeln(art, produkte)
            probleme, modell = ([], "") if v else faktenpruefung(art, produkte)
            protokoll.append(f"Runde {runde + 1}: Regeln {v or 'ok'} · Faktenprüfung ({modell}) {probleme or 'ok'}")
            print("  " + protokoll[-1], flush=True)
            if not v and not probleme:
                break
            rueck = "\n".join(v + probleme)
            art = None
        if not art:
            print(f"  ✗ «{haupt}» nach 2 Runden nicht sauber — nicht veröffentlicht", flush=True)
            with open(LEDGER, "a", encoding="utf-8") as f:
                f.write(f"{time.strftime('%Y-%m-%d')}\t-\t{haupt}\t{khandle}\tabgelehnt: {rueck[:150].replace(chr(10), ' | ')}\n")
            continue
        if zu_aehnlich(art["titel"], bestehend):
            print(f"  · Titel «{art['titel']}» zu nah an «{zu_aehnlich(art['titel'], bestehend)}» — übersprungen", flush=True)
            continue
        print(f"  ✓ «{art['titel']}» /blogs/ratgeber/{art['handle']} · {len(text_aus(art['html']).split())} Wörter · FAQ {len(art['faq'])}", flush=True)
        if not SCHARF:
            open("/tmp/seo_autopilot_entwurf.json", "w").write(json.dumps(art, ensure_ascii=False, indent=1))
            print("  (trocken) Entwurf: /tmp/seo_autopilot_entwurf.json", flush=True)
            return 0
        a = veroeffentlichen(art, produkte)
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%d')}\t{a['handle']}\t{haupt}\t{khandle}\t{','.join(p['handle'] for p in produkte[:6])}\n")
        print(f"  ✅ veröffentlicht: https://luxestyle.ch/blogs/ratgeber/{a['handle']}", flush=True)
        bestehend.append((art["titel"], a["handle"]))
        fertig += 1
        if fertig >= MAX:
            break
    print(f"FERTIG: {fertig} veröffentlicht", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
