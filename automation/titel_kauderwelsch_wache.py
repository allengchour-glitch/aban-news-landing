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
  python3 automation/titel_kauderwelsch_wache.py --seo-nachziehen   # Trockenlauf; SCHARF=1 schreibt (Rückstand aus dem Ledger)
  python3 automation/titel_kauderwelsch_wache.py --seo-zaehlen      # Zeile «SEO-NACH-TITELKORREKTUR: n offen»

NACHTRAG 13.10.2026 (Kauf-Strecke Klasse 15): Die Wache korrigierte nur den Produkttitel — im Browser-Tab und im Google-
Eintrag stand weiter «Inflierbares Halloween Kostüm …» bzw. «Halloween Witch Hat Nachtlicht | LuxeStyle CH» (GEMESSEN 13.10.:
264 von 368 korrigierten Produkten trugen den SEO-Titel aus dem ALTEN Titel, 14 weitere ein gemeldetes falsches Wort; 32
Meta-Beschreibungen ein falsches Wort, 21 den alten Titel, 22 waren kürzer als 70 Zeichen). Jetzt: nach JEDER Titelkorrektur
seo.title neu nach der gemeinsamen Regel (seo_titel_grenze.seo_titel = seo_titel.mjs, ≤ 70 Zeichen), wenn er aus dem alten
Titel stammt oder ein falsches Wort trägt — bewusst abweichende SEO-Titel (Suchbegriff) bleiben. Meta: alter Titel → neuer
Titel; kürzer als 70 oder mit falschem Wort → aus dem Beschreibungstext (120–155 Zeichen, nie ein festes Datum). Handles nie.
Jeder SCHARF-Lauf zieht am Ende den Rückstand aus dem Ledger nach (auch «hand-korrigiert»). Rückweg: dropship/_titel_kauderwelsch_seo.tsv.
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


# ── SEO nach Titelkorrektur (13.10.2026, Kauf-Strecke Klasse 15) ─────────────────────────────────────────────────────────
from seo_titel_grenze import seo_titel as _seo_titel, formen as _formen, kuerzen as _kuerzen
SEO_LEDGER = os.path.join(REPO, "dropship", "_titel_kauderwelsch_seo.tsv")
AUSNAHMEN = {"gid://shopify/Product/15422934647169"}     # Abendkleid «Aurora» = Google-Ads-Testprodukt, nie im Massenlauf
DATUM = re.compile(r"\b\d{1,2}\.\s?\d{1,2}\.|\b(?:Januar|Februar|März|April|Juni|Juli|August|September|Oktober|November|Dezember)\b"
                   r"|\b20\d\d\b", re.I)


def _worte(s):
    return {norm(x) for x in re.split(r"[\s\-–·|,/()«»:;.!?\u2011]+", s or "") if norm(x)}


def _kern(st):
    return re.sub(r"\s*\|\s*LuxeStyle(?: CH)?\s*$", "", st or "").strip()


def meta_aus_text(titel, html, falsch=frozenset()):
    """Meta-Beschreibung 120–155 Zeichen: «Titel: erster Satz. zweiter Satz …» aus dem Beschreibungstext (ohne Trust-Kasten).
    Steht danach ein falsches Wort oder ein Datum drin, oder bleibt sie unter 120: sachliche Ersatzform aus dem Titel."""
    titel = re.sub(r"\s+", " ", titel or "").strip().rstrip(" .")
    meta = titel + ":"
    for satz in re.split(r"(?<=[.!?])\s+", ware(html, 700)):
        satz = satz.strip()
        if not satz:
            continue
        if len(f"{meta} {satz}") <= 155:
            meta = f"{meta} {satz}"
            continue
        if len(meta) < 120:                                   # nächsten Satz an einer Wortgrenze anschneiden
            stueck = satz[:155 - len(meta) - 3].rsplit(" ", 1)[0].rstrip(" ,;:–-")
            if len(stueck) > 15:
                meta = f"{meta} {stueck} …"
        break
    if 120 <= len(meta) <= 160 and not DATUM.search(meta) and not (_worte(meta) & set(falsch)):
        return meta
    ersatz = f"{titel} – bei LuxeStyle Schweiz."
    for teil in (" Lieferung in die ganze Schweiz und nach Liechtenstein.", " Bezahlen mit TWINT, Karte oder Klarna."):
        if len(ersatz + teil) <= 155:
            ersatz += teil
    return ersatz if not (_worte(ersatz) & set(falsch)) else None


