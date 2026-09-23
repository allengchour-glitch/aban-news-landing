#!/usr/bin/env python3
"""google_titel_reparatur.py — repariert die Titel- und Einordnungsfehler, die Google im `product.feedback`
der App «Google & YouTube» meldet und die sich am Produkt beheben lassen (Befund 26, 23.09.2026).

GEMESSEN 23.09.2026 (Vollscan 50'016 aktive um ~18:20 UTC, Stand-Datei des Wächters von 09:52 UTC):
  • «Title under review» (836 morgens, 637 abends) ist KEIN Titelfehler, sondern ein Prüfzustand bei Google.
    Von den 300 morgens gespeicherten Handles standen abends nur noch 15 in der Liste (95 % Umschlag in 9 h),
    dafür 622 neue. 55 % der Treffer sind Kleidung (Kategorie «Clothing» 353 von 637), die Wort-Hebung zeigt
    nur Modewörter (Poloshirt, Rollkragen, Leggings, High-Waist). Kein Titelmuster → hier wird NICHTS
    umgeschrieben. Auch «Sexy» (45 Titel) trägt 0 «Inappropriate title» — kein Grund zum Umschreiben.
  • «Inappropriate title» dreht ebenso: 4 von 9 morgens gemeldeten standen abends noch drin, 6 neue kamen
    dazu, darunter harmlose Jeans und ein Hundehalsband. Gehandelt wird nur bei BESTÄNDIGEN Meldungen
    (Stand-Datei UND Live-Abfrage) und nur, wo der Titel einen sachlichen Fehler trägt.
  • Die reparierbaren Klassen sind klein und konkret: ein Politiker-Name als Uhrenmarke (BIDEN, 2 Titel),
    Titel ohne Produktnomen («Schockresistenter Schutz» = iPhone-Hülle, «Eisige Meeresoberfläche» =
    Press-on-Nägel), «Used-Look» (20 Titel — Google liest «used» als Zustand, «Invalid product condition»),
    Rauchzubehör ohne Raucher-Tag (Spiral-Kräuterpfeife als «Werkzeug & Heimwerken» im Google-Kanal =
    «Illegal drugs»; zwei Aschenbecher ohne Tag, fünf mit Tag aber falschem Typ), Hygieneartikel im
    Sammeltyp «Aufbewahrung & Organizer» (Menstruationscup, Intimreiniger), Richtlinien-Treffer, die
    Google beständig meldet (Hacking: Wanzen-Detektor; Guns and Parts: taktisches Stativ).

REGELN (Reihenfolge = Vorrang; jede Regex hat Kanarienvögel in KANARIEN, der Lauf bricht ohne sie ab):
  EINZEL    von Hand gelesene Produkte (Beschreibung geprüft): neuer Titel NUR, wenn der Live-Titel noch
            genau dem alten entspricht; Typ/Kategorie/Tags idempotent; Textersatz im Beschreibungs-HTML.
  PERSON    Namen realer Politiker als «Marke» raus (Titel, SEO, Beschreibung) — nur vor einem Wort,
            sonst Bericht (kein Raten).
  USED      «Used-Look» → «Vintage-Look» (Titel, SEO, Beschreibungstext ausserhalb von HTML-Tags).
  PROMO     «New Style»/«Neu»/… in Guillemets aus Titel und SEO.
  RAUCH     Rauchzubehör → Tags raucher + smoke-zubehoer, Typ «Raucherzubehör», Kategorie hg-19(-1);
            Fehl-Tags aus Kompositum-Fallen (Aschen«becher» ≠ Becher, «werkzeug», «kueche» …) raus.
            google_sperrtags_durchsetzen.py nimmt die Ware danach aus ALLEN Werbekanälen (Hausregel).
  HYGIENE   Intim-/Menstruationsartikel in einem Sammeltyp → Typ «Wellness & Gesundheit», Kategorie
            Feminine Sanitary Supplies, Sammel-Tags (aufbewahrung/organizer/wohnen/haushalt) raus.
  POLICY    Google meldet eine Richtlinie (Drogen, Waffen, Hacking, Explosiv, Fahrzeug) BESTÄNDIG und
            keine Regel hat den Titel repariert (auch nicht in den letzten WARTE_TAGE Tagen) → Tags
            google-policy-flag + google-policy-<klasse>. «google-policy-flag» steht in
            google_sperrliste.AUSSCHLUSS_TAGS → google_sperrtags_durchsetzen.py nimmt das Produkt aus
            Google (nur Google; Onlineshop bleibt). Bei «Inappropriate title» nur für sensible Titel.

NIE: Titel über 70 Zeichen, Löschen, Preise, Theme. Beschreibungen nur unter /tmp/lock_produkttext.lock je
Produkt (nicht blockierend probieren, bei Belegung überspringen — der nächste Lauf holt es nach).

Ablauf: Kanarienvögel → Taxonomie-IDs prüfen → productsCount(limit:null) + Vollscan (nur ACTIVE) →
Live-Feedback der Stand-Handles → Plan → DRY-Diff (Standard) bzw. SCHARF=1 schreiben → ZURÜCKLESEN →
Ledger `dropship/_google_titel_reparatur.txt` → Nachmessung (Ledger-Einträge ≥ 20 h: Google-Klassen live) →
Bericht `dropship/GOOGLE-TITEL-REPARATUR.md`.

Aufruf:  python3 automation/google_titel_reparatur.py            (DRY, zeigt jede Änderung)
         SCHARF=1 python3 automation/google_titel_reparatur.py   (schreibt)
         NUR=15512293572993,15471974973825 …                      (nur diese Produkt-IDs)
Täglich NACH google_feedback_wache.py (braucht deren frischen Stand) und VOR google_sperrtags_durchsetzen.py.
"""
import datetime, fcntl, json, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf, bilanz  # noqa: E402
import google_sperrliste as gs  # noqa: E402
from kategorie_wache import SAMMELTYPEN  # noqa: E402  (EINE Liste — nicht kopieren)

ROOT = os.path.dirname(HIER)
LEDGER = os.path.join(ROOT, "dropship", "_google_titel_reparatur.txt")
BERICHT = os.path.join(ROOT, "dropship", "GOOGLE-TITEL-REPARATUR.md")
STAND = os.path.join(ROOT, "dropship", "_google_feedback_stand.json")
TEXTSPERRE = "/tmp/lock_produkttext.lock"
SHOP = "au3j0y-hq.myshopify.com"
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read()
       if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
