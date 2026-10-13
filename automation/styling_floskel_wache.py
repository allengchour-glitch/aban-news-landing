"""Entfernt den Baustein «Styling & Bemerkung» mit Saison- und Knappheitsfloskel.

Befund 23.09.2026 (Audit): 114 aktive Mode-/Schmuckprodukte trugen
  «… ist ein vielseitiger Premium-Liebling für deinen Sommer 2026 – mühelos kombinierbar …»
  «Bemerkung: Beliebte Modelle & Farben sind oft schnell vergriffen – sichere dir deinen Look rechtzeitig.»
Quelle: das Einmal-Werkzeug desc_block.mjs (Juli). Ende September für einen Wollpullover mit
«deinem Sommer» zu werben wirkt nach Textmaschine, und «oft schnell vergriffen» ist eine
unbelegte Knappheitsbehauptung bei Ware ohne Bestandsführung (UWG; Kundenfeedback «Scam», Task #40).

Der Wächter holt die Kandidaten LIVE (Phrasensuche, Kanarienvogel), entfernt Überschrift und
die beiden Floskel-Absätze, lässt den Kollektionslink «👉 Mehr … entdecken →» stehen, liest
zurück und quittiert. Text-Sperre /tmp/lock_produkttext.lock je Produkt (nie für den ganzen Lauf).
DRY=1 zeigt nur.

═══ 13.10.2026 — TEXTREGELN SCHUHE (Kauf-Strecke Klasse 14) ══════════════════════════════════
Derselbe Wächter (täglich im Aufseher) korrigiert drei gemessene Textfehler der Schuh-Importe — als
Ersetzung, nie als Neuschreiben, jede Änderung mit Alt- und Neu-Fragment im Ledger
dropship/_textregeln_schuhe.tsv (Rückweg: Fragment zurücksetzen):
  R1 «Viskose-Verfahren» (CJ 粘胶工艺 = geklebte Sohle, falsch als Viskose übersetzt; 69 aktive Schuhe)
     → «Klebeverfahren» — in Beschreibung UND SEO-Beschreibung.
  R2 Spezifikationszeile «Absatzhöhe: flach» bei Schuhen MIT Erhöhung (Titel/Auswahl nennt Erhöhung/
     Elevator) → Zeile entfernt. Was die Erhöhung ist, sagen Titel und Auswahl; erfunden wird nichts.
  R3 «ist in <eine Farbe> erhältlich», obwohl die Farbauswahl ≥ 2 Grundfarben anbietet
     (Sneaker 610100: «ist in Weiss erhältlich», Auswahl Weiss + Schwarz) → «ist in mehreren Farben erhältlich».
Erfasst auch NEUE Importe: Kandidaten kommen jeden Tag frisch aus der Phrasensuche (Kanarienvogel davor).
python3 automation/styling_floskel_wache.py --selbsttest   → prüft die drei Regeln an festen Beispielen.
"""
import fcntl, json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:   # 13.10.2026: Werbetest-Sperre — fehlt der Leser, wird vorsichtshalber NICHT geschrieben
    from werbetest_sperre import gesperrt as _werbetest_gesperrt
except Exception:
    def _werbetest_gesperrt(_x):
        return True
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(d):
        return None

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_styling_floskel_entfernt.txt"
PHRASEN = ['"schnell vergriffen"', '"Premium-Liebling für deinen Sommer"']
BLOCK = re.compile(
    r'<h4>\s*✨\s*Styling (?:&amp;|&) Bemerkung\s*</h4>\s*'
    r'(?:<p>[^<]*Premium-Liebling für deinen Sommer[^<]*</p>\s*)?'
    r'(?:<p>\s*<strong>Bemerkung:</strong>[^<]*vergriffen[^<]*</p>\s*)?')
# Reste in anderer Anordnung (nur einer der Sätze, ohne Überschrift)
EINZELN = [re.compile(r'<p>[^<]*Premium-Liebling für deinen Sommer[^<]*</p>\s*'),
           re.compile(r'<p>\s*<strong>Bemerkung:</strong>[^<]*schnell vergriffen[^<]*</p>\s*')]


def gql(q, v=None):
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "-m", "60", "-X", "POST",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if any("THROTTLED" in json.dumps(e) for e in d.get("errors") or []):
            time.sleep(10)
            continue
        nachlauf(d)
        return d
    raise SystemExit("ABBRUCH: Shopify antwortet nicht")