def seo_vorschlag(alt_titel, titel, seo, html, falsch=()):
    """None = nichts zu tun, sonst {'title', 'description'} (beide Felder, Lehre 30.09.)."""
    seo = seo or {}
    st, sd = seo.get("title") or "", seo.get("description") or ""
    fw = {norm(w) for x in falsch for w in str(x).split() if norm(w)}
    n_st = st
    if st and st not in _formen(titel):
        k, a = _kern(st), (alt_titel or "").strip()
        aus_alt = bool(a) and (k == a or (len(k) >= 20 and a.startswith(k)) or k.startswith(a[:max(20, len(a) - 5)]))
        if aus_alt or (_worte(st) & fw):
            n_st = _seo_titel(titel)
    n_sd = sd
    # nur ganze Vorkommen: alter Titel «… Taillenb» steckt in «… Taillenbund» (13.10. einmal zu «Taillenbundund» geworden)
    alt_rx = re.compile(re.escape(alt_titel or "") + r"(?![A-Za-zÄÖÜäöüß])") if alt_titel else None
    if sd and alt_rx and alt_rx.search(sd) and alt_titel != titel:
        n_sd = _kuerzen(alt_rx.sub(lambda m: titel, sd), 155)
    if n_sd and (len(n_sd) < 70 or (_worte(n_sd) & fw)):
        n_sd = meta_aus_text(titel, html, fw) or n_sd
    if (n_st, n_sd) == (st, sd):
        return None
    return {"title": n_st, "description": n_sd}


def seo_schreiben(p, neu, grund):
    """p: {id, handle, seo}; schreibt beide SEO-Felder, liest zurück, Ledger mit Altwerten."""
    r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{seo{title description}} userErrors{message}}}',
            {"p": {"id": p["id"], "seo": neu}})["productUpdate"]
    g = (r.get("product") or {}).get("seo") or {}
    ok = not r.get("userErrors") and (g.get("description") or "") == (neu["description"] or "") and \
        ((g.get("title") or "") == (neu["title"] or "") or g.get("title") is None)
    with open(SEO_LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), p["id"], p.get("handle") or "", grund,
                           json.dumps(p.get("seo") or {}, ensure_ascii=False), json.dumps(neu, ensure_ascii=False),
                           "ok" if ok else f"FEHLER {str(r.get('userErrors'))[:80]}"]) + "\n")
    return ok


def seo_nach_titel(pid, alt_titel, falsch=()):
    """Direkt nach einer Titelkorrektur: live lesen (Titel kann inzwischen anders sein), Vorschlag, schreiben."""
    if pid in AUSNAHMEN:
        return "ausnahme"
    p = gql('query($i:ID!){product(id:$i){id handle title seo{title description} descriptionHtml}}', {"i": pid})["product"]
    if not p:
        return "weg"
    neu = seo_vorschlag(alt_titel, p["title"], p.get("seo"), p.get("descriptionHtml"), falsch)
    if not neu:
        return "ok"
    if not SCHARF:
        print(f"    (trocken) SEO {p['handle'][:45]}: {neu}", flush=True)
        return "trocken"
    gut = seo_schreiben(p, neu, "nach-titelkorrektur")
    print(f"    {'🔎' if gut else '⛔'} SEO {neu['title']}", flush=True)
    return "geschrieben" if gut else "fehler"


