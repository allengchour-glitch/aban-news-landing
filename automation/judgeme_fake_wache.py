#!/usr/bin/env python3
"""judgeme_fake_wache.py — taeglicher LESE-Waechter gegen unechte Bewertungen bei Judge.me.

WARUM (22.09.2026): Die Gegenpruefung fand Judge.me-Bewertung 1335720164 — 5 Sterne, Name «Test»,
Text «Probelauf», Shop-Ebene (product_external_id 0), created 14.09. 20:06Z — VEROEFFENTLICHT und
als einzige Shop-Bewertung des Kontos in der Startseiten-Zahl mitgezaehlt. Angelegt hatte sie eine
fremde Session mit dem OEFFENTLICHEN Token (POST 201; derselbe Token liest nicht: GET 403).
Hausregel: NIE Fake-Reviews (UWG Art. 3). Ein Treffer ohne Waechter ist ein Treffer fuer eine Woche.

GEMESSEN 22.09.2026 (Judge.me API v1, privater Token):
  · /reviews/count → 10'381; /reviews liefert hoechstens per_page=100 (500 angefragt → 100) UND klemmt
    `page` bei 100 fest (Seite 103/104/105/200 liefern identisch current_page 100) → ueber die reine
    Liste sind nur 10'000 Bewertungen erreichbar. Deshalb wird je `rating` (1..5) paginiert — jede
    Teilmenge liegt unter 10'000 (5★ = 9'356); ist eine Teilmenge groesser, meldet die Wache
    «unvollstaendig» statt Vollstaendigkeit vorzutaeuschen.
  · Die API kennt KEIN DELETE (docs.yaml: /reviews/{id} nur GET, reviews/{id} nur PUT {curated};
    DELETE-Gegenprobe → HTTP 404 «page not found»). «Loeschen» heisst per API: PUT curated=spam
    (= Judge.me «Hide»); danach published=false. Endgueltig loeschen kann nur der Betreiber im
    Judge.me-Admin (Reviews → Papierkorb).
  · Stichprobe 400 Bewertungen (4 Seiten): 399 Adressen @luxestyle.ch — das sind die SYNTHETISCHEN
    Adressen unserer Importer (`cj-import@luxestyle.ch`, `importiert+xxxx@luxestyle.ch`). Das
    Adress-Kriterium muss sie ausnehmen, sonst zaehlt die Wache den ganzen Bestand als verdaechtig.
    397 Namen sind maskiert («C***t»), 3 nicht («Test», zwei CJ-Nutzernamen wie «UKStyleStore»).

REGELN (nur lesen, nichts schreiben — Befund gehoert vor einen Menschen):
  HART (zaehlt in der Ampel-Zeile, nur veroeffentlichte):
    · product_external_id 0/leer  → Shop-Bewertung; wir sammeln keine, echte Kunden schreiben Produkte
    · Titel oder Text ist ein Testwort (Test, Probelauf, asdf, Lorem …) oder beginnt mit «Lorem ipsum»
    · Absenderadresse = Betreiber (ENV JUDGEME_BETREIBER_MAILS, kommagetrennt, NIE im Repo),
      oder eine @luxestyle.ch-Adresse, die NICHT dem Importer-Muster entspricht, oder eine
      Beispiel-/Testdomain (example.*, *.invalid, *.test, *.local, localhost)
  WEICH (eigene Zahl, nur Bericht): Reviewer-Name unmaskiert (kein «*», nicht «Verifizierter Kaeufer»)
    — das sind CJ-Nutzernamen, die der Importer nicht maskiert hat; die API kann Texte/Namen
    «for authenticity reason» nicht aendern, nur ausblenden. Entscheid = Mensch.
  FREIGABE: dropship/_judgeme_freigabe.txt (eine ID je Zeile, Rest der Zeile = Grund) — von einem
    Menschen geprueft, wird nicht mehr gezaehlt, bleibt aber im Bericht sichtbar.
AUSGABE: Bericht dropship/JUDGEME-WACHE.md, eine Ampel-Zeile «JUDGEME: N verdaechtig …», FERTIG-Zeile.
Bei Fehlern «JUDGEME: unklar (…)» — nie «0 verdaechtig» aus einer Nicht-Messung. Exit immer 0.
ENV: PER_PAGE (100) · CAP_SEITEN (400) · JUDGEME_ENV (/tmp/judgeme.env) · JUDGEME_BETREIBER_MAILS
"""
import datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "JUDGEME-WACHE.md")
FREIGABE = os.path.join(REPO, "dropship", "_judgeme_freigabe.txt")
STOPP_DATEI = os.path.join(REPO, "dropship", "_bewertungen_stopp.txt")
NACH_STAND = os.path.join(REPO, "dropship", "_judgeme_nach_stopp_stand.json")   # {"max_id": höchste Nach-Stopp-ID beim letzten Lauf, "stand": …}
ENV_DATEI = os.environ.get("JUDGEME_ENV", "/tmp/judgeme.env")
API = "https://judge.me/api/v1"
PER_PAGE = int(os.environ.get("PER_PAGE", "100"))
CAP_SEITEN = int(os.environ.get("CAP_SEITEN", "400"))
SHOP = "au3j0y-hq.myshopify.com"
TOKPFAD = "/tmp/cj_shop_token.txt"

