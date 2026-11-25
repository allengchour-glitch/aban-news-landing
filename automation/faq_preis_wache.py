#!/usr/bin/env python3
"""faq_preis_wache.py — prüft die Preisangaben in den Kollektions-Blöcken «Häufige Fragen» (25.11.2026). NUR LESEND.

ANLASS: Seit 25.11. tragen 12 Kollektionen (Plan `dropship/chatgpt-antworten-2511/PLAN.md`) am Ende von descriptionHtml
einen Block «<h2>Häufige Fragen</h2>…» mit gemessenen Preisen, z. B. «Ab CHF 19.90 bis CHF 118.90, der mittlere
Einstiegspreis liegt bei CHF 39.40.». Preise und Sortiment ändern sich täglich — ChatGPT zitiert diese Sätze wörtlich.
Hausregel 05.10.: jede behobene Klasse = Regel + Wächter. Dieser Wächter meldet, wenn eine Angabe nicht mehr stimmt.

Welche Kollektionen: Schlüssel aus dropship/chatgpt-antworten-2511/vorher.json und (falls vorhanden) vorher-runde2.json,
dazu `--handles a,b`. Kollektion ohne Block → «ohne Block» (eigene Zeile, keine Abweichung: kein Block = keine falsche
Preisangabe; fehlt die Kollektion ganz, steht das ebenfalls dort).

Ist-Werte = aktive Produkte der Kollektion (status ACTIVE und im Onlineshop veröffentlicht, wie im Plan gemessen;
liefert die API die Veröffentlichung nicht, zählt ACTIVE allein):
  ab     = kleinster Einstiegspreis (minVariantPrice)
  bis    = teuerste Variante (maxVariantPrice) — so sind die Blöcke geschrieben (Plan: «max = teuerste Variante»;
           mit dem höchsten Einstiegspreis hiesse `gliederarmbaender` 97.90 statt 125.90 = Fehlalarm)
  Median = Median der Einstiegspreise (gerade Anzahl: Mittel der beiden mittleren, auf Rappen gerundet)

Befund, wenn
  1. ab-, bis- oder Median-Preis um MEHR als 10 % abweicht (genau 10 % ist noch kein Befund),
  2. weniger als 10 aktive Produkte,
  3. der Block eine datumsgebundene Frist trägt («bis Mitte November», «bis Ende Oktober», «bis zum 15.», «bis 15.12.»,
     «bis Weihnachten»; NICHT «10–20 Werktage», «S bis XL», «Montag bis Freitag», «No 7 bis No 13»),
  4. der Block Versand erwähnt, aber «CHF 50» oder «Rabatt» fehlt — oder ein Gratisversand-Satz eine andere Schwelle
     als CHF 50 nennt (Klasse 22.10./25.11.: der Gratisversand-Wächter drehte 50 → 45),
  5. Mengen-/Anteilsaussagen nicht mehr stimmen: «(fast) alle … starten unter CHF X» (alle = 100 %, fast alle ≥ 80 %,
     die meisten > 50 %), «diesen Wert erreichen die meisten Modelle», «Bei N von M Modellen … höchstens CHF X»
     (Anteil ± 10 Prozentpunkte), «Über N Artikel»,
  6. der Block eine Preisfrage hat, aber kein Muster greift («Preisangabe unlesbar» — umformuliert, Wächter blind).
Preise in den Preis-Antworten, die nur ein Teilsortiment betreffen («Tassen ab CHF 22.90»), sind nicht prüfbar und
stehen als `teilpreise_ungeprueft` im Stand; Preise ausserhalb der Preisfrage («Gliederkette … ab CHF 22.90») ebenso.

  python3 automation/faq_preis_wache.py                 # prüfen, letzte Zeile «FAQ-PREISE: n Blöcke · k Abweichungen»
  python3 automation/faq_preis_wache.py --liste         # alle Befunde zeilenweise
  python3 automation/faq_preis_wache.py --handles a,b   # weitere Kollektionen dazunehmen
  python3 automation/faq_preis_wache.py --selbsttest    # reine Funktionen, ohne Netz; Exit 0/1

Stand: dropship/_faq_preis_stand.json (Zeitpunkt UTC, je Handle Soll/Ist/Befunde; ab/bis/Median als «CHF x», «grenze» und
`teilpreise_ungeprueft` in Rappen; nicht genannte Werte = null). Exit 0 = gelesen (auch mit
Abweichungen), 2 = unklar (Netz/Zeitlimit — letzte Zeile «FAQ-PREISE: unklar …», nie «0 Abweichungen»).
Netz: 3 Versuche je Abfrage (Pause 5/15 s), Timeout 60 s; ganzer Lauf höchstens 7,5 Minuten.
Endpunkt und Zugang wie `seo_autopilot.gql` (URL von dort, Token aus SHOPIFY_ADMIN_TOKEN bzw. /tmp/cj_shop_token.txt,
Eimer-Etikette `nachlauf`) — eigene Schleife, weil gql 8 Versuche macht (bis ~10 min je Abfrage) und das Zeitlimit sprengt.
"""
import html as H, json, os, re, signal, sys, time, urllib.request
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
QUELLEN = [os.path.join(REPO, "dropship", "chatgpt-antworten-2511", "vorher.json"),
           os.path.join(REPO, "dropship", "chatgpt-antworten-2511", "vorher-runde2.json")]