def seo_rueckstand(nur_zaehlen=False):
    """Alle Ledger-Produkte, deren letzter Stand «korrigiert»/«hand-korrigiert» ist: SEO nachziehen (bzw. zählen)."""
    if not os.path.exists(LEDGER):
        return 0
    letzter = {}
    for l in open(LEDGER, encoding="utf-8"):
        z = l.rstrip("\n").split("\t")
        if len(z) >= 3:
            letzter[z[0]] = z
    faelle = [z for z in letzter.values() if z[1] in ("korrigiert", "hand-korrigiert") and z[0] not in AUSNAHMEN]
    offen = {"titel": 0, "meta": 0}
    geschrieben = fehler = 0
    for i in range(0, len(faelle), 50):
        block = faelle[i:i + 50]
        nodes = gql('query($i:[ID!]!){nodes(ids:$i){... on Product{id handle title status seo{title description} descriptionHtml}}}',
                    {"i": [z[0] for z in block]})["nodes"]
        live = {n["id"]: n for n in nodes if n}
        for z in block:
            p = live.get(z[0])
            if not p or p["status"] != "ACTIVE":
                continue
            falsch = z[4].split(",") if z[1] == "korrigiert" and len(z) > 4 else []
            neu = seo_vorschlag(z[2], p["title"], p.get("seo"), p.get("descriptionHtml"), falsch)
            if not neu:
                continue
            alt = p.get("seo") or {}
            offen["titel"] += neu["title"] != (alt.get("title") or "")
            offen["meta"] += neu["description"] != (alt.get("description") or "")
            if nur_zaehlen:
                continue
            if not SCHARF:
                print(f"  (trocken) {p['handle'][:50]:50} T: {(alt.get('title') or '')[:45]!r} → {neu['title']!r}"
                      + (f"\n{'':63}M: {neu['description']!r}" if neu["description"] != (alt.get("description") or "") else ""), flush=True)
                continue
            if seo_schreiben(p, neu, "rueckstand"):
                geschrieben += 1
            else:
                fehler += 1
    n = offen["titel"] + offen["meta"]
    print(f"SEO-NACH-TITELKORREKTUR: {len(faelle)} korrigierte im Ledger · {'offen' if (nur_zaehlen or not SCHARF) else 'nachgezogen'} "
          f"SEO-Titel {offen['titel']}, Meta {offen['meta']}" + (f" · geschrieben {geschrieben}, Fehler {fehler}" if SCHARF and not nur_zaehlen else ""),
          flush=True)
    return n


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