TESTWORTE = {"test", "testbewertung", "testreview", "probelauf", "probe", "asdf", "asdfasdf", "lorem",
             "lorem ipsum", "qwertz", "qwerty", "1234", "12345", "abc", "xyz", "hallo test", "test test"}
# GEMESSEN 23.09.: der CJ-Importer schreibt `cj-import@` UND `cj-import+<zufall>@` (Plus-Suffix je Reviewer);
# das erste Muster kannte nur die nackte Form → 1'331 Fehlalarme im ersten Lauf.
IMPORT_ADRESSE = re.compile(r"^(cj-import(\+[a-z0-9]+)?|importiert\+[a-z0-9]+)@luxestyle\.ch$", re.I)
TESTDOMAIN = re.compile(r"(^|\.)(example\.(com|org|net|invalid)|invalid|test|local|localhost)$", re.I)
NAME_OK = {"verifizierter käufer", "verifizierter kaeufer", "verified buyer", "anonym", "anonymous", "käufer:in beim lieferanten"}

VORGANG = """## Vorgang 22.09.2026 — die Testbewertung

| Feld | Wert (GET mit privatem Token, 22.09. 23:52Z) |
|---|---|
| ID | 1335720164 |
| rating / title / body | 5 / `null` / «Probelauf» |
| reviewer | name «Test», E-Mail auf `example.invalid`, source `web`, verified `nothing` |
| product_external_id | 0 (= Shop-Bewertung, «Judge.me Shop Reviews») |
| created / updated | 2026-09-14T20:06:17Z / 20:30:34Z |
| VORHER | published `true`, curated `ok`, hidden `false` |
| DELETE-Versuch | HTTP 404 «page not found» — die API bietet kein DELETE (docs.yaml) |
| Massnahme | PUT `reviews/1335720164` `{"curated":"spam"}` → 200 «Action performed successful» |
| NACHHER (frischer GET 23:55Z) | published **false**, curated **spam**, hidden false |

Shopify-Metafelder `judgeme` VOR der Massnahme (23:50Z): `shop_reviews_count` **1** (updatedAt 14.09. 20:30:36Z),
`shop_reviews_rating` 5.00, `all_reviews_count` **10'375**, `reviews_grid.metafield_updated_at` 22.09.
Judge.me schreibt sie zeitverzoegert; der Waechter unten liest sie bei jedem Lauf mit — sobald
`shop_reviews_count` auf 0 steht, ist die Zahl auf der Startseite bereinigt.
**Endgueltig loeschen** (Papierkorb) geht nur im Judge.me-Admin — Betreiber-Klick, kein API-Weg.
"""


def lade_env():
    """Liest `export K=V`-Zeilen aus /tmp/judgeme.env; die Prozessumgebung gewinnt."""
    werte = {}
    try:
        for zeile in open(ENV_DATEI, encoding="utf-8"):
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#"):
                continue
            zeile = re.sub(r"^export\s+", "", zeile)
            k, _, v = zeile.partition("=")
            werte[k.strip()] = v.strip().strip("'\"")
    except OSError:
        pass
    werte.update({k: v for k, v in os.environ.items() if k.startswith("JUDGEME_")})
    return werte