SCHARF = os.environ.get("SCHARF") == "1"
NUR = {x.strip().rsplit("/", 1)[-1] for x in os.environ.get("NUR", "").split(",") if x.strip()}
WARTE_TAGE = int(os.environ.get("WARTE_TAGE", "7"))      # nach einer Titelreparatur: Google neu prüfen lassen
STAND_MAX_H = int(os.environ.get("STAND_MAX_H", "48"))   # älterer Wächter-Stand zählt nicht als Beobachtung
NACHMESS_H = int(os.environ.get("NACHMESS_H", "20"))
MAX_TITEL = 70
TC = "gid://shopify/TaxonomyCategory/"
PID = "gid://shopify/Product/"
BUCHST = "A-Za-zÄÖÜäöüß"

# ─────────────────────────────── Regeln ───────────────────────────────
PERSONEN = r"biden|trump|putin|obama|merkel|macron|selenskyj|zelensky|xi jinping"
PERSON = re.compile(rf"(?i)(?<![{BUCHST}])({PERSONEN})(?![{BUCHST}])")
# nur entfernen, wenn ein Wort folgt («BIDEN Herrenuhr», «Biden-Uhr»); am Titelende wäre es Raten
PERSON_VOR_WORT = re.compile(rf"(?i)(?<![{BUCHST}])(?:{PERSONEN})(?:\s+|-)(?=[{BUCHST}0-9])")
USED = re.compile(rf"(?i)(?<![{BUCHST}])used[- ]look(?![{BUCHST}])")
PROMO = re.compile(r"(?i)\s*«(?:new style|new|neu|hot|trend|bestseller|sale)»")
RAUCH = re.compile(
    rf"(?i)(aschenbecher|spiral[- ]?pipe|pipe[- ]atomizer|kräuter-?pfeife|tabak-?pfeife|wasserpfeife"
    rf"|(?<![{BUCHST}])shisha|(?<![{BUCHST}])hookah|(?<![{BUCHST}])bongs?(?![{BUCHST}])"
    rf"|kräuter-?vaporizer|kräuter-?verdampfer|drehmaschine|rolling[- ]?papers?|rolling[- ]?tray|drehpapier"
    rf"|zigarettenpapier|drehunterlage|longpapers?|filter-?tips|(?:kräuter|tabak)-?(?:tabak-?)?grinder"
    rf"|zigarren-?(?:anzünder|kasten|etui|schneider|hygrometer|humidor|abschneider|tasche|halter)|humidor)")
RAUCH_FALLEN_TAGS = {"becher", "werkzeug", "heimwerken", "kueche", "kochen", "aufbewahrung", "organizer"}
INTIM = re.compile(
    rf"(?i)(menstruations?-?(?:cup|tasse|kappe|unterwäsche|slip)|perioden-?(?:unterwäsche|slip|cup)"
    rf"|intim-?(?:reiniger|dusche|waschlotion|waschgel)|slipeinlagen?|(?<![{BUCHST}])tampons?(?![{BUCHST}])"
    rf"|damenbinden?)")
INTIM_KAT = [(re.compile(r"(?i)menstruations?-?(?:cup|tasse|kappe)|perioden-?cup"), "hb-3-8-5"),
             (re.compile(r"(?i)intim-?(?:reiniger|dusche)"), "hb-3-8-3"),
             (re.compile(r"(?i)intim-?wasch"), "hb-3-8-7"),
             (re.compile(r"(?i)slipeinlage|damenbinde"), "hb-3-8-4")]
SAMMEL_TAGS = {"aufbewahrung", "organizer", "wohnen", "haushalt"}
SENSIBEL = re.compile(rf"(?i)(?<![{BUCHST}])(intim\w*|erotik\w*|vagina\w*|penis\w*|kondom\w*)|menstruation")

POLICY_KLASSEN = {"Illegal drugs": "drogen", "Guns and Parts": "waffen", "Other weapons": "waffen",
                  "Weapons": "waffen", "Hacking": "hacking", "Explosives": "explosiv", "Vehicles": "fahrzeug",
                  "Tobacco": "tabak", "Dangerous products": "gefahr"}
TITEL_KLASSE = "Inappropriate title"

# Kanarienvögel: (muss treffen, darf NICHT treffen). Titel aus dem Live-Bestand 23.09., Fallen nach Lehre 9b.
KANARIEN = {
    "PERSON": (["BIDEN Herrenuhr ultraflach mit Kalender", "Biden Herren-Quarzuhr, hohl, leger"],
               ["Trompete aus Messing", "Trumpf-Kartenspiel", "Obamba Holzmaske", "Merkelbach Steingut"]),
    "USED": (["Used-Look Jeans mit leicht ausgestelltem Bein", "Twill Umhängetasche im Used-Look",
              "Used-Look-Jeans, gewaschen", "Hoodie im Used Look"],
             ["Unused Look Spiegel", "Fused-Look Glasvase", "Focused Look Brille"]),
    "PROMO": (["Strandtuch-Kleid «New Style»", "Tasche «Neu»"],
              ["Flauschige Hausschuhe «Kürbis»", "Kissenbezug «New Chinese Style»", "Neue X9 HD-Heimspielkonsole"]),
    "RAUCH": (["Spiral Pipe Atomizer für trockene Kräuter", "Runder Aschenbecher aus Keramik",
               "Smarter Aschenbecher mit Luftreiniger für Auto & Zuhause", "Glas-Bong 30 cm", "Shisha-Kopf Zubehör",
               "Schwarzer Kräuter-Tabak-Grinder mit Box", "Elektronisches Zigarren-Hygrometer",
               "Kompakter Zigarrenkasten", "Auberginen Zigarrenanzünder mit Doppelflamme", "Rolling Tray aus Metall"],
              ["Bongo-Trommel für Kinder", "Trillerpfeife aus Metall",
               "Flötenkessel 2L – Edelstahl-Wasserkessel mit Pfeife", "Chameleon Smoke Pipe Labret Nagel-Set",
               "Elektrische Kräuter- und Kaffeemühle", "Multifunktionaler Mixer, Entsafter & Grinder",
               "Seifengrinder · Weiss", "Rolling Ball Katzenspielzeug", "Auto-Zigarettenanzünder mit USB & Type-C",
               "Zigarre, Maserung & Ölgemälde Leinwand-Set", "Tragbarer Hand-Atomizer für Gesichtspflege",
               "Rauchmelder mit Funk", "Stabfeuerzeug für Grill", "Gesichts-Vaporizer Dampfgerät",
               "Rauchinfuser für Speisen und Getränke"]),
    "INTIM": (["Menstruationscup für Frauen", "Intelligenter Intimreiniger für die Frau", "Periodenunterwäsche 3er-Pack"],
              ["Wiederaufladbarer Wärme-Massagegurt für Menstruationsschmerzen", "Intim-Pflegeserum für Frauen",
               "Haarbinden-Set", "Tamponade-Zubehör"]),
    "SENSIBEL": (["Menstruationscup für Frauen", "Intelligenter Intimreiniger für die Frau"],
                 ["Slim Fit Jeans in Lila-Schwarz", "Reflektierendes Hundehalsband mit Cartoon-Muster",
                  "Stahlarmband mit Fallschirmschliesse"]),
}
_RX = {"PERSON": PERSON, "USED": USED, "PROMO": PROMO, "RAUCH": RAUCH, "INTIM": INTIM, "SENSIBEL": SENSIBEL}