STAND = os.path.join(REPO, "dropship", "_faq_preis_stand.json")
ONLINESHOP = "gid://shopify/Publication/301970915713"
TOLERANZ_PROZENT = 10
MIN_AKTIV = 10
FAST_ALLE = 0.80          # «fast alle»  = mindestens 80 %
MEISTEN = 0.50            # «die meisten» = mehr als 50 %
ANTEIL_PP = 0.10          # «Bei N von M …»: Anteil darf um höchstens 10 Prozentpunkte abweichen
GRATIS_SCHWELLE = 5000    # Rappen
VERSAND_PREIS = 700
LAUF_MAX_S = 450          # 7,5 min, Rest bleibt für Ausgabe/Schreiben
VERSUCHE = 3
PAUSEN = (5, 15)

# ---------------------------------------------------------------- Muster (an den 12 Live-Blöcken vom 25.11. ausgerichtet)
ZAHL = r"(\d{1,3}(?:['’ ]\d{3})+|\d+)(?:[.,](\d{1,2}|–|-)(?!\d))?"
BETRAG = re.compile(r"(?:CHF|Fr\.)\s*" + ZAHL)
N = r"(?:CHF|Fr\.)\s*" + ZAHL                       # zwei Gruppen je Betrag
FAQ_H2 = re.compile(r"<h2[^>]*>\s*(?:<[^>]+>\s*)*H(?:ä|&auml;|a)ufige\s+Fragen\s*(?:<[^>]+>\s*)*</h2>", re.I)
H3 = re.compile(r"<h3[^>]*>(.*?)</h3>", re.I | re.S)
PREISFRAGE = re.compile(r"\bwas\s+kost|\bwie\s+teuer|\bpreis", re.I)
VERSANDSATZ = re.compile(r"versand|bestellwert|liefer", re.I)
SATZ = re.compile(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ„«(])")
P_ZWISCHEN = re.compile(r"\b(?:zwischen|von)\s+" + N + r"\s+(?:und|bis)\s+" + N, re.I)
P_AB = re.compile(r"\bab\s+" + N, re.I)
P_BIS = re.compile(r"\bbis\s+(?:zu\s+)?" + N, re.I)
P_HOECHSTENS = re.compile(r"\bh[öo]chstens\s+" + N, re.I)
P_ANTEIL = re.compile(r"\bbei\s+(\d+)\s+von\s+(\d+)\b[^.]*?\bh[öo]chstens\s+" + N, re.I)
P_MEDIAN = [re.compile(r"\bmittlere[rn]?\s+(?:Einstiegs)?preis\w*\s+(?:liegt\s+)?(?:bei|um)\s+(?:rund\s+|etwa\s+|ca\.\s+)?" + N, re.I),
            re.compile(r"\bMedian\w*\s+(?:\w+\s+){0,3}?(?:bei|um|von)?\s*" + N, re.I),
            re.compile(r"\b(?:meist|typischerweise|im\s+Schnitt|durchschnittlich|in\s+der\s+Regel)\s+(?:um|bei|rund|etwa)?\s*" + N, re.I),
            re.compile(r"\b(?:um|rund|etwa|ca\.)\s+" + N, re.I)]
P_UNTER = re.compile(r"\b(fast\s+alle|alle|die\s+meisten)\b(?:\s+[\wÄÖÜäöüß-]+){0,2}?\s+(?:starten|beginnen|kosten)\s+"
                     r"(?:schon\s+)?unter\s+" + N, re.I)
P_ERREICHEN = re.compile(r"\berreichen\s+(fast\s+alle|alle|die\s+meisten)\b", re.I)
P_UEBER = re.compile(r"\b[Üü]ber\s+(\d{1,3}(?:['’]\d{3})*|\d+)\s+(?:Artikel|Produkte|Modelle|Stücke|Sets)\b")
MONAT = (r"(?:(?:Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b"
         r"|(?:Jan|Feb|Mär|Apr|Jun|Jul|Aug|Sept?|Okt|Nov|Dez)\b\.?)")
FRIST = [re.compile(r"\bbis\s+(?:spätestens\s+|zum\s+|am\s+|ende\s+|mitte\s+|anfang\s+|vor\s+)*(?:\d{1,2}\.\s*)?" + MONAT, re.I),
         re.compile(r"\bbis\s+(?:spätestens\s+)?(?:zum|am)\s+\d{1,2}\.", re.I),
         re.compile(r"\bbis\s+(?:spätestens\s+)?(?:0?[1-9]|[12]\d|3[01])\.\s?(?:0?[1-9]|1[0-2])\.", re.I),
         re.compile(r"\bbis\s+(?:spätestens\s+)?(?:zum\s+|vor\s+)?(?:Weihnachten|Heiligabend|Silvester|Neujahr|Ostern|"
                    r"Valentinstag|Muttertag|Black\s*Friday|Cyber\s*Monday)\b", re.I)]
CHF50 = re.compile(r"CHF\s*50(?:[.,]00?|[.,]–|[.,]-)?(?![\d.,]*\d)")


# ---------------------------------------------------------------- reine Funktionen
def rappen(ganz, rest=None):
    """'1'299', '00' → 129900; '14', '9' → 1490; '7', None → 700; '14', '–' → 1400."""
    g = int(re.sub(r"['’ ]", "", ganz))
    if not rest or rest in "–-":
        return g * 100
    return g * 100 + int(rest.ljust(2, "0"))


def betrag(s):
    """erster CHF-Betrag in s in Rappen, sonst None."""
    m = BETRAG.search(s)
    return rappen(m.group(1), m.group(2)) if m else None


def chf(c):
    if c is None:
        return "–"
    s = f"{c // 100:,}".replace(",", "'")
    return f"CHF {s}.{c % 100:02d}"