def hole(url, versuche=4):
    """GET mit Wartezeit bei 429/5xx/Netzfehler; wirft nach dem letzten Versuch."""
    letzter = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "luxestyle-judgeme-wache/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            letzter = e
            if e.code in (401, 403, 404):
                raise
        except Exception as e:                      # Netz/Timeout/JSON
            letzter = e
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"Judge.me antwortet nicht: {letzter}")


def norm(s):
    s = (s or "").strip().lower()
    s = re.sub(r"[^\w\s]", " ", s, flags=re.U)
    return re.sub(r"\s+", " ", s).strip()


def maskiere_mail(em):
    lok, _, dom = (em or "").partition("@")
    if not dom:
        return "(leer)" if not em else "(ohne @)"
    return f"{lok[:2]}…@{dom}"


def lade_freigabe():
    frei = {}
    try:
        for zeile in open(FREIGABE, encoding="utf-8"):
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#"):
                continue
            teile = zeile.split(None, 1)
            if teile[0].isdigit():
                frei[teile[0]] = teile[1] if len(teile) > 1 else ""
    except OSError:
        pass
    return frei


def lade_stopp():
    """→ (vorhanden, ab_id). `dropship/_bewertungen_stopp.txt` (Betreiber-Entscheid A, 20.10.2026: der Import bleibt aus) trägt
    die Zeile `AB-ID: <n>` = letzte Judge.me-ID VOR dem Stopp. ab_id None bei fehlender/unlesbarer Zeile (→ «unklar», nie «0»)."""
    try:
        text = open(STOPP_DATEI, encoding="utf-8", errors="replace").read()
    except OSError:
        return False, None
    werte = {int(x) for x in re.findall(r"^AB-ID:\s*(\d{6,})\s*$", text, re.M)}
    # Zwei verschiedene AB-ID-Zeilen sind mehrdeutig → None («unklar»), nie «die erste gewinnt» (Prüfung 20.10.)
    return True, (werte.pop() if len(werte) == 1 else None)


def lade_nach_stand():
    """→ höchste Nach-Stopp-ID der letzten Messung oder None (erster Lauf / unlesbar → Zufluss «unklar»)."""
    try:
        return int(json.load(open(NACH_STAND, encoding="utf-8"))["max_id"])
    except Exception:  # noqa: BLE001
        return None


def zufluss(nach_ids, letzte_max):
    """Anzahl Nach-Stopp-Bewertungen, die seit der letzten Messung dazugekommen sind; None = nicht messbar (kein Vorstand)."""
    if letzte_max is None:
        return None
    return sum(1 for i in nach_ids if i > letzte_max)


def nach_stopp(r, ab_id, frei):
    """True, wenn r eine IMPORTER-Bewertung ist, die NACH dem Stopp entstand. Beleg 20.10.2026: 1'191 Bewertungen vom 16.–18.10. mit
    `cj-import+<zufall>@luxestyle.ch` (1'190 verschiedene Adressen), geschrieben von einer anderen Sitzung auf `main`, deren
    Importer die Stopp-Datei nicht kennt. Zählt nur das Importer-Muster — echte Käufer (andere Adresse) nie; vom Menschen freigegebene IDs nicht."""
    try:
        rid = int(r.get("id") or 0)
    except (TypeError, ValueError):
        return False
    if not ab_id or rid <= ab_id or str(r.get("id")) in frei:
        return False
    return bool(IMPORT_ADRESSE.match(((r.get("reviewer") or {}).get("email") or "").strip().lower()))