def kandidaten():
    kan = gql("query($q:String){productsCount(query:$q,limit:null){count}}",
              {"q": 'status:active AND "zzz kanarienvogel floskel xyz"'})
    if kan["data"]["productsCount"]["count"] != 0:
        raise SystemExit("ABBRUCH: Phrasensuche wird ignoriert (Kanarienvogel > 0)")
    ids = {}
    for ph in PHRASEN:
        nach = None
        while True:
            d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){
              pageInfo{hasNextPage endCursor} nodes{id handle}}}""", {"q": f"status:active AND {ph}", "n": nach})
            p = d["data"]["products"]
            for n in p["nodes"]:
                ids[n["id"]] = n["handle"]
            if not p["pageInfo"]["hasNextPage"]:
                break
            nach = p["pageInfo"]["endCursor"]
    return ids


def reinigen(html):
    neu = BLOCK.sub("", html)
    for rx in EINZELN:
        neu = rx.sub("", neu)
    return neu


def main():
    ks = kandidaten()
    print(f"{len(ks)} aktive Produkte mit Styling-Floskel · {'DRY' if DRY else 'SCHREIBEN'}")
    ok = fehl = gleich = 0
    with open("/tmp/lock_produkttext.lock", "w") as lk:
        for pid, h in ks.items():
            if _werbetest_gesperrt(pid):   # 13.10.2026 Werbetest A (dropship/_werbetest_sperre.txt)
                print(f"  = {h} übersprungen (Werbetest-Sperre)"); continue
            fcntl.flock(lk, fcntl.LOCK_EX)
            try:
                p = gql("query($id:ID!){product(id:$id){descriptionHtml}}", {"id": pid})["data"]["product"]
                alt = p["descriptionHtml"] or ""
                neu = reinigen(alt)
                if neu == alt:
                    gleich += 1
                    print(f"  ? kein Muster: {h}")
                    continue
                if "vergriffen" in neu or "deinen Sommer 2026" in neu:
                    fehl += 1
                    print(f"  ⚠️ Rest bleibt: {h}")
                    continue
                if DRY:
                    ok += 1
                    continue
                r = gql("""mutation($p:ProductUpdateInput!){productUpdate(product:$p){
                          product{descriptionHtml} userErrors{message}}}""",
                        {"p": {"id": pid, "descriptionHtml": neu}})
                pu = (r.get("data") or {}).get("productUpdate") or {}
                if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                    fehl += 1
                    print(f"  FEHLER {h}: {pu.get('userErrors')}")
                    continue
                ok += 1
                with open(LEDGER, "a") as f:
                    f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{pid}\t{h}\n")
            finally:
                fcntl.flock(lk, fcntl.LOCK_UN)
            time.sleep(0.25)
    # 13.10.: «FERTIG» schreibt erst textregeln() — das Tor im Aufseher wertet die letzte Zeile des Laufs.
    print(f"Floskel: {ok} bereinigt, {gleich} ohne Muster, {fehl} Fehler{' (DRY)' if DRY else ''}")


# ══ TEXTREGELN SCHUHE (13.10.2026) ════════════════════════════════════════════════════════════
LEDGER_SCHUHE = "dropship/_textregeln_schuhe.tsv"
VISKOSE = re.compile(r"Viskose-?[Vv]erfahren")
ERHOEHUNG = re.compile(r"(?i)erhöh|erhoeh|elevator|height\s+increas|increase[ds]?\s+by|heightening")
ABSATZ_FLACH = re.compile(r"\s*<li>\s*<strong>\s*Absatzhöhe:?\s*</strong>\s*flach\.?\s*</li>", re.I)
_STAMM = ("schwarz", "weiss", "braun", "grau", "blau", "beige", "khaki", "grün", "rot", "gelb", "rosa", "pink",
          "lila", "violett", "orange", "silber", "gold", "bordeaux", "creme", "camel", "türkis", "oliv", "aprikose")
_EN = {"black": "schwarz", "white": "weiss", "brown": "braun", "gray": "grau", "grey": "grau", "blue": "blau",
       "navy": "blau", "green": "grün", "red": "rot", "wine": "rot", "yellow": "gelb", "pink": "pink", "rose": "pink",
       "purple": "lila", "violet": "lila", "orange": "orange", "silver": "silber", "golden": "gold", "gold": "gold",
       "beige": "beige", "khaki": "khaki", "apricot": "aprikose", "camel": "camel", "coffee": "braun"}
_FARBWORT = (r"(?:[A-ZÄÖÜ][a-zäöüß]*(?:" + "|".join(_STAMM) + r")|"
             + "|".join(w.capitalize() for w in _STAMM) + r")")
EIN_FARBE = re.compile(r"\bist (?:nur |ausschliesslich )?in (?:(?:klassischem|schlichtem|elegantem|zeitlosem|edlem|"
                       r"sattem|tiefem|dezentem|stilvollem|reinem|klassischen|schlichten|elegantem) )?(?:der Farbe )?"
                       + _FARBWORT + r" erhältlich\b")


def grundfarben(werte):
    """Menge der Grundfarben in den Werten einer Farb-Option (deutsch oder englisch, Komposita: Weinrot → rot)."""
    aus = set()
    for v in werte:
        for w in re.findall(r"[A-Za-zÄÖÜäöüß]+", (v or "").lower()):
            if w in _EN:
                aus.add(_EN[w]); continue
            for st in _STAMM:
                if w.endswith(st) and (w == st or len(w) - len(st) >= 3):
                    aus.add(st); break
    return aus


def farb_werte(options):
    for o in options or []:
        if re.match(r"(?i)^(farbe|color|colour)\b", o.get("name") or ""):
            return [v["name"] for v in o.get("optionValues") or []]
    return []


def regeln_anwenden(html, titel, options):
    """→ (neues html, [(regel, alt, neu), …]). Rein, ohne Netz (Selbsttest)."""
    aend = []
    neu = html or ""
    for m in sorted(set(VISKOSE.findall(neu))):
        aend.append(("R1-viskose", m, "Klebeverfahren"))
    neu = VISKOSE.sub("Klebeverfahren", neu)
    werte = [v["name"] for o in options or [] for v in o.get("optionValues") or []]
    if ERHOEHUNG.search((titel or "") + " " + " ".join(werte)):
        for m in ABSATZ_FLACH.finditer(neu):
            aend.append(("R2-absatz-flach-bei-erhoehung", m.group(0).strip(), ""))
        neu = ABSATZ_FLACH.sub("", neu)
    if len(grundfarben(farb_werte(options))) >= 2:
        for m in EIN_FARBE.finditer(neu):
            aend.append(("R3-eine-farbe-bei-mehreren", m.group(0), "ist in mehreren Farben erhältlich"))
        neu = EIN_FARBE.sub("ist in mehreren Farben erhältlich", neu)
    return neu, aend


def _seiten(q):
    nach = None
    while True:
        d = gql("""query($q:String,$n:String){products(first:50,after:$n,query:$q){pageInfo{hasNextPage endCursor}
          nodes{id handle title descriptionHtml seo{description} options{name optionValues{name}}}}}""",
                {"q": q, "n": nach})
        p = d["data"]["products"]
        yield from p["nodes"]
        if not p["pageInfo"]["hasNextPage"]:
            break
        nach = p["pageInfo"]["endCursor"]


def textregeln():
    kan = gql("query($q:String){productsCount(query:$q,limit:null){count}}",
              {"q": 'status:active AND "zzz kanarienvogel viskose xyz"'})
    if kan["data"]["productsCount"]["count"] != 0:
        raise SystemExit("ABBRUCH: Phrasensuche wird ignoriert (Kanarienvogel > 0)")
    kandidaten = {}
    for q in ('status:active AND "Viskose-Verfahren"', 'status:active AND "Viskoseverfahren"',
              'status:active AND "Absatzhöhe"', 'status:active AND "ist in" AND "erhältlich"'):
        for n in _seiten(q):
            kandidaten[n["id"]] = n
    print(f"TEXTREGELN: {len(kandidaten)} Kandidaten · {'DRY' if DRY else 'SCHREIBEN'}", flush=True)
    zahl = {"R1-viskose": 0, "R2-absatz-flach-bei-erhoehung": 0, "R3-eine-farbe-bei-mehreren": 0, "seo": 0}
    ok = fehl = 0
    with open("/tmp/lock_produkttext.lock", "w") as lk:
        for pid, n in kandidaten.items():
            if _werbetest_gesperrt(pid):   # 13.10.2026 Werbetest A (dropship/_werbetest_sperre.txt)
                print(f"  = {n.get('handle')} übersprungen (Werbetest-Sperre)"); continue
            neu, aend = regeln_anwenden(n["descriptionHtml"], n["title"], n["options"])
            seo_alt = ((n.get("seo") or {}).get("description")) or ""
            seo_neu = VISKOSE.sub("Klebeverfahren", seo_alt)
            if not aend and seo_neu == seo_alt:
                continue
            for r, a, b in aend:
                zahl[r] += 1
            if seo_neu != seo_alt:
                zahl["seo"] += 1
            if DRY:
                ok += 1
                print(f"  ~ {n['handle'][:60]}: " + " · ".join(f"{r}: {a[:60]!r}→{b!r}" for r, a, b in aend)
                      + (" · SEO" if seo_neu != seo_alt else ""))
                continue
            fcntl.flock(lk, fcntl.LOCK_EX)
            try:
                # frisch lesen: ein anderer Textwächter kann seit der Liste geschrieben haben
                p = gql("query($id:ID!){product(id:$id){title descriptionHtml seo{title description} "
                        "options{name optionValues{name}}}}", {"id": pid})["data"]["product"]
                neu, aend = regeln_anwenden(p["descriptionHtml"], p["title"], p["options"])
                seo_alt = ((p.get("seo") or {}).get("description")) or ""
                seo_neu = VISKOSE.sub("Klebeverfahren", seo_alt)
                if not aend and seo_neu == seo_alt:
                    continue
                inp = {"id": pid, "descriptionHtml": neu}
                if seo_neu != seo_alt:
                    inp["seo"] = {"title": (p.get("seo") or {}).get("title"), "description": seo_neu}
                r = gql("""mutation($p:ProductUpdateInput!){productUpdate(product:$p){
                          product{descriptionHtml seo{description}} userErrors{message}}}""", {"p": inp})
                pu = (r.get("data") or {}).get("productUpdate") or {}
                zur = pu.get("product") or {}
                if pu.get("userErrors") or zur.get("descriptionHtml") != neu \
                        or ((zur.get("seo") or {}).get("description") or "") != seo_neu:
                    fehl += 1
                    print(f"  FEHLER {n['handle']}: {pu.get('userErrors')}")
                    continue
                ok += 1
                ts = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                esc = lambda x: (x or "").replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n")
                with open(LEDGER_SCHUHE, "a", encoding="utf-8") as f:
                    for rg, a, b in aend:
                        f.write(f"{ts}\t{pid}\t{n['handle']}\t{rg}\t{esc(a)}\t{esc(b)}\n")
                    if seo_neu != seo_alt:
                        f.write(f"{ts}\t{pid}\t{n['handle']}\tR1-viskose-seo\t{esc(seo_alt)}\t{esc(seo_neu)}\n")
            finally:
                fcntl.flock(lk, fcntl.LOCK_UN)
            time.sleep(0.25)
    print(f"FERTIG: Textregeln {ok} Produkte {'(DRY) ' if DRY else ''}· {zahl} · {fehl} Fehler")


SELBSTTEST = [
    # (html, titel, farbwerte, erwartet-Teilstring, darf-nicht)
    ("<li>Robuste Gummisohle (Viskose-Verfahren)</li>", "Sneaker", ["Schwarz"], "(Klebeverfahren)", "Viskose"),
    ("<p>Die Gummisohle ist im Viskoseverfahren gefertigt.</p>", "Boots", [], "im Klebeverfahren gefertigt", "Viskose"),
    ("<li>\n<strong>Absatzhöhe:</strong> flach</li>\n</ul>", "Herren Sneaker", ["Weiss · versteckte Erhöhung 6 cm"],
     "</ul>", "Absatzhöhe"),
    ("<li>\n<strong>Absatzhöhe:</strong> flach</li>", "Herren Sneaker mit Erhöhung", ["Schwarz"], "", "Absatzhöhe"),
    ("<li>\n<strong>Absatzhöhe:</strong> flach</li>", "Ballerina", ["Schwarz", "Beige"], "Absatzhöhe:</strong> flach", None),
    ("<p>Er ist in Weiss erhältlich und bietet 8 cm.</p>", "Sneaker", ["Weiss erhöht 8 cm", "Schwarz erhöht 8 cm"],
     "ist in mehreren Farben erhältlich", "in Weiss"),
    ("<p>Er ist in schlichtem Schwarz erhältlich.</p>", "Sneaker", ["Schwarz erhöht 6 cm", "Schwarz erhöht 8 cm"],
     "in schlichtem Schwarz erhältlich", None),                     # eine Grundfarbe → richtig
    ("<p>Er ist in Schwarz erhältlich.</p>", "Sneaker", ["Schwarz", "Schwarz, gefüttert"], "in Schwarz erhältlich", None),
    ("<p>Er ist in Schwarz und Braun erhältlich.</p>", "Sneaker", ["Schwarz", "Braun"], "Schwarz und Braun", None),
    ("<p>Sie ist in Dunkelbraun erhältlich.</p>", "Stiefel", ["Dark Brown", "Black"], "mehreren Farben", "Dunkelbraun"),
]


def selbsttest():
    fehler = 0
    for html, titel, farben, soll, nicht in SELBSTTEST:
        opts = [{"name": "Farbe", "optionValues": [{"name": f} for f in farben]}] if farben else []
        neu, _ = regeln_anwenden(html, titel, opts)
        if soll not in neu or (nicht and nicht in neu):
            fehler += 1
            print(f"FEHLER {html[:50]!r} [{titel}] {farben}: {neu!r}")
    print(f"SELBSTTEST: {len(SELBSTTEST) - fehler}/{len(SELBSTTEST)} richtig")
    return 1 if fehler else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        raise SystemExit(selbsttest())
    if "--nur-textregeln" not in sys.argv:
        main()
    textregeln()