# ─────────── EINZEL: von Hand gelesen (Titel, Typ, Tags, Beschreibung am 23.09. live geprüft) ───────────
EINZEL = {
    "15512293572993": dict(handle="biden-herrenuhr-ultraflach-mit-kalender-611776",
        alt="BIDEN Herrenuhr ultraflach mit Kalender", neu="Ultraflache Herrenuhr mit Kalender",
        text=[("Diese ultraflache BIDEN Herrenuhr", "Diese ultraflache Herrenuhr"),
              # Sie→du-Wandlung hatte das Possessiv der UHR («Ihr Design») zu «dein» gemacht
              ("Mann. dein stilvolles Design", "Mann. Ihr stilvolles Design")],
        grund="Politiker-Name als Marke (Google: Inappropriate title)"),
    "15516198764929": dict(handle="biden-herren-quarzuhr-hohl-leger-052544",
        alt="Biden Herren-Quarzuhr, hohl, leger", neu="Legere Herren-Quarzuhr mit Kalender",
        typ="Uhren", kat="aa-6-11", tags_weg={"elektronik", "gadget", "tech"}, tags_dazu={"uhren"},
        grund="Politiker-Name als Marke; Uhr stand als «Elektronik» in drei Elektronik-Kollektionen"),
    "15471974973825": dict(handle="schockresistenter-schutz-625600",
        alt="Schockresistenter Schutz", neu="Stossfeste iPhone-Hülle aus Silikon, transparent",
        typ="Handy-Zubehör", kat="el-4-8-4-2", tags_weg={"damen-taschen"},
        grund="Titel ohne Produktnomen (Beschreibung: Phone Case, Silikon, transparent, iPhone); stand in Damen-Mode"),
    "15500901351809": dict(handle="eisige-meeresoberflache-607000",
        alt="Eisige Meeresoberfläche", neu="Press-on-Nägel «Eisige Meeresoberfläche», 10 Stück",
        grund="Titel ohne Produktnomen (Beschreibung: 10 Nägel, Jelly-Kleber, Feile, Orangenholzstab)"),
    "15446275817857": dict(handle="zisha-keramik-gongfu-teetasse-tenmoku-glasur-638100",
        typ="Küche & Bar", kat="hg-11-10-5-2", tags_weg={"aufbewahrung", "organizer"},
        grund="Teetasse im Sammeltyp «Aufbewahrung & Organizer» (Google: Inappropriate title, beständig)"),
    "15502303756673": dict(handle="laser-silber-rippband-75mm-50-yards-026496",
        alt="Laser-Silber-Rippband, 75mm, 50 Yards", neu="Ripsband in Silber mit Glanzeffekt, 75 mm, 50 Yards",
        grund="Bastelband; «Laser» las Google als Waffenteil (Guns and Parts), «Rippband» ist Ripsband"),
    "15510929506689": dict(handle="1-zoll-zapfpistole-fur-diesel-und-benzin-257024",
        alt="1-Zoll-Zapfpistole für Diesel und Benzin", neu="1-Zoll-Zapfventil für Diesel und Benzin",
        grund="Tankzubehör; «Pistole» las Google als Waffe (Guns and Parts)"),
    "15504006873473": dict(handle="baustein-luxuslimousine-auf-raedern-334528",
        alt="Luxus-Limousine · Baustein-Auto auf Rädern", neu="Baustein-Set Luxus-Limousine – Spielzeugauto zum Bauen",
        typ="Spielzeug", kat="tg-5-7", tags_weg={"rc"},
        grund="Bauset las Google als Fahrzeug (Vehicles); Typ «Spass-Elektronik» + Tag rc waren falsch"),
    "15450856423809": dict(handle="strandtuch-kleid-new-style-f6bb03",
        alt="Strandtuch-Kleid «New Style»", neu="Strandtuch-Kleid – Badetuch zum Anziehen",
        typ="Pool & Strand", kat="hg-15-4-2",
        grund="Werbezusatz «New Style» im Titel (Google: Additional text found), Typ Trend-Gadget"),
}


def selbsttest():
    fehler = []
    for name, (ja, nein) in KANARIEN.items():
        rx = _RX[name]
        fehler += [f"{name} verfehlt «{t}»" for t in ja if not rx.search(t)]
        fehler += [f"{name} trifft fälschlich «{t}»" for t in nein if rx.search(t)]
    for pid, e in EINZEL.items():
        if e.get("neu") and len(e["neu"]) > MAX_TITEL:
            fehler.append(f"EINZEL {pid}: neuer Titel > {MAX_TITEL}")
    if titel_person("BIDEN Herrenuhr ultraflach mit Kalender") != "Herrenuhr ultraflach mit Kalender":
        fehler.append("titel_person() entfernt die Marke nicht sauber")
    if titel_person("Uhr von Biden") is not None:
        fehler.append("titel_person() rät bei Name am Ende")
    if USED.sub("Vintage-Look", "Used-Look-Jeans, gewaschen") != "Vintage-Look-Jeans, gewaschen":
        fehler.append("USED-Ersatz bricht das Kompositum")
    probe = '<p>Jeans im Used-Look</p><img src="https://cdn.x/used-look-jeans.jpg">'
    if "used-look-jeans.jpg" not in html_text_ersetzen(probe, lambda t: USED.sub("Vintage-Look", t)):
        fehler.append("html_text_ersetzen() verändert Attribute")
    if not gs.ausschluss_tag(["google-policy-flag"]):
        fehler.append("google-policy-flag steht nicht mehr in AUSSCHLUSS_TAGS — Sperre würde nicht durchgesetzt")
    if fehler:
        raise SystemExit("ABBRUCH Selbsttest:\n  " + "\n  ".join(fehler))