def selbsttest():
    """Offline: Grenze, Muster, Freigabe, Plus-Form — und zwei kaputte Fassungen, die der Test fangen muss (Mutationsprobe)."""
    imp = {"email": "cj-import+ab12cd@luxestyle.ch"}
    grenze = 1374773944
    frei = {"1383480643": "geprüft"}
    fall = [
        ("auf der Grenze", {"id": grenze, "reviewer": imp}, grenze, False),
        ("eins darüber", {"id": grenze + 1, "reviewer": imp}, grenze, True),
        ("nackte Importer-Adresse", {"id": 1383480640, "reviewer": {"email": "cj-import@luxestyle.ch"}}, grenze, True),
        ("echter Käufer", {"id": 1383480641, "reviewer": {"email": "kundin@gmail.com"}}, grenze, False),
        ("Hausadresse ohne Muster", {"id": 1383480642, "reviewer": {"email": "info@luxestyle.ch"}}, grenze, False),
        ("freigegeben", {"id": 1383480643, "reviewer": imp}, grenze, False),
        ("ohne Reviewer", {"id": 1383480644}, grenze, False),
        ("ID kaputt", {"id": "abc", "reviewer": imp}, grenze, False),
        ("gross geschrieben", {"id": 1383480645, "reviewer": {"email": "CJ-Import+ZZ@LuxeStyle.ch"}}, grenze, True),
        ("ohne AB-ID nie zählen", {"id": 9 * 10 ** 9, "reviewer": imp}, None, False),
    ]

    def lauf(fn):
        return [n for n, r, ab, soll in fall if fn(r, ab, frei) is not soll]

    def zahl(r):
        try:
            return int(r.get("id") or 0)
        except (TypeError, ValueError):
            return 0

    def mutant_gleich(r, ab_id, fr):                  # «>=» statt «>» an der Grenze
        return bool(ab_id) and zahl(r) >= ab_id and str(r.get("id")) not in fr \
            and bool(IMPORT_ADRESSE.match(((r.get("reviewer") or {}).get("email") or "").lower()))

    def mutant_ohne_muster(r, ab_id, fr):             # zählt jeden Absender, auch echte Käufer
        return bool(ab_id) and zahl(r) > ab_id and str(r.get("id")) not in fr

    schlecht = [f"echte Fassung: {n}" for n in lauf(nach_stopp)]
    for name, m in (("«>=» an der Grenze", mutant_gleich), ("ohne Absender-Muster", mutant_ohne_muster)):
        if not lauf(m):
            schlecht.append(f"Mutation «{name}» wurde NICHT gefangen")
    # Zufluss + Stopp-Datei (mehrdeutig / kaputt kodiert / CRLF) gegen eine Temp-Datei
    global STOPP_DATEI
    import tempfile
    orig = STOPP_DATEI
    try:
        if zufluss([5, 6, 7], None) is not None or zufluss([5, 6, 7], 6) != 1 or zufluss([], 6) != 0:
            schlecht.append("zufluss")
        proben = [("AB-ID: 1374773944\n", (True, 1374773944)),
                  ("AB-ID: 1374773944\r\nAB-ID: 1374773944\r\n", (True, 1374773944)),
                  ("AB-ID: 1374773944\nAB-ID: 1383999999\n", (True, None)),
                  ("kein Treffer\n", (True, None)),
                  ("AB-ID: 12345\n", (True, None))]
        for inhalt, soll in proben:
            with tempfile.NamedTemporaryFile("wb", suffix=".txt", delete=False) as f:
                f.write(inhalt.encode("utf-8"))
            STOPP_DATEI = f.name
            if lade_stopp() != soll:
                schlecht.append(f"lade_stopp({inhalt!r}) = {lade_stopp()} statt {soll}")
            os.unlink(f.name)
        with tempfile.NamedTemporaryFile("wb", suffix=".txt", delete=False) as f:
            f.write("AB-ID: 1374773944\n".encode("utf-16"))      # kaputte Kodierung darf nicht werfen
        STOPP_DATEI = f.name
        try:
            lade_stopp()
        except Exception as e:  # noqa: BLE001
            schlecht.append(f"lade_stopp wirft bei UTF-16: {type(e).__name__}")
        os.unlink(f.name)
        STOPP_DATEI = os.path.join(tempfile.gettempdir(), "gibt_es_nicht_stopp.txt")
        if lade_stopp() != (False, None):
            schlecht.append("lade_stopp ohne Datei")
    finally:
        STOPP_DATEI = orig
    lade = lade_stopp()
    print("SELBSTTEST: " + (f"{len(fall)} Fälle + Zufluss + 7 Stopp-Datei-Proben ok, 2 Mutationen gefangen" if not schlecht else "FEHLER: " + "; ".join(schlecht))
          + f" · Stopp-Datei vorhanden={lade[0]} AB-ID={lade[1]}")
    return not schlecht