def seo_test():
    """Kanarien für seo_vorschlag/meta_aus_text — ohne Netz."""
    html = ("<p>Für ausgelassene Partys und Bühnenauftritte. Das Kostüm besteht aus 210T Polyester und passt Personen mit einer "
            "Körpergrösse von 150–190 cm. Es kommt in einer Einheitsgrösse.</p><h3>Das zeichnet es aus</h3><ul><li>x</li></ul>")
    faelle = [
        # (alt_titel, titel, seo, falsch, soll_titel, meta_pruefung)
        ("Inflierbares Halloween Kostüm für zwei Personen", "Aufblasbares Halloween-Kostüm für zwei Personen",
         {"title": "Inflierbares Halloween Kostüm für zwei Personen | LuxeStyle", "description": "Für ausgelassene Partys und Bühnenauftritte."},
         ["Inflierbares"], "Aufblasbares Halloween-Kostüm für zwei Personen | LuxeStyle CH", lambda m: 120 <= len(m) <= 160 and "Inflier" not in m),
        ("Halloween Witch Hat Nachtlicht", "Halloween Hexenhut Nachtlicht",
         {"title": "Halloween Witch Hat Nachtlicht | LuxeStyle CH", "description": "Für eine stimmungsvolle Dekoration an Halloween oder als Geschenk für besondere Anlässe. Resin."},
         ["hat", "witch"], "Halloween Hexenhut Nachtlicht | LuxeStyle CH", lambda m: m.startswith("Für eine stimmungsvolle")),
        # bewusst abweichender SEO-Titel (Suchbegriff) bleibt; «hat» als Teil von «Schatulle» ist kein falsches Wort
        ("Memory-Pilz Kissen für Nackenstütze", "Kopfkissen aus Memory-Schaum mit Armauflagen, Schmetterlingsform",
         {"title": "Kopfkissen aus Memory-Schaum mit Armauflagen | LuxeStyle", "description": "Ergonomisches Kopfkissen für Rücken- und Seitenschläfer mit Armauflagen – bei LuxeStyle Schweiz bestellen."},
         ["pilz"], "Kopfkissen aus Memory-Schaum mit Armauflagen | LuxeStyle", lambda m: m.startswith("Ergonomisches")),
        ("Schmuck Schatulle Witch", "Schmuck-Schatulle mit Hexen-Motiv",
         {"title": "Schmuckschatulle aus Holz kaufen | LuxeStyle", "description": "Schmuckschatulle aus Holz mit Spiegel und Fächern für Ringe, Ketten und Ohrringe – Lieferung in die ganze Schweiz."},
         ["hat"], "Schmuckschatulle aus Holz kaufen | LuxeStyle", lambda m: m.startswith("Schmuckschatulle")),
    ]
    f = 0
    for alt, t, seo, falsch, soll_t, m_ok in faelle:
        v = seo_vorschlag(alt, t, seo, html, falsch) or {"title": seo["title"], "description": seo["description"]}
        gut = v["title"] == soll_t and len(v["title"]) <= 70 and m_ok(v["description"])
        f += not gut
        print(f"{'✓' if gut else '✗'} {t[:50]:50} → {v['title']!r} | {v['description'][:70]!r} ({len(v['description'])})")
    v = seo_vorschlag("Patchwork Kleid mit hohem Taillenb", "Patchwork Kleid mit hohem Taillenbund",
                      {"title": "", "description": "Für den Arbeitsweg bietet das Patchwork Kleid mit hohem Taillenbund einen eleganten Look. Pflegeleicht bei 30 °C."},
                      "", [])
    gut = v is None
    f += not gut
    print(f"{'✓' if gut else '✗'} abgeschnittener Alttitel als Präfix des neuen Titels: Meta bleibt ({v})")
    m = meta_aus_text("Halloween-Glasbecher", "<p>Am 31.10. ein Hit. Für festliche Getränke.</p>")
    gut = m is not None and not DATUM.search(m)
    f += not gut
    print(f"{'✓' if gut else '✗'} Datum bleibt draussen: {m!r}")
    print(f"SEO-Kanarien {6 - f}/6")
    return 0 if not f else 1


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
                print(f"  ✏️ {p['title']}  →  {korr}", flush=True)
                seo_nach_titel(p["id"], p["title"], falsch)        # 13.10.2026: SEO-Titel/Meta mitziehen
                continue
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
    if "--seo-nachziehen" in sys.argv:
        seo_rueckstand(); return 0
    if "--seo-zaehlen" in sys.argv:
        seo_rueckstand(nur_zaehlen=True); return 0
    if "--seo-test" in sys.argv:
        return seo_test()
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
        print("FERTIG: 0 geprüft")
        if SCHARF:
            try:
                seo_rueckstand()
            except Exception as e:
                print(f"SEO-NACH-TITELKORREKTUR: unklar ({type(e).__name__}: {str(e)[:120]})", flush=True)
        return 0
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
                seo_nach_titel(p["id"], p["title"], falsch)        # 13.10.2026: SEO-Titel/Meta mitziehen
                continue
        gemeldet += 1
        art = "einig-trocken" if einig else "uneinig"
        if SCHARF:
            led.write(f"{p['id']}\t{art}\t{p['title']}\t{korr or okorr}\t{','.join(sorted(falsch))}\n")
        print(f"  ⚠️ {art}: {p['title']}  (G: {korr or '—'} | GPT: {okorr or '—'})", flush=True)
    led.flush()
    print(f"FERTIG: {len(prod)} geprüft, {geaendert} korrigiert, {gemeldet} gemeldet · Erstprüfer {ERSTPRUEFER}", flush=True)
    if SCHARF:                                  # 13.10.2026: Rückstand SEO (auch Titel, die andere Werkzeuge korrigiert haben)
        try:
            seo_rueckstand()
        except Exception as e:
            print(f"SEO-NACH-TITELKORREKTUR: unklar ({type(e).__name__}: {str(e)[:120]})", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