def text(fragment):
    t = re.sub(r"<[^>]+>", " ", fragment or "")
    t = H.unescape(t).replace("\xa0", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", t).strip()


def faq_block(html):
    """HTML ab <h2>Häufige Fragen</h2> bis zur nächsten <h2> (oder Ende); None ohne Block."""
    if not html:
        return None
    m = FAQ_H2.search(html)
    if not m:
        return None
    rest = html[m.end():]
    n = re.search(r"<h2[\s>]", rest, re.I)
    return rest[:n.start()] if n else rest


def fragen(block):
    """[(Frage, Antworttext)] aus dem Block."""
    teile = list(H3.finditer(block or ""))
    aus = []
    for i, m in enumerate(teile):
        ende = teile[i + 1].start() if i + 1 < len(teile) else len(block)
        aus.append((text(m.group(1)), text(block[m.end():ende])))
    return aus


def saetze(t):
    return [s for s in SATZ.split(t or "") if s.strip()]


def median_rappen(werte):
    w = sorted(werte)
    if not w:
        return None
    k = len(w) // 2
    if len(w) % 2:
        return w[k]
    return (w[k - 1] + w[k] + 1) // 2           # Mittel der beiden mittleren, halbe Rappen aufgerundet


def abweichend(soll, ist, prozent=TOLERANZ_PROZENT):
    """True, wenn ist um MEHR als prozent % von soll abweicht (ganzzahlig, genau 10 % = False)."""
    if soll is None or ist is None:
        return False
    if soll == 0:
        return ist != 0
    return abs(ist - soll) * 100 > prozent * soll


def preis_angaben(block):
    """Liest alle prüfbaren Aussagen aus einem FAQ-Block (HTML). Reine Funktion."""
    qa = fragen(block)
    preis_qa = [a for f, a in qa if PREISFRAGE.search(f)]
    gesamt = " ".join(a for _, a in qa) if qa else text(block)
    quelle = preis_qa or ([gesamt] if gesamt else [])
    ab, bis, med, teil, anteil = [], [], [], [], []
    for antwort in quelle:
        for s in saetze(antwort):
            if VERSANDSATZ.search(s):
                continue
            belegt = []
            for m in P_ANTEIL.finditer(s):
                anteil.append({"n": int(m.group(1)), "m": int(m.group(2)), "grenze": rappen(m.group(3), m.group(4))})
                belegt.append(m.span())
            for m in P_ZWISCHEN.finditer(s):
                ab.append(rappen(m.group(1), m.group(2))); bis.append(rappen(m.group(3), m.group(4)))
                belegt.append(m.span())
            frei = lambda m: not any(a <= m.start() < b for a, b in belegt)
            for m in P_AB.finditer(s):
                if frei(m):
                    ab.append(rappen(m.group(1), m.group(2)))
            for m in P_BIS.finditer(s):
                if frei(m):
                    bis.append(rappen(m.group(1), m.group(2)))
            for m in P_HOECHSTENS.finditer(s):
                if frei(m):
                    bis.append(rappen(m.group(1), m.group(2)))
            for muster in P_MEDIAN:
                treffer = [m for m in muster.finditer(s) if frei(m)]
                if treffer:
                    med.append(rappen(treffer[0].group(1), treffer[0].group(2)))
                    break
    if len(ab) > 1:
        teil = sorted(ab)[1:]
    unter, erreichen, ueber = [], [], []
    for s in saetze(gesamt):
        for m in P_UNTER.finditer(s):
            unter.append({"wer": re.sub(r"\s+", " ", m.group(1).lower()), "grenze": rappen(m.group(2), m.group(3)),
                          "satz": m.group(0)})
        m = P_ERREICHEN.search(s)
        b = BETRAG.search(s)
        if m and b:
            erreichen.append({"wer": re.sub(r"\s+", " ", m.group(1).lower()), "grenze": rappen(b.group(1), b.group(2))})
        for m in P_UEBER.finditer(s):
            ueber.append(int(re.sub(r"['’]", "", m.group(1))))
    ausserhalb = []
    for f, a in qa:
        if PREISFRAGE.search(f):
            continue
        for s in saetze(a):
            if not VERSANDSATZ.search(s):
                ausserhalb += [rappen(m.group(1), m.group(2)) for m in BETRAG.finditer(s)]
    return {"preisfrage": bool(preis_qa), "ab": min(ab) if ab else None, "bis": max(bis) if bis else None,
            "median": med[0] if med else None, "teilpreise_ungeprueft": teil + ausserhalb,
            "anteil": anteil, "unter": unter, "erreichen": erreichen, "ueber": ueber,
            "_ab_liste": ab, "_bis_liste": bis}


def fristen(t):
    """datumsgebundene Fristen im Text (Liste der Fundstellen)."""
    aus = []
    for m in FRIST:
        aus += [x.group(0) for x in m.finditer(t or "")]
    return sorted(set(aus))


def versand_befunde(t):
    """Versandsatz prüfen: erwähnt der Block Versand, müssen «CHF 50» und «Rabatt» drinstehen;
    ein Gratisversand-Satz darf keine andere Schwelle als CHF 50 nennen."""
    aus = []
    if not re.search(r"versand", t or "", re.I):
        return aus
    fehlt = [w for w, ok in (("CHF 50", CHF50.search(t)), ("Rabatt", re.search(r"rabatt", t, re.I))) if not ok]
    if fehlt:
        aus.append(("Versandsatz", "CHF 50 + Rabatt", "ohne " + " + ".join(f"«{w}»" for w in fehlt)))
    for s in saetze(t):
        if re.search(r"gratis|kostenlos|versandfrei", s, re.I) and re.search(r"versand", s, re.I):
            for m in BETRAG.finditer(s):
                c = rappen(m.group(1), m.group(2))
                if c not in (GRATIS_SCHWELLE, VERSAND_PREIS):
                    aus.append(("Gratisversand-Schwelle", chf(GRATIS_SCHWELLE), chf(c)))
    return aus


def ist_werte(produkte):
    """produkte: [(minVariantPrice_rappen, maxVariantPrice_rappen)] der aktiven Produkte."""
    mins = [a for a, _ in produkte]; maxs = [b for _, b in produkte]
    return {"n": len(produkte), "ab": min(mins) if mins else None, "bis": max(maxs) if maxs else None,
            "bis_einstieg": max(mins) if mins else None, "median": median_rappen(mins), "_mins": mins, "_maxs": maxs}


def _anteil(werte, bedingung):
    return (sum(1 for w in werte if bedingung(w)) / len(werte)) if werte else 0.0


def _pz(x):
    return f"{round(x * 100)} %"


def bewerte(soll, ist, blocktext):
    """Befunde als [(was, soll, ist)] — reine Funktion."""
    b = []
    for schluessel, name in (("ab", "ab-Preis"), ("bis", "bis-Preis"), ("median", "Median")):
        if abweichend(soll.get(schluessel), ist.get(schluessel)):
            b.append((name, chf(soll[schluessel]), chf(ist[schluessel])))
    if ist["n"] < MIN_AKTIV:
        b.append(("aktive Produkte", f"≥ {MIN_AKTIV}", str(ist["n"])))
    mins, maxs = ist["_mins"], ist["_maxs"]
    for u in soll.get("unter", []):
        a = _anteil(mins, lambda w: w < u["grenze"])
        schwelle = {"alle": 1.0, "fast alle": FAST_ALLE}.get(u["wer"])
        zu_wenig = (a < schwelle) if schwelle is not None else (a <= MEISTEN)
        if zu_wenig:
            ziel = "100 %" if u["wer"] == "alle" else (f"≥ {_pz(FAST_ALLE)}" if u["wer"] == "fast alle" else f"> {_pz(MEISTEN)}")
            b.append((f"«{u['wer']} … unter {chf(u['grenze'])}»", ziel, _pz(a)))
    for e in soll.get("erreichen", []):
        a = _anteil(mins, lambda w: w >= e["grenze"])
        schwelle = {"alle": 1.0, "fast alle": FAST_ALLE}.get(e["wer"])
        zu_wenig = (a < schwelle) if schwelle is not None else (a <= MEISTEN)
        if zu_wenig:
            ziel = "100 %" if e["wer"] == "alle" else (f"≥ {_pz(FAST_ALLE)}" if e["wer"] == "fast alle" else f"> {_pz(MEISTEN)}")
            b.append((f"«{e['wer']} erreichen {chf(e['grenze'])}»", ziel, _pz(a)))
    for a in soll.get("anteil", []):
        k = sum(1 for w in maxs if w <= a["grenze"])
        ist_a = k / ist["n"] if ist["n"] else 0.0
        if abs(ist_a - a["n"] / a["m"]) > ANTEIL_PP + 1e-9 or abweichend(a["m"], ist["n"]):
            b.append((f"Anteil höchstens {chf(a['grenze'])}", f"{a['n']}/{a['m']}", f"{k}/{ist['n']}"))
    for z in soll.get("ueber", []):
        if ist["n"] <= z:
            b.append((f"«über {z} Artikel»", f"> {z}", str(ist["n"])))
    for f in fristen(blocktext):
        b.append(("Frist", "keine", f"«{f}»"))
    b += versand_befunde(blocktext)
    if soll.get("preisfrage") and soll.get("ab") is None and soll.get("bis") is None and soll.get("median") is None:
        b.append(("Preisangabe", "lesbar", "kein Muster"))
    return b


def zeile(handle, befund):
    was, s, i = befund
    return f"{handle}: {was} ({s} → {i})"


def schlusszeile(n_bloecke, befunde_zeilen):
    z = f"FAQ-PREISE: {n_bloecke} Blöcke · {len(befunde_zeilen)} Abweichungen"
    if befunde_zeilen:
        z += " ⚠️ " + " · ".join(befunde_zeilen[:3])
    return z


# ---------------------------------------------------------------- Netz (lesend)
def _abfrage(q, v=None):
    sys.path.insert(0, HIER)
    from seo_autopilot import URL          # derselbe Endpunkt wie seo_autopilot.gql
    from eimer_etikette import nachlauf
    tok = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or open("/tmp/cj_shop_token.txt").read()).strip()
    letzter = ""
    for a in range(VERSUCHE):
        try:
            r = urllib.request.Request(URL, data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            j = json.load(urllib.request.urlopen(r, timeout=60))
            nachlauf(j)
            if j.get("data") is not None and not j.get("errors"):
                return j["data"]
            letzter = json.dumps(j.get("errors"))[:200]
        except Exception as e:  # Netz, Timeout, JSON
            letzter = f"{type(e).__name__}: {str(e)[:150]}"
        if a < VERSUCHE - 1:
            time.sleep(PAUSEN[min(a, len(PAUSEN) - 1)])
    raise RuntimeError(letzter)


Q = """query($h:String!,$a:String){collectionByHandle(handle:$h){id handle descriptionHtml
products(first:250,after:$a){pageInfo{hasNextPage endCursor}
nodes{status onl:publishedOnPublication(publicationId:"%s")
priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}}}}}""" % ONLINESHOP


def lies_kollektion(handle):
    a, html, ps, gefunden = None, None, [], False
    while True:
        c = _abfrage(Q, {"h": handle, "a": a})["collectionByHandle"]
        if not c:
            return None, []
        gefunden = True
        if html is None:
            html = c.get("descriptionHtml") or ""
        ps += c["products"]["nodes"]
        if not c["products"]["pageInfo"]["hasNextPage"]:
            break
        a = c["products"]["pageInfo"]["endCursor"]
    return (html if gefunden else None), ps


def zu_rappen(x):
    return int(round(float(x) * 100))


def handles_laden(extra):
    hs = []
    for p in QUELLEN:
        if os.path.exists(p):
            with open(p) as f:
                d = json.load(f)
            hs += [h for h in (d if isinstance(d, dict) else {}) if h not in hs]
    hs += [h.strip() for h in extra if h.strip() and h.strip() not in hs]
    return hs


def _chf_oder_none(c):
    return chf(c) if c is not None else None


def _ohne_privat(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}


def lauf(handles, liste=False):
    start = time.time()
    signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(TimeoutError("Zeitlimit")))
    signal.alarm(LAUF_MAX_S + 20)
    stand = {"zeit": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "toleranz_prozent": TOLERANZ_PROZENT,
             "min_aktiv": MIN_AKTIV, "kollektionen": {}, "ohne_block": []}
    alle_zeilen, n_bloecke, geprueft = [], 0, 0
    try:
        for h in handles:
            if time.time() - start > LAUF_MAX_S:
                raise TimeoutError(f"Zeitlimit nach {geprueft} von {len(handles)} Kollektionen")
            html, ps = lies_kollektion(h)
            geprueft += 1
            if html is None:
                stand["ohne_block"].append(h)
                stand["kollektionen"][h] = {"block": False, "grund": "Kollektion nicht gefunden"}
                continue
            block = faq_block(html)
            if block is None:
                stand["ohne_block"].append(h)
                stand["kollektionen"][h] = {"block": False, "grund": "kein «Häufige Fragen»"}
                continue
            n_bloecke += 1
            aktiv = [p for p in ps if p.get("status") == "ACTIVE"]
            online = [p for p in aktiv if p.get("onl")]
            basis = online if any(p.get("onl") is not None for p in aktiv) else aktiv
            ist = ist_werte([(zu_rappen(p["priceRangeV2"]["minVariantPrice"]["amount"]),
                              zu_rappen(p["priceRangeV2"]["maxVariantPrice"]["amount"])) for p in basis])
            soll = preis_angaben(block)
            befunde = bewerte(soll, ist, text(block))
            zeilen = [zeile(h, b) for b in befunde]
            alle_zeilen += zeilen
            stand["kollektionen"][h] = {
                "block": True,
                "soll": {k: (_chf_oder_none(v) if k in ("ab", "bis", "median") else v) for k, v in _ohne_privat(soll).items()},
                "ist": {"produkte": len(ps), "aktiv": len(aktiv), "aktiv_onlineshop": len(online),
                        "ab": _chf_oder_none(ist["ab"]), "bis": _chf_oder_none(ist["bis"]),
                        "bis_einstieg": _chf_oder_none(ist["bis_einstieg"]), "median": _chf_oder_none(ist["median"])},
                "befunde": zeilen}
            if liste:
                print(f"{h}: {ist['n']} aktiv · ab {chf(ist['ab'])} · bis {chf(ist['bis'])} · Median {chf(ist['median'])}"
                      f" — Block: ab {chf(soll['ab'])} · bis {chf(soll['bis'])} · Median {chf(soll['median'])}"
                      f" · {len(zeilen)} Befund(e)")
                for z in zeilen:
                    print("  " + z)
    except Exception as e:
        signal.alarm(0)
        stand["fehler"] = f"{type(e).__name__}: {str(e)[:200]}"
        stand["geprueft"] = geprueft
        _schreibe(stand)
        print(f"FAQ-PREISE: unklar ({type(e).__name__}: {str(e)[:120]}; {geprueft} von {len(handles)} gelesen)")
        return 2
    signal.alarm(0)
    stand.update({"bloecke": n_bloecke, "abweichungen": len(alle_zeilen), "geprueft": geprueft,
                  "dauer_s": round(time.time() - start, 1)})
    _schreibe(stand)
    if stand["ohne_block"]:
        print("ohne Block: " + ", ".join(stand["ohne_block"]))
    print(schlusszeile(n_bloecke, alle_zeilen))
    return 0