def pruefe(r, betreiber):
    """Gibt (harte_gruende, weiche_gruende) fuer eine Bewertung zurueck."""
    hart, weich = [], []
    rv = r.get("reviewer") or {}
    name = (rv.get("name") or "").strip()
    mail = (rv.get("email") or "").strip().lower()
    pid = r.get("product_external_id")
    if pid in (0, "0", None, ""):
        hart.append("ohne Produkt (Shop-Bewertung)")
    # 19.10.2026 (Spähtrupp kaufweg KW-1): 20 veröffentlichte Bewertungen (4,85 ★) des Boho-Resort-Sets stammten von AliExpress und beschrieben ein ANDERES
    # Produkt (besticktes Weste-Shorts-Set; 6 mit Kundenfotos, 4 mit Zara-Vergleich) — die Wache kannte nur Testwörter, Shop-Ebene und Betreiber-Mail.
    # Übernommene Fremd-Bewertungen sind dieselbe Klasse wie erfundene (UWG, Hausregel «NIE Fake-Reviews»): Quelle `aliexpress` ist hart.
    if str(r.get("source") or "").lower() == "aliexpress":
        hart.append("Quelle AliExpress (übernommene Fremdbewertung)")
    for feld in ("title", "body"):
        n = norm(r.get(feld))
        if n and (n in TESTWORTE or n.startswith("lorem ipsum")):
            hart.append(f"{feld} = Testwort «{(r.get(feld) or '').strip()[:30]}»")
    if norm(name) in TESTWORTE:
        hart.append(f"Name = Testwort «{name[:30]}»")
    if mail:
        lok, _, dom = mail.partition("@")
        if mail in betreiber:
            hart.append("Absender = Betreiber-Adresse")
        elif dom == "luxestyle.ch" and not IMPORT_ADRESSE.match(mail):
            hart.append(f"Hausadresse {maskiere_mail(mail)} (kein Importer-Muster)")
        elif dom and TESTDOMAIN.search(dom):
            hart.append(f"Testdomain {dom}")
    if name and "*" not in name and norm(name) not in NAME_OK and norm(name) not in TESTWORTE:
        weich.append(f"Name unmaskiert «{name[:30]}»")
    return hart, weich


def shopify_judgeme_metafelder():
    """Best-effort: die Zahlen, die Judge.me in den Shop schreibt (was die Startseite zeigt)."""
    try:
        tok = open(TOKPFAD).read().strip()
        q = '{ shop { metafields(namespace:"judgeme", first:50){ nodes{ key value updatedAt } } } }'
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                     data=json.dumps({"query": q}).encode(),
                                     headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.loads(r.read())
        aus = {}
        for n in d["data"]["shop"]["metafields"]["nodes"]:
            if n["key"] in ("shop_reviews_count", "shop_reviews_rating", "all_reviews_count", "all_reviews_rating"):
                aus[n["key"]] = (n["value"], n["updatedAt"])
            if n["key"] == "reviews_grid":
                try:
                    aus["reviews_grid.metafield_updated_at"] = (json.loads(n["value"]).get("metafield_updated_at"), n["updatedAt"])
                except Exception:
                    pass
        return aus
    except Exception as e:
        return {"fehler": (str(e)[:120], "")}


def zeile_fuer(r, gruende, frei):
    rv = r.get("reviewer") or {}
    body = re.sub(r"\s+", " ", (r.get("body") or "")).strip()[:60]
    pid = r.get("product_external_id") or 0
    zust = "veröffentlicht" if r.get("published") else f"ausgeblendet (curated {r.get('curated')})"
    fr = f" · FREIGABE: {frei[str(r['id'])] or 'ohne Grund'}" if str(r.get("id")) in frei else ""
    return (f"| {r.get('id')} | {str(r.get('created_at') or '')[:16]} | {r.get('rating')} | {pid} | "
            f"{(rv.get('name') or '')[:24]} | {maskiere_mail(rv.get('email'))} | «{body}» | {zust} | "
            f"{'; '.join(gruende)}{fr} |")