# ─────────────────────────────── Werkzeuge ───────────────────────────────
def gql(q, v=None):
    grund, drossel, versuche = "kein Versuch", 0, 0
    while versuche < 6:
        r = subprocess.run(["curl", "-s", "--max-time", "90", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON"; versuche += 1; time.sleep(5); continue
        if d.get("data") is not None:
            nachlauf(d); return d
        grund = str(d.get("errors") or d)[:300]
        if "THROTTLED" in grund.upper() and drossel < 12:   # Drosselung zählt nicht als Fehlversuch
            drossel += 1; time.sleep(min(30, 4 * drossel)); continue
        versuche += 1; time.sleep(5)
    raise RuntimeError("Shopify antwortet nicht mit Daten — Lauf abgebrochen. Letzter Grund: " + grund)


def titel_person(t):
    """Politiker-Name vor einem Wort entfernen. None = Name steht anders (Bericht statt Raten)."""
    neu = PERSON_VOR_WORT.sub("", t)
    if PERSON.search(neu):
        return None
    neu = re.sub(r"\s{2,}", " ", neu).strip(" ,-–·")
    if len(neu.split()) < 2:
        return None
    return neu[:1].upper() + neu[1:]


def text_person(t):
    return re.sub(r"\s{2,}", " ", PERSON_VOR_WORT.sub("", t))


def text_used(t):
    return USED.sub("Vintage-Look", t)


def html_text_ersetzen(html, fn):
    """Wendet fn nur auf Text zwischen Tags an — Bild-URLs und Attribute bleiben unberührt."""
    return "".join(s if s.startswith("<") else fn(s) for s in re.split(r"(<[^>]+>)", html or ""))


def klasse(msg):
    return re.sub(r"\s+in$", "", re.sub(r"\s*\[[^\]]*\]", "", msg).strip().rstrip(".")).strip()


def google_klassen(fb):
    """Klassen der App «Google & YouTube» ohne reine Shopping-Ads-Meldungen (wie google_feedback_wache.py)."""
    out = set()
    for det in ((fb or {}).get("details") or []):
        if ((det.get("app") or {}).get("title")) != "Google & YouTube":
            continue
        for m in det.get("messages") or []:
            txt = m.get("message") or ""
            if "[Shopping_ads]" in txt:          # exakt die Klammer — «[Free_listings,Shopping_ads]» zählt!
                continue
            out.add(klasse(txt))
    return out


def ledger_lesen():
    zeilen = []
    if os.path.exists(LEDGER):
        for l in open(LEDGER, encoding="utf-8"):
            if l.startswith("#") or not l.strip():
                continue
            zeilen.append(l.rstrip("\n").split("\t"))
    return zeilen


def ledger_schreiben(zeilen):
    neu = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        if neu:
            f.write("# zeit\taktion\tprodukt\thandle\tregel\tfeld\talt\tneu\tstatus — google_titel_reparatur.py\n")
        for z in zeilen:
            f.write("\t".join(str(x).replace("\t", " ").replace("\n", " ") for x in z) + "\n")


def jetzt():
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def zuletzt_umbenannt(ledger):
    """Produkt-ID → jüngster geschriebener Titel (datetime) — POLICY wartet danach WARTE_TAGE."""
    out = {}
    for z in ledger:
        if len(z) >= 9 and z[1] == "SCHREIB" and z[5] == "titel" and z[8] == "ok":
            try:
                t = datetime.datetime.strptime(z[0], "%Y-%m-%dT%H:%M:%SZ")
            except ValueError:
                continue
            out[z[2]] = max(out.get(z[2], t), t)
    return out


def offene_texte(ledger):
    """Produkt-ID → Regeln, deren Beschreibungs-Teil noch offen ist (Sperre belegt/Fehler). Der Titel ist dann schon
    repariert, die Titel-Regel trifft nicht mehr — ohne dieses Gedächtnis bliebe «Used-Look» im Text für immer stehen."""
    letzte = {}
    for z in ledger:
        if len(z) >= 9 and z[5] == "beschreibung" and z[1] in ("SCHREIB", "UEBERSPRUNGEN"):
            letzte[z[2]] = (z[8] == "ok", {r.replace("-TEXT", "") for r in z[4].split("+")})
    return {pid: regeln for pid, (ok, regeln) in letzte.items() if not ok}


def ids_pruefen(ids):
    ids = sorted(ids)
    if not ids:
        return {}
    d = gql("query($ids:[ID!]!){ nodes(ids:$ids){ ... on TaxonomyCategory { id fullName } } }", {"ids": [TC + i for i in ids]})
    namen = {}
    for i, n in zip(ids, d["data"]["nodes"]):
        if not n:
            raise SystemExit(f"ABBRUCH: Taxonomie-ID unbekannt: {i} — Tabelle korrigieren, nichts geschrieben.")
        namen[i] = n["fullName"]
    return namen


# ─────────────────────────────── Messen ───────────────────────────────
def vollscan():
    soll = gql('{ productsCount(query:"status:active", limit:null){ count precision } }')["data"]["productsCount"]
    cur, alle = None, []
    while True:
        d = gql('query($c:String){ products(first:250, after:$c, query:"status:active"){ pageInfo{hasNextPage endCursor} '
                'nodes{ id handle status title productType tags } } }', {"c": cur})
        pg = d["data"]["products"]
        alle += [n for n in pg["nodes"] if n["status"] == "ACTIVE"]   # Filter-Kanarienvogel: Status am Knoten
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    return alle, soll


def stand_lesen():
    """Handles je Google-Klasse aus dem Wächter-Stand + Alter in Stunden (None = kein Stand)."""
    if not os.path.exists(STAND):
        return {}, None
    st = json.load(open(STAND, encoding="utf-8"))
    try:
        alter = (datetime.datetime.utcnow() - datetime.datetime.strptime(st["stand"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:
        alter = None
    je = {}
    for k, hs in (st.get("handles") or {}).items():
        for h in hs:
            je.setdefault(h, set()).add(klasse(k))
    return je, alter


def details(pid):
    d = gql("query($id:ID!){ product(id:$id){ id handle status title productType tags category{id} "
            "seo{title description} descriptionHtml feedback{ details{ app{title} messages{message} } } } }", {"id": pid})
    return d["data"]["product"]


# ─────────────────────────────── Planen ───────────────────────────────
def planen(p, live_klassen, stand_klassen, umbenannt, offen_text=frozenset()):
    """Liefert den Änderungsplan für ein Produkt (dict) oder None. Liest nur, schreibt nichts."""
    num = p["id"].rsplit("/", 1)[-1]
    titel = p["title"]
    tags = {t.lower() for t in p["tags"]}
    plan = dict(titel=None, typ=None, kat=None, dazu=set(), weg=set(), text=[], text_fn=[], regeln=[], notiz=[])
    # Beschreibungs-Nachholer aus dem Ledger (Titel schon repariert, Text war gesperrt)
    for regel, fn in (("USED", "used"), ("PERSON", "person")):
        if regel in offen_text:
            plan["text_fn"].append(fn); plan["regeln"].append(regel + "-TEXT")
    e = EINZEL.get(num)
    if e:
        if e.get("alt") and titel == e["alt"]:
            plan["titel"] = e["neu"]
        for a, b in e.get("text", []):
            plan["text"].append((a, b))
        if e.get("typ") and p["productType"] != e["typ"]:
            plan["typ"] = e["typ"]
        if e.get("kat"):
            plan["kat"] = e["kat"]
        plan["dazu"] |= set(e.get("tags_dazu", set())) - tags
        plan["weg"] |= set(e.get("tags_weg", set())) & tags
        plan["regeln"].append("EINZEL")
    t = plan["titel"] or titel
    if PERSON.search(t):
        neu = titel_person(t)
        if neu:
            plan["titel"] = neu; plan["regeln"].append("PERSON")
            if "person" not in plan["text_fn"]:
                plan["text_fn"].append("person")
        else:
            plan["notiz"].append("PERSON: Name steht nicht vor einem Wort — von Hand prüfen")
    t = plan["titel"] or titel
    if USED.search(t):
        plan["titel"] = USED.sub("Vintage-Look", t); plan["regeln"].append("USED")
        if "used" not in plan["text_fn"]:
            plan["text_fn"].append("used")
    t = plan["titel"] or titel
    if PROMO.search(t):
        plan["titel"] = PROMO.sub("", t).strip(); plan["regeln"].append("PROMO")
    t = plan["titel"] or titel
    if RAUCH.search(t) and ("raucher" not in tags or p["productType"] != "Raucherzubehör"):
        plan["dazu"] |= {"raucher", "smoke-zubehoer"} - tags
        if p["productType"] != "Raucherzubehör":
            plan["typ"] = "Raucherzubehör"
        plan["kat"] = "hg-19-1" if re.search(r"(?i)aschenbecher", t) else "hg-19"
        plan["weg"] |= RAUCH_FALLEN_TAGS & tags
        plan["regeln"].append("RAUCH")
    if INTIM.search(t) and p["productType"] in SAMMELTYPEN:
        plan["typ"] = "Wellness & Gesundheit"
        plan["kat"] = next((k for rx, k in INTIM_KAT if rx.search(t)), "hb-3-8")
        plan["weg"] |= SAMMEL_TAGS & tags
        plan["dazu"] |= {"intimpflege"} - tags
        plan["regeln"].append("HYGIENE")
    # POLICY: beständige Richtlinien-Meldung, die keine Regel am Titel repariert hat
    bestaendig = live_klassen & stand_klassen
    policy = sorted(k for k in bestaendig if k in POLICY_KLASSEN)
    if TITEL_KLASSE in bestaendig and SENSIBEL.search(t):
        policy.append(TITEL_KLASSE)
    if policy:
        tags_nachher = (tags | plan["dazu"]) - plan["weg"]
        seit = umbenannt.get(p["id"])
        if gs.ausschluss_tag(tags_nachher):
            plan["notiz"].append(f"POLICY {policy}: schon ausgeschlossen ({gs.ausschluss_tag(tags_nachher)})")
        elif plan["titel"]:
            plan["notiz"].append(f"POLICY {policy}: Titel wird heute repariert — Google prüft neu, {WARTE_TAGE} Tage warten")
        elif seit and (datetime.datetime.utcnow() - seit).days < WARTE_TAGE:
            plan["notiz"].append(f"POLICY {policy}: Titel am {seit:%d.%m.} repariert — wartet auf Google-Neuprüfung")
        else:
            slug = POLICY_KLASSEN.get(policy[0], "titel")
            plan["dazu"] |= {"google-policy-flag", f"google-policy-{slug}"} - tags
            plan["regeln"].append("POLICY")
    if plan["titel"] == titel:
        plan["titel"] = None
    if plan["titel"] and len(plan["titel"]) > MAX_TITEL:
        plan["notiz"].append(f"neuer Titel hätte {len(plan['titel'])} Zeichen (> {MAX_TITEL}) — nicht geschrieben")
        plan["titel"] = None
    leer = not (plan["titel"] or plan["typ"] or plan["kat"] or plan["dazu"] or plan["weg"] or plan["text"] or plan["text_fn"])
    if leer and not plan["notiz"]:
        return None
    return plan


def seo_neu(seo, alt_titel, neu_titel, fns):
    """SEO-Titel/-Beschreibung nachziehen: alten Titel ersetzen, dieselben Regel-Ersetzungen anwenden."""
    st, sd = (seo or {}).get("title"), (seo or {}).get("description")
    nst, nsd = st, sd
    if neu_titel:
        if nst and alt_titel in nst:
            kand = nst.replace(alt_titel, neu_titel)
            nst = kand if len(kand) <= MAX_TITEL else neu_titel
        if nsd and alt_titel in nsd:
            nsd = nsd.replace(alt_titel, neu_titel)
    for fn in fns:
        if nst:
            nst = fn(nst)
        if nsd:
            nsd = fn(nsd)
    if nst:
        nst = PROMO.sub("", nst)
    if nsd:
        nsd = PROMO.sub("", nsd)
    return (nst if nst != st else None), (nsd if nsd != sd else None)


FNS = {"person": text_person, "used": text_used}


def text_neu(html, plan):
    neu = html or ""
    for a, b in plan["text"]:
        if a in neu:
            neu = neu.replace(a, b)
    for name in plan["text_fn"]:
        neu = html_text_ersetzen(neu, FNS[name])
    return neu if neu != (html or "") else None


# ─────────────────────────────── Schreiben ───────────────────────────────
_TEXTSPERRE_BELEGT = {"ja": False}


def textsperre_holen(warte=60):
    """Nicht blockierend probieren (Lehre 22.09.: Warten ist in einem stündlich sterbenden Container ein Nie).
    War die Sperre in diesem Lauf schon einmal belegt, nur noch kurz probieren — sonst kosten 20 Texte 20 Minuten."""
    if _TEXTSPERRE_BELEGT["ja"]:
        warte = 2
    fd = open(TEXTSPERRE, "w")
    t0 = time.time()
    while True:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return fd
        except BlockingIOError:
            if time.time() - t0 > warte:
                _TEXTSPERRE_BELEGT["ja"] = True
                fd.close(); return None
            time.sleep(1)


def fehler_aus(d, feld):
    x = (d.get("data") or {}).get(feld) or {}
    return x.get("userErrors") or d.get("errors") or []


def schreiben(p, plan, seo_t, seo_d):
    """Schreibt nacheinander, liest zurück. Gibt Ledger-Zeilen zurück."""
    pid, h, z = p["id"], p["handle"], []
    regel = "+".join(plan["regeln"]) or "-"
    eingabe = {"id": pid}
    if plan["titel"]:
        eingabe["title"] = plan["titel"]
    if plan["typ"]:
        eingabe["productType"] = plan["typ"]
    if plan["kat"] and ((p.get("category") or {}).get("id") != TC + plan["kat"]):
        eingabe["category"] = TC + plan["kat"]
    seo = {}
    if seo_t:
        seo["title"] = seo_t
    if seo_d:
        seo["description"] = seo_d
    if seo:
        eingabe["seo"] = seo
    fe = []
    if len(eingabe) > 1:
        d = gql("mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{id} userErrors{field message} } }", {"p": eingabe})
        fe += fehler_aus(d, "productUpdate")
    if plan["dazu"]:
        d = gql("mutation($id:ID!,$t:[String!]!){ tagsAdd(id:$id, tags:$t){ userErrors{message} } }", {"id": pid, "t": sorted(plan["dazu"])})
        fe += fehler_aus(d, "tagsAdd")
    if plan["weg"]:
        weg_echt = [t for t in p["tags"] if t.lower() in plan["weg"]]     # Originalschreibweise entfernen
        d = gql("mutation($id:ID!,$t:[String!]!){ tagsRemove(id:$id, tags:$t){ userErrors{message} } }", {"id": pid, "t": weg_echt})
        fe += fehler_aus(d, "tagsRemove")
    text_status, text_alt, text_ziel = None, None, None
    if plan["text"] or plan["text_fn"]:
        fd = textsperre_holen()
        if fd is None:
            text_status = "text-sperre-belegt"
        else:
            try:
                frisch = gql("query($id:ID!){ product(id:$id){ descriptionHtml } }", {"id": pid})["data"]["product"]["descriptionHtml"]
                text_ziel = text_neu(frisch, plan)
                if text_ziel:
                    text_alt = frisch
                    d = gql("mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{id} userErrors{field message} } }",
                            {"p": {"id": pid, "descriptionHtml": text_ziel}})
                    fe += fehler_aus(d, "productUpdate")
            finally:
                fcntl.flock(fd, fcntl.LOCK_UN); fd.close()
    # ZURÜCKLESEN
    r = details(pid)
    rtags = {t.lower() for t in r["tags"]}
    ok = lambda b: "ok" if b and not fe else ("fehler:" + json.dumps(fe, ensure_ascii=False)[:160] if fe else "fehler:rueckgelesen-anders")
    ts = jetzt()
    if plan["titel"]:
        z.append([ts, "SCHREIB", pid, h, regel, "titel", p["title"], plan["titel"], ok(r["title"] == plan["titel"])])
    if plan["typ"]:
        z.append([ts, "SCHREIB", pid, h, regel, "typ", p["productType"], plan["typ"], ok(r["productType"] == plan["typ"])])
    if "category" in eingabe:
        z.append([ts, "SCHREIB", pid, h, regel, "kategorie", (p.get("category") or {}).get("id", ""), eingabe["category"],
                  ok(((r.get("category") or {}).get("id")) == eingabe["category"])])
    if seo_t:
        z.append([ts, "SCHREIB", pid, h, regel, "seo_titel", (p.get("seo") or {}).get("title"), seo_t, ok((r["seo"] or {}).get("title") == seo_t)])
    if seo_d:
        z.append([ts, "SCHREIB", pid, h, regel, "seo_beschreibung", (p.get("seo") or {}).get("description"), seo_d,
                  ok((r["seo"] or {}).get("description") == seo_d)])
    if plan["dazu"]:
        z.append([ts, "SCHREIB", pid, h, regel, "tags_dazu", "", ",".join(sorted(plan["dazu"])), ok(plan["dazu"] <= rtags)])
    if plan["weg"]:
        z.append([ts, "SCHREIB", pid, h, regel, "tags_weg", ",".join(sorted(plan["weg"])), "", ok(not (plan["weg"] & rtags))])
    if text_status:
        z.append([ts, "UEBERSPRUNGEN", pid, h, regel, "beschreibung", "", "", text_status])
    elif text_ziel:
        rtext = re.sub(r"<[^>]+>", " ", r["descriptionHtml"] or "")
        rest = [a for a, _ in plan["text"] if a in (r["descriptionHtml"] or "")]
        if "person" in plan["text_fn"] and PERSON_VOR_WORT.search(rtext):
            rest.append("person")
        if "used" in plan["text_fn"] and USED.search(rtext):
            rest.append("used-look")
        z.append([ts, "SCHREIB", pid, h, regel, "beschreibung", f"{len(text_alt)} Zeichen", f"{len(text_ziel)} Zeichen",
                  ok(r["descriptionHtml"] == text_ziel and not rest)])
    return z


# ─────────────────────────────── Nachmessen ───────────────────────────────
def nachmessen(ledger):
    """Produkte, deren Titel/Tags vor ≥ NACHMESS_H Stunden geschrieben wurden: Google-Klassen jetzt live."""
    geschrieben, gemessen = {}, set()
    for z in ledger:
        if len(z) < 4:
            continue
        if z[1] == "SCHREIB" and z[-1] == "ok":
            try:
                t = datetime.datetime.strptime(z[0], "%Y-%m-%dT%H:%M:%SZ")
            except ValueError:
                continue
            geschrieben[z[2]] = (max(geschrieben.get(z[2], (t, ""))[0], t), z[3])
        elif z[1] == "NACHMESSUNG":
            gemessen.add(z[2])
    out = []
    for pid, (t, h) in sorted(geschrieben.items()):
        if pid in gemessen or (datetime.datetime.utcnow() - t).total_seconds() < NACHMESS_H * 3600:
            continue
        p = details(pid)
        if not p:
            out.append([jetzt(), "NACHMESSUNG", pid, h, "-", "google", "", "produkt-fehlt", "ok"]); continue
        kl = sorted(google_klassen(p.get("feedback")))
        out.append([jetzt(), "NACHMESSUNG", pid, h, "-", "google", "", "; ".join(kl) or "keine Google-Meldung", "ok"])
    return out


# ─────────────────────────────── Bericht ───────────────────────────────
KOPF = """# Google-Titelreparatur (Befund 26) — `automation/google_titel_reparatur.py`

**Messung 23.09.2026, die den Umfang festlegt** (Vollscan 50'016 aktive, Wächter-Stand 09:52 UTC gegen Live 18:20 UTC):

| Google-Klasse | morgens | abends live | davon morgens schon da | Entscheid |
|---|---:|---:|---:|---|
| Title under review | 836 | 637 | 15 von 300 gespeicherten | **kein Titelfehler** — Prüfzustand, 95 % Umschlag in 9 h, 55 % Kleidung, kein Titelmuster → nichts umschreiben |
| Inappropriate title | 9 | 10 | 4 | nur beständige UND sachlich falsche Titel (Politiker-Marke, Hygiene im Sammeltyp) |
| Illegal drugs | 1 | 2 | 1 | Kräuterpfeife → RAUCH-Regel; Auto-Waschbürste = Bildfall, nicht Titel |
| Guns and Parts | 3 | 3 | 3 | Band/Zapfventil umbenannt (Fehlalarm am Wort), taktisches Stativ → POLICY |
| Hacking | 1 | 1 | 1 | Wanzen-Detektor → POLICY |
| Vehicles | 1 | 1 | 1 | Bauset → Titel mit Produktnomen, Typ Spielzeug |
| Additional text found | 2 | 2 | 2 | «New Style» aus dem Titel; Fleece-Schuh ohne erkennbaren Titelgrund → beobachten |
| Invalid product condition for Discover | 1 | 1 | 0 | «Used-Look» liest Google als Zustand → 20 Titel «Vintage-Look» |

Gegenproben: «Sexy» im Titel (45) trägt 0 «Inappropriate title»; RAUCH-Regex über 50'016 Titel = 45 Treffer, alle
echtes Rauchzubehör; Such-Kanarienvogel `title:*zzzkanari*` = 0.
"""


def bericht(modus, gescannt, soll, stand_alter, plaene, zeilen, nachmessung, live, stand):
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(KOPF)
        f.write(f"\n## Letzter Lauf {jetzt()} — {modus}\n\n")
        f.write(f"Gescannt {gescannt} aktive von {soll['count']} ({soll['precision']}); Wächter-Stand "
                f"{'fehlt' if stand_alter is None else f'{stand_alter:.0f} h alt'}; Kanarienvögel und Taxonomie-IDs geprüft. "
                f"{bilanz()}.\n\n")
        f.write("| Produkt | Regel | Änderung | Status |\n|---|---|---|---|\n")
        for p, plan, seo_t, seo_d in plaene:
            teile = []
            if plan["titel"]:
                teile.append(f"Titel «{p['title']}» → «{plan['titel']}»")
            if plan["typ"]:
                teile.append(f"Typ {p['productType']} → {plan['typ']}")
            if plan["kat"]:
                teile.append(f"Kategorie → {plan['kat']}")
            if plan["dazu"]:
                teile.append("+" + ",".join(sorted(plan["dazu"])))
            if plan["weg"]:
                teile.append("−" + ",".join(sorted(plan["weg"])))
            if plan["text"] or plan["text_fn"]:
                teile.append("Beschreibung")
            if seo_t or seo_d:
                teile.append("SEO")
            teile += [f"⚠️ {n}" for n in plan["notiz"]]
            st = [z[-1] for z in zeilen if z[2] == p["id"]]
            status = ("ok" if st and all(s == "ok" for s in st) else "; ".join(sorted(set(st)))) if st else ("DRY" if modus == "DRY" else "nur Notiz")
            f.write(f"| {p['handle'][:55]} | {'+'.join(plan['regeln']) or '—'} | {'; '.join(teile)} | {status} |\n")
        # beständige Google-Meldungen ohne Reparatur (Bericht, kein Raten)
        rest = []
        for h, kl in sorted(live.items()):
            b = kl & stand.get(h, set())
            if b and not any(pp["handle"] == h for pp, *_ in plaene):
                rest.append(f"- {h}: {', '.join(sorted(b))}")
        if rest:
            f.write("\n## Beständig gemeldet, kein Titelbefund (beobachten, nicht umschreiben)\n\n" + "\n".join(rest) + "\n")
        alle = ledger_lesen()
        ok_prod = {z[3] for z in alle if len(z) >= 9 and z[1] == "SCHREIB" and z[8] == "ok"}
        offen = offene_texte(alle)
        f.write(f"\n## Ledger gesamt\n\n{len(ok_prod)} Produkte mit rückgelesenen Änderungen; "
                f"{len(offen)} Beschreibungen noch offen (Text-Sperre belegt — der nächste Lauf holt sie nach).\n")
        titel = [z for z in alle if len(z) >= 9 and z[1] == "SCHREIB" and z[5] == "titel" and z[8] == "ok"]
        if titel:
            f.write("\nGeschriebene Titel (rückgelesen):\n\n" + "\n".join(
                f"- {z[0][:10]} {z[4]}: «{z[6]}» → «{z[7]}»" for z in titel) + "\n")
        andere = {}
        for z in alle:
            if len(z) >= 9 and z[1] == "SCHREIB" and z[8] == "ok" and z[5] in ("tags_dazu", "typ"):
                andere.setdefault(z[3], []).append(f"{z[5]} {z[7]}")
        if andere:
            f.write("\nTyp-/Tag-Korrekturen (rückgelesen):\n\n" + "\n".join(
                f"- {h}: {'; '.join(v)}" for h, v in sorted(andere.items())) + "\n")
        if offen:
            f.write("\nNoch offene Beschreibungen:\n\n")
            hs = {z[2]: z[3] for z in alle if len(z) >= 4}
            f.write("\n".join(f"- {hs.get(pid, pid)}: {'+'.join(sorted(r))}" for pid, r in sorted(offen.items())) + "\n")
        if nachmessung:
            f.write("\n## Nachmessung (≥ %d h nach dem Schreiben, Google live)\n\n" % NACHMESS_H)
            f.write("\n".join(f"- {z[3]}: {z[7]}" for z in nachmessung) + "\n")


# ─────────────────────────────── Hauptlauf ───────────────────────────────
def main():
    selbsttest()
    if not TOK:
        print("kein Shop-Token → No-op"); return
    modus = "SCHARF" if SCHARF else "DRY"
    alle_kat = {e["kat"] for e in EINZEL.values() if e.get("kat")} | {k for _, k in INTIM_KAT} | {"hg-19", "hg-19-1", "hb-3-8"}
    kat_namen = ids_pruefen(alle_kat)
    ledger = ledger_lesen()
    umbenannt = zuletzt_umbenannt(ledger)
    offen = offene_texte(ledger)
    produkte, soll = vollscan()
    if soll["precision"] == "EXACT" and len(produkte) < soll["count"] * 0.98:
        raise SystemExit(f"ABBRUCH: Vollscan unvollständig ({len(produkte)} von {soll['count']})")
    je_handle = {p["handle"]: p for p in produkte}
    stand, stand_alter = stand_lesen()
    if stand_alter is None or stand_alter > STAND_MAX_H:
        print(f"Wächter-Stand fehlt oder ist {stand_alter} h alt — POLICY-Regel ausgesetzt (braucht zwei Beobachtungen)")
        stand = {}
    # Live-Feedback nur für Handles, die der Stand in einer relevanten Klasse führt (wenige, keine Suchfilter)
    relevant = set(POLICY_KLASSEN) | {TITEL_KLASSE}
    live = {}
    for h, kl in stand.items():
        if kl & relevant and h in je_handle:
            live[h] = google_klassen(details(je_handle[h]["id"]).get("feedback"))
    plaene = []
    for p in produkte:
        num = p["id"].rsplit("/", 1)[-1]
        if NUR and num not in NUR and p["handle"] not in NUR:
            continue
        plan = planen(p, live.get(p["handle"], set()), stand.get(p["handle"], set()), umbenannt,
                      offen.get(p["id"], frozenset()))
        if not plan:
            continue
        voll = details(p["id"])
        p = dict(p, category=voll.get("category"), seo=voll.get("seo"))
        fns = [FNS[n] for n in plan["text_fn"]]
        seo_t, seo_d = seo_neu(p["seo"], p["title"], plan["titel"], fns)
        # Beschreibung nur einplanen, wenn sie sich wirklich ändert (sonst kein Lock, kein Schreiben)
        if (plan["text"] or plan["text_fn"]) and not text_neu(voll.get("descriptionHtml"), plan):
            plan["text"], plan["text_fn"] = [], []
        if not (plan["titel"] or plan["typ"] or plan["dazu"] or plan["weg"] or plan["text"] or plan["text_fn"] or seo_t or seo_d
                or (plan["kat"] and (p.get("category") or {}).get("id") != TC + plan["kat"]) or plan["notiz"]):
            continue
        if plan["kat"] and (p.get("category") or {}).get("id") == TC + plan["kat"]:
            plan["kat"] = None
        plaene.append((p, plan, seo_t, seo_d))
    zeilen = []
    for p, plan, seo_t, seo_d in plaene:
        print(f"\n== {p['handle']}  [{'+'.join(plan['regeln']) or '—'}]")
        if plan["titel"]:
            print(f"   Titel: «{p['title']}»\n       → «{plan['titel']}» ({len(plan['titel'])} Z.)")
        if plan["typ"]:
            print(f"   Typ:   {p['productType']} → {plan['typ']}")
        if plan["kat"]:
            print(f"   Kat.:  {(p.get('category') or {}).get('id', '—')} → {plan['kat']} ({kat_namen.get(plan['kat'], '?')})")
        if plan["dazu"]:
            print(f"   +Tags: {sorted(plan['dazu'])}")
        if plan["weg"]:
            print(f"   −Tags: {sorted(plan['weg'])}")
        if seo_t:
            print(f"   SEO-T: «{(p.get('seo') or {}).get('title')}» → «{seo_t}»")
        if seo_d:
            print(f"   SEO-B: «{(p.get('seo') or {}).get('description')}» → «{seo_d}»")
        if plan["text"] or plan["text_fn"]:
            print(f"   Text:  {plan['text'] or ''} {plan['text_fn'] or ''}")
        for n in plan["notiz"]:
            print(f"   ⚠️ {n}")
        if SCHARF and (plan["titel"] or plan["typ"] or plan["kat"] or plan["dazu"] or plan["weg"] or plan["text"]
                       or plan["text_fn"] or seo_t or seo_d):
            z = schreiben(p, plan, seo_t, seo_d)
            for zz in z:
                print(f"   → {zz[5]}: {zz[-1]}")
            zeilen += z
    nm = nachmessen(ledger) if SCHARF else []
    if SCHARF:
        ledger_schreiben(zeilen + nm)
    bericht(modus, len(produkte), soll, stand_alter, plaene, zeilen, nm, live, stand)
    ok = sum(1 for z in zeilen if z[-1] == "ok")
    print(f"\nFERTIG ({modus}): {len(produkte)} gescannt · {len(plaene)} Produkte im Plan · {ok}/{len(zeilen)} Felder "
          f"geschrieben+rückgelesen · {len(nm)} nachgemessen · {bilanz()}")


if __name__ == "__main__":
    main()