def _schreibe(stand):
    tmp = STAND + ".tmp"
    with open(tmp, "w") as f:
        json.dump(stand, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)


# ---------------------------------------------------------------- Selbsttest (ohne Netz)
ECHT = {
    # wörtlich aus den Live-Blöcken vom 25.11.2026
    "damen": ("<h2>Häufige Fragen</h2><h3>Was kostet eine Fell- oder Plüschjacke?</h3><p>Die Jacken und Mäntel dieser "
              "Auswahl kosten ab CHF 14.90 bis CHF 140.90, der mittlere Einstiegspreis liegt bei CHF 31.40. Der Versand "
              "in die Schweiz kostet CHF 7 und ist ab CHF 50 Bestellwert nach Abzug von Rabatten gratis.</p>"
              "<h3>Wie lange dauert die Lieferung?</h3><p>In die Schweiz rechnest du im Direktversand mit 10–20 "
              "Werktagen, nach Liechtenstein mit 15–45 Tagen. Massgeblich ist das Lieferdatum auf der Produktseite.</p>"),
    "pyjama": ("<h2>Häufige Fragen</h2><h3>Kann ich für jedes Familienmitglied die Grösse einzeln wählen?</h3><p>Ja, du "
               "bestellst jeden Pyjama einzeln und wählst Ausführung und Grösse, zum Beispiel Mama, Papa, Kinder oder "
               "Baby. Für Erwachsene gibt es fast alle Modelle in S bis XL, viele auch bis 3XL.</p><h3>Was kostet ein "
               "Weihnachtspyjama?</h3><p>Ab CHF 14.90 je Pyjama. Bei 29 von 30 Modellen kostet auch die teuerste "
               "Ausführung höchstens CHF 29.90. Ab CHF 50 Bestellwert nach Abzug von Rabatten ist der Versand in die "
               "Schweiz gratis, darunter kostet er CHF 7.</p><h3>Kommt der Pyjama noch vor Weihnachten an?</h3><p>"
               "Zusichern können wir das nicht: Im Direktversand rechnest du mit 10–20 Werktagen (Montag bis Freitag) in "
               "die Schweiz und 15–45 Tagen nach Liechtenstein.</p>"),
    "selbst": ("<h2>Häufige Fragen</h2><h3>Was kosten selbst gestaltete Artikel?</h3><p>Magnete gibt es ab CHF 16.90, "
               "Tassen ab CHF 22.90, Handyhüllen ab CHF 23.90, T-Shirts ab CHF 24.90, Sweatshirts ab CHF 39.90 und den "
               "Bio-Hoodie ab CHF 75.90. Der genaue Preis hängt von Grösse und Ausführung ab. Bezahlen kannst du mit "
               "TWINT, Klarna (Kauf auf Rechnung), Karte, PayPal oder Apple Pay.</p>"),
    "glieder": ("<h2>Häufige Fragen</h2><h3>Welche Armbandlänge brauche ich?</h3><p>Die Armbänder gibt es je nach Modell "
                "in Längen von etwa 6 bis 9 Zoll (rund 15 bis 23 cm), häufig als 7 Zoll (18 cm) oder 8 Zoll (20 cm).</p>"
                "<h3>Was kostet ein Armband?</h3><p>Ab CHF 15.90, der mittlere Einstiegspreis liegt bei CHF 22.90, und "
                "fast alle Modelle starten unter CHF 50. Die Moissanit-Tennisarmbänder kosten je nach Ausführung bis "
                "CHF 125.90.</p>"),
    "zirkonia": ("<h2>Häufige Fragen</h2><h3>Welche Kettenlänge kann ich wählen?</h3><p>Bei einigen Modellen wählst du "
                 "die Länge, zum Beispiel 40 oder 45 cm. Die kubanische Gliederkette mit Strass ab CHF 22.90 gibt es in "
                 "20, 45, 50 oder 60 cm.</p><h3>Was kostet eine Zirkonia-Kette?</h3><p>Ab CHF 14.90 bis CHF 78.90, der "
                 "mittlere Einstiegspreis liegt bei CHF 15.90, und fast alle Ketten starten unter CHF 50. Der Versand in "
                 "die Schweiz kostet CHF 7 und ist ab CHF 50 Bestellwert nach Abzug von Rabatten gratis.</p>"),
    "weihnachten": ("<h2>Häufige Fragen</h2><h3>Was findest du in der Weihnachtsauswahl?</h3><p>Über 300 Artikel: Deko "
                    "wie Christbaumkugeln, Girlanden und Lichter, dazu Weihnachtspullover und -pyjamas.</p><h3>Was kosten "
                    "die Artikel?</h3><p>Ab CHF 14.90 bis CHF 75.90, der mittlere Einstiegspreis liegt bei CHF 19.40. Fast "
                    "alle Artikel starten unter CHF 50.</p><h3>Bis wann muss ich bestellen, damit es vor Weihnachten "
                    "ankommt?</h3><p>Ein festes Datum sichern wir nicht zu: Im Direktversand rechnest du mit 10–20 "
                    "Werktagen in die Schweiz und 15–45 Tagen nach Liechtenstein, ab Schweizer Lager meist mit 2–3 "
                    "Werktagen.</p><h3>Ab wann ist der Versand gratis?</h3><p>Ab CHF 50 Bestellwert nach Abzug von "
                    "Rabatten ist der Standardversand in die Schweiz gratis, darunter kostet er CHF 7. Nach Liechtenstein "
                    "kostet der Versand CHF 14.90.</p>"),
    "futter": ("<h2>Häufige Fragen</h2><h3>Was kostet ein Futterautomat?</h3><p>Ab CHF 28.90 bis CHF 139.90, der mittlere "
               "Einstiegspreis liegt bei CHF 74.40. Ab CHF 50 Bestellwert nach Abzug von Rabatten ist der Versand in die "
               "Schweiz gratis, und diesen Wert erreichen die meisten Modelle schon allein.</p>"),
    "tier": ("<h2>Häufige Fragen</h2><h3>Was kostet ein Hundepullover?</h3><p>Ab CHF 14.90, der mittlere Einstiegspreis "
             "liegt bei CHF 16.90, und alle Modelle starten unter CHF 50. Ab CHF 50 Bestellwert nach Abzug von Rabatten "
             "ist der Versand in die Schweiz gratis, darunter kostet er CHF 7.</p>"),
    "punk": ("<h3>Welche Ringgrösse und Armbandlänge kann ich wählen?</h3><p>Ringe gibt es meist in den Grössen No 7 bis "
             "No 13. Armbänder gibt es je nach Modell in Längen von etwa 15 bis 24,5 cm, meist zwischen 18 und 23 cm.</p>"),
}