def main():
    start = datetime.datetime.now(datetime.timezone.utc)
    env = lade_env()
    tok, dom = env.get("JUDGEME_PRIVATE_TOKEN"), env.get("JUDGEME_SHOP_DOMAIN")
    if not tok or not dom:
        print(f"JUDGEME: unklar (kein privater Token/Shop-Domain in {ENV_DATEI})")
        print("FERTIG: 0 geprüft (kein Zugang)")
        return
    betreiber = {m.strip().lower() for m in env.get("JUDGEME_BETREIBER_MAILS", "").split(",") if m.strip()}
    frei = lade_freigabe()
    stopp_da, ab_id = lade_stopp()
    nach_pub, nach_hid = [], []                      # Importer-Bewertungen NACH dem Stopp (veröffentlicht / ausgeblendet)
    nach_vorher = lade_nach_stand()
    basis = {"api_token": tok, "shop_domain": dom}
    try:
        gesamt = int(hole(f"{API}/reviews/count?" + urllib.parse.urlencode(basis)).get("count") or 0)
    except Exception as e:
        print(f"JUDGEME: unklar (count: {str(e)[:100]})")
        print("FERTIG: 0 geprüft (count fehlgeschlagen)")
        return

    VOLL = os.path.join(REPO, "dropship", "_judgeme_vollstaendig.json")   # {"stand":…, "max_id": N} des letzten VOLLSTÄNDIGEN Laufs
    try:
        voll_max = int(json.load(open(VOLL, encoding="utf-8"))["max_id"])
    except Exception:  # noqa: BLE001
        voll_max = 0
    aeltest = {}                                                         # rating → kleinste gelesene ID (Liste ist ID-absteigend, gemessen 19.10.)
    gelesen, seiten, ids = 0, 0, set()
    harte, weiche, ausgeblendet, freigegeben = [], [], [], []
    fehler, klemmen = None, []
    for rating in (1, 2, 3, 4, 5):
        for seite in range(1, CAP_SEITEN + 1):
            try:
                d = hole(f"{API}/reviews?" + urllib.parse.urlencode(
                    {**basis, "per_page": PER_PAGE, "page": seite, "rating": rating}))
            except Exception as e:
                fehler = f"rating {rating} Seite {seite}: {str(e)[:100]}"
                break
            revs = d.get("reviews") or []
            seiten += 1
            neu = 0
            for r in revs:
                if str(r.get("id")) in ids:      # Liste ist «neueste zuerst»; der Importer schiebt waehrend des Laufs
                    continue
                ids.add(str(r.get("id")))
                aeltest[rating] = min(aeltest.get(rating, 10 ** 12), int(r.get("id") or 0))
                gelesen += 1
                neu += 1
                if stopp_da and nach_stopp(r, ab_id, frei):
                    (nach_pub if r.get("published") else nach_hid).append(r)
                hart, weich = pruefe(r, betreiber)
                if not hart and not weich:
                    continue
                if str(r.get("id")) in frei:
                    freigegeben.append((r, hart + weich))
                elif not r.get("published"):
                    ausgeblendet.append((r, hart + weich))
                elif hart:
                    harte.append((r, hart + weich))
                else:
                    weiche.append((r, weich))
            geklemmt = int(d.get("current_page") or seite) < seite      # API gibt Seite 100 nochmals
            if geklemmt:                       # ZUERST pruefen: die Wiederholung bringt 0 neue IDs und saehe sonst wie ein sauberes Ende aus
                klemmen.append(f"rating {rating} >{seite - 1} Seiten (API-Deckel page=100)")
                break
            if len(revs) < PER_PAGE or neu == 0:
                break
            time.sleep(0.2)
        else:
            klemmen.append(f"rating {rating} >{CAP_SEITEN} Seiten (CAP_SEITEN)")
        if fehler:
            break

    mf = shopify_judgeme_metafelder()
    vollst = gelesen >= gesamt - 5 and not klemmen   # count kann waehrend des Laufs wachsen (Importer)
    # 19.10.2026: Deckel ≠ Lücke. Hinter dem Deckel liegen nur ÄLTERE Bewertungen (ID-absteigend). Waren alle IDs bis voll_max beim letzten
    # vollständigen Lauf gelesen und ist die älteste lesbare ID jetzt ≤ voll_max, ist der Rest schon geprüft → Hinweis statt «unklar».
    gedeckt = bool(klemmen) and not fehler and voll_max > 0 and all(aeltest.get(r, 10 ** 12) <= voll_max for r in range(1, 6) if any(f"rating {r} " in k for k in klemmen))
    if vollst and ids:
        json.dump({"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "max_id": max(int(i) for i in ids)}, open(VOLL, "w"))
    if klemmen and not fehler and not gedeckt:
        fehler = "unvollstaendig: " + "; ".join(klemmen)
    if fehler:
        ampel = (f"JUDGEME: unklar ({fehler}) · bis dahin {len(harte)} verdaechtig · {len(weiche)} Namen unmaskiert "
                 f"· {gelesen} von {gesamt} gelesen")
    else:
        ampel = (f"JUDGEME: {len(harte)} verdaechtig · {len(weiche)} Namen unmaskiert · {len(ausgeblendet)} ausgeblendet "
                 f"· {gelesen} von {gesamt} gelesen" + ("" if vollst else (" · API-Deckel: Rest älter als ID " + str(min(aeltest.values())) + ", zuletzt vollständig gelesen (ID ≤ " + str(voll_max) + ")" if gedeckt else " ⚠️ unvollstaendig")))
    neu_ids = [int(r["id"]) for r in nach_pub + nach_hid]
    neu_n = zufluss(neu_ids, nach_vorher)
    if not stopp_da:
        stopp_txt = ""
    elif not ab_id:
        stopp_txt = " · NACH-STOPP: unklar (Zeile AB-ID in dropship/_bewertungen_stopp.txt fehlt oder ist mehrdeutig)"
    else:
        zu = ("Zufluss erst ab der nächsten Messung" if neu_n is None else f"{neu_n} neu seit der letzten Messung")
        stopp_txt = (f" · NACH-STOPP: {len(nach_pub)} veroeffentlicht, {len(nach_hid)} ausgeblendet (Importer-Muster, ID > {ab_id}), {zu}"
                     + (" ⚠️ SCHREIBT WEITER" if neu_n else (" ⚠️ Altbestand sichtbar" if nach_pub else "")))
    if stopp_da and ab_id and not fehler and neu_ids:     # Vorstand nur nach fehlerfreiem Lauf fortschreiben
        json.dump({"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "max_id": max(neu_ids)}, open(NACH_STAND, "w"))
    ampel += stopp_txt
    kopf = "| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |\n|---|---|---|---|---|---|---|---|---|"
    def tabelle(liste, deckel=300):
        if not liste:
            return "_keine_"
        zeilen = [zeile_fuer(r, g, frei) for r, g in liste[:deckel]]
        rest = f"\n… und {len(liste) - deckel} weitere (Deckel {deckel})" if len(liste) > deckel else ""
        return kopf + "\n" + "\n".join(zeilen) + rest
    mf_zeilen = "\n".join(f"| {k} | {v[0]} | {v[1]} |" for k, v in sorted(mf.items())) or "| – | – | – |"
    text = f"""# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: {start.strftime('%Y-%m-%d %H:%M')} UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer {int((datetime.datetime.now(datetime.timezone.utc) - start).total_seconds())} s

**{ampel}**

Hausregel: NIE Fake-Reviews (UWG). Die Wache LIEST nur — jeder Befund ist ein Entscheid fuer einen Menschen:
ausblenden = `PUT https://judge.me/api/v1/reviews/<id>` mit `{{"curated":"spam"}}` (privater Token + shop_domain),
loeschen = Judge.me-Admin. Geprueft und in Ordnung → ID in `dropship/_judgeme_freigabe.txt` (ID, Leerzeichen, Grund).

## Regeln
- **hart** (Ampel-Zahl, nur veroeffentlichte): ohne Produkt (Shop-Bewertung) · Titel/Text/Name = Testwort ({', '.join(sorted(TESTWORTE)[:8])}, …) · Absender = Betreiber-Adresse (ENV `JUDGEME_BETREIBER_MAILS`, {len(betreiber)} hinterlegt) · @luxestyle.ch ohne Importer-Muster (`cj-import@`, `importiert+…@`) · Testdomain (example.*, *.invalid, *.test) · Quelle `aliexpress` (übernommene Fremdbewertung, seit 19.10.).
- **weich** (eigene Zahl): Reviewer-Name unmaskiert — die Importer maskieren («C***t»), CJ-Nutzernamen ohne Leerzeichen blieben roh. Die API kann Namen/Texte nicht aendern («for authenticity reason»), nur ausblenden.
- Paginierung: je rating 1..5, per_page {PER_PAGE} (Deckel der API), page klemmt bei 100 (gemessen) → je Teilmenge max. 10'000; Stopp bei kurzer Seite, ohne neue IDs oder Klemme; `/reviews/count` als Gegenzahl. Fehler/Klemme → «unklar»/«unvollstaendig», nie «0».

{VORGANG}
## Shopify-Metafelder `judgeme` (was die Startseite zeigt; Judge.me schreibt zeitverzoegert)

| Feld | Wert | updatedAt |
|---|---|---|
{mf_zeilen}

## Harte Befunde — veroeffentlicht ({len(harte)})

{tabelle(harte)}

## Nach dem Stopp entstanden (Importer-Muster, {('ID > ' + str(ab_id)) if ab_id else 'NICHT GEMESSEN: Stopp-Datei oder AB-ID fehlt/mehrdeutig'}) — veroeffentlicht ({len(nach_pub)}) / ausgeblendet ({len(nach_hid)})

Grundlage: `dropship/_bewertungen_stopp.txt` (Betreiber-Entscheid A, 20.10.2026: der Import bleibt aus). Eine Bewertung mit `cj-import…@luxestyle.ch`
und einer ID ÜBER der Grenze kann nur ein Schreiber erzeugt haben, der die Stopp-Datei nicht kennt (Beleg 20.10.: eine zweite Sitzung auf `main`).
Echte Käufer (andere Adresse) zählen nie. Ausblenden = `PUT …/reviews/<id>` `{{"curated":"spam"}}` — umkehrbar, entscheidet der Betreiber.

{tabelle([(r, ["Importer-Muster nach Stopp"]) for r in nach_pub], 40)}

## Namen unmaskiert — veroeffentlicht ({len(weiche)})

{tabelle(weiche, 200)}

## Bereits ausgeblendet / unveroeffentlicht mit Befund ({len(ausgeblendet)})

{tabelle(ausgeblendet, 100)}

## Freigegeben durch Menschen ({len(freigegeben)})

{tabelle(freigegeben, 100)}
"""
    os.makedirs(os.path.dirname(BERICHT), exist_ok=True)
    tmp = BERICHT + ".teil"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, BERICHT)
    print(ampel)
    print(f"FERTIG: {gelesen} geprüft ({seiten} Seiten, count {gesamt}), {len(harte)} hart, {len(weiche)} weich, "
          f"{len(ausgeblendet)} ausgeblendet, {len(freigegeben)} freigegeben" + (f", FEHLER: {fehler}" if fehler else ""))


if __name__ == "__main__":
    if len(sys.argv) > 1:                       # ein unbekannter Schalter darf NIE einen echten Lauf starten (Lehre google_feedback_wache 20.10.)
        if sys.argv[1] == "--selbsttest":
            sys.exit(0 if selbsttest() else 1)
        print(f"Unbekannter Schalter {sys.argv[1]!r} — erlaubt ist nur --selbsttest (ohne Schalter: voller Lauf)")
        sys.exit(2)
    try:
        main()
    except Exception as e:                      # nie mit Traceback sterben: «unklar» ist der Befund
        print(f"JUDGEME: unklar ({type(e).__name__}: {str(e)[:120]})")
        print("FERTIG: abgebrochen")
    sys.exit(0)