def _ist(mins, maxs=None):
    maxs = maxs or mins
    return ist_werte(list(zip(mins, maxs)))


def selbsttest():
    faelle = []

    def fall(name, ok):
        faelle.append((name, bool(ok)))

    # Beträge
    fall("Betrag 1'299.00", betrag("bis CHF 1'299.00") == 129900)
    fall("Betrag 1’299.00 (typogr.)", betrag("CHF 1’299.00") == 129900)
    fall("Betrag 14,90 (Komma)", betrag("ab CHF 14,90") == 1490)
    fall("Betrag CHF 7 ganz", betrag("kostet CHF 7 und") == 700)
    fall("Betrag Satzende CHF 14.90.", betrag("bei CHF 14.90.") == 1490)
    fall("Betrag CHF 50.– ", betrag("ab CHF 50.– gratis") == 5000)
    # Block finden
    fall("Block gefunden", faq_block("<p>Text</p>\n<h2>Häufige Fragen</h2><h3>F</h3><p>A</p>") is not None)
    fall("ohne Block = None", faq_block("<p>Nur Text, keine Fragen.</p><h2>Über uns</h2>") is None)
    fall("Block mit &auml;", faq_block("<h2>H&auml;ufige Fragen</h2><h3>F</h3>") is not None)
    fall("Block endet an nächster h2", "Andere" not in faq_block("<h2>Häufige Fragen</h2><h3>F</h3><p>A</p><h2>Andere</h2>"))
    # Parser an echten Sätzen
    d = preis_angaben(faq_block(ECHT["damen"]))
    fall("echt damen: ab/bis/Median", (d["ab"], d["bis"], d["median"]) == (1490, 14090, 3140))
    p = preis_angaben(faq_block(ECHT["pyjama"]))
    fall("echt pyjama: Versandsatz «Ab CHF 50 Bestellwert» kein ab-Preis", p["_ab_liste"] == [1490])
    fall("echt pyjama: «Bei 29 von 30 … höchstens CHF 29.90»", p["anteil"] == [{"n": 29, "m": 30, "grenze": 2990}])
    fall("echt pyjama: höchstens im Anteil-Satz ist kein bis-Preis", p["bis"] is None)
    s = preis_angaben(faq_block(ECHT["selbst"]))
    fall("echt selbst-gestalten: ab = kleinster, 5 Teilpreise", s["ab"] == 1690 and len(s["teilpreise_ungeprueft"]) == 5)
    g = preis_angaben(faq_block(ECHT["glieder"]))
    fall("echt glieder: ab/bis/Median + «fast alle unter 50»",
         (g["ab"], g["bis"], g["median"]) == (1590, 12590, 2290) and g["unter"][0]["wer"] == "fast alle"
         and g["unter"][0]["grenze"] == 5000)
    fall("echt glieder: «6 bis 9 Zoll», «rund 15» kein Preis", g["median"] == 2290)
    z = preis_angaben(faq_block(ECHT["zirkonia"]))
    fall("echt zirkonia: Gliederkette ab 22.90 ausserhalb Preisfrage", z["ab"] == 1490 and 2290 in z["teilpreise_ungeprueft"])
    w = preis_angaben(faq_block(ECHT["weihnachten"]))
    fall("echt weihnachten: «Über 300 Artikel» + «Fast alle … unter»", w["ueber"] == [300] and w["unter"][0]["wer"] == "fast alle")
    f = preis_angaben(faq_block(ECHT["futter"]))
    fall("echt futter: «erreichen die meisten» mit CHF 50", f["erreichen"] == [{"wer": "die meisten", "grenze": 5000}])
    t = preis_angaben(faq_block(ECHT["tier"]))
    fall("echt tier: «alle Modelle starten unter CHF 50»", t["unter"][0]["wer"] == "alle" and t["median"] == 1690)
    x = preis_angaben("<h3>Was kostet das?</h3><p>Die Modelle kosten zwischen CHF 19.90 und CHF 1'299.00, meist um CHF 49.90.</p>")
    fall("zwischen/und + «meist um»", (x["ab"], x["bis"], x["median"]) == (1990, 129900, 4990))
    y = preis_angaben("<h3>Was kostet ein Set?</h3><p>Ab CHF 9,90; ein typisches Set liegt um CHF 25.</p>")
    fall("Komma-Preis + «um CHF 25» als Median", (y["ab"], y["median"]) == (990, 2500))
    # Median
    fall("Median ungerade", median_rappen([300, 100, 200]) == 200)
    fall("Median gerade (Mittel)", median_rappen([1490, 1690]) == 1590)
    fall("Median halbe Rappen aufrunden", median_rappen([100, 101]) == 101)
    # Toleranz
    fall("genau 10 % = kein Befund", not abweichend(1000, 1100) and not abweichend(1000, 900))
    fall("10,1 % = Befund", abweichend(1000, 1101) and abweichend(1000, 899))
    fall("echt trinkbrunnen 19.90/118.90/39.40 → 0 Befunde",
         bewerte({"ab": 1990, "bis": 11890, "median": 3940}, _ist([1990] + [3940] * 9 + [11490], [1990] + [3940] * 9 + [11890]),
                 "Ab CHF 19.90 bis CHF 118.90") == [])
    fall("bis = teuerste Variante, nicht höchster Einstiegspreis (echt glieder 97.90 / 125.90)",
         not any(x[0] == "bis-Preis" for x in bewerte({"bis": 12590}, _ist([1590] * 10 + [9790], [1590] * 10 + [12590]), "")))
    b = bewerte({"ab": 1990, "bis": 11890, "median": 3940}, _ist([1990] * 3 + [4990] * 9, [1990] * 3 + [4990] * 8 + [11890]), "")
    fall("Median 39.40 → 49.90 = Befund", [x[0] for x in b] == ["Median"])
    # Mindestanzahl
    fall("9 aktive = Befund", any(x[0] == "aktive Produkte" for x in bewerte({}, _ist([1490] * 9), "")))
    fall("10 aktive = kein Befund", not any(x[0] == "aktive Produkte" for x in bewerte({}, _ist([1490] * 10), "")))
    # Mengen-/Anteilsaussagen
    fall("«alle unter 50» hält", not any("unter" in x[0] for x in bewerte(t, _ist([1490] * 9 + [2990]), "")))
    fall("«alle unter 50», eines 55.90 = Befund", any("alle" in x[0] for x in bewerte(t, _ist([1490] * 10 + [5590]), "")))
    fall("«fast alle» 80 % hält, 70 % nicht",
         not any("fast alle" in x[0] for x in bewerte(g, _ist([1590] * 8 + [6000] * 2, [1590] * 7 + [12590] * 3), ""))
         and any("fast alle" in x[0] for x in bewerte(g, _ist([1590] * 7 + [6000] * 3, [12590] * 10), "")))
    fall("«die meisten erreichen 50» 24 % darunter hält, 60 % darunter nicht",
         not any("erreichen" in x[0] for x in bewerte(f, _ist([2890] * 24 + [7440] * 76), ""))
         and any("erreichen" in x[0] for x in bewerte(f, _ist([2890] * 60 + [7440] * 40), "")))
    fall("Anteil 29/30 hält, 20/30 nicht",
         not any("Anteil" in x[0] for x in bewerte(p, _ist([1490] * 30, [2990] * 29 + [15590]), ""))
         and any("Anteil" in x[0] for x in bewerte(p, _ist([1490] * 30, [2990] * 20 + [15590] * 10), "")))
    fall("«über 300» bei 310 hält, bei 290 nicht",
         not any("über" in x[0] for x in bewerte(w, _ist([1490] * 310), ""))
         and any("über" in x[0] for x in bewerte(w, _ist([1490] * 290), "")))
    # Fristen
    fall("Frist «bis Mitte November» trifft (echter Altsatz weihnachtspyjama-familie vor 25.11.)",
         fristen("Wer sicher vor Weihnachten liefern lassen will, bestellt am besten bis Mitte November. Rückgabe "
                 "innerhalb von 30 Tagen") == ["bis Mitte November"])
    fall("Frist «bis Nov.» (Abkürzung) trifft", fristen("bestellen bis 20. Nov. 2026") == ["bis 20. Nov."])
    fall("Frist «bis Ende Oktober»/«bis zum 15.»/«bis 15.12.» treffen",
         len(fristen("bis Ende Oktober")) == 1 and len(fristen("bis zum 15. bestellen")) == 1
         and len(fristen("bis 15.12. bestellen")) == 1 and len(fristen("bis spätestens 1. Dezember")) == 1)
    fall("Frist «bis Weihnachten» trifft", len(fristen("Lieferung bis Weihnachten")) == 1)
    fall("keine Frist: «10–20 Werktage», «S bis XL», «Montag bis Freitag», «bis 6XL», «No 7 bis No 13»",
         fristen("10–20 Werktage, S bis XL, bis 3XL, Montag bis Freitag, bis 6XL, No 7 bis No 13, 15 bis 24,5 cm, "
                 "bis CHF 140.90, bis 4 Liter, bis 14.90.") == [])
    fall("echte Blöcke ohne Frist (pyjama, weihnachten, punk)",
         all(fristen(text(ECHT[k])) == [] for k in ("pyjama", "weihnachten", "punk")))
    # Versandsatz
    fall("echte Versandsätze ok (damen, pyjama, weihnachten, futter)",
         all(versand_befunde(text(ECHT[k])) == [] for k in ("damen", "pyjama", "weihnachten", "futter")))
    fall("Versand ohne «Rabatt» = Befund", [x[0] for x in versand_befunde("Der Versand ist ab CHF 50 gratis, sonst CHF 7.")]
         == ["Versandsatz"])
    fall("Gratisversand ab CHF 45 = Befund (Schwelle + fehlt CHF 50)",
         {x[0] for x in versand_befunde("Ab CHF 45 nach Rabatt ist der Versand gratis.")} == {"Versandsatz", "Gratisversand-Schwelle"})
    fall("ohne Versand-Erwähnung kein Befund", versand_befunde(text(ECHT["selbst"])) == [])
    fall("CHF 50.90 ist nicht CHF 50", bool(versand_befunde("Versand gratis ab CHF 50.90 nach Rabatt.")))
    # Unlesbar
    fall("Preisfrage ohne Muster = Befund «Preisangabe»",
         any(x[0] == "Preisangabe" for x in bewerte(preis_angaben("<h3>Was kostet es?</h3><p>Das ist günstig.</p>"),
                                                     _ist([1490] * 12), "")))
    # Schlusszeile
    fall("Schlusszeile ohne Befund", schlusszeile(12, []) == "FAQ-PREISE: 12 Blöcke · 0 Abweichungen")
    fall("Schlusszeile mit 4 Befunden zeigt 3",
         schlusszeile(2, ["a: x (1 → 2)", "b: y (1 → 2)", "c: z (1 → 2)", "d: w (1 → 2)"])
         == "FAQ-PREISE: 2 Blöcke · 4 Abweichungen ⚠️ a: x (1 → 2) · b: y (1 → 2) · c: z (1 → 2)")
    fall("Befundzeile", zeile("tier-pullover", ("Median", "CHF 16.90", "CHF 19.90")) == "tier-pullover: Median (CHF 16.90 → CHF 19.90)")

    fehler = [n for n, ok in faelle if not ok]
    for n in fehler:
        print("  FEHLER: " + n)
    if fehler:
        print(f"SELBSTTEST faq_preis_wache: FEHLER ({len(faelle) - len(fehler)}/{len(faelle)}) — {fehler[0]}")
        return 1
    print(f"SELBSTTEST faq_preis_wache: OK ({len(faelle)}/{len(faelle)})")
    return 0


def main(argv):
    if "--selbsttest" in argv:
        return selbsttest()
    extra = []
    if "--handles" in argv:
        i = argv.index("--handles")
        extra = (argv[i + 1] if i + 1 < len(argv) else "").split(",")
    hs = handles_laden(extra)
    if not hs:
        print("FAQ-PREISE: unklar (keine Kollektionen in vorher.json / --handles)")
        return 2
    return lauf(hs, liste="--liste" in argv)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
